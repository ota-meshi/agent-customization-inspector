# Tasks: Support Antigravity CLI

[日本語](tasks.ja.md)

**Input**: Design documents from `/specs/003-antigravity-cli-support/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/vendors/antigravity-cli.md`, `quickstart.md`

**Tests**: Every behavioral change requires risk-appropriate automated tests before implementation. A test task precedes the implementation it covers, and a frozen count, digest, tuple, or version literal is changed only after its gate has been watched failing against the new source (AGENTS.md § Implementation simplicity policy).

**Organization**: Tasks are grouped by user story. Phase 2 is the closed vocabulary, the vendor registry, and the frozen contracts every story compiles against, because a closed union cannot gain a member without every exhaustive record over it moving with it. Phase 3 is the repository (US1), Phase 4 the Antigravity home (US2), Phase 5 the two skill shapes sharing a row (US3), and Phase 6 the release evidence and the parity review.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel after stated prerequisites because it uses different files and has no dependency on another incomplete task.
- **[Story]**: Required in Phases 3–5; omitted in Setup, Foundational, and Polish.
- Every checklist item has one primary outcome and at least one exact repository-relative file path. Every new test file begins with a comment naming its owning task ID and the behavior under test (AGENTS.md § Code commenting policy).
- "Both languages" means the canonical `*.md` and its `*.ja.md` in the same task.
- `T015` and `T066` are vacant: the numbering is stable across both languages, so an ID that
  no longer names work is left standing rather than closed by renumbering every task after it.

## Normative Requirement Traceability

The primary implementation, verification, and evidence owners for every FR, QR, and SC of this feature's specification. A range is inclusive. A requirement or task change updates this matrix and its Japanese counterpart in the same change.

| Requirement | Owning implementation, verification, and evidence tasks |
|---|---|
| FR-001 | T003, T006, T008, T018, T035, T048, T059–T060, T068–T070, T076, T078–T080 |
| FR-002 | T011, T020–T021, T023, T025–T029, T036–T037 |
| FR-003 | T011, T021, T023 |
| FR-004 | T022, T026, T030–T031, T052–T056, T058 |
| FR-005 | T021, T029, T042 |
| FR-006 | T021, T028 |
| FR-007 | T021, T023, T025 |
| FR-008 | T005, T019, T039, T041, T048 |
| FR-009 | T040–T041, T043–T046, T051 |
| FR-010 | T040, T042, T047 |
| FR-011 | T044–T046, T050 |
| FR-012 | T011, T016, T021 |
| FR-013 | T023 |
| FR-014 | T012–T013, T016, T063, T065 |
| FR-015 | T002, T009, T073, T077 |
| FR-016 | T011, T020–T021, T037–T038, T059 |
| FR-017 | T011, T020–T021, T036, T038, T051, T059 |
| QR-001 | T007, T009–T014, T017, T032, T072 |
| QR-002 | T026, T030, T053 |
| QR-003 | T020–T024, T033–T034, T036–T042, T049, T051–T054, T057, T061–T062, T064, T071 |
| QR-004 | T004, T063, T065 |
| QR-005 | T042, T047 |
| QR-006 | T001–T002, T016–T017, T059–T060, T074–T075, T080 |
| SC-001 | T023 |
| SC-002 | T021, T023, T040–T041 |
| SC-003 | T005, T039, T041, T048 |
| SC-004 | T024, T042 |
| SC-005 | T006, T048, T059–T060, T071 |
| SC-006 | T067, T071 |
| SC-007 | T073, T077 |

---

## Phase 1: Setup

**Purpose**: The two artifacts every later task cites — the release entry and the evidence registry rows.

- [X] T001 Write the `minor` changeset entry for the fourth supported tool with `pnpm exec changeset`, one sentence for a user, in `.changeset/` (research.md § Migration impact).
- [X] T002 Write the Google source rows as the `google.antigravity.*` set — canonical URL on `antigravity.google`, host, exact rendered section headings, `reviewedOn: 2026-09-10` — covering both the terminal's own pages and the three shared pages that establish the shared customization roots, update the official-host table, and add `"google"` to the `sourceId` grammar that lists the registrable prefixes, in `specs/001-inspect-agent-customizations/contracts/official-sources.md` and `official-sources.ja.md` (contracts/vendors/antigravity-cli.md evidence columns).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The closed vocabulary, the vendor registry, and the frozen contracts. Every story compiles against these, and the contract gates fail until they are complete.

