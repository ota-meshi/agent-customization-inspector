# Vendor Contract: Antigravity CLI

[日本語](antigravity-cli.ja.md)

**Contract version**: 2026-09-24
**Official-source review**: 2026-09-24

This contract separates documented Antigravity CLI lookup behavior from the Inspector's read
allowlist. The common matcher grammar and source-boundary rules are defined in
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.md).
Composition and precedence are defined by ID in
[Runtime Composition](../runtime-composition.md),
and evidence records are defined in
[Official Sources](../official-sources.md).

`behaviorId` describes Antigravity CLI. `ruleId` describes Inspector policy. A vendor locator
or behavior record never grants read authority.

## Surface boundary

Antigravity CLI is the vendor's terminal client, and it is the one surface this contract
covers. Every behavior below is therefore marked **CLI**. The vendor also documents a desktop
application and editor extensions, which read customizations of their own — workflows and a
workspace plugin directory among them — and those are outside this release: no row here
describes them, and no rule admits a location only they read.

What a page is *about* is settled by its sections, not by its address. Most of the vendor's
customization pages are shared by all three products, with a section per product, over two
shared customization roots: the workspace's `.agents/` and the user tier's `config/` are named
for the same files across products, while each product's own directory below `~/.gemini` differs —
`antigravity` for the application, `antigravity-ide` for the extensions, `antigravity-cli` for
the terminal. A shared page is therefore cited for its terminal section and for what it states of
every product alike; a section about another product establishes only that product's locations
and is never the sole citation for a location this contract admits, except where the terminal is
observed to read it too and the citing record says so (§ Known uncertainties item 6).

What differs within the terminal is not a surface but a tier: a workspace tier under the selected root, and a user tier below `~/.gemini`
holding the shared configuration directory `config/`, the terminal's own directory
`antigravity-cli/`, and the global context files. The Inspector reads the workspace tier as its
Repository Source and the user tier as its Antigravity home Global member; installed plugin
copies inside the user tier are recorded and excluded.

## Canonical evidence-assessment index

