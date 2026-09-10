# Tasks: Gemini CLI のサポート

[English](tasks.md)

**Input**: `/specs/002-gemini-cli-support/` の設計文書

**Prerequisites**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/vendors/gemini-cli.md`、`quickstart.md`

**Tests**: すべての behavioral change は実装の前に risk に応じた自動テストを要する。test task はそれが cover する実装に先立ち、凍結された count・digest・tuple・version literal は、その gate が新しい source に対して失敗するのを見た後にだけ変える (AGENTS.md § Implementation simplicity policy)。

**Organization**: task は user story ごとにまとめる。Phase 2 は compiler と contract gate が検査する閉じた語彙と registry で、すべての story が要する。Phase 3 はリポジトリ (US1)、Phase 4 は Gemini CLI home (US2)、Phase 5 は設定された context filename と同名 statement (US3)、Phase 6 は release evidence、gate、parity review。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 述べられた前提の後に並行実行できる。別のファイルを使い、未完了の他 task に依存しない。
- **[Story]**: Phase 3–5 で必須。Setup、Foundational、Polish では省く。
- すべての checklist 項目は1つの主要な outcome と、少なくとも1つの正確なリポジトリ相対ファイルパスを持つ。新しい test file はすべて、所有する task ID と検査対象の behavior を名指しする comment で始まる (AGENTS.md § Code commenting policy)。
- 「両言語」は canonical な `*.md` とその `*.ja.md` を同じ task で、の意味である。

## Normative Requirement Traceability

この機能の仕様のすべての FR・QR・SC について、主要な実装・検証・evidence の所有 task。範囲は両端を含む。要件や task の変更はこの matrix と英語版を同じ変更で更新する。

| Requirement | 所有する実装・検証・evidence の task |
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

**Purpose**: 後のすべての task が引用する2つの artifact — release entry と evidence registry の行。

- [ ] T001 4つ目のサポート対象ツールについての `minor` の changeset entry を `pnpm exec changeset` で書く。ユーザー向けの一文。`.changeset/support-gemini-cli.md` (research.md § 移行影響)。
- [ ] T002 Google の host 行 (`geminicli.com`) を official-host 表に、13行の `google.gemini-cli.*` — canonical URL、host、正確な rendered section heading、`reviewedOn: 2026-09-09` — を持つ `## Google official sources` section を、`specs/001-inspect-agent-customizations/contracts/official-sources.md` と `official-sources.ja.md` に加える (research.md § 8; contracts/vendors/gemini-cli.md の evidence 列)。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 閉じた語彙、vendor registry、凍結された contract。すべての story はこれらに対して compile し、これらが完了するまで contract gate は失敗する。

**⚠️ CRITICAL**: この phase が完了するまで user story の作業は始められない

### Tests for Phase 2

- [ ] T003 [P] tool 語彙の test を、`gemini` がメンバーであり order gate が4ツールを cover するように広げ、`'gemini'` を reject する assertion を置き換える。`tests/unit/shared/entities.test.ts`。`gemini` の label と mark の期待を `tests/unit/shared/display-text.test.ts` と `tests/unit/shared/skill-collision.test.ts` に加える。
- [ ] T004 [P] 凍結された registry の count と ID 一覧を Gemini 後の値に更新する — rule・behavior・strategy の合計、sort 済み Global rule-ID 一覧、vendor ごとの repository count — `tests/contract/inspection-rules.test.ts`、`tests/contract/vendor-behaviors.test.ts`、`tests/contract/runtime-composition.test.ts`。各 test の comment に、T005–T013 の前に3 vendor の registry に対して失敗したことを記録する (AGENTS.md § Implementation simplicity policy)。

### Implementation for Phase 2

