# Vendor Contract: OpenAI Codex

[日本語](openai-codex.ja.md)

**Contract version**: 2026-07-20
**Official-source review**: 2026-07-15

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
does not read local Codex configuration. Repository marketplace discovery and plugin
installation also have desktop/CLI management behavior that must not be generalized to
hosted tasks.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract has exactly one
`EvidenceAssessment`. Unless listed below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. This is a closed mapping
for every unlisted subject, not an inference from an Evidence cell. Empty qualifiers make
no lifecycle claim and never mean `stable`; `documentation-conflict` remains solely a
runtime `ConditionFact.status`. Existing Status, Documentation status, and Inspector status
columns are rationale or Inspector-scope state, not serialized status scalars.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `codex.behavior.repo.agents` | `partially-documented` | `[]` | The complete project directory search is not specified |
| `codex.behavior.repo.rules` | `partially-documented` | `[experimental]` | Nested recursion is unspecified and the rules feature is experimental |
| `codex.behavior.user.rules` | `documented` | `[experimental]` | The documented User rules surface is experimental |
| `codex.behavior.user.prompts` | `documented` | `[deprecated]` | The documented custom-prompt surface is deprecated |
| `codex.repo.agent` | `partially-documented` | `[]` | Descendant inventory includes possible contexts beyond the fully specified project search |
| `codex.repo.rules` | `documented` | `[experimental]` | The Inspector rule admits only documented direct children and excludes unestablished nesting |

