# タスク: エージェントカスタマイズの調査

[English](tasks.md)

**入力**: `/specs/001-inspect-agent-customizations/` の設計文書

**前提条件**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**テスト**: すべての振る舞いの変更について、実装前にリスクに応じた自動テストが必要です。テストはユニット、契約、統合、パッケージ、セキュリティ、性能、ブラウザー、境界、アクセシビリティ、回帰の振る舞いを網羅します。

**構成**: タスクは、一つのユーザーストーリー全体を水平に完了するのではなく、目に見えるデリバリー単位と、明示的な三つの Repository 優先ウェーブに従います。起動可能な画面の後は、Skills → Instructions → MCP、次に Rules → Commands → Prompts → Custom Agents、最後に Settings/Configuration → Output Styles → Marketplaces → Plugin Manifests → Hooks の順です。ストーリーラベルは正規のトレーサビリティを維持し、`[US1]` は発見、`[US2]` は完全で非活性な詳細、`[US3]` は比較、`[US4]` は Global 調査を表します。所有者に依存する MCP 統合は、MCP ウェーブで dormant な所有者非依存契約として実装し、対応する後段の所有者ファミリーが受け入れられた時点で表示可能にします。各フェーズには引き続き、独立してテスト可能なチェックポイントが一つあります。

## 形式: `[ID] [P?] [Story?] Description`

- **[P]**: 明記された前提条件の完了後、異なるファイルを使用し、別の未完了タスクへ依存しないため並列実行できます。
- **[Story]**: フェーズ 3〜101 で必須です。Setup、Minimal Secure Foundation、フェーズ 102〜104 でのみ省略します。
- すべてのチェックリスト項目には、一つの主要成果と少なくとも一つの正確なファイルパスがあります。

## 規範的な要件トレーサビリティ

このmatrixを、checklist semanticsを変更する仕組みではなく正本coverage indexとする。全FR、QR、SCについてprimaryな
implementation/verification/evidence ownerを示す。Rangeはその全taskが当該requirementへ直接寄与する場合だけ両端を含み、
taskはchecklist textと参照specにないobligationを継承しない。全taskを少なくとも1つのspecification rowまたは明示的な
Constitution/project-governance rowで扱う。Requirement/task変更時はこのmatrixと英語版を同じ変更で更新する。

| 要件 | 所有する実装・検証・evidence task |
|---|---|
| FR-001 | T040–T049, T917, T1048, T1056 |
| FR-002 | T017, T028–T032, T037, T913–T919 |
| FR-003 | T050–T073, T913–T920, T1042, T1053 |
| FR-004 | T050–T073, T913–T920, T1042, T1053 |
| FR-005 | T017, T028, T178–T190, T268–T275, T388–T396, T913, T920 |
| FR-006 | T178–T190, T268–T275, T388–T396, T402–T410, T440–T448, T475–T481, T486–T494, T507–T516, T565–T572, T577–T588, T643–T653, T658–T666, T679–T688, T739–T746, T751–T762, T818–T828, T833–T843, T899–T907, T919 |
| FR-007 | T074–T177, T216–T267, T292–T387, T411–T435, T449–T474, T495–T502, T517–T564, T589–T642, T667–T674, T689–T738, T763–T817, T844–T898, T920–T927, T1034–T1036, T1041–T1042 |
| FR-008 | T205–T275, T920, T927, T1042 |
| FR-009 | T079–T080, T913–T920, T1042, T1053 |
| FR-010 | T226–T244, T920, T924–T927 |
| FR-011 | T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-012 | T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-013 | T930–T943, T1017–T1028 |
| FR-014 | T944–T1028 |
| FR-015 | T977–T990 |
| FR-016 | T963–T976 |
| FR-017 | T944–T962 |
| FR-018 | T930–T990, T1042 |
| FR-019 | T015–T039, T050–T073, T913–T927 |
| FR-020 | T056, T925, T1048, T1054 |
| FR-021 | T280–T401, T925, T1054 |
| FR-022 | T040, T043, T047, T056, T925, T1048, T1054 |
| FR-023 | T056, T925, T1054 |
| FR-024 | T018–T032, T924, T1051, T1058 |
| FR-025 | T074–T085, T920–T927, T995–T997, T1055 |
| FR-026 | T077, T085, T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925–T927, T995–T997, T1055 |
| FR-027 | T084, T100, T927, T1045 |
| FR-028 | T016, T027, T923, T927, T1058 |
| FR-029 | T015–T027, T915, T922–T923, T1046, T1058 |
| FR-030 | T026, T037, T182, T916, T928, T1006–T1016, T1058 |
| FR-031 | T041, T048–T049, T096, T182, T1021, T1024, T1027 |
| FR-032 | T191–T204, T276–T279, T397–T401, T436–T439, T482–T485, T503–T506, T573–T576, T654–T657, T675–T678, T747–T750, T829–T832, T908–T912, T928–T929 |
| FR-033 | T178–T190, T268–T275, T388–T396, T475–T481, T565–T572, T643–T653, T739–T746, T818–T828, T899–T907, T925, T927–T929 |
| FR-034 | T226–T244, T857–T877, T1042 |
| FR-035 | T205–T225, T944–T962 |
| FR-036 | T226–T244, T963–T976 |
| FR-037 | T245–T267 |
| FR-038 | T001–T014, T024–T036, T1043–T1044, T1047–T1051 |
| FR-039 | T153, T159, T246, T260, T374, T377, T380–T386, T388, T391, T393, T400, T547, T550, T720, T723, T911, T979–T980, T985–T986, T995–T997, T1029, T1041–T1042, T1060 |
| QR-001 | T017–T039, T050–T073, T913–T920, T1031–T1042 |
| QR-002 | T015–T026, T913–T935, T944–T950, T963–T967, T977–T981, T991–T997, T1006–T1011, T1017–T1022, T1041–T1055, T1058–T1060 |
| QR-003 | T018–T049, T924–T927, T1017–T1028, T1051, T1054, T1058 |
| QR-004 | T044, T084, T100, T919, T927, T929, T935, T950, T976, T990, T1005, T1016, T1022, T1028–T1030, T1039–T1041, T1045, T1056–T1059 |
| QR-005 | T050–T073, T913, T920, T1031–T1042, T1062 |
| SC-001 | T040–T049, T917, T1030, T1048, T1056 |
| SC-002 | T183, T914, T918, T1029, T1041, T1052 |
| SC-003 | T913–T920, T1042, T1053 |
| SC-004 | T085, T925, T930, T995–T997, T1054 |
| SC-005 | T074, T077, T081–T085, T925–T927, T930, T995–T997, T1055 |
| SC-006 | T1030, T1057 |
| SC-007 | T018–T023, T915, T922–T924, T1058 |
| SC-008 | T044, T084, T100, T919, T927, T929, T1045, T1059 |
| SC-009 | T153, T246, T374–T386, T547, T720, T979–T980, T995–T997, T1041–T1042, T1060 |
| Constitution/project governance | T001–T014, T1029–T1046, T1047–T1063 |

---

## フェーズ 1: Setup

**目的**: 再現可能な Node.js 専用パッケージと開発エントリーポイントを確立します。

**独立テスト**: 固定された依存関係グラフをインストールし、設定されたすべてのローカルコマンドと CI エントリーポイントが、Rust、ネイティブコンパイラー、インストール時ビルド、アーティファクトのダウンロードを必要とせず解決できることを確認します。

**目に見えるチェックポイント**: コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。

- [ ] T001 Packageまたはconfiguration fileを変更する前にplan承認済みdependency baselineを再検証する。Packageまたはversionが1つでも変わる場合は停止し、`specs/001-inspect-agent-customizations/`配下のdependency baselineを含む`research.md`/`research.ja.md`、`plan.md`/`plan.ja.md`、`quickstart.md`/`quickstart.ja.md`、`tasks.md`/`tasks.ja.md` pairを同期して`/speckit-plan`と`/speckit-tasks`を再実行する。変わらない場合はNode.js `^24.11.0 || ^26.0.0`、`pnpm@11.13.0`、正確なruntime leaf集合`gunshi` 0.37.0・`yaml`・`jsonc-parser`・`smol-toml`、承認済みの正確なdevelopment version、凍結されたgraphを`package.json`と`pnpm-lock.yaml`に固定する
- [ ] T002 `bin` を `agent-customization-inspector: bin.mjs` のみ、`files` を `bin.mjs`、`dist`、`README.md`、`README.ja.md`、`LICENSE` のみに定義し、`main`/`module`/`exports` を省略して、`package.json` でライフサイクルのビルド・ダウンロードフックを禁止する
- [ ] T003 フォーマット、lint、型チェック、ユニット、契約、統合、セキュリティ、パッケージ、性能、カバレッジ、文書、ブラウザーの各コマンドを `package.json` に追加する
- [ ] T004 `package.json`、`pnpm-lock.yaml`、configuration、CI、release、package-policy taskが再検証済みの1つのbaselineを使用することを確認し、そのpackage、正確なversion、実行可能なcommandを`specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`、`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`、`specs/001-inspect-agent-customizations/quickstart.ja.md`、`specs/001-inspect-agent-customizations/tasks.md`、`specs/001-inspect-agent-customizations/tasks.ja.md`で同期する
- [ ] T005 [P] Nuxt SPA、静的 Nitro プリセット、ルート絶対アセット、無効化した CDN、明示的な imports と components を `nuxt.config.ts` で設定する
- [ ] T006 [P] アプリケーション、共有、ソース、スクリプト、テストに対する厳格な型チェックを `tsconfig.json` で設定する
- [ ] T007 [P] 生成出力を除外しながら TypeScript、Vue、Node.js、テストの lint を `eslint.config.js` で設定する
- [ ] T008 [P] ユニット、契約、統合、セキュリティ、パッケージ、性能、カバレッジの各プロジェクトを `vitest.config.ts` で設定する
- [ ] T009 [P] Playwright 1.61.1がinstallする正確なbrowser revisionを使うdeterministicなChromium、Firefox、WebKitのprimary-workflow/accessibility certification projectを `playwright.config.ts` に設定し、pin済みrevisionは再現可能な自動baselineであってuser browserの網羅的一覧ではないことを文書化する
- [ ] T010 [P] 名前付き Node ESM `cli` および `parser-worker` エントリー、固定 `.mjs` 出力、バンドルするプロジェクトモジュール、外部化する宣言済み依存関係、無効化したマップ・宣言、クリーンな `.build/server` ステージングを `tsdown.config.ts` で設定する
- [ ] T011 [P] 正確なshebang、packed exact `engines.node` string `^24.11.0 || ^26.0.0`と実行中versionが`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`内であることのbuilt-in-only検証、`dist/cli.mjs`のstatic importなし、検証後のdynamic-import placeholder正確に1件を備えるBOMなしのexecutable Node.js integrity-bootstrap skeletonを `bin.mjs` に作成する
- [ ] T012 [P] 依存関係と、生成された Nuxt、サーバー、配布、カバレッジ、Playwright、Node.js のビルド出力だけを `.gitignore` で無視する
- [ ] T013 フォーマット、lint、型チェック、ユニット、契約、統合、セキュリティ、パッケージ、性能、文書、カバレッジ、ブラウザーの独立したジョブを `.github/workflows/ci.yml` に追加する
- [ ] T014 Node.js `24.11.0`と`26.0.0`を`ubuntu-24.04` x64、`macos-15` arm64、`windows-2025` x64と掛け合わせた正確な6つのlower-bound certification job、Node.js 24.18.0 `ubuntu-24.04` x64のdevelopment/build job 1件を `.github/workflows/ci.yml` に追加し、宣言済みNode.js 24/26 engine rangeがruntime compatibility contractでありsampleだけへsupportを狭めないことをlabelする

---

## フェーズ 2: Minimal Secure Foundation

**目的**: ブラウザーセッションや Repository 読み取りより前に存在しなければならない契約とセキュリティ境界だけを実装します。

**独立テスト**: 製品ワークフローを起動せず、境界付き DTO と診断、正確なパッケージマニフェスト、capability の分類、中央 Node.js ファイルシステム権限、generation 0 の状態を検証します。

**目に見えるチェックポイント**: セキュリティとパッケージの基盤が単独で合格し、中央権限の外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。

### テストと fixture

- [ ] T015 [P] parser message、retained graph、および session 所有の全 mutable field を synthetic neutral form（`sessionDiagnosticIds: []`、lifecycle diagnostic なし、current/no stale failure/null control、全 Source が idle かつ progress は null）へ投影した5 MiB の complete-envelope base について、正確な上限・whole-record-one-over の決定論的な失敗テストを追加する。さらに、各 complete record の canonical byte delta を正確に課金し1 record あたり2 KiB cap と四つの keyed failure および sentinel 用16 KiB reserve を持つ独立した2 MiB lifecycle-diagnostic delta、compact keyed fallback/通常 overflow の抑制、独立した1 MiB worst-case control delta、budget 間借用なし、8 MiB の最終 snapshot を `tests/unit/shared/limits.test.ts` で検証する
- [ ] T016 [P] 閉じた診断レジストリー、決定論的な集約、四つのオーバーフローセンチネル、compact keyed failure、記述された source value を一切複製しない引数に関する失敗テストを `tests/unit/shared/diagnostics.test.ts` に追加する
- [ ] T017 [P] Public entity shape、one-root Source invariant、exact tool/surface/rule/evidence/condition fieldを持ちfile identity/path/text/comparison/relationship/read authorityを持たないbounded `SourceConditionFact` record、exact authored-literal metadata、UTF-16 source range、opaque generation-scoped ID、versioned API envelope、strict request guard、internal authority record rejectionに関するfailing testを `tests/unit/shared/entities.test.ts` と `tests/unit/shared/api.test.ts` に追加する
- [ ] T018 Link、junction、non-regular entry、deep tree、VCS internal、注入したsource-root/ancestor/final-component replacement checkpoint、effectiveおよびunavailable/ineffectiveな`O_NOFOLLOW`、unverifiable check、`platform-unobservable` outcomeのdeterministic cross-platform fixtureを `tests/fixtures/adversarial/build-filesystem-fixtures.ts` に作成する
- [ ] T019 I/O 前の字句的拒否、コンポーネント `lstat`、正規パス包含、bigint identity、plan 駆動の境界付き `opendir`、I/O segment としての raw `Dirent.name`、表示・分類の NFC 化、NFC 化すると衝突する sibling を fail-closed にする動作、VCS 除外、検出可能なデバイス変更に関する root-context および列挙の失敗テストを `tests/unit/inspection/node-safe-fs.test.ts` に追加する
- [ ] T020 private generation binding、一度だけの使用、クライアントパスの拒否、および列挙時・pre-open・post-open/pre-read・post-read に root と利用可能なすべての ancestor を確認してから candidate `lstat` → `realpath` containment → repeated unchanged `lstat` を行う ticket/read の失敗テストを `tests/unit/inspection/node-safe-fs.test.ts` に追加する
- [ ] T021 Same-handle identity、全detectable replacementとbyte disposal、effective `O_NOFOLLOW`によるfinal-component defense、明示的なno-effective-`O_NOFOLLOW` postcheck receipt、shared-boundary unverifiability時のsource-attempt rejection、candidate unverifiability時のitem rejection、およびactive source-root/ancestor replacementまたはfinal defense unavailable raceのproofを主張せず`platform-unobservable`をproofへ数えないrecordに関するfailing boundary testを `tests/integration/boundaries/node-safe-fs.test.ts` に追加する
- [ ] T022 中央権限の外にあるすべての調査対象ソースのファイルシステム読み取りを拒否する失敗アーキテクチャ契約を `tests/contract/inspection-io-boundary.test.ts` に追加する
- [ ] T023 [P] 256-bit 認証、constant-time 比較、Host/Origin/fetch-metadata 確認、CORS なし、厳格なメソッドとメディア、64 KiB body、no-store response、capability または記述された source value を一切露出しない error に関する capability の失敗テストを `tests/contract/host-security.test.ts` に追加する
- [ ] T024 [P] root confinement、正確な schema/order/limits/hashes、必須だが削除される `200.html`/`404.html`、唯一受け入れる HTML としての `index.html`、`<base>`・nonce・実行可能属性・外部/相対実行可能 URL・未記録 inline script・stale asset の拒否に関する cleanup および static-manifest の失敗テストを `tests/package/build-cleanup.test.ts` と `tests/package/static-manifest.test.ts` に追加する
- [ ] T025 [P] 正確な `.mjs` レコード、必須 CLI/Worker エントリー、再帰的に正確な二つのマニフェスト集合、production graph digest と正確な runtime leaf、`gunshi` 0.37.0の正確なintegrityとbundle済みpayload全体のdigest、`gunshi/agent`/lazy/custom-plugin pathを含まないroot-API-only CLI import、ならびに `open`、Rust/C/C++/Cargo、Node-API/native/binary/Wasm payload、prebuild、platform selector、package shell helper、Node 以外の shebang、lifecycle/runtime download の拒否に関する server-manifest および package-policy の失敗テストを `tests/package/server-manifest.test.ts`、`tests/package/production-graph.test.ts`、`tests/package/node-only-policy.test.ts` に追加する
- [ ] T026 [P] bootstrap generation 0、決定論的 ID、graph 不変条件、coordinator lock 下の一つの linearization point で行う generation/payload capture、atomic N+1 replacement、fatal retention、Source ごとの stale failure、ID rekeying、境界付き lifecycle/control overlay、canonical な single-buffer snapshot encoding、generation overflow に関する generation および session の失敗テストを `tests/unit/session/scan-generation.test.ts` と `tests/unit/session/session.test.ts` に追加する

### 実装

- [ ] T027 正確な resource 定数、whole record の決定論的な count/production-JSON-byte accounting、parser message と retained graph の上限、idle/null-progress Source を含む session 所有の全 mutable field を指定された neutral form へ投影した5 MiB complete-envelope base、complete lifecycle record ごとの正確な canonical byte-delta charge と2 KiB cap、四つの keyed failure/sentinel 用16 KiB reserve および compact/suppression rule を持つ独立した2 MiB lifecycle overlay、借用を行わず build で独立検証する1 MiB control overlay、8 MiB の最終 snapshot、閉じた diagnostic registry、overflow sentinel、source value を含まない引数を `shared/limits.ts`、`shared/diagnostics.ts`、`src/inspection/limits.ts` に実装する
- [ ] T028 Public DTO、one-root Repository/tool-specific-Global Source invariant、required tool/surface/source refを持ちfile/relationship/read authorityを表現不能にするbounded evidence-linked `SourceConditionFact` DTO、exact authored-literal metadata/relationship、internal-type exclusion、opaque ID guard、versioned envelope、deterministic production JSON encoding、strict manual request guardを `shared/entities.ts` と `shared/api.ts` に実装する
- [ ] T029 字句コンポーネント検証、正規 root の取得、bigint identity、close-state enforcement を持つ private `InspectionRootContext` の作成を `src/inspection/safe-fs.ts` に実装する
- [ ] T030 immutable な typed plan から実行する境界付きで決定論的な `opendir` traversal、raw `Dirent.name` segment の保持、衝突を拒否する NFC 表示正規化、VCS 除外、root とすべての ancestor の確認、順序付けられた candidate validation、generation-bound `ScanEntryTicket` snapshot を `src/inspection/safe-fs.ts` に実装する
- [ ] T031 Pre-open、post-open/pre-read、post-readのcomplete ordered verification、same-handle identity、enforce可能な場合のmandatory effective `O_NOFOLLOW`、`effective-o-nofollow`対`no-effective-o-nofollow-postchecks` receipt、byte disposal、no publicationを持つone-time ticket readを `src/inspection/safe-fs.ts` に実装する
- [ ] T032 推測せず、root/shared ancestor は source scope で、candidate は item scope で拒否する `safe-fs-boundary-unverifiable` 処理を `src/inspection/safe-fs.ts` に実装する
- [ ] T033 Active source-root/ancestor replacementは全platformでinitial threat model外、active final-component replacementはeffective `O_NOFOLLOW`なしの場合だけscope外、全detectable changeはscope内でfail closed、`platform-unobservable` outcomeはnon-provingであること、および将来のpublic Node.js APIまたはOS-enforced resolution pathを `src/inspection/safe-fs.ts` に記載する
- [ ] T034 capability 生成、constant-time 認証、capability-safe なリクエスト分類を `src/host/capability.ts` に実装する
- [ ] T035 受け入れる HTML/URL ケースを強制し、必要な fallback だけを削除し、アセットを検証して決定論的な CSP hash を記録する root-confined static normalization を `scripts/clean-build-output.mjs` と `scripts/build-static-manifest.mjs` に実装する
- [ ] T036 非活性で固定された Node ESM entry を `src/cli.ts` と `src/inspection/parsers/worker.ts` に scaffold してから、決定論的な server-manifest 生成、production graph digest、再帰的 exact-set verification、Node.js 専用ポリシーの強制を `scripts/assemble-server-manifest.mjs`、`scripts/build-production-graph.mjs`、`scripts/verify-package-files.mjs` に実装する
- [ ] T037 決定論的な generation 構築、coordinator lock 下の一つの linearization point で行う一つの generation とその完全な payload の selection、canonical な single-buffer snapshot encoding、atomic replacement、generation 0、generation overflow の拒否、Source ごとの fatal retention、synthetic neutral Source state・whole-record delta・予約済み keyed-failure/sentinel capacity・budget 間借用なしを含む、正確な5 MiB neutral-base/2 MiB lifecycle/1 MiB control classification を `src/session/scan-generation.ts`、`src/session/stale-failures.ts`、`src/session/session.ts` に実装する
- [ ] T038 method、media、body、request-key、no-store、safe-error handling、coordinator lock 下の完全な payload capture、lock release より前の canonical production JSON buffer 作成、正確な `Content-Length`、変更しない buffer の HTTP delivery、truncation を行わない固定の response-size-invariant failure を持つ厳格な router skeleton を `src/host/api-router.ts` に実装する
- [ ] T039 `platform-unobservable` のケースに対する証明を主張せず、中央ファイルシステム権限と Node.js 専用パッケージポリシーの suite を CI で実行するよう `.github/workflows/ci.yml` に追加する

---

## フェーズ 3: 起動可能な認可済み空画面

**目的**: Repository を読み取らずに、最初のユーザー向け製品単位を提供します。

**独立テスト**: パッケージをインストールし、fixture の `cwd` から起動して、出力された loopback URL を開き、一度だけの fragment から認証し、generation 0、アクセシブルな空の shell、調査対象ソースのファイルシステム読み取りがゼロであることを検証します。

**目に見えるチェックポイント**: 認可済みブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。

### テスト先行