- [ ] T005 `SupportedTool` に `'gemini'` を加え、`SUPPORTED_TOOL_ORDER` の `codex` の後に追加し、`SUPPORTED_TOOL_TEXT` に `gemini: 'Gemini CLI'` をメンバー doc comment と共に加える。`src/shared/entities.ts` (spec.md § Clarifications; data-model.md § SupportedTool)。
- [ ] T006 [P] `GeminiBehaviorId`、`GeminiRuleId`、`GeminiStrategyId`、`GoogleSourceId` をメンバーごとの doc comment を持つ閉じた string-literal union として宣言し、それぞれを `BehaviorId`、`RuleId`、`StrategyId`、`SourceId` に join する。`src/shared/registries/identifier-types.ts` (data-model.md § Vendor registry record)。
- [ ] T007 [P] `VendorSurface` に `gemini-cli` メンバーを `src/shared/registries/behavior-types.ts` で加え、その `Gemini CLI` label と Codex surface の後の order 位置を `src/shared/registries/behavior-text.ts` で加える。
- [ ] T008 22の vendor behavior record を、`evidence` citation、surface `gemini-cli`、contract の assessment index に従う record ごとの `documentationStatus`/`lifecycleQualifiers` と共に書く。`src/shared/registries/gemini/behaviors.ts` (contracts/vendors/gemini-cli.md § Documented Repository behavior、§ Documented User behavior)。
- [ ] T009 [P] 8つの runtime-composition strategy を、文書化された pipeline 順の operation と evidence と共に書く。`src/shared/registries/gemini/strategies.ts` (data-model.md § Vendor registry record の strategy 表)。
- [ ] T010 20の Inspector rule — inline の typed matcher を持つ6つの静的 repository rule、`matcher: null` の派生 context-filename record、`member: 'gemini'` と `member: 'agents'` の下の9つの Global rule、それぞれ理由を述べる4つの excluded group — を `src/shared/registries/gemini/rules.ts` に書く。すべての matcher は inline に綴り、すべての record の `policyRefs`/`evidence` は `SHIPS_MAINTENANCE_DATA` の三項で包む (contracts/vendors/gemini-cli.md § Inspector Repository rules、§ Derived Repository rules、§ Inspector Global rule、§ Relationship-only and excluded groups)。
- [ ] T011 [P] 各 rule をその behavior と strategy に結ぶ `GEMINI_RULE_RELATIONS` と `GEMINI_STRATEGY_RELATIONS` を `src/shared/registries/gemini/relations.ts` に書き、Gemini の system-settings behavior を shared の managed-remote-state 除外の `basedOnBehaviors` に `src/shared/registries/shared/relations.ts` で加え、そこと `src/shared/registries/shared/rules.ts` の「3 vendor」の散文を書き直す。
- [ ] T012 [P] `GeminiSkillCollisionPolicy` — 1つの Source 内の1名前の2定義は clash ではなく文書化された alias 優先の選択 — を `src/shared/registries/gemini/skill-collision.ts` に実装する。`gemini` entry を `src/shared/skill-collision.ts` の `SKILL_COLLISION_POLICY` と `src/shared/registries/skill-resolution.ts` の `SAME_NAME_SKILL_RESOLUTIONS` に加える (research.md § 7)。
- [ ] T013 Gemini の catalog を `INSPECTION_RULES`、`VENDOR_BEHAVIOR_STATEMENTS`、`RUNTIME_COMPOSITION_STRATEGIES`、`RULE_RELATIONS`、`STRATEGY_RELATIONS` に spread し、re-export 一覧を広げる。`src/shared/registries/inspection-rules.ts`、`vendor-behaviors.ts`、`runtime-composition.ts`、`relations.ts`。
- [ ] T014 [P] `~icons/simple-icons/googlegemini` を import し、`gemini` の glyph entry と `.aci-tool-mark--gemini` ルールを加え、component comment の「3」の数を書き直す。`src/app/components/ToolMark.vue`。`--aci-brand-gemini` の `light-dark()` token 対と forced-colors の `CanvasText` 行を `src/app/styles/main.css` に加える (AGENTS.md § Icon policy)。
- [ ] T015 [P] `GLOBAL_MEMBER_TEXT` に `gemini: 'Gemini CLI home'` を、`SOURCE_SELECTOR_TEXT` に `'global-gemini'` を加え、`GLOBAL_MEMBER_ORDER` の「3ツール」comment を書き直す。`src/shared/api-text.ts`。`GlobalPreviewEntryDto`、`GlobalConsentPreviewDto.entries`、`GlobalMemberId` の「4行」「3つの tool home」の doc comment を `src/shared/api-types.ts` で書き直す。
- [ ] T016 `lifecycleOwnerRank` の hard-coded な `global:<tool>` rank ladder を `GLOBAL_MEMBER_ORDER` から読む rank に置き換え、`published-source:` と fallback rank は保ち、order を言い直さず読む理由を comment に述べる。`src/shared/diagnostics.ts` (research.md § 4)。
- [ ] T017 `specs/002-gemini-cli-support/contracts/vendors/gemini-cli.md` と `gemini-cli.ja.md` を変更せず `specs/001-inspect-agent-customizations/contracts/vendors/` へ移し、新しい親に向けて相対リンクを書き直し、両 presentation-allowlist の SHA-256 digest を持つ Gemini CLI 行を `contracts/official-sources.md` と `.ja.md` の implementation-gate 表と `tests/contract/presentation-allowlist-freeze.test.ts` の `RECORDED_DIGESTS` に加え、8行を持つ `## Gemini CLI strategies` section を `contracts/runtime-composition.md` と `.ja.md` に加える (plan.md § Project Structure)。
- [ ] T018 `tests/fixtures/conformance/serialize` 下の serializer で materialized registry を再生成し、`tests/fixtures/conformance/inspection-rules.json`、`vendor-behaviors.json`、`runtime-composition.json`、`relations.json` が Gemini の record を持つようにし、T004 の gate が pass することを確認する。