**Build state**: The tree does not compile from T006 until the last compiled unit lands. Adding the union member breaks every exhaustive record over it, and T014's catalog composes per-kind units the stories author — the repository ones in Phase 3, the Global ones in Phase 4. Typecheck and the suites are green again at the end of Phase 4, which is the first point at which the whole read set exists. A red build between those points is the expected state, not a failure to diagnose.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Phase 2

- [X] T003 [P] Set the tool-vocabulary expectations so `antigravity` is the fourth member and the order gate covers `copilot`, `claude`, `codex`, `antigravity`, in `tests/unit/shared/entities.test.ts`, `tests/unit/shared/display-text.test.ts`, and `tests/unit/shared/skill-collision.test.ts`, and record in each comment that it was watched failing before the member was declared.
- [X] T004 [P] Update every frozen value the registry change moves, recording in each comment that it failed against the pre-change registry (AGENTS.md § Implementation simplicity policy): the rule, behavior, strategy, and source totals, the sorted Global rule-ID list, the per-kind rule lists and recognition matrices, and the per-vendor repository counts, in `tests/contract/inspection-rules.test.ts`, `tests/contract/vendor-behaviors.test.ts`, and `tests/contract/runtime-composition.test.ts`; the presentation-allowlist digests in `tests/contract/presentation-allowlist-freeze.test.ts` and the table publishing them in `specs/001-inspect-agent-customizations/contracts/official-sources.md` and `.ja.md`; and the checked-in conformance materializations under `tests/fixtures/conformance/`, which `regen.mts` beside them re-records in one step.
- [X] T005 [P] Assert the capture reads three environment properties in fixed order and that the fourth member's root is always the home-directory join with origin `default-home`, in `tests/unit/cli.test.ts` and `tests/unit/host/global-consent.test.ts`; cover the four states that directory can be in — present, absent, present and empty, and unreadable — and assert the preview lists five members with the closed outcome the parent fixes for each (spec.md § SC-003).

### Implementation for Phase 2

