# Research: Support Antigravity CLI

[日本語](research.ja.md)

**Feature**: [spec.md](spec.md) | **Date**: 2026-09-10

Each section records one decision this feature's design rests on, why it holds, and what was
rejected. Every vendor fact below was read on 2026-09-10 from `https://antigravity.google/docs/`.

## 1. Where Antigravity CLI reads customizations

**Decision**: The repository locations are the root `GEMINI.md` and `AGENTS.md`,
`.agents/skills/<name>.md` and `.agents/skills/<name>/SKILL.md`, `.agents/rules/<name>.md`,
`.agents/hooks.json`, `.agents/agents/<name>.md` and `.agents/agents/<name>/agent.md`, and
`.agents/mcp_config.json`, together with `.agent/skills/<name>/SKILL.md` and
`.agent/rules/<name>.md` under the superseded spelling. The home locations below `~/.gemini`
are `GEMINI.md`, `config/mcp_config.json`, `config/hooks.json`, `config/agents/`,
`antigravity-cli/skills/<name>/SKILL.md`, `config/skills/<name>/SKILL.md`,
`antigravity-cli/skills/<name>.md`, and `antigravity-cli/settings.json`.

**Rationale**: The vendor's documentation is three product trees — Antigravity 2.0, Antigravity
CLI, and Antigravity for IDEs — over two shared customization roots. The workspace's `.agents/`
and the home's `~/.gemini/config/` are named by all three trees for the same files, while each
product's own directory below `~/.gemini` differs: `antigravity` for the application,
`antigravity-ide` for the extensions, `antigravity-cli` for the terminal. A page in the shared
part of that documentation therefore establishes what lives at a shared root, and a page in
another product's tree establishes only that product's private directory.

Against that structure: the migration page states the workspace context files as the `GEMINI.md`
and `AGENTS.md` of the active directory and the global one as `~/.gemini/GEMINI.md`; its skills
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

**Alternatives considered**: Reading the terminal's own page alone was rejected once the shared
pages were compared against it: that reading admits `.agents/skills/deploy.md` and declines
`.agents/skills/deploy/SKILL.md`, leaving a file this repository's own `.agents/skills/` is
full of listed for two products and not for the third. Admitting `.agents/plugins/` was
rejected in the other direction: it is documented only in the application's and the extensions'
trees, no terminal page names it, and the terminal's own pages describe a plugin only as a
bundle `agy` stages into the home. Admitting a workspace settings file was rejected because no
page of any tree documents one.

## 2. A skill is a file here as well as a directory, so the file shape is its own compiled unit

**Decision**: The skill kind gains a second compiled shape whose row unit is one Markdown file.
It is a unit of its own rather than a widened version of the directory-shaped one, and the two
are a closed union the recognizer discriminates. A file-shaped skill publishes no companion
census, because it has no directory to hold companions. This vendor admits both shapes at both
its workspace and its global skill locations, which is two rules naming two units rather than
one rule naming a widened one — the arrangement the two custom-agent shapes already have.

**Rationale**: The repository's own rule is that a list's row unit belongs to the thing being
listed, and that widening one shape with optional fields until it fits another produces a type
whose invariants hold for neither. A directory-shaped skill's record is about a directory: its
entry point, the companion files beside it, the escaped directory path the detail heads with. A
file-shaped skill has none of those; it has a path and a parse. Two units, one union, is what
that policy asks for.

**Alternatives considered**: Giving the directory record an optional `companionFiles` and an
optional directory path was rejected by the policy above. Treating a file-shaped skill as an
instruction file was rejected because the vendor documents it as a skill that becomes a slash
command, and the kind a row belongs to is the vendor's claim rather than the shape's. Collapsing
the two shapes into one rule with two selectors was rejected because a rule's selectors admit
paths for one row unit, and these two units differ: one names a file, the other names a
directory whose entry point is `SKILL.md`.

## 2a. The shipped binary discovers only the folder shape, and the flat rule stays anyway

**Decision**: The flat rule stays. The documentation conflict it rests on is recorded on the
vendor contract with the build it was measured against, and the rule goes when a page or a
later build settles it. Two things follow the measurement instead of the pages: an unnamed
skill is named `SKILL`, and both documented global skill roots are admitted rather than ranked.

**Rationale**: A static analysis of the published `agy` 1.2.0 Linux x64 binary — traced from
the terminal's own `GetSkills` into the shared discovery, not from strings — found the skill
customization kind to be the subdirectory kind rather than the file kind, so a plain file below
`skills/` is filtered out before a name is read, and `GetSkillsCreatePath` builds
`{workspace}/.agents/skills/{skill_name}/SKILL.md`. The terminal's own plugins and skills page
is the only source in the vendor's documentation that says otherwise; five others and a Google
codelab written for this terminal agree with the binary.

The flat rule stays because the two errors are not symmetric. A reader who followed the
vendor's own instructions has that file; declining it shows them nothing about it, which is the
failure this product exists to prevent, while admitting it costs one row the vendor's own page
supports. The analysis covers one platform's 1.2.0 build under the default directory
configuration, so "not auto-discovered there" is not "never read".