**Checkpoint**: registry は compile し、すべての `Record<SupportedTool, …>` は `gemini` entry を持ち、contract suite は4 vendor に対して pass する。

---

## Phase 3: User Story 1 - リポジトリのファイルの読者として Gemini CLI を見る (Priority: P1) 🎯 MVP

**Goal**: すべての Gemini CLI リポジトリの場所が Gemini CLI を読者として挙げられる。ルートの `GEMINI.md` は2 recognition、`.agents/skills/` は3を示す。tool filter、legend、empty state は4ツールを名指しする。

**Independent Test**: `gemini-*` fixture を serve し、spec.md User Story 1 の8シナリオの行・mark・detail を確認する。下の unit、integration、security、documentation、名指しした end-to-end の test を走らせる。

### Tests for User Story 1 (REQUIRED) ⚠️

- [ ] T019 [P] [US1] 各 compiled unit の答えを cover する `tests/unit/inspection/gemini-metadata.test.ts` を書く: 派生 instruction plan の任意の深さの既定 `GEMINI.md` とディレクトリを剥がさない applicability range。`name` またはディレクトリからの skill 名。agent の宣言名。MCP carrier の `mcpServers` 名ごとの1行。`hooks` が何を宣言していても存在する hook recognition。直接の子と入れ子の `git/commit.toml` の command 名。carrier の settings 行。そして file-confined な outcome — parse できない command TOML はパス由来の行名を保つ、parse できる `name` を持たない agent ファイルは行名を不明のままにする、absent・空・object でない `mcpServers` の値は MCP 行を出さない (spec.md FR-006、FR-008、FR-009)。
- [ ] T020 [P] [US1] Gemini の JSONC case — コメント付き `.gemini/settings.json` が parse される、trailing comma が blank される、同じ byte を Claude の `.mcp.json` として読むとなお失敗する — を `tests/unit/inspection/seed-parsers.test.ts` に、`.gemini/settings.json` の three-rules-one-read case を `tests/unit/inspection/rules.test.ts` に加える。
- [ ] T021 [P] [US1] Gemini CLI のリポジトリ tree — FR-002 のすべての場所に1ファイル、ルートの `GEMINI.md`、`packages/api/GEMINI.md`、`.agents/skills/` の skill、near miss (`packages/api/.gemini/settings.json`、`.gemini/policies/deny.toml`、`.geminiignore`、`.gemini/.env`、`.gemini/hooks/lint.sh`、ルートの `gemini-extension.json`) — を `tests/fixtures/repositories/build-fixtures.ts` に加え、admission、除外、2 recognition のルート `GEMINI.md`、3 recognition の skill を `tests/integration/repository-scan.test.ts` で assert する。
- [ ] T022 [P] [US1] hook の `command`、`!{...}` shell-block command、stdio と HTTP の `mcpServers` 宣言を持つ Gemini fixture を `tests/security/global-zero-activation.test.ts` の zero-activation suite に加え、child process、MCP 接続、outbound request、source 変更がないことを assert する。

