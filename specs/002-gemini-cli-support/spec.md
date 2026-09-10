# Feature Specification: Support Gemini CLI

[日本語](spec.ja.md)

**Feature Branch**: `002-gemini-cli-support`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "Add Gemini CLI as a fourth supported tool: recognize its repository-level and user-global customization files (hierarchical GEMINI.md context files, .gemini/settings.json settings and MCP servers and hooks, .gemini/commands custom commands, extensions, skills) within the existing eleven kinds, with a ~/.gemini Global root, so the inventory names Gemini CLI as a reader of the files it reads — starting with the root GEMINI.md the inventory already lists with GitHub Copilot as its only reader."

This specification extends [Inspect Agent Customizations](../001-inspect-agent-customizations/spec.md).
Everything that specification requires of a supported tool — the allowlist discipline, the
non-execution guarantees, the consent model, the closed kind set, the evidence and
documentation obligations — applies to Gemini CLI unchanged. What is written here is what
Gemini CLI adds: which files it reads, where its personal home is, and which of the parent
specification's fixed statements about "three tools" and "four members" become statements
about four and five.

## Clarifications

### Session 2026-09-10

- Q: The custom-commands page names subdirectories as namespaces with one nested example; does a command at `.gemini/commands/x/y/z.toml` count, and is its name spelled as the loader spells it? → A: Yes on both. The page states the rule generally — the path relative to the commands directory, subdirectories as namespaces, the separator as `:` — without a depth limit, and the vendor's loader (`packages/cli/src/services/FileCommandLoader.ts`, measured 2026-09-10) enumerates `**/*.toml`, so `x/y/z.toml` is `/x:y:z` and the admitting rule keeps its recursive step. The loader also replaces every segment character outside `[A-Za-z0-9_.-]` with `_` and cuts a segment over 50 characters to 47 plus `...`, which no page states; the row matches that too, because a row named `my command` would report a command the product invokes as `/my_command`, and the two command behaviors are `partially-documented` with the measurement recorded in the vendor contract rather than promoted to documentation.

### Session 2026-09-09

- Q: The feature description names "extensions" among the surfaces to recognize; Gemini CLI documents extensions only as installed copies under the home's `extensions/` directory and as a local directory linked into it for development. Which reading is in scope: exclude entirely, recognize a repository's own root `gemini-extension.json` as a plugin row, or inspect installed copies? → A: Exclude entirely. Installed extension copies are what the parent specification's FR-018 already excludes for every other vendor — a copy reproduced from its source rather than a customization the user authored — and the same reason holds here; a repository that is itself an extension is not recognized either, so no plugin-kind rule, manifest reader, or plugin-root census is part of this feature. The exclusion is recorded in the vendor contract with that reason.
- Q: Does the Gemini CLI home's own `settings.json` `context.fileName` change which home instruction file is admitted, as the repository's `.gemini/settings.json` does for repository files? → A: No, the home admits `GEMINI.md` alone, as the Codex home admits its fixed `AGENTS.override.md`/`AGENTS.md` pair whatever `~/.codex/config.toml` declares. The official pages state the global location as `~/.gemini/GEMINI.md` and do not establish whether the setting renames it, so a derivation there would rest on an inference; the setting is recorded on the vendor behavior as a settings-inputs condition, and the home rule widens only when the vendor documents the global case.
- Q: Does adding Gemini CLI require repeating the parent specification's 20-session first-use evaluation (SC-001 and SC-006)? → A: Only when the evaluation's own answers change: the four workflows are unchanged by a fourth tool, so the evaluation is repeated only if the designated SC-006 file's ground truth — its source, recognizing tools, or kind — changes because Gemini CLI now reads it. Otherwise the study inputs are updated to name four tools where they name three and `validation.md` records that the ground truth was unchanged and no run was owed.
- Q: How is the tool named on every surface — the filter, the legend, the consent surface, the documentation? → A: `Gemini CLI`, the name the vendor's own documentation and repository use for the product, with no company prefix — as `Claude Code` is named without one — because the product name alone is unambiguous and shorter in a legend and a row.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See Gemini CLI as a Reader of Repository Files (Priority: P1)

