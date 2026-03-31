# SemiNexus CLI - Code Wiki

## 1. 项目概述

SemiNexus CLI 是一个纯命令行的 Agent 能力中转工具，帮助企业实现：

- 🔗 **能力中转** - 离线用户通过 Server 获取互联网上的能力
- 🔐 **安全管控** - Server 端统一采集、扫描、审核
- 🔄 **多端同步** - 支持 Claude Code、OpenCode、OpenClaw

## 2. 项目架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      企业内网环境                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SemiNexus Server                         │  │
│  │                                                      │  │
│  │  • Auth (本地/LDAP/AD/API Key)                       │  │
│  │  • Registry (能力注册表)                              │  │
│  │  • Scanner (安全扫描)                                │  │
│  │  • Audit (审计日志)                                  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌───────────┐      ┌───────────┐      ┌───────────┐
  │ 离线用户  │      │ 在线用户  │      │  管理员   │
  │ (CLI)    │      │ (CLI)    │      │ (CLI)    │
  └───────────┘      └───────────┘      └───────────┘
```

### 2.2 项目结构

```
semi-nexus-cli/
├── src/                    # CLI 源码
│   ├── api/               # 客户端 API
│   ├── commands/          # CLI 命令
│   └── __tests__/         # 测试
│
├── server/                 # Server 端
│   ├── src/
│   │   ├── services/      # Auth, Registry, Scanner, Audit
│   │   ├── routes/        # API 路由
│   │   └── middleware/    # 中间件
│   └── __tests__/         # 测试
│
├── docs/                   # 文档
│   ├── user-guide.md      # 用户指南
│   ├── design.md          # 设计文档
│   └── deployment.md      # 部署指南
│
├── scripts/               # 构建脚本
│   └── build-bin.sh       # 打包 CLI
│
└── packaging/             # 打包配置
    └── spec/             # RPM spec
