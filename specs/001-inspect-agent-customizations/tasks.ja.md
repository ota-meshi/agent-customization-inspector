# タスク: エージェントカスタマイズの調査

[English](tasks.md)

**入力**: `/specs/001-inspect-agent-customizations/` の設計文書

**前提条件**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**テスト**: すべての振る舞いの変更について、実装前にリスクに応じた自動テストが必要です。テストはユニット、契約、統合、パッケージ、セキュリティ、性能、ブラウザー、境界、アクセシビリティ、回帰の振る舞いを網羅します。

**構成**: タスクは、一つのuser story全体を水平に完了せず、元の目に見えるfamily-vertical delivery incrementに従います。起動可能な画面の後、各familyでInventory/List、完全で不活性なDetail、必要なshared integration、Comparisonを完了してから次のfamilyへ進みます。正確な順序は、SKILL（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooksです。Story labelはcanonicalなtraceabilityを維持し、`[US1]`はdiscovery、`[US2]`は完全で不活性なdetail、`[US3]`はcomparison、`[US4]`はGlobal inspectionを表します。Owner-dependent MCP integrationはMCP waveでdormantなowner-agnostic contractとして実装し、対応する後段のowner familyがadmitされた時点で表示可能にします。各phaseは独立してtest可能なmilestoneを1つ維持します。

## 形式: `[ID] [P?] [Story?] Description`

- **[P]**: 明記された前提条件の完了後、異なるファイルを使用し、別の未完了タスクへ依存しないため並列実行できます。
- **[Story]**: フェーズ 3〜101 で必須です。Setup、Minimal Secure Foundation、フェーズ 102〜104 でのみ省略します。
- すべてのチェックリスト項目には、一つの主要成果と少なくとも一つの正確なrepository-relative owned file pathが必要です。Repository root直下のowned fileには明示的な`./` prefixを付けます。Prefixなしのbasenameはmanifest member、API value、selector、その他content literalとして残してよいものの、owned path導出時には無視し、task ownershipを満たすものとして数えません。

## 規範的な要件トレーサビリティ

このmatrixを、checklist semanticsを変更する仕組みではなく正本coverage indexとする。全FR、QR、SCについてprimaryな
implementation/verification/evidence ownerを示す。Rangeはその全taskが当該requirementへ直接寄与する場合だけ両端を含み、
taskはchecklist textと参照specにないobligationを継承しない。全taskを少なくとも1つのspecification rowまたは明示的な
Constitution/project-governance rowで扱う。Requirement/task変更時はこのmatrixと英語版を同じ変更で更新する。

| 要件 | 所有する実装・検証・evidence task |
|---|---|
| FR-001 | T040, T043, T046–T047, T917, T1029, T1041, T1048, T1056, T1061–T1062 |
| FR-002 | T017, T026, T028–T030, T037, T042, T044, T049, T055, T057, T067–T069, T913–T919, T1029, T1041, T1061–T1062 |
| FR-003 | T052, T061, T063, T065, T067, T110–T111, T113, T132, T135, T137, T160, T162, T164, T211, T213, T232, T234–T235, T251, T253–T258, T286, T288–T289, T309, T311–T312, T339, T341–T342, T359, T361–T362, T407, T409, T424, T426–T427, T445, T447, T462, T464–T465, T491, T493, T512, T514, T532, T534–T535, T551, T553–T554, T607, T609–T610, T628, T630–T631, T663, T665, T684, T686–T687, T704, T706–T707, T724, T726–T727, T757, T759, T761, T780, T782, T784, T803, T805–T807, T839, T841, T883, T885–T886, T913, T1029, T1041–T1042, T1053 |
| FR-004 | T066, T112, T136, T163, T213, T234–T235, T257–T258, T289, T311–T312, T330, T341–T342, T361–T362, T384, T409, T426–T427, T447, T464–T465, T493, T514, T534–T535, T553–T554, T586–T587, T609–T610, T630–T631, T665, T686–T687, T706–T707, T726–T727, T760–T761, T783–T784, T806–T807, T841, T851, T866, T885–T886, T895, T902, T919, T1029, T1041–T1042, T1053 |
| FR-005 | T017, T028, T178–T190, T268–T275, T388–T396, T913, T920, T1073, T1078 |
| FR-006 | T178–T190, T268–T275, T388–T396, T402–T410, T440–T448, T475–T481, T486–T494, T507–T516, T565–T572, T577–T588, T643–T653, T658–T666, T679–T688, T739–T746, T751–T762, T818–T828, T833–T843, T899–T907, T919 |
| FR-007 | T004, T074–T177, T216–T267, T292–T387, T411–T435, T449–T474, T495–T502, T517–T564, T589–T642, T667–T674, T689–T738, T763–T817, T844–T898, T920–T927, T1034–T1036, T1041–T1042, T1064–T1068, T1073–T1079 |
| FR-008 | T205–T275, T920, T927, T1042 |
| FR-009 | T079–T080, T091, T1042 |
| FR-010 | T226–T244, T920, T924–T927 |
| FR-011 | T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-012 | T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-013 | T930, T932–T935, T938–T943, T945–T946, T950, T958–T962, T1017–T1028, T1029, T1041, T1061–T1062 |
| FR-014 | T930, T944–T947, T950–T951, T956–T959, T963–T964, T967–T968, T974–T975, T977–T978, T981–T982, T988–T989, T991, T993–T995, T997–T998, T1000–T1005, T1029, T1041, T1058, T1061–T1062 |
| FR-015 | T977–T990 |
| FR-016 | T963–T976 |
| FR-017 | T944–T962 |
| FR-018 | T930, T947–T949, T952–T956, T964–T966, T969–T973, T978–T980, T983–T987, T991–T992, T996, T999, T1029, T1041–T1042, T1054, T1061–T1062 |
| FR-019 | T015–T023, T027–T032, T040, T046, T055–T056, T067, T075–T076, T081–T089, T095–T100, T183, T915–T927, T995–T997, T1029, T1041, T1054–T1055, T1061–T1062 |
| FR-020 | T056, T925, T1054 |
| FR-021 | T280–T401, T925, T1054 |
| FR-022 | T040, T043, T045–T047, T056, T294, T925, T996, T1054 |
| FR-023 | T018, T020–T021, T031, T056, T924–T925, T930, T995–T997, T1029, T1041, T1054, T1061 |
| FR-024 | T018–T022, T029–T032, T055, T057, T067, T069, T916, T924, T934, T940, T944–T945, T947, T959, T1008, T1014, T1029, T1041, T1051, T1054, T1058, T1061–T1062, T1069–T1072 |
| FR-025 | T074–T085, T095, T517, T589, T612, T920–T927, T995–T997, T1029, T1041, T1055, T1058, T1061–T1062, T1069 |
| FR-026 | T077, T085, T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925–T927, T995–T997, T1055 |
| FR-027 | T084, T100, T102, T927, T1045 |
| FR-028 | T015–T017, T027–T028, T032, T075–T076, T089, T095, T116, T141, T208, T217, T238, T282, T321, T371, T517, T589–T590, T612, T799, T805, T915, T921–T923, T926–T927, T1041, T1058, T1061–T1062 |
| FR-029 | T015–T016, T020–T021, T023–T024, T026–T027, T031, T035, T037, T040, T046, T055, T067–T068, T141, T149, T217, T222–T223, T238, T242–T243, T915, T923–T924, T946, T958, T1006–T1008, T1013–T1014, T1017, T1021, T1023–T1024, T1029, T1041, T1043, T1046, T1054, T1058, T1062 |
| FR-030 | T017, T026, T028, T037, T057, T068–T069, T071, T182–T183, T916, T918, T928, T958, T1006–T1016, T1023, T1052, T1058 |
| FR-031 | T041, T048–T049, T096, T182, T1021, T1024, T1027 |
| FR-032 | T004, T017, T028, T061, T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T916, T919, T926–T929, T995, T997, T1029, T1041–T1042, T1061 |
| FR-033 | T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925, T927–T929 |
| FR-034 | T226–T244, T440, T442, T477, T857–T877, T1042 |
| FR-035 | T205–T225, T944–T962 |
| FR-036 | T226–T244, T963–T976 |
| FR-037 | T245–T267 |
| FR-038 | T001–T003, T005–T014, T024–T036, T1043–T1044, T1047–T1051 |
| FR-039 | T091, T153, T159, T246, T260, T374, T377, T380–T386, T388, T391, T393, T400, T547, T550, T720, T723, T911, T923, T931, T936–T937, T979–T980, T985–T986, T995–T997, T1029, T1041–T1042, T1060 |
| FR-042 | T041–T042, T044, T048–T049, T057, T1017–T1029, T1041, T1045–T1046, T1058, T1061–T1062 |
| FR-043 | T1041–T1042, T1080 |
| QR-001 | T017–T039, T050–T073, T913–T920, T1031–T1042 |
| QR-002 | T015–T028, T055–T057, T061, T067–T071, T183, T913–T935, T944–T950, T963–T967, T977–T981, T991–T997, T1006–T1024, T1041–T1055, T1058–T1062 |
| QR-003 | T018–T049, T055–T057, T067–T069, T915–T927, T930, T946, T958, T995–T997, T1006–T1028, T1029, T1041, T1051, T1054–T1055, T1058, T1061–T1062 |
| QR-004 | T044, T071, T084, T100, T919, T927, T929, T935, T950, T976, T990, T997, T1004–T1005, T1016, T1022, T1028–T1030, T1039–T1041, T1045, T1056–T1059, T1061–T1062 |
| QR-005 | T050–T073, T913, T920, T1031–T1042, T1062 |
| SC-001 | T040, T043, T046–T047, T917, T1029–T1030, T1041, T1048, T1056, T1061–T1062 |
| SC-002 | T017, T026, T028, T037, T057, T068–T069, T071, T183, T914, T916, T918, T1029, T1041, T1052 |
| SC-003 | T913–T914, T919–T920, T1041–T1042, T1053, T1062 |
| SC-004 | T018, T020–T021, T031, T056, T085, T924–T925, T930, T995–T997, T1029, T1041, T1054, T1061–T1062 |
| SC-005 | T074, T077, T081–T085, T925–T927, T930, T995–T997, T1041, T1055, T1062 |
| SC-006 | T1030, T1049, T1056–T1057, T1061–T1062 |
| SC-007 | T015–T021, T026, T038, T040, T046, T055, T057, T067–T069, T075–T076, T081, T089, T915, T921–T924, T926–T927, T930, T934, T944–T947, T958–T959, T963–T964, T975, T977–T978, T989, T991, T993, T995, T997, T1006, T1008, T1013–T1014, T1041, T1046, T1058, T1061–T1062 |
| SC-008 | T044, T071, T084, T100, T919, T927, T929, T1004, T1029, T1041, T1045, T1059 |
| SC-009 | T153, T246, T374, T377, T380–T386, T547, T550, T720, T723, T911, T923, T931, T936–T937, T979–T980, T985–T986, T995–T997, T1041–T1042, T1060, T1062 |
| Constitution/project governance | T001–T014, T1029–T1063 |

---

## フェーズ 1: Setup

**目的**: 再現可能な Node.js 専用パッケージと開発エントリーポイントを確立します。

**独立テスト**: `pnpm run format:check`を実行してtreeをゲートすることを観測し、`pnpm run format`が除外対象以外だけを書き換えることを確認します。その後、固定dependency graphをinstallし、設定済みの全local command/CI entry pointがRust、native compiler、install-time buildなしでresolveすること、およびplatform別prebuilt componentやpin済みcertification-browser downloadが、公開package payloadへ決して入らない、個別にpin済みのthird-party development toolingにのみ現れることを確認します。

**目に見えるチェックポイント**: Contributorがprojectをinstallし、test済みformatting gateとempty build/test toolchainを実行できます。

- [X] T001 Packageまたはconfiguration fileを変更する前に、plan承認済みdependency baselineを再検証し、以前の公開済みpackage/public contract、永続profile/user data、影響を受けるconsumer、migration workflowがないという初回のmigration影響なし判定を確認する。`specs/001-inspect-agent-customizations/research.md`にある`**Migration impact**` section、`specs/001-inspect-agent-customizations/research.ja.md`にある`**移行影響**` section、`specs/001-inspect-agent-customizations/plan.md`にある`**Dependency and breaking-change migration gate**` section、`specs/001-inspect-agent-customizations/plan.ja.md`にある`**Dependencyおよび破壊的変更の移行gate**` sectionを検証し、必要なら更新する。その正確な英日section pairを成功時のconfirmation evidence記録先とし、欠落、stale、不一致、根拠不足のいずれかがある間はT001をincompleteのままにしてT002を開始してはならない（MUST NOT）。確認に失敗する、承認済みdependency baselineが変わる、またはpublic contractのbreaking changeを提案する場合は停止し、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport window、rollback/support path、または理由を明記した影響なし判定を文書化する。影響を受ける`specs/001-inspect-agent-customizations/research.md`/`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`/`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md` pairを同期し、current task setをsupersededとして`/speckit-plan`と`/speckit-tasks`を再実行する。そうでなければNode.js `^24.11.0 || ^26.0.0`、`pnpm@11.13.0`、正確なruntime leaf集合`gunshi` 0.37.0・`yaml`・`jsonc-parser`・`smol-toml`、承認済みの正確なdevelopment version、凍結されたgraphを`./package.json`と`./pnpm-lock.yaml`に固定する
- [X] T002 `bin` を `agent-customization-inspector: dist/cli.mjs` のみ、`files` を `dist`、`README.md`、`README.ja.md`、`LICENSE` のみに定義し、`main`/`module`/`exports` を省略して、`./package.json` でライフサイクルのビルド・ダウンロードフックを禁止する
- [X] T003 Byte衛生を宣言的に所有する: `./.gitattributes`（`* text=auto eol=lf`）でline endingをnormalizeし、`./.editorconfig`でcharset/final-newline/trailing-whitespaceのeditor慣習を宣言する。Runnableなinert Node ESM entryを`src/server/cli.ts`へscaffoldし、`scripts/clean-build-output.mjs`と`scripts/verify-package-files.mjs`へno-op placeholderを作り、build、linting、type-checking、unit、contract、integration、security、package、performance、coverage、documentation、browser commandを `./package.json` に追加する *(2026-07-29 修正: code formattingは別途Prettierが所有する — `pnpm run format`が書き換え、`pnpm run format:check`がローカルとCIの`format` jobでゲートする（憲章v5.0.0）。Byte衛生は宣言的なまま、formattingだけがゲートを得た。)*
- [X] T004 `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`、`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みPresentation Allowlistを、`specs/001-inspect-agent-customizations/contracts/official-sources.md`と`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`に記録された6個のlowercase SHA-256 valueに対してverifyだけし、authorまたはsemantic editを行わない。各UTF-8/BOM-free/LF-only fileについて、case-fold textが`presentation allowlist`で終わるlevel-2 headingをexactly one要求し、後続non-table lineをskipし、byte-for-byteで`|`から始まる最初のcontiguous runだけをhashし、全row byteを保持して最終rowを含む各row後に1 LFを付け、heading/prose/blank/following lineを除外する。Missing/duplicate/empty/malformed heading/tableをrejectし、equal-length digest byteをconstant timeでcompareする。Digest matchだけでは不十分なため、exact row IDとmembership/source form/extractor/field/relationship/contained-owner/eligibility gateを含む英日semantic parityを別に検証する。Mismatch、recorded value欠落、desired semantic changeのいずれでもT004はincompleteのままT005と全dependentを停止し、task setをsupersededとし、synchronized bilingual spec/research/plan/quickstart/contracts/tasksと`/speckit-plan`後の`/speckit-tasks`を要求してからregenerated workを再開する
- [X] T005 [P] Nuxt SPA、静的 Nitro プリセット、ルート絶対アセット、無効化した CDN、明示的な imports と components を `./nuxt.config.ts` で設定する
- [X] T006 [P] アプリケーション、共有、ソース、スクリプト、テストに対する厳格な型チェックを `./tsconfig.json` で設定する
- [X] T007 [P] 生成出力を除外しながら TypeScript、Vue、Node.js、テストの lint を `./eslint.config.js` で設定する
- [X] T008 [P] Unit、contract、integration、security、package、performance、coverageの各projectを区別して`./vitest.config.ts`で設定し、専用security projectだけが正確に`tests/security/**/*.test.ts`をincludeし、他の全projectがそのrootをexcludeし、`tests/integration/security/`はintegration projectが所有するようにする
- [X] T009 [P] Playwright 1.61.1がinstallする正確なbrowser revisionを使うdeterministicなChromium、Firefox、WebKitのprimary-workflow/accessibility certification projectを `./playwright.config.ts` に設定し、pin済みrevisionは再現可能な自動baselineであってuser browserの網羅的一覧ではないことを文書化する
- [X] T010 [P] 単一の名前付き Node ESM `cli` エントリー、固定 `.mjs` 出力、バンドルするプロジェクトモジュール、外部化する宣言済み依存関係、無効化したマップ・宣言、`dist/` への直接出力と `clean: false`（`dist/` の除去は pipeline 自身の clean step が所有する）を `./tsdown.config.ts` で設定する
- [X] T011 [P] `package.json.bin`を別のbootstrap wrapperなしでpackaged `dist/cli.mjs`へ直接向ける。`src/server/cli.ts` entryは正確な`#!/usr/bin/env node` shebangで始まり、tsdownがbundleでそれを保持し、package managerがinstall時にlinkされたbinをexecutableにする。Node.js互換性はpacked `engines.node` range `^24.11.0 || ^26.0.0`だけで宣言し、package managerのengines機構でenforceする。CLIは宣言済みstringも実行中versionも再検査せず、packed exact stringはpackage testでassertする
- [X] T012 [P] 依存関係と、生成された Nuxt、サーバー、配布、カバレッジ、Playwright、Node.js のビルド出力だけを `./.gitignore` で無視する
- [X] T013 独立したlint、type-check、unit、contract、integration、security、package、performance、documentation、coverage、browser jobを `.github/workflows/ci.yml` に追加する。Byte衛生は`.gitattributes`と`.editorconfig`が所有するためCI jobを持たない
- [X] T014 Node.js `24.11.0`と`26.0.0`を`ubuntu-24.04` x64、`macos-15` arm64、`windows-2025` x64と掛け合わせた正確な6つのlower-bound certification job、Node.js 24.18.0 `ubuntu-24.04` x64のdevelopment/build job 1件を `.github/workflows/ci.yml` に追加し、宣言済みNode.js 24/26 engine rangeがruntime compatibility contractでありsampleだけへsupportを狭めないことをlabelする

---

## フェーズ 2: Minimal Secure Foundation

**目的**: ブラウザーセッションや Repository 読み取りより前に存在しなければならない契約とセキュリティ境界だけを実装します。

**独立テスト**: 製品ワークフローを起動せず、closed DTO と source-value-free Diagnostic、正確な package manifest、承認済み production dependency 集合の gate、単一のinspection-module filesystem boundary、generation 0 の状態を検証します。

**目に見えるチェックポイント**: セキュリティとパッケージの基盤が単独で合格し、単一のinspection moduleの外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。

### テストと fixture

- [X] T015 [P] 作業は残っていない（FR-040/FR-041の削除、2026-07-22）: errorは通常どおり報告され、sanitizer/envelope moduleは存在しないため、本taskが記述していた階層化failure契約のtest suiteにassertする対象がない。Fileに閉じたfailureの分離はFR-028のtestとClosed Scan Publication Outcomesのtaskがカバーする
- [X] T016 [P] Closed Diagnostic registry、deterministic aggregation、successful complete atomic publicationのfailing testを`tests/unit/shared/diagnostics.test.ts`に追加する。本taskのerror entityとoperational eventの部分はもはや適用されない（FR-040/FR-041の削除、2026-07-22）: errorは通常どおり報告され、sanitizer/envelope moduleは存在しないため、それらのsuiteにassertする対象がない
- [X] T017 [P] Complete decoded textと保持された`U+FFFD`を持つreadable `utf-8 | utf-8-replaced` file、textを持たないNUL-containing `binary`、one-root Source invariant、`process-cwd | root-option | default-home | environment`だけをoriginとするexact non-authorizing `SourceBoundary { displayRoot, origin }`、generation-0 origin selectionを含むpublic entity shapeのfailing testを追加する。Closed `DocumentationStatus = documented | partially-documented | unknown | conflict`、fixed-order `LifecycleQualifier = preview | experimental | deprecated`、重複禁止・`stable`推論禁止、exact record-specific `EvidenceAssessment { subjectKind, subjectId, documentationStatus, lifecycleQualifiers }`も検証する。Provenance、Relationship、Source Condition Factではowning/referenced behavior/rule/strategyごとに1件のsorted/deduplicated assessmentを保持し、scalar/worst-status/qualifier unionへ縮約せず、`documentation-conflict`をdocumentation statusとして拒否する。Closed descriptor、ordinary Diagnostic scope、opaque ID、internal stateが構築によってDTOへ入らないことも扱い、`tests/unit/shared/entities.test.ts`と`tests/unit/shared/api-types.test.ts`で拒否する *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T018 fileとdirectoryへのsymbolic link (broken linkを含む)、link cycle、non-regular entry、deep tree、VCS内部、読み取り不能なfile/directory、NULを含むbinary file、invalid UTF-8/BOM file、discoveryとreadの間に消えるfile、Codex override/fallback contentの各caseの決定論的cross-platform fixtureを作る。product filesystem要求を計測してmutation-capable API/flagが0件であることを証明し、前後のcontent/length/identity/link/mode/mtime/ctimeと、platformがstable APIを提供する場合に限りxattr/ACL（contracts/inspection-path-allowlist.md § Symlink and read invariants。Node.jsは提供しないため、ctime観測が文書化済みの間接signalとなる）を記録し、OS-only atimeは別々に`tests/fixtures/filesystem/build-filesystem-fixtures.ts`に記録する
- [X] T019 compileされたinspection allowlistを`fs/promises`で普通に再帰walkするtraversalのfailing testを追加する: directoryは通常のreadで列挙する。symbolic linkは透過的に辿り、symlinkされたcandidateは他のfileと同様にtargetを通して読む。targetが存在しないか読めないlinkはそのfileの`file-unreadable` Diagnosticになる。訪問済みdirectoryをreal pathで追跡し、link cycleがscanの終了を妨げないようにする。hard linkは通常のfileである。VCS内部は除外する。raw entry nameがfilesystem operandのままで、それを`/`でjoinしたものが公開Source-relative Pathである。存在しないか読めないrootはsource-scopedな`root-unreadable` DiagnosticとなりSource attemptをfailさせる。operation間のidentity再検証やchange検出taxonomyは存在しない (FR-019, FR-024)。以上を`tests/unit/inspection/traversal.test.ts`に追加する *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T020 file読み取りのfailing testを追加する: 発見された各fileはscan attemptごとに1回、mutation-capable flagなしの通常のread-only `fs/promises` readで読む。消えたか読めなかったfileはそのfileの`file-unreadable` Diagnosticとなり他のfileに影響しない。hard linkはphysical-identity groupingのない通常のfileである。Codexのoverride空ordered fallback (FR-035) が唯一のcontent依存selectionである。Source・scan attempt・generationは独立のままであることを`tests/unit/inspection/traversal.test.ts`で証明する
- [X] T021 FR-024/FR-028 publication matrixの統合failing testを追加する: `file-unreadable`またはadmit済みcandidateの`file-content-binary` outcomeはdiagnostic-only recordを保持し、他の点では公開可能なgenerationをpartialにする。`recognition-parse-failed` outcomeは読み取り可能sourceの表示とcomparison適格性を保ちつつ、影響を受けたrecognitionの派生dataだけを省く。読めないrootはsource-scopedな`root-unreadable` DiagnosticでSource attemptをfailさせ、partial generationを作らない。単一fileに閉じないfailureは何もcommitせずにattemptを中止する。scan中のfixtureへの外部mutationはproduct mutationではない。disable/shutdown/supersession後のlate resultはhard-cancellationを主張せずに破棄されることを`tests/integration/boundaries/traversal.test.ts`で証明する
- [X] T022 調査対象ソースのfilesystem I/Oが単一のinspection moduleに留まるよう、`src/server/inspection/` directory外の静的およびリテラル動的な`node:fs` importを拒否するアーキテクチャ境界を、production source限定の`no-restricted-imports`（静的）と`no-restricted-syntax`（文字列リテラル動的`import()`）ruleとして`./eslint.config.js`でenforceする。No-substitutionなテンプレートリテラルのspecifierは、標準の`@stylistic/quotes` rule（`allowTemplateLiterals: 'never'`）で扱い、プレーン文字列へ強制してそれをfs selectorが捕捉する。substitutionを含む、または算出される動的specifierだけがlintの保証ではなくreviewが所有する実装バグとする *(2026-07-23修正: import policyはlint layerが所有する — 静的linterがこのboundaryの保証できる形であり、既存のlint CI jobが実行するため、専用のcontract suiteは存在しない。)*
- [X] T023 [P] devframe host により supersede（2026-07-22）: devframe の認証は無効化され、session ごとの認証と request 分類の guard は手書き router とともに削除され、専用の host contract suite も削除済みである。保護として残るのは loopback-only binding であり、それは `tests/contract/host-startup.test.ts` の startup contract（T040）が assert し、認証なし loopback の残存露出は T1029 の下で文書化される
- [X] T024 [P] `scripts/clean-build-output.mjs` による generated root へ閉じた cleanup、`scripts/verify-package-files.mjs` が regular file として検証する正確な2つの必須 package entry point—`dist/public/index.html` と `dist/cli.mjs`—および execution environment が artifact を完全に read/verify できない場合の安全な failure に関する failing build/package test を `tests/package/build-cleanup.test.ts` と `tests/package/verify-package-files.test.ts` に追加する
- [X] T025 必須 CLI エントリーを持つ dist 直下 `.mjs` の server bundle 集合、`package.json` と `pnpm-lock.yaml` closure から assert する承認済みの直接 production dependency 集合—`devframe`、`gunshi`、`jsonc-parser`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`—、`gunshi/agent`/lazy/custom-plugin pathを含まないroot-API-only CLI import、ならびに `open` package の拒否に関する dist-closure および package-policy の失敗テストを `tests/package/verify-package-files.test.ts`、`tests/package/production-graph.test.ts`、`tests/package/node-only-policy.test.ts` に追加する *（superseded 2026-07-23: payload content scan — native/binary/Wasm magic、Rust/C/C++/Cargo source、prebuild、platform selector、shell helper、Node 以外の shebang、lifecycle/runtime-download や network-disabled install の audit — と、dependency 単位の version/integrity hash assertion および `gunshi` の bundle 済み payload digest はscopeから外した。commit 済み lockfile が各 resolved version と integrity hash を既に pin しており、それらを test で再記述しても lockfile を二重化するだけで、install 時の enforcement は package manager が所有する。plan.md § Source Code (repository root) 参照）*
- [X] T026 [P] Captured invocation working directoryとoptional `--root`からlexicalに選択したexactly one enabled idle Repository Sourceをgeneration 0がfilesystem I/O 0件で同期的に持つfailing generation/session testを追加する。Stable opaque `sourceId`、escaped non-authorizing `SourceBoundary`、empty files/Diagnostics、null `scanRequestId`、そのSourceから始まるautomatic first scanを検証する。全admitted automatic/explicit Source/progress/attempt/final status/successful generationでone opaque request IDを保持し、deterministic graph ID、coordinator-locked serialization、atomic N+1 replacement、ID rekey、last-commit retention、explicit-rescan stale state、late-result discardを扱う。Ordinaryなrequest-owned failure lifecycle（accept前のrejectionはrequestの実際のerrorで失敗しjobを作らず、accept済みjobのfatal rejectionは最後のcommitをstaleとして保持し失敗したrequestのerror messageを持つ）を検証し、ownerless automatic-startup rejectionはcatch/conversionされずprocess top levelへ到達することを`tests/unit/session/scan-generation.test.ts`と`tests/unit/session/session.test.ts`で証明する

### 実装

- [X] T027 作業は残っていない（FR-040/FR-041の削除、2026-07-22）: errorは通常どおり報告され、productはsanitizer、envelope、operational event、request所有error boundaryのいずれのmoduleも持たない。Fileに閉じたfailureはFR-028に基づきper-file Diagnosticになり（`src/shared/diagnostics.ts`）、失敗した明示rescanはFR-030に基づき失敗したrequestのerrorとともにstaleなprior snapshotを保持する（`src/server/session/stale-failures.ts`）
- [X] T028 Readable `utf-8 | utf-8-replaced`、textを持たない`binary`、one-root Source、generation 0、exact `SourceBoundary`、descriptor、Source Condition Fact、Diagnosticのpublic DTOを実装する。`DocumentationStatus` typeのscalar field `documentationStatus`とfixed-order duplicate-free `LifecycleQualifier[]` typeのscalar field `lifecycleQualifiers`をbehavior/rule/strategyごとに置き、provenance/Relationship/recognition/Factではreferenced subjectごとにsorted record-specific `EvidenceAssessment[]`を縮約なしで実装する。internal authority、acknowledgement、validation、aggregate status、捏造した`stable` fieldを`src/shared/entities.ts`と`src/shared/api-types.ts`で拒否する *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T029 compileされたinspection allowlistの普通の再帰traversalを`fs/promises`で`src/server/inspection/traversal.ts`に実装する: directoryを通常のreadで列挙し、訪問済みdirectoryをreal pathで追跡してlink cycleを終了させながらsymbolic linkを透過的に辿り、hard linkを通常のfileとして扱い、VCS内部を除外し、raw entry nameをfilesystem operandに保ち、それを`/`でjoinしたものを公開Source-relative Pathとし、存在しないか読めないrootをSource attemptをfailさせるsource-scoped `root-unreadable` Diagnosticとして記録し (FR-002)、消えたか読めないfile (broken linkを含む) を他のfileに影響しないそのfileの`file-unreadable` Diagnosticとして記録する。operation間のidentity再検証、change検出taxonomy、resource registryは追加しない (FR-019, FR-024) *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T030 `data-model.md § TraversalPlan`のclosedでimmutableなversioned `TraversalPlan`とsegment-program typeをregistryとともに`src/server/inspection/rules/registry.ts`に定義し、`src/server/inspection/traversal.ts`にはそのcompile済みplanだけを解釈させる: selected rootを基点とするtyped literal/regex/非隣接recursive segment program、VCS除外、`/`でjoinした綴りが公開pathとなるraw operand、唯一のcontent依存分岐としてのCodex ordered fallback。CLIのroot selectionは`src/server/cli.ts`のlexicalな処理に留まり (`--root`は反復指定をparserのlast valueへ解決、絶対値はそのまま、相対値は1回だけcaptureした`process.cwd()`に対して解決)、scanは保持されたselected rootを単に読む。共有root-grammar parser moduleや独立のadmission層は存在しない (FR-001, FR-019) *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T031 file単位の読み取りを`src/server/inspection/traversal.ts`に実装する: 発見された各fileをscan attemptごとに1回、mutation-capable flagなしの通常のread-only `fs/promises` readで読み、symlinkされたcandidateはtargetを通して透過的に読む。read failure (broken linkを含む) は他のfileを継続させたままそのfileの`file-unreadable` Diagnosticに変換する。hard linkはphysical-identity groupingなしの通常のfileとして扱う。Codexのoverride空ordered fallback (FR-035) を唯一のcontent依存selectionとして実装し、authority revocation後のlate resultはhard cancellationを主張せずに破棄する
- [X] T032 closedなfile限定publication matrixを`src/server/inspection/scan.ts`に実装する: `file-unreadable`またはadmit済みcandidateの`file-content-binary` outcomeは、整合した`sourceId`/`fileId`/`sourceRelativePath`を持つfile scopeのdiagnostic-only itemを保持し、他の点では公開可能なgenerationをpartialにする。`recognition-parse-failed` outcomeは完全な読み取り可能sourceの表示とcomparison適格性を保ち、影響を受けたrecognitionの派生metadata/relationshipだけを省く (FR-028)。`root-unreadable`は`sourceId`のみのsource scopeで、partial generationなしにSource attemptをfailさせる。1つのfileに閉じないfailureは決してDiagnosticに変換されず、通常どおり伝播してcommitなしにattemptを中止し、失敗したrequestの実際のerrorとして報告される（FR-030により最後にcommitされたsnapshotを保持する）
- [X] T033 `src/server/inspection/traversal.ts`のmodule headerにtrusted-workspace boundaryを文書化する: 調査対象customization fileはadversaryとしてモデル化されない (FR-019、constitution Quality and Safety Standards)。agentはcustomization fileのload時にsymbolic linkを解決するため、linkは透過的に読む (FR-024)。readは通常かつread-onlyで、scan中の外部変更はchange検出taxonomyではなくfile単位diagnosticまたは通常のfailed attemptとして現れる
- [X] T034 2026-07-22 の devframe host 決定に従い、local host framework の依存として devframe（`package.json` では caret range、resolved version は lockfile が pin）を `./package.json` に採用し、production dependency 集合を承認済みの正確な7つの直接依存—`devframe`、`gunshi`、`jsonc-parser`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`—へ `tests/package/production-graph.test.ts` の `APPROVED_PRODUCTION_DEPENDENCIES` で gate する
- [X] T035 Cleanup/package placeholderだけを置き換える。`scripts/clean-build-output.mjs`ではcleanupをgenerated rootに限定し、`scripts/verify-package-files.mjs`ではpackage契約が依存する2つのpackage entry point—devframe hostが配信する`dist/public/index.html`、およびNode bundleの`dist/cli.mjs`—を検証する。Buildのpipelineはclean → nuxt build → tsdownであり、build時のasset manifestは存在せず（devframe hostによりsupersede、2026-07-22）、各scriptはexecution environmentが確認を完了できない場合に安全に失敗する
- [X] T036 Server/package placeholderだけを置き換える。承認済みの正確な7つの直接production dependency—`devframe`、`gunshi`、`jsonc-parser`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`—という集合を`package.json`と`pnpm-lock.yaml` closureから`tests/package/production-graph.test.ts`でassertし（別のproduction-graph scriptやevidence fileは存在しない）、T003でscaffoldしたfixed Node ESM CLI entryを保持する *（superseded 2026-07-23: locked版versionとregistry integrityのassertionは削除した。commit済みlockfileが両方を既にpinしており、testで再記述してもlockfileを二重化するだけである）*
- [X] T037 2026-07-22のsplit決定が要求する2つのindependent sequenceに対するdeterministic generation constructionを実装する。Repository sequence（`RepositoryScanGeneration`、kind `bootstrap` | `repository-scan`）は、captured invocation `cwd`/`--root`から選択されたexact enabled idle non-authorizing Repository Sourceをstable source ID、empty files/Diagnostics、null request ID、I/O 0件で含む`createBootstrapGeneration`の同期generation 0から始まり—他のgeneration-0 shapeはrejectする—`prepareNextRepositoryGeneration`でadvanceする。Global sequence（`GlobalScanGeneration`、kind `global-enable` | `global-scan`）は、generation 1として作成する`createGlobalEnableGeneration` commitからdisableがdiscardするまでだけ存在し、`prepareNextGlobalGeneration`でadvanceし、disable commit kindを持たない。各commitは自sequenceのgeneration-owned file IDだけをrekeyして他sequenceに触れず、sessionは`committedRepositoryGeneration`とnullableな`committedGlobalGeneration`を保持してsnapshotに`repositoryGeneration`/`globalGeneration`を公開する。Admitted statusからsuccessful generationまでone request IDを保持し、coordinator-locked serialization、atomicなper-sequence N+1 replacement、explicit-rescan stale retention、失敗したrequestのerror messageを持つSourceのstale overlayとしてのaccepted-job failure retention（`failScan(scanRequestId, message)`）、startup rejectionのprocess top-level propagation、authority revocation後のcleanup-only late-result discardを`src/server/session/scan-generation.ts`、`src/server/session/stale-failures.ts`、`src/server/session/session.ts`に実装する *(superseded 2026-07-22: 旧来のmutation前overflow rejection句はdefensive-check削除で除去された — runtime overflow guardは存在しない。)*
- [X] T038 devframe application定義とhostの配線を`src/server/host/devframe-app.ts`に実装する: 製品の`id`/`name`と`cli: { distDir: 'dist/public', auth: false }`を持つ`defineDevframe`によってdevframeがbuild済みSPA shellを配信しloopback bindingの背後で認証なしに動作し、session API契約（contracts/http-api.md）に従い`setup`内で`agent-customization-inspector:` prefixのsession RPC functionを登録し、CLIから`createDevServer`（`devframe/adapters/dev`）でstartupしてport/host/browser openをdevframeが所有する。Throw/rejectされたRPC handler errorはdevframeがそのままserializeし、失敗したrequestはacceptance前ならcreated job/ID・result body・generationなしに実際のerrorを報告し、acceptance後はretained accepted-job errorをsession snapshotのstale overlay経由で公開する。Delivery failureをpartial化せず、commit済みsnapshotを維持する
- [X] T039 inspection traversalとNode.js-only package-policy suiteのCI実行を`.github/workflows/ci.yml`に追加する

---

## フェーズ 3: 起動可能な認可済み空画面

**目的**: Repositoryを読み取らずに、最初のuser-visible product incrementを提供する。

**独立テスト**: Host起動またはbrowser openingより前に、generation 0がcaptured invocation `cwd`/`--root`からlexicalにselectedされたexactly one enabled idle Repository Sourceをstable opaque `sourceId`、escaped non-authorizing boundary、empty files/Diagnostics、null `scanRequestId`、filesystem I/O 0件で同期的に構築することを検証する。その後packageをinstallし、fixture invocation `cwd`からoptional `--root`あり/なしでlaunchしてautomatic startup scan後にprinted loopback URLを開き、browserがcommit済みのReady Repository Sourceをescaped non-authorizing boundaryおよびempty files/Diagnosticsとともに表示することを検証する。

**目に見えるチェックポイント**: Browser screenが起動し、product contentはほぼ何も表示されない。

### テスト先行

- [X] T040 [P] [US1] devframe dev serverに関するfailing host startup contractを追加する: `cli.distDir`（`dist/public`）からbuild済みSPA shellをdevframe所有のstatic handlingと`auth: false`で配信し、loopbackだけにbindし、startup documentation/network accessが0件で、customization contentをclassifyしないこと、およびexactな宣言済み`engines.node`と`bin: dist/cli.mjs` package fieldが成立することを検証する。Ownerless automatic-startup throw/rejectionがproduct liveness guarantee、捏造されたDiagnostic、scan resultへ変換されず通常どおりprocess top levelへ到達することを`tests/contract/host-startup.test.ts`で証明する
- [X] T041 [P] [US1] devframe RPC channelを通じた`get-session` invocationと、そのexactなrequest token/`clientDataEpoch`/sequence別generation/`globalContentEpoch` guardのfailing client testを追加する。全inspection-data successはcaptured epochを持ち、final response gateでepoch不変かつ`globalDisableInProgress` nullの場合だけrenderする。いずれのresponseでもgreater epochまたはnon-null fenceを観測したらrender前にshared full client-data purgeを行うことを要求する。（session-liveness probeを削除した。productは2枚目のbrowser tabをmodelしないため、probeが唯一担っていたこと——他tabのGlobal disableを能動的に観測すること——には要件が無い。host喪失はloopback socketのcloseとしてdevframeが問い合わせなしにpageへ報告し、全responseは引き続き採用済みepoch/fenceに対してcheckされる。`get-liveness`、`LivenessProjection`、focus/blur listener、page-lifecycle purge/refetch、旧`src/app/session/liveness.ts`は削除した。File ID guardはT096/T102のfile-detail clientで追加する。）Lateなresolve/reject settlementを拒否し、older/equal/newer generation、persistence 0件、Phase 3 session API catalog外のcall 0件も`tests/unit/app/api-client.test.ts`で検証する
- [X] T042 [P] [US1] Generation 0 snapshotをadoptし、page-lifecycle listenerを一切設置せず、経過時間またはidle pageからrequestを発行しないbrowser-state testを追加する。（page-lifecycle eventはpurge triggerではない。FR-027はdocument-liveness failureまたは同等のterminal reset後にpurgeするもので、tab切り替えもページからの離脱もそのどちらでもない——破棄されたdocumentは自分のmemoryを解放し、bfcacheに入ったdocumentが保持するのは同じユーザーが自分のマシンで自分のファイルを見た状態にすぎない。Visibility/unload listener、visible復帰時の再取得、liveness DTO/check、およびそのtestを削除した。）Transportが報告するchannel lossまたはcurrent RPC rejectionがshared purgeを実行してended viewへ入り、そのpurge前にcaptureしたsettlementを拒否することを要求する。Shared purgeが登録済みdisposerをすべて同期的に呼び、clear後に`clientDataEpoch`をadvanceし、unregister済みdisposerを呼ばないこと、polling interval/request timeout/retry timer/memory leaseを定義しないこと、continuously idleなpageにproduct定義のwall-clock process-loss checkがないことを`tests/unit/app/session-view-state.test.ts`と`tests/unit/app/client-data.test.ts`で証明する
- [X] T043 [P] [US1] Root `define`/`cli` API、positive default-trueの`open`/生成される`--no-open`、反復指定をparserのlast valueへ解決するoptional `--root <path>`のGunshi CLI/packaged launch testを追加する。`process.cwd()`を正確に1回captureし、省略時はそのexact invocation文字列を保持する。絶対optionはそのまま保持し、相対optionはlexicalな`node:path` operationだけでcaptureしたinvocation directoryに対して解決する。Selection自体のfilesystem/network I/Oを0件にし、`process.chdir()`を決して呼ばず、明示的なempty valueをsession作成やbrowser openingより前にfixedでactionableなsource-value-free出力で拒否し、valueの欠落はGunshiのtyped argument validationで拒否する。`process.cwd()` throwを注入し、session・browserなしのordinaryなownerless process-top-level propagationを要求する。Non-binding help/version、厳格なunknown/positional/rest rejection、awaited host startup、正確なpackage field、closed loopback URLとprinted-URL fallback、無関係なworking directoryからのbuilt shell配信、調査対象fixtureが変更されないこと、graceful shutdownを`tests/unit/cli.test.ts`と`tests/package/npx-launch.test.ts`でカバーする。このPhase 3 package testにおける「isolation」は無関係なworking directoryだけを意味する。Packed tarballからのinstallと、inspection由来valueがbrowser openingへ到達しないことを含むcomplete packed-entry/default-browser/helper/environment instrumentationはT917が所有する。
- [X] T044 [US1] Packaged boot shellがexact one enabled Repository Source、そのescaped non-authorizing selected-root label、empty files/Diagnosticsを表示し、keyboard focusを先頭に置き、Repository picker/ancestor discoveryを提供しないこと、およびtransportが報告するhost喪失が操作なしにrender済みSourceをpurgeしてsessionを終了させることを`tests/e2e/boot.spec.ts`でbrowser acceptanceとして検証する。（bootstrap generation 0はpageからは観測できない——automatic first Repository scanは同じlaunchで開始するため（FR-002）、そのsynchronousなidle/null `scanRequestId` shapeは`tests/unit/session/session.test.ts`と`tests/contract/host-startup.test.ts`が引き続き所有する。別hostが応答した後のfresh-session recoveryも、devframe RPC socketがhost喪失後に再接続しないため到達不能である。したがってbrowser suiteは到達可能なsession-ended pathだけを扱い、session-identity mismatch branchは`tests/unit/app/api-client.test.ts`で駆動する。）

### 実装

- [X] T045 [US1] devframe host により supersede（2026-07-22）: build 済み shell の static asset 配信、SPA fallback、media type は、`src/server/host/devframe-app.ts`（T038）で設定する `cli.distDir`（`dist/public`）を通じて devframe が所有する。手書きの static-file module も build 時の asset manifest も存在しない
- [X] T046 [US1] 直接実行されるCLIのloopback host startup boundaryを実装する（Node.js互換性はpacked `engines.node` rangeの宣言とpackage managerのenforceに委ね、runtimeでは再検査しない）。Automatic inspected-source workを含む全ownerless startup throw/rejectionは捏造されたDiagnosticやliveness guaranteeを作らず通常どおりprocess top levelへ到達させる。Loopbackにbindしたdevframe dev server（`createDevServer`）を起動し、epoch、fence、Diagnostic、retainされたstale-failure errorを伴うsession snapshotをsession RPC channel経由で公開し、startup documentation/network access 0件を`src/server/host/devframe-app.ts`で保証する
- [X] T047 [US1] positive default-true `open`、生成される`--no-open`、反復指定をparserのlast valueへ解決するoptional `--root <path>`を持つGunshi root `define`/`cli` entryを実装する: validation前に`process.cwd()`を1回captureし、省略時はその正確な文字列を使う。絶対optionはそのまま保持し、相対optionはlexicalな`node:path` operationだけでcaptureしたinvocation directoryに対して解決する。検証済みpackage bootstrapの後、selection自体はfilesystem/network I/Oを0件にし、`process.chdir()`を決して呼ばず、明示的なempty入力をsession/browser作成前にfixedでactionableな出力と非zero exitで拒否し、valueの欠落は同じboundaryでGunshiのtyped validationに委ねる。`process.cwd()` throwはsession・browserなしで通常どおりprocessのtop levelへ伝播させる。厳格なunknown/positional/rest rejection、awaited completion、non-binding help/version、root-only import、closed loopback URL、fixed OS browser helper、正確なambient allowlistとinspection由来入力の除外、使用可能なprinted-URL fallback、graceful shutdownを`src/server/cli.ts`で保持する（fixed OS browser helperとそのbest-effort semanticsは`createDevServer`を通じてdevframeが所有するため（contracts/http-api.md § Host requirements #4）、product側にbrowser-launch moduleを置くとduplicated policyになる。`--root`のmissing valueも同様にparser自身のtyped validation errorであり、commandはGunshiが受理するempty valueだけを`ctx.explicit`で検出して拒否する。）
- [X] T048 [US1] Phase 3の`get-session` API clientをdevframe RPC channel上に、exact request token、abortable-request bookkeeping、`clientDataEpoch`/sequence別generation/`globalContentEpoch`/session identity/fence adoption guardとともに実装する。Inspection-data successをrenderする前にcaptured epochがcurrentかつ`globalDisableInProgress` nullであることを要求する。Greater epochまたはnon-null fenceではrender前にshared full purgeを行い、staleなresolve/reject settlementをすべて拒否する処理を`src/app/session/api-client.ts`に実装する。（このmoduleは`composables/`ではなく`src/app/session/`に置く。Closure-localなrequest stateを扱うplain factoryを1つexportするだけでreactivityを持たず、Vue composableではないため`composables/`は実態を誤って説明する。名前もAPIのどちら側の実装かを述べるものにする。Control-only fence recoveryはT1027、file-detail ID guardはT096/T102へdeferする。）
- [X] T049 [US1] Channel failure、session identity loss、greater `globalContentEpoch`、non-null fenceに対するPhase 3のshared synchronous full client-data purgeを実装する。Listenerは設置せず、polling interval、request timeout、retry timer、memory lease、liveness probe、page-lifecycle purgeを使わない。Outstanding requestを、現在実装済みのbrowser-owned session snapshot、inventory/Source/file/Diagnostic graph、retained errorのclear前にabortし、その後`clientDataEpoch`をincrementしてstale settlementによる復活を防ぐ。Transportが報告するchannel lossを直接ended viewとして採用し、API clientのrequest token、epoch、generation、identity、fence guardを通ったinitial full snapshotだけをrenderする。このstateと1言語のboot/ended copyを`src/app/session/client-data.ts`、`src/app/session/view-state.ts`、`src/app/App.vue`、`src/app/styles/main.css`に実装する。（reactive browser view stateは`src/app/session/view-state.ts`の`SessionViewState` classが持つ。Vue composableでもpage frameでもなく、名前が保持する対象を述べている。Shared purgeはimportを持たないdependency leaf `src/app/session/client-data.ts`へ分離した。Global disable送信前purge、control-only `GlobalFenceRecoverySnapshot`、Resume、およびcomparison/editor/filter ownerはT1027と各担当phaseへdeferする。Detail ownerはここで登録する（skill-detail routeが持つstateも他と同じくpurgeされる）。Acknowledgement ownerもwarning ownerもdeferする対象として存在しない。FR-027がどちらも持たないためである。）

---

## フェーズ 4: Codex SKILL 一覧

**目的**: Codex skills を対象に、最初の安全な Repository inventory 単位を提供します。

**独立テスト**: root と入れ子の `.agents/skills/*/SKILL.md`、near miss、link、不正な名前、無関係なファイルを含む fixture から起動し、allowlist 対象の Codex skill row だけが path、source、kind、tool とともに表示されることを検証します。

**目に見えるチェックポイント**: Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。

### fixture とテストを先行

- [X] T050 [US1] Positive、nested、near-miss、malformed-name、linked、empty、secret-bearing、performance の各 Codex SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する。Throw または reject する operation は tree ではないため fixture を持たない: それを必要とする suite は `fs-io` module mock で operation 自体を、その case が対象とする正確な呼び出し地点で置き換える。Materialize した directory ではそれを表現できない
- [X] T051 [US1] Codex skill の behavior、rule、strategy、evidence の conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [X] T052 [P] [US1] 安定した reciprocal ID、閉じた matcher/traversal/derivation kind、typed program として author する literal/regex/non-adjacent-recursive token grammar（selector text の parse はなし）、immutable で versioned な `TraversalPlan` output、evidence grammarと規範的なofficial-sources rowへの解決、registry/compiler の失敗契約を `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する。Production 除外はそこでは証明できない: citation はそれを運ぶ record 上にあり、import graph が両者を分離しないため、値が消えていることを示せるのは build 済み artifact だけである。`tests/package/verify-package-files.test.ts` がその assert を所有する。`semanticFingerprint` の再計算は本 task の範囲外とする。Maintainer 専用の drift command が捕捉するまで fingerprint は存在しない（T1032）
- [X] T053 [P] [US1] `['.agents', 'skills', ANY_NAME, 'SKILL.md']`（選択されたrootに固定し、先頭の`ANY_DIRECTORIES`を持たない。Codexはworkingディレクトリからrepositoryルートへupwardにscanしdescendしないためである（FR-001）） が typed plan へ一度だけ compile され、安全な filesystem はその plan だけを実行し、vendor code は match の分類だけを行い、descendant/near-miss/VCS 動作が正確で、runtime-chain fact が引き続き conditional であることを証明する Codex SKILL の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [X] T054 [P] [US1] tool、`skill` kind、path provenance、無関係な recognition がないことに関する Codex recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T055 [P] [US1] captureした`cwd`/`--root`からlexicalに選択済みのgeneration-0 Sourceから始まるRepository scanのfailing testを追加する: その安定`sourceId`、escapeされたboundary、enabled idle状態、空のfiles/Diagnostics、null request IDはfilesystem I/O 0件で同期的に存在し、scanは保持されたraw selected rootを読む。raw path segmentがfilesystem operandのままであり、それを`/`でjoinした綴りが公開identityであること — 見た目が同じにrenderされ得る2つのraw綴りは2つのordinary fileとして公開されること、hard linkが通常のfileであること、symlinkされたcandidateはtargetを通して読まれbroken linkは`file-unreadable` Diagnosticになること、消えたか読めないfileは`file-unreadable` Diagnosticになり影響のないfileはpartial generationとして公開されること、読めないrootはsource-scoped `root-unreadable` Diagnosticでattemptをfailさせpartial inventoryを公開しないこと、単一fileに閉じないfailureはresult/generationなしでattemptを中止し、失敗したrequestのerrorとして通常どおり報告されるかownerless-startup top-level propagationになることを検証する。atomic recognition、last-commit retention、revocation、verdictなし、relationship-target read 0件も`tests/integration/repository-scan.test.ts`でカバーする *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T056 [P] [US1] `--no-open`またはisolated startup helper後に開始するinstrumentationを使う。Local fixture rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。発行済みのexactな`localhost` authorityにおける2つのexactなFR-022 authorized internal loopback class、すなわちpackaged UI assetへのstatic/SPA `GET`/`HEAD`とlocal session API channelを別々に分類・検証する。それ以外の全surfaceについて、Codex SKILL discoveryがchild process、dynamic evaluation/import、MCP connection、禁止対象のdirect product-issued outbound request、URI load、mutation-capable open/filesystem mutationを発生させないことを証明する。Content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL stateを比較し、OS-only atimeは別に記録する。対象は`tests/integration/security/zero-activation.test.ts`とする
- [X] T057 [P] [US1] Generation 0のexactなRepository Sourceと`process-cwd`/`root-option` boundary origin、session API契約（contracts/http-api.md）のsession snapshot invocation、Repository rescan admissionのfailing contractを追加する。Normal inspection-data successは`globalContentEpoch`と両方のsequence generationを持つ。FenceはここではScope外であり、このphaseを通してnullのままである。Fenceを立てるGlobal disableが存在しないため、recovery-onlyなsession responseと`global-disable-pending` conflictは検証対象を持たない。T1018がそれらを、それらを到達可能にするdisable functionとともに実装する。Exactなpre-/post-acceptanceのordinary-error挙動（accept前のrejectionはrequestの実際のerrorで失敗しjobなし、accept済みjobのfailureは保持snapshotをそのerrorとともにstaleにする）、startup ownership、request correlation、deterministicなfirst-scan対explicit stale behavior、stale IDを`tests/contract/http-api-session.test.ts`で検証する
- [X] T058 [P] [US1] Codex row、`SourceBoundary.displayRoot`と`origin`からrenderするescape済みでinertなRepository root labelを全Source-relative item pathと区別しnavigation/read locatorとして再利用しないこと、source/path/kind label、progress、empty state、rescan、retry、diagnostics、およびsession summaryがsource textを一切露出しないこと *(2026-07-29 修正: summaryはdeclared valueを1つだけ運ぶ — skillの宣言済み名で、FR-007/T1064がpresentation identityと定義する。他のauthored valueはすべてdetail routeの内側に留まる。)* に関するinventoryの失敗テストを`tests/unit/app/inventory.test.ts`に追加する（2026-07-25 amended: これらのassertionはcomponentをmountせず、filter composableとsession view stateを直接駆動する。unit projectにはsingle-file-component compilerがなく、追加するとT001がgateするapproved dependency baselineが変わるためである。renderされたpageを本当に必要とする2点 — escape済みroot labelがすべてのSource-relative item pathと区別して提示されること、およびnavigation/read locatorとして提供されないこと — は`tests/e2e/codex-skills-list.spec.ts`（T059）で実際のpageに対して検証する。）
- [X] T059 [US1] Codex 専用 fixture を起動し、source content を含まない正確な SKILL 一覧が表示されることに関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-list.spec.ts` に追加する
- [X] T060 [US1] Reciprocal behavior/rule referenceと、各recordのcitationが規範的なofficial-sources rowへ解決することに関するCodex skill registry-graph coverageに加え、sole `EvidenceAssessment[]` assembler contractの失敗テストを追加する。Owning ruleと参照する全behavior/strategyをresolveし、`(subjectKind, subjectId)`ごとにexact subject recordを正確に1件copyし、missing/duplicate subjectをrejectし、fixed subject-kind/ID orderでsortし、scalar/worst/qualifier-union reductionを禁止することを`tests/contract/vendor-behaviors.test.ts`と`tests/contract/inspection-rules.test.ts`で証明する

### 実装

- [X] T061 [US1] Registry recordを実装し、closed matcher/traversal/derivation grammarをT030で定義済みの`TraversalPlan`/segment-program typeへwidenせずcompileする。Closed typed segment grammar（非隣接recursionを含む）、reciprocal validation、one-edge derivation acyclicity、official-source evidenceを除外するproduction loading、およびnatural-language interpretation/ranking、customization correctness/validity/compliance/effectiveness/quality verdict、validation/lint、remediation/fix behaviorを表現不能にするallowlisted structure-only projection vocabularyをenforceする。`src/server/inspection/rules/registry.ts`ではT060がtestするsole `EvidenceAssessment[]` assemblerを実装し、owning ruleと参照する全behavior/strategy subjectをresolveし、各exact subject recordを1回copyし、missing/duplicateをrejectしてfixed subject-kind/ID orderでsortし、recognizer/relationship/fact projectionが再計算・縮約せずconsumeできるarrayを公開する。Shared plan typeはregistryとともに`src/server/inspection/rules/registry.ts`へ保持する
- [X] T062 [US1] 読み取り権限を付与しない `codex.behavior.repo.skills`/`codex.behavior.user.skills` statement を、完全な base skill-discovery strategy とともに追加し、この milestone で production registry を閉じたままにする。Registry は vendor ごとに 1 ディレクトリで配置する: `src/shared/registries/<tool>/` が `behaviors.ts`、`strategies.ts`、`rules.ts`、`relations.ts` を持ち、record の形とそれらを公開する aggregate は `registries/` 直下に置く。Registry 間の参照は record の field ではない — `relations.ts` の意味のある名前の edge（`basedOnBehaviors`、`explainedByStrategies`、`consumesBehaviors`）に置き、edge は identifier ではなく参照先 record を保持するため、relation を読めば名指された当のものへ直接たどり着く。Behavior は outgoing edge を持たないため、graph は behavior ← strategy ← rule の DAG になる。Edge が record を保持できるのは非循環だからであり、循環をまたぐ `const` 参照は module 評価時に失敗する。`InspectionRule.policyRefs` は他 registry ではなく spec.md の clause を指すため record 側に残す。識別子は `identifier-types.ts` の closed union なので、各 aggregate の網羅性は証明され、参照はコンパイル時に検査される。Citation も edge ではない: 各 record が自身の citation を `evidence` 配列に書き、`tsdown.config.ts` が `__ACI_SHIP_MAINTENANCE_DATA__` で `locator: VendorLocator | null` とともに packaged CLI から compile 除去する — どちらも DTO field が運ばず、この置換は黙って失敗しうるため package suite が build 済み artifact に両方とも含まれないことを検査する。`activationConditions` は全 build に残す: `ConditionFact.key` は FR-039 が publish を要求する wire type である。data-model.md/.ja.md § RegistryRelations、plan.md/.ja.md § Project Structure、`tests/fixtures/conformance/relations.json` は本 task に含む。
- [X] T063 [US1] 読み取りを認可する `codex.repo.skill` record を `src/shared/registries/inspection-rules.ts` に追加する（2026-07-25 amended: matcher は先頭に `recursive-directories` step を置くのをやめ、Repository root に anchor した `['.agents', 'skills', ANY_NAME, 'SKILL.md']` とする。Codex の skill scan は runtime working directory から repository root へ*上向き*に走り、下降しない。そして selected root がその repository root なので、先頭 recursive step は agent が決して読まない nested `.agents/skills` を inventory していた。FR-001 にこの同一視を明記し、option は `--cwd` ではなく `--root` と綴る。名指しているのが working directory ではなく repository root だからである。これにより admit する集合は狭まる: nested な `packages/api/.agents/skills/deploy/SKILL.md` は positive case から near miss へ移り、performance fixture の bulk skill は admit される唯一の skills directory 内の sibling へ移した。spec.md/.ja.md の FR-001、inspection-path-allowlist.md/.ja.md の § Structured Inspector matcher notation・§ Repository selector requirements・§ Common conformance requirements、data-model.md/.ja.md の § StructuredInspectorMatcher と不変条件 13、および Codex ベンダー契約（両言語）の `codex.repo.skill` 行を同じ変更で更新した。Global scope も読み取り権限も変わらないため、consent-bound contract version は据え置く。）
- [X] T064 [US1] Codex skill の evidence record を、`src/shared/registries/codex/` の behavior・rule・strategy record 自身の `evidence` citation として追加する。Evidence は専用の registry module を持たない: 維持対象の各 record が review 済み URL・見出し・review 日・paraphrase を `evidence` 配列に書くため、根拠が 2 hop 先ではなく主張の隣に置かれる。Page ごとの規範的な 1 row は contracts/official-sources.md に残る。`tsdown.config.ts` は `__ACI_SHIP_MAINTENANCE_DATA__` define で、それらの citation を `locator: VendorLocator | null` とともに packaged CLI から compile 除去する — どちらも DTO field が運ばず、公開される condition fact は behavior を ID で名指すからである。この置換は黙って失敗しうるため、package suite が build 済み artifact に含まれないことを検査する。`activationConditions` は全 build に残す: `ConditionFact.key` は FR-039 が公開を要求する wire type である。Vendor の evidence 追加は、その vendor の record に citation を書くことを意味する。data-model.md/.ja.md § EvidenceCitation が governing section である。
- [X] T065 [US1] vendor 所有の walker や selector 再解釈を使わず、registry で compile された `codex.repo.skill` plan に対する Codex skill classification を `src/server/inspection/rules/codex.ts` に実装する
- [X] T066 [US1] parsing や source exposure を行わず、path-derived Codex skill recognition を `src/server/inspection/recognizers/codex.ts` に実装する
- [X] T067 [US1] generation-0の表示boundaryではなく保持されたraw selected rootから、compile済みT030 `TraversalPlan` workをtraversal moduleへ送りその型付きfile単位resultを消費するRepository scan orchestrationを`src/server/inspection/scan.ts`に実装する。raw operandを`/`でjoinした公開pathとして保持するが、directory列挙とfile読み取りはT029/T031に基づき`src/server/inspection/traversal.ts`に残す。file限定Diagnostic matrixと決定論的partial outcome、source-scoped `root-unreadable` failure、単一fileに閉じないfailureの無変更伝播、authority revocation、late discard、verdictなしを`src/server/inspection/scan.ts`でorchestrationする *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T068 [US1] Generation 0 Sourceからautomatic first scanとFIFO explicit rescanを実装し、1つのrequest IDをSource/progress/attempt/generationで保持する。Raw rootだけをadmitし、atomic complete/partialはClosed Scan Publication Outcomesの表に正確に従う。Ownerless startup throw/rejectionはliveness保証なしでprocess top levelへ到達させる。Accept済みexplicit rescan jobがfatalにrejectした場合はprior commitを保持し、失敗したrequestのerror messageだけを`failScan(scanRequestId, message)`経由で参照するstale overlayを作成または置換するが、accept前rejectionはprior snapshotを変更せずstale overlayを作成しない。既存overlayはsuccessful replacementでのみclearし、generation IDをrekeyしてlate workをdiscardする処理を`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`に実装する
- [X] T069 [US1] Deterministic Repository summary/admissionとordinaryなrequest-owned failure lifecycleを`src/server/host/devframe-app.ts`へ実装する。Generation-0 Sourceはexact escaped non-authorizing boundaryとnull request IDを持ち、successful admissionはSource/progress/status/generationをcorrelateする。Pre-acceptance throw/rejectionはrequestの実際のerrorで失敗しjob/retentionを作らず、accepted-job rejectionは失敗したrequestのerrorをnon-null request IDでretainし、捏造されたDiagnostic/result/generationを作らない。Accept済みの明示rescan jobがfatalに終了した場合は必ずそのSourceのstale overlayを作成または置換しなければならず（MUST）、throw/rejectionでは失敗したrequestのerror message（`StaleFailureRef { kind: 'error', message }`）だけを、rootを読めなかった場合はsource-scoped `root-unreadable` Diagnostic（`{ kind: 'diagnostic', diagnosticId }`）を参照する。Pre-acceptance failure、initial scan、initial/retry Global batchはstale overlayを作成してはならない（MUST NOT）。Conflict、stale ID/snapshot、session DTOだけのSource-relative pathを保持する
- [X] T070 [US1] generation-aware な source/tool/kind/Source-relative-path filter、Source ごとの stale marker、retry state、成功した replacement の後だけ行う cleanup を `src/app/composables/filters.ts` と `src/app/session/view-state.ts` に実装する
- [X] T071 [US1] Escape済みでinertな`SourceBoundary.displayRoot`/`origin` root labelをSource-relative item pathから視覚的・意味的に区別しnavigation/read locatorとして使わないaccessibleなRepository header、current/stale snapshot status、active `scanRequestId`のstateだけを表示しolder status/inventoryでnewer commandを満たせないrequest-correlated progress/rescan control、Source-relative-path filter、Codex SKILL list、item summaryを`src/app/pages/index.vue`、`src/app/components/inventory/ScanProgress.vue`、`src/app/components/inventory/InventoryFilters.vue`、`src/app/components/inventory/InventoryList.vue`、そのkindのrow component（`src/app/components/inventory/rows/`）に実装する。自動更新statusにはunderlying scanを停止しないkeyboard操作可能なpause/resumeとon-demand refreshを提供する（2026-07-25 amended: このpageのstatusは自動更新しないため、pause/resume controlは存在しない。Productはtimer、filesystem watcher、inspection dataのserver-initiated pushを定義せず（contracts/http-api.md § get-session）、T042は経過時間によるrequest発行を禁止するため、statusは本taskが併せて要求するkeyboard操作可能なon-demand refreshによってのみ進む。WCAG 2.2.2は自動更新contentに適用されるが、pauseすべきものが存在せず、動かないcontentのためにcontrolを作ることはAGENTS.mdが禁じるspeculative mechanismにあたる。いずれの場合もunderlying scanには影響しない — browserがscanを止めることはない。）
- [X] T072 [US1] actionable diagnostics と Codex scope の empty state を `src/app/components/diagnostics/DiagnosticList.vue` に実装する
- [X] T073 [US1] 英語の Codex inventory、progress、empty-state、retry、boundary message をそれらを描画する Vue component に追加する

---

## フェーズ 5: Codex SKILL 詳細

**目的**: Codex の `SKILL.md` ファイルを、完全で非活性な記述済み source とclosedなallowlist済みtyped metadata として安全に調査できるようにし、別個の物理 candidate である `agents/openai.yaml` はまだ admission しません。

**独立テスト**: malformed、literal credential を含む、changing、metadata-bearing な Codex `SKILL.md` ファイルを開き、正確で完全な source と metadata literal、credential masking または reveal control がないこと、environment reference を解決しないこと、activation なし、relationship expansion なし、close または rescan 時の cleanup を検証します。

**目に見えるチェックポイント**: Codex SKILL を選択すると、完全で非活性な detail 画面が開きます。

### fixture とテストを先行

- [X] T074 [US2] Codex SKILLのfrontmatter、reference、script、command、埋め込みmarkup、credentialのための生成されたmalformed/maintained-secret fixtureを`tests/fixtures/content/build-fixtures.ts`と`tests/fixtures/secrets/build-fixtures.ts`で拡張する
- [X] T075 [P] [US2] byte-decodeのfailing testを追加する: admit済みcandidateのNUL byteは`file-content-binary` Diagnosticを持つdiagnostic-only `binary`となり、source も解決済みの値も comparison も持たず、他の点では公開可能なgenerationをpartialにする。非NULの各fileはUTF-8 replacement semanticsで正確に1回decodeされて読み取り可能な`utf-8`/`utf-8-replaced`になり、先頭BOM 1つは記録のうえ除去され、挿入された`U+FFFD`は完全な`sourceText`と通常のparsing/extraction/displayに残り — extractorとdetail routeを通す端から端までの証明は`tests/integration/repository-scan.test.ts`にあり、comparisonはUS3とともに到着する — それ自体ではscanをpartialにせず、代替charset・retry・sampling・truncationは発生しない。inert Markdown/frontmatter、safe YAML、parseが返す解決済みscalar、document自体をparseできない場合のthrow、scan path上のin-process parsing、単一fileに閉じないfailureに対するdomain変換なしのwhole-attempt中止を`tests/unit/inspection/parsers.test.ts`でカバーする *(2026-07-29 修正: Field は source 座標を持たず（`data-model.md` § Field reading）、entry は parser が解決した値を 1 つ持つため、parser suite が証明するのは parse そのものであって、取得元の text と照合する slice ではない。読み取り可能 source の表示と comparison 適格性を保つ recognition-atomic な `recognition-parse-failed` Diagnostic は、scan が実際にそれを構築する `tests/integration/boundaries/traversal.test.ts` が証明する。)*
- [X] T076 [P] [US2] environment所有のmemory/time capacity (Inspector数値上限なし) のin-process parser-invocation failing testを追加する: 1つのfileに閉じたparse/extraction failure（通常どおりcatchされるparser exceptionを含む）は他のfileを継続させたまま`partial` commitのもとでそのfileの`recognition-parse-failed` Diagnosticになり、fileに閉じないfailureは回復result/generationなしでattemptを中止し、trigger所有の外側boundaryで失敗したrequestのerrorとして通常どおり報告されるかstartup top-level propagationになることを証明する。authority revocationとlate-result破棄も`tests/unit/inspection/seed-parsers.test.ts`でカバーする
- [X] T077 [P] [US2] literal credential、duplicate field、quote/escape/punctuation、environment-reference text、astral と combining sequence が extraction と JSON transport を経ても壊れないこと、process environment lookup なし、masking/reveal artifact ゼロに関する正確な表示の失敗テストを `tests/unit/inspection/declared-values.test.ts` に追加する *(2026-07-29 修正: entry は parser が解決した値を持ち座標を持たないため、case が assert するのはその値と、文字が壊れずに残ることである。field が座標を持たない理由は T090、duplicate key の解決は `tests/unit/inspection/parsers.test.ts`、公開される entry の形は `codex-metadata.test.ts` を参照。suite 名は、既に存在しない occurrence index ではなく、宣言済みの値という対象そのものに合わせる。)*
- [X] T078 [P] [US2] inert frontmatter、閉じた field ID、allowlist field ごとに解決済みの値 1 つ、provenance、conditional discovery、skill resource、environment reference の非解決、evidence に関する Codex metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する *(2026-07-29 修正: case が assert するのは frontmatter parser が解決した値である。authored な `name: 007` は文字列 `7` であり、quote された値は quote の内側の文字列である。それが、その file を読み込む製品の得る値だからである。range も duplicate occurrence の順序も、typed な第 2 の表記も存在しない。field が座標を持たない理由は T090 を参照。)*
- [X] T079 [P] [US2] inferred effective aggregate を作らず、authored、available、selected、omitted、shadowed、disabled、conditional、unknown を投影する applicability の失敗テストを `tests/unit/inspection/applicability.test.ts` に追加する
- [X] T080 [P] [US2] runtime-chain condition、same-name handling、unknown selection fact に関する Codex skill-composition の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [X] T081 [P] [US2] Complete inert authored source、ordered な宣言済み `value`、strict/stale ID、source-value-free Diagnostic、minimum metadataのfile-detail failing contractを追加する。Request-owned operationのthrow/rejectionはそのrequestを実際のerrorで失敗させ、job/result/generation/success bytesを0件とする。Post-commit delivery rejectionはcommitを変更せずsuccess payload 0件、partial化なしであることを`tests/contract/http-api-files.test.ts`で証明する *(2026-07-28 修正: detail 結果は `relationships` 配列を持たない。Relationship は allowlist 行が名前を挙げた authored declaration からのみ emit され、Codex `skill` 行は `codex.skill.name` と `codex.skill.description` の 2 つだけを挙げていてどちらも target を持たないため、shipped recognition は 1 つも生成できず、この release が返しうる全 response で配列は空になる。skill の resource は census が列挙して admit しない recognition の `companionFiles` として公開される。)*
- [X] T082 [P] [US2] session API が reveal・masking・redaction・environment resolution の function を一切登録しないこと、および未登録 operation の呼び出しが client/server state を保持せず失敗することを証明する不在の失敗契約を `tests/contract/http-api-routes.test.ts` に追加する
- [X] T083 [P] [US2] same-origin Monaco、完全な authored source の read-only model、正確な read-only option、非活性な rendering、accessibility、request-token adoption、disposal に関する direct-detail の失敗テストを `tests/package/monaco-assets.test.ts` と `tests/unit/app/source-viewer.test.ts` に追加する *(2026-07-28 修正: unit の assertion は mount した component ではなく `src/app/composables/monaco.ts` に対して実行する。理由は T058 と同じで、unit project は single-file-component compiler を持たず、追加すると T001 が gate する承認済み dependency baseline が変わるため。描画されたページを要する主張は `tests/e2e/codex-skills-detail.spec.ts` で実アプリに対して検証する。)*
- [X] T084 [P] [US2] Browser が authored content をどう保持するかの failing FR-027 test を `tests/unit/app/authored-content.test.ts` に追加する。Mount した component ではなく view state に対して assert する（unit project は single-file component を compile しない。理由は T083 が記録する）: content は書かれたとおり正確に公開され、masking や reveal の claim/control も detail request 前の確認 step も持たず、file を 1 つずつ開くことでのみ到達でき、memory 内にのみ保持される — purge、route 変更、全 file ID を rekey する commit で破棄される。`tests/e2e/codex-skills-detail.spec.ts` は実 page に対して、gate も notice も現れないこと、literal な credential が authored のまま render されることを assert する。*(2026-07-28修正: FR-027は直接表示を要求するようになり — loopback限定sessionでviewer自身のfileを見せる前に立つcontrolは何も守らなかった — suiteはauthored-contentの取扱いtestになった。)*
- [X] T085 [US2] 記述済み content から参照される process environment の read または substitution がゼロであることを含め、parsing、metadata extraction、relationship、detail loading 全体へ zero-activation test を `tests/integration/security/zero-activation.test.ts` で拡張する *(2026-07-28 修正: companion file が決して開かれないことを検証していた case を、読み取り集合そのものの検証に置き換えた。skill 自身の directory ちょうど、各 1 回、その外は 0 件である。directory 形式の customization を全体として読むのは保守者の指示によるもので、同じ変更で仕様も修正した。FR-003、contracts/inspection-path-allowlist.md § Bounded companion census、data-model.md § ToolRecognition、contracts/http-api.md § get-session がいずれもそれを述べる。census が admit しない点は変わらない。companion は rule も recognition も kind も自身の inventory row も獲得しない。)*
- [X] T086 [US2] 直接提示（1 回の操作で content へ到達し、その隣に注意書きが立たないこと）、正確な literal credential と environment-reference text、完全な Codex source、metadata、diagnostics、masking/reveal control の不在、keyboard use、route cleanup、client-data purge、rescan cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-detail.spec.ts` に追加する *(2026-07-29 修正: FR-027 は content の前に何も認めないため、提示は直接とする。T084 参照。)*

### 実装

- [X] T087 [P] [US2] allowlist 対象の frontmatter field ごとに 1 つの解決済みの値を読み、recognition-atomic failure を備えた inert Markdown/frontmatter extraction を `src/server/inspection/parsers/markdown.ts` に実装する *(2026-07-28 修正: この module は format について何も決めない。frontmatter block が存在するかとどこまで伸びるかは `vfile-matter` が決め、block は fence を含めて丸ごと YAML parser へ渡す。`---` は YAML 自身の directives-end marker だからである。block を body へ狭める処理は、opening fence の後にどの line terminator が続くか、closing fence が terminator を伴うかをここで測ることを意味していた。これは 2 つの package が既に実装している grammar の手写しであり、しかも何も check できなかった。body はその offset で slice されてから parse されるため、1 単位遅れて読んだ body は `name:` を key `ame` として parse し、そこから取る literal はいずれも parse 対象の正確な slice になる。span も range も持たない。T090 を参照。)* *(2026-07-28 修正: この module は frontmatter block を読む YAML semantics を選び、`vfile-matter` が parse した結果を返すだけとする。以前は fence と行終端の形を測って block の body を特定し、その body を再 parse していた。これは package が既に実装している grammar の手写しであり、しかも誰も check できなかった。body はその offset で slice されてから parse されるからである。`logLevel: 'silent'` も併せて削除した。warning だけでなく parse error も破棄するため、まったく読めない document が recognition を fail させず best-effort な値として返ってきてしまう。)*
- [X] T088 [P] [US2] root field ごとに 1 つの値を解決し、document を parse できないときは recognition 全体を failure にする atomic な YAML 1.2 core-schema 読み取りを実装する *(2026-07-29 修正: `src/server/inspection/parsers/yaml.ts` は存在せず、alias の拒否も存在しない。declared value を parser が解決した値とした時点で、`vfile-matter` — YAML 1.2、core schema — が既にそれを生成しており、同じ block の 2 回目の parse に付け加えるものは残っていない。alias は値の書き方の一部であり、parser は他の syntax と同じく解決する。alias を拒否するはずだった module は、どの entry も持たない正確な authored slice のために node range を読むために存在した。綴りが必要な reader は、detail surface が提供する完全な `sourceText` を読む。)*
- [X] T089 [US2] Environment-owned memory/time capacity（Inspector数値上限なし）でscan path上のin-process parser invocationを実装する。1つのfileに閉じたparser failureは通常のexceptionとしてcatchし、そのfileの`recognition-parse-failed` Diagnosticの背後でそのrecognitionのextraction全体を破棄して`partial` commitとする。fileに閉じないfailureはscan domainでcatch、cause分類、retry、Diagnostic、recovered/partial result化せず変更なしに伝播させ、authority revocation/late discardを実装し、ordinaryなrequest-owned failure報告またはstartup top-level propagationはouter ownerに限定する。対象は`src/server/inspection/parsers/`とする *(2026-07-28 修正: runner は internal occurrence list を持たない。extractor は publish 対象の entry を返し、recognizer は declared name をそこから読む。1 回の parse が両方を賄う。)*
- [X] T090 [US2] Allowlist field ごとに、その parser が解決した値を持つ entry を 1 件公開する。source 座標も、occurrence ごとの entry も、その値の 2 つ目の typed な表記も持たず、credential detection も environment resolution も行わない *(2026-07-28 修正: entry が運ぶのはその file を読み込む製品の得る値であるため、field は validate する span も schema 全体に対する typed union も必要としない。Slice するのと同じ text で測った測定は、誤った測定も正しい測定と同じく round-trip する — frontmatter body を 1 単位遅れて読むと `name:` は key `ame` として parse される — そして reader を持つ decode 済み値は row が grouping に使う declared name だけであり、name は string である。`markdown.ts` が何をするかは T087 を参照。)*
- [X] T091 [US2] 閉じたcondition registry、evidence-linked `SourceConditionFact`/`ApplicabilityAssessment` record、決定論的なprecedence projectionを`src/server/inspection/applicability/conditions.ts`、`src/server/inspection/applicability/context.ts`、`src/server/inspection/applicability/precedence.ts`に実装する
- [X] T092 [US2] 新しい strategy ID を追加せず、inventory が所有する Codex skill strategy を detail-time selection、same-name、runtime-chain、condition projection で拡張する処理を `src/shared/registries/runtime-composition.ts` に実装する *(2026-07-28 修正: record は変更しない。`codex.skills.discovery` は detail 時の projection が必要とする 2 つを既に公開している。`skill-resolution.ts` が same-name statement のために読む `operations` と、applicability projection が admitting rule 自身の `conditionKeys` と union する `requiredConditionKeys` である。detail 専用 field の追加は record が既に述べていることの二重化になる。)*
- [X] T093 [US2] 参照される script、asset、任意 path を昇格させない relationship-only の skill-resource policy を `src/server/inspection/rules/codex.ts` に実装する *(2026-07-28 修正: policy とは、ship する registry が何を含まないかである。skill の resource を admit する rule は無く、compiler は matcher を持たない record を名指しで拒否するため、参照された script や asset は candidate になりえない。`codex.relationship.component` record と、それを skip する discovery-class filter は同じ policy を二度述べるだけで挙動を変えない。両者は Relationship を emit する phase と共に到来する。この release で Relationship が 1 件も emit されない理由は T081 を参照。)*
- [X] T094 [US2] 閉じた field ID、allowlist field ごとに解決済み `value` を 1 つ、provenance-scoped な authored/default relationship、conditional applicability、environment reference の非解決、正確な evidence で Codex recognition を `src/server/inspection/recognizers/codex.ts` において拡張する *(2026-07-28 修正: provenance DTO に追加するのは `discoveryClass` と `applicability` のみ。`sourceRefs` は、citation が packaged CLI の持たない maintenance data であり maintained build では値が入り shipped product では空になるため存在しない。`behaviorRefs` と `strategyRefs` は `evidenceAssessments` が既に列挙する subject の言い換えであるため存在しない。`provenanceId`、`order`、derived-seed field は、shipped rule に `bounded-derived-candidate` がなく、shipped strategy が order を documented しておらず、admission を参照する relationship も存在しないため存在しない。`ApplicabilityAssessmentDto` も同様に、response envelope が既に持つ generation を繰り返すだけの `evaluatedFromGeneration` を省き、さらに `strategyRefs` も省く。これは同一 provenance の `evidenceAssessments` が documentation status 付きで既に記録している strategy を、3 度目に列挙するだけだからである。)*
- [X] T095 [US2] byte分類と正確に1回のUTF-8 replacement decodingを`src/server/inspection/scan.ts`に統合する: admit済みcandidateのNULを含む入力はdiagnostic-only `binary`とpartialになり、非NULの各入力は読み取り可能な`utf-8`/`utf-8-replaced`になり、先頭BOM 1つを記録/除去し、挿入された`U+FFFD`を完全なauthored sourceに保持したままresolved-value extraction、atomicなper-recognition parsing、display/comparison、one-edge derivationへそれ自体ではpartial statusにせずに進む。代替decoding・sampling・truncationを行わず、parser/extractor failureは影響を受けたrecognitionの`recognition-parse-failed` Diagnosticに変換し、単一fileに閉じないfailureは通常どおり伝播しcommitなしでattemptを中止する *(2026-07-29修正: extractionはparserが解決した値を公開する — data-model.md § DeclaredMetadataEntry。)*
- [X] T096 [US2] generation-owned な完全な authored source と parser-resolved metadata、request-token adoption 不変条件、file・generation・route・client-data purge・Source removal 時の cleanup を `src/server/session/session.ts` と `src/app/session/view-state.ts` に実装する *(2026-07-29修正: extractionはparserが解決した値を公開する — data-model.md § DeclaredMetadataEntry。)*
- [X] T097 [US2] Strict opaque ID、complete authored-source DTO、ordered parser-resolved metadata、production encoding、Diagnostic、stale responseを持つsession API契約（contracts/http-api.md）のfile-detail functionを実装する。Encoding/serialization throw/rejectionはそのrequestを実際のerror（devframeがそのままserialize）で失敗させ、job/retention/result/generation/success byteを作らない。Post-commit delivery rejectionはcommit不変、success payload 0件、partial化なしとする処理を`src/server/host/devframe-app.ts`へ実装する *(2026-07-29修正: extractionはparserが解決した値を公開する — data-model.md § DeclaredMetadataEntry。)*
- [X] T098 [US2] reveal、masking、redaction、environment-resolution の operation を登録済み session RPC function から不在のままにし、そのような呼び出しが strict な unknown-operation rejection で失敗するよう `src/server/host/devframe-app.ts` を維持する
- [X] T099 [P] [US2] lazy same-origin Monaco、不透明な read-only model、正確な accessibility option、完全な editor/model/subscription disposal を `src/app/composables/monaco.ts` と `src/app/components/inspection/SourceViewer.vue` に実装する *(2026-07-28 修正: entry point が使う 2 つではなく、Monaco の basic language をすべて登録する。読み手が出会う言語は customization 自身の directory の中身で決まるため、手で選んだ list はどの repository に対しても正しくならない。各 contribution は lazy loader を登録するだけで、grammar chunk はその言語の file を開いたときにだけ取得され、worker も起動しない。language *service* は除外したままとする。いずれも worker を伴い、与えられたものを validate するが、調査対象の customization を invalid と示すのはこの product が下さない verdict だからである。JSON と TOML には basic-language grammar が無いため、最も近い純粋な tokenizer を借りる。言語は手書きの拡張子表ではなく Monaco 自身の registry から解決する。research.md/.ja.md § 7 と plan.md/.ja.md も同じ変更で修正した。)*
- [X] T100 [US2] FR-027はsensitive-content noticeもacknowledgement gateも認めない: skill-detail routeはsourceを表示し、それについての statement を表示しないため、このtaskはcomponentもstateも実装せず（T084参照）、`src/app/App.vue`も変更しない — shellはfile contentsを表示せず、そこに置くgateはinventoryの前にも立つことになる。*(2026-07-28修正: FR-027が直接表示を要求するようになったため、このtaskの実装scopeは空になった。)*
- [X] T101 [P] [US2] typed recognition、provenance、applicability、relationship、diagnostic の表示を `src/app/components/inspection/RecognitionDetails.vue` と `src/app/components/inspection/RelationshipList.vue` に実装する *(2026-07-28 修正: `RelationshipList.vue` は存在しない。shipped recognition が Relationship を生成できないため（T081 参照）。allowlist 行が reference を持つ field を備える最初の phase — Claude の `claude.skill.paths`、Copilot の `copilot.skill.context`、Codex の `skill metadata` dependency field — と共に追加する。)* *(2026-07-28 修正: `RecognitionDetails.vue` の隣に component をもう 1 つ ship する。`SkillFileTree.vue` で、directory 形式の customization の directory を表示する。snapshot が既に公開している path（definition 自身の path と `companionFiles`）から構成し、committed file ID へ解決するため、専用の wire shape を必要とせず、scan が読んでいない file を提示することもできない。)* *(2026-07-28修正: 描画される値でcontract識別子であるものは1つもない。rule ID、metadata field ID、behaviorまたはstrategyのID、condition key、closedなstatus値は、いずれもregistry recordまたはwire vocabularyを解決するものであり、自分のファイルを読んでいる人が尋ねた何にも答えない。したがっていずれもunionの隣の表を通して描画する: `src/shared/registries/identifier-text.ts`の`METADATA_FIELD_TEXT`と`REGISTRY_SUBJECT_TEXT`、新設した`src/shared/api-text.ts`で`APPLICABILITY_SUMMARY_TEXT`と並ぶ`CONDITION_FACT_KEY_TEXT`と`CONDITION_FACT_STATUS_TEXT`、`src/shared/entities.ts`の`DOCUMENTATION_STATUS_TEXT`である。`api-types.ts`と`identifier-types.ts`はruntime codeを出荷しないため、表は`*-text.ts` companionに置く。`CandidateProvenanceDto.ruleId`と`EvidenceAssessment.subjectId`は`string`ではなくそれぞれのclosed catalogとして型付けし、それが表の完全性を保つ（FR-007）。)*
- [X] T102 [US2] generation・epoch・request token を認識する skill-detail route を `/skills/<fileId>` として `src/app/pages/skills/[fileId].vue` に実装する。Skill が主題である: 見出しとしての宣言名、product、allowlist 済みの値、その product が使うかどうかについて分かっていること — すべて entry point のもの — の下に directory の file 群が並び、1 つの file の source が表示され、companion の選択は source だけを変える。Parameter が file を名指すのは、skill が自身の名指せる identity を持たないためである。所有する definition は committed inventory に対して解決されるため、skill のどの file への link もその file を表示した状態で skill を開く。Route は viewport に収まり — tree と source は自身の内部で scroll する — 深い recognition は disclosure の背後に置き（applicability の文も含む。shipped rule はすべて同じ `conditional` を投影するためで、投影が異なり得る rule が出荷されたら summary に戻る）、focus は入場時と skill 変更時だけ見出しへ移り、relationship section は描画せず（T081）、file の隣に notice も確認も置かずに file を表示する（FR-027）。Shell は RPC 呼び出しの parameter を転送し、明示的な origin base で接続する。devframe の既定 `'./'` は document path に対して解決され、`/skills/<fileId>` を直接開いた page は接続できないためである。Directory layout が依拠する read boundary は T085 を参照。*(2026-07-28修正: FR-027が直接表示へ移行するのに伴い、このskill主題layoutへ再構成された。)*
- [X] T103 [US2] 英語の Codex detail、literal display、parser、environment reference、uncertainty message をそれらを描画する Vue component に追加する *(2026-07-28 修正: complete-content notice はそこに含まれない。FR-027 は authored content に何が含まれうるかを常時述べる文を禁じており、source viewer は file を説明せずに表示する。T084 参照。)*

---

## フェーズ 6: Codex SKILL metadata 一覧

**目的**: sibling の `agents/openai.yaml` を、`skill metadata` kind を持つ別個の bounded-derived 物理 candidate として admission します。

**独立テスト**: present、absent、orphaned、linked、escaping、duplicated、misplaced な `agents/openai.yaml` sibling を持つ skill を scan し、独立して admission された各 `SKILL.md` seed が固定 sibling target を正確に一つ持つこと、derived seed が禁止されること、target が存在しない場合は candidate を作成しないこと、admission された各物理 candidate を一度だけ読み取ることを検証します。

**目に見えるチェックポイント**: 独立して識別された Codex skill-metadata file を、その seed `SKILL.md` file と混同せずに表示できます。

### fixture とテストを先行

- [ ] T104 [US1] 一つの固定 sibling target に対する positive、absent、orphan、linked、escaping、duplicate、misplaced、derived-seed の Codex skill-metadata fixture を `tests/fixtures/repositories/build-fixtures.ts` に追加する
- [ ] T105 [US1] `codex.derived.skill-metadata` rule、provenance、evidence、`skill metadata` recognition row を `tests/fixtures/conformance/inspection-rules.json` に具体化する
- [ ] T106 [P] [US1] 独立して admission された Codex `SKILL.md` からの単一 bounded-derived edge、literal sibling `agents/openai.yaml`、derived seed の禁止に関する registry の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T107 [US1] 独立して admission された seed ごとに固定 sibling `agents/openai.yaml` target が正確に一つであること、one-edge depth、target 不在時の no-candidate behavior、orphan と derived-seed の拒否、misplaced・escaping・linked candidate を読み取らないことに関する bounded-derivation の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T108 [P] [US1] 別々のfile identity、`skill metadata` kind filtering、seed provenance、決定論的orderのrecognition/inventory failing testを`tests/unit/inspection/recognizers.test.ts`と`tests/unit/app/inventory.test.ts`に追加する
- [ ] T109 [US1] Codex skill-metadata row、seed provenance、orphan の不在、diagnostics、変更されない SKILL row に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-list.spec.ts` に追加する

### 実装

- [ ] T110 [US1] bounded-derived の `codex.derived.skill-metadata` registry record と reciprocal evidence reference を `src/shared/registries/inspection-rules.ts` と 対象registry recordの`evidence` citation に追加する
- [ ] T111 [US1] `codex.derived.skill-metadata` を、独立して admission された seed ごとに固定 sibling target が正確に一つ、one-edge depth、不在時は candidate なし、containment check を行い、orphan・derived-seed・misplaced・escaping・linked-target を拒否するものとして `src/server/inspection/rules/codex.ts` に実装する
- [ ] T112 [US1] seed provenance を持ち、SKILL identity を継承しない path-derived Codex `skill metadata` recognition を `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T113 [US1] 決定論的な one-edge admission、metadata file ごとの一度の read、raw-path aggregation、source-value-free diagnostics を `src/server/inspection/scan.ts` に統合する
- [ ] T114 [US1] Codex skill metadata の inventory kind filter、row、seed summary を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） において拡張する
- [ ] T115 [US1] 英語の Codex skill-metadata inventory および derivation message をそれらを描画する Vue component に追加する

---

## フェーズ 7: Codex SKILL metadata 詳細

**目的**: admission された各 `agents/openai.yaml` candidate に、完全な literal source とclosedなallowlist済みtyped detail を追加します。

**独立テスト**: Valid、malformed、literal credential を含む、changing、throwing/rejecting な metadata candidate を開き、atomic YAML extraction、正確な解決済みの値、seed provenance、stale handling、masking/reveal control または environment-reference resolution がないこと、activation ゼロ、file または generation removal 時の cleanup を検証します。

**目に見えるチェックポイント**: `agents/openai.yaml` を選択すると、所有元の SKILL detail とは別の完全で非活性な detail 画面が開きます。

### テスト先行

- [ ] T116 [P] [US2] allowlist済みfield ID、fieldごとに1つの解決済みの値、seed provenance、unknown field、読み取り可能sourceの表示を保つrecognition-atomicな`recognition-parse-failed` outcome、環境reference非解決、正確なevidenceのCodex skill-metadata failing testを追加する: 1つのfileに閉じないfailureは分類・retry・generationなしにattemptを中止し、prior commitと所有する外側boundaryのlifecycle挙動だけを残すことを`tests/unit/inspection/codex-metadata.test.ts`で証明する
- [ ] T117 [P] [US2] Skill-metadata literal、stale ID、client retention 0件、absent reveal functionのfailing file-detail contractを追加する。Request-owned operationのthrow/rejectionはそのrequestを実際のerrorで失敗させ、job/result/generation/success bytesを0件とする。Post-commit delivery rejectionはcommit不変、success payload 0件、partial化なしを`tests/contract/http-api-files.test.ts`で証明する
- [ ] T118 [P] [US2] metadata の command、asset、resource、script、URI、任意 path に対する zero-activation と relationship を追跡しないことの失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T119 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal skill-metadata detail、seed provenance、diagnostics、detail-state cleanup、keyboard use、rescan cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-detail.spec.ts` に追加する

### 実装

- [ ] T120 [US2] allowlist 対象 `agents/openai.yaml` field、正確な解決済みの値の抽出、seed applicability、relationship、diagnostics、evidence で Codex recognition を `src/server/inspection/recognizers/codex.ts` において拡張する
- [ ] T121 [US2] skill metadata に対する atomic YAML extraction、field ごとに 1 つの解決済みの値、relationship-only target、snapshot 構築後の raw-byte disposal、generation-owned detail cleanup を `src/server/inspection/scan.ts` と `src/server/session/session.ts` に統合する
- [ ] T122 [US2] skill-metadata field と seed provenance に対する typed detail presentation を `src/app/components/inspection/RecognitionDetails.vue` と `src/app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T123 [US2] 英語の skill-metadata detail、正確な解決済みの値の保持、relationship、uncertainty message をそれらを描画する Vue component に追加する

---

## フェーズ 8: Claude SKILL 一覧

**目的**: 完了済みの Codex 一覧と詳細を回帰させず、Claude skills を追加します。

**独立テスト**: `.claude/skills/*/SKILL.md`、near miss、link、duplicate name、Codex skills を含む fixture を起動し、期待される Claude row、変更されない Codex behavior、symlinked candidate が target を通して透過的に読まれることを検証します。

**目に見えるチェックポイント**: Claude と Codex の SKILL 一覧が同じ inventory に共存します。

### fixture とテストを先行

- [ ] T124 [US1] root/nested Claude skill、near miss、重複名、Codex保全case、targetを通して読まれるsymlinked candidate、`file-unreadable` outcomeになるbroken linkでRepository fixtureを`tests/fixtures/repositories/build-fixtures.ts`に拡張する
- [ ] T125 [US1] 後のskills-directory factを追加せずに、base `claude.behavior.repo.skills`とそのrule/strategy/evidence行を`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`にmaterializeする
- [ ] T126 [P] [US1] `claude.repo.skill`、1つの直接skill-name child、descendant inventory、ancestor/lazy不確実性、cycle-safe traversalで解決済みtargetを通して行うsymlinked candidateの透過的inspectionのfailing contract/matcher testを`tests/contract/inspection-rules.test.ts`と`tests/unit/inspection/rules.test.ts`に追加する
- [ ] T127 [P] [US1] tool、kind、path provenance、rule 外で filename-only recognition を行わないことに関する Claude recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T128 [P] [US1] 既存の Codex result を変更せず、safe-filesystem boundary も弱めずに Claude skill が追加されることを証明する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T129 [US1] Codex と Claude の SKILL 一覧を含む incremental session のブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-list.spec.ts` に追加する
- [ ] T130 [US1] reciprocal behavior、rule、evidence、affected-contract reference に関する Claude skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T131 [US1] 読み取り権限を付与しない `claude.behavior.repo.skills`/`claude.behavior.user.skills` statement を完全な base lookup strategy とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [ ] T132 [US1] 読み取りを認可する `claude.repo.skill` record を `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T133 [US1] Claude skill追加がnon-read exclusion集合を変えないこと—symlinked candidateはtargetを通して読まれるためsymlink exclusion ruleは存在しない (FR-024)—を検証し、Repository registryが文書化された48-ID gateのままであることを`src/shared/registries/inspection-rules.ts`で確認する
- [ ] T134 [US1] Claude skill evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T135 [US1] `claude.repo.skill` matching を `src/server/inspection/rules/claude.ts` に実装する
- [ ] T136 [US1] path-derived Claude skill recognition を `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T137 [US1] 決定論的な Codex result を維持しながら Claude skill classification を `src/server/inspection/scan.ts` に統合する
- [ ] T138 [US1] Claude に対する filter、badge、英語の一覧 message を `src/app/composables/filters.ts`、そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 9: Claude SKILL 詳細

**目的**: generic detail foundation を使用し、完全で非活性な Claude skill detail を追加します。

**独立テスト**: metadata、contained declaration、reference、vendor が対応する symlink、malformed frontmatter、secret を持つ Claude skill を開き、完全な literal detail、exact-launch の skills-directory-plugin applicability fact、解決先 target の content を通して表示される symlinked skill、manifest read authority なし、relationship-target expansion なし、変更されない Codex detail を検証します。

**目に見えるチェックポイント**: Claude SKILL detail が完成し、Codex detail と一貫します。

### テスト先行

- [ ] T139 [US2] `claude.behavior.repo.skills-directory-plugin` を、exact-launch で読み取り権限を付与しない applicability/activation fact とし、その strategy および evidence conformance row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T140 [P] [US2] 正確な 解決済みの frontmatter の値、duplicate key、ancestor/lazy discovery uncertainty、contained declaration、relationship、environment reference の非解決、正確な evidence、および manifest authority ではなく exact-launch applicability/activation fact としての `claude.behavior.repo.skills-directory-plugin` に関する Claude metadata の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T141 [P] [US2] `targetOrigin`、正確なauthored target slice、null-authored documented default、internal semantic normalization、provenance-relative target、boundary status、originating recognitionからのdirectかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejection、target access前のnested/transitive projection拒否、relationship read authority 0に関するfailing testを`tests/unit/inspection/relationships.test.ts`に追加する
- [ ] T142 [P] [US2] vendorがsupportするsymlinked Claude skillがそのtargetを通して調査されること—Claude Codeが読むとおりに解決先fileのcontentが表示されること—と、broken linkがそのfileの`file-unreadable` diagnosticとpartial generationになることを証明するfailing regression testを`tests/integration/inspection-safety.test.ts`に追加する
- [ ] T143 [P] [US2] manifest loading や未知の runtime selection を主張せず、Claude skill selection、exact-launch の skills-directory-plugin applicability、workspace-trust condition、condition reason に関する runtime-composition の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T144 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude detail、uncertainty、relationship、diagnostics、detail-state cleanup、継続する Codex behavior に関するブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-detail.spec.ts` に追加する

### 実装

- [ ] T145 [US2] `claude.behavior.repo.skills-directory-plugin` を、accepted exact-launch SKILL candidate だけに付与される、読み取り権限を付与しない behavior fact として `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T146 [US2] strategy ID または manifest read authority を追加せず、inventory が所有する Claude skill strategy を detail-time selection/condition mapping、exact-launch skills-directory-plugin applicability、workspace-trust fact で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T147 [US2] 新しい source ID を作成せず、skills-directory behavior と strategy から既存の Claude official-source record への reciprocal backlink を 対象registry recordの`evidence` citation に追加する
- [ ] T148 [US2] manifest candidate を作成せず、exact metadata、conditional applicability、exact-launch の skills-directory-plugin fact、relationship、evidence で Claude recognition を `src/server/inspection/recognizers/claude.ts` において拡張する
- [ ] T149 [US2] Atomic Claude extractionとdirect one-hop provenance-scoped Relationshipだけを`src/server/inspection/scan.ts`へ統合し、targetのrecurse/expand/readまたはauthority付与を禁止する。Successful deterministic relationshipはenvironment capacity下でcompleteに保持し、extraction/relationshipのthrow/rejectionはdomainでcatch、cause分類、retry、item/recognition/relationship/derived result/body/generation化せず変更なしにtrigger-owning outer boundaryへ伝播する
- [ ] T150 [US2] vendor-specific source rendering を行わず、Claude 固有 field の typed detail presentation を `src/app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T151 [US2] 英語の Claude detail、uncertainty、relationship、parity message をそれらを描画する Vue component に追加する

---

## フェーズ 10: Copilot SKILL 一覧

**目的**: 対応するすべての Copilot Repository skill path を追加し、一度だけ読み取る multi-tool recognition を確立します。

**独立テスト**: 三つの正確な selector とその negative matrix のすべてについて root および nested context を実行し、`.github` は Copilot-only、`.agents` は Codex+Copilot-only、`.claude` は Claude+Copilot-only であり、admission された各物理 file が一つの item と一度の read になることを検証します。

**目に見えるチェックポイント**: Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。

### fixture とテストを先行

- [ ] T152 [US1] 三つの Copilot selector すべてについて、root/nested の positive/negative fixture、one-direct-child depth、configured-root exclusion、正確な Copilot-only/Codex+Copilot/Claude+Copilot combination を `tests/fixtures/repositories/build-fixtures.ts` に追加する
- [ ] T153 [US1] origin fileを持たない正確な `copilot.behavior.cloud.remote-skills` fact を含む Copilot VS Code/CLI/Cloud skill behavior と、Inspector rule、strategy、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T154 [P] [US1] 三つの正確な selector、direct-child depth、near miss、configured-root rejection、selector を拡大しないことに関する root/nested matcher の失敗テストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T155 [P] [US1] Copilot-only の `.github`、Codex+Copilot-only の `.agents`、Claude+Copilot-only の `.claude`、extra recognition ゼロに関する recognition-matrix の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T156 [P] [US1] matrix row ごとに一つの物理 item と一度の read、決定論的な provenance、root/nested parity、extra-depth rejection、configured-root rejection に関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T157 [US1] 正確な root/nested recognition matrix、物理 file ごとに一つの row、extra-depth/configured-root/extra-recognition row がないことに関するブラウザー受け入れテストを `tests/e2e/copilot-skills-list.spec.ts` に追加する
- [ ] T158 [US1] reciprocal behavior、rule、evidence、affected-contract reference、`copilot.behavior.cloud.remote-skills` の正確な読み取り権限を付与しない ownership に関する Copilot skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T159 [US1] surface-specific Copilot skill statement、読み取り権限を付与しない User/Cloud fact、参照されるすべての base lookup/selection/managed-remote strategy をともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [ ] T160 [US1] 三つの固定 directory に対して読み取りを認可する `copilot.repo.skill` record を `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T161 [US1] `copilot.behavior.cloud.remote-skills` の existing-source backlink を含む、Copilot skill evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T162 [US1] direct-child depth と configured-root rejection を伴う、正確な `.github`、`.agents`、`.claude` skill selector の root/nested matching を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T163 [US1] extra recognition を作らず、正確な Copilot-only/Codex+Copilot/Claude+Copilot recognition matrix を `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T164 [US1] admission された各 matrix file を、一つの verified read と決定論的な multi-tool provenance を持つ一つの物理 item として `src/server/inspection/scan.ts` で組み立てる
- [ ] T165 [US1] Copilot に対する tool filtering と multi-recognition badge を `src/app/composables/filters.ts` とそのkindのrow component（`src/app/components/inventory/rows/`） において拡張する
- [ ] T166 [US1] アクセシブルな multi-recognition summary を `src/app/components/inventory/InventoryList.vue` に追加する
- [ ] T167 [US1] 英語の Copilot 一覧および conditional-surface message をそれらを描画する Vue component に追加する

---

## フェーズ 11: Copilot SKILL 詳細

**目的**: 互換性のない surface fact を維持しながら、完全で非活性な Copilot skill detail を追加します。

**独立テスト**: 三つのすべての directory と共有物理 file から Copilot skill を開き、closed allowlist 内の metadata、分離された surface applicability、progressive-loading uncertainty、winner の主張なし、完全な literal source、変更されない Codex/Claude detail を検証します。

**目に見えるチェックポイント**: Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。

### テスト先行

- [ ] T168 [P] [US2] 解決済みの frontmatter の値、progressive loading、duplicate-name uncertainty、除外された custom directory、environment reference の非解決、正確な evidence に関する Copilot metadata の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T169 [P] [US2] 互換性のない behavior をまとめず、VS Code、CLI、Cloud の selection fact に関する composition の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T170 [P] [US2] surface-specific recognition と condition fact が分離されたままであることを証明する typed-detail の失敗テストを `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T171 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、Codex と Claude の behavior を維持した Copilot-only および shared-recognition detail に関するブラウザー受け入れ失敗テストを `tests/e2e/copilot-skills-detail.spec.ts` に追加する

### 実装

- [ ] T172 [US2] strategy ID を追加せず、inventory が所有する Copilot skill strategy を detail-time surface-qualified condition および selection projection で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T173 [US2] exact metadata、selection uncertainty、relationship、正確な evidence で Copilot recognition を `src/server/inspection/recognizers/copilot.ts` において拡張する
- [ ] T174 [US2] Copilot の surface difference と文書間の conflict を維持するよう applicability projection を `src/server/inspection/applicability/precedence.ts` において拡張する
- [ ] T175 [US2] atomic Copilot extraction と一度だけ読み取る shared-file detail assembly を `src/server/inspection/scan.ts` に統合する
- [ ] T176 [US2] 別々の Copilot surface に対する typed recognition presentation を `src/app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T177 [US2] 英語の Copilot detail および surface-uncertainty message をそれらを描画する Vue component に追加する

---

## フェーズ 12: 統合 SKILL inventory

**目的**: 三つの vendor demonstration を、一つの一貫した skill inventory にします。

**独立テスト**: unique skill、duplicate name、shared physical file、item failure、secret、injected fileに閉じないfailureを持つall-tool fixtureを使用し、決定論的なrow、multi-recognition、filter、fileに閉じたoutcomeだけのpartial continuity、fileに閉じないfailure時のattempt全体のabortとitem、recognition、derivation、scan-result record/response、generationが一切ないこと、および以前のcommit済みsnapshotだけが残ること、rescan replacement、応答性の高いinteraction performanceを検証する。

**目に見えるチェックポイント**: 完全な skill-first inventory を filter して理解できます。

### fixture とテストを先行

- [ ] T178 [US1] 対応するすべての selector、shared file、duplicate name、near miss、failure、secret、注入した execution-environment throw/rejection を持つ all-tool SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T179 [P] [US1] すべての SKILL selector と multi-tool recognition combination に関する conformance の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T180 [P] [US1] 決定論的なphysical-file/recognition order、一度だけ読み取るmerge、exactなraw-path aggregation、atomic continuity、progress、完全なtraversal後のfileに閉じたfailureだけによるpartial publication、およびwhole attemptをfatalにしてextra readを行わずnew complete/partial generation、item、record、response、derived resultを公開せずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないfileに閉じないfailureに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T181 [P] [US1] 統合 SKILL row に対する source、tool、kind、path filter の client 失敗テストを追加し、inventory state が source text、metadata literal、sensitive fixture value を一切含まないこと（detail を一度も request しておらず、authored content が client へ届く経路はそれだけであること）を `tests/unit/app/inventory.test.ts` で証明する
- [ ] T182 [P] [US1] whole-generation replacement、stale detail/request-token/selection cleanup、filter retention、profile/cache/repository persistence ゼロに関する rescan の失敗テストを `tests/unit/session/session.test.ts` と `tests/unit/app/session-view-state.test.ts` に追加する
- [ ] T183 [P] [US1] 再利用可能なSC-002 harnessとversioned profile validatorを追加し、変更しない100,000-entry/500-file reference fixtureを構築する。Profileをversion付きcanonical entry/content-digest inventory `tests/performance/sc002-fixture-manifest.json`とそのSHA-256 `tests/performance/sc002-fixture-manifest.sha256`へbindし、smoke run前後にcanonical digestと参照content digestを再計算する。各fresh processで自動Repository scanがterminal stateへ到達するまでtiming外で待ち、明示Repository rescanを正確に1件dispatchして両timerをbrowser dispatch時に開始し、そのadmission `scanRequestId`をcaptureする。同じIDのvisible/assistive statusとそのrequestのcommit済みgeneration由来のcomplete inventoryだけをacceptし、generic/loading/unchanged/prior/automatic stateを拒否する。2つのstandardized interactionを計測し、profile/manifest version/digestとrequest ID/generationを記録してnon-gating smoke passを1回実行する。対象は`tests/performance/sc002-reference-profile.json`、`tests/performance/repository-scan.test.ts`、`tests/performance/inventory-interactions.test.ts`とし、exact 10-run 9/10 protocolはT918へ延期する
- [ ] T184 [US1] 統合 filter、multi-recognition、provenance、keyboard use、inventory からの source exposure なしに関するブラウザー回帰を `tests/e2e/skills-inventory.spec.ts` に追加する

### 実装

- [ ] T185 [US1] skill に対する決定論的な physical-file、recognition、provenance aggregation を `src/server/inspection/scan.ts` で完成させる
- [ ] T186 [US1] generation-aware skill filtering、selection、rescan replacement、stale cleanup を `src/app/composables/filters.ts` と `src/app/session/view-state.ts` で完成させる
- [ ] T187 [US1] アクセシブルな source/tool/kind/path filter を `src/app/components/inventory/InventoryFilters.vue` で完成させる
- [ ] T188 [US1] 統合 skill row、recognition badge、provenance summary、empty state、progress control を `src/app/components/inventory/InventoryList.vue`、そのkindのrow component（`src/app/components/inventory/rows/`）、`src/app/pages/index.vue` で完成させる
- [ ] T189 [US1] Source-value-free diagnostics を維持し、inventory の loading、empty、retry、replacement state で source を露出しない処理を `src/app/components/diagnostics/DiagnosticList.vue`  に実装する
- [ ] T190 [US1] 英語の unified-inventory および multi-recognition message をそれらを描画する Vue component に追加する

---

## フェーズ 13: SKILL 比較

**目的**: 他の customization family より先に、skill を使用して generic な完全 literal comparison path を提供します。

**独立テスト**: current-generationで読み取り可能なdistinct physical skill file IDを正確に2つ選択し、literal credentialの差分を含む完全なauthored-source diff、正確なtyped-recognition row、environment referenceの解決0件、environment-determined rendering-failure fallback、stale/epoch cleanup、same-origin Worker使用、keyboard/screen-reader accessを検証します。

**目に見えるチェックポイント**: 読み取り可能な任意の2つのdistinct SKILL file IDを、activationやmutationを発生させずに比較できます。

### テスト先行

- [ ] T191 [P] [US3] exactly-two distinct file-ID selectionとsame-ID rejection、既存の二つの FileDetail load、readable/current-generation/client-epoch/request-token guard、stale rejection、replacement または removal 後の cleanup に関する失敗テストを `tests/unit/app/comparison.test.ts` に追加する
- [ ] T192 [P] [US3] ranking や winner の主張を行わず、解決済みの値を伴う正確な `(tool, kind, fieldId)` metadata matching、provenance、applicability、relationship、order comparison に関する失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T193 [P] [US3] 二つの完全な literal model、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`、same-origin Worker 使用、environment-determined rendering-failure fallback、disposal に関する direct-comparison-route の失敗テストを `tests/unit/app/source-diff.test.ts` と `tests/package/monaco-assets.test.ts` に追加する
- [ ] T194 [US3] 完全な authored skill diff、正確な literal credential difference、変更されない environment-reference text、typed recognition difference、responsive layout、keyboard access、fallback diagnostics、cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/skills-comparison.spec.ts` に追加する

### 実装

- [ ] T195 [US3] exactly-two distinct file-ID generation-scoped selectionとsame-ID rejection と epoch/token guard、compare API を使わない二つの既存 detail load、replacement・purge・removal 後の teardown を `src/app/composables/comparison.ts` に実装する
- [ ] T196 [US3] 二つの完全な literal Monaco model、不透明 URI、same-origin Worker、subscription の決定論的な作成と disposal を `src/app/composables/monaco.ts` に実装する
- [ ] T197 [US3] 正確に label 付けされた read-only/no-link/no-revert diff option、verbose accessibility、完全な side-by-side fallback を `src/app/components/comparison/SourceDiff.vue` に実装する
- [ ] T198 [US3] inferred winner を作らず、正確な `(tool, kind, fieldId)` の解決済みの値による recognition row と provenance、applicability、relationship、order difference を `src/app/components/comparison/RecognitionComparison.vue` に実装する
- [ ] T199 [US3] edit、merge、lint、validation、fix action を含まない、アクセシブルな generation-scoped comparison-selection control を そのkindのrow component（`src/app/components/inventory/rows/`） に追加する
- [ ] T200 [US3] direct-route loading、stale recovery、responsive layout、accessible navigation、英語 message を `src/app/pages/compare.vue` に実装する

---

## フェーズ 14: SKILL metadata 比較

**目的**: generic な完全 literal comparison path を、別個の Codex `skill metadata` kind へ拡張します。

**独立テスト**: current-generation で読み取り可能な `agents/openai.yaml` file を正確に二つ比較し、完全な authored source、fieldで照合した解決済みの値、seed provenance、relationship、fallback behavior、stale/epoch invalidation、完全な model/subscription cleanup を検証します。

**目に見えるチェックポイント**: environment reference を解決せず、seed skill と混同することなく、記述された sensitive value を含む二つの Codex skill-metadata file を比較できます。

### テスト先行

- [ ] T201 [P] [US3] skill-metadata field、seed provenance、applicability、relationship、missing value に関する typed-comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T202 [US3] 完全な literal skill-metadata diff、fieldで照合した解決済みの値、typed provenance difference、変更されない environment-reference text、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/skill-metadata-comparison.spec.ts` に追加する

### 実装

- [ ] T203 [US3] preferred seed や value を推論せず、`skill metadata` kind に対する field-identity-aware comparison row を `src/app/components/comparison/RecognitionComparison.vue` において拡張する
- [ ] T204 [US3] 英語の skill-metadata comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 15: Codex Instructions inventory

**目的**: まず静的な Codex instruction file を追加し、MCP wave より前には有界導出ルールの登録、config seed の受け入れ、project configuration の読み取りを行わず、純粋な configured-fallback 宣言/導出インターフェースを定義します。

**独立テスト**: `AGENTS.override.md` と `AGENTS.md` をインベントリ化し、メモリ内の受け入れ済み carrier fixture に対して `codex.derived.fallback-basename` を実行します。vendor/runtime と execution environment の capacity だけに従う全 configured declaration の complete retention、祖先関係を比較できること、orphan/configured-target escape がないこと、決定論的な provenance、およびフェーズ 23 で carrier が受け入れられるまでは `.codex/config.toml` の読み取りも configured fallback row もゼロであることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。

### fixture とテストを先行

- [ ] T205 [US1] override、regular file、configured fallback、empty file、多数の fallback name と注入した execution-environment throw/rejection、ancestry-comparable/incomparable path、import、secret、malformed content、near miss に対する Codex instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T206 [US1] Codex instruction behavior、読み取り権限を付与しない `codex.behavior.repo.config` と `codex.behavior.user.config` carrier fact、静的 matcher、純粋な fallback 宣言/導出 fixture contract、composition、relationship、path-negative boundary、reciprocal evidence row を、`codex.derived.fallback-basename` の registry row を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T207 [P] [US1] `codex.repo.instructions`、override/regular selector、empty-file behavior、path-negative higher scope、決定論的な provenance、およびフェーズ 23 より前には config candidate と `codex.derived.fallback-basename` registry record の両方が存在しないことに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T208 [US1] Static Codex instruction scanとverified in-memory fallback declaration pure functionのfailing testを追加する。Success時はnumeric declaration capなしで全configured declarationをcompleteに保持し、derivationのthrow/rejectionはdomainでcatch/cause分類/retry/partial declaration-plan-candidate化せず変更なしにouter boundaryへ伝播してattempt result/generationを作らずprior commitを維持する。Ancestry、orphan/config escape、registry前target access 0件を`tests/integration/repository-scan.test.ts`で証明する
- [ ] T209 [US1] 静的な Codex instruction row、filter、diagnostics、order、exclusion、および config row がゼロの明示的な configured-fallback-pending 状態に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T210 [US1] Codex の Repository/User instruction と config-carrier statement を、完全な base instruction-layering および dormant fallback-interface strategy record とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、config read を認可せず production registry を閉じたままにする
- [ ] T211 [US1] Codex の静的 instruction record だけを追加し、`codex.repo.config` と `codex.derived.fallback-basename` はフェーズ 23 でアトミックに受け入れるまで未登録のままにし、adjacent exclusion ID を `src/shared/registries/inspection-rules.ts` に追加しない
- [ ] T212 [US1] Codex instruction evidence に加え、このフェーズで所有する読み取り権限を付与しない Repository/User config carrier fact の reciprocal backlink を 対象registry recordの`evidence` citation に追加する
- [ ] T213 [US1] フェーズ 23 が seed と derived rule の両方を登録するまでは scan candidate を生成できない、静的な Codex instruction matching、純粋な fallback 宣言 validator、one-edge derivation helper を `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T214 [US1] Codex instruction、activation 後の fallback provenance、pre-carrier pending 状態に対する inventory filter と row を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） において拡張する
- [ ] T215 [US1] 英語の Codex instruction inventory、fallback、exclusion message をそれらを描画する Vue component に追加する

---

## フェーズ 16: Codex Instructions 詳細

**目的**: 完全な literal Codex instruction source と typed layering を追加し、configured-fallback の投影はフェーズ 23 で導入する最小 config carrier の存在を条件とします。

**独立テスト**: 静的な Codex instruction fixture を開き、override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、Inspector cap を設けない vendor/runtime-reported instruction-capacity fact、relationship-only の import、stale-ID behavior、diagnostics、detail-state cleanup を検証します。別途、config path を読み取らず、メモリ内 carrier から fallback detail を投影できることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction を選択すると、明示的な order、vendor/runtime-reported instruction-capacity fact、condition、および carrier 受け入れ前であることを正直に示す fallback 状態を備えた完全で非活性な detail が開きます。

### テスト先行

- [ ] T216 [P] [US2] Override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、Inspector 固有の cap を設けない vendor/runtime-reported instruction-capacity fact、設定済みの全 fallback basename に関する Codex の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T217 [P] [US2] 正確なauthored target slice、`targetOrigin`、null-authored documented default、internal semantic normalization、lexical status、cycle、boundary status、directかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、target access前のnested/transitive projection拒否、environment reference非解決、target read authority 0、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するimport/referenceのfailing testを`tests/unit/inspection/relationships.test.ts`と`tests/integration/inspection-safety.test.ts`に追加する
- [ ] T218 [P] [US2] 完全な Codex instruction source、閉じた metadata field ID、順序付けられた解決済みの値、condition、fallback、relationship、diagnostics、environment reference の非解決、stale ID に関する detail/API の失敗テストを `tests/contract/http-api-files.test.ts` と `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T219 [US2] reciprocal contract reference を持つ Codex instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T220 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal static Codex instruction detail、byte budget、condition、pre-carrier fallback 状態、relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T221 [US2] strategy ID を追加せず、inventory が所有する Codex instruction/config strategy を detail-time fallback、byte-budget、applicability、relationship projection で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T222 [US2] Codex instruction composition、fallback projection、byte-budget fact、direct one-hopかつnon-recursiveなprovenance-relative relationship extractionを`src/server/inspection/applicability/precedence.ts`と`src/server/inspection/parsers/markdown.ts`に実装する。Targetはread authorityを与えず、nested/transitive projectionはaccess前に省略する
- [ ] T223 [US2] Codex instructionの正確な解決済みの値、atomic parsing、complete deterministic direct relationship-only reference、scratch disposal、fallback provenanceを`src/server/inspection/scan.ts`へ統合する。Parser/relationshipのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived body/generation化せず変更なしにouter boundaryへ伝播し、targetをrecurse/expand/readしない
- [ ] T224 [US2] Codex instruction scope、order、fallback、byte budget、condition、inert relationship に対する typed detail presentation を `src/app/components/inspection/RecognitionDetails.vue` と `src/app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T225 [US2] 英語の Codex instruction detail、fallback、byte-budget、relationship、uncertainty message をそれらを描画する Vue component に追加する

---

## フェーズ 17: Claude Instructions inventory

**目的**: `AGENTS.md` を filename だけで recognition せず、Claude の launch、ancestor、conditional descendant instruction file を追加します。

**独立テスト**: 対応する `CLAUDE.md`、`CLAUDE.local.md`、すべての nested `.claude/CLAUDE.md` を inventory 化し、それらが `claude.repo.instructions` に一致することを確認します。正確な launch-`cwd` の `.claude/CLAUDE.md` だけが definite launch applicability を持ち、他の nested candidate は conditional/unknown のままであること、決定論的な provenance、変更されない Codex instruction を検証します。

**目に見えるチェックポイント**: 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction file を filter できます。

### fixture とテストを先行

- [ ] T226 [US1] launch、ancestor、descendant、local ordering、exact launch と他の nested `.claude/CLAUDE.md` candidate、filename-only `AGENTS.md`、import、secret、malformed content、near miss に対する Claude instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T227 [US1] exclusion ID を定義せず、Claude instruction behavior、candidate matcher、composition、path-negative case、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T228 [P] [US1] nested `.claude/CLAUDE.md` file が `claude.repo.instructions` candidate であること、正確な launch-`cwd` form だけが definitely applicable であること、他の nested form は conditional/unknown のままであること、filename-only `AGENTS.md` は Claude-recognized されないこと、provenance が決定論的であることを証明する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T229 [US1] Claude instruction discovery、一度の read、決定論的な order、isolated failure、import-target read ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T230 [US1] Claude instruction row、layer provenance、filter、exclusion、diagnostics、維持される Codex instruction に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T231 [US1] Claude の Repository/User instruction statement を、完全な base layering/import strategy record とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [ ] T232 [US1] Claude instruction candidate record だけを追加し、exclusion ID を定義せずに未対応 location を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T233 [US1] Claude instruction evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T234 [US1] 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction matching と recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T235 [US1] import を読み取らず、Codex result も変更せずに Claude instruction classification を `src/server/inspection/scan.ts` に統合する
- [ ] T236 [US1] Claude instruction の inventory row と、英語の instruction、layer、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 18: Claude Instructions 詳細

**目的**: 正確な layer ordering と inert import relationship を持つ、完全な literal Claude instruction detail を追加します。

**独立テスト**: malformed および malformed な Claude instruction を開き、launch/ancestor/descendant distinction、regular-before-local order、conditional descendant loading、正確な解決済みの値の保持、one-level relationship としての import、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude instruction を選択すると、参照 file を import せず、完全で非活性な layered detail が表示されます。

### テスト先行

- [ ] T237 [P] [US2] launch/ancestor/descendant distinction、regular-before-local order、exact-launch と conditional/unknown な nested `.claude/CLAUDE.md` applicability、conditional descendant loading に関する Claude の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T238 [P] [US2] 正確なauthored target slice、internal semantic normalization、cycle、boundary status、directかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、target access前のnested/transitive projection拒否、environment reference非解決、target read authority 0、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するClaude importのfailing testを`tests/unit/inspection/relationships.test.ts`に追加する
- [ ] T239 [US2] reciprocal contract reference を持つ Claude instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T240 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude instruction detail、layer order、condition、import、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T241 [US2] strategy ID を追加せず、inventory が所有する Claude instruction strategy を detail-time local-order、applicability、authored import-relationship projection で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T242 [US2] Exact metadata、layer condition、complete direct one-hop かつ non-recursive な relationship、source-value-free environment-failure Diagnostic、evidence で Claude instruction recognition を `src/server/inspection/recognizers/claude.ts` において拡張する。Relationship target は read authority を与えず、nested/transitive projection を access 前に省略する
- [ ] T243 [US2] Claude instruction parsing、正確な解決済みの値の抽出、complete deterministic direct relationship-only import、scratch disposalを`src/server/inspection/scan.ts`へ統合する。Parser/relationshipのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived body/generation化せず変更なしにouter boundaryへ伝播し、targetをrecurse/expand/readしない
- [ ] T244 [US2] typed detail と、英語の Claude instruction order、relationship、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 19: Copilot Instructions inventory

**目的**: 正確な七つの Copilot instruction candidate、`copilot.repo.instructions.repository`、`copilot.repo.instructions.repository-cli-context`、`copilot.repo.instructions.path`、`copilot.repo.instructions.path-cli-context`、`copilot.repo.instructions.agents`、`copilot.repo.instructions.claude-root`、`copilot.repo.instructions.gemini-root` を追加します。

**独立テスト**: distinct な root/CLI および surface provenance を持つ正確な七つの ID をすべて inventory 化し、root/CLI repository form、root/CLI path form、`AGENTS.md`、root `CLAUDE.md`、root `GEMINI.md` を検証します。また、正確な `copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` が、hosted input や near miss を admission せずに、追加の標準 location と configured root を拒否することを検証します。

**目に見えるチェックポイント**: surface-qualified provenance と明示的な exclusion を持つ Copilot instruction candidate を filter できます。

### fixture とテストを先行

- [ ] T245 [US1] 正確な七つの candidate ID、root/CLI repository/path form、`applyTo`、`AGENTS.md`、root `CLAUDE.md`/`GEMINI.md`、shared file、additional-standard location、extra directory、hosted input、secret、malformed content、near miss に対する Copilot instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T246 [US1] 正確な七つの Copilot instruction candidate row、origin fileを持たない正確な `copilot.behavior.cloud.organization-instructions` fact、`copilot.excluded.additional-standard-locations` とその affected behavior である `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.instructions.claude`・`copilot.behavior.cli.instructions.claude`・`copilot.behavior.cli.instructions.gemini` だけ、`copilot.excluded.extra-directories` とその affected behavior である `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.skills`・`copilot.behavior.cli.instructions.path`・`copilot.behavior.cli.skills` だけを、その composition、relationship、evidence row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T247 [P] [US1] 正確な七つの candidate ID、root-versus-CLI provenance、root alternative、正確な additional-standard-location/extra-directory exclusion、hosted candidate なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T248 [US1] 決定論的な Copilot instruction candidate、一度の read、isolated failure、rejected-target access ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T249 [US1] Copilot instruction row、surface badge、filter、exclusion、diagnostics、維持される Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T250 [US1] surface-qualified な Copilot instruction/User/Cloud statement を、参照されるすべての base local/Cloud layering および managed-remote strategy とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、settings-file authority を与えず production registry を閉じたままにする
- [ ] T251 [US1] 正確な七つの Copilot instruction candidate record を追加し、`copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` だけを own する処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T252 [US1] `copilot.behavior.cloud.organization-instructions` の existing-source backlink を含む、Copilot instruction evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T253 [US1] `copilot.repo.instructions.repository` と `copilot.repo.instructions.repository-cli-context` matching を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T254 [US1] `copilot.repo.instructions.path` と `copilot.repo.instructions.path-cli-context` matching を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T255 [US1] `copilot.repo.instructions.agents` matching と、正確な additional-standard-location/extra-directory rejection を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T256 [US1] `copilot.repo.instructions.claude-root` と `copilot.repo.instructions.gemini-root` matching を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T257 [US1] hosted location または excluded location を昇格させず、正確な七つの Copilot instruction ID すべてに surface-qualified recognition を `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T258 [US1] configured-root または hosted I/O を行わず、Copilot instruction classification を `src/server/inspection/scan.ts` に統合する
- [ ] T259 [US1] Copilot instruction の inventory row と、英語の instruction、surface、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 20: Copilot Instructions 詳細

**目的**: 互換性のない VS Code、CLI、Cloud composition fact を維持しながら完全な literal Copilot instruction detail を追加し、settings-dependent enablement は後続の Settings wave まで明示的に未知のままとします。

**独立テスト**: 対応する Copilot instruction を開き、`applyTo`、settings-file I/O がゼロの明示的な pending/unknown settings-dependent enablement 状態、parent discovery、Cloud exclusion、発明された general winner なし、正確な解決済みの値、relationship、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot instruction を選択すると、別々の surface interpretation と uncertainty が表示されます。

### テスト先行

- [ ] T260 [P] [US2] VS Code/CLI/Cloud fact、`applyTo`、settings owner がない状態での pending/unknown settings-dependent enablement、parent discovery、発明された general winner なしに関する Copilot の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T261 [P] [US2] 閉じた Copilot field ID、順序付けられた解決済みの値、`applyTo` と reference の target、instruction scope、disablement、alternative、hosted/organization fact、environment reference の非解決、target read ゼロに関する metadata と relationship の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T262 [US2] reciprocal contract reference を持つ Copilot instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T263 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot instruction detail、surface condition、applicability、relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T264 [US2] strategy ID や settings behavior reference を追加せず、inventory が所有する Copilot instruction strategy を detail-time VS Code/CLI/Cloud applicability、authored relationship、closed unavailable-settings condition で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T265 [US2] closedなallowlist済みinstruction metadata、surface condition、pending settings applicability、relationship、diagnostics、evidence で Copilot recognition を `src/server/inspection/recognizers/copilot.ts` において拡張する
- [ ] T266 [US2] Copilot instruction parsing、正確な解決済みの値の抽出、inert relationship、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal、settings-file I/O ゼロを `src/server/inspection/scan.ts` に統合する
- [ ] T267 [US2] typed detail と、英語の Copilot instruction surface、pending settings applicability、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 21: 統合 Instructions inventory

**目的**: 明示的な pre-carrier shared-file matrix とともに、priority wave の instruction baseline を統合します。`AGENTS.md` は Codex+Copilot、root `CLAUDE.md` は Claude+Copilot、nested `CLAUDE.md` はフェーズ 23 で独立して受け入れられた config carrier が正確な fallback match を有効化するまで Claude-only、`CLAUDE.local.md` は Claude-only です。

**独立テスト**: all-vendor instruction fixtureを使用し、正確なpre-carrier shared-file matrix、受け入れ済みfileごとの一つの物理item/read、別々のrecognition/provenance、nested `CLAUDE.md`のfilename-based Codex promotionなし、明示的なdormant fallback状態、決定論的なorder、filter、fileに閉じたfailureのpartial continuity、rescan cleanupを検証する。

**目に見えるチェックポイント**: 完全な静的 instruction inventory、すべての shared-file interpretation、および MCP が最小 carrier を受け入れたときに有効になる一つのconfigured fallback integration を理解できます。

### テスト先行

- [ ] T268 [US1] `AGENTS.md` Codex+Copilot、root `CLAUDE.md` Claude+Copilot、nested `CLAUDE.md` Claude-only と dormant configured-fallback variant、Claude-only `CLAUDE.local.md`、その他すべての selector、failure、secret、exclusion、注入した execution-environment throw/rejection を持つ pre-carrier all-vendor instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T269 [P] [US1] 登録済みのすべての静的 instruction selector と exclusion、registry entry を持たない純粋 fallback interface、正確な `AGENTS.md`/root `CLAUDE.md`/nested `CLAUDE.md`/`CLAUDE.local.md` recognition matrix に関する完全な pre-carrier conformance test を `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T270 [P] [US1] 一度だけ読み取るshared-file assembly、正確なpre-carrier recognition matrix、dormant nested fallbackに対するCodex recognitionゼロ、決定論的なprovenanceとraw-path order、atomic continuity、完全なtraversal後のfileに閉じたfailureだけによるpartial publication、whole attemptをfatalにしてnew generation、item、record、response、derived resultを作らずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないfileに閉じないfailure、およびconfig/rejected-target accessゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T271 [P] [US1] source/tool/kind/path filter、shared recognition badge、dormant fallback 状態、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T272 [US1] pre-carrier unified instruction inventory、filter、shared recognition、dormant fallback 状態、order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T273 [US1] filename inference を行わず、正確な pre-carrier shared-file matrix に対する決定論的な physical-file assembly を完成させ、フェーズ 23 が検証済みの導出を供給した後に限って独立した configured-fallback Codex provenance を受け入れる処理を `src/server/inspection/scan.ts` に実装する
- [ ] T274 [US1] instruction kind、shared recognition、dormant fallback 状態、後で有効になる fallback provenance に対する inventory filter と row を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で完成させる
- [ ] T275 [US1] 英語の unified instruction inventory、shared-recognition、fallback、exclusion message をそれらを描画する Vue component に追加する

---

## フェーズ 22: Instructions 比較

**目的**: generic comparison view を、literal および typed な instruction difference へ拡張します。

**独立テスト**: Readableなcurrent-generation instruction fileを正確に2つ比較し、correctness claimやenvironment-reference resolutionを行わず、完全なauthored sourceとfieldで照合した解決済みの値、layering、fallback、applicability、relationship、provenance differenceを検証する。

**目に見えるチェックポイント**: 二つの instruction file を比較し、構造上の difference を理解できます。

### テスト先行

- [ ] T276 [US3] semantic correctness claim を行わず、正確に二つの FileDetail input、`(tool, kind, fieldId)` の解決済みの値、layering、fallback、applicability、relationship、provenance difference に関する instruction comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T277 [US3] credential/environment-reference difference を含む完全な literal instruction diff、正確な metadata row、masking/reveal または environment substitution なし、typed layering/fallback difference に関するブラウザー受け入れテストを `tests/e2e/instructions-comparison.spec.ts` に追加する

### 実装

- [ ] T278 [US3] instruction comparison row が `(tool, kind, fieldId)` で match して解決済みの `value` を render し、typed layering/fallback state を分離したままにするよう `src/app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T279 [US3] 英語の instruction comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 23: Codex MCP carrier と内包宣言

**目的**: Codex MCP に必要な最小物理 carrier として `.codex/config.toml` をアトミックに受け入れ、その静的 seed とともに `codex.derived.fallback-basename` を登録し、実装済みの instruction fallback interface を有効化します。まだ別個の `settings/config` recognition は公開せず、MCP recognition を関連付けます。

**独立テスト**: 検証済み fallback basename、名前付きサーバー、重複、フィールド欠落、不正なテーブル、不正なコマンド、シークレット、独立 MCP のニアミスを含む config layer を検査し、seed/derived-rule のアトミックな受け入れ、environment-owned capacity に従う全 configured fallback row、owner-file identity、合成 MCP file がないこと、独立 MCP candidate がないこと、config-detail badge がないこと、一度だけの検証済み読み取り、接続ゼロを検証します。

**目に見えるチェックポイント**: 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングでき、フェーズ 15 の configured instruction fallback が表示されます。完全な configuration inventory/detail はフェーズ 57～58 まで延期します。

### フィクスチャとテストを先に

- [ ] T280 [US1] project layer、fallback name、名前付き MCP server、重複、不正な table、不正な command、secret、agent inheritance reference、standalone near miss、plugin relationship、User/managed path negative を対象とする最小 Codex config-carrier fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T281 [US1] `codex.repo.config`、`codex.derived.fallback-basename`、`codex.behavior.repo.mcp`、読み取り権限を付与しない `codex.behavior.repo.hooks` carrier fact、contained recognition、selection、relationship、reciprocal evidence row、path-negative な standalone/plugin/User/managed case を、`codex.excluded.plugin-files` または MCP exclusion ID を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T282 [P] [US1] `codex.repo.config`と`codex.derived.fallback-basename`のatomicな登録、正確なconfig-carrier admission、およびInspector-defined numeric declaration capを持たないenvironment-owned capacityに従う成功時のcomplete configured derived instructionに関するfailing matcher testを追加する。Capacity failureがpartial registry、plan、candidate、instruction、その他のderived resultを返さず変更なしのthrow/rejectionを伝播すること、standalone Codex MCP candidateがないこと、plugin、agent-reference、User、managed、任意のconfig pathを昇格しないことも`tests/unit/inspection/rules.test.ts`で証明する
- [ ] T283 [P] [US1] Codex MCP が新たに受け入れられた config carrier に関連付けられ、configured instruction fallback が独立した provenance で有効になり、まだ `settings/config` recognition も synthetic file も現れず、欠落または不正な宣言をアトミックに省略することを証明する失敗する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T284 [US1] Codex contained MCP row、owner-carrier への移動、新たに有効になった configured instruction fallback、config kind/detail badge がないこと、filter、path-negative な standalone/plugin case、diagnostics、connection control がないことを対象とするブラウザー受け入れテストを `tests/e2e/codex-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T285 [US1] フェーズ 15 の carrier behavior を再利用し、Hook candidate・standalone MCP・connection authority を与えず、Codex MCP/config-contained Hook behavior statement を完全な base MCP lookup/owner strategy record とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T286 [US1] `codex.repo.config` と、その one-edge `codex.derived.fallback-basename` rule をアトミックに追加し、Codex MCP candidate は作成せず、`codex.excluded.plugin-files` を早期所有せずに standalone/plugin/User/managed path を negative のまま保ち、contained declaration には relationship record だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T287 [US1] Codex config-carrier、derived-fallback、MCP、および読み取り権限を付与しない contained-Hook fact の evidence と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T288 [US1] config-carrier matching、既存の configured fallback helper のアトミックな activation、standalone MCP rejection、contained-declaration classification を `src/server/inspection/rules/codex.ts` に実装する
- [ ] T289 [US1] fallback basename と `[mcp_servers.*]` に対して解決済みの値と内部 semantic normalization を読む最小限のinert TOML carrier extraction を実装し、一つの検証済み config file に決定論的な provenance で MCP recognition と derived instruction を関連付け、`settings/config` recognition を省略し、synthetic candidate を作成しない処理を `src/server/inspection/parsers/toml.ts`、`src/server/inspection/recognizers/codex.ts`、`src/server/inspection/scan.ts` に実装する
- [ ] T290 [US1] MCP インベントリのフィルターと内包所有者の要約を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
- [ ] T291 [US1] 英語の Codex 内包 MCP、所有者、スキーマ、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 24: Codex MCP の詳細

**目的**: 一般 configuration の表示はフェーズ 58 まで保留しつつ、最小 Codex carrier を完全な literal MCP detail、active-config precedence、trust、inheritance、duplicate、zero-connection behavior で拡張します。

**独立テスト**: 内包されたCodex declarationを開き、active project-config precedence、trust condition、duplicate server name、parent/agent inheritance fact、正確な解決済みの値の保持、diagnostic、禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/auth/probing request 0件、command/expansion/referenced read 0件を検証し、exactな2つのFR-022 authorized internal loopback HTTP classを別に分類する。

**目に見えるチェックポイント**: Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。

### テストを先に

- [ ] T292 [P] [US2] named、inline、ancestor、plugin、runtime-only の reference に加え、フェーズ 50 より前には unresolved behavior backlink、connection、target promotion を持たない純粋な dormant agent-inheritance adapter に関する失敗する MCP schema test を `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T293 [P] [US2] active project-config precedence、trust condition、duplicate name、有効になった fallback provenance、一般 config presentation がないことに関する失敗する Codex carrier/MCP test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T294 [P] [US2] Exactな2つのFR-022 authorized internal loopback HTTP classを別に分類し、Codex MCP inspectionが禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/authentication/probing request、command execution、expansion、plugin load、referenced-file readを発生させないことを証明するzero-connection testを`tests/integration/security/zero-activation.test.ts`へ追加する
- [ ] T295 [P] [US2] 完全な authored source、正確な解決済みの command・URL・header・environment field/reference（allowlist row の順）、owner provenance、condition、diagnostics、process-environment substitution なし、stale ID に関する Codex MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T296 [US2] reciprocal contract reference を備えた Codex carrier、instruction-fallback、MCP runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T297 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex MCP detail、config precedence、trust、diagnostics、owner navigation、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/codex-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T298 [US2] strategy ID や premature agent behavior reference を追加せず、inventory が所有する Codex MCP strategy を detail-time active-config selection、trust、duplicate、provenance、relationship、closed dormant agent-inheritance adapter で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T299 [US2] Codex active-config MCP precedence、trust、duplicate、provenance metadata、owner-gated dormant agent inheritance を `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T300 [US2] TOML extraction を閉じた Codex MCP field ID、field ごとに 1 つの解決済みの値、recognition-atomic failure、schema distinction、source value を含まない diagnostics で `src/server/inspection/parsers/toml.ts` において拡張する
- [ ] T301 [US2] Codex MCP の正確な解決済みの値の抽出、selection projection、condition、diagnostics、non-following relationship を `src/server/inspection/scan.ts` に統合する
- [ ] T302 [US2] サーバー、トランスポート、所有者スコープ、信頼、順序、アクティベーションの不確実性に対応する型付き Codex MCP 詳細を `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T303 [US2] 英語の Codex MCP 選択、安全性、所有者、スキーマ、不確実性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 25: Claude MCP ファイルのインベントリ

**目的**: ルートにある正確な Claude `.mcp.json` の独立物理候補を追加する。

**独立テスト**: ルートの `.mcp.json` だけをインベントリに含め、子孫を Claude 候補として拒否し、将来の Copilot との共有を維持しながら、User 状態、コネクター、managed 設定、リンク、ニアミス、内包宣言が独立ファイルとして扱われないことを検証する。

**目に見えるチェックポイント**: ユーザーは、正確なルート来歴を持つ Claude プロジェクト MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T304 [US1] ルート、子孫、不正な JSON、不正なコマンド、シークレット、リンク、User/plugin/connector/managed 状態、内包宣言、ニアミスを対象とする Claude MCP ファイルのフィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T305 [US1] Claude MCP-file behavior、読み取り権限を付与しない `claude.behavior.user.mcp-state`、`claude.behavior.repo.agents`、`claude.behavior.repo.plugin`、`claude.behavior.user.plugins` fact、正確な candidate、selection、relationship、path-negative な plugin/User/connector/managed caseを、`claude.excluded.plugin-files` を作成せずに reciprocal evidence row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T306 [P] [US1] 正確なルート `claude.repo.mcp`、descendant/User/plugin/connector/managed の拒否、独立スキーマの来歴に対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T307 [US1] Claude MCP ファイル行、正確なルート来歴、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/claude-mcp-files-inventory.spec.ts` に追加する

### 実装

- [ ] T308 [US1] Claude MCP-file/User/owner behavior statement を、完全な base replacement および owner-strategy record とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、未 admission の owner に candidate authority または connection authority を与えず production registry を閉じたままにする
- [ ] T309 [US1] 正確な Claude MCP candidate を追加し、`claude.excluded.plugin-files` を早期所有せず、新しい MCP exclusion ID も作成せずに plugin/User/connector/managed location を path-negative のまま保つ処理を `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T310 [US1] Claude MCP-file evidence に加え、このフェーズで所有する読み取り権限を付与しない四つの MCP-dependent behavior fact すべての reciprocal backlink を 対象registry recordの`evidence` citation に追加する
- [ ] T311 [US1] Claude のルートと完全一致する `.mcp.json` のマッチングとパス由来の認識を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T312 [US1] Claude MCP ファイルの分類を統合し、後続の共有認識に備えて物理的な同一性を `src/server/inspection/scan.ts` で維持する
- [ ] T313 [US1] MCP インベントリ行と、英語の Claude ファイル、スキーマ、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 26: Claude MCP ファイルの詳細

**目的**: 独立 Claude `.mcp.json` に、エントリ全体の置換と起動時の `cwd` 相対基準を備えた完全な literal 詳細を追加する。

**独立テスト**: 不正なルートファイルを開き、local→project→User→plugin→connector のエントリ全体の置換に関する事実、コマンド/引数に対する起動時の `cwd` 基準、重複の不確実性、正確な解決済みの値の保持、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。

### テストを先に

- [ ] T314 [P] [US2] local→project→User→plugin→connector のエントリ全体の置換と、コマンド/引数に対する起動時の `cwd` 相対基準について、失敗する Claude MCP テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T315 [P] [US2] Claude ファイルのサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、コネクター状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T316 [P] [US2] 完全な authored source、正確な解決済み field 値（allowlist row の順）と authored relationship target、file schema、base path、condition、environment-reference substitution なし、diagnostics、stale ID に関する Claude MCP-file detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T317 [US2] 相互の契約参照を備えた、失敗する Claude MCP ファイルの runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T318 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude MCP-file detail、replacement order、base path、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/claude-mcp-files-detail.spec.ts` に追加する

### 実装

- [ ] T319 [US2] strategy ID を追加せず、inventory が所有する Claude MCP strategy を detail-time whole-entry replacement、launch base、duplicate、scope、authored relationship projection で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T320 [US2] エントリ全体の置換と起動時の `cwd` 相対基準を備えた Claude MCP ファイルのメタデータを `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T321 [US2] Closed Claude MCP field ID、field ごとに 1 つの解決済みの値、schema distinctionを持つinert strict-JSON extractionを、Inspector固有の数値上限を設けないenvironment-owned parser capacityで実装する。Deterministicにreturnされたmalformed/extraction outcomeはrecognition-atomicかつsource-value-freeとし、decoder/parser/extractorの全throw/rejectionはcatch、cause classification、retry、recovered parser/extraction/recognition/derived result、Diagnostic、generationなしに変更なく伝播させる処理を`src/server/inspection/parsers/json.ts`へ実装する
- [ ] T322 [US2] Claude MCP-file の正確な解決済みの値の保持、selection projection、condition、diagnostics、non-following relationship を `src/server/inspection/scan.ts` に統合する
- [ ] T323 [US2] 型付き詳細と、英語の Claude MCP 置換、基準、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 27: Claude 内包 MCP core

**目的**: すでに受け入れられた skill owner に Claude MCP metadata を関連付け、まだ所有されていない behavior への reference を登録したり standalone candidate を作成したりせず、後続の settings、agent、plugin、marketplace owner に向けた closed owner-adapter contract を実装します。

**独立テスト**: 受け入れ済み skill owner を検査し、inline/named server reference、parent inheritance、plugin component path、runtime-only connector、不正な field、宣言欠落を含む将来の owner kind 用 pure adapter fixture を実行します。受け入れ済み owner だけが recognition を受けられること、将来の adapter は read authority を与えないこと、synthetic file が現れないこと、target は relationship のままであること、記述されたすべての値が literal のままであること、すべての path で zero connection が成り立つことを検証します。

**目に見えるチェックポイント**: Claude の skill-contained MCP fact が既存 owner 上に表示され、root `.mcp.json` と区別されたままになります。後続 owner family は、MCP matching や connection safety を変更せず、事前テスト済み adapter を有効化できます。

### テストを先に

- [ ] T324 [P] [US2] 受け入れ済み skill と、純粋で読み取り権限を付与しない settings/agent/plugin/marketplace adapter fixture、named/inline server、parent inheritance、plugin path、connector、owner provenance、現在所有済みの正確な evidence に関する失敗する Claude contained-MCP test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T325 [P] [US2] この milestone では contained MCP が受け入れ済み skill owner だけに関連付けられ、将来の owner adapter は受け入れ済み owner なしに candidate または recognition を作成できず、plugin target を読み取らず、不正/欠落した declaration をアトミックに省略することを証明する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T326 [P] [US2] Claude のすべての内包所有者、関係、コネクター、コマンド、URL、ヘッダー、環境、参照パスを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T327 [US2] 現在所有済みの skill/MCP behavior だけを使用する Claude contained-MCP relationship/composition graph coverage の失敗テストを追加し、将来の owner adapter に unresolved registry reference または read authority がないことを `tests/contract/runtime-composition.test.ts` で証明する
- [ ] T328 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、Claude skill-contained MCP detail、owner navigation、inheritance、relationship、diagnostics、未 admission owner family の row がないこと、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/claude-contained-mcp.spec.ts` に追加する

### 実装

- [ ] T329 [US2] 現在受け入れ済みの skill owner 向けに Claude MCP strategy を拡張し、後続 owner、parent-inheritance、plugin/runtime-reference、contained-declaration condition に向けた closed non-authorizing adapter interface を `src/shared/registries/runtime-composition.ts` に定義する
- [ ] T330 [US2] Claude skill-contained MCP metadata に加え、owner-gated adapter dispatch、owner provenance、relationship-only target、runtime-only fact を `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T331 [US2] admission 済み skill-contained MCP field の解決済みの値に対して既存の frontmatter extraction を拡張し、未 admission の settings/plugin owner を parse せず、純粋な将来の JSON/JSONC owner-adapter schema だけを `src/server/inspection/parsers/json.ts` と `src/server/inspection/parsers/markdown.ts` に定義する
- [ ] T332 [US2] 現在 admission 済み owner を一度だけ読み取る recognition、正確な解決済みの値の抽出、condition、diagnostics、non-following relationship、および将来の adapter dispatch が独立して admission 済みの owner ID を受け取るという厳格な要件を `src/server/inspection/scan.ts` に統合する
- [ ] T333 [US2] 型付き詳細と、英語の Claude 内包 MCP の所有者、継承、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 28: Copilot CLI MCP ファイルのインベントリ

**目的**: Copilot CLI の `.mcp.json` と `.github/mcp.json` を子孫インベントリ候補として追加する。

**独立テスト**: ルートおよびネストされた CLI コンテキストのファイルをインベントリに含め、追加スキーマ、User 設定、セッション追加、プラグイン対象、hosted 状態、リンク、ニアミスを拒否し、正確な runtime-chain/trust の不確実性を維持する。

**目に見えるチェックポイント**: ユーザーは、コンテキストとスキーマの来歴を備えた Copilot CLI MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T334 [US1] ルート/ネストされた `.mcp.json`、`.github/mcp.json`、重複、不正な JSON、不正なコマンド、シークレット、リンク、User/session/plugin/hosted 状態、ニアミスを対象とする Copilot CLI MCP フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T335 [US1] Copilot CLI MCP の振る舞い、`copilot.repo.mcp`、選択、除外 ID を持たずパス不一致となる User/session/hosted/configured ケース、relationship-only のプラグインパス、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T336 [P] [US1] 両方の CLI セレクター、子孫インベントリ、runtime-chain/trust 条件、スキーマ来歴、User/session/plugin/hosted 候補がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T337 [US1] Copilot CLI MCP 行、コンテキスト/スキーマバッジ、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/copilot-cli-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T338 [US1] Copilot CLI MCP/User statement を、完全な base lookup/selection strategy record とともに `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [ ] T339 [US1] `copilot.repo.mcp` の 2 つのセレクターだけを追加し、除外 ID を持たず User/session/hosted/configured の場所をパス不一致のまま保ち、プラグインパスを関係として `src/shared/registries/inspection-rules.ts` に保持する
- [ ] T340 [US1] Copilot CLI MCP のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T341 [US1] Copilot の子孫 CLI MCP のマッチングとスキーマで修飾された認識を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T342 [US1] Copilot CLI MCP の分類を統合し、共有されるルートの物理的な同一性を `src/server/inspection/scan.ts` で維持する
- [ ] T343 [US1] MCP インベントリ行と、英語の Copilot CLI コンテキスト、スキーマ、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 29: Copilot CLI MCP の詳細

**目的**: ソース順序、信頼、祖先にある重複の不確実性、接続を一切行わない振る舞いを備えた、完全な literal Copilot CLI MCP 詳細を追加する。

**独立テスト**: 不正な CLI ファイルを開き、session-additional→plugin→workspace→User の順序に関する事実、祖先にある未知の重複、runtime-chain/trust 条件、正確な解決済みの値、診断、接続または対象の昇格が一切ないことを検証する。

**目に見えるチェックポイント**: Copilot CLI MCP ファイルを選択すると、正確なローカル順序と不確実性が表示される。

### テストを先に

- [ ] T344 [P] [US2] session-additional→plugin→workspace→User の順序、祖先にある未知の重複、runtime-chain/trust 条件、スキーマ、来歴に対する失敗する Copilot CLI MCP テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T345 [P] [US2] Copilot CLI のサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、session/plugin 状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T346 [P] [US2] 完全な authored source、正確な解決済み field 値（allowlist row の順）/relationship target、schema、condition、environment-reference substitution なし、diagnostics、stale ID に関する Copilot CLI MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T347 [US2] 相互の契約参照を備えた、失敗する Copilot CLI MCP runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T348 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot CLI MCP detail、order、duplicate、trust、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/copilot-cli-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T349 [US2] strategy ID を追加せず、inventory が所有する Copilot CLI MCP strategy を detail-time source order、ancestor duplicate、trust、context、authored relationship projection で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T350 [US2] Copilot CLI MCP の順序、重複の不確実性、信頼、スキーマ、来歴のメタデータを `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T351 [US2] 閉じた Copilot CLI MCP field ID、token に裏付けられた正確な解決済みの値、schema distinction、atomic failure、source value を含まない diagnostics で JSON extraction を `src/server/inspection/parsers/json.ts` において拡張する
- [ ] T352 [US2] Copilot CLI MCP の正確な解決済みの値の保持、selection projection、condition、diagnostics、non-following relationship を `src/server/inspection/scan.ts` に統合する
- [ ] T353 [US2] 型付き詳細と、英語の Copilot CLI MCP の順序、信頼、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 30: Copilot VS Code MCP ファイルのインベントリ

**目的**: Exactな`.vscode/mcp.json`をdocumentedなVS Code `servers` schemaとともに追加し、exactなVS Code 1.118以降root `.mcp.json`を既存CLI candidateへmergeするpath/surface-onlyなconflict provenanceとして追加する。

**独立テスト**: 両方のexact workspace-root formをinventoryし、nested `.mcp.json`をCLI-onlyのままにし、root `.mcp.json`のCLI/VS Code provenanceを1 file/read/recognitionへmergeし、release-note/current-guide conflictを公開し、VS Code所有root-schema fieldまたは推測winnerを認可せず、一般の`.vscode/settings.json`、User/profile MCP、link、near missを拒否する。

**目に見えるチェックポイント**: Userはdocumentedな`.vscode/mcp.json` `servers` schemaと、schema/total same-name orderがunknownのVS Code 1.118以降root-path provenanceを区別できる。

### フィクスチャとテストを先に

- [ ] T354 [US1] Exactな`.vscode/mcp.json`、exact 1.118以降root `.mcp.json`、root CLI/VS Code overlap、nested CLI-only near miss、malformed `servers`、malformed command、secret、link、general settings、User/profile state、unsupportedなVS Code root-schema inferenceを対象とするCopilot VS Code MCP fixtureを`tests/fixtures/repositories/build-fixtures.ts`に作成する
- [ ] T355 [US1] ConflictingなCopilot VS Code MCP behavior、read authorityを付与しない`copilot.behavior.vscode.user.mcp`/`copilot.behavior.vscode.agents` fact、exact `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root` candidate、path-only root provenance、selection unknown、`copilot.excluded.vscode-settings`を作らないpath-negativeなgeneral-settings/descendant/User/profile case、relationship、reciprocal current-guide/1.118-release evidence rowを`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`に具体化する
- [ ] T356 [P] [US1] Exactな`copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`、専用`.vscode` `servers` extraction、VS Code所有field 0件のroot path-only provenance、`copilot.repo.mcp`と並ぶ1 merged root file/read/Copilot-MCP recognition、nested/general-settings/User/profile rejection、cross-provenance schema collapseなしについて失敗するmatcher/recognition testを`tests/unit/inspection/rules.test.ts`と`tests/unit/inspection/recognizers.test.ts`へ追加する
- [ ] T357 [US1] 両Copilot VS Code MCP path、`.vscode` schema badge、root evidence-conflict/unknown-schema state、merged provenance、filter、exclusion、diagnostic、connection controlなしを対象とするbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-inventory.spec.ts`に追加する

### 実装

- [ ] T358 [US1] Copilot VS Code MCP/User/agent factを1.118/current-guide conflict、path-specific schema availability、total-order unknown、完全なbase lookup/selection、dormant-owner strategy recordとともに`src/shared/registries/vendor-behaviors.ts`/`src/shared/registries/runtime-composition.ts`へ追加し、Custom Agent fileをadmitせずproduction registryをclosedのままにする
- [ ] T359 [US1] 2つのexact VS Code MCP rule `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`を追加し、nested root-form fileをCLI-only、general settings/User/profile locationをpath-negativeのままにし、`copilot.excluded.vscode-settings`を早期所有せず新MCP exclusion IDも定義しない処理を`src/shared/registries/inspection-rules.ts`へ追加する
- [ ] T360 [US1] Current-guideと`vscode.copilot.mcp.workspace-root-release` recordに加え、conflictingなVS Code MCP behavior/rule/strategyと、このphase所有のread authorityを付与しない両VS Code MCP/agent factへのreciprocal backlinkを対象registry recordの`evidence` citationへ追加する
- [ ] T361 [US1] Exact `.vscode/mcp.json` matchingと専用schema、およびVS Code所有extractorを持たないVS Code path/surface-only provenanceとしてのexact root `.mcp.json` matchingを`src/server/inspection/rules/copilot.ts`/`src/server/inspection/recognizers/copilot.ts`へ実装する
- [ ] T362 [US1] Root `.mcp.json`でcompatibleなCLI/VS Code provenanceを1 physical file/read、1 Copilot/MCP recognitionへmergeし、nested CLI candidateを変更しないCopilot VS Code MCP classificationを`src/server/inspection/scan.ts`へ統合する
- [ ] T363 [US1] MCP inventory rowと、`.vscode` schema、root evidence conflict/unknown schema/order、merged provenance、exclusionに関する英語messageをそのkindのrow component（`src/app/components/inventory/rows/`）で拡張する

---

## フェーズ 31: Copilot VS Code MCP の詳細

**目的**: 完全なliteral `.vscode/mcp.json` detailと1.118以降root `.mcp.json`のexact path/evidence detailを追加し、unknown root schema、total-order uncertainty、trust conditionを保持する。

**独立テスト**: Hostile/malformedな`.vscode/mcp.json`とroot `.mcp.json`を開き、`.vscode`だけの専用field、shared root fileのCLI-only extractionとVS Code path-only provenance、conflict/unknown same-name resolution、trust、正確な解決済みの値、diagnostic、connection 0件を検証する。

**目に見えるチェックポイント**: どちらのVS Code MCP pathを選択してもcomplete inert detailを表示し、documented `.vscode` schemaと未解決root semanticsを明確に分離する。

### テストを先に

- [ ] T364 [P] [US2] `.vscode` `servers` schema、VS Code所有field 0件の1.118以降root path-only provenance、merged CLI provenance、workspace scope、unknown root/`.vscode`/User/agent/plugin duplicate、trust、conflict assessment、exact evidenceについて失敗するCopilot VS Code MCP testを`tests/unit/inspection/copilot-metadata.test.ts`へ追加する
- [ ] T365 [P] [US2] VS Code MCP のコマンド、URL、ヘッダー、環境、DNS、ソケット、認証、信頼プロンプト、User/profile 状態を対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T366 [P] [US2] Complete authored source、`.vscode` の解決済み field 値（allowlist row の順）/relationship target、root path-only conflict provenanceとVS Code所有root field 0件、condition、environment-reference substitutionなし、diagnostic、stale IDについて失敗するVS Code MCP-detail API testを`tests/contract/http-api-files.test.ts`へ追加する
- [ ] T367 [US2] Current-guide/1.118 conflict、unknown root schema/total same-name order、reciprocal contract referenceについて失敗するVS Code MCP runtime-composition graph coverageを`tests/contract/runtime-composition.test.ts`へ追加する
- [ ] T368 [US2] Exact literal credential/environment-reference表示、process-environment sentinel substitutionなし、masking/reveal controlなし、両pathのcomplete literal VS Code MCP detail、`.vscode` schema対root unknown-schema conflict、duplicate uncertainty、trust、diagnostic、zero-connection behaviorに関するbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-detail.spec.ts`へ追加する

### 実装

- [ ] T369 [US2] Strategy IDを追加せず、inventory-owned Copilot VS Code MCP strategyをcurrent-guide/1.118 conflict、path-specific schema availability、unknown root/`.vscode`/User/agent/plugin winner、trust、provenance-specific authored relationship projectionで`src/shared/registries/runtime-composition.ts`において拡張する
- [ ] T370 [US2] `.vscode/mcp.json`のVS Code schema metadataと、VS Code所有extractor field 0件のroot `.mcp.json` path-only conflict provenanceに加え、duplicate uncertainty/trust metadataを`src/server/inspection/recognizers/copilot.ts`へ実装する
- [ ] T371 [US2] Documentedな`.vscode/mcp.json` extractor専用のinert JSONC modeを追加し、closed VS Code MCP field ID、field ごとに 1 つの解決済みの値、comment、schema distinction、Inspector numerical capを持たないenvironment-owned parser capacityを実装する。このVS Code extractorをroot `.mcp.json`のpath-only provenanceから呼ばず、独立したCLI extractionはCLI parserが所有する。malformed/extraction outcomeはrecognition-atomicかつsource-value-freeとし、decoder/parser/extractorの全throw/rejectionはcatch、cause classification、retry、recovered parser/extraction/recognition/derived result、Diagnostic、generationなしに変更なく伝播させる処理を`src/server/inspection/parsers/json.ts`へ追加する
- [ ] T372 [US2] `.vscode/mcp.json`の正確な解決済みの値の保持、condition、diagnostic、non-following relationshipに加え、root `.mcp.json`のpath-only conflict provenanceと独立したCLI-owned extractionを、VS Code所有root fieldおよびcross-provenance schema promotion 0件で`src/server/inspection/scan.ts`へ統合する
- [ ] T373 [US2] `.vscode/mcp.json` schemaとroot `.mcp.json` path-only conflict/unknown-schema provenance、merged CLI provenance、trust、安全性、VS Code所有root field 0件、total-order uncertaintyを区別するtyped detailと英語messageを`src/app/components/inspection/RecognitionDetails.vue`で拡張する

---

## フェーズ 32: Copilot agent-contained MCP contract と Cloud runtime fact

**目的**: Custom Agents を受け入れる前に、dormant かつ owner-gated な Copilot custom-agent MCP adapter を実装します。Cloud の out-of-box、custom-agent、Repository-settings MCP data は origin fileを持たない runtime/source fact としてのみ公開し、plugin path は読み取り権限を付与しない relationship のまま、settings は MCP owner にしません。

**独立テスト**: メモリ内 agent-owner fixture、plugin relationship path、settings near miss、Cloud fact を使って pure adapter を実行します。独立して受け入れられた agent ID なしには adapter が session recognition を生成しないこと、out-of-box→custom-agent→Repository-settings の後勝ち fact が origin fileを持たないままであること、plugin/settings が MCP recognition を作成しないこと、synthetic local file が現れないこと、hosted/remote I/O と connection がゼロであることを検証します。

**目に見えるチェックポイント**: Origin fileを持たない Cloud MCP fact と unavailable 状態が表示されます。Custom Agents wave が owner を受け入れて事前テスト済み adapter を有効化するまでは、local agent-contained row は現れません。

### テストを先に

- [ ] T374 [P] [US2] out-of-box→custom-agent→Repository-settings の後勝ち、synthetic agent-owner provenance、relationship-only の plugin path、settings の非所有、正確にこの 3 source だけに対する origin fileを持たない Cloud fact、local-candidate inference がないことに関する pure-adapter/Cloud MCP の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T375 [P] [US2] dormant adapter は独立して受け入れられた custom-agent ID なしには MCP を関連付けられず、plugin path と settings は MCP recognition または synthetic file を作成せず、Cloud の out-of-box/custom-agent/Repository-settings fact は file ID を持たないことを証明する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T376 [P] [US2] 内包サーバー、hosted リポジトリと settings、プラグイン、コマンド、URL、認証、参照対象を対象とするゼロ接続/ネットワークテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T377 [US2] origin fileを持たない out-of-box/custom-agent/Repository-settings 条件と既存ソースへのエビデンスバックリンクを備えた、読み取り権限を付与しない正確な `copilot.behavior.cloud.mcp` の事実を `tests/fixtures/conformance/vendor-behaviors.json` に具体化する
- [ ] T378 [US2] `copilot.behavior.cloud.mcp` が `shared.excluded.managed-remote-state` から参照される前に、失敗する正確な所有権と相互バックリンクのカバレッジを `tests/contract/vendor-behaviors.test.ts` に追加する
- [ ] T379 [US2] Copilot Cloud runtime MCP graph coverage と、unresolved Custom Agent behavior reference または candidate-rule addition を持たない pure owner-adapter contract の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T380 [US2] origin fileを持たない Cloud runtime fact、unavailable-state label、diagnostics、local hosted row ゼロ、owner admission 前の custom-agent-contained row ゼロを対象とするブラウザー受け入れテストを `tests/e2e/copilot-contained-cloud-mcp.spec.ts` に追加する

### 実装

- [ ] T381 [US2] managed/remote 除外から参照される前に、読み取り権限を付与しない、origin fileを持たない正確な `copilot.behavior.cloud.mcp` ランタイム/ソースの事実を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T382 [US2] ソース ID を作成せず、`copilot.behavior.cloud.mcp` の相互バックリンクを既存の公式ソースレコードへ 対象registry recordの`evidence` citation で追加する
- [ ] T383 [US2] 正確な Copilot Cloud out-of-box→custom-agent→Repository-settings order、これら 3 source に対する origin fileを持たない fact、hosted-unavailable condition、relationship-only の plugin path を備えた closed non-authorizing custom-agent owner-adapter interface を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T384 [US2] 受け入れ済み owner ID を要求する dormant custom-agent-only contained MCP dispatch を実装し、settings/plugin-path ownership を拒否し、origin fileを持たない Cloud out-of-box/custom-agent/Repository-settings runtime fact を duplicate uncertainty とともに `src/server/inspection/recognizers/copilot.ts` で投影する
- [ ] T385 [US2] 閉じた Copilot agent-contained MCP field ID、正確な owner-source の解決済みの値、source value を含まない diagnostics で Markdown extraction を `src/server/inspection/parsers/markdown.ts` において拡張する
- [ ] T386 [US2] origin fileを持たない runtime condition、recognition を伴わない plugin-path relationship、diagnostics、non-following relationship、およびフェーズ 54 で明示的に有効化されるまで local agent-contained recognition を dormant に保つ owner-ID gate を `src/server/inspection/scan.ts` に統合する
- [ ] T387 [US2] 型付き詳細と、英語の Copilot 内包/Cloud の所有者、利用不可状態、順序、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 33: Priority MCP インベントリ

**目的**: 最初の priority wave で利用できるすべての MCP surface、すなわち Codex config-carrier containment、Claude root/skill containment、Copilot CLI/VS Code file、Cloud fact を統合します。後続 owner 用 adapter は、内部の非公開 contract としてのみ保持します。

**独立テスト**: root `.mcp.json` に対する別々の Claude/Copilot recognition を持つ一つの物理 item/read、Copilot-only の nested/VS Code file、Codex carrier、Claude skill owner、origin fileを持たない Cloud fact、これらの family が受け入れられる前には custom-agent/settings/plugin/marketplace owner row がないこと、hosted synthetic file がないこと、決定論的な schema/provenance order、filter、path negative、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証します。

**目に見えるチェックポイント**: Priority MCP inventory を利用し、読み取り可能な physical file/owner と origin fileを持たない runtime fact を区別でき、まだ受け入れられていない owner family の premature row は表示されません。

### テストを先に

- [ ] T388 [US1] root/shared/nested CLI file、VS Code file、Codex carrier、Claude skill containment、dormant future-owner adapter、plugin-path relationship、settings non-owner、origin fileを持たない Cloud fact、malformed field、secret、path negative、注入した execution-environment throw/rejection に対する priority MCP fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T389 [US1] まだ所有されていない plugin/settings exclusion ID がなく、contained/runtime candidate rule がゼロであることを証明しながら、priority MCP behavior、file matcher、現在受け入れ済み owner/runtime selection、dormant adapter contract、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T390 [P] [US1] Claude root、Copilot CLI/VS Code file、Codex standalone がないこと、path-negative な User/hosted/configured input、relationship-only plugin path、contained/runtime MCP fact による candidate rule がゼロであることに関する完全な matcher test を `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T391 [P] [US1] shared root Claude/Copilot、Copilot-only nested/VS Code、Codex carrier、Claude skill owner、dormant custom-agent/other-Claude-owner adapter、origin fileを持たない Cloud fact、synthetic file がないこと、schema distinction、決定論的な provenance に関する priority recognition-matrix test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T392 [P] [US1] shared MCPのone-read、決定論的なrecognition/provenance order、現在受け入れ済みowner attachment、dormant-owner nonpublication、fileに閉じたoutcomeだけのpartial continuity、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected fileに閉じないfailure、connection/target readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T393 [US1] priority MCP inventory、shared attribution、現在の contained owner、origin fileを持たない runtime fact、dormant-owner row の不在、path negative、schema label、diagnostics、keyboard use を対象とするブラウザー受け入れテストを `tests/e2e/mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T394 [US1] priority MCP file/owner の one-read assembly、決定論的な recognition/provenance/schema order、owner-gated dormant adapter、synthetic file がないこと、source-value-free diagnostics を `src/server/inspection/scan.ts` で完成させる
- [ ] T395 [US1] dormant adapter を描画せず、MCP filter、shared recognition、admitted contained-owner、runtime-fact、schema summary を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で完成させる
- [ ] T396 [US1] 英語の priority MCP inventory、schema、admitted-owner、shared-recognition、runtime-fact、exclusion message をそれらを描画する Vue component に追加する

---

## フェーズ 34: MCP 比較

**目的**: 実際に読み取り可能な物理 file ID だけを選択可能としつつ、literal および typed MCP difference で比較を拡張します。Contained MCP は owner を通じて選択し、runtime fact だけでは選択できません。

**独立テスト**: admission 済み owner を介した contained declaration と Codex carrier 対 root `.mcp.json` の identity-preservation case を含め、priority wave の現行世代で読み取り可能な物理 file ID を正確に二つ選択します。完全な literal source に加え、整列された server、transport、schema、base、provenance、trust、selection、replacement、uncertainty を検証し、runtime-fact-only または dormant-owner の選択を拒否します。

**目に見えるチェックポイント**: ユーザーは MCP 宣言に接続せずに比較できる。

### テストを先に

- [ ] T397 [US3] 既存の FileDetail call で読み込む正確に二つの active-generation readable ID、admission 済み owner ID を介した contained MCP、runtime-fact/dormant-owner の拒否、完全な literal Codex-carrier 対 `.mcp.json` source、正確な `(tool, kind, fieldId)` の解決済みの値による server/transport/schema/provenance/trust/selection difference に関する selection と comparison の失敗回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T398 [US3] admission 済み owner の contained MCP、credential/environment-reference difference を含む完全な literal Codex-carrier 対 `.mcp.json` diff、typed server/provenance row、masking/reveal control または environment substitution なし、runtime-fact/dormant-owner の拒否に関するブラウザー受け入れテストを `tests/e2e/mcp-comparison.spec.ts` に追加する

### 実装

- [ ] T399 [US3] 実際に読み取り可能な物理所有者/ファイル ID による MCP 比較選択を強制し、Codex 設定対 `.mcp.json` のファイル同一性を `src/app/composables/comparison.ts` で維持する
- [ ] T400 [US3] MCP comparison row が `(tool, kind, fieldId)` で match して 解決済みの値を render し、origin file を持たない runtime fact を選択可能な file として露出しないよう `src/app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T401 [US3] 英語の MCP 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 35: Codex Rules inventory

**目的**: 可能な active project configuration layer から direct-child Codex rule file を追加します。

**独立テスト**: `[ANY_DIRECTORIES, '.codex', 'rules', /\.rules$/u]` を inventory 化し、nested rule directory、link、near miss、untrusted/runtime-inactive な certainty claim、User/managed rule、無関係な Copilot/Claude file を拒否します。

**目に見えるチェックポイント**: trust、layer、experimental-status、direct-child provenance を持つ Codex rule を filter できます。

### fixture とテストを先行

- [ ] T402 [US1] 可能な project layer、direct child、nested exclusion、malformed metadata、secret、reference、link、trust state、near miss に対する Codex rule fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T403 [US1] exclusion ID を定義せず、Codex rule behavior、candidate、composition、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T404 [US1] direct-child Codex rule、nested exclusion、project-layer provenance、experimental status、trust uncertainty、other-tool recognition なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T405 [US1] Codex rule inventory、filter、provenance、experimental status、exclusion、diagnostics に関するブラウザー受け入れテストを `tests/e2e/codex-rules-inventory.spec.ts` に追加する

### 実装

- [ ] T406 [US1] rule resolution が参照する前に、Codex rule lookup statement と、読み取り権限を付与しない `codex.behavior.user.rules` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T407 [US1] `codex.repo.rules` candidate record だけを追加し、exclusion ID を定義せず、adjacent または nested non-match を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T408 [US1] Codex rule evidence record と affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T409 [US1] Codex direct-child rule matching と path-derived recognition を `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T410 [US1] Codex rule の inventory row と、英語 label を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 36: Codex Rules の詳細

**目的**: 完全で非活性な Codex rule source、typed trust、active layer uncertainty、experimental status、relationship detail を追加する。

**独立テスト**: 不正な Codex rule を開き、正確な解決済みの値の保持、project layer/trust 条件、active layer の不確実性、experimental status、非活性な command/link、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Codex rule を選択すると、それを実行または適用せずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T411 [P] [US2] project layer、trust、active layer の不確実性、direct-child provenance、experimental status に関する、失敗する Codex metadata/applicability テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T412 [P] [US2] Codex rule のテキスト、link、command、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T413 [US2] reciprocal contract reference を備えた、失敗する Codex rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T414 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex rule detail、trust、applicability、diagnostics、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/codex-rules-detail.spec.ts` に追加する

### 実装

- [ ] T415 [US2] Codex rule の trust、layer、applicability、experimental-status、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T416 [US2] Codex metadata、applicability、relationship、正確な解決済みの値の保持 向けの非活性な rule extraction と scan integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
- [ ] T417 [US2] 型付き Codex rule 詳細フィールドを `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T418 [US2] 英語の Codex rule 詳細、trust、applicability、不確実性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 37: Claude Rules のインベントリ

**目的**: 再帰的な Claude rule ファイルを追加し、すでに所有済みの `copilot.excluded.additional-standard-locations` behavior を `.claude/rules` に対して回帰確認する。

**独立テスト**: `[ANY_DIRECTORIES, '.claude', 'rules', ANY_DIRECTORIES, /\.md$/u]` をインベントリに含め、可能性のある layer の不確実性を保持し、無関係な path と link を拒否し、一致する Claude rule ファイルが初期リリースで Copilot recognition を取得しないことを証明する。

**目に見えるチェックポイント**: ユーザーは path applicability provenance を備え、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。

### fixture とテストを先に

- [ ] T419 [US1] recursive path、可能性のある layer、`paths` frontmatter、nested file、不正な metadata、secret、reference、link、Copilot-compatible case、near miss を対象とする Claude rule fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T420 [US1] Claude rule の behavior、candidate、composition、evidence、および既存の `copilot.excluded.additional-standard-locations` row への regression reference を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T421 [P] [US1] recursive Claude rule、layer の不確実性、direct/nested file、既存の `copilot.excluded.additional-standard-locations` rule による Copilot recognition ゼロに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T422 [US1] Claude rule inventory、filter、provenance、Copilot exclusion evidence、診断、保持された Codex rule に関するブラウザー受け入れテストを `tests/e2e/claude-rules-inventory.spec.ts` に追加する

### 実装

- [ ] T423 [US1] rule layering が参照する前に、Claude rule lookup statement、読み取り権限を付与しない `claude.behavior.user.rules`、Copilot compatibility evidence を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T424 [US1] `claude.repo.rules` candidate だけを追加し、既存の `copilot.excluded.additional-standard-locations` record を保持して参照し、別の exclusion は定義しない処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T425 [US1] Claude rule evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T426 [US1] Copilot へ昇格させずに、Claude の再帰的な rule matching と recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T427 [US1] Claude rule classification を統合し、Codex rule result を `src/server/inspection/scan.ts` で保持する
- [ ] T428 [US1] inventory row と、英語の Claude rule および Copilot exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 38: Claude Rules の詳細

**目的**: 完全で非活性な Claude rule source、typed `paths` applicability、layer condition、relationship を追加する。

**独立テスト**: 不正な Claude rule を開き、`paths`、不明な glob base、conditional layer、正確な解決済みの値、非活性な link/command、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Claude rule を選択すると、任意の filesystem path に対して glob を評価せずに完全で非活性な applicability detail が表示される。

### テストを先に

- [ ] T429 [P] [US2] `paths`、省略された path、不明な glob base、conditional layer、documentation uncertainty に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T430 [P] [US2] Claude rule のテキスト、link、command、glob、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T431 [US2] reciprocal contract reference を備えた、失敗する Claude rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T432 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude rule detail、path applicability、layer condition、diagnostics、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/claude-rules-detail.spec.ts` に追加する

### 実装

- [ ] T433 [US2] Claude rule layering、path-applicability、unknown-base、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T434 [US2] Claude rule metadata、applicability、relationship、正確な解決済みの値の保持 向けの非活性な Markdown extraction と scan integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
- [ ] T435 [US2] 型付き Claude rule 詳細フィールドと、英語の applicability および不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 39: Rules の比較

**目的**: literal および型付きの rule 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation rule fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したpath、layer、trust、provenance、applicability、documentation statusを検証する。

**目に見えるチェックポイント**: どちらの rule が正しいか、または強いかを評価せずに rule ファイルを比較できる。

### テストを先に

- [ ] T436 [US3] `(tool, kind, fieldId)` の解決済みの値、rule path、layer、trust、provenance、documentation status に関する rule comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T437 [US3] credential/environment-reference difference を含む完全な literal rule diff、正確な metadata row、masking/reveal または environment substitution なし、typed rule difference に関するブラウザー受け入れテストを `tests/e2e/rules-comparison.spec.ts` に追加する

### 実装

- [ ] T438 [US3] rule comparison row が `(tool, kind, fieldId)` で match して解決済みの `value` を render し、typed rule state を分離したままにするよう `src/app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T439 [US3] 英語の rule comparison メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 40: Claude Commands のインベントリ

**目的**: 再帰的な Claude legacy-command ファイルと namespace provenance を追加する。

**独立テスト**: `[ANY_DIRECTORIES, '.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]`、再帰的な namespace path、duplicate name、可能性のある layer の不確実性、link、near miss、未対応の standalone `.claude/prompts` をインベントリで確認する。

**目に見えるチェックポイント**: ユーザーは再帰的な namespace と layer provenance を備えた Claude command をフィルタリングできる。

### fixture とテストを先に

- [ ] T440 [US1] recursive namespace、可能性のある layer、duplicate name、不正な metadata、secret、reference、link、未対応の `.claude/prompts`、near miss を対象とする Claude command fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T441 [US1] exclusion ID を定義せず、Claude command の behavior、candidate、composition、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T442 [US1] recursive Claude command、namespace construction、可能性のある layer の不確実性、除外された standalone `.claude/prompts` に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T443 [US1] Claude command inventory、namespace、filter、exclusion、診断に関するブラウザー受け入れテストを `tests/e2e/claude-commands-inventory.spec.ts` に追加する

### 実装

- [ ] T444 [US1] command selection が参照する前に、Claude command lookup statement と読み取り権限を付与しない `claude.behavior.user.commands` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T445 [US1] exclusion ID を定義せず、prompt、User、configured-location path を path-negative のままにして、`claude.repo.command` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T446 [US1] Claude command evidence record と affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T447 [US1] Claude の再帰的な command matching と namespace recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T448 [US1] command inventory row と、英語の Claude namespace メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 41: Claude Commands の詳細

**目的**: 完全な literal Claude command source、namespace、invocation、同名 skill の precedence、applicability、非活性な relationship detail を追加する。

**独立テスト**: 不正な Claude command を開き、recursive namespace、同名 skill の precedence、不明な traversal、正確な解決済みの値、非活性な agent/skill reference、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Claude command を選択すると、参照先を実行、import、read せずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T449 [P] [US2] namespace、invocation、agent/skill reference、同名 skill priority、不明な ancestor traversal に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T450 [P] [US2] Claude command body と reference が target を実行、navigate、import、read しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T451 [US2] reciprocal contract reference を備えた、失敗する Claude command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T452 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude command detail、namespace、reference、condition、diagnostics に関するブラウザー受け入れテストを `tests/e2e/claude-commands-detail.spec.ts` に追加する

### 実装

- [ ] T453 [US2] Claude command selection、namespace、skill precedence、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T454 [US2] Claude command metadata、reference、applicability、正確な解決済みの値の保持 向けの Markdown extraction と scan integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
- [ ] T455 [US2] 型付き Claude command 詳細フィールドを `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T456 [US2] 英語の Claude command 詳細、precedence、reference、不確実性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 42: Copilot Commands のインベントリ

**目的**: root direct-child の `.claude/commands/*.md` だけを対象とする保守的な Copilot CLI command recognition を追加する。

**独立テスト**: root direct-child command をインベントリに含め、nested command と未対応の User/configured location を拒否し、同じ物理 Claude ファイルを保持し、より広い Copilot command traversal を創作しない。

**目に見えるチェックポイント**: ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。

### fixture とテストを先に

- [ ] T457 [US1] root direct child、nested exclusion、duplicate name、共有 Claude file、不正な metadata、secret、reference、User/configured path、near miss を対象とする Copilot command fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T458 [US1] 無関係な exclusion ID を関連付けず、Copilot CLI command behavior、保守的な candidate、path-negative configured/User case、composition、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T459 [P] [US1] root direct-child Copilot command、nested rejection、共有 Claude file、創作された ancestor/User matcher がないことに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T460 [US1] Copilot command row、CLI provenance、nested exclusion、診断、保持された Claude command に関するブラウザー受け入れテストを `tests/e2e/copilot-commands-inventory.spec.ts` に追加する

### 実装

- [ ] T461 [US1] 読み取り権限を持たない Copilot CLI command lookup statement を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T462 [US1] 無関係な exclusion ID を定義または参照せず、configured/User location を path-negative のままにして、保守的な `copilot.repo.command` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T463 [US1] Copilot command evidence record と affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T464 [US1] Copilot の root direct-child command matching と recognition を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T465 [US1] Copilot command classification と、一度だけ読み取る shared-file assembly を `src/server/inspection/scan.ts` に統合する
- [ ] T466 [US1] inventory row と、英語の Copilot CLI command メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 43: Copilot Commands の詳細

**目的**: 保守的な applicability と同名 skill の precedence を備えた、完全な literal Copilot CLI command detail を追加する。

**独立テスト**: 不正な root command file を開き、invocation、skill priority、不明な project ancestry、非活性な reference、正確な解決済みの値、diagnostics、detail-state cleanup を、Claude runtime の前提を import せずに検証する。

**目に見えるチェックポイント**: Copilot command を選択すると、完全で非活性な CLI-qualified detail と uncertainty が表示される。

### テストを先に

- [ ] T467 [P] [US2] invocation、同名 skill priority、direct-child provenance、不明な ancestry、reference、正確な evidence に関する失敗する Copilot command metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T468 [P] [US2] Copilot command body、reference、navigation、import、target read に関する失敗する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T469 [US2] reciprocal contract reference を備えた、失敗する Copilot command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T470 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot command detail、invocation、reference、condition、diagnostics に関するブラウザー受け入れテストを `tests/e2e/copilot-commands-detail.spec.ts` に追加する

### 実装

- [ ] T471 [US2] Copilot command invocation、保守的な applicability、skill precedence、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T472 [US2] exact metadata、condition、relationship、診断、evidence を備えるよう Copilot command recognition を `src/server/inspection/recognizers/copilot.ts` で拡張する
- [ ] T473 [US2] Copilot command parsing、正確な解決済みの値の保持、非活性な reference、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T474 [US2] 型付き詳細と、英語の Copilot command precedence、reference、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 44: 統合 Commands インベントリ

**目的**: 正しい root-shared および nested-Claude-only recognition により、Claude と Copilot の command candidate を統合する。

**独立テスト**: root direct-child の `.claude/commands/*.md` について一つの物理 item/read と二つの recognition、nested command について Claude-only recognition、決定論的な namespace/provenance、filter、exclusion、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証する。

**目に見えるチェックポイント**: ユーザーは共有 root command と nested Claude-only command を区別できる。

### テストを先に

- [ ] T475 [US1] recursive Claude namespace、root の Copilot-compatible command、nested Claude-only file、duplicate name、secret、reference、injected throw/rejection、near miss を対象とする command fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T476 [US1] 両ベンダー、shared recognition、exclusion ID を伴わない path-negative configured/User case、composition、relationship、evidence の command conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T477 [US1] root の共有 direct child、nested Claude-only command、namespace construction、除外された `.claude/prompts` に関する完全な matcher/recognition-matrix テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T478 [P] [US1] 一度だけ読み取るroot command、決定論的なrecognition/provenance order、fileに閉じたoutcomeだけのpartial continuity、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected fileに閉じないfailure、referenced-target readなしに関する失敗する統合テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T479 [US1] 統合 command inventory、namespace、shared recognition、nested Claude-only row、filter、診断に関するブラウザー受け入れテストを `tests/e2e/commands-inventory.spec.ts` に追加する

### 実装

- [ ] T480 [US1] 一度だけ読み取る root command assembly、nested Claude-only recognition、決定論的な provenance、exclusion を `src/server/inspection/scan.ts` で完成させる
- [ ] T481 [US1] command inventory row と、英語の namespace、shared-tool、exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 45: Commands の比較

**目的**: literal および型付きの command 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation command fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したnamespace、invocation、recognition、precedence、provenance、referenceを検証する。

**目に見えるチェックポイント**: command ファイルを実行せずに比較できる。

### テストを先に

- [ ] T482 [US3] `(tool, kind, fieldId)` の解決済みの値、namespace、invocation、tool recognition、precedence、reference に関する command comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T483 [US3] credential/environment-reference difference を含む完全な literal command diff、正確な metadata row、masking/reveal または environment substitution なし、typed command difference に関するブラウザー受け入れテストを `tests/e2e/commands-comparison.spec.ts` に追加する

### 実装

- [ ] T484 [US3] command comparison row が `(tool, kind, fieldId)` で match して解決済みの `value` を render し、typed namespace/invocation state を分離したままにするよう `src/app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T485 [US3] 英語の command comparison メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 46: Copilot Prompts のインベントリ

**目的**: 対応する Copilot prompt ファイルをインベントリに追加する。

**独立テスト**: direct `.github/prompts/*.prompt.md` ファイルをインベントリに含め、nested candidate と configured-location candidate を除外する。

**目に見えるチェックポイント**: ユーザーは正確な default-location provenance を備えた対応 Copilot prompt をフィルタリングできる。

### fixture とテストを先に

- [ ] T486 [US1] direct child、nested near miss、不正な metadata、secret、link、`#file` reference、image、URI を対象とする Copilot prompt fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T487 [US1] prompt row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T488 [US1] 正確な default prompt location、nested exclusion、configured-location uncertainty に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T489 [US1] Copilot prompt inventory と exclusion に関するブラウザー受け入れテストを `tests/e2e/prompts-inventory.spec.ts` に追加する

### 実装

- [ ] T490 [US1] prompt 詳細と後続の User-runtime exclusion が参照する前に、Copilot prompt lookup statement と読み取り権限を付与しない `copilot.behavior.vscode.user.prompts` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T491 [US1] 無関係な exclusion ID を定義または参照せず、configured/User/non-default location を path-negative のままにして、`copilot.repo.prompt` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T492 [US1] prompt evidence record と affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T493 [US1] Copilot prompt matching と recognition を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T494 [US1] prompt inventory row と、意味的に同等な location/exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 47: Copilot Prompts の詳細

**目的**: 完全な literal prompt source、invocation、scope、applicability、非活性な reference detail を追加する。

**独立テスト**: 不正な prompt を開き、正確な解決済みの値の保持、明示的な invocation、reference、URI/image/navigation の動作がないこと、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Copilot prompt を選択すると、参照先へ移動したり読み取ったりせずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T495 [P] [US2] invocation、scope、reference、applicability、evidence に関する失敗する prompt metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T496 [P] [US2] prompt の link、image、URI、`#file` target が移動も read の認可もしないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T497 [US2] reciprocal contract reference を備えた、失敗する prompt runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T498 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal prompt detail と非活性な reference に関するブラウザー受け入れテストを `tests/e2e/prompts-detail.spec.ts` に追加する

### 実装

- [ ] T499 [US2] prompt invocation、applicability、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T500 [US2] prompt metadata、非活性な reference、applicability、正確な解決済みの値の保持 向けの Markdown extraction と scan integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
- [ ] T501 [US2] 型付き prompt 詳細フィールドを `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T502 [US2] 英語の prompt 詳細、invocation、reference、安全性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 48: Copilot Prompts の比較

**目的**: literal および型付きの Copilot prompt 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation prompt fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したinvocation、scope、provenance、applicability、referenceを検証する。

**目に見えるチェックポイント**: コンテンツへ移動したり実行したりせずに Copilot prompt を比較できる。

### テストを先に

- [ ] T503 [US3] `(tool, kind, fieldId)` の解決済みの値、prompt invocation、scope、provenance、reference に関する prompt comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T504 [US3] credential/environment-reference difference を含む完全な literal prompt diff、正確な metadata row、masking/reveal または environment substitution なし、typed prompt difference に関するブラウザー受け入れテストを `tests/e2e/prompts-comparison.spec.ts` に追加する

### 実装

- [ ] T505 [US3] prompt comparison row が `(tool, kind, fieldId)` で match して解決済みの `value` を render し、typed invocation/scope state を分離したままにするよう `src/app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T506 [US3] 英語の prompt comparison メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 49: Codex Custom Agents inventory

**目的**: 対応する Codex `.codex/agents/*.toml` custom-agent candidate を追加します。

**独立テスト**: 可能な project layer の direct-child TOML agent、duplicate name、near miss、nested exclusion、link、任意の config-path reference、hosted-state exclusion、traversal uncertainty を inventory 化します。

**目に見えるチェックポイント**: 正確な project-layer provenance を持つ Codex custom-agent file を filter できます。

### fixture とテストを先行

- [ ] T507 [US1] root/descendant project layer、direct child、nested near miss、duplicate name、malformed TOML、secret、config-path reference、link、hosted/User exclusion に対する Codex custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T508 [US1] exclusion ID を定義せず、Codex custom-agent behavior、matcher、composition、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T509 [US1] `codex.repo.agent`、direct-child TOML、nested exclusion、project-layer uncertainty、任意の config-path promotion なしに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T510 [US1] Codex custom-agent inventory、filter、provenance、exclusion、diagnostics、agent-owned MCP recognition がないことに関するブラウザー受け入れテストを追加し、既存 carrier inheritance は detail 時の relationship だけであることを `tests/e2e/codex-custom-agents-inventory.spec.ts` で検証する

### 実装

- [ ] T511 [US1] inheritance が参照する前に、Codex custom-agent lookup statement と、読み取り権限を付与しない `codex.behavior.user.agents` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T512 [US1] Codex custom-agent candidate record だけを追加し、exclusion ID を定義せずに nested、configured、User、managed location を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T513 [US1] Codex custom-agent evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T514 [US1] Codex agent matching とclosedなallowlist済みrecognition を `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T515 [US1] Codex custom-agent kind と project-layer provenance に対する inventory row を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する
- [ ] T516 [US1] 英語の Codex custom-agent inventory および exclusion message をそれらを描画する Vue component に追加する

---

## フェーズ 50: Codex Custom Agents 詳細

**目的**: 完成済みの Codex MCP carrier を agent の MCP owner とするのではなく relationship source として再利用しながら、完全で非活性な Codex custom-agent source、spawned-session configuration、inheritance、relationship、condition detail を追加します。

**独立テスト**: malformed および malformed な Codex agent を開き、execution environmentのcapacityだけに従うinert TOML parsing、model/reasoning/sandbox/skill、parent inheritance、再適用された live sandbox/approval fact、MCP carrier inheritance/origin relationship、agent-owned MCP recognition がないこと、config-path relationship、正確な解決済みの値、diagnostics、detail-state cleanup、zero connection を検証します。

**目に見えるチェックポイント**: Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で非活性な spawned-session detail と carrier-inheritance relationship が表示されます。

### テスト先行

- [ ] T517 [P] [US2] Codex agent field、recognition-atomicな`recognition-parse-failed` diagnosticとなるmalformed input、Inspector-defined numeric capを持たないenvironment-owned parser capacity、およびparser、extraction、recognition、item、record、response、partial resultを返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するinert TOML parsingの失敗テストを`tests/unit/inspection/parsers.test.ts`に追加する
- [ ] T518 [P] [US2] model、reasoning、sandbox、skill、agent-owned MCP recognition を持たない closed MCP carrier-origin relationship、config-path relationship、parent inheritance、live sandbox/approval reapplication に関する Codex agent の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T519 [P] [US2] Codex agent declaration が tool の実行、process の spawn、MCP への接続、参照 config path の読み取りを行わないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T520 [US2] relationship-only の carrier inheritance、agent-owned MCP recognition がないこと、reciprocal contract reference に関する Codex custom-agent runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T521 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex custom-agent detail、agent-owned MCP row を持たない carrier-linked MCP inheritance relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T522 [US2] 既存のinert TOML carrier parser を Codex agent normalization と extraction で `src/server/inspection/parsers/toml.ts` において拡張する
- [ ] T523 [US2] 既存の Codex config/MCP strategy を relationship-only の agent inheritance、spawned-session context、selection、sandbox/approval、agent-owned MCP recognition の明示的な禁止で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T524 [US2] Codex agent metadata、applicability、正確な literal carrier-linked MCP inheritance/origin relationship、agent-owned MCP recognition ゼロ、connection ゼロ、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T525 [US2] typed Codex custom-agent detail と uncertainty を `src/app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T526 [US2] 英語の Codex custom-agent detail、inheritance、relationship、uncertainty message をそれらを描画する Vue component に追加する

---

## フェーズ 51: Claude Custom Agents inventory

**目的**: agent-memory directory を candidate として admission せず、可能な project layer に recursive Claude subagent file を追加します。

**独立テスト**: 対応する `.claude/agents/**/*.md` file、duplicate name、layer uncertainty、nested path、link、malformed content、`--add-dir` runtime fact、除外された agent-memory/User location を inventory 化します。

**目に見えるチェックポイント**: layer provenance と duplicate-name uncertainty を持つ Claude custom agent を filter できます。

### fixture とテストを先行

- [ ] T527 [US1] recursive path、layer、duplicate name、malformed metadata、secret、reference、memory declaration、link、`--add-dir` fact、除外された memory/User location に対する Claude subagent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T528 [US1] フェーズ 25 で所有済みの Claude Repository agent behavior を再利用し、duplicate behavior または exclusion ID を作成せず、残りの agent/User-memory behavior、matcher、path-negative case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T529 [P] [US1] recursive Claude agent directory、可能な layer root、duplicate name、agent-memory または任意の `--add-dir` candidate なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T530 [US1] Claude custom-agent row、filter、layer、exclusion、diagnostics、維持される Codex agent に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T531 [US1] フェーズ 25 で所有済みの `claude.behavior.repo.agents` と `claude.behavior.user.mcp-state` を再利用し、agent context と relationship strategy が参照する前に `claude.behavior.user.agents`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory` だけを `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T532 [US1] `claude.repo.agent` candidate record だけを追加し、exclusion ID を定義せずに memory、User、additional-directory location を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T533 [US1] Claude custom-agent evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T534 [US1] Claude agent matching とclosedなallowlist済みrecognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T535 [US1] memory または任意の additional directory を読み取らず、Claude agent classification を `src/server/inspection/scan.ts` に統合する
- [ ] T536 [US1] Claude agent の inventory row と、英語の agent、layer、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 52: Claude Custom Agents 詳細

**目的**: 完全で非活性な Claude subagent context detail を追加し、フェーズ 27 で完成した owner-gated MCP adapter を有効化し、memory と Hook target は inert のままにします。

**独立テスト**: malformed および malformed な Claude agent を開き、fresh/fork context、tool、skill、memory-scope fact、nested-spawn limit、duplicate-name uncertainty、agent reference、owner-attached MCP metadata、正確な解決済みの値の保持、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude custom agent を選択すると、memory を読み取ったり MCP に接続したりせず、完全で非活性な context と relationship detail が表示されます。

### テスト先行

- [ ] T537 [P] [US2] context mode、tool、skill、closed MCP/Hook origin、memory scope、nested spawning、duplicate-name uncertainty、built-in omission、agent reference に関する Claude agent の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T538 [P] [US2] 独立して admission された skill/agent、除外された memory root、runtime-only input、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T539 [P] [US2] tool、skill、Hook、MCP、memory、command、link、agent reference に対する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T540 [US2] reciprocal contract reference を持つ Claude agent context-composition とフェーズ 27 MCP owner-adapter activation の失敗 coverage test を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T541 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude custom-agent detail、context、tool、owner-attached MCP、relationship、diagnostics、zero connection、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T542 [US2] Claude agent selection、fresh/fork context、tool、skill-preload、memory-fact、nested-spawn、relationship strategy を追加し、既存 MCP adapter を現在所有済みの agent behavior に `src/shared/registries/runtime-composition.ts` で関連付ける
- [ ] T543 [US2] closedなallowlist済みagent metadata、owner-gated contained MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Claude recognition を `src/server/inspection/recognizers/claude.ts` において拡張する
- [ ] T544 [US2] Claude agent metadata、正確な解決済みの値の保持、synthetic file または connection を作成しない owner-attached MCP、relationship-only の memory/Hook target、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T545 [US2] typed detail と、英語の Claude agent context、memory、relationship、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 53: Copilot Custom Agents inventory

**目的**: 別々の VS Code、CLI、Cloud provenance を持つ、対応する Copilot `.github/agents/*.md` と `.claude/agents/*.md` candidate を追加します。

**独立テスト**: 可能な context の direct-child agent、filename variant、duplicate name、shared Claude file、near miss、runtime-only fact としての hosted organization agent、exclusion としての configured/User location を inventory 化します。

**目に見えるチェックポイント**: surface-qualified provenance を持つ Copilot custom agent を filter できます。

### fixture とテストを先行

- [ ] T546 [US1] 両方の directory、direct-child boundary、Cloud filename variant、duplicate name、shared Claude file、malformed metadata、secret、handoff、configured/User path、hosted organization fact に対する Copilot agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T547 [US1] フェーズ 30 で所有済みの Copilot VS Code agent behavior を再利用し、duplicate behavior または無関係な exclusion ID を作成せず、origin fileを持たない正確な `copilot.behavior.cloud.organization-agents` を含む残りの CLI/Cloud agent behavior、matcher、path-negative configured/User/hosted case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T548 [P] [US1] 両方の Copilot agent directory、direct-child depth、surface provenance、hosted/runtime-only fact、configured-root rejection、shared Claude file に関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T549 [US1] Copilot custom-agent row、surface badge、filter、exclusion、diagnostics、維持される Codex/Claude agent に関するブラウザー受け入れテストを `tests/e2e/copilot-custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T550 [US1] フェーズ 30 で所有済みの `copilot.behavior.vscode.agents` を再利用し、local/Cloud selection と managed/remote exclusion が参照する前に、残りの surface-qualified local-agent fact、`copilot.behavior.vscode.user.agents`、`copilot.behavior.cli.user.agents`、origin fileを持たない `copilot.behavior.cloud.organization-agents` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T551 [US1] `copilot.repo.agent` candidate だけを追加し、無関係な exclusion ID を定義または参照せず、configured/User/hosted location を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T552 [US1] `copilot.behavior.cloud.organization-agents` の existing-source backlink を含む、Copilot custom-agent evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T553 [US1] Copilot agent matching と surface-qualified recognition を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T554 [US1] Copilot agent classification と一度だけ読み取る shared physical-file assembly を `src/server/inspection/scan.ts` に統合する
- [ ] T555 [US1] Copilot agent の inventory row と、英語の agent、surface、shared-file、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 54: Copilot Custom Agents 詳細

**目的**: 完全で inert な Copilot agent detail を追加し、フェーズ 32 の owner-gated MCP adapter を有効化し、VS Code/CLI/Cloud の context difference を維持して、Hook-family semantics だけを延期します。

**独立テスト**: malformed および malformed な Copilot agent を開き、body、tool、model、invocation、handoff、instruction、skill、closed Hook origin、owner-attached MCP、surface selection、正確な解決済みの値の保持、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。

### テスト先行

- [ ] T556 [P] [US2] VS Code/CLI/Cloud body、tool、model、handoff、instruction、skill、closed Hook origin、フェーズ 32 MCP adapter activation、surface selection に関する Copilot agent の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T557 [P] [US2] handoff、link、skill preload、instruction、runtime-only organization agent、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T558 [P] [US2] Copilot agent declaration が tool、handoff、Hook、MCP、link、参照 file を invoke しないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T559 [US2] reciprocal contract reference を持つ Copilot agent context-composition と owner-gated MCP activation graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T560 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot custom-agent detail、surface context、owner-attached MCP、relationship、diagnostics、connection がゼロであること、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T561 [US2] 別々の Copilot VS Code、CLI、Cloud agent selection、context、handoff、tool、relationship strategy を追加し、フェーズ 32 MCP adapter を受け入れ済み agent owner に `src/shared/registries/runtime-composition.ts` で関連付ける
- [ ] T562 [US2] closedなallowlist済みagent metadata、owner-gated MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Copilot recognition を `src/server/inspection/recognizers/copilot.ts` において拡張する
- [ ] T563 [US2] Copilot agent metadata、正確な解決済みの値の保持、synthetic file も connection も作成しない owner-attached MCP、relationship-only Hook target、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T564 [US2] typed detail と、英語の Copilot agent context、handoff、surface、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 55: 統合 Custom Agents inventory

**目的**: すべての custom-agent candidate を統合し、共有 Claude/Copilot file を一度だけ読み取り、フェーズ 52 と 54 で有効化した owner-attached MCP adapter を回帰し、Codex carrier inheritance は relationship-only のまま維持します。

**独立テスト**: all-vendor agent fixture を使用し、共有 `.claude/agents/*.md` に対する一つの物理 row/read、同じ owner ID 上の別々の Claude/Copilot agent recognition と MCP recognition、Codex agent-owned MCP recognition を作成しない Codex carrier inheritance relationship、決定論的な provenance、synthetic MCP file または connection がないこと、filter、duplicate-name uncertainty、exclusion、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証します。

**目に見えるチェックポイント**: 完全な custom-agent inventory、共有 Claude/Copilot interpretation と owner-attached MCP fact、および duplicate file や誤った MCP ownership を伴わない Codex carrier-inheritance relationship を理解できます。

### テスト先行

- [ ] T565 [US1] 対応するすべての path、layer、duplicate name、shared Claude/Copilot file、Claude/Copilot owner-attached MCP declaration、Codex carrier-inheritance relationship、malformed metadata、secret field、reference、exclusion、injected throw/rejection に対する all-vendor custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T566 [US1] custom-agent behavior、matcher、Claude/Copilot owner-gated MCP composition、Codex relationship-only carrier inheritance、exclusion ID を持たない path-negative configured/User/hosted case、evidence conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T567 [US1] agent-owned MCP recognition を持たない Codex TOML、Claude recursive Markdown、Copilot directory、一つの owner ID 上に agent と MCP の recognition を持つ shared Claude/Copilot file、traversal uncertainty、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T568 [P] [US1] 一度だけ読み取るshared agent、決定論的なClaude/Copilot agent/MCP recognitionとprovenance order、Codex relationship-only carrier inheritance、分離されたfileに閉じたfailure、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected fileに閉じないfailure、synthetic file/connectionゼロ、relationship-target readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T569 [US1] 統合 custom-agent inventory、filter、共有 Claude/Copilot owner-attached MCP recognition、agent-owned MCP row を持たない Codex carrier-inheritance relationship、duplicate uncertainty、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T570 [US1] custom agent に対する決定論的な physical-file assembly、Claude/Copilot agent/MCP recognition、Codex relationship-only carrier inheritance、provenance、exclusion、no-synthetic-file behavior を `src/server/inspection/scan.ts` で完成させる
- [ ] T571 [US1] すべての custom-agent kind、shared recognition、provenance、duplicate-name uncertainty に対する inventory row を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する
- [ ] T572 [US1] 英語の unified custom-agent inventory および shared-recognition message をそれらを描画する Vue component に追加する

---

## フェーズ 56: Custom Agents 比較

**目的**: comparison を literal および typed な custom-agent difference へ拡張します。

**独立テスト**: Readableなcurrent-generation custom-agent fileを正確に2つ比較し、完全なliteral sourceと、整列したcontext、tool、該当する場合のClaude/Copilot owner-attached MCPまたはCodex carrier-inheritance relationship、provenance、relationship、condition differenceを検証する。

**目に見えるチェックポイント**: custom-agent definition を実行または ranking せずに比較できます。

### テスト先行

- [ ] T573 [US3] `(tool, kind, fieldId)` の解決済みの値、context、tool、Claude/Copilot owner-attached MCP、Codex carrier relationship、provenance、condition に関する失敗する custom-agent comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T574 [US3] credential/environment-reference の差を含む完全なリテラルの custom-agent diff、正確な metadata row、masking/reveal も environment substitution もないこと、vendor ごとに正しい typed MCP ownership/relationship に関する browser acceptance を `tests/e2e/custom-agents-comparison.spec.ts` に追加する

### 実装

- [ ] T575 [US3] custom-agent comparison row が `(tool, kind, fieldId)` で照合して解決済みの `value` を render するよう拡張し、Claude/Copilot owner-attached MCP と Codex relationship-only inheritance を `src/app/components/comparison/RecognitionComparison.vue` で明確に区別したままにする
- [ ] T576 [US3] 英語の custom-agent comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 57: Codex Configuration recognition

**目的**: 二つ目の candidate、behavior record、evidence record、file read を追加せず、`settings/config` recognition と inventory presentation を、フェーズ 23 で受け入れ済みの `.codex/config.toml` carrier に追加します。

**独立テスト**: direct/near-miss path、link、malformed filename、trust-conditional provenance を備えた root/descendant carrier を再利用します。同じ physical ID/read が既存 MCP と新しい `settings/config` recognition の両方を持ち、configured instruction fallback は変わらず、higher-scope path は新しい Repository exclusion ID なしに negative のままであることを検証します。

**目に見えるチェックポイント**: MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。

### fixture とテストを先行

- [ ] T577 [US1] 既存 Codex carrier fixture を、一般 configuration field、layer variant、near miss、link、malformed file、secret、inline declaration、path-negative higher-scope case で `tests/fixtures/repositories/build-fixtures.ts` において拡張する
- [ ] T578 [US1] 新しい `settings/config` recognition と trust-condition row を、すでに所有済みの `codex.repo.config` candidate、config behavior、正確な evidence record を再利用して `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json` に具体化する
- [ ] T579 [P] [US1] フェーズ 23 が `codex.repo.config` と `[ANY_DIRECTORIES, '.codex', 'config.toml']` の唯一の owner のままであり、duplicate candidate が追加されず、higher-scope location は発明した exclusion なしに path-negative のままであることを証明する registry/matcher の失敗回帰テストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T580 [P] [US1] 新しい `settings/config` kind、layer provenance、trust uncertainty、既存 MCP recognition/fallback provenance との共存、premature Hook recognition がないことに関する Codex configuration recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T581 [US1] 既存 Codex carrier 上の決定論的な recognition augmentation、一度の read、維持される MCP/fallback identity、isolated failure、configured-target read ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T582 [US1] Codex configuration row、filter、layer provenance、既存 MCP/fallback badge、exclusion、diagnostics、一つの physical carrier row に関するブラウザー受け入れテストを `tests/e2e/codex-config-inventory.spec.ts` に追加する

### 実装

- [ ] T583 [US1] フェーズ 15 で所有済みの Codex project/User configuration behavior statement を再利用し、duplicate behavior ID を `src/shared/registries/vendor-behaviors.ts` に追加しない
- [ ] T584 [US1] フェーズ 23 で所有済みの `codex.repo.config` candidate を再利用して rule ID を追加せず、`codex.excluded.user-runtime` は consent-gated Global phase まで延期する処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T585 [US1] source ID を作成せず、既存 Codex configuration evidence record の reciprocal presentation coverage を再利用し、対象registry recordの`evidence` citation で拡張する
- [ ] T586 [US1] configured target を parse したり MCP/fallback recognition を変更したりせず、既存 carrier matcher に path-derived `settings/config` recognition を `src/server/inspection/recognizers/codex.ts` で追加する
- [ ] T587 [US1] 先行する skill、instruction、MCP result を維持しながら、one-read Codex carrier 上の決定論的な recognition augmentation を `src/server/inspection/scan.ts` に統合する
- [ ] T588 [US1] Codex configuration の inventory filter、row、英語 message を `src/app/components/inventory/InventoryFilters.vue`、そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 58: Codex Configuration 詳細

**目的**: フェーズ 23～24 の最小 inert TOML carrier を、残りの inert Codex configuration field とその `settings/config` detail で拡張します。Configured instruction fallback と MCP detail はすでに有効です。

**独立テスト**: malformed および secret-bearing な project config layer を開き、既存 atomic TOML parse の拡張、root から `cwd` への precedence、closest-value behavior、trust、relative base、すでに有効な fallback/MCP field、残りの inert declaration、正確な解決済みの値の保持、diagnostics、2 度目の read/derivation を伴わない detail-state cleanup を検証します。

**目に見えるチェックポイント**: `.codex/config.toml` を選択すると、宣言された target を読み取らず、完全で inert な typed configuration と fallback declaration が表示されます。

### テスト先行

- [ ] T589 [US2] Array/table、relative-path base、deterministic returned malformed recognition-atomic extraction、Inspector numeric capなしのenvironment-owned parser capacityに関するfailing inert TOML testを`tests/unit/inspection/parsers.test.ts`へ追加する。NUL-containing byteはdiagnostic-only `binary`のまま、全non-NUL inputはreadable `utf-8`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial statusにせずTOML parsing/display/comparisonまで伝播することを要求する。Decoder/parser/extractorの全throw/rejectionはdomain catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる
- [ ] T590 [P] [US2] Root から `cwd` への layer、closest-value behavior、trust、vendor/runtime と execution environment の capacity だけに従う設定済みの全 literal fallback basename、declaration、除外された higher scope、parser または extractor の failure が該当 recognition の`recognition-parse-failed` diagnostic を生み、読み取れた source は表示され続けること、そして1 file に限定されない failure は result も generation も残さず attempt を中止し、以前の commit 済み snapshot だけを維持することを証明する Codex config の失敗テストを`tests/unit/inspection/codex-metadata.test.ts`に追加する。Domain layer は throw/rejection を catch・分類・retry せず、変更なしで伝播させる
- [ ] T591 [P] [US2] fallback name、agent config path、model-instruction path、compact-prompt path、skill path、Hook field、MCP field が target read または activation を一切認可しないことを証明する relationship と safety の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T592 [P] [US2] 既存 precedence、trust、relative base、active instruction/MCP projection の拡張と、依然として延期される Hook projection に関する Codex configuration strategy/registry-graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T593 [P] [US2] 完全なリテラルの TOML value、strict/stale ID、diagnostics、exact metadata に関する、失敗する file-detail/absent-reveal-function contract を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T594 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex configuration detail、precedence、trust、fallback declaration、inert relationship、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-config-detail.spec.ts` に追加する

### 実装

- [ ] T595 [US2] 既存のinert TOML carrier extraction を、closed fallback/MCP extraction を維持したまま、残りの Codex project-configuration field と relative-base metadata で `src/server/inspection/parsers/toml.ts` において拡張する
- [ ] T596 [US2] 既存の `codex.config.precedence` strategy を general configuration value、trust、closest-value、relative-base、依然として不活性な Hook declaration で `src/shared/registries/runtime-composition.ts` において拡張する
- [ ] T597 [US2] closedなallowlist済みconfig field、fallback-name metadata、relationship、applicability、diagnostics、正確な evidence で Codex recognition を `src/server/inspection/recognizers/codex.ts` において拡張する
- [ ] T598 [US2] extended atomic TOML parse、正確な解決済みの値の抽出、relationship-only target、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を統合し、すでに導出済みの fallback file と既存 MCP recognition を rederivation や 2 度目の read なしに `src/server/inspection/scan.ts` で維持する
- [ ] T599 [US2] layer、trust、fallback declaration、condition、inert relationship に対する typed configuration detail を `src/app/components/inspection/RecognitionDetails.vue` と `src/app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T600 [US2] 英語の Codex configuration detail、trust、fallback、uncertainty message をそれらを描画する Vue component に追加する

---

## フェーズ 59: Claude Settings inventory

**目的**: parent または descendant candidate を継承せず、exact-launch の二つの Claude settings file を追加します。

**独立テスト**: root の `.claude/settings.json` と `.claude/settings.local.json` だけを inventory 化し、nested/parent-like near miss と standalone Hook/workflow file を拒否し、Codex configuration result を維持します。

**目に見えるチェックポイント**: exact-launch Claude settings file と、その project/local layer を識別できます。

### fixture とテストを先行

- [ ] T601 [US1] exact file の両方、parent/descendant near miss、link、malformed JSONC、secret、contained declaration、workflow、path-negative User/managed state に対する Claude settings fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T602 [US1] `claude.repo.settings` Repository candidate だけを、その behavior、evidence、exact-launch row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json` に具体化する
- [ ] T603 [P] [US1] 正確な root `.claude/settings.json` と `.claude/settings.local.json`、ancestor/descendant matching なし、standalone Claude Hook・prompt・workflow・agent-memory candidate なしに関する matcher の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T604 [P] [US1] tool、`settings/config` kind、project/local layer、正確な provenance、およびフェーズ 60 で execution environment の capacity だけに従う inert settings parsing が追加されるまではフェーズ 27 MCP adapter が dormant のままであり、Hook recognition も存在しないことに関する Claude settings recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T605 [US1] Claude settings row、正確な layer、exclusion、filter、diagnostics、維持される Codex configuration に関するブラウザー受け入れテストを `tests/e2e/claude-settings-inventory.spec.ts` に追加する

### 実装

- [ ] T606 [US1] settings および後続の composition strategy が参照する前に、Claude exact-launch settings lookup statement と、読み取り権限を付与しない `claude.behavior.user.settings` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T607 [US1] Repository candidate `claude.repo.settings` だけを追加し、未対応 standalone file は path-negative test で扱い、`claude.excluded.user-runtime` は consent-gated Global phase まで延期する処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T608 [US1] Claude settings evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T609 [US1] exact-launch Claude settings matching と path-derived recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T610 [US1] Repository boundary を拡大せず、Codex result も変更せずに Claude settings classification を `src/server/inspection/scan.ts` に統合する
- [ ] T611 [US1] Claude settings の inventory row と、英語の settings、layer、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 60: Claude Settings 詳細

**目的**: Claude settings の environment-owned capacity の inert JSONC detail を追加し、受け入れ済み file 上でフェーズ 27 の owner-gated MCP adapter を有効化し、Hook-family semantics は引き続き延期します。

**独立テスト**: malformed および secret-bearing な settings を開き、atomic JSONC parsing、正確な project/local precedence、selected-component declaration、owner-attached MCP metadata、surface condition、正確な解決済みの値の抽出、inert relationship、zero connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、完全で inert な layer-aware detail と owner-attached MCP が表示されます。

### テスト先行

- [ ] T612 [US2] Comment、known field、deterministic returned malformed recognition-atomic extraction、Inspector numeric capなしのenvironment-owned parser capacityに関するfailing inert JSONC testを`tests/unit/inspection/parsers.test.ts`へ追加する。NUL-containing byteはdiagnostic-only `binary`のまま、全non-NUL inputはreadable `utf-8`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial statusにせずJSONC parsing/display/comparisonまで伝播することを要求する。Decoder/parser/extractorの全throw/rejectionはdomain catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる
- [ ] T613 [P] [US2] 正確な launch-root scope、parent/descendant matching なし、project/local precedence、selected component、closed declaration origin、surface availability に関する Claude settings の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T614 [P] [US2] settings で選択された agent、plugin、Hook、MCP、command、path、workflow、reference が inert かつ non-following のままであることを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T615 [US2] reciprocal contract reference、フェーズ 27 MCP adapter activation、Hook semantics だけの延期を持つ Claude settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T616 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude settings detail、layer precedence、selected-component declaration、owner-attached MCP、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-settings-detail.spec.ts` に追加する

### 実装

- [ ] T617 [US2] 既存のinert JSONC mode を allowlist 対象 Claude settings field と closed declaration origin で `src/server/inspection/parsers/json.ts` において拡張する
- [ ] T618 [US2] Claude settings precedence、selection、surface、relationship strategy を追加し、既存 MCP adapter を現在所有済みの settings behavior に関連付け、Hook composition は `src/shared/registries/runtime-composition.ts` で延期したままにする
- [ ] T619 [US2] closedなallowlist済みsettings metadata、owner-gated contained MCP、applicability、relationship-only target、diagnostics、evidence で Claude recognition を `src/server/inspection/recognizers/claude.ts` において拡張する
- [ ] T620 [US2] Claude JSONC parsing、正確な解決済みの値の抽出、synthetic file も connection も作成しない owner-attached MCP、inert Hook declaration、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T621 [US2] typed settings detail と、英語の Claude precedence、selection、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 61: Copilot Settings inventory

**目的**: general `.vscode/settings.json` と configured root の明示的な除外を維持しながら、対応する Copilot settings file を追加します。

**独立テスト**: root の `.github/copilot/settings.json`、`.github/copilot/settings.local.json`、対応する Claude-compatible settings file を inventory 化します。general `.vscode/settings.json`、nested/configured path、User state、CLI LSP、無関係な file を拒否し、CLI extension exclusion の ownership はフェーズ 80 まで延期します。

**目に見えるチェックポイント**: 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate と surface provenance を識別できます。

### fixture とテストを先行

- [ ] T622 [US1] 対応する GitHub/Claude-compatible file、shared physical file、malformed JSONC、secret、plugin recommendation、contained Hook、configured-root attempt、`.vscode/settings.json`、`.github/lsp.json`、path-negative User state に対する Copilot settings fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T623 [US1] `copilot.repo.settings`、読み取り権限を付与しない `copilot.behavior.vscode.settings` と `copilot.behavior.cli.lsp`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp` を、その正確な affected-behavior reference、evidence、surface row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json` に具体化する
- [ ] T624 [P] [US1] 正確な対応 Copilot settings selector、`copilot.excluded.vscode-settings` → `copilot.behavior.vscode.settings`、`copilot.excluded.cli-lsp` → `copilot.behavior.cli.lsp`、path-negative nested/User/hosted location、フェーズ 80 より前の CLI-extension policy なしに関する matcher と registry の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T625 [P] [US1] Copilot `settings/config` kind、surface provenance、shared Claude-compatible file、premature Hook/Plugin/MCP recognition がないことに関する recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T626 [US1] Copilot settings row、filter、shared-file badge、exclusion、diagnostics、維持される Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-settings-inventory.spec.ts` に追加する

### 実装

- [ ] T627 [US1] settings strategy と正確な exclusion reference が read authority なしで解決されるよう、surface-qualified Copilot settings lookup と、読み取り権限を付与しない `copilot.behavior.vscode.settings`、`copilot.behavior.cli.lsp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.lsp` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T628 [US1] `copilot.repo.settings` を追加し、正確に `copilot.excluded.vscode-settings` と `copilot.excluded.cli-lsp` を own する。settings configured root は path-negative のままにし、フェーズ 19 で所有済みの instruction/skill `copilot.excluded.extra-directories` rule を再利用し、CLI extension はフェーズ 80、`copilot.excluded.user-runtime` はフェーズ 98 まで延期する処理を `src/shared/registries/inspection-rules.ts` に実装する
- [ ] T629 [US1] Copilot settings evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T630 [US1] Copilot settings matching と path-derived surface recognition を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T631 [US1] Copilot settings classification と一度だけ読み取る physical-file assembly を `src/server/inspection/scan.ts` に統合する
- [ ] T632 [US1] Copilot settings の inventory row と、英語の settings、surface、shared-file、exclusion message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 62: Copilot Settings 詳細

**目的**: surface-specific precedenceとclosedなallowlist済みinert declaration metadataを持つ、完全で非活性なCopilot settings detailを追加します。

**独立テスト**: malformed および literal credential を含む settings を開き、VS Code/CLI layer、enablement、recommendation、compatible Claude settings、configured-root read なし、environment-reference を解決しない 正確な解決済みの値、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot settings を選択すると、plugin の有効化や contained Hook の compose を行わず、完全で inert な surface-qualified detail が表示されます。

### テスト先行

- [ ] T633 [P] [US2] VS Code/CLI layer、enablement、フェーズ 20 で pending だった instruction applicability の再投影、plugin recommendation、closed contained-hook origin、compatible Claude settings、configured-root read なしに関する Copilot settings の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T634 [P] [US2] literal credential、未解決の environment-reference text、command、path、recommendation、duplicate 宣言、reference、relationship read authority がゼロであることに関する、失敗する exact-display/relationship test を `tests/unit/inspection/declared-values.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T635 [P] [US2] settings content が plugin の有効化、Hook の呼び出し、MCP への接続、URI の load、configured root の展開を行えないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T636 [US2] VS Code/CLI/Cloud distinction、フェーズ 20 instruction の再投影、deferred Plugin/Hook semantics、settings は MCP owner ではないという恒久ルールに関する Copilot settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T637 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot settings detail、surface precedence、更新された instruction applicability、recommendation、inert declaration、settings-owned MCP row がないこと、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-settings-detail.spec.ts` に追加する

### 実装

- [ ] T638 [US2] execution environment の capacity だけに従う inert JSONC extraction を allowlist 対象 Copilot settings field、recommendation identifier、closed declaration origin で拡張する処理を `src/server/inspection/parsers/json.ts` に実装する
- [ ] T639 [US2] surface-qualified Copilot settings precedence、enablement、recommendation、relationship strategy を追加し、以前 pending だった instruction applicability を再投影し、後続 Plugin/Hook family は `src/shared/registries/runtime-composition.ts` で inert のままにする
- [ ] T640 [US2] closedなallowlist済みsettings metadata、applicability、instruction re-projection fact、relationship-only target、恒久的な MCP non-ownership、diagnostics、正確な evidence で Copilot recognition を `src/server/inspection/recognizers/copilot.ts` において拡張する
- [ ] T641 [US2] Copilot settings parsing、正確な解決済みの値の抽出、instruction re-projection、inert declaration、permanent MCP non-ownership、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [ ] T642 [US2] typed settings detail と、英語の Copilot precedence、recommendation、surface、uncertainty message を `src/app/components/inspection/RecognitionDetails.vue` において拡張する

---

## フェーズ 63: 統合 Settings/Configuration inventory

**目的**: Codex configuration、Claude settings、Copilot settings を、一度だけ読み取る shared-file recognition と正確な MCP ownership matrix とともに統合します。

**独立テスト**: all-vendor settings fixtureを使用し、共有`.claude/settings*.json`に対する一つの物理row/read、別々のClaude/Copilot settings recognition、同じshared owner ID上のClaude-only owner-attached MCP、恒久的なCopilot MCP non-ownership、維持されるCodex carrier MCP/fallback、決定論的なprovenance、filter、exclusion、fileに閉じたfailureのpartial continuity、rescan cleanupを検証する。

**目に見えるチェックポイント**: 完全な settings/configuration inventory をフィルタリングでき、Claude settings-owned MCP、Copilot non-ownership、既存 Codex carrier を区別できます。

### テスト先行

- [ ] T643 [US1] Codex project layer、owner-attached MCP を持つ Claude exact-launch settings、MCP non-ownership を持つ Copilot variant、shared file、malformed structure、secret、inert declaration、除外された configured root に対する all-vendor settings/config fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T644 [US1] settings/config behavior、三つの candidate matcher、既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp`、path-negative case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T645 [US1] 既存 MCP/fallback を持つ Codex layer、MCP ownership を持つ正確な Claude settings、MCP non-ownership を持つ対応 Copilot settings、shared file、明示的な exclusion に対する完全な matcher と recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T646 [P] [US1] 一度だけ読み取るshared settings、決定論的なsettings/MCP recognitionとprovenance order、分離されたfileに閉じたfailure、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected fileに閉じないfailure、synthetic MCP file/connectionゼロ、configured-target accessなしに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T647 [P] [US1] settings/configuration row 全体の source/tool/kind/path filter、shared recognition badge、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T648 [US1] 統合 settings/config inventory、filter、shared-file recognition、正確な MCP ownership/non-ownership badge、維持される Codex carrier fact、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/settings-config-inventory.spec.ts` に追加する

### 実装

- [ ] T649 [US1] 三つの tool すべてに対し、read authority を持たない settings/config lookup statement を `src/shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T650 [US1] configured-path promotion や新しい exclusion ID を導入せず、三つの settings/config candidate record と既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp` reference を `src/shared/registries/inspection-rules.ts` で完成させる
- [ ] T651 [US1] settings/config evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation で完成させる
- [ ] T652 [US1] settings/configuration に対する一度だけ読み取る shared-file assembly、決定論的な settings/MCP recognition order、正確な ownership/non-ownership、維持される Codex carrier fact、atomic continuity を `src/server/inspection/scan.ts` で完成させる
- [ ] T653 [US1] 統合 settings/config inventory の filter、row、shared badge、意味的に同等な layer/exclusion message を `src/app/components/inventory/InventoryFilters.vue`、そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 64: Settings/Configuration 比較

**目的**: comparison を literal および typed な settings/configuration difference へ拡張します。

**独立テスト**: current-generation で読み取り可能な settings/config file を 2 つ比較し、完全なリテラルの source と、整列した value、layer、precedence、trust、enablement、MCP ownership、provenance、condition、fallback declaration、recommendation、stale cleanup を検証します。

**目に見えるチェックポイント**: value を適用したり declaration を昇格させたりせず、settings/configuration を比較できます。

### テスト先行

- [ ] T654 [US3] `(tool, kind, fieldId)` の解決済みの値、layer provenance、precedence、trust、fallback declaration、recommendation、condition、owner-attached MCP を比較しつつ Copilot non-ownership を保持する、失敗する settings/config comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T655 [US3] credential/environment-reference の差を含む完全なリテラルの settings/config diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed layer/MCP state、accessibility、fallback、Copilot non-ownership、cleanup に関する browser acceptance を `tests/e2e/settings-config-comparison.spec.ts` に追加する

### 実装

- [ ] T656 [US3] settings/config comparison row が `(tool, kind, fieldId)` で照合して解決済みの `value` を render するよう拡張し、internal typed state と owner-attached MCP を分離し、value を適用せず Copilot ownership を発明しない処理を `src/app/components/comparison/RecognitionComparison.vue` に実装する
- [ ] T657 [US3] 英語の settings/configuration comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 65: Claude Output Styles のインベントリ

**目的**: 対応する Claude output-style ファイルをインベントリに追加する。

**独立テスト**: 文書化された layer の direct output-style child をインベントリに含め、nested near miss を除外する。

**目に見えるチェックポイント**: ユーザーは layer provenance を備えた対応 Claude output style をフィルタリングできる。

### fixture とテストを先に

- [ ] T658 [US1] direct child、nested near miss、duplicate name、不正な metadata、secret、selection variant を対象とする Claude output-style fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T659 [US1] output-style row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T660 [US1] direct-child output style、nested exclusion、文書化された layer boundary に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T661 [US1] Claude output-style inventory と exclusion に関するブラウザー受け入れテストを `tests/e2e/output-styles-inventory.spec.ts` に追加する

### 実装

- [ ] T662 [US1] output-style selection が参照する前に、Claude output-style lookup statement と読み取り権限を付与しない `claude.behavior.user.output-style` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T663 [US1] exclusion ID を定義せず、nested/User/configured location を path-negative のままにして、`claude.repo.output-style` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T664 [US1] output-style evidence record と affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T665 [US1] Claude output-style matching と recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T666 [US1] output-style inventory row と、意味的に同等な layer/exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 66: Claude Output Styles の詳細

**目的**: 完全なリテラルの output-style source、layer、selection、surface availability、applicability detail を追加する。

**独立テスト**: malformed な style を開き、正確な解決済みの値の保持、closest-layer と selection condition、surface uncertainty、inert reference、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: output style を選択すると、style を適用せず、完全で inert な detail が開く。

### テストを先に

- [ ] T667 [P] [US2] closest-layer behavior、明示的な selection、surface availability、不確実性、evidence に関する失敗する metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T668 [P] [US2] output-style Markdown と reference が非活性かつ非 navigable のままであることを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T669 [US2] reciprocal contract reference を備えた、失敗する output-style runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T670 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの output-style detail、selection condition に関する browser acceptance を `tests/e2e/output-styles-detail.spec.ts` に追加する

### 実装

- [ ] T671 [US2] output-style layer、selection、applicability strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T672 [US2] output-style metadata、applicability、正確な解決済みの値の保持 のために Markdown extraction と scan integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
- [ ] T673 [US2] 型付き output-style 詳細フィールドを `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T674 [US2] 英語の output-style 詳細、selection、surface、不確実性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 67: Claude Output Styles の比較

**目的**: literal および型付きの output-style 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation output-style fileを正確に2つ比較し、完全なliteral sourceと、整列したlayer、selection、surface availability、provenance、metadataを検証する。

**目に見えるチェックポイント**: どちらの style も適用せずに Claude output style を比較できる。

### テストを先に

- [ ] T675 [US3] `(tool, kind, fieldId)` の解決済みの値、layer、selection、surface availability、provenance、typed metadata に関する失敗する output-style comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T676 [US3] credential/environment-reference の差を含む完全なリテラルの output-style diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed difference に関する browser acceptance を `tests/e2e/output-styles-comparison.spec.ts` に追加する

### 実装

- [ ] T677 [US3] output-style comparison row が `(tool, kind, fieldId)` で照合して解決済みの `value` を render するよう拡張し、typed selection/applicability state は `src/app/components/comparison/RecognitionComparison.vue` で分離したままにする
- [ ] T678 [US3] 英語の output-style comparison メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 68: Codex Marketplaces のインベントリ

**目的**: 二つの正確な Repository-root location に authored Codex marketplace catalog を追加する。

**独立テスト**: `.agents/plugins/marketplace.json` と legacy-compatible な `.claude-plugin/marketplace.json` をインベントリに含め、descendant、installed/cache path、remote state、link、near miss を拒否し、plugin manifest はまだ導出しない。

**目に見えるチェックポイント**: registration、installation、enablement を示唆せずに authored Codex marketplace catalog をフィルタリングできる。

### fixture とテストを先に

- [ ] T679 [US1] 両方の正確な root、local/remote source、不正な catalog、secret、missing plugin、descendant、link、installed/cache path、near miss を対象とする Codex marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T680 [US1] marketplace exclusion ID を定義せず、Codex marketplace behavior、candidate、path-negative runtime-state case、activation condition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T681 [P] [US1] 両方の正確な Codex marketplace selector、descendant rejection、authored-state provenance、installed/cache/User exclusion に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T682 [US1] Codex marketplace row、filter、authored-state label、exclusion、診断、まだ derived plugin row がないことに関するブラウザー受け入れテストを `tests/e2e/codex-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T683 [US1] Codex marketplace lookup statement と読み取り権限を付与しない `codex.behavior.user.plugins` を、plugin activation と `codex.excluded.plugin-files` が参照する前に `src/shared/registries/vendor-behaviors.ts` へ追加する
- [ ] T684 [US1] marketplace exclusion ID を定義せず、installed、cache、User、remote location を path-negative のままにして、`codex.repo.marketplace` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T685 [US1] Codex marketplace evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T686 [US1] catalog parsing を行わず、exact-root Codex marketplace matching と path-derived recognition を `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T687 [US1] plugin manifest を導出または読み取らず、Codex marketplace classification を `src/server/inspection/scan.ts` に統合する
- [ ] T688 [US1] inventory row と、英語の Codex marketplace authored-state および exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 69: Codex Marketplaces の詳細

**目的**: 完全なリテラルの Codex catalog detail を追加し、次のフェーズ向けに local plugin-source declaration を安全に抽出する。

**独立テスト**: Malformed/secret-bearing/throwing/rejecting catalog を開き、atomic JSON parsing、local source form、remote/absolute/home/traversal rejection、independently admitted static seed ごとの complete deterministic validated target、relationship-only component、正確な解決済みの値の保持、diagnosticsを検証する。malformedなcatalogはcomplete traversal後にそのfileのdiagnosticとpartial generationだけを生成できる。Fileに閉じないfailureはwhole attemptをabortし、item、recognition、derived result、generation、record、responseを一切公開せず、prior committed snapshotだけを維持し、plugin-target readを0件とする。

**目に見えるチェックポイント**: Codex marketplace を選択すると、plugin manifest を開かずに、完全で inert な authored entry と local-source relationship が表示される。

### テストを先に

- [ ] T689 [P] [US2] 正確な `marketplace.plugin.source` occurrence の plain-string form と object `source.path` form、leading-`./` semantics、解決済みの値と internal semantic path、remote source relationship、registration/installation uncertainty、malformed-document failure、evidence に関する失敗する Codex marketplace test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T690 [P] [US2] Leading-`./` catalog-relative containment、declarationごと1 target、static seedごとのstable order、one-edge preparation、forbidden authority rejectionとauthored Relationship retentionのfailing testを追加する。Validation/derivation throw/rejectionはdomainでcatch/cause分類/retry/source plan/item/recognition/derived body/generation化せず変更なしにouter boundaryへ伝播しprior commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T691 [P] [US2] catalog inspection が plugin read、install、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T692 [US2] reciprocal contract reference を備えた、失敗する Codex marketplace activation/relationship graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T693 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex marketplace detail、local/remote source relationship、authored state、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T694 [US2] closed Codex catalog field ID、正確な解決済みの値と、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T695 [US2] Codex marketplace の authored、registration、installation、activation、local-source、relationship strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T696 [US2] closed allowlist 内の allowlist row の順の catalog metadata、validated semantic local-source declaration、正確な authored relationship、applicability、diagnostics、evidence を備えるよう Codex recognition を `src/server/inspection/recognizers/codex.ts` で拡張する
- [ ] T697 [US2] Atomic catalog parsing、complete authored source、static seedごとの全distinct validated local target、relationship-only rejected/remote componentを`src/server/inspection/scan.ts`へ統合し、derived readはまだ行わない。Parse/validation throw/rejectionはdomainでcatch/classify/retry/source plan/item/recognition/result/generation化せず変更なしにouter boundaryへ伝播する
- [ ] T698 [US2] 型付き詳細と、英語の Codex marketplace source、authored-state、activation-uncertainty メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 70: Claude Marketplaces のインベントリ

**目的**: marketplace root として意図的に扱う場所に、authored Claude `.claude-plugin/marketplace.json` catalog を追加する。

**独立テスト**: 正確な root catalog だけをインベントリに含め、任意の descendant、User/cache/registered-state path、link、near miss を拒否し、共有物理ファイル上の Codex recognition を保持する。

**目に見えるチェックポイント**: presence を registration と誤認せずに authored Claude marketplace catalog を識別できる。

### fixture とテストを先に

- [ ] T699 [US1] exact root、共有 Codex file、local/remote source、不正な catalog、secret、descendant、link、User/cache state、near miss を対象とする Claude marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T700 [US1] marketplace exclusion ID を定義せず、Claude marketplace behavior、candidate、path-negative runtime-state case、activation condition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T701 [P] [US1] 正確な Claude marketplace root、descendant rejection、explicit-registration uncertainty、User/cache candidate がないことに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T702 [US1] Claude marketplace row、filter、registration uncertainty、exclusion、診断、保持された Codex recognition に関するブラウザー受け入れテストを `tests/e2e/claude-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T703 [US1] marketplace/plugin activation が参照する前に、フェーズ 25 で所有済みの `claude.behavior.user.plugins` を再利用しながら、Claude marketplace lookup statement を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T704 [US1] marketplace exclusion ID を定義せず、User、cache、registration-state location を path-negative のままにして、`claude.repo.marketplace` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T705 [US1] Claude marketplace evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [ ] T706 [US1] catalog parsing を行わず、exact-root Claude marketplace matching と path-derived recognition を `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T707 [US1] Claude marketplace classification を統合し、共有物理ファイル identity を `src/server/inspection/scan.ts` で保持する
- [ ] T708 [US1] inventory row と、英語の Claude marketplace registration および exclusion メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 71: Claude Marketplaces の詳細

**目的**: 完全なリテラルの Claude catalog detail を追加し、candidate はまだ導出せずに local plugin-source declaration を検証し、accepted marketplace file に対してフェーズ 27 MCP owner adapter を有効化する。

**独立テスト**: Malformed/secret-bearing/throwing/rejecting catalog を開き、optional/local source form、catalog-relative containment、remote relationship retention、independently admitted static seed ごとの complete deterministic validated target、owner-attached MCP declaration、registration/activation uncertainty、正確な解決済みの値の保持、diagnosticsを検証する。malformedなcatalogはcomplete traversal後にそのfileのdiagnosticとpartial generationだけを生成できる。Fileに閉じないfailureはwhole attemptをabortし、item、recognition、derived result、generation、record、responseを一切公開せず、prior committed snapshotだけを維持し、connectionとplugin-target readを0件とする。

**目に見えるチェックポイント**: Claude marketplace を選択すると、registration、activation、connection を主張せず、完全で inert な authored metadata、source relationship、owner-attached MCP が表示される。

### テストを先に

- [ ] T709 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、leading-`./` 解決済みの値と internal semantic path、optional manifest、remote relationship、フェーズ 27 MCP adapter activation、registration uncertainty、malformed-document failure、evidence に関する失敗する Claude marketplace test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T710 [P] [US2] Claude catalogのleading-`./` containment、declarationごと1 target、static seedごとのstable order、forbidden derived authority rejectionとauthored Relationship retentionを検証する。Validation/derivation throw/rejectionはdomainでcatch/classify/retry/source plan/item/recognition/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T711 [P] [US2] Claude catalog inspection が registration、plugin read、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T712 [US2] reciprocal contract reference を備えた Claude marketplace activation/relationship graph coverage とフェーズ 27 MCP owner-adapter binding の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T713 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude marketplace detail、source relationship、owner-attached MCP、authored state、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T714 [US2] closed Claude catalog field ID、正確な解決済みの値と、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T715 [US2] Claude marketplace の registration、activation、optional-manifest、local-source、relationship strategy を追加し、既存 MCP adapter を受け入れ済み marketplace behavior に `src/shared/registries/runtime-composition.ts` で関連付ける
- [ ] T716 [US2] closed allowlist 内の allowlist row の順の catalog metadata、validated semantic local-source declaration、正確な authored relationship、owner-gated MCP、applicability、diagnostics、evidence を備えるよう Claude recognition を `src/server/inspection/recognizers/claude.ts` で拡張する
- [ ] T717 [US2] Claude catalog parsing、complete authored source、static seedごとのdistinct validated target、owner-attached MCP、relationship-only rejected/remote component、zero synthetic file/connection/derived readを`src/server/inspection/scan.ts`へ統合する。Throw/rejectionはdomainでcatch/classify/retry/result化せず変更なしにouter boundaryへ伝播する
- [ ] T718 [US2] 型付き詳細と、英語の Claude marketplace source、registration、activation-uncertainty メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 72: Copilot Marketplaces インベントリ

**目的**: 文書化された認識順序に従い、正確な四つのルート形式にある作成済み Copilot marketplace カタログを追加する。ローカル marketplace の来歴は VS Code と CLI だけに与え、Cloud は hosted/runtime-unavailable 条件のままとする。

**独立テスト**: `marketplace.json`、`.plugin/marketplace.json`、`.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json` をインベントリに含める。ローカルバッジと検索は VS Code/CLI だけに公開し、Cloud は hosted/runtime-unavailable としてだけ表現し、子孫と runtime-state パスを拒否し、Codex/Claude の共有認識を維持する。

**目に見えるチェックポイント**: ユーザーは、正確なルート形式と surface の来歴を備えた Copilot marketplace カタログをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T719 [US1] 四つすべてのルート形式、順序、共有ファイル、ローカル/リモートソース、不正なカタログ、シークレット、子孫、installed/hosted 状態、リンク、ニアミスを対象とする Copilot marketplace フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T720 [US1] VS Code/CLI のローカル振る舞いを備えた四つの Copilot marketplace 候補、origin fileを持たない正確な `copilot.behavior.cloud.plugins` hosted/runtime-unavailable の事実、パス不一致となる runtime-state ケース、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T721 [P] [US1] 正確な四つすべての Copilot marketplace 形式、認識順序、descendant/runtime-state の拒否、共有 `.claude-plugin` の来歴、VS Code/CLI のローカル来歴、Cloud のローカル認識がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T722 [US1] Copilot marketplace 行、形式順序、VS Code/CLI のローカルバッジ、Cloud の hosted/runtime-unavailable ラベル、診断、保持される Codex/Claude 認識を対象とするブラウザ受け入れテストを `tests/e2e/copilot-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T723 [US1] local/Cloud のアクティベーションと managed/remote 除外から参照される前に、VS Code/CLI で修飾された Copilot ローカル marketplace 検索記述と、読み取り権限を付与しない `copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.plugins`、origin fileを持たない `copilot.behavior.cloud.plugins` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T724 [US1] 単一の `copilot.repo.marketplace` 候補に対する四つのセレクターだけを追加する。marketplace 除外 ID を作り出さず、hosted、installed、User、cache の場所はパス不一致のまま `src/shared/registries/inspection-rules.ts` で維持する
- [ ] T725 [US1] `copilot.behavior.cloud.plugins` に対する既存ソースのバックリンクを含む、Copilot marketplace のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T726 [US1] カタログを解析せず、ルートと完全一致する Copilot marketplace のマッチングと順序付き認識を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T727 [US1] Copilot marketplace の分類と共有物理ファイルの同一性を `src/server/inspection/scan.ts` に統合する
- [ ] T728 [US1] インベントリ行と、英語の Copilot marketplace 形式、surface、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 73: Copilot Marketplaces の詳細

**目的**: 完全なリテラルの Copilot catalog detail を追加し、次の plugin フェーズに向けて validated direct one-edge local plugin source を検証する。

**独立テスト**: malformed/literal-credential-bearing catalogを開き、`plugins/foo`と`./plugins/foo`、将来のfour-target derivation order、execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、remote relationship retention、VS Code/CLI local-source plan、local planを持たないCloud hosted/runtime-unavailable state、正確な解決済みの値、diagnostics、target readがゼロであることを検証する。

**目に見えるチェックポイント**: Copilot marketplace を選択すると、plugin manifest を読み取らずに、完全で inert な authored entry と direct one-edge local-source plan が表示される。

### テストを先に

- [ ] T729 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、`plugins/foo`/`./plugins/foo` 解決済みの値と internal semantic path、recommendation、VS Code/CLI provenance、Cloud unavailable state、activation uncertainty、malformed-document failure、evidence に関する失敗する Copilot marketplace test を `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T730 [P] [US2] `plugins/foo`と`./plugins/foo`、containment、documented four-target order、one edge、static seedごとの全distinct targetをstable extractor/occurrence orderで扱うこと、forbidden derived authorityを除外しつつauthored Relationshipを保持することのfailing source-validation testを追加する。注入したすべてのfileに閉じないfailureがdomainでcatch、cause classification、retry、item/recognition/source plan/derived result/body/generation化されず変更なしに伝播し、prior commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T731 [P] [US2] Copilot カタログの検査が install、plugin read、component load、hook execution、MCP connection、asset load、remote fetch、hosted-state query を一切行わないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T732 [US2] ローカルソースプランが VS Code/CLI だけに存在し、Cloud は hosted/runtime-unavailable のままであることを証明する、相互の契約参照を備えた失敗する Copilot marketplace activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T733 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot marketplace detail、VS Code/CLI source plan、Cloud unavailable condition、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T734 [US2] closed Copilot catalog field ID、正確な解決済みの値と、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T735 [US2] Copilot VS Code/CLI marketplace の登録、推奨、インストール、有効化、ローカルソース、関係の戦略に加え、ローカル来歴または検索を決して生成しない Cloud hosted/runtime-unavailable 戦略を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T736 [US2] closed allowlist 内の allowlist row の順の catalog metadata、VS Code/CLI-only semantic local-source plan、正確な authored relationship、Cloud runtime-unavailable condition、applicability、diagnostics、evidence によって Copilot recognition を `src/server/inspection/recognizers/copilot.ts` で拡張する
- [ ] T737 [US2] Copilot catalog parsing、complete authored source、documented four-target order、static seedごとのdistinct validated target、relationship-only rejected/remote componentを`src/server/inspection/scan.ts`へ統合する。Throw/rejectionはdomainでcatch/classify/retry/result化せず変更なしにouter boundaryへ伝播し、derived readを行わない
- [ ] T738 [US2] 型付き詳細と、英語の Copilot marketplace ソース、VS Code/CLI のローカル来歴、Cloud の利用不可状態、アクティベーションの不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 74: 統合 Marketplaces インベントリ

**目的**: marketplace catalog を統合し、共有の `.claude-plugin/marketplace.json` を Codex/Claude/Copilot recognition に対して一度だけ読み取り、同じ physical file 上の Claude owner-attached MCP を維持する。

**独立テスト**: 共有 catalog に対する一つの physical item/read、三つの marketplace recognition、Claude owner-attached MCP、決定論的な provenance/root-form order、synthetic MCP file または connection がないこと、local-source plan、filter、exclusion、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、diagnostics、rescan cleanup を検証する。

**目に見えるチェックポイント**: 一つの共有 authored catalog 上のすべての marketplace interpretation と Claude owner-attached MCP を理解できる。

### テストを先に

- [ ] T739 [US1] すべての root form、local/remote source、Claude owner-attached MCP を持つ共有 triple-recognition file、不正な/secret-bearing catalog、exclusion、注入した execution-environment throw/rejection を対象に marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T740 [US1] marketplace 除外 ID を定義せず、marketplace の振る舞い、マッチャー、導出プラン、composition、関係、パス不一致となる runtime-state ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T741 [P] [US1] すべての marketplace root、triple marketplace recognition、同じ ID 上の Claude owner-attached MCP、決定論的な form order、authored-state separation、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T742 [P] [US1] Shared catalogの1 Source scan attempt one-read、deterministic marketplace/MCP recognition/provenance、complete per-seed targets、zero synthetic MCP/connection、pre-derivation target read 0件を検証する。Assembly/derivationのfileに閉じないfailureはdomainでcatch/classify/retry/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持するtestを`tests/integration/repository-scan.test.ts`へ追加する
- [ ] T743 [US1] 統合 marketplace inventory、filter、triple recognition、Claude owner-attached MCP、root-form order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T744 [US1] Marketplace physical-fileのscan-attempt-local one-read assembly、deterministic multi-tool/owner-attached MCP provenance、exact authored occurrence、complete source-plan retentionを実装する。Assembly/derivation throw/rejectionはdomainでcatch/classify/retry/source plan/provenance/recognition/item/body/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する。Synthetic fileなし/exclusionを`src/server/inspection/scan.ts`で保証する
- [ ] T745 [US1] marketplace インベントリのフィルター、共有認識の要約、作成済み状態のラベルを `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
- [ ] T746 [US1] 英語の統合 marketplace、三重認識、作成済み状態、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 75: Marketplaces 比較

**目的**: リテラルおよび型付き marketplace カタログ差分で比較を拡張する。

**独立テスト**: Readableなcurrent-generation catalog fileを正確に2つ比較し、pluginをderive/activateせず、完全なliteral sourceと、整列したentry、source type、local-source plan、owner-attached MCP、provenance、registration、installation、enablement、condition、uncertaintyを検証する。

**目に見えるチェックポイント**: ユーザーは何も取得、インストール、アクティベートせずに marketplace カタログを比較できる。

### テストを先に

- [ ] T747 [US3] `(tool, kind, fieldId)` の authored metadata、provenance、source type、registration、installation、enablement、実際の catalog owner ID を介する owner-attached MCP difference、uncertainty に関する失敗する marketplace comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T748 [US3] 完全なリテラルの marketplace diff、正確な authored source-value/credential/environment-reference difference、typed source/activation と owner-attached MCP row、masking/reveal も environment substitution もないこと、accessibility、fallback、cleanup に関する browser acceptance を `tests/e2e/marketplaces-comparison.spec.ts` に追加する

### 実装

- [ ] T749 [US3] marketplace entry の `(tool, kind, fieldId)` の解決済みの値による comparison row、別個の typed state としての semantic source plan、provenance、既存の physical owner ID を介する owner-attached MCP、uncertainty を `src/app/components/comparison/RecognitionComparison.vue` で拡張する
- [ ] T750 [US3] 英語の marketplace 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 76: Codex Plugin Manifests インベントリ

**目的**: ルートと完全一致する、および安全に導出される Codex `.codex-plugin/plugin.json` manifest 候補を追加する。

**独立テスト**: 作成済みの root manifest と一つの `.codex-plugin/plugin.json` を inventory に含め、後者が検証済みの各 `./` local Codex marketplace source 配下にあることを確認する。One-edge containment、execution-environment capacity だけに従う complete deterministic retention、対象欠落時は候補なし、orphan/remote/escaping/linked 候補がないこと、再帰的な derivation がないこと、物理 file ごとに一度の read を確認する。注入した全fileに閉じないfailureはdomain classification/retryなしに変更なく伝播し、item/recognition/derived result/body/generationを一切作らずattemptをabortし、prior commitだけを保持する。

**目に見えるチェックポイント**: ユーザーは、静的または marketplace 由来の来歴を備えた作成済み Codex plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T751 [US1] 正確なルート、有効な `./` ローカルカタログソース、正確な `.codex-plugin/plugin.json` 対象、欠落した対象、多数のソース、remote/absolute/home/traversal ソース、リンク、コンポーネント宣言、ニアミス、注入した execution-environment throw/rejection を対象とする Codex plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T752 [US1] Codex plugin-manifest の振る舞い、静的/有界導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T753 [P] [US1] 正確な `codex.repo.plugin-manifest`、`codex.derived.local-plugin-manifest`、一エッジ、`./` ソースの受け入れ、正確な `.codex-plugin/plugin.json` 対象、導出済みシードがないこと、コンポーネントファイル候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T754 [US1] Complete deterministic static/derived Codex manifest、missing target、containment、link、scan-attempt-local one-read、component read 0件のfailing scan testを追加する。Fileに閉じないfailureはdomainでcatch/classify/retry/manifest item/recognition/provenance/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T755 [US1] Codex plugin-manifest 行、静的/導出来歴、欠落 manifest、除外、診断、変更されない marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/codex-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T756 [US1] アクティベーション権限を持たない Codex plugin-manifest の振る舞いと検索記述を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T757 [US1] コンポーネントパス除外の所有をフェーズ 77 に残し、Codex の静的および有界導出 plugin-manifest レコードだけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T758 [US1] Codex plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T759 [US1] 検証済みの `./` ローカル marketplace ソースから正確な `.codex-plugin/plugin.json` 対象への、ルートと完全一致するマッチングおよびdirect one-edge Codex manifest derivationだけを `src/server/inspection/rules/codex.ts` に実装する
- [ ] T760 [US1] 静的/シード来歴を備え、コンポーネントを昇格しない Codex plugin-manifest 認識を `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T761 [US1] Deterministic one-edge Codex manifest admission、1 Source scan attemptのverified group read、exactなraw-path aggregationを`src/server/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T762 [US1] インベントリ行と、英語の Codex plugin の静的/導出および除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 77: Codex Plugin Manifests の詳細

**目的**: authored state と relationship-only の component declaration を備えた、完全なリテラルの Codex manifest detail を追加し、一つだけの正確な non-read exclusion `codex.excluded.plugin-files` を所有する。

**独立テスト**: malformed および literal credential を含む manifest を開き、必須の entry metadata、marketplace provenance、installation/enablement/trust の分離、Hook/MCP/app/skill/script/asset component relationship、正確な `codex.excluded.plugin-files` の処理、MCP candidate を追加せずにフェーズ 23 の plugin path-negative context を更新すること、正確な解決済みの値、diagnostics、component read/activation がゼロであることを検証する。

**目に見えるチェックポイント**: Codex plugin manifest を選択すると、どの component も load せず、完全で inert な authored metadata が表示される。

### テストを先に

- [ ] T763 [US2] 一つだけの正確な `codex.excluded.plugin-files` レコードを、最終的に影響を受ける振る舞い `codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` とともに具体化し、失敗するレジストリカバレッジを追加する。plugin コンポーネントパスが決して候補にならず、以前の MCP パス不一致ケースが影響を受ける振る舞いの集合を変えずにこの除外を参照できることを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T764 [P] [US2] 作成済みメタデータ、ローカル marketplace エントリ、インストール/有効化/信頼の分離、静的/導出来歴、relationship-only のコンポーネントに対する失敗する Codex plugin テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T765 [P] [US2] plugin コンポーネントの import、skill read、app load、hook execution、MCP connection、script/asset read、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T766 [US2] 相互の契約参照を備えた、失敗する Codex plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T767 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex plugin detail、authored state、relationship、provenance、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/codex-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T768 [US2] 一つだけの非読み取り `codex.excluded.plugin-files` レコードを、`codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` への最終的な影響参照とともに追加する。フェーズ 23 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、install、cache、runtime-state の除外 ID は `src/shared/registries/inspection-rules.ts` に一切追加しない
- [ ] T769 [US2] closed Codex plugin-manifest field ID、正確な component-source の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T770 [US2] Codex plugin の authored、installed、enabled、trusted、local、activation、relationship の各戦略を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T771 [US2] closed allowlist 内の Codex plugin-manifest metadataと relationship-only のコンポーネントを `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T772 [US2] アトミックな manifest 解析、正確な解決済みの値の抽出、relationship-only の component、正確な `codex.excluded.plugin-files` diagnostics、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/server/inspection/scan.ts` に統合する
- [ ] T773 [US2] 型付き詳細と、英語の Codex plugin の作成済み状態、関係、アクティベーションの不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 78: Claude Plugin Manifests インベントリ

**目的**: optional-manifest の振る舞いを維持しながら、ルートと完全一致する `claude.repo.plugin-manifest` と marketplace 由来の `claude.derived.local-plugin-manifest` 候補だけを追加する。

**独立テスト**: 作成済みrootと検証済みlocal marketplace targetをinventoryに含め、optional absence、trust condition、execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、recursive derivationなし、component readなしを検証する。

**目に見えるチェックポイント**: ユーザーは、明示的なルートまたは marketplace 由来の来歴を備えた Claude plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T774 [US1] 正確なルート、有効なローカルカタログソース、任意で存在しない場合、多数のソース、祖先のニアミス、リンク、コンポーネント、禁止されたソース、注入した execution-environment throw/rejection を対象とする Claude plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T775 [US1] フェーズ 25 が所有する Claude plugin の振る舞いを再利用し、振る舞い ID を重複させずに、正確な静的/導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T776 [P] [US1] 正確な `claude.repo.plugin-manifest`、`claude.derived.local-plugin-manifest`、任意で存在しない場合、一エッジ、祖先スキャンがないこと、コンポーネント候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T777 [US1] Complete deterministic static/derived Claude manifest、containment、link、scan-attempt-local one-read、component read 0件のfailing scan testを追加する。注入したすべてのfileに閉じないfailureがdomainでcatch/classify/retry/manifest item/recognition/provenance/derived result/body/generation化されず変更なしにouter boundaryへ伝播し、prior commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T778 [US1] Claude plugin-manifest 行、来歴の種類、任意で存在しない場合、信頼の不確実性、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/claude-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T779 [US1] フェーズ 25 が所有する `claude.behavior.repo.plugin` と `claude.behavior.user.plugins` を再利用し、ルートおよびローカル marketplace の plugin 検索について重複する振る舞い ID を `src/shared/registries/vendor-behaviors.ts` に追加しない
- [ ] T780 [US1] コンポーネントパス除外の所有をフェーズ 79 に残し、`claude.repo.plugin-manifest` と `claude.derived.local-plugin-manifest` だけを `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T781 [US1] Claude plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T782 [US1] ルートと完全一致し、direct one-edge local-marketplace Claude manifest derivationを `src/server/inspection/rules/claude.ts` に実装する
- [ ] T783 [US1] 来歴、optional-manifest、信頼を備え、コンポーネントを昇格しない Claude plugin-manifest 認識を `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T784 [US1] Deterministic Claude manifest admission、1 Source scan attemptのverified group read、optional absenceを`src/server/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T785 [US1] インベントリ行と、英語の Claude plugin の来歴、信頼、optional-manifest、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 79: Claude Plugin Manifests の詳細

**目的**: optional authored metadata と relationship-only component を備えた、完全なリテラルの Claude manifest detail を追加し、フェーズ 27 の MCP owner adapter を有効化して、一つだけの正確な non-read exclusion `claude.excluded.plugin-files` を所有する。

**独立テスト**: malformed および literal credential を含む root/marketplace-derived manifest を開き、optional field、default と explicit component location、registration/activation uncertainty、owner-attached MCP と relationship-only MCP component path、Hook/skill/command/agent/style/script/asset relationship、MCP candidate も affected behavior も追加せずにフェーズ 25/27 の path-negative diagnostic を更新する正確な `claude.excluded.plugin-files` 処理、正確な解決済みの値、diagnostics、connection がゼロであること、component read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude plugin manifest を選択すると、activation せず、完全で inert な authored metadata と component relationship が表示される。

### テストを先に

- [ ] T786 [US2] 一つだけの正確な `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに具体化し、失敗するレジストリカバレッジを追加する。このレコードが MCP 候補または影響を受ける振る舞いを追加せずにフェーズ 25/27 の MCP plugin-path 診断を更新し、plugin コンポーネントパスが決して候補にならないことを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T787 [P] [US2] 作成済みメタデータ、任意の manifest、フェーズ 27 の MCP adapter 有効化、登録/アクティベーションの不確実性、既定/明示コンポーネントに対する失敗する Claude plugin テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T788 [P] [US2] Claude コンポーネントの import、skill/command/agent/style read、hook execution、MCP connection、script/asset load、registration、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T789 [US2] 相互の契約参照を備えた、失敗する Claude plugin activation/relationship グラフカバレッジとフェーズ 27 の MCP owner-adapter binding を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T790 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude plugin detail、authored/optional state、owner-attached MCP と relationship-only の component path、connection がゼロであること、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/claude-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T791 [US2] 一つの非読み取り `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに追加する。フェーズ 25/27 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、User、cache、install、runtime-state の除外 ID は `src/shared/registries/inspection-rules.ts` に追加しない
- [ ] T792 [US2] closed Claude plugin-manifest field ID、正確な default/explicit component-source の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T793 [US2] Claude plugin の登録、アクティベーション、optional-manifest、component-resolution、relationship の各戦略を追加し、既存の MCP adapter を受け入れ済み plugin の振る舞いへ `src/shared/registries/runtime-composition.ts` で結び付ける
- [ ] T794 [US2] closed allowlist 内の Claude plugin-manifest metadata、owner-gated MCP、relationship-only のコンポーネントを `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T795 [US2] Claude manifest 解析、正確な解決済みの値の抽出、synthetic file も connection も作らない owner-attached MCP、relationship-only の component、MCP candidate を変えない更新済み plugin-path exclusion diagnostic、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/server/inspection/scan.ts` に統合する
- [ ] T796 [US2] 型付き詳細と、英語の Claude plugin の任意状態、コンポーネント、アクティベーションの不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 80: Copilot Plugin Manifests インベントリ

**目的**: 正確な四つの Copilot plugin-manifest 形式と、それらの有界なローカル marketplace 導出を追加する。同時に、CLI extension が plugin 候補にならないよう、正確に `copilot.excluded.cli-extensions` を所有する。

**独立テスト**: 文書化済み順序でexplicit rootとderived local sourceにある`.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`をinventoryに含める。Execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、containment、正確な`copilot.excluded.cli-extensions`、arbitrary descendant/runtime-state candidateなし、component readなしを検証する。

**目に見えるチェックポイント**: ユーザーは、正確な形式、静的/導出来歴、surface 条件を備えた Copilot plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T797 [US1] 四つすべてのルート/導出形式、順序、多数のソース、共有 Claude manifest、欠落形式、リンク、コンポーネント、CLI extension、installed/hosted 状態、禁止されたソース、注入した execution-environment throw/rejection を対象とする Copilot plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T798 [US1] Copilot plugin の振る舞い、読み取り権限を付与しない `copilot.behavior.cli.extensions`、静的/導出候補、影響を受ける振る舞いへの参照を持つ正確な `copilot.excluded.cli-extensions`、パス不一致となる runtime/component ケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T799 [US1] Four root form、`plugins/foo`/`./plugins/foo`、documented four-target order、environment capacityだけを条件として全validated targetへ行うdirect one-edge derivation、forbidden source form、shared recognition、`copilot.excluded.cli-extensions` mapping、extension-as-plugin candidateが0件であることのplugin matcher/derivation/registry failing testを追加する。Matcherまたはderivationのすべてのthrow/rejectionがdomainでcatch、cause classification、retry、program/plan/candidate/manifest/derived output、Diagnostic、item/recognition/result/body/generation化されず変更なしに伝播し、prior commitだけを保持してlifecycle handlingをtrigger-owning boundaryへ委ねることを`tests/unit/inspection/rules.test.ts`、`tests/integration/repository-scan.test.ts`、`tests/contract/inspection-rules.test.ts`で証明する
- [ ] T800 [P] [US1] manifest 形式の順序、静的/導出来歴、surface の事実、共有 Claude manifest、installed/hosted/component 候補がないことに対する失敗する Copilot 認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T801 [US1] Copilot plugin-manifest 行、形式順序、来歴、surface バッジ、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/copilot-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T802 [US1] plugin 戦略と正確な extension 除外がアクティベーション権限または読み取り権限なしで解決されるように、surface で修飾された Copilot plugin 検索記述と、読み取り権限を付与しない `copilot.behavior.cli.extensions` および `copilot.behavior.cli.user.extensions` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T803 [US1] 静的な `copilot.repo.plugin-manifest` と有界導出の `copilot.derived.local-plugin-manifest` レコードを追加し、正確な非読み取り `copilot.excluded.cli-extensions` だけを所有する。installed、hosted、component パスは `src/shared/registries/inspection-rules.ts` でパス不一致のまま保つ
- [ ] T804 [US1] Copilot plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T805 [US1] Documented local forms/four-target order/direct one-edge/containment/forbidden-source rejectionを持つ`copilot.derived.local-plugin-manifest`を実装する。Derivation throw/rejectionはdomainでcatch/classify/retry/program/plan/candidate/manifest/result化せず変更なしにouter boundaryへ伝播する処理を`src/server/inspection/rules/copilot.ts`へ実装する
- [ ] T806 [US1] ルートと完全一致する Copilot manifest のマッチングと順序付きの静的/導出認識を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T807 [US1] Deterministic Copilot manifest admission、1 Source scan attemptのverified group read、complete success handlingを`src/server/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T808 [US1] インベントリ行と、英語の Copilot plugin 形式、来歴、surface、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 81: Copilot Plugin Manifests の詳細

**目的**: authored、recommended、installed、enabled、trusted、hosted の condition を個別に備えた、完全なリテラルの Copilot manifest detail を追加する。

**独立テスト**: malformed および literal credential を含む manifest を開き、VS Code/CLI/Cloud state の分離、cross-tool metadata、relationship-only の agents/skills/hooks/MCP/LSP/scripts/assets、extension candidate を生成しない既存の `copilot.excluded.cli-extensions` の回帰、正確な解決済みの値、diagnostics、component activation がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot plugin manifest を選択すると、コンポーネントをロードせずに、作成済みメタデータと条件付きランタイム状態が表示される。

### テストを先に

- [ ] T809 [P] [US2] VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、ツール横断メタデータ、relationship-only のコンポーネント、および `copilot.excluded.cli-extensions` が plugin 候補を決して生成しないことの回帰に対する失敗する Copilot plugin テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T810 [P] [US2] script import、agent/skill/component read、hook execution、MCP connection、LSP start、asset load、remote fetch、installed/cache inspection が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T811 [US2] 相互の契約参照を備えた、失敗する Copilot plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T812 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot plugin detail、authored/runtime state、relationship、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/copilot-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T813 [US2] closed Copilot plugin-manifest field ID、正確な component-source の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T814 [US2] Copilot VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、関係の各戦略を個別に `src/shared/registries/runtime-composition.ts` へ追加する
- [ ] T815 [US2] closed allowlist 内の Copilot plugin-manifest metadataと relationship-only のコンポーネントを `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T816 [US2] Copilot manifest 解析、正確な解決済みの値の抽出、relationship-only の component、exclusion、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/server/inspection/scan.ts` に統合する
- [ ] T817 [US2] 型付き詳細と、英語の Copilot plugin 状態、コンポーネント、surface、アクティベーションの不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 82: 統合 Plugin Manifests インベントリ

**目的**: plugin manifest を統合し、共有の `.claude-plugin/plugin.json` を Claude/Copilot の認識に対して一度だけ読み取り、Claude の owner-attached MCP を relationship-only のコンポーネントパスとは分けて保持する。

**独立テスト**: 共有 manifest に対する一つの物理項目/読み取り、二つの plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネントパス、決定的な形式/シードの来歴、Codex の分離、静的/導出の出所、合成 MCP ファイルも接続もないこと、注入したfileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、除外、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、作成済み plugin manifest に対するサポート対象のすべての解釈を理解し、Claude の owner-attached MCP を読み取り不能なコンポーネントパスと区別できる。

### テストを先に

- [ ] T818 [US1] すべてのルート/導出形式、Claude の owner-attached MCP を備えた共有 Claude/Copilot ファイル、欠落した任意 manifest、relationship-only のコンポーネント、除外、シークレット、不正な内容、注入した execution-environment throw/rejectionを対象に plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T819 [US1] plugin-manifest の振る舞い、マッチャー、導出、composition、関係、正確な `codex.excluded.plugin-files`/`claude.excluded.plugin-files`/`copilot.excluded.cli-extensions`、パス不一致となるランタイムケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T820 [P] [US1] Codex、Claude、Copilot の静的/導出 manifest、共有の二重 plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネント、決定的な形式順序、除外に対する完全なマッチャー/認識マトリクステストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T821 [P] [US1] Complete literal derived metadata、catalog-relative provenance、complete target retention、scan-attempt-local shared-file one-read、Claude owner-attached MCP、zero synthetic file/connection/component expansionを検証する。注入したすべてのfileに閉じないfailureがdomainでcatch/classify/retry/manifest item/recognition/provenance/derived result/body/generation化されず変更なしにouter boundaryへ伝播し、prior commitだけを保持するtestを`tests/integration/repository-scan.test.ts`へ追加する
- [ ] T822 [US1] 統合 plugin-manifest インベントリ、フィルター、plan-driven derivation、共有認識、Claude の owner-attached MCP とコンポーネントパスの対比、除外、deterministic Diagnosticとthrow/rejection時に通常どおり報告されるerrorの対比、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T823 [US1] 読み取り権限を持たない三ツールすべての plugin-manifest 検索記述を `src/shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T824 [US1] plugin-manifest の静的/有界導出候補と、既存の正確な `codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`copilot.excluded.cli-extensions` レコードだけを `src/shared/registries/inspection-rules.ts` で完成させる
- [ ] T825 [US1] plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation で完成させる
- [ ] T826 [US1] direct one-edge local derivation、一度の検証済み読み取り、決定的なツール横断および owner-attached MCP の組み立て、除外、合成ファイルも接続もないこと、コンポーネントを展開しないことを `src/server/inspection/scan.ts` に統合する
- [ ] T827 [US1] plugin manifest のインベントリ kind フィルターと要約を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
- [ ] T828 [US1] 英語の統合 plugin-manifest、導出、共有認識、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 83: Plugin Manifests 比較

**目的**: リテラルおよび型付き plugin-manifest 差分で比較を拡張する。

**独立テスト**: Readableなcurrent-generation manifest fileを正確に2つ比較し、activationもconnectionも行わず、完全なliteral sourceと、整列したauthored metadata、form/seed provenance、registration、installation、enablement、trust、owner-attached MCP、component relationship、uncertaintyを検証する。

**目に見えるチェックポイント**: ユーザーは、コンポーネントをロードまたは実行せずに plugin manifest を比較できる。

### テストを先に

- [ ] T829 [US3] `(tool, kind, fieldId)` の解決済みの値、provenance、form、registration、installation、enablement、trust、owner-attached MCP、relationship、uncertainty に関する失敗する plugin-manifest 比較回帰テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T830 [US3] credential/environment-reference の差を含む完全なリテラルの plugin-manifest diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed state/component/MCP、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/plugin-manifests-comparison.spec.ts` に追加する

### 実装

- [ ] T831 [US3] plugin-manifest comparison row が `(tool, kind, fieldId)` で照合して解決済みの `value` を render するよう拡張し、runtime state、owner-attached MCP、component relationship を `src/app/components/comparison/RecognitionComparison.vue` で分離したままにする
- [ ] T832 [US3] 英語の plugin-manifest 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 84: Codex の独立 Hook ファイルインベントリ

**目的**: 独立した Codex `[ANY_DIRECTORIES, '.codex', 'hooks.json']` 物理候補だけを追加する。

**独立テスト**: 可能なプロジェクトレイヤーにある子孫 `.codex/hooks.json` ファイルをインベントリに含め、ニアミス、リンク、ネストされた別名、User/managed hook、plugin コンポーネント対象、インライン設定宣言を個別ファイルとして拒否する。

**目に見えるチェックポイント**: ユーザーは、コマンドを一切実行せずに独立 Codex hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T833 [US1] プロジェクトレイヤー、有効な `.codex/hooks.json`、ニアミス、リンク、インライン設定宣言、plugin 対象、不正なコマンド、シークレット、User/managed 除外を対象とする Codex 独立 hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T834 [US1] Codex の独立 hook の振る舞い、マッチャー、既存の `codex.excluded.plugin-files` 参照、パス不一致となる User/managed ケース、composition、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T835 [P] [US1] Codex `[ANY_DIRECTORIES, '.codex', 'hooks.json']`、可能なレイヤーの来歴、正確なファイル名、ニアミス、inline/plugin/User 対象の候補がないことに対する失敗するマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T836 [P] [US1] 独立 Codex Hook kind、来歴、信頼の不確実性、内包設定との重複がないことに対する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T837 [US1] 独立 Codex hook 行、フィルター、来歴、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/codex-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T838 [US1] フェーズ 23 が所有する `codex.behavior.repo.hooks` を再利用し、加算的な hook composition から参照される前に `codex.behavior.user.hooks` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T839 [US1] 子孫の独立 hook 候補 `codex.repo.hooks` だけを追加し、既存の `codex.excluded.plugin-files` を参照し、新しい除外 ID を定義せずに User/managed の場所をパス不一致のまま `src/shared/registries/inspection-rules.ts` で保つ
- [ ] T840 [US1] Codex hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T841 [US1] Codex の子孫 `.codex/hooks.json` のマッチングとパス由来の認識を `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T842 [US1] hook インベントリのフィルターと独立 Codex の要約を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
- [ ] T843 [US1] 英語の Codex 独立 hook インベントリと除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 85: Codex Hook の詳細

**目的**: 完全なリテラルの Codex hook detail を追加し、inline `[hooks]` recognition を既存の `.codex/config.toml` file に関連付け、same-layer file と inline declaration を必須 warning とともに保持する。

**独立テスト**: standalone/inline Codex hook を開き、additive matching、same-layer file-plus-inline retention、warning metadata、trust/event condition、正確な解決済みの値の保持、diagnostics、command/handler/process/URI/referenced-target execution がゼロであることを検証する。

**目に見えるチェックポイント**: Codex Hook 認識を選択すると、実行せずに正確な加算セマンティクスと警告が表示される。

### テストを先に

- [ ] T844 [P] [US2] 同じレイヤーのファイルとインライン宣言を必須警告とともに保持することに対する失敗する Codex hook テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T845 [US1] インライン Codex hook が既存の `.codex/config.toml` 物理ファイルに関連付けられ、合成ファイルを作成せず、独立 hook とは個別の来歴を保持することを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T846 [P] [US2] Codex hook の検査が command、process、import、evaluation、mutation、URI load、referenced-hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T847 [P] [US2] 完全なリテラルの command、typed event、additive composition、warning、condition、diagnostics、stale ID に関する失敗する Codex hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T848 [US2] 相互の契約参照を備えた、失敗する Codex hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T849 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、standalone/inline Codex hook detail、warning、diagnostics、shared config navigation、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/codex-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T850 [US2] Codex の加算的マッチング、信頼/イベント条件、同じレイヤーの file-plus-inline 警告戦略を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T851 [US2] Codex のインライン認識、同じレイヤーの file-plus-inline の保持、来歴、警告メタデータを `src/server/inspection/recognizers/codex.ts` に実装する
- [ ] T852 [US2] closed standalone Codex Hook field ID、正確な解決済みの値、recognition-atomic failure、source-value-free diagnostics によって JSON extraction を `src/server/inspection/parsers/json.ts` で拡張する
- [ ] T853 [US2] closed inline Codex Hook field ID、正確な解決済みの値、recognition-atomic failure、source-value-free diagnostics によって TOML extraction を `src/server/inspection/parsers/toml.ts` で拡張する
- [ ] T854 [US2] Codex hook の正確な解決済みの値の保持、additive composition、condition、warning、追跡しない reference を `src/server/inspection/scan.ts` に統合する
- [ ] T855 [US2] イベント、コマンド、スコープ、来歴、順序、警告、アクティベーションの不確実性に対応する型付き Codex hook 詳細を `src/app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T856 [US2] 英語の Codex hook composition、警告、安全性、不確実性メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 86: Claude の内包 Hook 宣言

**目的**: サポート対象の宣言を含む、すでに受け入れられた settings、skill、agent、plugin-manifest、marketplace の物理ファイルだけに Claude Hook 認識を関連付ける。

**独立テスト**: hook フィールドを含む/含まない受け入れ済み settings、skill、agent、plugin-manifest、marketplace の所有者、plugin hook-path の関係、参照されていない `.claude/hooks/**` script、捏造された `.claude/hooks.json` を検査する。Claude の独立候補または合成ファイルがないこと、一度だけ読み取って関連付けること、正確な所有者来歴、サポートされないファイルがパス不一致となることを検証する。

**目に見えるチェックポイント**: ユーザーは、捏造された hook ファイルを見ることなく、所有ファイル上の Claude 内包 Hook 認識をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T857 [US1] 受け入れ済み settings、skills、agents、plugin manifests、marketplaces 内の Claude 内包 hook に加え、欠落フィールド、参照されていない script、捏造された独立ファイル、plugin hook パス、不正な宣言、シークレット、ニアミスを対象とするフィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T858 [US1] Claude 内包 hook の振る舞い、関係、既存の `claude.excluded.plugin-files` 参照、パス不一致となる standalone/script/User ケース、エビデンス、no-standalone 行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T859 [P] [US1] settings/skill/agent/plugin/marketplace の所有物理 ID 上だけの Claude 内包 hook、宣言の来歴、合成ファイルがないこと、`.claude/hooks/**` または独立ファイルを推論しないことに対する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T860 [P] [US1] 所有ファイルを一度だけ読み取ること、決定的な Hook 認識の関連付け、relationship-only の plugin hook パス、分離された不正宣言、参照 hook の読み取りがゼロであることに対する失敗するスキャンテストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T861 [US1] Claude 内包 Hook 行、所有ファイルへの移動、フィルター、除外、診断、独立行がないことを対象とするブラウザ受け入れテストを `tests/e2e/claude-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T862 [US1] 独立読み取り権限を持たない Claude 内包 hook の検索記述を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T863 [US1] relationship-only の plugin hook-path レコードを追加し、既存の `claude.excluded.plugin-files` を参照し、新しい除外 ID を定義せずに standalone/script/User の場所をパス不一致のまま `src/shared/registries/inspection-rules.ts` で保つ
- [ ] T864 [US1] Claude hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T865 [US1] Claude の独立 hook の拒否と内包宣言の分類を `src/server/inspection/rules/claude.ts` に実装する
- [ ] T866 [US1] 候補を作成せず、Claude Hook 認識を既存の settings/skill/agent/plugin/marketplace 物理ファイルへ `src/server/inspection/recognizers/claude.ts` と `src/server/inspection/scan.ts` で関連付ける
- [ ] T867 [US1] Hook インベントリ行と、英語の Claude 内包/所有者/除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 87: Claude Hook の詳細

**目的**: same-command deduplication、完全な additional context、restrictive-decision ordering を備えた、完全なリテラルの Claude Hook detail を追加する。

**独立テスト**: すべての owner kind にわたる malformed contained declaration を開き、event field、same-command deduplication、すべての additional context の保持、restrictive ordering、正確な解決済みの値の保持、condition、diagnostics、execution/referenced read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude Hook 認識を選択すると、実行せずに正確な composition セマンティクスが表示される。

### テストを先に

- [ ] T868 [P] [US2] 同一コマンドの重複排除、すべての追加コンテキストの保持、制限的な判断順序、所有者 kind、アクティベーション条件に対する失敗する Claude hook テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T869 [P] [US2] Claude hook の検査が command、process、import、evaluation、mutation、URI load、plugin hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T870 [P] [US2] 完全なリテラルの command、event、owner provenance、composition、condition、diagnostics、stale ID に関する失敗する Claude hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T871 [US2] 相互の契約参照を備えた、失敗する Claude hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T872 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude Hook detail、owner provenance、dedup/context/order、diagnostics、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/claude-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T873 [US2] Claude hook の重複排除、追加コンテキスト、制限的順序、イベント、アクティベーションの各戦略を `src/shared/registries/runtime-composition.ts` に追加する
- [ ] T874 [US2] 同一コマンドの重複排除、すべての追加コンテキスト、制限的な判断順序、所有者来歴を備えた Claude 内包 hook のメタデータを `src/server/inspection/recognizers/claude.ts` に実装する
- [ ] T875 [US2] closed Claude Hook field ID、正確な owner-source の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって JSONC、YAML、Markdown extraction を `src/server/inspection/parsers/json.ts`、`src/server/inspection/parsers/yaml.ts`、`src/server/inspection/parsers/markdown.ts` で拡張する
- [ ] T876 [US2] Claude hook の正確な解決済みの値の保持、composition、condition、diagnostics、追跡しない reference を `src/server/inspection/scan.ts` に統合する
- [ ] T877 [US2] 型付き詳細と、英語の Claude hook composition、所有者、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 88: Copilot の独立 Hook ファイルインベントリ

**目的**: ルート直下の子である Copilot `.github/hooks/*.json` 物理候補だけを追加する。

**独立テスト**: ルートの hook ファイルをインベントリに含め、ネストされたファイル、User hook、settings/agent/plugin 宣言を個別ファイルとして扱うこと、hosted 状態、リンク、実行可能 script、ニアミスを拒否する。

**目に見えるチェックポイント**: ユーザーは、VS Code、CLI、Cloud の来歴を備えた独立 Copilot hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T878 [US1] ルート直下の子、ネストされたニアミス、不正な JSON、不正なコマンド、シークレット、リンク、User hook、hosted 状態、settings/agent/plugin 宣言、script を対象とする Copilot 独立 hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T879 [US1] Hook 固有の除外 ID を定義せず、Copilot の独立 hook の振る舞い、候補、パス不一致となる User/hosted/script ケース、relationship-only の plugin パス、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T880 [P] [US1] ルート `.github/hooks/*.json`、直下の子という深さ、surface の来歴、nested/User/hosted/script の拒否、内包宣言との重複がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T881 [US1] 独立 Copilot hook 行、surface バッジ、フィルター、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/copilot-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T882 [US1] hook composition から参照される前に、surface で修飾された Copilot hook の検索記述と、読み取り権限を付与しない `copilot.behavior.vscode.user.hooks` および `copilot.behavior.cli.user.hooks` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T883 [US1] ルート直下の子である `copilot.repo.hooks` 候補だけを追加し、User/hosted/script パスを不一致のまま保ち、新しい除外 ID を定義せずに plugin コンポーネントパスを関係として `src/shared/registries/inspection-rules.ts` に保持する
- [ ] T884 [US1] Copilot hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [ ] T885 [US1] Copilot のルート `.github/hooks/*.json` に対する直下の子のマッチングと認識を `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T886 [US1] Copilot の独立 hook 分類を統合し、以前の Hook 結果を `src/server/inspection/scan.ts` で維持する
- [ ] T887 [US1] Hook インベントリ行と、英語の Copilot 独立/surface/除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 89: Copilot Hook の詳細

**目的**: 完全なリテラルの Copilot Hook detail を追加し、contained recognition は settings と custom-agent owner だけに関連付ける。plugin hook component path は relationship のままとし、path から recognition を決して作成しない。

**独立テスト**: standalone および settings/agent-contained Copilot hook を開き、agent addition を伴う VS Code workspace same-event priority、CLI append order、Cloud Repository-only behavior、owner provenance、relationship-only plugin hook path、plugin-path recognition がないこと、正確な解決済みの値、condition、diagnostics、execution がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot Hook 認識を選択すると、実行せずに正確な surface composition が表示される。

### テストを先に

- [ ] T888 [P] [US2] agent の追加を伴う VS Code workspace の同一イベント優先、CLI ソースの追加順序、Cloud の Repository-only の振る舞い、settings/agent の所有者来歴、relationship-only の plugin hook パスに対する失敗する Copilot hook テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T889 [US1] settings/agent hook だけが既存の物理ファイルに関連付けられ、plugin コンポーネントパスが Hook 認識または合成候補を作成せず、内包来歴が独立来歴とは個別に維持されることを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T890 [P] [US2] Copilot hook の検査が command、process、import、mutation、URI load、referenced-hook read、plugin activation、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T891 [P] [US2] 完全なリテラルの command、event、surface、owner provenance、composition、condition、diagnostics、stale ID に関する失敗する Copilot hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T892 [US2] 相互の契約参照を備えた、失敗する Copilot hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T893 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、standalone/contained Copilot Hook detail、surface order、owner navigation、diagnostics、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/copilot-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T894 [US2] Copilot VS Code の settings/agent priority/additions、CLI append-order、Cloud Repository-only、relationship-only の plugin path、event、activation の各戦略を個別に `src/shared/registries/runtime-composition.ts` へ追加する
- [ ] T895 [US2] settings/agent 所有者だけの内包認識、relationship-only の plugin hook パス、来歴、条件メタデータを備えた Copilot の surface composition を `src/server/inspection/recognizers/copilot.ts` に実装する
- [ ] T896 [US2] closed Copilot Hook field ID、正確な owner-source の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって JSONC/Markdown extraction を `src/server/inspection/parsers/json.ts` と `src/server/inspection/parsers/markdown.ts` で拡張する
- [ ] T897 [US2] Copilot hook の正確な解決済みの値の保持、settings/agent owner composition、recognition を伴わない plugin-path relationship の保持、condition、diagnostics、追跡しない reference を `src/server/inspection/scan.ts` に統合する
- [ ] T898 [US2] 型付き詳細と、英語の Copilot hook surface、所有者、安全性、不確実性メッセージを `src/app/components/inspection/RecognitionDetails.vue` で拡張する

---

## フェーズ 90: 統合 Hook インベントリ

**目的**: 共有 `.claude/settings*.json` 所有者を一度だけ読み取ることを含め、独立および内包 Hook 認識を統合する。

**独立テスト**: 共有 settings に対する一つの物理読み取りと個別の Claude/Copilot Hook 認識、独立 Codex/Copilot ファイル、内包所有者の来歴、決定的な順序、合成ファイルがないこと、除外、フィルター、注入したfileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。

### テストを先に

- [ ] T899 [US1] 独立 Codex/Copilot ファイル、Claude の settings/skill/agent/plugin/marketplace 所有者、Copilot の settings/agent 所有者、共有 settings、relationship-only の plugin パス、参照されていない script、シークレット、除外、注入した execution-environment throw/rejectionを対象に Hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T900 [US1] Hook 固有の除外 ID を追加せず、Hook の振る舞い、独立マッチャー、内包所有者の composition、関係、既存の正確な plugin-file 除外、パス不一致ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で完成させる
- [ ] T901 [P] [US1] Codex/Copilot の独立ファイル、Claude の独立候補がないこと、すべての script/User/hosted/component 除外に対する完全なマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T902 [P] [US1] 独立/内包の出所、受け入れられたすべての Claude 所有者、Copilot の settings/agent 所有者だけ、共有 settings、relationship-only の plugin パス、合成ファイルがないこと、決定的な来歴、追加認識がゼロであることに対する完全な認識マトリクステストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T903 [P] [US1] Shared ownerのone-read、deterministic Hook recognition order、atomic continuity、完全なtraversal後のfileに閉じたfailureだけによるpartial publication、およびwhole attemptをfatalにしてreferenced-Hook/later readを行わずnew Hook、recognition、item、generation、record、response、partial resultを公開せずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないfileに閉じないfailureに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T904 [US1] 統合 Hook インベントリ、フィルター、共有認識、独立/内包の帰属、除外、診断、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T905 [US1] Owner/fileのscan-attempt-local one-read assembly、deterministic Hook recognition/provenance、zero synthetic filesを実装する。Read/recognition/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/Hook/recognition/provenance/item/body/generation/partial化せず変更なしにtrigger-owning outer boundaryへ伝播しprior commitを保持する処理を`src/server/inspection/scan.ts`へ実装する
- [ ] T906 [US1] Hook のフィルターと独立/内包/所有者の要約を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow component（`src/app/components/inventory/rows/`） で完成させる
- [ ] T907 [US1] 英語の統合 Hook インベントリ、共有認識、所有者、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 91: Hook 比較

**目的**: 実際に読み取り可能な物理ファイル ID だけを選択可能としつつ、リテラルおよび型付き Hook 差分で比較を拡張する。内包 Hook 認識は所有ファイルを通じて選択し、ランタイムの事実だけでは選択できない。

**独立テスト**: owner を介した contained Hook declaration を含む、current-generation の読み取り可能な physical owner/file ID を正確に 2 つ選択し、完全なリテラルの source と、整列された event、source order、deduplication、priority、composition、provenance、warning、uncertainty を検証し、synthetic ID と runtime-fact-only row を拒否する。

**目に見えるチェックポイント**: ユーザーは hook 宣言を実行せずに比較できる。

### テストを先に

- [ ] T908 [US3] 正確に2つのdistinctなreadable physical owner/file IDと、両inputで同じIDを選ぶことの拒否、owner ID を介した contained Hook、runtime-fact の拒否、`(tool, kind, fieldId)` の解決済みの値、event、order、composition、provenance、warning、uncertainty に関する、失敗する selection/comparison 回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T909 [US3] owner を介して選択した contained Hook、credential/environment-reference の差を含む完全なリテラルの Hook diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed event/composition の差、runtime-fact の拒否に関するブラウザー受け入れテストを `tests/e2e/hooks-comparison.spec.ts` に追加する

### 実装

- [ ] T910 [US3] 実際に読み取り可能な物理 owner/file ID による比較選択を強制し、内包 Hook 認識をその所有者を通じて `src/app/composables/comparison.ts` で解決する
- [ ] T911 [US3] runtime fact を選択可能な file として公開せず、Hook comparison row が `(tool, kind, fieldId)` で照合して解決済みの `value` を render するよう `src/app/components/comparison/RecognitionComparison.vue` で拡張する
- [ ] T912 [US3] 英語の hook 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 92: Repository インベントリの受け入れ

**目的**: 先行するすべての Repository インベントリ増分が、包括的な実装を用いずに US1 を満たすことを検証する。

**独立テスト**: 全サポート対象フィクスチャに対してパッケージをインストールし、allowlist に含まれるすべてのファイル、フィルター、認識、注入したfileに閉じないfailureの変更なし伝播、再スキャンパス、パッケージパス、性能目標に加え、priority MCP adapter の後段の所有者有効化が既存の一つの所有者/読み取り上で行われ、合成ファイルも接続もないことを検証する。現在所有されている Repository レジストリのゲートは、36 個の静的候補、5 個の有界導出候補、7 個のベンダー除外の正確に 48 ID であり、内包 Hook/MCP の作業が追加する候補ルールはゼロとする。また、3 つの `*.excluded.user-runtime` と `shared.excluded.managed-remote-state` はフェーズ 96～98 まで意図的に未定義のままとする。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。

### 受け入れテスト

- [ ] T913 [US1] 現在所有されている正確な48 IDのRepository registry gate（36 static、5 bounded-derived、7 vendor-excluded）を追加し、1 merged root file/read/recognitionに対するdistinctな`copilot.repo.mcp`/`copilot.repo.mcp.vscode-root` provenanceを含める。すべての前段/後段所有者による内包Hook/MCP認識が追加するcandidate ruleはゼロで、既存の一つのowner ID/readが保持され、synthetic fileを作成しないことを証明し、延期されたGlobal-eraの4 non-read exclusionがまだ定義されていないことを`tests/contract/inspection-rules.test.ts`で表明する
- [ ] T914 [US1] 全サポート対象、ニアミス、空、複数ツール、導出、malformed、シークレット、性能のフィクスチャとガイダンスを `tests/fixtures/repositories/build-fixtures.ts`、`tests/fixtures/repositories/README.md`、`tests/fixtures/repositories/README.ja.md` で完成させる
- [ ] T915 [US1] Node.js・decoder・parser・filesystem・assembly・publicationからfailureを注入する統合testを追加する: 1つのfileに閉じたfailureは、影響のない全fileが完全なままのpartial generationの中でそのfileのDiagnosticになり、それ以外のfailureはitem/recognition/derived result/result body/generationなしでattemptを中止し、failureは失敗したrequestの実際のerrorとして通常どおり報告され（accept前はjobなし、accept後は保持されたstale commitとともに）、ownerlessな自動startup rejectionはprocessのtop levelに到達し、prior commitが残ることを証明する。capacity上限もverdictも存在しないこと、authority revocationがhard-cancellationを主張せずにlate workを破棄することも`tests/integration/runtime-failures.test.ts`で別に証明する
- [ ] T916 [P] [US1] 全Repository kindのcomplete session/rescan API contractを追加する。Generation 0はcaptured `cwd`/`--root`から選択したexactly one enabled idle Source、stable source ID、escaped non-authorizing root、empty files/Diagnostics、null request ID、source I/O 0件を持つ。Strict inventory envelope、admitted Source/progress/final state/successful generationでone request IDを保持すること、conflict/stale ID/atomic publication、loopback-only session access、analysis/verdict fieldなしを検証する。Ordinaryなrequest-owned failure lifecycleとして、accept前のrejectionはrequestの実際のerrorで失敗しjob・retentionを作らず、accept済みjobのfatal rejectionはそのrequestのerror messageをmatching non-null IDで保持しresult・generationを作らず、ownerless startup rejectionはprocess top levelへ伝播する。Fatalに終了したaccept済み明示rescan jobだけがそのSourceのstale overlayを作成または置換し、throw/rejectionでは失敗したrequestのerror messageだけを、rootを読めなかった場合はsource-scoped `root-unreadable` Diagnosticを参照し、pre-acceptance failureではoverlayを作らず、正常replacement後だけclearすることを要求する。以上を`tests/contract/http-api-session.test.ts`で証明する
- [ ] T917 [P] [US1] 隔離install、fixed assets、同一tarball、反復指定をparserのlast valueへ解決するoptional `--root`の完全なpackaged Gunshi CLI testを追加する: invocation `process.cwd()`を1回captureし、省略時はその正確な文字列を保持する。絶対optionはそのまま保持し、相対optionはlexicalな`node:path` operationだけでcaptureに対して解決する。packed entry全体を計測する: CLI import前はfixedなpackage所有以外のproduct所有read 0件を許し、その後のroot selectionはfilesystem/network I/O 0件かつ`process.chdir()`なしを要求し、明示的なempty launchはfixedでactionableかつsource-value-freeな出力とともにsession/browser作成前にfailし、valueの欠落はそこでGunshiのtyped argument validationによりfailすることを証明する。T043のownerless `process.cwd()`-throw caseを含める。Inspection由来helper入力なしのfixed devframe default-browser helper委譲とそのenvironment behavior、`--no-open`/printed-URL fallback、non-binding help/version、厳格なunknown/positional/rest rejection、awaited shutdown、root-only import、追加mode 0件も`tests/package/npx-launch.test.ts`でカバーする
- [ ] T918 [P] [US1] T183をfinal registryへ拡張し、1つの変更しないprofile/fixtureで正確に10のfresh processを実行する。Run 1直前と各run直後にprofileがbindする`tests/performance/sc002-fixture-manifest.json`のversion/canonical digest、`tests/performance/sc002-fixture-manifest.sha256`、参照する全content digestを再計算して、missing entryまたはdriftがあればset全体を無効とする。各自動first scanをtiming外で待ち、明示rescanを正確に1件dispatchして`scanRequestId`をcaptureし、両timerをdispatch時に開始して、qualifying visible/assistive statusとcommit済みgeneration inventoryへ同じIDを要求する。Prior/automatic stateを拒否し、同じ9 run以上に1秒status、10秒inventory、2つの100 ms未満interactionを要求する。各runで同じprofile ID/manifest version/canonical digestを繰り返し、request ID/generation/environmentを記録し、personal identifier/absolute user pathだけを省略してcache reset/snapshot reuse/cross-profile comparisonを拒否する。対象は`tests/performance/repository-scan.test.ts`と`tests/performance/inventory-interactions.test.ts`とする
- [ ] T919 [US1] Inventory、filter、multi-recognition、Diagnostics、empty state、request-correlated rescan/retry、keyboard use、atomic replacement、明示的なdetail request外でのsource/metadata/sensitive-value exposure 0件に関するRepository-complete browser acceptanceと文書化済みdiscovery command targetを`tests/e2e/repository-complete-inventory.spec.ts`と`tests/e2e/discovery.spec.ts`へ追加する。Inventory/Diagnostics/Source Condition Factsがnatural-language interpretation/ranking、customization validity/correctness/compliance/effectiveness/quality verdict、validation/lint、remediation/fix controlを公開しないnegative assertionを含める

---

## フェーズ 93: Repository 詳細の受け入れ

**目的**: 先行するすべての Repository 詳細増分が、包括的な実装を用いずに US2 を満たすことを検証する。

**独立テスト**: 現在所有されている完全な48-ID Repository rule registry（36 static、5 bounded-derived、7 vendor-excluded）、延期されたGlobal-era exclusion 4件の明示的な不在、parser matrix、environment-owned capacity下のexact literal displayとcomplete detail behavior、safe filesystem boundary、すべてのlate owner-bound MCP activation、activation/connection/environment-reference resolution 0件、file-detailとabsent-reveal-function API behavior、relationship、diagnostics、stale cleanup、contained Hook/MCP factによるcandidate-rule additionとduplicate owner read 0件を検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。

### 受け入れテスト

- [ ] T920 [P] [US2] 現在所有する正確な48 IDの内訳（36 static、5 bounded-derived、7 vendor-excluded）、延期した4 exclusionの不在、1 owner ID/readへmergeされるdistinctなroot CLI/VS Code rule provenanceとpath-only VS Code semantics、contained Hook/MCP candidate ruleゼロ、early contractからlate owner activationまでの完全なmatrix、synthetic file/connectionゼロ、現在所有する全behavior/strategy/relationship/evidence backlink、emitする全`(tool, kind, fieldId)`とrelationship kindのexactなclosed presentation-allowlist membershipに加え、そのoccurrenceのactualなadmission済みsource formに対するexact extractor applicability、未記載entryの推論とcross-form promotionがゼロであること、reciprocal fingerprint、offline separationについて、Repository subgraph contractを`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`に追加する
- [ ] T921 [P] [US2] JSONC、YAML、TOML、Markdown/frontmatterの4 parser matrix testを`tests/unit/inspection/parsers.test.ts`と`tests/unit/inspection/seed-parsers.test.ts`に追加し、NUL byteはdiagnostic-onlyの`binary`となり、NULのないbyteはexactly onceだけdecodeされてreadableな`utf-8`または`utf-8-replaced`となり、先頭BOM 1個を除去して記録し、保持された`U+FFFD`がscanをpartialにせずatomic extraction/display/comparisonまで完全に伝播し、charset fallback/sampling/truncationがないことを証明する。Deterministic malformed returned outcome、`recognition-parse-failed` Diagnosticとしてcatchされるfile-confinedなparser exception、environment-owned capacity、およびfileに閉じないdecoder/parser/extractorの全throw/rejectionがdomain catch、cause classification、retry、recovered result、Diagnostic、generationなしに変更なく伝播することも扱う
- [ ] T922 [US2] Relationship、provenance、derivation、fallback、source occurrence、authored text、parser message、retained graph、FileDetailでthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered value/Diagnostic/body/generation化せず変更なしに伝播すること、atomic abort/prior snapshot、および失敗したrequestのordinary errorまたはownerless startup top-level挙動だけを`tests/integration/runtime-failures.test.ts`で検証する
- [ ] T923 [US2] `SourceConditionFact`、`ApplicabilityAssessment`、Diagnostic construction/retention/serializationのthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered Fact/assessment/Diagnostic/recognition/result/body/generation化せず変更なしに伝播すること、prior snapshot、numeric capなし、および失敗したrequestのordinary errorまたはstartup top-level挙動だけを`tests/integration/runtime-failures.test.ts`で検証する
- [ ] T924 [P] [US2] malformed file、broken linkが`file-unreadable`になるtarget透過読み取りのsymlinked entry、読み取り不能file、disable/shutdown/supersession後のcleanup-only late discard、read-only open flag、mutation-capable call 0件、不変のcontent/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL観測、別記録のOS-only atime残差の完全safety testを追加する。closed publication matrixを証明する表を含める: file限定の`file-unreadable`/`file-content-binary`/`recognition-parse-failed` outcomeはpartial generationの中にdiagnostic-onlyまたは部分導出recordを保持し、読めないrootはsource-scoped `root-unreadable` DiagnosticでそのSource attemptをfailさせ、単一fileに閉じないfailureは何もcommitしないことを`tests/integration/inspection-safety.test.ts`で証明する
- [ ] T925 [P] [US2] `--no-open`またはpost-helper instrumentationのもとで全Repository familyへzero-activation regressionを拡張する。Local fixture rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback classを別々に分類・検証し、それ以外の全surfaceについてdiscovery/read/parse/display/comparison/relationship processingによるchild/evaluation/MCP/禁止対象direct product-issued outbound request/URI/image/mutation/reference readが0件であることを証明する。対象は`tests/integration/security/zero-activation.test.ts`とする
- [ ] T926 [P] [US2] 全readable kindのfile-detail/absent-reveal-function contractを追加する。`utf-8 | utf-8-replaced`はcomplete source、解決済みの値、comparison eligibilityと`U+FFFD`を保持し、`binary`だけがdiagnostic-onlyでそれらを禁止する。Source-form allowlist、unknown-key text、stale ID、acknowledgement/notice operationが存在しないこと（FR-027はどちらも持たない）を検証する。Request-owned operationのthrowはそのrequestを実際のerrorで失敗させjob/result/generation/success payloadを作らず、post-commit delivery rejectionはcommit不変/success payloadなし/partialなし、analysis/validation/verdict/remediation fieldなしを`tests/contract/http-api-files.test.ts`で証明する
- [ ] T927 [US2] acknowledgementも注意書きも伴わない直接のmemory-only presentation（FR-027）、`utf-8-replaced` textとcomparisonを含む完全でliteralなreadable detail、authored valueを一切含まないdiagnostic-only binary、exact metadata/relationship、masking/reveal/substitutionなし、executable rendering 0件に関するRepository-complete browser acceptanceを`tests/e2e/repository-complete-detail.spec.ts`と`tests/e2e/inspection-safety.spec.ts`へ追加する。完全なtraversal後のfileに閉じたunreadable/binary/parse-failure outcomeだけがpartialをcommitでき、request-owned throw/rejectionはnew result/generationを作らず失敗したrequestの実際のerrorとして報告され、accept済みexplicit-rescan jobがfatalに終了した場合は失敗したrequestのerror messageだけを参照するstale overlayを作成または置換し、accept前failureでは作成しないことを検証する。一方、ownerless automatic first-scan rejectionはprocess top levelへ到達し、deterministic first-scan failureはgeneration-0 Sourceをstale overlayなしで保持する。Pre-request disable、より大きいepochの観測、またはfenceによる中央full-session purgeは保持中のcontentをすべて破棄し、route/file/Source/generationのscope限定cleanupは自身のmodelだけをdisposeすること、stale route、analysis/verdict/remediation controlがないことも扱う

---

## フェーズ 94: Repository 比較の受け入れ

**目的**: 先行するすべての Repository 比較増分が、包括的な実装を用いずに US3 を満たすことを検証する。

**独立テスト**: 同じRepository Source内のreadableなcurrent-generation distinct file ID 2件を比較し、その後、後段でadmitされた全real owner IDを介したMCPを含む全familyのrepresentative fileについて、literal/typed difference、unreadable、diagnostic-only、runtime-only、dormant selectionの拒否、fallback、accessibility、stale invalidation、client resourceの完全なcleanupを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。

### 受け入れテスト

- [ ] T928 [US3] Rescanによるselection/request token/FileDetail/Monaco model/worker/subscription/late-owner MCP projection/client epoch/stale ID invalidationのlifecycle regressionを追加する。保持またはresetすべきacknowledgement stateは存在しない（FR-027）。Ordinary scoped route/file/Source/generation cleanupは自身のmodelだけをdisposeし、document reloadとchannel/document loss、pre-request Global disable、greater Global epoch/non-null fence観測を含む全central full purgeがcontentを破棄する。全central full purge後にsource text、authored metadata/relationship target、comparison request/DOM/editor stateがどのRepository kindにも残らないことを`tests/integration/session-lifecycle.test.ts`で証明する
- [ ] T929 [US3] このmilestoneでは同じRepository Source内のreadableなcurrent-generation distinct file ID 2件だけを対象とするliteral comparisonとtyped differenceに関するRepository-complete browser acceptanceと文書化済みcomparison targetを追加し、semantic ranking、merge、validation、lint、content verdict、policy/remediation、synchronization、conversion、formatting、fix suggestionがないことをassertする。Real owner IDを通じたlate-owner MCP selection、runtime-only/dormant rejection、fallback behavior、accessibility、lifecycle cleanupも`tests/e2e/repository-complete-comparison.spec.ts`と`tests/e2e/comparison.spec.ts`で扱う

---

## フェーズ 95: Global 同意プレビュー

**目的**: User-Global パスが承認される前に、正確で I/O を行わず capacity を environment に委ねる previewを表示し、同意の除外に必要な残りの純粋な User-only の振る舞いの事実を完成させる。

**独立テスト**: 分離された environment input と fake home を使用し、proposed path に対する I/O がゼロであること、正確な3 tool preview entry、throw/rejection 時に partial preview を公開しない complete environment-supported escaping、不正な override、保持済みpreviewのallowlist/traversal-plan versionを伴う`previewId` binding、stale/replayed request の拒否、固定English UIでのaccessible review、`codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` の read authority を付与しない one-time ownership を検証する。

**目に見えるチェックポイント**: ユーザーは検査を有効にする前に、正確な Global root、exclusion、lexicalなvalidity state、contract versionを確認できる。Read scopeはpatternごとのpath表示ではなく平易な言葉で説明する。

### フィクスチャとテストを先に

- [ ] T930 [US4] Exact candidate、exclusion、fallback、invalid override、link、unreadable root、注入したNode.js/OS/filesystem throw/rejection、異なるliteral credential/environment reference、sentinel process value、executable-looking inert payload、before/after content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL observationと別記録するOS-only atimeを対象とするisolated Global-home fixtureを作成する。throw/rejectionを変更なく伝播し失敗したrequestの実際のerrorとして報告すること、file-size/count validationなし、availabilityからvalidity/lint/verdictを生成しないことを`tests/fixtures/global-homes/build-fixtures.ts`、`tests/fixtures/global-homes/README.md`、`tests/fixtures/global-homes/README.ja.md`のbilingual guidanceへ記載する
- [ ] T931 [US4] 残りの純粋な User-only の事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` を具体化し、それらに対する失敗するレジストリ/バックリンクのカバレッジを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/contract/vendor-behaviors.test.ts` に追加する
- [ ] T932 [P] [US4] filesystem/network I/O 0件と完全な順序付きGlobal `inputState` algorithmのpreview failing testを追加する: environmentのみのemptyは`present-empty`、U+0000またはunpaired UTF-16 surrogateは`invalid`、active platformの`path.isAbsolute()`がfalseなら`relative`、それ以外の値は`eligible`で、その正確な文字列がpreviewにfreezeされconsentまでread authorityを持たない。正確なlexical root、完全なenvironment-supported escaping、正確で最小の3-entry frozen previewもカバーする。capture-or-replaceがstate-changing capture operationだけで起きること、current-preview取得がnon-mutatingであることを証明する。throw/rejectされたcapture/escaping/serialization operationは、catch・cause分類・partialなDTO/state mutation・path authorityなしにconsent domainから無変更で伝播し、session API表現は失敗したrequestの通常どおり報告されるerrorに委ねることを`tests/unit/host/global-consent.test.ts`で証明する
- [ ] T933 [US4] Immutable typed traversal plan、opaque `previewId`の背後でserverが保持するraw/display record、stale/replay invalidation、およびlater enable-request materialの`confirmedTools`をinvalid entryも含むclosed fixed order `[copilot, claude, codex]`にexactly固定し、eligibility narrowing、reorder、UI/API selectorを許さないpreview testを`tests/unit/host/global-consent.test.ts`へ追加する。このPhase-95 test boundaryはpreview-onlyとし、consent後のinitial/retry work-set derivationはenable foundation作成後のT945–T946が所有する
- [ ] T934 [P] [US4] Non-mutatingなconsent-preview read functionがcurrent frozen previewまたはfixedな`consent-preview-missing` rejectionだけを返すcontractと、session API契約（contracts/http-api.md）のstate-changingでargument-freeなconsent-preview capture functionがunconsented previewをcaptureしてatomic create/replaceし、作成済みpreviewを返すcontractを追加する。Proposed-root I/O 0件、active-consent/enable/disable conflict、capture/encoding throw時に失敗したrequestのordinary errorとなりsuccess byte/job/retention/state mutationが0件であることを検証し、read functionがenvironmentをrecaptureしないことを`tests/contract/http-api-global.test.ts`で証明する
- [ ] T935 [US4] 固定Englishのpreview UIについて、root、平易な言葉によるread-scope説明、lexical state、exclusion、通常どおり報告されるrequest error、keyboard review、同意前のsource resultまたはenable requestが0件であることを検証するfailing browser acceptance testを`tests/e2e/global-consent-preview.spec.ts`に追加する

### 実装

- [ ] T936 [US4] Global 除外レコードから参照される前に、それまで未所有で読み取り権限を付与しない事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` だけを `src/shared/registries/vendor-behaviors.ts` に追加する
- [ ] T937 [US4] ソース ID を作成せず、これら 3 つの純粋な User-only の振る舞いの事実に対する相互バックリンクを既存の公式ソースレコードへ 対象registry recordの`evidence` citation で追加する
- [ ] T938 [US4] POST所有のcomplete environment/default-home preview captureとordered Global `inputState` algorithm（`present-empty`、U+0000またはunpaired surrogateなら`invalid`、`relative`、それ以外は`eligible`）を実装し、`eligible` rootだけにexact frozen文字列を引き継いでfilesystem/network I/Oを0件とする。Normalization/root creationなしのpresentation escapingとatomic create-or-replaceを行い、frozen recordをGETへpure current-state retrievalとして公開する。Capture/classification/escape/serializationのthrow/rejectionはdomainでcatch/cause分類/partial DTO/state mutation/path authority化せず変更なしに伝播する処理を`src/server/host/global-consent.ts`へ実装する
- [ ] T939 [US4] Opaque `previewId`の背後に置くメモリ内だけのプレビューレコード、古い状態の無効化、有効化要求のバインディングを `src/server/host/global-consent.ts` に実装する
- [ ] T940 [US4] `src/server/host/devframe-app.ts`にstrictなpaired preview functionを実装する。Non-mutatingなconsent-preview readはcurrent frozen previewまたはfixedな`consent-preview-missing` rejectionだけを返し、argument-freeなcapture functionだけがunconsented previewをcapture/atomic create-or-replaceして返す。Readはpure current-state retrievalのままにする。Exact conflictを保持し、capture/encoding throwはrequestを実際のerror（devframeがそのままserialize）で失敗させ、success byte/job/retention/state mutation/path authorityを作らず、readはenvironment recaptureしない
- [ ] T941 [US4] 正確な root、平易な言葉によるread-scope説明、state、exclusion、version、通常どおり報告されるrequest error について、Inspector-defined capacity field/value を含まない accessible preview presentation を `src/app/components/consent/GlobalConsentPreview.vue` に実装する
- [ ] T942 [US4] 有効化を送信せず、プレビューのロード、ローカルの明示確認状態、古い状態からの回復、session-identity loss の処理、フォーカス管理を `src/app/pages/global-consent.vue` に実装する
- [ ] T943 [US4] 英語の Global preview、throw/rejection、override、consent message を に追加する

---

## フェーズ 96: Fixed-Three Global Enable基盤とCodex Batch Member（Composite Slice 1/4）

**目的**: Exact stored previewを検証し、3つのclosed typed member-admission port上にgeneric selector-free fixed-three coordinatorを確立してreal Codex memberをbindすることで、単一のPhase-96–99 composite milestoneを開始する。Claude/Copilot production portはPhase 97–98だけが追加し、このslice単独ではall-three production完成を主張せず、Phase 99前にcomposite milestoneを完了しない。

**独立テスト**: Tool selectorなしのexact preview-bound bodyをsubmitし、generic coordinator boundaryへtest-only typed member outcomeをinjectして、後続Claude/Copilot production portの存在を装わず0〜3件のaccepted/rejected partitionをすべてexerciseする。Admitted outcome 0件なら`active-no-job`、injected admitted context 1〜3件ならone shared `scanRequestId`/working setのexactly one `GlobalBatchScan`へまとめてtransferする。Real Codex member、disable interleaving、visible carried Sourcesを伴うexact retry state、Repository、exact `codex.excluded.user-runtime`も別に検証し、Phase 99で3つのreal portを通じて同じpermutationを再検証してからcomposite milestoneをgreenにする。

**目に見えるチェックポイント**: このinternal sliceはrelease checkpointではない。Harnessはfixed tupleとshared pending/retryable stateをprovisional Sourceなしで示すが、user-visible all-three checkpointはClaude/Copilot port bind後のPhase 99だけが所有する。

### テストを先に

- [ ] T944 [P] [US4] canonical component identity、targetを通して読まれるlink、invalid override、網羅的first-non-empty traceのCodex post-consent failing testを追加する: `trim().length > 0`の読み取り済み非binary decoded override (保持された`U+FFFD`を含む) はshort-circuitする。missing/empty/BOM-only/whitespace-onlyのoverrideはfallbackへ進む。binary overrideは`file-content-binary` Diagnosticでbranchを終了しfallbackしない。読めないoverride (broken linkを含む) は`file-unreadable` Diagnosticでbranchを終了しfallbackしない。1つのfileに閉じないfailureはfixed-three transaction全体を中止しcontext/candidate/plan/authority/batch/resultを一切生まない。host consent codeが`node:fs` callを0件発行することを`tests/unit/host/global-consent.test.ts`でassertする
- [ ] T945 [P] [US4] `confirmed: true`、exact version/`previewId` binding、tool selectorなし、extra/false/stale/superseded-preview rejection、fixed `confirmedTools: [copilot, claude, codex]`、server-derived initial-allまたはexact `retryableTools` set—admitted-unpublishedとsame-preview rejected controlを含み、published、pending、lexical new-preview-required controlを除外—、exact accepted/rejected partitionのGlobal-enable function failing contract（session API契約、contracts/http-api.md）を追加する。Zero admittedは`active-no-job`/null ID/no new job/Source/generationとし、initial enableにはGlobal Sourceがない。Retry validation/admission中は`globalEnableInProgress`だけを公開し、既存のSources/control/`pendingTools`/`retryableTools`/`batchStatus`/diagnostic/snapshot projectionをexactly保持する。Queued acceptanceだけが`pendingTools`/`batchStatus`をadmitted subset/shared IDへatomicに設定する。未bindのClaude/Copilot portにはtest-only typed outcomeをinjectして1–3 admittedのexactly one shared `scanRequestId`/one unpublished `GlobalBatchScan` `queued`をcoverするが、production root/contextをsynthesizeせず、T991/T993で全real portを通じて同じcaseを再検証する。Fileに閉じないfailureはaccept前なら失敗したrequestのordinary errorとしinitial consent/control/jobをactivateせず、retry stateを不変にし、acceptance後ならshared non-null IDのone retained terminal error/no subset commitとすることを`tests/contract/http-api-global.test.ts`で検証する
- [ ] T946 [P] [US4] Production bind前のmember portにはtest-injected typed outcomeだけを使い、fixed-three initial-enable/retry coordinatorのatomic control/admission partition、operation epoch、FIFO、conflict、provisional Source 0件、`active-no-job`、および全nonempty injected admitted subsetにone `GlobalBatchScan`/request ID/publication authority/working setを検証する。Retry pollingはaccept前に`globalEnableInProgress`だけを公開してexactなpre-operation `pendingTools`/`retryableTools`/`batchStatus`/diagnostic projectionを保持し、queued acceptanceがadmitted subset/shared requestだけをatomicにinstallすることを証明する。Fileに閉じないfailureはaccept前ならinitial consent/control/jobを作らず、retryならexisting stateを不変にし、acceptance後ならshared batchをone retained ordinary terminal errorでterminalにする。Subset/generation/stale overlayなし、prior snapshot、disable/shutdown/supersession late discard、acceptance対`global-disable-pending` conflictのlinearizationを証明する。このinjected coordinator suiteをproduction all-three完成と扱わず、T991/T993がその証明を`tests/unit/session/coordinator.test.ts`で所有する
- [ ] T947 [P] [US4] Fixed-three transaction内のCodex member boundary testを追加する。Raw-path挙動（exact raw segmentがfilesystem operandのままT019/T030の公開raw pathに従うこと）、exact Codex Global instruction/fallback、excluded surface 0件、admitted missing-Source memberのnew/provisional Sourceをsingle batch commit前に0件、carried existing Sourceはvisibleとする。Fileに閉じないfailureは全siblingをabortしRepository stateを保持する。さらに、全proposed-root operationがsingle inspection moduleだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で証明する
- [ ] T948 [US4] 参照だけの Codex User 振る舞いセット、`codex.global.instructions`、正確な `codex.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T949 [US4] 有効化前にすべての Codex User 振る舞いがすでに所有されていたこと、`codex.global.instructions` が読み取りを新たに許可する唯一の Codex ルールであること、`codex.excluded.user-runtime` が新たに所有される唯一の Codex 除外であることを証明する、失敗する Codex Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts` に追加する
- [ ] T950 [US4] No-selector exact-preview、fixed `[copilot, claude, codex]` confirmation、未bind Claude/Copilot portへのtest-only typed outcome、one shared batch/request IDへ結び付くper-tool accepted/rejected controls、`active-no-job`、ordinaryなbatch failure error、deterministic Diagnostic、admitted missing memberのpre-commit new/provisional Source/file row 0件とcarried Source visibility、Repository retentionのbrowser acceptanceを`tests/e2e/global-codex-admission.spec.ts`へ追加する。Real Codex pathだけをproduction-backedとし、全real-port browser完成はPhase 99へdeferする

### 実装

- [ ] T951 [US4] Codex root-admission orchestrationをfixed-three operationのone memberとして実装し、frozen rootとcompiled planをinspection moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはsingle `GlobalBatchScan`へ渡すatomic all-tools decisionでだけ`GlobalToolControl`へtransferする処理を`src/server/host/global-consent.ts`へ実装する
- [ ] T952 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `codex.behavior.user.instructions`、`codex.behavior.user.agents`、`codex.behavior.user.config`、`codex.behavior.user.hooks`、`codex.behavior.user.memories`、`codex.behavior.user.plugins`、`codex.behavior.user.prompts`、`codex.behavior.user.rules`、`codex.behavior.user.skills` を、Global ルール/除外への相互参照で `src/shared/registries/vendor-behaviors.ts` において更新する
- [ ] T953 [US4] 同意でゲートされた読み取り許可ルールとして `codex.global.instructions` だけを追加し、既存の除外レコードを一切変更せず、正確に新しい非読み取りの `codex.excluded.user-runtime` を `src/shared/registries/inspection-rules.ts` で所有する
- [ ] T954 [US4] 新しい戦略 ID を作成せず、既存の Codex 命令戦略を Global 選択、フォールバック、適用可能性、ソース分離の入力によって `src/shared/registries/runtime-composition.ts` で拡張する
- [ ] T955 [US4] 新しいソース ID を作成せず、Codex Global のカバレッジについて既存の公式ソースレコードのバックリンクを 対象registry recordの`evidence` citation で更新する
- [ ] T956 [US4] 正確な`utf-8`/`utf-8-replaced` emptiness semanticsを持つcompile済み`codex-global-first-non-empty` traversal planを実装する: missing overrideはfallbackへ進み、empty/BOM-only/whitespace-only overrideも進み、binaryまたは読めないoverrideはそのDiagnosticでbranchを終了しfallbackせず、最大1 fileを選択し、正確な`codex.excluded.user-runtime`は除外されたままにし、1つのfileに閉じないfailureは無変更で伝播してbatch全体を中止することを`src/server/inspection/rules/codex.ts`で実装する。Fallbackは自身のtargetをreadするため、他planのwalkもadmitしたtargetは1 Source scan attemptにつき1回だけreadしなければならない（contracts/inspection-path-allowlist.md § Common conformance requirements）。両方がreadした後にadmissionをmergeすることは1つのfileを2回readすることであり、そのbytesは`readBytes`にちょうど1回だけ反映させる。
- [ ] T957 [US4] Codex scanをsingle `GlobalBatchScan`のone memberとして実装し、one root、exact fallback、raw-path semantics、deterministic Diagnosticを扱う。全committable memberがone atomic generationでpublishされるまでadmitted missing memberのnew/provisional Source/graphを0件とし、carried Sourcesをvisibleに保つ。Fileに閉じないmemberのthrow/rejectionは変更なしに伝播してwhole batchをabortするよう`src/server/inspection/scan.ts`へ実装する
- [ ] T958 [US4] Fixed three closed typed member-admission port上にgeneric selector-free initial-enable/exact-consent-retry coordinatorを実装する。Production Codex portはT951、Claude/Copilot portは後続T968/T982がbindし、T945–T946はこのport boundaryへtyped test outcomeだけをinjectできるがproduction root/contextをsynthesizeせずfilesystem I/Oを行わない。Generic layerはinitialで3 slotすべてをevaluateし、retryではnon-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するcomplete fixed-order exact `retryableTools` projectionをderiveし、one atomic decisionでfixed controls/outcomesを有効にする。Retry validation/admission中は`globalEnableInProgress`だけを公開し、exact pre-operation `globalControl`,`pendingTools`,`retryableTools`,`batchStatus`, diagnostic fields, Sources, snapshotを保持して、queued acceptanceだけがadmitted pending subset/shared batchをatomicにinstallする。Zero admittedは`active-no-job`/null ID/no new job-Source-generation、nonemptyはsupplied typed context/IDすべてをone shared request/authority/working setの`GlobalBatchScan`へtransferする。Exact pre-/post-acceptance errorとlate-discard lifecycleを保持するが、T998が全real portをbindしT1000–T1002がpublication/API behaviorをcloseするまでproduction all-three activationを主張しない処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する
- [ ] T959 [US4] Generic coordinatorへ接続するfoundation Global-enable session-API function adapterを`src/server/host/devframe-app.ts`へ実装する。Strict selector-free guard、stored previewの`previewId` validation、fixed-three confirmation、server-derived exact `retryableTools` setとnonempty gate、provisionalな`pendingTools`/`batchStatus` mutationを行わず`globalEnableInProgress`だけを公開するoperation-local validation、accepted/rejected partition、queued one shared IDまたは`active-no-job` null ID、retry/disable conflict、Source summary/client authorityなし、ordinaryなpre-/post-acceptance failure lifecycle（失敗したrequestの実際のerror）/no partial subsetも保証する。Unbound production member portはrejection/admissionをfabricateせずrootへaccessできず、T998/T1002が最初のcomplete all-real-port functionを所有する
- [ ] T960 [US4] Single explicit fixed-three confirmation controlをselector-free endpointへ直接接続し、per-tool selectorを決して提供しない。Stale preview、accepted/rejected partition、one shared batch、`active-no-job`、ordinaryなbatch failure error、accessible focusを`src/app/pages/global-consent.vue`へ実装する
- [ ] T961 [US4] Retry validation/admission中は`globalEnableInProgress`だけを公開してexactなpre-operation control/pending/retryable/batch/diagnostic projectionを保持し、atomicなqueued acceptanceだけがadmitted accepted-batch subset/shared request IDを参照するpending entryと対応する`batchStatus`を設定するfixed-three controlsを実装する。Pending終了後のretryable entryはnon-pending unpublished-admittedとsame-preview-rejectedからなるexact `retryableTools` setだけとし、lexical new-preview-required controlを除外する。Evaluated missing toolの`active-no-job`やunpublished memberがnew Sourceを意味したりcarried existing Sourceを隠したりしないことを`src/app/components/consent/GlobalSourceControls.vue`で保証する
- [ ] T962 [US4] Fixed-three Global admission、single batch/request、accepted/rejected、`active-no-job`、retryable boundary/fallback、batch failure、pre-commit new/provisional Sourceなし対visible carried Sourcesについて英語messageをそれらを描画するVue componentへ追加する

---

## フェーズ 97: Claude Global Batch Member（Composite Slice 2/4）

このsliceはopenなPhase-96–99 composite milestoneへreal Claude portを追加するが、独立してgreenまたはrelease可能なmilestoneではない。

**目的**: Claude root admission/scanningをsame fixed-three `GlobalBatchScan`内のseparately identified Source candidateとして追加し、one rootを保ち、independent initial/retry jobまたはcommitを作らない。

**独立テスト**: Fixed-three operation内でvalid/invalid Claude rootをpartitionし、exact `CLAUDE.md`だけを読み、Claude control/contextをone possible batch memberとして保持する。Admitted sibling Sourceはbatchのone generationですべて同時に現れるか、fileに閉じないfailure後はどれも現れず、exact exclusionとprior Repository/Global stateを維持する。

**目に見えるチェックポイント**: Global controlはone shared operation内のClaude per-tool outcomeを報告し、new/provisional Claude Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### テストを先に

- [ ] T963 [P] [US4] fixed-three operation内のcanonical root、raw-path identity、targetを通して読まれるlink、invalid override、missing/読み取り不能fileのClaude post-consent boundary failing testを追加する: missingまたは読めないClaude rootは、sibling toolのcommitを妨げずにそのtoolをabsentまたはfailedとして記録する。admitされたClaude root内のfile限定failureはpartialなmember resultの中でそのfileのDiagnosticになる。1つのfileに閉じないfailureは無変更で伝播しsubset Source/generationなしでbatch全体を中止する。host consent codeのfilesystem callは0件であることを`tests/unit/host/global-consent.test.ts`で証明する
- [ ] T964 [P] [US4] Claude Global `CLAUDE.md`だけをreadしneighbor operation 0件、distinct Claude control/contextだがindependent jobなし、admitted missing memberのpre-commit new/provisional Source 0件、carried Sources visible、raw-path挙動、one shared batch request/working set、atomic all-member publication、whole-batch fileに閉じないfailure abort、Repository/prior Source retentionを検証する。さらに、全proposed-root operationがsingle inspection moduleだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で検証する
- [ ] T965 [US4] 参照だけの Claude User 振る舞いセット、`claude.global.instructions`、正確な `claude.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に具体化する
- [ ] T966 [US4] 有効化前にすべての Claude User 振る舞いがすでに所有されていたこと、`claude.global.instructions` が読み取りを新たに許可する唯一の Claude ルールであること、`claude.excluded.user-runtime` が新たに所有される唯一の Claude 除外であることを証明する、失敗する Claude Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts` に追加する
- [ ] T967 [US4] Fixed-three controls内のClaude confirmed/pending/retryable outcome、shared batch request/progress、deterministic per-tool Diagnostic、ordinaryなwhole-batch failure error、pre-commit new/provisional Claude Source/file row 0件対visible carried Sources、atomic sibling publication、Repository retentionのbrowser acceptanceを`tests/e2e/global-claude-admission.spec.ts`へ追加する

### 実装

- [ ] T968 [US4] Claude root-admission orchestrationをone fixed-three memberとして実装する。Frozen rootとcompiled planをinspection moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはone `GlobalBatchScan`へ供給するatomic decisionでだけClaude controlへtransferする処理を`src/server/host/global-consent.ts`へ実装する
- [ ] T969 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `claude.behavior.user.instructions`、`claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` を、Global ルール/除外への相互参照で `src/shared/registries/vendor-behaviors.ts` において更新する
- [ ] T970 [US4] 同意でゲートされた読み取り許可ルールとして `claude.global.instructions` だけを追加し、正確に非読み取りの `claude.excluded.user-runtime` レコードを `src/shared/registries/inspection-rules.ts` で所有する
- [ ] T971 [US4] 新しい戦略 ID を作成せず、既存の Claude 命令戦略を Global 選択、適用可能性、ソース分離の入力によって `src/shared/registries/runtime-composition.ts` で拡張する
- [ ] T972 [US4] ソース ID を作成せず、Claude Global のカバレッジについて既存の公式ソースのバックリンクを 対象registry recordの`evidence` citation で更新する
- [ ] T973 [US4] 同意済み境界の配下で Claude `CLAUDE.md` だけを処理し、正確な `claude.excluded.user-runtime` の強制を `src/server/inspection/rules/claude.ts` に実装する
- [ ] T974 [US4] 単一`GlobalBatchScan`の1 memberとしてのClaude scanningを実装する: 正確に1 root、raw-path semantics、決定論的member Diagnostics、missingまたは読めないrootはsiblingを適格のままmemberをabsent/failedとして記録し、file限定outcomeはpartialなmember resultにそのfileのDiagnosticとして寄与し、admitされた全memberのcommittable resultが1つのgenerationで一緒に公開されるまで新規/暫定member-Source公開は0件でcarried既存Sourceは可視のまま。1つのfileに閉じないmember failureは無変更で伝播させてbatch全体を中止することを`src/server/inspection/scan.ts`で実装する
- [ ] T975 [US4] Claude control/context outcomeとretry stateをindependent jobではなくone serialized fixed-three admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有しone atomic commitまでprior stateを保持する。Fileに閉じないfailureはshared IDのone retained ordinary terminal errorとし、new item/Source/result/generationまたはinitial/retry stale overlayを0件とし、late workを`src/server/session/session.ts`でdiscardする
- [ ] T976 [US4] Claude Global admission、exact exclusion、shared-batch progress、deterministic rejection/retry、whole-batch failure、pre-commit new/provisional Sourceなし対visible carried Sourcesについて英語messageをそれらを描画するVue componentへ追加する

---

## フェーズ 98: Copilot Global Batch Member（Composite Slice 3/4）

このsliceは同じopen composite milestoneへreal Copilot portを追加するが、独立してgreenまたはrelease可能ではない。

**目的**: Copilot root admissionとtwo exact instruction selectorをsame fixed-three `GlobalBatchScan`内のseparately identified Source candidateとして追加し、exact Copilot/shared exclusionを所有する。

**独立テスト**: Fixed-three operation内でvalid/invalid `COPILOT_HOME`をpartitionし、two exact selectorだけを読み、behavior partitionをmappingする。Admitted sibling Sourceはone batch generationですべて同時に現れるか、fileに閉じないfailure後はどれも現れず、independent Copilot job/commitを作らない。

**目に見えるチェックポイント**: Global controlはshared operation内のCopilot per-tool outcomeを報告し、new/provisional Copilot Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### テストを先に

- [ ] T977 [P] [US4] fixed-three operation内のabsent/default対invalid override、canonical root、raw-path identity、targetを通して読まれるlink、missing/読み取り不能fileのCopilot post-consent boundary failing testを追加する: missingまたは読めないCopilot rootは、sibling toolのcommitを妨げずにそのtoolをabsentまたはfailedとして記録する。admitされたCopilot root内のfile限定failureはpartialなmember resultの中でそのfileのDiagnosticになる。1つのfileに閉じないfailureは無変更で伝播しsubset Source/generationなしでbatch全体を中止する。host consent codeのfilesystem callは0件であることを`tests/unit/host/global-consent.test.ts`で証明する
- [ ] T978 [P] [US4] 2つのexact Copilot Global instruction set、隣接する全User/runtime/managed-remote surfaceへのoperationが0件、distinct Copilot control/contextだがindependent jobなし、admitted missing-Source memberのnew/provisional pre-commit Sourceが0件でcarried existing Sourcesはvisible、exact raw-path挙動、one shared batch request/working set、atomic all-member publication、whole-batch fileに閉じないfailure abort、Repository/prior-Source preservationに関するboundary testを`tests/integration/global-boundaries.test.ts`に追加する。さらに、全proposed-root operationがsingle inspection moduleだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentする
- [ ] T979 [US4] 参照だけの Copilot 振る舞いの分割を具体化する。すなわち、`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞いは `copilot.excluded.user-runtime` だけ、契約で定められた Claude/Codex User と 5 個の Cloud 振る舞いだけは `shared.excluded.managed-remote-state` に対応させ、composition とエビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` に追加する
- [ ] T980 [US4] 受け入れた 3 つの振る舞いから Global ルールへの正確なバックリンク、残りの 16 個から `copilot.excluded.user-runtime` への正確なバックリンク、契約対象だけの共有 managed 影響セット、分割をまたぐバックリンクがないこと、新たに読み取りを許可するのが `copilot.global.instructions.root` と `copilot.global.instructions.path` だけであること、新たに所有されるベンダー除外が 1 つ、共有除外が 1 つであることを証明する、失敗する Copilot Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts` に追加する
- [ ] T981 [US4] Fixed-three control内のCopilot confirmed/pending/retryable outcome、shared batch request/progress、deterministic invalid-override Diagnostic、ordinaryなwhole-batch failure error、new/provisional pre-commit Copilot Source/file rowが0件でcarried existing Sourcesはvisible、atomic sibling publication、retained Repository resultに関するbrowser acceptanceを`tests/e2e/global-copilot-admission.spec.ts`に追加する

### 実装

- [ ] T982 [US4] Copilot root-admission orchestrationをfixed-threeのone memberとして実装する。Absent/defaultとinvalid previewを区別し、frozen rootとcompiled planをinspection moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはone `GlobalBatchScan`へ供給するatomic decisionでだけCopilot controlへtransferする処理を`src/server/host/global-consent.ts`へ実装する
- [ ] T983 [US4] すでに所有されている振る舞いを、互いに素な 3 つの相互バックリンクセットで更新する。`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞い（`copilot.behavior.vscode.user.claude`、`copilot.behavior.vscode.user.skills`、`copilot.behavior.vscode.user.agents`、`copilot.behavior.vscode.user.prompts`、`copilot.behavior.vscode.user.hooks`、`copilot.behavior.vscode.user.mcp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.skills`、`copilot.behavior.cli.user.agents`、`copilot.behavior.cli.user.hooks`、`copilot.behavior.cli.user.mcp`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.plugins`、`copilot.behavior.cli.user.lsp`、`copilot.behavior.cli.user.extensions`）は `copilot.excluded.user-runtime` だけ、契約で定められた共有 managed セット（`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.settings`、`codex.behavior.user.config`、`codex.behavior.user.plugins`、`copilot.behavior.cloud.mcp`、`copilot.behavior.cloud.organization-agents`、`copilot.behavior.cloud.organization-instructions`、`copilot.behavior.cloud.plugins`、`copilot.behavior.cloud.remote-skills`）は `shared.excluded.managed-remote-state` だけに対応させ、振る舞い ID を追加または再定義せずに `src/shared/registries/vendor-behaviors.ts` で更新する
- [ ] T984 [US4] 正確な 3 つの受け入れ済み振る舞い参照を持つ `copilot.global.instructions.root` と `copilot.global.instructions.path` だけを追加し、残りの 16 個の User 振る舞い参照だけを持つ正確な `copilot.excluded.user-runtime` を所有し、契約で定められた Claude/Codex User と 5 個の Cloud 参照だけを持つ 1 つの共有非読み取り `shared.excluded.managed-remote-state` を `src/shared/registries/inspection-rules.ts` に追加する
- [ ] T985 [US4] 新しい戦略 ID を作成せず、既存の Copilot CLI/VS Code 命令戦略を Global の適用可能性とソース分離によって `src/shared/registries/runtime-composition.ts` で拡張する
- [ ] T986 [US4] ソース ID を作成せず、正確な受け入れ済み 3 件の Global ルール、残り 16 件の User-runtime、契約で定められた shared-managed の各分割について、既存の公式ソースバックリンクを 対象registry recordの`evidence` citation で更新する
- [ ] T987 [US4] 同意済み境界の配下で Copilot `copilot-instructions.md` と `instructions/**/*.instructions.md` だけを処理し、正確な `copilot.excluded.user-runtime` と `shared.excluded.managed-remote-state` の強制を `src/server/inspection/rules/copilot.ts` に実装する
- [ ] T988 [US4] 単一`GlobalBatchScan`の1 memberとしてのCopilot scanningを実装する: instruction-subtree-only traversal、正確に1 root、raw-path semantics、決定論的member Diagnostics、missingまたは読めないrootはsiblingを適格のままmemberをabsent/failedとして記録し、file限定outcomeはpartialなmember resultにそのfileのDiagnosticとして寄与し、admitされた全memberのcommittable resultが1つのgenerationで一緒に公開されるまで新規/暫定member-Source公開は0件でcarried既存Sourceは可視のまま。1つのfileに閉じないmember failureは無変更で伝播させてbatch全体を中止することを`src/server/inspection/scan.ts`で実装する
- [ ] T989 [US4] Copilot control/context outcomeとretry stateをindependent jobではなく、one serialized fixed-three admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有し、one atomic commitまでprior stateを保持し、fileに閉じないfailureではshared IDにone retained ordinary terminal errorだけを保持してnew item/Source/result/generationおよびinitial/retry stale overlayを作らず、その後late workをdiscardする処理を`src/server/session/session.ts`へ実装する
- [ ] T990 [US4] 英語のCopilot Global override、admission、exact exclusion、shared-batch progress、deterministic rejection/retry、whole-batch failure messageをそれらを描画するVue componentに追加し、new/provisional pre-commit Sourceがないことと、visibleなままのcarried existing Sourcesを明確に区別する

---

## フェーズ 99: Atomic Global Batch Result統合（Composite Closure 4/4）

**目的**: 3つのreal member-admission portをすべてbindし、one initial/retry `GlobalBatchScan` commitだけで0〜3個のseparately identified one-tool/one-root Global Sourceを統合してroot mergeまたはper-tool commitを公開せず、Phase-96–99 composite milestoneをcloseする。

**独立テスト**: Fixed tupleから0〜3 rootを決定的にadmitし、empty subsetはnew job/generationなしでcarried stateを保持し、nonempty subsetはone request/working set/resultとone Global generationですべてのseparate Sourceを同時publishする。Stable Source ID、Repository generation/ID/viewに触れずGlobal sequenceに限定されたrekey、56-rule total、partition、fileに閉じないfailureによるwhole-batch abort、detail/comparison、exclusion、non-pending unpublished admittedとsame-preview rejectedからなるexact `retryableTools` controlを検証する。

**目に見えるチェックポイント**: Admitted Codex/Claude/Copilot Global Sourceはone batch commit後にseparateかつsimultaneousに現れ、その後Sourceごとにfilter、inspect、compare、explicit rescanできる。

### テストを先に

- [ ] T991 [P] [US4] Exact three vendor instruction setとone fixed-three transactionに関するintegrated boundary testを`tests/integration/global-boundaries.test.ts`へ追加する。Admitted root 0件ならnew `scanRequestId`/job/Source/generationを割り当てず、全carried Source/controlとprior snapshotを保持する。1〜3件ならtoolごとに別々に識別されるone-tool/one-root Sourceをone shared request IDかつexactly one completeまたはpartial generationで同時にpublishし、missingまたは読めないmember rootをabsent/failedとして記録し、admitted root内のfileに閉じたoutcomeのfile単位diagnosticだけをそのpartial generationへ寄与可能とし、observableなper-tool commitを一切行わない。各escaped boundaryを保持したraw contextからone-wayで導出し、raw filesystem operand、各Source内でraw-path semanticsとdistinct provenanceを保持し、preview/display labelをauthorityへreverseせず、excluded-surface readを0件とし、全fileに閉じないfailureでsubset全体をabortし、Repository/prior Sourcesを保持する
- [ ] T992 [US4] 正確に56個のrule ID（Global前の48-ID gateに3 vendor `*.excluded.user-runtime` record、`shared.excluded.managed-remote-state`、4 Global static read-authorizing ruleを加えたもの）、exact exclusion ownership、reciprocity、内包Hook/MCP candidate addition 0件、existing-source evidence backlinkを証明するfinal Global registry contractを`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`へ追加する
- [ ] T993 [P] [US4] 全admitted tool-specific Sourceのone atomic batch publication、one shared request ID/authority/working set/resultとexactly one Global generation、stable `Source.sourceId`、one-root/tool invariant、保持raw contextからのone-way boundary、Global generation-owned ID rekeyとuntouched Repository stateを伴うcarried-Source semantic preservation、fileに閉じたfile単位diagnosticによるdeterministic partial member outcomeとmissingまたは読めないmember rootのabsent/failed記録、per-tool commitなし、one ordinary terminal errorかつsubset/stale overlayなしのwhole-batch fileに閉じないfailure、exact `retryableTools` projectionとoperation-local validation対accepted pending-state lifecycle、progress、conflictに関するcoordinator testを`tests/unit/session/coordinator.test.ts`に追加する
- [ ] T994 [P] [US4] One successful initial/retry batchがindependentなGlobal sequenceのexactly one generationをcommitし、全admitted Sourcesを同時にpublishし、process-lifetime Source IDとcarried Global semantic inventory/authored contentを保持し、全Global generation-owned file/recognition/provenance/relationship/Diagnostic IDをrekeyし、stale Global FileDetail/comparison/Monaco stateをinvalidateしてRepository generation/ID/viewを不変に保ち、provisional context/pending admissionを漏らさないことを証明するlifecycle testを`tests/integration/session-lifecycle.test.ts`に追加する。どのpollもintermediate per-tool commitを観測できないことも証明する
- [ ] T995 [P] [US4] Globalのliteral credential、environment reference、process sentinel、executable-looking inert payload、binaryと`utf-8-replaced` file、注入throw/rejection、mutation observationに関するfailing exact-display API/integration testを`tests/contract/http-api-files.test.ts`と`tests/integration/global-literal-display.test.ts`へ追加する。Readable textはsubstitutionなしにexactで、binaryはdiagnostic-onlyであり、全fileに閉じないfailureはdomain classification/retry/resultなしに伝播してwhole shared batchをabortし、subset/generationをcommitせず、initial/retry stale overlayのない失敗したrequestのordinaryなpre-またはaccepted-job errorとしてのみ報告され、prior stateとfilesystem observationを保持することを証明する
- [ ] T996 [P] [US4] 記録済みlocal Global fixture rootとinstrument済みproduct socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceを使うfailing zero-activation security testを追加する。Exactな2つのFR-022 authorized internal loopback classを別々に分類・検証し、それ以外の全surfaceについてdynamic evaluation、command/hook execution、browser-helper launch、禁止対象のdirect product-issued outbound/MCP request、environment substitution、mutation-capable filesystem callが0件であることを証明する。Source Condition Factがlocal/hosted I/O、file/relationship/comparison identityを作らないことを`tests/security/global-zero-activation.test.ts`と`tests/integration/source-condition-facts.test.ts`で証明する
- [ ] T997 [US4] Selector-free fixed-three enablement、`active-no-job`、one shared batch requestに関するbrowser acceptanceを`tests/e2e/global-enable.spec.ts`へ追加する。別々に識別されるadmitted Sourcesがone generation後に同時に現れ、escaped inert boundaryがpreviewおよびSource-relative pathと区別され、filter、Diagnostic、replacement characterを含むexact readable literal、diagnostic-only binary、activation/substitution/analysis/verdictなし、Fact isolation、detail reuse、cross-Source comparisonを扱うことを検証する。予期しないbatch failureではone ordinaryなbatch failure errorだけを表示し、subset/generationまたは`StaleSourceFailure`をpublishせず、prior Repository/Global stateとstable Source IDを保持する

### 実装

- [ ] T998 [US4] Real T951/T968/T982 Codex/Claude/Copilot portを3つのone-root `GlobalToolControl` recordとoperation-local contextとしてbindしてfixed-three post-consent admissionを完成させる。全toolのinitial evaluation、non-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するserver-derived exact `retryableTools` retry、deterministic rejected partition、および全admitted context/IDのexactly one `GlobalBatchScan`へのone atomic transferを`src/server/host/global-consent.ts`へ実装する。残存するinjected test outcomeまたはunbound production portを禁止し、independent per-tool jobまたはnew/provisional pre-commit Sourceを作らず、carried existing Sourcesをvisibleに保ち、transfer前の全fileに閉じないfailureを伝播する
- [ ] T999 [US4] すべてのGlobal behavior、正確に4 Global static candidate rule、既存のexact exclusion、strategy reference、48 source backlink、正確な56-rule totalを`src/shared/registries/vendor-behaviors.ts`、`src/shared/registries/inspection-rules.ts`、`src/shared/registries/runtime-composition.ts`、対象registry recordの`evidence` citationで完成させる
- [ ] T1000 [US4] 全admitted tool/root memberをone request/publication authority/working setでconsumeするone integrated `GlobalBatchScan`を`src/server/inspection/scan.ts`へ実装する。各memberのselector/root/Source identityをisolateし、exact Codex fallbackとraw-path ruleを適用し、fileに閉じたfile単位diagnosticからdeterministic completeまたはpartial member resultをassembleし、missingまたは読めないmember rootはabsent/failedとして記録する。Coordinatorがwhole batchをacceptするまでnew/provisional member result/Sourceをpublishせず、carried existing Sourcesをvisibleに保つ。Fileに閉じないmember failureは変更なく伝播させ全siblingをabandonする
- [ ] T1001 [US4] Single batchがcomplete traversal後にcommittableなcompleteまたはpartial resultを持つ場合だけ、全admitted tool-specific Global Sourceを同時にatomic publishする処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する。そのpartial publicationではfileに閉じたfile単位diagnosticを許容し、missingまたは読めないmember rootはcommitせずabsent/failedとして記録する。各boundaryをadmitted raw contextからone-wayで構築し、internal authorityをDTO/log外に保ち、prior Global semantic contentと全Global Source IDを保持し、independentなGlobal sequenceのexactly one generationをcommitし、そのsequenceのgeneration-owned IDだけをrekeyし、Global detail/comparison/editor stateだけをinvalidateしてRepository generation/ID/viewを不変に保ち、participating deterministic failureだけをclearする。Zero-admitted operationはnew `scanRequestId`/job/Source/generationを割り当てず全carried Source/controlとprior snapshotを保持し、fileに閉じないfailureまたは他のnoncommittable batch outcomeはsubset/generationをcommitせずprior graph/retry controlを保持し、initial/retryで`StaleSourceFailure`を作らない同じ変更で`SourceDto`をdiscriminated unionにする。現在`kind`と`tool`は独立したfieldであり、toolを持つRepository Sourceも、toolを持たないGlobal Sourceも型検査を通る。2つ目のSource kindが構築可能になるのはこのtaskであり、成立しない組み合わせを型が許さなくなるべき地点もここである。
- [ ] T1002 [US4] Global-enable function responseをexact fixed-three accepted/rejected partition、nonempty batchのone shared request IDと`queued`、empty subsetのnullと`active-no-job`、conflict、retry state、ordinaryなpre-/post-acceptance failure errorについて完成させる。全admitted-member Source publicationをone atomic batch commit後のlater session pollへ委ね、carried existing Sourcesを保持する処理を`src/server/host/devframe-app.ts`に実装する
- [ ] T1003 [US4] Repositoryと別々に識別されるCodex/Claude/Copilot Global Sourceおよびtool filter、enabled Sourceごとのescape済みでinertな`SourceBoundary.displayRoot`/`origin`をconsent-preview displayとSource-relative item pathから区別してrenderしlocatorにしないone-root summary、共通のdetail navigation、Global commit後のcross-Source対応comparison navigationを`src/app/composables/filters.ts`、`src/app/session/view-state.ts`、`src/app/pages/index.vue`に実装する
- [ ] T1004 [US4] One shared batch request/progressに結び付くfixed-three confirmationとper-tool outcome/retry control、focus recovery、`active-no-job`、ordinaryなwhole-batch failure error、simultaneous separate-Source outcome presentationを`src/app/pages/global-consent.vue`と`src/app/components/consent/GlobalSourceControls.vue`で完成させ、自動更新statusにはT071のpause/resumeとon-demand-refresh contractを再利用する
- [ ] T1005 [US4] 英語のfixed-three/single-batch、one-root separate Source、accepted/rejected、`active-no-job`、whole-batch failure、carried existing Sourcesをvisibleに保つretry、source/tool-filter、detail/comparison、shared-progress messageをそれらを描画するVue componentに追加する

---

## フェーズ 100: Global の再スキャンと回復

**目的**: 明示的な Global 再スキャン、FIFO 直列化、atomic carried-Source generation construction、致命的な試行後の回復を追加する。

**独立テスト**: Repository と Global の作業をキューに入れ、partialおよび致命的な Global の試行を開始し、デキュー時の世代、プロセスの存続期間中に安定する Repository と Global の `Source.sourceId` 値、commit する Global sequence の世代所有グラフ ID だけの再キー化、environment-owned capacity 下の atomic publication、重複競合、保持された同意/境界/以前のグラフ、明示的な再試行の成功を検証する。

**目に見えるチェックポイント**: ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。

### テストを先に

- [ ] T1006 [US4] Serialized cross-source FIFO、dequeue-time generation、admission/progress/final status/commitにわたるone `scanRequestId`、duplicate conflict、fatal retention、per-job counterのfailing coordinator testを追加する。全fileに閉じないfailureはdomain catch/cause classificationなしに変更なく伝播し、item/recognition/derived result/Diagnostic/result body/generationを作らずabortし、prior snapshotを保持し、accepted explicit rescanはsame request IDのretained ordinary errorだけでterminalになることを`tests/unit/session/coordinator.test.ts`で証明する
- [ ] T1007 [US4] carried-Source graph構築、lifecycle/control state、serializeされたstate遷移、in-flight filesystem workのcleanupのcoordinator testを拡張する。disable/shutdown/supersession後のpublication-authority revocation (pending filesystem workはcleanup-only扱い)、late discard、以後のsource I/Oなし、応答性のあるAPI、hard-cancellation assertionなしも`tests/unit/session/coordinator.test.ts`でカバーする
- [ ] T1008 [P] [US4] Strict `sourceId`、`ScanAdmission { scanRequestId, source }`、same-ID waiting/active/final status/successful generation、one identified Global Source、unknown/removed Source、disable-pending/duplicate conflict、older stateをcompletionとしてrejectするGlobal-rescan function failing contract（session API契約、contracts/http-api.md）を追加する。Pre-acceptanceのfileに閉じないfailureはrequestの実際のerrorで失敗しjobを作らず、accepted rescanのfileに閉じないfailureは同じrequest IDのretained errorだけを公開しattempt result/generationを作らず、stale prior snapshotとSource stale referenceを持つこと、retry/stale IDを`tests/contract/http-api-global.test.ts`で扱う
- [ ] T1009 [P] [US4] 有効化の完了、キューに入った Repository/Global スキャン、partial publication、致命的な失敗時の保持、明示的な再試行、変更されない同意/境界について、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1010 [P] [US4] 全admitted Sourceを同時にpublishしてGlobal sequenceをexactly onceだけ進めるsuccessful initial/retry batchと、対象Sourceだけをreplaceし他をすべてcarryする後続のsuccessful explicit single-Source Global rescanを区別するlifecycle testを`tests/integration/session-lifecycle.test.ts`へ追加する。どちらも全Global Source IDとcarried semantic inventory/authored contentを保持し、Global sequenceのgeneration-owned graph IDだけをrekeyしてold Global FileDetail/comparison/Monaco stateをinvalidateし、Repository generation/ID/viewは不変に保つ。Explicit rescanだけが対象Sourceのstale referenceをclearし、all-rejected enable/retryはgenerationもID changeもcommitしないことを証明する
- [ ] T1011 [US4] Global 再スキャン、待機中/アクティブの進捗、重複防止、partial diagnostic、致命的な失敗の再試行、以前の結果の保持について、ブラウザ受け入れテストを `tests/e2e/global-rescan.spec.ts` に追加する

### 実装

- [ ] T1012 [US4] 識別済みのtool-specific Global Source 1つに対するFIFO rescanを実装する。CompleteまたはpartialのGlobal sequenceだけのcommitでは、すべてのGlobal Source IDを保持し、carried/replaced Global generation-owned graph IDを再生成し、rescanned Sourceのstale failureだけをclearし、sibling failureを保持して、古いGlobal FileDetail/comparison stateを無効化し、Repository stateには触れない。対象は`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`とする
- [ ] T1013 [US4] Environment-owned capacityによるserialized carried-source generation constructionとper-job counterを実装する。fileに閉じたfailureはFR-028に基づきfile単位Diagnosticへ変換し、それ以外のfailureはsession/scan domain codeでcause classification、retry、item/recognition/derived result/body/generation化せず変更なしに伝播させてprior snapshotを保持し、lifecycle変換はtrigger-owning boundaryに委ねる。Disable/shutdown/supersessionではpublication authorityをrevokeしlate workを1回discard/releaseする処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する
- [ ] T1014 [US4] One opaque `sourceId`のstrictなGlobal-rescan session-API functionを実装し、request IDをadmission/progress/status/commitで保持し、disable/duplicate conflictをenforceし、fileに閉じないfailureは通常どおり報告する: accept前はrequestの実際のerrorで失敗しjobを作らず、accept後は`failScan(scanRequestId, message)`によるsame-ID retained errorとしattempt result/generationなし/stale prior snapshotとする。Retry/stale Source responseを`src/server/host/devframe-app.ts`で保証する
- [ ] T1015 [US4] Global 再スキャンのロード、重複抑止、古い状態からの回復、致命的な失敗の再試行、進捗更新を `src/app/components/consent/GlobalSourceControls.vue` と `src/app/session/view-state.ts` に実装する
- [ ] T1016 [US4] 英語の Global 再スキャン、キュー、publicな`partial`（partialのみ）、失敗時の保持、再試行メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 101: Global 無効化バリアと解体

**目的**: Recover可能なpriority zero-I/O disable barrier、full client-data purge/fence、および正確な`remove-active-state`とoperation-local `cleanup-only` outcomeを追加する。

**独立テスト**: Disable request前にbrowserをpurgeし、Repository/enable/Global work中にdisableしてfailure後にrepeat/join/retryする。Epoch/fence response gate、control-only recovery、失敗したrequestのerrorとclose未確認時のrestart、confirmed cleanup、Global generation sequence全体をdiscardしてRepository sequenceとそのIDに触れない`remove-active-state`、committed stateを変更せず未公開initial enableだけに許される`cleanup-only`、accept前failure/true no-op後のimmediate fresh-snapshot recoveryを検証する。

**目に見えるチェックポイント**: Disableはbrowserの全inspection contentを即時削除し、fence中はrecovery controlだけを表示し、confirmed terminal success後にfresh Repository-only snapshotを復元する。

### テストを先に

- [ ] T1017 [US4] First non-no-op disable acceptanceがatomicに`commitKind`を固定・保持し、`globalContentEpoch`をincrementし、non-null `globalDisableInProgress`をinstallし、authorityをrevokeしてdata fenceを有効にするfailing coordinator testを追加する。Public Global consent/control/Sourceがあれば`remove-active-state`でGlobal generation sequence全体とそのSourceをdiscardし、Repository sequenceとそのgeneration/IDには触れない。未公開operation-local initial enableだけなら`cleanup-only`でcommitted stateを変更しない。True no-opには、tool固有Global Source/graph、active consent、retained admitted root context、running/queued Global scan/enable work、retained disable failureがすべて存在しないという完全な条件が必要であり、無関係なRepository workは妨げにならないことを証明する。Join、失敗したrequestのerrorを保持するfailed barrier/retry lineage、exact resource reference、および同じ`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持してexisting commandを`waiting`へ戻し、新しいscan admissionもinterim successも作らない、success後だけのRepository requeue exactly onceを扱い、rollback/rebase禁止を`tests/unit/session/coordinator.test.ts`で証明する
- [ ] T1018 [P] [US4] Strictなargument-free Global-disable function、完全なtrue-no-op条件とmutationlessなsuccess result、captured epochがcurrentのままかつcurrent fenceがnullの場合だけinspection-data successを許可するfinal response gate、fence中session routeのsole `GlobalFenceRecoverySnapshot`、他の全inspection-data/generation mutation routeのfixedな`global-disable-pending` conflict、失敗したrequestのerrorを保持するjoin/retry/failed response、exact terminal buffer—`remove-active-state`後はGlobal sequenceがdiscardされRepository generationが不変のRepository-only snapshot、`cleanup-only`後はunchanged committed state—のfailing contractを`tests/contract/http-api-global.test.ts`と`tests/contract/http-api-session.test.ts`へ追加する。
- [ ] T1019 [P] [US4] Interrupted Repository/enable/Global work、queued cancellation、acceptance対atomic disposition interleaving、joined disable、同じcleanup lineage/epoch/commit kindを使うretained failure/retry、terminal success後に同じID/owner/Source/orderのcommandを新しいadmissionまたはinterim successなしで`waiting`へ正確に1回requeueすること、true no-op、pre-acceptance failureを検証する。Post-acceptance failureでfenceが再開せずstale captured-epoch responseがpublishされないことを`tests/integration/global-concurrency.test.ts`で証明する
- [ ] T1020 [P] [US4] disableがenumeration/readを0件行い、期待cancellation Diagnosticを0件発行し、影響を受けた全in-flight filesystem operationを正確に1回drainまたは破棄し、影響を受けたresourceのclose後にのみ完了することをboundary計測で証明する。cleanupが確認できない場合のfallbackはrestartであり、推測によるclosureはないことを`tests/integration/global-boundaries.test.ts`で証明する
- [ ] T1021 [P] [US4] Browserがdisable送信前とgreater epoch/non-null fence render前にfull purgeし、session/inventory/Source/file/Diagnostic/relationship/authored/detail/comparison/Monaco/filterをすべて削除するlifecycle testを追加する。Fence中は`GlobalFenceRecoverySnapshot`だけ、`remove-active-state`後はGlobal sequenceがdiscardされRepository generation/IDが不変のfresh Repository-only snapshot、`cleanup-only`後はunchanged committed snapshot、accept前failure/no-op後はimmediate full snapshotとする。Late resultなし、confirmed registry cleanupだけのresource releaseを`tests/integration/session-lifecycle.test.ts`で証明する
- [ ] T1022 [US4] Preview/enable/rescan/disable、pre-request purge、epoch/fence observation purge、exact control-only failed/retry/join/restart recovery、purged content非復元、enable/disable interleaving、focus、fresh terminal snapshotのbrowser acceptanceとGlobal-consent targetを追加する。Global sequenceをdiscardするpublic-state `remove-active-state`、committed stateを変更しないunpublished-initial-enable `cleanup-only`、accept前/no-op immediate recoveryを`tests/e2e/global-disable.spec.ts`と`tests/e2e/global-consent.spec.ts`で扱う

### 実装

- [ ] T1023 [US4] Serialized priority zero-I/O barrierを実装する。First non-no-op acceptanceで`remove-active-state`/`cleanup-only`を固定し、command/content epochをincrement、fence install、authority revoke、Global work cancelを行い、running Repository workをterminal success後だけ正確に1回requeueするため保持する。そのexisting commandのexactな`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持して`waiting`へ戻し、新しいscan admissionまたはinterim successを作らず、exact operation/error/cleanup lineageをfailure/join/retryで維持する。Coordinator ownership下で、tool固有Global Source/graph、active consent、retained admitted root context、running/queued Global scan/enable work、retained disable failureがすべて存在しないという完全なtrue-no-op条件を評価し、無関係なRepository workは許容する。True no-op/accept前failureはI/Oもjob作成も行わずgeneration、epoch、fenceを変更せず、accept後failureは全dataをfenceしたままにする処理を`src/server/session/session.ts`へ実装する
- [ ] T1024 [US4] 影響を受けたin-flight filesystem workをresourceごとに1回のclose attemptでdrainまたは破棄するdisable cleanupを実装する。double closeもhard-cancellation主張もなし。cleanupが確認できないときはfenceを維持しrestartをfallbackとして提示する。1回のatomic terminal commitで、`remove-active-state`ではGlobal generation sequence全体とそのSourceをatomicにdiscardしてRepository sequenceとそのgeneration/IDに触れず、`cleanup-only`では未公開のoperation-local stateだけを除去してcommitted stateを変更せず、その後fenceをclearすることを`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`で実装する
- [ ] T1025 [US4] Strictなargument-free Global-disable functionをrequest-owning boundaryへ実装し、完全なtrue-no-op条件だけにmutationlessなsuccessを返す。Accept前response、first acceptance/join/retry progress、drain/close failure時にprocess/fenceを維持したまま失敗したrequestの実際のerrorを報告すること、unconfirmed cleanupのrestart guidance、exact terminal commit-kind responseを`src/server/host/devframe-app.ts`で保証する
- [ ] T1026 [US4] Pre-request full client-data purge、disable submit/loading、fenced `GlobalFenceRecoverySnapshot` render、failed retry/join/restart control、no-op/accept前failureのimmediate full refetch、terminal fresh-snapshot adoption、focus restorationを`src/app/pages/global-consent.vue`、`src/app/components/consent/GlobalSourceControls.vue`、`src/app/session/view-state.ts`へ実装する
- [ ] T1027 [US4] Shared full-purge/response gateを実装する。Disable前またはgreater epoch/non-null fence観測時に全session/Global/Repository DTO/rendered/derived stateをclearし、stale/late responseを拒否する。Fence中はexact control/error recovery stateだけを保持し、fence clear後はpurged contentを再構築せずauthoritative full snapshotをfetchする処理を`src/app/composables/filters.ts`、`src/app/session/view-state.ts`、`src/app/composables/comparison.ts`、`src/app/composables/monaco.ts`へ実装するフェーズ3が意図的に先送りした2つのclient surfaceをここで戻す。それらを必要とするfenceがこのフェーズにしか存在しないためである: disableを実行したpageがbarrier acceptanceからterminal successまで表示するcontrol-onlyなrecovery view、およびfenceがnullのときだけ許可される明示的なResume inspection actionである。フェーズ3は2026-07-24にliveness probeとともに両者を削除した——到達できるtriggerが無いUIを出荷しないためである（T049）。`src/app/session/view-state.ts`の`SessionView`をフェーズ3の`booting | inspection | ended`から拡張し、同じくemitterが無いとして削除した`global-disable-request` pre-send reasonを`src/app/session/client-data.ts`の`PurgeReason`へ戻す。eslint/config-inspectorが`invalidate`をpushするのと同じ形でfenceをdevframe channel越しにpushし、他タブがpollingなしにdisableを観測できるようにすることを検討する。ただしauthorityはあくまでserverであり、pushはrefetchのtriggerであってstateとして採用するものではない。
- [ ] T1028 [US4] Pre-request purge、epoch/fence control-only recovery、failed retry/join/restart、true no-op/accept前failure refetch、Global sequenceをdiscardする`remove-active-state`のRepository-only state、operation-local `cleanup-only`のunchanged committed stateについて英語messageをそれらを描画するVue componentへ追加する

---

## フェーズ 102: ドキュメント、エビデンス、依存関係のレビュー

**目的**: 二言語の運用ガイダンス、公式ソースのエビデンス、適合データ、レビュー済みの依存関係判断を完成させる。

**独立テスト**: environment-owned capacity の explicit opt-in official-source workflowを実行し、すべての drift/dependency 判断をレビューし、同期された英語/日本語ガイダンスと適合レコードを検証する。

**目に見えるチェックポイント**: メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。

### ドキュメント

- [ ] T1029 意味的に等価な運用ガイダンスを`./README.md`/`./README.ja.md`に起草する。対象: 検証済みlaunchと正確な`--root`、generation 0、Node/build/browser baseline、allowlist、raw-path identity、symbolic linkをtarget越しに読みcycle-safeなreal-path追跡を行う通常traversalとfile単位の`file-unreadable`/`file-content-binary`/`recognition-parse-failed` diagnosticおよびsource-scoped `root-unreadable` failure、boundaryとrecord別evidence assessment、FR-022の禁止されたdirect product発outbound-request定義とその2つの正確なauthorized internal loopback class—packaged UI assetへのstatic/SPA requestとlocal session API channel—とlocal-fixtureでの禁止request 0件assertion、読み取り可能なreplacement-decoded textとbinary、注意書きなしの直接表示とloopback-onlyで認証なしのsession APIおよびその文書化された残存limitation—他のlocal processと、DNS rebinding経由の悪意あるweb pageは、inspectorの実行中にsessionへ到達できる—、semantic verdict/capacity上限なし、階層化されたfailure処理 (file限定failureにはfile単位diagnostic、それ以外は通常どおりのerror報告と失敗した明示rescanでのstale prior snapshot保持、startupはtop-level rejection)、fixed-three Global consent/rescan、FR-042のdisable pre-purge、epoch/fence、正確なrecovery DTO、post-acceptance failure/retry/join/restart、Global sequenceをdiscardするpublic-state removal対committed stateを変更しないunpublished-operation cleanup。evidence manifest、SC-002、mutation/atime、privacy/除外/保守、bilingualな55行WCAG契約もカバーし、`tests/contract/documentation.test.ts`が乖離を拒否することを要求する。
- [ ] T1030 SC-001/SC-006 study-evidence harnessを4つのordered acceptance blockで実装する。(1) Paired inputs and normative contract: `tests/usability/sc001-sc006-study-kit.md`と`tests/usability/sc001-sc006-study-kit.ja.md`、`tests/usability/sc001-sc006-study-inputs/`配下のexact existing sixteen-member bilingual bundle、`tests/usability/sc001-sc006-study-inputs.json`、`tests/usability/sc001-sc006-study-inputs.sha256`をsemantically equivalentかつcandidate-independentに保ち、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`と`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`をexact protocol ownerとし、そのentityを`specs/001-inspect-agent-customizations/data-model.md`および`specs/001-inspect-agent-customizations/data-model.ja.md`と整合させる。`StudyBrowserAttemptBinding`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`subjectId`,`inspectorProcessId`,`state`）、`StudyBrowserRequestCandidate`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）、`StudyServerCorrelationClaim`（`schemaVersion`,`studyRunId`,`correlationId`,`subjectId`,`inspectorProcessId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）のexact root orderを維持する。Raw-value banをcapture/evidence IPC crossingまたはretained/log/output/digest boundaryにscopeし、Basic credential、exact Fetch Metadata/Origin/Referer header、raw `X-Inspector-Study-Correlation`のrequired ephemeral loopback-wire receipt/processingだけを許可して直ちにdiscardする。Strictly decoded canonical 43-character safe IDだけがsafe IPCをcrossし、`correlationId`としてretainされ、canonical safe-payload/downstream evidence-digest chainへ入れる。`pnpm run study:evidence:inputs -- materialize`はsupervisorだけをlaunchする。そのexisting supervisor上の`study:evidence:capture -- start`がlong-lived internal descendant/process exact 8件をlaunchしてstream 3件をopenする。Start時にsupervisorだけがfresh subject token exact 20件をordered setとして生成・所有し、次の各`StudyBrowserAttemptBinding`へnext tokenだけをdistributeし、study-harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootを`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`の順で定義する。Authenticated supervisor `ready`のchild-to-parent sequence `0`後、materializerはparent-to-child sequence `0`でexact-once `runtime-bootstrap`を送る。Supervisorはlexical/canonical/identity root tupleをvalidateしてexact endpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Materializerはtransfer/frame copyを直ちにwipeし、successful role-specific lifecycle closeではedgeだけをdetachしてsupervisorをliveに保ち、validation/bind/ACK failureはabortする。Environmentとargvをauthorityにしない。Raw path、endpoint、token、exact `StudySupervisorRuntimeBootstrap` frame/HMAC processingだけをruntime-bootstrap sensitive privacy exceptionとし、capture/evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootを`schemaVersion`,`studyRunId`,`browserProxyAuthority`の順で定義する。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Supervisor/brokerがfresh `StudyBrowserAttemptBinding`を生成し、stateを`prepared | open | terminalizing | closed`とする。Distinct fresh 32-byte/43-character `browserProxyMarkerSecret`とexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`を生成し、stateを`prepared | active | destroyed`とする。`attempt-binding`はstudy-harness/study-browser-adapterだけへ、authenticated `proxy-marker-install`はsupervisorからstudy-browser-adapterへdirectに送る。`browserAttemptId`をこれらのruntime memory、authenticated frame、browser candidateだけに保ち、browser process/context/profile/configuration/credential/request/application/evidenceへ入れない。Installはpreparedにとどめる。Prepared-binding both ACK後かつparticipant `npx`前にadapterだけがcertified isolated profileをlaunchし、`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でexact bootstrapを完了する。Bodyless `407 Proxy Authentication Required`のonly headerは順に`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、canonical Basic retryはexact 1件、bodyless `204 No Content`のonly headerは`Connection: close`とし、DNS/application/forwarding/candidate/correlation/evidence effectを0件にする。Authenticated bootstrap ACKはmarker copyだけをatomically activeへmoveし、attempt bindingはlater product readiness/open-snapshot dual ACKまでpreparedに保つ。Healthy external browser/environment/bootstrap failureはactiveを経ずmarker copyをdestroyしてadapter-sourced `equipment-failure`を生成し、internal adapter/proxy/controller/CDP/authentication/IPC/child faultはsynthesisせずinvalidateする。以後各study-browser requestにcanonical Basic credential exact 1件を要求し、close/abort/crash/child exit/authentication failureでattempt/marker/secret/install frame/browser copyをwipeする。Exact runtime-only `StudyParticipantNavigationGrant` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`state`と`state: armed | consumed | destroyed`を定義する。Product-probe readiness後、sole expected initial navigation直前にsupervisorがfresh armed grantを作り、proxy injection前にpage/browser codeへ公開せずstudy-browser-adapterへ送る。Fetch Metadataをhuman attestationではなくconsistencyだけとする。Valid secret + current armed grant + exact navigate/document/?1/missing-Origin/none-or-same-origin + exact authorized-static targetだけをparticipantとしgrant correlation IDを使ってonce consumeする。Current grantなし、nonexact target、user-activated page-script navigation、またはprior grant consumption後のfresh participant-shaped HTTP observationはvalid-secret unknownとし、open binding IDsとfresh proxy-generated correlation ID、`productAttributable: true`、`prohibited: true`を使うautomatic-critical browser-only rowとしてDNS/socket/body/response exposure前にblockし、grantをconsumeせずrunもinvalidateしない。Replayed/duplicate/stale authenticated IPC candidate、simultaneous grant-consumption attempt、authenticated attempt/correlation/target mismatchはforward 0件、run invalid、state destroyとする。Bundled-SPAはvalid secret + missing `Sec-Fetch-User` + [exact-issued `Origin` OR (missing `Origin` AND exact-issued `Referer`)]だけとし、extension/browser-only、その他valid-secret unknown/prohibited、missing/invalid-secret unrelated actor rowを保つ。Six headerをindependently compare/discardし、server claimはregistered outer/open-binding equalityを持つparticipant/SPAだけに許可する。Allowed edgeごとにordinary unidirectional anonymous inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をcreateし、IPC materialをenvironment、argv、file、socket、named endpoint、control endpointへ置かない。Parent-to-child pipeは32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`の順のexact 96 binary byteで始まり、EOFを挟まず同じopen pipeでLF-framed parent-to-child messageへ切り替わる。Childはframe parsing前にexact 96 byteをconsumeし、byte 96以後をすべてframe dataとして扱い、byte 96前のEOF/closeをrejectする。Child-to-parent pipeはauthenticated `ready` sequence `0`で始める。`ready` payloadのexact rootは`schemaVersion`,`bootstrapNonce`,`componentRunId`で、`schemaVersion: 1`、canonical bootstrap nonce、canonical component IDを持ち、parentはseed/nonceをdestroyする前にこれをauthenticate/consumeする。全`acknowledgement` payloadのexact rootは`schemaVersion`,`acknowledgedSequence`,`result`、`result: accepted`とし、全`lifecycle` payloadのexact rootは`schemaVersion`,`event`、`event: close | abort | child-exit`とする。Exact `StudyStreamControl` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`の順で定義し、immutable binding fieldは全commandでstart value exactをrepeatし、`command: start | checkpoint | anchor-handoff | stop`とする。Exact `StudyStreamControlResult` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`の順で定義する。Start resultはcapture-startとfirst heartbeat後だけvalidで、そのfirst-heartbeat positionをreportする。Supervisorは各stream fileをcreate/validateしてdedicated append-only handle exact 1件をopenし、fixed child-visible descriptor `5`でsupervisor -> adapter -> watchdogへhandleだけを渡す。Descriptor `3`はparent-to-child pipe read end、descriptor `4`はchild-to-parent pipe write endのままとし、descriptor `5`をthird IPC pipe/channelにしない。Descriptor `5`はadapter/watchdog modeだけに存在し、他roleではabsent/closedとする。Path、cwd、environment、argvをauthorityにしない。Adapterはfile accessなしのtransfer-onlyでwatchdog registration後にcopyをcloseし、supervisorはupstream registration ACK後にcopyをcloseし、watchdogがidentity/authorityをvalidateしてsole holder/writerになる。Adapterは`stream-control`とreverse `stream-control-result`をbyte-identicalにrelayし、start/checkpoint/anchor-handoff/stopはexact semantic resultをwaitし、stopはresult -> handle close -> clean exitの順とする。Wrong handle/slot/role/root/order/result、adapter access、extra holder/writer、early close、lifecycle failureは全copyをcloseしてrunをinvalidateする。Exact runtime-only `StudyProcessLifecycleAttestation` rootを`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`の順で定義する。`processRole`はnamed adapter 3件、named watchdog 3件、`reviewer-one`,`reviewer-two`のいずれか、adapter/watchdogの`streamRole`はexact stream、reviewerの`streamRole`は`not-applicable`、`event`は`registered | exited`、registrationは`exitCode: null`,`signal: null`、accepted exitは`exitCode: 0`,`signal: null`とする。Sibling edgeなしのexact matrixを`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）に閉じる。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Start completion前にadapter 3件/watchdog 3件すべてのregistrationを要求する。Supervisorは各adapter registrationをdirect acceptしてlater clean OS exitをobserveし、各adapterはwatchdog registrationをacceptしてlater watchdog clean OS exitをobserveしたattestationをrelayし、scoring-moderatorは各reviewer registrationとmoderator-observed clean exitをrelayする。Witnessはdirect adapter exit 3件、adapter-attested watchdog exit 3件、directly observed orchestrator exit 2件、`ephemeralReviewerProcessExitCount === reviewVoteCount`を証明し、nonclean/missing/duplicate/mismatch/wrong-parent/reordered lifecycle attestationはrun invalidとする。Exact `StudyBrowserBrokerDecision` rootを`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`の順で定義し、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。`candidate-forward`だけをsole candidate acceptance/forwarding authorizationとし、separate candidate acknowledgementを存在させない。Run/attempt/subject/process IDとcause `product-exit | browser-exit | equipment-failure | premature-probe-close`を持つexact attempt-terminalization/terminalization-decision payload、およびcanonical grant/workflow-outcome/review-case rootを定義する。 Study-harnessはscheduleだけを行い、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`をconstructしてsupervisorへsubmitし、supervisorがvalidateしてstudy-browser-adapterへforwardし、adapterは同じorderのcanonical workflow recordだけを`safe-payload`としてwatchdogへrelayする。Harness submissionとdirect/bypass producer routeをrejectする。Terminal causeはexact source—`product-exit`はsupervisorのdirect observation、`browser-exit`はactual browser process/context exitをobserveしたstudy-browser-adapter、`equipment-failure`はadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてsole designated equipment observerである同adapter、`premature-probe-close`はsupervisor direct—だけからacceptしfirst valid causeを採用する。Internal adapter/proxy/marker/authentication/IPC/implementation/child faultはequipment outcomeをsynthesizeせずrunをinvalidateする。Wrong-source/concurrent/late/duplicate causeをrejectし、supervisorはbyte-identical `terminalization-decision`をharness/browser adapterへfanoutする。Adapterはbrowser/grant/marker/reservation/candidate/pending stateをdestroyするがterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとfinal closed dual ACKまでterminalizing bindingとfixed remaining-workflow scheduleを維持する。 Byte-identical `attempt-binding` snapshotをreplicateする。Preparedはharness/browser adapterの両方へ送りmarker install/launch前にboth ACK、readiness時はfresh process IDを持つopenを両方へ送りreadiness return/grant/candidate前にboth ACK、terminalization decisionで両copyをterminalizingへmoveする。Outcome 4件後はclosedを両方へ送りadapterがattempt-local cleanup後にACKし、both closed ACK後だけcopy destroy/next attemptを許可する。Normal completionはauthenticated probe close、accepted outcome 4件、pending join 0件の後だけsame closed snapshot/ACK pathを使う。Skip/reorder/stale/duplicate/mismatch/partial ACKをrejectする。 Candidate body execution前にexact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`とcommand `register-pre-readiness-probe` request `studyRunId`,`subjectId`,`bootstrapProof`を要求し、private `preReadinessProbeId`を返す。Runtime-only `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate `open | readiness-bound | terminalization-bound | destroyed`を定義する。`buffer-pre-readiness-product-event` requestは`preReadinessProbeId`,`destinationRole`,`payload`、destinationは`product-instrumentation`だけ、responseは`null`とし、後の`register-product-probe` requestは`studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles`とする。Readiness後の`submit-product-event` exact outer rootは`inspectorProcessId`,`destinationRole`,`payload`とし、outer processだけがregistered probeをauthenticateし、`StudyServerCorrelationClaim` payload内のsubject/process IDはopen bindingとそのouter processの双方へindependently exact一致させる。Exact `StudyPreReadinessProductObservationDraft`をcanonical observation root order `schemaVersion`,`eventCode`,`eventId`,`correlationId`,`subjectId`,`inspectorProcessId`,`observationClass`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`,`sameInspectorHost`,`productAttributable`,`prohibited`で定義する。Process/workflow/automatic/review fieldは全て`not-applicable`、evidence/claimではなく、buffer IDはprivate runtime stateだけに保つ。Pre-readiness observationごとにsafe draftをclassifyしてraw inputを直ちにdiscardし、effect前にsubmitし、ACK後だけeffect continuationを許可する。Supervisor orderでhash/route/evidence化せずstoreし、全ACKed draftをpreserveする。Readinessではbufferを`open -> readiness-bound`へmoveしfresh `inspectorProcessId`とfresh evidence event/correlation IDでcanonical payloadを再構築し、orderどおりadapter ACK releaseし、empty bufferもdestroyし、attempt-open dual ACK完了後にresponseする。Pre-readiness exitでは`open -> terminalization-bound`へmoveし`inspectorProcessId: not-applicable`とfresh evidence IDでpayloadを再構築し、ACK releaseしてempty bufferもterminalization/synthesis前にdestroyし、abrupt exit後もACKed eventをpreserveする。Bootstrap point未到達exitはnormal pre-readiness terminalizationとしてreviewed failure 4件を作る。Bootstrap point到達後はregistration ACKまでcandidate body/effect 0件とし、identity/registration/ACK failureはsynthesisせずinvalidateする。Non-target/helper processはlocal discardしregister/evidence 0件とし、identity/register/ACK/replay/raw-bearing/wrong-destination faultはrunをinvalidateする。Openかつexact-matchingな`StudyCurrentSubjectScoringContext`が存在する間だけ、nonworkflow prohibited observationをsame run/subject/process/workflowへvalidate/tagし、required downstream watchdog ACKまたはACKsを得てからaccepted observationとしてcommitし、supervisor mirrorをupdateし、moderatorのauthenticated updated-`scoring-context` ACKを得て、その後だけrelease/outcome submissionを許可する。Pre-readinessまたはcontext-free observationはprocess/workflow/link fieldを`not-applicable`に保ち、contextをupdateせず、later linkも禁止する。Source-supplied workflow tagをignore/rejectしてlate/cross-context/reordered updateをfailする。Eligible grant-backed requestはadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardの順とし、generic candidate acknowledgementを設けない。Simultaneous consumption attemptまたはreplay/duplicate/stale/mismatched authenticated IPC candidateはforward 0件、run invalid、state destroyとし、fresh post-consumption HTTP observationはblocked unknown/prohibited non-invalidating branchを使う。Participant candidate correlationはsupervisor-generated grant ID exact、他browser requestはfresh proxy-generated IDとし、different/mismatchをrejectする。Subject/workflowごとにdistinct human reviewer pairをattempt前assignし、human identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く）を禁止する。Reviewer identity/pair mappingを禁止する境界はrepository/work-root、runtime、capture、evidence、bundle、log、output、digestだけとし、それらの外側のseparate access-controlled administrative roster/assignment recordでunique-pair auditを可能にし、retention policyに従ってdestroyする。First workflow前failureでもlive observationを維持し、failureだけがpaired collectorをspawnし、recording/replayを禁止する。Exact frame rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`からexact +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`をderiveし、exact `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`をderiveする。MACをexact `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated compact JSON wire frameへexactly one LFを加える。State change前にconstant-time verifyし、first authenticated child-ready後に`channelSeed`と`bootstrapNonce`をdestroyし、direction-specific keyはedge lifetimeだけ保持する。Wrong edge/role/type/channel/direction/order/tag、partial/trailing frame、skip、duplicate、replay、late/post-close input、unexpected child exitをrejectし、control commandを追加せずkey/frame/sequence stateをwipeする。Brokerをtimer-freeかつatomicにする。State changeなしでreserveし、grantをarmedのままauthenticated candidateをpendingとしてvalidate/storeし、sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward`を送り、adapterがcopyをvalidate/consumeしてforwardし、generic candidate acknowledgementを設けない。Server claimをauthenticateしてstored candidateへjoinし、safe browser/server pairをexactly once releaseしてからsingle success/completion ACKを送り、application handlingはそのpost-release ACKを待つ。Late claim、unmatched transaction/request、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryはtransactionをcloseし、partial pairをreleaseせずcandidate、claim、binding、marker、pending stateをwipeし、clock、deadline、timerを設けない。Runtime-only `StudyCurrentSubjectScoringContext`をexact root order `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`で定義する。Automatic IDはinitial `not-applicable`、terminalizationは`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`とする。そのcontextがopenの間だけ、downstream ACK後にacceptedとなったexact same run/subject/process/workflowのfirst nonworkflow prohibited observationへcontext `workflowClass`を持たせ、automatic correlation `not-applicable` -> that first matching ID onceとterminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextはそのcauseでinitializeして他mutation/reversal/replacementをrejectする。Pre-readiness/context-free observationはworkflow/link `not-applicable`を維持しlater contextをmutateしない。Supervisor mirror update、authenticated updated-context ACK、moderator submissionの順を要求する。Exact `StudyWorkflowOutcomeSubmission` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`を定義して`automaticIssueCorrelationId`を`outcomeClass`直後に置き、canonical workflow payloadも同じorderとする。Objectively successful workflowはcontext candidateがあってもautomatic ID/disposition/voteを常に`not-applicable`にする。Failed workflowでeligibleなalready accepted same-run/subject/process/workflow candidateがある場合だけそのexact IDと`automatic-critical`をsubmitしてreviewを0件にし、candidateなしfailureだけが`not-applicable`をsubmitしてreviewを完了する。Missing/mismatch/reuseをrejectし、accepted automatic observationはoutcomeと独立にexact 1回countする。Exact runtime-only `StudySafetyReviewCase` rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`の順で定義し、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`の順で定義し、`reviewerSlot: reviewer-one | reviewer-two`とする。Valid automatic linkのない全failureで、moderatorはraw response/rubricをcall-localだけに持ち、either vote前にfresh isolated reviewer-one/twoへbyte-identical safe caseを送り、両reviewerはout-of-band human-viewing boundaryでsame live workflowをobserveし、first voteをhiddenにする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとする。Issue identityは`automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`だけからderiveし、`suspectedWorkflowBlockerCount`は全reviewer disposition、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、critical totalはderived ID deduplicationとする。Attempt/reviewer assignment後（pre-readiness/accepted workflow 0件かつ`inspectorProcessId: not-applicable`を含む）のproduct/browser/equipment failureまたはpremature-probe-closeでは、supervisorがaccepted outcomeをfreezeしてjoinをcloseし、bindingをprepared/open -> terminalizingへmoveしてcontext routingをcoordinateし、scoring-moderatorだけがharnessのunchanged fixed remaining-workflow scheduleに従うexact failure + required reviewを4件までconstructする。Harnessはoutcomeをsynthesizeせず、harnessのbinding/scheduleとadapterのterminalizing bindingはall four routed outcomeとclosed dual ACK完了まで保持する。Accepted 0件ではfailure 4件すべてにpreassigned live-observing pairのvote exact 2件を要求する。Prematureは`terminalizationClass: equipment-failure`へmapする。Harness/orchestrator/adapter/watchdog/reviewer failureはrunをinvalidateする。Attemptはsequentialでparticipant 01–19がall four後close、participant 20はcheckpoint前discoveryまででsole possible open attempt、continuationはremaining 3件だけとする。Capture startはattempt bootstrap前のrun-levelだけとする。Materialization時のprocess treeはmaterializer -> supervisorだけとし、existing supervisorがstart時にlong-lived orchestrator 2件とadapter 3件をlaunchし、各adapterがmatching watchdog、scoring-moderatorがreviewed failureごとのfresh reviewer pairをlaunchする。Start completion前にadapter/watchdog 6件すべてのaccepted `StudyProcessLifecycleAttestation` registrationを要求し、その後exact `processes` 6件とexact ordered `orchestrators`（`study-harness`、`scoring-moderator`）を返す。Stopはlive reviewer 0件/long-lived internal descendant/process clean exit 8件を要求し、witness provenanceはsupervisor-observed adapter exit 3件、adapter-attested watchdog exit 3件、supervisor-observed orchestrator exit 2件、moderator-attested reviewer exitと`ephemeralReviewerProcessExitCount === reviewVoteCount`とする。Exact 80/threshold independence、record kind、handoff/witness/seal pair、retained set、runtime/reviewer residue 0件をpreserveする。(2) Failing tests: `tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`で、全positive、boundary、spoof、replay、lifecycle、raw-sentinel、real-child IPC、actual-browser、residue、reviewer truth-table、aggregate-equation、chain、handoff、witness、seal、retained-layout caseを先にencodeする。(3) Scripts: その後、self-contained static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`でclosed bundle/distributionとprotocolを実装し、five-input phase matrix、stable authenticated control session、exact finalize witness/teardown、single-file import/entry closure、`./package.json`のexact `study:evidence:inputs`、`study:evidence:capture`、`study:evidence:verify` entryを維持する。(4) Focused pass: このtaskでcandidate tarball digestをcompute/freezeせず、targeted suite 3件をすべてpassさせる。 加えて、次のbrowser-observation、outcome、ordering invariantを定義・実装する。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

### 公式エビデンスと依存関係のレビュー

- [ ] T1031 Exact host、redirect rejection、explicit network opt-in、complete environment-supported content retrieval、partial update を生じさせない 変更なしに伝播するnetwork/runtime throw/rejection、non-mutating drift reporting、および配信された`<h*>` element、あるいはそれを配信しないclient-renderedなページではちょうど1回現れるtable-of-contents anchor slugのいずれかによる引用heading解決 に関する、失敗する official-source checker contract を `tests/contract/official-source-drift.test.ts` に追加する
- [ ] T1032 明示的に network を使う official-source checker を実装し、standalone maintainer-only の `check:official-sources` script をすべての default build/start/test/CI chain の外で登録して実行し、自動的な behavior change を行わず reviewed source set と classified drift を `scripts/check-official-sources.ts`、`./package.json`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する。同じ変更で、commandが担うようになったcheckとreviewerの判断に残るcheckを`AGENTS.md`と`AGENTS.ja.md`に記述し、そこに書かれた手動の`curl` workflowがcommandと重複しないようにして、scriptに判断できないもの — headingが消えたのはページが移動したためかどうか、および引用sectionが維持しているparaphraseを今もestablishするかどうか — だけを残す
- [ ] T1033 `specs/001-inspect-agent-customizations/contracts/official-sources.md`、`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md`では、明示的にacceptedされたevidence location、unique section heading、anchor、review metadata、またはsemanticに変化しないsource driftだけを解消する。Presentation Allowlistのrowまたは記録済み6 freeze digestをauthor/updateせず、許可されたcorrection後はT004のexact six-file extraction、constant-time digest comparison、row-ID、bilingual semantic-parity verificationを再実行する
- [ ] T1034 [P] `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`と`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`のfreeze済みGitHub Copilot英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1035 [P] `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`と`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`のfreeze済みClaude Code英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1036 [P] `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`と`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みOpenAI Codex英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1037 T1033–T1036後、T1037によるPhase-102 evidence-review-driven production-registry correction前、かつ後続のold task ID前に、semantic driftとsix-digest freeze gateをenforceする。T004のexact extraction algorithmで全6 table inputを再計算し、missing/duplicate/empty/malformed heading/tableまたはrecorded digestのabsence/mismatchをすべてrejectし、equal-length digest byteをconstant timeでcompareし、exact IDと英日semantic parityを別に要求する。Reviewed evidence-location、anchor、review-metadata、またはsemanticに変化しないcorrectionだけを`src/shared/registries/vendor-behaviors.ts`、`src/shared/registries/inspection-rules.ts`、`src/shared/registries/runtime-composition.ts`、対象registry recordの`evidence` citationへflowさせられる。Freeze mismatch、またはnormative behavior、rule、strategy、allowlist membership/source-form applicability、registry shape、conformance expectationを変えるaccepted changeはbilingual task setをsupersededとし、mutation前に停止し、bilingual spec/research/plan/quickstart/contracts/tasksを同期し、`/speckit-plan`後に`/speckit-tasks`を要求する
- [ ] T1038 影響を受けた適合レコードだけを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json` で再生成する
- [ ] T1039 レビュー済みのエビデンスの結論を同期し、チェッカーを再実行し、最終結果を `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1040 `pnpm outdated`、license、notice、compatible-version rationale、public-contract effect、migration impactをreviewし、全accept/reject判断を`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する。初回baselineでは記録済みのno-impact判定とその事実を確認する。Acceptするdependency/public contractのbreaking changeごとに、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport window、rollback/support path、または理由を明記した影響なし判定を記録し、bilingual記録が欠ければこのtaskをblockする。変更をacceptしない場合はbaseline unchangedを記録して続行する。1件でもacceptした場合はcurrent `specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md`をsupersededと記録し、package/configuration editおよび旧task IDの後続実行前に停止し、影響を受ける`specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`、`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`、`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`、`specs/001-inspect-agent-customizations/tasks.ja.md` artifactを同期して`/speckit-plan`、`/speckit-tasks`の順に再実行し、regenerate済みtask setからだけ変更をapply/verifyする

---

## フェーズ 103: 横断的な検証

**目的**: 最終的な横断ドキュメント、パッケージ、アクセシビリティ、ライフサイクル、Node.js-only の回帰スイートを追加する。

**独立テスト**: 横断スイートを実行し、二言語の契約、クローズドなパッケージ内容、Node.js-only ポリシー、アクセシビリティの振る舞い、ライフサイクルのクリーンアップを検証する。

**目に見えるチェックポイント**: 完成した製品が横断的な自動回帰レイヤーを通過する。

### 横断テストを先に

- [ ] T1041 Versioned SC-003/004/005/007/009 outcome manifestを`tests/fixtures/outcomes/manifest.json`、canonical digestを`tests/fixtures/outcomes/manifest.sha256`、contractを`tests/contract/outcome-fixture-manifest.test.ts`に作成してfreezeする。1から始まるpositive safe-integer `manifestVersion`、unique stable case ID、criterion/required-class membership、fixtureまたはdeterministic-builder reference、客観的expected outcome、参照する全fixture byteのdigest、nonempty required class、declared nonzero minimum、再現可能なcanonical manifest digestを要求する。Table-drivenなprevious/current manifest objectで、version incrementなしのdenominator-semantics変更と、影響fixture digestおよびcanonical manifest digestの両方を変更しないfixture-byte-only変更をrejectし、VCS、network、reviewer stateを調べずhuman reviewを立証しない。`tests/contract/documentation.test.ts`へ、両quickstart、順序付き独立CI job、後続release/final rerunを要求するbilingual plan/task/quickstart declarationを含むrunnable command/stable ID、FR-043までの全55 FR/QR/SC trace row、全T001–T1080 mappingを検証し、各languageの全taskに少なくとも1つのexact repository-relative owned file pathを要求し、prefixなしbasenameにownershipを依存するtaskをrejectする一方、manifest/member/API/content literalだけのbasenameはrejectもcountもせず、task IDごとのderived英日exact owned-path set一致を要求するhard bilingual cross-artifact gateを追加する。さらにauthoritative allowlistまたはtask-ID-specific required-token manifestに基づく独立したnormative-identifier parity gateを追加し、case-sensitive normative identifier setを比較し、known closed-enum groupingだけをnormalizeし、plain textとcode spanを同等に扱い、repetitionを無視し、owned-path gateとは独立させ、このgateをhuman semantic reviewの代替にしない。T999とT1038がproduction registryと影響conformance recordをmaterialize済みであることを前提に、そのfinal stateを作成せずverifyする。Six Presentation Allowlist digest/ID/parityに加え、exact 48-source/56-rule registry、`vscode.copilot.mcp.workspace-root-release`、reciprocalな`copilot.repo.mcp.vscode-root` conflict evidence、推測したVS Code schema field/winner 0件のroot path-only semantics、`--root`/generation 0、symbolic linkをtarget越しに読みcycle-safeなreal-path追跡とfile単位diagnosticを伴う通常traversal、発見された各fileの1回read、independentなSource/attempt/generation readを要求する。FR-022についてexactな2つのauthorized internal loopback classを別々に分類・constraint検証し、それ以外のsurfaceで禁止対象direct product request 0件とlocal-fixture zero-call semanticsを要求する。さらにreplacement decode、runtime error ownership、fixed-three Global、FR-042 pre-purge/epoch/fence/recovery/error semanticsとpublic-state Global-sequence discard対unpublished-operation unchanged committed state、およびinspection-data successのunchanged-epoch/null-fence final gate、record-by-record EvidenceAssessment、non-authority/no semantic analysis/capacity ceiling、deterministic partial、atomic/late discard/mutation、migration、SC-002、manifest、全55 WCAG row、official backlinkを要求する。このpre-release時点ではexisting local/package/CI commandとfuture release-gate declarationだけをvalidateし、未作成release workflowを要求しない。そのfailing runnable assertionとimplementationはT1048、final-tree executionはT1062–T1063が所有する。T1041が新規所有するmanifest/test fileのfailureはすべてT1041内でcorrect/rerunしてからcompleteする。Owned file外のauthoritative artifact concernはcurrent task setをsupersedeし、synchronized replanningとtask regenerationを要求してT1062へdeferしない。その明示的T1041 disposition後もunresolvedなconcernだけがT1042およびcurrent IDの全後続taskをblockする
- [ ] T1042 [P] T1041通過後、gate前にmaterialize済みのT999 production registryとT1038 conformance recordを独立verifyし、exact 48 source record、56 inspection-rule ID、39 strategy、14 relationship-only rule、contained Hook/MCP addition 0件と更新済みfrozen Presentation Allowlist/source boundについてfinal testを追加する。`vscode.copilot.mcp.workspace-root-release` record、reciprocalな`copilot.repo.mcp.vscode-root` evidence、current-guide/release-note conflict、推測したVS Code schema field/winner 0件のpath-only root provenanceを要求する。Production registryを変更またはconformance stateをmaterializeせず、behavior/rule/strategyにすでに存在するscalar `documentationStatus`とfixed-order duplicate-free `lifecycleQualifiers`、T061がassembleするprovenance/Relationship/Fact/recognition DTOのsorted record-specific `EvidenceAssessment[]`をsubject owner/referenceごとに検証し、scalar/worst/union reduction、捏造`stable`、`documentation-conflict` status aliasを拒否する。Zero-authority Factとsyntactic/literal/typed/catalog/structure-only vocabularyを`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`で証明する。`evidence` citationもそこで検証する — citationはこれらのsuiteが既に対象としているrecord上にあるからである
- [ ] T1043 [P] 保持されたshebangを持つexactな`bin: dist/cli.mjs` mapping、exactなengine/version rejection/README/license schema、2つの必須package entry（`dist/public/index.html`と`dist/cli.mjs`）、CLI entry、verification を完了できない場合の import/bind 前の安全な失敗、unlisted-payload rejection に関する packed-tarball closed-set test を、customization validity output なしで `tests/package/package-contents.test.ts` と `tests/package/verify-package-files.test.ts` に追加する
- [ ] T1044 [P] `gunshi`を含む承認済みruntime dependency leaf set、Gunshiのroot-only import boundary、`open`の不在、`package.json`と`pnpm-lock.yaml` closureからassertするproduction-graph dependency集合に関するpackage testを`tests/package/node-only-policy.test.ts`と`tests/package/production-graph.test.ts`で拡張する *（superseded 2026-07-23: scripts-disabled/network-disabled installの各run、別個のgenerated-shim audit、payload content scan — Rust/C/C++/Cargo、Node-API/native/binary/Wasm、`binding.gyp`、prebuild、platform selector、shell helper、non-Node shebang、lifecycle/runtime download — と、dependency単位のversion/integrity/bundle済みpayload digestのassertionはscopeから外した。commit済みlockfileが各resolved versionとintegrity hashを既にpinしており、testで再記述してもlockfileを二重化するだけで、install時のenforcementはpackage managerが所有する。plan.md § Source Code (repository root) 参照）*
- [ ] T1045 [P] Axe、keyboard、forced colors、zoom/reflow、reduced motion、focus、安全error、注意書きなしのauthored-value直接表示、ordinary scoped-cleanupの破棄対全central-full-purge reset、Global-disable epoch-fence recoveryをbilingual 55-row WCAG matrixへmappingする。Exact `AUTO-*` IDと`AUTO-2.2.2`を含め、全Applicable automated checkと4 keyboard workflowをpinned Chromium/Firefox/WebKitでpassさせるtestを`tests/e2e/accessibility.spec.ts`と`tests/e2e/session-lifecycle.spec.ts`へ追加する
- [ ] T1046 [P] Diagnostic、stale-failure error、EvidenceAssessment、control/progress、SessionSnapshot、`GlobalFenceRecoverySnapshot`、FileDetail envelope、各宣言済みresultがdevframe channelがserializeする1つのcompleteなJSON-serializable valueであること、accepted-request stale-error ownership、post-commit delivery regressionを追加する。Rescan/disable acceptanceをまたいでdeliveryをpauseし、全inspection-data successが`globalContentEpoch`をcaptureしてfinal unchanged-epoch/null-fence gate後だけpublishされる一方、fence中のsession routeはcontrol DTOだけを返すこと、purge後にstale stateがleakしないこと、fence中sessionはrecovery-only、terminal disable commitがprior stateと混在しないことを`tests/integration/session-snapshot-encoding.test.ts`、`tests/contract/http-api-session.test.ts`、`tests/contract/http-api-files.test.ts`で証明する *（superseded 2026-07-23: 事前serialize済みimmutable response buffer/exact length assertionは削除した。devframeがresponse serializationを所有する）*

---

## フェーズ 104: リリースと成果エビデンス

**目的**: リリースマトリクスを組み立て、測定可能なすべての成功基準、最終ゲート、明示的なrelease Constitution Checkの合否エビデンスを記録する。

**独立テスト**: 1つのclosed setでplatform非依存tarballをbuildし、Node.js 24/26の宣言済みcompatibility contract全体を維持しながら正確な6つのlower-bound Node/OS jobで同一byteをcertifyし、SC-001～SC-009の全denominator/thresholdをfinal candidate/profile/fixture/study digestへbindし、全remediationをapplicable gate/evidenceとcomplete-diff reviewへloopし、principleごとのConstitution Checkを記録してfrozen final treeでcomplete applicable automated matrixをpassする。

**目に見えるチェックポイント**: 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスク、憲章準拠のエビデンスを備え、公開可能な状態になる。

### リリースワークフロー

- [ ] T1047 Node.js 24.18.0 `ubuntu-24.04` x64 development/build baselineでplatform-independent tarballをbuild/verifyし、同一byteをNode.js `24.11.0`/`26.0.0`と`ubuntu-24.04` x64/`macos-15` arm64/`windows-2025` x64の6 lower-bound certification sampleへ配布し、runner-image identifier/actual Node versionを記録して、`^24.11.0 || ^26.0.0`をfull compatibility contractとして維持し、lockfileでpinしたproduction-graph integrityをassertするrelease jobを `.github/workflows/release.yml` に追加する *（superseded 2026-07-23: OS別の別個shim auditはpackage-gate整理でscopeから外した）*
- [ ] T1048 Actual workflowがfinal artifact/evidence-producing step後かつpublication前にapplicable automated gateを再実行することを要求するfailing release-workflow structure assertionを最初に`tests/contract/documentation.test.ts`へ追加し、passするまで`.github/workflows/release.yml`を拡張する。Exact packed-engines/running-version pre-import rejection、safe-filesystem、2-entry package verification、lockfileでpinしたproduction graph、`npx`、Node.js-only、exact Playwright 1.61.1 Chromium/Firefox/WebKit browser certification、`--no-open` manual fallbackを含むOS-default-handler区分、accessibility gateをpublication前に含め、T1041がdeferした最初のrunnable release-workflow proofとする *（superseded 2026-07-23: scripts-disabled/network-disabled installとpackage-content-scan gateはpackage-gate整理で削除した。lockfile integrity hashがpayload byteをpinする）*

### 成果エビデンスと最終ゲート

- [ ] T1049 Targeted study-evidence gate `pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を実行し、全positive/negative caseがpassするまで先へ進まない。Bilingual task parserでexact 1,079 ordered checkbox ID、104 phase、57 trace row、English/Japaneseのidentical owned-path set、out-of-line amendment mechanismのないself-contained task textを要求する。Exact five-input phase matrix、closed sixteen-member bilingual input bundleと20 distribution、unchanged work-root/candidate identity、stable authenticated control session、final candidate rehash、exact handoff/witness/seal write order、self-contained static-`node:` script、real `process.execPath` child role、actual participant `npx` probe readiness、browser-helper stripping、prohibited retained binding/path/secret/raw value 0件をverifyする。Scoped privacy boundaryをpositive/negativeに証明する。Required raw Basic、Fetch Metadata/Origin/Referer、correlation-header byteはephemeral loopback-wire receipt/processingだけに存在して直ちにdiscardされ、capture/evidence IPCまたはretained/log/output/digest boundaryをcrossしてはならない。Strictly decoded canonical 43-character IDだけが`correlationId`としてsafe IPC、canonical payload、payload digest、chain、handoff、witness、seal verificationへ残る。Supervisor-owned attempt/marker generation、study-browser-adapterへのdirect prepared-only install、actual bootstrap success ACKでmarker copyだけをatomic activateし、attemptはlater readiness/open-snapshot dual ACKまでpreparedに維持すること、prepared failure destruction、`browserAttemptId`のbrowser/evidence exposure 0件をexerciseする。Capture startがrun-levelだけで、stream live後の各sequential attempt `npx` probe直前にfresh profile/secret/bootstrapがあることを証明する。Certified profileでexact revision/version/distribution/isolated surface、bodyless 407のordered only headers `Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、Basic retry 1件、sole header `Connection: close`のbodyless 204をverifyし、全deviation/residueをrejectする。Exact `StudyParticipantNavigationGrant` root/lifecycleをexerciseし、Fetch Metadata aloneがattestationにならないことを証明する。Armed one-use grant + exact participant tuple + exact authorized-static targetだけをparticipantとする。Fresh no-grant/nonexact-target/user-activated page-script/post-consumption HTTP observationはopen IDs、fresh proxy-generated correlation IDを持つblocked valid-secret unknown/product-attributable/prohibited/automatic-critical/browser-only rowとしinvalidateしない。Replay/duplicate/stale authenticated IPC candidateとsimultaneous consumption attemptはinvalidateする。SPA、extension、missing/invalid-secret、six-header independent projection/immediate discard、static/API forwarding、server-claim equalityの全negativeを維持する。Real child processを使い、closed matrix edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`があり、environment/argv/file/socket/named/control endpoint transport 0件であることをverifyする。Sibling edgeなしのexact closed matrixをexerciseする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Testするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact `StudyBrowserBrokerDecision`、grant、terminalization、workflow-outcome、review-case payload root/enumをmutation-testする。Study-harnessはscheduleだけ、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission`をconstruct/submitし、supervisor validate/forward、browser adapter canonical record、watchdog `safe-payload`とする。Harness/direct/bypass submissionをfailする。Exact source—product-exitはsupervisor-observedだけ、browser-exitはactual browser process/context exitをobserveしたstudy-browser-adapterだけ、equipment-failureはadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてdesignated equipment observerである同adapterだけ、premature-probe-closeはsupervisorだけ—のfirst-wins/rejectionをtestし、internal adapter/proxy/marker/authentication/IPC/implementation/child faultをinvalidateする。Byte-identical decision後、adapterはbrowser/grant/marker/reservation/candidate/pendingをcleanupしterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでterminalizing binding/fixed scheduleを維持する。 Byte-identical prepared/open/closed `attempt-binding` snapshot、dual-ACK barrier、decision-driven terminalizing copy、adapter cleanup-before-closed-ACK、normal closeのprobe close/outcome 4件/join 0件gate、both closed ACK後だけdestroy/next、全skip/reorder/stale/duplicate/mismatch/partial-ACK negativeをtestする。 Exact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`、exact `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate `open | readiness-bound | terminalization-bound | destroyed`、`register-pre-readiness-probe` request `studyRunId`,`subjectId`,`bootstrapProof` -> `preReadinessProbeId`、`buffer-pre-readiness-product-event` request `preReadinessProbeId`,`destinationRole`,`payload` -> `null`、extended `register-product-probe` request `studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles` -> `inspectorProcessId`、exact `StudyPreReadinessProductObservationDraft` canonical root/order、全N/A process/workflow/automatic/review field、pre-bind evidence/claim/hash/route 0件、sole product-instrumentation destination、private runtime buffer ID、immediate raw discard、draft-before-effect/ACK-before-effect-continuation、exact open-to-readiness-bound/terminalization-bound transition、readiness fresh-process bind + fresh evidence ID + ordered adapter-ACK release + empty-buffer destroy + attempt-open dual ACK後response、pre-readiness N/A bind + fresh evidence ID + ordered ACK release/destroy後terminalization、abrupt-exit ACKed event preservation、exit-before-bootstrap normal four-failure synthesis、bootstrap-reached registration-ACK barrier/candidate body-effect 0件、non-target/helper discard/no-register/no-evidence、全identity/register/ACK/replay/raw/wrong-destination failureをtestする。Open exact-matching `StudyCurrentSubjectScoringContext`内だけでsame-run/subject/process/workflow validation/tag -> downstream watchdog ACK(s) -> accepted observation -> supervisor mirror update -> authenticated moderator updated-context ACK -> release/outcomeをtestする。Pre-ready/context-free rowはprocess/workflow/link N/A、context mutation 0件、later link 0件とし、source workflow、late/cross/reordered/replacement updateをrejectする。Adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forwardをgeneric candidate acknowledgementなしでrace-testし、eligible participant candidateはsupervisor grant correlation、他fresh HTTP observationはfresh proxy IDとする。Simultaneous consumptionまたはreplay/duplicate/stale/mismatched authenticated IPCはforward 0件でinvalidate/destroyし、fresh no-grant/wrong-target/page-script/post-consumption HTTP rowはblockedのままinvalidateしない。Distinct human pairをsubject/workflowごとにattempt前assignしてhuman identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く）を禁止する。Identity/pair mappingはrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordだけに置いてunique-pair auditとretention-policy destructionを要求し、pre-readiness/zero-accepted failureのlive observation、synthesized failure 4件それぞれのvote 2件、failure-only paired collector、recording/replay 0件をcoverする。Parent-to-child pipeがexact 96 binary byteの`channelSeed`/`bootstrapNonce`/`channelId`で始まりEOFなしでLF-framed messageへcontinueし、96 byte前のEOF/closeをrejectし、post-96 byteをframe byteとして扱うこと、child-to-parent pipeがauthenticated `ready` sequence `0`で始まることを証明する。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical bootstrap nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`をverifyする。全listed edge/role/message row、exact frame root `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、per-direction `0` then exact +1、exact `K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、exact `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、exact MAC preimage `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated compact JSON wire frame plus exactly one LF、constant-time verification、authenticated ready後のseed/nonce destruction、wrong edge/role/type/channel/direction/order/tag、partial/trailing、skip/duplicate/replay/late/post-close、early EOF、child replacement/exit、wipe caseをexerciseする。Brokerがclock、deadline、timerを持たず、adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once pair release -> single success/completion ACKをenforceし、application handlingをそのpost-release ACKまでblockすることを証明する。Late claim、connection/IPC EOF/error/close、request/transaction end、probe/attempt end、stop、abort、crash、child exit、全lifecycle boundaryをrace/fault-testし、partial release 0件とcandidate/claim/binding/marker/pending complete wipeを要求する。Expanded `StudyCurrentSubjectScoringContext` exact root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をexerciseする。Correlation `not-applicable` -> first matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeし、他mutation/reversal/replacementをrejectする。Context correlationはfailure-link candidateだけとし、submission/canonical payloadの`outcomeClass`直後に置く。Successはcandidateがあっても常にN/A/no-review、eligible accepted exact same-run/subject/process/workflow candidateを持つfailureだけがautomatic-critical/no-review、candidate-free failureはexact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`を使ってreviewする。他failureではexact review-case、moderator call-local raw input、either vote前のfresh isolated reviewer 2件とbyte-identical safe case、same live workflowのhuman observation、hidden first vote、acceptance前の両process exitを要求する。Dispositionはexact `not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとし、valid truth row、derived automatic/reviewer IDだけを許可してmissing/mismatch/reuse、unreviewed failure、vote leakage、reviewer reuseをrejectする。Seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutate-testし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、confirmed/disagreement counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplication、total-count/zero-gate equationを含める。Exact sequential scheduleを証明する。Participant 01–19は各4件完了後closeし、participant 20 discoveryがSC-001 20件のcheckpointとsole possible open attemptを作り、continuationはremaining 3件を完了する。Accepted workflow 0–4件後のcrashをtestし、product/browser/equipment/premature-probe terminalizationではsupervisorがcontextをfreeze/routeし、scoring-moderatorがunchanged harness scheduleに従うremaining reviewed outcomeをconstructし、harnessはsynthesizeしない。Harness/adapter terminalizing bindingをall four routed outcomeとclosed dual ACKまで保持し、prematureをequipment-failureへmapする。Harness/orchestrator/adapter/watchdog/reviewer failureはinvalidateし、accepted rowをduplicateしない。Exact capture-script self-reexec mode/process tree、start responseのexact `processes` 6件 + exact ordered `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived exit 8件、witnessのstream exit 6件 + orchestrator exit 2件 + `ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 80、record kind 5件、uninterrupted stream、heartbeat boundary、role/effect row、handoff anchor、threshold-failing seal completion、既存retained distribution/stream/handoff pair/continuity-witness pair/capture-seal pairを維持し、sidecar/final runtime controlを0件にする。その後、frozen install、exact Playwright browser install、build、lint、typecheck、unit、complete contract、complete security gateを実行し、全resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをpositive/negative/race/mutation-testする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

- [ ] T1050 integration、package、performance、browser、coverage、documentation の各ゲートを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1051 同一tarball byteでexact six lower-bound jobを実行し、engine/runner/digestに加えて透過的symlink読み取りとfile単位diagnostic挙動を伴う通常traversal、発見された各fileの1回readとindependent-attempt read、byte-decode outcomeを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1052 Check-in済みSC-002 profile、`tests/performance/sc002-fixture-manifest.json`、`tests/performance/sc002-fixture-manifest.sha256`をvalidateして正確に10のfresh-process runを記録する。Run 1直前と各run直後にcanonical manifestと参照する全content digestを再計算し、missing entryまたはdriftがあればset全体を無効とする。各automatic first Repository scanをtiming外で待ち、明示rescanを正確に1件dispatchして`scanRequestId`をcaptureする。同じIDのvisible/assistive statusと、そのrequestのcommit済みgeneration由来inventoryだけをacceptし、generic/loading/prior/automatic stateを拒否する。1秒以内のstatus、10秒以内のinventory、100 ms未満のfilter interaction、100 ms未満のitem-selection interactionという4 thresholdすべてを、同一の9 run以上からなる共通subsetが満たすことを要求する。各runで同じprofile ID/manifest version/canonical digestを繰り返し、request ID/generation/environmentを記録してSnapshot reuse/intentional cache resetを行わず、personal identifier/absolute path以外を省略しない。対象は`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`とする
- [ ] T1053 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase IDをvalidateして記録し、supportedな各`(tool, kind, admitted source form)` row、rejected inspection-path selector family、shared-file attribution combinationについて、そのexactで非ゼロのdenominatorとdeclared minimum coverageに照らしてSC-003のpass/failを記録する。認識率100%、範囲外の解釈0件、正しい帰属率100%とし、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する
- [ ] T1054 Frozen manifestからSC-004をvalidate/recordし、全tool/prohibited effect/rejected selector/detectable file-read change/directory enumeration中create-remove-rename/close-result classへnonzero coverageを要求する。Local fixture rootを記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback class—発行済み`localhost` authorityにおけるpackaged UI assetへのstatic/SPA `GET`/`HEAD`とlocal session API channel—を別々に分類・検証し、それ以外の全surfaceで禁止対象direct product-issued outbound/MCP request 0件を証明する。External mutation harness、product mutation API/flag 0件、consume groupごとのproduction content read 1件、不変content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL、別扱いOS-only atime、hard-cancellation claimなしのconfirmed cleanup/late discardを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1055 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行したexact case IDをvalidate/recordし、supportedな各`(tool, kind, admitted source form)` row、source/comparison surface、credential/environment-reference class、set-sentinel/unset stateについて、exact nonzero denominator/minimumに対するSC-005 pass/failを記録する。Substitution 0件、masking/revealなし、fixture不変を要求する。Diagnosticがsource valueを複製しないことを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で別に証明する
- [ ] T1056 T1051 frozen candidateに対してmaterialization、run-level capture start、sequential pre-checkpoint workflow schedule、SC-001、checkpoint evidenceを実行する。Materialization前に`INSPECTOR_STUDY_WORK_ROOT`、external-local `INSPECTOR_STUDY_CONTROL_ENDPOINT`、fresh 32-byte/43-character `INSPECTOR_STUDY_CONTROL_TOKEN`だけをprovision/validateし、candidate/proxy bindingをabsentまたはpoisonに保ち、exact `pnpm run study:evidence:inputs -- materialize`と`pnpm run study:evidence:verify -- inputs`がそれらをreadしないことを証明する。Unchanged empty non-link work root、exact sixteen-member bilingual inputs、closed distribution 20件、external runtime binding、live stable authenticated control session 1件を要求し、environment value、path、key、mappingをretainしない。T1051後だけexternal same-identity `nlink === 1` candidateとexact loopback proxy authorityをbindし、exact `pnpm run study:evidence:capture -- start`を実行する。次のexact closed matrixの各edge—`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Pre-checkpoint executionでenforceするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Ordinary inherited pipe 2本だけを確立し、sibling edgeとenvironment/argv/file/socket/named/control endpoint transportを禁止する。Exact `StudyBrowserBrokerDecision` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`と`decision` `candidate-forward | browser-only-released | joined-pair-released`、run/attempt/subject/process IDとcause `product-exit | browser-exit | equipment-failure | premature-probe-close`を持つexact attempt-terminalization/terminalization-decision payload、exact `StudyParticipantNavigationGrant`と`StudySafetyReviewCase` payloadのcanonical `subjectId`,`inspectorProcessId` associationを定義する。Study-harnessはscheduleだけ、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission`をconstruct/submitし、supervisorがvalidateしてbrowser adapterへforwardし、adapterはcanonical workflow-record `safe-payload`だけをwatchdogへ送る。First valid exact-source cause—product-exitはsupervisor-observedだけ、browser-exitはactual browser process/context exitをobserveしたstudy-browser-adapterだけ、equipment-failureはadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてdesignated equipment observerである同adapterだけ、premature-probe-closeはsupervisorだけ—でbyte-identical decisionを送り、wrong-source/concurrent/late/duplicateをrejectし、internal adapter/proxy/marker/authentication/IPC/implementation/child faultをinvalidateする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでterminalizing binding/fixed scheduleを維持してlong-lived adapterをsurviveさせる。 Prepared/open/closed binding snapshotをharness/browser adapterへbyte-identically replicateし、marker/launch、readiness return/grant/candidate、destroy/nextの前にrespectively both-ACK barrierを要求し、normal closeはauthenticated probe close/outcome 4件/pending join 0件の後だけ許可する。Decisionで両copyをterminalizingへmoveし、adapterはclosed ACK前にlocal cleanupし、skip/reorder/stale/duplicate/mismatch/partial ACKはinvalidateする。 Candidate body execution前にexact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`を`register-pre-readiness-probe`でsubmitし、private `preReadinessProbeId`を受け、exact `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`を`open`でcreateする。Exact `StudyPreReadinessProductObservationDraft`を`buffer-pre-readiness-product-event`で`product-instrumentation`だけへbufferし、そのprobe IDを持つextended `register-product-probe`を後でcallする。Draftのprocess/workflow/automatic/review fieldは`not-applicable`、pre-bind evidence/claim/hash/route 0件、buffer ID privateとする。Pre-ready safe draftをclassifyしてraw valueを直ちにdiscardし、effect前にsubmitしてACK後だけeffect continuationを許可し、全ACKed draftをsupervisor orderでretainする。Readinessではbufferを`open -> readiness-bound`へmoveしfresh `inspectorProcessId`/fresh evidence event-correlation IDで再構築してordered adapter-ACK releaseし、empty bufferをdestroyしてattempt-open dual ACK後にrespondする。Pre-ready exitでは`open -> terminalization-bound`へmoveし`inspectorProcessId: not-applicable`/fresh evidence IDで再構築してACK releaseし、empty bufferをterminalization/synthesis前にdestroyし、abrupt exit後もACKed eventをpreserveする。Exit-before-bootstrapはnormal pre-ready four-failure synthesis、bootstrap後registration ACKまではcandidate body/effect 0件、non-target/helperはdiscardしてregister/evidence 0件とし、identity/register/ACK/replay/raw/wrong-destination faultをinvalidateする。Open exact-matching `StudyCurrentSubjectScoringContext`内だけでsame-run/subject/process/workflow validation/tag -> downstream watchdog ACK(s) -> accepted observation -> mirror update -> moderator updated-context ACK -> release/outcomeをorderし、pre-ready/context-free process/workflow/linkをN/A、context update/later linkを0件とし、source workflow tagとlate/cross/reordered updateをrejectする。Eligible participant grantをadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardの順にし、generic candidate acknowledgementを設けない。Simultaneous consumeまたはreplay/duplicate/stale/mismatched authenticated IPCはforward 0件でinvalidate/destroyし、fresh post-consumption HTTP observationはblocked/non-invalidatingとする。Participant candidateはsupervisor grant correlation exact、他requestはfresh proxy IDとする。Distinct human pairをsubject/workflowごとにattempt前assignしてcross-case reuseを禁止し、identity/pair mappingはrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordだけに置いてunique-pair auditとretention-policy destructionを要求し、first workflow前もlive observationを可能にしてrecording/replayを禁止する。Parent-to-childのexact 96-byte prefixを32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`の順とし、EOFなしのLF frame、child-to-parent authenticated `ready` sequence `0`、exact ready/acknowledgement/lifecycle/frame root、direction-specific key derivationを維持し、authenticationTag-null compact canonical frameをLFなしでMACし、populated wire frameだけにLF exact 1件を追加し、state change前にverifyしてclosure時にbootstrap/key/frame/sequence stateをwipeする。`capture -- start`をrun-levelだけとし、attemptを作る前にproxy/listenerをbindし、long-lived study-harness、scoring-moderator、adapter 3件、そのwatchdog 3件をspawnしてsole-writer stream 3件を開始する。Start responseはexact `processes`のadapter/watchdog entry 6件とexact `orchestrators`の`study-harness`、`scoring-moderator`順2件を公開する。`scripts/run-usability-study-capture.mjs`のexact self-reexec modeを`supervisor | study-harness | scoring-moderator | reviewer-one | reviewer-two | product-instrumentation-adapter | inspector-server-ledger-adapter | study-browser-adapter | product-instrumentation-watchdog | inspector-server-ledger-watchdog | study-browser-watchdog`とし、product-probeはdistinct static importに保つ。Streamがliveになった後、各sequential attemptのparticipant `npx` probe/first capturable request直前にだけsupervisorがfresh `StudyBrowserAttemptBinding` state `prepared`、`browserAttemptId`、separate 32-byte/43-character `browserProxyMarkerSecret`、exact `StudyBrowserProxyMarkerBinding` state `prepared`を生成し、その`studyRunId`,`browserAttemptId` associationを維持する。`attempt-binding`はstudy-harnessとstudy-browser-adapterだけへ、`proxy-marker-install`はsupervisorからstudy-browser-adapterへdirectに送る。`browserAttemptId`をsupervisor/broker、study-harness、study-browser-adapterのruntime memoryとauthenticated frame/candidateだけに保ち、browser process/context/profile/configuration/credential/request/application/evidenceへ入れない。Prepared-binding both ACK後かつparticipant `npx`前にadapterがexact profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`、actual Playwright 1.61.1 headed Chromium revision `1228`、`browserVersion` `149.0.7827.55`、`Chrome for Testing`のcertified isolated profileをlaunchし、`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbootstrap exact 1回を完了する。Bodyless `407 Proxy Authentication Required`のordered only headersを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、canonical Basic retry exact 1件、bodyless `204 No Content`のsole headerを`Connection: close`とし、effect 0件を証明する。Authenticated bootstrap ACKはmarker copyだけをactiveへmoveし、attemptはproduct readiness/open-snapshot dual ACKまでpreparedに保つ。Healthy external browser/environment/bootstrap failureはactiveを経ずmarker copyをdestroyしてadapter-sourced `equipment-failure`を生成し、internal adapter/proxy/controller/CDP/authentication/IPC/child faultはsynthesisせずinvalidateする。その後全study-browser requestにcanonical Basic credential exact 1件を要求する。各workflowでexact `StudyCurrentSubjectScoringContext` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をcreateする。Automatic IDはinitial `not-applicable`、terminalization classは`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`とする。Open中のraw responseはscoring-moderator call-local memoryだけでassociateする。Automatic correlation `not-applicable` -> first supervisor-tagged matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをそのcauseでinitializeして他mutation/reversal/replacementをrejectし、updated-context ACK後だけmoderator submissionを許可する。Exact `StudyWorkflowOutcomeSubmission`とcanonical workflow payloadでは`automaticIssueCorrelationId`を`outcomeClass`直後へinsertする。Context IDはfailure-link candidateだけとする。Successはautomatic ID/disposition/voteを常に`not-applicable`、eligible accepted exact same-run/subject/process/workflow candidateを持つfailureだけがそのIDと`automatic-critical`でreview 0件、candidate-free failureは`not-applicable`とexact reviewを使い、missing/mismatch/reuse/late linkをrejectする。Exact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`を定義する。Valid automatic linkのない全failureをreviewし、scoring-moderatorはraw response/rubricをcall-localだけに保ち、vote acceptance前にfresh isolated reviewer-one/twoへbyte-identical privacy-safe caseを渡す。両reviewerはout-of-band human-viewing boundaryで同じlive workflowをindependently observeし、first voteをhiddenにする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとする。Successはnot-applicable/no vote、linked automatic failureはautomatic-critical/no vote、他failureはexact 2 voteからreviewer-cleared/confirmed/disagreementへresolveする。次workflow前にcontext、review channel、raw association、reviewer processをdestroyする。Fetch Metadataをhuman attestationではなくconsistency signalだけとして扱う。Product-probe readiness後、sole expected initial participant navigation直前にsupervisorがfresh exact `StudyParticipantNavigationGrant` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`state`を`armed`で作り、proxy injection前にpage/browser codeへ見せずstudy-browser-adapterへ送ってexact 1回consumeする。Valid secret + exact navigate/document/?1/missing-Origin/none-or-same-origin + exact authorized-static target + current armed grantだけをparticipantとしgrant correlation IDを使う。Current grantなし、prior consumption後、nonexact target、user-activated page-script navigationのfresh participant-shaped HTTP requestはopen binding IDsとfresh proxy-generated correlation IDを持つvalid-secret unknown、`productAttributable: true`、`prohibited: true`、automatic-criticalとしてDNS/socket/body/response前にblockしinvalidateしない。Replay/duplicate/stale authenticated IPC candidateまたはsimultaneous consumptionはinvalidateする。Bundled-SPAはmissing `Sec-Fetch-User` + [exact-issued `Origin` OR (missing `Origin` AND exact-issued `Referer`)]とstatic/API-only、extension/other valid-secret tupleはbrowser-only unknown/prohibited、missing/invalid secretはnot-applicable IDsのunrelatedとする。Proxy/serverはheader 6件をindependently project/compareしてrawを直ちにdiscardし、server claimはregistered outer/open-binding equalityを持つparticipant/SPAだけに許可する。Eligible participant/bundled-SPA exact requestごとにstate changeなしでreserveし、grantをarmedのままauthenticated candidateをpendingとしてvalidate/storeし、sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward`を送り、adapterがcopyをvalidate/consumeしてforwardし、generic candidate acknowledgementを設けない。Server claimをauthenticate/joinし、not-applicable branchなしでexact claim/outer/binding ID equalityを要求し、safe browser/server pairをexactly once releaseしてからsingle success/completion ACKを送り、application handlingをそのpost-release ACKまでblockする。Broker clock/deadline/timerを使わず、late claim、request/transaction end、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryでcandidate/claim/binding/marker/pending stateをclose/wipeし、partial releaseを0件にする。Issue identityはaccepted automatic observationから`automatic:<correlationId>`、reviewer-confirmed/disagreement outcomeから`reviewer:<subjectId>:<workflowClass>`としてdeterministically deriveし、independent fresh issue IDをprovision/retainしない。Exact seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`のindependently recomputable inputを維持し、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、reviewer-confirmedまたはreviewer-disagreement issueのexact 1回count、derived automatic/reviewer-critical issue IDのdeduplicated unionとしてのtotal、total 0かつcomplete exact-80 setの場合だけのzero gateをenforceする。ただしseal writeはT1057で行う。Raw Basic、Fetch Metadata/Origin/Referer、correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに許可して直ちにdiscardし、secret、response、identity、profile/configuration、path、errorとともにcapture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせない。Strictly decoded canonical 43-character safe IDだけがsafe IPCをcrossし、`correlationId`としてretainされ、canonical safe-payload/evidence digestへ入れる。Attemptをsequentialに実行し、`prepared | open | terminalizing` bindingは最大1件とする。Participant 01–19はdiscovery、inspection、comparison、global-consentとrequired reviewを完了し、accepted outcome exact 4件後にcloseして全attempt/profile/secret/contextをdestroyしてから次attemptへ進む。Participant 20はdiscoveryを完了し、その1件だけがcheckpointをまたいでopenになり得るため、checkpoint時点でSC-001 outcome 20件すべてとopen attempt最大1件を両立する。Attempt/reviewer assignment後（pre-readiness/accepted workflow 0件かつ`inspectorProcessId: not-applicable`を含む）のproduct exit/browser exit/equipment failure/premature probe closeでは、supervisorがaccepted outcomeをfreezeしてjoinをcloseし、prepared/open bindingを`terminalizing`へmoveしてcontextをrouteし、scoring-moderatorだけがunchanged harness fixed remaining-workflow scheduleでexact failure/reviewを4件までconstructする。Harnessはsynthesizeせず、harness binding/scheduleとadapter terminalizing bindingをall four routed outcome/closed dual ACKまで保持してからclose/wipeする。Premature-probe-closeは`terminalizationClass: equipment-failure`へmapする。Study-harness、scoring-moderator、adapter、watchdog、reviewer process failureはrunをinvalidateしsynthesisしない。Accepted workflow 0–4件後のfailureをexerciseし、rowをpreserveしてduplicateしない。Accepted 0件ではfailure 4件すべてを作り、各nonautomatic rowにpreassigned live-observing pairのvote exact 2件を要求する。Participant 20がcheckpoint前にterminalizeした場合、continuation progressはlive attemptではなくpost-anchor heartbeatで証明する。その後、append/heartbeat progressをblockせずexact `pnpm run study:evidence:capture -- checkpoint`を実行し、exact `pnpm run study:evidence:verify -- checkpoint`で`capture/study-capture-handoff.json`と`capture/study-capture-handoff.sha256`だけをcreateし、streamごとにmatching anchor 1件とcontinued post-anchor progressを要求する。`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`にはsafe ID、fixed role/code、count、digest、threshold result、cleanup result、pass/failだけを記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをpre-checkpoint captureでenforceする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
- [ ] T1057 同じuninterrupted runでparticipant 20、exact-80/review closure、stop、finalizeをcompleteする。Value/pathをretainせずunchanged work/control/token/candidate bindingをrevalidateし、proxy bindingをstopまでだけ保持する。`capture/study-capture-handoff.json`、`capture/study-capture-handoff.sha256`、growing `capture/streams/product-instrumentation.ndjson`、`capture/streams/inspector-server-ledger.ndjson`、`capture/streams/study-browser.ndjson`に対してexact `pnpm run study:evidence:verify -- continuation`を実行し、same stable control session、immutable prefix、streamごとのsole matching anchor、post-anchor heartbeat progress、exact child/channel identity、restart/replacement/truncation/stitch/alternate prefix/key reuse/browser-attempt substitution 0件を要求する。Sibling edgeなしのclosed matrixをrevalidateする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Continuation/stop全体でrevalidateするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Edgeごとにordinary inherited pipe exact 2本、96-byte bootstrap後EOFなしのLF frame、authenticated ready/ack/lifecycle payload、direction-specific key、authenticationTag-null compact canonical frame + no LFのMAC、populated wireだけのLF exact 1件、role/type/sequence closure、complete bootstrap/key/frame/sequence wipeをrevalidateする。Exact `StudyBrowserBrokerDecision`とattempt-terminalization/decision payload root/enumもrevalidateする。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer`/`StudyPreReadinessProductObservationDraft`、3 exact register/buffer command/root、draft canonical observation N/A field、exact draft-before-effect/ACK-before-effect-continuation path、pre-bind no-evidence/hash/route rule、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、open-to-readiness-bound/terminalization-bound transition、readiness fresh-ID bind + response前ordered release/destroy、pre-ready N/A bind + synthesis前release/destroy、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeをrevalidateする。Sole workflow producer/routing chain moderator -> supervisor -> browser adapter -> watchdog safe-payloadをrevalidateし、harness/direct routeをrejectする。Exact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—とbyte-identical decisionをrevalidateする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでbinding/fixed scheduleを維持する。Open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、prepared/open/closed dual barrier、normal-close gate、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、exact grant/fresh proxy ID、wrong-source/concurrent/late/duplicate/cross negativeをrevalidateする。Distinct preassigned human pair/human identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く） 0件に加え、repository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、pre-first-workflow live observation、failure-only paired collector、recording/replay 0件をrevalidateする。Participant 20のremaining inspection、comparison、global-consent workflowごとにexact `StudyCurrentSubjectScoringContext` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をcreateし、scoring-moderatorだけがcall-local raw associationを持ち、matching accepted automatic correlationを最大1回acceptし、exact `StudyWorkflowOutcomeSubmission`/canonical payloadの`outcomeClass`直後へ`automaticIssueCorrelationId`をinsertする。同じrun/subject/process/workflowのalready accepted nonworkflow prohibited observationへlinkしたfailureだけを`automatic-critical`とする。他failureはexact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`、fresh isolated reviewer process 2件を使い、両human reviewerが同じlive workflowをobserveし、byte-identical safe case、hidden first vote、exact 2 voteを要求する。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとし、missing/mismatch/reused automatic ID、missing review、その他truth rowをrejectする。Issue IDは`automatic:<correlationId>`または`reviewer:<subjectId>:<workflowClass>`からderiveし、次workflow前にcontext/raw/review channel/reviewer processをdestroyする。Certified isolated profileと完了済みexact bootstrapを継続する。Bodyless 407はdeclared header 2件だけ、bodyless 204は`Connection: close`だけとする。Fetch Metadataはconsistencyだけとし、existing one-use participant navigation grantはconsumedである。Participantはgranted initial exact authorized-static navigationだけとする。Fresh no-grant/nonexact/page-script/post-consumption HTTP observationはfresh proxy IDを持つvalid-secret unknown/product-attributable/prohibited/automatic-critical/browser-only blocked rowでinvalidateせず、replay/duplicate/stale authenticated IPCまたはsimultaneous consumptionはinvalidateする。SPA、extension、unknown、missing/invalid-secret、six-header projection/discard、participant/SPA-only server claim ruleを維持する。`browserAttemptId`はsupervisor/broker、study-harness、study-browser-adapterのruntime/authenticated IPC stateだけに保ち、browser/evidenceへ入れず、attempt binding openとmarker binding activeを維持する。Timer-free adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once pair release -> single success/completion ACKをenforceし、application handlingをそのpost-release ACKまでblockする。Late claim、transaction/request end、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryではpartial pairをreleaseせずcandidate/claim/binding/marker/pending stateをwipeする。Checkpoint後はparticipant 20のremaining workflow 3件だけをcompleteする。既にclosedの19×4とparticipant-20 discovery prefixを合わせ、open attempt最大1件のままsubject 20件×4 workflowのexact 80 terminal recordを得る。Readiness後はsupervisorがfreeze/routeし、scoring-moderatorがunchanged harness scheduleに従うremaining failure/reviewをconstructし、harnessはsynthesizeせず、harness/adapter terminalizing bindingをfour outcome/closed dual ACKまで保持する。Prematureをequipment-failureへmapし、harness/orchestrator/adapter/watchdog/reviewer process failureはinvalidateする。Stop前にderived `automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` identityとcompleted reviewer voteから7 aggregate value `automaticCriticalIssueCount`、`suspectedWorkflowBlockerCount`、`reviewVoteCount`、`reviewDisagreementCount`、`reviewerCriticalIssueCount`、`criticalIssueCount`、`zeroCriticalIssueGate`をrecomputeする。`suspectedWorkflowBlockerCount`が全reviewer dispositionをcountすることと`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`を要求し、reviewer-confirmed-criticalまたはreviewer-disagreement-critical issueを`reviewerCriticalIssueCount`でexact 1回countし、`criticalIssueCount`をraw sumではなくautomatic issue IDとreviewer-critical issue IDのdeduplicated union cardinalityとし、`criticalIssueCount === 0`かつexact 80-record set completeの場合だけ`zeroCriticalIssueGate`をtrueにする。Threshold missはevidenceをcomplete/sealするがrelease approvalをblockし、automaticまたはreviewer-critical resultはexact-80 canonicalityを変えずzero gateをfalseにする。全workflow/review、registered probe、browser marker、candidate/claim join、inherited frame、current-subject contextがterminalで、live ephemeral reviewerが0件、各fresh reviewer pairがworkflow acceptance前にexitした後だけexact `pnpm run study:evidence:capture -- stop`を実行する。Proxyと全adapter-owned pinned Chromium contextをcloseし、全`StudyBrowserProxyMarkerBinding`をactive -> destroyedへ、残る`StudyCurrentSubjectScoringContext`/review-vote stateをdestroyedへtransitionし、全`browserProxyMarkerSecret`、marker/binding/install frame、HMAC seed/nonce/key/frame/sequence buffer、pending stateをdestroyする。Exact profile/revisionおよびisolated `HOME`/XDG/user-data/profile/extension/history/cache/credential-store/keychain residueがnormal、abort、crash path後にabsentであることを証明する。Basic、Fetch Metadata/Origin/Referer、correlation-header byteはrequired ephemeral loopback receipt/processingとimmediate discardだけに許可し、canonical 43-character `correlationId`以外のcapture/evidence IPCまたはretained/log/output/digest crossingを0件にする。Authenticated supervisor endpointだけをfinalization用にliveに残し、exact `processes` adapter/watchdog entry 6件とexact `orchestrators` 2件すべてのclean exitを要求する。Proxy bindingをremoveしてexact `pnpm run study:evidence:verify -- finalize`を実行し、`finalize-prepare` literal `null`、`finalize-commit`からのexact authenticated `StudyContinuityWitness` return、key destruction、endpoint EOF/reconnection/process-exit proof、stream-process exit 6件、orchestrator exit 2件、安全な`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、その後witness pairをseal pairより前にwrite/re-readする。Canonical `StudyCaptureSeal`の`streams`前へrecomputed aggregate field 7件をinsertし、`capture-start | payload | heartbeat | handoff-anchor | capture-stop`だけを維持する。Retained setをexact `distributions/participant-01`から`distributions/participant-20`、stream file 3件、`capture/study-capture-handoff.json`、`capture/study-capture-handoff.sha256`、`capture/study-continuity-witness.json`、`capture/study-continuity-witness.sha256`、`capture/study-capture-seal.json`、`capture/study-capture-seal.sha256`だけとし、sidecar、runtime control、raw marker/header、browser state、subject-response map、reviewer identity/note、secret、path、errorを0件にする。`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`にはsafe ID、fixed role/code、count、digest、threshold、aggregate value、cleanup/continuity result、pass/failだけを記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをcontinuation/finalizationでrevalidateする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

- [ ] T1058 Frozen manifestから全deterministic/runtime propagation classのSC-007をvalidate/recordし、readable complete `utf-8-replaced`、通常どおり報告されるrequest error、startup top-level propagation、prior snapshot、explicit-rescan stale ownershipを維持する。Global disableのaccept前/no-op immediate full-snapshot recovery、accept後drain/close failureでのprocess liveness・retained epoch/fence/error・retry/join/restart、purged content非復元、terminal public-state Global-sequence removal対unpublished-initial-enable unchanged-state cleanupも`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1059 Bilingual accessibility acceptance contractのSC-008 protocolを実行し、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。WCAG 2.2 Level A/AA全55 rowを固定済み38 Applicable/17 Not-applicable区分に照らして評価し、criterion固有の全Not-applicable rationaleを再validationし、必須の全stable `AUTO-*`/`MANUAL-*`/`REVIEW-*` IDを記録してApplicableな全check/evidence itemを合格させ、各`MANUAL-*` IDについてplatform/viewport/mode/scenario/inputの全1,080 key付きcellを明示的evidenceまたは許可されたcell固有N/A rationale付きで記録する。Cellの欠落、unstable/missing ID、Applicable check、rationale、mapping、evidence、result、responsive variation、またはkeyboardのみで行う4つのprimary workflowのfailure/欠落が1つでもあればseverityにかかわらずSC-008を不合格とする
- [ ] T1060 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase IDをvalidateして記録し、documented initial-release Source Condition Fact row、supported tool、product surface、documented-condition/unavailable-state classごとに、そのexactで非ゼロのdenominatorとdeclared minimum coverageに照らしてSC-009 pass/failを記録する。宣言された全caseが正しいSource、tool、product surface、conditionまたはunavailable state、evidenceを持ち、physical/synthetic file、file ID、Source-relative Path、authored source text、comparison target、relationship origin、local/hosted read、network requestが0件であることを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で証明する
- [ ] T1061 Release-candidateのcomplete diff/tarball reviewを実施し、全checked branch/resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`、`specs/001-inspect-agent-customizations/data-model.md`、`specs/001-inspect-agent-customizations/data-model.ja.md`のpaired normative protocol/model、`tests/usability/sc001-sc006-study-inputs/`配下のclosed inputs/study kit、exact `./package.json` study command、self-contained static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`、`tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`のcomplete positive/negative coverageをreviewする。Scoped raw boundaryが全artifact、serializer、adapter、verifier、log、validation record、sentinel testで一致することを要求する。Raw Basic credential、raw `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに存在でき、直ちにdiscardする。Capture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed exceptionとする。Supervisor ownershipとfresh attempt ID/bindingのlimited runtime distribution、study-browser-adapterへのdirect prepared-only marker install、adapter bootstrap、success ACKでmarker copyだけをatomic activateし、attemptをreadiness/open-snapshot dual ACKまでpreparedに維持すること、prepared failure destruction、browser/evidence exposure banをreviewする。Run-level capture startが全per-attempt profile/secret/bootstrapに先行することを確認する。Certified browser profileとexact bootstrap—exact declared header setのbodyless 407、canonical retry 1件、sole `Connection: close`のbodyless 204、effect/residue 0件—をreviewする。Exact one-use `StudyParticipantNavigationGrant`をreviewし、Fetch Metadataをconsistencyだけにする。Participantにはcurrent armed grant + exact tuple + static targetを要求し、grantなし/replay/nonexact/page-script mutationをopen IDsのvalid-secret unknown、attributable/prohibited/automatic-critical/browser-onlyにする。SPA/extension/other-secret actor row、six-header projection/discard、participant/SPA-only server claimを維持する。Allowed edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をreviewし、environment/argv/file/socket/named/control endpointを0件にする。Parent-to-child pipeはexact 96 binary byte、32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`で始まり、same pipeをopenのままLF-framed parent-to-child messageへcontinueする。Childはframe parse前にexact 96 byteをconsumeし、96 byte前のEOF/closeをrejectし、byte 96後の全byteをframe dataとして扱い、bootstrapとframeの間にEOFを期待しない。Child-to-parent first frameはauthenticated `ready` sequence `0`とする。Sibling edgeなしのexact closed matrixをreviewする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Reviewするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact `StudyBrowserBrokerDecision`、grant、attempt-terminalization/decision、workflow-outcome、`StudySafetyReviewCase` payload root/enumをreviewする。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer` root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A field/no-prebind-evidence rule、private buffer ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeをreviewする。Sole moderator production/supervisor routingとexact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—をreviewする。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、cross-case reuse/recording/replay 0件をreviewする。Exact frame rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`から開始してexact +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`と`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`を要求する。MAC preimageを`ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated compact JSON wire frameへexactly one LFを加える。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`を要求する。Constant-time tag verification、direction-specific key、first authenticated ready後だけの`channelSeed`/`bootstrapNonce` destruction、matrix/role/type/channel/direction/sequence closure、replay/order/partial/trailing/late/post-close/child-exit failure、control-enum expansionなしのcomplete key/frame/sequence wipeをreviewする。Timer-free brokerがadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> safe browser/server pair exactly-once release -> success/completion ACK exact 1件をatomicに実行し、application handlingをpost-release ACKまでblockすることを確認する。Late claim、unmatched transaction/request、connection close/error、IPC EOF/close/error、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryではtransactionをcloseし、partial pairをreleaseせずcandidate/claim/binding/marker/pending stateをwipeする。`automaticIssueCorrelationId`と`terminalizationClass`を持つexpanded scoring context exact rootをreviewする。Correlation `not-applicable` -> first matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic correlationをsubmission/canonical payloadの`outcomeClass`直後に置きfailure-link candidateだけとして扱う。Successは常にN/A/no-review、eligible accepted exact same-run/subject/process/workflow observationを持つfailureはautomatic-critical/no-review、candidate-free failureはN/A + exact reviewとする。他failureはexact review case、moderator call-local raw input、either vote前のfresh isolated reviewer pair、byte-identical safe case、same live workflowをobserveするhuman 2人、hidden first vote、acceptance前process exitを要求する。Allowed disposition 5件、valid truth row、exact derived automatic/reviewer ID、context/reviewer cleanup、missing/mismatch/reuse/leakage/reuse negativeをenforceする。Seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をtrustせずrecomputeし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、reviewer-confirmed-criticalまたはreviewer-disagreement-critical derived issueごとの`reviewerCriticalIssueCount` entry 1件、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplicated-union cardinalityとしての`criticalIssueCount`、total 0かつcomplete exact-80 setの場合だけの`zeroCriticalIssueGate`をverifyする。Participant 01–19のfour-workflow後close、participant 20 discovery/checkpoint/remaining-three continuation、open attempt最大1件、product/browser/equipment/premature-probeについてsupervisorがrouteしscoring-moderatorがunchanged harness scheduleでconstructしharness/adapter bindingをclosed dual ACKまで保持するterminalizing synthesis（premature -> equipment-failure）、harness/orchestrator/adapter/watchdog/reviewer failureのrun invalidationを確認する。Exact self-reexec mode/process tree、startのexact `processes` 6件 + exact ordered `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived clean exit 8件、witnessのstream exit 6件/orchestrator exit 2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 20×4 workflow cardinality、unchanged record kind/effect row/sole-writer chain、heartbeat boundary、handoff anchor、stable control session、finalize teardown、witness-before-seal order、exact retained distribution/stream/handoff/witness/seal pair、sidecar/runtime control/raw/browser/reviewer/mapping residue 0件を確認する。最後にtask parserのexact 1,079 ID、104 phase、57 trace row、owned-path parity、self-contained task text、bilingual semantic/code-literal parity、全focused/complete gate resultをreviewし、untested branch、stale architecture term、failed check、missing evidence、privacy residue、unresolved concernがあればT1062/T1063をblockする。 加えて、次のbrowser-observation、outcome、ordering invariantをcomplete diff/tarball/evidenceからreviewする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
- [ ] T1062 T1061 concernが0件になるまでrelease-review remediation/evidence-invalidation loopを実行する。Paired study kit/input byte/descriptor、scoped correlation privacy boundary、`StudyBrowserAttemptBinding`/`StudyBrowserRequestCandidate`/`StudyServerCorrelationClaim`、exact runtime `StudyBrowserProxyMarkerBinding`/`StudyParticipantNavigationGrant`/`StudyCurrentSubjectScoringContext`/`StudySafetyReviewCase`/`StudySafetyReviewVote` root/lifecycle、exact `StudyBrowserBrokerDecision`/`StudyAttemptTerminalization` payload、attempt-binding replication/ACK barrier、`browserAttemptId`/`browserProxyMarkerSecret`、certified Chromium profile/bootstrap/Fetch Metadata table、inherited IPC bootstrap/frame/HMAC/payload root、process topology、timer-free broker ordering、workflow producer/routing、reviewer assignment/review fields/truth table、automatic/reviewer issue identity、seal aggregate、exact 80/threshold logic、record kind/chain、handoff/witness/seal、retained layout、cleanup、privacy schemaに影響するrepository editは、prior focused gateとcomplete T1056–T1057 evidenceを無効にする。各edit後、まず`pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を再実行する。Scoped raw boundaryをpositive/negativeに証明する。Raw Basic credential、raw `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに存在でき直ちにdiscardし、capture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed exceptionとする。Supervisor-owned fresh attempt/marker generation、study-browser-adapterへのdirect prepared-only install、adapter bootstrap ACKでmarker copyだけをatomic activateし、attemptをreadiness/open-snapshot dual ACKまでpreparedに維持すること、failure destruction、limited attempt-ID runtime distribution、browser/evidence exposure 0件を再証明する。Run-level capture start後、stream live中の各attempt直前にfresh profile/secret/bootstrapを行う。Certified exact profile/bootstrapの407 exact two-header set、Basic retry 1件、204 sole-header set、effect/residue 0件を再証明する。Exact one-use `StudyParticipantNavigationGrant` lifecycle、Fetch-Metadata consistency-only actor classification、grantなし/replay/nonexact/page-script participant-shaped negativeのvalid-secret unknown automatic-critical/browser-only処理、全SPA/extension/missing-invalid/header discard/forwarding/server-claim ruleを再証明する。Allowed edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をreal-child testで再実行し、environment/argv/file/socket/named/control endpointを0件にする。Parent-to-child exact 96-byte binary prefix、32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`からsame open pipe上でEOFなしにLF frameへcontinueすること、childがparse前にexact 96 byteをconsumeしてEOF/close-before-96をrejectしpost-96 byteを全てframe dataとして扱うこと、child-to-parent first authenticated `ready` sequence `0`を再証明する。Sibling edgeなしのexact closed matrixをrerunする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） 各invalidation後にreproveするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact browser-broker-decision、grant、terminalization、workflow-outcome、review-case payload root/enumを再証明する。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer` root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A field/no-prebind-evidence rule、private buffer ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeを再証明する。Sole moderator production/supervisor routingとexact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—を再証明する。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、cross-case reuse/recording/replay 0件を再証明する。Exact frame root `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、各direction `0` then exact +1、`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、MAC preimage `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated compact JSON wire frameだけへのexactly one LFを要求する。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`と`schemaVersion: 1`とcanonical nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`、constant-time verification、direction-specific key、one-use bootstrap、role/message closure、replay/order/partial/trailing/late/post-close/child-exit/wipe rejection、control-command expansion 0件を要求する。Timer-free atomic order adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once safe pair release -> success/completion ACK exact 1件を再証明し、application handlingをpost-release ACKまでblockする。Late claim、unmatched transaction/request、connection close/error、IPC EOF/close/error、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryでcandidate/claim/binding/marker/pending stateをclose/wipeし、partial pairをreleaseしないことを再証明する。Expanded scoring context root/lifecycleを再証明する。Automatic correlation `not-applicable` -> first matching accepted ID once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic correlationをoutcomeClass直後へ置き、same-run/subject/process/workflow accepted-observation linkを要求する。全nonautomatic failureでexact review-case root、moderator-owned call-local raw response/rubric、either vote前のfresh isolated reviewer process 2件とbyte-identical case、same-live-workflow human observation、hidden first vote、acceptance前の両exitを再証明する。Allowed disposition 5件だけ、全truth row、derived issue identity、missing/mismatch/reuse/leakage negativeをenforceする。`automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutation-testし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、exact confirmed/disagreement counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplicated union、total/zero-gate equationを含める。Focused gateがpassしたらcomplete T1049–T1050 automated gateを再実行しcandidateをrebuild/freezeする。New empty external work root、endpoint、token、certified isolated browser surface、marker secret、IPC seed/nonce/channel ID、process ID、study IDをprovisionし、independent issue IDはprovisionしない。Candidate/proxyをreadせずinputをrematerialize/verifyし、final candidateをstart時だけbindする。Participant 01–19 four-workflow close、participant 20 discovery checkpoint/remaining-three continuation、open attempt最大1件、exact terminalization synthesis/invalidation branch、exact 80 workflow/review、aggregate recomputation、stop、cleanup、finalize witness/teardown、witness-before-seal outputまでcomplete T1056とT1057を再実行する。Exact self-reexec mode/process tree、startのexact `processes` 6件 + exact ordered `orchestrators` 2件、stopのreviewer 0件/long-lived exit 8件、witnessのstream exit 6件/orchestrator exit 2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`を再証明する。Resulting complete diff/tarballに対してT1061を再実行し、concernが残る間T1061 → remediation → focused gate → complete gate → full studyを反復する。Concern 0件の後だけ、exact retained distribution、stream 3件、handoff pair、continuity-witness pair、capture-seal pair、record kind 5件、threshold independence、exact six-plus-two long-lived exitとreviewer-exit equation、aggregate equation 7件、prohibited residue 0件、exact task ID 1,079件、phase 104件、trace row 57件、T001–T1079 coverage、English/Japanese owned-path/semantic parity、stale architecture term 0件、`git diff --check`をverifyする。全invalidation、rerun、digest、safe count、aggregate、cleanup、final resultに加えて、SC-003/SC-004/SC-005/SC-007/SC-009のrelease-evidence fixture-manifest transition record—実際の初回manifest作成をprior revisionなしとして記録するか、またはpriorとcurrentの`manifestVersion`値、変更されたcase ID・required-class定義・expected outcome、および各denominator-semantics変更に対する明示的なreviewer decision/review reference(automated transition contract testはこのhuman reviewを確立しない)—を`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録し、`specs/001-inspect-agent-customizations/tasks.md`と`specs/001-inspect-agent-customizations/tasks.ja.md`を再checkし、failed threshold/gate、stale evidence、missing review、privacy residue、unresolved concernがあればT1063をblockする。 加えて、次のbrowser-observation、outcome、ordering invariantを各invalidation/rerun後にreproveする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

- [ ] T1063 Dependency/breaking-change rationale、migration impact、全violation解消、各residual uncertaintyのowner/resolution pathを含むprinciple-by-principle release Constitution Checkを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ実施・記録し、matching pull-request review checkを要求する。そのbilingual recordをT1062後のsole planned validation-only editとしrepositoryをfreezeする。Frozen tree/final candidateへ、build、frozen install、lint、typecheck、unit、contract、integration、security、package、performance、browser、coverage、documentation、lower-bound candidate checkを含むT1049–T1051の全applicable automated gateを再実行し、unchanged candidate/profile/fixture/human/manual evidence bindingを検証し、T1061 complete-diff/tarball inspectionをread-onlyで反復し、最後に`pnpm run test:docs`と`git diff --check`を実行する。Outcomeはexternal release/pull-request check logだけへcaptureする。Failure、concern、または後続repository editがあれば全outcome/approvalを無効にし、T1063だけでなくT1062へ戻してdigest/evidence再validation、applicable rerun、complete-diff review後にT1063を再開しなければならない（MUST）

---

## ストーリーカバレッジマトリクス

| フェーズ | 主要ストーリー範囲 | 累積マイルストーン |
|---:|---|---|
| 1 Setup | 共通前提 | コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。 |
| 2 Minimal Secure Foundation | 共通前提 | セキュリティとパッケージの基盤が単独で合格し、単一のinspection moduleの外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。 |
| 3 起動可能な認可済み空画面 | US1 | ブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。 |
| 4 Codex SKILL 一覧 | US1 | Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。 |
| 5 Codex SKILL 詳細 | US2 | Codex SKILL を選択すると、完全で inert な detail 画面が開きます。 |
| 6 Codex SKILL metadata 一覧 | US1 | 独立して識別された Codex skill-metadata file を、その seed `SKILL.md` file と混同せずに表示できます。 |
| 7 Codex SKILL metadata 詳細 | US2 | `agents/openai.yaml` を選択すると、owner の SKILL detail とは別の、完全で inert な detail 画面が開きます。 |
| 8 Claude SKILL 一覧 | US1 | Claude と Codex の SKILL 一覧が同じ inventory に共存します。 |
| 9 Claude SKILL 詳細 | US2 | Claude SKILL detail が完成し、Codex detail と一貫します。 |
| 10 Copilot SKILL 一覧 | US1 | Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。 |
| 11 Copilot SKILL 詳細 | US2 | Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。 |
| 12 統合 SKILL inventory | US1 | 完全な skill-first inventory を filter して理解できます。 |
| 13 SKILL 比較 | US3 | 読み取り可能な任意の2つのdistinct SKILL file IDを、activationもmutationもせずに比較できます。 |
| 14 SKILL metadata 比較 | US3 | authored sensitive value を含めて 2 つの Codex skill-metadata file を、environment reference を解決せず seed skill と混同することなく比較できます。 |
| 15 Codex Instructions inventory | US1 | 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。 |
| 16 Codex Instructions 詳細 | US2 | 静的な Codex instruction を選択すると、明示的な order、byte budget、condition、carrier 受け入れ前であることを正直に示す fallback status を備えた、完全で inert な detail が開きます。 |
| 17 Claude Instructions inventory | US1 | 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction file を filter できます。 |
| 18 Claude Instructions 詳細 | US2 | Claude instruction を選択すると、参照 file を import せず、完全で inert な layered detail が表示されます。 |
| 19 Copilot Instructions inventory | US1 | surface-qualified provenance と明示的な exclusion を持つ Copilot instruction candidate を filter できます。 |
| 20 Copilot Instructions 詳細 | US2 | Copilot instruction を選択すると、別々の surface interpretation と uncertainty が表示されます。 |
| 21 統合 Instructions inventory | US1 | 完全な静的 instruction inventory、すべての shared-file interpretation、および MCP が最小 carrier を受け入れたときに有効になる一つのconfigured fallback integration を理解できます。 |
| 22 Instructions 比較 | US3 | 二つの instruction file を比較し、構造上の difference を理解できます。 |
| 23 Codex MCP carrier と内包宣言 | US1 | 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングでき、フェーズ 15 の configured instruction fallback が表示されます。完全な configuration inventory/detail はフェーズ 57～58 まで延期します。 |
| 24 Codex MCP の詳細 | US2 | Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。 |
| 25 Claude MCP ファイルのインベントリ | US1 | ユーザーは、正確なルート来歴を持つ Claude プロジェクト MCP ファイルをフィルタリングできる。 |
| 26 Claude MCP ファイルの詳細 | US2 | Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。 |
| 27 Claude 内包 MCP core | US2 | Claude の skill-contained MCP fact が既存 owner 上に表示され、root `.mcp.json` と区別されたままになります。後続 owner family は、MCP matching や connection safety を変更せず、事前テスト済み adapter を有効化できます。 |
| 28 Copilot CLI MCP ファイルのインベントリ | US1 | ユーザーは、コンテキストとスキーマの来歴を備えた Copilot CLI MCP ファイルをフィルタリングできる。 |
| 29 Copilot CLI MCP の詳細 | US2 | Copilot CLI MCP ファイルを選択すると、正確なローカル順序と不確実性が表示される。 |
| 30 Copilot VS Code MCP ファイルのインベントリ | US1 | ユーザーは、VS Code の `servers` スキーマを Copilot CLI MCP ファイルと区別して識別できる。 |
| 31 Copilot VS Code MCP の詳細 | US2 | VS Code MCP file を選択すると、完全で inert な schema-specific detail と uncertainty が表示される。 |
| 32 Copilot agent-contained MCP contract と Cloud runtime fact | US2 | Origin fileを持たない Cloud MCP fact と unavailable 状態が表示されます。Custom Agents wave が owner を受け入れて事前テスト済み adapter を有効化するまでは、local agent-contained row は現れません。 |
| 33 Priority MCP インベントリ | US1 | Priority MCP inventory を利用し、読み取り可能な physical file/owner と origin fileを持たない runtime fact を区別でき、まだ受け入れられていない owner family の premature row は表示されません。 |
| 34 MCP 比較 | US3 | ユーザーは MCP 宣言に接続せずに比較できる。 |
| 35 Codex Rules inventory | US1 | trust、layer、experimental-status、direct-child provenance を持つ Codex rule を filter できます。 |
| 36 Codex Rules の詳細 | US2 | Codex rule を選択すると、それを execute/enforce せず、完全で inert な detail が開く。 |
| 37 Claude Rules のインベントリ | US1 | ユーザーは path applicability provenance を備え、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。 |
| 38 Claude Rules の詳細 | US2 | Claude rule を選択すると、任意の filesystem path に対して glob を evaluate せず、完全で inert な applicability detail が表示される。 |
| 39 Rules の比較 | US3 | どちらの rule が正しいか、または強いかを評価せずに rule ファイルを比較できる。 |
| 40 Claude Commands のインベントリ | US1 | ユーザーは再帰的な namespace と layer provenance を備えた Claude command をフィルタリングできる。 |
| 41 Claude Commands の詳細 | US2 | Claude command を選択すると、参照 target を execute、import、read せず、完全で inert な detail が開く。 |
| 42 Copilot Commands のインベントリ | US1 | ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。 |
| 43 Copilot Commands の詳細 | US2 | Copilot command を選択すると、完全で inert な CLI-qualified detail と uncertainty が表示される。 |
| 44 統合 Commands インベントリ | US1 | ユーザーは共有 root command と nested Claude-only command を区別できる。 |
| 45 Commands の比較 | US3 | command ファイルを実行せずに比較できる。 |
| 46 Copilot Prompts のインベントリ | US1 | ユーザーは正確な default-location provenance を備えた対応 Copilot prompt をフィルタリングできる。 |
| 47 Copilot Prompts の詳細 | US2 | Copilot prompt を選択すると、参照 target へ navigate したり read したりせず、完全で inert な detail が開く。 |
| 48 Copilot Prompts の比較 | US3 | コンテンツへ移動したり実行したりせずに Copilot prompt を比較できる。 |
| 49 Codex Custom Agents inventory | US1 | 正確な project-layer provenance を持つ Codex custom-agent file を filter できます。 |
| 50 Codex Custom Agents 詳細 | US2 | Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で inert な spawned-session detail と carrier-inheritance relationship が表示されます。 |
| 51 Claude Custom Agents inventory | US1 | layer provenance と duplicate-name uncertainty を持つ Claude custom agent を filter できます。 |
| 52 Claude Custom Agents 詳細 | US2 | Claude custom agent を選択すると、memory を read したり MCP に connect したりせず、完全で inert な context/relationship detail が表示されます。 |
| 53 Copilot Custom Agents inventory | US1 | surface-qualified provenance を持つ Copilot custom agent を filter できます。 |
| 54 Copilot Custom Agents 詳細 | US2 | Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。 |
| 55 統合 Custom Agents inventory | US1 | 完全な custom-agent inventory、共有 Claude/Copilot interpretation と owner-attached MCP fact、および duplicate file や誤った MCP ownership を伴わない Codex carrier-inheritance relationship を理解できます。 |
| 56 Custom Agents 比較 | US3 | custom-agent definition を実行または ranking せずに比較できます。 |
| 57 Codex Configuration recognition | US1 | MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。 |
| 58 Codex Configuration 詳細 | US2 | `.codex/config.toml` を選択すると、宣言された target を読み取らず、完全で inert な typed configuration と fallback declaration が表示されます。 |
| 59 Claude Settings inventory | US1 | exact-launch Claude settings file と、その project/local layer を識別できます。 |
| 60 Claude Settings 詳細 | US2 | Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、完全で inert な layer-aware detail と owner-attached MCP が表示されます。 |
| 61 Copilot Settings inventory | US1 | 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate と surface provenance を識別できます。 |
| 62 Copilot Settings 詳細 | US2 | Copilot settings を選択すると、plugin の enable や contained Hook の compose を行わず、完全で inert な surface-qualified detail が表示されます。 |
| 63 統合 Settings/Configuration inventory | US1 | 完全な settings/configuration inventory をフィルタリングでき、Claude settings-owned MCP、Copilot non-ownership、既存 Codex carrier を区別できます。 |
| 64 Settings/Configuration 比較 | US3 | value を適用したり declaration を昇格させたりせず、settings/configuration を比較できます。 |
| 65 Claude Output Styles のインベントリ | US1 | ユーザーは layer provenance を備えた対応 Claude output style をフィルタリングできる。 |
| 66 Claude Output Styles の詳細 | US2 | output style を選択すると、style を適用せず、完全で inert な detail が開く。 |
| 67 Claude Output Styles の比較 | US3 | どちらの style も適用せずに Claude output style を比較できる。 |
| 68 Codex Marketplaces のインベントリ | US1 | registration、installation、enablement を示唆せずに authored Codex marketplace catalog をフィルタリングできる。 |
| 69 Codex Marketplaces の詳細 | US2 | Codex marketplace を選択すると、plugin manifest を開かず、完全で inert な authored entry と local-source relationship が表示される。 |
| 70 Claude Marketplaces のインベントリ | US1 | presence を registration と誤認せずに authored Claude marketplace catalog を識別できる。 |
| 71 Claude Marketplaces の詳細 | US2 | Claude marketplace を選択すると、registration、activation、connection を主張せず、完全で inert な authored metadata、source relationship、owner-attached MCP が表示される。 |
| 72 Copilot Marketplaces インベントリ | US1 | ユーザーは、正確なルート形式と surface の来歴を備えた Copilot marketplace カタログをフィルタリングできる。 |
| 73 Copilot Marketplaces の詳細 | US2 | Copilot marketplace を選択すると、plugin manifest を読み取らず、完全で inert な authored entry と direct one-edge local-source plan が表示される。 |
| 74 統合 Marketplaces インベントリ | US1 | 一つの共有 authored catalog 上のすべての marketplace interpretation と Claude owner-attached MCP を理解できる。 |
| 75 Marketplaces 比較 | US3 | ユーザーは何も取得、インストール、アクティベートせずに marketplace カタログを比較できる。 |
| 76 Codex Plugin Manifests インベントリ | US1 | ユーザーは、静的または marketplace 由来の来歴を備えた作成済み Codex plugin manifest をフィルタリングできる。 |
| 77 Codex Plugin Manifests の詳細 | US2 | Codex plugin manifest を選択すると、どの component も load せず、完全で inert な authored metadata が表示される。 |
| 78 Claude Plugin Manifests インベントリ | US1 | ユーザーは、明示的なルートまたは marketplace 由来の来歴を備えた Claude plugin manifest をフィルタリングできる。 |
| 79 Claude Plugin Manifests の詳細 | US2 | Claude plugin manifest を選択すると、activation せず、完全で inert な authored metadata と component relationship が表示される。 |
| 80 Copilot Plugin Manifests インベントリ | US1 | ユーザーは、正確な形式、静的/導出来歴、surface 条件を備えた Copilot plugin manifest をフィルタリングできる。 |
| 81 Copilot Plugin Manifests の詳細 | US2 | Copilot plugin manifest を選択すると、コンポーネントをロードせずに、作成済みメタデータと条件付きランタイム状態が表示される。 |
| 82 統合 Plugin Manifests インベントリ | US1 | ユーザーは、作成済み plugin manifest に対するサポート対象のすべての解釈を理解し、Claude の owner-attached MCP を読み取り不能なコンポーネントパスと区別できる。 |
| 83 Plugin Manifests 比較 | US3 | ユーザーは、コンポーネントをロードまたは実行せずに plugin manifest を比較できる。 |
| 84 Codex の独立 Hook ファイルインベントリ | US1 | ユーザーは、コマンドを一切実行せずに独立 Codex hook ファイルをフィルタリングできる。 |
| 85 Codex Hook の詳細 | US1 + US2 | Codex Hook 認識を選択すると、実行せずに正確な加算セマンティクスと警告が表示される。 |
| 86 Claude の内包 Hook 宣言 | US1 | ユーザーは、捏造された hook ファイルを見ることなく、所有ファイル上の Claude 内包 Hook 認識をフィルタリングできる。 |
| 87 Claude Hook の詳細 | US2 | Claude Hook 認識を選択すると、実行せずに正確な composition セマンティクスが表示される。 |
| 88 Copilot の独立 Hook ファイルインベントリ | US1 | ユーザーは、VS Code、CLI、Cloud の来歴を備えた独立 Copilot hook ファイルをフィルタリングできる。 |
| 89 Copilot Hook の詳細 | US1 + US2 | Copilot Hook 認識を選択すると、実行せずに正確な surface composition が表示される。 |
| 90 統合 Hook インベントリ | US1 | ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。 |
| 91 Hook 比較 | US3 | ユーザーは hook 宣言を実行せずに比較できる。 |
| 92 Repository インベントリの受け入れ | US1 | 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。 |
| 93 Repository 詳細の受け入れ | US2 | 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。 |
| 94 Repository 比較の受け入れ | US3 | 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。 |
| 95 Global 同意プレビュー | US4 | ユーザーは検査を有効にする前に、正確な Global root、exclusion、lexicalなvalidity state、contract versionを確認できる（read scopeは平易な言葉で説明する）。 |
| 96 Fixed-Three Global Enable基盤とCodex Batch Member | US4 | Controlはfixed tupleとone shared enable/batch operationを公開し、Codexはone possible memberとなり、atomic commit前にGlobal Sourceを一切publishしない。 |
| 97 Claude Global Batch Member | US4 | Claude admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 98 Copilot Global Batch Member | US4 | Copilot admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 99 Atomic Global Batch Result統合 | US4 | 別々に識別される0〜3個のone-root tool Sourceがexactly one completeまたはpartial generationで同時に現れ、detail/comparison workflowを再利用する。 |
| 100 Global の再スキャンと回復 | US4 | ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。 |
| 101 Global 無効化バリアと解体 | US4 | Global 検査を無効にすると、そのセッション状態が完全に解体され、Repository 検査は引き続き利用できる。 |
| 102 ドキュメント、エビデンス、依存関係のレビュー | リリースエビデンス | 横断suiteがartifactを検証する前に、メンテナーがreview可能なguidance、evidence provenance、dependency decisionを利用できる。 |
| 103 横断的な検証 | 回帰 | 文書化済みの完成productが横断的な自動regression layerを通過する。 |
| 104 リリースと成果エビデンス | 測定可能な成果 | 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスク、憲章準拠のエビデンスを備え、公開可能な状態になる。 |

## 依存関係と実行順序

### フェーズ間の依存関係

```text
Setup
  → Minimal Secure Foundation
  → Bootable Authorized Empty Screen
  → Codex Skill List → Codex Skill Detail
  → Codex Skill Metadata List → Codex Skill Metadata Detail
  → Claude Skill List → Claude Skill Detail
  → Copilot Skill List → Copilot Skill Detail
  → Unified Skill Inventory → Skill Comparison → Skill Metadata Comparison
  → Codex Instructions Inventory → Codex Instructions Detail
  → Claude Instructions Inventory → Claude Instructions Detail
  → Copilot Instructions Inventory → Copilot Instructions Detail
  → Unified Instructions Inventory → Instructions Comparison
  → Codex MCP Carrier and Contained Declarations → Codex MCP Detail
  → Claude MCP Files Inventory → Claude MCP File Detail → Claude Contained MCP Core
  → Copilot CLI MCP Files Inventory → Copilot CLI MCP Detail
  → Copilot VS Code MCP File Inventory → Copilot VS Code MCP Detail
  → Copilot Agent-Contained MCP Contract and Cloud Runtime Facts
  → Priority MCP Inventory → MCP Comparison
  → Codex Rules Inventory → Codex Rules Detail
  → Claude Rules Inventory → Claude Rules Detail → Rules Comparison
  → Claude Commands Inventory → Claude Commands Detail
  → Copilot Commands Inventory → Copilot Commands Detail
  → Unified Commands Inventory → Commands Comparison
  → Copilot Prompts Inventory → Copilot Prompts Detail → Copilot Prompts Comparison
  → Codex Custom Agents Inventory → Codex Custom Agents Detail
  → Claude Custom Agents Inventory → Claude Custom Agents Detail
  → Copilot Custom Agents Inventory → Copilot Custom Agents Detail
  → Unified Custom Agents Inventory → Custom Agents Comparison
  → Codex Configuration Recognition → Codex Configuration Detail
  → Claude Settings Inventory → Claude Settings Detail
  → Copilot Settings Inventory → Copilot Settings Detail
  → Unified Settings and Configuration Inventory → Settings and Configuration Comparison
  → Claude Output Styles Inventory → Claude Output Styles Detail → Claude Output Styles Comparison
  → Codex Marketplaces Inventory → Codex Marketplaces Detail
  → Claude Marketplaces Inventory → Claude Marketplaces Detail
  → Copilot Marketplaces Inventory → Copilot Marketplaces Detail
  → Unified Marketplaces Inventory → Marketplaces Comparison
  → Codex Plugin Manifests Inventory → Codex Plugin Manifests Detail
  → Claude Plugin Manifests Inventory → Claude Plugin Manifests Detail
  → Copilot Plugin Manifests Inventory → Copilot Plugin Manifests Detail
  → Unified Plugin Manifests Inventory → Plugin Manifests Comparison
  → Codex Standalone Hook Files Inventory → Codex Hook Detail
  → Claude Contained Hook Declarations → Claude Hook Detail
  → Copilot Standalone Hook Files Inventory → Copilot Hook Detail
  → Unified Hook Inventory → Hook Comparison
  → Repository Inventory Acceptance → Repository Detail Acceptance → Repository Comparison Acceptance
  → Global Consent Preview
  → Fixed-Three Global Enable Foundation and Codex Batch Member
  → Claude Global Batch Member
  → Copilot Global Batch Member
  → Atomic Global Batch Result Integration
  → Global Rescan and Recovery
  → Global Disable Barrier and Teardown
  → Documentation, Evidence, and Dependency Review
  → Cross-Cutting Verification
  → Release and Outcome Evidence
```

- Delivery milestoneは厳密に順次実行する。後続milestoneが先行product sliceを再利用して回帰テストするためである。Phase 96–99だけは単一composite milestoneであり、numbered sliceを順に実行するがPhase 96–98をgreenまたはrelease可能と宣言せず、3つのreal member portがall-real-port suiteをpassしたPhase 99だけがmilestoneをcloseする。
- 通常phaseではfixture/failing testをimplementationより先に行う。Phase-96–99 composite milestoneでは各sliceのtestをそのsliceのimplementationより先に行い、generic coordinator testはtyped port outcomeだけをinjectでき、all-real-port acceptance suiteはPhase 99までredのままとする。Implementation sectionはtest fileを編集しない。
- フェーズ 15 は configuration 読み取りを許可せずに純粋な Codex fallback 宣言インターフェースを定義する。フェーズ 23 は最小の `.codex/config.toml` carrier をアトミックに受け入れ、`codex.repo.config` と `codex.derived.fallback-basename` を登録し、Codex MCP 宣言と同時にconfigured instruction fallback を有効化する。
- フェーズ 27 は、将来の settings、custom-agent、marketplace、plugin-manifest 所有者に対する Claude owner-gated MCP adapter を定義する。フェーズ 52、60、71、79 は、対応する所有者ファミリーが独立して受け入れられた後にだけ、それらの adapter を有効化する。フェーズ 32 は Copilot custom agent に同じ dormant-owner パターンを使い、フェーズ 54 で有効化する。
- フェーズ 57～58 は、すでに受け入れられた Codex configuration carrier を `settings/config` 認識と完全な詳細表示で拡張する。二つ目の候補、物理読み取り、fallback ルール、MCP 認識は追加しない。
- Marketplace の詳細を plugin-manifest インベントリより先に行い、検証済みのローカルソース宣言だけが 1 つのdirect one-edge derivationのシードになれるようにする。
- フェーズ 61 は、以前の MCP フェーズでパス不一致のまま保持した Copilot VS Code settings の正確な除外を所有する。フェーズ 77 と 79 も同様に Codex と Claude の正確な plugin-file 除外を所有し、受け入れ済み候補を変えずに以前の MCP パス不一致コンテキストを更新する。
- すべての所有者ファミリーを Hook 認識より先に行う。内包 Hook 認識はすでに受け入れられた所有者を再利用する。一方、priority MCP 認識は、受け入れ済み carrier または、所有者が存在するまで読み取りも認識の公開もできない dormant な owner-gated adapter を介して先に提供する。
- フェーズ 96 はgeneric selector-free fixed-three coordinator、3つのclosed typed admission port、Codex real port、test-only injected outcome coverageを確立するがproduction all-three activationを主張しない。フェーズ 97〜98 は同じopen composite milestoneへreal Claude/Copilot portをbindする。フェーズ 99は全real portを通じてfixed-three permutationを再検証しendpoint/atomic publicationを完成させ、全admitted separately identified one-root Sourceをexactly one completeまたはpartial generationで同時にpublishする。その時点だけcomposite milestoneをgreenとし、その後のexplicit Global rescanはsingle-Source operationのままとする。
- フェーズ 102 のT1037はsemantic evidence-drift gateである。このgate通過後は、semanticに変化しないreview済みPhase-102 citation/evidence metadata correctionがproduction registryを更新できるが、accepted normative behavior、rule、strategy、Presentation Allowlist、registry shape、conformance changeはcurrent bilingual task setをsupersedeし、後続old ID前にsynchronized artifactとreplanningを要求する。
- フェーズ 103 のT1041は後続のpre-release hard cross-artifact gateである。T999がproduction registry、T1038が影響conformance recordをmaterialize済みでなければならず、manifest/documentation/traceability suiteはそのfinal state、existing local/CI command、宣言済みlater release/final rerunをverifyするがT1048前のfuture release workflowを要求しない。T1041-owned manifest/test fileのfailureはT1041内でcorrect/rerunし、authoritative external artifact concernはT1062を待たずcurrent task setをsupersedeしてsynchronized replanning/regenerationを要求する。そのdisposition後にunresolved concernが0件の場合だけverification-only T1042またはcurrent IDの後続taskを開始できる。
- Repository のインベントリ、詳細、比較の受け入れが US1、US2、US3 を完成させる。Global 無効化バリアと解体は、US4 が完成する最初のフェーズである。

## 並行実行の機会

- 依存関係のベースラインと実行可能なコマンドを凍結した後、セットアップ設定ファイルを並行して進められる。
- 最小限の安全な基盤では、共有 DTO/Diagnostic/environment-failure テスト、package-policy テスト、filesystem-fixture の準備は異なるファイルを使用し、マークされた箇所で並行して進められる。
- ベンダー Inventory フェーズ内では、そのフェーズのフィクスチャと適合行が完成した後、かつ正確なファイルセットが重複しない場合に限り、matcher、recognizer、integration、API、browser の各テストを並行して進められる。
- ベンダー Detail フェーズ内では、metadata、relationship、zero-activation、API、browser の各テストは通常別ファイルを使用し、マークされた箇所で並行して進められる。同じ parser ファイルに対する作業は順次実行のままとする。
- ベンダーフェーズ自体は、実装ファイルが異なる場合でもマイルストーン単位で順次実行する。次の各目に見えるマイルストーンが、先行するベンダースライスを回帰テストする必要があるためである。
- Marketplace ベンダーは、自身の Detail フェーズと並行して plugin 候補を導出できない。plugin 導出は、ローカルソース抽出が通過した後にだけ開始する。
- Codex、Claude、Copilot の plugin recognizer 作業は別々のフェーズで行う。統合 Plugin Manifests インベントリが、最初のツール横断で一度だけ読み取る組み立てを実行する。
- Hook parser/recognizer の作業は、正確なファイルが異なる場合に限りフェーズ内で並行できる。共有の `src/server/inspection/scan.ts`、UI、registry ファイルは、同じフェーズ内の別タスクに対して並行とマークしない。
- MCP の CLI、VS Code、内包所有者、Cloud の事実の各フェーズは別々のテストを使用するが、共有の Copilot recognizer、JSON parser、scan、UI の作業はフェーズ順に実行する。
- `[P]` とマークされた Repository 受け入れテストは、全サポート対象フィクスチャと最終レジストリグラフが固定された後に並行して進められる。
- Global vendor boundary testは分離されたfixture rootを使用するが、フェーズ 96〜98はone shared fixed-three consent/admission/batch contractとdistinct per-tool control/context projectionを追加するためmilestoneとしては順次実行する。Tentative workはフェーズ 99のatomic batch integrationが存在する前にはSourceを決してpublishしない。
- Global の再スキャンおよび無効化に関する API、concurrency、boundary、lifecycle、browser の各テストは、正確なファイルが異なる場合、コーディネーター状態のテスト後に並行して進められる。
- 順序付けた各phase内では3 vendor evidence reviewを独立したmarked work streamにできる。Artifact/README pair完成後はcross-cutting package、Node.js-only、accessibility、lifecycle、documentation testを独立したmarked work streamにできる。

### 並行実行例: ベンダー Inventory フェーズ

```text
After the phase fixture and conformance tasks:
  matcher/registry contract
  recognizer unit test
  repository-scan integration test
  inventory UI unit test
  browser acceptance
```

### 並行実行例: 完全で inert な Detail フェーズ

```text
After the phase metadata shape is fixed:
  vendor metadata test
  relationship test
  zero-activation or zero-connection test
  session-API file-detail and absent-reveal-function contract
  browser detail acceptance
```

## 実装戦略

### 最初の目に見えるマイルストーン

1. セットアップと最小限の安全な基盤を完成させる。
2. 承認済みの世代ゼロシェルを起動する。
3. Repository I/O を導入する前に停止し、起動可能な空画面をレビューする。

### 優先ウェーブ 1 — SKILL、Instructions、MCP

1. Codex、Claude、Copilot の完全な SKILL 一覧/詳細パス、一度だけ読み取る共有インベントリ、SKILL 比較、個別の skill-metadata 比較を提供する。
2. 三ツールすべての静的 Instructions 一覧/詳細マイルストーンを提供する。設定済み Codex fallback は、carrier が許可されるまで純粋な宣言/導出インターフェースとして保つ。
3. 最初の MCP フェーズで最小の Codex `.codex/config.toml` carrier を受け入れ、settings/config 項目としてまだ表示しないまま、設定済み instruction fallback と内包 MCP 宣言をアトミックに有効化する。
4. 独立した Claude、Copilot CLI、Copilot VS Code MCP ファイルを直ちに提供する。すでに受け入れられた skill 所有者に対する内包 MCP サポートと、まだ受け入れられていない settings、custom agent、marketplace、plugin manifest に対する owner-gated dormant adapter を定義する。
5. 現時点で具体化された MCP file/owner と runtime fact だけを統合し、完全なリテラルの MCP 比較を提供する。dormant adapter は inventory、detail、count、connection、selection に表示しない。

### 優先ウェーブ 2 — Rules、Commands、Prompts、Custom Agents

1. Codex と Claude の Rules 一覧/詳細マイルストーンと比較を提供し、Copilot `.claude/rules` は明示的な初期スコープ除外のまま保つ。
2. Claude と Copilot の Commands 一覧/詳細マイルストーン、共有ファイル統合、比較を提供する。
3. 単一ベンダーである Copilot Prompts の inventory、detail、comparison マイルストーンを提供する。
4. Codex、Claude、Copilot の Custom Agents 一覧/詳細マイルストーンを提供する。候補、ファイル再読み取り、合成ファイル/接続を追加せず、それらの実際の所有者認識上で、以前から dormant だった Claude と Copilot の agent-contained MCP adapter を有効化する。
5. 一度だけ読み取る共有 custom-agent 所有者を統合し、owner-attached MCP 認識を保持した比較を提供する。

### 優先ウェーブ 3 — 残りのカスタマイズ

1. 既存の Codex carrier を完全な configuration 認識/詳細へ拡張し、続いて Claude と Copilot の settings を提供する。dormant な Claude settings-contained MCP adapter を有効化し、Copilot instruction enablement を再投影する。Copilot settings は MCP 所有者にしない。
2. Claude Output Styles を提供する。
3. Marketplaces を提供し、Claude marketplace-contained MCP はその所有者が受け入れられたときにだけ有効化する。
4. marketplace のローカルソース検証後に Plugin Manifests を提供し、Claude plugin-contained MCP は受け入れ済み manifest 所有者上でだけ有効化する。
5. Repository カスタマイズファミリーの最後に Hooks を提供し、すべての内包 Hook がすでに受け入れられた所有者へ関連付くようにする。
6. Repository acceptanceとGlobal inspectionを完成させ、documentation/evidence/dependency reviewを終えた後にcross-cutting verificationとrelease evidenceを実行する。

### 各ファミリー内のベンダー優先垂直スライス

1. サポートされる各ベンダーの List/Inventory マイルストーンを完成させる。
2. その vendor の完全で inert な Detail または contained-metadata milestone を完成させる。
3. allowlist が複数ツール認識を許可する箇所では、明示的な共有物理ファイルの統合マイルストーンを追加する。
4. サポートされるすべてのベンダーセマンティクスが存在した後、ファミリーごとに一つの比較マイルストーンを追加する。

単一ベンダーのファミリーは、それぞれ固有の inventory/detail/comparison マイルストーンを維持する。以前の MCP 契約が後段の所有者ファミリーを待つ場合でも、各フェーズは独立して実演可能なままとする。

### Marketplace から plugin への境界

1. Marketplace Inventory は作成済みカタログだけを受け入れる。
2. Marketplace Detail は、対象を読み取らずにvalidated direct one-edge local source declarationを検証して保持する。
3. Plugin Manifest Inventory だけが、それらの宣言を 1 エッジの有界導出候補に使用できる。
4. Plugin component、Hook、MCP、script、asset、remote、installed、cache、hosted の各対象は、関係または除外のままとする。

### Dormant owner-adapter の有効化

1. 前段の MCP adapter は、純粋で owner-gated な parser/composition 契約である。それ自身の候補ルール、filesystem 列挙、読み取り権限、inventory 行、選択対象を持たない。
2. 所有者がすでに存在する場合、MCP 認識は同じ物理所有者と世代読み取りへ関連付く。所有者が後で導入される場合、その所有者ファミリーのフェーズが明示的に adapter を有効化し、一つの所有者 ID、一度の読み取り、個別の owner/MCP 認識、合成ファイルも接続もないことを証明する。
3. Codex は fallback 宣言、MCP、後段の configuration 表示に一つの受け入れ済み configuration carrier を使う。Claude は Custom Agents、Settings、Marketplaces、Plugin Manifests で将来所有者の adapter を有効化する。Copilot は Custom Agents で agent-contained adapter を有効化する。settings は決して MCP 所有者にせず、plugin path は関係のまま保つ。
4. Hook フェーズは内包認識をすでに受け入れられた所有者へ関連付け、Claude の独立 hook または合成ファイルを決して作成しない。
5. 統合フェーズと受け入れフェーズは、比較前に共有 owner/file を一度だけ読み取る組み立てを証明し、dormant/runtime-only 項目を選択可能なファイルとして拒否する。

### 一覧行への宣言済み skill 名の表示

一覧行は file を Source 相対 Path だけで識別している。Skill の authored な `name` は独立した値で、
`SKILL.md` の frontmatter にあり、格納 directory と一致する必要はない。したがって読み手が path から
復元することはできない。FR-007 は既に relevant declared metadata の表示を要求しているが、それを一覧
向けに予定した task が無く、値を運べる wire field も無い。以下はその欠落を埋める。Skill rowが示す
宣言済み名はskill recognizerが抽出したものであり、Codexの他fieldの宣言済み`value`はT094が持つ。

- [X] T1064 [US1] Recognition が宣言済み名を運べるよう `src/shared/api-types.ts` の wire contract を改訂し、`specs/001-inspect-agent-customizations/data-model.md` と `data-model.ja.md` の § ToolRecognition に、summary はこの 1 つの authored 値を運び、それ以外の宣言済みの値へは FR-027 の detail surface を通じて file 1 つずつだけ到達できることを明記する。FR-007（`spec.md`/`spec.ja.md`）には、名前が content ではなく presentation identity である理由を記録する: vendor 自身の selector や menu が使う identifier であること、Source 相対 Path から復元できないこと、そして自らが列挙するものを名指せない一覧は inventory ではないこと。Recognizer が名前を抽出しなかった場合、field は empty ではなく absent とする。 *(2026-07-29修正: 1 fileずつのdetail surfaceが境界のすべてになった。)*
- [X] T1065 [P] [US1] 宣言済み名の失敗テストを追加する。Frontmatter の `name` が authored のまま summary に載ることを証明する recognizer test（`name` が directory と異なる skill と、`name` を持たない skill を含む）。一覧行が path の隣に宣言済み名を描画し、名前が無い場合は path だけを公開することを証明する unit test（描画そのものの検証はbrowserだけで行う。unit projectはcomponentをmountしないため — T058）。そして描画された行が directory segment ではなく authored な名前を示すことを証明する `tests/e2e/codex-skills-list.spec.ts` の browser acceptance。
- [X] T1066 [US1] `src/server/inspection/recognizers/codex.ts` で、recognition の allowlisted extraction が既に公開する `codex.skill.name` entry から宣言済み名を設定する。これにより row が group 化に使う名前と detail が示す値は同じ parse から来る。parse できない document は recognition を失敗させず名前を absent にする。名前は解決済み scalar そのもの — trim・大文字小文字の変更・directory 名への fallback なし — であり、抽出結果が無い場合は absent のままとする。Authored literal ではなく値を採る: quote された `name` が宣言するのは quote の内側の文字列であり、それが vendor 自身の selector が使う identifier である。したがって quote 文字を display name に持ち込むと、vendor が選択に使うことのない文字列を見せることになる。*(2026-07-29修正: allowlisted extractorが実行されるようになったため、名前はそれが公開するentryから読む。)*
- [X] T1067 [US1] そのkindのrow component（`src/app/components/inventory/rows/`） で、Source 相対 Path の隣に宣言済み名を描画する。名前は authored text であり、inert で、locator ではなく、行の identity として path を置き換えない。異なる directory の 2 つの skill が同じ名前を持ちうるからである。

### Recognition summary に provenance count が必要か判断する

1つのrecognitionを裏づけるadmission数には読み手がいなくなった。Inventory rowに
`(N rule admission(s))`として表示していたが削除した。Shipped ruleでは常に1であり、
`rule admission`は読み手が行動を起こせる情報ではなくregistryの語彙であり、その数が
限定していた内容はrowが既に述べているからである。Field、`src/server/session/session.ts`での
射影、testの期待値は残っている。

- [X] T1068 [US2] 1つのrecognitionを裏づけるadmission数を読むsurfaceは無い: 各kindの一覧が自前になった時点で（T1073–T1078）fileはrecognition summary自体を公開せず、detail viewは各provenanceをそれ自身のscopeとevidenceとともに示す。`RecognitionSummaryDto`とその`provenanceCount`は`src/shared/api-types.ts`からもsession射影からも削除済み。Record自身の`provenances`は残す。各admissionは異なるscopeとevidenceを持ち、detail viewはそれを実際に示すからである。`specs/001-inspect-agent-customizations/data-model.md`と`data-model.ja.md`の§ ToolRecognitionに明記済み。

### Admit済みskillのcompanion file

Skillはfileではなくdirectoryである。`SKILL.md`はそれが使うscript、reference、assetの傍らに
置かれる。Inventory rowは`SKILL.md`を名指すだけで残りについて何も述べないため、scriptを20個持つ
skillと1つも持たないskillが同じに見える。Admit済みcandidateに付随するものをlistにするには、traversalが
そのcandidate自身のdirectoryを列挙する必要があるが、現在はcandidateを見つけた階層より下を列挙しない。
以下はbounded censusを追加する: 列挙のみ、admit済みcandidateのdirectoryだけを起点とし、何も読まない。

- [X] T1069 [US1] `specs/001-inspect-agent-customizations/contracts/inspection-path-allowlist.md`と`.ja.md`にbounded companion censusを追加する: directoryであるkindのadmit済みcandidateについて、それを含むdirectoryを再帰的に列挙し、付随するregular fileをlistにする。適用可否は認識されたkindが決めることを明記する。Directoryであることはkindの正体の一部であり、rule単位のflagはkindが既に決めていることを二重に述べるだけだからである。したがってlistはそのkindのrecognitionには必ず存在し、admitされたfileが単独なら空になる。結果は件数ではなくsort済みのSource相対Path listであることを明記する。Inventory rowが件数を示し、file detail viewが各fileを名指すためであり、1つの事実はそれ自身と食い違えないからである。列挙はbyteを読まずcandidateをadmitしないこと、scanが列挙された各fileを通常のread pathで正確に1回読みgenerationの通常fileとして公開すること — そのbyteは`readBytes`に数えられ、読めないものは`file-unreadable`を伴ってpartial commitとなる — を明記する。列挙はその1回のreadを超える権限を何にも与えず、Source rootを越えられない。VCS internalsとseed自身を除外すること、通常のwalkと同じreal-path cycle規則でsymbolic linkを辿ることも明記する。Admitではなく列挙である理由を記録する: 付随するfileはrelationship targetであり、そのedge経由で読まれることはないため（contracts/vendors/openai-codex.md § Presentation allowlist）、列挙がcandidateへの昇格になってはならない。*(2026-07-29修正: censusが列挙したfileはscanが読んで公開する — contracts/inspection-path-allowlist.md § Bounded companion census。)*
- [X] T1070 [US1] Censusをrule recordにもcompile済みplanにも持たせない。`src/shared/registries/rule-types.ts`の`InspectionRule`はcensus scopeを宣言しない: 認識されたkindが決めるため、recordのfieldは`kind`が既に運ぶ以上の情報を運ばず、そのために必要な閉じたunionはどのruleも取らないmemberを出荷することになる。Planも持たない — censusはwalkの一部ではないため、`src/server/inspection/traversal.ts`は汎用のallowlist traversalのままとする。
- [X] T1071 [P] [US1] Censusの失敗テストを追加する: listがnested directoryを含み、seedとVCS internalsを除外し、symlinkされたfileをentry自身のpathで列挙し、sortされ、link cycleで終了し、ancestorへのlinkを経てもcandidate自身のdirectoryより先へ下降しないことを証明するtest。追加のfileがadmitされず、列挙がbyteを読まないことを証明するtest — scanはその後列挙された各fileを1回読み、それはscan-publicationのtestが主張する。listがskillのrecognition detailsへ届き、`SKILL.md`が単独ならabsentではなくemptyになることを証明するrecognizer test。Rowが件数を述べることを証明するbrowser acceptance。*(2026-07-29修正: censusが列挙したfileはscanが読んで公開する。no-byteの主張は列挙だけを対象とする。)*
- [X] T1072 [US1] `src/server/inspection/companion-census.ts`にcensusを実装し、skillのkind判別detailsを組み立てる場所、すなわち`src/server/inspection/recognizers/codex.ts`で実行する。Recognizerはcandidateのpathと認識されたkindの両方を保持しているため、どのkindがcensusを求めるかを呼び出し側が知る必要も、先回りして計算する必要もない。`src/server/inspection/scan.ts`はcandidateの表示pathと並べてfilesystem pathを渡し、recognizerをawaitするだけで、自身はcensusを行わない。`src/app/components/inventory/rows/SkillRow.vue`ではlistの件数を描画する。File detail viewがfileごとに名指すのはこのlist自身であるため、件数はそこから導き、listの傍らに公開しない。

### Kindごとの一覧の単位

一覧はあらゆるkindを1つの形で公開している: 物理fileが`(tool, kind)`ごとの`recognitions[]`を
運ぶ形である。この形はrowとfileが同じものだと仮定しているが、実際にそうなのは`instructions`と
`settings/config`だけである。Skillを識別するのは自身が宣言する名前である。それがvendor自身の
selectorが使うidentifierであり、directory名と一致する必要もない。MCP serverはadmit済み
`.codex/config.toml`内の1つの`[mcp_servers.*]` tableであり、1つのfileは宣言したserverの数だけrowを
公開する。Contained hookも同様である。これらをfile形のrow 1つに押し込むと、どちらのケースも表現
できない: skillを名前でまとめると`(fileId, tool, kind)`ごとに1 recognitionという規定と衝突し、
file形のrowはN行になりようがない。

以下は2つの事実を分離する。Fileはfileのままとし — path、read結果、size、diagnostic — 各kindは
自身の単位をrowとする一覧を公開し、fileは`fileId`で参照して、fileが既に述べていることを繰り返さない。

- [X] T1073 [US2] `specs/001-inspect-agent-customizations/data-model.md`と`data-model.ja.md`、`contracts/http-api.md`と`.ja.md`の§ get-session、`spec.md`と`spec.ja.md`のFR-007に分離を記録する: 一覧rowの単位はfileではなくkindが決める。出荷済みkindが使う単位を明記する — skillは宣言名1つ、MCP serverはcarrier内の宣言1つ、instructionsはfile自身 — そして物理fileは自身の事実とともに1度だけ公開され、各kindの一覧は`fileId`で参照することを明記する。理由も記す: row単位とはvendorが選択する単位であり、file形のrow 1つでは、複数fileが共有する名前も、1 file内の複数宣言も表現できない。
- [X] T1074 [US2] `src/shared/api-types.ts`のwire contractにskill一覧を追加する: snapshotはskillを宣言名をkeyとするentryとして公開し、各entryはその定義（`SKILL.md`の`fileId`、それを認識するtool、companion file）を持つ。`CustomizationFileSummaryDto`から`recognitions`を削除し、物理file自身の事実だけにする。Kindごとのpayloadはkindの一覧へ移るため、`RecognitionDetails`はあらゆるkindが広げるunionである必要がなくなる。定義はfileを`fileId`で名指し、fileが既に公開しているpath、size、diagnosticを繰り返さない。
- [X] T1075 [US2] `src/server/session/session.ts`でskill一覧を射影する: commit済みskill recognitionを宣言名で決定的な順序にgroupingし、名前を宣言しないものは互いにまとめず独自の安定したgroupingを与える。射影は既に読んでいるcommit済みgenerationを読むだけで、filesystem操作は行わない。
- [X] T1076 [US2] 各toolが同名skillをどう解決するかを公開し、groupingされたentryがInspectorの記録していない優劣を暗示しないようにする。出荷済みの3つの記述は異なる — Codexは同名skillをmergeせず両方が有効なまま残り、文書化された順序は無い（`codex.skills.discovery`）。Copilot CLIは文書化されたsource orderの最初を解決する（`copilot.cli.skills.selection`）。VS CodeのCopilotは重複時の優先順位が文書化されていない（`copilot.vscode.skills.selection`）。したがってentryは認識productごとに1つの解決規則を運び、browserで書き直すのではなくvendorの出荷済みcomposition strategyから取得する。記述を公開するのはstrategy recordが出荷されているproductだけとする: skill ruleを持たないproductはskillを認識しないためどのentryも到達せず、今その他の記述を書けば照合対象の無い主張をproductへ置くことになる。Productがskill ruleを出荷したのに記述を欠く場合に失敗するcontract gateを追加する。定義が1つのentryは何も述べない: 解決すべきものが無いからである。
- [X] T1077 [US2] `src/app/components/inventory/`でskill tabをskill一覧から描画する: rowは宣言名1つとその下の定義群であり、各定義はSource相対Path、tool、companion file件数を名指す。Entryが複数の定義を持つ場合、rowはそれらを順序づける代わりに各toolの同名解決規則を述べる。`InventoryList.vue`が表示中のkindでdispatchし、そのkind自身のrow型を描画する。Rowごとのdispatcherでは不可能である。Kindごとにrowの取るpropsが異なるからである。Kindを持たないfileは全tabの外で`UnclassifiedList.vue`が一覧する。
- [X] T1078 [P] [US2] 分離を検証する: 1つの名前を宣言する2つの`SKILL.md`が2定義を持つ1 entryとして公開され、2つの名前なら2 entryになることを証明する射影test。名前の無いskillが他のentryへまとめられないことを証明するtest。Fileの事実が1度だけ公開され定義ごとに繰り返されないことを証明するtest。重複した名前が1つのrowとして描画され、各toolの解決規則を述べ、両方のpathを名指すことを証明するbrowser acceptance。

- [X] T1079 [US2] Fileが自身の事実だけを公開するようになった今、file単位のparse rollupがどこに属するかを判断し、同じ変更でその判断を実行する。`parseSummary`はfileのrecognitionのparse状態を集約したものだが、fileはもうrecognitionを運ばない: 読むsurfaceは無く、集約対象のrecognitionは各kind自身のrowにgroupingされている。読むsurfaceがある場合にだけ残す — kindのrowは既に自身の定義のdiagnosticを運ぶため、その傍らのfile単位のrollupは読み手が行動できることを何も述べないかもしれない。どこも読まないなら、`src/shared/api-types.ts`の`CustomizationFileSummaryDto`から`parseSummary`を削除し、`src/server/session/session.ts`の射影を落とし、`contracts/http-api.md`/`.ja.md`の§ get-sessionと`data-model.md`/`data-model.ja.md`の§ CustomizationFileを更新する。Record自身の`parseStatus`は残す。Recognitionが何に失敗したかを示すものであり、detail viewがそれを示すからである。 *(2026-07-29完了: 読み手が存在しない。`parseSummary`はsummaryとdetailの両DTO、scanの`projectParseSummary`、`contracts/http-api.md`/`.ja.md`と`data-model.md`/`.ja.md`から削除した。recognition自身の`parseStatus`がparseの事実として残る。)*

- [X] T1080 公開browser bundleが必要とするthird-party noticeを同梱する（FR-043）。`scripts/third-party-notices-plugin.mjs`で完成したbundleからlistをderiveし、bundle済み各packageのnotice fileを収集して、`./nuxt.config.ts`へpluginを登録し、公開browser outputへdocumentをemitする。`tests/package/third-party-notices.test.ts`でゲートする: packaged fileが存在し、bundle済みeditorのcopyright holderとMIT permission textを運び、bundleがcodeをinlineする全packageを列挙し、package managerが利用者のためにinstallするdependencyを載せず、列挙した各packageに本文があること。

### リリースの完成

1. Repository のインベントリ、詳細、比較の受け入れを通過する。
2. I/O を行わない Global 同意プレビューを提供する。
3. Fixed `[copilot, claude, codex]`に対するselector-free consentを有効化し、initial enableでは全3件、retryではnon-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するcompleteなfixed-order exact `retryableTools` projectionを評価し、tentative Sourceをpublishせずにone-root controlを検証する。
4. Nonempty admitted subsetではexactly one shared-ID `GlobalBatchScan`を実行し、0〜3個のseparate tool-specific Sourceをone completeまたはpartial Global generationで同時にatomic publishしてcarried Sourcesを保持しrootをmergeしない。Empty deterministic subsetはjobもgenerationも作らない。
5. Global の再スキャン/回復と、優先ゼロ I/O 無効化バリアを追加する。
6. Documentation/evidence/dependency reviewを完了し、その完成artifactに対してcross-cutting suiteを実行する。Remediationごとにprior post-review resultを無効にし、全applicable automated gateと影響evidence protocolを再実行し、concern 0件までcomplete-diff/tarball reviewを反復する。
7. SC-001～SC-009のdenominator、threshold、pass/fail、closed sixteen-member study-input bundle/canonical manifest digest、exact `study-inputs/`/`repository/` distribution layoutとderived-tree digest rootを検証済みの20件すべておよびseparateなcandidate/equipment/runtime binding、final packed-candidate digest、exact `pnpm run study:evidence:inputs -- materialize`、`pnpm run study:evidence:verify -- inputs`、`pnpm run study:evidence:capture -- start`、`pnpm run study:evidence:capture -- checkpoint`、`pnpm run study:evidence:verify -- checkpoint`、`pnpm run study:evidence:verify -- continuation`、`pnpm run study:evidence:capture -- stop`、`pnpm run study:evidence:verify -- finalize`のoutcome、opaque ID/root/countだけを含みraw evidence data 0件のrecomputed cross-stream `StudyCaptureSeal` digest、Node.js engines contract全体とexact lower-bound/browser certification sample、residual riskを記録する。
   このsequenceはphase-closedとする。`INSPECTOR_STUDY_WORK_ROOT`、`INSPECTOR_STUDY_CONTROL_ENDPOINT`、`INSPECTOR_STUDY_CONTROL_TOKEN`はmaterializeからfinalize、`INSPECTOR_STUDY_CANDIDATE_TARBALL`はmaterialize/verify-inputsでforbiddenかつstartからfinalizeだけrequired、`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`はstartからstopだけrequiredとする。Stopはsupervisorをretainし、finalizeはcontrolをteardownして`StudyContinuityWitness`を`StudyCaptureSeal`より前にwriteする。
8. 原則ごとの明示的なrelease Constitution Checkを記録し、対応するpull request review checkを必須とし、その結果生じるrepository evidence editをすべて完了する。
9. Repositoryをfreezeした状態でcomplete applicable automated matrixとread-only complete-diff/tarball reviewを再実行し、`pnpm run test:docs`と`git diff --check`で終える。Outcomeはexternal release/pull-request check logだけへcaptureする。その後repositoryをeditした場合は全outcomeを無効にし、Constitution/final-tree gateの再実行前にstep 6/T1062へ戻る。

## 注記

- 有効な検査対象ソースを列挙または読み取れるのは `src/server/inspection/` 配下の単一のinspection moduleだけである (QR-003)。呼び出し元のパス、関係の対象、ベンダーロケーター、戦略、エビデンスレコードが読み取り権限を与えることはない。
- Traversalとreadはsymbolic linkを透過的に辿る (FR-024)。Inspectorは同じpathを読むagentが見るものを表示する。broken linkはそのfileの`file-unreadable` Diagnosticになり、訪問済みdirectoryをreal pathで追跡するためlink cycleがscanの終了を妨げることはない。
- 1つのfileに閉じた問題 (読めないfile、binary content、parser/extractor failure) はfile単位のdiagnosticを保持したまま、影響のない全fileをpartial generationとして公開する。読めないrootはsource-scoped `root-unreadable` DiagnosticでそのSourceのattemptをfailさせ、そのattemptのpartial inventoryを公開しない (FR-002, FR-028)。
- 検査対象のcustomization fileはadversaryとしてモデル化されない (FR-019)。Traversalとreadはfile単位diagnosticを伴う通常の`fs/promises` operationであり、operation間のidentity再検証、change検出taxonomy、kernel-containment主張は存在しない。
- FR-038はproject-authored executable application codeと公開/install済みproduction closure内のexecutable codeに適用する。Project-authored build/test codeもrepositoryの設計選択としてJavaScript/TypeScriptを使用するが、third-party development/test toolingはFR-038の対象外として別にpin/auditする。Rust、Cargo、Node-API/native addon、prebuilt binary、lifecycle compilation、lifecycle/runtime artifact downloadはFR-038が定義するproduct boundaryから引き続き禁止する。
- ベンダーの振る舞い、Inspector matcher、runtime composition、公式エビデンスは別々に所有する。読み取りを許可できるのは、静的および有界導出の Inspector ルールだけである。
- 非読み取りの `excluded` ルール ID は、`shared.excluded.managed-remote-state`、`copilot.excluded.additional-standard-locations`、`copilot.excluded.extra-directories`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp`、`copilot.excluded.cli-extensions`、`codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`codex.excluded.user-runtime`、`claude.excluded.user-runtime`、`copilot.excluded.user-runtime` だけである。その他の拒否はすべて、パス不一致テストまたは relationship-only の条件である。
- 関係は記述的、直接的、non-recursive、非追跡とする。関係の対象は、それ自身が独立した静的または有界導出の受け入れを受けた場合にだけ読み取り可能になる。
- Hard linkは通常のfileである。発見された各pathはscan attempt内で1回読み取られ、physical-identity groupingはない。別Source、別scan attempt、別generationは独立しており、同じunderlying objectをそれぞれ読み取り得る。Published fileは複数tool recognitionとdirect provenanceを保持できる。
- `agents/openai.yaml` は個別の物理候補および `skill metadata` 認識である。シード `SKILL.md` の同一性へ統合してはならない。
- フェーズ 23 は、設定済み instruction fallback と Codex MCP に必要な最小 carrier として `.codex/config.toml` を一度だけ受け入れる。フェーズ 57～58 は `settings/config` 認識と完全な configuration 詳細を追加するときに、同じ物理 ID と世代読み取りを再利用し、二つ目の configuration 候補を決して作成しない。
- Claude の独立 hook、Codex の独立 MCP、hosted/organization/managed/remote 入力、Claude workflows と agent memory、Codex Repository prompts と plugin components、Copilot LSP/extensions/一般の `.vscode/settings.json`、追加の設定済みルートには、List フェーズも読み取り権限も与えない。
- 内包 Hook と MCP の認識は、すでに受け入れられた所有物理ファイルを再利用する。dormant MCP adapter は、独立して許可された所有者が受け入れられる前には、何も列挙、読み取り、公開できない。有効化では、新しい候補または読み取りなしで、その所有者へ認識を追加する。宣言、plugin コンポーネントパス、Cloud の事実、runtime 参照が合成ローカルファイルを作成することはない。
- Marketplace と plugin manifest は別の kind である。検証済みのローカル marketplace ソースだけが、1つの direct plugin-manifest derivation edgeをシードでき、component は再帰しない。
- Global inspection は 1 つの fixed-three consent record と 3 つの control、別々に識別される 0〜3 個の Source を持ち、supported tool ごとに最大 1 つ、Source ごとに正確に 1 root とする。tentative な admission/scan work は Source ではない。initial enable または retry は、admit された全 context を 1 つの request ID/authority/working set を持つ 1 つの `GlobalBatchScan` へ transfer し、independent な Global sequence の 1 つの complete または partial generation で全 admitted Source を一緒に publish する。per-tool の中間 commit は存在せず、Global commit が Repository の generation/ID/view に触れることはない。後続の明示的 Global rescan は single-Source transaction のままとする。Source ID は process lifetime にわたり安定し、owning sequence の generation-owned graph ID は rekey する。
- 完全に decode された authored source、正確な metadata literal、authored relationship target は active session で利用可能なままにする。loopback-only な session API は明示的な detail request でだけそれらを返すが、acknowledgementもnoticeのfieldも持たない。どちらもどこにも存在しないからである（FR-027）。bundled browser はそれらの request を発行し、acknowledgement も注意書きも前後に置かずに authored value を render する。credential と environment-reference syntax は変更せず表示し、参照される process-environment value は決して読み取りも置換もせず、diagnostics/log は source value を複製しない。
- Credential detection、masking、redaction、reveal control は存在しない。session API に reveal・masking・environment-resolution の function は存在せず、source/comparisonを開く前にも隣にも、authored contentについての注意書きは現れない。
- 通常の起動、スキャン、ビルド、テストは公式ドキュメントに関してオフラインである。ネットワークへアクセスできるのは、明示的なメンテナー向けソース確認コマンドだけである。
- 人が作成するリポジトリドキュメントの変更では、英語の正本ファイルと日本語の対応ファイルを必ず同時に更新する。
- 自動テストの成功はエビデンスであり、網羅的な証明ではない。フェーズ 104 では、完全な文脈での diff、package、participant、accessibility、measurable-outcome、residual-risk のレビューを必要とする。
