# Which files are listed

[日本語](which-files-are-listed.ja.md)

Where a customization file becomes a listed row, per tool and per kind. A file at no location
below is never opened; two bounded reads inside a customization it did list are named at the
end.

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
| Instructions | `AGENTS.md` and `AGENTS.override.md`, at the root; and, at the root, each name `.codex/config.toml` lists in `project_doc_fallback_filenames` |
| Skills | `SKILL.md` in each directory under `.agents/skills/` |
| Agents | any `.toml` file directly in `.codex/agents/` |
| Permissions | any `.rules` file directly in `.codex/rules/` |
| MCP, settings | `.codex/config.toml` |
| Hooks | `.codex/hooks.json` and `.codex/config.toml` |
| Plugins | `.agents/plugins/marketplace.json` and `.claude-plugin/marketplace.json` |

## In your personal setup

Only after you opt in. There are four directories, not three: each tool's own home, and the
shared agent home beside them. The consent page names all four before anything is read, and
each path below is relative to the one it is listed under.

### Your Claude Code home

`CLAUDE_CONFIG_DIR`, or `~/.claude`.

| Kind | Where |
| --- | --- |
| Instructions | `CLAUDE.md` |
| Skills | `SKILL.md` in each directory under `skills/` |
| Agents | any `.md` file under `agents/`, at any depth |
| Prompts and commands | any `.md` file under `commands/`, at any depth |
| Rules | any `.md` file directly in `rules/` |
| Output styles | any `.md` file directly in `output-styles/` |
| Hooks, permissions, settings | `settings.json` |

### Your GitHub Copilot home

`COPILOT_HOME`, or `~/.copilot`.

| Kind | Where |
| --- | --- |
| Instructions | `copilot-instructions.md`; any `.instructions.md` file under `instructions/`, at any depth |
| Skills | `SKILL.md` in each directory under `skills/` |
| Agents | any `.agent.md` file directly in `agents/` |
| MCP | `mcp-config.json` |
| Hooks | any `.json` file directly in `hooks/`; `settings.json` |
| Settings | `settings.json` |

### Your OpenAI Codex home

`CODEX_HOME`, or `~/.codex`.

| Kind | Where |
| --- | --- |
| Instructions | `AGENTS.md` and `AGENTS.override.md` |
| Agents | any `.toml` file directly in `agents/` |
| Prompts and commands | any `.md` file directly in `prompts/` |
| Permissions | any `.rules` file directly in `rules/` |
| MCP, settings | `config.toml` |
| Hooks | `hooks.json` and `config.toml` |

### The shared agent home

`~/.agents`, which is not any one tool's and does not move with `CODEX_HOME` or
`COPILOT_HOME`.

| Kind | Where | Read by |
| --- | --- | --- |
| Skills | `SKILL.md` in each directory under `skills/` | OpenAI Codex and GitHub Copilot |
| Plugins | `plugins/marketplace.json` | OpenAI Codex |

## Two reads inside what was listed

A listed customization is more than its entry point, so two bounded reads go with it. Neither
adds a row of its own, and neither reaches outside the customization it belongs to.

- **A customization's own directory.** A skill is its `SKILL.md` and the scripts, references,
  and assets beside it, so the files in that directory are enumerated and shown with it.
- **A plugin's root.** A plugin marketplace entry declares where its plugin lives, and the
  files under that root are shown as the plugin's. A declared root that resolves outside the
  source is refused rather than read, and version-control internals and installed-package
  directories are left out of both.