A developer whose repository holds a `GEMINI.md`, a `.gemini/settings.json`, custom commands
under `.gemini/commands/`, skills under `.gemini/skills/` or `.agents/skills/`, and sub-agents
under `.gemini/agents/` launches the inspector and sees each of those files in the inventory
with Gemini CLI named as a reader — beside any other tool that also reads the same file.

**Why this priority**: The inventory already lists the root `GEMINI.md` and names GitHub
Copilot as its only reader, and lists `.agents/skills/` naming Codex and Copilot. Both
statements are incomplete today for anyone who uses Gemini CLI. Completing what the inventory
already says is the smallest change that makes it true, and it is the prerequisite for every
other Gemini CLI surface.

**Independent Test**: Launch the inspector against a fixture repository holding one file at
every Gemini CLI repository location, one root `GEMINI.md`, one `.agents/skills/` skill, and
near-miss files at locations Gemini CLI does not document. Confirm that every Gemini CLI file
is listed with Gemini CLI as a reader, that the root `GEMINI.md` shows GitHub Copilot and
Gemini CLI as two distinct recognitions of one file, that the `.agents/skills/` skill shows
three, and that no near-miss file is listed.

**Acceptance Scenarios**:

1. **Given** a repository whose root holds `GEMINI.md`, **When** the inventory is displayed,
   **Then** that file appears once, under instructions, with GitHub Copilot and Gemini CLI as
   two distinct tool recognitions.
2. **Given** a `GEMINI.md` in `packages/api/`, **When** the instructions inventory is displayed,
   **Then** it appears on the `packages/api/**` row with Gemini CLI as its reader and no Copilot
   recognition, because Copilot documents the root file alone.
3. **Given** `.gemini/settings.json` declaring `mcpServers` and `hooks`, **When** the inventory
   is displayed, **Then** the file appears under settings, and each declared MCP server name
   appears as an MCP row listing that declaration, and the file appears under hooks — without
   any server being contacted or any hook command being run.
4. **Given** `.gemini/commands/git/commit.toml`, **When** the prompts and commands inventory is
   displayed, **Then** the row is named `git:commit`, and its detail shows the TOML source as
   written, including any `!{...}` shell block in the prompt, which is not executed.
5. **Given** a skill at `.agents/skills/deploy/SKILL.md`, **When** the skills inventory is
   displayed, **Then** the `deploy` row lists OpenAI Codex, GitHub Copilot, and Gemini CLI as
   readers of the one file.
6. **Given** `.gemini/agents/reviewer.md`, **When** the custom agents inventory is displayed,
   **Then** the agent appears under its declared name with Gemini CLI as its reader.
7. **Given** a `.geminiignore`, a `.gemini/.env`, a `.gemini/policies/deny.toml`, or a script
   under `.gemini/hooks/`, **When** the repository is scanned, **Then** none of them is listed
   or opened.
8. **Given** the tool filter, the legend, and the empty-state scope text, **When** any of them
   is displayed, **Then** each names four tools, Gemini CLI among them, with the mark and the
   product name a reader can tell from the other three.

---

### User Story 2 - Inspect the Gemini CLI Home After Consent (Priority: P2)

A developer who has opted in to inspecting their personal setup sees a fifth member in the
consent preview — the Gemini CLI home — and, once admitted, its documented customization
files: the global `GEMINI.md`, `settings.json`, personal skills, sub-agents, custom commands,
and policy files. The shared agent home's skills now name Gemini CLI as a reader too.

**Why this priority**: A personal `~/.gemini/GEMINI.md` or `~/.gemini/settings.json` shapes
every Gemini CLI session in every repository, so a user-level file the product cannot show is
an unseen input to the agent — the gap the parent specification's Global inspection exists to
close. It comes after the repository story because consent, the preview, and the member
lifecycle already exist and only gain a member.

**Independent Test**: Start a session with `GEMINI_CLI_HOME` absent and a fixture home at
`~/.gemini`, and again with `GEMINI_CLI_HOME` set to an absolute directory. Confirm that the
consent preview names five members before anything is read, that opting in admits the Gemini
CLI home and publishes exactly the documented files below it, that credentials, trust records,
session state, and installed extension copies beside them are never read, and that disabling
removes the member's files with the others.

**Acceptance Scenarios**:

1. **Given** Global inspection has not been enabled, **When** the consent preview is shown,
   **Then** it lists five member roots — the Copilot, Claude, Codex, and Gemini CLI homes and
   the shared agent home — and no file below any of them has been read.
