# Vendor Contract: Gemini CLI

[日本語](gemini-cli.ja.md)

**Contract version**: 2026-09-09
**Official-source review**: 2026-09-09

This contract separates documented Gemini CLI lookup behavior from the Inspector's read
allowlist. The common matcher grammar and source-boundary rules are defined in
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.md).
Composition and precedence are defined by ID in
[Runtime Composition](../runtime-composition.md),
and evidence records are defined in
[Official Sources](../official-sources.md).

`behaviorId` describes Gemini CLI. `ruleId` describes Inspector policy. A vendor locator
or behavior record never grants read authority.

## Surface boundary

Gemini CLI is one product with one surface: the terminal client, whether launched
directly or through the IDE companion that drives the same client. Every behavior below is
therefore marked **CLI**, and no row distinguishes an editor, a hosted agent, or a cloud
service, because the vendor documents none that reads a local customization file
differently. What differs is not the surface but the tier: the vendor documents a system
tier (settings, defaults, and policies under an administrator-owned directory), a user tier
(the `.gemini` directory below the home), a project tier (the `.gemini` directory at the
project root), and an extension tier (installed copies under the home's `extensions/`
directory). The Inspector reads the project tier as its Repository Source and the user tier as its Gemini CLI Global member; the extension tier is recorded and excluded, and the system tier is excluded without a behavior row of its own, because no Source reaches it.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract states its own
`documentationStatus` and `lifecycleQualifiers`. Unless listed below, its canonical values
are `documentationStatus: documented` and `lifecycleQualifiers: []`. This is a closed
mapping for every unlisted subject, not an inference from an Evidence cell. Empty
qualifiers make no lifecycle claim and never mean `stable`.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `gemini.behavior.repo.context` | `partially-documented` | `[]` | The hierarchy page names the workspace directories, their parents, and a just-in-time scan of an accessed directory and its ancestors, but states neither the boundary of the parent walk nor whether a descendant is read before a tool accesses it |
| `gemini.behavior.repo.commands` | `partially-documented` | `[]` | The page states the naming rule in general terms with one nested example; the depth a path may reach and the sanitization of a segment's characters are the vendor loader's, measured rather than documented (§ Known uncertainties item 8) |
| `gemini.behavior.user.commands` | `partially-documented` | `[]` | As the project row: the same naming rule, the same two facts the page leaves to the loader |
| `gemini.behavior.repo.agents` | `documented` | `[experimental]` | The page names the project location exactly; subagents are toggled by an `experimental` setting |
| `gemini.behavior.repo.policies` | `documented` | `[]` | The page states that the workspace tier is currently non-functional — a documented fact about a location that is not read |
| `gemini.behavior.user.agents` | `documented` | `[experimental]` | As the project row: the user location is named exactly, under the same experimental gate |
| `gemini.derived.context-filename` | `partially-documented` | `[]` | The rule admits the context filename at every depth, which the just-in-time scan supports for any accessed directory; whether the vendor reads a file no tool has touched is not established. The derivation itself — the configured names in place of the default — is documented |
| `gemini.repo.agent` | `documented` | `[experimental]` | The Inspector rule admits the documented direct children under the documented experimental gate |
| `gemini.global.agent` | `documented` | `[experimental]` | The same, below the user tier |
| `gemini.agents.selection` | `unknown` | `[experimental]` | The page names both locations and says nothing about a same-name agent at both |

