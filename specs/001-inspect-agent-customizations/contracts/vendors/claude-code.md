# Claude Code Vendor Behavior and Inspection Contract

[日本語](claude-code.ja.md)

**Contract version**: 2026-08-27

**Official-source revalidation**: 2026-08-27

**Vendor**: Anthropic Claude Code

This document separates Claude Code's documented lookup behavior from the Inspector's
closed inventory policy. It is the Claude-specific source-of-truth companion to the
[inspection allowlist](../inspection-path-allowlist.md). Runtime combination details are
defined by strategy ID in [runtime composition](../runtime-composition.md); this document
does not duplicate those algorithms.

## Terminology and interpretation

- A **behavior ID** (`behaviorId`) identifies one documented or explicitly uncertain
  Claude Code behavior. It does not authorize the Inspector to open a file.
- A **rule ID** (`ruleId`) identifies an Inspector rule. Only a rule whose class permits a
  read can authorize one, subject to the allowlist and safe-I/O contract.
- A **vendor locator** is expressed as a base, a relative locator, and traversal. It
  describes where Claude Code looks from a particular runtime context.
- An **Inspector matcher** is relative to the selected Repository or Global inventory
  root. Every Repository matcher in this document is an authored typed segment program
  based at that root; a Global selector is
  relative to its separately named consented boundary and is never based at the
  Repository root. A
  matcher describes what the Inspector may inventory, not what Claude necessarily loads
  in the current run.
- For Repository matchers, a leading `ANY_DIRECTORIES` segment means zero or more
  descendant directory segments. The
  table states explicitly whether a matcher covers the inventory root, descendants, or
  both.
- `documented`, `partially-documented`, `unknown`, and `conflict` are the closed upstream
  documentation-status values, not runtime effectiveness. Trust, approval, enablement,
  target files, runtime `cwd`, CLI flags, embedded-engine version, and installed-plugin
  state remain separate conditions. Runtime `documentation-conflict` is a
  not a documentation status: this vocabulary spells its incompatible case `conflict`.
- **Shared core** means the CLI, VS Code extension, and JetBrains integration use the same
  settings scopes and precedence. It does not mean every feature is available on every
  surface. The VS Code extension bundles its own Claude Code engine, which can differ in
  version from a separately installed CLI.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract states its own
`documentationStatus` and `lifecycleQualifiers`. Unless listed below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. This is a closed mapping
for every unlisted subject, not an inference from evidence presence; empty qualifiers make
no lifecycle claim and do not mean `stable`. Status/caveat columns elsewhere in this
document are rationale or Inspector state, not serialized scalar enums.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `claude.behavior.repo.instructions.ancestor` | `partially-documented` | `[]` | The ancestor walk does not establish the `.claude/CLAUDE.md` variant |
| `claude.behavior.repo.instructions.descendant` | `partially-documented` | `[]` | Lazy descendant discovery does not establish the `.claude/CLAUDE.md` variant |
| `claude.behavior.repo.rules` | `partially-documented` | `[]` | The on-demand load trigger for nested rules directories and the ancestor-layer `paths` base are incomplete |
| `claude.behavior.user.rules` | `partially-documented` | `[]` | The recursion sentence is written about a project's `.claude/rules/`; the User-level section names the directory and its load order and shows a flat pair of files, leaving nested-subdirectory discovery unstated |
| `claude.global.rules` | `partially-documented` | `[]` | The user rule directory's nested-subdirectory discovery is unstated, so the rule admits the documented direct children only |
| `claude.behavior.repo.commands` | `partially-documented` | `[]` | Complete skill-equivalent ancestor/lazy-descendant traversal is not independently stated |
| `claude.behavior.repo.agents` | `partially-documented` | `[]` | Duplicate-name selection inside one directory tree has no documented stable winner |
| `claude.behavior.repo.settings.local` | `partially-documented` | `[]` | Which directory holds the personal file turns on the session's repository, host, and file ownership, none of which this tool observes |
| `claude.behavior.repo.mcp` | `partially-documented` | `[]` | Exact project-root selection and the resolution base for relative `command`/`args` values are not fully specified |
| `claude.repo.rules` | `partially-documented` | `[]` | The on-demand load trigger for nested rules directories and the ancestor-layer `paths` base remain incomplete |

The typed registry expands the default and exceptions into one record per subject.
These are maintenance records; no response carries one (QR-005). A candidate provenance
publishes which rule admitted the file, never how completely that rule is documented.

## Repository vendor behavior