2. **Given** `GEMINI_CLI_HOME` is absent, **When** the preview is built, **Then** the Gemini CLI
   member root is the `.gemini` directory below the user's home directory.
3. **Given** `GEMINI_CLI_HOME` names an absolute directory, **When** the preview is built,
   **Then** the Gemini CLI member root is the `.gemini` directory below that directory, because
   the setting names the parent of `.gemini` rather than `.gemini` itself.
4. **Given** the user opts in and the Gemini CLI home is a readable directory, **When** the
   Global generation commits, **Then** a separately identified Gemini CLI Global Source
   publishes its `GEMINI.md`, `settings.json`, `skills/*/SKILL.md`, `agents/*.md`,
   `commands/**/*.toml`, and `policies/*.toml`, and nothing else below the root.
5. **Given** `extensions/`, `trustedFolders.json`, `.env`, OAuth or account credential files,
   session or history state, or temporary files exist beside those paths, **When** the member
   is scanned, **Then** none of them is read or listed.
6. **Given** the shared agent home holds `skills/review/SKILL.md`, **When** it is admitted,
   **Then** the `review` row names OpenAI Codex, GitHub Copilot, and Gemini CLI as its readers.
7. **Given** the launch used `--inspect-personal-setup`, **When** the consent surface states
   what that confirmation covered, **Then** it names five members.

---

### User Story 3 - Read the Names the Repository Configures Gemini CLI to Use (Priority: P3)

A developer whose repository's `.gemini/settings.json` sets `context.fileName` — to
`AGENTS.md`, or to a list such as `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]` — sees Gemini CLI
named as a reader of exactly those files, and sees the same-name statement the skills page
documents when two Gemini CLI skills share a name.

**Why this priority**: Both are documented Gemini CLI behaviors that change which file the
agent reads, and both have precedents in the product — Codex's configured fallback filenames
and each product's same-name skill statement — so they cost a rule each rather than a
mechanism. They come last because the default filename and the default skill locations
serve most repositories.

**Independent Test**: Inspect three fixtures — `context.fileName` absent, set to one string,
set to an array — and confirm Gemini CLI reads `GEMINI.md` in the first, exactly the declared
name in the second, and exactly the declared names in the third. Inspect a fixture holding
same-name skills under `.gemini/skills/` and `.agents/skills/` and confirm the row states the
documented resolution without declaring which file is in effect.

**Acceptance Scenarios**:

1. **Given** `.gemini/settings.json` sets `context.fileName` to `"AGENTS.md"`, **When** the
   inventory is displayed, **Then** every `AGENTS.md` in the repository carries a Gemini CLI
   recognition, and a `GEMINI.md` carries none from Gemini CLI — the root one keeps Copilot's.
2. **Given** `.gemini/settings.json` sets `context.fileName` to an array, **When** the inventory
   is displayed, **Then** each listed name is recognized in any directory, and nothing else is.
3. **Given** `.gemini/settings.json` cannot be parsed, **When** the scan completes, **Then** the
   settings file carries a parse diagnostic, the default `GEMINI.md` is recognized as if the
   setting were absent, and every other file is complete.
4. **Given** `.gemini/skills/deploy/SKILL.md` and `.agents/skills/deploy/SKILL.md`, **When**
   the `deploy` row is displayed, **Then** it lists both definitions and states, for Gemini CLI,
   that the `.agents/skills/` copy takes precedence within the workspace tier — stated as what
   the vendor documents, not as which file a session loaded.

---

### Edge Cases

- `GEMINI_CLI_HOME` is present but empty, relative, or contains U+0000 or an unpaired surrogate:
  the setting string is classified by the parent specification's closed lexical-state
  algorithm before any join, so an empty value is `present-empty`, a relative value is
  `relative`, and only an `eligible` value is joined with `.gemini` to form the member root.
- A repository `.gemini/settings.json` sets `context.fileName` to an empty string, an empty
  array, an array holding a non-string, or a value of another type: the declaration configures nothing and `GEMINI.md` stays the recognized name, exactly as a
  Codex `project_doc_fallback_filenames` that is not a string array configures nothing; such
  a value is not a parse failure, so it carries no diagnostic.
- A `GEMINI.md` sits inside a directory the walk never enters — `node_modules`, `.git` — and is
  not listed, exactly as a `CLAUDE.md` there is not.
