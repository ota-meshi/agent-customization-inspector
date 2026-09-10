# Vendor Contract: Antigravity CLI

[日本語](antigravity-cli.ja.md)

**Contract version**: 2026-09-10
**Official-source review**: 2026-09-10

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

What a page is *about* is not settled by which product tree it sits in. The vendor's
documentation is three product trees over two shared customization roots: the workspace's
`.agents/` and the user tier's `config/` are named by all three trees for the same files, while
each product's own directory below `~/.gemini` differs — `antigravity` for the application,
`antigravity-ide` for the extensions, `antigravity-cli` for the terminal. A page in the shared
part of that documentation therefore establishes what lives at a shared root and is cited here
for it; a page in another product's tree establishes only that product's private directory and
is never cited for a location this contract admits. Where a shared page and the terminal's own
page describe one location differently — the two workspace skill shapes — both are admitted,
because both are documented for that directory and neither page states a precedence
(§ Known uncertainties item 6).

What differs within the terminal is not a surface but a tier: a workspace tier under the selected root, and a user tier below `~/.gemini`
holding the shared configuration directory `config/`, the terminal's own directory
`antigravity-cli/`, and the global context file. The Inspector reads the workspace tier as its
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
| `antigravity.behavior.repo.context` | `partially-documented` | `[]` | The migration page names the workspace context files as the ones in the active directory and the global one by its exact path; it states no depth and no precedence between the two names (§ Known uncertainties item 1) |
| `antigravity.behavior.user.context` | `partially-documented` | `[]` | As the workspace row: the path is exact, the layering with the workspace files is not stated |
| `antigravity.behavior.repo.skills` | `conflict` | `[]` | The pages make incompatible statements about the shape of a skill in one directory — a flat `.md` on the terminal's own page, a folder holding a `SKILL.md` on five others — and the published binary discovers only the folder (§ Known uncertainties item 6). What happens when a workspace and a global skill declare one name is separately not stated (item 2) |
| `antigravity.behavior.user.skills` | `conflict` | `[]` | The same shape conflict, plus two pages giving different global directories for one scope — which the binary shows is not a disagreement, because the terminal walks both (§ Known uncertainties item 6) |
| `antigravity.repo.skill.file` | `conflict` | `[]` | As `antigravity.behavior.repo.skills`: this rule admits the shape one page gives and five contradict |
| `antigravity.repo.skill.directory` | `partially-documented` | `[]` | The shape and the `.agent/` backward support are exact; the resolution against a same-named flat file is not stated (§ Known uncertainties item 6) |
| `antigravity.global.skill.file` | `conflict` | `[]` | As `antigravity.behavior.user.skills`: this rule admits the flat shape one page gives and five contradict |
| `antigravity.global.skill.directory` | `partially-documented` | `[]` | The two global roots and the folder shape are exact; the resolution against a same-named flat file is not stated (§ Known uncertainties item 6) |
| `antigravity.behavior.repo.mcp` | `partially-documented` | `[]` | Both configuration paths and the server schema are exact; how a workspace server and a global server of one name compose is not stated (§ Known uncertainties item 3) |
| `antigravity.behavior.user.mcp` | `partially-documented` | `[]` | As the workspace row, for the same reason |
| `antigravity.behavior.user.hooks` | `partially-documented` | `[]` | The plugins and skills page states that hooks are configured in a plugin's `hooks.json` or in the settings file and states no schema for the settings-file form; the shared Hooks page gives the standalone file's schema and gives its location as an example rather than as the terminal's stated lookup (§ Known uncertainties items 4 and 8) |
| `antigravity.behavior.repo.hooks` | `partially-documented` | `[]` | As the user row: the schema is exact, the workspace location is given as an example of a customization directory (§ Known uncertainties item 8) |
| `antigravity.behavior.repo.rules` | `partially-documented` | `[]` | The shared Rules page gives the directory, the four activation modes, and the per-file character limit, and the terminal's migration page states that workspace rules keep their support; no page states the order two rules compose in, or their precedence against the context files (§ Known uncertainties item 10) |

