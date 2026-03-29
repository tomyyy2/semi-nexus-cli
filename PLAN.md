# SemiNexus CLI 修复完善计划

## 概述

根据 Code Review 结果，本计划分为三个主要阶段：
1. **P0 - 安全与核心功能修复** - 解决严重安全问题和功能缺失
2. **P1 - 功能完善与架构优化** - 完善核心功能实现
3. **P2 - 全面的 E2E 测试覆盖** - 实现全模式、全流程、全功能点测试

---

## 阶段一：P0 - 安全与核心功能修复

### 1.1 安全问题修复

#### 1.1.1 移除硬编码默认密码
- **文件**: `server/src/index.ts`
- **问题**: 默认管理员密码 `admin123` 硬编码
- **修复方案**:
  - 首次启动时检查环境变量 `ADMIN_PASSWORD`
  - 如果未设置，生成随机密码并输出到控制台
  - 强制用户首次登录后修改密码
  - 添加密码强度验证

#### 1.1.2 JWT Secret 安全加固
- **文件**: `server/src/index.ts`, `server/src/services/auth.ts`
- **问题**: 默认 JWT Secret 不安全
- **修复方案**:
  - 生产环境强制要求设置 `JWT_SECRET` 环境变量
  - 启动时检查，如果使用默认值则输出警告
  - 开发环境使用随机生成的 secret

#### 1.1.3 实现 LDAP 认证
- **文件**: `server/src/services/auth.ts`
- **问题**: LDAP 认证逻辑为空
- **修复方案**:
  - 使用 `ldapjs` 库实现真正的 LDAP 绑定验证
  - 支持 LDAP 和 Active Directory
  - 添加连接池和超时处理
  - 添加 LDAP 连接状态检查

### 1.2 核心功能实现

#### 1.2.1 CLI login 命令实现
- **文件**: `src/commands/login.ts`
- **问题**: 登录命令未实际调用 Server
- **修复方案**:
  - 调用 Server `/api/v1/auth/login` 接口
  - 保存 accessToken 和 refreshToken 到配置文件
  - 支持 API Key 登录方式
  - 添加 token 自动刷新机制

#### 1.2.2 CLI 与 Server API 集成
- **文件**: `src/api/client.ts`, 所有 commands
- **问题**: CLI 使用本地模拟数据，未与 Server 通信
- **修复方案**:
  - 完善 `SemiNexusClient` 类，实现所有 API 调用
  - 修改所有 commands 使用 API Client
  - 添加离线模式支持（使用本地缓存）
  - 添加请求重试和错误处理

#### 1.2.3 实现 logout 命令
- **文件**: `src/commands/logout.ts`
- **修复方案**:
  - 清除本地保存的 token
  - 调用 Server 登出接口（可选）

---

## 阶段二：P1 - 功能完善与架构优化

### 2.1 输入验证与安全加固

#### 2.1.1 添加输入验证中间件
- **新增文件**: `server/src/middleware/validator.ts`
- **内容**:
  - 使用 `joi` 或 `zod` 进行请求验证
  - 用户名、密码格式验证
  - API 请求参数验证
  - 文件上传验证

#### 2.1.2 添加速率限制
- **新增文件**: `server/src/middleware/rateLimit.ts`
- **内容**:
  - 登录失败次数限制
  - API 请求频率限制
  - IP 黑名单机制

#### 2.1.3 密码强度验证
- **文件**: `server/src/services/auth.ts`
- **要求**:
  - 最少 8 位
  - 包含大小写字母
  - 包含数字
  - 包含特殊字符

### 2.2 错误处理统一

#### 2.2.1 创建统一错误处理
- **新增文件**: `server/src/middleware/errorHandler.ts`
- **内容**:
  - 统一错误响应格式
  - 错误日志记录
  - 敏感信息过滤

#### 2.2.2 CLI 错误处理
- **新增文件**: `src/utils/error.ts`
- **内容**:
  - 自定义错误类
  - 错误码定义
  - 用户友好的错误消息

### 2.3 日志系统完善

#### 2.3.1 Server 日志系统
- **新增文件**: `server/src/services/logger.ts`
- **内容**:
  - Winston 或 Pino 日志框架
  - 日志级别配置
  - 日志文件轮转
  - 结构化日志输出

#### 2.3.2 CLI 日志系统
- **文件**: `src/api/client.ts`
- **修复**:
  - 实现日志写入功能
  - 支持 debug 模式

### 2.4 Docker 优化

#### 2.4.1 修复 Dockerfile
- **文件**: `Dockerfile`
- **修复**:
  - 修正多阶段构建引用
  - 添加健康检查
  - 优化镜像大小

---

## 阶段三：P2 - 全面的 E2E 测试覆盖

### 3.1 测试架构设计