- [X] T006 Declare `'antigravity'` in `SupportedTool`, its position after `codex` in `SUPPORTED_TOOL_ORDER`, and `SUPPORTED_TOOL_TEXT` as `Antigravity CLI`, with member doc comments, in `src/shared/entities.ts` (data-model.md § SupportedTool).
- [X] T007 [P] Declare `AntigravityBehaviorId`, `AntigravityRuleId`, `AntigravityStrategyId`, and the Google source-ID union as closed string-literal unions with a doc comment per member, joining each into `BehaviorId`, `RuleId`, `StrategyId`, and `SourceId`, in `src/shared/registries/identifier-types.ts`.
- [X] T008 [P] Declare the `antigravity-cli` surface in `src/shared/registries/behavior-types.ts`, and its `CLI` label and last order position in `src/shared/registries/behavior-text.ts` (data-model.md § VendorSurface).
- [X] T009 Author the vendor behavior records — the four workspace behaviors, the workspace rules and hooks behaviors, and the nine user-tier behaviors — with `evidence` citations, surface `antigravity-cli`, and per-record `documentationStatus`/`lifecycleQualifiers` per the contract's assessment index, in `src/shared/registries/antigravity/behaviors.ts` (contracts/vendors/antigravity-cli.md § Documented Repository behavior, § Documented User behavior).
- [X] T010 [P] Author the runtime-composition strategies with their operations in documented order and evidence — `antigravity.rules.activation` carrying `filter` alone among them — in `src/shared/registries/antigravity/strategies.ts`.
- [X] T011 Author the Inspector rules — the two root context rules, the two skill rules, the workspace rules rule, the workspace hooks carrier, the two custom-agent rules, the MCP carrier, the eight Global rules, and the three excluded groups each stating its own reason — in `src/shared/registries/antigravity/rules.ts`, every matcher spelled inline and every record's `policyRefs`/`evidence` wrapped in the `SHIPS_MAINTENANCE_DATA` ternary (contracts/vendors/antigravity-cli.md § Inspector Repository rules, § Inspector Global rule, § Relationship-only and excluded groups).
- [X] T012 [P] Author the relationship-only records and the skill same-name statement in `src/shared/registries/antigravity/relations.ts` and `skill-collision.ts`, deriving the statement from the strategies its skill rule names.
- [X] T013 Register the new vendor module in the registry index — `inspection-rules.ts`, `vendor-behaviors.ts`, `relations.ts`, `runtime-composition.ts`, and `skill-collision.ts` under `src/shared/registries/` — so every catalog a gate reads holds this vendor's records.
- [X] T014 Author the vendor base class every compiled unit of this tool extends, in `src/server/inspection/rules/vendor/antigravity.ts`. The rule catalog that composes those units is T051's, at the end of Phase 4: a catalog importing a unit nobody has written yet makes `scan.ts` unloadable, which takes every other vendor's suite down with it and leaves no gate able to run — a worse intermediate state than a red typecheck, and not one the phase plan intended.
- [X] T016 Move the vendor contract to `specs/001-inspect-agent-customizations/contracts/vendors/antigravity-cli.md` and `.ja.md`, and update the contract index, the strategy table — which gains `antigravity.rules.activation` — and the relationship-only table of `contracts/runtime-composition.md` and `.ja.md` to the shipped set.
- [X] T017 Take `@iconify-json/thesvg` in one change with all three of the icon policy's edits — the devDependency in `package.json`, the `~icons/thesvg/` row in `scripts/third-party-notices-plugin.mjs`, and the collection's upstream license text at `licenses/` — and with them the mark import in `src/app/components/ToolMark.vue` and the `--aci-brand-antigravity` token in `src/app/styles/main.css`, whose value is desaturated until it reads against both grounds (research.md § 8, § 8a).
- [X] T018 [P] Declare the member entry `antigravity` and label it `Antigravity home` in `src/shared/api-text.ts`, and update the member doc comments in `src/shared/api-types.ts` (data-model.md § GlobalMemberId and the member tuple).
- [X] T019 Reduce the environment capture to three properties, delete the `settingNames` field and the parent-join branch it existed for, and derive the fourth member's root as the home-directory join, in `src/server/host/global-consent.ts` (research.md § 4).

---

## Phase 3: User Story 1 - See Antigravity CLI as a Reader of Repository Files (Priority: P1) 🎯 MVP

**Goal**: The repository inventory names Antigravity CLI as a reader of the files it reads, and lists the files only it reads.

**Independent Test**: Inspect a fixture repository holding one file at every admitted repository location; every one is listed with Antigravity CLI among its readers, the root `GEMINI.md` is listed once with two recognitions, and no excluded neighbour is listed or read.

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T020 [P] [US1] Add the repository fixture builders — a skills tree holding both shapes under `.agents/` and the directory shape under `.agent/`, a rules tree holding one file per documented activation mode under both spellings, a standalone `.agents/hooks.json`, an agents tree holding both shapes, an MCP tree with a local and a remote server plus a legacy key, and a context tree with the root pair and a nested near miss — with their near-miss paths, `.agent/skills/<name>.md` and `.agents/plugins/` among them, in `tests/fixtures/repositories/build-fixtures.ts`.
- [X] T021 [P] [US1] Add unit tests per compiled unit and one rejected near miss per selector family — a nested `.agents/`, a second level below `.agents/skills/`, a rules file two levels deep, `.agent/skills/<name>.md`, `.agents/plugins/<name>/plugin.json`, an agent two levels deep, a wrong-case leaf, a `.gemini/` path — in `tests/unit/inspection/antigravity-metadata.test.ts` and `tests/unit/inspection/rules.test.ts`.
- [X] T022 [P] [US1] Add unit tests for the file-shaped skill unit, the recognizer's discrimination between the two skill shapes, and the vendor's own invocation-name answer — an absent `name` on a skill folder's `SKILL.md` resolves to the folder for this tool exactly as it does for the products beside it, so one file stays one row, while an absent `name` on a flat file resolves to the file's own name without its extension, the only fallback that shape has — in `tests/unit/inspection/antigravity-metadata.test.ts` (contracts/vendors/antigravity-cli.md § Known uncertainties item 7).
- [X] T023 [US1] Add an integration scan over the repository fixtures asserting the listed set, the root `GEMINI.md` with two recognitions, the root `AGENTS.md` with three, a nested context file with none of this tool's, and no read request for any near miss, in `tests/integration/repository-scan.test.ts`.
- [X] T024 [P] [US1] Extend the repository zero-activation suite over fixtures holding MCP declarations and skill-referenced scripts: zero executions, zero MCP connections, zero outbound requests, zero mutations, in `tests/integration/security/zero-activation.test.ts`.

