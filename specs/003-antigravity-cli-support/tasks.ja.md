# Tasks: Antigravity CLI のサポート

[English](tasks.md)

**入力**: `/specs/003-antigravity-cli-support/` の設計文書

**前提**: `plan.ja.md`、`spec.ja.md`、`research.ja.md`、`data-model.ja.md`、`contracts/vendors/antigravity-cli.ja.md`、`quickstart.ja.md`

**テスト**: すべての振る舞いの変更は、実装の前にリスクに応じた自動テストを要する。テストの task はそれが覆う実装に先行し、凍結された件数・digest・tuple・version literal は、その gate が新しい source に対して落ちるところを確認してからのみ変更する (AGENTS.md § Implementation simplicity policy)。

**構成**: task は user story ごとにまとめる。Phase 2 は、すべての story が compile の対象とする閉じた語彙・vendor registry・凍結された contract であり、置き換えられる vendor の record が tree を去る場所でもある。1つの閉じた union が2つの製品を名指せないからである。Phase 3 はリポジトリ (US1)、Phase 4 は Antigravity home (US2)、Phase 5 は1行を共有する2つの skill の形 (US3)、Phase 6 はリリース evidence、置き換えられる機能の artifact の削除、そして parity review である。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 別のファイルを使い、未完了の task に依存しないので、記した前提の後に並行できる。
- **[Story]**: Phase 3–5 では必須。Setup・Foundational・Polish では省く。
- 各項目は主要な結果を1つ持ち、リポジトリ相対の正確なファイルパスを少なくとも1つ持つ。新しいテストファイルは、所有する task ID と対象の振る舞いを述べるコメントで始める (AGENTS.md § Code commenting policy)。
- 「両言語」は canonical な `*.md` とその `*.ja.md` を同じ task で扱うことを指す。

## Normative Requirement Traceability

この機能の仕様の FR・QR・SC ごとの、主要な実装・検証・evidence の所有 task。範囲は両端を含む。要件または task の変更は、この表と日本語版を同じ変更で更新する。

| Requirement | Owning implementation, verification, and evidence tasks |
|---|---|
| FR-001 | T003、T006、T008、T018、T035、T048、T059–T060、T068–T070 |
| FR-002 | T011、T020–T021、T023、T025–T029、T036–T037 |
| FR-003 | T011、T021、T023 |
| FR-004 | T022、T026、T030–T031、T052–T056、T058 |
| FR-005 | T021、T029、T042 |
| FR-006 | T021、T028 |
| FR-007 | T021、T023、T025 |
| FR-008 | T005、T019、T039、T041、T048 |
| FR-009 | T040–T041、T043–T046、T051 |
| FR-010 | T040、T042、T047 |
| FR-011 | T044–T046、T050 |
| FR-012 | T011、T016、T021 |
| FR-013 | T023 |
| FR-014 | T012–T013、T015–T016、T063、T065–T066 |
| FR-015 | T002、T009、T073 |
| FR-016 | T011、T020–T021、T037–T038、T059 |
| FR-017 | T011、T020–T021、T036、T038、T051、T059 |
| QR-001 | T007、T009–T014、T017、T032、T072 |
| QR-002 | T026、T030、T053 |
| QR-003 | T020–T024、T033–T034、T036–T042、T049、T051–T054、T057、T061–T062、T064、T071 |
| QR-004 | T004、T063、T065 |
| QR-005 | T042、T047 |
| QR-006 | T001–T002、T016–T017、T059–T060、T074–T075 |
| SC-001 | T023 |
| SC-002 | T021、T023、T040–T041 |
| SC-003 | T005、T039、T041、T048 |
| SC-004 | T024、T042 |
| SC-005 | T006、T048、T059–T060、T071 |
| SC-006 | T066–T067、T071 |
| SC-007 | T073 |

---

## Phase 1: Setup

**目的**: 以降のすべての task が引用する2つの artifact — リリース entry と evidence registry の行。

- [X] T001 4つ目のサポート対象ツールについて `minor` の changeset entry を `pnpm exec changeset` で書き、ユーザー向けに1文で述べる。同じ task で未公開の `.changeset/support-gemini-cli.md` を削除する。このリリースが出荷しないサポートを告知しているからである (research.ja.md § 移行影響)。
- [X] T002 Google の source 行を `google.antigravity.*` の集合に置き換える。`antigravity.google` 上の canonical URL、host、正確な rendered section 見出し、`reviewedOn: 2026-09-10` を持たせる。端末自身のページと、共有カスタマイズ root を確立する共有ページ3つの両方を覆う。official-host の表も更新し、登録可能な接頭辞を挙げる `sourceId` の文法に `"google"` を加える。`specs/001-inspect-agent-customizations/contracts/official-sources.md` と `official-sources.ja.md` (contracts/vendors/antigravity-cli.ja.md の evidence 欄)。