```
tests/
├── e2e/
│   ├── setup/
│   │   ├── test-server.ts       # 测试服务器启动/关闭
│   │   ├── test-cli.ts          # CLI 测试工具
│   │   └── fixtures.ts          # 测试数据
│   │
│   ├── server/
│   │   ├── auth.e2e.test.ts     # 认证模块 E2E 测试
│   │   ├── capabilities.e2e.test.ts  # 能力管理 E2E 测试
│   │   ├── admin.e2e.test.ts    # 管理员功能 E2E 测试
│   │   ├── security.e2e.test.ts # 安全功能 E2E 测试
│   │   └── ldap.e2e.test.ts     # LDAP 集成 E2E 测试
│   │
│   ├── cli/
│   │   ├── init.e2e.test.ts     # init 命令 E2E 测试
│   │   ├── login.e2e.test.ts    # login 命令 E2E 测试
│   │   ├── search.e2e.test.ts   # search 命令 E2E 测试
│   │   ├── subscribe.e2e.test.ts # subscribe 命令 E2E 测试
│   │   ├── install.e2e.test.ts  # install 命令 E2E 测试
│   │   ├── sync.e2e.test.ts     # sync 命令 E2E 测试
│   │   ├── upgrade.e2e.test.ts  # upgrade 命令 E2E 测试
│   │   ├── uninstall.e2e.test.ts # uninstall 命令 E2E 测试
│   │   └── full-workflow.e2e.test.ts # 完整工作流 E2E 测试
│   │
│   └── integration/
│       ├── cli-server.e2e.test.ts  # CLI 与 Server 集成测试
│       ├── multi-user.e2e.test.ts  # 多用户场景测试
│       └── agent-sync.e2e.test.ts  # Agent 同步测试
│
├── unit/
│   ├── cli/
│   │   └── ... (现有单元测试)
│   └── server/
│       ├── services/
│       │   ├── auth.test.ts
│       │   ├── registry.test.ts
│       │   ├── scanner.test.ts
│       │   └── audit.test.ts
│       └── middleware/
│           └── auth.test.ts
│
└── utils/
    ├── mock-server.ts           # Mock 服务器
    ├── mock-ldap.ts             # Mock LDAP 服务器
    └── test-helpers.ts          # 测试辅助函数
```

### 3.2 Server 端 E2E 测试用例

#### 3.2.1 认证模块 (auth.e2e.test.ts)
```
测试场景:
1. 用户注册流程
   - 正常注册
   - 重复用户名注册
   - 密码强度不足
   - 缺少必填字段

2. 用户登录流程
   - 正确凭据登录
   - 错误密码登录
   - 不存在的用户
   - 账户锁定（多次失败后）
   - LDAP 用户登录
   - API Key 登录

3. Token 管理
   - Token 刷新
   - Token 过期处理
   - 无效 Token 拒绝

4. API Key 管理
   - 创建 API Key
   - 使用 API Key 认证
   - 撤销 API Key
   - API Key 过期

5. 登出流程
   - 正常登出
   - Token 失效验证
```

#### 3.2.2 能力管理模块 (capabilities.e2e.test.ts)
```
测试场景:
1. 能力搜索
   - 关键字搜索
   - 类型过滤
   - 标签过滤
   - 分页

2. 能力订阅
   - 订阅能力
   - 取消订阅
   - 查看订阅列表
   - 订阅过期处理

3. 能力下载
   - 下载已订阅能力
   - 未订阅拒绝下载
   - 版本选择下载

4. 能力评分
   - 提交评分
   - 评分范围验证
   - 重复评分处理
```

#### 3.2.3 管理员功能 (admin.e2e.test.ts)
```
测试场景:
1. 能力管理
   - 创建能力
   - 更新能力
   - 删除能力
   - 版本管理

2. 安全扫描
   - 发起扫描
   - 查看扫描结果
   - 扫描失败处理

3. 审核流程
   - 批准能力
   - 拒绝能力
   - 审核评论

4. 用户管理
   - 创建用户
   - 更新用户角色
   - 禁用/启用用户
   - 为用户创建 API Key

5. 审计日志
   - 查询日志
   - 过滤条件
   - 分页
```

#### 3.2.4 安全功能 (security.e2e.test.ts)
```
测试场景:
1. 访问控制
   - 未认证访问拒绝
   - 普通用户访问管理接口拒绝
   - Token 验证

2. 速率限制
   - 登录频率限制
   - API 请求限制

3. 输入验证
   - SQL 注入防护
   - XSS 防护
   - 路径遍历防护

4. 敏感信息保护
   - 密码不返回
   - API Key 脱敏显示
```

### 3.3 CLI 端 E2E 测试用例

#### 3.3.1 init 命令 (init.e2e.test.ts)
```
测试场景:
1. 首次初始化
   - 创建配置目录
   - 生成默认配置文件
   - 创建必要子目录

2. 重复初始化
   - 提示已存在
   - 覆盖确认

3. 自定义配置
   - 指定 Server URL
   - 指定安装目录
```

