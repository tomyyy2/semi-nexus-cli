# 软件项目测试覆盖与质量保障规范

## 1. 测试金字塔模型

### 1.1 测试层级

```
        /\
       /  \
      / E2E \      10-20%  (端到端测试)
     /------\
    /        \
   / Integration\   30-40%  (集成测试)
  /--------------\
 /                \
/    Unit Tests    \  60-70%  (单元测试)
--------------------
```

### 1.2 各层级测试说明

#### 单元测试 (Unit Tests) - 60-70%
**目标：** 测试最小可测试单元（函数、方法、类）

**覆盖内容：**
- ✅ 所有公共函数和方法
- ✅ 边界条件测试
- ✅ 异常处理测试
- ✅ 业务逻辑验证

**示例（针对本项目）：**
```typescript
// 1. 命令参数验证
describe('Install Command', () => {
  it('should validate capability name', async () => {
    await expect(install('')).rejects.toThrow('Capability name is required');
  });
  
  it('should handle subscription check', async () => {
    // Mock 未订阅场景
    mockRegistry.isSubscribed.mockResolvedValue(false);
    await expect(install('test-skill')).rejects.toThrow('Not subscribed');
  });
});

// 2. API 客户端方法
describe('Client API', () => {
  it('should handle authentication', async () => {
    const result = await client.login('user', 'pass', 'local');
    expect(result.token).toBeDefined();
    expect(client.isAuthenticated()).toBe(true);
  });
  
  it('should handle network errors', async () => {
    mockAxios.get.mockRejectedValue(new Error('Network error'));
    await expect(client.searchCapabilities('test')).rejects.toThrow();
  });
});

// 3. 工具函数
describe('Utility Functions', () => {
  it('should validate capability package', () => {
    const valid = validatePackage(manifest, content);
    expect(valid).toBe(true);
  });
});
```

---

#### 集成测试 (Integration Tests) - 30-40%
**目标：** 测试模块间的交互

**覆盖内容：**
- ✅ CLI 与 Server 的 API 交互
- ✅ 文件系统操作
- ✅ 数据库/缓存操作
- ✅ 外部服务集成（LDAP、Agent）

**示例（针对本项目）：**
```typescript
// 1. CLI <-> Server 集成
describe('CLI-Server Integration', () => {
  let testServer: TestServer;
  
  beforeAll(async () => {
    testServer = await startTestServer();
  });
  
  it('should complete login -> search -> subscribe -> install flow', async () => {
    // 登录
    await cli.login('admin', 'password');
    expect(cli.isAuthenticated()).toBe(true);
    
    // 搜索
    const results = await cli.search('skill');
    expect(results.length).toBeGreaterThan(0);
    
    // 订阅
    await cli.subscribe(results[0].id);
    
    // 安装
    await cli.install(results[0].name);
    expect(await cli.isInstalled(results[0].name)).toBe(true);
  });
});

// 2. 文件系统集成
describe('File System Integration', () => {
  it('should handle concurrent installations', async () => {
    await Promise.all([
      cli.install('skill-1'),
      cli.install('skill-2'),
      cli.install('skill-3')
    ]);
    // 验证所有安装成功且无冲突
  });
  
  it('should handle disk full scenario', async () => {
    // Mock 磁盘空间不足
    mockFs({ '/fake/path': { '.': mockFs.directory({ mode: 0o444 }) } });
    await expect(cli.install('skill')).rejects.toThrow('No space left');
  });
});

// 3. Agent 集成
describe('Agent Integration', () => {
  it('should sync to Claude Code directory', async () => {
    await cli.install('test-skill');
    await cli.sync('claude-code');
    
    const claudeDir = getClaudeCodeSkillsDir();
    expect(fs.existsSync(path.join(claudeDir, 'test-skill'))).toBe(true);
  });
});
```

---

#### E2E 测试 (End-to-End Tests) - 10-20%
**目标：** 测试完整的用户场景

**覆盖内容：**
- ✅ 完整的用户工作流
- ✅ 真实环境下的系统集成
- ✅ 性能和稳定性验证