```

## 3. 核心模块

### 3.1 CLI 模块

#### 3.1.1 命令结构

| 命令 | 说明 | 实现文件 |
|------|------|----------|
| `init` | 初始化配置 | [src/commands/init.ts](file:///workspace/src/commands/init.ts) |
| `login` | 登录认证 | [src/commands/login.ts](file:///workspace/src/commands/login.ts) |
| `search <query>` | 搜索能力 | [src/commands/search.ts](file:///workspace/src/commands/search.ts) |
| `subscribe <name>` | 订阅能力 | [src/commands/subscribe.ts](file:///workspace/src/commands/subscribe.ts) |
| `install <name>` | 安装能力 | [src/commands/install.ts](file:///workspace/src/commands/install.ts) |
| `sync` | 同步到 Agent | [src/commands/sync.ts](file:///workspace/src/commands/sync.ts) |
| `list` | 列出已安装 | [src/commands/list.ts](file:///workspace/src/commands/list.ts) |
| `upgrade [name]` | 升级能力 | [src/commands/upgrade.ts](file:///workspace/src/commands/upgrade.ts) |
| `uninstall <name>` | 卸载能力 | [src/commands/uninstall.ts](file:///workspace/src/commands/uninstall.ts) |
| `info <name>` | 能力详情 | [src/commands/info.ts](file:///workspace/src/commands/info.ts) |
| `status` | 连接状态 | [src/commands/status.ts](file:///workspace/src/commands/status.ts) |

#### 3.1.2 客户端 API

| 模块 | 功能 | 实现文件 |
|------|------|----------|
| Client API | 与 Server 通信 | [src/api/client.ts](file:///workspace/src/api/client.ts) |
| Registry API | 能力注册表操作 | [src/api/registry.ts](file:///workspace/src/api/registry.ts) |
| Agents API | Agent 环境管理 | [src/api/agents.ts](file:///workspace/src/api/agents.ts) |

### 3.2 Server 模块

#### 3.2.1 核心服务

| 服务 | 功能 | 实现文件 |
|------|------|----------|
| AuthService | 认证服务 | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |
| RegistryService | 能力注册表服务 | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| ScannerService | 安全扫描服务 | [server/src/services/scanner.ts](file:///workspace/server/src/services/scanner.ts) |
| AuditService | 审计服务 | [server/src/services/audit.ts](file:///workspace/server/src/services/audit.ts) |

#### 3.2.2 API 路由

| 路由 | 功能 | 实现文件 |
|------|------|----------|
| /api/v1/auth | 认证相关 API | [server/src/routes/auth.ts](file:///workspace/server/src/routes/auth.ts) |
| /api/v1/capabilities | 能力管理 API | [server/src/routes/capabilities.ts](file:///workspace/server/src/routes/capabilities.ts) |
| /api/v1/admin | 管理员 API | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |

#### 3.2.3 中间件

| 中间件 | 功能 | 实现文件 |
|--------|------|----------|
| auth.ts | 认证中间件 | [server/src/middleware/auth.ts](file:///workspace/server/src/middleware/auth.ts) |
| errorHandler.ts | 错误处理中间件 | [server/src/middleware/errorHandler.ts](file:///workspace/server/src/middleware/errorHandler.ts) |
| rateLimit.ts | 速率限制中间件 | [server/src/middleware/rateLimit.ts](file:///workspace/server/src/middleware/rateLimit.ts) |
| validator.ts | 数据验证中间件 | [server/src/middleware/validator.ts](file:///workspace/server/src/middleware/validator.ts) |

## 4. 关键类与函数

### 4.1 CLI 模块

#### 4.1.1 命令处理

| 函数 | 功能 | 参数 | 返回值 | 实现文件 |
|------|------|------|--------|----------|
| `init` | 初始化配置 | server: string, force: boolean | Promise<void> | [src/commands/init.ts](file:///workspace/src/commands/init.ts) |
| `login` | 登录认证 | server: string, apikey: string, authType: string | Promise<void> | [src/commands/login.ts](file:///workspace/src/commands/login.ts) |
| `search` | 搜索能力 | query: string, type: string, tag: string, offline: boolean | Promise<void> | [src/commands/search.ts](file:///workspace/src/commands/search.ts) |
| `subscribe` | 订阅能力 | name: string, version: string | Promise<void> | [src/commands/subscribe.ts](file:///workspace/src/commands/subscribe.ts) |
| `install` | 安装能力 | name: string, version: string, force: boolean, autoSubscribe: boolean, sync: boolean | Promise<void> | [src/commands/install.ts](file:///workspace/src/commands/install.ts) |
| `sync` | 同步到 Agent | agent: string, mode: string, configure: boolean, status: boolean | Promise<void> | [src/commands/sync.ts](file:///workspace/src/commands/sync.ts) |

### 4.2 Server 模块

#### 4.2.1 AuthService

| 方法 | 功能 | 参数 | 返回值 | 实现文件 |
|------|------|------|--------|----------|
| `login` | 用户登录 | username: string, password: string, authType: string, ip?: string | Promise<AuthToken> | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |
| `createUser` | 创建用户 | username: string, password: string, role: string, authType: string | Promise<User> | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |
| `createApiKey` | 创建 API Key | userId: string, name: string, expiresIn?: number | Promise<{ apiKey: string; keyId: string }> | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |
| `verifyApiKey` | 验证 API Key | rawKey: string | Promise<User | null> | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |
| `verifyToken` | 验证 JWT 令牌 | token: string | TokenPayload | [server/src/services/auth.ts](file:///workspace/server/src/services/auth.ts) |

#### 4.2.2 RegistryService

| 方法 | 功能 | 参数 | 返回值 | 实现文件 |
|------|------|------|--------|----------|
| `getCapabilities` | 获取能力列表 | options: { query?: string; type?: string; tag?: string; status?: string } | Promise<Capability[]> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| `getCapability` | 获取能力详情 | id: string | Promise<Capability | undefined> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| `createCapability` | 创建能力 | data: { name: string; displayName: string; description: string; type: string; version: string; tags: string[]; category: object; author: object; repository?: string; snpContent?: string; changelog?: string } | Promise<Capability> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| `subscribe` | 订阅能力 | userId: string, capabilityId: string, version?: string | Promise<Subscription> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| `updateSecurityScan` | 更新安全扫描结果 | id: string, scan: SecurityScan | Promise<void> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |
| `updateCompliance` | 更新合规状态 | id: string, compliance: Compliance | Promise<void> | [server/src/services/registry.ts](file:///workspace/server/src/services/registry.ts) |

#### 4.2.3 Server 类

| 方法 | 功能 | 参数 | 返回值 | 实现文件 |
|------|------|------|--------|----------|
| `constructor` | 构造 Server 实例 | config: Partial<ServerConfig> | - | [server/src/index.ts](file:///workspace/server/src/index.ts) |
| `start` | 启动服务器 | - | Promise<void> | [server/src/index.ts](file:///workspace/server/src/index.ts) |
| `setupRoutes` | 设置路由 | - | void | [server/src/index.ts](file:///workspace/server/src/index.ts) |
| `createDefaultAdmin` | 创建默认管理员 | - | Promise<void> | [server/src/index.ts](file:///workspace/server/src/index.ts) |

## 5. 数据模型

### 5.1 用户相关

| 类型 | 描述 | 实现文件 |
|------|------|----------|
| `User` | 用户信息 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `ApiKey` | API 密钥 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `AuthToken` | 认证令牌 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `TokenPayload` | JWT 令牌载荷 | [server/src/types.ts](file:///workspace/server/src/types.ts) |

### 5.2 能力相关

| 类型 | 描述 | 实现文件 |
|------|------|----------|
| `Capability` | 能力信息 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `CapabilityVersion` | 能力版本 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `Subscription` | 订阅信息 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `SecurityScan` | 安全扫描结果 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `Compliance` | 合规信息 | [server/src/types.ts](file:///workspace/server/src/types.ts) |

### 5.3 配置相关

| 类型 | 描述 | 实现文件 |
|------|------|----------|
| `ServerConfig` | 服务器配置 | [server/src/types.ts](file:///workspace/server/src/types.ts) |
| `LdapConfig` | LDAP 配置 | [server/src/types.ts](file:///workspace/server/src/types.ts) |

## 6. 依赖关系

### 6.1 CLI 依赖

| 依赖 | 版本 | 用途 | 来源 |
|------|------|------|------|
| axios | ^1.6.7 | HTTP 客户端 | [package.json](file:///workspace/package.json) |
| chalk | ^4.1.2 | 终端颜色输出 | [package.json](file:///workspace/package.json) |
| commander | ^12.0.0 | 命令行参数解析 | [package.json](file:///workspace/package.json) |
| crypto-js | ^4.2.0 | 加密工具 | [package.json](file:///workspace/package.json) |
| fs-extra | ^11.2.0 | 文件系统操作 | [package.json](file:///workspace/package.json) |
| i18next | ^26.0.1 | 国际化 | [package.json](file:///workspace/package.json) |
| inquirer | ^9.2.16 | 交互式命令行 | [package.json](file:///workspace/package.json) |
| semver | ^7.6.0 | 版本管理 | [package.json](file:///workspace/package.json) |
| yaml | ^2.3.4 | YAML 解析 | [package.json](file:///workspace/package.json) |

### 6.2 Server 依赖

| 依赖 | 版本 | 用途 | 来源 |
|------|------|------|------|
| axios | ^1.6.7 | HTTP 客户端 | [server/package.json](file:///workspace/server/package.json) |
| bcryptjs | ^2.4.3 | 密码加密 | [server/package.json](file:///workspace/server/package.json) |
| better-sqlite3 | ^12.8.0 | SQLite 数据库 | [server/package.json](file:///workspace/server/package.json) |
| chalk | ^4.1.2 | 终端颜色输出 | [server/package.json](file:///workspace/server/package.json) |
| cors | ^2.8.5 | CORS 中间件 | [server/package.json](file:///workspace/server/package.json) |
| express | ^4.18.2 | Web 服务器 | [server/package.json](file:///workspace/server/package.json) |
| express-validator | ^7.3.1 | 数据验证 | [server/package.json](file:///workspace/server/package.json) |
| fs-extra | ^11.2.0 | 文件系统操作 | [server/package.json](file:///workspace/server/package.json) |
| jsonwebtoken | ^9.0.2 | JWT 认证 | [server/package.json](file:///workspace/server/package.json) |
| ldapjs | ^3.0.7 | LDAP 认证 | [server/package.json](file:///workspace/server/package.json) |
| uuid | ^9.0.1 | 生成唯一 ID | [server/package.json](file:///workspace/server/package.json) |
| yaml | ^2.3.4 | YAML 解析 | [server/package.json](file:///workspace/server/package.json) |

## 7. 项目运行方式

### 7.1 开发环境

#### 7.1.1 启动 Server

```bash
# 进入 server 目录
cd server

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 7.1.2 运行 CLI

