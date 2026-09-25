---
'agent-customization-inspector': patch
---

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `copilot-instructions.md`, and the other instruction files whose products document no frontmatter are now shown whole, the way those products read them: a `---` block at the top is part of the instructions rather than declarations set apart, a block that is not valid YAML is no longer reported as a file that could not be parsed, and the detail page is the file on one page without tabs. GitHub Copilot's `*.instructions.md` files keep their frontmatter and instructions tabs, and comparing two of them still compares what each declares; a comparison involving any other instruction file compares the recognizing products and the complete files.