---

## Phase 2: Foundational (Blocking Prerequisites)

**目的**: 閉じた語彙、vendor registry、凍結された contract。すべての story はこれに対して compile され、これが揃うまで contract gate は落ちる。置き換えられる vendor の record はここで去る。`SupportedTool` は閉じた union であり、2つの製品を名指せないからである。

**Build の状態**: T006 から最後の compiled unit が入るまで、tree は compile できない。union の member を改名すると、それを網羅するすべての record が壊れ、T014 のカタログは story が書く kind ごとの unit — リポジトリのものは Phase 3、Global のものは Phase 4 — を組み立てるからである。typecheck と suite が再び緑になるのは Phase 4 の終わりであり、そこが読み取り集合の全体が揃う最初の時点である。その間の赤い build は想定された状態であり、原因を探すべき失敗ではない。

**⚠️ CRITICAL**: この phase が完了するまで user story の作業は始められない

### Phase 2 のテスト

- [X] T003 [P] tool の語彙の期待値を置き換え、`antigravity` を4つ目の member とし、順序の gate が `copilot`・`claude`・`codex`・`antigravity` を覆うようにする。`tests/unit/shared/entities.test.ts`、`tests/unit/shared/display-text.test.ts`、`tests/unit/shared/skill-collision.test.ts`。各コメントに、以前の語彙に対して落ちたことを記録する。
- [X] T004 [P] registry の変更が動かす凍結値をすべて更新する。各コメントに、変更前の registry に対して失敗したことを記録する(AGENTS.md § Implementation simplicity policy)。rule・behavior・strategy・source の総数、ソート済みの Global rule-ID 一覧、kind ごとの rule 一覧と recognition matrix、vendor ごとのリポジトリ件数を `tests/contract/inspection-rules.test.ts`・`tests/contract/vendor-behaviors.test.ts`・`tests/contract/runtime-composition.test.ts` で。presentation-allowlist の digest を `tests/contract/presentation-allowlist-freeze.test.ts` と、それを公開する `specs/001-inspect-agent-customizations/contracts/official-sources.md`・`.ja.md` の表で。そして `tests/fixtures/conformance/` 配下の checked-in な materialization を、隣の `regen.mts` で一括再記録する。
- [X] T005 [P] capture が3つの環境プロパティを固定順で読むこと、4つ目の member の root が常に home ディレクトリとの join で origin が `default-home` であることを assert する。`tests/unit/cli.test.ts` と `tests/unit/host/global-consent.test.ts`。そのディレクトリが取りうる4つの状態 — 存在する、存在しない、存在するが空、読めない — を覆い、preview が5つの member を挙げ、親が各入力に固定する閉じた結果になることを assert する (spec.ja.md § SC-003)。

### Phase 2 の実装

