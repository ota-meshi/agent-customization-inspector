# Vendor Contract: OpenAI Codex

[日本語](openai-codex.ja.md)

**Contract version**: 2026-07-15
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

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local clients | Project root through runtime `cwd` | Per directory: `AGENTS.override.md`, then `AGENTS.md`, then configured fallback basenames | Walk root to `cwd`; select at most one non-empty file per directory; stop at the configured byte budget | `codex.instructions.layering` | Documented | `openai.codex.agents-md`, `openai.codex.config-basic` |
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
| `codex.repo.plugin-manifest` | `./` | `./.codex-plugin/plugin.json` | `exact`; the launch root is treated as the authored plugin root | `static-candidate` | `codex.behavior.plugin.manifest` | Inspector authored-project policy only; not Codex plugin discovery or activation | `openai.codex.plugins` |
| `codex.repo.marketplace` | `./` | `./.agents/plugins/marketplace.json`; `./.claude-plugin/marketplace.json` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | Exact Repository-root locations | `openai.codex.plugins` |

Inline MCP servers and inline hooks in an accepted `config.toml` are metadata on that
file; they do not create another candidate. A standalone `.mcp.json` is not a Codex
Repository candidate. The Inspector does not recursively search for arbitrary
`.codex-plugin/plugin.json` files. A nested manifest is admitted only through the bounded
local-marketplace derivation below.

## Bounded-derived Repository rules

`Status` is the upstream documentation status required by the rule schema. A documented
status does not turn an Inspector derivation bound into Codex product behavior.

| Rule ID | Class | Accepted seed | One permitted target and bound | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.local-plugin-manifest` | `bounded-derived-candidate` | A static accepted Codex marketplace local entry | `<catalog-root>/<validated-local-source>/.codex-plugin/plugin.json`; the source must use a documented local form, begin with `./`, remain inside the catalog root, and produce only this one manifest candidate | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | A static accepted project `.codex/config.toml` | A configured instruction fallback basename in an ancestry-comparable directory; at most 16 distinct literal basenames, each at most 128 UTF-8 bytes; runtime selection remains conditional because excluded higher layers may override it | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.derived.skill-metadata` | `bounded-derived-candidate` | A static accepted skill `SKILL.md` | Its sibling `agents/openai.yaml`; exactly one skill-local metadata file is permitted and an orphan file is never admitted | `codex.behavior.repo.skills` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `codex.skills.discovery` | `documented` | `openai.codex.skills` |

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
| `codex.global.instructions` | Exact consented `<CODEX_HOME>`; default `$HOME/.codex` only when `CODEX_HOME` is absent | Use non-empty `AGENTS.override.md` when present; otherwise `AGENTS.md` | `exact`, at most one file | `static-candidate` | `codex.behavior.user.instructions` | FR-013, FR-014, FR-017, FR-018, QR-005 | `openai.codex.agents-md` |

A present empty, relative, unreadable, or otherwise invalid `CODEX_HOME` override does not
fall back silently. User config, agents, skills, hooks, rules, MCP, plugins, prompts,
memories, credentials, logs, sessions, and caches remain excluded even when they are under
the same directory.

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in
[Runtime Composition](../runtime-composition.md). The following description is a
non-normative index only: for Codex, those rules cover arbitrary config paths, plugin
component declarations, hook commands, server-provided MCP instructions, and parent/child
custom-agent context. They never authorize a target read.

For the grouped User exclusion, `documented` means the referenced surfaces have official
documentation. Per-behavior qualifiers such as experimental rules and deprecated prompts
remain in the User behavior table and are not flattened into this rule status.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | Every User surface above except the consented instruction fallback; managed/system configuration and local state | `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, `codex.behavior.user.skills` | FR-013, FR-014, FR-017, FR-018, QR-001, QR-004, QR-005 | `codex.agents.inheritance`, `codex.config.precedence`, `codex.hooks.additive`, `codex.mcp.configuration`, `codex.plugins.activation`, `codex.rules.resolution`, `codex.skills.discovery` | `documented` | `openai.codex.config-basic`, `openai.codex.custom-prompts`, `openai.codex.hooks`, `openai.codex.mcp`, `openai.codex.memories`, `openai.codex.plugins`, `openai.codex.rules`, `openai.codex.skills`, `openai.codex.subagents` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skills, MCP, apps, hooks, assets, scripts, and installed/cache copies | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003, FR-004, FR-024, QR-001, QR-004, QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## Known uncertainties and required condition facts

1. The custom-agent page establishes project scope at `.codex/agents/` but does not fully
   define its directory traversal. Descendant authored files remain conditional inventory.
2. The rules page says to scan `rules/` at every active layer but does not document
   recursive subdirectories. The read allowlist therefore accepts direct `.rules`
   children only.
3. Repository config, hooks, rules, and MCP depend on project-root detection, runtime
   `cwd`, and project trust. Inventory existence is not proof of loading.
4. Instruction fallback names and the byte limit can be changed by excluded user/profile/
   CLI inputs. The Inspector can call a file selected or omitted only when every required
   input is known.
5. A plugin manifest or marketplace proves authored metadata only. Installed copy,
   enabled state, component overrides, and hosted availability remain independent facts.
6. Hosted ChatGPT Work does not read local Codex files. A local-file recognition must not
   be projected onto a hosted task.
