# どのファイルを一覧にするか

[English](which-files-are-listed.md)

Inspector が読む場所のすべてを、ツールごと・種別ごとに示します。それ以外は開きません。

## リポジトリ

パスは調査対象リポジトリのルートからの相対です。

### Claude Code

| 種別 | 場所 |
| --- | --- |
| Instructions | `CLAUDE.md` と `CLAUDE.local.md`。任意のディレクトリ |
| Skills | `.claude/skills/` ディレクトリ配下の各ディレクトリの `SKILL.md`。そのディレクトリがどこにあっても |
| Agents | `.claude/agents/` 配下の任意の深さの `.md` |
| Prompts / commands | `.claude/commands/` 配下の任意の深さの `.md` |
| Rules | 任意の深さにある `.claude/rules/` ディレクトリ配下の、任意の深さの `.md` |
| Output styles | `.claude/output-styles/` 直下の `.md` |
| MCP | `.mcp.json` |
| Hooks / permissions / settings | `.claude/settings.json` と `.claude/settings.local.json` |
| Plugins | `.claude-plugin/marketplace.json`、および `.claude/skills/` のスキルディレクトリ内の `.claude-plugin/plugin.json` |

### GitHub Copilot

| 種別 | 場所 |
| --- | --- |
| Instructions | 任意のディレクトリの `AGENTS.md`。ルートの `CLAUDE.md` と `GEMINI.md`。`.github/copilot-instructions.md`（ルート、または任意のディレクトリ配下）。`.github/instructions/` ディレクトリ配下の任意の深さの `.instructions.md` |
| Skills | `.github/skills/`、`.agents/skills/`、`.claude/skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `.github/agents/` または `.claude/agents/` 直下の `.md` |
| Prompts / commands | `.github/prompts/` 直下の `.prompt.md`。`.claude/commands/` 直下の `.md` |
| MCP | `.mcp.json`、`.github/mcp.json`、`.vscode/mcp.json` |
| Hooks | `.github/hooks/` 直下の `.json`。`.github/copilot/settings.json` と `.github/copilot/settings.local.json`。`.claude/settings.json` と `.claude/settings.local.json` |
| Settings | `.github/copilot/settings.json` と `.github/copilot/settings.local.json`。`.claude/settings.json` と `.claude/settings.local.json` |
| Plugins | ルートの `marketplace.json`、`.plugin/marketplace.json`、`.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json` |

### OpenAI Codex

| 種別 | 場所 |
| --- | --- |
| Instructions | ルートの `AGENTS.md` と `AGENTS.override.md` |
| Skills | `.agents/skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `.codex/agents/` 直下の `.toml` |
| Permissions | `.codex/rules/` 直下の `.rules` |
| MCP / settings | `.codex/config.toml` |
| Hooks | `.codex/hooks.json` と `.codex/config.toml` |
| Plugins | `.agents/plugins/marketplace.json` と `.claude-plugin/marketplace.json` |

## 個人設定

オプトインした場合だけです。パスは各ツール自身のホームディレクトリからの相対で、その場所は
何も読む前に consent ページが示します。

### Claude Code

| 種別 | 場所 |
| --- | --- |
| Instructions | `CLAUDE.md` |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `agents/` 配下の任意の深さの `.md` |
| Prompts / commands | `commands/` 配下の任意の深さの `.md` |
| Rules | `rules/` 直下の `.md` |
| Output styles | `output-styles/` 直下の `.md` |
| Hooks / permissions / settings | `settings.json` |

### GitHub Copilot

| 種別 | 場所 |
| --- | --- |
| Instructions | `copilot-instructions.md`。`instructions/` 配下の任意の深さの `.instructions.md` |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `agents/` 直下の `.agent.md` |
| MCP | `mcp-config.json` |
| Hooks | `hooks/` 直下の `.json`。`settings.json` |
| Settings | `settings.json` |

### OpenAI Codex

| 種別 | 場所 |
| --- | --- |
| Instructions | `AGENTS.md` と `AGENTS.override.md` |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `agents/` 直下の `.toml` |
| Prompts / commands | `prompts/` 直下の `.md` |
| Permissions | `rules/` 直下の `.rules` |
| MCP / settings | `config.toml` |
| Hooks | `hooks.json` と `config.toml` |
| Plugins | `plugins/marketplace.json` |
