# Research: Support Gemini CLI

[日本語](research.ja.md)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-09

Each section records one decision the plan rests on, why it holds, and what was rejected.
The vendor facts were read from the official pages on 2026-09-09 and are cited by the
section headings the vendor contract records
([contracts/vendors/gemini-cli.md](contracts/vendors/gemini-cli.md)); the code facts were
read from the repository at commit `f176e7f`.

## 1. Where Gemini CLI reads customizations

**Decision**: The Repository allowlist admits, below the selected root: the context file at
every depth (`GEMINI.md` by default, or the names `context.fileName` declares);
`.gemini/settings.json` as one carrier recognized three times (settings, MCP, hooks);
`.gemini/commands/**/*.toml`; `.gemini/skills/<name>/SKILL.md` and
`.agents/skills/<name>/SKILL.md`; and `.gemini/agents/*.md`. The Gemini CLI home admits
`GEMINI.md`, `settings.json` (the same three recognitions), `commands/**/*.toml`,
`skills/<name>/SKILL.md`, `agents/*.md`, and `policies/*.toml`. The shared agent home's
`skills/<name>/SKILL.md` gains a Gemini CLI recognition.

**Rationale**: Every location is one the vendor names on a page whose heading the contract
cites: the context hierarchy (`Provide context with GEMINI.md files` § `Understand the
context hierarchy`), the settings files (`Gemini CLI configuration` § `Settings files`),
MCP (`MCP servers with Gemini CLI` § `Configure the MCP server in settings.json`), hooks
(`Gemini CLI hooks` § `Configuration`), commands (`Custom commands` § `File locations and
precedence`), skills (`Agent Skills` § `Discovery tiers`), agents (`Subagents` § `Agent
definition files`), and policies (`Policy engine` § `Policy locations`). The `.gemini/`
directory is documented at the project root only, so every `.gemini/` selector is anchored
there; the context file alone is documented as read from any directory a tool accesses,
which is the one descendant reach.

**Alternatives considered**: Admitting `.gemini/policies/*.toml` in the repository — the
vendor's own reference says the workspace tier is currently non-functional, so listing it
would name Gemini CLI as the reader of a file it does not read. Admitting nested `.gemini/`
directories as Claude's nested `.claude/` is admitted — Claude documents that reach and
Gemini CLI does not. Admitting `.geminiignore`, `.gemini/.env`, and hook scripts — an
ignore file is not a customization, an environment file is credentials, and a script is
what a declaration names.

## 2. The context filename is one derived rule that owns the default

**Decision**: There is no static `GEMINI.md` rule. `gemini.derived.context-filename` is a
`bounded-derived-candidate` whose seed is the repository `.gemini/settings.json` and whose
plan is always one: the names `context.fileName` declares when it declares them, and
`GEMINI.md` otherwise, each admitted at every depth. The reader — the Gemini counterpart of
`readCodexConfiguredFallbackPlans` — runs in the scan's configuration-read stage and seeds
the carrier's own candidacy from the same read.

**Rationale**: The vendor documents `context.fileName` as the name of the context file or
files to load, so configured names replace the default. A static `GEMINI.md` rule beside a
derivation that adds names would then need a second mechanism to withdraw the static plan
whenever names are configured — a suppression seam the scan does not have. One derivation
that always yields the plan needs neither the static rule nor the seam, and it reuses the
stage Codex already has. The reader treats an absent, unreadable, unparsable, or
ill-typed carrier exactly as Codex's does: it configures nothing, so the default stands; a
parse failure reaches the diagnostic through the carrier's own settings recognition, and
an ill-typed value carries none.

**Alternatives considered**: Static rule plus additive derivation, accepting that
`GEMINI.md` stays listed when configured names exclude it — false for the repository the
spec's User Story 3 describes. Static rule plus a suppression flag the reader returns — a
second mechanism for one fact. Reading the user tier's `settings.json` for the Global
member's context filename — the pages state the global location as `~/.gemini/GEMINI.md`
and do not establish that the setting renames it (spec.md § Clarifications).

## 3. The Gemini CLI home is a join, so the member descriptor states what a setting names

**Decision**: The per-tool descriptor in `src/server/host/global-consent.ts` gains a closed
field saying whether its environment setting names the member root itself (Copilot, Claude,
Codex) or the directory the root is created in (Gemini CLI). Capture classifies the setting
string as today; an `eligible` value becomes the root directly for the first kind and is
joined with the fixed suffix for the second. The absent case joins the captured home
directory with the suffix for every tool, as today.

