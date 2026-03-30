# SemiNexus CLI 质量改进计划

**创建日期：** 2026-03-30  
**基于：** COMPREHENSIVE_QUALITY_REPORT.md

---

## 🔴 架构层面问题（最高优先级）

### 问题 1: 服务器端完全没有数据库！

**当前状态：**
所有数据都存储在 JSON 文件中：
```
~/.semi-nexus/server/
├── users.json           # 用户数据（包括密码哈希、API Key）
├── registry/
│   ├── capabilities.json  # 能力注册表
│   ├── subscriptions.json # 订阅关系
│   └── packages/          # SNP 文件
└── audit/                 # 审计日志
```

**代码位置：**
- [server/src/services/auth.ts:43-58](server/src/services/auth.ts#L43-L58) - 用户数据文件读写
- [server/src/services/registry.ts:25-54](server/src/services/registry.ts#L25-L54) - 注册表文件读写

**严重问题：**
1. **并发安全** - 多请求同时写入会导致数据丢失
2. **性能瓶颈** - 每次操作读写整个文件
3. **数据完整性** - 崩溃可能导致数据损坏
4. **无法扩展** - 多实例无法共享数据
5. **查询能力弱** - 无法进行复杂查询和索引

### 解决方案：引入数据库层

#### 方案 A: SQLite（推荐用于中小规模）
```
优点：
- 零配置，无需额外服务
- 单文件部署，易于备份
- 足够支撑 10万级用户
- TypeScript 支持良好

缺点：
- 不支持多实例水平扩展
- 写入并发有限
```

#### 方案 B: PostgreSQL（推荐用于大规模）
```
优点：
- 企业级可靠性
- 支持水平扩展
- 丰富的数据类型和索引
- 适合生产环境

缺点：
- 需要额外部署和维护
- 配置复杂度较高
```

#### 推荐方案：SQLite + 可选 PostgreSQL

```typescript
// 数据库抽象层设计
interface DatabaseAdapter {
  // 用户操作
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // 能力操作
  getCapability(id: string): Promise<Capability | null>;
  getCapabilityByName(name: string): Promise<Capability | null>;
  searchCapabilities(query: CapabilityQuery): Promise<Capability[]>;
  createCapability(capability: Capability): Promise<Capability>;
  
  // 订阅操作
  getSubscription(userId: string, capabilityId: string): Promise<Subscription | null>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  createSubscription(subscription: Subscription): Promise<Subscription>;
  
  // 事务支持
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

// SQLite 实现
class SQLiteDatabase implements DatabaseAdapter { ... }

// PostgreSQL 实现（可选）
class PostgreSQLDatabase implements DatabaseAdapter { ... }
```

### 数据库 Schema 设计

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT,
  role TEXT CHECK(role IN ('admin', 'user')) NOT NULL,
  auth_type TEXT CHECK(auth_type IN ('local', 'ldap', 'ad')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'inactive', 'locked')) NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  last_login TEXT
);

-- API Key 表
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  status TEXT CHECK(status IN ('active', 'revoked')) NOT NULL,
  created_at TEXT NOT NULL,
  last_used TEXT,
  expires_at TEXT
);

-- 能力表
CREATE TABLE capabilities (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT CHECK(type IN ('skill', 'mcp', 'agent')) NOT NULL,
  version TEXT NOT NULL,
  tags TEXT NOT NULL,  -- JSON array
  category TEXT NOT NULL,  -- JSON object
  author TEXT NOT NULL,  -- JSON object
  repository TEXT,
  statistics TEXT NOT NULL,  -- JSON object
  status TEXT CHECK(status IN ('draft', 'scanning', 'pending', 'approved', 'rejected')) NOT NULL,
  security_scan TEXT,  -- JSON object
  compliance TEXT,  -- JSON object
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 能力版本表
CREATE TABLE capability_versions (
  id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL REFERENCES capabilities(id),
  version TEXT NOT NULL,
  snp_file TEXT NOT NULL,
  changelog TEXT,
  released_at TEXT NOT NULL,
  UNIQUE(capability_id, version)
);

-- 订阅表
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  capability_id TEXT NOT NULL REFERENCES capabilities(id),
  version TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'expired', 'cancelled')) NOT NULL,
  subscribed_at TEXT NOT NULL,
  UNIQUE(user_id, capability_id)
);

-- 审计日志表
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,  -- JSON object
  ip TEXT,
  timestamp TEXT NOT NULL
);

