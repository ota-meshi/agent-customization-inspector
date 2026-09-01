# Which files are listed

[日本語](which-files-are-listed.ja.md)

Every location the inspector reads, per tool and per kind. It opens nothing else.

## In the repository

Paths are relative to the inspected repository root.

### Claude Code

| Kind | Where |
| --- | --- |
| Instructions | `CLAUDE.md` and `CLAUDE.local.md`, in any directory |
| Skills | `SKILL.md` in each directory under a `.claude/skills/` directory, wherever that directory sits |
| Agents | any `.md` file under `.claude/agents/`, at any depth |
| Prompts and commands | any `.md` file under `.claude/commands/`, at any depth |
| Rules | any `.md` file under a `.claude/rules/` directory at any depth, wherever that directory sits |
| Output styles | any `.md` file directly in `.claude/output-styles/` |
| MCP | `.mcp.json` |
| Hooks, permissions, settings | `.claude/settings.json` and `.claude/settings.local.json` |
| Plugins | `.claude-plugin/marketplace.json`, and `.claude-plugin/plugin.json` inside a `.claude/skills/` skill directory |

### GitHub Copilot

| Kind | Where |
| --- | --- |
| Instructions | `AGENTS.md` in any directory; `CLAUDE.md` and `GEMINI.md` at the root; `.github/copilot-instructions.md`, at the root or under any directory; any `.instructions.md` file under a `.github/instructions/` directory, at any depth |
| Skills | `SKILL.md` in each directory under `.github/skills/`, `.agents/skills/`, or `.claude/skills/` |
| Agents | any `.md` file directly in `.github/agents/` or `.claude/agents/` |
| Prompts and commands | any `.prompt.md` file directly in `.github/prompts/`; any `.md` file directly in `.claude/commands/` |
| MCP | `.mcp.json`, `.github/mcp.json`, and `.vscode/mcp.json` |
| Hooks | any `.json` file directly in `.github/hooks/`; `.github/copilot/settings.json` and `.github/copilot/settings.local.json`; `.claude/settings.json` and `.claude/settings.local.json` |
| Settings | `.github/copilot/settings.json` and `.github/copilot/settings.local.json`; `.claude/settings.json` and `.claude/settings.local.json` |
| Plugins | `marketplace.json` at the root, `.plugin/marketplace.json`, `.github/plugin/marketplace.json`, and `.claude-plugin/marketplace.json` |

### OpenAI Codex

| Kind | Where |
| --- | --- |
| Instructions | `AGENTS.md` and `AGENTS.override.md`, at the root |
| Skills | `SKILL.md` in each directory under `.agents/skills/` |
| Agents | any `.toml` file directly in `.codex/agents/` |
| Permissions | any `.rules` file directly in `.codex/rules/` |
| MCP, settings | `.codex/config.toml` |
| Hooks | `.codex/hooks.json` and `.codex/config.toml` |
| Plugins | `.agents/plugins/marketplace.json` and `.claude-plugin/marketplace.json` |

## In your personal setup

Only after you opt in. Paths are relative to each tool's own home directory, which the consent
page names before anything is read.

### Claude Code

| Kind | Where |
| --- | --- |
| Instructions | `CLAUDE.md` |
| Skills | `SKILL.md` in each directory under `skills/` |
| Agents | any `.md` file under `agents/`, at any depth |
| Prompts and commands | any `.md` file under `commands/`, at any depth |
| Rules | any `.md` file directly in `rules/` |
| Output styles | any `.md` file directly in `output-styles/` |
| Hooks, permissions, settings | `settings.json` |

### GitHub Copilot

| Kind | Where |
| --- | --- |
| Instructions | `copilot-instructions.md`; any `.instructions.md` file under `instructions/`, at any depth |
| Skills | `SKILL.md` in each directory under `skills/` |
| Agents | any `.agent.md` file directly in `agents/` |
| MCP | `mcp-config.json` |
| Hooks | any `.json` file directly in `hooks/`; `settings.json` |
| Settings | `settings.json` |

### OpenAI Codex

| Kind | Where |
| --- | --- |
| Instructions | `AGENTS.md` and `AGENTS.override.md` |
| Skills | `SKILL.md` in each directory under `skills/` |
| Agents | any `.toml` file directly in `agents/` |
| Prompts and commands | any `.md` file directly in `prompts/` |
| Permissions | any `.rules` file directly in `rules/` |
| MCP, settings | `config.toml` |
| Hooks | `hooks.json` and `config.toml` |
| Plugins | `plugins/marketplace.json` |
