# Tasks: Support Gemini CLI

[日本語](tasks.ja.md)

**Input**: Design documents from `/specs/002-gemini-cli-support/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/vendors/gemini-cli.md`, `quickstart.md`

**Tests**: Every behavioral change requires risk-appropriate automated tests before implementation. A test task precedes the implementation it covers, and a frozen count, digest, tuple, or version literal is changed only after its gate has been watched failing against the new source (AGENTS.md § Implementation simplicity policy).

**Organization**: Tasks are grouped by user story. Phase 2 is the closed vocabulary and registry the compiler and the contract gates check, which every story needs; Phase 3 is the repository (US1), Phase 4 the Gemini CLI home (US2), Phase 5 the configured context filename and the same-name statement (US3), and Phase 6 the release evidence, gates, and parity review.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel after stated prerequisites because it uses different files and has no dependency on another incomplete task.
- **[Story]**: Required in Phases 3–5; omitted in Setup, Foundational, and Polish.
- Every checklist item has one primary outcome and at least one exact repository-relative file path. Every new test file begins with a comment naming its owning task ID and the behavior under test (AGENTS.md § Code commenting policy).
- "Both languages" means the canonical `*.md` and its `*.ja.md` in the same task.

## Normative Requirement Traceability

The primary implementation, verification, and evidence owners for every FR, QR, and SC of this feature's specification. A range is inclusive. A requirement or task change updates this matrix and its Japanese counterpart in the same change.

| Requirement | Owning implementation, verification, and evidence tasks |
|---|---|
| FR-001 | T003, T005, T007, T014–T015, T035, T038, T045, T047–T050, T060 |
| FR-002 | T008–T010, T017, T019–T021, T023–T034, T037 |
| FR-003 | T010, T017, T021, T037 |
| FR-004 | T051–T052, T054–T055, T057–T058 |
| FR-005 | T008, T019, T026, T037 |
| FR-006 | T019, T029, T033, T037 |
| FR-007 | T009, T012, T019, T027, T053, T056, T059 |
| FR-008 | T019, T028 |
| FR-009 | T019–T020, T024–T025, T032 |
| FR-010 | T010, T017, T030–T031, T041, T044, T046, T048–T049 |
| FR-011 | T016, T039–T040, T043, T045, T048–T050 |
| FR-012 | T010, T017, T041–T042, T044, T046 |
| FR-013 | T021, T035–T036 |
| FR-014 | T008, T022, T041 |
| FR-015 | T002, T008–T011, T017, T066 |
| FR-016 | T010, T017, T021 |
| QR-001 | T005–T007, T011–T018, T023–T031, T036, T065 |
| QR-002 | T003–T004, T019–T022, T034–T035, T039–T042, T051–T053, T056–T057, T061–T064 |
| QR-003 | T022, T041, T043–T044 |
| QR-004 | T001–T002, T017, T037–T038, T046–T050, T058, T060, T062, T065–T067 |
| SC-001 | T021, T034–T035 |
| SC-002 | T021, T041 |
| SC-003 | T039–T041, T043 |
| SC-004 | T022 |
| SC-005 | T037–T038, T046–T047, T057, T064 |
| SC-006 | T002, T066 |

## Phase 1: Setup

**Purpose**: The two artifacts every later task cites — the release entry and the evidence registry rows.

- [X] T001 Write the `minor` changeset entry for the fourth supported tool with `pnpm exec changeset`, one sentence for a user, in `.changeset/support-gemini-cli.md` (research.md § Migration impact).
- [X] T002 Add the Google host row (`geminicli.com`) to the official-host table and a `## Google official sources` section with the thirteen `google.gemini-cli.*` rows — canonical URL, host, exact rendered section headings, `reviewedOn: 2026-09-09` — in `specs/001-inspect-agent-customizations/contracts/official-sources.md` and `official-sources.ja.md` (research.md § 8; contracts/vendors/gemini-cli.md evidence columns).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The closed vocabulary, the vendor registry, and the frozen contracts. Every story compiles against these, and the contract gates fail until they are complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Phase 2