- A `GEMINI.md` imports another file with `@./path.md`: the import is a recorded relationship
  and authored text; the target is not opened.
- A custom command file sits directly in `.gemini/commands/` and another sits three directories
  deep: both are recognized, named `name` and `a:b:c:name` respectively.
- Two custom commands derive the same name within one Source — impossible, since the name is
  the file's own path — but the same name exists in the repository and in the Gemini CLI home:
  each Source lists its own row; no cross-Source winner is declared.
- `.gemini/policies/*.toml` exists in the repository: not listed, because the vendor's own
  reference documents the workspace policy tier as not currently loaded; the same files below
  the Gemini CLI home are listed as permissions, because the user tier is documented as loaded.
- The Gemini CLI home is missing while the other four members exist: the member is recorded as
  absent, and the others commit, exactly as a missing Codex home is handled today.
- The Gemini CLI home is a symbolic link, or `GEMINI_CLI_HOME` names a file rather than a
  directory: a link is read through its target like every other path (parent FR-024), and a root
  that is not a readable directory is recorded as that member's failed admission without
  fallback (parent FR-014).
- A skill is declared under `.gemini/skills/` with a `name` that differs from its directory: the
  row is named by the declared name, as every product's root skill row is.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Gemini CLI MUST be a supported tool, the fourth beside GitHub Copilot, Claude
  Code, and OpenAI Codex, named `Gemini CLI` on every surface (§ Clarifications). Every surface that names the supported tools — the tool filter, the
  legend, the empty-state scope, the consent surface, the launch option's description, and the
  user documentation — MUST name four, and the parent specification's statements written for
  three tools and four Global members MUST be amended in both languages to four tools and five
  members in the change that adds the tool: its FR-004 tool list, its Supported Initial Release
  Customization Files table, its FR-013, FR-014, and FR-018 member counts and capture order, its User Story 4, its Inspection Session and Source entities, and its Assumptions about Global
  scope — together with the parent data model's root-capture and consent-preview entities and the
  session API contract's consent preview, wherever they state a member count or the capture order. Gemini CLI's mark MUST follow the vendor-mark rule the other three follow: a single-colour glyph in the vendor's own desaturated colour, with the product name as its
  accessible name, and with nothing resting on the colour alone (WCAG 1.4.1).
- **FR-002**: The Repository inspection path allowlist MUST admit, for Gemini CLI, exactly these
  locations below the selected Repository root and no others: as instructions, the context file in any directory, through one derived rule whose
  filenames are `GEMINI.md` unless the repository's `.gemini/settings.json` declares
  `context.fileName`, and exactly the declared name or names when it does (FR-004) — no static
  rule admits `GEMINI.md` beside that derivation; as
  skills, `SKILL.md` one directory below `.gemini/skills/` and one directory below
  `.agents/skills/`; as custom agents, direct children of `.gemini/agents/` whose names match
  `/\.md$/u`; as prompts and commands, files at any depth below `.gemini/commands/` whose names
  match `/\.toml$/u`; and, as the settings, MCP, and hook carrier, `.gemini/settings.json`. Every `.gemini/` and `.agents/` location above is the selected root's own directory — the
  vendor documents the project's `.gemini` directory at the project root and no nested one —
  so a `packages/api/.gemini/` is not admitted. The companion census of a skill directory
  applies to Gemini CLI skills as it does to every product's.
- **FR-003**: The Repository allowlist MUST NOT admit, for Gemini CLI, `.gemini/policies/`,
  `.geminiignore`, `.gemini/.env`, scripts under `.gemini/hooks/`, or the system-level settings,
  defaults, and policy directories the vendor documents outside the repository and the home.
  Each exclusion MUST be recorded in the vendor contract with its reason: the workspace policy
  tier is documented as not currently loaded; an ignore file is not a customization and no
  ignore file is read to decide what is listed; an environment file is credentials; a hook
  script is a target a hook declaration names, not a declaration; and system locations lie
  outside every Source.
