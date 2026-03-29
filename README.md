# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 支持离线用户通过 Server 中转获取互联网上的能力。

## 核心功能

- 🎯 **独立 CLI** - 不需要 Web UI，直接命令行操作
- 🔄 **Server-Client 架构** - 支持离线用户场景
- 🔐 **身份鉴权** - 支持 LDAP/AD、API Key/Token
- 📦 **能力中转** - Server 采集互联网能力，过滤后提供给用户
- 🔍 **安全扫描** - 能力发布前经过安全扫描
- 🔗 **多端同步** - 支持 Claude Code、OpenCode、OpenClaw

## 架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                      企业内网环境                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SemiNexus Server                        │   │
│  │  • 认证服务 (LDAP/AD/API Key)                            │   │
│  │  • 能力注册表                                            │   │
│  │  • 安全扫描                                              │   │
│  │  • 能力存储                                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │ 离线用户  │        │ 在线用户  │        │  管理员   │
    │           │        │           │        │           │
    │ • 搜索    │        │ • 搜索    │        │ • 采集    │
    │ • 订阅    │        │ • 订阅    │        │ • 扫描    │
    │ • 安装    │        │ • 安装    │        │ • 发布    │
    │ • 同步    │        │ • 同步    │        │ • 用户管  │
    └───────────┘        └───────────┘        └───────────┘
```

## 快速开始

### 管理员

```bash
# 1. 部署 Server (参考 Server 部署文档)

# 2. 初始化 CLI
semi-nexus init --server http://server:3000

# 3. 登录 (使用 LDAP 账号或本地用户)
semi-nexus login

# 4. 采集能力
semi-nexus admin collect --source github --query "rtl review"

# 5. 扫描能力
semi-nexus admin scan <capability-id>

# 6. 发布能力
semi-nexus admin approve <capability-id>

# 7. 用户管理
semi-nexus admin user list
semi-nexus admin user create-apikey <user-id>
```

### 用户

```bash
# 1. 初始化 CLI
semi-nexus init --server http://server:3000

# 2. 登录 (使用 API Key 或 Token)
semi-nexus login --apikey <your-api-key>

# 3. 搜索能力
semi-nexus search "rtl"

# 4. 订阅
semi-nexus subscribe rtl-review-copilot

# 5. 安装
semi-nexus install rtl-review-copilot

# 6. 同步到 Agent
semi-nexus sync

# 7. 离线时使用
# (已安装的能力可在离线环境使用)
```

## 命令列表

### 用户命令

| 命令 | 功能 |
|------|------|
| `init --server <url>` | 初始化配置 |
| `login` | 登录 (Token/API Key) |
| `logout` | 登出 |
| `search <query>` | 搜索能力 |
| `subscribe <name>` | 订阅能力 |
| `install <name>` | 安装能力 |
| `sync` | 同步到 Agent |
| `list` | 列出已安装 |
| `upgrade [name]` | 升级能力 |
| `uninstall <name>` | 卸载能力 |

### 管理员命令

| 命令 | 功能 |
|------|------|
| `admin collect` | 采集能力 |
| `admin scan <id>` | 安全扫描 |
| `admin approve <id>` | 审核发布 |
| `admin user list` | 用户列表 |
| `admin user create-apikey` | 创建 API Key |
| `admin ldap sync` | LDAP 同步 |

## 认证方式

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| **API Key** | 用户创建 API Key 连接 Server | 离线环境 |
| **Token** | 登录后获取短期 Token | 在线环境 |
| **LDAP** | 企业 LDAP 认证 | 企业内网 |
| **AD 同步** | Active Directory 用户同步 | 企业环境 |

## 数据存储

### Server 端

```
/data/semi-nexus/
├── registry/           # 能力注册表
├── users/             # 用户数据
├── audit/             # 审计日志
└── scanner/           # 扫描缓存
```

### CLI 本地 (离线用户)

```
~/.semi-nexus/
├── config.yaml         # 配置文件
├── auth.json          # 认证信息
├── registry-cache.json # 能力缓存
├── subscriptions.json # 订阅记录
├── installed.json     # 已安装
└── skills/           # 能力目录
```

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

## 本地 CI (Docker)

```bash
docker build -t semi-nexus-cli .
docker run semi-nexus-cli npm test
```

## License

MIT