- [X] T003 [P] Extend the tool-vocabulary tests so `gemini` is a member and the order gate covers four tools, replacing the assertion that rejects `'gemini'`, in `tests/unit/shared/entities.test.ts`; add the `gemini` label and mark expectations in `tests/unit/shared/display-text.test.ts` and `tests/unit/shared/skill-collision.test.ts`.
- [X] T004 [P] Update the frozen registry counts and ID lists to their post-Gemini values — rule, behavior, and strategy totals, the sorted Global rule-ID list, the per-vendor repository counts — in `tests/contract/inspection-rules.test.ts`, `tests/contract/vendor-behaviors.test.ts`, and `tests/contract/runtime-composition.test.ts`, and record in each test's comment that it failed against the three-vendor registry before T005–T013 (AGENTS.md § Implementation simplicity policy).

### Implementation for Phase 2

- [X] T005 Add `'gemini'` to `SupportedTool`, append it to `SUPPORTED_TOOL_ORDER` after `codex`, and add `gemini: 'Gemini CLI'` to `SUPPORTED_TOOL_TEXT` with member doc comments in `src/shared/entities.ts` (spec.md § Clarifications; data-model.md § SupportedTool).
- [X] T006 [P] Declare `GeminiBehaviorId`, `GeminiRuleId`, `GeminiStrategyId`, and `GoogleSourceId` as closed string-literal unions with a doc comment per member, and join each into `BehaviorId`, `RuleId`, `StrategyId`, and `SourceId`, in `src/shared/registries/identifier-types.ts` (data-model.md § Vendor registry records).
- [X] T007 [P] Add the `gemini-cli` member to `VendorSurface` in `src/shared/registries/behavior-types.ts` and its `Gemini CLI` label and order position after the Codex surfaces in `src/shared/registries/behavior-text.ts`.
- [X] T008 Author the twenty-one vendor behavior records with `evidence` citations, surface `gemini-cli`, and per-record `documentationStatus`/`lifecycleQualifiers` per the contract's assessment index, in `src/shared/registries/gemini/behaviors.ts` (contracts/vendors/gemini-cli.md § Documented Repository behavior, § Documented User behavior).
- [X] T009 [P] Author the eight runtime-composition strategies with their operations in documented pipeline order and evidence, in `src/shared/registries/gemini/strategies.ts` (data-model.md § Vendor registry records, strategy table).
- [X] T010 Author the nineteen Inspector rules — six static repository rules with inline typed matchers, the derived context-filename record with `matcher: null`, nine Global rules under `member: 'gemini'` and `member: 'agents'`, and three excluded groups each stating its reason — in `src/shared/registries/gemini/rules.ts`, every matcher spelled inline and every record's `policyRefs`/`evidence` wrapped in the `SHIPS_MAINTENANCE_DATA` ternary (contracts/vendors/gemini-cli.md § Inspector Repository rules, § Derived Repository rules, § Inspector Global rule, § Relationship-only and excluded groups).
- [X] T011 [P] Author `GEMINI_RULE_RELATIONS` and `GEMINI_STRATEGY_RELATIONS` linking each rule to its behaviors and strategies in `src/shared/registries/gemini/relations.ts`, and add the Gemini installed-extensions behavior to the shared managed-remote-state exclusion's `basedOnBehaviors`, beside the Claude and Codex installed-plugin behaviors it already names in `src/shared/registries/shared/relations.ts`, rewording its "three vendors" prose and the one in `src/shared/registries/shared/rules.ts`.
- [X] T012 [P] Implement `GeminiSkillCollisionPolicy` — two definitions of one name in one Source are the documented alias-over-directory selection, not a clash — in `src/shared/registries/gemini/skill-collision.ts`; add the `gemini` entry to `SKILL_COLLISION_POLICY` in `src/shared/skill-collision.ts` and to `SAME_NAME_SKILL_RESOLUTIONS` in `src/shared/registries/skill-resolution.ts` (research.md § 7).
- [X] T013 Spread the Gemini catalogs into `INSPECTION_RULES`, `VENDOR_BEHAVIOR_STATEMENTS`, `RUNTIME_COMPOSITION_STRATEGIES`, `RULE_RELATIONS`, and `STRATEGY_RELATIONS`, and extend the re-export lists, in `src/shared/registries/inspection-rules.ts`, `vendor-behaviors.ts`, `runtime-composition.ts`, and `relations.ts`.
- [X] T014 [P] Import `~icons/simple-icons/googlegemini`, add the `gemini` glyph entry, the `.aci-tool-mark--gemini` rule, and reword the "three" counts in the component comments in `src/app/components/ToolMark.vue`; add the `--aci-brand-gemini` `light-dark()` token pair and the forced-colors `CanvasText` line in `src/app/styles/main.css` (AGENTS.md § Icon policy).
- [X] T015 [P] Add `gemini: 'Gemini home'` to `GLOBAL_MEMBER_TEXT` — the member table's own idiom, vendor and suffix dropped — and `'global-gemini'` to `SOURCE_SELECTOR_TEXT`, and reword the "three tools" comment on `GLOBAL_MEMBER_ORDER`, in `src/shared/api-text.ts`; reword the "four rows"/"three tool homes" doc comments on `GlobalPreviewEntryDto`, `GlobalConsentPreviewDto.entries`, and `GlobalMemberId` in `src/shared/api-types.ts`.
- [X] T016 Replace the hard-coded `global:<tool>` rank ladder in `lifecycleOwnerRank` with a rank read from `GLOBAL_MEMBER_ORDER`, keeping `published-source:` and the fallback rank, with a comment stating why the order is read rather than restated, in `src/shared/diagnostics.ts` (research.md § 4).
- [X] T017 Move `specs/002-gemini-cli-support/contracts/vendors/gemini-cli.md` and `gemini-cli.ja.md` unchanged to `specs/001-inspect-agent-customizations/contracts/vendors/`, rewrite their relative links for the new parent, add the Gemini CLI row with both presentation-allowlist SHA-256 digests to the implementation-gate table in `contracts/official-sources.md` and `.ja.md` and to `RECORDED_DIGESTS` in `tests/contract/presentation-allowlist-freeze.test.ts`, and add a `## Gemini CLI strategies` section with the eight rows to `contracts/runtime-composition.md` and `.ja.md` (plan.md § Project Structure).
- [X] T018 Regenerate the materialized registries by writing the output of the export functions in `tests/fixtures/conformance/serialize.ts` back to `tests/fixtures/conformance/inspection-rules.json`, `vendor-behaviors.json`, `runtime-composition.json`, and `relations.json` so they carry the Gemini records, and confirm T004's gates now pass.