The global roots go the other way, because that is not a question of which page is right at
all: the terminal appends its application data directory and the configuration directory both,
then removes duplicate roots, so the two pages' different global directories are both admitted.

The naming does not. Read statically, an absent `name` is filled from the file's own name with
`.md` removed, which for a `SKILL.md` would be `SKILL` — but `GetSkillsCreatePath` in the same
binary builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`, so the terminal treats the
folder as carrying the name and a `SKILL` fallback would collide every unnamed skill it created.
The page, the two products that read the same file, and that path builder agree on the folder.
A row named `SKILL` is also a name no author wrote, and publishing it would put one file on two
rows under two names — which reads as this product's defect rather than as the vendor's fact.
So the folder is the fallback for a folder, the file name for a flat file, and the divergence is
recorded on the contract instead (§ Known uncertainties item 7).

**Alternatives considered**: Dropping the flat rule was rejected for the asymmetry above.
Naming an unnamed skill by its folder, to match the page and the products beside it, was
rejected because it would publish a name this vendor does not resolve — and the `SKILL` row
every unnamed skill lands on is a real same-name clash the reader benefits from seeing, not a
display artifact. Recording the observation as an `EvidenceCitation` was rejected: the evidence
records are documentation's, and the Codex contract's `plugin@marketplace` spelling is the
precedent for putting an observed behavior in the contract's prose with its version instead.

## 3. The two shapes share one row when they share a name

**Decision**: `.agents/skills/deploy.md` and `.agents/skills/deploy/SKILL.md` are one inventory
row. The row's definitions carry one entry per file per recognizing product, and no precedence
between the shapes is stated.

**Rationale**: A skill row is already one name as each product resolves it, which is what puts
`.agents/skills/x/SKILL.md` and `.claude/skills/x/SKILL.md` on one row today. The existing
grouping answers this without a new mechanism. Precedence cannot be stated because this product
observes no runtime — and here the vendor states none either: the terminal's page documents the
file shape, the shared page documents the directory shape, and neither says which the terminal
takes when a name is spelled in both. That silence is recorded as a known uncertainty rather
than resolved by a rule.

**Alternatives considered**: A per-shape badge on the row was rejected: the paths already differ
visibly, and a badge marks a distinction no reader acts on.

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

**Rationale**: The shared Hooks page places a `hooks.json` "in your customization directory
(e.g., `.agents/` in your workspace or `~/.gemini/config/`)" and gives the file's own shape: a
map from a hook name to its event configurations, each event holding matcher groups of
handlers, with an optional `enabled` flag per hook. That is the event-map reading the shared
hook unit already performs. The page is a page about the terminal as well as the application:
its transcript field names `~/.gemini/antigravity-cli` as the terminal's application data
directory beside `~/.gemini/antigravity` for the application.

Codex is the precedent for the naming and for the split. A file whose whole purpose is hooks is
its own rule; a configuration document that also declares hooks is a second rule over the same
selector as the settings rule. Following that family means a reader who has read one vendor's
hook rules can read this one's.

**Alternatives considered**: One rule with both standalone selectors was rejected because the
two sit at different boundaries — one Repository, one Global — and a rule's `sourceKinds` is
not a place to blur that. Publishing the shared page's `hooks.json` as `documented` was
rejected: the page gives the location as an example rather than as the terminal's stated
lookup, so both standalone rules are `partially-documented`.

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

## 7a. Workspace rules are the rule kind, and their activation is shown rather than evaluated

**Decision**: `.agents/rules/<name>.md` and `.agent/rules/<name>.md` are admitted under the
`rule` kind, one row per Markdown file, directly below the rules directory. The activation the
file declares — manual, always on, model decision, or a glob — is shown as written. The
composition is recorded as one strategy, `antigravity.rules.activation`, whose one operation is
`filter`.

**Rationale**: The shared Rules page states that workspace rules live in the `.agents/rules`
folder of the workspace or git root, states `~/.gemini/GEMINI.md` as the global counterpart —
which this release already admits as the home context file rather than as a second rule — and
states the four activation modes and a 12,000-character limit per file. The terminal's own
migration page corroborates the location by stating that workspace skills, rules, and MCP
servers keep their support, which is what makes this a terminal behavior rather than the
application's alone.

`filter` is the operation the page establishes and the only one: a glob decides which files a
rule applies to and a description decides whether the model applies it, both of which narrow a
set. The page states no order between two rules and no precedence against the context files, so
the strategy is `partially-documented` and the order is a known uncertainty rather than an
invented `append`.

**Alternatives considered**: Publishing a rules file as `instructions` was rejected: the kind a
row belongs to is the vendor's claim, and the vendor calls these rules and gives them an
activation model the context files do not have. Admitting a nested `.agents/rules/` below the
repository root was rejected because the page names the workspace or git root, which is the
selected root this product reasons in, and admitting depth would rest on an inference — the
same reason § 1's context files stop at the root. Admitting a `rules/` subdirectory inside the
rules directory was rejected for the same reason: the page shows no depth, and Claude's
recursive rules directory is documented as recursive where this one is not.

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
is run again, because the designated file's recognizing tools move from two to three.

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
