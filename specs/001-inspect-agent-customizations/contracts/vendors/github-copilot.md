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
| **Descendant inventory** | An Inspector-only downward inventory below the retained `./` boundary. It inventories possible authored runtime contexts; it is not a Copilot runtime locator or proof of loading. |
| **Candidate** | An authored file that matches an Inspector rule. A candidate is not necessarily applicable, trusted, installed, enabled, selected, or merged by Copilot. |

A `**` segment appears below only when recursion is anchored by a separately named base
or by the Inspector's explicit `./` boundary. A bare `**/` prefix is never a valid
Inspector selector.

The Inspector's selected Repository root is a single filesystem path and does not model
a multi-root workspace: workspace folders outside the selected root are outside the
Repository source, and which workspace folder a VS Code surface actually uses remains
the unresolved `workspace-root` condition fact rather than an inferred winner.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract has exactly one
`EvidenceAssessment`. Unless listed in the exception table below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. The default is a closed
contract mapping for each unlisted subject, not an inference from a non-empty Evidence
cell; empty qualifiers mean no lifecycle claim, never `stable`. Existing table columns
named Status, Documentation status, Runtime/documentation status, or Inspector status are
human rationale or Inspector-scope state and are not serialized status scalars. Runtime
`documentation-conflict` remains a `ConditionFact.status`; the canonical assessment uses
`conflict`.

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
| `copilot.behavior.cli.mcp` | `partially-documented` | `[]` | Same-name resolution among ancestor files is incomplete |
| `copilot.behavior.cli.extensions` | `documented` | `[experimental]` | The documented extension surface is experimental |
| `copilot.behavior.cli.user.agents` | `conflict` | `[]` | It carries the same retained project-versus-User conflict |
| `copilot.behavior.cli.user.extensions` | `documented` | `[experimental]` | The documented User extension surface is experimental |
| `copilot.behavior.cloud.skills` | `partially-documented` | `[]` | Local-personal projection is not established |
| `copilot.behavior.cloud.remote-skills` | `partially-documented` | `[]` | Exact Cloud collision behavior is incomplete |
| `copilot.repo.command` | `partially-documented` | `[]` | The conservative matcher is supported, but product ancestry is not documented |
| `copilot.repo.mcp.vscode-root` | `conflict` | `[]` | The exact 1.118+ path is release-note documented, while the current guide's exhaustive location list omits it and does not establish its schema |