The fixed qualifier order is `preview`, `experimental`, `deprecated`; no row here has more
than one. These are maintenance records; no response carries one (QR-005).

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `gemini.behavior.repo.context` | CLI | Configured workspace directories, their parents, and every directory a tool accesses | `GEMINI.md`, or each name `context.fileName` declares | Loaded in the documented order — the global file, then the workspace directories and their parents, then just-in-time files from an accessed directory and its ancestors up to a trusted root — and concatenated into one context; `@file.md` imports are resolved by the vendor and stay authored text here | `gemini.context.layering` | Partially documented; the parent-walk boundary and pre-access descendant reads are not stated | `google.gemini-cli.gemini-md` |
| `gemini.behavior.repo.settings` | CLI | Project root | `.gemini/settings.json` | The project settings layer, above user settings and below system settings in the documented precedence; ignored in an untrusted folder | `gemini.settings.precedence` | Documented; trust conditional | `google.gemini-cli.configuration`, `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.mcp` | CLI | Project root | `mcpServers` inside `.gemini/settings.json` | Servers are declared by name under `mcpServers`, with one required transport (`command`, `url`, or `httpUrl`) and optional `args`, `env`, `cwd`, `headers`, `timeout`, `trust`, `includeTools`, `excludeTools`; `$VAR_NAME` in `env` is expanded by the vendor at connection time; project servers do not connect in an untrusted folder | `gemini.mcp.configuration` | Documented; trust conditional | `google.gemini-cli.mcp-server`, `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.hooks` | CLI | Project root | `hooks` inside `.gemini/settings.json` | Merged with the user, system, and extension layers in the documented precedence; each event holds hook definitions whose `hooks[].command` is a shell command the vendor runs; project hooks are fingerprinted and a changed one is treated as new | `gemini.hooks.merge` | Documented; trust and fingerprint conditional | `google.gemini-cli.hooks`, `google.gemini-cli.hooks-reference` |
| `gemini.behavior.repo.commands` | CLI | Project root | `.gemini/commands/**/*.toml` | The command name is the file's path relative to `commands/` with the separator converted to `:` and the extension removed, at any depth; each segment's UTF-16 code units outside `[A-Za-z0-9_.-]` become `_` and a segment over 50 characters is cut to 47 plus `...`, which the loader does and the page does not say; a project command with a user command's name is always used; not loaded in an untrusted folder | `gemini.commands.selection` | Partially documented; trust conditional | `google.gemini-cli.custom-commands`, `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.skills` | CLI | Project root | `.gemini/skills/<name>/SKILL.md`; `.agents/skills/<name>/SKILL.md` as its documented alias | The workspace tier, highest of four; a same-name skill in a higher tier wins, and within the tier the `.agents/skills/` copy wins over `.gemini/skills/`; unavailable in an untrusted folder | `gemini.skills.selection` | Documented; trust conditional | `google.gemini-cli.skills`, `google.gemini-cli.creating-skills`, `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.agents` | CLI | Project root | `.gemini/agents/*.md` | Markdown with required YAML frontmatter; `name` is the tool name the agent is invoked by; enabled unless `experimental.enableAgents` is false | `gemini.agents.selection` | Documented; experimental | `google.gemini-cli.subagents` |
| `gemini.behavior.repo.policies` | CLI | Project root | `.gemini/policies/*.toml` | The workspace tier of the policy engine, documented as currently non-functional: files there have no effect | `gemini.policies.tiers` | Documented as not loaded | `google.gemini-cli.policy-engine` |
| `gemini.behavior.repo.trust` | CLI | Project root | The folder itself | An untrusted folder loads no project settings, `.env`, project MCP server, custom command, or skill and disables automatic memory loading; the decision is recorded in the user tier's `trustedFolders.json` | Condition for every Repository strategy | Documented | `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.ignore` | CLI | Project root | `.geminiignore` | Excludes matching paths from tools that respect it, such as `@` file references; not a customization the model reads | `gemini.excluded.repo-non-customizations` | Documented; excluded | `google.gemini-cli.gemini-ignore` |
| `gemini.behavior.repo.env` | CLI | Current directory upward to the project root or home, then `~/.env` | `.env`, and `.gemini/.env` | Environment variables loaded into the process; never a customization the model reads, and ignored in an untrusted folder | `gemini.excluded.repo-non-customizations` | Documented; excluded | `google.gemini-cli.configuration`, `google.gemini-cli.trusted-folders` |

A repository whose own root carries a `gemini-extension.json` is publishing an extension
for others to install rather than carrying a customization the client reads here: the
vendor loads extensions from the home's `extensions/` directory alone, and a development
copy reaches it only through the symbolic link `gemini extensions link` creates. The
manifest and the `commands/`, `skills/`, `agents/`, `hooks/hooks.json`, `policies/`, and
context file beside it therefore acquire no rule from that manifest
(`gemini.excluded.extensions`; spec.md § Clarifications).

## Inspector Repository rules

