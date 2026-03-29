# SemiNexus CLI 用户指南

## 目录

- [快速开始](#快速开始)
- [安装](#安装)
- [配置](#配置)
- [命令参考](#命令参考)
- [离线使用](#离线使用)
- [故障排查](#故障排查)

---

## 快速开始

### 1. 下载 CLI

从 [GitHub Releases](https://github.com/tomyyy2/semi-nexus-cli/releases) 下载对应平台的二进制文件：

| 平台 | 下载 |
|------|------|
| Linux | `semi-nexus-linux` |
| Windows | `semi-nexus-win.exe` |
| macOS | `semi-nexus-macos` |

```bash
# Linux/macOS
chmod +x semi-nexus-linux
./semi-nexus-linux --help

# Windows
semi-nexus-win.exe --help
```

### 2. 初始化

```bash
# 初始化配置
./semi-nexus init --server http://your-server:3000
```

### 3. 登录

```bash
# 交互式登录
./semi-nexus login

# 或使用 API Key
./semi-nexus login --apikey snx_your_api_key_here
```

### 4. 使用

```bash
# 搜索能力
./semi-nexus search "rtl review"

# 订阅
./semi-nexus subscribe rtl-review-copilot

# 安装
./semi-nexus install rtl-review-copilot

# 查看已安装
./semi-nexus list

# 同步到 Agent
./semi-nexus sync
```

---

## 安装

### 二进制安装 (推荐)

下载对应平台的二进制文件，赋予执行权限即可：

```bash
# Linux
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest/semi-nexus-linux -o semi-nexus
chmod +x semi-nexus

# Windows - 直接下载 exe 文件
# https://github.com/tomyyy2/semi-nexus-cli/releases/latest/semi-nexus-win.exe

# macOS
curl -fsSL https://github.com/tomyyy2/semi-nexus-cli/releases/latest/semi-nexus-macos -o semi-nexus
chmod +x semi-nexus
```

### 源码编译

需要 Node.js 18+：

```bash
git clone https://github.com/tomyyy2/semi-nexus-cli.git
cd semi-nexus-cli

npm install
npm run build

# 直接运行
node dist/index.js --help

# 或全局安装
npm install -g
```

---

## 配置

### 配置文件位置

- Linux/macOS: `~/.semi-nexus/`
- Windows: `%USERPROFILE%\.semi-nexus\`

### config.yaml 结构

```yaml
server:
  url: http://your-server:3000
  timeout: 30000

auth:
  token: ""
  username: ""
  expiresAt: ""

install:
  baseDir: ~/.semi-nexus
  skillsDir: ~/.semi-nexus/skills
  mcpDir: ~/.semi-nexus/mcp
  agentsDir: ~/.semi-nexus/agents
  cacheDir: ~/.semi-nexus/cache

agents:
  claude-code:
    enabled: true
    installPath: ~/.claude/skills
    syncMode: symlink
  opencode:
    enabled: true
    installPath: ~/.opencode/skills
    syncMode: symlink
  openclaw:
    enabled: false
    installPath: ~/.openclaw/plugins
    syncMode: copy

logging:
  level: info
  file: ~/.semi-nexus/logs/cli.log
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SEMI_NEXUS_SERVER` | Server 地址 | - |
| `SEMI_NEXUS_TOKEN` | 认证 Token | - |
| `SEMI_NEXUS_APIKEY` | API Key | - |
| `SEMI_NEXUS_DATA_DIR` | 数据目录 | `~/.semi-nexus` |

---

## 命令参考

### init

初始化配置文件。

```bash
semi-nexus init [options]

Options:
  --server <url>    Server 地址
  --force           强制重新初始化
```

### login

登录认证。

```bash
semi-nexus login [options]

Options:
  --username <name>  用户名
  --apikey <key>     API Key
  --token <token>    Access Token
```

### search

搜索能力。

```bash
semi-nexus search <query> [options]

Options:
  --type <type>     按类型过滤 (skill/mcp/agent)
  --tag <tag>       按标签过滤
```

### subscribe

订阅能力。

```bash
semi-nexus subscribe <name> [options]

Options:
  --version <ver>    指定版本
```

### install

安装能力。

```bash
semi-nexus install <name> [options]

Options:
  --version <ver>    指定版本
  --force            强制重装
```

### sync

同步到 Agent 环境。

```bash
semi-nexus sync [options]

Options:
  --to <agent>       同步到指定 Agent (claude-code/opencode/openclaw)
  --mode <mode>      同步模式 (symlink/copy)
```

### list

列出已安装的能力。

```bash
semi-nexus list [options]

Options:
  --installed        只显示已安装
  --subscriptions     显示订阅
```

### uninstall

卸载能力。

```bash
semi-nexus uninstall <name>
```

### upgrade

升级能力。

```bash
semi-nexus upgrade [name] [options]

Options:
  --version <ver>    指定版本
```

### status

查看连接状态。

```bash
semi-nexus status
```

### info

查看能力详情。

```bash
semi-nexus info <name>
```

---

## 离线使用

### 工作原理

1. **在线时**：从 Server 下载能力到本地缓存
2. **离线时**：从本地缓存读取已安装的能力

### 离线操作

```bash
# 确认已登录 (Token/API Key 会保存到本地)
./semi-nexus login --apikey your_api_key

# 搜索和订阅 (需要联网)
./semi-nexus search "rtl"
./semi-nexus subscribe rtl-review

# 安装到本地 (需要联网)
./semi-nexus install rtl-review

# 离线使用
./semi-nexus list          # 查看已安装
./semi-nexus sync          # 同步到 Agent
```

### 本地缓存

```
~/.semi-nexus/
├── registry-cache.json   # 能力列表缓存
├── subscriptions.json     # 订阅记录
├── installed.json         # 已安装能力
└── skills/              # 能力文件
```

---

## 故障排查

### 常见问题

#### 1. 连接 Server 失败

```bash
# 检查 Server 地址
semi-nexus status

# 重新配置
semi-nexus init --server http://correct-server:3000
```

#### 2. 认证失败

```bash
# 检查登录状态
semi-nexus status

# 重新登录
semi-nexus logout
semi-nexus login
```

#### 3. 同步失败

```bash
# 检查 Agent 是否安装
ls ~/.claude/skills   # Claude Code
ls ~/.opencode/skills  # OpenCode

# 手动指定 Agent
semi-nexus sync --to claude-code
```

#### 4. 权限问题 (Linux/macOS)

```bash
# 修复配置目录权限
chmod 700 ~/.semi-nexus
chmod 600 ~/.semi-nexus/config.yaml
```

### 日志

```bash
# 查看日志
cat ~/.semi-nexus/logs/cli.log

# Linux/macOS journalctl
journalctl -u semi-nexus-cli -f
```

### 获取帮助

```bash
# 查看帮助
semi-nexus --help
semi-nexus <command> --help

# 查看版本
semi-nexus --version
```