### Implementation for User Story 1

- [ ] T023 [US1] `GeminiCompiledRule` (`tool: 'gemini'` を固定、`GEMINI_RULE_RELATIONS` を解決、他 vendor の rule で throw) と `GeminiCompiledDerivedRule` (名前ごとの `[ANY_DIRECTORIES, <name>]` の派生 plan builder) を `vendor/codex.ts` と同じ形で `src/server/inspection/rules/vendor/gemini.ts` に作る。
- [ ] T024 [US1] settings-carrier の unit — `server-map.ts` 上の `GeminiCompiledMcpCarrierRule` を `src/server/inspection/rules/mcp/gemini.ts` に、`event-map.ts` 上の `GeminiCompiledSettingsHookRule` を `src/server/inspection/rules/hooks/gemini.ts` に — 作る。それぞれ three-rules-one-read の配置と FR-009 を名指しする header comment を持つ。
- [ ] T025 [US1] `acceptsComments` に Gemini 分岐 — `(gemini, '.gemini/settings.json')` と `(gemini, 'settings.json')` で true — を、計測 comment (vendor の `settings.ts` はコメントを剥がす。reference は何も述べない。trailing comma は記録されたより穏当な誤り) と共に `src/server/inspection/parsers/json.ts` に加える (research.md § 6)。
- [ ] T026 [US1] `GeminiCompiledDerivedInstructionRule` と `readGeminiConfiguredContextPlans` — walk の前に seed の `.gemini/settings.json` を読み、何も設定されていないときは任意の深さの既定 `GEMINI.md` plan を出し、同じ読み取りから carrier の候補性を seed する — と Global の静的 instruction unit を `src/server/inspection/rules/instructions/gemini.ts` に作る (research.md § 2。設定名の分岐は T054)。
- [ ] T027 [US1] `GeminiCompiledSkillRule` — 宣言された `name`、ディレクトリ fallback — を `src/server/inspection/rules/skills/gemini.ts` に作る。
- [ ] T028 [US1] `GeminiCompiledAgentRule` を `declared-name.ts` 上の declared-name unit として `src/server/inspection/rules/agents/gemini.ts` に作る。
- [ ] T029 [US1] `commands/` 下のパスを `:` で結び `.toml` を落とす `GeminiCompiledCommandRule` を、`prompts-and-commands/claude.ts` の導出の形を共有して `src/server/inspection/rules/prompts-and-commands/gemini.ts` に作る。
- [ ] T030 [US1] `GeminiCompiledPolicyDocumentRule` を TOML 上の permissions document unit として `src/server/inspection/rules/permissions/gemini.ts` に作る (Phase 4 の Global member が使う。catalog module を完全にするためここで compile する)。
- [ ] T031 [US1] catalog module — `GEMINI_REPOSITORY_RULES`、`GEMINI_GLOBAL_RULES`、`GEMINI_AGENTS_HOME_RULES`、`settings/config` の other-kind unit、kind dispatch、`readGeminiConfiguredContextPlans` の re-export — を `src/server/inspection/rules/gemini.ts` に作り、`codex.ts` と同様に各 catalog を出荷された registry から boundary で導出する。
- [ ] T032 [US1] `GEMINI_REPOSITORY_RULES` を `REPOSITORY_INSPECTION_RULES` に spread し、`readGeminiConfiguredContextPlans` を `REPOSITORY_CONFIGURATION_READERS` に加える。`src/server/inspection/scan.ts`。
- [ ] T033 [US1] `gemini-instructions`、`gemini-settings`、`gemini-commands`、`gemini-skills`、`gemini-agents` の fixture 行を `scripts/serve-fixture.ts` に加える。
- [ ] T034 [P] [US1] end-to-end spec — `tests/e2e/gemini-instructions-inventory.spec.ts`、`gemini-instructions-detail.spec.ts`、`gemini-settings-inventory.spec.ts`、`gemini-settings-detail.spec.ts`、`gemini-commands-inventory.spec.ts`、`gemini-commands-detail.spec.ts`、`gemini-skills-list.spec.ts`、`gemini-skills-detail.spec.ts`、`gemini-custom-agents-inventory.spec.ts`、`gemini-custom-agents-detail.spec.ts` — を `codex-*` の対の pattern に従って書き、`--project=chromium` で走らせる (AGENTS.md § Agent-run Playwright verification policy)。
- [ ] T035 [P] [US1] mark 集合の assertion を4ツールに広げ、ルート `GEMINI.md` の2 mark 行と `.agents/skills/` の3 mark 行を `tests/e2e/inventory-rows.spec.ts` に加える。そこで legend と tool-filter の assertion が `Gemini CLI` を名指しするように広げる。
- [ ] T036 [US1] `COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE` の comment から「この registry の他のプロダクトはこの filename を認識しないので、ルートの `GEMINI.md` は Copilot だけの行」の記述を削除し、今真である事実 — ルートのファイルは2プロダクトの recognition を持つ1つの candidate — を述べる。`src/shared/registries/copilot/rules.ts` (spec.md FR-013)。
- [ ] T037 [US1] `### Gemini CLI` のリポジトリ表 — instructions (任意のディレクトリの `GEMINI.md`、または `.gemini/settings.json` の `context.fileName` が宣言する名前群)、skills、agents、prompts and commands、MCP/hooks/settings — を `docs/which-files-are-listed.md` と `.ja.md` に加え、`GEMINI_INSPECTION_RULES` を `tests/documentation/cross-artifact.test.ts` の containment gate の catalog 配列に加える。
- [ ] T038 [P] [US1] `README.md` と `README.ja.md` のツール数をすべて — プロダクトを名指しする冒頭の文、「3ツール」「3か所」— 4に書き直し、他の3つが名指しされる例に Gemini CLI とその `.gemini/` ディレクトリを加える。