### Implementation for User Story 1

- [X] T025 [US1] Wire the root context pair to the shared Markdown instruction unit in `src/server/inspection/rules/instructions/antigravity.ts`, admitting the repository root's `GEMINI.md` and `AGENTS.md` and nothing below it; correct the comment on `copilot.repo.instructions.gemini-root` in `src/shared/registries/copilot/rules.ts`, which now rests on a derived rule this release removes, so it names the static rule that gives the row its second reader.
- [X] T026 [US1] Add the file-shaped skill compiled unit — the row unit is the file, the name is the frontmatter `name` or the file's own name without its extension, and no companion census is published — in `src/server/inspection/rules/skills/file-skill.ts`, as its own unit beside the directory-shaped one (research.md § 2).
- [X] T027 [US1] Make the skill recognizer discriminate the two shapes as a closed union in `src/server/inspection/recognizers/candidate.ts`, narrowing by the discriminant rather than by a hand-authored predicate.
- [X] T028 [P] [US1] Wire both custom-agent shapes to the shared Markdown agent unit in `src/server/inspection/rules/agents/antigravity.ts`.
- [X] T029 [US1] Add the standalone MCP carrier unit reading the top-level `mcpServers` object through the shared server-map reading, showing `serverUrl` and any legacy key as written, in `src/server/inspection/rules/mcp/antigravity.ts`.
- [X] T030 [US1] Publish a file-shaped skill definition with no companion files, so the row draws no supporting-file count, in `src/app/components/inventory/rows/skill-row-files.ts` and `SkillRow.vue`.
- [X] T031 [US1] Render a file-shaped skill's detail as the skill panel alone — no file panel, no tab strip — in `src/app/pages/skills/detail/[source]/[...path].vue`, and name the skill's own path in the heading comment without changing what that comment already establishes.
- [X] T032 [P] [US1] Add the `antigravity-*` rows to the fixture launcher in `scripts/serve-fixture.ts` so a contributor can see each surface.
- [X] T033 [P] [US1] Add `tests/e2e/antigravity-skills-detail.spec.ts` covering both skill shapes in one `.agents/skills/` and the file shape's panel-only detail.
- [X] T034 [P] [US1] Add `tests/e2e/antigravity-mcp-detail.spec.ts`, `tests/e2e/antigravity-custom-agents-detail.spec.ts`, and `tests/e2e/antigravity-instructions-detail.spec.ts`.
- [X] T035 [P] [US1] Re-read every count of tools or products in inventory and comparison copy and comments — `src/app/components/inspection/declaration-order.ts`, `src/server/inspection/rules/mcp/server-map.ts`, `src/server/inspection/rules/agents/declared-name.ts`, `src/app/composables/custom-agent-comparison.ts` — so each names the four this release supports.
- [X] T036 [US1] Give a hook declaration the name its carrier wrote, so the detail's sections are identified by `(event, declared name)`: this vendor's carrier is a map of named hooks each holding its own events, so one carrier can declare an event twice and the two sections would be headed alike over near-identical documents. Add the field to `HookEventDeclarationDto` in `src/shared/api-types.ts` as its own nested record — a declaration may be named, and three of the four formats never name one — state it in `specs/001-inspect-agent-customizations/contracts/http-api.md` and `.ja.md`, and publish a named hook's own `enabled` key inside it as the file's own key, never rendered as "disabled" or "inactive": whether a hook runs is runtime this product does not observe (contracts/vendors/antigravity-cli.md § Known uncertainties item 9). The inventory row is untouched: its lines are grouped by carrier, so a carrier declaring one event twice is already one line. The row unit stays one declared event and no detail gains a level. Then add the repository hook compiled unit reading `.agents/hooks.json` through the shared hook event-map reading, in `src/server/inspection/rules/hooks/antigravity.ts`, and assert in `tests/unit/inspection/antigravity-metadata.test.ts` that one carrier declaring one event under two names publishes two declarations that carry their own names (research.md § 5a).
- [X] T037 [US1] Publish the workspace rules directory as `rule` rows through the vendor catalog — `rule` needs no specialized unit, so the catalog's own entry answers for it — admitting the direct children of `.agents/rules/` and `.agent/rules/` and showing the declared activation as written, in `src/server/inspection/rules/antigravity.ts` and `tests/unit/inspection/antigravity-metadata.test.ts` (research.md § 7a).
- [X] T038 [P] [US1] Add `tests/e2e/antigravity-rules-detail.spec.ts` and `tests/e2e/antigravity-hooks-detail.spec.ts` covering a rules file's activation frontmatter and the repository hooks carrier's declarations.

