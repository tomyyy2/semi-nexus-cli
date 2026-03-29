# SemiNexus CLI 易用性优化计划

## 问题分析

### 当前存在的易用性问题

| 问题 | 描述 | 影响 |
|------|------|------|
| 1. 入门步骤繁琐 | 需要先 `init` → `login` → `search` → `subscribe` → `install` → `sync`，步骤太多 | 新用户流失 |
| 2. 缺少交互式引导 | 新用户不知道从哪里开始 | 用户困惑 |
| 3. 订阅和安装分离 | 用户需要先 subscribe 再 install，逻辑冗余 | 操作繁琐 |
| 4. **能力生效不明确** | sync 后如何在 Agent 中真正使用能力？文档缺失 | 用户困惑 |
| 5. 错误提示不友好 | 错误信息技术性太强，缺少解决方案提示 | 用户挫败感 |
| 6. 缺少快速开始 | 没有一键式体验或快速开始命令 | 体验不流畅 |
| 7. 缺少推荐功能 | 没有热门/推荐能力展示 | 发现困难 |
| 8. 缺少命令补全 | 没有 shell 补全支持 | 效率低 |
| 9. 帮助信息不足 | 缺少示例和详细说明 | 学习成本高 |

### 关键问题：能力如何在 Agent 中生效？

#### 当前 sync 机制分析

```
semi-nexus install self-improving-agent
    ↓
安装到 ~/.semi-nexus/skills/self-improving-agent/
    ↓
semi-nexus sync
    ↓
同步到各 Agent 目录:
  - Claude Code: ~/.claude/skills/self-improving-agent/ (symlink)
  - OpenCode: ~/.opencode/skills/self-improving-agent/ (symlink)
  - OpenClaw: ~/.openclaw/plugins/self-improving-agent/ (copy)
    ↓
??? 如何在 Agent 中使用 ???
```

#### 各 Agent 能力加载机制

| Agent | 能力目录 | 加载机制 | 生效方式 |
|-------|---------|---------|---------|
| **Claude Code** | `~/.claude/skills/` | 自动扫描 `SKILL.md` 或 `skill.md` | 重启 Claude Code 或新会话 |
| **OpenCode** | `~/.opencode/skills/` | 自动扫描 `skill.md` | 重启 OpenCode |
| **OpenClaw** | `~/.openclaw/plugins/` | 需要在配置中启用 | 编辑 `config.yaml` |

#### 当前缺失

1. **没有验证能力是否正确安装** - sync 后不检查文件完整性
2. **没有提示用户如何使用** - 不知道能力已可用
3. **没有 Agent 特定配置** - 某些 Agent 需要额外配置
4. **没有验证能力是否生效** - 无法确认 Agent 是否识别

## 优化方案

### Phase 1: 简化入门流程

#### 1.1 添加 `quickstart` 命令
- 一键完成 init + login + 推荐能力安装 + sync
- 交互式引导新用户完成首次体验
- 自动检测 Agent 环境并给出建议

#### 1.2 优化 `init` 命令
- 自动检测服务器连接
- 提供默认服务器列表选择
- 自动创建 API Key 选项

#### 1.3 合并 subscribe + install
- `install` 命令自动订阅（如果未订阅）
- 添加 `--auto-subscribe` 选项
- 减少用户操作步骤

### Phase 2: 改进交互体验

#### 2.1 添加交互式搜索
- `search` 无参数时进入交互模式
- 支持上下键选择、回车查看详情
- 支持直接安装选中的能力

#### 2.2 添加推荐命令
- `recommend` 或 `discover` 命令
- 展示热门能力、新上架、编辑精选
- 按用户兴趣推荐

#### 2.3 改进错误提示
- 友好的错误信息
- 提供解决方案建议
- 添加错误代码便于排查

### Phase 3: 增强帮助系统

#### 3.1 添加示例到帮助信息
- 每个命令添加 `Examples` 部分
- 显示常见用法

#### 3.2 添加 `help <command>` 详细说明
- 参数说明
- 使用场景
- 注意事项

