# Feature Specification: Support Antigravity CLI

[日本語](spec.ja.md)

**Feature Branch**: `003-antigravity-cli-support`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Support Antigravity CLI as the fourth tool: recognize the repository customizations it reads under `.agents/` together with the root context files, and its personal home below `~/.gemini`, so the inventory names Antigravity CLI as a reader of the files it reads."

This specification extends [Inspect Agent Customizations](../001-inspect-agent-customizations/spec.md).
Everything that specification requires of a supported tool — the allowlist discipline, the
non-execution guarantees, the consent model, the closed kind set, the evidence and
documentation obligations — applies to Antigravity CLI unchanged. What is written here is what
Antigravity CLI adds: which files it reads, where its personal home is, and which of the parent
specification's fixed statements about "three tools" and "four members" become statements
about four and five.

## Clarifications

### Session 2026-09-10

- Q: Antigravity CLI reads `~/.gemini/GEMINI.md`, `~/.gemini/config/`, and `~/.gemini/antigravity-cli/`. How does the personal-setup member reach it? → A: As the fifth member, which is a directory rather than a product: `~/.gemini` is what that member proposes, and the paths admitted below it are this vendor's.
- Q: The vendor documents a terminal, editor extensions, and a desktop application, and the editor and desktop surfaces read locations the terminal does not. Which of them does this release recognize? → A: The terminal alone. The transition this feature follows is one terminal replacing another, and the reader it serves is deciding about the terminal they run; folding in the editor and desktop surfaces would admit locations such as a workspace plugin directory that no terminal page documents, which widens what the inventory lists past what that reader runs. A location the shared `.agents/` pages document and a terminal page corroborates is not such a widening: the terminal reads that directory, and which of its entries the terminal reads is settled by the pages rather than by which product tree a page sits in. The other surfaces stay available to a later feature, which would add them as surfaces of this same tool rather than as another tool.
- Q: `.agents/skills/` can hold `deploy.md` beside `deploy/SKILL.md`. Is that one inventory row or two? → A: One row, holding the folder alone. A skill row's unit is one name as each product resolves it, which is what puts a `.agents/skills/x/SKILL.md` and a `.claude/skills/x/SKILL.md` on one row; the flat `deploy.md` is no product's skill (FR-004), so it is on no row and no precedence between the two is stated. (Amended 2026-09-24: the flat file left the allowlist, so the row carries one shape.)
- Q: Which skill shapes does this release admit for this tool? → A: The folder holding a `SKILL.md`, in the workspace and in the home. Every page that gives a terminal skill location shows that shape — the terminal's skills page and the vendor's Agent Skills page alike — and the shipped terminal filters a flat Markdown file directly below `skills/` out before reading a name, so a flat file is admitted nowhere. `.agents/skills/` is one directory three of the vendor's products read, so one `.agents/skills/deploy/SKILL.md` carries three recognitions. (Amended 2026-09-24: the flat shape left the allowlist, because the terminal's own page no longer documents it and the terminal does not discover it.)
- Q: `.agents/` also holds a rules directory and a hooks file. Are they admitted for this tool? → A: Yes, both. The vendor's Rules page places workspace rules in `.agents/rules/`, the Hooks page places a `hooks.json` in the workspace's `.agents/` and in the home's `config/`, and the terminal's own migration page states that workspace skills, rules, and MCP servers are preserved — which is a terminal page naming the rules directory as one the terminal reads. Both are published under the kinds that already exist, shown as written: an activation mode is not evaluated against a file and a hook command is never run.
- Q: The skills and rules pages both record a superseded `.agent/` spelling beside the current `.agents/`. Is it admitted? → A: Yes, at the locations and in the shapes those pages document there — `.agent/skills/<name>/SKILL.md` and `.agent/rules/<name>.md`, the rules directory at every depth the current spelling is admitted at — and nowhere else. Backward support is stated on the page that states the location, so the deprecated spelling reaches exactly what that page shows at it. (Amended 2026-09-24: the rules directory is admitted at every depth under both spellings, and no flat skill is admitted under either.)
- Q: A static analysis of the published `agy` 1.2.0 binary shows the terminal discovering only the folder shape, and shows an unnamed skill resolving to `SKILL` rather than to its folder name. Does the release follow the binary or the pages? → A: The pages, and on discovery the two now agree: they document the folder shape alone and the binary discovers it alone. The naming does not follow the binary. A row's name is the one the recognizing product resolves, and the same binary's `GetSkillsCreatePath` builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`, so the terminal itself treats the folder as carrying the name: an unnamed folder is named by its folder, which is the answer the two other products reading that file give. The global allowlist does follow the binary, admitting both global skill roots rather than ranking them, because the terminal walks both. (Amended 2026-09-11: the naming half of this answer was corrected to the fallback FR-004 and the shipped units state, after the two readings inside the binary were weighed against each other. Amended 2026-09-24: the discovery half follows the pages, which no longer document a flat skill.)
- Q: The vendor documents a workspace plugin directory at `.agents/plugins/`. Is it admitted? → A: No. No terminal page names it: the terminal's own pages document a plugin only as a bundle `agy` installs into the home, which is why installed copies are excluded. That exclusion's reason — an installed copy is reproduced from its source — does not cover a plugin authored in a repository, so the vendor contract states the workspace directory's own reason separately: this release has no terminal evidence that the terminal loads it.
- Q: Does an Antigravity CLI recognition reach `GEMINI.md` and `AGENTS.md` below the repository root? → A: Yes, at every depth, each governing the directory holding it. The Rules page states that whenever the terminal reads or edits a file it walks up from that file's folder to the workspace root, loading `<dir>/AGENTS.md` or `<dir>/GEMINI.md` and `<dir>/.agents/AGENTS.md` or `<dir>/.agents/GEMINI.md` at each level, so a file at any level is one the terminal can load, and the `.agents/` spelling belongs to the directory holding that `.agents/`. (Amended 2026-09-24: the Rules page now documents the hierarchy, which the answer had waited for.)
- Q: The fifth member's directory stays `~/.gemini` while the product it was named for is no longer supported. What does its label say? → A: `Antigravity home`. The member table names a member by whose directory it is rather than by the directory's own name, and a label that differs from the path is already what that table does: `~/.config/github-copilot` is labelled `Copilot home`. The short form follows the same family — `Antigravity CLI` shortens to `Antigravity` as `OpenAI Codex` shortens to `Codex` — and the member's root path is shown beside the label, so the label says whose directory it is and the path says where.
- Q: A skill that is one file has no directory, and the detail's file panel is the panel holding the skill's directory and the open file. What does that page show? → A: Nothing new: no rule admits a skill that is one file (FR-004), so every skill detail is the folder one, with its file panel and its tabs. (Amended 2026-09-24: the flat shape left the allowlist, and with it the panel-only detail.)
- Q: The parent specification repeats its first-use evaluation only when the designated file's ground truth moves. That file is the repository root `AGENTS.md`, and this tool reads it, so its recognizing tools go from two to three. Is a run owed? → A: Yes. The condition the parent set is met, so the study inputs are updated and the twenty agent-driven sessions are run before release, with the result recorded. A reader of the designated file now has a harder answer to give, and a criterion measured against a page that no longer matches would be measuring nothing. (Amended 2026-09-24: Claude Code reads the file too, so its recognizing tools are four, and the run was owed again and is recorded in the parent's `validation.md`.)
- Q: Does the release publish the prompt and command kind for this tool? → A: No. Antigravity CLI's migration guide converts legacy commands into skills, and no page documents a repository command directory, so this tool contributes no row of that kind. The kind stays in the closed set for the three tools that do publish it.

### Session 2026-09-24

- Q: The vendor's Rules page now documents context files and rules below the repository root, a global `AGENTS.md` beside the global `GEMINI.md`, the same pair below the home's `config/`, and modular global rules. Does the allowlist follow? → A: Yes, to exactly what the page states. In the repository: `GEMINI.md` and `AGENTS.md` in any directory and in any directory's `.agents/`, and a rules directory's immediate `.md` children at every depth. In the home: `AGENTS.md`, `config/GEMINI.md`, and `config/AGENTS.md` beside `GEMINI.md`, and a rule at `config/rules/<name>.md` or `antigravity-cli/rules/<name>.md`. The recognition was waiting for the vendor to document the hierarchy, and it now has.
- Q: The terminal's skills page no longer shows a flat `.md` skill, and the shipped terminal filters one out. Does the flat rule stay? → A: No. Both flat rules — `.agents/skills/<name>.md` and `antigravity-cli/skills/<name>.md` — are removed, and with them the mechanism that told a file-shaped skill from a folder-shaped one: once no rule admits the file shape, every skill is its folder, and a discriminant that can take only one value is a second state for the same fact.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See Antigravity CLI as a Reader of Repository Files (Priority: P1)

A developer opens a repository that carries an `.agents/` directory: skill folders, a rules
directory, a hooks file, an MCP configuration, custom agents, and `GEMINI.md` and `AGENTS.md`
files at the root and in subdirectories. Today the
inventory lists those files under the products that already read them and says nothing about
the terminal the developer actually runs. After this feature the same rows name Antigravity CLI
as one of their readers, and the files only Antigravity CLI reads appear at all.

**Why this priority**: The repository source is what a reader opens the product for, and it
needs no consent. A reader who learns nothing about their own terminal from the repository page
has no reason to reach the personal setup.

**Independent Test**: Inspect a fixture repository holding one file at every admitted
repository location and confirm each is listed with Antigravity CLI among its readers, that the
root `GEMINI.md` is listed once carrying both its Copilot and its Antigravity CLI recognition,
and that no excluded neighbour is listed or read.

**Acceptance Scenarios**:

1. **Given** a repository with `.agents/skills/format-tests/SKILL.md`, **When** the reader opens the
   skills inventory, **Then** a row for that skill names Antigravity CLI as its reader and the
   detail shows the file's declarations and its instructions.
2. **Given** a repository with `.agents/mcp_config.json` declaring a local and a remote server,
   **When** the reader opens the MCP inventory, **Then** one row per declared server name is
   listed, each naming Antigravity CLI, and no server is started or connected to.
3. **Given** a repository whose root holds `GEMINI.md`, **When** the reader opens that file's
   row, **Then** the row states both products that read it and the file is listed once.
4. **Given** a repository with `.agents/agents/reviewer.md` and
   `.agents/agents/release/agent.md`, **When** the reader opens the agents inventory, **Then**
   both are listed as Antigravity CLI custom agents.
5. **Given** a repository with `.agents/rules/style.md` declaring a glob activation, **When**
   the reader opens the rules inventory, **Then** the file is listed as an Antigravity CLI rule
   and its activation is shown as written, with no pattern matched against any file.
6. **Given** a repository with `.agents/hooks.json`, **When** the reader opens the hooks
   inventory, **Then** its declarations are listed as written and no command is run.
7. **Given** a repository with `packages/api/AGENTS.md`, **When** the reader opens the
   instructions inventory, **Then** the file is listed with Antigravity CLI among its readers,
   governing `packages/api/`.

### User Story 2 - Inspect the Antigravity CLI Home After Consent (Priority: P2)

The same developer wants to know what their own machine contributes. The personal setup already
proposes five directories, and the fifth is the `~/.gemini` directory Antigravity CLI reads.
After one explicit consent, the files Antigravity CLI reads there are listed, and the state it
keeps beside them is not.

**Why this priority**: The personal setup answers the second question a reader asks, and it
costs a consent, so it follows the repository story.

**Independent Test**: Build a home holding one file at every admitted location and one at every
excluded neighbour, consent once, and confirm the admitted files are listed and no excluded
path is enumerated, opened, or read.

**Acceptance Scenarios**:

1. **Given** a consented home holding `GEMINI.md`, `config/mcp_config.json`,
   `config/agents/reviewer.md`, `antigravity-cli/skills/refactor/SKILL.md`,
   `config/skills/triage/SKILL.md`, `config/rules/style.md`, and
   `antigravity-cli/settings.json`, **When** the scan completes, **Then** each is listed under
   the personal setup with Antigravity CLI as its reader, both global skill roots included.
2. **Given** that home also holds an installed plugin copy and the manifest that tracks it,
   **When** the scan completes, **Then** neither is listed and neither is read.
3. **Given** the home's settings file declares permission lists and hooks, **When** the reader
   opens the permissions and hooks inventories, **Then** the declarations are shown as written
   and nothing is evaluated, resolved, or run.

### User Story 3 - See Which Products Read a Shared Skill Folder (Priority: P3)

`.agents/skills/` is one directory three products read: OpenAI Codex, GitHub Copilot, and
Antigravity CLI all take a skill folder's `SKILL.md` there. A reader looking at that directory
needs to see that one folder is one skill with three readers, and that a Markdown file sitting
directly in the directory is none of theirs.

**Why this priority**: It is a comprehension problem inside a story the first two already
deliver, so it is valuable but not what makes the feature worth shipping.

**Independent Test**: Inspect a repository whose `.agents/skills/` holds a skill folder and a
flat Markdown file, and confirm the folder's row states all three products and the flat file is
on no row.

**Acceptance Scenarios**:

1. **Given** `.agents/skills/release/SKILL.md`, **When** the reader opens the skills inventory,
   **Then** the row names all three products that read that folder.
2. **Given** `.agents/skills/deploy.md`, **When** the reader opens the skills inventory,
   **Then** it is not listed, and it is never read.

### Edge Cases

- A skill file whose frontmatter cannot be parsed keeps the row its path names and carries one
  file-confined diagnostic; the complete source stays readable.
- An MCP configuration file the format cannot parse fails that reading whole, keeps the carrier
  listed, and carries one diagnostic.
- A remote MCP server declared with the legacy `url` or `httpUrl` key is shown exactly as
  written; the product states no opinion about whether the vendor accepts it.
- `.agents/skills/` holding a directory with no `SKILL.md` produces no skill row, and a
  Markdown file inside such a directory under any other name produces none either.
- `.agents/rules/` holding a file that is not Markdown produces no rule row; a rules file whose
  frontmatter cannot be parsed keeps its row and carries one file-confined diagnostic.
- A repository holding `.agent/skills/deploy/SKILL.md` or `.agent/rules/style.md` lists both
  under the superseded spelling the vendor still supports; one holding `.agents/skills/deploy.md`
  or `.agent/skills/deploy.md` lists neither, because no page documents a flat skill.
- A rules directory's subdirectory lists nothing below it: the terminal scans a rules
  directory's immediate `.md` children, and the nested files a `.agents/rules.json` registers are
  outside this release (FR-016).
- A home with no `antigravity-cli` directory at all is admitted and lists whatever of the other
  admitted paths it holds.
- A repository holding `.gemini/commands/`, `.gemini/agents/`, or `.gemini/skills/` lists none
  of them: no supported tool reads them in this release.
- A repository holding `.agents/plugins/` or `_agents/plugins/` lists no plugin, skill, rule,
  MCP definition, or hook the plugin carries: no terminal page documents the terminal loading a
  workspace plugin directory. A `GEMINI.md` or `AGENTS.md` there is listed as the context file of
  the directory holding it, and a `.agents/rules/` there as that directory's rules directory, as
  at any other depth (FR-007, FR-016).
- A custom-agent directory holding files beside its `agent.md` lists the `agent.md` alone: no
  cited page documents a companion beside a custom agent, so nothing else in that directory is
  admitted.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Antigravity CLI MUST be a supported tool, the fourth beside GitHub Copilot, Claude
  Code, and OpenAI Codex, named `Antigravity CLI` on every surface. Every surface that names the
  supported tools — the tool filter, the legend, the consent surface, and the user documentation
  — MUST name those four and no other product. Two surfaces name none, and stay that way: the
  inventory's empty state, which states that nothing was recognized and leaves which products
  the release covers to the documentation, because copy that spelled out the shipped catalog
  would be a second copy of the registry; and the `--inspect-personal-setup` description, which
  names the kinds it reads and the shared `~/.agents` directory rather than the tools. A surface
  that names no tool cannot name four, so neither is on the list above. The parent
  specification's statements written for three tools and four Global members
  MUST read four tools and five members in both languages. The supported tool is the vendor's
  terminal client alone: its editor extensions and its desktop application are separate surfaces
  this release does not recognize, and no location only they read enters the allowlist
  (§ Clarifications).
- **FR-002**: The Repository inspection path allowlist for Antigravity CLI MUST admit exactly:
  the context files `GEMINI.md` and `AGENTS.md` in any directory, `.agents/` included; a skill
  at `.agents/skills/<name>/SKILL.md`; a rule at `<dir>/.agents/rules/<name>.md` for the root
  and every directory below it; the hooks carrier
  `.agents/hooks.json`; a custom agent at `.agents/agents/<name>.md` or
  `.agents/agents/<name>/agent.md`; and the MCP carrier `.agents/mcp_config.json`. The
  superseded `.agent/` spelling MUST be admitted for the two locations whose pages state
  backward support for it, in the shape each of those pages documents there —
  `.agent/skills/<name>/SKILL.md` and `<dir>/.agent/rules/<name>.md` — and nowhere else. No other
  repository location is admitted for this tool.
- **FR-003**: The Repository inspection MUST NOT admit, for this tool, any customization a
  `.gemini/` directory holds, any workspace settings file, or any workspace plugin directory
  including `.agents/plugins/` and `_agents/plugins/` or the customizations such a directory
  carries: no cited terminal page documents the terminal reading one, and a rule for a location
  no page establishes would be this product's own invention. What these exclusions do not reach
  is what the terminal loads for each directory it walks up through: a `GEMINI.md` or
  `AGENTS.md` inside `.gemini/` or a plugin directory is the context file of the directory holding
  it (FR-007), and a `.agents/rules/` or `.agent/rules/` there is that directory's rules
  directory (FR-016), both loaded as the terminal walks up through that directory like any other,
  and the selector grammar has no step that would exclude one directory name from that walk. The vendor contract MUST
  state that reason for the workspace plugin directory separately from the installed-copy reason
  FR-010 gives, because a plugin authored in a repository is not a copy of anything
  (§ Clarifications).
- **FR-004**: An Antigravity CLI skill MUST be published in the folder shape, named by the
  `name` its frontmatter declares and, when it declares none, by its skill folder. That fallback
  is the one every other product resolving the same file uses, so one `SKILL.md` stays one row
  with three readers rather than splitting into two rows under two names. A Markdown file
  directly below a skills directory MUST NOT be admitted, in the repository or in the home: no
  cited page documents that shape, and the shipped terminal filters it out before reading a
  name (§ Clarifications).
- **FR-005**: The MCP carriers MUST publish one row per declared server name, with every
  declared field shown as written, including a remote server's `serverUrl` and any legacy `url`
  or `httpUrl` a file still spells. No server is started, connected to, or probed, and no
  environment reference in a declaration is resolved.
- **FR-006**: A custom agent MUST be published under the custom-agent kind in both admitted
  shapes, named by the `name` its frontmatter declares. A file declaring none MUST reach the
  inventory's no-name row rather than be named after its file or its directory: this vendor
  documents `name` as the agent's identity, as the two other declared-name products do, and a
  path fallback would report an agent name the product does not have.
- **FR-007**: Every `GEMINI.md` and `AGENTS.md` in the repository MUST carry an Antigravity CLI
  recognition beside the recognitions it already carries. Each file is listed once under each
  range its readers give it, as the parent specification's instruction rows are keyed: where
  every reader gives it the same range it is one row with several readers, and a
  `.agents/AGENTS.md` is two, `**` for this tool and `.agents/**` for Copilot and Claude Code.
  Each governs the directory holding it, and one inside a directory's
  `.agents/` governs that directory: at each level it walks up through from a file it reads or
  edits, the terminal looks for the pair in both places. Whether a directory holding both names
  has both loaded the page does not say, so every one is admitted and no precedence is stated
  (§ Clarifications; contracts/vendors/antigravity-cli.md § Known uncertainties item 1).
- **FR-008**: The fifth Global member MUST stay the `~/.gemini` directory, in its current
  position after the three other tool homes and before the shared agent home, admitted and
  consented exactly as it is today. No environment property relocates it: no cited page
  documents one for Antigravity CLI, so the member's root is `.gemini` below the captured home
  directory and nothing else. The member MUST be labelled `Antigravity home`, naming whose
  directory it is, with its root path shown beside it (§ Clarifications).
- **FR-009**: The Global inspection path allowlist for that member MUST admit exactly:
  `GEMINI.md`, `AGENTS.md`, `config/GEMINI.md`, and `config/AGENTS.md`; a rule at
  `config/rules/<name>.md` or `antigravity-cli/rules/<name>.md`; `config/mcp_config.json`;
  `config/hooks.json`; a custom agent at `config/agents/<name>.md` or
  `config/agents/<name>/agent.md`; a skill at `antigravity-cli/skills/<name>/SKILL.md` or
  `config/skills/<name>/SKILL.md`; and `antigravity-cli/settings.json`. The four context files
  govern every project alike, because the page states that they apply across all projects and
  are always active. Both documented global skill roots are admitted rather than
  ranked, because the terminal walks both. Both custom-agent shapes are admitted at the user
  tier for the reason both are admitted in the workspace: the subagents page gives the two
  spellings for that directory as it gives them for the workspace one, so admitting the file
  alone would leave a reader's folder-shaped global agent off every list while its workspace
  twin was listed. The editor extensions' own global skill directory
  MUST NOT be admitted: it belongs to a surface this release does not recognize.
- **FR-010**: The Global inspection MUST NOT admit anything else below that member, and MUST
  name the exclusions in the vendor contract with the reason for each: installed plugin copies
  below `antigravity-cli/plugins/` and the manifest that tracks them, because an installed copy
  is reproduced from its source rather than authored; and credentials, session and history
  state, caches, and logs, which the parent specification's FR-018 already excludes for every
  vendor.
- **FR-011**: The home settings file MUST be published as a settings and configuration row whose
  subject is the file, and its permission lists and hook declarations MUST be published as
  permissions and hook rows of the kinds that already exist, each shown exactly as written. No
  permission rule is evaluated against a path or a command, and no hook is run.
- **FR-012**: This release MUST publish no prompt-and-command row and no output-style row for
  Antigravity CLI, and MUST publish no plugin row for it: nothing the cited pages document
  places an authored file of those kinds where this tool reads one (§ Clarifications).
- **FR-013**: GitHub Copilot's recognition of the root `GEMINI.md` MUST stay exactly as it is:
  it rests on Copilot's own documentation, which this feature does not touch.
- **FR-014**: No vendor module, vendor contract, registry record, fixture, documentation
  section, label, mark, or evidence record for a product this release does not support may
  remain in the tree, and no gate may count one. A reference addressing an artifact the tree
  does not hold is one of those records, so no artifact may be left citing one.
- **FR-015**: Every recorded Antigravity CLI behavior MUST cite the official documentation that
  establishes it, and a claim a cited page does not make MUST be recorded as partially
  documented rather than stated as documented. A behavior established by a page in the vendor's
  shared documentation rather than in the terminal's own tree MUST cite that page and MUST NOT
  be recorded as documented on the terminal's authority alone. Where cited pages make
  incompatible statements about one location, the subject MUST be recorded as a conflict rather
  than ranked. An observation of the vendor's shipped implementation MUST NOT become an evidence
  citation — the evidence records are documentation's — and MUST be recorded in the vendor
  contract's prose with the exact build it was made against and a statement that no cited page
  establishes it.
- **FR-016**: A rule MUST be published under the rule kind, one row per Markdown file directly
  in a rules directory FR-002 or FR-009 admits, with the activation its frontmatter declares — manual, always on,
  model decision, or a glob — shown exactly as written. No activation is evaluated: no glob is
  matched against a path and no description is judged for relevance. A file `.agents/rules.json`
  registers beyond a rules directory's immediate children is outside this release: the terminal
  reads it, and listing it would need a configuration-read derivation this release does not ship
  for this tool.
- **FR-017**: The two standalone hook carriers — the repository's `.agents/hooks.json` and the
  home's `config/hooks.json` — MUST be published under the hook kind through the same reading as
  the home settings file's inline declarations, each shown exactly as written. No hook is run,
  and no matcher is evaluated against a tool call.

### Key Entities

- **Antigravity CLI supported tool**: the fourth member of the closed supported-tool set, with
  its own label, mark, vendor module, and vendor contract.
- **Antigravity CLI surface**: the one surface every Antigravity CLI behavior names. The vendor
  documents one terminal client that reads these files; its editor and desktop surfaces are
  outside this release.
- **`~/.gemini` Global member**: the fifth consent member, whose admitted paths this feature
  states.
- **Antigravity CLI skill**: one skill name, spelled as a folder holding a `SKILL.md` in the
  repository and in the home.
- **Antigravity CLI rule**: one Markdown file directly in a repository or home rules directory,
  carrying the activation mode its frontmatter declares.

## Quality Requirements _(mandatory)_

### Maintainability and Code Clarity

- **QR-001**: Antigravity CLI's rules, behaviors, strategies, and relations MUST live in a
  vendor module and a vendor contract of their own, shaped like the three that exist, so a
  maintainer can update Antigravity CLI without touching another vendor. Every family the fourth
  vendor belongs to — the tool label table, the vendor marks, the compiled-rule subclasses, the
  same-name statement derivation, the which-files prose, the fixture launcher's rows — MUST name
  the same four tools: a surface naming a product this release does not support is an unfinished
  change.
- **QR-002**: The skill kind MUST keep one row shape: a skill is its folder for every product,
  so no field, unit, or branch may distinguish a file-shaped skill that no rule admits.

### Testing and Verification

- **QR-003**: Automated verification MUST cover, for Antigravity CLI: every admitted Repository
  and Global location with a positive fixture and every selector family with a rejected
  near-miss; the root `GEMINI.md` as one file with two recognitions; a nested context pair and
  a directory's `.agents/` pair, each with the range it governs; a skill folder in one
  `.agents/skills/` directory and under the superseded `.agent/` spelling, with a flat file
  rejected under both; a rules file per
  documented activation mode; both standalone hook carriers; both custom-agent shapes; an
  MCP declaration carrying a remote `serverUrl` and one carrying a legacy key; the five-member
  preview; the exclusions FR-003 and FR-010 name; and zero execution, MCP connection, outbound
  request, and mutation across fixtures holding hook commands, permission rules, and MCP
  declarations. The release-evidence manifests for the parent specification's measured criteria
  MUST hold one case per `(tool, customization file type, admitted source form)` this tool
  contributes, which increments the manifest version and starts a new measurement set. End-to-
  end browser coverage MUST reach the legend, the tool filter, and an Antigravity CLI detail.
  The parent specification's first-use evaluation MUST be run again for this change: this tool
  reads the repository root `AGENTS.md`, the designated file, and so adds a recognizing tool to
  its ground truth, so the study inputs MUST name the tools this release supports and
  drop the environment property FR-008 removes, the twenty agent-driven sessions MUST be run,
  and `validation.md` MUST record the run in both languages (§ Clarifications).
- **QR-004**: No gate may keep a frozen count, a fixture, or a digest for a product this release
  does not support; each such freeze is re-recorded against what ships.

### Security and Privacy

- **QR-005**: The Antigravity CLI home is inspected only after the same session-wide consent,
  and only at the paths FR-009 names. Credentials, session and history state, and installed
  plugin copies below the root are never read. Everything shown is read-only, inert,
  session-only, and loopback-local, as the parent specification's QR-003 requires of every
  source.

### Documentation and Participation

- **QR-006**: The readme, in both languages, MUST name the four tools this release supports, and
  `docs/which-files-are-listed.md` and its Japanese companion MUST carry an Antigravity CLI
  section under the repository and one under the personal setup — in prose, naming every literal
  segment the shipped rules admit, the superseded `.agent` spelling among them, so the
  containment gate that keeps that page honest passes. A
  vendor contract MUST exist in both languages with the same sections as the three existing
  contracts, and the official-sources contract MUST list the Antigravity CLI source IDs it
  cites. The Antigravity CLI mark MUST carry the product name as its accessible name, and the
  legend MUST name it. A changeset entry of level `minor` MUST accompany the change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Against a fixture repository holding one file at every location FR-002 admits,
  100% of those files are listed with Antigravity CLI as a reader, and the root `GEMINI.md` is
  listed once with exactly two recognitions.
- **SC-002**: Against fixtures holding a file at every location FR-003 and FR-010 exclude, and
  one near-miss per selector family, zero of those files are listed and zero read requests are
  issued for them.
- **SC-003**: Across sessions started with the home present, absent, present-empty, and
  unreadable, 100% of consent previews list five members and the Antigravity CLI entry's root
  and classification match the closed outcome the parent specification fixes for that input.
- **SC-004**: Across fixtures holding hook declarations, permission rules, and MCP declarations,
  inspection causes zero command executions, child processes, MCP connections, outbound
  requests, and inspected-source mutations.
- **SC-005**: Both languages of `docs/which-files-are-listed.md` name every literal path segment
  the shipped Antigravity CLI rules admit, and the readme, legend, filter, and consent surface
  each name the same four tools in both languages.
- **SC-006**: A search of the shipped tree, its documents, and its gates finds zero occurrences
  of a supported-tool identifier, label, mark, contract, or frozen count for a product this
  release does not support.
- **SC-007**: The official-source check reports every cited Antigravity CLI URL answering
  directly on its official host and every cited section resolving, for 100% of Antigravity CLI
  records.

## Assumptions

- The Antigravity CLI surfaces above were read on 2026-09-10, and the Rules and skills pages
  again on 2026-09-24, from the official documentation at
  `https://antigravity.google/docs/` — the CLI overview, features, migration, MCP, plugins and
  skills, subagents, settings, and permissions pages, and the shared Agent Skills, Rules, Hooks,
  and Plugins pages. Planning revalidates each path against
  those pages, records exact section headings, and may narrow a pattern; it does not add a
  surface without a specification change.
- The documented home is written literally as `~/.gemini` on every cited page. No page documents
  an environment property that relocates it, so none is derived: a derivation there would rest
  on an inference, which is the same reason the parent feature gave for not widening a home rule
  the vendor had not documented.
- The vendor's documentation is three product trees over two shared customization roots: the
  workspace's `.agents/` and the home's `~/.gemini/config/` are read by the terminal, the
  desktop application, and the editor extensions alike, while `~/.gemini/antigravity-cli/` is
  the terminal's own. A page in the shared part of that documentation therefore establishes what
  the terminal reads at a shared root, and a page in another product's tree establishes only
  that product's own directory — which is why the three products' global skill directories
  differ and this release admits the terminal's alone.
- The vendor's settings file is read as ordinary JSON unless planning measures otherwise, and any
  divergence between the vendor's own reading and the product's is recorded where the parser
  entry records the others.
- Every Antigravity CLI surface fits the existing eleven kinds, so no kind is added.
- The member order in the fixed tuple keeps its current shape: the four tool homes followed by
  the shared agent home.
