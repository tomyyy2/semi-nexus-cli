# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 支持离线用户通过 Server 中转获取互联网上的能力。

## 下载安装 (无需 Node.js)

### 直接下载可执行文件

| 平台 | 下载地址 | 命令 |
|------|---------|------|
| Linux x64 | [semi-nexus-linux](packaging/bin/semi-nexus-linux) | `curl -fsSL url -o semi-nexus && chmod +x semi-nexus` |
| Windows x64 | [semi-nexus-win.exe](packaging/bin/semi-nexus-win.exe) | 直接下载运行 |
| macOS x64 | [semi-nexus-macos](packaging/bin/semi-nexus-macos) | `curl -fsSL url -o semi-nexus && chmod +x semi-nexus` |

### 构建自己的 bin

```bash
# 克隆
git clone https://github.com/tomyyy2/semi-nexus-cli.git
cd semi-nexus-cli

# 构建所有平台
./scripts/build-bin.sh 0.1.0

# 或分别构建
npm install pkg --save-dev
pkg . --targets node18-linux-x64 --output semi-nexus
```

## 快速开始

```bash
# 初始化
./semi-nexus init --server http://your-server:3000

# 登录
./semi-nexus login

# 搜索
./semi-nexus search "rtl"

# 订阅
./semi-nexus subscribe rtl-review-copilot

# 安装
./semi-nexus install rtl-review-copilot

# 同步到 Agent
./semi-nexus sync
```

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

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      企业内网环境                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              SemiNexus Server                         │  │
│  │  • Auth (本地/LDAP/AD/API Key)                      │  │
│  │  • Registry (能力注册表)                             │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌───────────┐      ┌───────────┐      ┌───────────┐
  │ 离线用户  │      │ 在线用户  │      │  管理员   │
  └───────────┘      └───────────┘      └───────────┘
```

## 项目结构

```
semi-nexus-cli/
├── server/               # Server 端
├── src/                  # CLI 源码
├── scripts/              # 构建脚本
│   └── build-bin.sh     # 打包成独立 bin
├── packaging/           # 打包输出
│   └── bin/            # 可执行文件
└── docs/               # 文档
```

## 开发

```bash
npm install
npm test
```

## License

MIT