**Rationale**: The configuration reference documents `GEMINI_CLI_HOME` as the root directory
for user-level configuration and storage, defaulting to the home, with `.gemini` created
inside — the home's stand-in, not `.gemini` itself. Encoding that as a field on the record
that already holds the variable and suffix keeps the derivation in the one place it is read
and makes the difference visible on the row that has it.

**Alternatives considered**: Treating `GEMINI_CLI_HOME` as naming the root — wrong against the
reference. Documenting the join in a comment and special-casing `gemini` in the capture
loop — a deviation without a stated home; the field is the stated home.

## 4. The fifth member sits after the tool homes and before the shared agent home

**Decision**: `SUPPORTED_TOOL_ORDER` becomes `copilot, claude, codex, gemini`, so
`GLOBAL_MEMBER_ORDER` — derived from it plus `agents` — becomes the five-member tuple
`[copilot, claude, codex, gemini, agents]`. `GLOBAL_TOOL_HOME_ORDER` and the environment
capture follow the same order, reading `GEMINI_CLI_HOME` after `CODEX_HOME`.

**Rationale**: The shared agent home stays last, as it is today, and the new tool takes the
next position rather than reordering the three the tests and documents already spell. The
`lifecycleOwnerRank` ladder in `src/shared/diagnostics.ts`, which hard-codes three
`global:<tool>` ranks, is rewritten to derive its rank from `GLOBAL_MEMBER_ORDER` in the same
change: a fourth member would otherwise fall silently into the fallback rank, and a ladder
restating an order that exists elsewhere is the two-states-that-can-disagree shape the
Implementation simplicity policy forbids.

## 5. Which kinds Gemini CLI publishes, and which compiled units answer them

**Decision**: Gemini CLI publishes eight kinds — instructions, skill, MCP, agent,
prompt/command, hook, settings/config, and (Global only) permissions — through a `gemini/`
vendor module and compiled units shaped like Codex's: `GeminiCompiledRule` and
`GeminiCompiledDerivedRule` in `vendor/gemini.ts`, one unit per kind directory, and an
other-kind unit for `settings/config`. The command unit derives the `:`-joined invocation
name the way Claude's already does for nested commands, dropping `.toml` instead of `.md`.
The MCP unit reads the JSON `mcpServers` map through the existing `server-map.ts` helper;
the hook unit reads the `hooks` object through `event-map.ts`; the agent unit is a
declared-name unit like Claude's and Codex's; the permissions unit is a document rule like
Codex's over `.rules`, here over TOML.

**Rationale**: Every format Gemini CLI uses — Markdown with YAML frontmatter, JSON with
comments, TOML — already has a parser in `parsers/`, and every kind already has a compiled
shape; what is new is the vendor's answers, which the Class and interface policy places in
that vendor's subclasses. No kind is added: extensions are excluded (spec.md §
Clarifications), and the vendor documents no output style, rule file, or plugin manifest
this product would list.

**Alternatives considered**: A `plugin` kind for installed extensions or a repository-root
`gemini-extension.json` — excluded by decision, and it would have been the one kind needing
a new manifest reader.

## 6. `settings.json` is JSON with comments, measured rather than documented

**Decision**: `acceptsComments` in `parsers/json.ts` gains a Gemini branch returning true
for the repository `.gemini/settings.json` and the Global `settings.json`. The comment
records the measurement: the vendor's loader calls `JSON.parse(stripJsonComments(content))`
(`packages/cli/src/config/settings.ts` of google-gemini/gemini-cli, read 2026-09-09), while
the configuration reference says nothing about comments.

**Rationale**: The table's rule is comments accepted where the reader accepts them, with the
evidence on the entry. The vendor strips comments but not trailing commas; the Inspector's
lenient reading blanks both, so a file with a trailing comma shows declarations on a row
whose product would reject it — the same milder error the Copilot entries accept, recorded
on the entry.

**Alternatives considered**: A third format for comments-without-trailing-commas — a new axis
on the seam for a divergence whose only effect is which of two errors a malformed file
shows.

## 7. The skill same-name statement is `select-first`