---

## Phase 4: User Story 2 - Inspect the Antigravity CLI Home After Consent (Priority: P2)

**Goal**: After one consent, the home's admitted files are listed and the state beside them is not.

**Independent Test**: Build a home holding one file at every admitted location and one at every excluded neighbour, consent once, and confirm the admitted files are listed and no excluded path is enumerated, opened, or read.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T039 [P] [US2] Replace the fourth home's rows in `tests/fixtures/global-homes/build-fixtures.ts` — dropping its environment-variable entry, which no property backs any more, and with it the member-id and root expectations in `tests/contract/http-api-global.test.ts` that read the fixture — — `GEMINI.md`, `config/mcp_config.json`, `config/hooks.json`, `config/agents/`, a skill folder under each of `antigravity-cli/skills/` and `config/skills/`, a flat file under `antigravity-cli/skills/`, `antigravity-cli/settings.json`, and the excluded plugin copies, import manifest, credentials, and session state — and update `tests/fixtures/global-homes/README.md` and `README.ja.md` to the three environment properties.
- [X] T040 [P] [US2] Add unit tests per Global compiled unit and one rejected near miss per selector family, in `tests/unit/inspection/antigravity-metadata.test.ts`.
- [X] T041 [US2] Extend the Global boundary gate with the member's per-member scan case — every admitted candidate path listed, every near miss never enumerated, opened, or read — and the five-member transaction tuple, in `tests/integration/global-boundaries.test.ts`.
- [X] T042 [P] [US2] Extend the Global zero-activation suite over a home holding hook declarations, permission rules, and MCP declarations, in `tests/security/global-zero-activation.test.ts`.

### Implementation for User Story 2

- [X] T043 [US2] Wire the Global context, MCP, agent, and skill rules to their compiled units in `src/server/inspection/rules/**/antigravity.ts`, with the skill rule reaching the file-shaped unit.
- [X] T044 [US2] Admit the home settings carrier as the settings and configuration row whose subject is the file, in `src/server/inspection/rules/settings/antigravity.ts`.
- [X] T045 [P] [US2] Publish the carrier's `allow`, `ask`, and `deny` entries as the permissions row, each shown as written and none evaluated, in `src/server/inspection/rules/permissions/antigravity.ts`.
- [X] T046 [P] [US2] Publish the settings carrier's inline hook declarations through the unit T036 added, so the standalone carriers and the inline one share one reading, in `src/server/inspection/rules/hooks/antigravity.ts`.
- [X] T047 [US2] Record the two excluded groups with the reason for each in `src/shared/registries/antigravity/rules.ts`, and confirm no traversal step reaches below `antigravity-cli/plugins/`.
- [X] T048 [P] [US2] Update the consent preview and source-control copy so five entries read with the fourth labelled `Antigravity home` and its root beside it, in `src/app/components/consent/GlobalConsentPreview.vue`, `GlobalSourceControls.vue`, and `src/app/components/inventory/SourceHomeBadge.vue`.
- [X] T049 [P] [US2] Add `tests/e2e/global-antigravity-admission.spec.ts` covering the five-member preview and the member's admitted set after consent.
- [X] T050 [P] [US2] Add `tests/e2e/antigravity-settings-detail.spec.ts` covering the one carrier reaching the settings, permissions, and hook surfaces without a duplicate row.
- [X] T051 [US2] Admit the user tier's standalone `config/hooks.json` through the unit the repository carrier already uses, and assert that it and the settings carrier's inline declarations reach the hooks inventory as two carriers rather than one, in `src/server/inspection/rules/hooks/antigravity.ts` and `tests/unit/inspection/antigravity-metadata.test.ts`. Then compose the rule catalog every unit of this vendor feeds — the Repository and Global lists derived from the shipped registry by boundary — in `src/server/inspection/rules/antigravity.ts`, and wire it into `src/server/inspection/scan.ts` and `src/server/host/devframe-app.ts`, which carry a stated placeholder until this task (T014).