- [X] T006 `SupportedTool` の `'gemini'` を `'antigravity'` に置き換え、`SUPPORTED_TOOL_ORDER` では `codex` の後の位置に、`SUPPORTED_TOOL_TEXT` では `Antigravity CLI` とし、member の doc comment を付ける。`src/shared/entities.ts` (data-model.ja.md § SupportedTool)。
- [X] T007 [P] `AntigravityBehaviorId`、`AntigravityRuleId`、`AntigravityStrategyId`、Google の source-ID union を、member ごとの doc comment を持つ閉じた string-literal union として宣言し、`BehaviorId`・`RuleId`・`StrategyId`・`SourceId` に join し、置き換えられる vendor の union を取り除く。`src/shared/registries/identifier-types.ts`。
- [X] T008 [P] `src/shared/registries/behavior-types.ts` の `gemini-cli` surface を `antigravity-cli` に置き換え、`src/shared/registries/behavior-text.ts` でその `CLI` label と最後の順序位置を与える (data-model.ja.md § VendorSurface)。
- [X] T009 vendor behavior record — workspace の4つ、workspace の rules と hooks、user tier の9つ — を、`evidence` の引用、surface `antigravity-cli`、contract の assessment index どおりの record ごとの `documentationStatus`/`lifecycleQualifiers` とともに書く。`src/shared/registries/antigravity/behaviors.ts` (contracts/vendors/antigravity-cli.ja.md § 文書化済み Repository behavior、§ 文書化済み User behavior)。
- [X] T010 [P] runtime-composition の strategy を、文書化された順の operation と evidence とともに書く。`antigravity.rules.activation` は `filter` だけを持つ。`src/shared/registries/antigravity/strategies.ts`。
- [X] T011 Inspector の rule を書く。ルートの context 2つ、skill 2つ、workspace の rules、workspace の hooks carrier、custom agent 2つ、MCP carrier、Global の8つ、そしてそれぞれの理由を述べる excluded group 3つ。`src/shared/registries/antigravity/rules.ts`。matcher はすべて inline に綴り、各 record の `policyRefs`/`evidence` は `SHIPS_MAINTENANCE_DATA` の三項で包む (contracts/vendors/antigravity-cli.ja.md § Inspector Repository rule、§ Inspector Global rule、§ Relationship-only と excluded group)。
- [X] T012 [P] relationship-only の record と skill の同名 statement を `src/shared/registries/antigravity/relations.ts` と `skill-collision.ts` に書き、statement はその skill rule が名指す strategy から導出する。
- [X] T013 `src/shared/registries/gemini/` とそのすべての export を削除し、`src/shared/registries/shared/relations.ts` から置き換えられる vendor の行を取り除く。新しい module を registry の索引に登録するのと同じ変更で行う。
- [X] T014 このツールのすべての compiled unit が継承する vendor の基底クラスを書く。`src/server/inspection/rules/vendor/antigravity.ts`。それらの unit を組み立てる rule カタログは Phase 4 末尾の T051 が持つ。まだ誰も書いていない unit を import するカタログは `scan.ts` を読み込み不能にし、他のすべての vendor の suite を道連れにしてどの gate も走らせられなくする。これは赤い typecheck より悪い中間状態であり、phase の計画が意図したものでもない。
- [X] T015 置き換えられる vendor の compiled unit とそのすべての import を削除する。`src/server/inspection/rules/gemini.ts`、`rules/vendor/gemini.ts`、および prompt/command の unit を含む kind ごとの7つの `rules/**/gemini.ts` である。このリリースがサポートしない製品の unit を残さないためである (spec.ja.md § FR-014)。
- [X] T016 vendor contract を `specs/001-inspect-agent-customizations/contracts/vendors/antigravity-cli.md` と `.ja.md` へ移し、`gemini-cli.md` と `.ja.md` を削除し、`contracts/runtime-composition.md` と `.ja.md` の contract 索引・strategy の表（`antigravity.rules.activation` が加わる）・relationship-only の表を出荷される集合へ更新する。
- [X] T017 `@iconify-json/thesvg` を、icon の方針の3点セット — `package.json` の devDependency、`scripts/third-party-notices-plugin.mjs` の `~icons/thesvg/` の行、`licenses/` に置く collection の upstream の license text — とともに1つの変更で取る。同じ変更で `src/app/components/ToolMark.vue` の mark の import と、`src/app/styles/main.css` の `--aci-brand-gemini` → `--aci-brand-antigravity` の token 改名を行い、値は保ち、コメントは製品名だけを述べるよう書き換える (research.ja.md § 8、§ 8a)。
- [X] T018 [P] member entry を `antigravity` に改名し `Antigravity home` と label する。`src/shared/api-text.ts`。member の doc comment を `src/shared/api-types.ts` で更新する (data-model.ja.md § GlobalMemberId と member の tuple)。
- [X] T019 環境の capture を3つのプロパティに減らし、`settingNames` の field とそれが存在した理由である parent-join の分岐を削除し、4つ目の member の root を home ディレクトリとの join として導出する。`src/server/host/global-consent.ts` (research.ja.md § 4)。

---

## Phase 3: User Story 1 - Antigravity CLI をリポジトリのファイルの読み手として見る (Priority: P1) 🎯 MVP

**目標**: リポジトリの inventory が Antigravity CLI をそれが読むファイルの読み手として名指し、それだけが読むファイルを挙げる。

**独立テスト**: admit される全リポジトリ location に1ファイルずつ置いた fixture を調べ、すべてが Antigravity CLI を読み手に含めて挙がること、ルートの `GEMINI.md` が2つの recognition を持つ1行として挙がること、除外される隣接パスが挙がりも読まれもしないことを確認する。

### User Story 1 のテスト (必須) ⚠️