- [ ] T040 [P] [US1] 固定 manifest asset、閉じた SPA fallback、正確な CSP、対応 Node engine、CLI の evaluation または bind より前の package/two-manifest/every-asset verification、その後に正確に一度だけ行う dynamic `import('./dist/cli.mjs')` と static CLI import の不在、loopback-only ephemeral binding、startup 時の documentation/network access ゼロ、固定 startup failure に関する static-route および startup の失敗テストを `tests/contract/static-routes.test.ts` と `tests/contract/host-startup.test.ts` に追加する
- [ ] T041 [P] [US1] 一度だけの fragment capture、memory-only Bearer 使用、authorization-lost reload behavior、正確な request-token/`clientDataEpoch`/generation/file-ID adoption guard、older generation の拒否、equal generation での current-token 強制、newer generation adoption 前の purge、永続化ゼロ、未認可 API call ゼロに関する client の失敗テストを `tests/unit/app/api-capability.test.ts` に追加する
- [ ] T042 [P] [US1] 認可済み polling、表示中ページの1秒ごとの liveness heartbeat、750 ms の request timeout、2秒の lease expiry、timeout/network/`401`/`403`/session-ID mismatch/port reuse/process loss 時の purge、hidden/`pagehide`/`beforeunload` 時の即時 purge、`clientDataEpoch` increment、late response の拒否、generation-zero 表示、認可喪失、visibility 復帰後の fresh-snapshot baseline adoption、control-only recovery、matching-baseline での明示的 Resume、timer/request teardown に関する browser-state の失敗テストを `tests/unit/app/session-shell.test.ts` と `tests/unit/app/liveness.test.ts` に追加する
- [ ] T043 [P] [US1] Gunshiのroot `define`/`cli` API、正のdefault-true `open`と生成される`--no-open`、bindしないbuilt-in help/version、`strict: true`によるunknown-option拒否、bind前の明示的なpositional/rest拒否、await済みcompletion、固定された上限付きoutputとnonzero failure exitを伴う明示的なvalidation `AggregateError`処理、正確なshebang/mode/package field、隔離install、起動前に1回だけ出力するclosed grammarのloopback URLと43文字のbase64url capability、唯一許可するproduct child processとしての固定`/usr/bin/open`または`/usr/bin/xdg-open` startup helper（`shell: false`・ignored stdio・unref・正確なenvironment allowlist）、そのhelperへ調査対象content/path、authored value、user command、environment-selected handlerを渡さずOS default browserへ委譲するだけでversionをcertifyできないこと、Windows/非対応platformでのspawnゼロ、disabled/非対応/helper failureまたはuncertified handler時も利用可能な`--no-open`/printed-URL certified-browser fallback、direct shell boot、clean shutdown、`gunshi/agent`/lazy/custom-plugin importなし、調査対象source readゼロに関するCLIとpackaged launchの失敗testを`tests/unit/cli.test.ts`と`tests/package/npx-launch.test.ts`に追加する
- [ ] T044 [US1] 認可済み空 shell、authorization-lost shell、DOM/DTO/editor/filter/warning state を一切保持しない liveness purge、fresh-baseline control-only recovery、default inventory state での明示的 Resume、keyboard focus、Repository picker や ancestor discovery がないことに関するブラウザー受け入れ失敗テストを `tests/e2e/boot.spec.ts` に追加する

### 実装

- [ ] T045 [US1] 固定マニフェストアセットの提供、閉じた SPA fallback、正確な MIME validation、正確な CSP serialization を `src/host/static-files.ts` に実装する
- [ ] T046 [US1] CLI の evaluation または bind より前に、built-in のみを使う対応 engine・package・両 manifest・全 asset の verification を `bin.mjs` に実装してから、static CLI import を行わず正確に一度だけ dynamic `import('./dist/cli.mjs')` を実行する。loopback-only ephemeral binding、process lifetime を延長せず source/root/diagnostic を含まない capability 保護済み `GET /api/v1/session/liveness` response、source value を含まない operational output、startup 時の documentation/network access ゼロを `bin.mjs`、`src/host/api-router.ts`、`src/host/server.ts` に実装する
- [ ] T047 [US1] Gunshiのroot `define`/`cli` entryを、正のdefault-true `open`と生成される`--no-open`、`strict: true`、bind前の明示的なpositional/rest拒否、await済みcompletion、bindしないbuilt-in help/version、固定された上限付きrenderingとnonzero failure exitを伴う明示的なvalidation `AggregateError`処理、`gunshi/agent`/lazy/custom-plugin/experimental-combinator importなしで実装する。起動前に1回だけ出力するclosed grammarのloopback URLと43文字のbase64url capability、唯一許可するproduct child processとしての固定`/usr/bin/open`または`/usr/bin/xdg-open` startup helper（`shell: false`・ignored stdio・unref）、`BROWSER`・`NODE_OPTIONS`・`NODE_PATH`、調査対象content/path、authored value、user command、environment-selected handlerを除外する正確なchild-environment allowlist、versionをselect/verifyしない明示的なdefault-browser delegation、Windows/非対応platformでのspawnゼロ、disabled/非対応/helper failureまたはuncertified handler時も利用可能な`--no-open`/printed-URL manual certified-browser fallback、起動時`cwd`の取得、graceful shutdownを`src/cli.ts`と`src/launch-browser.ts`に実装する
- [ ] T048 [US1] 一度だけの capability-fragment capture、memory-only authorization、正確な request token、abort 可能な request、older generation を無視し、equal generation では current token を要求し、newer generation を adopt する前に epoch increment と dependent state disposal を行う `clientDataEpoch`/generation/file-ID adoption guard を `app/composables/api.ts` に実装する
- [ ] T049 [US1] 認可済み generation-zero polling と、timeout/network/`401`/`403`/session-ID mismatch/lease expiry/process loss/hidden/`pagehide`/`beforeunload` のための唯一の synchronous purge path を実装する。全 session DTO/DOM/detail/comparison/editor/filter/warning state を clear し、request を abort し、`clientDataEpoch` を increment し、memory capability だけを保持し、purge 済み ID と比較せず fresh authenticated snapshot の `sessionId` を adopt し、境界付き `globalControl` recovery だけを構築し、fresh default inventory には matching-baseline の明示的 Resume を要求する。正確な heartbeat/lease/timer teardown と意味的に同等な英語・日本語メッセージを `app/composables/session.ts`、`app/composables/liveness.ts`、`app/app.vue`、`app/locales/en.ts`、`app/locales/ja.ts`、`app/styles/main.css` に追加する

---

## フェーズ 4: Codex SKILL 一覧

**目的**: Codex skills を対象に、最初の安全な Repository inventory 単位を提供します。

**独立テスト**: root と入れ子の `.agents/skills/*/SKILL.md`、near miss、link、不正な名前、hard-link alias、無関係なファイルを含む fixture から起動し、allowlist 対象の Codex skill row だけが path、source、kind、tool とともに表示されることを検証します。

**目に見えるチェックポイント**: Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。

### fixture とテストを先行

