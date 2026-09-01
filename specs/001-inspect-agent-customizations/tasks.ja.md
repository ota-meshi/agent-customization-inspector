# タスク: エージェントカスタマイズの調査

[English](tasks.md)

**入力**: `/specs/001-inspect-agent-customizations/` の設計文書

**前提条件**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**テスト**: すべての振る舞いの変更について、実装前にリスクに応じた自動テストが必要です。テストはユニット、契約、統合、パッケージ、セキュリティ、性能、ブラウザー、境界、アクセシビリティ、回帰の振る舞いを網羅します。

**構成**: タスクは、一つのuser story全体を水平に完了せず、元の目に見えるfamily-vertical delivery incrementに従います。起動可能な画面の後、各familyでInventory/List、完全で不活性なDetail、必要なshared integration、Comparisonを完了してから次のfamilyへ進みます。正確な順序は、SKILL（その Skill Metadata の一覧/詳細フェーズは確定済みの決定記録 — フェーズ 6・7 参照 — であり、比較フェーズは census companion に対する generic path の検証です — フェーズ 14 参照）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Plugins → Hooksです。Story labelはcanonicalなtraceabilityを維持し、`[US1]`はdiscovery、`[US2]`は完全で不活性なdetail、`[US3]`はcomparison、`[US4]`はGlobal inspectionを表します。MCP surfaceに合流するのは明示的なMCP構成だけです。他のkindのfileが綴るMCP構成は、そのkind自身のinventory phaseが出荷された時点で、そのkindのdetail contentとして見えるようになります。各phaseは独立してtest可能なmilestoneを1つ維持します。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

## 形式: `[ID] [P?] [Story?] Description`

- **[P]**: 明記された前提条件の完了後、異なるファイルを使用し、別の未完了タスクへ依存しないため並列実行できます。
- **[Story]**: フェーズ 3〜101 で必須です。Setup、Minimal Secure Foundation、フェーズ 102〜104 でのみ省略します。
- すべてのチェックリスト項目には、一つの主要成果と少なくとも一つの正確なrepository-relative owned file pathが必要です。Repository root直下のowned fileには明示的な`./` prefixを付けます。Prefixなしのbasenameはmanifest member、API value、selector、その他content literalとして残してよいものの、owned path導出時には無視し、task ownershipを満たすものとして数えません。

## 規範的な要件トレーサビリティ

このmatrixを、checklist semanticsを変更する仕組みではなく正本coverage indexとする。全FR、QR、SCについてprimaryな
implementation/verification/evidence ownerを示す。Rangeはその全taskが当該requirementへ直接寄与する場合だけ両端を含み、
taskはchecklist textと参照specにないobligationを継承しない。全taskを少なくとも1つのspecification rowまたは明示的な
Constitution/project-governance rowで扱う。Requirement/task変更時はこのmatrixと英語版を同じ変更で更新する。
フェーズ決定によりscopeが空になったtask ID（フェーズ 6・7）は、rowまたはrangeが名指す場所にそのまま残す:
そのIDは記録された決定へ解決され、それがそのtaskが構築するはずだったsurfaceについての当該requirementの
dispositionである。

| 要件 | 所有する実装・検証・evidence task |
|---|---|
| FR-001 | T040, T043, T046–T047, T917, T1029, T1041, T1048, T1056, T1061–T1062, T1098, T1099, T1125, T1138 |
| FR-002 | T017, T026, T028–T030, T037, T042, T044, T049, T055, T057, T067–T069, T913–T919, T1029, T1041, T1061–T1062 |
| FR-003 | T052, T061, T063, T065, T067, T110–T111, T113, T132, T135, T137, T160, T162, T164, T211, T213, T1084–T1090, T232, T234–T235, T251, T253–T258, T286, T288–T289, T309, T311–T312, T339, T341–T342, T359, T361–T362, T407, T409, T424, T426–T427, T445, T447, T462, T464–T465, T491, T493, T512, T514, T532, T534–T535, T551, T553–T554, T607, T609–T610, T628, T630–T631, T663, T665, T684, T686–T687, T704, T706–T707, T724, T726–T727, T757, T759, T761, T780, T782, T784, T803, T805–T807, T839, T841, T883, T885–T886, T913, T1029, T1041–T1042, T1053, T1069–T1072, T1097, T1126–T1131, T1133–T1135 |
| FR-004 | T066, T112, T136, T163, T213, T1084–T1090, T234–T235, T257–T258, T289, T311–T312, T330, T341–T342, T361–T362, T384, T409, T426–T427, T447, T464–T465, T493, T514, T534–T535, T553–T554, T586–T587, T609–T610, T630–T631, T665, T686–T687, T706–T707, T726–T727, T760–T761, T783–T784, T806–T807, T841, T851, T866, T885–T886, T895, T902, T919, T1029, T1041–T1042, T1053, T1091–T1096 |
| FR-005 | T017, T028, T178–T190, T268–T275, T388–T396, T913, T920, T1073, T1078 |
| FR-006 | T178–T190, T268–T275, T388–T396, T402–T410, T1100–T1120, T440–T448, T475–T481, T486–T494, T507–T516, T565–T572, T577–T588, T643–T653, T658–T666, T679–T688, T739–T746, T751–T762, T818–T828, T833–T843, T899–T907, T919, T1091–T1096 |
| FR-007 | T004, T074–T177, T216–T267, T292–T387, T411–T435, T1100–T1121, T449–T474, T495–T502, T517–T564, T589–T642, T667–T674, T689–T738, T763–T817, T844–T898, T920–T927, T1034–T1036, T1041–T1042, T1064–T1068, T1073–T1079, T1081, T1083, T1091–T1096, T1122, T1124, T1126, T1132, T1135 |
| FR-008 | T205–T275, T920, T927, T1042, T1084–T1090 |
| FR-009 | T079–T080, T091, T1042, T1091–T1093, T1118 |
| FR-011 | T191–T204, T276–T279, T397–T401, T503–T506, T573–T576, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-012 | T191–T204, T276–T279, T397–T401, T503–T506, T573–T576, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-013 | T930, T932–T943, T945–T946, T950, T958–T962, T1017–T1028, T1029, T1041, T1061–T1062, T1137 |
| FR-014 | T930, T944–T947, T950–T951, T956–T959, T963–T964, T967–T968, T974–T975, T977–T978, T981–T982, T988–T989, T991, T993–T995, T997–T998, T1000–T1005, T1029, T1041, T1058, T1061–T1062, T1137, T1140 |
| FR-015 | T977–T990, T1137 |
| FR-016 | T963–T976, T1138 |
| FR-017 | T944–T962, T1139 |
| FR-018 | T930, T947–T949, T952–T956, T964–T966, T969–T973, T978–T980, T983–T987, T991–T992, T996, T999, T1029, T1041–T1042, T1054, T1061–T1062, T1137–T1140 |
| FR-019 | T015–T023, T027–T032, T040, T046, T055–T056, T067, T075–T076, T081–T089, T095–T100, T183, T915–T927, T995–T997, T1029, T1041, T1054–T1055, T1061–T1062 |
| FR-020 | T056, T925, T1054 |
| FR-021 | T280–T401, T925, T1054 |
| FR-022 | T040, T043, T045–T047, T056, T294, T925, T996, T1054, T1098, T1123 |
| FR-023 | T018, T020–T021, T031, T056, T924–T925, T930, T995–T997, T1029, T1041, T1054, T1061 |
| FR-024 | T018–T022, T029–T032, T055, T057, T067, T069, T916, T924, T934, T940, T944–T945, T947, T959, T1008, T1014, T1029, T1041, T1051, T1054, T1058, T1061–T1062, T1069–T1072 |
| FR-025 | T074–T085, T095, T517, T589, T612, T920–T927, T995–T997, T1029, T1041, T1055, T1058, T1061–T1062, T1069 |
| FR-026 | T077, T085, T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925–T927, T995–T997, T1055 |
| FR-027 | T084, T100, T102, T927, T1045 |
| FR-028 | T015–T017, T027–T028, T032, T075–T076, T089, T095, T116, T141, T208, T217, T238, T282, T321, T371, T517, T589–T590, T612, T799, T805, T915, T921–T923, T926–T927, T1041, T1058, T1061–T1062, T1083, T1087 |
| FR-029 | T015–T016, T020–T021, T023–T024, T026–T027, T031, T035, T037, T040, T046, T055, T067–T068, T141, T149, T217, T222–T223, T1085, T1087, T1090, T238, T242–T243, T915, T923–T924, T946, T958, T1006–T1008, T1013–T1014, T1017, T1021, T1023–T1024, T1029, T1041, T1043, T1046, T1054, T1058, T1062 |
| FR-030 | T017, T026, T028, T037, T057, T068–T069, T071, T182–T183, T916, T918, T928, T958, T1006–T1016, T1023, T1052, T1058, T1082 |
| FR-031 | T041, T048–T049, T096, T182, T1021, T1024, T1027 |
| FR-032 | T004, T017, T028, T061, T191–T204, T276–T279, T397–T401, T503–T506, T573–T576, T747–T750, T829–T832, T908–T912, T916, T919, T926–T929, T995, T997, T1029, T1041–T1042, T1061 |
| FR-033 | T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925, T927–T929 |
| FR-034 | T226–T244, T440, T442, T477, T857–T877, T1042 |
| FR-035 | T205–T225, T944–T962, T1084–T1090 |
| FR-036 | T226–T244, T963–T976 |
| FR-037 | T245–T267 |
| FR-038 | T001–T003, T005–T014, T024–T036, T1043–T1044, T1047–T1051 |
| FR-042 | T041–T042, T044, T048–T049, T057, T1017–T1029, T1041, T1045–T1046, T1058, T1061–T1062 |
| FR-043 | T1041–T1042, T1080 |
| FR-044 | T1123, T1136 |
| FR-045 | T977–T990, T991–T1005, T1137–T1140 |
| QR-001 | T017–T039, T050–T073, T913–T920, T1031–T1042 |
| QR-002 | T015–T028, T055–T057, T061, T067–T071, T183, T913–T935, T944–T950, T963–T967, T977–T981, T991–T997, T1006–T1024, T1041–T1055, T1058–T1062 |
| QR-003 | T018–T049, T055–T057, T067–T069, T915–T927, T930, T946, T958, T995–T997, T1006–T1028, T1029, T1041, T1051, T1054–T1055, T1058, T1061–T1062 |
| QR-004 | T044, T071, T084, T100, T919, T927, T929, T935, T950, T976, T990, T997, T1004–T1005, T1016, T1022, T1028–T1030, T1039–T1041, T1045, T1056–T1059, T1061–T1062, T1141 |
| QR-005 | T050–T073, T913, T920, T1031–T1042, T1062 |
| SC-001 | T040, T043, T046–T047, T917, T1029–T1030, T1041, T1048, T1056, T1061–T1062 |
| SC-003 | T913–T914, T919–T920, T1041–T1042, T1053, T1062 |
| SC-004 | T018, T020–T021, T031, T056, T085, T924–T925, T930, T995–T997, T1029, T1041, T1054, T1061–T1062 |
| SC-005 | T074, T077, T081–T085, T925–T927, T930, T995–T997, T1041, T1055, T1062 |
| SC-006 | T1030, T1049, T1056–T1057, T1061–T1062 |
| SC-007 | T015–T021, T026, T038, T040, T046, T055, T057, T067–T069, T075–T076, T081, T089, T915, T921–T924, T926–T927, T930, T934, T944–T947, T958–T959, T963–T964, T975, T977–T978, T989, T991, T993, T995, T997, T1006, T1008, T1013–T1014, T1041, T1046, T1058, T1061–T1062 |
| SC-008 | T044, T071, T084, T100, T919, T927, T929, T1004, T1029, T1041, T1045, T1059 |
| Constitution/project governance | T001–T014, T1029–T1063 |

---

## フェーズ 1: Setup

**目的**: 再現可能な Node.js 専用パッケージと開発エントリーポイントを確立します。

**独立テスト**: `pnpm run format:check`を実行してtreeをゲートすることを観測し、`pnpm run format`が除外対象以外だけを書き換えることを確認します。その後、固定dependency graphをinstallし、設定済みの全local command/CI entry pointがRust、native compiler、install-time buildなしでresolveすること、およびplatform別prebuilt componentやpin済みcertification-browser downloadが、公開package payloadへ決して入らない、個別にpin済みのthird-party development toolingにのみ現れることを確認します。

**目に見えるチェックポイント**: Contributorがprojectをinstallし、test済みformatting gateとempty build/test toolchainを実行できます。

- [X] T001 Packageまたはconfiguration fileを変更する前に、plan承認済みdependency
  baselineを再検証し、以前の公開済みpackage/public contract、永続profile/user data、影響を受けるconsumer、migration
  workflowがないという初回のmigration影響なし判定を確認する。`specs/001-inspect-agent-customizations/research.md`にある`**Migration impact**`
  section、`specs/001-inspect-agent-customizations/research.ja.md`にある`**移行影響**`
  section、`specs/001-inspect-agent-customizations/plan.md`にある`**Dependency and breaking-change migration gate**`
  section、`specs/001-inspect-agent-customizations/plan.ja.md`にある`**Dependencyおよび破壊的変更の移行gate**`
  sectionを検証し、必要なら更新する。その正確な英日section pairを成功時のconfirmation
  evidence記録先とし、欠落、stale、不一致、根拠不足のいずれかがある間はT001をincompleteのままにしてT002を開始してはならない（MUST
  NOT）。確認に失敗する、承認済みdependency baselineが変わる、またはpublic contractのbreaking
  changeを提案する場合は停止し、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport
  window、rollback/support
  path、または理由を明記した影響なし判定を文書化する。影響を受ける`specs/001-inspect-agent-customizations/research.md`/`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`/`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md`
  pairを同期し、current task setをsupersededとして`/speckit-plan`と`/speckit-tasks`を再実行する。そうでなければNode.js
  `^24.11.0 || ^26.0.0`、`pnpm@11.13.0`、正確なruntime leaf集合`gunshi`
  0.37.0・`yaml`・`strip-json-comments`・`smol-toml`、承認済みの正確なdevelopment
  version、凍結されたgraphを`./package.json`と`./pnpm-lock.yaml`に固定する *(amended 2026-08-20:
  承認済みsetは`strip-json-comments`を含み、JSONCのreadingはcomment syntaxを空白化してstrict
  JSONと同じ`JSON.parse`で解決する。独自にobjectを構築するlenient parserはauthoredな`__proto__`
  keyを保持できないためである（research.ja.md § 3）。)*
- [X] T002 `bin` を `agent-customization-inspector: dist/cli.mjs` のみ、`files` を
  `dist`、`docs/images`、`README.md`、`README.ja.md`、`LICENSE` のみに定義し、`main`/`module`/`exports`
  を省略して、`./package.json` でライフサイクルのビルド・ダウンロードフックを禁止する
- [X] T003 Byte衛生を宣言的に所有する: `./.gitattributes`（`* text=auto eol=lf`）でline
  endingをnormalizeし、`./.editorconfig`でcharset/final-newline/trailing-whitespaceのeditor慣習を宣言する。Runnableなinert
  Node ESM
  entryを`src/server/cli.ts`へscaffoldし、`scripts/clean-build-output.mjs`と`scripts/verify-package-files.mjs`へno-op
  placeholderを作り、build、linting、type-checking、unit、contract、integration、package、coverage、browser
  commandを `./package.json` に追加する。Testを後続taskが書くsuiteはここにcommandを持たない —
  securityはT996、performanceはT183、documentationはT1041が、それぞれ自身のprojectとCI
  jobとともに持ち込む。まだ存在しないsuiteは宣言できないからである:
  空のprojectはrunをそのままfailさせ、それを通す許可を与えれば、誰も書いていない検証について成功を報告することになる *(2026-07-29 修正: code
  formattingは別途Prettierが所有する — `pnpm run format`が書き換え、`pnpm run format:check`がローカルとCIの`format`
  jobでゲートする（憲章v5.0.0）。Byte衛生は宣言的なまま、formattingだけがゲートを得た。)*
- [X] T004
  `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`、`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`、`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`、`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みPresentation
  Allowlistを、`specs/001-inspect-agent-customizations/contracts/official-sources.md`と`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`に記録された6個のlowercase
  SHA-256 valueに対してverifyだけし、authorまたはsemantic editを行わない。各UTF-8/BOM-free/LF-only fileについて、case-fold
  textが`presentation allowlist`で終わるlevel-2 headingをexactly one要求し、後続non-table
  lineをskipし、byte-for-byteで`|`から始まる最初のcontiguous runだけをhashし、全row byteを保持して最終rowを含む各row後に1
  LFを付け、heading/prose/blank/following lineを除外する。Missing/duplicate/empty/malformed
  heading/tableをrejectし、equal-length digest byteをconstant timeでcompareする。Digest
  matchだけでは不十分なため、exact row IDとmembership/source
  form/extractor/field/relationship/contained-owner/eligibility gateを含む英日semantic
  parityを別に検証する。Mismatch、recorded value欠落、desired semantic
  changeのいずれでもT004はincompleteのままT005と全dependentを停止し、task setをsupersededとし、synchronized bilingual
  spec/research/plan/quickstart/contracts/tasksと`/speckit-plan`後の`/speckit-tasks`を要求してからregenerated
  workを再開する *(2026-08-18修正: `instructions` の3 rowのeligible setは空であり — どのproductもinstruction
  fileのprose中から参照を抽出しない — 6つのdigestはその値で記録されている。したがってこのtaskの検証はその値に対して成立する。Supersession
  clauseは行使していない: shipped/planned のどのextractorも権限を得ないため、それを作る予定だったtaskは各自のphaseで修正する。)*
- [X] T005 [P] Nuxt SPA、静的 Nitro プリセット、ルート絶対アセット、無効化した CDN、明示的な imports と components を
  `./nuxt.config.ts` で設定する
- [X] T006 [P] アプリケーション、共有、ソース、スクリプト、テストに対する厳格な型チェックを `./tsconfig.json` で設定する
- [X] T007 [P] 生成出力を除外しながら TypeScript、Vue、Node.js、テストの lint を `./eslint.config.js` で設定する
- [X] T008 [P]
  Unit、contract、integration、package、coverageの各projectを区別して`./vitest.config.ts`で設定し、他の全directoryと同様に`tests/integration/security/`はintegration
  projectが所有するようにする。Testを後続taskが書くprojectは、空で存在させず不在とする —
  securityはT996、performanceはT183、documentationはT1041が追加する。`passWithNoTests`は設定しないため、自身のfileにmatchしなくなったprojectは、何も実行していないのにgreenを報告せずfailする
- [X] T009 [P] Playwright 1.61.1がinstallする正確なbrowser
  revisionを使うdeterministicなChromium、Firefox、WebKitのprimary-workflow/accessibility certification
  projectを `./playwright.config.ts` に設定し、pin済みrevisionは再現可能な自動baselineであってuser
  browserの網羅的一覧ではないことを文書化する
- [X] T010 [P] 単一の名前付き Node ESM `cli` エントリー、固定 `.mjs`
  出力、バンドルするプロジェクトモジュール、外部化する宣言済み依存関係、無効化したマップ・宣言、`dist/` への直接出力と `clean: false`（`dist/` の除去は
  pipeline 自身の clean step が所有する）を `./tsdown.config.ts` で設定する
- [X] T011 [P] `package.json.bin`を別のbootstrap wrapperなしでpackaged
  `dist/cli.mjs`へ直接向ける。`src/server/cli.ts` entryは正確な`#!/usr/bin/env node`
  shebangで始まり、tsdownがbundleでそれを保持し、package
  managerがinstall時にlinkされたbinをexecutableにする。Node.js互換性はpacked `engines.node` range
  `^24.11.0 || ^26.0.0`だけで宣言し、package
  managerのengines機構でenforceする。CLIは宣言済みstringも実行中versionも再検査せず、packed exact stringはpackage
  testでassertする
- [X] T012 [P] 依存関係と、生成された Nuxt、サーバー、配布、カバレッジ、Playwright、Node.js のビルド出力だけを `./.gitignore` で無視する
- [X] T013 独立したlint、type-check、unit、contract、integration、package、coverage、browser jobを
  `.github/workflows/ci.yml` に追加する。Byte衛生は`.gitattributes`と`.editorconfig`が所有するためCI
  jobを持たない。Testを後続taskが書くsuiteは、それまでjobを持たない —
  securityはT996、performanceはT183、documentationはT1041が追加する — まだ存在しないsuiteは宣言できないからである:
  空のprojectはrunをそのままfailさせ、それを通す許可を与えれば、誰も書いていない検証について成功を報告することになる
- [X] T014 Node.js
  `24.11.0`と`26.0.0`を`ubuntu-latest`、`macos-latest`、`windows-latest`と掛け合わせた正確な6つのlower-bound
  certification job、active LTSの`ubuntu-latest` development/build job 1件を `.github/workflows/ci.yml`
  に追加し、宣言済みNode.js 24/26 engine rangeがruntime compatibility
  contractでありsampleだけへsupportを狭めないことをlabelする *（amended 2026-08-26: runner labelとdevelopment/build
  Node.jsは、このrepositoryが手で進めるpinではなくplatformが現在出荷しているものを指す）*

---

## フェーズ 2: Minimal Secure Foundation

**目的**: ブラウザーセッションや Repository 読み取りより前に存在しなければならない契約とセキュリティ境界だけを実装します。

**独立テスト**: 製品ワークフローを起動せず、closed DTO と source-value-free Diagnostic、正確な package manifest、承認済み production dependency 集合の gate、単一のinspection-module filesystem boundary、generation 0 の状態を検証します。

**目に見えるチェックポイント**: セキュリティとパッケージの基盤が単独で合格し、単一のinspection moduleの外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。

### テストと fixture

- [X] T015 [P] 作業は残っていない: errorは通常どおり報告され、sanitizerもenvelope moduleも存在しないため、階層化failure契約のtest
  suiteにassertする対象がない。Fileに閉じたfailureの分離はFR-028のtestとClosed Scan Publication Outcomesのtaskがカバーする
- [X] T016 [P] Closed Diagnostic registry、deterministic aggregation、successful complete atomic
  publicationのfailing testを`tests/unit/shared/diagnostics.test.ts`に追加する。本taskはerror
  entityもoperational eventもassertしない: errorは通常どおり報告され、sanitizerもenvelope
  moduleも存在しないため、そのようなsuiteにassertする対象がない
- [X] T017 [P] Complete decoded textと保持された`U+FFFD`を持つreadable `utf-8 | utf-8-replaced`
  file、textを持たないNUL-containing `binary`、one-root Source
  invariant、`process-cwd | root-option | default-home | environment`だけをoriginとするexact
  non-authorizing `SourceBoundary { displayRoot, origin }`、generation-0 origin selectionを含むpublic
  entity shapeのfailing testを追加する。Closed
  `DocumentationStatus = documented | partially-documented | unknown | conflict`、fixed-order
  `LifecycleQualifier = preview | experimental | deprecated`、重複禁止・`stable`推論禁止も検証する。これらはbehavior/rule/strategyごとのscalar
  fieldとして持ち、`documentation-conflict`をdocumentation statusとして拒否する。Closed descriptor、ordinary
  Diagnostic scope、opaque ID、internal
  stateが構築によってDTOへ入らないことも扱い、`tests/unit/shared/entities.test.ts`と`tests/unit/shared/api-types.test.ts`で拒否する
  *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session
  2026-07-29。)* *(2026-08-04 修正: 持つのはscalarのstatus/qualifier fieldだけである — source
  conditionをprojectするものが無いため、どのentityもそれを記録しない（T091）。)*
- [X] T018 fileとdirectoryへのsymbolic link (broken linkを含む)、link cycle、non-regular entry、deep
  tree、VCS内部、読み取り不能なfile/directory、NULを含むbinary file、invalid UTF-8/BOM
  file、discoveryとreadの間に消えるfile、Codex override/fallback contentの各caseの決定論的cross-platform
  fixtureを作る。product filesystem要求を計測してmutation-capable
  API/flagが0件であることを証明し、前後のcontent/length/identity/link/mode/mtime/ctimeと、platformがstable
  APIを提供する場合に限りxattr/ACL（contracts/inspection-path-allowlist.md § Symlink and read
  invariants。Node.jsは提供しないため、ctime観測が文書化済みの間接signalとなる）を記録し、OS-only
  atimeは別々に`tests/fixtures/filesystem/build-filesystem-fixtures.ts`に記録する
- [X] T019 compileされたinspection allowlistを`fs/promises`で普通に再帰walkするtraversalのfailing testを追加する:
  directoryは通常のreadで列挙する。symbolic
  linkは透過的に辿り、symlinkされたcandidateは他のfileと同様にtargetを通して読む。targetが存在しないか読めないlinkはそのfileの`file-unreadable`
  Diagnosticになる。訪問済みdirectoryをreal pathで追跡し、link cycleがscanの終了を妨げないようにする。hard
  linkは通常のfileである。VCS内部は除外する。raw entry nameがfilesystem operandのままで、それを`/`でjoinしたものが公開Source-relative
  Pathである。存在しないか読めないrootはsource-scopedな`root-unreadable` DiagnosticとなりSource
  attemptをfailさせる。operation間のidentity再検証やchange検出taxonomyは存在しない (FR-019,
  FR-024)。以上を`tests/unit/inspection/traversal.test.ts`に追加する *(2026-07-29修正: 公開されるpathはraw entry
  nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T020 file読み取りのfailing testを追加する: 発見された各fileはscan attemptごとに1回、mutation-capable
  flagなしの通常のread-only `fs/promises` readで読む。消えたか読めなかったfileはそのfileの`file-unreadable`
  Diagnosticとなり他のfileに影響しない。hard linkはphysical-identity groupingのない通常のfileである。Codexのoverride空ordered
  fallback (FR-035) が唯一のcontent依存selectionである。Source・scan
  attempt・generationは独立のままであることを`tests/unit/inspection/traversal.test.ts`で証明する
- [X] T021 FR-024/FR-028 publication matrixの統合failing testを追加する:
  `file-unreadable`またはadmit済みcandidateの`file-content-binary` outcomeはdiagnostic-only
  recordを保持し、他の点では公開可能なgenerationをpartialにする。`recognition-parse-failed`
  outcomeは読み取り可能sourceの表示とcomparison適格性を保ちつつ、影響を受けたrecognitionの派生dataだけを省く。読めないrootはsource-scopedな`root-unreadable`
  DiagnosticでSource attemptをfailさせ、partial
  generationを作らない。単一fileに閉じないfailureは何もcommitせずにattemptを中止する。scan中のfixtureへの外部mutationはproduct
  mutationではない。disable/shutdown/supersession後のlate
  resultはhard-cancellationを主張せずに破棄されることを`tests/integration/boundaries/traversal.test.ts`で証明する
- [X] T022 調査対象ソースのfilesystem I/Oが単一のinspection moduleに留まるよう、`src/server/inspection/`
  directory外の静的およびリテラル動的な`node:fs` importを拒否するアーキテクチャ境界を、production
  source限定の`no-restricted-imports`（静的）と`no-restricted-syntax`（文字列リテラル動的`import()`）ruleとして`./eslint.config.js`でenforceする。No-substitutionなテンプレートリテラルのspecifierは、標準の`@stylistic/quotes`
  rule（`allowTemplateLiterals: 'never'`）で扱い、プレーン文字列へ強制してそれをfs
  selectorが捕捉する。substitutionを含む、または算出される動的specifierだけがlintの保証ではなくreviewが所有する実装バグとする *(2026-07-23修正:
  import policyはlint layerが所有する — 静的linterがこのboundaryの保証できる形であり、既存のlint CI jobが実行するため、専用のcontract
  suiteは存在しない。)*
- [X] T023 [P] Session の保護は loopback-only binding だけとし、`tests/contract/host-startup.test.ts` の
  startup contract（T040）が assert する。認証なし loopback の残存露出は T1029 の下で文書化する *(2026-07-22 修正: devframe
  host の決定によりこの task の範囲は binding へ狭まった — session surface は devframe が所有するため、この task が定めていた guard
  には守るべき surface が無い。)*
- [X] T024 [P] `scripts/clean-build-output.mjs` による generated root へ閉じた
  cleanup、`scripts/verify-package-files.mjs` が regular file として検証する正確な2つの必須 package entry
  point—`dist/public/index.html` と `dist/cli.mjs`—および execution environment が artifact を完全に
  read/verify できない場合の安全な failure に関する failing build/package test を
  `tests/package/build-cleanup.test.ts` と `tests/package/verify-package-files.test.ts` に追加する
- [X] T025 必須 CLI エントリーを持つ dist 直下 `.mjs` の server bundle 集合、`package.json` と `pnpm-lock.yaml`
  closure から assert する承認済みの直接 production dependency
  集合—`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`
  *（2026-08-08 修正: `h3` は host の `/skills/**` shell fallback とともに加わった — research.md § 3）*
  *（2026-08-16 修正: `open` はproduct-ownedなstartup browser helperとして承認済み集合に加わった — research.md §
  3）*—、ならびに `gunshi/agent`/lazy/custom-plugin pathを含まないroot-API-only CLI importに関する dist-closure および
  package-policy の失敗テストを
  `tests/package/verify-package-files.test.ts`、`tests/package/production-graph.test.ts`、`tests/package/node-only-policy.test.ts`
  に追加する *（2026-07-23 修正: 範囲は dist closure、承認済み dependency 集合、CLI の import へ狭まった。commit 済み lockfile
  が各 resolved version と integrity hash を既に pin しており、install 時の enforcement は package manager
  が所有するため、この task が併せて定めていたものはそのどちらかを再記述することになる。plan.md § Source Code (repository root) 参照）*
  *(amended 2026-08-20: 承認済みsetは`strip-json-comments`を含み、JSONCのreadingはcomment syntaxを空白化してstrict
  JSONと同じ`JSON.parse`で解決する。独自にobjectを構築するlenient parserはauthoredな`__proto__`
  keyを保持できないためである（research.ja.md § 3）。)* *(2026-08-30 修正: `which`は承認済み直接依存である —
  editorへのhand-offが明示的なsearch path上のcommand解決にこれを使う（research.md § 3）。)*
- [X] T026 [P] Captured invocation working directoryとoptional `--root`からlexicalに選択したexactly one
  enabled idle Repository Sourceをgeneration 0がfilesystem I/O 0件で同期的に持つfailing generation/session
  testを追加する。Stable opaque `sourceId`、escaped non-authorizing `SourceBoundary`、empty
  files/Diagnostics、null `scanRequestId`、そのSourceから始まるautomatic first scanを検証する。全admitted
  automatic/explicit Source/progress/attempt/final status/successful generationでone opaque request
  IDを保持し、deterministic graph ID、coordinator-locked serialization、atomic N+1 replacement、構築どおりのrecord
  publication、last-commit retention、explicit-rescan stale state、late-result
  discardを扱う。Ordinaryなrequest-owned failure
  lifecycle（accept前のrejectionはrequestの実際のerrorで失敗しjobを作らず、accept済みjobのfatal
  rejectionは最後のcommitをstaleとして保持し失敗したrequestのerror messageを持つ）を検証し、ownerless automatic-startup
  rejectionはcatch/conversionされずprocess top
  levelへ到達することを`tests/unit/session/scan-generation.test.ts`と`tests/unit/session/session.test.ts`で証明する
  *(2026-08-08 修正: ID rekey の coverage は T1082 とともに構築どおりの publication の coverage になった — file の
  identity は Source-relative Path である。)*

### 実装

- [X] T027 作業は残っていない: errorは通常どおり報告され、productはsanitizer、envelope、operational event、request所有error
  boundaryのいずれのmoduleも持たない。Fileに閉じたfailureはFR-028に基づきper-file
  Diagnosticになり（`src/shared/diagnostics.ts`）、失敗した明示rescanはFR-030に基づき失敗したrequestのerrorとともにstaleなprior
  snapshotを保持する（`src/server/session/stale-failures.ts`）
- [X] T028 Readable `utf-8 | utf-8-replaced`、textを持たない`binary`、one-root Source、generation 0、exact
  `SourceBoundary`、descriptor、Diagnosticのpublic DTOを実装する。`DocumentationStatus` typeのscalar field
  `documentationStatus`とfixed-order duplicate-free `LifecycleQualifier[]` typeのscalar field
  `lifecycleQualifiers`をbehavior/rule/strategyごとにだけ置く。internal
  authority、acknowledgement、validation、aggregate status、捏造した`stable`
  fieldを`src/shared/entities.ts`と`src/shared/api-types.ts`で拒否する *(2026-07-29修正: 公開されるpathはraw entry
  nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)* *(2026-08-04 修正:
  持つのはscalarのstatus/qualifier fieldだけである — source
  conditionをprojectするものが無いため、どのentityもそれを記録しない（T091）。)* *(amended 2026-08-21: この2
  fieldはruntime-composition contractのcanonical evidence-assessment
  indexの展開であるため、`tests/contract/runtime-composition.test.ts`が出荷済みの全strategy
  recordを両言語のindexに対してgateする —
  indexに載らないままnon-defaultなassessmentを持つrecordは、それについてnormativeな唯一のartifact上では`documented`と読めてしまい、両者を突き合わせるものが他に無かった。)*
- [X] T029 compileされたinspection
  allowlistの普通の再帰traversalを`fs/promises`で`src/server/inspection/traversal.ts`に実装する:
  directoryを通常のreadで列挙し、訪問済みdirectoryをreal pathで追跡してlink cycleを終了させながらsymbolic linkを透過的に辿り、hard
  linkを通常のfileとして扱い、VCS内部を除外し、raw entry nameをfilesystem operandに保ち、それを`/`でjoinしたものを公開Source-relative
  Pathとし、存在しないか読めないrootをSource attemptをfailさせるsource-scoped `root-unreadable` Diagnosticとして記録し
  (FR-002)、消えたか読めないfile (broken linkを含む) を他のfileに影響しないそのfileの`file-unreadable`
  Diagnosticとして記録する。operation間のidentity再検証、change検出taxonomy、resource registryは追加しない (FR-019, FR-024)
  *(2026-07-29修正: 公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session
  2026-07-29。)*
- [X] T030 `data-model.md § TraversalPlan`のclosedでimmutableなversioned
  `TraversalPlan`とsegment-program
  typeをregistryとともに`src/server/inspection/rules/registry.ts`に定義し、`src/server/inspection/traversal.ts`にはそのcompile済みplanだけを解釈させる:
  selected rootを基点とするtyped literal/regex/非隣接recursive segment
  program、VCS除外、`/`でjoinした綴りが公開pathとなるraw operand、唯一のcontent依存分岐としてのCodex ordered fallback。CLIのroot
  selectionは`src/server/cli.ts`のlexicalな処理に留まり (`--root`は反復指定をparserのlast
  valueへ解決、絶対値はそのまま、相対値は1回だけcaptureした`process.cwd()`に対して解決)、scanは保持されたselected
  rootを単に読む。共有root-grammar parser moduleや独立のadmission層は存在しない (FR-001, FR-019) *(2026-07-29修正:
  公開されるpathはraw entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T031 file単位の読み取りを`src/server/inspection/traversal.ts`に実装する: 発見された各fileをscan
  attemptごとに1回、mutation-capable flagなしの通常のread-only `fs/promises`
  readで読み、symlinkされたcandidateはtargetを通して透過的に読む。read failure (broken linkを含む)
  は他のfileを継続させたままそのfileの`file-unreadable` Diagnosticに変換する。hard linkはphysical-identity
  groupingなしの通常のfileとして扱う。Codexのoverride空ordered fallback (FR-035)
  を唯一のcontent依存selectionとして実装し、authority revocation後のlate resultはhard cancellationを主張せずに破棄する
- [X] T032 closedなfile限定publication matrixを`src/server/inspection/scan.ts`に実装する:
  `file-unreadable`またはadmit済みcandidateの`file-content-binary`
  outcomeは、整合した`sourceId`/`sourceRelativePath` pairを持つfile scopeのdiagnostic-only
  itemを保持し、他の点では公開可能なgenerationをpartialにする。`recognition-parse-failed`
  outcomeは完全な読み取り可能sourceの表示とcomparison適格性を保ち、影響を受けたrecognitionの派生metadata/relationshipだけを省く
  (FR-028)。`root-unreadable`は`sourceId`のみのsource scopeで、partial generationなしにSource
  attemptをfailさせる。1つのfileに閉じないfailureは決してDiagnosticに変換されず、通常どおり伝播してcommitなしにattemptを中止し、失敗したrequestの実際のerrorとして報告される（FR-030により最後にcommitされたsnapshotを保持する）
- [X] T033 `src/server/inspection/traversal.ts`のmodule headerにtrusted-workspace boundaryを文書化する:
  調査対象customization fileはadversaryとしてモデル化されない (FR-019、constitution Quality and Safety
  Standards)。agentはcustomization fileのload時にsymbolic linkを解決するため、linkは透過的に読む
  (FR-024)。readは通常かつread-onlyで、scan中の外部変更はchange検出taxonomyではなくfile単位diagnosticまたは通常のfailed
  attemptとして現れる
- [X] T034 2026-07-22 の devframe host 決定に従い、local host framework の依存として devframe（`package.json` では
  caret range、resolved version は lockfile が pin）を `./package.json` に採用し、production dependency
  集合を承認済みの正確な11個の直接依存—`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`—へ
  `tests/package/production-graph.test.ts` の `APPROVED_PRODUCTION_DEPENDENCIES` で gate する
  *(2026-08-08 修正: `/skills/**` shell fallbackにより`h3`が承認済み直接依存になった。他と同じくcaret
  rangeで宣言し、lockfileがdevframe自身のh3へresolveすることで両者は1つのmodule instanceに解決される（research.md § 3）。)*
  *(2026-08-16 修正: product-ownedなstartup browser helperにより`open`が承認済み直接依存になった。devframeのbundled
  openerは無効化され、helper packageを直接宣言してreviewする（research.md § 3）。)* *(amended 2026-08-20:
  承認済みsetは`strip-json-comments`を含み、JSONCのreadingはcomment syntaxを空白化してstrict
  JSONと同じ`JSON.parse`で解決する。独自にobjectを構築するlenient parserはauthoredな`__proto__`
  keyを保持できないためである（research.ja.md § 3）。)* *(2026-08-30 修正: `which`は承認済み直接依存である —
  editorへのhand-offが明示的なsearch path上のcommand解決にこれを使う（research.md § 3）。)*
- [X] T035 Cleanup/package placeholderだけを置き換える。`scripts/clean-build-output.mjs`ではcleanupをgenerated
  rootに限定し、`scripts/verify-package-files.mjs`ではpackage契約が依存する2つのpackage entry point—devframe
  hostが配信する`dist/public/index.html`、およびNode bundleの`dist/cli.mjs`—を検証する。Buildのpipelineはclean → nuxt
  build → tsdownであり、build時のasset manifestは存在せず（devframe
  hostによりsupersede、2026-07-22）、各scriptはexecution environmentが確認を完了できない場合に安全に失敗する
- [X] T036 Server/package placeholderだけを置き換える。承認済みの正確な11個の直接production
  dependency—`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`—という集合を`package.json`と`pnpm-lock.yaml`
  closureから`tests/package/production-graph.test.ts`でassertし（別のproduction-graph scriptやevidence
  fileは存在しない）、T003でscaffoldしたfixed Node ESM CLI entryを保持する *（superseded 2026-07-23:
  locked版versionとregistry
  integrityのassertionは削除した。commit済みlockfileが両方を既にpinしており、testで再記述してもlockfileを二重化するだけである）*
  *(2026-08-08 修正: `/skills/**` shell fallbackにより`h3`が承認済み直接依存になった。他と同じくcaret
  rangeで宣言し、lockfileがdevframe自身のh3へresolveすることで両者は1つのmodule instanceに解決される（research.md § 3）。)*
  *(2026-08-16 修正: product-ownedなstartup browser helperにより`open`が承認済み直接依存になった（research.md § 3）。)*
  *(amended 2026-08-20: 承認済みsetは`strip-json-comments`を含み、JSONCのreadingはcomment syntaxを空白化してstrict
  JSONと同じ`JSON.parse`で解決する。独自にobjectを構築するlenient parserはauthoredな`__proto__`
  keyを保持できないためである（research.ja.md § 3）。)* *(2026-08-30 修正: `which`は承認済み直接依存である —
  editorへのhand-offが明示的なsearch path上のcommand解決にこれを使う（research.md § 3）。)*
- [X] T037 2026-07-22のsplit決定が要求する2つのindependent sequenceに対するdeterministic generation
  constructionを実装する。Repository sequence（`RepositoryScanGeneration`、kind `bootstrap` |
  `repository-scan`）は、captured invocation `cwd`/`--root`から選択されたexact enabled idle non-authorizing
  Repository Sourceをstable source ID、empty files/Diagnostics、null request ID、I/O
  0件で含む`createBootstrapGeneration`の同期generation 0から始まり—他のgeneration-0
  shapeはrejectする—`prepareNextRepositoryGeneration`でadvanceする。Global
  sequence（`GlobalScanGeneration`、kind `global-enable` | `global-scan`）は、generation
  1として作成する`createGlobalEnableGeneration`
  commitからdisableがdiscardするまでだけ存在し、`prepareNextGlobalGeneration`でadvanceし、disable commit
  kindを持たない。各commitは自sequenceのrecordを構築どおりにpublishして他sequenceに触れず、sessionは`committedRepositoryGeneration`とnullableな`committedGlobalGeneration`を保持してsnapshotに`repositoryGeneration`/`globalGeneration`を公開する。Admitted
  statusからsuccessful generationまでone request IDを保持し、coordinator-locked
  serialization、atomicなper-sequence N+1 replacement、explicit-rescan stale
  retention、失敗したrequestのerror messageを持つSourceのstale overlayとしてのaccepted-job failure
  retention（`failScan(scanRequestId, message)`）、startup rejectionのprocess top-level
  propagation、authority revocation後のcleanup-only late-result
  discardを`src/server/session/scan-generation.ts`、`src/server/session/stale-failures.ts`、`src/server/session/session.ts`に実装する
  *(superseded 2026-07-22: 旧来のmutation前overflow rejection句はdefensive-check削除で除去された — runtime
  overflow guardは存在しない。)* *(2026-08-08 修正: file の identity は Source-relative Path で commit
  を跨いで安定であるため、rekey 句は無い（T1082）。)*
- [X] T038 devframe application定義とhostの配線を`src/server/host/devframe-app.ts`に実装する:
  製品の`id`/`name`と`cli: { distDir: 'dist/public', auth: false }`を持つ`defineDevframe`によってdevframeがbuild済みSPA
  shellを配信しloopback bindingの背後で認証なしに動作し、session
  API契約（contracts/http-api.md）に従い`setup`内で`agent-customization-inspector:` prefixのsession RPC
  functionを登録し、CLIから`createDevServer`（`devframe/adapters/dev`）でstartupしてport/hostをdevframeが所有し、hostはdevframeのbundled
  openerを無効化したうえでlaunch lineの後に`open` packageのbrowser helperをspawnする。Throw/rejectされたRPC handler
  errorはdevframeがそのままserializeし、失敗したrequestはacceptance前ならcreated job/ID・result
  body・generationなしに実際のerrorを報告し、acceptance後はretained accepted-job errorをsession snapshotのstale
  overlay経由で公開する。Delivery failureをpartial化せず、commit済みsnapshotを維持する
- [X] T039 inspection traversalとNode.js-only package-policy
  suiteのCI実行を`.github/workflows/ci.yml`に追加する

---

## フェーズ 3: 起動可能な認可済み空画面

**目的**: Repositoryを読み取らずに、最初のuser-visible product incrementを提供する。

**独立テスト**: Host起動またはbrowser openingより前に、generation 0がcaptured invocation `cwd`/`--root`からlexicalにselectedされたexactly one enabled idle Repository Sourceをstable opaque `sourceId`、escaped non-authorizing boundary、empty files/Diagnostics、null `scanRequestId`、filesystem I/O 0件で同期的に構築することを検証する。その後packageをinstallし、fixture invocation `cwd`からoptional `--root`あり/なしでlaunchしてautomatic startup scan後にprinted loopback URLを開き、browserがcommit済みのReady Repository Sourceをescaped non-authorizing boundaryおよびempty files/Diagnosticsとともに表示することを検証する。

**目に見えるチェックポイント**: Browser screenが起動し、product contentはほぼ何も表示されない。

### テスト先行

- [X] T040 [P] [US1] devframe dev serverに関するfailing host startup contractを追加する:
  `cli.distDir`（`dist/public`）からbuild済みSPA shellをdevframe所有のstatic
  handlingと`auth: false`で配信し、loopbackだけにbindし、startup documentation/network accessが0件で、customization
  contentをclassifyしないこと、およびexactな宣言済み`engines.node`と`bin: dist/cli.mjs` package
  fieldが成立することを検証する。Ownerless automatic-startup throw/rejectionがproduct liveness
  guarantee、捏造されたDiagnostic、scan resultへ変換されず通常どおりprocess top
  levelへ到達することを`tests/contract/host-startup.test.ts`で証明する
- [X] T041 [P] [US1] devframe RPC channelを通じた`get-session` invocationと、そのexactなrequest
  token/`clientDataEpoch`/sequence別generation/`globalContentEpoch` guardのfailing client
  testを追加する。全inspection-data successはcaptured epochを持ち、final response
  gateでepoch不変かつ`globalDisableInProgress` nullの場合だけrenderする。いずれのresponseでもgreater epochまたはnon-null
  fenceを観測したらrender前にshared full client-data purgeを行うことを要求する。（session-liveness
  probeを削除した。productは2枚目のbrowser tabをmodelしないため、probeが唯一担っていたこと——他tabのGlobal
  disableを能動的に観測すること——には要件が無い。host喪失はloopback
  socketのcloseとしてdevframeが問い合わせなしにpageへ報告し、全responseは引き続き採用済みepoch/fenceに対してcheckされる。`get-liveness`、`LivenessProjection`、focus/blur
  listener、page-lifecycle purge/refetch、旧`src/app/session/liveness.ts`は削除した。File ID
  guardはT096/T102のfile-detail clientで追加する。）Lateなresolve/reject settlementを拒否し、older/equal/newer
  generation、persistence 0件、Phase 3 session API catalog外のcall
  0件も`tests/unit/app/api-client.test.ts`で検証する
- [X] T042 [P] [US1] Generation 0 snapshotをadoptし、page-lifecycle listenerを一切設置せず、経過時間またはidle
  pageからrequestを発行しないbrowser-state testを追加する。（page-lifecycle eventはpurge
  triggerではない。FR-027はdocument-liveness failureまたは同等のterminal
  reset後にpurgeするもので、tab切り替えもページからの離脱もそのどちらでもない——破棄されたdocumentは自分のmemoryを解放し、bfcacheに入ったdocumentが保持するのは同じユーザーが自分のマシンで自分のファイルを見た状態にすぎない。Visibility/unload
  listener、visible復帰時の再取得、liveness DTO/check、およびそのtestを削除した。）CurrentなRPCでtransportが報告するchannel
  lossまたは解釈できないprotocolがshared purgeを実行してended viewへ入り、そのpurge前にcaptureしたsettlementを拒否することを要求する。
  *(2026-08-06 修正: current RPC rejectionはpurge triggerではない — ordinaryなhandler/serialization/delivery
  failureはそのrequestのerrorに留まり、commit済みsnapshotは読めるまま残る。purgeしてsessionを終えるのは、transportが報告するchannel
  lossまたは解釈できないprotocol、session mismatchだけである（contracts/http-api.md § Concurrency and
  lifecycle）。)*Shared
  purgeが登録済みdisposerをすべて同期的に呼び、clear後に`clientDataEpoch`をadvanceし、unregister済みdisposerを呼ばないこと、polling
  interval/request timeout/retry timer/memory leaseを定義しないこと、continuously
  idleなpageにproduct定義のwall-clock process-loss
  checkがないことを`tests/unit/app/session-view-state.test.ts`と`tests/unit/app/client-data.test.ts`で証明する
- [X] T043 [P] [US1] Root `define`/`cli` API、positive
  default-trueの`open`/生成される`--no-open`、反復指定をparserのlast valueへ解決するoptional `--root <path>`のGunshi
  CLI/packaged launch testを追加する。`process.cwd()`を正確に1回captureし、省略時はそのexact
  invocation文字列を保持する。絶対optionはそのまま保持し、相対optionはlexicalな`node:path` operationだけでcaptureしたinvocation
  directoryに対して解決する。Selection自体のfilesystem/network I/Oを0件にし、`process.chdir()`を決して呼ばず、明示的なempty
  valueをsession作成やbrowser openingより前にfixedでactionableなsource-value-free出力で拒否し、valueの欠落はGunshiのtyped
  argument validationで拒否する。`process.cwd()` throwを注入し、session・browserなしのordinaryなownerless
  process-top-level propagationを要求する。Non-binding help/version、厳格なunknown/positional/rest
  rejection、awaited host startup、正確なpackage field、closed loopback URLとprinted-URL
  fallback、無関係なworking directoryからのbuilt shell配信、調査対象fixtureが変更されないこと、graceful
  shutdownを`tests/unit/cli.test.ts`と`tests/package/npx-launch.test.ts`でカバーする。このPhase 3 package
  testにおける「isolation」は無関係なworking directoryだけを意味する。Packed
  tarballからのinstallと、inspection由来valueがbrowser openingへ到達しないことを含むcomplete
  packed-entry/default-browser/helper/environment instrumentationはT917が所有する。
- [X] T044 [US1] Packaged boot shellがexact one enabled Repository Source、そのescaped non-authorizing
  selected-root label、empty files/Diagnosticsを表示し、keyboard focusを先頭に置き、Repository picker/ancestor
  discoveryを提供しないこと、およびtransportが報告するhost喪失が操作なしにrender済みSourceをpurgeしてsessionを終了させることを`tests/e2e/boot.spec.ts`でbrowser
  acceptanceとして検証する。（bootstrap generation 0はpageからは観測できない——automatic first Repository
  scanは同じlaunchで開始するため（FR-002）、そのsynchronousなidle/null `scanRequestId`
  shapeは`tests/unit/session/session.test.ts`と`tests/contract/host-startup.test.ts`が引き続き所有する。別hostが応答した後のfresh-session
  recoveryも、devframe RPC socketがhost喪失後に再接続しないため到達不能である。したがってbrowser suiteは到達可能なsession-ended
  pathだけを扱い、session-identity mismatch branchは`tests/unit/app/api-client.test.ts`で駆動する。）

### 実装

- [X] T045 [US1] devframe host により supersede（2026-07-22）: build 済み shell の static asset 配信、SPA
  fallback、media type は、`src/server/host/devframe-app.ts`（T038）で設定する
  `cli.distDir`（`dist/public`）を通じて devframe が所有する。手書きの static-file module も build 時の asset manifest
  も存在しない
- [X] T046 [US1] 直接実行されるCLIのloopback host startup boundaryを実装する（Node.js互換性はpacked `engines.node`
  rangeの宣言とpackage managerのenforceに委ね、runtimeでは再検査しない）。Automatic inspected-source workを含む全ownerless
  startup throw/rejectionは捏造されたDiagnosticやliveness guaranteeを作らず通常どおりprocess top
  levelへ到達させる。Loopbackにbindしたdevframe dev
  server（`createDevServer`）を起動し、epoch、fence、Diagnostic、retainされたstale-failure errorを伴うsession
  snapshotをsession RPC channel経由で公開し、startup documentation/network access
  0件を`src/server/host/devframe-app.ts`で保証する
- [X] T047 [US1] positive default-true `open`、生成される`--no-open`、反復指定をparserのlast valueへ解決するoptional
  `--root <path>`を持つGunshi root `define`/`cli` entryを実装する:
  validation前に`process.cwd()`を1回captureし、省略時はその正確な文字列を使う。絶対optionはそのまま保持し、相対optionはlexicalな`node:path`
  operationだけでcaptureしたinvocation directoryに対して解決する。検証済みpackage
  bootstrapの後、selection自体はfilesystem/network
  I/Oを0件にし、`process.chdir()`を決して呼ばず、明示的なempty入力をsession/browser作成前にfixedでactionableな出力と非zero
  exitで拒否し、valueの欠落は同じboundaryでGunshiのtyped validationに委ねる。`process.cwd()`
  throwはsession・browserなしで通常どおりprocessのtop levelへ伝播させる。厳格なunknown/positional/rest rejection、awaited
  completion、non-binding help/version、root-only import、closed loopback URL、fixed OS browser
  helper、inspection由来の環境変数値を一切書き込まないlaunch-environment継承policyとinspection由来入力の除外、使用可能なprinted-URL
  fallback、graceful shutdownを`src/server/cli.ts`で保持する（hostはdevframeのbundled openerを無効化したうえで、launch
  lineの後に`open` packageのfixed OS browser helperをbest-effortでspawnするため（contracts/http-api.md § Host
  requirements #4）、cross-platformのhelper解決はmaintainされたpackageのpolicyのままになる。`--root`のmissing
  valueも同様にparser自身のtyped validation errorであり、commandはGunshiが受理するempty
  valueだけを`ctx.explicit`で検出して拒否する。） *(2026-08-15 修正: helper は維持されている `open` package を通じて launch
  environment を変更なしで継承する — copy すべき ambient allowlist は存在せず、product は inspection
  由来の環境変数値を書き込まない（spec.md § Clarifications）。)*
- [X] T048 [US1] Phase 3の`get-session` API clientをdevframe RPC channel上に、exact request
  token、abortable-request
  bookkeeping、`clientDataEpoch`/sequence別generation/`globalContentEpoch`/session identity/fence
  adoption guardとともに実装する。Inspection-data successをrenderする前にcaptured
  epochがcurrentかつ`globalDisableInProgress` nullであることを要求する。Greater epochまたはnon-null
  fenceではrender前にshared full purgeを行い、staleなresolve/reject
  settlementをすべて拒否する処理を`src/app/session/api-client.ts`に実装する。（このmoduleは`composables/`ではなく`src/app/session/`に置く。Closure-localなrequest
  stateを扱うplain factoryを1つexportするだけでreactivityを持たず、Vue
  composableではないため`composables/`は実態を誤って説明する。名前もAPIのどちら側の実装かを述べるものにする。Control-only fence
  recoveryはT1027、file-detail ID guardはT096/T102へdeferする。）
- [X] T049 [US1] Channel failure、session identity loss、greater `globalContentEpoch`、non-null
  fenceに対するPhase 3のshared synchronous full client-data purgeを実装する。Listenerは設置せず、polling
  interval、request timeout、retry timer、memory lease、liveness probe、page-lifecycle
  purgeを使わない。Outstanding requestを、現在実装済みのbrowser-owned session
  snapshot、inventory/Source/file/Diagnostic graph、retained
  errorのclear前にabortし、その後`clientDataEpoch`をincrementしてstale settlementによる復活を防ぐ。Transportが報告するchannel
  lossを直接ended viewとして採用し、API clientのrequest token、epoch、generation、identity、fence guardを通ったinitial
  full snapshotだけをrenderする。このstateと1言語のboot/ended copy、そして共有のnavigation scroll/focus
  ruleを`src/app/session/client-data.ts`、`src/app/session/view-state.ts`、`src/app/App.vue`、`src/app/router.options.ts`、`src/app/styles/main.css`に実装する。（reactive
  browser view stateは`src/app/session/view-state.ts`の`SessionViewState` classが持つ。Vue
  composableでもpage frameでもなく、名前が保持する対象を述べている。Shared purgeはimportを持たないdependency leaf
  `src/app/session/client-data.ts`へ分離した。Global disable送信前purge、control-only
  `GlobalFenceRecoverySnapshot`、Resume、およびcomparison/editor/filter
  ownerはT1027と各担当phaseへdeferする。Detail ownerはここで登録する（skill-detail
  routeが持つstateも他と同じくpurgeされる）。Acknowledgement ownerもwarning
  ownerもdeferする対象として存在しない。FR-027がどちらも持たないためである。） *(2026-08-15 修正: `src/app/router.options.ts`
  を所有ファイルに加えた — scroll と shell の見出し focus は共有の page-identity rule
  で「ページが変わったか」を一度だけ判定し、同一ページのパラメータ変更はどちらも動かさず、ページ変更は focus された見出しのある先頭から始まる。)* *(2026-08-22 修正:
  一覧に戻るページ変更だけは、読み手がたどった行を focus し、その行が置かれていた位置へ戻す。viewport と focus された要素は変わらず一緒に到着する。この rule と復元する
  point は T1122 が所有する。)*

---

## フェーズ 4: Codex SKILL 一覧

**目的**: Codex skills を対象に、最初の安全な Repository inventory 単位を提供します。

**独立テスト**: root と入れ子の `.agents/skills/*/SKILL.md`、near miss、link、不正な名前、無関係なファイルを含む fixture から起動し、allowlist 対象の Codex skill row だけが path、source、kind、tool とともに表示されることを検証します。

**目に見えるチェックポイント**: Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。

### fixture とテストを先行

- [X] T050 [US1] Positive、nested、near-miss、malformed-name、linked、empty、secret-bearing、performance の各
  Codex SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する。Throw または reject する
  operation は tree ではないため fixture を持たない: それを必要とする suite は `fs-io` module mock で operation 自体を、その
  case が対象とする正確な呼び出し地点で置き換える。Materialize した directory ではそれを表現できない
- [X] T051 [US1] Codex skill の behavior、rule、strategy、evidence の conformance row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T052 [P] [US1] 安定した reciprocal ID、閉じた matcher/traversal/derivation kind、typed program として
  author する literal/regex/non-adjacent-recursive token grammar（selector text の parse はなし）、immutable
  で versioned な `TraversalPlan` output、evidence grammarと規範的なofficial-sources
  rowへの解決、registry/compiler の失敗契約を `tests/contract/vendor-behaviors.test.ts` と
  `tests/contract/inspection-rules.test.ts` に追加する。Production 除外はそこでは証明できない: citation はそれを運ぶ record
  上にあり、import graph が両者を分離しないため、値が消えていることを示せるのは build 済み artifact
  だけである。`tests/package/verify-package-files.test.ts` がその assert を所有する。`semanticFingerprint` の再計算は本
  task の範囲外とする。Maintainer 専用の drift command が捕捉するまで fingerprint は存在しない（T1032）
- [X] T053 [P] [US1]
  `['.agents', 'skills', ANY_NAME, 'SKILL.md']`（選択されたrootに固定し、先頭の`ANY_DIRECTORIES`を持たない。Codexはworkingディレクトリからrepositoryルートへupwardにscanしdescendしないためである（FR-001））
  が typed plan へ一度だけ compile され、安全な filesystem はその plan だけを実行し、vendor code は match
  の分類だけを行い、descendant/near-miss/VCS 動作が正確で、runtime-chain fact が引き続き conditional であることを証明する Codex
  SKILL の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [X] T054 [P] [US1] tool、`skill` kind、path provenance、無関係な recognition がないことに関する Codex recognition
  の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T055 [P] [US1] captureした`cwd`/`--root`からlexicalに選択済みのgeneration-0 Sourceから始まるRepository
  scanのfailing testを追加する: その安定`sourceId`、escapeされたboundary、enabled idle状態、空のfiles/Diagnostics、null
  request IDはfilesystem I/O 0件で同期的に存在し、scanは保持されたraw selected rootを読む。raw path segmentがfilesystem
  operandのままであり、それを`/`でjoinした綴りが公開identityであること — 見た目が同じにrenderされ得る2つのraw綴りは2つのordinary
  fileとして公開されること、hard linkが通常のfileであること、symlinkされたcandidateはtargetを通して読まれbroken
  linkは`file-unreadable` Diagnosticになること、消えたか読めないfileは`file-unreadable`
  Diagnosticになり影響のないfileはpartial generationとして公開されること、読めないrootはsource-scoped `root-unreadable`
  Diagnosticでattemptをfailさせpartial
  inventoryを公開しないこと、単一fileに閉じないfailureはresult/generationなしでattemptを中止し、失敗したrequestのerrorとして通常どおり報告されるかownerless-startup
  top-level propagationになることを検証する。atomic recognition、last-commit
  retention、revocation、verdictなし、relationship-target read
  0件も`tests/integration/repository-scan.test.ts`でカバーする *(2026-07-29修正: 公開されるpathはraw entry
  nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T056 [P] [US1] `--no-open`またはisolated startup helper後に開始するinstrumentationを使う。Local fixture
  rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image
  surfaceをinstrumentする。発行済みのexactな`localhost` authorityにおける2つのexactなFR-022 authorized internal
  loopback class、すなわちpackaged UI assetへのstatic/SPA `GET`/`HEAD`とlocal session API
  channelを別々に分類・検証する。それ以外の全surfaceについて、Codex SKILL discoveryがchild process、dynamic
  evaluation/import、MCP connection、禁止対象のdirect product-issued outbound request、URI
  load、mutation-capable open/filesystem
  mutationを発生させないことを証明する。Content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL
  stateを比較し、OS-only atimeは別に記録する。対象は`tests/integration/security/zero-activation.test.ts`とする
- [X] T057 [P] [US1] Generation 0のexactなRepository Sourceと`process-cwd`/`root-option` boundary
  origin、session API契約（contracts/http-api.md）のsession snapshot invocation、Repository rescan
  admissionのfailing contractを追加する。Normal inspection-data successは`globalContentEpoch`と両方のsequence
  generationを持つ。FenceはここではScope外であり、このphaseを通してnullのままである。Fenceを立てるGlobal
  disableが存在しないため、recovery-onlyなsession responseと`global-disable-pending`
  conflictは検証対象を持たない。T1018がそれらを、それらを到達可能にするdisable
  functionとともに実装する。Exactなpre-/post-acceptanceのordinary-error挙動（accept前のrejectionはrequestの実際のerrorで失敗しjobなし、accept済みjobのfailureは保持snapshotをそのerrorとともにstaleにする）、startup
  ownership、request correlation、deterministicなfirst-scan対explicit stale behavior、stale
  IDを`tests/contract/http-api-session.test.ts`で検証する
- [X] T058 [P] [US1] Codex
  row、`SourceBoundary.displayRoot`と`origin`からrenderするescape済みでinertなRepository root
  labelを全Source-relative item pathと区別しnavigation/read locatorとして再利用しないこと、source/path/kind
  label、progress、empty state、rescan、retry、diagnostics、およびsession summaryがsource textを一切露出しないこと
  *(2026-07-29 修正: summaryはdeclared valueを1つだけ運ぶ — skillの宣言済み名で、FR-007/T1064がpresentation
  identityと定義する。他のauthored valueはすべてdetail routeの内側に留まる。)*
  に関するinventoryの失敗テストを`tests/unit/app/inventory.test.ts`に追加する（2026-07-25 amended:
  これらのassertionはcomponentをmountせず、filter composableとsession view stateを直接駆動する。unit
  projectにはsingle-file-component compilerがなく、追加するとT001がgateするapproved dependency
  baselineが変わるためである。renderされたpageを本当に必要とする2点 — escape済みroot labelがすべてのSource-relative item
  pathと区別して提示されること、およびnavigation/read locatorとして提供されないこと —
  は`tests/e2e/codex-skills-list.spec.ts`（T059）で実際のpageに対して検証する。）
- [X] T059 [US1] Codex 専用 fixture を起動し、source content を含まない正確な SKILL 一覧が表示されることに関するブラウザー受け入れ失敗テストを
  `tests/e2e/codex-skills-list.spec.ts` に追加する
- [X] T060 [US1] Reciprocal behavior/rule referenceと、各recordのcitationが規範的なofficial-sources
  rowへ解決することに関するCodex skill registry-graph
  coverageの失敗テストを`tests/contract/vendor-behaviors.test.ts`と`tests/contract/inspection-rules.test.ts`
  *(2026-08-04 修正: projectするものが無いため（T091）、assembleする相手のconsumerが存在せず、assemblerも存在しない。)*で証明する

### 実装

- [X] T061 [US1] Registry recordを実装し、closed matcher/traversal/derivation
  grammarをT030で定義済みの`TraversalPlan`/segment-program typeへwidenせずcompileする。Closed typed segment
  grammar（非隣接recursionを含む）、reciprocal validation、one-edge derivation acyclicity、official-source
  evidenceを除外するproduction loading、およびnatural-language interpretation/ranking、customization
  correctness/validity/compliance/effectiveness/quality verdict、validation/lint、remediation/fix
  behaviorを表現不能にするallowlisted structure-only projection vocabularyをenforceする。Shared plan
  typeはregistryとともに`src/server/inspection/rules/registry.ts`へ保持する *(2026-08-04 修正:
  projectするものが無いため（T091）、assembleする相手のconsumerが存在せず、assemblerも存在しない。)*
- [X] T062 [US1] 読み取り権限を付与しない `codex.behavior.repo.skills`/`codex.behavior.user.skills` statement
  を、完全な base skill-discovery strategy とともに追加し、この milestone で production registry を閉じたままにする。Registry
  は vendor ごとに 1 ディレクトリで配置する: `src/shared/registries/<tool>/` が
  `behaviors.ts`、`strategies.ts`、`rules.ts`、`relations.ts` を持ち、record の形とそれらを公開する aggregate は
  `registries/` 直下に置く。Registry 間の参照は record の field ではない — `relations.ts` の意味のある名前の
  edge（`basedOnBehaviors`、`explainedByStrategies`、`consumesBehaviors`）に置き、edge は identifier ではなく参照先
  record を保持するため、relation を読めば名指された当のものへ直接たどり着く。Behavior は outgoing edge を持たないため、graph は behavior ←
  strategy ← rule の DAG になる。Edge が record を保持できるのは非循環だからであり、循環をまたぐ `const` 参照は module
  評価時に失敗する。`InspectionRule.policyRefs` は他 registry ではなく spec.md の clause を指すため record 側に残す。識別子は
  `identifier-types.ts` の closed union なので、各 aggregate の網羅性は証明され、参照はコンパイル時に検査される。Citation も edge
  ではない: 各 record が自身の citation を `evidence` 配列に書き、`tsdown.config.ts` が
  `__ACI_SHIP_MAINTENANCE_DATA__` で `locator: VendorLocator | null` とともに packaged CLI から compile
  除去する — どちらも DTO field が運ばず、この置換は黙って失敗しうるため package suite が build 済み artifact
  に両方とも含まれないことを検査する。data-model.md/.ja.md § RegistryRelations、plan.md/.ja.md § Project
  Structure、`tests/fixtures/conformance/relations.json` は本 task に含む。
- [X] T063 [US1] 読み取りを認可する `codex.repo.skill` record を `src/shared/registries/inspection-rules.ts`
  に追加する（2026-07-25 amended: matcher は先頭に `recursive-directories` step を置くのをやめ、Repository root に
  anchor した `['.agents', 'skills', ANY_NAME, 'SKILL.md']` とする。Codex の skill scan は runtime working
  directory から repository root へ*上向き*に走り、下降しない。そして selected root がその repository root なので、先頭
  recursive step は agent が決して読まない nested `.agents/skills` を inventory していた。FR-001 にこの同一視を明記し、option
  は `--cwd` ではなく `--root` と綴る。名指しているのが working directory ではなく repository root だからである。これにより admit
  する集合は狭まる: nested な `packages/api/.agents/skills/deploy/SKILL.md` は positive case から near miss
  へ移り、performance fixture の bulk skill は admit される唯一の skills directory 内の sibling
  へ移した。spec.md/.ja.md の FR-001、inspection-path-allowlist.md/.ja.md の § Structured Inspector matcher
  notation・§ Repository selector requirements・§ Common conformance requirements、data-model.md/.ja.md
  の § StructuredInspectorMatcher と不変条件 13、および Codex ベンダー契約（両言語）の `codex.repo.skill`
  行を同じ変更で更新した。Global scope も読み取り権限も変わらないため、consent-bound contract version は据え置く。）
- [X] T064 [US1] Codex skill の evidence record を、`src/shared/registries/codex/` の
  behavior・rule・strategy record 自身の `evidence` citation として追加する。Evidence は専用の registry module を持たない:
  維持対象の各 record が review 済み URL・見出し・review 日・paraphrase を `evidence` 配列に書くため、根拠が 2 hop
  先ではなく主張の隣に置かれる。Page ごとの規範的な 1 row は contracts/official-sources.md に残る。`tsdown.config.ts` は
  `__ACI_SHIP_MAINTENANCE_DATA__` define で、それらの citation を `locator: VendorLocator | null` とともに
  packaged CLI から compile 除去する — どちらも DTO field が運ばない。この置換は黙って失敗しうるため、package suite が build 済み
  artifact に含まれないことを検査する。Vendor の evidence 追加は、その vendor の record に citation
  を書くことを意味する。data-model.md/.ja.md § EvidenceCitation が governing section である。
- [X] T065 [US1] vendor 所有の walker や selector 再解釈を使わず、registry で compile された `codex.repo.skill` plan
  に対する Codex skill classification を `src/server/inspection/rules/codex.ts` に実装する
- [X] T066 [US1] parsing や source exposure を行わず、path-derived Codex skill recognition を
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T067 [US1] generation-0の表示boundaryではなく保持されたraw selected rootから、compile済みT030 `TraversalPlan`
  workをtraversal moduleへ送りその型付きfile単位resultを消費するRepository scan
  orchestrationを`src/server/inspection/scan.ts`に実装する。raw
  operandを`/`でjoinした公開pathとして保持するが、directory列挙とfile読み取りはT029/T031に基づき`src/server/inspection/traversal.ts`に残す。file限定Diagnostic
  matrixと決定論的partial outcome、source-scoped `root-unreadable`
  failure、単一fileに閉じないfailureの無変更伝播、authority revocation、late
  discard、verdictなしを`src/server/inspection/scan.ts`でorchestrationする *(2026-07-29修正: 公開されるpathはraw
  entry nameを`/`でjoinしたものになった。spec.md Clarifications § Session 2026-07-29。)*
- [X] T068 [US1] Generation 0 Sourceからautomatic first scanとFIFO explicit rescanを実装し、1つのrequest
  IDをSource/progress/attempt/generationで保持する。Raw rootだけをadmitし、atomic complete/partialはClosed Scan
  Publication Outcomesの表に正確に従う。Ownerless startup throw/rejectionはliveness保証なしでprocess top
  levelへ到達させる。Accept済みexplicit rescan jobがfatalにrejectした場合はprior commitを保持し、失敗したrequestのerror
  messageだけを`failScan(scanRequestId, message)`経由で参照するstale overlayを作成または置換するが、accept前rejectionはprior
  snapshotを変更せずstale overlayを作成しない。既存overlayはsuccessful replacementでのみclearし、late
  workをdiscardする処理を`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`に実装する
- [X] T069 [US1] Deterministic Repository summary/admissionとordinaryなrequest-owned failure
  lifecycleを`src/server/host/devframe-app.ts`へ実装する。Generation-0 Sourceはexact escaped non-authorizing
  boundaryとnull request IDを持ち、successful
  admissionはSource/progress/status/generationをcorrelateする。Pre-acceptance
  throw/rejectionはrequestの実際のerrorで失敗しjob/retentionを作らず、accepted-job
  rejectionは失敗したrequestのerrorをnon-null request
  IDでretainし、捏造されたDiagnostic/result/generationを作らない。Accept済みの明示rescan
  jobがfatalに終了した場合は必ずそのSourceのstale overlayを作成または置換しなければならず（MUST）、throw/rejectionでは失敗したrequestのerror
  message（`StaleFailureRef { kind: 'error', message }`）だけを、rootを読めなかった場合はsource-scoped
  `root-unreadable` Diagnostic（`{ kind: 'diagnostic', diagnosticId }`）を参照する。Pre-acceptance
  failure、initial scan、initial/retry Global batchはstale overlayを作成してはならない（MUST NOT）。Conflict、stale
  ID/snapshot、session DTOだけのSource-relative pathを保持する
- [X] T070 [US1] generation-aware な source/tool/kind/Source-relative-path filter、Source ごとの stale
  marker、retry state、成功した replacement の後だけ行う cleanup を `src/app/composables/filters.ts` と
  `src/app/session/view-state.ts` に実装する
- [X] T071 [US1] Escape済みでinertな`SourceBoundary.displayRoot`/`origin` root labelをSource-relative
  item pathから視覚的・意味的に区別しnavigation/read locatorとして使わないaccessibleなRepository header、current/stale
  snapshot status、active `scanRequestId`のstateだけを表示しolder status/inventoryでnewer
  commandを満たせないrequest-correlated progress/rescan control、Source-relative-path filter、Codex SKILL
  list、item
  summaryを`src/app/pages/index.vue`、`src/app/components/inventory/ScanProgress.vue`、`src/app/components/inventory/InventoryFilters.vue`、`src/app/components/inventory/InventoryList.vue`、そのkindのrow
  component（`src/app/components/inventory/rows/`）に実装する。自動更新statusにはunderlying
  scanを停止しないkeyboard操作可能なpause/resumeとon-demand refreshを提供する（2026-07-25 amended:
  このpageのstatusは自動更新しないため、pause/resume controlは存在しない。Productはtimer、filesystem watcher、inspection
  dataのserver-initiated pushを定義せず（contracts/http-api.md §
  get-session）、T042は経過時間によるrequest発行を禁止するため、statusは本taskが併せて要求するkeyboard操作可能なon-demand
  refreshによってのみ進む。WCAG
  2.2.2は自動更新contentに適用されるが、pauseすべきものが存在せず、動かないcontentのためにcontrolを作ることはAGENTS.mdが禁じるspeculative
  mechanismにあたる。いずれの場合もunderlying scanには影響しない — browserがscanを止めることはない。）
- [X] T072 [US1] actionable diagnostics と Codex scope の empty state を
  `src/app/components/diagnostics/DiagnosticList.vue` に実装する
- [X] T073 [US1] 英語の Codex inventory、progress、empty-state、retry、boundary message をそれらを描画する Vue
  component に追加する

---

## フェーズ 5: Codex SKILL 詳細

**目的**: Codex の `SKILL.md` ファイルを、完全で非活性な記述済み source とclosedなallowlist済みtyped metadata として安全に調査できるようにします。sibling の `agents/openai.yaml` は skill の census companion として公開されたままです *(2026-08-01 修正: フェーズ 6 の決定により、この file の admission は出荷しないことが確定しました)*。

**独立テスト**: malformed、literal credential を含む、changing、metadata-bearing な Codex `SKILL.md` ファイルを開き、正確で完全な source と metadata literal、credential masking または reveal control がないこと、environment reference を解決しないこと、activation なし、relationship expansion なし、close または rescan 時の cleanup を検証します。

**目に見えるチェックポイント**: Codex SKILL を選択すると、完全で非活性な detail 画面が開きます。

### fixture とテストを先行

- [X] T074 [US2] Codex
  SKILLのfrontmatter、reference、script、command、埋め込みmarkup、credentialのための生成されたmalformed/maintained-secret
  fixtureを`tests/fixtures/content/build-fixtures.ts`と`tests/fixtures/secrets/build-fixtures.ts`で拡張する
- [X] T075 [P] [US2] byte-decodeのfailing testを追加する: admit済みcandidateのNUL byteは`file-content-binary`
  Diagnosticを持つdiagnostic-only `binary`となり、source も解決済みの値も comparison
  も持たず、他の点では公開可能なgenerationをpartialにする。非NULの各fileはUTF-8 replacement
  semanticsで正確に1回decodeされて読み取り可能な`utf-8`/`utf-8-replaced`になり、先頭BOM
  1つは記録のうえ除去され、挿入された`U+FFFD`は完全な`sourceText`と通常のparsing/extraction/displayに残り — extractorとdetail
  routeを通す端から端までの証明は`tests/integration/repository-scan.test.ts`にあり、comparisonはUS3とともに到着する —
  それ自体ではscanをpartialにせず、代替charset・retry・sampling・truncationは発生しない。inert Markdown/frontmatter、safe
  YAML、parseが返す解決済みscalar、document自体をparseできない場合のthrow、scan path上のin-process
  parsing、単一fileに閉じないfailureに対するdomain変換なしのwhole-attempt中止を`tests/unit/inspection/parsers.test.ts`でカバーする
  *(2026-07-29 修正: Field は source 座標を持たず（`data-model.md` § Field reading）、entry は parser が解決した値を 1
  つ持つため、parser suite が証明するのは parse そのものであって、取得元の text と照合する slice ではない。読み取り可能 source の表示と comparison
  適格性を保つ recognition-atomic な `recognition-parse-failed` Diagnostic は、scan が実際にそれを構築する
  `tests/integration/boundaries/traversal.test.ts` が証明する。)*
- [X] T076 [P] [US2] environment所有のmemory/time capacity (Inspector数値上限なし) のin-process
  parser-invocation failing testを追加する: 1つのfileに閉じたparse/extraction failure（通常どおりcatchされるparser
  exceptionを含む）は他のfileを継続させたまま`partial` commitのもとでそのfileの`recognition-parse-failed`
  Diagnosticになり、fileに閉じないfailureは回復result/generationなしでattemptを中止し、trigger所有の外側boundaryで失敗したrequestのerrorとして通常どおり報告されるかstartup
  top-level propagationになることを証明する。authority
  revocationとlate-result破棄も`tests/unit/inspection/seed-parsers.test.ts`でカバーする
- [X] T077 [P] [US2] literal credential、duplicate
  field、quote/escape/punctuation、environment-reference text、astral と combining sequence が extraction
  と JSON transport を経ても壊れないこと、process environment lookup なし、masking/reveal artifact
  ゼロに関する正確な表示の失敗テストを `tests/unit/inspection/declared-values.test.ts` に追加する *(2026-07-29 修正: entry は
  parser が解決した値を持ち座標を持たないため、case が assert するのはその値と、文字が壊れずに残ることである。field が座標を持たない理由は T090、duplicate
  key の解決は `tests/unit/inspection/parsers.test.ts`、公開される entry の形は `codex-metadata.test.ts`
  を参照。suite 名は、既に存在しない occurrence index ではなく、宣言済みの値という対象そのものに合わせる。)*
- [X] T078 [P] [US2] inert frontmatter、宣言 key ごとに解決済みの値 1 つ、provenance、conditional discovery、skill
  resource、environment reference の非解決、evidence に関する Codex metadata の失敗テストを
  `tests/unit/inspection/codex-metadata.test.ts` に追加する *(2026-07-29 修正: case が assert するのは
  frontmatter parser が解決した値である。authored な `name: 007` は文字列 `7` であり、quote された値は quote
  の内側の文字列である。それが、その file を読み込む製品の得る値だからである。range も duplicate occurrence の順序も、typed な第 2
  の表記も存在しない。field が座標を持たない理由は T090 を参照。)* *(2026-08-02 修正: suite が扱うのは宣言名の読み取りである。)* *(2026-08-05
  修正: recognizerはauthoredな全frontmatter
  keyとbodyを`details.frontmatter`/`bodyText`として公開する（T090の最後の修正参照）。宣言名は独自の読み手を持つ唯一の値であり、一覧のgrouping
  keyである。)*
- [X] T079 [P] [US2] inferred effective aggregate
  を作らず、authored、available、selected、omitted、shadowed、disabled、conditional、unknown を投影する applicability
  の失敗テストを `tests/unit/inspection/applicability.test.ts` に追加する *(2026-08-02 修正:
  発見したfileを製品が使うかどうかはどのresponseも述べないため、testすべきprojectionもsuiteも存在しない。FR-009とQR-005は同じ変更で修正した。)*
- [X] T080 [P] [US2] runtime-chain condition、same-name handling、unknown selection fact に関する Codex
  skill-composition の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する *(2026-08-02 修正:
  この suite は存在しない。テストすべき projection が無く、出荷する strategy が満たすべきことは registry の contract gate が扱うためである。)*
- [X] T081 [P] [US2] Complete inert authored source、ordered な宣言済み `value`、strict/stale
  ID、source-value-free Diagnostic、minimum metadataのfile-detail failing contractを追加する。Request-owned
  operationのthrow/rejectionはそのrequestを実際のerrorで失敗させ、job/result/generation/success
  bytesを0件とする。Post-commit delivery rejectionはcommitを変更せずsuccess payload
  0件、partial化なしであることを`tests/contract/http-api-files.test.ts`で証明する *(2026-07-28 修正: detail 結果は
  `relationships` 配列を持たない。Relationship は allowlist 行が名前を挙げた authored declaration からのみ emit され、Codex
  `skill` 行は `codex.skill.name` と `codex.skill.description` の 2 つだけを挙げていてどちらも target を持たないため、shipped
  recognition は 1 つも生成できず、この release が返しうる全 response で配列は空になる。skill の resource は census が列挙して admit
  しない、所有する inventory 定義の `companionFiles`（`skills[].definitions[].companionFiles`）として公開される。)*
  *(2026-08-02 修正: detail result は `declaredMetadata` array を持たない — T090 参照。)* *(2026-08-05 修正:
  recognizerはauthoredな全frontmatter
  keyとbodyを`details.frontmatter`/`bodyText`として公開する（T090の最後の修正参照）。宣言名は独自の読み手を持つ唯一の値であり、一覧のgrouping
  keyである。)*
- [X] T082 [P] [US2] session API が reveal・masking・redaction・environment resolution の function
  を一切登録しないこと、および未登録 operation の呼び出しが client/server state を保持せず失敗することを証明する不在の失敗契約を
  `tests/contract/http-api-routes.test.ts` に追加する
- [X] T083 [P] [US2] same-origin Monaco、完全な authored source の read-only model、正確な read-only
  option、非活性な rendering、accessibility、request-token adoption、disposal に関する direct-detail の失敗テストを
  `tests/package/monaco-assets.test.ts` と `tests/unit/app/source-viewer.test.ts` に追加する *(2026-07-28
  修正: unit の assertion は mount した component ではなく `src/app/composables/monaco.ts` に対して実行する。理由は T058
  と同じで、unit project は single-file-component compiler を持たず、追加すると T001 が gate する承認済み dependency
  baseline が変わるため。描画されたページを要する主張は `tests/e2e/codex-skills-detail.spec.ts` で実アプリに対して検証する。)*
- [X] T084 [P] [US2] Browser が authored content をどう保持するかの failing FR-027 test を
  `tests/unit/app/authored-content.test.ts` に追加する。Mount した component ではなく view state に対して assert
  する（unit project は single-file component を compile しない。理由は T083 が記録する）: content
  は書かれたとおり正確に公開され、masking や reveal の claim/control も detail request 前の確認 step も持たず、file を 1
  つずつ開くことでのみ到達でき、memory 内にのみ保持される — purge、route 変更、generation を置換する commit
  で破棄される。`tests/e2e/codex-skills-detail.spec.ts` は実 page に対して、gate も notice も現れないこと、literal な
  credential が authored のまま render されることを assert する。*(2026-07-28修正: FR-027は直接表示を要求するようになり —
  loopback限定sessionでviewer自身のfileを見せる前に立つcontrolは何も守らなかった — suiteはauthored-contentの取扱いtestになった。)*
- [X] T085 [US2] 記述済み content から参照される process environment の read または substitution
  がゼロであることを含め、parsing、metadata extraction、relationship、detail loading 全体へ zero-activation test を
  `tests/integration/security/zero-activation.test.ts` で拡張する *(2026-07-28 修正: case
  は読み取り集合そのものを検証する。skill 自身の directory ちょうど、各 1 回、その外は 0 件である。directory 形式の customization
  を全体として読むのは保守者の指示によるもので、同じ変更で仕様も修正した。FR-003、contracts/inspection-path-allowlist.md § Bounded
  companion census、data-model.md § ToolRecognition、contracts/http-api.md § get-session
  がいずれもそれを述べる。census は admit しない。companion は rule も recognition も kind も自身の inventory row も獲得しない。)*
- [X] T086 [US2] 直接提示（読み手と content の間に何も立たず、その隣に注意書きも立たないこと）、正確な literal credential と
  environment-reference text、完全な Codex source、metadata、diagnostics、masking/reveal control
  の不在、keyboard use、route cleanup、client-data purge、rescan cleanup に関するブラウザー受け入れ失敗テストを
  `tests/e2e/codex-skills-detail.spec.ts` に追加する *(2026-07-29 修正: FR-027 は content
  の前に何も認めないため、提示は直接とする。T084 参照。)*

### 実装

- [X] T087 [P] [US2] allowlist 対象の frontmatter field ごとに 1 つの解決済みの値を読み、recognition-atomic failure
  を備えた inert Markdown/frontmatter extraction を `src/server/inspection/parsers/markdown.ts` に実装する
  *(2026-07-28 修正: この module は format について何も決めない。frontmatter block が存在するかとどこまで伸びるかは `vfile-matter`
  が決め、block は fence を含めて丸ごと YAML parser へ渡す。`---` は YAML 自身の directives-end marker だからである。block を
  body へ狭める処理は、opening fence の後にどの line terminator が続くか、closing fence が terminator
  を伴うかをここで測ることを意味していた。これは 2 つの package が既に実装している grammar の手写しであり、しかも何も check できなかった。body はその offset
  で slice されてから parse されるため、1 単位遅れて読んだ body は `name:` を key `ame` として parse し、そこから取る literal はいずれも
  parse 対象の正確な slice になる。span も range も持たない。T090 を参照。)* *(2026-07-28 修正: この module は frontmatter
  block を読む YAML semantics を選び、`vfile-matter` が parse した結果を返すだけとする。fence と行終端の形を測って block の body
  を特定し、その body を再 parse することはしない。これは package が既に実装している grammar の手写しであり、しかも誰も check できない。body はその
  offset で slice されてから parse されるからである。`logLevel: 'silent'` も設定しない。warning だけでなく parse error
  も破棄するため、まったく読めない document が recognition を fail させず best-effort な値として返ってきてしまう。)*
- [X] T088 [P] [US2] root field ごとに 1 つの値を解決し、document を parse できないときは recognition 全体を failure にする
  atomic な YAML 1.2 core-schema 読み取りを実装する *(2026-07-29 修正: `src/server/inspection/parsers/yaml.ts`
  は存在せず、alias の拒否も存在しない。declared value を parser が解決した値とした時点で、`vfile-matter` — YAML 1.2、core schema —
  が既にそれを生成しており、同じ block の 2 回目の parse に付け加えるものは残っていない。alias は値の書き方の一部であり、parser は他の syntax
  と同じく解決する。alias を拒否するはずだった module は、どの entry も持たない正確な authored slice のために node range
  を読むために存在した。綴りが必要な reader は、detail surface が提供する完全な `sourceText` を読む。)*
- [X] T089 [US2] Environment-owned memory/time capacity（Inspector数値上限なし）でscan path上のin-process
  parser invocationを実装する。1つのfileに閉じたparser
  failureは通常のexceptionとしてcatchし、そのfileの`recognition-parse-failed`
  Diagnosticの背後でそのrecognitionのextraction全体を破棄して`partial` commitとする。fileに閉じないfailureはscan
  domainでcatch、cause分類、retry、Diagnostic、recovered/partial result化せず変更なしに伝播させ、authority
  revocation/late discardを実装し、ordinaryなrequest-owned failure報告またはstartup top-level propagationはouter
  ownerに限定する。対象は`src/server/inspection/parsers/`とする *(2026-07-28 修正: runner は internal occurrence
  list を持たない。extractor は publish 対象の entry を返し、recognizer は declared name をそこから読む。1 回の parse
  が両方を賄う。)*
- [X] T090 [US2] Authored な frontmatter key ごとに、その parser が解決した値を持つ entry を 1 件公開する。source
  座標も、occurrence ごとの entry も、その値の 2 つ目の typed な表記も持たず、credential detection も environment resolution
  も行わない *(2026-07-28 修正: entry が運ぶのはその file を読み込む製品の得る値であるため、field は validate する span も schema
  全体に対する typed union も必要としない。Slice するのと同じ text で測った測定は、誤った測定も正しい測定と同じく round-trip する — frontmatter
  body を 1 単位遅れて読むと `name:` は key `ame` として parse される — そして reader を持つ decode 済み値は row が grouping
  に使う declared name だけであり、name は string である。`markdown.ts` が何をするかは T087 を参照。)* *(2026-08-02 修正:
  recognition が公開する名前の値は 1 つだけであり — 2026-08-23 以降は admit した rule が解決した invocation
  name（`details.invocationName`）— 、`declaredMetadata` entry も field-ID catalog も存在しない。Detail surface
  は frontmatter を含む完全な `sourceText` を提供するため、同じ画面に既にある値の caption 付き複製は 1 つの事実の 2 つ目の綴りになる。)*
  *(2026-08-02 修正: skill はさらに自身の表示として公開する — authored順の`frontmatter` keyと、frontmatter
  blockを取り除いた`bodyText` — detail surfaceがそれを運ぶfileではなくskillから始まるためである（data-model.md §
  Skillの表示）。keyはfile自身のものであり維持管理上のcatalogのものではない。これが、field-ID listではなく読み手のfrontmatterである理由である。)*
- [X] T091 [US2] 閉じたcondition registry、evidence-linked
  `SourceConditionFact`/`ApplicabilityAssessment` record、決定論的なprecedence
  projectionを`src/server/inspection/applicability/conditions.ts`、`src/server/inspection/applicability/context.ts`、`src/server/inspection/applicability/precedence.ts`に実装する
  *(2026-08-02 修正: detail
  surfaceは、なぜそのfileが調査されたか、その利用が何に依存するか、vendorがどこまで文書化しているかを示すdisclosureを持たず、projectionも、各registry
  recordのcondition
  key一覧も、provenanceごとの`evidenceAssessments`/`applicability`も、それらのtextも持たない。Condition keyはregistry
  recordもresponseも運ばない。projectするものが無いからである。Vendorが自身のruntime
  conditionについて文書化していることは、そのvendorの維持管理contractに残る。それは製品のsurfaceではない。)*
- [X] T092 [US2] 新しい strategy ID を追加せず、inventory が所有する Codex skill strategy を detail-time
  selection、same-name、runtime-chain、condition projection で拡張する処理を
  `src/shared/registries/runtime-composition.ts` に実装する *(2026-07-28 修正: record
  は変更しない。`codex.skills.discovery` は detail 時の projection が必要とするものを既に公開している。`skill-resolution.ts` が
  same-name statement のために読む `operations` である。detail 専用 field の追加は record が既に述べていることの二重化になる。)*
  *(2026-08-04 修正:
  applicabilityをprojectするsurfaceが無いため（T091）、detail時にrecordから読むのは`operations`だけである。同名statementのためであり、toolがその衝突に直面している場合に限る。)*
- [X] T093 [US2] 参照される script、asset、任意 path を昇格させない relationship-only の skill-resource policy を
  `src/server/inspection/rules/codex.ts` に実装する *(2026-07-28 修正: policy とは、ship する registry
  が何を含まないかである。skill の resource を admit する rule は無く、compiler は matcher を持たない record を名指しで拒否するため、参照された
  script や asset は candidate になりえない。`codex.relationship.component` record と、それを skip する
  discovery-class filter は同じ policy を二度述べるだけで挙動を変えない。両者は Relationship を emit する phase と共に到来する。この
  release で Relationship が 1 件も emit されない理由は T081 を参照。)*
- [X] T094 [US2] 宣言 key ごとに解決済み `value` を 1 つ、provenance-scoped な authored/default
  relationship、environment reference の非解決、正確な evidence で Codex recognition を
  `src/server/inspection/recognizers/candidate.ts` において拡張する *(2026-07-28 修正: provenance DTO に追加するのは
  `discoveryClass` のみ。`sourceRefs` は、citation が packaged CLI の持たない maintenance data であり maintained
  build では値が入り shipped product では空になるため存在しない。`provenanceId`、`order`、derived-seed field は、shipped
  rule に `bounded-derived-candidate` がなく、shipped strategy が order を documented しておらず、admission を参照する
  relationship も存在しないため存在しない。)* *(2026-08-04 修正: どの surface も provenance と applicability を project
  しない（T091）。)* *(2026-08-02 修正: vendor recognizer module は共有 engine へ統合された。vendor が寄与するのは tool literal
  である。)* *(2026-08-05 修正: recognizerはauthoredな全frontmatter
  keyとbodyを`details.frontmatter`/`bodyText`として公開する（T090の最後の修正参照）。宣言名は独自の読み手を持つ唯一の値であり、一覧のgrouping
  keyである。)*
- [X] T095 [US2] byte分類と正確に1回のUTF-8 replacement decodingを`src/server/inspection/scan.ts`に統合する:
  admit済みcandidateのNULを含む入力はdiagnostic-only
  `binary`とpartialになり、非NULの各入力は読み取り可能な`utf-8`/`utf-8-replaced`になり、先頭BOM
  1つを記録/除去し、挿入された`U+FFFD`を完全なauthored sourceに保持したままresolved-value extraction、atomicなper-recognition
  parsing、display/comparison、one-edge derivationへそれ自体ではpartial
  statusにせずに進む。代替decoding・sampling・truncationを行わず、parser/extractor
  failureは影響を受けたrecognitionの`recognition-parse-failed`
  Diagnosticに変換し、単一fileに閉じないfailureは通常どおり伝播しcommitなしでattemptを中止する *(2026-07-29修正:
  extractionはparserが解決した値を公開する — data-model.md § Field reading。)*
- [X] T096 [US2] generation-owned な完全な authored source と parser-resolved metadata、request-token
  adoption 不変条件、file・generation・route・client-data purge・Source removal 時の cleanup を
  `src/server/session/session.ts` と `src/app/session/view-state.ts` に実装する *(2026-07-29修正:
  extractionはparserが解決した値を公開する — data-model.md § Field reading。)*
- [X] T097 [US2] Strict opaque ID、complete authored-source DTO、ordered parser-resolved
  metadata、production encoding、Diagnostic、stale responseを持つsession
  API契約（contracts/http-api.md）のfile-detail functionを実装する。Encoding/serialization
  throw/rejectionはそのrequestを実際のerror（devframeがそのままserialize）で失敗させ、job/retention/result/generation/success
  byteを作らない。Post-commit delivery rejectionはcommit不変、success payload
  0件、partial化なしとする処理を`src/server/host/devframe-app.ts`へ実装する *(2026-07-29修正:
  extractionはparserが解決した値を公開する — data-model.md § Field reading。)*
- [X] T098 [US2] reveal、masking、redaction、environment-resolution の operation を登録済み session RPC
  function から不在のままにし、そのような呼び出しが strict な unknown-operation rejection で失敗するよう
  `src/server/host/devframe-app.ts` を維持する
- [X] T099 [P] [US2] lazy same-origin Monaco、不透明な read-only model、正確な accessibility option、完全な
  editor/model/subscription disposal を `src/app/composables/monaco.ts` と
  `src/app/components/inspection/SourceViewer.vue` に実装する *(2026-07-28 修正: entry point が使う 2
  つではなく、Monaco の basic language をすべて登録する。読み手が出会う言語は customization 自身の directory の中身で決まるため、手で選んだ list
  はどの repository に対しても正しくならない。各 contribution は lazy loader を登録するだけで、grammar chunk はその言語の file
  を開いたときにだけ取得され、worker も起動しない。language *service* は除外したままとする。いずれも worker を伴い、与えられたものを validate
  するが、調査対象の customization を invalid と示すのはこの product が下さない verdict だからである。JSON には basic-language
  grammar が無いため、最も近い純粋な tokenizer を借りる。言語は手書きの拡張子表ではなく Monaco 自身の registry から解決する。research.md/.ja.md
  § 7 と plan.md/.ja.md も同じ変更で修正した。)* *(2026-08-23 修正: `.toml` は最も近い tokenizer ではなく TOML の grammar
  で色付けする。pin した `monaco-editor` が TOML grammar を持たないため、`toml` id は
  `@ota-meshi/site-kit-monarch-syntaxes` から登録する。その Monarch grammar と language configuration は basic
  language と同じ lazy factory で読み込まれ、service を伴わない。この package は自身の license file を同梱しないため、upstream の
  text を notice document 用に `licenses/` へ加えた。research.md/.ja.md § 7 と plan.md/.ja.md も同じ変更で修正した。)*
- [X] T100 [US2] FR-027はsensitive-content noticeもacknowledgement gateも認めない: skill-detail
  routeはsourceを表示し、それについての statement
  を表示しないため、このtaskはcomponentもstateも実装せず（T084参照）、`src/app/App.vue`も変更しない — shellはfile
  contentsを表示せず、そこに置くgateはinventoryの前にも立つことになる。*(2026-07-28修正:
  FR-027が直接表示を要求するようになったため、このtaskの実装scopeは空になった。)*
- [X] T101 [P] [US2] typed recognition、relationship、diagnostic の表示を
  `src/app/pages/skills/detail/[source]/[...path].vue` と
  `src/app/components/inspection/RelationshipList.vue` に実装する *(2026-07-28 修正: `RelationshipList.vue`
  は存在しない。shipped recognition が Relationship を生成できないため（T081 参照）。allowlist 行が reference を持つ field
  を備える最初の phase — Claude の `claude.skill.paths`、または Copilot の `copilot.skill.context` — と共に追加する。)*
  *(2026-07-28 修正: detail surface はその隣に `DirectoryFileTree.vue` を ship する。directory 形式の
  customization の directory を表示するものである。snapshot が既に公開している path（definition 自身の path と
  `companionFiles`）から構成し、committed でない path は落とすため、専用の wire shape を必要とせず、scan が読んでいない file
  を提示することもできない。)* *(2026-07-28修正: 描画される値でcontract識別子であるものは1つもない。rule
  ID、behaviorまたはstrategyのID、matcher lookup base、closedなstatus値は、いずれもregistry recordまたはwire
  vocabularyを解決するものであり、自分のファイルを読んでいる人が尋ねた何にも答えない。したがっていずれもunionの隣の表を通して描画する:
  `src/shared/entities.ts`の`CUSTOMIZATION_KIND_TEXT`、`SUPPORTED_TOOL_TEXT`、`FILE_ENCODING_TEXT`、`SOURCE_BOUNDARY_ORIGIN_TEXT`、`SOURCE_STATUS_TEXT`、`SAME_NAME_SKILL_RESOLUTION_TEXT`、`src/shared/api-text.ts`の`SCAN_PROGRESS_PHASE_TEXT`、diagnostic
  textは`DIAGNOSTIC_REGISTRY`である。`api-types.ts`はruntime codeを出荷しないため、`api-text.ts`を`*-text.ts`
  companionとして置く。DTOが運ぶIDは`string`ではなくそのclosed unionとして型付けし、それが表の完全性を保つ（FR-007）。)* *(2026-08-02 修正:
  維持管理上の field caption は描画しない。detail は file が書いた key で frontmatter を列挙しており、同じ画面にある値の傍らに catalog
  field を名指す caption を置けば 1 つの事実の 2 つ目の綴りになるためである（T090 参照）。summary は認識した製品と extraction の Diagnostic
  を示し、宣言名は detail の見出しであり続ける。)* *(2026-08-04 修正: どの surface も applicability を表示しない（T091）。)* *(2026-08-05
  修正: provenanceは描画しない — admissionは読み取り認可のrecordであり、surfaceが読み上げるものではない（T1068）。)* *(2026-08-08 修正:
  detail は parse を1回だけ publish し、page は定義行を inventory から導出するため、recognition summary を別に描画する component
  は無い（T1083）。)* *(2026-08-25修正: routeが名指すのはskill — `SKILL.md`自身のpath — であり、読んでいるfileはその傍らの`file`
  queryである。pageが記述する主題がaddressの述べるものと一致し、companionは自身のpageを持たないためどのskillに属するかを解決し直す必要もない。treeが作るlinkはrouter
  locationであり、queryのencodeとjoinはrouterのものである。)*
- [X] T102 [US2] generation・epoch・request token を認識する skill-detail route を
  `/skills/detail/<source>/<Source相対パス>` として `src/app/pages/skills/detail/[source]/[...path].vue`
  に実装する。Skill が主題である: 見出しとしての skill 自身の directory、各認識製品が呼び出す名前、file が書いた key — すべて entry point のもの —
  であり、directory の file 群は skill 自身の tab の隣の Files tab に並ぶ。そこで 1 つの file の source が表示され、companion
  の選択は source だけを変える。Parameter が file を名指すのは、skill が自身の名指せる identity を持たないためである。所有する skill は
  committed inventory に対して解決されるため、skill のどの file への link もその file を表示した状態で skill を開く。Route は page
  として scroll し — focus は入場時と skill 変更時だけ見出しへ移り、relationship section は描画せず（T081）、file の隣に notice
  も確認も置かずに file を表示する（FR-027）。Shell は RPC 呼び出しの parameter を転送し、明示的な origin base で接続する。devframe の既定
  `'./'` は document path に対して解決され、`/skills/detail/<source>/<Source相対パス>` を直接開いた page
  は接続できないためである。Directory layout が依拠する read boundary は T085 を参照。*(2026-07-28修正:
  FR-027が直接表示へ移行するのに伴い、このskill主題layoutへ再構成された。)* *(2026-07-31修正: detail request の失敗がこの route
  自身の可視段落と polite live region に届き、shell の assertive alert には出ないことを assert する自動 test はない。どの state
  に入るかは `tests/unit/app/session-view-state.test.ts` が assert するが、その 2 つの要素が描画することは assert していない —
  unit project は single-file component を compile せず、browser からこの失敗を起こすには devframe 自身の WebSocket
  frame に介入する必要があるため。残存リスクは、どちらの binding を外してもどの suite も落ちないこと。assertion は、対象となる layout が定まってから書く。この
  route の layout は大きく変わる見込みである。)* *(2026-08-02 修正: この route は viewport に収めない。skill 自身の section —
  名前、description、宣言、指示 — が directory の前に来た時点で、収める方式では tree に数 px しか残らないか fold の下へ押し出された。代わりに page
  として scroll し、各領域は操作可能な高さを取る。`tests/e2e/codex-skills-detail.spec.ts` が tree の viewport 内可視を assert
  する。text だけの assert は画面外でも通っていたためである。)* *(2026-08-02 修正: この route は 2 つの主題を積み重ねずタブで示す — skill 自身とその
  file — とし、skill タブは宣言された全 key を `name`・`description` を先頭にして列挙する。key mapping は
  `src/app/components/tab-navigation.ts` にあり、両方の strip が 1 つの WAI-ARIA mapping を共有する。)* *(2026-08-02
  修正: live region は共有 ARIA container 1 つが持ち、mount のたびに自分より前の wrapper を落とす。parent を渡すと Monaco は
  create ごとに新しい wrapper を作るため、放置すれば mount ごとに積み上がる。Comparison row は file が書いた key で対応付ける。key にできる
  field catalog がもう無いからである。authored content の境界は、surface がいくつ保持するかではなく、1 file への明示的な request
  で届くという到達の仕方が定める。したがって skill 詳細は開いている file の傍らに instructions を示す。ARIA container は全 editor で 1
  つを共有する。Monaco が module 単位で 1 つしか持たないため、viewer ごとの container では開いたままの viewer が detached node
  へ話しかけることになる。mapping は description list、sequence は ordered list として描き、directory 配下の file はその
  directory 自身の item の中の list に置くことで、包含関係を indent ではなく markup で表す。component の class は component
  自身の名前を block とする BEM とし、global sheet と component が同じ class を宣言しないようにする。skill 自身の entry point である
  file は、それを census に含む skill より先に解決するため、別の skill の directory に入れ子になった skill もそれ自身として開く。縮まない key
  列は、それが label する値の場所を残さないので上限を設けて key を折り返し、tree の indent も同じ理由で上限を設ける。宣言は file が key を書いた順で公開する —
  plain object は integer 的な key を先に並べるため、parser は `Map` で答える。Scalar でない key は、発明した綴りで見出しを付けず
  recognition を失敗させる。Frontmatter のすべての block は CSS subgrid によって root が宣言した 2 つの列に描かれ、4 階層下の値も
  top-level の値と同じ位置から始まる。key は自身の下の行に block を開き、list item の marker はその block 自身の最初の行に描く。file tree は
  path prefix を file ごとに繰り返すのではなく、実際の directory 行と行全体の target を描く。)* *(2026-08-04 修正:
  そのproductがskillを使うかどうかの説明はrouteに無く、それを収めるdisclosureも無い。projectするsurfaceが存在しないためである（T091）。Routeはfileが書いたkeyでのskillの宣言から始まる。)*
  *(2026-08-08 修正: T1082 に合わせて綴りを更新 — file の identity は Source-relative Path、detail route は
  `src/app/pages/skills/detail/[source]/[...path].vue` の `/skills/detail/<source>/<Source相対パス>`
  であり、commit は ID を rekey せず record をそのまま publish する。)* *(amended 2026-08-21:
  detailはfrontmatterをread-only viewerの1つのYAML
  document（frontmatter-yaml.ts）として提示する。blockそのものの言語であり、読み手は自分のfileと翻訳なしに見比べられる。)* *(2026-08-25修正:
  routeが名指すのはskill — `SKILL.md`自身のpath — であり、読んでいるfileはその傍らの`file`
  queryである。pageが記述する主題がaddressの述べるものと一致し、companionは自身のpageを持たないためどのskillに属するかを解決し直す必要もない。treeが作るlinkはrouter
  locationであり、queryのencodeとjoinはrouterのものである。)*
- [X] T103 [US2] 英語の Codex detail、literal display、parser、environment reference、uncertainty message
  をそれらを描画する Vue component に追加する *(2026-07-28 修正: complete-content notice はそこに含まれない。FR-027 は authored
  content に何が含まれうるかを常時述べる文を禁じており、source viewer は file を説明せずに表示する。T084 参照。)*

---

## フェーズ 6: Codex SKILL metadata 一覧

**目的**: skill の sibling `agents/openai.yaml` が読者へどう届くかを確定します。このfileは独自のcandidateとしてadmissionしません: 所有元skillのbounded companion censusが、skillのdirectoryが持つfileの一つとして既に読み取り・公開しており、skillのdetail画面が既にそれを列挙して開けます。したがってこのフェーズはderived rule、`skill metadata` recognition、新しいsurfaceのいずれも出荷しません: このfileのための独立したadmission・kind tab・inventory rowは、inventoryが既に持つfileの重複になります。*(2026-08-01 修正: bounded-derived candidateは出荷しない。)*

**独立テスト**: sibling の `agents/openai.yaml` を持つ skill を scan し、そのfileがskillのcensus companionとして公開されること、skillのdetail treeから完全なsourceが開けることを検証します — フェーズ 4 と 5 のsuiteが既に証明している挙動です。

**目に見えるチェックポイント**: skill の metadata file は、その skill の detail 画面で確認します — directory tree がそれを列挙して開きます。

### fixture とテストを先行

- [X] T104 [US1] 追加する fixture なし: sibling の `agents/openai.yaml` は通常の census companion であり、census
  公開は `tests/fixtures/repositories/build-fixtures.ts` で既に fixture 化済み *(2026-08-01 修正: 上記フェーズ決定により
  scope が空になりました)*
- [X] T105 [US1] 具体化する conformance row なし: `codex.derived.skill-metadata` record
  は出荷されないため、`tests/fixtures/conformance/inspection-rules.json` は変更なし *(2026-08-01 修正: 上記フェーズ決定により
  scope が空になりました)*
- [X] T106 [P] [US1] 追加する registry テストなし: gate すべき bounded-derived record
  が存在せず、`tests/contract/inspection-rules.test.ts` は変更なし *(2026-08-01 修正: 上記フェーズ決定により scope
  が空になりました)*
- [X] T107 [US1] 追加する bounded-derivation テストなし: derivation は実行されず、companion 公開は
  `tests/integration/repository-scan.test.ts` で既にカバー済み *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T108 [P] [US1] 追加する recognition/inventory テストなし:
  このfileはrecognitionを得ず、独自のinventoryにも加わらず、`tests/unit/inspection/recognizers.test.ts` と
  `tests/unit/app/inventory.test.ts` は変更なし *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T109 [US1] 新しいブラウザー受け入れテストなし: census file が skill の detail tree から開けることは
  `tests/e2e/codex-skills-detail.spec.ts` が既に証明しています *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*

### 実装

- [X] T110 [US1] 追加する registry record なし: `src/shared/registries/inspection-rules.ts` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T111 [US1] 実装する derivation なし: `src/server/inspection/rules/codex.ts` は変更なし *(2026-08-01 修正:
  上記フェーズ決定により scope が空になりました)*
- [X] T112 [US1] 実装する recognition なし: `src/server/inspection/recognizers/candidate.ts` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T113 [US1] 追加する scan 統合なし: `src/server/inspection/scan.ts` は変更なし *(2026-08-01 修正: 上記フェーズ決定により
  scope が空になりました)*
- [X] T114 [US1] inventory・component の変更なし: `src/app/components/inventory/InventoryFilters.vue` と
  `src/app/components/inventory/rows/SkillRow.vue` は変更なし *(2026-08-01 修正: 上記フェーズ決定により scope
  が空になりました)*
- [X] T115 [US1] 追加する message なし: `src/app/components/inventory/InventoryList.vue` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*

---

## フェーズ 7: Codex SKILL metadata 詳細

**目的**: `agents/openai.yaml` を詳細でどう読むかを確定します。その完全な literal source は、所有元 skill の census companion として detail route が既に提供しています — skill の detail tree から開き、masking も reveal step もありません — そして typed な allowlist 済み extraction は出荷しません: フェーズ 6 の決定が、このフェーズの typed detail が紐づくはずだった「独立して admission された candidate」を削除しており、source の表示が読者に必要な確認そのものです。Vendor contract の `skill metadata` Presentation Allowlist row は、消費者を持たない frozen・digest 記録済みの design input として残ります。再び消費するのは `/speckit-plan` + `/speckit-tasks` の改訂事項です。*(2026-08-01 修正: フェーズ 6 の決定に続き scope を空にしました。)*

**独立テスト**: directory に `agents/openai.yaml` を持つ skill を開き、その完全な literal source — credential も environment reference も書かれたままの文字で、masking・reveal control・substitution なし — が skill の detail tree から開けることを検証します。これは census companion に対してフェーズ 5 の detail suite が既に証明している挙動です。

**目に見えるチェックポイント**: skill の detail tree で `agents/openai.yaml` を選択すると、その完全な literal source が表示されます。

### テスト先行

- [X] T116 [P] [US2] 追加する metadata extraction テストなし: この kind の metadata extraction
  は出荷されず、`tests/unit/inspection/codex-metadata.test.ts` はフェーズ 5 の SKILL coverage を変更なしで維持する
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になった)*
- [X] T117 [P] [US2] 追加する file-detail contract なし: census companion の detail — 完全な literal
  source、stale ID、client retention 0件 — は `tests/contract/http-api-files.test.ts` で既に contract
  化・テスト済み *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T118 [P] [US2] 追加する zero-activation テストなし: metadata field を parse しないため、activation し得る
  command・asset・resource・script・URI・path
  が抽出されることはなく、`tests/integration/security/zero-activation.test.ts` は変更なし *(2026-08-01 修正:
  上記フェーズ決定により scope が空になりました)*
- [X] T119 [US2] 新しいブラウザー受け入れテストなし: skill の census file について、reveal control のない unmasked literal 表示は
  `tests/e2e/codex-skills-detail.spec.ts` が既に証明しています *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*

### 実装

- [X] T120 [US2] recognition の拡張なし: `src/server/inspection/recognizers/candidate.ts` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T121 [US2] extraction の統合なし: `src/server/inspection/scan.ts` と `src/server/session/session.ts`
  は変更なし *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T122 [US2] detail presentation の拡張なし: `src/app/pages/skills/detail/[source]/[...path].vue`
  は変更なし *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*
- [X] T123 [US2] 追加する message なし: `src/app/components/inspection/RecognitionSummary.vue` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)*

---

## フェーズ 8: Claude SKILL 一覧

**目的**: 完了済みの Codex 一覧と詳細を回帰させず、Claude skills を追加します。

**独立テスト**: `.claude/skills/*/SKILL.md`、near miss、link、duplicate name、Codex skills を含む fixture を起動し、期待される Claude row、変更されない Codex behavior、symlinked candidate が target を通して透過的に読まれることを検証します。

**目に見えるチェックポイント**: Claude と Codex の SKILL 一覧が同じ inventory に共存します。

### fixture とテストを先行

- [X] T124 [US1] root/nested Claude skill、near miss、重複名、Codex保全case、targetを通して読まれるsymlinked
  candidate、`file-unreadable` outcomeになるbroken linkでRepository
  fixtureを`tests/fixtures/repositories/build-fixtures.ts`に拡張する
- [X] T125 [US1] 後のskills-directory factを追加せずに、base
  `claude.behavior.repo.skills`と`claude.behavior.user.skills`、それらのrule/strategy/evidence/relation行を`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/relations.json`にmaterializeする
- [X] T126 [P] [US1] `claude.repo.skill`、1つの直接skill-name child、descendant
  inventory、ancestor/lazy不確実性、cycle-safe traversalで解決済みtargetを通して行うsymlinked
  candidateの透過的inspectionのfailing contract/matcher
  testを`tests/contract/inspection-rules.test.ts`と`tests/unit/inspection/rules.test.ts`に追加する
- [X] T127 [P] [US1] tool、kind、path provenance、rule 外で filename-only recognition を行わないことに関する Claude
  recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T128 [P] [US1] 既存の Codex result を変更せず、safe-filesystem boundary も弱めずに Claude skill
  が追加されることを証明する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [X] T129 [US1] Codex と Claude の SKILL 一覧を含む incremental session のブラウザー受け入れ失敗テストを
  `tests/e2e/claude-skills-list.spec.ts` に追加する
- [X] T130 [US1] reciprocal behavior、rule、evidence、affected-contract reference に関する Claude skill
  registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と
  `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [X] T131 [US1] 読み取り権限を付与しない `claude.behavior.repo.skills`/`claude.behavior.user.skills` statement
  を完全な base lookup strategy とともに `src/shared/registries/vendor-behaviors.ts` と
  `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [X] T132 [US1] 読み取りを認可する `claude.repo.skill` record を `src/shared/registries/inspection-rules.ts`
  に追加する
- [X] T133 [US1] Claude skill追加が読み取りを認可する`claude.repo.skill` record を正確に一つだけ登録し、non-read
  exclusion集合を空のまま保つこと—symlinked candidateはtargetを通して読まれるためsymlink exclusion ruleは存在しない
  (FR-024)—を検証し、registryが文書化された47-ID
  catalogの範囲内に留まることを`src/shared/registries/inspection-rules.ts`で確認する。完全なgateはT913が所有する *(2026-08-01
  修正: skill の bounded companion census が sibling file を既に公開するため、フェーズ 6 は derived rule を出荷せず
  47。このphase-local checkはこのフェーズの追加分を検証するもので、最終的な総数ではありません)*
- [X] T134 [US1] Claude skill evidence record と reciprocal affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T135 [US1] `claude.repo.skill` matching を `src/server/inspection/rules/claude.ts` に実装する
- [X] T136 [US1] path-derived Claude skill recognition を
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T137 [US1] 決定論的な Codex result を維持しながら Claude skill classification を
  `src/server/inspection/scan.ts` に統合する
- [X] T138 [US1] vendor固有のapp分岐を追加せず、genericなtool
  filter、badge、strategy由来の英語の同名一覧messageをClaudeでも再利用する。`src/app/composables/filters.ts`と`src/app/components/inventory/rows/`の既存surfaceを確認し、新しいstrategy
  resultを`tests/unit/inspection/codex-composition.test.ts`でcoverする *(2026-08-02 修正: この suite
  は存在しない。テストすべき projection が無く、出荷する strategy が満たすべきことは registry の contract gate が扱うためである。)*

---

## フェーズ 9: Claude SKILL 詳細

**目的**: generic detail foundation を使用し、完全で非活性な Claude skill detail を追加します。

**独立テスト**: metadata、contained declaration、reference、vendor が対応する symlink、malformed frontmatter、secret を持つ Claude skill を開き、完全な literal detail、解決先 target の content を通して表示される symlinked skill、manifest read authority なし、relationship-target expansion なし、変更されない Codex detail を検証します。

**目に見えるチェックポイント**: Claude SKILL detail が完成し、Codex detail と一貫します。

### テスト先行

- [X] T139 [US2] `claude.behavior.repo.skills-directory-plugin` を、exact-launch で読み取り権限を付与しない
  applicability/activation fact とし、その strategy および evidence conformance row とともに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-02 修正: conformance row は出荷しない — statement が存在しないためである(T145 参照)。3 つの fixture
  はすべて変更なし。)*
- [X] T140 [P] [US2] Authored key順のparser-resolved frontmatter値、duplicate
  keyの解決、通常のfrontmatterとしてのcontained declaration、environment referenceの非解決、malformed時のall-or-nothing
  extraction、およびreadを許可した最小のrule/path provenanceに関するClaude
  skill-presentationの失敗テストを`tests/unit/inspection/claude-metadata.test.ts`に追加する *(2026-08-02 修正:
  suiteはfile由来のskill presentationだけを扱う。skills-directory-plugin factもruntime applicability/evidence
  projectionも存在しない — T091とT145参照。)*
- [X] T141 [P] [US2] `targetOrigin`、正確なauthored target slice、null-authored documented
  default、internal semantic normalization、provenance-relative target、boundary status、originating
  recognitionからのdirectかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete
  deterministic relationship retention、relationship、provenance、recognition、その他derived
  outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain
  layerでcatch/classify/retryしないthrow/rejection、target access前のnested/transitive
  projection拒否、relationship read authority 0に関するfailing
  testを`tests/unit/inspection/relationships.test.ts`に追加する *(2026-08-02 修正: 出荷済みの recognition は
  Relationship を生成できない — edge には relationship-only record による origin coverage が必要で、その各 record
  は後続フェーズ所有の behavior statement と official source に基づくため、今出荷すると reciprocal-evidence
  invariant(data-model.md § Cross-entity invariants)を壊す。suite は観測可能な半分を証明する: 出荷 registry に
  relationship-only class がないこと、reference に見える authored 値の promotion がないこと、recognition 中の target
  access がないこと、および FR-028/FR-029 の失敗規律。edge ごとの field — `targetOrigin`、authored target、documented
  default、normalization、boundary status — は relationship-only record を最初に出荷するフェーズとともに到着する。)*
- [X] T142 [P] [US2] vendorがsupportするsymlinked Claude skillがそのtargetを通して調査されること—Claude
  Codeが読むとおりに解決先fileのcontentが表示されること—と、broken linkがそのfileの`file-unreadable` diagnosticとpartial
  generationになることを証明するfailing regression testを`tests/integration/inspection-safety.test.ts`に追加する
- [X] T143 [P] [US2] manifest loading や未知の runtime selection を主張せず、Claude skill
  selection、exact-launch の skills-directory-plugin applicability、workspace-trust condition、condition
  reason に関する runtime-composition の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
  *(2026-08-02 修正: この suite は存在しない。applicability を評価するものが無いため、conditional projection も condition
  reason も skills-directory-plugin fact も workspace-trust condition も存在しない — T091 と T145 参照。Shipped
  strategy が満たすべきことは registry contract gate が扱う。)*
- [X] T144 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Claude
  detail、uncertainty、relationship、diagnostics、detail-state cleanup、継続する Codex behavior
  に関するブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-detail.spec.ts` に追加する *(2026-08-02 修正: relationship
  の主張は、このフェーズの独立テストが名指す否定的保証 — relationship-target expansion なし — である。出荷済みの recognition は edge
  を出さず(T141)、detail は relationship section を持たない Codex detail と一貫する。)*

### 実装

- [X] T145 [US2] `claude.behavior.repo.skills-directory-plugin` を、accepted exact-launch SKILL
  candidate だけに付与される、読み取り権限を付与しない behavior fact として `src/shared/registries/vendor-behaviors.ts`
  に追加する *(2026-08-02 修正: この製品の surface は skill の inventory・detail・comparison であり、文書化された vendor
  挙動を再掲するだけの statement はそのどれにも寄与しないため、behavior record・identifier・caption・recognizer
  の付与はいずれも出荷しない。census が列挙する `.claude-plugin/plugin.json` は、その skill の通常の companion file
  として他と同様に表示されるままとする。)*
- [X] T146 [US2] strategy ID または manifest read authority を追加せず、inventory が所有する Claude skill strategy
  を detail-time selection/condition mapping、exact-launch skills-directory-plugin
  applicability、workspace-trust fact で `src/shared/registries/runtime-composition.ts` において拡張する
  *(2026-08-02 修正: T092 と同じ理由で record 変更なし — `claude.skills.selection` は detail-time projection
  が読むもの、same-name statement のための `operations` を既に公開している。skills-directory-plugin fact は出荷しない(T145)。)*
  *(2026-08-05 修正:
  どのsurfaceもapplicabilityをprojectしないため、recordが公開するのは`operations`だけで、記述はそのruleが答える衝突に対してだけ引用される（T091）。)*
- [X] T147 [US2] 新しい source ID を作成せず、skills-directory behavior と strategy から既存の Claude
  official-source record への reciprocal backlink を対象registry recordの`evidence` citation に追加する
  *(2026-08-02 修正: backlink は出荷しない — statement を出荷せず(T145)、`claude.repo.skill` は list フェーズから
  `anthropic.claude-code.plugins.components-scopes` を引用済みのため、record 変更はない。)*
- [X] T148 [US2] manifest candidate を作成せず、exact metadata、relationship、evidence で Claude recognition
  を `src/server/inspection/recognizers/candidate.ts` において拡張する *(2026-08-02 修正: recognizer は skill を
  file が書いたとおりに読み出す(data-model.ja.md § Skillの表示)。authored 順の全宣言 key と、frontmatter block を取り除いた
  instructions である。宣言名は、そのうち inventory が grouping に使い detail page の見出しになる値にすぎない。caption 付きの複製も
  field-ID catalog も `declaredMetadata` array も出荷しない。key が何を意味するかは vendor
  の文書であって、この製品が述べることではないためである。両 vendor の recognizer は共有 engine へ統合され、engine がどちらの tool
  でも名前を読む。relationship は出さず(T141)、skills-directory-plugin fact も manifest candidate も存在しない(T145)。)*
- [X] T149 [US2] Atomic Claude extractionとdirect one-hop provenance-scoped
  Relationshipだけを`src/server/inspection/scan.ts`へ統合し、targetのrecurse/expand/readまたはauthority付与を禁止する。Successful
  deterministic relationshipはenvironment
  capacity下でcompleteに保持し、extraction/relationshipのthrow/rejectionはdomainでcatch、cause分類、retry、item/recognition/relationship/derived
  result/body/generation化せず変更なしにtrigger-owning outer boundaryへ伝播する *(2026-08-02 修正: `scan.ts`
  は変更なし。Claude extraction は共有 engine を通じて scan path 上で既に atomic であり、relationship は出さず(T141)、伝播の契約は
  `relationships.test.ts` と既存の boundary suite が証明する。)*
- [X] T150 [US2] vendor-specific source rendering を行わず、Claude 固有 field の typed detail presentation を
  `src/app/pages/skills/detail/[source]/[...path].vue` において拡張する *(2026-08-04 修正: component
  は変更なしで、Claude 固有の拡張も持たない。Skill の宣言は file が書いた key で公開されるため、1 つの detail surface が両 vendor
  を同じように描画し、vendor ごとの field caption は caption する対象を持たない。)*
- [X] T151 [US2] 英語の Claude detail、uncertainty、relationship、parity message をそれらを描画する Vue component
  に追加する *(2026-08-02 修正: message すべき relationship section は存在しない(T141)。)* *(2026-08-05 修正:
  そのmessageはいずれも存在しない — どのsurfaceもfield
  caption、skills-directory-pluginのstatement、conditionの文を描かない（T090/T091/T145）。本taskが出荷したものは共有closed-union
  tableとdiagnostic registryが扱い、detailはfileが書いたkeyで宣言を描画する。)*

---

## フェーズ 10: Copilot SKILL 一覧

**目的**: 対応するすべての Copilot Repository skill path を追加し、一度だけ読み取る multi-tool recognition を確立します。

**独立テスト**: 三つの正確な selector とその negative matrix のすべてについて root context を実行し（nested context は near miss として含める）、`.github` は Copilot-only、`.agents` は Codex+Copilot-only、`.claude` は Claude+Copilot-only であり、nested の `.claude` skill は Claude 単独のままで、admission された各物理 file が一つの item と一度の read になることを検証します。

**目に見えるチェックポイント**: Copilot skill row に正確な三つの recognition combination が表示され、nested context、extra depth、configured root、extra tool recognition は存在しません。

### fixture とテストを先行

- [X] T152 [US1] 三つの Copilot selector すべてについて、root の positive fixture と negative fixture — nested
  context、one-direct-child depth、configured-root exclusion —、正確な
  Copilot-only/Codex+Copilot/Claude+Copilot combination を
  `tests/fixtures/repositories/build-fixtures.ts` に追加する *(2026-08-08 修正: root固定 — どのCopilot
  surfaceもroot文脈から下向きのskill lookupを文書化しておらず、nestedなskills directoryはこのproductが選択しないruntime
  contextに属するnear missである（FR-003）。`copilot.repo.skill`のcontract rowも同じ変更で是正した。)*
- [X] T153 [US1] origin fileを持たない正確な `copilot.behavior.cloud.remote-skills` fact を含む Copilot VS
  Code/CLI/Cloud skill behavior と、Inspector rule、strategy、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T154 [P] [US1] root に anchor された三つの正確な selector、direct-child depth、near miss、nested-context と
  configured-root の rejection、selector を拡大しないことに関する matcher の失敗テストを
  `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
  *(2026-08-08 修正: root固定 — どのCopilot surfaceもroot文脈から下向きのskill lookupを文書化しておらず、nestedなskills
  directoryはこのproductが選択しないruntime contextに属するnear missである（FR-003）。`copilot.repo.skill`のcontract
  rowも同じ変更で是正した。)*
- [X] T155 [P] [US1] Copilot-only の `.github`、Codex+Copilot-only の `.agents`、Claude+Copilot-only の
  `.claude`、extra recognition ゼロに関する recognition-matrix の失敗テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T156 [P] [US1] matrix row ごとに一つの物理 item と一度の read、決定論的な provenance、nested-context
  rejection、extra-depth rejection、configured-root rejection に関する scan の失敗テストを
  `tests/integration/repository-scan.test.ts` に追加する *(2026-08-08 修正: root固定 — どのCopilot
  surfaceもroot文脈から下向きのskill lookupを文書化しておらず、nestedなskills directoryはこのproductが選択しないruntime
  contextに属するnear missである（FR-003）。`copilot.repo.skill`のcontract rowも同じ変更で是正した。)*
- [X] T157 [US1] 正確な root recognition matrix、admission 済みの各 `(file, tool)` recognition が definition
  として一度だけ現れること、nested-context/extra-depth/configured-root/extra-recognition row
  がないことに関するブラウザー受け入れテストを `tests/e2e/copilot-skills-list.spec.ts` に追加する *(2026-08-08 修正:
  inventoryのcontract上のrow単位に合わせて文言を是正 — skill rowは1つのdeclared nameであり2つのfileをまとめ得る（data-model.md §
  Inventory unit）ため、受け入れが厳密に保つのは各fileが一度だけ現れることであって、1 file 1 rowの形ではない。)* *(2026-08-08 修正: root固定 —
  どのCopilot surfaceもroot文脈から下向きのskill lookupを文書化しておらず、nestedなskills directoryはこのproductが選択しないruntime
  contextに属するnear missである（FR-003）。`copilot.repo.skill`のcontract rowも同じ変更で是正した。)* *(2026-08-10改訂:
  definitionの単位は`(file, tool)` recognition 1つであり、rowの名前は各toolが解決した名前である（data-model.md §
  一覧の単位）。受け入れが厳密に保つのは各recognitionがdefinitionとして一度だけ現れることで、2つのtoolがadmitするfileは認識するtoolごとに一度現れる。)*
- [X] T158 [US1] reciprocal behavior、rule、evidence、affected-contract
  reference、`copilot.behavior.cloud.remote-skills` の正確な読み取り権限を付与しない ownership に関する Copilot skill
  registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と
  `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [X] T159 [US1] Copilot の vendor registry directory を作成し、surface-specific Copilot skill
  statement、読み取り権限を付与しない User/Cloud fact、参照されるすべての base lookup/selection/managed-remote strategy
  をともに `src/shared/registries/copilot/behaviors.ts`、`copilot/strategies.ts`、`copilot/relations.ts`
  に追加して、`src/shared/registries/vendor-behaviors.ts` と `runtime-composition.ts` の aggregate
  を通じて公開し、この milestone で production registry を閉じたままにする *(2026-08-05 修正: T062で確定したvendor別registry
  layoutへ向け直した —
  vendorのrecordは自身の`src/shared/registries/copilot/{behaviors,strategies,rules,relations}.ts`に置き、registry間edgeはrecordを保持するedgeとして`relations.ts`に置き、aggregateは公開だけを行い、`tests/fixtures/conformance/relations.json`は同じ変更で再生成する。)*
  *(2026-08-08 修正: surfaceごとの3つのselection strategyの出荷は、そのpipelineが導出same-name文に対して何を意味するかも確定させた —
  `unknown-order`を併せてrecordする`select-first`
  pipelineはduplicate-nameのwinnerなしのselectionを確立するので、Copilotのgrouped-row文は`skill-resolution.ts`で`surface-dependent`として導出され、CLIが文書化するfirst-found
  winnerが製品全体の文として述べられることはない（FR-007）。)*
- [X] T160 [US1] 三つの固定 directory に対して読み取りを認可する `copilot.repo.skill` record を
  `src/shared/registries/copilot/rules.ts` に、その edge を `copilot/relations.ts` に、ID を
  `identifier-types.ts` に追加し、`src/shared/registries/inspection-rules.ts` の aggregate を通じて公開する
  *(2026-08-05 修正: T062で確定したvendor別registry layoutへ向け直した —
  vendorのrecordは自身の`src/shared/registries/copilot/{behaviors,strategies,rules,relations}.ts`に置き、registry間edgeはrecordを保持するedgeとして`relations.ts`に置き、aggregateは公開だけを行い、`tests/fixtures/conformance/relations.json`は同じ変更で再生成する。)*
- [X] T161 [US1] `copilot.behavior.cloud.remote-skills` の existing-source backlink を含む、Copilot skill
  evidence record と reciprocal affected-contract reference を 対象registry recordの`evidence` citation
  に追加する
- [X] T162 [US1] direct-child depth、nested-context rejection、configured-root rejection を伴う、正確な
  `.github`、`.agents`、`.claude` skill selector の root 固定 matching を
  `src/server/inspection/rules/copilot.ts` に実装する *(2026-08-08 修正: root固定 — どのCopilot
  surfaceもroot文脈から下向きのskill lookupを文書化しておらず、nestedなskills directoryはこのproductが選択しないruntime
  contextに属するnear missである（FR-003）。`copilot.repo.skill`のcontract rowも同じ変更で是正した。)*
- [X] T163 [US1] extra recognition を作らず、正確な Copilot-only/Codex+Copilot/Claude+Copilot recognition
  matrix を `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T164 [US1] admission された各 matrix file を、一つの verified read と決定論的な multi-tool provenance
  を持つ一つの物理 item として `src/server/inspection/scan.ts` で組み立てる
- [X] T165 [US1] tool filter と definition ごとの recognition badge が vendor 固有の app 分岐なしで Copilot
  を扱うことを検証する: `src/app/composables/filters.ts` は commit された definition から提示する tool を導出し、そのkindのrow
  component（`src/app/components/inventory/rows/`）は閉じた tool table から badge を描画し、Copilot matrix は
  T155–T157 の suite が検証する *(2026-08-08 修正: 検証へ縮小 — どちらの surface も既に tool 汎用であり、Copilot 固有の分岐は閉じた
  table の仕組みを重複させるだけだった（AGENTS.md 実装の単純さ方針）。)*
- [X] T166 [US1] `src/app/components/inventory/InventoryList.vue` が skill row を通じて描画する
  multi-recognition summary が、Copilot の共有 candidate についてもアクセシブルであることを検証する — definition ごとの badge
  list は T157 のブラウザー受け入れが definition 単位で読み取る list である *(2026-08-08 修正: 検証へ縮小 — definition ごとの badge
  list は既にすべての認識製品をアクセシブルに描画しており、新規の出荷物はない。)*
- [X] T167 [US1] 英語の Copilot 一覧 text が union の隣の閉じた union table — `src/shared/entities.ts` の
  `SUPPORTED_TOOL_TEXT` と `SAME_NAME_SKILL_RESOLUTION_TEXT` — を通じて出荷され、それを読む Vue component
  が描画することを検証する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-08 修正:
  検証へ縮小 — 閉じた union table は既に GitHub Copilot の label と surface-dependent の文を持ち、user-visible copy
  方針はそのような text を component ではなく union の隣に置く。)*

---

## フェーズ 11: Copilot SKILL 詳細

**目的**: 互換性のない surface fact を維持しながら、完全で非活性な Copilot skill detail を追加します。

**独立テスト**: 三つのすべての directory と共有物理 file から Copilot skill を開き、file が書いた宣言、winner の主張なし、完全な literal source、変更されない Codex/Claude detail を検証します。

**目に見えるチェックポイント**: Copilot SKILL detail は完全で Codex・Claude detail と一貫しており、共有物理 file は各 product 自身の definition として開きます。 *(2026-08-10 修正: vendor の runtime を project する surface は無く（FR-009、T091）、互換性のない surface fact は別々の維持管理 record に留まり、読者が見るのはアドレスされた definition である。)*

### テスト先行

- [X] T168 [P] [US2] 解決済みの frontmatter の値、閉じた recognition record 上で一括公開される完全な parse、独立した same-name
  recognition、Copilot 自身の rule が admit しなかった candidate への recognizer の沈黙、environment reference
  の非解決、正確な provenance evidence に関する Copilot metadata の失敗テストを
  `tests/unit/inspection/copilot-metadata.test.ts` に追加する *(2026-08-10 修正: configured な skills root の
  matcher レベルの拒否は T154 のもので、`rules.test.ts` が実際の traversal に対して証明する。progressive loading と
  duplicate-name uncertainty は維持管理 record と導出された registry 文が所有する vendor runtime の fact
  である（FR-009、`skill-resolution.ts`）— この suite が所有するのは公開される recognition record である。)*
- [X] T169 [P] [US2] `tests/unit/inspection/copilot-composition.test.ts` は出荷しない: 3 つの per-surface
  selection strategy が満たすべきことは既に gate されている — `tests/contract/inspection-rules.test.ts` が 3 つの
  strategy edge と導出された surface-dependent 文を保持し、conformance fixture が各 pipeline の正確な operations
  を固定し、`tests/unit/shared/skill-resolution.test.ts` が順序未確立の選択から winner を読み出さないことを証明する *(2026-08-10
  修正: そのような suite が検証するはずの detail-time projection をどの surface も行わず（T091、T080・T143 と同じ理由）、registry
  fact の 3 つ目の複製は 2 つの状態の不一致だけを検出する gate になる。)*
- [X] T170 [P] [US2] 共有 file の per-tool recognition が分離されたままであること — 認識 tool ごとに 1 definition
  で、それぞれが自身の invocation name と detail route を持ち、アドレスされた tool だけに絞り込まれ、1 つの file から same-name
  collision は読み出されない — を証明する typed-detail の失敗テストを `tests/unit/app/recognition-details.test.ts` に追加する
  *(2026-08-05 修正: どのsurfaceもconditionをprojectしない（T091） — 公開するものが無いため、testするものも無い。)* *(2026-08-10
  修正: recognition は 1 つの `(file, tool)` record であり、VS Code・CLI・Cloud はどの recognition も運ばない維持管理
  record に留まる（FR-009）。)*
- [X] T171 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、Codex と Claude の behavior を維持した Copilot-only および
  shared-recognition detail に関するブラウザー受け入れ失敗テストを `tests/e2e/copilot-skills-detail.spec.ts` に追加する

### 実装

- [X] T172 [US2] inventory が所有する Copilot skill strategy が、grouped row の same-name 導出が読む文書化済み
  selection operations を record・strategy ID の変更なしに公開していることを
  `src/shared/registries/runtime-composition.ts` において検証する *(2026-08-06 修正: strategy
  recordは文書化されたoperationsを公開し、recognition・provenance・detailへcondition/applicabilityをprojectするものは無い（T091）。)*
  *(2026-08-10 修正: T092 と同じ理由で検証のみに縮小 — 3 つの per-surface strategy は T159 で出荷済みで、その `operations` は
  inventory row の導出された same-name 文に供給され（`skill-resolution.ts`）、その rule が答える collision
  に対してのみ公開される。detail は surface fact を描画しない（FR-009）。)*
- [X] T173 [US2] Copilot recognition が共有 engine を通じて exact metadata と正確な evidence を公開し、selection
  uncertainty は導出された registry 文だけが述べ、relationship は発行されないことを
  `src/server/inspection/recognizers/candidate.ts` において検証する *(2026-08-10 修正: 検証のみに縮小 — 共有 engine は
  Copilot skill を他 vendor と同一に読み（T148、T163）、`copilot-metadata.test.ts` がそれを証明し、relationship
  は発行されない（T141）。)*
- [X] T174 [US2] Copilot の surface difference と文書間の conflict を、1 つに統合した文ではなく別々の維持管理 record として
  `src/shared/registries/copilot/behaviors.ts` に保つ。surface が適用されるかどうかは投影しない。それは Inspector が観測しない
  runtime に依存するからである(FR-009) *(2026-08-10 修正: 出荷済みの状態で既に満たされている — T159 の catalog は per-surface
  の文を各自の evidence を持つ別々の record として保ち、registry contract gate が相互 edge を保持する。)*
- [X] T175 [US2] atomic Copilot extraction と、一度の読み取り・一度の parse による shared-file assembly を
  `src/server/inspection/scan.ts` において検証する *(2026-08-10 修正: 検証のみに縮小 — extraction は共有 engine を通じて既に
  atomic であり、共有物理 file はすべての認識 tool が 1 回の parse を再公開する 1 candidate
  である（T164）。`copilot-metadata.test.ts` が parse が 1 つの object であることを証明し、T171 の受け入れが開いた file とともに 1
  件の失敗 record を示す。)*
- [X] T176 [US2] skill detail route が vendor 固有の拡張なしに Copilot definition を描画することを、そのkind自身のdetail
  route（`src/app/pages/` 配下）において検証する *(2026-08-10 修正: T150 と同じ理由で検証のみに縮小 — 1 つの surface が
  closed-union table を通じてすべての vendor の skill を同一に描画する。別々の surface fact はどの surface も描画しない維持管理 record
  に留まり（FR-009）、T171 の受け入れが描画された per-tool caption を証明する。)*
- [X] T177 [US2] 英語の Copilot detail text が union の隣の closed-union table — `src/shared/entities.ts` の
  `SUPPORTED_TOOL_TEXT` と `CUSTOMIZATION_KIND_TEXT`、diagnostic text は `DIAGNOSTIC_REGISTRY` —
  を通じて出荷され、それらを読む Vue component が描画することを検証する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)* *(2026-08-10 修正: 検証のみに縮小 — caption は出荷済みで、user-visible copy policy はそのような text
  を component ではなく union の隣に置く（T167）。)*

---

## フェーズ 12: 統合 SKILL inventory

**目的**: 三つの vendor demonstration を、一つの一貫した skill inventory にします。

**独立テスト**: unique skill、duplicate name、shared physical file、item failure、secret、injected fileに閉じないfailureを持つall-tool fixtureを使用し、決定論的なrow、multi-recognition、filter、fileに閉じたoutcomeだけのpartial continuity、fileに閉じないfailure時のattempt全体のabortとitem、recognition、derivation、scan-result record/response、generationが一切ないこと、および以前のcommit済みsnapshotだけが残ること、rescan replacement、応答性の高いinteraction performanceを検証する。

**目に見えるチェックポイント**: 完全な skill-first inventory を filter して理解できます。

### fixture とテストを先行

- [X] T178 [US1] 対応するすべての selector、shared file、duplicate name、near miss、failure、secret、注入した
  execution-environment throw/rejection を持つ all-tool SKILL fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T179 [P] [US1] すべての SKILL selector と multi-tool recognition combination に関する conformance
  の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [X] T180 [P] [US1] 決定論的なphysical-file/recognition order、一度だけ読み取るmerge、exactなraw-path
  aggregation、atomic continuity、progress、完全なtraversal後のfileに閉じたfailureだけによるpartial
  publication、およびwhole attemptをfatalにしてextra readを行わずnew complete/partial
  generation、item、record、response、derived resultを公開せずprior committed snapshotだけを保持するdomain
  layerでcatch/classify/retryしないfileに閉じないfailureに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T181 [P] [US1] 統合 SKILL row に対する source、tool、kind、path filter の client 失敗テストを追加し、inventory
  state が source text、metadata literal、sensitive fixture value を一切含まないこと（detail を一度も request
  しておらず、authored content が client へ届く経路はそれだけであること）を `tests/unit/app/inventory.test.ts` で証明する
- [X] T182 [P] [US1] whole-generation replacement、stale detail/request-token/selection
  cleanup、filter retention、profile/cache/repository persistence ゼロに関する rescan の失敗テストを
  `tests/unit/session/session.test.ts` と `tests/unit/app/session-view-state.test.ts` に追加する
- [X] T183 [P] [US1] 再利用可能なSC-002 harnessとversioned profile
  validatorを追加し、変更しない100,000-entry/500-file reference fixtureを構築する。Profileをversion付きcanonical
  entry/content-digest inventory `tests/performance/sc002-fixture-manifest.json`とそのSHA-256
  `tests/performance/sc002-fixture-manifest.sha256`へbindし、smoke run前後にcanonical digestと参照content
  digestを再計算する。各fresh processで自動Repository scanがterminal stateへ到達するまでtiming外で待ち、明示Repository
  rescanを正確に1件dispatchして両timerをbrowser dispatch時に開始し、そのadmission
  `scanRequestId`をcaptureする。同じIDのvisible/assistive statusとそのrequestのcommit済みgeneration由来のcomplete
  inventoryだけをacceptし、generic/loading/unchanged/prior/automatic stateを拒否する。2つのstandardized
  interactionを計測し、profile/manifest version/digestとrequest ID/generationを記録してnon-gating smoke
  passを1回実行する。対象は`tests/performance/sc002-reference-profile.json`、`tests/performance/repository-scan.test.ts`、`tests/performance/inventory-interactions.test.ts`とし、exact
  10-run 9/10 protocolはT918へ延期する。このsuite自身のgateを同じ変更で復活させる: `./vitest.config.ts`の`performance`
  project、`./package.json`の`test:performance` script、`./.github/workflows/ci.yml`のCI
  job、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`のgate行・期待結果のbullet・そのdirectoryを名指すcommand。suiteが空の間はいずれも削除してある。まだ存在しないsuiteは宣言できないからである:
  空のprojectはrunをそのままfailさせ、それを通す許可を与えれば、誰も書いていない検証について成功を報告することになる。復元するbulletはこのtask自身のnon-gating
  smoke passを述べる。T918がそれを、自身が所有する最終の10 run中9 run protocolへ書き換える。
- [X] T184 [US1] 統合 filter、multi-recognition、keyboard use、inventory からの source exposure
  なしに関するブラウザー回帰を `tests/e2e/skills-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface
  も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T185 [US1] skill に対する決定論的な physical-file、recognition、provenance aggregation を
  `src/server/inspection/scan.ts` で完成させる
- [X] T186 [US1] generation-aware skill filtering、selection、rescan replacement、stale cleanup を
  `src/app/composables/filters.ts` と `src/app/session/view-state.ts` で完成させる
- [X] T187 [US1] アクセシブルな source/tool/path filter control を
  `src/app/components/inventory/InventoryFilters.vue` で、kind tab strip を
  `src/app/components/inventory/InventoryKindTabs.vue` と `src/app/pages/index.vue` で完成させる
  *(2026-08-13修正: kind は filter ではなく navigation — 常に1つの kind だけが表示される — であり、task の対象 surface
  はその決定に沿って分かれる。tab strip の keyboard 操作は T059 suite（`tests/e2e/codex-skills-list.spec.ts`）が証明し、T184
  suite は filter control と選択中 tab 状態を検証する。)* *(2026-08-17修正: 選択中の kind は URL 状態である — inventory page
  は tab を `?kind=` から初期化し、各選択を history replace で書き戻し、詳細・比較 page の back link は `/?kind=skill`
  を名指す。query が持つのはその選択であって `activeKind` ではない: 選ばれた kind を inventory が提供しなくなると表示中の kind は fallback
  するため、fallback を query へ書けば選択の置き場に導出値を置くことになる。これにより browser の Back と back link は kind 順の既定 tab
  ではなくユーザーが離れた tab へ戻る。`tests/e2e/codex-instructions-inventory.spec.ts` の kind-tab suite が証明する。)*
  *(2026-08-22修正: Source・tool・path の選択も kind と同じく URL に載せる（`?source=`、`?tool=`、`?path=`）。選択であって
  fallback ではないという同じ rule、同じ history replace に従うため、reload・貼り付けた link・browser の Back
  のいずれも読み手が読んでいた一覧を render する。detail page 自身の back link は、読み手の直前の絞り込みではなく自分の kind tab
  を名指したままにする。link がどこへ行くかを述べるためである。たどった行は、その link が着地した一覧の中で復元される（T1122）。)*
- [X] T188 [US1] 統合 skill row、recognition badge、empty state、progress control を
  `src/app/components/inventory/InventoryList.vue`、そのkindのrow
  component（`src/app/components/inventory/rows/`）、`src/app/pages/index.vue` で完成させる *(2026-08-08修正:
  admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*
- [X] T189 [US1] Source-value-free diagnostics を維持し、inventory の loading、empty、retry、replacement
  state で source を露出しない処理を `src/app/components/diagnostics/DiagnosticList.vue`  に実装する
- [X] T190 [US1] 英語の unified-inventory および multi-recognition message をそれらを描画する Vue component に追加する

---

## フェーズ 13: SKILL 比較

**目的**: skill 比較を提供します: 一つの名前の copy 同士を対応するファイルごとに比較する、skill kind 自身のサーフェスです。比較サーフェスは kind 固有です — MCP 比較は同名の file copy ではなく carrier 内の declaration を比較します — ので、後続の各 family は自身の比較フェーズで自身のサーフェスを設計します（spec.md § Clarifications Session 2026-08-14）。*(2026-08-14 修正: 共有の comparison path から skill kind 自身のものへスコープを改めた。)*

**独立テスト**: 一つのskill名のcopyをそのentry identityで開き、比較対象ファイルの座標を切り替えて、literal credentialの差分を含む完全なauthored-source diff、正確なtyped-recognition row、environment referenceの解決0件、environment-determined rendering-failure fallback、stale/epoch cleanup、same-origin Worker使用、keyboard/screen-reader accessを検証します。

**目に見えるチェックポイント**: 一つのskill名のcopy同士を、対応するファイルごとに、activationやmutationを発生させずに比較できます。

### テスト先行

- [X] T191 [P] [US3] Source-relative Pathによる相異なるfile選択とsame-path rejection、ペアが必要とする既存の FileDetail
  load — 2ファイルのペアでは2件、明示された不在を伴う one-sided のペアでは1件
  —、readable/current-generation/client-epoch/request-token guard、stale rejection、replacement または
  removal 後の cleanup に関する失敗テストを `tests/unit/app/skill-comparison.test.ts` に追加する *(2026-08-15 修正:
  operand は2つの readable file、または明示された不在の counterpart を伴う1つの readable file — FR-011 が記録する one-sided
  comparison である。)* *(2026-08-08 修正: T1082で確定したpath identityに合わせて文言を改めた — 選択に使える世代ごとのfile
  IDは存在しない。)* *(2026-08-14 修正: route と module を skill スコープにした — 比較サーフェスは kind 固有である。spec.md §
  Clarifications Session 2026-08-14 を参照。)*
- [X] T192 [P] [US3] ranking や winner の主張を行わず、canonical serialized declaration documentに関する失敗テストを
  `tests/unit/app/recognition-comparison.test.ts` に追加する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: declaration comparison がスコープの全体である — 出荷済みのどの
  recognition も wire が運ぶ relationship edge を公開しない（api-types.ts § FileDetailDto）ため、relationship
  comparison は reference を持つ kind を追加する phase とともに到来する。)* *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T193 [P] [US3] ペアの完全な literal model — 不在側は明示された不在としてラベルされる空のmodelで入り、authored
  な空のfileとしては決して入らない
  —、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`、same-origin
  Worker 使用、environment-determined rendering-failure fallback、disposal に関する direct-comparison-route
  の失敗テストを `tests/unit/app/source-diff.test.ts` と `tests/package/monaco-assets.test.ts` に追加する
  *(2026-08-15 修正: operand は2つの readable file、または明示された不在の counterpart を伴う1つの readable file — FR-011
  が記録する one-sided comparison である。)*
- [X] T194 [US3] 完全な authored skill diff、正確な literal credential difference、変更されない
  environment-reference text、typed recognition difference、responsive layout、keyboard access、fallback
  diagnostics、cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/skills-comparison.spec.ts` に追加する *(2026-08-14
  修正: 常設の plain-text トグルは存在しない — side-by-side fallback は editor 失敗時の経路だけであり、composable
  レベルで検証され、ページ上の control からは駆動しない。)*

### 実装

- [X] T195 [US3] Source-relative Pathによる相異なるfile選択 — generation-scopedで、same-path
  rejectionとepoch/token guardを伴う —、compare API を使わずにペアが必要とする既存 detail load（2ファイルのペアでは2件、明示された不在を伴う
  one-sided open では1件）、replacement・purge・removal 後の teardown を
  `src/app/composables/skill-comparison.ts` に実装する *(2026-08-15 修正: operand は2つの readable
  file、または明示された不在の counterpart を伴う1つの readable file — FR-011 が記録する one-sided comparison である。)*
  *(2026-08-08 修正: T1082で確定したpath identityに合わせて文言を改めた — 選択に使える世代ごとのfile IDは存在しない。)* *(2026-08-14 修正:
  route と module を skill スコープにした — 比較サーフェスは kind 固有である。spec.md § Clarifications Session 2026-08-14
  を参照。)*
- [X] T196 [US3] 比較の完全な literal Monaco model、不透明 URI、same-origin Worker、subscription の決定論的な作成と
  disposal を `src/app/composables/monaco.ts` に実装する *(2026-08-15 修正: operand は2つの readable
  file、または明示された不在の counterpart を伴う1つの readable file — FR-011 が記録する one-sided comparison である。)*
- [X] T197 [US3] 正確に label 付けされた read-only/no-link/no-revert diff option、verbose accessibility、完全な
  side-by-side fallback を `src/app/components/skill-comparison/SourceDiff.vue` に実装する *(2026-08-14
  修正: route と module を skill スコープにした — 比較サーフェスは kind 固有である。spec.md § Clarifications Session
  2026-08-14 を参照。)*
- [X] T198 [US3] inferred winner を作らず、各sideを1つのcanonical YAML
  documentへserializeしてMonacoでdiffするdeclared-metadata比較を
  `src/app/components/skill-comparison/RecognitionComparison.vue` に実装する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: declaration comparison がスコープの全体である — 出荷済みのどの
  recognition も wire が運ぶ relationship edge を公開しない（api-types.ts § FileDetailDto）ため、relationship
  comparison は reference を持つ kind を追加する phase とともに到来する。)* *(2026-08-14 修正: route と module を skill
  スコープにした — 比較サーフェスは kind 固有である。spec.md § Clarifications Session 2026-08-14 を参照。)* *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical YAML
  document（skillは`name`と`description`を先頭に、他は全keyをsort順）としてMonacoでdiffし、tool
  recognitionはその横にtypedなrowとして並べる（frontmatter-yaml.ts）。)*
- [X] T199 [US3] アクセシブルな generation-scoped の比較エントリ — その名前が2つ以上の readable な entry file
  を持つときに提供され、それらの比較を開く row レベルの link 一つで、selection control も edit・merge・lint・validation・fix action
  も持たない — を そのkindのrow component（`src/app/components/inventory/rows/`） に追加する *(2026-08-15 修正: link
  の条件はその名前の readable な entry file である — census companion へ到達するのは link ではなく比較サーフェス自身の switcher である。)*
  *(2026-08-14 修正: 2ファイル選択コントロールから同名エントリ link へ再構成した — エントリ link と switcher は一つの skill
  名の中でペアを構成し、常設の selection では3つ以上のファイルをペアごとに切り替えられない。URL は copy の entry identity
  と比較対象ファイルでペアを指名する（FR-011）。)*
- [X] T200 [US3] direct-route loading、stale recovery、same-name switcher — 両側を所有する名前の copy
  の同じファイルへ揃えて切り替える corresponding-file switcher と、copy が3つ以上ある名前のための side ごとの copy switcher —
  responsive layout、accessible navigation、英語 message を `src/app/pages/skills/compare/[family].vue`
  に実装する。URL は model の座標 — 所有する row の invocation name である `name`、copy の entry-file identity である
  `left`/`right`、copy 相対の比較対象ファイル `file` — でペアを名指し、model が表現しないペアは比較せず報告する *(2026-08-16 修正: 座標 URL —
  自由な file-path parameter は同名 model が表現できないペアを綴れてしまい、そのすべてに個別対応が必要だった。)* *(2026-08-23 修正: row は自身の
  `name` 座標として乗る。2 つの file が複数の row に同居しうるため、導出した row は generation が先に公開した方になるからである。)* *(2026-08-14
  修正: switcher は同名エントリ link の決定とともに追加された — 切り替えは比較画面そのものの上で行い、名前の copy の対応するファイル同士の間だけで行う — 片方の copy
  だけが持つファイルも提示され、存在する側の完全な内容を明示された不在に対して片側表示する。サーフェスは skill スコープで `/skills/compare` にある（spec.md §
  Clarifications Session 2026-08-14）。)*

---

## フェーズ 14: SKILL metadata 比較

**目的**: skill 比較の完全 literal path（フェーズ 13、FR-011）が、census 公開された `agents/openai.yaml` companion をカバーすることを証明します。`skill metadata` recognition は存在しないため、追加すべき typed field row・seed provenance・kind 固有 message はありません: このフェーズが検証するのは、これら通常の readable companion が他のあらゆる対応する組と同様に比較できることです。*(2026-08-01 修正: `skill metadata` candidate を出荷しないというフェーズ 6 の決定に伴う再構成。)*

**独立テスト**: 一つのskill名の比較を対応する `agents/openai.yaml` census companion へ切り替えて、完全な authored-source diff、変更されない environment-reference text、masking・reveal control の不在、fallback behavior、stale/epoch invalidation、完全な model/subscription cleanup を検証します。

**目に見えるチェックポイント**: census 公開された二つの `agents/openai.yaml` file を比較画面の corresponding-file switcher で比較でき、authored sensitive value は変更なしで表示され、typed metadata row が捏造されることはありません。

### テスト先行

- [X] T201 [P] [US3] census-companion の file が他の readable companion と同様に corresponding-file
  selection に入ること、その比較が recognition row を公開しないこと — これらの file は recognition を持たない — を証明する比較回帰失敗テストを
  `tests/unit/app/skill-comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
  *(2026-08-01 修正: 上記フェーズ決定により plain-file scope)* *(2026-08-14 修正: route と module を skill スコープにした —
  比較サーフェスは kind 固有である。spec.md § Clarifications Session 2026-08-14 を参照。)*
- [X] T202 [US3] 比較画面の file switcher を通して到達した二つの `agents/openai.yaml` companion の完全な literal
  diff、変更されない environment-reference text、masking・reveal control の不在、accessibility、fallback、cleanup
  に関するブラウザー受け入れテストを `tests/e2e/skill-metadata-comparison.spec.ts` に追加する *(2026-08-01 修正: 上記フェーズ決定により
  plain-file scope)* *(2026-08-14 修正: companion へは detail tree での選択ではなく same-name file switcher
  で到達する。)* *(2026-08-14 修正: 常設の plain-text トグルは存在しない — side-by-side fallback は editor
  失敗時の経路だけであり、composable レベルで検証され、ページ上の control からは駆動しない。)*

### 実装

- [X] T203 [US3] skill の census-listed file を、compare route の corresponding-file switcher —
  その選択肢は所有する名前の copy が readable に持つ copy 相対のファイルで、片方の copy だけが持つファイルは明示された不在に対して片側表示で提供される —
  を通して比較入力として提供する。inventory row と skill detail
  画面（`src/app/pages/skills/detail/[source]/[...path].vue`）の比較エントリ link から到達し、フェーズ 13 の view
  composable を再利用して、新しい API surface も typed metadata row
  も追加しない。`src/app/components/inspection/DirectoryFileTree.vue` は変更なしで、どの recognition も所有しない比較された
  companion はその literal source だけを表示する — 独立に admit された companion、とりわけ nested `SKILL.md` は、片側比較でも自身の
  recognition の row を保持し、不在は `src/app/components/skill-comparison/RecognitionComparison.vue` で独立した
  side state として立つ（FR-007、FR-011） *(2026-08-16 修正: 対象を未認識の companion に限定し、recognition サーフェスが片側の row
  を描画する — census は自身の recognition を持つ file も一覧するためである。)* *(2026-08-01 修正: 上記フェーズ決定により typed
  comparison-row 拡張は追加しません)* *(2026-08-14 修正: detail-tree の選択 control から corresponding-file switcher
  へ再構成した — エントリ link と switcher は一つの skill 名の中で、その copy の対応するファイル同士のペアを構成し、常設の selection
  では3つ以上のファイルをペアごとに切り替えられない。URL は copy の entry identity と比較対象ファイルでペアを指名する（FR-011）。)*
- [X] T204 [US3] kind 固有 message の追加なし: `src/app/pages/skills/compare/[family].vue` は変更なし
  *(2026-08-01 修正: 上記フェーズ決定により scope が空になりました)* *(2026-08-14 修正: route と module を skill スコープにした —
  比較サーフェスは kind 固有である。spec.md § Clarifications Session 2026-08-14 を参照。)*

---

## フェーズ 15: Codex Instructions inventory

**目的**: 静的な Codex instruction file を追加し、純粋な configured-fallback 宣言/導出インターフェースを定義したうえで、同じフェーズ内で `.codex/config.toml` を fallback 導出の構成入力として読み(Codex rules の隣にある通常の構成読み取りロジックが、宣言値からスキャンの追加 plan を組み立てる)、configured fallback の instruction 行を有効化します。carrier 自身は決して公開も生表示もされません（2026-08-17）: このフェーズに candidate・行・detail はなく、最初の candidacy はそれを所有するフェーズとともに到着します。 *(2026-08-17修正: fallback の有効化をこのフェーズへ移動。フェーズ 23 は Codex MCP のフェーズのまま。)*

**独立テスト**: `AGENTS.override.md` と `AGENTS.md` をインベントリ化し、メモリ内の受け入れ済み carrier fixture に対して `codex.derived.fallback-basename` を実行します。vendor/runtime と execution environment の capacity だけに従う全 configured declaration の complete retention、宣言された各値を Repository root で walk が突き合わせる 1 つの entry 名として扱うこと — どの entry も名乗らない値は単に一致しない — 、決定論的な provenance、およびフェーズ内の有効化（T1089/T1090）が carrier を構成として読むまでは `.codex/config.toml` の読み取りも configured fallback row もゼロであることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction に加えて、repository 自身の `.codex/config.toml` が設定した instruction file もフィルタリングでき、構成 file 自体はどこにも現れません。

### fixture とテストを先行

- [X] T205 [US1] override、regular file、configured fallback、empty file、多数の fallback name、どの entry
  も名乗らない宣言名、import、secret、malformed content、near miss に対する Codex instruction fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-17修正: 宣言値は walk が突き合わせる entry 名であり
  validator に通す値ではないため、fixture が持つのは「どの entry も名乗らない名前」のケースである。)*
- [X] T206 [US1] Codex instruction behavior、読み取り権限を付与しない `codex.behavior.repo.config` と
  `codex.behavior.user.config` carrier fact、静的 matcher、純粋な fallback 宣言/導出 fixture
  contract、composition、relationship、path-negative boundary、reciprocal evidence row
  を、`codex.derived.fallback-basename` の registry row を作成せずに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T207 [P] [US1] `codex.repo.instructions`、override/regular selector、empty-file
  behavior、path-negative higher scope、決定論的な provenance、およびフェーズ内の有効化（T1089）より前には config candidate と
  `codex.derived.fallback-basename` registry record の両方が存在しないことに関する matcher と recognition の失敗テストを
  `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T208 [US1] Static Codex instruction scanと、carrier textからin-memory fallback declarationを読むpure
  functionのfailing testを追加する。Success時はnumeric declaration capなしで全configured
  declarationをcompleteに保持し、derivationのthrow/rejectionはdomainでcatch/cause分類/retry/partial
  declaration-plan-candidate化せず変更なしにouter boundaryへ伝播してattempt result/generationを作らずprior
  commitを維持する。どのentryも名乗らない宣言名は何にも一致せず、その傍らの名前は通常どおりadmitされること、registry前target access
  0件を`tests/integration/repository-scan.test.ts`で証明する *(2026-08-17修正: 宣言値はwalkがRepository
  rootで突き合わせるentry名であり、escapeすべきpathが組み立てられないため、ancestry comparabilityもescape rejectionもtestしない。)*
- [X] T209 [US1] 静的な Codex instruction row、filter、diagnostics、exclusion、および config row がゼロの明示的な
  configured-fallback-pending 状態に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-inventory.spec.ts`
  に追加する *(2026-08-17修正: 同じフェーズの T1088 が configured fallback を有効化するため、suite は有効化された fallback 行と
  carrier が現れないことを assert する。)* *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその
  maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

### 実装

- [X] T210 [US1] Codex の Repository/User instruction statement を、完全な base instruction-layering
  strategy record とともに `src/shared/registries/vendor-behaviors.ts` と
  `src/shared/registries/runtime-composition.ts` に追加し、config read を認可せず production registry
  を閉じたままにする *(2026-08-17修正: 読み取り権限を付与しない config-carrier statement と `codex.config.precedence` は、その
  rule relation が必要とする T1089 の carrier 受け入れとともに到着し、ここでは追加しない。)*
- [X] T211 [US1] Codex の静的 instruction record だけを追加し、`codex.derived.fallback-basename` は T1089
  が登録するまで未登録のままにし、`codex.repo.config` rule はここでは一切登録せず、adjacent exclusion ID を
  `src/shared/registries/inspection-rules.ts` に追加しない *(2026-08-17修正: このフェーズの carrier は構成入力であり rule
  を得ない。最初の candidacy はそれを受理するフェーズのものである。)*
- [X] T212 [US1] Codex instruction evidence を 対象registry recordの`evidence` citation に追加する
  *(2026-08-17修正: config carrier fact とその backlink は record 本体とともに T1089 の受け入れへ移動。)*
- [X] T213 [US1] T1089 が derived rule を登録するまでは scan candidate を生成できない、静的な Codex instruction
  matching、純粋な fallback 宣言 reader、one-edge derivation helper を
  `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-17修正: 純粋な reader と one-edge derivation は compiled rule と同じ
  `src/server/inspection/rules/codex.ts` に置いた。共有 recognizer は登録済みのすべての kind
  を既に認識するため、`recognizers/candidate.ts` にはコードを追加せず、instructions kind が識別情報を持たない決定を
  `RecognitionDetails` の doc に記録した。)* *(2026-08-17修正: 宣言 reader と seed 抽出は
  `src/server/inspection/rules/codex.ts` の rule の隣に置く。record 駆動の derivation program は無く、構成値から plan
  を組み立てるのは通常のコードである。)* *(2026-08-17修正: 宣言値は validator に通さない — 宣言された fallback 値は walk が列挙した entry
  名と比較される名前であって、walk が組み立てる path ではない。文字 grammar は repository が正当に持ちうる名前を拒否し、その傍らの通常の名前まで落とす一方、防いでいる
  escape は無い。)*
- [X] T214 [US1] Codex instruction に対する inventory filter と row を
  `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-08修正: admission はどの surface
  も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)* *(2026-08-17修正: tool/kind
  の拡張は導出を担う composable `src/app/composables/filters.ts` に置いた — `InventoryFilters.vue` は view が導出した
  tool をそのまま描画するため編集不要 — row は新規 `rows/InstructionRow.vue` により instructions の tab
  panel（`InventoryList.vue`）へ描画される。同じフェーズで configured fallback を有効化する T1088 により、pending 状態は無い。)*
- [X] T215 [US1] 英語の Codex instruction inventory、fallback、exclusion message をそれらを描画する Vue component
  に追加する

### Configured fallback の有効化 *(2026-08-17修正: このフェーズへ移動)*

- [X] T1084 [US1] Codex instruction fixture を carrier のケース — 宣言された fallback 名、重複、不正な
  table、secret、まだ認識されない `[mcp_servers.*]` table、入れ子 carrier のニアミス — で拡張し、識別のみの
  `codex.derived.fallback-basename`、`codex.config.precedence` を伴う Repository/User config-carrier
  statement、その relationship と reciprocal evidence row を、carrier candidate・MCP behavior row・exclusion
  ID なしに `tests/fixtures/repositories/build-fixtures.ts` と 3 つの conformance fixture に具体化する
  *(2026-08-17修正: carrier は構成入力であり、candidate にはならない。)*
- [X] T1085 [P] [US1] `codex.derived.fallback-basename` の識別としての登録、Inspector の数値上限なしで
  environment-owned capacity に従う完全な configured derivation、あらゆる thrown/rejected registry/derivation
  操作の変更なし伝播、carrier candidate や MCP recognition がないこと、plugin/User/managed や任意の config path
  を昇格しないことに関する失敗する matcher/registry テストを `tests/unit/inspection/rules.test.ts` と
  `tests/contract/inspection-rules.test.ts` に追加する *(2026-08-17修正: `codex.repo.config` は登録しない —
  carrier は構成入力であり、candidate にはならない。)*
- [X] T1086 [P] [US1] `project_doc_fallback_filenames` の抽出が carrier テキストから解決済みの値を読んで T213 の reader
  に供給すること、有効化された各 fallback instruction recognition が決定論的な derived provenance を持つことを証明する失敗する
  seed-parser/recognition テストを `tests/unit/inspection/seed-parsers.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-17修正: carrier は recognition を得ない —
  決して公開されない。)*
- [X] T1087 [US1] 構成読み取り段階がどの candidate のスキャンよりも先に carrier を開くこと、スキャン段階が公開される全ファイルを一度ずつ読むこと —
  carrier は構成としてちょうど一度だけ読まれ、決して公開されない —、コミットされた instruction 行、宣言されたが存在しない名前とニアミスの否定、malformed な
  carrier が何も構成せず非公開のままであること、file-confined でない失敗の変更なし伝播を証明する失敗する scan テストを
  `tests/integration/repository-scan.test.ts` に追加する *(2026-08-17修正: 二段構成・非公開 carrier に合わせて再記述。)*
- [X] T1088 [US1] 有効化された configured fallback instruction 行、撤去された pending note、carrier がどこにも現れないこと —
  行・タブ・言及なし —、filter、diagnostics でブラウザー受け入れテストを `tests/e2e/codex-instructions-inventory.spec.ts`
  において拡張する *(2026-08-17修正: `.codex/config.toml` は決して生表示されない。)*
- [X] T1089 [US1] compiled bounded-derived unit を著述し、derived candidate の識別としての
  `codex.derived.fallback-basename` rule、Repository/User config-carrier
  statement、`codex.config.precedence`、その relation と evidence を — carrier candidate なしで —
  `src/shared/registries/rule-types.ts`、`src/server/inspection/rules/registry.ts`、`src/shared/registries/identifier-types.ts`、`src/shared/registries/codex/*.ts`、`src/shared/registries/inspection-rules.ts`
  に追加する
- [X] T1090 [US1] generic な TOML パースの seamを`src/server/inspection/parsers/toml.ts`に、T213のreaderへ供給するCodex carrier抽出を
  `src/server/inspection/rules/codex.ts`に、スキャンの前に実行され宣言された basename を同じ walk のもう一つの plan へ展開する構成読み取りロジックを
  `src/server/inspection/rules/codex.ts`・`src/server/inspection/scan.ts`・`src/server/inspection/rules/registry.ts`
  に、derived instruction recognition を `src/server/inspection/recognizers/candidate.ts` と
  `src/server/session/session.ts` に、有効化された fallback 行と pending note を置き換えるメッセージを
  `src/app/composables/filters.ts` とインベントリ component に実装する — carrier 自身は非公開のまま *(2026-08-17修正: seed
  抽出と Codex の構成 reader は、いずれもそれが仕える rule の隣の `src/server/inspection/rules/codex.ts` に置く。`scan.ts` は
  rule catalog と同じように各 vendor の reader を合成するだけで、vendor を知らない。)*

---

## フェーズ 16: Codex Instructions 詳細

**目的**: フェーズ 15 の configured fallback も含め、完全な literal Codex instruction source と typed layering を追加します。 *(2026-08-17修正: carrier と fallback の有効化はフェーズ 15 へ移動したため、この detail フェーズはそれらを先送りせずに扱う。)*

**独立テスト**: 静的な Codex instruction fixture を開き、reference が一切生成されないこと — 本リポジトリが引用するどの公式 Codex ページも `AGENTS.md` の import/reference 構文を立証していないため、`@path` に見える token も他と同じ source text である（T217） — に加えて、stale-ID behavior、diagnostics、detail-state cleanup を検証する。別途、フェーズ 15 の構成読み取りが有効化した configured fallback instruction file の detail を検証する。Selection order と instruction capacity について vendor が文書化していることは維持管理 contract に残り、recognition や detail へ project するものは無い(T091)。

**目に見えるチェックポイント**: Codex instruction を選択すると、それが正確な静的 file であっても repository の構成が加えた名前であっても、完全で非活性な detail — file の宣言、instructions、diagnostics から始まる — が開く。

### テスト先行

- [X] T216 [P] [US2] 設定済みの全 fallback basename に関する Codex の失敗テストを
  `tests/unit/inspection/seed-parsers.test.ts` に追加する *(2026-08-06 修正:
  どのsurfaceもorder/capacityをprojectしないためcomposition suiteは無く（T091、T143参照）、shipped
  strategyが満たすべきことはregistry contract gateが扱い、この phase が test するのは fallback basename だけである。)*
- [X] T217 [P] [US2] Codex instruction file が relationship を一切生成しないこと — `@path` に見える token、Markdown
  link、素の path はいずれも source text のままで、target へのアクセスも起きない — と environment reference
  がどこにも解決されないこと、target access前のnested/transitive projection拒否、environment reference非解決、target read
  authority 0、relationship、provenance、recognition、その他derived outputを一切返さずwhole scan
  attemptへ変更なしのthrow/rejectionを伝播するdomain
  layerでcatch/classify/retryしないthrow/rejectionに関するimport/referenceのfailing
  testを`tests/unit/inspection/relationships.test.ts`と`tests/integration/inspection-safety.test.ts`に追加する
  *(2026-08-17修正: 本リポジトリが引用するどの公式 Codex ページも AGENTS.md の import/reference 構文を立証していない — AGENTS.md
  のページが文書化するのは discovery と fallback filename だけである — ため、引用可能なページがそれを立証するまで Codex instruction file は
  `runtime-reference` を生まない。presentation allowlist の行は kind を許可するのであって、extractor に occurrence
  の発明を求めるものではない。)*
- [X] T218 [P] [US2] 完全な Codex instruction source、file が書いた宣言（authored 順）、fallback、空の relationship
  集合（T217）、diagnostics、environment reference の非解決、stale ID に関する detail/API の失敗テストを
  `tests/contract/http-api-files.test.ts` と `tests/unit/app/recognition-details.test.ts` に追加する
  *(2026-08-06 修正: どのsurfaceもorder・capacity・condition・applicabilityをprojectしない —
  vendorの文書化されたselectionは維持管理contractに残り、製品が何をするかを述べるsurfaceは無い（FR-009、T091）。)*
- [X] T219 [US2] reciprocal contract reference を持つ Codex instruction runtime-composition graph
  coverage の失敗テストを `tests/contract/runtime-composition.test.ts`
  に追加する。同じ変更で`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`の§
  Contract-registry
  validationにある`pnpm exec vitest run --project contract tests/contract/runtime-composition`の行を復活させる。fileが存在しない間は削除してある。どのtestにもmatchしない文書化済みcommandはfailするからである:
  Vitestは`No test files found`を表示してexit 1になり、quickstartに従う読み手はcheckではなく壊れた手順に当たる。
- [X] T220 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal static Codex instruction detail、configured
  fallback detail、relationship section が無いこと（T217）、diagnostics、detail-state cleanup
  に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-detail.spec.ts` に追加する *(2026-08-06 修正:
  どのsurfaceもorder・capacity・condition・applicabilityをprojectしない —
  vendorの文書化されたselectionは維持管理contractに残り、製品が何をするかを述べるsurfaceは無い（FR-009、T091）。)*

### 実装

- [X] T221 [US2] 追加する strategy 作業は無い: `src/shared/registries/runtime-composition.ts` は変更しない
  *(2026-08-17修正: scope が空になった — フェーズ 15 が `codex.instructions.layering` を文書化済みの全
  operation（`select-first`・`concatenate`・`filter`）とともに出荷し、その傍らに `codex.config.precedence` も置いたため、この
  task が記録するはずだった fallback operation は既に存在し、strategy ID の追加は禁じられている。)* *(2026-08-06 修正:
  どのsurfaceもorder・capacity・condition・applicabilityをprojectしない —
  vendorの文書化されたselectionは維持管理contractに残り、製品が何をするかを述べるsurfaceは無い（FR-009、T091）。)*
- [X] T222 [US2] instruction file 自身の presentation — file が書いた key を authored 順に、それに続く instructions
  を、skill が既に使っている 1 回の frontmatter parse で — を `src/server/inspection/parsers/markdown.ts` と
  `src/server/inspection/recognizers/candidate.ts` に実装する。detail が先頭に置くのはこれであり、この kind はこれまで payload
  を持たなかった。Codex instruction file には reference を一切生成しない: relationship extractor は構文を文書化している vendor
  とともに到着する（フェーズ 18 の Claude import）。到着した先でも target は read authority を与えない *(2026-08-17修正: どの引用ページも
  `AGENTS.md` の reference 構文を文書化していないと T217 が確定したため、Codex instruction file からは reference を抽出しない。)*
  *(amended 2026-08-21: detailはfrontmatterをread-only viewerの1つのYAML
  document（frontmatter-yaml.ts）として提示する。blockそのものの言語であり、読み手は自分のfileと翻訳なしに見比べられる。)*
- [X] T223 [US2] Codex instructionの正確な解決済みの値、atomic parsing、決定論的な返却結果のために完全なauthored
  sourceを保持したまま行うparser scratch/transient-semanticの破棄、構成読み取り由来のfallback
  provenanceを`src/server/inspection/scan.ts`へ統合する。Parser/relationship/assemblyのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived
  result/body/generation化せず変更なしに伝播させ、prior commitだけを保持する。targetをrecurse/expand/readしない
- [X] T224 [US2] Codex instruction に対する typed detail presentation をそのkind自身のdetail
  route（`src/app/pages/` 配下）で拡張し、inventory からそこへ到達できるようにする:
  `src/app/components/inventory/rows/InstructionRow.vue` は、route が無い間に描画している plain text を置き換えて、認識した
  product ごとにその route へリンクする。`src/app/components/inspection/RelationshipList.vue`
  はこのフェーズのものではなく、reference に根拠のある vendor とともに到着する（T217、T222） *(2026-08-17修正: 「instruction を選択すると
  detail が開く」という checkpoint が URL を手で打つ以外に到達できないことがレビューで判明したため、row の link をここで明記した。)* *(2026-08-06
  修正: どのsurfaceもorder・capacity・condition・applicabilityをprojectしない —
  vendorの文書化されたselectionは維持管理contractに残り、製品が何をするかを述べるsurfaceは無い（FR-009、T091）。)*
- [X] T225 [US2] 英語の Codex instruction detail、fallback message をそれらを描画する Vue component に追加する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 17: Claude Instructions inventory

**目的**: `AGENTS.md` を filename だけで recognition せず、root および nested の Claude instruction file を追加する。

**独立テスト**: 対応する `CLAUDE.md`、`CLAUDE.local.md`、すべての nested `.claude/CLAUDE.md` を inventory 化し、それらが `claude.repo.instructions` に一致することを確認します。決定論的な provenance record と、変更されない Codex instruction を検証します。

**目に見えるチェックポイント**: Claude instruction file を filter できます。

### fixture とテストを先行

- [X] T226 [US1] root および nested の `CLAUDE.md` と `.claude/CLAUDE.md` candidate、filename-only
  `AGENTS.md`、import、secret、malformed content、near miss に対する Claude instruction fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-08修正: launch/ancestor/descendant は
  vendor の runtime working directory との関係を指す語であり、Inspector はそれを観測しない — rule はあらゆる深さの `CLAUDE.md` に
  match し、file 単位の分類はどこにも描画しない（FR-009、T091）。)*
- [X] T227 [US1] exclusion ID を定義せず、Claude instruction behavior、candidate
  matcher、composition、path-negative case、relationship、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T228 [P] [US1] nested `.claude/CLAUDE.md` file が `claude.repo.instructions` candidate
  であること、filename-only `AGENTS.md` は Claude-recognized されないこと、provenance が決定論的であることを証明する matcher と
  recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T229 [US1] Claude instruction discovery、一度の read、決定論的な order、isolated failure、import-target
  read ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [X] T230 [US1] Claude instruction row、filter、exclusion、diagnostics、維持される Codex instruction
  に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-inventory.spec.ts` に追加する *(2026-08-08修正:
  admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T231 [US1] Claude の Repository/User instruction statement を、完全な base layering/import strategy
  record とともに `src/shared/registries/vendor-behaviors.ts` と
  `src/shared/registries/runtime-composition.ts` に追加し、この milestone で production registry を閉じたままにする
- [X] T232 [US1] Claude instruction candidate record だけを追加し、exclusion ID を定義せずに未対応 location を
  path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する *(2026-08-18修正: rule が
  ship する selector program は2本 — 任意深さの `CLAUDE.md` program が Repository root でも各深さでも
  `./.claude/CLAUDE.md` をすでに admit するため。vendor contract も同じ変更で修正した（AGENTS.md § Implementation
  simplicity policy）。)*
- [X] T233 [US1] Claude instruction evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation に追加する
- [X] T234 [US1] Claude instruction matching と recognition を `src/server/inspection/rules/claude.ts`
  と `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-08修正:
  launch/ancestor/descendant は vendor の runtime working directory との関係を指す語であり、Inspector はそれを観測しない —
  rule はあらゆる深さの `CLAUDE.md` に match し、file 単位の分類はどこにも描画しない（FR-009、T091）。)* *(2026-08-18修正:
  `src/server/inspection/recognizers/candidate.ts` の編集は不要だった — recognizer は compiled rule の product
  と kind で dispatch し、`instructions` kind の payload は両 kind が共有する唯一の Markdown parse なので、Claude の
  admission も Codex と同じ engine で recognize される。)*
- [X] T235 [US1] import を読み取らず、Codex result も変更せずに Claude instruction classification を
  `src/server/inspection/scan.ts` に統合する *(2026-08-18修正: scope を空にした —
  `src/server/inspection/scan.ts` は各 vendor の compiled catalog を合成するので、その catalog に追加した rule
  はここを編集せずに walk へ届き、この phase は import を読まない。)*
- [X] T236 [US1] Claude instruction の inventory row と、英語の instruction、exclusion message を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-08修正:
  launch/ancestor/descendant は vendor の runtime working directory との関係を指す語であり、Inspector はそれを観測しない —
  rule はあらゆる深さの `CLAUDE.md` に match し、file 単位の分類はどこにも描画しない（FR-009、T091）。)* *(2026-08-18修正: exclusion
  message は ship しない — この phase は exclusion ID を定義しない（T232）ため、未対応 location は selector が到達しない path
  であって row が述べることはない。代わりに row は、この kind の row がこれまで置き場所を持たなかった file 単位の diagnostic を、その file の row
  上で述べる。)*

---

## フェーズ 17b: Instruction 適用範囲によるグループ化

**目的**: instructions 一覧を、その file が担当する範囲でグループ化します。root の `AGENTS.md` と `CLAUDE.md` が 1 row になり、nested な `CLAUDE.md` は自身の row を持ちます。

**独立テスト**: root の `AGENTS.md`、`CLAUDE.md`、`CLAUDE.local.md`、`.claude/CLAUDE.md` と、nested な `packages/api/CLAUDE.md` を持つ repository を scan し、`**` と `packages/api/**` の 2 row になること、root の file がすべて前者に入ること、各 file が自身を認識した product だけを述べ続けることを検証します。

**可視チェックポイント**: 同じ範囲を担当する instruction file が並んで表示され、Phase 22 がこの kind に与える比較 surface への入口が用意されます。

### 仕様

- [X] T1091 [US1] instructions 一覧の単位、path から導出する適用範囲、厳密な文字列一致による grouping を
  `specs/001-inspect-agent-customizations/spec.md` § Clarifications、`data-model.md` §
  一覧の単位、`contracts/http-api.md` に、両言語で記録する

### 実装

- [X] T1092 [US1] 適用範囲を `src/server/inspection/rules/registry.ts` の instruction 専用 compiled 単位に宣言し、各
  `src/server/inspection/rules/<tool>.ts` で `instructions` record をその製品の instruction 単位に compile
  し、製品ごとに答える — root に anchor した Codex と derived rule は Repository root、Claude は path 由来の範囲で、末尾の
  `.claude` は `CLAUDE.md` のときだけ落とし、他の admit 済み file 名では保つ — ことで、製品が file を置くための directory を、その file
  が担当する path と取り違えないようにし、何も担当しない kind の rule は何も答えないようにする *(2026-08-18修正: 適用範囲は instruction file
  についての事実なので、全 kind が共有する単位ではなく instruction record が compile される単位に属する。出荷済み record の field も、その後の共有
  compiled rule の member も、skill rule に答えを持たない問いへ答えさせていた（AGENTS.md § Classとinterfaceの方針）。)*
- [X] T1093 [US1] instruction recognition の適用範囲を Source 相対 Path と admission の container directory
  から導出し、`instructions` payload に載せる処理を `src/server/inspection/recognizers/candidate.ts` に実装する。範囲は
  extraction 失敗後も残る。file が担当する対象は、その file が置かれた場所から決まるためである
- [X] T1094 [US1] `InstructionInventoryEntryDto` を、範囲 1 つにつき 1 row とその範囲が担当する file の形に変え、projection
  を範囲の厳密な文字列で group 化する — glob の parse、正規化、包含判定は行わない — 処理を `src/shared/api-types.ts` と
  `src/server/session/session.ts` に実装する
- [X] T1095 [US1] 描画する row を group 化し、filter を各範囲の内側の file に対して合成する処理を
  `src/app/composables/filters.ts`、`src/app/components/inventory/InventoryList.vue`、そのkindのrow
  component（`src/app/components/inventory/rows/`）、およびそのkindのdetail route（`src/app/pages/`）に実装する
  *(2026-08-27修正:
  一覧の項目は、その範囲を担当するすべてのSourceを横断した範囲そのものである。`src/app/components/inventory/rows/InstructionRow.vue`が範囲を述べ、`src/app/components/inventory/SourceFamilyBlocks.vue`がSource
  familyごとに1つのblockを保持して、そのfamilyの各fileをどのディレクトリにあったかとともに1つに並べる。comparisonは1つのblockのfileの組であり、consentされた2つのhomeを組にすることはあっても2つのfamilyにまたがることはない。そのaddressは`/instructions/compare/<family>`で、各sideが自身のSourceを運ぶ。publishされる行の単位は変わらず、1つのSourceの1つの範囲である。グルーピングが変えるのは、読み手がそれを見つける場所である。一覧の横の件数は項目数を数えるため、範囲の数を数える。)*
- [X] T1096 [US1] group 化した row に対する recognition、scan、ブラウザーの各 suite を
  `tests/unit/inspection/recognizers.test.ts`、`tests/unit/inspection/relationships.test.ts`、`tests/unit/app/recognition-details.test.ts`、`tests/integration/repository-scan.test.ts`、`tests/e2e/claude-instructions-inventory.spec.ts`、`tests/e2e/codex-instructions-inventory.spec.ts`、`tests/e2e/codex-instructions-detail.spec.ts`
  で拡張する

- [X] T1097 [US1] `node_modules`という名前のdirectoryへ、Repository rootでも任意の深さでも入らないようにする —
  entry名だけで判定し、解決済みreal pathでも除外するVCS内部とは異なるため、authorされた場所にあるsymbolic
  linkはその場所の条件でinventoryする（FR-024） — 処理を `src/server/inspection/traversal.ts` と
  `src/server/inspection/companion-census.ts` に実装し、fixtureのnear missと除外caseを
  `tests/fixtures/repositories/build-fixtures.ts`、`tests/unit/inspection/traversal.test.ts`、`tests/unit/inspection/rules.test.ts`
  に追加する。除外の判断にignore fileは読まない

**宣言された範囲**: 宣言側の分岐 — Copilot の `applyTo`、Claude rule の `paths` — は file を path ではなく宣言値で key し、宣言を抽出する recognizer の phase（T265）がこれを所有する。Copilot の path-instruction file の `applyTo` は row を key し、row を key できるものを何も宣言しない file は範囲を持たず null-range row の下に列挙される。 *(2026-08-18修正: Phase 20 が宣言を認識した時点で、出荷済みの挙動として記述し直した。)*

---

## フェーズ 18: Claude Instructions 詳細

**目的**: 完全な literal Claude instruction detail を追加します。 *(2026-08-18修正: この製品は import 参照を一切扱わない — 先送りではなく確定した判断である。この製品は prose 中から参照を読み取らない: Claude Code は `@path` import 構文を文書化しているが、そのtokenがどこで終わるかを定めた公式pageは無く、境界ruleはすべてこの製品自身の発明になり、誤ったruleは読者が書いていない参照を主張することになる。tokenは Codex の場合と同じく source text のままとし、relationship-only registry は import の relation を持たない（T217）。)*

**独立テスト**: repository root と subdirectory の Claude instruction file、および malformed な file を開き、正確な解決済みの値の保持、完全な authored source、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude instruction を選択すると、名指した file を開くことなく、完全で非活性な detail が表示されます。

### テスト先行

- [X] T237 [P] [US2] root および nested の `CLAUDE.md` matching に関する Claude の失敗テストを
  `tests/unit/inspection/rules.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-08修正:
  launch/ancestor/descendant は vendor の runtime working directory との関係を指す語であり、Inspector はそれを観測しない —
  rule はあらゆる深さの `CLAUDE.md` に match し、file 単位の分類はどこにも描画しない（FR-009、T091）。)* *(2026-08-18修正:
  scopeが空になった — T228 が root、`.claude/`、nested の `CLAUDE.md` admission を deterministic provenance と
  near miss 不在まで含めて ship 済みであり、二重の matching suite はその再掲になる。)*
- [X] T238 [P] [US2] 正確なauthored target slice、internal semantic normalization、cycle、boundary
  status、directかつnon-recursiveなrelationship、execution environmentのcapacityだけに従うcomplete
  deterministic relationship retention、target access前のnested/transitive projection拒否、environment
  reference非解決、target read authority 0、relationship、provenance、recognition、その他derived
  outputを一切返さずwhole scan attemptへ変更なしのthrow/rejectionを伝播するdomain
  layerでcatch/classify/retryしないthrow/rejectionに関するClaude importのfailing
  testを`tests/unit/inspection/relationships.test.ts`に追加する *(2026-08-18修正: この製品が import
  参照を扱わないため、authored slice、normalization、boundary status、retention の各半分は主張する対象を持たない。Ship するのは決定そのもの:
  vendor が `@path` を文書化していても Claude instruction file は relationship を出さず、token を開かず、environment
  reference をどこにも解決しない — Codex の場合（T217）と不変の failure doctrine と並べて記録する。)*
- [X] T239 [US2] reciprocal contract reference を持つ Claude instruction runtime-composition graph
  coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [X] T240 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Claude instruction
  detail、import、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを
  `tests/e2e/claude-instructions-detail.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-18修正: この製品が
  import 参照を扱わないため、browser acceptance は import section を持たない。authored token が instructions と完全な
  source を通じて読者に届き、relationship の語彙がどこにも現れないことを証明する。)*

### 実装

- [X] T241 [US2] strategy ID を追加せず、inventory が所有する Claude instruction strategy を、この phase が ship する
  authored import-relationship coverage で `src/shared/registries/runtime-composition.ts` において拡張する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-18修正:
  scopeは空である — contract row は `claude.instructions.layering` を `append` に固定しており shipped record
  は既にそれを持つ。またこの task は strategy ID を追加できない。この製品は import 参照を扱わないため、記録すべき import coverage も無い。T239 が
  record と両言語の row を突き合わせる。)*
- [X] T242 [US2] Exact metadata、complete direct one-hop かつ non-recursive な
  relationship、source-value-free environment-failure Diagnostic、evidence で Claude instruction
  recognition を `src/server/inspection/recognizers/candidate.ts` において拡張する。Relationship target は read
  authority を与えず、nested/transitive projection を access 前に省略する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-18修正:
  scopeは空である — detail が示す `instructions` payload は T222 が ship した1回の Markdown parse と T1093 の range
  であり、T234 が既に Claude 固有の編集を要さないと記録済み。この製品は import 参照を扱わないため、relationship も environment-failure
  Diagnostic も evidence も追加対象が無い。)*
- [X] T243 [US2] Claude instruction parsing、正確な解決済みの値の抽出、complete deterministic direct
  relationship-only import、scratch
  disposalを`src/server/inspection/scan.ts`へ統合する。Parser/relationshipのthrow/rejectionはdomainでcatch/cause分類/retry/item/recognition/relationship/derived
  body/generation化せず変更なしにouter boundaryへ伝播し、targetをrecurse/expand/readしない *(2026-08-18修正: scopeは空である
  — parse、正確な解決済みの値の保持、scratch disposal、変更なしの throw/rejection 伝播は Phase 15/16 が ship 済みで、vendor
  catalog に追加した rule がここを編集せず walk に届くことは T235 が記録済み。この製品は import 参照を扱わないため、統合すべき import が無い。)*
- [X] T244 [US2] typed detail と、英語の Claude instruction relationship message をそのkind自身のdetail
  route（`src/app/pages/` 配下） において拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその
  maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)* *(2026-08-18修正: scopeは空である — detail route はこの kind 自身のもの（T224）で、inventory row
  は既に認識する各 product をそこへ link しており（T236）、T240 が root と nested の Claude file で実際に確認している。この製品は import
  参照を扱わないため、書くべき relationship message が無い。)*

---

## フェーズ 19: Copilot Instructions inventory

**目的**: 正確な七つの Copilot instruction candidate、`copilot.repo.instructions.repository`、`copilot.repo.instructions.repository-cli-context`、`copilot.repo.instructions.path`、`copilot.repo.instructions.path-cli-context`、`copilot.repo.instructions.agents`、`copilot.repo.instructions.claude-root`、`copilot.repo.instructions.gemini-root` を追加します。

**独立テスト**: distinct な root/CLI および surface provenance を持つ正確な七つの ID をすべて inventory 化し、root/CLI repository form、root/CLI path form、`AGENTS.md`、root `CLAUDE.md`、root `GEMINI.md` を検証します。また、正確な `copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` が、hosted input や near miss を admission せずに、追加の標準 location と configured root を拒否することを検証します。

**目に見えるチェックポイント**: Copilot instruction candidate を filter でき、各 product の隣に、それを admit した rule が依拠する surface が見えます。 *(2026-08-19修正: excluded location はどこにも描画されない — それは出荷済み selector がどれも到達しない path であり、除外されたと述べる row ではなく inventory からの不在として現れる。二つの exclusion record はどの surface も描画しない maintenance data である（T251、T259）。)*

### fixture とテストを先行

- [X] T245 [US1] 正確な七つの candidate ID、root/CLI repository/path form、`applyTo`、`AGENTS.md`、root
  `CLAUDE.md`/`GEMINI.md`、shared file、additional-standard location、extra directory、hosted
  input、secret、malformed content、near miss に対する Copilot instruction fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T246 [US1] 正確な七つの Copilot instruction candidate row、origin fileを持たない正確な
  `copilot.behavior.cloud.organization-instructions`
  fact、`copilot.excluded.additional-standard-locations` とその affected behavior である
  `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.instructions.claude`・`copilot.behavior.cli.instructions.claude`・`copilot.behavior.cli.instructions.gemini`
  だけ、`copilot.excluded.extra-directories` とその affected behavior である
  `copilot.behavior.vscode.instructions.path`・`copilot.behavior.vscode.skills`・`copilot.behavior.cli.instructions.agents`・`copilot.behavior.cli.instructions.path`・`copilot.behavior.cli.skills`
  だけを、その composition、relationship、evidence row とともに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-19修正: extra-directories の edge 集合に CLI agents behavior
  が加わった。`COPILOT_CUSTOM_INSTRUCTIONS_DIRS` は `*.instructions.md` に加えて追加の `AGENTS.md`
  も供給するためであり、vendor contract の row も同じ変更で修正した。)*
- [X] T247 [P] [US1] 正確な七つの candidate ID、root-versus-CLI provenance、root alternative、正確な
  additional-standard-location/extra-directory exclusion、hosted candidate なしに関する matcher/recognition
  の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T248 [US1] 決定論的な Copilot instruction candidate、一度の read、isolated failure、rejected-target
  access ゼロに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [X] T249 [US1] Copilot instruction row、surface badge、filter、exclusion、diagnostics、維持される
  Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-inventory.spec.ts` に追加する

### 実装

- [X] T250 [US1] surface-qualified な Copilot instruction/User/Cloud statement を、参照されるすべての base
  local/Cloud layering および managed-remote strategy とともに `src/shared/registries/vendor-behaviors.ts`
  と `src/shared/registries/runtime-composition.ts` に追加し、settings-file authority を与えず production
  registry を閉じたままにする
- [X] T251 [US1] 正確な七つの Copilot instruction candidate record
  を追加し、`copilot.excluded.additional-standard-locations` と `copilot.excluded.extra-directories` だけを
  own する処理を `src/shared/registries/inspection-rules.ts` に実装する
- [X] T252 [US1] `copilot.behavior.cloud.organization-instructions` の existing-source backlink
  を含む、Copilot instruction evidence record と reciprocal affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T253 [US1] `copilot.repo.instructions.repository` と
  `copilot.repo.instructions.repository-cli-context` matching を
  `src/server/inspection/rules/copilot.ts` に実装する
- [X] T254 [US1] `copilot.repo.instructions.path` と `copilot.repo.instructions.path-cli-context`
  matching を `src/server/inspection/rules/copilot.ts` に実装する
- [X] T255 [US1] `copilot.repo.instructions.agents` matching と、正確な
  additional-standard-location/extra-directory rejection を `src/server/inspection/rules/copilot.ts`
  に実装する
- [X] T256 [US1] `copilot.repo.instructions.claude-root` と `copilot.repo.instructions.gemini-root`
  matching を `src/server/inspection/rules/copilot.ts` に実装する
- [X] T257 [US1] hosted location または excluded location を昇格させず、正確な七つの Copilot instruction ID すべてに
  surface-qualified recognition を `src/server/inspection/recognizers/candidate.ts` に実装し、その closed な
  surface identity を session projection と instruction inventory
  DTO（`src/server/session/session.ts`、`src/shared/api-types.ts`）まで運ぶ — tool だけでまとめた行はどの surface
  が認識したかを述べられず、T249 と T259 が要求する badge はその値を推測ではなく読み取る必要がある *(2026-08-17修正: surface は recognizer と
  row では所有されているが、その間のどこでも所有されていないことがレビューで判明したため、wire と projection をここで明記した。)* *(2026-08-18修正:
  recognition の surface は保持せず、それを admit した rule が依拠する behavior から導出する。そのため
  `src/server/inspection/rules/registry.ts` は候補となるすべての class が compile される基底 class に edge
  を宣言し、`src/server/inspection/rules/codex.ts` は自身の derivation にそれを解決する vendor subclass を与える —
  これがなければ、設定済み fallback の行だけがどの surface も名指せない。closed な surface order とその label は、それが属する union の隣である
  `src/shared/registries/behavior-text.ts` に置く（AGENTS.md § User-visible copy policy）。)*
- [X] T258 [US1] configured-root または hosted I/O を行わず、Copilot instruction classification を
  `src/server/inspection/scan.ts` に統合する
- [X] T259 [US1] Copilot instruction の inventory row と、英語の instruction、surface message を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-18修正: exclusion message
  は出荷しない。理由は T236 が既に記録したものと同じで、excluded location は出荷済み selector がどれも到達しない path であり、row
  にはそれについて述べることが何もなく、二つの exclusion record はどの surface も描画しない maintenance data だからである。row が得たのは、各
  product の隣に並ぶ surface である。)*

---

## フェーズ 20: Copilot Instructions 詳細

**目的**: 互換性のない VS Code、CLI、Cloud composition fact を維持しながら完全な literal Copilot instruction detail を追加します。settings-dependent enablement はまったく project しない: どの surface も pending を含む enablement 値を述べず、settings file も読みません。 *(2026-08-19修正: 明示的な pending/unknown enablement 表示は、どの surface も行わない condition projection の語彙である（T091）。)*

**独立テスト**: 対応する Copilot instruction を開き、authored な宣言としての `applyTo` と宣言された row identity としての `applyTo`、settings-file I/O ゼロと enablement 主張なし、発明された general winner なし、正確な解決済みの値、relationship section なし、diagnostics、detail-state cleanup を検証します。 *(2026-08-19修正: 出荷した最終状態に書き直した — enablement・parent discovery・Cloud exclusion はどの detail も project しない registry の事実であり、この kind は relationship を出さない（T261）。)*

**目に見えるチェックポイント**: Copilot instruction を選択すると、別々の surface interpretation が表示されます。

### テスト先行

- [X] T260 [P] [US2] `applyTo` extraction、parent discovery、発明された general winner なしに関する Copilot
  の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する *(2026-08-05 修正:
  どのsurfaceもapplicability・surface condition・condition reasonをprojectしない —
  projectするものが無いため、test・registry拡張・recognizer出力・UI surfaceのいずれもそれを計画しない（T091）。)*
- [X] T261 [P] [US2] 閉じた Copilot field ID、順序付けられた解決済みの値、`applyTo` と reference の target、instruction
  scope、disablement、alternative、hosted/organization fact、environment reference の非解決、target read
  ゼロに関する metadata と relationship の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` と
  `tests/unit/inspection/relationships.test.ts` に追加する *(2026-08-18修正: instruction fileに閉じたfield
  catalogは存在しない — 宣言するものは著者のものであり、FR-007はrowが宣言fieldを列挙することを禁じている —
  ため、metadata側はfileが書いたkeyをその順序で、値を正確に解決した形で表明する。relationship側は不在そのものを表明する:
  Copilotのrelationship-only ruleはどれもinstruction fileを起点にしないため、projectすべきedge・target・boundary
  statusは存在しない（T217、T238）。)*
- [X] T262 [US2] reciprocal contract reference を持つ Copilot instruction runtime-composition graph
  coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [X] T263 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Copilot instruction detail、relationship
  section なし、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを
  `tests/e2e/copilot-instructions-detail.spec.ts` に追加する *(2026-08-05 修正:
  どのsurfaceもapplicability・surface condition・condition reasonをprojectしない —
  projectするものが無いため、test・registry拡張・recognizer出力・UI surfaceのいずれもそれを計画しない（T091）。)*

### 実装

- [X] T264 [US2] strategy ID や settings behavior reference を追加せず、inventory が所有する Copilot instruction
  strategy を、この phase が ship する authored relationship coverage で
  `src/shared/registries/runtime-composition.ts` において拡張する *(2026-08-05 修正:
  どのsurfaceもapplicability・surface condition・condition reasonをprojectしない —
  projectするものが無いため、test・registry拡張・recognizer出力・UI surfaceのいずれもそれを計画しない（T091）。)* *(2026-08-18修正:
  scopeを空にした — T250が、contract rowが固定する完全なbehavior集合とともに三つのsurface layeringを出荷しており、この phase
  はinstruction fileが持つauthored relationshipを出荷せず、このtaskはstrategy
  IDを追加できない。T262が出荷済みの各recordをその規範rowと両言語で照合する。)*
- [X] T265 [US2] file が書く宣言 key、relationship、diagnostics、evidence で Copilot recognition を
  `src/server/inspection/recognizers/candidate.ts` において拡張する *(2026-08-05 修正:
  どのsurfaceもapplicability・surface condition・condition reasonをprojectしない —
  projectするものが無いため、test・registry拡張・recognizer出力・UI surfaceのいずれもそれを計画しない（T091）。)* *(2026-08-18修正:
  このtaskが出荷するのは、Phase 17bがこのtaskに残した宣言範囲の分岐である — Copilotのpath-instruction
  fileの`applyTo`が、pathではなくinventory rowをkeyする（spec.md § Clarifications）。宣言はcompiled instruction
  unitを通じて答えに届く。そこは、自身のfileが担当する対象についての製品自身のruleが既に置かれている場所であり、したがって`src/server/inspection/rules/copilot.ts`と`src/server/inspection/rules/registry.ts`の共有された問いがそれを担う。公開されるkey自体は変更を要さなかった:
  一度のMarkdown parseが、fileの書いたkeyのままにすべての宣言を既に公開している（T222） rowをkeyできるものを何も宣言しないpath-instruction
  fileは範囲を持たない — VS Codeは宣言のないfileを自動適用しないとdocumentしている — ため、pathから読み取った範囲ではなくnull-range
  rowの下に列挙される（userレビュー、2026-08-19）。)*
- [X] T266 [US2] Copilot instruction parsing、正確な解決済みの値の抽出、inert relationship、完全な authored source
  を保持しつつ行う parser scratch/transient-semantic disposal、settings-file I/O ゼロを
  `src/server/inspection/scan.ts` に統合する *(2026-08-18修正: scopeを空にした — Phase
  15/16がparse、正確な解決済みの値の保持、scratch disposal、throw/rejectionのそのままの伝播を出荷済みであり、vendor
  catalogに追加されたruleはここを編集せずともwalkに届く（T235）。この phase はrelationshipを出さず、scanがsettings
  fileを読むためのsettings ruleも出荷されていない。)*
- [X] T267 [US2] typed detail と英語の Copilot instruction surface を、そのkind自身のdetail
  route（`src/app/pages/` 配下）において拡張する *(2026-08-05 修正: どのsurfaceもapplicability・surface
  condition・condition reasonをprojectしない — projectするものが無いため、test・registry拡張・recognizer出力・UI
  surfaceのいずれもそれを計画しない（T091）。)* *(2026-08-18修正: detail
  routeはこのkind自身のものであり（T224）、認識した各productを、それをadmitしたruleが依拠するsurfaceとともに既に描画している。これはT257が共有projectionに加えたものである
  — Copilotのdetailがsurfaceごとの解釈を分けて示すのは、独自のrouteによってではなくその理由による。relationship
  messageは出荷せず（T261）、`applyTo`宣言はauthoredな宣言そのものとして描画される。)*

---

## フェーズ 21: 統合 Instructions inventory

**目的**: 明示的な shared-file matrix とともに、priority wave の instruction baseline を統合します。`AGENTS.md` は Codex+Copilot、root `CLAUDE.md` は Claude+Copilot、nested `CLAUDE.md` は Claude-only — 設定済み Codex fallback は Repository root で突き合わせる entry 名であり、nested な file がそれになることはない — 、`CLAUDE.local.md` は Claude-only です。

*(2026-08-17修正: フェーズ 15 が configured fallback を有効化するため、このフェーズの matrix はそれを含み、ここで carrier を待つものは無い。)*

**独立テスト**: all-vendor instruction fixtureを使用し、正確なshared-file matrix、受け入れ済みfileごとの一つの物理item/read、別々のrecognition/provenance、nested `CLAUDE.md`のfilename-based Codex promotionなし、configured fallback recognition、決定論的なorder、filter、fileに閉じたfailureのpartial continuity、rescan cleanupを検証する。

**目に見えるチェックポイント**: 完全な静的 instruction inventory、すべての shared-file interpretation、およびフェーズ 15 が有効化した configured fallback integration を理解できます。

### テスト先行

- [X] T268 [US1] `AGENTS.md` Codex+Copilot、root `CLAUDE.md` Claude+Copilot、nested `CLAUDE.md`
  Claude-only と configured-fallback variant、Claude-only `CLAUDE.local.md`、その他すべての selector、決定論的な
  failure、secret、exclusion、注入した throw/rejected-operation failure case を持つ all-vendor instruction
  fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [X] T269 [P] [US1] 登録済みのすべての静的 instruction selector と exclusion、識別のみの derived fallback rule、正確な
  `AGENTS.md`/root `CLAUDE.md`/nested `CLAUDE.md`/`CLAUDE.local.md` recognition matrix に関する完全な
  conformance test を `tests/contract/inspection-rules.test.ts` に追加する
- [X] T270 [P] [US1] 一度だけ読み取るshared-file assembly、正確なrecognition matrix、どの構成も名指さない nested
  `CLAUDE.md` に対するCodex recognitionゼロ、決定論的なprovenanceとraw-path order、atomic
  continuity、完全なtraversal後のfileに閉じたfailureだけによるpartial publication、whole attemptをfatalにしてnew
  generation、item、record、response、derived resultを作らずprior committed snapshotだけを保持するdomain
  layerでcatch/classify/retryしないfileに閉じないfailure、およびconfig/rejected-target
  accessゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T271 [P] [US1] source/tool/kind/path filter、shared recognition badge、configured fallback
  行、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [X] T272 [US1] unified instruction inventory、filter、shared recognition、configured fallback
  行、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/instructions-inventory.spec.ts`
  に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

### 実装

- [X] T273 [US1] filename inference を行わず、正確な shared-file matrix に対する決定論的な physical-file assembly
  を完成させ、フェーズ 15 の検証済みの導出を通じてのみ独立した configured-fallback Codex provenance を受け入れる処理を
  `src/server/inspection/scan.ts` に実装する *(2026-08-19修正: 編集なしで充足 — フェーズ 15 の二段階構成が既に全 vendor の
  catalog と configured derivation を一つの walk で実行しており、T270 の matrix suite が出荷済みの module に対してそれを証明する。)*
- [X] T274 [US1] instruction kind、shared recognition、configured fallback 行に対する inventory filter と
  row を `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow
  component（`src/app/components/inventory/rows/`） で完成させる *(2026-08-19修正: 編集なしで充足し、有効化済み fallback
  に合わせて再記述 — フェーズ 15 がそれを有効化する（2026-08-17）ため、fallback 行は通常の instruction 行であり surface
  が示すべき待機状態は存在しない。出荷済みの filter と `InstructionRow.vue` が既にこの kind、shared
  recognition、これらの行を描画しており、T271/T272 がそれを証明する。)* *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*
- [X] T275 [US1] 英語の unified instruction inventory、shared-recognition、fallback、exclusion message
  をそれらを描画する Vue component に追加する *(2026-08-19修正: 編集なしで充足 — unified inventory が描画するすべての message を出荷済み
  component が既に持ち、追加すべき exclusion message は存在しない: T236 が確定したとおり、未対応の location はどの selector も到達しない
  path であり、row が述べるべきことは無い。)*

---

## フェーズ 22: Instructions 比較

**目的**: skill 比較の前例に倣い、literal および typed な instruction difference を備えた instruction kind 自身の比較サーフェスを設計します。

**独立テスト**: Readableなcurrent-generation instruction fileを正確に2つ比較し、correctness claimやenvironment-reference resolutionを行わず、完全なauthored sourceと両sideのcanonical serialized frontmatter document、relationship differenceを検証する。

**目に見えるチェックポイント**: 二つの instruction file を比較し、構造上の difference を理解できます。

### テスト先行

- [X] T276 [US3] semantic correctness claim を行わず、正確に二つの FileDetail input、canonical serialized
  frontmatter document、捏造された relationship row が存在しないことに関する instruction comparison の回帰失敗テストを
  `tests/unit/app/instruction-comparison.test.ts` に追加する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-19修正: 確立済みの relationship model に合わせて再記述 — instruction
  file は edge を一切公開しない（T217/T238、api-types.ts § FileDetailDto）ため、relationship についてこの suite が証明するのは
  comparison が何も捏造しないことである。)* *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical YAML
  document（skillは`name`と`description`を先頭に、他は全keyをsort順）としてMonacoでdiffし、tool
  recognitionはその横にtypedなrowとして並べる（frontmatter-yaml.ts）。)*
- [X] T277 [US3] credential/environment-reference difference を含む完全な literal instruction
  diff、canonical serialized declaration document、masking/reveal または environment substitution
  なし、typed layering/fallback difference に関するブラウザー受け入れテストを
  `tests/e2e/instructions-comparison.spec.ts` に追加する *(amended 2026-08-21: acceptanceは両sideのcanonical
  serialized documentがMonacoでdiffされることを検証する。全kindの宣言済みmetadata比較が取る形である（research.md § 7）。)*

### 実装

- [X] T278 [US3] instruction comparisonが各sideの宣言済みmetadataを1つのcanonical
  documentへserializeしてMonacoでdiffし、typed layering/fallback state を分離したままにするよう
  `src/app/components/instruction-comparison/RecognitionComparison.vue`（skill の前例 —
  `src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`
  — に倣ってこの task が設計・作成する、その kind 自身の比較サーフェスの一部。そこへ到達する entry link — その kind の inventory row
  component（`src/app/components/inventory/rows/` 配下）と、その kind の detail route（`src/app/pages/` 配下） —
  も、skill における T203 と同様にこの task が所有する） を拡張する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-19修正: この task が作成した surface は
  `src/app/pages/instructions/compare/[family].vue`、`src/app/composables/instruction-comparison.ts`、`src/app/components/instruction-comparison/`（`RecognitionComparison.vue`、`SourceDiff.vue`、`recognition-comparison.ts`）である
  — 各 file が所有 task へ解決できるようここに列挙する。)* *(2026-08-27修正: ペアを所有するのは、1つの範囲が1つのSource
  familyに対して保持するblockである。したがって両sideはconsentされた2つのhomeのfileでありうるが、2つのfamilyにまたがることはない。addressの先頭に立つのはfamilyであり、各sideは自身のSourceを名乗る。)*
  *(2026-08-19修正: ペアは1つのapplicability-range行のもの —
  出荷済みサーフェスのrangeを跨ぐ自由なペアはskillの前例が確立した「行が所有するペア」modelと矛盾するため、URL検証は単一の行が保持しないペアを報告し、pickerは所有行のfileの中だけで両側を動かす。)*
  *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有 module は存在せず、そのサーフェスの設計・作成は skill
  の前例に倣ってこの task が担う（spec.md § Clarifications Session 2026-08-14）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical YAML
  document（skillは`name`と`description`を先頭に、他は全keyをsort順）としてMonacoでdiffし、tool
  recognitionはその横にtypedなrowとして並べる（frontmatter-yaml.ts）。)*
- [X] T279 [US3] 英語の instruction comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 23: Codex MCP 内包宣言

**目的**: `.codex/config.toml` carrier をこのフェーズで初めて受け入れ（`codex.repo.config`）— その最初で唯一の candidacy であり、この carrier 自身の source text をどの surface にも出さないという決定を守りつつ — MCP row の detail は file の byte ではなく、file が書いた key による宣言を公開する（FR-007） — Codex の内包 MCP recognition を関連付け、各 row が宣言元の carrier を名指す形で内包宣言インベントリを公開します。完全な MCP detail はまだ出荷せず、その detail への link はフェーズ 24 が所有する route と response とともに到着します（T301/T302）。 *(2026-08-17修正: fallback の有効化はフェーズ 15 へ移動し、そこでは carrier を構成として読むだけで受理しない。carrier の最初の candidacy はこのフェーズのものである。)*

**独立テスト**: 名前付きサーバー、重複、フィールド欠落、不正なテーブル、不正なコマンド、シークレット、standalone MCP のニアミスを含む carrier を検査し、carrier がちょうど一度だけ admit され MCP recognition が関連付くこと、`[mcp_servers.*]` 宣言ごとに 1 行、owner-file identity、合成 MCP file がないこと、standalone MCP candidate がないこと、生ソース表示がないこと、instructions/fallback 行が変わらないこと、接続ゼロを検証します。

**目に見えるチェックポイント**: 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングできます。フェーズ 15 の instructions と configured fallback は変わらず、`.codex/config.toml` 自身は生表示されないままで、完全な MCP detail はフェーズ 24 で到着します。

### フィクスチャとテストを先に

- [X] T280 [US1] Codex carrier fixture を、名前付き MCP server、重複、不正な table、不正な command、secret、agent
  inheritance reference、standalone near miss、plugin relationship で
  `tests/fixtures/repositories/build-fixtures.ts` において拡張する
- [X] T281 [US1] `codex.behavior.repo.mcp`、内包 MCP recognition、selection、relationship、reciprocal
  evidence row、path-negative な standalone/plugin/User/managed case を、`codex.repo.config`
  をあわせて具体化し、`codex.excluded.plugin-files`・MCP exclusion ID なしに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T282 [P] [US1] このフェーズの `codex.repo.config` 登録が carrier の最初で唯一の candidacy
  であること、`codex.derived.fallback-basename` はフェーズ 15 の所有のままであること、重複 candidate や読み取りが現れないこと、standalone
  Codex MCP candidate や plugin/User/managed の昇格がないことを証明する失敗する registry/matcher regression を
  `tests/unit/inspection/rules.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [X] T283 [P] [US1] Codex MCP が受け入れ済み carrier に関連付くこと — `(file, tool, kind)` ごとに 1
  recognition、宣言ごとに 1 行、決定論的な provenance — を、instruction・fallback recognition
  が変わらないまま、欠落または不正な宣言をアトミックに省略しつつ証明する失敗する recognition test を
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T284 [US1] Codex 内包 MCP row、各 row の owner-carrier identity（carrier の detail への link はフェーズ 24
  とともに到着する。T301/T302）、変わらない instruction/fallback 行、filter、path-negative な standalone/plugin
  case、diagnostics、connection control がないことを対象とするブラウザー受け入れテストを
  `tests/e2e/codex-mcp-inventory.spec.ts` に追加する

### 実装

- [X] T285 [US1] Codex MCP/config-contained Hook behavior statement を、完全な base MCP lookup/owner
  strategy record とその reciprocal evidence citation とともに追加し、フェーズ 15 の carrier fact を再利用して Hook
  candidate・standalone MCP・connection authority を与えず、`src/shared/registries/vendor-behaviors.ts` と
  `src/shared/registries/runtime-composition.ts` に追加する
- [X] T286 [US1] `codex.repo.config` をアトミックに追加し、フェーズ 15 の derivation
  を再利用して、`codex.excluded.plugin-files` を早期所有せずに standalone/plugin/User/managed path を negative
  のまま保ち、contained declaration には relationship record だけを `src/shared/registries/codex/relations.ts`
  と `src/shared/registries/inspection-rules.ts` に追加する
- [X] T287 [US1] Codex MCP と読み取り権限を付与しない contained-Hook fact の evidence と reciprocal
  affected-contract reference を 対象registry recordの`evidence` citation に追加する
- [X] T288 [US1] standalone MCP rejection と contained-declaration classification を
  `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T289 [US1] フェーズ 15 の TOML 抽出を `[mcp_servers.*]` の解決済みの値と内部 semantic normalization で拡張し、一つの検証済み
  config file に決定論的な provenance で MCP recognition を関連付け、synthetic candidate を作成しない処理を
  `src/server/inspection/parsers/toml.ts` と `src/server/inspection/scan.ts` に実装する
- [X] T290 [US1] MCP インベントリを端から端まで公開する — 宣言ごとの row DTO とその session projection を
  `src/shared/api-types.ts` と `src/server/session/session.ts` に、導出と件数を
  `src/app/composables/filters.ts` に、tab panel の分岐を `src/app/components/inventory/InventoryList.vue`
  に、総数を `src/app/pages/index.vue` に — うえで、MCP インベントリのフィルターと内包所有者の要約を
  `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-17修正: 各 kind の row が row component
  でしか所有されておらず、snapshot からそこへ届く経路が無いことがレビューで判明したため、中央の kind 分岐経路をここで明記した。)* *(2026-08-19改訂:
  rowの単位は宣言されたserver名である —
  1つの名前を解決するすべての宣言が、carrierとtoolを跨いでその名前のrowの中に列挙され、nameがnullのrowがnamed宣言を公開していないcarrierを保持する。)*
- [X] T291 [US1] 英語の Codex 内包 MCP、所有者、スキーマ、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 24: Codex MCP の詳細

**目的**: 一般 configuration の表示はフェーズ 58 まで保留しつつ、最小 Codex carrier を完全な literal MCP detail と zero-connection behavior で拡張します。

**独立テスト**: 内包されたCodex declarationを開き、duplicate server name、parent/agent inheritance relationship、正確な解決済みの値の保持、diagnostic、禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/auth/probing request 0件、command/expansion/referenced read 0件を検証し、exactな2つのFR-022 authorized internal loopback HTTP classを別に分類する。

**目に見えるチェックポイント**: Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。

### テストを先に

- [X] T292 [P] [US2] named、inline、ancestor、plugin、runtime-only の reference に加え、フェーズ 50 より前には
  unresolved behavior backlink、connection、target promotion を持たない純粋な dormant agent-inheritance
  adapter に関する失敗する MCP schema test を `tests/unit/inspection/relationships.test.ts` に追加する
- [X] T293 [P] [US2] active project-config precedence、duplicate name、有効になった fallback provenance、一般
  config presentation がないことに関する失敗する Codex carrier/MCP test を
  `tests/unit/inspection/codex-metadata.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T294 [P] [US2] Exactな2つのFR-022 authorized internal loopback HTTP classを別に分類し、Codex MCP
  inspectionが禁止対象またはcustomization-selectedなDNS/socket/HTTP/MCP/authentication/probing
  request、command execution、expansion、plugin load、referenced-file readを発生させないことを証明するzero-connection
  testを`tests/integration/security/zero-activation.test.ts`へ追加する
- [X] T295 [P] [US2] carrier が書いた key による、parser の resolved order での解決済みの
  command・URL・header・environment field/reference、carrier の source text がどの response にも現れないこと（file の
  byte ではなく宣言を運ぶ detail が証明すべきこと。FR-007）、owner provenance、diagnostics、process-environment
  substitution なし、stale ID に関する Codex MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts`
  に追加する *(2026-08-06 修正: allowlist row が宣言を順序付けることも condition が project されることも無い — 宣言集合は carrier
  自身のものであり、allowlist が gate するのは relationship kind である（FR-007、T091）。)* *(2026-08-19改訂:
  carrierのdetailは`FileDetail`のvariantではなく、専用の`get-mcp-carrier-detail` functionと`McpCarrierDetail`
  DTOになった — sourceをserveするfunctionはsourceを差し控えるvariantを持たず、そこへのcarrier
  pathは通常の`stale-resource`である。)* *(2026-08-20修正: 宣言はparserのresolved orderでpublishする。Plain
  objectはinteger-likeなkeyをplatformの数値順で列挙し、これはJavaScriptの性質として受け入れ、構文木の再parseで回避しない。contracts/http-api.md
  § get-mcp-carrier-detailは順序をparserのものとして既に記載している。)*
- [X] T296 [US2] reciprocal contract reference を備えた Codex carrier、instruction-fallback、MCP
  runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [X] T297 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Codex MCP detail（生 source
  を表示しないこと。FR-007）、diagnostics、owner navigation、zero-connection behavior に関するブラウザー受け入れテストを
  `tests/e2e/codex-mcp-detail.spec.ts` に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

### 実装

- [X] T298 [US2] strategy ID や premature agent behavior reference を追加せず、inventory が所有する Codex MCP
  strategy を、closed dormant agent-inheritance adapter で
  `src/shared/registries/runtime-composition.ts` において拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T299 [US2] Codex active-config MCP precedence、trust、duplicate、provenance metadata、を
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T300 [US2] 各宣言の field を file が書いた key で、各値を parser の解決結果のまま（`DeclaredEntryDto`）publish する TOML
  extraction — closed な field-ID catalog は持たない。authored な key 集合は閉じていないからである（FR-007） —
  を、recognition-atomic failure と source value を含まない diagnostics とともに
  `src/server/inspection/parsers/toml.ts` において拡張する *(2026-08-20修正: closedなMCP field-ID
  catalogは存在しない: authoredなkey集合は閉じておらず（FR-007）、宣言はfileが書いたkeyによる`DeclaredEntryDto`
  entryとして、各値をparserの解決結果のままpublishする。)*
- [X] T301 [US2] Codex MCP の正確な解決済みの値の抽出と diagnostics を `src/server/inspection/scan.ts` に統合し、carrier
  自身の detail — `get-mcp-carrier-detail` の `McpCarrierDetail` result: file が書いた key による宣言、file
  としての事実、`sourceText` field を一切持たないこと（FR-007、contracts/http-api.ja.md § get-mcp-carrier-detail） — を
  `src/shared/api-types.ts` と `src/server/session/session.ts` から公開する *(2026-08-17修正: carrier の
  no-source 規則を test task だけが所有し、実装側の所有が無いことがレビューで判明したため、detail variant とその projection をここで明記した。)*
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-19改訂:
  carrierのdetailは`FileDetail`のvariantではなく、専用の`get-mcp-carrier-detail` functionと`McpCarrierDetail`
  DTOになった — sourceをserveするfunctionはsourceを差し控えるvariantを持たず、そこへのcarrier
  pathは通常の`stale-resource`である。)* *(2026-08-20修正: 2026-08-19注記が記録する専用carrier-detail決定に本文を整合。)*
  *(2026-08-20修正: このtaskのscopeにselection projectionは含まれない —
  projectするsurfaceが無いためである（T091。2026-08-06注記のとおり）。)* *(amended 2026-08-20: このreleaseにはどのvendorにもMCP
  relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T302 [US2] サーバー、トランスポート、所有者スコープに対応する型付き Codex MCP 詳細をそのkind自身のdetail route（`src/app/pages/`
  配下） で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-21:
  各declarationはJSONへserializeする。JSON
  carrierのentryがserver名の下に持つvalueだからである。detailも各declarationを同じdocumentとしてauthored順で表示する。)*
- [X] T303 [US2] 英語の Codex MCP の所有者とスキーマのメッセージをそれらを描画する Vue component に追加する *(2026-08-08修正: detail は
  file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 25: Claude MCP ファイルのインベントリ

**目的**: ルートにある正確な Claude `.mcp.json` の独立物理候補を追加する。

**独立テスト**: ルートの `.mcp.json` だけをインベントリに含め、子孫を Claude 候補として拒否し、将来の Copilot との共有を維持しながら、User 状態、コネクター、managed 設定、リンク、ニアミス、内包宣言が独立ファイルとして扱われないことを検証する。

**目に見えるチェックポイント**: ユーザーは、Claude プロジェクト MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T304 [US1] ルート、子孫、不正な JSON、不正なコマンド、シークレット、リンク、User/plugin/connector/managed 状態、内包宣言、ニアミスを対象とする
  Claude MCP ファイルのフィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T305 [US1] Claude MCP-file behavior、読み取り権限を付与しない
  `claude.behavior.user.mcp-state`、`claude.behavior.repo.agents`、`claude.behavior.repo.plugin`、`claude.behavior.user.plugins`
  fact、正確な candidate、selection、relationship、path-negative な plugin/User/connector/managed
  caseを、`claude.excluded.plugin-files` を作成せずに reciprocal evidence row とともに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T306 [P] [US1] 正確なルート `claude.repo.mcp`、descendant/User/plugin/connector/managed
  の拒否、独立スキーマの来歴に対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T307 [US1] Claude MCP ファイル行、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを
  `tests/e2e/claude-mcp-files-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T308 [US1] Claude MCP-file/User/owner behavior statement を、完全な base replacement および
  owner-strategy record とともに `src/shared/registries/vendor-behaviors.ts` と
  `src/shared/registries/runtime-composition.ts` に追加し、未 admission の owner に candidate authority または
  connection authority を与えず production registry を閉じたままにする
- [X] T309 [US1] 正確な Claude MCP candidate を追加し、`claude.excluded.plugin-files` を早期所有せず、新しい MCP
  exclusion ID も作成せずに plugin/User/connector/managed location を path-negative のまま保つ処理を
  `src/shared/registries/inspection-rules.ts` に追加する
- [X] T310 [US1] Claude MCP-file evidence に加え、このフェーズで所有する読み取り権限を付与しない四つの MCP-dependent behavior fact
  すべての reciprocal backlink を 対象registry recordの`evidence` citation に追加する
- [X] T311 [US1] Claude のルートと完全一致する `.mcp.json` のマッチングとパス由来の認識を
  `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T312 [US1] Claude MCP ファイルの分類を統合し、後続の共有認識に備えて物理的な同一性を `src/server/inspection/scan.ts` で維持する
- [X] T313 [US1] MCP インベントリ行と、英語の Claude ファイル、スキーマ、除外メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 26: Claude MCP ファイルの詳細

**目的**: 独立 Claude `.mcp.json` の完全な literal 詳細を追加する。

**独立テスト**: 不正なルートファイルを開き、正確な解決済みの値の保持、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。

### テストを先に

- [X] T314 [P] [US2] local→project→User→plugin→connector のエントリ全体の置換と、relative なコマンド/引数値が resolution
  base を join されず authored literal のまま公開されること — それを確立する cited page は無い — について、失敗する Claude MCP テストを
  `tests/unit/inspection/claude-metadata.test.ts` に追加する *(2026-08-20修正: 現行の公式pageはrelative
  command/argsのresolution baseを確立しない — vendor contractがそのgapを記録する — ため、coverageはauthored
  literalがbaseを結合されずに公開されることを検証する（FR-009）。)*
- [X] T315 [P] [US2] Claude ファイルのサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、コネクター状態、参照ファイルを対象とするゼロ接続テストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T316 [P] [US2] file が書いた key による、parser の resolved order での解決済み宣言、carrier の source text がどの
  response にも現れないこと（FR-007）、environment-reference substitution なし、diagnostics、stale ID に関する Claude
  MCP-file detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する *(2026-08-06 修正:
  allowlist rowが宣言を順序付けたり列挙したりすることは無い —
  宣言集合はcarrier自身のものであり、書かれたkeyで公開され、allowlistがgateするのはrelationship
  kindである（FR-007）。どのsurfaceもconditionとapplicabilityをprojectしない（T091）。)* *(2026-08-20修正: 宣言はparserのresolved
  orderでpublishする。Plain
  objectはinteger-likeなkeyをplatformの数値順で列挙し、これはJavaScriptの性質として受け入れ、構文木の再parseで回避しない。contracts/http-api.md
  § get-mcp-carrier-detailは順序をparserのものとして既に記載している。)* *(amended 2026-08-20: このreleaseにはどのvendorにもMCP
  relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T317 [US2] 相互の契約参照を備えた、失敗する Claude MCP ファイルの runtime-composition グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T318 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Claude MCP-file detail（生 source
  を表示しないこと。FR-007）、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを
  `tests/e2e/claude-mcp-files-detail.spec.ts` に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

### 実装

- [X] T319 [US2] strategy ID を追加せず、inventory が所有する Claude MCP strategy を
  `src/shared/registries/runtime-composition.ts` において拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T320 [US2] エントリ全体の置換を備え、relative なコマンド/引数値を resolution base を join せず authored literal のまま公開する
  Claude MCP ファイルのメタデータを `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-20修正:
  現行の公式pageはrelative command/argsのresolution baseを確立しない — vendor contractがそのgapを記録する —
  ため、coverageはauthored literalがbaseを結合されずに公開されることを検証する（FR-009）。)*
- [X] T321 [US2] 各宣言の field を file が書いた key で、各値を parser の解決結果のまま（`DeclaredEntryDto`）publish する
  inert strict-JSON extraction — closed な field-ID catalog は持たない。authored な key
  集合は閉じていないからである（FR-007） — を、Inspector固有の数値上限を設けないenvironment-owned parser
  capacityで実装する。File-confinedなparse throwはextraction boundaryがそのrecognitionの`failed`状態に閉じ込め、partial
  generation内で`recognition-parse-failed`
  Diagnosticを付し（FR-028）、recognition-atomicかつsource-value-freeとする。File-confinedなpath外のthrow/rejectionだけをcatch、cause
  classification、retry、recovered
  result、Diagnostic、generationなしに変更なく伝播させる処理を`src/server/inspection/parsers/json.ts`へ実装する
  *(2026-08-20修正: closedなMCP field-ID catalogは存在しない:
  authoredなkey集合は閉じておらず（FR-007）、宣言はfileが書いたkeyによる`DeclaredEntryDto`
  entryとして、各値をparserの解決結果のままpublishする。)* *(2026-08-20修正: 出荷済みのfailure doctrineに整合 —
  file-confinedなparse throwはextraction boundaryがそのrecognitionの`failed`状態に閉じ込め、partial
  generation内で`recognition-parse-failed`
  Diagnosticを付す（FR-028）。file-confinedなpath外のthrowだけがcatch・Diagnostic・generationなしに変更なく伝播する。)*
- [X] T322 [US2] Claude MCP-file の正確な解決済みの値の保持と diagnostics を `src/server/inspection/scan.ts` に統合する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-20修正:
  このtaskのscopeにselection projectionは含まれない — projectするsurfaceが無いためである（T091。2026-08-06注記のとおり）。)*
  *(amended 2026-08-20: このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T323 [US2] 型付き詳細と、英語の Claude MCP メッセージをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 27: Claude 明示的carrier MCP境界

**目的**: Claude root carrierに対する明示的carrier境界を証明します: owner-adapter機構は存在せず、`mcpServers` を綴る skill frontmatter は MCP recognition を得ません（Claude はそのような skill field を文書化していない）。 *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter referenceとchangelogはinline `mcpServers`をagentに置き、skill folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: `mcpServers` を綴る skill が正確に skill のままであること — そのfrontmatterは自身のdetail contentである — 、他kindのMCP-spelling fileにowner機構・candidate・recognitionが存在しないこと、synthetic file が現れないこと、記述されたすべての値が literal のままであること、すべての path で zero connection が成り立つことを検証します。 *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter referenceとchangelogはinline `mcpServers`をagentに置き、skill folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)*

**目に見えるチェックポイント**: frontmatter に `mcpServers` を綴る skill は、その frontmatter を自身の skill detail に表示し、MCP インベントリには何も寄与しません — これはすべてのkindに適用される恒久ruleであり、待機状態ではありません。 *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter referenceとchangelogはinline `mcpServers`をagentに置き、skill folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)*

### テストを先に

- [X] T324 [P] [US2] Claude の MCP 読み取りテスト — named/inline server と不正 field を対象とする、declared-entry 上の
  pure reader — と、skill の negative（`mcpServers` を綴る skill は skill recognition だけを保ち、値は literal のまま）を
  `tests/unit/inspection/claude-metadata.test.ts` に追加する *(2026-08-20修正:
  Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)*
- [X] T325 [P] [US2] MCP recognitionが明示的carrierだけから生まれることを証明する recognition test — `mcpServers` を綴る
  skill はどの tool の MCP recognition も得ず、unadmittedなMCP-spelling fileはkindを問わず何も生まず、plugin target
  を読み取らない — を `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-20修正:
  Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T326 [P] [US2] Claude の carrier と `mcpServers` を綴る skill — コネクター、コマンド、URL、ヘッダー、環境、参照パス —
  を対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する *(2026-08-20修正:
  Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)*
- [X] T327 [US2] 他kindのMCP-spelling fileが自身の registry surface を持たないこと — skill rule の edge は skill
  のもののまま — と、unresolved registry reference や read authority がないことを
  `tests/contract/runtime-composition.test.ts` で証明する composition-graph coverage を追加する
  *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T328 [US2] `mcpServers` を綴る skill が MCP インベントリに何も寄与せず、その frontmatter — credential を含む — が自身の
  skill detail の下で literal に serve されること、未 admission owner family の row がないこと、zero-connection
  behavior をブラウザーで受け入れ検証するテストを `tests/e2e/claude-skill-mcp-frontmatter.spec.ts` に追加する
  *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)*

### 実装

- [X] T329 [US2] 明示的carrier向けに Claude MCP strategy を `src/shared/registries/runtime-composition.ts`
  で拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T330 [US2] Scopeを空にした: contained-MCP adapter dispatchは存在しない — 明示的carrierがMCP
  kindの唯一のrecognitionである（`src/server/inspection/recognizers/candidate.ts`） *(2026-08-20修正:
  Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T331 [US2] 全detailが描画する共有declared-entry shapeとして frontmatter extraction の解決済みの値を保つ —
  MCP-spelling keyも通常の宣言contentとして含む —
  （`src/server/inspection/parsers/json.ts`、`src/server/inspection/parsers/markdown.ts`）
  *(2026-08-20修正: Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-21: scalarはrendered textの横にparsed
  kind（`DeclaredScalarKind`）を公開する: raw解決値はJSON
  wireに載せられず（`NaN`、infinity、TOMLの64bit整数）、kindとtextの組がその正確なJSON-safe
  encodingである。serializerはrenderingからの推測ではなくkindで綴る。renderingはauthoredな`'7'`
  stringと数値`7`を区別できないからである。)*
- [X] T332 [US2] 明示的carrierを一度だけ読み取る recognition、正確な解決済みの値の抽出、diagnostics を
  `src/server/inspection/scan.ts` に統合する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T333 [US2] MCP detail route を恒久的に owner navigation なしに保つ — owner familyがMCP surfaceに合流することはない
  — 処理をそのkind自身のdetail route（`src/app/pages/` 配下）で行う *(2026-08-20修正:
  Claudeは`mcpServers`というskill-frontmatter fieldを文書化していない（skillsページのfrontmatter
  referenceとchangelogはinline `mcpServers`をagentに置き、skill
  folderのMCPはplugin機構だけが運ぶ）ため、出荷adapter集合からskill ownerを除去した: このkeyを綴るskillはMCP
  recognitionを得ず、そのfrontmatterは自身のkindの下で通常のskill contentとしてserveされる。)* *(2026-08-08修正: detail は
  file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

---

## フェーズ 28: Copilot CLI MCP ファイルのインベントリ

**目的**: Copilot CLI のルート限定の `.mcp.json` と `.github/mcp.json` を候補として追加する。 *(2026-08-20修正: root-exact — CLIの文書化された上方向walkですべてのsessionが共有する終端はGit rootの1つだけなので、サブディレクトリのcarrierはこの製品が選択しないruntime-chainのメンバーでありニアミスとなる。同じ変更で`copilot.repo.mcp`のcontract行を修正した。)*

**独立テスト**: ルートの 2 つの CLI コンテキストファイルをインベントリに含め、サブディレクトリの carrier、追加スキーマ、User 設定、セッション追加、プラグイン対象、hosted 状態、リンク、ニアミスを拒否し、正確な runtime-chain/trust の不確実性を維持する。 *(2026-08-20修正: root-exact — CLIの文書化された上方向walkですべてのsessionが共有する終端はGit rootの1つだけなので、サブディレクトリのcarrierはこの製品が選択しないruntime-chainのメンバーでありニアミスとなる。同じ変更で`copilot.repo.mcp`のcontract行を修正した。)*

**目に見えるチェックポイント**: ユーザーは、Copilot CLI MCP ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T334 [US1] ルートの `.mcp.json` と `.github/mcp.json`、重複、不正な
  JSON、不正なコマンド、シークレット、リンク、User/session/plugin/hosted 状態、サブディレクトリの carrier を含むニアミスを対象とする Copilot CLI
  MCP フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-20修正: root-exact —
  CLIの文書化された上方向walkですべてのsessionが共有する終端はGit
  rootの1つだけなので、サブディレクトリのcarrierはこの製品が選択しないruntime-chainのメンバーでありニアミスとなる。同じ変更で`copilot.repo.mcp`のcontract行を修正した。)*
- [X] T335 [US1] Copilot CLI MCP の振る舞い、`copilot.repo.mcp`、選択、除外 ID を持たずパス不一致となる
  User/session/hosted/configured ケース、relationship-only のプラグインパス、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T336 [P] [US1] root-exact な両方の CLI セレクター、サブディレクトリの拒否、User/session/plugin/hosted
  候補がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-06修正:
  condition/applicability/order/runtime-state の投影と、provenance または documentation-status の表示は
  T091/T1068/T1042 に残る — admission は読み取り認可レコードのままであり、ベンダーが文書化する内容はその維持される契約に留まる (FR-009)。)*
  *(2026-08-20修正: root-exact — CLIの文書化された上方向walkですべてのsessionが共有する終端はGit
  rootの1つだけなので、サブディレクトリのcarrierはこの製品が選択しないruntime-chainのメンバーでありニアミスとなる。同じ変更で`copilot.repo.mcp`のcontract行を修正した。)*
- [X] T337 [US1] Copilot CLI MCP 行、コンテキスト/スキーマバッジ、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを
  `tests/e2e/copilot-cli-mcp-inventory.spec.ts` に追加する

### 実装

- [X] T338 [US1] Copilot CLI MCP/User statement を、完全な base lookup/selection strategy record とともに
  `src/shared/registries/vendor-behaviors.ts` と `src/shared/registries/runtime-composition.ts`
  に追加し、この milestone で production registry を閉じたままにする
- [X] T339 [US1] `copilot.repo.mcp` の 2 つのセレクターだけを追加し、除外 ID を持たず User/session/hosted/configured
  の場所をパス不一致のまま保ち、プラグインパスを関係として `src/shared/registries/inspection-rules.ts` に保持する
- [X] T340 [US1] Copilot CLI MCP のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation
  に追加する
- [X] T341 [US1] Copilot CLI の root-exact な MCP マッチングとスキーマで修飾された認識を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-20修正: CLIの読み取りは文書化された2つのproject-level schemaの両方 — top-levelの`mcpServers` objectと、server
  nameをkeyにしたbareなtop-level map（github.copilot.cli.mcp § Adding per-repository MCP servers）—
  を受理し、共有carrierでは各toolのrecognitionが自vendorの読み取りをpublishする。Claudeはwrapper形式しか読まないためである。)*
  *(2026-08-20修正: root-exact — CLIの文書化された上方向walkですべてのsessionが共有する終端はGit
  rootの1つだけなので、サブディレクトリのcarrierはこの製品が選択しないruntime-chainのメンバーでありニアミスとなる。同じ変更で`copilot.repo.mcp`のcontract行を修正した。)*
- [X] T342 [US1] Copilot CLI MCP の分類を統合し、共有されるルートの物理的な同一性を `src/server/inspection/scan.ts` で維持する
- [X] T343 [US1] MCP インベントリ行と、英語の Copilot CLI コンテキスト、スキーマ、除外メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 29: Copilot CLI MCP の詳細

**目的**: 接続を一切行わない、完全な literal Copilot CLI MCP 詳細を追加する。

**独立テスト**: 不正な CLI ファイルを開き、正確な解決済みの値、診断、接続または対象の昇格が一切ないことを検証する。

**目に見えるチェックポイント**: Copilot CLI MCP ファイルを選択すると、完全で非活性な詳細が表示される。

### テストを先に

- [X] T344 [P] [US2] 文書化された両方の carrier schema、literal な whole-entry field 読み取り、維持管理される
  session-additional→plugin→workspace→User 選択の statement に対する Copilot CLI MCP テストを
  `tests/unit/inspection/copilot-metadata.test.ts` に追加する *(2026-08-20修正: workspace file
  同士の重複順序は文書化済み — `cwd` に近い file が勝ち、同一 directory では `.mcp.json` が `.github/mcp.json`
  より優先（github.copilot.cli.mcp） — のため未知の重複ケースは残らず、source 順序は projection ではなく registry の statementとしてassertする（FR-009）。)*
  *(2026-08-06 修正: admissionはread-authorization recordのままであり、vendorが文書化することは
  維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T345 [P] [US2] Copilot CLI のサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、session/plugin
  状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T346 [P] [US2] file が書いた key による、parser の resolved order での解決済み宣言、carrier の source text がどの
  response にも現れないこと（FR-007）、environment-reference substitution なし、diagnostics、stale ID に関する Copilot
  CLI MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する *(2026-08-06 修正:
  allowlist rowが宣言を順序付けたり列挙したりすることは無い —
  宣言集合はcarrier自身のものであり、書かれたkeyで公開され、allowlistがgateするのはrelationship
  kindである（FR-007）。どのsurfaceもconditionとapplicabilityをprojectしない（T091）。)* *(2026-08-20修正: 宣言はparserのresolved
  orderでpublishする。Plain
  objectはinteger-likeなkeyをplatformの数値順で列挙し、これはJavaScriptの性質として受け入れ、構文木の再parseで回避しない。contracts/http-api.md
  § get-mcp-carrier-detailは順序をparserのものとして既に記載している。)* *(amended 2026-08-20: このreleaseにはどのvendorにもMCP
  relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T347 [US2] 相互の契約参照を備えた、失敗する Copilot CLI MCP runtime-composition グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T348 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Copilot CLI MCP detail（生 source
  を表示しないこと。FR-007）、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを
  `tests/e2e/copilot-cli-mcp-detail.spec.ts` に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

### 実装

- [X] T349 [US2] strategy ID を追加せず、inventory が所有する Copilot CLI MCP strategy を、この phase が ship する
  authored relationship coverage で `src/shared/registries/runtime-composition.ts` において拡張する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-20修正:
  scope消滅 — このreleaseにはどのvendorにもMCP relationship extractorが存在しないため、このphaseはauthored-relationship
  recordを何もshipしない。CodexとClaudeのMCP
  phaseと同じである。strategy自体は同日の文書化されたworkspace順序の修正で完成しており、T347が両言語contractと相互にgateする。)*
- [X] T350 [US2] Copilot CLI MCP の recognition path を端から端まで検証する — 出荷済み extractor による文書化された両 schema
  の読み取り、共有 carrier での tool ごとの読み取り、決定的な provenance —
  。`src/server/inspection/recognizers/candidate.ts` の拡張は gap が実証された場合だけとする *(2026-08-20修正:
  どのsurfaceも順序/重複/信頼をprojectせず（T091）、schemaの読み取りはT341で出荷済み。このtaskのscopeは新しいmetadataではなく検証優先である。)*
  *(2026-08-20修正: gapなしで検証済み — 文書化された両schema、共有carrierのtoolごとの読み取り、決定的なprovenanceは
  tests/unit/inspection/recognizers.test.ts（T341）、tests/unit/inspection/copilot-metadata.test.ts（T344）、tests/integration/repository-scan.test.ts（T342）が固定しており、candidate.tsの変更は不要だった。)*
- [X] T351 [US2] Copilot CLI carrier に対する JSON extraction — file が書いた key による宣言、各値は parser
  の解決結果のまま（`DeclaredEntryDto`）、recognition-atomic failure、source value を含まない diagnostics — を検証し、gap
  が実証された場合だけ `src/server/inspection/parsers/json.ts` を拡張する *(2026-08-20修正: closedなMCP field-ID
  catalogは存在しない: authoredなkey集合は閉じておらず（FR-007）、宣言はfileが書いたkeyによる`DeclaredEntryDto`
  entryとして、各値をparserの解決結果のままpublishする。)* *(2026-08-20修正: gapなしで検証済み —
  宣言のshape、recognition-atomicなfailure、source-value-freeなdiagnosticsは
  tests/unit/inspection/parsers.test.ts、copilot-metadata.test.ts（T344）、T346のcontract
  suiteが固定しており、json.tsの変更は不要だった。)*
- [X] T352 [US2] Copilot CLI MCP の正確な解決済みの値の保持と diagnostics を `src/server/inspection/scan.ts` に統合する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-20修正:
  このtaskのscopeにselection projectionは含まれない — projectするsurfaceが無いためである（T091。2026-08-06注記のとおり）。)*
  *(2026-08-20修正: scope充足 — scanへの統合はT342のone-readな共有carrier
  assemblyとして完結して出荷済み。このphaseは証明suite（T345のzero-connection、T346のliteral保持とdiagnostics）を追加し、scan.tsの変更は不要だった。)*
  *(amended 2026-08-20: このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T353 [US2] 型付き詳細と、英語の Copilot CLI MCP メッセージをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-20修正: scope充足 — MCP
  detail routeはkind非依存で、closedなlabel表（SUPPORTED_TOOL_TEXT、VENDOR_SURFACE_TEXT）が既にCopilot
  CLIのcaptionを描画する。T348が両viewで『GitHub Copilot (CLI) · MCP』を固定し、pageの変更は不要だった。)*

---

## フェーズ 30: Copilot VS Code MCP ファイルのインベントリ

**目的**: Exactな`.vscode/mcp.json`をdocumentedなVS Code `servers` schemaとともに追加し、exactなVS Code 1.118以降root `.mcp.json`を既存CLI candidateへmergeするpath/surface-onlyなconflict provenanceとして追加する。

**独立テスト**: 両方のexact workspace-root formをinventoryし、nested `.mcp.json`をすべての製品のnear missのままにし、root `.mcp.json`のCLI/VS Code provenanceを1 file/read/recognitionへmergeし、release-note/current-guide conflictを公開し、VS Code所有root-schema fieldまたは推測winnerを認可せず、一般の`.vscode/settings.json`、User/profile MCP、link、near missを拒否する。

**目に見えるチェックポイント**: Userはdocumentedな`.vscode/mcp.json` `servers` schemaと、schema/total same-name orderがunknownのVS Code 1.118以降root-path recognitionを区別できる。

### フィクスチャとテストを先に

- [X] T354 [US1] Exactな`.vscode/mcp.json`、exact 1.118以降root `.mcp.json`、root CLI/VS Code
  overlap、nested near miss、malformed `servers`、malformed command、secret、link、general
  settings、User/profile state、unsupportedなVS Code root-schema inferenceを対象とするCopilot VS Code MCP
  fixtureを`tests/fixtures/repositories/build-fixtures.ts`に作成する *(amended 2026-08-20: nested
  `.mcp.json`はすべての製品でnear missである — CLIのdocumentedなper-repository locationはworkspace rootだけである。)*
- [X] T355 [US1] ConflictingなCopilot VS Code MCP behavior、read
  authorityを付与しない`copilot.behavior.vscode.user.mcp`/`copilot.behavior.vscode.agents` fact、exact
  `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root` candidate、path-only root
  provenance、selection
  unknown、`copilot.excluded.vscode-settings`を作らないpath-negativeなgeneral-settings/descendant/User/profile
  case、relationship、reciprocal current-guide/1.118-release evidence
  rowを`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`に具体化する
- [X] T356 [P] [US1] Exactな`copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`、専用`.vscode`
  `servers` extraction、VS Code所有field 0件のroot path-only provenance、`copilot.repo.mcp`と並ぶ1 merged
  root file/read/Copilot-MCP recognition、nested/general-settings/User/profile
  rejection、cross-provenance schema collapseなしについて失敗するmatcher/recognition
  testを`tests/unit/inspection/rules.test.ts`と`tests/unit/inspection/recognizers.test.ts`へ追加する
- [X] T357 [US1] 両Copilot VS Code MCP path、`.vscode` schema badge、root
  evidence-conflict/unknown-schema state、filter、exclusion、diagnostic、connection
  controlなしを対象とするbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-inventory.spec.ts`に追加する
  *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)*

### 実装

- [X] T358 [US1] Copilot VS Code MCP/User/agent factを1.118/current-guide conflict、path-specific
  schema availability、total-order unknown、完全なbase
  lookup/selectionとともに`src/shared/registries/vendor-behaviors.ts`/`src/shared/registries/runtime-composition.ts`へ追加し、Custom
  Agent fileをadmitせずproduction registryをclosedのままにする
- [X] T359 [US1] 2つのexact VS Code MCP rule
  `copilot.repo.mcp.vscode`/`copilot.repo.mcp.vscode-root`を追加し、nested root-form fileをすべての製品のnear
  miss、general settings/User/profile
  locationをpath-negativeのままにし、`copilot.excluded.vscode-settings`を早期所有せず新MCP exclusion
  IDも定義しない処理を`src/shared/registries/inspection-rules.ts`へ追加する *(amended 2026-08-20: nested
  `.mcp.json`はすべての製品でnear missである — CLIのdocumentedなper-repository locationはworkspace rootだけである。)*
- [X] T360 [US1] Current-guideと`vscode.copilot.mcp.workspace-root-release` recordに加え、conflictingなVS
  Code MCP behavior/rule/strategyと、このphase所有のread authorityを付与しない両VS Code MCP/agent factへのreciprocal
  backlinkを対象registry recordの`evidence` citationへ追加する
- [X] T361 [US1] Exact `.vscode/mcp.json` matchingと専用schema、およびVS Code所有extractorを持たないVS Code
  path/surface-only provenanceとしてのexact root `.mcp.json`
  matchingを`src/server/inspection/rules/copilot.ts`/`src/server/inspection/recognizers/candidate.ts`へ実装する
- [X] T362 [US1] Root `.mcp.json`でcompatibleなCLI/VS Code provenanceを1 physical file/read、1
  Copilot/MCP recognitionへmergeし、nested `.mcp.json` fileをunadmittedのままにするCopilot VS Code MCP
  classificationを`src/server/inspection/scan.ts`へ統合する *(amended 2026-08-20: nested
  `.mcp.json`はすべての製品でnear missである — CLIのdocumentedなper-repository locationはworkspace rootだけである。)*
- [X] T363 [US1] MCP inventory rowと、`.vscode` schema、root evidence conflict/unknown
  schema/order、exclusionに関する英語messageをそのkindのrow
  component（`src/app/components/inventory/rows/`）で拡張する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

---

## フェーズ 31: Copilot VS Code MCP の詳細

**目的**: 完全なliteral `.vscode/mcp.json` detailと1.118以降root `.mcp.json`のexact path/evidence detailを追加し、unknown root schemaを保持する。

**独立テスト**: malformedな`.vscode/mcp.json`とroot `.mcp.json`を開き、`.vscode`だけの専用field、shared root fileのCLI-only extractionとVS Code path-only provenance、正確な解決済みの値、diagnostic、connection 0件を検証する。

**目に見えるチェックポイント**: どちらのVS Code MCP pathを選択してもcomplete inert detailを表示し、documented `.vscode` schemaと未解決root semanticsを明確に分離する。

### テストを先に

- [X] T364 [P] [US2] `.vscode` `servers` schema、VS Code所有field 0件の1.118以降root path-only
  provenance、merged CLI provenance、workspace scope、unknown root/`.vscode`/User/agent/plugin
  duplicate、trust、conflict assessment、exact evidenceについて失敗するCopilot VS Code MCP
  testを`tests/unit/inspection/copilot-metadata.test.ts`へ追加する
- [X] T365 [P] [US2] VS Code MCP のコマンド、URL、ヘッダー、環境、DNS、ソケット、認証、信頼プロンプト、User/profile 状態を対象とするゼロ接続テストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T366 [P] [US2] file が書いた key による、parser の resolved order での `.vscode` の宣言、carrier の source
  text がどの response にも現れないこと（FR-007）、root path-only conflict provenanceとVS Code所有root field
  0件、environment-reference substitutionなし、diagnostic、stale IDについて失敗するVS Code MCP-detail API
  testを`tests/contract/http-api-files.test.ts`へ追加する *(2026-08-06 修正: allowlist
  rowが宣言を順序付けたり列挙したりすることは無い — 宣言集合はcarrier自身のものであり、書かれたkeyで公開され、allowlistがgateするのはrelationship
  kindである（FR-007）。どのsurfaceもconditionとapplicabilityをprojectしない（T091）。)* *(2026-08-20修正: 宣言はparserのresolved
  orderでpublishする。Plain
  objectはinteger-likeなkeyをplatformの数値順で列挙し、これはJavaScriptの性質として受け入れ、構文木の再parseで回避しない。contracts/http-api.md
  § get-mcp-carrier-detailは順序をparserのものとして既に記載している。)* *(amended 2026-08-20: このreleaseにはどのvendorにもMCP
  relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T367 [US2] Current-guide/1.118 conflict、unknown root schema/total same-name order、reciprocal
  contract referenceについて失敗するVS Code MCP runtime-composition graph
  coverageを`tests/contract/runtime-composition.test.ts`へ追加する
- [X] T368 [US2] Exact literal credential/environment-reference表示、process-environment sentinel
  substitutionなし、masking/reveal controlなし、両pathのcomplete literal VS Code MCP detail（生 source
  を表示しないこと。FR-007）、`.vscode` schema対root unknown-schema conflict、diagnostic、zero-connection
  behaviorに関するbrowser acceptanceを`tests/e2e/copilot-vscode-mcp-detail.spec.ts`へ追加する *(2026-08-08修正:
  detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

### 実装

- [X] T369 [US2] Strategy IDを追加せず、inventory-owned Copilot VS Code MCP strategyをcurrent-guide/1.118
  conflict、path-specific schema availability、unknown root/`.vscode`/User/agent/plugin
  winner、trustで`src/shared/registries/runtime-composition.ts`において拡張する *(amended 2026-08-20:
  このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T370 [US2] `.vscode/mcp.json`のVS Code schema metadataと、VS Code所有extractor field 0件のroot
  `.mcp.json` path-only conflict provenanceに加え、duplicate uncertainty/trust
  metadataを`src/server/inspection/recognizers/candidate.ts`へ実装する
- [X] T371 [US2] Documentedなreaderが取るinert JSONC mode — commentとtrailing commaを空白化し、残りをstrict
  readingと同じ`JSON.parse`で解決する — を追加し、各宣言をfileが書いたkeyのまま、fieldごとに1つの解決済みの値と、Inspector numeric
  capを持たないenvironment-owned parser capacityで公開する。documentをどのJSON形式で読むかは`(tool, path)`の組に属し、parsing
  seam自身の表に住む。したがって1つの物理carrierは、commentを受け付けるreaderを持つproductにはJSONCであり、持たないproductにはstrictであって、どちらのreadingも他方のものではない。Parse失敗はfileに閉じる:
  recognitionはdiagnosticとともにall-or-nothingで失敗し、carrierはadmitted candidateのままで（FR-028）、1
  fileの外の失敗だけがcatch、cause classification、retry、recovered
  resultなしに変更なく伝播する処理を`src/server/inspection/parsers/json.ts`へ追加する *(amended 2026-08-20: JSON
  parsing seam自体は既に`src/server/inspection/parsers/json.ts`にある。taskはextractorをそこに保持する。)* *(amended
  2026-08-20: closedなfield ID catalogは存在しない —
  宣言はfileが書いたkeyのまま公開され（FR-007）、throw伝播の文言はFR-028が定めるfile-confinedな分割を述べる形に改めた。)* *(2026-08-27 修正:
  このmodeはどの単一carrierのものでもない。vendor contractはroot `.mcp.json`、settings pair、Copilotのhook
  fileについてcommentを受け付けるreaderを文書化しているため、`(tool, path)`の表がこれを決め、1つのfileがJSONC readingとstrict
  readingを併せ持ち得る。)*
- [X] T372 [US2] `.vscode/mcp.json`の正確な解決済みの値の保持とdiagnosticに加え、root `.mcp.json`のpath-only conflict
  provenanceと独立したCLI-owned extractionを、VS Code所有root fieldおよびcross-provenance schema promotion
  0件で`src/server/inspection/scan.ts`へ統合する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  このreleaseにはどのvendorにもMCP relationship extractorが存在しないため（T349の決定）、authored
  relationshipはこのtaskのscopeに含まれず、relationshipのrecord・target・projectionは出荷もassertもされない。)*
- [X] T373 [US2] `.vscode/mcp.json` schemaとroot `.mcp.json` を区別し、VS Code所有root field 0件を保つtyped
  detailと英語messageをそのkind自身のdetail route（`src/app/pages/` 配下）で拡張する *(2026-08-08修正: admission は
  read-authorization 記録に留まり、vendor が文書化する内容はその maintained contract に留まるため、どの surface も provenance
  を表示せず、trust・安全性・total-order uncertainty を project しない（FR-009、T091/T1068）。)*

---

## フェーズ 32: Copilot Cloud MCP factと明示的carrier境界

**目的**: Copilot cloud agentのhosted MCP source — out-of-box、custom-agent、repository-settingsの順で後のsourceが上書きする — をorigin fileを持たないregistry保守factとして記録し、明示的carrier境界を確定します: MCP surfaceに合流するのは明示的なMCP構成だけであり、agent profileの`mcp-servers`は将来のagents inventoryに向けたagent自身のfrontmatter宣言で、plugin pathとsettingsはMCP recognitionを所有せず、contained-owner機構は存在しません。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: origin fileを持たない`copilot.behavior.cloud.mcp` factと`copilot.cloud.mcp.selection`のlater-wins recordをpinし、MCP構成を綴るagent/plugin/settings fileがread・recognize・接続のいずれもされないこと、MCP inventoryがsynthetic fileもhosted表示もなしに明示的carrierだけを列挙することを検証します。

**目に見えるチェックポイント**: agent/plugin/settings fileがMCP構成を綴っていてもMCP tabには明示的carrierだけが並び、hosted Cloud MCP factはどのsession surfaceにも現れません。 *(amended 2026-08-20: hosted入力を表示しないという2026-08-02のclarificationにより、userに見えるのは不在である。)*

### テストを先に

- [X] T374 [P] [US2] origin fileを持たないCloud MCP fact — null selectorを持つ`hosted-state`
  locator、partially-documented status、`replace`のlater-wins strategy record — をpinするunit
  testを`tests/unit/inspection/copilot-metadata.test.ts`に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-21:
  引用pageが確立するのは処理順と後levelのoverrideだけで、overrideの単位もlevel間のmerge
  ruleも確立しないため、recordは`replace`のみ・partially documentedとする（QR-005）。)*
- [X] T375 [P] [US2] MCP recognitionが明示的carrierだけから生まれることを証明するrecognition test —
  MCP構成を綴るunadmittedなagent/plugin/settings fileはrecognitionもsynthetic fileも生まず、Cloud
  factはfileを一切持たない — を`tests/unit/inspection/recognizers.test.ts`に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T376 [P] [US2] MCP構成を綴るagent/plugin fileを含むscanがそれらを一切読まず、MCP
  recognitionを公開せず、DNS/socket/HTTP/auth/参照先requestを発行しないことのzero-connection/network
  testを`tests/integration/security/zero-activation.test.ts`に追加する
- [X] T377 [US2] 正確な非認可`copilot.behavior.cloud.mcp` factを既存sourceへのevidence
  backlink付きで`tests/fixtures/conformance/vendor-behaviors.json`に実体化する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T378 [US2]
  `shared.excluded.managed-remote-state`が参照する前の`copilot.behavior.cloud.mcp`の正確なownershipとreciprocal
  backlink coverageを`tests/contract/vendor-behaviors.test.ts`に追加する
- [X] T379 [US2] Copilot Cloud runtime MCPのgraph coverage — strategyがhosted behavior
  1件だけをconsumeし、agent kindのcandidate ruleも未解決のCustom Agent behavior参照も存在しない —
  を`tests/contract/runtime-composition.test.ts`に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T380 [US2] 境界を不在で証明するbrowser acceptance — MCP構成を綴るagent/plugin fileの傍らでMCP tabには明示的carrier
  rowだけがあり、syntheticやhostedのrow、unavailable状態の表示、接続controlがないこと —
  を`tests/e2e/copilot-contained-cloud-mcp.spec.ts`に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

### 実装

- [X] T381 [US2] managed/remote exclusionが参照する前に、正確な非認可`copilot.behavior.cloud.mcp` origin-file-less
  runtime/source factを`src/shared/registries/vendor-behaviors.ts`に追加する
- [X] T382 [US2] source IDを新設せず、`copilot.behavior.cloud.mcp`のreciprocal backlinkを既存official-source
  recordへ、所有するregistry recordの`evidence` citationに追加する
- [X] T383 [US2] 正確なCopilot Cloud out-of-box→custom-agent→Repository-settings orderを、hosted behavior
  1件をconsumeする`copilot.cloud.mcp.selection`
  recordとして`src/shared/registries/runtime-composition.ts`に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T384 [US2] Scopeを空にした: 実装すべきcontained-MCP dispatchは存在しない —
  owner-adapter機構は拡張ではなく`src/server/inspection/recognizers/candidate.ts`から撤去され、明示的carrierがMCP
  kindの唯一のrecognitionである *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T385 [US2] Scopeを空にした: Markdown
  extractionは既に全宣言keyをauthoredのまま公開しており、それがagentの`mcp-servers`が自身のdetailに現れるそのままの形である —
  `src/server/inspection/parsers/markdown.ts`に追加すべきfield ID catalogは存在しない *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T386 [US2] Scopeを空にした: plugin-path relationshipは出荷されず（このreleaseにMCP relationship
  extractorは存在しない、T349）、owner-ID gateも`src/server/inspection/scan.ts`に存在しない *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T387 [US2] Scopeを空にした: hosted Cloud factやcontained-owner状態を表示するsession
  surfaceは存在しないため、`src/app/pages/`配下に追加すべきdetail copyはない *(2026-08-08 修正:
  detailはfileが書いた宣言を示し、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもtrust、precedence、order、uncertaintyをprojectしない（FR-009、T091）。)*
  *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

---

## フェーズ 33: Priority MCP インベントリ

**目的**: 最初の priority wave で利用できるすべての MCP surface — Codex config carrier、Claude root carrier、Copilot CLI/VS Code file — を1つのcross-vendor inventoryへ統合します。hosted Cloud sourceはregistry factに留まり、明示的carrier境界が全体に適用されます。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: root `.mcp.json` に対する別々の Claude/Copilot recognition を持つ一つの物理 item/read、VS Code file、すべての製品でnear missとなるnested carrier、Codex carrier、skill ownerがないこと、origin fileを持たない Cloud fact、いかなるkindのowner rowもhosted synthetic fileもないこと、決定論的な schema/provenance order、filter、path negative、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証します。

**目に見えるチェックポイント**: 4つのcarrier全体で1つのMCP inventoryを利用でき — すべてのvendorが宣言する名前は1つのrowにgroupされる — 他のfileが何を綴っていても明示的carrier以外は表示されません。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

### テストを先に

- [X] T388 [US1] root/shared CLI file、nested near miss、VS Code file、Codex
  carrier、plugin-pathとsettingsのnegative、origin fileを持たない Cloud fact、malformed field、secret、path
  negative、注入した execution-environment throw/rejection に対する priority MCP fixture を
  `tests/fixtures/repositories/build-fixtures.ts` で完成させる *(amended 2026-08-20: nested `.mcp.json`
  fileはすべての製品でnear missである — CLIのdocumentedなper-repository locationはworkspace rootだけである —
  またskill-frontmatterのcontained MCPにskill ownerは存在しない: Claudeは`mcpServers` skill
  fieldを文書化しないためである。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T389 [US1] まだ所有されていない plugin/settings exclusion ID がなく、contained/runtime candidate rule
  がゼロであることを証明しながら、priority MCP behavior、file matcher、現在受け入れ済み carrier/runtime
  selection、relationship、path-negative case、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T390 [P] [US1] Claude root、Copilot CLI/VS Code file、Codex standalone がないこと、path-negative な
  User/hosted/configured input、relationship-only plugin path、contained/runtime MCP fact による
  candidate rule がゼロであることに関する完全な matcher test を `tests/unit/inspection/rules.test.ts` に追加する
- [X] T391 [P] [US1] 3 admissionを持つshared rootのClaude/Copilot recognition、VS Code file、nested near
  miss、Codex carrier、origin fileを持たない Cloud fact、synthetic file がないこと、schema distinction、決定論的な
  provenance に関する priority recognition-matrix test を `tests/unit/inspection/recognizers.test.ts`
  に追加する *(amended 2026-08-20: nested `.mcp.json` fileはすべての製品でnear missである —
  CLIのdocumentedなper-repository locationはworkspace rootだけである — またskill-frontmatterのcontained
  MCPにskill ownerは存在しない: Claudeは`mcpServers` skill fieldを文書化しないためである。)*
- [X] T392 [P] [US1] shared MCPのone-read、決定論的なrecognition/provenance order、現在受け入れ済みowner
  attachment、dormant-owner nonpublication、fileに閉じたoutcomeだけのpartial
  continuity、attemptをabortしてitem、recognition、derived result、scan-result
  record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected
  fileに閉じないfailure、connection/target
  readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T393 [US1] priority MCP inventory、shared
  attribution、明示的carrier境界、origin-file-lessやownerのrowが一切ないこと、path negative、schema
  label、diagnostics、keyboard use を対象とするブラウザー受け入れテストを `tests/e2e/mcp-inventory.spec.ts` に追加する
  *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

### 実装

- [X] T394 [US1] priority MCP file の one-read assembly、決定論的な recognition/provenance/schema
  order、synthetic file がないこと、source-value-free diagnostics を `src/server/inspection/scan.ts` で完成させる
  *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20: 出荷済みの機構が既に満たしている — T392のintegration
  coverageとT393のacceptanceがgateし、コード変更は不要だった。)*
- [X] T395 [US1] ownerやruntime-factの描画なしに、MCP filter、shared recognition、schema summary を
  `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow
  component（`src/app/components/inventory/rows/`） で完成させる *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20: 出荷済みの機構が既に満たしている — T392のintegration
  coverageとT393のacceptanceがgateし、コード変更は不要だった。)*
- [X] T396 [US1] cross-vendor rowに対する英語のMCP inventory copy — name
  row、carrierごとのattribution、no-nameおよびfailed-carrierのnote —
  を完全なまま保つ。owner・runtime-fact・exclusionのmessageは、明示的carrier境界により語るべきものが存在しない *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20: 出荷済みの機構が既に満たしている — T392のintegration
  coverageとT393のacceptanceがgateし、コード変更は不要だった。)*

---

## フェーズ 34: MCP 比較

**目的**: MCP kind 自身の比較サーフェスを、この kind 自身の row unit の上に設計します: 1 つの宣言済み server 名の declaration をその行の carrier 間で比較し、各 side を 1 つの canonical JSON document へ serialize して Monaco で diff します（research.md § 7）。選択は名指された行の中に限られ、明示的 carrier だけがこのサーフェスに合流し、carrier は source を表示しません（FR-007）。

**独立テスト**: Codex carrier と root `.mcp.json` の両方が宣言する名前の行から比較を開き、2 つの serialize 済み declaration が Monaco で diff され、credential と environment reference の値が literal のまま、carrier source の表示がなく、carrier の他の名前がページに現れないことを検証し、名指された行の外にあるあらゆる選択を拒否します。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)* *(amended 2026-08-20: 比較の単位はcarrier fileのpairではなく宣言済みserver名である: MCPのinventory unitは名前なので、比較は1つの名前のdeclarationをその行のcarrier間で比較し、serializeしてMonacoでdiffする。)*

**目に見えるチェックポイント**: ユーザーは MCP 宣言に接続せずに比較できる。

### テストを先に

- [X] T397 [US3] 失敗する view と serialization の回帰テスト — 所有する行と両 carrier を名指す比較 route、compare API なしの通常の
  carrier-detail read 2 件による pair の load、非 carrier path を stale として拒否する stale/failure state —
  same-path と not-readable の state は存在しない。route が同一 file の link を open 前に拒否し、named row の carrier は常に
  parsed かつ readable だからである —、close 時に dispose される登録済み content owner、両 side を揃える canonical JSON
  serialization — 共通の declaration key を 1 つの固定された読み順で先頭に、それ以外の key と nested mapping の key は sort
  順で、bare な spelling が JSON として読み戻せる scalar text は bare で、全値を literal
  のまま（FR-025、FR-026）`JSON.stringify` 自身の escaping を両 side に対称に適用する — と、authored 順の detail
  serialization（FR-007） — を `tests/unit/app/mcp-comparison.test.ts` に追加する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-08修正: admission は read-authorization 記録に留まり、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も provenance を表示せず、trust や selection を project
  しない（FR-009、T091/T1068）。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20: 比較の単位は宣言済みserver名である。sideはMonaco
  diff向けにserializeされるため、field-tableのdata modelとその回帰テストはserializationの回帰テストに置き換わった。)* *(amended
  2026-08-21: serializationはline単位の整列のためkeyをcanonicalに並べ（共通のMCP declaration
  keyを固定の読み順で先頭に、残りはsort順）、複数行文字列はblock literalとし、数値・真偽値として読めるscalarはbareで綴る。)* *(amended
  2026-08-21: 各declarationはJSONへserializeする。JSON
  carrierのentryがserver名の下に持つvalueだからである。detailも各declarationを同じdocumentとしてauthored順で表示する。)* *(amended
  2026-08-21: scalarはrendered textの横にparsed kind（`DeclaredScalarKind`）を公開する: raw解決値はJSON
  wireに載せられず（`NaN`、infinity、TOMLの64bit整数）、kindとtextの組がその正確なJSON-safe
  encodingである。serializerはrenderingからの推測ではなくkindで綴る。renderingはauthoredな`'7'`
  stringと数値`7`を区別できないからである。)* *(amended 2026-08-21: view stateはproductionのcallerが到達するものだけである —
  routeの pair fault が同一fileのlinkをopen前に拒否し、named rowのcarrierは常にparsedである（api-types.ts §
  McpDeclarationDto.parseStatus）。)*
- [X] T398 [US3] 1 つの宣言済み名の declaration を Codex carrier と `.mcp.json` の間で diff するブラウザー受け入れテスト —
  その名前の inventory row と carrier/declaration detail から入り、2 つの serialization が Monaco で diff
  され、credential/environment-reference の値は literal かつ unmasked、environment substitution なし、carrier
  source はどこにもなく（FR-007）、carrier の他の名前はページに現れず、名指された行の外のあらゆる選択が拒否される — を
  `tests/e2e/mcp-comparison.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20:
  比較の単位は宣言済みserver名である。受け入れテストは行が所有しMonacoでdiffするmodelに従う。)*

### 実装

- [X] T399 [US3] 行が所有する MCP 比較選択 —
  `/mcp/compare/<family>?name=<宣言済み名>&leftSource=<selector>&left=<path>&rightSource=<selector>&right=<path>`
  を current generation の名指された行に対して解決し、通常の carrier-detail read 2 件で load し、serialize 済み declaration の
  model が dispose を経由する content-owner registry を備える — を `src/app/composables/mcp-comparison.ts`（この
  kind の比較サーフェスとともにこの task が設計・作成する composable） で強制する *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は
  kind 固有で共有 module は存在せず、そのサーフェスの設計・作成は skill の前例に倣ってこの task が担う（spec.md § Clarifications Session
  2026-08-14）。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-20: selectionは自由なcarrier
  pairではなく宣言済みserver名の行なので、routeは名前を運び、composableはserializationがmountするMonaco modelを登録する。)*
- [X] T400 [US3] declaration 比較サーフェス — `src/app/components/declared-entries-json.ts` の JSON
  serialization、`src/app/components/mcp-comparison/DeclarationDiff.vue` の Monaco diff、行が所有する compare
  route `src/app/pages/mcp/compare/[family].vue` — を構築する（skill の前例 —
  `src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`
  — に倣ってこの task が設計・作成する、その kind 自身の比較サーフェスの一部。そこへ到達する entry link — その kind の inventory row
  component（`src/app/components/inventory/rows/` 配下）と、その kind の detail route（`src/app/pages/` 配下） —
  も、skill における T203 と同様にこの task が所有する） *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有
  module は存在せず、そのサーフェスの設計・作成は skill の前例に倣ってこの task が担う（spec.md § Clarifications Session
  2026-08-14）。)* *(amended 2026-08-20: 1つの名前のdeclarationはserializeしてMonacoでdiffする。serializerとdiff
  componentがこのtaskの成果物である。)* *(amended 2026-08-21: 各declarationはJSONへserializeする。JSON
  carrierのentryがserver名の下に持つvalueだからである。detailも各declarationを同じdocumentとしてauthored順で表示する。)*
- [X] T401 [US3] 英語の MCP 比較メッセージをそれらを描画する Vue component に追加する *(amended 2026-08-20:
  messageはT399/T400が作成したsurface自体の中で出荷された —
  `src/app/pages/mcp/compare/[family].vue`と`src/app/components/mcp-comparison/`のstate
  statement・side文・serialization noteで、意味が同一の箇所は兄弟比較surfaceとcopyを一致させている。)*

---

## フェーズ 35: Codex Rules inventory

**目的**: Repository root 自身の configuration layer にある direct-child Codex permission policy file を追加します。 *(2026-08-21修正: `rule`ではなく`permissions`として認識する — このfileはsandbox外でどのcommandを実行してよいかを決めるものであり、Claudeが自身の`rules/`に置くmodular instructionとは主題が異なる。vendorが共有する語でまとめると無関係な2つの主題が1つのlistに並ぶ。)* *(2026-08-17修正: vendor contract の rule 行に合わせて root 起点とする — nested な `.codex` layer は本ツールが選ばない runtime working directory のものであり、nested `AGENTS.md` が恒久的な near miss であるのと同じ理由である。)*

**独立テスト**: `['.codex', 'rules', /\.rules$/u]` を inventory 化し、symbolic link は target を通して読み、dangling link は診断し（FR-024）、nested rule directory、root より下の `.codex/rules`、near miss、untrusted/runtime-inactive な certainty claim、User/managed rule、無関係な Copilot/Claude file を拒否します。 *(2026-08-21修正: 拒否対象に link を挙げていたが、これは他のすべての kind が行う透過的な symlink 読み取りと矛盾する。)*

**目に見えるチェックポイント**: source と path で Codex rule を filter できる。

### fixture とテストを先行

- [X] T402 [US1] root layer、near miss のままとなる子孫の `.codex/rules`、direct child、nested
  exclusion、malformed metadata、secret、reference、link、trust state、near miss に対する Codex rule fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T403 [US1] exclusion ID を定義せず、Codex rule behavior、candidate、composition、path-negative
  case、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T404 [US1] direct-child Codex rule、nested exclusion、other-tool recognition なしに関する
  matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T405 [US1] Codex permission policy inventory、filter、diagnostics に関するブラウザー受け入れテストを
  `tests/e2e/codex-permissions-inventory.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-22修正:
  Codexのfileは`permissions`として認識されるため、本taskの成果物はpermission policyのものである —
  `codex-permissions-*`のbrowser suite、`/permissions/**`のshell fallbackとroute、そして`FileDetail`
  variantではなく`get-permission-policy-detail`自身のresultである`PermissionPolicyDetail`。)*

### 実装

- [X] T406 [US1] rule resolution が参照する前に、Codex rule lookup statement と、読み取り権限を付与しない
  `codex.behavior.user.rules` を `src/shared/registries/vendor-behaviors.ts` に追加する *(2026-08-21 修正:
  `codex.rules.resolution` strategy recordを、それが合成する2つのstatementとともにここで出荷する。MCPの先例（T285/T286）に倣う —
  出荷済みのcandidate ruleは、どのdocumented
  compositionがそれを説明するかを述べるものであり、`codex.behavior.user.rules`はそれを消費するstrategyが存在するまでどこからも到達されないままになる。)*
- [X] T407 [US1] `codex.repo.rules` candidate record だけを追加し、exclusion ID を定義せず、adjacent または nested
  non-match を path-negative のままにする処理を `src/shared/registries/inspection-rules.ts` に実装する *(2026-08-21
  修正: ruleのgraph
  edgeはrecordとともに`src/shared/registries/codex/relations.ts`へ出荷する。T286がcarrierに対して行ったのと同じであり、compiled
  ruleは自vendorのcatalogからedgeを解決するため、edgeがなければ構築に失敗する。)*
- [X] T408 [US1] Codex rule evidence record と affected-contract reference を 対象registry
  recordの`evidence` citation に追加する *(2026-08-21 修正: 影響を受けるcontractは、resolution
  strategyが依拠する2つ目のreviewed sectionを`openai.codex.rules`
  rowに加える`contracts/official-sources.md`と、このkindのrow単位をfile自身と定める`data-model.md` §
  一覧の単位および`contracts/http-api.md` § get-sessionである。いずれも同一変更で両言語を更新する。)*
- [X] T409 [US1] Codex direct-child rule matching と path-derived recognition を
  `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-21 修正: recognizerの変更は不要だった — `rule`
  admissionはすでに`ToolRecognition.recognizeOther`へ到達し、そのpath由来のrecordがこのkindの公開内容そのものである。vendor
  moduleはkind固有の問いに答えないunitでrecordをcompileする。)*
- [X] T410 [US1] Codex rule の inventory row と、英語 label を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-21 修正: T290が中央のkind
  dispatch経路を名指すのと同じ理由でここでも名指す — snapshotが到達しないrow componentは何も列挙しない — ため、本taskはrow DTOとそのsession
  projectionを`src/shared/api-types.ts`と`src/server/session/session.ts`に、その導出とcountを`src/app/composables/filters.ts`に、tab-panel
  branchを`src/app/components/inventory/InventoryList.vue`に、totalを`src/app/pages/index.vue`にも公開する。)*

---

## フェーズ 36: Codex Rules の詳細

**目的**: 完全で非活性な Codex permission policy source を、その kind 自身の detail surface として追加する。 *(2026-08-21修正: `rule`ではなく`permissions`として認識する — このfileはsandbox外でどのcommandを実行してよいかを決めるものであり、Claudeが自身の`rules/`に置くmodular instructionとは主題が異なる。vendorが共有する語でまとめると無関係な2つの主題が1つのlistに並ぶ。)* *(2026-08-21修正: Codex の `.rules` file は Starlark であり、vendor contract がそこから認めるのは `runtime-reference` relationship だけで、edge を生成する shipped recognition は存在しない — したがって本 phase が extract または診断できるものは無く、authored source 全体が detail のすべてである。)*

**独立テスト**: 不正な Codex rule と、資格情報および環境変数参照を含む Codex rule を開き、authored source 全体がそのまま page に届くこと、command と path が非活性であること、detail-state cleanup を検証する。 *(2026-08-21修正: Codex の `.rules` file は Starlark であり、vendor contract がそこから認めるのは `runtime-reference` relationship だけで、edge を生成する shipped recognition は存在しない — したがって本 phase が extract または診断できるものは無く、authored source 全体が detail のすべてである。)*

**目に見えるチェックポイント**: Codex rule を選択すると、それを実行または適用せずに完全で非活性な詳細を開ける。

### テストを先に

- [X] T411 [P] [US2] Codex rule について、recognition が `not-attempted` で kind だけを公開し、file
  から宣言値を一切持ち出さず、壊れた Starlark を正常なものとまったく同じに扱うことを証明する失敗テストを
  `tests/unit/inspection/codex-metadata.test.ts` に追加する *(2026-08-21修正: Codex の `.rules` file は
  Starlark であり、vendor contract がそこから認めるのは `runtime-reference` relationship だけで、edge を生成する shipped
  recognition は存在しないため、この release ではこの kind から何も extract せず、relationship も診断も生じない。)*
- [X] T412 [P] [US2] Codex rule のテキスト、link、command、restrictive result が非活性のままで、target read
  を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T413 [US2] reciprocal contract reference を備えた、失敗する Codex rule runtime-composition graph
  coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [X] T414 [US2] 正確な資格情報/環境変数参照のリテラル表示、process 環境の sentinel を代入しないこと、masking/reveal control
  が無いこと、完全でリテラルな Codex policy source、非活性な command と path、この scan が policy を保持しない path
  を検証するブラウザー受け入れテストを `tests/e2e/codex-permissions-detail.spec.ts` に追加する *(2026-08-21修正: Codex の
  `.rules` file は Starlark であり、vendor contract がそこから認めるのは `runtime-reference` relationship だけで、edge
  を生成する shipped recognition は存在しないため、この release ではこの kind から何も extract せず、relationship も診断も生じない。)*
  *(2026-08-22修正: Codexのfileは`permissions`として認識されるため、本taskの成果物はpermission policyのものである —
  `codex-permissions-*`のbrowser suite、`/permissions/**`のshell fallbackとroute、そして`FileDetail`
  variantではなく`get-permission-policy-detail`自身のresultである`PermissionPolicyDetail`。)*

### 実装

- [X] T415 [US2] 本 phase が依拠する Codex rule の composition record を
  `src/shared/registries/runtime-composition.ts` でそのまま維持し、strategy ID も relationship record も追加しない
  *(2026-08-21修正: Codex の `.rules` file は Starlark であり、vendor contract がそこから認めるのは
  `runtime-reference` relationship だけで、edge を生成する shipped recognition は存在しないため、この release ではこの kind
  から何も extract せず、relationship も診断も生じない。)*
- [X] T416 [US2] 認識された policy の authored source 全体をその専用 detail から配信し、extractor も scan の変更も追加せず、dot
  を含む末尾 segment で終わる detail URL が新規 load でも解決するよう `/permissions/**` の shell fallback を
  `src/server/host/devframe-app.ts` に追加する *(2026-08-21修正: Codex の `.rules` file は Starlark
  であり、vendor contract がそこから認めるのは `runtime-reference` relationship だけで、edge を生成する shipped recognition
  は存在しないため、この release ではこの kind から何も extract せず、relationship も診断も生じない。)* *(2026-08-22修正:
  Codexのfileは`permissions`として認識されるため、本taskの成果物はpermission policyのものである —
  `codex-permissions-*`のbrowser suite、`/permissions/**`のshell fallbackとroute、そして`FileDetail`
  variantではなく`get-permission-policy-detail`自身のresultである`PermissionPolicyDetail`。)*
- [X] T417 [US2] そのkind自身のdetail routeを`src/app/pages/`に作成し、認識されたpolicyと、それを認識したproductを公開する
  *(2026-08-21修正: 本 route はこの kind 初の detail surface であるため拡張ではなく新規作成であり、そのkind自身のdetail result、その
  projection、caption、row からの entry link を同時に追加する。)* *(2026-08-22修正:
  Codexのfileは`permissions`として認識されるため、本taskの成果物はpermission policyのものである —
  `codex-permissions-*`のbrowser suite、`/permissions/**`のshell fallbackとroute、そして`FileDetail`
  variantではなく`get-permission-policy-detail`自身のresultである`PermissionPolicyDetail`。)*
- [X] T418 [US2] この phase が ship する英語の Codex rule 詳細メッセージをそれらを描画する Vue component に追加する *(2026-08-06
  修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*

---

## フェーズ 37: Claude Rules のインベントリ

**目的**: 再帰的な Claude rule ファイルを追加し、すでに所有済みの `copilot.excluded.additional-standard-locations` behavior を `.claude/rules` に対して回帰確認する。

**独立テスト**: `[ANY_DIRECTORIES, '.claude', 'rules', ANY_DIRECTORIES, /\.md$/u]` をインベントリに含め — descendant reach は nested な rules directory の文書化された on-demand load — symbolic link は target 越しに読み、dangling link は診断し（FR-024）、無関係な path を拒否し、rule であることを理由に Copilot の rule がこれらの file に届かないことを証明する。 *(2026-08-22修正: 拒否対象に link を挙げていたが、これは他のすべての kind が行う透過的な symlink 読み取りと矛盾する。また Copilot に関する記述が絶対的だったが、出荷済み selector はそうではない — `copilot.repo.instructions.agents` はあらゆる深さの `AGENTS.md` を admit するため、`.claude/rules/` 内に書かれた `AGENTS.md` は両製品の recognition を持ち、それは各 inventory row が述べるとおりである。)* *(2026-08-20修正: `claude.repo.rules`のdescendant reachは、nestedな`.claude/rules/` directoryの文書化されたon-demand loadであり、可能なlayer rootのinventoryではない。同じ変更でcontract行を修正した。)*

**目に見えるチェックポイント**: ユーザーは、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。

### fixture とテストを先に

- [X] T419 [US1] recursive path、nested な rules directory、`paths` frontmatter、不正な
  metadata、secret、reference、link、Copilot-compatible case、near miss を対象とする Claude rule fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-20修正:
  `claude.repo.rules`のdescendant reachは、nestedな`.claude/rules/` directoryの文書化されたon-demand
  loadであり、可能なlayer rootのinventoryではない。同じ変更でcontract行を修正した。)*
- [X] T420 [US1] Claude rule の behavior、candidate、composition、evidence、および既存の
  `copilot.excluded.additional-standard-locations` row への regression reference を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T421 [P] [US1] recursive Claude rule、direct/nested file、既存の
  `copilot.excluded.additional-standard-locations` rule による Copilot recognition ゼロに関する失敗する
  matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-20修正: `claude.repo.rules`のdescendant
  reachは、nestedな`.claude/rules/` directoryの文書化されたon-demand loadであり、可能なlayer
  rootのinventoryではない。同じ変更でcontract行を修正した。)* *(2026-08-21修正: rule fileからは何も読み出さない —
  ruleはauthorが書いた1つのdocumentとして、Claude ruleはfrontmatter blockを含めて丸ごと公開する —
  ため、このkindはextractionもrelationshipもextraction diagnosticも出荷しない。)*
- [X] T422 [US1] Claude rule inventory、filter、除外場所での Copilot recognition が 0 件であること、診断、保持された Codex
  permission policy に関するブラウザー受け入れテストを `tests/e2e/claude-rules-inventory.spec.ts` に追加する
  *(2026-08-08修正: provenance はどの surface も表示せず（T1068）、文書化 evidence も同じくどの surface も示さない maintenance
  データである（T1042） — Copilot の除外は recognition が 0 件であることで証明する。)*

### 実装

- [X] T423 [US1] rule layering が参照する前に、Claude rule lookup statement、読み取り権限を付与しない
  `claude.behavior.user.rules`、Copilot compatibility evidence を
  `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T424 [US1] `claude.repo.rules` candidate だけを追加し、既存の
  `copilot.excluded.additional-standard-locations` record を保持して参照し、別の exclusion は定義しない処理を
  `src/shared/registries/inspection-rules.ts` に実装する
- [X] T425 [US1] Claude rule evidence record と reciprocal affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T426 [US1] Copilot へ昇格させずに、Claude の再帰的な rule matching と recognition を
  `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-21修正: rule fileからは何も読み出さない — ruleはauthorが書いた1つのdocumentとして、Claude ruleはfrontmatter
  blockを含めて丸ごと公開する — ため、このkindはextractionもrelationshipもextraction diagnosticも出荷しない。)*
- [X] T427 [US1] Claude rule classificationにscanの変更が不要であることと、Codex
  ruleの結果が保たれることを`src/server/inspection/scan.ts`で確認する *(2026-08-21修正:
  scanはkind中立であり、recognitionをkindでまとめて各kind自身のextraction失敗を紐づけるだけなので、2つ目のvendorのrule
  fileも無編集で通る。Codexの結果が保たれることはintegration coverageが証明する。)*
- [X] T428 [US1] そのkindのrow component（`src/app/components/inventory/rows/`）がClaude
  ruleに対して変更不要であること、およびCopilot exclusionのmessageを描画しないことを確認する *(2026-08-21修正: rowはvendor中立 — 1
  fileと、それを認識したproductおよびsurface — であるため2つ目のvendorのrowにも編集は要らない。除外されたlocationはどのshipped
  selectorも到達しないpathであり、inventoryはそれを不在で示す。除外された旨を述べる文は置かない（T1068）。)*

---

## フェーズ 38: Claude Rules の詳細

**目的**: 完全で非活性な Claude rule document を、その kind 自身の detail surface として追加する。 *(2026-08-21修正: ruleはauthorが書いた1つのdocumentとして、frontmatter blockを含めて表示するため、そこから何も読み出さない — このkindには宣言された`paths`のsurfaceも、relationshipも、extraction diagnosticも存在しない。)*

**独立テスト**: 不正な Claude rule と、資格情報および環境変数参照を含む Claude rule を開き、authored document 全体が frontmatter block ごとそのまま page に届くこと、link と glob が非活性であること、detail-state cleanup を検証する。 *(2026-08-21修正: ruleはauthorが書いた1つのdocumentとして、frontmatter blockを含めて表示するため、そこから何も読み出さない — このkindには宣言された`paths`のsurfaceも、relationshipも、extraction diagnosticも存在しない。)*

**目に見えるチェックポイント**: Claude rule を選択すると、任意の filesystem path に対して glob を評価せずに完全で非活性な detail が表示される。

### テストを先に

- [X] T429 [P] [US2] recognitionがfileから何も読み出さないこと（`paths`
  frontmatterを含む）と、壊れたblockを正常なものとまったく同じに扱うことを証明する失敗テストを`tests/unit/inspection/claude-metadata.test.ts`に追加する
  *(2026-08-21修正: ruleはauthorが書いた1つのdocumentとして、frontmatter blockを含めて表示するため、そこから何も読み出さない —
  このkindには宣言された`paths`のsurfaceも、relationshipも、extraction diagnosticも存在しない。)*
- [X] T430 [P] [US2] Claude rule のテキスト、link、command、glob、restrictive result が非活性のままで、target read
  を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T431 [US2] reciprocal contract reference を備えた、失敗する Claude rule runtime-composition graph
  coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [X] T432 [US2] 正確な資格情報/環境変数参照のリテラル表示、process環境のsentinelを代入しないこと、masking/reveal
  controlが無いこと、frontmatter blockを含むClaude ruleのauthored
  document全体、非活性な宣言globを検証するブラウザー受け入れテストを`tests/e2e/claude-rules-detail.spec.ts`に追加する
  *(2026-08-21修正: ruleはauthorが書いた1つのdocumentとして、frontmatter blockを含めて表示するため、そこから何も読み出さない —
  このkindには宣言された`paths`のsurfaceも、relationshipも、extraction diagnosticも存在しない。)*

### 実装

- [X] T433 [US2] 本phaseが依拠するClaude ruleのcomposition
  recordを`src/shared/registries/runtime-composition.ts`でそのまま維持し、strategy IDもrelationship
  recordも追加しない *(2026-08-21修正: `claude.rules.layering`は、それが合成する2つのstatementとともにinventory
  phase（T423）で出荷済みである。MCPとCodexの先例がstrategy IDを置く場所がそこであり、relationship extractorはどのvendorにも出荷されない。)*
- [X] T434 [US2] 認識されたClaude rule fileのauthored document全体をdetailから配信し、extractorもscanの変更も追加しない
  *(2026-08-21修正: ruleはauthorが書いた1つのdocumentとして、frontmatter blockを含めて表示するため、そこから何も読み出さない —
  このkindには宣言された`paths`のsurfaceも、relationshipも、extraction diagnosticも存在しない。)*
- [X] T435 [US2] Codex rule phaseが作成したそのkind自身のdetail route（`src/app/pages/`）でClaude rule fileを配信する
  *(2026-08-21修正: routeはvendor中立 — fileのpath、認識したproduct、document全体 — であるため、2つ目のvendorのrule
  fileに専用のtyped fieldは要らない。routeが得たのはMarkdownの色付けであり、それはpathがすでに解決する。)*

---

## フェーズ 38A: Permission policy のshape

**目的**: Vendorがcarrierの中でpolicyを宣言するより先に、permissions kindへpolicyが必要とするrowとdetailのshapeを与える。 *(2026-08-22挿入: 38Aと番号を付けるのは、取り下げたフェーズ39が自身の番号を保つのと同じ理由で、以降のフェーズが自身の番号を保つためである。)*

**独立テスト**: Codexのpermission policyとClaudeのruleを開き、それぞれが自身のfunctionとpageで配信されること — policyは`get-permission-policy-detail`で、`get-file-detail`はそのpathを差し控えること — を、一覧を変えずに確かめる。

**目に見えるチェックポイント**: どちらの画面も以前とまったく同じに動作し、permissions rowがfileであると述べるコードがどこにもない。

**Shape**: Permissions rowが名指すのはfileではなくpolicyであるため、rules inventoryのrow型も`FileDetail` variantも持たない *(2026-08-22: settings documentの1 blockとして宣言されるpolicyに対してfile形のrowとdetailは誤りであり、rulesとrow型を共有することは異なる2つの主題を1つだと述べることになる)*。Policyのdetailは、MCP carrierの宣言がそうであるのとまったく同じく独自のRPC resultである（contracts/http-api.md § get-permission-policy-detail）。2つのrowと2つのfilterはgenericで共有せずkindごとに書き下す: 今日共通なのはgrouping loopだけであり、一方が得た事実を他方が答えられなくなった時点で共有は壊れるからである。

### テストを先に

- [X] T1100 [P] [US1] 登録済みcatalogとview-state surfaceのassertionに、policy functionと独自のdetail
  slotを追加する。対象は`tests/contract/http-api-routes.test.ts`、`tests/contract/host-startup.test.ts`、`tests/unit/app/authored-content.test.ts`
- [X] T1101 [P] [US2] Codex
  policyを自身のfunction経由でassertし、`get-file-detail`がそのpathを差し控えることを証明する。対象は`tests/integration/security/zero-activation.test.ts`

### 実装

- [X] T1102 [US1] Rulesとpermissionsの各inventoryに、自身のrow型・projection・filter・row
  componentを与える。対象は`src/shared/api-types.ts`、`src/server/session/session.ts`、`src/app/composables/filters.ts`、`src/app/components/inventory/InventoryList.vue`、`src/app/components/inventory/rows/`
- [X] T1103 [US2] Permission policyを`FileDetail`
  variantではなく`get-permission-policy-detail`自身のresultとして公開し、MCP
  carrierと同じく`get-file-detail`からは差し控える。対象は`src/shared/api-types.ts`、`src/shared/api-text.ts`、`src/server/session/session.ts`、`src/server/host/devframe-app.ts`、`src/app/session/api-client.ts`、`src/app/session/view-state.ts`、`src/app/composables/page-ownership.ts`
- [X] T1104 [US2] Permissions routeにそのresultを読む自身のpageを与え、rules routeを自身のpageへ戻し、共有していたfile detail
  frameを削除する。対象は`src/app/pages/`と`src/app/components/`

---

## フェーズ 38B: レビュー由来の修正

**目的**: 出荷済みphaseのレビューが見つけたものを直す: 2つのkindが認識するfileでdetail routeが行き止まりになる問題、surfaceを伴わずに公開されるrecognition、authoredな名前で例外を投げるroute encoder、そして自身のevidenceが支えていない記述。 *(2026-08-22挿入: 38Bと番号を付けるのは、以降のフェーズが自身の番号を保つためである。)*

**独立テスト**: rulesとinstructionsの両一覧に載るfileについて`/rules/.claude/rules/CLAUDE.md`を開いてdocumentが表示されること、skill rowとskill detailで各definitionのsurfaceが製品の隣に表示されること、孤立surrogateを含むpath segmentがdetail routeを往復することを確かめる。

**目に見えるチェックポイント**: すべてのinventory rowが開き、画面上のすべてのrecognitionが、そのadmissionが依拠するsurfaceを述べる。

### 実装

- [X] T1117 [US2]
  2つのkindが認識するfileのdetailを、どちらのkindのrouteからも配信し、1つのfileがこれらのkindを2つ持ち得ることを記録する。対象は`src/app/pages/rules/detail/[source]/[...path].vue`、`src/server/session/session.ts`、`tests/e2e/claude-rules-detail.spec.ts`
- [X] T1118 [US1] 各skill definitionのsurfaceを公開し、skill rowとskill
  detailで描画する（FR-009）。対象は`src/shared/api-types.ts`、`src/server/session/session.ts`、`src/app/components/inventory/rows/SkillRow.vue`、`src/app/pages/skills/detail/[source]/[...path].vue`、および`contracts/http-api.md`と`data-model.md`の両言語
- [X] T1119 [US1] Detail routeの各path segmentをpercent-encodeする前にwell-formedなtextとして綴り、各catch-all
  routeがdecodeする場所でそのescapeを戻す。対象は`src/app/components/detail-route.ts`、`src/app/components/mcp-detail-route.ts`、`src/app/pages/`配下の5つのcatch-all
  page、`tests/unit/app/mcp-detail-route.test.ts`
- [X] T1120 [US1] 自身のevidenceが支えていない記述を訂正する — `.claude/rules/`に関する絶対的なCopilot reachの主張、Claude user
  rulesの再帰、rule detailがもう公開しない`paths`値、完了済みrules phaseの改名された成果物、取り下げたruleの比較、release
  gateのtask/phase件数。対象は`src/shared/registries/claude/rules.ts`、`src/shared/registries/claude/behaviors.ts`、`src/shared/registries/codex/behaviors.ts`、`tests/fixtures/conformance/vendor-behaviors.json`、および`spec.md`、`data-model.md`、`tasks.md`、`contracts/vendors/claude-code.md`の両言語
- [X] T1121 [US2] 各detailが表示するfileをこのproductの外で開く手段を、read
  outcomeの隣に提示する。対象は`src/server/session/session.ts`、`src/shared/api-types.ts`、`src/app/pages/`配下の5つのdetail
  page、および`spec.md`と`contracts/http-api.md`の両言語。あわせて、開けることによって事実でなくなるinventory
  taglineの「何も実行しない」という記述を削除する *(amended 2026-08-22:
  pageが辿るlocatorを公開するのではなく、readerが選んだapplicationでhostが開くようにしたため、このsurfaceとそのfileはT1123が所有する。)*

---

## フェーズ 39: Rules の比較（取り下げ）

**2026-08-21 取り下げ**: 本productの比較は1つの同一性の2つのコピー — skill名、宣言されたserver名、1つの適用範囲が担当するfile群 — を並べるものであり、rule kindにはその同一性が無い: 一覧の単位がfile自身であるため、2つのrule fileは1つのruleの2つのコピーではなく2つのruleであり、modelが表現しない組は比較せず報告する（FR-011、spec.md § Clarifications Session 2026-08-14）。rule fileからは何も読み出さないため、他のkindが共有するserialized documentの比較に使う宣言metadataも存在しない。以降のphase番号を保つため、phase番号は残す。

---

## フェーズ 39A: Claude Permissions carrier

**目的**: Settings carrierの中で宣言されるClaude permission policyを追加する。 *(2026-08-22挿入: 39Aと番号を付けるのは、取り下げたフェーズ39が自身の番号を保つのと同じ理由で、以降のフェーズが自身の番号を保つためである。)*

**独立テスト**: Rootの`.claude/settings.json`と`.claude/settings.local.json`で宣言された`permissions` blockを認識し、blockを宣言しないsettings fileがpermissions rowに現れないことを証明し、宣言されたblockを周囲のsettings keyなしで開き、Codexのwhole-document policyが変わらないことを確かめる。

**目に見えるチェックポイント**: Permissions一覧が両vendorのpolicyを保持し、Claudeのものを開くと、それを運ぶfileではなくcarrierが宣言したblockが表示される。

**Shape**: Policy detailはここで`form`判別子を得る。それを意味あるものにするmemberと同時である: policy自体であるfileには`whole-document`、carrierには`declared-block`で、後者はblockを公開し周囲のbytesは決して公開しない（contracts/http-api.md § get-permission-policy-detail）。

### テストを先に

- [X] T1105 [US1] 宣言された`permissions` block、blockを宣言しないsettings
  file、`.claude/settings.local.json`、strict JSONが拒否するcarrier、資格情報と環境変数参照を含むblock、root以外のnear
  missのfixtureを`tests/fixtures/repositories/build-fixtures.ts`に作成する
- [X] T1106 [US1] Claude settingsのbehavior、`claude.repo.permissions`
  candidate、`claude.settings.precedence` composition、およびそれらのevidence
  rowを`tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`に実体化する
- [X] T1107 [P] [US1] Blockを宣言するcarrierが`permissions`
  recognitionを得ること、宣言しないものが何も得ないこと、どちらも他のtoolに認識されないことを証明する失敗テストを`tests/unit/inspection/rules.test.ts`と`tests/unit/inspection/recognizers.test.ts`に追加する
- [X] T1108 [P] [US1] 宣言されたblockのextractionに対する失敗テスト — authoredなobjectが持つ全entryをparserの解決順で、nested
  valueを再帰的に、strict JSONが拒否するcarrierではall-or-nothingで失敗すること —
  を`tests/unit/inspection/claude-metadata.test.ts`に追加する
- [X] T1109 [P] [US2]
  宣言されたrule文字列が書かれたとおりの文字のままであり、tool・command・path・domainのいずれも解決せず、評価も強制もしないことを証明する失敗テストを`tests/integration/security/zero-activation.test.ts`に追加する
- [X] T1110 [US2] reciprocal contract referenceを備えた、失敗するClaude permissions runtime-composition graph
  coverageを`tests/contract/runtime-composition.test.ts`に追加する
- [X] T1111 [US1] 1つのpermissions inventoryに両vendorのpolicyが並ぶこと、宣言されたblockが周囲のsettings
  keyなしで表示されること、資格情報と環境変数参照が正確にリテラル表示されること、blockを宣言しないsettings fileがpermissions rowに現れないことのbrowser
  acceptanceを`tests/e2e/claude-permissions.spec.ts`に追加する

### 実装

- [X] T1112 [US1]
  `claude.behavior.repo.settings`、`claude.behavior.user.settings`、およびそれらを合成する`claude.settings.precedence`
  strategyを`src/shared/registries/claude/behaviors.ts`と`src/shared/registries/claude/strategies.ts`に追加する
  *(2026-08-22修正: 2つのproject fileは2つのstatementである — shared fileはproject folderに留まり、personal
  fileはClaude Codeが4つの記載された例外つきでgit repository rootに置く —
  ため、`claude.behavior.repo.settings.shared`と`claude.behavior.repo.settings.local`として出荷する。)*
- [X] T1113 [US1] `claude.repo.permissions` candidateをsettings carrier自身のpathの隣に、relations catalog
  entry、identifier宣言、evidence
  citationとともに`src/shared/registries/claude/rules.ts`、`src/shared/registries/claude/relations.ts`、`src/shared/registries/identifier-types.ts`へ追加する
- [X] T1114 [US1] Strict JSON carrierから宣言された`permissions`
  blockを読み出し、recognitionのextractionとして公開する。blockを宣言しないcarrierにはpermissions
  recognitionを生成しない。対象は`src/server/inspection/rules/claude.ts`と`src/server/inspection/recognizers/candidate.ts`
- [X] T1115 [US2] Policy detailに`form`判別子とその`declared-block` member —
  carrierのcontent-freeなfileの事実と宣言されたblockであり、source textは決して含まない — を追加し、permissions
  pageで描画する。対象は`src/shared/api-types.ts`、`src/server/session/session.ts`、`src/app/pages/permissions/detail/[source]/[...path].vue`
- [X] T1116 [US1] Admit済みで読めるfileがどのkindの一覧にも載らないときに、scanがbyteを使えなかったと報告しないよう、inventoryのno-kind
  copyを一般化する。対象は`src/app/pages/index.vue`

---

## フェーズ 40: Claude Commands のインベントリ

**目的**: ルートの Claude legacy-command ファイルとその再帰的な namespace を追加する。 *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、skill同等のancestor/lazy-descendant command traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*

**独立テスト**: `['.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]`、再帰的な namespace path、duplicate name、link、サブディレクトリの `.claude/commands` を含む near miss、未対応の standalone `.claude/prompts` をインベントリで確認する。 *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、skill同等のancestor/lazy-descendant command traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*

**目に見えるチェックポイント**: ユーザーは再帰的な namespace を備えた Claude command をフィルタリングできる。

### fixture とテストを先に

- [X] T440 [US1] recursive namespace、duplicate name、不正な metadata、secret、reference、link、未対応の
  `.claude/prompts`、サブディレクトリの `.claude/commands` を含む near miss を対象とする Claude command fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-20修正:
  先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、skill同等のancestor/lazy-descendant
  command
  traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T441 [US1] exclusion ID を定義せず、Claude command の
  behavior、candidate、composition、relationship、path-negative case、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-22修正: 新しい rule と strategy の edge
  も具体化されるため、`tests/fixtures/conformance/relations.json` も同じ再生成の一部である。)*
- [X] T442 [US1] recursive Claude command、namespace construction、サブディレクトリの `.claude/commands`
  の拒否、除外された standalone `.claude/prompts` に関する失敗する matcher/recognition テストを
  `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
  *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant
  anchorが必要であり、skill同等のancestor/lazy-descendant command
  traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T443 [US1] Claude command inventory、namespace、filter、exclusion、診断に関するブラウザー受け入れテストを
  `tests/e2e/claude-commands-inventory.spec.ts` に追加する

### 実装

- [X] T444 [US1] command selection が参照する前に、Claude command lookup statement と読み取り権限を付与しない
  `claude.behavior.user.commands` を `src/shared/registries/vendor-behaviors.ts` に追加する
  *(2026-08-22修正: `src/shared/registries/vendor-behaviors.ts` の集約は vendor ごとの module から組み立てられるため、2つの
  statement は `src/shared/registries/claude/behaviors.ts` に記述され、そこから集約へ届く。)*
- [X] T445 [US1] exclusion ID を定義せず、prompt、User、configured-location path を path-negative
  のままにして、root-anchored な `claude.repo.command` candidate だけを
  `src/shared/registries/inspection-rules.ts` に追加する *(2026-08-20修正:
  先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、skill同等のancestor/lazy-descendant
  command
  traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*
  *(2026-08-22修正: `src/shared/registries/inspection-rules.ts` の集約は vendor ごとの module
  から組み立てられるため、candidate は `src/shared/registries/claude/rules.ts` に記述され、そこから集約へ届く。)*
- [X] T446 [US1] Claude command evidence record と affected-contract reference を 対象registry
  recordの`evidence` citation に追加する *(2026-08-22修正: citation は
  `https://code.claude.com/docs/en/skills` と `1.0.45`/`1.0.51` の changelog entry
  に依拠し、`specs/001-inspect-agent-customizations/contracts/official-sources.md` と
  `official-sources.ja.md` のそれぞれの row は同じ変更で reviewed heading と更新した review 日付を得た。)*
- [X] T447 [US1] root-anchored な Claude command matching と namespace recognition を
  `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant
  anchorが必要であり、skill同等のancestor/lazy-descendant command
  traversalは未文書化のため、`claude.repo.command`はroot-anchoredでサブディレクトリの`.claude/commands`はニアミスとなる。同じ変更でcontract行を修正した。)*
  *(2026-08-22修正: matching は compile 済み plan だけのものであるため、`src/server/inspection/rules/claude.ts` は
  walker を持たない。この module が得るのは、この kind 固有の問い — 読み手が起動する名前 — に答える unit であり、その名前は matched path
  から導出する。Claude Code が command file の `name` key
  を無視するためである。`src/server/inspection/recognizers/candidate.ts` はこの kind の factory を得て、admit した rule
  にその名前を問い、declaration は共有の Markdown parse から読む。)*
- [X] T448 [US1] command inventory row と、英語の Claude namespace メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-22修正: row は読み手が起動する名前で group
  化する。skill row と同じ形である。したがって `src/app/components/inventory/rows/PromptRow.vue` は各 row
  をその名前で見出し、その下に `(file, tool)` ごとの definition を並べ、各 definition が file の Source 相対 Path と認識した
  product を述べる。namespace は独立したメッセージではなく名前の一部である。)*

---

## フェーズ 41: Claude Commands の詳細

**目的**: 完全な literal Claude command source、namespace、invocation、非活性な relationship detail を追加する。

**独立テスト**: 不正な Claude command を開き、recursive namespace、正確な解決済みの値、非活性な agent/skill reference、診断、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Claude command を選択すると、参照先を実行、import、read せずに完全で非活性な詳細を開ける。

### テストを先に

- [X] T449 [P] [US2] file が書いた宣言とその agent/skill reference に関する失敗する Claude command metadata テストを
  `tests/unit/inspection/claude-metadata.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T450 [P] [US2] Claude command body と reference が target を実行、navigate、import、read
  しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T451 [US2] reciprocal contract reference を備えた、失敗する Claude command runtime-composition graph
  coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [X] T452 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Claude command
  detail、namespace、reference、diagnostics に関するブラウザー受け入れテストを
  `tests/e2e/claude-commands-detail.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*

### 実装

- [X] T453 [US2] Claude command selection、namespace、skill precedence、relationship strategy を
  `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-22修正:
  `src/shared/registries/runtime-composition.ts` の集約は vendor ごとの module
  から組み立てられるため、`claude.commands.selection` は `src/shared/registries/claude/strategies.ts` に記述し、その
  edge は `src/shared/registries/claude/relations.ts` に置く。記録するのは文書化された唯一の帰結 — 同名 skill が command
  に優先する — であり `select-first` として表す。namespace と relationship は composition の step
  ではなく、relationship-only record も出荷しない。)*
- [X] T454 [US2] Claude command metadata、reference、正確な解決済みの値の保持向けの Markdown extraction と scan
  integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-22修正:
  `src/server/inspection/parsers/markdown.ts` も `src/server/inspection/scan.ts` も変更を要さない: 他の 2 つの
  frontmatter 主導 kind が既に共有する 1 回の Markdown extraction が command file の宣言をそのまま解決し、scan は既に
  recognition を kind ごとに束ねている。この phase が追加するのは `src/server/inspection/recognizers/candidate.ts`
  にあるこの kind 自身の factory であり、prompt から reference は読み出さない。)*
- [X] T455 [US2] 型付き Claude command 詳細フィールドをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する
- [X] T456 [US2] 英語の Claude command 詳細と reference メッセージをそれらを描画する Vue component に追加する *(2026-08-08修正:
  detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-22修正: copy
  は描画される場所、すなわち `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue` に記述する。出荷済みのどの
  recognition も edge を生まず、prompt が挙げる名前は text のままであるため、reference メッセージは出荷しない。)*

---

## フェーズ 42: Copilot Commands のインベントリ

**目的**: root direct-child の `.claude/commands/*.md` だけを対象とする保守的な Copilot CLI command recognition を追加する。

**独立テスト**: root direct-child command をインベントリに含め、nested command と未対応の User/configured location を拒否し、同じ物理 Claude ファイルを保持し、より広い Copilot command traversal を創作しない。

**目に見えるチェックポイント**: ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。

### fixture とテストを先に

- [X] T457 [US1] root direct child、nested exclusion、duplicate name、共有 Claude file、不正な
  metadata、secret、reference、User/configured path、near miss を対象とする Copilot command fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T458 [US1] 無関係な exclusion ID を関連付けず、Copilot CLI command behavior、保守的な candidate、path-negative
  configured/User case、composition、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-22修正: 新しい rule の edge も具体化されるため、`tests/fixtures/conformance/relations.json`
  も同じ再生成の一部である。)*
- [X] T459 [P] [US1] root direct-child Copilot command、nested rejection、共有 Claude file、創作された
  ancestor/User matcher がないことに関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts`
  と `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T460 [US1] Copilot command row、nested exclusion、診断、保持された Claude command に関するブラウザー受け入れテストを
  `tests/e2e/copilot-commands-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T461 [US1] 読み取り権限を持たない Copilot CLI command lookup statement を
  `src/shared/registries/vendor-behaviors.ts` に追加する *(2026-08-22修正: `copilot.behavior.cli.commands`
  は skill phase で既に出荷済みである。`copilot.cli.skills.selection` がこれを composeするためで、文書化された帰結は「同名 skill が
  legacy command に優先する」であり、優先される対象の command surface なしには述べられない。したがって
  `src/shared/registries/vendor-behaviors.ts` の集約はここで何も得ず、既に持つ statement が新しい rule の依拠先である。)*
- [X] T462 [US1] 無関係な exclusion ID を定義または参照せず、configured/User location を path-negative のままにして、保守的な
  `copilot.repo.command` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
  *(2026-08-22修正: `src/shared/registries/inspection-rules.ts` の集約は vendor ごとの module
  から組み立てられるため、candidate は `src/shared/registries/copilot/rules.ts` に記述され、そこから集約へ届く。)*
- [X] T463 [US1] Copilot command evidence record と affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T464 [US1] Copilot の root direct-child command matching と recognition を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-22修正: matching は compile 済み plan だけのものであるため、`src/server/inspection/rules/copilot.ts`
  が得るのはこの kind 固有の問い — command 名 — に答える unit である。CLI reference はこれを file 名から導出し、namespace
  を与えない。`src/server/inspection/recognizers/candidate.ts` に Copilot 固有の変更は要らない: recognizer は vendor
  非依存であり、admit した rule ごとにその product 自身の答えを既に問うている。)*
- [X] T465 [US1] Copilot command classification と、一度だけ読み取る shared-file assembly を
  `src/server/inspection/scan.ts` に統合する *(2026-08-22修正: `src/server/inspection/scan.ts` に変更は要らない:
  発見した各 file を既に 1 回だけ読み、その file に対する全 tool の admission を 1 回の recognition 呼び出しへ渡している。これが root
  command を 1 read・2 recognition にしている当のものである。)*
- [X] T466 [US1] inventory row と、英語の Copilot CLI command メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-22修正: Copilot 固有のメッセージは出荷しない:
  `src/app/components/inventory/rows/PromptRow.vue` は各 definition 自身の product と surface を述べるため、両
  product が認識する file は、どちらの product についての文もなしに 1 row の 2 definition として読める。)*

---

## フェーズ 43: Copilot Commands の詳細

**目的**: 完全な literal Copilot CLI command detail を追加する。

**独立テスト**: 不正な root command file を開き、invocation、非活性な reference、正確な解決済みの値、diagnostics、detail-state cleanup を、Claude runtime の前提を import せずに検証する。

**目に見えるチェックポイント**: Copilot command を選択すると、完全で非活性な CLI-qualified detail が表示される。

### テストを先に

- [X] T467 [P] [US2] invocation、同名 skill priority、direct-child provenance、不明な ancestry、reference、正確な
  evidence に関する失敗する Copilot command metadata テストを `tests/unit/inspection/copilot-metadata.test.ts`
  に追加する
- [X] T468 [P] [US2] Copilot command body、reference、navigation、import、target read に関する失敗する
  zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T469 [US2] reciprocal contract reference を備えた、失敗する Copilot command runtime-composition graph
  coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [X] T470 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Copilot command
  detail、invocation、reference、diagnostics に関するブラウザー受け入れテストを
  `tests/e2e/copilot-commands-detail.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*

### 実装

- [X] T471 [US2] この phase が記録する Copilot command の skill-precedence と relationship strategy を
  `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-22修正:
  `src/shared/registries/runtime-composition.ts` に strategy は追加しない: 文書化された帰結「同名 skill が command
  に優先する」は `copilot.cli.skills.selection` のものであり、その strategy は既に command behavior を consumeしている。2 つ目の
  record は、どの page も確立していない edge を述べることになる。)*
- [X] T472 [US2] exact metadata、relationship、診断、evidence を備えるよう Copilot command recognition を
  `src/server/inspection/recognizers/candidate.ts` で拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-22修正:
  `src/server/inspection/recognizers/candidate.ts` に Copilot 固有の変更は要らない: command factory は既に、共有された 1
  回の parse が解決した declaration と、admit した rule が答えた名前を公開しており、出荷済みのどの recognition も relationship の edge
  を生まない。)*
- [X] T473 [US2] Copilot command parsing、正確な解決済みの値の保持、非活性な reference、完全な authored source を保持しつつ行う
  parser scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する *(2026-08-22修正:
  T465 に記した理由と同じく `src/server/inspection/scan.ts` に変更は要らない: read、decode、`(file, kind)` ごとの 1 回の
  parse は既に vendor 非依存であり、完全な著述 source は detail route が提供する。)*
- [X] T474 [US2] 型付き詳細と、英語の Copilot command reference メッセージをそのkind自身のdetail route（`src/app/pages/`
  配下） で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-22修正:
  `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue` は既に両 product に対応している: どの tool
  固有の事実もそのページが示す内容を分けないため、detail は path だけで指定され、name row をまたいでその file の definition を集め、row が group
  化される名前とともに認識した全 product を述べる。出荷済みのどの recognition も edge を生まないため、reference メッセージは出荷しない。)*

---

## フェーズ 44: 統合 Commands インベントリ

**目的**: 正しい root-shared および nested-Claude-only recognition により、Claude と Copilot の command candidate を統合する。

**独立テスト**: root direct-child の `.claude/commands/*.md` について一つの物理 item/read と二つの recognition、nested command について Claude-only recognition、決定論的な namespace/provenance、filter、exclusion、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証する。

**目に見えるチェックポイント**: ユーザーは共有 root command と nested Claude-only command を区別できる。

### テストを先に

- [X] T475 [US1] recursive Claude namespace、root の Copilot-compatible command、nested Claude-only
  file、duplicate name、secret、reference、injected throw/rejection、near miss を対象とする command fixture を
  `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [X] T476 [US1] 両ベンダー、shared recognition、exclusion ID を伴わない path-negative configured/User
  case、composition、relationship、evidence の command conformance row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる *(2026-08-22修正: rule の edge も具体化されるため、`tests/fixtures/conformance/relations.json`
  も同じ再生成の一部である。)*
- [X] T477 [US1] root の共有 direct child、nested Claude-only command、namespace construction、除外された
  `.claude/prompts` に関する完全な matcher/recognition-matrix テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T478 [P] [US1] 一度だけ読み取るroot command、決定論的なrecognition/provenance
  order、fileに閉じたoutcomeだけのpartial continuity、attemptをabortしてitem、recognition、derived
  result、scan-result record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected
  fileに閉じないfailure、referenced-target
  readなしに関する失敗する統合テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T479 [US1] 統合 command inventory、namespace、shared recognition、nested Claude-only
  row、filter、診断に関するブラウザー受け入れテストを `tests/e2e/commands-inventory.spec.ts` に追加する

### 実装

- [X] T480 [US1] 一度だけ読み取る root command assembly、nested Claude-only recognition、決定論的な
  provenance、exclusion を `src/server/inspection/scan.ts` で完成させる *(2026-08-22修正:
  `src/server/inspection/scan.ts` に変更は要らない: 発見した file ごとに 1 read、その file に対する全 tool の admission を運ぶ
  1 回の recognition 呼び出しは、既に scan が行っていることである。決定的な順序は projection
  のものであり、`src/server/session/session.ts` が各名前の definition を Source 相対 Path 順、次に契約された tool 順で並べる。)*
- [X] T481 [US1] command inventory row と、英語の namespace、shared-tool、exclusion メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-22修正:
  `src/app/components/inventory/rows/PromptRow.vue` に shared-tool や exclusion のメッセージは出荷しない: 共有 file
  は実際にそうであるがゆえに 1 row の 2 definition として読め、除外された場所はどの selector も到達しない path であるから単に存在せず、namespace は
  row の見出しである名前の一部であって独立したメッセージではない。)*

---

## フェーズ 45: Commands の比較（取り下げ）

**2026-08-22 取り下げ**: 比較サーフェスは kind 固有であり（spec.md § Clarifications Session 2026-08-14）、Copilot prompt は独立した kind ではない — `prompt/command` は受理済みの VS Code prompt と root 直下の CLI command の両方を覆う1つの kind である（contracts/vendors/github-copilot.md § Normative initial-release presentation allowlist）。1つの kind には1つのサーフェスであり、比較サーフェスはその kind のすべての location が inventory と detail を得た後に来る。他の family の比較がそれぞれ自分の family の後に並ぶのと同じである: Copilot prompt の location はフェーズ46と47で到着するため、フェーズ48が kind 全体に対する唯一のサーフェスを設計する。以降のフェーズが自身の番号を保てるようフェーズ番号は残し、T482–T485 は欠番とする。

---

## フェーズ 46: Copilot Prompts のインベントリ

**目的**: 対応する Copilot prompt ファイルをインベントリに追加する。

**独立テスト**: direct `.github/prompts/*.prompt.md` ファイルをインベントリに含め、nested candidate と configured-location candidate を除外する。

**目に見えるチェックポイント**: ユーザーは対応 Copilot prompt をフィルタリングできる。

### fixture とテストを先に

- [X] T486 [US1] direct child、nested near miss、不正な metadata、secret、link、`#file` reference、image、URI
  を対象とする Copilot prompt fixture を `tests/fixtures/repositories/build-fixtures.ts`
  に作成する（2026-08-22修正: VS Code promptはcommand fileと同じ`prompt/command`
  kindであり、promptとcommandが1つの名前に解決される様子を示すには1つのtreeが要るため、prompt
  fileは専用のbuilderではなく`buildCommandFixture`に加える。）
- [X] T487 [US1] prompt row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T488 [US1] 正確な default prompt location、nested exclusion、configured-location uncertainty
  に関する失敗する matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T489 [US1] Copilot prompt inventory と exclusion に関するブラウザー受け入れテストを
  `tests/e2e/prompts-inventory.spec.ts` に追加する *(2026-08-22修正: Copilot prompt は `prompt/command` kind
  であり、その inventory、row component、detail route
  はフェーズ40–44で既に出荷済みである（`src/app/components/inventory/rows/PromptRow.vue` と
  `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue`）。このタスクは2つ目のサーフェスではなく、その既存サーフェスへ
  rule 自身の到達範囲を足す。導出した名前が command と一致する prompt は、その名前の既存 row に加わる。)*

### 実装

- [X] T490 [US1] prompt 詳細と後続の User-runtime exclusion が参照する前に、Copilot prompt lookup statement
  と読み取り権限を付与しない `copilot.behavior.vscode.user.prompts` を `src/shared/registries/vendor-behaviors.ts`
  に追加する
- [X] T491 [US1] 無関係な exclusion ID を定義または参照せず、configured/User/non-default location を path-negative
  のままにして、`copilot.repo.prompt` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [X] T492 [US1] prompt evidence record と affected-contract reference を 対象registry recordの`evidence`
  citation に追加する
- [X] T493 [US1] Copilot prompt matching と recognition を `src/server/inspection/rules/copilot.ts` と
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T494 [US1] prompt inventory row と、意味的に同等な location/exclusion メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-22修正: Copilot prompt は
  `prompt/command` kind であり、その inventory、row component、detail route
  はフェーズ40–44で既に出荷済みである（`src/app/components/inventory/rows/PromptRow.vue` と
  `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue`）。このタスクは2つ目のサーフェスではなく、その既存サーフェスへ
  rule 自身の到達範囲を足す。導出した名前が command と一致する prompt は、その名前の既存 row に加わる。)*

---

## フェーズ 47: Copilot Prompts の詳細

**目的**: 完全な literal prompt source、invocation、非活性な reference detail を追加する。

**独立テスト**: 不正な prompt を開き、正確な解決済みの値の保持、明示的な invocation、reference、URI/image/navigation の動作がないこと、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: Copilot prompt を選択すると、参照先へ移動したり読み取ったりせずに完全で非活性な詳細を開ける。

### テストを先に

- [X] T495 [P] [US2] file が書いた宣言、その reference、evidence に関する失敗する prompt metadata テストを
  `tests/unit/inspection/copilot-metadata.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T496 [P] [US2] prompt の link、image、URI、`#file` target が移動も read の認可もしないことを証明する失敗テストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T497 [US2] reciprocal contract reference を備えた、失敗する prompt runtime-composition graph coverage を
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T498 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal prompt detail と非活性な reference
  に関するブラウザー受け入れテストを `tests/e2e/prompts-detail.spec.ts` に追加する

### 実装

- [X] T499 [US2] この phase が記録する prompt の relationship strategy を
  `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*（2026-08-22修正:
  このruleはstrategyを記録しない。読み手がpromptを手で起動するため、behaviorはstrategyが記述すべき組み合わせを文書化しておらず、作り出せばどのpageも述べていない主張をgraphへ持ち込むことになる。代わりに`tests/contract/runtime-composition.test.ts`が空listを検証する。）
- [X] T500 [US2] prompt metadata、非活性な reference、正確な解決済みの値の保持向けの Markdown extraction と scan
  integration を `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*（2026-08-22修正:
  どちらのmoduleも変更しない。prompt fileはfrontmatter
  blockを持つMarkdownであり、共有の唯一のextractionが既に読み、scanが既にkindで振り分けているため、prompt専用の経路は同じbytesを読む2つ目のreaderになるだけである。）
- [X] T501 [US2] 型付き prompt 詳細フィールドをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する *(2026-08-22修正:
  Copilot prompt は `prompt/command` kind であり、その inventory、row component、detail route
  はフェーズ40–44で既に出荷済みである（`src/app/components/inventory/rows/PromptRow.vue` と
  `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue`）。このタスクは2つ目のサーフェスではなく、その既存サーフェスへ
  rule 自身の到達範囲を足す。導出した名前が command と一致する prompt は、その名前の既存 row に加わる。)*
- [X] T502 [US2] 英語の prompt 詳細、invocation、reference メッセージをそれらを描画する Vue component に追加する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-22修正: Copilot prompt は
  `prompt/command` kind であり、その inventory、row component、detail route
  はフェーズ40–44で既に出荷済みである（`src/app/components/inventory/rows/PromptRow.vue` と
  `src/app/pages/prompts-and-commands/detail/[source]/[...path].vue`）。このタスクは2つ目のサーフェスではなく、その既存サーフェスへ
  rule 自身の到達範囲を足す。導出した名前が command と一致する prompt は、その名前の既存 row に加わる。)*

---

## フェーズ 48: Prompts と Commands の比較

**目的**: kind のすべての location が inventory と detail を得たうえで、literal および型付きの差分を備えた `prompt/command` kind 自身の比較サーフェスを設計する。

**独立テスト**: Readableなcurrent-generationのこの kind の file を正確に2つ比較し、完全なliteral sourceに加えて、整列したinvocation nameとreferenceを検証する。

**目に見えるチェックポイント**: prompt および command ファイルを実行せずに比較できる。

### テストを先に

- [X] T503 [US3] canonical serialized declaration document、invocation name、tool
  recognition、reference に関する comparison の失敗 regression を `tests/unit/app/prompt-comparison.test.ts`
  に追加する *(2026-08-19修正: 宣言済みmetadataはkindごとに1回のfile parseであり、pairごとに1回比較し、その横でtool
  recognitionをtoolごとに比較する。toolはdeclarationの座標ではない（research.md § 7）。)* *(2026-08-08修正: admission はどの
  surface も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)* *(2026-08-21修正:
  宣言済みmetadataはside当たり1つのcanonical serialized
  documentとして比較し、Monacoでdiffする。skill、instruction、MCPの比較の先例に従う（research.md § 7）。)* *(2026-08-22修正:
  1つのkindには1つの比較サーフェスであるため、このタスクは`prompt/command`のすべてのlocationを対象とする:
  フェーズ40–44が出荷したClaudeとCopilotのcommand file、およびフェーズ46がadmitするCopilotのprompt file。フェーズ45はここへ取り下げる。)*
- [X] T504 [US3] credential/environment-reference difference を含む完全な literal diff、canonical
  serialized declaration document、masking/reveal または environment substitution
  なし、型付き差分に関するブラウザー受け入れテストを `tests/e2e/prompts-and-commands-comparison.spec.ts` に追加する
  *(2026-08-21修正: 受け入れテストは両sideのcanonical serialized
  documentをMonacoでdiffした形を検証する。これはどのkindの宣言済みmetadata比較も取る形である（research.md § 7）。)* *(2026-08-22修正:
  kindに対して1つのサーフェスであるため、受け入れテストはcommand同士に加えてpromptとcommandの組も対象とする。)*

### 実装

- [X] T505 [US3] 各sideの宣言済みmetadataを1つのcanonical documentへserializeしてMonacoでdiffし、typed invocation
  state を分離したままにするよう comparison を `src/app/components/prompt-comparison/RecognitionComparison.vue`
  で拡張する。これはこのタスクが skill
  の先例（`src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`）に従って設計・作成する、この
  kind 自身の比較サーフェスの一部であり、T203 が skill について所有するのと同様に、`src/app/components/inventory/rows/` 配下のその kind の
  row component と `src/app/pages/` 配下のその kind の detail route からそこへ到達する entry link を含む
  *(2026-08-19修正: 宣言済みmetadataはkindごとに1回のfile parseであり、pairごとに1回比較し、その横でtool
  recognitionをtoolごとに比較する。toolはdeclarationの座標ではない（research.md § 7）。)* *(2026-08-15修正:
  kind自身の比較サーフェスが所有する — 比較はkind固有で共有moduleを持たず、このタスクがskillの先例に従ってそのサーフェスを設計・作成する（spec.md §
  Clarifications Session 2026-08-14）。)* *(2026-08-21修正: 宣言済みmetadataはside当たり1つのcanonical serialized
  documentとして比較し、Monacoでdiffする。skill、instruction、MCPの比較の先例に従う（research.md § 7）。)* *(2026-08-22修正:
  サーフェスはkindのものであるため、routeは`/prompts-and-commands/compare`とし、moduleはcommandという半分ではなくkindの名で呼ぶ。フェーズ40–44が出荷したinventoryとdetailのサーフェスに合わせる。)*（2026-08-22修正:
  recognitionのcellは、surfaceと名前の横にrecognizedのflagを置くのではなく、そのtoolのdefinitionかnullを保持する。definitionが既に両方の事実を運んでおり、その不在が「このtoolはこのfileを読まない」のすべてであるためである。invocation
  nameは所有する行からではなくinventory全体から集めるので、各cellは自身のtoolが自身のfileを起動する名前を述べる。）
- [X] T506 [US3] 英語の comparison メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 49: Codex Custom Agents inventory

**目的**: 対応する Codex `.codex/agents/*.toml` custom-agent candidate を追加します。

**独立テスト**: ルートの `.codex/agents/` の direct-child TOML agent、duplicate name、サブディレクトリの `.codex/agents` を含む near miss、nested exclusion、link、任意の config-path reference、hosted-state exclusion、traversal uncertainty を inventory 化します。 *(2026-08-20修正: contract行はroot-anchored。ページはルートの`.codex/agents/`を挙げnested searchを文書化していないため、サブディレクトリの`.codex/agents`はこの製品が選択しないruntime-chainメンバーでありニアミスとなる。)*

**目に見えるチェックポイント**: Codex custom-agent file を filter できます。

### fixture とテストを先行

- [X] T507 [US1] ルートの direct child、サブディレクトリの `.codex/agents` の near miss、nested near miss、duplicate
  name、malformed TOML、secret、config-path reference、link、hosted/User exclusion に対する Codex
  custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-20修正:
  contract行はroot-anchored。ページはルートの`.codex/agents/`を挙げnested
  searchを文書化していないため、サブディレクトリの`.codex/agents`はこの製品が選択しないruntime-chainメンバーでありニアミスとなる。)*
- [X] T508 [US1] exclusion ID を定義せず、Codex custom-agent
  behavior、matcher、composition、relationship、path-negative case、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T509 [US1] root-anchored な `codex.repo.agent`、direct-child TOML、nested exclusion、任意の
  config-path promotion なしに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-20修正:
  contract行はroot-anchored。ページはルートの`.codex/agents/`を挙げnested
  searchを文書化していないため、サブディレクトリの`.codex/agents`はこの製品が選択しないruntime-chainメンバーでありニアミスとなる。)*
- [X] T510 [US1] Codex custom-agent inventory、filter、exclusion、diagnostics、agent-owned MCP
  recognition がないことに関するブラウザー受け入れテストを追加し、既存 carrier inheritance は detail 時の relationship だけであることを
  `tests/e2e/codex-custom-agents-inventory.spec.ts` で検証する *(2026-08-08修正: admission はどの surface
  も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T511 [US1] inheritance が参照する前に、Codex custom-agent lookup statement と、読み取り権限を付与しない
  `codex.behavior.user.agents` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T512 [US1] Codex custom-agent candidate record だけを追加し、exclusion ID を定義せずに
  nested、configured、User、managed location を path-negative のままにする処理を
  `src/shared/registries/inspection-rules.ts` に実装する
- [X] T513 [US1] Codex custom-agent evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation に追加する
- [X] T514 [US1] Codex agent matching とclosedなallowlist済みrecognition を
  `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T515 [US1] Codex custom-agent kind に対する inventory row を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-08修正: admission はどの surface
  も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*
- [X] T516 [US1] 英語の Codex custom-agent inventory および exclusion message をそれらを描画する Vue component
  に追加する

---

## フェーズ 50: Codex Custom Agents 詳細

**目的**: 完成済みの Codex MCP carrier をすべての MCP row の owner のままとしつつ、完全で非活性な Codex custom-agent source と spawned-session configuration の detail を追加する。 *(amended 2026-08-22: spawned sessionがcarrierから継承するものは`codex.agents.inheritance`が記録するcompositionのままでどのsurfaceにも到達しないため、本フェーズのdetailはfile自身のメタ情報とinstructionコンテンツを完全なauthored sourceの傍らに示し、relationshipは表示しない。宣言された`mcp_servers` tableはそのfileのmetadata entry 1件である。)*

**独立テスト**: malformed な Codex agent を開き、execution environmentのcapacityだけに従うinert TOML parsing、宣言されたメタ情報としての model/reasoning/sandbox/skill、そのfile自身のmetadata entryとしての`mcp_servers` tableとagent-owned MCP recognitionがないこと、inertな値としてのconfigured path、正確な解決済みの値、diagnostics、detail-state cleanup、zero connection を検証します。 *(amended 2026-08-22: spawned sessionがcarrierから継承するものは`codex.agents.inheritance`が記録するcompositionのままでどのsurfaceにも到達しないため、本フェーズのdetailはfile自身のメタ情報とinstructionコンテンツを完全なauthored sourceの傍らに示し、relationshipは表示しない。宣言された`mcp_servers` tableはそのfileのmetadata entry 1件である。)*

**目に見えるチェックポイント**: Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で非活性な spawned-session detail — 宣言されたメタ情報とinstructionコンテンツが完全なauthored sourceの傍らに — が表示されます。 *(amended 2026-08-22: spawned sessionがcarrierから継承するものは`codex.agents.inheritance`が記録するcompositionのままでどのsurfaceにも到達しないため、本フェーズのdetailはfile自身のメタ情報とinstructionコンテンツを完全なauthored sourceの傍らに示し、relationshipは表示しない。宣言された`mcp_servers` tableはそのfileのmetadata entry 1件である。)*

### テスト先行

- [X] T517 [P] [US2] Codex agent field、recognition-atomicな`recognition-parse-failed`
  diagnosticとなるmalformed input、Inspector-defined numeric capを持たないenvironment-owned parser
  capacity、およびparser、extraction、recognition、item、record、response、partial resultを返さずwhole scan
  attemptへ変更なしのthrow/rejectionを伝播するdomain layerでcatch/classify/retryしないthrow/rejectionに関するinert TOML
  parsingの失敗テストを`tests/unit/inspection/parsers.test.ts`に追加する *(amended 2026-08-22:
  1つのfileに限定されない失敗はkindではなくtraversalとcoordinatorのdoctrineであり、`tests/unit/inspection/relationships.test.ts`でkindに依らず1度だけ証明されている。したがって本taskはTOML
  seam自身のcaseと、`tests/integration/repository-scan.test.ts`におけるfileごとの`recognition-parse-failed`結果を追加し、そのdoctrineをkindごとに複製しない。)*
- [X] T518 [P] [US2] model、reasoning、sandbox、skill、agent-owned MCP recognition を持たない closed MCP
  carrier-origin relationship、config-path relationship、parent inheritance、live sandbox/approval
  reapplication に関する Codex agent の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [X] T519 [P] [US2] Codex agent declaration が tool の実行、process の spawn、MCP への接続、参照 config path
  の読み取りを行わないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts`
  に追加する
- [X] T520 [US2] relationship-only の carrier inheritance、agent-owned MCP recognition
  がないこと、reciprocal contract reference に関する Codex custom-agent runtime-composition graph coverage
  の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [X] T521 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Codex custom-agent detail、agent-owned MCP
  row を持たない carrier-linked MCP inheritance relationship、diagnostics、detail-state cleanup
  に関するブラウザー受け入れテストを `tests/e2e/codex-custom-agents-detail.spec.ts` に追加する *(amended 2026-08-22:
  relationshipは表示しないため、acceptanceは宣言されたメタ情報とinstructionコンテンツを完全なauthored
  sourceの傍らに、そして宣言された`mcp_servers` tableに対するMCP rowもconnectionも無いことを検証する。)*

### 実装

- [X] T522 [US2] 既存のinert TOML carrier parser を Codex agent normalization と extraction で
  `src/server/inspection/parsers/toml.ts` において拡張する *(amended 2026-08-22:
  この読み取りはname・メタ情報・instructionコンテンツを答えるため、`src/server/inspection/rules/codex.ts`の`CodexCompiledAgentRule.agentPresentationOf`に置く:
  `parsers/toml.ts`はformat自身のparseと解決値のrenderingを所有し、agent
  fileのconfigurationがどこで終わりproseがどこから始まるかはadmitしたvendor自身のcontractである。Shapeはfrontmatter
  fenceで分割するMarkdown系productと共有し、`name`は共有recognizerがmetadataから1度だけ読む。)*
- [X] T523 [US2] 既存の Codex config/MCP strategy を relationship-only の agent
  inheritance、spawned-session context、selection、sandbox/approval、agent-owned MCP recognition
  の明示的な禁止で `src/shared/registries/runtime-composition.ts` において拡張する
- [X] T524 [US2] Codex agent metadata、正確な literal carrier-linked MCP inheritance/origin
  relationship、agent-owned MCP recognition ゼロ、connection ゼロ、完全な authored source を保持しつつ行う parser
  scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-22:
  detailはメタ情報とinstructionコンテンツを、両formatが生成する同じshapeで、完全なauthored
  sourceの傍らに公開する。carrier由来のMCP継承は`codex.agents.inheritance`が記録するcompositionのままで、どのsurfaceもそれをprojectしない。宣言された`mcp_servers`
  blockはagent file自身のmetadata entryである。)*
- [X] T525 [US2] typed Codex custom-agent detail をそのkind自身のdetail route（`src/app/pages/` 配下）
  において拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-22:
  detailはinstruction detailに倣う:
  mainタブでメタ情報をYAML、instructionコンテンツをMarkdownとして示し、fileタブでfileをそのまま示す。)*
- [X] T526 [US2] 英語の Codex custom-agent detail message をそれらを描画する Vue component に追加する *(2026-08-23修正:
  surfaceが公開する内容に書き改めた。relationship-only registryはrecordを1つも出荷しないため、pageに届いて表示されるものが無い（FR-009）。)*
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-22:
  relationship messageは追加しない: vendorが継承について文書化する内容は維持されたcontractに留まり、どのsurfaceにも到達しない（FR-009）。)*

---

## フェーズ 51: Claude Custom Agents inventory

**目的**: agent-memory directory を candidate として admission せず、ルートの recursive Claude subagent file を追加します。 *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、subagentのドキュメントはworking directoryからGit repository rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*

**独立テスト**: ルートの `.claude/agents/**/*.md` file、duplicate name、nested な subfolder path、link、malformed content、`--add-dir` runtime fact、サブディレクトリの `.claude/agents` の near miss、除外された agent-memory/User location を inventory 化します。 *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、subagentのドキュメントはworking directoryからGit repository rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*

**目に見えるチェックポイント**: duplicate-name uncertainty を持つ Claude custom agent を filter できます。

### fixture とテストを先行

- [X] T527 [US1] recursive path、duplicate name、malformed metadata、secret、reference、memory
  declaration、link、`--add-dir` fact、サブディレクトリの `.claude/agents` の near miss、除外された memory/User
  location に対する Claude subagent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
  *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant
  anchorが必要であり、subagentのドキュメントはworking directoryからGit repository
  rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T528 [US1] フェーズ 25 で所有済みの Claude Repository agent behavior を再利用し、duplicate behavior または
  exclusion ID を作成せず、残りの agent/User-memory behavior、matcher、path-negative
  case、composition、relationship、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T529 [P] [US1] ルートの recursive な agents directory、サブディレクトリの `.claude/agents` の拒否、duplicate
  name、agent-memory または任意の `--add-dir` candidate なしに関する matcher/recognition の失敗テストを
  `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
  *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant
  anchorが必要であり、subagentのドキュメントはworking directoryからGit repository
  rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T530 [US1] Claude custom-agent row、filter、exclusion、diagnostics、維持される Codex agent
  に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-inventory.spec.ts` に追加する *(2026-08-20修正:
  先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、subagentのドキュメントはworking
  directoryからGit repository rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*

### 実装

- [X] T531 [US1] フェーズ 25 で所有済みの `claude.behavior.repo.agents` と `claude.behavior.user.mcp-state`
  を再利用し、agent context と relationship strategy が参照する前に
  `claude.behavior.user.agents`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`
  だけを `src/shared/registries/vendor-behaviors.ts` に追加する *(amended 2026-08-22:
  3件ではなく5件のstatementをshipする:
  `claude.agent-context.composition`は`claude.behavior.repo.agent-memory.local`と`claude.behavior.repo.agent-memory.project`もcomposeし、どのcatalogも保持しないstatementをstrategyが名指せばcontract
  gateが拒否するdangling edgeになる。5件はいずれもどのruleの`basedOnBehaviors`でもないため、memory
  scopeはcompositionにのみ現れ、read allowlistには到達しない。)*
- [X] T532 [US1] root-anchored な `claude.repo.agent` candidate record だけを追加し、exclusion ID を定義せずに
  memory、User、additional-directory location を path-negative のままにする処理を
  `src/shared/registries/inspection-rules.ts` に実装する *(2026-08-20修正:
  先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、subagentのドキュメントはworking
  directoryからGit repository rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T533 [US1] Claude custom-agent evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation に追加する
- [X] T534 [US1] root-anchored な Claude agent matching とclosedなallowlist済みrecognition を
  `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-20修正: 先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant
  anchorが必要であり、subagentのドキュメントはworking directoryからGit repository
  rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T535 [US1] memory または任意の additional directory を読み取らず、Claude agent classification を
  `src/server/inspection/scan.ts` に統合する *(amended 2026-08-22:
  `src/server/inspection/scan.ts`は変更不要だった: 各vendorのcompiled
  catalogをcomposeするため、新しいruleはshipされることでwalkに加わる。memoryと追加ディレクトリを除外するのはmatcherの仕事であり、`agent-memory`・`agent-memory-local`・選択rootの外のディレクトリに到達するselectorは存在しない。この否定は、scanが再確認するguardではなく`tests/unit/inspection/rules.test.ts`と`tests/integration/repository-scan.test.ts`で証明する。)*
- [X] T536 [US1] Claude agent の inventory row と、英語の agent、exclusion message を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-20修正:
  先頭の`ANY_DIRECTORIES`には文書化されたworked-file/descendant anchorが必要であり、subagentのドキュメントはworking
  directoryからGit repository rootへの上方向walkだけを述べ、全sessionが共有する唯一のメンバーはselected
  rootなので、`claude.repo.agent`はroot-anchoredでサブディレクトリの`.claude/agents`はニアミスとなる。同じ変更でcontract行を修正した。)*
  *(amended 2026-08-22: フェーズ49がshipしたrow
  componentは既にすべてのproductのdefinitionをrenderするため、本taskはproductごとの分岐を追加しない。重複nameの不確実性は、projectされたstatementではなく、そのnameの両definitionを勝者を述べずに並べること
  — `prompt/command`の先例 — で示す:
  strategyの`operations`から導出してもどちらのproductについても何も得られず、順序を付けるrowはvendorが開いたままにしている問いに答えることになる（FR-009）。)*

---

## フェーズ 52: Claude Custom Agents 詳細

**目的**: 完全で非活性な Claude subagent detail — `mcpServers`はagent自身の宣言contentとして含む — を追加し、memory と Hook target は inert のままにします。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: malformed な Claude agent を開き、tool、skill、agent reference、agent自身のcontentとしての`mcpServers`宣言、正確な解決済みの値の保持、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude custom agent を選択すると、memory を読み取ったり MCP に接続したりせず、完全で非活性な宣言とinstructionsが表示されます。 *(2026-08-23修正: surfaceが公開する内容に書き改めた。relationship-only registryはrecordを1つも出荷しないため、pageに届いて表示されるものが無い（FR-009）。)*

### テスト先行

- [X] T537 [P] [US2] context mode、tool、skill、closed MCP/Hook origin、memory scope、nested
  spawning、duplicate-name uncertainty、built-in omission、agent reference に関する Claude agent の失敗テストを
  `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [X] T538 [P] [US2] 独立して admission された skill/agent、除外された memory root、runtime-only input、target
  promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [X] T539 [P] [US2] tool、skill、Hook、MCP、memory、command、link、agent reference に対する zero-activation
  の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T540 [US2] reciprocal contract reference を持つ Claude agent context-composition の失敗 coverage
  test を `tests/contract/runtime-composition.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T541 [US2] 正確な literal credential/environment-reference 表示、process-environment sentinel
  substitution なし、masking/reveal control なし、完全な literal Claude custom-agent
  detail、context、tool、agent自身のcontentとしての`mcpServers`宣言、relationship、diagnostics、zero
  connection、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-detail.spec.ts`
  に追加する

### 実装

- [X] T542 [US2] Claude agent selection、fresh/fork
  context、tool、skill-preload、memory-fact、nested-spawn、relationship strategy を
  `src/shared/registries/runtime-composition.ts` に追加する *(amended 2026-08-22:
  個別に並べるのではなく2つのstrategyをshipする:
  contractはscope順と未解決の同一tree重複について`claude.agents.selection`を、fresh対fork context・tools・skill
  preload・memory scope・nested-spawn
  limitについて`claude.agent-context.composition`を定義している。事実ごとにstrategyを発明すればruntime-composition
  contractが定義しないIDを増やすことになる。)*
- [X] T543 [US2] file が書いた agent の宣言 — `mcpServers`も通常の宣言contentとして含む — 、inert Hook
  origin、relationship、diagnostics、evidence で Claude recognition を
  `src/server/inspection/recognizers/candidate.ts` において拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-22:
  メタ情報とinstructionコンテンツへの分割は、Codexフェーズで定まったとおり、それを所有するruleの傍らの`ClaudeCompiledAgentRule.agentPresentationOf`に置く:
  recognizerはvendor中立のままで、agentを名指すものはadmitしたruleに問う。productによって答えが異なるためである — CodexとClaude
  Codeは宣言された`name`、Copilotのsurfaceはconfiguration file自身の名（T553）。宣言された`hooks`
  blockは、Hookフェーズがそれを所有するcontained recognitionをshipするまでmetadata entry 1件である。)*
- [X] T544 [US2] Claude agent metadata、synthetic file も connection
  も作成しない正確な解決済みの値の保持、relationship-only の memory/Hook target、完全な authored source を保持しつつ行う parser
  scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(amended 2026-08-22: `src/server/inspection/scan.ts`は変更不要だった: agent
  recognitionとそのdetailはrecognizerと`InspectionSession.fileDetail`のものであり、いずれもフェーズ50がshipしている。完全なauthored
  sourceは読み取り可能なcandidateがすべて既に公開している。memoryとhookのtargetは、disposal
  stepではなく、どのselectorも到達しないことでinertなままである。)*
- [X] T545 [US2] typed detail と、英語の Claude agent message をそのkind自身のdetail route（`src/app/pages/` 配下）
  において拡張する *(2026-08-23修正: surfaceが公開する内容に書き改めた。relationship-only
  registryはrecordを1つも出荷しないため、pageに届いて表示されるものが無い（FR-009）。)* *(2026-08-08修正: detail は file
  が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-22:
  このkindのdetail
  routeは1つ、フェーズ50がshipし共有の`AgentPresentationDto`で型付けされた`src/app/pages/agents/detail/[source]/[...path].vue`であり、Claude
  subagentはそれをそのまま開く。relationship messageは追加しない:
  detailはfileが書いた宣言を示し、trust・precedence・order・uncertaintyをprojectしないためである（FR-009、T091）。)*

---

## フェーズ 53: Copilot Custom Agents inventory

**目的**: 別々の VS Code、CLI、Cloud provenance を持つ、対応する Copilot `.github/agents/*.md` と `.claude/agents/*.md` candidate を追加します。

**独立テスト**: 2 つのルート directory の direct-child agent、filename variant、duplicate name、shared Claude file、サブディレクトリの agents directory を含む near miss、runtime-only fact としての hosted organization agent、exclusion としての configured/User location を inventory 化します。 *(2026-08-20修正: すべてのCopilot surfaceがroot-anchoredなagents locationを文書化している（VS Codeはworkspace root、Cloudはrepository root、CLIは上方向walkで共有メンバーはselected root）ため、`copilot.repo.agent`はroot-anchoredでサブディレクトリのagents directoryはニアミスとなる。同じ変更でcontract行を修正した。)* *(2026-08-23修正: GitHubはcustom agentの`name`をoptionalなdisplay nameとして文書化し、profileをconfiguration file自身の名から`.md`または`.agent.md`を除いたものでdeduplicateするため、custom-agent rowがgroupingされるnameは共通の読み取りではなくadmitしたruleの答えとする。specification・data model・HTTP contractも同じ変更で修正した。)*

**目に見えるチェックポイント**: Copilot custom agent を filter できます。

### fixture とテストを先行

- [X] T546 [US1] 両方の directory、direct-child boundary、Cloud filename variant、duplicate name、shared
  Claude file、malformed metadata、secret、handoff、configured/User path、hosted organization fact に対する
  Copilot agent fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T547 [US1] フェーズ 30 で所有済みの Copilot VS Code agent behavior を再利用し、duplicate behavior または無関係な
  exclusion ID を作成せず、origin fileを持たない正確な `copilot.behavior.cloud.organization-agents` を含む残りの
  CLI/Cloud agent behavior、matcher、path-negative configured/User/hosted
  case、composition、relationship、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T548 [P] [US1] 両方の Copilot agent directory、direct-child depth、surface
  provenance、hosted/runtime-only fact、configured-root rejection、shared Claude file に関する
  matcher/recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T549 [US1] Copilot custom-agent row、surface badge、filter、exclusion、diagnostics、維持される
  Codex/Claude agent に関するブラウザー受け入れテストを `tests/e2e/copilot-custom-agents-inventory.spec.ts` に追加する

### 実装

- [X] T550 [US1] フェーズ 30 で所有済みの `copilot.behavior.vscode.agents` を再利用し、local/Cloud selection と
  managed/remote exclusion が参照する前に、残りの surface-qualified local-agent
  fact、`copilot.behavior.vscode.user.agents`、`copilot.behavior.cli.user.agents`、origin fileを持たない
  `copilot.behavior.cloud.organization-agents` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T551 [US1] root-anchored な `copilot.repo.agent` candidate だけを追加し、無関係な exclusion ID
  を定義または参照せず、configured/User/hosted location を path-negative のままにする処理を
  `src/shared/registries/inspection-rules.ts` に実装する *(2026-08-20修正: すべてのCopilot
  surfaceがroot-anchoredなagents locationを文書化している（VS Codeはworkspace root、Cloudはrepository
  root、CLIは上方向walkで共有メンバーはselected root）ため、`copilot.repo.agent`はroot-anchoredでサブディレクトリのagents
  directoryはニアミスとなる。同じ変更でcontract行を修正した。)*
- [X] T552 [US1] `copilot.behavior.cloud.organization-agents` の existing-source backlink を含む、Copilot
  custom-agent evidence record と reciprocal affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T553 [US1] Copilot agent matching と surface-qualified recognition を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-23修正: GitHubはcustom agentの`name`をoptionalなdisplay nameとして文書化し、profileをconfiguration
  file自身の名から`.md`または`.agent.md`を除いたものでdeduplicateするため、custom-agent
  rowがgroupingされるnameは共通の読み取りではなくadmitしたruleの答えとする。specification・data model・HTTP
  contractも同じ変更で修正した。)*
- [X] T554 [US1] Copilot agent classification と一度だけ読み取る shared physical-file assembly を
  `src/server/inspection/scan.ts` に統合する
- [X] T555 [US1] Copilot agent の inventory row と、英語の agent、surface、shared-file、exclusion message を
  そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 54: Copilot Custom Agents 詳細

**目的**: 完全で inert な Copilot agent detail — `mcp-servers`はagent自身の宣言contentとして含む — を追加し、VS Code/CLI/Cloud の context difference を維持して、Hook-family semantics だけを延期します。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: malformed な Copilot agent を開き、body、tool、model、invocation、handoff、instruction、skill、closed Hook origin、agent自身のcontentとしての`mcp-servers`宣言、正確な解決済みの値の保持、zero activation/connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。

### テスト先行

- [X] T556 [P] [US2] VS Code/CLI/Cloud body、tool、model、handoff、instruction、skill、closed Hook
  origin、agent自身の宣言contentとしての`mcp-servers`、surface selection に関する Copilot agent の失敗テストを
  `tests/unit/inspection/copilot-metadata.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T557 [P] [US2] handoff、link、skill preload、instruction、runtime-only organization agent、target
  promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [X] T558 [P] [US2] Copilot agent declaration が tool、handoff、Hook、MCP、link、参照 file を invoke
  しないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T559 [US2] reciprocal contract reference を持つ Copilot agent context-composition graph coverage
  の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T560 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Copilot custom-agent detail、surface
  context、agent自身のcontentとしての`mcp-servers`宣言、relationship、diagnostics、connection
  がゼロであること、detail-state cleanup に関する browser acceptance を
  `tests/e2e/copilot-custom-agents-detail.spec.ts` に追加する

### 実装

- [X] T561 [US2] 別々の Copilot VS Code、CLI、Cloud agent selection、context、handoff、tool、relationship
  strategy を `src/shared/registries/runtime-composition.ts` に追加する
- [X] T562 [US2] file が書いた agent の宣言 — `mcp-servers`も通常の宣言contentとして含む — 、inert Hook
  origin、relationship、diagnostics、evidence で Copilot recognition を
  `src/server/inspection/recognizers/candidate.ts` において拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-20:
  MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T563 [US2] Copilot agent metadata、正確な解決済みの値の保持、synthetic file も connection
  も作成しない正確な解決済みの値の保持、relationship-only Hook target、完全な authored source を保持しながら行う parser
  scratch/transient-semantic disposal を `src/server/inspection/scan.ts` に統合する
- [X] T564 [US2] typed detail と、英語の Copilot agent handoff、surface message をそのkind自身のdetail
  route（`src/app/pages/` 配下） において拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその
  maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

---

## フェーズ 55: 統合 Custom Agents inventory

**目的**: すべての custom-agent candidate を統合し、共有 Claude/Copilot file を一度だけ読み取り — 各agentのMCP-spelling宣言はagent自身のdetail contentに留まる — Codex carrier inheritance は relationship-only のまま維持します。

**独立テスト**: all-vendor agent fixture を使用し、共有 `.claude/agents/*.md` に対する一つの物理 row/read、同じ owner ID 上の別々の Claude/Copilot agent recognition と MCP recognition、Codex agent-owned MCP recognition を作成しない Codex carrier inheritance relationship、決定論的な provenance、synthetic MCP file または connection がないこと、filter、duplicate-name uncertainty、exclusion、injected fileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、rescan cleanup を検証します。

**目に見えるチェックポイント**: duplicate file を伴わずどのagentもMCP rowを所有しない、完全な custom-agent inventory とその共有 Claude/Copilot interpretation を理解できます。 *(2026-08-23修正: surfaceが公開する内容に書き改めた。relationship-only registryはrecordを1つも出荷しないため、pageに届いて表示されるものが無い（FR-009）。)* *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

### テスト先行

- [X] T565 [US1] 対応するすべての path、layer、duplicate name、shared Claude/Copilot
  file、MCP構成を自身の宣言contentとして綴るagent、Codex carrier-inheritance relationship、malformed metadata、secret
  field、reference、exclusion、injected throw/rejection に対する all-vendor custom-agent fixture を
  `tests/fixtures/repositories/build-fixtures.ts` で完成させる *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T566 [US1] custom-agent behavior、matcher、Codex relationship-only carrier inheritance、exclusion
  ID を持たない path-negative configured/User/hosted case、evidence conformance row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる
- [X] T567 [US1] agent-owned MCP recognition を持たない Codex TOML、Claude recursive Markdown、Copilot
  directory、一つの owner ID 上に agent と MCP の recognition を持つ shared Claude/Copilot file、traversal
  uncertainty、exclusion に対する完全な matcher/recognition-matrix test を
  `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T568 [P] [US1] 一度だけ読み取るshared agent、決定論的なClaude/Copilot agent/MCP recognitionとprovenance
  order、Codex relationship-only carrier
  inheritance、分離されたfileに閉じたfailure、attemptをabortしてitem、recognition、derived result、scan-result
  record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected
  fileに閉じないfailure、synthetic file/connectionゼロ、relationship-target
  readゼロに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T569 [US1] 統合 custom-agent inventory、filter、いかなるagent-owned MCP rowも持たない共有 Claude/Copilot
  recognition、Codex carrier-inheritance relationship、duplicate
  uncertainty、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを
  `tests/e2e/custom-agents-inventory.spec.ts` に追加する

### 実装

- [X] T570 [US1] custom agent に対する決定論的な physical-file assembly、Claude/Copilot agent/MCP
  recognition、Codex relationship-only carrier inheritance、provenance、exclusion、no-synthetic-file
  behavior を `src/server/inspection/scan.ts` で完成させる
- [X] T571 [US1] すべての custom-agent kind、shared recognition、duplicate-name uncertainty に対する inventory
  row を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する *(2026-08-08修正:
  admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*
- [X] T572 [US1] 英語の unified custom-agent inventory および shared-recognition message をそれらを描画する Vue
  component に追加する

---

## フェーズ 56: Custom Agents 比較

**目的**: literal および typed な custom-agent difference を備えた custom-agent kind 自身の比較サーフェスを設計します。

**独立テスト**: Readableなcurrent-generation custom-agent fileを正確に2つ比較し、完全なliteral sourceと、整列したcontext、tool、宣言値のdifference — MCP-spelling keyも含む — を検証する。 *(2026-08-23修正: surfaceが公開する内容に書き改めた。relationship-only registryはrecordを1つも出荷しないため、pageに届いて表示されるものが無い（FR-009）。)* *(2026-08-23修正: このkindのlocationは2つのformatで書かれるため、比較する2 fileのbyteをdiffしてもquotingとdelimiterが揃うだけでfileが述べている内容は揃わない。そこでこのcomparisonはそのdiffを持たず、各fileのruleが分割した2つの半分 — declared metadataとinstructions — をそれぞれdiffし、完全なauthored sourceは各fileごとの読み取り専用viewerとして並べて示す。これはformatが持たない整列を主張することなくFR-027がcomparison surfaceに求めるものを満たす形である。)*

**目に見えるチェックポイント**: custom-agent definition を実行または ranking せずに比較できます。

### テスト先行

- [X] T573 [US3] canonical serialized declaration document —
  `mcpServers`/`mcp-servers`宣言も通常の宣言contentとして含む — context、tool、Codex carrier relationship に関する失敗する
  custom-agent comparison regression を `tests/unit/app/custom-agent-comparison.test.ts` に追加する
  *(2026-08-19 修正: 宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool
  recognitionはtoolごとにその横で比較する — toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical serialized documentとしてMonacoでdiffする。skill・instruction・MCP
  comparisonの前例に従う（research.md § 7）。)*
- [X] T574 [US3] credential/environment-reference の差を含む完全なリテラルの custom-agent diff、canonical
  serialized declaration document、masking/reveal も environment substitution もないこと、いかなるkindのMCP
  ownershipも無く、vendor ごとに正しい typed relationship だけがあることに関する browser acceptance を
  `tests/e2e/custom-agents-comparison.spec.ts` に追加する *(amended 2026-08-21:
  acceptanceは両sideのcanonical serialized
  documentがMonacoでdiffされることを検証する。全kindの宣言済みmetadata比較が取る形である（research.md § 7）。)* *(2026-08-23修正:
  このkindのlocationは2つのformatで書かれるため、比較する2
  fileのbyteをdiffしてもquotingとdelimiterが揃うだけでfileが述べている内容は揃わない。そこでこのcomparisonはそのdiffを持たず、各fileのruleが分割した2つの半分
  — declared metadataとinstructions — をそれぞれdiffし、完全なauthored
  sourceは各fileごとの読み取り専用viewerとして並べて示す。これはformatが持たない整列を主張することなくFR-027がcomparison
  surfaceに求めるものを満たす形である。)*

### 実装

- [X] T575 [US3] custom-agent comparisonが各sideの宣言済みmetadataを1つのcanonical
  documentへserializeしてMonacoでdiffするよう拡張し、MCP-spelling keyを通常の宣言entryとして扱い、Codex relationship-only
  inheritance を `src/app/components/custom-agent-comparison/RecognitionComparison.vue`（skill の前例 —
  `src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`
  — に倣ってこの task が設計・作成する、その kind 自身の比較サーフェスの一部。そこへ到達する entry link — その kind の inventory row
  component（`src/app/components/inventory/rows/` 配下）と、その kind の detail route（`src/app/pages/` 配下） —
  も、skill における T203 と同様にこの task が所有する） で明確に区別したままにする *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有
  module は存在せず、そのサーフェスの設計・作成は skill の前例に倣ってこの task が担う（spec.md § Clarifications Session
  2026-08-14）。)* *(amended 2026-08-21: 宣言済みmetadataはsideごとに1つのcanonical serialized
  documentとしてMonacoでdiffする。skill・instruction・MCP comparisonの前例に従う（research.md § 7）。)*
- [X] T576 [US3] 英語の custom-agent comparison message をそれらを描画する Vue component に追加する

---

## フェーズ 57: Codex Configuration recognition

**目的**: 二つ目の candidate、behavior record、evidence record、file read を追加せず、フェーズ 23 が既に受理した `.codex/config.toml` carrier に対する file 単位の `settings/config` recognition と inventory presentation を新設します。recognition を生むのは、その1つの candidate に対する2つ目の rule です。 *(2026-08-17修正: このフェーズは既存 recognition の拡張ではなく新設である — フェーズ 23 は carrier を受理して内包 MCP 宣言を公開し、後述の順序規則はその時点で settings/config item を提示しないと定めているため、このフェーズの row が必要とする file 単位の recognition を作るフェーズが他に無い。)*

**独立テスト**: direct/near-miss path、link、malformed filename を備えた root/descendant carrier を再利用する。同じ physical file と1回の read が、既存の MCP・fallback の識別と並んで新しい `settings/config` recognition を運ぶこと、configured instruction fallback は変わらないこと、higher-scope path と configured target が新しい Repository exclusion ID なしに negative のままであることを検証します。

**目に見えるチェックポイント**: MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。

### fixture とテストを先行

- [X] T577 [US1] 既存 Codex carrier fixture を、一般 configuration field、layer variant、near
  miss、link、malformed file、secret、inline declaration、path-negative higher-scope case で
  `tests/fixtures/repositories/build-fixtures.ts` において拡張する
- [X] T578 [US1] 拡張された `settings/config` recognition coverage を、すでに所有済みの `codex.repo.config`
  candidate、config behavior、正確な evidence record を再利用して
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`
  に具体化する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T579 [P] [US1] `codex.repo.config`と`codex.repo.settings`がRepository
  rootの`['.codex', 'config.toml']`をadmitする唯一のrule（全vendorを通じて）であること、両者が1つのauthored
  matcherを共有し1回のreadで1つのcandidateへmergeされること、root配下の`.codex/config.toml`はpath-negativeのままであること、higher-scope
  locationも捏造したexclusionなしにpath-negativeのままであることを証明するfailing registry/matcher
  regressionを`tests/contract/inspection-rules.test.ts`と`tests/unit/inspection/rules.test.ts`へ追加する
  *(2026-08-23修正: この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T580 [P] [US1] 拡張された `settings/config` coverage — layer provenance、trust uncertainty、既存 MCP
  recognition/fallback provenance との共存、premature Hook recognition がないことに関する Codex configuration
  recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T581 [US1] 既存 Codex carrier 上の決定論的な recognition augmentation、一度の read、維持される MCP/fallback
  identity、isolated failure、configured-target read ゼロに関する scan の失敗テストを
  `tests/integration/repository-scan.test.ts` に追加する
- [X] T582 [US1] Codex configuration row、filter、既存 MCP/fallback badge、exclusion、diagnostics、一つの
  physical carrier row に関するブラウザー受け入れテストを `tests/e2e/codex-config-inventory.spec.ts` に追加する
  *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)*

### 実装

- [X] T583 [US1] フェーズ 15 で所有済みの Codex project/User configuration behavior statement を再利用し、duplicate
  behavior ID を `src/shared/registries/vendor-behaviors.ts` に追加しない *(2026-08-23修正:
  この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T584 [US1] フェーズ 23 で所有済みの `codex.repo.config` candidate が既にauthorしたmatcherの上に
  `codex.repo.settings` を追加し — 1つのcandidateと1回のreadに対する2つのrule — `codex.excluded.user-runtime` は
  consent-gated Global phase まで延期する処理を `src/shared/registries/inspection-rules.ts` に実装する
  *(2026-08-23修正: この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T585 [US1] source ID を作成せず、既存 Codex configuration evidence record の reciprocal presentation
  coverage を再利用し、対象registry recordの`evidence` citation で拡張する *(2026-08-23修正:
  この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T586 [US1] configured target を parse したり MCP/fallback recognition を変更したりせず、フェーズ 23 が受理した
  carrier に対する path-derived `settings/config` recognition を追加し、その file 単位の行を session projection と
  inventory DTO から公開する処理を
  `src/server/inspection/recognizers/candidate.ts`、`src/server/session/session.ts`、`src/shared/api-types.ts`
  に実装する *(2026-08-23修正: この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T587 [US1] 先行する skill、instruction、MCP result を維持しながら、one-read Codex carrier 上の決定論的な
  recognition augmentation を `src/server/inspection/scan.ts` に統合する *(2026-08-23修正:
  この認識は`codex.repo.settings`のものとする —
  1つのcandidateと1回のreadに対する2つ目のruleで、`.claude/settings.json`が既に持つ配置である —
  recognitionはruleが生むものだからである。)*
- [X] T588 [US1] Codex configuration の inventory filter、row、英語 message を
  `src/app/components/inventory/InventoryFilters.vue`、そのkindのrow
  component（`src/app/components/inventory/rows/`）、導出と件数を `src/app/composables/filters.ts`、tab panel
  の分岐と総数を `src/app/components/inventory/InventoryList.vue` と `src/app/pages/index.vue` において拡張する

---

## フェーズ 58: Codex Configuration 詳細

**目的**: `settings/config` recognition に自身の detail を与えます。このkindのrow単位はfileであるため、authorが書いたdocumentをそのまま提供します。Configured instruction fallback と MCP detail はすでに有効で、宣言を先頭にする形のままです。

**独立テスト**: malformed および secret-bearing な project config layer を開き、完全な authored document が comment と authored な綴りを保ったまま page へ届くこと、同じ file の MCP row がその byte なしに宣言を公開し続けること、どの parser も読めない document でも source が表示され失敗を運ぶのは MCP recognition だけであること、diagnostics と detail-state cleanup が 2 度目の read/derivation なしに成り立つことを検証します。

**目に見えるチェックポイント**: `.codex/config.toml` の row を選択すると、宣言された target を読み取らず、解決も追跡もせずに、author が書いた完全な document — comment、authored な綴り、section の順序をそのまま — が表示されます。

### テスト先行

- [X] T589 [US2] settings recognitionが自身のparseを必要としないことを証明するfailing testを追加する:
  TOMLが読めないdocumentでもrowと完全なsourceを公開し、all-or-nothingで失敗して`recognition-parse-failed`
  diagnosticを持つのは同じfileのMCP recognitionの側である。NUL-containing byteはdiagnostic-only
  `binary`のまま、全non-NUL inputはreadable
  `utf-8`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial
  statusにせずdisplayまで届くことを要求する。Decoder/parserの全throw/rejectionはdomain
  catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる。追加先は`tests/unit/inspection/recognizers.test.ts`と`tests/integration/repository-scan.test.ts`
  *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、detail functionはshipせず、比較surfaceも持たない — フェーズ 64
  は取り下げ済みである。)*
- [X] T590 [P] [US2] settings recognitionがpath-derivedで何も読み出さないこと、同じfileのMCP
  recognitionおよびconfigured fallback instruction recognitionとprovenance
  1件ずつで共存すること、configuredなliteral fallback
  basenameがvendor/runtime/environmentのcapacityにのみ従うことを証明するfailing Codex config testを追加する。1
  fileに限定されない失敗はresult/generationなしにattemptをabortし、直前のcommitのみを保持してlifecycle処理をtrigger所有境界へ委ねることを証明する。追加先は`tests/unit/inspection/recognizers.test.ts`
  *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T591 [P] [US2] fallback name、agent config path、model-instruction path、compact-prompt
  path、skill path、Hook field、MCP field が target read または activation を一切認可しないことを証明する relationship と
  safety の失敗テストを `tests/unit/inspection/relationships.test.ts` と
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T592 [P] [US2] settings ruleがconfig-layer behaviorのみに基づき、既にshipしているprecedence
  strategyによって説明されること、strategyを追加せずHook compositionを延期したままであることを証明するfailing Codex configuration
  strategy/registry-graph coverageを`tests/contract/runtime-composition.test.ts`へ追加する *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T593 [P] [US2] 完全なリテラルの TOML value、strict/stale ID、diagnostics、exact metadata に関する、失敗する
  file-detail/absent-reveal-function contract を `tests/contract/http-api-files.test.ts` に追加する
  *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T594 [US2] Literalなcredential/environment-referenceの正確な表示、process-environment
  sentinelを代入しないこと、masking/revealのcontrolがないこと、commentとauthoredな綴りを含む完全なauthored document、同じfileのMCP
  rowがそのbyteなしに宣言を公開し続けること、diagnostic、detail-state cleanupのbrowser
  acceptanceを`tests/e2e/codex-config-detail.spec.ts`へ追加する *(2026-08-08修正: detail は file
  が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*

### 実装

- [X] T595 [US2] このkindは公開するdocumentから何も読み出さないため、`src/server/inspection/parsers/toml.ts`の唯一のTOML
  parsing seamを変更しない *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T596 [US2] settings rowが依拠するlayer
  resolutionを既存の文書化済みoperationが既に覆っているため、shipしている`codex.config.precedence`
  strategyを再利用し、`src/shared/registries/runtime-composition.ts`にstrategyを追加しない *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T597 [US2] documentから何も読み出さず、自身のextraction・diagnostic・宣言payloadを持たないpath-derivedなCodex
  settings
  recognitionを`src/server/inspection/rules/codex.ts`と`src/server/inspection/recognizers/candidate.ts`に追加する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T598 [US2] scanのkindごとのextraction
  groupingが既にextractionを持たないkindを覆っているためscanを変更せず、1回のreadはseedされたまま、derived fallback fileと既存のMCP
  recognitionを再導出も2回目のreadもなく維持する（`src/server/inspection/scan.ts`） *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T599 [US2] そのkind自身のdetail routeを`src/app/pages/`配下に追加し、authorが書いたdocumentを共有source
  viewerで提供して、そのroute familyをhostのshell fallbackへ`src/server/host/devframe-app.ts`で登録する *(2026-08-06
  修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T600 [US2] 英語の Codex configuration detail、fallback message をそれらを描画する Vue component に追加する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*

---

## フェーズ 59: Claude Settings inventory

**目的**: parent または descendant candidate を継承せず、exact-launch の二つの Claude settings file を追加します。

**独立テスト**: root の `.claude/settings.json` と `.claude/settings.local.json` だけを inventory 化し — row単位がfileであるためそれぞれが自身のrowになる — nested/parent-like near miss、standalone Hook/workflow file、document自身が宣言する対象を拒否し、同じfileのpermission-policy rowとCodex configuration resultを維持します。

**目に見えるチェックポイント**: exact-launch Claude settings file と、その project/local layer を識別できます。

### fixture とテストを先行

- [X] T601 [US1] exact file の両方、parent/descendant near miss、link、malformed JSONC、secret、contained
  declaration、workflow、path-negative User/managed state に対する Claude settings fixture を
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T602 [US1] `claude.repo.settings` Repository candidate だけを、その behavior、evidence、exact-launch
  row とともに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`
  に具体化する *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T603 [P] [US1] 正確な root `.claude/settings.json` と
  `.claude/settings.local.json`、ancestor/descendant matching なし、standalone Claude
  Hook・prompt・workflow・agent-memory candidate なしに関する matcher の失敗テストを
  `tests/unit/inspection/rules.test.ts` に追加する *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T604 [P] [US1] tool、`settings/config` kind、project/local layer、正確な provenance、いかなるMCP
  recognitionも存在しないこと — settings fileのinline mapは自身の宣言contentである — 、recognitionがpathから導出され document
  から何も読み出さないこと、Hook recognition も存在しないことに関する Claude settings recognition の失敗テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。またdocumentから何も読み出さない: このkindのrow単位はfileであり、settings
  parseを追加するphaseは存在しない。)* *(2026-08-26 修正: このtaskが不在と記録したHook recognitionは、同じ2つのsettings
  fileに対してPhase 86で到着した。`claude.repo.hooks.settings`がそれらのdocumentが含む`hooks` objectを公開し、settings
  recognitionは引き続きdocumentから何も読み出さない。)*
- [X] T605 [US1] Claude settings row、正確な layer、exclusion、filter、diagnostics、維持される Codex
  configuration に関するブラウザー受け入れテストを `tests/e2e/claude-settings-inventory.spec.ts` に追加する

### 実装

- [X] T606 [US1] 出荷済みの
  `claude.behavior.repo.settings.shared`、`claude.behavior.repo.settings.local`、読み取り認可を持たない
  `claude.behavior.user.settings` を再利用し、behavior
  IDを追加しない（`src/shared/registries/vendor-behaviors.ts`） *(2026-08-23修正:
  この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T607 [US1] `claude.repo.permissions` candidate が既にauthorしたmatcherの上に `claude.repo.settings`
  を追加し — 1つのcandidateと1回のreadに対する2つのrule — 未対応のstandalone fileはpath-negative
  testで覆い、`claude.excluded.user-runtime` は consent-gated Global phase まで延期する処理を
  `src/shared/registries/inspection-rules.ts` に実装する *(2026-08-23修正:
  この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T608 [US1] Claude settings evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation に追加する *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T609 [US1] exact-launch settings recordを、kind固有の問いに答えないunitへcompileし、そこから生まれるpath-derived
  recognitionを追加する（`src/server/inspection/rules/claude.ts`、`src/server/inspection/recognizers/candidate.ts`）
  *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T610 [US1] Repository boundary を拡大せず、Codex result も変更せずに Claude settings classification を
  `src/server/inspection/scan.ts` に統合する *(2026-08-23修正: この認識は`claude.repo.settings`のものとする —
  `claude.repo.permissions`が既にadmitするcandidateに対する2つ目のruleで、1回のreadに2つのrecognitionである —
  recognitionはruleが生むものだからである。)*
- [X] T611 [US1] Claude settings の inventory row と、英語の settings、layer、exclusion message を そのkindのrow
  component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 60: Claude Settings 詳細

**目的**: Claudeの `settings/config` recognition に自身の detail を与えます。このkindのrow単位はfileであるため、フェーズ 58 が追加した route で author が書いた document をそのまま提供します。inline MCP mapはsettings file自身の宣言contentのままMCP recognitionを持たず、Hook-family semantics は引き続き延期します。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: malformed および secret-bearing な settings を開き、keyの順序を保った完全なauthored documentがpageへ届くこと — keyの中のinline MCP mapもfile自身のcontentとして —、同じfileのpermission-policy rowが周囲のkeyなしに宣言されたblockを公開し続けること、strict JSONが読めないdocumentでもsourceが表示され失敗を運ぶのはpermissions recognitionだけであること、zero connection・diagnostics・detail-state cleanupが成り立つことを検証します。

**目に見えるチェックポイント**: Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、author が書いた完全な document — inline MCP mapはfile自身の宣言contentとして — が表示されます。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

### テスト先行

- [X] T612 [US2] settings recognitionが自身のparseを必要としないことを証明するfailing testを追加する: strict
  JSONが読めないdocumentでもrowと完全なsourceを公開し、all-or-nothingで失敗して`recognition-parse-failed`
  diagnosticを持つのは同じfileのpermissions recognitionの側である。NUL-containing byteはdiagnostic-only
  `binary`のまま、全non-NUL inputはreadable
  `utf-8`/`utf-8-replaced`として1回だけdecodeされ、保持した`U+FFFD`はそれ自体でpartial
  statusにせずdisplayまで届くことを要求する。Decoder/parserの全throw/rejectionはdomain
  catch/classification/retry/result/Diagnostic/generationなしに変更なく伝播させる。追加先は`tests/unit/inspection/recognizers.test.ts`と`tests/integration/repository-scan.test.ts`
  *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T613 [P] [US2] 正確なlaunch-root scope、parent/descendantにmatchしないこと、文書化された2 layerそれぞれのrecognizing
  surface、scope・precedence・layerを一切projectしないことに関するfailing Claude settings
  testを`tests/unit/inspection/claude-metadata.test.ts`へ追加する *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T614 [P] [US2] settings で選択された agent、plugin、Hook、MCP、command、path、workflow、reference が inert
  かつ non-following のままであることを証明する zero-activation の失敗テストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T615 [US2] reciprocal contract reference、いかなるMCP composition edgeも無いこと、Hook semantics だけの延期を持つ
  Claude settings runtime-composition graph coverage の失敗テストを
  `tests/contract/runtime-composition.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)* *(2026-08-26 修正:
  このtaskがdeferredと記録したHook compositionは、Phase
  87で`claude.hooks.additive`として到着し、同じsuiteがそのedgeをcoverしている。settings row自体は依然としてどのMCP composition
  edgeも持たない。)*
- [X] T616 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Claude settings detail — inline MCP mapは自身の宣言contentとして
  — connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を
  `tests/e2e/claude-settings-detail.spec.ts` に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)* *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*

### 実装

- [X] T617 [US2]
  このkindは公開するdocumentから何も読み出さないため、`src/server/inspection/parsers/json.ts`の唯一のstrict-JSON parsing
  seamを変更しない *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T618 [US2] settings rowが依拠するscope
  resolutionを既存の文書化済みoperationが既に覆っているため、出荷済みの`claude.settings.precedence`
  strategyを再利用してstrategyを追加せず、Hook
  compositionは延期したままとする（`src/shared/registries/runtime-composition.ts`） *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)* *(2026-08-26 修正: Phase
  87が同じregistryへ`claude.hooks.additive`を追加し、これらのfileに対するcontained-hook ruleがそれをconsumeする。settings
  rule自体は依然としてstrategyを追加せず、`claude.settings.precedence`だけに依拠する。)*
- [X] T619 [US2] documentから何も読み出さず、自身のextraction・diagnostic・宣言payloadを持たず、inlineな`mcpServers`
  mapをいかなるMCP recognitionにもしないpath-derivedなClaude settings
  recognitionを`src/server/inspection/rules/claude.ts`と`src/server/inspection/recognizers/candidate.ts`に追加する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T620 [US2] scanのkindごとのextraction
  groupingが既にextractionを持たないkindを覆っているためscanを変更せず、documentごとの1回のreadはそのまま、隣接するpermissions
  recognitionも維持する（`src/server/inspection/scan.ts`） *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*
- [X] T621 [US2] フェーズ 58 が `src/app/pages/` 配下に追加した detail route で Claude settings document
  を提供する。その文言は既に、あるvendorの語ではなくkind全体を名指している *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、detail functionはshipしない。)*

---

## フェーズ 61: Copilot Settings inventory

**目的**: general `.vscode/settings.json` と configured root の明示的な除外を維持しながら、対応する Copilot settings file を追加します。

**独立テスト**: root の `.github/copilot/settings.json`、`.github/copilot/settings.local.json`、および CLI が文書化された共有subsetのために読む Claude 形式の2 file だけを inventory 化し — それぞれが自身の row になり、共有 file は両製品を名指す1つの row である — 一般の `.vscode/settings.json`、nested/configured path、User state、CLI LSP、無関係な file を拒否する。CLI extension の exclusion 所有はフェーズ 80 へ委ねる。

**目に見えるチェックポイント**: 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate を識別できます。

### fixture とテストを先行

- [X] T622 [US1] 対応する GitHub/Claude-compatible file、shared physical file、malformed
  JSONC、secret、plugin recommendation、contained Hook、configured-root
  attempt、`.vscode/settings.json`、`.github/lsp.json`、path-negative User state に対する Copilot settings
  fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T623 [US1] `copilot.repo.settings`、読み取り権限を付与しない `copilot.behavior.vscode.settings` と
  `copilot.behavior.cli.lsp`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp` を、その正確な
  affected-behavior reference、evidence、surface row とともに
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`
  に具体化する *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである —
  これらのfileが関与するhook/plugin behaviorはHook/Plugin recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T624 [P] [US1] 正確な対応 Copilot settings selector、`copilot.excluded.vscode-settings` →
  `copilot.behavior.vscode.settings`、`copilot.excluded.cli-lsp` →
  `copilot.behavior.cli.lsp`、path-negative nested/User/hosted location、フェーズ 80 より前の CLI-extension
  policy なしに関する matcher と registry の失敗テストを `tests/unit/inspection/rules.test.ts` と
  `tests/contract/inspection-rules.test.ts` に追加する
- [X] T625 [P] [US1] Copilot `settings/config` kind、surface provenance、shared Claude-compatible
  file、premature Hook/Plugin/MCP recognition がないことに関する recognition の失敗テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T626 [US1] Copilot settings row、filter、shared-file badge、exclusion、diagnostics、維持される
  Codex/Claude row に関するブラウザー受け入れテストを `tests/e2e/copilot-settings-inventory.spec.ts` に追加する

### 実装

- [X] T627 [US1] surface-qualifiedなCopilot settings lookup `copilot.behavior.cli.settings`
  と、読み取り認可を持たない
  `copilot.behavior.vscode.settings`、`copilot.behavior.cli.lsp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.lsp`
  を追加し、settings
  strategyと正確なexclusion参照が読み取り権限なしに解決するようにする（`src/shared/registries/vendor-behaviors.ts`）
  *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである —
  これらのfileが関与するhook/plugin behaviorはHook/Plugin recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T628 [US1] `copilot.repo.settings` を追加し、正確に `copilot.excluded.vscode-settings` と
  `copilot.excluded.cli-lsp` を own する。settings configured root は path-negative のままにし、フェーズ 19 で所有済みの
  instruction/skill `copilot.excluded.extra-directories` rule を再利用し、CLI extension はフェーズ
  80、`copilot.excluded.user-runtime` はフェーズ 98 まで延期する処理を `src/shared/registries/inspection-rules.ts`
  に実装する *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである —
  これらのfileが関与するhook/plugin behaviorはHook/Plugin recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T629 [US1] Copilot settings evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation に追加する *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する —
  公開するdocumentを見つける文書化済みlookupである — これらのfileが関与するhook/plugin behaviorはHook/Plugin
  recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T630 [US1] Copilot settings matching と path-derived surface recognition を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T631 [US1] Copilot settings classification と一度だけ読み取る physical-file assembly を
  `src/server/inspection/scan.ts` に統合する
- [X] T632 [US1] Copilot settings の inventory row と、英語の settings、surface、shared-file、exclusion
  message を そのkindのrow component（`src/app/components/inventory/rows/`） において拡張する

---

## フェーズ 62: Copilot Settings 詳細

**目的**: フェーズ 58 が追加した detail route で Copilot の `settings/config` recognition を提供します。このkindのrow単位はfileであるため、authorが書いたdocumentをそのまま示します。

**独立テスト**: malformed および literal credential を含む settings を開き、keyの順序を保った完全な authored document が page へ届くこと、共有される Claude 形式の document が両製品を名指す1つの row であること、configured root や宣言された対象を読まないこと、environment reference を解決しないこと、detail-state cleanup が成り立つことを検証します。

**目に見えるチェックポイント**: Copilot settings を選択すると、plugin の有効化、contained Hook の compose、MCP row の作成を行わず、author が書いた完全な document が表示されます。

### テスト先行

- [X] T633 [P] [US2] admit された document 自身、その中の compatible Claude settings の綴り、configured-root read
  なしに関する Copilot settings の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*
- [X] T634 [P] [US2] literal credential、未解決の environment-reference text、relationship read authority
  がゼロであることに関する、失敗する exact-display/relationship test を
  `tests/unit/inspection/declared-values.test.ts` と `tests/unit/inspection/relationships.test.ts`
  に追加する *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail
  surfaceはshipしない。完全なdocumentは共有のsettings detail routeが提供する（T589、T642）。)*
- [X] T635 [P] [US2] settings content が plugin の有効化、Hook の呼び出し、MCP への接続、URI の load、configured root
  の展開を行えないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T636 [US2] VS Code/CLI/Cloud distinction、フェーズ 20 instruction の再投影、deferred Plugin/Hook
  semantics、settings は MCP owner ではないという恒久ルールに関する Copilot settings runtime-composition graph
  coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*
- [X] T637 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Copilot settings detail、inert
  declaration、settings-owned MCP row がないこと、diagnostics、detail-state cleanup に関する browser acceptance
  を `tests/e2e/copilot-settings-detail.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*

### 実装

- [X] T638 [US2]
  このkindは公開するdocumentから何も読み出さないため、`src/server/inspection/parsers/json.ts`の唯一のstrict-JSON parsing
  seamを変更しない *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*
- [X] T639 [US2] このフェーズが記録するsurface-qualifiedなCopilot settings precedence
  strategyを2つ追加し、後続のPlugin/Hook
  familyはregistryへ一切入れない（`src/shared/registries/runtime-composition.ts`） *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*
- [X] T640 [US2] documentから何も読み出さず、自身のextraction・diagnostic・宣言payloadを持たず、inlineな`mcpServers`
  mapをいかなるMCP recognitionにもしないpath-derivedなCopilot settings
  recognitionを`src/server/inspection/rules/copilot.ts`と`src/server/inspection/recognizers/candidate.ts`に追加する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*
- [X] T641 [US2] scanのkindごとのextraction
  groupingが既にextractionを持たないkindを覆っているためscanを変更せず、いくつの製品が認識しても物理fileには1回のreadで足り、MCP非所有が恒久的に成り立つ（`src/server/inspection/scan.ts`）
  *(2026-08-23修正: このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md §
  Clarifications 2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail
  surfaceはshipしない。完全なdocumentは共有のsettings detail routeが提供する（T589、T642）。)*
- [X] T642 [US2] フェーズ 58 が `src/app/pages/` 配下に追加した detail route で Copilot settings document
  を提供する。その文言は既に、あるvendorの語ではなくkind全体を名指している *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)* *(2026-08-23修正:
  このkindのrow単位はfileであるため、detailはauthorが書いたdocumentであり、そこから何も読み出さない（spec.md § Clarifications
  2026-08-23）。専用のextraction、宣言DTO、vendor固有のdetail surfaceはshipしない。完全なdocumentは共有のsettings detail
  routeが提供する（T589、T642）。)*

---

## フェーズ 63: 統合 Settings/Configuration inventory

**目的**: Codex configuration、Claude settings、Copilot settings を、一度だけ読み取る shared-file recognition とともに統合します。MCP rowを持つsettings familyのfileはCodex carrierだけです — MCP surfaceに合流するのは明示的なMCP構成だけだからです。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**独立テスト**: all-vendor settings fixtureを使用し、共有`.claude/settings*.json`に対する一つの物理row/read、別々のClaude/Copilot settings recognition、すべてのsettings fileの恒久的なMCP non-ownership、維持されるCodex carrier MCP/fallback、決定論的なprovenance、filter、exclusion、fileに閉じたfailureのpartial continuity、rescan cleanupを検証する。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**目に見えるチェックポイント**: 完全な settings/configuration inventory をフィルタリングでき、どの settings document も自身の MCP row を公開しないこと、そして既存の Codex configuration carrier は自身の carrier rule が読む MCP row を保つことを確認できます。 *(2026-08-23 修正: チェックポイントが Claude settings 所有の MCP row を挙げていた。MCP 宣言の住処は明示的な carrier だけであるため、`.claude/settings*.json` は MCP row を公開せず、Claude の carrier は `.mcp.json` である。)*

### テスト先行

- [X] T643 [US1] Codex project layer、inline MCP mapが自身の宣言contentに留まる Claude exact-launch
  settings、Copilot variant、shared file、malformed structure、secret、inert declaration、除外された configured
  root に対する all-vendor settings/config fixture を `tests/fixtures/repositories/build-fixtures.ts`
  で完成させる *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T644 [US1] settings/config behavior、三つの candidate matcher、既存の
  `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp`、path-negative
  case、composition、relationship、evidence row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである —
  これらのfileが関与するhook/plugin behaviorはHook/Plugin recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T645 [US1] 既存 MCP/fallback を持つ Codex layer、inline MCP mapが自身の宣言contentに留まる正確な Claude
  settings、対応する Copilot settings、shared file、明示的な exclusion に対する完全な matcher と recognition-matrix
  test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
  *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T646 [P] [US1] 一度だけ読み取るshared settings、決定論的なsettings/MCP recognitionとprovenance
  order、分離されたfileに閉じたfailure、attemptをabortしてitem、recognition、derived result、scan-result
  record/response、generationを一切公開せずprior committed snapshotだけを維持するinjected
  fileに閉じないfailure、synthetic MCP file/connectionゼロ、configured-target
  accessなしに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T647 [P] [US1] settings/configuration row 全体の source/tool/kind/path filter、shared recognition
  badge、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [X] T648 [US1] 統合 settings/config inventory、filter、shared-file recognition、いかなるMCP
  badgeも無いこと、維持される Codex carrier fact、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを
  `tests/e2e/settings-config-inventory.spec.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

### 実装

- [X] T649 [US1] 三つの tool すべてに対し、read authority を持たない settings/config lookup statement を
  `src/shared/registries/vendor-behaviors.ts` で完成させる *(2026-08-23修正: この ruleはCLI settings
  lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである — これらのfileが関与するhook/plugin behaviorはHook/Plugin
  recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T650 [US1] configured-path promotion や新しい exclusion ID を導入せず、三つの settings/config candidate
  record と既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp` reference を
  `src/shared/registries/inspection-rules.ts` で完成させる *(2026-08-23修正: この ruleはCLI settings
  lookupのみに依拠する — 公開するdocumentを見つける文書化済みlookupである — これらのfileが関与するhook/plugin behaviorはHook/Plugin
  recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T651 [US1] settings/config evidence record と reciprocal affected-contract reference を
  対象registry recordの`evidence` citation で完成させる *(2026-08-23修正: この ruleはCLI settings lookupのみに依拠する —
  公開するdocumentを見つける文書化済みlookupである — これらのfileが関与するhook/plugin behaviorはHook/Plugin
  recognition自身の基礎であり、それぞれのフェーズとともに到着するためである。)*
- [X] T652 [US1] 1回のreadによる共有file組み立て、決定的なsettings recognition順、正確なMCP所有/非所有、Codex
  carrierの事実の保持を統合scanのカバレッジで確認する。`src/server/inspection/scan.ts`に変更は不要である
- [X] T653 [US1] 統合されたsettings/configのfilter、row、共有recognitionを、そのkindのrow
  component（`src/app/components/inventory/rows/` 配下）と `src/app/composables/filters.ts`
  の導出で確認する。共有fileの場合も変更なしで覆われている

---

## フェーズ 64: Settings/Configuration 比較（取り下げ）

**2026-08-23 取り下げ**: 本製品の比較は1つのidentityの2つの複製を対にするものであり — skillの名前、宣言されたserver名、1つのapplicability rangeのfile群 — `settings/config` kindはそれを持たない: inventoryの単位がfile自身であるため、2つのsettings fileは1つの2複製ではなく2つのsettingsであり、modelが表現しない対は比較ではなく報告される（FR-011、spec.md § Clarifications Session 2026-08-14）。settings fileからは何も読み出さないため、他のkindが共有する直列化documentの比較に用いる宣言済みmetadataも存在しない。同じ理由でフェーズ 39 が rule kind について取り下げられており、rule も両方の点で file 単位の kind である。後続の全フェーズが自身の番号を保つようフェーズ番号は維持し、T654〜T657 は欠番とする。

---

## フェーズ 65: Claude Output Styles のインベントリ

**目的**: 対応する Claude output-style ファイルをインベントリに追加する。

**独立テスト**: 文書化された layer の direct output-style child をインベントリに含め、nested near miss を除外する。

**目に見えるチェックポイント**: ユーザーは対応 Claude output style をフィルタリングできる。

### fixture とテストを先に

- [X] T658 [US1] direct child、nested near miss、duplicate name、不正な metadata、secret、selection variant
  を対象とする Claude output-style fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T659 [US1] output-style row を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T660 [US1] direct-child output style、nested exclusion、文書化された layer boundary に関する失敗する
  matcher/recognition テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T661 [US1] Claude output-style inventory と exclusion に関するブラウザー受け入れテストを
  `tests/e2e/output-styles-inventory.spec.ts` に追加する

### 実装

- [X] T662 [US1] output-style selection が参照する前に、Claude output-style lookup statement と読み取り権限を付与しない
  `claude.behavior.user.output-style` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T663 [US1] exclusion ID を定義せず、nested/User/configured location を path-negative
  のままにして、`claude.repo.output-style` candidate だけを `src/shared/registries/inspection-rules.ts` に追加する
- [X] T664 [US1] output-style evidence record と affected-contract reference を 対象registry
  recordの`evidence` citation に追加する
- [X] T665 [US1] Claude output-style matching と recognition を
  `src/server/inspection/rules/claude.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T666 [US1] output-style inventory row と、意味的に同等な layer/exclusion メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 66: Claude Output Styles の詳細

**目的**: 完全なリテラルの output-style source detail を追加する。

**独立テスト**: malformed な style を開き、正確な解決済みの値の保持、inert reference、diagnostics、detail-state cleanup を検証する。

**目に見えるチェックポイント**: output style を選択すると、style を適用せず、完全で inert な detail が開く。

### テストを先に

- [X] T667 [P] [US2] file が書いた宣言と evidence に関する失敗する output-style metadata テストを
  `tests/unit/inspection/claude-metadata.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T668 [P] [US2] output-style Markdown と reference が非活性かつ非 navigable のままであることを証明する失敗テストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T669 [US2] reciprocal contract reference を備えた、失敗する output-style runtime-composition graph
  coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [X] T670 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの output-style detail に関する browser acceptance を
  `tests/e2e/output-styles-detail.spec.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*

### 実装

- [X] T671 [US2] この phase が記録する output-style の selection strategy を
  `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T672 [US2] output-style metadata と正確な解決済みの値の保持のために Markdown extraction と scan integration を
  `src/server/inspection/parsers/markdown.ts` と `src/server/inspection/scan.ts` で拡張する *(2026-08-06
  修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T673 [US2] 型付き output-style 詳細フィールドをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する
- [X] T674 [US2] 英語の output-style 詳細と surface メッセージをそれらを描画する Vue component に追加する *(2026-08-08修正:
  detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 67: Claude Output Styles の比較（取り下げ）

**2026-08-24 取り下げ**: 本productの比較は、1つのSource familyの内側で1つの同一性の2つのコピーを並べるものであり（spec.md § Clarifications Session 2026-08-28）、どのfamilyも1つのstyle名の2つのコピーを保持し得ない。このkindを認識するtoolは1つである。Repository familyでadmitされるlocationは1つ — 選択されたroot自身の`.claude/output-styles/`（contracts/vendors/claude-code.md § `claude.repo.output-style`、nested project layerはpath-negative）— であり、Global familyでこのkindをpublishする唯一のmemberはClaude自身のhome（`claude.global.output-style`）で、1 Source・1 directoryである。どちらのfamilyでも2 fileのrowになるのは1つのdirectory内の2つのstyleが1つの名前を取り合う場合だけである。それは一覧のrowが両方のpathとともに既に並べて示しており（FR-009）、詳細は1 fileずつ開く（FR-027）。他の各kindの比較は、vendorまたはSource boundaryが1つのfamily内に並行するコピーを強いるために存在するが、このkindにはそのどちらも無い。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T675–T678は空き番号のままとする。 *(2026-08-30 修正: 拡張されたGlobal memberの上で論拠を述べ直した — User stylesは現在読まれるが、1 familyの1 Sourceであり、やはりpairを生まない。)*

---

## フェーズ 68: Codex Marketplaces のインベントリ（取り下げ）

**2026-08-24 取り下げ**: marketplace catalogは、plugin名をそのpluginの取得元へ解決する対応表であり、それ自体がrowの主体ではなくplugin kindのcarrierである。plugin rowの単位を宣言された1つのplugin名とすることで（フェーズ 76）、catalogの各entryは — `./`のlocal pathも、`github`・`npm`・`archive`・`command` sourceも同様に — それを解決したentryを示す自身のplugin rowとして現れる。これは、MCP rowがserver名を解決する各`(carrier, tool)`宣言を示す一方で`.mcp.json`自身はrowにならないのと同じ形である。catalog固有に残るのは`name`、`owner`、`metadata.pluginRoot`だけであり、carrier自身の詳細がそれらをpublishする。catalogは引き続き読まれる — local plugin manifestをadmitするbounded derivationのseedだからである（フェーズ 76）。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T679–T688は空き番号のままとする。

---

## フェーズ 69: Codex Marketplaces の詳細（取り下げ）

**2026-08-24 取り下げ**: 詳細surfaceはinventory rowを開くものであり、フェーズ 68 がそのrowを取り下げた。このフェーズが示すはずだった事実 — plain-stringとobject `source.path`の両形式での宣言済みsource、その解決値、`./` sourceが名指すlocal relationship — はいずれもそのentryが解決するpluginについての事実であり、plugin詳細がそれをpublishする（フェーズ 77）。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T689–T698は空き番号のままとする。

---

## フェーズ 70: Claude Marketplaces のインベントリ（取り下げ）

**2026-08-24 取り下げ**: `.claude-plugin/marketplace.json`は、フェーズ 68 がCodexについて述べたのと同じ理由でplugin kindのcarrierである — plugin名をそのsourceへ解決するものであり、読者が検分する他の内容を持たない。したがってそのentryはcatalog rowではなくClaudeのplugin rowとして現れる（フェーズ 78）。catalogはlocal plugin manifestをadmitするbounded derivationのseedとして引き続き読まれる。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T699–T708は空き番号のままとする。

---

## フェーズ 71: Claude Marketplaces の詳細（取り下げ）

**2026-08-24 取り下げ**: フェーズ 70 がこの詳細の開くrowを取り下げており、各entryのsource、`ref`/`sha`のpin、local relationshipは、そのentryが解決するplugin rowに属する（フェーズ 79）。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T709–T718は空き番号のままとする。

---

## フェーズ 72: Copilot Marketplaces インベントリ（取り下げ）

**2026-08-24 取り下げ**: Copilotのcatalogもフェーズ 68 が述べた理由でplugin kindのcarrierであり、そのentryはcatalog rowではなくCopilotのplugin rowとして現れる（フェーズ 80）。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T719–T728は空き番号のままとする。

---

## フェーズ 73: Copilot Marketplaces の詳細（取り下げ）

**2026-08-24 取り下げ**: フェーズ 72 がこの詳細の開くrowを取り下げており、示すはずだった内容はcatalogが解決するplugin rowに属する（フェーズ 81）。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T729–T738は空き番号のままとする。

---

## フェーズ 74: 統合 Marketplaces インベントリ（取り下げ）

**2026-08-24 取り下げ**: 統合インベントリは1つのkindについて3 vendorのrowを束ねるものだが、フェーズ 68・70・72 がその3つすべてを取り下げた。catalogに必要だった統合は統合pluginインベントリであり（フェーズ 82）、そこでは1つのplugin名がそれを解決する全catalog entryを担う。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T739–T746は空き番号のままとする。

---

## フェーズ 75: Marketplaces 比較（取り下げ）

**2026-08-24 取り下げ**: 本productの比較は1つの同一性の2つのコピーを並べるものであり、marketplace rowが無い以上、対にすべきcatalogの同一性も無い。同じplugin名を列挙する2つのcatalogは、その名前が1つのrowとなる場所 — plugin比較（フェーズ 83）— で比較される。以降の各フェーズが自身の番号を保てるようフェーズ番号は残し、T747–T750は空き番号のままとする。

---

## フェーズ 76: Codex Plugins インベントリ

**目的**: Codexのplugin行 — 宣言されたplugin名ごとに1行 — を、検証済みlocal Codex marketplace catalogの各entryから追加する。`./` sourceが名指すplugin rootを列挙し、その行のpluginが同梱するfileとする。

**独立テスト**: catalog entryが宣言するplugin名ごとに1行をinventoryに含め、各行がそれを解決する全catalogと、名指されたroot配下のfileを列挙することを確認する。`git-subdir`/`npm`/絶対path/`~`/rootを出るpathのentryはここで何も占めない行になること、列挙するrootのcontainment、execution-environment capacityだけに従うcomplete deterministic retention、rootが無い場合はfailureではなくfile 0件になること、どのroot配下にもcandidateが生じないこと、物理fileごとに一度のreadを確認する。注入したfileに閉じたfailureはそのfileのper-file diagnosticを持つpartial generationになり、fileに閉じないfailureはdomain classification/retryなしに変更なく伝播し、item/recognition/derived result/body/generationを一切作らずattemptをabortし、prior commitだけを保持する。

**目に見えるチェックポイント**: ユーザーは、宣言済みsourceがRepositoryの外にあるものも含め、作成済みCodex pluginをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T751 [US1] ニアミスとしてのルート manifest、有効な `./` ローカルカタログソース、正確な `.codex-plugin/plugin.json`
  対象、欠落した対象、多数のソース、remote/absolute/home/traversal ソース、リンク、コンポーネント宣言、ニアミス、注入した execution-environment
  throw/rejection を対象とする Codex plugin-manifest フィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-24修正: manifest
  candidateを表すfixtureは1つも無い。repository自身の`.codex-plugin/plugin.json`はそのrepositoryが配布するpluginであってclientがここでloadするものではなく、catalogの`./`
  root配下の同名fileはそのpluginが同梱するfileである。したがってfixtureはcatalog entryが宣言する内容 — 存在する/しない`./`
  root、`git-subdir`、`npm`、絶対path、`~`、rootを出るpath — と、存在する各rootが同梱するfileを変化させる。)*
- [X] T752 [US1] Codex plugin-manifest の振る舞い、静的/有界導出候補、関係、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T753 [P] [US1] `codex.repo.marketplace`、一エッジ、`./` ソースの受け入れ、それが名指す plugin
  root、コンポーネントファイル候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と
  `tests/unit/inspection/rules.test.ts` に追加する *(2026-08-24修正:
  manifestをadmitするruleも導出するruleも存在しない。Plugin rootはdiscoverされずactivateされるため、repository自身のroot
  manifestはそこでclientが読むcustomizationではなく、そのrepositoryが公開するpluginである。Catalogのlocal
  entryが名指す先は、そのcatalogをadmitしたruleが列挙し、配下の全file — manifestを含む —
  をそのpluginのfileとして公開する。自身のrowは持たない。)*
- [X] T754 [US1] environment capacityにのみ従うcomplete deterministic static/derived Codex manifest
  retention、missing target、containment、link、scan-attempt-local one-read、component read 0件のfailing
  scan testを追加する。注入したfileに閉じたfailureはpartial
  generationでそのfileのdiagnosticだけを生み、fileに閉じないfailureはdomainでcatch/classify/retry/manifest
  item/recognition/provenance/result/generation化せず変更なしにouter boundaryへ伝播しprior
  commitを保持することを`tests/integration/repository-scan.test.ts`で証明する *(2026-08-24修正:
  pluginについてscanが保持するのは、catalog
  entryが名指したroot配下のfileであり、recognitionの後にdirectoryごとに1回ずつ列挙する。このSourceが持たないrootは、candidateでもdiagnosticでもattempt失敗でもなく、fileを持たないofferingになる。)*
- [X] T755 [US1] plugin名ごとに1つのCodex行、そのcarrier一覧、非localのcatalog
  entryだけをcarrierとする行、欠落manifest、除外、診断を対象とするブラウザ受け入れテストを `tests/e2e/codex-plugins-inventory.spec.ts`
  に追加する *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)*

### 実装

- [X] T756 [US1] アクティベーション権限を持たない Codex plugin-manifest の振る舞いと検索記述を
  `src/shared/registries/vendor-behaviors.ts` に追加する *(2026-08-25修正: plugin behaviorは製品共通のlocal-host
  surfaceではなく`codex-plugin-clients`を持つ。pluginsページを読み直すと、marketplaceの読み取り、install、cacheからのload、enablement値はすべてChatGPT
  desktop appのものとして確立され、その傍らのCodex CLIはmarketplace管理であって最後はinstallをdesktop appへ差し戻している。IDE
  extensionはどこにも登場しないため、広い方のsurfaceはページが何も確立していないclientを主張していた。)*
- [X] T757 [US1] コンポーネントパス除外の所有をフェーズ 77 に残し、Codex の静的および有界導出 plugin-manifest レコードだけを
  `src/shared/registries/inspection-rules.ts` に追加する *(2026-08-24修正:
  このphaseが出荷するrecordは`codex.repo.marketplace`だけである。manifest candidateを導出するものが無いためである。)*
- [X] T758 [US1] Codex plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence`
  citation に追加する *(2026-08-25修正: plugin behaviorは製品共通のlocal-host
  surfaceではなく`codex-plugin-clients`を持つ。pluginsページを読み直すと、marketplaceの読み取り、install、cacheからのload、enablement値はすべてChatGPT
  desktop appのものとして確立され、その傍らのCodex CLIはmarketplace管理であって最後はinstallをdesktop appへ差し戻している。IDE
  extensionはどこにも登場しないため、広い方のsurfaceはページが何も確立していないclientを主張していた。)*
- [X] T759 [US1] 検証済みの `./` ローカル marketplace ソースから正確な `.codex-plugin/plugin.json`
  対象への、ルートと完全一致するマッチングおよびdirect one-edge Codex manifest derivationだけを
  `src/server/inspection/rules/codex.ts` に実装する *(2026-08-24修正: catalog unitは、宣言された各pluginがどこにあるかに答える
  — 検証済みの`./` local sourceはそのpluginのroot directoryであり、それ以外のsource形式はこのSourceが持つどのdirectoryも名指さない —
  。そこからcandidateは導出しない。)* *(2026-08-25修正:
  catalogのreadingは、そのroot内にあるplugin自身のmanifestにも答える。clientがpluginの自己宣言として読むfileがどれかはこのvendorのcontractであり、どのsurfaceもpathからは導けないからである。)*
- [X] T760 [US1] 静的/シード来歴を備え、コンポーネントを昇格しない Codex plugin-manifest 認識を
  `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-24修正: catalog
  recognitionはentryごとに1つの宣言を公開し、各宣言はそのentry自身のfieldと、名指したplugin
  rootまたは何も持たない。componentもmanifestもcandidateにはならない。)*
- [X] T761 [US1] Deterministic one-edge Codex manifest admission、1 Source scan attemptのverified
  group read、exactなraw-path aggregationを`src/server/inspection/scan.ts`へ統合する —
  seedはこのvendorの2つの固定catalog
  locationであるため、導出はwalkに先立つ既存の構成読み取りstageに属し、targetはその1回のwalkの通常のtargetとなる *(2026-08-24修正:
  catalogは通常のwalkがadmitするため、宣言された各pluginがどこにあるかはそのcandidateが認識された時点で判明する。答えるのはCodexのcatalog
  unitであり、`scan.ts`はwalkの後に名指されたdirectoryを列挙する。plugin専用の分岐も専用のstageも持たない。)*。fileに閉じたreadまたはparse
  failureはそのfileのdiagnosticに変換し、それ以外のfailureはmanifest item/recognition/provenance/derived
  result/body/generationを作らずにattemptをabortさせ、prior commitだけを保持してfailure reportingはtrigger所有のouter
  boundaryへ委ねる。Read/assembly
  throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter
  boundaryへ伝播する
- [X] T762 [US1] インベントリ行 — 宣言されたplugin名ごとに1行、それを解決する全carrierを列挙する — と、英語の Codex plugin
  の静的/導出および除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する

---

## フェーズ 77: Codex Plugins の詳細

**目的**: 名前を解決する全carrier — catalog entryの宣言済みsourceを含む — にわたる完全なリテラルのCodex plugin detailを、authored stateとrelationship-onlyのcomponent declarationとともに追加し、一つだけの正確なnon-read exclusion `codex.excluded.plugin-files`を所有する。

**独立テスト**: malformedおよびliteral credentialを含むpluginを開き、各carrier自身の宣言content、plain-stringとobject `source.path`の両形式でのcatalog entryのsourceとその解決値、非localのentryだけをcarrierとする行、installation/enablement/trustの分離、Hook/MCP/app/skill/script/asset component relationship、正確な `codex.excluded.plugin-files` の処理、MCP candidate を追加せずにフェーズ 23/24 の plugin path-negative context を更新すること、正確な解決済みの値、diagnostics、宣言を通じて開かれるcomponentが1件も無いこと — plugin root配下のfileはpluginが同梱するfileの1つとして読まれるのであって、manifestが書いた値を根拠に読まれることはない — activationがゼロであることを検証する。

**目に見えるチェックポイント**: Codex pluginを選択すると、どのcomponentもloadせず、それを解決する全carrierの完全でinertなauthored metadataが表示される。

### テストを先に

- [X] T763 [US2] 一つだけの正確な `codex.excluded.plugin-files` レコードを、最終的に影響を受ける振る舞い
  `codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている
  `codex.behavior.user.plugins` とともに具体化し、失敗するレジストリカバレッジを追加する。plugin コンポーネントパスが決して候補にならず、以前の MCP
  パス不一致ケースが影響を受ける振る舞いの集合を変えずにこの除外を参照できることを `tests/fixtures/conformance/inspection-rules.json` と
  `tests/contract/inspection-rules.test.ts` で証明する
- [X] T764 [P] [US2] 作成済みメタデータ、ローカル marketplace エントリ、インストール/有効化/信頼の分離、静的/導出来歴、relationship-only
  のコンポーネントに対する失敗する Codex plugin テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [X] T765 [P] [US2] plugin コンポーネントの import、skill read、app load、hook execution、MCP
  connection、script/asset read、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T766 [US2] 相互の契約参照を備えた、失敗する Codex plugin activation/relationship グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T767 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Codex plugin detail、authored
  state、relationship、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを
  `tests/e2e/codex-plugins-detail.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T768 [US2] 一つだけの非読み取り `codex.excluded.plugin-files`
  レコードを、`codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている
  `codex.behavior.user.plugins` への最終的な影響参照とともに追加する。フェーズ 24 の MCP plugin-path 診断が MCP
  候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、install、cache、runtime-state の除外 ID は
  `src/shared/registries/inspection-rules.ts` に一切追加しない
- [X] T769 [US2] closed Codex plugin-manifest field ID、正確な component-source
  の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を
  `src/server/inspection/parsers/json.ts` で拡張する *(2026-08-24 修正:
  parserはformat自身のseamのままであり、vendorごとに何も加えない。carrierはfileが書いたkeyによって公開される。これは全kindに対するFR-007の規則であり、closedなfield
  catalogはそれに反する。Local sourceのresolved
  valueは、rowが既にそのpluginの2つ目のcarrierとして列挙している派生manifestであり、再度公開すれば1つの事実とその派生物を二重に持つことになる。Recognition-atomicな失敗とsource値を含まないdiagnosticは既に`extraction.ts`とdiagnostic
  registryのものである。)*
- [X] T770 [US2] Codex plugin の authored、installed、enabled、trusted、local、activation、relationship
  の各戦略を `src/shared/registries/runtime-composition.ts` に追加する
- [X] T771 [US2] closed allowlist 内の Codex plugin-manifest metadataと relationship-only のコンポーネントを
  `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-24 修正:
  relationship-onlyとは、componentの値をそれ自身である宣言として公開し、何もadmitしないことを意味する。`codex.excluded.plugin-files`がそれを記録する。このreleaseでは`Relationship`を公開するsurfaceが存在しないためである。)*
- [X] T772 [US2] アトミックな manifest 解析、正確な解決済みの値の抽出、relationship-only の component、正確な
  `codex.excluded.plugin-files` diagnostics、完全な authored source を保持しながら行う parser
  scratch/transient-semantic の破棄を `src/server/inspection/scan.ts` に統合する *(2026-08-24 修正:
  scanのplugin作業はT761が持つ構成読み取り段階のderivationである。exclusionは自身のdiagnosticを生まない。それが名指すfileはcandidateにならず、diagnosticはscanが読んだfileに属するからである。)*
- [X] T773 [US2] 型付き詳細と、英語の Codex plugin の作成済み状態と関係のメッセージをそのkind自身のdetail route（`src/app/pages/` 配下）
  で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-24修正:
  requestはcarrierだけでなくplugin rowも指名する。よってcatalogはoffering
  1件について答え、そのoffering自身の宣言を完全なsourceとともにserveする。宣言済みsourceがこのrepositoryのplugin
  rootを指さないofferingはその旨を述べ、entry自身の宣言済み`source`をその横に置く。Pluginとはそのrootであるため、行のfileはそのroot配下でgenerationが公開したfileであり、detailはskillと同じfile
  treeを描く。RouteはPluginが同梱するどのfileも開き、読み手がplugin全体を把握するsurfaceになる。)* *(2026-08-25修正: detailはskill
  detailと同じ2つのtab — pluginが宣言する内容と、同梱するfile — であり、読んでいるfileはrow自身のqueryの傍らの`file`
  queryである。したがってpluginのfileを専用pageのlink経由で参照することはない。1枚目のtabはcatalog
  entryとplugin自身のmanifest（場所はserveされた宣言の`manifestPath`が名指す）を持つ: entryはpluginについての1
  fileの言明、manifestはplugin自身のものであり、skillが`SKILL.md`の宣言で開くのと同じく、pageはこの両方で開く。)*

---

## フェーズ 78: Claude Plugins インベントリ

**目的**: Claudeのplugin行 — 宣言されたplugin名ごとに1行 — を追加する。carrierは、配置だけでloadされるpluginをpluginたらしめる`claude.repo.skills-directory-plugin`のmanifestと、repository自身の`claude.repo.marketplace` catalogのentryである。どちらのplugin root配下のfileも、そのpluginの同梱fileとして列挙する。

**独立テスト**: plugin名ごとに1行 — skills-directory pluginは`<folder>@skills-dir`、catalog entryは`<plugin>@<marketplace>` — をinventoryに含め、各行がcarrierと、名指したroot配下のfileを列挙することを確認する。このrepositoryが持たないsourceのcatalog entryはここで何も同梱しない行になること、plugin root自身のoptional manifestはcarrierではなくそのpluginのfileの1つであること、どのroot配下にもcandidateが生じないこと、宣言を通じたcomponent readが1件も無いことを確認する。

**目に見えるチェックポイント**: ユーザーは、catalogが名前を挙げてもRepositoryが実体を持たないものも含め、Claude pluginをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T774 [US1] 正確なルート、有効なローカルカタログソース、任意で存在しない場合、多数のソース、祖先のニアミス、リンク、コンポーネント、禁止されたソース、注入した
  execution-environment throw/rejection を対象とする Claude plugin-manifest フィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-25修正: repository自身のrootをplugin
  rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T775 [US1] フェーズ 25 が所有する Claude plugin の振る舞いを再利用し、振る舞い ID を重複させずに、正確な静的/導出候補、関係、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T776 [P] [US1] 正確な
  `claude.repo.plugin-manifest`、`claude.derived.local-plugin-manifest`、任意で存在しない場合、一エッジ、祖先スキャンがないこと、コンポーネント候補がないことに対する失敗するレジストリ/マッチャーテストを
  `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
  *(2026-08-25修正: repository自身のrootをplugin rootとしてadmitするruleは無く、catalog
  entryからmanifestを導出するruleも無い。plugins referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T777 [US1] environment capacityにのみ従うcomplete deterministic static/derived Claude manifest
  retention、containment、link、scan-attempt-local one-read、component read 0件のfailing scan
  testを追加する。注入したfileに閉じたfailureがpartial
  generationでそのfileのdiagnosticだけを生み、fileに閉じないfailureはdomainでcatch/classify/retry/manifest
  item/recognition/provenance/derived result/body/generation化されず変更なしにouter boundaryへ伝播し、prior
  commitだけを保持することを`tests/integration/repository-scan.test.ts`で証明する *(2026-08-25修正:
  repository自身のrootをplugin rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T778 [US1] plugin名ごとに1つのClaude行、そのcarrier一覧、manifestが任意で存在しない場合、除外、診断を対象とするブラウザ受け入れテストを
  `tests/e2e/claude-plugins-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)* *(2026-08-08修正: registration と trust は
  Inspector が読まない runtime input であり、その file 単位の説明はどこにも描画しない（FR-009、T091）。)*

### 実装

- [X] T779 [US1] フェーズ 25 が所有する `claude.behavior.repo.plugin` と `claude.behavior.user.plugins`
  を再利用し、ルートおよびローカル marketplace の plugin 検索について重複する振る舞い ID を
  `src/shared/registries/vendor-behaviors.ts` に追加しない
- [X] T780 [US1] コンポーネントパス除外の所有をフェーズ 79 に残し、`claude.repo.plugin-manifest` と
  `claude.derived.local-plugin-manifest` だけを `src/shared/registries/inspection-rules.ts` に追加する
  *(2026-08-25修正: repository自身のrootをplugin rootとしてadmitするruleは無く、catalog
  entryからmanifestを導出するruleも無い。plugins referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T781 [US1] Claude plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence`
  citation に追加する
- [X] T782 [US1] ルートと完全一致し、direct one-edge local-marketplace Claude manifest derivationを
  `src/server/inspection/rules/claude.ts` に実装する *(2026-08-25修正: repository自身のrootをplugin
  rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T783 [US1] 来歴、optional-manifest、信頼を備え、コンポーネントを昇格しない Claude plugin-manifest 認識を
  `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-25修正: repository自身のrootをplugin
  rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T784 [US1] Deterministic Claude manifest admission、1 Source scan attemptのverified group
  read、optional absenceを`src/server/inspection/scan.ts`へ統合する。fileに閉じたreadまたはparse
  failureはそのfileのdiagnosticに変換し、それ以外のfailureはmanifest item/recognition/provenance/derived
  result/body/generationを作らずにattemptをabortさせ、prior commitだけを保持してfailure reportingはtrigger所有のouter
  boundaryへ委ねる。Read/assembly
  throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter
  boundaryへ伝播する *(2026-08-25修正: repository自身のrootをplugin rootとしてadmitするruleは無く、catalog
  entryからmanifestを導出するruleも無い。plugins referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T785 [US1] インベントリ行 — 宣言されたplugin名ごとに1行、それを解決する全carrierを列挙する — と、英語の Claude plugin の
  optional-manifest、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
  *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)* *(2026-08-08修正: registration と trust は Inspector が読まない runtime input であり、その file
  単位の説明はどこにも描画しない（FR-009、T091）。)*

---

## フェーズ 79: Claude Plugins の詳細

**目的**: 名前を解決する全carrierにわたる完全なリテラルのClaude plugin detailを、optional authored metadataとrelationship-only componentとともに追加し、一つだけの正確なnon-read exclusion `claude.excluded.plugin-files`を所有する。manifest carrierのinline MCP mapはそのcarrier自身のdeclared detail contentである。MCP surfaceに合流するのは明示的なMCP構成だけだからである。

**独立テスト**: skills-directory pluginとcatalogのofferingを開き、各carrier自身のcontent — manifestはそのfileとして完全にserveされ、catalog entryはcatalogのbyteを伴わずその宣言としてserveされる — 、各plugin root配下のfileがそのpluginのfileとして読まれること、pluginのfileの1つであるmalformed manifestは通常のfileとして読まれること、MCP candidateもaffected behaviorも増やさずにフェーズ25/27のpath-negative diagnosticを更新する正確な`claude.excluded.plugin-files`処理、literal credentialとenvironment referenceが書かれたとおりであること、connectionがゼロであること、宣言を通じて開かれるcomponentが1件も無いことを確認する。

**目に見えるチェックポイント**: Claude pluginを選択すると、activationせず、全carrierの完全でinertなauthored metadataとcomponent relationshipが表示される。

### テストを先に

- [X] T786 [US2] 一つだけの正確な `claude.excluded.plugin-files` レコードを、影響を受ける参照
  `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace`
  だけとともに具体化し、失敗するレジストリカバレッジを追加する。このレコードが MCP 候補または影響を受ける振る舞いを追加せずにフェーズ 25/27 の MCP plugin-path
  診断を更新し、plugin コンポーネントパスが決して候補にならないことを `tests/fixtures/conformance/inspection-rules.json` と
  `tests/contract/inspection-rules.test.ts` で証明する
- [X] T787 [P] [US2] 作成済みメタデータ、任意の manifest、いかなるMCP
  recognitionも無いこと、登録/アクティベーションの不確実性、既定/明示コンポーネントに対する失敗する Claude plugin テストを
  `tests/unit/inspection/claude-metadata.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T788 [P] [US2] Claude コンポーネントの import、skill/command/agent/style read、hook execution、MCP
  connection、script/asset load、registration、install、cache inspection、remote fetch
  が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T789 [US2] 相互の契約参照を備えた、失敗する Claude plugin activation/relationship グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけであり、このcoverageが含めるべきMCP owner-adapter bindingは存在しない。)*
- [X] T790 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Claude plugin detail、authored/optional state — inline
  MCP mapはmanifest自身の宣言contentとして — とrelationship-only の component path、connection
  がゼロであること、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを
  `tests/e2e/claude-plugins-detail.spec.ts` に追加する *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*

### 実装

- [X] T791 [US2] 一つの非読み取り `claude.excluded.plugin-files` レコードを、影響を受ける参照
  `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに追加する。フェーズ 25/27 の MCP
  plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、User、cache、install、runtime-state の除外 ID は
  `src/shared/registries/inspection-rules.ts` に追加しない
- [X] T792 [US2] closed Claude plugin-manifest field ID、正確な default/explicit component-source
  の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を
  `src/server/inspection/parsers/json.ts` で拡張する *(2026-08-25修正: repository自身のrootをplugin
  rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T793 [US2] Claude plugin の登録、アクティベーション、optional-manifest、component-resolution、relationship
  の各戦略を `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-20修正: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T794 [US2] closed allowlist 内の Claude plugin-manifest metadata、relationship-only のコンポーネントを
  `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-20修正: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)*
- [X] T795 [US2] Claude manifest 解析、正確な解決済みの値の抽出、synthetic file も connection
  も作らない正確な解決済みの値、relationship-only の component、MCP candidate を変えない更新済み plugin-path exclusion
  diagnostic、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を
  `src/server/inspection/scan.ts` に統合する *(2026-08-25修正: repository自身のrootをplugin
  rootとしてadmitするruleは無く、catalog entryからmanifestを導出するruleも無い。plugins
  referenceを読み直すと、Claudeにおいて配置だけで成立するpluginが1つ確立される —
  `.claude/skills/`配下のfolderが`.claude-plugin/plugin.json`を持てば、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがって`claude.repo.skills-directory-plugin`がそのmanifestをcarrierとしてadmitし、`claude.repo.marketplace`がrepository自身のcatalogをadmitし、どちらのplugin
  root配下のfileもそのpluginの同梱fileとして列挙される。)*
- [X] T796 [US2] 型付き詳細と、英語の Claude plugin の任意状態とコンポーネントのメッセージをそのkind自身のdetail route（`src/app/pages/`
  配下） で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 80: Copilot Plugins インベントリ

**目的**: Copilotのplugin行 — 宣言されたplugin名ごとに1行 — を、文書化された4つのmarketplace locationにあるrepository自身のcatalogのentryを carrier として追加する。名指された各root配下のfileはそのpluginの同梱fileとして列挙する。あわせて`copilot.excluded.cli-extensions`だけを所有し、実行可能なproject extensionがplugin candidateになることを防ぐ。

**独立テスト**: `marketplace.json`、`.plugin/marketplace.json`、`.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json`のいずれからも、catalog entryが宣言するplugin名ごとに1行をinventoryに含めることを確認する。名指されたroot配下のfileが — そのrootが使う形式のmanifestを含めて — その行に届くこと、このrepositoryが持たないsourceはここで何も同梱しない行になること、containment、正確な`copilot.excluded.cli-extensions`、どのroot配下にもcandidateが生じないこと、宣言を通じて開かれるcomponentが1件も無いことを確認する。

**目に見えるチェックポイント**: ユーザーは、catalogが名前を挙げてもRepositoryが実体を持たないものも含め、Copilot pluginをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T797 [US1] 四つすべてのルート/導出形式、順序、多数のソース、共有 Claude manifest、欠落形式、リンク、コンポーネント、CLI
  extension、installed/hosted 状態、禁止されたソース、注入した execution-environment throw/rejection を対象とする Copilot
  plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-25修正:
  plugin manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T798 [US1] Copilot plugin の振る舞い、読み取り権限を付与しない
  `copilot.behavior.cli.extensions`、静的/導出候補、影響を受ける振る舞いへの参照を持つ正確な
  `copilot.excluded.cli-extensions`、関係、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T799 [US1] Four root form、`plugins/foo`/`./plugins/foo`、documented four-target
  order、environment capacityだけを条件として全validated targetへ行うdirect one-edge derivation、forbidden source
  form、shared recognition、`copilot.excluded.cli-extensions` mapping、extension-as-plugin
  candidateが0件であることのplugin matcher/derivation/registry failing
  testを追加する。Matcherまたはderivationのすべてのthrow/rejectionがdomainでcatch、cause
  classification、retry、program/plan/candidate/manifest/derived
  output、Diagnostic、item/recognition/result/body/generation化されず変更なしに伝播し、prior commitだけを保持してlifecycle
  handlingをtrigger-owning
  boundaryへ委ねることを`tests/unit/inspection/rules.test.ts`、`tests/integration/repository-scan.test.ts`、`tests/contract/inspection-rules.test.ts`で証明する
  *(2026-08-25修正: plugin manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)* *(2026-08-25修正: このvendorでは文字列のentry
  sourceは`./`を任意とする相対pathであり、宣言された`metadata.pluginRoot`配下に解決される。clientがそう解決するためである。`owner/repo`短縮形はmarketplace追加commandに属し、そこではsourceがcatalogを名指す（T1126）。)*
- [X] T800 [P] [US1] manifest 形式の順序、静的/導出来歴、surface の事実、共有 Claude
  manifest、installed/hosted/component 候補がないことに対する失敗する Copilot 認識テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-25修正: plugin
  manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T801 [US1]
  plugin名ごとに1つのCopilot行、各carrierのmanifest形式を含むcarrier一覧、形式順序、surfaceバッジ、除外、診断を対象とするブラウザ受け入れテストを
  `tests/e2e/copilot-plugins-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T802 [US1] plugin 戦略と正確な extension 除外がアクティベーション権限または読み取り権限なしで解決されるように、surface で修飾された Copilot
  plugin 検索記述と、読み取り権限を付与しない `copilot.behavior.cli.extensions` および
  `copilot.behavior.cli.user.extensions` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T803 [US1] 静的な `copilot.repo.plugin-manifest` と有界導出の `copilot.derived.local-plugin-manifest`
  レコードを追加し、正確な非読み取り `copilot.excluded.cli-extensions` だけを所有する。installed、hosted、component パスは
  `src/shared/registries/inspection-rules.ts` でパス不一致のまま保つ *(2026-08-25修正: plugin
  manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T804 [US1] Copilot plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence`
  citation に追加する
- [X] T805 [US1] Documented local forms/four-target order/direct
  one-edge/containment/forbidden-source
  rejectionを持つ`copilot.derived.local-plugin-manifest`を実装する。Derivation
  throw/rejectionはdomainでcatch/classify/retry/program/plan/candidate/manifest/result化せず変更なしにouter
  boundaryへ伝播する処理を`src/server/inspection/rules/copilot.ts`へ実装する *(2026-08-25修正: plugin
  manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T806 [US1] ルートと完全一致する Copilot manifest のマッチングと順序付きの静的/導出認識を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
  *(2026-08-25修正: plugin manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T807 [US1] Deterministic Copilot manifest admission、1 Source scan attemptのverified group
  read、complete success handlingを`src/server/inspection/scan.ts`へ統合する。fileに閉じたreadまたはparse
  failureはそのfileのdiagnosticに変換し、それ以外のfailureはmanifest item/recognition/provenance/derived
  result/body/generationを作らずにattemptをabortさせ、prior commitだけを保持してfailure reportingはtrigger所有のouter
  boundaryへ委ねる。Read/assembly
  throw/rejectionはdomainでcatch/classify/retry/Diagnostic/item/recognition/provenance/result/generation/partial化せず変更なしにouter
  boundaryへ伝播する *(2026-08-25修正: plugin manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T808 [US1] インベントリ行 — 宣言されたplugin名ごとに1行、各carrierのmanifest形式とともに列挙する — と、英語の Copilot plugin
  形式、surface、除外メッセージを そのkindのrow component（`src/app/components/inventory/rows/`） で拡張する
  *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)*

---

## フェーズ 81: Copilot Plugins の詳細

**目的**: 各carrierが宣言するものから始まる、完全なリテラルのCopilot plugin detailを追加する。

**独立テスト**: catalogのofferingを開き、linkが名指したentryがcatalog自身のbyteを伴わずserveされること、名指されたrootが実際に使うmanifest形式がそのpluginのfileの1つとして開かれること、VS Code/CLI/Cloudのstate分離、agent/skill/hook/MCP/LSP/script/assetがrelationshipのみであること、`copilot.excluded.cli-extensions`がextension candidateを生まないこと、literal credentialとenvironment referenceが書かれたとおりであること、diagnostics、component activationがゼロであることを確認する。

**目に見えるチェックポイント**: Copilot pluginを選択すると、コンポーネントをロードせずに、全carrierの作成済みメタデータが表示される。

### テストを先に

- [X] T809 [P] [US2] VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、ツール横断メタデータ、relationship-only
  のコンポーネント、および `copilot.excluded.cli-extensions` が plugin 候補を決して生成しないことの回帰に対する失敗する Copilot plugin
  テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [X] T810 [P] [US2] script import、agent/skill/component read、hook execution、MCP connection、LSP
  start、asset load、remote fetch、installed/cache inspection が一切ないことを証明するゼロアクティベーションテストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T811 [US2] 相互の契約参照を備えた、失敗する Copilot plugin activation/relationship グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T812 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Copilot plugin detail、authored/runtime
  state、relationship、diagnostics、detail state のクリーンアップに関するブラウザー受け入れテストを
  `tests/e2e/copilot-plugins-detail.spec.ts` に追加する

### 実装

- [X] T813 [US2] closed Copilot plugin-manifest field ID、正確な component-source
  の解決済みの値、recognition-atomic failure、source-value-free diagnostics によって atomic JSON extraction を
  `src/server/inspection/parsers/json.ts` で拡張する *(2026-08-25修正: plugin
  manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T814 [US2] Copilot VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、関係の各戦略を個別に
  `src/shared/registries/runtime-composition.ts` へ追加する
- [X] T815 [US2] closed allowlist 内の Copilot plugin-manifest metadataと relationship-only のコンポーネントを
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T816 [US2] Copilot manifest 解析、正確な解決済みの値の抽出、relationship-only の component、exclusion、完全な
  authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/server/inspection/scan.ts`
  に統合する *(2026-08-25修正: plugin manifestをadmitするruleは無く、導出するruleも無い。plugin
  rootはinstall、登録済みcatalog、editor設定の絶対pathで確立されるものであり、Repository
  pathにfileが現れることによってではない。したがって`copilot.repo.marketplace`が文書化された4つのcatalog
  locationをadmitし、entryが名指すroot配下のfileは — そのrootが使う形式のmanifestを含め —
  そのpluginの同梱fileとして列挙され、`copilot.excluded.cli-extensions`は実行可能なproject extensionがplugin
  manifestではないことを述べる。)*
- [X] T817 [US2] 型付き詳細と、英語の Copilot plugin 状態、コンポーネント、surface メッセージをそのkind自身のdetail
  route（`src/app/pages/` 配下） で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその
  maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

---

## フェーズ 82: 統合 Plugins インベントリ

**目的**: 3 vendorのplugin行を統合して1つのplugin名を、それを解決する全`(carrier, tool)`を列挙する1行とする。共有の`.claude-plugin/marketplace.json`は1回だけ読み、3製品すべてのrecognitionを付ける。pluginが同梱するfile内のMCP風の値はそのfile自身の内容であり、どのMCP rowにも合流しない。 *(2026-08-25修正: 共有されるfileはmanifestではなくcatalogである。`.claude-plugin/marketplace.json`はCodexのlegacy互換location、Claudeがrepository自身のcatalogとして文書化する場所、Copilotが検査する4つ目の形式であり、1つのfileが3つのrecognitionを持つ。plugin manifestをadmitするruleは存在せず、残りは各製品自身のcatalog locationが担う。)*

**独立テスト**: 共有catalogが1つの物理fileとして1回だけ読まれ、3つのplugin recognitionを持つこと、宣言された名前ごとに1行で認識tool ごとのcarrierを列挙すること、名指されたplugin root配下のfileがどの製品経由でもその行に届くこと、このrepositoryが持たないsourceはここで何も同梱しない行になること、pluginのfile内のMCP風の値がどのMCP rowにも合流せず同梱skillもskill rowにならないこと、3つのexclusion、tool filterが統合された行を絞り込むことを確認する。 *(2026-08-25修正: derivation、seed provenance、synthetic MCP fileは、どのruleも実装していないmodelを述べている — 目的の修正注記を参照。)*

**目に見えるチェックポイント**: ユーザーは、どの製品が解決するものであっても、作成済みpluginの解釈を名前ごとに1行として把握でき、pluginが同梱する各fileを他のkindのinventoryではなくそのplugin自身のpageで見られる。

### テストを先に

- [X] T818 [US1] すべてのルート/導出形式、inline MCP mapを自身の宣言contentとして綴る共有 Claude/Copilot ファイル、欠落した任意
  manifest、relationship-only のコンポーネント、除外、シークレット、不正な内容、注入した execution-environment throw/rejectionを対象に
  plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる *(amended
  2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-25修正: 共有されるfileは3製品すべてが読むcatalog
  `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T819 [US1] plugin-manifest の振る舞い、マッチャー、導出、composition、関係、正確な
  `codex.excluded.plugin-files`/`claude.excluded.plugin-files`/`copilot.excluded.cli-extensions`、パス不一致となるランタイムケース、エビデンス適合行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる *(2026-08-25修正: 共有されるfileは3製品すべてが読むcatalog `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T820 [P] [US1] Codex、Claude、Copilot の静的/導出 manifest、共有の二重 plugin 認識、relationship-only
  のコンポーネント、決定的な形式順序、除外に対する完全なマッチャー/認識マトリクステストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-25修正: 共有されるfileは3製品すべてが読むcatalog
  `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T821 [P] [US1] Complete literalな導出metadata、catalog相対のprovenance、environment
  capacityにのみ従うdeterministic target retention、共有fileの1回読み、synthetic
  file/connectionが無いこと、componentを展開しないことを検証する。注入したfileに閉じたfailureはpartial
  generationでそのfileのdiagnosticだけを生み、それ以外の注入したfailureはdomainでのcatch、manifest
  item、recognition、provenance、導出結果、body、generationのいずれも生まずにattemptを中止し、prior
  commitだけを保持するtestを`tests/integration/repository-scan.test.ts`へ追加する *(2026-08-25修正:
  共有されるfileは3製品すべてが読むcatalog `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T822 [US1] 統合 plugin-manifest インベントリ、フィルター、plan-driven derivation、共有認識、manifest自身のinline MCP
  mapとコンポーネントパスの対比、除外、deterministic
  Diagnosticとthrow/rejection時に通常どおり報告されるerrorの対比、キーボード操作を対象とするブラウザ受け入れテストを
  `tests/e2e/plugins-inventory.spec.ts` に追加する *(2026-08-20修正: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-25修正: 共有されるfileは3製品すべてが読むcatalog
  `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*

### 実装

- [X] T823 [US1] 読み取り権限を持たない三ツールすべての plugin-manifest 検索記述を
  `src/shared/registries/vendor-behaviors.ts` で完成させる
- [X] T824 [US1] plugin-manifest の静的/有界導出候補と、既存の正確な
  `codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`copilot.excluded.cli-extensions`
  レコードだけを `src/shared/registries/inspection-rules.ts` で完成させる *(2026-08-25修正:
  共有されるfileは3製品すべてが読むcatalog `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T825 [US1] plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation
  で完成させる
- [X] T826 [US1] direct one-edge local
  derivation、一度の検証済み読み取り、決定的なツール横断の組み立て、除外、合成ファイルも接続もないこと、コンポーネントを展開しないことを
  `src/server/inspection/scan.ts` に統合する *(2026-08-25修正: 共有されるfileは3製品すべてが読むcatalog
  `.claude-plugin/marketplace.json`であり、plugin
  manifestをadmitするruleも導出するruleも存在しない。このtaskが仕上げるのは統合された行 — 宣言された1つの名前と、認識tool ごとのcarrier —
  と、名指された各root配下のfileがそこへ届くことである。)*
- [X] T827 [US1] pluginのインベントリ kind フィルターと要約を、宣言された名前ごとに1行として数え、
  `src/app/components/inventory/InventoryFilters.vue` とそのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する
- [X] T828 [US1] 英語の統合 plugin-manifest、導出、共有認識、除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 83: Plugins 比較

**目的**: 1つのplugin名の2つのコピーを、リテラルおよび型付きの差分とともに並べる、plugin kind自身の比較サーフェスを設計する。

**独立テスト**: 1つのplugin名のreadableなcurrent-generationコピーを正確に2つ比較し、activationもconnectionも行わず、完全なliteral sourceと、整列したauthored metadata — inline MCP mapも宣言値として含む — component relationship、uncertaintyを検証する。

**目に見えるチェックポイント**: ユーザーは、コンポーネントをロードまたは実行せずに1つのplugin名の2つのコピーを比較できる。

### テストを先に

- [X] T829 [US3] canonical serialized declaration
  document、form、registration、installation、enablement、trust、relationship、uncertainty に関する失敗する
  plugin-manifest 比較回帰テストを `tests/unit/app/plugin-manifest-comparison.test.ts` に追加する *(2026-08-19
  修正: 宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical serialized documentとしてMonacoでdiffする。skill・instruction・MCP
  comparisonの前例に従う（research.md § 7）。)*
- [X] T830 [US3] credential/environment-reference の差を含む完全なリテラルの plugin-manifest diff、canonical
  serialized declaration document、masking/reveal も environment substitution もないこと、typed
  state/component/MCP、accessibility、fallback、cleanup に関するブラウザー受け入れテストを
  `tests/e2e/plugins-comparison.spec.ts` に追加する *(amended 2026-08-21: acceptanceは両sideのcanonical
  serialized documentがMonacoでdiffされることを検証する。全kindの宣言済みmetadata比較が取る形である（research.md § 7）。)*
  *(2026-08-25修正:
  このsurfaceは宣言だけでなくpluginのfileも比較する。1つのpluginの2つのcopyは2つのdirectoryなので、fileのpanelは各root内で共有する名前でそれらを対にして2つのcopyをdiffし、片方のcopyしか持たない名前は、存在する側の完全な内容をもう一方の明示された不在と比較する。存在の差もこの比較の一部である（FR-011）。)*

### 実装

- [X] T831 [US3] plugin-manifest comparisonが各sideの宣言済みmetadataを1つのcanonical
  documentへserializeしてMonacoでdiffするよう拡張し、runtime state、component relationship を
  `src/app/components/plugin-comparison/RecognitionComparison.vue`（skill の前例 —
  `src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`
  — に倣ってこの task が設計・作成する、その kind 自身の比較サーフェスの一部。そこへ到達する entry link — その kind の inventory row
  component（`src/app/components/inventory/rows/` 配下）と、その kind の detail route（`src/app/pages/` 配下） —
  も、skill における T203 と同様にこの task が所有する） で分離したままにする *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有
  module は存在せず、そのサーフェスの設計・作成は skill の前例に倣ってこの task が担う（spec.md § Clarifications Session
  2026-08-14）。)* *(amended 2026-08-21: 宣言済みmetadataはsideごとに1つのcanonical serialized
  documentとしてMonacoでdiffする。skill・instruction・MCP comparisonの前例に従う（research.md § 7）。)*
  *(2026-08-25修正:
  このsurfaceは宣言だけでなくpluginのfileも比較する。1つのpluginの2つのcopyは2つのdirectoryなので、fileのpanelは各root内で共有する名前でそれらを対にして2つのcopyをdiffし、片方のcopyしか持たない名前は、存在する側の完全な内容をもう一方の明示された不在と比較する。存在の差もこの比較の一部である（FR-011）。)*
- [X] T832 [US3] 英語の plugin-manifest 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 84: Codex の独立 Hook ファイルインベントリ

**目的**: Repository root にある独立した Codex `['.codex', 'hooks.json']` 物理候補だけを追加する。 *(2026-08-17修正: vendor contract の rule 行に合わせて root 起点とする — nested な `.codex` layer は本ツールが選ばない runtime working directory のものであり、nested `AGENTS.md` が恒久的な near miss であるのと同じ理由である。)*

**独立テスト**: root の `.codex/hooks.json` をインベントリに含め、子孫のものを拒否し、ニアミス、リンク、ネストされた別名、User/managed hook、plugin コンポーネント対象、インライン設定宣言を個別ファイルとして拒否する。

**目に見えるチェックポイント**: ユーザーは、コマンドを一切実行せずに独立 Codex hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T833 [US1] プロジェクトレイヤー、有効な `.codex/hooks.json`、ニアミス、リンク、インライン設定宣言、plugin
  対象、不正なコマンド、シークレット、User/managed 除外を対象とする Codex 独立 hook フィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-25 修正: このkindではlinked
  carrierを表現できない — 1つのlayerは`.codex/hooks.json`をちょうど1つ持つため、そのpathのsymbolic
  linkはtreeが必要とする実fileと並存できず、透過的なlink読み取りは多数のfileをadmitするkindの側で担保され続ける。Near
  missにはpluginが同梱する`hooks/hooks.json`と、hookをinlineで宣言しうるmanaged
  `requirements.toml`が加わった。ここでの「plugin対象」と「managed除外」はそれである。)*
- [X] T834 [US1] Codex の独立 hook の振る舞い、マッチャー、既存の `codex.excluded.plugin-files` 参照、パス不一致となる
  User/managed ケース、composition、関係、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T835 [P] [US1] Repository root の Codex `['.codex', 'hooks.json']`、子孫のものが path-negative
  のままであること、正確なファイル名、ニアミス、inline/plugin/User 対象の候補がないことに対する失敗するマッチャーテストを
  `tests/unit/inspection/rules.test.ts` に追加する
- [X] T836 [P] [US1] 独立 Codex Hook kind、来歴、信頼の不確実性、内包設定との重複がないことに対する失敗する認識テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T837 [US1] 独立 Codex hook 行、フィルター、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを
  `tests/e2e/codex-hooks-inventory.spec.ts` に追加する *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T838 [US1] フェーズ 23 が所有する `codex.behavior.repo.hooks` を再利用し、加算的な hook composition から参照される前に
  `codex.behavior.user.hooks` を `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T839 [US1] 子孫の独立 hook 候補 `codex.repo.hooks` だけを追加し、既存の `codex.excluded.plugin-files`
  を参照し、新しい除外 ID を定義せずに User/managed の場所をパス不一致のまま `src/shared/registries/inspection-rules.ts` で保つ
  *(2026-08-25 修正: ruleは1つではなく2つ。Standalone carrierは`codex.repo.hooks`、同じlayerの`config.toml`のinline
  `[hooks]` tableはそのcarrier自身が著したmatcherを共有する`codex.repo.hooks.inline`である。Vendor
  contractは、admitされた単一のconfig
  carrierに`MCP`・`settings/config`・内包`hook`の別個のrecognitionを与えており、recognitionはruleが生み出すものだからである。どちらもroot-anchoredで、exclusion
  IDは追加していない。)*
- [X] T840 [US1] Codex hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [X] T841 [US1] Codex の root `.codex/hooks.json` のマッチングとパス由来の認識を、子孫のものは path-negative のままとして、
  `src/server/inspection/rules/codex.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T842 [US1] hook インベントリのフィルターと独立 Codex の要約を `src/app/components/inventory/InventoryFilters.vue`
  とそのkindのrow component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-25 修正:
  `InventoryFilters.vue`の編集は不要だった — 3つのfilterはkindに依らず、kindは`availableKinds`を通じてtabへ届く —
  ため、このkindの到着はrow component、filter view自身のrow list、そしてそれを描画するlistである。)*
- [X] T843 [US1] 英語の Codex 独立 hook インベントリと除外メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 85: Codex Hook の詳細

**目的**: 完全なリテラルの Codex hook detail を追加し、inline `[hooks]` recognition を既存の `.codex/config.toml` file に関連付け、same-layer file と inline declaration を保持する。

**独立テスト**: standalone/inline Codex hook を開き、same-layer file-plus-inline retention、正確な解決済みの値の保持、diagnostics、command/handler/process/URI/referenced-target execution がゼロであることを検証する。

**目に見えるチェックポイント**: Codex Hook 認識を選択すると、実行せずにその宣言が表示される。

### テストを先に

- [X] T844 [P] [US2] 同じレイヤーのファイルとインライン宣言を必須警告とともに保持することに対する失敗する Codex hook テストを
  `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [X] T845 [US1] インライン Codex hook が既存の `.codex/config.toml` 物理ファイルに関連付けられ、合成ファイルを作成せず、独立 hook
  とは個別の来歴を保持することを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T846 [P] [US2] Codex hook の検査が command、process、import、evaluation、mutation、URI
  load、referenced-hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T847 [P] [US2] 完全なリテラルの command、typed event、additive composition、warning、diagnostics、stale ID
  に関する失敗する Codex hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T848 [US2] 相互の契約参照を備えた、失敗する Codex hook runtime-composition グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T849 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、standalone/inline Codex hook detail、diagnostics、shared config
  navigation、executable rendering がゼロであることに関するブラウザー受け入れテストを `tests/e2e/codex-hooks-detail.spec.ts`
  に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

### 実装

- [X] T850 [US2] Codex の加算的マッチングと、同じレイヤーの file-plus-inline 警告戦略を
  `src/shared/registries/runtime-composition.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T851 [US2] Codex のインライン認識、同じレイヤーの file-plus-inline の保持、来歴、警告メタデータを
  `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T852 [US2] closed standalone Codex Hook field ID、正確な解決済みの値、recognition-atomic
  failure、source-value-free diagnostics によって JSON extraction を
  `src/server/inspection/parsers/json.ts` で拡張する *(2026-08-25 修正: closed field
  IDもparser変更もない。宣言はそのfileが書いたkeyのまま公開される。authoredなkey集合は閉じていないからである（FR-007）。またJSON parsing
  seamはdocumentのentryを既にrenderしている。このフェーズが追加するのは、どのentryがeventであるかというvendor自身の読み取りであり、`src/server/inspection/rules/hooks/`に置かれる。)*
- [X] T853 [US2] closed inline Codex Hook field ID、正確な解決済みの値、recognition-atomic
  failure、source-value-free diagnostics によって TOML extraction を
  `src/server/inspection/parsers/toml.ts` で拡張する *(2026-08-25 修正: T852が記録する理由により、closed field
  IDもparser変更もない。Inlineの読み取りは`ParsedTomlDocument`のentryを同じ共有projectionで読むものである。)*
- [X] T854 [US2] Codex hook の正確な解決済みの値の保持、additive composition、warning、追跡しない reference を
  `src/server/inspection/scan.ts` に統合する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-25 修正:
  `scan.ts`の編集は不要だった。読み取りはadmitするruleのものであり、recognizerのextraction境界がparse失敗をrecognitionの`failed`
  stateへ変え、rowはsession projectionのものである — scanはkindを知らずにそれらを合成する。)*
- [X] T855 [US2] イベント、コマンド、スコープに対応する型付き Codex hook 詳細をそのkind自身のdetail route（`src/app/pages/` 配下）
  で拡張する *(2026-08-08修正: admission はどの surface も読み出さない read-authorization 記録に留まるため、provenance
  は表示されない（T1068）。)* *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract
  に留まるため、どの surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-25
  修正: routeはeventとその著者が書いたgroupを公開し、scopeは公開しない:
  どのlayerがactiveか、hookがreviewされtrustされたかは、この製品が決して観測しないruntime inputである（FR-009）。)*
- [X] T856 [US2] 英語の Codex hook detail メッセージをそれらを描画する Vue component に追加する *(2026-08-08修正: detail は
  file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)*

---

## フェーズ 86: Claude の内包 Hook 宣言

**目的**: サポート対象の宣言を含む、すでに受け入れられた settings、skill、agent、plugin-manifest、marketplace の物理ファイルだけに Claude Hook 認識を関連付ける。

**独立テスト**: hook フィールドを含む/含まない受け入れ済み settings、skill、agent、plugin-manifest、marketplace の所有者、plugin hook-path の関係、参照されていない `.claude/hooks/**` script、捏造された `.claude/hooks.json` を検査する。Claude の独立候補または合成ファイルがないこと、一度だけ読み取って関連付けること、正確な所有者来歴、サポートされないファイルがパス不一致となることを検証する。

**目に見えるチェックポイント**: ユーザーは、捏造された hook ファイルを見ることなく、所有ファイル上の Claude 内包 Hook 認識をフィルタリングできる。

### フィクスチャとテストを先に

- [X] T857 [US1] 受け入れ済み settings、skills、agents、plugin manifests、marketplaces 内の Claude 内包 hook
  に加え、欠落フィールド、参照されていない script、捏造された独立ファイル、plugin hook パス、不正な宣言、シークレット、ニアミスを対象とするフィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` に作成する *(2026-08-26 修正: このフィクスチャは文書化された全ownerの宣言 —
  skillとsubagentのfrontmatter、plugin manifestのinline設定、catalog entryのもの — をnegativeな半分として保持する:
  treeにauthoredされていて、どのhook rowにも到達しない。plugin同梱の`hooks/hooks.json`はnear
  missではなく、そのpluginのfileの1つとして読まれる。censusがplugin rootに対して行うことである。)*
- [X] T858 [US1] Claude 内包 hook の振る舞い、関係、既存の `claude.excluded.plugin-files` 参照、パス不一致となる
  standalone/script/User ケース、エビデンス、no-standalone 行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T859 [P] [US1] 2つの root settings document が持つ Claude 内包 hook
  宣言、宣言の来歴、合成ファイルがないこと、`.claude/hooks/**` または独立ファイルを推論しないことに対する失敗する認識テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する *(2026-08-26 修正: 文書化された5つのownerのうち、hook
  rowを公開するのはroot settings documentだけである。skill・subagent・plugin manifest・catalog
  entryの`hooks`は、そのcustomizationが何であるかの一部であり、そのcustomization自身のrowが既にfileの書いたkeyを公開しているため、hook
  rowを作れば1つの事実を、そのcustomizationを主題としないページで二度公開することになる。`contracts/vendors/claude-code.md`と`data-model.md`を同じ変更で両言語とも修正した。)*
- [X] T860 [P] [US1] 所有ファイルを一度だけ読み取ること、決定的な Hook 認識の関連付け、relationship-only の plugin hook
  パス、分離された不正宣言、参照 hook の読み取りがゼロであることに対する失敗するスキャンテストを `tests/integration/repository-scan.test.ts`
  に追加する
- [X] T861 [US1] Claude 内包 Hook 行、所有ファイルへの移動、フィルター、除外、診断、独立行がないことを対象とするブラウザ受け入れテストを
  `tests/e2e/claude-hooks-inventory.spec.ts` に追加する

### 実装

- [X] T862 [US1] 独立読み取り権限を持たない Claude 内包 hook の検索記述を `src/shared/registries/vendor-behaviors.ts`
  に追加する
- [X] T863 [US1] relationship-only の plugin hook-path レコードを追加し、既存の `claude.excluded.plugin-files`
  を参照し、新しい除外 ID を定義せずに standalone/script/User の場所をパス不一致のまま
  `src/shared/registries/inspection-rules.ts` で保つ *(2026-08-26 修正:
  ruleは1つ、`claude.repo.hooks.settings`であり、2つのroot settings
  fileが著したmatcherを共有する。recognitionはruleが生み出すものなので、contained
  declarationには自身のruleが要る。宣言が他のcustomizationに属するownerにはruleを与えない。)*
- [X] T864 [US1] Claude hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation に追加する
- [X] T865 [US1] Claude の独立 hook の拒否と内包宣言の分類を `src/server/inspection/rules/claude.ts` に実装する
  *(2026-08-26 修正: standaloneな`.claude/hooks.json`の拒否にcodeは不要だった —
  そのlocationを名指すruleがないため、walkがそこへ到達しない。`claude.ts`が得たのは、唯一のcontained-hook recordをsettings
  documentの`hooks` objectを読むunitへcompileすることである。)*
- [X] T866 [US1] 候補を作成せず、Claude Hook 認識を既存の root settings document へ
  `src/server/inspection/recognizers/candidate.ts` で関連付ける *(2026-08-26 修正:
  `scan.ts`の編集は不要だった。attachmentは1つのpathに対する2 planのwalkによる通常のmergeであり、読み取りはadmitするruleのもの、rowはsession
  projectionのものである。)*
- [X] T867 [US1] Hook インベントリ行と、英語の Claude 内包/所有者/除外メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *(2026-08-26 修正: row
  componentにClaude固有のmessageは不要だった: contained declarationは、Codexのフェーズが追加した共有の`HookCarrierForm`
  captionで形式を述べ、ownerは自身のpathで名指される。)*

---

## フェーズ 87: Claude Hook の詳細

**目的**: 完全な additional context を備えた、完全なリテラルの Claude Hook detail を追加する。

**独立テスト**: すべての owner kind にわたる malformed contained declaration を開き、event field、すべての additional context の保持、正確な解決済みの値の保持、diagnostics、execution/referenced read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude Hook 認識を選択すると、実行せずにその宣言が表示される。

### テストを先に

- [X] T868 [P] [US2] 宣言された全 handler をそのまま保持すること、制限的な判断の記述、settings という所有者 kind に対する失敗する Claude hook
  テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T869 [P] [US2] Claude hook の検査が command、process、import、evaluation、mutation、URI load、plugin
  hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T870 [P] [US2] 完全なリテラルの command、event、owner provenance、composition、diagnostics、stale ID
  に関する失敗する Claude hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する *(2026-08-06
  修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T871 [US2] 相互の契約参照を備えた、失敗する Claude hook runtime-composition グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T872 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、完全なリテラルの Claude Hook detail、diagnostics、executable rendering
  がゼロであることに関するブラウザー受け入れテストを `tests/e2e/claude-hooks-detail.spec.ts` に追加する *(2026-08-08修正: admission
  はどの surface も読み出さない read-authorization 記録に留まるため、provenance は表示されない（T1068）。)*

### 実装

- [X] T873 [US2] Claude hook の合成戦略 — active な source の filter、settings level をまたぐ additive
  merge、制限的な判断 — とその event・activation 条件を `src/shared/registries/runtime-composition.ts` に追加する
  *(2026-08-26 修正:
  `claude.hooks.additive`が記録するのは`filter`・`append`・`select-first`だけである。ページが立証するのは、hook entryがsettings
  levelをまたいでmergeすること、trust・managed-hooks-only policy・`disableAllHooks`・plugin
  enablementがどのsourceをactiveにするかを決めること、hookが返したexplicit denyが優先されることである。identical
  commandのdeduplicationやadditional
  contextの保持規則は立証していないため、どちらも記録しない。`contracts/runtime-composition.md`を同じ変更で両言語とも修正した。)*
- [X] T874 [US2] file が書いたとおりに全 handler を公開する Claude 内包 hook のメタデータを
  `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-26 修正: deduplication、順序付け、owner
  provenanceのいずれも計算しない。1つのcommandを名指す2つのhandlerは、fileが書いた2つのhandlerである。admissionはどのsurfaceも読み出さないread-authorization記録であり（T1068）、clientがそれらをどう扱うかはそのcomposition自身である（FR-009）。)*
- [X] T875 [US2] closed Claude Hook field ID、正確な owner-source の解決済みの値、recognition-atomic
  failure、source-value-free diagnostics によって JSONC、YAML、Markdown extraction を
  `src/server/inspection/parsers/json.ts`、`src/server/inspection/parsers/yaml.ts`、`src/server/inspection/parsers/markdown.ts`
  で拡張する *(2026-08-26 修正: closed field
  IDもparser変更もない。宣言はfileが書いたkeyのまま公開される。authoredなkey集合は閉じていないからである（FR-007）。settings ownerはJSON
  parsing seamで読む。YAMLとMarkdownのextractionは手つかずである: frontmatterの`hooks`
  blockは、それを書いたskillまたはsubagentに属するからである。)*
- [X] T876 [US2] Claude hook の正確な解決済みの値の保持、composition、diagnostics、追跡しない reference を
  `src/server/inspection/scan.ts` に統合する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-26 修正:
  T866が記録する理由により、`scan.ts`の編集は不要だった。)*
- [X] T877 [US2] 型付き詳細と、英語の Claude hook 所有者メッセージをそのkind自身のdetail route（`src/app/pages/` 配下） で拡張する
  *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(2026-08-26 修正: detail
  routeにClaude固有の型付けは不要だった: contained carrierのresponseはCodexのフェーズが出荷した形であり、ownerは自身のpathで名指される。)*

---

## フェーズ 88: Copilot の独立 Hook ファイルインベントリ

**目的**: ルート直下の子である Copilot `.github/hooks/*.json` 物理候補だけを追加する。

**独立テスト**: ルートの hook ファイルをインベントリに含め、ネストされたファイル、User hook、settings/agent/plugin 宣言を個別ファイルとして扱うこと、hosted 状態、リンク、実行可能 script、ニアミスを拒否する。

**目に見えるチェックポイント**: ユーザーは、独立 Copilot hook ファイルをフィルタリングできる。

### フィクスチャとテストを先に

- [X] T878 [US1] ルート直下の子、ネストされたニアミス、不正な JSON、不正なコマンド、シークレット、リンク、User hook、hosted
  状態、settings/agent/plugin 宣言、script を対象とする Copilot 独立 hook フィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [X] T879 [US1] Hook 固有の除外 ID を定義せず、Copilot の独立 hook の振る舞い、候補、パス不一致となる User/hosted/script
  ケース、relationship-only の plugin パス、composition、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T880 [P] [US1] ルート `.github/hooks/*.json`、直下の子という深さ、surface の来歴、nested/User/hosted/script
  の拒否、内包宣言との重複がないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T881 [US1] 独立 Copilot hook 行、surface バッジ、フィルター、除外、診断、実行可能なコントロールがないことを対象とするブラウザ受け入れテストを
  `tests/e2e/copilot-hooks-inventory.spec.ts` に追加する

### 実装

- [X] T882 [US1] hook composition から参照される前に、surface で修飾された Copilot hook の検索記述と、読み取り権限を付与しない
  `copilot.behavior.vscode.user.hooks` および `copilot.behavior.cli.user.hooks` を
  `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T883 [US1] ルート直下の子である `copilot.repo.hooks` 候補だけを追加し、User/hosted/script パスを不一致のまま保ち、新しい除外 ID
  を定義せずに plugin コンポーネントパスを関係として `src/shared/registries/inspection-rules.ts` に保持する *（2026-08-26 修正:
  2つのcontained settings hook ruleもT895ではなくここで追加する。contained
  recognitionはruleが生むものなので独自のruleを必要とし、各pairは自身のdocumentationが名指すsurfaceだけを取る。）*
- [X] T884 [US1] Copilot hook のエビデンスレコードと、影響を受ける契約への相互参照を 対象registry recordの`evidence` citation
  に追加する
- [X] T885 [US1] Copilot のルート `.github/hooks/*.json` に対する直下の子のマッチングと認識を
  `src/server/inspection/rules/copilot.ts` と `src/server/inspection/recognizers/candidate.ts` に実装する
- [X] T886 [US1] Copilot の独立 hook 分類を統合し、以前の Hook 結果を `src/server/inspection/scan.ts` で維持する
  *（2026-08-26 修正: scanは変更不要である。kindごとのextraction
  groupingが既にこのkindを覆っており、以前のHook結果もCopilot専用の分岐ではなく同じgroupingによって維持される。）*
- [X] T887 [US1] Hook インベントリ行と、英語の Copilot 独立/surface/除外メッセージを そのkindのrow
  component（`src/app/components/inventory/rows/`） で拡張する *（2026-08-26 修正: row componentは変更不要である。hook
  rowはどのvendorの宣言でもtool、carrier form、surfaceを述べ、除外はmatcher自身の働きによる。）*

---

## フェーズ 89: Copilot Hook の詳細

**目的**: 完全なリテラルの Copilot Hook detail を追加し、contained recognition は settings と custom-agent owner だけに関連付ける。plugin hook component path は relationship のままとし、path から recognition を決して作成しない。

**独立テスト**: standalone および settings/agent-contained Copilot hook を開き、relationship のままの plugin hook path、plugin-path recognition がないこと、正確な解決済みの値、diagnostics、execution がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot Hook 認識を選択すると、実行せずにその宣言が表示される。

### テストを先に

- [X] T888 [P] [US2] agent の追加を伴う VS Code workspace の同一イベント優先、CLI ソースの追加順序、Cloud の Repository-only
  の振る舞い、settings の所有者来歴、relationship-only の plugin hook パスに対する失敗する Copilot hook テストを
  `tests/unit/inspection/copilot-metadata.test.ts` に追加する *（2026-08-26 修正: agent-scoped hookはhook
  rowを公開しないため、owner provenanceのケースはsettings ownerとagent自身の行を対象とする。）*
- [X] T889 [US1] settings hook だけが既存の物理ファイルに関連付けられ、agent の frontmatter hook が hook 認識を生まず、plugin
  コンポーネントパスが Hook 認識または合成候補を作成せず、内包来歴が独立来歴とは個別に維持されることを証明する失敗する認識テストを
  `tests/unit/inspection/recognizers.test.ts` に追加する *（2026-08-26 修正: hook recognitionが付くのはsettings
  hookだけである。custom
  agentのfrontmatterの`hooks`はそのagentを構成するものであり、agent自身の行がfileの書いた全keyを公開する。Claudeのskillやsubagentの宣言に適用したのと同じ規則である。）*
- [X] T890 [P] [US2] Copilot hook の検査が command、process、import、mutation、URI load、referenced-hook
  read、plugin activation、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを
  `tests/integration/security/zero-activation.test.ts` に追加する
- [X] T891 [P] [US2] 完全なリテラルの command、event、surface、owner provenance、composition、diagnostics、stale
  ID に関する失敗する Copilot hook-detail API テストを `tests/contract/http-api-files.test.ts` に追加する
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T892 [US2] 相互の契約参照を備えた、失敗する Copilot hook runtime-composition グラフカバレッジを
  `tests/contract/runtime-composition.test.ts` に追加する
- [X] T893 [US2] credential/environment-reference の正確なリテラル表示、process-environment sentinel
  の非置換、masking/reveal control がないこと、standalone/contained Copilot Hook detail、owner
  navigation、diagnostics、executable rendering がゼロであることに関するブラウザー受け入れテストを
  `tests/e2e/copilot-hooks-detail.spec.ts` に追加する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor
  が文書化する内容はその maintained contract に留まるため、どの surface も trust、precedence、order、uncertainty を project
  しない（FR-009、T091）。)*

### 実装

- [X] T894 [US2] Copilot VS Code の settings/agent priority/additions、CLI append-order、Cloud
  Repository-only、relationship-only の plugin path、event、activation の各戦略を個別に
  `src/shared/registries/runtime-composition.ts` へ追加する *（2026-08-26 修正:
  runtime-composition契約の行が述べるとおり、surfaceごとに1つ、計3つのstrategyとする。agentとpluginの追加はeditorのcompositionが消費するbehaviorであり、独立したstrategyではない。）*
- [X] T895 [US2] settings 所有者だけの内包認識、relationship-only の plugin hook パスと来歴を備えた Copilot の surface
  composition を `src/server/inspection/recognizers/candidate.ts` に実装する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *（2026-08-26 修正:
  contained recognitionが付くのはsettings ownerだけであり、agentのfrontmatter
  hookはそのagent自身の行である。recognizerにvendor分岐は不要で、各ruleはcarrierを読むunitへcompileされ、あとは共通のdispatchが担う。）*
- [X] T896 [US2] closed Copilot Hook field ID、正確な owner-source の解決済みの値、recognition-atomic
  failure、source-value-free diagnostics によって JSONC/Markdown extraction を
  `src/server/inspection/parsers/json.ts` と `src/server/inspection/parsers/markdown.ts` で拡張する
  *（2026-08-26 修正: closed field
  IDは無く、Markdownの変更も無い。declarationはfileが書いたkeyで公開され（FR-007）、agentのfrontmatter hookはhook
  recognitionを公開しない。`src/server/inspection/parsers/json.ts` に `ParsedJsonDocument`
  を追加する。formatは読み手とfileの組の事実であるため、constructorが構築対象の `(tool, path)` からその読み取りが取るformatを解決する:
  Copilotのhook fileとcross-toolの `.claude/` pairはJSONCとして読む — editorの回答であり、CLIはどちらもstrictと計測された —
  一方Claude Codeは同じ `.claude/` pairをstrictに読むため、1つのfileにproductごとの回答がある（FR-004、research.md § 6）。）*
  *（2026-08-27 修正: Copilot自身のrepository settings pairはstrictに読む。この2 fileを緩く読むsurfaceがこのproductには存在せず
  — editorのsettings lookupは除外され、editorのhook-locations表が名指すのはClaude形式のpairである — 緩い側を取る合併の対象が無い。hook
  loadingを含めてそれらをloadするCLIの経路はstrictと計測されている。）*
- [X] T897 [US2] Copilot hook の正確な解決済みの値の保持、settings owner composition、recognition を伴わない plugin-path
  relationship の保持、diagnostics、追跡しない reference を `src/server/inspection/scan.ts` に統合する *(2026-08-06
  修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *（2026-08-26 修正:
  T886が記録する理由によりscanは変更不要である。plugin自身のhook fileはどのruleも受理しないpathのままであり、それはここでの処理ではなくmatcherの働きによる。）*
- [X] T898 [US2] 型付き詳細と、英語の Copilot hook surface、所有者メッセージをそのkind自身のdetail route（`src/app/pages/` 配下）
  で拡張する *(2026-08-08修正: detail は file が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの
  surface も trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *（2026-08-26 修正: detail
  routeは変更不要である。既にどのvendorの宣言でもcarrier form、tool、surfaceを述べ、standalone carrierの残りのkeyを公開する。）*

---

## フェーズ 90: 統合 Hook インベントリ

**目的**: 共有 `.claude/settings*.json` 所有者を一度だけ読み取ることを含め、独立および内包 Hook 認識を統合する。

**独立テスト**: 共有 settings に対する一つの物理読み取りと個別の Claude/Copilot Hook 認識、独立 Codex/Copilot ファイル、内包所有者の来歴、決定的な順序、合成ファイルがないこと、除外、フィルター、注入したfileに閉じた注入failureのfile単位diagnostic化とそれ以外のfailureによるwhole-attempt abort、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。

### テストを先に

- [X] T899 [US1] 独立 Codex/Copilot ファイル、row を公開する settings document（Claude の 2 件、Copilot 自身の 2
  件、両製品が読む cross-tool の 2 件）、row を公開しない宣言 owner（skill、subagent、Copilot custom agent、plugin
  manifest、catalog entry）、共有 settings、relationship-only の plugin パス、参照されていない script、シークレット、除外、注入した
  execution-environment throw/rejectionを対象に Hook フィクスチャを
  `tests/fixtures/repositories/build-fixtures.ts` で完成させる *（2026-08-26 修正: 注入failureのcaseはintegration
  suiteのものであり、treeが持てるfileではなくfs seam経由で駆動する。treeは文書化された全carrier、hook
  rowを公開しない宣言owner、構造的に壊れたcarrier 1件を持つ。）*
- [X] T900 [US1] Hook 固有の除外 ID を追加せず、Hook の振る舞い、独立マッチャー、内包所有者の composition、関係、既存の正確な plugin-file
  除外、パス不一致ケース、エビデンス適合行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で完成させる *（2026-08-26 修正: conformance rowは既に最終形だった。このphaseはregistry recordを追加しないため、再生成しても差分は出なかった。）*
- [X] T901 [P] [US1] Codex/Copilot の独立ファイル、Claude の独立候補がないこと、すべての script/User/hosted/component
  除外に対する完全なマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [X] T902 [P] [US1] 独立/内包の出所、各製品が row を公開する settings 所有者、row を公開しない宣言 owner、製品ごとに 1 回読まれる共有
  settings、relationship-only の plugin パス、合成ファイルがないこと、決定的な来歴、追加認識がゼロであることに対する完全な認識マトリクステストを
  `tests/unit/inspection/recognizers.test.ts` に追加する
- [X] T903 [P] [US1] Shared ownerのone-read、deterministic Hook recognition order、atomic
  continuity、完全なtraversal後のfileに閉じたfailureだけによるpartial publication、およびwhole
  attemptをfatalにしてreferenced-Hook/later readを行わずnew
  Hook、recognition、item、generation、record、response、partial resultを公開せずprior committed
  snapshotだけを保持するdomain
  layerでcatch/classify/retryしないfileに閉じないfailureに関する統合失敗テストを`tests/integration/repository-scan.test.ts`に追加する
- [X] T904 [US1] 統合 Hook インベントリ、フィルター、共有認識、独立/内包の帰属、除外、診断、キーボード操作を対象とするブラウザ受け入れテストを
  `tests/e2e/hooks-inventory.spec.ts` に追加する

### 実装

- [X] T905 [US1] Owner/fileのscan-attempt-local one-read assembly、deterministic Hook
  recognition/provenance、zero synthetic filesを実装する。Read/recognition/assembly
  throw/rejectionはdomainでcatch/classify/retry/Diagnostic/Hook/recognition/provenance/item/body/generation/partial化せず変更なしにtrigger-owning
  outer boundaryへ伝播しprior commitを保持する処理を`src/server/inspection/scan.ts`へ実装する *（2026-08-26 修正:
  `scan.ts`の編集は不要だった。1物理fileに1
  readは1つのpathに対するplanのwalkによるmergeであり、recognitionの順序はcatalogのもの、2つのfailure経路もseamのものである:
  fileに限定されたfailureはpartial generationでそのfileのdiagnosticになり、それ以外はtriggerを所有するboundaryへそのまま伝播する。）*
- [X] T906 [US1] Hook のフィルターと独立/内包/所有者の要約を `src/app/components/inventory/InventoryFilters.vue`
  とそのkindのrow component（`src/app/components/inventory/rows/`） で完成させる *（2026-08-26 修正:
  filterにhook専用のcontrolは不要だった。source・tool・pathが他のkindと同じようにhook rowを絞り、rowは各宣言のcarrier
  form・tool・surfaceを、linkするownerの隣に既に述べている。）*
- [X] T907 [US1] 英語の統合 Hook インベントリ、共有認識、所有者、除外メッセージをそれらを描画する Vue component に追加する *（2026-08-26 修正:
  このkindが描くmessageは既に描く場所に書かれていた: carrier formのcaption、宣言ごとのowner link、closing rowのunknown-events
  statement。共有readはproduct毎に1宣言を並べる1 ownerとして見えるため、専用のmessageは不要である。）*

---

## フェーズ 91: Hook 比較

**目的**: 実際に読み取り可能な物理 file だけを選択可能としつつ、リテラルおよび型付き Hook 差分を備えた Hook kind 自身の比較サーフェスを設計する。内包 Hook 認識は所有ファイルを通じて選択し、ランタイムの事実だけでは選択できない。

**独立テスト**: owner を介した contained Hook declaration を含む、current-generation の読み取り可能な physical owner file を正確に 2 つ選択し、各側の canonical serialized declaration と、整列された event を検証し、synthetic な path と runtime-fact-only row を拒否する。

**目に見えるチェックポイント**: ユーザーは hook 宣言を実行せずに比較できる。

### テストを先に

- [X] T908 [US3] 正確に2つのdistinctなreadable physical owner fileと、両inputで同じfileを選ぶことの拒否、owner を介した
  contained Hook、runtime-fact の拒否、canonical serialized declaration documentと event に関する、失敗する
  selection/comparison 回帰テストを `tests/unit/app/hook-comparison.test.ts` に追加する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-08修正: admission はどの surface も読み出さない
  read-authorization 記録に留まるため、provenance は表示されない（T1068）。)* *(2026-08-08修正: detail は file
  が書いた宣言を示し、vendor が文書化する内容はその maintained contract に留まるため、どの surface も
  trust、precedence、order、uncertainty を project しない（FR-009、T091）。)* *(amended 2026-08-21:
  宣言済みmetadataはsideごとに1つのcanonical serialized documentとしてMonacoでdiffする。skill・instruction・MCP
  comparisonの前例に従う（research.md § 7）。)* *(2026-08-26 修正: 同一ファイルの拒否と owner を介して選択した組は compare route
  自身の検証であり、unit project には single-file component の compiler がなくその page を mount できないため、いずれも T909
  のブラウザー受け入れテストで実際の page に対して検証する。このファイルは route の座標、1回の open が発行する request 列、確定する各 outcome、canonical
  document を検証する。)*
- [X] T909 [US3] owner を介して選択した contained Hook、credential/environment-reference の差を含む完全なリテラルの Hook
  diff、canonical serialized declaration document、masking/reveal も environment substitution
  もないこと、typed event/composition の差、runtime-fact の拒否に関するブラウザー受け入れテストを
  `tests/e2e/hooks-comparison.spec.ts` に追加する *(amended 2026-08-21: acceptanceは両sideのcanonical
  serialized documentがMonacoでdiffされることを検証する。全kindの宣言済みmetadata比較が取る形である（research.md § 7）。)*

### 実装

- [X] T910 [US3] 実際に読み取り可能な物理 owner file による比較選択を強制し、内包 Hook 認識をその所有者を通じて
  `src/app/composables/hook-comparison.ts`（この kind の比較サーフェスとともにこの task が設計・作成する composable） で解決する
  *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有 module は存在せず、そのサーフェスの設計・作成は skill
  の前例に倣ってこの task が担う（spec.md § Clarifications Session 2026-08-14）。)*
- [X] T911 [US3] runtime fact を選択可能な file として公開せず、Hook comparisonが各sideの宣言済みmetadataを1つのcanonical
  documentへserializeしてMonacoでdiffするよう
  `src/app/components/hook-comparison/RecognitionComparison.vue`（skill の前例 —
  `src/app/pages/skills/compare/[family].vue`、`src/app/composables/skill-comparison.ts`、`src/app/components/skill-comparison/`
  — に倣ってこの task が設計・作成する、その kind 自身の比較サーフェスの一部。そこへ到達する entry link — その kind の inventory row
  component（`src/app/components/inventory/rows/` 配下）と、その kind の detail route（`src/app/pages/` 配下） —
  も、skill における T203 と同様にこの task が所有する） で拡張する *(2026-08-19 修正:
  宣言済みmetadataはfileのkindごとに1回のparseであり、pairごとに1回比較し、tool recognitionはtoolごとにその横で比較する —
  toolは宣言の座標ではない（research.md § 7）。)* *(2026-08-15 修正: その kind 自身の比較サーフェスが所有する — 比較は kind 固有で共有
  module は存在せず、そのサーフェスの設計・作成は skill の前例に倣ってこの task が担う（spec.md § Clarifications Session
  2026-08-14）。)* *(amended 2026-08-21: 宣言済みmetadataはsideごとに1つのcanonical serialized
  documentとしてMonacoでdiffする。skill・instruction・MCP comparisonの前例に従う（research.md § 7）。)*
- [X] T912 [US3] 英語の hook 比較メッセージをそれらを描画する Vue component に追加する

---

## フェーズ 92: Repository インベントリの受け入れ

**目的**: 先行するすべての Repository インベントリ増分が、包括的な実装を用いずに US1 を満たすことを検証する。

**独立テスト**: 全サポート対象フィクスチャに対してパッケージをインストールし、allowlist に含まれるすべてのファイル、フィルター、認識、注入したfileに閉じないfailureの変更なし伝播、再スキャンパス、パッケージパス、性能目標に加え、合成ファイルも接続もなく、carrier以外のfileからMCP rowが生まれないことを検証する。現在所有されている Repository レジストリのゲートは、41 個の静的候補、1 個の有界導出候補、7 個のベンダー除外の正確に 49 ID であり *(2026-08-01 修正: skill metadataを導出するruleが無い（フェーズ 6）)* *(2026-08-26 修正: 49件である。内包hook宣言はそれぞれruleを必要とし、recognitionはruleが生むものだからである)*、内包 Hook/MCP の作業が追加する候補ルールはゼロとする。また、3 つの `*.excluded.user-runtime` と `shared.excluded.managed-remote-state` はフェーズ 96～98 まで意図的に未定義のままとする。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。

### 受け入れテスト

- [X] T913 [US1] 現在所有されている正確な49 IDのRepository registry gate（41 static、1 bounded-derived、7
  vendor-excluded）*(2026-08-01 修正: skill metadataを導出するruleが無い（フェーズ 6）)* *(2026-08-26 修正:
  49件である。内包hook宣言はそれぞれruleを必要とし、recognitionはruleが生むものだからである)* を追加し、1 merged root
  file/read/recognitionに対するdistinctな`copilot.repo.mcp`/`copilot.repo.mcp.vscode-root`
  provenanceを含める。内包MCP認識が追加するcandidate
  ruleはゼロで、内包hook宣言はそれぞれ自身のruleである（recognitionはruleが生むもの）ことと、既存の一つのowner ID/readが保持され、synthetic
  fileを作成しないことを証明し、延期されたGlobal-eraの4 non-read
  exclusionがまだ定義されていないことを`tests/contract/inspection-rules.test.ts`で表明する *(2026-08-27 修正:
  4つの繰延除外は、識別子の不在ではなくscopeの不在として検査する。このリリースが持たないruleには名指せる IDが無く、出荷済みruleがすべてRepository
  Sourceのものであることが、Global期のrecordがまだ来ていないという言明になる。)*
- [X] T914 [US1] 全サポート対象、ニアミス、空、複数ツール、導出、malformed、シークレット、性能のフィクスチャとガイダンスを
  `tests/fixtures/repositories/build-fixtures.ts`、`tests/fixtures/repositories/README.md`、`tests/fixtures/repositories/README.ja.md`
  で完成させる
- [X] T915 [US1] Node.js・decoder・parser・filesystem・assembly・publicationからfailureを注入する統合testを追加する:
  1つのfileに閉じたfailureは、影響のない全fileが完全なままのpartial
  generationの中でそのfileのDiagnosticになり、それ以外のfailureはitem/recognition/derived result/result
  body/generationなしでattemptを中止し、failureは失敗したrequestの実際のerrorとして通常どおり報告され（accept前はjobなし、accept後は保持されたstale
  commitとともに）、ownerlessな自動startup rejectionはprocessのtop levelに到達し、prior
  commitが残ることを証明する。capacity上限もverdictも存在しないこと、authority revocationがhard-cancellationを主張せずにlate
  workを破棄することも`tests/integration/runtime-failures.test.ts`で別に証明する
- [X] T916 [P] [US1] 全Repository kindのcomplete session/rescan API contractを追加する。Generation
  0はcaptured `cwd`/`--root`から選択したexactly one enabled idle Source、stable source ID、escaped
  non-authorizing root、empty files/Diagnostics、null request ID、source I/O 0件を持つ。Strict inventory
  envelope、admitted Source/progress/final state/successful generationでone request
  IDを保持すること、conflict/stale ID/atomic publication、loopback-only session access、analysis/verdict
  fieldなしを検証する。Ordinaryなrequest-owned failure
  lifecycleとして、accept前のrejectionはrequestの実際のerrorで失敗しjob・retentionを作らず、accept済みjobのfatal
  rejectionはそのrequestのerror messageをmatching non-null IDで保持しresult・generationを作らず、ownerless startup
  rejectionはprocess top levelへ伝播する。Fatalに終了したaccept済み明示rescan jobだけがそのSourceのstale
  overlayを作成または置換し、throw/rejectionでは失敗したrequestのerror messageだけを、rootを読めなかった場合はsource-scoped
  `root-unreadable` Diagnosticを参照し、pre-acceptance
  failureではoverlayを作らず、正常replacement後だけclearすることを要求する。以上を`tests/contract/http-api-session.test.ts`で証明する
- [X] T917 [P] [US1] 隔離install、fixed assets、同一tarball、反復指定をparserのlast valueへ解決するoptional
  `--root`の完全なpackaged Gunshi CLI testを追加する: invocation
  `process.cwd()`を1回captureし、省略時はその正確な文字列を保持する。絶対optionはそのまま保持し、相対optionはlexicalな`node:path`
  operationだけでcaptureに対して解決する。packed entry全体を計測する: CLI import前はfixedなpackage所有以外のproduct所有read
  0件を許し、その後のroot selectionはfilesystem/network I/O 0件かつ`process.chdir()`なしを要求し、明示的なempty
  launchはfixedでactionableかつsource-value-freeな出力とともにsession/browser作成前にfailし、valueの欠落はそこでGunshiのtyped
  argument validationによりfailすることを証明する。T043のownerless `process.cwd()`-throw
  caseを含める。Inspection由来helper入力なしのfixed `open`-package default-browser helper委譲とそのenvironment
  behavior、`--no-open`/printed-URL fallback、non-binding help/version、厳格なunknown/positional/rest
  rejection、awaited shutdown、root-only import、追加mode 0件も`tests/package/npx-launch.test.ts`でカバーする
  *(2026-08-27 修正: ここで挙げるroot選択と拒否の挙動はCLI unit
  suite（`tests/unit/cli.test.ts`）が直接駆動して所有する。このtaskが足すのはpackaged側である: packed
  entry経由のoptionalおよび繰り返しの`--root`、working directoryの変更やoutbound
  connectionがあればlaunchを失敗させるpreload、subcommandを持たない1つのmode、packed processが終了する形での空root拒否。)*
- [X] T918 [P] [US1] T183をfinal registryへ拡張し、1つの変更しないprofile/fixtureで正確に10のfresh processを実行する。Run
  1直前と各run直後にprofileがbindする`tests/performance/sc002-fixture-manifest.json`のversion/canonical
  digest、`tests/performance/sc002-fixture-manifest.sha256`、参照する全content digestを再計算して、missing
  entryまたはdriftがあればset全体を無効とする。各自動first
  scanをtiming外で待ち、明示rescanを正確に1件dispatchして`scanRequestId`をcaptureし、両timerをdispatch時に開始して、qualifying
  visible/assistive statusとcommit済みgeneration inventoryへ同じIDを要求する。Prior/automatic stateを拒否し、同じ9
  run以上に1秒status、10秒inventory、2つの100 ms未満interactionを要求する。各runで同じprofile ID/manifest
  version/canonical digestを繰り返し、request ID/generation/environmentを記録し、personal identifier/absolute
  user pathだけを省略してcache reset/snapshot reuse/cross-profile
  comparisonを拒否する。対象は`tests/performance/repository-scan.test.ts`と`tests/performance/inventory-interactions.test.ts`とする。T183が`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`へ復元したperformanceの期待結果bulletを、同じ変更でこのtaskの10
  run中9 run protocolへ更新する。 *(2026-08-27 修正: 10-run protocol、digestの再検証、run ごとのrequest
  correlationはどこでもgateする。4つの閾値は、check-in済みprofileが宣言するhost上ではassertし、それ以外では記録する。別のmachineで測った同じ数値は、この製品ではなくそのmachineの測定だからである。)*
- [X] T919 [US1] Inventory、filter、multi-recognition、Diagnostics、empty state、request-correlated
  rescan/retry、keyboard use、atomic replacement、明示的なdetail request外でのsource/metadata/sensitive-value
  exposure 0件に関するRepository-complete browser acceptanceと文書化済みdiscovery command
  targetを`tests/e2e/repository-complete-inventory.spec.ts`と`tests/e2e/discovery.spec.ts`へ追加する。Inventory/Diagnosticsがnatural-language
  interpretation/ranking、customization validity/correctness/compliance/effectiveness/quality
  verdict、validation/lint、remediation/fix controlを公開しないnegative
  assertionを含める。同じ変更で`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`の`pnpm exec playwright test tests/e2e/discovery.spec.ts`の行を復活させる。fileが存在しない間は削除してある。

---

## フェーズ 93: Repository 詳細の受け入れ

**目的**: 先行するすべての Repository 詳細増分が、包括的な実装を用いずに US2 を満たすことを検証する。

**独立テスト**: 現在所有されている完全な49-ID Repository rule registry（41 static、1 bounded-derived、7 vendor-excluded）、延期されたGlobal-era exclusion 4件の明示的な不在、parser matrix、environment-owned capacity下のexact literal displayとcomplete detail behavior、safe filesystem boundary、すべてのlate owner-bound MCP activation、activation/connection/environment-reference resolution 0件、file-detailとabsent-reveal-function API behavior、relationship、diagnostics、stale cleanup、contained Hook/MCP factによるcandidate-rule additionとduplicate owner read 0件を検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。

### 受け入れテスト

- [X] T920 [P] [US2] 現在所有する正確な49 IDの内訳（41 static、1 bounded-derived、7 vendor-excluded）*(2026-08-01
  修正: skill metadataを導出するruleが無い（フェーズ 6）)* *(2026-08-26 修正: 49件である。内包hook宣言はそれぞれruleを必要とする)*、延期した4
  exclusionの不在、1 owner ID/readへmergeされるdistinctなroot CLI/VS Code rule provenanceとpath-only VS Code
  semantics、contained MCP candidate ruleゼロと、そうした宣言ごとに必要なcontained hook rule、early contractからlate
  owner activationまでの完全なmatrix、synthetic
  file/connectionゼロ、現在所有する全behavior/strategy/relationship/evidence backlink、emitする全relationship
  kindのexactなclosed presentation-allowlist membershipに加え、そのoccurrenceのactualなadmission済みsource
  formに対するexact extractor applicability、未記載entryの推論とcross-form promotionがゼロであること —
  宣言はこのgateを通らない。carrier自身のkeyだからである（FR-007） —、reciprocal fingerprint、offline
  separationについて、Repository subgraph
  contractを`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`に追加する
  *(2026-08-27 修正: allowlist側は不在として検査する。このリリースはrelationship-only
  ruleを出荷せず、したがってrelationshipを一切emitしないため、kindを許可するrowはどこからも消費されない。代わりにgraph
  gateが足すのはregistry全体の検査である:
  すべてのruleとstrategyのedgeが出荷済みrecordへidentityで解決すること、すべてのbehaviorがそのいずれかから到達されること、そして繰延の`copilot.excluded.user-runtime`が名指すことになる3つのUser
  scope factを例外として凍結すること。)*
- [X] T921 [P] [US2] JSONC、YAML、TOML、Markdown/frontmatterの4 parser matrix
  testを`tests/unit/inspection/parsers.test.ts`と`tests/unit/inspection/seed-parsers.test.ts`に追加し、NUL
  byteはdiagnostic-onlyの`binary`となり、NULのないbyteはexactly
  onceだけdecodeされてreadableな`utf-8`または`utf-8-replaced`となり、先頭BOM
  1個を除去して記録し、保持された`U+FFFD`がscanをpartialにせずatomic extraction/display/comparisonまで完全に伝播し、charset
  fallback/sampling/truncationがないことを証明する。Deterministic malformed returned
  outcome、`recognition-parse-failed` Diagnosticとしてcatchされるfile-confinedなparser
  exception、environment-owned capacity、およびfileに閉じないdecoder/parser/extractorの全throw/rejectionがdomain
  catch、cause classification、retry、recovered result、Diagnostic、generationなしに変更なく伝播することも扱う
- [X] T922 [US2] Relationship、provenance、derivation、fallback、source occurrence、authored text、parser
  message、retained graph、FileDetailでthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered
  value/Diagnostic/body/generation化せず変更なしに伝播すること、atomic abort/prior snapshot、および失敗したrequestのordinary
  errorまたはownerless startup top-level挙動だけを`tests/integration/runtime-failures.test.ts`で検証する
- [X] T923 [US2] Diagnostic
  construction/retention/serializationのthrow/rejectionを注入し、domainでcatch/cause分類/retry/recovered
  Fact/assessment/Diagnostic/recognition/result/body/generation化せず変更なしに伝播すること、prior snapshot、numeric
  capなし、および失敗したrequestのordinary errorまたはstartup
  top-level挙動だけを`tests/integration/runtime-failures.test.ts`で検証する *(2026-08-27 修正:
  commit境界はdiagnosticを再検証しない。唯一のguardはrecord自身のconstructorであり、それは`tests/unit/shared/diagnostics.test.ts`が所有する。したがってintegration
  levelで検証するのは保持とserializationである: snapshotはattemptが生んだrecordをそのまま公開し、参照はすべて解決し、件数に上限は無い。)*
- [X] T924 [P] [US2] malformed file、broken linkが`file-unreadable`になるtarget透過読み取りのsymlinked
  entry、読み取り不能file、disable/shutdown/supersession後のcleanup-only late discard、read-only open
  flag、mutation-capable call
  0件、不変のcontent/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL観測、別記録のOS-only
  atime残差の完全safety testを追加する。closed publication matrixを証明する表を含める:
  file限定の`file-unreadable`/`file-content-binary`/`recognition-parse-failed` outcomeはpartial
  generationの中にdiagnostic-onlyまたは部分導出recordを保持し、読めないrootはsource-scoped `root-unreadable`
  DiagnosticでそのSource
  attemptをfailさせ、単一fileに閉じないfailureは何もcommitしないことを`tests/integration/inspection-safety.test.ts`で証明する
- [X] T925 [P] [US2] `--no-open`またはpost-helper instrumentationのもとで全Repository familyへzero-activation
  regressionを拡張する。Local fixture rootを使用・記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image
  surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback
  classを別々に分類・検証し、それ以外の全surfaceについてdiscovery/read/parse/display/comparison/relationship
  processingによるchild/evaluation/MCP/禁止対象direct product-issued outbound
  request/URI/image/mutation/reference
  readが0件であることを証明する。対象は`tests/integration/security/zero-activation.test.ts`とする
- [X] T926 [P] [US2] 全readable kindのfile-detail/absent-reveal-function
  contractを追加する。`utf-8 | utf-8-replaced`はcomplete source（ただしcarrierは例外で、そのdetail
  variantは宣言だけを運び`sourceText`を一切持たない。FR-007）、解決済みの値、comparison
  eligibilityと`U+FFFD`を保持し、`binary`だけがdiagnostic-onlyでそれらを禁止する。Source-form allowlist、unknown-key
  text、stale ID、acknowledgement/notice operationが存在しないこと（FR-027はどちらも持たない）を検証する。Request-owned
  operationのthrowはそのrequestを実際のerrorで失敗させjob/result/generation/success payloadを作らず、post-commit
  delivery rejectionはcommit不変/success payloadなし/partialなし、analysis/validation/verdict/remediation
  fieldなしを`tests/contract/http-api-files.test.ts`で証明する
- [X] T927 [US2] acknowledgementも注意書きも伴わない直接のmemory-only presentation（FR-027）、`utf-8-replaced`
  textとcomparisonを含む完全でliteralなreadable detail、authored valueを一切含まないdiagnostic-only binary、exact
  metadata/relationship、masking/reveal/substitutionなし、executable rendering 0件に関するRepository-complete
  browser
  acceptanceを`tests/e2e/repository-complete-detail.spec.ts`と`tests/e2e/inspection-safety.spec.ts`へ追加する。完全なtraversal後のfileに閉じたunreadable/binary/parse-failure
  outcomeだけがpartialをcommitでき、request-owned throw/rejectionはnew
  result/generationを作らず失敗したrequestの実際のerrorとして報告され、accept済みexplicit-rescan
  jobがfatalに終了した場合は失敗したrequestのerror messageだけを参照するstale
  overlayを作成または置換し、accept前failureでは作成しないことを検証する。一方、ownerless automatic first-scan rejectionはprocess
  top levelへ到達し、deterministic first-scan failureはgeneration-0 Sourceをstale
  overlayなしで保持する。Pre-request disable、より大きいepochの観測、またはfenceによる中央full-session
  purgeは保持中のcontentをすべて破棄し、route/file/Source/generationのscope限定cleanupは自身のmodelだけをdisposeすること、stale
  route、analysis/verdict/remediation
  controlがないことも扱う。同じ変更で`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`の`pnpm exec playwright test tests/e2e/inspection-safety.spec.ts`の行を復活させる。fileが存在しない間は削除してある。
  *(2026-08-27 修正: 致命的なrescanのstale overlayはcontract
  suiteの担当のままとする。browserからscanをthrowさせる操作は存在しないためである。browser受け入れテストは読み手が実際に到達できる2つの失敗形を扱う:
  generation-0 Sourceをoverlay無しで保持する決定的なfirst-scan root failureと、file-confinedなoutcomeが生むpartial
  commitである。)*

---

## フェーズ 94: Repository 比較の受け入れ

**目的**: 先行するすべての Repository 比較増分が、包括的な実装を用いずに US3 を満たすことを検証する。

**独立テスト**: 同じRepository Source内のreadableなcurrent-generation distinct file 2件を比較し、その後、比較画面を持つ全familyのrepresentative file — ruleとpermissionsのkindは持たない。比較は1つの同一性の2つのコピーを並べるものであり、行の単位が見つかったfile自身であるrowにはその同一性が無いためである（フェーズ39、取り下げ） — を、後段でadmitされた全real ownerを介したMCPを含めて網羅し、fileについて、literal/typed difference、unreadable、diagnostic-only、runtime-only、carrier以外のselectionの拒否、fallback、accessibility、stale invalidation、client resourceの完全なcleanupを検証する。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*

**目に見えるチェックポイント**: 比較を持つ初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。

### 受け入れテスト

- [X] T928 [US3] Rescanによるselection/request token/FileDetail/Monaco
  model/worker/subscription/late-owner MCP projection/client epoch/stale link invalidationのlifecycle
  regressionを追加する。保持またはresetすべきacknowledgement stateは存在しない（FR-027）。Ordinary scoped
  route/file/Source/generation cleanupは自身のmodelだけをdisposeし、document reloadとchannel/document
  loss、pre-request Global disable、greater Global epoch/non-null fence観測を含む全central full
  purgeがcontentを破棄する。全central full purge後にsource text、authored metadata/relationship
  target、comparison request/DOM/editor stateがどのRepository
  kindにも残らないことを`tests/integration/session-lifecycle.test.ts`で証明する *(2026-08-27 修正: lifecycleのclient側
  — view stateが保持するdetail、comparisonがmountするMonaco model、遅れて届いた結果をno-opにするepoch — はapp
  suiteがDOM上で検証する。integration projectはNode環境でありmodelを構築できないためである。このfileはsession自身が答える側を所有する:
  失われたpathと得られたpath、attemptごとのtoken、admitしたgenerationだけが射影するcarrier、clientが比較するenvelopeである。)*
- [X] T929 [US3] このmilestoneでは同じRepository Source内のreadableなcurrent-generation distinct file
  2件だけを対象とするliteral comparisonとtyped differenceに関するRepository-complete browser
  acceptanceと文書化済みcomparison targetを追加し、semantic ranking、merge、validation、lint、content
  verdict、policy/remediation、synchronization、conversion、formatting、fix suggestionがないことをassertする —
  declared metadataの各sideのcanonical serialized
  documentはFR-012が定めるparseの提示であって、conversionではない。明示的carrierだけを対象とするMCP
  selectionとcarrier以外のrejection、fallback behavior、accessibility、lifecycle
  cleanupも`tests/e2e/repository-complete-comparison.spec.ts`と`tests/e2e/comparison.spec.ts`で扱う。同じ変更で`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`の`pnpm exec playwright test tests/e2e/comparison.spec.ts`の行を復活させる。fileが存在しない間は削除してある。
  *(amended 2026-08-20: MCP
  surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail
  contentとして見えるだけである。)* *(2026-08-27 修正: 同じ変更でquickstart §
  3の項目3を訂正した。宣言済みmetadataはsideごとに1つのcanonical serialized documentとして比較し、各surfaceのtypedなrecognition
  rowの横でMonacoがdiffする。これはFR-012が定めるparseの提示であって変換ではない。)*

---

## フェーズ 95: Global 同意プレビュー

**目的**: User-Global パスが承認される前に、正確で I/O を行わず capacity を environment に委ねる previewを表示し、同意の除外に必要な残りの純粋な User-only の振る舞いの事実を完成させる。

**独立テスト**: 分離された environment input と fake home を使用し、proposed path に対する I/O がゼロであること、正確な3 tool preview entry、throw/rejection 時に partial preview を公開しない complete environment-supported escaping、不正な override、保持済みpreviewのallowlist/traversal-plan versionを伴う`previewId` binding、stale/replayed request の拒否、固定English UIでのaccessible review、`codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` の read authority を付与しない one-time ownership を検証する。

**目に見えるチェックポイント**: ユーザーは検査を有効にする前に、正確な Global root、exclusion、lexicalなvalidity stateを確認できる。Read scopeはpatternごとのpath表示ではなく平易な言葉で説明する。*(2026-08-27 修正: contract version は表示しなくなった。previewが束縛する2つのversionはどちらも読み手が行動できず参照先もなく、それらが守る不一致はpreviewが画面にある間には起こりえない。確認が`allowlistVersion`を送信しhostが古いものを拒否する、そこが対の属する場所である。)*

### フィクスチャとテストを先に

- [X] T930 [US4] Exact candidate、exclusion、fallback、invalid override、link、unreadable
  root、注入したNode.js/OS/filesystem throw/rejection、異なるliteral credential/environment
  reference、sentinel process value、executable-looking inert payload、before/after
  content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL
  observationと別記録するOS-only atimeを対象とするisolated Global-home
  fixtureを作成する。throw/rejectionを変更なく伝播し失敗したrequestの実際のerrorとして報告すること、file-size/count
  validationなし、availabilityからvalidity/lint/verdictを生成しないことを`tests/fixtures/global-homes/build-fixtures.ts`、`tests/fixtures/global-homes/README.md`、`tests/fixtures/global-homes/README.ja.md`のbilingual
  guidanceへ記載する
- [X] T931 [US4] 残りの純粋な User-only の事実
  `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows`
  を具体化し、それらに対する失敗するレジストリ/バックリンクのカバレッジを
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/contract/vendor-behaviors.test.ts` に追加する
- [X] T932 [P] [US4] filesystem/network I/O 0件と完全な順序付きGlobal `inputState` algorithmのpreview failing
  testを追加する: environmentのみのemptyは`present-empty`、U+0000またはunpaired UTF-16 surrogateは`invalid`、active
  platformの`path.isAbsolute()`がfalseなら`relative`、それ以外の値は`eligible`で、その正確な文字列がpreviewにfreezeされconsentまでread
  authorityを持たない。正確なlexical root、完全なenvironment-supported escaping、正確で最小の4-entry frozen
  previewもカバーする。capture-or-replaceがstate-changing capture
  operationだけで起きること、current-preview取得がnon-mutatingであることを証明する。throw/rejectされたcapture/escaping/serialization
  operationは、catch・cause分類・partialなDTO/state mutation・path authorityなしにconsent
  domainから無変更で伝播し、session
  API表現は失敗したrequestの通常どおり報告されるerrorに委ねることを`tests/unit/host/global-consent.test.ts`で証明する
- [X] T933 [US4] Immutable typed traversal plan、opaque `previewId`の背後でserverが保持するraw/display
  record、stale/replay invalidation、およびlater enable-request materialの`confirmedTools`をinvalid
  entryも含むclosed fixed order `[copilot, claude, codex, agents]`にexactly固定し、eligibility
  narrowing、reorder、UI/API selectorを許さないpreview
  testを`tests/unit/host/global-consent.test.ts`へ追加する。このPhase-95 test
  boundaryはpreview-onlyとし、consent後のinitial/retry work-set derivationはenable
  foundation作成後のT945–T946が所有する
- [X] T934 [P] [US4] Non-mutatingなconsent-preview read functionがcurrent frozen
  previewまたはfixedな`consent-preview-missing` rejectionだけを返すcontractと、session
  API契約（contracts/http-api.md）のstate-changingでargument-freeなconsent-preview capture
  functionがunconsented previewをcaptureしてatomic
  create/replaceし、作成済みpreviewを返すcontractを追加する。Proposed-root I/O 0件、active-consent/enable/disable
  conflict、capture/encoding throw時に失敗したrequestのordinary errorとなりsuccess byte/job/retention/state
  mutationが0件であることを検証し、read
  functionがenvironmentをrecaptureしないことを`tests/contract/http-api-global.test.ts`で証明する
- [X] T935 [US4] consent route へ直接遷移するのではなく起動 URL から辿り着く経路を含め、固定Englishのpreview
  UIについて、root、平易な言葉によるread-scope説明、lexical state、exclusion、通常どおり報告されるrequest error、keyboard
  review、同意前のsource resultまたはenable requestが0件であることを検証するfailing browser acceptance
  testを`tests/e2e/global-consent-preview.spec.ts`に追加する

### 実装

- [X] T936 [US4] Global 除外レコードから参照される前に、それまで未所有で読み取り権限を付与しない事実
  `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` だけを
  `src/shared/registries/vendor-behaviors.ts` に追加する
- [X] T937 [US4] ソース ID を作成せず、これら 3 つの純粋な User-only の振る舞いの事実に対する相互バックリンクを既存の公式ソースレコードへ 対象registry
  recordの`evidence` citation で追加する
- [X] T938 [US4] POST所有のcomplete environment/default-home preview captureとordered Global
  `inputState` algorithm（`present-empty`、U+0000またはunpaired
  surrogateなら`invalid`、`relative`、それ以外は`eligible`）を実装し、`eligible` rootだけにexact
  frozen文字列を引き継いでfilesystem/network I/Oを0件とする。Normalization/root creationなしのpresentation
  escapingとatomic create-or-replaceを行い、frozen recordをGETへpure current-state
  retrievalとして公開する。Capture/classification/escape/serializationのthrow/rejectionはdomainでcatch/cause分類/partial
  DTO/state mutation/path authority化せず変更なしに伝播する処理を`src/server/host/global-consent.ts`へ実装する
- [X] T939 [US4] Opaque `previewId`の背後に置くメモリ内だけのプレビューレコード、古い状態の無効化、有効化要求のバインディングを
  `src/server/host/global-consent.ts` に実装する
- [X] T940 [US4] `src/server/host/devframe-app.ts`にstrictなpaired preview
  functionを実装する。Non-mutatingなconsent-preview readはcurrent frozen
  previewまたはfixedな`consent-preview-missing` rejectionだけを返し、argument-freeなcapture
  functionだけがunconsented previewをcapture/atomic create-or-replaceして返す。Readはpure current-state
  retrievalのままにする。Exact conflictを保持し、capture/encoding
  throwはrequestを実際のerror（devframeがそのままserialize）で失敗させ、success byte/job/retention/state mutation/path
  authorityを作らず、readはenvironment recaptureしない
- [X] T941 [US4] 正確な root、平易な言葉によるread-scope説明、state、exclusion、通常どおり報告されるrequest error
  について、Inspector-defined capacity field/value を含まない accessible preview presentation を
  `src/app/components/consent/GlobalConsentPreview.vue` に実装する *(2026-08-30 修正: preview が束ねる version
  の組は enable request が運ぶ contract token であり user copy ではないため、presentation は描画しない。)*
- [X] T942 [US4] 有効化を送信せず、プレビューのロード、ローカルの明示確認状態、古い状態からの回復、session-identity loss の処理、フォーカス管理を
  `src/app/pages/global-consent.vue` に実装し、起動時に開く inventory から keyboard で到達できる入口を
  `src/app/pages/index.vue` に置く *(2026-08-17修正: consent route が URL
  を手で打つ以外に到達できないことがレビューで判明したため、入口をここで明記した。)*
- [X] T943 [US4] 英語の Global preview、throw/rejection、invalid override、consent message を、それらを描画する Vue
  component に追加する

---

## フェーズ 96: Fixed-Member Global Enable基盤とCodex Batch Member（Composite Slice 1/4）

**目的**: Exact stored previewを検証し、closed typed member-admission port上にgeneric selector-free fixed-member coordinatorを確立してreal Codex memberをbindすることで、単一のPhase-96–99 composite milestoneを開始する。Claude/Copilot production portはPhase 97–98だけが追加し、このslice単独ではall-member production完成を主張せず、Phase 99前にcomposite milestoneを完了しない。

**独立テスト**: Tool selectorなしのexact preview-bound bodyをsubmitし、generic coordinator boundaryへtest-only typed member outcomeをinjectして、後続Claude/Copilot production portの存在を装わず0〜3件のaccepted/rejected partitionをすべてexerciseする。Admitted outcome 0件なら`active-no-job`、injected admitted context 1〜3件ならone shared `scanRequestId`/working setのexactly one `GlobalBatchScan`へまとめてtransferする。Real Codex member、disable interleaving、visible carried Sourcesを伴うexact retry state、Repository、exact `codex.excluded.user-runtime`も別に検証し、Phase 99で3つのreal portを通じて同じpermutationを再検証してからcomposite milestoneをgreenにする。

**目に見えるチェックポイント**: このinternal sliceはrelease checkpointではない。Harnessはfixed tupleとshared pending/retryable stateをprovisional Sourceなしで示すが、user-visible all-member checkpointはClaude/Copilot port bind後のPhase 99だけが所有する。

### テストを先に

- [X] T944 [P] [US4] canonical component identity、targetを通して読まれるlink、invalid
  override、網羅的first-non-empty traceのCodex post-consent failing testを追加する:
  `trim().length > 0`の読み取り済み非binary decoded override (保持された`U+FFFD`を含む)
  はshort-circuitする。missing/empty/BOM-only/whitespace-onlyのoverrideはfallbackへ進む。binary
  overrideは`file-content-binary` Diagnosticでbranchを終了しfallbackしない。読めないoverride (broken linkを含む)
  は`file-unreadable` Diagnosticでbranchを終了しfallbackしない。1つのfileに閉じないfailureはfixed-member
  transaction全体を中止しcontext/candidate/plan/authority/batch/resultを一切生まない。host consent codeが`node:fs`
  callを0件発行することを`tests/unit/host/global-consent.test.ts`でassertする
- [X] T945 [P] [US4] `confirmed: true`、exact version/`previewId` binding、tool
  selectorなし、extra/false/stale/superseded-preview rejection、fixed
  `confirmedTools: [copilot, claude, codex, agents]`、server-derived initial-allまたはexact
  `retryableTools` set—admitted-unpublishedとsame-preview rejected
  controlを含み、published、pending、lexical new-preview-required controlを除外—、exact accepted/rejected
  partitionのGlobal-enable function failing contract（session API契約、contracts/http-api.md）を追加する。Zero
  admittedは`active-no-job`/null ID/no new job/Source/generationとし、initial enableにはGlobal
  Sourceがない。Retry
  validation/admission中は`globalEnableInProgress`だけを公開し、既存のSources/control/`pendingTools`/`retryableTools`/`batchStatus`/diagnostic/snapshot
  projectionをexactly保持する。Queued acceptanceだけが`pendingTools`/`batchStatus`をadmitted subset/shared
  IDへatomicに設定する。未bindのClaude/Copilot portにはtest-only typed outcomeをinjectして1–3 admittedのexactly one
  shared `scanRequestId`/one unpublished `GlobalBatchScan` `queued`をcoverするが、production
  root/contextをsynthesizeせず、T991/T993で全real
  portを通じて同じcaseを再検証する。Fileに閉じないfailureはaccept前なら失敗したrequestのordinary errorとしinitial
  consent/control/jobをactivateせず、retry stateを不変にし、acceptance後ならshared non-null IDのone retained
  terminal error/no subset commitとすることを`tests/contract/http-api-global.test.ts`で検証する
- [X] T946 [P] [US4] Production bind前のmember portにはtest-injected typed outcomeだけを使い、fixed-member
  initial-enable/retry coordinatorのatomic control/admission partition、operation
  epoch、FIFO、conflict、provisional Source 0件、`active-no-job`、および全nonempty injected admitted
  subsetにone `GlobalBatchScan`/request ID/publication authority/working setを検証する。Retry
  pollingはaccept前に`globalEnableInProgress`だけを公開してexactなpre-operation
  `pendingTools`/`retryableTools`/`batchStatus`/diagnostic projectionを保持し、queued acceptanceがadmitted
  subset/shared requestだけをatomicにinstallすることを証明する。Fileに閉じないfailureはaccept前ならinitial
  consent/control/jobを作らず、retryならexisting stateを不変にし、acceptance後ならshared batchをone retained ordinary
  terminal errorでterminalにする。Subset/generation/stale overlayなし、prior
  snapshot、disable/shutdown/supersession late discard、acceptance対`global-disable-pending`
  conflictのlinearizationを証明する。このinjected coordinator suiteをproduction
  all-member完成と扱わず、T991/T993がその証明を`tests/unit/session/coordinator.test.ts`で所有する
- [X] T947 [P] [US4] Fixed-three transaction内のCodex member boundary testを追加する。Raw-path挙動（exact raw
  segmentがfilesystem operandのままT019/T030の公開raw pathに従うこと）、exact Codex Global instructionとT944に従うfallback、excluded surface 0件、admitted missing-Source memberのnew/provisional
  Sourceをsingle batch commit前に0件、carried existing
  Sourceはvisibleとする。Fileに閉じないfailureは全siblingをabortしRepository stateを保持する。さらに、全proposed-root
  operationがsingle inspection moduleだけから発生しhost admission codeのdirect filesystem
  callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で証明する
- [X] T948 [US4] 参照だけの Codex User 振る舞いセット、`codex.global.instructions`、正確な
  `codex.excluded.user-runtime`、composition、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T949 [US4] 有効化前にすべての Codex User 振る舞いがすでに所有されていたこと、`codex.global.instructions` が読み取りを新たに許可する唯一の
  Codex ルールであること、`codex.excluded.user-runtime` が新たに所有される唯一の Codex 除外であることを証明する、失敗する Codex Global
  レジストリ契約を
  `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`
  に追加する
- [X] T950 [US4] No-selector exact-preview、fixed `[copilot, claude, codex, agents]`
  confirmation、未bind Claude/Copilot portへのtest-only typed outcome、one shared batch/request
  IDへ結び付くper-tool accepted/rejected controls、`active-no-job`、ordinaryなbatch failure
  error、deterministic Diagnostic、admitted missing memberのpre-commit new/provisional Source/file row
  0件とcarried Source visibility、Repository retentionのbrowser
  acceptanceを`tests/e2e/global-codex-admission.spec.ts`へ追加する。Real Codex
  pathだけをproduction-backedとし、全real-port browser完成はPhase 99へdeferする

### 実装

- [X] T951 [US4] Codex root-admission orchestrationをfixed-member operationのone memberとして実装し、frozen
  rootとcompiled planをinspection moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw
  provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error
  codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはsingle `GlobalBatchScan`へ渡すatomic
  all-tools decisionでだけ`GlobalToolControl`へtransferする処理を`src/server/host/global-consent.ts`へ実装する
- [X] T952 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている
  `codex.behavior.user.instructions`、`codex.behavior.user.agents`、`codex.behavior.user.config`、`codex.behavior.user.hooks`、`codex.behavior.user.memories`、`codex.behavior.user.plugins`、`codex.behavior.user.prompts`、`codex.behavior.user.rules`、`codex.behavior.user.skills`
  を、Global ルール/除外への相互参照で `src/shared/registries/vendor-behaviors.ts` において更新する
- [X] T953 [US4] 同意でゲートされた読み取り許可ルールとして `codex.global.instructions`
  だけを追加し、既存の除外レコードを一切変更せず、正確に新しい非読み取りの `codex.excluded.user-runtime` を
  `src/shared/registries/inspection-rules.ts` で所有する
- [X] T954 [US4] 新しい戦略 ID を作成せず、既存の Codex 命令戦略を Global 選択、フォールバック、ソース分離の入力によって
  `src/shared/registries/runtime-composition.ts` で拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T955 [US4] 新しいソース ID を作成せず、Codex Global のカバレッジについて既存の公式ソースレコードのバックリンクを 対象registry
  recordの`evidence` citation で更新する
- [X] T956 [US4] 正確な`utf-8`/`utf-8-replaced` emptiness
  semanticsを持つcompile済み`codex-global-first-non-empty` traversal planを実装する: missing
  overrideはfallbackへ進み、empty/BOM-only/whitespace-only
  overrideも進み、binaryまたは読めないoverrideはそのDiagnosticでbranchを終了しfallbackせず、最大1
  fileを選択し、正確な`codex.excluded.user-runtime`は除外されたままにし、1つのfileに閉じないfailureは無変更で伝播してbatch全体を中止することを`src/server/inspection/rules/codex.ts`で実装する。Fallbackは自身のtargetをreadするため、他planのwalkもadmitしたtargetは1
  Source scan attemptにつき1回だけreadしなければならない（contracts/inspection-path-allowlist.md § Common
  conformance
  requirements）。両方がreadした後にadmissionをmergeすることは1つのfileを2回readすることであり、そのbytesは`readBytes`にちょうど1回だけ反映させる。
- [X] T957 [US4] Codex scanをsingle `GlobalBatchScan`のone memberとして実装し、one root、exact
  fallback、raw-path semantics、deterministic Diagnosticを扱う。全committable memberがone atomic
  generationでpublishされるまでadmitted missing memberのnew/provisional Source/graphを0件とし、carried
  Sourcesをvisibleに保つ。Fileに閉じないmemberのthrow/rejectionは変更なしに伝播してwhole
  batchをabortするよう`src/server/inspection/scan.ts`へ実装する
- [X] T958 [US4] Fixed three closed typed member-admission port上にgeneric selector-free
  initial-enable/exact-consent-retry coordinatorを実装する。Production Codex portはT951、Claude/Copilot
  portは後続T968/T982がbindし、T945–T946はこのport boundaryへtyped test outcomeだけをinjectできるがproduction
  root/contextをsynthesizeせずfilesystem I/Oを行わない。Generic layerはinitialで3
  slotすべてをevaluateし、retryではnon-pending unpublished admittedとsame-preview rejected
  controlを含みpublished、pending、lexical new-preview-required controlを除外するcomplete fixed-order exact
  `retryableTools` projectionをderiveし、one atomic decisionでfixed controls/outcomesを有効にする。Retry
  validation/admission中は`globalEnableInProgress`だけを公開し、exact pre-operation
  `globalControl`,`pendingTools`,`retryableTools`,`batchStatus`, diagnostic fields, Sources,
  snapshotを保持して、queued acceptanceだけがadmitted pending subset/shared batchをatomicにinstallする。Zero
  admittedは`active-no-job`/null ID/no new job-Source-generation、nonemptyはsupplied typed
  context/IDすべてをone shared request/authority/working setの`GlobalBatchScan`へtransferする。Exact
  pre-/post-acceptance errorとlate-discard lifecycleを保持するが、T998が全real
  portをbindしT1000–T1002がpublication/API behaviorをcloseするまでproduction all-member
  activationを主張しない処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する
- [X] T959 [US4] Generic coordinatorへ接続するfoundation Global-enable session-API function
  adapterを`src/server/host/devframe-app.ts`へ実装する。Strict selector-free guard、stored
  previewの`previewId` validation、fixed-member confirmation、server-derived exact `retryableTools`
  setとnonempty gate、provisionalな`pendingTools`/`batchStatus`
  mutationを行わず`globalEnableInProgress`だけを公開するoperation-local validation、accepted/rejected
  partition、queued one shared IDまたは`active-no-job` null ID、retry/disable conflict、Source
  summary/client authorityなし、ordinaryなpre-/post-acceptance failure
  lifecycle（失敗したrequestの実際のerror）/no partial subsetも保証する。Unbound production member
  portはrejection/admissionをfabricateせずrootへaccessできず、T998/T1002が最初のcomplete all-real-port
  functionを所有する
- [X] T960 [US4] Single explicit fixed-member confirmation controlをselector-free
  endpointへ直接接続し、per-tool selectorを決して提供しない。Stale preview、accepted/rejected partition、one shared
  batch、`active-no-job`、ordinaryなbatch failure error、accessible
  focusを`src/app/pages/global-consent.vue`へ実装する
- [X] T961 [US4] Retry validation/admission中は`globalEnableInProgress`だけを公開してexactなpre-operation
  control/pending/retryable/batch/diagnostic projectionを保持し、atomicなqueued acceptanceだけがadmitted
  accepted-batch subset/shared request IDを参照するpending entryと対応する`batchStatus`を設定するfixed-member
  controlsを実装する。Pending終了後のretryable entryはnon-pending
  unpublished-admittedとsame-preview-rejectedからなるexact `retryableTools` setだけとし、lexical
  new-preview-required controlを除外する。Evaluated missing toolの`active-no-job`やunpublished memberがnew
  Sourceを意味したりcarried existing
  Sourceを隠したりしないことを`src/app/components/consent/GlobalSourceControls.vue`で保証する
- [X] T962 [US4] Fixed-three Global admission、single
  batch/request、accepted/rejected、`active-no-job`、retryable boundary/fallback、batch
  failure、pre-commit new/provisional Sourceなし対visible carried Sourcesについて英語messageをそれらを描画するVue
  componentへ追加する

---

## フェーズ 97: Claude Global Batch Member（Composite Slice 2/4）

このsliceはopenなPhase-96–99 composite milestoneへreal Claude portを追加するが、独立してgreenまたはrelease可能なmilestoneではない。

**目的**: Claude root admission/scanningをsame fixed-member `GlobalBatchScan`内のseparately identified Source candidateとして追加し、one rootを保ち、independent initial/retry jobまたはcommitを作らない。

**独立テスト**: Fixed-three operation内でvalid/invalid Claude rootをpartitionし、exact `CLAUDE.md`だけを読み、Claude control/contextをone possible batch memberとして保持する。Admitted sibling Sourceはbatchのone generationですべて同時に現れるか、fileに閉じないfailure後はどれも現れず、exact exclusionとprior Repository/Global stateを維持する。

**目に見えるチェックポイント**: Global controlはone shared operation内のClaude per-tool outcomeを報告し、new/provisional Claude Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### テストを先に

- [X] T963 [P] [US4] fixed-member operation内のcanonical root、raw-path
  identity、targetを通して読まれるlink、invalid override、missing/読み取り不能fileのClaude post-consent boundary
  failing testを追加する: missingまたは読めないClaude rootは、sibling
  toolのcommitを妨げずにそのtoolをabsentまたはfailedとして記録する。admitされたClaude root内のfile限定failureはpartialなmember
  resultの中でそのfileのDiagnosticになる。1つのfileに閉じないfailureは無変更で伝播しsubset
  Source/generationなしでbatch全体を中止する。host consent codeのfilesystem
  callは0件であることを`tests/unit/host/global-consent.test.ts`で証明する *(2026-08-30 修正: fixed-member
  operationはFR-045以降4 memberに及ぶ。このtask自身の主題 — Claude memberのboundary — は不変。)*
- [X] T964 [P] [US4] Claude Global `CLAUDE.md`だけをreadしneighbor operation 0件、distinct Claude
  control/contextだがindependent jobなし、admitted missing memberのpre-commit new/provisional Source
  0件、carried Sources visible、raw-path挙動、one shared batch request/working set、atomic all-member
  publication、whole-batch fileに閉じないfailure abort、Repository/prior Source
  retentionを検証する。さらに、全proposed-root operationがsingle inspection moduleだけから発生しhost admission
  codeのdirect filesystem callが0件であることをinstrumentして`tests/integration/global-boundaries.test.ts`で検証する
- [X] T965 [US4] 参照だけの Claude User 振る舞いセット、`claude.global.instructions`、正確な
  `claude.excluded.user-runtime`、composition、エビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に具体化する
- [X] T966 [US4] 有効化前にすべての Claude User 振る舞いがすでに所有されていたこと、`claude.global.instructions`
  が読み取りを新たに許可する唯一の Claude ルールであること、`claude.excluded.user-runtime` が新たに所有される唯一の Claude
  除外であることを証明する、失敗する Claude Global レジストリ契約を
  `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`
  に追加する
- [X] T967 [US4] Fixed-three controls内のClaude confirmed/pending/retryable outcome、shared batch
  request/progress、deterministic per-tool Diagnostic、ordinaryなwhole-batch failure error、pre-commit
  new/provisional Claude Source/file row 0件対visible carried Sources、atomic sibling
  publication、Repository retentionのbrowser
  acceptanceを`tests/e2e/global-claude-admission.spec.ts`へ追加する

### 実装

- [X] T968 [US4] Claude root-admission orchestrationをone fixed-member memberとして実装する。Frozen
  rootとcompiled planをinspection moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw
  provenanceを保持してrejected callを変更せずpropagateする。Host codeはfilesystem callもNode error
  codeのinspect/convertも行ってはならない。Admitted unpublished context/IDはone `GlobalBatchScan`へ供給するatomic
  decisionでだけClaude controlへtransferする処理を`src/server/host/global-consent.ts`へ実装する
- [X] T969 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている
  `claude.behavior.user.instructions`、`claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows`
  を、Global ルール/除外への相互参照で `src/shared/registries/vendor-behaviors.ts` において更新する
- [X] T970 [US4] 同意でゲートされた読み取り許可ルールとして `claude.global.instructions` だけを追加し、正確に非読み取りの
  `claude.excluded.user-runtime` レコードを `src/shared/registries/inspection-rules.ts` で所有する
- [X] T971 [US4] 新しい戦略 ID を作成せず、既存の Claude 命令戦略を Global 選択とソース分離の入力によって
  `src/shared/registries/runtime-composition.ts` で拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T972 [US4] ソース ID を作成せず、Claude Global のカバレッジについて既存の公式ソースのバックリンクを 対象registry recordの`evidence`
  citation で更新する
- [X] T973 [US4] 同意済み境界の配下で Claude `CLAUDE.md` だけを処理し、正確な `claude.excluded.user-runtime` の強制を
  `src/server/inspection/rules/claude.ts` に実装する
- [X] T974 [US4] 単一`GlobalBatchScan`の1 memberとしてのClaude scanningを実装する: 正確に1 root、raw-path
  semantics、決定論的member
  Diagnostics、missingまたは読めないrootはsiblingを適格のままmemberをabsent/failedとして記録し、file限定outcomeはpartialなmember
  resultにそのfileのDiagnosticとして寄与し、admitされた全memberのcommittable
  resultが1つのgenerationで一緒に公開されるまで新規/暫定member-Source公開は0件でcarried既存Sourceは可視のまま。1つのfileに閉じないmember
  failureは無変更で伝播させてbatch全体を中止することを`src/server/inspection/scan.ts`で実装する
- [X] T975 [US4] Claude control/context outcomeとretry stateをindependent jobではなくone serialized
  fixed-member admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有しone
  atomic commitまでprior stateを保持する。Fileに閉じないfailureはshared IDのone retained ordinary terminal
  errorとし、new item/Source/result/generationまたはinitial/retry stale overlayを0件とし、late
  workを`src/server/session/session.ts`でdiscardする
- [X] T976 [US4] Claude Global admission、exact exclusion、shared-batch progress、deterministic
  rejection/retry、whole-batch failure、pre-commit new/provisional Sourceなし対visible carried
  Sourcesについて英語messageをそれらを描画するVue componentへ追加する

---

## フェーズ 98: Copilot Global Batch Member（Composite Slice 3/4）

このsliceは同じopen composite milestoneへreal Copilot portを追加するが、独立してgreenまたはrelease可能ではない。

**目的**: 4-member consent基盤を先に敷き、Copilot root admissionと、contract化されたmember selector集合 — `COPILOT_HOME`配下のinstruction、skill、agent、hook、settings、MCPと、共有agent homeのskill rule — をsame fixed-four `GlobalBatchScan`内のseparately identified Source candidateとして追加し、exact Copilot/shared exclusionを所有する。

**独立テスト**: Fixed-four operation内でvalid/invalid `COPILOT_HOME`をpartitionし、contract化されたselectorだけを読み、behavior partitionをmappingする。Admitted sibling Sourceはone batch generationですべて同時に現れるか、fileに閉じないfailure後はどれも現れず、independent Copilot job/commitを作らない。

**目に見えるチェックポイント**: Global controlはshared operation内のCopilot per-member outcomeを報告し、new/provisional Copilot Sourceはsingle batch commitまで現れず、carried Sourcesはvisibleのままになる。

### 4-member基盤

- [X] T1137 [US4] どのmemberを広げるより先に、fixed-memberのconsent operationをFR-013とFR-045が定義するfixed-four
  member operationへ変える: 3つのenvironment
  propertyを従来どおりcaptureし、import済み`node:os.homedir()`をpreviewごとに正確に1回callし、共有agent
  homeを`node:path.join(capturedHomedir, '.agents')`としてderiveし、固定順の4 preview
  entryを`src/server/host/global-consent.ts`でfreezeする。`allowlistVersion`/`traversalPlanVersion`のliteralを`2026-08-27`へ上げ
  — 広がったselector集合は別のconsentであり、旧versionはmatchを止めなければならない —
  新しいliteralを`tests/contract/http-api-global.test.ts`でpinする。member
  idをclosedな`copilot | claude | codex | agents`
  unionとして`src/shared/api-types.ts`に置き、その表記を`src/shared/api-text.ts`に置き、preview entry・control・batch
  fieldを改訂後のcontract（contracts/http-api.md）どおりmemberでkeyし、`SourceSelector`が第4のmemberを`global-agents`と綴るよう`src/shared/registries/identifier-types.ts`とそれをparseするclientのroute/filter
  moduleを更新する。member自体はそのCodex rule —
  `src/shared/registries/codex/rules.ts`と`src/server/inspection/rules/codex.ts`の`codex.global.agents-home.skill`と`codex.global.agents-home.marketplace`
  — とともに着地させ、`agents` memberのadmission portをtool portの横にbindする。これにより`~/.agents/skills`配下のskill
  1つは`agents` Sourceの下にCodex recognitionを持ってpublishされ、T987がそのvendorのruleを載せたときにCopilot
  recognitionを得る。`tests/fixtures/global-homes/build-fixtures.ts`を現実的な共有agent home —
  near-miss隣接を伴うskill、personalな`plugins/marketplace.json`、除外されるinstalled plugin copy —
  でREADMEのcandidate/near-miss規則に従って拡張し、consent
  copyを`src/app/pages/global-consent.vue`と`src/app/components/consent/GlobalConsentPreview.vue`で4つのディレクトリと広がったfile集合を述べるよう更新し、4-entry
  preview、常にderiveされる第4 root、version bump、`agents`
  memberのadmissionを`tests/contract/http-api-global.test.ts`、`tests/unit/host/global-consent.test.ts`、`tests/e2e/global-consent-preview.spec.ts`でend
  to endに証明する。

### テストを先に

- [X] T977 [P] [US4] fixed-four operation内のabsent/default対invalid override、canonical root、raw-path
  identity、targetを通して読まれるlink、missing/読み取り不能fileのCopilot post-consent boundary failing testを追加する:
  missingまたは読めないCopilot rootは、sibling
  memberのcommitを妨げずにそのmemberをabsentまたはfailedとして記録する。admitされたCopilot
  root内のfile限定failureはpartialなmember resultの中でそのfileのDiagnosticになる。1つのfileに閉じないfailureは無変更で伝播しsubset
  Source/generationなしでbatch全体を中止する。host consent codeのfilesystem
  callは0件であることを`tests/unit/host/global-consent.test.ts`で証明する *(2026-08-27修正: fixed-four — 共有agent
  homeがmemberに加わる（FR-045）。)*
- [X] T978 [P] [US4] contract化されたCopilot Global selector集合 — instruction
  pair、`skills/<name>/SKILL.md`、`agents/*.agent.md`、`hooks/*.json`、`settings.json`、`mcp-config.json`、共有agent
  homeのskill — 、隣接する全User/runtime/managed-remote surfaceへのoperationが0件、distinct Copilot
  control/contextだがindependent jobなし、admitted missing-Source memberのnew/provisional pre-commit
  Sourceが0件でcarried existing Sourcesはvisible、exact raw-path挙動、one shared batch request/working
  set、atomic all-member publication、whole-batch fileに閉じないfailure abort、Repository/prior-Source
  preservationに関するboundary
  testを`tests/integration/global-boundaries.test.ts`に追加する。さらに、全proposed-root operationがsingle
  inspection moduleだけから発生しhost admission codeのdirect filesystem callが0件であることをinstrumentする
  *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T979 [US4] 参照だけの Copilot 振る舞いの分割を具体化する。すなわち、`copilot.behavior.cli.user.instructions.root` は
  `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と
  `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path`
  だけ、admit対象kindの各behaviorはcontractのGlobal表どおり自身のCopilot Global ruleへ、残りの 11 個の Copilot User 振る舞いは
  `copilot.excluded.user-runtime` へ — `COPILOT_HOME` subsetがadmitされる3つのVS Code
  rowはadmit側ruleとexclusionの両方をbacklinkする — 、契約で定められた 3 個の Claude/Codex User と 5 個の Cloud 振る舞いだけは
  `shared.excluded.managed-remote-state` に対応させ、composition とエビデンス行を
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  に追加する *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった
  — FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T980 [US4] contract化された受け入れ済み振る舞いから Global ルールへのバックリンク、残りの 11 個から
  `copilot.excluded.user-runtime` への正確なバックリンク、契約対象だけの共有 managed 影響セット、新たに読み取りを許可するのが 9 つの Copilot
  Global rule —
  `copilot.global.instructions.root`、`copilot.global.instructions.path`、`copilot.global.skill`、`copilot.global.agent`、`copilot.global.hooks`、`copilot.global.hooks.inline`、`copilot.global.settings`、`copilot.global.mcp`、`copilot.global.agents-home.skill`
  — だけであること、新たに所有されるベンダー除外が 1 つ、共有除外が 1 つであることを証明する、失敗する Copilot Global レジストリ契約を
  `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`
  に追加する *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった
  — FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T981 [US4] Fixed-four control内のCopilot confirmed/pending/retryable outcome、shared batch
  request/progress、deterministic invalid-override Diagnostic、ordinaryなwhole-batch failure
  error、new/provisional pre-commit Copilot Source/file rowが0件でcarried existing
  Sourcesはvisible、atomic sibling publication、retained Repository resultに関するbrowser
  acceptanceを`tests/e2e/global-copilot-admission.spec.ts`に追加する *(2026-08-27修正: fixed-four — 共有agent
  homeがmemberに加わる（FR-045）。)*

### 実装

- [X] T982 [US4] Copilot root-admission orchestrationをfixed-fourのone
  memberとして実装する。Absent/defaultとinvalid previewを区別し、frozen rootとcompiled planをinspection
  moduleへsubmitしてtyped admission outcome/contextだけをconsumeし、raw provenanceを保持してrejected
  callを変更せずpropagateする。Host codeはfilesystem callもNode error codeのinspect/convertも行ってはならない。Admitted
  unpublished context/IDはone `GlobalBatchScan`へ供給するatomic decisionでだけCopilot
  controlへtransferする処理を`src/server/host/global-consent.ts`へ実装する *(2026-08-27修正: fixed-four — 共有agent
  homeがmemberに加わる（FR-045）。)*
- [X] T983 [US4]
  すでに所有されている振る舞いを、contract化された相互バックリンクセットで更新する。`copilot.behavior.cli.user.instructions.root` は
  `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と
  `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path`
  だけ、`copilot.behavior.cli.user.skills` と `copilot.behavior.vscode.user.skills` は
  `copilot.global.skill` と `copilot.global.agents-home.skill` へ、`copilot.behavior.cli.user.agents` と
  `copilot.behavior.vscode.user.agents` は `copilot.global.agent` へ、`copilot.behavior.cli.user.hooks`
  と `copilot.behavior.vscode.user.hooks` は `copilot.global.hooks` へ、CLI 行はさらに
  `copilot.global.hooks.inline` へ — settings behavior は settings rule だけの basis である（T624） —
  、`copilot.behavior.cli.user.settings` は `copilot.global.settings`
  へ、`copilot.behavior.cli.user.mcp` は `copilot.global.mcp` へ、残りの 11 個の Copilot User
  振る舞い（`copilot.behavior.vscode.user.claude`、`copilot.behavior.vscode.user.skills`、`copilot.behavior.vscode.user.agents`、`copilot.behavior.vscode.user.prompts`、`copilot.behavior.vscode.user.hooks`、`copilot.behavior.vscode.user.mcp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.plugins`、`copilot.behavior.cli.user.lsp`、`copilot.behavior.cli.user.extensions`）は
  `copilot.excluded.user-runtime` へ — admitされた`COPILOT_HOME` subsetを持つ3つのVS Code rowは両方のbacklinkを持つ
  — 、契約で定められた共有 managed
  セット（`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`codex.behavior.user.plugins`、`copilot.behavior.cloud.mcp`、`copilot.behavior.cloud.organization-agents`、`copilot.behavior.cloud.organization-instructions`、`copilot.behavior.cloud.plugins`、`copilot.behavior.cloud.remote-skills`）は
  `shared.excluded.managed-remote-state` だけに対応させ、振る舞い ID を追加または再定義せずに
  `src/shared/registries/vendor-behaviors.ts` で更新する *(2026-08-27修正: Global scopeはinstruction
  fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T984 [US4] contract化された振る舞い参照を持つ 9 つの Copilot Global rule を追加し、残りの 11 個の User 振る舞い参照だけを持つ正確な
  `copilot.excluded.user-runtime` を所有し、契約で定められた 3 個の Claude/Codex User と 5 個の Cloud 参照だけを持つ 1
  つの共有非読み取り `shared.excluded.managed-remote-state` を `src/shared/registries/inspection-rules.ts`
  に追加する *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった
  — FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T985 [US4] 新しい戦略 ID を作成せず、既存の Copilot CLI/VS Code 命令戦略を Global のソース分離によって
  `src/shared/registries/runtime-composition.ts` で拡張する *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)*
- [X] T986 [US4] ソース ID を作成せず、contract化された受け入れ済み Global ルール、残り 11 件の User-runtime、契約で定められた
  shared-managed の各分割について、既存の公式ソースバックリンクを 対象registry recordの`evidence` citation で更新する
  *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T987 [US4] 同意済み境界の配下で contract化された Copilot Global selector —
  `copilot-instructions.md`、`instructions/**/*.instructions.md`、`skills/<name>/SKILL.md`、`agents/*.agent.md`、`hooks/*.json`、inline-hooks
  recognitionを伴う`settings.json`、`mcp-config.json` — と、共有agent
  home配下の`copilot.global.agents-home.skill`だけを処理し、正確な `copilot.excluded.user-runtime` と
  `shared.excluded.managed-remote-state` の強制を `src/server/inspection/rules/copilot.ts` に実装する
  *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T988 [US4] 単一`GlobalBatchScan`の1 memberとしてのCopilot scanningを実装する:
  contract化されたselectorが名指さないものへ届かないmember-selector traversal、正確に1 root、raw-path semantics、決定論的member
  Diagnostics、missingまたは読めないrootはsiblingを適格のままmemberをabsent/failedとして記録し、file限定outcomeはpartialなmember
  resultにそのfileのDiagnosticとして寄与し、admitされた全memberのcommittable
  resultが1つのgenerationで一緒に公開されるまで新規/暫定member-Source公開は0件でcarried既存Sourceは可視のまま。1つのfileに閉じないmember
  failureは無変更で伝播させてbatch全体を中止することを`src/server/inspection/scan.ts`で実装する *(2026-08-27修正: Global
  scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T989 [US4] Copilot control/context outcomeとretry stateをindependent jobではなく、one serialized
  fixed-four admission/batch operationのprojectionとして実装する。Admitted siblingsとrequest/progressを共有し、one
  atomic commitまでprior stateを保持し、fileに閉じないfailureではshared IDにone retained ordinary terminal
  errorだけを保持してnew item/Source/result/generationおよびinitial/retry stale overlayを作らず、その後late
  workをdiscardする処理を`src/server/session/session.ts`へ実装する *(2026-08-27修正: fixed-four — 共有agent
  homeがmemberに加わる（FR-045）。)*
- [X] T990 [US4] 英語のCopilot Global override、admission、exact exclusion、shared-batch
  progress、deterministic rejection/retry、whole-batch failure messageをそれらを描画するVue
  componentに追加し、new/provisional pre-commit Sourceがないことと、visibleなままのcarried existing Sourcesを明確に区別する
  *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*

---

## フェーズ 99: Atomic Global Batch Result統合（Composite Closure 4/4）

**目的**: 出荷済みのClaude/Codex memberをcontract化されたkind集合へ広げたうえで、4つのreal member-admission portをすべてbindし、one initial/retry `GlobalBatchScan` commitだけで0〜4個のseparately identified one-member/one-root Global Sourceを統合してroot mergeまたはper-member commitを公開せず、composite milestoneをcloseする。

**独立テスト**: Fixed tupleから0〜4 rootを決定的にadmitし、empty subsetはnew job/generationなしでcarried stateを保持し、nonempty subsetはone request/working set/resultとone Global generationですべてのseparate Sourceを同時publishする。Stable Source ID、Repository generationとviewに触れずGlobal sequenceに限定されたinvalidation、81-rule total、partition、fileに閉じないfailureによるwhole-batch abort、detail/comparison、exclusion、non-pending unpublished admittedとsame-preview rejectedからなるexact `retryableTools` controlを検証する。

**目に見えるチェックポイント**: Admitted Codex/Claude/Copilot/共有agent home Global Sourceはone batch commit後にseparateかつsimultaneousに現れ、その後Sourceごとにfilter、inspect、compare、explicit rescanできる。

### Memberの拡張

- [X] T1138 [US4] 出荷済みのClaude Global memberを`CLAUDE.md`からcontract化された集合へ広げる:
  `claude.global.rules`、`claude.global.skill`、`claude.global.command`、`claude.global.agent`、`claude.global.settings`、`claude.global.permissions`、`claude.global.hooks.settings`、`claude.global.output-style`を`src/shared/registries/claude/rules.ts`と`src/server/inspection/rules/claude.ts`の`CLAUDE_GLOBAL_RULES`へ追加し、idは`src/shared/registries/identifier-types.ts`、relationは`src/shared/registries/claude/relations.ts`に置く。`claude.excluded.user-runtime`をどのGlobal
  ruleもadmitしない7つのbehaviorへ縮め、contractが持つようになった`keybindings`と`themes`のbehavior
  recordを追加する。3つのsettings
  ruleはRepositoryの3つ組とまったく同じく、1回readされる1つのcandidateである。`tests/fixtures/global-homes/build-fixtures.ts`のClaude
  homeを、現実的なadmitted fileとそのnear missで拡張する — near missに留まるnested rules
  subdirectoryの横のflatな`rules/*.md`、予約された`skills/synced/` download treeの横のpersonal
  skill、namespace付きcommand、nestedなagent、`permissions`と`hooks`を運ぶ`settings.json`、output
  style、除外される`plugins/`・`projects/`・`keybindings.json`・`themes/`のstate —
  そしてadmission、recognition、detail
  route、exclusionを`tests/contract/inspection-rules.test.ts`、`tests/contract/vendor-behaviors.test.ts`、`tests/e2e/global-claude-admission.spec.ts`でend
  to endに証明する。
- [X] T1139 [US4] 出荷済みのCodex Global memberをinstruction fallbackからcontract化された集合へ広げる:
  `codex.global.config`、`codex.global.settings`、`codex.global.hooks.inline`、`codex.global.hooks`、`codex.global.agent`、`codex.global.rules`、`codex.global.prompts`を`src/shared/registries/codex/rules.ts`と`src/server/inspection/rules/codex.ts`の`CODEX_GLOBAL_RULES`へ追加し、idとrelationはその横に置く。config
  3つ組はRepositoryの3つ組とまったく同じく1回readされる1つのcandidateであり、userの`rules/*.rules`はRepository
  ruleと同じく`permissions` recognitionである。`codex.excluded.user-runtime`をmemoriesとinstalled plugin
  copyへ縮める。`tests/fixtures/global-homes/build-fixtures.ts`のCodex homeを、`[mcp_servers]`とinline
  `[hooks]` tableとsettings
  keyを運ぶ現実的な`config.toml`、standaloneな`hooks.json`、`agents/*.toml`、`rules/*.rules`、deprecatedな`prompts/*.md`、除外される`memories/`と`plugins/`のstateで、READMEが要求するnear
  missとともに拡張し、admission、recognition、detail
  route、exclusionを`tests/contract/inspection-rules.test.ts`、`tests/contract/vendor-behaviors.test.ts`、`tests/e2e/global-codex-admission.spec.ts`でend
  to endに証明する。
- [X] T1140 [US4] 広がったmemberが到達できるようになったすべてのsurfaceへSource qualifierを通す:
  `get-mcp-carrier-detail`、`get-hook-carrier-detail`、`get-permission-policy-detail`、`get-plugin-carrier-detail`、`get-plugin-file-detail`が改訂後contract（contracts/http-api.md）どおりpathとともにSourceを取るようにし、skill・MCP・prompt-and-command・plugin・agent・hookの各comparison
  surfaceへ、instruction comparisonが運ぶのと同じ`compare`先頭のaddress — `/<kind>/compare/<family>`とside別Source
  query parameter（contracts/http-api.md § Host requirements #5） — を与える。これによりpairは1つのSource
  familyの内側に留まり、1つのfamilyのconsent済み2 homeどうしはなお比較できる。inventoryが既に描画するfamily grouping — Source
  familyごとに1 block、familyが複数のSourceを持つ場合は各fileがそのディレクトリを名乗る —
  をmemberがpublishするようになった全kindについて保ち、`src/server/session/session.ts`、`src/server/host/devframe-app.ts`、`src/app/session/api-client.ts`、`src/app/session/view-state.ts`、comparisonのcomposable/page、kindごとのrow
  componentで実装し、kind別comparisonのe2e specで証明する。 *(amended 2026-08-28: row identityの半分はPhase 98で実装済み —
  Copilotと共有agent homeのruleが公開するkindのすべてのrow member（skill definition、MCP/hook declaration、agent
  definition、plugin carrier、settings
  row）が`sourceId`を公開し、一覧はそれで解決・filter・linkする。それらのkindで2つのSourceが初めて1つのpathを持ちうるのがそのphaseであり、path単独の解決を止めるべき場所だからである（T1001）。ここに残るのはcarrier・policy・plugin
  detail関数へのSource parameter、comparisonの両側のSource、およびfamily-groupingの表示である。)* *(amended 2026-08-28:
  すべてのkindのcomparisonは自身の`compare` segmentの下にSource familyを従え、familyを跨ぐpairを持たない — 各family
  blockが自身のentryを持ち、そのfamilyのmemberどうしを組み、各blockがmemberを1つずつしか持たないrowはentryを持たない。repositoryとconsent済みhomeは別の種類の場所であり、instruction
  blockが既に運んでいた決定である。)*

### テストを先に

- [X] T991 [P] [US4] contract化されたmember selector集合とone fixed-four transactionに関するintegrated boundary
  testを`tests/integration/global-boundaries.test.ts`へ追加する。Admitted root 0件ならnew
  `scanRequestId`/job/Source/generationを割り当てず、全carried Source/controlとprior
  snapshotを保持する。1〜4件ならmemberごとに別々に識別されるone-tool/one-root Sourceをone shared request IDかつexactly one
  completeまたはpartial generationで同時にpublishし、missingまたは読めないmember rootをabsent/failedとして記録し、admitted
  root内のfileに閉じたoutcomeのfile単位diagnosticだけをそのpartial generationへ寄与可能とし、observableなper-tool
  commitを一切行わない。各escaped boundaryを保持したraw contextからone-wayで導出し、raw filesystem
  operand、各Source内でraw-path semanticsとdistinct provenanceを保持し、preview/display
  labelをauthorityへreverseせず、excluded-surface
  readを0件とし、全fileに閉じないfailureでsubset全体をabortし、Repository/prior Sourcesを保持する *(2026-08-27修正: Global
  scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T992 [US4] 正確に81個のrule ID（Global前の49-ID gate *(2026-08-01 修正: フェーズ 6 は skill-metadata
  derivation を出荷しない)* に3 vendor `*.excluded.user-runtime`
  record、`shared.excluded.managed-remote-state`、28 Global static read-authorizing ruleを加えたもの）、exact
  exclusion ownership、reciprocity、内包Hook/MCP candidate addition 0件、existing-source evidence
  backlinkを証明するfinal Global registry
  contractを`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`へ追加する
  *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T993 [P] [US4] 全admitted member Sourceのone atomic batch publication、one shared request
  ID/authority/working set/resultとexactly one Global generation、stable
  `Source.sourceId`、one-root/member invariant、保持raw contextからのone-way
  boundary、Globalに限定されたinvalidationとuntouched Repository stateを伴うcarried-Source semantic
  preservation、fileに閉じたfile単位diagnosticによるdeterministic partial member outcomeとmissingまたは読めないmember
  rootのabsent/failed記録、per-tool commitなし、one ordinary terminal errorかつsubset/stale
  overlayなしのwhole-batch fileに閉じないfailure、exact `retryableTools` projectionとoperation-local
  validation対accepted pending-state lifecycle、progress、conflictに関するcoordinator
  testを`tests/unit/session/coordinator.test.ts`に追加する *(2026-08-27修正: fixed-four — 共有agent
  homeがmemberに加わる（FR-045）。)*
- [X] T994 [P] [US4] One successful initial/retry batchがindependentなGlobal sequenceのexactly one
  generationをcommitし、全admitted Sourcesを同時にpublishし、process-lifetime Source IDとcarried Global
  semantic inventory/authored contentを保持し、stale Global FileDetail/comparison/Monaco
  stateをinvalidateしてRepository generationとviewを不変に保ち、provisional context/pending
  admissionを漏らさないことを証明するlifecycle
  testを`tests/integration/session-lifecycle.test.ts`に追加する。どのpollもintermediate per-tool
  commitを観測できないことも証明する *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*
- [X] T995 [P] [US4] Globalのliteral credential、environment reference、process
  sentinel、executable-looking inert payload、binaryと`utf-8-replaced` file、注入throw/rejection、mutation
  observationに関するfailing exact-display API/integration
  testを`tests/contract/http-api-files.test.ts`と`tests/integration/global-literal-display.test.ts`へ追加する。Readable
  textはsubstitutionなしにexactで、binaryはdiagnostic-onlyであり、全fileに閉じないfailureはdomain
  classification/retry/resultなしに伝播してwhole shared
  batchをabortし、subset/generationをcommitせず、initial/retry stale
  overlayのない失敗したrequestのordinaryなpre-またはaccepted-job errorとしてのみ報告され、prior stateとfilesystem
  observationを保持することを証明する
- [X] T996 [P] [US4] 記録済みlocal Global fixture rootとinstrument済みproduct
  socket/HTTP(S)/DNS/SMB/MCP/URI/image surfaceを使うfailing zero-activation security
  testを追加する。Exactな2つのFR-022 authorized internal loopback classを別々に分類・検証し、それ以外の全surfaceについてdynamic
  evaluation、command/hook execution、browser-helper launch、禁止対象のdirect product-issued outbound/MCP
  request、environment substitution、mutation-capable filesystem
  callが0件であることを証明する。削除済みsurfaceが再出現しないことを`tests/security/global-zero-activation.test.ts`で証明する。 *(2026-08-06 修正:
  `tests/integration/source-condition-facts.test.ts`は存在しない。condition
  factをprojectするものが無いため（T091）、この証明はzero-activation suiteだけが所有する。)*
  このsuite自身のgateを同じ変更で復活させる:
  `./vitest.config.ts`の`security` project、`./package.json`の`test:security`
  script、`./.github/workflows/ci.yml`のCI
  job、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`のgate行とそのdirectoryを名指すcommand。suiteが空の間はいずれも削除してある。まだ存在しないsuiteは宣言できないからである:
  空のprojectはrunをそのままfailさせ、それを通す許可を与えれば、誰も書いていない検証について成功を報告することになる。Integration/securityの期待結果bulletは削除しておらずそのまま残る。このsuiteがそれで扱われていないことを報告する場合にだけ拡張する。復元するcommand行は、§
  Automated quality gatesの一覧にあるものと§ Inspect without activationにあるものである。
- [X] T997 [US4] Selector-free fixed-four enablement、`active-no-job`、one shared batch
  requestに関するbrowser acceptanceを`tests/e2e/global-enable.spec.ts`へ追加する。別々に識別されるadmitted Sourcesがone
  generation後に同時に現れ、escaped inert boundaryがpreviewおよびSource-relative
  pathと区別され、filter、Diagnostic、replacement characterを含むexact readable literal、diagnostic-only
  binary、activation/substitution/analysis/verdictなし、Fact isolation、detail reuse、cross-Source
  comparisonを扱うことを検証する。予期しないbatch failureではone ordinaryなbatch failure
  errorだけを表示し、subset/generationまたは`StaleSourceFailure`をpublishせず、prior Repository/Global
  stateとstable Source IDを保持する *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*

### 実装

- [X] T998 [US4] Real T951/T968/T982/T1137 Codex/Claude/Copilot/共有agent home portを4つのone-root
  `GlobalToolControl` recordとoperation-local contextとしてbindしてfixed-four post-consent
  admissionを完成させる。全memberのinitial evaluation、non-pending unpublished admittedとsame-preview rejected
  controlを含みpublished、pending、lexical new-preview-required controlを除外するserver-derived exact
  `retryableTools` retry、deterministic rejected partition、および全admitted context/IDのexactly one
  `GlobalBatchScan`へのone atomic transferを`src/server/host/global-consent.ts`へ実装する。残存するinjected test
  outcomeまたはunbound production portを禁止し、independent per-tool jobまたはnew/provisional pre-commit
  Sourceを作らず、carried existing Sourcesをvisibleに保ち、transfer前の全fileに閉じないfailureを伝播する *(2026-08-27修正:
  Global scopeはinstruction fileから、4つのmember root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T999 [US4] すべてのGlobal behavior、正確に28 Global static candidate rule、既存のexact exclusion、strategy
  reference、改訂後contractが生む evidence backlink — 同じgateで数え直してfreezeする — 、正確な81-rule total *(2026-08-01
  修正: skill metadataを導出するruleが無い（フェーズ 6）)*
  を`src/shared/registries/vendor-behaviors.ts`、`src/shared/registries/inspection-rules.ts`、`src/shared/registries/runtime-composition.ts`、対象registry
  recordの`evidence` citationで完成させる *(2026-08-27修正: Global scopeはinstruction fileから、4つのmember
  root配下の文書化済みuserカスタマイズfile全体へ広がった —
  FR-015からFR-018およびFR-045。このtaskのmember集合、selector集合、件数は改訂後のvendor contractに従う。)*
- [X] T1000 [US4] 全admitted member rootをone request/publication authority/working setでconsumeするone
  integrated `GlobalBatchScan`を`src/server/inspection/scan.ts`へ実装する。各memberのselector/root/Source
  identityをisolateし、exact Codex fallbackとraw-path ruleを適用し、fileに閉じたfile単位diagnosticからdeterministic
  completeまたはpartial member resultをassembleし、missingまたは読めないmember
  rootはabsent/failedとして記録する。Coordinatorがwhole batchをacceptするまでnew/provisional member
  result/Sourceをpublishせず、carried existing Sourcesをvisibleに保つ。Fileに閉じないmember
  failureは変更なく伝播させ全siblingをabandonする *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*
- [X] T1001 [US4] Single batchがcomplete traversal後にcommittableなcompleteまたはpartial
  resultを持つ場合だけ、全admitted member Global Sourceを同時にatomic
  publishする処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する。そのpartial
  publicationではfileに閉じたfile単位diagnosticを許容し、missingまたは読めないmember
  rootはcommitせずabsent/failedとして記録する。各boundaryをadmitted raw contextからone-wayで構築し、internal
  authorityをDTO/log外に保ち、prior Global semantic contentと全Global Source IDを保持し、independentなGlobal
  sequenceのexactly one generationをcommitし、Global detail/comparison/editor
  stateだけをinvalidateしてRepository generationとviewを不変に保ち、participating deterministic
  failureだけをclearする。Zero-admitted operationはnew `scanRequestId`/job/Source/generationを割り当てず全carried
  Source/controlとprior snapshotを保持し、fileに閉じないfailureまたは他のnoncommittable batch
  outcomeはsubset/generationをcommitせずprior graph/retry
  controlを保持し、initial/retryで`StaleSourceFailure`を作らない同じ変更で`SourceDto`をdiscriminated
  unionにする。現在`kind`と`tool`は独立したfieldであり、toolを持つRepository Sourceも、toolを持たないGlobal
  Sourceも型検査を通る。2つ目のSource
  kindが構築可能になるのはこのtaskであり、成立しない組み合わせを型が許さなくなるべき地点もここである。同じ変更で`get-file-detail`をfileの完全なidentity —
  SourceとSource-relative Path（FR-030） — で解決し、RPC parameterとそのcontract（contracts/http-api.md §
  get-file-detail）へSource
  qualifierを追加する。Repositoryも保持するpathを第2のSourceが保持できるようになるのはこのtaskであり、path単独の解決が終わるべき地点もここである。kindごとのinventoryも同じであり、instruction行はfile
  1つ、skill definitionもfile
  1つを名指し、どちらもSource相対Pathだけをkeyにしているため、各行の`sourceId`を公開し、serverのprojectionをSourceとPathで集約する —
  さもなければ同じpathを持つ2つのSourceが、どちらのSourceも持たないfileを主張する1行に統合される。 *(2026-08-17修正: detail RPCとclient
  routeではqualifierの所有が決まっている一方、行identityはどのtaskも所有していないことがレビューで判明したため、ここでkindごとのinventory行を明記した。)*
  *(2026-08-27修正: Source qualifierは実装済みである。`get-file-detail`は組をobject 1つとして受け取り、pathで指す各detail
  routeは`/<kind>/<source>/<path>`、instruction
  comparisonは`/instructions/compare/<family>`となって各sideが自身のSourceを名乗り、kindごとのinventory行はそれぞれ`sourceId`を公開する。同じpathを2つのSourceが初めて保持するのはPhase
  96のCodex Global memberであり、path単独の解決が終わるべき地点もそこであった。ここに残るのはatomicなbatch
  publicationと`SourceDto`のunion化である。)* *(2026-08-27修正: publishするのはmember Global Sourceであり、共有agent
  homeを含む（FR-045）。)*
- [X] T1002 [US4] Global-enable function responseをexact fixed-four accepted/rejected
  partition、nonempty batchのone shared request IDと`queued`、empty
  subsetのnullと`active-no-job`、conflict、retry state、ordinaryなpre-/post-acceptance failure
  errorについて完成させる。全admitted-member Source publicationをone atomic batch commit後のlater session
  pollへ委ね、carried existing Sourcesを保持する処理を`src/server/host/devframe-app.ts`に実装する *(2026-08-27修正:
  fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*
- [X] T1003 [US4] Sourceのfilter — 選択されたrepositoryと、consent済みの各homeをそれぞれ1つのoptionとして — をtool
  filterの隣に実装し、Source軸はfileがどこから来たかを、tool軸はどの製品が認識したかを述べるようにする。この選択はSource
  selectorとしてinventoryのURLに載せられる。launchごとのSource IDでは載せられない。加えて、enabled
  Sourceごとのescape済みでinertな`SourceBoundary.displayRoot`/`origin`をconsent-preview
  displayとSource-relative item pathから区別してrenderしlocatorにしないone-root summary、そしてfileを完全なidentity —
  SourceとSource-relative Path（FR-030） — で指すdetail/comparison navigation — Source qualifierをdetail
  route、comparison routeのpair、clientの`get-file-detail`呼び出し、そしてinventory viewの行keyへ通し、同一pathのGlobal
  fileがRepository fileに隠されないようにする — を、Global
  commit後の動作として`src/app/composables/filters.ts`、`src/app/session/view-state.ts`、`src/app/pages/index.vue`、およびdetail/comparison
  route componentに実装する *(2026-08-27修正: Source filter、one-root summary、detail/comparison
  navigationは実装済みである。残るのはClaudeとCopilotのGlobal Sourceであり、それぞれのportをbindするphaseと共に到着する。Source軸はSource
  1つごとの選択肢ではなくfamilyである。tool別のSource選択肢は隣のtool
  filterが既に答えていることを問い直すものであり、またこの選択はURLに載るためである。各instructions行と各instruction
  detailは、同じ語彙で自身のSourceを述べる。ただしsessionが複数のSourceを保持する場合だけである。行は1つのSourceの1つのrangeであり、同じpathの2行は他の点では画面上で同一になる一方、通常のsessionはSourceを1つしか持たずその行を必要としないためである。Source
  filterも同じ条件で描画する。familyが1つなら答えが1つしかない問いになるためである。)*
- [X] T1004 [US4] One shared batch request/progressに結び付くfixed-four confirmationとper-member
  outcome/retry control、focus recovery、`active-no-job`、ordinaryなwhole-batch failure
  error、simultaneous separate-Source outcome
  presentationを`src/app/pages/global-consent.vue`と`src/app/components/consent/GlobalSourceControls.vue`で完成させ、自動更新statusにはT071のpause/resumeとon-demand-refresh
  contractを再利用する *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*
- [X] T1005 [US4] 英語のfixed-four/single-batch、one-root separate
  Source、accepted/rejected、`active-no-job`、whole-batch failure、carried existing
  Sourcesをvisibleに保つretry、source/tool-filter、detail/comparison、shared-progress messageをそれらを描画するVue
  componentに追加する *(2026-08-27修正: fixed-four — 共有agent homeがmemberに加わる（FR-045）。)*

---

## フェーズ 100: Global の再スキャンと回復

**目的**: 明示的な Global 再スキャン、FIFO 直列化、atomic carried-Source generation construction、致命的な試行後の回復を追加する。

**独立テスト**: Repository と Global の作業をキューに入れ、partialおよび致命的な Global の試行を開始し、デキュー時の世代、プロセスの存続期間中に安定する Repository と Global の `Source.sourceId` 値、commit する Global sequence の view だけの invalidation、environment-owned capacity 下の atomic publication、重複競合、保持された同意/境界/以前のグラフ、明示的な再試行の成功を検証する。

**目に見えるチェックポイント**: ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。

### テストを先に

- [X] T1006 [US4] Serialized cross-source FIFO、dequeue-time generation、admission/progress/final
  status/commitにわたるone `scanRequestId`、duplicate conflict、fatal retention、per-job counterのfailing
  coordinator testを追加する。全fileに閉じないfailureはdomain catch/cause
  classificationなしに変更なく伝播し、item/recognition/derived result/Diagnostic/result
  body/generationを作らずabortし、prior snapshotを保持し、accepted explicit rescanはsame request IDのretained
  ordinary errorだけでterminalになることを`tests/unit/session/coordinator.test.ts`で証明する
- [X] T1007 [US4] carried-Source graph構築、lifecycle/control state、serializeされたstate遷移、in-flight
  filesystem workのcleanupのcoordinator testを拡張する。disable/shutdown/supersession後のpublication-authority
  revocation (pending filesystem workはcleanup-only扱い)、late discard、以後のsource
  I/Oなし、応答性のあるAPI、hard-cancellation assertionなしも`tests/unit/session/coordinator.test.ts`でカバーする
- [X] T1008 [P] [US4] Strict `sourceId`、`ScanAdmission { scanRequestId, source }`、same-ID
  waiting/active/final status/successful generation、one identified Global Source、unknown/removed
  Source、disable-pending/duplicate conflict、older stateをcompletionとしてrejectするGlobal-rescan function
  failing contract（session
  API契約、contracts/http-api.md）を追加する。Pre-acceptanceのfileに閉じないfailureはrequestの実際のerrorで失敗しjobを作らず、accepted
  rescanのfileに閉じないfailureは同じrequest IDのretained errorだけを公開しattempt result/generationを作らず、stale prior
  snapshotとSource stale referenceを持つこと、retry/stale IDを`tests/contract/http-api-global.test.ts`で扱う
- [X] T1009 [P] [US4] 有効化の完了、キューに入った Repository/Global スキャン、partial
  publication、致命的な失敗時の保持、明示的な再試行、変更されない同意/境界について、並行性テストを
  `tests/integration/global-concurrency.test.ts` に追加する
- [X] T1010 [P] [US4] 全admitted Sourceを同時にpublishしてGlobal sequenceをexactly onceだけ進めるsuccessful
  initial/retry batchと、対象Sourceだけをreplaceし他をすべてcarryする後続のsuccessful explicit single-Source Global
  rescanを区別するlifecycle testを`tests/integration/session-lifecycle.test.ts`へ追加する。どちらも全Global Source
  IDとcarried semantic inventory/authored contentを保持し、old Global FileDetail/comparison/Monaco
  stateをinvalidateし、Repository generationとviewは不変に保つ。Explicit rescanだけが対象Sourceのstale
  referenceをclearし、all-rejected enable/retryはgenerationをcommitせずcommitted stateを変更しないことを証明する
- [X] T1011 [US4] Global 再スキャン、待機中/アクティブの進捗、重複防止、partial
  diagnostic、致命的な失敗の再試行、以前の結果の保持について、ブラウザ受け入れテストを `tests/e2e/global-rescan.spec.ts` に追加する

### 実装

- [X] T1012 [US4] 識別済みのmember Global Source 1つに対するFIFO rescanを実装する。CompleteまたはpartialのGlobal
  sequenceだけのcommitでは、すべてのGlobal Source IDを保持し、rescanned Sourceのstale failureだけをclearし、sibling
  failureを保持して、古いGlobal FileDetail/comparison stateを無効化し、Repository
  stateには触れない。対象は`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`とする
- [X] T1013 [US4] Environment-owned capacityによるserialized carried-source generation
  constructionとper-job
  counterを実装する。fileに閉じたfailureはFR-028に基づきfile単位Diagnosticへ変換し、それ以外のfailureはsession/scan domain
  codeでcause classification、retry、item/recognition/derived result/body/generation化せず変更なしに伝播させてprior
  snapshotを保持し、lifecycle変換はtrigger-owning boundaryに委ねる。Disable/shutdown/supersessionではpublication
  authorityをrevokeしlate
  workを1回discard/releaseする処理を`src/server/session/session.ts`と`src/server/session/scan-generation.ts`へ実装する
- [X] T1014 [US4] One opaque `sourceId`のstrictなGlobal-rescan session-API functionを実装し、request
  IDをadmission/progress/status/commitで保持し、disable/duplicate
  conflictをenforceし、fileに閉じないfailureは通常どおり報告する:
  accept前はrequestの実際のerrorで失敗しjobを作らず、accept後は`failScan(scanRequestId, message)`によるsame-ID retained
  errorとしattempt result/generationなし/stale prior snapshotとする。Retry/stale Source
  responseを`src/server/host/devframe-app.ts`で保証する
- [X] T1015 [US4] Global 再スキャンのロード、重複抑止、古い状態からの回復、致命的な失敗の再試行、進捗更新を
  `src/app/components/consent/GlobalSourceControls.vue` と `src/app/session/view-state.ts` に実装する
- [X] T1016 [US4] 英語の Global 再スキャン、キュー、publicな`partial`（partialのみ）、失敗時の保持、再試行メッセージをそれらを描画する Vue
  component に追加する

---

## フェーズ 101: Global 無効化バリアと解体

**目的**: Recover可能なpriority zero-I/O disable barrier、full client-data purge/fence、および正確な`remove-active-state`とoperation-local `cleanup-only` outcomeを追加する。

**独立テスト**: Disable request前にbrowserをpurgeし、Repository/enable/Global work中にdisableしてfailure後にrepeat/join/retryする。Epoch/fence response gate、control-only recovery、失敗したrequestのerrorとclose未確認時のrestart、confirmed cleanup、Global generation sequence全体をdiscardしてRepository sequenceとそのIDに触れない`remove-active-state`、committed stateを変更せず未公開initial enableだけに許される`cleanup-only`、accept前failure/true no-op後のimmediate fresh-snapshot recoveryを検証する。

**目に見えるチェックポイント**: Disableはbrowserの全inspection contentを即時削除し、fence中はrecovery controlだけを表示し、confirmed terminal success後にfresh Repository-only snapshotを復元する。

### テストを先に

- [X] T1017 [US4] First non-no-op disable
  acceptanceがatomicに`commitKind`を固定・保持し、`globalContentEpoch`をincrementし、non-null
  `globalDisableInProgress`をinstallし、authorityをrevokeしてdata fenceを有効にするfailing coordinator
  testを追加する。Public Global consent/control/Sourceがあれば`remove-active-state`でGlobal generation
  sequence全体とそのSourceをdiscardし、Repository sequenceとそのgeneration/IDには触れない。未公開operation-local initial
  enableだけなら`cleanup-only`でcommitted stateを変更しない。True no-opには、member Global Source/graph、active
  consent、retained admitted root context、running/queued Global scan/enable work、retained disable
  failureがすべて存在しないという完全な条件が必要であり、無関係なRepository
  workは妨げにならないことを証明する。Join、失敗したrequestのerrorを保持するfailed barrier/retry lineage、exact resource
  reference、および同じ`operationId`、`scanRequestId`、trigger owner、requested Source、queue
  orderを保持してexisting commandを`waiting`へ戻し、新しいscan admissionもinterim
  successも作らない、success後だけのRepository requeue exactly
  onceを扱い、rollback/rebase禁止を`tests/unit/session/coordinator.test.ts`で証明する
- [X] T1018 [P] [US4] Strictなargument-free Global-disable
  function、完全なtrue-no-op条件とmutationlessなsuccess result、captured epochがcurrentのままかつcurrent
  fenceがnullの場合だけinspection-data successを許可するfinal response gate、fence中session routeのsole
  `GlobalFenceRecoverySnapshot`、他の全inspection-data/generation mutation
  routeのfixedな`global-disable-pending` conflict、失敗したrequestのerrorを保持するjoin/retry/failed
  response、exact terminal buffer—`remove-active-state`後はGlobal sequenceがdiscardされRepository
  generationが不変のRepository-only snapshot、`cleanup-only`後はunchanged committed state—のfailing
  contractを`tests/contract/http-api-global.test.ts`と`tests/contract/http-api-session.test.ts`へ追加する。
- [X] T1019 [P] [US4] Interrupted Repository/enable/Global work、queued
  cancellation、acceptance対atomic disposition interleaving、joined disable、同じcleanup
  lineage/epoch/commit kindを使うretained failure/retry、terminal
  success後に同じID/owner/Source/orderのcommandを新しいadmissionまたはinterim
  successなしで`waiting`へ正確に1回requeueすること、true no-op、pre-acceptance failureを検証する。Post-acceptance
  failureでfenceが再開せずstale captured-epoch
  responseがpublishされないことを`tests/integration/global-concurrency.test.ts`で証明する
- [X] T1020 [P] [US4] disableがenumeration/readを0件行い、期待cancellation Diagnosticを0件発行し、影響を受けた全in-flight
  filesystem
  operationを正確に1回drainまたは破棄し、影響を受けたresourceのclose後にのみ完了することをboundary計測で証明する。cleanupが確認できない場合のfallbackはrestartであり、推測によるclosureはないことを`tests/integration/global-boundaries.test.ts`で証明する
- [X] T1021 [P] [US4] Browserがdisable送信前とgreater epoch/non-null fence render前にfull
  purgeし、session/inventory/Source/file/Diagnostic/relationship/authored/detail/comparison/Monaco/filterをすべて削除するlifecycle
  testを追加する。Fence中は`GlobalFenceRecoverySnapshot`だけ、`remove-active-state`後はGlobal
  sequenceがdiscardされRepository generation/IDが不変のfresh Repository-only
  snapshot、`cleanup-only`後はunchanged committed snapshot、accept前failure/no-op後はimmediate full
  snapshotとする。Late resultなし、confirmed registry cleanupだけのresource
  releaseを`tests/integration/session-lifecycle.test.ts`で証明する
- [X] T1022 [US4] Preview/enable/rescan/disable、pre-request purge、epoch/fence observation
  purge、exact control-only failed/retry/join/restart recovery、purged content非復元、enable/disable
  interleaving、focus、fresh terminal snapshotのbrowser acceptanceとGlobal-consent targetを追加する。Global
  sequenceをdiscardするpublic-state `remove-active-state`、committed
  stateを変更しないunpublished-initial-enable `cleanup-only`、accept前/no-op immediate
  recoveryを`tests/e2e/global-disable.spec.ts`と`tests/e2e/global-consent.spec.ts`で扱う。同じ変更で`specs/001-inspect-agent-customizations/quickstart.md`と`specs/001-inspect-agent-customizations/quickstart.ja.md`の`pnpm exec playwright test tests/e2e/global-consent.spec.ts`の行を復活させる。fileが存在しない間は削除してある。

### 実装

- [X] T1023 [US4] Serialized priority zero-I/O barrierを実装する。First non-no-op
  acceptanceで`remove-active-state`/`cleanup-only`を固定し、command/content epochをincrement、fence
  install、authority revoke、Global work cancelを行い、running Repository workをterminal
  success後だけ正確に1回requeueするため保持する。そのexisting commandのexactな`operationId`、`scanRequestId`、trigger
  owner、requested Source、queue orderを保持して`waiting`へ戻し、新しいscan admissionまたはinterim successを作らず、exact
  operation/error/cleanup lineageをfailure/join/retryで維持する。Coordinator ownership下で、member Global
  Source/graph、active consent、retained admitted root context、running/queued Global scan/enable
  work、retained disable failureがすべて存在しないという完全なtrue-no-op条件を評価し、無関係なRepository workは許容する。True
  no-op/accept前failureはI/Oもjob作成も行わずgeneration、epoch、fenceを変更せず、accept後failureは全dataをfenceしたままにする処理を`src/server/session/session.ts`へ実装する
- [X] T1024 [US4] 影響を受けたin-flight filesystem workをresourceごとに1回のclose attemptでdrainまたは破棄するdisable
  cleanupを実装する。double
  closeもhard-cancellation主張もなし。cleanupが確認できないときはfenceを維持しrestartをfallbackとして提示する。1回のatomic terminal
  commitで、`remove-active-state`ではGlobal generation sequence全体とそのSourceをatomicにdiscardしてRepository
  sequenceとそのgeneration/IDに触れず、`cleanup-only`では未公開のoperation-local stateだけを除去してcommitted
  stateを変更せず、その後fenceをclearすることを`src/server/session/session.ts`、`src/server/session/stale-failures.ts`、`src/server/session/scan-generation.ts`で実装する
- [X] T1025 [US4] Strictなargument-free Global-disable functionをrequest-owning
  boundaryへ実装し、完全なtrue-no-op条件だけにmutationlessなsuccessを返す。Accept前response、first acceptance/join/retry
  progress、drain/close failure時にprocess/fenceを維持したまま失敗したrequestの実際のerrorを報告すること、unconfirmed
  cleanupのrestart guidance、exact terminal commit-kind
  responseを`src/server/host/devframe-app.ts`で保証する
- [X] T1026 [US4] Pre-request full client-data purge、disable submit/loading、fenced
  `GlobalFenceRecoverySnapshot` render、failed retry/join/restart
  control、no-op/accept前failureのimmediate full refetch、terminal fresh-snapshot adoption、focus
  restorationを`src/app/pages/global-consent.vue`、`src/app/components/consent/GlobalSourceControls.vue`、`src/app/session/view-state.ts`へ実装する
- [X] T1027 [US4] Shared full-purge/response gateを実装する。Disable前またはgreater epoch/non-null
  fence観測時に全session/Global/Repository DTO/rendered/derived stateをclearし、stale/late
  responseを拒否する。Fence中はexact control/error recovery stateだけを保持し、fence clear後はpurged
  contentを再構築せずauthoritative full
  snapshotをfetchする処理を`src/app/composables/filters.ts`、`src/app/session/view-state.ts`、`src/app/composables/skill-comparison.ts`、`src/app/composables/monaco.ts`、およびその時点で存在する各
  kind 固有の比較 composableへ実装するフェーズ3が意図的に先送りした2つのclient
  surfaceをここで戻す。それらを必要とするfenceがこのフェーズにしか存在しないためである: disableを実行したpageがbarrier acceptanceからterminal
  successまで表示するcontrol-onlyなrecovery view、およびfenceがnullのときだけ許可される明示的なResume inspection
  actionである。フェーズ3は2026-07-24にliveness
  probeとともに両者を削除した——到達できるtriggerが無いUIを出荷しないためである（T049）。`src/app/session/view-state.ts`の`SessionView`をフェーズ3の`booting | inspection | ended`から拡張し、同じくemitterが無いとして削除した`global-disable-request`
  pre-send
  reasonを`src/app/session/client-data.ts`の`PurgeReason`へ戻す。eslint/config-inspectorが`invalidate`をpushするのと同じ形でfenceをdevframe
  channel越しにpushし、他タブがpollingなしにdisableを観測できるようにすることを検討する。ただしauthorityはあくまでserverであり、pushはrefetchのtriggerであってstateとして採用するものではない。
  *(2026-08-15 修正: purge-gate の対象名を改めた — 比較は kind 固有であり、既存の composable は `skill-comparison.ts`、後続
  kind は各自のものを追加する（spec.md § Clarifications Session 2026-08-14）。)*
- [X] T1028 [US4] Pre-request purge、epoch/fence control-only recovery、failed retry/join/restart、true
  no-op/accept前failure refetch、Global sequenceをdiscardする`remove-active-state`のRepository-only
  state、operation-local `cleanup-only`のunchanged committed stateについて英語messageをそれらを描画するVue
  componentへ追加する

---

## フェーズ 102: ドキュメント、エビデンス、依存関係のレビュー

**目的**: 二言語の運用ガイダンス、公式ソースのエビデンス、適合データ、レビュー済みの依存関係判断を完成させる。

**独立テスト**: environment-owned capacity の explicit opt-in official-source workflowを実行し、すべての drift/dependency 判断をレビューし、同期された英語/日本語ガイダンスと適合レコードを検証する。

**目に見えるチェックポイント**: メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。

### ドキュメント

- [X] T1029 意味的に等価な利用者向けガイダンスを`./README.md`/`./README.ja.md`に起草する。対象:
  この製品が何を一覧するのか、および一覧に載ることは読み込まれることではないこと、検証済みlaunch行とCLIが受け付ける全option（正確な`--root`を含む）、11種類のcustomizationと比較surface（`docs/images/inventory.png`と`docs/images/comparison.png`で図示する）、`--inspect-personal-setup`が確認するfixed-four
  Global consent、file単位の`file-unreadable`/`file-content-binary`/`recognition-parse-failed`
  diagnosticと、失敗した明示rescanがstale prior snapshotを保持するsource-scoped `root-unreadable`
  failure、fileを開く先、Nodeとbrowserのbaseline、`pnpm run start:fixture`による開発者向けループと、それがタスク一覧からこのリポジトリが同梱するSpec
  Kitのスキルを通して始まることと、変更の種類ごとの入り口、そしてこの製品が、作業をAIコーディングエージェントに任せる実験であり、Spec
  Kitを通して進めていること。protocol、threat-model、evidence-manifest、accessibilityの各contractは、それらを所有する仕様artifactに留め、ここでは繰り返さない。`tests/documentation/cross-artifact.test.ts`が2言語間の乖離を拒否することを要求する。
  *(2026-08-06 修正:
  admissionは読み取り認可のrecordに留まり、vendorが文書化していることは維持管理contractに残るため、どのsurfaceもcondition、applicability、order、runtime
  state、provenance、documentation statusをprojectしない（FR-009。T091/T1068/T1042）。)* *(2026-08-30 修正:
  この文書は読者がツールを起動して読むために開くものなので、その読者に必要なことを載せる。ここで誰も参照しないcontractは、それを所有するartifactが既に述べている。)*
- [X] T1030 SC-001/SC-006 study-evidence harnessを4つのordered acceptance blockで実装する。(1) Paired inputs
  and normative contract:
  `tests/usability/sc001-sc006-study-kit.md`と`tests/usability/sc001-sc006-study-kit.ja.md`、`tests/usability/sc001-sc006-study-inputs/`配下のtwenty-member
  bilingual
  bundle（participant member 16件と、どのdistributionにも渡さないscoring member 4件）、`tests/usability/sc001-sc006-study-inputs.json`、`tests/usability/sc001-sc006-study-inputs.sha256`を作成し、semantically
  equivalentかつcandidate-independentに保ち、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`と`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`をexact
  protocol
  ownerとし、そのentityを`specs/001-inspect-agent-customizations/data-model.md`および`specs/001-inspect-agent-customizations/data-model.ja.md`と整合させる。`StudyBrowserAttemptBinding`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`subjectId`,`inspectorProcessId`,`state`）、`StudyBrowserRequestCandidate`（`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）、`StudyServerCorrelationClaim`（`schemaVersion`,`studyRunId`,`correlationId`,`subjectId`,`inspectorProcessId`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`originClass`,`effectClass`,`sameInspectorHost`,`productAttributable`,`prohibited`）のexact
  root orderを維持する。Raw-value banをcapture/evidence IPC crossingまたはretained/log/output/digest
  boundaryにscopeし、Basic credential、exact Fetch Metadata/Origin/Referer header、raw
  `X-Inspector-Study-Correlation`のrequired ephemeral loopback-wire
  receipt/processingだけを許可して直ちにdiscardする。Strictly decoded canonical 43-character safe IDだけがsafe
  IPCをcrossし、`correlationId`としてretainされ、canonical safe-payload/downstream evidence-digest
  chainへ入れる。`pnpm run study:evidence:inputs -- materialize`はsupervisorだけをlaunchする。そのexisting
  supervisor上の`study:evidence:capture -- start`がlong-lived internal descendant/process exact
  8件をlaunchしてstream 3件をopenする。Start時にsupervisorだけがfresh subject token exact 20件をordered
  setとして生成・所有し、次の各`StudyBrowserAttemptBinding`へnext
  tokenだけをdistributeし、study-harnessはscheduleだけを行う。Exact runtime-only
  `StudySupervisorRuntimeBootstrap`
  rootを`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`の順で定義する。Authenticated
  supervisor `ready`のchild-to-parent sequence `0`後、materializerはparent-to-child sequence
  `0`でexact-once `runtime-bootstrap`を送る。Supervisorはlexical/canonical/identity root
  tupleをvalidateしてexact endpointをbindし、accepted `acknowledgement`を返し、その後だけroot
  mutationを許可する。Materializerはtransfer/frame copyを直ちにwipeし、successful role-specific lifecycle
  closeではedgeだけをdetachしてsupervisorをliveに保ち、validation/bind/ACK
  failureはabortする。Environmentとargvをauthorityにしない。Raw path、endpoint、token、exact
  `StudySupervisorRuntimeBootstrap` frame/HMAC processingだけをruntime-bootstrap sensitive privacy
  exceptionとし、capture/evidence、retained data、log、output、digest inputへ入れない。Exact runtime-only
  `StudyBrowserProxyRuntimeBinding`
  rootを`schemaVersion`,`studyRunId`,`browserProxyAuthority`の順で定義する。Supervisorがadapter/watchdog
  registration 6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted
  `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer
  bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated
  memoryとliveなattempt-local DevTools request/browser
  contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence
  routeを禁止する。Supervisor/brokerがfresh
  `StudyBrowserAttemptBinding`を生成し、stateを`prepared | open | terminalizing | closed`とする。Distinct
  fresh 32-byte/43-character `browserProxyMarkerSecret`とexact runtime-only
  `StudyBrowserProxyMarkerBinding` root
  `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`を生成し、stateを`prepared | active | destroyed`とする。`attempt-binding`はstudy-harness/study-browser-adapterだけへ、authenticated
  `proxy-marker-install`はsupervisorからstudy-browser-adapterへdirectに送る。`browserAttemptId`をこれらのruntime
  memory、authenticated frame、browser candidateだけに保ち、browser
  process/context/profile/configuration/credential/request/application/evidenceへ入れない。Installはpreparedにとどめる。Prepared-binding
  both ACK後かつparticipant `npx`前にadapterだけがcertified isolated
  profileをlaunchし、`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でexact
  bootstrapを完了する。Bodyless `407 Proxy Authentication Required`のonly
  headerは順に`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、canonical Basic
  retryはexact 1件、bodyless `204 No Content`のonly
  headerは`Connection: close`とし、DNS/application/forwarding/candidate/correlation/evidence
  effectを0件にする。Authenticated bootstrap ACKはmarker copyだけをatomically activeへmoveし、attempt
  bindingはlater product readiness/open-snapshot dual ACKまでpreparedに保つ。Healthy external
  browser/environment/bootstrap failureはactiveを経ずmarker copyをdestroyしてadapter-sourced
  `equipment-failure`を生成し、internal adapter/proxy/controller/CDP/authentication/IPC/child
  faultはsynthesisせずinvalidateする。以後各study-browser requestにcanonical Basic credential exact
  1件を要求し、close/abort/crash/child exit/authentication failureでattempt/marker/secret/install
  frame/browser copyをwipeする。Exact runtime-only `StudyParticipantNavigationGrant` root
  `schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`state`と`state: armed | consumed | destroyed`を定義する。Product-probe
  readiness後、sole expected initial navigation直前にsupervisorがfresh armed grantを作り、proxy
  injection前にpage/browser codeへ公開せずstudy-browser-adapterへ送る。Fetch Metadataをhuman
  attestationではなくconsistencyだけとする。Valid secret + current armed grant + exact
  navigate/document/?1/missing-Origin/none-or-same-origin + exact authorized-static
  targetだけをparticipantとしgrant correlation IDを使ってonce consumeする。Current grantなし、nonexact
  target、user-activated page-script navigation、またはprior grant consumption後のfresh participant-shaped
  HTTP observationはvalid-secret unknownとし、open binding IDsとfresh proxy-generated correlation
  ID、`productAttributable: true`、`prohibited: true`を使うautomatic-critical browser-only
  rowとしてDNS/socket/body/response
  exposure前にblockし、grantをconsumeせずrunもinvalidateしない。Replayed/duplicate/stale authenticated IPC
  candidate、simultaneous grant-consumption attempt、authenticated attempt/correlation/target
  mismatchはforward 0件、run invalid、state destroyとする。Bundled-SPAはvalid secret + missing
  `Sec-Fetch-User` +
  [exact-issued `Origin` OR (missing `Origin` AND exact-issued `Referer`)]だけとし、extension/browser-only、その他valid-secret
  unknown/prohibited、missing/invalid-secret unrelated actor rowを保つ。Six headerをindependently
  compare/discardし、server claimはregistered outer/open-binding
  equalityを持つparticipant/SPAだけに許可する。Allowed edgeごとにordinary unidirectional anonymous inherited pipe
  exact 2本、`parent-to-child`と`child-to-parent`をcreateし、IPC
  materialをenvironment、argv、file、socket、named endpoint、control endpointへ置かない。Parent-to-child
  pipeは32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`の順のexact 96 binary
  byteで始まり、EOFを挟まず同じopen pipeでLF-framed parent-to-child messageへ切り替わる。Childはframe parsing前にexact 96
  byteをconsumeし、byte 96以後をすべてframe dataとして扱い、byte 96前のEOF/closeをrejectする。Child-to-parent
  pipeはauthenticated `ready` sequence `0`で始める。`ready` payloadのexact
  rootは`schemaVersion`,`bootstrapNonce`,`componentRunId`で、`schemaVersion: 1`、canonical bootstrap
  nonce、canonical component
  IDを持ち、parentはseed/nonceをdestroyする前にこれをauthenticate/consumeする。全`acknowledgement` payloadのexact
  rootは`schemaVersion`,`acknowledgedSequence`,`result`、`result: accepted`とし、全`lifecycle`
  payloadのexact rootは`schemaVersion`,`event`、`event: close | abort | child-exit`とする。Exact
  `StudyStreamControl`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`の順で定義し、immutable
  binding fieldは全commandでstart value
  exactをrepeatし、`command: start | checkpoint | anchor-handoff | stop`とする。Exact
  `StudyStreamControlResult`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`の順で定義する。Start
  resultはcapture-startとfirst heartbeat後だけvalidで、そのfirst-heartbeat
  positionをreportする。Supervisorは各stream fileをcreate/validateしてdedicated append-only handle exact
  1件をopenし、fixed child-visible descriptor `5`でsupervisor -> adapter ->
  watchdogへhandleだけを渡す。Descriptor `3`はparent-to-child pipe read end、descriptor `4`はchild-to-parent
  pipe write endのままとし、descriptor `5`をthird IPC pipe/channelにしない。Descriptor `5`はadapter/watchdog
  modeだけに存在し、他roleではabsent/closedとする。Path、cwd、environment、argvをauthorityにしない。Adapterはfile
  accessなしのtransfer-onlyでwatchdog registration後にcopyをcloseし、supervisorはupstream registration
  ACK後にcopyをcloseし、watchdogがidentity/authorityをvalidateしてsole
  holder/writerになる。Adapterは`stream-control`とreverse
  `stream-control-result`をbyte-identicalにrelayし、start/checkpoint/anchor-handoff/stopはexact semantic
  resultをwaitし、stopはresult -> handle close -> clean exitの順とする。Wrong
  handle/slot/role/root/order/result、adapter access、extra holder/writer、early close、lifecycle
  failureは全copyをcloseしてrunをinvalidateする。Exact runtime-only `StudyProcessLifecycleAttestation`
  rootを`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`の順で定義する。`processRole`はnamed
  adapter 3件、named watchdog
  3件、`reviewer-one`,`reviewer-two`のいずれか、adapter/watchdogの`streamRole`はexact
  stream、reviewerの`streamRole`は`not-applicable`、`event`は`registered | exited`、registrationは`exitCode: null`,`signal: null`、accepted
  exitは`exitCode: 0`,`signal: null`とする。Sibling edgeなしのexact
  matrixを`materializer -> supervisor`（`runtime-bootstrap | lifecycle` /
  `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle`
  /
  `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle`
  /
  `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle`
  /
  `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle`
  /
  `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle`
  /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`each *-adapter -> matching *-watchdog`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle`
  /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）に閉じる。Moderator、adapter、watchdog
  edgeの`acknowledgement`はimmediately preceding valid
  `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome`
  acknowledgementはmatching
  watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Start
  completion前にadapter 3件/watchdog 3件すべてのregistrationを要求する。Supervisorは各adapter registrationをdirect
  acceptしてlater clean OS exitをobserveし、各adapterはwatchdog registrationをacceptしてlater watchdog clean
  OS exitをobserveしたattestationをrelayし、scoring-moderatorは各reviewer registrationとmoderator-observed
  clean exitをrelayする。Witnessはdirect adapter exit 3件、adapter-attested watchdog exit 3件、directly
  observed orchestrator exit
  2件、`ephemeralReviewerProcessExitCount === reviewVoteCount`を証明し、nonclean/missing/duplicate/mismatch/wrong-parent/reordered
  lifecycle attestationはrun invalidとする。Exact `StudyBrowserBrokerDecision`
  rootを`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`の順で定義し、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。`candidate-forward`だけをsole
  candidate acceptance/forwarding authorizationとし、separate candidate
  acknowledgementを存在させない。Run/attempt/subject/process IDとcause
  `product-exit | browser-exit | equipment-failure | premature-probe-close`を持つexact
  attempt-terminalization/terminalization-decision payload、およびcanonical
  grant/workflow-outcome/review-case rootを定義する。
  Study-harnessはscheduleだけを行い、scoring-moderatorだけがexact `StudyWorkflowOutcomeSubmission` root
  `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`をconstructしてsupervisorへsubmitし、supervisorがvalidateしてstudy-browser-adapterへforwardし、adapterは同じorderのcanonical
  workflow recordだけを`safe-payload`としてwatchdogへrelayする。Harness submissionとdirect/bypass producer
  routeをrejectする。Terminal causeはexact source—`product-exit`はsupervisorのdirect
  observation、`browser-exit`はactual browser process/context
  exitをobserveしたstudy-browser-adapter、`equipment-failure`はadapter/proxy/IPCがhealthyなexternal
  browser/bootstrap/environment failureについてsole designated equipment
  observerである同adapter、`premature-probe-close`はsupervisor direct—だけからacceptしfirst valid
  causeを採用する。Internal adapter/proxy/marker/authentication/IPC/implementation/child faultはequipment
  outcomeをsynthesizeせずrunをinvalidateする。Wrong-source/concurrent/late/duplicate
  causeをrejectし、supervisorはbyte-identical `terminalization-decision`をharness/browser
  adapterへfanoutする。Adapterはbrowser/grant/marker/reservation/candidate/pending
  stateをdestroyするがterminalizing bindingを維持し、harnessはmoderator/supervisor-owned synthesisとfinal
  closed dual ACKまでterminalizing bindingとfixed remaining-workflow scheduleを維持する。 Byte-identical
  `attempt-binding` snapshotをreplicateする。Preparedはharness/browser adapterの両方へ送りmarker
  install/launch前にboth ACK、readiness時はfresh process IDを持つopenを両方へ送りreadiness
  return/grant/candidate前にboth ACK、terminalization decisionで両copyをterminalizingへmoveする。Outcome
  4件後はclosedを両方へ送りadapterがattempt-local cleanup後にACKし、both closed ACK後だけcopy destroy/next
  attemptを許可する。Normal completionはauthenticated probe close、accepted outcome 4件、pending join
  0件の後だけsame closed snapshot/ACK pathを使う。Skip/reorder/stale/duplicate/mismatch/partial ACKをrejectする。
  Candidate body execution前にexact `StudyPreReadinessBootstrapProof` root
  `schemaVersion`,`productId`,`bootstrapEventId`とcommand `register-pre-readiness-probe` request
  `studyRunId`,`subjectId`,`bootstrapProof`を要求し、private `preReadinessProbeId`を返す。Runtime-only
  `StudyPreReadinessProductBuffer` root
  `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate
  `open | readiness-bound | terminalization-bound | destroyed`を定義する。`buffer-pre-readiness-product-event`
  requestは`preReadinessProbeId`,`destinationRole`,`payload`、destinationは`product-instrumentation`だけ、responseは`null`とし、後の`register-product-probe`
  requestは`studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles`とする。Readiness後の`submit-product-event`
  exact outer rootは`inspectorProcessId`,`destinationRole`,`payload`とし、outer processだけがregistered
  probeをauthenticateし、`StudyServerCorrelationClaim` payload内のsubject/process IDはopen bindingとそのouter
  processの双方へindependently exact一致させる。Exact `StudyPreReadinessProductObservationDraft`をcanonical
  observation root order
  `schemaVersion`,`eventCode`,`eventId`,`correlationId`,`subjectId`,`inspectorProcessId`,`observationClass`,`actorClass`,`authorityClass`,`requestClass`,`targetClass`,`methodClass`,`originClass`,`effectClass`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`,`sameInspectorHost`,`productAttributable`,`prohibited`で定義する。Process/workflow/automatic/review
  fieldは全て`not-applicable`、evidence/claimではなく、buffer IDはprivate runtime stateだけに保つ。Pre-readiness
  observationごとにsafe draftをclassifyしてraw inputを直ちにdiscardし、effect前にsubmitし、ACK後だけeffect
  continuationを許可する。Supervisor orderでhash/route/evidence化せずstoreし、全ACKed
  draftをpreserveする。Readinessではbufferを`open -> readiness-bound`へmoveしfresh `inspectorProcessId`とfresh
  evidence event/correlation IDでcanonical payloadを再構築し、orderどおりadapter ACK releaseし、empty
  bufferもdestroyし、attempt-open dual ACK完了後にresponseする。Pre-readiness
  exitでは`open -> terminalization-bound`へmoveし`inspectorProcessId: not-applicable`とfresh evidence
  IDでpayloadを再構築し、ACK releaseしてempty bufferもterminalization/synthesis前にdestroyし、abrupt exit後もACKed
  eventをpreserveする。Bootstrap point未到達exitはnormal pre-readiness terminalizationとしてreviewed failure
  4件を作る。Bootstrap point到達後はregistration ACKまでcandidate body/effect 0件とし、identity/registration/ACK
  failureはsynthesisせずinvalidateする。Non-target/helper processはlocal discardしregister/evidence
  0件とし、identity/register/ACK/replay/raw-bearing/wrong-destination
  faultはrunをinvalidateする。Openかつexact-matchingな`StudyCurrentSubjectScoringContext`が存在する間だけ、nonworkflow
  prohibited observationをsame run/subject/process/workflowへvalidate/tagし、required downstream
  watchdog ACKまたはACKsを得てからaccepted observationとしてcommitし、supervisor
  mirrorをupdateし、moderatorのauthenticated updated-`scoring-context` ACKを得て、その後だけrelease/outcome
  submissionを許可する。Pre-readinessまたはcontext-free observationはprocess/workflow/link
  fieldを`not-applicable`に保ち、contextをupdateせず、later linkも禁止する。Source-supplied workflow
  tagをignore/rejectしてlate/cross-context/reordered updateをfailする。Eligible grant-backed
  requestはadapter reserve without state change -> grantをarmedのままsupervisor validation/pending store
  -> sole acceptance + atomic canonical grant consumeであるexact one-use `candidate-forward` -> adapter
  copy validation/consume/forwardの順とし、generic candidate acknowledgementを設けない。Simultaneous
  consumption attemptまたはreplay/duplicate/stale/mismatched authenticated IPC candidateはforward 0件、run
  invalid、state destroyとし、fresh post-consumption HTTP observationはblocked unknown/prohibited
  non-invalidating branchを使う。Participant candidate correlationはsupervisor-generated grant ID
  exact、他browser requestはfresh proxy-generated
  IDとし、different/mismatchをrejectする。Subject/workflowごとにdistinct human reviewer
  pairをattempt前assignし、human identity、collector process/component identity、case-local
  assignmentのcross-case reuse（literal slot labelとsanitized/drained/reset済みterminal
  surfaceの再利用を除く）を禁止する。Reviewer identity/pair
  mappingを禁止する境界はrepository/work-root、runtime、capture、evidence、bundle、log、output、digestだけとし、それらの外側のseparate
  access-controlled administrative roster/assignment recordでunique-pair auditを可能にし、retention
  policyに従ってdestroyする。First workflow前failureでもlive observationを維持し、failureだけがpaired
  collectorをspawnし、recording/replayを禁止する。Exact frame
  rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`からexact
  +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`をderiveし、exact
  `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`をderiveする。MACをexact
  `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated
  compact JSON wire frameへexactly one LFを加える。State change前にconstant-time verifyし、first authenticated
  child-ready後に`channelSeed`と`bootstrapNonce`をdestroyし、direction-specific keyはedge
  lifetimeだけ保持する。Wrong edge/role/type/channel/direction/order/tag、partial/trailing
  frame、skip、duplicate、replay、late/post-close input、unexpected child exitをrejectし、control
  commandを追加せずkey/frame/sequence stateをwipeする。Brokerをtimer-freeかつatomicにする。State
  changeなしでreserveし、grantをarmedのままauthenticated candidateをpendingとしてvalidate/storeし、sole
  acceptance + atomic canonical grant consumeであるexact one-use
  `candidate-forward`を送り、adapterがcopyをvalidate/consumeしてforwardし、generic candidate
  acknowledgementを設けない。Server claimをauthenticateしてstored candidateへjoinし、safe browser/server
  pairをexactly once releaseしてからsingle success/completion ACKを送り、application handlingはそのpost-release
  ACKを待つ。Late claim、unmatched transaction/request、IPC EOF/error/close、probe/attempt
  end、stop、abort、crash、child exit、その他lifecycle boundaryはtransactionをcloseし、partial
  pairをreleaseせずcandidate、claim、binding、marker、pending
  stateをwipeし、clock、deadline、timerを設けない。Runtime-only `StudyCurrentSubjectScoringContext`をexact root
  order
  `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`で定義する。Automatic
  IDはinitial
  `not-applicable`、terminalizationは`none | product-exit | browser-exit | equipment-failure`、stateは`open | submitted | destroyed`とする。そのcontextがopenの間だけ、downstream
  ACK後にacceptedとなったexact same run/subject/process/workflowのfirst nonworkflow prohibited
  observationへcontext `workflowClass`を持たせ、automatic correlation `not-applicable` -> that first
  matching ID onceとterminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining
  contextはそのcauseでinitializeして他mutation/reversal/replacementをrejectする。Pre-readiness/context-free
  observationはworkflow/link `not-applicable`を維持しlater contextをmutateしない。Supervisor mirror
  update、authenticated updated-context ACK、moderator submissionの順を要求する。Exact
  `StudyWorkflowOutcomeSubmission` root
  `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`を定義して`automaticIssueCorrelationId`を`outcomeClass`直後に置き、canonical
  workflow payloadも同じorderとする。Objectively successful workflowはcontext candidateがあってもautomatic
  ID/disposition/voteを常に`not-applicable`にする。Failed workflowでeligibleなalready accepted
  same-run/subject/process/workflow candidateがある場合だけそのexact
  IDと`automatic-critical`をsubmitしてreviewを0件にし、candidateなしfailureだけが`not-applicable`をsubmitしてreviewを完了する。Missing/mismatch/reuseをrejectし、accepted
  automatic observationはoutcomeと独立にexact 1回countする。Exact runtime-only `StudySafetyReviewCase`
  rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`の順で定義し、`caseClass: nonautomatic-workflow-failure`とする。Exact
  `StudySafetyReviewVote`
  rootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`の順で定義し、`reviewerSlot: reviewer-one | reviewer-two`とする。Valid
  automatic linkのない全failureで、moderatorはraw response/rubricをcall-localだけに持ち、either vote前にfresh
  isolated reviewer-one/twoへbyte-identical safe caseを送り、両reviewerはout-of-band human-viewing
  boundaryでsame live workflowをobserveし、first
  voteをhiddenにする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとする。Issue
  identityは`automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`だけからderiveし、`suspectedWorkflowBlockerCount`は全reviewer
  disposition、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、critical totalはderived ID
  deduplicationとする。Attempt/reviewer assignment後（pre-readiness/accepted workflow
  0件かつ`inspectorProcessId: not-applicable`を含む）のproduct/browser/equipment
  failureまたはpremature-probe-closeでは、supervisorがaccepted
  outcomeをfreezeしてjoinをcloseし、bindingをprepared/open -> terminalizingへmoveしてcontext
  routingをcoordinateし、scoring-moderatorだけがharnessのunchanged fixed remaining-workflow
  scheduleに従うexact failure + required
  reviewを4件までconstructする。Harnessはoutcomeをsynthesizeせず、harnessのbinding/scheduleとadapterのterminalizing
  bindingはall four routed outcomeとclosed dual ACK完了まで保持する。Accepted 0件ではfailure 4件すべてにpreassigned
  live-observing pairのvote exact
  2件を要求する。Prematureは`terminalizationClass: equipment-failure`へmapする。Harness/orchestrator/adapter/watchdog/reviewer
  failureはrunをinvalidateする。Attemptはsequentialでparticipant 01–19がall four後close、participant
  20はcheckpoint前discoveryまででsole possible open attempt、continuationはremaining 3件だけとする。Capture
  startはattempt bootstrap前のrun-levelだけとする。Materialization時のprocess treeはmaterializer ->
  supervisorだけとし、existing supervisorがstart時にlong-lived orchestrator 2件とadapter
  3件をlaunchし、各adapterがmatching watchdog、scoring-moderatorがreviewed failureごとのfresh reviewer
  pairをlaunchする。Start completion前にadapter/watchdog 6件すべてのaccepted `StudyProcessLifecycleAttestation`
  registrationを要求し、その後exact `processes` 6件とexact ordered
  `orchestrators`（`study-harness`、`scoring-moderator`）を返す。Stopはlive reviewer 0件/long-lived internal
  descendant/process clean exit 8件を要求し、witness provenanceはsupervisor-observed adapter exit
  3件、adapter-attested watchdog exit 3件、supervisor-observed orchestrator exit 2件、moderator-attested
  reviewer exitと`ephemeralReviewerProcessExitCount === reviewVoteCount`とする。Exact 80/threshold
  independence、record kind、handoff/witness/seal pair、retained set、runtime/reviewer residue
  0件をpreserveする。(2) Failing tests:
  `tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`で、全positive、boundary、spoof、replay、lifecycle、raw-sentinel、real-child
  IPC、actual-browser、residue、reviewer
  truth-table、aggregate-equation、chain、handoff、witness、seal、retained-layout caseを先にencodeする。(3)
  Scripts: その後、self-contained
  static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`でclosed
  bundle/distributionとprotocolを実装し、five-input phase matrix、stable authenticated control
  session、exact finalize witness/teardown、single-file import/entry closure、`./package.json`のexact
  `study:evidence:inputs`、`study:evidence:capture`、`study:evidence:verify` entryを維持する。(4) Focused
  pass: このtaskでcandidate tarball digestをcompute/freezeせず、targeted suite 3件をすべてpassさせる。
  加えて、次のbrowser-observation、outcome、ordering
  invariantを定義・実装する。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined accepted
  stateとnonforwarded blocked stateを区別するvalidated stored candidateから再構成し、supervisorがcanonical
  serialization前にcurrent workflowをtagしたsafe nonworkflow browser
  observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated
  ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome`
  bypassを全てrejectする。 Blocked browser-only observationではwatchdog
  ACKを`browser-only-released`より前に要求し、joined browser/server
  pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload
  ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application
  handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively
  successful
  workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review
  process/voteを0件にする。Candidateがあるfailed workflowはそのexact
  IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed
  workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic
  eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently
  deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic
  eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow
  outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer
  destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness
  response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact
  orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context
  `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task
  startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。
  Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd
  `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated
  `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject
  environmentだけを用い、raw candidate/proxy valueを含めず、command
  bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced
  `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe
  close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。
  `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin
  slotを固定し、materializer/inputsはcandidate
  byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen
  production graphから同じnetwork/scripts-disabled
  slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned
  `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw
  tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate
  PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。
  External-equipment fd `7`はexact runtime-only external record
  `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact
  canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw
  `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord
  exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow
  failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing
  input、replay、late/cross-context input、noncanonical valueをrejectし、empty
  response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd
  `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum
  `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use
  collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot
  outputを禁止する。Human identity、collector `componentRunId`/process identity、case
  assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal
  surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe
  external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect
  launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly
  one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools
  requestとattempt
  contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context
  exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter
  `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child
  faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment
  descendant/context terminationとfresh-profile cleanupをverifyするまでnext
  attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly
  routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory ->
  one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter
  registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact
  existing path-free
  `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd
  `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical
  `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor
  `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK ->
  `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK
  -> all six registrations -> `browser-proxy-binding` ACK ->
  startとする。Browser-adapterとmatching-watchdog registrationはproxy
  binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。
  Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor
  validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use
  `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric
  candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored
  candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。
  Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count ->
  mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。
  `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId`
  matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact
  1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result
  pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。
  `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent
  non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker
  requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。
  Pre-readiness
  terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote`
  recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome`
  acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal
  descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
  *(2026-08-10改訂: request観測の真理表はdevframe transport — connection-discovery metadataを含むpackaged
  serving、RPC channel upgrade、Inspector側で観測するdispatch済みRPC関数 —
  を分類し、観測tupleはcapability分類を持たない。unauthenticatedなloopback transportはrequest
  capabilityを定義しないため。usability-study-evidence.ja.md § Closed privacy-safe payload。)* *(2026-08-30
  修正: study kit、bundle、manifest、companion
  digestが最初に生まれるのはこのtaskなので、ブロック(1)はそれらを作成する。先行するtaskはどれもそれらを所有せず、T1061はこのtaskの成果物をreviewする。)*

### 公式エビデンスと依存関係のレビュー

- [X] T1031 Exact host、redirect rejection、explicit network opt-in、complete environment-supported
  content retrieval、partial update も自動の cause ベース判断も生じさせない network/runtime の
  throw/rejection、non-mutating drift reporting、および配信された`<h*>`
  element、あるいはそれを配信しないclient-renderedなページではちょうど1回現れるtable-of-contents anchor
  slugのいずれかによる引用heading解決に関する、失敗する official-source checker contract を
  `tests/contract/official-source-drift.test.ts` に追加する
- [X] T1032 明示的に network を使う official-source checker を実装し、standalone maintainer-only の
  `check:official-sources` script をすべての default build/start/test/CI chain の外で登録して実行し、自動的な behavior
  change を行わず reviewed source set と classified drift を
  `scripts/check-official-sources.ts`、`./package.json`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md`
  に記録する。同じ変更で、commandが担うようになったcheckとreviewerの判断に残るcheckを`AGENTS.md`と`AGENTS.ja.md`に記述し、そこに書かれた手動の`curl`
  workflowがcommandと重複しないようにして、scriptに判断できないもの —
  headingが消えたのはページが移動したためかどうか、および引用sectionが維持しているparaphraseを今もestablishするかどうか — だけを残す
- [X] T1033
  `specs/001-inspect-agent-customizations/contracts/official-sources.md`、`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md`では、明示的にacceptedされたevidence
  location、unique section heading、anchor、review metadata、またはsemanticに変化しないsource
  driftだけを解消する。Presentation Allowlistのrowまたは記録済み6 freeze
  digestをauthor/updateせず、許可されたcorrection後はT004のexact six-file extraction、constant-time digest
  comparison、row-ID、bilingual semantic-parity verificationを再実行する
- [X] T1034 [P]
  `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`と`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`のfreeze済みGitHub
  Copilot英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix
  headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1
  rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row
  IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [X] T1035 [P]
  `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`と`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`のfreeze済みClaude
  Code英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix
  headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1
  rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row
  IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [X] T1036 [P]
  `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`と`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`のfreeze済みOpenAI
  Codex英日Presentation Allowlist pairをverifyだけする。各々についてcase-foldされたlevel-2 suffix
  headingがuniqueであることを要求し、直後のnon-table lineをskipし、最初のcontiguous byte-preserved `|` tableだけを最終rowを含め1
  rowにつき1 LFかつ前後/後続lineなしでhashし、exact 2 recorded SHA-256 valueをconstant-time compareし、exact row
  IDとsemantic parityを別に検証する。このtaskではrow、identifier、applicability rule、digestをeditしない
- [X] T1037 T1033–T1036後、T1037によるPhase-102 evidence-review-driven production-registry
  correction前、かつ後続のold task ID前に、semantic driftとsix-digest freeze gateをenforceする。T004のexact
  extraction algorithmで全6 table inputを再計算し、missing/duplicate/empty/malformed
  heading/tableまたはrecorded digestのabsence/mismatchをすべてrejectし、equal-length digest byteをconstant
  timeでcompareし、exact IDと英日semantic parityを別に要求する。Reviewed
  evidence-location、anchor、review-metadata、またはsemanticに変化しないcorrectionだけを`src/shared/registries/vendor-behaviors.ts`、`src/shared/registries/inspection-rules.ts`、`src/shared/registries/runtime-composition.ts`、対象registry
  recordの`evidence` citationへflowさせられる。Freeze mismatch、またはnormative behavior、rule、strategy、allowlist
  membership/source-form applicability、registry shape、conformance expectationを変えるaccepted
  changeはbilingual task setをsupersededとし、mutation前に停止し、bilingual
  spec/research/plan/quickstart/contracts/tasksを同期し、`/speckit-plan`後に`/speckit-tasks`を要求する
- [X] T1038 影響を受けた適合レコードだけを
  `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`
  で再生成する
- [X] T1039 レビュー済みのエビデンスの結論を同期し、チェッカーを再実行し、最終結果を
  `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md`
  に記録する
- [X] T1040 `pnpm outdated`、license、notice、compatible-version rationale、public-contract
  effect、migration
  impactをreviewし、全accept/reject判断を`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する。初回baselineでは記録済みのno-impact判定とその事実を確認する。Acceptするdependency/public
  contractのbreaking changeごとに、rationale、影響を受けるconsumer/contract/data/workflow、migration手順とsupport
  window、rollback/support
  path、または理由を明記した影響なし判定を記録し、bilingual記録が欠ければこのtaskをblockする。変更をacceptしない場合はbaseline
  unchangedを記録して続行する。1件でもacceptした場合はcurrent
  `specs/001-inspect-agent-customizations/tasks.md`/`specs/001-inspect-agent-customizations/tasks.ja.md`をsupersededと記録し、package/configuration
  editおよび旧task
  IDの後続実行前に停止し、影響を受ける`specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`、`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`、`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`、`specs/001-inspect-agent-customizations/tasks.ja.md`
  artifactを同期して`/speckit-plan`、`/speckit-tasks`の順に再実行し、regenerate済みtask setからだけ変更をapply/verifyする

---

## フェーズ 103: 横断的な検証

**目的**: 最終的な横断ドキュメント、パッケージ、アクセシビリティ、ライフサイクル、Node.js-only の回帰スイートを追加する。

**独立テスト**: 横断スイートを実行し、二言語の契約、クローズドなパッケージ内容、Node.js-only ポリシー、アクセシビリティの振る舞い、ライフサイクルのクリーンアップを検証する。

**目に見えるチェックポイント**: 完成した製品が横断的な自動回帰レイヤーを通過する。

### 横断テストを先に

- [X] T1041 Versioned SC-003/004/005/007 outcome
  manifestを`tests/fixtures/outcomes/manifest.json`、canonical
  digestを`tests/fixtures/outcomes/manifest.sha256`、contractを`tests/contract/outcome-fixture-manifest.test.ts`に作成してfreezeする。1から始まるpositive
  safe-integer `manifestVersion`、unique stable case ID、criterion/required-class
  membership、fixtureまたはdeterministic-builder reference、客観的expected outcome、参照する全fixture
  byteのdigest、nonempty required class、declared nonzero minimum、再現可能なcanonical manifest
  digestを要求する。Table-drivenなprevious/current manifest objectで、version
  incrementなしのdenominator-semantics変更と、影響fixture digestおよびcanonical manifest
  digestの両方を変更しないfixture-byte-only変更をrejectし、VCS、network、reviewer stateを調べずhuman
  reviewを立証しない。`tests/documentation/cross-artifact.test.ts`へ、両quickstart、順序付き独立CI
  job、後続release/final rerunを要求するbilingual plan/task/quickstart declarationを含むrunnable command/stable
  ID、FR-045までの全53 FR/QR/SC trace row *(2026-08-04 修正: trace rowの件数は現在のFR/QR/SC集合に従う。)*、宣言済みtask
  IDすべてのmapping（T001からT1141まで、取り下げたフェーズ39の欠番T436–T439、フェーズ45の欠番T482–T485、フェーズ64の欠番T654–T657、フェーズ67の欠番T675–T678、フェーズ68–75の欠番T679–T750を除く）
  *(2026-08-30 修正: 欠番の範囲に取り下げたmarketplaceフェーズ68–75を含めた。同じgateが再現すべきtask件数は既にそれらを除外していたが、列挙が漏れていた。)*
  *(2026-08-24 修正: 件数と欠番の範囲は現在のtask
  setに従う。取り下げたフェーズ64と67がその欠番を残す。)*を検証し、prefixなしbasenameにownershipを依存するtaskを
  rejectする一方、manifest/member/API/content literalとしてだけ使われるbasenameやslash付きtokenは
  rejectもcountもせず — このrepositoryで何にも解決しないtokenがそれであり、taskが引用する被検査location、package
  名、glob形はそのままcontentとして読む — task IDごとのderived英日exact owned-path set一致を要求するhard bilingual
  cross-artifact gateを追加する *(2026-08-31 修正: fileを所有しないtaskにfileを名指すことは求めない。決着済みの2つの
  policy — user-visible copyはそれを描画するcomponentに書き、evidence citationは独自のmoduleではなくそれが支える
  recordに置く — がtaskに単一の所有fileを残さないため、普遍的な要求は存在しないpathをそれらのtaskに名指させることになる。
  Gateが保つのはbilingualなowned-path parityである。)*。さらに、2つの言語そのものを突き合わせる
  独立したnormative-identifier parity gateを追加し、case-sensitive normative identifier
  setを比較し、known closed-enum groupingだけをnormalizeし、plain textとcode
  spanを同等に扱い、repetitionを無視し、owned-path gateとは独立させ、このgateをhuman semantic
  reviewの代替にしない *(2026-09-01改訂: allowlistもtask別のrequired-token manifestも背後に置かない。
  Task本文はtrace rowが名指す要件を書き直さない — 2,702組のrow/task対のうち2,569組がそうである —
  ため、manifestは2つのtask文書と並ぶ3つ目の手書きの写しになり、双方からズレていく。したがって
  gateが捉えるのは、片方の言語だけが編集された場合であり、それが実際に起こりうるdriftである。
  両方から同時に落ちた参照は、上に述べたhuman semantic reviewが担う。)*。
  T999とT1038がproduction registryと影響conformance recordをmaterialize済みであるため、
  stateを作成せずverifyする。Six Presentation Allowlist digest/ID/parityに加え、exact 52-source/81-rule registry
  *(2026-08-26 修正: 件数は現在のregistryに従う — skill metadataを導出するruleは無く（フェーズ
  6）、内包されたhook宣言はそれぞれ自身のruleである。recognitionはruleが生むものだからである。)*、`vscode.copilot.mcp.workspace-root-release`、reciprocalな`copilot.repo.mcp.vscode-root`
  conflict evidence、推測したVS Code schema field/winner 0件のroot path-only semantics、`--root`/generation
  0、symbolic
  linkをtarget越しに読みcycle-safeなreal-path追跡とfile単位diagnosticを伴う通常traversal、発見された各fileの1回read、independentなSource/attempt/generation
  readを要求する。FR-022についてexactな2つのauthorized internal loopback
  classを別々に分類・constraint検証し、それ以外のsurfaceで禁止対象direct product request 0件とlocal-fixture zero-call
  semanticsを要求する。さらにreplacement decode、runtime error ownership、fixed-four Global、FR-042
  pre-purge/epoch/fence/recovery/error semanticsとpublic-state Global-sequence
  discard対unpublished-operation unchanged committed state、およびinspection-data
  successのunchanged-epoch/null-fence final gate、non-authority/no semantic analysis/capacity
  ceiling、deterministic partial、atomic/late discard/mutation、migration、SC-002、manifest、全55 WCAG
  row、official backlinkを要求する。このpre-release時点ではexisting local/package/CI commandとfuture release-gate
  declarationだけをvalidateし、release workflowを要求しない。そのstructure assertionとgate再実行はT1048、final-tree
  executionはT1062–T1063が所有する。T1041が新規所有するmanifest/test
  fileのfailureはすべてT1041内でcorrect/rerunしてからcompleteする。Owned file外のauthoritative artifact
  concernはcurrent task setをsupersedeし、synchronized replanningとtask
  regenerationを要求してT1062へdeferしない。その明示的T1041 disposition後もunresolvedなconcernだけがT1042およびcurrent
  IDの全後続taskをblockする。このgate自身のcommandを同じ変更で用意する。`tests/documentation/**/*.test.ts`だけをincludeする`documentation`
  projectを`./vitest.config.ts`へ追加し（このprojectは一度も存在していない）、かつて存在し、fileが無い間に削除した`./package.json`の`test:docs`
  script、`./.github/workflows/ci.yml`のCI
  job、`specs/001-inspect-agent-customizations/quickstart.md`/`specs/001-inspect-agent-customizations/quickstart.ja.md`のgate行と期待結果のbulletを復活させる。まだ存在しないsuiteは宣言できないからである:
  空のprojectはrunをそのままfailさせ、それを通す許可を与えれば、誰も書いていない検証について成功を報告することになる。`tests/contract/`配下のfileではなく専用のdirectoryに置く:
  他の全suiteはtestが置かれる場所で分かれており、contract root内のdocumentation testはcontract jobとcoverage
  jobでも実行されてしまう。その場合、2つのprojectが1 fileのための除外を持たない限り、documentation
  jobはそれらがすでに検証したもの以外を何も検証しない。復元するcommand行は、§ Automated quality gatesの一覧にあるものと§ Release package
  verificationにあるものである。 *(2026-08-10改訂: checklistはT1090まで続く。)*
- [X] T1042 [P] T1041通過後、gate前にmaterialize済みのT999 production registryとT1038 conformance
  recordを独立verifyし、exact 52 source record、81 inspection-rule ID *(2026-08-26 修正: 件数は現在のregistryに従う —
  skill metadataを導出するruleは無く（フェーズ 6）、内包されたhook宣言はそれぞれ自身のruleである。recognitionはruleが生むものだからである。)*、39
  strategy、contract定義の12 relationship-only IDと出荷relationship-only rule 0件（registryは1つも出荷しない —
  tests/contract/inspection-rules.test.ts）、contained MCP addition 0件と更新済みfrozen Presentation
  Allowlist/source boundについてfinal testを追加する。`vscode.copilot.mcp.workspace-root-release`
  record、reciprocalな`copilot.repo.mcp.vscode-root` evidence、current-guide/release-note
  conflict、推測したVS Code schema field/winner 0件のpath-only root provenanceを要求する。Production
  registryを変更またはconformance stateをmaterializeせず、behavior/rule/strategyにすでに存在するscalar
  `documentationStatus`とfixed-order duplicate-free
  `lifecycleQualifiers`を検証し、どのDTOもそれらを運ばないことを確認する。これらはmaintenance
  recordなので、捏造`stable`も`documentation-conflict` status aliasもresponseへ到達する経路を持たない。Zero-authority
  Factとsyntactic/literal/typed/catalog/structure-only
  vocabularyを`tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`で証明する。`evidence`
  citationもそこで検証する — citationはこれらのsuiteが既に対象としているrecord上にあるからである
- [X] T1043 [P] 保持されたshebangを持つexactな`bin: dist/cli.mjs` mapping、exactなengine/version
  rejection/README/license schema、2つの必須package entry（`dist/public/index.html`と`dist/cli.mjs`）、CLI
  entry、verification を完了できない場合の import/bind 前の安全な失敗、unlisted-payload rejection に関する packed-tarball
  closed-set test を、customization validity output なしで `tests/package/package-contents.test.ts` と
  `tests/package/verify-package-files.test.ts` に追加する
- [X] T1044 [P] `gunshi`を含む承認済みruntime dependency leaf set、Gunshiのroot-only import
  boundary、`package.json`と`pnpm-lock.yaml` closureからassertするproduction-graph dependency集合に関するpackage
  testを`tests/package/node-only-policy.test.ts`と`tests/package/production-graph.test.ts`で拡張する
  *（2026-08-16 修正: `open`はproduct-ownedなbrowser helperとして承認済みdirect setに加わった（research.md § 3）。）*
  *（superseded 2026-07-23: scripts-disabled/network-disabled installの各run、別個のgenerated-shim
  audit、payload content scan —
  Rust/C/C++/Cargo、Node-API/native/binary/Wasm、`binding.gyp`、prebuild、platform selector、shell
  helper、non-Node shebang、lifecycle/runtime download —
  と、dependency単位のversion/integrity/bundle済みpayload
  digestのassertionはscopeから外した。commit済みlockfileが各resolved versionとintegrity
  hashを既にpinしており、testで再記述してもlockfileを二重化するだけで、install時のenforcementはpackage managerが所有する。plan.md §
  Source Code (repository root) 参照）*
- [X] T1045 [P] Axe、keyboard、forced colors、zoom/reflow、reduced
  motion、focus、安全error、注意書きなしのauthored-value直接表示、ordinary scoped-cleanupの破棄対全central-full-purge
  reset、Global-disable epoch-fence recoveryをbilingual 55-row WCAG matrixへmappingする。Exact `AUTO-*`
  IDを含め、全Applicable automated checkと4 keyboard workflowをpinned
  Chromium/Firefox/WebKitでpassさせるtestを`tests/e2e/accessibility.spec.ts`と`tests/e2e/session-lifecycle.spec.ts`へ追加する
  *(2026-08-30 修正: `AUTO-2.2.2`は2.2.2のNot-applicable根拠 — 自動更新が存在せずpause対象が無い —
  とともに名指しから外れた（contracts/accessibility-acceptance.md）。)*
- [X] T1046 [P] Diagnostic、stale-failure
  error、control/progress、SessionSnapshot、`GlobalFenceRecoverySnapshot`、FileDetail
  envelope、各宣言済みresultがdevframe channelがserializeする1つのcompleteなJSON-serializable
  valueであること、accepted-request stale-error ownership、post-commit delivery
  regressionを追加する。Rescan/disable acceptanceをまたいでdeliveryをpauseし、全inspection-data
  successが`globalContentEpoch`をcaptureしてfinal unchanged-epoch/null-fence
  gate後だけpublishされる一方、fence中のsession routeはcontrol DTOだけを返すこと、purge後にstale
  stateがleakしないこと、fence中sessionはrecovery-only、terminal disable commitがprior
  stateと混在しないことを`tests/integration/session-snapshot-encoding.test.ts`、`tests/contract/http-api-session.test.ts`、`tests/contract/http-api-files.test.ts`で証明する
  *（superseded 2026-07-23: 事前serialize済みimmutable response buffer/exact length
  assertionは削除した。devframeがresponse serializationを所有する）*

---

## フェーズ 104: リリースと成果エビデンス

*2026-09-01改訂: このphaseが構築したsealed-capture study kit — protocol contract、3つの
`scripts/*usability-study*` module、それらのcontract/integration/security suite、3つの
`study:evidence:*` package command、product側のreadiness probe — を削除した。初見の
participant 20名がこのprojectには得られず、それが存在する理由であるmoderated studyは行われ
ないため、SC-001/SC-006は20件の自律agent sessionで測る。評価が読むtask材料は
`tests/usability/sc001-sc006-study-inputs/`配下に残る。*

**目的**: リリースマトリクスを組み立て、測定可能なすべての成功基準、最終ゲート、明示的なrelease Constitution Checkの合否エビデンスを記録する。

**独立テスト**: 1つのclosed setでplatform非依存tarballをbuildし、Node.js 24/26の宣言済みcompatibility contract全体を維持しながら正確な6つのlower-bound Node/OS jobで同一byteをcertifyし、SC-001～SC-008の全denominator/thresholdをfinal candidate/profile/fixture/study digestへbindし、全remediationをapplicable gate/evidenceとcomplete-diff reviewへloopし、principleごとのConstitution Checkを記録してfrozen final treeでcomplete applicable automated matrixをpassする。

**目に見えるチェックポイント**: 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスク、憲章準拠のエビデンスを備え、公開可能な状態になる。

### リリースワークフロー

- [X] T1047 active LTSの`ubuntu-latest` development/build baselineでplatform-independent
  tarballをbuild/verifyし、同一byteをNode.js
  `24.11.0`/`26.0.0`と`ubuntu-latest`/`macos-latest`/`windows-latest`の6 lower-bound certification
  sampleへ配布し、runner-image identifier/actual Node versionを記録して、`^24.11.0 || ^26.0.0`をfull
  compatibility contractとして維持し、lockfileでpinしたproduction-graph integrityをassertするrelease jobを
  `.github/workflows/Release.yml` に追加する *（superseded 2026-07-23: OS別の別個shim
  auditはpackage-gate整理でscopeから外した）* *（amended 2026-08-26: runner labelとdevelopment/build
  Node.jsは、このrepositoryが手で進めるpinではなくplatformが現在出荷しているものを指す、release workflow
  fileは`Release.yml`であり、Changesetsでreleaseする: これらのcertification
  jobはその`select-mode`/`version`/`pack`/`publish` jobに加わり、certifyするtarballは`pack`が生成したものである）*
  *（2026-08-26 修正: certificationはruntime sampleが既に住む場所（ci.yml）でpacked tarballに対して実行し、publishing
  workflowでは実行しない。後者の4 jobはci.ymlが所有するgateを再実行せず、credentialを持つjobはbuildを走らせない）*
- [X] T1048 Failing release-workflow structure
  assertionを最初に`tests/documentation/cross-artifact.test.ts`へ追加し、passするまで`.github/workflows/Release.yml`を拡張する:
  `id-token: write`をpublishするjobだけが持つこと、他のjobはcheckout以上の権限を持たないこと、tarballをpackする前に`pnpm run build`と`pnpm run verify:package`を実行すること、publish
  stepが自前のtreeではなくpack済みartifactをuploadすること。ci.ymlが所有するgateはrelease pathで繰り返さない — 同じcommitに対しpull
  requestが既に実行したsuiteを二度走らせても得るものはない — ため、これらのassertionはcoverageではなくpublishing pathの形を固定する
  *（superseded 2026-07-23: scripts-disabled/network-disabled installとpackage-content-scan
  gateはpackage-gate整理で削除した。lockfile integrity hashがpayload byteをpinする）* *（amended 2026-08-26:
  release
  pathはci.ymlが所有するgateを再実行せず、assertionが固定するのは出荷済み`Release.yml`が既に持つcredential分割とpack-before-publishの順序である）*

### 成果エビデンスと最終ゲート

- [X] T1049 Targeted study-evidence gate
  `pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を実行し、全positive/negative
  caseがpassするまで先へ進まない。Bilingual task parserでexact 1,053 ordered checkbox ID、108 phase、53 trace row
  *(2026-08-01 修正: 現在のtask setに合わせて件数を補正)* *(2026-08-04 修正: trace
  rowの件数は現在のFR/QR/SC集合に従う。)*、English/Japaneseのidentical owned-path set、out-of-line amendment
  mechanismのないself-contained task textを要求する。Exact five-input phase matrix、closed twenty-member
  bilingual input bundleと20 distribution、unchanged work-root/candidate identity、stable authenticated
  control session、final candidate rehash、exact handoff/witness/seal write order、self-contained
  static-`node:` script、real `process.execPath` child role、actual participant `npx` probe
  readiness、browser-helper stripping、prohibited retained binding/path/secret/raw value
  0件をverifyする。Scoped privacy boundaryをpositive/negativeに証明する。Required raw Basic、Fetch
  Metadata/Origin/Referer、correlation-header byteはephemeral loopback-wire
  receipt/processingだけに存在して直ちにdiscardされ、capture/evidence IPCまたはretained/log/output/digest
  boundaryをcrossしてはならない。Strictly decoded canonical 43-character IDだけが`correlationId`としてsafe
  IPC、canonical payload、payload digest、chain、handoff、witness、seal verificationへ残る。Supervisor-owned
  attempt/marker generation、study-browser-adapterへのdirect prepared-only install、actual bootstrap
  success ACKでmarker copyだけをatomic activateし、attemptはlater readiness/open-snapshot dual
  ACKまでpreparedに維持すること、prepared failure destruction、`browserAttemptId`のbrowser/evidence exposure
  0件をexerciseする。Capture startがrun-levelだけで、stream live後の各sequential attempt `npx` probe直前にfresh
  profile/secret/bootstrapがあることを証明する。Certified profileでexact revision/version/distribution/isolated
  surface、bodyless 407のordered only headers
  `Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`、Basic retry 1件、sole header
  `Connection: close`のbodyless 204をverifyし、全deviation/residueをrejectする。Exact
  `StudyParticipantNavigationGrant` root/lifecycleをexerciseし、Fetch Metadata
  aloneがattestationにならないことを証明する。Armed one-use grant + exact participant tuple + exact
  authorized-static targetだけをparticipantとする。Fresh no-grant/nonexact-target/user-activated
  page-script/post-consumption HTTP observationはopen IDs、fresh proxy-generated correlation
  IDを持つblocked valid-secret unknown/product-attributable/prohibited/automatic-critical/browser-only
  rowとしinvalidateしない。Replay/duplicate/stale authenticated IPC candidateとsimultaneous consumption
  attemptはinvalidateする。SPA、extension、missing/invalid-secret、six-header independent
  projection/immediate discard、static/RPC forwarding、server-claim equalityの全negativeを維持する。Real child
  processを使い、closed matrix edgeごとにordinary unidirectional inherited pipe exact
  2本、`parent-to-child`と`child-to-parent`があり、environment/argv/file/socket/named/control endpoint
  transport 0件であることをverifyする。Sibling edgeなしのexact closed
  matrixをexerciseする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` /
  `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle`
  /
  `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle`
  /
  `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle`
  /
  `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle`
  /
  `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle`
  /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter
  -> matching
  watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）
  Testするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting
  supervisor上のstartがlong-lived internal descendant/process 8件とstream
  3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext
  tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap`
  rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor
  `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child
  sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted
  `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful
  closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact
  authenticated bootstrap validation/bind/ACK privacy
  exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact
  runtime-only `StudyBrowserProxyRuntimeBinding`
  rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration
  6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted
  `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer
  bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated
  memoryとliveなattempt-local DevTools request/browser
  contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact
  runtime-only `StudyProcessLifecycleAttestation`
  rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process
  roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream
  role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean
  exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct
  observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit
  3件、moderator-attested reviewer
  registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid
  lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately
  preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome`
  acknowledgementはmatching
  watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact
  `StudyStreamControl`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable
  start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact
  `StudyStreamControlResult`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start
  resultはcapture-start + first
  heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact
  1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c
  read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog
  roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog
  registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole
  holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong
  route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root
  `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered
  probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter
  processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical
  43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root
  `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned
  bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless
  `407 Proxy Authentication Required`を受け、そのonly ordered
  headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry
  1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact
  `StudyBrowserBrokerDecision`
  rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact
  runtime-only `StudyCurrentSubjectScoringContext`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact
  `StudyWorkflowOutcomeSubmission`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact
  runtime-only `StudySafetyReviewCase`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact
  `StudySafetyReviewVote`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact
  `StudyBrowserBrokerDecision`、grant、terminalization、workflow-outcome、review-case payload
  root/enumをmutation-testする。Study-harnessはscheduleだけ、scoring-moderatorだけがexact
  `StudyWorkflowOutcomeSubmission`をconstruct/submitし、supervisor validate/forward、browser adapter
  canonical record、watchdog `safe-payload`とする。Harness/direct/bypass submissionをfailする。Exact
  source—product-exitはsupervisor-observedだけ、browser-exitはactual browser process/context
  exitをobserveしたstudy-browser-adapterだけ、equipment-failureはadapter/proxy/IPCがhealthyなexternal
  browser/bootstrap/environment failureについてdesignated equipment
  observerである同adapterだけ、premature-probe-closeはsupervisorだけ—のfirst-wins/rejectionをtestし、internal
  adapter/proxy/marker/authentication/IPC/implementation/child faultをinvalidateする。Byte-identical
  decision後、adapterはbrowser/grant/marker/reservation/candidate/pendingをcleanupしterminalizing
  bindingを維持し、harnessはmoderator/supervisor-owned synthesisとclosed dual ACKまでterminalizing
  binding/fixed scheduleを維持する。 Byte-identical prepared/open/closed `attempt-binding`
  snapshot、dual-ACK barrier、decision-driven terminalizing copy、adapter
  cleanup-before-closed-ACK、normal closeのprobe close/outcome 4件/join 0件gate、both closed
  ACK後だけdestroy/next、全skip/reorder/stale/duplicate/mismatch/partial-ACK negativeをtestする。 Exact
  `StudyPreReadinessBootstrapProof` root `schemaVersion`,`productId`,`bootstrapEventId`、exact
  `StudyPreReadinessProductBuffer` root
  `schemaVersion`,`studyRunId`,`subjectId`,`preReadinessProbeId`,`state`とstate
  `open | readiness-bound | terminalization-bound | destroyed`、`register-pre-readiness-probe`
  request `studyRunId`,`subjectId`,`bootstrapProof` ->
  `preReadinessProbeId`、`buffer-pre-readiness-product-event` request
  `preReadinessProbeId`,`destinationRole`,`payload` -> `null`、extended `register-product-probe`
  request `studyRunId`,`preReadinessProbeId`,`readinessProof`,`requestedDestinationRoles` ->
  `inspectorProcessId`、exact `StudyPreReadinessProductObservationDraft` canonical root/order、全N/A
  process/workflow/automatic/review field、pre-bind evidence/claim/hash/route 0件、sole
  product-instrumentation destination、private runtime buffer ID、immediate raw
  discard、draft-before-effect/ACK-before-effect-continuation、exact
  open-to-readiness-bound/terminalization-bound transition、readiness fresh-process bind + fresh
  evidence ID + ordered adapter-ACK release + empty-buffer destroy + attempt-open dual
  ACK後response、pre-readiness N/A bind + fresh evidence ID + ordered ACK
  release/destroy後terminalization、abrupt-exit ACKed event preservation、exit-before-bootstrap normal
  four-failure synthesis、bootstrap-reached registration-ACK barrier/candidate body-effect
  0件、non-target/helper
  discard/no-register/no-evidence、全identity/register/ACK/replay/raw/wrong-destination
  failureをtestする。Open exact-matching
  `StudyCurrentSubjectScoringContext`内だけでsame-run/subject/process/workflow validation/tag ->
  downstream watchdog ACK(s) -> accepted observation -> supervisor mirror update -> authenticated
  moderator updated-context ACK -> release/outcomeをtestする。Pre-ready/context-free
  rowはprocess/workflow/link N/A、context mutation 0件、later link 0件とし、source
  workflow、late/cross/reordered/replacement updateをrejectする。Adapter
  reserve-without-state-change/supervisor
  pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forwardをgeneric
  candidate acknowledgementなしでrace-testし、eligible participant candidateはsupervisor grant
  correlation、他fresh HTTP observationはfresh proxy IDとする。Simultaneous
  consumptionまたはreplay/duplicate/stale/mismatched authenticated IPCはforward
  0件でinvalidate/destroyし、fresh no-grant/wrong-target/page-script/post-consumption HTTP
  rowはblockedのままinvalidateしない。Distinct human pairをsubject/workflowごとにattempt前assignしてhuman
  identity、collector process/component identity、case-local assignmentのcross-case reuse（literal slot
  labelとsanitized/drained/reset済みterminal surfaceの再利用を除く）を禁止する。Identity/pair
  mappingはrepository/work-root/runtime/capture/evidence/bundle/log/output/digest boundary外のseparate
  access-controlled administrative roster/assignment recordだけに置いてunique-pair auditとretention-policy
  destructionを要求し、pre-readiness/zero-accepted failureのlive observation、synthesized failure
  4件それぞれのvote 2件、failure-only paired collector、recording/replay 0件をcoverする。Parent-to-child
  pipeがexact 96 binary byteの`channelSeed`/`bootstrapNonce`/`channelId`で始まりEOFなしでLF-framed
  messageへcontinueし、96 byte前のEOF/closeをrejectし、post-96 byteをframe byteとして扱うこと、child-to-parent
  pipeがauthenticated `ready` sequence `0`で始まることを証明する。Exact `ready` payload root
  `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical bootstrap
  nonce/component ID、seed/nonce destruction前のparent authentication/consumption、exact
  `acknowledgement` payload root
  `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root
  `schemaVersion`,`event`と`event: close | abort | child-exit`をverifyする。全listed edge/role/message
  row、exact frame root
  `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、per-direction
  `0` then exact +1、exact
  `K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、exact
  `K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、exact
  MAC preimage
  `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated
  compact JSON wire frame plus exactly one LF、constant-time verification、authenticated
  ready後のseed/nonce destruction、wrong
  edge/role/type/channel/direction/order/tag、partial/trailing、skip/duplicate/replay/late/post-close、early
  EOF、child replacement/exit、wipe caseをexerciseする。Brokerがclock、deadline、timerを持たず、adapter reserve
  without state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use
  `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy
  validation/consume/forward -> claim authenticate/join -> exactly-once pair release -> single
  success/completion ACKをenforceし、application handlingをそのpost-release ACKまでblockすることを証明する。Late
  claim、connection/IPC EOF/error/close、request/transaction end、probe/attempt
  end、stop、abort、crash、child exit、全lifecycle boundaryをrace/fault-testし、partial release
  0件とcandidate/claim/binding/marker/pending complete wipeを要求する。Expanded
  `StudyCurrentSubjectScoringContext` exact root
  `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`をexerciseする。Correlation
  `not-applicable` -> first matching accepted observation once、terminalization `none` -> mapped
  cause onceだけを許可し、post-terminalization remaining contextをmapped
  causeでinitializeし、他mutation/reversal/replacementをrejectする。Context correlationはfailure-link
  candidateだけとし、submission/canonical
  payloadの`outcomeClass`直後に置く。Successはcandidateがあっても常にN/A/no-review、eligible accepted exact
  same-run/subject/process/workflow
  candidateを持つfailureだけがautomatic-critical/no-review、candidate-free failureはexact
  `StudySafetyReviewCase` root
  `schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`と`caseClass: nonautomatic-workflow-failure`を使ってreviewする。他failureではexact
  review-case、moderator call-local raw input、either vote前のfresh isolated reviewer 2件とbyte-identical
  safe case、same live workflowのhuman observation、hidden first vote、acceptance前の両process
  exitを要求する。Dispositionはexact
  `not-applicable | automatic-critical | reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`だけとし、valid
  truth row、derived automatic/reviewer IDだけを許可してmissing/mismatch/reuse、unreviewed failure、vote
  leakage、reviewer reuseをrejectする。Seal fields
  `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutate-testし、全reviewer
  dispositionのsuspected
  count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、confirmed/disagreement
  counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>`
  deduplication、total-count/zero-gate equationを含める。Exact sequential scheduleを証明する。Participant
  01–19は各4件完了後closeし、participant 20 discoveryがSC-001 20件のcheckpointとsole possible open
  attemptを作り、continuationはremaining 3件を完了する。Accepted workflow
  0–4件後のcrashをtestし、product/browser/equipment/premature-probe
  terminalizationではsupervisorがcontextをfreeze/routeし、scoring-moderatorがunchanged harness
  scheduleに従うremaining reviewed outcomeをconstructし、harnessはsynthesizeしない。Harness/adapter
  terminalizing bindingをall four routed outcomeとclosed dual
  ACKまで保持し、prematureをequipment-failureへmapする。Harness/orchestrator/adapter/watchdog/reviewer
  failureはinvalidateし、accepted rowをduplicateしない。Exact capture-script self-reexec mode/process
  tree、start responseのexact `processes` 6件 + exact ordered
  `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived exit
  8件、witnessのstream exit 6件 + orchestrator exit 2件 +
  `ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 80、record kind
  5件、uninterrupted stream、heartbeat boundary、role/effect row、handoff anchor、threshold-failing seal
  completion、既存retained distribution/stream/handoff pair/continuity-witness pair/capture-seal
  pairを維持し、sidecar/final runtime controlを0件にする。その後、frozen install、exact Playwright browser
  install、build、lint、typecheck、unit、complete contract、complete security
  gateを実行し、全resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。
  加えて、次のbrowser-observation、outcome、ordering
  invariantをpositive/negative/race/mutation-testする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined
  accepted stateとnonforwarded blocked stateを区別するvalidated stored
  candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser
  observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated
  ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome`
  bypassを全てrejectする。 Blocked browser-only observationではwatchdog
  ACKを`browser-only-released`より前に要求し、joined browser/server
  pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload
  ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application
  handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively
  successful
  workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review
  process/voteを0件にする。Candidateがあるfailed workflowはそのexact
  IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed
  workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic
  eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently
  deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic
  eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow
  outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer
  destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness
  response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact
  orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context
  `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task
  startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。
  Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd
  `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated
  `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject
  environmentだけを用い、raw candidate/proxy valueを含めず、command
  bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced
  `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe
  close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。
  `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin
  slotを固定し、materializer/inputsはcandidate
  byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen
  production graphから同じnetwork/scripts-disabled
  slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned
  `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw
  tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate
  PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。
  External-equipment fd `7`はexact runtime-only external record
  `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact
  canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw
  `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord
  exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow
  failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing
  input、replay、late/cross-context input、noncanonical valueをrejectし、empty
  response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd
  `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum
  `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use
  collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot
  outputを禁止する。Human identity、collector `componentRunId`/process identity、case
  assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal
  surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe
  external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect
  launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly
  one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools
  requestとattempt
  contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context
  exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter
  `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child
  faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment
  descendant/context terminationとfresh-profile cleanupをverifyするまでnext
  attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly
  routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory ->
  one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter
  registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact
  existing path-free
  `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd
  `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical
  `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor
  `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK ->
  `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK
  -> all six registrations -> `browser-proxy-binding` ACK ->
  startとする。Browser-adapterとmatching-watchdog registrationはproxy
  binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。
  Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor
  validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use
  `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric
  candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored
  candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。
  Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count ->
  mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。
  `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId`
  matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact
  1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result
  pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。
  `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent
  non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker
  requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。
  Pre-readiness
  terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote`
  recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome`
  acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal
  descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
  *(2026-08-10改訂: checklistはT1090まで続く。)*

- [X] T1050 integration、package、performance、browser、coverage、documentation の各ゲートを実行し、すべての結果を
  `specs/001-inspect-agent-customizations/validation.md` と
  `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [X] T1051 6つのlower-bound jobは`.github/workflows/ci.yml`の`certify-lower-bounds` matrixである。
  Node.js 24.11.0と26.0.0を`ubuntu-latest`・`macos-latest`・`windows-latest`に掛けたもので、各jobは
  `build` jobがpackした同一tarballを受け取り、installとlaunchの前にrunner image、解決したNode.js
  version、tarball digestを記録する。`tests/documentation/cross-artifact.test.ts`がその形
  （1回pack、sampleごとにdownload、環境を記録）をassertする。recordが併せて名指すtraversal、
  file単位diagnostic、1回read、byte-decodeの各挙動は`tests/integration/boundaries/traversal.test.ts`と
  `tests/integration/repository-scan.test.ts`が所有し、6 jobすべてで実行される。前提を
  `specs/001-inspect-agent-customizations/validation.md`と
  `specs/001-inspect-agent-customizations/validation.ja.md`に記録する *(2026-09-01 修正:
  この6 jobは3つのoperating systemを要するため、matrixの結果はここで観測したのではなく通過するものとして
  扱う。recordはrunを主張せずそう述べる。)*
- [X] T1052 作業は残っていない: scan timingとinteraction latencyのcriterionは撤回したため、検証すべき
  measurement setが存在しない。Thresholdの主張にはrunの前にprocessor型番・image revision・memory・
  storageを記録した凍結測定hostが要るが、指名されていない。`tests/performance/`はmanifest-bound
  fixtureに対する非gatingのsmoke passとして残る（spec.ja.md § Clarifications、Session 2026-09-01）
- [X] T1053 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase
  IDをvalidateして記録し、supportedな各`(tool, kind, admitted source form)` row、rejected inspection-path
  selector family、shared-file attribution combinationについて、そのexactで非ゼロのdenominatorとdeclared minimum
  coverageに照らしてSC-003のpass/failを記録する。認識率100%、範囲外の解釈0件、正しい帰属率100%とし、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`に記録する
- [X] T1054 Frozen manifestからSC-004をvalidate/recordし、全tool/prohibited effect/rejected
  selector/detectable file-read change/directory enumeration中create-remove-rename/close-result
  classへnonzero coverageを要求する。Local fixture rootを記録し、product socket/HTTP(S)/DNS/SMB/MCP/URI/image
  surfaceをinstrumentする。Exactな2つのFR-022 authorized internal loopback class—発行済み`localhost`
  authorityにおけるpackaged UI assetへのstatic/SPA `GET`/`HEAD`とlocal session API
  channel—を別々に分類・検証し、それ以外の全surfaceで禁止対象direct product-issued outbound/MCP request 0件を証明する。External
  mutation harness、product mutation API/flag 0件、consume groupごとのproduction content read
  1件、不変content/length/identity/link/mode/mtime/ctime、および（platformが安定APIを公開する場合の。Node.jsは公開しないためctimeが間接signal）xattr/ACL、別扱いOS-only
  atime、hard-cancellation claimなしのconfirmed cleanup/late
  discardを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [X] T1055 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行したexact case
  IDをvalidate/recordし、supportedな各`(tool, kind, admitted source form)` row、source/comparison
  surface、credential/environment-reference class、set-sentinel/unset stateについて、exact nonzero
  denominator/minimumに対するSC-005 pass/failを記録する。Substitution
  0件、masking/revealなし、fixture不変を要求する。Diagnosticがsource
  valueを複製しないことを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で別に証明する
- [X] T1056 20件のfirst-useセッションを実行し、SC-001を
  `specs/001-inspect-agent-customizations/validation.md`と
  `specs/001-inspect-agent-customizations/validation.ja.md`に記録する。各セッションは独立した
  自律agentであり、起動したoriginと定型taskプロンプトだけを与える。selectorもrouteもinterfaceの
  説明も与えない。`pnpm run start:fixture`がbuildする全kind fixtureに対してInspectorを1つ起動し、
  全セッションが同じtreeに出会うようにする。セッションはpromptからの2分以内に、発見された
  customization file 1件のdetail viewを開き、区間は自身のwall clockで記録する。全セッションの
  outcomeを除外も置換もせず記録し、safety eventになり得るものとして各セッションが報告した内容も
  記録する *(2026-09-01 修正: セッションはparticipant cohortではなくagent駆動であるため、
  recordが述べるのはproductのguidanceで何ができたかであり、human-subjectの結果ではない。
  `scripts/`のsealed-capture kitは、moderatedなstudyが必要とする機構として残る。このrunはそれを
  使用せず、recordはそう述べる。)*
- [X] T1057 同じ20セッションをSC-006と残る2つのworkflowまで完了し、
  `specs/001-inspect-agent-customizations/validation.md`と
  `specs/001-inspect-agent-customizations/validation.ja.md`に記録する。各セッションは指定された
  `AGENTS.md`を開き、source・recognizing tools・file typeの3項目を2分以内に提出する。採点は
  `tests/usability/sc001-sc006-study-inputs/ground-truth.json`に対して行い、部分点は与えない。
  続いて定型のcomparisonタスクとGlobal-consentタスクを実施し、4つのprimary workflowを覆う。
  workflowごとのセッション別outcome、19/20と18/20の閾値に対する件数、safety観測を記録する。
  禁止対象の効果 — customization由来のexecution、被検査sourceのmutation、outbound request、
  MCP connection — を報告したセッションは自動的にcriticalであり、zero-critical gateをfailさせる
  *(2026-09-01 修正: T1056のとおりagent駆動。)*
- [X] T1058 Frozen manifestから全deterministic/runtime propagation
  classのSC-007をvalidate/recordし、readable complete `utf-8-replaced`、通常どおり報告されるrequest error、startup
  top-level propagation、prior snapshot、explicit-rescan stale ownershipを維持する。Global
  disableのaccept前/no-op immediate full-snapshot recovery、accept後drain/close failureでのprocess
  liveness・retained epoch/fence/error・retry/join/restart、purged content非復元、terminal public-state
  Global-sequence removal対unpublished-initial-enable unchanged-state
  cleanupも`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する
- [X] T1059 二言語accessibility acceptance contractのSC-008 protocolを実行し、
  `specs/001-inspect-agent-customizations/validation.md`と
  `specs/001-inspect-agent-customizations/validation.ja.md`に記録する。WCAG 2.2 Level A/AAの
  全55 rowを固定済み37 Applicable/18 Not-applicable区分に照らして評価し、criterion固有の全
  Not-applicable rationaleをrelease diffとbuild済みpackageに対して再検証し、Applicableな全rowの
  `AUTO-*` checkを3つの認証browserすべてで通過させる。Rowの欠落、不安定または欠落したID、
  Applicableな自動checkの失敗または欠落、rationale・mapping・evidence・resultの欠落、
  keyboardのみの4 primary workflowのいずれかの失敗は、severityにかかわらずSC-008をfailさせる
  *(2026-09-01 修正: 支援技術に対する手動実行はこのcriterionの外にある。そのmatrixは3つの
  operating systemと3つのscreen readerの組を要するため、`MANUAL-*` IDはresultではなく未実行として記録する。)*
  *(2026-09-01改訂: 3 browserの通過は認証matrixのものでCIが実行する。その結果はここでは観測ではなくT1051に従い前提とする。LocalのrunはmacOS
  WebKitに当たるが、そのtab orderは認証対象のものではない。)*

- [X] T1060 Checked-in outcome-fixture manifestのversion、SHA-256 digest、実行した正確なcase
  IDをvalidateして記録し、`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`で証明する
- [X] T1061 Release-candidateのcomplete diff/tarball reviewを実施し、全checked
  branch/resultを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録する。`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.md`、`specs/001-inspect-agent-customizations/contracts/usability-study-evidence.ja.md`、`specs/001-inspect-agent-customizations/data-model.md`、`specs/001-inspect-agent-customizations/data-model.ja.md`のpaired
  normative protocol/model、`tests/usability/sc001-sc006-study-inputs/`配下のclosed inputs/study
  kit、exact `./package.json` study command、self-contained
  static-`node:`の`scripts/build-usability-study-inputs.mjs`、`scripts/verify-usability-study-evidence.mjs`、`scripts/run-usability-study-capture.mjs`、`tests/contract/usability-study-evidence.test.ts`、`tests/integration/usability-study-evidence.test.ts`、`tests/security/usability-study-evidence.test.ts`のcomplete
  positive/negative coverageをreviewする。Scoped raw
  boundaryが全artifact、serializer、adapter、verifier、log、validation record、sentinel testで一致することを要求する。Raw
  Basic credential、raw
  `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw
  correlation-header byteはrequired ephemeral loopback-wire
  receipt/processingだけに存在でき、直ちにdiscardする。Capture/evidence IPCまたはretained/log/output/digest
  boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed
  exceptionとする。Supervisor ownershipとfresh attempt ID/bindingのlimited runtime
  distribution、study-browser-adapterへのdirect prepared-only marker install、adapter bootstrap、success
  ACKでmarker copyだけをatomic activateし、attemptをreadiness/open-snapshot dual
  ACKまでpreparedに維持すること、prepared failure destruction、browser/evidence exposure banをreviewする。Run-level
  capture startが全per-attempt profile/secret/bootstrapに先行することを確認する。Certified browser profileとexact
  bootstrap—exact declared header setのbodyless 407、canonical retry 1件、sole
  `Connection: close`のbodyless 204、effect/residue 0件—をreviewする。Exact one-use
  `StudyParticipantNavigationGrant`をreviewし、Fetch Metadataをconsistencyだけにする。Participantにはcurrent
  armed grant + exact tuple + static targetを要求し、grantなし/replay/nonexact/page-script mutationをopen
  IDsのvalid-secret
  unknown、attributable/prohibited/automatic-critical/browser-onlyにする。SPA/extension/other-secret
  actor row、six-header projection/discard、participant/SPA-only server claimを維持する。Allowed
  edgeごとにordinary unidirectional inherited pipe exact
  2本、`parent-to-child`と`child-to-parent`をreviewし、environment/argv/file/socket/named/control
  endpointを0件にする。Parent-to-child pipeはexact 96 binary byte、32-byte `channelSeed`、32-byte
  `bootstrapNonce`、32-byte `channelId`で始まり、same pipeをopenのままLF-framed parent-to-child
  messageへcontinueする。Childはframe parse前にexact 96 byteをconsumeし、96 byte前のEOF/closeをrejectし、byte
  96後の全byteをframe dataとして扱い、bootstrapとframeの間にEOFを期待しない。Child-to-parent first frameはauthenticated
  `ready` sequence `0`とする。Sibling edgeなしのexact closed
  matrixをreviewする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` /
  `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle`
  /
  `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle`
  /
  `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle`
  /
  `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle`
  /
  `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle`
  /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter
  -> matching
  watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）
  Reviewするexact association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting
  supervisor上のstartがlong-lived internal descendant/process 8件とstream
  3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext
  tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap`
  rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor
  `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child
  sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted
  `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful
  closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact
  authenticated bootstrap validation/bind/ACK privacy
  exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact
  runtime-only `StudyBrowserProxyRuntimeBinding`
  rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration
  6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted
  `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer
  bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated
  memoryとliveなattempt-local DevTools request/browser
  contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact
  runtime-only `StudyProcessLifecycleAttestation`
  rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process
  roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream
  role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean
  exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct
  observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit
  3件、moderator-attested reviewer
  registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid
  lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately
  preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome`
  acknowledgementはmatching
  watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact
  `StudyStreamControl`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable
  start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact
  `StudyStreamControlResult`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start
  resultはcapture-start + first
  heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact
  1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c
  read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog
  roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog
  registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole
  holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong
  route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root
  `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered
  probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter
  processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical
  43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root
  `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned
  bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless
  `407 Proxy Authentication Required`を受け、そのonly ordered
  headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry
  1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact
  `StudyBrowserBrokerDecision`
  rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact
  runtime-only `StudyCurrentSubjectScoringContext`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact
  `StudyWorkflowOutcomeSubmission`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact
  runtime-only `StudySafetyReviewCase`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact
  `StudySafetyReviewVote`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact
  `StudyBrowserBrokerDecision`、grant、attempt-terminalization/decision、workflow-outcome、`StudySafetyReviewCase`
  payload root/enumをreviewする。 Exact
  `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer`
  root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended
  `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A
  field/no-prebind-evidence rule、private buffer
  ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound
  transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer
  destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy
  ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure
  handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper
  discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination
  negativeをreviewする。Sole moderator production/supervisor routingとexact-source
  taxonomy—supervisor-observed product-exitだけ、browser adapterのactual
  browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor
  premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child
  fault
  invalidation—をreviewする。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing
  bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual
  ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context
  validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK ->
  outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor
  pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic
  candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct
  human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest
  boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair
  audit/retention-policy destruction、cross-case reuse/recording/replay 0件をreviewする。Exact frame
  rootを`schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`とし、各directionを`0`から開始してexact
  +1とする。`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`と`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`を要求する。MAC
  preimageを`ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`とし、populated
  compact JSON wire frameへexactly one LFを加える。Exact `ready` payload root
  `schemaVersion`,`bootstrapNonce`,`componentRunId`、`schemaVersion: 1`、canonical nonce/component
  ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root
  `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root
  `schemaVersion`,`event`と`event: close | abort | child-exit`を要求する。Constant-time tag
  verification、direction-specific key、first authenticated ready後だけの`channelSeed`/`bootstrapNonce`
  destruction、matrix/role/type/channel/direction/sequence
  closure、replay/order/partial/trailing/late/post-close/child-exit failure、control-enum
  expansionなしのcomplete key/frame/sequence wipeをreviewする。Timer-free brokerがadapter reserve without
  state change -> grantをarmedのままsupervisor validation/pending store -> exact one-use
  `candidate-forward` sole acceptance + atomic canonical grant consume -> adapter copy
  validation/consume/forward -> claim authenticate/join -> safe browser/server pair exactly-once
  release -> success/completion ACK exact 1件をatomicに実行し、application handlingをpost-release
  ACKまでblockすることを確認する。Late claim、unmatched transaction/request、connection close/error、IPC
  EOF/close/error、probe/attempt end、stop、abort、crash、child exit、その他lifecycle
  boundaryではtransactionをcloseし、partial pairをreleaseせずcandidate/claim/binding/marker/pending
  stateをwipeする。`automaticIssueCorrelationId`と`terminalizationClass`を持つexpanded scoring context exact
  rootをreviewする。Correlation `not-applicable` -> first matching accepted observation
  once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining
  contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic
  correlationをsubmission/canonical payloadの`outcomeClass`直後に置きfailure-link
  candidateだけとして扱う。Successは常にN/A/no-review、eligible accepted exact same-run/subject/process/workflow
  observationを持つfailureはautomatic-critical/no-review、candidate-free failureはN/A + exact
  reviewとする。他failureはexact review case、moderator call-local raw input、either vote前のfresh isolated
  reviewer pair、byte-identical safe case、same live workflowをobserveするhuman 2人、hidden first
  vote、acceptance前process exitを要求する。Allowed disposition 5件、valid truth row、exact derived
  automatic/reviewer ID、context/reviewer cleanup、missing/mismatch/reuse/leakage/reuse
  negativeをenforceする。Seal fields
  `automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をtrustせずrecomputeし、全reviewer
  dispositionのsuspected
  count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、reviewer-confirmed-criticalまたはreviewer-disagreement-critical
  derived issueごとの`reviewerCriticalIssueCount` entry
  1件、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>` deduplicated-union
  cardinalityとしての`criticalIssueCount`、total 0かつcomplete exact-80
  setの場合だけの`zeroCriticalIssueGate`をverifyする。Participant 01–19のfour-workflow後close、participant 20
  discovery/checkpoint/remaining-three continuation、open
  attempt最大1件、product/browser/equipment/premature-probeについてsupervisorがrouteしscoring-moderatorがunchanged
  harness scheduleでconstructしharness/adapter bindingをclosed dual ACKまで保持するterminalizing
  synthesis（premature -> equipment-failure）、harness/orchestrator/adapter/watchdog/reviewer
  failureのrun invalidationを確認する。Exact self-reexec mode/process tree、startのexact `processes` 6件 +
  exact ordered `orchestrators`（`study-harness`、`scoring-moderator`）、stopのreviewer 0件/long-lived
  clean exit 8件、witnessのstream exit 6件/orchestrator exit
  2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`、thresholdから独立したexact 20×4 workflow
  cardinality、unchanged record kind/effect row/sole-writer chain、heartbeat boundary、handoff
  anchor、stable control session、finalize teardown、witness-before-seal order、exact retained
  distribution/stream/handoff/witness/seal pair、sidecar/runtime control/raw/browser/reviewer/mapping
  residue 0件を確認する。最後にtask parserのexact 1,053 ID、108 phase、53 trace row、owned-path
  parity、self-contained task text、bilingual semantic/code-literal parity、全focused/complete gate
  resultをreviewし、untested branch、stale architecture term、failed check、missing evidence、privacy
  residue、unresolved concernがあればT1062/T1063をblockする。 加えて、次のbrowser-observation、outcome、ordering
  invariantをcomplete
  diff/tarball/evidenceからreviewする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined
  accepted stateとnonforwarded blocked stateを区別するvalidated stored
  candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser
  observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated
  ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome`
  bypassを全てrejectする。 Blocked browser-only observationではwatchdog
  ACKを`browser-only-released`より前に要求し、joined browser/server
  pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload
  ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application
  handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively
  successful
  workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review
  process/voteを0件にする。Candidateがあるfailed workflowはそのexact
  IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed
  workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic
  eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently
  deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic
  eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow
  outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer
  destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness
  response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact
  orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context
  `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task
  startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。
  Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd
  `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated
  `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject
  environmentだけを用い、raw candidate/proxy valueを含めず、command
  bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced
  `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe
  close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。
  `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin
  slotを固定し、materializer/inputsはcandidate
  byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen
  production graphから同じnetwork/scripts-disabled
  slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned
  `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw
  tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate
  PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。
  External-equipment fd `7`はexact runtime-only external record
  `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact
  canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw
  `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord
  exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow
  failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing
  input、replay、late/cross-context input、noncanonical valueをrejectし、empty
  response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd
  `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum
  `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use
  collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot
  outputを禁止する。Human identity、collector `componentRunId`/process identity、case
  assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal
  surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe
  external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect
  launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly
  one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools
  requestとattempt
  contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context
  exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter
  `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child
  faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment
  descendant/context terminationとfresh-profile cleanupをverifyするまでnext
  attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly
  routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory ->
  one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter
  registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact
  existing path-free
  `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd
  `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical
  `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor
  `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK ->
  `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK
  -> all six registrations -> `browser-proxy-binding` ACK ->
  startとする。Browser-adapterとmatching-watchdog registrationはproxy
  binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。
  Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor
  validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use
  `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric
  candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored
  candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。
  Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count ->
  mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。
  `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId`
  matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact
  1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result
  pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。
  `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent
  non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker
  requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。
  Pre-readiness
  terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote`
  recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome`
  acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal
  descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
  *(2026-08-10改訂: checklistはT1090まで続く。)* *(2026-09-01改訂: static
  assetのconcernは、equipmentが判定できるpackaged-prefix規則へcontractを修正することで決着したため、reviewは未解決concern
  zeroを報告する。)*

- [X] T1062 T1061 concernが0件になるまでrelease-review remediation/evidence-invalidation loopを実行する。Paired
  study kit/input byte/descriptor、scoped correlation privacy
  boundary、`StudyBrowserAttemptBinding`/`StudyBrowserRequestCandidate`/`StudyServerCorrelationClaim`、exact
  runtime
  `StudyBrowserProxyMarkerBinding`/`StudyParticipantNavigationGrant`/`StudyCurrentSubjectScoringContext`/`StudySafetyReviewCase`/`StudySafetyReviewVote`
  root/lifecycle、exact `StudyBrowserBrokerDecision`/`StudyAttemptTerminalization`
  payload、attempt-binding replication/ACK
  barrier、`browserAttemptId`/`browserProxyMarkerSecret`、certified Chromium profile/bootstrap/Fetch
  Metadata table、inherited IPC bootstrap/frame/HMAC/payload root、process topology、timer-free broker
  ordering、workflow producer/routing、reviewer assignment/review fields/truth
  table、automatic/reviewer issue identity、seal aggregate、exact 80/threshold logic、record
  kind/chain、handoff/witness/seal、retained layout、cleanup、privacy schemaに影響するrepository editは、prior
  focused gateとcomplete T1056–T1057
  evidenceを無効にする。各edit後、まず`pnpm run test:contract -- tests/contract/usability-study-evidence.test.ts`、`pnpm run test:integration -- tests/integration/usability-study-evidence.test.ts`、`pnpm run test:security -- tests/security/usability-study-evidence.test.ts`を再実行する。Scoped
  raw boundaryをpositive/negativeに証明する。Raw Basic credential、raw
  `Sec-Fetch-Dest`,`Sec-Fetch-Mode`,`Sec-Fetch-Site`,`Sec-Fetch-User`,`Origin`,`Referer`、raw
  correlation-header byteはrequired ephemeral loopback-wire
  receipt/processingだけに存在でき直ちにdiscardし、capture/evidence IPCまたはretained/log/output/digest
  boundaryをcrossさせず、strictly decoded canonical 43-character `correlationId`だけをsafe retained/hashed
  exceptionとする。Supervisor-owned fresh attempt/marker generation、study-browser-adapterへのdirect
  prepared-only install、adapter bootstrap ACKでmarker copyだけをatomic
  activateし、attemptをreadiness/open-snapshot dual ACKまでpreparedに維持すること、failure destruction、limited
  attempt-ID runtime distribution、browser/evidence exposure 0件を再証明する。Run-level capture start後、stream
  live中の各attempt直前にfresh profile/secret/bootstrapを行う。Certified exact profile/bootstrapの407 exact
  two-header set、Basic retry 1件、204 sole-header set、effect/residue 0件を再証明する。Exact one-use
  `StudyParticipantNavigationGrant` lifecycle、Fetch-Metadata consistency-only actor
  classification、grantなし/replay/nonexact/page-script participant-shaped negativeのvalid-secret
  unknown automatic-critical/browser-only処理、全SPA/extension/missing-invalid/header
  discard/forwarding/server-claim ruleを再証明する。Allowed edgeごとにordinary unidirectional inherited pipe
  exact 2本、`parent-to-child`と`child-to-parent`をreal-child
  testで再実行し、environment/argv/file/socket/named/control endpointを0件にする。Parent-to-child exact 96-byte
  binary prefix、32-byte `channelSeed`、32-byte `bootstrapNonce`、32-byte `channelId`からsame open
  pipe上でEOFなしにLF frameへcontinueすること、childがparse前にexact 96
  byteをconsumeしてEOF/close-before-96をrejectしpost-96 byteを全てframe dataとして扱うこと、child-to-parent first
  authenticated `ready` sequence `0`を再証明する。Sibling edgeなしのexact closed
  matrixをrerunする。`materializer -> supervisor`（`runtime-bootstrap | lifecycle` /
  `ready | acknowledgement | lifecycle`）、`supervisor -> study-harness`（`attempt-binding | terminalization-decision | lifecycle`
  /
  `ready | acknowledgement | lifecycle`）、`supervisor -> scoring-moderator`（`scoring-context | acknowledgement | lifecycle`
  /
  `ready | workflow-outcome | process-lifecycle-attestation | acknowledgement | lifecycle`）、`scoring-moderator -> reviewer-one | reviewer-two`（`review-case | lifecycle`
  /
  `ready | reviewer-vote | acknowledgement | lifecycle`）、`supervisor -> study-browser-adapter`（`browser-proxy-binding | stream-writer-binding | attempt-binding | proxy-marker-install | participant-navigation-grant | browser-broker-decision | safe-payload | workflow-outcome | terminalization-decision | stream-control | acknowledgement | lifecycle`
  /
  `ready | browser-request-candidate | attempt-terminalization | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、`supervisor -> product-instrumentation-adapter | inspector-server-ledger-adapter`（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle`
  /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）、各adapter
  -> matching
  watchdog（`stream-writer-binding | safe-payload | stream-control | acknowledgement | lifecycle` /
  `ready | stream-control-result | process-lifecycle-attestation | acknowledgement | lifecycle`）
  各invalidation後にreproveするexact
  association/barrierは次のとおり。Materializationはsupervisorだけをlaunchし、そのexisting
  supervisor上のstartがlong-lived internal descendant/process 8件とstream
  3件をlaunchする。Start時にsupervisorがordered fresh subject token 20件を生成・所有し、next attempt bindingへnext
  tokenだけをdistributeし、harnessはscheduleだけを行う。Exact runtime-only `StudySupervisorRuntimeBootstrap`
  rootは`schemaVersion`,`workRootLexicalValue`,`workRootCanonicalValue`,`workRootIdentity`,`controlEndpoint`,`controlToken`。Supervisor
  `ready` child-to-parent sequence `0`後、materializerはexact-once `runtime-bootstrap` parent-to-child
  sequence `0`を送り、supervisorはroot identityをvalidateしてendpointをbindし、accepted
  `acknowledgement`を返し、その後だけroot mutationを許可する。Transfer/frame dataをwipeし、role-specific successful
  closeはedgeだけdetachしてsupervisorをliveに保ち、failureはabortする。Raw path/endpoint/tokenはこのexact
  authenticated bootstrap validation/bind/ACK privacy
  exceptionだけで許可し、environment、argv、capture、evidence、retained data、log、output、digest inputへ入れない。Exact
  runtime-only `StudyBrowserProxyRuntimeBinding`
  rootは`schemaVersion`,`studyRunId`,`browserProxyAuthority`。Supervisorがadapter/watchdog registration
  6件すべてをACKした後だけexact-once `browser-proxy-binding`を送り、adapterがvalidate/bindしてaccepted
  `acknowledgement`を返した後だけ`stream-control: start`、`capture-start`、start completionを許可する。Transfer
  bufferをwipeし、raw authorityはstopまでcanonical route上のsupervisor/adapter dedicated
  memoryとliveなattempt-local DevTools request/browser
  contextだけに保ち、checkpoint/continuationで一致させ、stopでwipeし、environment/argv/evidence routeを禁止する。Exact
  runtime-only `StudyProcessLifecycleAttestation`
  rootは`schemaVersion`,`processRole`,`streamRole`,`componentRunId`,`instanceId`,`processRunId`,`event`,`exitCode`,`signal`。Process
  roleはadapter 3件、watchdog 3件、`reviewer-one`,`reviewer-two`、adapter/watchdogはexact stream
  role、reviewerは`not-applicable`、eventは`registered | exited`、registrationは`exitCode: null`/`signal: null`、clean
  exitは`exitCode: 0`/`signal: null`とする。Adapter/watchdog registration 6件、supervisor direct
  observationによるadapter exit 3件/orchestrator exit 2件、adapter-attested watchdog exit
  3件、moderator-attested reviewer
  registration/exit、`ephemeralReviewerProcessExitCount === reviewVoteCount`を要求し、nonclean/invalid
  lifecycle dataはinvalidateする。Moderator、adapter、watchdog edgeの`acknowledgement`はimmediately
  preceding valid `process-lifecycle-attestation`をacceptできるが、permitted directionの`workflow-outcome`
  acknowledgementはmatching
  watchdogが`safe-payload`をacceptした後だけ送る。`browser-request-candidate`,`attempt-terminalization`,`stream-control`には代わりに`candidate-forward`,`terminalization-decision`,`stream-control-result`を返す。Exact
  `StudyStreamControl`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`workRootIdentityCommitment`,`candidateIdentityCommitment`,`candidateSha256`,`studyInputManifestSha256`,`streamRole`,`command`,`checkpointRequestId`,`handoffSha256`で、全commandにimmutable
  start bindingをrepeatし、`command: start | checkpoint | anchor-handoff | stop`を使う。Exact
  `StudyStreamControlResult`
  rootは`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`command`,`checkpointRequestId`,`sequence`,`monotonicNs`,`envelopeSha256`。Adapterは`stream-control`/`stream-control-result`をbyte-identicalにrelayし、start
  resultはcapture-start + first
  heartbeat後にそのpositionをreportする。Supervisorは各fileをcreate/validateし、append-only handle exact
  1件をchild-visible descriptor `5`でsupervisor -> adapter -> watchdogへ渡す。Descriptor `3`はp2c
  read、`4`はc2p writeのままで、`5`をthird pipe/channelにせずadapter/watchdog
  roleだけに存在させ、他roleではabsent/closedとする。Adapterはpass-onlyでwatchdog
  registration後にcloseし、supervisorはupstream registration ACK後にcloseし、watchdogをsole
  holder/writerとする。Stopはsemantic result -> handle close -> clean exitの順とし、wrong
  route/slot/holder/order/resultは全copyをcloseしてinvalidateする。Exact `submit-product-event` outer root
  `inspectorProcessId`,`destinationRole`,`payload`もenforceし、outer processだけがregistered
  probeをauthenticateし、inner `StudyServerCorrelationClaim`はsubject/processをopen bindingとそのouter
  processへindependently一致させる。 Security-critical entityとschemaを直接associateする。Fresh 32-byte/canonical
  43-character `browserProxyMarkerSecret`はexact runtime-only `StudyBrowserProxyMarkerBinding` root
  `schemaVersion`,`studyRunId`,`browserAttemptId`,`browserProxyMarkerSecret`,`state`に属し、`state: prepared | active | destroyed`とする。Adapter-owned
  bootstrapは`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless
  `407 Proxy Authentication Required`を受け、そのonly ordered
  headerを`Proxy-Authenticate: Basic realm="inspector-study"`,`Connection: close`とし、canonical retry
  1件後にsole header `Connection: close`のbodyless `204 No Content`を受ける。Exact
  `StudyBrowserBrokerDecision`
  rootは`schemaVersion`,`studyRunId`,`browserAttemptId`,`correlationId`,`decision`、`decision: candidate-forward | browser-only-released | joined-pair-released`とする。Exact
  runtime-only `StudyCurrentSubjectScoringContext`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`automaticIssueCorrelationId`,`terminalizationClass`,`state`、`state: open | submitted | destroyed`とする。Exact
  `StudyWorkflowOutcomeSubmission`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`outcomeClass`,`automaticIssueCorrelationId`,`reviewDisposition`,`reviewerOneClassification`,`reviewerTwoClassification`とする。Exact
  runtime-only `StudySafetyReviewCase`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`caseClass`、`caseClass: nonautomatic-workflow-failure`とする。Exact
  `StudySafetyReviewVote`
  rootは`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`reviewerSlot`,`classification`、`reviewerSlot: reviewer-one | reviewer-two`とする。Exact
  browser-broker-decision、grant、terminalization、workflow-outcome、review-case payload
  root/enumを再証明する。 Exact `StudyPreReadinessBootstrapProof`/`StudyPreReadinessProductBuffer`
  root/state、`register-pre-readiness-probe`/`buffer-pre-readiness-product-event`/extended
  `register-product-probe` root、exact `StudyPreReadinessProductObservationDraft` root/N/A
  field/no-prebind-evidence rule、private buffer
  ID、raw-discard/draft-before-effect/ACK-before-effect-continuation、open-to-readiness-bound/terminalization-bound
  transition、fresh evidence-ID reconstruction、ordered adapter-ACK release、empty-buffer
  destruction、attempt-open dual ACK、readiness/pre-ready-exit bind-release-destroy
  ordering、abrupt-exit ACKed-prefix preservation、exit-before-bootstrap normal four-failure
  handling、bootstrap-to-registration-ACK body/effect 0件barrier、non-target/helper
  discard/registration-evidence 0件、全identity/register/ACK/replay/raw/wrong-destination
  negativeを再証明する。Sole moderator production/supervisor routingとexact-source
  taxonomy—supervisor-observed product-exitだけ、browser adapterのactual
  browser-exitまたはadapter/proxy/IPC healthy時のexternal equipment-failureだけ、supervisor
  premature-probe-closeだけ、internal adapter/proxy/marker/authentication/IPC/implementation/child
  fault
  invalidation—を再証明する。Decision後adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyしてterminalizing
  bindingを維持し、harnessはsynthesizeせず、moderator/supervisor-owned synthesis/closed dual
  ACKまでbinding/fixed scheduleを維持する。Prepared/open/closed barrier、open exact-matching context
  validation/tag -> downstream ACK(s) -> accepted observation -> mirror/update ACK ->
  outcome、pre-ready/context-free N/A/no-update、adapter reserve-without-state-change/supervisor
  pending-store-with-grant-armed/`candidate-forward`-plus-atomic-consume/adapter-validation-and-forward/generic
  candidate acknowledgement 0件、fresh blocked HTTPとauthenticated replay/race invalidation、distinct
  human pairとrepository/work-root/runtime/capture/evidence/bundle/log/output/digest
  boundary外のseparate access-controlled administrative roster/assignment recordによるunique-pair
  audit/retention-policy destruction、cross-case reuse/recording/replay 0件を再証明する。Exact frame root
  `schemaVersion`,`channelId`,`sequence`,`direction`,`senderRole`,`receiverRole`,`messageType`,`authenticationTag`,`payload`、各direction
  `0` then exact
  +1、`K_p2c = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId || ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)`、`K_c2p = HMAC-SHA-256(channelSeed, ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId || ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)`、MAC
  preimage
  `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || compact canonical exact-root frame bytes with authenticationTag:null and no LF`、populated
  compact JSON wire frameだけへのexactly one LFを要求する。Exact `ready` payload root
  `schemaVersion`,`bootstrapNonce`,`componentRunId`と`schemaVersion: 1`とcanonical nonce/component
  ID、seed/nonce destruction前のparent authentication/consumption、exact `acknowledgement` payload root
  `schemaVersion`,`acknowledgedSequence`,`result`と`result: accepted`、exact `lifecycle` payload root
  `schemaVersion`,`event`と`event: close | abort | child-exit`、constant-time
  verification、direction-specific key、one-use bootstrap、role/message
  closure、replay/order/partial/trailing/late/post-close/child-exit/wipe rejection、control-command
  expansion 0件を要求する。Timer-free atomic order adapter reserve without state change ->
  grantをarmedのままsupervisor validation/pending store -> exact one-use `candidate-forward` sole
  acceptance + atomic canonical grant consume -> adapter copy validation/consume/forward -> claim
  authenticate/join -> exactly-once safe pair release -> success/completion ACK exact
  1件を再証明し、application handlingをpost-release ACKまでblockする。Late claim、unmatched
  transaction/request、connection close/error、IPC EOF/close/error、probe/attempt
  end、stop、abort、crash、child exit、その他lifecycle boundaryでcandidate/claim/binding/marker/pending
  stateをclose/wipeし、partial pairをreleaseしないことを再証明する。Expanded scoring context
  root/lifecycleを再証明する。Automatic correlation `not-applicable` -> first matching accepted ID
  once、terminalization `none` -> mapped cause onceだけを許可し、post-terminalization remaining
  contextをmapped causeでinitializeして他mutation/reversal/replacementをrejectする。Automatic
  correlationをoutcomeClass直後へ置き、same-run/subject/process/workflow accepted-observation
  linkを要求する。全nonautomatic failureでexact review-case root、moderator-owned call-local raw
  response/rubric、either vote前のfresh isolated reviewer process 2件とbyte-identical
  case、same-live-workflow human observation、hidden first vote、acceptance前の両exitを再証明する。Allowed
  disposition 5件だけ、全truth row、derived issue identity、missing/mismatch/reuse/leakage
  negativeをenforceする。`automaticCriticalIssueCount`,`suspectedWorkflowBlockerCount`,`reviewVoteCount`,`reviewDisagreementCount`,`reviewerCriticalIssueCount`,`criticalIssueCount`,`zeroCriticalIssueGate`をrecompute/mutation-testし、全reviewer
  dispositionのsuspected count、`reviewVoteCount === 2 * suspectedWorkflowBlockerCount`、exact
  confirmed/disagreement counting、`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>`
  deduplicated union、total/zero-gate equationを含める。Focused gateがpassしたらcomplete T1049–T1050 automated
  gateを再実行しcandidateをrebuild/freezeする。New empty external work root、endpoint、token、certified isolated
  browser surface、marker secret、IPC seed/nonce/channel ID、process ID、study IDをprovisionし、independent
  issue IDはprovisionしない。Candidate/proxyをreadせずinputをrematerialize/verifyし、final
  candidateをstart時だけbindする。Participant 01–19 four-workflow close、participant 20 discovery
  checkpoint/remaining-three continuation、open attempt最大1件、exact terminalization
  synthesis/invalidation branch、exact 80 workflow/review、aggregate
  recomputation、stop、cleanup、finalize witness/teardown、witness-before-seal outputまでcomplete
  T1056とT1057を再実行する。Exact self-reexec mode/process tree、startのexact `processes` 6件 + exact ordered
  `orchestrators` 2件、stopのreviewer 0件/long-lived exit 8件、witnessのstream exit 6件/orchestrator exit
  2件/`ephemeralReviewerProcessExitCount === reviewVoteCount`を再証明する。Resulting complete
  diff/tarballに対してT1061を再実行し、concernが残る間T1061 → remediation → focused gate → complete gate → full
  studyを反復する。Concern 0件の後だけ、exact retained distribution、stream 3件、handoff pair、continuity-witness
  pair、capture-seal pair、record kind 5件、threshold independence、exact six-plus-two long-lived
  exitとreviewer-exit equation、aggregate equation 7件、prohibited residue 0件、exact task ID 1,053件、phase
  108件、trace row 53件、宣言済み task ID すべての coverage — T001 から T1141 まで、取り下げたフェーズ39の欠番
  T436–T439、フェーズ45の欠番 T482–T485、フェーズ64の欠番 T654–T657、フェーズ67の欠番 T675–T678、フェーズ68–75の欠番 T679–T750
  を除く、English/Japanese owned-path/semantic parity、stale architecture term
  0件、`git diff --check`をverifyする。全invalidation、rerun、digest、safe count、aggregate、cleanup、final
  resultに加えて、SC-003/SC-004/SC-005/SC-007のrelease-evidence fixture-manifest transition
  record—実際の初回manifest作成をprior revisionなしとして記録するか、またはpriorとcurrentの`manifestVersion`値、変更されたcase
  ID・required-class定義・expected outcome、および各denominator-semantics変更に対する明示的なreviewer decision/review
  reference(automated transition contract testはこのhuman
  reviewを確立しない)—を`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ記録し、`specs/001-inspect-agent-customizations/tasks.md`と`specs/001-inspect-agent-customizations/tasks.ja.md`を再checkし、failed
  threshold/gate、stale evidence、missing review、privacy residue、unresolved concernがあればT1063をblockする。
  加えて、次のbrowser-observation、outcome、ordering
  invariantを各invalidation/rerun後にreproveする。Supervisor-to-study-browser-adapterの`safe-payload`は、forwarded/joined
  accepted stateとnonforwarded blocked stateを区別するvalidated stored
  candidateから再構成し、supervisorがcanonical serialization前にcurrent workflowをtagしたsafe nonworkflow browser
  observationだけに許可する。Adapterはそのcandidateとの一致を要求し、study-browser-watchdogへ`safe-payload`としてrelayしてauthenticated
  ACKを返す。 このtypeによるworkflow record、source-supplied workflow tag、moderator/`workflow-outcome`
  bypassを全てrejectする。 Blocked browser-only observationではwatchdog
  ACKを`browser-only-released`より前に要求し、joined browser/server
  pairではstudy-browser-watchdogとinspector-server-ledger-watchdog双方のpayload
  ACKを`joined-pair-released`より前に要求し、その後success/completion ACK exact 1件を返し、application
  handlingをそのfinal ACKまでblockする。 Context `automaticIssueCorrelationId`はcandidateだけとして扱う。Objectively
  successful
  workflowはcandidateがあっても`automaticIssueCorrelationId: not-applicable`をsubmitし、`not-applicable`を使い、review
  process/voteを0件にする。Candidateがあるfailed workflowはそのexact
  IDをsubmitして`automatic-critical`を使いreview/voteを0件にし、candidateがないfailed
  workflowは`not-applicable`をsubmitしてreviewを完了する。 Accepted automatic
  eventはworkflowのsuccess/failureに関係なく`automatic:<correlationId>` issue exact 1件をindependently
  deriveし、`automaticCriticalIssueCount`へexact 1回countする。 Accepted pre-readiness automatic
  eventは`workflowClass: not-applicable`と`automaticIssueCorrelationId: not-applicable`を維持し、workflow
  outcomeへlinkせず、そのissue/countは生成する。 Readinessのexact orderを、全prebuffer payload ACKとbuffer
  destruction -> open attempt-binding dual ACK -> discovery `scoring-context` ACK -> readiness
  response -> grant/navigationとし、全gapでbrowser candidate emissionを禁止する。 Inter-workflowのexact
  orderを、previous outcomeの全downstream `workflow-outcome`/watchdog ACK -> previous context
  `submitted` then `destroyed` -> next `scoring-context` ACK -> next prompt/timer/task
  startとし、overlap/early actionを禁止する。 さらに、該当する実装または検証で次のcanonical equipment/runtime boundaryを要求する。
  Supervisorをsole participant launch controllerかつdirect OS observerとする。External-equipment fd
  `6`を通じ、shellを使わずverified subject-repository cwdで、exact LF-terminated
  `npx --no-install agent-customization-inspector --no-open` 1行、sanitized probe/control/run/subject
  environmentだけを用い、raw candidate/proxy valueを含めず、command
  bufferを直ちにwipeしてparticipantをlaunchする。Pre-bootstrap exitを含むparticipant exitはsupervisor-sourced
  `product-exit`とし、harnessはscheduleだけを行う。Authenticated probe
  close時は、already-exitedなら`product-exit`、still-liveなら`premature-probe-close`をatomically選ぶ。
  `materialize`時にsanitized equipment `PATH`へpinned npxとreserved initially-empty external store-bin
  slotを固定し、materializer/inputsはcandidate
  byteをreadもrequireもしない。`verify-inputs`後かつ`start`前に、authorized setupはexact candidateとfrozen
  production graphから同じnetwork/scripts-disabled
  slotへprovisionしてdigest-bindし、start時にsupervisorがinherited slotからsole audited binaryをpinned
  `npx --no-install`でresolveして再検証する。Unknown post-materialize path/control/environment routeを設けない。Raw
  tarball pathをchild environment/argvへ入れず、distributionを変更せず、alternate
  PATH/global/cache/network/install/fallback/substituteをrejectし、abort/stop/finalize時にstoreをdestroyしてabsenceをverifyする。
  External-equipment fd `7`はexact runtime-only external record
  `StudyModeratorInput`を受け、そのrootを`schemaVersion`,`studyRunId`,`subjectId`,`inspectorProcessId`,`workflowClass`,`response`,`timing`,`groundTruth`,`rubric`の順とし、compact
  canonical UTF-8 JSON + exactly one LFでencodeする。`timing`はcanonical nonnegative decimal string、raw
  `response`、`groundTruth`、`rubric`はcanonical JSON stringとする。Normally completed workflowごとにrecord
  exact 1件を要求する。Terminalization時は`terminalization-decision`から未実行remaining-workflow
  failureをsynthesizeし、recordを読まない。Parse failure、complete line前のEOF、extra/trailing
  input、replay、late/cross-context input、noncanonical valueをrejectし、empty
  response/timingをfabricateせず、raw valueをretainせず、全input bufferをwipeする。 External-equipment fd `8`とfd
  `9`をisolated reviewer slotとする。Complete caseをdisplayした後だけLF-terminated enum
  `product-caused-blocker | not-product-caused-blocker` exact 1行をenableし、fresh one-use
  collectorを使い、first voteをhiddenにし、raw inputを直ちにwipeし、echo/history/record/log/cross-slot
  outputを禁止する。Human identity、collector `componentRunId`/process identity、case
  assignmentはreuseせず、literal `reviewer-one`/`reviewer-two` labelとsanitized terminal
  surfaceだけはdrain/reset後にreuseできる。 Browser adapterはsole anonymous remote-debugging-pipe
  external-equipment exceptionを通じ、digest-verified pinned Chromiumとそのcontextをdirect
  launch/ownする。`Target.createBrowserContext`を`proxyServer`と`disposeOnDetach`付きでcallし、各`Fetch.authRequired`へexactly
  one `Fetch.continueWithAuth` Basic credential responseを返し、raw proxy/marker materialをDevTools
  requestとattempt
  contextだけにtransientに保ち、environment、argv、profile、history、log、evidenceへ入れず、wipe/destroyし、browser/context
  exitをdirect observeする。Healthy external browser/environment/bootstrap failureはadapter
  `equipment-failure`とし、internal adapter/proxy/controller/CDP/auth/IPC/child
  faultはsynthesisせずinvalidateする。Adapter crashまたはDevTools-pipe EOF時、supervisorはequipment
  descendant/context terminationとfresh-profile cleanupをverifyするまでnext
  attempt/finalizeをblockし、negative cleanup testでorphan Chromium/context 0件を証明する。 Raw proxyのonly
  routeをcaller-transient -> authenticated runtime-control `StudyLiveBinding` -> supervisor memory ->
  one-use `browser-proxy-binding` -> adapter memory -> DevTools request/contextとする。 各adapter
  registrationのsupervisor ACK後、exact path-free `StudyStreamWriterRuntimeBinding`
  rootを`schemaVersion`,`controlSessionId`,`studyRunId`,`streamRole`,`captureComponentRunId`,`captureInstanceId`,`captureProcessRunId`,`writerFileIdentity`,`writerLinkCount`,`writerOpenMode`の順で送る。`writerFileIdentity`はexact
  existing path-free
  `StudyRuntimeIdentityTuple`、`writerLinkCount: 1`、`writerOpenMode: append-only`とし、fd
  `5`はprotocol固定でroot fieldに含めない。AdapterはACKしてbyte-identical
  `stream-writer-binding`をwatchdogへrelayし、watchdogがverifyしてregisterした後、adapterとsupervisorがACKする。Descriptor
  `5`はspawn時だけinheritでき、extra duplicateを禁止する。 Exact start orderをadapter-registration ACK ->
  `stream-writer-binding` relay/ACK -> watchdog verification/registration -> adapter/supervisor ACK
  -> all six registrations -> `browser-proxy-binding` ACK ->
  startとする。Browser-adapterとmatching-watchdog registrationはproxy
  binding前にsupervisor-ACK済みとし、そのACKで`stream-control: start`、`capture-start`、start completionをgateする。
  Eligible candidate orderをstate changeなしのadapter reservation -> grantをarmedのままsupervisor
  validation/pending store -> sole acceptance + atomic canonical grant consumeであるexact one-use
  `candidate-forward` -> adapter copy validation/consume/forwardとする。Predecision consumeとgeneric
  candidate acknowledgementを設けない。Blocked `safe-payload`はvalidated/stored
  candidateだけからderiveし、accepted forwarded/joined stateとnonforwarded blocked stateを明示的に区別する。
  Supervisor workflow tagをcanonical serialization前にapplyし、その後downstream ACK -> accept/count ->
  mirror/moderator ACK -> release/outcomeの順とし、postaccept mutation/backfillを禁止する。
  `StudyStreamControl`と`StudyStreamControlResult`の両方でcommand/`checkpointRequestId`
  matrixをenforceする。`start`はcommand/resultとも`not-applicable`、`checkpoint`はfresh canonical ID exact
  1件、`anchor-handoff`と`stop`はcurrent accepted checkpoint IDを使う。Wrong command/result
  pair、mismatch、stale/reused/future ID、noncanonical N/A spellingをrejectする。
  `StudyBrowserBrokerDecision`では`candidate-forward`と`joined-pair-released`にcurrent
  non-`not-applicable` `browserAttemptId`を要求し、`browser-only-released`はbound valid-marker
  requestならcurrent IDを要求し、missing/invalid-marker unrelated requestだけ`not-applicable`を許可する。
  Pre-readiness
  terminalの`StudyWorkflowOutcomeSubmission`、`StudySafetyReviewCase`、両`StudySafetyReviewVote`
  recordでは全`inspectorProcessId`をmatching `not-applicable`とする。 全`workflow-outcome`
  acknowledgementはmatching watchdogが`safe-payload`をACKした後だけ送る。 Topologyはeight long-lived internal
  descendants/processesと記述し、watchdogはadapter childであってsupervisor direct child 8件ではない。
  *(2026-08-10改訂: checklistはT1090まで続く。)* *(2026-09-01改訂:
  このloopが行ったkitの編集はT1056–T1057のevidenceを無効化しない。当該evidenceはkitを使わないagent駆動のrunであり、capture
  bundleを生んでいないためである。)*

- [X] T1063 Dependency/breaking-change rationale、migration impact、全violation解消、各residual
  uncertaintyのowner/resolution pathを含むprinciple-by-principle release Constitution
  Checkを`specs/001-inspect-agent-customizations/validation.md`と`specs/001-inspect-agent-customizations/validation.ja.md`へ実施・記録し、matching
  pull-request review checkを要求する。そのbilingual recordをT1062後のsole planned validation-only
  editとしrepositoryをfreezeする。Frozen tree/final candidateへ、build、frozen
  install、lint、typecheck、unit、contract、integration、security、package、performance、browser、coverage、documentation、lower-bound
  candidate checkを含むT1049–T1051の全applicable automated gateを再実行し、unchanged
  candidate/profile/fixture/human/manual evidence bindingを検証し、T1061 complete-diff/tarball
  inspectionをread-onlyで反復し、最後に`pnpm run test:docs`と`git diff --check`を実行する。Outcomeはexternal
  release/pull-request check logだけへcaptureする。Failure、concern、または後続repository
  editがあれば全outcome/approvalを無効にし、T1063だけでなくT1062へ戻してdigest/evidence再validation、applicable
  rerun、complete-diff review後にT1063を再開しなければならない（MUST）
  *(2026-09-01改訂: 認証済み3 browser matrixはCIのものであり、その結果はここでは観測ではなくT1051に従い前提とする。Localのbrowser
  gateはChromium projectである。)*
  *(2026-09-01改訂: study kitは退役したため、この再実行はcandidate、seal、human/manual evidence
  bindingを検証せず、それらのreviewも繰り返さない。繰り返すのは、releaseが今も持つものに対する完全diffとtarballの読みである。)*

- [X] T1141 Inspector が読む場所のすべてを、ツールごと・種別ごとに、リポジトリと
  （オプトインした）個人設定について、`docs/which-files-are-listed.md`と
  `docs/which-files-are-listed.ja.md`へ列挙し、各言語の readme からリンクする。列挙は散文で
  書く。Selector programや`ANY_DIRECTORIES`はruleのオーサリング形式であって製品の読者が
  出会うものではなく、`specs/`配下のvendor contractはユーザードキュメントではないため案内先に
  もしない。ページは一覧だけを持ち、それ以外を持たない。散文はruleから導出できないので、代わりに
  `tests/documentation/cross-artifact.test.ts`へ包含関係を要求する。出荷される
  `static-candidate` ruleがcandidateをadmitするliteral segmentは、すべて両言語のページが名指して
  いなければならない。あわせて2つのreadmeが1つの節構造、1つのコマンド集合、1つの相互参照集合を
  持ち、リンク先が解決することも要求する（QR-004）。

---

## ストーリーカバレッジマトリクス

| フェーズ | 主要ストーリー範囲 | 累積マイルストーン |
|---:|---|---|
| 1 Setup | 共通前提 | コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。 |
| 2 Minimal Secure Foundation | 共通前提 | セキュリティとパッケージの基盤が単独で合格し、単一のinspection moduleの外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。 |
| 3 起動可能な認可済み空画面 | US1 | ブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。 |
| 4 Codex SKILL 一覧 | US1 | Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。 |
| 5 Codex SKILL 詳細 | US2 | Codex SKILL を選択すると、完全で inert な detail 画面が開きます。 |
| 6 Codex SKILL metadata 一覧 | US1 | skill の metadata file はその skill 自身の detail 画面で確認します。metadata の tab・row・独立した candidate は存在しません *(2026-08-01 修正: フェーズ 6 参照)*。 |
| 7 Codex SKILL metadata 詳細 | US2 | skill の detail tree で `agents/openai.yaml` を選択すると、その完全な literal source が表示されます *(2026-08-01 修正: フェーズ 7 参照)*。 |
| 8 Claude SKILL 一覧 | US1 | Claude と Codex の SKILL 一覧が同じ inventory に共存します。 |
| 9 Claude SKILL 詳細 | US2 | Claude SKILL detail が完成し、Codex detail と一貫します。 |
| 10 Copilot SKILL 一覧 | US1 | Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。 |
| 11 Copilot SKILL 詳細 | US2 | Copilot SKILL detail は完全で Codex・Claude detail と一貫しており、共有物理 file は各 product 自身の definition として開きます *(2026-08-10 修正: フェーズ 11 参照)*。 |
| 12 統合 SKILL inventory | US1 | 完全な skill-first inventory を filter して理解できます。 |
| 13 SKILL 比較 | US3 | 一つのskill名のcopy同士を、対応するファイルごとに、activationもmutationもせずに比較できます。 |
| 14 SKILL metadata 比較 | US3 | census 公開された二つの `agents/openai.yaml` file を generic literal comparison で比較でき、authored sensitive value は変更なしで表示され、typed metadata row が捏造されることはありません *(2026-08-01 修正: フェーズ 14 参照)*。 |
| 15 Codex Instructions inventory | US1 | 静的な Codex instruction に加えて、repository 自身の `.codex/config.toml` が設定した instruction file もフィルタリングでき、構成 file 自体はどこにも現れません。 |
| 16 Codex Instructions 詳細 | US2 | Codex instruction を選択すると、それが正確な静的 file であっても repository の構成が加えた名前であっても、完全で inert な detail — file の宣言、instructions、diagnostics から始まる — が開く。 |
| 17 Claude Instructions inventory | US1 | Claude instruction file を filter できます。 |
| 18 Claude Instructions 詳細 | US2 | Claude instruction を選択すると、参照 file を import せず、完全で inert な detail が表示されます。 |
| 19 Copilot Instructions inventory | US1 | Copilot instruction candidate を filter でき、明示的な exclusion が見えます。 |
| 20 Copilot Instructions 詳細 | US2 | Copilot instruction を選択すると、別々の surface interpretation が表示されます。 |
| 21 統合 Instructions inventory | US1 | 完全な静的 instruction inventory、すべての shared-file interpretation、およびフェーズ 15 が有効化した configured fallback integration を理解できます。 |
| 22 Instructions 比較 | US3 | 二つの instruction file を比較し、構造上の difference を理解できます。 |
| 23 Codex MCP carrier と内包宣言 | US1 | 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングできます。フェーズ 15 の instructions と configured fallback は変わらず、carrier 自身の source はどこにも表示されません。完全な configuration inventory/detail はフェーズ 57～58 まで延期します。 |
| 24 Codex MCP の詳細 | US2 | Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。 |
| 25 Claude MCP ファイルのインベントリ | US1 | ユーザーは、Claude プロジェクト MCP ファイルをフィルタリングできる。 |
| 26 Claude MCP ファイルの詳細 | US2 | Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。 |
| 27 Claude 明示的carrier MCP境界 | US2 | frontmatter に `mcpServers` を綴る skill は、その frontmatter を自身の skill detail に表示し、MCP インベントリには何も寄与しません — すべてのkindに適用される恒久ruleです。 |
| 28 Copilot CLI MCP ファイルのインベントリ | US1 | ユーザーは、Copilot CLI MCP ファイルをフィルタリングできる。 |
| 29 Copilot CLI MCP の詳細 | US2 | Copilot CLI MCP ファイルを選択すると、完全で非活性な詳細が表示される。 |
| 30 Copilot VS Code MCP ファイルのインベントリ | US1 | ユーザーは、VS Code の `servers` スキーマを Copilot CLI MCP ファイルと区別して識別できる。 |
| 31 Copilot VS Code MCP の詳細 | US2 | どちらのVS Code MCP pathを選択してもcomplete inert detailを表示し、documented `.vscode` schemaと未解決root semanticsを明確に分離する。 |
| 32 Copilot Cloud MCP factと明示的carrier境界 | US2 | agent/plugin/settings fileがMCP構成を綴っていてもMCP tabには明示的carrierだけが並び、hosted Cloud MCP factはどのsession surfaceにも現れません。 |
| 33 Priority MCP インベントリ | US1 | 4つのcarrier全体で1つのMCP inventoryを利用でき — すべてのvendorが宣言する名前は1つのrowにgroupされる — 他のfileが何を綴っていても明示的carrier以外は表示されません。 |
| 34 MCP 比較 | US3 | ユーザーは MCP 宣言に接続せずに比較できる。 |
| 35 Codex Rules inventory | US1 | source と path で Codex rule を filter できる。 |
| 36 Codex Rules の詳細 | US2 | Codex rule を選択すると、それを execute/enforce せず、完全で inert な detail が開く。 |
| 37 Claude Rules のインベントリ | US1 | ユーザーは、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。 |
| 38 Claude Rules の詳細 | US2 | Claude rule を選択すると、任意の filesystem path に対して glob を evaluate せず、完全で inert な detail が表示される。 |
| 38A Permission policy のshape | US1, US2 | Permissions rowとそのdetailがpolicy自身のものになり、他のkindと共有しない。どちらの画面も以前と同じに動作する。 |
| 38B レビュー由来の修正 | US1, US2 | すべてのinventory rowが開き、すべてのrecognitionがsurfaceを述べ、どのartifactも自身のevidence以上を主張しない。 |
| 39 Rules の比較 | — | 取り下げ: rule kindには、2つのfileが1つの2つのコピーとなるような同一性が無い。 |
| 39A Claude Permissions carrier | US1, US2 | Permissions一覧が両vendorのpolicyを保持し、Claudeのものはsettings carrierが宣言するblockとして開く。 |
| 40 Claude Commands のインベントリ | US1 | ユーザーは再帰的な namespace を備えた Claude command をフィルタリングできる。 |
| 41 Claude Commands の詳細 | US2 | Claude command を選択すると、参照 target を execute、import、read せず、完全で inert な detail が開く。 |
| 42 Copilot Commands のインベントリ | US1 | ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。 |
| 43 Copilot Commands の詳細 | US2 | Copilot command を選択すると、完全で inert な CLI-qualified detail が表示される。 |
| 44 統合 Commands インベントリ | US1 | ユーザーは共有 root command と nested Claude-only command を区別できる。 |
| 45 Commands の比較（取り下げ） | US3 | フェーズ 48 へ取り下げ: 1つの kind は1つの comparison surface である。 |
| 46 Copilot Prompts のインベントリ | US1 | ユーザーは対応 Copilot prompt をフィルタリングできる。 |
| 47 Copilot Prompts の詳細 | US2 | Copilot prompt を選択すると、参照 target へ navigate したり read したりせず、完全で inert な detail が開く。 |
| 48 Prompts と Commands の比較 | US3 | コンテンツへ移動したり実行したりせずに、この kind の file を — command と並ぶ prompt も含めて — 比較できる。 |
| 49 Codex Custom Agents inventory | US1 | Codex custom-agent file を filter できます。 |
| 50 Codex Custom Agents 詳細 | US2 | Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で inert な宣言とinstructionsが表示されます。 |
| 51 Claude Custom Agents inventory | US1 | duplicate-name uncertainty を持つ Claude custom agent を filter できます。 |
| 52 Claude Custom Agents 詳細 | US2 | Claude custom agent を選択すると、memory を read したり MCP に connect したりせず、完全で inert な宣言とinstructionsが表示されます。 |
| 53 Copilot Custom Agents inventory | US1 | Copilot custom agent を filter できます。 |
| 54 Copilot Custom Agents 詳細 | US2 | Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。 |
| 55 統合 Custom Agents inventory | US1 | duplicate file を伴わずどのagentもMCP rowを所有しない、完全な custom-agent inventory とその共有 Claude/Copilot interpretation を理解できます。 |
| 56 Custom Agents 比較 | US3 | custom-agent definition を実行または ranking せずに比較できます。 |
| 57 Codex Configuration recognition | US1 | MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。 |
| 58 Codex Configuration 詳細 | US2 | settings row から `.codex/config.toml` を選択すると、author が書いた document がそのまま表示され、そこから何も読み出さず、宣言された target も開きません。 |
| 59 Claude Settings inventory | US1 | exact-launch Claude settings file と、その project/local layer を識別できます。 |
| 60 Claude Settings 詳細 | US2 | Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、完全で inert な detail — inline MCP mapはfile自身の宣言contentとして — が表示されます。 |
| 61 Copilot Settings inventory | US1 | 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate を識別できます。 |
| 62 Copilot Settings 詳細 | US2 | Copilot settings を選択すると、plugin の enable や contained Hook の compose を行わず、完全で inert な surface-qualified detail が表示されます。 |
| 63 統合 Settings/Configuration inventory | US1 | 完全な settings/configuration inventory をフィルタリングでき、どの settings document も自身の MCP row を公開しないこと、Codex configuration carrier だけが自身の carrier rule の読む MCP row を保つことを確認できます。 |
| 64 Settings/Configuration 比較（取り下げ） | — | 取り下げ: settings row の detail は author が書いた document そのものであるため、比較は 2 つの完全な source を並べるだけで、この kind 固有に比べるものが無い。 |
| 65 Claude Output Styles のインベントリ | US1 | ユーザーは対応 Claude output style をフィルタリングできる。 |
| 66 Claude Output Styles の詳細 | US2 | output style を選択すると、style を適用せず、完全で inert な detail が開く。 |
| 67 Claude Output Styles の比較（取り下げ） | — | 取り下げ: toolも admit される location も1つずつであり、2つのfileが1つのstyle名の2つのコピーになり得ない。 |
| 68 Codex Marketplaces のインベントリ（取り下げ） | — | 取り下げ: catalogはplugin名をそのsourceへ解決するものであり、plugin kindのcarrierとして、そのentryはplugin行として現れる。 |
| 69 Codex Marketplaces の詳細（取り下げ） | — | 取り下げ: フェーズ 68 がこの詳細の開く行を取り下げており、各entryの事実はそれが解決するpluginに属する。 |
| 70 Claude Marketplaces のインベントリ（取り下げ） | — | 取り下げ: `.claude-plugin/marketplace.json`はフェーズ 68 と同じ理由でpluginのcarrierである。 |
| 71 Claude Marketplaces の詳細（取り下げ） | — | 取り下げ: フェーズ 70 が行を取り下げており、entryのsourceとpinはそれが解決するplugin行に属する。 |
| 72 Copilot Marketplaces インベントリ（取り下げ） | — | 取り下げ: Copilotのcatalogもフェーズ 68 と同じ理由でpluginのcarrierである。 |
| 73 Copilot Marketplaces の詳細（取り下げ） | — | 取り下げ: フェーズ 72 がこの詳細の開く行を取り下げた。 |
| 74 統合 Marketplaces インベントリ（取り下げ） | — | 取り下げ: 束ねるべき3 vendorの行がいずれも取り下げられており、その統合は統合pluginインベントリである。 |
| 75 Marketplaces 比較（取り下げ） | — | 取り下げ: catalog行が無い以上、対にすべきcatalogの同一性も無い。2つのcatalogはplugin比較で出会う。 |
| 76 Codex Plugins インベントリ | US1 | ユーザーは、宣言済みsourceがRepositoryの外にあるものも含め、作成済みCodex pluginをフィルタリングできる。 |
| 77 Codex Plugins の詳細 | US2 | Codex pluginを選択すると、どのcomponentもloadせず、それを解決する全carrierの完全でinertなauthored metadataが表示される。 |
| 78 Claude Plugins インベントリ | US1 | ユーザーは、catalogが名前を挙げてもRepositoryが実体を持たないものも含め、Claude pluginをフィルタリングできる。 |
| 79 Claude Plugins の詳細 | US2 | Claude pluginを選択すると、activationせず、全carrierの完全でinertなauthored metadataとcomponent relationshipが表示される。 |
| 80 Copilot Plugins インベントリ | US1 | ユーザーはCopilot pluginをフィルタリングでき、各行はそのcarrierが取った正確なmanifest形式を示す。 |
| 81 Copilot Plugins の詳細 | US2 | Copilot pluginを選択すると、コンポーネントをロードせずに、全carrierの作成済みメタデータが表示される。 |
| 82 統合 Plugins インベントリ | US1 | ユーザーは、作成済みpluginに対するサポート対象のすべての解釈を名前ごとに1行として理解できる — inline MCP mapはそのcarrier自身のcontentとして、読み取り不能なコンポーネントパスの傍らに見える。 |
| 83 Plugins 比較 | US3 | ユーザーは、コンポーネントをロードまたは実行せずに1つのplugin名の2つのコピーを比較できる。 |
| 84 Codex の独立 Hook ファイルインベントリ | US1 | ユーザーは、コマンドを一切実行せずに独立 Codex hook ファイルをフィルタリングできる。 |
| 85 Codex Hook の詳細 | US1 + US2 | Codex Hook 認識を選択すると、実行せずにその宣言が表示される。 |
| 86 Claude の内包 Hook 宣言 | US1 | ユーザーは、捏造された hook ファイルを見ることなく、所有ファイル上の Claude 内包 Hook 認識をフィルタリングできる。 |
| 87 Claude Hook の詳細 | US2 | Claude Hook 認識を選択すると、実行せずにその宣言が表示される。 |
| 88 Copilot の独立 Hook ファイルインベントリ | US1 | ユーザーは、独立 Copilot hook ファイルをフィルタリングできる。 |
| 89 Copilot Hook の詳細 | US1 + US2 | Copilot Hook 認識を選択すると、実行せずにその宣言が表示される。 |
| 90 統合 Hook インベントリ | US1 | ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。 |
| 91 Hook 比較 | US3 | ユーザーは hook 宣言を実行せずに比較できる。 |
| 92 Repository インベントリの受け入れ | US1 | 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。 |
| 93 Repository 詳細の受け入れ | US2 | 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。 |
| 94 Repository 比較の受け入れ | US3 | 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。 |
| 95 Global 同意プレビュー | US4 | ユーザーは検査を有効にする前に、正確な Global root、exclusion、lexicalなvalidity stateを確認できる（read scopeは平易な言葉で説明する）。 |
| 96 Fixed-Member Global Enable基盤とCodex Batch Member | US4 | Controlはfixed tupleとone shared enable/batch operationを公開し、Codexはone possible memberとなり、atomic commit前にGlobal Sourceを一切publishしない。 |
| 97 Claude Global Batch Member | US4 | Claude admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 98 Copilot Global Batch Member | US4 | Copilot admission/scanningはseparate one-root candidate Source identityを保ちながらsame batchへjoinする。 |
| 99 Atomic Global Batch Result統合 | US4 | 別々に識別されるone-root member Sourceがexactly one completeまたはpartial generationで同時に現れ、detail/comparison workflowを再利用する。 |
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
  → Claude Rules Inventory → Claude Rules Detail
  → Permission Policy Shapes → Review Corrections → Claude Permissions Carrier
  → Claude Commands Inventory → Claude Commands Detail
  → Copilot Commands Inventory → Copilot Commands Detail
  → Unified Commands Inventory
  → Copilot Prompts Inventory → Copilot Prompts Detail → Prompts and Commands Comparison
  → Codex Custom Agents Inventory → Codex Custom Agents Detail
  → Claude Custom Agents Inventory → Claude Custom Agents Detail
  → Copilot Custom Agents Inventory → Copilot Custom Agents Detail
  → Unified Custom Agents Inventory → Custom Agents Comparison
  → Codex Configuration Recognition → Codex Configuration Detail
  → Claude Settings Inventory → Claude Settings Detail
  → Copilot Settings Inventory → Copilot Settings Detail
  → Unified Settings and Configuration Inventory
  → Claude Output Styles Inventory → Claude Output Styles Detail
  → Codex Plugins Inventory → Codex Plugins Detail
  → Claude Plugins Inventory → Claude Plugins Detail
  → Copilot Plugins Inventory → Copilot Plugins Detail
  → Unified Plugins Inventory → Plugins Comparison
  → Codex Standalone Hook Files Inventory → Codex Hook Detail
  → Claude Contained Hook Declarations → Claude Hook Detail
  → Copilot Standalone Hook Files Inventory → Copilot Hook Detail
  → Unified Hook Inventory → Hook Comparison
  → Repository Inventory Acceptance → Repository Detail Acceptance → Repository Comparison Acceptance
  → Global Consent Preview
  → Fixed-Member Global Enable Foundation and Codex Batch Member
  → Claude Global Batch Member
  → Copilot Global Batch Member
  → Atomic Global Batch Result Integration
  → Global Rescan and Recovery
  → Global Disable Barrier and Teardown
  → Documentation, Evidence, and Dependency Review
  → Cross-Cutting Verification
  → Release and Outcome Evidence
```

- Delivery milestoneは厳密に順次実行する。後続milestoneが先行product sliceを再利用して回帰テストするためである。Phase 96–99だけは単一composite milestoneであり、numbered sliceを順に実行するがPhase 96–98をgreenまたはrelease可能と宣言せず、real member portがall-real-port suiteをpassしたPhase 99だけがmilestoneをcloseする。
- 通常phaseではfixture/failing testをimplementationより先に行う。Phase-96–99 composite milestoneでは各sliceのtestをそのsliceのimplementationより先に行い、generic coordinator testはtyped port outcomeだけをinjectでき、all-real-port acceptance suiteはPhase 99までredのままとする。Implementation sectionはtest fileを編集しない。
- フェーズ 15 は純粋な Codex fallback 宣言インターフェースを定義し、carrier を構成入力としてのみ読み、pin された seed path を持つ `codex.derived.fallback-basename` を登録して configured instruction fallback を有効化する。フェーズ 23 が carrier を初めて受け入れて Codex MCP 宣言を関連付け、フェーズ 24 がその詳細を出荷する。
- フェーズ 27 は、Claudeの明示的carrier境界を確定する: root carrierだけがMCP recognitionを持ち、settings、custom-agent、marketplace、plugin-manifestのfileは後続のどのphaseでも、MCP-spelling構成を自身の宣言contentとして表示する。フェーズ 32 はCopilotに同じ境界を確定した。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*
- フェーズ 57～58 は、すでに受け入れられた Codex configuration carrier を `settings/config` 認識と完全な詳細表示で拡張する。二つ目の候補、物理読み取り、fallback ルール、MCP 認識は追加しない。
- Marketplace の詳細を plugin-manifest インベントリより先に行い、検証済みのローカルソース宣言だけが 1 つのdirect one-edge derivationのシードになれるようにする。
- フェーズ 61 は、以前の MCP フェーズでパス不一致のまま保持した Copilot VS Code settings の正確な除外を所有する。フェーズ 77 と 79 も同様に Codex と Claude の正確な plugin-file 除外を所有し、受け入れ済み候補を変えずに以前の MCP パス不一致コンテキストを更新する。
- すべての所有者ファミリーを Hook 認識より先に行う。内包 Hook 認識はすでに受け入れられた所有者を再利用する。一方、priority MCP 認識は明示的carrierだけを介して先に提供する — MCPにcontained機構は存在しない。
- フェーズ 96 はgeneric selector-free fixed-member coordinator、3つのclosed typed admission port、Codex real port、test-only injected outcome coverageを確立するがproduction all-member activationを主張しない。フェーズ 97〜98 は同じopen composite milestoneへreal Claude/Copilot portをbindする。フェーズ 99は全real portを通じてfixed-member permutationを再検証しendpoint/atomic publicationを完成させ、全admitted separately identified one-root Sourceをexactly one completeまたはpartial generationで同時にpublishする。その時点だけcomposite milestoneをgreenとし、その後のexplicit Global rescanはsingle-Source operationのままとする。
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
- Global vendor boundary testは分離されたfixture rootを使用するが、フェーズ 96〜98はone shared fixed-member consent/admission/batch contractとdistinct per-tool control/context projectionを追加するためmilestoneとしては順次実行する。Tentative workはフェーズ 99のatomic batch integrationが存在する前にはSourceを決してpublishしない。
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

1. Codex、Claude、Copilot の完全な SKILL 一覧/詳細パス、一度だけ読み取る共有インベントリ、SKILL 比較を提供し、その後 generic comparison が census 公開された `agents/openai.yaml` companion をカバーすることを検証する *(2026-08-01 修正: フェーズ 6 の決定後、`skill metadata` recognition は出荷されません。フェーズ 14 参照)*。
2. 三ツールすべての静的 Instructions 一覧/詳細マイルストーンを提供する。Codex の設定済み fallback は自身の Instructions フェーズとともに到着し、そのフェーズは `.codex/config.toml` を受理も公開もせず構成として読む。
3. 最初の MCP フェーズで最小の Codex `.codex/config.toml` carrier を受け入れ、そこで内包 MCP 宣言を有効化する。settings/config 項目としてはまだ表示せず、source text も一切表示しない（FR-007）。
4. 独立した Claude、Copilot CLI、Copilot VS Code MCP ファイルを直ちに提供する。すでに受け入れられた skill 所有者に対する内包 MCP サポートと、MCP surfaceに合流するのは明示的なMCP構成だけとする: settings、custom agent、marketplace、plugin manifestは、各自のphaseが出荷された時点でMCP-spelling構成を自身の宣言contentとして表示する。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*
5. 明示的carrierを統合し、その上でだけ完全なリテラルの MCP 比較を提供する。

### 優先ウェーブ 2 — Rules、Commands、Prompts、Custom Agents

1. Codex の permission policy と Claude の rule の一覧/詳細マイルストーンを提供し、続いて Claude の permission policy carrier を提供する。Copilot `.claude/rules` は明示的な初期スコープ除外のまま保つ。どちらの kind も比較を得ない: 比較は1つの同一性の2つのコピーを並べるものであり、行の単位が見つかった file 自身である row にはその同一性が無い（フェーズ39、取り下げ）。
2. Claude と Copilot の Commands 一覧/詳細マイルストーン、共有ファイル統合、比較を提供する。
3. 単一ベンダーである Copilot Prompts の inventory、detail、comparison マイルストーンを提供する。
4. Codex、Claude、Copilot の Custom Agents 一覧/詳細マイルストーンを提供する。各agentのMCP-spelling宣言はagent自身のdetail contentに留まり、MCP recognition、候補、ファイル再読み取り、合成ファイル/接続はいずれも追加しない。
5. 一度だけ読み取る共有 custom-agent fileを統合し、宣言値の比較を提供する。

### 優先ウェーブ 3 — 残りのカスタマイズ

1. 既存の Codex carrier を完全な configuration 認識/詳細へ拡張し、続いて Claude と Copilot の settings を提供する。settings fileのinline MCP mapは自身の宣言contentに留まりMCP recognitionを持たず、Copilot instruction enablement を再投影する。Copilot settings は MCP 所有者にしない。 *(amended 2026-08-20: MCP surfaceに合流するのは明示的なMCP構成だけである。他のkindのfileが綴るMCP構成は、agentの`mcp-servers`も含め、そのkind自身のdetail contentとして見えるだけである。)*
2. Claude Output Styles を提供する。
3. Marketplaces を提供する。catalogが綴るMCP構成はcatalog自身のdeclared detail contentのままである。MCP surfaceに合流するのは明示的なMCP構成だけだからである。
4. marketplace のローカルソース検証後に Plugin Manifests を提供する。manifestのinline MCP mapはmanifest自身のdeclared detail contentのままである。
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

### 明示的carrier MCP境界

1. MCP surfaceに合流するのは明示的なMCP構成だけである: MCP kindのrecognitionは明示的carrier ruleだけから生まれ、contained-owner機構は存在しない。 *(amended 2026-08-20: owner-adapter activationのpathは他のkindのfileにMCP recognitionを付けることになるため、このsectionは境界を明示的なcarrier ruleに保つ。)*
2. MCP風の構成を綴る他のあらゆるkindのfile — agentの`mcp-servers`、plugin manifestやsettings fileのinline map、skillのfrontmatter — はそのkindのrecognitionだけを持ち、その構成は自身のdetailに書かれた宣言として表示され、どのMCP row、`get-mcp-carrier-detail` resource、MCP comparisonにも合流しない。
3. Codexの受け入れ済みconfiguration carrierはそれ自体が明示的carrierである: その`[mcp_servers.*]` tableは自身のrecognitionが公開するMCP rowであり、fallback宣言と後段のconfiguration表示の横に立つ。
4. HookフェーズはcontainedなHook recognitionをすでに受け入れられた所有者へ関連付け、Claudeの独立hookまたは合成ファイルを決して作成しない — Hookのcontainment機構はHook自身のものであり、MCP境界の影響を受けない。
5. 統合フェーズと受け入れフェーズは、比較前にcarrierを一度だけ読み取る組み立てを証明し、carrier以外の項目を選択可能なMCP比較ファイルとして拒否する。

### 一覧行への宣言済み skill 名の表示

Skill の authored な `name` は独立した値で、`SKILL.md` の frontmatter にあり、格納 directory と
一致する必要はない。したがって読み手が path から復元することはできない。以下はそれを row に載せる。
Skill row が示す名前は、認識した tool がその file を呼び出す名前 — Codex と Copilot は
authored な `name`、Claude Code は skill directory で、nested なら root 相対の prefix 付き
（FR-007、T1081）— であり、その `name` を含むすべての宣言は detail の frontmatter 一覧と
完全な `sourceText` から読み手に届く（T090）。

- [X] T1064 [US1] Recognition が、その tool が skill を呼び出す名前を運べるよう `src/shared/api-types.ts` の wire
  contract を改訂し、`specs/001-inspect-agent-customizations/data-model.md` と `data-model.ja.md` の §
  ToolRecognition に、一覧はこの 1 つの authored 値を運び、それ以外の宣言済みの値へは FR-027 の detail surface を通じて file 1
  つずつだけ到達できることを明記する。FR-007（`spec.md`/`spec.ja.md`）には、名前が content ではなく presentation identity
  である理由を記録する: product 自身の skill 一覧が表示する名前であること、Source 相対 Path から復元できないこと、そして自らが列挙するものを名指せない一覧は
  inventory ではないこと。Recognizer が名前を抽出しなかった場合、field は empty ではなく absent とする。 *(2026-07-29修正: 1
  fileへの明示的なrequestで届くdetail surfaceが境界のすべてになった。)* *(2026-08-05 修正:
  名前はrecognitionのkind判別detailsに載る（T1068/T1073）。根拠もselector identifierではなく一覧の表示labelである。)*
  *(2026-08-23 修正: 運ぶ値はadmitしたruleが解決したinvocation
  nameであり、nullにはならない。自身が抱えるtoolが応じない名前を見出しに持つrowは、読み手が呼び出せないものを名指すからである。宣言された`name`は、他の宣言と並んで公開されるfrontmatterから読み手に届く。)*
- [X] T1065 [P] [US1] 宣言済み名の失敗テストを追加する。Frontmatter の `name` が authored のまま recognition の details
  に載ることを証明する recognizer test（`name` が directory と異なる skill と、`name` を持たない skill
  を含む）。一覧行がtoolの呼び出す名前でkeyされることを証明する unit test（描画そのものの検証はbrowserだけで行う。unit
  projectはcomponentをmountしないため — T058）。そしてtoolがauthoredな名前を呼び出す場合、描画された行がその名前を示し、directory
  segmentに上書きされないことを証明する `tests/e2e/codex-skills-list.spec.ts` の browser acceptance。 *(2026-08-08
  修正: T1081のrow単位へ整合。2026-08-23: row単位は各toolが呼び出す名前であり、CodexとCopilotのrowはauthoredな名前（skill
  directoryフォールバック付き）を保ち、Claude Codeのrowはskill
  directory自身になる。Recognitionが運ぶのはその解決済み名前であり、宣言は公開されたfrontmatterを通じて検証に届く。)*
- [X] T1066 [US1] `src/server/inspection/recognizers/candidate.ts` で、admit した rule に 1 回の parse
  が解決した宣言を渡して invocation name を設定する。これにより row が group 化に使う名前と detail が示す宣言は同じ parse から来る。Extractor が
  parse しきれない document はその recognition を all-or-nothing で失敗させ、宣言を公開しない（FR-028）。authored な名前を呼び出す
  rule はそのとき skill directory へフォールバックする。これは path 自身の事実である。Rule が `name` key を読む場合は解決済み scalar そのもの —
  trim・大文字小文字の変更なし — を採る。Authored literal ではなく値を採る: quote された `name` が宣言するのは quote の内側の文字列であり、それが
  vendor 自身の一覧が表示する名前である。したがって quote 文字を display name
  に持ち込むと、その一覧が決して含まない文字列を見せることになる。*(2026-07-29修正: allowlisted
  extractorが実行されるようになったため、名前はそれが公開するentryから読む。)* *(2026-08-04 修正:
  recognizerは両vendorで1つになり、名前はcatalog entryではなくfile自身の`name`
  keyである。Extractorが完了できないparseはfieldをabsentにするのではなくrecognitionを失敗させる。)* *(2026-08-23 修正:
  どの事実がskillを名付けるかはadmitしたvendor自身のcontractであるため、ruleが答え、recognizerは`name` keyを自分で読まなくなった。)*
- [X] T1067 [US1] そのkindのrow component（`src/app/components/inventory/rows/`） で、Source 相対 Path
  の隣に宣言済み名を描画する。名前は authored text であり、inert で、locator ではなく、行の identity として path を置き換えない。異なる
  directory の 2 つの skill が同じ名前を持ちうるからである。
- [X] T1081 [US1] 各 skill inventory row を、認識した tool が呼び出す名前で key する（spec.md § Clarifications Session
  2026-08-08 と Session 2026-08-23、FR-007）: その名前は tool 自身の文書がその file を呼び出す名前であり、名前が path
  と宣言からどう導かれるかは その vendor 自身の contract であるため、admit した rule が答える — Codex と Copilot は authored な
  frontmatter `name` を、Claude Code は frontmatter の宣言に依らず skill directory を呼び出し、nested な skill の
  command には `.claude` を保持する directory の root 相対 `/`-joined path と `:` を前置する。したがって `name: ship`
  を宣言する `apps/web/.claude/skills/deploy/SKILL.md` は、Claude Code row では `apps/web:deploy`、Copilot row
  では `ship` である。prefix は常に付ける。vendor の衝突条件付き prefix は、この製品が決して観測しない session working directory
  相対だからである。名前を宣言しない — または空で宣言する — file はその skill directory で呼び出されるため、`name` が null に
  なることはなく、nameless な per-file row は存在しない: 同名 directory に置かれたそうした 2 つの file は、1 つの tool が 1
  つの名前で呼び出す他の file と同様に row を共有する。各 vendor の skill rule をそれに答える unit へ compile
  し（`src/server/inspection/rules/registry.ts` の `CompiledStaticSkillRule`。共有される authored-name の答えは
  `declaredAgentNameOf` の傍らに置く）、command recognition が自身の 名前を解決するのと同じ形で
  `ToolRecognition.recognizeSkill` が 1 度だけ解決し、row の `name` としてのみ公開する（contracts/http-api.md §
  get-session `skills[]`）— 定義は自身の 名前を運ばない。row の傍らの第 2 の複製は、事実とそこから導出した値の二重公開になるから である。recognition ごと
  — `(file, tool)` 単位、`definitions[].tool` が名指す — に 1 定義を 公開し、各定義は file の census を運ぶ。各 tool の
  same-name statement はその collision policy の per-view gate — Claude のものは generation 全体の skill
  directory に跨る（`src/shared/registries/claude/skill-collision.ts`）— で gate し（projection
  が適用し、`src/app/composables/filters.ts` の filtered view が可視の定義から再構築する）、skill detail の見出しは row
  自身の名前とする。detail route は file の identity である `/skills/detail/<source>/<Source相対パス>` で address
  し、companion も同じ route の下で開く。名前は path と同じ制御文字 escaping で描画する。 *(2026-08-23 修正: row の key を、すべての
  tool が共有する authored な `name` から各 tool が呼び出す名前へ変更した。自身が抱える tool の一つが応じない名前を見出しに持つ row
  は、読み手が呼び出せないものを名指すからである。定義ごとの invocation name と detail の 2 つ目の 名前行も、row 自身の事実であるため併せて削除した。)*
- [X] T1082 [US1] Source-relative Path を file の identity 全体にする（FR-030）: 世代ごとの opaque な `fileId` を
  wire と内部から除去する —
  `CustomizationFileDto`/`CustomizationFileSummaryDto`、`ToolRecognitionDto`、`SkillDefinitionDto`、そして
  Diagnostic の location shape（file scope は coherent な `sourceId`/`sourceRelativePath` pair になる）—
  。`get-file-detail` request は path で key し、`src/server/session/scan-generation.ts` の commit 時 ID
  rekey を削除して、attempt が構築した record をそのまま publish する。Commit はsnapshotの採用を通じて以前の generation の client
  state を無効化する:
  新しいgenerationの採用は開いているdetailを閉じ、routeが同じpathをその下で再要求する。採用済みsnapshotより新しいgenerationから応答されたdetailは、その採用まで保留され、現在のcommit済みgenerationが保持しないpathは
  `stale-resource` rejection となる。Path は既に定義の route identity だったため、その傍らに opaque な別名を publish
  することは、食い違い得る 1 つの事実の 2 つの綴りだった。
- [X] T1083 [US2] detail responseをfileの所有者で判別し、parseを1回だけpublishする（contracts/http-api.md §
  get-file-detail）: `FileDetailDto`は`SkillFileDetailDto` —
  `kind: 'skill'`、file、`presentation`（scan時の1回のparse:
  `frontmatter`と`bodyText`。failedなextractionでは正確にnull）、fileのdiagnostics —
  と、recognitionが所有しないfileのための`UnrecognizedFileDetailDto`（`kind: 'file'`）のunionになる。toolごとの`recognitions`
  arrayはwireから去る: parseはfileの事実であり — shippedな全vendorは同じ固定YAML semanticsを読む — 認識tool・invocation
  name・parse stateはinventoryの`definitions[]`にあるため、copyは食い違うことしかできない。admissionはrelationship
  phaseのための内部recordにとどまる。kindごとに1回のextractionは1件の失敗recordであり（FR-028）、そのkindの失敗した各定義が共有し、fileは1回だけ列挙する。`ToolRecognition`と`CandidateProvenance`は`src/server/inspection/recognizers/candidate.ts`のclassになる
  — wire shapeではなくなった内部のsingle-producer recordであり、`CandidateProvenance`は保持するcompiled
  ruleからrule識別子を導出する。recognize seam（`CandidateRecognition`）はliteral doubleで満たすinterfaceのままとする。detail
  pageは定義行をinventoryから導出してpresentation blockを描画し、`RecognitionSummary.vue`はそれが描画していた一覧とともに削除される。

### Recognition summary に provenance count が必要か判断する

1つのrecognitionを裏づけるadmission数には読み手がいない。Shipped ruleでは常に1であり、
`rule admission`は読み手が行動を起こせる情報ではなくregistryの語彙であり、数が限定するであろう
内容はrowが既に述べている。Field自体をどうするかは、このtaskが決める。

- [X] T1068 [US2] 1つのrecognitionを裏づけるadmission数を読むsurfaceは無い:
  各kindの一覧が自前になった時点で（T1073–T1078）fileはrecognition
  summary自体を公開せず、admissionはsurfaceが読み上げるものではなく読み取り認可のrecordである。`RecognitionSummaryDto`とその`provenanceCount`は`src/shared/api-types.ts`からもsession射影からも削除済み。Record自身の`provenances`は残す。各admissionは自身の読み取りを認可したruleを名指すからである。`specs/001-inspect-agent-customizations/data-model.md`と`data-model.ja.md`の§
  ToolRecognitionに明記済み。 *(2026-08-04 修正: provenanceを示すsurfaceが無いため、admissionが運ぶのは読み取りを認可したもの —
  `ruleId`、`discoveryClass`、`matchedPath` —
  だけである。scopeやorderのdescriptorは運ばない。これらは本製品が行わないprojectionの語彙であり、path
  scopeは隣の`matchedPath`を言い直すことにもなるためである。)*

### Admit済みskillのcompanion file

Skillはfileではなくdirectoryである。`SKILL.md`はそれが使うscript、reference、assetの傍らに
置かれ、`SKILL.md`だけを名指すrowでは、scriptを20個持つskillと1つも持たないskillが同じに見える。
認識したskillに付随するものをlistにするのがbounded census — admit済みcandidate自身のdirectoryだけを
起点とする列挙 — であり、以下がそれを追加する。

- [X] T1069 [US1]
  `specs/001-inspect-agent-customizations/contracts/inspection-path-allowlist.md`と`.ja.md`にbounded
  companion censusを追加する: directoryであるkindのadmit済みcandidateについて、それを含むdirectoryを再帰的に列挙し、付随するregular
  fileをlistにする。適用可否は認識されたkindが決めることを明記する。Directoryであることはkindの正体の一部であり、rule単位のflagはkindが既に決めていることを二重に述べるだけだからである。したがってcensusはそのkindのrecognitionごとに必ず実行され、その結果
  — recognitionが裏づけるinventory定義の上で1回だけ公開される（T1074） —
  はadmitされたfileが単独なら空になる。結果は件数ではなくsort済みのSource相対Path listであることを明記する。Inventory rowが件数を示し、file detail
  viewが各fileを名指すためであり、1つの事実はそれ自身と食い違えないからである。列挙はbyteを読まずcandidateをadmitしないこと、scanが列挙された各fileを通常のread
  pathで正確に1回読みgenerationの通常fileとして公開すること —
  そのbyteは`readBytes`に数えられ、読めないものは`file-unreadable`を伴ってpartial commitとなる —
  を明記する。列挙はその1回のreadを超える権限を何にも与えず、Source rootを越えられない。VCS internalsとseed自身を除外すること、通常のwalkと同じreal-path
  cycle規則でsymbolic linkを辿ることも明記する。Admitではなく列挙である理由を記録する: 付随するfileはrelationship
  targetであり、そのedge経由で読まれることはないため（contracts/vendors/openai-codex.md § Presentation
  allowlist）、列挙がcandidateへの昇格になってはならない。*(2026-07-29修正: censusが列挙したfileはscanが読んで公開する —
  contracts/inspection-path-allowlist.md § Bounded companion census。)* *(2026-08-07修正:
  census結果はinventory定義の`companionFiles`として1回だけ公開する — 同じlistの2つ目の綴りは食い違い得るため。)* *(2026-08-24修正:
  recognizerは認識されたcustomizationが占めるdirectoryを名指すだけで何も読まない。`scan.ts`が名指されたdirectoryを1つずつ列挙し、その結果をgenerationの通常のfileとして公開する。定義が示すfile
  listは`projectSkillInventory`でそのpathから導く。1つの列挙箇所がskill自身のdirectoryとcatalogが名指すplugin rootの両方を担う。)*
- [X] T1070 [US1] Censusをrule
  recordにもcompile済みplanにも持たせない。`src/shared/registries/rule-types.ts`の`InspectionRule`はcensus
  scopeを宣言しない:
  認識されたkindが決めるため、recordのfieldは`kind`が既に運ぶ以上の情報を運ばず、そのために必要な閉じたunionはどのruleも取らないmemberを出荷することになる。Planも持たない
  — censusはwalkの一部ではないため、`src/server/inspection/traversal.ts`は汎用のallowlist traversalのままとする。
- [X] T1071 [P] [US1] Censusの失敗テストを追加する: listがnested directoryを含み、seedとVCS
  internalsを除外し、symlinkされたfileをentry自身のpathで列挙し、sortされ、link
  cycleで終了し、ancestorへのlinkを経てもcandidate自身のdirectoryより先へ下降しないことを証明するtest。追加のfileがadmitされず、列挙がbyteを読まないことを証明するtest
  — scanはその後列挙された各fileを1回読み、それはscan-publicationのtestが主張する。census
  listがskillのrecognitionsの傍らで返され、`SKILL.md`が単独ならabsentではなくemptyになることを証明するrecognizer
  test。Rowが件数を述べることを証明するbrowser acceptance。*(2026-07-29修正:
  censusが列挙したfileはscanが読んで公開する。no-byteの主張は列挙だけを対象とする。)* *(2026-08-07修正:
  census結果はinventory定義の`companionFiles`として1回だけ公開する。)* *(2026-08-24修正:
  recognizerは認識されたcustomizationが占めるdirectoryを名指すだけで何も読まない。`scan.ts`が名指されたdirectoryを1つずつ列挙し、その結果をgenerationの通常のfileとして公開する。定義が示すfile
  listは`projectSkillInventory`でそのpathから導く。1つの列挙箇所がskill自身のdirectoryとcatalogが名指すplugin rootの両方を担う。)*
- [X] T1072 [US1]
  `src/server/inspection/companion-census.ts`にcensusを実装し、recognizerの中、すなわち`src/server/inspection/recognizers/candidate.ts`で実行する。Recognizerはcandidateのpathと認識されたkindの両方を保持しているため、どのkindがcensusを求めるかを呼び出し側が知る必要も、先回りして計算する必要もない。Recognizerはlistをrecognitionsの傍らで返す。`src/server/inspection/scan.ts`
  — candidateの表示pathと並べてfilesystem pathを渡し、自身はcensusを行わない —
  がそれをcandidateのpathをkeyに集め、sessionがinventory定義の上で1回だけ公開する（T1074）。`src/app/components/inventory/rows/SkillRow.vue`ではlistの件数を描画する。File
  detail viewがfileごとに名指すのはこのlist自身であるため、件数はそこから導き、listの傍らに公開しない。*(2026-08-07修正:
  census結果はinventory定義の`companionFiles`として1回だけ公開する — 同じlistの2つ目の綴りは食い違い得るため。)* *(2026-08-24修正:
  recognizerは認識されたcustomizationが占めるdirectoryを名指すだけで何も読まない。`scan.ts`が名指されたdirectoryを1つずつ列挙し、その結果をgenerationの通常のfileとして公開する。定義が示すfile
  listは`projectSkillInventory`でそのpathから導く。1つの列挙箇所がskill自身のdirectoryとcatalogが名指すplugin rootの両方を担う。)*

### Kindごとの一覧の単位

Rowの単位はkind自身のものであり、物理fileと単位を共有するのは`instructions`と`settings/config`
だけである。Skillのrowは1つのtoolが解決した名前1つ — authoredな`name`、宣言しないfileはskill
directory名、nestedなClaude Code recognitionはroot相対prefix付き — であり、directory名と一致
する必要はない。MCP serverはadmit済み`.codex/config.toml`内の1つの`[mcp_servers.*]` tableであり、
1つのfileは宣言したserverの数だけrowを公開する。Contained hookも同様である。file形のrow 1つでは
どちらのケースも表現できない: skillを名前でまとめると`(file, tool, kind)`ごとに1 recognitionという
規定と衝突し、file形のrowはN行になりようがない。

以下は2つの事実を分離する。Fileはfileのままとし — path、read結果、size、diagnostic — 各kindは
自身の単位をrowとする一覧を公開し、fileはそのSource-relative Pathで参照して、fileが既に述べていることを繰り返さない。

- [X] T1073 [US2]
  `specs/001-inspect-agent-customizations/data-model.md`と`data-model.ja.md`、`contracts/http-api.md`と`.ja.md`の§
  get-session、`spec.md`と`spec.ja.md`のFR-007に分離を記録する: 一覧rowの単位はfileではなくkindが決める。出荷済みkindが使う単位を明記する —
  skillは1つのtoolが解決した1つの名前、MCP
  rowは宣言されたserver名1つで、その名前を解決する全宣言をrow内に列挙するもの、instructionsは1つの適用範囲とそれが担当するfileの列挙 *(2026-08-18修正:
  instructionsの単位は範囲である。repositoryの`AGENTS.md`と`CLAUDE.md`が並ぶようにするため（T1091）。)* —
  そして物理fileは自身の事実とともに1度だけ公開され、各kindの一覧はSource-relative Pathで参照することを明記する *(2026-08-08 修正: 参照はpathである
  — T1082が世代ごとのfile IDを除去した)*。理由も記す: row単位とはvendor自身の一覧が使う単位であり、file形のrow 1つでは、複数fileが共有する名前も、1
  file内の複数宣言も表現できない。 *(2026-08-08 修正: T1081のrow単位へ整合 — すべてのrowはtoolが解決する名前でkeyされ、skill
  directoryフォールバックを持つため、namelessなper-file表示はもう存在しない。)* *(2026-08-20修正: 出荷済みのname-headedなMCP rowに整合 —
  宣言されたserver名ごとに1 rowで、その名前を解決する全宣言をrow内に列挙する。`McpInventoryEntryDto`を形作った決定による。)*
- [X] T1074 [US2] `src/shared/api-types.ts`のwire contractにskill一覧を追加する:
  snapshotはskillをtoolが解決する名前をkeyとするentryとして公開し、各entryはその定義（`SKILL.md`のSource-relative
  Path、認識するtool、companion
  file）を持つ。`CustomizationFileSummaryDto`から`recognitions`を削除し、物理file自身の事実だけにする。Kindごとのpayloadはkindの一覧へ移り、`RecognitionDetails`は、あらゆるkindがoptional
  fieldで広げる1つの形ではなく、kind判別のpayloadであり続ける。定義はfileをSource-relative
  Pathで名指し、fileが既に公開しているfile-scopedな事実を繰り返さない *(2026-08-08 修正: 参照はpathである — T1082が世代ごとのfile
  IDを除去した)* *(2026-08-08 修正: 定義は自身のrecognitionの`parseStatus`と、そのkindのextraction失敗referenceを運ぶ —
  recordは`(file, kind)`ごとに1件で、fileの失敗した各定義が共有し、fileが1回だけ列挙する（T1083）。)*。
- [X] T1075 [US2] `src/server/session/session.ts`でskill一覧を射影する: commit済みskill
  recognitionを各toolがfileを呼び出す名前で決定的な順序にgroupingする — 宣言済み名を呼び出すtoolが名前を見つけられないfileはskill
  directoryフォールバックが名付ける。射影は既に読んでいるcommit済みgenerationを読むだけで、filesystem操作は行わない。 *(2026-08-08 修正:
  T1081のrow単位へ整合。2026-08-23: 名前はrecognition時にadmitしたruleが解決するため、射影は名前を解決せず公開された値でgroupingする。)*
- [X] T1076 [US2]
  各toolが同名skillをどう解決するかを`src/shared/registries/skill-resolution.ts`と`src/server/session/session.ts`で公開し、groupingされたentryがInspectorの記録していない優劣を暗示しないようにする。出荷済みの記述は異なる
  — Codexは同名skillをmergeせず両方が有効なまま残り、文書化された順序は無い（`codex.skills.discovery`）。Claude
  Codeは1つのroot内ですべてを残し、作業中のfileに合うvariantを選ぶ（`claude.skills.selection`）。Copilot CLIは文書化されたsource
  orderの最初を解決する（`copilot.cli.skills.selection`）。VS
  CodeのCopilotは重複時の優先順位が文書化されていない（`copilot.vscode.skills.selection`）。したがってentryは、その定義のうち2つ以上を認識するproductごとに1つの解決規則を運び、browserで書き直すのではなくvendorの出荷済みcomposition
  strategyから取得する。記述を公開するのはstrategy recordが出荷されているproductだけとする: skill
  ruleを持たないproductはskillを認識しないためどのentryも到達せず、今その他の記述を書けば照合対象の無い主張をproductへ置くことになる。Productがskill
  ruleを出荷したのに記述を欠く場合に失敗するcontract gateを追加する。定義が1つのentryは何も述べない: 解決すべきものが無いからである。 *(2026-08-04 修正:
  記述は衝突に直面しているtoolのものなので、定義の1つしか認識しないtoolは何も公開しない。)* *(2026-08-04 修正: Claudeの記述を公式ページに合わせて訂正した —
  1つのroot内ではsame-name skillはすべて残り、nestedなものはdirectory-qualified
  commandで呼ばれ、Claudeは作業中のfileに合うvariantを選ぶ。enterprise > User >
  projectのprecedenceはlevel間の規則であり、InspectorはlevelをSourceとして別々に列挙する。)*
- [X] T1077 [US2] `src/app/components/inventory/`でskill tabをskill一覧から描画する:
  rowは解決された名前1つ、その下に物理fileごとの項目が1つずつ並び、各項目はそのfileのSource相対Pathとcompanion censusを1回だけ述べ、fileの下に認識 —
  認識するtoolごとに1行のdefinition — が並ぶ。 *(2026-08-16 修正: fileごとのgroupingへ —
  複数のdefinitionが1つのfileを名指し得るため、fileの事実をtoolごとに繰り返すと、読者は同一の行を見比べて1つのfileだと気づくことになる（同じ非反復はT1078が所有する）。)*Entryの定義のうち2つ以上を1つのtoolが認識する場合、rowはそれらを順序づける代わりにそのtoolの同名解決規則を述べる。
  *(2026-08-04 修正:
  記述は衝突に直面しているtoolのものなので、定義の1つしか認識しないtoolは何も公開しない。)*`InventoryList.vue`が表示中のkindでdispatchし、そのkind自身のrow型を描画する。Rowごとのdispatcherでは不可能である。Kindごとにrowの取るpropsが異なるからである。Kindを持たないfileは全tabの外で`UnclassifiedList.vue`が一覧する。
- [X] T1078 [P] [US2]
  分離を`tests/unit/app/inventory.test.ts`、`tests/contract/http-api-session.test.ts`、`tests/e2e/codex-skills-list.spec.ts`で検証する:
  1つの名前を宣言する2つの`SKILL.md`が2定義を持つ1 entryとして公開され、2つの名前なら2
  entryになることを証明する射影test。名前を宣言しないfileがauthoredな名前に合流せずskill
  directory名でgroupingされることを証明するtest。Fileの事実が1度だけ公開され定義ごとに繰り返されないことを証明するtest。重複した名前が1つのrowとして描画され、各toolの解決規則を述べ、両方のpathを名指すことを証明するbrowser
  acceptance。

- [X] T1079 [US2] Fileが自身の事実だけを公開するようになった今、file単位のparse
  rollupがどこに属するかを判断し、同じ変更でその判断を実行する。`parseSummary`はfileのrecognitionのparse状態を集約したものだが、fileはもうrecognitionを運ばない:
  読むsurfaceは無く、集約対象のrecognitionは各kind自身のrowにgroupingされている。読むsurfaceがある場合にだけ残す —
  kindのrowは既に自身の定義のdiagnosticを運ぶため、その傍らのfile単位のrollupは読み手が行動できることを何も述べないかもしれない。どこも読まないなら、`src/shared/api-types.ts`の`CustomizationFileSummaryDto`から`parseSummary`を削除し、`src/server/session/session.ts`の射影を落とし、`contracts/http-api.md`/`.ja.md`の§
  get-sessionと`data-model.md`/`data-model.ja.md`の§
  CustomizationFileを更新する。Record自身の`parseStatus`は残す。Recognitionが何に失敗したかを示すものであり、detail
  viewがそれを示すからである。 *(2026-07-29完了:
  読み手が存在しない。`parseSummary`はsummaryとdetailの両DTO、scanの`projectParseSummary`、`contracts/http-api.md`/`.ja.md`と`data-model.md`/`.ja.md`から削除した。recognition自身の`parseStatus`がparseの事実として残る。)*

- [X] T1080 公開browser bundleが必要とするthird-party
  noticeを同梱する（FR-043）。`scripts/third-party-notices-plugin.mjs`で完成したbundleからlistをderiveし、bundle済み各packageのnotice
  fileを収集して、`./nuxt.config.ts`へpluginを登録し、公開browser
  outputへdocumentをemitする。`tests/package/third-party-notices.test.ts`でゲートする: packaged
  fileが存在し、bundle済みeditorのcopyright holderとMIT permission
  textを運び、bundleがcodeをinlineする全packageを列挙し、package
  managerが利用者のためにinstallするdependencyを載せず、列挙した各packageに本文があること。

- [X] T1098 macOSで、新しいtabを開く前に、既に開いているsession
  tabを再利用する（2026-08-19）。自動openingが有効な場合、`src/server/host/browser-opener.ts`のstartup
  openerがprocess一覧（`ps cax`）から起動中のChromium系applicationをprobeし、起動中であれば固定の埋め込みJXA再利用scriptをOSの`osascript`
  automation hostで実行する — session originを既に表示しているtabをfocusしてreloadし、空のnew-tab
  pageをretargetし、それも無いときだけそのbrowserに新しいtabを開く —
  。それ以外のすべての場合は、hostが`src/server/host/devframe-app.ts`を通じて呼び出す`open` package
  helperへfallbackする。Openerのplatform分岐、固定引数のboundary、fallbackを`tests/unit/host/browser-opener.test.ts`で、hostの配線を`tests/contract/host-startup.test.ts`でcoverし、child-processとprobeの各条項を`specs/001-inspect-agent-customizations/spec.md`（FR-001、FR-022、§
  Clarifications）、`research.md` § 3、`plan.md`、`quickstart.md`、`contracts/http-api.md` § Host
  requirementsで両言語とも修正する。

- [X] T1099 Manual verification用に決定論的なfixture
  repositoryを配信する（2026-08-19）。`scripts/serve-fixture.ts`の`pnpm run start:fixture [name] [cli flags...]`が、指名されたfixture
  treeを —
  このlauncher向けに明示rootを受け取る、`tests/fixtures/repositories/build-fixtures.ts`がexportするbuilder群を通じて —
  git-ignoredな`.tmp/fixtures/`配下に再構築し、packaged
  `dist/cli.mjs`で配信する。これによりmanualな確認は、手組みの類似treeではなくsuiteがassertする対象と同一のtreeに対して行われる。Launchごとにそのfixtureの前回treeを置き換え、その後はinspection用にdisk上へ残す。Scriptを`./package.json`に登録し、`.tmp/`を`./.gitignore`、`./.prettierignore`、`./eslint.config.js`のignoresで除外し、launcherを`quickstart.md`
  § Local Inspectorをmanual実行に両言語で記載する。その際、repositoryが同梱しないstaticなfixture
  directoryを指していたroot-selection例を置き換える。 *(amended 2026-08-21:
  `all`という名の合成fixtureがlauncherのdefaultとなり、`buildAllCustomizationKindFixture`を通じてすべての`all-*`
  treeを1つのrootに構築するため、1回のlaunchで3つのinventory全部を配信する。MCPとinstructionの両builderがそれぞれ全体を書き込む2つの`.codex/config.toml`
  pathは、両者の出力の連結 — TOMLの要求どおりtop-levelのfallback keyが先、server tableが後 —
  に書き直され、mergeされたcarrierが両方のreaderに読まれることを`tests/integration/repository-scan.test.ts`が証明する。)*

- [X] T1122 読み手を一覧の離れた場所へ戻す（2026-08-22）。`src/app/pages/index.vue`の一覧自身のleave
  guardが、離脱するnavigationのたどる行linkと、その行がviewport上端からどれだけ下にあったかを記録し、一覧へ戻るページ変更がその行にfocusし、その行が置かれていた位置へscrollする。実装はどちらも`src/app/router.options.ts`
  — 何をページ変更と見なすかを既に所有するmoduleなので、ruleと復元するpointが1か所に収まる。戻り方2つを1つのruleが扱う。読み手の操作はどちらも同じだからである —
  browserのBackと、detail page自身の`Back to the inventory` link（後者は保存済み位置を持たない新しいhistory
  entryをpushする）。復元するのはdocument
  offsetではなく行である。そのため、一覧が読み手の知らないうちに変わっていても、たどった行の上に着地する。どの一覧かはURLの担当で、kind
  tabもSource・tool・pathのfilterもpageが書き戻すquery
  parameterである（T187）。よってbrowserのBackもreloadも貼り付けたlinkも同じ絞り込み後の一覧をrenderする。detail page自身のback
  linkは自分のkind tabを名指したままなので、そこから戻ると一覧全体に着地する —
  それでもたどった行はその中で画面に戻されfocusされる。offsetではなく行を復元するとはそういうことである。位置決めそのものはvue-router自身のelement scroll
  target — 行と、その行がviewport上端から何px下にあったか —
  に委ねるので、すでに同じ計算を行うrouterの隣に座標計算を書かない。Renderされたlinkに一致しない離脱と、detail routeが採用したgenerationがもう publish
  しない行は、どちらも通常のページ変更rule — 先頭へ、focusはshellの見出しへ — にfallbackする。rule全体 —
  同一ページのパラメータ変更、ページ変更、復帰、各fallback —
  を`tests/unit/app/router-options.test.ts`で、戻り方2つと、browserのBackで戻る絞り込み済み一覧とを、renderされたpageに対して`tests/e2e/inventory-return.spec.ts`で検証する。後者の短いviewportが、commit済み一覧をscrollさせる条件そのものである。

- [X] T1123 Commit済みfileをreader自身のmachine上のapplicationで開く（2026-08-22）。Detail surfaceのsplit
  buttonは、readerが最後に選んだapplicationでfileを開き、他の選択肢はchevronの下に提示する。Launchは常にhostが行う:
  絶対pathはhostのものであり、pageは他のrequestと同じSource-relative
  Pathしか持たないためである。`src/server/host/file-opener.ts`はportをbindする前にこのmachineを1度probeし —
  `which`でcatalog上の各editorのcommandを`PATH`から探し、続いて`env-editor`が維持するinstall場所を探す — 起動できるものだけを提示する:
  解決したeditor、次にfile種別に対するreaderの登録済みhandler、そしてそのhandlerをfile自身のdirectoryへ適用したもの。`src/server/session/session.ts`はそのopenerを保持し、提示するtargetをsnapshotへ導出し、何かをlaunchする前にopen
  requestをcommit済みgenerationへ解決するため、launchが受け取る絶対pathはsessionが公開したものだけになる。`src/server/host/devframe-app.ts`は`agent-customization-inspector:open-file`を、どちらのparameterにもshape
  guardを置かずに登録し、`src/server/cli.ts`がbootstrapでprobeを実行する。閉じたtarget集合と提示listは`src/shared/api-types.ts`、その表記は`src/shared/api-text.ts`、commandは`src/app/session/api-client.ts`と`src/app/session/view-state.ts`、controlは`src/app/components/inspection/OpenFileButton.vue`、記憶した選択とそこから選ぶ規則は`src/app/components/inspection/open-target-preference.ts`に置く
  — このapplicationが保存する2つの値のうち1つ（もう1つはpageを描くcolour
  scheme）であり、reader自身のmachineについてのpreferenceで、inspection由来のものを何も含まない。描画元は`src/app/pages/instructions/detail/[source]/[...path].vue`、`src/app/pages/rules/detail/[source]/[...path].vue`、`src/app/pages/permissions/detail/[source]/[...path].vue`、`src/app/pages/mcp/detail/[source]/[...path].vue`、`src/app/pages/skills/detail/[source]/[...path].vue`。Iconは`./nuxt.config.ts`で設定した`unplugin-icons`によりbuild時にcompileし、`src/app/icon-modules.d.ts`で型付けする。これによりpageは何もfetchしない。各icon
  collectionの帰属は`scripts/third-party-notices-plugin.mjs`が行い、自身のlicense fileを持たないbundled
  packageのupstream
  textを`licenses/@iconify-json/lucide.txt`と`licenses/@iconify-json/simple-icons.txt`から読む。新しい2つのproduction
  dependencyは`./package.json`で宣言し、`tests/package/production-graph.test.ts`と`tests/package/node-only-policy.test.ts`で承認する。Probe、提示、各launchは`tests/unit/host/file-opener.test.ts`、選択と記憶は`tests/unit/app/open-target-preference.test.ts`、functionの解決とstaleness
  outcomeは`tests/contract/http-api-open-file.test.ts`で、`tests/fixtures/file-opener.ts`のdoubleに対して検証する。そのdoubleは実物と同じく、自身が提示しないものを拒む。FR-022のchild-process条項は`specs/001-inspect-agent-customizations/spec.md`、function
  catalogと`open-file`は`specs/001-inspect-agent-customizations/contracts/http-api.md`、dependency
  recordは`specs/001-inspect-agent-customizations/research.md`、承認済みproduction
  setは`specs/001-inspect-agent-customizations/plan.md`を、いずれも両言語で改訂する。 *(amended 2026-08-22:
  macOSではreader自身の`$EDITOR`も対象に加わり、OSの`osascript` automation hostを通じてterminal windowを与える:
  `src/server/host/file-opener.ts`は固定scriptへeditorとpathをargumentとして渡すため、terminalが必要とするcommand行のquotingはここではなくそのhostが行う。)*

- [X] T1124 一覧のどのkindにも属さないfileをdisclosureへ畳む（2026-08-22）。このsectionは不在で定義される — inspection
  ruleがadmitしたが、どのkindのinventoryにも載らないfile —
  ため、読めないfile、binaryのfile、admitしたkindが公開するものを何も宣言していないfileを1つでも持つrepositoryには必ず存在し、常設sectionのままでは訪問のたびに、読んでいるkind
  tabの下で、説明文とすべての行を開いたまま置き続けていた。`src/app/pages/index.vue`はこれを、到着時に閉じている`details`要素としてrenderする。件数はsummaryに置き、見出しもsummaryの中に置くことでsectionはdocument
  outline上の位置を保ち、残りのcopyは開いたときにだけ述べる。`partial`というstatusが何についてのものかは、そのstatusを読む場所へ移す:
  `src/app/components/inventory/ScanProgress.vue`が、そのSourceのcommit済みfileのうちfile単位のdiagnosticを保持したものの件数を述べる（FR-028）。件数はsnapshotを所有するpageが公開済みfileから数えるので、背後のdiagnostic
  recordではなく、readerが開ける行に従う。`src/app/composables/filters.ts`では、tool選択がこのlistを空にするのをやめる:
  これらのfileはどのproductにも認識されていないため、どのtool選択も一致し得ず、tool選択で空にすることは`partial`なgenerationがそのfileについて持つ唯一の記述をpageから取り去っていた
  — 行はそのまま残し、pageはどのfileも属さないtoolの下に並べる代わりに、tool
  filterが適用されていると述べる。Tool選択下でも行が残ることを`tests/unit/app/inventory.test.ts`で、閉じた状態での到着、summaryの件数、述べられるdiagnosticの件数、disclosureの中の行を、そのようなfileをちょうど1つ公開するfixtureを持つ`tests/e2e/codex-permissions-inventory.spec.ts`でrender済みpageに対して検証する。これらの行を読む他のsuiteは`tests/e2e/no-kind-disclosure.ts`を通してsectionを開く。

- [X] T1125 起動が希望するportを述べられるようにする（2026-08-25）。devframeのdefault
  portは、このhostのどの起動も求められないまま手を伸ばす先であり、suiteの実行も手動の起動も、自分用にそれを握っている人からそのportを奪っていた。`src/server/cli.ts`の`--port <number>`は、parseされたまま`src/server/host/devframe-app.ts`のdevframe
  definitionの`cli.port`へ届き、devframeは自身のdefaultと同じ方法でそれを解決する:
  空いているportはそのまま使い、塞がっていれば別portへ移り、0は空きportの自動選択を求める —
  そのためどのportをbindするかはdevframeの決定のままであり、表示されるlaunch
  lineがそれを述べる唯一の場所であり続ける。Optionを省略した場合そのkeyは存在せずdevframeのdefaultが適用されるため、productは独自のdefaultで代替せず、値の再検査も行わない。`tests/e2e/launch-host.ts`と`tests/package/npx-launch.test.ts`は`--port 0`を渡し、これがe2e、performance、packageのsuiteを確保済みportから遠ざける（AGENTS.md
  § Agent-started process policy、英日両方）。転送される希望 — 0を含む。keyの不在とは別の意味を持つからである —
  を`tests/unit/cli.test.ts`と`tests/contract/host-startup.test.ts`で検証し、`spec.md`のFR-001と§
  Clarifications、`contracts/http-api.md` § Host requirements、`plan.md`、`research.md` §
  8、`quickstart.md`を英日両方で修正する（FR-001）。
- [X] T1126 文書化されたplugin sourceの全形式を読み、pluginのfileがどこから来るのかを述べる (2026-08-25)。catalog
  entryの`source`は1つの形 — `./` path、または`{ "source": "local", "path": … }`というobject綴り —
  だけを読んでいたため、それ以外の綴りはすべて同じ無言の答えに到達していた:
  ここにdirectoryは無い、という文言が、offeringがそもそも置いていないfileをこのrepositoryが欠いているかのように読め、GitHubから取得するpluginが壊れたlocal
  pathとして読めていた。`src/shared/api-types.ts`は各製品の文書化された形式を写し取った閉じた`PluginSourceForm`を持ち、`PluginDeclarationDto.sourceForm`としてrootから導出せず並べて公開する
  — Sourceの外へ出る相対pathは「読めた形式」かつ「名指せないdirectory」であり、npm packageはそもそもどのdirectoryも名指さない —
  各memberの読み方は`src/shared/api-text.ts`にある。各vendorの読み取りは自身の文書が挙げる形式だけを写す:
  Claudeの`github`・`url`・`git-subdir`・`npm`・`archive`・`command` object、`./`
  path、catalogの`metadata.pluginRoot`が解決するbare name。Codexの`local`
  objectまたは素の`./`文字列、`url`、`git-subdir`、`npm`。Copilotの相対pathと`github`・`url` object —
  これらを`src/server/inspection/rules/plugins/claude.ts`、`src/server/inspection/rules/plugins/codex.ts`、`src/server/inspection/rules/plugins/copilot.ts`に置き、共有の読み取りは`src/server/inspection/rules/plugins/plugin-source.ts`にある。vendorがどこにも文書化していない綴りは、静かにdirectoryが無いのではなく`unrecognized`であり、pluginの詳細画面と比較画面のmanifest
  sectionがそれを`src/app/pages/plugins/detail/[source]/[...path].vue`と`src/app/pages/plugins/compare/[family].vue`で述べる。`src/server/inspection/recognizers/candidate.ts`のcensusは最初のplugin
  admissionで止めず全admissionを読む:
  3製品すべてがadmitする1つのcatalogは、ある製品にはdirectoryを名指し他の製品には何も名指さないことがあり、最初で止めるとそのdirectoryが列挙されないままになるからである。読み取りは`tests/unit/inspection/rules.test.ts`、rowは`tests/integration/repository-scan.test.ts`、描画された画面上の2種類の不在は`tests/e2e/claude-plugins-detail.spec.ts`・`tests/e2e/codex-plugins-detail.spec.ts`・`tests/e2e/copilot-plugins-detail.spec.ts`で担保し、形式ごとに1
  entryのfixtureを`tests/fixtures/repositories/build-fixtures.ts`に置く。形式は`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`・`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`・`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`に、公開fieldは`specs/001-inspect-agent-customizations/contracts/http-api.md`に、reviewed
  sectionは`specs/001-inspect-agent-customizations/contracts/official-sources.md`に、いずれも両言語で記録し、維持されるparaphraseは`src/shared/registries/claude/rules.ts`・`src/shared/registries/claude/behaviors.ts`・`src/shared/registries/codex/behaviors.ts`・`src/shared/registries/copilot/behaviors.ts`、それらが具体化するconformance
  fixtureは`tests/fixtures/conformance/inspection-rules.json`と`tests/fixtures/conformance/vendor-behaviors.json`に反映する
  (FR-004、FR-007)。 *(2026-08-25 修正: discriminantはown keyだけで解決する —
  objectの添字ではなく`Map`を使う。`"source": "constructor"`はprototype上の関数に到達し、それをformとして公開していた。`metadata.pluginRoot`と
  bare
  `source`は`scalarKind === 'string'`を要求し、数値のrenderingがdirectoryになることはない。さらに`localPluginRootSegments`はpath契約のtokenizerそのものとし、先頭・末尾・連続したseparator、backslashとcolon、先頭segmentのhome
  marker、control character、unpaired surrogateをtarget I/O
  0件でrejectする（contracts/inspection-path-allowlist.ja.md § Common conformance requirements）。)*
  *(2026-08-25 修正: Copilot
  entryの文字列sourceは`./`を任意とするpathであり、宣言された`metadata.pluginRoot`配下に結合される。clientがそう解決するためである —
  `plugins/formatter`と`./plugins/formatter`は同一directoryであり、文字列がrepository短縮形になることはない（短縮形はCLIのmarketplace追加commandに属する）。plugin比較は、catalogが1つの名前を複数回宣言している場合にそれを述べる（diffしない側を黙って落とさない）。片側だけのfileは、それを持つ側から読む。2つ目のcopyだけが同梱する名前では何も要求していなかった。)*

- [X] T1127 plugin ruleに専用のdirectoryを与える (2026-08-25)。各vendorのmoduleは、そのvendorが認識する全kindを — plugin
  carrierを含めて — 抱えるまで大きくなっていた。plugin
  carrierは、ruleが別のdirectoryについての宣言を読む唯一のkindである。`src/server/inspection/rules/plugins/`がその読み取りと、それで答えるunitを持つ
  —
  `src/server/inspection/rules/plugins/claude.ts`、`src/server/inspection/rules/plugins/codex.ts`、`src/server/inspection/rules/plugins/copilot.ts`
  — 土台の`src/server/inspection/rules/plugins/compiled-rule.ts`はplugin
  ruleが答える契約を持ち、`src/server/inspection/rules/plugins/plugin-source.ts`は全vendorが同じ規則で検証する`./`起点のrootを持つ。各vendorのcompiled-rule
  baseは`src/server/inspection/rules/vendor/claude.ts`、`src/server/inspection/rules/vendor/codex.ts`、`src/server/inspection/rules/vendor/copilot.ts`へ移す。そのvendorのkind
  moduleとplugin
  moduleの双方がbaseをextendするため、どちらかにbaseを置くと他方から取り込み返すことになるからである。`src/server/inspection/rules/registry.ts`は自身が宣言しなくなったplugin
  contractを公開し、`src/server/inspection/rules/`の外のmoduleがplugins directoryをimportしないようにする:
  `src/server/inspection/recognizers/candidate.ts`は従来どおりregistry経由で到達し、vendorのplugin
  moduleを直接名指すのは`tests/unit/inspection/rules.test.ts`だけである。
- [X] T1128 instruction ruleに専用のdirectoryを与える (2026-08-25)。instruction fileが何を統治するかはinstructions
  inventoryのrow unitであり、各製品の答え方は異なる — root起点のlookupならRepository
  rootの`**`、directory単位の製品ならそのfileを置くdirectory、自分でrangeを宣言する製品なら宣言された内容 —
  そのためこれらの読み取りを`src/server/inspection/rules/instructions/claude.ts`・`src/server/inspection/rules/instructions/codex.ts`・`src/server/inspection/rules/instructions/copilot.ts`にまとめる。その隣で`src/server/inspection/rules/instructions/compiled-rule.ts`はこのkindのruleが答える契約
  — staticと派生の両方 —
  を持ち、`src/server/inspection/rules/instructions/applicability-range.ts`は導出されるrangeが共有するglobの綴りを持つ。rangeは厳密な綴りでgroup化されるため、directory名のescapeが製品ごとに違えば2つのrowになってしまうからである。Codexのconfigured-basename派生も同じkindのinstruction作業なので、そのunit、出荷されるinstance、seedのread、`project_doc_fallback_filenames`の読み取り、scanが呼ぶstageを一緒に移し、`src/server/inspection/rules/vendor/codex.ts`がそのvendorの派生baseをstatic
  baseの隣で持つ。`src/server/inspection/rules/registry.ts`が両kindの契約を公開し、`src/server/inspection/rules/codex.ts`が設定readを公開するので、`src/server/inspection/rules/`の外のmoduleはkindのdirectoryをimportしない:
  `src/server/inspection/scan.ts`と`src/server/inspection/recognizers/candidate.ts`は従来どおり到達し、直接名指すのは`tests/unit/inspection/rules.test.ts`・`tests/unit/inspection/recognizers.test.ts`・`tests/unit/inspection/codex-metadata.test.ts`・`tests/unit/inspection/seed-parsers.test.ts`・`tests/integration/repository-scan.test.ts`・`tests/integration/boundaries/traversal.test.ts`だけである。
- [X] T1129 prompt/command ruleに専用のdirectoryを与える (2026-08-25)。読み手がfileを呼び出す名前はこのkindのinventory
  unitであり、場所ごとに答え方が異なる — Claudeはcommands directory配下のpathを`:`で連結し`name` keyを読まない、Copilot
  CLIはroot直下のfile名を採る、VS Code prompt fileは読み手が打つ名前を宣言し無ければ自身のfile名に落ちる —
  そのためこれらの導出を`src/server/inspection/rules/prompts-and-commands/claude.ts`と`src/server/inspection/rules/prompts-and-commands/copilot.ts`に置き、後者はそのvendorの2つのunitを持つ。その隣で`src/server/inspection/rules/prompts-and-commands/compiled-rule.ts`はこのkindのruleが答える契約を持ち、vendor間の共有処理は置かない:
  差異は文書化された決定であり、共通の導出はある製品のnamespaceを、それについて何も書いていない別の製品に押し付けることになる。directory名は`src/app/pages/prompts-and-commands/`と同じく、inventoryが公開するkindの名前に合わせる。`src/server/inspection/rules/registry.ts`が自身で宣言しなくなった契約を公開するので、`src/server/inspection/rules/claude.ts`と`src/server/inspection/rules/copilot.ts`は残りのkindと、それらをcompileするrule
  listだけを持つ。
- [X] T1130 MCP ruleに専用のdirectoryを与える (2026-08-25)。carrierがどのserverを宣言しているかはこのkindのinventory
  unitであり、そのmapがどこにあるかは各vendorの契約である — CodexのTOML `[mcp_servers.*]` table、Claudeのstrict-JSON
  `mcpServers`、Copilot CLIの同名wrapper（無くても受け入れる）、VS Code guideのJSONC top-level `servers` —
  そのためこれらの読み取りを`src/server/inspection/rules/mcp/claude.ts`・`src/server/inspection/rules/mcp/codex.ts`・`src/server/inspection/rules/mcp/copilot.ts`に置き、最後のものはそのvendorの2つのcarrierと、何も読まずprovenanceだけを記録するroot
  fileのadmissionを持つ。見つかったmapが何を意味するかはvendor差ではないため、4つが同一に書いていた投影 — mapping値のentry 1つがserver
  1つ、それ以外の値は何も宣言しない、fieldの検証なし、参照の解決なし —
  を`src/server/inspection/rules/mcp/server-map.ts`に1度だけ書き、`src/server/inspection/rules/mcp/compiled-rule.ts`はこのkindのruleが答える契約（provenance専用の変種を含む）を持つ。`src/server/inspection/rules/registry.ts`が自身で宣言しなくなった契約を公開するので、`src/server/inspection/rules/claude.ts`・`src/server/inspection/rules/codex.ts`・`src/server/inspection/rules/copilot.ts`は残りのkindだけを持つ。MCP
  unitを直接名指すのは`tests/unit/inspection/claude-metadata.test.ts`だけである。
- [X] T1131 permission policy ruleに専用のdirectoryを与える (2026-08-25)。policyの形は2つあり、両者はkind以外に何も共有しない:
  Claudeのものはsettings file内の`permissions`
  objectで、keyの一部だけを許可listにすると作者が書いたpolicyを、何を落としたか言えないまま落とすことになるためobject全体を公開する。一方Codexの`.codex/rules/*.rules`
  fileはそれ自体がpolicyそのものであり、unitは何も読み出さない。この2つを`src/server/inspection/rules/permissions/claude.ts`と`src/server/inspection/rules/permissions/codex.ts`に置き、`src/server/inspection/rules/permissions/compiled-rule.ts`がこのkindのruleが答える契約
  — blockを読む契約、document全体の契約、そしてどのadmissionが答えられるかをcastなしで示す`permissionsReading` discriminant —
  を持つ。両者の間に共有moduleは置かない。共有するものが無いからである: 一方はstrict
  JSONからblockを読み、他方はblockを読まない。`src/server/inspection/rules/registry.ts`が自身で宣言しなくなった契約を公開するので、`src/server/inspection/rules/claude.ts`と`src/server/inspection/rules/codex.ts`は残りのkindだけを持つ。
- [X] T1132 plugin carrierのdetailを、読み手がたどった製品について答える (2026-08-25)。全製品がadmitするcatalogは、inventory
  row上で`(file, tool)`ごとに1つのcarrier行になり、entryのsourceがどのdirectoryを名指すかは各vendorのcontractである —
  Codexだけが文書化するobject綴りはCodexにはplugin rootを名指し、他の2つには何も名指さない —
  そのため3つの行が1つのpageへ導き、projectionが最初に到達したrecognitionを返していた。つまりある製品のroot・source
  form・manifestを別の製品の名前の下で述べていた。`src/shared/api-types.ts`の`PluginCarrierDetailParams`が製品を持ち、`src/server/session/session.ts`はそのrecognitionだけについて答え、`src/app/components/plugin-detail-route.ts`が`src/app/components/inventory/rows/PluginRow.vue`の各carrier行が描くlinkにそれを載せ、`src/app/pages/plugins/detail/[source]/[...path].vue`はどの製品の読み取りを見せているかを述べる（製品を名指さないlinkでは閉じたtool順で先頭のcarrierに落ち、そのことも述べる）。pageが並べるfileも同じ範囲に絞る。1つのcatalogを読む2つの製品は、そこから異なるfileに到達するからである。比較surfaceは`src/app/composables/plugin-comparison.ts`と`src/app/pages/plugins/compare/[family].vue`で側ごとに製品を渡す:
  複数製品が認識する1つのfileはこのsurfaceにとって1つのcarrierのままであり（そのrecognition同士のpairはdocumentを自分自身と比較することになる）、各側は閉じた順でそれを認識する先頭の製品について取得し、fileに複数の製品がある場合は側の行がその製品を名指す。requestのidentityを`tests/unit/app/plugin-manifest-comparison.test.ts`で、1つのcatalogの2つの読み取りを描画されたpage上で`tests/e2e/codex-plugins-inventory.spec.ts`で担保し、parameterを`specs/001-inspect-agent-customizations/contracts/http-api.md`
  § get-plugin-carrier-detailに両言語で記録する (FR-007、FR-030)。
- [X] T1133 skill ruleに専用のdirectoryを与える (2026-08-25)。製品がskillを呼び出す名前はこのkindのinventory
  unitであり、3製品は2通りに分かれる: CodexとCopilotはfrontmatterの`name`をskillのidentityとして文書化し、無ければskill
  directoryへ落ちる。一方Claude
  Codeはfileが何を宣言していてもdirectoryで呼び出し、nestedなskillには`.claude`を置くdirectoryのroot相対pathを前置する。`src/server/inspection/rules/skills/invocation-name.ts`が前者2つが共有する答え
  — 偶然一致した2つのruleではなく1つのrule —
  を持ち、`src/server/inspection/rules/skills/claude.ts`がこのvendor固有のpathだけの答えを持ち、`src/server/inspection/rules/skills/codex.ts`と`src/server/inspection/rules/skills/copilot.ts`が共有の答えの上のunitを持つ。その隣で`src/server/inspection/rules/skills/compiled-rule.ts`がこのkindのruleが答える契約を持つ。`src/server/inspection/rules/registry.ts`はその契約を公開し、他の全kindの契約は保持するので、`src/server/inspection/rules/claude.ts`・`src/server/inspection/rules/codex.ts`・`src/server/inspection/rules/copilot.ts`は残りのkindだけを持つ。共有の答えを直接名指すのは`tests/integration/boundaries/traversal.test.ts`だけであり、契約の旧位置を引いていたコメント
  —
  `src/server/session/session.ts`・`src/shared/api-types.ts`・`src/shared/skill-collision.ts`・`src/shared/registries/skill-collision.ts`
  — は新しい位置を引く。
- [X] T1134 output-styleとcustom-agentのruleに専用のdirectoryを与える (2026-08-25)。どちらのkindも他のkindが持たない問いに答える:
  読み手がstyleを選ぶ名前と、agent
  fileのconfigurationが終わりinstructionsが始まる位置である。`src/server/inspection/rules/output-styles/claude.ts`がstyleを文書化する唯一の製品の答え
  — frontmatterの`name`、無ければfile名 —
  を持ち、契約は`src/server/inspection/rules/output-styles/compiled-rule.ts`にある。`src/server/inspection/rules/agents/claude.ts`・`src/server/inspection/rules/agents/codex.ts`・`src/server/inspection/rules/agents/copilot.ts`が3つの分割を持つ。これは1つではなく3つの契約である:
  ClaudeとCopilotはMarkdown frontmatterのfenceで分割し、Codexは自身のdocumentが持つ`developer_instructions`
  keyで分割するので、各parseはそれを文書化するvendorのもとに留まる。`src/server/inspection/rules/agents/declared-name.ts`はCodexとClaude
  Codeが共有する名前を持つ（偶然一致した2つのruleではなく1つのruleだからである）。`src/server/inspection/rules/agents/compiled-rule.ts`はこのkindのruleが答える契約を持つ。`src/server/inspection/rules/registry.ts`が両方の契約を公開するので、`src/server/inspection/rules/claude.ts`・`src/server/inspection/rules/codex.ts`・`src/server/inspection/rules/copilot.ts`はrule
  listと、他の全kindがcompileされる素のunitだけを持つ。契約の旧位置を引いていた`src/shared/api-types.ts`と`src/app/components/custom-agent-comparison/recognition-comparison.ts`のコメントは新しい位置を引く。
- [X] T1135 pluginのfileをpluginを通じて読む
  (2026-08-25)。pluginのfileは、そのofferingが名指したdirectory配下でcensusが列挙したものであり、`get-file-detail`はfileがsubjectであるrowについて答える。そのため、内部の宣言を名指すrowしか持たないpath
  — 宣言されたpermission policyやMCP carrier —
  はそこで拒否され、それを一覧に出しているまさにそのpageで「消えた」と報告されていた。`src/shared/api-types.ts`・`src/server/session/session.ts`・`src/server/host/devframe-app.ts`の`agent-customization-inspector:get-plugin-file-detail`が、そのpluginのfileとして答える:
  carrier、その読み取りで到達した製品、rowの名前、そしてpathを取り、そのofferingのdirectory配下にあること（membership）を条件とする。したがってplugin名を通じて任意のfileを読むことはできない。`src/app/session/api-client.ts`が唯一のdetail
  token familyで取得し、`src/app/session/view-state.ts`はskill routeのslotではなくplugin
  route専用の2つのslotに保持し、`src/app/pages/plugins/detail/[source]/[...path].vue`はfileが「何であるか」を自身のrequestではなくinventoryから読む（そのpathを名指すkindを閉じたkind順で）。pluginのfileはpluginのものとして提供され、独立にadmitしたruleはそれを自身のkindのrowで公開するからである。比較surfaceも2つのfile
  paneで同じことを`src/app/composables/plugin-comparison.ts`と`src/app/pages/plugins/compare/[family].vue`で行う。requestのidentityを`tests/unit/app/plugin-manifest-comparison.test.ts`、公開surfaceを`tests/unit/app/authored-content.test.ts`、登録catalogを`tests/contract/host-startup.test.ts`と`tests/contract/http-api-routes.test.ts`、plugin
  root内のpolicy
  documentをtreeから開くことを`tests/e2e/codex-plugins-detail.spec.ts`で担保し、関数を`specs/001-inspect-agent-customizations/contracts/http-api.md`に両言語で記録する
  (FR-007、FR-025、FR-030)。
- [X] T1136 pageを読み手自身の配色で描く
  (2026-08-25)。Shellは2つの配色の間でpageを移動させ、その選択を記憶するswitchを持つ。これはこのapplicationが保存する2つの値のうち2つ目 —
  もう一方はfileを開くapplication — であり、同じく読み手自身のmachineについてのpreferenceで、inspectedなものを何も保持しない
  (FR-044)。規則は`src/app/composables/color-scheme.ts`が所有する: 選択があればその保存値、なければoperating
  system自身の設定（pageが開いている間も追従）、認識できない保存値は選択なしとして扱い、document
  rootの1つのclassがその選択の唯一の表現である。`src/app/styles/main.css`はpalette全体をCSS system
  colourとしてそのrootの`color-scheme`に対して解決するため、配色ごとに色を書き直す場所はなく、browserが自ら描くcontrolもすべて追従する。`src/app/composables/monaco.ts`はeditorのthemeを名前で選ぶ。editorはsystem
  colourを解決しないからである。`src/app/components/ColorSchemeSwitch.vue`は`shine-and-bright`が描くcontrolをrenderし（`./package.json`で宣言し`specs/001-inspect-agent-customizations/research.md`に記録）、`src/app/App.vue`がそれをshellに置いてすべてのsurfaceから到達可能にする。規則を`tests/unit/app/color-scheme.test.ts`で、実engineが行う再描画を`tests/e2e/color-scheme-switch.spec.ts`で担保する。後者はunit
  suiteで代替できない: その宣言が変わったときにengineが`Canvas`を再解決するかは、certified
  browserについての事実である。要件をFR-044として`specs/001-inspect-agent-customizations/spec.md`に、保存する2つのpreferenceを`specs/001-inspect-agent-customizations/plan.md`に、両言語で記述する
  (FR-027、FR-031、FR-043、FR-044)。

### リリースの完成

1. Repository のインベントリ、詳細、比較の受け入れを通過する。
2. I/O を行わない Global 同意プレビューを提供する。
3. Fixed `[copilot, claude, codex, agents]`に対するselector-free consentを有効化し、initial enableでは全4件、retryではnon-pending unpublished admittedとsame-preview rejected controlを含みpublished、pending、lexical new-preview-required controlを除外するcompleteなfixed-order exact `retryableTools` projectionを評価し、tentative Sourceをpublishせずにone-root controlを検証する。
4. Nonempty admitted subsetではexactly one shared-ID `GlobalBatchScan`を実行し、0〜4個のseparate member Sourceをone completeまたはpartial Global generationで同時にatomic publishしてcarried Sourcesを保持しrootをmergeしない。Empty deterministic subsetはjobもgenerationも作らない。
5. Global の再スキャン/回復と、優先ゼロ I/O 無効化バリアを追加する。
6. Documentation/evidence/dependency reviewを完了し、その完成artifactに対してcross-cutting suiteを実行する。Remediationごとにprior post-review resultを無効にし、全applicable automated gateと影響evidence protocolを再実行し、concern 0件までcomplete-diff/tarball reviewを反復する。
7. SC-001～SC-008のdenominator、threshold、pass/fail、closed twenty-member study-input bundle/canonical manifest digest、exact `study-inputs/`/`repository/` distribution layoutとderived-tree digest rootを検証済みの20件すべておよびseparateなcandidate/equipment/runtime binding、final packed-candidate digest、exact `pnpm run study:evidence:inputs -- materialize`、`pnpm run study:evidence:verify -- inputs`、`pnpm run study:evidence:capture -- start`、`pnpm run study:evidence:capture -- checkpoint`、`pnpm run study:evidence:verify -- checkpoint`、`pnpm run study:evidence:verify -- continuation`、`pnpm run study:evidence:capture -- stop`、`pnpm run study:evidence:verify -- finalize`のoutcome、opaque ID/root/countだけを含みraw evidence data 0件のrecomputed cross-stream `StudyCaptureSeal` digest、Node.js engines contract全体とexact lower-bound/browser certification sample、residual riskを記録する。
   このsequenceはphase-closedとする。`INSPECTOR_STUDY_WORK_ROOT`、`INSPECTOR_STUDY_CONTROL_ENDPOINT`、`INSPECTOR_STUDY_CONTROL_TOKEN`はmaterializeからfinalize、`INSPECTOR_STUDY_CANDIDATE_TARBALL`はmaterialize/verify-inputsでforbiddenかつstartからfinalizeだけrequired、`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`はstartからstopだけrequiredとする。Stopはsupervisorをretainし、finalizeはcontrolをteardownして`StudyContinuityWitness`を`StudyCaptureSeal`より前にwriteする。
8. 原則ごとの明示的なrelease Constitution Checkを記録し、対応するpull request review checkを必須とし、その結果生じるrepository evidence editをすべて完了する。
9. Repositoryをfreezeした状態でcomplete applicable automated matrixとread-only complete-diff/tarball reviewを再実行し、`pnpm run test:docs`と`git diff --check`で終える。Outcomeはexternal release/pull-request check logだけへcaptureする。その後repositoryをeditした場合は全outcomeを無効にし、Constitution/final-tree gateの再実行前にstep 6/T1062へ戻る。

## 注記

- 有効な検査対象ソースを列挙または読み取れるのは `src/server/inspection/` 配下の単一のinspection moduleだけである (QR-003)。呼び出し元のパス、関係の対象、ベンダーロケーター、戦略、エビデンスレコードが読み取り権限を与えることはない。
- Traversalとreadはsymbolic linkを透過的に辿る (FR-024)。Inspectorは同じpathを読むagentが見るものを表示する。broken linkはそのfileの`file-unreadable` Diagnosticになり、訪問済みdirectoryをreal pathで追跡するためlink cycleがscanの終了を妨げることはない。
- 1つのfileに閉じた問題 (読めないfile、binary content、parser/extractor failure) はfile単位のdiagnosticを保持したまま、影響のない全fileをpartial generationとして公開する。読めないrootはsource-scoped `root-unreadable` DiagnosticでそのSourceのattemptをfailさせ、そのattemptのpartial inventoryを公開しない (FR-002, FR-028)。
- 検査対象のcustomization fileはadversaryとしてモデル化されない (FR-019)。Traversalとreadはfile単位diagnosticを伴う通常の`fs/promises` operationであり、operation間のidentity再検証、change検出taxonomy、kernel-containment主張は存在しない。
- FR-038はproject-authored executable application codeと、commit済みlockfileがpinしreleaseで監査したproduction closure内のexecutable codeに適用する。consumerのinstallによるcaret rangeのfresh解決はその監査の外にある（research.md § 3）。Project-authored build/test codeもrepositoryの設計選択としてJavaScript/TypeScriptを使用するが、third-party development/test toolingはFR-038の対象外として別にpin/auditする。Rust、Cargo、Node-API/native addon、prebuilt binary、lifecycle compilation、lifecycle/runtime artifact downloadはFR-038が定義するproduct boundaryから引き続き禁止する。
- ベンダーの振る舞い、Inspector matcher、runtime composition、公式エビデンスは別々に所有する。読み取りを許可できるのは、静的および有界導出の Inspector ルールだけである。
- 非読み取りの `excluded` ルール ID は、`shared.excluded.managed-remote-state`、`copilot.excluded.additional-standard-locations`、`copilot.excluded.extra-directories`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp`、`copilot.excluded.cli-extensions`、`codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`codex.excluded.user-runtime`、`claude.excluded.user-runtime`、`copilot.excluded.user-runtime` だけである。その他の拒否はすべて、パス不一致テストまたは relationship-only の条件である。
- 関係は記述的、直接的、non-recursive、非追跡とする。関係の対象は、それ自身が独立した静的または有界導出の受け入れを受けた場合にだけ読み取り可能になる。
- Hard linkは通常のfileである。発見された各pathはscan attempt内で1回読み取られ、physical-identity groupingはない。別Source、別scan attempt、別generationは独立しており、同じunderlying objectをそれぞれ読み取り得る。Published fileは複数tool recognitionとdirect provenanceを保持できる。
- vendor の lookup が project root から `cwd` への chain を辿る Codex の Repository surface — instructions、`.codex/config.toml`、`.codex/rules`、`.codex/hooks.json` — は、選択された root でのみ突き合わせる。nested な `.codex` layer は本ツールが選ばない runtime working directory のものであり、nested `AGENTS.md` と同様に candidate ではなく near miss のままとする *(2026-08-17修正: Claude の nested discovery は `cwd` 相対ではなく root 相対として文書化されているため影響を受けない)*。
- ある kind の最初の detail フェーズは、その detail への入口も所有する: その kind の inventory row component は plain text の描画をやめて route へ link し、そのフェーズのブラウザー受け入れテストは URL へ直接遷移するのではなく row を経由して detail に到達する。row が plain text のままでよいのは、link する route がまだ存在しない間だけである（T224 以前の `rows/InstructionRow.vue`）。起動時に開かれない route も同様であり、それを出荷するフェーズがそこへ到達する入口を所有する。
- `agents/openai.yaml` は所有元 skill の census companion として公開される。個別の candidate も `skill metadata` recognition も存在せず、その bytes は seed `SKILL.md` の同一性へ統合されることなく `files[]` 内の独自の file のままである *(2026-08-01 修正: bounded-derived candidate は出荷しない。フェーズ 6 参照)*。
- フェーズ 15 は `.codex/config.toml` を fallback 導出の構成入力としてのみ読み、そこから何も公開しない。フェーズ 23 が内包 Codex MCP 宣言のために carrier を初めて受け入れ、フェーズ 57～58 が1つの candidate に対する2つ目の rule を通じて `settings/config` recognition とその詳細を追加する。surface が何を示すかは、読者が辿り着いた row から従う: MCP row の主題は1つの宣言であるため、その detail は宣言を公開し file の byte は決して示さない。settings row の主題は file であるため、その detail は author が書いた完全な document である。
- Claude の独立 hook、Codex の独立 MCP、hosted/organization/managed/remote 入力、Claude workflows と agent memory、Codex Repository prompts と plugin components、Copilot LSP/extensions/一般の `.vscode/settings.json`、追加の設定済みルートには、List フェーズも読み取り権限も与えない。
- 内包 Hook の認識は、すでに受け入れられた所有物理ファイルを再利用し、syntheticなfileを決して作らない。MCPにcontained機構は存在しない: MCP recognitionを持つのは明示的carrierだけである。宣言、plugin コンポーネントパス、Cloud の事実、runtime 参照が合成ローカルファイルを作成することはない。
- Marketplace catalogとそのentryのroot以下のmanifestは1つの`plugin` kindである: catalogがcarrierであり、validatedなlocal sourceが各pluginのrootを指名し、censusがそのrootのfileを列挙する。Plugin manifestをadmitするruleもderiveするruleも存在せず、componentは再帰しない。
- Global inspection は 1 つの fixed-four consent record と 4 つの control、別々に識別される 0〜4 個の Source を持ち、member ごとに最大 1 つ、Source ごとに正確に 1 root とする。tentative な admission/scan work は Source ではない。initial enable または retry は、admit された全 context を 1 つの request ID/authority/working set を持つ 1 つの `GlobalBatchScan` へ transfer し、independent な Global sequence の 1 つの complete または partial generation で全 admitted Source を一緒に publish する。per-member の中間 commit は存在せず、Global commit が Repository の generation や view に触れることはない。後続の明示的 Global rescan は single-Source transaction のままとする。Source ID は process lifetime にわたり安定し、file の identity は Source-relative Path で generation を跨いで安定する。
- 完全に decode された authored source、正確な metadata literal、authored relationship target は active session で利用可能なままにする。loopback-only な session API は明示的な detail request でだけそれらを返すが、acknowledgementもnoticeのfieldも持たない。どちらもどこにも存在しないからである（FR-027）。bundled browser はそれらの request を発行し、acknowledgement も注意書きも前後に置かずに authored value を render する。credential と environment-reference syntax は変更せず表示し、参照される process-environment value は決して読み取りも置換もせず、diagnostics/log は source value を複製しない。
- Credential detection、masking、redaction、reveal control は存在しない。session API に reveal・masking・environment-resolution の function は存在せず、source/comparisonを開く前にも隣にも、authored contentについての注意書きは現れない。
- 通常の起動、スキャン、ビルド、テストは公式ドキュメントに関してオフラインである。ネットワークへアクセスできるのは、明示的なメンテナー向けソース確認コマンドだけである。
- 人が作成するリポジトリドキュメントの変更では、英語の正本ファイルと日本語の対応ファイルを必ず同時に更新する。
- 自動テストの成功はエビデンスであり、網羅的な証明ではない。フェーズ 104 では、完全な文脈での diff、package、participant、accessibility、measurable-outcome、residual-risk のレビューを必要とする。
