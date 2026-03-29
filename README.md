# SemiNexus CLI

**Pure CLI tool for Agent capability hub - no web UI required**

## Core Features

- 🎯 **Standalone CLI** - Works without any web service
- 🔄 **Capability Hub** - Manage Skills, MCP, Agents from command line
- 📦 **Unified Format** - Package as .snp format
- 🔗 **Multi-Agent Sync** - Claude Code, OpenCode, OpenClaw support

## Quick Start

```bash
npm install -g semi-nexus-cli

semi-nexus init
semi-nexus search "rtl review"
semi-nexus install rtl-review-copilot
semi-nexus sync --to claude-code
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize configuration |
| `login` | Login authentication |
| `search <query>` | Search capabilities |
| `subscribe <name>` | Subscribe to capability |
| `install <name>` | Install capability |
| `sync` | Sync to Agent environments |
| `list` | List installed capabilities |
| `upgrade [name]` | Upgrade capabilities |
| `uninstall <name>` | Uninstall capability |
| `info <name>` | Show capability details |
| `status` | Show connection status |

## Supported Agents

| Agent | Path | Sync Mode |
|-------|------|-----------|
| Claude Code | `~/.claude/skills/` | symlink/copy |
| OpenCode | `~/.opencode/skills/` | symlink/copy |
| OpenClaw | `~/.openclaw/plugins/` | copy |

## Development

```bash
npm install
npm test           # Run tests
npm run typecheck  # Type check
npm run lint       # Lint
npm run build      # Build
```

## Local CI (Docker)

```bash
docker build -t semi-nexus-cli .
docker run semi-nexus-cli npm test
```

## License

MIT