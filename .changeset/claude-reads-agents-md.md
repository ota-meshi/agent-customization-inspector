---
'agent-customization-inspector': minor
---

Claude Code is now named as a reader of every `AGENTS.md` in the repository — at the root, where it joins GitHub Copilot, OpenAI Codex, and Antigravity CLI, and in any subdirectory, where the file is listed under that directory's range. Claude Code reads `AGENTS.md` where it reads `CLAUDE.md` from 2.1.277, which did not yet bring it to Bedrock, Vertex, or Foundry; before 2.1.281 some sessions, such as those on Bedrock or with telemetry disabled, read `CLAUDE.md` only. Whether a session reads it instead of the `CLAUDE.md` files or beside them depends on the files on its own path and on a user-level setting, so no row states which.
