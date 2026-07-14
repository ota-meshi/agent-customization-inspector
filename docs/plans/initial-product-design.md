# Agent Customization Inspector — Initial Product Design

[日本語](initial-product-design.ja.md)

- Status: M1 implemented and locally verified on 2026-07-15; M2 and later approval is pending
- Researched: 2026-07-14
- Scope: Initial architecture and MVP plan only
- Authorization: Implement M1 only. Do not begin M2 or later milestones without new explicit approval

## 1. Repository status

- This plan was originally prepared from origin/main at b93ee32, Initial commit. M1 implementation work is isolated on the dev branch for a draft pull request.
- The user's pre-existing staged README.md and package.json changes were preserved and incorporated without unstaging them.
- The repository is now an npm single-package TypeScript and ESM project for Node.js 22.12.0 or later, with a lockfile, package exports, build, test, coverage, lint, format, and package-validation commands.
- M1 adds vendor-neutral public model and adapter contracts, source-separated catalog and detail contracts, bounded diagnostics and metadata, Repository and Global source authorities, safe discovery primitives, an internal initial-session coordinator, and test-only adapters and resolvers.
- Global remains disabled by default. The M1 Global path binds each allowlisted candidate to one built-in locator and does not walk a tool-home root wholesale.
- Local aggregate verification passes with 195 tests and coverage above the configured 90% line/statement and 85% branch thresholds.
- CI checks Node.js 22.12.0 and 24. Real vendor adapters, redaction, diff, the CLI, HTTP server, and Web UI remain outside the authorized M1 scope.
- The paired English and Japanese README, repository instructions, and design plan are maintained together.
- The existing license is MIT.
- npm view agent-customization-inspector returned E404 on 2026-07-14. This suggests the package is not currently public, but does not reserve the name.

## 2. Product understanding

Agent Customization Inspector is a read-only viewer for customization artifacts used by AI coding agents. It detects, displays, and compares untrusted files without executing or evaluating their instructions.

Core principles:

- Always scan the user-selected repository root as an isolated Repository source.
- Keep local user-global inspection disabled by default. Scan it only after explicit opt-in, as an independent Global source.
- Define Global as local files that apply to the current OS user across repositories. Managed, system, organization, remote, and hosted configuration are separate scopes and remain outside the MVP Global switch.
- Resolve only documented, allowlisted Global candidates. Never turn Global on by walking the user's entire home directory.
- Treat every inspected file as untrusted input.
- Detect files, show metadata, show redacted raw text, show diagnostics, and create textual diffs.
- Treat discoverability and visual hierarchy as product requirements: a user should be able to move from a source overview to filtered artifacts, detail, diagnostics, and comparison without first reading documentation.
- Do not behave as a validator, linter, semantic analyzer, synchronizer, converter, formatter, or auto-fixer.
- Do not execute skills, commands, hooks, plugins, workflows, or extensions.
- Do not start or connect to MCP servers.
- Preserve partially parsed and malformed artifacts instead of aborting the scan.
- Show documented scope and precedence hints, but do not claim that a candidate is actually active without the required runtime context.
- Keep Repository and Global artifacts, counts, diagnostics, snapshots, and limits separate. Do not flatten or silently merge them into a claimed effective configuration.

The Global source is not an expansion of the Repository boundary. Enabling it adds separately bounded tool-home roots while leaving the selected repository root, artifact IDs, and Repository results unchanged.

One physical file can be recognized by more than one tool:

- AGENTS.md can be recognized by OpenAI Codex and GitHub Copilot.
- CLAUDE.md can be recognized by Claude Code and GitHub Copilot.
- Some SKILL.md locations can be recognized by multiple tools.

The model must therefore separate a physical document from its tool-specific interpretations.

## 3. Official specification research

Research was based on official documentation available on 2026-07-14. Every built-in adapter should record the source URLs and the date on which its specification was reviewed. In this document, Global means local user-level configuration; managed, system, remote, organization, and hosted sources are not included in that label.

### 3.1 GitHub Copilot

Representative repository-local forms:

| Capability | Repository-local form | Format and scope |
|---|---|---|
| Repository instructions | .github/copilot-instructions.md | Plain Markdown; repository-wide |
| Path-specific instructions | .github/instructions/**/*.instructions.md | Markdown with YAML frontmatter; applyTo required, excludeAgent optional |
| Agent instructions | AGENTS.md, root CLAUDE.md, root GEMINI.md | Markdown; behavior depends on Copilot surface |
| Custom agents | .github/agents files | YAML frontmatter and Markdown |
| Skills | SKILL.md under .github/skills, .agents/skills, or .claude/skills | YAML frontmatter and Markdown; may include scripts and resources |
| Prompts and commands | .github/prompts files; Copilot CLI also recognizes .claude/commands | Surface-dependent |
| Hooks | .github/hooks JSON and settings hooks | May define commands and HTTP handlers |
| MCP | .mcp.json, .github/mcp.json, or inline agent configuration | May contain commands, environment values, URLs, and headers |
| Settings and plugins | .github/copilot/settings files and plugin metadata | JSON or JSONC |

For Copilot CLI, the local user configuration root is COPILOT_HOME when it is set, otherwise $HOME/.copilot. User-global instructions include copilot-instructions.md and instructions/**/*.instructions.md under that root. The same root can contain agents, skills, hooks, settings, MCP definitions, credentials, logs, and runtime state, so the Inspector must use exact candidate allowlists rather than recursively scanning the directory.

COPILOT_CUSTOM_INSTRUCTIONS_DIRS and COPILOT_SKILLS_DIRS can point to arbitrary extra directories. They require a separate future consent and boundary design and are not included by the MVP Global switch. GitHub.com personal instructions, organization configuration, remote skills or agents, and MDM policy are not local user-global files.

Repository-wide instructions and all matching path-specific instructions can both apply. Personal, repository, and organization instructions can also overlap. The exact supported forms vary among GitHub.com, Copilot CLI, VS Code, and other IDEs.

Important uncertainties:

- Copilot CLI does not define a general semantic winner for conflicting instructions.
- Official pages contain inconsistent descriptions of custom-agent user versus repository precedence.
- Some prompt metadata, hook ordering, and same-level MCP tie-break behavior are undocumented.
- Settings, MCP, hooks, and agent profiles may contain literal secrets.

Official references:

- https://docs.github.com/en/copilot/reference/customization-cheat-sheet
- https://docs.github.com/en/copilot/reference/custom-instructions-support
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills
- https://docs.github.com/en/copilot/reference/custom-agents-configuration
- https://docs.github.com/en/copilot/reference/hooks-reference
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference

### 3.2 Claude Code

Representative repository-local forms:

| Capability | Repository-local form | Format and scope |
|---|---|---|
| Instructions | CLAUDE.md, .claude/CLAUDE.md, CLAUDE.local.md, nested CLAUDE.md | Plain Markdown; multiple files are concatenated |
| Rules | .claude/rules/**/*.md | Markdown; optional paths YAML frontmatter |
| Skills | .claude/skills/name/SKILL.md | YAML frontmatter and Markdown; supporting scripts and resources allowed |
| Legacy commands | .claude/commands/*.md | Skill-compatible; skills are preferred for new work |
| Subagents | .claude/agents/**/*.md | YAML frontmatter and Markdown system prompt |
| Settings | .claude/settings.json and .claude/settings.local.json | JSON; permissions, hooks, plugins, and environment settings |
| Hooks | Settings, skill or agent frontmatter, or plugins | Command, HTTP, MCP, prompt, and agent handlers |
| MCP | Root .mcp.json | JSON containing mcpServers |
| Output styles and plugins | .claude/output-styles and .claude-plugin/plugin.json | Markdown or JSON |

Claude Code stores user-global configuration under CLAUDE_CONFIG_DIR when set, otherwise $HOME/.claude. The user-global instruction file is CLAUDE.md in that directory. The directory can also contain rules, settings, skills, commands, agents, output styles, plugins, history, and runtime state.

The separate $HOME/.claude.json file can mix user MCP definitions with OAuth data, trust decisions, per-project state, and caches. It is not a raw-view candidate for the MVP. Managed settings and managed CLAUDE.md files are a distinct organization or machine scope and are not included by the Global switch.

CLAUDE.md files above the working directory are concatenated from broader to more specific locations. CLAUDE.local.md follows CLAUDE.md at the same level. Files below the working directory may be loaded on demand. Conflicting natural-language instructions do not have a deterministic semantic winner.

