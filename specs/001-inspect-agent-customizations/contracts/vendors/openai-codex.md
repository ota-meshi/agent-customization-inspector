# Vendor Contract: OpenAI Codex

[日本語](openai-codex.ja.md)

**Contract version**: 2026-08-27
**Official-source review**: 2026-08-27

This contract separates documented Codex lookup behavior from the Inspector's read
allowlist. The common matcher grammar and source-boundary rules are defined in
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.md).
Composition and precedence are defined by ID in
[Runtime Composition](../runtime-composition.md), and evidence records are defined in
[Official Sources](../official-sources.md).

`behaviorId` describes Codex. `ruleId` describes Inspector policy. A vendor locator or
behavior record never grants read authority.

## Surface boundary

The ChatGPT desktop app, Codex CLI, and Codex IDE extension use the same local Codex host
configuration for the behaviors marked **local clients** below. ChatGPT Work on the web
does not read local Codex configuration.

The plugin behaviors are a narrower surface, marked **desktop app and plugin CLI**. The
plugins page attributes every marketplace read, install, cache load, and enablement value
to the ChatGPT desktop app, and documents the Codex CLI beside them as marketplace
management — adding, listing, refreshing, and removing sources — ending with the
instruction to use the desktop app to install and test a local plugin. It names the IDE
extension nowhere, so a plugin behavior marked **local clients** would claim a client the
page establishes nothing about, and marketplace discovery and plugin installation must not
be generalized to hosted tasks either.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract states its own
`documentationStatus` and `lifecycleQualifiers`. Unless listed below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. This is a closed mapping
for every unlisted subject, not an inference from an Evidence cell. Empty qualifiers make
no lifecycle claim and never mean `stable`; `documentation-conflict` remains solely a
not a documentation status. Existing Status, Documentation status, and Inspector status
columns are rationale or Inspector-scope state, not serialized status scalars.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `codex.behavior.repo.agents` | `partially-documented` | `[]` | The complete project directory search is not specified |
| `codex.behavior.repo.rules` | `partially-documented` | `[experimental]` | Nested recursion is unspecified and the rules feature is experimental |
| `codex.behavior.user.rules` | `partially-documented` | `[experimental]` | One sentence describes the startup scan of `rules/` for the user layer and the project layers alike, so nested recursion is unspecified for both, and the rules feature is experimental |
| `codex.behavior.user.prompts` | `documented` | `[deprecated]` | The documented custom-prompt surface is deprecated |
| `codex.global.rules` | `documented` | `[experimental]` | The Inspector rule admits only documented direct children of the user rules directory, and the rules feature is experimental |
| `codex.global.prompts` | `documented` | `[deprecated]` | The documented custom-prompt surface is deprecated |
| `codex.repo.agent` | `partially-documented` | `[]` | The root's `.codex/agents/` is documented, but the complete project directory search is not fully specified |
| `codex.repo.rules` | `documented` | `[experimental]` | The Inspector rule admits only documented direct children and excludes unestablished nesting |