- [X] T020 [P] [US1] リポジトリの fixture builder を追加する。`.agents/` 配下に両方の形と `.agent/` 配下にディレクトリ形を持つ skills tree、両方の綴りの下に文書化された activation mode ごとに1ファイルを持つ rules tree、standalone な `.agents/hooks.json`、両方の形を持つ agents tree、ローカルとリモートの server に legacy key を加えた MCP tree、ルートの2つとネストした near miss を持つ context tree。`.agent/skills/<name>.md` と `.agents/plugins/` を含む near-miss パスも併せて。`tests/fixtures/repositories/build-fixtures.ts`。
- [X] T021 [P] [US1] compiled unit ごとの unit test と、selector family ごとに1つの rejected な near miss — ネストした `.agents/`、`.agents/skills/` の2階層目、2階層深い rules ファイル、`.agent/skills/<name>.md`、`.agents/plugins/<name>/plugin.json`、2階層深い agent、大文字小文字の異なる leaf、`.gemini/` のパス — を追加する。`tests/unit/inspection/antigravity-metadata.test.ts` と `tests/unit/inspection/rules.test.ts`。
- [X] T022 [P] [US1] ファイルの形の skill unit、recognizer による2つの skill の形の判別、そしてこの vendor 自身の invocation-name の答え — skill フォルダの `SKILL.md` に `name` が無い場合、このツールも隣の製品と同じくフォルダ名に解決するので1つのファイルは1行のままであり、平坦なファイルに `name` が無い場合は拡張子を除いたファイル自身の名前に解決する。その形が持つ fallback はそれだけである — について unit test を追加する。`tests/unit/inspection/antigravity-metadata.test.ts` (contracts/vendors/antigravity-cli.ja.md § 既知の不確実性 項目 7)。
- [X] T023 [US1] リポジトリ fixture に対する integration scan を追加し、挙がる集合、2つの recognition を持つルートの `GEMINI.md`、3つを持つルートの `AGENTS.md`、このツールの recognition を持たないネストした context file、どの near miss にも read 要求がないことを assert する。`tests/integration/repository-scan.test.ts`。
- [X] T024 [P] [US1] MCP 宣言と skill が参照する script を持つ fixture に対し、リポジトリの zero-activation suite を拡張する。実行ゼロ、MCP 接続ゼロ、外向き要求ゼロ、変更ゼロ。`tests/integration/security/zero-activation.test.ts`。

### User Story 1 の実装