#### 3.3.2 login 命令 (login.e2e.test.ts)
```
测试场景:
1. 用户名密码登录
   - 正确凭据登录成功
   - 错误凭据登录失败
   - 保存 Token 到配置

2. API Key 登录
   - 有效 API Key 登录
   - 无效 API Key 拒绝

3. 登录状态检查
   - 已登录状态
   - Token 过期处理
```

#### 3.3.3 search 命令 (search.e2e.test.ts)
```
测试场景:
1. 搜索功能
   - 关键字搜索
   - 空结果处理
   - 多结果展示

2. 过滤功能
   - 按类型过滤
   - 按标签过滤

3. 离线模式
   - 使用本地缓存
   - 无缓存提示
```

#### 3.3.4 subscribe 命令 (subscribe.e2e.test.ts)
```
测试场景:
1. 订阅流程
   - 订阅已存在能力
   - 订阅不存在能力
   - 重复订阅处理
   - 指定版本订阅

2. 未登录状态
   - 提示先登录
```

#### 3.3.5 install 命令 (install.e2e.test.ts)
```
测试场景:
1. 安装流程
   - 安装已订阅能力
   - 安装未订阅能力（拒绝）
   - 指定版本安装
   - 强制重新安装

2. 安装验证
   - 文件正确创建
   - manifest.json 正确
   - 本地注册表更新

3. 离线安装
   - 使用本地缓存
```

#### 3.3.6 sync 命令 (sync.e2e.test.ts)
```
测试场景:
1. Agent 检测
   - 检测已安装 Agent
   - 无 Agent 提示

2. 同步模式
   - symlink 模式
   - copy 模式
   - Windows junction 模式

3. 同步验证
   - 文件正确链接/复制
   - 同步状态更新

4. 指定 Agent 同步
   - 同步到指定 Agent
   - 同步到所有 Agent
```

#### 3.3.7 upgrade 命令 (upgrade.e2e.test.ts)
```
测试场景:
1. 升级流程
   - 检查新版本
   - 升级指定能力
   - 升级所有能力

2. 版本处理
   - 已是最新版本
   - 降级拒绝
```

#### 3.3.8 uninstall 命令 (uninstall.e2e.test.ts)
```
测试场景:
1. 卸载流程
   - 卸载已安装能力
   - 卸载不存在能力
   - 清理同步链接

2. 确认机制
   - 确认后卸载
   - 取消卸载
```

#### 3.3.9 完整工作流 (full-workflow.e2e.test.ts)
```
测试场景:
1. 新用户完整流程
   init -> login -> search -> subscribe -> install -> sync -> status

2. 日常使用流程
   login -> search -> install -> sync

3. 管理员流程
   login(admin) -> create capability -> scan -> approve -> verify

4. 多 Agent 同步流程
   install -> sync(to all) -> verify each agent

5. 离线使用流程
   (预先缓存) -> offline install -> sync
```

### 3.4 集成测试用例

#### 3.4.1 CLI-Server 集成 (cli-server.e2e.test.ts)
```
测试场景:
1. 完整请求流程
   - CLI 发起请求
   - Server 处理
   - 响应解析
   - 本地状态更新

2. 并发处理
   - 多 CLI 实例同时操作
   - 数据一致性

3. 网络异常处理
   - 连接超时
   - 服务器错误
   - 重试机制
```

#### 3.4.2 多用户场景 (multi-user.e2e.test.ts)
```
测试场景:
1. 用户隔离
   - 用户只能看到自己的订阅
   - 用户只能操作自己的数据

2. 管理员操作
   - 管理员可以查看所有用户
   - 管理员可以操作所有能力

3. 并发用户
   - 多用户同时订阅
   - 统计数据正确性
```

#### 3.4.3 Agent 同步 (agent-sync.e2e.test.ts)
```
测试场景:
1. Claude Code 同步
   - 检测 Claude Code 安装
   - symlink 创建
   - 能力可用性验证

2. OpenCode 同步
   - 检测 OpenCode 安装
   - symlink 创建

3. OpenClaw 同步
   - 检测 OpenClaw 安装
   - copy 模式同步

4. 跨平台同步
   - Linux 权限处理
   - Windows junction 处理
   - macOS symlink 处理
```

### 3.5 测试工具与配置

#### 3.5.1 测试依赖
```json
{
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2",
    "testcontainers": "^10.7.0",
    "mock-ldap-server": "^1.0.0",
    "faker": "^6.6.6",
    "dotenv": "^16.4.1"
  }
}
```

#### 3.5.2 Jest 配置更新
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.test.ts'],
      // ...
    },
    {
      displayName: 'e2e',
      testMatch: ['**/tests/e2e/**/*.e2e.test.ts'],
      testTimeout: 60000,
      setupFilesAfterEnv: ['./tests/e2e/setup/jest.setup.ts'],
      // ...
    }
  ]
};
```

#### 3.5.3 E2E 测试脚本
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --selectProjects unit",
    "test:e2e": "jest --selectProjects e2e",
    "test:coverage": "jest --coverage",
    "test:e2e:server": "jest --selectProjects e2e --testPathPattern=server",
    "test:e2e:cli": "jest --selectProjects e2e --testPathPattern=cli"
  }
}
```