All bases in this table are the exact Inspector Repository boundary — the selected
Repository root, spelled `Repository`. Every `.gemini/` and `.agents/` location is the
selected root's own directory: the vendor documents the project's `.gemini` directory at
the project root and no nested one, so `packages/api/.gemini/` is a near miss at every
depth. The context file has no static row here: which filename it bears is the settings carrier's decision, so its rule is the derived one below, and the one `descendant-inventory` expansion among the static rows is the command directory's. Every row has policy references
FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, and QR-005 of the parent specification
unless a narrower exclusion or Global requirement is stated below.

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|

| `gemini.repo.settings` | Repository | `['.gemini', 'settings.json']` | `exact` at the Repository root; the settings document's own `settings/config` recognition, one of three rules over one candidate read once | `static-candidate` | `gemini.behavior.repo.settings` | Documented; trust conditional | `google.gemini-cli.configuration` |
| `gemini.repo.mcp` | Repository | `['.gemini', 'settings.json']` | `exact`, over the selector `gemini.repo.settings` authors; the carrier's `mcpServers` map is its `MCP` recognition, published one row per declared server name | `static-candidate` | `gemini.behavior.repo.settings`, `gemini.behavior.repo.mcp` | Documented; trust conditional | `google.gemini-cli.mcp-server` |
| `gemini.repo.hooks` | Repository | `['.gemini', 'settings.json']` | `exact`, over the same selector; the carrier's `hooks` object is its `hook` recognition, admitted by the matcher whatever the object declares, exactly as `.claude/settings.json`'s is | `static-candidate` | `gemini.behavior.repo.settings`, `gemini.behavior.repo.hooks` | Documented; trust and fingerprint conditional | `google.gemini-cli.hooks` |
| `gemini.repo.command` | Repository | `['.gemini', 'commands', ANY_DIRECTORIES, /\.toml$/u]` | `descendant-inventory` below the root's `.gemini/commands/`: the page names subdirectories as namespaces, so a file sits at any depth and its row is named by the `:`-joined path | `static-candidate` | `gemini.behavior.repo.commands` | Documented; trust conditional | `google.gemini-cli.custom-commands` |
| `gemini.repo.skill` | Repository | `['.gemini', 'skills', ANY_NAME, 'SKILL.md']`; `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | `exact` then `direct-child` for each program, anchored at the root; the skill name is one direct child. The second program is the same location Codex and Copilot admit, so an admitted file there carries three tools' recognitions | `static-candidate` | `gemini.behavior.repo.skills` | Documented; trust conditional | `google.gemini-cli.skills`, `google.gemini-cli.creating-skills` |
| `gemini.repo.agent` | Repository | `['.gemini', 'agents', /\.md$/u]` | `direct-child` of the root's `.gemini/agents/`; the page names `.gemini/agents/*.md` and documents no nested search | `static-candidate` | `gemini.behavior.repo.agents` | Documented; experimental | `google.gemini-cli.subagents` |

The settings carrier is one candidate read once and recognized three times — settings,
MCP, hooks — the arrangement `.claude/settings.json` and `.codex/config.toml` already
have. Its `mcpServers` and `hooks` declarations are metadata on that file and create no
second candidate; a `$VAR_NAME` in a server's `env` or `headers` is literal text (FR-026).
The carrier is read as JSON with comments: the vendor's own settings loader strips comments
before `JSON.parse` (measured in `packages/cli/src/config/settings.ts` of
google-gemini/gemini-cli, read 2026-09-09; the configuration reference itself says nothing
about comments), and the parser table in `parsers/json.ts` records that measurement beside
its Copilot entries. The vendor strips comments alone, while the Inspector's lenient
reading also blanks a trailing comma; a file with a trailing comma therefore shows its
declarations on a row whose product would reject it — the milder error, and the same
trade the Copilot entries already accept.

## Derived Repository rules

`Status` is human-readable rationale for the upstream evidence; the canonical index above
owns the rule's exact documentation status.

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `gemini.derived.context-filename` | `bounded-derived-candidate` | The pinned repository `.gemini/settings.json`, read as configuration before the walk — the same read the carrier's own candidacy is seeded from; an absent carrier is an ordinary seed that configures nothing | The context filenames, each as one entry name matched at the root and at every depth below it (`[ANY_DIRECTORIES, <name>]`, the documented just-in-time reach; the parent walk above the root contributes only the selected root, FR-001): the names `context.fileName` declares — one string, or every string of a non-empty string array — when it declares them, and the default `GEMINI.md` otherwise. The setting names the file or files to load, so the configured names stand in for the default rather than beside it, which is why the context file has no static rule of its own: one derivation always yields the plan, default or configured. An absent, unreadable, or unparsable carrier, or a value that is not a non-empty string or a non-empty array of non-empty strings, configures nothing and yields the default; a parse failure is the carrier's own diagnostic through its settings recognition, and an ill-typed value carries none. A user- or system-tier `context.fileName` is a settings-inputs condition the Repository Source does not read | `gemini.behavior.repo.settings`, `gemini.behavior.repo.context` | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `gemini.settings.precedence`, `gemini.context.layering` | `documented` | `google.gemini-cli.gemini-md`, `google.gemini-cli.configuration` |

This is the arrangement `codex.derived.fallback-basename` already has, with one difference the vendors' own semantics impose: Codex adds its configured names to a fixed pair that static rules admit, while Gemini CLI's setting names the context file itself, so the derivation owns the default too and no static rule admits `GEMINI.md`. A static `GEMINI.md` rule beside the derivation would need a second mechanism to withdraw it when names are configured; one derivation that always yields a plan needs none.

## Documented User behavior

This table records what Gemini CLI supports for maintainers. It does not expand Global
inspection. The user tier is the `.gemini` directory below the home; `GEMINI_CLI_HOME`
names the directory that `.gemini` is created in — the home's stand-in, not `.gemini`
itself — which is why the member root is a join in every case (specs/002-gemini-cli-support/spec.md FR-011).
The `~/.agents/skills/` alias lives in the shared agent home, a separately consented
member that no setting relocates (parent FR-045).

| Behavior ID | User behavior | User locator | Strategy / composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `gemini.behavior.user.home` | The user configuration directory | `<GEMINI_CLI_HOME or home>/.gemini/` | Every user-tier locator below resolves against it | The Gemini CLI Global member root | `google.gemini-cli.configuration` |
| `gemini.behavior.user.context` | Global context file | `<user tier>/GEMINI.md` | `gemini.context.layering`; loaded first, before workspace and just-in-time files | Accepted only through `gemini.global.instructions` below; the user tier's own `context.fileName` is a settings-inputs condition and changes nothing here (specs/002-gemini-cli-support/spec.md § Clarifications) | `google.gemini-cli.gemini-md` |
| `gemini.behavior.user.settings` | User settings, MCP servers, and hooks | `<user tier>/settings.json` | `gemini.settings.precedence`, `gemini.mcp.configuration`, `gemini.hooks.merge` | Accepted by `gemini.global.settings`, `gemini.global.mcp`, and `gemini.global.hooks` below | `google.gemini-cli.configuration`, `google.gemini-cli.mcp-server`, `google.gemini-cli.hooks` |
| `gemini.behavior.user.commands` | User custom commands | `<user tier>/commands/**/*.toml` | `gemini.commands.selection`; a project command of the same name is always used instead; named as the project commands are, sanitization included | Accepted by `gemini.global.command` below | `google.gemini-cli.custom-commands` |
| `gemini.behavior.user.skills` | User skills | `<user tier>/skills/<name>/SKILL.md`; `$HOME/.agents/skills/<name>/SKILL.md` as the documented alias | `gemini.skills.selection`; the user tier, below workspace and above extension skills; within the tier the alias wins | Accepted by `gemini.global.skill` below and, at the consented shared agent home, by `gemini.global.agents-home.skill` (parent FR-045) | `google.gemini-cli.skills`, `google.gemini-cli.creating-skills` |
| `gemini.behavior.user.agents` | Personal custom agents | `<user tier>/agents/*.md` | `gemini.agents.selection` | Accepted by `gemini.global.agent` below | `google.gemini-cli.subagents` |
| `gemini.behavior.user.policies` | User policies | `<user tier>/policies/*.toml` | `gemini.policies.tiers`; the user tier, above extension and default policies and below admin | Accepted by `gemini.global.policies` below, recognized as `permissions` | `google.gemini-cli.policy-engine` |
| `gemini.behavior.user.extensions` | Installed extensions | `<user tier>/extensions/<name>/`, each with `gemini-extension.json` and its bundled components; a linked development directory appears there as a symbolic link | Every extension is loaded at startup and its configuration merged | `gemini.excluded.extensions` | `google.gemini-cli.extensions-reference` |
| `gemini.behavior.user.trust-record` | Trusted-folder decisions | `<user tier>/trustedFolders.json`, relocatable by `GEMINI_CLI_TRUSTED_FOLDERS_PATH` | The record every Repository trust condition reads | `gemini.excluded.user-runtime` | `google.gemini-cli.trusted-folders` |
| `gemini.behavior.user.env` | User environment file | `<user tier>/.env`, and `~/.env` | Environment variables loaded into the process | `gemini.excluded.user-runtime` | `google.gemini-cli.configuration` |


## Inspector Global rule

Global inspection is disabled at session start. After the exact consent flow required by
the parent specification's FR-013 through FR-018 and FR-045, Gemini CLI may read only
these rules — the rows below the consented Gemini CLI member root, and the one row below
the consented shared agent home:

| Rule ID | Boundary base | Selector program and selection | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `gemini.global.instructions` | `node:path.join` of the exact consented captured `GEMINI_CLI_HOME` and `.gemini`; only when the setting is absent, the join of the session-start imported `node:os.homedir()` capture and `.gemini` | `['GEMINI.md']` | `exact` at the boundary | `static-candidate` | `gemini.behavior.user.context` | FR-013, FR-014, FR-018, QR-005 (parent); FR-010, FR-011 (this feature) | The documented global context file, by its default name alone | `google.gemini-cli.gemini-md` |
| `gemini.global.settings` | The same consented Gemini CLI boundary | `['settings.json']` | `exact` at the boundary; the user settings document's own recognition, one of three rules over one file read once | `static-candidate` | `gemini.behavior.user.settings` | As above | The user settings layer | `google.gemini-cli.configuration` |
| `gemini.global.mcp` | The same consented Gemini CLI boundary | `['settings.json']` | `exact`, over the selector `gemini.global.settings` authors; the carrier's `mcpServers` recognition | `static-candidate` | `gemini.behavior.user.settings` | As above | One MCP row per declared server name | `google.gemini-cli.mcp-server` |
| `gemini.global.hooks` | The same consented Gemini CLI boundary | `['settings.json']` | `exact`, over the same selector; the carrier's `hooks` recognition | `static-candidate` | `gemini.behavior.user.settings` | As above | The user hooks layer | `google.gemini-cli.hooks` |
| `gemini.global.command` | The same consented Gemini CLI boundary | `['commands', ANY_DIRECTORIES, /\.toml$/u]` | `descendant-inventory` below the boundary's `commands/`; rows named by the `:`-joined path | `static-candidate` | `gemini.behavior.user.commands` | As above | User commands, which a same-name project command displaces at runtime | `google.gemini-cli.custom-commands` |
| `gemini.global.skill` | The same consented Gemini CLI boundary | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` then `exact`; the skill name is exactly one direct child | `static-candidate` | `gemini.behavior.user.skills` | As above | The user skill tier's own directory | `google.gemini-cli.skills` |
| `gemini.global.agent` | The same consented Gemini CLI boundary | `['agents', /\.md$/u]` | `direct-child` of the boundary's `agents/`; the page names `~/.gemini/agents/*.md` and documents no nested search | `static-candidate` | `gemini.behavior.user.agents` | As above | Personal agents, under the experimental gate | `google.gemini-cli.subagents` |
| `gemini.global.policies` | The same consented Gemini CLI boundary | `['policies', /\.toml$/u]` | `direct-child` of the boundary's `policies/`; recognized as `permissions`, because a policy decides which tool calls are allowed, denied, or confirmed — the subject Codex's `rules/*.rules` files share | `static-candidate` | `gemini.behavior.user.policies` | As above | The user policy tier, which the vendor documents as loaded — unlike the workspace tier | `google.gemini-cli.policy-engine` |
| `gemini.global.agents-home.skill` | The consented shared agent home: `node:path.join` of the session-start imported `node:os.homedir()` capture and `.agents`, which no documented setting relocates (parent FR-045) | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` then `exact`; the skill name is exactly one direct child | `static-candidate` | `gemini.behavior.user.skills` | FR-013, FR-014, FR-018, FR-045, QR-005 (parent); FR-012 (this feature) | The documented `~/.agents/skills/` alias; Codex and Copilot document the same path, so an admitted file carries three tools' recognitions | `google.gemini-cli.skills` |

A present empty or relative `GEMINI_CLI_HOME`, or a root that is missing or not a readable
directory, does not fall back silently; the member is recorded absent or failed (parent
FR-014). The setting string is classified by the closed lexical-state algorithm before any
join, so only an `eligible` value is joined with `.gemini`. Installed extension copies, the
trusted-folder record, environment files, OAuth and account credentials, session and
history state, and temporary files remain excluded even when they are under the same
directory.

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in
[Runtime Composition](../runtime-composition.md).
For Gemini CLI, those rules cover `@file.md` imports in a context file, a custom command's
`!{...}` shell blocks and `@{...}` file injections, a skill's resource paths, a hook's
`command`, and an agent's `mcpServers` and `tools` references. They never authorize a
target read.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `gemini.excluded.repo-non-customizations` | `excluded` | `.gemini/policies/*.toml` (the workspace policy tier, documented as not loaded), `.geminiignore` (an ignore file, which is not a customization and is not read to decide what is listed), `.env` and `.gemini/.env` (credentials), and scripts under `.gemini/hooks/` (targets a hook declaration names, not declarations) | `gemini.behavior.repo.policies`, `gemini.behavior.repo.ignore`, `gemini.behavior.repo.env`, `gemini.behavior.repo.hooks` | FR-003, FR-004, FR-024, QR-001, QR-004, QR-005 (parent); FR-003 (this feature) | `gemini.policies.tiers` | `documented` | `google.gemini-cli.policy-engine`, `google.gemini-cli.gemini-ignore`, `google.gemini-cli.configuration`, `google.gemini-cli.hooks` |
| `gemini.excluded.extensions` | `excluded` | Installed extension copies under the user tier's `extensions/`, and a repository-root `gemini-extension.json` with the component directories beside it: an installed copy is reproduced from its source rather than authored, and a repository-root manifest is read by the vendor only through such a copy | `gemini.behavior.user.extensions` | FR-013, FR-014, FR-018, QR-001, QR-004, QR-005 (parent); FR-016 (this feature) | — | `documented` | `google.gemini-cli.extensions-reference` |
| `gemini.excluded.user-runtime` | `excluded` | The user surfaces above that no Global rule admits: the trusted-folder record, environment files, OAuth and account credentials, session and history state, and temporary files; and the system settings, system defaults, and admin policies under administrator-owned directories outside every Source, which no behavior row locates because no Source reaches them — the arrangement Codex's user-runtime exclusion has for its managed and system configuration | `gemini.behavior.user.trust-record`, `gemini.behavior.user.env` | FR-013, FR-014, FR-018, QR-001, QR-004, QR-005 (parent); FR-010 (this feature) | — | `documented` | `google.gemini-cli.trusted-folders`, `google.gemini-cli.configuration` |


## Normative initial-release presentation allowlist

This table is the closed FR-007 presentation allowlist for Gemini CLI. The kind spellings
are the exact `ToolRecognition.kind` values. As for the three existing vendors, the
release publishes no declared metadata beside the source it read; the table fixes eligible
relationship kinds and admitted source forms only, and it is frozen by two recorded
digests in the official-source contract once implementation begins.

| `ToolRecognition.kind` | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|
| `instructions` | `import` | An accepted `GEMINI.md`, a configured context filename, or the Global context file; an `@file.md` import is a recorded relationship whose target is never opened, and every other reference-looking token is source text |
| `skill` | `skill-resource`<br>`runtime-reference` | Exact `name` and `description` frontmatter values in an accepted `SKILL.md`; resource/script/reference targets can be relationships but are never read through those edges |
| `agent` | `agent-reference`<br>`runtime-reference` | Exact supported YAML frontmatter value/item occurrences in an accepted `.gemini/agents/*.md` or consented user `agents/*.md`; `mcpServers` and `tools` remain references and never become an agent-owned MCP recognition |
| `prompt/command` | `runtime-reference` | Exact `prompt` and `description` TOML values in an accepted `commands/**/*.toml`; `!{...}` and `@{...}` occurrences inside the prompt are references, never executed or opened; the `:`-joined invocation name is typed provenance, not declared metadata |
| `hook` | `runtime-reference` | Event map keys, matcher values, and `hooks[]` leaves under the `hooks` object of an admitted settings carrier |
| `MCP` | `runtime-reference` | Server names and exact supported leaf/item occurrences under `mcpServers` on an admitted settings carrier; no process environment value is substituted |
| `settings/config` | `runtime-reference`<br>`fallback` | Exact supported JSON value/item/key occurrences on the admitted settings carrier; MCP and hook declarations belong only to their separate recognition rows, and `context.fileName` seeds the closed context-filename derivation alone |
| `permissions` | `runtime-reference` | Exact `[[rule]]` value/item occurrences in an accepted consented user `policies/*.toml`; `commandPrefix`, `commandRegex`, and `argsPattern` are authored text, never evaluated |

No Gemini CLI recognition uses the shared `output style`, `rule`, `plugin`, or
`skill metadata` kind: the vendor documents no output style or rule file; extensions are
excluded rather than published as plugins (§ Relationship-only and excluded groups); and
a skill's companions are its census, as for every product.

## Known uncertainties and required condition facts

1. The context hierarchy page names workspace directories, their parents, and a
   just-in-time scan of accessed directories and their ancestors, but does not state the
   boundary of the parent walk in words (the `context.memoryBoundaryMarkers` setting
   defaults to `.git`) or whether a descendant `GEMINI.md` is read before a tool touches
   its directory. The derived rule admits the context filename at every depth; whether a session loaded a given file stays a runtime fact.
2. `context.fileName` is documented as the name of the context file or files to load. Whether
   it renames the global `~/.gemini/GEMINI.md` as well is not stated; the Global rule admits
   the default name alone (specs/002-gemini-cli-support/spec.md § Clarifications).
3. Project settings, MCP servers, hooks, commands, and skills load only in a trusted folder.
   Inventory existence is not proof of loading.
4. The workspace policy tier is documented as currently non-functional. The exclusion rests
   on that sentence and is re-derived when the page changes.
5. Same-name agents at the project and user levels have no documented resolution;
   `gemini.agents.selection` is `unknown` and no row states a winner (parent FR-009).
6. The settings reference does not say whether `settings.json` accepts comments; the
   vendor's loader does, which is a source measurement, not documentation. The parser
   table records it as such.
7. Subagents are gated by an `experimental` setting that is on by default. The rows carry
   the `experimental` qualifier and nothing else follows from it.
8. The custom-commands page states the naming rule generally — the path relative to the
   commands directory, subdirectories as namespaces, the separator as a colon — and gives
   one nested example. It does not state a depth limit, and it does not say what becomes of
   a segment character the colon would make ambiguous. The vendor's loader
   (`packages/cli/src/services/FileCommandLoader.ts`, measured 2026-09-10) enumerates
   `**/*.toml`, replaces every UTF-16 code unit of a segment outside `[A-Za-z0-9_.-]` with `_`
   — its regex carries no `u` flag, so a character beyond the Basic Multilingual Plane becomes
   `__` — and cuts a segment over 50 characters to its first 47 followed by `...`. The command
   unit matches all three so a row is named what the product invokes; the depth is the
   documented rule carried through, and the other two are a source measurement, not
   documentation, which is why both command behaviors are `partially-documented`.
9. The hooks reference page states the `hooks` object as keyed by event name. The vendor's
   hook registry (`HOOKS_CONFIG_FIELDS` in `packages/core/src/hooks/types.ts`, measured
   2026-09-10) skips three keys of that object before reading event names — `enabled`,
   `disabled`, and `notifications`, of which `disabled` is a list of hook names — and no
   cited section states them. The hook unit copies no such key list: a `disabled` list is a
   row by the shared structural reading, on both carriers, because what this product shows is
   the file's own declarations (FR-025, FR-026) — a reader who wrote a disabled list needs it
   stated rather than silently dropped — and a key list taken from the vendor would be a
   classification kept in step with a source no page documents. The record stays
   `documented`: the unit relies on nothing the page leaves out.