- [ ] T050 [US1] positive、nested、near-miss、hard-link、malformed-name、linked、oversized、empty、secret-bearing、performance の各 Codex SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T051 [US1] Codex skill の behavior、rule、strategy、evidence の conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T052 [P] [US1] 安定した reciprocal ID、閉じた matcher/traversal/derivation kind、Repository の `./` anchoring、bare `**/` の拒否、literal/one-segment/two-nonadjacent-recursive token grammar、canonical な selector/program round trip、immutable で versioned な `TraversalPlan` output、evidence grammar/fingerprint、production runtime からの official-source registry 除外に関する registry/compiler の失敗契約を `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T053 [P] [US1] `./**/.agents/skills/*/SKILL.md` が typed plan へ一度だけ compile され、安全な filesystem はその plan だけを実行し、vendor code は match の分類だけを行い、descendant/near-miss/VCS 動作が正確で、runtime-chain fact が引き続き conditional であることを証明する Codex SKILL の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T054 [P] [US1] tool、`skill` kind、path provenance、無関係な recognition がないことに関する Codex recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T055 [P] [US1] 起動時 `cwd` の admission、ticket-only read、決定論的な順序、hard-link alias、境界付き作業、隔離された item failure、relationship-target read なしに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T056 [P] [US1] `--no-open`または隔離した許可済みstartup helperの後から開始するinstrumentationのもとで、Codex SKILL discoveryがchild process、dynamic evaluation/import、MCP connection、outbound request、URI load、調査対象source mutationを一切発生させないことを証明するzero-activation testを`tests/integration/security/zero-activation.test.ts`に追加する
- [ ] T057 [P] [US1] 起動時 `cwd` の Repository Source が正確に一つであること、Source-relative path、`GET /api/v1/session`、`POST /api/v1/repository/rescan`、source/root/diagnostic を含まない `GET /api/v1/session/liveness` に関し、固定 heartbeat value、progress、duplicate conflict、stale entry を作らず generation 0 を保つ automatic initial failure、Source ごとの stale failure を伴う explicit fatal rescan rollback、stale ID、same-buffer encoding、whole-generation publication、Repository-rescan commit をまたいで pause した SessionSnapshot delivery が coherent な envelope generation/payload を持つことを含む失敗契約を `tests/contract/http-api-session.test.ts` に追加する
- [ ] T058 [P] [US1] Codex row、source/path/kind label、progress、empty state、rescan、retry、diagnostics、および session summary が source text や declared value を一切露出しないことに関する inventory の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T059 [US1] Codex 専用 fixture を起動し、source content を含まない正確な SKILL 一覧が表示されることに関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-list.spec.ts` に追加する
- [ ] T060 [US1] reciprocal behavior、rule、evidence、affected-contract reference に関する Codex skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T061 [US1] registry type、閉じた matcher/traversal/`DerivationProgram` grammar、immutable で versioned な plan compilation、canonical round trip、reciprocal validation、one-edge derivation の acyclicity、Repository の `./` enforcement、official-source evidence を除外する production loading を `src/inspection/rules/types.ts` と `src/inspection/rules/registry.ts` に実装する
- [ ] T062 [US1] 読み取り権限を付与しない `codex.behavior.repo.skills`/`codex.behavior.user.skills` statement を完全な base skill-discovery strategy とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、この checkpoint で production registry を閉じたままにする
- [ ] T063 [US1] 読み取りを認可する `codex.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T064 [US1] Codex skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T065 [US1] vendor 所有の walker や selector 再解釈を使わず、registry で compile された `codex.repo.skill` plan に対する Codex skill classification を `src/inspection/rules/codex.ts` に実装する
- [ ] T066 [US1] parsing や source exposure を行わず、path-derived Codex skill recognition を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T067 [US1] 境界付き Repository enumeration、ticket-only verification、決定論的な candidate order、hard-link alias aggregation、diagnostic-only failure を `src/inspection/scan.ts` に実装する
- [ ] T068 [US1] automatic first scan、FIFO explicit rescan、dequeue-time generation selection、duplicate rejection、atomic publication、stale entry を作らず generation 0 を保つ initial failure、Source ごとの stale failure を伴い last commit を保持する explicit fatal-rescan discard、成功した target Source の stale clearing、generation-owned ID invalidation を `src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts` に実装する
- [ ] T069 [US1] Source-relative path、不透明 ID、progress、conflict、Source ごとの stale failure、retained-snapshot status、stale-resource handling、source value を含まない diagnostics を持つ決定論的な Codex skill summary と Repository rescan response を `src/host/api-router.ts` に実装する
- [ ] T070 [US1] generation-aware な source/tool/kind/Source-relative-path filter、Source ごとの stale marker、retry state、成功した replacement の後だけ行う cleanup を `app/composables/filters.ts` と `app/composables/session.ts` に実装する
- [ ] T071 [US1] アクセシブルな Repository header、current/stale snapshot status、progress、rescan/retry control、Source-relative-path filter、Codex SKILL 一覧、item summary を `app/pages/index.vue`、`app/components/inventory/InventoryFilters.vue`、`app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue` に実装する
- [ ] T072 [US1] actionable diagnostics と Codex scope の empty state を `app/components/diagnostics/DiagnosticList.vue` に実装する
- [ ] T073 [US1] 意味的に同等な英語・日本語の Codex inventory、progress、empty-state、retry、boundary message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 5: Codex SKILL 詳細

**目的**: Codex の `SKILL.md` ファイルを、完全で非活性な記述済み source と境界付き typed metadata として安全に調査できるようにし、別個の物理 candidate である `agents/openai.yaml` はまだ admission しません。

**独立テスト**: hostile、malformed、literal credential を含む、changing、metadata-bearing な Codex `SKILL.md` ファイルを開き、sensitive-content notice を acknowledge した後、正確で完全な source と metadata literal、credential masking または reveal control がないこと、environment reference を解決しないこと、activation なし、relationship expansion なし、close または rescan 時の cleanup を検証します。

**目に見えるチェックポイント**: Codex SKILL を選択すると、完全で非活性な detail 画面が開きます。

### fixture とテストを先行

- [ ] T074 [US2] Codex SKILL の frontmatter、reference、script、command、埋め込み markup、credential に対応する、生成済み hostile fixture と維持対象 secret fixture を `tests/fixtures/adversarial/build-fixtures.ts` と `tests/fixtures/secrets/build-fixtures.ts` で拡張する
- [ ] T075 [P] [US2] strict UTF-8/BOM、inert Markdown/frontmatter、YAML core-schema、alias なし、custom tag なし、depth 64、50,000 node、literal と semantic の scalar が64 KiB、512 entry、正確な source range、recognition-atomic failure の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T076 [P] [US2] 最大二つの Worker、固定 package URL、64/16/4 MiB の V8 limit、2秒 timeout、recognition ごとに2 MiB・generation ごとに32 MiB の message bound、timeout/crash/resource-exit 時の置換に関する Worker-pool の失敗テストを `tests/unit/inspection/seed-parsers.test.ts` に追加する
- [ ] T077 [P] [US2] literal credential、duplicate field、quote/escape/punctuation、environment-reference text、surrogate pair と combining mark をまたぐ UTF-16 range、JSON transport round trip、process environment lookup なし、masking/reveal artifact ゼロに関する正確な表示の失敗テストを `tests/unit/inspection/source-occurrences.test.ts` に追加する
- [ ] T078 [P] [US2] 境界付き frontmatter、閉じた field ID、source 順の duplicate occurrence、正確な authored literal と round trip 可能な UTF-16 range、内部専用 typed semantic、provenance、conditional discovery、skill resource、environment reference の非解決、evidence に関する Codex metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T079 [P] [US2] inferred effective aggregate を作らず、authored、available、selected、omitted、shadowed、disabled、conditional、unknown を投影する applicability の失敗テストを `tests/unit/inspection/applicability.test.ts` に追加する
- [ ] T080 [P] [US2] runtime-chain condition、same-name handling、unknown selection fact に関する Codex skill-composition の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T081 [P] [US2] 完全で非活性な記述済み source、正確に順序付けられた `authoredLiteral` 値、strict/stale ID、no-store behavior、truncation なしの4 MiB whole-response enforcement、source value を含まない diagnostics、bounded metadata に関する file-detail の失敗契約を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T082 [P] [US2] `POST /api/v1/files/{fileId}/reveals` と、masking・redaction・reveal・environment resolution のすべての endpoint が、client/server state を保持せず `404` を返すことを証明する route 不在の失敗契約を `tests/contract/http-api-routes.test.ts` に追加する
- [ ] T083 [P] [US2] same-origin Monaco、完全な authored source の read-only model、正確な read-only option、非活性な rendering、accessibility、request-token adoption、disposal に関する direct-detail の失敗テストを `tests/package/monaco-assets.test.ts` と `tests/unit/app/source-viewer.test.ts` に追加する
- [ ] T084 [P] [US2] localized sensitive-content notice と、purge 後の各 source または comparison open 前に必要な session-only acknowledgement（masking/reveal の主張や control は持たない）に関する FR-027 の失敗テストを `tests/unit/app/sensitive-content-notice.test.ts` に追加する
- [ ] T085 [US2] 記述済み content から参照される process environment の read または substitution がゼロであることを含め、parsing、metadata extraction、relationship、detail loading 全体へ zero-activation test を `tests/integration/security/zero-activation.test.ts` で拡張する
- [ ] T086 [US2] sensitive-content acknowledgement、正確な literal credential と environment-reference text、完全な Codex source、metadata、diagnostics、masking/reveal control の不在、keyboard use、route cleanup、liveness purge、rescan cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-detail.spec.ts` に追加する

### 実装

- [ ] T087 [P] [US2] 正確な import/frontmatter span、ECMAScript UTF-16 range、順序付けられた duplicate、authored-literal round trip、内部 typed semantic、recognition-atomic failure を備えた境界付きで inert な Markdown/frontmatter extraction を `src/inspection/parsers/markdown.ts` に実装する
- [ ] T088 [P] [US2] alias と custom tag を無効にし、CST/token に裏付けられた正確な authored slice、ECMAScript UTF-16 range、順序付けられた duplicate、内部 typed semantic、recognition-atomic failure を備えた境界付き YAML core-schema extraction を `src/inspection/parsers/yaml.ts` に実装する
- [ ] T089 [US2] 最大二つの parser Worker pool、固定 package URL、64/16/4 MiB limit、2秒での kill/replace、recognition ごと・generation ごとの message bound、source value を含まない固定 failure を `src/inspection/parsers/pool.ts` と `src/inspection/parsers/worker.ts` に実装する
- [ ] T090 [US2] ECMAScript UTF-16 code unit による正確な `SourceTextRange` validation、authored literal と typed semantic の分離、duplicate occurrence の保持、overlap rule、credential detection や environment resolution を行わない JSON-safe typed value を `src/inspection/parsers/source-ranges.ts` に実装する
- [ ] T091 [US2] 閉じた condition registry、境界付き source/assessment fact、決定論的な precedence projection を `src/inspection/applicability/conditions.ts`、`src/inspection/applicability/context.ts`、`src/inspection/applicability/precedence.ts` に実装する
- [ ] T092 [US2] 新しい strategy ID を追加せず、inventory が所有する Codex skill strategy を detail-time selection、same-name、runtime-chain、condition projection で拡張する処理を `shared/registries/runtime-composition.ts` に実装する
- [ ] T093 [US2] 参照される script、asset、任意 path を昇格させない relationship-only の skill-resource policy を `src/inspection/rules/codex.ts` に実装する
- [ ] T094 [US2] 閉じた field ID、zero-based source occurrence、正確な `authoredLiteral` 値、provenance-scoped な authored/default relationship、conditional applicability、environment reference の非解決、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T095 [US2] verified read、strict decode、完全な authored source の保持、正確な literal-slice extraction、recognition ごとの atomic parsing、one-edge derivation、snapshot 構築直後の raw-byte disposal を `src/inspection/scan.ts` に統合する
- [ ] T096 [US2] generation-owned な完全な authored source と正確な literal metadata、operational logging/persistence ゼロ、request-token adoption 不変条件、file・generation・route・liveness purge・Source removal 時の cleanup を `src/session/session.ts` と `app/composables/liveness.ts` に実装する
- [ ] T097 [US2] strict opaque ID、完全な authored-source DTO、正確に順序付けられた literal metadata、production encoder を使う4 MiB whole-response enforcement、no-store behavior、diagnostics、stale response を持つ `GET /api/v1/files/{fileId}` を `src/host/api-router.ts` に実装する
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
- [ ] T113 [US1] 決定論的な one-edge admission、metadata file ごとの一度の verified read、alias aggregation、境界付き diagnostics を `src/inspection/scan.ts` に統合する
- [ ] T114 [US1] Codex skill metadata の inventory kind filter、row、seed summary を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T115 [US1] 意味的に同等な英語・日本語の Codex skill-metadata inventory および derivation message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 7: Codex SKILL metadata 詳細

**目的**: admission された各 `agents/openai.yaml` candidate に、完全な literal source と境界付き typed detail を追加します。

**独立テスト**: valid、malformed、literal credential を含む、changing、oversized な metadata candidate を開き、境界付き YAML extraction、typed semantic と区別された正確な authored literal、seed provenance、stale handling、masking/reveal control または environment-reference resolution がないこと、activation ゼロ、file または generation removal 時の cleanup を検証します。

**目に見えるチェックポイント**: `agents/openai.yaml` を選択すると、所有元の SKILL detail とは別の完全で非活性な detail 画面が開きます。

### テスト先行

- [ ] T116 [P] [US2] allowlist 対象 field ID、順序付けられた duplicate occurrence、正確な YAML source slice/UTF-16 range、typed-semantic separation、seed provenance、unknown field、malformed/overlap range、resource limit、environment reference の非解決、正確な evidence に関する Codex skill-metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T117 [P] [US2] 正確に順序付けられた skill-metadata literal、whole-response bound、stale ID、client retention ゼロに関する file-detail および removed-reveal-route の失敗契約を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T118 [P] [US2] metadata の command、asset、resource、script、URI、任意 path に対する zero-activation と relationship を追跡しないことの失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T119 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal skill-metadata detail、seed provenance、diagnostics、detail-state cleanup、keyboard use、rescan cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-detail.spec.ts` に追加する

### 実装

- [ ] T120 [US2] 境界付き `agents/openai.yaml` field、正確な authored-literal extraction、seed applicability、relationship、diagnostics、evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
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

**独立テスト**: metadata、contained declaration、reference、vendor が対応する symlink、malformed frontmatter、secret を持つ Claude skill を開き、境界付きで完全な literal detail、exact-launch の skills-directory-plugin applicability fact、明示的な `shared.excluded.symlink-target` diagnostics、manifest read authority なし、target read なし、変更されない Codex detail を検証します。

**目に見えるチェックポイント**: Claude SKILL detail が完成し、Codex detail と一貫します。

### テスト先行

- [ ] T139 [US2] `claude.behavior.repo.skills-directory-plugin` を、exact-launch で読み取り権限を付与しない applicability/activation fact とし、その strategy および evidence conformance row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T140 [P] [US2] 正確な frontmatter occurrence/range、duplicate authored literal、ancestor/lazy discovery uncertainty、contained declaration、relationship、environment reference の非解決、正確な evidence、および manifest authority ではなく exact-launch applicability/activation fact としての `claude.behavior.repo.skills-directory-plugin` に関する Claude metadata の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T141 [P] [US2] `targetOrigin`、正確な authored target slice/range reuse、null-authored documented default、内部 semantic normalization、provenance-relative target、boundary status、one-level depth、1,000-edge retention、relationship read authority ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T142 [P] [US2] vendor が対応する Claude skill symlink が、明示的な `shared.excluded.symlink-target` parity diagnostic を伴い Inspector policy では引き続き拒否されることを証明する回帰失敗テストを `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T143 [P] [US2] manifest loading や未知の runtime selection を主張せず、Claude skill selection、exact-launch の skills-directory-plugin applicability、workspace-trust condition、condition reason に関する runtime-composition の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T144 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude detail、uncertainty、relationship、diagnostics、detail-state cleanup、継続する Codex behavior に関するブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-detail.spec.ts` に追加する

### 実装

- [ ] T145 [US2] `claude.behavior.repo.skills-directory-plugin` を、accepted exact-launch SKILL candidate だけに付与される、読み取り権限を付与しない behavior fact として `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T146 [US2] strategy ID または manifest read authority を追加せず、inventory が所有する Claude skill strategy を detail-time selection/condition mapping、exact-launch skills-directory-plugin applicability、workspace-trust fact で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T147 [US2] 新しい source ID を作成せず、skills-directory behavior と strategy から既存の Claude official-source record への reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T148 [US2] manifest candidate を作成せず、境界付き metadata、conditional applicability、exact-launch の skills-directory-plugin fact、relationship、`shared.excluded.symlink-target` parity diagnostic、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T149 [US2] target を展開せず、atomic Claude extraction と provenance-scoped relationship を `src/inspection/scan.ts` に統合する
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

**独立テスト**: 三つのすべての directory と共有物理 file から Copilot skill を開き、境界付き metadata、分離された surface applicability、progressive-loading uncertainty、winner の主張なし、完全な literal source、変更されない Codex/Claude detail を検証します。

**目に見えるチェックポイント**: Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。

### テスト先行

- [ ] T168 [P] [US2] 正確な frontmatter occurrence/range、authored literal と typed semantic の分離、progressive loading、duplicate-name uncertainty、除外された custom directory、environment reference の非解決、正確な evidence に関する Copilot metadata の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T169 [P] [US2] 互換性のない behavior をまとめず、VS Code、CLI、Cloud の selection fact に関する composition の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T170 [P] [US2] surface-specific recognition と condition fact が分離されたままであることを証明する typed-detail の失敗テストを `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T171 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、Codex と Claude の behavior を維持した Copilot-only および shared-recognition detail に関するブラウザー受け入れ失敗テストを `tests/e2e/copilot-skills-detail.spec.ts` に追加する

### 実装

- [ ] T172 [US2] strategy ID を追加せず、inventory が所有する Copilot skill strategy を detail-time surface-qualified condition および selection projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T173 [US2] 境界付き metadata、selection uncertainty、relationship、正確な evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T174 [US2] Copilot の surface difference と文書間の conflict を維持するよう applicability projection を `src/inspection/applicability/precedence.ts` において拡張する
- [ ] T175 [US2] atomic Copilot extraction と一度だけ読み取る shared-file detail assembly を `src/inspection/scan.ts` に統合する
- [ ] T176 [US2] 別々の Copilot surface に対する typed recognition presentation を `app/components/inspection/RecognitionDetails.vue` において拡張する
- [ ] T177 [US2] 意味的に同等な英語・日本語の Copilot detail および surface-uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 12: 統合 SKILL inventory

**目的**: 三つの vendor demonstration を、一つの一貫した skill inventory にします。

**独立テスト**: unique skill、duplicate name、shared physical file、hard-link alias、item failure、secret、limit を持つ all-tool fixture を使用し、決定論的な row、multi-recognition、filter、partial continuity、rescan replacement、応答性の高い interaction performance を検証します。

**目に見えるチェックポイント**: 完全な skill-first inventory を filter して理解できます。

### fixture とテストを先行

- [ ] T178 [US1] 対応するすべての selector、shared file、hard-link alias、duplicate name、near miss、failure、secret、exact-limit case を持つ all-tool SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T179 [P] [US1] すべての SKILL selector と multi-tool recognition combination に関する conformance の失敗テストを `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T180 [P] [US1] 決定論的な physical-file/recognition order、一度だけ読み取る merge、alias cap、partial continuity、progress、limit 後に extra read を行わないことに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T181 [P] [US1] 統合 SKILL row に対する source、tool、kind、path filter の client 失敗テストを追加し、detail acknowledgement より前の inventory state が source text、metadata literal、sensitive fixture value を一切含まないことを `tests/unit/app/inventory.test.ts` で証明する
- [ ] T182 [P] [US1] whole-generation replacement、stale detail/request-token/selection cleanup、通常 rescan をまたぐ acknowledgement retention、filter retention、profile/cache/repository persistence ゼロに関する rescan の失敗テストを `tests/unit/session/session.test.ts` と `tests/unit/app/session-shell.test.ts` に追加する
- [ ] T183 [P] [US1] Exact OS image/version、CPU architecture/model/logical count、memory、storage/filesystem、runtime、benchmark command/configuration、deterministic fixture manifest/digestを持つversion付き公開profile validatorと再利用可能なSC-002 harnessを追加する。100,000-entry/500-match fixtureを構築し、fresh processとsnapshot/cache policyを制御し、現在requestのqueued/active-phase/complete/partial/failed statusが画面表示されassistive technologyにも公開された場合だけbrowser-request timingをcaptureしてgeneric/loading/unchanged/old stateを拒否し、operable inventoryと2つのstandardized interactionを測定してnon-gating smoke runを1回実行する。対象は `tests/performance/sc002-reference-profile.json`、`tests/performance/repository-scan.test.ts`、`tests/performance/inventory-interactions.test.ts` とし、exact 10-run 9/10 protocolはT918へ延期する
- [ ] T184 [US1] 統合 filter、multi-recognition、provenance、keyboard use、inventory からの source exposure なし、detail open 前の sensitive-content notice 提示に関するブラウザー回帰を `tests/e2e/skills-inventory.spec.ts` に追加する

### 実装

- [ ] T185 [US1] skill に対する決定論的な physical-file、alias、recognition、provenance aggregation を `src/inspection/scan.ts` で完成させる
- [ ] T186 [US1] generation-aware skill filtering、selection、rescan replacement、stale cleanup を `app/composables/filters.ts` と `app/composables/session.ts` で完成させる
- [ ] T187 [US1] アクセシブルな source/tool/kind/path filter を `app/components/inventory/InventoryFilters.vue` で完成させる
- [ ] T188 [US1] 統合 skill row、recognition badge、provenance summary、empty state、progress control を `app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue`、`app/pages/index.vue` で完成させる
- [ ] T189 [US1] 境界付き diagnostics を維持し、inventory の loading、empty、retry、replacement state で source を露出せず、detail navigation 前に sensitive-content notice を利用可能に保つ処理を `app/components/diagnostics/DiagnosticList.vue` と `app/components/inspection/SensitiveContentNotice.vue` に実装する
- [ ] T190 [US1] 意味的に同等な英語・日本語の unified-inventory および multi-recognition message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 13: SKILL 比較

**目的**: 他の customization family より先に、skill を使用して generic な完全 literal comparison path を提供します。

**独立テスト**: current-generation で読み取り可能な skill を正確に二つ選択し、sensitive-content notice を acknowledge して、literal credential の差分を含む完全な authored-source diff、正確な typed-recognition row、environment reference の解決ゼロ、20,000 line/5秒 fallback、stale/epoch cleanup、same-origin Worker 使用、keyboard/screen-reader access を検証します。

**目に見えるチェックポイント**: 読み取り可能な任意の二つの SKILL file を、activation や mutation を発生させずに比較できます。

### テスト先行

- [ ] T191 [P] [US3] exactly-two selection、sensitive-content acknowledgement、既存の二つの FileDetail load、readable/current-generation/client-epoch/request-token guard、stale rejection、replacement または removal 後の cleanup に関する失敗テストを `tests/unit/app/comparison.test.ts` に追加する
- [ ] T192 [P] [US3] ranking や winner の主張を行わず、authored literal を伴う正確な `(tool, kind, fieldId, occurrence)` metadata matching、provenance、applicability、relationship、order comparison に関する失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T193 [P] [US3] 二つの完全な literal model、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`、same-origin Worker 使用、20,000 line/5秒 fallback、disposal に関する direct-comparison-route の失敗テストを `tests/unit/app/source-diff.test.ts` と `tests/package/monaco-assets.test.ts` に追加する
- [ ] T194 [US3] 完全な authored skill diff、正確な literal credential difference、変更されない environment-reference text、typed recognition difference、responsive layout、keyboard access、fallback diagnostics、cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/skills-comparison.spec.ts` に追加する

### 実装

- [ ] T195 [US3] exactly-two generation-scoped selection、acknowledgement および epoch/token guard、compare API を使わない二つの既存 detail load、replacement・purge・removal 後の teardown を `app/composables/comparison.ts` に実装する
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

**独立テスト**: `AGENTS.override.md` と `AGENTS.md` をインベントリ化し、メモリ内の受け入れ済み carrier fixture に対して `codex.derived.fallback-basename` を実行します。最大 16 件の保持、祖先関係を比較できること、orphan/configured-target escape がないこと、決定論的な provenance、およびフェーズ 23 で carrier が受け入れられるまでは `.codex/config.toml` の読み取りも configured fallback row もゼロであることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。

### fixture とテストを先行

- [ ] T205 [US1] override、regular file、configured fallback、empty file、16/17 fallback name、ancestry-comparable/incomparable path、import、secret、malformed content、near miss に対する Codex instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T206 [US1] Codex instruction behavior、読み取り権限を付与しない `codex.behavior.repo.config` と `codex.behavior.user.config` carrier fact、静的 matcher、純粋な fallback 宣言/導出 fixture contract、composition、relationship、path-negative boundary、reciprocal evidence row を、`codex.derived.fallback-basename` の registry row を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T207 [P] [US1] `codex.repo.instructions`、override/regular selector、empty-file behavior、path-negative higher scope、決定論的な provenance、およびフェーズ 23 より前には config candidate と `codex.derived.fallback-basename` registry record の両方が存在しないことに関する matcher と recognition の失敗テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T208 [US1] 静的な Codex instruction の scan 失敗テストと、検証済みのメモリ内 fallback 宣言を導出インターフェースへ渡す独立した pure-function test を追加し、最大 16 件の保持、祖先関係の比較、orphan/config escape の拒否、ルール登録前には carrier と target のいずれにもアクセスしないことを `tests/integration/repository-scan.test.ts` で証明する
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

**独立テスト**: 静的な Codex instruction fixture を開き、override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、instruction-byte budget、relationship-only の import、stale-ID behavior、diagnostics、detail-state cleanup を検証します。別途、config path を読み取らず、メモリ内 carrier から fallback detail を投影できることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction を選択すると、明示的な order、byte budget、condition、および carrier 受け入れ前であることを正直に示す fallback 状態を備えた完全で非活性な detail が開きます。

### テスト先行

- [ ] T216 [P] [US2] override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、instruction-byte budget、16 fallback basename に関する Codex の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T217 [P] [US2] 正確な authored target slice、`targetOrigin`、null-authored documented default、内部 semantic normalization、lexical status、cycle、boundary status、one-level relationship、environment reference の非解決、target read authority ゼロに関する import/reference の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T218 [P] [US2] 完全な Codex instruction source、閉じた metadata field ID、正確に順序付けられた authored literal、typed semantic の非 serialize、condition、fallback、relationship、diagnostics、environment reference の非解決、stale ID に関する detail/API の失敗テストを `tests/contract/http-api-files.test.ts` と `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T219 [US2] reciprocal contract reference を持つ Codex instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T220 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal static Codex instruction detail、byte budget、condition、pre-carrier fallback 状態、relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T221 [US2] strategy ID を追加せず、inventory が所有する Codex instruction/config strategy を detail-time fallback、byte-budget、applicability、relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T222 [US2] Codex instruction composition、fallback projection、byte-budget fact、provenance-relative relationship extraction を `src/inspection/applicability/precedence.ts` と `src/inspection/parsers/markdown.ts` に実装する
- [ ] T223 [US2] Codex instruction の正確な authored-literal preservation、atomic parsing、relationship-only reference、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal、および後から受け入れられた carrier が有界 candidate をすでに生成している場合に限る fallback provenance の投影を `src/inspection/scan.ts` に統合する
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
- [ ] T238 [P] [US2] 正確な authored target slice/range、内部 semantic normalization、cycle、boundary status、one-level depth、environment reference の非解決、target read authority ゼロに関する Claude import の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T239 [US2] reciprocal contract reference を持つ Claude instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T240 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Claude instruction detail、layer order、condition、import、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T241 [US2] strategy ID を追加せず、inventory が所有する Claude instruction strategy を detail-time local-order、applicability、authored import-relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T242 [US2] 境界付き metadata、layer condition、relationship、diagnostics、evidence で Claude instruction recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T243 [US2] Claude instruction parsing、正確な authored-literal extraction、relationship-only import、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
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
- [ ] T265 [US2] 境界付き instruction metadata、surface condition、pending settings applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T266 [US2] Copilot instruction parsing、正確な authored-literal extraction、inert relationship、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal、settings-file I/O ゼロを `src/inspection/scan.ts` に統合する
- [ ] T267 [US2] typed detail と、意味的に同等な英語・日本語の Copilot instruction surface、pending settings applicability、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 21: 統合 Instructions inventory

**目的**: 明示的な pre-carrier shared-file matrix とともに、priority wave の instruction baseline を統合します。`AGENTS.md` は Codex+Copilot、root `CLAUDE.md` は Claude+Copilot、nested `CLAUDE.md` はフェーズ 23 で独立して受け入れられた config carrier が正確な fallback match を有効化するまで Claude-only、`CLAUDE.local.md` は Claude-only です。

**独立テスト**: all-vendor instruction fixture を使用し、正確な pre-carrier shared-file matrix、受け入れ済み file ごとの一つの物理 item/read、別々の recognition/provenance、nested `CLAUDE.md` の filename-based Codex promotion なし、明示的な dormant fallback 状態、決定論的な order、filter、partial continuity、rescan cleanup を検証します。

**目に見えるチェックポイント**: 完全な静的 instruction inventory、すべての shared-file interpretation、および MCP が最小 carrier を受け入れたときに有効になる一つの有界 fallback integration を理解できます。

### テスト先行

- [ ] T268 [US1] `AGENTS.md` Codex+Copilot、root `CLAUDE.md` Claude+Copilot、nested `CLAUDE.md` Claude-only と dormant configured-fallback variant、Claude-only `CLAUDE.local.md`、その他すべての selector、failure、secret、exclusion、alias、exact limit を持つ pre-carrier all-vendor instruction fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T269 [P] [US1] 登録済みのすべての静的 instruction selector と exclusion、registry entry を持たない純粋 fallback interface、正確な `AGENTS.md`/root `CLAUDE.md`/nested `CLAUDE.md`/`CLAUDE.local.md` recognition matrix に関する完全な pre-carrier conformance test を `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T270 [P] [US1] 一度だけ読み取る shared-file assembly、正確な pre-carrier recognition matrix、dormant nested fallback に対する Codex recognition ゼロ、決定論的な provenance order、alias cap、partial continuity、config または rejected-target access ゼロに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T271 [P] [US1] source/tool/kind/path filter、shared recognition badge、dormant fallback 状態、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T272 [US1] pre-carrier unified instruction inventory、filter、shared recognition、dormant fallback 状態、order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/instructions-inventory.spec.ts` に追加する

### 実装

- [ ] T273 [US1] filename inference を行わず、正確な pre-carrier shared-file matrix に対する決定論的な physical-file assembly を完成させ、フェーズ 23 が検証済みの導出を供給した後に限って独立した configured-fallback Codex provenance を受け入れる処理を `src/inspection/scan.ts` に実装する
- [ ] T274 [US1] instruction kind、shared recognition、dormant fallback 状態、後で有効になる fallback provenance に対する inventory filter と row を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で完成させる
- [ ] T275 [US1] 意味的に同等な英語・日本語の unified instruction inventory、shared-recognition、fallback、exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 22: Instructions 比較

**目的**: generic comparison view を、literal および typed な instruction difference へ拡張します。

**独立テスト**: 二つの instruction を比較し、correctness claim や environment-reference resolution を行わず、完全な authored source と occurrence を正確に整列した metadata literal、layering、fallback、applicability、relationship、provenance difference を検証します。

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

**独立テスト**: 検証済み fallback basename、名前付きサーバー、重複、フィールド欠落、不正なテーブル、敵対的なコマンド、シークレット、独立 MCP のニアミスを含む config layer を検査し、seed/derived-rule のアトミックな受け入れ、有界 fallback row、owner-file identity、合成 MCP file がないこと、独立 MCP candidate がないこと、config-detail badge がないこと、一度だけの検証済み読み取り、接続ゼロを検証します。

**目に見えるチェックポイント**: 最小 carrier 上の Codex 内包 MCP 宣言をフィルタリングでき、フェーズ 15 の configured instruction fallback が表示されます。完全な configuration inventory/detail はフェーズ 57～58 まで延期します。

### フィクスチャとテストを先に

- [ ] T280 [US1] project layer、fallback name、名前付き MCP server、重複、不正な table、敵対的な command、secret、agent inheritance reference、standalone near miss、plugin relationship、User/managed path negative を対象とする最小 Codex config-carrier fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T281 [US1] `codex.repo.config`、`codex.derived.fallback-basename`、`codex.behavior.repo.mcp`、読み取り権限を付与しない `codex.behavior.repo.hooks` carrier fact、contained recognition、selection、relationship、reciprocal evidence row、path-negative な standalone/plugin/User/managed case を、`codex.excluded.plugin-files` または MCP exclusion ID を作成せずに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T282 [P] [US1] `codex.repo.config` と `codex.derived.fallback-basename` のアトミックな登録、正確な config-carrier admission、有界な derived instruction、standalone Codex MCP candidate がないこと、plugin、agent-reference、User、managed、任意の config path を昇格しないことに関する失敗する matcher test を `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T283 [P] [US1] Codex MCP が新たに受け入れられた config carrier に関連付けられ、configured instruction fallback が独立した provenance で有効になり、まだ `settings/config` recognition も synthetic file も現れず、欠落または不正な宣言をアトミックに省略することを証明する失敗する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T284 [US1] Codex contained MCP row、owner-carrier への移動、新たに有効になった configured instruction fallback、config kind/detail badge がないこと、filter、path-negative な standalone/plugin case、diagnostics、connection control がないことを対象とするブラウザー受け入れテストを `tests/e2e/codex-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T285 [US1] フェーズ 15 の carrier behavior を再利用し、Hook candidate・standalone MCP・connection authority を与えず、Codex MCP/config-contained Hook behavior statement を完全な base MCP lookup/owner strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加する
- [ ] T286 [US1] `codex.repo.config` と、その one-edge `codex.derived.fallback-basename` rule をアトミックに追加し、Codex MCP candidate は作成せず、`codex.excluded.plugin-files` を早期所有せずに standalone/plugin/User/managed path を negative のまま保ち、contained declaration には relationship record だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T287 [US1] Codex config-carrier、derived-fallback、MCP、および読み取り権限を付与しない contained-Hook fact の evidence と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T288 [US1] config-carrier matching、既存の bounded fallback helper のアトミックな activation、standalone MCP rejection、contained-declaration classification を `src/inspection/rules/codex.ts` に実装する
- [ ] T289 [US1] fallback basename と `[mcp_servers.*]` に対して lexical span と内部 semantic normalization を備えた最小限の有界 TOML carrier extraction を実装し、一つの検証済み config file に決定論的な provenance で MCP recognition と derived instruction を関連付け、`settings/config` recognition を省略し、synthetic candidate を作成しない処理を `src/inspection/parsers/toml.ts`、`src/inspection/recognizers/codex.ts`、`src/inspection/scan.ts` に実装する
- [ ] T290 [US1] MCP インベントリのフィルターと内包所有者の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T291 [US1] 意味的に同等な英語/日本語の Codex 内包 MCP、所有者、スキーマ、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 24: Codex MCP の詳細

**目的**: 一般 configuration の表示はフェーズ 58 まで保留しつつ、最小 Codex carrier を完全な literal MCP detail、active-config precedence、trust、inheritance、duplicate、zero-connection behavior で拡張します。

**独立テスト**: 内包された Codex 宣言を開き、有効なプロジェクト設定の優先順位、信頼条件、サーバー名の重複、親/エージェント継承の事実、正確な authored-literal preservation、診断、および DNS、ソケット、HTTP、認証、プローブ、コマンド、展開、参照先の読み取りが一切ないことを検証する。

**目に見えるチェックポイント**: Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。

### テストを先に

- [ ] T292 [P] [US2] named、inline、ancestor、plugin、runtime-only の reference に加え、フェーズ 50 より前には unresolved behavior backlink、connection、target promotion を持たない純粋な dormant agent-inheritance adapter に関する失敗する MCP schema test を `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T293 [P] [US2] active project-config precedence、trust condition、duplicate name、有効になった fallback provenance、一般 config presentation がないことに関する失敗する Codex carrier/MCP test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T294 [P] [US2] Codex MCP の検査によって DNS、ソケット、HTTP、認証、プローブ、コマンド実行、展開、プラグインのロード、参照ファイルの読み取りが発生しないことを証明するゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
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
- [ ] T321 [US2] 閉じた Claude MCP field ID、正確な tree-token source span/UTF-16 range、source 順の duplicate、authored-literal round trip、内部 typed semantic、schema distinction、limit、recognition-atomic failure、source value を含まない diagnostics を備えた境界付きで非活性な strict-JSON extraction を `src/inspection/parsers/json.ts` に実装する
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

**目的**: ルートの `.vscode/mcp.json` だけを、専用の Copilot VS Code MCP スキーマとして追加する。

**独立テスト**: 正確なルートファイルをインベントリに含め、子孫、一般の `.vscode/settings.json`、User/profile MCP、CLI スキーマとの混同、リンク、エイリアス、ニアミスを拒否する。

**目に見えるチェックポイント**: ユーザーは、VS Code の `servers` スキーマを Copilot CLI MCP ファイルと区別して識別できる。

### フィクスチャとテストを先に

- [ ] T354 [US1] 正確なルート、子孫のニアミス、不正な `servers` スキーマ、敵対的なコマンド、シークレット、リンク、エイリアス、一般設定、User/profile 状態、CLI スキーマとの混同を対象とする Copilot VS Code MCP フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T355 [US1] Copilot VS Code MCP behavior、読み取り権限を付与しない `copilot.behavior.vscode.user.mcp` と `copilot.behavior.vscode.agents` fact、正確な candidate、selection、`copilot.excluded.vscode-settings` を作成しない path-negative な general-settings/descendant/User/profile case、relationship、reciprocal evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T356 [P] [US1] 正確な `copilot.repo.mcp.vscode`、専用の `servers` スキーマ、descendant/general-settings/User/profile の拒否、CLI スキーマに統合しないことに対する失敗するマッチャー/認識テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T357 [US1] Copilot VS Code MCP 行、スキーマバッジ、フィルター、除外、診断、接続コントロールがないことを対象とするブラウザ受け入れテストを `tests/e2e/copilot-vscode-mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T358 [US1] Copilot VS Code MCP/User/agent fact を、完全な base lookup/selection および dormant-owner strategy record とともに `shared/registries/vendor-behaviors.ts` と `shared/registries/runtime-composition.ts` に追加し、Custom Agent file を admission せず production registry を閉じたままにする
- [ ] T359 [US1] 正確な VS Code MCP candidate だけを追加し、`copilot.excluded.vscode-settings` を早期所有せず、新しい MCP exclusion ID も作成せずに general settings、descendant、User、profile location を path-negative のまま保つ処理を `shared/registries/inspection-rules.ts` に追加する
- [ ] T360 [US1] Copilot VS Code MCP evidence に加え、このフェーズで所有する読み取り権限を付与しない二つの VS Code MCP/agent fact の reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T361 [US1] ルートと完全一致する Copilot VS Code MCP のマッチングと専用スキーマの認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T362 [US1] CLI 候補を変更せずに、Copilot VS Code MCP の分類を `src/inspection/scan.ts` に統合する
- [ ] T363 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Copilot VS Code スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 31: Copilot VS Code MCP の詳細

**目的**: workspace/User 間の重複の不確実性と信頼条件を備えた、完全な literal VS Code MCP 詳細を追加する。

**独立テスト**: 敵対的および不正な `.vscode/mcp.json` を開き、専用スキーマのフィールド、workspace/User 間で同名の場合の未知の解決、信頼、正確な authored literal、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: VS Code MCP file を選択すると、schema 固有の完全で非活性な detail と uncertainty が表示される。

### テストを先に

- [ ] T364 [P] [US2] `servers` スキーマ、workspace スコープ、workspace/User 間の未知の重複、信頼、来歴、正確なエビデンスに対する失敗する Copilot VS Code MCP テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T365 [P] [US2] VS Code MCP のコマンド、URL、ヘッダー、環境、DNS、ソケット、認証、信頼プロンプト、User/profile 状態を対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T366 [P] [US2] 完全な authored source、occurrence 順に正確な field literal/relationship target、専用 schema、condition、environment-reference substitution なし、diagnostics、stale ID に関する VS Code MCP-detail API の失敗テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T367 [US2] 相互の契約参照を備えた、失敗する VS Code MCP runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T368 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal VS Code MCP detail、schema、duplicate uncertainty、trust、diagnostics、zero-connection behavior に関するブラウザー受け入れテストを `tests/e2e/copilot-vscode-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T369 [US2] strategy ID を追加せず、inventory が所有する Copilot VS Code MCP strategy を detail-time workspace/User duplicate、trust、schema、authored relationship projection で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T370 [US2] Copilot VS Code MCP のスキーマ、重複の不確実性、信頼、来歴のメタデータを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T371 [US2] tree に裏付けられた正確な source span/UTF-16 range、閉じた VS Code MCP field ID、source 順の duplicate、authored literal と内部 typed semantic、comment、schema distinction、limit、recognition-atomic failure、source value を含まない diagnostics を備えた境界付きで非活性な JSONC mode を `src/inspection/parsers/json.ts` に追加する
- [ ] T372 [US2] VS Code MCP の正確な authored-literal preservation、condition、diagnostics、non-following relationship を `src/inspection/scan.ts` に統合する
- [ ] T373 [US2] 型付き詳細と、意味的に同等な英語/日本語の VS Code MCP スキーマ、信頼、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

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

**独立テスト**: root `.mcp.json` に対する別々の Claude/Copilot recognition を持つ一つの物理 item/read、Copilot-only の nested/VS Code file、Codex carrier、Claude skill owner、origin fileを持たない Cloud fact、これらの family が受け入れられる前には custom-agent/settings/plugin/marketplace owner row がないこと、hosted synthetic file がないこと、決定論的な schema/provenance order、filter、path negative、alias、limit、rescan cleanup を検証します。

**目に見えるチェックポイント**: Priority MCP inventory を利用し、読み取り可能な physical file/owner と origin fileを持たない runtime fact を区別でき、まだ受け入れられていない owner family の premature row は表示されません。

### テストを先に

- [ ] T388 [US1] root/shared/nested CLI file、VS Code file、Codex carrier、Claude skill containment、dormant future-owner adapter、plugin-path relationship、settings non-owner、origin fileを持たない Cloud fact、hostile field、secret、alias、path negative、正確な limit に対する priority MCP fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T389 [US1] まだ所有されていない plugin/settings exclusion ID がなく、contained/runtime candidate rule がゼロであることを証明しながら、priority MCP behavior、file matcher、現在受け入れ済み owner/runtime selection、dormant adapter contract、relationship、path-negative case、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T390 [P] [US1] Claude root、Copilot CLI/VS Code file、Codex standalone がないこと、path-negative な User/hosted/configured input、relationship-only plugin path、contained/runtime MCP fact による candidate rule がゼロであることに関する完全な matcher test を `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T391 [P] [US1] shared root Claude/Copilot、Copilot-only nested/VS Code、Codex carrier、Claude skill owner、dormant custom-agent/other-Claude-owner adapter、origin fileを持たない Cloud fact、synthetic file がないこと、schema distinction、決定論的な provenance に関する priority recognition-matrix test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T392 [P] [US1] shared MCP の read-once、決定論的な recognition/provenance order、現在受け入れ済み owner attachment、dormant-owner nonpublication、alias、limit、partial continuity、connection/target read ゼロに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T393 [US1] priority MCP inventory、shared attribution、現在の contained owner、origin fileを持たない runtime fact、dormant-owner row の不在、path negative、schema label、diagnostics、keyboard use を対象とするブラウザー受け入れテストを `tests/e2e/mcp-inventory.spec.ts` に追加する

### 実装

- [ ] T394 [US1] priority MCP file/owner の read-once assembly、決定論的な recognition/provenance/schema order、owner-gated dormant adapter、synthetic file がないこと、bounded diagnostics を `src/inspection/scan.ts` で完成させる
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

**独立テスト**: 二つの rule を比較し、完全な literal source に加えて、整列した path、layer、trust、provenance、applicability、documentation status を検証する。

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
- [ ] T472 [US2] bounded metadata、condition、relationship、診断、evidence を備えるよう Copilot command recognition を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T473 [US2] Copilot command parsing、正確な authored-literal preservation、非活性な reference、完全な authored source を保持しつつ行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T474 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot command precedence、reference、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 44: 統合 Commands インベントリ

**目的**: 正しい root-shared および nested-Claude-only recognition により、Claude と Copilot の command candidate を統合する。

**独立テスト**: root direct-child の `.claude/commands/*.md` について一つの物理 item/read と二つの recognition、nested command について Claude-only recognition、決定論的な namespace/provenance、filter、exclusion、alias、limit、rescan cleanup を検証する。

**目に見えるチェックポイント**: ユーザーは共有 root command と nested Claude-only command を区別できる。

### テストを先に

- [ ] T475 [US1] recursive Claude namespace、root の Copilot-compatible command、nested Claude-only file、duplicate name、secret、reference、alias、limit、near miss を対象とする command fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T476 [US1] 両ベンダー、shared recognition、exclusion ID を伴わない path-negative configured/User case、composition、relationship、evidence の command conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T477 [US1] root の共有 direct child、nested Claude-only command、namespace construction、除外された `.claude/prompts` に関する完全な matcher/recognition-matrix テストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T478 [P] [US1] 一度だけ読み取る root command、決定論的な recognition/provenance order、alias、limit、partial continuity、referenced-target read なしに関する失敗する統合テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T479 [US1] 統合 command inventory、namespace、shared recognition、nested Claude-only row、filter、診断に関するブラウザー受け入れテストを `tests/e2e/commands-inventory.spec.ts` に追加する

### 実装

- [ ] T480 [US1] 一度だけ読み取る root command assembly、nested Claude-only recognition、決定論的な provenance、exclusion を `src/inspection/scan.ts` で完成させる
- [ ] T481 [US1] command inventory row と、意味的に同等な英語/日本語の namespace、shared-tool、exclusion メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 45: Commands の比較

**目的**: literal および型付きの command 差分を比較に追加する。

**独立テスト**: 二つの command を比較し、完全な literal source に加えて、整列した namespace、invocation、recognition、precedence、provenance、reference を検証する。

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

**独立テスト**: 二つの prompt を比較し、完全な literal source に加えて、整列した invocation、scope、provenance、applicability、reference を検証する。

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
- [ ] T514 [US1] Codex agent matching と境界付き recognition を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T515 [US1] Codex custom-agent kind と project-layer provenance に対する inventory row を `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T516 [US1] 意味的に同等な英語・日本語の Codex custom-agent inventory および exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 50: Codex Custom Agents 詳細

**目的**: 完成済みの Codex MCP carrier を agent の MCP owner とするのではなく relationship source として再利用しながら、完全で非活性な Codex custom-agent source、spawned-session configuration、inheritance、relationship、condition detail を追加します。

**独立テスト**: hostile および malformed な Codex agent を開き、境界付き TOML parsing、model/reasoning/sandbox/skill、parent inheritance、再適用された live sandbox/approval fact、MCP carrier inheritance/origin relationship、agent-owned MCP recognition がないこと、config-path relationship、正確な authored literal、diagnostics、detail-state cleanup、zero connection を検証します。

**目に見えるチェックポイント**: Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、完全で非活性な spawned-session detail と carrier-inheritance relationship が表示されます。

### テスト先行

- [ ] T517 [P] [US2] Codex agent field、strict limit、malformed input、atomic extraction に関する inert TOML parsing の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T518 [P] [US2] model、reasoning、sandbox、skill、agent-owned MCP recognition を持たない closed MCP carrier-origin relationship、config-path relationship、parent inheritance、live sandbox/approval reapplication に関する Codex agent の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T519 [P] [US2] Codex agent declaration が tool の実行、process の spawn、MCP への接続、参照 config path の読み取りを行わないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T520 [US2] relationship-only の carrier inheritance、agent-owned MCP recognition がないこと、reciprocal contract reference に関する Codex custom-agent runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T521 [US2] sensitive-content acknowledgement、正確な literal credential/environment-reference 表示、process-environment sentinel substitution なし、masking/reveal control なし、完全な literal Codex custom-agent detail、agent-owned MCP row を持たない carrier-linked MCP inheritance relationship、diagnostics、detail-state cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T522 [US2] 既存の有界で不活性な TOML carrier parser を Codex agent normalization と extraction で `src/inspection/parsers/toml.ts` において拡張する
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
- [ ] T534 [US1] Claude agent matching と境界付き recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
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
- [ ] T543 [US2] 境界付き agent metadata、owner-gated contained MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
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
- [ ] T562 [US2] 境界付き agent metadata、owner-gated MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T563 [US2] Copilot agent metadata、exact authored-literal preservation、synthetic file も connection も作成しない owner-attached MCP、relationship-only Hook target、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T564 [US2] typed detail と、意味的に同等な英語・日本語の Copilot agent context、handoff、surface、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 55: 統合 Custom Agents inventory

**目的**: すべての custom-agent candidate を統合し、共有 Claude/Copilot file を一度だけ読み取り、フェーズ 52 と 54 で有効化した owner-attached MCP adapter を回帰し、Codex carrier inheritance は relationship-only のまま維持します。

**独立テスト**: all-vendor agent fixture を使用し、共有 `.claude/agents/*.md` に対する一つの物理 row/read、同じ owner ID 上の別々の Claude/Copilot agent recognition と MCP recognition、Codex agent-owned MCP recognition を作成しない Codex carrier inheritance relationship、決定論的な provenance、synthetic MCP file または connection がないこと、filter、duplicate-name uncertainty、exclusion、limit、rescan cleanup を検証します。

**目に見えるチェックポイント**: 完全な custom-agent inventory、共有 Claude/Copilot interpretation と owner-attached MCP fact、および duplicate file や誤った MCP ownership を伴わない Codex carrier-inheritance relationship を理解できます。

### テスト先行

- [ ] T565 [US1] 対応するすべての path、layer、duplicate name、shared Claude/Copilot file、Claude/Copilot owner-attached MCP declaration、Codex carrier-inheritance relationship、malformed metadata、secret field、reference、exclusion、alias、limit に対する all-vendor custom-agent fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T566 [US1] custom-agent behavior、matcher、Claude/Copilot owner-gated MCP composition、Codex relationship-only carrier inheritance、exclusion ID を持たない path-negative configured/User/hosted case、evidence conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T567 [US1] agent-owned MCP recognition を持たない Codex TOML、Claude recursive Markdown、Copilot directory、一つの owner ID 上に agent と MCP の recognition を持つ shared Claude/Copilot file、traversal uncertainty、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T568 [P] [US1] 一度だけ読み取る shared agent、決定論的な Claude/Copilot agent/MCP recognition と provenance order、Codex relationship-only carrier inheritance、alias、limit、isolated failure、synthetic file/connection ゼロ、relationship-target read ゼロに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T569 [US1] 統合 custom-agent inventory、filter、共有 Claude/Copilot owner-attached MCP recognition、agent-owned MCP row を持たない Codex carrier-inheritance relationship、duplicate uncertainty、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/custom-agents-inventory.spec.ts` に追加する

### 実装

- [ ] T570 [US1] custom agent に対する決定論的な physical-file assembly、Claude/Copilot agent/MCP recognition、Codex relationship-only carrier inheritance、provenance、exclusion、no-synthetic-file behavior を `src/inspection/scan.ts` で完成させる
- [ ] T571 [US1] すべての custom-agent kind、shared recognition、provenance、duplicate-name uncertainty に対する inventory row を `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T572 [US1] 意味的に同等な英語・日本語の unified custom-agent inventory および shared-recognition message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 56: Custom Agents 比較

**目的**: comparison を literal および typed な custom-agent difference へ拡張します。

**独立テスト**: 2 つの custom agent を比較し、完全なリテラルの source と、整列した context、tool、該当する場合の Claude/Copilot owner-attached MCP または Codex carrier-inheritance relationship、provenance、relationship、condition difference を検証します。

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

**目的**: フェーズ 23～24 の最小 bounded TOML carrier を、残りの inert Codex configuration field とその `settings/config` detail で拡張します。Configured instruction fallback と MCP detail はすでに有効です。

**独立テスト**: malformed および secret-bearing な project config layer を開き、既存 atomic TOML parse の拡張、root から `cwd` への precedence、closest-value behavior、trust、relative base、すでに有効な fallback/MCP field、残りの inert declaration、exact authored-literal preservation、diagnostics、2 度目の read/derivation を伴わない detail-state cleanup を検証します。

**目に見えるチェックポイント**: `.codex/config.toml` を選択すると、宣言された target を読み取らず、完全で inert な typed configuration と fallback declaration が表示されます。

### テスト先行

- [ ] T589 [US2] array/table、strict UTF-8、malformed value、depth/nodes/scalars/metadata limit、relative-path base、atomic extraction に関する境界付き TOML の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T590 [P] [US2] root から `cwd` への layer、closest-value behavior、trust、最大 128 UTF-8 byte の literal fallback basename を最大 16 件、declaration、除外された higher scope に関する Codex config の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T591 [P] [US2] fallback name、agent config path、model-instruction path、compact-prompt path、skill path、Hook field、MCP field が target read または activation を一切認可しないことを証明する relationship と safety の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T592 [P] [US2] 既存 precedence、trust、relative base、active instruction/MCP projection の拡張と、依然として延期される Hook projection に関する Codex configuration strategy/registry-graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T593 [P] [US2] 完全なリテラルの TOML value、strict/stale ID、no-store behavior、diagnostics、bounded metadata に関する、失敗する file-detail/removed-reveal-route contract を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T594 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex configuration detail、precedence、trust、fallback declaration、inert relationship、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-config-detail.spec.ts` に追加する

### 実装

- [ ] T595 [US2] 既存の有界で不活性な TOML carrier extraction を、closed fallback/MCP extraction を維持したまま、残りの Codex project-configuration field と relative-base metadata で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T596 [US2] 既存の `codex.config.precedence` strategy を general configuration value、trust、closest-value、relative-base、依然として不活性な Hook declaration で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T597 [US2] 境界付き config field、fallback-name metadata、relationship、applicability、diagnostics、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
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
- [ ] T604 [P] [US1] tool、`settings/config` kind、project/local layer、正確な provenance、およびフェーズ 60 で bounded settings parsing が追加されるまではフェーズ 27 MCP adapter が dormant のままであり、Hook recognition も存在しないことに関する Claude settings recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
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

**目的**: Claude settings の bounded JSONC detail を追加し、受け入れ済み file 上でフェーズ 27 の owner-gated MCP adapter を有効化し、Hook-family semantics は引き続き延期します。

**独立テスト**: malformed および secret-bearing な settings を開き、atomic JSONC parsing、正確な project/local precedence、selected-component declaration、owner-attached MCP metadata、surface condition、exact authored-literal extraction、inert relationship、zero connection、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、完全で inert な layer-aware detail と owner-attached MCP が表示されます。

### テスト先行

- [ ] T612 [US2] comment、known field、strict UTF-8、malformed structure、depth/nodes/scalars/metadata limit、atomic extraction に関する inert JSONC の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T613 [P] [US2] 正確な launch-root scope、parent/descendant matching なし、project/local precedence、selected component、closed declaration origin、surface availability に関する Claude settings の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T614 [P] [US2] settings で選択された agent、plugin、Hook、MCP、command、path、workflow、reference が inert かつ non-following のままであることを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T615 [US2] reciprocal contract reference、フェーズ 27 MCP adapter activation、Hook semantics だけの延期を持つ Claude settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T616 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude settings detail、layer precedence、selected-component declaration、owner-attached MCP、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-settings-detail.spec.ts` に追加する

### 実装

- [ ] T617 [US2] 既存の有界で不活性な JSONC mode を allowlist 対象 Claude settings field と closed declaration origin で `src/inspection/parsers/json.ts` において拡張する
- [ ] T618 [US2] Claude settings precedence、selection、surface、relationship strategy を追加し、既存 MCP adapter を現在所有済みの settings behavior に関連付け、Hook composition は `shared/registries/runtime-composition.ts` で延期したままにする
- [ ] T619 [US2] 境界付き settings metadata、owner-gated contained MCP、applicability、relationship-only target、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
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

**目的**: surface-specific precedence と inert declaration metadata を持つ、境界付き Copilot settings detail を追加します。

**独立テスト**: malformed および literal credential を含む settings を開き、VS Code/CLI layer、enablement、recommendation、compatible Claude settings、configured-root read なし、environment-reference を解決しない exact authored literal、diagnostics、detail-state cleanup を検証します。

**目に見えるチェックポイント**: Copilot settings を選択すると、plugin の有効化や contained Hook の compose を行わず、完全で inert な surface-qualified detail が表示されます。

### テスト先行

- [ ] T633 [P] [US2] VS Code/CLI layer、enablement、フェーズ 20 で pending だった instruction applicability の再投影、plugin recommendation、closed contained-hook origin、compatible Claude settings、configured-root read なしに関する Copilot settings の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T634 [P] [US2] literal credential、未解決の environment-reference text、command、path、recommendation、duplicate occurrence、reference、relationship read authority がゼロであることに関する、失敗する exact-display/relationship test を `tests/unit/inspection/source-occurrences.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T635 [P] [US2] settings content が plugin の有効化、Hook の呼び出し、MCP への接続、URI の load、configured root の展開を行えないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T636 [US2] VS Code/CLI/Cloud distinction、フェーズ 20 instruction の再投影、deferred Plugin/Hook semantics、settings は MCP owner ではないという恒久ルールに関する Copilot settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T637 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot settings detail、surface precedence、更新された instruction applicability、recommendation、inert declaration、settings-owned MCP row がないこと、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-settings-detail.spec.ts` に追加する

### 実装

- [ ] T638 [US2] allowlist 対象 Copilot settings field、recommendation identifier、closed declaration origin で境界付き JSONC extraction を `src/inspection/parsers/json.ts` において拡張する
- [ ] T639 [US2] surface-qualified Copilot settings precedence、enablement、recommendation、relationship strategy を追加し、以前 pending だった instruction applicability を再投影し、後続 Plugin/Hook family は `shared/registries/runtime-composition.ts` で inert のままにする
- [ ] T640 [US2] 境界付き settings metadata、applicability、instruction re-projection fact、relationship-only target、恒久的な MCP non-ownership、diagnostics、正確な evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T641 [US2] Copilot settings parsing、exact authored-literal extraction、instruction re-projection、inert declaration、permanent MCP non-ownership、完全な authored source を保持しながら行う parser scratch/transient-semantic disposal を `src/inspection/scan.ts` に統合する
- [ ] T642 [US2] typed settings detail と、意味的に同等な英語・日本語の Copilot precedence、recommendation、surface、uncertainty message を `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 63: 統合 Settings/Configuration inventory

**目的**: Codex configuration、Claude settings、Copilot settings を、一度だけ読み取る shared-file recognition と正確な MCP ownership matrix とともに統合します。

**独立テスト**: all-vendor settings fixture を使用し、共有 `.claude/settings*.json` に対する一つの物理 row/read、別々の Claude/Copilot settings recognition、同じ shared owner ID 上の Claude-only owner-attached MCP、恒久的な Copilot MCP non-ownership、維持される Codex carrier MCP/fallback、決定論的な provenance、filter、exclusion、partial continuity、rescan cleanup を検証します。

**目に見えるチェックポイント**: 完全な settings/configuration inventory をフィルタリングでき、Claude settings-owned MCP、Copilot non-ownership、既存 Codex carrier を区別できます。

### テスト先行

- [ ] T643 [US1] Codex project layer、owner-attached MCP を持つ Claude exact-launch settings、MCP non-ownership を持つ Copilot variant、shared file、malformed structure、secret、inert declaration、除外された configured root に対する all-vendor settings/config fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T644 [US1] settings/config behavior、三つの candidate matcher、既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp`、path-negative case、composition、relationship、evidence row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T645 [US1] 既存 MCP/fallback を持つ Codex layer、MCP ownership を持つ正確な Claude settings、MCP non-ownership を持つ対応 Copilot settings、shared file、明示的な exclusion に対する完全な matcher と recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T646 [P] [US1] 一度だけ読み取る shared settings、決定論的な settings/MCP recognition と provenance order、hard-link alias、limit、isolated failure、synthetic MCP file/connection ゼロ、configured-target access なしに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T647 [P] [US1] settings/configuration row 全体の source/tool/kind/path filter、shared recognition badge、rescan cleanup に関する client の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T648 [US1] 統合 settings/config inventory、filter、shared-file recognition、正確な MCP ownership/non-ownership badge、維持される Codex carrier fact、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/settings-config-inventory.spec.ts` に追加する

### 実装

- [ ] T649 [US1] 三つの tool すべてに対し、read authority を持たない settings/config lookup statement を `shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T650 [US1] configured-path promotion や新しい exclusion ID を導入せず、三つの settings/config candidate record と既存の `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp` reference を `shared/registries/inspection-rules.ts` で完成させる
- [ ] T651 [US1] settings/config evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` で完成させる
- [ ] T652 [US1] settings/configuration に対する一度だけ読み取る shared-file assembly、決定論的な settings/MCP recognition order、正確な ownership/non-ownership、維持される Codex carrier fact、境界付き partial continuity を `src/inspection/scan.ts` で完成させる
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

**独立テスト**: 2 つの style を比較し、完全なリテラルの source と、整列した layer、selection、surface availability、provenance、metadata を検証する。

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

**独立テスト**: malformed/secret-bearing catalog を開き、bounded JSON parsing、local source form、remote/absolute/home/traversal rejection、independently admitted static seed ごとの最初の 128 distinct validated target、relationship-only component、exact authored-literal preservation、diagnostics、plugin-target read がゼロであることを検証する。

**目に見えるチェックポイント**: Codex marketplace を選択すると、plugin manifest を開かずに、完全で inert な authored entry と local-source relationship が表示される。

### テストを先に

- [ ] T689 [P] [US2] 正確な `marketplace.plugin.source` occurrence の plain-string form と object `source.path` form、leading-`./` semantics、authored literal/range と internal semantic path、remote source relationship、registration/installation uncertainty、malformed overlap/round-trip failure、evidence に関する失敗する Codex marketplace test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T690 [P] [US2] leading-`./` catalog-relative containment、declaration ごとに 1 target、independently admitted static seed ごとに stable typed-extractor/source-occurrence order で最初の 128 distinct validated target、129 番目への stat/read がないこと、one-edge preparation、derived authority からの Git/HTTP/npm/absolute/home/traversal rejection と authored relationship の保持に関する失敗する local-source validation test を `tests/integration/repository-scan.test.ts` に追加する
- [ ] T691 [P] [US2] catalog inspection が plugin read、install、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T692 [US2] reciprocal contract reference を備えた、失敗する Codex marketplace activation/relationship graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T693 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Codex marketplace detail、local/remote source relationship、authored state、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/codex-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T694 [US2] closed Codex catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T695 [US2] Codex marketplace の authored、registration、installation、activation、local-source、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T696 [US2] bounded occurrence-ordered catalog metadata、validated semantic local-source declaration、正確な authored relationship、applicability、diagnostics、evidence を備えるよう Codex recognition を `src/inspection/recognizers/codex.ts` で拡張する
- [ ] T697 [US2] atomic catalog parsing、完全な authored-source retention、static seed ごとの最初の 128 distinct validated local target、relationship-only の rejected/remote component、129 番目の stat/read より前の partial diagnostic、まだ derived read を行わないことを `src/inspection/scan.ts` に統合する
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

**独立テスト**: malformed/secret-bearing catalog を開き、optional/local source form、catalog-relative containment、remote relationship retention、independently admitted static seed ごとの最初の 128 distinct validated target、owner-attached MCP declaration、registration/activation uncertainty、exact authored-literal preservation、diagnostics、connection がゼロであること、plugin-target read がゼロであることを検証する。

**目に見えるチェックポイント**: Claude marketplace を選択すると、registration、activation、connection を主張せず、完全で inert な authored metadata、source relationship、owner-attached MCP が表示される。

### テストを先に

- [ ] T709 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、leading-`./` authored literal/range と internal semantic path、optional manifest、remote relationship、フェーズ 27 MCP adapter activation、registration uncertainty、malformed occurrence failure、evidence に関する失敗する Claude marketplace test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T710 [P] [US2] leading-`./` catalog-relative containment、declaration ごとに 1 target、independently admitted static seed ごとに stable typed-extractor/source-occurrence order で最初の 128 distinct validated target、129 番目への stat/read がないこと、derived authority から Git/HTTP/npm/absolute/home/traversal path を除外し authored relationship を保持することに関する失敗する Claude validation test を `tests/integration/repository-scan.test.ts` に追加する
- [ ] T711 [P] [US2] Claude catalog inspection が registration、plugin read、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T712 [US2] reciprocal contract reference を備えた Claude marketplace activation/relationship graph coverage とフェーズ 27 MCP owner-adapter binding の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T713 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Claude marketplace detail、source relationship、owner-attached MCP、authored state、connection がゼロであること、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/claude-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T714 [US2] closed Claude catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T715 [US2] Claude marketplace の registration、activation、optional-manifest、local-source、relationship strategy を追加し、既存 MCP adapter を受け入れ済み marketplace behavior に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T716 [US2] bounded occurrence-ordered catalog metadata、validated semantic local-source declaration、正確な authored relationship、owner-gated MCP、applicability、diagnostics、evidence を備えるよう Claude recognition を `src/inspection/recognizers/claude.ts` で拡張する
- [ ] T717 [US2] Claude catalog parsing と完全な authored-source retention、static seed ごとの最初の 128 distinct validated local target、129 番目の stat/read より前の partial diagnostic、synthetic file も connection も作成しない owner-attached MCP、derived read を行わない relationship-only の rejected/remote component を `src/inspection/scan.ts` に統合する
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

**目的**: 完全なリテラルの Copilot catalog detail を追加し、次の plugin フェーズに向けて bounded local plugin source を検証する。

**独立テスト**: malformed/literal-credential-bearing catalog を開き、`plugins/foo` と `./plugins/foo`、将来の four-target derivation order、one-edge/128 bound、remote relationship retention、VS Code/CLI local-source plan、local plan を持たない Cloud hosted/runtime-unavailable state、exact authored literal、diagnostics、target read がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot marketplace を選択すると、plugin manifest を読み取らずに、完全で inert な authored entry と bounded local-source plan が表示される。

### テストを先に

- [ ] T729 [P] [US2] plain/object の正確な `marketplace.plugin.source` occurrence、`plugins/foo`/`./plugins/foo` authored literal/range と internal semantic path、recommendation、VS Code/CLI provenance、Cloud unavailable state、activation uncertainty、malformed occurrence failure、evidence に関する失敗する Copilot marketplace test を `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T730 [P] [US2] `plugins/foo`/`./plugins/foo`、catalog containment、declaration ごとの documented four-target order、1 edge、independently admitted static seed ごとに stable typed-extractor/source-occurrence order で最初の 128 distinct validated target、129 番目への stat/read がないこと、forbidden source type を derived authority から除外し authored relationship を保持することに関する失敗する source-validation test を `tests/integration/repository-scan.test.ts` に追加する
- [ ] T731 [P] [US2] Copilot カタログの検査が install、plugin read、component load、hook execution、MCP connection、asset load、remote fetch、hosted-state query を一切行わないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T732 [US2] ローカルソースプランが VS Code/CLI だけに存在し、Cloud は hosted/runtime-unavailable のままであることを証明する、相互の契約参照を備えた失敗する Copilot marketplace activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T733 [US2] sensitive-content acknowledgement、credential/environment-reference の正確なリテラル表示、process-environment sentinel の非置換、masking/reveal control がないこと、完全なリテラルの Copilot marketplace detail、VS Code/CLI source plan、Cloud unavailable condition、diagnostics、detail-state cleanup に関する browser acceptance を `tests/e2e/copilot-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T734 [US2] closed Copilot catalog field ID、正確な source occurrence/range と authored literal、別個の internal semantic path、recognition-atomic failure、source-value-free diagnostic によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T735 [US2] Copilot VS Code/CLI marketplace の登録、推奨、インストール、有効化、ローカルソース、関係の戦略に加え、ローカル来歴または検索を決して生成しない Cloud hosted/runtime-unavailable 戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T736 [US2] bounded occurrence-ordered catalog metadata、VS Code/CLI-only semantic local-source plan、正確な authored relationship、Cloud runtime-unavailable condition、applicability、diagnostics、evidence によって Copilot recognition を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T737 [US2] Copilot catalog parsing と完全な authored-source retention、documented four-target order、static seed ごとの最初の 128 distinct validated target、129 番目の stat/read より前の partial diagnostic、derived read を行わない relationship-only の rejected/remote component を `src/inspection/scan.ts` に統合する
- [ ] T738 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot marketplace ソース、VS Code/CLI のローカル来歴、Cloud の利用不可状態、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 74: 統合 Marketplaces インベントリ

**目的**: marketplace catalog を統合し、共有の `.claude-plugin/marketplace.json` を Codex/Claude/Copilot recognition に対して一度だけ読み取り、同じ physical file 上の Claude owner-attached MCP を維持する。

**独立テスト**: 共有 catalog に対する一つの physical item/read、三つの marketplace recognition、Claude owner-attached MCP、決定論的な provenance/root-form order、synthetic MCP file または connection がないこと、local-source plan、filter、exclusion、limit、diagnostics、rescan cleanup を検証する。

**目に見えるチェックポイント**: 一つの共有 authored catalog 上のすべての marketplace interpretation と Claude owner-attached MCP を理解できる。

### テストを先に

- [ ] T739 [US1] すべての root form、local/remote source、Claude owner-attached MCP を持つ共有 triple-recognition file、不正な/secret-bearing catalog、alias、exclusion、正確な limit case を対象に marketplace fixture を `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T740 [US1] marketplace 除外 ID を定義せず、marketplace の振る舞い、マッチャー、導出プラン、composition、関係、パス不一致となる runtime-state ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T741 [P] [US1] すべての marketplace root、triple marketplace recognition、同じ ID 上の Claude owner-attached MCP、決定論的な form order、authored-state separation、exclusion に対する完全な matcher/recognition-matrix test を `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T742 [P] [US1] shared catalog の read-once、deterministic marketplace/MCP recognition と provenance order、alias、per-seed distinct-target limit と 129th no-access behavior、partial continuity、synthetic MCP file/connection がゼロであること、derivation phase 前の plugin-target read がゼロであることに関する失敗する integration test を `tests/integration/repository-scan.test.ts` に追加する
- [ ] T743 [US1] 統合 marketplace inventory、filter、triple recognition、Claude owner-attached MCP、root-form order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T744 [US1] marketplace physical-file の read-once assembly、deterministic multi-tool + owner-attached MCP provenance、正確な authored occurrence、per-static-seed bounded semantic source-plan retention、synthetic file がないこと、exclusion を `src/inspection/scan.ts` で完成させる
- [ ] T745 [US1] marketplace インベントリのフィルター、共有認識の要約、作成済み状態のラベルを `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T746 [US1] 意味的に同等な英語/日本語の統合 marketplace、三重認識、作成済み状態、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 75: Marketplaces 比較

**目的**: リテラルおよび型付き marketplace カタログ差分で比較を拡張する。

**独立テスト**: 読み取り可能な 2 つの catalog を比較し、plugin を derive/activate せず、完全なリテラルの source と、整列された entry、source type、local-source plan、owner-attached MCP、provenance、registration、installation、enablement、condition、uncertainty を検証する。

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

**独立テスト**: 作成済みのルート manifest と一つの `.codex-plugin/plugin.json` をインベントリに含め、後者が検証済みの各 `./` ローカル Codex marketplace ソース配下にあることを確認する。一エッジの包含、最初の 128 件の保持、対象欠落時は候補なし、orphan/remote/escaping/linked 候補がないこと、再帰的な導出がないこと、物理ファイルごとに一度の検証済み読み取りを確認する。

**目に見えるチェックポイント**: ユーザーは、静的または marketplace 由来の来歴を備えた作成済み Codex plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T751 [US1] 正確なルート、有効な `./` ローカルカタログソース、正確な `.codex-plugin/plugin.json` 対象、欠落した対象、128/129 ソース、remote/absolute/home/traversal ソース、リンク、エイリアス、コンポーネント宣言、ニアミスを対象とする Codex plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T752 [US1] Codex plugin-manifest の振る舞い、静的/有界導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T753 [P] [US1] 正確な `codex.repo.plugin-manifest`、`codex.derived.local-plugin-manifest`、一エッジ、`./` ソースの受け入れ、正確な `.codex-plugin/plugin.json` 対象、導出済みシードがないこと、コンポーネントファイル候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T754 [US1] 静的/導出 Codex manifest、最初の 128 件の保持、129 番目へのアクセスがないこと、missing-derived-target/no-candidate 処理、包含、リンク、エイリアス、一度だけ読み取って組み立てる処理、コンポーネント読み取りがないことに対する失敗するスキャンテストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T755 [US1] Codex plugin-manifest 行、静的/導出来歴、欠落 manifest、除外、診断、変更されない marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/codex-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T756 [US1] アクティベーション権限を持たない Codex plugin-manifest の振る舞いと検索記述を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T757 [US1] コンポーネントパス除外の所有をフェーズ 77 に残し、Codex の静的および有界導出 plugin-manifest レコードだけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T758 [US1] Codex plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T759 [US1] 検証済みの `./` ローカル marketplace ソースから正確な `.codex-plugin/plugin.json` 対象への、ルートと完全一致するマッチングおよび有界 Codex manifest 導出だけを `src/inspection/rules/codex.ts` に実装する
- [ ] T760 [US1] 静的/シード来歴を備え、コンポーネントを昇格しない Codex plugin-manifest 認識を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T761 [US1] 決定的な一エッジの Codex manifest 受け入れ、一度の検証済み読み取り、エイリアスの集約、上限付き診断を `src/inspection/scan.ts` に統合する
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
- [ ] T769 [US2] closed Codex plugin-manifest field ID、正確な component source occurrence/UTF-16 range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T770 [US2] Codex plugin の authored、installed、enabled、trusted、local、activation、relationship の各戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T771 [US2] 有界な Codex plugin-manifest メタデータと relationship-only のコンポーネントを `src/inspection/recognizers/codex.ts` に実装する
- [ ] T772 [US2] アトミックな manifest 解析、正確な authored-literal 抽出、relationship-only の component、正確な `codex.excluded.plugin-files` diagnostics、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T773 [US2] 型付き詳細と、意味的に同等な英語/日本語の Codex plugin の作成済み状態、関係、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 78: Claude Plugin Manifests インベントリ

**目的**: optional-manifest の振る舞いを維持しながら、ルートと完全一致する `claude.repo.plugin-manifest` と marketplace 由来の `claude.derived.local-plugin-manifest` 候補だけを追加する。

**独立テスト**: 作成済みのルートと検証済みのローカル marketplace 対象をインベントリに含め、任意で存在しない場合、信頼条件、一エッジ/128 の境界、再帰的な導出がないこと、コンポーネント読み取りがないことを検証する。

**目に見えるチェックポイント**: ユーザーは、明示的なルートまたは marketplace 由来の来歴を備えた Claude plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T774 [US1] 正確なルート、有効なローカルカタログソース、任意で存在しない場合、128/129 ソース、祖先のニアミス、リンク、エイリアス、コンポーネント、禁止されたソースを対象とする Claude plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T775 [US1] フェーズ 25 が所有する Claude plugin の振る舞いを再利用し、振る舞い ID を重複させずに、正確な静的/導出候補、パス不一致となるコンポーネントケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T776 [P] [US1] 正確な `claude.repo.plugin-manifest`、`claude.derived.local-plugin-manifest`、任意で存在しない場合、一エッジ、祖先スキャンがないこと、コンポーネント候補がないことに対する失敗するレジストリ/マッチャーテストを `tests/contract/inspection-rules.test.ts` と `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T777 [US1] 静的/導出 Claude manifest、最初の 128 件の保持、129 番目へのアクセスがないこと、包含、リンク、エイリアス、一度だけ読み取って組み立てる処理、コンポーネント読み取りがないことに対する失敗するスキャンテストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T778 [US1] Claude plugin-manifest 行、来歴の種類、任意で存在しない場合、信頼の不確実性、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/claude-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T779 [US1] フェーズ 25 が所有する `claude.behavior.repo.plugin` と `claude.behavior.user.plugins` を再利用し、ルートおよびローカル marketplace の plugin 検索について重複する振る舞い ID を `shared/registries/vendor-behaviors.ts` に追加しない
- [ ] T780 [US1] コンポーネントパス除外の所有をフェーズ 79 に残し、`claude.repo.plugin-manifest` と `claude.derived.local-plugin-manifest` だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T781 [US1] Claude plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T782 [US1] ルートと完全一致し、有界なローカル marketplace 由来となる Claude manifest の導出を `src/inspection/rules/claude.ts` に実装する
- [ ] T783 [US1] 来歴、optional-manifest、信頼を備え、コンポーネントを昇格しない Claude plugin-manifest 認識を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T784 [US1] 決定的な Claude manifest の受け入れ、一度の検証済み読み取り、エイリアス、任意で存在しない場合、上限付き診断を `src/inspection/scan.ts` に統合する
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
- [ ] T792 [US2] closed Claude plugin-manifest field ID、正確な default/explicit component source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T793 [US2] Claude plugin の登録、アクティベーション、optional-manifest、component-resolution、relationship の各戦略を追加し、既存の MCP adapter を受け入れ済み plugin の振る舞いへ `shared/registries/runtime-composition.ts` で結び付ける
- [ ] T794 [US2] 有界な Claude plugin-manifest メタデータ、owner-gated MCP、relationship-only のコンポーネントを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T795 [US2] Claude manifest 解析、正確な authored-literal 抽出、synthetic file も connection も作らない owner-attached MCP、relationship-only の component、MCP candidate を変えない更新済み plugin-path exclusion diagnostic、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T796 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude plugin の任意状態、コンポーネント、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 80: Copilot Plugin Manifests インベントリ

**目的**: 正確な四つの Copilot plugin-manifest 形式と、それらの有界なローカル marketplace 導出を追加する。同時に、CLI extension が plugin 候補にならないよう、正確に `copilot.excluded.cli-extensions` を所有する。

**独立テスト**: 文書化された順序に従い、明示的なルートと導出ローカルソースにある `.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json` をインベントリに含める。一エッジ/128 の境界、包含、正確な `copilot.excluded.cli-extensions`、任意の子孫または runtime-state 候補がないこと、コンポーネント読み取りがないことを検証する。

**目に見えるチェックポイント**: ユーザーは、正確な形式、静的/導出来歴、surface 条件を備えた Copilot plugin manifest をフィルタリングできる。

### フィクスチャとテストを先に

- [ ] T797 [US1] 四つすべてのルート/導出形式、順序、128/129 ソース、共有 Claude manifest、欠落形式、リンク、エイリアス、コンポーネント、CLI extension、installed/hosted 状態、禁止されたソースを対象とする Copilot plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T798 [US1] Copilot plugin の振る舞い、読み取り権限を付与しない `copilot.behavior.cli.extensions`、静的/導出候補、影響を受ける振る舞いへの参照を持つ正確な `copilot.excluded.cli-extensions`、パス不一致となる runtime/component ケース、アクティベーション条件、関係、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T799 [US1] 四つのルート形式、`plugins/foo`/`./plugins/foo`、文書化された四対象の順序、一エッジ/128 対象、禁止されたソース形式、共有認識、`copilot.excluded.cli-extensions` → `copilot.behavior.cli.extensions`、extension-as-plugin 候補がないことに対する失敗する plugin matcher/derivation および registry テストを `tests/unit/inspection/rules.test.ts`、`tests/integration/repository-scan.test.ts`、`tests/contract/inspection-rules.test.ts` に追加する
- [ ] T800 [P] [US1] manifest 形式の順序、静的/導出来歴、surface の事実、共有 Claude manifest、installed/hosted/component 候補がないことに対する失敗する Copilot 認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T801 [US1] Copilot plugin-manifest 行、形式順序、来歴、surface バッジ、除外、診断、保持される marketplace 行を対象とするブラウザ受け入れテストを `tests/e2e/copilot-plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T802 [US1] plugin 戦略と正確な extension 除外がアクティベーション権限または読み取り権限なしで解決されるように、surface で修飾された Copilot plugin 検索記述と、読み取り権限を付与しない `copilot.behavior.cli.extensions` および `copilot.behavior.cli.user.extensions` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T803 [US1] 静的な `copilot.repo.plugin-manifest` と有界導出の `copilot.derived.local-plugin-manifest` レコードを追加し、正確な非読み取り `copilot.excluded.cli-extensions` だけを所有する。installed、hosted、component パスは `shared/registries/inspection-rules.ts` でパス不一致のまま保つ
- [ ] T804 [US1] Copilot plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T805 [US1] 文書化されたローカル形式、四対象の順序、一エッジ/128 の境界、包含、禁止ソースの拒否を備えた `copilot.derived.local-plugin-manifest` を `src/inspection/rules/copilot.ts` に実装する
- [ ] T806 [US1] ルートと完全一致する Copilot manifest のマッチングと順序付きの静的/導出認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T807 [US1] 決定的な Copilot manifest の受け入れ、一度の検証済み読み取り、エイリアス、上限、上限付き診断を `src/inspection/scan.ts` に統合する
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

- [ ] T813 [US2] closed Copilot plugin-manifest field ID、正確な component source occurrence/range と authored literal、別個の internal typed semantics、recognition-atomic failure、source-value-free diagnostics によって bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T814 [US2] Copilot VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、関係の各戦略を個別に `shared/registries/runtime-composition.ts` へ追加する
- [ ] T815 [US2] 有界な Copilot plugin-manifest メタデータと relationship-only のコンポーネントを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T816 [US2] Copilot manifest 解析、正確な authored-literal 抽出、relationship-only の component、exclusion、完全な authored source を保持しながら行う parser scratch/transient-semantic の破棄を `src/inspection/scan.ts` に統合する
- [ ] T817 [US2] 型付き詳細と、意味的に同等な英語/日本語の Copilot plugin 状態、コンポーネント、surface、アクティベーションの不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 82: 統合 Plugin Manifests インベントリ

**目的**: plugin manifest を統合し、共有の `.claude-plugin/plugin.json` を Claude/Copilot の認識に対して一度だけ読み取り、Claude の owner-attached MCP を relationship-only のコンポーネントパスとは分けて保持する。

**独立テスト**: 共有 manifest に対する一つの物理項目/読み取り、二つの plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネントパス、決定的な形式/シードの来歴、Codex の分離、静的/導出の出所、合成 MCP ファイルも接続もないこと、エイリアス、上限、除外、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、作成済み plugin manifest に対するサポート対象のすべての解釈を理解し、Claude の owner-attached MCP を読み取り不能なコンポーネントパスと区別できる。

### テストを先に

- [ ] T818 [US1] すべてのルート/導出形式、Claude の owner-attached MCP を備えた共有 Claude/Copilot ファイル、欠落した任意 manifest、エイリアス、relationship-only のコンポーネント、除外、シークレット、不正な内容、正確な上限を対象に plugin-manifest フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T819 [US1] plugin-manifest の振る舞い、マッチャー、導出、composition、関係、正確な `codex.excluded.plugin-files`/`claude.excluded.plugin-files`/`copilot.excluded.cli-extensions`、パス不一致となるランタイムケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T820 [P] [US1] Codex、Claude、Copilot の静的/導出 manifest、共有の二重 plugin 認識、Claude の owner-attached MCP、relationship-only のコンポーネント、決定的な形式順序、除外に対する完全なマッチャー/認識マトリクステストを `tests/unit/inspection/rules.test.ts` と `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T821 [P] [US1] 完全なリテラルの derived metadata が利用できること、catalog-relative provenance、最初の 128 件の保持、129 番目へのアクセスがないこと、共有ファイルを一度だけ読み取ること、Claude owner-attached MCP、synthetic file/connection がゼロであること、component を展開しないことに関する local-manifest 統合回帰テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T822 [US1] 統合 plugin-manifest インベントリ、フィルター、有界導出、共有認識、Claude の owner-attached MCP とコンポーネントパスの対比、除外、診断、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/plugin-manifests-inventory.spec.ts` に追加する

### 実装

- [ ] T823 [US1] 読み取り権限を持たない三ツールすべての plugin-manifest 検索記述を `shared/registries/vendor-behaviors.ts` で完成させる
- [ ] T824 [US1] plugin-manifest の静的/有界導出候補と、既存の正確な `codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`copilot.excluded.cli-extensions` レコードだけを `shared/registries/inspection-rules.ts` で完成させる
- [ ] T825 [US1] plugin-manifest のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` で完成させる
- [ ] T826 [US1] 有界なローカル導出、一度の検証済み読み取り、決定的なツール横断および owner-attached MCP の組み立て、除外、合成ファイルも接続もないこと、コンポーネントを展開しないことを `src/inspection/scan.ts` に統合する
- [ ] T827 [US1] plugin manifest のインベントリ kind フィルターと要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T828 [US1] 意味的に同等な英語/日本語の統合 plugin-manifest、導出、共有認識、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 83: Plugin Manifests 比較

**目的**: リテラルおよび型付き plugin-manifest 差分で比較を拡張する。

**独立テスト**: 読み取り可能な 2 つの manifest を比較し、activation も connection も行わず、完全なリテラルの source と、整列された authored metadata、form/seed provenance、registration、installation、enablement、trust、owner-attached MCP、component relationship、uncertainty を検証する。

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

**独立テスト**: 共有 settings に対する一つの物理読み取りと個別の Claude/Copilot Hook 認識、独立 Codex/Copilot ファイル、内包所有者の来歴、決定的な順序、合成ファイルがないこと、除外、フィルター、エイリアス、上限、診断、再スキャン時のクリーンアップを検証する。

**目に見えるチェックポイント**: ユーザーは、サポートされるすべての独立および内包 Hook の解釈を区別できる。

### テストを先に

- [ ] T899 [US1] 独立 Codex/Copilot ファイル、Claude の settings/skill/agent/plugin/marketplace 所有者、Copilot の settings/agent 所有者、共有 settings、relationship-only の plugin パス、参照されていない script、シークレット、エイリアス、除外、正確な上限を対象に Hook フィクスチャを `tests/fixtures/repositories/build-fixtures.ts` で完成させる
- [ ] T900 [US1] Hook 固有の除外 ID を追加せず、Hook の振る舞い、独立マッチャー、内包所有者の composition、関係、既存の正確な plugin-file 除外、パス不一致ケース、エビデンス適合行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で完成させる
- [ ] T901 [P] [US1] Codex/Copilot の独立ファイル、Claude の独立候補がないこと、すべての script/User/hosted/component 除外に対する完全なマッチャーテストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T902 [P] [US1] 独立/内包の出所、受け入れられたすべての Claude 所有者、Copilot の settings/agent 所有者だけ、共有 settings、relationship-only の plugin パス、合成ファイルがないこと、決定的な来歴、追加認識がゼロであることに対する完全な認識マトリクステストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T903 [P] [US1] 共有所有者を一度だけ読み取ること、決定的な Hook 認識順序、エイリアス、上限、部分的な継続性、参照 hook の読み取りがゼロであることに対する失敗する統合テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T904 [US1] 統合 Hook インベントリ、フィルター、共有認識、独立/内包の帰属、除外、診断、キーボード操作を対象とするブラウザ受け入れテストを `tests/e2e/hooks-inventory.spec.ts` に追加する

### 実装

- [ ] T905 [US1] 所有者/ファイルを一度だけ読み取って組み立てる処理、決定的な Hook 認識/来歴順序、合成ファイルを作成しないこと、上限付き診断を `src/inspection/scan.ts` で完成させる
- [ ] T906 [US1] Hook のフィルターと独立/内包/所有者の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で完成させる
- [ ] T907 [US1] 意味的に同等な英語/日本語の統合 Hook インベントリ、共有認識、所有者、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 91: Hook 比較

**目的**: 実際に読み取り可能な物理ファイル ID だけを選択可能としつつ、リテラルおよび型付き Hook 差分で比較を拡張する。内包 Hook 認識は所有ファイルを通じて選択し、ランタイムの事実だけでは選択できない。

**独立テスト**: owner を介した contained Hook declaration を含む、current-generation の読み取り可能な physical owner/file ID を正確に 2 つ選択し、完全なリテラルの source と、整列された event、source order、deduplication、priority、composition、provenance、warning、uncertainty を検証し、synthetic ID と runtime-fact-only row を拒否する。

**目に見えるチェックポイント**: ユーザーは hook 宣言を実行せずに比較できる。

### テストを先に

- [ ] T908 [US3] 正確に 2 つの readable physical owner/file ID、owner ID を介した contained Hook、runtime-fact の拒否、`(tool, kind, fieldId, occurrence)` の authored literal、event、order、composition、provenance、warning、uncertainty に関する、失敗する selection/comparison 回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T909 [US3] sensitive-content acknowledgement、owner を介して選択した contained Hook、credential/environment-reference の差を含む完全なリテラルの Hook diff、正確な metadata row、masking/reveal も environment substitution もないこと、typed event/composition の差、runtime-fact の拒否に関するブラウザー受け入れテストを `tests/e2e/hooks-comparison.spec.ts` に追加する

### 実装

- [ ] T910 [US3] 実際に読み取り可能な物理 owner/file ID による比較選択を強制し、内包 Hook 認識をその所有者を通じて `app/composables/comparison.ts` で解決する
- [ ] T911 [US3] runtime fact を選択可能な file として公開せず、Hook comparison row が `(tool, kind, fieldId, occurrence)` で照合して `authoredLiteral` を render するよう `app/components/comparison/RecognitionComparison.vue` で拡張する
- [ ] T912 [US3] 意味的に同等な英語/日本語の hook 比較メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 92: Repository インベントリの受け入れ

**目的**: 先行するすべての Repository インベントリ増分が、包括的な実装を用いずに US1 を満たすことを検証する。

**独立テスト**: 全サポート対象フィクスチャに対してパッケージをインストールし、allowlist に含まれるすべてのファイル、フィルター、認識、上限、再スキャンパス、パッケージパス、性能目標に加え、priority MCP adapter の後段の所有者有効化が既存の一つの所有者/読み取り上で行われ、合成ファイルも接続もないことを検証する。現在所有されている Repository レジストリのゲートは、35 個の静的候補、5 個の有界導出候補、7 個のベンダー除外、`shared.excluded.symlink-target` の正確に 48 ID であり、内包 Hook/MCP の作業が追加する候補ルールはゼロとする。また、3 つの `*.excluded.user-runtime` と `shared.excluded.managed-remote-state` はフェーズ 96～98 まで意図的に未定義のままとする。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US1 の検出が完成する。

### 受け入れテスト

- [ ] T913 [US1] 現在所有されている正確な 48 ID の Repository レジストリゲート（35 個の静的、5 個の有界導出、7 個のベンダー除外、1 個の共有シンボリックリンク除外）を追加する。すべての前段/後段所有者による内包 Hook/MCP 認識が追加する候補ルールはゼロで、既存の一つの所有者 ID/読み取りが保持され、合成ファイルを作成しないことを証明し、延期された Global 時代の 4 個の非読み取り除外がまだ定義されていないことを `tests/contract/inspection-rules.test.ts` で表明する
- [ ] T914 [US1] 全サポート対象、ニアミス、空、複数ツール、ハードリンク、導出、敵対的、シークレット、性能のフィクスチャとガイダンスを `tests/fixtures/repositories/build-fixtures.ts`、`tests/fixtures/repositories/README.md`、`tests/fixtures/repositories/README.ja.md` で完成させる
- [ ] T915 [US1] 1 MiB のファイル、32 MiB のバイト数、200,000 エントリ、2,000 ファイル、64 セグメント、1,024 エイリアス、30 秒について、正確な上限値と 1 超過時のテストを `tests/integration/limits.test.ts` に追加する
- [ ] T916 [P] [US1] すべての Repository kind、source text も declared metadata value も含まない strict envelope、progress、per-Source stale failure、conflict、stale ID、atomic publication、source-value-free failure に関する完全な session/rescan API contract を `tests/contract/http-api-session.test.ts` に追加する
- [ ] T917 [P] [US1] 分離install、固定asset/Worker、同一tarball、起動時`cwd`、version-certification claimなしのdefault-browser delegation、`--no-open`とprinted-URL certified-browser fallback、bindしないhelp/version、固定された上限付きnonzero failureを伴うstrict unknown-option/positional/rest拒否、await済みshutdown、root-only import boundary、追加modeゼロに関する完全なpackaged Gunshi CLI testを `tests/package/npx-launch.test.ts` に追加する
- [ ] T918 [P] [US1] T183をfinal registryへ拡張し、全runが同じchecked-in profileと変更しないfixture digestへ一致することをvalidateして、browser-request start、snapshot再利用/意図的OS-cache resetなしでexactly 10 fresh processを実行する。10回中9回以上でqualifying current-request statusを1秒以内、operable inventoryを10秒以内、両standardized interactionを100 ms未満にし、profile ID、fixture digest、actual non-personal environment fieldを出力してpersonal identifier/absolute user pathだけを省略し、cross-profile comparisonを拒否する。対象は `tests/performance/repository-scan.test.ts` と `tests/performance/inventory-interactions.test.ts` とする
- [ ] T919 [US1] inventory、filter、multi-recognition、diagnostics、empty state、rescan、retry、keyboard use、atomic replacement、detail acknowledgement 前に source/metadata/sensitive value を一切公開しないことに関する Repository-complete browser acceptance と、文書化された discovery command target を `tests/e2e/repository-complete-inventory.spec.ts` と `tests/e2e/discovery.spec.ts` に追加する

---

## フェーズ 93: Repository 詳細の受け入れ

**目的**: 先行するすべての Repository 詳細増分が、包括的な実装を用いずに US2 を満たすことを検証する。

**独立テスト**: 現在所有されている完全な 48-ID Repository rule registry（35 static、5 bounded-derived、7 vendor-excluded、1 shared-symlink exclusion）、延期された Global-era exclusion 4 件の明示的な不在、parser matrix、exact literal-display/detail limit、safe filesystem boundary、すべての late owner-bound MCP activation、activation/connection/environment-reference resolution がゼロであること、file-detail と removed-reveal-route API behavior、relationship、diagnostics、stale cleanup、contained Hook/MCP fact による candidate-rule addition と duplicate owner read がゼロであることを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository customization family について US2 の inert-detail coverage が完成する。

### 受け入れテスト

- [ ] T920 [P] [US2] 現在所有する正確な48 IDの内訳（35 static、5 bounded-derived、7 vendor-excluded、1 shared-symlink exclusion）、延期した4 exclusionの不在、contained Hook/MCP candidate ruleゼロ、early contractからlate owner activationまでの完全なmatrix、1 owner ID/read、synthetic file/connectionゼロ、現在所有する全behavior/strategy/relationship/evidence backlink、emitする全`(tool, kind, fieldId)`とrelationship kindのexactなclosed presentation-allowlist membershipおよび未記載entryの推論ゼロ、reciprocal fingerprint、offline separationについて、Repository subgraph contractを`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts`に追加する
- [ ] T921 [P] [US2] JSONC、YAML、TOML、Markdown/frontmatter、厳密なエンコーディング、アトミックな抽出、Worker 置換、正確な境界について、4 パーサーのマトリクステストを `tests/unit/inspection/parsers.test.ts` と `tests/unit/inspection/seed-parsers.test.ts` に追加する
- [ ] T922 [US2] relationship、provenance、derivation、fallback、正確な source occurrence、完全な authored text、parser message、retained graph byte、file-detail bound に関する exact-limit/one-over テストを `tests/integration/limits.test.ts` に追加する
- [ ] T923 [US2] ソース/評価の事実、診断の上限、センチネル、有界な部分継続について、正確な上限値と 1 超過時のテストを `tests/integration/limits.test.ts` に追加する
- [ ] T924 [P] [US2] 不正ファイル、リンク、トラバーサル、循環、変更、読み取り後の検証、バイトの破棄、`O_NOFOLLOW`、OS の残存リスクについて、完全な安全性テストを `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T925 [P] [US2] `--no-open`または隔離した許可済みstartup helperの後から開始するinstrumentationのもとで、全Repository familyのdiscovery、read、parse、display、comparison、relationship処理によるchild process、evaluation/import、MCP、network、URI/image load、write、referenced readがゼロであることを`tests/integration/security/zero-activation.test.ts`のregressionで証明する
- [ ] T926 [P] [US2] 全kind、正確なauthored source/metadata/relationship literal、維持管理するclosed presentation allowlistにない全metadata/relationship tupleの拒否およびunknownなauthored key/referenceを完全なsource textだけに保持すること、strict envelope、stale ID、no-store、truncateしない4 MiB whole-response failure、source-value-free failureに関する完全なfile-detailとremoved-reveal-route API contractを`tests/contract/http-api-files.test.ts`に追加する
- [ ] T927 [US2] sensitive-content acknowledgement、完全なリテラルの detail、正確な metadata/relationship value、リテラルの credential と environment reference、masking/reveal control がないこと、malformed/boundary failure isolation、diagnostics、stale route、executable rendering がゼロであることに関する Repository-complete browser acceptance と、文書化された inspection-safety command target を `tests/e2e/repository-complete-detail.spec.ts` と `tests/e2e/inspection-safety.spec.ts` に追加する

---

## フェーズ 94: Repository 比較の受け入れ

**目的**: 先行するすべての Repository 比較増分が、包括的な実装を用いずに US3 を満たすことを検証する。

**独立テスト**: すべてのファミリーから代表ファイルを比較し、後段で受け入れられた実際のすべての所有者 ID を介した MCP を含めて、リテラル/型付き差分、runtime-only/dormant 選択の拒否、フォールバック、アクセシビリティ、古い状態の無効化、クライアントリソースの完全なクリーンアップを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。

### 受け入れテスト

- [ ] T928 [US3] すべての Repository kind にわたる rescan 時の selection、request token、FileDetail state、Monaco model/worker/subscription、late-owner MCP projection、client epoch、stale ID の無効化と、liveness purge までは session acknowledgement を保持することに関する lifecycle regression を `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T929 [US3] リテラル比較、型付き差分、実際の owner ID を介した late-owner MCP selection、runtime-only/dormant rejection、fallback behavior、accessibility、lifecycle cleanup に関する Repository-complete browser acceptance と、文書化された comparison command target を `tests/e2e/repository-complete-comparison.spec.ts` と `tests/e2e/comparison.spec.ts` に追加する

---

## フェーズ 95: Global 同意プレビュー

**目的**: User-Global パスが承認される前に、正確かつ有界で I/O を行わないプレビューを表示し、同意の除外に必要な残りの純粋な User-only の振る舞いの事実を完成させる。

**独立テスト**: 分離された環境入力と偽のホームを使用し、提案パスに対する I/O がゼロであること、正確な 3 ツールのプレビュー項目、32 KiB の入力上限と 192 KiB のエスケープ済み表示上限、不正なオーバーライド、バージョン付きダイジェストのバインディング、古い/再生された要求の拒否、アクセシブルな二言語レビュー、`codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` の読み取り権限を付与しない一度限りの所有を検証する。

**目に見えるチェックポイント**: ユーザーは検査を有効にする前に、正確な Global ルート、パターン、除外、上限、契約バージョンを確認できる。

### フィクスチャとテストを先に

- [ ] T930 [US4] 正確なcandidate、exclusion、fallback、invalid override、link、alias、unreadable root、異なるliteral credential/environment reference、sentinel process value、実行可能に見えるinert payload、before/after content hash、mutation sentinelを対象とする分離Global-home fixtureを、bilingual usage guidanceとともに `tests/fixtures/global-homes/build-fixtures.ts`、`tests/fixtures/global-homes/README.md`、`tests/fixtures/global-homes/README.ja.md` に作成する
- [ ] T931 [US4] 残りの純粋な User-only の事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` を具体化し、それらに対する失敗するレジストリ/バックリンクのカバレッジを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/official-sources.json`、`tests/contract/vendor-behaviors.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T932 [P] [US4] ファイルシステム I/O がゼロであること、存在しないオーバーライドと不正なオーバーライドの区別、正確な字句上のルート、32 KiB の入力、192 KiB のエスケープ済み出力、固定された null のサイズ超過状態について、失敗するプレビューテストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T933 [US4] immutable typed traversal-plan program、順序付き session-keyed raw/display digest binding、固定形式の verification input、stale/replayed invalidation、正確な eligible-tool state、closed tool order におけるすべての eligible entry からの `confirmedTools` 導出について、preview test を `tests/unit/host/global-consent.test.ts` で拡張する
- [ ] T934 [P] [US4] 正確な preview shape、status、limit、client path authority がないこと、no-store behavior、proposed-root I/O がゼロであることに関する、失敗する `GET /api/v1/global/consent-preview` contract を `tests/contract/http-api-global.test.ts` に追加する
- [ ] T935 [US4] 二言語のルート、パターン、状態、除外、上限、エラー、キーボードによるレビュー、同意前のソース結果または有効化要求がゼロであることについて、失敗するブラウザ受け入れテストを `tests/e2e/global-consent-preview.spec.ts` に追加する

### 実装

- [ ] T936 [US4] Global 除外レコードから参照される前に、それまで未所有で読み取り権限を付与しない事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` だけを `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T937 [US4] ソース ID を作成せず、これら 3 つの純粋な User-only の振る舞いの事実に対する相互バックリンクを既存の公式ソースレコードへ `shared/registries/official-sources.ts` で追加する
- [ ] T938 [US4] ファイルシステムアクセス、正規化、ルート作成を行わず、有界な環境/既定ホームのプレビュー構築とストリーミングエスケープを `src/host/global-consent.ts` に実装する
- [ ] T939 [US4] メモリ内だけのプレビューレコード、順序付きセッションキーによるダイジェスト構築、固定形式の検証素材、古い状態の無効化、有効化要求のバインディングを `src/host/global-consent.ts` に実装する
- [ ] T940 [US4] 正確なレスポンス、ステータス、上限、no-store の振る舞い、クライアントパスの権限がないことを備えた厳密な `GET /api/v1/global/consent-preview` ハンドラーだけを `src/host/api-router.ts` に実装する
- [ ] T941 [US4] 正確なルート、パターン、状態、除外、バージョン、上限について、アクセシブルなプレビュー表示を `app/components/consent/GlobalConsentPreview.vue` に実装する
- [ ] T942 [US4] 有効化を送信せず、プレビューのロード、ローカルの明示確認状態、古い状態からの回復、承認喪失の処理、フォーカス管理を `app/pages/global-consent.vue` に実装する
- [ ] T943 [US4] 意味的に同等な英語/日本語の Global プレビュー、上限、オーバーライド、ダイジェスト、同意メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 96: Codex Global 境界の受け入れと有効化基盤

**目的**: selector-free enable endpoint を通じて保存済みの正確な preview を検証し、bounded enable operation と tool control を確立し、commit 前には Source を公開せず、tool-specific provisional scan のために Codex root を受け入れる。

**独立テスト**: tool selector のない exact preview-bound body を送信し、false/stale/mismatched または extra-key request を拒否し、mutation 前に derived work set 全体を reserve する。Codex-only fixture が active consent、1 つの Codex `GlobalToolControl`、1 つの provisional scan job を作成する一方、complete/partial commit 前には public Source がないことを検証し、exact accepted/rejected partition、disable-race disposition、retryable failure state、Repository preservation、正確に `codex.excluded.user-runtime` を所有することを検証する。

**目に見えるチェックポイント**: Global control に confirmed/pending/retryable の Codex state が表示され、Codex scan が commit するまで inventory には Codex Global Source が公開されない。

### テストを先に

- [ ] T944 [P] [US4] component-identical canonical root、link、junction、case/Unicode/short-name alias、invalid override、次の exhaustive first-non-empty trace に関する、失敗する Codex post-consent test を `tests/unit/host/global-consent.test.ts` に追加する。non-empty override は regular-file operation をすべて short-circuit し、exact not-found または安全に証明した empty/BOM-only/whitespace-only の場合だけ次へ進み、unsafe、unreadable、oversized、undecodable、non-regular、または disappearing override は fallback せず失敗する
- [ ] T945 [P] [US4] 失敗する `POST /api/v1/global/enable` contract として、`confirmed: true`、正確な version/preview/digest binding、tool selector の不在、extra-key rejection、false/stale/mismatch rejection、全 eligible の `confirmedTools`、正確に partition された `acceptedTools`/`rejectedTools`、`queued`/`active-no-job`、retry conflict、scan commit 前の Source summary/publication がゼロであること、別の confirmation endpoint がないことを `tests/contract/http-api-global.test.ts` に追加する
- [ ] T946 [P] [US4] whole-work-set capacity reservation、all-or-none reservation failure、operation ID/epoch check、validation から job への capacity transfer、FIFO dequeue-time generation、duplicate conflict、control progress、provisional Source publication がゼロであること、terminal release、正確に一方だけとなる `202` と `409 global-disable-pending` の linearization に関する、失敗する initial-enable coordinator test を `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T947 [P] [US4] Codex Global instruction set だけ、exact-target call order と fallback short circuit、Codex Global skills/agents/config/hooks/MCP/plugins/rules/state/credentials/logs/caches の read/stat/listing がゼロであること、scan commit 前に public Source がないこと、Repository の保持に関する boundary test を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T948 [US4] 参照だけの Codex User 振る舞いセット、`codex.global.instructions`、正確な `codex.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T949 [US4] 有効化前にすべての Codex User 振る舞いがすでに所有されていたこと、`codex.global.instructions` が読み取りを新たに許可する唯一の Codex ルールであること、`codex.excluded.user-runtime` が新たに所有される唯一の Codex 除外であることを証明する、失敗する Codex Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T950 [US4] tool selector を持たない exact-preview submission、Codex の confirmed/pending/retryable control、accepted/rejected outcome、安全な boundary diagnostic、pre-commit Global Source/file row がゼロであること、保持される Repository result に関する browser acceptance を `tests/e2e/global-codex-admission.spec.ts` に追加する

### 実装

- [ ] T951 [US4] link と component-spelling alias difference を拒否し、Source を公開せずに accepted single-root context を Codex `GlobalToolControl` と provisional scan job へ移す、post-consent Codex root admission を `src/host/global-consent.ts` に実装する
- [ ] T952 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `codex.behavior.user.instructions`、`codex.behavior.user.agents`、`codex.behavior.user.config`、`codex.behavior.user.hooks`、`codex.behavior.user.memories`、`codex.behavior.user.plugins`、`codex.behavior.user.prompts`、`codex.behavior.user.rules`、`codex.behavior.user.skills` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T953 [US4] 同意でゲートされた読み取り許可ルールとして `codex.global.instructions` だけを追加し、既存の除外レコードを一切変更せず、正確に新しい非読み取りの `codex.excluded.user-runtime` を `shared/registries/inspection-rules.ts` で所有する
- [ ] T954 [US4] 新しい戦略 ID を作成せず、既存の Codex 命令戦略を Global 選択、フォールバック、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T955 [US4] 新しいソース ID を作成せず、Codex Global のカバレッジについて既存の公式ソースレコードのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T956 [US4] `codex-global-first-non-empty` traversal plan を実装する。`AGENTS.override.md` を安全に probe し、non-empty なら short-circuit し、exact not-found または安全に確定した empty/BOM-only/whitespace-only content の場合だけ次へ進み、それ以外のすべての outcome は fail closed とし、最大 1 file を publish し、正確な `codex.excluded.user-runtime` を `src/inspection/rules/codex.ts` で強制する
- [ ] T957 [US4] 正確な fallback behavior、bounded diagnostics、1 つの admitted root を備え、その job の complete/contracted-partial atomic commit までは public Global Source も graph もゼロとなる、分離された Codex provisional scan job を `src/inspection/scan.ts` に実装する
- [ ] T958 [US4] selector-free initial enable と exact-consent retry を実装する。all-eligible/missing-tool work-set derivation、whole-set capacity reservation、active consent、per-tool control、provisional context/job、FIFO dequeue-time snapshot、accepted/rejected partitioning、`active-no-job`、pre-commit Source publication がゼロであること、fatal retry state、terminal capacity release を `src/session/session.ts` と `src/session/scan-generation.ts` に含める
- [ ] T959 [US4] strict selector-free request guard、保存済み exact preview の検証、constant-time digest comparison、all-eligible confirmation、accepted/rejected result partition、queued/active-no-job response、retry conflict、disable-race disposition、Source summary なし、client path authority なしを備えた `POST /api/v1/global/enable` を `src/host/api-router.ts` に実装する
- [ ] T960 [US4] stale-preview recovery、accepted/rejected result handling、accessible focus を備えた selector-free enable endpoint に、単一の明示的な all-eligible confirmation control を `app/pages/global-consent.vue` で直接接続する
- [ ] T961 [US4] 未公開の tool がすでに Source を持つかのように示さず、confirmed/pending/retryable の per-tool Global control と active-no-job recovery を `app/components/consent/GlobalSourceControls.vue` に実装する
- [ ] T962 [US4] 意味的に同等な英語/日本語の Codex Global admission、all-eligible confirmation、accepted/rejected、no-precommit-Source、retryable boundary/fallback、progress message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 97: Claude Global 境界の受け入れ

**目的**: 別個の Claude Global Source を正確に 1 root で最終的に公開できるよう、独立した Claude root admission、control、provisional scan support を追加する。

**独立テスト**: valid/invalid Claude root を Codex から独立して受け入れ、同意済みの正確な `CLAUDE.md` だけを読み、Claude-specific `GlobalToolControl` と provisional job を維持し、自身の commit 前は Claude Source を公開せず、正確に `claude.excluded.user-runtime` を所有し、rejection/failure 時に consent、sibling control/Source、Repository graph を保持する。

**目に見えるチェックポイント**: Global control は Claude を Codex とは別に報告し、Claude scan が commit する前には Claude Source が表示されない。

### テストを先に

- [ ] T963 [P] [US4] 正規ルート、リンク、エイリアス、不正なオーバーライド、欠落/読み取り不能ファイル、兄弟の独立性、安全な診断について、失敗する Claude 同意後境界テストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T964 [P] [US4] Claude Global `CLAUDE.md` だけ、隣接するすべての User/runtime surface の read/stat/listing がゼロであること、別個の Claude control/job、pre-commit Claude Source がゼロであること、sibling state と Repository の保持に関する boundary test を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T965 [US4] 参照だけの Claude User 振る舞いセット、`claude.global.instructions`、正確な `claude.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T966 [US4] 有効化前にすべての Claude User 振る舞いがすでに所有されていたこと、`claude.global.instructions` が読み取りを新たに許可する唯一の Claude ルールであること、`claude.excluded.user-runtime` が新たに所有される唯一の Claude 除外であることを証明する、失敗する Claude Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T967 [US4] 別個の Claude confirmed/pending/retryable state、Claude waiting/admission progress、sibling diagnostic、pre-commit Claude Source/file row がゼロであること、保持される Repository result に関する browser acceptance を `tests/e2e/global-claude-admission.spec.ts` に追加する

### 実装

- [ ] T968 [US4] link と component-spelling alias difference を拒否し、accepted single-root context を Claude `GlobalToolControl` と provisional job へ移す post-consent Claude root admission を `src/host/global-consent.ts` に実装する
- [ ] T969 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `claude.behavior.user.instructions`、`claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T970 [US4] 同意でゲートされた読み取り許可ルールとして `claude.global.instructions` だけを追加し、正確に非読み取りの `claude.excluded.user-runtime` レコードを `shared/registries/inspection-rules.ts` で所有する
- [ ] T971 [US4] 新しい戦略 ID を作成せず、既存の Claude 命令戦略を Global 選択、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T972 [US4] ソース ID を作成せず、Claude Global のカバレッジについて既存の公式ソースのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T973 [US4] 同意済み境界の配下で Claude `CLAUDE.md` だけを処理し、正確な `claude.excluded.user-runtime` の強制を `src/inspection/rules/claude.ts` に実装する
- [ ] T974 [US4] sibling-safe diagnostics、正確に 1 root を備え、その scan 自身の complete/contracted-partial commit までは Claude Source を一切公開しない、分離された Claude provisional scanning を `src/inspection/scan.ts` に実装する
- [ ] T975 [US4] 独立した Claude control/context/job の progress、rejection/retry state、capacity transfer/release、consent、sibling control/Source、以前に commit された graph の保持を `src/session/session.ts` に実装する
- [ ] T976 [US4] 意味的に同等な英語/日本語の Claude Global admission、exact exclusion、sibling independence、separate-tool progress、rejection/retry、no-precommit-Source message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 98: Copilot Global 境界の受け入れ

**目的**: `copilot.excluded.user-runtime` と 1 つだけの共有 `shared.excluded.managed-remote-state` を所有しつつ、2 つの exact instruction selector に対する独立した Copilot root admission、control、provisional scan support を追加する。

**独立テスト**: valid/invalid `COPILOT_HOME` root を独立して受け入れ、`copilot-instructions.md` と `instructions/**/*.instructions.md` だけを読み、invalid override を fallback せず拒否し、admitted/excluded behavior partition を正確に mapping する。rejection/failure 時に consent、sibling control/Source、prior graph を保持し、Copilot scan 自身の commit 前には Copilot Source を公開しない。

**目に見えるチェックポイント**: Global control は Copilot を Codex と Claude とは別に報告し、Copilot scan が commit する前には Copilot Source が表示されない。

### テストを先に

- [ ] T977 [P] [US4] 存在しない/既定のオーバーライドと不正なオーバーライドの区別、正規ルート、リンク、エイリアス、欠落/読み取り不能ファイル、兄弟の独立性、安全な診断について、失敗する Copilot 同意後境界テストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T978 [P] [US4] 2 つの exact Copilot Global instruction set、隣接するすべての User/runtime/managed-remote surface の read/stat/listing がゼロであること、別個の Copilot control/job、pre-commit Copilot Source がゼロであること、sibling state と Repository の保持に関する boundary test を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T979 [US4] 参照だけの Copilot 振る舞いの分割を具体化する。すなわち、`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞いは `copilot.excluded.user-runtime` だけ、契約で定められた Claude/Codex User と 5 個の Cloud 振る舞いだけは `shared.excluded.managed-remote-state` に対応させ、composition とエビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に追加する
- [ ] T980 [US4] 受け入れた 3 つの振る舞いから Global ルールへの正確なバックリンク、残りの 16 個から `copilot.excluded.user-runtime` への正確なバックリンク、契約対象だけの共有 managed 影響セット、分割をまたぐバックリンクがないこと、新たに読み取りを許可するのが `copilot.global.instructions.root` と `copilot.global.instructions.path` だけであること、新たに所有されるベンダー除外が 1 つ、共有除外が 1 つであることを証明する、失敗する Copilot Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T981 [US4] 別個の Copilot confirmed/pending/retryable state、Copilot waiting/admission progress、invalid-override diagnostic、pre-commit Copilot Source/file row がゼロであること、保持される Repository result に関する browser acceptance を `tests/e2e/global-copilot-admission.spec.ts` に追加する