CLAUDE.md imports can reference relative or absolute paths and recurse up to four hops. The Inspector will display import relations but will not automatically expand them. References outside the artifact's originating Repository or Global source boundary become diagnostics.

Claude Code does not directly read AGENTS.md. A Claude interpretation should only be added when a CLAUDE.md import or supported relationship establishes it.

Important uncertainties and boundaries:

- The effective configuration depends on working directory, runtime version, trust, CLI flags, and environment.
- A .claude/hooks script is not automatically a hook merely because of its path; it must be referenced by configuration.
- A standalone .claude/prompts directory is not an official Claude Code format.
- Only the optional user-global CLAUDE.md candidate listed in section 4 enters the MVP Global boundary. Other user-global .claude files and .claude.json remain outside it.

Official references:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/claude-directory
- https://code.claude.com/docs/en/env-vars

### 3.3 OpenAI Codex

Representative repository-local forms:

| Capability | Repository-local form | Format and scope |
|---|---|---|
| Instructions | AGENTS.md and AGENTS.override.md | Markdown; project root through working directory |
| Skills | .agents/skills/name/SKILL.md | YAML frontmatter and Markdown |
| Custom agents | .codex/agents/*.toml | TOML |
| Configuration | .codex/config.toml | TOML; trusted project layers |
| Hooks | .codex/hooks.json or hooks in config.toml | JSON or TOML; matching sources are merged |
| MCP | mcp_servers tables in .codex/config.toml | TOML; may contain commands, environment values, URLs, and headers |
| Rules | .codex/rules/*.rules | Starlark; experimental |
| Plugins | .codex-plugin/plugin.json and marketplace metadata | May bundle skills, MCP, hooks, and applications |
| Custom prompts | User-level prompts under Codex home | Deprecated and not repository-local |

Codex uses CODEX_HOME, defaulting to $HOME/.codex, for local user configuration and state. At the Global instruction level it reads AGENTS.override.md when non-empty, otherwise AGENTS.md. config.toml, hooks.json, rules, authentication, logs, sessions, and other state can share that root. User skills live separately under $HOME/.agents/skills.

The MVP Global switch inspects only the Global AGENTS candidate selected by the documented fallback rule. It does not scan the whole Codex home, user credentials or sessions, $HOME/.agents/skills, system configuration, managed policy, plugins, or memories.

AGENTS.md discovery is directory-sensitive. At each level, an eligible non-empty override is selected instead of the normal file; otherwise Codex checks the normal file and configured fallback names, including at most one file per directory. Selected files are combined from the Global level and then from the project root toward the current working directory.

Project .codex configuration is loaded only for trusted projects. The Inspector does not know the user's current trust decision or launch directory, so it must show candidate scope rather than claim active status.

Official references:

- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://learn.chatgpt.com/docs/config-file/config-basic
- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://learn.chatgpt.com/docs/hooks
- https://learn.chatgpt.com/docs/extend/mcp
- https://learn.chatgpt.com/docs/agent-configuration/rules
- https://learn.chatgpt.com/docs/build-plugins
- https://learn.chatgpt.com/docs/config-file/environment-variables

## 4. Initial supported forms

| Source layer | Tool | MVP form | Kind and format | Metadata |
|---|---|---|---|---|
| Repository | GitHub Copilot | .github/copilot-instructions.md | instruction, Markdown | repository scope and supported surfaces |
| Repository | GitHub Copilot | .github/instructions/**/*.instructions.md | instruction, Markdown with YAML | applyTo, excludeAgent, and unknown frontmatter keys |
| Repository | Claude Code | CLAUDE.md, .claude/CLAUDE.md, and nested CLAUDE.md | instruction, Markdown | directory, startup or on-demand hint, and unresolved imports |
| Repository | OpenAI Codex | AGENTS.md; AGENTS.override.md as a low-cost addition | instruction, Markdown | directory scope, variant, and precedence hint |
| Global | GitHub Copilot CLI | copilot-instructions.md and instructions/**/*.instructions.md under the resolved Copilot home | instruction, Markdown or Markdown with YAML | user scope, origin, applyTo, and supported surface |
| Global | Claude Code | CLAUDE.md under the resolved Claude configuration directory | instruction, Markdown | user scope, load-order hint, and unresolved imports |
| Global | OpenAI Codex | non-empty AGENTS.override.md, otherwise AGENTS.md, under the resolved Codex home | instruction, Markdown | user scope, selected variant, and load-order hint |

Repository is always enabled. Global is disabled by default and adds only the user-level instruction candidates listed above. Global settings, hooks, MCP, skills, agents, plugins, credentials, history, managed configuration, and hosted configuration remain deferred even when the switch is on.

M2 should also add Copilot interpretations to supported root CLAUDE.md and AGENTS.md files. This exercises the many-to-many physical-document model.

Recommended implementation order:

1. Repository and Global source separation, default-off state, and test-only locators
2. GitHub Copilot repository and Global instructions
3. Claude Code repository and Global instructions
4. OpenAI Codex repository and Global instructions
5. Copilot path-specific instruction and malformed frontmatter handling

The product is not release-ready until all three tools support both source layers for their initial instruction form.

## 5. Recommended defaults

### Repository and Global source decision

- Repository is always enabled and is the only source read at startup by default.
- The CLI flag --include-global sets the initial Global state for that process. The public Node API uses includeGlobal: false by default.
- The Web UI provides an Include user-global configuration switch. The switch is not persisted, so each new process starts with Global disabled unless the CLI flag is present.
- When Global is disabled, the implementation must not resolve, stat, list, or read any tool home or user home candidate.
- Enabling Global performs a fresh, independently bounded scan of exact built-in candidates. It never accepts an arbitrary root from the browser or HTTP API.
- Repository and Global have separate tabs or lanes, badges, counts, diagnostics, and snapshot revisions. Repository results and selections remain stable when Global changes.
- Repository-to-Global diff is allowed only while Global is enabled, has a source-scope label on both sides, and uses redacted content. No merged effective text is generated.
- Disabling Global cancels its in-flight scan, removes Global artifacts, diagnostics, selections, and Global-related diff cache entries, and clears shared search text and filter values that could retain Global display metadata. Repository-only selections and diffs remain valid.
- Rescan controls are scope-labeled: Repository is always available, Global is available only while enabled, and All means all currently enabled sources. All while Global is off is exactly a Repository rescan and performs no Global resolver or filesystem call.
- Public paths use symbolic forms such as global://openai-codex/AGENTS.md. Resolved home paths and environment-variable values remain private.
- The UI describes Global as local user-level configuration and states that managed, system, organization, remote, and hosted configuration is not evaluated.

### UI decision

| Criterion | Plain CLI | TUI | Local Web UI |
|---|---|---|---|
| npx launch | Excellent | Good; TTY required | Good; browser launch added |
| Long document reading | Weak | Good with terminal limits | Excellent |
| Side-by-side diff | Weak | Good only in wide terminals | Excellent |
| npm distribution | Smallest | Moderate | Requires a client bundle |
| Security | Smallest attack surface | No HTTP server | Requires loopback hardening |
| Testing | Simple | Terminal-width testing needed | Component and browser E2E needed |
| Extensibility | Limited | Moderate | Best for filtering and structured views |
| MVP cost | Low | Medium | High |

Recommendation: a thin CLI launcher with a local Web UI.

The UI value is highest for the core tasks of browsing long files, switching among raw, structured, and diagnostic views, and comparing files. Ink TUI is the principal alternative if minimizing implementation and HTTP attack surface becomes more important than viewing quality.

### Visual product direction

The visual and interaction benchmarks, reviewed on 2026-07-14, are:

