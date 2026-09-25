# agent-customization-inspector

## 0.7.0

### Minor Changes

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Antigravity CLI is recognized where its Rules page now says it reads: `GEMINI.md` and `AGENTS.md` in any directory, a directory's `.agents/` included, each governing the directory it belongs to; rules directories at any depth; and, in the personal setup, `AGENTS.md`, `config/GEMINI.md`, `config/AGENTS.md`, and the rules below `config/rules/` and `antigravity-cli/rules/`. A Markdown file directly in a skills directory is no longer listed as an Antigravity CLI skill, because no page documents that shape and the terminal does not discover it.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Claude Code is now named as a reader of every `AGENTS.md` in the repository — at the root, where it joins GitHub Copilot, OpenAI Codex, and Antigravity CLI, and in any subdirectory, where the file is listed under that directory's range. Claude Code reads `AGENTS.md` where it reads `CLAUDE.md` from 2.1.277, which did not yet bring it to Bedrock, Vertex, or Foundry; before 2.1.281 some sessions, such as those on Bedrock or with telemetry disabled, read `CLAUDE.md` only. Whether a session reads it instead of the `CLAUDE.md` files or beside them depends on the files on its own path and on a user-level setting, so no row states which.

### Patch Changes

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The personal `~/.copilot/copilot-instructions.md` now names VS Code beside Copilot CLI among the surfaces that read it, because VS Code documents it as the always-on personal instructions file for Copilot Agent Host sessions.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Following a detail page's Previous or Next move to another row of the same file now puts keyboard focus on the page heading, as every other move does, instead of dropping it when the move's own link goes away.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Settings, rule, and instruction files now say when another reading of the same file failed. A `.claude/settings.json` holding a comment, which Claude Code reads as strict JSON, or a `.codex/config.toml` that is not valid TOML, now shows that it could not be parsed on its Settings row and detail page. So does a rule file that is also a command, and an instruction file shown whole, such as a `.mcp.json` that Codex reads as a fallback instruction file. When two readings of one file fail the same way, the message appears once.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `copilot-instructions.md`, and the other instruction files whose products document no frontmatter are now shown whole, the way those products read them: a `---` block at the top is part of the instructions rather than declarations set apart, a block that is not valid YAML is no longer reported as a file that could not be parsed, and the detail page is the file on one page without tabs. GitHub Copilot's `*.instructions.md` files keep their frontmatter and instructions tabs, and comparing two of them still compares what each declares; a comparison involving any other instruction file compares the recognizing products and the complete files.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A file line stacks its path and the products that read it whenever its row is too narrow for both side by side, at any text size, instead of squeezing one of them to nothing; and an instruction detail heads a range declared as whitespace alone with "Applies to", as it does every other declared range.