### 実装

- [ ] T982 [US4] absent/default と invalid override を区別し、link/component alias を拒否し、accepted single-root context を Copilot `GlobalToolControl` と provisional job へ移す post-consent Copilot root admission を `src/host/global-consent.ts` に実装する
- [ ] T983 [US4] すでに所有されている振る舞いを、互いに素な 3 つの相互バックリンクセットで更新する。`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞い（`copilot.behavior.vscode.user.claude`、`copilot.behavior.vscode.user.skills`、`copilot.behavior.vscode.user.agents`、`copilot.behavior.vscode.user.prompts`、`copilot.behavior.vscode.user.hooks`、`copilot.behavior.vscode.user.mcp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.skills`、`copilot.behavior.cli.user.agents`、`copilot.behavior.cli.user.hooks`、`copilot.behavior.cli.user.mcp`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.plugins`、`copilot.behavior.cli.user.lsp`、`copilot.behavior.cli.user.extensions`）は `copilot.excluded.user-runtime` だけ、契約で定められた共有 managed セット（`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.settings`、`codex.behavior.user.config`、`codex.behavior.user.plugins`、`copilot.behavior.cloud.mcp`、`copilot.behavior.cloud.organization-agents`、`copilot.behavior.cloud.organization-instructions`、`copilot.behavior.cloud.plugins`、`copilot.behavior.cloud.remote-skills`）は `shared.excluded.managed-remote-state` だけに対応させ、振る舞い ID を追加または再定義せずに `shared/registries/vendor-behaviors.ts` で更新する
- [ ] T984 [US4] 正確な 3 つの受け入れ済み振る舞い参照を持つ `copilot.global.instructions.root` と `copilot.global.instructions.path` だけを追加し、残りの 16 個の User 振る舞い参照だけを持つ正確な `copilot.excluded.user-runtime` を所有し、契約で定められた Claude/Codex User と 5 個の Cloud 参照だけを持つ 1 つの共有非読み取り `shared.excluded.managed-remote-state` を `shared/registries/inspection-rules.ts` に追加する
- [ ] T985 [US4] 新しい戦略 ID を作成せず、既存の Copilot CLI/VS Code 命令戦略を Global の適用可能性とソース分離によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T986 [US4] ソース ID を作成せず、正確な受け入れ済み 3 件の Global ルール、残り 16 件の User-runtime、契約で定められた shared-managed の各分割について、既存の公式ソースバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T987 [US4] 同意済み境界の配下で Copilot `copilot-instructions.md` と `instructions/**/*.instructions.md` だけを処理し、正確な `copilot.excluded.user-runtime` と `shared.excluded.managed-remote-state` の強制を `src/inspection/rules/copilot.ts` に実装する
- [ ] T988 [US4] bounded instruction-subtree-only traversal、sibling-safe diagnostics、正確に 1 root を備え、その scan 自身の complete/contracted-partial commit までは Copilot Source を一切公開しない、分離された Copilot provisional scanning を `src/inspection/scan.ts` に実装する
- [ ] T989 [US4] 独立した Copilot control/context/job の progress、rejection/retry state、capacity transfer/release、consent、sibling control/Source、以前に commit された graph の保持を `src/session/session.ts` に実装する
- [ ] T990 [US4] 意味的に同等な英語/日本語の Copilot Global override、admission、exact exclusion、sibling independence、separate-tool progress、rejection/retry、no-precommit-Source message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 99: ツール固有 Global 結果の統合

