# Vendor Contract: GitHub Copilot

[日本語](github-copilot.ja.md)

**Contract version**: 2026-07-20

**Official-source review**: 2026-07-20

This contract separates documented GitHub Copilot behavior from the Inspector's read
allowlist. The common matcher grammar and source-boundary rules are defined in
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.md).
Composition and precedence are referenced by `strategyId` from
[Runtime Composition](../runtime-composition.md), and evidence records are referenced by
`sourceId` from [Official Sources](../official-sources.md).

`behaviorId` describes a Copilot product surface. `ruleId` describes Inspector policy.
A vendor locator, behavior record, relationship, or strategy never grants read authority.

> **Critical surface distinction:** VS Code recognizes exactly
> `<workspace-root>/.github/copilot-instructions.md` by default. Copilot cloud agent
> recognizes exactly `<repository-root>/.github/copilot-instructions.md`. Copilot CLI
> treats `.github/copilot-instructions.md` as a relative selector at its documented
> standard-location chain. None of these statements means that the product performs an
> arbitrary recursive `**/.github/copilot-instructions.md` scan.

## Terminology

| Term | Meaning in this contract |
|---|---|
| **Workspace root** | One folder opened as a VS Code workspace folder. A single-folder workspace has exactly one workspace folder; a `.code-workspace` multi-root workspace has one per configured folder. It can differ from a Git repository root. |
| **Repository root** | The root of the repository processed by a hosted GitHub surface. |
| **Git root** | The stopping boundary found by Copilot CLI while walking from its runtime working directory. |
| **Runtime `cwd`** | The directory from which the relevant Copilot CLI session operates. It is not necessarily the Inspector's selected Repository root. |
| **CLI standard locations** | Repository root, runtime `cwd`, directories between them, and directories on the path of a file that CLI is working on. A row can explicitly exclude some of those locations. |
| **User location** | A local home, `COPILOT_HOME`, or VS Code profile location used across projects. It is not a Repository source. |
| **Hosted location** | Organization, enterprise, repository settings, or other state held by GitHub rather than cloned from a local user home. |
| **Relative selector** | A product-relative filename or subtree interpreted only from the separately named lookup base. It does not imply another base or traversal direction. |
| **Descendant inventory** | An Inspector-only downward inventory below the retained Repository boundary, used only for a location Copilot documents at any depth through a worked-file or descendant anchor. It is not a Copilot runtime locator or proof of loading. |
| **Candidate** | An authored file that matches an Inspector rule. A candidate is not necessarily applicable, trusted, installed, enabled, selected, or merged by Copilot. |

A recursive `ANY_DIRECTORIES` segment appears below only when recursion is anchored by a
separately named base
or by the Inspector's explicit Repository boundary; every Inspector selector is an
authored typed segment program based at its boundary.

The Inspector's selected Repository root is a single filesystem path and does not model
a multi-root workspace: workspace folders outside the selected root are outside the
Repository source, and which workspace folder a VS Code surface actually uses remains
the unresolved `workspace-root` condition fact rather than an inferred winner.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract states its own
`documentationStatus` and `lifecycleQualifiers`. Unless listed in the exception table below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. The default is a closed
contract mapping for each unlisted subject, not an inference from a non-empty Evidence
cell; empty qualifiers mean no lifecycle claim, never `stable`. Existing table columns
named Status, Documentation status, Runtime/documentation status, or Inspector status are
human rationale or Inspector-scope state and are not serialized status scalars. Runtime
`documentation-conflict` is not a documentation status; this vocabulary spells its incompatible case `conflict`.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `copilot.behavior.vscode.instructions.agents` | `documented` | `[experimental]` | Nested selection is experimental; that lifecycle does not change documentation completeness |
| `copilot.behavior.vscode.skills` | `partially-documented` | `[]` | Cross-location duplicate precedence is not documented |
| `copilot.behavior.vscode.agents` | `partially-documented` | `[]` | Cross-scope duplicate precedence is not documented |
| `copilot.behavior.vscode.prompts` | `partially-documented` | `[]` | Default nested-directory behavior is not stated precisely |
| `copilot.behavior.vscode.hooks` | `documented` | `[preview]` | The upstream hook feature is preview while activation remains a runtime condition |
| `copilot.behavior.vscode.mcp` | `conflict` | `[]` | VS Code 1.118 adds workspace-root `.mcp.json`, while the current MCP guide still presents `.vscode/mcp.json` and User configuration as the exhaustive locations; the root-file schema and total same-name order are not directly documented |
| `copilot.behavior.vscode.user.skills` | `partially-documented` | `[]` | Duplicate-name precedence is not documented |
| `copilot.behavior.vscode.user.agents` | `partially-documented` | `[]` | Workspace/User/organization/plugin duplicate precedence is not documented |
| `copilot.behavior.vscode.user.mcp` | `partially-documented` | `[]` | Same-name cross-scope server resolution is incomplete |
| `copilot.behavior.cli.agents` | `conflict` | `[]` | Official project-versus-User precedence assertions conflict |
| `copilot.behavior.cli.commands` | `partially-documented` | `[]` | The project anchor and ancestor/recursive traversal are incomplete |
| `copilot.behavior.cli.extensions` | `documented` | `[experimental]` | The documented extension surface is experimental |
| `copilot.behavior.cli.user.agents` | `conflict` | `[]` | It carries the same retained project-versus-User conflict |
| `copilot.behavior.cli.user.extensions` | `documented` | `[experimental]` | The documented User extension surface is experimental |
| `copilot.behavior.cloud.skills` | `partially-documented` | `[]` | Local-personal projection is not established |
| `copilot.behavior.cloud.remote-skills` | `partially-documented` | `[]` | Exact Cloud collision behavior is incomplete |
| `copilot.repo.command` | `partially-documented` | `[]` | The conservative matcher is supported, but product ancestry is not documented |
| `copilot.repo.mcp.vscode-root` | `conflict` | `[]` | The exact 1.118+ path is release-note documented, while the current guide's exhaustive location list omits it and does not establish its schema |