**Checkpoint**: User Story 1 は完了し、`gemini-*` fixture に対して独立に test できる。

---

## Phase 4: User Story 2 - Consent 後に Gemini CLI home を調査する (Priority: P2)

**Goal**: consent preview は5メンバーを名指しする。Gemini CLI の root は `.gemini` の join である。consent 後、メンバーは正確に FR-010 のファイルを publish する。shared agent home の skill は Gemini CLI の recognition を持つ。

**Independent Test**: Global home fixture に対して `GEMINI_CLI_HOME` を absent、eligible、present-empty、relative にして起動する。preview、admission、publish される集合、除外、disable を spec.md User Story 2 のとおり確認する。

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T039 [P] [US2] 記述子の導出 case — `settingNames: root` は eligible な値を保つ、`settingNames: parent` はそれを `.gemini` と join する、absent はどちらも home と join する、present-empty/relative/invalid は join の前に分類される — を `tests/unit/session/coordinator.test.ts` に、5メンバーの `confirmedTools` case を `tests/unit/app/session-view-state.test.ts` に加える。
- [ ] T040 [P] [US2] consent-preview の contract — `[copilot, claude, codex, gemini, agents]` 順の5 entry、新しい `allowlistVersion`/`traversalPlanVersion` literal — を `tests/contract/http-api-global.test.ts` で更新する。まず4メンバーの host に対して失敗するのを見る。
- [ ] T041 [P] [US2] `gemini` member — `.gemini` を append する環境 map の `GEMINI_CLI_HOME`、`.gemini` の既定 suffix、メンバーごとの secret と sentinel のファイル (`extensions/…`、`trustedFolders.json`、`.env`、OAuth credential file、session state) — を `tests/fixtures/global-homes/build-fixtures.ts` に加える。`tests/integration/global-boundaries.test.ts` の5メンバー tuple と admission/除外の assertion、`tests/security/global-zero-activation.test.ts` の `MEMBERS` を広げる。
- [ ] T042 [P] [US2] `global-codex-admission.spec.ts` に従って `tests/e2e/global-gemini-admission.spec.ts` を書き、`tests/e2e/global-consent-preview.spec.ts` を、Gemini CLI entry の表示 root と3つの読者を名指しする shared-home の文を持つ5つの列挙ディレクトリに広げる。

### Implementation for User Story 2