- [X] T025 [US1] ルートの context の2つを共有の Markdown instruction unit へ結線する。`src/server/inspection/rules/instructions/antigravity.ts`。リポジトリルートの `GEMINI.md` と `AGENTS.md` を admit し、その下は admit しない。`src/shared/registries/copilot/rules.ts` の `copilot.repo.instructions.gemini-root` のコメントを正す。これはこのリリースが取り除く派生ルールに立っているので、行に2人目の読み手を与える静的ルールを名指すようにする。
- [X] T026 [US1] ファイルの形の skill の compiled unit を追加する。行の単位はファイル、名前は frontmatter の `name` か拡張子を除いたファイル自身の名前、companion の census は publish しない。`src/server/inspection/rules/skills/file-skill.ts`。ディレクトリの形の隣に置く自身の unit とする (research.ja.md § 2)。
- [X] T027 [US1] skill の recognizer が2つの形を閉じた union として判別するようにする。`src/server/inspection/recognizers/candidate.ts`。手書きの述語ではなく discriminant で narrow する。
- [X] T028 [P] [US1] custom agent の両方の形を共有の Markdown agent unit へ結線する。`src/server/inspection/rules/agents/antigravity.ts`。
- [X] T029 [US1] top-level の `mcpServers` object を共有の server-map の読みで読む standalone MCP carrier unit を追加し、`serverUrl` と legacy key を書かれたとおりに示す。`src/server/inspection/rules/mcp/antigravity.ts`。
- [X] T030 [US1] ファイルの形の skill の定義が companion ファイルを持たないよう publish し、行が supporting file の数を描かないようにする。`src/app/components/inventory/rows/skill-row-files.ts` と `SkillRow.vue`。
- [X] T031 [US1] ファイルの形の skill の detail を skill の panel だけとして描く。file panel も tab strip も出さない。`src/app/pages/skills/detail/[source]/[...path].vue`。見出しのコメントが既に確立している内容は変えず、skill 自身のパスを名指すようにする。
- [X] T032 [P] [US1] fixture launcher に `antigravity-*` の行を追加し、貢献者が各 surface を見られるようにする。`scripts/serve-fixture.ts`。
- [X] T033 [P] [US1] 1つの `.agents/skills/` にある両方の skill の形と、ファイルの形の panel だけの detail を覆う `tests/e2e/antigravity-skills-detail.spec.ts` を追加する。
- [X] T034 [P] [US1] `tests/e2e/antigravity-mcp-detail.spec.ts`、`tests/e2e/antigravity-custom-agents-detail.spec.ts`、`tests/e2e/antigravity-instructions-detail.spec.ts` を追加する。
- [X] T035 [P] [US1] inventory と comparison の copy とコメントにあるツール数・製品数の記述をすべて読み直し、このリリースがサポートする4つを名指すようにする。`src/app/components/inspection/declaration-order.ts`、`src/server/inspection/rules/mcp/server-map.ts`、`src/server/inspection/rules/agents/declared-name.ts`、`src/app/composables/custom-agent-comparison.ts`。
- [X] T036 [US1] hook の宣言に carrier が書いた名前を持たせ、detail の section を `(event, 宣言された名前)` で識別できるようにする。この vendor の carrier は名前付き hook の map で各 hook が自身の event を抱えるので、1つの carrier が同じ event を2回宣言でき、2つの section が同じ見出しでほぼ同じ文書を抱えて並ぶ。`src/shared/api-types.ts` の `HookEventDeclarationDto` に入れ子の record として field を足し — 宣言は名前を持ちうるのであり、4形式のうち3つはそれを付けない — `specs/001-inspect-agent-customizations/contracts/http-api.md` と `.ja.md` に記述する。名前付き hook 自身の `enabled` キーもファイル自身のキーとしてその中に publish し、「無効」「停止中」とは決して描かない。hook が走るかどうかはこの製品が観測しない実行時の事柄である (contracts/vendors/antigravity-cli.ja.md § 既知の不確実性 項目 9)。inventory の行には触れない。行の中の1本は carrier で束ねられるので、1つの carrier が同じ event を2回宣言してもそれは既に1本である。行の単位は宣言された event 1つのままで、detail に階層は足さない。続いてリポジトリの hook compiled unit を追加し、`.agents/hooks.json` を共有の hook event-map の読みで読む。`src/server/inspection/rules/hooks/antigravity.ts`。1つの carrier が1つの event を2つの名前で宣言したとき、それぞれ自身の名前を持つ2つの宣言として publish されることを `tests/unit/inspection/antigravity-metadata.test.ts` で assert する (research.ja.md § 5a)。
- [X] T037 [US1] workspace の rules ディレクトリを vendor catalog を通して `rule` の行として publish する。`rule` は専用 unit を要さないので catalog 自身の entry が答える。`.agents/rules/` と `.agent/rules/` の直下の子を admit し、宣言された activation を書かれたとおりに示す。`src/server/inspection/rules/antigravity.ts` と `tests/unit/inspection/antigravity-metadata.test.ts` (research.md § 7a)。
- [X] T038 [P] [US1] `tests/e2e/antigravity-rules-detail.spec.ts` と `tests/e2e/antigravity-hooks-detail.spec.ts` を追加し、rules ファイルの activation frontmatter とリポジトリの hooks carrier の宣言を覆う。

---

## Phase 4: User Story 2 - Consent の後に Antigravity CLI home を調べる (Priority: P2)

**目標**: 1度の consent の後、home の admit されたファイルが挙がり、その隣の state は挙がらない。

**独立テスト**: admit される各 location に1ファイル、除外される隣接パスにも1ファイルずつ置いた home を作り、1度 consent し、admit されたファイルが挙がること、除外パスが enumerate も open も read もされないことを確認する。

### User Story 2 のテスト (必須) ⚠️

- [X] T039 [P] [US2] 4つ目の home の行を `tests/fixtures/global-homes/build-fixtures.ts` で置き換える。どのプロパティも裏づけない環境変数の entry を落とし、それに伴って fixture を読む `tests/contract/http-api-global.test.ts` の member-id と root の期待値も動かす。`GEMINI.md`、`config/mcp_config.json`、`config/hooks.json`、`config/agents/`、`antigravity-cli/skills/` と `config/skills/` それぞれの skill フォルダ、`antigravity-cli/skills/` 直下のフラットなファイル、`antigravity-cli/settings.json`、および除外されるインストール済み plugin コピー・import manifest・credential・session state。`tests/fixtures/global-homes/README.md` と `README.ja.md` を3つの環境プロパティへ更新する。
- [X] T040 [P] [US2] Global の compiled unit ごとの unit test と、selector family ごとに1つの rejected な near miss を追加する。`tests/unit/inspection/antigravity-metadata.test.ts`。
- [X] T041 [US2] Global boundary の gate に、この member の scan case — admit される候補パスがすべて挙がり、どの near miss も enumerate・open・read されない — と5 member の transaction tuple を加える。`tests/integration/global-boundaries.test.ts`。
- [X] T042 [P] [US2] hook 宣言・permission rule・MCP 宣言を持つ home に対し、Global の zero-activation suite を拡張する。`tests/security/global-zero-activation.test.ts`。