**目的**: root を merge せず cross-tool Source の統合を待たず、正確に 1 tool/1 root を持つ、別々に commit される 0〜3 個の tool-specific Global Source を統合する。

**独立テスト**: 0〜3 個の eligible tool job を完了し、各 complete/contracted-partial job が、すべての sibling/Repository Source を session-wide generation へ持ち越しながら、別個の one-root tool-specific Source だけを atomic に publish/replace することを検証する。stable Source ID、generation-owned graph rekeying、正確な 56-rule total、mixed accepted/rejected/fatal outcome、sibling continuation、detail/comparison reuse、excluded-surface read がないこと、missing tool が Source を公開しない時の retryable control state も検証する。

**目に見えるチェックポイント**: Codex、Claude、Copilot の Global Source はそれぞれ自身の commit 後に別々に表示され、独立して filter、inspect、compare、rescan、recover できる。

### テストを先に

- [ ] T991 [P] [US4] 正確な 3 vendor instruction set、tool ごとに最大 1 つかつ各 1 root の 0〜3 Sources、独立した complete/partial commit、cross-tool merge がないこと、除外されたすべての Global surface の read がゼロであること、sibling continuation、Repository preservation に関する integrated boundary test を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T992 [US4] 正確に 56 個のルール ID（Global 前の 48 ID ゲートに、3 つのベンダー `*.excluded.user-runtime` レコード、`shared.excluded.managed-remote-state`、4 個の Global 静的読み取り許可ルールを加えたもの）、正確な除外の所有、相互性、内包 Hook/MCP による候補追加がゼロであること、既存ソースへのエビデンスバックリンクを証明する、最終 Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T993 [P] [US4] independent per-tool atomic Source publication、stable `Source.sourceId`、one-root/tool invariant、session-wide carried-Source generation rekeying、sibling failure、bounded partial commit、missing-tool no-Source retry state、progress、duplicate conflict に関する coordinator test を `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T994 [P] [US4] Repository と tool-specific Global のすべての `Source.sourceId` が process lifetime にわたり安定する一方、file、recognition、provenance、relationship、diagnostic と関連する generation-owned ID が rekey され、stale FileDetail/comparison/Monaco が cleanup され、provisional context や pending-admission が漏れないことを証明する lifecycle test を `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T995 [P] [US4] 異なるliteral credential text、environment-reference syntax、sentinel process value、実行可能に見えるinert payload、mutation/hash sentinelを含むGlobal fixtureについて、失敗するexact-display API/integration testを追加し、各source/detail/comparison surfaceとAPIがauthored textを正確に返し、process sentinelを返さず、fixtureを変更しないことを `tests/contract/http-api-files.test.ts` と `tests/integration/global-literal-display.test.ts` で証明する
- [ ] T996 [P] [US4] そのGlobal fixtureがdynamic evaluation、command/hook execution、browser-helper launch、MCP connection、outbound request、environment lookup/substitution、source writeを0件にすること、およびorigin-file-less Source Condition Factがlocal/hosted I/Oを0件にし、file、relationship origin、comparison identityを作成しないことを証明する、失敗するzero-activation security testを `tests/security/global-zero-activation.test.ts` と `tests/integration/source-condition-facts.test.ts` に追加する
- [ ] T997 [US4] exact-preview enablement、独立commit後に別々に識別されるCodex/Claude/Copilot Source、source/tool filter、one-root presentation、sibling diagnostic、process substitution/activationなしのliteral credential/environment-reference exact display、synthetic file actionを持たないorigin-file-less Source Condition Fact分離、Global detail/comparison再利用、retryable missing tool、fatal retention、Repository preservationに関するbrowser acceptanceを `tests/e2e/global-enable.spec.ts` に追加する