-- 登录尝试表（替代内存存储）
CREATE TABLE login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_capabilities_name ON capabilities(name);
CREATE INDEX idx_capabilities_status ON capabilities(status);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_capability ON subscriptions(capability_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

## 🟠 CLI 客户端问题（高优先级）

### 问题 2: Lint 错误（75 个）

**错误分类：**

| 类型 | 数量 | 示例 |
|------|------|------|
| 未使用的变量 | 24 | `import inquirer from 'inquirer'` 但未使用 |
| `any` 类型 | 51 | `const capability: any = ...` |
| 其他 | 4 | 空块语句、转义字符等 |

**修复计划：**

1. **移除未使用的导入**（2 小时）
   - [ ] `src/commands/install.ts:4` - 移除 `inquirer`
   - [ ] `src/commands/sync.ts:6,9` - 移除 `inquirer`, `client`
   - [ ] `src/commands/verify.ts:4` - 移除 `os`
   - [ ] `src/commands/quickstart.ts:6,16` - 移除 `yaml`, `configPath`
   - [ ] `src/commands/init.ts:7` - 移除 `client`
   - [ ] `src/commands/list.ts:3` - 移除 `client`
   - [ ] `src/api/registry.ts:4` - 移除 `yaml`
   - [ ] 其他测试文件中的未使用变量

2. **定义类型接口替代 `any`**（4 小时）
   ```typescript
   // 定义类型
   interface SearchResult {
     id: string;
     name: string;
     description: string;
     type: 'skill' | 'mcp' | 'agent';
   }
   
   interface InstallOptions {
     version?: string;
     autoSubscribe?: boolean;
     sync?: boolean;
   }
   
   // 替换 any
   const capability: SearchResult = await client.searchCapabilities(name);
   ```

3. **修复其他错误**（1 小时）
   - 空块语句添加注释或处理
   - 修复不必要的转义字符

### 问题 3: 测试覆盖率极低（1.92%）

**当前状态：**
- 新增的 5 个命令完全没有单元测试
- 核心业务逻辑没有测试覆盖

**目标：** 80% 语句覆盖率

**测试计划：**

```
tests/
├── unit/
│   ├── commands/
│   │   ├── quickstart.test.ts    # 快速开始命令测试
│   │   ├── discover.test.ts      # 发现命令测试
│   │   ├── verify.test.ts        # 验证命令测试
│   │   ├── completion.test.ts    # 补全命令测试
│   │   ├── install.test.ts       # 安装命令测试
│   │   ├── sync.test.ts          # 同步命令测试
│   │   └── ...
│   ├── api/
│   │   ├── client.test.ts        # API 客户端测试
│   │   └── registry.test.ts      # 注册表测试
│   └── i18n/
│       └── index.test.ts         # 国际化测试
└── e2e/
    └── ...（现有 E2E 测试）
```

**测试优先级：**
1. 核心业务逻辑：install, sync, subscribe
2. 新增命令：quickstart, discover, verify
3. API 客户端：client, registry
4. 工具函数：i18n

### 问题 4: E2E 测试配置问题

**当前问题：**
- 需要手动启动 Server
- 密码配置不一致
- 通过率只有 31%

**解决方案：**

1. 添加 `test:e2e:ci` 脚本
   ```json
   {
     "scripts": {
       "test:e2e:ci": "npm run server:start:test & sleep 3 && npm run test:e2e; npm run server:stop"
     }
   }
   ```

2. 使用固定测试配置
   ```bash
   # .env.test
   JWT_SECRET=test-secret-key-for-e2e-testing-only
   ADMIN_PASSWORD=TestAdmin@123
   ```

3. 添加测试前钩子
   ```typescript
   // jest.e2e.config.js
   beforeAll(async () => {
     // 等待服务器就绪
     await waitForServer('http://localhost:3000/health');
   });
   ```

---

## 🟡 中等问题

### 问题 5: 文档不完整

**缺失文档：**
- [ ] 新增命令使用文档（quickstart, discover, verify, completion）
- [ ] i18n 配置指南
- [ ] API 参考文档
- [ ] 故障排查指南
- [ ] 开发者贡献指南

### 问题 6: 安全性问题

**问题：**
1. JWT Secret 开发环境自动生成
2. 登录尝试次数存储在内存中
3. 无数据加密

**解决方案：**
1. 强制要求配置 JWT_SECRET（即使是开发环境）
2. 登录尝试次数存入数据库
3. 敏感数据加密存储

### 问题 7: 性能问题

**问题：**
1. 无缓存策略
2. 同步文件操作

**解决方案：**
1. 实现智能缓存（检查 hash 或时间戳）
2. 使用异步文件操作
3. 数据库查询优化

---

## 📋 实施计划

### 第一阶段：架构重构（1 周）

| 任务 | 时间 | 优先级 |
|------|------|--------|
| 设计数据库 Schema | 0.5 天 | P0 |
| 实现数据库抽象层 | 1 天 | P0 |
| 实现 SQLite 适配器 | 1 天 | P0 |
| 迁移 AuthService | 1 天 | P0 |
| 迁移 RegistryService | 1 天 | P0 |
| 数据迁移工具 | 0.5 天 | P1 |
| 测试和验证 | 1 天 | P0 |

### 第二阶段：CLI 质量提升（1 周）

| 任务 | 时间 | 优先级 |
|------|------|--------|
| 修复所有 Lint 错误 | 0.5 天 | P0 |
| 定义类型接口 | 1 天 | P0 |
| 添加核心命令单元测试 | 2 天 | P0 |
| 添加新命令单元测试 | 1.5 天 | P1 |
| 修复 E2E 测试配置 | 0.5 天 | P0 |
| 提高测试覆盖率到 80% | 1 天 | P1 |

### 第三阶段：完善和优化（1 周）

| 任务 | 时间 | 优先级 |
|------|------|--------|
| 完善文档 | 1 天 | P1 |
| 安全性加固 | 1 天 | P1 |
| 性能优化 | 1 天 | P2 |
| 错误处理完善 | 1 天 | P2 |
| 监控和可观测性 | 1 天 | P2 |

---

## 📊 预期成果

| 指标 | 当前 | 目标 |
|------|------|------|
| 数据持久化 | JSON 文件 | SQLite/PostgreSQL |
| 测试覆盖率 | 1.92% | 80% |
| Lint 错误 | 75 | 0 |
| E2E 通过率 | 31% | 90% |
| 文档完整性 | 40% | 100% |
| 生产就绪度 | 30% | 95% |

---

## ⚠️ 风险评估

### 数据迁移风险
- **风险：** 现有数据迁移可能丢失
- **缓解：** 实现数据备份和回滚机制

### 兼容性风险
- **风险：** API 变更可能影响现有客户端
- **缓解：** 保持 API 接口不变，只改内部实现

### 时间风险
- **风险：** 架构重构可能超时
- **缓解：** 分阶段实施，优先核心功能

---

**计划创建时间：** 2026-03-30
