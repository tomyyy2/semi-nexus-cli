# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 支持离线用户通过 Server 中转获取互联网上的能力。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 简介

SemiNexus CLI 是一个纯命令行的 Agent 能力管理工具，帮助企业实现：

- 🔗 **能力中转** - 离线用户通过 Server 获取互联网上的能力
- 🔐 **安全管控** - Server 端统一采集、扫描、审核
- 🔄 **多端同步** - 支持 Claude Code、OpenCode、OpenClaw

## 快速开始

### 1. 下载 CLI

```bash
# Linux
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest/semi-nexus-linux -o semi-nexus
chmod +x semi-nexus

# Windows - 下载 semi-nexus-win.exe

# macOS
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest/semi-nexus-macos -o semi-nexus
chmod +x semi-nexus
```

### 2. 配置 Server

```bash
./semi-nexus init --server http://your-server:3000
```

### 3. 登录

```bash
./semi-nexus login
# 或使用 API Key
./semi-nexus login --apikey snx_your_api_key
```

### 4. 使用

```bash
./semi-nexus search "rtl"           # 搜索能力
./semi-nexus subscribe rtl-review   # 订阅
./semi-nexus install rtl-review     # 安装
./semi-nexus sync                   # 同步到 Agent
```

## 文档

| 文档 | 说明 |
|------|------|
| [用户指南](docs/user-guide.md) | CLI 使用说明 |
| [设计文档](docs/design.md) | 架构和技术设计 |
| [部署指南](docs/deployment.md) | Server 部署说明 |

## 架构

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

## 命令

### 用户命令

| 命令 | 说明 |
|------|------|
| `init` | 初始化配置 |
| `login` | 登录认证 |
| `search <query>` | 搜索能力 |
| `subscribe <name>` | 订阅能力 |
| `install <name>` | 安装能力 |
| `sync` | 同步到 Agent |
| `list` | 列出已安装 |
| `upgrade [name]` | 升级能力 |
| `uninstall <name>` | 卸载能力 |
| `info <name>` | 能力详情 |
| `status` | 连接状态 |

### 管理员命令

| 命令 | 说明 |
|------|------|
| `admin collect` | 采集能力 |
| `admin scan <id>` | 安全扫描 |
| `admin approve <id>` | 审核发布 |
| `admin user list` | 用户列表 |
| `admin user create-apikey` | 创建 API Key |

## Server 部署

### Docker (推荐)

```bash
docker-compose up -d
```

### RPM/DEB

```bash
# RPM
sudo rpm -ivh semi-nexus-server-0.1.0-1.el8.x86_64.rpm

# DEB
sudo dpkg -i semi-nexus-server_0.1.0_amd64.deb
```

### 手动安装

```bash
# 下载
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest -o semi-nexus-server.tar.gz
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

## 项目结构

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

## 开发

### 环境要求

- Node.js 18+
- npm 9+

### 构建

```bash
# CLI
npm install
npm test
npm run build

# Server
cd server
npm install
npm test
npm run build
```

### 打包 CLI

```bash
# 需要安装 pkg
npm install pkg --save-dev

# 构建跨平台二进制
./scripts/build-bin.sh 0.1.0
```

## API

### Server 地址

部署后 Server 默认运行在 `http://localhost:3000`

### 认证

```bash
# 登录
POST /api/v1/auth/login
Body: { "username": "admin", "password": "admin123" }

# 创建 API Key
POST /api/v1/auth/apikey
Header: Authorization: Bearer <token>
Body: { "name": "My Workstation" }
```

### 能力

```bash
# 搜索
GET /api/v1/capabilities?query=rtl

# 详情
GET /api/v1/capabilities/:id

# 订阅
POST /api/v1/capabilities/:id/subscribe
Header: Authorization: Bearer <token>
```

## License

MIT