- [ESLint Config Inspector](https://github.com/eslint/config-inspector), especially its [search and facet workflow](https://github.com/eslint/config-inspector/blob/c51024c46adc1e023d8db6607bb946eedd5bb8b0/app/pages/rules.vue) and [summary-first configuration items](https://github.com/eslint/config-inspector/blob/c51024c46adc1e023d8db6607bb946eedd5bb8b0/app/components/ConfigItem.vue). It demonstrates how a dense configuration surface can remain searchable, progressive, and readable.
- [Node Modules Inspector](https://github.com/antfu/node-modules-inspector), especially its [contextual detail panel](https://github.com/antfu/node-modules-inspector/blob/370a4787a55d5148383b84a3a12df0635b69fde3/packages/node-modules-inspector/src/app/components/panel/PackageDetails.vue) and [compact report rows](https://github.com/antfu/node-modules-inspector/blob/370a4787a55d5148383b84a3a12df0635b69fde3/packages/node-modules-inspector/src/app/components/report/TransitiveDeps.vue). It demonstrates clear selection, persistent navigation, compact summaries, and a focused workspace.

These projects are experience benchmarks, not templates. Agent Customization Inspector keeps an independent name, iconography, color system, information architecture, and React/Vite/plain-CSS implementation. It does not copy their source, visual assets, branding, or framework stack.

The app shell and core screens should follow these requirements:

- A persistent top bar shows the product name, a sanitized Repository label, the Repository scan state and count, a scope-labeled rescan action, a session-only theme control, and the non-persistent Include user-global configuration switch. Global always has an explicit Off, Scanning, On, Partial, or Error status, but its count appears only while enabled. Off is described as Not scanned and shows neither zero nor a former count. The switch keeps standard on or off semantics beside a concise disclosure of included and excluded Global scope. The bar never displays an absolute home path or a tool-home environment value.
- Primary destinations are Overview, Artifacts, Compare, and Diagnostics. Tool and format values are facets inside those views, not hard-coded vendor tabs.
- Overview uses compact summary blocks for Repository and, only while enabled, Global. It shows artifact totals by tool and kind, diagnostic severity counts, scan status, and limit warnings without presenting a merged effective total as the main result.
- The primary result total counts distinct physical documents. Each tool or kind facet count is the number of distinct documents with at least one matching interpretation; one document can therefore appear in multiple facet buckets, and facet subtotals are explicitly non-additive. Selecting a facet never duplicates its catalog row.
- Artifacts uses a searchable, filterable summary catalog beside a contextual detail workspace on wide screens. Each row exposes a monospaced virtual path, source badge, tool interpretations, kind, format, redaction state, and diagnostic count before selection. Long paths wrap or use a middle ellipsis, remain fully available on focus or selection, and never force body-level horizontal scrolling.
- Search covers only bounded, already-redacted display metadata: virtual path, display name, tool, kind, format, and diagnostic code. A roughly 200 ms debounce, active filter chips, visible result and total counts, a clear-all action, and a specific zero-result explanation make filter state obvious. Raw artifact text is never copied into the search index.
- The detail workspace has a sticky artifact header and Summary, Structured, Raw (redacted), and Diagnostics tabs. Raw content is rendered as text in pre/code elements, with line numbers and a wrap control, rather than injected HTML. Artifact-derived links in Structured content are inert text and never navigate or initiate a request. A contextual Compare action sends the selected artifact to an explicit left or right side.
- Catalog responses contain summaries, not document text. Selecting an artifact fetches one revision-checked detail on demand. Raw (redacted) windows line rows with at most 400 mounted at once; line numbers are hidden from assistive technology, while labeled range and jump controls announce the visible lines and total. A line longer than 20,000 UTF-16 code units defaults to internal horizontal scrolling rather than soft wrap.
- Structured uses independent bounded renderers. Markdown preview accepts at most 256 KiB and 5,000 rendered nodes. Already-bounded public metadata is traversed iteratively and expanded lazily, with bounded visible depth, scalar preview, aggregate display text, and mounted rows. The ArtifactDocument reports whether structured metadata is complete, partial, or unavailable; when a presentation or model cap is reached, the tab shows its diagnostic and directs the user to the complete windowed Raw view instead of recursively mounting the remaining tree.
- Compare has two always-labeled selectors, persistent Repository or Global badges on both sides, unified and side-by-side modes, and bounded unchanged context. Narrow screens use unified mode rather than compressing an unreadable side-by-side diff.
- Diff runs outside the UI thread with byte, line, line-pair, and wall-time budgets. A limit or timeout produces a designed diagnostic state and never a partial diff presented as complete.
- Diagnostics is available both as an artifact tab and as a source-aware aggregate view. Severity, source, tool, code, and artifact facets remain visible, and a Global failure never replaces the Repository workspace with a full-page failure. Aggregate rows are windowed or paged with a stable total and overflow summary; the view never mounts the maximum stored diagnostics at once.
- Loading, scanning, Global-off, empty, no-match, partial, limit-reached, stale, and fatal states each have an explicit title, explanation, and next safe action. The interface never relies on a blank pane or spinner alone.

The visual and interaction system should follow these requirements:

- Use CSS custom properties for spacing, typography, surfaces, borders, focus, source identity, tool accents, and diagnostic severity. Neutral surfaces carry most of the hierarchy; color is a secondary signal.
- Use local system UI and monospace font stacks and a small, locally bundled SVG icon set. The client loads no remote fonts, icons, images, analytics, or other visual assets.
- Treat paths, filenames, metadata, raw text, and diff text as untrusted bidirectional content. Labels use bdi or equivalent isolation and unicode-bidi: plaintext. Catalog and metadata labels visibly escape line breaks, C0/C1 controls, and bidirectional formatting controls; Raw and diff preserve tab and line boundaries but visibly escape other controls. This presentation transform does not change the redacted model value or the bytes compared.
- Default to the OS light or dark preference and allow a session-only override. Theme state is independent from inspected session state and must not persist or restore Global state.
- Target WCAG 2.2 AA contrast and semantics. Source, selection, severity, and disabled state are communicated with text and shape or icon changes as well as color. Focus indicators remain visible in both themes.
- Interactive summary blocks, facets, and filter chips use native buttons, inputs, fieldsets, and selected-state semantics rather than clickable div elements. Scan-state changes use a polite live region without repeatedly announcing unchanged counts.
- Core flows work with keyboard only. The search field has a visible label and / shortcut; native controls are preferred; composite widgets support documented arrow, Enter, and Escape behavior; closing a panel or disabling Global restores focus to a safe visible control.
- Honor prefers-reduced-motion. Motion is limited to short state transitions and never carries essential meaning; animated charts and decorative graph motion are outside the MVP.
- At 1280 CSS pixels and wider, use a stable catalog-and-detail workspace. From 768 to 1279 pixels, the catalog becomes a dismissible drawer. Below 768 pixels, use a single-pane drill-in flow with no body-level horizontal overflow.
- Below 768 pixels, the compact product mark, with the full product name as its accessible name, and the Global switch plus text status remain directly visible. The Repository label moves to the source summary with middle ellipsis, task navigation wraps without horizontal scrolling, and Rescan, theme, and scope disclosure move into a labeled More menu. Every moved action remains keyboard-accessible and has a visible text name.
- At maximum catalog or diagnostic limits, do not mount every row at once. Window or page the result set while exposing total position and count to assistive technology and keeping keyboard focus stable.
- Selection, filter text, Global artifact IDs, and diff pairs remain in memory only. Browser URLs contain coarse route names at most, never inspected paths, metadata, content, environment values, or Global identifiers. Back and forward navigation cannot restore Global-derived state after Global is disabled.

Reference features that conflict with this product are intentionally excluded: automatic watch mode, deployable or online snapshots, dependency graphs, merged effective-configuration simulation, external service cards, persistent inspected-state settings, and workspace-wide file enumeration. The polished inspector experience is the target; those products' domain-specific behavior is not.

### Technical defaults

| Decision | Recommendation |
|---|---|
| Node.js | At least 22.12.0; develop on 24 LTS; CI on 22.12 and 24 |
| Package manager | npm with committed package-lock.json |
| Module format | ESM only |
| Primary UI | Local Web UI with thin CLI launcher |
| Client framework | React and Vite with plain CSS |
| Information architecture | Overview, Artifacts, Compare, and Diagnostics in a source-aware app shell |
| Visual system | Independent CSS tokens, system font stacks, locally bundled icons, and light and dark themes |
| Accessibility | WCAG 2.2 AA target, semantic native controls, and keyboard-complete core flows |
| Browser state | Coarse routes only; inspected selections, filters, and diff state stay in memory |
| Catalog scale | Bounded windowing or pagination; never mount the maximum catalog all at once |
| Content delivery | Summary catalogs; revision-checked redacted detail and diff on demand |
| Heavy diff work | Abortable node:worker_threads worker with deterministic limits and timeout |
| HTTP server | Native node:http |
| CLI parser | gunshi |
| Discovery | Custom bounded walker using node:fs/promises opendir and lstat |
| Markdown | react-markdown and remark-gfm; raw HTML, images, and artifact-link navigation disabled |
| YAML | yaml parseDocument |
| JSON | JSON.parse |
| JSONC | jsonc-parser when needed |
| TOML | smol-toml when Codex config support is added |
| Diff | diff, also known as jsdiff |
| Unit and integration tests | Vitest |
| Browser E2E | Playwright |
| Lint and format | ESLint flat config, typescript-eslint, and Prettier |
| Build | tsup for Node and Vite for browser assets |
| License | Existing MIT |
| Node API | Public read-only core API |
| Package layout | CLI, core, and built-in adapters in one package |
| Monorepo | No |
| Global inspection | Explicit opt-in; default off and not persisted |
| Global CLI option | --include-global |
| Global API option | includeGlobal: false by default |

Node 20 is EOL and Node 22 and 24 are LTS. Current [gunshi](https://gunshi.dev/guide/introduction/setup) requires Node 22 or later and ESM, while current [Vite](https://vite.dev/guide/) requires Node 22.12.0 or later on the Node 22 line. The proposed Node 22.12.0 floor satisfies both.

Proposed package scripts:

    {
      "dev": "node scripts/dev.mjs",
      "build": "npm run build:node && npm run build:web",
      "build:node": "tsup",
      "build:web": "vite build",
      "typecheck": "tsc --noEmit",
      "lint": "eslint . --max-warnings=0",
      "format": "prettier --check .",
      "format:write": "prettier --write .",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "test:e2e": "playwright test",
      "check:package": "publint && attw --pack . && npm pack --dry-run",
      "check": "npm run format && npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e && npm run check:package",
      "prepack": "npm run build",
      "prepublishOnly": "npm run check"
    }

Proposed package distribution:

- bin points agent-customization-inspector to dist/cli.js.
- Root exports expose the read-only core API and types.
- An adapter subpath exports the trusted-caller adapter contract.
- main is dist/index.js and types is dist/index.d.ts.
- Published files are dist, bilingual docs, README.md, README.ja.md, LICENSE, and future SECURITY.md and SECURITY.ja.md files.
- Source, tests, fixtures, and development configuration are excluded from the tarball.

## 6. Proposed MVP

Expected launch:

    npx agent-customization-inspector [path] [--include-global]

Flow:

1. Canonicalize the selected repository path; use cwd when omitted.
2. Create a bounded Repository snapshot without resolving any user or tool home.
3. Start a loopback-only server on a random port.
4. Open the browser, or print the URL with --no-open.
5. Start with Global disabled unless --include-global was supplied.
6. Land directly on the Artifacts workspace with a Repository summary strip and catalog, not an empty welcome screen.
7. When the user enables Global, resolve only the three built-in tool homes and create a fresh, separately bounded Global snapshot from exact instruction candidates.
8. Group and filter artifacts by source layer, tool, kind, format, virtual path, and diagnostic state while showing active filters and result counts.
9. Select a summary row to open structured metadata, Raw (redacted), and diagnostics in the contextual detail workspace with a persistent Repository or Global badge.
10. Open aggregate Diagnostics without losing the current catalog context.
11. Select any two available text artifacts for unified or side-by-side diff, with swap and reset actions. Cross-source diff is available only while Global is enabled.
12. When Global is disabled, cancel its scan, clear shared search and filter state, return focus and navigation to a Repository-safe state, and discard its snapshot, detail-store entries, search index, selections, diagnostics, and derived diff data without changing the Repository snapshot.

Required fixtures:

- Copilot repository instruction
- Copilot path-specific instruction
- Claude Code instruction
- Codex instruction
- Copilot, Claude Code, and Codex user-global instruction candidates
- Same-named Repository and Global artifacts to verify source separation
- One physical AGENTS.md document recognized by both Copilot and Codex to verify non-additive interpretation facets
- Multiple files for same-tool diff
- Cross-tool comparison
- Repository-to-Global comparison
- Malformed YAML frontmatter
- Secret sentinel
- A fake home whose path itself contains a secret sentinel
- Global disabled filesystem-call sentinel
- Valid, missing, relative, unreadable, and overlapping tool-home overrides
- Unknown file
- Oversized file, invalid UTF-8, and symlink cases

Unsupported-file rule:

- Documented adapter pattern plus parser: supported
- Documented pattern without metadata parser: raw-only
- Pattern match with parse failure: keep artifact and add diagnostic
- Arbitrary unknown file: ignore
- Binary, skipped symlink, unreadable file, or limit breach: scan diagnostic
- Unsupported files elsewhere in a tool home, outside the declared candidates: do not discover or read
- Managed, system, hosted, remote, and arbitrary extra-directory lists from environment variables: do not inspect in MVP

The UI raw view means syntax-preserving Raw (redacted). MVP does not expose unredacted content.

## 7. Architecture and data flow

    CLI repository path and options
      -> Repository root canonicalization
      -> bounded read-only Repository discovery
      -> adapter registry and relative-path matching
      -> bounded UTF-8 read
      -> pure adapter parsing
      -> Repository physical documents plus tool interpretations
      -> redaction and normalization
      -> Repository redacted detail store plus summary catalog snapshot

    Explicit Global opt-in
      -> built-in tool-home resolution
      -> exact allowlisted Global candidates
      -> separately bounded UTF-8 reads
      -> pure adapter parsing
      -> Global physical documents plus tool interpretations
      -> redaction and normalization
      -> Global redacted detail store plus summary catalog snapshot

    Repository summary snapshot plus optional Global summary snapshot
      -> source-aware in-memory session
      -> loopback HTTP API
      -> React Inspector UI

    Selected opaque artifact ID
      -> revision and source-state check
      -> one redacted ArtifactDocument
      -> Inspector UI

    Two selected opaque artifact IDs
      -> revision and source-state checks
      -> bounded abortable diff worker over redacted content
      -> Inspector UI

    Every processing stage
      -> recoverable diagnostic collector

Architectural boundaries:

- Only discovery and core read the filesystem.
- The Global source resolver is not called while Global is disabled; this includes avoiding stat or existence checks under user and tool homes.
- Repository and each resolved tool home are independent canonical roots. Enabling Global never widens the Repository root.
- Global discovery opens only built-in exact candidates and declared bounded subdirectories. It never recursively walks a home or tool-home root.
- Repository and Global catalogs, diagnostics, revisions, and limit budgets remain separate. A Global failure cannot fail or replace the Repository snapshot.
- Each source collector stores at most the configured number of detailed diagnostics. After that boundary it retains bounded severity and overflow totals plus one DIAGNOSTIC_LIMIT_REACHED summary, without retaining more attacker-controlled messages or paths.
- A source-specific rescan commits only that source and its revision. An All rescan builds candidates for the currently enabled sources and publishes one atomic session revision after all settle. A Global partial or error result can publish beside a successful Repository candidate; an error carries no previous Global catalog, count, or detail values, while a partial catalog is labeled Partial. A fatal Repository result preserves the previous pair. Any stale expected revision discards every candidate without a partial commit.
- Adapters receive source descriptors, virtual paths, and bounded text, not environment values or arbitrary filesystem access.
- Before metadata enters an ArtifactDocument or HTTP response, core normalizes it iteratively within node, depth, scalar-byte, and serialized-byte budgets. A breach returns a bounded partial object, or an empty object when no structured value can be retained safely, sets metadataStatus, and emits a diagnostic; JSON serialization never receives the unbounded parse tree, while complete redacted Raw text remains available.
- Adapters do not receive environment, network, or process execution capabilities.
- The inspected repository cannot supply executable adapters or plugins.
- Adapter failures are caught per artifact.
- Unredacted values never reach HTTP responses, diff, logs, or normal serialization.
- Absolute home paths, usernames, and tool-home override values never reach public artifacts, diagnostics, logs, HTTP responses, or IDs.
- The UI is driven by adapter metadata and has no fixed vendor tabs.
- Catalog and search surfaces receive ArtifactSummary values only. ArtifactDocument detail and diff results are fetched on demand after opaque-ID, expected-revision, and source-enabled checks.
- The client does not prefetch document text. It retains at most the active ArtifactDocument and active DiffResult and releases replaced selections. Reset clears both. Otherwise, it invalidates a detail or diff only when a referenced source is disabled or that source catalog's ID or revision changes. Disabling or rescanning Global clears Global-dependent detail and diff state but preserves Repository-only detail and diff state while the Repository catalog is unchanged; the inverse rule applies to a Repository rescan.
- Client search indexes only bounded redacted display metadata and is scoped to a snapshot. A Global index is created only after opt-in and is destroyed with the Global snapshot.
- Artifact selection, filter text, diff pairs, and Global identifiers remain in volatile client state; URLs carry coarse view names only and cannot recreate discarded source state.
- Raw (redacted) uses text nodes or pre/code rendering. Structured Markdown remains sanitized, and neither view may inject artifact-derived HTML.
- MVP uses snapshot scanning, not watch mode.
- Global enable performs a fresh scan. Global disable aborts stale work and evicts all Global-derived state; the preference is not persisted.
- Fatal errors are limited to cases such as an invalid root or inability to bind the local server.

### Session HTTP contract

- POST /api/session/global accepts only enabled and expectedRevision. POST /api/session/rescan accepts only source (repository, global, or all) and expectedRevision. Global while disabled returns GLOBAL_DISABLED without invoking its resolver; all while disabled has Repository-only semantics.
- POST /api/session/artifact accepts only id and expectedRevision. POST /api/session/diff accepts only leftId, rightId, expectedRevision, and a bounded contextLines value. These read-only POST routes keep identifiers out of browser location and history URLs and return only redacted, source-valid results.
- State-changing requests accept no filesystem path. They require the session token, valid Host and Origin, application/json, a bounded body, and the current expected revision. Stale revisions fail without changing state.
- Detail and diff POST requests use the same session-token, Host, Origin, content-type, body-size, and expected-revision checks even though they do not mutate state.
- A Global snapshot request while Global is disabled returns a generic GLOBAL_DISABLED result with no old counts, candidate roots, or path metadata.
- Artifact, snapshot, diagnostic, and diff responses use Cache-Control: no-store. The UI does not place inspected content in localStorage, IndexedDB, a service worker cache, or another persistent browser store.
- Disabling Global clears reachable Global state, detail-store entries, shared search and filter values, filter indexes, navigation selections, and caches on both server and client. It cannot retroactively retract bytes already delivered to a browser, and JavaScript cannot guarantee immediate memory zeroization; both limits must be documented.

## 8. Artifact and adapter model

The public model is file-centric and contains multiple interpretations. Catalog responses carry summaries only; full redacted content and interpretation metadata are fetched for the selected artifact on demand:

    interface ArtifactSummary {
      schemaVersion: 1;
      source: {
        layer: "repository" | "global";
        id: string;
        label: string;
        virtualBase: string;
      };
      id: string;
      path: {
        relative: string;
        basename: string;
        virtual: string;
      };
      format: {
        id: string;
        mediaType: string;
        encoding: "utf-8";
      };
      interpretationSummaries: Array<{
        tool: { id: string; label: string };
        kinds: string[];
        support: "supported" | "partial" | "raw-only";
      }>;
      diagnosticCounts: Record<"info" | "warning" | "error", number>;
      diagnosticCodes: string[];
      redactionApplied: boolean;
      securityFlags: string[];
    }

    interface ArtifactDocument extends ArtifactSummary {
      content: {
        displayText: string;
        byteLength: number;
        newline: "lf" | "crlf" | "mixed" | "none";
        redactions: Redaction[];
      };
      interpretations: ArtifactInterpretation[];
      diagnostics: Diagnostic[];
    }

The source id and artifact id are opaque. Global virtual paths use forms such as global://github-copilot/copilot-instructions.md. Resolved roots and absolute source paths exist only in private discovery state and are never hashed into a public identifier.

The public session snapshot preserves the source boundary:

    interface InspectorSessionOptions {
      repositoryRoot: string;
      includeGlobal?: boolean;
    }

    interface CatalogSnapshot {
      id: string;
      revision: number;
      source: "repository" | "global";
      artifacts: ArtifactSummary[];
      diagnostics: Diagnostic[];
    }

    type GlobalSnapshotState =
      | { enabled: false; status: "disabled" }
      | { enabled: true; status: "scanning" }
      | { enabled: true; status: "ready"; catalog: CatalogSnapshot }
      | { enabled: true; status: "partial"; catalog: CatalogSnapshot }
      | { enabled: true; status: "error"; diagnostics: Diagnostic[] };

    interface SessionSnapshot {
      schemaVersion: 1;
      revision: number;
      repository: CatalogSnapshot;
      global: GlobalSnapshotState;
    }

includeGlobal defaults to false. Disabled, scanning, and error Global states expose no former catalog, candidate roots, counts, or path metadata. The error variant carries only sanitized source-level diagnostics. Ready and partial states require a Global CatalogSnapshot, and a partial catalog remains explicitly labeled Partial.

    interface InspectorSession {
      setGlobalEnabled(enabled: boolean, expectedRevision: number): Promise<void>;
      rescan(
        source: "repository" | "global" | "all",
        expectedRevision: number,
      ): Promise<void>;
      getSnapshot(): SessionSnapshot;
      getArtifact(id: string, expectedRevision: number): Promise<ArtifactDocument>;
      getDiff(
        leftId: string,
        rightId: string,
        expectedRevision: number,
        options?: { contextLines?: number },
      ): Promise<DiffResult>;
    }

    interface ArtifactInterpretation {
      adapterId: string;
      tool: { id: string; label: string };
      kind: string;
      facets: string[];
      variant: string;
      support: "supported" | "partial" | "raw-only";
      scope: {
        origin: "repository" | "directory" | "user" | "managed" | "unknown";
        base?: string;
        activation: "startup" | "conditional" | "on-demand" | "unknown";
        appliesTo?: string[];
        precedenceHint?: string;
        resolutionConfidence: "documented" | "partial" | "unknown";
      };
      metadata: Record<string, JsonValue>;
      metadataStatus: "complete" | "partial" | "unavailable";
      documentation: {
        status: "documented" | "assumption" | "undocumented" | "unsupported" | "deferred";
        reviewedAt: string;
        sources: string[];
      };
      diagnostics: Diagnostic[];
    }

Exact original text exists only in a short-lived internal SourceDocument during parsing and redaction. It is not retained in a catalog snapshot, detail store, or default JSON. The source-owned detail store retains only redacted ArtifactDocument values and serves one selected document or bounded diff input after revision and source-state checks. A disabled Global source makes every former Global detail ID fail generically. A security or scan limit breach skips affected content or marks bounded public metadata partial with an explicit diagnostic instead of silently truncating it. Structured presentation caps affect only that presentation; an accepted ArtifactDocument keeps its complete redacted displayText.

Minimal adapter contract:

    interface ArtifactAdapter {
      readonly manifest: AdapterManifest;
      readonly candidates: readonly CandidateSpec[];

      match(entry: DiscoveryEntry): readonly AdapterMatch[];

      inspect(input: {
        source: { layer: "repository" | "global"; locatorId: string };
        entry: DiscoveryEntry;
        match: AdapterMatch;
        text: string;
        signal: AbortSignal;
      }): Promise<AdapterInspection>;
    }

    interface AdapterManifest {
      id: string;
      tool: { id: string; label: string };
      supportedKinds: readonly string[];
      supportedSources: readonly ("repository" | "global")[];
      specSources: readonly string[];
      documentedAsOf: string;
      capabilities: {
        discovery: "full" | "partial";
        metadata: "full" | "partial" | "none";
        rawView: true;
      };
    }

Tool IDs, kinds, formats, and built-in locator IDs are open strings so unknown future values can still be displayed. Adapters declare candidates for each supported source but never resolve environment variables or roots themselves. Every Global candidate names exactly one trusted built-in locator ID, Repository candidates cannot name a Global locator, and a bounded Global directory must begin below the tool-home root. This prevents one tool's candidate from probing an unrelated tool home.

## 9. Proposed directory structure

    src/
      cli.ts
      index.ts

      core/
        inspector.ts
        session.ts
        snapshot.ts
        model.ts
        registry.ts
        catalog.ts
        detail-store.ts
        diagnostics.ts
        limits.ts

      discovery/
        walk.ts
        root-boundary.ts
        read-text.ts

      sources/
        repository-source.ts
        global-source.ts
        tool-homes.ts
        virtual-path.ts

      adapters/
        index.ts
        github-copilot/
        claude-code/
        openai-codex/

      parsing/
        frontmatter.ts
        markdown.ts

      security/
        redact.ts
        sensitive-keys.ts

      diff/
        text-diff.ts
        worker.ts

      server/
        server.ts
        routes.ts
        headers.ts
        session-token.ts

      web/
        app/
          shell/
          state/
        components/
          catalog/
          detail/
          diagnostics/
          diff/
          shared/
          source/
        views/
          overview/
          artifacts/
          compare/
          diagnostics/
        styles/
          tokens.css
          global.css

    tests/
      unit/
      contract/
      integration/
      security/
      e2e/
      fixtures/
        repository/
        global-home/

    docs/
      architecture.md
      architecture.ja.md
      supported-formats.md
      supported-formats.ja.md
      adding-an-adapter.md
      adding-an-adapter.ja.md
      security.md
      security.ja.md
      ui-design.md
      ui-design.ja.md

    scripts/
      dev.mjs

## 10. Dependencies

Production runtime dependencies:

- gunshi: declarative, type-safe CLI parsing and generated help and version output
- yaml: diagnostic-capable YAML frontmatter parsing
- diff: bounded text diff
- open: open only the internally generated loopback URL

The browser client is fully bundled by Vite. Its build inputs can remain development dependencies:

- react
- react-dom
- react-markdown
- remark-gfm
- rehype-sanitize

Raw HTML support is not included. Images are not rendered, and every artifact-derived link target is displayed as inert redacted text without an href or another navigation action.

Development dependencies:

- typescript and type packages
- tsup
- vite and the React Vite plugin
- tsx and concurrently
- vitest and V8 coverage
- React Testing Library, user-event, and jsdom
- Playwright
- @axe-core/playwright
- fast-check
- ESLint, typescript-eslint, and React hooks linting
- Prettier
- publint and Are The Types Wrong

Add only when the corresponding artifact formats are implemented:

- jsonc-parser for Copilot JSONC
- smol-toml for Codex TOML

Do not add an MCP SDK, plugin loader, shell execution library, or network client.

The benchmark products do not make their UI stacks dependencies of this project. Do not add Nuxt, Vue, UnoCSS, Shiki, Fuse.js, D3, a remote font package, or a remote icon service for visual similarity alone. The MVP search can use normalized matching over bounded redacted metadata, and the Raw (redacted) viewer must remain a text renderer.

Global source resolution needs no new runtime dependency. Use node:os, node:path, and the existing bounded filesystem primitives. Do not add a generic home-directory globber, configuration loader, credential reader, or library that expands environment placeholders.

## 11. Implementation milestones

### M1: Development foundation and security spine

- Record approved persistent decisions in the repository root AGENTS.md.
- Add package, build, test, lint, and format configuration.
- Add source-aware artifact summary, on-demand detail-store, adapter, catalog, and session snapshot contracts.
- Add separate Repository and Global source contracts with Global disabled by default.
- Add safe walker, limits, diagnostics, virtual-path sanitization, test-only tool-home resolvers, and a test-only adapter.

### M2: Three-tool headless vertical slice

- Add Copilot, Claude Code, and Codex adapters.
- Add Repository and user-global instruction candidates for all three tools.
- Add frontmatter parsing, multi-tool interpretations, and documented cross-source load-order hints.
- Add redaction and text diff.
- Add the public read-only Node API, includeGlobal option, separated summary snapshots, revision-checked on-demand redacted detail and diff, and redacted JSON output.

### M3: Local Web Inspector

- Add the CLI launcher, --include-global option, and native loopback server.
- Add the task-based app shell, source summary, and Overview, Artifacts, Compare, and Diagnostics views; make Artifacts the useful data-first landing view.
- Add the non-persistent Global switch and separate Repository and Global catalog facets, result counts, detail tabs, and aggregate diagnostics.
- Add the tokenized light and dark visual system, designed loading and recovery states, bounded catalog rendering, and desktop, tablet, and narrow layouts.
- Add keyboard-complete navigation, visible and restored focus, semantic status announcements, reduced-motion behavior, and automated accessibility smoke tests.
- Add unified and side-by-side diff with symmetric selectors, swap and reset actions, including clearly labeled cross-source diff while Global is enabled.
- Add fresh enable scans, cancellation and eviction on disable, and stale-request protection.
- Add loopback security, browser functional E2E, accessibility, and deterministic visual-regression tests.

### M4: Hardening and release preparation

- Add cross-platform, security, and package tests.
- Harden COPILOT_HOME, CLAUDE_CONFIG_DIR, CODEX_HOME, missing-home, overlap, and platform-specific path handling.
- Complete the bilingual README, support matrix, adapter guide, UI design, and security documentation pairs.
- Test the packed tarball.
- Trace every MVP completion requirement to evidence.

M1 was explicitly authorized on 2026-07-15, and the approved persistent decisions are recorded in the root AGENTS.md. Implement M1 only. M1 completion does not authorize M2, and work must not proceed automatically to a later milestone.

## 12. Milestone completion criteria

### M1

- Every format, lint, typecheck, unit, contract, and Node build command available in M1 passes on Node 22.12 and 24. The final aggregate npm run check becomes mandatory after its UI and E2E targets exist.
- Root escape is prevented.
- All symlinks are skipped in MVP.
- Entry, depth, file size, total-read, and per-source diagnostic limits work.
- Permission errors and adapter exceptions produce recoverable diagnostics.
- With includeGlobal omitted or false, the Global resolver is never called and no filesystem operation touches the fake user home.
- Repository and Global snapshots have independent identities, revisions, diagnostics, and failure handling.
- Absolute home paths and tool-home override values never appear in public diagnostics or serialization.

### M2

- A mixed fixture detects representative Repository and Global instruction forms for all three tools.
- Every catalog summary reports source layer, tool, kind, virtual and relative path, format, support, diagnostic counts, and whether redaction was applied; on-demand detail returns redacted raw text, complete interpretations, and metadata after a revision check.
- Malformed frontmatter leaves the artifact visible and adds a parse diagnostic.
- Same-tool and cross-tool diff both work.
- The canonical serialization of the Repository CatalogSnapshot is byte-for-byte stable when Global is toggled, and Global errors do not enter the Repository catalog.
- Copilot, Claude Code, and Codex report documented load-order or co-application hints without claiming a semantic winner.
- A document recognized by both Copilot and Codex appears once in the catalog, once in the primary result total, and once in each matching tool facet count; facet subtotals are not presented as additive.
- Sentinel secrets are absent from JSON, diff, diagnostics, and logs.
- The public Node API and package exports work with includeGlobal defaulting to false.

### M3

- The packaged CLI can start the UI, and gunshi-generated CLI help documents --include-global as an opt-in initial state.
- Overview, Artifacts, Compare, and Diagnostics work, with Artifacts as the data-first landing view and no fixed vendor navigation.
- Metadata-only search, active facets, result counts, clear-all, catalog selection, Summary, Structured, Raw (redacted), and artifact Diagnostics work without indexing raw content.
- At 1440 x 900, the top bar, source summary, navigation, catalog, and detail hierarchy render without overlap. At 1024 x 768, the catalog and facets use the defined drawer layout. At 390 x 844, the Global switch and status remain visible, the Repository label is safely elided, task navigation wraps, the labeled More menu exposes Rescan, theme, and disclosure, core flows have no body-level horizontal scroll, detail has explicit back navigation, and Compare defaults to unified diff.
- The UI starts with Global off unless --include-global supplied the initial state, separates Repository and Global counts and views, and does not persist the switch. Global Off is labeled Not scanned and exposes neither zero nor a former count; a successful disable removes the prior count before the next rendered state.
- Enable performs a fresh scan; disable can interrupt scanning, clears shared search and filter values, restores focus to a Repository-safe control, and removes every reachable Global-derived detail-store entry, search index, selection, navigation state, and server or client cache entry.
- Repository-only selected detail and diff remain available and unchanged across Global transitions; cross-source diff is rejected while Global is off, and symmetric selectors, swap, reset, unified, and side-by-side behavior work.
- A keyboard-only user can filter and select an artifact, switch detail tabs, construct a comparison, inspect diagnostics, enable and disable Global, close a drawer, and recover from every recoverable state with visible focus.
- Automated accessibility smoke tests find no serious or critical violations on the four primary views and Global control states; every other finding is fixed or recorded with evidence as a verified false positive. Manual keyboard and screen-reader review confirms logical order, focus restoration, announcements, and non-color status cues.
- The canonical visual-regression suite passes in a pinned Linux, Chromium, font, locale, clock, color-scheme, and reduced-motion environment; baseline changes require human review.
- A stress fixture with 5,000 Repository artifacts, 1,000 Global artifacts, and the per-source diagnostic maximum never mounts the entire catalog or diagnostic list at once and preserves search, totals, selection, and keyboard focus.
- Unknown tool, kind, and format values render with fallback labels.
- No external network request is made.
- Browser security tests pass.

### M4

- The English and Japanese README files document installation, usage, support, limits, and security consistently.
- The bilingual support matrix, adapter guide, UI design, and security documentation pairs exist.
- CI passes on Linux, macOS, and Windows for Node 22.12 and 24.
- The package tarball contains only intended files.
- Every documented MVP completion requirement has traceable verification evidence.
- Tool-home overrides and missing or unreadable Global candidates fail safely on every supported platform without revealing absolute home paths.

## 13. Testing and verification

Unit tests:

- Path normalization, root boundary, and limits
- Adapter matching and parsing
- Multi-tool interpretation merging
- Frontmatter error recovery
- Redaction
- Diff handling for CRLF, trailing newline, Unicode, and empty files
- Display isolation and visible escaping for mixed-direction text, newline-bearing filenames, C0/C1 controls, and bidirectional override or isolate controls
- Diff byte, line, line-pair, abort, and worker-timeout limits without partial-result leakage
- Iterative public-metadata normalization and Structured Markdown or metadata-tree input, node, depth, scalar, serialized-byte, and mounted-row caps

Adapter contract tests:

- Exceptions do not escape the artifact boundary.
- Bounded metadata and metadataStatus remain JSON-compatible, and serialization never receives an unbounded parse tree.
- Diagnostics contain no absolute path, source snippet, or secret.
- Unknown metadata keys within the public-model budgets are retained; an overflow sets partial status and a diagnostic.

Filesystem integration tests:

- Root-external symlink
- Symlink loop and Windows junction behavior
- Repository-to-Global, Global-to-Repository, and Global-to-external symlinks
- Overlapping Repository and tool-home roots without catalog merging
- Unreadable file
- Deep tree and large file
- One 1 MiB line, hundreds of thousands of short lines, deeply nested Markdown, deep and wide metadata, a diagnostic flood beyond the per-source cap, and adversarial alternating diff lines
- Invalid UTF-8, NUL bytes, and YAML alias abuse
- Missing, relative, malformed, unreadable, and custom tool-home environment values

Source isolation and state tests:

- includeGlobal omitted or false causes zero Global resolver and fake-home filesystem calls.
- Enabling Global performs a fresh scan and does not change Repository artifact IDs, ordering, revision, or selection.
- Disabling Global aborts in-flight work, clears shared search and filter values, and evicts its catalog, detail store, diagnostics, search index, navigation state, stale IDs, and Global-related diff cache.
- Rapid off-on-off and off-on-off-on transitions cannot restore a stale Global result.
- After enable, Global selection, and disable, back, forward, and reload cannot restore a Global count, ID, selection, filter term, detail, or diff; the URL remains a coarse safe route.
- Repository and Global rescans change only their own revisions; an all-scope rescan swaps a consistent pair.
- Detail and diff invalidation follows referenced source catalog IDs and revisions: a Global transition clears only Global-dependent values while Repository-only values survive an unchanged Repository catalog, and a Repository rescan applies the inverse rule.
- Disabled, scanning, and error Global snapshot variants contain no catalog or count; ready and partial variants require a Global CatalogSnapshot, and error carries only sanitized source-level diagnostics.
- With Global off, an all-scope rescan is byte-equivalent to a Repository rescan and makes zero Global resolver or fake-home filesystem calls.
- An all-scope Global partial or error result can publish with a successful Repository candidate; Global Error exposes no previous catalog, count, or detail, while a fatal Repository result and any stale expected revision leave the previous pair unchanged.
- Global permission, parsing, and limit failures do not enter or fail the Repository snapshot.

Security tests:

- Hooks, scripts, commands, and MCP configurations contain sentinels that would create a marker if executed; no marker may be created.
- Fixture hashes are identical before and after scanning.
- Secret sentinels do not appear in stdout, stderr, snapshots, API responses, or packaged output.
- A fake absolute home containing a username or secret sentinel does not appear in stdout, stderr, logs, IDs, diagnostics, API responses, snapshots, diffs, or Playwright traces.
- Mixed-direction filenames, metadata, Raw text, and diff lines cannot reorder surrounding UI labels or conceal source and severity badges; control characters are visibly escaped at presentation time.
- Any external HTTP request fails the test.
- Clicking or keyboard-activating every artifact-derived Markdown link leaves location and browser state unchanged and makes no request.
- Host, Origin, session-token, content type, body size, expected-revision, Cache-Control, path-traversal, and CSP behavior is tested.
- Malicious HTTP input cannot enable Global with an arbitrary path, and stale Global IDs return no content after disable.
- Catalog responses contain no displayText, and on-demand detail or diff requests with a stale revision, disabled source, or evicted ID return no former content.
- Browser URLs, history entries, storage, document titles, accessible names, and screenshot baselines contain no inspected absolute path, environment value, unredacted content, real user search text, secret sentinel, or Global artifact ID.

UI and package tests:

- React component tests for the app shell, source summaries, search, facet chips, result counts, Global states, catalog selection, detail tabs, diagnostic grouping, and designed loading, empty, partial, limit, stale, and fatal states
- Playwright functional tests for Overview, Artifacts, Compare, and Diagnostics; initial Global-off behavior; fresh enable; mid-scan disable; process restart; back, forward, and reload after disable; scope-separated results; drawer and drill-in navigation; keyboard workflows; and both diff modes
- @axe-core/playwright smoke tests in light and dark themes for the four primary views and Global control states, plus manual keyboard and screen-reader checks for focus order, restoration, announcements, and non-color cues
- Screenshot regression tests at 1440 x 900, 1024 x 768, and 390 x 844 in a pinned Linux and Chromium environment with fixed local fonts, locale, clock, color scheme, and reduced motion
- Canonical screenshots cover Repository-only Artifacts with selected detail, Global scanning and enabled states, malformed content, side-by-side Compare, partial or limit Diagnostics, narrow detail drill-in, and narrow unified Compare
- Visual baselines use synthetic fixtures and virtual paths only. They contain no real repository or home path, username, random port, token, timestamp, or secret sentinel, and every baseline update requires human review.
- A maximum-size catalog stress test verifies bounded mounted rows, stable focus, visible total counts, metadata-only search, long-path wrapping or truncation, and mixed English and Japanese text.
- Raw and Structured stress tests verify at most 400 mounted line rows, hidden decorative line numbers, announced range and total, keyboard jump controls, the long-line soft-wrap cutoff, Markdown and metadata cap diagnostics, bounded iterative metadata traversal, worker timeout recovery, and continued navigation responsiveness.
- Aggregate Diagnostics stress tests verify the per-source storage cap, safe overflow totals, a single limit summary, at most 400 mounted rows, stable filtering and focus, and no attacker-controlled detail retained beyond the cap.
- publint and Are The Types Wrong
- npm pack dry run
- Install the tarball in a clean temporary directory and smoke-test CLI and API

Coverage percentage is not treated as a complete guarantee. Security boundaries require explicit branch, boundary, and property tests.

## 14. Security design

Default limits:

- Maximum depth: 64
- Maximum Repository directory entries: 50,000
- Maximum Global directory entries: 5,000
- Maximum Repository artifacts: 5,000
- Maximum Global artifacts: 1,000
- Maximum Global tool-home roots in MVP: 3
- Maximum size per file: 1 MiB
- Maximum Repository bytes read: 32 MiB
- Maximum Global bytes read: 8 MiB
- Maximum combined bytes read: 40 MiB
- Maximum diff input per side: 512 KiB or 20,000 lines
- Diff context lines: 3 by default, maximum 20
- Maximum diff line-pair budget: 4,000,000
- Maximum diff worker wall time: 1,000 ms
- Maximum Structured Markdown preview input: 256 KiB
- Maximum Structured Markdown rendered nodes: 5,000
- Maximum public metadata nodes per interpretation: 5,000
- Maximum public metadata depth: 32
- Maximum public metadata scalar: 8 KiB, with 256 KiB serialized total per interpretation
- Maximum metadata rows mounted at once: 400
- Maximum detailed diagnostics stored per source: 10,000, including one limit summary when exceeded
- Maximum aggregate Diagnostic rows mounted at once: 400
- Maximum Raw viewer lines mounted at once: 400
- Automatic soft-wrap cutoff per line: 20,000 UTF-16 code units
- Read concurrency: 8

Limit breaches produce explicit diagnostics rather than silent truncation. A diagnostic overflow retains bounded aggregate counts and one limit summary while discarding excess detail.

Required controls:

- Canonicalize the selected root with realpath.
- Do not resolve tool-home environment variables or touch user-home paths until Global is explicitly enabled.
- Resolve COPILOT_HOME, CLAUDE_CONFIG_DIR, and CODEX_HOME only from the current process environment. Never load values from the inspected repository or an .env file.
- Accept only absolute, NUL-free tool-home overrides. Skip invalid or relative values with a sanitized diagnostic that names the variable but not its value.
- Treat each accepted tool home as an independent canonical root. Never create a common ancestor boundary with the Repository root.
- Open only exact allowlisted Global candidates and declared bounded instruction subdirectories. Never walk an entire home or tool-home directory.
- Do not expose an arbitrary --global-root option or accept a Global filesystem path through HTTP.
- Lstat each tool-home root before canonicalization and reject a symlinked or reparse-point root.
- Skip every symlink in MVP, even when it appears internal.
- Use descriptor-based no-follow reads where the platform supports them, then fstat the open handle and verify regular-file identity and source-boundary containment. If the platform cannot establish those properties safely, skip the candidate with a diagnostic rather than accept an lstat-to-read race.
- Read regular files only.
- Skip .git, node_modules, and common generated directories.
- Do not automatically honor .gitignore because relevant customization files may be ignored.
- Accept UTF-8 text only; report invalid input.
- Apply size limits before parsing.
- Parse and render Structured Markdown only within its preview budgets. A cap leaves metadata and the complete windowed Raw (redacted) view available and emits a diagnostic instead of silently omitting content.
- Run diff in an abortable worker and enforce byte, line, line-pair, and wall-time budgets. Terminate the worker on timeout and return a limit diagnostic without a partial result.
- Disable YAML custom tags and limit alias expansion.
- Never evaluate target content as a prompt, command, module, template, or configuration to execute.
- Never expand environment-variable placeholders.
- Keep exact original content only in short-lived parse and redaction state; do not retain it in either catalog snapshot.
- Redact both structured metadata and text.
- Diff only redacted content.
- Do not log content, secrets, or the absolute selected root.
- Do not log or serialize absolute home paths, usernames, tool-home override values, or raw filesystem error messages.
- Isolate every untrusted text run from surrounding UI directionality and visibly escape display-control characters. Keep the redacted model and diff inputs byte-faithful; escaping is a presentation-only transform.
- Disable raw Markdown HTML, images, and all artifact-derived link navigation. Display a redacted link target as inert text without an href.
- Render Raw (redacted) through text nodes or pre/code elements. Never pass artifact-derived markup to innerHTML or an equivalent HTML injection API.
- Bundle fonts, icons, and visual assets locally. Do not fetch metadata, documentation previews, analytics, or third-party assets from the browser.
- Set a restrictive CSP, X-Content-Type-Options, Referrer-Policy, and frame denial.
- Listen only on 127.0.0.1 with a random port and unguessable session path.
- Validate Host and Origin and do not enable CORS.
- APIs accept opaque artifact IDs, never arbitrary filesystem paths.
- Sensitive API responses use Cache-Control: no-store, and inspected content is never written to persistent browser storage or a service worker cache.
- Keep inspected selections, filter terms, diff pairs, and Global identifiers out of URL paths, queries, fragments, document titles, and browser history state.
- Public Global paths are virtual. Artifact IDs do not contain or hash absolute paths.
- Disabling Global aborts pending reads, clears shared search and filter values, and removes reachable Global source, catalog, detail-store, search-index, navigation, and diff state. Document that JavaScript cannot guarantee immediate memory zeroization after references are released.
- Do not expand cross-boundary imports from Repository to Global, Global to Repository, or either source to another external root.
- If Repository and Global roots overlap, keep the source catalogs separate and emit only a sanitized overlap diagnostic.
- Do not load adapters or plugins from the inspected repository.
- Treat everything under test fixtures as inert test data and never launch an agent from a fixture directory.

Redaction cannot guarantee discovery of every secret. Document this limitation and do not provide unredacted display in MVP.

## 15. Adding future tools

Adding a supported AI coding agent should follow this procedure:

1. Research current official specifications.
2. Record source URLs and review date in the adapter manifest.
3. Classify facts as documented, assumption, undocumented, unsupported, or deferred.
4. Declare Repository and Global candidates separately; do not infer one from the other.
5. If Global is supported, add a built-in tool-home resolver and document every environment override without exposing its value.
6. Perform a source-boundary and sensitive-state threat review before adding any recursive Global candidate.
7. Add a pure adapter.
8. Add Repository, Global-off, Global-on, malformed, overlap, and security fixtures.
9. Pass the shared adapter and source-isolation contract suites.
10. Add one built-in registry entry.
11. Update the support matrix.
12. Smoke-test the packed package.

Existing adapters and UI should not need changes. Unknown tool, kind, and format IDs must continue to render.

Trusted Node API callers may eventually provide adapters explicitly. The inspected repository must never be allowed to auto-load an adapter.

## 16. Risks, assumptions, unsupported scope, and deferred work

### Assumptions

- The selected root is the only Repository filesystem boundary. Explicit Global opt-in adds separate built-in user-level boundaries; it never widens the Repository boundary.
- Global means local user-level configuration for the current process environment, not every configuration source that may affect an agent.
- The Global switch is session-local, defaults to off, and is never persisted.
- Initial artifacts are UTF-8 text.
- Raw in the UI means Raw (redacted).
- Launch working directory and agent version are unknown, so scope is displayed as a candidate or hint.
- Official documentation reflects the state reviewed on 2026-07-14.

### Risks

- Agent customization specifications change quickly.
- Some Copilot official pages currently disagree.
- Redaction can produce false positives and false negatives.
- A local browser server adds Host, Origin, DNS-rebinding, and XSS concerns.
- Global inspection adds privacy risk from personal instructions, secret-bearing paths, and tool homes that also contain credentials or runtime state.
- Rapid source toggles and rescans can surface stale Global data unless cancellation and revision checks are correct.
- Large diffs can consume CPU and memory.
- A dense inspector can become visually impressive but hard to scan, navigate by keyboard, or use on narrow screens unless hierarchy, focus, overflow, and bounded rendering are treated as acceptance criteria.
- Using visual benchmarks creates accidental-imitation risk. Independent tokens, icons, layout decisions, and branding must be reviewed before release.
- Screenshot tests can become noisy across platforms; only the pinned canonical environment is a visual gate, while functional E2E remains cross-platform.
- The npm name is not guaranteed until publication.

### Unsupported in MVP

- User-global forms other than the initial Copilot, Claude Code, and Codex instruction candidates listed in section 4
- Managed, system, organization, remote, and hosted configuration
- COPILOT_CUSTOM_INSTRUCTIONS_DIRS, COPILOT_SKILLS_DIRS, Claude additional directories, and other arbitrary external roots
- Credentials, OAuth state, permissions, transcripts, histories, caches, memories, and machine-project state stored under tool homes
- Hosted configuration and hosted agent state
- Binary and non-UTF-8 files
- Symlink targets
- Root-external imports and references
- Complete effective-configuration simulation
- Formal schema validation
- Remote repository scanning

### Deferred

- Broad Repository and Global skills, agents, rules, commands, prompts, hooks, MCP, settings, and plugin support
- Structured source-composition and precedence relations beyond documented hints
- Structured diff
- Full-text content search, query-language syntax, saved filters or views, user-configurable layouts, and a command palette
- Relationship graphs, treemaps, sunbursts, clustering, and other domain visualizations
- Screenshot, report, static-snapshot, and inspected-content export
- Watch mode
- TUI
- External adapter packages

### Explicit non-goals

- Validation and linting
- Synchronization and conversion
- Automatic fixes, rewriting, and formatting
- Semantic equivalence
- AI-generated quality assessment
- Feature parity with either visual reference, including effective-state simulation, dependency analytics, graph views, or artifact editing
- Copying a reference product's name, logo, illustration, branding, exact layout, source, or visual assets
- MCP startup or connection
- Script, command, hook, plugin, workflow, or extension execution
- Telemetry, accounts, authentication, and hosting
- Browser integrations that fetch third-party metadata or open an editor, file manager, or external service from an artifact
- Whole-home or generic configuration-directory scanning
- Merging Repository and Global into claimed effective configuration text
- Persisting the Global switch or enabling it implicitly from environment or repository content
- User-supplied Global roots and cross-boundary import expansion