The typed registry expands the default and exceptions to one record per subject. The
assessment lives on the registry record it grades and is never reduced to a scalar or a
qualifier union; no provenance or relationship DTO carries one, because how well a rule is
documented is maintenance data no surface shows.

## Surface boundary

The **VS Code** tables describe local Copilot Chat and local agent mode. A cloud-agent
session started from VS Code still follows the **Cloud** table. The **CLI** tables describe
local GitHub Copilot CLI. The **Cloud/hosted** table describes Copilot cloud agent and
hosted inputs; it must not inherit a local user-home locator merely because another
surface supports a similarly named customization.

The optional VS Code setting `chat.useCustomizationsInParentRepositories` changes
discovery for instructions, prompts, custom agents, skills, and hooks. It is disabled by
default. When enabled, VS Code walks from each workspace folder to the first `.git`
directory and collects supported customizations from the intermediate directories and
repository root. It does not turn the workspace into an arbitrary descendant scan.

## VS Code Repository behavior

| Behavior ID | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|
| `copilot.behavior.vscode.instructions.repository` | Workspace root | `.github/copilot-instructions.md` | Exact workspace-root file; parent-repository discovery only when the opt-in setting is enabled | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions`, `vscode.copilot.customization` |
| `copilot.behavior.vscode.instructions.path` | Workspace root and configured instruction locations | `.github/instructions/**/*.instructions.md`; Claude-compatible `.claude/rules/**/*.md` | Recursively search each instruction location. `applyTo` is workspace-root relative; Claude rules use `paths` and default to all files when omitted | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.instructions.agents` | Workspace root | `AGENTS.md` | Root file is always-on when enabled. Nested files are experimental and disabled by default; when enabled, VS Code inventories subfolders and the agent decides which instructions apply to edited files | `copilot.vscode.instructions.layering` | Documented; nested selection is model-dependent | `vscode.copilot.instructions`, `vscode.copilot.settings`, `github.copilot.instructions.support` |
| `copilot.behavior.vscode.instructions.claude` | Workspace root | `CLAUDE.md`; `.claude/CLAUDE.md`; local `CLAUDE.local.md` variant | Always-on when `chat.useClaudeMdFile` is enabled; parent discovery is surface-setting dependent | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions` |
| `copilot.behavior.vscode.skills` | Workspace root | `.github/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` | Skill metadata is discovered first and content is loaded progressively when relevant; parent discovery is opt-in | `copilot.vscode.skills.selection` | Documented; duplicate-name precedence is not documented | `vscode.copilot.skills`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.agents` | Workspace root | `.github/agents/*.md`; `.claude/agents/*.md` | Folder-based discovery; VS Code accepts any `.md` file in `.github/agents`. Parent discovery is opt-in | `copilot.vscode.agents.selection` | Documented; cross-scope duplicate-name precedence is not documented | `vscode.copilot.custom-agents`, `vscode.copilot.settings`, `github.copilot.custom-agents` |
| `copilot.behavior.vscode.prompts` | Workspace root | `.github/prompts/*.prompt.md` | Explicit/manual invocation; additional locations come from `chat.promptFilesLocations` | —; explicit prompt invocation | Documented; default nested-directory behavior is not stated precisely | `vscode.copilot.prompts`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.hooks` | Workspace root | `.github/hooks/*.json`; `.claude/settings.json`; `.claude/settings.local.json`; agent-scoped hook declarations | Workspace hooks take precedence over user hooks for the same event; agent and plugin hooks can run in addition; parent discovery is opt-in | `copilot.vscode.hooks.composition` | Documented; preview features remain activation-conditional | `vscode.copilot.hooks`, `vscode.copilot.custom-agents`, `vscode.copilot.customization` |
| `copilot.behavior.vscode.mcp` | Workspace root | For VS Code 1.118+: `.mcp.json`; all reviewed versions: `.vscode/mcp.json` | Both are exact workspace-root locations. The current guide directly documents the `.vscode/mcp.json` `servers` schema but still calls it the workspace location; the 1.118 release note separately adds root `.mcp.json` and announces most-specific same-name deduplication without defining that file's schema or a total order across the root, `.vscode`, User, and plugin inputs. The Inspector therefore attaches path/surface provenance for root `.mcp.json` but makes no VS Code-owned schema claim; independently documented CLI extraction on the same physical file remains separate provenance in the one Copilot/MCP recognition | `copilot.vscode.mcp.selection` | Conflict between the current exhaustive guide and the newer release note; root schema and exact selection order remain unknown | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.behavior.vscode.settings` | Workspace root | `.vscode/settings.json` | VS Code setting scopes apply; workspace values override user values. The Copilot settings file is not a replacement for general VS Code settings | `copilot.vscode.settings.precedence` | Documented | `vscode.settings` |
| `copilot.behavior.vscode.plugins` | A registered or installed plugin or marketplace root | `plugin.json`; `.plugin/plugin.json`; `.github/plugin/plugin.json`; `.claude-plugin/plugin.json`, and corresponding marketplace files | Registration, installation, recommendation, and enabled state are separate. A matching file in an arbitrary repository is not automatically active | `copilot.vscode.plugins.activation` | Documented | `vscode.copilot.plugins`, `github.copilot.plugins` |

VS Code combines applicable instruction files and does not guarantee an order within one
instruction layer. When instruction layers conflict, the documented broad priority is
personal instructions, then repository instructions, then organization instructions;
all applicable layers are still provided to the model.

## VS Code User behavior

These are documented local User surfaces. Except for the Global instruction rules defined
later, they do not expand Inspector Global authorization.

| Behavior ID | User base | Relative selector or locator | Runtime composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `copilot.behavior.vscode.user.instructions` | User home or VS Code profile | `~/.copilot/instructions/**/*.instructions.md`; `~/.claude/rules/**/*.md`; profile instruction files | Highest documented instruction layer; locations can be enabled or disabled with `chat.instructionsFilesLocations` | Only the consented `<COPILOT_HOME>/instructions/**/*.instructions.md` subset is admitted by `copilot.global.instructions.path`; VS Code applicability additionally requires that boundary to represent its documented user location | `vscode.copilot.instructions`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.claude` | User home | `~/.claude/CLAUDE.md` | Personal always-on instructions when Claude compatibility is enabled | `copilot.excluded.user-runtime` | `vscode.copilot.instructions` |
| `copilot.behavior.vscode.user.skills` | User home or VS Code profile | `~/.copilot/skills/<name>/SKILL.md`; `~/.agents/skills/<name>/SKILL.md`; `~/.claude/skills/<name>/SKILL.md`; configured locations | Available across workspaces; duplicate-name precedence is not documented | `copilot.excluded.user-runtime` | `vscode.copilot.skills`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.agents` | User home or VS Code profile | `~/.copilot/agents/*.md`; profile agent files | Available across workspaces; duplicate-name precedence against workspace, organization, and plugin agents is not documented | `copilot.excluded.user-runtime` | `vscode.copilot.custom-agents`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.prompts` | VS Code profile | Profile `*.prompt.md` files | Explicit/manual invocation | `copilot.excluded.user-runtime` | `vscode.copilot.prompts`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.hooks` | User home | `~/.copilot/hooks/*.json`; `~/.claude/settings.json` | User hooks are below workspace hooks for the same event; agent/plugin hooks may also execute | `copilot.excluded.user-runtime` | `vscode.copilot.hooks` |
| `copilot.behavior.vscode.user.mcp` | VS Code profile/user data | User `mcp.json` | Participates in VS Code MCP configuration and trust; duplicate server resolution is not fully documented | `copilot.excluded.user-runtime` | `vscode.copilot.mcp` |
| `copilot.behavior.vscode.user.settings` | VS Code profile/user data | User `settings.json` | Lower than workspace settings, subject to VS Code policy, remote, language, and profile scopes | `copilot.excluded.user-runtime` | `vscode.settings`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.plugins` | VS Code profile and compatible CLI install state | Profile plugin state; discovered CLI installations under `~/.copilot/installed-plugins` | Installed and enabled state remains separate from authored manifests | `copilot.excluded.user-runtime` | `vscode.copilot.plugins`, `github.copilot.plugins` |

## Copilot CLI Repository behavior

The lookup base and traversal columns below are authoritative. The creation how-to
recommends placing a repository-wide file at the repository root, while the loader
reference separately documents the broader standard-location discovery chain; those
statements are complementary, not a recursive scan.

| Behavior ID | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|
| `copilot.behavior.cli.instructions.repository` | CLI standard locations | `.github/copilot-instructions.md` | Repository root, runtime `cwd`, intermediate directories, and directories on a worked-file path | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.path` | CLI standard locations except intermediate directories between repository root and runtime `cwd` | `.github/instructions/**/*.instructions.md` | Recurse below each admitted `.github/instructions` directory; include only matching `applyTo`; `/instructions` can disable a file | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.agents` | CLI standard locations | `AGENTS.md` | Context-dependent standard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.claude` | CLI standard locations | `CLAUDE.md`; `.claude/CLAUDE.md` | Context-dependent standard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.gemini` | CLI standard locations | `GEMINI.md` | Context-dependent standard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.skills` | Runtime project; the documented inherited tier is parent-directory `.github/skills` (monorepo support) | `.github/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` | First found wins for duplicate names; project locations precede inherited, personal, plugin, custom, built-in, and remote sources in the documented order | `copilot.cli.skills.selection` | Documented | `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.behavior.cli.agents` | Runtime `cwd` through Git root | At each ancestor: `.github/agents/*.md`; `.claude/agents/*.md` | Load every ancestor layer; deepest project layer wins, and `.github/agents` wins over `.claude/agents` at the same layer | `copilot.cli.agents.selection` | Project traversal documented; project-versus-user precedence conflicts | `github.copilot.cli.reference`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins` |
| `copilot.behavior.cli.commands` | Project location is implied but not fully anchored in the reference | `.claude/commands/*.md` | Alternative skill format; a same-name skill has higher priority. Ancestor and recursive discovery are not specified | `copilot.cli.skills.selection` | Partially documented | `github.copilot.cli.reference` |
| `copilot.behavior.cli.hooks` | Repository root | `.github/hooks/*.json`; inline hooks in `.github/copilot/settings.json`, `.github/copilot/settings.local.json`, `.claude/settings.json`, and `.claude/settings.local.json` | Same-event hooks are composed rather than selected; repository inline hooks are appended after user hooks | `copilot.cli.hooks.composition` | Documented | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.behavior.cli.mcp` | Runtime `cwd` through Git root | At each ancestor: `.mcp.json`; `.github/mcp.json` | Requires workspace trust. A file declares servers in either documented schema — a top-level `mcpServers` object or the bare top-level map keyed by server name. Session additional config and plugin servers precede workspace servers; user config follows, and among workspace files the closer-to-`cwd` definition wins, `.mcp.json` over `.github/mcp.json` in one directory | `copilot.cli.mcp.selection` | Documented | `github.copilot.cli.reference`, `github.copilot.cli.mcp` |
| `copilot.behavior.cli.settings` | Repository root | `.github/copilot/settings.json`; `.github/copilot/settings.local.json`; documented Claude-compatible subset in `.claude/settings.json` and `.claude/settings.local.json` | Repository and local settings participate in the documented defaults/managed/user/repository/local/environment/flag cascade; each supported key is replaced by the repository layer, merged by key, unioned so the repository can add entries and never remove them, or tighten-only so the repository can enable and never disable it | `copilot.cli.settings.precedence` | Documented | `github.copilot.cli.configuration` |
| `copilot.behavior.cli.plugins` | An installed or registered plugin or marketplace root | Plugin and marketplace manifest locations in documented recognition order | Authored manifest, marketplace catalog, installed copy, enabled state, and component selection are separate | `copilot.cli.plugins.activation` | Documented | `github.copilot.cli.plugins`, `github.copilot.plugins` |
| `copilot.behavior.cli.lsp` | Repository root | `.github/lsp.json` | Project configuration precedes plugin and user LSP configuration | —; excluded from initial strategy projection | Documented; excluded from initial Inspector scope | `github.copilot.cli.lsp` |
| `copilot.behavior.cli.extensions` | Current repository | `.github/extensions/<name>/extension.mjs`; `extension.cjs`; `extension.js` | Experimental and requires enablement; project, user, and plugin locations are distinct | —; excluded from initial strategy projection | Documented; experimental and excluded from initial Inspector scope | `github.copilot.cli.extensions` |

When multiple applicable CLI instruction files exist, CLI combines them, removes
documented identical duplicates, and defines no general precedence among the remaining
files. `applyTo`, `/instructions` disablement, runtime context, and surface remain
independent condition facts.

## Copilot CLI User behavior

| Behavior ID | User base | Relative selector or locator | Runtime composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `copilot.behavior.cli.user.instructions.root` | `COPILOT_HOME`, default `$HOME/.copilot` | `copilot-instructions.md` | Combined with applicable repository instructions; identical documented categories can be deduplicated; no general precedence | Only `copilot.global.instructions.root` is admitted after consent | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.user.instructions.path` | `COPILOT_HOME`, default `$HOME/.copilot` | `instructions/**/*.instructions.md` | Recursively discover path instructions below this exact user instruction directory, then apply the same applicability and composition conditions as other CLI instruction files | Only `copilot.global.instructions.path` is admitted after consent | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.user.skills` | User home | `~/.copilot/skills/<name>/SKILL.md`; `~/.agents/skills/<name>/SKILL.md` | Below project/inherited skills and above later sources in the documented first-found order | `copilot.excluded.user-runtime` | `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.behavior.cli.user.agents` | User home | `~/.copilot/agents/*.md` | Project-versus-user precedence is an unresolved official-documentation conflict; plugin agents are lowest | `copilot.excluded.user-runtime` | `github.copilot.cli.reference`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins` |
| `copilot.behavior.cli.user.hooks` | `COPILOT_HOME` | `hooks/*.json`; inline hooks in `settings.json` | Policy, user, project, and plugin hooks are composed; all applicable same-event hooks execute | `copilot.excluded.user-runtime` | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.behavior.cli.user.mcp` | `COPILOT_HOME` | `mcp-config.json` | Below session additional config, plugin, and workspace sources | `copilot.excluded.user-runtime` | `github.copilot.cli.reference` |
| `copilot.behavior.cli.user.settings` | `COPILOT_HOME` | `settings.json` | User layer in the documented settings cascade | `copilot.excluded.user-runtime` | `github.copilot.cli.configuration` |
| `copilot.behavior.cli.user.plugins` | Copilot user state | `~/.copilot/installed-plugins/**` and enabled-plugin/marketplace settings | Installed and enabled state; plugin agents and skills cannot override project or personal components under documented plugin rules | `copilot.excluded.user-runtime` | `github.copilot.cli.plugins`, `github.copilot.plugins` |
| `copilot.behavior.cli.user.lsp` | User home | `~/.copilot/lsp-config.json` | Below project and plugin LSP configuration | `copilot.excluded.user-runtime` | `github.copilot.cli.lsp` |
| `copilot.behavior.cli.user.extensions` | User home | `~/.copilot/extensions/<name>/extension.{mjs,cjs,js}` | Experimental; activation remains separate | `copilot.excluded.user-runtime` | `github.copilot.cli.extensions` |

`COPILOT_CUSTOM_INSTRUCTIONS_DIRS` and `COPILOT_SKILLS_DIRS` add runtime-supplied lookup
roots. They are documented behavior, but they never become Inspector scan roots or file
relationships in this release.

The CLI command reference documents `.claude/commands/*.md` as an alternative skill
format but does not establish a distinct User base. This contract therefore keeps the
partially documented command behavior in the Repository table and does not invent a User
behavior row or User matcher for it.

## Cloud and hosted behavior

| Behavior ID | Surface and scope | Lookup base | Relative selector or hosted locator | Traversal or composition | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.behavior.cloud.instructions.repository` | Cloud agent, Repository | Repository root | `.github/copilot-instructions.md` | Exact root file | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.path` | Cloud agent, Repository | Repository root | `.github/instructions/**/*.instructions.md` | Recursive subtree; matching `applyTo` only; `excludeAgent` can exclude cloud agent | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.agents` | Cloud agent, Repository | Repository tree | `AGENTS.md` | The nearest file on the worked-path directory tree takes precedence | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.alternatives` | Cloud agent, Repository | Repository root | `CLAUDE.md`; `GEMINI.md` | Root-only agent-instruction alternatives | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.agents` | Cloud agent, Repository | Repository root | `.github/agents/*.agent.md`; `.github/agents/*.md` | Repository agent definitions; filename identity deduplicates across levels | `copilot.cloud.agents.selection` | Documented | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.skills` | Cloud agent, Repository | Repository root | `.github/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` | Loaded progressively when relevant | `copilot.cloud.skills.selection` | Documented; local-personal projection is not established | `github.copilot.skills` |
| `copilot.behavior.cloud.hooks` | Cloud agent, Repository | Cloned repository root | `.github/hooks/*.json` | Only repository hook files are available in the ephemeral cloud environment by default | `copilot.cloud.hooks.composition` | Documented | `github.copilot.hooks` |
| `copilot.behavior.cloud.mcp` | Cloud agent, hosted Repository/custom-agent state | GitHub repository settings and agent profile | Repository MCP JSON; `mcp-servers` in a custom agent | Process out-of-box servers, then custom-agent servers, then repository settings; later sources can override earlier ones | `copilot.cloud.mcp.selection` | Documented; these are not local `.mcp.json` files | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.plugins` | Cloud agent and hosted plugin state | Repository settings and hosted catalogs | Plugin IDs and known marketplaces in `.github/copilot/settings.json` plus hosted enablement | Authored manifest, recommendation, install, availability, and enablement remain separate | `copilot.cloud.plugins.activation` | Documented | `github.copilot.plugins`, `vscode.copilot.plugins` |
| `copilot.behavior.cloud.organization-instructions` | Cloud agent, Organization | GitHub-hosted organization configuration | No local filesystem locator | Applicable with repository instructions; repository instructions precede organization instructions in the documented instruction-layer model | `copilot.cloud.instructions.layering` | Documented | `github.copilot.instructions.support`, `github.copilot.cloud.instructions` |
| `copilot.behavior.cloud.organization-agents` | Cloud agent, Organization/enterprise | GitHub-hosted agent profiles | No local filesystem locator | Same-name selection is repository over organization over enterprise | `copilot.cloud.agents.selection` | Documented | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.remote-skills` | Copilot services, Organization/enterprise | Hosted skill relay | No Repository or User filesystem locator | Remote skills are projected at runtime; collision behavior must remain surface-qualified | `copilot.cloud.skills.selection` | Documented at concept level; exact Cloud collision behavior is incomplete | `github.copilot.cli.reference` |

GitHub.com Copilot Chat supports hosted personal instructions, but the current support
matrix does not list personal instructions as a Cloud-agent layer. A hosted personal Chat
setting must therefore not be projected into a Cloud-agent instruction chain.

## Inspector Repository matcher rules

Every Base in this table is the exact Inspector Repository boundary — the
selected Repository root from captured `process.cwd()` or `--root`, spelled `Repository`.
The Inspector does not search above it for a workspace, project,
or Git root. A selector program beginning with `ANY_DIRECTORIES` is an explicitly
anchored Inspector inventory,
not a claim that VS Code, CLI, or Cloud walks downward. Every row has policy references
FR-003, FR-004, FR-005, FR-024, QR-001, QR-004,
and QR-005 unless a narrower exclusion or Global requirement is stated below.

The VS Code/Cloud repository-wide and path-instruction rules use root-exact `.github`
programs. Separate CLI-context rules add a leading `ANY_DIRECTORIES` segment solely
because the CLI's standard locations include the directories on the path of a file it is
working on — every directory below the root lies on the path of the files under it, so the
CLI documents those filenames at every depth, while the chain locations (the root, the
working directory, and the directories between them) contribute only the selected root.
Because `ANY_DIRECTORIES` can match zero segments, the
CLI rule also covers the selected Repository root. A root file therefore receives VS Code/Cloud
provenance from the root-exact rule and CLI provenance from the CLI-context rule, without
duplicating the same surface provenance or merging runtime behavior.

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.repo.instructions.repository` | Repository | `['.github', 'copilot-instructions.md']` | `exact` at the Inspector root | `static-candidate` | `copilot.behavior.vscode.instructions.repository`, `copilot.behavior.cloud.instructions.repository` | Root-exact VS Code/Cloud provenance only; CLI provenance comes from the separate CLI-context rule | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.repository-cli-context` | Repository | `[ANY_DIRECTORIES, '.github', 'copilot-instructions.md']` | `descendant-inventory`: the CLI documents this filename in the directories on the path of a file it is working on, which puts it at every depth below the selected root; never project it as VS Code/Cloud traversal | `static-candidate` | `copilot.behavior.cli.instructions.repository` | CLI-only candidate provenance; runtime `cwd`, worked path, and Git root remain conditions | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.path` | Repository | `['.github', 'instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | `recursive-subtree` below the root-exact `.github/instructions/` directory | `static-candidate` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.cloud.instructions.path` | Root-exact VS Code/Cloud subtree provenance only; applicability remains surface-specific | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.path-cli-context` | Repository | `[ANY_DIRECTORIES, '.github', 'instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | `descendant-inventory` — the CLI documents the subtree in the directories on the path of a file it is working on — plus `recursive-subtree` below each fixed instruction directory | `static-candidate` | `copilot.behavior.cli.instructions.path` | CLI-only candidate provenance; CLI excludes intermediate root-to-`cwd` layers at runtime | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.agents` | Repository | `[ANY_DIRECTORIES, 'AGENTS.md']` | `descendant-inventory` — the CLI documents the filename in worked-file-path directories, VS Code searches every subfolder under an experimental setting, and Cloud takes the nearest file on the worked path | `static-candidate` | `copilot.behavior.vscode.instructions.agents`, `copilot.behavior.cli.instructions.agents`, `copilot.behavior.cloud.instructions.agents` | Documented; selection is surface/runtime conditional | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.claude-root` | Repository | `['CLAUDE.md']` | `exact` | `static-candidate` | `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate; additional documented paths excluded by initial scope | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.gemini-root` | Repository | `['GEMINI.md']` | `exact` | `static-candidate` | `copilot.behavior.cli.instructions.gemini`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate; non-root CLI paths excluded by initial scope | `github.copilot.cli.instructions`, `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.skill` | Repository | `['.github', 'skills', ANY_NAME, 'SKILL.md']`; `['.agents', 'skills', ANY_NAME, 'SKILL.md']`; `['.claude', 'skills', ANY_NAME, 'SKILL.md']` | `exact` then `direct-child`, anchored at the Repository root; skill name is one direct child of a fixed skills directory. No Copilot surface documents a downward skill lookup from a root context — VS Code and Cloud read their exact workspace or repository root and the CLI reads its runtime project — so a nested skills directory belongs to a runtime context this product does not select and is a near miss rather than a candidate (FR-003); the dependency on that context is the `runtime-cwd`/`workspace-root` condition | `static-candidate` | `copilot.behavior.vscode.skills`, `copilot.behavior.cli.skills`, `copilot.behavior.cloud.skills` | Documented root inventory; runtime selection conditional | `vscode.copilot.skills`, `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.repo.agent` | Repository | `['.github', 'agents', /\.md$/u]` | `direct-child` in the root's `.github/agents/` | `static-candidate` | `copilot.behavior.vscode.agents`, `copilot.behavior.cli.agents`, `copilot.behavior.cloud.agents` | Every surface documents a root-anchored location — VS Code the workspace root, Cloud the repository root, and the CLI an upward walk whose one member every session shares is the selected root — so a subdirectory agents directory is a runtime-chain member this product does not select; surface and precedence remain conditional/conflicting | `vscode.copilot.custom-agents`, `github.copilot.cli.reference`, `github.copilot.custom-agents` |
| `copilot.repo.agent.claude` | Repository | `['.claude', 'agents', /\.md$/u]` | `direct-child` in the root's `.claude/agents/` | `static-candidate` | `copilot.behavior.vscode.agents`, `copilot.behavior.cli.agents` | Its own rule rather than a second selector of `copilot.repo.agent`, because a rule's surfaces are derived from the behaviors it rests on and the Cloud agent documents `.github/agents/` alone: one rule spanning both directories would report the hosted agent as reading a file no page says it reads. Root-anchored and direct-child for the same reasons; the file is also `claude.repo.agent`'s, read once for both | `vscode.copilot.custom-agents`, `github.copilot.cli.reference` |
| `copilot.repo.prompt` | Repository | `['.github', 'prompts', /\.prompt\.md$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.prompts` | Documented VS Code/manual surface only | `vscode.copilot.prompts` |
| `copilot.repo.command` | Repository | `['.claude', 'commands', /\.md$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.cli.commands` | Conservative initial matcher; product ancestry is not documented | `github.copilot.cli.reference` |
| `copilot.repo.hooks` | Repository | `['.github', 'hooks', /\.json$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.hooks`, `copilot.behavior.cli.hooks`, `copilot.behavior.cloud.hooks` | Documented root hook files; settings can contain inline hook metadata | `vscode.copilot.hooks`, `github.copilot.hooks` |
| `copilot.repo.mcp` | Repository | `['.mcp.json']`; `['.github', 'mcp.json']` | `exact` for each selector | `static-candidate` | `copilot.behavior.cli.mcp` | The Git root is the documented upward walk's one terminal every session shares; a subdirectory file is a runtime-chain member this product does not select and is never a candidate. Trust remains conditional | `github.copilot.cli.reference` |
| `copilot.repo.mcp.vscode-root` | Repository | `['.mcp.json']` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | VS Code 1.118+ path/surface provenance only. The current guide omits this location, and no VS Code schema extractor is authorized until direct documentation resolves the conflict | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.repo.mcp.vscode` | Repository | `['.vscode', 'mcp.json']` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | Dedicated VS Code MCP candidate; schema differs from CLI | `vscode.copilot.mcp`, `github.copilot.cli.reference` |
| `copilot.repo.settings` | Repository | `['.github', 'copilot', 'settings.json']`; `['.github', 'copilot', 'settings.local.json']`; `['.claude', 'settings.json']`; `['.claude', 'settings.local.json']` | `exact` for each selector | `static-candidate` | `copilot.behavior.cli.settings` | Documented supported subset; general `.vscode/settings.json` excluded | `github.copilot.cli.configuration` |
| `copilot.repo.plugin-manifest` | Repository | `['.plugin', 'plugin.json']`; `['plugin.json']`; `['.github', 'plugin', 'plugin.json']`; `['.claude-plugin', 'plugin.json']` | `exact` for each selector, and only when the Inspector selected Repository boundary is intentionally treated as an authored plugin root | `static-candidate` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | Inspector policy for an explicit root only; it is not Copilot discovery or activation evidence | `vscode.copilot.plugins`, `github.copilot.cli.plugins` |
| `copilot.repo.marketplace` | Repository | `['marketplace.json']`; `['.plugin', 'marketplace.json']`; `['.github', 'plugin', 'marketplace.json']`; `['.claude-plugin', 'marketplace.json']` | `exact` for each selector, and only when the Inspector selected Repository boundary is intentionally treated as an authored catalog root | `static-candidate` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | Inspector policy for an explicit root only; installation and enablement are separate | `vscode.copilot.plugins`, `github.copilot.cli.plugins` |

A settings rule's behavior references are the documented lookups that locate the
documents it publishes. The hook and plugin behaviors those same documents participate in
are the Hook and Plugin recognitions' own basis and arrive with their phases: a row
publishes the document, and what may be written inside it belongs to the row whose
subject that declaration is (FR-007).

The overlapping `copilot.repo.mcp` and `copilot.repo.mcp.vscode-root` rules create two
compatible provenances on the same root `.mcp.json`; they never duplicate its physical
identity or read. CLI `mcpServers` extraction remains owned by the CLI provenance, while
the VS Code provenance is path/surface-only until direct official documentation establishes
its schema. Unknown same-name ordering is projected as conditions rather than an inferred
winner.

The plugin and marketplace static rules do not search repository descendants. Copilot does not activate
an arbitrary descendant manifest or catalog merely because its filename matches. A
nested local plugin manifest is admitted only by the closed derivation from an accepted
marketplace entry below; that derivation is likewise Inspector policy, not product
discovery or activation.

At one explicitly established plugin root, the documented manifest recognition order is
`.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, then
`.claude-plugin/plugin.json`. Marketplace order is `marketplace.json`,
`.plugin/marketplace.json`, `.github/plugin/marketplace.json`, then
`.claude-plugin/marketplace.json`. The Inspector retains every authored candidate but can
mark a later provenance shadowed only when the common root and every earlier candidate are
known.

## Inspector Global rule

Global inspection is disabled at the beginning of every session. After the exact consent
flow required by FR-013 through FR-018, Copilot may read only these rules:

| Rule ID | Boundary base | Selector program | Expansion | Class | Behavior refs | Runtime strategy | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|---|
| `copilot.global.instructions.root` | Exact consented captured `COPILOT_HOME`; only when absent, `node:path.join` of the request-wide imported `node:os.homedir()` capture and `.copilot` | `['copilot-instructions.md']` | `exact` | `static-candidate` | `copilot.behavior.cli.user.instructions.root` | `copilot.cli.instructions.layering` | FR-013, FR-014, FR-015, FR-018, QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.global.instructions.path` | The same exact consented `<COPILOT_HOME>` boundary | `['instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | `recursive-subtree` below the fixed `instructions/` directory | `static-candidate` | `copilot.behavior.cli.user.instructions.path`, `copilot.behavior.vscode.user.instructions` | `copilot.cli.instructions.layering`, `copilot.vscode.instructions.layering` | FR-013, FR-014, FR-015, FR-018, QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support`, `vscode.copilot.instructions`, `vscode.copilot.settings` |

A present empty or relative `COPILOT_HOME`, or a root that is missing or not a readable
directory, is an invalid override and does not silently fall back; the tool is recorded
absent or failed (FR-014). An unexpected failure during root selection or admission
fails the attempt as an ordinary error. User settings, agents, skills, hooks, MCP, LSP,
extensions, plugins, permissions, credentials, logs, sessions, and caches remain excluded
even when stored below the same boundary.

## Derived rule and relationship index

| Rule ID | Accepted seed | Permitted target | Behavior refs | Strategy refs | Closed derivation and status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.derived.local-plugin-manifest` | An accepted Copilot marketplace entry with a documented local `source` | At the validated local plugin root: `.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, `.claude-plugin/plugin.json` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | `copilot.vscode.plugins.activation`, `copilot.cli.plugins.activation` | Accept `plugins/foo` or `./plugins/foo`; resolve from the catalog root and remain inside it; try only the enumerated manifest names in documented order; the derivation is nonrecursive. Git, HTTP(S), npm, absolute, and home-relative sources remain relationships | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `github.copilot.cli.plugins`, `vscode.copilot.plugins` |

The relationship-only rules referenced by this vendor—
`copilot.relationship.prompt-reference`, `copilot.relationship.settings`,
`copilot.relationship.component`, and
`copilot.relationship.agent-context`—are defined exactly once in the
[central relationship-only registry](../runtime-composition.md#normative-relationship-only-registry).
This index grants no read authority and does not duplicate those definitions.

## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for GitHub Copilot. The kind
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

The rows are exhaustive. `—` means the eligible set is empty. A contained Hook declaration uses the `hook`
row on its already admitted owner file; it does not gain fields from the owner's other
recognition and does not create a synthetic file. MCP has no contained row: only the
explicit carrier joins the MCP surfaces, and inline MCP configuration in a file of
another kind is that kind's own declared content. A reference the allowlist does not name remains visible only in complete `sourceText`. No allowlist stands between a declaration and its publication: a skill's declarations are the keys its file wrote, and an authored key set is not closed (FR-007). A relationship can be emitted only when both its
kind is listed here and its origin is covered by the appropriate relationship-only rule
in the central registry. This allowlist never grants read, connection, execution,
import, installation, or activation authority.

| `ToolRecognition.kind` | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|
| `instructions` | — | An accepted `*.instructions.md`, `.github/copilot-instructions.md`, `AGENTS.md`, or Copilot-recognized `CLAUDE.md`; an authored CLI `@path` target is source text, never an extracted reference, and a supported frontmatter value such as `applyTo` declares the range the file governs rather than a target. Path-derived scope and enablement remain typed facts |
| `skill` | `skill-resource`<br>`context-inheritance` | Exact supported frontmatter value/item occurrences in an accepted `SKILL.md`; relative resource references can be relationships but never authorize reads |
| `MCP` | `runtime-reference` | Server-name map keys and exact supported server leaf/item occurrences in an accepted CLI `mcpServers` file or VS Code `.vscode/mcp.json` `servers` file; a VS Code 1.118+ root `.mcp.json` provenance is path/surface-only and adds no VS Code-owned extractor fields until direct documentation establishes its schema, while any CLI extraction on the same file remains independent; environment/header values are the ones their parser resolved and are never expanded |
| `prompt/command` | `skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact supported frontmatter value/item occurrences in an accepted VS Code prompt or root direct-child CLI command; prompt/command invocation names derived from matched paths remain typed provenance, and links or `#file` targets remain inert |
| `agent` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | Exact supported frontmatter value/item/map-entry occurrences in an accepted `.github/agents/*.md` or `.claude/agents/*.md`; body instructions remain `sourceText`, `hooks` declarations are owned by their separate contained recognitions, and `mcp-servers` is the agent's own frontmatter declaration owning no MCP recognition |
| `settings/config` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`runtime-reference` | Exact supported Repository/local or cross-tool-compatible settings leaf/item/map-entry occurrences; contained Hook values belong only to the `hook` recognition, and settings never own an MCP recognition |
| `marketplace` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact catalog and plugin-entry leaf/item occurrences in an accepted marketplace file; `marketplace.plugin.source` alone represents a plain-string source or object `path` leaf and may seed the closed local-manifest derivation, while inline component bodies are never activated |
| `plugin` | `declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact metadata and component-path leaf/item occurrences in an accepted Copilot plugin manifest; inline Hook/MCP bodies and referenced scripts/assets do not gain plugin metadata IDs, and component paths never create candidates |
| `hook` | `runtime-reference` | Version values, event map keys, matcher values, and exact handler leaf/item/map-entry occurrences in an accepted standalone hook file or settings/agent-contained declaration; plugin Hook paths remain relationships only |

No Copilot recognition uses the shared `rule`, `output style`, or `skill metadata` kind
in the initial release. Typed surface, path-derived scope/invocation, selection,
precedence, trust, installation, enablement, default, and applicability facts are not
authored metadata and are published by no surface.

## Documented but excluded by the initial scope

| Excluded Rule ID | Behavior refs | Documented surface excluded from Inspector reads | Reason and retained fact | Policy refs | Evidence |
|---|---|---|---|---|---|
| `copilot.excluded.additional-standard-locations` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cli.instructions.gemini` | VS Code `.claude/CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/**/*.md` as Copilot recognitions; CLI non-root `CLAUDE.md`, `.claude/CLAUDE.md`, and non-root `GEMINI.md` | The initial specification admits only root `CLAUDE.md` and root `GEMINI.md` for Copilot. Record `documented-but-excluded-by-initial-scope`; do not deny the vendor behavior | FR-003, FR-004, FR-024, QR-001, QR-005 | `vscode.copilot.instructions`, `github.copilot.cli.instructions` |
| `copilot.excluded.extra-directories` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.skills`, `copilot.behavior.cli.instructions.agents`, `copilot.behavior.cli.instructions.path`, `copilot.behavior.cli.skills` | `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`, `COPILOT_SKILLS_DIRS`, VS Code custom-location settings, and user-configured skill locations | Runtime-supplied roots are condition facts, never Repository scan roots or relationships | FR-001, FR-003, FR-024, QR-001, QR-005 | `github.copilot.cli.instructions`, `github.copilot.cli.reference`, `vscode.copilot.settings` |
| `copilot.excluded.vscode-settings` | `copilot.behavior.vscode.settings` | General Repository `.vscode/settings.json` | Documented VS Code setting input, but the initial read allowlist admits only the dedicated `.vscode/mcp.json` candidate and the supported Copilot/Claude settings files | FR-003, FR-004, QR-001, QR-005 | `vscode.settings`, `vscode.copilot.mcp` |
| `copilot.excluded.cli-lsp` | `copilot.behavior.cli.lsp` | Repository `.github/lsp.json` | Documented CLI LSP configuration, but not a Supported Initial Release Customization File | FR-003, FR-004, FR-020, QR-001, QR-005 | `github.copilot.cli.lsp` |
| `copilot.excluded.cli-extensions` | `copilot.behavior.cli.extensions` | Repository `.github/extensions/<name>/extension.{mjs,cjs,js}` | Documented experimental CLI extension surface; executable content is outside the initial allowlist | FR-003, FR-004, FR-020, QR-001, QR-005 | `github.copilot.cli.extensions` |
| `copilot.excluded.user-runtime` | `copilot.behavior.vscode.user.claude`, `copilot.behavior.vscode.user.skills`, `copilot.behavior.vscode.user.agents`, `copilot.behavior.vscode.user.prompts`, `copilot.behavior.vscode.user.hooks`, `copilot.behavior.vscode.user.mcp`, `copilot.behavior.vscode.user.settings`, `copilot.behavior.vscode.user.plugins`, `copilot.behavior.cli.user.skills`, `copilot.behavior.cli.user.agents`, `copilot.behavior.cli.user.hooks`, `copilot.behavior.cli.user.mcp`, `copilot.behavior.cli.user.settings`, `copilot.behavior.cli.user.plugins`, `copilot.behavior.cli.user.lsp`, `copilot.behavior.cli.user.extensions` | User settings, agents, skills, hooks, MCP/LSP, extensions, installed plugins, permissions, state, logs, and caches | Documented User behavior remains visible in the tables above, but FR-015 through FR-018 authorize only the two Copilot Global instruction rules | FR-013, FR-014, FR-015, FR-018, QR-001, QR-005 | `vscode.copilot.instructions`, `vscode.copilot.skills`, `vscode.copilot.settings`, `vscode.copilot.custom-agents`, `vscode.copilot.prompts`, `vscode.copilot.hooks`, `vscode.copilot.mcp`, `vscode.settings`, `vscode.copilot.plugins`, `github.copilot.plugins`, `github.copilot.cli.reference`, `github.copilot.skills`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins`, `github.copilot.hooks`, `github.copilot.cli.lsp`, `github.copilot.cli.extensions` |

The cross-vendor `shared.excluded.managed-remote-state` rule, including hosted Copilot
state, is defined only in [Shared non-read exclusions](../runtime-composition.md#shared-non-read-exclusions).

## Known conflicts and uncertainties

1. **CLI custom-agent project versus user precedence is an unresolved official conflict.**
   `github.copilot.cli.reference` and `github.copilot.cli.configuration` state that
   project agents outrank user agents. `github.copilot.cli.custom-agents` and the loading
   diagram in `github.copilot.cli.plugins` state that user agents outrank project agents.
   The Inspector must preserve `documentation-conflict`; it must not choose a winner.
2. **Nested `AGENTS.md` is surface-specific.** VS Code's experimental implementation
   inventories nested files and lets the model decide based on edited files. Cloud
   documentation states nearest-file precedence. The Cloud rule must not be projected
   onto local VS Code behavior.
3. **CLI command ancestry is not established.** The command reference documents
   `.claude/commands/*.md` and its priority below same-name skills, but not a complete
   project/user base or ancestor traversal. The root direct-child Inspector matcher is a
   conservative initial policy, not a claim about runtime discovery.
4. **Several MCP and duplicate-name edges are unresolved.** VS Code does not fully document
   duplicate custom-agent or skill precedence across workspace, user, organization, and
   plugin sources. For MCP, the 1.118 release note adds workspace-root `.mcp.json` and a
   most-specific rule, while the current guide still lists only `.vscode/mcp.json` and User
   configuration. The root schema and the total order across locations are not specified;
   the conflict and unknown conditions must remain visible.
5. **Custom-agent context composition is incomplete.** VS Code documents always-on
   instructions and prepending the selected profile body. Current Cloud and CLI sources
   do not define a complete instruction order inside a separate custom-agent/subagent
   context or establish an agent-profile skill preload. Those edges remain unknown.
6. **Authored plugin metadata is not activation evidence.** A manifest or marketplace
   proves an authored candidate only. Registration, installation, enabled state,
   component overrides, trust, and hosted availability are independent facts.
7. **Documentation is fast-moving.** Canonical pages, enumerated section names, the
   per-record review dates through 2026-07-20, and semantic fingerprints in the Official Sources contract are
   the maintenance baseline; search-result snippets are not evidence.