**示例（针对本项目）：**
```typescript
// 1. 完整用户旅程
describe('User Journey - First Time User', () => {
  it('should complete onboarding flow', async () => {
    // 新用户首次使用
    const output = await cli.run(['quickstart']);
    
    // 验证引导流程
    expect(output).toContain('Welcome to SemiNexus CLI');
    expect(output).toContain('Server URL');
    expect(output).toContain('Login');
    
    // 验证配置创建
    expect(fs.existsSync(configPath)).toBe(true);
    
    // 验证推荐技能安装
    expect(output).toContain('Installing recommended skills');
  });
});

// 2. 离线场景
describe('Offline User Scenario', () => {
  it('should support offline installation from cache', async () => {
    // 先在线安装到缓存
    await cli.install('skill-a', { cacheOnly: true });
    
    // 断开网络
    mockNetwork.offline();
    
    // 从缓存安装
    await expect(cli.install('skill-a')).resolves.not.toThrow();
  });
});

// 3. 多用户场景
describe('Multi-User Scenario', () => {
  it('should handle concurrent users', async () => {
    const users = ['user1', 'user2', 'user3'];
    
    await Promise.all(users.map(async (username) => {
      const userCli = createCli(username);
      await userCli.login(username, 'password');
      await userCli.install('shared-skill');
    }));
    
    // 验证所有用户安装成功
    for (const user of users) {
      expect(await getCli(user).isInstalled('shared-skill')).toBe(true);
    }
  });
});
```

---

## 2. 测试框架选择指南

### 2.1 按项目类型选择

#### Node.js/TypeScript 项目（如本项目）

**推荐组合：**
```json
{
  "单元测试": "Jest",
  "集成测试": "Jest + Supertest",
  "E2E 测试": "Jest + 自定义测试工具",
  "覆盖率": "Jest --coverage (Istanbul)",
  "Lint": "ESLint + @typescript-eslint",
  "类型检查": "tsc --noEmit"
}
```

**package.json 配置：**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

#### Python 项目

**推荐组合：**
```yaml
单元测试：pytest + pytest-cov
集成测试：pytest + requests-mock
E2E 测试：pytest + selenium (Web) / pytest (API)
Lint: flake8 + black + mypy
```

#### Java 项目

**推荐组合：**
```xml
单元测试：JUnit 5 + Mockito
集成测试：Spring Boot Test + TestContainers
E2E 测试：Cucumber + Selenium
构建工具：Maven/Gradle
```

#### Web 前端项目

**推荐组合：**
```json
单元测试：Jest + React Testing Library / Vitest
组件测试：Storybook + @storybook/test
E2E 测试：Playwright / Cypress
视觉回归：Chromatic / Percy
```

---

### 2.2 通用测试框架对比

| 框架 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **Jest** | Node.js 全栈 | 零配置、快照测试、覆盖率 | 内存占用大 |
| **Vitest** | Vite 项目 | 快速、兼容 Jest API | 生态较新 |
| **Mocha** | 灵活项目 | 高度可配置、插件丰富 | 需额外配置 |
| **pytest** | Python | 简洁、插件丰富 | 仅 Python |
| **JUnit 5** | Java | 标准、生态完善 | 配置复杂 |

---

## 3. 测试覆盖率标准

### 3.1 覆盖率指标

```yaml
语句覆盖率 (Statements): 80%+
分支覆盖率 (Branches): 70%+
函数覆盖率 (Functions): 90%+
行覆盖率 (Lines): 80%+
```

### 3.2 关键代码必须 100% 覆盖

- ✅ 认证和授权逻辑
- ✅ 支付和金融相关
- ✅ 数据安全处理
- ✅ 核心业务逻辑
- ✅ 公共 API 和 SDK

### 3.3 覆盖率配置示例

**jest.config.js：**
```javascript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 90,
      lines: 80,
      statements: 80,
    },
    // 核心文件要求 100% 覆盖
    './src/services/auth.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

---

## 4. 测试最佳实践

### 4.1 测试命名规范

```typescript
// ❌ 不好的命名
it('should work', () => {});
it('test login', () => {});

// ✅ 好的命名
it('should return 401 when credentials are invalid', () => {});
it('should create user with valid email and password', () => {});
it('should throw error when capability not found', () => {});

// 格式：should [expected behavior] when [condition]
```

### 4.2 AAA 模式 (Arrange-Act-Assert)

```typescript
// ❌ 混乱的测试
it('should install capability', async () => {
  const result = await install('test');  // Act
  setupMock();  // Arrange - 顺序错了！
  expect(result).toBe(true);  // Assert
});

// ✅ AAA 模式
it('should install capability', async () => {
  // Arrange
  setupMock();
  mockSubscription(true);
  
  // Act
  const result = await install('test');
  
  // Assert
  expect(result).toBe(true);
  expect(mockDownload).toHaveBeenCalled();
});
```

### 4.3 测试隔离

```typescript
// ❌ 测试间共享状态
let user: User;

beforeAll(() => {
  user = createUser();  // 所有测试共享
});