- [#21](https://github.com/ota-meshi/agent-customization-inspector/pull/21) [`ba1ae6c`](https://github.com/ota-meshi/agent-customization-inspector/commit/ba1ae6c033f916e02d817dc9483d3654f69250d9) Thanks [@ota-meshi](https://github.com/ota-meshi)! - An inventory row that kept a problem now says which kind it is. A file whose frontmatter or declarations did not parse is marked `Could not be parsed`, and a supporting file that could not be read is marked `Could not be read`, where every mark used to read `diagnostic`. The two ask for different fixes, and one skill's row can carry both. Opening a mark still shows what to do about it.

## 0.6.0

### Minor Changes

- [#19](https://github.com/ota-meshi/agent-customization-inspector/pull/19) [`25ee324`](https://github.com/ota-meshi/agent-customization-inspector/commit/25ee324e0bfec46dc80a50be6bc24a2977cdff0b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Add Antigravity CLI as a fourth supported tool. The inventory now lists the files Antigravity CLI reads — the root `GEMINI.md` and `AGENTS.md`, the skills, custom agents, and MCP servers under `.agents/`, and, after consent, the context file, MCP servers, custom agents in both documented shapes, skills in both documented shapes, settings, permissions, and hooks of the `~/.gemini` home — and names Antigravity CLI as a reader of the files it shares with the other tools.

### Patch Changes

- [#19](https://github.com/ota-meshi/agent-customization-inspector/pull/19) [`25ee324`](https://github.com/ota-meshi/agent-customization-inspector/commit/25ee324e0bfec46dc80a50be6bc24a2977cdff0b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Compute every source comparison with VS Code's own line diff (`vscode-diff`) in place of a hand-assembled Myers pass. A line the other copy kept at another indentation now stands opposite that line instead of opposite whatever took its position, and the mark on it is the two spaces it gained rather than both sides' whole indentation. Within a line, a mark no longer breaks into islands around a `.` or a `/` that two otherwise unrelated values happen to share.

- [#19](https://github.com/ota-meshi/agent-customization-inspector/pull/19) [`25ee324`](https://github.com/ota-meshi/agent-customization-inspector/commit/25ee324e0bfec46dc80a50be6bc24a2977cdff0b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Keep every hook declaration a carrier makes. A declaration whose hook or event a file named `__proto__` reached the comparison as an empty document, and two declarations whose hook names differ only by where a NUL sits collapsed into one on the detail page. Both are now published as written.

## 0.5.1

### Patch Changes

- [#15](https://github.com/ota-meshi/agent-customization-inspector/pull/15) [`4a92fc5`](https://github.com/ota-meshi/agent-customization-inspector/commit/4a92fc53f92c68272c5e69f3c88270998c82fc32) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The skill detail's "Other copies of this skill" strip is now the last row of its invocation name's box — inset like the recognition rows above it and parted from them by the same hairline — instead of sitting against the box's border. On every detail page, the strip's label is now centred on the line with the entries beside it rather than sitting above their text.

## 0.5.0

### Minor Changes

- [#13](https://github.com/ota-meshi/agent-customization-inspector/pull/13) [`ea6a054`](https://github.com/ota-meshi/agent-customization-inspector/commit/ea6a0540a74c358bf8c04bd065e5c5f096f84e47) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A Claude Code skill at the selected root is now listed under the `name` its frontmatter declares — the name Claude Code's own slash menu and the desktop app list it under — with the skill directory as the fallback, so a root `SKILL.md` that Claude Code and GitHub Copilot both read is one row rather than two. A nested skill keeps its directory-qualified command, such as `apps/web:deploy`.

## 0.4.0

### Minor Changes

- [#11](https://github.com/ota-meshi/agent-customization-inspector/pull/11) [`910c72a`](https://github.com/ota-meshi/agent-customization-inspector/commit/910c72adb55e5598026bf919f833bb17e0684f0a) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Source is now coloured by shiki and shown as the browser's own text instead of inside a Monaco editor. A detail page renders each file — and a comparison page each of its two sides — as plain text with line numbers that are not copied, so the browser's own find, selection, and copy reach every character, and a detail route loads about 215 KB of colouring, as the local host serves it, where it loaded about 3.1 MB of editor before. A comparison keeps its two sides opposite each other at every width, marks each added or removed line with `+` or `-` beside its number as well as with colour, and highlights the words a changed line differs in. The package ships no editor worker, icon font, or WebAssembly.

## 0.3.0

### Minor Changes

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Every customization detail page is now drawn inside one frame that holds the page's own outermost element, the header above its content, the region a screen reader hears its state through, and where keyboard focus lands on arrival. Nothing looks, sounds, or answers the keyboard differently from the previous release.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A plugin detail page no longer announces "Plugin ready." when it finishes loading. Every kind is silent on arrival, as the other ten already were: focus is already on the page's heading, which has named the subject, and the session has already been announced as ready — a second "ready" says only that something changed, not what it changed into.
  
  A skill detail page reached by a link whose file its directory no longer holds now announces that, rather than announcing that nothing sits at the link's path. The screen has drawn those as two different states all along; a reader who cannot see it was told the skill itself was gone.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Every sentence this product shows now spells its apostrophe the same way, wherever the sentence is written. A page's own words and the words its live region speaks were the same sentence in two spellings, so the same statement reached a reader who could see the page and a reader who could not as two different strings.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A detail page's trail ends at the kind whenever it has nothing to name after it — a link this scan holds no file at, a skill whose directory it holds no row for — instead of closing on a separator with nothing behind it. Every kind reads that way; only skills did before, and the page itself already says the link is not in this scan.

## 0.2.1

### Patch Changes

- [#7](https://github.com/ota-meshi/agent-customization-inspector/pull/7) [`e78faff`](https://github.com/ota-meshi/agent-customization-inspector/commit/e78faff3b19da2064f152ac9a44d7b88da4775af) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Remove images from publish files

## 0.2.0

### Minor Changes

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A plugin detail page opened at a link with no path drew an empty heading. It now names the kind, the way every other detail page does when its link names no path.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The outcomes a permission policy reports about declared permissions it could not read, and the ones a plugin's carrier reports, are now marked by severity the way every other page marks them: an error takes the leading edge a failure gets, anything else the weight of a note.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The detail pages for all eleven customization kinds now share their common headings, breadcrumbs, file facts, source-root notes, diagnostics, focus handling, and loading and failure announcements. Pages with parsed and source views also share their tab behavior, so the same navigation and status patterns stay consistent across customization kinds.

- [#6](https://github.com/ota-meshi/agent-customization-inspector/pull/6) [`1e44168`](https://github.com/ota-meshi/agent-customization-inspector/commit/1e44168bb0ee553fb8447fea2ae01e39238b2158) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The tab strip on a plugin comparison now uses the same shared presentation and behavior as detail pages with parsed and source views. Nothing looks, sounds, or answers the keyboard differently from the previous release.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Spacing is now the same across the pages that share a shape. The space above and below a heading, and between a heading and the link beside it, no longer differs from one customization kind to the next. And where two sections meet, each section's own spacing applies rather than the larger of the two winning, so a few gaps on the Repository page and in the disable interlude are slightly wider.

- [#3](https://github.com/ota-meshi/agent-customization-inspector/pull/3) [`7496f35`](https://github.com/ota-meshi/agent-customization-inspector/commit/7496f35ac855186453a0eab7bffcb69464490c6e) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Read-only source diffs for skills, instructions, prompts and commands, custom agents, and plugins now render through one shared component. Comparison behavior is unchanged.

## 0.1.0

### Minor Changes

- [#1](https://github.com/ota-meshi/agent-customization-inspector/pull/1) [`636d5ad`](https://github.com/ota-meshi/agent-customization-inspector/commit/636d5adf2fa8c6d9b31bdf6113a438c92acc90a4) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: implement agent-customization-inspector