**Checkpoint**: The registry compiles, every `Record<SupportedTool, …>` has a `gemini` entry, and the contract suite passes against four vendors.

---

## Phase 3: User Story 1 - See Gemini CLI as a Reader of Repository Files (Priority: P1) 🎯 MVP

**Goal**: Every Gemini CLI repository location is listed with Gemini CLI as a reader; the root `GEMINI.md` shows two recognitions and `.agents/skills/` three; the tool filter, legend, and empty state name four tools.

**Independent Test**: Serve the `gemini-*` fixtures and confirm the rows, marks, and details of spec.md User Story 1's eight scenarios; run the unit, integration, security, documentation, and named end-to-end tests below.

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T019 [P] [US1] Write `tests/unit/inspection/gemini-metadata.test.ts` covering each compiled unit's answer: the derived instruction plan's default `GEMINI.md` at every depth and the applicability range without directory stripping; the skill name from `name` or directory; the agent's declared name; the MCP carrier's one row per `mcpServers` name; the hook recognition present whatever `hooks` declares; the command name for a direct child and a nested `git/commit.toml`; the settings row for the carrier; and the file-confined outcomes — an unparsable command TOML keeps its path-derived row name, an agent file without a parseable `name` leaves its row name unknown, and an `mcpServers` value that is absent, empty, or not an object yields no MCP row (spec.md FR-006, FR-008, FR-009).
- [X] T020 [P] [US1] Add the Gemini JSONC cases — a commented `.gemini/settings.json` parses, a trailing comma is blanked, and the same bytes read as Claude's `.mcp.json` still fail — to `tests/unit/inspection/seed-parsers.test.ts`, and the `.gemini/settings.json` three-rules-one-read case to `tests/unit/inspection/rules.test.ts`.
- [X] T021 [P] [US1] Add Gemini CLI repository trees to `tests/fixtures/repositories/build-fixtures.ts` — one file at every FR-002 location, a root `GEMINI.md`, a `packages/api/GEMINI.md`, an `.agents/skills/` skill, and near misses (`packages/api/.gemini/settings.json`, `.gemini/policies/deny.toml`, `.geminiignore`, `.gemini/.env`, `.gemini/hooks/lint.sh`, a root `gemini-extension.json`) — and assert admissions, exclusions, the two-recognition root `GEMINI.md`, and the three-recognition skill in `tests/integration/repository-scan.test.ts`.
- [X] T022 [P] [US1] Add Gemini fixtures holding a hook `command`, a `!{...}` shell-block command, and stdio and HTTP `mcpServers` declarations to the zero-activation suite in `tests/security/global-zero-activation.test.ts`, asserting no child process, MCP connection, outbound request, or source mutation.

