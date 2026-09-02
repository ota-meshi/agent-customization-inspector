# どのファイルを一覧にするか

[English](which-files-are-listed.md)

カスタマイズファイルが一覧の行になる場所を、ツールごと・種別ごとに示します。下に無い場所の
ファイルは開きません。一覧に載せたカスタマイズの内側で行う2つの限定的な読み取りは、末尾で
述べます。

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
| Instructions | ルートの `AGENTS.md` と `AGENTS.override.md`。および `.codex/config.toml` の `project_doc_fallback_filenames` が挙げる各名前（ルート直下） |
| Skills | `.agents/skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `.codex/agents/` 直下の `.toml` |
| Permissions | `.codex/rules/` 直下の `.rules` |
| MCP / settings | `.codex/config.toml` |
| Hooks | `.codex/hooks.json` と `.codex/config.toml` |
| Plugins | `.agents/plugins/marketplace.json` と `.claude-plugin/marketplace.json` |

## 個人設定

オプトインした場合だけです。ディレクトリは3つではなく**4つ**あります。各ツール自身のホームと、
その隣にある共有 agent home です。Consent ページは何も読む前に4つすべてを示します。以下の各
パスは、それが載っている見出しのディレクトリからの相対です。

### Claude Code のホーム

`CLAUDE_CONFIG_DIR`、未設定なら `~/.claude`。

| 種別 | 場所 |
| --- | --- |
| Instructions | `CLAUDE.md` |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `agents/` 配下の任意の深さの `.md` |
| Prompts / commands | `commands/` 配下の任意の深さの `.md` |
| Rules | `rules/` 直下の `.md` |
| Output styles | `output-styles/` 直下の `.md` |
| Hooks / permissions / settings | `settings.json` |

### GitHub Copilot のホーム

`COPILOT_HOME`、未設定なら `~/.copilot`。

| 種別 | 場所 |
| --- | --- |
| Instructions | `copilot-instructions.md`。`instructions/` 配下の任意の深さの `.instructions.md` |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` |
| Agents | `agents/` 直下の `.agent.md` |
| MCP | `mcp-config.json` |
| Hooks | `hooks/` 直下の `.json`。`settings.json` |
| Settings | `settings.json` |

### OpenAI Codex のホーム

`CODEX_HOME`、未設定なら `~/.codex`。

| 種別 | 場所 |
| --- | --- |
| Instructions | `AGENTS.md` と `AGENTS.override.md` |
| Agents | `agents/` 直下の `.toml` |
| Prompts / commands | `prompts/` 直下の `.md` |
| Permissions | `rules/` 直下の `.rules` |
| MCP / settings | `config.toml` |
| Hooks | `hooks.json` と `config.toml` |

### 共有 agent home

`~/.agents`。どのツールのものでもなく、`CODEX_HOME` や `COPILOT_HOME` を変えても動きません。

| 種別 | 場所 | 読むツール |
| --- | --- | --- |
| Skills | `skills/` 配下の各ディレクトリの `SKILL.md` | OpenAI Codex と GitHub Copilot |
| Plugins | `plugins/marketplace.json` | OpenAI Codex |

## 一覧に載せたものの内側で行う2つの読み取り

一覧に載るカスタマイズは入口のファイルだけではないので、2つの限定的な読み取りが伴います。
どちらも独自の行を作らず、どちらもそのカスタマイズの外へは出ません。

- **カスタマイズ自身のディレクトリ。** スキルは `SKILL.md` と、その隣にあるスクリプト・参照・
  アセットまで含めて1つです。そのディレクトリのファイルを列挙し、一緒に表示します。
- **プラグインのルート。** Plugin marketplace のエントリは自身のプラグインの場所を宣言します。
  そのルート配下のファイルをプラグインのものとして表示します。宣言されたルートが source の
  外へ解決される場合は読まずに拒否し、バージョン管理の内部とパッケージマネージャが作った
  ディレクトリはどちらからも除外します。
