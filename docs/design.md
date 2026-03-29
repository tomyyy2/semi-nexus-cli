# SemiNexus CLI 设计文档

## 1. 核心定位

**SemiNexus CLI** 是一个纯命令行的 Agent 能力中转工具，不依赖 Web UI，直接通过命令行管理 AI Agent 的 Skills、MCP、Agents 等能力。

## 2. 已实现功能

### 本地注册表 (LocalRegistry)

- JSON 文件存储在 `~/.semi-nexus/`
- 内置默认能力列表
- 支持搜索、订阅、安装记录

### Agent 检测 (AgentDetector)

- 自动检测 Claude Code、OpenCode、OpenClaw 是否安装
- 自动创建 skills/plugins 目录
- 支持 symlink 和 copy 两种同步模式

### 能力安装 (install)

- 验证订阅状态
- 创建 `manifest.json` 和 `README.md`
- 记录安装信息到 `installed.json`

### 同步到 Agent (sync)

- 支持 symlink（Windows 使用 junction）
- 支持 copy 模式
- 自动检测目标 Agent 环境

## 3. 数据存储

```
~/.semi-nexus/
├── config.yaml         # CLI 配置
├── registry.json       # 能力注册表（可选）
├── subscriptions.json  # 订阅记录
├── installed.json     # 已安装能力
└── skills/           # 能力安装目录
```

## 4. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户终端                                  │
│                                                                 │
│   $ semi-nexus <command> [options]                              │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SemiNexus CLI                               │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │  init   │  │ search  │  │install  │  │  sync   │           │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│        └────────────┴────────────┴────────────┘                  │
│                         │                                        │
│     ┌───────────────────┼───────────────────┐                   │
│     ▼                   ▼                   ▼                     │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐              │
│  │ Registry │    │  Agent    │    │   Storage    │              │
│  │ 本地注册表│    │ Detector  │    │  installed   │              │
│  └──────────┘    └───────────┘    └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Claude   │      │ OpenCode │      │ OpenClaw │
    │  Code    │      │          │      │          │
    └──────────┘      └──────────┘      └──────────┘
```

## 5. 命令列表

| 命令 | 功能 | 状态 |
|------|------|------|
| `init` | 初始化配置目录 | ✅ 完成 |
| `login` | 登录认证 | ✅ 完成 |
| `logout` | 登出 | ✅ 完成 |
| `search` | 搜索能力 | ✅ 完成 |
| `subscribe` | 订阅能力 | ✅ 完成 |
| `install` | 安装能力 | ✅ 完成 |
| `sync` | 同步到 Agent | ✅ 完成 |
| `list` | 列出已安装 | ✅ 完成 |
| `upgrade` | 升级能力 | ✅ 完成 |
| `uninstall` | 卸载能力 | ✅ 完成 |
| `info` | 能力详情 | ✅ 完成 |
| `status` | 连接状态 | ✅ 完成 |

## 6. 支持的 Agent

| Agent | 安装路径 | 同步模式 | 状态 |
|-------|---------|---------|------|
| Claude Code | `~/.claude/skills/` | symlink/copy | ✅ |
| OpenCode | `~/.opencode/skills/` | symlink/copy | ✅ |
| OpenClaw | `~/.openclaw/plugins/` | copy | ✅ |

## 7. 技术栈

- **TypeScript** - 主要开发语言
- **Node.js** - 运行时 (>=18)
- **Commander** - 命令行解析
- **Inquirer** - 交互式输入
- **fs-extra** - 文件系统操作
- **chalk** - 终端彩色输出
- **yaml** - YAML 配置
- **Jest** - 测试框架
- **Docker** - 本地 CI

## 8. 待完成功能

### 高优先级

- [ ] 从远程 Registry 下载真实能力包
- [ ] 真实的能力包解压和安装
- [ ] 订阅持久化到远程服务器（可选）

### 中优先级

- [ ] 采集层 Collector 集成
- [ ] 分析层 Analyzer 集成
- [ ] 打包层 Packager 集成
- [ ] 版本更新检查

### 低优先级

- [ ] Shell 自动补全
- [ ] 日志系统
- [ ] 代理配置