The fixed qualifier order is `preview`, `experimental`, `deprecated`; no row here has more
than one, but the general ordering remains mandatory. The typed registry expands the
default and exceptions to one record per subject. Candidate provenance and relationship
DTOs keep every directly referenced rule/behavior/strategy assessment in a sorted,
deduplicated `EvidenceAssessment[]`; they never flatten it to a scalar or qualifier union.

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local clients | Project root through runtime `cwd` | Per directory: `AGENTS.override.md`, then `AGENTS.md`, then configured fallback basenames | Walk root to `cwd`; select the first non-empty file in the documented filename order; stop at the upstream-configured byte budget | `codex.instructions.layering` | Documented | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.behavior.repo.skills` | Local clients | Runtime `cwd` through repository root | `.agents/skills/<name>/SKILL.md` | Scan each directory on the upward chain; same-name skills are not merged | `codex.skills.discovery` | Documented | `openai.codex.skills` |
| `codex.behavior.repo.agents` | Local clients | Project scope | `.codex/agents/*.toml` | Standalone TOML files define spawned-session configuration layers; the documentation does not fully specify every directory searched inside a project | `codex.agents.inheritance` | Partially documented | `openai.codex.subagents` |
| `codex.behavior.repo.config` | Local clients | Project root through runtime `cwd` | `.codex/config.toml` | Load every trusted project layer root-to-`cwd`; the closest value wins for the same key; relative paths resolve from the containing `.codex/` directory | `codex.config.precedence` | Documented | `openai.codex.config-basic` |
| `codex.behavior.repo.hooks` | Local clients | Every active trusted project config layer | `.codex/hooks.json` and inline `[hooks]` in `.codex/config.toml` | All matching hooks are additive; a file and inline table at one layer are both loaded with a warning | `codex.hooks.additive` | Documented | `openai.codex.hooks`, `openai.codex.config-basic` |
| `codex.behavior.repo.rules` | Local clients | Every active trusted project config layer | `.codex/rules/*.rules` | Codex scans the layer's `rules/` directory at startup; official text does not establish nested-subdirectory recursion | `codex.rules.resolution` | Partially documented; experimental | `openai.codex.rules` |
| `codex.behavior.repo.mcp` | Local clients | Active project config layers | `[mcp_servers.*]` inside `.codex/config.toml` | MCP declarations follow config-layer resolution; project layers require trust | `codex.mcp.configuration` | Documented | `openai.codex.mcp`, `openai.codex.config-basic` |
| `codex.behavior.repo.marketplace` | ChatGPT desktop and plugin-management CLI | Exact repository root | `.agents/plugins/marketplace.json`; legacy-compatible `.claude-plugin/marketplace.json` | A catalog exposes plugins for installation; it is not proof that a plugin is installed or enabled | `codex.plugins.activation` | Documented | `openai.codex.plugins` |
| `codex.behavior.plugin.manifest` | Plugin-capable local clients | A plugin root selected by a marketplace or installation | `.codex-plugin/plugin.json` | Required plugin entry point; an arbitrary matching file is not automatically discovered as an enabled plugin | `codex.plugins.activation` | Documented | `openai.codex.plugins` |

## Inspector Repository rules

All bases in this table are the exact Inspector Repository boundary (`./`). A
`descendant-inventory` expansion inventories possible runtime contexts below that
boundary; it does not claim that Codex walks downward. Every row has policy references
FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, and QR-005 unless a narrower exclusion or
Global requirement is stated below.

| Rule ID | Base | Relative selector | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.repo.instructions` | `./` | `./**/AGENTS.override.md`; `./**/AGENTS.md` | `descendant-inventory` at the root and every descendant context directory | `static-candidate` | `codex.behavior.repo.instructions` | Documented; runtime chain conditional | `openai.codex.agents-md` |
| `codex.repo.skill` | `./` | `./**/.agents/skills/*/SKILL.md` | `descendant-inventory` of possible context layers; skill name is one direct child | `static-candidate` | `codex.behavior.repo.skills` | Documented; runtime chain conditional | `openai.codex.skills` |
| `codex.repo.agent` | `./` | `./**/.codex/agents/*.toml` | `descendant-inventory`; agent file is a direct child | `static-candidate` | `codex.behavior.repo.agents` | Partially documented | `openai.codex.subagents` |
| `codex.repo.config` | `./` | `./**/.codex/config.toml` | `descendant-inventory` of possible project layers | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.mcp`, `codex.behavior.repo.hooks` | Documented; trust and runtime chain conditional | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.repo.hooks` | `./` | `./**/.codex/hooks.json` | `descendant-inventory` of possible active config layers | `static-candidate` | `codex.behavior.repo.hooks` | Documented; trust and hook review conditional | `openai.codex.hooks` |
| `codex.repo.rules` | `./` | `./**/.codex/rules/*.rules` | `descendant-inventory` of layer roots plus `direct-child` within each `rules/` directory | `static-candidate` | `codex.behavior.repo.rules` | Experimental; nested rule directories excluded | `openai.codex.rules` |
| `codex.repo.plugin-manifest` | `./` | `./.codex-plugin/plugin.json` | `exact`; the selected Repository root is treated as the authored plugin root | `static-candidate` | `codex.behavior.plugin.manifest` | Inspector authored-project policy only; not Codex plugin discovery or activation | `openai.codex.plugins` |
| `codex.repo.marketplace` | `./` | `./.agents/plugins/marketplace.json`; `./.claude-plugin/marketplace.json` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | Exact Repository-root locations | `openai.codex.plugins` |

Inline MCP servers and inline hooks in an accepted `config.toml` are metadata on that
file; they do not create another candidate. A standalone `.mcp.json` is not a Codex
Repository candidate. The Inspector does not recursively search for arbitrary
`.codex-plugin/plugin.json` files. A nested manifest is admitted only through the closed
local-marketplace derivation below.

## Derived Repository rules

`Status` is human-readable rationale for the upstream evidence; the canonical index above
owns the rule's exact `EvidenceAssessment`. A `documented` assessment does not turn the
Inspector's closed derivation into Codex product behavior.

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.local-plugin-manifest` | `bounded-derived-candidate` | A static accepted Codex marketplace local entry | `<catalog-root>/<validated-local-source>/.codex-plugin/plugin.json`; the source must use a documented local form, begin with `./`, remain inside the catalog root, and derive that exact manifest path | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | A static accepted project `.codex/config.toml` | A configured literal instruction fallback basename in an ancestry-comparable directory; runtime selection remains conditional because excluded higher layers may override it, and available capacity comes from Node.js and the execution environment | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.derived.skill-metadata` | `bounded-derived-candidate` | A static accepted skill `SKILL.md` | Its sibling `agents/openai.yaml`; only that named skill-local metadata path is derived, and an orphan file is never admitted | `codex.behavior.repo.skills` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.skills.discovery` | `documented` | `openai.codex.skills` |

Plugin skills, MCP files, app mappings, hook files, assets, scripts, and remote sources are
relationships only in this release. A local marketplace entry cannot recursively expand
those components.

## Documented User behavior

This table records what Codex supports for maintainers. It does not expand Global
inspection. `CODEX_HOME` defaults to `$HOME/.codex`; it does not relocate the separate
`$HOME/.agents` directories.

| Behavior ID | User behavior | User locator | Strategy / composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `codex.behavior.user.instructions` | Instruction fallback | `<CODEX_HOME>/AGENTS.override.md`, otherwise `<CODEX_HOME>/AGENTS.md` | `codex.instructions.layering`; first non-empty global candidate precedes the project chain | Accepted only through `codex.global.instructions` below | `openai.codex.agents-md` |
| `codex.behavior.user.config` | User configuration and MCP | `<CODEX_HOME>/config.toml`; profile files in `<CODEX_HOME>` | `codex.config.precedence`, `codex.mcp.configuration`; local clients share the host configuration | `codex.excluded.user-runtime` | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.behavior.user.agents` | Personal custom agents | `<CODEX_HOME>/agents/*.toml` | `codex.agents.inheritance`; custom names override built-in names and omitted fields inherit from the parent session | `codex.excluded.user-runtime` | `openai.codex.subagents` |
| `codex.behavior.user.skills` | User skills | `$HOME/.agents/skills/<name>/SKILL.md` | `codex.skills.discovery`; available in addition to repository/admin/system skills and same-name skills are not merged | `codex.excluded.user-runtime` | `openai.codex.skills` |
| `codex.behavior.user.hooks` | User hooks | `<CODEX_HOME>/hooks.json` and inline hooks in `<CODEX_HOME>/config.toml` | `codex.hooks.additive`; additive with project and plugin hooks | `codex.excluded.user-runtime` | `openai.codex.hooks` |
| `codex.behavior.user.rules` | User rules | `<CODEX_HOME>/rules/*.rules` | `codex.rules.resolution`; scanned as an active user config layer | `codex.excluded.user-runtime` | `openai.codex.rules` |
| `codex.behavior.user.plugins` | Personal marketplace and plugins | `$HOME/.agents/plugins/marketplace.json`; installed/cache paths under Codex state | `codex.plugins.activation`; catalog, installation, enablement, and cached copy are separate states | `codex.excluded.user-runtime` | `openai.codex.plugins` |
| `codex.behavior.user.prompts` | Deprecated custom prompts | `<CODEX_HOME>/prompts/*.md` | Explicit invocation only; deprecated in favor of skills | `codex.excluded.user-runtime` | `openai.codex.custom-prompts` |
| `codex.behavior.user.memories` | Local memories | `<CODEX_HOME>/memories/` and related local state | Local-client memory controls; not a repository customization file | `codex.excluded.user-runtime` | `openai.codex.memories` |

## Inspector Global rule

Global inspection is disabled at session start. After the exact consent flow required by
FR-013 through FR-018, Codex may read only this rule:

| Rule ID | Boundary base | Relative selector and selection | Expansion | Class | Behavior refs | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.global.instructions` | Exact consented captured `CODEX_HOME`; only when absent, `node:path.join` of the request-wide imported `node:os.homedir()` capture and `.codex` | Use non-empty `AGENTS.override.md` when present; otherwise `AGENTS.md` | `exact`; first-non-empty selection | `static-candidate` | `codex.behavior.user.instructions` | FR-013, FR-014, FR-017, FR-018, QR-005 | `openai.codex.agents-md` |

The immutable plan uses the closed `codex-global-first-non-empty` policy with those two
exact selectors in that order. A safely established non-empty override short-circuits; only
an `absent` or safely established empty override advances to `AGENTS.md`.

At a contract-declared structural existence checkpoint, Node's exact `ENOENT` from `lstat`
is the only filesystem rejection converted by the domain. Before the candidate is observed
it becomes `absent`; after observation it becomes `entry-disappeared`. The handler checks the
code only, never the message. Only `absent` can advance fallback; `entry-disappeared` cannot.
Successfully returned link, type, metadata, ancestor/root, or canonicalization outcomes that
fail the boundary remain fail-closed and do not advance. Every other throw or rejection,
including `ENOENT` from `open` or `read`, propagates unchanged and is never converted into a
candidate classification or fallback choice.

A candidate containing any NUL byte is binary and diagnostic-only, makes an otherwise
publishable generation contracted-partial, and does not advance fallback. Every non-NUL byte
stream is decoded exactly once as UTF-8 with replacement semantics. One leading BOM is
recorded and removed. If decoding inserts `U+FFFD`, `utf-8-replaced` preserves every such
character in the complete garbled source used for parsing, extraction, display, and
comparison. Replacement alone is complete; no other charset is guessed or retried. Empty
means that decoded string after the optional leading BOM has
`String.prototype.trim().length === 0`, so a whitespace-only file is empty. The Inspector
publishes the selected non-empty file, never both.

A present empty or relative `CODEX_HOME` override, or a non-throwing rejected root outcome,
does not fall back silently. A throw or rejection during root selection or admission
propagates unchanged. User config, agents, skills, hooks, rules, MCP, plugins, prompts,
memories, credentials, logs, sessions, and caches remain excluded even when they are under
the same directory.

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in
[Runtime Composition](../runtime-composition.md). The following description is a
non-normative index only: for Codex, those rules cover arbitrary config paths, plugin
component declarations, hook commands, server-provided MCP instructions, and parent/child
custom-agent context. They never authorize a target read.

For the grouped User exclusion, the rule's own assessment is `documented` with no
lifecycle claim. The record-by-record assessment array separately retains the referenced
experimental rules and deprecated prompts; it never flattens those behavior qualifiers
into the exclusion rule or a union.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | Every User surface above except the consented instruction fallback; managed/system configuration and local state | `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, `codex.behavior.user.skills` | FR-013, FR-014, FR-017, FR-018, QR-001, QR-004, QR-005 | `codex.agents.inheritance`, `codex.config.precedence`, `codex.hooks.additive`, `codex.mcp.configuration`, `codex.plugins.activation`, `codex.rules.resolution`, `codex.skills.discovery` | `documented` | `openai.codex.config-basic`, `openai.codex.custom-prompts`, `openai.codex.hooks`, `openai.codex.mcp`, `openai.codex.memories`, `openai.codex.plugins`, `openai.codex.rules`, `openai.codex.skills`, `openai.codex.subagents` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skills, MCP, apps, hooks, assets, scripts, and installed/cache copies | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003, FR-004, FR-024, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for OpenAI Codex. The kind
spellings are the exact `ToolRecognition.kind` values. A field ID names one authored
source occurrence class, not an arbitrary key supplied by the inspected file. A repeated
array item or dynamic map entry produces another source-ordered occurrence under the same
field ID; for server, Hook-event, environment, header, tool, and named-component `*.name`
IDs, the authored map key is the occurrence. `marketplace.plugin.source` is the one
cross-vendor derivation field: it denotes either a plain-string source or the `path` leaf
of an object source.

The final column is normative source-form applicability, not commentary. Effective
eligibility is the intersection of the row's closed field/relationship sets and the exact
extractor occurrences supported for the actual admitted source form identified by candidate
provenance. Naming several forms in one row does not union their schemas or make one form's
fields eligible in another; conformance fixtures and tests cover both gates.

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
family. Unknown keys and references remain visible only in complete `sourceText`. A
relationship can be emitted only when both its kind is listed here and its origin is
covered by the appropriate relationship-only rule in the central registry. This
allowlist never grants a read, connection, execution, import, installation, or activation
authority.

| `ToolRecognition.kind` | Eligible declared-metadata `fieldId` values | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|---|
| `instructions` | `codex.instructions.reference-target` | `runtime-reference` | Exact authored import/reference target tokens in an accepted static, configured-fallback, or Global instruction file; path-derived scope/order and byte-budget facts are typed state, not metadata |
| `rule` | `codex.rule.pattern`<br>`codex.rule.decision`<br>`codex.rule.justification`<br>`codex.rule.match`<br>`codex.rule.not-match` | `runtime-reference` | Exact argument/value/item occurrences in accepted direct-child `.rules` files; comments and unlisted Starlark expressions remain source text only |
| `skill` | `codex.skill.name`<br>`codex.skill.description` | `skill-resource`<br>`runtime-reference` | Exact `name` and `description` frontmatter values in an accepted `SKILL.md`; resource/script/reference targets can be relationships but are never read through those edges |
| `agent` | `codex.agent.name`<br>`codex.agent.description`<br>`codex.agent.developer-instructions`<br>`codex.agent.nickname-candidate`<br>`codex.agent.model`<br>`codex.agent.model-reasoning-effort`<br>`codex.agent.sandbox-mode`<br>`codex.agent.mcp-server.name`<br>`codex.agent.skill.path`<br>`codex.agent.skill.enabled` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | Exact supported TOML value/item/map-key occurrences in an accepted `.codex/agents/*.toml`; MCP remains an inherited/carrier relationship and never becomes an agent-owned MCP recognition |
| `hook` | `codex.hook.description`<br>`codex.hook.event`<br>`codex.hook.matcher`<br>`codex.hook.handler.type`<br>`codex.hook.handler.command`<br>`codex.hook.handler.command-windows`<br>`codex.hook.handler.timeout`<br>`codex.hook.handler.status-message`<br>`codex.hook.handler.async` | `runtime-reference` | Event map keys, matcher values, and handler leaves in accepted standalone `hooks.json` or inline `[hooks]`; same-layer standalone and inline occurrences remain distinct provenances |
| `MCP` | `codex.mcp.server.name`<br>`codex.mcp.server.command`<br>`codex.mcp.server.arg`<br>`codex.mcp.server.env.name`<br>`codex.mcp.server.env.value`<br>`codex.mcp.server.env-var`<br>`codex.mcp.server.cwd`<br>`codex.mcp.server.experimental-environment`<br>`codex.mcp.server.url`<br>`codex.mcp.server.auth`<br>`codex.mcp.server.bearer-token-env-var`<br>`codex.mcp.server.http-header.name`<br>`codex.mcp.server.http-header.value`<br>`codex.mcp.server.env-http-header.name`<br>`codex.mcp.server.env-http-header.value`<br>`codex.mcp.server.startup-timeout-sec`<br>`codex.mcp.server.tool-timeout-sec`<br>`codex.mcp.server.enabled`<br>`codex.mcp.server.required`<br>`codex.mcp.server.enabled-tool`<br>`codex.mcp.server.disabled-tool`<br>`codex.mcp.server.default-tools-approval-mode`<br>`codex.mcp.server.tool.name`<br>`codex.mcp.server.tool.approval-mode` | `runtime-reference` | Server/table names and exact supported leaf/item occurrences under `[mcp_servers.*]` on an admitted config carrier; no process environment value is substituted |
| `settings/config` | `codex.config.model`<br>`codex.config.model-provider`<br>`codex.config.model-reasoning-effort`<br>`codex.config.approval-policy`<br>`codex.config.sandbox-mode`<br>`codex.config.web-search`<br>`codex.config.personality`<br>`codex.config.service-tier`<br>`codex.config.project-doc-max-bytes`<br>`codex.config.project-doc-fallback-filename`<br>`codex.config.model-instructions-file`<br>`codex.config.experimental-compact-prompt-file`<br>`codex.config.agent.name`<br>`codex.config.agent.config-file`<br>`codex.config.skill.path`<br>`codex.config.skill.enabled` | `agent-reference`<br>`skill-resource`<br>`runtime-reference`<br>`fallback` | Exact supported TOML value/item/map-key occurrences on the admitted config carrier; MCP and Hook declarations belong only to their separate recognition rows, and configured target paths never gain read authority |
| `plugin` | `codex.plugin.name`<br>`codex.plugin.version`<br>`codex.plugin.description`<br>`codex.plugin.author.name`<br>`codex.plugin.author.email`<br>`codex.plugin.author.url`<br>`codex.plugin.homepage`<br>`codex.plugin.repository`<br>`codex.plugin.license`<br>`codex.plugin.keyword`<br>`codex.plugin.skills`<br>`codex.plugin.mcp-servers`<br>`codex.plugin.apps`<br>`codex.plugin.hooks`<br>`codex.plugin.interface.display-name`<br>`codex.plugin.interface.short-description`<br>`codex.plugin.interface.long-description`<br>`codex.plugin.interface.developer-name`<br>`codex.plugin.interface.category`<br>`codex.plugin.interface.capability`<br>`codex.plugin.interface.website-url`<br>`codex.plugin.interface.privacy-policy-url`<br>`codex.plugin.interface.terms-of-service-url`<br>`codex.plugin.interface.default-prompt`<br>`codex.plugin.interface.brand-color`<br>`codex.plugin.interface.composer-icon`<br>`codex.plugin.interface.logo`<br>`codex.plugin.interface.screenshot` | `declared-component`<br>`skill-resource`<br>`runtime-reference` | Exact metadata and component/presentation leaf/item occurrences in an accepted `.codex-plugin/plugin.json`; an omitted `hooks` field may emit only the registry-defined documented-default component relationship |
| `marketplace` | `marketplace.name`<br>`marketplace.interface.display-name`<br>`marketplace.plugin.name`<br>`marketplace.plugin.source`<br>`marketplace.plugin.source.type`<br>`marketplace.plugin.source.url`<br>`marketplace.plugin.source.ref`<br>`marketplace.plugin.source.sha`<br>`marketplace.plugin.source.package`<br>`marketplace.plugin.source.version`<br>`marketplace.plugin.source.registry`<br>`marketplace.plugin.policy.installation`<br>`marketplace.plugin.policy.authentication`<br>`marketplace.plugin.category` | `plugin-source`<br>`runtime-reference` | Exact catalog/plugin-entry leaf/item occurrences in an accepted Repository-root marketplace file; `marketplace.plugin.source` alone may seed the closed local-manifest derivation |
| `skill metadata` | `codex.skill-metadata.interface.display-name`<br>`codex.skill-metadata.interface.short-description`<br>`codex.skill-metadata.interface.icon-small`<br>`codex.skill-metadata.interface.icon-large`<br>`codex.skill-metadata.interface.brand-color`<br>`codex.skill-metadata.interface.default-prompt`<br>`codex.skill-metadata.policy.allow-implicit-invocation`<br>`codex.skill-metadata.dependency.tool.type`<br>`codex.skill-metadata.dependency.tool.value`<br>`codex.skill-metadata.dependency.tool.description`<br>`codex.skill-metadata.dependency.tool.transport`<br>`codex.skill-metadata.dependency.tool.url` | `skill-resource`<br>`runtime-reference` | Exact supported YAML leaf/item occurrences in a derived `agents/openai.yaml`; seed provenance is typed state and the file never inherits the owning `SKILL.md` metadata identity |

No Codex recognition uses the shared `prompt/command` or `output style` kind in the
initial release. Typed layer, path-derived scope, selection, precedence, trust, default,
and applicability facts are not authored metadata and therefore are not additional field
IDs.

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