**Decision**: `gemini.skills.selection` carries the operations `select-first` and `filter`
(trust), because the skills page documents that a same-name skill in a higher-precedence
tier is used and that within a tier the `.agents/skills/` copy takes precedence over
`.gemini/skills/`. `SAME_NAME_SKILL_RESOLUTIONS` gains a `gemini` entry derived from it,
and `GeminiSkillCollisionPolicy` treats two definitions of one name in one Source as the
documented alias-over-directory selection rather than as a clash.

**Rationale**: The statement is derived from the strategy's operations, as every product's
is, so the same-name text on a Gemini row follows from the recorded evidence and no
per-product table is added.

## 8. The evidence records and their host

**Decision**: A `GoogleSourceId` union joins `SourceId`, with one ID per cited page:
`google.gemini-cli.configuration`, `gemini-md`, `custom-commands`, `skills`,
`creating-skills`, `subagents`, `hooks`, `hooks-reference`, `mcp-server`, `policy-engine`,
`extensions-reference`, `trusted-folders`, and `gemini-ignore`. The official host is
`geminicli.com`, added to the official-sources contract's host table under a new
`## Google official sources` section. Headings are recorded as rendered text without
backticks, as the existing records spell them (`Configure the mcp.json file`).

**Rationale**: Every URL was fetched directly on that host on 2026-09-09; two paths
(`/docs/core/policy-engine/`, `/docs/cli/configuration/`) redirect or 404 and are not cited —
the cited forms are `/docs/reference/policy-engine/` and `/docs/reference/configuration/`.

## 9. Gates that freeze counts and bytes, and what this feature moves

**Decision**: The change updates, in one commit with the code: the rule/behavior/strategy
counts and Global rule-ID list in `tests/contract/inspection-rules.test.ts` and
`vendor-behaviors.test.ts`; the `allowlistVersion`/`traversalPlanVersion` literals (source
and `http-api-global.test.ts`) to the change's date; the four-member tuples in the contract,
integration, security, and unit tests to five; the `presentation-allowlist-freeze.test.ts`
digest table and the official-sources contract's digest table with a Gemini CLI row; the
conformance JSON fixtures; the release-evidence `manifest.json`/`manifest.sha256`
(`manifestVersion` 3 → 4, a new measurement set); and the cross-artifact containment gate,
whose catalog array gains `GEMINI_INSPECTION_RULES` and whose derived-rule freeze gains
`gemini.derived.context-filename`, requiring both `docs/which-files-are-listed*.md` pages to
name `GEMINI.md` and `context.fileName`.

**Rationale**: Each is a freeze the repository keeps on purpose (AGENTS.md § Implementation
simplicity policy); moving one is part of the change that changes what it froze, never a
follow-up. The cross-artifact test reads only `specs/001-…/` task and quickstart artifacts,
so this feature's `tasks.md` gets its own task and phase count freeze added to that test, in
both languages, when `/speckit-tasks` writes it.

## 10. What the parent specification's artifacts change

**Decision**: The implementing change amends, in both languages: spec.md FR-004 (four tools),
the Supported Initial Release Customization Files table (a Gemini CLI row), FR-013/FR-014
(five members, `GEMINI_CLI_HOME` in the capture order), FR-018 (Gemini CLI's excluded state),
User Story 4, the Inspection Session and Source entities, the Global-scope Assumption; the
data-model's `GlobalRootInputCapture`, `GlobalConsentPreview` (`entries` exactly five,
member enum adds `gemini`), and `Global lexical state`; http-api.md's consent preview; the
readme's tool and directory counts; and `docs/which-files-are-listed*.md`. The
`SC-001`/`SC-006` study inputs are updated to name four tools, and `validation.md` records
whether the designated SC-006 file's ground truth changed and therefore whether a run was
owed (spec.md § Clarifications).

**Rationale**: Documentation content policy: the artifacts state what is true now. A dated
Clarifications entry in the parent spec records that a fifth member joined and why; no other
artifact narrates the change.

## Migration impact

None to users of the published package: no persisted state, profile, or public contract
changes shape. The session API's preview DTO grows by one entry in a closed order and one
member enum value; the bundled browser is the only client. `allowlistVersion` and
`traversalPlanVersion` advance, which is what they exist to do. No dependency is added: the
Gemini mark is `~icons/simple-icons/googlegemini` from a collection the bundle already
carries, so no `@iconify-json/*` package, notice row, or license text is added. The
changeset entry is a `minor`.