The typed registry expands the default and exceptions to one record per subject. A
candidate provenance retains the assessment for its exact `ruleId` and each exact
`behaviorId`; a relationship retains the assessment for its relationship-only rule and
each referenced behavior/strategy. Those arrays are sorted and deduplicated by subject,
not reduced to a scalar or qualifier union.

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
| `copilot.behavior.vscode.instructions.agents` | Workspace root | `AGENTS.md` | Root file is always-on when enabled. Nested files are experimental and disabled by default; when enabled, VS Code inventories subfolders and the agent decides which instructions apply to edited files | `copilot.vscode.instructions.layering` | Documented; nested selection is model-dependent | `vscode.copilot.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.vscode.instructions.claude` | Workspace root | `CLAUDE.md`; `.claude/CLAUDE.md`; local `CLAUDE.local.md` variant | Always-on when `chat.useClaudeMdFile` is enabled; parent discovery is surface-setting dependent | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions` |
| `copilot.behavior.vscode.skills` | Workspace root | `.github/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` | Skill metadata is discovered first and content is loaded progressively when relevant; parent discovery is opt-in | `copilot.vscode.skills.selection` | Documented; duplicate-name precedence is not documented | `vscode.copilot.skills`, `vscode.copilot.settings`, `github.copilot.skills` |
| `copilot.behavior.vscode.agents` | Workspace root | `.github/agents/*.md`; `.claude/agents/*.md` | Folder-based discovery; VS Code accepts any `.md` file in `.github/agents`. Parent discovery is opt-in | `copilot.vscode.agents.selection` | Documented; cross-scope duplicate-name precedence is not documented | `vscode.copilot.custom-agents`, `vscode.copilot.settings`, `github.copilot.custom-agents` |
| `copilot.behavior.vscode.prompts` | Workspace root | `.github/prompts/*.prompt.md` | Explicit/manual invocation; additional locations come from `chat.promptFilesLocations` | —; explicit prompt invocation | Documented; default nested-directory behavior is not stated precisely | `vscode.copilot.prompts`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.hooks` | Workspace root | `.github/hooks/*.json`; `.claude/settings.json`; `.claude/settings.local.json`; agent-scoped hook declarations | Workspace hooks take precedence over user hooks for the same event; agent and plugin hooks can run in addition; parent discovery is opt-in | `copilot.vscode.hooks.composition` | Documented; preview features remain activation-conditional | `vscode.copilot.hooks`, `vscode.copilot.custom-agents`, `vscode.copilot.customization` |
| `copilot.behavior.vscode.mcp` | Workspace root | For VS Code 1.118+: `.mcp.json`; all reviewed versions: `.vscode/mcp.json` | Both are exact workspace-root locations. The current guide directly documents the `.vscode/mcp.json` `servers` schema but still calls it the workspace location; the 1.118 release note separately adds root `.mcp.json` and announces most-specific same-name deduplication without defining that file's schema or a total order across root, `.vscode`, User, agent, and plugin inputs. The Inspector therefore attaches path/surface provenance for root `.mcp.json` but makes no VS Code-owned schema claim; independently documented CLI extraction on the same physical file remains separate provenance in the one Copilot/MCP recognition | `copilot.vscode.mcp.selection` | Conflict between the current exhaustive guide and the newer release note; root schema and exact selection order remain unknown | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.behavior.vscode.settings` | Workspace root | `.vscode/settings.json`; plugin-recommendation keys in `.github/copilot/settings.json` | VS Code setting scopes apply; workspace values override user values. The Copilot settings file is not a replacement for general VS Code settings | `copilot.vscode.settings.precedence` | Documented | `vscode.settings`, `vscode.copilot.plugins`, `vscode.copilot.settings` |
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
| `copilot.behavior.cli.skills` | Runtime project and inherited parent layers | `.github/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md`; `.claude/skills/<name>/SKILL.md` | First found wins for duplicate names; project locations precede inherited, personal, plugin, custom, built-in, and remote sources in the documented order | `copilot.cli.skills.selection` | Documented | `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.behavior.cli.agents` | Runtime `cwd` through Git root | At each ancestor: `.github/agents/*.md`; `.claude/agents/*.md` | Load every ancestor layer; deepest project layer wins, and `.github/agents` wins over `.claude/agents` at the same layer | `copilot.cli.agents.selection` | Project traversal documented; project-versus-user precedence conflicts | `github.copilot.cli.reference`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins` |
| `copilot.behavior.cli.commands` | Project location is implied but not fully anchored in the reference | `.claude/commands/*.md` | Alternative skill format; a same-name skill has higher priority. Ancestor and recursive discovery are not specified | `copilot.cli.skills.selection` | Partially documented | `github.copilot.cli.reference` |
| `copilot.behavior.cli.hooks` | Repository root | `.github/hooks/*.json`; inline hooks in `.github/copilot/settings.json`, `.github/copilot/settings.local.json`, `.claude/settings.json`, and `.claude/settings.local.json` | Same-event hooks are composed rather than selected; repository inline hooks are appended after user hooks | `copilot.cli.hooks.composition` | Documented | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.behavior.cli.mcp` | Runtime `cwd` through Git root | At each ancestor: `.mcp.json`; `.github/mcp.json` | Requires workspace trust. Session additional config and plugin servers precede workspace servers; user config follows. Same-name behavior among ancestor files is not fully specified | `copilot.cli.mcp.selection` | Documented with one unresolved duplicate case | `github.copilot.cli.reference` |
| `copilot.behavior.cli.settings` | Repository root | `.github/copilot/settings.json`; `.github/copilot/settings.local.json`; documented Claude-compatible subset in `.claude/settings.json` and `.claude/settings.local.json` | Repository and local settings participate in the documented defaults/managed/user/repository/local/environment/flag cascade; individual keys replace, merge, or concatenate | `copilot.cli.settings.precedence` | Documented | `github.copilot.cli.configuration` |
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
| `copilot.behavior.cloud.remote-skills` | Copilot services, Organization/enterprise | Hosted skill relay | No Repository or User filesystem locator | Remote skills are projected at runtime; collision behavior must remain surface-qualified | `copilot.cloud.skills.selection` | Documented at concept level; exact Cloud collision behavior is incomplete | `github.copilot.skills`, `github.copilot.cli.reference` |

GitHub.com Copilot Chat supports hosted personal instructions, but the current support
matrix does not list personal instructions as a Cloud-agent layer. A hosted personal Chat
setting must therefore not be projected into a Cloud-agent instruction chain.

## Inspector Repository matcher rules

Every Base in this table is the exact Inspector Repository boundary (`./`), which is the
selected Repository root from captured `process.cwd()` or `--cwd`. The Inspector does not search above it for a workspace, project,
or Git root. A selector beginning `./**/` is an explicitly anchored Inspector inventory,
not a claim that VS Code, CLI, or Cloud walks downward. No selector begins with bare
`**/`. Every row has policy references FR-003, FR-004, FR-005, FR-024, QR-001, QR-004,
and QR-005 unless a narrower exclusion or Global requirement is stated below.

The VS Code/Cloud repository-wide and path-instruction rules use the root-exact
`./.github/...` spelling. Separate CLI-context rules use `./**/.github/...` solely because
CLI documents additional standard locations. Because `**` can match zero segments, the
CLI rule also covers the selected Repository root. A root file therefore receives VS Code/Cloud
provenance from the root-exact rule and CLI provenance from the CLI-context rule, without
duplicating the same surface provenance or merging runtime behavior.

| Rule ID | Base | Relative selector | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.repo.instructions.repository` | `./` | `./.github/copilot-instructions.md` | `exact` at the Inspector root | `static-candidate` | `copilot.behavior.vscode.instructions.repository`, `copilot.behavior.cloud.instructions.repository` | Root-exact VS Code/Cloud provenance only; CLI provenance comes from the separate CLI-context rule | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.repository-cli-context` | `./` | `./**/.github/copilot-instructions.md` | Inspector-only `descendant-inventory` of possible CLI standard-location contexts; never project it as VS Code/Cloud traversal | `static-candidate` | `copilot.behavior.cli.instructions.repository` | CLI-only candidate provenance; runtime `cwd`, worked path, and Git root remain conditions | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.path` | `./` | `./.github/instructions/**/*.instructions.md` | `recursive-subtree` below the root-exact `.github/instructions/` directory | `static-candidate` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.cloud.instructions.path` | Root-exact VS Code/Cloud subtree provenance only; applicability remains surface-specific | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.path-cli-context` | `./` | `./**/.github/instructions/**/*.instructions.md` | Inspector-only `descendant-inventory` of possible CLI context roots plus `recursive-subtree` below each fixed instruction directory | `static-candidate` | `copilot.behavior.cli.instructions.path` | CLI-only candidate provenance; CLI excludes intermediate root-to-`cwd` layers at runtime | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.agents` | `./` | `./**/AGENTS.md` | `descendant-inventory` | `static-candidate` | `copilot.behavior.vscode.instructions.agents`, `copilot.behavior.cli.instructions.agents`, `copilot.behavior.cloud.instructions.agents` | Documented; selection is surface/runtime conditional | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.claude-root` | `./` | `./CLAUDE.md` | `exact` | `static-candidate` | `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate; additional documented paths excluded by initial scope | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.gemini-root` | `./` | `./GEMINI.md` | `exact` | `static-candidate` | `copilot.behavior.cli.instructions.gemini`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate; non-root CLI paths excluded by initial scope | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.skill` | `./` | `./**/.github/skills/*/SKILL.md`; `./**/.agents/skills/*/SKILL.md`; `./**/.claude/skills/*/SKILL.md` | `descendant-inventory`; skill name is one direct child of a fixed skills directory | `static-candidate` | `copilot.behavior.vscode.skills`, `copilot.behavior.cli.skills`, `copilot.behavior.cloud.skills` | Documented authored inventory; runtime selection conditional | `vscode.copilot.skills`, `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.repo.agent` | `./` | `./**/.github/agents/*.md`; `./**/.claude/agents/*.md` | `descendant-inventory`; agent file is a direct child | `static-candidate` | `copilot.behavior.vscode.agents`, `copilot.behavior.cli.agents`, `copilot.behavior.cloud.agents` | Documented authored inventory; surface and precedence conditional/conflicting | `vscode.copilot.custom-agents`, `github.copilot.cli.reference`, `github.copilot.custom-agents` |
| `copilot.repo.prompt` | `./` | `./.github/prompts/*.prompt.md` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.prompts` | Documented VS Code/manual surface only | `vscode.copilot.prompts` |
| `copilot.repo.command` | `./` | `./.claude/commands/*.md` | `direct-child` | `static-candidate` | `copilot.behavior.cli.commands` | Conservative initial matcher; product ancestry is not documented | `github.copilot.cli.reference` |
| `copilot.repo.hooks` | `./` | `./.github/hooks/*.json` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.hooks`, `copilot.behavior.cli.hooks`, `copilot.behavior.cloud.hooks` | Documented root hook files; settings can contain inline hook metadata | `vscode.copilot.hooks`, `github.copilot.hooks` |
| `copilot.repo.mcp` | `./` | `./**/.mcp.json`; `./**/.github/mcp.json` | `descendant-inventory` | `static-candidate` | `copilot.behavior.cli.mcp` | Documented CLI candidate inventory; runtime ancestor chain and trust conditional | `github.copilot.cli.reference` |
| `copilot.repo.mcp.vscode-root` | `./` | `./.mcp.json` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | VS Code 1.118+ path/surface provenance only. The current guide omits this location, and no VS Code schema extractor is authorized until direct documentation resolves the conflict | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.repo.mcp.vscode` | `./` | `./.vscode/mcp.json` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | Dedicated VS Code MCP candidate; schema differs from CLI | `vscode.copilot.mcp`, `github.copilot.cli.reference` |
| `copilot.repo.settings` | `./` | `./.github/copilot/settings.json`; `./.github/copilot/settings.local.json`; `./.claude/settings.json`; `./.claude/settings.local.json` | `exact` for each selector | `static-candidate` | `copilot.behavior.cli.settings`, `copilot.behavior.cli.hooks`, `copilot.behavior.vscode.hooks`, `copilot.behavior.cloud.plugins` | Documented supported subset; general `.vscode/settings.json` excluded | `github.copilot.cli.configuration`, `github.copilot.hooks`, `vscode.copilot.plugins` |
| `copilot.repo.plugin-manifest` | `./` | `./.plugin/plugin.json`; `./plugin.json`; `./.github/plugin/plugin.json`; `./.claude-plugin/plugin.json` | `exact` for each selector, and only when the Inspector selected Repository boundary is intentionally treated as an authored plugin root | `static-candidate` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | Inspector policy for an explicit root only; it is not Copilot discovery or activation evidence | `vscode.copilot.plugins`, `github.copilot.cli.plugins` |
| `copilot.repo.marketplace` | `./` | `./marketplace.json`; `./.plugin/marketplace.json`; `./.github/plugin/marketplace.json`; `./.claude-plugin/marketplace.json` | `exact` for each selector, and only when the Inspector selected Repository boundary is intentionally treated as an authored catalog root | `static-candidate` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | Inspector policy for an explicit root only; installation and enablement are separate | `vscode.copilot.plugins`, `github.copilot.cli.plugins` |

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