// ✅ 每个测试独立
describe('User Management', () => {
  it('should create user', async () => {
    const user = await createUser();
    expect(user.id).toBeDefined();
  });
  
  it('should delete user', async () => {
    const user = await createUser();  // 独立创建
    await deleteUser(user.id);
    expect(await findUser(user.id)).toBeNull();
  });
});
```

### 4.4 Mock 和 Stub

```typescript
// ✅ 正确的 Mock 使用
describe('Install Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();  // 清理 Mock
  });
  
  it('should download package from server', async () => {
    // Mock API 响应
    mockClient.downloadPackage.mockResolvedValue(Buffer.from('package'));
    
    await install('test-skill');
    
    expect(mockClient.downloadPackage).toHaveBeenCalledWith(
      'test-skill',
      'latest'
    );
  });
  
  it('should handle download failure', async () => {
    // Mock 网络错误
    mockClient.downloadPackage.mockRejectedValue(new Error('Network error'));
    
    await expect(install('test-skill')).rejects.toThrow('Download failed');
  });
});
```

---

## 5. CI/CD 集成

### 5.1 GitHub Actions 示例

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Integration tests
        run: npm run test:integration
      
      - name: E2E tests
        run: npm run test:e2e
        env:
          E2E_SERVER_URL: http://localhost:3000
          E2E_ADMIN_PASSWORD: Test@Admin123
      
      - name: Build
        run: npm run build
```

### 5.2 质量门禁

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Check test coverage
        run: |
          COVERAGE=$(npm run test:coverage -- --json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below 80%"
            exit 1
          fi
          echo "✅ Coverage: $COVERAGE%"
      
      - name: Check lint errors
        run: |
          LINT_ERRORS=$(npm run lint 2>&1 | grep -c "error" || true)
          if [ "$LINT_ERRORS" -gt 0 ]; then
            echo "❌ Found $LINT_ERRORS lint errors"
            exit 1
          fi
          echo "✅ No lint errors"
```

---

## 6. 针对本项目的测试策略

### 6.1 当前问题

```yaml
当前覆盖率：1.92%  (严重不足)
Lint 错误：75 个 (24 errors, 51 warnings)
E2E 通过率：31% (需要修复)
```

### 6.2 优先级排序

**P0 - 立即修复：**
1. 修复所有 Lint 错误（2-4 小时）
2. 为新增命令添加基础单元测试（1-2 天）
   - quickstart.ts
   - install.ts
   - sync.ts
   - discover.ts
   - verify.ts

**P1 - 本周完成：**
3. 为核心服务添加单元测试（2-3 天）
   - auth.ts (认证逻辑)
   - registry.ts (注册表管理)
   - client.ts (API 客户端)
4. 修复 E2E 测试配置（4-8 小时）

**P2 - 下周完成：**
5. 集成测试（2-3 天）
   - CLI <-> Server 交互
   - 文件系统操作
   - Agent 同步
6. 完善 E2E 测试场景（2-3 天）

### 6.3 测试文件结构

```
src/
  __tests__/
    unit/
      commands/
        install.test.ts
        sync.test.ts
        quickstart.test.ts
        discover.test.ts
        verify.test.ts
      services/
        auth.test.ts
        registry.test.ts
      api/
        client.test.ts
        agents.test.ts
    integration/
      cli-server.test.ts
      file-system.test.ts
      agent-sync.test.ts
    e2e/
      user-journey.test.ts
      offline-scenario.test.ts
      multi-user.test.ts
```

---

## 7. 测试检查清单

### 开发阶段

- [ ] 编写新功能前先写测试（TDD）
- [ ] 单元测试覆盖所有公共方法
- [ ] 边界条件和异常处理测试
- [ ] 运行 `npm test` 本地验证
- [ ] 运行 `npm run lint` 检查代码规范
- [ ] 运行 `npm run typecheck` 类型检查

### 提交前

- [ ] 所有测试通过
- [ ] 覆盖率达标（80%+）
- [ ] 无 Lint 错误
- [ ] 类型检查通过
- [ ] 构建成功

### CI/CD

- [ ] 单元测试自动运行
- [ ] 集成测试自动运行
- [ ] E2E 测试自动运行
- [ ] 覆盖率报告生成
- [ ] 质量门禁检查

### 发布前

- [ ] 完整回归测试
- [ ] 性能测试
- [ ] 安全扫描
- [ ] 文档更新
- [ ] 版本号更新

---

## 8. 工具和资源

### 推荐工具

```yaml
测试运行：Jest / Vitest / pytest
覆盖率：Istanbul / c8 / coverage.py
Mock: Jest Mock / Mockito / unittest.mock
E2E: Playwright / Cypress / Selenium
API 测试：Supertest / Postman / httpie
性能测试：k6 / Apache Bench / wrk
安全扫描：Snyk / npm audit / OWASP ZAP
代码质量：SonarQube / Codecov / CodeClimate
```

### 学习资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)