The fixed qualifier order is `preview`, `experimental`, `deprecated`; no row here has more
than one, but the general ordering remains mandatory. The typed registry expands the
default and exceptions to one record per subject. These are maintenance records; no response
carries one (QR-005). A candidate provenance publishes which rule admitted the file, never
how completely that rule is documented.

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local clients | Project root through runtime `cwd` | Per directory: `AGENTS.override.md`, then `AGENTS.md`, then configured fallback basenames | Walk root to `cwd`, built once at session start and stopping at the `cwd` — a nested file participates only in sessions whose `cwd` sits at or below it, and without a detectable project root only the current directory is checked; select the first non-empty file in the documented filename order; stop at the upstream-configured byte budget | `codex.instructions.layering` | Documented | `openai.codex.agents-md` |
| `codex.behavior.repo.skills` | Local clients | Runtime `cwd` through repository root | `.agents/skills/<name>/SKILL.md` | Scan each directory on the upward chain; same-name skills are not merged | `codex.skills.discovery` | Documented | `openai.codex.skills` |
| `codex.behavior.repo.agents` | Local clients | Project scope | `.codex/agents/*.toml` | Standalone TOML files define spawned-session configuration layers; the documentation does not fully specify every directory searched inside a project | `codex.agents.inheritance` | Partially documented | `openai.codex.subagents` |
| `codex.behavior.repo.config` | Local clients | Project root through runtime `cwd` | `.codex/config.toml` | Load every trusted project layer root-to-`cwd`; the closest value wins for the same key; relative paths resolve from the containing `.codex/` directory | `codex.config.precedence` | Documented | `openai.codex.config-basic` |
| `codex.behavior.repo.hooks` | Local clients | Every active trusted project config layer | `.codex/hooks.json` and inline `[hooks]` in `.codex/config.toml` | All matching hooks are additive; a file and inline table at one layer are both loaded with a warning | `codex.hooks.additive` | Documented | `openai.codex.hooks`, `openai.codex.config-basic` |
| `codex.behavior.repo.rules` | Local clients | Every active trusted project config layer | `.codex/rules/*.rules` | Codex scans the layer's `rules/` directory at startup; official text does not establish nested-subdirectory recursion | `codex.rules.resolution` | Partially documented; experimental | `openai.codex.rules` |
| `codex.behavior.repo.mcp` | Local clients | Active project config layers | `[mcp_servers.*]` inside `.codex/config.toml` | MCP declarations follow config-layer resolution; project layers require trust | `codex.mcp.configuration` | Documented | `openai.codex.mcp`, `openai.codex.config-basic` |
| `codex.behavior.repo.marketplace` | ChatGPT desktop and plugin-management CLI | Exact repository root | `.agents/plugins/marketplace.json`; legacy-compatible `.claude-plugin/marketplace.json` | A catalog exposes plugins for installation; it is not proof that a plugin is installed or enabled | `codex.plugins.activation` | Documented | `openai.codex.plugins` |
| `codex.behavior.plugin.manifest` | ChatGPT desktop and plugin-management CLI | A plugin root selected by a marketplace or installation | `.codex-plugin/plugin.json` | Required plugin entry point; an arbitrary matching file is not automatically discovered as an enabled plugin | `codex.plugins.activation` | Documented | `openai.codex.plugins` |

A plugin name reaches a Repository file with no configuration step, which is where Codex
differs from Claude Code and Copilot. The desktop client reads a repo catalog at the exact
`$REPO_ROOT/.agents/plugins/marketplace.json` and at the legacy-compatible
`$REPO_ROOT/.claude-plugin/marketplace.json`, so a committed catalog is already a source
the vendor considers and no settings entry registers it. Each `plugins[]` entry points
`source.path` at a plugin folder with a `./`-prefixed path relative to the marketplace
root, and that folder carries the required `.codex-plugin/plugin.json`. That folder is what
`codex.repo.marketplace`'s own rule names, and the scan enumerates it, publishing every file
under it as the files that plugin ships. A value in `.codex/config.toml` naming a
further catalog stays a recorded relationship that grants no read and creates no
candidate. Installation and per-plugin enablement are User state — the installed copy
under the Codex plugin cache and the on/off value in the User configuration — so neither
is a Repository fact.

## Inspector Repository rules