- **FR-004**: When the repository's `.gemini/settings.json` declares `context.fileName` as a
  non-empty string or as a non-empty array of non-empty strings, the instruction names Gemini
  CLI is recognized by MUST be exactly the declared names — the setting names the file or
  files to load, so it replaces the default rather than adding to it. The settings file is
  read as configuration before the walk and is also published as its own settings row. Any other declared value, an unreadable
  settings file, or one its format cannot parse configures nothing, so `GEMINI.md` stays the
  recognized name — exactly as an absent, unreadable, malformed, or invalidly-declaring
  `.codex/config.toml` configures nothing for Codex. A parse failure is the settings file's
  own file-confined diagnostic through its settings recognition; a value the vendor's reading
  is not established for is not a parse failure and carries none. A `context.fileName` declared only in the user's
  home, or in a system settings file, is a runtime input the Repository Source does not read;
  it is recorded on the vendor behavior as a settings-inputs condition, never projected onto a
  Repository recognition.
- **FR-005**: An instructions row for a Gemini CLI context file MUST derive its applicability
  range from the file's own path exactly as a Claude Code instruction file's is derived — the
  root derives `**`, `packages/api/GEMINI.md` derives `packages/api/**` — with no directory
  stripped from the tail, because Gemini CLI documents no `.gemini/GEMINI.md` alternative to a
  file beside it. A `@path` import in the file is a relationship recorded as authored text
  whose target is never opened. The vendor's own hierarchy — the global file, the workspace
  directories and their parents, and the just-in-time scan of an accessed directory and its
  ancestors up to a boundary marker — MUST be recorded on the vendor behavior as
  runtime-cwd and repository-root conditions and MUST NOT widen the allowlist beyond the
  selected root.
- **FR-006**: A Gemini CLI custom command row MUST be named as the vendor invokes it: the
  file's path relative to the `commands/` directory, at any depth, with the `.toml` extension
  removed, every character of a segment outside `[A-Za-z0-9_.-]` replaced by `_`, a segment
  longer than 50 characters cut to its first 47 followed by `...`, and the segments joined
  with `:` — so `.gemini/commands/git/commit.toml` is `git:commit`,
  `.gemini/commands/review/security/deps.toml` is `review:security:deps`, and
  `.gemini/commands/my command.toml` is `my_command`. The depth is the documented rule; the
  sanitization and the truncation are the vendor loader's, recorded as a source measurement
  (§ Clarifications Session 2026-09-10). The row's detail
  MUST show the TOML source as written, including `!{...}` shell blocks and `{{args}}`
  placeholders, none of which is evaluated. A command file the TOML parser cannot read, or one that declares no `prompt`, keeps the row
  its path names and carries a file-confined parse diagnostic, as every path-named product's
  command does.
- **FR-007**: A Gemini CLI skill row MUST be named by the skill's authored frontmatter `name`,
  falling back to the skill directory when the name is absent or empty, as every product's root
  skill row is; the vendor's guidance that the name match its directory is not something the
  inspector checks (parent specification FR-012). The documented same-name resolution — a workspace skill over a user
  skill, and within one tier the `.agents/skills/` copy over the `.gemini/skills/` copy —
  MUST be recorded as a runtime-composition strategy from which the row's same-name statement
  is derived, stated as what the vendor documents and never as which file a session loaded.
- **FR-008**: A Gemini CLI sub-agent row MUST be named by the file's declared frontmatter
  `name`, one row per agent name the admitting rule resolves. The declaration's `mcpServers`,
  `tools`, and `model` fields are shown as authored and are not resolved, connected to, or validated. A file whose
  frontmatter cannot be parsed or declares no `name` leaves the row name unknown and carries a
  file-confined diagnostic, as the declared-name products' agents already do.
- **FR-009**: `.gemini/settings.json` MUST be published once as a settings row and MUST
  contribute one MCP row per server name declared under its `mcpServers`, each listing that
  declaration, and MUST carry a hook recognition
  by the same matcher that admits it, whatever its `hooks` object declares — three rules
  over one file read once, as `.claude/settings.json` and `.codex/config.toml` are recognized. A
  `$VAR_NAME` reference in a declared server's `env` or `headers` is literal text and is not
  resolved (parent specification FR-026). The `mcp.allowed`, `mcp.excluded`, `agents`, and
  `skills` settings are part of the file's source and are not interpreted as enablement. An
  `mcpServers` value that is absent, empty, or not an object contributes no MCP row and leaves
  the settings and hook recognitions as they are.