- [ ] T043 [US2] `GLOBAL_TOOL_HOME_ORDER` に `gemini` を加え、記述子の `defaultSuffix` field を `suffix` に改名し — 設定が親を指すツールでは既定時だけでなく設定が eligible なときにも結合されるため — ツールごとの記述子に閉じた `settingNames: 'root' | 'parent'` field を `gemini: { variable: 'GEMINI_CLI_HOME', suffix: '.gemini', settingNames: 'parent' }` と既存3 entry の `root` として加え、capture でそれを適用し (分類、次に `parent` では join)、`PRODUCTION_GLOBAL_MEMBER_PORTS` に `gemini` port を加え、両 version literal を変更の日付に進める。`src/server/host/global-consent.ts` (research.md § 3; data-model.md § GlobalRootInputCapture)。
- [ ] T044 [US2] `GLOBAL_RULES_BY_MEMBER` に `gemini: GEMINI_GLOBAL_RULES` を加え、その `agents` entry に `GEMINI_AGENTS_HOME_RULES` を spread する。`src/server/host/devframe-app.ts`。
- [ ] T045 [US2] consent preview の copy を4ディレクトリから5に、shared-agent-home の文を Codex・Copilot・Gemini CLI を名指しするように書き直す。`src/app/components/consent/GlobalConsentPreview.vue`。「4行」「4回」の comment を `src/app/components/consent/GlobalSourceControls.vue`、`src/app/components/inventory/SourceHomeBadge.vue`、`src/app/components/source-name.ts`、`src/app/components/detail-route.ts` で、option 説明のメンバー数を `src/server/cli.ts` で書き直す。
- [ ] T046 [US2] `### Your Gemini CLI home` の表 (`GEMINI_CLI_HOME`、または `~/.gemini`。join を一文で述べる) を personal setup の下に加え、shared agent home の skills の「読むもの」cell に Gemini CLI を加える。`docs/which-files-are-listed.md` と `.ja.md`。同じ section の「3つではなく4つ」を5に書き直す。
- [ ] T047 [P] [US2] personal-setup の数とディレクトリ一覧 — 「4つの personal directory」、`~/.claude`、`~/.codex`、`~/.copilot` の例とその環境変数 — を `~/.gemini` と `GEMINI_CLI_HOME` を含むように `README.md` と `README.ja.md` で書き直す。
- [ ] T048 [US2] 親仕様を両言語で改訂する — FR-013 (5メンバー。`CODEX_HOME` の後に `GEMINI_CLI_HOME` を読む。`.gemini` suffix と親ディレクトリの join)、FR-014 (0から5の Source)、FR-018 (vendor 一覧に Gemini CLI の managed・runtime state)、User Story 4 (5つの member root)、Inspection Session と Source の entity、Global scope の Assumption — そして5つ目のメンバーが加わったこととその理由を記録する日付付き `### Session` entry を `## Clarifications` に加える。`specs/001-inspect-agent-customizations/spec.md` と `spec.ja.md`。同所の Supported Initial Release Customization Files 表に Gemini CLI の行 — この機能の FR-002 と FR-010 が定める admit 集合を1行に要約したもの — を、親の FR-004 のツール一覧に Gemini CLI を加える (research.md § 10)。
- [ ] T049 [US2] `GlobalRootInputCapture` (4つの property。`settingNames` field と導出表)、`GlobalConsentPreview` (`entries` は正確に5。member enum)、`Global lexical state` を `specs/001-inspect-agent-customizations/data-model.md` と `.ja.md` で、consent-preview のメンバー数を `contracts/http-api.md` と `.ja.md` で改訂する。
- [ ] T050 [US2] Gemini CLI home の admit される行と5メンバーの preview を、4メンバーを列挙する箇所で `specs/001-inspect-agent-customizations/quickstart.md` と `.ja.md` に加える。

**Checkpoint**: User Story 1 と 2 は完了。Gemini CLI home は5つ目の consent 済みメンバーである。

---

## Phase 5: User Story 3 - リポジトリが Gemini CLI に使わせる名前を読む (Priority: P3)

**Goal**: リポジトリの `context.fileName` は `GEMINI.md` を宣言された名前に置き換える。使えない値は何も設定しない。同名の2つの Gemini skill は文書化された alias 優先の解決を述べる。