### User Story 2 の実装

- [X] T043 [US2] Global の context・MCP・agent・skill の rule をそれぞれの compiled unit へ結線する。`src/server/inspection/rules/**/antigravity.ts`。skill の rule はファイルの形の unit に届く。
- [X] T044 [US2] home の settings carrier を、主題をそのファイルとする settings/config の行として admit する。`src/server/inspection/rules/settings/antigravity.ts`。
- [X] T045 [P] [US2] carrier の `allow`・`ask`・`deny` の entry を permissions の行として publish し、書かれたとおりに示し、評価しない。`src/server/inspection/rules/permissions/antigravity.ts`。
- [X] T046 [P] [US2] settings carrier の inline な hook 宣言を T036 が追加した unit で publish し、standalone の carrier と inline のものが1つの読みを共有するようにする。`src/server/inspection/rules/hooks/antigravity.ts`。
- [X] T047 [US2] 2つの excluded group を理由とともに `src/shared/registries/antigravity/rules.ts` に記録し、どの traversal step も `antigravity-cli/plugins/` の下に届かないことを確認する。
- [X] T048 [P] [US2] consent preview と source control の copy を、5つの entry のうち4つ目が `Antigravity home` と label され root がその隣に出るよう更新する。`src/app/components/consent/GlobalConsentPreview.vue`、`GlobalSourceControls.vue`、`src/app/components/inventory/SourceHomeBadge.vue`。
- [X] T049 [P] [US2] 5 member の preview と consent 後のこの member の admit 集合を覆う `tests/e2e/global-antigravity-admission.spec.ts` を追加する。
- [X] T050 [P] [US2] 1つの carrier が settings・permissions・hook の surface に重複行なしで届くことを覆う `tests/e2e/antigravity-settings-detail.spec.ts` を追加する。
- [X] T051 [US2] user tier の standalone な `config/hooks.json` を、リポジトリの carrier が既に使う unit を通して admit する。それと settings carrier の inline 宣言が、1つではなく2つの carrier として hooks inventory に届くことを assert する。`src/server/inspection/rules/hooks/antigravity.ts` と `tests/unit/inspection/antigravity-metadata.test.ts`。続いて、この vendor のすべての unit が流れ込む rule カタログ — 出荷される registry から境界ごとに導出する Repository と Global の一覧 — を `src/server/inspection/rules/antigravity.ts` に組み立て、`src/server/inspection/scan.ts` と `src/server/host/devframe-app.ts` へ結線する。この2つはこの task までは理由を述べた placeholder を持つ (T014)。

---

## Phase 5: User Story 3 - 2つの skill の形を見分ける (Priority: P3)

**目標**: `.agents/skills/` を見る読み手が、自分の skill のどれをどの製品が拾うのかを、両方の形で綴られた名前も含めて見られる。

**独立テスト**: `.agents/skills/` に両方の形を、両方で綴られた同名も含めて置いたリポジトリを調べ、各行がそれを解決する製品を述べ、形の間に優先順位がないことを確認する。

### User Story 3 のテスト (必須) ⚠️

- [X] T052 [P] [US3] skills の fixture に、両方の形で綴られた名前1つと、片方だけで綴られた名前1つを加える。`tests/fixtures/repositories/build-fixtures.ts`。
- [X] T053 [P] [US3] 両方の形で綴られた名前が、両方の定義を抱え各製品の解決を述べ、優先順位を述べない1行になることを assert する。`tests/integration/repository-scan.test.ts` と `tests/unit/shared/skill-collision.test.ts`。
- [X] T054 [P] [US3] ファイルの形の skill の行が supporting-file の件数を描かないことを assert する。既存の skill surface のテストの隣、`tests/unit/app/skill-row-files.test.ts`。描画された detail の側 — file panel も tab strip も持たない skill の panel だけ — は T033 の end-to-end spec が持つ。unit の project は単一ファイル component を compile しないからである。