### 実装

- [ ] T998 [US4] post-consent per-tool admission を、independent one-root `GlobalToolControl` context と provisional job として完成させ、all-eligible initial confirmation、missing-tool-only retry、sibling retention を `src/host/global-consent.ts` に実装する
- [ ] T999 [US4] すべての Global 振る舞い、正確に 4 個の Global 静的候補ルール、既存の正確な除外、戦略参照、47 個のソースバックリンク、正確な 56 ルールの合計を `shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts` で完成させる
- [ ] T1000 [US4] Repository と他 tool の result を保持しつつ、別々の one-root Source に対する integrated but isolated per-tool Global scanning、sibling continuation、Codex fallback、独立した bounded ready/partial result を `src/inspection/scan.ts` に実装する
- [ ] T1001 [US4] tool-specific Global Source を、その tool 自身の scan が complete/partial complete した時だけ atomic に publish/replace し、Repository と sibling Source を新しい session generation へ持ち越し、すべての Source ID を保持し、generation-owned graph ID を rekey し、その tool の transient work を clear する。fatal 時には missing Source を publish せず consent/control retry state と prior graph を保持する処理を `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T1002 [US4] exact accepted/rejected tool partition、queued/active-no-job outcome、sibling diagnostic、conflict、retry state に対する `POST /api/v1/global/enable` response を完成させ、Source publication は per-tool commit 後の後続 session poll に委ねる処理を `src/host/api-router.ts` に実装する
- [ ] T1003 [US4] Repository と別々に識別される Codex/Claude/Copilot Global Source および tool filter、one-root summary、共通の detail/comparison navigation を `app/composables/filters.ts`、`app/composables/session.ts`、`app/pages/index.vue` に実装する
- [ ] T1004 [US4] per-tool Global confirmation/progress/retry control、focus recovery、active-no-job handling、別々の Source outcome presentation を `app/pages/global-consent.vue` と `app/components/consent/GlobalSourceControls.vue` で完成させる
- [ ] T1005 [US4] 意味的に同等な英語/日本語の tool-specific Source integration、one-root、accepted/rejected、active-no-job、sibling failure、retry、source/tool-filter、detail/comparison、progress message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 100: Global の再スキャンと回復

**目的**: 明示的な Global 再スキャン、FIFO 直列化、有界な持ち越しソースの計上、致命的な試行後の回復を追加する。

**独立テスト**: Repository と Global の作業をキューに入れ、部分的および致命的な Global の試行を開始し、デキュー時の世代、プロセスの存続期間中に安定する Repository と Global の `Source.sourceId` 値、世代所有グラフ ID だけの再キー化、正確な予算、重複競合、保持された同意/境界/以前のグラフ、明示的な再試行の成功を検証する。

**目に見えるチェックポイント**: ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。

### テストを先に

- [ ] T1006 [US4] ソースをまたぐ FIFO、デキュー時の世代、重複スキャン競合、進捗遷移、致命的な失敗時の保持、ジョブごとのカウンターについて、失敗するコーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T1007 [US4] carried-Source graph/base-budget accounting、lifecycle/control overlay capacity、per-command reservation transfer/release、active job ごとの exact-limit/one-over visited-entry/deadline reset に関する coordinator test を `tests/unit/session/coordinator.test.ts` で拡張する
- [ ] T1008 [P] [US4] 失敗する `POST /api/v1/global/rescan` contract として、strict single `sourceId` body、識別済みの tool-specific Source 1 つだけ、unknown/removed Source、disable-pending/duplicate conflict、bounded-capacity failure、waiting progress、fatal retry、stale ID を `tests/contract/http-api-global.test.ts` に追加する
- [ ] T1009 [P] [US4] 有効化の完了、キューに入った Repository/Global スキャン、部分公開、致命的な失敗時の保持、明示的な再試行、変更されない同意/境界について、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1010 [P] [US4] 成功/部分成功した tool-specific Global commit がすべての Repository/Global `Source.sourceId` を保持し、carried/replaced file/recognition/provenance/relationship/diagnostic graph ID を rekey し、その Source の stale failure だけを clear し、sibling failure を保持し、古い FileDetail/comparison/Monaco state を無効化することを証明する lifecycle test を `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T1011 [US4] Global 再スキャン、待機中/アクティブの進捗、重複防止、部分的な診断、致命的な失敗の再試行、以前の結果の保持について、ブラウザ受け入れテストを `tests/e2e/global-rescan.spec.ts` に追加する