**Independent Test**: `gemini-context-filename` fixture (absent、文字列、配列、不正) と同名 skill fixture を serve し、User Story 3 の4シナリオを確認する。

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T051 [P] [US3] 値の文法 case を `tests/unit/inspection/gemini-metadata.test.ts` に加える — 文字列はその名前を出す。配列は各名前を出す。空文字列、空配列、非文字列メンバー、非文字列値、parse できない carrier はそれぞれ既定 `GEMINI.md` を出す。parse できない carrier だけが settings recognition を通じて diagnostic に届く。
- [ ] T052 [P] [US3] 設定名の fixture — ルートの `AGENTS.md`、入れ子の `AGENTS.md`、ルートの `GEMINI.md` を持つ `context.fileName: "AGENTS.md"`。`CONTEXT.md` を持つ配列。不正な値 — と同名 skill fixture (`.gemini/skills/deploy` と `.agents/skills/deploy`) を `tests/fixtures/repositories/build-fixtures.ts` に加え、名前が設定されたときルートの `GEMINI.md` が Copilot の recognition だけを保つこと、`deploy` 行が両定義を挙げることを `tests/integration/repository-scan.test.ts` で assert する。
- [ ] T053 [P] [US3] `gemini` の同名 statement と collision の case を `tests/unit/shared/skill-collision.test.ts` に、導出される resolution を `tests/unit/shared/entities.test.ts` に加える。

### Implementation for User Story 3

- [ ] T054 [US3] `readGeminiConfiguredContextPlans` の設定名分岐を実装する — 空でない文字列または空でない文字列の空でない配列を受け付け、名前ごとに1つの `[ANY_DIRECTORIES, <name>]` plan を既定の代わりに出し、それ以外の形はすべて何も設定しないと扱う — 導出が既定を所有する理由を述べる comment と共に。`src/server/inspection/rules/instructions/gemini.ts` (spec.md FR-004; research.md § 2)。
- [ ] T055 [US3] `gemini-context-filename` の fixture 行を `scripts/serve-fixture.ts` に加える。
- [ ] T056 [US3] `tests/e2e/gemini-context-filename.spec.ts` — 設定された `AGENTS.md` の行が Gemini CLI の mark を持ち、ルートの `GEMINI.md` は Copilot のものだけを持つ — と alias 優先 statement のための `tests/e2e/gemini-same-name-skill.spec.ts` を書き、`--project=chromium` で走らせる。
- [ ] T057 [US3] `tests/documentation/cross-artifact.test.ts` の派生ルール freeze を正確に `['codex.derived.fallback-basename', 'gemini.derived.context-filename']` に広げ、両方の `docs/which-files-are-listed*.md` ページが `GEMINI.md` と `context.fileName` を含むことを要求する。T037 の散文がそれを満たすことを確認する。
- [ ] T058 [US3] 設定された filename の挙動をユーザー向けの一文 — `.gemini/settings.json` が `context.fileName` に与える名前は `GEMINI.md` の代わりに読まれる — で `docs/which-files-are-listed.md` と `.ja.md` の Gemini CLI section に述べる。
- [ ] T059 [US3] `gemini` の導出された同名 statement のテキストが2定義の skill 行に render されることを確認し、期待を `tests/unit/app/inventory.test.ts` に加える。

**Checkpoint**: 3つの user story すべてが完了し、独立に test できる。

---

## Phase 6: Polish、Release Evidence、Parity

**Purpose**: story をまたぐ gate と記録。