## Documented Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.behavior.repo.context` | CLI | Project root | `GEMINI.md`, `AGENTS.md` | Parsed and enforced from the active directory; the global context file is consulted alongside them | `antigravity.context.layering` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.behavior.repo.skills` | CLI | Project root | `.agents/skills/<name>/SKILL.md`, `.agent/skills/<name>/SKILL.md`, `.agents/skills/<name>.md` | Markdown with `name` and `description` frontmatter, compiled into a slash command when the CLI runs in that directory; the shared Agent Skills page gives the folder holding a `SKILL.md` and records `.agent/skills` as the still-supported earlier spelling of the directory, while the terminal's own page gives a flat file instead (§ Known uncertainties item 6) | `antigravity.skills.selection` | Conflict | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-migration`, `google.antigravity.skills` |
| `antigravity.behavior.repo.rules` | CLI | Project root | `.agents/rules/<name>.md`, `.agent/rules/<name>.md` | A Markdown file below the workspace's or git root's rules folder, activated manually, always, by model decision, or by a glob it declares, and limited to 12,000 characters | `antigravity.rules.activation` | Partially documented | `google.antigravity.rules`, `google.antigravity.cli-migration` |
| `antigravity.behavior.repo.hooks` | CLI | Project root | `.agents/hooks.json` | A map from a hook name to its event configurations, each event holding matcher groups of command handlers, with an optional per-hook `enabled` flag | `antigravity.hooks.merge` | Partially documented | `google.antigravity.hooks` |
| `antigravity.behavior.repo.agents` | CLI | Project root | `.agents/agents/<name>.md`, `.agents/agents/<name>/agent.md` | Markdown with YAML frontmatter, discovered automatically; `subagent: true` makes it invocable by the primary agent | `antigravity.agents.selection` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.behavior.repo.mcp` | CLI | Project root | `.agents/mcp_config.json` | A standalone JSON profile whose `mcpServers` object maps a name to a configuration; remote servers use `serverUrl` | `antigravity.mcp.configuration` | Partially documented | `google.antigravity.cli-mcp`, `google.antigravity.cli-migration` |

## Inspector Repository rules

All bases in this table are the exact Inspector Repository boundary — the selected Repository
root, spelled `Repository`. Every `.agents/` location is the selected root's own directory: the
vendor documents the workspace's `.agents` directory at the project root and no nested one, so
`packages/api/.agents/` is a near miss at every depth.

Two locations carry a second selector for the superseded `.agent` spelling, because the page
that states each location states backward support for it. The support is stated about the
directory, so the deprecated spelling admits exactly the shape that page shows there: a
`SKILL.md` inside a skill folder, and a Markdown file below the rules folder. The flat skill
shape belongs to the terminal's own page, which names `.agents` alone, so
`.agent/skills/<name>.md` is a near miss (§ Known uncertainties item 6).

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.repo.context.gemini-root` | Repository | `['GEMINI.md']` | `exact` | `static-candidate` | `antigravity.behavior.repo.context` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.repo.context.agents-root` | Repository | `['AGENTS.md']` | `exact` | `static-candidate` | `antigravity.behavior.repo.context` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.repo.skill.file` | Repository | `['.agents', 'skills', /\.md$/u]` | `direct-child` below the root's `.agents/skills/`; the row's unit is the file | `static-candidate` | `antigravity.behavior.repo.skills` | Conflict | `google.antigravity.cli-plugins-skills`, `google.antigravity.skills` |
| `antigravity.repo.skill.directory` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']`, `['.agent', 'skills', ANY_NAME, 'SKILL.md']` | `exact`, one name segment; the row's unit is the directory | `static-candidate` | `antigravity.behavior.repo.skills` | Partially documented | `google.antigravity.skills` |
| `antigravity.repo.rule` | Repository | `['.agents', 'rules', /\.md$/u]`, `['.agent', 'rules', /\.md$/u]` | `direct-child` below the root's rules directory | `static-candidate` | `antigravity.behavior.repo.rules` | Partially documented | `google.antigravity.rules` |
| `antigravity.repo.hooks` | Repository | `['.agents', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.hooks` | Partially documented | `google.antigravity.hooks` |
| `antigravity.repo.agent.file` | Repository | `['.agents', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.agent.directory` | Repository | `['.agents', 'agents', ANY_NAME, 'agent.md']` | `exact`, one name segment | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.mcp` | Repository | `['.agents', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.mcp` | Partially documented | `google.antigravity.cli-mcp` |

## Derived Repository rules

This vendor ships none. A derived rule exists where a documented setting decides which paths are
admitted, and no cited page documents a terminal setting that renames or relocates a workspace
customization: the settings file is the user tier's, and the customization paths above are
literal on every page that states them.

## Documented User behavior

| Behavior ID | Subject | Location | Strategy | Inspector treatment | Evidence |
|---|---|---|---|---|---|
| `antigravity.behavior.user.home` | The user tier | `~/.gemini` | — | The Antigravity home Global member | `google.antigravity.cli-migration`, `google.antigravity.cli-settings` |
| `antigravity.behavior.user.context` | Global developer context | `<user tier>/GEMINI.md` | `antigravity.context.layering` | Accepted by `antigravity.global.context` | `google.antigravity.cli-migration` |
| `antigravity.behavior.user.mcp` | Global MCP servers | `<user tier>/config/mcp_config.json` | `antigravity.mcp.configuration` | Accepted by `antigravity.global.mcp` | `google.antigravity.cli-mcp` |
| `antigravity.behavior.user.agents` | Global custom agents, in both documented shapes | `<user tier>/config/agents/<name>.md`, `<user tier>/config/agents/<name>/agent.md` | `antigravity.agents.selection` | Accepted by `antigravity.global.agent.file` and `antigravity.global.agent.directory` | `google.antigravity.cli-subagents`, `google.antigravity.subagents` |
| `antigravity.behavior.user.skills` | Global shared skills | `<user tier>/antigravity-cli/skills/`, `<user tier>/config/skills/` | `antigravity.skills.selection` | Accepted by `antigravity.global.skill.directory` and `antigravity.global.skill.file` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-migration`, `google.antigravity.skills` |
| `antigravity.behavior.user.settings` | User preferences | `<user tier>/antigravity-cli/settings.json` | — | Accepted by `antigravity.global.settings` | `google.antigravity.cli-settings`, `google.antigravity.cli-features` |
| `antigravity.behavior.user.permissions` | Allow, ask, and deny lists | `<user tier>/antigravity-cli/settings.json` | `antigravity.permissions.precedence` | Accepted by `antigravity.global.permissions` | `google.antigravity.cli-permissions` |
| `antigravity.behavior.user.hooks` | Hook declarations | `<user tier>/config/hooks.json`, `<user tier>/antigravity-cli/settings.json`, and a plugin's `hooks.json` | `antigravity.hooks.merge` | The standalone file is accepted by `antigravity.global.hooks` and the settings form by `antigravity.global.hooks.inline`; the plugin form is excluded with its plugin | `google.antigravity.cli-plugins-skills`, `google.antigravity.hooks` |
| `antigravity.behavior.user.plugins` | Installed plugin copies | `<user tier>/antigravity-cli/plugins/<name>/`, with `import_manifest.json` beside them | — | Excluded by `antigravity.excluded.plugins` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |

## Inspector Global rule

The base is the consented Antigravity home boundary: `.gemini` below the captured home
directory. No environment property relocates it, so the member's root is that join in every
case and its origin is always the default home.

Below that boundary, `config/` is the vendor's shared configuration directory and
`antigravity-cli/` is the terminal's own, and the skill rule reaches a `skills/` directory below
each. The two pages that name a global skill directory name different ones, and that is not a
disagreement to rank: the terminal walks both (§ Known uncertainties item 6). The editor
extensions' own `antigravity/skills/` stays out, because it belongs to a product this release
does not support (§ Surface boundary).

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Serves | Evidence |
|---|---|---|---|---|---|---|---|---|
| `antigravity.global.context` | The consented Antigravity home | `['GEMINI.md']` | `exact` | `static-candidate` | `antigravity.behavior.user.context` | Partially documented | The global context file | `google.antigravity.cli-migration` |
| `antigravity.global.mcp` | The same boundary | `['config', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.mcp` | Partially documented | The global MCP servers | `google.antigravity.cli-mcp` |
| `antigravity.global.agent.file` | The same boundary | `['config', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.agents` | Documented | The file-shaped global custom agents | `google.antigravity.cli-subagents`, `google.antigravity.subagents` |
| `antigravity.global.agent.directory` | The same boundary | `['config', 'agents', ANY_NAME, 'agent.md']` | `exact`, one name segment | `static-candidate` | `antigravity.behavior.user.agents` | Documented | The folder-shaped global custom agents | `google.antigravity.subagents` |
| `antigravity.global.skill.directory` | The same boundary | `['antigravity-cli', 'skills', ANY_NAME, 'SKILL.md']`, `['config', 'skills', ANY_NAME, 'SKILL.md']` | `exact`; the row's unit is the skill folder the program names | `static-candidate` | `antigravity.behavior.user.skills` | Partially documented | The folder-shaped global shared skills at both documented roots | `google.antigravity.skills`, `google.antigravity.cli-plugins-skills` |
| `antigravity.global.skill.file` | The same boundary | `['antigravity-cli', 'skills', /\.md$/u]` | `direct-child`; the row's unit is the file itself, which occupies no directory and publishes no companion census | `static-candidate` | `antigravity.behavior.user.skills` | Conflict | The flat global shared skills at the terminal's own root | `google.antigravity.cli-plugins-skills`, `google.antigravity.skills` |
| `antigravity.global.settings` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.settings` | Documented | The settings document | `google.antigravity.cli-settings` |
| `antigravity.global.permissions` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact`, over the same selector; the carrier's permission lists are its `permissions` recognition | `static-candidate` | `antigravity.behavior.user.permissions` | Documented | The user permission policy | `google.antigravity.cli-permissions` |
| `antigravity.global.hooks` | The same boundary | `['config', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | The user tier's standalone hook carrier | `google.antigravity.hooks` |
| `antigravity.global.hooks.inline` | The same boundary | `['antigravity-cli', 'settings.json']` | `exact`, over the settings rule's selector; the carrier's hook declarations are its `hook` recognition | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | The hooks the settings document declares | `google.antigravity.cli-plugins-skills` |

## Relationship-only and excluded groups

Relationship-only `ruleId` definitions live in [Runtime Composition](../runtime-composition.md).
For Antigravity CLI those rules cover a context file's imports, a skill's referenced scripts and
resources, a hook's command, and an agent's `mcpServers` and tool references. They never
authorize a target read.

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.excluded.plugins` | `excluded` | Installed plugin copies below the user tier's `antigravity-cli/plugins/`, the `import_manifest.json` that tracks them, and the skills, agents, rules, MCP definitions, and hooks inside them: an installed copy is reproduced from its source rather than authored, which is what the parent specification's FR-018 already excludes for every vendor | `antigravity.behavior.user.plugins`, `antigravity.behavior.user.hooks` | FR-013, FR-014, FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |
| `antigravity.excluded.workspace-plugins` | `excluded` | The workspace plugin directory and everything below it — `.agents/plugins/` and the `_agents/plugins/` spelling beside it — with the skills, rules, MCP definitions, and hooks inside them. The reason is not the installed-copy reason above, which does not reach a plugin authored in a repository: no terminal page names a workspace plugin directory at all. The vendor documents it in the application's and the extensions' trees, while the terminal's own pages describe a plugin only as a bundle `agy` stages into the user tier, so nothing cited here establishes that the terminal loads one from a workspace (§ Surface boundary) | `antigravity.behavior.user.plugins` | FR-003, FR-013, FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`, `google.antigravity.cli-features` |
| `antigravity.excluded.user-runtime` | `excluded` | The user-tier state no Global rule admits: credentials and the keyring material the first-launch onboarding stores, session and conversation history, caches, and logs; and the private directories of the vendor's desktop application and editor extensions, `antigravity/` and `antigravity-ide/`, which this release does not recognize | `antigravity.behavior.user.home` | FR-013, FR-018, QR-003 | — | `documented` | `google.antigravity.cli-migration`, `google.antigravity.cli-settings` |

## Normative initial-release presentation allowlist

| Kind | Presentation source | Admitted occurrences |
|---|---|---|
| `instructions` | `frontmatter`<br>`body` | The context file's frontmatter block, where it has one, and its body |
| `skill` | `frontmatter`<br>`body` | A skill's frontmatter block and its instructions, in the flat file and in a skill folder's `SKILL.md` alike; a flat file's row unit is the file, so no companion census is published for it, while a folder's is published as every other directory-shaped skill's is. A row whose skill declares no `name` is named by its folder, the same fallback every product reading that file uses, and a flat file, which has no folder, by its own name without the extension (§ Known uncertainties item 7) |
| `rule` | `frontmatter`<br>`body` | A workspace rule's frontmatter block, including the activation it declares, and the constraints below it, each shown as written and none evaluated |
| `agent` | `metadata`<br>`instructions` | A custom agent's frontmatter block and the body below it |
| `MCP` | `runtime-reference` | Declared server names and every field each declares under the carrier's `mcpServers` object, including `serverUrl` and any legacy `url` or `httpUrl` |
| `hook` | `runtime-reference` | Event map keys, matcher values, and handler leaves, under a standalone `hooks.json` and under the settings carrier's hook declarations alike. This vendor's carriers name each hook and nest the events inside it, so a declaration also publishes the name its carrier wrote and, where the carrier wrote one, that hook's own `enabled` key — both as the file's own keys, neither interpreted: whether a hook runs is runtime this product does not observe, so no row says "disabled" or "inactive" and the reader is shown that the file says `enabled: false` |
| `permissions` | `runtime-reference` | The `allow`, `ask`, and `deny` entries the settings carrier declares, each as written |
| `settings/config` | `runtime-reference`<br>`fallback` | Exact supported JSON value, item, and key occurrences on the admitted settings carrier; MCP declarations belong to their own carrier and permission and hook declarations belong only to their separate recognition rows |

## Known uncertainties and required condition facts

1. The migration page states the workspace context files as the `GEMINI.md` and `AGENTS.md` of
   the active directory and the global one as `~/.gemini/GEMINI.md`. It states no depth below
   the workspace root and no precedence between the two workspace names or between them and the
   global file. The Inspector admits the repository root's pair alone, because reaching deeper
   would rest on an inference; the rule widens when the vendor documents a hierarchy.
2. The skills pages state both paths and say a global skill is available in every workspace,
   without saying what happens when a workspace skill and a global skill declare one name. The
   Inspector states no resolution it cannot cite.
3. The MCP pages state both configuration paths without stating how a workspace server and a
   global server of one name compose. The Inspector lists each declaration under the carrier
   that declares it and states no precedence.
4. The plugins and skills page states that hooks are configured in a plugin's `hooks.json` or in
   the settings file, without giving the settings-file schema. The Inspector publishes whatever
   that file declares under its hook object, in the file's own order, and classifies nothing.
5. No cited page documents an environment property that relocates the user tier: every page
   writes it literally as `~/.gemini`. The member's root is therefore the home-directory join in
   every case, and no capture reads a property for it.
6. The vendor's own pages disagree about the shape of a workspace skill, and the disagreement
   is one-against-many. The terminal's plugins and skills page shows a flat Markdown file below
   `.agents/skills/`. The shared Agent Skills page shows that same directory holding a skill
   folder with a `SKILL.md`; so do the editor extensions' skills page, both plugin pages, and a
   Google codelab written for this terminal. The two skill subjects are therefore `conflict`
   rather than `partially-documented`: these are incompatible official assertions about one
   directory, which is what that status retains.

   The implementation agrees with the majority. A static analysis of the published `agy` 1.2.0
   Linux x64 binary — the one the official installer's `linux_amd64` manifest names, whose
   extracted executable is SHA-256
   `195bf11b249deebe67028305a9b7b1d19ac38e9ab281b786a163a7d2fc8ff428` — traced the terminal's
   own `GetSkills` through its customization manager into the shared discovery, and found the
   skill customization kind to be the subdirectory kind rather than the file kind: a plain file
   directly below `skills/` is filtered out before any name is read, and `GetSkillsCreatePath`
   builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`. The same analysis found the global
   walk to append both the terminal's application data directory and the configuration
   directory, then remove duplicate roots — which is why the two pages' different global
   directories are admitted together above rather than ranked (observed against that binary, not
   established by any cited page; the same standing the Codex contract's `plugin@marketplace`
   spelling has).

   The flat shape is admitted anyway. The two errors are not symmetric: a reader who followed
   the vendor's own instructions has that file, and declining it would show them nothing at all
   about it, while admitting it lists the file with a recognition the vendor's own page
   supports. The analysis covers the default directory configuration of one platform's 1.2.0
   build, so "not auto-discovered there" is not "never read". The flat rules go when a page or a
   later build settles it.

   Because no page states which shape the terminal prefers when one name is spelled in both, no
   precedence is published, and such a name is one row carrying both definitions. The backward
   support for `.agent/` is stated about the directory rather than about a shape, so the
   deprecated spelling admits only what its own page shows there:
   `.agent/skills/<name>/SKILL.md` and `.agent/rules/<name>.md`. `.agent/skills/<name>.md` is
   not admitted, and it becomes admitted only if a page documents the flat shape at that
   spelling.
7. The shared Agent Skills page states that a skill's `name` is optional and defaults to the
   folder name. The binary's fill does not: read statically, an absent or empty `name` is
   filled from the file's own name with the trailing `.md` removed, which for a skill folder's
   `SKILL.md` would yield `SKILL`. The Inspector names such a row by its folder, with the flat
   shape named by its file for want of a folder.

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
8. The shared Hooks page gives a `hooks.json` schema exactly and gives its location as an
   example — "in your customization directory (e.g., `.agents/` in your workspace or
   `~/.gemini/config/`)" — rather than as a lookup the terminal states. It is a page about the
   terminal as well as the application, because its transcript field names
   `~/.gemini/antigravity-cli` as the terminal's application data directory beside
   `~/.gemini/antigravity` for the application. Both standalone carriers are therefore admitted
   and both are recorded partially documented. No page states how the two standalone files and
   the settings file's inline declarations compose, so the Inspector lists each under the
   carrier that declares it and states no precedence.
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
10. The shared Rules page gives the rules directory, the four activation modes, and the 12,000
   character limit, and the terminal's migration page states that workspace rules keep their
   support. Neither states the order two rules compose in, nor their precedence against the
   context files, so `antigravity.rules.activation` records `filter` alone. The page names the
   workspace or git root, which is the selected root this product reasons in, and shows no depth
   inside the rules directory, so the rule admits its direct children alone.