```bash
# 安装依赖
npm install

# 运行 CLI 开发模式
npm run dev [command]
```

### 7.2 构建与打包

#### 7.2.1 构建 CLI

```bash
# 构建 TypeScript
npm run build

# 打包为跨平台二进制文件
npm run build:all
```

#### 7.2.2 构建 Server

```bash
# 进入 server 目录
cd server

# 构建 TypeScript
npm run build
```

### 7.3 部署

#### 7.3.1 Docker 部署

```bash
docker-compose up -d
```

#### 7.3.2 RPM/DEB 部署

```bash
# RPM
sudo rpm -ivh semi-nexus-server-0.1.0-1.el8.x86_64.rpm

# DEB
sudo dpkg -i semi-nexus-server_0.1.0_amd64.deb
```

#### 7.3.3 手动部署

```bash
# 下载
tar -xzf semi-nexus-server.tar.gz
cd semi-nexus-server

# 安装
sudo cp -r . /opt/semi-nexus-server
sudo ln -s /opt/semi-nexus-server/bin/semi-nexus-server /usr/local/bin/
sudo cp semi-nexus-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server
```

## 8. API 接口

### 8.1 认证 API

| 路径 | 方法 | 功能 | 认证 | 实现文件 |
|------|------|------|------|----------|
| /api/v1/auth/login | POST | 用户登录 | 否 | [server/src/routes/auth.ts](file:///workspace/server/src/routes/auth.ts) |
| /api/v1/auth/apikey | POST | 创建 API Key | 是 | [server/src/routes/auth.ts](file:///workspace/server/src/routes/auth.ts) |
| /api/v1/auth/refresh | POST | 刷新令牌 | 是 | [server/src/routes/auth.ts](file:///workspace/server/src/routes/auth.ts) |

### 8.2 能力 API

| 路径 | 方法 | 功能 | 认证 | 实现文件 |
|------|------|------|------|----------|
| /api/v1/capabilities | GET | 搜索能力 | 否 | [server/src/routes/capabilities.ts](file:///workspace/server/src/routes/capabilities.ts) |
| /api/v1/capabilities/:id | GET | 获取能力详情 | 否 | [server/src/routes/capabilities.ts](file:///workspace/server/src/routes/capabilities.ts) |
| /api/v1/capabilities/:id/subscribe | POST | 订阅能力 | 是 | [server/src/routes/capabilities.ts](file:///workspace/server/src/routes/capabilities.ts) |
| /api/v1/capabilities/:id/download | GET | 下载能力 | 是 | [server/src/routes/capabilities.ts](file:///workspace/server/src/routes/capabilities.ts) |

### 8.3 管理员 API

| 路径 | 方法 | 功能 | 认证 | 实现文件 |
|------|------|------|------|----------|
| /api/v1/admin/capabilities | POST | 创建能力 | 是 | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |
| /api/v1/admin/capabilities/:id/scan | POST | 安全扫描 | 是 | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |
| /api/v1/admin/capabilities/:id/approve | POST | 审核发布 | 是 | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |
| /api/v1/admin/users | GET | 用户列表 | 是 | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |
| /api/v1/admin/users | POST | 创建用户 | 是 | [server/src/routes/admin.ts](file:///workspace/server/src/routes/admin.ts) |

## 9. 安全特性

### 9.1 认证安全

- **JWT 令牌**：使用 JWT 进行身份验证，支持过期时间设置
- **密码强度**：本地用户密码必须符合强度要求（长度、大小写、数字、特殊字符）
- **登录限制**：防止暴力破解，超过尝试次数临时锁定账号
- **API Key**：支持使用 API Key 认证，方便自动化脚本
- **LDAP/AD 集成**：支持企业现有认证系统

### 9.2 数据安全

- **密码加密**：使用 bcryptjs 对密码进行加密存储
- **API Key 安全**：API Key 哈希存储，只返回一次原始密钥
- **传输安全**：建议在生产环境使用 HTTPS

### 9.3 能力安全

- **安全扫描**：对能力进行安全扫描，检测潜在风险
- **审核机制**：管理员审核后才能发布能力
- **访问控制**：基于角色的访问控制

## 10. 监控与维护

### 10.1 健康检查

- **健康端点**：`/health` 端点用于监控服务状态
- **日志记录**：关键操作日志记录

### 10.2 常见问题

| 问题 | 解决方案 |
|------|----------|
| 登录失败 | 检查用户名密码是否正确，是否超过登录尝试次数 |
| 能力安装失败 | 检查网络连接，确保用户有订阅权限 |
| 同步失败 | 检查 Agent 环境配置，确保路径正确 |
| 服务器启动失败 | 检查端口是否被占用，JWT_SECRET 是否设置 |

## 11. 扩展与定制

### 11.1 能力开发

- **SNP 格式**：能力包使用 SNP 格式，可通过 SemiNexus CLI 工具创建
- **能力类型**：支持 skill、mcp、agent 三种类型

### 11.2 插件系统

- **可扩展**：支持通过插件扩展功能
- **钩子机制**：提供生命周期钩子

## 12. 总结

SemiNexus CLI 是一个功能完整的 Agent 能力中转工具，通过 CLI + Server 的架构，实现了能力的安全管理和离线访问。其核心价值在于：

1. **安全管控**：统一的安全扫描和审核机制，确保能力的安全性
2. **离线访问**：通过 Server 中转，让离线环境也能使用互联网上的能力
3. **多端同步**：支持多种 Agent 环境的同步
4. **易于部署**：提供多种部署方式，适应不同企业环境
5. **可扩展**：模块化设计，易于扩展和定制

通过 SemiNexus CLI，企业可以更安全、更高效地管理和使用 Agent 能力，提升开发和运维效率。