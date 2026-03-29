# SemiNexus Server

SemiNexus 的服务端组件，提供能力注册、用户认证、安全扫描等功能。

## 功能

- 🔐 **多方式认证** - 本地用户、LDAP、AD、API Key
- 📦 **能力管理** - 注册、搜索、订阅、下载
- 🔍 **安全扫描** - 代码安全、依赖风险、合规检查
- 📝 **审计日志** - 完整操作记录
- 👥 **用户管理** - 用户、角色、API Key

## 快速开始

### 安装

```bash
npm install
npm run build
```

### 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 默认配置

- 端口: 3000
- 数据目录: ~/.semi-nexus/server/
- 默认管理员: admin / admin123

## API 接口

### 认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 登录 |
| `/api/v1/auth/refresh` | POST | 刷新 Token |
| `/api/v1/auth/apikey` | POST | 创建 API Key |
| `/api/v1/auth/apikey` | GET | 列出 API Keys |
| `/api/v1/auth/me` | GET | 当前用户信息 |

### 能力

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/capabilities` | GET | 搜索能力 |
| `/api/v1/capabilities/:id` | GET | 能力详情 |
| `/api/v1/capabilities/:id/download` | GET | 下载能力包 |
| `/api/v1/capabilities/:id/subscribe` | POST | 订阅能力 |

### 管理 (需要 Admin)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/admin/capabilities` | POST | 创建能力 |
| `/api/v1/admin/capabilities/:id/scan` | POST | 触发扫描 |
| `/api/v1/admin/capabilities/:id/approve` | POST | 审核通过 |
| `/api/v1/admin/users` | GET | 用户列表 |
| `/api/v1/admin/users` | POST | 创建用户 |
| `/api/v1/admin/audit` | GET | 审计日志 |

## 数据存储

```
~/.semi-nexus/server/
├── users/               # 用户数据
├── registry/           # 能力注册表
│   ├── capabilities.json
│   └── packages/       # 能力包
└── audit/              # 审计日志
```

## 开发

```bash
npm install
npm test           # 运行测试 (13 tests)
npm run typecheck  # 类型检查
npm run build      # 构建
```

## Docker

```bash
docker build -t semi-nexus-server .
docker run -p 3000:3000 semi-nexus-server
```