### 実装

- [ ] T1012 [US4] 識別済みの tool-specific Global Source 1 つに対する FIFO rescan、すべての Source ID を保持して carried/replaced generation-owned graph ID を再生成する successful/partial session-wide commit、rescanned Source の stale failure だけの clear、sibling failure の保持、古い FileDetail/comparison state の無効化を `src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts` に実装する
- [ ] T1013 [US4] 持ち越しソースの予算予約と、アクティブなジョブごとの visited-entry/deadline リセットを `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T1014 [US4] strict `POST /api/v1/global/rescan` handling として、正確に 1 つの opaque `sourceId`、1 つの tool-specific Source、disable/duplicate conflict、bounded-capacity error、progress、fatal retry、stale-resource response を `src/host/api-router.ts` に実装する
- [ ] T1015 [US4] Global 再スキャンのロード、重複抑止、古い状態からの回復、致命的な失敗の再試行、進捗更新を `app/components/consent/GlobalSourceControls.vue` と `app/composables/session.ts` に実装する
- [ ] T1016 [US4] 意味的に同等な英語/日本語の Global 再スキャン、キュー、部分結果、失敗時の保持、再試行メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 101: Global 無効化バリアと解体

**目的**: 優先されるゼロ I/O の無効化バリアを追加し、保持される Repository データを妨げることなく Global 所有のすべてのアーティファクトを削除する。

**独立テスト**: Repository、enable、tool-specific Global の work 中に disable し、request を繰り返して join し、race disposition、cancellation/requeue rule、1 回の atomic generation、idempotent no-op behavior、closed handle、すべての Global Source、control、root context、source/detail/comparison state、diagnostics、consent、frozen preview の削除を検証する一方、Repository data が引き続き利用できることを確認する。

**目に見えるチェックポイント**: Global 検査を無効にすると、そのセッション状態が完全に解体され、Repository 検査は引き続き利用できる。

### テストを先に

- [ ] T1017 [US4] 優先キャンセル、キャンセル診断がゼロであること、Repository の 1 回だけの再キュー、安定した Repository `Source.sourceId` を伴う N+1 の保持 Repository グラフ再キー化、古い世代所有 ID、合流するバリア、no-op 無効化、タイムスタンプについて、失敗するコーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T1018 [P] [US4] 失敗する `POST /api/v1/global/disable` 契約として、空ボディ、キャンセル中の進捗、合流した完了、べき等な no-op、1 回の削除コミット、`200` レスポンスを `tests/contract/http-api-global.test.ts` に追加する
- [ ] T1019 [P] [US4] 中断された Repository 作業、中断された Global 作業、キューに入った Global のキャンセル、合流する無効化、1 回だけの再キュー、空の no-op の振る舞いについて、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1020 [P] [US4] Global 無効化がファイルシステムの列挙または読み取りを一切行わず、バリアキャンセル診断を一切出力しないことを証明する境界計装を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T1021 [P] [US4] すべての Global Source/file/graph ID、source/control diagnostics、authored-source/detail state、comparison selection、Monaco model/worker、consent、tool control、frozen preview、root context、handle の削除に関する lifecycle test を `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T1022 [US4] complete preview/enable/rescan/disable workflow、すべての tool-specific Source にわたる disable progress、enable/disable race outcome、joined/no-op request、focus restoration、Global route/editor/detail teardown、control/diagnostic removal、保持される Repository result に関する browser acceptance と、文書化された Global-consent command target を `tests/e2e/global-disable.spec.ts` と `tests/e2e/global-consent.spec.ts` に追加する

### 実装

- [ ] T1023 [US4] 優先ゼロ I/O バリア、診断を伴わないアクティブ作業のキャンセル、キュー済み Global の破棄、Repository の 1 回だけの再キュー、バリアの合流、no-op 検出を `src/session/session.ts` に実装する
- [ ] T1024 [US4] handle を閉じてすべての Global Source、graph/authored source、consent、tool control、frozen preview、root context、diagnostics、detail、comparison を削除し、Repository `Source.sourceId` を保持し、その generation-owned graph ID を rekey し、以前の generation-owned ID をすべて stale にする N+1 zero-I/O commit を `src/session/session.ts`、`src/session/stale-failures.ts`、`src/session/scan-generation.ts` に実装する
- [ ] T1025 [US4] 空ボディの検証、キャンセル中の進捗、合流した完了、no-op の振る舞い、1 回の削除コミットを備えた厳密な `POST /api/v1/global/disable` 処理を `src/host/api-router.ts` に実装する
- [ ] T1026 [US4] 無効化のロード、合流/no-op 処理、フォーカス復元、Global route/editor/model のクリーンアップを `app/pages/global-consent.vue`、`app/components/consent/GlobalSourceControls.vue`、`app/composables/session.ts` に実装する
- [ ] T1027 [US4] committed barrier の後に、すべての Global tool/Source filter、selection、diagnostic、recovery、FileDetail、comparison、Monaco model/worker/subscription、cached DTO state を削除し、authorized-session acknowledgement は liveness purge まで保持する処理を `app/composables/filters.ts`、`app/composables/liveness.ts`、`app/composables/comparison.ts`、`app/composables/monaco.ts` に実装する
- [ ] T1028 [US4] 意味的に同等な英語/日本語の Global バリア、キャンセル、無効化、no-op、削除、Repository 維持メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 102: ドキュメント、エビデンス、依存関係のレビュー

**目的**: 二言語の運用ガイダンス、公式ソースのエビデンス、適合データ、レビュー済みの依存関係判断を完成させる。

**独立テスト**: 有界な公式ソースワークフローを実行し、すべての drift/dependency 判断をレビューし、同期された英語/日本語ガイダンスと適合レコードを検証する。

**目に見えるチェックポイント**: メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。

### ドキュメント

- [ ] T1029 検証済みlaunch command、Node.js 24/26 engines contract全体・Node.js 24.18.0 build baseline・lower-bound certification sample、OS-default-browser delegation対pin済みPlaywright certificationと`--no-open` manual fallback、Repositoryと別々のone-root Global scope、Source Condition Fact分離、consent/retry/disable、literal value/no-environment-resolution behavior、公開SC-002 profile/status protocol、正確なlimit、diagnostic、filesystem residual risk、privacy、accessibility、exclusion、maintenance commandを含む意味的に同等なoperational guidanceを `README.md` と `README.ja.md` に起草する
- [ ] T1030 Study、recruitment/compensation funding、moderation/review、support、privacy/retention、equipment/session、accessibilityのownerを示すmaintainer-owned bilingual plan、固定20 participant順序、certified-browser record/fallback、exact timer、prepared state、4-field ground truth、no-hints/no-replacement rule、4 workflowすべての観察、safety eventのautomatic critical判定、safety以外のproduct blocker疑いだけを2人がfixed rubricで独立分類し不一致をcriticalとして第3裁定者を設けないことを含む意味的に同等なSC-001/SC-006 study kitを `tests/usability/sc001-sc006-study-kit.md` と `tests/usability/sc001-sc006-study-kit.ja.md` に作成する。通常のcontributorはstudyを運営せず、resource不足はcontribution reviewではなくrelease claimをblockし、materialなworkflow/guidance/fixture/rubric変更時だけ再実施することも記載する

### 公式エビデンスと依存関係のレビュー

