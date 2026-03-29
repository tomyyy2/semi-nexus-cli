# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 支持离线用户通过 Server 中转获取互联网上的能力。

## 项目结构

```
semi-nexus-cli/
├── server/               # Server 端
├── src/                  # CLI 端
├── scripts/             # 构建脚本
├── packaging/           # 打包配置
├── docs/               # 文档
└── docker-compose.yml   # Docker 部署
```

## 组件

### 1. CLI 工具 (src/)

纯命令行工具，用于用户和管理员。

### 2. Server 端 (server/)

服务端组件，提供 API 和管理功能。

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

## 部署方式

### Docker Compose (推荐)

```bash
# 启动 Server
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### RPM 包 (RedHat/CentOS)

```bash
sudo rpm -ivh semi-nexus-server-0.1.0-1.el8.x86_64.rpm
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server
```

### DEB 包 (Debian/Ubuntu)

```bash
sudo dpkg -i semi-nexus-server_0.1.0_amd64.deb
sudo apt-get install -f
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server
```

### 手动安装

```bash
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest -o semi-nexus-server.tar.gz
tar -xzf semi-nexus-server.tar.gz
cd semi-nexus-server
sudo cp -r . /opt/semi-nexus-server
sudo ln -s /opt/semi-nexus-server/bin/semi-nexus-server /usr/local/bin/
sudo cp semi-nexus-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable semi-nexus-server
sudo systemctl start semi-nexus-server
```

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      企业内网环境                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SemiNexus Server                         │  │
│  │  • Auth (本地/LDAP/AD/API Key)                      │  │
│  │  • Registry (能力注册表)                             │  │
│  │  • Scanner (安全扫描)                               │  │
│  │  • Audit (审计日志)                                 │  │
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

## CLI 命令

| 命令 | 功能 |
|------|------|
| `init` | 初始化配置 |
| `login` | 登录 (Token/API Key) |
| `search <query>` | 搜索能力 |
| `subscribe <name>` | 订阅能力 |
| `install <name>` | 安装能力 |
| `sync` | 同步到 Agent |
| `list` | 列出已安装 |

## Server API

| 端点 | 功能 |
|------|------|
| `POST /api/v1/auth/login` | 登录 |
| `POST /api/v1/auth/apikey` | 创建 API Key |
| `GET /api/v1/capabilities` | 搜索能力 |
| `POST /api/v1/capabilities/:id/subscribe` | 订阅 |
| `POST /api/v1/admin/capabilities/:id/scan` | 安全扫描 |
| `POST /api/v1/admin/capabilities/:id/approve` | 审核发布 |

## 构建

```bash
# CLI 包
./scripts/build-cli-packages.sh 0.1.0

# Server 包
./scripts/build-packages.sh 0.1.0

# Docker 镜像
docker build -t semi-nexus-server -f server/Dockerfile server/
docker build -t semi-nexus-cli -f Dockerfile.cli .
```

## 测试

```bash
# CLI 测试
npm test

# Server 测试
cd server && npm test
```

## 文档

- [部署指南](./docs/deployment.md)
- [CLI 设计](./docs/design.md)

## License

MIT