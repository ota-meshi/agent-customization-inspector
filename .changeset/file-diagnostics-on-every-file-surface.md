---
'agent-customization-inspector': patch
---

Settings, rule, and instruction files now say when another reading of the same file failed. A `.claude/settings.json` holding a comment, which Claude Code reads as strict JSON, or a `.codex/config.toml` that is not valid TOML, now shows that it could not be parsed on its Settings row and detail page. So does a rule file that is also a command, and an instruction file shown whole, such as a `.mcp.json` that Codex reads as a fallback instruction file. When two readings of one file fail the same way, the message appears once.
