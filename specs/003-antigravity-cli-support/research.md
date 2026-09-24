# Research: Support Antigravity CLI

[日本語](research.ja.md)

**Feature**: [spec.md](spec.md) | **Date**: 2026-09-10

Each section records one decision this feature's design rests on, why it holds, and what was
rejected. Every vendor fact below was read from `https://antigravity.google/docs/` on
2026-09-10, and the Rules and skills pages' facts again on 2026-09-24.

## 1. Where Antigravity CLI reads customizations

**Decision**: The repository locations are `GEMINI.md` and `AGENTS.md` in any directory,
`.agents/` included; `.agents/skills/<name>/SKILL.md`; `<dir>/.agents/rules/<name>.md` at every
depth; `.agents/hooks.json`; `.agents/agents/<name>.md` and `.agents/agents/<name>/agent.md`;
and `.agents/mcp_config.json` — together with `.agent/skills/<name>/SKILL.md` and
`<dir>/.agent/rules/<name>.md` under the superseded spelling. The home locations below
`~/.gemini` are `GEMINI.md`, `AGENTS.md`, `config/GEMINI.md`, `config/AGENTS.md`,
`config/rules/<name>.md`, `antigravity-cli/rules/<name>.md`, `config/mcp_config.json`,
`config/hooks.json`, `config/agents/`, `antigravity-cli/skills/<name>/SKILL.md`,
`config/skills/<name>/SKILL.md`, and `antigravity-cli/settings.json`.

**Rationale**: The vendor's documentation is three product trees — Antigravity 2.0, Antigravity
CLI, and Antigravity for IDEs — over two shared customization roots. The workspace's `.agents/`
and the home's `~/.gemini/config/` are named by all three trees for the same files, while each
product's own directory below `~/.gemini` differs: `antigravity` for the application,
`antigravity-ide` for the extensions, `antigravity-cli` for the terminal. A page in the shared
part of that documentation therefore establishes what lives at a shared root, and a page in
another product's tree establishes only that product's private directory.

