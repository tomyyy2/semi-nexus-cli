# SemiNexus CLI

**纯命令行的 Agent 能力中转工具** - 不依赖 Web UI，直接通过命令行管理 AI Agent 的 Skills、MCP、Agents 等能力。

## 核心功能

- 🎯 **独立 CLI** - 不需要 Web 服务即可工作
- 🔄 **本地注册表** - JSON 文件存储，无需服务端
- 📦 **能力安装** - 创建 manifest.json 和 README
- 🔗 **多端同步** - 支持 Claude Code、OpenCode、OpenClaw
- 💾 **订阅管理** - 本地持久化订阅记录
- 🔍 **能力搜索** - 按名称、类型、标签搜索

## 快速开始

```bash
# 安装
npm install -g semi-nexus-cli

# 初始化
semi-nexus init

# 搜索能力
semi-nexus search "rtl"

# 订阅
semi-nexus subscribe rtl-review-copilot

# 安装
semi-nexus install rtl-review-copilot

# 同步到 Agent
semi-nexus sync

# 查看已安装
semi-nexus list
```

## 命令列表

| 命令 | 功能 |
|------|------|
| `init` | 初始化配置 (~/.semi-nexus/) |
| `login` | 登录认证 |
| `logout` | 登出 |
| `search <query>` | 搜索能力 |
| `subscribe <name>` | 订阅能力 |
| `install <name>` | 安装能力 |
| `sync` | 同步到 Agent 环境 |
| `list` | 列出已安装 |
| `upgrade [name]` | 升级能力 |
| `uninstall <name>` | 卸载能力 |
| `info <name>` | 能力详情 |
| `status` | 连接状态 |

## 数据存储

本地数据存储在 `~/.semi-nexus/` 目录：

```
~/.semi-nexus/
├── config.yaml         # 配置文件
├── registry.json       # 能力注册表 (默认内置)
├── subscriptions.json  # 订阅记录
├── installed.json     # 已安装能力
└── skills/            # 能力安装目录
```

## 支持的 Agent

| Agent | 安装路径 | 同步模式 |
|-------|------|---------|
| Claude Code | `~/.claude/skills/` | symlink/copy |
| OpenCode | `~/.opencode/skills/` | symlink/copy |
| OpenClaw | `~/.openclaw/plugins/` | copy |

## 开发

```bash
npm install
npm test           # 运行测试 (37 tests)
npm run typecheck  # 类型检查
npm run lint       # 代码检查
npm run build      # 构建
```

## 本地 CI (Docker)

```bash
docker build -t semi-nexus-cli .
docker run semi-nexus-cli npm test
```

## 项目结构

```
semi-nexus-cli/
├── src/
│   ├── api/
│   │   ├── agents.ts      # Agent 检测
│   │   ├── client.ts     # API 客户端
│   │   └── registry.ts   # 本地注册表
│   ├── commands/
│   │   ├── init.ts
│   │   ├── search.ts
│   │   ├── subscribe.ts
│   │   ├── install.ts
│   │   ├── sync.ts
│   │   └── ...
│   └── __tests__/        # 测试
├── docs/
│   └── design.md         # 设计文档
└── Dockerfile
```

## License

MIT