- **FR-010**: The Gemini CLI Global member MUST inspect only these paths below its root: as
  instructions, `GEMINI.md`; as the settings, MCP, and hook carrier, `settings.json`; as
  skills, `skills/<skill-name>/SKILL.md`, the skill name one direct child; as custom agents,
  direct children of `agents/` whose names match `/\.md$/u`; as prompts and commands, files at
  any depth below `commands/` whose names match `/\.toml$/u`; and, as permissions, direct
  children of `policies/` whose names match `/\.toml$/u`. It MUST exclude everything else below
  the root, and the parent specification's FR-018 MUST name Gemini CLI's managed and runtime
  state in the same terms it names the other vendors': installed extension copies under
  `extensions/`, the trusted-folder record, environment files, OAuth and account credentials,
  session and history state, and temporary files. The home's own `settings.json` `context.fileName` MUST NOT change which
  home instruction file is admitted: the rule admits `GEMINI.md` alone, as the Codex home
  admits its fixed instruction pair whatever its `config.toml` declares, and the setting is
  recorded on the vendor behavior as a settings-inputs condition (§ Clarifications).
- **FR-011**: The Gemini CLI member root MUST be derived at session start in the parent
  specification's one capture, after `CODEX_HOME` and before the shared agent home, by reading
  `GEMINI_CLI_HOME` exactly once and treating only `undefined` as absent. A present value is
  classified by the closed lexical-state algorithm as the other settings are; an `eligible`
  value is joined with the fixed suffix `.gemini` by the active platform's `node:path.join` to
  form the root, because the vendor documents the setting as the directory the `.gemini` folder
  is created in rather than as that folder. An absent value derives
  `node:path.join(capturedHomedir, '.gemini')`. The preview, consent, admission, retry, and
  disable rules of FR-013 and FR-014 apply to the member unchanged; the fixed member tuple has
  five entries, and `retryableTools` is derived over all five.
- **FR-012**: The shared agent home member's `skills/<skill-name>/SKILL.md` rule MUST carry a
  Gemini CLI recognition, because the vendor documents `~/.agents/skills/` as an alias of its
  own user skill directory, and the parent specification's FR-045 already states that an
  admitted file there carries the recognitions of every tool whose documentation names the
  matched path. The existing Codex and Copilot recognitions are unchanged.
- **FR-013**: GitHub Copilot's recognition of the root `GEMINI.md` MUST remain exactly as it is.
  The file gains a second recognition and loses nothing; and any statement — in a registry
  comment or a contract — that a root `GEMINI.md` is a Copilot-only row MUST be corrected in
  the same change, because it stops being true.
- **FR-014**: Gemini CLI MUST be inspected under every guarantee the parent specification
  gives: no hook command, custom command, or skill script is executed (its FR-020); no declared
  MCP server is started or contacted (FR-021); no outbound request is issued (FR-022); no
  inspected source is mutated (FR-023); and a recognition never states that Gemini CLI loaded,
  selected, enabled, or trusted a file (FR-009). Whether a folder is trusted, and therefore
  whether project settings, hooks, commands, and skills load at all, is a trust condition
  recorded on the vendor behavior and never projected onto a recognition.
- **FR-015**: Every Gemini CLI vendor behavior, Inspector rule, and runtime-composition
  strategy MUST cite official Gemini CLI documentation through the existing evidence records,
  with exact rendered section headings and a `reviewedOn` date, and MUST carry its own
  `documentationStatus` and `lifecycleQualifiers` (parent specification QR-005). The
  official-source check MUST pass over the new records before the change is complete.
- **FR-016**: Gemini CLI extensions MUST NOT be recognized at either of their documented
  locations: installed copies under the home's `extensions/` directory are excluded by
  FR-010 as installed copies, exactly as the parent specification's FR-018 excludes every
  other vendor's, and a repository whose root holds a `gemini-extension.json` — an extension
  under development, linked into that directory — is not recognized as a plugin, so its
  manifest and its bundled `commands/`, `skills/`, `agents/`, `hooks/hooks.json`,
  `policies/`, and context file acquire no rule, recognition, or row from that manifest.
  The vendor contract MUST record both exclusions with the reason: an installed copy is
  reproduced from its source rather than authored, and a repository-root manifest is read
  by the vendor only through such a copy.

### Key Entities