Against that structure: the shared Rules page states that whenever the terminal reads or edits a
file it walks up from that file's folder to the workspace root, loading `<dir>/AGENTS.md` or
`<dir>/GEMINI.md` and `<dir>/.agents/AGENTS.md` or `<dir>/.agents/GEMINI.md` at each level, and
the same for each level's `.agents/rules/*.md`, whose immediate children alone are scanned; it
gives the global files as `~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, and the same pair below
`~/.gemini/config/`, and the global rules as `~/.gemini/config/rules/*.md` and
`~/.gemini/antigravity-cli/rules/*.md`. The migration page states the workspace context files as
the `GEMINI.md` and `AGENTS.md` of the active directory and the global one as
`~/.gemini/GEMINI.md`; its skills
table states the workspace path as `.agents/skills/` and the global path as
`~/.gemini/antigravity-cli/skills/`; its MCP section states the two `mcp_config.json`
locations; and it states that workspace skills, rules, and MCP servers keep their support. The
CLI's own pages restate the MCP pair, give the settings file as
`~/.gemini/antigravity-cli/settings.json`, and give custom agents as `.agents/agents/<name>.md`
or `.agents/agents/<name>/agent.md` with the global directory `~/.gemini/config/agents/`. The
shared Agent Skills page gives `<workspace-root>/.agents/skills/<skill-folder>/`, the shared
Rules page gives `.agents/rules` with `~/.gemini/GEMINI.md` as its global counterpart, and the
shared Hooks page gives a `hooks.json` "in your customization directory (e.g., `.agents/` in
your workspace or `~/.gemini/config/`)" while naming `~/.gemini/antigravity-cli` as the
terminal's own application data directory — which is what makes it a page about the terminal
as well.

**Alternatives considered**: Admitting `.agents/plugins/` was rejected: it is documented only
in the application's and the extensions' trees, no terminal page names it, and the terminal's
own pages describe a plugin only as a bundle `agy` stages into the home. Admitting a workspace settings file was rejected because no
page of any tree documents one.

## 2. A skill is its folder, and a flat Markdown file below `skills/` is admitted nowhere

**Decision**: This vendor's skills are admitted in the folder shape alone — a `SKILL.md` inside
its own folder — at the workspace location, under the superseded spelling, and at both global
roots. A Markdown file directly below a `skills/` directory is a near miss everywhere. The
skill kind therefore keeps the one folder-shaped compiled unit every vendor shares, and no
field tells a file-shaped skill from a folder-shaped one. An unnamed skill is named by its
folder. Both global skill roots are admitted rather than ranked.

**Rationale**: Every page that gives a terminal skill location shows the folder: the terminal's
own skills page and the shared Agent Skills page alike. The shipped terminal agrees. A static
analysis of the published `agy` 1.2.0 Linux x64 binary — traced from the terminal's own
`GetSkills` into the shared discovery, not from strings — found the skill customization kind to
be the subdirectory kind rather than the file kind, so a plain file below `skills/` is filtered
out before a name is read. A rule for the flat shape would admit a file no page documents and
the terminal does not discover.

Since no rule admits the file shape, a field telling the two shapes apart would have nothing to
distinguish: a discriminant that can take one value is a second state for the fact that every
skill is its folder, which the simplicity policy deletes rather than keeps.

The naming follows the folder. Read statically, an absent `name` is filled from the file's own
name with `.md` removed, which for a `SKILL.md` would be `SKILL` — but `GetSkillsCreatePath` in
the same binary builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`, so the terminal
treats the folder as carrying the name and a `SKILL` fallback would collide every unnamed skill
it created. The page, the two products that read the same file, and that path builder agree on
the folder. A row named `SKILL` is also a name no author wrote, and publishing it would put one
file on two rows under two names — which reads as this product's defect rather than as the
vendor's fact. The divergence is recorded on the contract instead (§ Known uncertainties item
7).

The global roots follow the binary, because that is not a question of which page is right at
all: the terminal appends its application data directory and the configuration directory both,
then removes duplicate roots, so the two pages' different global directories are both admitted.

**Alternatives considered**: Keeping a flat rule so that a reader who wrote a flat file sees it
was rejected: the row would name the terminal as the file's reader when no page says so and the
terminal does not read it, which is the false statement this product exists not to make.
Naming an unnamed skill `SKILL`, the fallback the binary itself reads, was rejected for the
collision above. Recording the observation as an `EvidenceCitation` was rejected: the evidence
records are documentation's, and the Codex contract's `plugin@marketplace` spelling is the
precedent for putting an observed behavior in the contract's prose with its version instead.

## 3. A shared skill folder is one row with three readers

**Decision**: `.agents/skills/deploy/SKILL.md` is one inventory row whose definitions carry one
entry per recognizing product: OpenAI Codex, GitHub Copilot, and Antigravity CLI.

**Rationale**: A skill row is already one name as each product resolves it, which is what puts
`.agents/skills/x/SKILL.md` and `.claude/skills/x/SKILL.md` on one row today. The existing
grouping answers this without a new mechanism, and the folder fallback is what keeps an unnamed
folder on one row for all three.

**Alternatives considered**: A per-product badge on the row was rejected: the row's product
marks already state who reads it.

## 4. The member's root is derived from the home directory, so the descriptor table loses a field

**Decision**: The `~/.gemini` member's root is `.gemini` below the captured home directory in
every case. No environment property locates it. The table that maps a tool to its environment
property therefore keys only the members an environment property locates, and the
`settingNames: 'root' | 'parent'` field is not carried, because no member needs `parent`.

**Rationale**: Every cited page writes the home literally as `~/.gemini`, and none documents a
setting that relocates it, so deriving one would rest on an inference. A member whose root comes
from the home directory alone already exists — the shared agent home — and it is not in that
table at all, so the shape this decision needs is the shape the code already has. With no
`parent` member the field has one value, and a field with one value is a field to delete rather
than a union to keep.

**Alternatives considered**: Giving this member a property of its own was rejected: no cited
page documents one, so the product would be reading an input the vendor never names. Keeping
the field with one value was rejected by the simplicity policy.

## 5. One home file carries three recognitions

**Decision**: `antigravity-cli/settings.json` is admitted by three rules: the settings and
configuration row whose subject is the file, the permissions row its `allow`, `ask`, and `deny`
lists declare, and the hook rows its hook declarations carry.

**Rationale**: This is the arrangement `.claude/settings.json` and `.codex/config.toml` already
have — one carrier, several recognitions, each admitted by its own rule over the same selector —
so nothing structural is added. The permissions page states the three lists and their
precedence; the plugins and skills page states that hooks are configured in a plugin's
`hooks.json` or in the settings file, and § 5a records where the standalone form of that
`hooks.json` is admitted.

**Alternatives considered**: Publishing the permission lists only inside the settings document
was rejected because a permissions row's subject is the policy, which the parent specification
already serves through its own detail function.

## 5a. Hooks reach three carriers, and two of them are a standalone `hooks.json`

**Decision**: Hook declarations are admitted from three carriers: the repository's
`.agents/hooks.json`, the home's `config/hooks.json`, and the home's
`antigravity-cli/settings.json` inline. The two standalone files are separate rules from the
inline one, named the way Codex's already are — `antigravity.repo.hooks` and
`antigravity.global.hooks` for the files, `antigravity.global.hooks.inline` for the carrier
that is a settings document first.

**Rationale**: The shared Hooks page's terminal section names where the terminal defines hooks —
`.agents/hooks.json` at the project root, `~/.gemini/config/hooks.json`, and inside the primary
`~/.gemini/antigravity-cli/settings.json` — and gives the file's own shape: a map from a hook
name to its event configurations, the tool events `PreToolUse` and `PostToolUse` holding matcher
groups of handlers and `PreInvocation`, `PostInvocation`, and `Stop` a list of handlers directly,
with an optional `enabled` flag per hook. That is the event-map reading the shared
hook unit already performs. The page is a page about the terminal as well as the application:
its transcript field names `~/.gemini/antigravity-cli` as the terminal's application data
directory beside `~/.gemini/antigravity` for the application.

Codex is the precedent for the naming and for the split. A file whose whole purpose is hooks is
its own rule; a configuration document that also declares hooks is a second rule over the same
selector as the settings rule. Following that family means a reader who has read one vendor's
hook rules can read this one's.

**Alternatives considered**: One rule with both standalone selectors was rejected because the
two sit at different boundaries — one Repository, one Global — and a rule's `sourceKinds` is
not a place to blur that. The two standalone rules are `documented`, because the page names
both locations as the terminal's own; the inline rule is `partially-documented`, because the page
gives no schema for the settings-file form.

## 6. MCP is a standalone strict-JSON carrier

**Decision**: `.agents/mcp_config.json` and `config/mcp_config.json` are read as strict JSON,
and their top-level `mcpServers` object is the declaration map. A remote server's `serverUrl` is
shown as written, and so is a legacy `url` or `httpUrl` a file still spells.

**Rationale**: The shape is the one Claude's `.mcp.json` already has — a standalone carrier whose
top-level `mcpServers` maps a name to a configuration — so the shared server-map reading answers
it. The MCP page states `serverUrl` as the remote key and states the legacy keys as unsupported;
whether the vendor accepts one is runtime this product does not observe, so the reading
classifies nothing and shows every declared field.

**Alternatives considered**: Reading the file as JSON with comments was rejected: no page
documents comments there, and the vendor's own examples are strict JSON.

## 7. Custom agents reuse the Markdown agent reading

**Decision**: Both admitted shapes are Markdown with YAML frontmatter, so the existing Markdown
custom-agent unit reads them; only the selectors differ.

**Rationale**: The subagents page gives the frontmatter form and names `subagent: true` among
its keys. A Markdown agent's two halves are the frontmatter block and the body, which is what
the agent presentation already carries.

**Alternatives considered**: None; the vendor documents one format.

## 7a. Rules are the rule kind, and their activation is shown rather than evaluated

**Decision**: `<dir>/.agents/rules/<name>.md` and `<dir>/.agent/rules/<name>.md` at every
depth, and the home's `config/rules/<name>.md` and `antigravity-cli/rules/<name>.md`, are
admitted under the `rule` kind, one row per Markdown file directly in a rules directory. The
activation the file declares — manual, always on, model decision, or a glob — is shown as
written. The composition is recorded as one strategy, `antigravity.rules.activation`, whose
operations are `filter`, `concatenate`, and `select-closest`.

**Rationale**: The shared Rules page states that the terminal evaluates `.agents/rules/*.md` at
the repository root and in subdirectories, walking up from each file it reads or edits, with
the legacy `.agent/rules/*.md` still loaded and only a rules directory's immediate `.md`
children scanned; it states the modular global rules below `~/.gemini/config/rules/` and
`~/.gemini/antigravity-cli/rules/`, and the four activation modes and a 24,000-byte limit
per file. The terminal's own
migration page corroborates the location by stating that workspace skills, rules, and MCP
servers keep their support, which is what makes this a terminal behavior rather than the
application's alone.

A glob decides which files a rule applies to and a description decides whether the model
applies it, both of which narrow a set (`filter`); the page states that rules are cumulative
rather than replacing each other (`concatenate`) and that the more specific directory's take
priority in a conflict (`select-closest`). It states no order among the rules of one directory,
so the strategy is `partially-documented` and that order is a known uncertainty rather than an
invented `append`.

**Alternatives considered**: Publishing a rules file as `instructions` was rejected: the kind a
row belongs to is the vendor's claim, and the vendor calls these rules and gives them an
activation model the context files do not have. Admitting a `rules/` subdirectory inside a
rules directory was rejected: the page states that only the immediate `.md` children are
scanned, and Claude's recursive rules directory is documented as recursive where this one is
not.

## 8. The mark comes from a bundled collection, and which glyph is a measurement

**Decision**: The vendor mark is `thesvg:antigravity-google`, the product's own logo as one path
inheriting `currentColor`, taken from `@iconify-json/thesvg` (MIT). The bundle does not carry
that collection, so the icon policy's three edits arrive in the change that first imports the
glyph: the devDependency, the collection's row in the third-party-notices plugin, and the
collection's upstream license text. They arrive with the import and not before, because a
notices row for a collection nothing bundles describes nothing.

A standing rule comes with it, so the second collection does not become a habit: look in
`simple-icons` first, and take another collection only for a glyph it does not carry. Which
collection a mark came from is already stated by its `~icons/<collection>/…` import line, so
nothing records it twice.

**Rationale**: The icon policy compiles marks from Iconify collections at build time, requires a
single-colour glyph that inherits `currentColor` so the vendor's own colour can be applied, and
adds a collection only through its three-edit rule. `simple-icons` does not carry this glyph at
its latest published version, so a second collection is the only way to draw the product's own
logo, and the product's own logo is what a reader scanning a legend recognizes.

Among the collections that do carry it, the choice is optical weight beside the three marks
already in the legend. The shipped marks fill the 24 grid — measured ink extents of 100%, 92%,
and 100% of the box width — and `thesvg` fills it too, while `bxl` leaves about a quarter of the
box empty and renders a step lighter at 15px, where the marks actually sit.
`material-symbols:antigravity` is drawn on a UI-symbol grid rather than a logo's own
proportions, and being Google's own rendering helps a reader with nothing at that size.
Rendering the three candidates beside the shipped marks at 15, 24, and 48px confirmed the
measurement.

**Alternatives considered**: The company's own glyph, `simple-icons/google`, was rejected once
the product glyph was found: it names the company rather than the product. The full-colour
`logos:antigravity` was rejected because it is eleven paths in six fixed colours, which the icon
policy excludes for exactly the reason it gives — a fixed-colour logo stays bright inside a
muted row. Drawing a mark by hand was rejected by the icon policy.

## 8a. The mark's colour is the palette value the accent already forced

**Decision**: `--aci-brand-antigravity: light-dark(#7a3fa8, #bfa0e8)`, and the token, the import,
and the class name change together.

**Rationale**: The constraint that set this value has not moved. The vendor's palette is
dominated by a blue three degrees from the hue links are drawn in, so a mark taken from it would
read as a link on a list that is mostly links; the purple is the answer to that, and it clears
every ground the palette paints at 6.03 in light and 7.18 in dark while staying distinguishable
from the black, the orange, and the teal beside it. Nothing on screen competes with it.

## 9. Gates, counts, and the evaluation

**Decision**: The rule, behavior, strategy, and relationship counts, the Global rule-ID list, the
presentation-allowlist digests, the outcome manifest, and the release gate's task and phase
counts are all re-recorded against what ships. The parent specification's first-use evaluation
is run again, because this tool reads the designated file and so adds a recognizing tool to it.

**Rationale**: Those freezes exist so a count nobody intended to change cannot change unnoticed,
which means the change that intends it re-records it in the same commit. The evaluation's
condition is the one the parent set, and this change meets it: the designated file is the
repository root `AGENTS.md`, and this tool reads it.

**Alternatives considered**: Narrowing the evaluation's condition so no run is owed was rejected:
it would change what the criterion measures in order to avoid measuring it.

## 10. What the parent specification's artifacts change

**Decision**: The parent's tool list, its supported-file table, its FR-018 exclusions, its
FR-045 shared-home readers, its member labels, and the vendor contract index change to name the
four tools this release supports. The member count and the capture order stay at five and are
untouched except for the environment property that goes.

**Rationale**: Those statements name products, and one product changes. The member set does not,
because the member is a directory and the directory is the same one.

## Migration impact

None to users of the published package beyond the tool this release adds. The session API's
preview DTO carries five entries, one of them this member's id and label; the bundled browser is
the only client. `allowlistVersion` and
`traversalPlanVersion` advance, which is what they exist to do. The changeset entry is a `minor`.
