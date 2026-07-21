# タスク: エージェントカスタマイズの調査

[English](tasks.md)

**入力**: `/specs/001-inspect-agent-customizations/` の設計文書

**前提条件**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**テスト**: すべての振る舞いの変更について、実装前にリスクに応じた自動テストが必要です。テストはユニット、契約、統合、パッケージ、セキュリティ、性能、ブラウザー、境界、アクセシビリティ、回帰の振る舞いを網羅します。

**構成**: タスクは、一つのuser story全体を水平に完了せず、元の目に見えるfamily-vertical delivery incrementに従います。起動可能な画面の後、各familyでInventory/List、完全で不活性なDetail、必要なshared integration、Comparisonを完了してから次のfamilyへ進みます。正確な順序は、SKILL（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooksです。Story labelはcanonicalなtraceabilityを維持し、`[US1]`はdiscovery、`[US2]`は完全で不活性なdetail、`[US3]`はcomparison、`[US4]`はGlobal inspectionを表します。Owner-dependent MCP integrationはMCP waveでdormantなowner-agnostic contractとして実装し、対応する後段のowner familyがadmitされた時点で表示可能にします。各phaseは独立してtest可能なcheckpointを1つ維持します。

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
| FR-005 | T017, T028, T178–T190, T268–T275, T388–T396, T913, T920 |
| FR-006 | T178–T190, T268–T275, T388–T396, T402–T410, T440–T448, T475–T481, T486–T494, T507–T516, T565–T572, T577–T588, T643–T653, T658–T666, T679–T688, T739–T746, T751–T762, T818–T828, T833–T843, T899–T907, T919 |
| FR-007 | T004, T074–T177, T216–T267, T292–T387, T411–T435, T449–T474, T495–T502, T517–T564, T589–T642, T667–T674, T689–T738, T763–T817, T844–T898, T920–T927, T1034–T1036, T1041–T1042 |
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
| FR-024 | T018–T022, T029–T032, T055, T057, T067, T069, T916, T924, T934, T940, T944–T945, T947, T959, T1008, T1014, T1029, T1041, T1051, T1054, T1058, T1061–T1062 |
| FR-025 | T074–T085, T095, T517, T589, T612, T920–T927, T995–T997, T1029, T1041, T1055, T1058, T1061–T1062 |
| FR-026 | T077, T085, T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925–T927, T995–T997, T1055 |
| FR-027 | T084, T100, T927, T1045 |
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
| FR-040 | T016, T027, T046, T069, T916, T925, T996, T1014, T1029, T1041, T1055, T1061 |
| FR-041 | T015–T017, T019–T021, T026–T032, T037–T040, T046, T055, T057, T067–T069, T075–T076, T081, T089, T095, T097, T116, T141, T208, T217, T238, T282, T321, T371, T517, T589–T590, T612, T799, T805, T915–T916, T921–T923, T926–T927, T932–T934, T938, T940, T944–T947, T950–T951, T956–T959, T962–T964, T967–T968, T974–T975, T977–T978, T981–T982, T988–T989, T991, T993, T995, T997–T998, T1000–T1002, T1004–T1006, T1008, T1013–T1014, T1029, T1041, T1046, T1055, T1058, T1061–T1062 |
| FR-042 | T041–T042, T044, T048–T049, T057, T1017–T1029, T1041, T1045–T1046, T1058, T1061–T1062 |
| QR-001 | T017–T039, T050–T073, T913–T920, T1031–T1042 |
| QR-002 | T015–T028, T055–T057, T061, T067–T071, T183, T913–T935, T944–T950, T963–T967, T977–T981, T991–T997, T1006–T1024, T1041–T1055, T1058–T1062 |
| QR-003 | T018–T049, T055–T057, T067–T069, T915–T927, T930, T946, T958, T995–T997, T1006–T1028, T1029, T1041, T1051, T1054–T1055, T1058, T1061–T1062 |
| QR-004 | T044, T071, T084, T100, T919, T927, T929, T935, T950, T976, T990, T997, T1004–T1005, T1016, T1022, T1028–T1030, T1039–T1041, T1045, T1056–T1059, T1061–T1062 |
| QR-005 | T050–T073, T913, T920, T1031–T1042, T1062 |
| SC-001 | T040, T043, T046–T047, T917, T1029–T1030, T1041, T1048, T1056, T1061–T1062 |
| SC-002 | T017, T026, T028, T037, T057, T068–T069, T071, T183, T914, T916, T918, T1029, T1041, T1052 |
| SC-003 | T913–T914, T919–T920, T1041–T1042, T1053 |
| SC-004 | T018, T020–T021, T031, T056, T085, T924–T925, T930, T995–T997, T1029, T1041, T1054, T1061 |
| SC-005 | T074, T077, T081–T085, T925–T927, T930, T995–T997, T1041, T1055 |
| SC-006 | T1030, T1049, T1056–T1057, T1061–T1062 |
| SC-007 | T015–T021, T026, T038, T040, T046, T055, T057, T067–T069, T075–T076, T081, T089, T915, T921–T924, T926–T927, T930, T934, T944–T947, T958–T959, T963–T964, T975, T977–T978, T989, T991, T993, T995, T997, T1006, T1008, T1013–T1014, T1041, T1046, T1058, T1061–T1062 |
| SC-008 | T044, T071, T084, T100, T919, T927, T929, T1004, T1029, T1041, T1045, T1059 |
| SC-009 | T153, T246, T374, T377, T380–T386, T547, T550, T720, T723, T911, T923, T931, T936–T937, T979–T980, T985–T986, T995–T997, T1041–T1042, T1060 |
| Constitution/project governance | T001–T014, T1029–T1063 |

---

## フェーズ 1: Setup

**目的**: 再現可能な Node.js 専用パッケージと開発エントリーポイントを確立します。

**独立テスト**: Formatting checker実装前にdependency-free behavioral suiteを実行して意図したfailureを観測し、実装後にそのsuiteとnon-mutating repository checkをpassさせます。その後、固定dependency graphをinstallし、設定済みの全local command/CI entry pointがRust、native compiler、install-time build、artifact downloadなしでresolveすることを確認します。

**目に見えるチェックポイント**: Contributorがprojectをinstallし、test済みformatting gateとempty build/test toolchainを実行できます。

- [ ] T001 Packageまたはconfiguration fileを変更する前に、plan承認済みdependency baselineを再検証し、以前の公開済みpackage/public contract、永続profile/user data、影響を受けるconsumer、migration workflowがないという初回のmigration影響なし判定を確認する。`specs/001-inspect-agent-customizations/research.md`にある`**Migration impact**` section、`specs/001-inspect-agent-customizations/research.ja.md`にある`**移行影響**` section、`specs/001-inspect-agent-customizations/plan.md`にある`**Dependency and breaking-change migration gate**` section、`specs/001-inspect-agent-customizations/plan.ja.md`にある`**Dependencyおよび破壊的変更の移行gate**` sectionを検証し、必要なら更新する。その正確な英日section pairを成功時のconfirmation evidence記録先とし、欠落、stale、不一致、根拠不足のいずれかがある間はT001をincompleteのままにしてT002を開始してはならない（MUST NOT）。確認に失敗する、承認済みdependency baselineが変わる、またはpublic contractのbreaking changeを提案する場合は停止し、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport window、rollback/support path、または理由を明記した影響なし判定を文書化する。影響を受ける`specs/001-inspect-agent-customizations/research.md`/`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`/`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md` pairを同期し、current task setをsupersededとして`/speckit-plan`と`/speckit-tasks`を再実行する。そうでなければNode.js `^24.11.0 || ^26.0.0`、`pnpm@11.13.0`、正確なruntime leaf集合`gunshi` 0.37.0・`yaml`・`jsonc-parser`・`smol-toml`、承認済みの正確なdevelopment version、凍結されたgraphを`./package.json`と`./pnpm-lock.yaml`に固定する
- [ ] T002 `bin` を `agent-customization-inspector: bin.mjs` のみ、`files` を `bin.mjs`、`dist`、`README.md`、`README.ja.md`、`LICENSE` のみに定義し、`main`/`module`/`exports` を省略して、`./package.json` でライフサイクルのビルド・ダウンロードフックを禁止する
- [ ] T003 Checker実装前に、temporary repositoryとNode.js built-inだけを使うdependency-freeなfailing `node:test` coverageを`tests/unit/check-format.test.mjs`へ最初に追加する。Presentなrecursive rootのexact set `app/`、`src/`、`shared/`、`scripts/`、`tests/`、`.github/`、`specs/`、`.specify/`、`.agents/`、`.claude/`、`.codex/`、`.vscode/`、researchのpresentなexact root file、未作成future-listed path、generated-root pruning、selected symlink、valid text、invalid UTF-8、BOM、CRLF/bare CR、行末ASCII space/tab、empty/missing-final-LF/multiple-final-LF file、extensionless text、validな`malformed-byte`/`digest-bound`/`intentional-binary` exact-path exception、invalidなabsolute/`..`/glob/directory/duplicate/out-of-scope/blank-rationale exception、sort済みcontent-free stable rule-code diagnosticとexact 0/1 exit、pass/failure時のbyte/mode/mtime non-mutationをcoverする。少なくとも1つの意図したfailing caseを観測した後、Node built-inだけを使うcheckerを`scripts/check-format.mjs`へ実装し、production CLIをwidenせずtestable logicをexportし、symlinkをfollowせずexact research policyを実装する。RunnableでinertなNode ESM entryを`src/cli.ts`と`src/inspection/parsers/worker.ts`へscaffoldし、`scripts/clean-build-output.mjs`、`scripts/build-static-manifest.mjs`、`scripts/assemble-server-manifest.mjs`、`scripts/build-production-graph.mjs`、`scripts/verify-package-files.mjs`へno-op placeholderを作る。Exact `test:format`を`node --test tests/unit/check-format.test.mjs`、exact non-mutating `format:check`を`node scripts/check-format.mjs`として追加し、`test:unit`へ`test:format`を含め、build、lint、type-check、contract、integration、security、package、performance、coverage、documentation、browser commandを`./package.json`へ追加する。T004前に`pnpm run test:format`、続いて`pnpm run format:check`を実行し、maintained baselineが失敗する場合はfileを書き換える前に停止してcurrent task setをsupersededとし、影響を受ける全pathをexactに記載したbilingual taskを再生成する
- [ ] T004 `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`、`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みPresentation Allowlistを、`specs/001-inspect-agent-customizations/contracts/official-sources.md`と`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`に記録された6個のlowercase SHA-256 valueに対してverifyだけし、authorまたはsemantic editを行わない。各UTF-8/BOM-free/LF-only fileについて、case-fold textが`presentation allowlist`で終わるlevel-2 headingをexactly one要求し、後続non-table lineをskipし、byte-for-byteで`|`から始まる最初のcontiguous runだけをhashし、全row byteを保持して最終rowを含む各row後に1 LFを付け、heading/prose/blank/following lineを除外する。Missing/duplicate/empty/malformed heading/tableをrejectし、equal-length digest byteをconstant timeでcompareする。Digest matchだけでは不十分なため、exact row IDとmembership/source form/extractor/field/relationship/contained-owner/eligibility gateを含む英日semantic parityを別に検証する。Mismatch、recorded value欠落、desired semantic changeのいずれでもT004はincompleteのままT005と全dependentを停止し、task setをsupersededとし、synchronized bilingual spec/research/plan/quickstart/contracts/tasksと`/speckit-plan`後の`/speckit-tasks`を要求してからregenerated workを再開する
- [ ] T005 [P] Nuxt SPA、静的 Nitro プリセット、ルート絶対アセット、無効化した CDN、明示的な imports と components を `./nuxt.config.ts` で設定する
- [ ] T006 [P] アプリケーション、共有、ソース、スクリプト、テストに対する厳格な型チェックを `./tsconfig.json` で設定する
- [ ] T007 [P] 生成出力を除外しながら TypeScript、Vue、Node.js、テストの lint を `./eslint.config.js` で設定する
- [ ] T008 [P] Unit、contract、integration、security、package、performance、coverageの各projectを区別して`./vitest.config.ts`で設定し、専用security projectだけが正確に`tests/security/**/*.test.ts`をincludeし、他の全projectがそのrootをexcludeし、`tests/integration/security/`はintegration projectが所有するようにする
- [ ] T009 [P] Playwright 1.61.1がinstallする正確なbrowser revisionを使うdeterministicなChromium、Firefox、WebKitのprimary-workflow/accessibility certification projectを `./playwright.config.ts` に設定し、pin済みrevisionは再現可能な自動baselineであってuser browserの網羅的一覧ではないことを文書化する
- [ ] T010 [P] 名前付き Node ESM `cli` および `parser-worker` エントリー、固定 `.mjs` 出力、バンドルするプロジェクトモジュール、外部化する宣言済み依存関係、無効化したマップ・宣言、クリーンな `.build/server` ステージングを `./tsdown.config.ts` で設定する
- [ ] T011 [P] 正確なshebang、packed exact `engines.node` string `^24.11.0 || ^26.0.0`と実行中versionが`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`内であることのbuilt-in-only検証、`dist/cli.mjs`のstatic importなし、検証後のdynamic-import placeholder正確に1件を備えるBOMなしのexecutable Node.js integrity-bootstrap skeletonを `./bin.mjs` に作成する
- [ ] T012 [P] 依存関係と、生成された Nuxt、サーバー、配布、カバレッジ、Playwright、Node.js のビルド出力だけを `./.gitignore` で無視する
- [ ] T013 正確に`pnpm run test:format`を実行する独立formatting-policy test jobを追加し、その成功後だけ正確に`pnpm run format:check`を実行する独立non-mutating checker jobを続ける。さらに独立したlint、type-check、unit、contract、integration、security、package、performance、documentation、coverage、browser jobを`.github/workflows/ci.yml`へ追加する
- [ ] T014 Node.js `24.11.0`と`26.0.0`を`ubuntu-24.04` x64、`macos-15` arm64、`windows-2025` x64と掛け合わせた正確な6つのlower-bound certification job、Node.js 24.18.0 `ubuntu-24.04` x64のdevelopment/build job 1件を `.github/workflows/ci.yml` に追加し、宣言済みNode.js 24/26 engine rangeがruntime compatibility contractでありsampleだけへsupportを狭めないことをlabelする

---

## フェーズ 2: Minimal Secure Foundation

**目的**: ブラウザーセッションや Repository 読み取りより前に存在しなければならない契約とセキュリティ境界だけを実装します。

**独立テスト**: 製品ワークフローを起動せず、closed DTO と source-value-free Diagnostic、正確な package manifest、capability の分類、中央 Node.js filesystem authority、generation 0 の状態を検証します。

**目に見えるチェックポイント**: セキュリティとパッケージの基盤が単独で合格し、中央権限の外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。

### テストと fixture

- [ ] T015 [P] parser message、retained graph、lifecycle Diagnostic、control、complete envelopeについてfailing deterministic testを追加する。Nodeのcontract宣言済みstructural-`lstat` checkpointからの正確な`ENOENT`以外のNode.js、decoder、parser、Worker、OS、filesystem、browser、assembly、serialization、execution-environmentのthrow/rejectionは、filesystem/parser/recognition/scan domainでcatch、cause分類、retry、item recovery、Diagnostic化、result body/generation化せず変更なしに伝播することを証明する。REST ownerだけがaccept前はnull `scanRequestId`、`202`後は同じnon-null IDのclosed generic `OperationError`として表し、ownerless automatic startupではprocess top levelへ到達し、last committed snapshotだけが残ることを`tests/unit/shared/runtime-failures.test.ts`で検証する
- [ ] T016 [P] Closed Diagnostic registry、deterministic aggregation、successful atomic publication、およびexact `OperationError { operationErrorId, code: "operation-failed", messageKey: "api.operationFailed", nextStepKey: "api.retryOrRestart", operationId, scanRequestId }`のfailing testを追加する。Cause taxonomy、`safeArgs`、source/file/path/root/filename、content/metadata、authored value、capability、body、parser/system/raw exception、runtime argumentを拒否する。別のclosed `OperationalEvent`はfixed codeとoptional opaque session/source/file/scan/operation IDだけを許可することを`tests/unit/shared/diagnostics.test.ts`、`tests/unit/shared/operation-errors.test.ts`、`tests/unit/shared/operational-events.test.ts`で検証する
- [ ] T017 [P] Complete decoded text/rangeと保持された`U+FFFD`を持つreadable `utf-8 | utf-8-bom | utf-8-replaced` file、NUL-containing diagnostic-only `binary`、one-root Source invariant、`process-cwd | cwd-option | default-home | environment`だけをoriginとするexact non-authorizing `SourceBoundary { displayRoot, origin }`、generation-0 origin selectionを含むpublic entity shapeのfailing testを追加する。Closed `DocumentationStatus = documented | partially-documented | unknown | conflict`、fixed-order `LifecycleQualifier = preview | experimental | deprecated`、重複禁止・`stable`推論禁止、exact record-specific `EvidenceAssessment { subjectKind, subjectId, documentationStatus, lifecycleQualifiers }`も検証する。Provenance、Relationship、Source Condition Factではowning/referenced behavior/rule/strategyごとに1件のsorted/deduplicated assessmentを保持し、scalar/worst-status/qualifier unionへ縮約せず、`documentation-conflict`をdocumentation statusとして拒否する。Closed descriptor、pathless session-scoped normalization-collision Diagnostic、ordinary Diagnostic scope、complete closed `OperationError`、opaque ID、strict versioned envelopeも扱い、internal authority、acknowledgement、validation、cause/raw-error fieldを`tests/unit/shared/entities.test.ts`と`tests/unit/shared/api.test.ts`で拒否する
- [ ] T018 Link、junction、non-regular、deep tree、VCS、safe-fs row 1–28の各mutation checkpoint、明示的directory enumeration中のcreate/remove/rename、usable/unusable/changing bigint `dev`/`ino`/`nlink` hard link、Codex ordered-fallback/late-derived alias、effective/ineffective `O_NOFOLLOW`、`platform-unobservable`のcross-platform fixtureを作る。External mutation harnessを使い、product側はmutation-capable API/flag 0件、consumeしたgroupごとにproduction content read 1件であること、before/after content/length/identity/link/mode/mtime/ctime/xattr/ACLとOS-only atimeを別記録することを`tests/fixtures/adversarial/build-filesystem-fixtures.ts`に実装する
- [ ] T019 Exact structural-`lstat` row 1–28のroot/selector/enumeration/resource lifecycle failing testを追加する。Row 1より前に、CLI root selection、Global preview classification、中央boundary admissionが再利用する1つのshared pure `LexicalAbsoluteRootParts` parserを直接testし、reject時のfilesystem/network call、checkpoint、authorityが0件であることを要求する。POSIXの`/`、accepted component、repeated/trailing separator、dot/dot-dot、U+FFFD、NUL、unpaired surrogate vector、およびWindowsのaccepted plain-drive root/componentと、rejected UNC/network/device/current-drive、drive-relative、malformed-drive、repeated/trailing separator、dot/dot-dot、NUL、unpaired surrogate vectorを扱う。続いてGlobal selectorごとにrow 20と共有prefix各componentのrow 2を再実行し、各row 2直後にrows 4–7を完了してから次operandへ進み、毎directory open前にrows 21–24、全sibling収集後buffer使用前にrows 25–28を実行する。Registered `fs.Dir`を`Dir.read()`でnullまで明示的に読み、dev/ino/mode/mtimeNs/ctimeNs guardを比較しclose-confirmed後だけbufferを使う。Raw `Dirent.name` operand、member I/O前のpathless session-scoped NFC collision、exact `ENOENT`変換のみ、その他throw/rejectionの変更なし伝播を`tests/unit/inspection/node-safe-fs.test.ts`で検証する
- [ ] T020 Private generation/`scanRequestId` ticket、全ticketのrows 8–19、one primary-handle read、read-only flag、same-handle identity、byte disposal、mutation call 0件に関するfailing testを追加する。1 Source scan attempt内ではCodex content-dependent branch以外の全static discovery/admission/group formationをread前に完了し、exact bigint identity、`ino !== 0n`、`nlink > 0n`、全phase/memberで等しいstable `nlink`、admitted count以下でない`nlink`だけをusableとする。Groupは1回だけ読み、Source/attempt/generation間は独立する。Zero-read `safe-fs-ordered-fallback-alias-rejected`と`safe-fs-late-derived-alias-rejected`でbyte/provenance再利用を禁止するtestを`tests/unit/inspection/node-safe-fs.test.ts`に追加する
- [ ] T021 Process-wide `ClosableResourceRegistry`のpreallocated `opening` reservation、exact FileHandle/`fs.Dir` ownership、共有one-call close promise、FileHandle close-event confirmation、synchronous close throw、promise fulfillment/rejectionとevent順序、`close-confirmed`/`close-unknown`、late eventによるpoison解除、directory unknownのrestart、owner propagation、disable-lineage transfer、double-close禁止を検証する。FileHandle event confirmationが優先し、その後のraw close-promise rejectionはobserveするがsuccessとして扱ってpoisonもowner propagationも起こさず、confirmationなしのrejectionはunknownのままownerへ伝播することを証明する。FR-024/FR-028 publication matrixとして、complete traversalとacquireした全resourceのconfirmed closure後に返る決定的なcandidate-local changed-entry/unusable-data valueだけがdiagnostic-only recordを保持でき、root/shared-ancestor guard、directory-enumeration guard、またはFileHandle/`fs.Dir`のclose未確認はcandidate record、partial generation、success receiptなしでSource attemptをabortすることを証明する。Detectable file/directory replacementではbyte/bufferを破棄し、cleanup/late discardはhard cancellationを主張せず、external mutationをproduct mutationに数えず、`platform-unobservable`をproofにしないことを`tests/integration/boundaries/node-safe-fs.test.ts`と`tests/unit/inspection/closable-resource-registry.test.ts`で検証する
- [ ] T022 中央権限の外にあるすべての調査対象ソースのファイルシステム読み取りを拒否する失敗アーキテクチャ契約を `tests/contract/inspection-io-boundary.test.ts` に追加する
- [ ] T023 [P] 256-bit 認証、constant-time 比較、Host/Origin/fetch-metadata 確認、CORS なし、厳格なメソッドとメディア、no-store response、partial processing を行わない環境依存の request-read failure、capability または記述された source value を一切露出しない error に関する capability の失敗テストを `tests/contract/host-security.test.ts` に追加する
- [ ] T024 [P] Root confinement、manifest の exact schema/order/declared byte length/hash と closed file set、import/bind 前の完全な hashing、必須だが削除する `200.html`/`404.html`、唯一 accept する HTML としての `index.html`、`<base>`・nonce・executable attribute・external/relative executable URL・unrecorded inline script・stale asset の rejection、および execution environment が artifact を完全に read/verify できない場合の安全な startup failure に関する failing build/packed-tarball/runtime-bootstrap test を `tests/package/build-cleanup.test.ts`、`tests/package/static-manifest.test.ts`、`tests/package/server-manifest.test.ts` に追加する
- [ ] T025 正確な `.mjs` レコード、必須 CLI/Worker エントリー、再帰的に正確な二つのマニフェスト集合、production graph digest と正確な runtime leaf、`gunshi` 0.37.0の正確なintegrityとbundle済みpayload全体のdigest、`gunshi/agent`/lazy/custom-plugin pathを含まないroot-API-only CLI import、ならびに `open`、Rust/C/C++/Cargo、Node-API/native/binary/Wasm payload、prebuild、platform selector、package shell helper、Node 以外の shebang、lifecycle/runtime download の拒否に関する server-manifest および package-policy の失敗テストを `tests/package/server-manifest.test.ts`、`tests/package/production-graph.test.ts`、`tests/package/node-only-policy.test.ts` に追加する
- [ ] T026 [P] Captured invocation working directoryとoptional `--cwd`からlexicalに選択したexactly one enabled idle Repository Sourceをgeneration 0がfilesystem I/O 0件で同期的に持つfailing generation/session testを追加する。Stable opaque `sourceId`、escaped non-authorizing `SourceBoundary`、empty files/Diagnostics、null `scanRequestId`、そのSourceから始まるautomatic first scanを検証する。全admitted automatic/explicit Source/progress/attempt/final status/successful generationでone opaque request IDを保持し、deterministic graph ID、coordinator-locked serialization、atomic N+1 replacement、ID rekey、single-buffer encoding、mutation前overflow rejection、last-commit retention、explicit-rescan stale state、late-result discardを扱う。Generic closed `OperationError`はaccept前ならnull IDかつjob/retentionなし、accepted jobならmatching non-null IDを保持し、ownerless automatic-startup rejectionはcatch/conversionされずprocess top levelへ到達することを`tests/unit/session/scan-generation.test.ts`と`tests/unit/session/session.test.ts`で証明する

### 実装

- [ ] T027 Filesystem、decoder、parser、Worker、recognition、scan layerではthrow/rejectionをnormalizeまたはcause inspectせず、contract-declared structural-`lstat`のexact `ENOENT`以外はcatch/retry/cause classification/recovered item/Diagnostic/scan result/response body/generation化せず変更なしに伝播するclosed failure-observability contractを実装する。REST-owning outer boundaryだけがgeneric path/content-free closed `OperationError`を、accept前はnull `scanRequestId`かつjob/retentionなし、`202`後はmatching non-null IDをretainして作り、ownerless automatic-startup rejectionはprocess top levelへ到達させる。`OperationError`、closed Diagnostic、fixed-code/opaque-ID `OperationalEvent`を分離し、Inspector capacity ceilingを定義せず、prior snapshotを保持してfailed/late workをrevoke/discardする処理を`shared/runtime-failures.ts`、`shared/diagnostics.ts`、`shared/operation-errors.ts`、`shared/operational-events.ts`、`src/host/runtime-failures.ts`へ実装する
- [ ] T028 Readable `utf-8 | utf-8-bom | utf-8-replaced`、diagnostic-only `binary`、one-root Source、generation 0、exact `SourceBoundary`、descriptor、Source Condition Fact、Diagnostic、closed `OperationError`のpublic DTOを実装する。`DocumentationStatus` typeのscalar field `documentationStatus`とfixed-order duplicate-free `LifecycleQualifier[]` typeのscalar field `lifecycleQualifiers`をbehavior/rule/strategyごとに置き、provenance/Relationship/recognition/Factではreferenced subjectごとにsorted record-specific `EvidenceAssessment[]`を縮約なしで実装する。Normalization collisionはpathless session scopeとし、internal authority、acknowledgement、validation、cause/raw error、aggregate status、捏造した`stable` fieldを`shared/entities.ts`と`shared/api.ts`で拒否する
- [ ] T029 Private `InspectionRootContext`、`DirectoryEnumerationGuard`、single process-wide `ClosableResourceRegistry`を`src/inspection/safe-fs.ts`に実装する。`open`/`opendir`前に`opening`を予約しexact resourceを同期attachし、shared close promise/strong referenceとFileHandle close eventを保持し、`close-confirmed`/`close-unknown`、poison、late FileHandle回復、directory restartを実装する。Confirmed FileHandle close eventはraw close promiseの後続rejectionよりauthoritativeとし、そのrejectionをobserveしつつpoison/propagationなしでsuccessとし、event confirmationなしのrejectionはunknownのままownerへ伝播する。Contract-declared structural `lstat`のexact `ENOENT`だけをcatchし、その他owner errorは変更せず伝播させ、RESTではOperationError、ownerless startupではtop levelに到達させる
- [ ] T030 Data-model contractのexact closed POSIX/Windows grammarとparsed operandを持つsingle side-effect-free shared pure `LexicalAbsoluteRootParts` parserを、row-1 operationより前に`src/inspection/safe-fs.ts`で定義・exportする。CLI root selection、Global preview classification、中央boundary admissionは再実装せず同じparserをcallし、parser rejectionではcheckpoint/authorityを作らずfilesystem/network I/Oを0件とする。Closed immutable versioned `TraversalPlan`、segment-program type、structural checkpoint catalogを最初に`src/inspection/rules/types.ts`で定義し、`src/inspection/safe-fs.ts`はそれらのtypeだけを解釈してrows 1–28をexactに実装する。Per-selector row 20/shared-prefix row 2、各selected component直後のrows 4–7、全`opendir`前のrows 21–24、registered `Dir.read()` until null、全sibling収集後のrows 25–28とdirectory metadata比較/confirmed close後のbuffer使用を保証する。Raw operand、pathless session collision、VCS exclusion、exact `ENOENT` outcome、ticketを保持する。Codex fallback以外はstatic groupをread前に完成し、usable stable bigint dev/ino/nlinkで1 Source scan attempt内だけgroup化し、Source/attempt/generationでreadを共有しない
- [ ] T031 全ticketのrows 8–19をexactly one primary-handle readの前後で実行し、same-handle identity、read-only flag、effective `O_NOFOLLOW`、byte disposal、exact structural-`lstat` disappearance、その他throw/rejectionの変更なし伝播を実装する。Codex ordered-fallback aliasとlate-derived aliasはzero open/readでbyte/provenanceを再利用せず拒否する。全FileHandle/`fs.Dir` cleanupを`ClosableResourceRegistry`へ集約し、revoked pending resourceをdisable lineageへtransferし、closeを1回invoke/joinしてlate resultを破棄し、unconfirmed closeをownerへ伝播し、hard cancellationを主張しない処理を`src/inspection/safe-fs.ts`へ実装する
- [ ] T032 成功値として決定的に返る`safe-fs-boundary-unverifiable`だけを`src/inspection/safe-fs.ts`で扱い、root/shared ancestorまたはdirectory-enumeration guardは`sourceId`、`fileId`、`sourceRelativePath`をすべて禁止するpathless session scope、admitted candidateはcomplete traversalとacquireした全resourceのregistry-confirmed closure後に限りcoherent primary `sourceId`/`fileId`/`sourceRelativePath`を持つfile scopeで拒否する。このcandidate-local caseだけにdiagnostic-only recordを許し、root/shared-ancestor/directory-guardまたはunconfirmed-close caseはcandidate record、contracted-partial generation、success receiptなしでSource attemptをabortする。Throw/rejectionをこのDiagnosticへ変換せず、carveout外のexceptionは変更なしに伝播する
- [ ] T033 Active source-root/ancestor replacementは全platformでinitial threat model外、active final-component replacementはeffective `O_NOFOLLOW`なしの場合だけscope外、全detectable changeはscope内でfail closed、`platform-unobservable` outcomeはnon-provingであること、および将来のpublic Node.js APIまたはOS-enforced resolution pathを `src/inspection/safe-fs.ts` に記載する
- [ ] T034 capability 生成、constant-time 認証、capability-safe なリクエスト分類を `src/host/capability.ts` に実装する
- [ ] T035 Cleanup/static placeholderだけを置き換える。`scripts/clean-build-output.mjs`ではcleanupをgenerated rootに限定し、`scripts/build-static-manifest.mjs`ではNuxt `.output/public`を`dist/public`へnormalize/copyして、normalized path、exact static-manifest schema、closed safe-file set、declared-versus-actual byte length、deterministic hash/CSP hash、accepted HTML/URL case、required fallback removalだけを保証し、complete environment-supported read/verificationを完了できなければbuildを失敗させる
- [ ] T036 Server/package placeholderだけを置き換える。`scripts/assemble-server-manifest.mjs`でexact server `.mjs` manifestを生成し、`scripts/build-production-graph.mjs`でproduction dependency graphをdigestし、`scripts/verify-package-files.mjs`でexact two-manifest/package file setとNode.js-only policyをrecursiveにverifyし、T003でscaffoldしたfixed Node ESM CLI/Worker entryを保持する
- [ ] T037 Captured invocation `cwd`/`--cwd`から選択されたexact enabled idle non-authorizing Repository Sourceをgeneration 0へ同期構築し、stable source ID、empty files/Diagnostics、null request ID、I/O 0件を保証して他のgeneration-0 shapeをrejectする。Admitted statusからsuccessful generationまでone request IDを保持し、coordinator-locked serialization、atomic N+1 replacement、mutation前overflow rejection、explicit-rescan stale retention、accepted-job `OperationError` retention、startup rejectionのprocess top-level propagation、authority revocation後のcleanup-only late-result discardを`src/session/scan-generation.ts`、`src/session/stale-failures.ts`、`src/session/session.ts`に実装する
- [ ] T038 Method/media/request-key/no-store guard、lock下payload capture、canonical production JSON、exact `Content-Length`、unchanged-buffer deliveryを持つstrict routerを実装する。REST-owned throw/rejectionだけをこのouter boundaryでcatchし、accept前はnull `scanRequestId`/HTTP 500/no job・result・generation、`202`後は同じnon-null IDのretained `OperationError`とする。Raw causeを公開せず、delivery failureをpartial化せず、commit済みsnapshotを維持する処理を`src/host/api-router.ts`に実装する
- [ ] T039 `platform-unobservable` のケースに対する証明を主張せず、中央ファイルシステム権限と Node.js 専用パッケージポリシーの suite を CI で実行するよう `.github/workflows/ci.yml` に追加する

---

## フェーズ 3: 起動可能な認可済み空画面

**目的**: Repositoryを読み取らずに、最初のuser-visible product incrementを提供する。

**独立テスト**: Packageをinstallし、fixture invocation `cwd`からoptional `--cwd`あり/なしでlaunchし、printed loopback URLを開いてone-time fragmentからauthenticateする。Generation 0がcaptured invocation `cwd`/`--cwd`からlexicalにselectedされたexactly one enabled idle Repository Sourceを同期的に持ち、そのSourceはstable opaque `sourceId`、escaped non-authorizing boundary、empty files/Diagnostics、null `scanRequestId`を備え、filesystem I/Oが0件であることを検証する。

**目に見えるチェックポイント**: Authorized browser screenが起動し、product contentはほぼ何も表示されない。

### テスト先行

- [ ] T040 [P] [US1] Fixed manifest asset、exact declared/actual length/hash、closed SPA fallback、exact CSP、supported Node engine、CLI evaluation/bind前のcomplete package/two-manifest/every-asset verificationとその後exactly one dynamic `import('./dist/cli.mjs')`、loopback-only bind、startup documentation/network access 0件、customization contentをclassifyしないpackage checkに関するfailing contractを追加する。Ownerless automatic-startup throw/rejectionがproduct liveness guarantee、`OperationError`、Diagnostic、scan result、raw-error operational recordへ変換されずprocess top levelへ到達することを`tests/contract/static-routes.test.ts`と`tests/contract/host-startup.test.ts`で証明する
- [ ] T041 [P] [US1] Fragment、memory-only Bearer、authorization loss、request token/`clientDataEpoch`/generation/file ID/`globalContentEpoch` guardのfailing client testを追加する。全inspection-data successはcaptured epochを持ち、final response gateでepoch不変かつ`globalDisableInProgress` nullの場合だけrenderする。これとは別に、全liveness successはsame-lock current epoch/current fence projectionであり、non-null fenceをcontrol dataとしてacceptし、greater epochまたはnon-null fenceではGlobal disable送信前と同じfull client-data purgeを行ってcontrol recoveryだけをrenderする。Late response rejection、older/equal/newer generation、persistence 0件、unauthorized call 0件も`tests/unit/app/api-capability.test.ts`で検証する
- [ ] T042 [P] [US1] Initial authorization、visible/focused stateへの復帰、明示的Resume、fresh-session adoptionというexact 4 triggerだけでlifecycle liveness checkを発行し、経過時間、continuously visibleなidle state、無関係なrender/status change、automatic polling loopでは発行しないfailing browser-state testを追加する。Exact DTO `{ sessionId, globalContentEpoch, globalDisableInProgress }`、browser/network/runtime rejection/full purge、client epoch increment、およびpurge、teardown、newer request tokenより前にcaptureした全settlementのrejectionを要求する。Product定義のpolling interval、request timeout、retry timer、memory leaseがなく、in-flight checkが最大1件であること、このsingle-flight behaviorはstale responseを拒否するためstate adoptionをserializeしresource admissionまたはvalidation ceilingではないことを証明する。Fence nullならfresh full snapshot baseline、fence non-nullならexact `GlobalFenceRecoverySnapshot`だけを許可し、terminal disable successまたはrestartまでfull inspection DTOをrenderしない。Generation 0、authorization loss、matching-baseline Resume、hidden/page lifecycle teardown、listener disposal、continuously visibleなidle page上のprocess lossにwall-clock保証がないことを`tests/unit/app/session-shell.test.ts`と`tests/unit/app/liveness.test.ts`で扱う
- [ ] T043 [P] [US1] Gunshiのroot `define`/`cli` API、positive default-true `open`/generated `--no-open`、高々1回指定できるoptional `--cwd <path>`に関するfailing CLI/package launch testを追加する。`process.cwd()`をexactly once captureし、省略時はそのexact invocation stringを保持する。Windowsでは`resolve`前にleading separator 2個の全UNC/server-share/device spelling、single-separator current-drive/root-relative value、`C:`/`C:foo`を含むdrive-relative valueをrejectし、plain relative optionだけをcapture済みanchored drive-form valueに対してresolveしてabsolute drive optionは変更しない。POSIXはabsolute optionを保持するかrelative optionをcaptureに対してresolveする。全selected absolute resultに、Global previewと中央admissionも再利用する1つのshared pure `LexicalAbsoluteRootParts` parserへの合格を要求する。Package-bootstrap I/Oとselection I/Oを別に計装し、CLI import前はT040/T046の固定package所有manifest/declared-asset readだけを許可し、その後のselection自体はfilesystem/network I/O 0件で、`process.chdir()`もper-drive working-directory semanticsも使わず、missing/empty/duplicate/pre-resolution-invalid/parser-rejected valueをsession作成またはbrowser起動前にfixed actionable source-value-free outputでrejectする。Rejectされたlaunchは起動時`cwd`、`--cwd`、selected rootからderiveしたI/OとDNS、SMB、outbound-network callを0件とする。`process.cwd()` throwをinjectし、session、browser、`OperationError`を作らずownerless FR-041 process-top-level propagationとなることを要求する。POSIXのaccepted root/component、repeated/trailing separator、dot/dot-dot、U+FFFD、NUL、unpaired surrogate、およびWindowsのaccepted plain-drive root/componentとrejected UNC/network/device/current-drive/root-relative、`C:`/`C:foo` drive-relative、malformed drive、repeated/trailing separator、dot/dot-dot、NUL、unpaired surrogate vectorを扱う。Non-binding help/version、strict unknown/positional/rest rejection、awaited completion、exact package field、isolated install、closed loopback URL、fixed OS browser helper/environment allowlist、inspection-derived helper inputなし、manual fallback、clean shutdown、root-only import、admission前のinspected-source read 0件も`tests/unit/cli.test.ts`と`tests/package/npx-launch.test.ts`で扱う
- [ ] T044 [US1] Exact one enabled idle Repository Sourceと、そのescaped non-authorizing selected-root label、empty files/Diagnostics、null `scanRequestId`を表示するauthorized generation-0 shellについてfailing browser acceptanceを`tests/e2e/boot.spec.ts`へ追加する。Authorization loss、complete liveness purge、fresh-baseline control-only recovery、matching-baseline Resume、keyboard focus、Repository picker/ancestor discovery不在も扱う

### 実装

- [ ] T045 [US1] 固定マニフェストアセットの提供、閉じた SPA fallback、正確な MIME validation、正確な CSP serialization を `src/host/static-files.ts` に実装する
- [ ] T046 [US1] Verified loopback host-bootstrap boundaryを実装する。Supported-engineとcomplete exact-set/schema/length/hash verificationにはbuilt-inだけを使い、CLI evaluation/bind前に完了した後でexactly one dynamic `import('./dist/cli.mjs')`を行う。Automatic inspected-source workを含む全ownerless startup throw/rejectionは`OperationError`、Diagnostic、liveness guaranteeを作らずprocess top levelへ到達させる。Loopback-only bind、capability-protected exact control-only liveness `{ sessionId, globalContentEpoch, globalDisableInProgress }`、CLI presentation/認証済みDiagnostic/REST `OperationError`と分離したpath/content-free fixed-code/opaque-ID `OperationalEvent` sink、startup documentation/network access 0件を`./bin.mjs`、`src/host/api-router.ts`、`src/host/server.ts`、`src/host/operational-events.ts`で保証する
- [ ] T047 [US1] Gunshi root `define`/`cli` entryへpositive default-true `open`、generated `--no-open`、高々1回指定できるoptional `--cwd <path>`を実装する。Validation前に`process.cwd()`を1回captureし、省略時はそのexact stringを使う。Windowsではleading separator 2個のUNC/server-share/device、single-separator current-drive/root-relative、`C:`/`C:foo` drive-relative inputを`resolve`前にrejectし、plain relative inputだけをanchored captureに対してresolveしてabsolute drive inputを保持する。POSIXはabsolute inputを保持するかrelative inputをcaptureに対してresolveする。Selected absolute resultに、Global previewと中央admissionもcallするT030のsingle shared pure `LexicalAbsoluteRootParts` parserへの合格を要求する。Verified package bootstrap後のselection自体はfilesystem/network I/O 0件で、`process.chdir()`もper-drive working-directory semanticsも使わず、missing/empty/duplicate/pre-resolution-invalid/parser-rejected inputはsession/browser作成前にfixed actionable outputとnonzero exitで拒否し、起動時`cwd`、`--cwd`、selected rootからderiveしたI/OとDNS、SMB、outbound-network callを0件とする。`process.cwd()` throwはsession、browser、`OperationError`を作らずFR-041に従ってprocess top levelへ伝播させる。Strict unknown/positional/rest拒否、awaited completion、non-binding help/version、root-only import、one-time closed loopback URL、fixed OS browser helper、exact ambient allowlist/inspection-derived-input exclusion、usable printed-URL fallback、graceful shutdownを`src/cli.ts`と`src/launch-browser.ts`に実装する
- [ ] T048 [US1] One-time capability capture、memory authorization、request token、abortable request、`clientDataEpoch`/generation/file ID/`globalContentEpoch` guardを実装する。Inspection-data successをrenderする前にcaptured epochがcurrentかつ`globalDisableInProgress` nullであることを要求する。Livenessはsame-lock current-epoch/current-fence projectionとして別扱いしnon-null fenceを許可し、そのgreater epochまたはnon-null fenceではshared full purge後にliveness/control recovery projectionだけをadoptし、全stale inspection-data responseをrejectしてterminal successまでfence recoveryだけを許可する処理を`app/composables/api.ts`に実装する
- [ ] T049 [US1] Session/liveness/document loss、Global disable送信前、greater `globalContentEpoch`/non-null fence観測時に共有するsingle synchronous full client-data purgeを実装する。Liveness ownerではlifecycle listenerをinstall/disposeし、initial authorization、visible/focused stateへの復帰、明示的Resume、fresh-session adoptionというexact triggerだけでcapability保護checkを発行する。Polling interval、request timeout、retry timer、memory leaseを使わず、state-adoption serialization invariantとしてin-flight checkを最大1件とし、request tokenまたは`clientDataEpoch`がstaleになった全settlementを拒否する。Browser/network/runtime rejection、authorization/session mismatch、hidden/page teardownは同じpurgeを呼ぶ。全session/inventory/Source/file/Diagnostic/relationship/comparison/DOM/editor/filter/warning/acknowledgementをclearし、requestをabortし、`clientDataEpoch`をincrementしてmemory capabilityだけを保持する。Fence nullではfresh full snapshotとmatching-baseline Resume、fence中は`GlobalFenceRecoverySnapshot`とexact liveness control/errorだけを許可し、同等な英日messageを`app/composables/session.ts`、`app/composables/liveness.ts`、`app/app.vue`、`app/locales/en.ts`、`app/locales/ja.ts`、`app/styles/main.css`に実装する

---

## フェーズ 4: Codex SKILL 一覧

**目的**: Codex skills を対象に、最初の安全な Repository inventory 単位を提供します。

**独立テスト**: root と入れ子の `.agents/skills/*/SKILL.md`、near miss、link、不正な名前、hard-link alias、無関係なファイルを含む fixture から起動し、allowlist 対象の Codex skill row だけが path、source、kind、tool とともに表示されることを検証します。

**目に見えるチェックポイント**: Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。

### fixture とテストを先行

- [ ] T050 [US1] Positive、nested、near-miss、hard-link、malformed-name、linked、empty、secret-bearing、performance、注入した execution-environment throw/rejection の各 Codex SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T051 [US1] Codex skill の behavior、rule、strategy、evidence の conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T052 [P] [US1] 安定した reciprocal ID、閉じた matcher/traversal/derivation kind、Repository の `./` anchoring、bare `**/` の拒否、literal/one-segment/non-adjacent-recursive token grammar、canonical な selector/program round trip、immutable で versioned な `TraversalPlan` output、evidence grammar/fingerprint、production runtime からの official-source registry 除外に関する registry/compiler の失敗契約を `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T053 [P] [US1] `./**/.agents/skills/*/SKILL.md` が typed plan へ一度だけ compile され、安全な filesystem はその plan だけを実行し、vendor code は match の分類だけを行い、descendant/near-miss/VCS 動作が正確で、runtime-chain fact が引き続き conditional であることを証明する Codex SKILL の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T054 [P] [US1] tool、`skill` kind、path provenance、無関係な recognition がないことに関する Codex recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T055 [P] [US1] Captured `cwd`/`--cwd`からlexicalにselected済みのgeneration-0 Sourceで始まるfailing Repository scan testを追加する。Stable `sourceId`、escaped boundary、enabled idle state、empty files/Diagnostics、null request IDはadmission前にfilesystem I/O 0件で同期的に存在するがread authorityを与えず、central admissionはretained raw selected rootだけを使う。Raw segment、collision-free NFC、member I/O前にcolliding raw-sibling groupごとにexactly one出すpathless session-scoped Diagnostic、T020のone-Source-scan-attempt static-prepass/usable-identity/read-once/independent-attempt/primary-alias-provenance/ordered-fallback/late-derived ruleを検証する。Exact structural `lstat` `ENOENT`だけをreturned outcome化し、その他throw/rejectionはdomainを変更なく伝播してattempt result/generationを作らずREST `OperationError`またはownerless-startup top levelへ到達する。FR-024/FR-028のexact matrixとして、confirmed-close済みcandidate-local returned outcomeだけがdeterministic contracted-partial valueを作れ、root/shared-ancestor/directory guardとunconfirmed closeはcandidate record、generation、success receiptを一切作らないことを検証する。Request-bound ticket、atomic recognition、last-commit retention、revocation、verdictなし、relationship-target readなしを`tests/integration/repository-scan.test.ts`で扱う
- [ ] T056 [P] [US1] `--no-open`またはisolated startup helper後に開始するinstrumentationを使う。Local fixture rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。発行済みのexactな`127.0.0.1` authorityにおける2つのexactなFR-022 authorized internal loopback class、すなわちclosedなunauthenticated static/SPA `GET`/`HEAD`とcapability-authenticated declared API requestを別々に分類・検証する。それ以外の全surfaceについて、Codex SKILL discoveryがchild process、dynamic evaluation/import、MCP connection、禁止対象のdirect product-issued outbound request、URI load、mutation-capable open/filesystem mutationを発生させないことを証明する。Explicit UNC/server-share/device inputではfilesystem/DNS/SMB call 0件を証明し、lexicalに識別不能なpre-mounted/mapped network storageは除外したOS-mediated limitationとして文書化する。Content/length/identity/link/mode/mtime/ctime/xattr/ACL stateを比較し、OS-only atimeは別に記録する。対象は`tests/integration/security/zero-activation.test.ts`とする
- [ ] T057 [P] [US1] Generation 0のexactなRepository Sourceと`process-cwd`/`cwd-option` boundary origin、`GET /api/v1/session`、exact liveness `{ sessionId, globalContentEpoch, globalDisableInProgress }`、Repository rescan admissionのfailing contractを追加する。Normal inspection-data successは`globalContentEpoch`を持ち、final gateでunchanged epochとnull fenceを再確認する。Disable fenceがnon-nullの間はsession routeが`GlobalFenceRecoverySnapshot`だけを公開し、他のfull data routeは`409 global-disable-pending`とする。Process-wide resource registryがpoisonedなら、`POST /api/v1/repository/rescan`をscheduling、ID/job allocation、state mutation、filesystem I/Oより前に`409 resource-cleanup-restart-required`で拒否する。Exactなpre-/post-acceptance `OperationError`、startup ownership、request correlation、deterministicなfirst-scan対explicit stale behavior、stale ID、immutable whole-buffer deliveryを`tests/contract/http-api-session.test.ts`で検証する
- [ ] T058 [P] [US1] Codex row、`SourceBoundary.displayRoot`と`origin`からrenderするescape済みでinertなRepository root labelを全Source-relative item pathと区別しnavigation/read locatorとして再利用しないこと、source/path/kind label、progress、empty state、rescan、retry、diagnostics、およびsession summaryがsource textやdeclared valueを一切露出しないことに関するinventoryの失敗テストを`tests/unit/app/inventory.test.ts`に追加する
- [ ] T059 [US1] Codex 専用 fixture を起動し、source content を含まない正確な SKILL 一覧が表示されることに関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-list.spec.ts` に追加する
- [ ] T060 [US1] Reciprocal behavior、rule、evidence、affected-contract referenceに関するCodex skill registry-graph coverageに加え、sole `EvidenceAssessment[]` assembler contractの失敗テストを追加する。Owning ruleと参照する全behavior/strategyをresolveし、`(subjectKind, subjectId)`ごとにexact subject recordを正確に1件copyし、missing/duplicate subjectをrejectし、fixed subject-kind/ID orderでsortし、scalar/worst/qualifier-union reductionを禁止することを`tests/contract/vendor-behaviors.test.ts`と`tests/contract/inspection-rules.test.ts`で証明する

### 実装

- [ ] T061 [US1] Registry recordを実装し、closed matcher/traversal/`DerivationProgram` grammarをT030で定義済みの`TraversalPlan`/segment-program typeへwidenせずcompileする。Canonical round trip、reciprocal validation、one-edge derivation acyclicity、Repositoryの`./` anchoring、official-source evidenceを除外するproduction loading、およびnatural-language interpretation/ranking、customization correctness/validity/compliance/effectiveness/quality verdict、validation/lint、remediation/fix behaviorを表現不能にするallowlisted structural projection vocabularyをenforceする。`src/inspection/rules/registry.ts`ではT060がtestするsole `EvidenceAssessment[]` assemblerを実装し、owning ruleと参照する全behavior/strategy subjectをresolveし、各exact subject recordを1回copyし、missing/duplicateをrejectしてfixed subject-kind/ID orderでsortし、recognizer/relationship/fact projectionが再計算・縮約せずconsumeできるarrayを公開する。Shared typeは`src/inspection/rules/types.ts`へ保持する
- [ ] T062 [US1] 読み取り権限を付与しない `codex.behavior.repo.skills`/`codex.behavior.user.skills` statement を完全な base skill-discovery strategy とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T063 [US1] 読み取りを認可する `codex.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T064 [US1] Codex skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T065 [US1] vendor 所有の walker や selector 再解釈を使わず、registry で compile された `codex.repo.skill` plan に対する Codex skill classification を `src/inspection/rules/codex.ts` に実装する
- [ ] T066 [US1] parsing や source exposure を行わず、path-derived Codex skill recognition を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T067 [US1] Generation-0 boundaryではなく別にadmitしたretained raw rootからRepository scanをorchestrateし、T030 `TraversalPlan` workを`src/inspection/safe-fs.ts`へsubmitしてtyped ticket/resultだけをconsumeする。Raw operandとcollision-free NFC public pathを保持し、normalization-collision lifecycleごとにpathless session-scoped Diagnosticを1件emitするが、`src/inspection/scan.ts`ではenumeration、filesystem API call、rows 1–28、directory guard、hard-link prepass、byte read、process-wide close registryを実装しない。それらはT019–T021/T030–T031に従いsafe-fsだけが所有する。Exact structural-`lstat` `ENOENT` returned outcome、その他throw/rejectionのunchanged propagation、deterministic contracted-partial value、authority revocation、late discard、no verdictを`src/inspection/scan.ts`でorchestrateする
- [ ] T068 [US1] Generation 0 Sourceからautomatic first scanとFIFO explicit rescanを実装し、1つのrequest IDをSource/progress/attempt/generationで保持する。Raw rootだけをadmitし、atomic complete/contracted-partialはdeterministic returned outcomeに限定する。Ownerless startup throw/rejectionはOperationError/liveness保証なしでprocess top levelへ到達させる。Accept済みexplicit REST rescan jobがfatalにrejectした場合はprior commitを保持し、そのaccepted-job Operation Errorを参照するstale overlayを作成または置換するが、accept前rejectionはprior snapshotを変更せずstale overlayを作成しない。既存overlayはsuccessful replacementでのみclearし、generation IDをrekeyしてlate workをdiscardする処理を`src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts`に実装する
- [ ] T069 [US1] Deterministic Repository summary/admissionとcomplete closed `OperationError` REST lifecycleを`src/host/api-router.ts`へ実装する。Generation-0 Sourceはexact escaped non-authorizing boundaryとnull request IDを持ち、successful admissionはSource/progress/status/generationをcorrelateする。Pre-acceptance throw/rejectionはHTTP `500`とnull request IDのgeneric errorだけを返しjob/retentionを作らず、accepted-job rejectionは同じclosed errorをnon-null request IDでretainし、Diagnostic/result/generation/raw causeを作らない。Accept済みの明示rescan jobがfatalに終了した場合は必ずそのSourceのstale overlayを作成または置換しなければならず（MUST）、throw/rejectionではaccept済みjobの`OperationError`だけを、決定的なreturned fatal outcomeではlifecycle Diagnosticを参照する。Pre-acceptance failure、initial scan、initial/retry Global batchはstale overlayを作成してはならない（MUST NOT）。Repository rescanはprocess-wide registryをschedule前にgateし、poisonedなら`409 resource-cleanup-restart-required`、ID/job/state mutation/filesystem I/O 0件としてprior snapshotを保持する。Conflict、stale ID/snapshot、authenticated DTOだけのSource-relative pathを保持し、root/path/raw errorをoperational recordへprojectしない
- [ ] T070 [US1] generation-aware な source/tool/kind/Source-relative-path filter、Source ごとの stale marker、retry state、成功した replacement の後だけ行う cleanup を `app/composables/filters.ts` と `app/composables/session.ts` に実装する
- [ ] T071 [US1] Escape済みでinertな`SourceBoundary.displayRoot`/`origin` root labelをSource-relative item pathから視覚的・意味的に区別しnavigation/read locatorとして使わないaccessibleなRepository header、current/stale snapshot status、active `scanRequestId`のstateだけを表示しolder status/inventoryでnewer commandを満たせないrequest-correlated progress/rescan control、Source-relative-path filter、Codex SKILL list、item summaryを`app/pages/index.vue`、`app/components/inventory/ScanProgress.vue`、`app/components/inventory/InventoryFilters.vue`、`app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue`に実装する。自動更新statusにはunderlying scanを停止しないkeyboard操作可能なpause/resumeとon-demand refreshを提供する
- [ ] T072 [US1] actionable diagnostics と Codex scope の empty state を `app/components/diagnostics/DiagnosticList.vue` に実装する
- [ ] T073 [US1] 意味的に同等な英語・日本語の Codex inventory、progress、empty-state、retry、boundary message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 5: Codex SKILL 詳細

**目的**: Codex の `SKILL.md` ファイルを、完全で非活性な記述済み source とclosedなallowlist済みtyped metadata として安全に調査できるようにし、別個の物理 candidate である `agents/openai.yaml` はまだ admission しません。

**独立テスト**: hostile、malformed、literal credential を含む、changing、metadata-bearing な Codex `SKILL.md` ファイルを開き、sensitive-content notice を acknowledge した後、正確で完全な source と metadata literal、credential masking または reveal control がないこと、environment reference を解決しないこと、activation なし、relationship expansion なし、close または rescan 時の cleanup を検証します。

**目に見えるチェックポイント**: Codex SKILL を選択すると、完全で非活性な detail 画面が開きます。

### fixture とテストを先行

- [ ] T074 [US2] Codex SKILL の frontmatter、reference、script、command、埋め込み markup、credential に対応する、生成済み hostile fixture と維持対象 secret fixture を `tests/fixtures/adversarial/build-fixtures.ts` と `tests/fixtures/secrets/build-fixtures.ts` で拡張する
- [ ] T075 [P] [US2] NUL byteを1つでも含む場合はdiagnostic-only `binary`となり、source/range/authored literal/comparisonを一切公開せず、otherwise publishableなgenerationをcontracted-partialにするfailing post-read verified-byte testを追加する。全non-NUL fileはUTF-8 replacement semanticsでexactly once decodeしてreadableな`utf-8`、`utf-8-bom`、または`utf-8-replaced`とし、先頭BOMを正確に1つrecord/removeし、挿入された`U+FFFD`をcomplete `sourceText`と通常のparse/extraction/display/comparisonへ保持したままscanのpartial原因にしない。Alternate charset、retry、sampling、truncationがないことに加え、inert Markdown/frontmatter、safe YAML、exact range、canonical typed literal、deterministic malformed extraction、mandatory Worker dispatchを扱い、decoder/parser/Worker/execution-environmentの全throw/rejectionがdomain catch、cause classification、recovered result、Diagnostic、generationなしに変更なく伝播することを`tests/unit/inspection/parsers.test.ts`で証明する
- [ ] T076 [P] [US2] Fixed package URLとenvironment-owned capacityに関するWorker-pool failing testを追加する。Worker crash、handler throw、message/parser rejectionはpool/parser/scan domainでcatch、cause分類、retry、Diagnostic、recovered result/partial/generation化せず変更なしに伝播し、trigger-owning REST boundaryだけがgeneric OperationError lifecycleを適用するかstartup top levelへ到達する。Worker replacementはlater admitted attemptだけに許可し、authority revocationとlate discardを`tests/unit/inspection/seed-parsers.test.ts`で扱う
- [ ] T077 [P] [US2] literal credential、duplicate field、quote/escape/punctuation、environment-reference text、surrogate pair と combining mark をまたぐ UTF-16 range、JSON transport round trip、process environment lookup なし、masking/reveal artifact ゼロに関する正確な表示の失敗テストを `tests/unit/inspection/source-occurrences.test.ts` に追加する
- [ ] T078 [P] [US2] inert frontmatter、閉じた field ID、source 順の duplicate occurrence、正確な authored literal と round trip 可能な UTF-16 range、内部専用 typed semantic、provenance、conditional discovery、skill resource、environment reference の非解決、evidence に関する Codex metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T079 [P] [US2] inferred effective aggregate を作らず、authored、available、selected、omitted、shadowed、disabled、conditional、unknown を投影する applicability の失敗テストを `tests/unit/inspection/applicability.test.ts` に追加する
- [ ] T080 [P] [US2] runtime-chain condition、same-name handling、unknown selection fact に関する Codex skill-composition の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T081 [P] [US2] Complete inert authored source、ordered `authoredLiteral`、strict/stale ID、no-store、minimum metadataのfile-detail failing contractを追加する。Encoding/serializationのthrow/rejectionはREST outer routerだけがcatchし、generic null-ID pre-acceptance `OperationError`/HTTP 500、job/result/generation/success bytes 0件とする。Post-commit delivery rejectionはcommitを変更せずsuccess payload 0件、raw causeなし、partial化なしであることを`tests/contract/http-api-files.test.ts`で証明する
- [ ] T082 [P] [US2] `POST /api/v1/files/{fileId}/reveals` と、masking・redaction・reveal・environment resolution のすべての endpoint が、client/server state を保持せず `404` を返すことを証明する route 不在の失敗契約を `tests/contract/http-api-routes.test.ts` に追加する
- [ ] T083 [P] [US2] same-origin Monaco、完全な authored source の read-only model、正確な read-only option、非活性な rendering、accessibility、request-token adoption、disposal に関する direct-detail の失敗テストを `tests/package/monaco-assets.test.ts` と `tests/unit/app/source-viewer.test.ts` に追加する
- [ ] T084 [P] [US2] localized sensitive-content notice と、purge 後の各 source または comparison open 前に必要な session-only acknowledgement（masking/reveal の主張や control は持たない）に関する FR-027 の失敗テストを `tests/unit/app/sensitive-content-notice.test.ts` に追加する
- [ ] T085 [US2] 記述済み content から参照される process environment の read または substitution がゼロであることを含め、parsing、metadata extraction、relationship、detail loading 全体へ zero-activation test を `tests/integration/security/zero-activation.test.ts` で拡張する
- [ ] T086 [US2] sensitive-content acknowledgement、正確な literal credential と environment-reference text、完全な Codex source、metadata、diagnostics、masking/reveal control の不在、keyboard use、route cleanup、liveness purge、rescan cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-detail.spec.ts` に追加する

### 実装

- [ ] T087 [P] [US2] 正確な import/frontmatter span、ECMAScript UTF-16 range、順序付けられた duplicate、authored-literal round trip、内部 typed semantic、recognition-atomic failure を備えたinert Markdown/frontmatter extraction を `src/inspection/parsers/markdown.ts` に実装する
- [ ] T088 [P] [US2] alias と custom tag を無効にし、CST/token に裏付けられた正確な authored slice、ECMAScript UTF-16 range、順序付けられた duplicate、内部 typed semantic、recognition-atomic failure を備えたatomic YAML core-schema extraction を `src/inspection/parsers/yaml.ts` に実装する
- [ ] T089 [US2] Fixed package URLとenvironment-owned capacityのparser Worker poolを実装する。Worker crash、handler/message/decoder/parser throw/rejectionはpool/parser/scan domainでcatch、cause分類、retry、Diagnostic、recovered/partial result化せず変更なしに伝播させ、replacementはlater admitted attemptだけ、authority revocation/late discardを実装し、REST OperationErrorまたはstartup top-level処理はouter ownerに限定する。対象は`src/inspection/parsers/pool.ts`と`src/inspection/parsers/worker.ts`とする
- [ ] T090 [US2] ECMAScript UTF-16 code unitによる正確な`SourceTextRange` validation、authored literalとtyped semanticの分離、duplicate occurrenceの保持、overlap rule、およびinteger、float、date-time payloadをcanonical stringで表すJSON-safe typed semantic unionを、credential detectionやenvironment resolutionなしで`src/inspection/parsers/source-ranges.ts`に実装する
- [ ] T091 [US2] 閉じたcondition registry、evidence-linked `SourceConditionFact`/`ApplicabilityAssessment` record、決定論的なprecedence projectionを`src/inspection/applicability/conditions.ts`、`src/inspection/applicability/context.ts`、`src/inspection/applicability/precedence.ts`に実装する
- [ ] T092 [US2] 新しい strategy ID を追加せず、inventory が所有する Codex skill strategy を detail-time selection、same-name、runtime-chain、condition projection で拡張する処理を `shared/registries/runtime-composition.ts` に実装する
- [ ] T093 [US2] 参照される script、asset、任意 path を昇格させない relationship-only の skill-resource policy を `src/inspection/rules/codex.ts` に実装する
- [ ] T094 [US2] 閉じた field ID、zero-based source occurrence、正確な `authoredLiteral` 値、provenance-scoped な authored/default relationship、conditional applicability、environment reference の非解決、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T095 [US2] Verified-byte classificationとexactly-once UTF-8 replacement decodeを`src/inspection/scan.ts`へ統合する。NULはdiagnostic-only `binary`/contracted-partial、non-NULはreadable `utf-8 | utf-8-bom | utf-8-replaced`でBOM 1件をrecord/removeし、`U+FFFD`をcomplete sourceへ保持してparse/extract/display/compareを継続する。Alternate decode/sampling/truncationをせずraw byteをsnapshot後に破棄し、read/decoder/parser/Worker/extractor throw/rejectionをdomainでcatch/convertせず変更なしに伝播させる
- [ ] T096 [US2] generation-owned な完全な authored source と正確な literal metadata、operational logging/persistence ゼロ、request-token adoption 不変条件、file・generation・route・liveness purge・Source removal 時の cleanup を `src/session/session.ts` と `app/composables/liveness.ts` に実装する
- [ ] T097 [US2] Strict opaque ID、complete authored-source DTO、ordered literal metadata、production encoding、no-store、Diagnostic、stale responseを持つ`GET /api/v1/files/{fileId}`を実装する。Encoding/serialization throw/rejectionはREST outer boundaryだけでcatchしてgeneric null-ID HTTP 500 OperationErrorとし、job/retention/result/generation/success byte/raw causeを作らない。Post-commit delivery rejectionはcommit不変、success payload 0件、partial化なしとする処理を`src/host/api-router.ts`へ実装する
- [ ] T098 [US2] reveal、masking、redaction、environment-resolution route を不在のままにし、`POST /api/v1/files/{fileId}/reveals` と関連する unknown path が strict な `404` response を返すよう `src/host/api-router.ts` を維持する
- [ ] T099 [P] [US2] lazy same-origin Monaco、不透明な read-only model、正確な accessibility option、完全な editor/model/subscription disposal を `app/composables/monaco.ts` と `app/components/inspection/SourceViewer.vue` に実装する
- [ ] T100 [US2] source または comparison open 前の FR-027 localized sensitive-content notice と session-only acknowledgement gate（purge 時に reset し、masking/reveal control は持たない）を `app/components/inspection/SensitiveContentNotice.vue` と `app/app.vue` に実装する
- [ ] T101 [P] [US2] typed recognition、provenance、applicability、relationship、diagnostic の表示を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` に実装する
- [ ] T102 [US2] generation・epoch・request token を認識する file-detail route、完全な literal source presentation、focus handling、acknowledgement gate、cleanup を `app/pages/files/[id].vue` と `app/components/inspection/SensitiveContentNotice.vue` に実装する
- [ ] T103 [US2] 意味的に同等な英語・日本語の Codex detail、complete-content notice、literal display、parser、environment reference、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 6: Codex SKILL metadata 一覧

**目的**: sibling の `agents/openai.yaml` を、`skill metadata` kind を持つ別個の bounded-derived 物理 candidate として admission します。

**独立テスト**: present、absent、orphaned、linked、escaping、duplicated、misplaced な `agents/openai.yaml` sibling を持つ skill を scan し、独立して admission された各 `SKILL.md` seed が固定 sibling target を正確に一つ持つこと、derived seed が禁止されること、target が存在しない場合は candidate を作成しないこと、admission された各物理 candidate を一度だけ読み取ることを検証します。

**目に見えるチェックポイント**: 独立して識別された Codex skill-metadata file を、その seed `SKILL.md` file と混同せずに表示できます。

### fixture とテストを先行

- [ ] T104 [US1] 一つの固定 sibling target に対する positive、absent、orphan、linked、escaping、duplicate、hard-link、misplaced、derived-seed の Codex skill-metadata fixture を `tests/fixtures/repositories/build-fixtures.ts` に追加する
- [ ] T105 [US1] `codex.derived.skill-metadata` rule、provenance、evidence、`skill metadata` recognition row を `tests/fixtures/conformance/inspection-rules.json` と `tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T106 [P] [US1] 独立して admission された Codex `SKILL.md` からの単一 bounded-derived edge、literal sibling `agents/openai.yaml`、derived seed の禁止に関する registry の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T107 [US1] 独立して admission された seed ごとに固定 sibling `agents/openai.yaml` target が正確に一つであること、one-edge depth、target 不在時の no-candidate behavior、orphan と derived-seed の拒否、misplaced・escaping・linked candidate を読み取らないことに関する bounded-derivation の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T108 [P] [US1] 別々の物理 ID、`skill metadata` kind filtering、seed provenance、決定論的な順序、hard-link alias、一度だけ読み取って publication することに関する recognition と inventory の失敗テストを `tests/unit/inspection/recognizers.test.ts` と `tests/unit/app/inventory.test.ts` に追加する
- [ ] T109 [US1] Codex skill-metadata row、seed provenance、orphan の不在、diagnostics、変更されない SKILL row に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-list.spec.ts` に追加する

### 実装

- [ ] T110 [US1] bounded-derived の `codex.derived.skill-metadata` registry record と reciprocal evidence reference を `shared/registries/inspection-rules.ts` と `shared/registries/official-sources.ts` に追加する
- [ ] T111 [US1] `codex.derived.skill-metadata` を、独立して admission された seed ごとに固定 sibling target が正確に一つ、one-edge depth、不在時は candidate なし、containment check を行い、orphan・derived-seed・misplaced・escaping・linked-target を拒否するものとして `src/inspection/rules/codex.ts` に実装する
- [ ] T112 [US1] seed provenance を持ち、SKILL identity を継承しない path-derived Codex `skill metadata` recognition を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T113 [US1] 決定論的な one-edge admission、metadata file ごとの一度の verified read、alias aggregation、source-value-free diagnostics を `src/inspection/scan.ts` に統合する
- [ ] T114 [US1] Codex skill metadata の inventory kind filter、row、seed summary を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T115 [US1] 意味的に同等な英語・日本語の Codex skill-metadata inventory および derivation message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 7: Codex SKILL metadata 詳細

**目的**: admission された各 `agents/openai.yaml` candidate に、完全な literal source とclosedなallowlist済みtyped detail を追加します。

**独立テスト**: Valid、malformed、literal credential を含む、changing、throwing/rejecting な metadata candidate を開き、atomic YAML extraction、typed semantic と区別された正確な authored literal、seed provenance、stale handling、masking/reveal control または environment-reference resolution がないこと、activation ゼロ、file または generation removal 時の cleanup を検証します。

**目に見えるチェックポイント**: `agents/openai.yaml` を選択すると、所有元の SKILL detail とは別の完全で非活性な detail 画面が開きます。

### テスト先行

- [ ] T116 [P] [US2] Allowlist 対象 field ID、順序付けられた duplicate occurrence、正確な YAML source slice/UTF-16 range、typed-semantic separation、seed provenance、unknown field、malformed/overlap range、deterministic な entry-local non-capacity parser failure の分離、parser、extraction、metadata、recognition、derived、item、scan-result record/response、contracted-partial outputを一切返さず、coordinator-wideなattempt abortへ変更なしのthrow/rejectionを伝播し、以前のcommit済みsnapshotだけを維持するdomain layerでcatch/classify/retryしないthrow/rejection、environment reference の非解決、正確な evidence に関する Codex skill-metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T117 [P] [US2] Skill-metadata literal、stale ID、client retention 0件、removed-reveal routeのfailing file-detail contractを追加する。Pre-commit encoding/serialization throw/rejectionはREST outer boundaryだけがgeneric null-ID HTTP 500 OperationErrorとして扱い、job/result/generation/success bytes 0件、raw causeなしとする。Post-commit delivery rejectionはcommit不変、success payload 0件、partial化なしを`tests/contract/http-api-files.test.ts`で証明する
- [ ] T118 [P] [US2] metadata の command、asset、resource、script、URI、任意 path に対する zero-activation と relationship を追跡しないことの失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T119 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal skill-metadata detail、seed provenance、diagnostics、detail-state cleanup、keyboard use、rescan cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-detail.spec.ts` に追加する

### 実装

- [ ] T120 [US2] allowlist 対象 `agents/openai.yaml` field、正確な authored-literal extraction、seed applicability、relationship、diagnostics、evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T121 [US2] skill metadata に対する atomic YAML extraction、正確な source-occurrence range、relationship-only target、snapshot 構築後の raw-byte disposal、generation-owned detail cleanup を `src/inspection/scan.ts` と `src/session/session.ts` に統合する
- [ ] T122 [US2] skill-metadata field と seed provenance に対する typed detail presentation を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T123 [US2] 意味的に同等な英語・日本語の skill-metadata detail、正確な authored-literal preservation、relationship、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 8: Claude SKILL 一覧

**目的**: 完了済みの Codex 一覧と詳細を回帰させず、Claude skills を追加します。

**独立テスト**: `.claude/skills/*/SKILL.md`、near miss、link、duplicate name、Codex skills を含む fixture を起動し、期待される Claude row、変更されない Codex behavior、linked candidate に対する正確な `shared.excluded.symlink-target` 処理を検証します。

**目に見えるチェックポイント**: Claude と Codex の SKILL 一覧が同じ inventory に共存します。

### fixture とテストを先行

- [ ] T124 [US1] root/nested Claude skill、near miss、duplicate name、Codex-preservation case、正確な `shared.excluded.symlink-target` outcome になる linked candidate で Repository fixture を `tests/fixtures/repositories/build-fixtures.ts` において拡張する
- [ ] T125 [US1] 後続の skills-directory fact は追加せず、base `claude.behavior.repo.skills`、その rule・strategy・evidence、および単一の正確な `shared.excluded.symlink-target` row を、affected-behavior reference が `codex.behavior.repo.skills` と `claude.behavior.repo.skills` だけになるよう `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T126 [P] [US1] `claude.repo.skill`、一つの direct skill-name child、descendant inventory、ancestor/lazy uncertainty、`shared.excluded.symlink-target` を介した linked-candidate rejection、`codex.behavior.repo.skills` と `claude.behavior.repo.skills` だけへの正確な affected-behavior reference に関する失敗契約と matcher test を `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T127 [P] [US1] tool、kind、path provenance、rule 外で filename-only recognition を行わないことに関する Claude recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T128 [P] [US1] 既存の Codex result を変更せず、safe-filesystem boundary も弱めずに Claude skill が追加されることを証明する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T129 [US1] Codex と Claude の SKILL 一覧を含む incremental session のブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-list.spec.ts` に追加する
- [ ] T130 [US1] reciprocal behavior、rule、evidence、affected-contract reference に関する Claude skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T131 [US1] 読み取り権限を付与しない `claude.behavior.repo.skills`/`claude.behavior.user.skills` statement を完全な base lookup strategy とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T132 [US1] 読み取りを認可する `claude.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T133 [US1] 単一の読み取りを行わない `shared.excluded.symlink-target` rule を、affected-behavior reference が `codex.behavior.repo.skills` と `claude.behavior.repo.skills` だけになるよう `shared/registries/inspection-rules.ts` に追加する
- [ ] T134 [US1] Claude skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T135 [US1] `claude.repo.skill` matching を `src/inspection/rules/claude.ts` に実装する
- [ ] T136 [US1] path-derived Claude skill recognition を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T137 [US1] 決定論的な Codex result を維持しながら Claude skill classification を `src/inspection/scan.ts` に統合する
- [ ] T138 [US1] Claude に対する filter、badge、意味的に同等な英語・日本語の一覧 message を `app/composables/filters.ts`、`app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 9: Claude SKILL 詳細

**目的**: generic detail foundation を使用し、完全で非活性な Claude skill detail を追加します。

**独立テスト**: metadata、contained declaration、reference、vendor が対応する symlink、malformed frontmatter、secret を持つ Claude skill を開き、完全な literal detail、exact-launch の skills-directory-plugin applicability fact、明示的な `shared.excluded.symlink-target` diagnostics、manifest read authority なし、target read なし、変更されない Codex detail を検証します。

**目に見えるチェックポイント**: Claude SKILL detail が完成し、Codex detail と一貫します。

### テスト先行

- [ ] T139 [US2] `claude.behavior.repo.skills-directory-plugin` を、exact-launch で読み取り権限を付与しない applicability/activation fact とし、その strategy および evidence conformance row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T140 [P] [US2] 正確な frontmatter occurrence/range、duplicate authored literal、ancestor/lazy discovery uncertainty、contained declaration、relationship、environment reference の非解決、正確な evidence、および manifest authority ではなく exact-launch applicability/activation fact としての `claude.behavior.repo.skills-directory-plugin` に関する Claude metadata の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T141 [P] [US2] `targetOrigin`、正確なauthored target slice/range reuse、null-authored documented default、internal semantic normalization、provenance-relative target、boundary status、originating recognitionからのdirectかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejection、target access前のnested/transitive projection拒否、relationship read authority 0に関するfailing testを`tests/unit/inspection/relationships.test.ts`に追加する
- [ ] T142 [P] [US2] vendor が対応する Claude skill symlink が、明示的な `shared.excluded.symlink-target` parity diagnostic を伴い Inspector policy では引き続き拒否されることを証明する回帰失敗テストを `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T143 [P] [US2] manifest loading や未知の runtime selection を主張せず、Claude skill selection、exact-launch の skills-directory-plugin applicability、workspace-trust condition、condition reason に関する runtime-composition の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T144 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude detail、uncertainty、relationship、diagnostics、detail-state cleanup、継続する Codex behavior に関するブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-detail.spec.ts` に追加する

### 実装

- [ ] T145 [US2] `claude.behavior.repo.skills-directory-plugin` を、accepted exact-launch SKILL candidate だけに付与される、読み取り権限を付与しない behavior fact として `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T146 [US2] strategy ID または manifest read authority を追加せず、inventory が所有する Claude skill strategy を detail-time selection/condition mapping、exact-launch skills-directory-plugin applicability、workspace-trust fact で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T147 [US2] 新しい source ID を作成せず、skills-directory behavior と strategy から既存の Claude official-source record への reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T148 [US2] manifest candidate を作成せず、exact metadata、conditional applicability、exact-launch の skills-directory-plugin fact、relationship、`shared.excluded.symlink-target` parity diagnostic、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T149 [US2] Atomic Claude extractionとdirect one-hop provenance-scoped Relationshipだけを`src/inspection/scan.ts`へ統合し、targetのrecurse/expand/readまたはauthority付与を禁止する。Successful deterministic relationshipはenvironment capacity下でcompleteに保持し、extraction/relationshipのthrow/rejectionはdomainでcatch、cause分類、retry、item/recognition/relationship/derived result/body/generation化せず変更なしにtrigger-owning outer boundaryへ伝播する
- [ ] T150 [US2] vendor-specific source rendering を行わず、Claude 固有 field の typed detail presentation を `app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T151 [US2] 意味的に同等な英語・日本語の Claude detail、uncertainty、relationship、parity message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 10: Copilot SKILL 一覧

**目的**: 対応するすべての Copilot Repository skill path を追加し、一度だけ読み取る multi-tool recognition を確立します。

**独立テスト**: 三つの正確な selector とその negative matrix のすべてについて root および nested context を実行し、`.github` は Copilot-only、`.agents` は Codex+Copilot-only、`.claude` は Claude+Copilot-only であり、admission された各物理 file が一つの item と一度の verified read になることを検証します。

**目に見えるチェックポイント**: Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。

### fixture とテストを先行

- [ ] T152 [US1] 三つの Copilot selector すべてについて、root/nested の positive/negative fixture、one-direct-child depth、configured-root exclusion、正確な Copilot-only/Codex+Copilot/Claude+Copilot combination を `tests/fixtures/repositories/build-fixtures.ts` に追加する
- [ ] T153 [US1] origin fileを持たない正確な `copilot.behavior.cloud.remote-skills` fact を含む Copilot VS Code/CLI/Cloud skill behavior と、Inspector rule、strategy、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T154 [P] [US1] 三つの正確な selector、direct-child depth、near miss、configured-root rejection、selector を拡大しないことに関する root/nested matcher の失敗テストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T155 [P] [US1] Copilot-only の `.github`、Codex+Copilot-only の `.agents`、Claude+Copilot-only の `.claude`、extra recognition ゼロに関する recognition-matrix の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T156 [P] [US1] matrix row ごとに一つの物理 item と一度の verified read、決定論的な provenance、root/nested parity、extra-depth rejection、configured-root rejection に関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T157 [US1] 正確な root/nested recognition matrix、物理 file ごとに一つの row、extra-depth/configured-root/extra-recognition row がないことに関するブラウザー受け入れテストを `tests/e2e/copilot-skills-list.spec.ts` に追加する
- [ ] T158 [US1] reciprocal behavior、rule、evidence、affected-contract reference、`copilot.behavior.cloud.remote-skills` の正確な読み取り権限を付与しない ownership に関する Copilot skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T159 [US1] surface-specific Copilot skill statement、読み取り権限を付与しない User/Cloud fact、参照されるすべての base lookup/selection/managed-remote strategy をともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T160 [US1] 三つの固定 directory に対して読み取りを認可する `copilot.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T161 [US1] `copilot.behavior.cloud.remote-skills` の existing-source backlink を含む、Copilot skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T162 [US1] direct-child depth と configured-root rejection を伴う、正確な `.github`、`.agents`、`.claude` skill selector の root/nested matching を `src/inspection/rules/copilot.ts` に実装する
- [ ] T163 [US1] extra recognition を作らず、正確な Copilot-only/Codex+Copilot/Claude+Copilot recognition matrix を `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T164 [US1] admission された各 matrix file を、一つの verified read と決定論的な multi-tool provenance を持つ一つの物理 item として `src/inspection/scan.ts` で組み立てる
- [ ] T165 [US1] Copilot に対する tool filtering と multi-recognition badge を `app/composables/filters.ts` と `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T166 [US1] アクセシブルな multi-recognition summary を `app/components/inventory/InventoryList.vue` に追加する
- [ ] T167 [US1] 意味的に同等な英語・日本語の Copilot 一覧および conditional-surface message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 11: Copilot SKILL 詳細

**目的**: 互換性のない surface fact を維持しながら、完全で非活性な Copilot skill detail を追加します。

**独立テスト**: 三つのすべての directory と共有物理 file から Copilot skill を開き、closed allowlist 内の metadata、分離された surface applicability、progressive-loading uncertainty、winner の主張なし、完全な literal source、変更されない Codex/Claude detail を検証します。

**目に見えるチェックポイント**: Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。

### テスト先行

- [ ] T168 [P] [US2] 正確な frontmatter occurrence/range、authored literal と typed semantic の分離、progressive loading、duplicate-name uncertainty、除外された custom directory、environment reference の非解決、正確な evidence に関する Copilot metadata の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T169 [P] [US2] 互換性のない behavior をまとめず、VS Code、CLI、Cloud の selection fact に関する composition の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T170 [P] [US2] surface-specific recognition と condition fact が分離されたままであることを証明する typed-detail の失敗テストを `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T171 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、Codex と Claude の behavior を維持した Copilot-only および shared-recognition detail に関するブラウザー受け入れ失敗テストを `tests/e2e/copilot-skills-detail.spec.ts` に追加する

### 実装

- [ ] T172 [US2] strategy ID を追加せず、inventory が所有する Copilot skill strategy を detail-time surface-qualified condition および selection projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T173 [US2] exact metadata、selection uncertainty、relationship、正確な evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T174 [US2] Copilot の surface difference と文書間の conflict を維持するよう applicability projection を `src/inspection/applicability/precedence.ts` において拡張する
- [ ] T175 [US2] atomic Copilot extraction と一度だけ読み取る shared-file detail assembly を `src/inspection/scan.ts` に統合する
- [ ] T176 [US2] 別々の Copilot surface に対する typed recognition presentation を `app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T177 [US2] 意味的に同等な英語・日本語の Copilot detail および surface-uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 12: 統合 SKILL inventory

**目的**: 三つの vendor demonstration を、一つの一貫した skill inventory にします。

**独立テスト**: unique skill、duplicate name、shared physical file、hard-link alias、item failure、secret、injected throw/rejectionを持つall-tool fixtureを使用し、決定論的なrow、multi-recognition、filter、決定的かつentry-localでcapacityに起因しないfailureだけのcontracted-partial continuity、throw/rejection時のattempt全体のabortとitem、recognition、derivation、scan-result record/response、generationが一切ないこと、および以前のcommit済みsnapshotだけが残ること、rescan replacement、応答性の高いinteraction performanceを検証する。

**目に見えるチェックポイント**: 完全な skill-first inventory を filter して理解できます。

### fixture とテストを先行

- [ ] T178 [US1] 対応するすべての selector、shared file、hard-link alias、duplicate name、near miss、failure、secret、注入した execution-environment throw/rejection を持つ all-tool SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T179 [P] [US1] すべての SKILL selector と multi-tool recognition combination に関する conformance の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T180 [P] [US1] 決定論的なphysical-file/recognition order、一度だけ読み取るmerge、alias aggregation、atomic continuity、progress、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけによるcontracted-partial publication、およびwhole attemptをfatalにしてextra readを行わずnew complete/contracted-partial generation、item、record、response、derived resultを公開せずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないthrow/rejectionに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T181 [P] [US1] 統合 SKILL row に対する source、tool、kind、path filter の client 失敗テストを追加し、detail acknowledgement より前の inventory state が source text、metadata literal、sensitive fixture value を一切含まないことを `tests/unit/app/inventory.test.ts` で証明する
- [ ] T182 [P] [US1] whole-generation replacement、stale detail/request-token/selection cleanup、通常 rescan をまたぐ acknowledgement retention、filter retention、profile/cache/repository persistence ゼロに関する rescan の失敗テストを `tests/unit/session/session.test.ts` と `tests/unit/app/session-shell.test.ts` に追加する
- [ ] T183 [P] [US1] 再利用可能なSC-002 harnessとversioned profile validatorを追加し、変更しない100,000-entry/500-file reference fixtureを構築する。Profileをversion付きcanonical entry/content-digest inventory `tests/performance/sc002-fixture-manifest.json`とそのSHA-256 `tests/performance/sc002-fixture-manifest.sha256`へbindし、smoke run前後にcanonical digestと参照content digestを再計算する。各fresh processで自動Repository scanがterminal stateへ到達するまでtiming外で待ち、明示Repository rescanを正確に1件dispatchして両timerをbrowser dispatch時に開始し、そのadmission `scanRequestId`をcaptureする。同じIDのvisible/assistive statusとそのrequestのcommit済みgeneration由来のcomplete inventoryだけをacceptし、generic/loading/unchanged/prior/automatic stateを拒否する。2つのstandardized interactionを計測し、profile/manifest version/digestとrequest ID/generationを記録してnon-gating smoke passを1回実行する。対象は`tests/performance/sc002-reference-profile.json`、`tests/performance/repository-scan.test.ts`、`tests/performance/inventory-interactions.test.ts`とし、exact 10-run 9/10 protocolはT918へ延期する
- [ ] T184 [US1] 統合 filter、multi-recognition、provenance、keyboard use、inventory からの source exposure なし、detail open 前の sensitive-content notice 提示に関するブラウザー回帰を `tests/e2e/skills-inventory.spec.ts` に追加する

### 実装

- [ ] T185 [US1] skill に対する決定論的な physical-file、alias、recognition、provenance aggregation を `src/inspection/scan.ts` で完成させる
- [ ] T186 [US1] generation-aware skill filtering、selection、rescan replacement、stale cleanup を `app/composables/filters.ts` と `app/composables/session.ts` で完成させる
- [ ] T187 [US1] アクセシブルな source/tool/kind/path filter を `app/components/inventory/InventoryFilters.vue` で完成させる
- [ ] T188 [US1] 統合 skill row、recognition badge、provenance summary、empty state、progress control を `app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue`、`app/pages/index.vue` で完成させる
- [ ] T189 [US1] Source-value-free diagnostics を維持し、inventory の loading、empty、retry、replacement state で source を露出せず、detail navigation 前に sensitive-content notice を利用可能に保つ処理を `app/components/diagnostics/DiagnosticList.vue` と `app/components/inspection/SensitiveContentNotice.vue` に実装する
- [ ] T190 [US1] 意味的に同等な英語・日本語の unified-inventory および multi-recognition message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 13: SKILL 比較

**目的**: 他の customization family より先に、skill を使用して generic な完全 literal comparison path を提供します。

**独立テスト**: current-generationで読み取り可能なdistinct physical skill file IDを正確に2つ選択し、sensitive-content noticeをacknowledgeして、literal credentialの差分を含む完全なauthored-source diff、正確なtyped-recognition row、environment referenceの解決0件、environment-determined rendering-failure fallback、stale/epoch cleanup、same-origin Worker使用、keyboard/screen-reader accessを検証します。

**目に見えるチェックポイント**: 読み取り可能な任意の2つのdistinct SKILL physical file IDを、activationやmutationを発生させずに比較できます。

### テスト先行

- [ ] T191 [P] [US3] exactly-two distinct physical file-ID selectionとsame-ID rejection、sensitive-content acknowledgement、既存の二つの FileDetail load、readable/current-generation/client-epoch/request-token guard、stale rejection、replacement または removal 後の cleanup に関する失敗テストを `tests/unit/app/comparison.test.ts` に追加する
- [ ] T192 [P] [US3] ranking や winner の主張を行わず、authored literal を伴う正確な `(tool, kind, fieldId, occurrence)` metadata matching、provenance、applicability、relationship、order comparison に関する失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T193 [P] [US3] 二つの完全な literal model、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`、same-origin Worker 使用、environment-determined rendering-failure fallback、disposal に関する direct-comparison-route の失敗テストを `tests/unit/app/source-diff.test.ts` と `tests/package/monaco-assets.test.ts` に追加する
- [ ] T194 [US3] 完全な authored skill diff、正確な literal credential difference、変更されない environment-reference text、typed recognition difference、responsive layout、keyboard access、fallback diagnostics、cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/skills-comparison.spec.ts` に追加する

### 実装

- [ ] T195 [US3] exactly-two distinct physical file-ID generation-scoped selectionとsame-ID rejection、acknowledgement および epoch/token guard、compare API を使わない二つの既存 detail load、replacement・purge・removal 後の teardown を `app/composables/comparison.ts` に実装する
- [ ] T196 [US3] 二つの完全な literal Monaco model、不透明 URI、same-origin Worker、subscription の決定論的な作成と disposal を `app/composables/monaco.ts` に実装する
- [ ] T197 [US3] 正確に label 付けされた read-only/no-link/no-revert diff option、verbose accessibility、完全な side-by-side fallback を `app/components/comparison/SourceDiff.vue` に実装する
- [ ] T198 [US3] inferred winner を作らず、正確な `(tool, kind, fieldId, occurrence)` authored-literal recognition row と provenance、applicability、relationship、order difference を `app/components/comparison/RecognitionComparison.vue` に実装する
- [ ] T199 [US3] edit、merge、lint、validation、fix action を含まない、アクセシブルな generation-scoped comparison-selection control を `app/components/inventory/InventoryItem.vue` に追加する
- [ ] T200 [US3] direct-route loading、stale recovery、responsive layout、accessible navigation、意味的に同等な英語・日本語 message を `app/pages/compare.vue`、`app/locales/en.ts`、`app/locales/ja.ts` に実装する

---

## フェーズ 14: SKILL metadata 比較

**目的**: generic な完全 literal comparison path を、別個の Codex `skill metadata` kind へ拡張します。

**独立テスト**: current-generation で読み取り可能な `agents/openai.yaml` file を正確に二つ比較し、完全な authored source、occurrence を正確に整列した metadata literal、seed provenance、relationship、fallback behavior、stale/epoch invalidation、完全な model/subscription cleanup を検証します。

**目に見えるチェックポイント**: environment reference を解決せず、seed skill と混同することなく、記述された sensitive value を含む二つの Codex skill-metadata file を比較できます。

### テスト先行

- [ ] T201 [P] [US3] skill-metadata field、seed provenance、applicability、relationship、missing value に関する typed-comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T202 [US3] 完全な literal skill-metadata diff、occurrence を正確に整列した authored value、typed provenance difference、変更されない environment-reference text、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/skill-metadata-comparison.spec.ts` に追加する

### 実装

- [ ] T203 [US3] preferred seed や value を推論せず、`skill metadata` kind に対する field-identity-aware comparison row を `app/components/comparison/RecognitionComparison.vue` において拡張する
- [ ] T204 [US3] 意味的に同等な英語・日本語の skill-metadata comparison message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 15: Codex Instructions inventory

**目的**: まず静的な Codex instruction file を追加し、MCP wave より前には有界導出ルールの登録、config seed の受け入れ、project configuration の読み取りを行わず、純粋な configured-fallback 宣言/導出インターフェースを定義します。

**独立テスト**: `AGENTS.override.md` と `AGENTS.md` をインベントリ化し、メモリ内の受け入れ済み carrier fixture に対して `codex.derived.fallback-basename` を実行します。vendor/runtime と execution environment の capacity だけに従う全 configured declaration の complete retention、祖先関係を比較できること、orphan/configured-target escape がないこと、決定論的な provenance、およびフェーズ 23 で carrier が受け入れられるまでは `.codex/config.toml` の読み取りも configured fallback row もゼロであることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。

### fixture とテストを先行

- [ ] T205 [US1] override、regular file、configured fallback、empty file、多数の fallback name と注入した execution-environment throw/rejection、ancestry-comparable/incomparable path、import、secret、malformed content、near miss に対する Codex instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T206 [US1] Codex instruction behavior、読み取り権限を付与しない `codex.behavior.repo.config` と `codex.behavior.user.config` carrier fact、静的 matcher、純粋な fallback 宣言/導出 fixture contract、composition、relationship、path-negative boundary、reciprocal evidence row を、`codex.derived.fallback-basename` の registry row を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T207 [P] [US1] `codex.repo.instructions`、override/regular selector、empty-file behavior、path-negative higher scope、決定論的な provenance、およびフェーズ 23 より前には config candidate と `codex.derived.fallback-basename` registry record の両方が存在しないことに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T208 [US1] Static Codex instruction scanとverified in-memory fallback declaration pure functionのfailing testを追加する。Success時はnumeric declaration capなしで全configured declarationをcompleteに保持し、derivationのthrow/rejectionはdomainでcatch/cause分類/retry/partial declaration-plan-candidate化せず変更なしにouter boundaryへ伝播してattempt result/generationを作らずprior commitを維持する。Ancestry、orphan/config escape、registry前target access 0件を`tests/integration/repository-scan.test.ts`で証明する
- [ ] T209 [US1] 静的な Codex instruction row、filter、diagnostics、order、exclusion、および config row がゼロの明示的な configured-fallback-pending 状態に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T210 [US1] Codex の Repository/User instruction と config-carrier statement を、完全な base instruction-layering および dormant fallback-interface strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、config read を認可せず production registry を閉じたままにする
- [ ] T211 [US1] Codex の静的 instruction record だけを追加し、`codex.repo.config` と `codex.derived.fallback-basename` はフェーズ 23 でアトミックに受け入れるまで未登録のままにし、adjacent exclusion ID を `shared/registries/inspection-rules.ts` に追加しない
- [ ] T212 [US1] Codex instruction evidence に加え、このフェーズで所有する読み取り権限を付与しない Repository/User config carrier fact の reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T213 [US1] フェーズ 23 が seed と derived rule の両方を登録するまでは scan candidate を生成できない、静的な Codex instruction matching、純粋な fallback 宣言 validator、one-edge derivation helper を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T214 [US1] Codex instruction、activation 後の fallback provenance、pre-carrier pending 状態に対する inventory filter と row を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T215 [US1] 意味的に同等な英語・日本語の Codex instruction inventory、fallback、exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 16: Codex Instructions 詳細

**目的**: 完全な literal Codex instruction source と typed layering を追加し、configured-fallback の投影はフェーズ 23 で導入する最小 config carrier の存在を条件とします。

**独立テスト**: 静的な Codex instruction fixture を開き、override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、Inspector cap を設けない vendor/runtime-reported instruction-capacity fact、relationship-only の import、stale-ID behavior、diagnostics、detail-state cleanup を検証します。別途、config path を読み取らず、メモリ内 carrier から fallback detail を投影できることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction を選択すると、明示的な order、vendor/runtime-reported instruction-capacity fact、condition、および carrier 受け入れ前であることを正直に示す fallback 状態を備えた完全で非活性な detail が開きます。

### テスト先行

- [ ] T216 [P] [US2] Override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、Inspector 固有の cap を設けない vendor/runtime-reported instruction-capacity fact、設定済みの全 fallback basename に関する Codex の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T217 [P] [US2] 正確なauthored target slice、`targetOrigin`、null-authored documented default、internal semantic normalization、lexical status、cycle、boundary status、directかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、target access前のnested/transitive projection拒否、environment reference非解決、target read authority 0、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するimport/referenceのfailing testを`tests/unit/inspection/relationships.test.ts`と`tests/integration/inspection-safety.test.ts`に追加する
- [ ] T218 [P] [US2] 完全な Codex instruction source、閉じた metadata field ID、正確に順序付けられた authored literal、typed semantic の非 serialize、condition、fallback、relationship、diagnostics、environment reference の非解決、stale ID に関する detail/API の失敗テストを `tests/contract/http-api-files.test.ts` と `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T219 [US2] reciprocal contract reference を持つ Codex instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T220 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal static Codex instruction detail、byte budget、condition、pre-carrier fallback 状態、relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T221 [US2] strategy ID を追加せず、inventory が所有する Codex instruction/config strategy を detail-time fallback、byte-budget、applicability、relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T222 [US2] Codex instruction composition、fallback projection、byte-budget fact、direct one-hopかつnon-recursiveなprovenance-relative relationship extractionを`src/inspection/applicability/precedence.ts`と`src/inspection/parsers/markdown.ts`に実装する。Targetはread authorityを与えず、nested/transitive projectionはaccess前に省略する
- [ ] T223 [US2] Codex instructionのexact authored literal、atomic parsing、complete deterministic direct relationship-only reference、scratch disposal、fallback provenanceを`src/inspection/scan.ts`へ統合する。Parser/relationshipのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived body/generation化せず変更なしにouter boundaryへ伝播し、targetをrecurse/expand/readしない
- [ ] T224 [US2] Codex instruction scope、order、fallback、byte budget、condition、inert relationship に対する typed detail presentation を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T225 [US2] 意味的に同等な英語・日本語の Codex instruction detail、fallback、byte-budget、relationship、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 17: Claude Instructions inventory

**目的**: `AGENTS.md` を filename だけで recognition せず、Claude の launch、ancestor、conditional descendant instruction file を追加します。

**独立テスト**: 対応する `CLAUDE.md`、`CLAUDE.local.md`、すべての nested `.claude/CLAUDE.md` を inventory 化し、それらが `claude.repo.instructions` に一致することを確認します。正確な launch-`cwd` の `.claude/CLAUDE.md` だけが definite launch applicability を持ち、他の nested candidate は conditional/unknown のままであること、決定論的な provenance、変更されない Codex instruction を検証します。

**目に見えるチェックポイント**: 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction file を filter できます。

### fixture とテストを先行

- [ ] T226 [US1] launch、ancestor、descendant、local ordering、exact launch と他の nested `.claude/CLAUDE.md` candidate、filename-only `AGENTS.md`、import、secret、malformed content、near miss に対する Claude instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T227 [US1] exclusion ID を定義せず、Claude instruction behavior、candidate matcher、composition、path-negative case、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T228 [P] [US1] nested `.claude/CLAUDE.md` file が `claude.repo.instructions` candidate であること、正確な launch-`cwd` form だけが definitely applicable であること、他の nested form は conditional/unknown のままであること、filename-only `AGENTS.md` は Claude-recognized されないこと、provenance が決定論的であることを証明する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T229 [US1] Claude instruction discovery、一度の verified read、決定論的な order、isolated failure、import-target read ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T230 [US1] Claude instruction row、layer provenance、filter、exclusion、diagnostics、維持される Codex instruction に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T231 [US1] Claude の Repository/User instruction statement を、完全な base layering/import strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T232 [US1] Claude instruction candidate record だけを追加し、exclusion ID を定義せずに未対応 location を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T233 [US1] Claude instruction evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T234 [US1] 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction matching と recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T235 [US1] import を読み取らず、Codex result も変更せずに Claude instruction classification を `src/inspection/scan.ts` に統合する
- [ ] T236 [US1] Claude instruction の inventory row と、意味的に同等な英語・日本語の instruction、layer、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 18: Claude Instructions 詳細

**目的**: 正確な layer ordering と inert import relationship を持つ、完全な literal Claude instruction detail を追加します。

**独立テスト**: hostile および malformed な Claude instruction を開き、launch/ancestor/descendant distinction、regular-before-local order、conditional descendant loading、正確な authored-literal preservation、one-level relationship としての import、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude instruction を選択すると、参照 file を import せず、完全で非活性な layered detail が表示されます。

### テスト先行

- [ ] T237 [P] [US2] launch/ancestor/descendant distinction、regular-before-local order、exact-launch と conditional/unknown な nested `.claude/CLAUDE.md` applicability、conditional descendant loading に関する Claude の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T238 [P] [US2] 正確なauthored target slice/range、internal semantic normalization、cycle、boundary status、directかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete deterministic relationship retention、target access前のnested/transitive projection拒否、environment reference非解決、target read authority 0、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するClaude importのfailing testを`tests/unit/inspection/relationships.test.ts`に追加する
- [ ] T239 [US2] reciprocal contract reference を持つ Claude instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T240 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude instruction detail、layer order、condition、import、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T241 [US2] strategy ID を追加せず、inventory が所有する Claude instruction strategy を detail-time local-order、applicability、authored import-relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T242 [US2] Exact metadata、layer condition、complete direct one-hop かつ non-recursive な relationship、source-value-free environment-failure Diagnostic、evidence で Claude instruction recognition を `src/inspection/recognizers/claude.ts` において拡張する。Relationship target は read authority を与えず、nested/transitive projection を access 前に省略する
- [ ] T243 [US2] Claude instruction parsing、exact authored-literal extraction、complete deterministic direct relationship-only import、scratch disposalを`src/inspection/scan.ts`へ統合する。Parser/relationshipのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived body/generation化せず変更なしにouter boundaryへ伝播し、targetをrecurse/expand/readしない
- [ ] T244 [US2] typed detail と、意味的に同等な英語・日本語の Claude instruction order、relationship、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 19: Copilot Instructions inventory

**目的**: 正確な七つの Copilot instruction candidate、`copilot.repo.instructions.repository`、`copilot.repo.instructions.repository-cli-context`、`copilot.repo.instructions.path`、`copilot.repo.instructions.path-cli-context`、`copilot.repo.instructions.agents`、`copilot.repo.instructions.claude-root`、`copilot.repo.instructions.gemini-root` を追加します。

**独立テスト**: distinct な root/CLI および surface provenance を持つ正確な七つの ID をすべて inventory 化し、root/CLI repository form、root/CLI path form、`AGENTS.md`、root `CLAUDE.md`、root `GEMINI.md` を検証します。また、正確な `copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` が、hosted input や near miss を admission せずに、追加の標準 location と configured root を拒否することを検証します。

**目に見えるチェックポイント**: surface-qualified provenance と明示的な exclusion を持つ Copilot instruction candidate を filter できます。

### fixture とテストを先行

- [ ] T245 [US1] 正確な七つの candidate ID、root/CLI repository/path form、`applyTo`、`AGENTS.md`、root `CLAUDE.md`/`GEMINI.md`、shared file、additional-standard location、extra directory、hosted input、secret、malformed content、near miss に対する Copilot instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T246 [US1] 正確な七つの Copilot instruction candidate row、origin fileを持たない正確な `copilot.behavior.cloud.organization-instructions` fact、`copilot.excluded.additional-standard-locations` とその affected behavior である `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.instructions.claude`・`copilot.behavior.cli.instructions.claude`・`copilot.behavior.cli.instructions.gemini` だけ、`copilot.excluded.extra-directories` とその affected behavior である `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.skills`・`copilot.behavior.cli.instructions.path`・`copilot.behavior.cli.skills` だけを、その composition、relationship、evidence row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T247 [P] [US1] 正確な七つの candidate ID、root-versus-CLI provenance、root alternative、正確な additional-standard-location/extra-directory exclusion、hosted candidate なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T248 [US1] 決定論的な Copilot instruction candidate、一度の verified read、isolated failure、rejected-target access ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T249 [US1] Copilot instruction row、surface badge、filter、exclusion、diagnostics、維持される Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T250 [US1] surface-qualified な Copilot instruction/User/Cloud statement を、参照されるすべての base local/Cloud layering および managed-remote strategy とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、settings-file authority を与えず production registry を閉じたままにする
- [ ] T251 [US1] 正確な七つの Copilot instruction candidate record を追加し、`copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` だけを own する処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T252 [US1] `copilot.behavior.cloud.organization-instructions` の existing-source backlink を含む、Copilot instruction evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T253 [US1] `copilot.repo.instructions.repository` と `copilot.repo.instructions.repository-cli-context` matching を `src/inspection/rules/copilot.ts` に実装する
- [ ] T254 [US1] `copilot.repo.instructions.path` と `copilot.repo.instructions.path-cli-context` matching を `src/inspection/rules/copilot.ts` に実装する
- [ ] T255 [US1] `copilot.repo.instructions.agents` matching と、正確な additional-standard-location/extra-directory rejection を `src/inspection/rules/copilot.ts` に実装する
- [ ] T256 [US1] `copilot.repo.instructions.claude-root` と `copilot.repo.instructions.gemini-root` matching を `src/inspection/rules/copilot.ts` に実装する
- [ ] T257 [US1] hosted location または excluded location を昇格させず、正確な七つの Copilot instruction ID すべてに surface-qualified recognition を `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T258 [US1] configured-root または hosted I/O を行わず、Copilot instruction classification を `src/inspection/scan.ts` に統合する
- [ ] T259 [US1] Copilot instruction の inventory row と、意味的に同等な英語・日本語の instruction、surface、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 20: Copilot Instructions 詳細

**目的**: 互換性のない VS Code、CLI、Cloud composition fact を維持しながら完全な literal Copilot instruction detail を追加し、settings-dependent enablement は後続の Settings wave まで明示的に未知のままとします。

**独立テスト**: 対応する Copilot instruction を開き、`applyTo`、settings-file I/O がゼロの明示的な pending/unknown settings-dependent enablement 状態、parent discovery、Cloud exclusion、発明された general winner なし、正確な authored literal、relationship、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot instruction を選択すると、別々の surface interpretation と uncertainty が表示されます。

### テスト先行

- [ ] T260 [P] [US2] VS Code/CLI/Cloud fact、`applyTo`、settings owner がない状態での pending/unknown settings-dependent enablement、parent discovery、発明された general winner なしに関する Copilot の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T261 [P] [US2] 閉じた Copilot field ID、順序付けられた正確な authored literal、`applyTo` と reference の source range、内部 typed semantic、instruction scope、disablement、alternative、hosted/organization fact、environment reference の非解決、target read ゼロに関する metadata と relationship の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T262 [US2] reciprocal contract reference を持つ Copilot instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T263 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot instruction detail、surface condition、applicability、relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T264 [US2] strategy ID や settings behavior reference を追加せず、inventory が所有する Copilot instruction strategy を detail-time VS Code/CLI/Cloud applicability、authored relationship、closed unavailable-settings condition で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T265 [US2] closedなallowlist済みinstruction metadata、surface condition、pending settings applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T266 [US2] Copilot instruction parsing、正確な authored-literal extraction、inert relationship、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal、settings-file I/O ゼロを `src/inspection/scan.ts` に統合する
- [ ] T267 [US2] typed detail と、意味的に同等な英語・日本語の Copilot instruction surface、pending settings applicability、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 21: 統合 Instructions inventory

**目的**: 明示的な pre-carrier shared-file matrix とともに、priority wave の instruction baseline を統合します。`AGENTS.md` は Codex+Copilot、root `CLAUDE.md` は Claude+Copilot、nested `CLAUDE.md` はフェーズ 23 で独立して受け入れられた config carrier が正確な fallback match を有効化するまで Claude-only、`CLAUDE.local.md` は Claude-only です。

**独立テスト**: all-vendor instruction fixtureを使用し、正確なpre-carrier shared-file matrix、受け入れ済みfileごとの一つの物理item/read、別々のrecognition/provenance、nested `CLAUDE.md`のfilename-based Codex promotionなし、明示的なdormant fallback状態、決定論的なorder、filter、決定的かつentry-localでcapacityに起因しないfailureのcontracted-partial continuity、rescan cleanupを検証する。

**目に見えるチェックポイント**: 完全な静的 instruction inventory、すべての shared-file interpretation、および MCP が最小 carrier を受け入れたときに有効になる一つのconfigured fallback integration を理解できます。

### テスト先行

- [ ] T268 [US1] `AGENTS.md` Codex+Copilot、root `CLAUDE.md` Claude+Copilot、nested `CLAUDE.md` Claude-only と dormant configured-fallback variant、Claude-only `CLAUDE.local.md`、その他すべての selector、failure、secret、exclusion、alias、注入した execution-environment throw/rejection を持つ pre-carrier all-vendor instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T269 [P] [US1] 登録済みのすべての静的 instruction selector と exclusion、registry entry を持たない純粋 fallback interface、正確な `AGENTS.md`/root `CLAUDE.md`/nested `CLAUDE.md`/`CLAUDE.local.md` recognition matrix に関する完全な pre-carrier conformance test を `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T270 [P] [US1] 一度だけ読み取るshared-file assembly、正確なpre-carrier recognition matrix、dormant nested fallbackに対するCodex recognitionゼロ、決定論的なprovenance order、alias aggregation、atomic continuity、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけによるcontracted-partial publication、whole attemptをfatalにしてnew generation、item、record、response、derived resultを作らずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないthrow/rejection、およびconfig/rejected-target accessゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T271 [P] [US1] source/tool/kind/path filter、shared recognition badge、dormant fallback 状態、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T272 [US1] pre-carrier unified instruction inventory、filter、shared recognition、dormant fallback 状態、order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T273 [US1] filename inference を行わず、正確な pre-carrier shared-file matrix に対する決定論的な physical-file assembly を完成させ、フェーズ 23 が検証済みの導出を供給した後に限って独立した configured-fallback Codex provenance を受け入れる処理を `src/inspection/scan.ts` に実装する
- [ ] T274 [US1] instruction kind、shared recognition、dormant fallback 状態、後で有効になる fallback provenance に対する inventory filter と row を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で完成させる
- [ ] T275 [US1] 意味的に同等な英語・日本語の unified instruction inventory、shared-recognition、fallback、exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 22: Instructions 比較

**目的**: generic comparison view を、literal および typed な instruction difference へ拡張します。

**独立テスト**: Readableなcurrent-generation instruction fileを正確に2つ比較し、correctness claimやenvironment-reference resolutionを行わず、完全なauthored sourceとoccurrenceを正確に整列したmetadata literal、layering、fallback、applicability、relationship、provenance differenceを検証する。

**目に見えるチェックポイント**: 二つの instruction file を比較し、構造上の difference を理解できます。

### テスト先行

- [ ] T276 [US3] semantic correctness claim を行わず、正確に二つの FileDetail input、`(tool, kind, fieldId, occurrence)` authored literal、layering、fallback、applicability、relationship、provenance difference に関する instruction comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T277 [US3] sensitive-content acknowledgement、credential/environment-reference difference を含む完全な literal instruction diff、正確な metadata row、masking/reveal または environment substitution なし、typed layering/fallback difference に関するブラウザー受け入れテストを `tests/e2e/instructions-comparison.spec.ts` に追加する

### 実装

- [ ] T278 [US3] instruction comparison row が `(tool, kind, fieldId, occurrence)` で match して `authoredLiteral` を render し、typed layering/fallback state を分離したままにするよう `app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T279 [US3] 意味的に同等な英語・日本語の instruction comparison message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 23: Codex MCP carrier と内包宣言

**目的**: Codex MCP に必要な最小物理 carrier として `.codex/config.toml` をアトミックに受け入れ、その静的 seed とともに `codex.derived.fallback-basename` を登録し、実装済みの instruction fallback interface を有効化します。まだ別個の `settings/config` recognition は公開せず、MCP recognition を関連付けます。

**独立テスト**: 検証済み fallback basename、名前付きサーバー、重複、フィールド欠落、不正なテーブル、敵対的なコマンド、シークレット、独立 MCP のニアミスを含む config layer を検査し、seed/derived-rule のアトミックな受け入れ、environment-owned capacity に従う全 configured fallback row、owner-file identity、合成 MCP file がないこと、独立 MCP candidate がないこと、config-detail badge がないこと、一度だけの検証済み読み取り、接続ゼロを検証します。

**目に見えるチェックポイント**: 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングでき、フェーズ 15 の configured instruction fallback が表示されます。完全な configuration inventory/detail はフェーズ 57～58 まで延期します。

### フィクスチャとテストを先に

- [ ] T280 [US1] project layer、fallback name、名前付き MCP server、重複、不正な table、敵対的な command、secret、agent inheritance reference、standalone near miss、plugin relationship、User/managed path negative を対象とする最小 Codex config-carrier fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T281 [US1] `codex.repo.config`、`codex.derived.fallback-basename`、`codex.behavior.repo.mcp`、読み取り権限を付与しない `codex.behavior.repo.hooks` carrier fact、contained recognition、selection、relationship、reciprocal evidence row、path-negative な standalone/plugin/User/managed case を、`codex.excluded.plugin-files` または MCP exclusion ID を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T282 [P] [US1] `codex.repo.config`と`codex.derived.fallback-basename`のatomicな登録、正確なconfig-carrier admission、およびInspector-defined numeric declaration capを持たないenvironment-owned capacityに従う成功時のcomplete configured derived instructionに関するfailing matcher testを追加する。Capacity failureがpartial registry、plan、candidate、instruction、その他のderived resultを返さず変更なしのthrow/rejectionを伝播すること、standalone Codex MCP candidateがないこと、plugin、agent-reference、User、managed、任意のconfig pathを昇格しないことも`tests/unit/inspection/rules.test.ts`で証明する
- [ ] T283 [P] [US1] Codex MCP が新たに受け入れられた config carrier に関連付けられ、configured instruction fallback が独立した provenance で有効になり、まだ `settings/config` recognition も synthetic file も現れず、欠落または不正な宣言をアトミックに省略することを証明する失敗する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T284 [US1] Codex contained MCP row、owner-carrier への移動、新たに有効になった configured instruction fallback、config kind/detail badge がないこと、filter、path-negative な standalone/plugin case、diagnostics、connection control がないことを対象とするブラウザー受け入れテストを `tests/e2e/codex-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T285 [US1] フェーズ 15 の carrier behavior を再利用し、Hook candidate・standalone MCP・connection authority を与えず、Codex MCP/config-contained Hook behavior statement を完全な base MCP lookup/owner strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加する
- [ ] T286 [US1] `codex.repo.config` と、その one-edge `codex.derived.fallback-basename` rule をアトミックに追加し、Codex MCP candidate は作成せず、`codex.excluded.plugin-files` を早期所有せずに standalone/plugin/User/managed path を negative のまま保ち、contained declaration には relationship record だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T287 [US1] Codex config-carrier、derived-fallback、MCP、および読み取り権限を付与しない contained-Hook fact の evidence と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T288 [US1] config-carrier matching、既存の configured fallback helper のアトミックな activation、standalone MCP rejection、contained-declaration classification を `src/inspection/rules/codex.ts` に実装する
- [ ] T289 [US1] fallback basename と `[mcp_servers.*]` に対して lexical span と内部 semantic normalization を備えた最小限のinert TOML carrier extraction を実装し、一つの検証済み config file に決定論的な provenance で MCP recognition と derived instruction を関連付け、`settings/config` recognition を省略し、synthetic candidate を作成しない処理を `src/inspection/parsers/toml.ts`、`src/inspection/recognizers/codex.ts`、`src/inspection/scan.ts` に実装する
- [ ] T290 [US1] MCP インベントリのフィルターと内包所有者の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T291 [US1] 意味的に同等な英語/日本語の Codex 内包 MCP、所有者、スキーマ、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 24: Codex MCP の詳細

**目的**: 一般 configuration の表示はフェーズ 58 まで保留しつつ、最小 Codex carrier を完全な literal MCP detail、active-config precedence、trust、inheritance、duplicate、zero-connection behavior で拡張します。

**独立テスト**: 内包されたCodex declarationを開き、active project-config precedence、trust condition、duplicate server name、parent/agent inheritance fact、exact authored-literal preservation、diagnostic、禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/auth/probing request 0件、command/expansion/referenced read 0件を検証し、exactな2つのFR-022 authorized internal loopback HTTP classを別に分類する。

**目に見えるチェックポイント**: Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。

### テストを先に

- [ ] T292 [P] [US2] named、inline、ancestor、plugin、runtime-only の reference に加え、フェーズ 50 より前には unresolved behavior backlink、connection、target promotion を持たない純粋な dormant agent-inheritance adapter に関する失敗する MCP schema test を `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T293 [P] [US2] active project-config precedence、trust condition、duplicate name、有効になった fallback provenance、一般 config presentation がないことに関する失敗する Codex carrier/MCP test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T294 [P] [US2] Exactな2つのFR-022 authorized internal loopback HTTP classを別に分類し、Codex MCP inspectionが禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/authentication/probing request、command execution、expansion、plugin load、referenced-file readを発生させないことを証明するzero-connection testを`tests/integration/security/zero-activation.test.ts`へ追加する
- [ ] T295 [P] [US2] 完全な authored source、occurrence 順に正確な command・URL・header・environment field/reference、owner provenance、condition、diagnostics、process-environment substitution なし、stale ID に関する Codex MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T296 [US2] reciprocal contract reference を備えた Codex carrier、instruction-fallback、MCP runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T297 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex MCP detail、config precedence、trust、diagnostics、owner navigation、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/codex-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T298 [US2] strategy ID や premature agent behavior reference を追加せず、inventory が所有する Codex MCP strategy を detail-time active-config selection、trust、duplicate、provenance、relationship、closed dormant agent-inheritance adapter で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T299 [US2] Codex active-config MCP precedence、trust、duplicate、provenance metadata、owner-gated dormant agent inheritance を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T300 [US2] TOML extraction を閉じた Codex MCP field ID、正確な lexical span/UTF-16 range、source 順の duplicate、authored-literal round trip、内部 typed semantic、recognition-atomic failure、schema distinction、source value を含まない diagnostics で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T301 [US2] Codex MCP の正確な authored-literal extraction、selection projection、condition、diagnostics、non-following relationship を `src/inspection/scan.ts` に統合する
- [ ] T302 [US2] サーバー、トランスポート、所有者スコープ、信頼、順序、アクティベーションの不確実性に対応する型付き Codex MCP 詳細を `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T303 [US2] 意味的に同等な英語/日本語の Codex MCP 選択、安全性、所有者、スキーマ、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 25: Claude MCP ファイルのインベントリ

**目的**: ルートにある正確な Claude `.mcp.json` の独立物理候補を追加する。

**独立テスト**: ルートの `.mcp.json` だけをインベントリに含め、子孫を Claude 候補として拒否し、将来の Copilot との共有を維持しながら、User 状態、コネクター、managed 設定、リンク、エイリアス、ニアミス、内包宣言が独立ファイルとして扱われないことを検証する。

**目に見えるチェックポイント**: ユーザーは、正確なルート来歴を持つ Claude プロジェクト MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T304 [US1] ルート、子孫、不正な JSON、敵対的なコマンド、シークレット、リンク、エイリアス、User/plugin/connector/managed 状態、内包宣言、ニアミスを対象とする Claude MCP ファイルのフィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T305 [US1] Claude MCP-file behavior、読み取り権限を付与しない `claude.behavior.user.mcp-state`、`claude.behavior.repo.agents`、`claude.behavior.repo.plugin`、`claude.behavior.user.plugins` fact、正確な candidate、selection、relationship、path-negative な plugin/User/connector/managed caseを、`claude.excluded.plugin-files` を作成せずに reciprocal evidence row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T306 [P] [US1] 正確なルート `claude.repo.mcp`、descendant/User/plugin/connector/managed の拒否、独立スキーマの来歴に対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T307 [US1] Claude MCP ファイル行、正確なルート来歴、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/claude-mcp-files-inventory.spec.ts` に追加する

### 実装

- [ ] T308 [US1] Claude MCP-file/User/owner behavior statement を、完全な base replacement および owner-strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、未 admission の owner に candidate authority または connection authority を与えず production registry を閉じたままにする
- [ ] T309 [US1] 正確な Claude MCP candidate を追加し、`claude.excluded.plugin-files` を早期所有せず、新しい MCP exclusion ID も作成せずに plugin/User/connector/managed location を path-negative のまま保つ処理を `shared/registries/inspection-rules.ts` に追加する
- [ ] T310 [US1] Claude MCP-file evidence に加え、このフェーズで所有する読み取り権限を付与しない四つの MCP-dependent behavior fact すべての reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T311 [US1] Claude のルートと完全一致する `.mcp.json` のマッチングとパス由来の認識を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T312 [US1] Claude MCP ファイルの分類を統合し、後続の共有認識に備えて物理的な同一性を `src/inspection/scan.ts` で維持する
- [ ] T313 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Claude ファイル、スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 26: Claude MCP ファイルの詳細

**目的**: 独立 Claude `.mcp.json` に、エントリ全体の置換と起動時の `cwd` 相対基準を備えた完全な literal 詳細を追加する。

**独立テスト**: 敵対的および不正なルートファイルを開き、local→project→User→plugin→connector のエントリ全体の置換に関する事実、コマンド/引数に対する起動時の `cwd` 基準、重複の不確実性、正確な authored-literal preservation、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。

### テストを先に

- [ ] T314 [P] [US2] local→project→User→plugin→connector のエントリ全体の置換と、コマンド/引数に対する起動時の `cwd` 相対基準について、失敗する Claude MCP テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T315 [P] [US2] Claude ファイルのサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、コネクター状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T316 [P] [US2] 完全な authored source、occurrence 順に正確な field literal と authored relationship target、file schema、base path、condition、environment-reference substitution なし、diagnostics、stale ID に関する Claude MCP-file detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T317 [US2] 相互の契約参照を備えた、失敗する Claude MCP ファイルの runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T318 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude MCP-file detail、replacement order、base path、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/claude-mcp-files-detail.spec.ts` に追加する

### 実装

- [ ] T319 [US2] strategy ID を追加せず、inventory が所有する Claude MCP strategy を detail-time whole-entry replacement、launch base、duplicate、scope、authored relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T320 [US2] エントリ全体の置換と起動時の `cwd` 相対基準を備えた Claude MCP ファイルのメタデータを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T321 [US2] Closed Claude MCP field ID、exact tree-token source span/UTF-16 range、source-order duplicate、authored-literal round trip、internal typed semantic、schema distinctionを持つinert strict-JSON extractionを、Inspector固有の数値上限を設けないenvironment-owned parser capacityで実装する。Deterministicにreturnされたmalformed/extraction outcomeはrecognition-atomicかつsource-value-freeとし、decoder/parser/extractorの全throw/rejectionはcatch、cause classification、retry、recovered parser/extraction/recognition/derived result、Diagnostic、generationなしに変更なく伝播させる処理を`src/inspection/parsers/json.ts`へ実装する
- [ ] T322 [US2] Claude MCP-file の正確な authored-literal preservation、selection projection、condition、diagnostics、non-following relationship を `src/inspection/scan.ts` に統合する
- [ ] T323 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude MCP 置換、基準、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 27: Claude 内包 MCP core

**目的**: すでに受け入れられた skill owner に Claude MCP metadata を関連付け、まだ所有されていない behavior への reference を登録したり standalone candidate を作成したりせず、後続の settings、agent、plugin、marketplace owner に向けた closed owner-adapter contract を実装します。

**独立テスト**: 受け入れ済み skill owner を検査し、inline/named server reference、parent inheritance、plugin component path、runtime-only connector、不正な field、宣言欠落を含む将来の owner kind 用 pure adapter fixture を実行します。受け入れ済み owner だけが recognition を受けられること、将来の adapter は read authority を与えないこと、synthetic file が現れないこと、target は relationship のままであること、記述されたすべての値が literal のままであること、すべての path で zero connection が成り立つことを検証します。

**目に見えるチェックポイント**: Claude の skill-contained MCP fact が既存 owner 上に表示され、root `.mcp.json` と区別されたままになります。後続 owner family は、MCP matching や connection safety を変更せず、事前テスト済み adapter を有効化できます。

### テストを先に

- [ ] T324 [P] [US2] 受け入れ済み skill と、純粋で読み取り権限を付与しない settings/agent/plugin/marketplace adapter fixture、named/inline server、parent inheritance、plugin path、connector、owner provenance、現在所有済みの正確な evidence に関する失敗する Claude contained-MCP test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T325 [P] [US2] この checkpoint では contained MCP が受け入れ済み skill owner だけに関連付けられ、将来の owner adapter は受け入れ済み owner なしに candidate または recognition を作成できず、plugin target を読み取らず、不正/欠落した declaration をアトミックに省略することを証明する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T326 [P] [US2] Claude のすべての内包所有者、関係、コネクター、コマンド、URL、ヘッダー、環境、参照パスを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T327 [US2] 現在所有済みの skill/MCP behavior だけを使用する Claude contained-MCP relationship/composition graph coverage の失敗テストを追加し、将来の owner adapter に unresolved registry reference または read authority がないことを `tests/contract/runtime-composition.test.ts` で証明する
- [ ] T328 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、Claude skill-contained MCP detail、owner navigation、inheritance、relationship、diagnostics、未 admission owner family の row がないこと、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/claude-contained-mcp.spec.ts` に追加する

### 実装

- [ ] T329 [US2] 現在受け入れ済みの skill owner 向けに Claude MCP strategy を拡張し、後続 owner、parent-inheritance、plugin/runtime-reference、contained-declaration condition に向けた closed non-authorizing adapter interface を `shared/registries/runtime-composition.ts` に定義する
- [ ] T330 [US2] Claude skill-contained MCP metadata に加え、owner-gated adapter dispatch、owner provenance、relationship-only target、runtime-only fact を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T331 [US2] occurrence/range に正確に裏付けられた現在 admission 済み skill-contained MCP field に対して既存の YAML/Markdown extraction を拡張し、未 admission の settings/plugin owner を parse せず、純粋な将来の JSON/JSONC owner-adapter schema だけを `src/inspection/parsers/json.ts`、`src/inspection/parsers/yaml.ts`、`src/inspection/parsers/markdown.ts` に定義する
- [ ] T332 [US2] 現在 admission 済み owner を一度だけ読み取る recognition、正確な authored-literal extraction、condition、diagnostics、non-following relationship、および将来の adapter dispatch が独立して admission 済みの owner ID を受け取るという厳格な要件を `src/inspection/scan.ts` に統合する
- [ ] T333 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude 内包 MCP の所有者、継承、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 28: Copilot CLI MCP ファイルのインベントリ

**目的**: Copilot CLI の `.mcp.json` と `.github/mcp.json` を子孫インベントリ候補として追加する。

**独立テスト**: ルートおよびネストされた CLI コンテキストのファイルをインベントリに含め、追加スキーマ、User 設定、セッション追加、プラグイン対象、hosted 状態、リンク、エイリアス、ニアミスを拒否し、正確な runtime-chain/trust の不確実性を維持する。

**目に見えるチェックポイント**: ユーザーは、コンテキストとスキーマの来歴を備えた Copilot CLI MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T334 [US1] ルート/ネストされた `.mcp.json`、`.github/mcp.json`、重複、不正な JSON、敵対的なコマンド、シークレット、リンク、エイリアス、User/session/plugin/hosted 状態、ニアミスを対象とする Copilot CLI MCP フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T335 [US1] Copilot CLI MCP の振る舞い、`copilot.repo.mcp`、選択、除外 ID を持たずパス不一致となる User/session/hosted/configured ケース、relationship-only のプラグインパス、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T336 [P] [US1] 両方の CLI セレクター、子孫インベントリ、runtime-chain/trust 条件、スキーマ来歴、User/session/plugin/hosted 候補がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T337 [US1] Copilot CLI MCP 行、コンテキスト/スキーマバッジ、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/copilot-cli-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T338 [US1] Copilot CLI MCP/User statement を、完全な base lookup/selection strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T339 [US1] `copilot.repo.mcp` の 2 つのセレクターだけを追加し、除外 ID を持たず User/session/hosted/configured の場所をパス不一致のまま保ち、プラグインパスを関係として `shared/registries/inspection-rules.ts` に保持する
- [ ] T340 [US1] Copilot CLI MCP のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T341 [US1] Copilot の子孫 CLI MCP のマッチングとスキーマで修飾された認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T342 [US1] Copilot CLI MCP の分類を統合し、共有されるルートの物理的な同一性を `src/inspection/scan.ts` で維持する
- [ ] T343 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Copilot CLI コンテキスト、スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 29: Copilot CLI MCP の詳細

**目的**: ソース順序、信頼、祖先にある重複の不確実性、接続を一切行わない振る舞いを備えた、完全な literal Copilot CLI MCP 詳細を追加する。

**独立テスト**: 敵対的および不正な CLI ファイルを開き、session-additional→plugin→workspace→User の順序に関する事実、祖先にある未知の重複、runtime-chain/trust 条件、正確な authored literal、診断、接続または対象の昇格が一切ないことを検証する。

**目に見えるチェックポイント**: Copilot CLI MCP ファイルを選択すると、正確なローカル順序と不確実性が表示される。

### テストを先に

- [ ] T344 [P] [US2] session-additional→plugin→workspace→User の順序、祖先にある未知の重複、runtime-chain/trust 条件、スキーマ、来歴に対する失敗する Copilot CLI MCP テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T345 [P] [US2] Copilot CLI のサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、session/plugin 状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T346 [P] [US2] 完全な authored source、occurrence 順に正確な field literal/relationship target、schema、condition、environment-reference substitution なし、diagnostics、stale ID に関する Copilot CLI MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T347 [US2] 相互の契約参照を備えた、失敗する Copilot CLI MCP runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T348 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot CLI MCP detail、order、duplicate、trust、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/copilot-cli-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T349 [US2] strategy ID を追加せず、inventory が所有する Copilot CLI MCP strategy を detail-time source order、ancestor duplicate、trust、context、authored relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T350 [US2] Copilot CLI MCP の順序、重複の不確実性、信頼、スキーマ、来歴のメタデータを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T351 [US2] 閉じた Copilot CLI MCP field ID、token に裏付けられた正確な source occurrence/range、authored literal と内部 typed semantic、schema distinction、atomic failure、source value を含まない diagnostics で JSON extraction を `src/inspection/parsers/json.ts` において拡張する
- [ ] T352 [US2] Copilot CLI MCP の正確な authored-literal preservation、selection projection、condition、diagnostics、non-following relationship を `src/inspection/scan.ts` に統合する
- [ ] T353 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot CLI MCP の順序、信頼、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 30: Copilot VS Code MCP ファイルのインベントリ

**目的**: Exactな`.vscode/mcp.json`をdocumentedなVS Code `servers` schemaとともに追加し、exactなVS Code 1.118以降root `.mcp.json`を既存CLI candidateへmergeするpath/surface-onlyなconflict provenanceとして追加する。

**独立テスト**: 両方のexact workspace-root formをinventoryし、nested `.mcp.json`をCLI-onlyのままにし、root `.mcp.json`のCLI/VS Code provenanceを1 file/read/recognitionへmergeし、release-note/current-guide conflictを公開し、VS Code所有root-schema fieldまたは推測winnerを認可せず、一般の`.vscode/settings.json`、User/profile MCP、link、alias、near missを拒否する。

**目に見えるチェックポイント**: Userはdocumentedな`.vscode/mcp.json` `servers` schemaと、schema/total same-name orderがunknownのVS Code 1.118以降root-path provenanceを区別できる。

### フィクスチャとテストを先に

- [ ] T354 [US1] Exactな`.vscode/mcp.json`、exact 1.118以降root `.mcp.json`、root CLI/VS Code overlap、nested CLI-only near miss、malformed `servers`、hostile command、secret、link、alias、general settings、User/profile state、unsupportedなVS Code root-schema inferenceを対象とするCopilot VS Code MCP fixtureを`tests/fixtures/repositories/build-fixtures.ts`に作成する
- [ ] T355 [US1] ConflictingなCopilot VS Code MCP behavior、read authorityを付与しない`copilot.behavior.vscode.user.mcp`/`copilot.behavior.vscode.agents` fact、exact `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root` candidate、path-only root provenance、selection unknown、`copilot.excluded.vscode-settings`を作らないpath-negativeなgeneral-settings/descendant/User/profile case、relationship、reciprocal current-guide/1.118-release evidence rowを`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json`に具体化する
- [ ] T356 [P] [US1] Exactな`copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`、専用`.vscode` `servers` extraction、VS Code所有field 0件のroot path-only provenance、`copilot.repo.mcp`と並ぶ1 merged root file/read/Copilot-MCP recognition、nested/general-settings/User/profile rejection、cross-provenance schema collapseなしについて失敗するmatcher/recognition testを`tests/unit/inspection/rules.test.ts`と`tests/unit/inspection/recognizers.test.ts`へ追加する
- [ ] T357 [US1] 両Copilot VS Code MCP path、`.vscode` schema badge、root evidence-conflict/unknown-schema state、merged provenance、filter、exclusion、diagnostic、connection controlなしを対象とするbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-inventory.spec.ts`に追加する

### 実装

- [ ] T358 [US1] Copilot VS Code MCP/User/agent factを1.118/current-guide conflict、path-specific schema availability、total-order unknown、完全なbase lookup/selection、dormant-owner strategy recordとともに`shared/registries/vendor-behaviors.ts`/`shared/registries/runtime-composition.ts`へ追加し、Custom Agent fileをadmitせずproduction registryをclosedのままにする
- [ ] T359 [US1] 2つのexact VS Code MCP rule `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`を追加し、nested root-form fileをCLI-only、general settings/User/profile locationをpath-negativeのままにし、`copilot.excluded.vscode-settings`を早期所有せず新MCP exclusion IDも定義しない処理を`shared/registries/inspection-rules.ts`へ追加する
- [ ] T360 [US1] Current-guideと`vscode.copilot.mcp.workspace-root-release` recordに加え、conflictingなVS Code MCP behavior/rule/strategyと、このphase所有のread authorityを付与しない両VS Code MCP/agent factへのreciprocal backlinkを`shared/registries/official-sources.ts`へ追加する
- [ ] T361 [US1] Exact `.vscode/mcp.json` matchingと専用schema、およびVS Code所有extractorを持たないVS Code path/surface-only provenanceとしてのexact root `.mcp.json` matchingを`src/inspection/rules/copilot.ts`/`src/inspection/recognizers/copilot.ts`へ実装する
- [ ] T362 [US1] Root `.mcp.json`でcompatibleなCLI/VS Code provenanceを1 physical file/read、1 Copilot/MCP recognitionへmergeし、nested CLI candidateを変更しないCopilot VS Code MCP classificationを`src/inspection/scan.ts`へ統合する
- [ ] T363 [US1] MCP inventory rowと、`.vscode` schema、root evidence conflict/unknown schema/order、merged provenance、exclusionに関する意味同等の英日messageを`app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts`で拡張する

---

## フェーズ 31: Copilot VS Code MCP の詳細

**目的**: 完全なliteral `.vscode/mcp.json` detailと1.118以降root `.mcp.json`のexact path/evidence detailを追加し、unknown root schema、total-order uncertainty、trust conditionを保持する。

**独立テスト**: Hostile/malformedな`.vscode/mcp.json`とroot `.mcp.json`を開き、`.vscode`だけの専用field、shared root fileのCLI-only extractionとVS Code path-only provenance、conflict/unknown same-name resolution、trust、exact authored literal、diagnostic、connection 0件を検証する。

**目に見えるチェックポイント**: どちらのVS Code MCP pathを選択してもcomplete inert detailを表示し、documented `.vscode` schemaと未解決root semanticsを明確に分離する。

### テストを先に

- [ ] T364 [P] [US2] `.vscode` `servers` schema、VS Code所有field 0件の1.118以降root path-only provenance、merged CLI provenance、workspace scope、unknown root/`.vscode`/User/agent/plugin duplicate、trust、conflict assessment、exact evidenceについて失敗するCopilot VS Code MCP testを`tests/unit/inspection/copilot-metadata.test.ts`へ追加する
- [ ] T365 [P] [US2] VS Code MCP のコマンド、URL、ヘッダー、環境、DNS、ソケット、認証、信頼プロンプト、User/profile 状態を対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T366 [P] [US2] Complete authored source、`.vscode` occurrence順field literal/relationship target、root path-only conflict provenanceとVS Code所有root field 0件、condition、environment-reference substitutionなし、diagnostic、stale IDについて失敗するVS Code MCP-detail API testを`tests/contract/http-api-files.test.ts`へ追加する
- [ ] T367 [US2] Current-guide/1.118 conflict、unknown root schema/total same-name order、reciprocal contract referenceについて失敗するVS Code MCP runtime-composition graph coverageを`tests/contract/runtime-composition.test.ts`へ追加する
- [ ] T368 [US2] Sensitive-content acknowledgement、exact literal credential/environment-reference表示、process-environment sentinel substitutionなし、masking/reveal controlなし、両pathのcomplete literal VS Code MCP detail、`.vscode` schema対root unknown-schema conflict、duplicate uncertainty、trust、diagnostic、zero-connection behaviorに関するbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-detail.spec.ts`へ追加する

### 実装

- [ ] T369 [US2] Strategy IDを追加せず、inventory-owned Copilot VS Code MCP strategyをcurrent-guide/1.118 conflict、path-specific schema availability、unknown root/`.vscode`/User/agent/plugin winner、trust、provenance-specific authored relationship projectionで`shared/registries/runtime-composition.ts`において拡張する
- [ ] T370 [US2] `.vscode/mcp.json`のVS Code schema metadataと、VS Code所有extractor field 0件のroot `.mcp.json` path-only conflict provenanceに加え、duplicate uncertainty/trust metadataを`src/inspection/recognizers/copilot.ts`へ実装する
- [ ] T371 [US2] Documentedな`.vscode/mcp.json` extractor専用のinert JSONC modeを追加し、tree-backed exact source span/UTF-16 range、closed VS Code MCP field ID、source-order duplicate、authored literalとinternal typed semantics、comment、schema distinction、Inspector numerical capを持たないenvironment-owned parser capacityを実装する。このVS Code extractorをroot `.mcp.json`のpath-only provenanceから呼ばず、独立したCLI extractionはCLI parserが所有する。Deterministic returned malformed/extraction outcomeはrecognition-atomicかつsource-value-freeとし、decoder/parser/extractorの全throw/rejectionはcatch、cause classification、retry、recovered parser/extraction/recognition/derived result、Diagnostic、generationなしに変更なく伝播させる処理を`src/inspection/parsers/json.ts`へ追加する
- [ ] T372 [US2] `.vscode/mcp.json`のexact authored-literal preservation、condition、diagnostic、non-following relationshipに加え、root `.mcp.json`のpath-only conflict provenanceと独立したCLI-owned extractionを、VS Code所有root fieldおよびcross-provenance schema promotion 0件で`src/inspection/scan.ts`へ統合する
- [ ] T373 [US2] `.vscode/mcp.json` schemaとroot `.mcp.json` path-only conflict/unknown-schema provenance、merged CLI provenance、trust、安全性、VS Code所有root field 0件、total-order uncertaintyを区別するtyped detailと意味同等の英日messageを`app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts`で拡張する

---

## フェーズ 32: Copilot agent-contained MCP contract と Cloud runtime fact

**目的**: Custom Agents を受け入れる前に、dormant かつ owner-gated な Copilot custom-agent MCP adapter を実装します。Cloud の out-of-box、custom-agent、Repository-settings MCP data は origin fileを持たない runtime/source fact としてのみ公開し、plugin path は読み取り権限を付与しない relationship のまま、settings は MCP owner にしません。

**独立テスト**: メモリ内 agent-owner fixture、plugin relationship path、settings near miss、Cloud fact を使って pure adapter を実行します。独立して受け入れられた agent ID なしには adapter が session recognition を生成しないこと、out-of-box→custom-agent→Repository-settings の後勝ち fact が origin fileを持たないままであること、plugin/settings が MCP recognition を作成しないこと、synthetic local file が現れないこと、hosted/remote I/O と connection がゼロであることを検証します。

**目に見えるチェックポイント**: Origin fileを持たない Cloud MCP fact と unavailable 状態が表示されます。Custom Agents wave が owner を受け入れて事前テスト済み adapter を有効化するまでは、local agent-contained row は現れません。

### テストを先に

- [ ] T374 [P] [US2] out-of-box→custom-agent→Repository-settings の後勝ち、synthetic agent-owner provenance、relationship-only の plugin path、settings の非所有、正確にこの 3 source だけに対する origin fileを持たない Cloud fact、local-candidate inference がないことに関する pure-adapter/Cloud MCP の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T375 [P] [US2] dormant adapter は独立して受け入れられた custom-agent ID なしには MCP を関連付けられず、plugin path と settings は MCP recognition または synthetic file を作成せず、Cloud の out-of-box/custom-agent/Repository-settings fact は file ID を持たないことを証明する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T376 [P] [US2] 内包サーバー、hosted リポジトリと settings、プラグイン、コマンド、URL、認証、参照対象を対象とするゼロ接続/ネットワークテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T377 [US2] origin fileを持たない out-of-box/custom-agent/Repository-settings 条件と既存ソースへのエビデンスバックリンクを備えた、読み取り権限を付与しない正確な `copilot.behavior.cloud.mcp` の事実を `tests/fixtures/conformance/vendor-behaviors.json` と `tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T378 [US2] `copilot.behavior.cloud.mcp` が `shared.excluded.managed-remote-state` から参照される前に、失敗する正確な所有権と相互バックリンクのカバレッジを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/official-sources.test.ts` に追加する
- [ ] T379 [US2] Copilot Cloud runtime MCP graph coverage と、unresolved Custom Agent behavior reference または candidate-rule addition を持たない pure owner-adapter contract の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T380 [US2] origin fileを持たない Cloud runtime fact、unavailable-state label、diagnostics、local hosted row ゼロ、owner admission 前の custom-agent-contained row ゼロを対象とするブラウザー受け入れテストを `tests/e2e/copilot-contained-cloud-mcp.spec.ts` に追加する

### 実装

- [ ] T381 [US2] managed/remote 除外から参照される前に、読み取り権限を付与しない、origin fileを持たない正確な `copilot.behavior.cloud.mcp` ランタイム/ソースの事実を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T382 [US2] ソース ID を作成せず、`copilot.behavior.cloud.mcp` の相互バックリンクを既存の公式ソースレコードへ `shared/registries/official-sources.ts` で追加する
- [ ] T383 [US2] 正確な Copilot Cloud out-of-box→custom-agent→Repository-settings order、これら 3 source に対する origin fileを持たない fact、hosted-unavailable condition、relationship-only の plugin path を備えた closed non-authorizing custom-agent owner-adapter interface を `shared/registries/runtime-composition.ts` に追加する
- [ ] T384 [US2] 受け入れ済み owner ID を要求する dormant custom-agent-only contained MCP dispatch を実装し、settings/plugin-path ownership を拒否し、origin fileを持たない Cloud out-of-box/custom-agent/Repository-settings runtime fact を duplicate uncertainty とともに `src/inspection/recognizers/copilot.ts` で投影する
- [ ] T385 [US2] 閉じた Copilot agent-contained MCP field ID、正確な owner-source occurrence/range、authored literal、内部 typed semantic、source value を含まない diagnostics で Markdown extraction を `src/inspection/parsers/markdown.ts` において拡張する
- [ ] T386 [US2] origin fileを持たない runtime condition、recognition を伴わない plugin-path relationship、diagnostics、non-following relationship、およびフェーズ 54 で明示的に有効化されるまで local agent-contained recognition を dormant に保つ owner-ID gate を `src/inspection/scan.ts` に統合する
- [ ] T387 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot 内包/Cloud の所有者、利用不可状態、順序、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 33: Priority MCP インベントリ

**目的**: 最初の priority wave で利用できるすべての MCP surface、すなわち Codex config-carrier containment、Claude root/skill containment、Copilot CLI/VS Code file、Cloud fact を統合します。後続 owner 用 adapter は、内部の非公開 contract としてのみ保持します。

**独立テスト**: root `.mcp.json` に対する別々の Claude/Copilot recognition を持つ一つの物理 item/read、Copilot-only の nested/VS Code file、Codex carrier、Claude skill owner、origin fileを持たない Cloud fact、これらの family が受け入れられる前には custom-agent/settings/plugin/marketplace owner row がないこと、hosted synthetic file がないこと、決定論的な schema/provenance order、filter、path negative、alias、injected throw/rejection、rescan cleanup を検証します。

**目に見えるチェックポイント**: Priority MCP inventory を利用し、読み取り可能な physical file/owner と origin fileを持たない runtime fact を区別でき、まだ受け入れられていない owner family の premature row は表示されません。

### テストを先に

- [ ] T388 [US1] root/shared/nested CLI file、VS Code file、Codex carrier、Claude skill containment、dormant future-owner adapter、plugin-path relationship、settings non-owner、origin fileを持たない Cloud fact、hostile field、secret、alias、path negative、注入した execution-environment throw/rejection に対する priority MCP fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T389 [US1] まだ所有されていない plugin/settings exclusion ID がなく、contained/runtime candidate rule がゼロであることを証明しながら、priority MCP behavior、file matcher、現在受け入れ済み owner/runtime selection、dormant adapter contract、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T390 [P] [US1] Claude root、Copilot CLI/VS Code file、Codex standalone がないこと、path-negative な User/hosted/configured input、relationship-only plugin path、contained/runtime MCP fact による candidate rule がゼロであることに関する完全な matcher test を `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T391 [P] [US1] shared root Claude/Copilot、Copilot-only nested/VS Code、Codex carrier、Claude skill owner、dormant custom-agent/other-Claude-owner adapter、origin fileを持たない Cloud fact、synthetic file がないこと、schema distinction、決定論的な provenance に関する priority recognition-matrix test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T392 [P] [US1] shared MCPのread-once、決定論的なrecognition/provenance order、現在受け入れ済みowner attachment、dormant-owner nonpublication、alias、決定的かつentry-localでcapacityに起因しないfailureだけのcontracted-partial continuity、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected throw/rejection、connection/target readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T393 [US1] priority MCP inventory、shared attribution、現在の contained owner、origin fileを持たない runtime fact、dormant-owner row の不在、path negative、schema label、diagnostics、keyboard use を対象とするブラウザー受け入れテストを `tests/e2e/mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T394 [US1] priority MCP file/owner の read-once assembly、決定論的な recognition/provenance/schema order、owner-gated dormant adapter、synthetic file がないこと、source-value-free diagnostics を `src/inspection/scan.ts` で完成させる
- [ ] T395 [US1] dormant adapter を描画せず、MCP filter、shared recognition、admitted contained-owner、runtime-fact、schema summary を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で完成させる
- [ ] T396 [US1] 意味的に同等な英語/日本語の priority MCP inventory、schema、admitted-owner、shared-recognition、runtime-fact、exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 34: MCP 比較

**目的**: 実際に読み取り可能な物理 file ID だけを選択可能としつつ、literal および typed MCP difference で比較を拡張します。Contained MCP は owner を通じて選択し、runtime fact だけでは選択できません。

**独立テスト**: admission 済み owner を介した contained declaration と Codex carrier 対 root `.mcp.json` の identity-preservation case を含め、priority wave の現行世代で読み取り可能な物理 file ID を正確に二つ選択します。完全な literal source に加え、整列された server、transport、schema、base、provenance、trust、selection、replacement、uncertainty を検証し、runtime-fact-only または dormant-owner の選択を拒否します。

**目に見えるチェックポイント**: ユーザーは MCP 宣言に接続せずに比較できる。

### テストを先に

- [ ] T397 [US3] 既存の FileDetail call で読み込む正確に二つの active-generation readable ID、admission 済み owner ID を介した contained MCP、runtime-fact/dormant-owner の拒否、完全な literal Codex-carrier 対 `.mcp.json` source、正確な `(tool, kind, fieldId, occurrence)` authored-literal server/transport/schema/provenance/trust/selection difference に関する selection と comparison の失敗回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T398 [US3] sensitive-content acknowledgement、admission 済み owner の contained MCP、credential/environment-reference difference を含む完全な literal Codex-carrier 対 `.mcp.json` diff、typed server/provenance row、masking/reveal control または environment substitution なし、runtime-fact/dormant-owner の拒否に関するブラウザー受け入れテストを `tests/e2e/mcp-comparison.spec.ts` に追加する

### 実装

- [ ] T399 [US3] 実際に読み取り可能な物理所有者/ファイル ID による MCP 比較選択を強制し、Codex 設定対 `.mcp.json` のファイル同一性を `app/composables/comparison.ts` で維持する
- [ ] T400 [US3] MCP comparison row が `(tool, kind, fieldId, occurrence)` で match して authored literal を render し、origin file を持たない runtime fact を選択可能な file として露出しないよう `app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T401 [US3] 意味的に同等な英語/日本語の MCP 比較メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 35: Codex Rules inventory

**目的**: 可能な active project configuration layer から direct-child Codex rule file を追加します。

**独立テスト**: `./**/.codex/rules/*.rules` を inventory 化し、nested rule directory、link、near miss、untrusted/runtime-inactive な certainty claim、User/managed rule、無関係な Copilot/Claude file を拒否します。

**目に見えるチェックポイント**: trust、layer、experimental-status、direct-child provenance を持つ Codex rule を filter できます。

### fixture とテストを先行

- [ ] T402 [US1] 可能な project layer、direct child、nested exclusion、malformed metadata、secret、reference、link、alias、trust state、near miss に対する Codex rule fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T403 [US1] exclusion ID を定義せず、Codex rule behavior、candidate、composition、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T404 [US1] direct-child Codex rule、nested exclusion、project-layer provenance、experimental status、trust uncertainty、other-tool recognition なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T405 [US1] Codex rule inventory、filter、provenance、experimental status、exclusion、diagnostics に関するブラウザー受け入れテストを `tests/e2e/codex-rules-inventory.spec.ts` に追加する

### 実装

- [ ] T406 [US1] rule resolution が参照する前に、Codex rule lookup statement と、読み取り権限を付与しない `codex.behavior.user.rules` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T407 [US1] `codex.repo.rules` candidate record だけを追加し、exclusion ID を定義せず、adjacent または nested non-match を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T408 [US1] Codex rule evidence record と affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T409 [US1] Codex direct-child rule matching と path-derived recognition を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T410 [US1] Codex rule の inventory row と、意味的に同等な英語・日本語 label を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 36: Codex Rules の詳細

**目的**: 完全で非活性な Codex rule source、typed trust、active layer uncertainty、experimental status、relationship detail を追加する。

**独立テスト**: 敵対的な Codex rule を開き、正確な authored-literal preservation、project layer/trust 条件、active layer の不確実性、experimental status、非活性な command/link、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Codex rule を選択すると、それを実行または適用せずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T411 [P] [US2] project layer、trust、active layer の不確実性、direct-child provenance、experimental status に関する、失敗する Codex metadata/applicability テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T412 [P] [US2] Codex rule のテキスト、link、command、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T413 [US2] reciprocal contract reference を備えた、失敗する Codex rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T414 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex rule detail、trust、applicability、diagnostics、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/codex-rules-detail.spec.ts` に追加する

### 実装

- [ ] T415 [US2] Codex rule の trust、layer、applicability、experimental-status、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T416 [US2] Codex metadata、applicability、relationship、正確な authored-literal preservation 向けの非活性な rule extraction と scan integration を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T417 [US2] 型付き Codex rule 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T418 [US2] 意味的に同等な英語/日本語の Codex rule 詳細、trust、applicability、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 37: Claude Rules のインベントリ

**目的**: 再帰的な Claude rule ファイルを追加し、すでに所有済みの `copilot.excluded.additional-standard-locations` behavior を `.claude/rules` に対して回帰確認する。

**独立テスト**: `./**/.claude/rules/**/*.md` をインベントリに含め、可能性のある layer の不確実性を保持し、無関係な path と link を拒否し、一致する Claude rule ファイルが初期リリースで Copilot recognition を取得しないことを証明する。

**目に見えるチェックポイント**: ユーザーは path applicability provenance を備え、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。

### fixture とテストを先に

- [ ] T419 [US1] recursive path、可能性のある layer、`paths` frontmatter、nested file、不正な metadata、secret、reference、link、alias、Copilot-compatible case、near miss を対象とする Claude rule fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T420 [US1] Claude rule の behavior、candidate、composition、evidence、および既存の `copilot.excluded.additional-standard-locations` row への regression reference を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T421 [P] [US1] recursive Claude rule、layer の不確実性、direct/nested file、既存の `copilot.excluded.additional-standard-locations` rule による Copilot recognition ゼロに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T422 [US1] Claude rule inventory、filter、provenance、Copilot exclusion evidence、診断、保持された Codex rule に関するブラウザー受け入れテストを `tests/e2e/claude-rules-inventory.spec.ts` に追加する

### 実装

- [ ] T423 [US1] rule layering が参照する前に、Claude rule lookup statement、読み取り権限を付与しない `claude.behavior.user.rules`、Copilot compatibility evidence を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T424 [US1] `claude.repo.rules` candidate だけを追加し、既存の `copilot.excluded.additional-standard-locations` record を保持して参照し、別の exclusion は定義しない処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T425 [US1] Claude rule evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T426 [US1] Copilot へ昇格させずに、Claude の再帰的な rule matching と recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T427 [US1] Claude rule classification を統合し、Codex rule result を `src/inspection/scan.ts` で保持する
- [ ] T428 [US1] inventory row と、意味的に同等な英語/日本語の Claude rule および Copilot exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 38: Claude Rules の詳細

**目的**: 完全で非活性な Claude rule source、typed `paths` applicability、layer condition、relationship を追加する。

**独立テスト**: 敵対的な Claude rule を開き、`paths`、不明な glob base、conditional layer、正確な authored literal、非活性な link/command、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Claude rule を選択すると、任意の filesystem path に対して glob を評価せずに完全で非活性な applicability detail が表示される。

### テストを先に

- [ ] T429 [P] [US2] `paths`、省略された path、不明な glob base、conditional layer、documentation uncertainty に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T430 [P] [US2] Claude rule のテキスト、link、command、glob、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T431 [US2] reciprocal contract reference を備えた、失敗する Claude rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T432 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude rule detail、path applicability、layer condition、diagnostics、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/claude-rules-detail.spec.ts` に追加する

### 実装

- [ ] T433 [US2] Claude rule layering、path-applicability、unknown-base、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T434 [US2] Claude rule metadata、applicability、relationship、正確な authored-literal preservation 向けの非活性な Markdown extraction と scan integration を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T435 [US2] 型付き Claude rule 詳細フィールドと、意味的に同等な英語/日本語の applicability および不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 39: Rules の比較

**目的**: literal および型付きの rule 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation rule fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したpath、layer、trust、provenance、applicability、documentation statusを検証する。

**目に見えるチェックポイント**: どちらの rule が正しいか、または強いかを評価せずに rule ファイルを比較できる。

### テストを先に

- [ ] T436 [US3] `(tool, kind, fieldId, occurrence)` authored literal、rule path、layer、trust、provenance、documentation status に関する rule comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T437 [US3] sensitive-content acknowledgement、credential/environment-reference difference を含む完全な literal rule diff、正確な metadata row、masking/reveal または environment substitution なし、typed rule difference に関するブラウザー受け入れテストを `tests/e2e/rules-comparison.spec.ts` に追加する

### 実装

- [ ] T438 [US3] rule comparison row が `(tool, kind, fieldId, occurrence)` で match して `authoredLiteral` を render し、typed rule state を分離したままにするよう `app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T439 [US3] 意味的に同等な英語/日本語の rule comparison メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 40: Claude Commands のインベントリ

**目的**: 再帰的な Claude legacy-command ファイルと namespace provenance を追加する。

**独立テスト**: `./**/.claude/commands/**/*.md`、再帰的な namespace path、duplicate name、可能性のある layer の不確実性、link、near miss、未対応の standalone `.claude/prompts` をインベントリで確認する。

**目に見えるチェックポイント**: ユーザーは再帰的な namespace と layer provenance を備えた Claude command をフィルタリングできる。

### fixture とテストを先に

- [ ] T440 [US1] recursive namespace、可能性のある layer、duplicate name、不正な metadata、secret、reference、link、alias、未対応の `.claude/prompts`、near miss を対象とする Claude command fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T441 [US1] exclusion ID を定義せず、Claude command の behavior、candidate、composition、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T442 [US1] recursive Claude command、namespace construction、可能性のある layer の不確実性、除外された standalone `.claude/prompts` に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T443 [US1] Claude command inventory、namespace、filter、exclusion、診断に関するブラウザー受け入れテストを `tests/e2e/claude-commands-inventory.spec.ts` に追加する

### 実装

- [ ] T444 [US1] command selection が参照する前に、Claude command lookup statement と読み取り権限を付与しない `claude.behavior.user.commands` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T445 [US1] exclusion ID を定義せず、prompt、User、configured-location path を path-negative のままにして、`claude.repo.command` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T446 [US1] Claude command evidence record と affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T447 [US1] Claude の再帰的な command matching と namespace recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T448 [US1] command inventory row と、意味的に同等な英語/日本語の Claude namespace メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 41: Claude Commands の詳細

**目的**: 完全な literal Claude command source、namespace、invocation、同名 skill の precedence、applicability、非活性な relationship detail を追加する。

**独立テスト**: 敵対的な Claude command を開き、recursive namespace、同名 skill の precedence、不明な traversal、正確な authored literal、非活性な agent/skill reference、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Claude command を選択すると、参照先を実行、import、read せずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T449 [P] [US2] namespace、invocation、agent/skill reference、同名 skill priority、不明な ancestor traversal に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T450 [P] [US2] Claude command body と reference が target を実行、navigate、import、read しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T451 [US2] reciprocal contract reference を備えた、失敗する Claude command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T452 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude command detail、namespace、reference、condition、diagnostics に関するブラウザー受け入れテストを `tests/e2e/claude-commands-detail.spec.ts` に追加する

### 実装

- [ ] T453 [US2] Claude command selection、namespace、skill precedence、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T454 [US2] Claude command metadata、reference、applicability、正確な authored-literal preservation 向けの Markdown extraction と scan integration を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T455 [US2] 型付き Claude command 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T456 [US2] 意味的に同等な英語/日本語の Claude command 詳細、precedence、reference、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 42: Copilot Commands のインベントリ

**目的**: root direct-child の `.claude/commands/*.md` だけを対象とする保守的な Copilot CLI command recognition を追加する。

**独立テスト**: root direct-child command をインベントリに含め、nested command と未対応の User/configured location を拒否し、同じ物理 Claude ファイルを保持し、より広い Copilot command traversal を創作しない。

**目に見えるチェックポイント**: ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。

### fixture とテストを先に

- [ ] T457 [US1] root direct child、nested exclusion、duplicate name、共有 Claude file、不正な metadata、secret、reference、User/configured path、near miss を対象とする Copilot command fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T458 [US1] 無関係な exclusion ID を関連付けず、Copilot CLI command behavior、保守的な candidate、path-negative configured/User case、composition、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T459 [P] [US1] root direct-child Copilot command、nested rejection、共有 Claude file、創作された ancestor/User matcher がないことに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T460 [US1] Copilot command row、CLI provenance、nested exclusion、診断、保持された Claude command に関するブラウザー受け入れテストを `tests/e2e/copilot-commands-inventory.spec.ts` に追加する

### 実装

- [ ] T461 [US1] 読み取り権限を持たない Copilot CLI command lookup statement を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T462 [US1] 無関係な exclusion ID を定義または参照せず、configured/User location を path-negative のままにして、保守的な `copilot.repo.command` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T463 [US1] Copilot command evidence record と affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T464 [US1] Copilot の root direct-child command matching と recognition を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T465 [US1] Copilot command classification と、一度だけ読み取る shared-file assembly を `src/inspection/scan.ts` に統合する
- [ ] T466 [US1] inventory row と、意味的に同等な英語/日本語の Copilot CLI command メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 43: Copilot Commands の詳細

**目的**: 保守的な applicability と同名 skill の precedence を備えた、完全な literal Copilot CLI command detail を追加する。

**独立テスト**: 敵対的な root command file を開き、invocation、skill priority、不明な project ancestry、非活性な reference、正確な authored literal、diagnostics、detail-state cleanup を、Claude runtime の前提を import せずに検証する。

**目に見えるチェックポイント**: Copilot command を選択すると、完全で非活性な CLI-qualified detail と uncertainty が表示される。

### テストを先に

- [ ] T467 [P] [US2] invocation、同名 skill priority、direct-child provenance、不明な ancestry、reference、正確な evidence に関する失敗する Copilot command metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T468 [P] [US2] Copilot command body、reference、navigation、import、target read に関する失敗する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T469 [US2] reciprocal contract reference を備えた、失敗する Copilot command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T470 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Copilot command detail、invocation、reference、condition、diagnostics に関するブラウザー受け入れテストを `tests/e2e/copilot-commands-detail.spec.ts` に追加する

### 実装

- [ ] T471 [US2] Copilot command invocation、保守的な applicability、skill precedence、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T472 [US2] exact metadata、condition、relationship、診断、evidence を備えるよう Copilot command recognition を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T473 [US2] Copilot command parsing、正確な authored-literal preservation、非活性な reference、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T474 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot command precedence、reference、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 44: 統合 Commands インベントリ

**目的**: 正しい root-shared および nested-Claude-only recognition により、Claude と Copilot の command candidate を統合する。

**独立テスト**: root direct-child の `.claude/commands/*.md` について一つの物理 item/read と二つの recognition、nested command について Claude-only recognition、決定論的な namespace/provenance、filter、exclusion、alias、injected throw/rejection、rescan cleanup を検証する。

**目に見えるチェックポイント**: ユーザーは共有 root command と nested Claude-only command を区別できる。

### テストを先に

- [ ] T475 [US1] recursive Claude namespace、root の Copilot-compatible command、nested Claude-only file、duplicate name、secret、reference、alias、injected throw/rejection、near miss を対象とする command fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T476 [US1] 両ベンダー、shared recognition、exclusion ID を伴わない path-negative configured/User case、composition、relationship、evidence の command conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T477 [US1] root の共有 direct child、nested Claude-only command、namespace construction、除外された `.claude/prompts` に関する完全な matcher/recognition-matrix テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T478 [P] [US1] 一度だけ読み取るroot command、決定論的なrecognition/provenance order、alias、決定的かつentry-localでcapacityに起因しないfailureだけのcontracted-partial continuity、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected throw/rejection、referenced-target readなしに関する失敗する統合テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T479 [US1] 統合 command inventory、namespace、shared recognition、nested Claude-only row、filter、診断に関するブラウザー受け入れテストを `tests/e2e/commands-inventory.spec.ts` に追加する

### 実装

- [ ] T480 [US1] 一度だけ読み取る root command assembly、nested Claude-only recognition、決定論的な provenance、exclusion を `src/inspection/scan.ts` で完成させる
- [ ] T481 [US1] command inventory row と、意味的に同等な英語/日本語の namespace、shared-tool、exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 45: Commands の比較

**目的**: literal および型付きの command 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation command fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したnamespace、invocation、recognition、precedence、provenance、referenceを検証する。

**目に見えるチェックポイント**: command ファイルを実行せずに比較できる。

### テストを先に

- [ ] T482 [US3] `(tool, kind, fieldId, occurrence)` authored literal、namespace、invocation、tool recognition、precedence、reference に関する command comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T483 [US3] sensitive-content acknowledgement、credential/environment-reference difference を含む完全な literal command diff、正確な metadata row、masking/reveal または environment substitution なし、typed command difference に関するブラウザー受け入れテストを `tests/e2e/commands-comparison.spec.ts` に追加する

### 実装

- [ ] T484 [US3] command comparison row が `(tool, kind, fieldId, occurrence)` で match して `authoredLiteral` を render し、typed namespace/invocation state を分離したままにするよう `app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T485 [US3] 意味的に同等な英語/日本語の command comparison メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 46: Copilot Prompts のインベントリ

**目的**: 対応する Copilot prompt ファイルをインベントリに追加する。

**独立テスト**: direct `.github/prompts/*.prompt.md` ファイルをインベントリに含め、nested candidate と configured-location candidate を除外する。

**目に見えるチェックポイント**: ユーザーは正確な default-location provenance を備えた対応 Copilot prompt をフィルタリングできる。

### fixture とテストを先に

- [ ] T486 [US1] direct child、nested near miss、不正な metadata、secret、link、`#file` reference、image、URI を対象とする Copilot prompt fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T487 [US1] prompt row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T488 [US1] 正確な default prompt location、nested exclusion、configured-location uncertainty に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T489 [US1] Copilot prompt inventory と exclusion に関するブラウザー受け入れテストを `tests/e2e/prompts-inventory.spec.ts` に追加する

### 実装

- [ ] T490 [US1] prompt 詳細と後続の User-runtime exclusion が参照する前に、Copilot prompt lookup statement と読み取り権限を付与しない `copilot.behavior.vscode.user.prompts` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T491 [US1] 無関係な exclusion ID を定義または参照せず、configured/User/non-default location を path-negative のままにして、`copilot.repo.prompt` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T492 [US1] prompt evidence record と affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T493 [US1] Copilot prompt matching と recognition を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T494 [US1] prompt inventory row と、意味的に同等な location/exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 47: Copilot Prompts の詳細

**目的**: 完全な literal prompt source、invocation、scope、applicability、非活性な reference detail を追加する。

**独立テスト**: 敵対的な prompt を開き、正確な authored-literal preservation、明示的な invocation、reference、URI/image/navigation の動作がないこと、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Copilot prompt を選択すると、参照先へ移動したり読み取ったりせずに完全で非活性な詳細を開ける。

### テストを先に

- [ ] T495 [P] [US2] invocation、scope、reference、applicability、evidence に関する失敗する prompt metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T496 [P] [US2] prompt の link、image、URI、`#file` target が移動も read の認可もしないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T497 [US2] reciprocal contract reference を備えた、失敗する prompt runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T498 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal prompt detail と非活性な reference に関するブラウザー受け入れテストを `tests/e2e/prompts-detail.spec.ts` に追加する

### 実装

- [ ] T499 [US2] prompt invocation、applicability、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T500 [US2] prompt metadata、非活性な reference、applicability、正確な authored-literal preservation 向けの Markdown extraction と scan integration を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T501 [US2] 型付き prompt 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T502 [US2] 意味的に同等な英語/日本語の prompt 詳細、invocation、reference、安全性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 48: Copilot Prompts の比較

**目的**: literal および型付きの Copilot prompt 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation prompt fileを正確に2つ比較し、完全なliteral sourceに加えて、整列したinvocation、scope、provenance、applicability、referenceを検証する。

**目に見えるチェックポイント**: コンテンツへ移動したり実行したりせずに Copilot prompt を比較できる。

### テストを先に

- [ ] T503 [US3] `(tool, kind, fieldId, occurrence)` authored literal、prompt invocation、scope、provenance、reference に関する prompt comparison の失敗 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T504 [US3] sensitive-content acknowledgement、credential/environment-reference difference を含む完全な literal prompt diff、正確な metadata row、masking/reveal または environment substitution なし、typed prompt difference に関するブラウザー受け入れテストを `tests/e2e/prompts-comparison.spec.ts` に追加する

### 実装

- [ ] T505 [US3] prompt comparison row が `(tool, kind, fieldId, occurrence)` で match して `authoredLiteral` を render し、typed invocation/scope state を分離したままにするよう `app/components/comparison/RecognitionComparison.vue` を拡張する
- [ ] T506 [US3] 意味的に同等な英語/日本語の prompt comparison メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 49: Codex Custom Agents inventory

**目的**: 対応する Codex `.codex/agents/*.toml` custom-agent candidate を追加します。

**独立テスト**: 可能な project layer の direct-child TOML agent、duplicate name、near miss、nested exclusion、link、alias、任意の config-path reference、hosted-state exclusion、traversal uncertainty を inventory 化します。

**目に見えるチェックポイント**: 正確な project-layer provenance を持つ Codex custom-agent file を filter できます。

### fixture とテストを先行

- [ ] T507 [US1] root/descendant project layer、direct child、nested near miss、duplicate name、malformed TOML、secret、config-path reference、link、alias、hosted/User exclusion に対する Codex custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T508 [US1] exclusion ID を定義せず、Codex custom-agent behavior、matcher、composition、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T509 [US1] `codex.repo.agent`、direct-child TOML、nested exclusion、project-layer uncertainty、任意の config-path promotion なしに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T510 [US1] Codex custom-agent inventory、filter、provenance、exclusion、diagnostics、agent-owned MCP recognition がないことに関するブラウザー受け入れテストを追加し、既存 carrier inheritance は detail 時の relationship だけであることを `tests/e2e/codex-custom-agents-inventory.spec.ts` で検証する

### 実装

- [ ] T511 [US1] inheritance が参照する前に、Codex custom-agent lookup statement と、読み取り権限を付与しない `codex.behavior.user.agents` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T512 [US1] Codex custom-agent candidate record だけを追加し、exclusion ID を定義せずに nested、configured、User、managed location を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T513 [US1] Codex custom-agent evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T514 [US1] Codex agent matching とclosedなallowlist済みrecognition を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T515 [US1] Codex custom-agent kind と project-layer provenance に対する inventory row を `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T516 [US1] 意味的に同等な英語・日本語の Codex custom-agent inventory および exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 50: Codex Custom Agents 詳細

**目的**: 完成済みの Codex MCP carrier を agent の MCP owner とするのではなく relationship source として再利用しながら、完全で非活性な Codex custom-agent source、spawned-session configuration、inheritance、relationship、condition detail を追加します。

**独立テスト**: hostile および malformed な Codex agent を開き、execution environmentのcapacityだけに従うinert TOML parsing、model/reasoning/sandbox/skill、parent inheritance、再適用された live sandbox/approval fact、MCP carrier inheritance/origin relationship、agent-owned MCP recognition がないこと、config-path relationship、正確な authored literal、diagnostics、detail-state cleanup、zero connection を検証します。

**目に見えるチェックポイント**: Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で非活性な spawned-session detail と carrier-inheritance relationship が表示されます。

### テスト先行

- [ ] T517 [P] [US2] Codex agent field、決定的かつentry-localでcapacityに起因しないrecognition-atomic extraction failureとなるmalformed input、Inspector-defined numeric capを持たないenvironment-owned parser capacity、およびparser、extraction、recognition、item、record、response、contracted-partial resultを返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するinert TOML parsingの失敗テストを`tests/unit/inspection/parsers.test.ts`に追加する
- [ ] T518 [P] [US2] model、reasoning、sandbox、skill、agent-owned MCP recognition を持たない closed MCP carrier-origin relationship、config-path relationship、parent inheritance、live sandbox/approval reapplication に関する Codex agent の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T519 [P] [US2] Codex agent declaration が tool の実行、process の spawn、MCP への接続、参照 config path の読み取りを行わないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T520 [US2] relationship-only の carrier inheritance、agent-owned MCP recognition がないこと、reciprocal contract reference に関する Codex custom-agent runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T521 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex custom-agent detail、agent-owned MCP row を持たない carrier-linked MCP inheritance relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T522 [US2] 既存のinert TOML carrier parser を Codex agent normalization と extraction で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T523 [US2] 既存の Codex config/MCP strategy を relationship-only の agent inheritance、spawned-session context、selection、sandbox/approval、agent-owned MCP recognition の明示的な禁止で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T524 [US2] Codex agent metadata、applicability、正確な literal carrier-linked MCP inheritance/origin relationship、agent-owned MCP recognition ゼロ、connection ゼロ、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T525 [US2] typed Codex custom-agent detail と uncertainty を `app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T526 [US2] 意味的に同等な英語・日本語の Codex custom-agent detail、inheritance、relationship、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 51: Claude Custom Agents inventory

**目的**: agent-memory directory を candidate として admission せず、可能な project layer に recursive Claude subagent file を追加します。

**独立テスト**: 対応する `.claude/agents/**/*.md` file、duplicate name、layer uncertainty、nested path、link、malformed content、`--add-dir` runtime fact、除外された agent-memory/User location を inventory 化します。

**目に見えるチェックポイント**: layer provenance と duplicate-name uncertainty を持つ Claude custom agent を filter できます。

### fixture とテストを先行

- [ ] T527 [US1] recursive path、layer、duplicate name、malformed metadata、secret、reference、memory declaration、link、alias、`--add-dir` fact、除外された memory/User location に対する Claude subagent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T528 [US1] フェーズ 25 で所有済みの Claude Repository agent behavior を再利用し、duplicate behavior または exclusion ID を作成せず、残りの agent/User-memory behavior、matcher、path-negative case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T529 [P] [US1] recursive Claude agent directory、可能な layer root、duplicate name、agent-memory または任意の `--add-dir` candidate なしに関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T530 [US1] Claude custom-agent row、filter、layer、exclusion、diagnostics、維持される Codex agent に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T531 [US1] フェーズ 25 で所有済みの `claude.behavior.repo.agents` と `claude.behavior.user.mcp-state` を再利用し、agent context と relationship strategy が参照する前に `claude.behavior.user.agents`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory` だけを `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T532 [US1] `claude.repo.agent` candidate record だけを追加し、exclusion ID を定義せずに memory、User、additional-directory location を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T533 [US1] Claude custom-agent evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T534 [US1] Claude agent matching とclosedなallowlist済みrecognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T535 [US1] memory または任意の additional directory を読み取らず、Claude agent classification を `src/inspection/scan.ts` に統合する
- [ ] T536 [US1] Claude agent の inventory row と、意味的に同等な英語・日本語の agent、layer、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 52: Claude Custom Agents 詳細

**目的**: 完全で非活性な Claude subagent context detail を追加し、フェーズ 27 で完成した owner-gated MCP adapter を有効化し、memory と Hook target は inert のままにします。

**独立テスト**: hostile および malformed な Claude agent を開き、fresh/fork context、tool、skill、memory-scope fact、nested-spawn limit、duplicate-name uncertainty、agent reference、owner-attached MCP metadata、正確な authored-literal preservation、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude custom agent を選択すると、memory を読み取ったり MCP に接続したりせず、完全で非活性な context と relationship detail が表示されます。

### テスト先行

- [ ] T537 [P] [US2] context mode、tool、skill、closed MCP/Hook origin、memory scope、nested spawning、duplicate-name uncertainty、built-in omission、agent reference に関する Claude agent の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T538 [P] [US2] 独立して admission された skill/agent、除外された memory root、runtime-only input、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T539 [P] [US2] tool、skill、Hook、MCP、memory、command、link、agent reference に対する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T540 [US2] reciprocal contract reference を持つ Claude agent context-composition とフェーズ 27 MCP owner-adapter activation の失敗 coverage test を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T541 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude custom-agent detail、context、tool、owner-attached MCP、relationship、diagnostics、zero connection、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T542 [US2] Claude agent selection、fresh/fork context、tool、skill-preload、memory-fact、nested-spawn、relationship strategy を追加し、既存 MCP adapter を現在所有済みの agent behavior に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T543 [US2] closedなallowlist済みagent metadata、owner-gated contained MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T544 [US2] Claude agent metadata、正確な authored-literal preservation、synthetic file または connection を作成しない owner-attached MCP、relationship-only の memory/Hook target、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T545 [US2] typed detail と、意味的に同等な英語・日本語の Claude agent context、memory、relationship、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 53: Copilot Custom Agents inventory

**目的**: 別々の VS Code、CLI、Cloud provenance を持つ、対応する Copilot `.github/agents/*.md` と `.claude/agents/*.md` candidate を追加します。

**独立テスト**: 可能な context の direct-child agent、filename variant、duplicate name、shared Claude file、near miss、runtime-only fact としての hosted organization agent、exclusion としての configured/User location を inventory 化します。

**目に見えるチェックポイント**: surface-qualified provenance を持つ Copilot custom agent を filter できます。

### fixture とテストを先行

- [ ] T546 [US1] 両方の directory、direct-child boundary、Cloud filename variant、duplicate name、shared Claude file、malformed metadata、secret、handoff、configured/User path、hosted organization fact に対する Copilot agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T547 [US1] フェーズ 30 で所有済みの Copilot VS Code agent behavior を再利用し、duplicate behavior または無関係な exclusion ID を作成せず、origin fileを持たない正確な `copilot.behavior.cloud.organization-agents` を含む残りの CLI/Cloud agent behavior、matcher、path-negative configured/User/hosted case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T548 [P] [US1] 両方の Copilot agent directory、direct-child depth、surface provenance、hosted/runtime-only fact、configured-root rejection、shared Claude file に関する matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T549 [US1] Copilot custom-agent row、surface badge、filter、exclusion、diagnostics、維持される Codex/Claude agent に関するブラウザー受け入れテストを `tests/e2e/copilot-custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T550 [US1] フェーズ 30 で所有済みの `copilot.behavior.vscode.agents` を再利用し、local/Cloud selection と managed/remote exclusion が参照する前に、残りの surface-qualified local-agent fact、`copilot.behavior.vscode.user.agents`、`copilot.behavior.cli.user.agents`、origin fileを持たない `copilot.behavior.cloud.organization-agents` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T551 [US1] `copilot.repo.agent` candidate だけを追加し、無関係な exclusion ID を定義または参照せず、configured/User/hosted location を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T552 [US1] `copilot.behavior.cloud.organization-agents` の existing-source backlink を含む、Copilot custom-agent evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T553 [US1] Copilot agent matching と surface-qualified recognition を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T554 [US1] Copilot agent classification と一度だけ読み取る shared physical-file assembly を `src/inspection/scan.ts` に統合する
- [ ] T555 [US1] Copilot agent の inventory row と、意味的に同等な英語・日本語の agent、surface、shared-file、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 54: Copilot Custom Agents 詳細

**目的**: 完全で inert な Copilot agent detail を追加し、フェーズ 32 の owner-gated MCP adapter を有効化し、VS Code/CLI/Cloud の context difference を維持して、Hook-family semantics だけを延期します。

**独立テスト**: hostile および malformed な Copilot agent を開き、body、tool、model、invocation、handoff、instruction、skill、closed Hook origin、owner-attached MCP、surface selection、exact authored-literal preservation、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。

### テスト先行

- [ ] T556 [P] [US2] VS Code/CLI/Cloud body、tool、model、handoff、instruction、skill、closed Hook origin、フェーズ 32 MCP adapter activation、surface selection に関する Copilot agent の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T557 [P] [US2] handoff、link、skill preload、instruction、runtime-only organization agent、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T558 [P] [US2] Copilot agent declaration が tool、handoff、Hook、MCP、link、参照 file を invoke しないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T559 [US2] reciprocal contract reference を持つ Copilot agent context-composition と owner-gated MCP activation graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T560 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot custom-agent detail、surface context、owner-attached MCP、relationship、diagnostics、connection がゼロであること、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T561 [US2] 別々の Copilot VS Code、CLI、Cloud agent selection、context、handoff、tool、relationship strategy を追加し、フェーズ 32 MCP adapter を受け入れ済み agent owner に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T562 [US2] closedなallowlist済みagent metadata、owner-gated MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T563 [US2] Copilot agent metadata、exact authored-literal preservation、synthetic file も connection も作成しない owner-attached MCP、relationship-only Hook target、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T564 [US2] typed detail と、意味的に同等な英語・日本語の Copilot agent context、handoff、surface、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 55: 統合 Custom Agents inventory

**目的**: すべての custom-agent candidate を統合し、共有 Claude/Copilot file を一度だけ読み取り、フェーズ 52 と 54 で有効化した owner-attached MCP adapter を回帰し、Codex carrier inheritance は relationship-only のまま維持します。

**独立テスト**: all-vendor agent fixture を使用し、共有 `.claude/agents/*.md` に対する一つの物理 row/read、同じ owner ID 上の別々の Claude/Copilot agent recognition と MCP recognition、Codex agent-owned MCP recognition を作成しない Codex carrier inheritance relationship、決定論的な provenance、synthetic MCP file または connection がないこと、filter、duplicate-name uncertainty、exclusion、injected throw/rejection、rescan cleanup を検証します。

**目に見えるチェックポイント**: 完全な custom-agent inventory、共有 Claude/Copilot interpretation と owner-attached MCP fact、および duplicate file や誤った MCP ownership を伴わない Codex carrier-inheritance relationship を理解できます。

### テスト先行

- [ ] T565 [US1] 対応するすべての path、layer、duplicate name、shared Claude/Copilot file、Claude/Copilot owner-attached MCP declaration、Codex carrier-inheritance relationship、malformed metadata、secret field、reference、exclusion、alias、injected throw/rejection に対する all-vendor custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T566 [US1] custom-agent behavior、matcher、Claude/Copilot owner-gated MCP composition、Codex relationship-only carrier inheritance、exclusion ID を持たない path-negative configured/User/hosted case、evidence conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T567 [US1] agent-owned MCP recognition を持たない Codex TOML、Claude recursive Markdown、Copilot directory、一つの owner ID 上に agent と MCP の recognition を持つ shared Claude/Copilot file、traversal uncertainty、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T568 [P] [US1] 一度だけ読み取るshared agent、決定論的なClaude/Copilot agent/MCP recognitionとprovenance order、Codex relationship-only carrier inheritance、alias、分離されたdeterministicなentry-local non-capacity由来のthrow/rejection、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected throw/rejection、synthetic file/connectionゼロ、relationship-target readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T569 [US1] 統合 custom-agent inventory、filter、共有 Claude/Copilot owner-attached MCP recognition、agent-owned MCP row を持たない Codex carrier-inheritance relationship、duplicate uncertainty、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T570 [US1] custom agent に対する決定論的な physical-file assembly、Claude/Copilot agent/MCP recognition、Codex relationship-only carrier inheritance、provenance、exclusion、no-synthetic-file behavior を `src/inspection/scan.ts` で完成させる
- [ ] T571 [US1] すべての custom-agent kind、shared recognition、provenance、duplicate-name uncertainty に対する inventory row を `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T572 [US1] 意味的に同等な英語・日本語の unified custom-agent inventory および shared-recognition message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 56: Custom Agents 比較

**目的**: comparison を literal および typed な custom-agent difference へ拡張します。

**独立テスト**: Readableなcurrent-generation custom-agent fileを正確に2つ比較し、完全なliteral sourceと、整列したcontext、tool、該当する場合のClaude/Copilot owner-attached MCPまたはCodex carrier-inheritance relationship、provenance、relationship、condition differenceを検証する。

**目に見えるチェックポイント**: custom-agent definition を実行または ranking せずに比較できます。

### テスト先行

- [ ] T573 [US3] `(tool, kind, fieldId, occurrence)` の authored literal、context、tool、Claude/Copilot owner-attached MCP、Codex carrier relationship、provenance、condition に関する失敗する custom-agent comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T574 [US3] sensitive-content acknowledgement、credential/environment-reference の差を含む完全なリテラルの custom-agent diff、正確な metadata row、masking/reveal も environment substitution もないこと、vendor ごとに正しい typed MCP ownership/relationship に関する browser acceptance を `tests/e2e/custom-agents-comparison.spec.ts` に追加する

### 実装

- [ ] T575 [US3] custom-agent comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう拡張し、Claude/Copilot owner-attached MCP と Codex relationship-only inheritance を `app/components/comparison/RecognitionComparison.vue` で明確に区別したままにする
- [ ] T576 [US3] 意味的に同等な英語・日本語の custom-agent comparison message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 57: Codex Configuration recognition

**目的**: 二つ目の candidate、behavior record、evidence record、file read を追加せず、`settings/config` recognition と inventory presentation を、フェーズ 23 で受け入れ済みの `.codex/config.toml` carrier に追加します。

**独立テスト**: direct/near-miss path、link、malformed filename、trust-conditional provenance を備えた root/descendant carrier を再利用します。同じ physical ID/read が既存 MCP と新しい `settings/config` recognition の両方を持ち、configured instruction fallback は変わらず、higher-scope path は新しい Repository exclusion ID なしに negative のままであることを検証します。

**目に見えるチェックポイント**: MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。

### fixture とテストを先行

- [ ] T577 [US1] 既存 Codex carrier fixture を、一般 configuration field、layer variant、near miss、link、alias、malformed file、secret、inline declaration、path-negative higher-scope case で `tests/fixtures/repositories/build-fixtures.ts` において拡張する
- [ ] T578 [US1] 新しい `settings/config` recognition と trust-condition row を、すでに所有済みの `codex.repo.config` candidate、config behavior、正確な evidence record を再利用して `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T579 [P] [US1] フェーズ 23 が `codex.repo.config` と `./**/.codex/config.toml` の唯一の owner のままであり、duplicate candidate が追加されず、higher-scope location は発明した exclusion なしに path-negative のままであることを証明する registry/matcher の失敗回帰テストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T580 [P] [US1] 新しい `settings/config` kind、layer provenance、trust uncertainty、既存 MCP recognition/fallback provenance との共存、premature Hook recognition がないことに関する Codex configuration recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T581 [US1] 既存 Codex carrier 上の決定論的な recognition augmentation、一度の verified read、維持される MCP/fallback identity、isolated failure、hard-link alias、configured-target read ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T582 [US1] Codex configuration row、filter、layer provenance、既存 MCP/fallback badge、exclusion、diagnostics、一つの physical carrier row に関するブラウザー受け入れテストを `tests/e2e/codex-config-inventory.spec.ts` に追加する

### 実装

- [ ] T583 [US1] フェーズ 15 で所有済みの Codex project/User configuration behavior statement を再利用し、duplicate behavior ID を `shared/registries/vendor-behaviors.ts` に追加しない
- [ ] T584 [US1] フェーズ 23 で所有済みの `codex.repo.config` candidate を再利用して rule ID を追加せず、`codex.excluded.user-runtime` は consent-gated Global phase まで延期する処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T585 [US1] source ID を作成せず、既存 Codex configuration evidence record の reciprocal presentation coverage を再利用し、`shared/registries/official-sources.ts` で拡張する
- [ ] T586 [US1] configured target を parse したり MCP/fallback recognition を変更したりせず、既存 carrier matcher に path-derived `settings/config` recognition を `src/inspection/recognizers/codex.ts` で追加する
- [ ] T587 [US1] 先行する skill、instruction、MCP result を維持しながら、read-once Codex carrier 上の決定論的な recognition augmentation を `src/inspection/scan.ts` に統合する
- [ ] T588 [US1] Codex configuration の inventory filter、row、意味的に同等な英語・日本語 message を `app/components/inventory/InventoryFilters.vue`、`app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 58: Codex Configuration 詳細

**目的**: フェーズ 23～24 の最小 inert TOML carrier を、残りの inert Codex configuration field とその `settings/config` detail で拡張します。Configured instruction fallback と MCP detail はすでに有効です。

**独立テスト**: malformed および secret-bearing な project config layer を開き、既存 atomic TOML parse の拡張、root から `cwd` への precedence、closest-value behavior、trust、relative base、すでに有効な fallback/MCP field、残りの inert declaration、exact authored-literal preservation、diagnostics、2 度目の read/derivation を伴わない detail-state cleanup を検証します。

**目に見えるチェックポイント**: `.codex/config.toml` を選択すると、宣言された target を読み取らず、完全で inert な typed configuration と fallback declaration が表示されます。

### テスト先行

- [ ] T589 [US2] Array/table、relative-path base、deterministic returned malformed recognition-atomic extraction、Inspector numeric capなしのenvironment-owned parser capacityに関するfailing inert TOML testを`tests/unit/inspection/parsers.test.ts`へ追加する。NUL-containing byteはdiagnostic-only `binary`のまま、全non-NUL inputはreadable `utf-8`/`utf-8-bom`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial statusにせずTOML parsing/display/comparisonまで伝播することを要求する。Decoder/parser/extractorの全throw/rejectionはdomain catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる
- [ ] T590 [P] [US2] Root から `cwd` への layer、closest-value behavior、trust、vendor/runtime と execution environment の capacity だけに従う設定済みの全 literal fallback basename、declaration、除外された higher scope、parser、extraction、config declaration、metadata、recognition、derived、item、scan-result record/response、contracted-partial outputを一切返さず、attempt全体のabortへ変更なしのthrow/rejectionを伝播し、以前のcommit済みsnapshotだけを維持するdomain layerでcatch/classify/retryしないthrow/rejectionに関するCodex configの失敗テストを`tests/unit/inspection/codex-metadata.test.ts`に追加する
- [ ] T591 [P] [US2] fallback name、agent config path、model-instruction path、compact-prompt path、skill path、Hook field、MCP field が target read または activation を一切認可しないことを証明する relationship と safety の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T592 [P] [US2] 既存 precedence、trust、relative base、active instruction/MCP projection の拡張と、依然として延期される Hook projection に関する Codex configuration strategy/registry-graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T593 [P] [US2] 完全なリテラルの TOML value、strict/stale ID、no-store behavior、diagnostics、exact metadata に関する、失敗する file-detail/removed-reveal-route contract を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T594 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex configuration detail、precedence、trust、fallback declaration、inert relationship、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-config-detail.spec.ts` に追加する

### 実装

- [ ] T595 [US2] 既存のinert TOML carrier extraction を、closed fallback/MCP extraction を維持したまま、残りの Codex project-configuration field と relative-base metadata で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T596 [US2] 既存の `codex.config.precedence` strategy を general configuration value、trust、closest-value、relative-base、依然として不活性な Hook declaration で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T597 [US2] closedなallowlist済みconfig field、fallback-name metadata、relationship、applicability、diagnostics、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T598 [US2] extended atomic TOML parse、exact authored-literal extraction、relationship-only target、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を統合し、すでに導出済みの fallback file と既存 MCP recognition を rederivation や 2 度目の read なしに `src/inspection/scan.ts` で維持する
- [ ] T599 [US2] layer、trust、fallback declaration、condition、inert relationship に対する typed configuration detail を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T600 [US2] 意味的に同等な英語・日本語の Codex configuration detail、trust、fallback、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 59: Claude Settings inventory

**目的**: parent または descendant candidate を継承せず、exact-launch の二つの Claude settings file を追加します。

**独立テスト**: root の `.claude/settings.json` と `.claude/settings.local.json` だけを inventory 化し、nested/parent-like near miss と standalone Hook/workflow file を拒否し、Codex configuration result を維持します。

**目に見えるチェックポイント**: exact-launch Claude settings file と、その project/local layer を識別できます。

### fixture とテストを先行

- [ ] T601 [US1] exact file の両方、parent/descendant near miss、link、alias、malformed JSONC、secret、contained declaration、workflow、path-negative User/managed state に対する Claude settings fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T602 [US1] `claude.repo.settings` Repository candidate だけを、その behavior、evidence、exact-launch row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T603 [P] [US1] 正確な root `.claude/settings.json` と `.claude/settings.local.json`、ancestor/descendant matching なし、standalone Claude Hook・prompt・workflow・agent-memory candidate なしに関する matcher の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T604 [P] [US1] tool、`settings/config` kind、project/local layer、正確な provenance、およびフェーズ 60 で execution environment の capacity だけに従う inert settings parsing が追加されるまではフェーズ 27 MCP adapter が dormant のままであり、Hook recognition も存在しないことに関する Claude settings recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T605 [US1] Claude settings row、正確な layer、exclusion、filter、diagnostics、維持される Codex configuration に関するブラウザー受け入れテストを `tests/e2e/claude-settings-inventory.spec.ts` に追加する

### 実装

- [ ] T606 [US1] settings および後続の composition strategy が参照する前に、Claude exact-launch settings lookup statement と、読み取り権限を付与しない `claude.behavior.user.settings` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T607 [US1] Repository candidate `claude.repo.settings` だけを追加し、未対応 standalone file は path-negative test で扱い、`claude.excluded.user-runtime` は consent-gated Global phase まで延期する処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T608 [US1] Claude settings evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T609 [US1] exact-launch Claude settings matching と path-derived recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T610 [US1] Repository boundary を拡大せず、Codex result も変更せずに Claude settings classification を `src/inspection/scan.ts` に統合する
- [ ] T611 [US1] Claude settings の inventory row と、意味的に同等な英語・日本語の settings、layer、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 60: Claude Settings 詳細

**目的**: Claude settings の environment-owned capacity の inert JSONC detail を追加し、受け入れ済み file 上でフェーズ 27 の owner-gated MCP adapter を有効化し、Hook-family semantics は引き続き延期します。

**独立テスト**: malformed および secret-bearing な settings を開き、atomic JSONC parsing、正確な project/local precedence、selected-component declaration、owner-attached MCP metadata、surface condition、exact authored-literal extraction、inert relationship、zero connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、完全で inert な layer-aware detail と owner-attached MCP が表示されます。

### テスト先行

- [ ] T612 [US2] Comment、known field、deterministic returned malformed recognition-atomic extraction、Inspector numeric capなしのenvironment-owned parser capacityに関するfailing inert JSONC testを`tests/unit/inspection/parsers.test.ts`へ追加する。NUL-containing byteはdiagnostic-only `binary`のまま、全non-NUL inputはreadable `utf-8`/`utf-8-bom`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial statusにせずJSONC parsing/display/comparisonまで伝播することを要求する。Decoder/parser/extractorの全throw/rejectionはdomain catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる
- [ ] T613 [P] [US2] 正確な launch-root scope、parent/descendant matching なし、project/local precedence、selected component、closed declaration origin、surface availability に関する Claude settings の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T614 [P] [US2] settings で選択された agent、plugin、Hook、MCP、command、path、workflow、reference が inert かつ non-following のままであることを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T615 [US2] reciprocal contract reference、フェーズ 27 MCP adapter activation、Hook semantics だけの延期を持つ Claude settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T616 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude settings detail、layer precedence、selected-component declaration、owner-attached MCP、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-settings-detail.spec.ts` に追加する

### 実装

- [ ] T617 [US2] 既存のinert JSONC mode を allowlist 対象 Claude settings field と closed declaration origin で `src/inspection/parsers/json.ts` において拡張する
- [ ] T618 [US2] Claude settings precedence、selection、surface、relationship strategy を追加し、既存 MCP adapter を現在所有済みの settings behavior に関連付け、Hook composition は `shared/registries/runtime-composition.ts` で延期したままにする
- [ ] T619 [US2] closedなallowlist済みsettings metadata、owner-gated contained MCP、applicability、relationship-only target、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T620 [US2] Claude JSONC parsing、exact authored-literal extraction、synthetic file も connection も作成しない owner-attached MCP、inert Hook declaration、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T621 [US2] typed settings detail と、意味的に同等な英語・日本語の Claude precedence、selection、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 61: Copilot Settings inventory

**目的**: general `.vscode/settings.json` と configured root の明示的な除外を維持しながら、対応する Copilot settings file を追加します。

**独立テスト**: root の `.github/copilot/settings.json`、`.github/copilot/settings.local.json`、対応する Claude-compatible settings file を inventory 化します。general `.vscode/settings.json`、nested/configured path、User state、CLI LSP、無関係な file を拒否し、CLI extension exclusion の ownership はフェーズ 80 まで延期します。

**目に見えるチェックポイント**: 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate と surface provenance を識別できます。

### fixture とテストを先行

- [ ] T622 [US1] 対応する GitHub/Claude-compatible file、shared physical file、malformed JSONC、secret、plugin recommendation、contained Hook、configured-root attempt、`.vscode/settings.json`、`.github/lsp.json`、path-negative User state に対する Copilot settings fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T623 [US1] `copilot.repo.settings`、読み取り権限を付与しない `copilot.behavior.vscode.settings` と `copilot.behavior.cli.lsp`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp` を、その正確な affected-behavior reference、evidence、surface row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T624 [P] [US1] 正確な対応 Copilot settings selector、`copilot.excluded.vscode-settings` → `copilot.behavior.vscode.settings`、`copilot.excluded.cli-lsp` → `copilot.behavior.cli.lsp`、path-negative nested/User/hosted location、フェーズ 80 より前の CLI-extension policy なしに関する matcher と registry の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T625 [P] [US1] Copilot `settings/config` kind、surface provenance、shared Claude-compatible file、premature Hook/Plugin/MCP recognition がないことに関する recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T626 [US1] Copilot settings row、filter、shared-file badge、exclusion、diagnostics、維持される Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-settings-inventory.spec.ts` に追加する

### 実装

- [ ] T627 [US1] settings strategy と正確な exclusion reference が read authority なしで解決されるよう、surface-qualified Copilot settings lookup と、読み取り権限を付与しない `copilot.behavior.vscode.settings`、`copilot.behavior.cli.lsp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.lsp` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T628 [US1] `copilot.repo.settings` を追加し、正確に `copilot.excluded.vscode-settings` と `copilot.excluded.cli-lsp` を own する。settings configured root は path-negative のままにし、フェーズ 19 で所有済みの instruction/skill `copilot.excluded.extra-directories` rule を再利用し、CLI extension はフェーズ 80、`copilot.excluded.user-runtime` はフェーズ 98 まで延期する処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T629 [US1] Copilot settings evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T630 [US1] Copilot settings matching と path-derived surface recognition を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T631 [US1] Copilot settings classification と一度だけ読み取る physical-file assembly を `src/inspection/scan.ts` に統合する
- [ ] T632 [US1] Copilot settings の inventory row と、意味的に同等な英語・日本語の settings、surface、shared-file、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 62: Copilot Settings 詳細

**目的**: surface-specific precedenceとclosedなallowlist済みinert declaration metadataを持つ、完全で非活性なCopilot settings detailを追加します。

**独立テスト**: malformed および literal credential を含む settings を開き、VS Code/CLI layer、enablement、recommendation、compatible Claude settings、configured-root read なし、environment-reference を解決しない exact authored literal、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot settings を選択すると、plugin の有効化や contained Hook の compose を行わず、完全で inert な surface-qualified detail が表示されます。

### テスト先行

- [ ] T633 [P] [US2] VS Code/CLI layer、enablement、フェーズ 20 で pending だった instruction applicability の再投影、plugin recommendation、closed contained-hook origin、compatible Claude settings、configured-root read なしに関する Copilot settings の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T634 [P] [US2] literal credential、未解決の environment-reference text、command、path、recommendation、duplicate occurrence、reference、relationship read authority がゼロであることに関する、失敗する exact-display/relationship test を `tests/unit/inspection/source-occurrences.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T635 [P] [US2] settings content が plugin の有効化、Hook の呼び出し、MCP への接続、URI の load、configured root の展開を行えないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T636 [US2] VS Code/CLI/Cloud distinction、フェーズ 20 instruction の再投影、deferred Plugin/Hook semantics、settings は MCP owner ではないという恒久ルールに関する Copilot settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T637 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot settings detail、surface precedence、更新された instruction applicability、recommendation、inert declaration、settings-owned MCP row がないこと、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-settings-detail.spec.ts` に追加する

### 実装

- [ ] T638 [US2] execution environment の capacity だけに従う inert JSONC extraction を allowlist 対象 Copilot settings field、recommendation identifier、closed declaration origin で拡張する処理を `src/inspection/parsers/json.ts` に実装する
- [ ] T639 [US2] surface-qualified Copilot settings precedence、enablement、recommendation、relationship strategy を追加し、以前 pending だった instruction applicability を再投影し、後続 Plugin/Hook family は `shared/registries/runtime-composition.ts` で inert のままにする
- [ ] T640 [US2] closedなallowlist済みsettings metadata、applicability、instruction re-projection fact、relationship-only target、恒久的な MCP non-ownership、diagnostics、正確な evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T641 [US2] Copilot settings parsing、exact authored-literal extraction、instruction re-projection、inert declaration、permanent MCP non-ownership、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T642 [US2] typed settings detail と、意味的に同等な英語・日本語の Copilot precedence、recommendation、surface、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 63: 統合 Settings/Configuration inventory

**目的**: Codex configuration、Claude settings、Copilot settings を、一度だけ読み取る shared-file recognition と正確な MCP ownership matrix とともに統合します。

**独立テスト**: all-vendor settings fixtureを使用し、共有`.claude/settings*.json`に対する一つの物理row/read、別々のClaude/Copilot settings recognition、同じshared owner ID上のClaude-only owner-attached MCP、恒久的なCopilot MCP non-ownership、維持されるCodex carrier MCP/fallback、決定論的なprovenance、filter、exclusion、決定的かつentry-localでcapacityに起因しないfailureのcontracted-partial continuity、rescan cleanupを検証する。

**目に見えるチェックポイント**: 完全な settings/configuration inventory をフィルタリングでき、Claude settings-owned MCP、Copilot non-ownership、既存 Codex carrier を区別できます。

### テスト先行

- [ ] T643 [US1] Codex project layer、owner-attached MCP を持つ Claude exact-launch settings、MCP non-ownership を持つ Copilot variant、shared file、malformed structure、secret、inert declaration、除外された configured root に対する all-vendor settings/config fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T644 [US1] settings/config behavior、三つの candidate matcher、既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp`、path-negative case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T645 [US1] 既存 MCP/fallback を持つ Codex layer、MCP ownership を持つ正確な Claude settings、MCP non-ownership を持つ対応 Copilot settings、shared file、明示的な exclusion に対する完全な matcher と recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T646 [P] [US1] 一度だけ読み取るshared settings、決定論的なsettings/MCP recognitionとprovenance order、hard-link alias、分離されたdeterministicなentry-local non-capacity由来のthrow/rejection、attemptをabortしてitem、recognition、derived result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected throw/rejection、synthetic MCP file/connectionゼロ、configured-target accessなしに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T647 [P] [US1] settings/configuration row 全体の source/tool/kind/path filter、shared recognition badge、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T648 [US1] 統合 settings/config inventory、filter、shared-file recognition、正確な MCP ownership/non-ownership badge、維持される Codex carrier fact、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/settings-config-inventory.spec.ts` に追加する

### 実装

- [ ] T649 [US1] 三つの tool すべてに対し、read authority を持たない settings/config lookup statement を `shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T650 [US1] configured-path promotion や新しい exclusion ID を導入せず、三つの settings/config candidate record と既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp` reference を `shared/registries/inspection-rules.ts` で完成させる
- [ ] T651 [US1] settings/config evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` で完成させる
- [ ] T652 [US1] settings/configuration に対する一度だけ読み取る shared-file assembly、決定論的な settings/MCP recognition order、正確な ownership/non-ownership、維持される Codex carrier fact、atomic continuity を `src/inspection/scan.ts` で完成させる
- [ ] T653 [US1] 統合 settings/config inventory の filter、row、shared badge、意味的に同等な layer/exclusion message を `app/components/inventory/InventoryFilters.vue`、`app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 64: Settings/Configuration 比較

**目的**: comparison を literal および typed な settings/configuration difference へ拡張します。

**独立テスト**: current-generation で読み取り可能な settings/config file を 2 つ比較し、完全なリテラルの source と、整列した value、layer、precedence、trust、enablement、MCP ownership、provenance、condition、fallback declaration、recommendation、stale cleanup を検証します。

**目に見えるチェックポイント**: value を適用したり declaration を昇格させたりせず、settings/configuration を比較できます。

### テスト先行

- [ ] T654 [US3] displayed semantic value ではなく `(tool, kind, fieldId, occurrence)` の authored literal、layer provenance、precedence、trust、fallback declaration、recommendation、condition、owner-attached MCP を比較しつつ Copilot non-ownership を保持する、失敗する settings/config comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T655 [US3] sensitive-content acknowledgement、credential/environment-reference の差を含む完全なリテラルの settings/config diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed layer/MCP state、accessibility、fallback、Copilot non-ownership、cleanup に関する browser acceptance を `tests/e2e/settings-config-comparison.spec.ts` に追加する

### 実装

- [ ] T656 [US3] settings/config comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう拡張し、internal typed state と owner-attached MCP を分離し、value を適用せず Copilot ownership を発明しない処理を `app/components/comparison/RecognitionComparison.vue` に実装する
- [ ] T657 [US3] 意味的に同等な英語・日本語の settings/configuration comparison message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 65: Claude Output Styles のインベントリ

**目的**: 対応する Claude output-style ファイルをインベントリに追加する。

**独立テスト**: 文書化された layer の direct output-style child をインベントリに含め、nested near miss を除外する。

**目に見えるチェックポイント**: ユーザーは layer provenance を備えた対応 Claude output style をフィルタリングできる。

### fixture とテストを先に

- [ ] T658 [US1] direct child、nested near miss、duplicate name、不正な metadata、secret、selection variant を対象とする Claude output-style fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T659 [US1] output-style row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T660 [US1] direct-child output style、nested exclusion、文書化された layer boundary に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T661 [US1] Claude output-style inventory と exclusion に関するブラウザー受け入れテストを `tests/e2e/output-styles-inventory.spec.ts` に追加する

### 実装

- [ ] T662 [US1] output-style selection が参照する前に、Claude output-style lookup statement と読み取り権限を付与しない `claude.behavior.user.output-style` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T663 [US1] exclusion ID を定義せず、nested/User/configured location を path-negative のままにして、`claude.repo.output-style` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T664 [US1] output-style evidence record と affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T665 [US1] Claude output-style matching と recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T666 [US1] output-style inventory row と、意味的に同等な layer/exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 66: Claude Output Styles の詳細

**目的**: 完全なリテラルの output-style source、layer、selection、surface availability、applicability detail を追加する。

**独立テスト**: hostile な style を開き、exact authored-literal preservation、closest-layer と selection condition、surface uncertainty、inert reference、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: output style を選択すると、style を適用せず、完全で inert な detail が開く。

### テストを先に

- [ ] T667 [P] [US2] closest-layer behavior、明示的な selection、surface availability、不確実性、evidence に関する失敗する metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T668 [P] [US2] output-style Markdown と reference が非活性かつ非 navigable のままであることを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T669 [US2] reciprocal contract reference を備えた、失敗する output-style runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T670 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの output-style detail、selection condition に関する browser acceptance を `tests/e2e/output-styles-detail.spec.ts` に追加する

### 実装

- [ ] T671 [US2] output-style layer、selection、applicability strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T672 [US2] output-style metadata、applicability、exact authored-literal preservation のために Markdown extraction と scan integration を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T673 [US2] 型付き output-style 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T674 [US2] 意味的に同等な英語/日本語の output-style 詳細、selection、surface、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 67: Claude Output Styles の比較

**目的**: literal および型付きの output-style 差分を比較に追加する。

**独立テスト**: Readableなcurrent-generation output-style fileを正確に2つ比較し、完全なliteral sourceと、整列したlayer、selection、surface availability、provenance、metadataを検証する。

**目に見えるチェックポイント**: どちらの style も適用せずに Claude output style を比較できる。

### テストを先に

- [ ] T675 [US3] `(tool, kind, fieldId, occurrence)` の authored literal、layer、selection、surface availability、provenance、typed metadata に関する失敗する output-style comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T676 [US3] sensitive-content acknowledgement、credential/environment-reference の差を含む完全なリテラルの output-style diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed difference に関する browser acceptance を `tests/e2e/output-styles-comparison.spec.ts` に追加する

### 実装

- [ ] T677 [US3] output-style comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう拡張し、typed selection/applicability state は `app/components/comparison/RecognitionComparison.vue` で分離したままにする
- [ ] T678 [US3] 意味的に同等な英語/日本語の output-style comparison メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 68: Codex Marketplaces のインベントリ

**目的**: 二つの正確な Repository-root location に authored Codex marketplace catalog を追加する。

**独立テスト**: `.agents/plugins/marketplace.json` と legacy-compatible な `.claude-plugin/marketplace.json` をインベントリに含め、descendant、installed/cache path、remote state、link、alias、near miss を拒否し、plugin manifest はまだ導出しない。

**目に見えるチェックポイント**: registration、installation、enablement を示唆せずに authored Codex marketplace catalog をフィルタリングできる。

### fixture とテストを先に

- [ ] T679 [US1] 両方の正確な root、local/remote source、不正な catalog、secret、missing plugin、descendant、link、alias、installed/cache path、near miss を対象とする Codex marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T680 [US1] marketplace exclusion ID を定義せず、Codex marketplace behavior、candidate、path-negative runtime-state case、activation condition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T681 [P] [US1] 両方の正確な Codex marketplace selector、descendant rejection、authored-state provenance、installed/cache/User exclusion に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T682 [US1] Codex marketplace row、filter、authored-state label、exclusion、診断、まだ derived plugin row がないことに関するブラウザー受け入れテストを `tests/e2e/codex-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T683 [US1] Codex marketplace lookup statement と読み取り権限を付与しない `codex.behavior.user.plugins` を、plugin activation と `codex.excluded.plugin-files` が参照する前に `shared/registries/vendor-behaviors.ts` へ追加する
- [ ] T684 [US1] marketplace exclusion ID を定義せず、installed、cache、User、remote location を path-negative のままにして、`codex.repo.marketplace` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T685 [US1] Codex marketplace evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T686 [US1] catalog parsing を行わず、exact-root Codex marketplace matching と path-derived recognition を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T687 [US1] plugin manifest を導出または読み取らず、Codex marketplace classification を `src/inspection/scan.ts` に統合する
- [ ] T688 [US1] inventory row と、意味的に同等な英語/日本語の Codex marketplace authored-state および exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 69: Codex Marketplaces の詳細

**目的**: 完全なリテラルの Codex catalog detail を追加し、次のフェーズ向けに local plugin-source declaration を安全に抽出する。

**独立テスト**: Malformed/secret-bearing/throwing/rejecting catalog を開き、atomic JSON parsing、local source form、remote/absolute/home/traversal rejection、independently admitted static seed ごとの complete deterministic validated target、relationship-only component、exact authored-literal preservation、diagnosticsを検証する。決定的かつentry-localでcapacityに起因しないmalformed failureはcomplete traversal後のcontracted-partial resultだけを生成できる。Throw/rejectionはwhole attemptをabortし、item、recognition、derived result、generation、record、responseを一切公開せず、prior committed snapshotだけを維持し、plugin-target readを0件とする。

**目に見えるチェックポイント**: Codex marketplace を選択すると、plugin manifest を開かずに、完全で inert な authored entry と local-source relationship が表示される。

### テストを先に

- [ ] T689 [P] [US2] 正確な `marketplace.plugin.source` occurrence の plain-string form と object `source.path` form、leading-`./` semantics、authored literal/range と internal semantic path、remote source relationship、registration/installation uncertainty、malformed overlap/round-trip failure、evidence に関する失敗する Codex marketplace test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T690 [P] [US2] Leading-`./` catalog-relative containment、declarationごと1 target、static seedごとのstable order、one-edge preparation、forbidden authority rejectionとauthored Relationship retentionのfailing testを追加する。Validation/derivation throw/rejectionはdomainでcatch/cause分類/retry/source plan/item/recognition/derived body/generation化せず変更なしにouter boundaryへ伝播しprior commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T691 [P] [US2] catalog inspection が plugin read、install、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T692 [US2] reciprocal contract reference を備えた、失敗する Codex marketplace activation/relationship graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T693 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex marketplace detail、local/remote source relationship、authored state、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T694 [US2] closed Codex catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T695 [US2] Codex marketplace の authored、registration、installation、activation、local-source、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T696 [US2] closed allowlist 内の occurrence-ordered catalog metadata、validated semantic local-source declaration、正確な authored relationship、applicability、diagnostics、evidence を備えるよう Codex recognition を `src/inspection/recognizers/codex.ts` で拡張する
- [ ] T697 [US2] Atomic catalog parsing、complete authored source、static seedごとの全distinct validated local target、relationship-only rejected/remote componentを`src/inspection/scan.ts`へ統合し、derived readはまだ行わない。Parse/validation throw/rejectionはdomainでcatch/classify/retry/source plan/item/recognition/result/generation化せず変更なしにouter boundaryへ伝播する
- [ ] T698 [US2] 型付き詳細と、意味的に同等な英語/日本語の Codex marketplace source、authored-state、activation-uncertainty メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 70: Claude Marketplaces のインベントリ

**目的**: marketplace root として意図的に扱う場所に、authored Claude `.claude-plugin/marketplace.json` catalog を追加する。

**独立テスト**: 正確な root catalog だけをインベントリに含め、任意の descendant、User/cache/registered-state path、link、alias、near miss を拒否し、共有物理ファイル上の Codex recognition を保持する。

**目に見えるチェックポイント**: presence を registration と誤認せずに authored Claude marketplace catalog を識別できる。

### fixture とテストを先に

- [ ] T699 [US1] exact root、共有 Codex file、local/remote source、不正な catalog、secret、descendant、link、alias、User/cache state、near miss を対象とする Claude marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T700 [US1] marketplace exclusion ID を定義せず、Claude marketplace behavior、candidate、path-negative runtime-state case、activation condition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T701 [P] [US1] 正確な Claude marketplace root、descendant rejection、explicit-registration uncertainty、User/cache candidate がないことに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T702 [US1] Claude marketplace row、filter、registration uncertainty、exclusion、診断、保持された Codex recognition に関するブラウザー受け入れテストを `tests/e2e/claude-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T703 [US1] marketplace/plugin activation が参照する前に、フェーズ 25 で所有済みの `claude.behavior.user.plugins` を再利用しながら、Claude marketplace lookup statement を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T704 [US1] marketplace exclusion ID を定義せず、User、cache、registration-state location を path-negative のままにして、`claude.repo.marketplace` candidate だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T705 [US1] Claude marketplace evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T706 [US1] catalog parsing を行わず、exact-root Claude marketplace matching と path-derived recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T707 [US1] Claude marketplace classification を統合し、共有物理ファイル identity を `src/inspection/scan.ts` で保持する
- [ ] T708 [US1] inventory row と、意味的に同等な英語/日本語の Claude marketplace registration および exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 71: Claude Marketplaces の詳細

**目的**: 完全なリテラルの Claude catalog detail を追加し、candidate はまだ導出せずに local plugin-source declaration を検証し、accepted marketplace file に対してフェーズ 27 MCP owner adapter を有効化する。

**独立テスト**: Malformed/secret-bearing/throwing/rejecting catalog を開き、optional/local source form、catalog-relative containment、remote relationship retention、independently admitted static seed ごとの complete deterministic validated target、owner-attached MCP declaration、registration/activation uncertainty、exact authored-literal preservation、diagnosticsを検証する。決定的かつentry-localでcapacityに起因しないmalformed failureはcomplete traversal後のcontracted-partial resultだけを生成できる。Throw/rejectionはwhole attemptをabortし、item、recognition、derived result、generation、record、responseを一切公開せず、prior committed snapshotだけを維持し、connectionとplugin-target readを0件とする。

**目に見えるチェックポイント**: Claude marketplace を選択すると、registration、activation、connection を主張せず、完全で inert な authored metadata、source relationship、owner-attached MCP が表示される。

### テストを先に

- [ ] T709 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、leading-`./` authored literal/range と internal semantic path、optional manifest、remote relationship、フェーズ 27 MCP adapter activation、registration uncertainty、malformed occurrence failure、evidence に関する失敗する Claude marketplace test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T710 [P] [US2] Claude catalogのleading-`./` containment、declarationごと1 target、static seedごとのstable order、forbidden derived authority rejectionとauthored Relationship retentionを検証する。Validation/derivation throw/rejectionはdomainでcatch/classify/retry/source plan/item/recognition/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T711 [P] [US2] Claude catalog inspection が registration、plugin read、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T712 [US2] reciprocal contract reference を備えた Claude marketplace activation/relationship graph coverage とフェーズ 27 MCP owner-adapter binding の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T713 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude marketplace detail、source relationship、owner-attached MCP、authored state、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T714 [US2] closed Claude catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T715 [US2] Claude marketplace の registration、activation、optional-manifest、local-source、relationship strategy を追加し、既存 MCP adapter を受け入れ済み marketplace behavior に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T716 [US2] closed allowlist 内の occurrence-ordered catalog metadata、validated semantic local-source declaration、正確な authored relationship、owner-gated MCP、applicability、diagnostics、evidence を備えるよう Claude recognition を `src/inspection/recognizers/claude.ts` で拡張する
- [ ] T717 [US2] Claude catalog parsing、complete authored source、static seedごとのdistinct validated target、owner-attached MCP、relationship-only rejected/remote component、zero synthetic file/connection/derived readを`src/inspection/scan.ts`へ統合する。Throw/rejectionはdomainでcatch/classify/retry/result化せず変更なしにouter boundaryへ伝播する
- [ ] T718 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude marketplace source、registration、activation-uncertainty メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 72: Copilot Marketplaces インベントリ

**目的**: 文書化された認識順序に従い、正確な四つのルート形式にある作成済み Copilot marketplace カタログを追加する。ローカル marketplace の来歴は VS Code と CLI だけに与え、Cloud は hosted/runtime-unavailable 条件のままとする。

**独立テスト**: `marketplace.json`、`.plugin/marketplace.json`、`.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json` をインベントリに含める。ローカルバッジと検索は VS Code/CLI だけに公開し、Cloud は hosted/runtime-unavailable としてだけ表現し、子孫と runtime-state パスを拒否し、Codex/Claude の共有認識を維持する。

**目に見えるチェックポイント**: ユーザーは、正確なルート形式と surface の来歴を備えた Copilot marketplace カタログをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T719 [US1] 四つすべてのルート形式、順序、共有ファイル、ローカル/リモートソース、不正なカタログ、シークレット、子孫、installed/hosted 状態、リンク、エイリアス、ニアミスを対象とする Copilot marketplace フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T720 [US1] VS Code/CLI のローカル振る舞いを備えた四つの Copilot marketplace 候補、origin fileを持たない正確な `copilot.behavior.cloud.plugins` hosted/runtime-unavailable の事実、パス不一致となる runtime-state ケース、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T721 [P] [US1] 正確な四つすべての Copilot marketplace 形式、認識順序、descendant/runtime-state の拒否、共有 `.claude-plugin` の来歴、VS Code/CLI のローカル来歴、Cloud のローカル認識がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T722 [US1] Copilot marketplace 行、形式順序、VS Code/CLI のローカルバッジ、Cloud の hosted/runtime-unavailable ラベル、診断、保持される Codex/Claude 認識を対象とするブラウザ受け入れテストを `tests/e2e/copilot-marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T723 [US1] local/Cloud のアクティベーションと managed/remote 除外から参照される前に、VS Code/CLI で修飾された Copilot ローカル marketplace 検索記述と、読み取り権限を付与しない `copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.plugins`、origin fileを持たない `copilot.behavior.cloud.plugins` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T724 [US1] 単一の `copilot.repo.marketplace` 候補に対する四つのセレクターだけを追加する。marketplace 除外 ID を作り出さず、hosted、installed、User、cache の場所はパス不一致のまま `shared/registries/inspection-rules.ts` で維持する
- [ ] T725 [US1] `copilot.behavior.cloud.plugins` に対する既存ソースのバックリンクを含む、Copilot marketplace のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T726 [US1] カタログを解析せず、ルートと完全一致する Copilot marketplace のマッチングと順序付き認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T727 [US1] Copilot marketplace の分類と共有物理ファイルの同一性を `src/inspection/scan.ts` に統合する
- [ ] T728 [US1] インベントリ行と、意味的に同等な英語/日本語の Copilot marketplace 形式、surface、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 73: Copilot Marketplaces の詳細

**目的**: 完全なリテラルの Copilot catalog detail を追加し、次の plugin フェーズに向けて validated direct one-edge local plugin source を検証する。

**独立テスト**: malformed/literal-credential-bearing catalogを開き、`plugins/foo`と`./plugins/foo`、将来のfour-target derivation order、execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、remote relationship retention、VS Code/CLI local-source plan、local planを持たないCloud hosted/runtime-unavailable state、exact authored literal、diagnostics、target readがゼロであることを検証する。

**目に見えるチェックポイント**: Copilot marketplace を選択すると、plugin manifest を読み取らずに、完全で inert な authored entry と direct one-edge local-source plan が表示される。

### テストを先に

- [ ] T729 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、`plugins/foo`/`./plugins/foo` authored literal/range と internal semantic path、recommendation、VS Code/CLI provenance、Cloud unavailable state、activation uncertainty、malformed occurrence failure、evidence に関する失敗する Copilot marketplace test を `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T730 [P] [US2] `plugins/foo`と`./plugins/foo`、containment、documented four-target order、one edge、static seedごとの全distinct targetをstable extractor/occurrence orderで扱うこと、forbidden derived authorityを除外しつつauthored Relationshipを保持することのfailing source-validation testを追加する。注入したすべてのthrow/rejectionがdomainでcatch、cause classification、retry、item/recognition/source plan/derived result/body/generation化されず変更なしに伝播し、prior commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T731 [P] [US2] Copilot カタログの検査が install、plugin read、component load、hook execution、MCP connection、asset load、remote fetch、hosted-state query を一切行わないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T732 [US2] ローカルソースプランが VS Code/CLI だけに存在し、Cloud は hosted/runtime-unavailable のままであることを証明する、相互の契約参照を備えた失敗する Copilot marketplace activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T733 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot marketplace detail、VS Code/CLI source plan、Cloud unavailable condition、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T734 [US2] closed Copilot catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T735 [US2] Copilot VS Code/CLI marketplace の登録、推奨、インストール、有効化、ローカルソース、関係の戦略に加え、ローカル来歴または検索を決して生成しない Cloud hosted/runtime-unavailable 戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T736 [US2] closed allowlist 内の occurrence-ordered catalog metadata、VS Code/CLI-only semantic local-source plan、正確な authored relationship、Cloud runtime-unavailable condition、applicability、diagnostics、evidence によって Copilot recognition を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T737 [US2] Copilot catalog parsing、complete authored source、documented four-target order、static seedごとのdistinct validated target、relationship-only rejected/remote componentを`src/inspection/scan.ts`へ統合する。Throw/rejectionはdomainでcatch/classify/retry/result化せず変更なしにouter boundaryへ伝播し、derived readを行わない
- [ ] T738 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot marketplace ソース、VS Code/CLI のローカル来歴、Cloud の利用不可状態、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 74: 統合 Marketplaces インベントリ

**目的**: marketplace catalog を統合し、共有の `.claude-plugin/marketplace.json` を Codex/Claude/Copilot recognition に対して一度だけ読み取り、同じ physical file 上の Claude owner-attached MCP を維持する。

**独立テスト**: 共有 catalog に対する一つの physical item/read、三つの marketplace recognition、Claude owner-attached MCP、決定論的な provenance/root-form order、synthetic MCP file または connection がないこと、local-source plan、filter、exclusion、injected throw/rejection、diagnostics、rescan cleanup を検証する。

**目に見えるチェックポイント**: 一つの共有 authored catalog 上のすべての marketplace interpretation と Claude owner-attached MCP を理解できる。

### テストを先に

- [ ] T739 [US1] すべての root form、local/remote source、Claude owner-attached MCP を持つ共有 triple-recognition file、不正な/secret-bearing catalog、alias、exclusion、注入した execution-environment throw/rejection を対象に marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T740 [US1] marketplace 除外 ID を定義せず、marketplace の振る舞い、マッチャー、導出プラン、composition、関係、パス不一致となる runtime-state ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T741 [P] [US1] すべての marketplace root、triple marketplace recognition、同じ ID 上の Claude owner-attached MCP、決定論的な form order、authored-state separation、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T742 [P] [US1] Shared catalogの1 Source scan attempt read-once、deterministic marketplace/MCP recognition/provenance、alias、complete per-seed targets、zero synthetic MCP/connection、pre-derivation target read 0件を検証する。Assembly/derivation throw/rejectionはdomainでcatch/classify/retry/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持するtestを`tests/integration/repository-scan.test.ts`へ追加する
- [ ] T743 [US1] 統合 marketplace inventory、filter、triple recognition、Claude owner-attached MCP、root-form order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T744 [US1] Marketplace physical-fileのscan-attempt-local read-once assembly、deterministic multi-tool/owner-attached MCP provenance、exact authored occurrence、complete source-plan retentionを実装する。Assembly/derivation throw/rejectionはdomainでcatch/classify/retry/source plan/provenance/recognition/item/body/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する。Synthetic fileなし/exclusionを`src/inspection/scan.ts`で保証する
- [ ] T745 [US1] marketplace インベントリのフィルター、共有認識の要約、作成済み状態のラベルを `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T746 [US1] 意味的に同等な英語/日本語の統合 marketplace、三重認識、作成済み状態、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 75: Marketplaces 比較

**目的**: リテラルおよび型付き marketplace カタログ差分で比較を拡張する。

**独立テスト**: Readableなcurrent-generation catalog fileを正確に2つ比較し、pluginをderive/activateせず、完全なliteral sourceと、整列したentry、source type、local-source plan、owner-attached MCP、provenance、registration、installation、enablement、condition、uncertaintyを検証する。

**目に見えるチェックポイント**: ユーザーは何も取得、インストール、アクティベートせずに marketplace カタログを比較できる。

### テストを先に

- [ ] T747 [US3] `(tool, kind, fieldId, occurrence)` の authored metadata、provenance、source type、registration、installation、enablement、実際の catalog owner ID を介する owner-attached MCP difference、uncertainty に関する失敗する marketplace comparison regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T748 [US3] sensitive-content acknowledgement、完全なリテラルの marketplace diff、正確な authored source-value/credential/environment-reference difference、typed source/activation と owner-attached MCP row、masking/reveal も environment substitution もないこと、accessibility、fallback、cleanup に関する browser acceptance を `tests/e2e/marketplaces-comparison.spec.ts` に追加する

### 実装

- [ ] T749 [US3] marketplace entry の `(tool, kind, fieldId, occurrence)` authored-literal comparison row、別個の typed state としての semantic source plan、provenance、既存の physical owner ID を介する owner-attached MCP、uncertainty を `app/components/comparison/RecognitionComparison.vue` で拡張する
- [ ] T750 [US3] 意味的に同等な英語/日本語の marketplace 比較メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 76: Codex Plugin Manifests インベントリ

**目的**: ルートと完全一致する、および安全に導出される Codex `.codex-plugin/plugin.json` manifest 候補を追加する。

**独立テスト**: 作成済みの root manifest と一つの `.codex-plugin/plugin.json` を inventory に含め、後者が検証済みの各 `./` local Codex marketplace source 配下にあることを確認する。One-edge containment、execution-environment capacity だけに従う complete deterministic retention、対象欠落時は候補なし、orphan/remote/escaping/linked 候補がないこと、再帰的な derivation がないこと、物理 file ごとに一度の verified read を確認する。注入した全throw/rejectionはdomain classification/retryなしに変更なく伝播し、item/recognition/derived result/body/generationを一切作らずattemptをabortし、prior commitだけを保持する。

**目に見えるチェックポイント**: ユーザーは、静的または marketplace 由来の来歴を備えた作成済み Codex plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T751 [US1] 正確なルート、有効な `./` ローカルカタログソース、正確な `.codex-plugin/plugin.json` 対象、欠落した対象、多数のソース、remote/absolute/home/traversal ソース、リンク、エイリアス、コンポーネント宣言、ニアミス、注入した execution-environment throw/rejection を対象とする Codex plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T752 [US1] Codex plugin-manifest の振る舞い、静的/有界導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T753 [P] [US1] 正確な `codex.repo.plugin-manifest`、`codex.derived.local-plugin-manifest`、一エッジ、`./` ソースの受け入れ、正確な `.codex-plugin/plugin.json` 対象、導出済みシードがないこと、コンポーネントファイル候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T754 [US1] Complete deterministic static/derived Codex manifest、missing target、containment、link、alias、scan-attempt-local read-once、component read 0件のfailing scan testを追加する。Throw/rejectionはdomainでcatch/classify/retry/manifest item/recognition/provenance/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T755 [US1] Codex plugin-manifest 行、静的/導出来歴、欠落 manifest、除外、診断、変更されない marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/codex-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T756 [US1] アクティベーション権限を持たない Codex plugin-manifest の振る舞いと検索記述を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T757 [US1] コンポーネントパス除外の所有をフェーズ 77 に残し、Codex の静的および有界導出 plugin-manifest レコードだけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T758 [US1] Codex plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T759 [US1] 検証済みの `./` ローカル marketplace ソースから正確な `.codex-plugin/plugin.json` 対象への、ルートと完全一致するマッチングおよびdirect one-edge Codex manifest derivationだけを `src/inspection/rules/codex.ts` に実装する
- [ ] T760 [US1] 静的/シード来歴を備え、コンポーネントを昇格しない Codex plugin-manifest 認識を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T761 [US1] Deterministic one-edge Codex manifest admission、1 Source scan attemptのverified group read、alias aggregationを`src/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T762 [US1] インベントリ行と、意味的に同等な英語/日本語の Codex plugin の静的/導出および除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 77: Codex Plugin Manifests の詳細

**目的**: authored state と relationship-only の component declaration を備えた、完全なリテラルの Codex manifest detail を追加し、一つだけの正確な non-read exclusion `codex.excluded.plugin-files` を所有する。

**独立テスト**: malformed および literal credential を含む manifest を開き、必須の entry metadata、marketplace provenance、installation/enablement/trust の分離、Hook/MCP/app/skill/script/asset component relationship、正確な `codex.excluded.plugin-files` の処理、MCP candidate を追加せずにフェーズ 23 の plugin path-negative context を更新すること、正確な authored literal、diagnostics、component read/activation がゼロであることを検証する。

**目に見えるチェックポイント**: Codex plugin manifest を選択すると、どの component も load せず、完全で inert な authored metadata が表示される。

### テストを先に

- [ ] T763 [US2] 一つだけの正確な `codex.excluded.plugin-files` レコードを、最終的に影響を受ける振る舞い `codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` とともに具体化し、失敗するレジストリカバレッジを追加する。plugin コンポーネントパスが決して候補にならず、以前の MCP パス不一致ケースが影響を受ける振る舞いの集合を変えずにこの除外を参照できることを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T764 [P] [US2] 作成済みメタデータ、ローカル marketplace エントリ、インストール/有効化/信頼の分離、静的/導出来歴、relationship-only のコンポーネントに対する失敗する Codex plugin テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T765 [P] [US2] plugin コンポーネントの import、skill read、app load、hook execution、MCP connection、script/asset read、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T766 [US2] 相互の契約参照を備えた、失敗する Codex plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T767 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex plugin detail、authored state、relationship、provenance、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/codex-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T768 [US2] 一つだけの非読み取り `codex.excluded.plugin-files` レコードを、`codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` への最終的な影響参照とともに追加する。フェーズ 23 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、install、cache、runtime-state の除外 ID は `shared/registries/inspection-rules.ts` に一切追加しない
- [ ] T769 [US2] closed Codex plugin-manifest field ID、正確な component source occurrence/UTF-16 range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T770 [US2] Codex plugin の authored、installed、enabled、trusted、local、activation、relationship の各戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T771 [US2] closed allowlist 内の Codex plugin-manifest metadataと relationship-only のコンポーネントを `src/inspection/recognizers/codex.ts` に実装する
- [ ] T772 [US2] アトミックな manifest 解析、正確な authored-literal 抽出、relationship-only の component、正確な `codex.excluded.plugin-files` diagnostics、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T773 [US2] 型付き詳細と、意味的に同等な英語/日本語の Codex plugin の作成済み状態、関係、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 78: Claude Plugin Manifests インベントリ

**目的**: optional-manifest の振る舞いを維持しながら、ルートと完全一致する `claude.repo.plugin-manifest` と marketplace 由来の `claude.derived.local-plugin-manifest` 候補だけを追加する。

**独立テスト**: 作成済みrootと検証済みlocal marketplace targetをinventoryに含め、optional absence、trust condition、execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、recursive derivationなし、component readなしを検証する。

**目に見えるチェックポイント**: ユーザーは、明示的なルートまたは marketplace 由来の来歴を備えた Claude plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T774 [US1] 正確なルート、有効なローカルカタログソース、任意で存在しない場合、多数のソース、祖先のニアミス、リンク、エイリアス、コンポーネント、禁止されたソース、注入した execution-environment throw/rejection を対象とする Claude plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T775 [US1] フェーズ 25 が所有する Claude plugin の振る舞いを再利用し、振る舞い ID を重複させずに、正確な静的/導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T776 [P] [US1] 正確な `claude.repo.plugin-manifest`、`claude.derived.local-plugin-manifest`、任意で存在しない場合、一エッジ、祖先スキャンがないこと、コンポーネント候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T777 [US1] Complete deterministic static/derived Claude manifest、containment、link、alias、scan-attempt-local read-once、component read 0件のfailing scan testを追加する。Throw/rejectionはdomainでcatch/classify/retry/manifest item/recognition/provenance/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持することを`tests/integration/repository-scan.test.ts`で証明する
- [ ] T778 [US1] Claude plugin-manifest 行、来歴の種類、任意で存在しない場合、信頼の不確実性、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/claude-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T779 [US1] フェーズ 25 が所有する `claude.behavior.repo.plugin` と `claude.behavior.user.plugins` を再利用し、ルートおよびローカル marketplace の plugin 検索について重複する振る舞い ID を `shared/registries/vendor-behaviors.ts` に追加しない
- [ ] T780 [US1] コンポーネントパス除外の所有をフェーズ 79 に残し、`claude.repo.plugin-manifest` と `claude.derived.local-plugin-manifest` だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T781 [US1] Claude plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T782 [US1] ルートと完全一致し、direct one-edge local-marketplace Claude manifest derivationを `src/inspection/rules/claude.ts` に実装する
- [ ] T783 [US1] 来歴、optional-manifest、信頼を備え、コンポーネントを昇格しない Claude plugin-manifest 認識を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T784 [US1] Deterministic Claude manifest admission、1 Source scan attemptのverified group read、alias、optional absenceを`src/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T785 [US1] インベントリ行と、意味的に同等な英語/日本語の Claude plugin の来歴、信頼、optional-manifest、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 79: Claude Plugin Manifests の詳細

**目的**: optional authored metadata と relationship-only component を備えた、完全なリテラルの Claude manifest detail を追加し、フェーズ 27 の MCP owner adapter を有効化して、一つだけの正確な non-read exclusion `claude.excluded.plugin-files` を所有する。

**独立テスト**: malformed および literal credential を含む root/marketplace-derived manifest を開き、optional field、default と explicit component location、registration/activation uncertainty、owner-attached MCP と relationship-only MCP component path、Hook/skill/command/agent/style/script/asset relationship、MCP candidate も affected behavior も追加せずにフェーズ 25/27 の path-negative diagnostic を更新する正確な `claude.excluded.plugin-files` 処理、正確な authored literal、diagnostics、connection がゼロであること、component read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude plugin manifest を選択すると、activation せず、完全で inert な authored metadata と component relationship が表示される。

### テストを先に

- [ ] T786 [US2] 一つだけの正確な `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに具体化し、失敗するレジストリカバレッジを追加する。このレコードが MCP 候補または影響を受ける振る舞いを追加せずにフェーズ 25/27 の MCP plugin-path 診断を更新し、plugin コンポーネントパスが決して候補にならないことを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T787 [P] [US2] 作成済みメタデータ、任意の manifest、フェーズ 27 の MCP adapter 有効化、登録/アクティベーションの不確実性、既定/明示コンポーネントに対する失敗する Claude plugin テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T788 [P] [US2] Claude コンポーネントの import、skill/command/agent/style read、hook execution、MCP connection、script/asset load、registration、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T789 [US2] 相互の契約参照を備えた、失敗する Claude plugin activation/relationship グラフカバレッジとフェーズ 27 の MCP owner-adapter binding を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T790 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude plugin detail、authored/optional state、owner-attached MCP と relationship-only の component path、connection がゼロであること、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/claude-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T791 [US2] 一つの非読み取り `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに追加する。フェーズ 25/27 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、User、cache、install、runtime-state の除外 ID は `shared/registries/inspection-rules.ts` に追加しない
- [ ] T792 [US2] closed Claude plugin-manifest field ID、正確な default/explicit component source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T793 [US2] Claude plugin の登録、アクティベーション、optional-manifest、component-resolution、relationship の各戦略を追加し、既存の MCP adapter を受け入れ済み plugin の振る舞いへ `shared/registries/runtime-composition.ts` で結び付ける
- [ ] T794 [US2] closed allowlist 内の Claude plugin-manifest metadata、owner-gated MCP、relationship-only のコンポーネントを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T795 [US2] Claude manifest 解析、正確な authored-literal 抽出、synthetic file も connection も作らない owner-attached MCP、relationship-only の component、MCP candidate を変えない更新済み plugin-path exclusion diagnostic、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T796 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude plugin の任意状態、コンポーネント、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 80: Copilot Plugin Manifests インベントリ

**目的**: 正確な四つの Copilot plugin-manifest 形式と、それらの有界なローカル marketplace 導出を追加する。同時に、CLI extension が plugin 候補にならないよう、正確に `copilot.excluded.cli-extensions` を所有する。

**独立テスト**: 文書化済み順序でexplicit rootとderived local sourceにある`.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`をinventoryに含める。Execution-environment capacityだけに従う完全で決定的なtarget retentionを伴うdirect one-edge derivation、containment、正確な`copilot.excluded.cli-extensions`、arbitrary descendant/runtime-state candidateなし、component readなしを検証する。

**目に見えるチェックポイント**: ユーザーは、正確な形式、静的/導出来歴、surface 条件を備えた Copilot plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T797 [US1] 四つすべてのルート/導出形式、順序、多数のソース、共有 Claude manifest、欠落形式、リンク、エイリアス、コンポーネント、CLI extension、installed/hosted 状態、禁止されたソース、注入した execution-environment throw/rejection を対象とする Copilot plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T798 [US1] Copilot plugin の振る舞い、読み取り権限を付与しない `copilot.behavior.cli.extensions`、静的/導出候補、影響を受ける振る舞いへの参照を持つ正確な `copilot.excluded.cli-extensions`、パス不一致となる runtime/component ケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T799 [US1] Four root form、`plugins/foo`/`./plugins/foo`、documented four-target order、environment capacityだけを条件として全validated targetへ行うdirect one-edge derivation、forbidden source form、shared recognition、`copilot.excluded.cli-extensions` mapping、extension-as-plugin candidateが0件であることのplugin matcher/derivation/registry failing testを追加する。Matcherまたはderivationのすべてのthrow/rejectionがdomainでcatch、cause classification、retry、program/plan/candidate/manifest/derived output、Diagnostic、item/recognition/result/body/generation化されず変更なしに伝播し、prior commitだけを保持してlifecycle handlingをtrigger-owning boundaryへ委ねることを`tests/unit/inspection/rules.test.ts`、`tests/integration/repository-scan.test.ts`、`tests/contract/inspection-rules.test.ts`で証明する
- [ ] T800 [P] [US1] manifest 形式の順序、静的/導出来歴、surface の事実、共有 Claude manifest、installed/hosted/component 候補がないことに対する失敗する Copilot 認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T801 [US1] Copilot plugin-manifest 行、形式順序、来歴、surface バッジ、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/copilot-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T802 [US1] plugin 戦略と正確な extension 除外がアクティベーション権限または読み取り権限なしで解決されるように、surface で修飾された Copilot plugin 検索記述と、読み取り権限を付与しない `copilot.behavior.cli.extensions` および `copilot.behavior.cli.user.extensions` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T803 [US1] 静的な `copilot.repo.plugin-manifest` と有界導出の `copilot.derived.local-plugin-manifest` レコードを追加し、正確な非読み取り `copilot.excluded.cli-extensions` だけを所有する。installed、hosted、component パスは `shared/registries/inspection-rules.ts` でパス不一致のまま保つ
- [ ] T804 [US1] Copilot plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T805 [US1] Documented local forms/four-target order/direct one-edge/containment/forbidden-source rejectionを持つ`copilot.derived.local-plugin-manifest`を実装する。Derivation throw/rejectionはdomainでcatch/classify/retry/program/plan/candidate/manifest/result化せず変更なしにouter boundaryへ伝播する処理を`src/inspection/rules/copilot.ts`へ実装する
- [ ] T806 [US1] ルートと完全一致する Copilot manifest のマッチングと順序付きの静的/導出認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T807 [US1] Deterministic Copilot manifest admission、1 Source scan attemptのverified group read、alias、complete success handlingを`src/inspection/scan.ts`へ統合する。Read/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter boundaryへ伝播しprior commitを保持する
- [ ] T808 [US1] インベントリ行と、意味的に同等な英語/日本語の Copilot plugin 形式、来歴、surface、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 81: Copilot Plugin Manifests の詳細

**目的**: authored、recommended、installed、enabled、trusted、hosted の condition を個別に備えた、完全なリテラルの Copilot manifest detail を追加する。

**独立テスト**: malformed および literal credential を含む manifest を開き、VS Code/CLI/Cloud state の分離、cross-tool metadata、relationship-only の agents/skills/hooks/MCP/LSP/scripts/assets、extension candidate を生成しない既存の `copilot.excluded.cli-extensions` の回帰、正確な authored literal、diagnostics、component activation がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot plugin manifest を選択すると、コンポーネントをロードせずに、作成済みメタデータと条件付きランタイム状態が表示される。

### テストを先に

- [ ] T809 [P] [US2] VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、ツール横断メタデータ、relationship-only のコンポーネント、および `copilot.excluded.cli-extensions` が plugin 候補を決して生成しないことの回帰に対する失敗する Copilot plugin テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T810 [P] [US2] script import、agent/skill/component read、hook execution、MCP connection、LSP start、asset load、remote fetch、installed/cache inspection が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T811 [US2] 相互の契約参照を備えた、失敗する Copilot plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T812 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot plugin detail、authored/runtime state、relationship、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを `tests/e2e/copilot-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T813 [US2] closed Copilot plugin-manifest field ID、正確な component source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T814 [US2] Copilot VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、関係の各戦略を個別に `shared/registries/runtime-composition.ts` へ追加する
- [ ] T815 [US2] closed allowlist 内の Copilot plugin-manifest metadataと relationship-only のコンポーネントを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T816 [US2] Copilot manifest 解析、正確な authored-literal 抽出、relationship-only の component、exclusion、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T817 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot plugin 状態、コンポーネント、surface、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 82: 統合 Plugin Manifests インベントリ

**目的**: plugin manifest を統合し、共有の `.claude-plugin/plugin.json` を Claude/Copilot の認識に対して一度だけ読み取り、Claude の owner-attached MCP を relationship-only のコンポーネントパスとは分けて保持する。

**独立テスト**: 共有 manifest に対する一つの物理項目/読み取り、二つの plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネントパス、決定的な形式/シードの来歴、Codex の分離、静的/導出の出所、合成 MCP ファイルも接続もないこと、エイリアス、注入したthrow/rejection、除外、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、作成済み plugin manifest に対するサポート対象のすべての解釈を理解し、Claude の owner-attached MCP を読み取り不能なコンポーネントパスと区別できる。

### テストを先に

- [ ] T818 [US1] すべてのルート/導出形式、Claude の owner-attached MCP を備えた共有 Claude/Copilot ファイル、欠落した任意 manifest、エイリアス、relationship-only のコンポーネント、除外、シークレット、不正な内容、注入した execution-environment throw/rejectionを対象に plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T819 [US1] plugin-manifest の振る舞い、マッチャー、導出、composition、関係、正確な `codex.excluded.plugin-files`/`claude.excluded.plugin-files`/`copilot.excluded.cli-extensions`、パス不一致となるランタイムケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T820 [P] [US1] Codex、Claude、Copilot の静的/導出 manifest、共有の二重 plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネント、決定的な形式順序、除外に対する完全なマッチャー/認識マトリクステストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T821 [P] [US1] Complete literal derived metadata、catalog-relative provenance、complete target retention、scan-attempt-local shared-file read-once、Claude owner-attached MCP、zero synthetic file/connection/component expansionを検証する。Throw/rejectionはdomainでcatch/classify/retry/manifest item/recognition/provenance/result/generation化せず変更なしにouter boundaryへ伝播しprior commitを保持するtestを`tests/integration/repository-scan.test.ts`へ追加する
- [ ] T822 [US1] 統合 plugin-manifest インベントリ、フィルター、plan-driven derivation、共有認識、Claude の owner-attached MCP とコンポーネントパスの対比、除外、generic OperationError、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T823 [US1] 読み取り権限を持たない三ツールすべての plugin-manifest 検索記述を `shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T824 [US1] plugin-manifest の静的/有界導出候補と、既存の正確な `codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`copilot.excluded.cli-extensions` レコードだけを `shared/registries/inspection-rules.ts` で完成させる
- [ ] T825 [US1] plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` で完成させる
- [ ] T826 [US1] direct one-edge local derivation、一度の検証済み読み取り、決定的なツール横断および owner-attached MCP の組み立て、除外、合成ファイルも接続もないこと、コンポーネントを展開しないことを `src/inspection/scan.ts` に統合する
- [ ] T827 [US1] plugin manifest のインベントリ kind フィルターと要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T828 [US1] 意味的に同等な英語/日本語の統合 plugin-manifest、導出、共有認識、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 83: Plugin Manifests 比較

**目的**: リテラルおよび型付き plugin-manifest 差分で比較を拡張する。

**独立テスト**: Readableなcurrent-generation manifest fileを正確に2つ比較し、activationもconnectionも行わず、完全なliteral sourceと、整列したauthored metadata、form/seed provenance、registration、installation、enablement、trust、owner-attached MCP、component relationship、uncertaintyを検証する。

**目に見えるチェックポイント**: ユーザーは、コンポーネントをロードまたは実行せずに plugin manifest を比較できる。

### テストを先に

- [ ] T829 [US3] `(tool, kind, fieldId, occurrence)` の authored literal、provenance、form、registration、installation、enablement、trust、owner-attached MCP、relationship、uncertainty に関する失敗する plugin-manifest 比較回帰テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T830 [US3] sensitive-content acknowledgement、credential/environment-reference の差を含む完全なリテラルの plugin-manifest diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed state/component/MCP、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/plugin-manifests-comparison.spec.ts` に追加する

### 実装

- [ ] T831 [US3] plugin-manifest comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう拡張し、runtime state、owner-attached MCP、component relationship を `app/components/comparison/RecognitionComparison.vue` で分離したままにする
- [ ] T832 [US3] 意味的に同等な英語/日本語の plugin-manifest 比較メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 84: Codex の独立 Hook ファイルインベントリ

**目的**: 独立した Codex `./**/.codex/hooks.json` 物理候補だけを追加する。

**独立テスト**: 可能なプロジェクトレイヤーにある子孫 `.codex/hooks.json` ファイルをインベントリに含め、ニアミス、リンク、ネストされた別名、User/managed hook、plugin コンポーネント対象、インライン設定宣言を個別ファイルとして拒否する。

**目に見えるチェックポイント**: ユーザーは、コマンドを一切実行せずに独立 Codex hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T833 [US1] プロジェクトレイヤー、有効な `.codex/hooks.json`、ニアミス、リンク、エイリアス、インライン設定宣言、plugin 対象、敵対的なコマンド、シークレット、User/managed 除外を対象とする Codex 独立 hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T834 [US1] Codex の独立 hook の振る舞い、マッチャー、既存の `codex.excluded.plugin-files` 参照、パス不一致となる User/managed ケース、composition、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T835 [P] [US1] Codex `./**/.codex/hooks.json`、可能なレイヤーの来歴、正確なファイル名、ニアミス、inline/plugin/User 対象の候補がないことに対する失敗するマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T836 [P] [US1] 独立 Codex Hook kind、来歴、信頼の不確実性、内包設定との重複がないことに対する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T837 [US1] 独立 Codex hook 行、フィルター、来歴、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/codex-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T838 [US1] フェーズ 23 が所有する `codex.behavior.repo.hooks` を再利用し、加算的な hook composition から参照される前に `codex.behavior.user.hooks` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T839 [US1] 子孫の独立 hook 候補 `codex.repo.hooks` だけを追加し、既存の `codex.excluded.plugin-files` を参照し、新しい除外 ID を定義せずに User/managed の場所をパス不一致のまま `shared/registries/inspection-rules.ts` で保つ
- [ ] T840 [US1] Codex hook のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T841 [US1] Codex の子孫 `.codex/hooks.json` のマッチングとパス由来の認識を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T842 [US1] hook インベントリのフィルターと独立 Codex の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T843 [US1] 意味的に同等な英語/日本語の Codex 独立 hook インベントリと除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 85: Codex Hook の詳細

**目的**: 完全なリテラルの Codex hook detail を追加し、inline `[hooks]` recognition を既存の `.codex/config.toml` file に関連付け、same-layer file と inline declaration を必須 warning とともに保持する。

**独立テスト**: standalone/inline Codex hook を開き、additive matching、same-layer file-plus-inline retention、warning metadata、trust/event condition、正確な authored-literal preservation、diagnostics、command/handler/process/URI/referenced-target execution がゼロであることを検証する。

**目に見えるチェックポイント**: Codex Hook 認識を選択すると、実行せずに正確な加算セマンティクスと警告が表示される。

### テストを先に

- [ ] T844 [P] [US2] 同じレイヤーのファイルとインライン宣言を必須警告とともに保持することに対する失敗する Codex hook テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T845 [US1] インライン Codex hook が既存の `.codex/config.toml` 物理ファイルに関連付けられ、合成ファイルを作成せず、独立 hook とは個別の来歴を保持することを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T846 [P] [US2] Codex hook の検査が command、process、import、evaluation、mutation、URI load、referenced-hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T847 [P] [US2] 完全なリテラルの command、typed event、additive composition、warning、condition、diagnostics、stale ID に関する失敗する Codex hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T848 [US2] 相互の契約参照を備えた、失敗する Codex hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T849 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、standalone/inline Codex hook detail、warning、diagnostics、shared config navigation、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/codex-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T850 [US2] Codex の加算的マッチング、信頼/イベント条件、同じレイヤーの file-plus-inline 警告戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T851 [US2] Codex のインライン認識、同じレイヤーの file-plus-inline の保持、来歴、警告メタデータを `src/inspection/recognizers/codex.ts` に実装する
- [ ] T852 [US2] closed standalone Codex Hook field ID、正確な source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T853 [US2] closed inline Codex Hook field ID、正確な source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって TOML extraction を `src/inspection/parsers/toml.ts` で拡張する
- [ ] T854 [US2] Codex hook の正確な authored-literal 保持、additive composition、condition、warning、追跡しない reference を `src/inspection/scan.ts` に統合する
- [ ] T855 [US2] イベント、コマンド、スコープ、来歴、順序、警告、アクティベーションの不確実性に対応する型付き Codex hook 詳細を `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T856 [US2] 意味的に同等な英語/日本語の Codex hook composition、警告、安全性、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 86: Claude の内包 Hook 宣言

**目的**: サポート対象の宣言を含む、すでに受け入れられた settings、skill、agent、plugin-manifest、marketplace の物理ファイルだけに Claude Hook 認識を関連付ける。

**独立テスト**: hook フィールドを含む/含まない受け入れ済み settings、skill、agent、plugin-manifest、marketplace の所有者、plugin hook-path の関係、参照されていない `.claude/hooks/**` script、捏造された `.claude/hooks.json` を検査する。Claude の独立候補または合成ファイルがないこと、一度だけ読み取って関連付けること、正確な所有者来歴、サポートされないファイルがパス不一致となることを検証する。

**目に見えるチェックポイント**: ユーザーは、捏造された hook ファイルを見ることなく、所有ファイル上の Claude 内包 Hook 認識をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T857 [US1] 受け入れ済み settings、skills、agents、plugin manifests、marketplaces 内の Claude 内包 hook に加え、欠落フィールド、参照されていない script、捏造された独立ファイル、plugin hook パス、不正な宣言、シークレット、ニアミスを対象とするフィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T858 [US1] Claude 内包 hook の振る舞い、関係、既存の `claude.excluded.plugin-files` 参照、パス不一致となる standalone/script/User ケース、エビデンス、no-standalone 行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T859 [P] [US1] settings/skill/agent/plugin/marketplace の所有物理 ID 上だけの Claude 内包 hook、宣言の来歴、合成ファイルがないこと、`.claude/hooks/**` または独立ファイルを推論しないことに対する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T860 [P] [US1] 所有ファイルを一度だけ読み取ること、決定的な Hook 認識の関連付け、relationship-only の plugin hook パス、分離された不正宣言、参照 hook の読み取りがゼロであることに対する失敗するスキャンテストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T861 [US1] Claude 内包 Hook 行、所有ファイルへの移動、フィルター、除外、診断、独立行がないことを対象とするブラウザ受け入れテストを `tests/e2e/claude-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T862 [US1] 独立読み取り権限を持たない Claude 内包 hook の検索記述を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T863 [US1] relationship-only の plugin hook-path レコードを追加し、既存の `claude.excluded.plugin-files` を参照し、新しい除外 ID を定義せずに standalone/script/User の場所をパス不一致のまま `shared/registries/inspection-rules.ts` で保つ
- [ ] T864 [US1] Claude hook のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T865 [US1] Claude の独立 hook の拒否と内包宣言の分類を `src/inspection/rules/claude.ts` に実装する
- [ ] T866 [US1] 候補を作成せず、Claude Hook 認識を既存の settings/skill/agent/plugin/marketplace 物理ファイルへ `src/inspection/recognizers/claude.ts` と `src/inspection/scan.ts` で関連付ける
- [ ] T867 [US1] Hook インベントリ行と、意味的に同等な英語/日本語の Claude 内包/所有者/除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 87: Claude Hook の詳細

**目的**: same-command deduplication、完全な additional context、restrictive-decision ordering を備えた、完全なリテラルの Claude Hook detail を追加する。

**独立テスト**: すべての owner kind にわたる hostile contained declaration を開き、event field、same-command deduplication、すべての additional context の保持、restrictive ordering、正確な authored-literal preservation、condition、diagnostics、execution/referenced read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude Hook 認識を選択すると、実行せずに正確な composition セマンティクスが表示される。

### テストを先に

- [ ] T868 [P] [US2] 同一コマンドの重複排除、すべての追加コンテキストの保持、制限的な判断順序、所有者 kind、アクティベーション条件に対する失敗する Claude hook テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T869 [P] [US2] Claude hook の検査が command、process、import、evaluation、mutation、URI load、plugin hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T870 [P] [US2] 完全なリテラルの command、event、owner provenance、composition、condition、diagnostics、stale ID に関する失敗する Claude hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T871 [US2] 相互の契約参照を備えた、失敗する Claude hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T872 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude Hook detail、owner provenance、dedup/context/order、diagnostics、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/claude-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T873 [US2] Claude hook の重複排除、追加コンテキスト、制限的順序、イベント、アクティベーションの各戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T874 [US2] 同一コマンドの重複排除、すべての追加コンテキスト、制限的な判断順序、所有者来歴を備えた Claude 内包 hook のメタデータを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T875 [US2] closed Claude Hook field ID、正確な owner-source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって JSONC、YAML、Markdown extraction を `src/inspection/parsers/json.ts`、`src/inspection/parsers/yaml.ts`、`src/inspection/parsers/markdown.ts` で拡張する
- [ ] T876 [US2] Claude hook の正確な authored-literal 保持、composition、condition、diagnostics、追跡しない reference を `src/inspection/scan.ts` に統合する
- [ ] T877 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude hook composition、所有者、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 88: Copilot の独立 Hook ファイルインベントリ

**目的**: ルート直下の子である Copilot `.github/hooks/*.json` 物理候補だけを追加する。

**独立テスト**: ルートの hook ファイルをインベントリに含め、ネストされたファイル、User hook、settings/agent/plugin 宣言を個別ファイルとして扱うこと、hosted 状態、リンク、エイリアス、実行可能 script、ニアミスを拒否する。

**目に見えるチェックポイント**: ユーザーは、VS Code、CLI、Cloud の来歴を備えた独立 Copilot hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T878 [US1] ルート直下の子、ネストされたニアミス、不正な JSON、敵対的なコマンド、シークレット、リンク、エイリアス、User hook、hosted 状態、settings/agent/plugin 宣言、script を対象とする Copilot 独立 hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T879 [US1] Hook 固有の除外 ID を定義せず、Copilot の独立 hook の振る舞い、候補、パス不一致となる User/hosted/script ケース、relationship-only の plugin パス、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T880 [P] [US1] ルート `.github/hooks/*.json`、直下の子という深さ、surface の来歴、nested/User/hosted/script の拒否、内包宣言との重複がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T881 [US1] 独立 Copilot hook 行、surface バッジ、フィルター、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/copilot-hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T882 [US1] hook composition から参照される前に、surface で修飾された Copilot hook の検索記述と、読み取り権限を付与しない `copilot.behavior.vscode.user.hooks` および `copilot.behavior.cli.user.hooks` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T883 [US1] ルート直下の子である `copilot.repo.hooks` 候補だけを追加し、User/hosted/script パスを不一致のまま保ち、新しい除外 ID を定義せずに plugin コンポーネントパスを関係として `shared/registries/inspection-rules.ts` に保持する
- [ ] T884 [US1] Copilot hook のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T885 [US1] Copilot のルート `.github/hooks/*.json` に対する直下の子のマッチングと認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T886 [US1] Copilot の独立 hook 分類を統合し、以前の Hook 結果を `src/inspection/scan.ts` で維持する
- [ ] T887 [US1] Hook インベントリ行と、意味的に同等な英語/日本語の Copilot 独立/surface/除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 89: Copilot Hook の詳細

**目的**: 完全なリテラルの Copilot Hook detail を追加し、contained recognition は settings と custom-agent owner だけに関連付ける。plugin hook component path は relationship のままとし、path から recognition を決して作成しない。

**独立テスト**: standalone および settings/agent-contained Copilot hook を開き、agent addition を伴う VS Code workspace same-event priority、CLI append order、Cloud Repository-only behavior、owner provenance、relationship-only plugin hook path、plugin-path recognition がないこと、正確な authored literal、condition、diagnostics、execution がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot Hook 認識を選択すると、実行せずに正確な surface composition が表示される。

### テストを先に

- [ ] T888 [P] [US2] agent の追加を伴う VS Code workspace の同一イベント優先、CLI ソースの追加順序、Cloud の Repository-only の振る舞い、settings/agent の所有者来歴、relationship-only の plugin hook パスに対する失敗する Copilot hook テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T889 [US1] settings/agent hook だけが既存の物理ファイルに関連付けられ、plugin コンポーネントパスが Hook 認識または合成候補を作成せず、内包来歴が独立来歴とは個別に維持されることを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T890 [P] [US2] Copilot hook の検査が command、process、import、mutation、URI load、referenced-hook read、plugin activation、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T891 [P] [US2] 完全なリテラルの command、event、surface、owner provenance、composition、condition、diagnostics、stale ID に関する失敗する Copilot hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T892 [US2] 相互の契約参照を備えた、失敗する Copilot hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T893 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、standalone/contained Copilot Hook detail、surface order、owner navigation、diagnostics、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/copilot-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T894 [US2] Copilot VS Code の settings/agent priority/additions、CLI append-order、Cloud Repository-only、relationship-only の plugin path、event、activation の各戦略を個別に `shared/registries/runtime-composition.ts` へ追加する
- [ ] T895 [US2] settings/agent 所有者だけの内包認識、relationship-only の plugin hook パス、来歴、条件メタデータを備えた Copilot の surface composition を `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T896 [US2] closed Copilot Hook field ID、正確な owner-source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって JSONC/Markdown extraction を `src/inspection/parsers/json.ts` と `src/inspection/parsers/markdown.ts` で拡張する
- [ ] T897 [US2] Copilot hook の正確な authored-literal 保持、settings/agent owner composition、recognition を伴わない plugin-path relationship の保持、condition、diagnostics、追跡しない reference を `src/inspection/scan.ts` に統合する
- [ ] T898 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot hook surface、所有者、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 90: 統合 Hook インベントリ

**目的**: 共有 `.claude/settings*.json` 所有者を一度だけ読み取ることを含め、独立および内包 Hook 認識を統合する。

**独立テスト**: 共有 settings に対する一つの物理読み取りと個別の Claude/Copilot Hook 認識、独立 Codex/Copilot ファイル、内包所有者の来歴、決定的な順序、合成ファイルがないこと、除外、フィルター、エイリアス、注入したthrow/rejection、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。

### テストを先に

- [ ] T899 [US1] 独立 Codex/Copilot ファイル、Claude の settings/skill/agent/plugin/marketplace 所有者、Copilot の settings/agent 所有者、共有 settings、relationship-only の plugin パス、参照されていない script、シークレット、エイリアス、除外、注入した execution-environment throw/rejectionを対象に Hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T900 [US1] Hook 固有の除外 ID を追加せず、Hook の振る舞い、独立マッチャー、内包所有者の composition、関係、既存の正確な plugin-file 除外、パス不一致ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T901 [P] [US1] Codex/Copilot の独立ファイル、Claude の独立候補がないこと、すべての script/User/hosted/component 除外に対する完全なマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T902 [P] [US1] 独立/内包の出所、受け入れられたすべての Claude 所有者、Copilot の settings/agent 所有者だけ、共有 settings、relationship-only の plugin パス、合成ファイルがないこと、決定的な来歴、追加認識がゼロであることに対する完全な認識マトリクステストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T903 [P] [US1] Shared ownerのread-once、deterministic Hook recognition order、alias、atomic continuity、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけによるcontracted-partial publication、およびwhole attemptをfatalにしてreferenced-Hook/later readを行わずnew Hook、recognition、item、generation、record、response、contracted-partial resultを公開せずprior committed snapshotだけを保持するdomain layerでcatch/classify/retryしないthrow/rejectionに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [ ] T904 [US1] 統合 Hook インベントリ、フィルター、共有認識、独立/内包の帰属、除外、診断、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T905 [US1] Owner/fileのscan-attempt-local read-once assembly、deterministic Hook recognition/provenance、zero synthetic filesを実装する。Read/recognition/assembly throw/rejectionはdomainでcatch/classify/retry/Diagnostic/Hook/recognition/provenance/item/body/generation/partial化せず変更なしにtrigger-owning outer boundaryへ伝播しprior commitを保持する処理を`src/inspection/scan.ts`へ実装する
- [ ] T906 [US1] Hook のフィルターと独立/内包/所有者の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で完成させる
- [ ] T907 [US1] 意味的に同等な英語/日本語の統合 Hook インベントリ、共有認識、所有者、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 91: Hook 比較

**目的**: 実際に読み取り可能な物理ファイル ID だけを選択可能としつつ、リテラルおよび型付き Hook 差分で比較を拡張する。内包 Hook 認識は所有ファイルを通じて選択し、ランタイムの事実だけでは選択できない。

**独立テスト**: owner を介した contained Hook declaration を含む、current-generation の読み取り可能な physical owner/file ID を正確に 2 つ選択し、完全なリテラルの source と、整列された event、source order、deduplication、priority、composition、provenance、warning、uncertainty を検証し、synthetic ID と runtime-fact-only row を拒否する。

**目に見えるチェックポイント**: ユーザーは hook 宣言を実行せずに比較できる。

### テストを先に

- [ ] T908 [US3] 正確に2つのdistinctなreadable physical owner/file IDと、両inputで同じIDを選ぶことの拒否、owner ID を介した contained Hook、runtime-fact の拒否、`(tool, kind, fieldId, occurrence)` の authored literal、event、order、composition、provenance、warning、uncertainty に関する、失敗する selection/comparison 回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T909 [US3] sensitive-content acknowledgement、owner を介して選択した contained Hook、credential/environment-reference の差を含む完全なリテラルの Hook diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed event/composition の差、runtime-fact の拒否に関するブラウザー受け入れテストを `tests/e2e/hooks-comparison.spec.ts` に追加する

### 実装

- [ ] T910 [US3] 実際に読み取り可能な物理 owner/file ID による比較選択を強制し、内包 Hook 認識をその所有者を通じて `app/composables/comparison.ts` で解決する
- [ ] T911 [US3] runtime fact を選択可能な file として公開せず、Hook comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう `app/components/comparison/RecognitionComparison.vue` で拡張する
- [ ] T912 [US3] 意味的に同等な英語/日本語の hook 比較メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 92: Repository インベントリの受け入れ

**目的**: 先行するすべての Repository インベントリ増分が、包括的な実装を用いずに US1 を満たすことを検証する。

**独立テスト**: 全サポート対象フィクスチャに対してパッケージをインストールし、allowlist に含まれるすべてのファイル、フィルター、認識、注入したthrow/rejection、再スキャンパス、パッケージパス、性能目標に加え、priority MCP adapter の後段の所有者有効化が既存の一つの所有者/読み取り上で行われ、合成ファイルも接続もないことを検証する。現在所有されている Repository レジストリのゲートは、36 個の静的候補、5 個の有界導出候補、7 個のベンダー除外、`shared.excluded.symlink-target` の正確に 49 ID であり、内包 Hook/MCP の作業が追加する候補ルールはゼロとする。また、3 つの `*.excluded.user-runtime` と `shared.excluded.managed-remote-state` はフェーズ 96～98 まで意図的に未定義のままとする。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。

### 受け入れテスト

- [ ] T913 [US1] 現在所有されている正確な49 IDのRepository registry gate（36 static、5 bounded-derived、7 vendor-excluded、1 shared-symlink exclusion）を追加し、1 merged root file/read/recognitionに対するdistinctな`copilot.repo.mcp`/`copilot.repo.mcp.vscode-root` provenanceを含める。すべての前段/後段所有者による内包Hook/MCP認識が追加するcandidate ruleはゼロで、既存の一つのowner ID/readが保持され、synthetic fileを作成しないことを証明し、延期されたGlobal-eraの4 non-read exclusionがまだ定義されていないことを`tests/contract/inspection-rules.test.ts`で表明する
- [ ] T914 [US1] 全サポート対象、ニアミス、空、複数ツール、ハードリンク、導出、敵対的、シークレット、性能のフィクスチャとガイダンスを `tests/fixtures/repositories/build-fixtures.ts`、`tests/fixtures/repositories/README.md`、`tests/fixtures/repositories/README.ja.md` で完成させる
- [ ] T915 [US1] Node.js、decoder、parser、Worker、filesystem、alias assembly、publicationのthrow/rejectionを注入するintegration testを追加する。Domain layerがcatch/cause分類/retry/convertせず、attempt item/recognition/derived result/Diagnostic/body/generationを作らず、REST ownerだけがgeneric pre/post-acceptance `OperationError`を作り、ownerless automatic startupはprocess top levelへ到達し、prior commitを維持することを証明する。Exact structural-`lstat` `ENOENT`だけを例外とし、deterministic returned entry-local outcomeだけがcomplete traversal後のcontracted-partialを作れること、capacity ceiling/verdictなし、late discard/hard-cancellation claimなしを`tests/integration/runtime-failures.test.ts`で検証する
- [ ] T916 [P] [US1] 全Repository kindのcomplete session/rescan API contractを追加する。Generation 0はcaptured `cwd`/`--cwd`から選択したexactly one enabled idle Source、stable source ID、escaped non-authorizing root、empty files/Diagnostics、null request ID、source I/O 0件を持つ。Strict inventory envelope、admitted Source/progress/final state/successful generationでone request IDを保持すること、conflict/stale ID/atomic publication、capability-only authorization、path-free operational record、analysis/verdict fieldなしを検証する。Complete generic `OperationError` entityとREST lifecycleとして、accept前はnull ID/HTTP `500`/job・retentionなし、`202`後はmatching non-null ID/retained session error/result・generation・raw causeなし、ownerless startup rejectionにはentityなしとする。Fatalに終了したaccept済み明示rescan jobだけがそのSourceのstale overlayを作成または置換し、throw/rejectionではaccept済みjobの`OperationError`だけを、決定的なreturned fatal outcomeではlifecycle Diagnosticを参照し、pre-acceptance failureではoverlayを作らず、正常replacement後だけclearすることを要求する。Poisoned-registry Repository rescanはpre-schedule `409 resource-cleanup-restart-required`かつID/job/state mutation/I/O 0件でprior stateを保持することを`tests/contract/http-api-session.test.ts`で証明する
- [ ] T917 [P] [US1] 分離install、固定asset/Worker、同一tarball、および高々1回指定できる任意の`--cwd`について、呼出し時の`process.cwd()`を1回だけcaptureして省略時はそのexact stringを保持する。POSIX absoluteまたはWindows absolute-drive inputを保持し、WindowsではUNC/server-share/device、current-drive/root-relative、`C:`/`C:foo` drive-relative formを`resolve`前にrejectし、platform-validなplain relative inputだけをresolveして、selected resultに同じshared pure `LexicalAbsoluteRootParts` parserの合格を要求する。Packed entry全体を計装し、CLI import前は固定package所有manifest/declared-asset readだけを許可し、その後のroot selectionはfilesystem/network I/O、`process.chdir()`、per-drive working-directory resolutionを0件とする。Missing/empty/duplicate/pre-resolution-invalid/parser-rejected launchがsession/browser作成前にfixed actionable outputで失敗し、起動時`cwd`、`--cwd`、selected rootからderiveしたI/OとDNS、SMB、outbound-network callを0件とすることを証明する。T043の全POSIX/Windows accepted/rejected vectorとownerless `process.cwd()` throw caseを含む完全なpackaged Gunshi CLI testを`tests/package/npx-launch.test.ts`に追加する。Default-browser delegation、`--no-open`/printed-URL fallback、bindしないhelp/version、strict unknown-option/positional/rest拒否、await済みshutdown、root-only import boundary、追加modeゼロも扱う
- [ ] T918 [P] [US1] T183をfinal registryへ拡張し、1つの変更しないprofile/fixtureで正確に10のfresh processを実行する。Run 1直前と各run直後にprofileがbindする`tests/performance/sc002-fixture-manifest.json`のversion/canonical digest、`tests/performance/sc002-fixture-manifest.sha256`、参照する全content digestを再計算して、missing entryまたはdriftがあればset全体を無効とする。各自動first scanをtiming外で待ち、明示rescanを正確に1件dispatchして`scanRequestId`をcaptureし、両timerをdispatch時に開始して、qualifying visible/assistive statusとcommit済みgeneration inventoryへ同じIDを要求する。Prior/automatic stateを拒否し、同じ9 run以上に1秒status、10秒inventory、2つの100 ms未満interactionを要求する。各runで同じprofile ID/manifest version/canonical digestを繰り返し、request ID/generation/environmentを記録し、personal identifier/absolute user pathだけを省略してcache reset/snapshot reuse/cross-profile comparisonを拒否する。対象は`tests/performance/repository-scan.test.ts`と`tests/performance/inventory-interactions.test.ts`とする
- [ ] T919 [US1] Inventory、filter、multi-recognition、Diagnostics、empty state、request-correlated rescan/retry、keyboard use、atomic replacement、detail acknowledgement前のsource/metadata/sensitive-value exposure 0件に関するRepository-complete browser acceptanceと文書化済みdiscovery command targetを`tests/e2e/repository-complete-inventory.spec.ts`と`tests/e2e/discovery.spec.ts`へ追加する。Inventory/Diagnostics/Source Condition Factsがnatural-language interpretation/ranking、customization validity/correctness/compliance/effectiveness/quality verdict、validation/lint、remediation/fix controlを公開しないnegative assertionを含める

---

## フェーズ 93: Repository 詳細の受け入れ

**目的**: 先行するすべての Repository 詳細増分が、包括的な実装を用いずに US2 を満たすことを検証する。

**独立テスト**: 現在所有されている完全な49-ID Repository rule registry（36 static、5 bounded-derived、7 vendor-excluded、1 shared-symlink exclusion）、延期されたGlobal-era exclusion 4件の明示的な不在、parser matrix、environment-owned capacity下のexact literal displayとcomplete detail behavior、safe filesystem boundary、すべてのlate owner-bound MCP activation、activation/connection/environment-reference resolution 0件、file-detailとremoved-reveal-route API behavior、relationship、diagnostics、stale cleanup、contained Hook/MCP factによるcandidate-rule additionとduplicate owner read 0件を検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。

### 受け入れテスト

- [ ] T920 [P] [US2] 現在所有する正確な49 IDの内訳（36 static、5 bounded-derived、7 vendor-excluded、1 shared-symlink exclusion）、延期した4 exclusionの不在、1 owner ID/readへmergeされるdistinctなroot CLI/VS Code rule provenanceとpath-only VS Code semantics、contained Hook/MCP candidate ruleゼロ、early contractからlate owner activationまでの完全なmatrix、synthetic file/connectionゼロ、現在所有する全behavior/strategy/relationship/evidence backlink、emitする全`(tool, kind, fieldId)`とrelationship kindのexactなclosed presentation-allowlist membershipに加え、そのoccurrenceのactualなadmission済みsource formに対するexact extractor applicability、未記載entryの推論とcross-form promotionがゼロであること、reciprocal fingerprint、offline separationについて、Repository subgraph contractを`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts`に追加する
- [ ] T921 [P] [US2] JSONC、YAML、TOML、Markdown/frontmatterの4 parser matrix testを`tests/unit/inspection/parsers.test.ts`と`tests/unit/inspection/seed-parsers.test.ts`に追加し、NUL byteはdiagnostic-onlyの`binary`となり、NULのないbyteはexactly onceだけdecodeされてreadableな`utf-8`、`utf-8-bom`、または`utf-8-replaced`となり、先頭BOM 1個を除去して記録し、保持された`U+FFFD`がscanをpartialにせずatomic extraction/display/comparisonまで完全に伝播し、charset fallback/sampling/truncationがないことを証明する。Deterministic malformed returned outcome、後続attemptだけのWorker replacement、environment-owned capacity、およびdecoder/parser/Worker/extractorの全throw/rejectionがdomain catch、cause classification、retry、recovered result、Diagnostic、generationなしに変更なく伝播することも扱う
- [ ] T922 [US2] Relationship、provenance、derivation、fallback、source occurrence、authored text、parser message、retained graph、FileDetailでthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered value/Diagnostic/body/generation化せず変更なしに伝播すること、atomic abort/prior snapshot、およびtrigger-owning REST boundaryのgeneric OperationErrorまたはownerless startup top-levelだけを`tests/integration/runtime-failures.test.ts`で検証する
- [ ] T923 [US2] `SourceConditionFact`、`ApplicabilityAssessment`、Diagnostic construction/retention/serializationのthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered Fact/assessment/Diagnostic/recognition/result/body/generation化せず変更なしに伝播すること、prior snapshot、numeric capなし、およびREST OperationErrorまたはstartup top-levelだけを`tests/integration/runtime-failures.test.ts`で検証する
- [ ] T924 [P] [US2] Malformed file、link、traversal、cycle、post-read verification、完全なbyte disposal、`O_NOFOLLOW`、disable・shutdown・supersession後のcleanup-only late discard、read-only open flag、mutation-capable call 0件、不変のcontent/length/identity/link/mode/mtime/ctime/xattr/ACL observation、別記録するOS-only atime residualに関するfull safety testを追加する。決定的なcandidate-local changed-entry/unusable-data outcomeはcomplete traversalとconfirmed closure後にdiagnostic recordだけを保持できる一方、root/shared-ancestorまたはdirectory-enumeration guard outcomeとFileHandle/`fs.Dir`のclose未確認はcandidate record、partial generation、success receiptを一切commitしないことを表で証明する。対象は`tests/integration/inspection-safety.test.ts`とする
- [ ] T925 [P] [US2] `--no-open`またはpost-helper instrumentationのもとで全Repository familyへzero-activation regressionを拡張する。Local fixture rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback classを別々に分類・検証し、それ以外の全surfaceについてdiscovery/read/parse/display/comparison/relationship processingによるchild/evaluation/MCP/禁止対象direct product-issued outbound request/URI/image/mutation/reference readが0件であることを証明する。Explicit UNC/server-share/device inputではfilesystem/DNS/SMB call 0件を証明し、lexicalに識別不能なpre-mounted/mapped network storageは除外したOS-mediated FR-022 limitationとして文書化する。Operational outputをcaptureし、fixed code/opaque IDだけを許可してpath、root、filename、inspected content/metadata、authored value、capability、body、raw error、exception string、Diagnostic argumentを0件にする。対象は`tests/integration/security/zero-activation.test.ts`とする
- [ ] T926 [P] [US2] 全readable kindのfile-detail contractを追加する。`utf-8 | utf-8-bom | utf-8-replaced`はcomplete source/range/authored literal/comparison eligibilityと`U+FFFD`を保持し、`binary`だけがdiagnostic-onlyでそれらを禁止する。Source-form allowlist、unknown-key text、strict/no-store/capability envelope、stale ID、acknowledgement routeなしを検証する。Pre-commit encoding/serialization throwはgeneric null-ID HTTP 500 OperationErrorだけ、post-commit delivery rejectionはcommit不変/success payloadなし/partialなし、analysis/validation/verdict/remediation fieldなしを`tests/contract/http-api-files.test.ts`で証明する
- [ ] T927 [US2] Memory-only presentation acknowledgement、`utf-8-replaced` textとcomparisonを含む完全でliteralなreadable detail、authored valueを一切含まないdiagnostic-only binary、exact metadata/relationship、masking/reveal/substitutionなし、executable rendering 0件に関するRepository-complete browser acceptanceを`tests/e2e/repository-complete-detail.spec.ts`と`tests/e2e/inspection-safety.spec.ts`へ追加する。完全なtraversal後のdeterministic returned malformed/binary/boundary outcomeだけがcontracted-partialをcommitでき、REST-owned throw/rejectionはnew result/generationを作らずgeneric REST Operation Errorとしてのみ現れ、accept済みexplicit-rescan jobがfatalに終了した場合はstale overlayを作成または置換し、accept前failureでは作成しないことを検証する。一方、ownerless automatic first-scan rejectionはprocess top levelへ到達し、deterministic first-scan failureはgeneration-0 Sourceをstale overlayなしで保持する。Pre-request disable、より大きいepochの観測、またはfenceによる中央full-session purgeではacknowledgementをresetし、route/file/Source/generationのscope限定cleanupでは読み込み済みdocumentについて維持できること、stale route、analysis/verdict/remediation controlがないことも扱う

---

## フェーズ 94: Repository 比較の受け入れ

**目的**: 先行するすべての Repository 比較増分が、包括的な実装を用いずに US3 を満たすことを検証する。

**独立テスト**: 同じRepository Source内のreadableなcurrent-generation distinct physical file ID 2件を比較し、その後、後段でadmitされた全real owner IDを介したMCPを含む全familyのrepresentative fileについて、literal/typed difference、unreadable、diagnostic-only、runtime-only、dormant selectionの拒否、fallback、accessibility、stale invalidation、client resourceの完全なcleanupを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。

### 受け入れテスト

- [ ] T928 [US3] Rescanによるselection/request token/FileDetail/Monaco/MCP/client epoch/stale ID invalidationを検証する。Acknowledgementはordinary scoped route/file/Source/generation cleanupでは保持してよいが、document reloadとliveness loss、pre-request Global disable、greater Global epoch/non-null fence観測を含む全central full purgeでresetする。Acknowledgement前にsource text、authored metadata/relationship target、comparison request/DOM/editor stateが存在しないことを`tests/integration/session-lifecycle.test.ts`で証明する
- [ ] T929 [US3] このcheckpointでは同じRepository Source内のreadableなcurrent-generation distinct physical file ID 2件だけを対象とするliteral comparisonとtyped structural differenceに関するRepository-complete browser acceptanceと文書化済みcomparison targetを追加し、semantic ranking、merge、validation、lint、content verdict、policy/remediation、synchronization、conversion、formatting、fix suggestionがないことをassertする。Real owner IDを通じたlate-owner MCP selection、runtime-only/dormant rejection、fallback behavior、accessibility、lifecycle cleanupも`tests/e2e/repository-complete-comparison.spec.ts`と`tests/e2e/comparison.spec.ts`で扱う

---

## フェーズ 95: Global 同意プレビュー

**目的**: User-Global パスが承認される前に、正確で I/O を行わず capacity を environment に委ねる previewを表示し、同意の除外に必要な残りの純粋な User-only の振る舞いの事実を完成させる。

**独立テスト**: 分離された environment input と fake home を使用し、proposed path に対する I/O がゼロであること、正確な3 tool preview entry、throw/rejection 時に partial preview を公開しない complete environment-supported escaping、不正な override、versioned digest binding、stale/replayed request の拒否、accessible bilingual review、`codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` の read authority を付与しない one-time ownership を検証する。

**目に見えるチェックポイント**: ユーザーは検査を有効にする前に、正確な Global root、pattern、exclusion、generic OperationError status、contract versionを確認できる。

### フィクスチャとテストを先に

- [ ] T930 [US4] Exact candidate、exclusion、fallback、invalid override、link、alias、unreadable root、注入したNode.js/OS/filesystem throw/rejection、異なるliteral credential/environment reference、sentinel process value、executable-looking inert payload、before/after content/length/identity/link/mode/mtime/ctime/xattr/ACL observationと別記録するOS-only atimeを対象とするisolated Global-home fixtureを作成する。Carveout以外のthrow/rejectionを変更なく伝播すること、generic REST Operation Errorのownership、file-size/count validationなし、availabilityからvalidity/lint/verdictを生成しないことを`tests/fixtures/global-homes/build-fixtures.ts`、`tests/fixtures/global-homes/README.md`、`tests/fixtures/global-homes/README.ja.md`のbilingual guidanceへ記載する
- [ ] T931 [US4] 残りの純粋な User-only の事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` を具体化し、それらに対する失敗するレジストリ/バックリンクのカバレッジを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/official-sources.json`、`tests/contract/vendor-behaviors.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T932 [P] [US4] Filesystem/network I/O 0件と完全にorderedなGlobal `inputState` algorithmのfailing preview testを追加する。Environment由来emptyだけが`present-empty`、U+0000またはunpaired UTF-16は`invalid`、active-platform `path.isAbsolute()` falseは`relative`、shared pure `LexicalAbsoluteRootParts`がrejectするabsolute spellingは`invalid`、parser-accepted absolute spellingだけが`eligible`となってexact parsed operandを保持する。POSIXの`/tmp//repo`、dot/dot-dot、trailing separator、U+FFFD、およびWindowsのUNC/network/device/current-drive、repeated separator、dot/dot-dot、trailing separator、malformed drive、accepted plain drive vectorを含める。Exact lexical root、complete environment-supported escaping、exact three-entry frozen previewも扱う。Capture-or-replaceはstate-changing POSTだけが行い、current-preview retrievalはnon-mutatingであることを証明する。Capture/escape/digest/serializationのthrow/rejectionはconsent domainでcatch/cause分類/partial DTO/state mutation/path authority化せず変更なしに伝播し、routerだけがgeneric pre-acceptance OperationErrorを返すことを`tests/unit/host/global-consent.test.ts`で扱う
- [ ] T933 [US4] Immutable typed traversal plan、ordered session-keyed raw/display digest、fixed verification input、stale/replay invalidation、およびlater enable verification materialの`confirmedTools`をinvalid entryも含むclosed fixed order `[copilot, claude, codex]`にexactly固定し、eligibility narrowing、reorder、UI/API selectorを許さないpreview testを`tests/unit/host/global-consent.test.ts`へ追加する。このPhase-95 test boundaryはpreview-onlyとし、consent後のinitial/retry work-set derivationはenable foundation作成後のT945–T946が所有する
- [ ] T934 [P] [US4] Non-mutating `GET /api/v1/global/consent-preview`がcurrent frozen previewまたは`404 consent-preview-missing`だけを返すcontractと、exact `{}` bodyおよびmandatory exact same-origin `Origin`を要求するstate-changing `POST /api/v1/global/consent-preview`がunconsented previewをcaptureしてatomic create/replaceし`201`を返すcontractを追加する。No-store、proposed-root I/O 0件、active-consent/enable/disable conflict、POST capture/encoding throw時のnull-ID HTTP 500 OperationErrorとsuccess byte/job/retention/state mutation 0件を検証し、GETがenvironmentをrecaptureしない。Process-wide resource registryがpoisonedならPOSTはenvironment/default-home capture、digest/encoding、state mutation、job allocation、I/O前に`409 resource-cleanup-restart-required`を返し、GETはpure current-state retrievalのままであることを`tests/contract/http-api-global.test.ts`で証明する
- [ ] T935 [US4] 二言語の root、pattern、state、exclusion、generic OperationError、keyboard review、同意前の source result または enable request がゼロであることについて、失敗する browser acceptance test を `tests/e2e/global-consent-preview.spec.ts` に追加する

### 実装

- [ ] T936 [US4] Global 除外レコードから参照される前に、それまで未所有で読み取り権限を付与しない事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` だけを `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T937 [US4] ソース ID を作成せず、これら 3 つの純粋な User-only の振る舞いの事実に対する相互バックリンクを既存の公式ソースレコードへ `shared/registries/official-sources.ts` で追加する
- [ ] T938 [US4] POST所有のcomplete environment/default-home preview captureとordered Global `inputState` algorithmをshared pure `LexicalAbsoluteRootParts` parserで実装し、`eligible` rootだけにexact parsed operandを引き継いでfilesystem/network I/Oを0件とする。Normalization/root creationなしのpresentation escapingとatomic create-or-replaceを行い、frozen recordをGETへpure current-state retrievalとして公開する。Capture/classification/escape/digest/serializationのthrow/rejectionはdomainでcatch/cause分類/partial DTO/digest/state mutation/path authority化せず変更なしに伝播する処理を`src/host/global-consent.ts`へ実装する
- [ ] T939 [US4] メモリ内だけのプレビューレコード、順序付きセッションキーによるダイジェスト構築、固定形式の検証素材、古い状態の無効化、有効化要求のバインディングを `src/host/global-consent.ts` に実装する
- [ ] T940 [US4] `src/host/api-router.ts`にpaired preview handlerを実装する。Non-mutating `GET /api/v1/global/consent-preview`はcurrent frozen previewまたは404だけを返し、`POST /api/v1/global/consent-preview`だけがexact `{}`とsame-origin `Origin`を要求してunconsented previewをcapture/atomic create-or-replaceし201を返す。POST capture/schedule前にpoisoned process-wide registryを`409 resource-cleanup-restart-required`で拒否し、environment/default-home capture、digest/encoding、job/state mutation、I/Oを0件とし、GETはpure current-state retrievalのままにする。No-store/conflictを保持し、POST capture/encoding throwだけをREST boundaryでcatchしてnull-ID HTTP 500 OperationErrorとし、success byte/job/retention/raw cause/state mutation/path authorityを作らず、GETはenvironment recaptureしない
- [ ] T941 [US4] 正確な root、pattern、state、exclusion、version、generic OperationError について、Inspector-defined capacity field/value を含まない accessible preview presentation を `app/components/consent/GlobalConsentPreview.vue` に実装する
- [ ] T942 [US4] 有効化を送信せず、プレビューのロード、ローカルの明示確認状態、古い状態からの回復、承認喪失の処理、フォーカス管理を `app/pages/global-consent.vue` に実装する
- [ ] T943 [US4] 意味的に同等な英語/日本語の Global preview、throw/rejection、override、digest、consent message を、`app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 96: Fixed-Three Global Enable基盤とCodex Batch Member（Composite Slice 1/4）

**目的**: Exact stored previewを検証し、3つのclosed typed member-admission port上にgeneric selector-free fixed-three coordinatorを確立してreal Codex memberをbindすることで、単一のPhase-96–99 composite checkpointを開始する。Claude/Copilot production portはPhase 97–98だけが追加し、このslice単独ではall-three production完成を主張せず、Phase 99前にcomposite checkpointを完了しない。

**独立テスト**: Tool selectorなしのexact preview-bound bodyをsubmitし、generic coordinator boundaryへtest-only typed member outcomeをinjectして、後続Claude/Copilot production portの存在を装わず0〜3件のaccepted/rejected partitionをすべてexerciseする。Admitted outcome 0件なら`active-no-job`、injected admitted context 1〜3件ならone shared `scanRequestId`/working setのexactly one `GlobalBatchScan`へまとめてtransferする。Real Codex member、disable race、visible carried Sourcesを伴うexact retry state、Repository、exact `codex.excluded.user-runtime`も別に検証し、Phase 99で3つのreal portを通じて同じpermutationを再検証してからcomposite checkpointをgreenにする。

**目に見えるチェックポイント**: このinternal sliceはrelease checkpointではない。Harnessはfixed tupleとshared pending/retryable stateをprovisional Sourceなしで示すが、user-visible all-three checkpointはClaude/Copilot port bind後のPhase 99だけが所有する。

### テストを先に

- [ ] T944 [P] [US4] Canonical component identity、link/alias、invalid override、exhaustive first-non-empty traceに関するfailing Codex post-consent testを追加する。Safely readしたnon-binary decoded overrideは`trim().length > 0`（保持した`U+FFFD`を含む）ならshort-circuitし、安全にempty/BOM-only/whitespace-onlyならadvanceする。中央safe-fs structural wrapperだけがcontract-declared pre-observation target `lstat`のexact Node `ENOENT`をtyped `absent`へ変換してadvanceさせる。そのtyped post-observation `entry-disappeared`はfallbackせず、root/ancestor/directory roleではSource-fatal、terminal regular-file candidateではfile-scoped `safe-fs-entry-stale`へmapしてpost-traversal/confirmed-closure contracted-partial Sourceだけに寄与でき、binaryと全deterministic unsafe/type/boundary outcomeはDiagnostic付きstopとする。その他の全throw/rejection（`open`/`read`の`ENOENT`を含む）はfallbackなしに変更なく伝播してfixed-three transaction全体をabortし、context/candidate/plan/authority/batch/resultを一切作らない。Safely consumed empty overrideとlater admitted fallbackが同じusable physical identityならfallback open/read 0件、byte/provenance merge/reuseなし、empty override unpublished、diagnostic-only contracted-partial fallback `safe-fs-ordered-fallback-alias-rejected`だけをhost consent codeが`node:fs` call 0件でNode error codeをinspect/convertしないことも`tests/unit/host/global-consent.test.ts`で検証する
- [ ] T945 [P] [US4] `confirmed: true`、exact version/preview/digest binding、tool selectorなし、extra/false/stale/mismatch rejection、fixed `confirmedTools: [copilot, claude, codex]`、server-derived initial-allまたはexact `retryableTools` set—admitted-unpublishedとsame-preview rejected controlを含み、published、pending、lexical new-preview-required controlを除外—、exact accepted/rejected partitionの`POST /api/v1/global/enable` failing contractを追加する。Zero admittedは`active-no-job`/null ID/no new job/Source/generationとし、initial enableにはGlobal Sourceがない。Retry validation/admission中は`globalEnableInProgress`だけを公開し、既存のSources/control/`pendingTools`/`retryableTools`/`batchStatus`/diagnostic/snapshot projectionをexactly保持する。Queued acceptanceだけが`pendingTools`/`batchStatus`をadmitted subset/shared IDへatomicに設定する。未bindのClaude/Copilot portにはtest-only typed outcomeをinjectして1–3 admittedのexactly one shared `scanRequestId`/one unpublished `GlobalBatchScan` `queued`をcoverするが、production root/contextをsynthesizeせず、T991/T993で全real portを通じて同じcaseを再検証する。Poisoned process-wide registryはinitial enable/retryの両方をadmission/schedule前に`409 resource-cleanup-restart-required`、ID/job/control/Source/generation/state mutation/I/O 0件で拒否する。Non-carveout throw/rejectionはaccept前ならgeneric null-ID `OperationError`としinitial consent/control/jobをactivateせず、retry stateを不変にし、`202`後ならshared non-null IDのone retained terminal error/no subset commitとすることを`tests/contract/http-api-global.test.ts`で検証する
- [ ] T946 [P] [US4] Production bind前のmember portにはtest-injected typed outcomeだけを使い、fixed-three initial-enable/retry coordinatorのatomic control/admission partition、operation epoch、FIFO、conflict、provisional Source 0件、`active-no-job`、および全nonempty injected admitted subsetにone `GlobalBatchScan`/request ID/publication authority/working setを検証する。Retry pollingはaccept前に`globalEnableInProgress`だけを公開してexactなpre-operation `pendingTools`/`retryableTools`/`batchStatus`/diagnostic projectionを保持し、queued acceptanceがadmitted subset/shared requestだけをatomicにinstallすることを証明する。Non-carveout throw/rejectionはaccept前ならinitial consent/control/jobを作らず、retryならexisting stateを不変にし、`202`後ならshared batchをone generic OperationErrorでterminalにする。Subset/generation/stale overlayなし、prior snapshot、disable/shutdown/supersession late discard、`202`対`409 global-disable-pending` linearizationを証明する。このinjected coordinator suiteをproduction all-three完成と扱わず、T991/T993がその証明を`tests/unit/session/coordinator.test.ts`で所有する
- [ ] T947 [P] [US4] Fixed-three transaction内のCodex member boundary testを追加する。Raw/NFC/collision/alias、exact Codex Global instruction/fallback、excluded surface 0件、admitted missing-Source memberのnew/provisional Sourceをsingle batch commit前に0件、carried existing Sourceはvisibleとする。Non-carveout throw/rejectionは全siblingをabortしRepository stateを保持する。さらに、全proposed-root operationがcentral safe-fs serviceだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で証明する
- [ ] T948 [US4] 参照だけの Codex User 振る舞いセット、`codex.global.instructions`、正確な `codex.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T949 [US4] 有効化前にすべての Codex User 振る舞いがすでに所有されていたこと、`codex.global.instructions` が読み取りを新たに許可する唯一の Codex ルールであること、`codex.excluded.user-runtime` が新たに所有される唯一の Codex 除外であることを証明する、失敗する Codex Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T950 [US4] No-selector exact-preview、fixed `[copilot, claude, codex]` confirmation、未bind Claude/Copilot portへのtest-only typed outcome、one shared batch/request IDへ結び付くper-tool accepted/rejected controls、`active-no-job`、generic batch OperationError、deterministic Diagnostic、admitted missing memberのpre-commit new/provisional Source/file row 0件とcarried Source visibility、Repository retentionのbrowser acceptanceを`tests/e2e/global-codex-admission.spec.ts`へ追加する。Real Codex pathだけをproduction-backedとし、全real-port browser完成はPhase 99へdeferする

### 実装

- [ ] T951 [US4] Codex root-admission orchestrationをfixed-three operationのone memberとして実装し、frozen parsed operand/compiled planをexisting central safe-fs boundaryへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはsingle `GlobalBatchScan`へ渡すatomic all-tools decisionでだけ`GlobalToolControl`へtransferする処理を`src/host/global-consent.ts`へ実装する
- [ ] T952 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `codex.behavior.user.instructions`、`codex.behavior.user.agents`、`codex.behavior.user.config`、`codex.behavior.user.hooks`、`codex.behavior.user.memories`、`codex.behavior.user.plugins`、`codex.behavior.user.prompts`、`codex.behavior.user.rules`、`codex.behavior.user.skills` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T953 [US4] 同意でゲートされた読み取り許可ルールとして `codex.global.instructions` だけを追加し、既存の除外レコードを一切変更せず、正確に新しい非読み取りの `codex.excluded.user-runtime` を `shared/registries/inspection-rules.ts` で所有する
- [ ] T954 [US4] 新しい戦略 ID を作成せず、既存の Codex 命令戦略を Global 選択、フォールバック、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T955 [US4] 新しいソース ID を作成せず、Codex Global のカバレッジについて既存の公式ソースレコードのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T956 [US4] Compiled `codex-global-first-non-empty` planを`src/inspection/rules/codex.ts`へ実装する。Exact `utf-8 | utf-8-bom | utf-8-replaced` emptiness、pre-observation structural-`lstat` exact `ENOENT`だけのabsence fallbackを保証する。Post-observation disappearanceはfallbackせず、root/ancestor/directory roleではSource-fatal、terminal regular-file candidate roleではcomplete traversal/confirmed closure後だけfile-scoped `safe-fs-entry-stale` contracted-partialにできる。Binary、deterministic unsafe outcome、その他throw/rejectionではfallbackせず、at most one file、exact `codex.excluded.user-runtime`を保証し、全non-carveout throw/rejectionを変更なしに伝播させwhole batchをabortする
- [ ] T957 [US4] Codex scanをsingle `GlobalBatchScan`のone memberとして実装し、one root、exact fallback、raw/NFC/alias、deterministic Diagnosticを扱う。全committable memberがone atomic generationでpublishされるまでadmitted missing memberのnew/provisional Source/graphを0件とし、carried Sourcesをvisibleに保ち、member throw/rejectionはwhole batchをabortするよう`src/inspection/scan.ts`へ実装する
- [ ] T958 [US4] Fixed three closed typed member-admission port上にgeneric selector-free initial-enable/exact-consent-retry coordinatorを実装する。Production Codex portはT951、Claude/Copilot portは後続T968/T982がbindし、T945–T946はこのport boundaryへtyped test outcomeだけをinjectできるがproduction root/contextをsynthesizeせずfilesystem I/Oを行わない。Generic layerはinitialで3 slotすべてをevaluateし、retryではnon-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するcomplete fixed-order exact `retryableTools` projectionをderiveし、one atomic decisionでfixed controls/outcomesを有効にする。Retry validation/admission中は`globalEnableInProgress`だけを公開し、exact pre-operation `globalControl`,`pendingTools`,`retryableTools`,`batchStatus`, diagnostic fields, Sources, snapshotを保持して、queued acceptanceだけがadmitted pending subset/shared batchをatomicにinstallする。Zero admittedは`active-no-job`/null ID/no new job-Source-generation、nonemptyはsupplied typed context/IDすべてをone shared request/authority/working setの`GlobalBatchScan`へtransferする。Exact pre-/post-acceptance errorとlate-discard lifecycleを保持するが、T998が全real portをbindしT1000–T1002がpublication/API behaviorをcloseするまでproduction all-three activationを主張しない処理を`src/session/session.ts`と`src/session/scan-generation.ts`へ実装する
- [ ] T959 [US4] Generic coordinatorへ接続するfoundation `POST /api/v1/global/enable` adapterを`src/host/api-router.ts`へ実装し、initial enable/retryをpoisoned-registry pre-schedule gateで`409 resource-cleanup-restart-required`、ID/job/control/Source/generation/state mutation/I/O 0件とする。Strict selector-free guard、stored preview、constant-time digest、fixed-three confirmation、server-derived exact `retryableTools` setとnonempty gate、provisionalな`pendingTools`/`batchStatus` mutationを行わず`globalEnableInProgress`だけを公開するoperation-local validation、accepted/rejected partition、queued one shared IDまたは`active-no-job` null ID、retry/disable conflict、Source summary/client authorityなし、generic pre-/post-acceptance OperationError/no raw cause/no partial subsetも保証する。Unbound production member portはrejection/admissionをfabricateせずrootへaccessできず、T998/T1002が最初のcomplete all-real-port endpointを所有する
- [ ] T960 [US4] Single explicit fixed-three confirmation controlをselector-free endpointへ直接接続し、per-tool selectorを決して提供しない。Stale preview、accepted/rejected partition、one shared batch、`active-no-job`、generic OperationError、accessible focusを`app/pages/global-consent.vue`へ実装する
- [ ] T961 [US4] Retry validation/admission中は`globalEnableInProgress`だけを公開してexactなpre-operation control/pending/retryable/batch/diagnostic projectionを保持し、atomicなqueued acceptanceだけがadmitted accepted-batch subset/shared request IDを参照するpending entryと対応する`batchStatus`を設定するfixed-three controlsを実装する。Pending終了後のretryable entryはnon-pending unpublished-admittedとsame-preview-rejectedからなるexact `retryableTools` setだけとし、lexical new-preview-required controlを除外する。Evaluated missing toolの`active-no-job`やunpublished memberがnew Sourceを意味したりcarried existing Sourceを隠したりしないことを`app/components/consent/GlobalSourceControls.vue`で保証する
- [ ] T962 [US4] Fixed-three Global admission、single batch/request、accepted/rejected、`active-no-job`、retryable boundary/fallback、generic OperationError、pre-commit new/provisional Sourceなし対visible carried Sourcesについて意味同等の英日messageを`app/locales/en.ts`と`app/locales/ja.ts`へ追加する

---

## フェーズ 97: Claude Global Batch Member（Composite Slice 2/4）

このsliceはopenなPhase-96–99 composite checkpointへreal Claude portを追加するが、独立してgreenまたはrelease可能なcheckpointではない。

**目的**: Claude root admission/scanningをsame fixed-three `GlobalBatchScan`内のseparately identified Source candidateとして追加し、one rootを保ち、independent initial/retry jobまたはcommitを作らない。

**独立テスト**: Fixed-three operation内でvalid/invalid Claude rootをpartitionし、exact `CLAUDE.md`だけを読み、Claude control/contextをone possible batch memberとして保持する。Admitted sibling Sourceはbatchのone generationですべて同時に現れるか、throw/rejection後はどれも現れず、exact exclusionとprior Repository/Global stateを維持する。

**目に見えるチェックポイント**: Global controlはone shared operation内のClaude per-tool outcomeを報告し、new/provisional Claude Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### テストを先に

- [ ] T963 [P] [US4] Fixed-three operation内のClaude post-consent boundary failing testを追加する。Canonical root、raw/NFC/alias identity、link、invalid override、missing/unreadableを扱い、central safe-fs wrapperがexact structural-root-`lstat` `ENOENT`を変換したtyped `absent` outcomeまたはdeterministic lexical/link/type/boundary returnだけはClaudeをrejectしてsiblingsをeligibleのままにする。Typed post-observation `entry-disappeared`はroot/ancestor/directory roleではSourceなしでmemberをrejectし、terminal regular-file candidateではfile-scoped `safe-fs-entry-stale`へmapしてcomplete-traversal/confirmed-closure contracted-partial batchだけからClaude Sourceへ寄与できることを要求する。その他throw/rejectionは変更なしに伝播してwhole batchをabortしsubset Source/generationを0件とし、host consent codeのfilesystem call/error-code inspectionも0件であることを`tests/unit/host/global-consent.test.ts`で証明する
- [ ] T964 [P] [US4] Claude Global `CLAUDE.md`だけをreadしneighbor operation 0件、distinct Claude control/contextだがindependent jobなし、admitted missing memberのpre-commit new/provisional Source 0件、carried Sources visible、raw/NFC/alias、one shared batch request/working set、atomic all-member publication、whole-batch throw abort、Repository/prior Source retentionを検証する。さらに、全proposed-root operationがcentral safe-fs serviceだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で検証する
- [ ] T965 [US4] 参照だけの Claude User 振る舞いセット、`claude.global.instructions`、正確な `claude.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T966 [US4] 有効化前にすべての Claude User 振る舞いがすでに所有されていたこと、`claude.global.instructions` が読み取りを新たに許可する唯一の Claude ルールであること、`claude.excluded.user-runtime` が新たに所有される唯一の Claude 除外であることを証明する、失敗する Claude Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T967 [US4] Fixed-three controls内のClaude confirmed/pending/retryable outcome、shared batch request/progress、deterministic per-tool Diagnostic、generic whole-batch OperationError、pre-commit new/provisional Claude Source/file row 0件対visible carried Sources、atomic sibling publication、Repository retentionのbrowser acceptanceを`tests/e2e/global-claude-admission.spec.ts`へ追加する

### 実装

- [ ] T968 [US4] Claude root-admission orchestrationをone fixed-three memberとして実装する。Frozen parsed operand/compiled planをexisting central safe-fs boundaryへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはone `GlobalBatchScan`へ供給するatomic decisionでだけClaude controlへtransferする処理を`src/host/global-consent.ts`へ実装する
- [ ] T969 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `claude.behavior.user.instructions`、`claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T970 [US4] 同意でゲートされた読み取り許可ルールとして `claude.global.instructions` だけを追加し、正確に非読み取りの `claude.excluded.user-runtime` レコードを `shared/registries/inspection-rules.ts` で所有する
- [ ] T971 [US4] 新しい戦略 ID を作成せず、既存の Claude 命令戦略を Global 選択、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T972 [US4] ソース ID を作成せず、Claude Global のカバレッジについて既存の公式ソースのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T973 [US4] 同意済み境界の配下で Claude `CLAUDE.md` だけを処理し、正確な `claude.excluded.user-runtime` の強制を `src/inspection/rules/claude.ts` に実装する
- [ ] T974 [US4] Claude scanをsingle `GlobalBatchScan`のone memberとして実装し、exact one root、raw/NFC/alias、deterministic member Diagnosticを扱う。Root/ancestor/directory `entry-disappeared`はSourceなしでそのmemberを終了してsiblingsをeligibleのままにし、terminal regular-file candidate `safe-fs-entry-stale`はcomplete-traversal/confirmed-closure contracted-partial member resultだけへ寄与できる。全admitted memberのcommittable resultがone generationで同時publishされるまでnew/provisional member Sourceを0件とし、carried Sourcesをvisibleに保ち、member throw/rejectionは変更なしに伝播してwhole batchをabortする処理を`src/inspection/scan.ts`へ実装する
- [ ] T975 [US4] Claude control/context outcomeとretry stateをindependent jobではなくone serialized fixed-three admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有しone atomic commitまでprior stateを保持する。Non-carveout throw/rejectionはshared IDのone accepted-job OperationError、new item/Source/result/generationまたはinitial/retry stale overlay 0件とし、late workを`src/session/session.ts`でdiscardする
- [ ] T976 [US4] Claude Global admission、exact exclusion、shared-batch progress、deterministic rejection/retry、whole-batch OperationError、pre-commit new/provisional Sourceなし対visible carried Sourcesについて意味同等の英日messageを`app/locales/en.ts`と`app/locales/ja.ts`へ追加する

---

## フェーズ 98: Copilot Global Batch Member（Composite Slice 3/4）

このsliceは同じopen composite checkpointへreal Copilot portを追加するが、独立してgreenまたはrelease可能ではない。

**目的**: Copilot root admissionとtwo exact instruction selectorをsame fixed-three `GlobalBatchScan`内のseparately identified Source candidateとして追加し、exact Copilot/shared exclusionを所有する。

**独立テスト**: Fixed-three operation内でvalid/invalid `COPILOT_HOME`をpartitionし、two exact selectorだけを読み、behavior partitionをmappingする。Admitted sibling Sourceはone batch generationですべて同時に現れるか、throw/rejection後はどれも現れず、independent Copilot job/commitを作らない。

**目に見えるチェックポイント**: Global controlはshared operation内のCopilot per-tool outcomeを報告し、new/provisional Copilot Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### テストを先に

- [ ] T977 [P] [US4] Fixed-three operation内のCopilot post-consent boundary failing testを追加する。Absent/defaultとinvalid override、canonical root、raw/NFC/alias identity、link、missing/unreadableを扱い、central safe-fs wrapperがexact structural-root-`lstat` `ENOENT`を変換したtyped `absent` outcomeまたはdeterministic lexical/link/type/boundary returned valueだけはCopilotをrejectしてsiblingsをeligibleのままにする。Typed post-observation `entry-disappeared`はroot/ancestor/directory roleではSourceなしでmemberをrejectし、terminal regular-file candidateではfile-scoped `safe-fs-entry-stale`へmapしてcomplete-traversal/confirmed-closure contracted-partial batchだけからCopilot Sourceへ寄与できることを要求する。その他の全throw/rejectionは変更なく伝播してwhole batchをabortしsubset Source/generationを0件とし、host consent codeのfilesystem call/error-code inspectionも0件であることを`tests/unit/host/global-consent.test.ts`で証明する
- [ ] T978 [P] [US4] 2つのexact Copilot Global instruction set、隣接する全User/runtime/managed-remote surfaceへのoperationが0件、distinct Copilot control/contextだがindependent jobなし、admitted missing-Source memberのnew/provisional pre-commit Sourceが0件でcarried existing Sourcesはvisible、exact raw/NFC/alias behavior、one shared batch request/working set、atomic all-member publication、whole-batch throw/rejection abort、Repository/prior-Source preservationに関するboundary testを`tests/integration/global-boundaries.test.ts`に追加する。さらに、全proposed-root operationがcentral safe-fs serviceだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentする
- [ ] T979 [US4] 参照だけの Copilot 振る舞いの分割を具体化する。すなわち、`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞いは `copilot.excluded.user-runtime` だけ、契約で定められた Claude/Codex User と 5 個の Cloud 振る舞いだけは `shared.excluded.managed-remote-state` に対応させ、composition とエビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に追加する
- [ ] T980 [US4] 受け入れた 3 つの振る舞いから Global ルールへの正確なバックリンク、残りの 16 個から `copilot.excluded.user-runtime` への正確なバックリンク、契約対象だけの共有 managed 影響セット、分割をまたぐバックリンクがないこと、新たに読み取りを許可するのが `copilot.global.instructions.root` と `copilot.global.instructions.path` だけであること、新たに所有されるベンダー除外が 1 つ、共有除外が 1 つであることを証明する、失敗する Copilot Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T981 [US4] Fixed-three control内のCopilot confirmed/pending/retryable outcome、shared batch request/progress、deterministic invalid-override Diagnostic、generic whole-batch Operation Error、new/provisional pre-commit Copilot Source/file rowが0件でcarried existing Sourcesはvisible、atomic sibling publication、retained Repository resultに関するbrowser acceptanceを`tests/e2e/global-copilot-admission.spec.ts`に追加する

### 実装

- [ ] T982 [US4] Copilot root-admission orchestrationをfixed-threeのone memberとして実装する。Absent/defaultとinvalid previewを区別し、frozen parsed operand/compiled planをexisting central safe-fs boundaryへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはone `GlobalBatchScan`へ供給するatomic decisionでだけCopilot controlへtransferする処理を`src/host/global-consent.ts`へ実装する
- [ ] T983 [US4] すでに所有されている振る舞いを、互いに素な 3 つの相互バックリンクセットで更新する。`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞い（`copilot.behavior.vscode.user.claude`、`copilot.behavior.vscode.user.skills`、`copilot.behavior.vscode.user.agents`、`copilot.behavior.vscode.user.prompts`、`copilot.behavior.vscode.user.hooks`、`copilot.behavior.vscode.user.mcp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.skills`、`copilot.behavior.cli.user.agents`、`copilot.behavior.cli.user.hooks`、`copilot.behavior.cli.user.mcp`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.plugins`、`copilot.behavior.cli.user.lsp`、`copilot.behavior.cli.user.extensions`）は `copilot.excluded.user-runtime` だけ、契約で定められた共有 managed セット（`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.settings`、`codex.behavior.user.config`、`codex.behavior.user.plugins`、`copilot.behavior.cloud.mcp`、`copilot.behavior.cloud.organization-agents`、`copilot.behavior.cloud.organization-instructions`、`copilot.behavior.cloud.plugins`、`copilot.behavior.cloud.remote-skills`）は `shared.excluded.managed-remote-state` だけに対応させ、振る舞い ID を追加または再定義せずに `shared/registries/vendor-behaviors.ts` で更新する
- [ ] T984 [US4] 正確な 3 つの受け入れ済み振る舞い参照を持つ `copilot.global.instructions.root` と `copilot.global.instructions.path` だけを追加し、残りの 16 個の User 振る舞い参照だけを持つ正確な `copilot.excluded.user-runtime` を所有し、契約で定められた Claude/Codex User と 5 個の Cloud 参照だけを持つ 1 つの共有非読み取り `shared.excluded.managed-remote-state` を `shared/registries/inspection-rules.ts` に追加する
- [ ] T985 [US4] 新しい戦略 ID を作成せず、既存の Copilot CLI/VS Code 命令戦略を Global の適用可能性とソース分離によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T986 [US4] ソース ID を作成せず、正確な受け入れ済み 3 件の Global ルール、残り 16 件の User-runtime、契約で定められた shared-managed の各分割について、既存の公式ソースバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T987 [US4] 同意済み境界の配下で Copilot `copilot-instructions.md` と `instructions/**/*.instructions.md` だけを処理し、正確な `copilot.excluded.user-runtime` と `shared.excluded.managed-remote-state` の強制を `src/inspection/rules/copilot.ts` に実装する
- [ ] T988 [US4] Copilot scanningをsingle `GlobalBatchScan`のone memberとして実装し、instruction-subtree-only traversal、exactly one root、raw/NFC/alias semantics、deterministic member Diagnosticsを扱う。Root/ancestor/directory `entry-disappeared`はSourceなしでそのmemberを終了してsiblingsをeligibleのままにし、terminal regular-file candidate `safe-fs-entry-stale`はcomplete-traversal/confirmed-closure contracted-partial member resultだけへ寄与できる。全admitted memberのcommittable resultがone generationで同時publishされるまでnew/provisional member-Sourceを0件とし、carried existing Sourcesをvisibleに保ち、member throw/rejectionは変更なく伝播してwhole batchをabortする処理を`src/inspection/scan.ts`へ実装する
- [ ] T989 [US4] Copilot control/context outcomeとretry stateをindependent jobではなく、one serialized fixed-three admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有し、one atomic commitまでprior stateを保持し、non-carveout throw/rejectionではshared IDにone accepted-job Operation Errorだけをpublishしてnew item/Source/result/generationおよびinitial/retry stale overlayを作らず、その後late workをdiscardする処理を`src/session/session.ts`へ実装する
- [ ] T990 [US4] 意味的に同等な英語/日本語のCopilot Global override、admission、exact exclusion、shared-batch progress、deterministic rejection/retry、whole-batch Operation Error messageを`app/locales/en.ts`と`app/locales/ja.ts`に追加し、new/provisional pre-commit Sourceがないことと、visibleなままのcarried existing Sourcesを明確に区別する

---

## フェーズ 99: Atomic Global Batch Result統合（Composite Closure 4/4）

**目的**: 3つのreal member-admission portをすべてbindし、one initial/retry `GlobalBatchScan` commitだけで0〜3個のseparately identified one-tool/one-root Global Sourceを統合してroot mergeまたはper-tool commitを公開せず、Phase-96–99 composite checkpointをcloseする。

**独立テスト**: Fixed tupleから0〜3 rootを決定的にadmitし、empty subsetはnew job/generationなしでcarried stateを保持し、nonempty subsetはone request/working set/result/generationですべてのseparate Sourceを同時publishする。Stable Source ID、rekey、57-rule total、partition、non-carveout whole-batch abort、detail/comparison、exclusion、non-pending unpublished admittedとsame-preview rejectedからなるexact `retryableTools` controlを検証する。

**目に見えるチェックポイント**: Admitted Codex/Claude/Copilot Global Sourceはone batch commit後にseparateかつsimultaneousに現れ、その後Sourceごとにfilter、inspect、compare、explicit rescanできる。

### テストを先に

- [ ] T991 [P] [US4] Exact three vendor instruction setとone fixed-three transactionに関するintegrated boundary testを`tests/integration/global-boundaries.test.ts`へ追加する。Admitted root 0件ならnew `scanRequestId`/job/Source/generationを割り当てず、全carried Source/controlとprior snapshotを保持する。1〜3件ならtoolごとに別々に識別されるone-tool/one-root Sourceをone shared request IDかつexactly one completeまたはcontracted-partial generationで同時にpublishし、root/ancestor/directory `entry-disappeared`をSource-fatal、terminal regular-file candidate disappearanceだけをfile-scoped `safe-fs-entry-stale`としてそのcontracted-partial generationへpublish可能とし、observableなper-tool commitを一切行わない。各escaped boundaryを保持したraw contextからone-wayで導出し、raw filesystem operand、各Source内でcollision-freeなNFC primary/alias semanticsとdistinct provenanceを保持し、preview/display labelをauthorityへreverseせず、excluded-surface readを0件とし、全non-carveout throw/rejectionでsubset全体をabortし、Repository/prior Sourcesを保持する
- [ ] T992 [US4] 正確に57個のrule ID（Global前の49-ID gateに3 vendor `*.excluded.user-runtime` record、`shared.excluded.managed-remote-state`、4 Global static read-authorizing ruleを加えたもの）、exact exclusion ownership、reciprocity、内包Hook/MCP candidate addition 0件、existing-source evidence backlinkを証明するfinal Global registry contractを`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts`へ追加する
- [ ] T993 [P] [US4] 全admitted tool-specific Sourceのone atomic batch publication、one shared request ID/authority/working set/resultとexactly one generation、stable `Source.sourceId`、one-root/tool invariant、保持raw contextからのone-way boundary、generation-owned ID rekeyを伴うcarried-Source semantic preservation、terminal regular-file candidate `safe-fs-entry-stale`を含みroot/ancestor/directory disappearanceをSource-fatalとするdeterministic contracted-partial member outcome、per-tool commitなし、one generic Operation Errorかつsubset/stale overlayなしのwhole-batch throw/rejection failure、exact `retryableTools` projectionとoperation-local validation対accepted pending-state lifecycle、progress、conflictに関するcoordinator testを`tests/unit/session/coordinator.test.ts`に追加する
- [ ] T994 [P] [US4] One successful initial/retry batchがsession generationをexactly onceだけadvanceし、全admitted Sourcesを同時にpublishし、process-lifetime Source IDとcarried semantic inventory/authored contentを保持し、全generation-owned file/recognition/provenance/relationship/Diagnostic IDをrekeyし、stale FileDetail/comparison/Monaco stateをinvalidateし、provisional context/pending admissionを漏らさないことを証明するlifecycle testを`tests/integration/session-lifecycle.test.ts`に追加する。どのpollもintermediate per-tool commitを観測できないことも証明する
- [ ] T995 [P] [US4] Globalのliteral credential、environment reference、process sentinel、executable-looking inert payload、binaryと`utf-8-replaced` file、注入throw/rejection、mutation observationに関するfailing exact-display API/integration testを`tests/contract/http-api-files.test.ts`と`tests/integration/global-literal-display.test.ts`へ追加する。Readable textはsubstitutionなしにexactで、binaryはdiagnostic-onlyであり、全non-carveout throw/rejectionはdomain classification/retry/resultなしに伝播してwhole shared batchをabortし、subset/generationをcommitせず、raw causeやinitial/retry stale overlayのないgeneric pre-またはaccepted-job Operation Errorとしてのみ現れ、prior stateとfilesystem observationを保持することを証明する
- [ ] T996 [P] [US4] 記録済みlocal Global fixture rootとinstrument済みproduct socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceを使うfailing zero-activation security testを追加する。Exactな2つのFR-022 authorized internal loopback classを別々に分類・検証し、それ以外の全surfaceについてdynamic evaluation、command/hook execution、browser-helper launch、禁止対象のdirect product-issued outbound/MCP request、environment substitution、mutation-capable filesystem callが0件であり、explicit UNC/server-share/device rootではfilesystem/DNS/SMB call 0件となり、documented OS-mediated mounted/mapped-storage limitationを保持することを証明する。Operational outputはpath/content-free fixed-code/opaque-IDだけとし、Source Condition Factがlocal/hosted I/O、file/relationship/comparison identityを作らないことを`tests/security/global-zero-activation.test.ts`と`tests/integration/source-condition-facts.test.ts`で証明する
- [ ] T997 [US4] Selector-free fixed-three enablement、`active-no-job`、one shared batch requestに関するbrowser acceptanceを`tests/e2e/global-enable.spec.ts`へ追加する。別々に識別されるadmitted Sourcesがone generation後に同時に現れ、escaped inert boundaryがpreviewおよびSource-relative pathと区別され、filter、Diagnostic、replacement characterを含むexact readable literal、diagnostic-only binary、activation/substitution/analysis/verdictなし、Fact isolation、detail reuse、cross-Source comparisonを扱うことを検証する。Non-carveout batch throw/rejectionではone generic Operation Errorだけを表示し、subset/generationまたは`StaleSourceFailure`をpublishせず、prior Repository/Global stateとstable Source IDを保持する

### 実装

- [ ] T998 [US4] Real T951/T968/T982 Codex/Claude/Copilot portを3つのone-root `GlobalToolControl` recordとoperation-local contextとしてbindしてfixed-three post-consent admissionを完成させる。全toolのinitial evaluation、non-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するserver-derived exact `retryableTools` retry、deterministic rejected partition、および全admitted context/IDのexactly one `GlobalBatchScan`へのone atomic transferを`src/host/global-consent.ts`へ実装する。残存するinjected test outcomeまたはunbound production portを禁止し、independent per-tool jobまたはnew/provisional pre-commit Sourceを作らず、carried existing Sourcesをvisibleに保ち、transfer前の全non-carveout throw/rejectionを伝播する
- [ ] T999 [US4] すべてのGlobal behavior、正確に4 Global static candidate rule、既存のexact exclusion、strategy reference、48 source backlink、正確な57-rule totalを`shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts`で完成させる
- [ ] T1000 [US4] 全admitted tool/root memberをone request/publication authority/working setでconsumeするone integrated `GlobalBatchScan`を`src/inspection/scan.ts`へ実装する。各memberのselector/root/Source identityをisolateし、exact Codex fallbackとraw/NFC/alias ruleを適用し、terminal regular-file candidate `safe-fs-entry-stale`はcomplete traversal/confirmed closure後だけcontracted-partial member resultへ含め、root/ancestor/directory disappearanceはSource-fatalとしてdeterministic completeまたはcontracted-partial member resultをassembleする。Coordinatorがwhole batchをacceptするまでnew/provisional member result/Sourceをpublishせず、carried existing Sourcesをvisibleに保つ。Non-carveout member throw/rejectionは変更なく伝播させ全siblingをabandonする
- [ ] T1001 [US4] Single batchがcomplete traversal/confirmed closure後にcommittableなcompleteまたはcontracted-partial resultを持つ場合だけ、全admitted tool-specific Global Sourceを同時にatomic publishする処理を`src/session/session.ts`と`src/session/scan-generation.ts`へ実装する。Terminal regular-file candidate `safe-fs-entry-stale`はそのpartial publicationで許容するがroot/ancestor/directory disappearanceは許容しない。各boundaryをadmitted raw contextからone-wayで構築し、internal authorityをDTO/log外に保ち、Repository/prior Global semantic contentと全Source IDを保持し、session generationをexactly once advanceし、全generation-owned IDをrekeyし、old detail/comparison/editor stateをinvalidateし、participating deterministic failureだけをclearする。Zero-admitted operationはnew `scanRequestId`/job/Source/generationを割り当てず全carried Source/controlとprior snapshotを保持し、non-carveout throw/rejectionまたは他のnoncommittable batch outcomeはsubset/generationをcommitせずprior graph/retry controlを保持し、initial/retryで`StaleSourceFailure`を作らない
- [ ] T1002 [US4] `POST /api/v1/global/enable` responseをexact fixed-three accepted/rejected partition、nonempty batchのone shared request IDと`queued`、empty subsetのnullと`active-no-job`、conflict、retry state、generic pre-/post-acceptance Operation Errorについて完成させる。全admitted-member Source publicationをone atomic batch commit後のlater session pollへ委ね、carried existing Sourcesを保持する処理を`src/host/api-router.ts`に実装する
- [ ] T1003 [US4] Repositoryと別々に識別されるCodex/Claude/Copilot Global Sourceおよびtool filter、enabled Sourceごとのescape済みでinertな`SourceBoundary.displayRoot`/`origin`をconsent-preview displayとSource-relative item pathから区別してrenderしlocatorにしないone-root summary、共通のdetail navigation、Global commit後のcross-Source対応comparison navigationを`app/composables/filters.ts`、`app/composables/session.ts`、`app/pages/index.vue`に実装する
- [ ] T1004 [US4] One shared batch request/progressに結び付くfixed-three confirmationとper-tool outcome/retry control、focus recovery、`active-no-job`、generic whole-batch Operation Error、simultaneous separate-Source outcome presentationを`app/pages/global-consent.vue`と`app/components/consent/GlobalSourceControls.vue`で完成させ、自動更新statusにはT071のpause/resumeとon-demand-refresh contractを再利用する
- [ ] T1005 [US4] 意味的に同等な英語/日本語のfixed-three/single-batch、one-root separate Source、accepted/rejected、`active-no-job`、whole-batch failure、carried existing Sourcesをvisibleに保つretry、source/tool-filter、detail/comparison、shared-progress messageを`app/locales/en.ts`と`app/locales/ja.ts`に追加する

---

## フェーズ 100: Global の再スキャンと回復

**目的**: 明示的な Global 再スキャン、FIFO 直列化、atomic carried-Source generation construction、致命的な試行後の回復を追加する。

**独立テスト**: Repository と Global の作業をキューに入れ、contracted-partialおよび致命的な Global の試行を開始し、デキュー時の世代、プロセスの存続期間中に安定する Repository と Global の `Source.sourceId` 値、世代所有グラフ ID だけの再キー化、environment-owned capacity 下の atomic publication、重複競合、保持された同意/境界/以前のグラフ、明示的な再試行の成功を検証する。

**目に見えるチェックポイント**: ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。

### テストを先に

- [ ] T1006 [US4] Serialized cross-source FIFO、dequeue-time generation、admission/progress/final status/commitにわたるone `scanRequestId`、duplicate conflict、fatal retention、per-job counterのfailing coordinator testを追加する。全non-carveout throw/rejectionはdomain catch/cause classificationなしに変更なく伝播し、item/recognition/derived result/Diagnostic/result body/generationを作らずabortし、prior snapshotを保持し、accepted explicit rescanはsame request IDのgeneric Operation Errorだけでterminalになることを`tests/unit/session/coordinator.test.ts`で証明する
- [ ] T1007 [US4] Carried-Source graph construction、lifecycle/control state、serialized state transition、およびprocess-wide registryのresource recordごとのone shared close attemptについてcoordinator testを`tests/unit/session/coordinator.test.ts`で拡張し、registry-confirmed close、`close-unknown`、poison、late FileHandle confirmation、directory restart semanticsを扱う。Disable/shutdown/supersession後のpublication-authority revocation、pending filesystem workのcleanup-only handling、late discard、後続source I/Oなし、responsive API、hard-cancellation assertionなしも検証する
- [ ] T1008 [P] [US4] Strict `sourceId`、`ScanAdmission { scanRequestId, source }`、same-ID waiting/active/final status/successful generation、one identified Global Source、unknown/removed Source、disable-pending/duplicate conflict、older stateをcompletionとしてrejectする`POST /api/v1/global/rescan` failing contractを追加する。Poisoned process-wide registryはadmission/schedule前に`409 resource-cleanup-restart-required`、ID/job/state mutation/I/O 0件で拒否して全prior Source/control/stale stateを保持する。Pre-acceptance throw/rejectionはgeneric null-ID Operation Error/jobなし、accepted rescan throw/rejectionは同じrequest IDのretained generic errorだけを公開しattempt result/generation/raw causeを作らず、stale prior snapshotとSource stale referenceを持つこと、retry/stale IDを`tests/contract/http-api-global.test.ts`で扱う
- [ ] T1009 [P] [US4] 有効化の完了、キューに入った Repository/Global スキャン、contracted-partial publication、致命的な失敗時の保持、明示的な再試行、変更されない同意/境界について、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1010 [P] [US4] 全admitted Sourceを同時にpublishしてexactly one generationだけ進めるsuccessful initial/retry batchと、対象Sourceだけをreplaceし他をすべてcarryする後続のsuccessful explicit single-Source Global rescanを区別するlifecycle testを`tests/integration/session-lifecycle.test.ts`へ追加する。どちらも全Source IDとcarried semantic inventory/authored contentを保持し、全generation-owned graph IDをrekeyしてold FileDetail/comparison/Monaco stateをinvalidateする。Explicit rescanだけが対象Sourceのstale referenceをclearし、all-rejected enable/retryはgenerationもID changeもcommitしないことを証明する
- [ ] T1011 [US4] Global 再スキャン、待機中/アクティブの進捗、重複防止、contracted-partial diagnostic、致命的な失敗の再試行、以前の結果の保持について、ブラウザ受け入れテストを `tests/e2e/global-rescan.spec.ts` に追加する

### 実装

- [ ] T1012 [US4] 識別済みのtool-specific Global Source 1つに対するFIFO rescanを実装する。Completeまたはcontracted-partialのsession-wide commitでは、すべてのSource IDを保持し、carried/replaced generation-owned graph IDを再生成し、rescanned Sourceのstale failureだけをclearし、sibling failureを保持して、古いFileDetail/comparison stateを無効化する。対象は`src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts`とする
- [ ] T1013 [US4] Serialized carried-source generation/per-job counterを実装する。Structural-lstat exact ENOENT以外のthrow/rejectionはsession/scan domainでcatch/cause分類/retry/Diagnostic/item/recognition/result/body/generation化せず変更なしにtrigger-owning boundaryへ伝播しprior snapshotを保持する。Disable/shutdown/supersessionではauthority revokeしlate workを1回release/discardする処理を`src/session/session.ts`と`src/session/scan-generation.ts`へ実装する
- [ ] T1014 [US4] One opaque `sourceId`のstrict `POST /api/v1/global/rescan`を実装し、poisoned process-wide registryはadmission/schedule前に`409 resource-cleanup-restart-required`、ID/job/state mutation/I/O 0件でgateして全prior Source/control/stale stateを保持する。それ以外はrequest IDをadmission/progress/status/commitで保持し、disable/duplicate conflictをenforceし、non-carveout throw/rejectionはこのREST boundaryだけでcatchしてaccept前null-ID/no-jobまたはaccept後same-ID retained generic OperationError/no result-generation-raw cause/stale prior snapshotとする。Retry/stale Sourceとpath-free operational outputを`src/host/api-router.ts`で保証する
- [ ] T1015 [US4] Global 再スキャンのロード、重複抑止、古い状態からの回復、致命的な失敗の再試行、進捗更新を `app/components/consent/GlobalSourceControls.vue` と `app/composables/session.ts` に実装する
- [ ] T1016 [US4] 意味的に同等な英語/日本語の Global 再スキャン、キュー、publicな`partial`（contracted-partialのみ）、失敗時の保持、再試行メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 101: Global 無効化バリアと解体

**目的**: Recover可能なpriority zero-I/O disable barrier、full client-data purge/fence、および正確な`remove-active-state`とoperation-local `cleanup-only` outcomeを追加する。

**独立テスト**: Disable request前にbrowserをpurgeし、Repository/enable/Global work中にdisableしてfailure後にrepeat/join/retryする。Epoch/fence response gate、control-only recovery、generic errorとclose未確認時のrestart、registry-owned cleanup、N+1 Repository-only `remove-active-state`、未公開initial enableだけのgeneration-preserving `cleanup-only`、accept前failure/true no-op後のimmediate fresh-snapshot recoveryを検証する。

**目に見えるチェックポイント**: Disableはbrowserの全inspection contentを即時削除し、fence中はrecovery controlだけを表示し、confirmed terminal success後にfresh Repository-only snapshotを復元する。

### テストを先に

- [ ] T1017 [US4] First non-no-op disable acceptanceがatomicに`commitKind`を固定・保持し、`globalContentEpoch`をincrementし、non-null `globalDisableInProgress`をinstallし、authorityをrevokeしてdata fenceを有効にするfailing coordinator testを追加する。Public Global consent/control/Sourceがあれば`remove-active-state`でRepository-only N+1とgeneration ID rekey、未公開operation-local initial enableだけなら`cleanup-only`でN/全ID保持とする。True no-opには、tool固有Global Source/graph、active consent、retained admitted root context、`opening`/`open`/`closing`/`close-unknown`のaffected `FileHandle`/`fs.Dir` registry record、running/queued Global scan/enable work、retained disable failureがすべて存在せず、registryもpoisonedでないという完全な条件が必要であり、無関係なRepository workは妨げにならないことを証明する。Join、failed barrier/retry lineage、generic OperationError、exact resource reference、および同じ`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持してexisting commandを`waiting`へ戻し、新しいREST admissionもinterim successも作らない、success後だけのRepository requeue exactly onceを扱い、rollback/rebase禁止を`tests/unit/session/coordinator.test.ts`で証明する
- [ ] T1018 [P] [US4] Strict empty-body `POST /api/v1/global/disable`、完全なtrue-no-op条件とmutationlessな`200` result、無関係なregistry poisonに対するmutationlessな`409 resource-cleanup-restart-required`、one current lock snapshotからprojectされcurrent non-null fenceを報告できるexact liveness `{ sessionId, globalContentEpoch, globalDisableInProgress }`、captured epochがcurrentのままかつcurrent fenceがnullの場合だけinspection-data successを許可する一方でliveness successにはsame-lock current epoch/current-fence projectionを返すfinal response gate、fence中session routeのsole `GlobalFenceRecoverySnapshot`、他の全inspection-data/generation mutation routeの`409 global-disable-pending`、join/retry/failed、pathless generic OperationError、exact N/N+1 terminal bufferのfailing contractを`tests/contract/http-api-global.test.ts`と`tests/contract/http-api-session.test.ts`へ追加する
- [ ] T1019 [P] [US4] Interrupted Repository/enable/Global work、queued cancellation、acceptance対buffer-bound race、joined disable、同じcleanup lineage/epoch/commit kindを使うretained failure/retry、terminal success後に同じID/owner/Source/orderのcommandを新しいadmissionまたはinterim successなしで`waiting`へ正確に1回requeueすること、true no-op、pre-acceptance failureを検証する。Post-acceptance failureでfenceが再開せずstale captured-epoch responseがpublishされないことを`tests/integration/global-concurrency.test.ts`で証明する
- [ ] T1020 [P] [US4] Disableがenumeration/read 0件、expected-cancellation Diagnostic 0件であり、process-wide `ClosableResourceRegistry`から影響する全FileHandle/`fs.Dir` recordをadoptしてresourceごとのcloseを1回joinし、全recordが`close-confirmed`になるまでcompleteしないことを計装する。FileHandle event/promise race、`close-unknown`、late-event recovery、directory restart、guessed closure禁止を`tests/integration/global-boundaries.test.ts`で扱う
- [ ] T1021 [P] [US4] Browserがdisable送信前とgreater epoch/non-null fence render前にfull purgeし、session/inventory/Source/file/Diagnostic/relationship/authored/detail/comparison/Monaco/filter/warning/acknowledgementをすべて削除するlifecycle testを追加する。Fence中はlivenessと`GlobalFenceRecoverySnapshot`だけ、`remove-active-state`後はfresh Repository-only N+1、`cleanup-only`後はunchanged N、accept前failure/no-op後はimmediate full snapshotとする。Late resultなし、confirmed registry cleanupだけのresource releaseを`tests/integration/session-lifecycle.test.ts`で証明する
- [ ] T1022 [US4] Preview/enable/rescan/disable、pre-request purge、epoch/fence observation purge、exact control-only failed/retry/join/restart recovery、purged content非復元、enable/disable race、focus、fresh terminal snapshotのbrowser acceptanceとGlobal-consent targetを追加する。Public-state N+1 `remove-active-state`、unpublished-initial-enable N `cleanup-only`、accept前/no-op immediate recoveryを`tests/e2e/global-disable.spec.ts`と`tests/e2e/global-consent.spec.ts`で扱う

### 実装

- [ ] T1023 [US4] Serialized priority zero-I/O barrierを実装する。First non-no-op acceptanceで`remove-active-state`/`cleanup-only`を固定し、command/content epochをincrement、fence install、authority revoke、Global work cancelを行い、running Repository workをterminal success後だけ正確に1回requeueするため保持する。そのexisting commandのexactな`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持して`waiting`へ戻し、新しいREST admissionまたはinterim successを作らず、exact operation/error/cleanup lineageをfailure/join/retryで維持する。Coordinator ownership下で、tool固有Global Source/graph、active consent、retained admitted root context、`opening`/`open`/`closing`/`close-unknown`のaffected `FileHandle`/`fs.Dir` registry record、running/queued Global scan/enable work、retained disable failureがすべて存在せず、registryもpoisonedでないという完全なtrue-no-op条件を評価し、無関係なRepository workは許容する。True no-op/accept前failureはI/Oもjob作成も行わずgeneration、epoch、fenceを変更せず、accept後failureは全dataをfenceしたままにする処理を`src/session/session.ts`へ実装する
- [ ] T1024 [US4] Process-wide `ClosableResourceRegistry`だけでcleanupし、late opening-resource adoption、shared close promise/event、confirmed-close requirement、poison/restart、retry sweep、double-close/hard-cancellation claim禁止を実装する。Fully encoded success buffer準備後、`remove-active-state`ではRepository-only N+1/rekey/removal、`cleanup-only`ではunpublished operation-local stateだけを除去してN/全IDを保持し、最後にfenceをclearする処理を`src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts`へ実装する
- [ ] T1025 [US4] Strict empty-body `POST /api/v1/global/disable`をREST boundaryへ実装し、完全なtrue-no-op条件だけにmutationlessな`200`、otherwise no-op requestに無関係なregistry poisonがある場合はmutationlessな`409 resource-cleanup-restart-required`を返す。Accept前response、first acceptance/join/retry progress、drain/close/serialization failure時にprocess/fenceを維持するgeneric OperationError、unconfirmed cleanupのrestart guidance、exact terminal generation/commit-kind response、immutable buffer deliveryを`src/host/api-router.ts`で保証する
- [ ] T1026 [US4] Pre-request full client-data purge、disable submit/loading、fenced `GlobalFenceRecoverySnapshot` render、failed retry/join/restart control、no-op/accept前failureのimmediate full refetch、terminal fresh-snapshot adoption、focus restorationを`app/pages/global-consent.vue`、`app/components/consent/GlobalSourceControls.vue`、`app/composables/session.ts`へ実装する
- [ ] T1027 [US4] Shared full-purge/response gateを実装する。Disable前またはgreater epoch/non-null fence観測時にsensitive-content acknowledgementを含む全session/Global/Repository DTO/rendered/derived stateをclearし、stale/late responseを拒否する。Fence中はcapabilityとexact control/error recoveryだけを保持し、fence clear後はpurged contentを再構築せずauthoritative full snapshotをfetchする処理を`app/composables/filters.ts`、`app/composables/liveness.ts`、`app/composables/comparison.ts`、`app/composables/monaco.ts`へ実装する
- [ ] T1028 [US4] Pre-request purge、epoch/fence control-only recovery、failed retry/join/restart、true no-op/accept前failure refetch、`remove-active-state` Repository-only N+1、operation-local `cleanup-only` unchanged Nについて意味同等の英日messageを`app/locales/en.ts`と`app/locales/ja.ts`へ追加する

---

## フェーズ 102: ドキュメント、エビデンス、依存関係のレビュー

**目的**: 二言語の運用ガイダンス、公式ソースのエビデンス、適合データ、レビュー済みの依存関係判断を完成させる。

**独立テスト**: environment-owned capacity の explicit opt-in official-source workflowを実行し、すべての drift/dependency 判断をレビューし、同期された英語/日本語ガイダンスと適合レコードを検証する。

**目に見えるチェックポイント**: メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。

### ドキュメント

- [ ] T1029 `./README.md`/`./README.ja.md`へ意味同等の運用guidanceを作る。Verified launch/`--cwd`/generation 0、allowlist、raw/NFC/pathless collision/hard-link scan-attempt scope、rows 1–28/directory mutation guard、process-wide confirmed-close registry/restartと4 routeのpoisoned-registry pre-schedule `409 resource-cleanup-restart-required`/state-job-I/O 0件、boundary、record-specific evidence assessment、FR-022の禁止対象direct product-issued outbound-request定義、exactな2つのauthorized internal loopback classとstatic path/method対API route/Host/Origin/capability制約、zero-prohibited-request local-fixture assertion、explicit-UNC zero-filesystem/DNS/SMB guarantee、OS-mediated pre-mounted/mapped-network limitation、replacement-decoded readable text/binary、acknowledgement、no verdict/capacity ceiling、structural-`lstat` ENOENT対unchanged propagation、REST OperationError対startup top level、fixed-three Global、FR-042 pre-purge/epoch/fence/exact liveness/recovery/error/retry/join/restart/public-state N+1対unpublished-operation Nを扱う。SC-002、evidence manifest、mutation/atime、privacy/exclusion/maintenance、bilingual 55-row WCAGも含め、`tests/contract/documentation.test.ts`でdivergenceを拒否する
- [ ] T1030 SC-001/SC-006 study-evidence harnessを4つのordered acceptance blockで実装する。(1) Paired inputs and normative contract: `tests/usability/sc001-sc006-study-kit.md`と`tests/usability/sc001-sc006-study-kit.ja.md`、`tests/usability/sc001-sc006-study-inputs/`配下のexact existing sixteen-member bilingual bundle、`tests/usability/sc001-sc006-study-inputs.json`、`tests/usability/sc001-sc006-study-inputs.sha256`をsemantically equivalentかつcandidate-independentに保ち、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`と`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`をexact protocol ownerとし、そのentityを`specs/001-inspect-agent-customizations/data-model.md`および`specs/001-inspect-agent-customizations/data-model.ja.md`と整合させる。`StudyBrowserAttemptBinding`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`subjectId`,`inspectorProcessId`,`state`）、`StudyBrowserRequestCandidate`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）、`StudyServerCorrelationClaim`（`schemaVersion`,`studyRunId`,`correlationId`,`subjectId`,`inspectorProcessId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）のexact root orderを維持する。Raw-value banをcapture/evidence IPC crossingまたはretained/log/output/digest boundaryにscopeし、Basic credential、exact Fetch Metadata/Origin/Referer header、raw `X-Inspector-Study-Correlation`のrequired ephemeral loopback-wire receipt/processingだけを許可して直ちにdiscardする。Strictly decoded canonical 43-character safe IDだけがsafe IPCをcrossし、`correlationId`としてretainされ、canonical safe-payload/downstream evidence-digest chainへ入れる。`pnpm run study:evidence:inputs -- materialize`はsupervisorだけをlaunchする。そのexisting supervisor上の`study:evidence:capture -- start`がlong-lived internal descendant/process exact 8件をlaunchしてstream 3件をopenする。Start時にsupervisorだけがfresh subject token exact 20件をordered setとして生成・所有し、次の各`StudyBrowserAttemptBinding`へnext tokenだけをdistributeし、study-harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootを`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`の順で定義する。Authenticated supervisor `ready`のchild-to-parent sequence `0`後、materializerはparent-to-child sequence `0`でexact-once `runtime-bootstrap`を送る。Supervisorはlexical/canonical/identity root tupleをvalidateしてexact endpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Materializerはtransfer/frame copyを直ちにwipeし、successful role-specific lifecycle closeではedgeだけをdetachしてsupervisorをliveに保ち、validation/bind/ACK failureはabortする。Environmentとargvをauthorityにしない。Raw path、endpoint、token、exact `StudySupervisorRuntimeBootstrap` frame/HMAC processingだけをruntime-bootstrap sensitive privacy exceptionとし、capture/evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootを`schemaVersion`,`studyRunId`,`browserProxyAuthority`の順で定義する。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Supervisor/brokerがfresh `StudyBrowserAttemptBinding`を生成し、stateを`prepared | open | terminalizing | closed`とする。Distinct fresh 32-byte/43-character `browserProxyMarkerSecret`とexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`を生成し、stateを`prepared | active | destroyed`とする。`attempt-binding`はstudy-harness/study-browser-adapterだけへ、authenticated `proxy-marker-install`はsupervisorからstudy-browser-adapterへdirectに送る。`browserAttemptId`をこれらのruntime memory、authenticated frame、browser candidateだけに保ち、browser process/context/profile/configuration/credential/request/application/evidenceへ入れない。Installはpreparedにとどめる。Prepared-binding both ACK後かつparticipant `npx`前にadapterだけがcertified isolated profileをlaunchし、`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でexact bootstrapを完了する。Bodyless `407 Proxy Authentication Required`のonly headerは順に`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、canonical Basic retryはexact 1件、bodyless `204 No Content`のonly headerは`Connection: close`とし、DNS/application/forwarding/candidate/correlation/evidence effectを0件にする。Authenticated bootstrap ACKはmarker copyだけをatomically activeへmoveし、attempt bindingはlater product readiness/open-snapshot dual ACKまでpreparedに保つ。Healthy external browser/environment/bootstrap failureはactiveを経ずmarker copyをdestroyしてadapter-sourced `equipment-failure`を生成し、internal adapter/proxy/controller/CDP/authentication/IPC/child faultはsynthesisせずinvalidateする。以後各study-browser requestにcanonical Basic credential exact 1件を要求し、close/abort/crash/child exit/authentication failureでattempt/marker/secret/install frame/browser copyをwipeする。Exact runtime-only `StudyParticipantNavigationGrant` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`state`と`state: armed | consumed | destroyed`を定義する。Product-probe readiness後、sole expected initial navigation直前にsupervisorがfresh armed grantを作り、proxy injection前にpage/browser codeへ公開せずstudy-browser-adapterへ送る。Fetch Metadataをhuman attestationではなくconsistencyだけとする。Valid secret + current armed grant + exact navigate/document/?1/missing-Origin/none-or-same-origin + exact authorized-static targetだけをparticipantとしgrant correlation IDを使ってonce consumeする。Current grantなし、nonexact target、user-activated page-script navigation、またはprior grant consumption後のfresh participant-shaped HTTP observationはvalid-secret unknownとし、open binding IDsとfresh proxy-generated correlation ID、`productAttributable: true`、`prohibited: true`を使うautomatic-critical browser-only rowとしてDNS/socket/body/response exposure前にblockし、grantをconsumeせずrunもinvalidateしない。Replayed/duplicate/stale authenticated IPC candidate、simultaneous grant-consumption attempt、authenticated attempt/correlation/target mismatchはforward 0件、run invalid、state destroyとする。Bundled-SPAはvalid secret + missing `Sec-Fetch-User` + [exact-issued `Origin` OR (missing `Origin` AND exact-issued `Referer`)]だけとし、extension/browser-only、その他valid-secret unknown/prohibited、missing/invalid-secret unrelated actor rowを保つ。Six headerをindependently compare/discardし、server claimはregistered outer/open-binding equalityを持つparticipant/SPAだけに許可する。Allowed edgeごとにordinary unidirectional anonymous inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をcreateし、IPC materialをenvironment、argv、file、socket、named endpoint、control endpointへ置かない。Parent-to-child pipeは32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`の順のexact 96 binary byteで始まり、EOFを挟まず同じopen pipeでLF-framed parent-to-child messageへ切り替わる。Childはframe parsing前にexact 96 byteをconsumeし、byte 96以後をすべてframe dataとして扱い、byte 96前のEOF/closeをrejectする。Child-to-parent pipeはauthenticated `ready` sequence `0`で始める。`ready` payloadのexact rootは`schemaVersion`,`bootstrapNonce`,`componentRunId`で、`schemaVersion: 1`、canonical bootstrap nonce、canonical component IDを持ち、parentはseed/nonceをdestroyする前にこれをauthenticate/consumeする。全`acknowledgement` payloadのexact rootは`schemaVersion`,`acknowledgedSequence`,`result`、`result: accepted`とし、全`lifecycle` payloadのexact rootは`schemaVersion`,`event`、`event: close | abort | child-exit`とする。Exact `StudyStreamControl` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`の順で定義し、immutable binding fieldは全commandでstart value exactをrepeatし、`command: start | checkpoint | anchor-handoff | stop`とする。Exact `StudyStreamControlResult` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`の順で定義する。Start resultはcapture-startとfirst heartbeat後だけvalidで、そのfirst-heartbeat positionをreportする。Supervisorは各stream fileをcreate/validateしてdedicated append-only handle exact 1件をopenし、fixed child-visible descriptor `5`でsupervisor -> adapter -> watchdogへhandleだけを渡す。Descriptor `3`はparent-to-child pipe read end、descriptor `4`はchild-to-parent pipe write endのままとし、descriptor `5`をthird IPC pipe/channelにしない。Descriptor `5`はadapter/watchdog modeだけに存在し、他roleではabsent/closedとする。Path、cwd、environment、argvをauthorityにしない。Adapterはfile accessなしのtransfer-onlyでwatchdog registration後にcopyをcloseし、supervisorはupstream registration ACK後にcopyをcloseし、watchdogがidentity/authorityをvalidateしてsole holder/writerになる。Adapterは`stream-control`とreverse `stream-control-result`をbyte-identicalにrelayし、start/checkpoint/anchor-handoff/stopはexact semantic resultをwaitし、stopはresult -> handle close -> clean exitの順とする。Wrong handle/slot/role/root/order/result、adapter access、extra holder/writer、early close、lifecycle failureは全copyをcloseしてrunをinvalidateする。Exact runtime-only `StudyProcessLifecycleAttestation` rootを`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`の順で定義する。`processRole`はnamed adapter 3件、named watchdog 3件、`reviewer-one`,`reviewer-two`のいずれか、adapter/watchdogの`streamRole`はexact stream、reviewerの`streamRole`は`not-applicable`、`event`は`registered | exited`、registrationは`exitCode: null`,`signal: null`、accepted exitは`exitCode: 0`,`signal: null`とする。Sibling edgeなしのexact matrixを`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）に閉じる。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Start completion前にadapter 3件/watchdog 3件すべてのregistrationを要求する。Supervisorは各adapter registrationをdirect acceptしてlater clean OS exitをobserveし、各adapterはwatchdog registrationをacceptしてlater watchdog clean OS exitをobserveしたattestationをrelayし、scoring-moderatorは各reviewer registrationとmoderator-observed clean exitをrelayする。Witnessはdirect adapter exit 3件、adapter-attested watchdog exit 3件、directly observed orchestrator exit 2件、`ephemeralReviewerProcessExitCount === reviewVoteCount`を証明し、nonclean/missing/duplicate/mismatch/wrong-parent/reordered lifecycle attestationはrun invalidとする。Exact `StudyBrowserBrokerDecision` rootを`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`の順で定義し、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。`candidate-forward`だけをsole candidate acceptance/forwarding authorizationとし、separate candidate acknowledgementを存在させない。Run/attempt/subject/process IDとcause `product-exit | browser-exit | equipment-failure | premature-probe-close`を持つexact attempt-terminalization/terminalization-decision payload、およびcanonical grant/workflow-outcome/review-case rootを定義する。 Study-harnessはscheduleだけを行い、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`をconstructしてsupervisorへsubmitし、supervisorがvalidateしてstudy-browser-adapterへforwardし、adapterは同じorderのcanonical workflow recordだけを`safe-payload`としてwatchdogへrelayする。Harness submissionとdirect/bypass producer routeをrejectする。Terminal causeはexact source—`product-exit`はsupervisorのdirect observation、`browser-exit`はactual browser process/context exitをobserveしたstudy-browser-adapter、`equipment-failure`はadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてsole designated equipment observerである同adapter、`premature-probe-close`はsupervisor direct—だけからacceptしfirst valid causeを採用する。Internal adapter/proxy/marker/authentication/IPC/implementation/child faultはequipment outcomeをsynthesizeせずrunをinvalidateする。Wrong-source/concurrent/late/duplicate causeをrejectし、supervisorはbyte-identical `terminalization-decision`をharness/browser adapterへfanoutする。Adapterはbrowser/grant/marker/reservation/candidate/pending stateをdestroyするがterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとfinal closed dual ACKまでterminalizing bindingとfixed remaining-workflow scheduleを維持する。 Byte-identical `attempt-binding` snapshotをreplicateする。Preparedはharness/browser adapterの両方へ送りmarker install/launch前にboth ACK、readiness時はfresh process IDを持つopenを両方へ送りreadiness return/grant/candidate前にboth ACK、terminalization decisionで両copyをterminalizingへmoveする。Outcome 4件後はclosedを両方へ送りadapterがattempt-local cleanup後にACKし、both closed ACK後だけcopy destroy/next attemptを許可する。Normal completionはauthenticated probe close、accepted outcome 4件、pending join 0件の後だけsame closed snapshot/ACK pathを使う。Skip/reorder/stale/duplicate/mismatch/partial ACKをrejectする。 Candidate body execution前にexact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`とcommand `register-pre-readiness-probe` request `studyRunId`,`subjectId`,`bootstrapProof`を要求し、private `preReadinessProbeId`を返す。Runtime-only `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate `open | readiness-bound | terminalization-bound | destroyed`を定義する。`buffer-pre-readiness-product-event` requestは`preReadinessProbeId`,`destinationRole`,`payload`、destinationは`product-instrumentation`だけ、responseは`null`とし、後の`register-product-probe` requestは`studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles`とする。Readiness後の`submit-product-event` exact outer rootは`inspectorProcessId`,`destinationRole`,`payload`とし、outer processだけがregistered probeをauthenticateし、`StudyServerCorrelationClaim` payload内のsubject/process IDはopen bindingとそのouter processの双方へindependently exact一致させる。Exact `StudyPreReadinessProductObservationDraft`をcanonical observation root order `schemaVersion`,`eventCode`,`eventId`,`correlationId`,`subjectId`,`inspectorProcessId`,`observationClass`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`capabilityClass`,`originClass`,`effectClass`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`,`sameInspectorHost`,`productAttributable`,`prohibited`で定義する。Process/workflow/automatic/review fieldは全て`not-applicable`、evidence/claimではなく、buffer IDはprivate runtime stateだけに保つ。Pre-readiness observationごとにsafe draftをclassifyしてraw inputを直ちにdiscardし、effect前にsubmitし、ACK後だけeffect continuationを許可する。Supervisor orderでhash/route/evidence化せずstoreし、全ACKed draftをpreserveする。Readinessではbufferを`open -> readiness-bound`へmoveしfresh `inspectorProcessId`とfresh evidence event/correlation IDでcanonical payloadを再構築し、orderどおりadapter ACK releaseし、empty bufferもdestroyし、attempt-open dual ACK完了後にresponseする。Pre-readiness exitでは`open -> terminalization-bound`へmoveし`inspectorProcessId: not-applicable`とfresh evidence IDでpayloadを再構築し、ACK releaseしてempty bufferもterminalization/synthesis前にdestroyし、abrupt exit後もACKed eventをpreserveする。Bootstrap point未到達exitはnormal pre-readiness terminalizationとしてreviewed failure 4件を作る。Bootstrap point到達後はregistration ACKまでcandidate body/effect 0件とし、identity/registration/ACK failureはsynthesisせずinvalidateする。Non-target/helper processはlocal discardしregister/evidence 0件とし、identity/register/ACK/replay/raw-bearing/wrong-destination faultはrunをinvalidateする。Openかつexact-matchingな`StudyCurrentSubjectScoringContext`が存在する間だけ、nonworkflow prohibited observationをsame run/subject/process/workflowへvalidate/tagし、required downstream watchdog ACKまたはACKsを得てからaccepted observationとしてcommitし、supervisor mirrorをupdateし、moderatorのauthenticated updated-`scoring-context` ACKを得て、その後だけrelease/outcome submissionを許可する。Pre-readinessまたはcontext-free observationはprocess/workflow/link fieldを`not-applicable`に保ち、contextをupdateせず、later linkも禁止する。Source-supplied workflow tagをignore/rejectしてlate/cross-context/reordered updateをfailする。Eligible grant-backed requestはadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardの順とし、generic candidate acknowledgementを設けない。Simultaneous consumption attemptまたはreplay/duplicate/stale/mismatched authenticated IPC candidateはforward 0件、run invalid、state destroyとし、fresh post-consumption HTTP observationはblocked unknown/prohibited non-invalidating branchを使う。Participant candidate correlationはsupervisor-generated grant ID exact、他browser requestはfresh proxy-generated IDとし、different/mismatchをrejectする。Subject/workflowごとにdistinct human reviewer pairをattempt前assignし、human identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く）を禁止する。Reviewer identity/pair mappingを禁止する境界はrepository/work-root、runtime、capture、evidence、bundle、log、output、digestだけとし、それらの外側のseparate access-controlled administrative roster/assignment recordでunique-pair auditを可能にし、retention policyに従ってdestroyする。First workflow前failureでもlive observationを維持し、failureだけがpaired collectorをspawnし、recording/replayを禁止する。Exact frame rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`からexact +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`をderiveし、exact `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`をderiveする。MACをexact `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated compact JSON wire frameへexactly one LFを加える。State change前にconstant-time verifyし、first authenticated child-ready後に`channelSeed`と`bootstrapNonce`をdestroyし、direction-specific keyはedge lifetimeだけ保持する。Wrong edge/role/type/channel/direction/order/tag、partial/trailing frame、skip、duplicate、replay、late/post-close input、unexpected child exitをrejectし、control commandを追加せずkey/frame/sequence stateをwipeする。Brokerをtimer-freeかつatomicにする。State changeなしでreserveし、grantをarmedのままauthenticated candidateをpendingとしてvalidate/storeし、sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward`を送り、adapterがcopyをvalidate/consumeしてforwardし、generic candidate acknowledgementを設けない。Server claimをauthenticateしてstored candidateへjoinし、safe browser/server pairをexactly once releaseしてからsingle success/completion ACKを送り、application handlingはそのpost-release ACKを待つ。Late claim、unmatched transaction/request、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryはtransactionをcloseし、partial pairをreleaseせずcandidate、claim、binding、marker、pending stateをwipeし、clock、deadline、timerを設けない。Runtime-only `StudyCurrentSubjectScoringContext`をexact root order `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`で定義する。Automatic IDはinitial `not-applicable`、terminalizationは`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`とする。そのcontextがopenの間だけ、downstream ACK後にacceptedとなったexact same run/subject/process/workflowのfirst nonworkflow prohibited observationへcontext `workflowClass`を持たせ、automatic correlation `not-applicable` -> that first matching ID onceとterminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextはそのcauseでinitializeして他mutation/reversal/replacementをrejectする。Pre-readiness/context-free observationはworkflow/link `not-applicable`を維持しlater contextをmutateしない。Supervisor mirror update、authenticated updated-context ACK、moderator submissionの順を要求する。Exact `StudyWorkflowOutcomeSubmission` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`を定義して`automaticIssueCorrelationId`を`outcomeClass`直後に置き、canonical workflow payloadも同じorderとする。Objectively successful workflowはcontext candidateがあってもautomatic ID/disposition/voteを常に`not-applicable`にする。Failed workflowでeligibleなalready accepted same-run/subject/process/workflow candidateがある場合だけそのexact IDと`automatic-critical`をsubmitしてreviewを0件にし、candidateなしfailureだけが`not-applicable`をsubmitしてreviewを完了する。Missing/mismatch/reuseをrejectし、accepted automatic observationはoutcomeと独立にexact 1回countする。Exact runtime-only `StudySafetyReviewCase` rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`の順で定義し、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`の順で定義し、`reviewerSlot: reviewer-one | reviewer-two`とする。Valid automatic linkのない全failureで、moderatorはraw response/rubricをcall-localだけに持ち、either vote前にfresh isolated reviewer-one/twoへbyte-identical safe caseを送り、両reviewerはout-of-band human-viewing boundaryでsame live workflowをobserveし、first voteをhiddenにする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとする。Issue identityは`automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`だけからderiveし、`suspectedWorkflowBlockerCount`は全reviewer disposition、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、critical totalはderived ID deduplicationとする。Attempt/reviewer assignment後（pre-readiness/accepted workflow 0件かつ`inspectorProcessId: not-applicable`を含む）のproduct/browser/equipment failureまたはpremature-probe-closeでは、supervisorがaccepted outcomeをfreezeしてjoinをcloseし、bindingをprepared/open -> terminalizingへmoveしてcontext routingをcoordinateし、scoring-moderatorだけがharnessのunchanged fixed remaining-workflow scheduleに従うexact failure + required reviewを4件までconstructする。Harnessはoutcomeをsynthesizeせず、harnessのbinding/scheduleとadapterのterminalizing bindingはall four routed outcomeとclosed dual ACK完了まで保持する。Accepted 0件ではfailure 4件すべてにpreassigned live-observing pairのvote exact 2件を要求する。Prematureは`terminalizationClass: equipment-failure`へmapする。Harness/orchestrator/adapter/watchdog/reviewer failureはrunをinvalidateする。Attemptはsequentialでparticipant 01–19がall four後close、participant 20はcheckpoint前discoveryまででsole possible open attempt、continuationはremaining 3件だけとする。Capture startはattempt bootstrap前のrun-levelだけとする。Materialization時のprocess treeはmaterializer -> supervisorだけとし、existing supervisorがstart時にlong-lived orchestrator 2件とadapter 3件をlaunchし、各adapterがmatching watchdog、scoring-moderatorがreviewed failureごとのfresh reviewer pairをlaunchする。Start completion前にadapter/watchdog 6件すべてのaccepted `StudyProcessLifecycleAttestation` registrationを要求し、その後exact `processes` 6件とexact ordered `orchestrators`（`study-harness`、`scoring-moderator`）を返す。Stopはlive reviewer 0件/long-lived internal descendant/process clean exit 8件を要求し、witness provenanceはsupervisor-observed adapter exit 3件、adapter-attested watchdog exit 3件、supervisor-observed orchestrator exit 2件、moderator-attested reviewer exitと`ephemeralReviewerProcessExitCount === reviewVoteCount`とする。Exact 80/threshold independence、record kind、handoff/witness/seal pair、retained set、runtime/reviewer residue 0件をpreserveする。(2) Failing tests: `tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`で、全positive、boundary、spoof、replay、lifecycle、raw-sentinel、real-child IPC、actual-browser、residue、reviewer truth-table、aggregate-equation、chain、handoff、witness、seal、retained-layout caseを先にencodeする。(3) Scripts: その後、self-contained static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`でclosed bundle/distributionとprotocolを実装し、five-input phase matrix、stable authenticated control session、exact finalize witness/teardown、single-file import/entry closure、`./package.json`のexact `study:evidence:inputs`、`study:evidence:capture`、`study:evidence:verify` entryを維持する。(4) Focused pass: このtaskでcandidate tarball digestをcompute/freezeせず、targeted suite 3件をすべてpassさせる。 加えて、次のbrowser-observation、outcome、ordering invariantを定義・実装する。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

### 公式エビデンスと依存関係のレビュー




- [ ] T1031 Exact host、redirect rejection、explicit network opt-in、complete environment-supported content retrieval、partial update を生じさせない 変更なしに伝播するnetwork/runtime throw/rejection、non-mutating drift reporting に関する、失敗する official-source checker contract を `tests/contract/official-source-drift.test.ts` に追加する
- [ ] T1032 明示的に network を使う official-source checker を実装し、standalone maintainer-only の `check:official-sources` script をすべての default build/start/test/CI chain の外で登録して実行し、自動的な behavior change を行わず reviewed source set と classified drift を `scripts/check-official-sources.ts`、`./package.json`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1033 `specs/001-inspect-agent-customizations/contracts/official-sources.md`、`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md`では、明示的にacceptedされたevidence location、unique section heading、anchor、review metadata、またはsemanticに変化しないsource driftだけを解消する。Presentation Allowlistのrowまたは記録済み6 freeze digestをauthor/updateせず、許可されたcorrection後はT004のexact six-file extraction、constant-time digest comparison、row-ID、bilingual semantic-parity verificationを再実行する
- [ ] T1034 [P] `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`と`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`のfreeze済みGitHub Copilot英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1035 [P] `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`と`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`のfreeze済みClaude Code英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1036 [P] `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`と`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みOpenAI Codex英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1 rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [ ] T1037 T1033–T1036後、T1037によるPhase-102 evidence-review-driven production-registry correction前、かつ後続のold task ID前に、semantic driftとsix-digest freeze gateをenforceする。T004のexact extraction algorithmで全6 table inputを再計算し、missing/duplicate/empty/malformed heading/tableまたはrecorded digestのabsence/mismatchをすべてrejectし、equal-length digest byteをconstant timeでcompareし、exact IDと英日semantic parityを別に要求する。Reviewed evidence-location、anchor、review-metadata、またはsemanticに変化しないcorrectionだけを`shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts`へflowさせられる。Freeze mismatch、またはnormative behavior、rule、strategy、allowlist membership/source-form applicability、registry shape、conformance expectationを変えるaccepted changeはbilingual task setをsupersededとし、mutation前に停止し、bilingual spec/research/plan/quickstart/contracts/tasksを同期し、`/speckit-plan`後に`/speckit-tasks`を要求する
- [ ] T1038 影響を受けた適合レコードだけを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で再生成する
- [ ] T1039 レビュー済みのエビデンスの結論を同期し、チェッカーを再実行し、最終結果を `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1040 `pnpm outdated`、license、notice、compatible-version rationale、public-contract effect、migration impactをreviewし、全accept/reject判断を`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する。初回baselineでは記録済みのno-impact判定とその事実を確認する。Acceptするdependency/public contractのbreaking changeごとに、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport window、rollback/support path、または理由を明記した影響なし判定を記録し、bilingual記録が欠ければこのtaskをblockする。変更をacceptしない場合はbaseline unchangedを記録して続行する。1件でもacceptした場合はcurrent `specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md`をsupersededと記録し、package/configuration editおよび旧task IDの後続実行前に停止し、影響を受ける`specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`、`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`、`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`、`specs/001-inspect-agent-customizations/tasks.ja.md` artifactを同期して`/speckit-plan`、`/speckit-tasks`の順に再実行し、regenerate済みtask setからだけ変更をapply/verifyする

---

## フェーズ 103: 横断的な検証

**目的**: 最終的な横断ドキュメント、パッケージ、アクセシビリティ、ライフサイクル、Node.js-only の回帰スイートを追加する。

**独立テスト**: 横断スイートを実行し、二言語の契約、クローズドなパッケージ内容、Node.js-only ポリシー、アクセシビリティの振る舞い、ライフサイクルのクリーンアップを検証する。

**目に見えるチェックポイント**: 完成した製品が横断的な自動回帰レイヤーを通過する。

### 横断テストを先に

- [ ] T1041 Versioned SC-003/004/005/007/009 outcome manifestを`tests/fixtures/outcomes/manifest.json`、canonical digestを`tests/fixtures/outcomes/manifest.sha256`、contractを`tests/contract/outcome-fixture-manifest.test.ts`に作成してfreezeする。1から始まるpositive safe-integer `manifestVersion`、unique stable case ID、criterion/required-class membership、fixtureまたはdeterministic-builder reference、客観的expected outcome、参照する全fixture byteのdigest、nonempty required class、declared nonzero minimum、再現可能なcanonical manifest digestを要求する。Table-drivenなprevious/current manifest objectで、version incrementなしのdenominator-semantics変更と、影響fixture digestおよびcanonical manifest digestの両方を変更しないfixture-byte-only変更をrejectし、VCS、network、reviewer stateを調べずhuman reviewを立証しない。`tests/contract/documentation.test.ts`へ、exact `test:format`/non-mutating `format:check` package script、exact recursive-root/root-file/pruned-root/exception/code/non-mutation policy、`tests/unit/check-format.test.mjs`、`scripts/check-format.mjs`、両quickstart、順序付き独立CI job、後続release/final rerunを要求するbilingual plan/task/quickstart declarationを含むrunnable command/stable ID、FR-042までの全56 FR/QR/SC trace row、全T001–T1063 mappingを検証し、各languageの全taskに少なくとも1つのexact repository-relative owned file pathを要求し、prefixなしbasenameにownershipを依存するtaskをrejectする一方、manifest/member/API/content literalだけのbasenameはrejectもcountもせず、task IDごとのderived英日exact owned-path set一致を要求するhard bilingual cross-artifact gateを追加する。さらにauthoritative allowlistまたはtask-ID-specific required-token manifestに基づく独立したnormative-identifier parity gateを追加し、case-sensitive normative identifier setを比較し、known closed-enum groupingだけをnormalizeし、plain textとcode spanを同等に扱い、repetitionを無視し、owned-path gateとは独立させ、このgateをhuman semantic reviewの代替にしない。T999とT1038がproduction registryと影響conformance recordをmaterialize済みであることを前提に、そのfinal stateを作成せずverifyする。Six Presentation Allowlist digest/ID/parityに加え、exact 48-source/57-rule registry、`vscode.copilot.mcp.workspace-root-release`、reciprocalな`copilot.repo.mcp.vscode-root` conflict evidence、推測したVS Code schema field/winner 0件のroot path-only semantics、`--cwd`/generation 0、pathless collision、safe-fs rows 1–28/directory guard/confirmed close、1 Source scan attempt static hard-link prepass/usable nlink/read-once/independent read/two zero-read alias rejectionを要求する。FR-022についてexactな2つのauthorized internal loopback classを別々に分類・constraint検証し、それ以外のsurfaceで禁止対象direct product request 0件、local-fixture/explicit-UNC zero-call semantics、mounted/mapped OS-mediated limitationを要求する。さらにprocess-wide resource registry close-race/poison/restartと4 routeのpoisoned-registry pre-schedule `409 resource-cleanup-restart-required`/state-job-I/O 0件、replacement decode、runtime error ownership、fixed-three Global、FR-042 pre-purge/epoch/fence/recovery/error/N対N+1、およびinspection-data successのunchanged-epoch/null-fence final gate対non-null fenceを許すlivenessのsame-lock current-epoch/current-fence projection、record-by-record EvidenceAssessment、non-authority/no semantic analysis/capacity ceiling、deterministic partial、atomic/late discard/mutation、migration、SC-002、manifest、全55 WCAG row、official backlinkを要求する。このpre-release時点ではexisting local/package/CI commandとfuture release-gate declarationだけをvalidateし、未作成release workflowを要求しない。そのfailing runnable assertionとimplementationはT1048、final-tree executionはT1062–T1063が所有する。T1041が新規所有するmanifest/test fileのfailureはすべてT1041内でcorrect/rerunしてからcompleteする。Owned file外のauthoritative artifact concernはcurrent task setをsupersedeし、synchronized replanningとtask regenerationを要求してT1062へdeferしない。その明示的T1041 disposition後もunresolvedなconcernだけがT1042およびcurrent IDの全後続taskをblockする
- [ ] T1042 [P] T1041通過後、gate前にmaterialize済みのT999 production registryとT1038 conformance recordを独立verifyし、exact 48 source record、57 inspection-rule ID、39 strategy、14 relationship-only rule、contained Hook/MCP addition 0件と更新済みfrozen Presentation Allowlist/source boundについてfinal testを追加する。`vscode.copilot.mcp.workspace-root-release` record、reciprocalな`copilot.repo.mcp.vscode-root` evidence、current-guide/release-note conflict、推測したVS Code schema field/winner 0件のpath-only root provenanceを要求する。Production registryを変更またはconformance stateをmaterializeせず、behavior/rule/strategyにすでに存在するscalar `documentationStatus`とfixed-order duplicate-free `lifecycleQualifiers`、T061がassembleするprovenance/Relationship/Fact/recognition DTOのsorted record-specific `EvidenceAssessment[]`をsubject owner/referenceごとに検証し、scalar/worst/union reduction、捏造`stable`、`documentation-conflict` status aliasを拒否する。Zero-authority Factとsyntactic/literal/typed/catalog/structural-only vocabularyを`tests/fixtures/conformance/official-sources.json`、`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts`で証明する
- [ ] T1043 [P] Exact `bin.mjs`/engine/version rejection/README/license/manifest schema、declared-versus-actual byte length、hash、CLI/Worker entry、complete environment-supported verification、verification を完了できない場合の import/bind 前の安全な失敗、unlisted-payload rejection に関する packed-tarball closed-set test を、customization validity output なしで `tests/package/package-contents.test.ts`、`tests/package/static-manifest.test.ts`、`tests/package/server-manifest.test.ts` に追加する
- [ ] T1044 [P] `gunshi` 0.37.0を含む正確なruntime dependency leaf set、Gunshiの正確なintegrity/bundle済みpayload全体のdigestとroot-only import boundary、`open`の不在、production-graphのname/version/integrity/payload digest、scripts-disabled installとverified-cache network-disabled normal-lifecycle install、別個のgenerated-shim audit、Rust/C/C++、Cargo、Node-API/native/binary/Wasm payload、`binding.gyp`、prebuild、platform selector、package-owned shell helper、non-Node shebang、lifecycle/runtime download、unlisted dataの拒否に関するpackage testを`tests/package/node-only-policy.test.ts`と`tests/package/production-graph.test.ts`で拡張する
- [ ] T1045 [P] Axe、keyboard、forced colors、zoom/reflow、reduced motion、focus、安全error、authored-value acknowledgement、ordinary scoped-cleanup retention対全central-full-purge reset、liveness/Global-disable epoch-fence recoveryをbilingual 55-row WCAG matrixへmappingする。Exact `AUTO-*` IDと`AUTO-2.2.2`を含め、全Applicable automated checkと4 keyboard workflowをpinned Chromium/Firefox/WebKitでpassさせるtestを`tests/e2e/accessibility.spec.ts`と`tests/e2e/session-liveness.spec.ts`へ追加する
- [ ] T1046 [P] Diagnostic、OperationError、EvidenceAssessment、control/progress、SessionSnapshot、`GlobalFenceRecoverySnapshot`、liveness、FileDetail envelope、canonical immutable buffer/exact length、null/same-ID error ownership、post-commit delivery regressionを追加する。Rescan/disable acceptanceをまたいでdeliveryをpauseし、全inspection-data successが`globalContentEpoch`をcaptureしてfinal unchanged-epoch/null-fence gate後だけpublishされる一方、全liveness successはone current lock snapshotからcurrent epoch/current fenceとしてatomicにprojectされnon-null fenceを保持できること、purge後にstale bufferがleakしないこと、fence中sessionはrecovery-only、terminal N/N+1 bufferがprior stateと混在しないことを`tests/integration/session-snapshot-encoding.test.ts`、`tests/contract/http-api-session.test.ts`、`tests/contract/http-api-files.test.ts`で証明する

---

## フェーズ 104: リリースと成果エビデンス

**目的**: リリースマトリクスを組み立て、測定可能なすべての成功基準、最終ゲート、明示的なrelease Constitution Checkの合否エビデンスを記録する。

**独立テスト**: 1つのclosed setでplatform非依存tarballをbuildし、Node.js 24/26の宣言済みcompatibility contract全体を維持しながら正確な6つのlower-bound Node/OS jobで同一byteをcertifyし、SC-001～SC-009の全denominator/thresholdをfinal candidate/profile/fixture/study digestへbindし、全remediationをapplicable gate/evidenceとcomplete-diff reviewへloopし、principleごとのConstitution Checkを記録してfrozen final treeでcomplete applicable automated matrixをpassする。

**目に見えるチェックポイント**: 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスク、憲章準拠のエビデンスを備え、公開可能な状態になる。

### リリースワークフロー

- [ ] T1047 Node.js 24.18.0 `ubuntu-24.04` x64 development/build baselineでplatform-independent tarballをbuild/verifyし、同一byteをNode.js `24.11.0`/`26.0.0`と`ubuntu-24.04` x64/`macos-15` arm64/`windows-2025` x64の6 lower-bound certification sampleへ配布し、runner-image identifier/actual Node versionを記録して、`^24.11.0 || ^26.0.0`をfull compatibility contractとして維持し、shimを別auditしながらproduction-graph digestを集約するrelease jobを `.github/workflows/release.yml` に追加する
- [ ] T1048 Actual workflowがfinal artifact/evidence-producing step後かつpublication前にexact `pnpm run test:format`、続いてexactでnon-mutatingな`pnpm run format:check`を実行することを要求するfailing release-workflow structure assertionを最初に`tests/contract/documentation.test.ts`へ追加し、passするまで`.github/workflows/release.yml`を拡張する。Exact packed-engines/running-version pre-import rejection、safe-filesystem、recursive two-manifest/hash、scripts-disabled/verified-cache network-disabled install、production graph、`npx`、Node.js-only、package-content、exact Playwright 1.61.1 Chromium/Firefox/WebKit browser certification、`--no-open` manual fallbackを含むOS-default-handler区分、liveness、accessibility gateをpublication前に含め、T1041がdeferした最初のrunnable release-workflow proofとする

### 成果エビデンスと最終ゲート

- [ ] T1049 Targeted study-evidence gate `pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を実行し、全positive/negative caseがpassするまで先へ進まない。Bilingual task parserでexact 1,063 ordered checkbox ID、104 phase、57 trace row、English/Japaneseのidentical owned-path set、out-of-line amendment mechanismのないself-contained task textを要求する。Exact five-input phase matrix、closed sixteen-member bilingual input bundleと20 distribution、unchanged work-root/candidate identity、stable authenticated control session、final candidate rehash、exact handoff/witness/seal write order、self-contained static-`node:` script、real `process.execPath` child role、actual participant `npx` probe readiness、browser-helper stripping、prohibited retained binding/path/secret/raw value 0件をverifyする。Scoped privacy boundaryをpositive/negativeに証明する。Required raw Basic、Fetch Metadata/Origin/Referer、correlation-header byteはephemeral loopback-wire receipt/processingだけに存在して直ちにdiscardされ、capture/evidence IPCまたはretained/log/output/digest boundaryをcrossしてはならない。Strictly decoded canonical 43-character IDだけが`correlationId`としてsafe IPC、canonical payload、payload digest、chain、handoff、witness、seal verificationへ残る。Supervisor-owned attempt/marker generation、study-browser-adapterへのdirect prepared-only install、actual bootstrap success ACKでmarker copyだけをatomic activateし、attemptはlater readiness/open-snapshot dual ACKまでpreparedに維持すること、prepared failure destruction、`browserAttemptId`のbrowser/evidence exposure 0件をexerciseする。Capture startがrun-levelだけで、stream live後の各sequential attempt `npx` probe直前にfresh profile/secret/bootstrapがあることを証明する。Certified profileでexact revision/version/distribution/isolated surface、bodyless 407のordered only headers `Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、Basic retry 1件、sole header `Connection: close`のbodyless 204をverifyし、全deviation/residueをrejectする。Exact `StudyParticipantNavigationGrant` root/lifecycleをexerciseし、Fetch Metadata aloneがattestationにならないことを証明する。Armed one-use grant + exact participant tuple + exact authorized-static targetだけをparticipantとする。Fresh no-grant/nonexact-target/user-activated page-script/post-consumption HTTP observationはopen IDs、fresh proxy-generated correlation IDを持つblocked valid-secret unknown/product-attributable/prohibited/automatic-critical/browser-only rowとしinvalidateしない。Replay/duplicate/stale authenticated IPC candidateとsimultaneous consumption attemptはinvalidateする。SPA、extension、missing/invalid-secret、six-header independent projection/immediate discard、static/API forwarding、server-claim equalityの全negativeを維持する。Real child processを使い、closed matrix edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`があり、environment/argv/file/socket/named/control endpoint transport 0件であることをverifyする。Sibling edgeなしのexact closed matrixをexerciseする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Testするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact `StudyBrowserBrokerDecision`、grant、terminalization、workflow-outcome、review-case payload root/enumをmutation-testする。Study-harnessはscheduleだけ、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission`をconstruct/submitし、supervisor validate/forward、browser adapter canonical record、watchdog `safe-payload`とする。Harness/direct/bypass submissionをfailする。Exact source—product-exitはsupervisor-observedだけ、browser-exitはactual browser process/context exitをobserveしたstudy-browser-adapterだけ、equipment-failureはadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてdesignated equipment observerである同adapterだけ、premature-probe-closeはsupervisorだけ—のfirst-wins/rejectionをtestし、internal adapter/proxy/marker/authentication/IPC/implementation/child faultをinvalidateする。Byte-identical decision後、adapterはbrowser/grant/marker/reservation/candidate/pendingをcleanupしterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでterminalizing binding/fixed scheduleを維持する。 Byte-identical prepared/open/closed `attempt-binding` snapshot、dual-ACK barrier、decision-driven terminalizing copy、adapter cleanup-before-closed-ACK、normal closeのprobe close/outcome 4件/join 0件gate、both closed ACK後だけdestroy/next、全skip/reorder/stale/duplicate/mismatch/partial-ACK negativeをtestする。 Exact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`、exact `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate `open | readiness-bound | terminalization-bound | destroyed`、`register-pre-readiness-probe` request `studyRunId`,`subjectId`,`bootstrapProof` -> `preReadinessProbeId`、`buffer-pre-readiness-product-event` request `preReadinessProbeId`,`destinationRole`,`payload` -> `null`、extended `register-product-probe` request `studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles` -> `inspectorProcessId`、exact `StudyPreReadinessProductObservationDraft` canonical root/order、全N/A process/workflow/automatic/review field、pre-bind evidence/claim/hash/route 0件、sole product-instrumentation destination、private runtime buffer ID、immediate raw discard、draft-before-effect/ACK-before-effect-continuation、exact open-to-readiness-bound/terminalization-bound transition、readiness fresh-process bind + fresh evidence ID + ordered adapter-ACK release + empty-buffer destroy + attempt-open dual ACK後response、pre-readiness N/A bind + fresh evidence ID + ordered ACK release/destroy後terminalization、abrupt-exit ACKed event preservation、exit-before-bootstrap normal four-failure synthesis、bootstrap-reached registration-ACK barrier/candidate body-effect 0件、non-target/helper discard/no-register/no-evidence、全identity/register/ACK/replay/raw/wrong-destination failureをtestする。Open exact-matching `StudyCurrentSubjectScoringContext`内だけでsame-run/subject/process/workflow validation/tag -> downstream watchdog ACK(s) -> accepted observation -> supervisor mirror update -> authenticated moderator updated-context ACK -> release/outcomeをtestする。Pre-ready/context-free rowはprocess/workflow/link N/A、context mutation 0件、later link 0件とし、source workflow、late/cross/reordered/replacement updateをrejectする。Adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forwardをgeneric candidate acknowledgementなしでrace-testし、eligible participant candidateはsupervisor grant correlation、他fresh HTTP observationはfresh proxy IDとする。Simultaneous consumptionまたはreplay/duplicate/stale/mismatched authenticated IPCはforward 0件でinvalidate/destroyし、fresh no-grant/wrong-target/page-script/post-consumption HTTP rowはblockedのままinvalidateしない。Distinct human pairをsubject/workflowごとにattempt前assignしてhuman identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く）を禁止する。Identity/pair mappingはrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordだけに置いてunique-pair auditとretention-policy destructionを要求し、pre-readiness/zero-accepted failureのlive observation、synthesized failure 4件それぞれのvote 2件、failure-only paired collector、recording/replay 0件をcoverする。Parent-to-child pipeがexact 96 binary byteの`channelSeed`/`bootstrapNonce`/`channelId`で始まりEOFなしでLF-framed messageへcontinueし、96 byte前のEOF/closeをrejectし、post-96 byteをframe byteとして扱うこと、child-to-parent pipeがauthenticated `ready` sequence `0`で始まることを証明する。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical bootstrap nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`をverifyする。全listed edge/role/message row、exact frame root `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、per-direction `0` then exact +1、exact `K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、exact `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、exact MAC preimage `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated compact JSON wire frame plus exactly one LF、constant-time verification、authenticated ready後のseed/nonce destruction、wrong edge/role/type/channel/direction/order/tag、partial/trailing、skip/duplicate/replay/late/post-close、early EOF、child replacement/exit、wipe caseをexerciseする。Brokerがclock、deadline、timerを持たず、adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once pair release -> single success/completion ACKをenforceし、application handlingをそのpost-release ACKまでblockすることを証明する。Late claim、connection/IPC EOF/error/close、request/transaction end、probe/attempt end、stop、abort、crash、child exit、全lifecycle boundaryをrace/fault-testし、partial release 0件とcandidate/claim/binding/marker/pending complete wipeを要求する。Expanded `StudyCurrentSubjectScoringContext` exact root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をexerciseする。Correlation `not-applicable` -> first matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeし、他mutation/reversal/replacementをrejectする。Context correlationはfailure-link candidateだけとし、submission/canonical payloadの`outcomeClass`直後に置く。Successはcandidateがあっても常にN/A/no-review、eligible accepted exact same-run/subject/process/workflow candidateを持つfailureだけがautomatic-critical/no-review、candidate-free failureはexact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`を使ってreviewする。他failureではexact review-case、moderator call-local raw input、either vote前のfresh isolated reviewer 2件とbyte-identical safe case、same live workflowのhuman observation、hidden first vote、acceptance前の両process exitを要求する。Dispositionはexact `not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとし、valid truth row、derived automatic/reviewer IDだけを許可してmissing/mismatch/reuse、unreviewed failure、vote leakage、reviewer reuseをrejectする。Seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutate-testし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、confirmed/disagreement counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplication、total-count/zero-gate equationを含める。Exact sequential scheduleを証明する。Participant 01–19は各4件完了後closeし、participant 20 discoveryがSC-001 20件のcheckpointとsole possible open attemptを作り、continuationはremaining 3件を完了する。Accepted workflow 0–4件後のcrashをtestし、product/browser/equipment/premature-probe terminalizationではsupervisorがcontextをfreeze/routeし、scoring-moderatorがunchanged harness scheduleに従うremaining reviewed outcomeをconstructし、harnessはsynthesizeしない。Harness/adapter terminalizing bindingをall four routed outcomeとclosed dual ACKまで保持し、prematureをequipment-failureへmapする。Harness/orchestrator/adapter/watchdog/reviewer failureはinvalidateし、accepted rowをduplicateしない。Exact capture-script self-reexec mode/process tree、start responseのexact `processes` 6件 + exact ordered `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived exit 8件、witnessのstream exit 6件 + orchestrator exit 2件 + `ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 80、record kind 5件、uninterrupted stream、heartbeat boundary、role/effect row、handoff anchor、threshold-failing seal completion、既存retained distribution/stream/handoff pair/continuity-witness pair/capture-seal pairを維持し、sidecar/final runtime controlを0件にする。その後、frozen install、exact Playwright browser install、build、exact `pnpm run test:format`に続くnon-mutating `pnpm run format:check`、lint、typecheck、unit、complete contract、complete security gateを実行し、全resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをpositive/negative/race/mutation-testする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。

- [ ] T1050 integration、package、performance、browser、coverage、documentation の各ゲートを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1051 同一tarball byteでexact six lower-bound jobを実行し、engine/runner/digest/shimに加えてsafe-fs rows 1–28、explicit `Dir.read()` directory-mutation guard/confirmed close、usable bigint dev/ino/nlink hard-link grouping、one-Source-attempt read-once/independent-attempt read、two zero-read alias rejection、`O_NOFOLLOW`、boundary-unverifiable、process-wide close-race/poison/restart、non-proving platform-unobservableを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1052 Check-in済みSC-002 profile、`tests/performance/sc002-fixture-manifest.json`、`tests/performance/sc002-fixture-manifest.sha256`をvalidateして正確に10のfresh-process runを記録する。Run 1直前と各run直後にcanonical manifestと参照する全content digestを再計算し、missing entryまたはdriftがあればset全体を無効とする。各automatic first Repository scanをtiming外で待ち、明示rescanを正確に1件dispatchして`scanRequestId`をcaptureする。同じIDのvisible/assistive statusと、そのrequestのcommit済みgeneration由来inventoryだけをacceptし、generic/loading/prior/automatic stateを拒否する。1秒以内のstatus、10秒以内のinventory、100 ms未満のfilter interaction、100 ms未満のitem-selection interactionという4 thresholdすべてを、同一の9 run以上からなる共通subsetが満たすことを要求する。各runで同じprofile ID/manifest version/canonical digestを繰り返し、request ID/generation/environmentを記録してSnapshot reuse/intentional cache resetを行わず、personal identifier/absolute path以外を省略しない。対象は`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`とする
- [ ] T1053 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase IDをvalidateして記録し、supportedな各`(tool, kind, admitted source form)` row、rejected inspection-path selector family、shared-file attribution combinationについて、そのexactで非ゼロのdenominatorとdeclared minimum coverageに照らしてSC-003のpass/failを記録する。認識率100%、範囲外の解釈0件、正しい帰属率100%とし、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する
- [ ] T1054 Frozen manifestからSC-004をvalidate/recordし、全tool/prohibited effect/rejected selector/detectable file-read change/directory enumeration中create-remove-rename/close-result classへnonzero coverageを要求する。Local fixture rootを記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback classを、static path/methodとAPI route/Host/Origin/capability制約を含め別々に分類・検証し、それ以外の全surfaceで禁止対象direct product-issued outbound/MCP request 0件を証明する。Explicit UNC/server-share/device vectorではfilesystem/DNS/SMB call 0件を証明し、lexicalに識別不能なpre-mounted/mapped network storageは除外したOS-mediated FR-022 limitationとして記録する。External mutation harness、product mutation API/flag 0件、consume groupごとのproduction content read 1件、不変content/length/identity/link/mode/mtime/ctime/xattr/ACL、別扱いOS-only atime、hard-cancellation claimなしのconfirmed cleanup/late discardを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1055 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行したexact case IDをvalidate/recordし、supportedな各`(tool, kind, admitted source form)` row、source/comparison surface、credential/environment-reference class、set-sentinel/unset stateについて、exact nonzero denominator/minimumに対するSC-005 pass/failを記録する。Substitution 0件、masking/revealなし、fixture不変を要求する。Diagnosticがsource valueを複製しないこと、closed generic Operation Errorがexact six fieldsだけを持ちraw cause/source identity/valueを一切含まないこと、OperationalEvent captureがfixed codeとopaque IDだけを使いpath/root/filename/content/metadata/capability/body/raw error/exception/Diagnostic argumentを0件にすることを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で別に証明する
- [ ] T1056 T1051 frozen candidateに対してmaterialization、run-level capture start、sequential pre-checkpoint workflow schedule、SC-001、checkpoint evidenceを実行する。Materialization前に`INSPECTOR_STUDY_WORK_ROOT`、external-local `INSPECTOR_STUDY_CONTROL_ENDPOINT`、fresh 32-byte/43-character `INSPECTOR_STUDY_CONTROL_TOKEN`だけをprovision/validateし、candidate/proxy bindingをabsentまたはpoisonに保ち、exact `pnpm run study:evidence:inputs -- materialize`と`pnpm run study:evidence:verify -- inputs`がそれらをreadしないことを証明する。Unchanged empty non-link work root、exact sixteen-member bilingual inputs、closed distribution 20件、external runtime binding、live stable authenticated control session 1件を要求し、environment value、path、key、mappingをretainしない。T1051後だけexternal same-identity `nlink === 1` candidateとexact loopback proxy authorityをbindし、exact `pnpm run study:evidence:capture -- start`を実行する。次のexact closed matrixの各edge—`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Pre-checkpoint executionでenforceするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Ordinary inherited pipe 2本だけを確立し、sibling edgeとenvironment/argv/file/socket/named/control endpoint transportを禁止する。Exact `StudyBrowserBrokerDecision` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`と`decision` `candidate-forward | browser-only-released | joined-pair-released`、run/attempt/subject/process IDとcause `product-exit | browser-exit | equipment-failure | premature-probe-close`を持つexact attempt-terminalization/terminalization-decision payload、exact `StudyParticipantNavigationGrant`と`StudySafetyReviewCase` payloadのcanonical `subjectId`,`inspectorProcessId` associationを定義する。Study-harnessはscheduleだけ、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission`をconstruct/submitし、supervisorがvalidateしてbrowser adapterへforwardし、adapterはcanonical workflow-record `safe-payload`だけをwatchdogへ送る。First valid exact-source cause—product-exitはsupervisor-observedだけ、browser-exitはactual browser process/context exitをobserveしたstudy-browser-adapterだけ、equipment-failureはadapter/proxy/IPCがhealthyなexternal browser/bootstrap/environment failureについてdesignated equipment observerである同adapterだけ、premature-probe-closeはsupervisorだけ—でbyte-identical decisionを送り、wrong-source/concurrent/late/duplicateをrejectし、internal adapter/proxy/marker/authentication/IPC/implementation/child faultをinvalidateする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでterminalizing binding/fixed scheduleを維持してlong-lived adapterをsurviveさせる。 Prepared/open/closed binding snapshotをharness/browser adapterへbyte-identically replicateし、marker/launch、readiness return/grant/candidate、destroy/nextの前にrespectively both-ACK barrierを要求し、normal closeはauthenticated probe close/outcome 4件/pending join 0件の後だけ許可する。Decisionで両copyをterminalizingへmoveし、adapterはclosed ACK前にlocal cleanupし、skip/reorder/stale/duplicate/mismatch/partial ACKはinvalidateする。 Candidate body execution前にexact `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`を`register-pre-readiness-probe`でsubmitし、private `preReadinessProbeId`を受け、exact `StudyPreReadinessProductBuffer` root `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`を`open`でcreateする。Exact `StudyPreReadinessProductObservationDraft`を`buffer-pre-readiness-product-event`で`product-instrumentation`だけへbufferし、そのprobe IDを持つextended `register-product-probe`を後でcallする。Draftのprocess/workflow/automatic/review fieldは`not-applicable`、pre-bind evidence/claim/hash/route 0件、buffer ID privateとする。Pre-ready safe draftをclassifyしてraw valueを直ちにdiscardし、effect前にsubmitしてACK後だけeffect continuationを許可し、全ACKed draftをsupervisor orderでretainする。Readinessではbufferを`open -> readiness-bound`へmoveしfresh `inspectorProcessId`/fresh evidence event-correlation IDで再構築してordered adapter-ACK releaseし、empty bufferをdestroyしてattempt-open dual ACK後にrespondする。Pre-ready exitでは`open -> terminalization-bound`へmoveし`inspectorProcessId: not-applicable`/fresh evidence IDで再構築してACK releaseし、empty bufferをterminalization/synthesis前にdestroyし、abrupt exit後もACKed eventをpreserveする。Exit-before-bootstrapはnormal pre-ready four-failure synthesis、bootstrap後registration ACKまではcandidate body/effect 0件、non-target/helperはdiscardしてregister/evidence 0件とし、identity/register/ACK/replay/raw/wrong-destination faultをinvalidateする。Open exact-matching `StudyCurrentSubjectScoringContext`内だけでsame-run/subject/process/workflow validation/tag -> downstream watchdog ACK(s) -> accepted observation -> mirror update -> moderator updated-context ACK -> release/outcomeをorderし、pre-ready/context-free process/workflow/linkをN/A、context update/later linkを0件とし、source workflow tagとlate/cross/reordered updateをrejectする。Eligible participant grantをadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardの順にし、generic candidate acknowledgementを設けない。Simultaneous consumeまたはreplay/duplicate/stale/mismatched authenticated IPCはforward 0件でinvalidate/destroyし、fresh post-consumption HTTP observationはblocked/non-invalidatingとする。Participant candidateはsupervisor grant correlation exact、他requestはfresh proxy IDとする。Distinct human pairをsubject/workflowごとにattempt前assignしてcross-case reuseを禁止し、identity/pair mappingはrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordだけに置いてunique-pair auditとretention-policy destructionを要求し、first workflow前もlive observationを可能にしてrecording/replayを禁止する。Parent-to-childのexact 96-byte prefixを32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`の順とし、EOFなしのLF frame、child-to-parent authenticated `ready` sequence `0`、exact ready/acknowledgement/lifecycle/frame root、direction-specific key derivationを維持し、authenticationTag-null compact canonical frameをLFなしでMACし、populated wire frameだけにLF exact 1件を追加し、state change前にverifyしてclosure時にbootstrap/key/frame/sequence stateをwipeする。`capture -- start`をrun-levelだけとし、attemptを作る前にproxy/listenerをbindし、long-lived study-harness、scoring-moderator、adapter 3件、そのwatchdog 3件をspawnしてsole-writer stream 3件を開始する。Start responseはexact `processes`のadapter/watchdog entry 6件とexact `orchestrators`の`study-harness`、`scoring-moderator`順2件を公開する。`scripts/run-usability-study-capture.mjs`のexact self-reexec modeを`supervisor | study-harness | scoring-moderator | reviewer-one | reviewer-two | product-instrumentation-adapter | inspector-server-ledger-adapter | study-browser-adapter | product-instrumentation-watchdog | inspector-server-ledger-watchdog | study-browser-watchdog`とし、product-probeはdistinct static importに保つ。Streamがliveになった後、各sequential attemptのparticipant `npx` probe/first capturable request直前にだけsupervisorがfresh `StudyBrowserAttemptBinding` state `prepared`、`browserAttemptId`、separate 32-byte/43-character `browserProxyMarkerSecret`、exact `StudyBrowserProxyMarkerBinding` state `prepared`を生成し、その`studyRunId`,`browserAttemptId` associationを維持する。`attempt-binding`はstudy-harnessとstudy-browser-adapterだけへ、`proxy-marker-install`はsupervisorからstudy-browser-adapterへdirectに送る。`browserAttemptId`をsupervisor/broker、study-harness、study-browser-adapterのruntime memoryとauthenticated frame/candidateだけに保ち、browser process/context/profile/configuration/credential/request/application/evidenceへ入れない。Prepared-binding both ACK後かつparticipant `npx`前にadapterがexact profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`、actual Playwright 1.61.1 headed Chromium revision `1228`、`browserVersion` `149.0.7827.55`、`Chrome for Testing`のcertified isolated profileをlaunchし、`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbootstrap exact 1回を完了する。Bodyless `407 Proxy Authentication Required`のordered only headersを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、canonical Basic retry exact 1件、bodyless `204 No Content`のsole headerを`Connection: close`とし、effect 0件を証明する。Authenticated bootstrap ACKはmarker copyだけをactiveへmoveし、attemptはproduct readiness/open-snapshot dual ACKまでpreparedに保つ。Healthy external browser/environment/bootstrap failureはactiveを経ずmarker copyをdestroyしてadapter-sourced `equipment-failure`を生成し、internal adapter/proxy/controller/CDP/authentication/IPC/child faultはsynthesisせずinvalidateする。その後全study-browser requestにcanonical Basic credential exact 1件を要求する。各workflowでexact `StudyCurrentSubjectScoringContext` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をcreateする。Automatic IDはinitial `not-applicable`、terminalization classは`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`とする。Open中のraw responseはscoring-moderator call-local memoryだけでassociateする。Automatic correlation `not-applicable` -> first supervisor-tagged matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをそのcauseでinitializeして他mutation/reversal/replacementをrejectし、updated-context ACK後だけmoderator submissionを許可する。Exact `StudyWorkflowOutcomeSubmission`とcanonical workflow payloadでは`automaticIssueCorrelationId`を`outcomeClass`直後へinsertする。Context IDはfailure-link candidateだけとする。Successはautomatic ID/disposition/voteを常に`not-applicable`、eligible accepted exact same-run/subject/process/workflow candidateを持つfailureだけがそのIDと`automatic-critical`でreview 0件、candidate-free failureは`not-applicable`とexact reviewを使い、missing/mismatch/reuse/late linkをrejectする。Exact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`を定義する。Valid automatic linkのない全failureをreviewし、scoring-moderatorはraw response/rubricをcall-localだけに保ち、vote acceptance前にfresh isolated reviewer-one/twoへbyte-identical privacy-safe caseを渡す。両reviewerはout-of-band human-viewing boundaryで同じlive workflowをindependently observeし、first voteをhiddenにする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとする。Successはnot-applicable/no vote、linked automatic failureはautomatic-critical/no vote、他failureはexact 2 voteからreviewer-cleared/confirmed/disagreementへresolveする。次workflow前にcontext、review channel、raw association、reviewer processをdestroyする。Fetch Metadataをhuman attestationではなくconsistency signalだけとして扱う。Product-probe readiness後、sole expected initial participant navigation直前にsupervisorがfresh exact `StudyParticipantNavigationGrant` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`state`を`armed`で作り、proxy injection前にpage/browser codeへ見せずstudy-browser-adapterへ送ってexact 1回consumeする。Valid secret + exact navigate/document/?1/missing-Origin/none-or-same-origin + exact authorized-static target + current armed grantだけをparticipantとしgrant correlation IDを使う。Current grantなし、prior consumption後、nonexact target、user-activated page-script navigationのfresh participant-shaped HTTP requestはopen binding IDsとfresh proxy-generated correlation IDを持つvalid-secret unknown、`productAttributable: true`、`prohibited: true`、automatic-criticalとしてDNS/socket/body/response前にblockしinvalidateしない。Replay/duplicate/stale authenticated IPC candidateまたはsimultaneous consumptionはinvalidateする。Bundled-SPAはmissing `Sec-Fetch-User` + [exact-issued `Origin` OR (missing `Origin` AND exact-issued `Referer`)]とstatic/API-only、extension/other valid-secret tupleはbrowser-only unknown/prohibited、missing/invalid secretはnot-applicable IDsのunrelatedとする。Proxy/serverはheader 6件をindependently project/compareしてrawを直ちにdiscardし、server claimはregistered outer/open-binding equalityを持つparticipant/SPAだけに許可する。Eligible participant/bundled-SPA exact requestごとにstate changeなしでreserveし、grantをarmedのままauthenticated candidateをpendingとしてvalidate/storeし、sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward`を送り、adapterがcopyをvalidate/consumeしてforwardし、generic candidate acknowledgementを設けない。Server claimをauthenticate/joinし、not-applicable branchなしでexact claim/outer/binding ID equalityを要求し、safe browser/server pairをexactly once releaseしてからsingle success/completion ACKを送り、application handlingをそのpost-release ACKまでblockする。Broker clock/deadline/timerを使わず、late claim、request/transaction end、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryでcandidate/claim/binding/marker/pending stateをclose/wipeし、partial releaseを0件にする。Issue identityはaccepted automatic observationから`automatic:<correlationId>`、reviewer-confirmed/disagreement outcomeから`reviewer:<subjectId>:<workflowClass>`としてdeterministically deriveし、independent fresh issue IDをprovision/retainしない。Exact seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`のindependently recomputable inputを維持し、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、reviewer-confirmedまたはreviewer-disagreement issueのexact 1回count、derived automatic/reviewer-critical issue IDのdeduplicated unionとしてのtotal、total 0かつcomplete exact-80 setの場合だけのzero gateをenforceする。ただしseal writeはT1057で行う。Raw Basic、Fetch Metadata/Origin/Referer、correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに許可して直ちにdiscardし、secret、response、identity、profile/configuration、path、errorとともにcapture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせない。Strictly decoded canonical 43-character safe IDだけがsafe IPCをcrossし、`correlationId`としてretainされ、canonical safe-payload/evidence digestへ入れる。Attemptをsequentialに実行し、`prepared | open | terminalizing` bindingは最大1件とする。Participant 01–19はdiscovery、inspection、comparison、global-consentとrequired reviewを完了し、accepted outcome exact 4件後にcloseして全attempt/profile/secret/contextをdestroyしてから次attemptへ進む。Participant 20はdiscoveryを完了し、その1件だけがcheckpointをまたいでopenになり得るため、checkpoint時点でSC-001 outcome 20件すべてとopen attempt最大1件を両立する。Attempt/reviewer assignment後（pre-readiness/accepted workflow 0件かつ`inspectorProcessId: not-applicable`を含む）のproduct exit/browser exit/equipment failure/premature probe closeでは、supervisorがaccepted outcomeをfreezeしてjoinをcloseし、prepared/open bindingを`terminalizing`へmoveしてcontextをrouteし、scoring-moderatorだけがunchanged harness fixed remaining-workflow scheduleでexact failure/reviewを4件までconstructする。Harnessはsynthesizeせず、harness binding/scheduleとadapter terminalizing bindingをall four routed outcome/closed dual ACKまで保持してからclose/wipeする。Premature-probe-closeは`terminalizationClass: equipment-failure`へmapする。Study-harness、scoring-moderator、adapter、watchdog、reviewer process failureはrunをinvalidateしsynthesisしない。Accepted workflow 0–4件後のfailureをexerciseし、rowをpreserveしてduplicateしない。Accepted 0件ではfailure 4件すべてを作り、各nonautomatic rowにpreassigned live-observing pairのvote exact 2件を要求する。Participant 20がcheckpoint前にterminalizeした場合、continuation progressはlive attemptではなくpost-anchor heartbeatで証明する。その後、append/heartbeat progressをblockせずexact `pnpm run study:evidence:capture -- checkpoint`を実行し、exact `pnpm run study:evidence:verify -- checkpoint`で`capture/study-capture-handoff.json`と`capture/study-capture-handoff.sha256`だけをcreateし、streamごとにmatching anchor 1件とcontinued post-anchor progressを要求する。`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`にはsafe ID、fixed role/code、count、digest、threshold result、cleanup result、pass/failだけを記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをpre-checkpoint captureでenforceする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
- [ ] T1057 同じuninterrupted runでparticipant 20、exact-80/review closure、stop、finalizeをcompleteする。Value/pathをretainせずunchanged work/control/token/candidate bindingをrevalidateし、proxy bindingをstopまでだけ保持する。`capture/study-capture-handoff.json`、`capture/study-capture-handoff.sha256`、growing `capture/streams/product-instrumentation.ndjson`、`capture/streams/inspector-server-ledger.ndjson`、`capture/streams/study-browser.ndjson`に対してexact `pnpm run study:evidence:verify -- continuation`を実行し、same stable control session、immutable prefix、streamごとのsole matching anchor、post-anchor heartbeat progress、exact child/channel identity、restart/replacement/truncation/stitch/alternate prefix/key reuse/browser-attempt substitution 0件を要求する。Sibling edgeなしのclosed matrixをrevalidateする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Continuation/stop全体でrevalidateするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Edgeごとにordinary inherited pipe exact 2本、96-byte bootstrap後EOFなしのLF frame、authenticated ready/ack/lifecycle payload、direction-specific key、authenticationTag-null compact canonical frame + no LFのMAC、populated wireだけのLF exact 1件、role/type/sequence closure、complete bootstrap/key/frame/sequence wipeをrevalidateする。Exact `StudyBrowserBrokerDecision`とattempt-terminalization/decision payload root/enumもrevalidateする。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer`/`StudyPreReadinessProductObservationDraft`、3 exact register/buffer command/root、draft canonical observation N/A field、exact draft-before-effect/ACK-before-effect-continuation path、pre-bind no-evidence/hash/route rule、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、open-to-readiness-bound/terminalization-bound transition、readiness fresh-ID bind + response前ordered release/destroy、pre-ready N/A bind + synthesis前release/destroy、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeをrevalidateする。Sole workflow producer/routing chain moderator -> supervisor -> browser adapter -> watchdog safe-payloadをrevalidateし、harness/direct routeをrejectする。Exact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—とbyte-identical decisionをrevalidateする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでbinding/fixed scheduleを維持する。Open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、prepared/open/closed dual barrier、normal-close gate、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、exact grant/fresh proxy ID、wrong-source/concurrent/late/duplicate/cross negativeをrevalidateする。Distinct preassigned human pair/human identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal surfaceの再利用を除く） 0件に加え、repository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、pre-first-workflow live observation、failure-only paired collector、recording/replay 0件をrevalidateする。Participant 20のremaining inspection、comparison、global-consent workflowごとにexact `StudyCurrentSubjectScoringContext` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をcreateし、scoring-moderatorだけがcall-local raw associationを持ち、matching accepted automatic correlationを最大1回acceptし、exact `StudyWorkflowOutcomeSubmission`/canonical payloadの`outcomeClass`直後へ`automaticIssueCorrelationId`をinsertする。同じrun/subject/process/workflowのalready accepted nonworkflow prohibited observationへlinkしたfailureだけを`automatic-critical`とする。他failureはexact `StudySafetyReviewCase` root `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`、fresh isolated reviewer process 2件を使い、両human reviewerが同じlive workflowをobserveし、byte-identical safe case、hidden first vote、exact 2 voteを要求する。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとし、missing/mismatch/reused automatic ID、missing review、その他truth rowをrejectする。Issue IDは`automatic:<correlationId>`または`reviewer:<subjectId>:<workflowClass>`からderiveし、次workflow前にcontext/raw/review channel/reviewer processをdestroyする。Certified isolated profileと完了済みexact bootstrapを継続する。Bodyless 407はdeclared header 2件だけ、bodyless 204は`Connection: close`だけとする。Fetch Metadataはconsistencyだけとし、existing one-use participant navigation grantはconsumedである。Participantはgranted initial exact authorized-static navigationだけとする。Fresh no-grant/nonexact/page-script/post-consumption HTTP observationはfresh proxy IDを持つvalid-secret unknown/product-attributable/prohibited/automatic-critical/browser-only blocked rowでinvalidateせず、replay/duplicate/stale authenticated IPCまたはsimultaneous consumptionはinvalidateする。SPA、extension、unknown、missing/invalid-secret、six-header projection/discard、participant/SPA-only server claim ruleを維持する。`browserAttemptId`はsupervisor/broker、study-harness、study-browser-adapterのruntime/authenticated IPC stateだけに保ち、browser/evidenceへ入れず、attempt binding openとmarker binding activeを維持する。Timer-free adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once pair release -> single success/completion ACKをenforceし、application handlingをそのpost-release ACKまでblockする。Late claim、transaction/request end、IPC EOF/error/close、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryではpartial pairをreleaseせずcandidate/claim/binding/marker/pending stateをwipeする。Checkpoint後はparticipant 20のremaining workflow 3件だけをcompleteする。既にclosedの19×4とparticipant-20 discovery prefixを合わせ、open attempt最大1件のままsubject 20件×4 workflowのexact 80 terminal recordを得る。Readiness後はsupervisorがfreeze/routeし、scoring-moderatorがunchanged harness scheduleに従うremaining failure/reviewをconstructし、harnessはsynthesizeせず、harness/adapter terminalizing bindingをfour outcome/closed dual ACKまで保持する。Prematureをequipment-failureへmapし、harness/orchestrator/adapter/watchdog/reviewer process failureはinvalidateする。Stop前にderived `automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` identityとcompleted reviewer voteから7 aggregate value `automaticCriticalIssueCount`、`suspectedWorkflowBlockerCount`、`reviewVoteCount`、`reviewDisagreementCount`、`reviewerCriticalIssueCount`、`criticalIssueCount`、`zeroCriticalIssueGate`をrecomputeする。`suspectedWorkflowBlockerCount`が全reviewer dispositionをcountすることと`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`を要求し、reviewer-confirmed-criticalまたはreviewer-disagreement-critical issueを`reviewerCriticalIssueCount`でexact 1回countし、`criticalIssueCount`をraw sumではなくautomatic issue IDとreviewer-critical issue IDのdeduplicated union cardinalityとし、`criticalIssueCount === 0`かつexact 80-record set completeの場合だけ`zeroCriticalIssueGate`をtrueにする。Threshold missはevidenceをcomplete/sealするがrelease approvalをblockし、automaticまたはreviewer-critical resultはexact-80 canonicalityを変えずzero gateをfalseにする。全workflow/review、registered probe、browser marker、candidate/claim join、inherited frame、current-subject contextがterminalで、live ephemeral reviewerが0件、各fresh reviewer pairがworkflow acceptance前にexitした後だけexact `pnpm run study:evidence:capture -- stop`を実行する。Proxyと全adapter-owned pinned Chromium contextをcloseし、全`StudyBrowserProxyMarkerBinding`をactive -> destroyedへ、残る`StudyCurrentSubjectScoringContext`/review-vote stateをdestroyedへtransitionし、全`browserProxyMarkerSecret`、marker/binding/install frame、HMAC seed/nonce/key/frame/sequence buffer、pending stateをdestroyする。Exact profile/revisionおよびisolated `HOME`/XDG/user-data/profile/extension/history/cache/credential-store/keychain residueがnormal、abort、crash path後にabsentであることを証明する。Basic、Fetch Metadata/Origin/Referer、correlation-header byteはrequired ephemeral loopback receipt/processingとimmediate discardだけに許可し、canonical 43-character `correlationId`以外のcapture/evidence IPCまたはretained/log/output/digest crossingを0件にする。Authenticated supervisor endpointだけをfinalization用にliveに残し、exact `processes` adapter/watchdog entry 6件とexact `orchestrators` 2件すべてのclean exitを要求する。Proxy bindingをremoveしてexact `pnpm run study:evidence:verify -- finalize`を実行し、`finalize-prepare` literal `null`、`finalize-commit`からのexact authenticated `StudyContinuityWitness` return、key destruction、endpoint EOF/reconnection/process-exit proof、stream-process exit 6件、orchestrator exit 2件、安全な`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、その後witness pairをseal pairより前にwrite/re-readする。Canonical `StudyCaptureSeal`の`streams`前へrecomputed aggregate field 7件をinsertし、`capture-start | payload | heartbeat | handoff-anchor | capture-stop`だけを維持する。Retained setをexact `distributions/participant-01`から`distributions/participant-20`、stream file 3件、`capture/study-capture-handoff.json`、`capture/study-capture-handoff.sha256`、`capture/study-continuity-witness.json`、`capture/study-continuity-witness.sha256`、`capture/study-capture-seal.json`、`capture/study-capture-seal.sha256`だけとし、sidecar、runtime control、raw marker/header、browser state、subject-response map、reviewer identity/note、secret、path、errorを0件にする。`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`にはsafe ID、fixed role/code、count、digest、threshold、aggregate value、cleanup/continuity result、pass/failだけを記録する。 加えて、次のbrowser-observation、outcome、ordering invariantをcontinuation/finalizationでrevalidateする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。




- [ ] T1058 Frozen manifestから全deterministic/runtime propagation classのSC-007をvalidate/recordし、readable complete `utf-8-replaced`、generic REST OperationError、startup top-level propagation、prior snapshot、explicit-rescan stale ownership、およびRepository rescan/consent-preview POST capture/Global enable-retry/Global rescanのpoisoned-registry pre-schedule `409 resource-cleanup-restart-required`/state-job-I/O 0件を維持する。Global disableのaccept前/no-op immediate full-snapshot recovery、accept後drain/close/serialization failureでのprocess liveness・retained epoch/fence/error・retry/join/restart、purged content非復元、terminal public-state N+1対unpublished-initial-enable N cleanupも`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [ ] T1059 Bilingual accessibility acceptance contractのSC-008 protocolを実行し、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。WCAG 2.2 Level A/AA全55 rowを固定済み38 Applicable/17 Not-applicable区分に照らして評価し、criterion固有の全Not-applicable rationaleを再validationし、必須の全stable `AUTO-*`/`MANUAL-*`/`REVIEW-*` IDを記録してApplicableな全check/evidence itemを合格させ、各`MANUAL-*` IDについてlocale/platform/viewport/mode/scenario/inputの全2,160 key付きcellを明示的evidenceまたは許可されたcell固有N/A rationale付きで記録する。Cellの欠落、unstable/missing ID、Applicable check、rationale、mapping、evidence、result、responsive variation、またはkeyboardのみで行う4つのprimary workflowのfailure/欠落が1つでもあればseverityにかかわらずSC-008を不合格とする
- [ ] T1060 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase IDをvalidateして記録し、documented initial-release Source Condition Fact row、supported tool、product surface、documented-condition/unavailable-state classごとに、そのexactで非ゼロのdenominatorとdeclared minimum coverageに照らしてSC-009 pass/failを記録する。宣言された全caseが正しいSource、tool、product surface、conditionまたはunavailable state、evidenceを持ち、physical/synthetic file、file ID、Source-relative Path、authored source text、comparison target、relationship origin、local/hosted read、network requestが0件であることを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で証明する
- [ ] T1061 Release-candidateのcomplete diff/tarball reviewを実施し、全checked branch/resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`、`specs/001-inspect-agent-customizations/data-model.md`、`specs/001-inspect-agent-customizations/data-model.ja.md`のpaired normative protocol/model、`tests/usability/sc001-sc006-study-inputs/`配下のclosed inputs/study kit、exact `./package.json` study command、self-contained static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`、`tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`のcomplete positive/negative coverageをreviewする。Scoped raw boundaryが全artifact、serializer、adapter、verifier、log、validation record、sentinel testで一致することを要求する。Raw Basic credential、raw `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに存在でき、直ちにdiscardする。Capture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed exceptionとする。Supervisor ownershipとfresh attempt ID/bindingのlimited runtime distribution、study-browser-adapterへのdirect prepared-only marker install、adapter bootstrap、success ACKでmarker copyだけをatomic activateし、attemptをreadiness/open-snapshot dual ACKまでpreparedに維持すること、prepared failure destruction、browser/evidence exposure banをreviewする。Run-level capture startが全per-attempt profile/secret/bootstrapに先行することを確認する。Certified browser profileとexact bootstrap—exact declared header setのbodyless 407、canonical retry 1件、sole `Connection: close`のbodyless 204、effect/residue 0件—をreviewする。Exact one-use `StudyParticipantNavigationGrant`をreviewし、Fetch Metadataをconsistencyだけにする。Participantにはcurrent armed grant + exact tuple + static targetを要求し、grantなし/replay/nonexact/page-script mutationをopen IDsのvalid-secret unknown、attributable/prohibited/automatic-critical/browser-onlyにする。SPA/extension/other-secret actor row、six-header projection/discard、participant/SPA-only server claimを維持する。Allowed edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をreviewし、environment/argv/file/socket/named/control endpointを0件にする。Parent-to-child pipeはexact 96 binary byte、32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`で始まり、same pipeをopenのままLF-framed parent-to-child messageへcontinueする。Childはframe parse前にexact 96 byteをconsumeし、96 byte前のEOF/closeをrejectし、byte 96後の全byteをframe dataとして扱い、bootstrapとframeの間にEOFを期待しない。Child-to-parent first frameはauthenticated `ready` sequence `0`とする。Sibling edgeなしのexact closed matrixをreviewする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） Reviewするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact `StudyBrowserBrokerDecision`、grant、attempt-terminalization/decision、workflow-outcome、`StudySafetyReviewCase` payload root/enumをreviewする。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer` root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A field/no-prebind-evidence rule、private buffer ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeをreviewする。Sole moderator production/supervisor routingとexact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—をreviewする。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、cross-case reuse/recording/replay 0件をreviewする。Exact frame rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`から開始してexact +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`と`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`を要求する。MAC preimageを`ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated compact JSON wire frameへexactly one LFを加える。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`を要求する。Constant-time tag verification、direction-specific key、first authenticated ready後だけの`channelSeed`/`bootstrapNonce` destruction、matrix/role/type/channel/direction/sequence closure、replay/order/partial/trailing/late/post-close/child-exit failure、control-enum expansionなしのcomplete key/frame/sequence wipeをreviewする。Timer-free brokerがadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> safe browser/server pair exactly-once release -> success/completion ACK exact 1件をatomicに実行し、application handlingをpost-release ACKまでblockすることを確認する。Late claim、unmatched transaction/request、connection close/error、IPC EOF/close/error、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryではtransactionをcloseし、partial pairをreleaseせずcandidate/claim/binding/marker/pending stateをwipeする。`automaticIssueCorrelationId`と`terminalizationClass`を持つexpanded scoring context exact rootをreviewする。Correlation `not-applicable` -> first matching accepted observation once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic correlationをsubmission/canonical payloadの`outcomeClass`直後に置きfailure-link candidateだけとして扱う。Successは常にN/A/no-review、eligible accepted exact same-run/subject/process/workflow observationを持つfailureはautomatic-critical/no-review、candidate-free failureはN/A + exact reviewとする。他failureはexact review case、moderator call-local raw input、either vote前のfresh isolated reviewer pair、byte-identical safe case、same live workflowをobserveするhuman 2人、hidden first vote、acceptance前process exitを要求する。Allowed disposition 5件、valid truth row、exact derived automatic/reviewer ID、context/reviewer cleanup、missing/mismatch/reuse/leakage/reuse negativeをenforceする。Seal fields `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をtrustせずrecomputeし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、reviewer-confirmed-criticalまたはreviewer-disagreement-critical derived issueごとの`reviewerCriticalIssueCount` entry 1件、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplicated-union cardinalityとしての`criticalIssueCount`、total 0かつcomplete exact-80 setの場合だけの`zeroCriticalIssueGate`をverifyする。Participant 01–19のfour-workflow後close、participant 20 discovery/checkpoint/remaining-three continuation、open attempt最大1件、product/browser/equipment/premature-probeについてsupervisorがrouteしscoring-moderatorがunchanged harness scheduleでconstructしharness/adapter bindingをclosed dual ACKまで保持するterminalizing synthesis（premature -> equipment-failure）、harness/orchestrator/adapter/watchdog/reviewer failureのrun invalidationを確認する。Exact self-reexec mode/process tree、startのexact `processes` 6件 + exact ordered `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived clean exit 8件、witnessのstream exit 6件/orchestrator exit 2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 20×4 workflow cardinality、unchanged record kind/effect row/sole-writer chain、heartbeat boundary、handoff anchor、stable control session、finalize teardown、witness-before-seal order、exact retained distribution/stream/handoff/witness/seal pair、sidecar/runtime control/raw/browser/reviewer/mapping residue 0件を確認する。最後にtask parserのexact 1,063 ID、104 phase、57 trace row、owned-path parity、self-contained task text、bilingual semantic/code-literal parity、全focused/complete gate resultをreviewし、untested branch、stale architecture term、failed check、missing evidence、privacy residue、unresolved concernがあればT1062/T1063をblockする。 加えて、次のbrowser-observation、outcome、ordering invariantをcomplete diff/tarball/evidenceからreviewする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
- [ ] T1062 T1061 concernが0件になるまでrelease-review remediation/evidence-invalidation loopを実行する。Paired study kit/input byte/descriptor、scoped correlation privacy boundary、`StudyBrowserAttemptBinding`/`StudyBrowserRequestCandidate`/`StudyServerCorrelationClaim`、exact runtime `StudyBrowserProxyMarkerBinding`/`StudyParticipantNavigationGrant`/`StudyCurrentSubjectScoringContext`/`StudySafetyReviewCase`/`StudySafetyReviewVote` root/lifecycle、exact `StudyBrowserBrokerDecision`/`StudyAttemptTerminalization` payload、attempt-binding replication/ACK barrier、`browserAttemptId`/`browserProxyMarkerSecret`、certified Chromium profile/bootstrap/Fetch Metadata table、inherited IPC bootstrap/frame/HMAC/payload root、process topology、timer-free broker ordering、workflow producer/routing、reviewer assignment/review fields/truth table、automatic/reviewer issue identity、seal aggregate、exact 80/threshold logic、record kind/chain、handoff/witness/seal、retained layout、cleanup、privacy schemaに影響するrepository editは、prior focused gateとcomplete T1056–T1057 evidenceを無効にする。各edit後、まず`pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を再実行する。Scoped raw boundaryをpositive/negativeに証明する。Raw Basic credential、raw `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw correlation-header byteはrequired ephemeral loopback-wire receipt/processingだけに存在でき直ちにdiscardし、capture/evidence IPCまたはretained/log/output/digest boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed exceptionとする。Supervisor-owned fresh attempt/marker generation、study-browser-adapterへのdirect prepared-only install、adapter bootstrap ACKでmarker copyだけをatomic activateし、attemptをreadiness/open-snapshot dual ACKまでpreparedに維持すること、failure destruction、limited attempt-ID runtime distribution、browser/evidence exposure 0件を再証明する。Run-level capture start後、stream live中の各attempt直前にfresh profile/secret/bootstrapを行う。Certified exact profile/bootstrapの407 exact two-header set、Basic retry 1件、204 sole-header set、effect/residue 0件を再証明する。Exact one-use `StudyParticipantNavigationGrant` lifecycle、Fetch-Metadata consistency-only actor classification、grantなし/replay/nonexact/page-script participant-shaped negativeのvalid-secret unknown automatic-critical/browser-only処理、全SPA/extension/missing-invalid/header discard/forwarding/server-claim ruleを再証明する。Allowed edgeごとにordinary unidirectional inherited pipe exact 2本、`parent-to-child`と`child-to-parent`をreal-child testで再実行し、environment/argv/file/socket/named/control endpointを0件にする。Parent-to-child exact 96-byte binary prefix、32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`からsame open pipe上でEOFなしにLF frameへcontinueすること、childがparse前にexact 96 byteをconsumeしてEOF/close-before-96をrejectしpost-96 byteを全てframe dataとして扱うこと、child-to-parent first authenticated `ready` sequence `0`を再証明する。Sibling edgeなしのexact closed matrixをrerunする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle` / `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle` / `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle` / `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle` / `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter -> matching watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` / `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`） 各invalidation後にreproveするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting supervisor上のstartがlong-lived internal descendant/process 8件とstream 3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap` rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact authenticated bootstrap validation/bind/ACK privacy exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only `StudyBrowserProxyRuntimeBinding` rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated memoryとliveなattempt-local DevTools request/browser contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact runtime-only `StudyProcessLifecycleAttestation` rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit 3件、moderator-attested reviewer registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact `StudyStreamControl` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact `StudyStreamControlResult` rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start resultはcapture-start + first heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact 1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical 43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless `407 Proxy Authentication Required`を受け、そのonly ordered headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry 1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact `StudyBrowserBrokerDecision` rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact runtime-only `StudyCurrentSubjectScoringContext` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact `StudyWorkflowOutcomeSubmission` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact runtime-only `StudySafetyReviewCase` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact `StudySafetyReviewVote` rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact browser-broker-decision、grant、terminalization、workflow-outcome、review-case payload root/enumを再証明する。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer` root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A field/no-prebind-evidence rule、private buffer ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination negativeを再証明する。Sole moderator production/supervisor routingとexact-source taxonomy—supervisor-observed product-exitだけ、browser adapterのactual browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child fault invalidation—を再証明する。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK -> outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair audit/retention-policy destruction、cross-case reuse/recording/replay 0件を再証明する。Exact frame root `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、各direction `0` then exact +1、`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、MAC preimage `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated compact JSON wire frameだけへのexactly one LFを要求する。Exact `ready` payload root `schemaVersion`,`bootstrapNonce`,`componentRunId`と`schemaVersion: 1`とcanonical nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root `schemaVersion`,`event`と`event: close | abort | child-exit`、constant-time verification、direction-specific key、one-use bootstrap、role/message closure、replay/order/partial/trailing/late/post-close/child-exit/wipe rejection、control-command expansion 0件を要求する。Timer-free atomic order adapter reserve without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim authenticate/join -> exactly-once safe pair release -> success/completion ACK exact 1件を再証明し、application handlingをpost-release ACKまでblockする。Late claim、unmatched transaction/request、connection close/error、IPC EOF/close/error、probe/attempt end、stop、abort、crash、child exit、その他lifecycle boundaryでcandidate/claim/binding/marker/pending stateをclose/wipeし、partial pairをreleaseしないことを再証明する。Expanded scoring context root/lifecycleを再証明する。Automatic correlation `not-applicable` -> first matching accepted ID once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic correlationをoutcomeClass直後へ置き、same-run/subject/process/workflow accepted-observation linkを要求する。全nonautomatic failureでexact review-case root、moderator-owned call-local raw response/rubric、either vote前のfresh isolated reviewer process 2件とbyte-identical case、same-live-workflow human observation、hidden first vote、acceptance前の両exitを再証明する。Allowed disposition 5件だけ、全truth row、derived issue identity、missing/mismatch/reuse/leakage negativeをenforceする。`automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutation-testし、全reviewer dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、exact confirmed/disagreement counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplicated union、total/zero-gate equationを含める。Focused gateがpassしたらcomplete T1049–T1050 automated gateを再実行しcandidateをrebuild/freezeする。New empty external work root、endpoint、token、certified isolated browser surface、marker secret、IPC seed/nonce/channel ID、process ID、study IDをprovisionし、independent issue IDはprovisionしない。Candidate/proxyをreadせずinputをrematerialize/verifyし、final candidateをstart時だけbindする。Participant 01–19 four-workflow close、participant 20 discovery checkpoint/remaining-three continuation、open attempt最大1件、exact terminalization synthesis/invalidation branch、exact 80 workflow/review、aggregate recomputation、stop、cleanup、finalize witness/teardown、witness-before-seal outputまでcomplete T1056とT1057を再実行する。Exact self-reexec mode/process tree、startのexact `processes` 6件 + exact ordered `orchestrators` 2件、stopのreviewer 0件/long-lived exit 8件、witnessのstream exit 6件/orchestrator exit 2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`を再証明する。Resulting complete diff/tarballに対してT1061を再実行し、concernが残る間T1061 → remediation → focused gate → complete gate → full studyを反復する。Concern 0件の後だけ、exact retained distribution、stream 3件、handoff pair、continuity-witness pair、capture-seal pair、record kind 5件、threshold independence、exact six-plus-two long-lived exitとreviewer-exit equation、aggregate equation 7件、prohibited residue 0件、exact task ID 1,063件、phase 104件、trace row 57件、T001–T1063 coverage、English/Japanese owned-path/semantic parity、stale architecture term 0件、`git diff --check`をverifyする。全invalidation、rerun、digest、safe count、aggregate、cleanup、final resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録し、`specs/001-inspect-agent-customizations/tasks.md`と`specs/001-inspect-agent-customizations/tasks.ja.md`を再checkし、failed threshold/gate、stale evidence、missing review、privacy residue、unresolved concernがあればT1063をblockする。 加えて、次のbrowser-observation、outcome、ordering invariantを各invalidation/rerun後にreproveする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome` bypassを全てrejectする。 Blocked browser-only observationではwatchdog ACKを`browser-only-released`より前に要求し、joined browser/server pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively successful workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review process/voteを0件にする。Candidateがあるfailed workflowはそのexact IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。 Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject environmentだけを用い、raw candidate/proxy valueを含めず、command bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。 `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin slotを固定し、materializer/inputsはcandidate byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen production graphから同じnetwork/scripts-disabled slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。 External-equipment fd `7`はexact runtime-only external record `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing input、replay、late/cross-context input、noncanonical valueをrejectし、empty response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot outputを禁止する。Human identity、collector `componentRunId`/process identity、case assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools requestとattempt contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment descendant/context terminationとfresh-profile cleanupをverifyするまでnext attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory -> one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding` rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact existing path-free `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK -> `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK -> all six registrations -> `browser-proxy-binding` ACK -> startとする。Browser-adapterとmatching-watchdog registrationはproxy binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。 Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。 Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count -> mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。 `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId` matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact 1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。 `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。 Pre-readiness terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote` recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome` acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。


- [ ] T1063 Formatting failure-boundary/non-mutation coverage、dependency/breaking-change rationale、migration impact、全violation解消、各residual uncertaintyのowner/resolution pathを含むprinciple-by-principle release Constitution Checkを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ実施・記録し、matching pull-request review checkを要求する。そのbilingual recordをT1062後のsole planned validation-only editとしrepositoryをfreezeする。Frozen tree/final candidateへ、build、frozen install、lint、typecheck、unit、contract、integration、security、package、performance、browser、coverage、documentation、lower-bound candidate checkを含むT1049–T1051の全applicable automated gateを再実行し、unchanged candidate/profile/fixture/human/manual evidence bindingを検証し、T1061 complete-diff/tarball inspectionをread-onlyで反復し、最後に`pnpm run test:docs`、exact `pnpm run test:format`、exact non-mutating `pnpm run format:check`、`git diff --check`を実行する。Outcomeはexternal release/pull-request check logだけへcaptureする。Failure、concern、または後続repository editがあれば全outcome/approvalを無効にし、T1063だけでなくT1062へ戻してdigest/evidence再validation、applicable rerun、complete-diff review後にT1063を再開しなければならない（MUST）

---

## ストーリーカバレッジマトリクス

| フェーズ | 主要ストーリー範囲 | 累積チェックポイント |
|---:|---|---|
| 1 Setup | 共通前提 | コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。 |
| 2 Minimal Secure Foundation | 共通前提 | セキュリティとパッケージの基盤が単独で合格し、中央権限の外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。 |
| 3 起動可能な認可済み空画面 | US1 | 認可済みブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。 |
| 4 Codex SKILL 一覧 | US1 | Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。 |
| 5 Codex SKILL 詳細 | US2 | Codex SKILL を選択すると、完全で inert な detail 画面が開きます。 |
| 6 Codex SKILL metadata 一覧 | US1 | 独立して識別された Codex skill-metadata file を、その seed `SKILL.md` file と混同せずに表示できます。 |
| 7 Codex SKILL metadata 詳細 | US2 | `agents/openai.yaml` を選択すると、owner の SKILL detail とは別の、完全で inert な detail 画面が開きます。 |
| 8 Claude SKILL 一覧 | US1 | Claude と Codex の SKILL 一覧が同じ inventory に共存します。 |
| 9 Claude SKILL 詳細 | US2 | Claude SKILL detail が完成し、Codex detail と一貫します。 |
| 10 Copilot SKILL 一覧 | US1 | Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。 |
| 11 Copilot SKILL 詳細 | US2 | Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。 |
| 12 統合 SKILL inventory | US1 | 完全な skill-first inventory を filter して理解できます。 |
| 13 SKILL 比較 | US3 | 読み取り可能な任意の2つのdistinct SKILL physical file IDを、activationもmutationもせずに比較できます。 |
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
| 95 Global 同意プレビュー | US4 | ユーザーは検査を有効にする前に、正確な Global root、pattern、exclusion、generic OperationError status、contract versionを確認できる。 |
| 96 Fixed-Three Global Enable基盤とCodex Batch Member | US4 | Controlはfixed tupleとone shared enable/batch operationを公開し、Codexはone possible memberとなり、atomic commit前にGlobal Sourceを一切publishしない。 |
| 97 Claude Global Batch Member | US4 | Claude admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 98 Copilot Global Batch Member | US4 | Copilot admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 99 Atomic Global Batch Result統合 | US4 | 別々に識別される0〜3個のone-root tool Sourceがexactly one completeまたはcontracted-partial generationで同時に現れ、detail/comparison workflowを再利用する。 |
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

- Delivery checkpointは厳密に順次実行する。後続checkpointが先行product sliceを再利用して回帰テストするためである。Phase 96–99だけは単一composite checkpointであり、numbered sliceを順に実行するがPhase 96–98をgreenまたはrelease可能と宣言せず、3つのreal member portがall-real-port suiteをpassしたPhase 99だけがcheckpointをcloseする。
- 通常phaseではfixture/failing testをimplementationより先に行う。Phase-96–99 composite checkpointでは各sliceのtestをそのsliceのimplementationより先に行い、generic coordinator testはtyped port outcomeだけをinjectでき、all-real-port acceptance suiteはPhase 99までredのままとする。Implementation sectionはtest fileを編集しない。
- フェーズ 15 は configuration 読み取りを許可せずに純粋な Codex fallback 宣言インターフェースを定義する。フェーズ 23 は最小の `.codex/config.toml` carrier をアトミックに受け入れ、`codex.repo.config` と `codex.derived.fallback-basename` を登録し、Codex MCP 宣言と同時にconfigured instruction fallback を有効化する。
- フェーズ 27 は、将来の settings、custom-agent、marketplace、plugin-manifest 所有者に対する Claude owner-gated MCP adapter を定義する。フェーズ 52、60、71、79 は、対応する所有者ファミリーが独立して受け入れられた後にだけ、それらの adapter を有効化する。フェーズ 32 は Copilot custom agent に同じ dormant-owner パターンを使い、フェーズ 54 で有効化する。
- フェーズ 57～58 は、すでに受け入れられた Codex configuration carrier を `settings/config` 認識と完全な詳細表示で拡張する。二つ目の候補、物理読み取り、fallback ルール、MCP 認識は追加しない。
- Marketplace の詳細を plugin-manifest インベントリより先に行い、検証済みのローカルソース宣言だけが 1 つのdirect one-edge derivationのシードになれるようにする。
- フェーズ 61 は、以前の MCP フェーズでパス不一致のまま保持した Copilot VS Code settings の正確な除外を所有する。フェーズ 77 と 79 も同様に Codex と Claude の正確な plugin-file 除外を所有し、受け入れ済み候補を変えずに以前の MCP パス不一致コンテキストを更新する。
- すべての所有者ファミリーを Hook 認識より先に行う。内包 Hook 認識はすでに受け入れられた所有者を再利用する。一方、priority MCP 認識は、受け入れ済み carrier または、所有者が存在するまで読み取りも認識の公開もできない dormant な owner-gated adapter を介して先に提供する。
- フェーズ 96 はgeneric selector-free fixed-three coordinator、3つのclosed typed admission port、Codex real port、test-only injected outcome coverageを確立するがproduction all-three activationを主張しない。フェーズ 97〜98 は同じopen composite checkpointへreal Claude/Copilot portをbindする。フェーズ 99は全real portを通じてfixed-three permutationを再検証しendpoint/atomic publicationを完成させ、全admitted separately identified one-root Sourceをexactly one completeまたはcontracted-partial generationで同時にpublishする。その時点だけcomposite checkpointをgreenとし、その後のexplicit Global rescanはsingle-Source operationのままとする。
- フェーズ 102 のT1037はsemantic evidence-drift gateである。このgate通過後は、semanticに変化しないreview済みPhase-102 citation/evidence metadata correctionがproduction registryを更新できるが、accepted normative behavior、rule、strategy、Presentation Allowlist、registry shape、conformance changeはcurrent bilingual task setをsupersedeし、後続old ID前にsynchronized artifactとreplanningを要求する。
- フェーズ 103 のT1041は後続のpre-release hard cross-artifact gateである。T999がproduction registry、T1038が影響conformance recordをmaterialize済みでなければならず、manifest/documentation/traceability suiteはそのfinal state、existing local/CI command、宣言済みlater release/final rerunをverifyするがT1048前のfuture release workflowを要求しない。T1041-owned manifest/test fileのfailureはT1041内でcorrect/rerunし、authoritative external artifact concernはT1062を待たずcurrent task setをsupersedeしてsynchronized replanning/regenerationを要求する。そのdisposition後にunresolved concernが0件の場合だけverification-only T1042またはcurrent IDの後続taskを開始できる。
- Repository のインベントリ、詳細、比較の受け入れが US1、US2、US3 を完成させる。Global 無効化バリアと解体は、US4 が完成する最初のフェーズである。

## 並行実行の機会

- 依存関係のベースラインと実行可能なコマンドを凍結した後、セットアップ設定ファイルを並行して進められる。
- 最小限の安全な基盤では、共有 DTO/Diagnostic/environment-failure テスト、host-security テスト、package-policy テスト、filesystem-fixture の準備は異なるファイルを使用し、マークされた箇所で並行して進められる。
- ベンダー Inventory フェーズ内では、そのフェーズのフィクスチャと適合行が完成した後、かつ正確なファイルセットが重複しない場合に限り、matcher、recognizer、integration、API、browser の各テストを並行して進められる。
- ベンダー Detail フェーズ内では、metadata、relationship、zero-activation、API、browser の各テストは通常別ファイルを使用し、マークされた箇所で並行して進められる。同じ parser ファイルに対する作業は順次実行のままとする。
- ベンダーフェーズ自体は、実装ファイルが異なる場合でもチェックポイント単位で順次実行する。次の各目に見えるチェックポイントが、先行するベンダースライスを回帰テストする必要があるためである。
- Marketplace ベンダーは、自身の Detail フェーズと並行して plugin 候補を導出できない。plugin 導出は、ローカルソース抽出が通過した後にだけ開始する。
- Codex、Claude、Copilot の plugin recognizer 作業は別々のフェーズで行う。統合 Plugin Manifests インベントリが、最初のツール横断で一度だけ読み取る組み立てを実行する。
- Hook parser/recognizer の作業は、正確なファイルが異なる場合に限りフェーズ内で並行できる。共有の `src/inspection/scan.ts`、UI、locale、registry ファイルは、同じフェーズ内の別タスクに対して並行とマークしない。
- MCP の CLI、VS Code、内包所有者、Cloud の事実の各フェーズは別々のテストを使用するが、共有の Copilot recognizer、JSON parser、scan、UI の作業はフェーズ順に実行する。
- `[P]` とマークされた Repository 受け入れテストは、全サポート対象フィクスチャと最終レジストリグラフが固定された後に並行して進められる。
- Global vendor boundary testは分離されたfixture rootを使用するが、フェーズ 96〜98はone shared fixed-three consent/admission/batch contractとdistinct per-tool control/context projectionを追加するためcheckpointとしては順次実行する。Tentative workはフェーズ 99のatomic batch integrationが存在する前にはSourceを決してpublishしない。
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
  HTTP file-detail and removed-reveal-route contract
  browser detail acceptance
```

## 実装戦略

### 最初の目に見えるマイルストーン

1. セットアップと最小限の安全な基盤を完成させる。
2. 承認済みの世代ゼロシェルを起動する。
3. Repository I/O を導入する前に停止し、起動可能な空画面をレビューする。

### 優先ウェーブ 1 — SKILL、Instructions、MCP

1. Codex、Claude、Copilot の完全な SKILL 一覧/詳細パス、一度だけ読み取る共有インベントリ、SKILL 比較、個別の skill-metadata 比較を提供する。
2. 三ツールすべての静的 Instructions 一覧/詳細チェックポイントを提供する。設定済み Codex fallback は、carrier が許可されるまで純粋な宣言/導出インターフェースとして保つ。
3. 最初の MCP フェーズで最小の Codex `.codex/config.toml` carrier を受け入れ、settings/config 項目としてまだ表示しないまま、設定済み instruction fallback と内包 MCP 宣言をアトミックに有効化する。
4. 独立した Claude、Copilot CLI、Copilot VS Code MCP ファイルを直ちに提供する。すでに受け入れられた skill 所有者に対する内包 MCP サポートと、まだ受け入れられていない settings、custom agent、marketplace、plugin manifest に対する owner-gated dormant adapter を定義する。
5. 現時点で具体化された MCP file/owner と runtime fact だけを統合し、完全なリテラルの MCP 比較を提供する。dormant adapter は inventory、detail、count、connection、selection に表示しない。

### 優先ウェーブ 2 — Rules、Commands、Prompts、Custom Agents

1. Codex と Claude の Rules 一覧/詳細チェックポイントと比較を提供し、Copilot `.claude/rules` は明示的な初期スコープ除外のまま保つ。
2. Claude と Copilot の Commands 一覧/詳細チェックポイント、共有ファイル統合、比較を提供する。
3. 単一ベンダーである Copilot Prompts の inventory、detail、comparison チェックポイントを提供する。
4. Codex、Claude、Copilot の Custom Agents 一覧/詳細チェックポイントを提供する。候補、ファイル再読み取り、合成ファイル/接続を追加せず、それらの実際の所有者認識上で、以前から dormant だった Claude と Copilot の agent-contained MCP adapter を有効化する。
5. 一度だけ読み取る共有 custom-agent 所有者を統合し、owner-attached MCP 認識を保持した比較を提供する。

### 優先ウェーブ 3 — 残りのカスタマイズ

1. 既存の Codex carrier を完全な configuration 認識/詳細へ拡張し、続いて Claude と Copilot の settings を提供する。dormant な Claude settings-contained MCP adapter を有効化し、Copilot instruction enablement を再投影する。Copilot settings は MCP 所有者にしない。
2. Claude Output Styles を提供する。
3. Marketplaces を提供し、Claude marketplace-contained MCP はその所有者が受け入れられたときにだけ有効化する。
4. marketplace のローカルソース検証後に Plugin Manifests を提供し、Claude plugin-contained MCP は受け入れ済み manifest 所有者上でだけ有効化する。
5. Repository カスタマイズファミリーの最後に Hooks を提供し、すべての内包 Hook がすでに受け入れられた所有者へ関連付くようにする。
6. Repository acceptanceとGlobal inspectionを完成させ、documentation/evidence/dependency reviewを終えた後にcross-cutting verificationとrelease evidenceを実行する。

### 各ファミリー内のベンダー優先垂直スライス

1. サポートされる各ベンダーの List/Inventory チェックポイントを完成させる。
2. その vendor の完全で inert な Detail または contained-metadata checkpoint を完成させる。
3. allowlist が複数ツール認識を許可する箇所では、明示的な共有物理ファイルの統合チェックポイントを追加する。
4. サポートされるすべてのベンダーセマンティクスが存在した後、ファミリーごとに一つの比較チェックポイントを追加する。

単一ベンダーのファミリーは、それぞれ固有の inventory/detail/comparison チェックポイントを維持する。以前の MCP 契約が後段の所有者ファミリーを待つ場合でも、各フェーズは独立して実演可能なままとする。

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

### リリースの完成

1. Repository のインベントリ、詳細、比較の受け入れを通過する。
2. I/O を行わない Global 同意プレビューを提供する。
3. Fixed `[copilot, claude, codex]`に対するselector-free consentを有効化し、initial enableでは全3件、retryではnon-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するcompleteなfixed-order exact `retryableTools` projectionを評価し、tentative Sourceをpublishせずにone-root controlを検証する。
4. Nonempty admitted subsetではexactly one shared-ID `GlobalBatchScan`を実行し、0〜3個のseparate tool-specific Sourceをone completeまたはcontracted-partial generationで同時にatomic publishしてcarried Sourcesを保持しrootをmergeしない。Empty deterministic subsetはjobもgenerationも作らない。
5. Global の再スキャン/回復と、優先ゼロ I/O 無効化バリアを追加する。
6. Documentation/evidence/dependency reviewを完了し、その完成artifactに対してcross-cutting suiteを実行する。Remediationごとにprior post-review resultを無効にし、全applicable automated gateと影響evidence protocolを再実行し、concern 0件までcomplete-diff/tarball reviewを反復する。
7. SC-001～SC-009のdenominator、threshold、pass/fail、closed sixteen-member study-input bundle/canonical manifest digest、exact `study-inputs/`/`repository/` distribution layoutとderived-tree digest rootを検証済みの20件すべておよびseparateなcandidate/equipment/runtime binding、final packed-candidate digest、exact `pnpm run study:evidence:inputs -- materialize`、`pnpm run study:evidence:verify -- inputs`、`pnpm run study:evidence:capture -- start`、`pnpm run study:evidence:capture -- checkpoint`、`pnpm run study:evidence:verify -- checkpoint`、`pnpm run study:evidence:verify -- continuation`、`pnpm run study:evidence:capture -- stop`、`pnpm run study:evidence:verify -- finalize`のoutcome、opaque ID/root/countだけを含みraw evidence data 0件のrecomputed cross-stream `StudyCaptureSeal` digest、Node.js engines contract全体とexact lower-bound/browser certification sample、residual riskを記録する。
   このsequenceはphase-closedとする。`INSPECTOR_STUDY_WORK_ROOT`、`INSPECTOR_STUDY_CONTROL_ENDPOINT`、`INSPECTOR_STUDY_CONTROL_TOKEN`はmaterializeからfinalize、`INSPECTOR_STUDY_CANDIDATE_TARBALL`はmaterialize/verify-inputsでforbiddenかつstartからfinalizeだけrequired、`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`はstartからstopだけrequiredとする。Stopはsupervisorをretainし、finalizeはcontrolをteardownして`StudyContinuityWitness`を`StudyCaptureSeal`より前にwriteする。
8. 原則ごとの明示的なrelease Constitution Checkを記録し、対応するpull request review checkを必須とし、その結果生じるrepository evidence editをすべて完了する。
9. Repositoryをfreezeした状態でcomplete applicable automated matrixとread-only complete-diff/tarball reviewを再実行し、`pnpm run test:docs`、exact `pnpm run test:format`、exactでnon-mutatingな`pnpm run format:check`、`git diff --check`で終える。Outcomeはexternal release/pull-request check logだけへcaptureする。その後repositoryをeditした場合は全outcomeを無効にし、Constitution/final-tree gateの再実行前にstep 6/T1062へ戻る。

## 注記

- 有効な検査対象ソースを列挙または読み取れるのは `src/inspection/safe-fs.ts` だけである。呼び出し元のパス、関係の対象、ベンダーロケーター、戦略、エビデンスレコードが読み取り権限を与えることはない。
- すべての候補フェーズでは、最初に候補の `lstat`、次に `realpath` の包含、最後に変更されていないことを確認する `lstat` の再実行を行う。該当するフェーズではさらに、ルート、利用可能な各祖先、同一ハンドルの同一性を比較する。
- 検出されたすべての変更、または利用不能/曖昧と報告された必須チェックでは、すべてのbyteを破棄し、readable resultを公開しない。Complete traversalとacquireした全resourceのconfirmed closure後のcandidate-local returned outcomeだけがdiagnostic-only itemを保持できる。Root/shared-ancestorまたはdirectory-enumeration guard outcomeとclose未確認は、candidate record、partial generation、success receiptなしでSource attemptを拒否する。
- Effective `O_NOFOLLOW`はNode.jsが公開/enforceする場合のmandatory final-component defense in depthとする。Active source-root/ancestor replacement、effective `O_NOFOLLOW`を利用できないfinal-component replacement、`platform-unobservable` caseに対するkernel-enforced containmentをtestが主張してはならず、全detectable changeはscope内でfail closedにする。
- FR-038はproject-authored executable application codeと公開/install済みproduction closure内のexecutable codeに適用する。Project-authored build/test codeもrepositoryの設計選択としてJavaScript/TypeScriptを使用するが、third-party development/test toolingはFR-038の対象外として別にpin/auditする。Rust、Cargo、Node-API/native addon、prebuilt binary、lifecycle compilation、lifecycle/runtime artifact downloadはFR-038が定義するproduct boundaryから引き続き禁止する。
- ベンダーの振る舞い、Inspector matcher、runtime composition、公式エビデンスは別々に所有する。読み取りを許可できるのは、静的および有界導出の Inspector ルールだけである。
- 非読み取りの `excluded` ルール ID は、`shared.excluded.symlink-target`、`shared.excluded.managed-remote-state`、`copilot.excluded.additional-standard-locations`、`copilot.excluded.extra-directories`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp`、`copilot.excluded.cli-extensions`、`codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`codex.excluded.user-runtime`、`claude.excluded.user-runtime`、`copilot.excluded.user-runtime` だけである。その他の拒否はすべて、パス不一致テストまたは relationship-only の条件である。
- 関係は記述的、直接的、non-recursive、非追跡とする。関係の対象は、それ自身が独立した静的または有界導出の受け入れを受けた場合にだけ読み取り可能になる。
- Usableなphysical hard-link groupは、documented Codex content-dependent fallbackを除き、complete static discovery/group formation後の1 Source scan attempt内だけで1回読み取る。別Source、別scan attempt、別generationは独立しており、同じunderlying objectをそれぞれ1回読み取り得る。Published fileは複数tool recognitionとdirect provenanceを保持できる。
- `agents/openai.yaml` は個別の物理候補および `skill metadata` 認識である。シード `SKILL.md` の同一性へ統合してはならない。
- フェーズ 23 は、設定済み instruction fallback と Codex MCP に必要な最小 carrier として `.codex/config.toml` を一度だけ受け入れる。フェーズ 57～58 は `settings/config` 認識と完全な configuration 詳細を追加するときに、同じ物理 ID と世代読み取りを再利用し、二つ目の configuration 候補を決して作成しない。
- Claude の独立 hook、Codex の独立 MCP、hosted/organization/managed/remote 入力、Claude workflows と agent memory、Codex Repository prompts と plugin components、Copilot LSP/extensions/一般の `.vscode/settings.json`、追加の設定済みルートには、List フェーズも読み取り権限も与えない。
- 内包 Hook と MCP の認識は、すでに受け入れられた所有物理ファイルを再利用する。dormant MCP adapter は、独立して許可された所有者が受け入れられる前には、何も列挙、読み取り、公開できない。有効化では、新しい候補または読み取りなしで、その所有者へ認識を追加する。宣言、plugin コンポーネントパス、Cloud の事実、runtime 参照が合成ローカルファイルを作成することはない。
- Marketplace と plugin manifest は別の kind である。検証済みのローカル marketplace ソースだけが、1つの direct plugin-manifest derivation edgeをシードでき、component は再帰しない。
- Global inspection は 1 つの consent/control record と、別々に識別される 0〜3 個の Source を持ち、supported tool ごとに最大 1 つ、Source ごとに正確に 1 root とする。provisional validation/scan work は Source ではない。complete または contracted-partial commit に成功すると、applicable tool Source だけを publish/replace し、Repository と sibling Source を session-wide generation へ持ち越す。Source ID は process lifetime にわたり安定し、generation-owned graph ID は rekey する。
- 完全に decode された authored source、正確な metadata literal、authored relationship target は active session で利用可能なままにする。capability 認証済み API は明示的な detail request でだけそれらを返すが、acknowledgement field を持たず、presentation acknowledgement を受信も enforce もしない。bundled browser は in-memory sensitive-content acknowledgement 後にだけ、それらの request を発行して authored value を render する。credential と environment-reference syntax は変更せず表示し、参照される process-environment value は決して読み取りも置換もせず、diagnostics/log は source value を複製しない。
- Credential detection、masking、redaction、reveal control は存在しない。`POST /api/v1/files/{fileId}/reveals` は unknown route のまま `404` を返し、localized sensitive-content notice は source/comparison を開く前と liveness purge 後に再度必要とする。
- 通常の起動、スキャン、ビルド、テストは公式ドキュメントに関してオフラインである。ネットワークへアクセスできるのは、明示的なメンテナー向けソース確認コマンドだけである。
- 人が作成するリポジトリドキュメントの変更では、英語の正本ファイルと日本語の対応ファイルを必ず同時に更新する。
- 自動テストの成功はエビデンスであり、網羅的な証明ではない。フェーズ 104 では、完全な文脈での diff、package、participant、accessibility、measurable-outcome、residual-risk のレビューを必要とする。