---

## Phase 5: User Story 3 - Tell One Skill Shape From the Other (Priority: P3)

**Goal**: A reader looking at `.agents/skills/` sees which of their skills each product picks up, including a name spelled in both shapes.

**Independent Test**: Inspect a repository whose `.agents/skills/` holds both shapes, including one name in both, and confirm each row states the products that resolve it with no precedence between the shapes.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T052 [P] [US3] Extend the skills fixture with one name spelled in both shapes and one spelled in only one, in `tests/fixtures/repositories/build-fixtures.ts`.
- [X] T053 [P] [US3] Assert that a name spelled in both shapes is one row carrying both definitions with each product's resolution stated and no precedence, in `tests/integration/repository-scan.test.ts` and `tests/unit/shared/skill-collision.test.ts`.
- [X] T054 [P] [US3] Assert that a file-shaped skill's row draws no supporting-file count, in `tests/unit/app/skill-row-files.test.ts` beside the existing skill surface tests. The rendered detail's own half — the skill panel alone, with no file panel and no tab strip — belongs to T033's end-to-end spec, because the unit project compiles no single-file component.

### Implementation for User Story 3

- [X] T055 [US3] Group both shapes under one invocation name with one definition per file per recognizing product, in `src/server/session/session.ts` and the skill grouping it calls.
- [X] T056 [US3] Derive the same-name statement from the strategies the skill rules name, so no per-product table exists to drift, in `src/shared/registries/antigravity/skill-collision.ts`.
- [X] T057 [P] [US3] Extend `tests/e2e/skills-comparison.spec.ts` and `tests/e2e/skill-metadata-comparison.spec.ts` for a row whose definitions span the two shapes.
- [X] T058 [P] [US3] Record that the row's definition list gains no copy naming a shape, in `src/app/components/inventory/rows/skill-row-files.ts` — nothing is added there. The contrast the copy was to state does not exist: this vendor reads both shapes, so the only per-product difference is that Copilot and Codex do not read the flat one, which the absence of their marks on the flat file's line already states. A sentence saying this vendor reads the flat shape would restate the mark or, read as an exclusion, be false. A note appearing only on rows this vendor reaches would also give meaning to its absence everywhere else.

---

## Phase 6: Polish, Release Evidence, and Removal

**Purpose**: The gates and records that span the stories, and the parity review.