- [ ] T1031 exact host、redirect rejection、bounded content、size/time limit、explicit network opt-in、non-mutating drift reporting に関する、失敗する official-source checker contract を `tests/contract/official-source-drift.test.ts` に追加する
- [ ] T1032 明示的に network を使う official-source checker を実装し、standalone maintainer-only の `check:official-sources` script をすべての default build/start/test/CI chain の外で登録して実行し、自動的な behavior change を行わず reviewed source set と classified drift を `scripts/check-official-sources.ts`、`package.json`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1033 受け入れられたソースまたはセクションのドリフトを `specs/001-inspect-agent-customizations/contracts/official-sources.md`、`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md` で解消する
- [ ] T1034 [P] SupportedなCopilot customization typeごとにexactでclosedなmetadata-field/relationship-kind presentation allowlistを列挙し、automatic scope expansionなしでaccepted evidence driftを`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md`と`specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`で解決する
- [ ] T1035 [P] SupportedなClaude customization typeごとにexactでclosedなmetadata-field/relationship-kind presentation allowlistを列挙し、automatic scope expansionなしでaccepted evidence driftを`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md`と`specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`で解決する
- [ ] T1036 [P] SupportedなCodex customization typeごとにexactでclosedなmetadata-field/relationship-kind presentation allowlistを列挙し、automatic scope expansionなしでaccepted evidence driftを`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md`と`specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`で解決する
- [ ] T1037 明示的にレビューされたエビデンス変更だけを `shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts` に適用する
- [ ] T1038 影響を受けた適合レコードだけを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で再生成する
- [ ] T1039 レビュー済みのエビデンスの結論を同期し、チェッカーを再実行し、最終結果を `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1040 `pnpm outdated`、license、notice、compatible-version rationale、public-contract effectをreviewし、全accept/reject判断を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する。変更をacceptしない場合はbaseline unchangedを記録して続行する。1件でもacceptした場合はcurrent `tasks.md`/`tasks.ja.md`をsupersededと記録し、package/configuration editおよび旧task IDの後続実行前に停止し、影響を受ける英日research/plan/quickstartを同期して`/speckit-plan`、`/speckit-tasks`の順に再実行し、regenerate済みtask setからだけ変更をapply/verifyする

---

## フェーズ 103: 横断的な検証

**目的**: 最終的な横断ドキュメント、パッケージ、アクセシビリティ、ライフサイクル、Node.js-only の回帰スイートを追加する。

**独立テスト**: 横断スイートを実行し、二言語の契約、クローズドなパッケージ内容、Node.js-only ポリシー、アクセシビリティの振る舞い、ライフサイクルのクリーンアップを検証する。

**目に見えるチェックポイント**: 完成した製品が横断的な自動回帰レイヤーを通過する。

### 横断テストを先に

- [ ] T1041 英日相互link/semantic parity、runnable command/stable ID、全53 FR/QR/SC rowの実在task参照と全taskのspec requirementまたは明示的Constitution obligationへのmapping、closed presentation allowlistとregistry/API parity、literal-display/no-environment-resolutionとSource Condition Fact zero-synthetic-file/I/O rule、one-root Source、exact engines/build/certification区分とdefault-browser fallback、公開SC-002 profile field/result fieldおよびpersonal identifier/absolute-user-pathだけを省略するrule、`O_NOFOLLOW`、`safe-fs-boundary-unverifiable`、`platform-unobservable`、residual-risk wording、official backlink、stale native claim不在に関するdocumentation/traceability testを `tests/contract/documentation.test.ts` に追加する
- [ ] T1042 [P] 正確に47 source recordをmaterializeし、正確に56 inspection-rule ID（35 Repository static、5 bounded-derived、10 vendor-excluded、2 shared-excluded、4 Global static）、39 strategy、14 relationship-only rule、contained Hook/MCP candidate additionゼロ、presentation allowlist/registry exact parity、complete reciprocity、official-source identity bound、およびexact Source/tool/surface/status/evidenceとread authority・synthetic file・local/hosted I/Oゼロを持つorigin-file-less Source Condition Factに関するfinal full-registry testを `tests/fixtures/conformance/official-sources.json`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T1043 [P] `package.json`、exact `bin.mjs`、exact packed `engines.node`、pre-import running-version rejection、`dist`、両README、`LICENSE`、両manifest、全listed payload hash、fixed CLI/Worker entry、unlisted payload rejectionに関するexact packed-tarball closed-set/recursive-manifest testを `tests/package/package-contents.test.ts`、`tests/package/static-manifest.test.ts`、`tests/package/server-manifest.test.ts` に追加する
- [ ] T1044 [P] `gunshi` 0.37.0を含む正確なruntime dependency leaf set、Gunshiの正確なintegrity/bundle済みpayload全体のdigestとroot-only import boundary、`open`の不在、production-graphのname/version/integrity/payload digest、scripts-disabled installとverified-cache network-disabled normal-lifecycle install、別個のgenerated-shim audit、Rust/C/C++、Cargo、Node-API/native/binary/Wasm payload、`binding.gyp`、prebuild、platform selector、package-owned shell helper、non-Node shebang、lifecycle/runtime download、unlisted dataの拒否に関するpackage testを`tests/package/node-only-policy.test.ts`と`tests/package/production-graph.test.ts`で拡張する
- [ ] T1045 [P] Story横断のaxe、keyboard、forced-colors、zoom/reflow、reduced-motion、focus-retention、safe-error、sensitive-content acknowledgement、liveness purge/resume regressionを追加し、完全なprimary-workflow/accessibility certification suiteがpin済みChromium、Firefox、WebKit projectで合格することを要求する一方、それらrevisionをuser browserの網羅的一覧としないことを `tests/e2e/accessibility.spec.ts` と `tests/e2e/session-liveness.spec.ts` で検証する
- [ ] T1046 [P] 正確な 5 MiB neutral base、16 KiB の fixed-failure/sentinel reserve を含む 2 MiB lifecycle diagnostic/ID overlay、1 MiB control/progress overlay、8 MiB final envelope、canonical production encoder、同一の変更されない HTTP buffer と `Content-Length`、truncation しない固定 `500 response-size-invariant`、各 coordinator が capture した generation と payload を混在させず rescan/Global-disable commit をまたいで pause した SessionSnapshot/FileDetail delivery に関する worst-case snapshot regression を `tests/integration/session-snapshot-encoding.test.ts`、`tests/contract/http-api-session.test.ts`、`tests/contract/http-api-files.test.ts` に追加する

---

## フェーズ 104: リリースと成果エビデンス

**目的**: リリースマトリクスを組み立て、測定可能なすべての成功基準、最終ゲート、明示的なrelease Constitution Checkの合否エビデンスを記録する。

**独立テスト**: 1つのclosed setでplatform非依存tarballをbuildし、Node.js 24/26の宣言済みcompatibility contract全体を維持しながら正確な6つのlower-bound Node/OS jobで同一byteをcertifyし、SC-001～SC-009の全denominator/thresholdを検証して、principleごとの明示的Constitution Checkを記録する。

**目に見えるチェックポイント**: 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスク、憲章準拠のエビデンスを備え、公開可能な状態になる。

### リリースワークフロー

- [ ] T1047 Node.js 24.18.0 `ubuntu-24.04` x64 development/build baselineでplatform-independent tarballをbuild/verifyし、同一byteをNode.js `24.11.0`/`26.0.0`と`ubuntu-24.04` x64/`macos-15` arm64/`windows-2025` x64の6 lower-bound certification sampleへ配布し、runner-image identifier/actual Node versionを記録して、`^24.11.0 || ^26.0.0`をfull compatibility contractとして維持し、shimを別auditしながらproduction-graph digestを集約するrelease jobを `.github/workflows/release.yml` に追加する
- [ ] T1048 Exact packed-engines/running-version pre-import rejection、safe-filesystem、recursive two-manifest/hash、scripts-disabled/verified-cache network-disabled install、production graph、`npx`、Node.js-only、package-content、exact Playwright 1.61.1 Chromium/Firefox/WebKit browser certification、`--no-open` manual fallbackを含むOS-default-handler区分、liveness、accessibility gateによってrelease jobを `.github/workflows/release.yml` で拡張する

### 成果エビデンスと最終ゲート

- [ ] T1049 frozen install、Playwright 1.61.1の正確なChromium/Firefox/WebKit install、build、formatting、lint、typecheck、unit、contract、securityの各gateを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1050 integration、package、performance、browser、coverage、documentation の各ゲートを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1051 同一tarball byteに対してNode.js `24.11.0`/`26.0.0`と`ubuntu-24.04` x64/`macos-15` arm64/`windows-2025` x64の正確な6 lower-bound certification jobを実行し、packed full Node.js 24/26 engines contractとout-of-range rejectionを検証して、runner identifier、actual version、production-graph digest一致、shim audit、detectable unsafe-state rejection、`safe-fs-boundary-unverifiable`、effective `O_NOFOLLOW`、non-proving `platform-unobservable` outcomeを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1052 Checked-in `tests/performance/sc002-reference-profile.json` fieldとfixture digestをvalidateし、そのprofile/変更しない100,000-entry/500-match fixtureに一致する正確に10回のfresh-process runでSC-002 pass/failを記録する。以前のsnapshot再利用と意図的OS-cache resetを行わず、10回中9回以上で現在requestのqueued/active-phase/complete/partial/failed statusを1秒以内に画面表示してassistive technologyにも公開し、generic/loading/old stateを拒否し、10秒以内にoperable inventoryを完成させ、両standardized interactionを100 ms未満にする。Profile ID、digest、actual environment valueを公開してpersonal identifierとabsolute user pathだけを省略し、profile変更をnon-comparableとして `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1053 サポート、拒否、共有ファイルのすべての適合行について、最終ゲートと分母から SC-003 の合否を記録する。認識率 100%、範囲外の解釈ゼロ、正しい帰属率 100% とし、`specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1054 T996/T997 Global inert-payload fixtureを含むfinal gate/safety-suite denominatorからSC-004 pass/failを記録する。Fixed startup browser helperを唯一許可するproduct child processとして隔離し、customization由来activation、child process、MCP、network、mutation、rejected-selector read、environment lookup/substitution、changed-file byte publicationを0件にして `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1055 T930/T995/T997 Global fixtureを含むSC-005 pass/fail/denominatorを記録し、維持対象literal credential/environment-reference textの100%がAPI/source/comparison viewでunmasked/unchanged、process-environment sentinel導入0件、masking/reveal control 0件、fixture hash unchanged、diagnostic/logによるsource value複製0件であることを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` で証明する
- [ ] T1056 Maintainer-owned bilingual study planのもとreplacementなしのexactly 20 participantでSC-001を最初に実施し、certified browser/default handlerまたはmanual fallback、exact 2-minute boundary、全unsuccessful equipment/environment/product outcomeを記録し、19件以上のlaunch/open成功を要求して `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1057 SC-001後に同じexactly 20 participant、prepared file state、certified-browser record/fallback、exact 2-minute boundary、4-field ground truth、replacementなしでSC-006を実施し、その後全員がcomparison/Global consentを実施する。全workflow outcomeとautomatic safety eventを記録し、safety以外のproduct blocker疑いだけを2人がfixed rubricで独立分類し、不一致を第3裁定者なしでcriticalと数え、18件以上の識別成功、20人全員のcomplete attempt、critical issue 0件を要求して `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1058 すべての unreadable、malformed、oversized、cyclic、stale、boundary-crossing fixture に関する SC-007 の pass/fail と denominator を記録する。fatal rescan からの partial publication がゼロであること、最後に commit 済みの snapshot を stale として保持すること、影響を受けない item の usability が 100% であること、actionable diagnostics を含めて `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1059 すべての主要ワークフローと、適用可能なすべての WCAG 2.2 AA 自動/手動チェックについて分母を備えた SC-008 キーボードおよび手動アクセシビリティプロトコルを実行し、合否と重大な欠陥ゼロを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1060 維持管理するorigin-file-less Source Condition Fact fixtureの100%についてSC-009のpass/failを記録し、正しいSource、tool、product surface、documented conditionまたはunavailable state、evidence、およびphysical/synthetic file、file ID、Source-relative Path、authored source text、comparison target、relationship origin、local/hosted read、network requestが0件であることを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` で証明する
- [ ] T1061 Complete diff/packed tarballについてcorrectness、untested branch、literal-display/environment-resolution failure、Source Condition Fact synthesis/I/O、boundary failure、stale claim、source-root merge、engines/certification ambiguity、package-graph divergence、bilingual mismatch、SC-002 personal-identifier/absolute-user-path leakage、unrelated changeを検査し、影響を受ける全evaluationを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` で再実行する
- [ ] T1062 残存課題と具体的な解決経路を完成させ、`pnpm run test:docs` を再実行し、`git diff --check` を実行して、その結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1063 原則ごとの明示的なrelease Constitution Checkを実施・記録し、既知の全違反が解決済みで、各残存不確実性にownerと具体的な解決pathがあることを確認し、approval前のpull request reviewでも同じ明示的checkを必須とする。対象は `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` とする

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
| 13 SKILL 比較 | US3 | 読み取り可能な任意の 2 つの SKILL file を、activation も mutation もせずに比較できます。 |
| 14 SKILL metadata 比較 | US3 | authored sensitive value を含めて 2 つの Codex skill-metadata file を、environment reference を解決せず seed skill と混同することなく比較できます。 |
| 15 Codex Instructions inventory | US1 | 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。 |
| 16 Codex Instructions 詳細 | US2 | 静的な Codex instruction を選択すると、明示的な order、byte budget、condition、carrier 受け入れ前であることを正直に示す fallback status を備えた、完全で inert な detail が開きます。 |
| 17 Claude Instructions inventory | US1 | 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction file を filter できます。 |
| 18 Claude Instructions 詳細 | US2 | Claude instruction を選択すると、参照 file を import せず、完全で inert な layered detail が表示されます。 |
| 19 Copilot Instructions inventory | US1 | surface-qualified provenance と明示的な exclusion を持つ Copilot instruction candidate を filter できます。 |
| 20 Copilot Instructions 詳細 | US2 | Copilot instruction を選択すると、別々の surface interpretation と uncertainty が表示されます。 |
| 21 統合 Instructions inventory | US1 | 完全な静的 instruction inventory、すべての shared-file interpretation、および MCP が最小 carrier を受け入れたときに有効になる一つの有界 fallback integration を理解できます。 |
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
| 73 Copilot Marketplaces の詳細 | US2 | Copilot marketplace を選択すると、plugin manifest を読み取らず、完全で inert な authored entry と bounded local-source plan が表示される。 |
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
| 95 Global 同意プレビュー | US4 | ユーザーは検査を有効にする前に、正確な Global ルート、パターン、除外、上限、契約バージョンを確認できる。 |
| 96 Codex Global 境界の受け入れと有効化基盤 | US4 | scan commit 前は Codex Source を公開せず、control が Codex の confirmation、admission、progress、retry state を表示する。 |
| 97 Claude Global 境界の受け入れ | US4 | Claude admission は Codex から独立して追跡され、別個の one-root Source を対象とする。 |
| 98 Copilot Global 境界の受け入れ | US4 | Copilot admission は Codex と Claude から独立して追跡され、別個の one-root Source を対象とする。 |
| 99 ツール固有 Global 結果の統合 | US4 | 別々に識別される 0〜3 個の one-root tool Source が、それぞれ自身の complete/partial commit 後だけ表示され、detail/comparison workflow を再利用する。 |
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
  → Codex Global Boundary Admission and Enable Foundation
  → Claude Global Boundary Admission
  → Copilot Global Boundary Admission
  → Tool-Specific Global Result Integration
  → Global Rescan and Recovery
  → Global Disable Barrier and Teardown
  → Documentation, Evidence, and Dependency Review
  → Cross-Cutting Verification
  → Release and Outcome Evidence
```

- 提供フェーズはチェックポイントレベルで厳密に順次実行する。後続の各フェーズが、先行する製品スライスを再利用して回帰テストするためである。
- 各フェーズではフィクスチャと失敗するテストを実装より先に行う。実装セクションがテストファイルを編集することはない。
- フェーズ 15 は configuration 読み取りを許可せずに純粋な Codex fallback 宣言インターフェースを定義する。フェーズ 23 は最小の `.codex/config.toml` carrier をアトミックに受け入れ、`codex.repo.config` と `codex.derived.fallback-basename` を登録し、Codex MCP 宣言と同時に有界 instruction fallback を有効化する。
- フェーズ 27 は、将来の settings、custom-agent、marketplace、plugin-manifest 所有者に対する Claude owner-gated MCP adapter を定義する。フェーズ 52、60、71、79 は、対応する所有者ファミリーが独立して受け入れられた後にだけ、それらの adapter を有効化する。フェーズ 32 は Copilot custom agent に同じ dormant-owner パターンを使い、フェーズ 54 で有効化する。
- フェーズ 57～58 は、すでに受け入れられた Codex configuration carrier を `settings/config` 認識と完全な詳細表示で拡張する。二つ目の候補、物理読み取り、fallback ルール、MCP 認識は追加しない。
- Marketplace の詳細を plugin-manifest インベントリより先に行い、検証済みのローカルソース宣言だけが 1 つの有界導出エッジのシードになれるようにする。
- フェーズ 61 は、以前の MCP フェーズでパス不一致のまま保持した Copilot VS Code settings の正確な除外を所有する。フェーズ 77 と 79 も同様に Codex と Claude の正確な plugin-file 除外を所有し、受け入れ済み候補を変えずに以前の MCP パス不一致コンテキストを更新する。
- すべての所有者ファミリーを Hook 認識より先に行う。内包 Hook 認識はすでに受け入れられた所有者を再利用する。一方、priority MCP 認識は、受け入れ済み carrier または、所有者が存在するまで読み取りも認識の公開もできない dormant な owner-gated adapter を介して先に提供する。
- フェーズ 96 は selector-free の all-eligible consent、bounded per-tool control、capacity、Codex provisional admission を確立する。フェーズ 97〜98 は独立した Claude/Copilot admission を追加し、フェーズ 99 は tool job ごとの atomic complete/partial commit だけを通じて 0〜3 個の別々の one-root Source を公開する。
- Repository のインベントリ、詳細、比較の受け入れが US1、US2、US3 を完成させる。Global 無効化バリアと解体は、US4 が完成する最初のフェーズである。

## 並行実行の機会

- 依存関係のベースラインと実行可能なコマンドを凍結した後、セットアップ設定ファイルを並行して進められる。
- 最小限の安全な基盤では、共有 DTO/limit/diagnostic テスト、host-security テスト、package-policy テスト、filesystem-fixture の準備は異なるファイルを使用し、マークされた箇所で並行して進められる。
- ベンダー Inventory フェーズ内では、そのフェーズのフィクスチャと適合行が完成した後、かつ正確なファイルセットが重複しない場合に限り、matcher、recognizer、integration、API、browser の各テストを並行して進められる。
- ベンダー Detail フェーズ内では、metadata、relationship、zero-activation、API、browser の各テストは通常別ファイルを使用し、マークされた箇所で並行して進められる。同じ parser ファイルに対する作業は順次実行のままとする。
- ベンダーフェーズ自体は、実装ファイルが異なる場合でもチェックポイント単位で順次実行する。次の各目に見えるチェックポイントが、先行するベンダースライスを回帰テストする必要があるためである。
- Marketplace ベンダーは、自身の Detail フェーズと並行して plugin 候補を導出できない。plugin 導出は、ローカルソース抽出が通過した後にだけ開始する。
- Codex、Claude、Copilot の plugin recognizer 作業は別々のフェーズで行う。統合 Plugin Manifests インベントリが、最初のツール横断で一度だけ読み取る組み立てを実行する。
- Hook parser/recognizer の作業は、正確なファイルが異なる場合に限りフェーズ内で並行できる。共有の `src/inspection/scan.ts`、UI、locale、registry ファイルは、同じフェーズ内の別タスクに対して並行とマークしない。
- MCP の CLI、VS Code、内包所有者、Cloud の事実の各フェーズは別々のテストを使用するが、共有の Copilot recognizer、JSON parser、scan、UI の作業はフェーズ順に実行する。
- `[P]` とマークされた Repository 受け入れテストは、全サポート対象フィクスチャと最終レジストリグラフが固定された後に並行して進められる。
- Global vendor boundary test は分離された fixture root を使用するが、フェーズ 96〜98 は 1 つの共有 consent/operation contract と独立した per-tool control を追加するため、checkpoint としては順次実行する。provisional work はフェーズ 99 の commit integration が存在する前には Source を決して公開しない。
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

### 優先ウェーブ 1 — Skills、Instructions、MCP

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
2. Marketplace Detail は、対象を読み取らずに有界なローカルソース宣言を検証して保持する。
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
3. selector-free consent を有効化し、eligible な全 confirmed tool を導出し、provisional Source を公開せずに独立した Codex/Claude/Copilot の one-root control を検証する。
4. 独自の complete/partial job を通じて、別々の tool-specific Source を 0〜3 個 atomic に公開し、Repository と sibling Source を保持して root を決して merge しない。
5. Global の再スキャン/回復と、優先ゼロ I/O 無効化バリアを追加する。
6. Documentation/evidence/dependency reviewを完了し、その完成artifactに対してcross-cutting suiteを実行する。
7. SC-001～SC-009のdenominator、threshold、pass/fail、Node.js engines contract全体とexact lower-bound/browser certification sample、residual riskを記録する。
8. 原則ごとの明示的なrelease Constitution Checkを記録し、対応するpull request review checkを必須とする。

## 注記

- 有効な検査対象ソースを列挙または読み取れるのは `src/inspection/safe-fs.ts` だけである。呼び出し元のパス、関係の対象、ベンダーロケーター、戦略、エビデンスレコードが読み取り権限を与えることはない。
- すべての候補フェーズでは、最初に候補の `lstat`、次に `realpath` の包含、最後に変更されていないことを確認する `lstat` の再実行を行う。該当するフェーズではさらに、ルート、利用可能な各祖先、同一ハンドルの同一性を比較する。
- 検出されたすべての変更、または利用不能/曖昧と報告された必須チェックでは、すべてのバイトを破棄し、読み取り可能な結果を公開しない。ルート/共有祖先の検証不能はソース試行を拒否し、候補の検証不能はその項目を拒否する。
- Effective `O_NOFOLLOW`はNode.jsが公開/enforceする場合のmandatory final-component defense in depthとする。Active source-root/ancestor replacement、effective `O_NOFOLLOW`を利用できないfinal-component replacement、`platform-unobservable` caseに対するkernel-enforced containmentをtestが主張してはならず、全detectable changeはscope内でfail closedにする。
- FR-038はproject-authored executable application codeと公開/install済みproduction closure内のexecutable codeに適用する。Project-authored build/test codeもrepositoryの設計選択としてJavaScript/TypeScriptを使用するが、third-party development/test toolingはFR-038の対象外として別にpin/auditする。Rust、Cargo、Node-API/native addon、prebuilt binary、lifecycle compilation、lifecycle/runtime artifact downloadはFR-038が定義するproduct boundaryから引き続き禁止する。
- ベンダーの振る舞い、Inspector matcher、runtime composition、公式エビデンスは別々に所有する。読み取りを許可できるのは、静的および有界導出の Inspector ルールだけである。
- 非読み取りの `excluded` ルール ID は、`shared.excluded.symlink-target`、`shared.excluded.managed-remote-state`、`copilot.excluded.additional-standard-locations`、`copilot.excluded.extra-directories`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp`、`copilot.excluded.cli-extensions`、`codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`codex.excluded.user-runtime`、`claude.excluded.user-runtime`、`copilot.excluded.user-runtime` だけである。その他の拒否はすべて、パス不一致テストまたは relationship-only の条件である。
- 関係は記述的、直接的、有界、非追跡とする。関係の対象は、それ自身が独立した静的または有界導出の受け入れを受けた場合にだけ読み取り可能になる。
- 1 つの物理ファイルは世代ごとに 1 回だけ読み取られ、複数ツールの認識と複数の有界な来歴を保持できる。
- `agents/openai.yaml` は個別の物理候補および `skill metadata` 認識である。シード `SKILL.md` の同一性へ統合してはならない。
- フェーズ 23 は、設定済み instruction fallback と Codex MCP に必要な最小 carrier として `.codex/config.toml` を一度だけ受け入れる。フェーズ 57～58 は `settings/config` 認識と完全な configuration 詳細を追加するときに、同じ物理 ID と世代読み取りを再利用し、二つ目の configuration 候補を決して作成しない。
- Claude の独立 hook、Codex の独立 MCP、hosted/organization/managed/remote 入力、Claude workflows と agent memory、Codex Repository prompts と plugin components、Copilot LSP/extensions/一般の `.vscode/settings.json`、追加の設定済みルートには、List フェーズも読み取り権限も与えない。
- 内包 Hook と MCP の認識は、すでに受け入れられた所有物理ファイルを再利用する。dormant MCP adapter は、独立して許可された所有者が受け入れられる前には、何も列挙、読み取り、公開できない。有効化では、新しい候補または読み取りなしで、その所有者へ認識を追加する。宣言、plugin コンポーネントパス、Cloud の事実、runtime 参照が合成ローカルファイルを作成することはない。
- Marketplace と plugin manifest は別の kind である。検証済みのローカル marketplace ソースだけが、1 つの有界 plugin-manifest 導出エッジをシードでき、component は再帰しない。
- Global inspection は 1 つの consent/control record と、別々に識別される 0〜3 個の Source を持ち、supported tool ごとに最大 1 つ、Source ごとに正確に 1 root とする。provisional validation/scan work は Source ではない。complete/partial commit に成功すると、applicable tool Source だけを publish/replace し、Repository と sibling Source を session-wide generation へ持ち越す。Source ID は process lifetime にわたり安定し、generation-owned graph ID は rekey する。
- 完全に decode された authored source、正確な metadata literal、authored relationship target は active session で利用可能なままにし、sensitive-content acknowledgement 後の明示的な detail request にのみ返す。credential と environment-reference syntax は変更せず表示し、参照される process-environment value は決して読み取りも置換もせず、diagnostics/log は source value を複製しない。
- Credential detection、masking、redaction、reveal control は存在しない。`POST /api/v1/files/{fileId}/reveals` は unknown route のまま `404` を返し、localized sensitive-content notice は source/comparison を開く前と liveness purge 後に再度必要とする。
- 通常の起動、スキャン、ビルド、テストは公式ドキュメントに関してオフラインである。ネットワークへアクセスできるのは、明示的なメンテナー向けソース確認コマンドだけである。
- 人が作成するリポジトリドキュメントの変更では、英語の正本ファイルと日本語の対応ファイルを必ず同時に更新する。
- 自動テストの成功はエビデンスであり、網羅的な証明ではない。フェーズ 104 では、完全な文脈での diff、package、participant、accessibility、measurable-outcome、residual-risk のレビューを必要とする。