| Rule ID | Boundary base | Relative selector | Expansion | Class | Behavior refs | Runtime strategy | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|---|
| `copilot.global.instructions.root` | Exact consented captured `COPILOT_HOME`; only when absent, `node:path.join` of the request-wide imported `node:os.homedir()` capture and `.copilot` | `copilot-instructions.md` | `exact` | `static-candidate` | `copilot.behavior.cli.user.instructions.root` | `copilot.cli.instructions.layering` | FR-013, FR-014, FR-015, FR-018, QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.global.instructions.path` | The same exact consented `<COPILOT_HOME>` boundary | `instructions/**/*.instructions.md` | `recursive-subtree` below the fixed `instructions/` directory | `static-candidate` | `copilot.behavior.cli.user.instructions.path`, `copilot.behavior.vscode.user.instructions` | `copilot.cli.instructions.layering`, `copilot.vscode.instructions.layering` | FR-013, FR-014, FR-015, FR-018, QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support`, `vscode.copilot.instructions`, `vscode.copilot.settings` |

A present empty or relative `COPILOT_HOME`, or a non-throwing rejected root outcome, is an
invalid override and does not silently fall back. A non-carveout throw or rejection during root selection
or admission propagates unchanged. User settings, agents, skills, hooks, MCP, LSP,
extensions, plugins, permissions, credentials, logs, sessions, and caches remain excluded
even when stored below the same boundary.