---

## 阶段四：P3 - Release 发布与打包

### 4.1 构建目标

#### 4.1.1 CLI 打包目标
| 平台 | 格式 | 文件名 |
|------|------|--------|
| Rocky Linux 8.10 | RPM | semi-nexus-cli-{version}-1.el8.x86_64.rpm |
| Rocky Linux 8.10 | 二进制 | semi-nexus-linux (独立可执行文件) |
| Ubuntu/Debian | DEB | semi-nexus-cli_{version}_amd64.deb |
| Windows | 二进制 | semi-nexus-win.exe |
| macOS | 二进制 | semi-nexus-macos |

#### 4.1.2 Server 打包目标
| 平台 | 格式 | 文件名 |
|------|------|--------|
| Rocky Linux 8.10 | RPM | semi-nexus-server-{version}-1.el8.x86_64.rpm |
| Rocky Linux 8.10 | 二进制 | semi-nexus-server-linux (独立可执行文件) |
| Ubuntu/Debian | DEB | semi-nexus-server_{version}_amd64.deb |
| Windows | 二进制 | semi-nexus-server-win.exe |
| macOS | 二进制 | semi-nexus-server-macos |

### 4.2 构建脚本重构

#### 4.2.1 目录结构
```
packaging/
├── bin/                          # 二进制文件输出目录
│   ├── semi-nexus-linux
│   ├── semi-nexus-win.exe
│   ├── semi-nexus-macos
│   ├── semi-nexus-server-linux
│   ├── semi-nexus-server-win.exe
│   └── semi-nexus-server-macos
│
├── rpm/                          # RPM 构建目录
│   ├── cli/
│   │   └── semi-nexus-cli.spec
│   └── server/
│       └── semi-nexus-server.spec
│
├── deb/                          # DEB 构建目录
│   ├── cli/
│   └── server/
│
├── systemd/
│   └── semi-nexus-server.service
│
└── scripts/
    ├── build-all.sh              # 构建所有包
    ├── build-binaries.sh         # 构建二进制文件
    ├── build-rpm.sh              # 构建 RPM 包
    ├── build-deb.sh              # 构建 DEB 包
    └── release.sh                # 发布脚本
```

#### 4.2.2 新增构建脚本

**packaging/scripts/build-binaries.sh**
```bash
#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
OUTPUT_DIR="packaging/bin"

echo "=== Building SemiNexus Binaries v${VERSION} ==="

mkdir -p ${OUTPUT_DIR}

echo ">>> Building CLI binaries..."
npm install
npm run build

pkg . \
  --targets node18-linux-x64,node18-win-x64,node18-macos-x64 \
  --output-path ${OUTPUT_DIR} \
  --compress GZip

mv ${OUTPUT_DIR}/semi-nexus-linux-x64 ${OUTPUT_DIR}/semi-nexus-linux 2>/dev/null || true
mv ${OUTPUT_DIR}/semi-nexus-win-x64.exe ${OUTPUT_DIR}/semi-nexus-win.exe 2>/dev/null || true
mv ${OUTPUT_DIR}/semi-nexus-macos-x64 ${OUTPUT_DIR}/semi-nexus-macos 2>/dev/null || true

chmod +x ${OUTPUT_DIR}/semi-nexus-linux ${OUTPUT_DIR}/semi-nexus-macos

echo ">>> Building Server binaries..."
cd server
npm install
npm run build

pkg . \
  --targets node18-linux-x64,node18-win-x64,node18-macos-x64 \
  --output-path ../${OUTPUT_DIR} \
  --compress GZip

mv ../${OUTPUT_DIR}/semi-nexus-server-linux-x64 ../${OUTPUT_DIR}/semi-nexus-server-linux 2>/dev/null || true
mv ../${OUTPUT_DIR}/semi-nexus-server-win-x64.exe ../${OUTPUT_DIR}/semi-nexus-server-win.exe 2>/dev/null || true
mv ../${OUTPUT_DIR}/semi-nexus-server-macos-x64 ../${OUTPUT_DIR}/semi-nexus-server-macos 2>/dev/null || true

chmod +x ../${OUTPUT_DIR}/semi-nexus-server-linux ../${OUTPUT_DIR}/semi-nexus-server-macos

echo "=== Build Complete ==="
ls -la ${OUTPUT_DIR}/
```

