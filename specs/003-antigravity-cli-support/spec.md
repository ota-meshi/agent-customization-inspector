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
- Q: `.agents/skills/` holds two shapes. When `deploy.md` and `deploy/SKILL.md` sit side by side, is that one inventory row or two? → A: One row. A skill row's unit is one name as each product resolves it, which is what already puts a `.agents/skills/x/SKILL.md` and a `.claude/skills/x/SKILL.md` on one row; the row carries both definitions and states which product reads which. No new mechanism is needed, and no precedence between the two shapes is invented.
- Q: The terminal's own page shows a workspace skill as a flat `.md` file, while the vendor's Agent Skills page shows the same directory holding a folder with a `SKILL.md`. Which shapes does this release admit? → A: Both, for this tool. `.agents/skills/` is one directory three of the vendor's products read, and each shape is documented for it on an official page of that vendor; admitting one and declining the other would leave a reader's own `.agents/skills/deploy/SKILL.md` unlisted for the terminal while the same file is listed for two other products. The file shape is the terminal page's, the directory shape is the Agent Skills page's, and neither page states a precedence, so none is invented. What the terminal's own global directory admits is unchanged: `antigravity-cli/skills/` is the terminal's alone and only the flat shape is documented there.
- Q: `.agents/` also holds a rules directory and a hooks file. Are they admitted for this tool? → A: Yes, both. The vendor's Rules page places workspace rules in `.agents/rules/`, the Hooks page places a `hooks.json` in the workspace's `.agents/` and in the home's `config/`, and the terminal's own migration page states that workspace skills, rules, and MCP servers are preserved — which is a terminal page naming the rules directory as one the terminal reads. Both are published under the kinds that already exist, shown as written: an activation mode is not evaluated against a file and a hook command is never run.
- Q: The skills and rules pages both record a superseded `.agent/` spelling beside the current `.agents/`. Is it admitted? → A: Yes, at the locations and in the shapes those pages document there — `.agent/skills/<name>/SKILL.md` and `.agent/rules/<name>.md` — and nowhere else. Backward support is stated on the page that states the location, so the deprecated spelling reaches exactly what that page shows at it; the flat skill shape is the terminal page's and that page names only `.agents/`, so `.agent/skills/<name>.md` stays out and is recorded as a known uncertainty.
- Q: A static analysis of the published `agy` 1.2.0 binary shows the terminal discovering only the folder shape, and shows an unnamed skill resolving to `SKILL` rather than to its folder name. Does the release follow the binary or the pages? → A: Both, each where it is the better evidence. The flat shape stays admitted, because a reader who followed the terminal's own page has that file and declining it would show them nothing about it, while admitting it costs a row the vendor's own documentation supports; the observation is recorded on the vendor contract and the rule goes when a page or a later build settles it. The naming does not follow the binary. A row's name is the one the recognizing product resolves, and the same binary's `GetSkillsCreatePath` builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`, so the terminal itself treats the folder as carrying the name: an unnamed folder is named by its folder, which is the answer the two other products reading that file give, and an unnamed flat file by its own file name, having no folder to take one from. The global allowlist does follow the binary, admitting both documented global roots rather than ranking them, because the terminal walks both. (Amended 2026-09-11: the naming half of this answer was corrected to the fallback FR-004 and the shipped units state, after the two readings inside the binary were weighed against each other.)
- Q: The vendor documents a workspace plugin directory at `.agents/plugins/`. Is it admitted? → A: No. No terminal page names it: the terminal's own pages document a plugin only as a bundle `agy` installs into the home, which is why installed copies are excluded. That exclusion's reason — an installed copy is reproduced from its source — does not cover a plugin authored in a repository, so the vendor contract states the workspace directory's own reason separately: this release has no terminal evidence that the terminal loads it.
- Q: Does an Antigravity CLI recognition reach `GEMINI.md` and `AGENTS.md` below the repository root? → A: No, the repository root's pair alone. The migration guide states the workspace context files as the ones in the active directory and says nothing about a depth, so reaching deeper would rest on an inference — the same reason the home instruction rule was not widened for the previous vendor. The depth is recorded as a known uncertainty on the vendor contract, and the rule widens when the vendor documents the hierarchy.
- Q: The fifth member's directory stays `~/.gemini` while the product it was named for is no longer supported. What does its label say? → A: `Antigravity home`. The member table names a member by whose directory it is rather than by the directory's own name, and a label that differs from the path is already what that table does: `~/.config/github-copilot` is labelled `Copilot home`. The short form follows the same family — `Antigravity CLI` shortens to `Antigravity` as `OpenAI Codex` shortens to `Codex` — and the member's root path is shown beside the label, so the label says whose directory it is and the path says where.
- Q: A skill that is one file — the shape the terminal's own page documents, in the repository and in the home — has no directory, and the detail's file panel is the panel holding the skill's directory and the open file. What does that page show? → A: The skill panel alone, with no file panel and no tab strip: the panel's subject is a directory the skill does not have, and a tab strip offering one tab is not a choice. The heading stays the skill's own path, because what it says — the one identity every product reading it shares, where the names they invoke it by differ — is true of a file as it is of a directory. A row's companion count needs nothing new: it is already drawn only where a skill ships companions.
- Q: The parent specification repeats its first-use evaluation only when the designated file's ground truth moves. That file is the repository root `AGENTS.md`, and this tool reads it, so its recognizing tools go from two to three. Is a run owed? → A: Yes. The condition the parent set is met, so the study inputs are updated and the twenty agent-driven sessions are run before release, with the result recorded. A reader of the designated file now has a harder answer to give, and a criterion measured against a page that no longer matches would be measuring nothing.
- Q: Does the release publish the prompt and command kind for this tool? → A: No. Antigravity CLI's migration guide converts legacy commands into skills, and no page documents a repository command directory, so this tool contributes no row of that kind. The kind stays in the closed set for the three tools that do publish it.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See Antigravity CLI as a Reader of Repository Files (Priority: P1)

A developer opens a repository that carries an `.agents/` directory: skills in both shapes, a
rules directory, a hooks file, an MCP configuration, custom agents, and a root `GEMINI.md` and
`AGENTS.md`. Today the
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

1. **Given** a repository with `.agents/skills/format-tests.md`, **When** the reader opens the
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
   `config/skills/triage/SKILL.md`, `antigravity-cli/skills/legacy.md`, and
   `antigravity-cli/settings.json`, **When** the scan completes, **Then** each is listed under
   the personal setup with Antigravity CLI as its reader, both global skill roots included.
2. **Given** that home also holds an installed plugin copy and the manifest that tracks it,
   **When** the scan completes, **Then** neither is listed and neither is read.
3. **Given** the home's settings file declares permission lists and hooks, **When** the reader
   opens the permissions and hooks inventories, **Then** the declarations are shown as written
   and nothing is evaluated, resolved, or run.

### User Story 3 - Tell One Skill Shape From the Other (Priority: P3)

`.agents/skills/` holds two shapes at once: a directory whose `SKILL.md` OpenAI Codex, GitHub
Copilot, and Antigravity CLI all read, and a Markdown file only Antigravity CLI reads. A reader
looking at that directory needs to see which of their skills each product actually picks up,
and the answer differs by shape rather than by name.

**Why this priority**: It is a comprehension problem inside a story the first two already
deliver, so it is valuable but not what makes the feature worth shipping.

**Independent Test**: Inspect a repository whose `.agents/skills/` holds both shapes, including
one name spelled in both, and confirm each row states the products that resolve it.

**Acceptance Scenarios**:

1. **Given** `.agents/skills/deploy.md` and `.agents/skills/release/SKILL.md`, **When** the
   reader opens the skills inventory, **Then** both are listed, the file names Antigravity CLI
   alone, and the directory names all three products that read its shape.
2. **Given** `.agents/skills/deploy.md` beside `.agents/skills/deploy/SKILL.md`, **When** the
   reader opens the skills inventory, **Then** the product states what each name resolves to for
   each product without inventing a precedence between them.

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
  under the superseded spelling the vendor still supports; one holding `.agent/skills/deploy.md`
  lists nothing, because no page documents the flat shape at that spelling.
- A home with no `antigravity-cli` directory at all is admitted and lists whatever of the other
  admitted paths it holds.
- A repository holding `.gemini/commands/`, `.gemini/agents/`, or `.gemini/skills/` lists none
  of them: no supported tool reads them in this release.
- A repository holding `.agents/plugins/` or `_agents/plugins/` lists nothing below it: no
  terminal page documents the terminal loading a workspace plugin directory.
- A custom-agent directory holding files beside its `agent.md` lists the `agent.md` alone: no
  cited page documents a companion beside a custom agent, so nothing else in that directory is
  admitted.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Antigravity CLI MUST be a supported tool, the fourth beside GitHub Copilot, Claude
  Code, and OpenAI Codex, named `Antigravity CLI` on every surface. Every surface that names the
  supported tools — the tool filter, the legend, the empty-state scope, the consent surface, the
  launch option's description, and the user documentation — MUST name those four and no other
  product. The parent specification's statements written for three tools and four Global members
  MUST read four tools and five members in both languages. The supported tool is the vendor's
  terminal client alone: its editor extensions and its desktop application are separate surfaces
  this release does not recognize, and no location only they read enters the allowlist
  (§ Clarifications).
- **FR-002**: The Repository inspection path allowlist for Antigravity CLI MUST admit exactly:
  the root context files `GEMINI.md` and `AGENTS.md`; a skill at `.agents/skills/<name>.md` or
  `.agents/skills/<name>/SKILL.md`; a rule at `.agents/rules/<name>.md`; the hooks carrier
  `.agents/hooks.json`; a custom agent at `.agents/agents/<name>.md` or
  `.agents/agents/<name>/agent.md`; and the MCP carrier `.agents/mcp_config.json`. The
  superseded `.agent/` spelling MUST be admitted for the two locations whose pages state
  backward support for it, in the shape each of those pages documents there —
  `.agent/skills/<name>/SKILL.md` and `.agent/rules/<name>.md` — and nowhere else. No other
  repository location is admitted for this tool.
- **FR-003**: The Repository inspection MUST NOT admit, for this tool, any `.gemini/` path, any
  workspace settings file, or any workspace plugin directory including `.agents/plugins/` and
  `_agents/plugins/`: no cited terminal page documents the terminal reading one, and a rule for
  a location no page establishes would be this product's own invention. The vendor contract MUST
  state that reason for the workspace plugin directory separately from the installed-copy reason
  FR-010 gives, because a plugin authored in a repository is not a copy of anything
  (§ Clarifications).
- **FR-004**: An Antigravity CLI skill MUST be published in both admitted shapes, named by the
  `name` its frontmatter declares and, when it declares none, by the shape's own fallback: the
  skill folder for a folder, and the file's own name without its extension for a flat file,
  which has no folder to take one from. The folder fallback is the one every other product
  resolving the same file uses, so one `SKILL.md` stays one row with three readers rather than
  splitting into two rows under two names. A file-shaped skill carries no companion
  directory, so its row states none and its detail shows the skill alone, without the file panel
  whose subject is a directory it does not have (§ Clarifications). A skill file and a
  same-named skill directory in one `.agents/skills/` MUST be one inventory row, carrying both
  definitions and stating which product resolves the name to which file, exactly as a name
  spelled in two directories is one row today. No precedence between the two shapes may be
  stated (§ Clarifications).
- **FR-005**: The MCP carriers MUST publish one row per declared server name, with every
  declared field shown as written, including a remote server's `serverUrl` and any legacy `url`
  or `httpUrl` a file still spells. No server is started, connected to, or probed, and no
  environment reference in a declaration is resolved.
- **FR-006**: A custom agent MUST be published under the custom-agent kind in both admitted
  shapes, named by the `name` its frontmatter declares. A file declaring none MUST reach the
  inventory's no-name row rather than be named after its file or its directory: this vendor
  documents `name` as the agent's identity, as the two other declared-name products do, and a
  path fallback would report an agent name the product does not have.
- **FR-007**: The repository root's `GEMINI.md` and `AGENTS.md` MUST carry an Antigravity CLI
  recognition beside the recognitions they already carry, so one file stays one row with more
  than one reader. A `GEMINI.md` or `AGENTS.md` below the root MUST NOT carry one: no cited page
  states a depth, so the recognition stops where the documentation does, and the vendor contract
  MUST record that depth as a known uncertainty (§ Clarifications).
- **FR-008**: The fifth Global member MUST stay the `~/.gemini` directory, in its current
  position after the three other tool homes and before the shared agent home, admitted and
  consented exactly as it is today. No environment property relocates it: no cited page
  documents one for Antigravity CLI, so the member's root is `.gemini` below the captured home
  directory and nothing else. The member MUST be labelled `Antigravity home`, naming whose
  directory it is, with its root path shown beside it (§ Clarifications).
- **FR-009**: The Global inspection path allowlist for that member MUST admit exactly:
  `GEMINI.md`; `config/mcp_config.json`; `config/hooks.json`; a custom agent at
  `config/agents/<name>.md` or `config/agents/<name>/agent.md`; a skill at
  `antigravity-cli/skills/<name>/SKILL.md`, `config/skills/<name>/SKILL.md`, or
  `antigravity-cli/skills/<name>.md`; and
  `antigravity-cli/settings.json`. Both documented global skill roots are admitted rather than
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
- **FR-016**: A workspace rule MUST be published under the rule kind, one row per Markdown file
  below the rules directory, with the activation its frontmatter declares — manual, always on,
  model decision, or a glob — shown exactly as written. No activation is evaluated: no glob is
  matched against a path and no description is judged for relevance.
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
- **Antigravity CLI skill**: one skill name, spelled in the repository as a Markdown file or as
  a directory holding a `SKILL.md`, and in the home as a Markdown file. The file shape's row
  unit is the file itself, which is the shape that carries no companion directory.
- **Antigravity CLI workspace rule**: one Markdown file below the workspace rules directory,
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
- **QR-002**: The skill kind MUST accommodate both row shapes without widening one record into a
  type whose invariants hold for neither. A file-shaped skill states the facts it has; it does
  not carry an empty directory census as though it had one. One vendor reading both shapes at
  one location does not make them one record shape: the two rules stay separate records, as the
  two custom-agent shapes already are.

### Testing and Verification

- **QR-003**: Automated verification MUST cover, for Antigravity CLI: every admitted Repository
  and Global location with a positive fixture and every selector family with a rejected
  near-miss; the root `GEMINI.md` as one file with two recognitions; both skill shapes in one
  `.agents/skills/` directory, including a name spelled in both, and the same two shapes under
  the superseded `.agent/` spelling with the flat one rejected there; a rules file per
  documented activation mode; both standalone hook carriers; both custom-agent shapes; an
  MCP declaration carrying a remote `serverUrl` and one carrying a legacy key; the five-member
  preview; the exclusions FR-003 and FR-010 name; and zero execution, MCP connection, outbound
  request, and mutation across fixtures holding hook commands, permission rules, and MCP
  declarations. The release-evidence manifests for the parent specification's measured criteria
  MUST hold one case per `(tool, customization file type, admitted source form)` this tool
  contributes, which increments the manifest version and starts a new measurement set. End-to-
  end browser coverage MUST reach the legend, the tool filter, and an Antigravity CLI detail.
  The parent specification's first-use evaluation MUST be run again for this change: its
  designated file's recognizing tools move from two to three because this tool reads the
  repository root `AGENTS.md`, so the study inputs MUST name the tools this release supports and
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

- The Antigravity CLI surfaces above were read on 2026-09-10 from the official documentation at
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
- The vendor's own pages disagree about the shape of a workspace skill, and the disagreement is
  not resolved here: both shapes are admitted because both are documented for the directory, and
  no page states which the terminal prefers when a name is spelled in both. That question is
  recorded as a known uncertainty rather than answered.
- The vendor's settings file is read as ordinary JSON unless planning measures otherwise, and any
  divergence between the vendor's own reading and the product's is recorded where the parser
  entry records the others.
- Every Antigravity CLI surface fits the existing eleven kinds, so no kind is added.
- The member order in the fixed tuple keeps its current shape: the four tool homes followed by
  the shared agent home.
