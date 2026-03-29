# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 支持离线用户通过 Server 中转获取互联网上的能力。

## 项目结构

```
semi-nexus-cli/
├── server/               # Server 端 (SemiNexus Server)
│   ├── src/
│   │   ├── services/    # Auth, Registry, Scanner, Audit
│   │   ├── routes/      # API 路由
│   │   └── middleware/   # 认证中间件
│   └── README.md
│
├── src/                  # CLI 端
│   ├── api/             # Client API, Registry, Agents
│   ├── commands/         # CLI 命令
│   └── __tests__/        # 测试
│
└── README.md
```

## 组件

### 1. CLI 工具 (src/)

纯命令行工具，用于用户和管理员。

```bash
# 用户命令
semi-nexus init --server http://server:3000
semi-nexus login --apikey <key>
semi-nexus search "rtl"
semi-nexus subscribe rtl-review
semi-nexus install rtl-review
semi-nexus sync
```

### 2. Server 端 (server/)

服务端组件，提供 API 和管理功能。

```bash
cd server
npm install
npm run dev
# 启动在 http://localhost:3000
```

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      企业内网环境                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SemiNexus Server                         │  │
│  │  • Auth (本地/LDAP/AD/API Key)                       │  │
│  │  • Registry (能力注册表)                             │  │
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
  │ CLI       │      │ CLI       │      │ CLI       │
  └───────────┘      └───────────┘      └───────────┘
```

## 快速开始

### 1. 启动 Server

```bash
cd server
npm install
npm run dev
```

默认管理员: `admin` / `admin123`

### 2. 配置 CLI

```bash
npm install -g .
semi-nexus init --server http://localhost:3000
semi-nexus login
```

### 3. 使用 CLI

```bash
# 搜索能力
semi-nexus search "rtl"

# 订阅并安装
semi-nexus subscribe rtl-review-copilot
semi-nexus install rtl-review-copilot
semi-nexus sync
```

## 功能列表

### CLI 命令

| 命令 | 功能 |
|------|------|
| `init` | 初始化配置 |
| `login` | 登录 (Token/API Key) |
| `search <query>` | 搜索能力 |
| `subscribe <name>` | 订阅能力 |
| `install <name>` | 安装能力 |
| `sync` | 同步到 Agent |
| `list` | 列出已安装 |

### Server API

| 端点 | 功能 |
|------|------|
| `POST /api/v1/auth/login` | 登录 |
| `POST /api/v1/auth/apikey` | 创建 API Key |
| `GET /api/v1/capabilities` | 搜索能力 |
| `POST /api/v1/capabilities/:id/subscribe` | 订阅 |
| `POST /api/v1/admin/capabilities/:id/scan` | 安全扫描 |
| `POST /api/v1/admin/capabilities/:id/approve` | 审核发布 |

## 测试

```bash
# CLI 测试
npm test

# Server 测试
cd server && npm test
```

## License

MIT