**packaging/scripts/build-rpm.sh**
```bash
#!/bin/bash
set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
BUILD_DIR="packaging/rpm-build"
OUTPUT_DIR="packaging/rpm"

echo "=== Building Rocky Linux 8.10 RPM Packages v${VERSION} ==="

mkdir -p ${BUILD_DIR}/{BUILD,RPMS,SRPMS,SPECS,SOURCES}

echo ">>> Building CLI RPM..."
mkdir -p ${BUILD_DIR}/SOURCES/semi-nexus-cli-${VERSION}
cp -r dist ${BUILD_DIR}/SOURCES/semi-nexus-cli-${VERSION}/
cp -r package*.json ${BUILD_DIR}/SOURCES/semi-nexus-cli-${VERSION}/
cp packaging/rpm/cli/semi-nexus-cli.spec ${BUILD_DIR}/SPECS/

tar -czf ${BUILD_DIR}/SOURCES/semi-nexus-cli-${VERSION}.tar.gz \
  -C ${BUILD_DIR}/SOURCES semi-nexus-cli-${VERSION}

rpmbuild --define "_topdir ${BUILD_DIR}" \
         --define "version ${VERSION}" \
         --define "dist .el8" \
         -ba ${BUILD_DIR}/SPECS/semi-nexus-cli.spec

mkdir -p ${OUTPUT_DIR}/cli
cp ${BUILD_DIR}/RPMS/x86_64/*.rpm ${OUTPUT_DIR}/cli/

echo ">>> Building Server RPM..."
mkdir -p ${BUILD_DIR}/SOURCES/semi-nexus-server-${VERSION}
cp -r server/dist ${BUILD_DIR}/SOURCES/semi-nexus-server-${VERSION}/
cp -r server/package*.json ${BUILD_DIR}/SOURCES/semi-nexus-server-${VERSION}/
cp packaging/systemd/semi-nexus-server.service ${BUILD_DIR}/SOURCES/semi-nexus-server-${VERSION}/
cp packaging/rpm/server/semi-nexus-server.spec ${BUILD_DIR}/SPECS/

tar -czf ${BUILD_DIR}/SOURCES/semi-nexus-server-${VERSION}.tar.gz \
  -C ${BUILD_DIR}/SOURCES semi-nexus-server-${VERSION}

rpmbuild --define "_topdir ${BUILD_DIR}" \
         --define "version ${VERSION}" \
         --define "dist .el8" \
         -ba ${BUILD_DIR}/SPECS/semi-nexus-server.spec

mkdir -p ${OUTPUT_DIR}/server
cp ${BUILD_DIR}/RPMS/x86_64/*.rpm ${OUTPUT_DIR}/server/

echo "=== RPM Build Complete ==="
echo "CLI RPM: ${OUTPUT_DIR}/cli/"
echo "Server RPM: ${OUTPUT_DIR}/server/"
```

### 4.3 RPM Spec 文件

#### 4.3.1 CLI RPM Spec
**packaging/rpm/cli/semi-nexus-cli.spec**
```spec
Name:           semi-nexus-cli
Version:        %{version}
Release:        1%{?dist}
Summary:        SemiNexus CLI - Agent Capability Hub Command Line Tool

License:        MIT
URL:            https://github.com/tomyyy2/semi-nexus-cli
BuildArch:      x86_64
Requires:       glibc >= 2.28
Provides:       snx = %{version}-%{release}

%description
SemiNexus CLI is a pure command-line tool for managing AI Agent capabilities.
It supports offline users through Server-Client architecture.

Features:
- Capability search and subscription
- Local installation and management
- Multi-agent synchronization (Claude Code, OpenCode, OpenClaw)
- Offline mode support

%prep
%setup -q

%build
# Binary already built

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/lib/semi-nexus-cli
mkdir -p %{buildroot}/etc/bash_completion.d

# Install binary
install -m 0755 dist/index.js %{buildroot}/usr/lib/semi-nexus-cli/
ln -sf /usr/lib/semi-nexus-cli/index.js %{buildroot}/usr/bin/semi-nexus
ln -sf /usr/lib/semi-nexus-cli/index.js %{buildroot}/usr/bin/snx

# Install bash completion
install -m 0644 packaging/completion/semi-nexus.bash %{buildroot}/etc/bash_completion.d/semi-nexus

%files
%defattr(-,root,root,-)
/usr/bin/semi-nexus
/usr/bin/snx
/usr/lib/semi-nexus-cli/*
/etc/bash_completion.d/semi-nexus

%post
echo "SemiNexus CLI installed successfully!"
echo "Run 'semi-nexus --help' to get started."
echo "Run 'semi-nexus init' to initialize configuration."

%preun
# Nothing needed

%postun
if [ $1 -eq 0 ]; then
    echo "SemiNexus CLI uninstalled."
fi

%changelog
* Sat Mar 29 2025 SemiNexus Team <team@seminexus.com> - %{version}
- Initial package for Rocky Linux 8.10
```