### User Story 3 の実装

- [X] T055 [US3] 両方の形を1つの invocation 名の下にまとめ、ファイルごと・認識する製品ごとに1つの定義を持たせる。`src/server/session/session.ts` とそれが呼ぶ skill の grouping。
- [X] T056 [US3] 同名 statement を skill の rule が名指す strategy から導出し、drift する製品ごとの表を作らない。`src/shared/registries/antigravity/skill-collision.ts`。
- [X] T057 [P] [US3] 定義が2つの形にまたがる行について `tests/e2e/skills-comparison.spec.ts` と `tests/e2e/skill-metadata-comparison.spec.ts` を拡張する。
- [X] T058 [P] [US3] 行の定義一覧に形を名指す copy を足さないことを記録する。`src/app/components/inventory/rows/skill-row-files.ts` には何も足さない。copy が述べるはずだった対比が存在しないからである。この vendor は両方の形を読むので、製品ごとの違いは Copilot と Codex が平坦な形を読まないことだけであり、それは平坦なファイルの行にその2つのマークが無いことが既に述べている。この vendor が平坦な形を読むと書けば、マークの言い直しになるか、除外の意味に読まれて偽になる。この vendor が関わる行にだけ注記が出れば、他のすべての行の「注記が無いこと」に意味が生まれる。

---

## Phase 6: Polish、リリース evidence、削除

**目的**: story をまたぐ gate と record、そして置き換えられる機能の artifact の削除。

- [X] T059 [P] `docs/which-files-are-listed.md` と `.ja.md` の Gemini CLI の節を、リポジトリと personal setup の下の Antigravity CLI の節に置き換える。出荷される rule が admit する literal segment を、`.agent`・`rules`・`hooks.json`・`SKILL.md` を含めてすべて名指す散文とし、共有 agent home の「読むツール」欄も正す。
- [X] T060 [P] `README.md` と `README.ja.md` がツールの集合を名指すすべての箇所で、このリリースがサポートする4つを名指す。`docs/images/inventory.png` と `comparison.png` を撮り直す。どちらもこの変更で動く legend を写している。
- [X] T061 [P] 初回利用の study input を、このリリースがサポートするツールを名指すよう更新し、FR-008 が取り除く環境プロパティを落とし、指定ファイルの読み手をリポジトリルートの `AGENTS.md` を読む3つに設定する。`tests/usability/sc001-sc006-study-inputs/`。
- [ ] T062 更新された input に対して親仕様の20セッションのエージェント駆動実行を行い、その実行・日付・結果を `specs/001-inspect-agent-customizations/validation.md` と `.ja.md` に記録する (spec.ja.md § QR-003)。
- [X] T063 outcome manifest を次の version へ進め、置き換えられる vendor の case を除き、このツールが加える `(tool, customization file type, admitted source form)` ごとに1 case を持たせ、影響を受ける fixture digest と canonical digest を再計算する。`tests/fixtures/outcomes/manifest.json` と `manifest.sha256`。この task が入るまで `tests/contract/outcome-fixture-manifest.test.ts` は不足する `(tool, kind)` の case で失敗する。
- [X] T064 manifest version の遷移とその denominator、実行した Antigravity CLI の case ID、official-source の実行を `specs/001-inspect-agent-customizations/validation.md` と `.ja.md` に記録する。
- [X] T065 削除される機能の task と phase の件数の凍結を、この機能の `specs/003-antigravity-cli-support/tasks.md` と `tasks.ja.md` の件数に置き換える。literal を `tests/documentation/cross-artifact.test.ts` に綴り、先に落ちるところを確認する。
- [X] T066 `specs/002-gemini-cli-support/` を削除し、それを引用するすべての artifact を `specs/003-antigravity-cli-support/` へ付け替える。親の spec・data-model・http-api・quickstart・validation、registry のコメント、それを名指すテストを含む (spec.ja.md § FR-014)。
- [X] T067 出荷される tree、その文書、その gate を検索し、このリリースがサポートしない製品のサポート対象ツール識別子・label・mark・contract・凍結件数が無いことを確認し、結果を記録する。ファイル名 `GEMINI.md` とディレクトリ `~/.gemini` はその出現に当たらない。どちらもこのツール自身が読むものだからである (spec.ja.md § SC-006)。
- [X] T068 [P] 親仕様の tool 一覧、supported-file の表、FR-018 の除外、FR-045 の共有 home の読み手を、このリリースがサポートする4つのツールへ改める。`specs/001-inspect-agent-customizations/spec.md` と `spec.ja.md`。
- [X] T069 [P] 親の data model の member entity と session API contract の consent preview を、このリリースが出荷する member id と label へ改める。`specs/001-inspect-agent-customizations/data-model.md`、`data-model.ja.md`、`contracts/http-api.md`、`http-api.ja.md`。
- [X] T070 [P] 親の quickstart の環境 capture と consent view の手順を、3つのプロパティと4つのツールへ改める。`specs/001-inspect-agent-customizations/quickstart.md` と `quickstart.ja.md`。
- [X] T071 `package.json` の gate script — `pnpm run test:docs`、`test:unit`、`test:contract`、`test:integration`、`test:security`、`test:package` — と、T033・T034・T049・T050・T057 の end-to-end spec を chromium で実行する。
- [X] T072 `pnpm run format`、`pnpm run lint`、`pnpm run typecheck` を実行する。新しい module の header コメント、閉じた union の member ごとの doc comment、defensive branch が名指す caller を AGENTS.md § Code commenting policy に照らして確認する。
- [X] T073 `pnpm run check:official-sources -- --network` を実行し、すべての `google.antigravity.*` record が公式ホスト上で解決することを確認し、その実行を `specs/001-inspect-agent-customizations/validation.md` と `.ja.md` に記録する。
- [X] T074 この機能が触れた英日のすべての対 — 親の spec・data-model・http-api・quickstart・validation・official-sources・runtime-composition、移した vendor contract、`docs/which-files-are-listed`、readme、study input、そしてこの機能自身の artifact — を、抜け・古い記述・技術的な食い違いについて比較する。
- [X] T075 fixture host を `--no-open --port 0` で起動し、行が描く大きさで4つの vendor mark を並べて見て、新しいものが隣の3つと同じ視覚的な重さに収まることを確認する。記録した process ID で host を停止する (quickstart.ja.md § fixture リポジトリで見る)。