- **Supported Tool**: The closed set of products the inventory names as readers — GitHub
  Copilot, Claude Code, OpenAI Codex, and Gemini CLI. Adding a member is a change to every
  surface that enumerates the set, which the label table's exhaustiveness is what enforces.
- **Gemini CLI Global Member**: The fifth consent preview entry. Its root is the `.gemini`
  directory below `GEMINI_CLI_HOME` when that setting is eligible, and below the captured home
  directory otherwise. It is consented, admitted, retried, and disabled exactly as a tool home
  is, and it is identified separately from the other four members.
- **Context Filename Declaration**: The value the repository's `.gemini/settings.json` gives
  `context.fileName` — one name or a list — read as configuration before the walk to decide
  which instruction filenames Gemini CLI is recognized by. A value the vendor's reading is not
  established for derives nothing, and `GEMINI.md` stays.
- **Command Name**: A custom command's invocation name, derived from its path below the
  `commands/` directory with `:` joining the directory segments. It is the prompt/command
  row's unit within one Source.

## Quality Requirements _(mandatory)_

### Maintainability and Code Clarity

- **QR-001**: Gemini CLI's rules, behaviors, strategies, and relations MUST live in a vendor
  module and a vendor contract of their own, shaped like the three that exist, so a maintainer
  can update Gemini CLI without touching another vendor. The only edits to another vendor's
  records are the ones FR-012 and FR-013 name — the shared agent home skill rule gains a
  recognition and the Copilot root-`GEMINI.md` statement is corrected. Every family the fourth
  vendor joins — the tool label table, the vendor marks, the compiled-rule subclasses, the
  same-name statement derivation, the which-files prose — MUST be converted whole: a surface
  that names three tools after this change is an unfinished change.

### Testing and Verification

- **QR-002**: Automated verification MUST cover, for Gemini CLI: every admitted Repository and
  Global location with a positive fixture and every selector family with a rejected near-miss;
  the root `GEMINI.md` as one file with two recognitions and the `.agents/skills/` skill as
  one file with three; `context.fileName` absent, a string, an array, and each value that
  derives nothing; the command name derived from a direct child and from a nested path; the
  five-member preview with `GEMINI_CLI_HOME` absent, eligible, present-empty, and relative; the
  shared agent home skill carrying the Gemini CLI recognition; the exclusions FR-003 and FR-010
  name; and zero execution, MCP connection, outbound request, and mutation across fixtures
  holding hook commands, shell-block commands, and MCP declarations. The release-evidence
  manifests for the parent specification's SC-003, SC-004, and SC-005 MUST gain Gemini CLI rows
  for every `(tool, customization file type, admitted source form)` the tool adds, which under
  Release-Evidence Fixture Governance increments the manifest version and starts a new
  measurement set. End-to-end browser coverage MUST reach the legend, the tool filter, and a
  Gemini CLI detail; the whole browser suite is not re-run for it. The parent
  specification's 20-session evaluation is repeated only if the designated SC-006 file's
  ground truth changes because Gemini CLI reads it; when it does not, the study inputs are
  updated to name four tools and `validation.md` records that the ground truth was
  unchanged, so no run was owed (§ Clarifications).

### Security and Privacy

- **QR-003**: The Gemini CLI home is inspected only after the same session-wide consent, and
  only at the paths FR-010 names. OAuth and account credentials, the trusted-folder record,
  environment files, session and history state, and installed extension copies below the root
  are never read. The `.gemini/.env` file in a repository is never read. Everything shown is
  read-only, inert, session-only, and loopback-local, as the parent specification's QR-003
  requires of every source.

### Documentation and Participation

- **QR-004**: The readme, in both languages, MUST name four tools wherever it names three, and
  `docs/which-files-are-listed.md` and its Japanese companion MUST gain a Gemini CLI section
  under the repository, a Gemini CLI home section under the personal setup, and Gemini CLI in
  the shared agent home's "Read by" column — in prose, naming every literal segment the
  shipped rules admit, so the containment gate that keeps that page honest passes. A new
  vendor contract, `contracts/vendors/gemini-cli.md`, MUST exist in both languages with the
  same sections as the three existing contracts, and the official-sources contract MUST list
  the Gemini CLI source IDs it cites. The Gemini CLI mark MUST carry the product name as its
  accessible name, and the legend MUST name it. A changeset entry of level `minor` MUST accompany the change, because a fourth tool is a
  behavior users receive and no existing behavior changes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Against a fixture repository holding one file at every Gemini CLI repository
  location FR-002 admits, 100% of those files are listed with Gemini CLI as a reader, the root
  `GEMINI.md` is listed once with exactly two recognitions, and the `.agents/skills/` skill is
  listed once with exactly three.