#### 4.3.2 Server RPM Spec
**packaging/rpm/server/semi-nexus-server.spec**
```spec
Name:           semi-nexus-server
Version:        %{version}
Release:        1%{?dist}
Summary:        SemiNexus Server - Agent Capability Hub Backend

License:        MIT
URL:            https://github.com/tomyyy2/semi-nexus-cli
BuildArch:      x86_64
Requires:       glibc >= 2.28
Requires(post): systemd
Requires(preun): systemd
Requires(postun): systemd

%description
SemiNexus Server provides the backend services for the Agent Capability Hub:
- Capability registry and management
- User authentication (Local, LDAP, AD)
- Security scanning
- Audit logging
- Admin management

%prep
%setup -q

%build
# Binary already built

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/opt/semi-nexus-server
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/etc/sysconfig
mkdir -p %{buildroot}/etc/semi-nexus
mkdir -p %{buildroot}/var/lib/semi-nexus
mkdir -p %{buildroot}/var/log/semi-nexus
mkdir -p %{buildroot}/usr/lib/systemd/system

# Install binary
install -m 0755 dist/index.js %{buildroot}/opt/semi-nexus-server/
ln -sf /opt/semi-nexus-server/index.js %{buildroot}/usr/bin/semi-nexus-server

# Install systemd service
install -m 0644 semi-nexus-server.service %{buildroot}/usr/lib/systemd/system/

# Install default config
install -m 0644 packaging/config/server-default.yaml %{buildroot}/etc/semi-nexus/config.yaml

# Install sysconfig
install -m 0644 packaging/sysconfig/semi-nexus-server %{buildroot}/etc/sysconfig/semi-nexus-server

%pre
getent group semi-nexus >/dev/null || groupadd -r semi-nexus
getent passwd semi-nexus >/dev/null || \
    useradd -r -g semi-nexus -d /var/lib/semi-nexus -s /sbin/nologin \
    -c "SemiNexus Server" semi-nexus
exit 0

%post
%systemd_post semi-nexus-server.service
chown -R semi-nexus:semi-nexus /var/lib/semi-nexus /var/log/semi-nexus
chmod 750 /var/lib/semi-nexus /var/log/semi-nexus

echo ""
echo "=========================================="
echo "SemiNexus Server installed successfully!"
echo "=========================================="
echo ""
echo "Configuration: /etc/semi-nexus/config.yaml"
echo "Data directory: /var/lib/semi-nexus"
echo "Log directory: /var/log/semi-nexus"
echo ""
echo "To start the server:"
echo "  systemctl enable semi-nexus-server"
echo "  systemctl start semi-nexus-server"
echo ""
echo "IMPORTANT: Set JWT_SECRET environment variable before starting!"
echo "  export JWT_SECRET='your-secure-secret'"
echo ""

%preun
%systemd_preun semi-nexus-server.service

%postun
%systemd_postun semi-nexus-server.service
if [ $1 -eq 0 ]; then
    userdel semi-nexus 2>/dev/null || true
    groupdel semi-nexus 2>/dev/null || true
fi

%files
%defattr(-,root,root,-)
%dir %attr(0750,semi-nexus,semi-nexus) /var/lib/semi-nexus
%dir %attr(0750,semi-nexus,semi-nexus) /var/log/semi-nexus
%dir /etc/semi-nexus
%config(noreplace) /etc/semi-nexus/config.yaml
%config /etc/sysconfig/semi-nexus-server
/usr/bin/semi-nexus-server
/opt/semi-nexus-server/*
/usr/lib/systemd/system/semi-nexus-server.service

%changelog
* Sat Mar 29 2025 SemiNexus Team <team@seminexus.com> - %{version}
- Initial package for Rocky Linux 8.10
```

### 4.4 GitHub Actions CI/CD