---

## Dependencies & Execution Order

### Phase の依存

- Phase 1 に前提はなく、T002 の引用以外を塞がない。
- Phase 2 はすべての story を塞ぐ。閉じた union、registry、凍結された contract が、story が compile される対象だからである。
- Phase 3 (US1) は Phase 2 だけに依存し、MVP である。
- Phase 4 (US2) は Phase 2 に依存し、Phase 3 の compiled unit を再利用する。US1 の surface には依存しない。
- Phase 5 (US3) は Phase 3 の skill unit に依存する。
- Phase 6 はすべての story に依存する。ただし T059・T060・T068–T070 は Phase 2 の語彙だけを要する。
- Phase 6 の中で T065 は T066 に先行する。文書 gate が削除される機能の task ファイルを読むので、凍結を動かす前に消すとその gate は落ちるのではなく例外になる。

### 並行できる箇所

- T003–T005 は同時に走る。T007・T008・T010・T012・T018 も同様。
- Phase 2 の完了後、T020–T022 と T024 は同時に走る。T023 は T020 に続く。
- unit が揃えば T028・T032–T035 は同時に走る。T038 は T036 と T037 の後に続く。
- T039・T040・T042 は同時に走る。T044 の後、T045・T046・T048–T050 が同時に走る。T051 は T036 の後に続く。
- T052–T054 は同時に走る。T055 の後、T057 と T058 が同時に走る。
- T059–T061 と T068–T070 は Phase 2 以降のどこでも同時に走る。

---

## Implementation Strategy

### MVP First (User Story 1 Only)

Phase 1・2・3 で、リポジトリの inventory が4つ目のツールを名指すところまで届く。これは読み手がこの製品を開く目的そのものであり、consent を要さない。そこで止めても製品は一貫している。personal setup は5つの member を提示し続け、4つ目は Phase 4 まで何も挙げないだけである。

### Incremental Delivery

各 story の phase は、上の独立テストが測れる状態で終わる。Phase 6 の削除の task を意図的に最後に置くのは、置き換えられる vendor の record が union の都合で Phase 2 に去る一方、その feature ディレクトリ・件数・manifest の case は、それを数える gate が新しく数える対象を得てから去るためである。

---

## Notes

- 凍結された件数・digest・tuple・version literal は、その gate が新しい source に対して落ちるところを確認してからのみ変更する。
- エージェントが起動する host は `--no-open --port 0` を取り、ターンが終わる前に停止する。
- end-to-end の実行は spec を名指しし `--project=chromium` を使う。この機能のためにブラウザ suite 全体は走らせない。