### Implementation for User Story 1

- [X] T023 [US1] Create `GeminiCompiledRule` (fixes `tool: 'gemini'`, resolves `GEMINI_RULE_RELATIONS`, throws on a foreign rule) and `GeminiCompiledDerivedRule` (the derived plan builder for `[ANY_DIRECTORIES, <name>]` per name) in `src/server/inspection/rules/vendor/gemini.ts`, shaped like `vendor/codex.ts`.
- [X] T024 [US1] Create the settings-carrier units — `GeminiCompiledMcpCarrierRule` over `server-map.ts` in `src/server/inspection/rules/mcp/gemini.ts` and `GeminiCompiledSettingsHookRule` over `event-map.ts` in `src/server/inspection/rules/hooks/gemini.ts` — each with a header comment naming the three-rules-one-read arrangement and FR-009.
- [X] T025 [US1] Add the Gemini branch to `acceptsComments` — true for `(gemini, '.gemini/settings.json')` and `(gemini, 'settings.json')` — with the measurement comment (the vendor's `settings.ts` strips comments; the reference says nothing; trailing commas are the recorded milder error) in `src/server/inspection/parsers/json.ts` (research.md § 6).
- [X] T026 [US1] Create `GeminiCompiledDerivedInstructionRule` and `readGeminiConfiguredContextPlans` — reading the seed `.gemini/settings.json` before the walk, yielding the default `GEMINI.md` plan at every depth when nothing is configured, and seeding the carrier's candidacy from the same read — plus the Global static instruction unit, in `src/server/inspection/rules/instructions/gemini.ts` (research.md § 2; the configured-names branch is T054).
- [X] T027 [US1] Create `GeminiCompiledSkillRule` — declared `name`, directory fallback — in `src/server/inspection/rules/skills/gemini.ts`.
- [X] T028 [US1] Create `GeminiCompiledAgentRule` as a declared-name unit over `declared-name.ts` in `src/server/inspection/rules/agents/gemini.ts`.
- [X] T029 [US1] Create `GeminiCompiledCommandRule` deriving the `:`-joined path below `commands/` with `.toml` dropped, sharing the derivation shape of `prompts-and-commands/claude.ts`, in `src/server/inspection/rules/prompts-and-commands/gemini.ts`.
- [X] T030 [US1] Create `GeminiCompiledPolicyDocumentRule` as a permissions document unit over TOML in `src/server/inspection/rules/permissions/gemini.ts` (used by the Global member in Phase 4; compiled here so the catalog module is complete).
- [X] T031 [US1] Create the catalog module — `GEMINI_REPOSITORY_RULES`, `GEMINI_GLOBAL_RULES`, `GEMINI_AGENTS_HOME_RULES`, the other-kind unit for `settings/config`, the kind dispatch, and the `readGeminiConfiguredContextPlans` re-export — in `src/server/inspection/rules/gemini.ts`, deriving each catalog from the shipped registry by boundary as `codex.ts` does.
- [X] T032 [US1] Spread `GEMINI_REPOSITORY_RULES` into `REPOSITORY_INSPECTION_RULES` and add `readGeminiConfiguredContextPlans` to `REPOSITORY_CONFIGURATION_READERS` in `src/server/inspection/scan.ts`.
- [X] T033 [US1] Add `gemini-instructions`, `gemini-settings`, `gemini-commands`, `gemini-skills`, and `gemini-agents` fixture rows to `scripts/serve-fixture.ts`.
- [X] T034 [P] [US1] Write the end-to-end specs — `tests/e2e/gemini-instructions-inventory.spec.ts`, `gemini-instructions-detail.spec.ts`, `gemini-settings-inventory.spec.ts`, `gemini-settings-detail.spec.ts`, `gemini-commands-inventory.spec.ts`, `gemini-commands-detail.spec.ts`, `gemini-skills-list.spec.ts`, `gemini-skills-detail.spec.ts`, `gemini-custom-agents-inventory.spec.ts`, `gemini-custom-agents-detail.spec.ts` — following the `codex-*` pair pattern, and run them with `--project=chromium` (AGENTS.md § Agent-run Playwright verification policy).
- [X] T035 [P] [US1] Extend the mark-set assertions to four tools and add the root `GEMINI.md` two-mark row and the `.agents/skills/` three-mark row in `tests/e2e/inventory-rows.spec.ts`; extend the legend and tool-filter assertions there to name `Gemini CLI`.
- [X] T036 [US1] Delete the "no other product in this registry recognizes this filename, so a root `GEMINI.md` is a Copilot-only row" statement from the `COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE` comment and state the now-true fact — the root file is one candidate with two products' recognitions — in `src/shared/registries/copilot/rules.ts` (spec.md FR-013).
- [X] T037 [US1] Add the `### Gemini CLI` repository table — instructions (`GEMINI.md` in any directory, or the names `context.fileName` in `.gemini/settings.json` declares), skills, agents, prompts and commands, MCP/hooks/settings — to `docs/which-files-are-listed.md` and `.ja.md`, and add `GEMINI_INSPECTION_RULES` to the containment gate's catalog array in `tests/documentation/cross-artifact.test.ts`.
- [X] T038 [P] [US1] Reword every count of tools in `README.md` and `README.ja.md` — the opening sentence naming the products, "three tools", "three places" — to four, adding Gemini CLI and its `.gemini/` directory to the examples where the other three are named.

**Checkpoint**: User Story 1 is complete and independently testable against the `gemini-*` fixtures.

---

## Phase 4: User Story 2 - Inspect the Gemini CLI Home After Consent (Priority: P2)

**Goal**: The consent preview names five members; the Gemini CLI root is the `.gemini` join; after consent the member publishes exactly FR-010's files; the shared agent home's skills carry a Gemini CLI recognition.

**Independent Test**: Launch with `GEMINI_CLI_HOME` absent, eligible, present-empty, and relative against the Global home fixtures; confirm the preview, admission, published set, exclusions, and disable per spec.md User Story 2.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T039 [P] [US2] Add the descriptor derivation cases — `settingNames: root` keeps an eligible value, `settingNames: parent` joins it with `.gemini`, absent joins the home for both, and present-empty/relative/invalid are classified before any join — to `tests/unit/session/coordinator.test.ts` and the five-member `confirmedTools` cases to `tests/unit/app/session-view-state.test.ts`.
- [X] T040 [P] [US2] Update the consent-preview contract — five entries in `[copilot, claude, codex, gemini, agents]` order, the new `allowlistVersion`/`traversalPlanVersion` literals — in `tests/contract/http-api-global.test.ts`, watching it fail against the four-member host first.
- [X] T041 [P] [US2] Add the `gemini` member — `GEMINI_CLI_HOME` in the environment map with `.gemini` appended, the `.gemini` default suffix, per-member secret and sentinel files (`extensions/…`, `trustedFolders.json`, `.env`, an OAuth credential file, session state) — to `tests/fixtures/global-homes/build-fixtures.ts`; extend the five-member tuples and the admission/exclusion assertions in `tests/integration/global-boundaries.test.ts` and `MEMBERS` in `tests/security/global-zero-activation.test.ts`.
- [X] T042 [P] [US2] Write `tests/e2e/global-gemini-admission.spec.ts` following `global-codex-admission.spec.ts`, and extend `tests/e2e/global-consent-preview.spec.ts` to five listed directories with the Gemini CLI entry's displayed root and the shared-home sentence naming three readers.

### Implementation for User Story 2

- [X] T043 [US2] Add `gemini` to `GLOBAL_TOOL_HOME_ORDER`, rename the descriptor's `defaultSuffix` field to `suffix` — for a tool whose setting names the parent it is joined whenever the setting is eligible, not only by default — and add the closed `settingNames: 'root' | 'parent'` field to the per-tool descriptor with `gemini: { variable: 'GEMINI_CLI_HOME', suffix: '.gemini', settingNames: 'parent' }` and `root` for the three existing entries, apply it in the capture (classify, then join for `parent`), add the `gemini` port to `PRODUCTION_GLOBAL_MEMBER_PORTS`, and advance both version literals to the change's date, in `src/server/host/global-consent.ts` (research.md § 3; data-model.md § GlobalRootInputCapture).
- [X] T044 [US2] Add `gemini: GEMINI_GLOBAL_RULES` to `GLOBAL_RULES_BY_MEMBER` and spread `GEMINI_AGENTS_HOME_RULES` into its `agents` entry in `src/server/host/devframe-app.ts`.
- [X] T045 [US2] Drop the directory count from the consent preview copy — the table beneath holds the number, and a sentence restating it is one fact in two places — and reword the shared-agent-home sentence to name Codex, Copilot, and Gemini CLI, in `src/app/components/consent/GlobalConsentPreview.vue`; reword the "four rows"/"four times" comments in `src/app/components/consent/GlobalSourceControls.vue`, `src/app/components/inventory/SourceHomeBadge.vue`, `src/app/components/source-name.ts`, `src/app/components/detail-route.ts`, and the option description's member count in `src/server/cli.ts`.
- [X] T046 [US2] Add the `### Your Gemini CLI home` table (`GEMINI_CLI_HOME`, or `~/.gemini`; the join stated in one sentence) under the personal setup and add Gemini CLI to the shared agent home's skills "Read by" cell in `docs/which-files-are-listed.md` and `.ja.md`; reword "four directories, not three" to five in the same section.
- [X] T047 [P] [US2] Reword the personal-setup counts and directory lists — "four personal directories", the `~/.claude`, `~/.codex`, `~/.copilot` examples and their environment variables — to include `~/.gemini` and `GEMINI_CLI_HOME` in `README.md` and `README.ja.md`.
- [X] T048 [US2] Amend the parent specification in both languages — FR-013 (five members; `GEMINI_CLI_HOME` read after `CODEX_HOME`; `.gemini` suffix and the parent-directory join), FR-014 (zero to five Sources), FR-018 (Gemini CLI's managed and runtime state in the vendor list), User Story 4 (five member roots), the Inspection Session and Source entities, the Global-scope Assumption — and add a dated `### Session` entry to `## Clarifications` recording that a fifth member joined and why, in `specs/001-inspect-agent-customizations/spec.md` and `spec.ja.md`; add a Gemini CLI row to the Supported Initial Release Customization Files table there — one row summarizing the admitted set this feature's FR-002 and FR-010 define — and Gemini CLI to the parent's FR-004 tool list (research.md § 10).
- [X] T049 [US2] Amend `GlobalRootInputCapture` (four properties; the `settingNames` field and derivation table), `GlobalConsentPreview` (`entries` exactly five; the member enum), and `Global lexical state` in `specs/001-inspect-agent-customizations/data-model.md` and `.ja.md`, and the consent-preview member count in `contracts/http-api.md` and `.ja.md`.
- [X] T050 [US2] Add the Gemini CLI home's admitted rows and the five-member preview to `specs/001-inspect-agent-customizations/quickstart.md` and `.ja.md` where they list the four members.

**Checkpoint**: User Stories 1 and 2 are complete; the Gemini CLI home is a fifth consented member.

---

## Phase 5: User Story 3 - Read the Names the Repository Configures Gemini CLI to Use (Priority: P3)

**Goal**: A repository `context.fileName` replaces `GEMINI.md` with the declared names; an unusable value configures nothing; two same-name Gemini skills state the documented alias-over-directory resolution.

**Independent Test**: Serve the `gemini-context-filename` fixtures (absent, string, array, invalid) and the same-name skill fixture; confirm User Story 3's four scenarios.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T051 [P] [US3] Add the value-grammar cases to `tests/unit/inspection/gemini-metadata.test.ts` — a string yields that name; an array yields each name; empty string, empty array, a non-string member, a non-string value, and an unparsable carrier each yield the default `GEMINI.md`; only the unparsable carrier reaches a diagnostic, through the settings recognition.
- [X] T052 [P] [US3] Add the configured-name fixtures — `context.fileName: "AGENTS.md"` with a root `AGENTS.md`, a nested `AGENTS.md`, and a root `GEMINI.md`; an array with `CONTEXT.md`; an invalid value — and the same-name skill fixture (`.gemini/skills/deploy` and `.agents/skills/deploy`) to `tests/fixtures/repositories/build-fixtures.ts`, asserting in `tests/integration/repository-scan.test.ts` that the root `GEMINI.md` keeps Copilot's recognition alone when names are configured and that the `deploy` row lists both definitions.
- [X] T053 [P] [US3] Add the same-name statement and collision cases for `gemini` to `tests/unit/shared/skill-collision.test.ts` and the derived resolution to `tests/contract/inspection-rules.test.ts`, beside the Copilot derivation case there — the derivation reads the shipped registry, which is that suite's subject rather than `entities.test.ts`'s.

### Implementation for User Story 3

- [X] T054 [US3] Implement the configured-names branch of `readGeminiConfiguredContextPlans` — accept a non-empty string or a non-empty array of non-empty strings, yield one `[ANY_DIRECTORIES, <name>]` plan per name in place of the default, and treat every other shape as configuring nothing — with the comment stating why the derivation owns the default, in `src/server/inspection/rules/instructions/gemini.ts` (spec.md FR-004; research.md § 2).
- [X] T055 [US3] Add the `gemini-context-filename` fixture row to `scripts/serve-fixture.ts`.
- [X] T056 [US3] Write `tests/e2e/gemini-context-filename.spec.ts` — configured `AGENTS.md` rows carry the Gemini CLI mark and the root `GEMINI.md` carries Copilot's alone — and `tests/e2e/gemini-same-name-skill.spec.ts` for the alias-over-directory statement, run with `--project=chromium`.
- [X] T057 [US3] Extend the derived-rule freeze in `tests/documentation/cross-artifact.test.ts` to exactly `['codex.derived.fallback-basename', 'gemini.derived.context-filename']` and require both `docs/which-files-are-listed*.md` pages to contain `GEMINI.md` and `context.fileName`; confirm the T037 prose satisfies it.
- [X] T058 [US3] State the configured-filename behavior in one user-facing sentence — the names `.gemini/settings.json` gives `context.fileName` are read in place of `GEMINI.md` — in the Gemini CLI section of `docs/which-files-are-listed.md` and `.ja.md`.
- [X] T059 [US3] Verify the derived same-name statement text for `gemini` renders on a two-definition skill row, and add the expectation to `tests/unit/app/inventory.test.ts`.

**Checkpoint**: All three user stories are complete and independently testable.

---

## Phase 6: Polish, Release Evidence, and Parity

**Purpose**: The gates and records that span the stories.

- [X] T060 [P] Update the SC-001/SC-006 study inputs to name four tools wherever they name three — `tests/usability/sc001-sc006-study-inputs/guidance.md` and `.ja.md`, `prepared-state.json` and `.ja.json` — and confirm the designated `AGENTS.md` ground truth in `ground-truth.json` and `.ja.json` is unchanged because the prepared repository configures no `context.fileName`.
- [X] T061 Recompute every affected fixture digest and the canonical digest, advance `manifestVersion` to 4, and record the new measurement set with Gemini CLI rows for SC-003, SC-004, and SC-005 in `tests/fixtures/outcomes/manifest.json` and `manifest.sha256`, watching `tests/contract/outcome-fixture-manifest.test.ts` fail before the update.
- [X] T062 Record in `specs/001-inspect-agent-customizations/validation.md` and `.ja.md`: the manifest version 3 → 4 transition with its reviewer reference, the executed Gemini CLI case IDs, and — for SC-001/SC-006 — that the designated file's ground truth was unchanged and no run was owed (spec.md § Clarifications).
- [X] T063 Add a task and phase count freeze for this feature's `specs/002-gemini-cli-support/tasks.md` and `tasks.ja.md` beside the existing one in `tests/documentation/cross-artifact.test.ts`, spelling the literals in the test (AGENTS.md § Implementation simplicity policy).
- [X] T064 Run the `package.json` gate scripts — `pnpm run test:docs`, `pnpm run test:unit`, `pnpm run test:contract`, `pnpm run test:integration`, `pnpm run test:security`, and `pnpm run test:package`, and the named end-to-end specs of T034, T035, T042, and T056 with `--project=chromium`; fix what fails.
- [X] T065 Run `pnpm run format`, `pnpm run lint`, and `pnpm run typecheck`; review every new module's header comment, every closed-union member's doc comment, and every defensive branch's named caller against AGENTS.md § Code commenting policy.
- [X] T066 Run `pnpm run check:official-sources -- --network`; confirm every `google.gemini-cli.*` record resolves, and record the run in `specs/001-inspect-agent-customizations/validation.md` and `.ja.md`.
- [X] T067 Compare every English/Japanese pair this feature touched — the parent spec, data-model, http-api, quickstart, validation, official-sources, runtime-composition, the moved vendor contract, `docs/which-files-are-listed`, the readme, the study inputs, and this feature's own artifacts — for omissions and stale statements, and walk `specs/002-gemini-cli-support/quickstart.md` end to end, stopping every host it launched.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: T003–T004 first (they must be seen failing), then T005 before everything else in the phase (the union every `Record` keys on); T017 after T008–T012; T018 last.
- **User Story 1 (Phase 3)**: After Phase 2. T023 before T024–T031; T031 before T032; T032 before T033–T035; T037 after T010 and T032.
- **User Story 2 (Phase 4)**: After Phase 2; independent of Phase 3 except that T044 needs T031's catalogs. T043 before T044–T045; T048–T050 after T043.
- **User Story 3 (Phase 5)**: After Phase 3 (extends T026's reader and T037's prose).
- **Polish (Phase 6)**: After every story; T061 after every fixture builder change (T021, T041, T052); T063 last among the freezes.

### Parallel Opportunities

- Phase 2: T003 ∥ T004; T006 ∥ T007 ∥ T009 ∥ T011 ∥ T012 ∥ T014 ∥ T015 after T005.
- Phase 3: T019 ∥ T020 ∥ T021 ∥ T022; T034 ∥ T035 ∥ T038 after T032.
- Phase 4: T039 ∥ T040 ∥ T041 ∥ T042; T047 ∥ T046 after T043.
- Phase 5: T051 ∥ T052 ∥ T053.
- Phases 3 and 4 can proceed in parallel once T031 exists.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2 — the registry compiles and the contract suite passes against four vendors.
2. Phase 3 — the repository story. Stop and validate against the `gemini-*` fixtures.

### Incremental Delivery

3. Phase 4 — the fifth member. Validate with `GEMINI_CLI_HOME` in each lexical state.
4. Phase 5 — configured names and the same-name statement.
5. Phase 6 — evidence, gates, parity, and the quickstart walk.

---

## Notes

- Every new test file begins with its owning task ID and the behavior under test.
- A freeze is changed only after its gate has failed against the new source; the failure is what proves the gate exists.
- No task runs the whole browser suite; each names the specs its change can reach.
- Every launched host passes `--no-open --port 0` and is stopped before the task ends.
- Both language versions of every touched document change in the same task.