- **SC-002**: Against fixtures holding a file at every location FR-003 and FR-010 exclude, and
  one near-miss per Gemini CLI selector family — a nested `packages/api/.gemini/settings.json`,
  `.gemini/policies/deny.toml`, `.geminiignore`, `.gemini/.env`, a script under
  `.gemini/hooks/`, a root `gemini-extension.json`, a `SKILL.md` two directories below
  `.gemini/skills/`, an agent file nested below `.gemini/agents/`, and, in the home,
  `extensions/`, `trustedFolders.json`, and `.env` — zero of those files are listed, and zero
  read requests are issued for them.
- **SC-003**: Across sessions started with `GEMINI_CLI_HOME` absent, eligible, present-empty,
  and relative, 100% of consent previews list five members, and the Gemini CLI entry's root and classification match, in every case, the closed outcome the
  parent specification's Closed Global Root Admission Outcomes table and FR-011 fix for that input
  (data-model.md § GlobalRootInputCapture).
- **SC-004**: Across fixtures holding Gemini CLI hook commands, shell-block custom commands,
  and MCP declarations, inspection causes zero command executions, child processes, MCP
  connections, outbound requests, and inspected-source mutations.
- **SC-005**: Both languages of `docs/which-files-are-listed.md` name every literal path
  segment the shipped Gemini CLI rules admit, as the existing containment gate measures — extended to require, for the derived rule, that both
  pages mention `GEMINI.md` and `context.fileName` — and the readme, legend, filter, and consent
  surface each name four tools in both languages.
- **SC-006**: The official-source check reports every cited Gemini CLI URL answering directly
  on its official host and every cited section resolving, for 100% of Gemini CLI records.

## Assumptions

- The Gemini CLI surfaces above were read on 2026-09-09 from the official documentation at
  `https://geminicli.com/docs/` — the settings, GEMINI.md, custom commands, skills, sub-agents,
  hooks, MCP server, extensions, policy engine, trusted folders, and ignore-file pages. Planning
  revalidates each path against those pages, records exact section headings, and may narrow a
  pattern; it does not add a surface without a specification change.
- The documented user-level directory is `.gemini` below the user's home, and `GEMINI_CLI_HOME`
  names the directory that `.gemini` is created in. Because that differs from `CODEX_HOME`,
  `CLAUDE_CONFIG_DIR`, and `COPILOT_HOME`, which name the home itself, the join with `.gemini`
  is part of the member's derivation and is stated in FR-011 rather than left to analogy.
- `context.fileName` replaces the default filename rather than adding to it, because the
  reference documents it as "the name of the context file or files to load into memory". Only
  the repository's own `.gemini/settings.json` is read for it, as only the repository's
  `.codex/config.toml` is read for Codex's fallback names: a user-level setting is a runtime
  input the Repository Source does not see.
- The workspace policy tier is excluded from the repository because the vendor's own
  reference documents it as not currently loaded; when that page changes, the exclusion is
  re-derived, which the official-source review already requires.
- Every Gemini CLI surface fits the existing eleven kinds — instructions, skills, MCP, custom
  agents, prompts and commands, permissions, hooks, and settings — so no kind is added.
  Extensions are excluded rather than given a kind (FR-016).
- The member order in the fixed tuple is the four tool homes in the order their settings are
  captured — Copilot, Claude, Codex, Gemini CLI — followed by the shared agent home, so the
  shared home stays last as it is today.
- The Gemini CLI settings file is read as JSON with comments, because the vendor's own settings
  loader strips comments before parsing — a source measurement, recorded as such on the parser
  entry, since the configuration reference says nothing about comments — so the parser the
  product already uses for commented JSON is reused. The vendor does not strip a trailing comma;
  the Inspector's lenient reading does, and that divergence is the recorded milder error
  (research.md § 6).
- Sub-agents and hooks may carry lifecycle qualifiers the vendor documents — sub-agents are
  toggled under an `experimental` setting — which the evidence records state per subject rather
  than the specification deciding here.