- [ ] T060 [P] SC-001/SC-006 の study input を、3ツールを名指しする箇所で4ツールを名指しするように更新する — `tests/usability/sc001-sc006-study-inputs/guidance.md` と `.ja.md`、`prepared-state.json` と `.ja.json` — そして `ground-truth.json` と `.ja.json` の指定された `AGENTS.md` の ground truth が、prepared repository が `context.fileName` を設定しないため不変であることを確認する。
- [ ] T061 影響を受けるすべての fixture digest と canonical digest を再計算し、`manifestVersion` を4に進め、SC-003・SC-004・SC-005 の Gemini CLI 行を持つ新しい measurement set を `tests/fixtures/outcomes/manifest.json` と `manifest.sha256` に記録する。更新の前に `tests/contract/outcome-fixture-manifest.test.ts` が失敗するのを見る。
- [ ] T062 `specs/001-inspect-agent-customizations/validation.md` と `.ja.md` に記録する: manifest version 3 → 4 の transition とその reviewer reference、実行した Gemini CLI の case ID、そして SC-001/SC-006 について指定ファイルの ground truth が不変で再実施は不要だったこと (spec.md § Clarifications)。
- [ ] T063 この機能の `specs/002-gemini-cli-support/tasks.md` と `tasks.ja.md` の task 数と phase 数の freeze を、既存のものの隣に `tests/documentation/cross-artifact.test.ts` で加える。literal は test に綴る (AGENTS.md § Implementation simplicity policy)。
- [ ] T064 `package.json` の gate script — `pnpm run test:docs`、`pnpm run test:unit`、`pnpm run test:contract`、`pnpm run test:integration`、`pnpm run test:security`、`pnpm run test:package`、および T034・T035・T042・T056 の名指しした end-to-end spec を `--project=chromium` で走らせる。失敗したものを直す。
- [ ] T065 `pnpm run format`、`pnpm run lint`、`pnpm run typecheck` を走らせる。すべての新 module の header comment、すべての閉じた union メンバーの doc comment、すべての defensive branch の名指しされた caller を AGENTS.md § Code commenting policy に照らして review する。
- [ ] T066 `pnpm run check:official-sources -- --network` を走らせる。すべての `google.gemini-cli.*` record が解決することを確認し、実行を `specs/001-inspect-agent-customizations/validation.md` と `.ja.md` に記録する。
- [ ] T067 この機能が触れたすべての英語/日本語の対 — 親の spec、data-model、http-api、quickstart、validation、official-sources、runtime-composition、移動した vendor contract、`docs/which-files-are-listed`、readme、study input、この機能自身の artifact — を漏れと古い記述について比較し、`specs/002-gemini-cli-support/quickstart.md` を端から端まで歩き、起動したすべての host を止める。

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。
- **Foundational (Phase 2)**: まず T003–T004 (失敗するのを見なければならない)、次に phase の他のすべてに先立って T005 (すべての `Record` が key する union)。T017 は T008–T012 の後。T018 は最後。
- **User Story 1 (Phase 3)**: Phase 2 の後。T023 は T024–T031 の前。T031 は T032 の前。T032 は T033–T035 の前。T037 は T010 と T032 の後。
- **User Story 2 (Phase 4)**: Phase 2 の後。T044 が T031 の catalog を要する以外は Phase 3 から独立。T043 は T044–T045 の前。T048–T050 は T043 の後。
- **User Story 3 (Phase 5)**: Phase 3 の後 (T026 の reader と T037 の散文を広げる)。
- **Polish (Phase 6)**: すべての story の後。T061 はすべての fixture builder 変更 (T021、T041、T052) の後。T063 は freeze の中で最後。

### Parallel Opportunities

- Phase 2: T003 ∥ T004。T005 の後に T006 ∥ T007 ∥ T009 ∥ T011 ∥ T012 ∥ T014 ∥ T015。
- Phase 3: T019 ∥ T020 ∥ T021 ∥ T022。T032 の後に T034 ∥ T035 ∥ T038。
- Phase 4: T039 ∥ T040 ∥ T041 ∥ T042。T043 の後に T047 ∥ T046。
- Phase 5: T051 ∥ T052 ∥ T053。
- T031 が存在すれば Phase 3 と 4 は並行して進められる。

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 と Phase 2 — registry が compile し、contract suite が4 vendor に対して pass する。
2. Phase 3 — リポジトリの story。止まって `gemini-*` fixture に対して検証する。

### Incremental Delivery

3. Phase 4 — 5つ目のメンバー。各 lexical state の `GEMINI_CLI_HOME` で検証する。
4. Phase 5 — 設定名と同名 statement。
5. Phase 6 — evidence、gate、parity、quickstart の歩行。

---

## Notes

- すべての新 test file は所有する task ID と検査対象の behavior で始まる。
- freeze は gate が新しい source に対して失敗した後にだけ変える。その失敗が gate の存在を証明する。
- どの task もブラウザ suite 全体を走らせない。それぞれ変更が届く spec を名指しする。
- 起動するすべての host は `--no-open --port 0` を渡し、task の終了前に止める。
- 触れたすべての文書の両言語版は同じ task で変える。