All bases in this table are the exact Inspector Repository boundary — the selected
Repository root, spelled `Repository`. A
`descendant-inventory` expansion is used only for a location the vendor documents at any
depth through a worked-file or descendant anchor; Codex documents none, so every selector
below is anchored at the root and no row claims that Codex walks downward. Every row has policy references
FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, and QR-005 unless a narrower exclusion or
Global requirement is stated below.

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.repo.instructions` | Repository | `['AGENTS.override.md']`; `['AGENTS.md']` | `exact` for each selector at the Repository root; the page walks the repository root down to the runtime `cwd` and stops there, so a nested instruction file belongs to sessions whose `cwd` sits at or below it — a runtime context this product does not select, and permanently a near miss rather than a candidate | `static-candidate` | `codex.behavior.repo.instructions` | Documented; runtime chain conditional | `openai.codex.agents-md` |
| `codex.repo.skill` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | `exact` then `direct-child`, anchored at the Repository root; skill name is one direct child. Codex's skill scan runs *upward* from its working directory. The allowlist is anchored at the selected Repository root and reports that root's customizations (FR-003), so a nested `.agents/skills` one directory below belongs to a working directory this product does not select and is a near miss rather than a candidate; the dependency on that directory is the recognition's `runtime-cwd` condition | `static-candidate` | `codex.behavior.repo.skills` | Documented; runtime chain conditional | `openai.codex.skills` |
| `codex.repo.agent` | Repository | `['.codex', 'agents', /\.toml$/u]` | `direct-child` of the Repository root's `.codex/agents/`; the page names `.codex/agents/` for project scope and documents no nested search | `static-candidate` | `codex.behavior.repo.agents` | Partially documented | `openai.codex.subagents` |
| `codex.repo.config` | Repository | `['.codex', 'config.toml']` | `exact` at the Repository root; the page loads project config layers from the project root down to the runtime `cwd` | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.mcp`, `codex.behavior.repo.hooks` | Documented; trust and runtime chain conditional | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.repo.settings` | Repository | `['.codex', 'config.toml']` | `exact` at the Repository root, over the selector `codex.repo.config` authors; three rules admit the one file and the walk merges them into one candidate read once, because the vendor contract gives that carrier separate `MCP`, contained `hook`, and `settings/config` recognitions and a recognition is what a rule produces | `static-candidate` | `codex.behavior.repo.config` | Documented; trust and runtime chain conditional | `openai.codex.config-basic` |
| `codex.repo.hooks` | Repository | `['.codex', 'hooks.json']` | `exact` at the Repository root; the page names `<repo>/.codex/hooks.json` as the project location | `static-candidate` | `codex.behavior.repo.hooks` | Documented; trust and hook review conditional | `openai.codex.hooks` |
| `codex.repo.hooks.inline` | Repository | `['.codex', 'config.toml']` | `exact` at the Repository root, over the selector `codex.repo.config` authors; the carrier's inline `[hooks]` table is a `hook` recognition of that one file, so the three rules over it are one candidate read once | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.hooks` | Documented; trust and hook review conditional | `openai.codex.hooks` |
| `codex.repo.rules` | Repository | `['.codex', 'rules', /\.rules$/u]` | `direct-child` of the Repository root's `rules/` directory; the page names `<repo>/.codex/rules/` and documents no nested recursion. Recognized as `permissions`: the file decides which commands may run outside the sandbox, which is a different subject from the instruction files Claude keeps under its own `rules/` | `static-candidate` | `codex.behavior.repo.rules` | Experimental; nested rule directories excluded | `openai.codex.rules` |
| `codex.repo.marketplace` | Repository | `['.agents', 'plugins', 'marketplace.json']`; `['.claude-plugin', 'marketplace.json']` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | Exact Repository-root locations | `openai.codex.plugins` |

Inline MCP servers and inline hooks in an accepted `config.toml` are metadata on that
file; they do not create another candidate. Each is a recognition of that one file — its
own rule's, because a recognition is what a rule produces — so the `hook` rows of an
inline `[hooks]` table and the `hook` rows of the same layer's standalone `hooks.json`
stay distinct declarations of the events they share, which is what the vendor loading both
means (`codex.hooks.additive`). A standalone `.mcp.json` is not a Codex
Repository candidate. The Inspector does not recursively search for arbitrary
`.codex-plugin/plugin.json` files, and no rule admits one at all: a manifest below a
catalog's local root is one of the files that plugin ships (§ Derived Repository rules).

## Derived Repository rules

`Status` is human-readable rationale for the upstream evidence; the canonical index above
owns the rule's exact documentation status. A `documented` assessment does not turn the
Inspector's closed derivation into Codex product behavior.

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | The pinned repository `.codex/config.toml`, read as configuration before the walk and never published | Each declared fallback basename as one entry name, matched at the Repository root — a name no entry bears matches nothing; runtime selection remains conditional because excluded higher layers may override it, and available capacity comes from Node.js and the execution environment | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |

No rule admits a `.codex-plugin/plugin.json`, and none derives one — the catalog rule does
name where each offering's manifest sits, so a surface can open the plugin's own
declaration among the files it ships, and naming a path is not admitting a candidate. A
plugin root is activated rather than discovered: which root a client loads is decided by a catalog entry or
by the installed copy under the Codex plugin cache. A repository whose own root carries a
manifest is publishing a plugin for others to install rather than carrying a customization a
client reads here, and the path is a near miss at every depth including the root.

What a repository catalog's local entry names is enumerated instead. `codex.repo.marketplace`
admits the catalog, and the rule that admitted it answers where each local entry's plugin
sits — `<repository root>/<validated-local-source>/`, where the source must use a documented
local form — the object with `source: 'local'` and a `path`, or that path string alone —
begin with `./`, and remain inside the root. A `url`, `git-subdir`, or `npm` entry names a
place outside this repository, and a spelling this vendor documents nowhere names nothing
at all. The scan enumerates that directory,
publishing every regular file under it as the files that plugin ships
(contracts/inspection-path-allowlist.md § Bounded companion census). The plugin's own
manifest is one of them. None becomes a candidate: no rule, no recognition, no kind, and no
inventory row of its own.

A skill's sibling `agents/openai.yaml` is deliberately not a derived candidate. The owning
skill's bounded companion census already reads and publishes it as one of the files the
skill's directory ships, and the detail surface lists and opens it there, so a derivation
would re-admit a file the inventory already carries.

A repository catalog's marketplace root is the Repository root, which is what a `./` local
source resolves against. The page establishes it through the personal scope: the pattern it
documents beside a catalog at `~/.agents/plugins/marketplace.json` is
`./.codex/plugins/<plugin-name>`, a path that resolves against the home directory rather
than against the catalog's own directory. The repository half of that rule is the
Repository root, so `./plugins/my-plugin` beside a catalog at
`.agents/plugins/marketplace.json` is `plugins/my-plugin`.

A manifest's declared components — plugin skills, MCP files, app mappings, hook files,
assets, scripts, and remote sources — are relationships only: a declared value reaches no
read, and a local marketplace entry cannot recursively expand what a manifest names.

Those same files are nonetheless read when they sit in the plugin root, because the plugin
root is a directory-shaped customization and its bounded companion census enumerates it
(contracts/inspection-path-allowlist.md § Bounded companion census). The two are different
mechanisms and the difference is what the exclusion states: a file is read because it is in
the plugin's directory, never because the manifest pointed at it, so a declared path that
escapes the root or names nothing is opened by nothing. A census-listed file acquires no
rule, no recognition, no kind, and no inventory row of its own; it is published as one of
the plugin's files, on the row of the offering that reached its manifest.

## Documented User behavior

This table records what Codex supports for maintainers. It does not expand Global
inspection. The cited pages document `$HOME/.agents/skills` as the user skill location and
`~/.codex` as the user configuration directory, and none of them documents an override that
relocates `$HOME/.agents`. The Inspector therefore treats the two directories as distinct
and records no relocation; a `CODEX_HOME` override moves only the `<CODEX_HOME>` locators in
the table below.