- [X] T059 [P] Add the Antigravity CLI sections of `docs/which-files-are-listed.md` and `.ja.md` under the repository and the personal setup, in prose naming every literal segment the shipped rules admit — `.agent`, `rules`, `hooks.json`, and `SKILL.md` among them — and correct the shared agent home's "Read by" column.
- [X] T060 [P] Name the four tools this release supports wherever `README.md` and `README.ja.md` name the set, and retake `docs/images/inventory.png` and `comparison.png`, both of which show a legend this change moves.
- [X] T061 [P] Update the first-use study inputs to name the tools this release supports, drop the environment property FR-008 removes, and set the designated file's recognizing tools to the three that read the repository root `AGENTS.md`, in `tests/usability/sc001-sc006-study-inputs/`.
- [X] T062 Run the parent specification's twenty agent-driven sessions against the updated inputs and record the run, its date, and its outcome in `specs/001-inspect-agent-customizations/validation.md` and `.ja.md` (spec.md § QR-003).
- [X] T063 Advance the outcome manifest to the next version with one case per `(tool, customization file type, admitted source form)` this tool contributes, recompute every affected fixture digest and the canonical digest, in `tests/fixtures/outcomes/manifest.json` and `manifest.sha256`; `tests/contract/outcome-fixture-manifest.test.ts` fails on the missing `(tool, kind)` cases until this lands.
- [X] T064 Record in `specs/001-inspect-agent-customizations/validation.md` and `.ja.md` the manifest version transition with its denominator, the executed Antigravity CLI case IDs, and the official-source run.
- [X] T065 Freeze this feature's task and phase counts for `specs/003-antigravity-cli-support/tasks.md` and `tasks.ja.md`, spelling the literals in `tests/documentation/cross-artifact.test.ts` and watching it fail first.
- [X] T067 Search the shipped tree, its documents, and its gates for a supported-tool identifier, label, mark, contract, or frozen count of the product this release does not support, and record the result; the file name `GEMINI.md` and the directory `~/.gemini` are not such occurrences, because both are what this tool itself reads (spec.md § SC-006).
- [X] T068 [P] Amend the parent specification's tool list, supported-file table, FR-018 exclusions, and FR-045 shared-home readers to the four tools this release supports, in `specs/001-inspect-agent-customizations/spec.md` and `spec.ja.md`.
- [X] T069 [P] Amend the parent data model's member entities and the session API contract's consent preview to the member id and label this release ships, in `specs/001-inspect-agent-customizations/data-model.md`, `data-model.ja.md`, `contracts/http-api.md`, and `http-api.ja.md`.
- [X] T070 [P] Amend the parent quickstart's environment-capture and consent-view steps to the three properties and the four tools, in `specs/001-inspect-agent-customizations/quickstart.md` and `quickstart.ja.md`.
- [X] T071 Run the `package.json` gate scripts — `pnpm run test:docs`, `test:unit`, `test:contract`, `test:integration`, `test:security`, and `test:package` — and the end-to-end specs of T033, T034, T049, T050, and T057 on Chromium.
- [X] T072 Run `pnpm run format`, `pnpm run lint`, and `pnpm run typecheck`; review every new module's header comment, every closed-union member's doc comment, and every defensive branch's named caller against AGENTS.md § Code commenting policy.
- [X] T073 Run `pnpm run check:official-sources -- --network`; confirm every `google.antigravity.*` record resolves on its official host, and record the run in `specs/001-inspect-agent-customizations/validation.md` and `.ja.md`.
- [X] T074 Compare every English/Japanese pair this feature touched — the parent spec, data-model, http-api, quickstart, validation, official-sources, runtime-composition, the moved vendor contract, `docs/which-files-are-listed`, the readme, the study inputs, and this feature's own artifacts — for omissions, stale statements, and inconsistent technical details.
- [X] T075 Launch the fixture host with `--no-open --port 0` and look at the four vendor marks together at the size a row draws them, confirming the new one sits at the same optical weight as the three beside it; stop the host by its recorded process ID (quickstart.md § See it in a fixture repository).

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no prerequisite and blocks nothing but the citations of T002.
- Phase 2 blocks every story: the closed union, the registry, and the frozen contracts are what the stories compile against.
- Phase 3 (US1) depends on Phase 2 alone and is the MVP.
- Phase 4 (US2) depends on Phase 2 and reuses the compiled units of Phase 3; it does not depend on US1's surfaces.
- Phase 5 (US3) depends on Phase 3's skill units.
- Phase 6 depends on every story, except T059, T060, T068–T070, which need only Phase 2's vocabulary.

### Parallel Opportunities

- T003–T005 run together; so do T007, T008, T010, T012, T018.
- T020–T022 and T024 run together once Phase 2 is complete; T023 follows T020.
- T028, T032–T035 run together once their units exist; T038 follows T036 and T037.
- T039, T040, T042 run together; T045, T046, T048–T050 run together after T044, and T051 follows T036.
- T052–T054 run together; T057 and T058 run together after T055.
- T059–T061 and T068–T070 run together at any point after Phase 2.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

Phases 1, 2, and 3 deliver the repository inventory naming the fourth tool, which is what a reader opens the product for and what needs no consent. Stopping there leaves a coherent product: the personal setup still proposes five members and the fourth simply lists nothing until Phase 4.

### Incremental Delivery

Each story phase ends at a state the independent test above can measure. Phase 6 is deliberately last: its counts, digests, and manifest cases can only move once the gates that read them have the whole shipped set to read.

---

## Notes