## Derived rule and relationship index

| Rule ID | Accepted seed | Permitted target | Behavior refs | Strategy refs | Closed derivation and status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.derived.local-plugin-manifest` | An accepted Copilot marketplace entry with a documented local `source` | At the validated local plugin root: `.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, `.claude-plugin/plugin.json` | `copilot.behavior.vscode.plugins`, `copilot.behavior.cli.plugins` | `copilot.vscode.plugins.activation`, `copilot.cli.plugins.activation` | Accept `plugins/foo` or `./plugins/foo`; resolve from the catalog root and remain inside it; try only the enumerated manifest names in documented order; the derivation is nonrecursive. Git, HTTP(S), npm, absolute, and home-relative sources remain relationships | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `github.copilot.cli.plugins`, `vscode.copilot.plugins` |

The relationship-only rules referenced by this vendor—
`copilot.relationship.instruction-import`, `copilot.relationship.prompt-reference`,
`copilot.relationship.settings`, `copilot.relationship.component`, and
`copilot.relationship.agent-context`—are defined exactly once in the
[central relationship-only registry](../runtime-composition.md#normative-relationship-only-registry).
This index grants no read authority and does not duplicate those definitions.

## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for GitHub Copilot. The kind
spellings are the exact `ToolRecognition.kind` values. A field ID names one authored
source occurrence class, not an arbitrary key supplied by the inspected file. A repeated
array item or dynamic map entry produces another source-ordered occurrence under the same
field ID; for server, environment, header, Hook-event, metadata, and named-setting
`*.name` IDs, the authored map key is the occurrence. `marketplace.plugin.source` is the
single cross-vendor field ID used by the closed marketplace derivation: it denotes
either a plain-string source or the `path` leaf of an object source.

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

The rows are exhaustive. A contained MCP or Hook declaration uses the `MCP` or `hook`
row on its already admitted owner file; it does not gain fields from the owner's other
recognition and does not create a synthetic file. Unknown keys and references remain
visible only in complete `sourceText`. A relationship can be emitted only when both its
kind is listed here and its origin is covered by the appropriate relationship-only rule
in the central registry. This allowlist never grants read, connection, execution,
import, installation, or activation authority.

| `ToolRecognition.kind` | Eligible declared-metadata `fieldId` values | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|---|
| `instructions` | `copilot.instructions.name`<br>`copilot.instructions.description`<br>`copilot.instructions.apply-to`<br>`copilot.instructions.exclude-agent`<br>`copilot.instructions.import-target` | `import` | Exact supported frontmatter values in an accepted `*.instructions.md`, plus authored CLI `@path` targets in accepted `.github/copilot-instructions.md`, `AGENTS.md`, or Copilot-recognized `CLAUDE.md`; path-derived scope and enablement remain typed facts |
| `skill` | `copilot.skill.name`<br>`copilot.skill.description`<br>`copilot.skill.argument-hint`<br>`copilot.skill.allowed-tool`<br>`copilot.skill.user-invocable`<br>`copilot.skill.disable-model-invocation`<br>`copilot.skill.context` | `skill-resource`<br>`context-inheritance` | Exact supported frontmatter value/item occurrences in an accepted `SKILL.md`; relative resource references can be relationships but never authorize reads |
| `MCP` | `copilot.mcp.server.name`<br>`copilot.mcp.server.type`<br>`copilot.mcp.server.command`<br>`copilot.mcp.server.arg`<br>`copilot.mcp.server.tool`<br>`copilot.mcp.server.env.name`<br>`copilot.mcp.server.env.value`<br>`copilot.mcp.server.cwd`<br>`copilot.mcp.server.timeout`<br>`copilot.mcp.server.defer-tools`<br>`copilot.mcp.server.url`<br>`copilot.mcp.server.header.name`<br>`copilot.mcp.server.header.value`<br>`copilot.mcp.server.oauth-client-id`<br>`copilot.mcp.server.oauth-public-client`<br>`copilot.mcp.server.oauth-grant-type`<br>`copilot.mcp.server.oidc`<br>`copilot.mcp.server.filter-mapping`<br>`copilot.mcp.server.sandbox-enabled` | `runtime-reference` | Server-name map keys and exact supported server leaf/item occurrences in an accepted CLI `mcpServers` file, VS Code `.vscode/mcp.json` `servers` file, or custom-agent-contained declaration; a VS Code 1.118+ root `.mcp.json` provenance is path/surface-only and adds no VS Code-owned extractor fields until direct documentation establishes its schema, while any CLI extraction on the same file remains independent; environment/header values remain authored literals and are never expanded |
| `prompt/command` | `copilot.prompt.name`<br>`copilot.prompt.description`<br>`copilot.prompt.argument-hint`<br>`copilot.prompt.agent`<br>`copilot.prompt.model`<br>`copilot.prompt.tool`<br>`copilot.command.description`<br>`copilot.command.argument-hint`<br>`copilot.command.allowed-tool`<br>`copilot.command.disable-model-invocation` | `skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact supported frontmatter value/item occurrences in an accepted VS Code prompt or root direct-child CLI command; prompt/command invocation names derived from matched paths remain typed provenance, and links or `#file` targets remain inert |
| `agent` | `copilot.agent.name`<br>`copilot.agent.description`<br>`copilot.agent.target`<br>`copilot.agent.tool`<br>`copilot.agent.model`<br>`copilot.agent.disable-model-invocation`<br>`copilot.agent.user-invocable`<br>`copilot.agent.infer`<br>`copilot.agent.metadata.name`<br>`copilot.agent.metadata.value`<br>`copilot.agent.argument-hint`<br>`copilot.agent.subagent`<br>`copilot.agent.disallowed-tool`<br>`copilot.agent.handoff.label`<br>`copilot.agent.handoff.agent`<br>`copilot.agent.handoff.prompt`<br>`copilot.agent.handoff.send`<br>`copilot.agent.handoff.model` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | Exact supported frontmatter value/item/map-entry occurrences in an accepted `.github/agents/*.md` or `.claude/agents/*.md`; body instructions remain `sourceText`, while `hooks` and `mcp-servers` are owned by their separate contained recognitions |
| `settings/config` | `copilot.settings.company-announcement`<br>`copilot.settings.context-tier`<br>`copilot.settings.denied-url`<br>`copilot.settings.disable-all-hooks`<br>`copilot.settings.disabled-mcp-server`<br>`copilot.settings.disabled-skill`<br>`copilot.settings.effort-level`<br>`copilot.settings.enabled-plugin.name`<br>`copilot.settings.enabled-plugin.value`<br>`copilot.settings.extra-known-marketplace.name`<br>`copilot.settings.extra-known-marketplace.source`<br>`copilot.settings.extra-known-marketplace.repo`<br>`copilot.settings.extra-known-marketplace.url`<br>`copilot.settings.extra-known-marketplace.path`<br>`copilot.settings.extra-known-marketplace.ref`<br>`copilot.settings.extra-known-marketplace.sha`<br>`copilot.settings.extra-known-marketplace.auto-update`<br>`copilot.settings.include-co-authored-by`<br>`copilot.settings.merge-strategy`<br>`copilot.settings.model`<br>`copilot.settings.respect-gitignore` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`runtime-reference` | Exact supported Repository/local or cross-tool-compatible settings leaf/item/map-entry occurrences; contained Hook values belong only to the `hook` recognition, and settings never own an MCP recognition |
| `marketplace` | `marketplace.name`<br>`marketplace.owner.name`<br>`marketplace.owner.email`<br>`marketplace.description`<br>`marketplace.version`<br>`marketplace.metadata.plugin-root`<br>`marketplace.plugin.name`<br>`marketplace.plugin.source`<br>`marketplace.plugin.source.type`<br>`marketplace.plugin.source.url`<br>`marketplace.plugin.source.repo`<br>`marketplace.plugin.source.ref`<br>`marketplace.plugin.source.sha`<br>`marketplace.plugin.description`<br>`marketplace.plugin.version`<br>`marketplace.plugin.author.name`<br>`marketplace.plugin.author.email`<br>`marketplace.plugin.author.url`<br>`marketplace.plugin.homepage`<br>`marketplace.plugin.repository`<br>`marketplace.plugin.license`<br>`marketplace.plugin.keyword`<br>`marketplace.plugin.category`<br>`marketplace.plugin.tag`<br>`marketplace.plugin.commands`<br>`marketplace.plugin.agents`<br>`marketplace.plugin.skills`<br>`marketplace.plugin.hooks`<br>`marketplace.plugin.mcp-servers`<br>`marketplace.plugin.lsp-servers`<br>`marketplace.plugin.strict` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact catalog and plugin-entry leaf/item occurrences in an accepted marketplace file; `marketplace.plugin.source` alone represents a plain-string source or object `path` leaf and may seed the closed local-manifest derivation, while inline component bodies are never activated |
| `plugin` | `copilot.plugin.name`<br>`copilot.plugin.description`<br>`copilot.plugin.version`<br>`copilot.plugin.author.name`<br>`copilot.plugin.author.email`<br>`copilot.plugin.author.url`<br>`copilot.plugin.homepage`<br>`copilot.plugin.repository`<br>`copilot.plugin.license`<br>`copilot.plugin.keyword`<br>`copilot.plugin.category`<br>`copilot.plugin.tag`<br>`copilot.plugin.agents`<br>`copilot.plugin.skills`<br>`copilot.plugin.commands`<br>`copilot.plugin.hooks`<br>`copilot.plugin.extensions`<br>`copilot.plugin.mcp-servers`<br>`copilot.plugin.lsp-servers` | `declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | Exact metadata and component-path leaf/item occurrences in an accepted Copilot plugin manifest; inline Hook/MCP bodies and referenced scripts/assets do not gain plugin metadata IDs, and component paths never create candidates |
| `hook` | `copilot.hook.version`<br>`copilot.hook.event`<br>`copilot.hook.matcher`<br>`copilot.hook.handler.type`<br>`copilot.hook.handler.command`<br>`copilot.hook.handler.bash`<br>`copilot.hook.handler.powershell`<br>`copilot.hook.handler.windows`<br>`copilot.hook.handler.linux`<br>`copilot.hook.handler.osx`<br>`copilot.hook.handler.cwd`<br>`copilot.hook.handler.env.name`<br>`copilot.hook.handler.env.value`<br>`copilot.hook.handler.timeout`<br>`copilot.hook.handler.timeout-sec`<br>`copilot.hook.handler.url`<br>`copilot.hook.handler.header.name`<br>`copilot.hook.handler.header.value`<br>`copilot.hook.handler.allowed-env-var`<br>`copilot.hook.handler.prompt` | `runtime-reference` | Version values, event map keys, matcher values, and exact handler leaf/item/map-entry occurrences in an accepted standalone hook file or settings/agent-contained declaration; plugin Hook paths remain relationships only |

No Copilot recognition uses the shared `rule`, `output style`, or `skill metadata` kind
in the initial release. Typed surface, path-derived scope/invocation, selection,
precedence, trust, installation, enablement, default, and applicability facts are not
authored metadata and therefore are not additional field IDs.

## Documented but excluded by the initial scope

| Excluded Rule ID | Behavior refs | Documented surface excluded from Inspector reads | Reason and retained fact | Policy refs | Evidence |
|---|---|---|---|---|---|
| `copilot.excluded.additional-standard-locations` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cli.instructions.gemini` | VS Code `.claude/CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/**/*.md` as Copilot recognitions; CLI non-root `CLAUDE.md`, `.claude/CLAUDE.md`, and non-root `GEMINI.md` | The initial specification admits only root `CLAUDE.md` and root `GEMINI.md` for Copilot. Record `documented-but-excluded-by-initial-scope`; do not deny the vendor behavior | FR-003, FR-004, FR-024, QR-001, QR-005 | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.excluded.extra-directories` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.skills`, `copilot.behavior.cli.instructions.path`, `copilot.behavior.cli.skills` | `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`, `COPILOT_SKILLS_DIRS`, VS Code custom-location settings, and user-configured skill locations | Runtime-supplied roots are condition facts, never Repository scan roots or relationships | FR-001, FR-003, FR-024, QR-001, QR-005 | `github.copilot.cli.instructions`, `github.copilot.cli.reference`, `vscode.copilot.settings` |
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