| Behavior ID | User behavior | User locator | Strategy / composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `codex.behavior.user.instructions` | Instruction fallback | `<CODEX_HOME>/AGENTS.override.md`, otherwise `<CODEX_HOME>/AGENTS.md` | `codex.instructions.layering`; first non-empty global candidate precedes the project chain | Accepted only through `codex.global.instructions` below | `openai.codex.agents-md` |
| `codex.behavior.user.config` | User configuration and MCP | `<CODEX_HOME>/config.toml`; profile files in `<CODEX_HOME>` | `codex.config.precedence`, `codex.mcp.configuration`; local clients share the host configuration | Accepted by `codex.global.config`, `codex.global.settings`, and `codex.global.hooks.inline` below | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.behavior.user.agents` | Personal custom agents | `<CODEX_HOME>/agents/*.toml` | `codex.agents.inheritance`; custom names override built-in names and omitted fields inherit from the parent session | Accepted by `codex.global.agent` below | `openai.codex.subagents` |
| `codex.behavior.user.skills` | User skills | `$HOME/.agents/skills/<name>/SKILL.md` | `codex.skills.discovery`; available in addition to repository/admin/system skills and same-name skills are not merged | Accepted by `codex.global.agents-home.skill` below, at the consented shared agent home (FR-045) | `openai.codex.skills` |
| `codex.behavior.user.hooks` | User hooks | `<CODEX_HOME>/hooks.json` and inline hooks in `<CODEX_HOME>/config.toml` | `codex.hooks.additive`; additive with project and plugin hooks | Accepted by `codex.global.hooks` and `codex.global.hooks.inline` below | `openai.codex.hooks` |
| `codex.behavior.user.rules` | User rules | `<CODEX_HOME>/rules/*.rules` | `codex.rules.resolution`; scanned as an active user config layer | Accepted by `codex.global.rules` below | `openai.codex.rules` |
| `codex.behavior.user.plugins` | Personal marketplace and plugins | `$HOME/.agents/plugins/marketplace.json`; installed copies under `<CODEX_HOME>/plugins/` | `codex.plugins.activation`; catalog, installation, enablement, and cached copy are separate states | The personal marketplace is accepted by `codex.global.agents-home.marketplace` below (FR-045); installed copies stay `codex.excluded.user-runtime` | `openai.codex.plugins` |
| `codex.behavior.user.prompts` | Deprecated custom prompts | `<CODEX_HOME>/prompts/*.md` | Explicit invocation only; deprecated in favor of skills | Accepted by `codex.global.prompts` below; the surface stays deprecated | `openai.codex.custom-prompts` |
| `codex.behavior.user.memories` | Local memories | `<CODEX_HOME>/memories/` and related local state | Local-client memory controls; not a repository customization file | `codex.excluded.user-runtime` | `openai.codex.memories` |

## Inspector Global rule

Global inspection is disabled at session start. After the exact consent flow required by
FR-013 through FR-018 and FR-045, Codex may read only these rules — the rows below the
consented `CODEX_HOME` boundary, and the rows below the consented shared agent home that
FR-045 names:

| Rule ID | Boundary base | Selector program and selection | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.global.instructions` | Exact consented captured `CODEX_HOME`; only when absent, `node:path.join` of the session-start imported `node:os.homedir()` capture and `.codex` | `['AGENTS.override.md']`, then `['AGENTS.md']` | `exact`; first-non-empty selection | `static-candidate` | `codex.behavior.user.instructions` | FR-013, FR-014, FR-017, FR-018, QR-005 | — | `openai.codex.agents-md` |
| `codex.global.config` | The same exact consented `CODEX_HOME` boundary | `['config.toml']` | `exact` at the boundary | `static-candidate` | `codex.behavior.user.config` | FR-013, FR-014, FR-017, FR-018, QR-005 | The user config carrier's `MCP` recognition; three rules admit the one file and the walk merges them into one candidate read once, exactly as the Repository trio does | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.global.settings` | The same exact consented `CODEX_HOME` boundary | `['config.toml']` | `exact`, over the selector `codex.global.config` authors | `static-candidate` | `codex.behavior.user.config` | FR-013, FR-014, FR-017, FR-018, QR-005 | The same carrier's `settings/config` recognition | `openai.codex.config-basic` |
| `codex.global.hooks.inline` | The same exact consented `CODEX_HOME` boundary | `['config.toml']` | `exact`, over the selector `codex.global.config` authors; the carrier's inline `[hooks]` table is a `hook` recognition of that one file | `static-candidate` | `codex.behavior.user.config`, `codex.behavior.user.hooks` | FR-013, FR-014, FR-017, FR-018, QR-005 | Same-layer standalone and inline hook occurrences remain distinct provenances | `openai.codex.hooks` |
| `codex.global.hooks` | The same exact consented `CODEX_HOME` boundary | `['hooks.json']` | `exact` at the boundary | `static-candidate` | `codex.behavior.user.hooks` | FR-013, FR-014, FR-017, FR-018, QR-005 | The user layer's standalone hook file | `openai.codex.hooks` |
| `codex.global.agent` | The same exact consented `CODEX_HOME` boundary | `['agents', /\.toml$/u]` | `direct-child` of the boundary's `agents/`; the page names `~/.codex/agents/` for personal agents and documents no nested search | `static-candidate` | `codex.behavior.user.agents` | FR-013, FR-014, FR-017, FR-018, QR-005 | Custom names override built-in names; omitted fields inherit from the parent session | `openai.codex.subagents` |
| `codex.global.rules` | The same exact consented `CODEX_HOME` boundary | `['rules', /\.rules$/u]` | `direct-child` of the boundary's `rules/`; recognized as `permissions` exactly as the Repository rule is, because the file decides which commands may run outside the sandbox | `static-candidate` | `codex.behavior.user.rules` | FR-013, FR-014, FR-017, FR-018, QR-005 | The startup scan of the user layer's `rules/`; nested recursion stays unspecified, so no recursive step | `openai.codex.rules` |
| `codex.global.prompts` | The same exact consented `CODEX_HOME` boundary | `['prompts', /\.md$/u]` | `direct-child` of the boundary's `prompts/`; explicit invocation only | `static-candidate` | `codex.behavior.user.prompts` | FR-013, FR-014, FR-017, FR-018, QR-005 | The documented surface is deprecated in favor of skills, and a deprecated surface a tool still reads is one this product still shows | `openai.codex.custom-prompts` |
| `codex.global.agents-home.skill` | The consented shared agent home: `node:path.join` of the session-start imported `node:os.homedir()` capture and `.agents`, which no documented setting relocates (FR-045) | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` then `exact`; the skill name is exactly one direct child | `static-candidate` | `codex.behavior.user.skills` | FR-013, FR-014, FR-018, FR-045, QR-005 | The documented `$HOME/.agents/skills` personal location; Copilot documents the same path, so an admitted file carries both tools' recognitions | `openai.codex.skills` |
| `codex.global.agents-home.marketplace` | The consented shared agent home: `node:path.join` of the session-start imported `node:os.homedir()` capture and `.agents`, which no documented setting relocates (FR-045) | `['plugins', 'marketplace.json']` | `exact` below the shared home | `static-candidate` | `codex.behavior.user.plugins` | FR-013, FR-014, FR-018, FR-045, QR-005 | The documented personal marketplace catalog; the plugins it names, and installed copies under `<CODEX_HOME>/plugins/`, stay excluded exactly as Repository plugin bodies are | `openai.codex.plugins` |

The immutable plan uses the closed `codex-global-first-non-empty` policy with those two
exact selectors in that order. A safely established non-empty override short-circuits; only
an `absent` or safely established empty override advances to `AGENTS.md`.

An absent override — the file does not exist — advances fallback to `AGENTS.md`; a
symlinked override is read through its target like any other file. An unreadable or
binary override instead ends the branch with that file's diagnostic and does not advance
fallback (FR-035); an unexpected failure fails the attempt as an ordinary error without
selecting fallback.

A candidate containing any NUL byte is binary and diagnostic-only, makes an otherwise
publishable generation partial, and does not advance fallback. Every non-NUL byte
stream is decoded exactly once as UTF-8 with replacement semantics. One leading BOM is
recorded and removed. If decoding inserts `U+FFFD`, `utf-8-replaced` preserves every such
character in the complete garbled source used for parsing, extraction, display, and
comparison. Replacement alone is complete; no other charset is guessed or retried. Empty
means that decoded string after the optional leading BOM has
`String.prototype.trim().length === 0`, so a whitespace-only file is empty. The Inspector
publishes the selected non-empty file, never both.

A present empty or relative `CODEX_HOME` override, or a root that is missing or not a
readable directory, does not fall back silently; the tool is recorded absent or failed
(FR-014). An unexpected failure during root selection or admission fails the attempt as
an ordinary error. User memories, credentials, logs, sessions, caches, and installed plugin copies remain
excluded even when they are under the same directory.

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in
[Runtime Composition](../runtime-composition.md). The following description is a
non-normative index only: for Codex, those rules cover arbitrary config paths, plugin
component declarations, hook commands, server-provided MCP instructions, and parent/child
custom-agent context. They never authorize a target read.

For the grouped User exclusion, the rule's own assessment is `documented` with no
lifecycle claim. Each referenced subject keeps its own
maintenance record with its own qualifiers; nothing flattens them into the exclusion rule
or a union, and no assessment array exists to carry them together.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | The User surfaces above that no Global rule admits: local memory state, installed plugin copies under `<CODEX_HOME>/plugins/`, and managed/system configuration and local state | `codex.behavior.user.memories`, `codex.behavior.user.plugins` | FR-013, FR-014, FR-017, FR-018, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.memories`, `openai.codex.plugins` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skills, MCP, apps, hooks, assets, scripts, and installed/cache copies | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003, FR-004, FR-024, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for OpenAI Codex. The kind
spellings are the exact `ToolRecognition.kind` values.

The release publishes no declared metadata beside the source it read: a detail surface
serves the complete authored `sourceText`, so every authored value is already on the same
screen in its own spelling, and a captioned copy would be one fact in two spellings. The
values a recognition reads out are the file's own declarations, by the keys the file wrote
(data-model.md § Skill presentation); the one an inventory row is grouped by is its kind's
identity — for a `skill`, the name authored in its own file, or its skill directory name
when the file authors none (data-model.md § Inventory unit). The table therefore fixes
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

The rows are exhaustive. `—` means the eligible set is empty. The single admitted
`.codex/config.toml` carrier can own separate `MCP`, `settings/config`, and contained
`hook` recognitions; each occurrence belongs only to the row that owns its declaration
family. A reference the allowlist does not name remains visible only in complete `sourceText`. No allowlist stands between a declaration and its publication: a skill's declarations are the keys its file wrote, and an authored key set is not closed (FR-007). A
relationship can be emitted only when both its kind is listed here and its origin is
covered by the appropriate relationship-only rule in the central registry. This
allowlist never grants a read, connection, execution, import, installation, or activation
authority.

| `ToolRecognition.kind` | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|
| `instructions` | — | An accepted static, configured-fallback, or Global instruction file; an authored reference-looking token is source text, never an extracted reference. Path-derived scope/order and byte-budget facts are typed state, not metadata |
| `permissions` | `runtime-reference` | Exact argument/value/item occurrences in accepted direct-child `.rules` files; comments and unlisted Starlark expressions remain source text only |
| `skill` | `skill-resource`<br>`runtime-reference` | Exact `name` and `description` frontmatter values in an accepted `SKILL.md`; resource/script/reference targets can be relationships but are never read through those edges |
| `agent` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | Exact supported TOML value/item/map-key occurrences in an accepted agents TOML file — repository `.codex/agents/*.toml` or consented user `agents/*.toml`; MCP remains an inherited/carrier relationship and never becomes an agent-owned MCP recognition |
| `prompt/command` | — | Exact frontmatter value/item occurrences in an accepted consented user `prompts/*.md`; the invocation name derived from the file's own name remains typed provenance, not declared metadata |
| `hook` | `runtime-reference` | Event map keys, matcher values, and handler leaves in accepted standalone `hooks.json` or inline `[hooks]`; same-layer standalone and inline occurrences remain distinct provenances |
| `MCP` | `runtime-reference` | Server/table names and exact supported leaf/item occurrences under `[mcp_servers.*]` on an admitted config carrier; no process environment value is substituted |
| `settings/config` | `agent-reference`<br>`skill-resource`<br>`runtime-reference`<br>`fallback` | Exact supported TOML value/item/map-key occurrences on the admitted config carrier; MCP and Hook declarations belong only to their separate recognition rows, and configured target paths never gain read authority |
| `plugin` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`runtime-reference` | Exact metadata and component/presentation leaf/item occurrences in an accepted `.codex-plugin/plugin.json`, and exact catalog/plugin-entry leaf/item occurrences in an accepted marketplace file — a Repository-root catalog or the consented shared agent home's `plugins/marketplace.json` — which carries the plugin names its entries resolve; `marketplace.plugin.source` alone may seed the closed local-manifest derivation; an omitted `hooks` field may emit only the registry-defined documented-default component relationship |
| `skill metadata` | `skill-resource`<br>`runtime-reference` | Exact supported YAML leaf/item occurrences in a derived `agents/openai.yaml`; seed provenance is typed state and the file never inherits the owning `SKILL.md` metadata identity |

The `plugin` row's manifest clauses — occurrences in an accepted `.codex-plugin/plugin.json`,
and `marketplace.plugin.source` seeding a local-manifest derivation — describe a source form
no rule admits and a derivation no rule performs (§ Derived Repository rules). They are
frozen, digest-recorded design input with no consumer, exactly as the `skill metadata` row
below is, and changing either is a digest-recorded change under the official-source
contract's stop-and-regenerate rule. What the row governs today is its other half: the
catalog entry's own occurrences.

No Codex recognition uses the shared `output style` kind in the initial release; the
`prompt/command` kind belongs to the consented user `prompts/*.md` recognition alone.
No initial-release recognition uses the `skill metadata` kind either:
the sibling `agents/openai.yaml` is published as its owning skill's census companion
rather than admitted as a candidate (§ Derived Repository rules), so the `skill metadata`
row above is frozen, digest-recorded design input with no consumer. Consuming or removing
that row is a digest-recorded change under the official-source contract's
stop-and-regenerate rule. Typed layer, path-derived scope, selection, precedence, trust,
default, and applicability facts are not authored metadata and are published by no
surface.

## Known uncertainties and required condition facts

1. The custom-agent page establishes project scope at `.codex/agents/` but does not fully
   define its directory traversal. Descendant authored files remain conditional inventory.
2. The rules page says to scan `rules/` at every active layer but does not document
   recursive subdirectories. The read allowlist therefore accepts direct `.rules`
   children only.
3. Repository config, hooks, rules, and MCP depend on project-root detection, runtime
   `cwd`, and project trust. Inventory existence is not proof of loading.
4. Instruction fallback names and the upstream byte budget can be changed by excluded
   user/profile/CLI inputs. The Inspector can call a file selected or omitted only when every
   required input is known; that vendor runtime budget is never an Inspector validity rule.
5. A plugin manifest or marketplace proves authored metadata only. Installed copy,
   enabled state, component overrides, and hosted availability remain independent facts.
6. Hosted ChatGPT Work does not read local Codex files. A local-file recognition must not
   be projected onto a hosted task.
7. A plugin is scoped by the catalog that offers it. The page names the manifest `name` as
   the plugin identifier and component namespace, and installs a plugin into
   `<cache>/<marketplace>/<plugin>/<version>`, so one name two catalogs offer is two
   installs. The inventory therefore keys a row by the pair — the catalog's own `name` and
   the plugin's — and a manifest belongs to the catalog whose entry reached it. What the
   page does not state is the spelling of that pair, nor what a client does when one
   catalog's entry and the manifest it points at declare different names. The spelling the
   inventory draws — `plugin@marketplace` — is the CLI's own: `codex plugin add` and
   `codex plugin remove` take a `PLUGIN[@MARKETPLACE]` selector, `codex plugin list` prints
   the qualified form, and `~/.codex/config.toml` keys per-plugin state by it (observed
   against codex-cli 0.144.6, not established by the cited page). No row states a
   resolution for the disagreement (FR-009).