- A frozen count, digest, tuple, or version literal changes only after its gate has been watched failing against the new source.
- Every host an agent starts takes `--no-open --port 0` and is stopped before the turn ends.
- End-to-end runs name their specs and use `--project=chromium`; the whole browser suite is not run for this feature.

---

## Phase 7: Convergence

**Purpose**: What the tree still owes this feature's specification and plan, found by `/speckit-converge` on 2026-09-11 and appended here for `/speckit-implement` to close. No existing task changes.

- [X] T076 Amend the parent specification's remaining statements written for three tools and four Global members to four tools and five members, in both languages, in `specs/001-inspect-agent-customizations/spec.md` and `spec.ja.md`: the User Story 1 narrative that names GitHub Copilot, Claude Code, and OpenAI Codex alone; that story's acceptance scenario 1, whose Japanese still reads 「3ツールすべて」 where the English reads "all four tools"; and the Clarifications answers that still count four — "zero to four Global Sources" (Session 2026-07-17), "all four frozen preview entries" (Session 2026-07-20), and "four consented member roots — the Copilot, Claude, and Codex tool homes and the shared agent home" (Session 2026-08-27) — each restated with a dated amendment note, as the amended answers in that section already are, per FR-001 (partial).
- [X] T077 Run `pnpm run check:official-sources -- --network` over the registry as it now stands — 63 records, eleven of them `google.antigravity.*` — and record the run in `specs/001-inspect-agent-customizations/validation.md` and `validation.ja.md`: the run recorded there is the 2026-09-10 one over 62 records and ten Google records, and no recorded run follows the eleventh, `google.antigravity.subagents`, reviewed on 2026-09-11 in `contracts/official-sources.md`, per SC-007 (partial).
- [X] T078 [P] Amend the parent plan and contracts that still count three tools, four members, or three vendor marks, in both languages: `specs/001-inspect-agent-customizations/plan.md` and `plan.ja.md` — the Summary's three tools, "separate Copilot, Claude, and Codex contracts", "zero to four admitted member Global sources … (at most one each for Copilot, Claude, and Codex)", "the four members' frozen rule catalogs", "never a logical Source combining Copilot, Claude, and Codex", and the failure table's "all four members initially"; `contracts/runtime-composition.md` and `runtime-composition.ja.md` — the User row's "zero to four member Global Sources" and "all four frozen member entries"; `contracts/accessibility-acceptance.md` and `accessibility-acceptance.ja.md` — "the three vendor marks" under forced colours, now four; and `quickstart.md` and `quickstart.ja.md`, whose Antigravity CLI home step names `config/agents/*.md` alone where FR-009 admits `config/agents/<name>/agent.md` beside it, per FR-001 (partial).
- [X] T079 Settle FR-001's list against the two surfaces on it that name no product: the `--inspect-personal-setup` description in `src/server/cli.ts`, which names the kinds it reads and the shared `~/.agents` directory and no tool, and the inventory empty state in `src/app/components/inventory/InventoryList.vue`, whose header records why it names no vendor. Either name the four supported tools on each, or amend FR-001 in `specs/003-antigravity-cli-support/spec.md` and `spec.ja.md` to drop the two from the surfaces that name the tools, since a surface naming none cannot name four, per FR-001 (partial).
- [X] T080 [P] Name Antigravity CLI among the readers of the committed `.agents/skills/speckit-*` directories in the contributor section of `README.md` and `README.ja.md`, which names Codex and Copilot alone while the shipped `antigravity.repo.skill.directory` rule makes Antigravity CLI a third reader of every `SKILL.md` there, per FR-001 (partial).
- [X] T081 [P] Correct the three comments this feature left stale — `src/shared/registries/skill-resolution.ts`, which says no shipped product's skill strategies establish `unknown-order` alone, while Antigravity CLI's do and the decided answer is that the row states nothing (`tests/contract/inspection-rules.test.ts`); `src/shared/registries/antigravity/skill-collision.ts`, which says the row's same-name statement says the vendor documents no resolution, while the derivation yields `null` and no statement is rendered; and `src/server/inspection/parsers/json.ts`, which enumerates "every Antigravity CLI carrier" as the two `mcp_config.json` profiles and `settings.json`, omitting `.agents/hooks.json` and `config/hooks.json`, which `src/server/inspection/rules/hooks/antigravity.ts` reads through the same seam — per Constitution II (partial).