#### 4.4.1 主工作流
**.github/workflows/release.yml**
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version (e.g., 0.1.0)'
        required: true

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run tests
        run: npm test

      - name: Run E2E tests
        run: npm run test:e2e

  build-binaries:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Build binaries
        run: |
          chmod +x packaging/scripts/build-binaries.sh
          ./packaging/scripts/build-binaries.sh ${{ github.event.inputs.version || github.ref_name }}

      - name: Upload binaries
        uses: actions/upload-artifact@v4
        with:
          name: binaries
          path: packaging/bin/*
          retention-days: 7

  build-rpm:
    needs: test
    runs-on: rockylinux:8
    container:
      image: rockylinux:8.10
    steps:
      - uses: actions/checkout@v4

      - name: Install build tools
        run: |
          dnf install -y rpm-build rpmdevtools nodejs npm

      - name: Build RPM packages
        run: |
          chmod +x packaging/scripts/build-rpm.sh
          ./packaging/scripts/build-rpm.sh ${{ github.event.inputs.version || github.ref_name }}

      - name: Upload RPM packages
        uses: actions/upload-artifact@v4
        with:
          name: rpm-packages
          path: |
            packaging/rpm/cli/*.rpm
            packaging/rpm/server/*.rpm
          retention-days: 7

  build-deb:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install build tools
        run: |
          sudo apt-get update
          sudo apt-get install -y dpkg-dev fakeroot

      - name: Build DEB packages
        run: |
          chmod +x packaging/scripts/build-deb.sh
          ./packaging/scripts/build-deb.sh ${{ github.event.inputs.version || github.ref_name }}

      - name: Upload DEB packages
        uses: actions/upload-artifact@v4
        with:
          name: deb-packages
          path: |
            packaging/deb/cli/*.deb
            packaging/deb/server/*.deb
          retention-days: 7

  build-docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Server image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.server
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/server:latest
            ghcr.io/${{ github.repository }}/server:${{ github.event.inputs.version || github.ref_name }}

      - name: Build and push CLI image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.cli
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/cli:latest
            ghcr.io/${{ github.repository }}/cli:${{ github.event.inputs.version || github.ref_name }}

  release:
    needs: [build-binaries, build-rpm, build-deb, build-docker]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Prepare release assets
        run: |
          mkdir -p release
          cp artifacts/binaries/* release/
          cp artifacts/rpm-packages/* release/
          cp artifacts/deb-packages/* release/

      - name: Generate release notes
        id: notes
        run: |
          VERSION=${{ github.ref_name }}
          cat > release_notes.md << EOF
          ## SemiNexus CLI ${VERSION}

          ### Downloads

          #### CLI Binary
          | Platform | File |
          |----------|------|
          | Linux (x64) | semi-nexus-linux |
          | Windows (x64) | semi-nexus-win.exe |
          | macOS (x64) | semi-nexus-macos |

          #### Server Binary
          | Platform | File |
          |----------|------|
          | Linux (x64) | semi-nexus-server-linux |
          | Windows (x64) | semi-nexus-server-win.exe |
          | macOS (x64) | semi-nexus-server-macos |

          #### Rocky Linux 8.10 RPM
          | Package | File |
          |---------|------|
          | CLI | semi-nexus-cli-${VERSION}-1.el8.x86_64.rpm |
          | Server | semi-nexus-server-${VERSION}-1.el8.x86_64.rpm |

          #### Ubuntu/Debian
          | Package | File |
          |---------|------|
          | CLI | semi-nexus-cli_${VERSION}_amd64.deb |
          | Server | semi-nexus-server_${VERSION}_amd64.deb |

          ### Installation

          #### Rocky Linux 8.10
          \`\`\`bash
          # CLI
          sudo dnf install ./semi-nexus-cli-${VERSION}-1.el8.x86_64.rpm

          # Server
          sudo dnf install ./semi-nexus-server-${VERSION}-1.el8.x86_64.rpm
          sudo systemctl enable semi-nexus-server
          sudo systemctl start semi-nexus-server
          \`\`\`

          #### Standalone Binary
          \`\`\`bash
          # Linux
          curl -LO https://github.com/${{ github.repository }}/releases/download/${VERSION}/semi-nexus-linux
          chmod +x semi-nexus-linux
          ./semi-nexus-linux init
          \`\`\`

          ### Docker Images
          \`\`\`bash
          docker pull ghcr.io/${{ github.repository }}/server:${VERSION}
          docker pull ghcr.io/${{ github.repository }}/cli:${VERSION}
          \`\`\`
          EOF

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: release_notes.md
          files: release/*
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 4.4.2 CI 工作流
**.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e

  build:
    needs: [lint, test-unit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### 4.5 发布流程

#### 4.5.1 手动发布步骤
```bash
# 1. 更新版本号
npm version patch|minor|major

# 2. 推送 tag
git push origin --tags

# 3. GitHub Actions 自动构建并发布
# 或手动触发 workflow

# 4. 本地构建测试
./packaging/scripts/build-all.sh 0.1.0
```

#### 4.5.2 发布检查清单
- [ ] 所有测试通过
- [ ] 版本号已更新 (package.json, server/package.json)
- [ ] CHANGELOG.md 已更新
- [ ] 文档已更新
- [ ] Git tag 已创建
- [ ] GitHub Release 已创建

### 4.6 安装指南

#### 4.6.1 Rocky Linux 8.10 安装

**CLI 安装:**
```bash
# 方式一：RPM 包
sudo dnf install -y https://github.com/tomyyy2/semi-nexus-cli/releases/download/v0.1.0/semi-nexus-cli-0.1.0-1.el8.x86_64.rpm

# 方式二：独立二进制
curl -LO https://github.com/tomyyy2/semi-nexus-cli/releases/download/v0.1.0/semi-nexus-linux
chmod +x semi-nexus-linux
sudo mv semi-nexus-linux /usr/local/bin/semi-nexus
```

**Server 安装:**
```bash
# 方式一：RPM 包
sudo dnf install -y https://github.com/tomyyy2/semi-nexus-cli/releases/download/v0.1.0/semi-nexus-server-0.1.0-1.el8.x86_64.rpm

# 配置环境变量
sudo tee /etc/sysconfig/semi-nexus-server << EOF
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)
EOF

# 启动服务
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server

# 方式二：独立二进制
curl -LO https://github.com/tomyyy2/semi-nexus-cli/releases/download/v0.1.0/semi-nexus-server-linux
chmod +x semi-nexus-server-linux
./semi-nexus-server-linux
```

---

## 实施计划时间线

### 第 1 周：P0 安全修复
- Day 1-2: 安全问题修复（密码、JWT）
- Day 3-4: LDAP 认证实现
- Day 5: CLI login 实现

### 第 2 周：P0 核心功能
- Day 1-3: CLI 与 Server API 集成
- Day 4-5: 所有 commands 实现完善

### 第 3 周：P1 功能完善
- Day 1-2: 输入验证与安全加固
- Day 3: 错误处理统一
- Day 4: 日志系统完善
- Day 5: Docker 优化

### 第 4 周：P2 E2E 测试框架
- Day 1: 测试架构搭建
- Day 2-3: Server 端 E2E 测试
- Day 4-5: CLI 端 E2E 测试

### 第 5 周：P2 E2E 测试完善
- Day 1-2: 集成测试
- Day 3: 完整工作流测试
- Day 4-5: 测试覆盖率优化

### 第 6 周：P3 Release 发布
- Day 1: 构建脚本重构
- Day 2: RPM/DEB Spec 文件完善
- Day 3: GitHub Actions CI/CD 配置
- Day 4: Docker 镜像优化
- Day 5: 发布流程测试与文档

---

## 验收标准

### 安全验收
- [ ] 无硬编码密码
- [ ] JWT Secret 必须从环境变量获取
- [ ] LDAP 认证功能完整
- [ ] 所有 API 有认证保护
- [ ] 输入验证覆盖所有接口

### 功能验收
- [ ] CLI 所有命令功能完整
- [ ] CLI 与 Server 正常通信
- [ ] 离线模式可用
- [ ] 多 Agent 同步正常

### 测试验收
- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试覆盖所有功能点
- [ ] 所有测试通过
- [ ] CI/CD 集成完成

### Release 验收
- [ ] Rocky Linux 8.10 RPM 包构建成功 (CLI + Server)
- [ ] 独立二进制文件构建成功 (Linux/Windows/macOS)
- [ ] Docker 镜像构建成功
- [ ] GitHub Actions CI/CD 流程完整
- [ ] GitHub Release 自动发布
- [ ] 安装文档完整

---

## 文件变更清单

### 新增文件
```
server/src/middleware/validator.ts
server/src/middleware/rateLimit.ts
server/src/middleware/errorHandler.ts
server/src/services/logger.ts
src/utils/error.ts
tests/e2e/setup/test-server.ts
tests/e2e/setup/test-cli.ts
tests/e2e/setup/fixtures.ts
tests/e2e/setup/jest.setup.ts
tests/e2e/server/auth.e2e.test.ts
tests/e2e/server/capabilities.e2e.test.ts
tests/e2e/server/admin.e2e.test.ts
tests/e2e/server/security.e2e.test.ts
tests/e2e/server/ldap.e2e.test.ts
tests/e2e/cli/init.e2e.test.ts
tests/e2e/cli/login.e2e.test.ts
tests/e2e/cli/search.e2e.test.ts
tests/e2e/cli/subscribe.e2e.test.ts
tests/e2e/cli/install.e2e.test.ts
tests/e2e/cli/sync.e2e.test.ts
tests/e2e/cli/upgrade.e2e.test.ts
tests/e2e/cli/uninstall.e2e.test.ts
tests/e2e/cli/full-workflow.e2e.test.ts
tests/e2e/integration/cli-server.e2e.test.ts
tests/e2e/integration/multi-user.e2e.test.ts
tests/e2e/integration/agent-sync.e2e.test.ts
tests/utils/mock-server.ts
tests/utils/mock-ldap.ts
tests/utils/test-helpers.ts
packaging/scripts/build-all.sh
packaging/scripts/build-binaries.sh
packaging/scripts/build-rpm.sh
packaging/scripts/build-deb.sh
packaging/scripts/release.sh
packaging/rpm/cli/semi-nexus-cli.spec
packaging/rpm/server/semi-nexus-server.spec
packaging/deb/cli/control
packaging/deb/server/control
packaging/systemd/semi-nexus-server.service
packaging/config/server-default.yaml
packaging/sysconfig/semi-nexus-server
packaging/completion/semi-nexus.bash
.github/workflows/ci.yml
.github/workflows/release.yml
Dockerfile.server
CHANGELOG.md
```

### 修改文件
```
server/src/index.ts
server/src/services/auth.ts
server/src/routes/auth.ts
server/src/routes/admin.ts
server/src/routes/capabilities.ts
src/api/client.ts
src/commands/login.ts
src/commands/logout.ts
src/commands/init.ts
src/commands/search.ts
src/commands/subscribe.ts
src/commands/install.ts
src/commands/sync.ts
Dockerfile
Dockerfile.cli
docker-compose.yml
package.json
server/package.json
jest.config.js
scripts/build-bin.sh
scripts/build-packages.sh
packaging/spec/semi-nexus-cli.spec
packaging/semi-nexus-server.service
```