#### 3.3 添加 shell 补全
- 支持 bash/zsh/fish/**csh** (主要场景)
- `completion` 命令生成补全脚本
- 自动检测当前 shell 类型

**使用方式**:
```bash
# 自动检测并安装
$ semi-nexus completion install

# 生成指定 shell 的补全脚本
$ semi-nexus completion bash > /etc/bash_completion.d/semi-nexus
$ semi-nexus completion zsh > "${fpath[1]}/_semi-nexus"
$ semi-nexus completion fish > ~/.config/fish/completions/semi-nexus.fish
$ semi-nexus completion csh >> ~/.cshrc

# csh 用户 (主要场景)
$ echo 'set complete=enhance' >> ~/.cshrc
$ semi-nexus completion csh >> ~/.cshrc
$ source ~/.cshrc
```

### Phase 4: 完善能力生效机制

#### 4.1 增强 `sync` 命令

**当前问题**: sync 只复制文件，不验证是否可用

**改进方案**:
```
sync 执行流程:
1. 检测已安装的 Agent
2. 对每个 Agent:
   a. 确保目标目录存在
   b. 同步能力文件
   c. 验证文件完整性 (检查 SKILL.md/skill.md)
   d. 生成 Agent 特定配置 (如需要)
   e. 记录同步状态
3. 输出使用指南
```

#### 4.2 添加能力验证

**新增 `verify` 命令**:
```bash
$ semi-nexus verify self-improving-agent

✓ Verifying self-improving-agent...

Local Installation:
  ✓ Files complete (5 files)
  ✓ Manifest valid
  ✓ SKILL.md found

Claude Code:
  ✓ Symlink exists: ~/.claude/skills/self-improving-agent
  ✓ SKILL.md accessible
  ✓ Ready to use (restart Claude Code if running)

OpenCode:
  ✓ Symlink exists: ~/.opencode/skills/self-improving-agent
  ✓ SKILL.md accessible
  ✓ Ready to use (restart OpenCode if running)

OpenClaw:
  ✗ Not detected (install OpenClaw first)

💡 To use in Claude Code:
   1. Restart Claude Code or start a new session
   2. The skill will be automatically loaded
   3. Ask Claude to use "self-improving-agent" capabilities
```

#### 4.3 添加使用指南

**sync 后自动显示**:
```
✓ Sync complete!

📚 How to use your capabilities:

Claude Code:
  1. Restart Claude Code or start a new chat
  2. Skills are auto-loaded from ~/.claude/skills/
  3. Just ask Claude to use the skill

OpenCode:
  1. Restart OpenCode
  2. Skills are auto-loaded from ~/.opencode/skills/

OpenClaw:
  1. Edit ~/.openclaw/config.yaml
  2. Add plugin to enabled list:
     plugins:
       enabled:
         - self-improving-agent
  3. Restart OpenClaw
```

#### 4.4 Agent 特定配置生成

**为 OpenClaw 自动生成配置**:
```
$ semi-nexus sync --configure

🔄 Syncing and configuring...

OpenClaw configuration updated:
  Added self-improving-agent to enabled plugins
  Config: ~/.openclaw/config.yaml
```

### Phase 5: 智能化功能

#### 5.1 自动检查更新
- 启动时检查 CLI 版本
- 提示用户更新

#### 5.2 智能提示
- 根据上下文提示下一步操作
- 检测常见问题并给出建议

### Phase 6: 多语言支持 (i18n)

#### 6.1 国际化架构
- 使用 i18next 或类似库
- 支持语言包动态加载
- 自动检测系统语言

#### 6.2 支持的语言
- 中文 (zh-CN) - 默认
- 英文 (en-US)

#### 6.3 语言切换
- `config set lang <locale>` 命令
- 环境变量 `SEMI_NEXUS_LANG`
- 自动检测系统语言

#### 6.4 翻译范围
- CLI 输出信息
- 错误提示
- 帮助文档
- 交互式提示

#### 6.5 示例

```bash
# 中文输出
$ semi-nexus search "self-improving"

🔍 搜索: "self-improving"

找到 1 个能力:

────────────────────────────────────────────────────────────

自我改进代理技能
  [skill] v1.0.0
  将学习内容和错误记录到 markdown 文件...
  标签: self-improvement, learning, agent
────────────────────────────────────────────────────────────

# 英文输出
$ LANG=en semi-nexus search "self-improving"

🔍 Searching for: "self-improving"

Found 1 capability:

────────────────────────────────────────────────────────────

Self-Improvement Agent Skill
  [skill] v1.0.0
  Log learnings and errors to markdown files...
  Tags: self-improvement, learning, agent
────────────────────────────────────────────────────────────
```

## 实现任务

### Task 1: 添加 `quickstart` 命令
**文件**: `src/commands/quickstart.ts`
- 交互式引导用户完成首次设置
- 检测服务器连接
- 自动登录或引导创建 API Key
- 推荐并安装热门能力
- 自动 sync 并验证

### Task 2: 优化 `install` 命令
**文件**: `src/commands/install.ts`
- 添加 `--auto-subscribe` 选项
- 添加 `--sync` 选项
- 未订阅时提示是否自动订阅
- 安装后提示下一步

### Task 3: 添加 `discover` 命令
**文件**: `src/commands/discover.ts`
- 展示热门能力
- 展示新上架
- 展示编辑精选
- 支持交互式选择安装

### Task 4: 增强 `sync` 命令
**文件**: `src/commands/sync.ts`
- 添加能力验证
- 生成使用指南
- 支持 `--configure` 自动配置 Agent

### Task 5: 添加 `verify` 命令
**文件**: `src/commands/verify.ts`
- 验证本地安装
- 验证各 Agent 同步状态
- 输出使用指南

### Task 6: 改进错误处理
**文件**: `src/utils/error-handler.ts`
- 统一错误处理
- 友好错误信息
- 解决方案提示

### Task 7: 增强帮助信息
**文件**: `src/index.ts`, `src/commands/*.ts`
- 添加示例到每个命令
- 添加 `.addHelpText()` 内容

### Task 8: 添加 shell 补全
**文件**: `src/commands/completion.ts`
- 生成 bash/zsh/fish 补全脚本
- 支持命令和参数补全

### Task 9: 增强 Agent 集成
**文件**: `src/api/agents.ts`
- 添加配置生成功能
- 添加验证功能
- 添加使用指南生成

### Task 10: 添加多语言支持 (i18n)
**文件**: `src/i18n/`, `src/locales/`
- 集成 i18next 库
- 创建语言包目录结构
- 实现中英文翻译
- 添加语言切换命令

**目录结构**:
```
src/
├── i18n/
│   └── index.ts          # i18n 初始化
├── locales/
│   ├── zh-CN.json        # 中文语言包
│   └── en-US.json        # 英文语言包
└── utils/
    └── lang.ts           # 语言检测和切换
```

**语言包示例** (`locales/zh-CN.json`):
```json
{
  "search": {
    "title": "搜索: \"{{query}}\"",
    "found": "找到 {{count}} 个能力",
    "noResults": "未找到匹配的能力"
  },
  "install": {
    "installing": "正在安装 {{name}}...",
    "success": "{{name}} 安装成功！",
    "failed": "安装失败: {{error}}"
  },
  "sync": {
    "syncing": "正在同步到 Agent 环境...",
    "success": "同步完成！",
    "usage": "使用指南"
  }
}
```

## 详细实现：能力在 Agent 中生效

### Claude Code 集成

```typescript
// Claude Code 能力加载机制
// 1. 扫描 ~/.claude/skills/ 目录
// 2. 查找 SKILL.md 或 skill.md 文件
// 3. 解析 YAML frontmatter
// 4. 自动注入到 Claude 的 system prompt

// sync 后验证
async function verifyClaudeCode(skillName: string): Promise<VerifyResult> {
  const skillPath = path.join(os.homedir(), '.claude', 'skills', skillName);
  const skillFile = path.join(skillPath, 'SKILL.md');
  
  return {
    installed: await fs.pathExists(skillPath),
    skillFileExists: await fs.pathExists(skillFile),
    isSymlink: (await fs.lstat(skillPath)).isSymbolicLink(),
    instructions: 'Restart Claude Code or start a new session'
  };
}
```

### OpenCode 集成

```typescript
// OpenCode 能力加载机制
// 1. 扫描 ~/.opencode/skills/ 目录
// 2. 查找 skill.md 文件
// 3. 自动加载

async function verifyOpenCode(skillName: string): Promise<VerifyResult> {
  const skillPath = path.join(os.homedir(), '.opencode', 'skills', skillName);
  const skillFile = path.join(skillPath, 'skill.md');
  
  return {
    installed: await fs.pathExists(skillPath),
    skillFileExists: await fs.pathExists(skillFile),
    instructions: 'Restart OpenCode'
  };
}
```

### OpenClaw 集成

```typescript
// OpenClaw 能力加载机制
// 1. 扫描 ~/.openclaw/plugins/ 目录
// 2. 需要在 config.yaml 中启用

async function configureOpenClaw(skillName: string): Promise<void> {
  const configPath = path.join(os.homedir(), '.openclaw', 'config.yaml');
  let config = await fs.pathExists(configPath) 
    ? yaml.parse(await fs.readFile(configPath, 'utf-8'))
    : { plugins: { enabled: [] } };
  
  if (!config.plugins?.enabled?.includes(skillName)) {
    config.plugins = config.plugins || { enabled: [] };
    config.plugins.enabled.push(skillName);
    await fs.writeFile(configPath, yaml.stringify(config));
  }
}

async function verifyOpenClaw(skillName: string): Promise<VerifyResult> {
  const pluginPath = path.join(os.homedir(), '.openclaw', 'plugins', skillName);
  const configPath = path.join(os.homedir(), '.openclaw', 'config.yaml');
  
  let enabled = false;
  if (await fs.pathExists(configPath)) {
    const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));
    enabled = config.plugins?.enabled?.includes(skillName);
  }
  
  return {
    installed: await fs.pathExists(pluginPath),
    enabled: enabled,
    instructions: enabled 
      ? 'Restart OpenClaw'
      : 'Run: semi-nexus sync --configure'
  };
}
```

## 预期效果

### 优化前
```bash
$ semi-nexus init --server http://localhost:3000
$ semi-nexus login --apikey xxx
$ semi-nexus search "self-improving"
$ semi-nexus subscribe self-improving-agent
$ semi-nexus install self-improving-agent
$ semi-nexus sync
# 用户不知道能力是否可用，如何使用
```

### 优化后
```bash
$ semi-nexus quickstart

🚀 Welcome to SemiNexus CLI!

Let's get you started...

? Server URL: http://localhost:3000
? Login method: API Key
? API Key: ********

✓ Connected to server
✓ Logged in successfully

Detected Agents:
  ✓ Claude Code (~/.claude)
  ✓ OpenCode (~/.opencode)
  ✗ OpenClaw (not installed)

? Would you like to install recommended skills? Yes

Installing recommended skills...
  ✓ self-improving-agent (skill)
  ✓ rtl-review (skill)

Syncing to Agents...
  ✓ Claude Code: 2 skills synced
  ✓ OpenCode: 2 skills synced

📚 Your skills are ready!

To use in Claude Code:
  1. Start a new chat session
  2. Just ask Claude to use the skill

To use in OpenCode:
  1. Restart OpenCode
  2. Skills are auto-loaded

Run 'semi-nexus verify <skill-name>' to check status.
```

### 或者简化流程
```bash
$ semi-nexus install self-improving-agent --auto-subscribe --sync

📦 Installing self-improving-agent...
✓ Subscribed automatically
✓ Installed to ~/.semi-nexus/skills/self-improving-agent
✓ Synced to Claude Code
✓ Synced to OpenCode

📚 To use: Restart your Agent or start a new session
```

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/commands/quickstart.ts` | 新建 | 快速开始命令 |
| `src/commands/verify.ts` | 新建 | 验证能力状态 |
| `src/commands/discover.ts` | 新建 | 发现推荐能力 |
| `src/commands/completion.ts` | 新建 | Shell 补全 |
| `src/commands/config.ts` | 修改 | 添加语言设置 |
| `src/commands/sync.ts` | 修改 | 增强验证和使用指南 |
| `src/commands/install.ts` | 修改 | 添加自动订阅和同步 |
| `src/commands/search.ts` | 修改 | 添加交互模式 |
| `src/i18n/index.ts` | 新建 | i18n 初始化 |
| `src/locales/zh-CN.json` | 新建 | 中文语言包 |
| `src/locales/en-US.json` | 新建 | 英文语言包 |
| `src/utils/lang.ts` | 新建 | 语言检测和切换 |
| `src/api/agents.ts` | 修改 | 添加配置生成和验证 |
| `src/utils/error-handler.ts` | 新建 | 统一错误处理 |
| `src/index.ts` | 修改 | 注册新命令 |
| `tests/e2e/cli/quickstart.e2e.test.ts` | 新建 | E2E 测试 |
| `tests/e2e/cli/verify.e2e.test.ts` | 新建 | E2E 测试 |