The composition column references only strategy IDs from
[runtime composition](../runtime-composition.md#claude-code-strategies).

| Behavior ID | Surface | Base | Relative locator | Traversal / trigger | Composition strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.behavior.repo.instructions.launch` | Shared core | `<launch-cwd>` | `./CLAUDE.md`; `./.claude/CLAUDE.md`; `./CLAUDE.local.md` | Exact launch directory; loaded at session start | `claude.instructions.layering` | documented | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.ancestor` | Shared core | Each `<ancestor-dir>` above `<launch-cwd>` | `./CLAUDE.md`; `./CLAUDE.local.md` | Walk parents toward the filesystem root; the ancestor walk does not document `./.claude/CLAUDE.md` | `claude.instructions.layering` | documented, with the noted negative boundary | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.descendant` | Shared core | A `<descendant-dir>` below `<launch-cwd>` | `./CLAUDE.md`; `./CLAUDE.local.md` | Lazy: loaded after Claude reads a file in that descendant subtree; descendant `./.claude/CLAUDE.md` is not documented | `claude.instructions.layering` | documented, with the noted negative boundary | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.rules` | Shared core | Each documented rule layer from `<launch-cwd>` through its parents | `./.claude/rules/**/*.md` | Discover Markdown files recursively within each rule directory; a `paths` rule becomes applicable when a matching file is read; nested `.claude/rules/` directories below the working directory load on demand | `claude.rules.layering` | partially documented: the on-demand load trigger for nested rules directories and the base for ancestor-layer `paths` globs are not explicit | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.repo.skills` | CLI full; IDE subset | Each `<skill-layer>` from `<launch-cwd>` through the Git repository root | `./.claude/skills/<skill-name>/SKILL.md` | Discover ancestor layers at startup and nested descendant skill directories on demand as files are accessed (nested discovery is Claude Code 2.1.6+, changelog § 2.1.6) | `claude.skills.selection` | documented | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.nested-skill-discovery`; `anthropic.claude-code.large-codebases.start-directory` |
| `claude.behavior.repo.skills-directory-plugin` | CLI; IDE availability conditional | `<launch-cwd>/.claude/skills/<plugin-name>` | `./.claude-plugin/plugin.json` | Exact launch-`cwd` skills directory only; unlike plain skills, do not walk ancestor skill directories for this plugin interpretation; workspace trust applies | `claude.plugins.activation` | documented | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.commands` | CLI full; IDE subset | The project command scope used by the session | `./.claude/commands/**/*.md` | Recursively discover command files inside the command directory; subdirectories form command namespaces | `claude.commands.selection` | partially documented: recursion is documented, but a complete skill-equivalent ancestor and lazy-descendant traversal is not stated independently | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.repo.agents` | Claude Code runtime where subagents are available | Each `<agent-layer>` from `<launch-cwd>` through the Git repository root | `./.claude/agents/**/*.md` | Recursively discover each layer; additional directories supplied with `--add-dir` can also contribute agents | `claude.agents.selection`; `claude.agent-context.composition` | documented; duplicate names inside one directory tree have no documented stable winner | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.project` | Subagent runtime | `<project-root>` | `./.claude/agent-memory/<agent-name>/` | Selected by `memory: project` in subagent frontmatter; this is runtime memory state, not general candidate discovery | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.local` | Subagent runtime | `<project-root>` | `./.claude/agent-memory-local/<agent-name>/` | Selected by `memory: local` in subagent frontmatter; this is runtime memory state, not general candidate discovery | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.settings.shared` | Shared core | `<launch-cwd>` | `./.claude/settings.json` | Exact launch directory only; do not inherit from a parent directory. Reaches a teammate's clone and a cloud session only once committed | `claude.settings.precedence` | `documented` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.settings.local` | Shared core | `<repository-root>` | `./.claude/settings.local.json` | Exact launch directory only. Claude Code keeps this file at the git repository root resolved through worktrees, staying in the starting directory outside a repository, when the repository root is the home directory, on Windows, and when the root or its `.git` or `.claude` entry is another user's; a permission rule in it keeps resolving from the starting directory | `claude.settings.precedence` | `partially-documented` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.hooks-contained` | Shared core where the event is supported | Accepted settings, skill, agent, or plugin declaration | Inline `hooks` fields; plugin `./hooks/hooks.json` only after plugin activation | Hooks are declarations contained in an accepted artifact; Claude does not define a standalone project `./.claude/hooks.json` | `claude.hooks.additive` | documented | `anthropic.claude-code.hooks.locations-resolution`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.mcp` | CLI full; VS Code partial; other IDE support conditional | `<project-root>` as determined by Claude Code | `./.mcp.json` | Exact project MCP file; the resolution base for relative `command` and `args` values is not established by the cited pages | `claude.mcp.selection` | documented, but the exact project-root selection algorithm and the relative `command`/`args` base are not fully specified | `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.ide.shared-differences` |
| `claude.behavior.repo.output-style` | CLI documented; IDE availability conditional | Each `<style-layer>` from `<launch-cwd>` through the repository root | `./.claude/output-styles/*.md` | Direct Markdown children at each ancestor layer; no documented recursive or lazy-descendant scan | `claude.output-style.selection` | documented | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.repo.plugin` | CLI management; IDEs consume shared configuration where supported | An explicitly selected `<plugin-root>` | `./.claude-plugin/plugin.json` plus default or manifest-declared component locations | A manifest is optional. A file at an arbitrary Repository path is not auto-discovered; the root must come from installation, a marketplace, `--plugin-dir` / `--plugin-url`, or the skills-directory plugin mechanism | `claude.plugins.activation` | explicit activation, not path discovery | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.marketplace` | CLI management; IDEs use the same configured marketplaces | An explicitly registered `<marketplace-root>` | `./.claude-plugin/marketplace.json` | Read only after the marketplace is registered by configuration or command. A catalog at an arbitrary Repository path is not auto-discovered | `claude.plugins.activation` | explicit registration, not path discovery | `anthropic.claude-code.marketplaces.catalog-sources`; `anthropic.claude-code.ide.shared-differences` |

Current Claude Code supports nested subagent spawning up to its documented depth limit.
No rule or relationship in this contract carries the obsolete assumption that a subagent
cannot spawn another subagent.

A plugin reaches this repository two ways, and only one of them needs a catalog.

A folder under the skills directory that carries `.claude-plugin/plugin.json` is loaded as
a plugin named `<folder>@skills-dir` on the next session, with no marketplace and no
install step, and is discovered in place rather than copied into the plugin cache. The
manifest's presence is what makes the folder a plugin, so it is the carrier
`claude.repo.skills-directory-plugin` admits, and the folder holding it is the plugin root
whose files the plugin ships. Project scope is the launch `cwd`'s own `.claude/skills/`
and ancestor skill directories are not walked for this interpretation, which is why the
matcher is anchored rather than layered like the plain-skill rule; the workspace trust
dialog remains a runtime condition this product does not read.

The other way is a catalog. `.claude/settings.json` registers one by name under
`extraKnownMarketplaces`, honored only after the workspace trust dialog is accepted for
that folder, and names the plugins to turn on under `enabledPlugins`, keyed
`<plugin-name>@<marketplace-name>`. A repository's own catalog is documented at
`.claude-plugin/marketplace.json` in its root, which `claude.repo.marketplace` admits: it
maps each plugin name to that plugin's own source. Two source spellings name a directory
this repository carries: a `./` path relative to the marketplace root, and a bare name —
one directory name carrying no `/` — resolved under the `metadata.pluginRoot` the catalog
declares for exactly that purpose. Every other source is an object naming where the plugin
is fetched from through its own `source` key — `github`, `url`, `git-subdir`, `npm`,
`archive`, or `command` — and leaves the name with no Repository directory, as does a path
that leaves the marketplace root and any spelling this vendor documents nowhere. Enabling
such a plugin in a project settings file does not install it for anyone else. The
marketplace source and the plugin source are separate settings: the catalog says where each
plugin comes from, never that it is installed.

No rule admits the `.claude-plugin/plugin.json` below a catalog's local source, and none
derives one. A manifest is optional there, and the plugin *is* its root: the files below
that root — the manifest among them — are the files the plugin ships, enumerated by the
bounded companion census (contracts/inspection-path-allowlist.md § Bounded companion
census). Neither is a repository's own root treated as a plugin root: no cited page has
Claude discover a plugin at an arbitrary path, and a manifest a repository keeps at its own
root is a plugin it publishes rather than one a client loads here.

## Repository Inspector matchers

These matchers are rooted at the exact Inspector selected Repository root. A descendant-inventory
expansion is used only for a location Claude documents at any depth through a worked-file or
descendant anchor — the on-demand loading of subdirectory instruction files, nested rules
directories, and nested skill directories as Claude reads files under them. A location
documented only on the runtime cwd chain is admitted at the selected root, the chain's one
shared member. Admission never turns the matcher into a claim that Claude loaded the file.
Every row has policy references FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, and QR-005
unless a narrower exclusion or Global requirement is stated below.

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Runtime/documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.repo.instructions` | Repository | `[ANY_DIRECTORIES, 'CLAUDE.md']`; `[ANY_DIRECTORIES, 'CLAUDE.local.md']` | `descendant-inventory` for both: root and all descendants, and `ANY_DIRECTORIES` includes zero segments. The page names `./CLAUDE.md` **or** `./.claude/CLAUDE.md` as the project instruction location, and the any-depth `CLAUDE.md` program already admits `./.claude/CLAUDE.md` at the root and at every depth, so a separate `.claude` selector would only add a second admission of a file the first program already reached | `static-candidate` | `claude.behavior.repo.instructions.launch`; `claude.behavior.repo.instructions.ancestor`; `claude.behavior.repo.instructions.descendant` | Eligibility depends on launch `cwd`, ancestry, and the file subtree read. A nested `.claude/CLAUDE.md` is eligible only when it is the launch directory's exact `.claude` file; it is not a documented lazy-descendant form | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.repo.rules` | Repository | `[ANY_DIRECTORIES, '.claude', 'rules', ANY_DIRECTORIES, /\.md$/u]` | `descendant-inventory` — nested `.claude/rules/` directories are documented to load on demand — plus `recursive-subtree` inside each fixed rules directory | `static-candidate` | `claude.behavior.repo.rules` | The on-demand load trigger for a nested rules directory and the ancestor-layer `paths` base remain partially documented | `anthropic.claude-code.memory.locations-load` |
| `claude.repo.skill` | Repository | `[ANY_DIRECTORIES, '.claude', 'skills', ANY_NAME, 'SKILL.md']` | `descendant-inventory` — nested `.claude/skills/` directories are documented to load on demand — plus `direct-child`; skill name is exactly one direct child | `static-candidate` | `claude.behavior.repo.skills` | Plain-skill ancestor/lazy discovery differs from exact-launch-`cwd` skills-directory plugin discovery | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.command` | Repository | `['.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]` | `recursive-subtree` within the root's fixed commands directory | `static-candidate` | `claude.behavior.repo.commands` | No skill-equivalent ancestor or lazy-descendant command traversal is documented, so the project command scope contributes at the selected root — the one runtime-chain member every session shares — and a subdirectory `.claude/commands` is never a candidate | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.repo.agent` | Repository | `['.claude', 'agents', ANY_DIRECTORIES, /\.md$/u]` | `recursive-subtree` within the root's fixed agents directory | `static-candidate` | `claude.behavior.repo.agents` | The documented walk is upward from the working directory to the Git repository root, whose one member every session shares is the selected root, so a subdirectory `.claude/agents` is a runtime-chain member this product does not select; `--add-dir` directories are a separate runtime fact | `anthropic.claude-code.subagents.scope-context` |
| `claude.repo.settings` | Repository | `['.claude', 'settings.json']`; `['.claude', 'settings.local.json']` | `exact` for each selector | `static-candidate` | `claude.behavior.repo.settings.shared`; `claude.behavior.repo.settings.local` | Matches Claude's exact launch-`cwd` rule; no parent or descendant setting matcher | `anthropic.claude-code.large-codebases.start-directory`; `anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.permissions` | Repository | `['.claude', 'settings.json']`; `['.claude', 'settings.local.json']` | `exact` for each selector, coinciding with `claude.repo.settings` by construction | `static-candidate` | `claude.behavior.repo.settings.shared`; `claude.behavior.repo.settings.local` | The same two files' permission-policy candidacy, recognized as `permissions` while `claude.repo.settings` recognizes them as `settings/config`: one file carries two recognitions when it declares for both, exactly as an admitted Codex config carrier does. A file that declares no `permissions` object is no permissions row | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.hooks.settings` | Repository | `['.claude', 'settings.json']`; `['.claude', 'settings.local.json']` | `exact` for each selector, over the selectors `claude.repo.permissions` authors; the `hooks` object those documents contain is a recognition of the one file, so the three rules over each path are one candidate read once | `static-candidate` | `claude.behavior.repo.hooks-contained`; `claude.behavior.repo.settings.shared`; `claude.behavior.repo.settings.local` | The only Claude hook rows this release publishes: a declaration contained in a skill, a subagent, a plugin manifest, or a catalog entry is part of what that customization is, and that customization's own row publishes it | `anthropic.claude-code.hooks.locations-resolution` |
| `claude.repo.mcp` | Repository | `['.mcp.json']` | `exact` | `static-candidate` | `claude.behavior.repo.mcp` | Conditional on the source root being Claude's project root and on trust/approval | `anthropic.claude-code.mcp.scopes-precedence` |
| `claude.repo.output-style` | Repository | `['.claude', 'output-styles', /\.md$/u]` | `direct-child` of the Repository root's `.claude/output-styles/`; the page loads project styles from every such directory between the working directory and the repository root | `static-candidate` | `claude.behavior.repo.output-style` | Eligibility requires an ancestor layer of the active session and selection by settings/session state | `anthropic.claude-code.output-styles.locations` |
| `claude.repo.skills-directory-plugin` | Repository | `['.claude', 'skills', ANY_NAME, '.claude-plugin', 'plugin.json']` | `exact` under each direct child of the Repository root's `.claude/skills/`; the folder holding the manifest is the plugin root | `static-candidate` | `claude.behavior.repo.skills-directory-plugin` | A folder under the skills directory that carries this manifest is loaded as `<folder>@skills-dir` with no marketplace and no install step, so the manifest's presence is what makes the folder a plugin. Project scope is the launch `cwd`'s own `.claude/skills/`, and ancestor skill directories are not walked for this interpretation; workspace trust remains a runtime condition | `anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.marketplace` | Repository | `['.claude-plugin', 'marketplace.json']` | `exact`; the documented location of a repository's own catalog, which is the marketplace root its `./` entries resolve against | `static-candidate` | `claude.behavior.repo.marketplace` | The catalog is authored content this repository carries; explicit registration by configuration or command remains a runtime condition, so a row states what the catalog offers and never that a plugin is registered, installed, or enabled | `anthropic.claude-code.marketplaces.catalog-sources` |

Contained `hooks` declarations are metadata on the accepted candidate that carries them
and do not create another filesystem matcher; their documented owner set is an accepted
settings, skill, agent, plugin, or marketplace file. Of those, the two settings documents
are the ones whose declarations become `hook` rows. A skill's, a subagent's, a plugin
manifest's, and a catalog entry's `hooks` are part of what that customization is, and its
own row already publishes the keys its file wrote — so a `hook` row for one would publish a
single fact twice, on a page whose subject is not that customization. A settings file's hooks belong to no other
customization: the file's own row publishes the document it is, and the document is
configuration rather than a customization whose definition the hooks are part of — which is
why its hooks reach the hook inventory exactly as an inline Codex `[hooks]` table does,
while the same file's `settings/config` row keeps serving the whole document. MCP has no contained
owner: only the explicit carrier joins the MCP surfaces, and a file of another kind
that spells inline MCP configuration — an agent's frontmatter, a settings file's map —
shows it as that kind's own declared content in its own detail.

## User behavior

`<claude-config-dir>` means `CLAUDE_CONFIG_DIR` when configured, otherwise the documented
default `~/.claude`. The separate `~/.claude.json` state file is not inside that directory.
The table records vendor behavior even when the initial Inspector release excludes it.

| Behavior ID | Surface | Base | Relative locator | Traversal / composition reference | Inspector status | Evidence |
|---|---|---|---|---|---|---|
| `claude.behavior.user.instructions` | Shared core | `<claude-config-dir>` | `./CLAUDE.md` | User instruction scope; `claude.instructions.layering` | Accepted only by `claude.global.instructions` below | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.env-vars` |
| `claude.behavior.user.rules` | Shared core | `<claude-config-dir>` | `./rules/*.md` | Direct children of the user rule directory, the depth its own section shows; `claude.rules.layering` | Accepted by `claude.global.rules` below | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.skills` | CLI full; IDE subset | `<claude-config-dir>` | `./skills/<skill-name>/SKILL.md` | User skill scope; `claude.skills.selection` | Accepted by `claude.global.skill` below; the reserved `skills/synced/` download tree stays outside its selector | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.env-vars` |
| `claude.behavior.user.commands` | CLI full; IDE subset | `<claude-config-dir>` | `./commands/**/*.md` | Recursive legacy command scope; `claude.commands.selection` | Accepted by `claude.global.command` below | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.user.agents` | Claude Code runtime where subagents are available | `<claude-config-dir>` | `./agents/**/*.md` | Recursive user agent scope; `claude.agents.selection` | Accepted by `claude.global.agent` below | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.settings` | Shared core | `<claude-config-dir>` | `./settings.json` | User settings scope; `claude.settings.precedence` | Accepted by `claude.global.settings`, `claude.global.permissions`, and `claude.global.hooks.settings` below | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.user.output-style` | CLI documented; IDE availability conditional | `<claude-config-dir>` | `./output-styles/*.md` | Direct style files; `claude.output-style.selection` | Accepted by `claude.global.output-style` below | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.user.mcp-state` | CLI full; VS Code partial | `<home>` | `./.claude.json` | User MCP and per-project local MCP state; `claude.mcp.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.plugins` | CLI management; IDE shared configuration where supported | `<claude-config-dir>` | `./plugins/` and plugin enablement in `./settings.json` | Installed/cache/runtime-managed plugin data; `claude.plugins.activation` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.env-vars` |
| `claude.behavior.user.agent-memory` | Subagent runtime | `<claude-config-dir>` | `./agent-memory/<agent-name>/` | One memory scope selected by agent frontmatter; `claude.agent-context.composition` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.auto-memory` | Shared runtime where auto memory is enabled | `<claude-config-dir>` | `./projects/<project-key>/memory/MEMORY.md` | Startup prefix plus topic files on demand; `claude.agent-context.composition` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.workflows` | Current Claude Code runtime | `<claude-config-dir>` | `./workflows/*.js` | Dynamic workflow files | `claude.excluded.user-runtime` under FR-016 and FR-018; no initial-release candidate rule | `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.keybindings` | Shared core | `<claude-config-dir>` | `./keybindings.json` | Custom keyboard shortcuts; a preference about the terminal user interface, not an input the agent reads | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.themes` | Shared core | `<claude-config-dir>` | `./themes/*.json` | Custom color themes; a preference about the terminal user interface, not an input the agent reads | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.directory.file-reference` |

## Global accepted matcher

FR-016 and FR-018 admit the documented user customization files below, and nothing
else. Vendor support for a surface these rows do not admit does not expand this consent
boundary, and every selector is relative to the one consented Claude boundary.

| Rule ID | Global base | Selector program | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `claude.global.instructions` | Exact consented captured `CLAUDE_CONFIG_DIR`; only when absent, `node:path.join` of the request-wide imported `node:os.homedir()` capture and `.claude` | `['CLAUDE.md']` | `exact`; a Global selector is never based at the Repository root | `static-candidate` | `claude.behavior.user.instructions` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016; all adjacent User configuration and state remain excluded by FR-018 | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.directory.file-reference` |
| `claude.global.rules` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['rules', /\.md$/u]` | `direct-child` of the boundary's `rules/` — the depth the user section's own example shows; nested-subdirectory discovery is unstated for the user layer, so no recursive step | `static-candidate` | `claude.behavior.user.rules` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016 | `anthropic.claude-code.memory.locations-load` |
| `claude.global.skill` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` then `exact`; the skill name is exactly one direct child. The reserved `skills/synced/<name>/SKILL.md` download tree sits one level deeper than this program reaches — a synced skill is a downloaded copy rather than an authored one, and Claude itself skips a skill authored at the reserved name | `static-candidate` | `claude.behavior.user.skills` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016 | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.env-vars` |
| `claude.global.command` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['commands', ANY_DIRECTORIES, /\.md$/u]` | `recursive-subtree` within the boundary's `commands/`; subdirectories form command namespaces | `static-candidate` | `claude.behavior.user.commands` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016 | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.global.agent` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['agents', ANY_DIRECTORIES, /\.md$/u]` | `recursive-subtree` within the boundary's `agents/` | `static-candidate` | `claude.behavior.user.agents` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016; duplicate-name selection stays undocumented exactly as it is for the Repository scope | `anthropic.claude-code.subagents.scope-context` |
| `claude.global.settings` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`; no user `settings.local.json` is documented | `static-candidate` | `claude.behavior.user.settings` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016 | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.permissions` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`, coinciding with `claude.global.settings` by construction, exactly as the Repository pair coincides | `static-candidate` | `claude.behavior.user.settings` | FR-013, FR-014, FR-016, FR-018, QR-005 | A user settings document declaring no `permissions` object holds no permissions row | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.hooks.settings` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`, over the selector `claude.global.settings` authors; the three rules over the one path are one candidate read once | `static-candidate` | `claude.behavior.user.settings` | FR-013, FR-014, FR-016, FR-018, QR-005 | The contained `hooks` declaration of the user settings document, recognized exactly as the Repository settings pair's is | `anthropic.claude-code.hooks.locations-resolution`; `anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.output-style` | The same exact consented `CLAUDE_CONFIG_DIR` boundary | `['output-styles', /\.md$/u]` | `direct-child` of the boundary's `output-styles/` | `static-candidate` | `claude.behavior.user.output-style` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016 | `anthropic.claude-code.output-styles.locations` |

Environment validation, consent, canonicalization, and the rule for an absent versus an
invalid `CLAUDE_CONFIG_DIR` are Inspector policies defined by the parent allowlist, not
Claude Code vendor lookup claims.

## Derived and excluded rules, with relationship index

| Rule ID | Class | Closed derivation meaning | Behavior refs | Strategy refs | Status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.excluded.user-runtime` | `excluded` | Exclude the User rows above that no Global rule admits: the separate `~/.claude.json` MCP/state file, installed plugins and their cache, agent memory, auto memory, dynamic workflow scripts, and the keybindings and theme files | `claude.behavior.user.mcp-state`; `claude.behavior.user.plugins`; `claude.behavior.user.agent-memory`; `claude.behavior.user.auto-memory`; `claude.behavior.user.workflows`; `claude.behavior.user.keybindings`; `claude.behavior.user.themes` | — | Required by FR-016 and FR-018; exclusion does not deny vendor support | FR-013, FR-014, FR-016, FR-018, QR-001, QR-005 | `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.directory.file-reference`; `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.subagents.scope-context`; `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.env-vars` |
| `claude.excluded.plugin-files` | `excluded` | Exclude plugin component bodies such as skills, commands, agents, output styles, hooks, MCP/LSP declarations, monitors, themes, channels, settings, scripts, and assets; retain declarations as relationships | `claude.behavior.repo.plugin`; `claude.behavior.repo.marketplace` | `claude.plugins.activation` | Initial-release boundary; plugin manifest/catalog inventory is not component activation | FR-003, FR-004, FR-020, FR-021, FR-022, FR-024, QR-001, QR-005 | `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.directory.file-reference` |

The relationship-only rules referenced by this vendor—`claude.relationship.component`,
`claude.relationship.agent-reference`, `claude.relationship.agent-context`, and
`claude.relationship.agent-mcp`—are defined
exactly once in the
[central relationship-only registry](../runtime-composition.md#normative-relationship-only-registry).
This index grants no read authority and does not duplicate those definitions.

## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for Claude Code. The kind
spellings are the exact `ToolRecognition.kind` values.

The release publishes no declared metadata beside the source it read: a detail surface
serves the complete authored `sourceText`, so every authored value is already on the same
screen in its own spelling, and a captioned copy would be one fact in two spellings. The
values a recognition reads out are the file's own declarations, by the keys the file wrote
(data-model.md § Skill presentation); the one an inventory row is grouped by is its kind's
identity — for a `skill`, the name authored in its own file — or its skill directory name
when the file authors none — which a Claude Code
recognition of a nested skill prefixes with the root-relative path of the directory
holding its `.claude` (data-model.md § Inventory unit). The row's last segment is
deliberately the authored name rather than the vendor's directory-derived command segment,
so one skill compares across the three tools under one identity. The table therefore fixes
eligible relationship kinds and admitted source forms only.

The final column is normative source-form applicability, not commentary. Effective
eligibility is the intersection of the row's closed relationship set and the exact
extractor occurrences supported for the actual admitted source form identified by candidate
provenance. Naming several forms in one row does not union their schemas or make one form's
references eligible in another; conformance fixtures and tests cover both gates.

Once implementation begins, this bilingual table and its two per-language SHA-256 digests
recorded in the [official-source contract](../official-sources.md) are frozen, approved design
input. The implementation gate recomputes and verifies them only; it must not author or semantically change
an eligible set, source form, extractor applicability, or relationship kind. If such a change
is required, dependent work stops, every affected English/Japanese design artifact is
synchronized, and `/speckit.plan` and `/speckit.tasks` are rerun before the revised contract
is consumed.

The rows are exhaustive. `—` means the eligible set is empty. A contained Hook
declaration uses the `hook` row on its already admitted owner file; it does not
gain fields from the owner's other recognition and does not create a synthetic file. That
row exists for the settings documents alone — the repository's root pair and the consented
user `settings.json`; every other owner's `hooks` is content of
the row its own kind gives that file.
MCP has no contained row: only the explicit carrier joins the MCP surfaces, and inline
MCP configuration in a file of another kind is that kind's own declared content.
A reference the allowlist does not name remains visible only in complete `sourceText`. No allowlist stands between a declaration and its publication: a skill's declarations are the keys its file wrote, and an authored key set is not closed (FR-007). A relationship
can be emitted only when both its kind is listed here and its origin is covered by the
appropriate relationship-only rule in the central registry. This allowlist never grants a
read, connection, execution, import, installation, or activation authority.

| `ToolRecognition.kind` | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|
| `instructions` | — | An accepted `CLAUDE.md` or `CLAUDE.local.md`; an authored `@path` token is source text, never an extracted reference |
| `rule` | — | Nothing: an accepted rules Markdown file — repository `.claude/rules/**/*.md` or consented user `rules/*.md` — is published as the one document its author wrote, frontmatter block included, so no value is read out of it and a declared `paths` glob is source text like every other line |
| `skill` | `skill-resource`<br>`agent-reference`<br>`context-inheritance` | Exact frontmatter value/item occurrences in an accepted `SKILL.md`; `hooks` is the skill's own frontmatter declaration and owns no hook recognition, and no MCP field exists in a skill frontmatter to own |
| `agent` | `agent-reference`<br>`context-inheritance`<br>`runtime-reference` | Exact frontmatter value/item occurrences in an accepted agents Markdown file — repository `.claude/agents/**/*.md` or consented user `agents/**/*.md`; `hooks` and `mcpServers` are the subagent's own frontmatter declarations, owning neither a hook nor an MCP recognition |
| `prompt/command` | `agent-reference`<br>`context-inheritance` | Exact frontmatter value/item occurrences in an accepted legacy command Markdown file; namespace and invocation name derived from the matched path remain typed provenance, not declared metadata |
| `hook` | `runtime-reference` | Event map keys, matcher values, and handler leaf/item values in the contained `hooks` declaration of an accepted settings document — the repository's two root documents or the consented user `settings.json`. The vendor's other documented owners — a skill, a subagent, a plugin manifest, a catalog entry — declare hooks as part of what they are, and those occurrences belong to their own kind's row |
| `MCP` | `runtime-reference` | Server-name map keys and exact server leaf/item occurrences in the root `.mcp.json` carrier alone; a file of another kind that spells `mcpServers` shows it as its own declared content and owns no MCP recognition |
| `settings/config` | `agent-reference`<br>`declared-component`<br>`runtime-reference` | Exact supported leaf/item occurrences in root `.claude/settings.json`, root `.claude/settings.local.json`, or the consented user `settings.json`; contained Hook values belong only to the `hook` recognition, and settings never own an MCP recognition |
| `permissions` | — | Every leaf/item occurrence of the top-level `permissions` object in root `.claude/settings.json`, root `.claude/settings.local.json`, or the consented user `settings.json`, exactly as authored — the whole object, because an allowlist of some of its keys would drop authored policy without being able to say which; a settings file declaring no `permissions` object holds no permission-policy recognition, and every other settings key belongs to the `settings/config` recognition. A rule string names a tool and an optional specifier and is never resolved to a file, a command, or a domain |
| `output style` | — | Exact frontmatter values in an accepted direct-child output-style Markdown file |
| `plugin` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact metadata and component/dependency leaf/item occurrences in an accepted `.claude-plugin/plugin.json`, and exact catalog and plugin-entry leaf/item occurrences in an accepted `.claude-plugin/marketplace.json`, which carries the plugin names its entries resolve; `marketplace.plugin.source` alone may seed the closed local-manifest derivation; inline Hook bodies and inline MCP declarations are their carrier's own declared content |

The `plugin` row's derivation clause — `marketplace.plugin.source` alone seeding a closed
local-manifest derivation — describes a derivation no rule performs: a manifest below a
catalog's local root is one of the files that plugin ships, not a candidate
(§ Repository vendor behavior). It is frozen, digest-recorded design input with no
consumer, and changing it is a digest-recorded change under the official-source contract's
stop-and-regenerate rule. What the row governs is its other two halves: the manifest
`claude.repo.skills-directory-plugin` admits, and the catalog entries
`claude.repo.marketplace` admits.

No Claude recognition uses the shared `skill metadata` kind in the initial release. Typed
layer, path-derived namespace, selection, precedence, trust, surface, default, and
applicability facts are not authored metadata: none of them is read out of a file, and no
relationship carries one. A path-derived identity is published where it is an inventory
unit and nowhere else — the name a `prompt/command` row is grouped under, the range an
`instructions` row is grouped by — and never as a claim about a runtime: which layer loads
a file, and what a product would select, trust, or default to, no surface states
(FR-009).

## Known ambiguities and version-sensitive facts

1. The documented upward instruction walk names `CLAUDE.md` and `CLAUDE.local.md`; it does
   not establish ancestor `.claude/CLAUDE.md`. The lazy descendant description likewise
   does not establish descendant `.claude/CLAUDE.md`.
2. Rule directories on ancestor layers are documented, but the base against which a
   `paths` glob in an ancestor rule is evaluated is not explicit. Lazy discovery of a
   descendant `.claude/rules` directory is also not established.
3. Legacy command recursion and namespaces are documented. A complete statement that
   legacy commands inherit every plain-skill ancestor and lazy-descendant behavior is not.
4. For duplicate subagent names within one `.claude/agents` directory tree, the upstream
   docs do not define a stable filesystem-independent winner.
5. MCP documentation uses “project root” for `.mcp.json` but does not define a complete
   project-root selection algorithm, and no cited page establishes a resolution base for
   relative `command`/`args` values; the Inspector publishes the authored literal and
   joins no base.
6. The live memory page reviewed on 2026-07-15 states four import hops, while stale search
   excerpts have shown five. Source records should retain `reviewedOn` and an assertion
   fingerprint instead of trusting cached snippets.
7. A plugin manifest or marketplace catalog present in source is not evidence that Claude
   registered, installed, trusted, enabled, selected, or loaded it.
8. The same settings locations and precedence are shared across CLI and IDE integrations,
   but feature subsets and the embedded engine version can differ. Keep surface and engine
   version as applicability facts rather than creating fictitious alternate file paths.
9. Claude follows supported skill symlinks, and the Inspector reads symbolic links
   through their targets the same way, so a symlinked skill is inspected as the content
   Claude would load; a broken link yields that file's `file-unreadable` diagnostic.
10. Current official docs include newer surfaces such as `.claude/workflows/*.js`,
    `.worktreeinclude`, keybindings, themes, plugin monitors, channels, and LSP settings.
    They require an explicit excluded or candidate rule before implementation; silence is
    not evidence that Claude ignores them.
11. Current Claude supports nested subagent spawning: a subagent may spawn its own up to
    three layers below the main conversation by default, and the limit is set by an
    environment variable rather than fixed. Any older “subagents cannot spawn subagents”
    statement is stale and must not return, and no record states a fixed depth.
12. Upstream pages change without a versioned URL. Revalidation must compare the stored
    semantic assertion and section, not just URL reachability.

## Official evidence

All `anthropic.*` source IDs in this contract resolve through the single
[Official Source Registry](../official-sources.md), which owns their canonical URLs,
reviewed sections, review date, and reverse affected-record index. This vendor contract
does not duplicate or override that registry.