Every `behaviorId` and `ruleId` owned by this contract states its own `documentationStatus` and
`lifecycleQualifiers`. Unless listed below, its canonical values are
`documentationStatus: documented` and `lifecycleQualifiers: []`. This is a closed mapping for
every unlisted subject, not an inference from an Evidence cell. Empty qualifiers make no
lifecycle claim and never mean `stable`.

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `antigravity.behavior.user.skills` | `partially-documented` | `[]` | The terminal's `antigravity-cli/skills/` folders are exact; the page gives `config/skills/` to the other two products, which the binary shows the terminal walks too (§ Known uncertainties item 6) |
| `antigravity.global.skill` | `partially-documented` | `[]` | The terminal's root and the folder shape are exact; `config/skills/` is documented for the other two products and observed in the terminal's walk (§ Known uncertainties item 6) |
| `antigravity.behavior.repo.mcp` | `partially-documented` | `[]` | Both configuration paths and the server schema are exact; how a workspace server and a global server of one name compose is not stated (§ Known uncertainties item 3) |
| `antigravity.behavior.user.mcp` | `partially-documented` | `[]` | As the workspace row, for the same reason |
| `antigravity.behavior.user.hooks` | `partially-documented` | `[]` | The shared Hooks page names every place the terminal defines hooks and gives the standalone file's schema, and states no schema for the settings-file form (§ Known uncertainties item 4) |

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.behavior.repo.context` | CLI | The folder of each file the terminal reads or edits | `GEMINI.md`, `AGENTS.md`, `.agents/GEMINI.md`, `.agents/AGENTS.md` | Walked up to the workspace root, loading each level's pair; the files of every level are combined, and the more specific directory's take priority in a conflict | `antigravity.context.layering` | Documented | `google.antigravity.rules`, `google.antigravity.cli-migration` |
| `antigravity.behavior.repo.skills` | CLI | Project root | `.agents/skills/<name>/SKILL.md`, `.agent/skills/<name>/SKILL.md` | A folder holding a `SKILL.md` whose frontmatter requires a `description`, turned into a slash command; the shared Agent Skills page gives it as the terminal's workspace skill and records `.agent/skills` as the still-supported earlier spelling of the directory | `antigravity.skills.selection` | Documented | `google.antigravity.cli-migration`, `google.antigravity.skills` |
| `antigravity.behavior.repo.rules` | CLI | The folder of each file the terminal reads or edits | `.agents/rules/<name>.md`, `.agent/rules/<name>.md` | Walked up to the workspace root; a Markdown file directly in each level's rules folder, whose frontmatter declares a trigger — `always_on`, `model_decision`, `glob`, or `manual` — and which is truncated beyond 24,000 bytes | `antigravity.rules.activation` | Documented | `google.antigravity.rules`, `google.antigravity.cli-migration` |
| `antigravity.behavior.repo.hooks` | CLI | Project root | `.agents/hooks.json` | A map from a hook name to its event configurations — `PreToolUse` and `PostToolUse` holding matcher groups of command handlers, `PreInvocation`, `PostInvocation`, and `Stop` a list of handlers directly — with an optional per-hook `enabled` flag | `antigravity.hooks.merge` | Documented | `google.antigravity.hooks` |
| `antigravity.behavior.repo.agents` | CLI | Project root | `.agents/agents/<name>.md`, `.agents/agents/<name>/agent.md` | Markdown with YAML frontmatter, discovered automatically; the frontmatter table marks `name` required, and `subagent: true` makes it invocable by the primary agent | `antigravity.agents.selection` | Documented | `google.antigravity.cli-subagents`, `google.antigravity.subagents` |
| `antigravity.behavior.repo.mcp` | CLI | Project root | `.agents/mcp_config.json` | A standalone JSON profile whose `mcpServers` object maps a name to a configuration; remote servers use `serverUrl` | `antigravity.mcp.configuration` | Partially documented | `google.antigravity.cli-mcp`, `google.antigravity.cli-migration` |

## Inspector Repository rules

All bases in this table are the exact Inspector Repository boundary — the selected Repository
root, spelled `Repository`. Two families reach every depth, because the terminal walks up from
each file it reads or edits and loads what each level holds: the context pair, in a directory
and in that directory's `.agents/`, and the rules folder. Every other `.agents/` location is the
selected root's own directory: the vendor documents it at the project root and no nested one, so
`packages/api/.agents/skills/` is a near miss.

Two locations carry a second selector for the superseded `.agent` spelling, because the page
that states each location states backward support for it. The support is stated about the
directory, so the deprecated spelling admits exactly the shape that page shows there: a
`SKILL.md` inside a skill folder, and a Markdown file directly in a rules folder. No page
documents a flat skill at either spelling, so `.agents/skills/<name>.md` and
`.agent/skills/<name>.md` are near misses (§ Known uncertainties item 6).

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.repo.context` | Repository | `[ANY_DIRECTORIES, 'GEMINI.md']`, `[ANY_DIRECTORIES, 'AGENTS.md']` | `descendant-inventory`: root and all descendants, and `ANY_DIRECTORIES` includes zero segments; the range is the directory holding the file, or the directory holding its `.agents/` | `static-candidate` | `antigravity.behavior.repo.context` | Documented | `google.antigravity.rules` |
| `antigravity.repo.skill` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']`, `['.agent', 'skills', ANY_NAME, 'SKILL.md']` | `exact`, one name segment; the row's unit is the directory | `static-candidate` | `antigravity.behavior.repo.skills` | Documented | `google.antigravity.skills` |
| `antigravity.repo.rule` | Repository | `[ANY_DIRECTORIES, '.agents', 'rules', /\.md$/u]`, `[ANY_DIRECTORIES, '.agent', 'rules', /\.md$/u]` | `descendant-inventory` to each rules folder, then `direct-child` | `static-candidate` | `antigravity.behavior.repo.rules` | Documented | `google.antigravity.rules` |
| `antigravity.repo.hooks` | Repository | `['.agents', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.hooks` | Documented | `google.antigravity.hooks` |
| `antigravity.repo.agent.file` | Repository | `['.agents', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.agent.directory` | Repository | `['.agents', 'agents', ANY_NAME, 'agent.md']` | `exact`, one name segment | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.mcp` | Repository | `['.agents', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.mcp` | Partially documented | `google.antigravity.cli-mcp` |

## Derived Repository rules

This vendor ships none, and that is this release's scope rather than the vendor's silence. A
derived rule exists where a documented setting decides which paths are read, and one such
setting is documented: `.agents/rules.json`, whose `entries` register rule files beyond a rules
directory's immediate children — nested subdirectories, and directories outside `.agents/` —
and whose `inherits` names further `rules.json` files. Admitting what it registers would be a
configuration-read derivation like Codex's fallback basenames, and this release ships none for
this vendor: `.agents/rules.json` is not admitted, and a file it registers is listed only where
a static rule above reaches it anyway. Every other path above is literal on every page that
states it.

## Documented User behavior

| Behavior ID | Subject | Location | Strategy | Inspector treatment | Evidence |
|---|---|---|---|---|---|
| `antigravity.behavior.user.home` | The user tier | `~/.gemini` | — | The Antigravity home Global member | `google.antigravity.cli-migration`, `google.antigravity.cli-settings` |
| `antigravity.behavior.user.context` | Global developer context | `<user tier>/GEMINI.md`, `<user tier>/AGENTS.md`, `<user tier>/config/GEMINI.md`, `<user tier>/config/AGENTS.md` | `antigravity.context.layering` | Accepted by `antigravity.global.context` | `google.antigravity.rules`, `google.antigravity.cli-migration` |
| `antigravity.behavior.user.rules` | Modular global rules | `<user tier>/config/rules/<name>.md`, `<user tier>/antigravity-cli/rules/<name>.md` | `antigravity.rules.activation` | Accepted by `antigravity.global.rule` | `google.antigravity.rules` |
| `antigravity.behavior.user.mcp` | Global MCP servers | `<user tier>/config/mcp_config.json` | `antigravity.mcp.configuration` | Accepted by `antigravity.global.mcp` | `google.antigravity.cli-mcp` |
| `antigravity.behavior.user.agents` | Global custom agents, in both documented shapes | `<user tier>/config/agents/<name>.md`, `<user tier>/config/agents/<name>/agent.md` | `antigravity.agents.selection` | Accepted by `antigravity.global.agent.file` and `antigravity.global.agent.directory` | `google.antigravity.cli-subagents`, `google.antigravity.subagents` |
| `antigravity.behavior.user.skills` | Global shared skills | `<user tier>/antigravity-cli/skills/`, `<user tier>/config/skills/` | `antigravity.skills.selection` | Accepted by `antigravity.global.skill` | `google.antigravity.cli-migration`, `google.antigravity.skills` |
| `antigravity.behavior.user.settings` | User preferences | `<user tier>/antigravity-cli/settings.json` | — | Accepted by `antigravity.global.settings` | `google.antigravity.cli-settings`, `google.antigravity.cli-features` |
| `antigravity.behavior.user.permissions` | Allow, ask, and deny lists | `<user tier>/antigravity-cli/settings.json` | `antigravity.permissions.precedence` | Accepted by `antigravity.global.permissions` | `google.antigravity.cli-permissions` |
| `antigravity.behavior.user.hooks` | Hook declarations | `<user tier>/config/hooks.json`, `<user tier>/antigravity-cli/settings.json`, and a plugin's `hooks.json` | `antigravity.hooks.merge` | The standalone file is accepted by `antigravity.global.hooks` and the settings form by `antigravity.global.hooks.inline`; the plugin form is excluded with its plugin | `google.antigravity.hooks` |
| `antigravity.behavior.user.plugins` | Installed plugin copies | `<user tier>/antigravity-cli/plugins/<name>/`, with `import_manifest.json` beside them | — | Excluded by `antigravity.excluded.plugins` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |

## Inspector Global rule

The base is the consented Antigravity home boundary: `.gemini` below the captured home
directory. No environment property relocates it, so the member's root is that join in every
case and its origin is always the default home.

Below that boundary, `config/` is the vendor's shared configuration directory and
`antigravity-cli/` is the terminal's own, and the skill and rule rules each reach a directory
below both. The shared Agent Skills page gives the terminal's global skills at `antigravity-cli/skills/`
and gives `config/skills/` to the application and the extensions; the terminal walks both
(§ Known uncertainties item 6). The extensions' legacy `antigravity/skills/` stays out, because it
belongs to a product this release does not support (§ Surface boundary).

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Serves | Evidence |
|---|---|---|---|---|---|---|---|---|
| `antigravity.global.context` | The consented Antigravity home | `['GEMINI.md']`, `['AGENTS.md']`, `['config', 'GEMINI.md']`, `['config', 'AGENTS.md']` | `exact`; the range is the whole boundary | `static-candidate` | `antigravity.behavior.user.context` | Documented | The global context files | `google.antigravity.rules` |
| `antigravity.global.rule` | The same boundary | `['config', 'rules', /\.md$/u]`, `['antigravity-cli', 'rules', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.rules` | Documented | The modular global rules | `google.antigravity.rules` |
| `antigravity.global.mcp` | The same boundary | `['config', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.mcp` | Partially documented | The global MCP servers | `google.antigravity.cli-mcp` |
| `antigravity.global.agent.file` | The same boundary | `['config', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.agents` | Documented | The file-shaped global custom agents | `google.antigravity.cli-subagents`, `google.antigravity.subagents` |
| `antigravity.global.agent.directory` | The same boundary | `['config', 'agents', ANY_NAME, 'agent.md']` | `exact`, one name segment | `static-candidate` | `antigravity.behavior.user.agents` | Documented | The folder-shaped global custom agents | `google.antigravity.subagents` |
| `antigravity.global.skill` | The same boundary | `['antigravity-cli', 'skills', ANY_NAME, 'SKILL.md']`, `['config', 'skills', ANY_NAME, 'SKILL.md']` | `exact`; the row's unit is the skill folder the program names | `static-candidate` | `antigravity.behavior.user.skills` | Partially documented | The global shared skills at both roots the terminal walks | `google.antigravity.skills` |
| `antigravity.global.settings` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.settings` | Documented | The settings document | `google.antigravity.cli-settings` |
| `antigravity.global.permissions` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact`, over the same selector; the carrier's permission lists are its `permissions` recognition | `static-candidate` | `antigravity.behavior.user.permissions` | Documented | The user permission policy | `google.antigravity.cli-permissions` |
| `antigravity.global.hooks` | The same boundary | `['config', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.hooks` | Documented | The user tier's standalone hook carrier | `google.antigravity.hooks` |
| `antigravity.global.hooks.inline` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact`, over the settings rule's selector; the carrier's hook declarations are its `hook` recognition | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | The hooks the settings document declares | `google.antigravity.hooks` |

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in [Runtime Composition](../runtime-composition.md).
For Antigravity CLI those rules cover a context file's imports, a skill's referenced scripts and
resources, a hook's command, and an agent's `mcpServers` and tool references. They never
authorize a target read.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.excluded.plugins` | `excluded` | Installed plugin copies below the user tier's `antigravity-cli/plugins/`, the `import_manifest.json` that tracks them, and the skills, agents, rules, MCP definitions, and hooks inside them: an installed copy is reproduced from its source rather than authored, which is what the parent specification's FR-018 already excludes for every vendor | `antigravity.behavior.user.plugins`, `antigravity.behavior.user.hooks` | FR-013, FR-014, FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |
| `antigravity.excluded.workspace-plugins` | `excluded` | The workspace plugin directory — `.agents/plugins/` and the `_agents/plugins/` spelling beside it — as a plugin, with the skills, rules, MCP definitions, and hooks inside it. A `GEMINI.md` or `AGENTS.md` inside it is not excluded, and neither is a `.agents/rules/` or `.agent/rules/` directory: they are the context files and the rules directory of the directory holding them, which `antigravity.repo.context` and `antigravity.repo.rule` admit as at any other depth because the terminal loads them while walking up through that directory. The reason is not the installed-copy reason above, which does not reach a plugin authored in a repository: no page names a workspace plugin directory for the terminal. The Plugins page gives `.agents/plugins/` in its application and extension sections, while its terminal section and the terminal's own pages describe a plugin only as a bundle `agy` stages into the user tier, so nothing cited here establishes that the terminal loads one from a workspace (§ Surface boundary) | `antigravity.behavior.user.plugins` | FR-003, FR-013, FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |
| `antigravity.excluded.user-runtime` | `excluded` | The user-tier state no Global rule admits: credentials and the keyring material the first-launch onboarding stores, session and conversation history, caches, and logs; and the private directories of the vendor's desktop application and editor extensions, `antigravity/` and `antigravity-ide/`, which this release does not recognize | `antigravity.behavior.user.home` | FR-013, FR-018, QR-003 | — | `documented` | `google.antigravity.cli-migration`, `google.antigravity.cli-settings` |

## Normative initial-release presentation allowlist

| Kind | Presentation source | Admitted occurrences |
|---|---|---|
| `instructions` | — | Nothing: an accepted `GEMINI.md` or `AGENTS.md`, in a workspace directory, its `.agents/`, or the home, is read whole — the Rules page says neither uses frontmatter and the terminal treats its entire content as plain Markdown — so a leading `---` block is source text like every other line and no value is read out of it |
| `skill` | `frontmatter`<br>`body` | A skill folder's `SKILL.md` frontmatter block and its instructions, with its companion census published as every other directory-shaped skill's is. A row whose skill declares no `name` is named by its folder, the same fallback every product reading that file uses (§ Known uncertainties item 7) |
| `rule` | — | Nothing: an accepted rule file — a workspace `.agents/rules/*.md` or `.agent/rules/*.md`, or the home's `config/rules/*.md` or `antigravity-cli/rules/*.md` — is published as the one document its author wrote, frontmatter block included, so no value is read out of it and a declared `trigger` or `globs` is source text like every other line, never evaluated |
| `agent` | `metadata`<br>`instructions` | A custom agent's frontmatter block and the body below it |
| `MCP` | `runtime-reference` | Declared server names and every field each declares under the carrier's `mcpServers` object, including `serverUrl` and any legacy `url` or `httpUrl` |
| `hook` | `runtime-reference` | Event map keys, matcher values, and handler leaves, under a standalone `hooks.json` and under the settings carrier's hook declarations alike. This vendor's carriers name each hook and nest the events inside it, so a declaration also publishes the name its carrier wrote and, where the carrier wrote one, that hook's own `enabled` key — both as the file's own keys, neither interpreted: whether a hook runs is runtime this product does not observe, so no row says "disabled" or "inactive" and the reader is shown that the file says `enabled: false` |
| `permissions` | `runtime-reference` | The `allow`, `ask`, and `deny` entries the settings carrier declares, each as written |
| `settings/config` | `runtime-reference`<br>`fallback` | Exact supported JSON value, item, and key occurrences on the admitted settings carrier; MCP declarations belong to their own carrier and permission and hook declarations belong only to their separate recognition rows |

## Known uncertainties and required condition facts

1. The Rules page states that at each level it walks up through, the terminal loads
   `<dir>/AGENTS.md` or `<dir>/GEMINI.md` and `<dir>/.agents/AGENTS.md` or
   `<dir>/.agents/GEMINI.md`. It does not say whether that "or" means that a directory holding
   both names — or both a pair and its `.agents/` pair — has one of them loaded and the other
   ignored, and if so which. The Inspector admits every such file and states no precedence among
   the files of one directory; the ordering it does state is the page's own, between levels.
2. The skills pages state both paths and say a global skill is available in every workspace,
   without saying what happens when a workspace skill and a global skill declare one name. The
   Inspector states no resolution it cannot cite.
3. The MCP pages state both configuration paths without stating how a workspace server and a
   global server of one name compose. The Inspector lists each declaration under the carrier
   that declares it and states no precedence.
4. The Hooks page states that the terminal also defines hooks inside its settings file, without
   giving the settings-file schema. The Inspector publishes whatever
   that file declares under its hook object, in the file's own order, and classifies nothing.
5. No cited page documents an environment property that relocates the user tier: every page
   writes it literally as `~/.gemini`. The member's root is therefore the home-directory join in
   every case, and no capture reads a property for it.
6. Every page that gives the terminal's skill locations gives a skill folder holding a
   `SKILL.md`: the shared Agent Skills page's terminal section gives
   `<workspace-root>/.agents/skills/<skill-folder>/` and
   `~/.gemini/antigravity-cli/skills/<skill-folder>/`, and the Plugins page shows the same folder
   inside a plugin. No page documents a flat Markdown file below a `skills/` directory, so no
   rule admits one, under either spelling or at either global root. The same page gives
   `~/.gemini/config/skills/<skill-folder>/` as the global location of the application and the
   extensions rather than of the terminal.

   The implementation agrees with the pages. A static analysis of the published `agy` 1.2.0
   Linux x64 binary — the one the official installer's `linux_amd64` manifest names, whose
   extracted executable is SHA-256
   `195bf11b249deebe67028305a9b7b1d19ac38e9ab281b786a163a7d2fc8ff428` — traced the terminal's
   own `GetSkills` through its customization manager into the shared discovery, and found the
   skill customization kind to be the subdirectory kind rather than the file kind: a plain file
   directly below `skills/` is filtered out before any name is read, and `GetSkillsCreatePath`
   builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`. The same analysis found the global
   walk to append both the terminal's application data directory and the configuration
   directory, then remove duplicate roots — which is why `config/skills/` is admitted beside the
   terminal's own root although the page gives it to the other two products (observed against
   that binary, not established by any cited page; the same standing the Codex contract's
   `plugin@marketplace` spelling has).

   The backward support for `.agent/` is stated about the directory rather than about a shape,
   so the deprecated spelling admits only what its own page shows there:
   `.agent/skills/<name>/SKILL.md` and `<dir>/.agent/rules/<name>.md`.
7. The shared Agent Skills page states that a skill's `name` is optional and defaults to the
   folder name. The binary's fill does not: read statically, an absent or empty `name` is
   filled from the file's own name with the trailing `.md` removed, which for a skill folder's
   `SKILL.md` would yield `SKILL`. The Inspector names such a row by its folder.

   The observation is not followed, and the reason is inside the same binary.
   `GetSkillsCreatePath` builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`, so the
   terminal itself treats the folder as carrying the skill's name; a `SKILL` fallback would
   collide every unnamed skill the terminal created with every other. The page, the two products
   that read the same file, and that path builder agree on the folder, and one statically read
   fallback disagrees — which is a reading of one function in one build rather than a documented
   rule, and not enough to publish a name no author wrote and no other reader of the file uses.
   Publishing it would also put one file on two rows under two names, which reads as a defect of
   this product rather than as a fact about the vendor.

   The divergence is recorded rather than resolved: if a later build or a page settles that the
   terminal really does resolve `SKILL`, the fallback moves and this item says so.
8. The shared Hooks page gives a `hooks.json` schema exactly, and its terminal section names
   where the terminal defines hooks: `.agents/hooks.json` at the project root,
   `~/.gemini/config/hooks.json` or the primary `~/.gemini/antigravity-cli/settings.json`, and an
   installed plugin's `hooks.json`. Both standalone carriers are therefore admitted and
   documented. No page states how the two standalone files and the settings file's inline
   declarations compose, so the Inspector lists each under the carrier that declares it and
   states no precedence.
9. A hook declaration of this vendor carries a name, which the other three vendors' do not, and
   the inventory needs it. A hook row's unit is one declared event and its lines are one per
   `(carrier, tool)`, which holds for a format whose carrier declares an event at most once.
   This vendor's carrier is a map of *named* hooks each holding its own events, so one carrier
   can declare `PostToolUse` twice — under `my-linter-hook` and under `safety-gate` — and the
   two lines would sit at one path with nothing to tell them apart. A declaration is therefore
   identified within its row by `(carrier, declared name)`, with the name absent for a format
   that does not name its hooks. That is a fact about hook declarations rather than about this
   vendor: a declaration may be named, and three of the four formats never name one.

   The row unit does not change, and neither does the detail's shape: this vendor's events reach
   the page as the file's own keys in the file's own order, so the hook name and the `enabled`
   key are already inside the JSON a reader sees, and an event section holding two declarations
   draws one block per declaration under the same heading. Nothing about the other three
   vendors' rows or details moves.
10. The shared Rules page gives the terminal's rule locations — `.agents/rules/*.md` at the
   repository root or in subdirectories, walked up from the folder of a file the agent reads or
   edits, and `~/.gemini/config/rules/*.md` and `~/.gemini/antigravity-cli/rules/*.md` for the
   user tier — the four triggers, a 24,000-byte per-file limit, that rules are cumulative, and
   that the more specific directory's take priority in a conflict; the terminal's migration page
   states that workspace rules keep their support. It states no order among the rules of one
   directory, which is why `antigravity.rules.activation` is `partially-documented`. The page
   states that only a rules directory's immediate `.md` children are scanned unless
   `.agents/rules.json` registers others; each rule admits a rules folder's direct children, and
   what a `rules.json` registers is outside this release (§ Derived Repository rules).
