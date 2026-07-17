# タスク: エージェントカスタマイズの調査

[English](tasks.md)

**入力**: `/specs/001-inspect-agent-customizations/` の設計文書

**前提条件**: `plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/`、`quickstart.md`

**テスト**: すべての振る舞いの変更について、実装前にリスクに応じた自動テストが必要です。テストはユニット、契約、統合、パッケージ、セキュリティ、性能、ブラウザー、境界、アクセシビリティ、回帰の振る舞いを網羅します。

**構成**: タスクは、一つのユーザーストーリー全体を水平に完了するのではなく、目に見えるデリバリー単位と、明示的な三つの Repository 優先ウェーブに従います。起動可能な画面の後は、Skills → Instructions → MCP、次に Rules → Commands → Prompts → Custom Agents、最後に Settings/Configuration → Output Styles → Marketplaces → Plugin Manifests → Hooks の順です。ストーリーラベルは正規のトレーサビリティを維持し、`[US1]` は発見、`[US2]` は安全な詳細、`[US3]` は比較、`[US4]` は Global 調査を表します。所有者に依存する MCP 統合は、MCP ウェーブで dormant な所有者非依存契約として実装し、対応する後段の所有者ファミリーが受け入れられた時点で表示可能にします。各フェーズには引き続き、独立してテスト可能なチェックポイントが一つあります。

## 形式: `[ID] [P?] [Story?] Description`

- **[P]**: 明記された前提条件の完了後、異なるファイルを使用し、別の未完了タスクへ依存しないため並列実行できます。
- **[Story]**: フェーズ 3〜101 で必須です。Setup、Minimal Secure Foundation、フェーズ 102〜104 でのみ省略します。
- すべてのチェックリスト項目には、一つの主要成果と少なくとも一つの正確なファイルパスがあります。

---

## フェーズ 1: Setup

**目的**: 再現可能な Node.js 専用パッケージと開発エントリーポイントを確立します。

**独立テスト**: 固定された依存関係グラフをインストールし、設定されたすべてのローカルコマンドと CI エントリーポイントが、Rust、ネイティブコンパイラー、インストール時ビルド、アーティファクトのダウンロードを必要とせず解決できることを確認します。

**目に見えるチェックポイント**: コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。

- [ ] T001 対応する Node.js エンジン、`pnpm@11.13.0`、ランタイム依存関係、開発依存関係、凍結ロックファイルを再検証して `package.json` と `pnpm-lock.yaml` に固定する
- [ ] T002 `bin` を `agent-customization-inspector: bin.mjs` のみ、`files` を `bin.mjs`、`dist`、`README.md`、`README.ja.md`、`LICENSE` のみに定義し、`main`/`module`/`exports` を省略して、`package.json` でライフサイクルのビルド・ダウンロードフックを禁止する
- [ ] T003 フォーマット、lint、型チェック、ユニット、契約、統合、セキュリティ、パッケージ、性能、カバレッジ、文書、ブラウザーの各コマンドを `package.json` に追加する
- [ ] T004 検証済みの依存関係基準と実行可能なコマンドを `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/plan.md`、`specs/001-inspect-agent-customizations/plan.ja.md`、`specs/001-inspect-agent-customizations/quickstart.md`、`specs/001-inspect-agent-customizations/quickstart.ja.md` で同期する
- [ ] T005 [P] Nuxt SPA、静的 Nitro プリセット、ルート絶対アセット、無効化した CDN、明示的な imports と components を `nuxt.config.ts` で設定する
- [ ] T006 [P] アプリケーション、共有、ソース、スクリプト、テストに対する厳格な型チェックを `tsconfig.json` で設定する
- [ ] T007 [P] 生成出力を除外しながら TypeScript、Vue、Node.js、テストの lint を `eslint.config.js` で設定する
- [ ] T008 [P] ユニット、契約、統合、セキュリティ、パッケージ、性能、カバレッジの各プロジェクトを `vitest.config.ts` で設定する
- [ ] T009 [P] 決定論的なブラウザーおよびアクセシビリティプロジェクトを `playwright.config.ts` で設定する
- [ ] T010 [P] 名前付き Node ESM `cli` および `parser-worker` エントリー、固定 `.mjs` 出力、バンドルするプロジェクトモジュール、外部化する宣言済み依存関係、無効化したマップ・宣言、クリーンな `.build/server` ステージングを `tsdown.config.ts` で設定する
- [ ] T011 [P] 正確な shebang と一つの `dist/cli.mjs` import を持つ BOM なしの実行可能 Node.js shim を `bin.mjs` に作成する
- [ ] T012 [P] 依存関係と、生成された Nuxt、サーバー、配布、カバレッジ、Playwright、Node.js のビルド出力だけを `.gitignore` で無視する
- [ ] T013 フォーマット、lint、型チェック、ユニット、契約、統合、セキュリティ、パッケージ、性能、文書、カバレッジ、ブラウザーの独立したジョブを `.github/workflows/ci.yml` に追加する
- [ ] T014 一つのプラットフォーム非依存アーティファクトを利用する、対応 Node.js エンジンおよび Linux/macOS/Windows のプレースホルダーを `.github/workflows/ci.yml` に追加する

---

## フェーズ 2: Minimal Secure Foundation

**目的**: ブラウザーセッションや Repository 読み取りより前に存在しなければならない契約とセキュリティ境界だけを実装します。

**独立テスト**: 製品ワークフローを起動せず、境界付き DTO と診断、正確なパッケージマニフェスト、capability の分類、中央 Node.js ファイルシステム権限、generation 0 の状態を検証します。

**目に見えるチェックポイント**: セキュリティとパッケージの基盤が単独で合格し、中央権限の外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。

### テストと fixture

- [ ] T015 [P] 正確な上限、上限ちょうど、一つ超過、境界付きカウンターの失敗テストを `tests/unit/shared/limits.test.ts` に追加する
- [ ] T016 [P] 閉じた診断レジストリー、決定論的な集約、四つのオーバーフローセンチネル、secret-safe な引数の失敗テストを `tests/unit/shared/diagnostics.test.ts` に追加する
- [ ] T017 [P] 公開エンティティの形、不透明な generation-scoped ID、バージョン付き API envelope、厳格なリクエストガード、内部権限レコードの拒否に関する失敗テストを `tests/unit/shared/entities.test.ts` と `tests/unit/shared/api.test.ts` に追加する
- [ ] T018 link、junction、非通常エントリー、深いツリー、VCS 内部、注入された置換チェックポイント、実効的な `O_NOFOLLOW`、検証不能な確認、`platform-unobservable` の結果について、決定論的なクロスプラットフォーム fixture を `tests/fixtures/adversarial/build-filesystem-fixtures.ts` に作成する
- [ ] T019 I/O 前の字句的拒否、コンポーネント `lstat`、正規パス包含、bigint identity、境界付き `opendir`、セグメント検証、VCS 除外、検出可能なデバイス変更に関する root-context および列挙の失敗テストを `tests/unit/inspection/node-safe-fs.test.ts` に追加する
- [ ] T020 private generation binding、一度だけの使用、クライアントパスの拒否、および列挙時・pre-open・post-open/pre-read・post-read に root と利用可能なすべての ancestor を確認してから candidate `lstat` → `realpath` containment → repeated unchanged `lstat` を行う ticket/read の失敗テストを `tests/unit/inspection/node-safe-fs.test.ts` に追加する
- [ ] T021 same-handle identity、すべてのチェックポイントでの置換、バイトの破棄、実効的な `O_NOFOLLOW`、共有境界を検証できない場合の source-attempt rejection、candidate を検証できない場合の item rejection、証明にならないプラットフォームレコードに関する境界の失敗テストを `tests/integration/boundaries/node-safe-fs.test.ts` に追加する
- [ ] T022 中央権限の外にあるすべての調査対象ソースのファイルシステム読み取りを拒否する失敗アーキテクチャ契約を `tests/contract/inspection-io-boundary.test.ts` に追加する
- [ ] T023 [P] 256-bit 認証、constant-time 比較、Host/Origin/fetch-metadata 確認、CORS なし、厳格なメソッドとメディア、64-KiB body、no-store response、secret-safe error に関する capability の失敗テストを `tests/contract/host-security.test.ts` に追加する
- [ ] T024 [P] root confinement、正確な schema/order/limits/hashes、必須だが削除される `200.html`/`404.html`、唯一受け入れる HTML としての `index.html`、`<base>`・nonce・実行可能属性・外部/相対実行可能 URL・未記録 inline script・stale asset の拒否に関する cleanup および static-manifest の失敗テストを `tests/package/build-cleanup.test.ts` と `tests/package/static-manifest.test.ts` に追加する
- [ ] T025 [P] 正確な `.mjs` レコード、必須 CLI/Worker エントリー、再帰的に正確な二つのマニフェスト集合、Rust/Cargo/Node-API/native payload・prebuild・ライフサイクル/ランタイムダウンロードの拒否に関する server-manifest および package-policy の失敗テストを `tests/package/server-manifest.test.ts` と `tests/package/node-only-policy.test.ts` に追加する
- [ ] T026 [P] bootstrap generation 0、決定論的 ID、グラフ不変条件、atomic N+1 replacement、fatal retention、ID rekeying、境界付き lifecycle diagnostics に関する generation および session の失敗テストを `tests/unit/session/scan-generation.test.ts` と `tests/unit/session/session.test.ts` に追加する

### 実装

- [ ] T027 正確なリソース定数、境界付きカウンター、閉じた診断レジストリー、決定論的な集約、オーバーフローセンチネル、安全な引数を `shared/limits.ts`、`shared/diagnostics.ts`、`src/inspection/limits.ts` に実装する
- [ ] T028 公開 DTO、内部型の除外、不透明 ID ガード、バージョン付き envelope、厳格な手動リクエストガードを `shared/entities.ts` と `shared/api.ts` に実装する
- [ ] T029 字句コンポーネント検証、正規 root の取得、bigint identity、close-state enforcement を持つ private `InspectionRootContext` の作成を `src/inspection/safe-fs.ts` に実装する
- [ ] T030 境界付きで決定論的な `opendir` traversal、VCS 除外、root とすべての ancestor の確認、順序付けられた candidate validation、generation-bound `ScanEntryTicket` snapshot を `src/inspection/safe-fs.ts` に実装する
- [ ] T031 pre-open・post-open/pre-read・post-read に完全な順序で検証し、same-handle identity、実効的な `O_NOFOLLOW`、バイト破棄、非公開、`node-realpath-fstat-best-effort` receipt を伴う one-time ticket read を `src/inspection/safe-fs.ts` に実装する
- [ ] T032 推測せず、root/shared ancestor は source scope で、candidate は item scope で拒否する `safe-fs-boundary-unverifiable` 処理を `src/inspection/safe-fs.ts` に実装する
- [ ] T033 active-mutator と platform-unobservable の残余リスク、および将来の公開 Node.js API または OS 強制境界解決への道筋を `src/inspection/safe-fs.ts` に記載する
- [ ] T034 capability 生成、constant-time 認証、capability-safe なリクエスト分類を `src/host/capability.ts` に実装する
- [ ] T035 受け入れる HTML/URL ケースを強制し、必要な fallback だけを削除し、アセットを検証して決定論的な CSP hash を記録する root-confined static normalization を `scripts/clean-build-output.mjs` と `scripts/build-static-manifest.mjs` に実装する
- [ ] T036 Node.js 専用ポリシーを強制する決定論的な server-manifest 生成と再帰的 exact-set verification を `scripts/assemble-server-manifest.mjs` と `scripts/verify-package-files.mjs` に実装する
- [ ] T037 決定論的な generation 構築、atomic replacement、generation 0、fatal retention、境界付き lifecycle diagnostics を `src/session/scan-generation.ts` と `src/session/session.ts` に実装する
- [ ] T038 メソッド、メディア、body、request-key、no-store、safe-error handling を持つ厳格な router skeleton を `src/host/api-router.ts` に実装する
- [ ] T039 `platform-unobservable` のケースに対する証明を主張せず、中央ファイルシステム権限と Node.js 専用パッケージポリシーの suite を CI で実行するよう `.github/workflows/ci.yml` に追加する

---

## フェーズ 3: 起動可能な認可済み空画面

**目的**: Repository を読み取らずに、最初のユーザー向け製品単位を提供します。

**独立テスト**: パッケージをインストールし、fixture の `cwd` から起動して、出力された loopback URL を開き、一度だけの fragment から認証し、generation 0、アクセシブルな空の shell、調査対象ソースのファイルシステム読み取りがゼロであることを検証します。

**目に見えるチェックポイント**: 認可済みブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。

### テスト先行

- [ ] T040 [P] [US1] 固定マニフェストアセット、閉じた SPA fallback、正確な CSP、対応 Node エンジン、bind 前の両マニフェスト確認、loopback-only ephemeral binding、固定 startup failure に関する static-route および startup の失敗テストを `tests/contract/static-routes.test.ts` と `tests/contract/host-startup.test.ts` に追加する
- [ ] T041 [P] [US1] 一度だけの fragment capture、memory-only Bearer 使用、authorization-lost reload behavior、永続化ゼロ、未認可 API call ゼロに関する client の失敗テストを `tests/unit/app/api-capability.test.ts` に追加する
- [ ] T042 [P] [US1] 認可済み polling、generation-zero 表示、認可喪失、timer teardown に関する browser-state の失敗テストを `tests/unit/app/session-shell.test.ts` に追加する
- [ ] T043 [P] [US1] 正確な shebang/mode/package field、隔離インストール、loopback URL、browser-open fallback、直接 shell boot、正常終了、追加 mode の拒否、調査対象ソース読み取りゼロに関するパッケージ済み起動の失敗テストを `tests/package/npx-launch.test.ts` に追加する
- [ ] T044 [US1] 認可済み空 shell、authorization-lost shell、キーボードフォーカス、Repository picker や ancestor discovery がないことに関するブラウザー受け入れ失敗テストを `tests/e2e/boot.spec.ts` に追加する

### 実装

- [ ] T045 [US1] 固定マニフェストアセットの提供、閉じた SPA fallback、正確な MIME validation、正確な CSP serialization を `src/host/static-files.ts` に実装する
- [ ] T046 [US1] 対応エンジンとマニフェストの検証、loopback-only ephemeral binding、secret-safe な server lifecycle を `src/host/server.ts` に実装する
- [ ] T047 [US1] capability URL の出力、出力済み fallback を伴うブラウザーの自動起動、`--no-open`、追加 mode の拒否、起動時 `cwd` の取得、graceful shutdown を `src/cli.ts` に実装する
- [ ] T048 [US1] 一度だけの capability-fragment capture、memory-only authorization、guarded API request、authorization-loss cleanup を `app/composables/api.ts` に実装する
- [ ] T049 [US1] 認可済み generation-zero polling、timer teardown、アクセシブルな空 shell、意味的に同等な英語・日本語メッセージを `app/composables/session.ts`、`app/app.vue`、`app/locales/en.ts`、`app/locales/ja.ts`、`app/styles/main.css` に実装する

---

## フェーズ 4: Codex SKILL 一覧

**目的**: Codex skills を対象に、最初の安全な Repository inventory 単位を提供します。

**独立テスト**: root と入れ子の `.agents/skills/*/SKILL.md`、near miss、link、不正な名前、hard-link alias、無関係なファイルを含む fixture から起動し、allowlist 対象の Codex skill row だけが path、source、kind、tool とともに表示されることを検証します。

**目に見えるチェックポイント**: Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。

### fixture とテストを先行

- [ ] T050 [US1] positive、nested、near-miss、hard-link、malformed-name、linked、oversized、empty、secret-bearing、performance の各 Codex SKILL fixture を `tests/fixtures/repositories/build-fixtures.ts` に作成する
- [ ] T051 [US1] Codex skill の behavior、rule、strategy、evidence の conformance row を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T052 [P] [US1] 安定した reciprocal ID、matcher authority separation、evidence grammar、semantic fingerprint、Repository の `./` anchoring、`codex.repo.skill` の direct-child semantics に関する registry の失敗契約を `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する
- [ ] T053 [P] [US1] `./**/.agents/skills/*/SKILL.md`、descendant inventory、near miss、VCS 除外、conditional runtime-chain fact に関する Codex SKILL matcher の失敗テストを `tests/unit/inspection/rules.test.ts` に追加する
- [ ] T054 [P] [US1] tool、`skill` kind、path provenance、無関係な recognition がないことに関する Codex recognition の失敗テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T055 [P] [US1] 起動時 `cwd` の admission、ticket-only read、決定論的な順序、hard-link alias、境界付き作業、隔離された item failure、relationship-target read なしに関する scan の失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T056 [P] [US1] Codex SKILL discovery が child process、動的な評価/import、MCP connection、outbound request、URI load、調査対象ソースの mutation を一切発生させないことを証明する zero-activation test を `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T057 [P] [US1] 起動時 `cwd` の Repository source が正確に一つであること、`GET /api/v1/session`、`POST /api/v1/repository/rescan` に関し、progress、duplicate conflict、fatal retention、stale ID、whole-generation publication を含む失敗契約を `tests/contract/http-api-session.test.ts` に追加する
- [ ] T058 [P] [US1] Codex row、source/path/kind label、progress、empty state、rescan、retry、diagnostics に関する inventory の失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T059 [US1] Codex 専用 fixture を起動し、source content を含まない正確な SKILL 一覧が表示されることに関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-list.spec.ts` に追加する
- [ ] T060 [US1] reciprocal behavior、rule、evidence、affected-contract reference に関する Codex skill registry-graph coverage の失敗テストを `tests/contract/vendor-behaviors.test.ts` と `tests/contract/inspection-rules.test.ts` に追加する

### 実装

- [ ] T061 [US1] registry type、閉じた matcher grammar、reciprocal validation、derivation acyclicity、Repository の `./` enforcement、runtime loading を `src/inspection/rules/types.ts` と `src/inspection/rules/registry.ts` に実装する
- [ ] T062 [US1] skill-discovery strategy が参照する前に、読み取り権限を付与しない `codex.behavior.repo.skills` と `codex.behavior.user.skills` の lookup statement を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T063 [US1] 読み取りを認可する `codex.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T064 [US1] Codex skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T065 [US1] `codex.repo.skill` matching を `src/inspection/rules/codex.ts` に実装する
- [ ] T066 [US1] parsing や source exposure を行わず、path-derived Codex skill recognition を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T067 [US1] 境界付き Repository enumeration、ticket-only verification、決定論的な candidate order、hard-link alias aggregation、diagnostic-only failure を `src/inspection/scan.ts` に実装する
- [ ] T068 [US1] automatic first scan、FIFO explicit rescan、dequeue-time generation selection、duplicate rejection、atomic publication、fatal retention、ID invalidation を `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T069 [US1] 不透明 ID、progress、conflict、stale-resource handling、安全な diagnostics を持つ決定論的な Codex skill summary と Repository rescan response を `src/host/api-router.ts` に実装する
- [ ] T070 [US1] generation-aware な source/tool/kind/path filter と rescan state を `app/composables/filters.ts` と `app/composables/session.ts` に実装する
- [ ] T071 [US1] アクセシブルな Repository header、progress、rescan/retry control、filter、Codex SKILL 一覧、item summary を `app/pages/index.vue`、`app/components/inventory/InventoryFilters.vue`、`app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue` に実装する
- [ ] T072 [US1] actionable diagnostics と Codex scope の empty state を `app/components/diagnostics/DiagnosticList.vue` に実装する
- [ ] T073 [US1] 意味的に同等な英語・日本語の Codex inventory、progress、empty-state、retry、boundary message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 5: Codex SKILL 詳細

**目的**: Codex の `SKILL.md` ファイルを、マスク済みの inert source と境界付き typed metadata として安全に調査できるようにし、別個の物理 candidate である `agents/openai.yaml` はまだ admission しません。

**独立テスト**: hostile、malformed、secret-bearing、changing、metadata-bearing な Codex `SKILL.md` ファイルを開き、マスク済み source、境界付き frontmatter、一つの値だけの reveal、activation なし、relationship expansion なし、close または rescan 時の cleanup を検証します。

**目に見えるチェックポイント**: Codex SKILL を選択すると、完全で安全な詳細画面が開きます。

### fixture とテストを先行

- [ ] T074 [US2] Codex SKILL の frontmatter、reference、script、command、埋め込み markup、credential に対応する、生成済み hostile fixture と維持対象 secret fixture を `tests/fixtures/adversarial/build-fixtures.ts` と `tests/fixtures/secrets/build-fixtures.ts` で拡張する
- [ ] T075 [P] [US2] strict UTF-8/BOM、inert Markdown/frontmatter、YAML core-schema、alias なし、custom tag なし、depth-64、50,000-node、64-KiB-scalar、512-entry の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T076 [P] [US2] 最大二つの Worker、固定 package URL、64/16/4-MiB V8 limit、2 秒 timeout、timeout/crash/resource-exit 時の置換に関する Worker-pool の失敗テストを `tests/unit/inspection/seed-parsers.test.ts` に追加する
- [ ] T077 [P] [US2] 維持対象 credential shape、secret-bearing key、決定論的な overlap、4,096-match と 2-MiB output limit、fail-closed overflow、再帰的 metadata masking、安全な log に関する masking の失敗テストを `tests/unit/inspection/masking.test.ts` に追加する
- [ ] T078 [P] [US2] 境界付き frontmatter、provenance、conditional discovery、skill resource、evidence に関する Codex metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T079 [P] [US2] inferred effective aggregate を作らず、authored、available、selected、omitted、shadowed、disabled、conditional、unknown を投影する applicability の失敗テストを `tests/unit/inspection/applicability.test.ts` に追加する
- [ ] T080 [P] [US2] runtime-chain condition、same-name handling、unknown selection fact に関する Codex skill-composition の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T081 [P] [US2] masked inert DTO、strict/stale ID、no-store behavior、`masking-overflow`、safe diagnostics、bounded metadata に関する file-detail の失敗契約を `tests/contract/http-api-files.test.ts` に追加する
- [ ] T082 [P] [US2] one-mask response、ownership、unknown mask、stale ID、no-store behavior、retained client error state がゼロであることに関する reveal の失敗契約を `tests/contract/http-api-reveals.test.ts` に追加する
- [ ] T083 [P] [US2] same-origin Monaco、masked read-only model、正確な read-only option、accessibility、disposal に関する direct-detail の失敗テストを `tests/package/monaco-assets.test.ts` と `tests/unit/app/source-viewer.test.ts` に追加する
- [ ] T084 [P] [US2] inventory、detail、comparison、error、empty state の全体で、masking が非網羅的であることを閉じられず常時表示する warning に関する FR-027 app-shell の失敗テストを `tests/unit/app/masking-warning.test.ts` に追加する
- [ ] T085 [US2] parsing、metadata extraction、relationship、detail loading、reveal handling 全体へ zero-activation test を `tests/integration/security/zero-activation.test.ts` で拡張する
- [ ] T086 [US2] masked Codex detail、metadata、diagnostics、一つの値だけの reveal、keyboard use、route cleanup、rescan cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/codex-skills-detail.spec.ts` に追加する

### 実装

- [ ] T087 [P] [US2] 境界付きで inert な Markdown/frontmatter extraction を `src/inspection/parsers/markdown.ts` に実装する
- [ ] T088 [P] [US2] alias と custom tag を無効にした境界付き YAML core-schema extraction を `src/inspection/parsers/yaml.ts` に実装する
- [ ] T089 [US2] 最大二つの parser Worker pool、固定 package URL、64/16/4-MiB limit、2 秒での kill/replace、固定 secret-safe failure を `src/inspection/parsers/pool.ts` と `src/inspection/parsers/worker.ts` に実装する
- [ ] T090 [US2] 境界付き linear secret detector、決定論的 placeholder、再帰的 metadata masking、raw isolation、whole-file `masking-overflow` を `src/inspection/masking/detectors.ts` と `src/inspection/masking/mask.ts` に実装する
- [ ] T091 [US2] 閉じた condition registry、境界付き source/assessment fact、決定論的な precedence projection を `src/inspection/applicability/conditions.ts`、`src/inspection/applicability/context.ts`、`src/inspection/applicability/precedence.ts` に実装する
- [ ] T092 [US2] Codex skill discovery と selection strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T093 [US2] 参照される script、asset、任意 path を昇格させない relationship-only の skill-resource policy を `src/inspection/rules/codex.ts` に実装する
- [ ] T094 [US2] 境界付き metadata、provenance-scoped relationship、conditional applicability、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T095 [US2] verified read、strict decode、complete-file masking、recognition ごとの atomic parsing、one-edge derivation、即時 raw-byte disposal を `src/inspection/scan.ts` に統合する
- [ ] T096 [US2] generation-owned raw mask value、strict ownership、one-value reveal lookup、persistence/logging ゼロ、file または generation removal 時の cleanup を `src/session/session.ts` に実装する
- [ ] T097 [US2] strict opaque ID、masked DTO、bounded metadata、no-store behavior、diagnostics、stale response を持つ `GET /api/v1/files/{fileId}` を `src/host/api-router.ts` に実装する
- [ ] T098 [US2] strict ownership、one-value response、no-store behavior、secret-safe error を持つ `POST /api/v1/files/{fileId}/reveals` を `src/host/api-router.ts` に実装する
- [ ] T099 [P] [US2] lazy same-origin Monaco、不透明な read-only model、正確な accessibility option、完全な editor/model/subscription disposal を `app/composables/monaco.ts` と `app/components/inspection/SourceViewer.vue` に実装する
- [ ] T100 [US2] すべての認可済み route で表示される app-shell component として、FR-027 の閉じられない非網羅的 masking warning を `app/components/diagnostics/MaskingWarning.vue` と `app/app.vue` に実装する
- [ ] T101 [P] [US2] typed recognition、provenance、applicability、relationship、diagnostic の表示を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` に実装する
- [ ] T102 [US2] generation-aware file-detail route、一つの値だけの reveal control、focus handling、cleanup を `app/pages/files/[id].vue` と `app/components/inspection/MaskRevealControl.vue` に実装する
- [ ] T103 [US2] 意味的に同等な英語・日本語の Codex detail、reveal、parser、uncertainty、常時表示する非網羅的 masking warning message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

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

**目的**: admission された各 `agents/openai.yaml` candidate に、マスク済み source と境界付き typed detail を追加します。

**独立テスト**: valid、malformed、secret-bearing、changing、oversized な metadata candidate を開き、境界付き YAML extraction、seed provenance、再帰的 masking、stale handling、一つの値だけの reveal、activation ゼロ、file または generation removal 時の cleanup を検証します。

**目に見えるチェックポイント**: `agents/openai.yaml` を選択すると、所有元の SKILL detail とは別の安全な詳細画面が開きます。

### テスト先行

- [ ] T116 [P] [US2] allowlist 対象 UI field、seed provenance、unknown field、malformed YAML、resource limit、正確な evidence に関する Codex skill-metadata の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T117 [P] [US2] `skill metadata` kind に対する file-detail、reveal、masking-overflow、stale-ID、zero-retention の失敗契約を `tests/contract/http-api-files.test.ts` と `tests/contract/http-api-reveals.test.ts` に追加する
- [ ] T118 [P] [US2] metadata の command、asset、resource、script、URI、任意 path に対する zero-activation と relationship を追跡しないことの失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T119 [US2] マスク済み skill-metadata detail、seed provenance、diagnostics、reveal cleanup、keyboard use、rescan cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-skill-metadata-detail.spec.ts` に追加する

### 実装

- [ ] T120 [US2] 境界付き `agents/openai.yaml` field、再帰的 masking、seed applicability、relationship、diagnostics、evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T121 [US2] skill metadata に対する atomic YAML extraction、relationship-only target、raw-byte disposal、generation-owned mask cleanup を `src/inspection/scan.ts` と `src/session/session.ts` に統合する
- [ ] T122 [US2] skill-metadata field と seed provenance に対する typed detail presentation を `app/components/inspection/RecognitionDetails.vue` と `app/components/inspection/RelationshipList.vue` において拡張する
- [ ] T123 [US2] 意味的に同等な英語・日本語の skill-metadata detail、masking、relationship、uncertainty message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

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

- [ ] T131 [US1] skill-selection strategy が参照する前に、読み取り権限を付与しない `claude.behavior.repo.skills` と `claude.behavior.user.skills` の lookup statement を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T132 [US1] 読み取りを認可する `claude.repo.skill` record を `shared/registries/inspection-rules.ts` に追加する
- [ ] T133 [US1] 単一の読み取りを行わない `shared.excluded.symlink-target` rule を、affected-behavior reference が `codex.behavior.repo.skills` と `claude.behavior.repo.skills` だけになるよう `shared/registries/inspection-rules.ts` に追加する
- [ ] T134 [US1] Claude skill evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T135 [US1] `claude.repo.skill` matching を `src/inspection/rules/claude.ts` に実装する
- [ ] T136 [US1] path-derived Claude skill recognition を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T137 [US1] 決定論的な Codex result を維持しながら Claude skill classification を `src/inspection/scan.ts` に統合する
- [ ] T138 [US1] Claude に対する filter、badge、意味的に同等な英語・日本語の一覧 message を `app/composables/filters.ts`、`app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 9: Claude SKILL 詳細

**目的**: generic detail foundation を使用し、完全で安全な Claude skill detail を追加します。

**独立テスト**: metadata、contained declaration、reference、vendor が対応する symlink、malformed frontmatter、secret を持つ Claude skill を開き、境界付きのマスク済み detail、exact-launch の skills-directory-plugin applicability fact、明示的な `shared.excluded.symlink-target` diagnostics、manifest read authority なし、target read なし、変更されない Codex detail を検証します。

**目に見えるチェックポイント**: Claude SKILL detail が完成し、Codex detail と一貫します。

### テスト先行

- [ ] T139 [US2] `claude.behavior.repo.skills-directory-plugin` を、exact-launch で読み取り権限を付与しない applicability/activation fact とし、その strategy および evidence conformance row とともに `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T140 [P] [US2] frontmatter、ancestor/lazy discovery uncertainty、contained declaration、relationship、正確な evidence、および manifest authority ではなく accepted SKILL candidate 上の exact-launch applicability/activation fact としての `claude.behavior.repo.skills-directory-plugin` に関する Claude metadata の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T141 [P] [US2] provenance-relative target、boundary status、one-level depth、1,000-edge retention、relationship read authority ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T142 [P] [US2] vendor が対応する Claude skill symlink が、明示的な `shared.excluded.symlink-target` parity diagnostic を伴い Inspector policy では引き続き拒否されることを証明する回帰失敗テストを `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T143 [P] [US2] manifest loading や未知の runtime selection を主張せず、Claude skill selection、exact-launch の skills-directory-plugin applicability、workspace-trust condition、condition reason に関する runtime-composition の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T144 [US2] マスク済み Claude detail、uncertainty、relationship、diagnostics、reveal cleanup、継続する Codex behavior に関するブラウザー受け入れ失敗テストを `tests/e2e/claude-skills-detail.spec.ts` に追加する

### 実装

- [ ] T145 [US2] `claude.behavior.repo.skills-directory-plugin` を、accepted exact-launch SKILL candidate だけに付与される、読み取り権限を付与しない behavior fact として `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T146 [US2] manifest read authority を与えずに exact-launch の skills-directory-plugin applicability と workspace-trust fact を含む、Claude skill composition strategy と condition mapping を `shared/registries/runtime-composition.ts` に追加する
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

- [ ] T159 [US1] selection および managed/remote-exclusion strategy が参照する前に、surface-specific Copilot skill lookup statement と、読み取り権限を付与しない `copilot.behavior.vscode.user.skills`、`copilot.behavior.cli.user.skills`、origin fileを持たない `copilot.behavior.cloud.remote-skills` を `shared/registries/vendor-behaviors.ts` に追加する
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

**目的**: 互換性のない surface fact を維持しながら、完全で安全な Copilot skill detail を追加します。

**独立テスト**: 三つのすべての directory と共有物理 file から Copilot skill を開き、境界付き metadata、分離された surface applicability、progressive-loading uncertainty、winner の主張なし、マスク済み source、変更されない Codex/Claude detail を検証します。

**目に見えるチェックポイント**: Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。

### テスト先行

- [ ] T168 [P] [US2] frontmatter、progressive loading、duplicate-name uncertainty、除外された custom directory、正確な evidence に関する Copilot metadata の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T169 [P] [US2] 互換性のない behavior をまとめず、VS Code、CLI、Cloud の selection fact に関する composition の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T170 [P] [US2] surface-specific recognition と condition fact が分離されたままであることを証明する typed-detail の失敗テストを `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T171 [US2] Codex と Claude の behavior を維持しながら、Copilot-only および shared-recognition detail に関するブラウザー受け入れ失敗テストを `tests/e2e/copilot-skills-detail.spec.ts` に追加する

### 実装

- [ ] T172 [US2] surface-qualified Copilot skill strategy と condition mapping を `shared/registries/runtime-composition.ts` に追加する
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
- [ ] T181 [P] [US1] 統合 SKILL row に対する source、tool、kind、path filter の client 失敗テストを `tests/unit/app/inventory.test.ts` に追加する
- [ ] T182 [P] [US1] whole-generation replacement、stale detail ID、reveal clearing、filter retention、selection cleanup、profile/cache/repository persistence ゼロに関する rescan の失敗テストを `tests/unit/session/session.test.ts` と `tests/unit/app/session-shell.test.ts` に追加する
- [ ] T183 [P] [US1] 1 秒以内の status、10 秒以内の 100,000-entry/500-file scan、100 ms 未満の filtering/selection に関する recorded-reference performance test を `tests/performance/repository-scan.test.ts` と `tests/performance/inventory-interactions.test.ts` に追加する
- [ ] T184 [US1] 統合 filter、multi-recognition、provenance、keyboard use、既存の非網羅的 masking warning が引き続き表示されることに関するブラウザー回帰を `tests/e2e/skills-inventory.spec.ts` に追加する

### 実装

- [ ] T185 [US1] skill に対する決定論的な physical-file、alias、recognition、provenance aggregation を `src/inspection/scan.ts` で完成させる
- [ ] T186 [US1] generation-aware skill filtering、selection、rescan replacement、stale cleanup を `app/composables/filters.ts` と `app/composables/session.ts` で完成させる
- [ ] T187 [US1] アクセシブルな source/tool/kind/path filter を `app/components/inventory/InventoryFilters.vue` で完成させる
- [ ] T188 [US1] 統合 skill row、recognition badge、provenance summary、empty state、progress control を `app/components/inventory/InventoryList.vue`、`app/components/inventory/InventoryItem.vue`、`app/pages/index.vue` で完成させる
- [ ] T189 [US1] 境界付き diagnostics を維持し、統合 inventory の loading、empty、retry、replacement state 全体で既存の app-shell masking warning を mount したままにする処理を `app/components/diagnostics/DiagnosticList.vue` と `app/components/diagnostics/MaskingWarning.vue` に実装する
- [ ] T190 [US1] 意味的に同等な英語・日本語の unified-inventory および multi-recognition message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 13: SKILL 比較

**目的**: 他の customization family より先に、skill を使用して generic なマスク済み comparison path を提供します。

**独立テスト**: current-generation で読み取り可能な skill を正確に二つ選択し、literal masked diff、typed recognition row、raw secret exposure なし、20,000-line/5-second fallback、stale cleanup、same-origin Worker 使用、keyboard/screen-reader access を検証します。

**目に見えるチェックポイント**: 読み取り可能な任意の二つの SKILL file を安全に比較できます。

### テスト先行

- [ ] T191 [P] [US3] exactly-two selection、readable/current-generation guard、detail loading、stale rejection、replacement または removal 後の cleanup に関する失敗テストを `tests/unit/app/comparison.test.ts` に追加する
- [ ] T192 [P] [US3] ranking や winner の主張を行わず、field-aware recognition、provenance、applicability、relationship、order comparison に関する失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T193 [P] [US3] 二つの masked model、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`、same-origin Worker 使用、20,000-line/5-second fallback、disposal に関する direct-comparison-route の失敗テストを `tests/unit/app/source-diff.test.ts` と `tests/package/monaco-assets.test.ts` に追加する
- [ ] T194 [US3] マスク済み literal skill diff、typed recognition difference、secret の不在、responsive layout、keyboard access、fallback diagnostics、cleanup に関するブラウザー受け入れ失敗テストを `tests/e2e/skills-comparison.spec.ts` に追加する

### 実装

- [ ] T195 [US3] exactly-two generation-scoped selection、readable-file guard、compare API を使わない二つの既存 detail load、replacement または removal 後の teardown を `app/composables/comparison.ts` に実装する
- [ ] T196 [US3] 二つの masked Monaco model、不透明 URI、same-origin Worker、subscription の決定論的な作成と disposal を `app/composables/monaco.ts` に実装する
- [ ] T197 [US3] 正確に label 付けされた read-only/no-link/no-revert diff option、verbose accessibility、完全な side-by-side fallback を `app/components/comparison/SourceDiff.vue` に実装する
- [ ] T198 [US3] inferred winner を作らず、field-identity-aware recognition、provenance、applicability、relationship、order row を `app/components/comparison/RecognitionComparison.vue` に実装する
- [ ] T199 [US3] edit、merge、lint、validation、fix action を含まない、アクセシブルな generation-scoped comparison-selection control を `app/components/inventory/InventoryItem.vue` に追加する
- [ ] T200 [US3] direct-route loading、stale recovery、responsive layout、accessible navigation、意味的に同等な英語・日本語 message を `app/pages/compare.vue`、`app/locales/en.ts`、`app/locales/ja.ts` に実装する

---

## フェーズ 14: SKILL metadata 比較

**目的**: generic なマスク済み comparison path を、別個の Codex `skill metadata` kind へ拡張します。

**独立テスト**: current-generation で読み取り可能な `agents/openai.yaml` file を正確に二つ比較し、マスク済み literal source、整列した metadata field、seed provenance、relationship、fallback behavior、stale invalidation、完全な model/subscription cleanup を検証します。

**目に見えるチェックポイント**: secret を露出せず、seed skill と混同することなく、二つの Codex skill-metadata file を比較できます。

### テスト先行

- [ ] T201 [P] [US3] skill-metadata field、seed provenance、applicability、relationship、missing value に関する typed-comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T202 [US3] literal skill-metadata diff、typed provenance difference、masking、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/skill-metadata-comparison.spec.ts` に追加する

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

- [ ] T210 [US1] instruction layering または dormant fallback derivation が参照する前に、Codex instruction lookup statement と、読み取り権限を付与しない `codex.behavior.user.instructions`、`codex.behavior.repo.config`、`codex.behavior.user.config` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T211 [US1] Codex の静的 instruction record だけを追加し、`codex.repo.config` と `codex.derived.fallback-basename` はフェーズ 23 でアトミックに受け入れるまで未登録のままにし、adjacent exclusion ID を `shared/registries/inspection-rules.ts` に追加しない
- [ ] T212 [US1] Codex instruction evidence に加え、このフェーズで所有する読み取り権限を付与しない Repository/User config carrier fact の reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T213 [US1] フェーズ 23 が seed と derived rule の両方を登録するまでは scan candidate を生成できない、静的な Codex instruction matching、純粋な fallback 宣言 validator、one-edge derivation helper を `src/inspection/rules/codex.ts` と `src/inspection/recognizers/codex.ts` に実装する
- [ ] T214 [US1] Codex instruction、activation 後の fallback provenance、pre-carrier pending 状態に対する inventory filter と row を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` において拡張する
- [ ] T215 [US1] 意味的に同等な英語・日本語の Codex instruction inventory、fallback、exclusion message を `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 16: Codex Instructions 詳細

**目的**: マスク済み Codex instruction source と typed layering を追加し、configured-fallback の投影はフェーズ 23 で導入する最小 config carrier の存在を条件とします。

**独立テスト**: 静的な Codex instruction fixture を開き、override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、instruction-byte budget、relationship-only の import、stale-ID behavior、diagnostics、reveal cleanup を検証します。別途、config path を読み取らず、メモリ内 carrier から fallback detail を投影できることを検証します。

**目に見えるチェックポイント**: 静的な Codex instruction を選択すると、明示的な order、byte budget、condition、および carrier 受け入れ前であることを正直に示す fallback 状態を備えた安全な detail が開きます。

### テスト先行

- [ ] T216 [P] [US2] override-first selection、broad-to-narrow conditional order、未知の runtime `cwd`、instruction-byte budget、16 fallback basename に関する Codex の失敗テストを `tests/unit/inspection/codex-composition.test.ts` に追加する
- [ ] T217 [P] [US2] masked target、lexical normalization、cycle、boundary status、one-level relationship、target read authority ゼロに関する import/reference の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T218 [P] [US2] typed Codex instruction metadata、condition、fallback、relationship、diagnostics、stale ID に関する detail/API の失敗テストを `tests/contract/http-api-files.test.ts` と `tests/unit/app/recognition-details.test.ts` に追加する
- [ ] T219 [US2] reciprocal contract reference を持つ Codex instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T220 [US2] マスク済みの静的 Codex instruction detail、byte budget、condition、pre-carrier fallback 状態、relationship、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T221 [US2] Codex instruction layering に加え、将来の fallback seed が必要とする carrier-only の `codex.config.precedence` strategy、fallback、byte-budget、applicability、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T222 [US2] Codex instruction composition、fallback projection、byte-budget fact、provenance-relative relationship extraction を `src/inspection/applicability/precedence.ts` と `src/inspection/parsers/markdown.ts` に実装する
- [ ] T223 [US2] Codex instruction masking、atomic parsing、relationship-only reference、raw disposal、および後から受け入れられた carrier が有界 candidate をすでに生成している場合に限る fallback provenance の投影を `src/inspection/scan.ts` に統合する
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

- [ ] T231 [US1] instruction layering と import relationship が参照する前に、Claude instruction lookup statement と、読み取り権限を付与しない `claude.behavior.user.instructions` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T232 [US1] Claude instruction candidate record だけを追加し、exclusion ID を定義せずに未対応 location を path-negative のままにする処理を `shared/registries/inspection-rules.ts` に実装する
- [ ] T233 [US1] Claude instruction evidence record と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T234 [US1] 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction matching と recognition を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T235 [US1] import を読み取らず、Codex result も変更せずに Claude instruction classification を `src/inspection/scan.ts` に統合する
- [ ] T236 [US1] Claude instruction の inventory row と、意味的に同等な英語・日本語の instruction、layer、exclusion message を `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` において拡張する

---

## フェーズ 18: Claude Instructions 詳細

**目的**: 正確な layer ordering と inert import relationship を持つ、マスク済み Claude instruction detail を追加します。

**独立テスト**: hostile および malformed な Claude instruction を開き、launch/ancestor/descendant distinction、regular-before-local order、conditional descendant loading、masking、one-level relationship としての import、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Claude instruction を選択すると、参照 file を import せず、安全な layered detail が表示されます。

### テスト先行

- [ ] T237 [P] [US2] launch/ancestor/descendant distinction、regular-before-local order、exact-launch と conditional/unknown な nested `.claude/CLAUDE.md` applicability、conditional descendant loading に関する Claude の失敗テストを `tests/unit/inspection/claude-composition.test.ts` に追加する
- [ ] T238 [P] [US2] masked target、lexical normalization、cycle、boundary status、one-level depth、target read authority ゼロに関する Claude import の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T239 [US2] reciprocal contract reference を持つ Claude instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T240 [US2] マスク済み Claude instruction detail、layer order、condition、import、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T241 [US2] Claude instruction layering、local-order、applicability、import-relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T242 [US2] 境界付き metadata、layer condition、relationship、diagnostics、evidence で Claude instruction recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T243 [US2] Claude instruction parsing、再帰的 masking、relationship-only import、raw disposal を `src/inspection/scan.ts` に統合する
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

- [ ] T250 [US1] local/Cloud layering と managed/remote exclusion が参照する前に、surface-qualified Copilot instruction lookup statement と、読み取り権限を付与しない `copilot.behavior.vscode.user.instructions`、`copilot.behavior.vscode.user.claude`、`copilot.behavior.cli.user.instructions.root`、`copilot.behavior.cli.user.instructions.path`、origin fileを持たない `copilot.behavior.cloud.organization-instructions` を `shared/registries/vendor-behaviors.ts` に追加する
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

**目的**: 互換性のない VS Code、CLI、Cloud composition fact を維持しながらマスク済み Copilot instruction detail を追加し、settings-dependent enablement は後続の Settings wave まで明示的に未知のままとします。

**独立テスト**: 対応する Copilot instruction を開き、`applyTo`、settings-file I/O がゼロの明示的な pending/unknown settings-dependent enablement 状態、parent discovery、Cloud exclusion、発明された general winner なし、masking、relationship、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Copilot instruction を選択すると、別々の surface interpretation と uncertainty が表示されます。

### テスト先行

- [ ] T260 [P] [US2] VS Code/CLI/Cloud fact、`applyTo`、settings owner がない状態での pending/unknown settings-dependent enablement、parent discovery、発明された general winner なしに関する Copilot の失敗テストを `tests/unit/inspection/copilot-composition.test.ts` に追加する
- [ ] T261 [P] [US2] Copilot instruction scope、disablement、alternative、reference、hosted/organization の runtime-only fact に関する metadata と relationship の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T262 [US2] reciprocal contract reference を持つ Copilot instruction runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T263 [US2] マスク済み Copilot instruction detail、surface condition、applicability、relationship、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/copilot-instructions-detail.spec.ts` に追加する

### 実装

- [ ] T264 [US2] settings behavior を参照せず、closed unavailable-settings condition を備えた、別々の Copilot VS Code、CLI、Cloud instruction layering、applicability、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T265 [US2] 境界付き instruction metadata、surface condition、pending settings applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T266 [US2] Copilot instruction parsing、再帰的 masking、inert relationship、raw disposal、settings-file I/O ゼロを `src/inspection/scan.ts` に統合する
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

**独立テスト**: 二つの instruction を比較し、correctness claim を行わず、マスク済み literal source と field-aligned layering、fallback、applicability、relationship、provenance difference を検証します。

**目に見えるチェックポイント**: 二つの instruction file を比較し、構造上の difference を理解できます。

### テスト先行

- [ ] T276 [US3] semantic correctness claim を行わず、literal instruction source と typed layering/fallback difference に関する comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T277 [US3] literal instruction diff と typed layering/fallback difference に関するブラウザー受け入れテストを `tests/e2e/instructions-comparison.spec.ts` に追加する

### 実装

- [ ] T278 [US3] typed instruction comparison row を `app/components/comparison/RecognitionComparison.vue` において拡張する
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

- [ ] T285 [US1] フェーズ 15 で所有した config carrier behavior を再利用し、Hook candidate、standalone MCP、connection authority を作成せず、`codex.behavior.repo.mcp`、正確な config carrier rule が必要とする読み取り権限を付与しない config-contained `codex.behavior.repo.hooks` fact、Codex MCP lookup statement を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T286 [US1] `codex.repo.config` と、その one-edge `codex.derived.fallback-basename` rule をアトミックに追加し、Codex MCP candidate は作成せず、`codex.excluded.plugin-files` を早期所有せずに standalone/plugin/User/managed path を negative のまま保ち、contained declaration には relationship record だけを `shared/registries/inspection-rules.ts` に追加する
- [ ] T287 [US1] Codex config-carrier、derived-fallback、MCP、および読み取り権限を付与しない contained-Hook fact の evidence と reciprocal affected-contract reference を `shared/registries/official-sources.ts` に追加する
- [ ] T288 [US1] config-carrier matching、既存の bounded fallback helper のアトミックな activation、standalone MCP rejection、contained-declaration classification を `src/inspection/rules/codex.ts` に実装する
- [ ] T289 [US1] fallback basename と `[mcp_servers.*]` に必要な最小限の有界 TOML carrier extraction を実装し、一つの検証済み config file に決定論的な provenance で MCP recognition と derived instruction を関連付け、`settings/config` recognition を省略し、synthetic candidate を作成しない処理を `src/inspection/parsers/toml.ts`、`src/inspection/recognizers/codex.ts`、`src/inspection/scan.ts` に実装する
- [ ] T290 [US1] MCP インベントリのフィルターと内包所有者の要約を `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T291 [US1] 意味的に同等な英語/日本語の Codex 内包 MCP、所有者、スキーマ、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 24: Codex MCP の詳細

**目的**: 一般 configuration の表示はフェーズ 58 まで保留しつつ、最小 Codex carrier をマスク済み MCP detail、active-config precedence、trust、inheritance、duplicate、zero-connection behavior で拡張します。

**独立テスト**: 内包された Codex 宣言を開き、有効なプロジェクト設定の優先順位、信頼条件、サーバー名の重複、親/エージェント継承の事実、マスキング、診断、および DNS、ソケット、HTTP、認証、プローブ、コマンド、展開、参照先の読み取りが一切ないことを検証する。

**目に見えるチェックポイント**: Codex MCP 認識を選択すると、すべてのサーバーを非アクティブに保ったまま、正確な設定セマンティクスが表示される。

### テストを先に

- [ ] T292 [P] [US2] named、inline、ancestor、plugin、runtime-only の reference に加え、フェーズ 50 より前には unresolved behavior backlink、connection、target promotion を持たない純粋な dormant agent-inheritance adapter に関する失敗する MCP schema test を `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T293 [P] [US2] active project-config precedence、trust condition、duplicate name、有効になった fallback provenance、一般 config presentation がないことに関する失敗する Codex carrier/MCP test を `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T294 [P] [US2] Codex MCP の検査によって DNS、ソケット、HTTP、認証、プローブ、コマンド実行、展開、プラグインのロード、参照ファイルの読み取りが発生しないことを証明するゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T295 [P] [US2] マスクされたコマンド、URL、ヘッダー、環境フィールド、所有者来歴、条件、診断、古い ID に対する失敗する Codex MCP 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T296 [US2] reciprocal contract reference を備えた Codex carrier、instruction-fallback、MCP runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T297 [US2] マスクされた Codex MCP 詳細、設定の優先順位、信頼、診断、所有者への移動、ゼロ接続の振る舞いを対象とするブラウザ受け入れテストを `tests/e2e/codex-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T298 [US2] Codex MCP active-config selection、trust、duplicate、provenance、relationship strategy に加え、フェーズ 50 より前には `codex.behavior.repo.agents` を参照しない closed dormant agent-inheritance adapter を `shared/registries/runtime-composition.ts` に追加する
- [ ] T299 [US2] Codex active-config MCP precedence、trust、duplicate、provenance metadata、owner-gated dormant agent inheritance を `src/inspection/recognizers/codex.ts` に実装する
- [ ] T300 [US2] 最小 TOML carrier extraction を closed Codex MCP detail field、schema distinction、secret-safe origin で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T301 [US2] Codex MCP の再帰的マスキング、選択の投影、条件、診断、追跡しない関係を `src/inspection/scan.ts` に統合する
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

- [ ] T308 [US1] MCP replacement/owner strategy が参照する前に、Claude MCP-file lookup statement と、読み取り権限を付与しない MCP-dependent な `claude.behavior.user.mcp-state`、`claude.behavior.repo.agents`、`claude.behavior.repo.plugin`、`claude.behavior.user.plugins` fact を candidate authority または connection authority なしで `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T309 [US1] 正確な Claude MCP candidate を追加し、`claude.excluded.plugin-files` を早期所有せず、新しい MCP exclusion ID も作成せずに plugin/User/connector/managed location を path-negative のまま保つ処理を `shared/registries/inspection-rules.ts` に追加する
- [ ] T310 [US1] Claude MCP-file evidence に加え、このフェーズで所有する読み取り権限を付与しない四つの MCP-dependent behavior fact すべての reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T311 [US1] Claude のルートと完全一致する `.mcp.json` のマッチングとパス由来の認識を `src/inspection/rules/claude.ts` と `src/inspection/recognizers/claude.ts` に実装する
- [ ] T312 [US1] Claude MCP ファイルの分類を統合し、後続の共有認識に備えて物理的な同一性を `src/inspection/scan.ts` で維持する
- [ ] T313 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Claude ファイル、スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 26: Claude MCP ファイルの詳細

**目的**: 独立 Claude `.mcp.json` に、エントリ全体の置換と起動時の `cwd` 相対基準を備えたマスク済み詳細を追加する。

**独立テスト**: 敵対的および不正なルートファイルを開き、local→project→User→plugin→connector のエントリ全体の置換に関する事実、コマンド/引数に対する起動時の `cwd` 基準、重複の不確実性、マスキング、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: Claude `.mcp.json` を選択すると、正確なファイルセマンティクスと非アクティブなサーバー宣言が表示される。

### テストを先に

- [ ] T314 [P] [US2] local→project→User→plugin→connector のエントリ全体の置換と、コマンド/引数に対する起動時の `cwd` 相対基準について、失敗する Claude MCP テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T315 [P] [US2] Claude ファイルのサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、コネクター状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T316 [P] [US2] マスク済みフィールド、ファイルスキーマ、基準パス、条件、診断、古い ID に対する失敗する Claude MCP ファイル詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T317 [US2] 相互の契約参照を備えた、失敗する Claude MCP ファイルの runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T318 [US2] マスク済み Claude MCP ファイル詳細、置換順序、基準パス、診断、ゼロ接続の振る舞いを対象とするブラウザ受け入れテストを `tests/e2e/claude-mcp-files-detail.spec.ts` に追加する

### 実装

- [ ] T319 [US2] Claude MCP のエントリ全体の置換、起動基準、重複、スコープ、関係の戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T320 [US2] エントリ全体の置換と起動時の `cwd` 相対基準を備えた Claude MCP ファイルのメタデータを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T321 [US2] closed Claude MCP-file field、schema distinction、limit、atomic failure、secret-safe origin を備えた有界で不活性な strict-JSON core を `src/inspection/parsers/json.ts` に実装する
- [ ] T322 [US2] Claude MCP ファイルのマスキング、選択の投影、条件、診断、追跡しない関係を `src/inspection/scan.ts` に統合する
- [ ] T323 [US2] 型付き詳細と、意味的に同等な英語/日本語の Claude MCP 置換、基準、安全性、不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 27: Claude 内包 MCP core

**目的**: すでに受け入れられた skill owner に Claude MCP metadata を関連付け、まだ所有されていない behavior への reference を登録したり standalone candidate を作成したりせず、後続の settings、agent、plugin、marketplace owner に向けた closed owner-adapter contract を実装します。

**独立テスト**: 受け入れ済み skill owner を検査し、inline/named server reference、parent inheritance、plugin component path、runtime-only connector、不正な field、宣言欠落を含む将来の owner kind 用 pure adapter fixture を実行します。受け入れ済み owner だけが recognition を受けられること、将来の adapter は read authority を与えないこと、synthetic file が現れないこと、target は relationship のままであること、すべての path で masking と zero connection が成り立つことを検証します。

**目に見えるチェックポイント**: Claude の skill-contained MCP fact が既存 owner 上に表示され、root `.mcp.json` と区別されたままになります。後続 owner family は、MCP matching や connection safety を変更せず、事前テスト済み adapter を有効化できます。

### テストを先に

- [ ] T324 [P] [US2] 受け入れ済み skill と、純粋で読み取り権限を付与しない settings/agent/plugin/marketplace adapter fixture、named/inline server、parent inheritance、plugin path、connector、owner provenance、現在所有済みの正確な evidence に関する失敗する Claude contained-MCP test を `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T325 [P] [US2] この checkpoint では contained MCP が受け入れ済み skill owner だけに関連付けられ、将来の owner adapter は受け入れ済み owner なしに candidate または recognition を作成できず、plugin target を読み取らず、不正/欠落した declaration をアトミックに省略することを証明する recognition test を `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T326 [P] [US2] Claude のすべての内包所有者、関係、コネクター、コマンド、URL、ヘッダー、環境、参照パスを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T327 [US2] 現在所有済みの skill/MCP behavior だけを使用する Claude contained-MCP relationship/composition graph coverage の失敗テストを追加し、将来の owner adapter に unresolved registry reference または read authority がないことを `tests/contract/runtime-composition.test.ts` で証明する
- [ ] T328 [US2] Claude skill-contained MCP detail、owner navigation、inheritance、relationship、diagnostics、未受け入れ owner family の row がないこと、zero connection behavior を対象とするブラウザー受け入れテストを `tests/e2e/claude-contained-mcp.spec.ts` に追加する

### 実装

- [ ] T329 [US2] 現在受け入れ済みの skill owner 向けに Claude MCP strategy を拡張し、後続 owner、parent-inheritance、plugin/runtime-reference、contained-declaration condition に向けた closed non-authorizing adapter interface を `shared/registries/runtime-composition.ts` に定義する
- [ ] T330 [US2] Claude skill-contained MCP metadata に加え、owner-gated adapter dispatch、owner provenance、relationship-only target、runtime-only fact を `src/inspection/recognizers/claude.ts` に実装する
- [ ] T331 [US2] 現在受け入れ済みの skill-contained MCP field に対して既存の YAML/Markdown extraction を拡張し、未受け入れの settings/plugin owner を parse せず、純粋な将来の JSON/JSONC owner-adapter schema だけを `src/inspection/parsers/json.ts`、`src/inspection/parsers/yaml.ts`、`src/inspection/parsers/markdown.ts` に定義する
- [ ] T332 [US2] 現在受け入れ済み owner を一度だけ読み取る recognition、recursive masking、condition、diagnostics、non-following relationship、および将来の adapter dispatch が独立して受け入れ済みの owner ID を受け取るという厳格な要件を `src/inspection/scan.ts` に統合する
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

- [ ] T338 [US1] CLI MCP の選択から参照される前に、Copilot CLI MCP 検索記述と、読み取り権限を付与しない `copilot.behavior.cli.user.mcp` を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T339 [US1] `copilot.repo.mcp` の 2 つのセレクターだけを追加し、除外 ID を持たず User/session/hosted/configured の場所をパス不一致のまま保ち、プラグインパスを関係として `shared/registries/inspection-rules.ts` に保持する
- [ ] T340 [US1] Copilot CLI MCP のエビデンスレコードと、影響を受ける契約への相互参照を `shared/registries/official-sources.ts` に追加する
- [ ] T341 [US1] Copilot の子孫 CLI MCP のマッチングとスキーマで修飾された認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T342 [US1] Copilot CLI MCP の分類を統合し、共有されるルートの物理的な同一性を `src/inspection/scan.ts` で維持する
- [ ] T343 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Copilot CLI コンテキスト、スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 29: Copilot CLI MCP の詳細

**目的**: ソース順序、信頼、祖先にある重複の不確実性、接続を一切行わない振る舞いを備えた、マスク済み Copilot CLI MCP 詳細を追加する。

**独立テスト**: 敵対的および不正な CLI ファイルを開き、session-additional→plugin→workspace→User の順序に関する事実、祖先にある未知の重複、runtime-chain/trust 条件、マスキング、診断、接続または対象の昇格が一切ないことを検証する。

**目に見えるチェックポイント**: Copilot CLI MCP ファイルを選択すると、正確なローカル順序と不確実性が表示される。

### テストを先に

- [ ] T344 [P] [US2] session-additional→plugin→workspace→User の順序、祖先にある未知の重複、runtime-chain/trust 条件、スキーマ、来歴に対する失敗する Copilot CLI MCP テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T345 [P] [US2] Copilot CLI のサーバー、コマンド、URL、ヘッダー、環境、DNS、ソケット、認証、展開、session/plugin 状態、参照ファイルを対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T346 [P] [US2] マスク済みフィールド、スキーマ、条件、診断、古い ID に対する失敗する Copilot CLI MCP 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T347 [US2] 相互の契約参照を備えた、失敗する Copilot CLI MCP runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T348 [US2] マスク済み Copilot CLI MCP 詳細、順序、重複、信頼、診断、ゼロ接続の振る舞いを対象とするブラウザ受け入れテストを `tests/e2e/copilot-cli-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T349 [US2] Copilot CLI MCP のソース順序、祖先の重複、信頼、コンテキスト、関係の戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T350 [US2] Copilot CLI MCP の順序、重複の不確実性、信頼、スキーマ、来歴のメタデータを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T351 [US2] closed Copilot CLI MCP field、schema distinction、secret-safe origin によって JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T352 [US2] Copilot CLI MCP のマスキング、選択の投影、条件、診断、追跡しない関係を `src/inspection/scan.ts` に統合する
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

- [ ] T358 [US1] VS Code MCP selection と dormant owner adapter が参照する前に、Custom Agent file を受け入れず、Copilot VS Code MCP lookup statement と、読み取り権限を付与しない `copilot.behavior.vscode.user.mcp` および `copilot.behavior.vscode.agents` fact を `shared/registries/vendor-behaviors.ts` に追加する
- [ ] T359 [US1] 正確な VS Code MCP candidate だけを追加し、`copilot.excluded.vscode-settings` を早期所有せず、新しい MCP exclusion ID も作成せずに general settings、descendant、User、profile location を path-negative のまま保つ処理を `shared/registries/inspection-rules.ts` に追加する
- [ ] T360 [US1] Copilot VS Code MCP evidence に加え、このフェーズで所有する読み取り権限を付与しない二つの VS Code MCP/agent fact の reciprocal backlink を `shared/registries/official-sources.ts` に追加する
- [ ] T361 [US1] ルートと完全一致する Copilot VS Code MCP のマッチングと専用スキーマの認識を `src/inspection/rules/copilot.ts` と `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T362 [US1] CLI 候補を変更せずに、Copilot VS Code MCP の分類を `src/inspection/scan.ts` に統合する
- [ ] T363 [US1] MCP インベントリ行と、意味的に同等な英語/日本語の Copilot VS Code スキーマ、除外メッセージを `app/components/inventory/InventoryItem.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 31: Copilot VS Code MCP の詳細

**目的**: workspace/User 間の重複の不確実性と信頼条件を備えた、マスク済み VS Code MCP 詳細を追加する。

**独立テスト**: 敵対的および不正な `.vscode/mcp.json` を開き、専用スキーマのフィールド、workspace/User 間で同名の場合の未知の解決、信頼、マスキング、診断、接続が一切ないことを検証する。

**目に見えるチェックポイント**: VS Code MCP ファイルを選択すると、スキーマ固有の安全な詳細と不確実性が表示される。

### テストを先に

- [ ] T364 [P] [US2] `servers` スキーマ、workspace スコープ、workspace/User 間の未知の重複、信頼、来歴、正確なエビデンスに対する失敗する Copilot VS Code MCP テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T365 [P] [US2] VS Code MCP のコマンド、URL、ヘッダー、環境、DNS、ソケット、認証、信頼プロンプト、User/profile 状態を対象とするゼロ接続テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T366 [P] [US2] マスク済みフィールド、専用スキーマ、条件、診断、古い ID に対する失敗する VS Code MCP 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T367 [US2] 相互の契約参照を備えた、失敗する VS Code MCP runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T368 [US2] マスク済み VS Code MCP 詳細、スキーマ、重複の不確実性、信頼、診断、ゼロ接続の振る舞いを対象とするブラウザ受け入れテストを `tests/e2e/copilot-vscode-mcp-detail.spec.ts` に追加する

### 実装

- [ ] T369 [US2] Copilot VS Code MCP の workspace/User 間の重複、信頼、スキーマ、関係の戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T370 [US2] Copilot VS Code MCP のスキーマ、重複の不確実性、信頼、来歴のメタデータを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T371 [US2] closed VS Code MCP field、schema distinction、comment support、limit、atomic failure、secret-safe origin を備えた有界で不活性な JSONC mode を、既存の strict-JSON core に `src/inspection/parsers/json.ts` で追加する
- [ ] T372 [US2] VS Code MCP のマスキング、条件、診断、追跡しない関係を `src/inspection/scan.ts` に統合する
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
- [ ] T385 [US2] クローズドな Copilot エージェント内包 MCP フィールドとシークレットを安全に扱う所有者出所によって Markdown 抽出を `src/inspection/parsers/markdown.ts` で拡張する
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

**独立テスト**: 受け入れ済み owner を介した contained declaration と Codex carrier 対 root `.mcp.json` の identity-preservation case を含め、priority wave の現行世代で読み取り可能な物理 file ID を正確に 2 つ選択します。マスク済み source に加え、整列された server、transport、schema、base、provenance、trust、selection、replacement、uncertainty を検証し、runtime-fact-only または dormant-owner の選択を拒否します。

**目に見えるチェックポイント**: ユーザーは MCP 宣言に接続せずに比較できる。

### テストを先に

- [ ] T397 [US3] 実際に読み取り可能な priority-wave ID、受け入れ済み owner ID を介した contained MCP、runtime-fact/dormant-owner の拒否、Codex carrier 対 `.mcp.json` の identity preservation、server/transport/schema/provenance/trust/selection difference に関する selection と typed comparison の失敗回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T398 [US3] admitted-owner contained MCP、Codex-carrier 対 `.mcp.json` の literal diff、typed server/provenance difference、runtime-fact-only または dormant-owner selection の拒否を対象とするブラウザー受け入れテストを `tests/e2e/mcp-comparison.spec.ts` に追加する

### 実装

- [ ] T399 [US3] 実際に読み取り可能な物理所有者/ファイル ID による MCP 比較選択を強制し、Codex 設定対 `.mcp.json` のファイル同一性を `app/composables/comparison.ts` で維持する
- [ ] T400 [US3] origin fileを持たないランタイムの事実を選択可能なファイルとして公開せずに、型付き MCP 比較行を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: 安全な Codex rule ソース、型付き trust、active layer の不確実性、experimental status、非活性な relationship 詳細を追加する。

**独立テスト**: 敵対的な Codex rule を開き、マスキング、project layer/trust 条件、active layer の不確実性、experimental status、非活性な command/link、診断、reveal cleanup を検証する。

**目に見えるチェックポイント**: Codex rule を選択すると、それを実行または適用せずに安全な詳細を開ける。

### テストを先に

- [ ] T411 [P] [US2] project layer、trust、active layer の不確実性、direct-child provenance、experimental status に関する、失敗する Codex metadata/applicability テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T412 [P] [US2] Codex rule のテキスト、link、command、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T413 [US2] reciprocal contract reference を備えた、失敗する Codex rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T414 [US2] マスク済み Codex rule 詳細、trust、applicability、診断、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/codex-rules-detail.spec.ts` に追加する

### 実装

- [ ] T415 [US2] Codex rule の trust、layer、applicability、experimental-status、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T416 [US2] Codex metadata、applicability、relationship、マスキング向けの非活性な rule 抽出と scan 統合を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
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

**目的**: 安全な Claude rule ソース、型付き `paths` applicability、layer condition、非活性な relationship を追加する。

**独立テスト**: 敵対的な Claude rule を開き、`paths`、不明な glob base、conditional layer、マスキング、非活性な link/command、診断、reveal cleanup を検証する。

**目に見えるチェックポイント**: Claude rule を選択すると、任意の filesystem path に対して glob を評価せずに安全な applicability 詳細が表示される。

### テストを先に

- [ ] T429 [P] [US2] `paths`、省略された path、不明な glob base、conditional layer、documentation uncertainty に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T430 [P] [US2] Claude rule のテキスト、link、command、glob、restrictive result が非活性のままで、target read を決して認可しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T431 [US2] reciprocal contract reference を備えた、失敗する Claude rule runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T432 [US2] マスク済み Claude rule 詳細、path applicability、layer condition、診断、非活性な reference に関するブラウザー受け入れテストを `tests/e2e/claude-rules-detail.spec.ts` に追加する

### 実装

- [ ] T433 [US2] Claude rule layering、path-applicability、unknown-base、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T434 [US2] Claude rule metadata、applicability、relationship、マスキング向けの非活性な Markdown 抽出と scan 統合を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T435 [US2] 型付き Claude rule 詳細フィールドと、意味的に同等な英語/日本語の applicability および不確実性メッセージを `app/components/inspection/RecognitionDetails.vue`、`app/locales/en.ts`、`app/locales/ja.ts` で拡張する

---

## フェーズ 39: Rules の比較

**目的**: literal および型付きの rule 差分を比較に追加する。

**独立テスト**: 二つの rule を比較し、マスク済みソースに加えて、整列した path、layer、trust、provenance、applicability、documentation status を検証する。

**目に見えるチェックポイント**: どちらの rule が正しいか、または強いかを評価せずに rule ファイルを比較できる。

### テストを先に

- [ ] T436 [US3] rule path、layer、trust、provenance、documentation status に関する失敗する型付き比較 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T437 [US3] literal rule diff と型付き metadata 差分に関するブラウザー受け入れテストを `tests/e2e/rules-comparison.spec.ts` に追加する

### 実装

- [ ] T438 [US3] 型付き rule comparison row を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: マスク済み Claude command ソース、namespace、invocation、同名 skill の precedence、applicability、非活性な relationship 詳細を追加する。

**独立テスト**: 敵対的な Claude command を開き、recursive namespace、同名 skill の precedence、不明な traversal、マスキング、非活性な agent/skill reference、診断、reveal cleanup を検証する。

**目に見えるチェックポイント**: Claude command を選択すると、参照先を実行、import、read せずに安全な詳細を開ける。

### テストを先に

- [ ] T449 [P] [US2] namespace、invocation、agent/skill reference、同名 skill priority、不明な ancestor traversal に関する失敗する Claude metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T450 [P] [US2] Claude command body と reference が target を実行、navigate、import、read しないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T451 [US2] reciprocal contract reference を備えた、失敗する Claude command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T452 [US2] マスク済み Claude command 詳細、namespace、reference、condition、診断に関するブラウザー受け入れテストを `tests/e2e/claude-commands-detail.spec.ts` に追加する

### 実装

- [ ] T453 [US2] Claude command selection、namespace、skill precedence、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T454 [US2] Claude command metadata、reference、applicability、マスキング向けの Markdown 抽出と scan 統合を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
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

**目的**: 保守的な applicability と同名 skill の precedence を備えた、マスク済み Copilot CLI command 詳細を追加する。

**独立テスト**: 敵対的な root command ファイルを開き、invocation、skill priority、不明な project ancestry、非活性な reference、マスキング、診断、reveal cleanup を、Claude runtime の前提を import せずに検証する。

**目に見えるチェックポイント**: Copilot command を選択すると、安全な CLI-qualified 詳細と不確実性が表示される。

### テストを先に

- [ ] T467 [P] [US2] invocation、同名 skill priority、direct-child provenance、不明な ancestry、reference、正確な evidence に関する失敗する Copilot command metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T468 [P] [US2] Copilot command body、reference、navigation、import、target read に関する失敗する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T469 [US2] reciprocal contract reference を備えた、失敗する Copilot command runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T470 [US2] マスク済み Copilot command 詳細、invocation、reference、condition、診断に関するブラウザー受け入れテストを `tests/e2e/copilot-commands-detail.spec.ts` に追加する

### 実装

- [ ] T471 [US2] Copilot command invocation、保守的な applicability、skill precedence、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T472 [US2] bounded metadata、condition、relationship、診断、evidence を備えるよう Copilot command recognition を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T473 [US2] Copilot command parsing、マスキング、非活性な reference、raw disposal を `src/inspection/scan.ts` に統合する
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

**独立テスト**: 二つの command を比較し、マスク済みソースに加えて、整列した namespace、invocation、recognition、precedence、provenance、reference を検証する。

**目に見えるチェックポイント**: command ファイルを実行せずに比較できる。

### テストを先に

- [ ] T482 [US3] namespace、invocation、tool recognition、precedence、reference に関する失敗する型付き比較 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T483 [US3] literal command diff と型付き metadata 差分に関するブラウザー受け入れテストを `tests/e2e/commands-comparison.spec.ts` に追加する

### 実装

- [ ] T484 [US3] 型付き command comparison row を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: マスク済み prompt ソース、invocation、scope、applicability、非活性な reference 詳細を追加する。

**独立テスト**: 敵対的な prompt を開き、マスキング、明示的な invocation、reference、URI/image/navigation の動作がないこと、診断、reveal cleanup を検証する。

**目に見えるチェックポイント**: Copilot prompt を選択すると、参照先へ移動したり読み取ったりせずに安全な詳細を開ける。

### テストを先に

- [ ] T495 [P] [US2] invocation、scope、reference、applicability、evidence に関する失敗する prompt metadata テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T496 [P] [US2] prompt の link、image、URI、`#file` target が移動も read の認可もしないことを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T497 [US2] reciprocal contract reference を備えた、失敗する prompt runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T498 [US2] マスク済み prompt 詳細と非活性な reference に関するブラウザー受け入れテストを `tests/e2e/prompts-detail.spec.ts` に追加する

### 実装

- [ ] T499 [US2] prompt invocation、applicability、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T500 [US2] prompt metadata、非活性な reference、applicability、マスキング向けの Markdown 抽出と scan 統合を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T501 [US2] 型付き prompt 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T502 [US2] 意味的に同等な英語/日本語の prompt 詳細、invocation、reference、安全性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 48: Copilot Prompts の比較

**目的**: literal および型付きの Copilot prompt 差分を比較に追加する。

**独立テスト**: 二つの prompt を比較し、マスク済みソースに加えて、整列した invocation、scope、provenance、applicability、reference を検証する。

**目に見えるチェックポイント**: コンテンツへ移動したり実行したりせずに Copilot prompt を比較できる。

### テストを先に

- [ ] T503 [US3] prompt invocation、scope、provenance、reference に関する失敗する型付き比較 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T504 [US3] literal prompt diff と型付き metadata 差分に関するブラウザー受け入れテストを `tests/e2e/prompts-comparison.spec.ts` に追加する

### 実装

- [ ] T505 [US3] 型付き prompt comparison row を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: 完成済みの Codex MCP carrier を agent の MCP owner とするのではなく relationship source として再利用しながら、安全な Codex custom-agent source、spawned-session configuration、inheritance、relationship、condition detail を追加します。

**独立テスト**: hostile および malformed な Codex agent を開き、境界付き TOML parsing、model/reasoning/sandbox/skill、parent inheritance、再適用された live sandbox/approval fact、MCP carrier inheritance/origin relationship、agent-owned MCP recognition がないこと、config-path relationship、masking、diagnostics、reveal cleanup、zero connection を検証します。

**目に見えるチェックポイント**: Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、安全な spawned-session detail と carrier-inheritance relationship が表示されます。

### テスト先行

- [ ] T517 [P] [US2] Codex agent field、strict limit、malformed input、atomic extraction に関する inert TOML parsing の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T518 [P] [US2] model、reasoning、sandbox、skill、agent-owned MCP recognition を持たない closed MCP carrier-origin relationship、config-path relationship、parent inheritance、live sandbox/approval reapplication に関する Codex agent の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T519 [P] [US2] Codex agent declaration が tool の実行、process の spawn、MCP への接続、参照 config path の読み取りを行わないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T520 [US2] relationship-only の carrier inheritance、agent-owned MCP recognition がないこと、reciprocal contract reference に関する Codex custom-agent runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T521 [US2] マスク済み Codex custom-agent detail、agent-owned MCP row を持たない carrier-linked MCP inheritance relationship、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T522 [US2] 既存の有界で不活性な TOML carrier parser を Codex agent normalization と extraction で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T523 [US2] 既存の Codex config/MCP strategy を relationship-only の agent inheritance、spawned-session context、selection、sandbox/approval、agent-owned MCP recognition の明示的な禁止で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T524 [US2] Codex agent metadata、applicability、マスク済み carrier-linked MCP inheritance/origin relationship、agent-owned MCP recognition ゼロ、connection ゼロ、raw disposal を `src/inspection/scan.ts` に統合する
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

**目的**: 安全な Claude subagent context detail を追加し、フェーズ 27 で完成した owner-gated MCP adapter を有効化し、memory と Hook target は inert のままにします。

**独立テスト**: hostile および malformed な Claude agent を開き、fresh/fork context、tool、skill、memory-scope fact、nested-spawn limit、duplicate-name uncertainty、agent reference、owner-attached MCP metadata、masking、zero activation/connection、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Claude custom agent を選択すると、memory を読み取ったり MCP に接続したりせず、安全な context と relationship detail が表示されます。

### テスト先行

- [ ] T537 [P] [US2] context mode、tool、skill、closed MCP/Hook origin、memory scope、nested spawning、duplicate-name uncertainty、built-in omission、agent reference に関する Claude agent の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T538 [P] [US2] 独立して admission された skill/agent、除外された memory root、runtime-only input、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T539 [P] [US2] tool、skill、Hook、MCP、memory、command、link、agent reference に対する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T540 [US2] reciprocal contract reference を持つ Claude agent context-composition とフェーズ 27 MCP owner-adapter activation の失敗 coverage test を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T541 [US2] マスク済み Claude custom-agent detail、context、tool、owner-attached MCP、relationship、diagnostics、zero connection、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T542 [US2] Claude agent selection、fresh/fork context、tool、skill-preload、memory-fact、nested-spawn、relationship strategy を追加し、既存 MCP adapter を現在所有済みの agent behavior に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T543 [US2] 境界付き agent metadata、owner-gated contained MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T544 [US2] Claude agent metadata、masking、synthetic file または connection を作成しない owner-attached MCP、relationship-only の memory/Hook target、raw disposal を `src/inspection/scan.ts` に統合する
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

**目的**: 安全な Copilot agent detail を追加し、フェーズ 32 の owner-gated MCP adapter を有効化し、VS Code/CLI/Cloud の context difference を維持して、Hook-family semantics だけを延期します。

**独立テスト**: hostile および malformed な Copilot agent を開き、body、tool、model、invocation、handoff、instruction、skill、closed Hook origin、owner-attached MCP、surface selection、masking、zero activation/connection、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。

### テスト先行

- [ ] T556 [P] [US2] VS Code/CLI/Cloud body、tool、model、handoff、instruction、skill、closed Hook origin、フェーズ 32 MCP adapter activation、surface selection に関する Copilot agent の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T557 [P] [US2] handoff、link、skill preload、instruction、runtime-only organization agent、target promotion ゼロに関する relationship の失敗テストを `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T558 [P] [US2] Copilot agent declaration が tool、handoff、Hook、MCP、link、参照 file を invoke しないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T559 [US2] reciprocal contract reference を持つ Copilot agent context-composition と owner-gated MCP activation graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T560 [US2] マスク済み Copilot custom-agent detail、surface context、owner-attached MCP、relationship、diagnostics、zero connection、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/copilot-custom-agents-detail.spec.ts` に追加する

### 実装

- [ ] T561 [US2] 別々の Copilot VS Code、CLI、Cloud agent selection、context、handoff、tool、relationship strategy を追加し、フェーズ 32 MCP adapter を受け入れ済み agent owner に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T562 [US2] 境界付き agent metadata、owner-gated MCP、inert Hook origin、applicability、relationship、diagnostics、evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T563 [US2] Copilot agent metadata、masking、synthetic file または connection を作成しない owner-attached MCP、relationship-only Hook target、raw disposal を `src/inspection/scan.ts` に統合する
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

**独立テスト**: 二つの custom agent を比較し、マスク済み source と、整列した context、tool、該当する場合の Claude/Copilot owner-attached MCP または Codex carrier-inheritance relationship、provenance、relationship、condition difference を検証します。

**目に見えるチェックポイント**: custom-agent definition を実行または ranking せずに比較できます。

### テスト先行

- [ ] T573 [US3] typed agent context、tool、Claude/Copilot owner-attached MCP、agent-owned MCP を作成しない Codex carrier-inheritance relationship、provenance、condition difference に関する comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T574 [US3] literal custom-agent diff、typed context/tool difference、vendor ごとに正しい MCP ownership/relationship presentation に関するブラウザー受け入れテストを `tests/e2e/custom-agents-comparison.spec.ts` に追加する

### 実装

- [ ] T575 [US3] Claude/Copilot owner-attached MCP と Codex relationship-only carrier inheritance を明確に区別したまま、typed custom-agent comparison row を `app/components/comparison/RecognitionComparison.vue` において拡張する
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

**独立テスト**: malformed および secret-bearing な project config layer を開き、既存 atomic TOML parse の拡張、root から `cwd` への precedence、closest-value behavior、trust、relative base、すでに有効な fallback/MCP field、残りの inert declaration、masking、diagnostics、二度目の read/derivation を伴わない reveal cleanup を検証します。

**目に見えるチェックポイント**: `.codex/config.toml` を選択すると、宣言された target を読み取らず、安全な typed configuration と fallback declaration が表示されます。

### テスト先行

- [ ] T589 [US2] array/table、strict UTF-8、malformed value、depth/nodes/scalars/metadata limit、relative-path base、atomic extraction に関する境界付き TOML の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T590 [P] [US2] root から `cwd` への layer、closest-value behavior、trust、最大 128 UTF-8 byte の literal fallback basename を最大 16 件、declaration、除外された higher scope に関する Codex config の失敗テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T591 [P] [US2] fallback name、agent config path、model-instruction path、compact-prompt path、skill path、Hook field、MCP field が target read または activation を一切認可しないことを証明する relationship と safety の失敗テストを `tests/unit/inspection/relationships.test.ts` と `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T592 [P] [US2] 既存 precedence、trust、relative base、active instruction/MCP projection の拡張と、依然として延期される Hook projection に関する Codex configuration strategy/registry-graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T593 [P] [US2] マスク済み TOML value、strict/stale ID、no-store behavior、diagnostics、bounded metadata に関する file-detail/reveal の失敗契約を `tests/contract/http-api-files.test.ts` と `tests/contract/http-api-reveals.test.ts` に追加する
- [ ] T594 [US2] マスク済み Codex configuration detail、precedence、trust、fallback declaration、inert relationship、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-config-detail.spec.ts` に追加する

### 実装

- [ ] T595 [US2] 既存の有界で不活性な TOML carrier extraction を、closed fallback/MCP extraction を維持したまま、残りの Codex project-configuration field と relative-base metadata で `src/inspection/parsers/toml.ts` において拡張する
- [ ] T596 [US2] 既存の `codex.config.precedence` strategy を general configuration value、trust、closest-value、relative-base、依然として不活性な Hook declaration で `shared/registries/runtime-composition.ts` において拡張する
- [ ] T597 [US2] 境界付き config field、fallback-name metadata、relationship、applicability、diagnostics、正確な evidence で Codex recognition を `src/inspection/recognizers/codex.ts` において拡張する
- [ ] T598 [US2] extended atomic TOML parse、recursive masking、relationship-only target、immediate raw disposal を統合し、すでに導出済みの fallback file と既存 MCP recognition を rederivation または二度目の read なしに `src/inspection/scan.ts` で維持する
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

**独立テスト**: malformed および secret-bearing な settings を開き、atomic JSONC parsing、正確な project/local precedence、selected-component declaration、owner-attached MCP metadata、surface condition、recursive masking、inert relationship、zero connection、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、安全な layer-aware detail と owner-attached MCP が表示されます。

### テスト先行

- [ ] T612 [US2] comment、known field、strict UTF-8、malformed structure、depth/nodes/scalars/metadata limit、atomic extraction に関する inert JSONC の失敗テストを `tests/unit/inspection/parsers.test.ts` に追加する
- [ ] T613 [P] [US2] 正確な launch-root scope、parent/descendant matching なし、project/local precedence、selected component、closed declaration origin、surface availability に関する Claude settings の失敗テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T614 [P] [US2] settings で選択された agent、plugin、Hook、MCP、command、path、workflow、reference が inert かつ non-following のままであることを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T615 [US2] reciprocal contract reference、フェーズ 27 MCP adapter activation、Hook semantics だけの延期を持つ Claude settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T616 [US2] マスク済み Claude settings detail、layer precedence、selected-component declaration、owner-attached MCP、zero connection、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-settings-detail.spec.ts` に追加する

### 実装

- [ ] T617 [US2] 既存の有界で不活性な JSONC mode を allowlist 対象 Claude settings field と closed declaration origin で `src/inspection/parsers/json.ts` において拡張する
- [ ] T618 [US2] Claude settings precedence、selection、surface、relationship strategy を追加し、既存 MCP adapter を現在所有済みの settings behavior に関連付け、Hook composition は `shared/registries/runtime-composition.ts` で延期したままにする
- [ ] T619 [US2] 境界付き settings metadata、owner-gated contained MCP、applicability、relationship-only target、diagnostics、evidence で Claude recognition を `src/inspection/recognizers/claude.ts` において拡張する
- [ ] T620 [US2] Claude JSONC parsing、recursive masking、synthetic file または connection を作成しない owner-attached MCP、inert Hook declaration、raw disposal を `src/inspection/scan.ts` に統合する
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

**独立テスト**: malformed および secret-bearing な settings を開き、VS Code/CLI layer、enablement、recommendation、compatible Claude settings、configured-root read なし、再帰的 masking、diagnostics、reveal cleanup を検証します。

**目に見えるチェックポイント**: Copilot settings を選択すると、plugin の有効化や contained Hook の compose を行わず、安全な surface-qualified detail が表示されます。

### テスト先行

- [ ] T633 [P] [US2] VS Code/CLI layer、enablement、フェーズ 20 で pending だった instruction applicability の再投影、plugin recommendation、closed contained-hook origin、compatible Claude settings、configured-root read なしに関する Copilot settings の失敗テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T634 [P] [US2] credential、environment value、command、path、recommendation、reference、relationship read authority ゼロに関する masking と relationship の失敗テストを `tests/unit/inspection/masking.test.ts` と `tests/unit/inspection/relationships.test.ts` に追加する
- [ ] T635 [P] [US2] settings content が plugin の有効化、Hook の呼び出し、MCP への接続、URI の load、configured root の展開を行えないことを証明する zero-activation の失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T636 [US2] VS Code/CLI/Cloud distinction、フェーズ 20 instruction の再投影、deferred Plugin/Hook semantics、settings は MCP owner ではないという恒久ルールに関する Copilot settings runtime-composition graph coverage の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T637 [US2] マスク済み Copilot settings detail、surface precedence、更新された instruction applicability、recommendation、inert declaration、settings-owned MCP row がないこと、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/copilot-settings-detail.spec.ts` に追加する

### 実装

- [ ] T638 [US2] allowlist 対象 Copilot settings field、recommendation identifier、closed declaration origin で境界付き JSONC extraction を `src/inspection/parsers/json.ts` において拡張する
- [ ] T639 [US2] surface-qualified Copilot settings precedence、enablement、recommendation、relationship strategy を追加し、以前 pending だった instruction applicability を再投影し、後続 Plugin/Hook family は `shared/registries/runtime-composition.ts` で inert のままにする
- [ ] T640 [US2] 境界付き settings metadata、applicability、instruction re-projection fact、relationship-only target、恒久的な MCP non-ownership、diagnostics、正確な evidence で Copilot recognition を `src/inspection/recognizers/copilot.ts` において拡張する
- [ ] T641 [US2] Copilot settings parsing、recursive masking、instruction re-projection、inert declaration、恒久的な MCP non-ownership、raw disposal を `src/inspection/scan.ts` に統合する
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

**独立テスト**: current-generation で読み取り可能な settings/config file を二つ比較し、マスク済み source と、整列した value、layer、precedence、trust、enablement、MCP ownership、provenance、condition、fallback declaration、recommendation、stale cleanup を検証します。

**目に見えるチェックポイント**: value を適用したり declaration を昇格させたりせず、settings/configuration を比較できます。

### テスト先行

- [ ] T654 [US3] typed settings value、layer provenance、precedence、trust、fallback declaration、recommendation、condition、および Copilot non-ownership を維持しながら実際の settings/carrier owner ID を介して投影される owner-attached MCP difference に関する comparison の回帰失敗テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T655 [US3] literal settings/config diff、typed layer/value と owner-attached MCP difference、masking、accessibility、fallback、Copilot non-ownership、cleanup に関するブラウザー受け入れテストを `tests/e2e/settings-config-comparison.spec.ts` に追加する

### 実装

- [ ] T656 [US3] value を評価したり declaration を昇格したり Copilot MCP ownership を発明したりせず、既存の物理 owner ID を介して投影される owner-attached MCP で typed settings/configuration comparison row を `app/components/comparison/RecognitionComparison.vue` において拡張する
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

**目的**: マスク済み output-style ソース、layer、selection、surface availability、applicability 詳細を追加する。

**独立テスト**: 敵対的な style を開き、マスキング、closest-layer と selection condition、surface の不確実性、非活性な reference、診断、reveal cleanup を検証する。

**目に見えるチェックポイント**: output style を選択すると、その style を適用せずに安全な詳細を開ける。

### テストを先に

- [ ] T667 [P] [US2] closest-layer behavior、明示的な selection、surface availability、不確実性、evidence に関する失敗する metadata/applicability テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T668 [P] [US2] output-style Markdown と reference が非活性かつ非 navigable のままであることを証明する失敗テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T669 [US2] reciprocal contract reference を備えた、失敗する output-style runtime-composition graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T670 [US2] マスク済み output-style 詳細と selection condition に関するブラウザー受け入れテストを `tests/e2e/output-styles-detail.spec.ts` に追加する

### 実装

- [ ] T671 [US2] output-style layer、selection、applicability strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T672 [US2] output-style metadata、applicability、マスキング向けの Markdown 抽出と scan 統合を `src/inspection/parsers/markdown.ts` と `src/inspection/scan.ts` で拡張する
- [ ] T673 [US2] 型付き output-style 詳細フィールドを `app/components/inspection/RecognitionDetails.vue` で拡張する
- [ ] T674 [US2] 意味的に同等な英語/日本語の output-style 詳細、selection、surface、不確実性メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 67: Claude Output Styles の比較

**目的**: literal および型付きの output-style 差分を比較に追加する。

**独立テスト**: 二つの style を比較し、マスク済みソースに加えて、整列した layer、selection、surface availability、provenance、metadata を検証する。

**目に見えるチェックポイント**: どちらの style も適用せずに Claude output style を比較できる。

### テストを先に

- [ ] T675 [US3] layer、selection、surface availability、provenance、metadata に関する失敗する型付き比較 regression を `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T676 [US3] literal output-style diff と型付き metadata 差分に関するブラウザー受け入れテストを `tests/e2e/output-styles-comparison.spec.ts` に追加する

### 実装

- [ ] T677 [US3] 型付き output-style comparison row を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: マスク済み Codex catalog 詳細を追加し、次のフェーズ向けに local plugin-source declaration を安全に抽出する。

**独立テスト**: 不正または secret-bearing な catalog を開き、bounded JSON parsing、local source form、remote/absolute/home/traversal rejection、最初の128 declaration の保持、relationship-only component、マスキング、診断、plugin-target read ゼロを検証する。

**目に見えるチェックポイント**: Codex marketplace を選択すると、plugin manifest を開かずに authored entry と安全な local-source relationship が表示される。

### テストを先に

- [ ] T689 [P] [US2] authored entry、local source form、remote source type、missing field、不正な value、registration/installation uncertainty、正確な evidence に関する失敗する Codex marketplace metadata テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T690 [P] [US2] `./` form、catalog-relative containment、one-edge preparation、最初の128件の保持、129番目の target へアクセスしないこと、Git/HTTP/npm/absolute/home/traversal rejection に関する失敗する local-source validation テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T691 [P] [US2] catalog inspection が plugin read、install、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T692 [US2] reciprocal contract reference を備えた、失敗する Codex marketplace activation/relationship graph coverage を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T693 [US2] マスク済み Codex marketplace 詳細、local/remote source relationship、authored state、診断、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/codex-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T694 [US2] closed Codex catalog field と secret-safe source origin により bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T695 [US2] Codex marketplace の authored、registration、installation、activation、local-source、relationship strategy を `shared/registries/runtime-composition.ts` に追加する
- [ ] T696 [US2] bounded catalog metadata、検証済み local-source declaration、applicability、relationship、診断、evidence を備えるよう Codex recognition を `src/inspection/recognizers/codex.ts` で拡張する
- [ ] T697 [US2] atomic catalog parsing、recursive masking、最初の128 local-source の保持、relationship-only component、まだ derived read を行わないことを `src/inspection/scan.ts` に統合する
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

**目的**: マスク済み Claude catalog detail を追加し、candidate はまだ導出せずに local plugin-source declaration を検証し、受け入れ済み marketplace file に対してフェーズ 27 MCP owner adapter を有効化する。

**独立テスト**: 不正または secret-bearing な catalog を開き、optional/local source form、catalog-relative containment、remote relationship retention、first-128 bound、owner-attached MCP declaration、registration/activation uncertainty、masking、diagnostics、zero connection、plugin-target read ゼロを検証する。

**目に見えるチェックポイント**: Claude marketplace を選択すると、registration、activation、connection を主張せず、安全な authored metadata、source relationship、owner-attached MCP が表示される。

### テストを先に

- [ ] T709 [P] [US2] authored entry、optional manifest、local/remote source、フェーズ 27 MCP adapter activation、registration/activation uncertainty、不正な value、正確な evidence に関する失敗する Claude marketplace metadata テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T710 [P] [US2] 先頭の `./`、catalog-relative containment、最初の128件の保持、129番目の target へアクセスしないこと、禁止された Git/HTTP/npm/absolute/home/traversal source に関する失敗する Claude local-source validation テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T711 [P] [US2] Claude catalog inspection が registration、plugin read、import、script、hook、MCP、asset、remote fetch、cache inspection を行わないことを証明する zero-activation テストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T712 [US2] reciprocal contract reference を備えた Claude marketplace activation/relationship graph coverage とフェーズ 27 MCP owner-adapter binding の失敗テストを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T713 [US2] マスク済み Claude marketplace detail、source relationship、owner-attached MCP、authored state、zero connection、diagnostics、reveal cleanup に関するブラウザー受け入れテストを `tests/e2e/claude-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T714 [US2] closed Claude catalog field と secret-safe source origin により bounded JSON extraction を `src/inspection/parsers/json.ts` で拡張する
- [ ] T715 [US2] Claude marketplace の registration、activation、optional-manifest、local-source、relationship strategy を追加し、既存 MCP adapter を受け入れ済み marketplace behavior に `shared/registries/runtime-composition.ts` で関連付ける
- [ ] T716 [US2] bounded catalog metadata、検証済み local-source declaration、owner-gated MCP、applicability、relationship、diagnostics、evidence を備えるよう Claude recognition を `src/inspection/recognizers/claude.ts` で拡張する
- [ ] T717 [US2] derived read を行わず、Claude catalog parsing、recursive masking、最初の128 local-source の保持、synthetic file または connection を作成しない owner-attached MCP、relationship-only component を `src/inspection/scan.ts` に統合する
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

**目的**: マスク済み Copilot カタログの詳細を追加し、次の plugin フェーズに向けて有界なローカル plugin ソースを検証する。

**独立テスト**: 不正なカタログとシークレットを含むカタログを開き、`plugins/foo` と `./plugins/foo`、将来の四対象の導出順序、一エッジ/128 の境界、リモート関係の保持、VS Code/CLI のローカルソースプラン、ローカルプランを持たない Cloud の hosted/runtime-unavailable 状態、マスキング、診断、対象読み取りがゼロであることを検証する。

**目に見えるチェックポイント**: Copilot marketplace を選択すると、plugin manifest を読み取らずに、安全な作成済みエントリと有界なローカルソースプランが表示される。

### テストを先に

- [ ] T729 [P] [US2] 作成済みエントリ、推奨、既知の marketplace、ローカル/リモートソース形式、VS Code/CLI のローカル来歴、Cloud の hosted/runtime-unavailable 状態、インストール/有効化の不確実性、正確なエビデンスに対する失敗する Copilot marketplace メタデータテストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T730 [P] [US2] `plugins/foo` と `./plugins/foo`、カタログ内の包含、文書化された四対象の順序、一エッジ、最初の 128 件の保持、129 番目の対象にアクセスしないこと、禁止されたソース型に対する失敗するソース検証テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T731 [P] [US2] Copilot カタログの検査が install、plugin read、component load、hook execution、MCP connection、asset load、remote fetch、hosted-state query を一切行わないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T732 [US2] ローカルソースプランが VS Code/CLI だけに存在し、Cloud は hosted/runtime-unavailable のままであることを証明する、相互の契約参照を備えた失敗する Copilot marketplace activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T733 [US2] マスク済み Copilot marketplace の詳細、VS Code/CLI のソースプラン、Cloud の利用不可条件、診断、reveal のクリーンアップを対象とするブラウザ受け入れテストを `tests/e2e/copilot-marketplaces-detail.spec.ts` に追加する

### 実装

- [ ] T734 [US2] クローズドな Copilot カタログフィールドとシークレットを安全に扱うソース出所によって、有界な JSON 抽出を `src/inspection/parsers/json.ts` で拡張する
- [ ] T735 [US2] Copilot VS Code/CLI marketplace の登録、推奨、インストール、有効化、ローカルソース、関係の戦略に加え、ローカル来歴または検索を決して生成しない Cloud hosted/runtime-unavailable 戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T736 [US2] 有界なカタログメタデータ、VS Code/CLI だけの検証済みローカルソースプラン、Cloud の runtime-unavailable 条件、適用可能性、関係、診断、エビデンスによって Copilot 認識を `src/inspection/recognizers/copilot.ts` で拡張する
- [ ] T737 [US2] Copilot カタログの解析、再帰的マスキング、最初の 128 ソースの保持、導出読み取りを伴わない relationship-only のコンポーネントを `src/inspection/scan.ts` に統合する
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
- [ ] T742 [P] [US1] shared catalog の read-once、決定論的な marketplace/MCP recognition と provenance order、alias、source-plan limit、partial continuity、synthetic MCP file/connection ゼロ、plugin-target read ゼロに関する統合失敗テストを `tests/integration/repository-scan.test.ts` に追加する
- [ ] T743 [US1] 統合 marketplace inventory、filter、triple recognition、Claude owner-attached MCP、root-form order、exclusion、diagnostics、keyboard use に関するブラウザー受け入れテストを `tests/e2e/marketplaces-inventory.spec.ts` に追加する

### 実装

- [ ] T744 [US1] marketplace physical-file の read-once assembly、決定論的な multi-tool + owner-attached MCP provenance、source-plan retention、synthetic file がないこと、exclusion を `src/inspection/scan.ts` で完成させる
- [ ] T745 [US1] marketplace インベントリのフィルター、共有認識の要約、作成済み状態のラベルを `app/components/inventory/InventoryFilters.vue` と `app/components/inventory/InventoryItem.vue` で拡張する
- [ ] T746 [US1] 意味的に同等な英語/日本語の統合 marketplace、三重認識、作成済み状態、除外メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 75: Marketplaces 比較

**目的**: リテラルおよび型付き marketplace カタログ差分で比較を拡張する。

**独立テスト**: 読み取り可能な二つの catalog を比較し、plugin を導出または activate せずに、マスク済み source に加え、整列された entry、source type、local-source plan、owner-attached MCP、provenance、registration、installation、enablement、condition、uncertainty を検証する。

**目に見えるチェックポイント**: ユーザーは何も取得、インストール、アクティベートせずに marketplace カタログを比較できる。

### テストを先に

- [ ] T747 [US3] authored metadata、provenance、source type、registration、installation、enablement、実際の catalog owner ID を介した owner-attached MCP difference、uncertainty に関する marketplace comparison の失敗回帰テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T748 [US3] literal marketplace diff、typed source/activation-state と owner-attached MCP difference、masking、accessibility、fallback、cleanup に関するブラウザー受け入れテストを `tests/e2e/marketplaces-comparison.spec.ts` に追加する

### 実装

- [ ] T749 [US3] marketplace entry、source plan、authored state、provenance、既存の physical owner ID を介した owner-attached MCP、uncertainty に対する comparison row を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: 作成済み状態と relationship-only のコンポーネント宣言を備えた、マスク済み Codex manifest の詳細を追加し、一つだけの正確な非読み取り除外 `codex.excluded.plugin-files` を所有する。

**独立テスト**: 不正な manifest とシークレットを含む manifest を開き、必須のエントリメタデータ、marketplace の来歴、インストール/有効化/信頼の分離、Hook/MCP/app/skill/script/asset コンポーネントの関係、正確な `codex.excluded.plugin-files` の処理、MCP 候補を追加せずにフェーズ 23 の plugin パス不一致コンテキストを更新すること、マスキング、診断、コンポーネントの読み取りまたはアクティベーションがゼロであることを検証する。

**目に見えるチェックポイント**: Codex plugin manifest を選択すると、どのコンポーネントもロードせずに、安全な作成済みメタデータが表示される。

### テストを先に

- [ ] T763 [US2] 一つだけの正確な `codex.excluded.plugin-files` レコードを、最終的に影響を受ける振る舞い `codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` とともに具体化し、失敗するレジストリカバレッジを追加する。plugin コンポーネントパスが決して候補にならず、以前の MCP パス不一致ケースが影響を受ける振る舞いの集合を変えずにこの除外を参照できることを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T764 [P] [US2] 作成済みメタデータ、ローカル marketplace エントリ、インストール/有効化/信頼の分離、静的/導出来歴、relationship-only のコンポーネントに対する失敗する Codex plugin テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T765 [P] [US2] plugin コンポーネントの import、skill read、app load、hook execution、MCP connection、script/asset read、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T766 [US2] 相互の契約参照を備えた、失敗する Codex plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T767 [US2] マスク済み Codex plugin の詳細、作成済み状態、関係、来歴、診断、reveal のクリーンアップを対象とするブラウザ受け入れテストを `tests/e2e/codex-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T768 [US2] 一つだけの非読み取り `codex.excluded.plugin-files` レコードを、`codex.behavior.plugin.manifest`、`codex.behavior.repo.marketplace`、すでに所有されている `codex.behavior.user.plugins` への最終的な影響参照とともに追加する。フェーズ 23 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、install、cache、runtime-state の除外 ID は `shared/registries/inspection-rules.ts` に一切追加しない
- [ ] T769 [US2] クローズドな Codex plugin-manifest フィールドとシークレットを安全に扱うコンポーネント出所によって、有界な JSON 抽出を `src/inspection/parsers/json.ts` で拡張する
- [ ] T770 [US2] Codex plugin の authored、installed、enabled、trusted、local、activation、relationship の各戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T771 [US2] 有界な Codex plugin-manifest メタデータと relationship-only のコンポーネントを `src/inspection/recognizers/codex.ts` に実装する
- [ ] T772 [US2] アトミックな manifest 解析、再帰的マスキング、relationship-only のコンポーネント、正確な `codex.excluded.plugin-files` の診断、raw の破棄を `src/inspection/scan.ts` に統合する
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

**目的**: 任意の作成済みメタデータと relationship-only のコンポーネントを備えた、マスク済み Claude manifest の詳細を追加し、フェーズ 27 の MCP owner adapter を有効化して、一つだけの正確な非読み取り除外 `claude.excluded.plugin-files` を所有する。

**独立テスト**: 不正な、またはシークレットを含むルート/marketplace 由来の manifest を開き、任意フィールド、既定と明示的なコンポーネントの場所、登録/アクティベーションの不確実性、owner-attached MCP と relationship-only の MCP コンポーネントパス、Hook/skill/command/agent/style/script/asset の関係、MCP 候補または影響を受ける振る舞いを追加せずにフェーズ 25/27 のパス不一致診断を更新する正確な `claude.excluded.plugin-files` の処理、マスキング、診断、接続がゼロであること、コンポーネント読み取りがゼロであることを検証する。

**目に見えるチェックポイント**: Claude plugin manifest を選択すると、アクティベーションせずに、安全な作成済みメタデータとコンポーネントの関係が表示される。

### テストを先に

- [ ] T786 [US2] 一つだけの正確な `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに具体化し、失敗するレジストリカバレッジを追加する。このレコードが MCP 候補または影響を受ける振る舞いを追加せずにフェーズ 25/27 の MCP plugin-path 診断を更新し、plugin コンポーネントパスが決して候補にならないことを `tests/fixtures/conformance/inspection-rules.json` と `tests/contract/inspection-rules.test.ts` で証明する
- [ ] T787 [P] [US2] 作成済みメタデータ、任意の manifest、フェーズ 27 の MCP adapter 有効化、登録/アクティベーションの不確実性、既定/明示コンポーネントに対する失敗する Claude plugin テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T788 [P] [US2] Claude コンポーネントの import、skill/command/agent/style read、hook execution、MCP connection、script/asset load、registration、install、cache inspection、remote fetch が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T789 [US2] 相互の契約参照を備えた、失敗する Claude plugin activation/relationship グラフカバレッジとフェーズ 27 の MCP owner-adapter binding を `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T790 [US2] マスク済み Claude plugin の詳細、作成済み/任意状態、owner-attached MCP と relationship-only のコンポーネントパス、接続がゼロであること、診断、reveal のクリーンアップを対象とするブラウザ受け入れテストを `tests/e2e/claude-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T791 [US2] 一つの非読み取り `claude.excluded.plugin-files` レコードを、影響を受ける参照 `claude.behavior.repo.plugin` と `claude.behavior.repo.marketplace` だけとともに追加する。フェーズ 25/27 の MCP plugin-path 診断が MCP 候補または追加の影響を受ける振る舞いなしでこの除外を参照できるようにし、User、cache、install、runtime-state の除外 ID は `shared/registries/inspection-rules.ts` に追加しない
- [ ] T792 [US2] クローズドな Claude plugin-manifest フィールド、既定/明示の出所、シークレットを安全に扱うコンポーネントによって、有界な JSON 抽出を `src/inspection/parsers/json.ts` で拡張する
- [ ] T793 [US2] Claude plugin の登録、アクティベーション、optional-manifest、component-resolution、relationship の各戦略を追加し、既存の MCP adapter を受け入れ済み plugin の振る舞いへ `shared/registries/runtime-composition.ts` で結び付ける
- [ ] T794 [US2] 有界な Claude plugin-manifest メタデータ、owner-gated MCP、relationship-only のコンポーネントを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T795 [US2] Claude manifest の解析、再帰的マスキング、合成ファイルも接続もない owner-attached MCP、relationship-only のコンポーネント、MCP 候補を変えない更新済み plugin-path 除外診断、raw の破棄を `src/inspection/scan.ts` に統合する
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

**目的**: authored、recommended、installed、enabled、trusted、hosted の条件を個別に備えた、マスク済み Copilot manifest の詳細を追加する。

**独立テスト**: 不正な manifest とシークレットを含む manifest を開き、VS Code/CLI/Cloud 状態の分離、ツール横断のメタデータ、relationship-only の agents/skills/hooks/MCP/LSP/scripts/assets、extension 候補を生成しない既存の `copilot.excluded.cli-extensions` の回帰、マスキング、診断、コンポーネントのアクティベーションがゼロであることを検証する。

**目に見えるチェックポイント**: Copilot plugin manifest を選択すると、コンポーネントをロードせずに、作成済みメタデータと条件付きランタイム状態が表示される。

### テストを先に

- [ ] T809 [P] [US2] VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、ツール横断メタデータ、relationship-only のコンポーネント、および `copilot.excluded.cli-extensions` が plugin 候補を決して生成しないことの回帰に対する失敗する Copilot plugin テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T810 [P] [US2] script import、agent/skill/component read、hook execution、MCP connection、LSP start、asset load、remote fetch、installed/cache inspection が一切ないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T811 [US2] 相互の契約参照を備えた、失敗する Copilot plugin activation/relationship グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T812 [US2] マスク済み Copilot plugin の詳細、作成済み/ランタイム状態、関係、診断、reveal のクリーンアップを対象とするブラウザ受け入れテストを `tests/e2e/copilot-plugin-manifests-detail.spec.ts` に追加する

### 実装

- [ ] T813 [US2] クローズドな Copilot plugin-manifest フィールドとシークレットを安全に扱うコンポーネント出所によって、有界な JSON 抽出を `src/inspection/parsers/json.ts` で拡張する
- [ ] T814 [US2] Copilot VS Code/CLI/Cloud の登録、推奨、インストール、有効化、信頼、関係の各戦略を個別に `shared/registries/runtime-composition.ts` へ追加する
- [ ] T815 [US2] 有界な Copilot plugin-manifest メタデータと relationship-only のコンポーネントを `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T816 [US2] Copilot manifest の解析、再帰的マスキング、relationship-only のコンポーネント、除外、raw の破棄を `src/inspection/scan.ts` に統合する
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
- [ ] T821 [P] [US1] マスク済み導出メタデータの利用可能性、カタログ相対の来歴、最初の 128 件の保持、129 番目へのアクセスがないこと、共有ファイルを一度だけ読み取ること、Claude の owner-attached MCP、合成ファイルも接続もないこと、コンポーネントを展開しないことに対するローカル manifest 統合の回帰テストを `tests/integration/repository-scan.test.ts` に追加する
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

**独立テスト**: 読み取り可能な二つの manifest を比較し、アクティベーションも接続もせずに、マスク済みソースに加え、整列された作成済みメタデータ、形式/シードの来歴、登録、インストール、有効化、信頼、owner-attached MCP、コンポーネントの関係、不確実性を検証する。

**目に見えるチェックポイント**: ユーザーは、コンポーネントをロードまたは実行せずに plugin manifest を比較できる。

### テストを先に

- [ ] T829 [US3] 作成済みメタデータ、来歴、形式、登録、インストール、有効化、信頼、実際の manifest owner ID を介した owner-attached MCP の差分、関係、不確実性に対する失敗する plugin-manifest 比較の回帰テストを `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T830 [US3] plugin-manifest のリテラル差分、型付き状態/コンポーネントと owner-attached MCP の差分、マスキング、アクセシビリティ、フォールバック、クリーンアップを対象とするブラウザ受け入れテストを `tests/e2e/plugin-manifests-comparison.spec.ts` に追加する

### 実装

- [ ] T831 [US3] plugin-manifest の作成済み/ランタイム状態、来歴、既存の物理 owner ID を介した owner-attached MCP、コンポーネントの関係、不確実性に対する比較行を `app/components/comparison/RecognitionComparison.vue` で拡張する
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

**目的**: マスク済み Codex hook の詳細を追加し、インライン `[hooks]` 認識を既存の `.codex/config.toml` ファイルに関連付け、同じレイヤーのファイルとインライン宣言を必須警告とともに保持する。

**独立テスト**: 独立およびインラインの Codex hook を開き、加算的なマッチング、同じレイヤーの file-plus-inline の保持、警告メタデータ、信頼とイベントの条件、マスキング、診断、command、handler、process、URI、参照対象の実行がゼロであることを検証する。

**目に見えるチェックポイント**: Codex Hook 認識を選択すると、実行せずに正確な加算セマンティクスと警告が表示される。

### テストを先に

- [ ] T844 [P] [US2] 同じレイヤーのファイルとインライン宣言を必須警告とともに保持することに対する失敗する Codex hook テストを `tests/unit/inspection/codex-metadata.test.ts` に追加する
- [ ] T845 [US1] インライン Codex hook が既存の `.codex/config.toml` 物理ファイルに関連付けられ、合成ファイルを作成せず、独立 hook とは個別の来歴を保持することを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T846 [P] [US2] Codex hook の検査が command、process、import、evaluation、mutation、URI load、referenced-hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T847 [P] [US2] マスク済みコマンド、型付きイベント、加算的 composition、警告、条件、診断、古い ID に対する失敗する Codex hook 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T848 [US2] 相互の契約参照を備えた、失敗する Codex hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T849 [US2] 独立およびインライン Codex hook の詳細、警告、診断、共有設定への移動、実行可能なレンダリングがゼロであることを対象とするブラウザ受け入れテストを `tests/e2e/codex-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T850 [US2] Codex の加算的マッチング、信頼/イベント条件、同じレイヤーの file-plus-inline 警告戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T851 [US2] Codex のインライン認識、同じレイヤーの file-plus-inline の保持、来歴、警告メタデータを `src/inspection/recognizers/codex.ts` に実装する
- [ ] T852 [US2] 独立 Codex hook フィールドとシークレットを安全に扱う出所に対応するよう、JSON 抽出を `src/inspection/parsers/json.ts` で拡張する
- [ ] T853 [US2] インライン Codex hook フィールドとシークレットを安全に扱う出所に対応するよう、TOML 抽出を `src/inspection/parsers/toml.ts` で拡張する
- [ ] T854 [US2] Codex hook のマスキング、加算的 composition、条件、警告、追跡しない参照を `src/inspection/scan.ts` に統合する
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

**目的**: 同一コマンドの重複排除、完全な追加コンテキスト、制限的な判断順序を備えた、マスク済み Claude Hook の詳細を追加する。

**独立テスト**: すべての所有者 kind にわたる敵対的な内包宣言を開き、イベントフィールド、同一コマンドの重複排除、すべての追加コンテキストの保持、制限的な順序、マスキング、条件、診断、実行または参照先読み取りがゼロであることを検証する。

**目に見えるチェックポイント**: Claude Hook 認識を選択すると、実行せずに正確な composition セマンティクスが表示される。

### テストを先に

- [ ] T868 [P] [US2] 同一コマンドの重複排除、すべての追加コンテキストの保持、制限的な判断順序、所有者 kind、アクティベーション条件に対する失敗する Claude hook テストを `tests/unit/inspection/claude-metadata.test.ts` に追加する
- [ ] T869 [P] [US2] Claude hook の検査が command、process、import、evaluation、mutation、URI load、plugin hook read、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T870 [P] [US2] マスク済みコマンド、イベント、所有者来歴、composition、条件、診断、古い ID に対する失敗する Claude hook 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T871 [US2] 相互の契約参照を備えた、失敗する Claude hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T872 [US2] マスク済み Claude Hook の詳細、所有者来歴、dedup/context/order、診断、実行可能なレンダリングがゼロであることを対象とするブラウザ受け入れテストを `tests/e2e/claude-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T873 [US2] Claude hook の重複排除、追加コンテキスト、制限的順序、イベント、アクティベーションの各戦略を `shared/registries/runtime-composition.ts` に追加する
- [ ] T874 [US2] 同一コマンドの重複排除、すべての追加コンテキスト、制限的な判断順序、所有者来歴を備えた Claude 内包 hook のメタデータを `src/inspection/recognizers/claude.ts` に実装する
- [ ] T875 [US2] クローズドな Claude hook フィールドとシークレットを安全に扱う所有者出所によって JSONC、YAML、Markdown 抽出を `src/inspection/parsers/json.ts`、`src/inspection/parsers/yaml.ts`、`src/inspection/parsers/markdown.ts` で拡張する
- [ ] T876 [US2] Claude hook のマスキング、composition、条件、診断、追跡しない参照を `src/inspection/scan.ts` に統合する
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

**目的**: マスク済み Copilot Hook の詳細を追加し、内包認識は settings と custom-agent の所有者だけに関連付ける。plugin hook のコンポーネントパスは関係のままとし、パスから認識を決して作成しない。

**独立テスト**: 独立および settings/agent 内包の Copilot hook を開き、agent の追加を伴う VS Code workspace の同一イベント優先、CLI の追加順序、Cloud の Repository-only の振る舞い、所有者来歴、relationship-only の plugin hook パス、plugin-path 認識がないこと、マスキング、条件、診断、実行がゼロであることを検証する。

**目に見えるチェックポイント**: Copilot Hook 認識を選択すると、実行せずに正確な surface composition が表示される。

### テストを先に

- [ ] T888 [P] [US2] agent の追加を伴う VS Code workspace の同一イベント優先、CLI ソースの追加順序、Cloud の Repository-only の振る舞い、settings/agent の所有者来歴、relationship-only の plugin hook パスに対する失敗する Copilot hook テストを `tests/unit/inspection/copilot-metadata.test.ts` に追加する
- [ ] T889 [US1] settings/agent hook だけが既存の物理ファイルに関連付けられ、plugin コンポーネントパスが Hook 認識または合成候補を作成せず、内包来歴が独立来歴とは個別に維持されることを証明する失敗する認識テストを `tests/unit/inspection/recognizers.test.ts` に追加する
- [ ] T890 [P] [US2] Copilot hook の検査が command、process、import、mutation、URI load、referenced-hook read、plugin activation、handler invocation を一切引き起こさないことを証明するゼロアクティベーションテストを `tests/integration/security/zero-activation.test.ts` に追加する
- [ ] T891 [P] [US2] マスク済みコマンド、イベント、surface、所有者来歴、composition、条件、診断、古い ID に対する失敗する Copilot hook 詳細 API テストを `tests/contract/http-api-files.test.ts` に追加する
- [ ] T892 [US2] 相互の契約参照を備えた、失敗する Copilot hook runtime-composition グラフカバレッジを `tests/contract/runtime-composition.test.ts` に追加する
- [ ] T893 [US2] 独立/内包 Copilot Hook の詳細、surface 順序、所有者への移動、診断、実行可能なレンダリングがゼロであることを対象とするブラウザ受け入れテストを `tests/e2e/copilot-hooks-detail.spec.ts` に追加する

### 実装

- [ ] T894 [US2] Copilot VS Code の settings/agent priority/additions、CLI append-order、Cloud Repository-only、relationship-only の plugin path、event、activation の各戦略を個別に `shared/registries/runtime-composition.ts` へ追加する
- [ ] T895 [US2] settings/agent 所有者だけの内包認識、relationship-only の plugin hook パス、来歴、条件メタデータを備えた Copilot の surface composition を `src/inspection/recognizers/copilot.ts` に実装する
- [ ] T896 [US2] クローズドな Copilot hook フィールドとシークレットを安全に扱う所有者出所によって JSONC と Markdown の抽出を `src/inspection/parsers/json.ts` と `src/inspection/parsers/markdown.ts` で拡張する
- [ ] T897 [US2] Copilot hook のマスキング、settings/agent 所有者の composition、認識を伴わない plugin-path 関係の保持、条件、診断、追跡しない参照を `src/inspection/scan.ts` に統合する
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

**独立テスト**: 所有者を介した内包 Hook 宣言を含め、現行世代の読み取り可能な物理 owner/file ID を正確に二つ選択する。マスク済みソースに加え、整列されたイベント、ソース順序、重複排除、優先度、composition、来歴、警告、不確実性を検証し、合成 ID と runtime-fact-only 行を拒否する。

**目に見えるチェックポイント**: ユーザーは hook 宣言を実行せずに比較できる。

### テストを先に

- [ ] T908 [US3] 実際に読み取り可能な物理ファイル ID、所有者 ID を介した内包 Hook、ランタイムの事実の拒否、イベント、順序、composition、来歴、警告、アクティベーションの不確実性に対する、失敗する選択および型付き比較の回帰テストを `tests/unit/app/comparison.test.ts` と `tests/unit/app/recognition-comparison.test.ts` に追加する
- [ ] T909 [US3] 所有者を介して選択した内包 Hook、Hook のリテラル差分、型付きイベント/composition の差分、runtime-fact-only の選択拒否を対象とするブラウザ受け入れテストを `tests/e2e/hooks-comparison.spec.ts` に追加する

### 実装

- [ ] T910 [US3] 実際に読み取り可能な物理 owner/file ID による比較選択を強制し、内包 Hook 認識をその所有者を通じて `app/composables/comparison.ts` で解決する
- [ ] T911 [US3] ランタイムの事実を選択可能なファイルとして公開せずに、型付き Hook 比較行を `app/components/comparison/RecognitionComparison.vue` で拡張する
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
- [ ] T916 [P] [US1] すべての Repository kind、厳密なエンベロープ、進捗、競合、古い ID、アトミックな公開、安全な失敗について、完全な session/rescan API 契約を `tests/contract/http-api-session.test.ts` に追加する
- [ ] T917 [P] [US1] 分離インストール、固定 assets/Worker、同一 tarball、起動時の `cwd`、フォールバック URL、シャットダウン、拒否されるモードについて、完全なパッケージ済み CLI テストを `tests/package/npx-launch.test.ts` に追加する
- [ ] T918 [P] [US1] 1 秒以内のステータス、10 秒以内のインベントリ、100 ms 未満のフィルタリング/選択の性能テストを `tests/performance/repository-scan.test.ts` と `tests/performance/inventory-interactions.test.ts` で完成させる
- [ ] T919 [US1] インベントリ、フィルター、複数認識、診断、空状態、再スキャン、再試行、キーボード操作、アトミックな置換について、Repository 全体を対象とするブラウザ受け入れテストを `tests/e2e/repository-complete-inventory.spec.ts` に追加する

---

## フェーズ 93: Repository 詳細の受け入れ

**目的**: 先行するすべての Repository 詳細増分が、包括的な実装を用いずに US2 を満たすことを検証する。

**独立テスト**: 現在所有されている完全な 48 ID の Repository ルールレジストリ（35 個の静的、5 個の有界導出、7 個のベンダー除外、1 個の共有シンボリックリンク除外）に加え、延期された Global 時代の 4 個の除外が明示的に存在しないこと、パーサーマトリクス、詳細の正確な上限、安全なファイルシステム境界、後段で所有者に結び付くすべての MCP adapter の有効化、アクティベーション/接続がゼロであること、file/reveal API、マスキング、関係、診断、古い状態のクリーンアップ、内包 Hook/MCP の事実による候補ルールの追加または所有者読み取りの重複がゼロであることを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US2 の安全な詳細が完成する。

### 受け入れテスト

- [ ] T920 [P] [US2] 現在所有されている正確な 48 ID の内訳（35 個の静的、5 個の有界導出、7 個のベンダー除外、1 個の共有シンボリックリンク除外）、延期された 4 個の除外が存在しないこと、内包 Hook/MCP の候補ルールがゼロであること、前段の契約から後段の所有者有効化までの完全なマトリクス、一つの所有者 ID/読み取り、合成ファイル/接続がゼロであること、現在所有されているすべての behavior/strategy/relationship/evidence バックリンク、相互フィンガープリント、オフライン分離について、Repository サブグラフ契約を `tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T921 [P] [US2] JSONC、YAML、TOML、Markdown/frontmatter、厳密なエンコーディング、アトミックな抽出、Worker 置換、正確な境界について、4 パーサーのマトリクステストを `tests/unit/inspection/parsers.test.ts` と `tests/unit/inspection/seed-parsers.test.ts` に追加する
- [ ] T922 [US2] 関係、来歴、導出、フォールバック、マスク、マスク済みテキスト、パーサー境界について、正確な上限値と 1 超過時のテストを `tests/integration/limits.test.ts` に追加する
- [ ] T923 [US2] ソース/評価の事実、診断の上限、センチネル、有界な部分継続について、正確な上限値と 1 超過時のテストを `tests/integration/limits.test.ts` に追加する
- [ ] T924 [P] [US2] 不正ファイル、リンク、トラバーサル、循環、変更、読み取り後の検証、バイトの破棄、`O_NOFOLLOW`、OS の残存リスクについて、完全な安全性テストを `tests/integration/inspection-safety.test.ts` に追加する
- [ ] T925 [P] [US2] プロセス、評価/import、MCP、ネットワーク、URI/image、書き込み、参照先の読み取りについて、すべての Repository ファミリーにわたるゼロアクティベーションの回帰テストを `tests/integration/security/zero-activation.test.ts` で拡張する
- [ ] T926 [P] [US2] すべての kind、厳密なエンベロープ、古い ID、no-store、マスキングのオーバーフロー、安全な失敗について、完全なファイル詳細/reveal API 契約を `tests/contract/http-api-files.test.ts` と `tests/contract/http-api-reveals.test.ts` に追加する
- [ ] T927 [US2] マスク済み詳細、メタデータ、関係、reveal、診断、古いルート、実行可能なレンダリングがゼロであることについて、Repository 全体を対象とするブラウザ受け入れテストを `tests/e2e/repository-complete-detail.spec.ts` に追加する

---

## フェーズ 94: Repository 比較の受け入れ

**目的**: 先行するすべての Repository 比較増分が、包括的な実装を用いずに US3 を満たすことを検証する。

**独立テスト**: すべてのファミリーから代表ファイルを比較し、後段で受け入れられた実際のすべての所有者 ID を介した MCP を含めて、リテラル/型付き差分、runtime-only/dormant 選択の拒否、フォールバック、アクセシビリティ、古い状態の無効化、クライアントリソースの完全なクリーンアップを検証する。

**目に見えるチェックポイント**: 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。

### 受け入れテスト

- [ ] T928 [US3] すべての Repository kind にわたる、選択、reveal、Monaco モデル、購読、raw レコード、後段所有者の MCP projection、古い ID の再スキャン時の無効化について、ライフサイクルの回帰テストを `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T929 [US3] リテラル比較、型付き差分、実際の所有者 ID を介した後段所有者の MCP 選択、runtime-only/dormant の拒否、フォールバックの振る舞い、アクセシビリティ、ライフサイクルのクリーンアップについて、Repository 全体を対象とするブラウザ受け入れテストを `tests/e2e/repository-complete-comparison.spec.ts` に追加する

---

## フェーズ 95: Global 同意プレビュー

**目的**: User-Global パスが承認される前に、正確かつ有界で I/O を行わないプレビューを表示し、同意の除外に必要な残りの純粋な User-only の振る舞いの事実を完成させる。

**独立テスト**: 分離された環境入力と偽のホームを使用し、提案パスに対する I/O がゼロであること、正確な 3 ツールのプレビュー項目、32 KiB の入力上限と 192 KiB のエスケープ済み表示上限、不正なオーバーライド、バージョン付きダイジェストのバインディング、古い/再生された要求の拒否、アクセシブルな二言語レビュー、`codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` の読み取り権限を付与しない一度限りの所有を検証する。

**目に見えるチェックポイント**: ユーザーは検査を有効にする前に、正確な Global ルート、パターン、除外、上限、契約バージョンを確認できる。

### フィクスチャとテストを先に

- [ ] T930 [US4] 正確な候補、除外、フォールバック、不正なオーバーライド、リンク、エイリアス、シークレット、読み取り不能なルートを対象とする分離 Global-home フィクスチャを、二言語の利用ガイダンスとともに `tests/fixtures/global-homes/build-fixtures.ts`、`tests/fixtures/global-homes/README.md`、`tests/fixtures/global-homes/README.ja.md` に作成する
- [ ] T931 [US4] 残りの純粋な User-only の事実 `codex.behavior.user.memories`、`codex.behavior.user.prompts`、`claude.behavior.user.workflows` を具体化し、それらに対する失敗するレジストリ/バックリンクのカバレッジを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/official-sources.json`、`tests/contract/vendor-behaviors.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T932 [P] [US4] ファイルシステム I/O がゼロであること、存在しないオーバーライドと不正なオーバーライドの区別、正確な字句上のルート、32 KiB の入力、192 KiB のエスケープ済み出力、固定された null のサイズ超過状態について、失敗するプレビューテストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T933 [US4] 順序付きセッションキーによるダイジェストのバインディング、固定形式の検証入力、古い/再生された要求の無効化、正確な有効化可能ツール状態について、プレビューテストを `tests/unit/host/global-consent.test.ts` で拡張する
- [ ] T934 [P] [US4] 正確なレスポンス形式、ステータス、上限、クライアントパスの権限がないこと、no-store の振る舞い、提案ルートへの I/O がゼロであることについて、失敗する `GET /api/v1/global/consent-preview` 契約を `tests/contract/http-api-global.test.ts` に追加する
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

**目的**: 有効化エンドポイントを通じて保存済みの正確なプレビューを検証し、ファイル行/グラフがゼロの `scanning` 状態で有効な 1 つの論理 Global Source を公開し、その Source に Codex 境界を受け入れる。

**独立テスト**: プレビューに正確にバインドされた有効化ボディを送信し、独立した確認エンドポイントを用いずに false/古い/不一致の要求を拒否する。受け入れられた要求が、有効で `scanning` 状態の正確に 1 つの Global Source を、Global ファイル行/グラフがゼロの状態ですぐに公開することを検証する。Codex 境界とセレクターだけを受け入れ、致命的な失敗時には Source、同意、受け入れ済み境界、以前の Repository グラフを保持し、正確に `codex.excluded.user-runtime` を所有する。

**目に見えるチェックポイント**: インベントリに、有効で `scanning` 状態の 1 つの Global Source が Codex の受け入れ進捗とともに表示され、Global ファイル行はまだ存在しない。

### テストを先に

- [ ] T944 [P] [US4] 正規ルート、リンク、junction、case/Unicode/short-name エイリアス、不正なオーバーライド、空でないオーバーライドのフォールバック、安全な診断について、失敗する Codex 同意後境界受け入れテストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T945 [P] [US4] 失敗する `POST /api/v1/global/enable` 契約として、`confirmed: true`、正確な version/preview/digest バインディング、false/古い/不一致の拒否、エイリアス診断、競合、即時の 1 Source `scanning` 公開、待機中の進捗、確認エンドポイントがないことを `tests/contract/http-api-global.test.ts` に追加する
- [ ] T946 [P] [US4] FIFO 受け入れ、デキュー時の世代、重複競合、グラフがゼロの有効な 1 つの `scanning` Source、プロセスの存続期間中に安定する `Source.sourceId`、進捗遷移、致命的な失敗時の Source/同意/境界/以前のグラフの保持、世代所有 ID の処理について、失敗する初回有効化コーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T947 [P] [US4] Codex Global 命令セットだけを対象とし、Codex Global の skills/agents/config/hooks/MCP/plugins/rules/state/credentials/logs/caches の読み取りがゼロであること、Global ファイル/グラフがゼロの公開済み `scanning` Source、Repository の維持について、境界テストを `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T948 [US4] 参照だけの Codex User 振る舞いセット、`codex.global.instructions`、正確な `codex.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T949 [US4] 有効化前にすべての Codex User 振る舞いがすでに所有されていたこと、`codex.global.instructions` が読み取りを新たに許可する唯一の Codex ルールであること、`codex.excluded.user-runtime` が新たに所有される唯一の Codex 除外であることを証明する、失敗する Codex Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T950 [US4] 正確なプレビューの送信、有効で `scanning` 状態の 1 つの Global Source、Codex の待機/受け入れ進捗、安全な境界診断、Global ファイル行がゼロであること、保持された Repository 結果について、ブラウザ受け入れテストを `tests/e2e/global-codex-admission.spec.ts` に追加する

### 実装

- [ ] T951 [US4] リンクと露出したエイリアスの差異を拒否し、有効な Source に対して受け入れ済みの同意/境界状態を保持する、同意後の Codex 境界受け入れを `src/host/global-consent.ts` に実装する
- [ ] T952 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `codex.behavior.user.instructions`、`codex.behavior.user.agents`、`codex.behavior.user.config`、`codex.behavior.user.hooks`、`codex.behavior.user.memories`、`codex.behavior.user.plugins`、`codex.behavior.user.prompts`、`codex.behavior.user.rules`、`codex.behavior.user.skills` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T953 [US4] 同意でゲートされた読み取り許可ルールとして `codex.global.instructions` だけを追加し、既存の除外レコードを一切変更せず、正確に新しい非読み取りの `codex.excluded.user-runtime` を `shared/registries/inspection-rules.ts` で所有する
- [ ] T954 [US4] 新しい戦略 ID を作成せず、既存の Codex 命令戦略を Global 選択、フォールバック、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T955 [US4] 新しいソース ID を作成せず、Codex Global のカバレッジについて既存の公式ソースレコードのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T956 [US4] 同意済み境界の配下で、空でない Codex `AGENTS.override.md`、それ以外の場合は `AGENTS.md` だけを処理し、正確な `codex.excluded.user-runtime` の強制を `src/inspection/rules/codex.ts` に実装する
- [ ] T957 [US4] すでに公開済みの Source が `scanning` のままである間、Global ファイルグラフのコミットを保留し、分離された Codex 境界のスキャン、フォールバック、上限付き診断を `src/inspection/scan.ts` に実装する
- [ ] T958 [US4] 初回有効化の検証、ファイル/グラフがゼロで有効な正確に 1 つの論理 Global Source の `scanning` 状態での即時公開、FIFO 受け入れ、デキュー時のスナップショット、重複拒否、進捗、致命的な失敗時の Source、同意、受け入れ済み境界、以前のグラフの保持を `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T959 [US4] 正確な保存済みプレビューの検証、定数時間のダイジェスト比較、境界診断、進捗、競合、クライアントパスの権限がないことを備えた `POST /api/v1/global/enable` だけを `src/host/api-router.ts` に実装する
- [ ] T960 [US4] 古いプレビューからの回復とアクセシブルなフォーカス処理を備え、明示確認コントロールを有効化エンドポイントへ直接接続する処理を `app/pages/global-consent.vue` に実装する
- [ ] T961 [US4] Global の有効化/進捗コントロールを `app/components/consent/GlobalSourceControls.vue` に実装する
- [ ] T962 [US4] 意味的に同等な英語/日本語の Codex Global 受け入れ、有効な scanning Source、ファイルがゼロの保留状態、境界、フォールバック、進捗メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 97: Claude Global 境界の受け入れ

**目的**: 同じ有効な `scanning` Global Source を Claude 境界の受け入れと正確な `CLAUDE.md` の進捗によって拡張し、そのファイルグラフは空のまま保つ。

**独立テスト**: 有効および無効な Claude 境界を Codex から独立して受け入れ、正確に同じ論理 Global Source を `scanning` のまま保ち、同意済みの `CLAUDE.md` だけを読み取り、正確に `claude.excluded.user-runtime` を所有し、失敗時に Source/同意/受け入れ済み境界/以前のグラフの状態と兄弟の診断を保持し、Global ファイル行/グラフをゼロのまま保つ。

**目に見えるチェックポイント**: 既存の `scanning` Global Source が Codex と並べて Claude の受け入れを報告し、Global ファイル行はまだ存在しない。

### テストを先に

- [ ] T963 [P] [US4] 正規ルート、リンク、エイリアス、不正なオーバーライド、欠落/読み取り不能ファイル、兄弟の独立性、安全な診断について、失敗する Claude 同意後境界テストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T964 [P] [US4] Claude Global の `CLAUDE.md` だけを対象とし、隣接するすべての User/runtime surface の読み取りがゼロであること、Global ファイル/グラフがゼロの同じ `scanning` Source、致命的な状態の保持、Repository の維持について、境界テストを `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T965 [US4] 参照だけの Claude User 振る舞いセット、`claude.global.instructions`、正確な `claude.excluded.user-runtime`、composition、エビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に具体化する
- [ ] T966 [US4] 有効化前にすべての Claude User 振る舞いがすでに所有されていたこと、`claude.global.instructions` が読み取りを新たに許可する唯一の Claude ルールであること、`claude.excluded.user-runtime` が新たに所有される唯一の Claude 除外であることを証明する、失敗する Claude Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T967 [US4] 有効で `scanning` 状態の同じ Source、Claude の待機/受け入れ進捗、兄弟の診断、Global ファイル行がゼロであること、保持された Repository 結果について、ブラウザ受け入れテストを `tests/e2e/global-claude-admission.spec.ts` に追加する

### 実装

- [ ] T968 [US4] リンクと露出したエイリアスの差異を拒否し、既存の有効な Source の受け入れ済み境界状態を拡張する、同意後の Claude 境界受け入れを `src/host/global-consent.ts` に実装する
- [ ] T969 [US4] 振る舞い ID を追加または再定義せず、すでに所有されている `claude.behavior.user.instructions`、`claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` を、Global ルール/除外への相互参照で `shared/registries/vendor-behaviors.ts` において更新する
- [ ] T970 [US4] 同意でゲートされた読み取り許可ルールとして `claude.global.instructions` だけを追加し、正確に非読み取りの `claude.excluded.user-runtime` レコードを `shared/registries/inspection-rules.ts` で所有する
- [ ] T971 [US4] 新しい戦略 ID を作成せず、既存の Claude 命令戦略を Global 選択、適用可能性、ソース分離の入力によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T972 [US4] ソース ID を作成せず、Claude Global のカバレッジについて既存の公式ソースのバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T973 [US4] 同意済み境界の配下で Claude `CLAUDE.md` だけを処理し、正確な `claude.excluded.user-runtime` の強制を `src/inspection/rules/claude.ts` に実装する
- [ ] T974 [US4] 既存の Source が `scanning` のままである間、Global ファイルグラフのコミットを保留し、分離された Claude 境界のスキャンと兄弟に安全な診断を `src/inspection/scan.ts` に実装する
- [ ] T975 [US4] Global ファイル/グラフをゼロのままにして致命的な失敗時の Source/同意/境界/以前のグラフの状態を保持しながら、同じ有効な `scanning` Source を、独立した Claude の受け入れと進捗によって `src/session/session.ts` で拡張する
- [ ] T976 [US4] 意味的に同等な英語/日本語の Claude Global 受け入れ、正確な除外、兄弟、同じ Source の進捗、ファイルがゼロの保留メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 98: Copilot Global 境界の受け入れ

**目的**: 同じ有効な `scanning` Global Source を Copilot 境界と 2 つの正確な命令セレクターによって拡張し、同時に `copilot.excluded.user-runtime` と 1 つだけの共有 `shared.excluded.managed-remote-state` を所有する。

**独立テスト**: 有効および無効な `COPILOT_HOME` 境界を受け入れ、同じ論理 Source を `scanning` のまま保ち、`copilot-instructions.md` と `instructions/**/*.instructions.md` だけを読み取り、不正なオーバーライドをフォールバックせずに拒否する。受け入れた 3 つの命令振る舞いだけを対応する Global 静的ルールに割り当て、残りの 16 個の Copilot User 振る舞いだけを `copilot.excluded.user-runtime` に割り当て、契約で定められた Claude/Codex User と 5 個の Cloud 振る舞いだけを `shared.excluded.managed-remote-state` に割り当てる。失敗時には Source/同意/受け入れ済み境界/以前のグラフの状態と兄弟の診断を保持し、Global ファイル行/グラフをゼロのまま保つ。

**目に見えるチェックポイント**: 既存の `scanning` Global Source が 3 ベンダーすべての受け入れを報告しながら、Global ファイル行は引き続きゼロのままになる。

### テストを先に

- [ ] T977 [P] [US4] 存在しない/既定のオーバーライドと不正なオーバーライドの区別、正規ルート、リンク、エイリアス、欠落/読み取り不能ファイル、兄弟の独立性、安全な診断について、失敗する Copilot 同意後境界テストを `tests/unit/host/global-consent.test.ts` に追加する
- [ ] T978 [P] [US4] 2 つの正確な Copilot Global 命令セットを対象とし、隣接するすべての User/runtime/managed-remote surface の読み取りがゼロであること、Global ファイル/グラフがゼロの同じ `scanning` Source、致命的な状態の保持、Repository の維持について、境界テストを `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T979 [US4] 参照だけの Copilot 振る舞いの分割を具体化する。すなわち、`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞いは `copilot.excluded.user-runtime` だけ、契約で定められた Claude/Codex User と 5 個の Cloud 振る舞いだけは `shared.excluded.managed-remote-state` に対応させ、composition とエビデンス行を `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` に追加する
- [ ] T980 [US4] 受け入れた 3 つの振る舞いから Global ルールへの正確なバックリンク、残りの 16 個から `copilot.excluded.user-runtime` への正確なバックリンク、契約対象だけの共有 managed 影響セット、分割をまたぐバックリンクがないこと、新たに読み取りを許可するのが `copilot.global.instructions.root` と `copilot.global.instructions.path` だけであること、新たに所有されるベンダー除外が 1 つ、共有除外が 1 つであることを証明する、失敗する Copilot Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T981 [US4] 有効で `scanning` 状態の同じ Source、Copilot の待機/受け入れ進捗、不正なオーバーライドの診断、Global ファイル行がゼロであること、保持された Repository 結果について、ブラウザ受け入れテストを `tests/e2e/global-copilot-admission.spec.ts` に追加する

### 実装

- [ ] T982 [US4] 存在しない/既定のオーバーライドと不正なオーバーライドを区別し、リンク/エイリアスを拒否し、既存の有効な Source の受け入れ済み境界状態を拡張する、同意後の Copilot 境界受け入れを `src/host/global-consent.ts` に実装する
- [ ] T983 [US4] すでに所有されている振る舞いを、互いに素な 3 つの相互バックリンクセットで更新する。`copilot.behavior.cli.user.instructions.root` は `copilot.global.instructions.root` だけ、`copilot.behavior.cli.user.instructions.path` と `copilot.behavior.vscode.user.instructions` は `copilot.global.instructions.path` だけ、残りの 16 個の Copilot User 振る舞い（`copilot.behavior.vscode.user.claude`、`copilot.behavior.vscode.user.skills`、`copilot.behavior.vscode.user.agents`、`copilot.behavior.vscode.user.prompts`、`copilot.behavior.vscode.user.hooks`、`copilot.behavior.vscode.user.mcp`、`copilot.behavior.vscode.user.settings`、`copilot.behavior.vscode.user.plugins`、`copilot.behavior.cli.user.skills`、`copilot.behavior.cli.user.agents`、`copilot.behavior.cli.user.hooks`、`copilot.behavior.cli.user.mcp`、`copilot.behavior.cli.user.settings`、`copilot.behavior.cli.user.plugins`、`copilot.behavior.cli.user.lsp`、`copilot.behavior.cli.user.extensions`）は `copilot.excluded.user-runtime` だけ、契約で定められた共有 managed セット（`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.settings`、`codex.behavior.user.config`、`codex.behavior.user.plugins`、`copilot.behavior.cloud.mcp`、`copilot.behavior.cloud.organization-agents`、`copilot.behavior.cloud.organization-instructions`、`copilot.behavior.cloud.plugins`、`copilot.behavior.cloud.remote-skills`）は `shared.excluded.managed-remote-state` だけに対応させ、振る舞い ID を追加または再定義せずに `shared/registries/vendor-behaviors.ts` で更新する
- [ ] T984 [US4] 正確な 3 つの受け入れ済み振る舞い参照を持つ `copilot.global.instructions.root` と `copilot.global.instructions.path` だけを追加し、残りの 16 個の User 振る舞い参照だけを持つ正確な `copilot.excluded.user-runtime` を所有し、契約で定められた Claude/Codex User と 5 個の Cloud 参照だけを持つ 1 つの共有非読み取り `shared.excluded.managed-remote-state` を `shared/registries/inspection-rules.ts` に追加する
- [ ] T985 [US4] 新しい戦略 ID を作成せず、既存の Copilot CLI/VS Code 命令戦略を Global の適用可能性とソース分離によって `shared/registries/runtime-composition.ts` で拡張する
- [ ] T986 [US4] ソース ID を作成せず、正確な受け入れ済み 3 件の Global ルール、残り 16 件の User-runtime、契約で定められた shared-managed の各分割について、既存の公式ソースバックリンクを `shared/registries/official-sources.ts` で更新する
- [ ] T987 [US4] 同意済み境界の配下で Copilot `copilot-instructions.md` と `instructions/**/*.instructions.md` だけを処理し、正確な `copilot.excluded.user-runtime` と `shared.excluded.managed-remote-state` の強制を `src/inspection/rules/copilot.ts` に実装する
- [ ] T988 [US4] 既存の Source が `scanning` のままである間、Global ファイルグラフのコミットを保留し、分離された Copilot 境界のスキャン、有界なサブツリー処理、兄弟に安全な診断を `src/inspection/scan.ts` に実装する
- [ ] T989 [US4] Global ファイル/グラフをゼロのままにして致命的な失敗時の Source/同意/境界/以前のグラフの状態を保持しながら、同じ有効な `scanning` Source を、独立した Copilot の受け入れと進捗によって `src/session/session.ts` で拡張する
- [ ] T990 [US4] 意味的に同等な英語/日本語の Copilot Global オーバーライド、受け入れ、正確な除外、兄弟、同じ Source の進捗、ファイルがゼロの保留メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 99: 1 Source の Global 結果統合

**目的**: フェーズ 96 ですでに公開された 1 つの論理的で有効な Global Source に対して、最初のアトミックな ready/partial ファイルグラフのコミットを実行する。

**独立テスト**: 0～3 個の適格な境界を完了し、プロセスの存続期間中に安定する既存の `Source.sourceId` が、最初のアトミックなグラフコミットとともに `scanning` から `ready` または `partial` へ遷移する一方、世代が所有する file、recognition、provenance、relationship、mask、および関連するグラフ ID だけが再キー化されることを検証する。さらに、独立した境界失敗、Global 前の 48 ID ゲートと延期された 4 個の非読み取り除外および 4 個の Global 静的ルールから成る正確な 56 ルールの合計、兄弟の継続、Repository の維持、ソース分離、詳細/比較の再利用、除外された Global surface の読み取りがないことを検証する。致命的な試行では、有効な Source、同意、受け入れ済み境界、以前のグラフを保持する。

**目に見えるチェックポイント**: すでに表示されている Global Source に、最初の ready/partial ファイル行がアトミックに追加され、詳細/比較ワークフローを再利用できる。

### テストを先に

- [ ] T991 [P] [US4] 正確な 3 ベンダーの命令セット、最大 3 境界、すでに公開済みの論理 Source、最初のアトミックな ready/partial グラフコミット、すべての正確な除外 Global surface の読み取りがゼロであること、兄弟の継続、Repository の維持について、統合境界テストを `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T992 [US4] 正確に 56 個のルール ID（Global 前の 48 ID ゲートに、3 つのベンダー `*.excluded.user-runtime` レコード、`shared.excluded.managed-remote-state`、4 個の Global 静的読み取り許可ルールを加えたもの）、正確な除外の所有、相互性、内包 Hook/MCP による候補追加がゼロであること、既存ソースへのエビデンスバックリンクを証明する、最終 Global レジストリ契約を `tests/contract/vendor-behaviors.test.ts`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts` に追加する
- [ ] T993 [P] [US4] 既存 Source への最初のアトミックなグラフコミット、安定した `Source.sourceId`、`scanning`→`ready`/`partial` の遷移、最大 3 境界の結果、世代所有グラフの再キー化、兄弟の失敗、有界な部分コミット、致命的な失敗時の Source/同意/境界/以前のグラフの保持、進捗、重複競合について、コーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T994 [P] [US4] Repository と Global の `Source.sourceId` 値がプロセスの存続期間中に安定したまま、file、recognition、provenance、relationship、mask、および関連する世代所有 ID が再キー化されることを、古い detail/reveal/comparison のクリーンアップと保留中の受け入れ漏洩がないこととともに証明するライフサイクルテストを `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T995 [US4] 正確なプレビューによる有効化、既存 Source の `scanning` から `ready`/`partial` への遷移、最初のアトミックな行、1 Source のフィルター、兄弟の診断、Global の詳細/比較の再利用、致命的な失敗時の保持、Repository の維持について、ブラウザ受け入れテストを `tests/e2e/global-enable.spec.ts` に追加する

### 実装

- [ ] T996 [US4] 同意後のツール別受け入れを、最大 3 エントリと適格な兄弟の独立した保持を備えた、すでに有効な Source の境界セットとして `src/host/global-consent.ts` で完成させる
- [ ] T997 [US4] すべての Global 振る舞い、正確に 4 個の Global 静的候補ルール、既存の正確な除外、戦略参照、47 個のソースバックリンク、正確な 56 ルールの合計を `shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts` で完成させる
- [ ] T998 [US4] Repository 結果を維持しながら、統合されたツール別 Global スキャン、兄弟の継続、Codex フォールバック、およびすでに公開済みの Source に対する最初の有界な ready/partial ファイルグラフ結果を `src/inspection/scan.ts` に実装する
- [ ] T999 [US4] すべての受け入れ完了後、すでに公開済みの Source に最初の ready/partial Global ファイルグラフをアトミックにコミットし、Repository と Global の `Source.sourceId` を維持し、file、recognition、provenance、relationship、mask、および関連する世代所有グラフ ID だけを再キー化し、一時的な受け入れ作業を消去し、致命的な失敗時には有効な Source、同意、受け入れ済み境界、以前のグラフを `src/session/session.ts` と `src/session/scan-generation.ts` で保持する
- [ ] T1000 [US4] 1 Source の結果、兄弟の診断、有界な部分成功、競合、進捗、古いリソースに対する `POST /api/v1/global/enable` のレスポンスを `src/host/api-router.ts` で完成させる
- [ ] T1001 [US4] Repository/Global のソース分離、フィルター、共有の詳細/比較ナビゲーションを `app/composables/filters.ts`、`app/composables/session.ts`、`app/pages/index.vue` に実装する
- [ ] T1002 [US4] Global の有効化/進捗コントロール、フォーカス回復、1 Source の結果表示を `app/pages/global-consent.vue` と `app/components/consent/GlobalSourceControls.vue` で完成させる
- [ ] T1003 [US4] 意味的に同等な英語/日本語の 1 Source 結果統合、`scanning`→`ready`/`partial`、境界、兄弟の失敗、致命的な失敗時の保持、ソースフィルター、詳細/比較、進捗メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 100: Global の再スキャンと回復

**目的**: 明示的な Global 再スキャン、FIFO 直列化、有界な持ち越しソースの計上、致命的な試行後の回復を追加する。

**独立テスト**: Repository と Global の作業をキューに入れ、部分的および致命的な Global の試行を開始し、デキュー時の世代、プロセスの存続期間中に安定する Repository と Global の `Source.sourceId` 値、世代所有グラフ ID だけの再キー化、正確な予算、重複競合、保持された同意/境界/以前のグラフ、明示的な再試行の成功を検証する。

**目に見えるチェックポイント**: ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。

### テストを先に

- [ ] T1004 [US4] ソースをまたぐ FIFO、デキュー時の世代、重複スキャン競合、進捗遷移、致命的な失敗時の保持、ジョブごとのカウンターについて、失敗するコーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T1005 [US4] 持ち越しソースのファイル/バイト/診断予約と、アクティブなジョブごとの visited-entry/deadline の正確な上限値および 1 超過時のリセットについて、コーディネーターテストを `tests/unit/session/coordinator.test.ts` で拡張する
- [ ] T1006 [P] [US4] 空ボディ、ソース無効および重複の競合、有界容量の失敗、待機中の進捗、致命的な失敗の再試行、古い ID について、失敗する `POST /api/v1/global/rescan` 契約を `tests/contract/http-api-global.test.ts` に追加する
- [ ] T1007 [P] [US4] 有効化の完了、キューに入った Repository/Global スキャン、部分公開、致命的な失敗時の保持、明示的な再試行、変更されない同意/境界について、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1008 [P] [US4] 成功/部分成功の各 Global コミットが Repository と Global の `Source.sourceId` を維持し、未スキャンの Repository に加えて置換された Global の file、recognition、provenance、relationship、mask、および関連する世代所有 ID だけを再キー化した後、古い reveal と comparison を無効化することを証明するライフサイクルテストを `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T1009 [US4] Global 再スキャン、待機中/アクティブの進捗、重複防止、部分的な診断、致命的な失敗の再試行、以前の結果の保持について、ブラウザ受け入れテストを `tests/e2e/global-rescan.spec.ts` に追加する

### 実装

- [ ] T1010 [US4] Repository と Global の `Source.sourceId` を維持し、file、recognition、provenance、relationship、mask、および関連する世代所有 ID だけを再生成し、古い reveal/comparison を無効化する、FIFO Global 再スキャンと成功/部分成功コミットを `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T1011 [US4] 持ち越しソースの予算予約と、アクティブなジョブごとの visited-entry/deadline リセットを `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T1012 [US4] 空ボディの検証、競合、有界容量エラー、進捗、致命的な失敗の再試行、古いリソースへのレスポンスを備えた厳密な `POST /api/v1/global/rescan` 処理を `src/host/api-router.ts` に実装する
- [ ] T1013 [US4] Global 再スキャンのロード、重複抑止、古い状態からの回復、致命的な失敗の再試行、進捗更新を `app/components/consent/GlobalSourceControls.vue` と `app/composables/session.ts` に実装する
- [ ] T1014 [US4] 意味的に同等な英語/日本語の Global 再スキャン、キュー、部分結果、失敗時の保持、再試行メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 101: Global 無効化バリアと解体

**目的**: 優先されるゼロ I/O の無効化バリアを追加し、保持される Repository データを妨げることなく Global 所有のすべてのアーティファクトを削除する。

**独立テスト**: Repository および Global の作業中に無効化し、無効化要求を繰り返して合流させ、キャンセル/再キューのルール、1 回のアトミックな世代、べき等な no-op の振る舞い、閉じられたハンドル、Global の files、diagnostics、raw values、masks、reveals、selections、editors、consent、boundaries の削除を検証する。

**目に見えるチェックポイント**: Global 検査を無効にすると、そのセッション状態が完全に解体され、Repository 検査は引き続き利用できる。

### テストを先に

- [ ] T1015 [US4] 優先キャンセル、キャンセル診断がゼロであること、Repository の 1 回だけの再キュー、安定した Repository `Source.sourceId` を伴う N+1 の保持 Repository グラフ再キー化、古い世代所有 ID、合流するバリア、no-op 無効化、タイムスタンプについて、失敗するコーディネーターテストを `tests/unit/session/coordinator.test.ts` に追加する
- [ ] T1016 [P] [US4] 失敗する `POST /api/v1/global/disable` 契約として、空ボディ、キャンセル中の進捗、合流した完了、べき等な no-op、1 回の削除コミット、`200` レスポンスを `tests/contract/http-api-global.test.ts` に追加する
- [ ] T1017 [P] [US4] 中断された Repository 作業、中断された Global 作業、キューに入った Global のキャンセル、合流する無効化、1 回だけの再キュー、空の no-op の振る舞いについて、並行性テストを `tests/integration/global-concurrency.test.ts` に追加する
- [ ] T1018 [P] [US4] Global 無効化がファイルシステムの列挙または読み取りを一切行わず、バリアキャンセル診断を一切出力しないことを証明する境界計装を `tests/integration/global-boundaries.test.ts` に追加する
- [ ] T1019 [P] [US4] Global の files、IDs、source および lifecycle diagnostics、raw values、masks、reveals、comparison selections、Monaco models、consent、boundaries、handles の削除について、ライフサイクルテストを `tests/integration/session-lifecycle.test.ts` に追加する
- [ ] T1020 [US4] 無効化の進捗、合流/no-op 要求、フォーカス復元、Global route/editor の解体、diagnostic/mask の削除、保持された Repository 結果について、ブラウザ受け入れテストを `tests/e2e/global-disable.spec.ts` に追加する

### 実装

- [ ] T1021 [US4] 優先ゼロ I/O バリア、診断を伴わないアクティブ作業のキャンセル、キュー済み Global の破棄、Repository の 1 回だけの再キュー、バリアの合流、no-op 検出を `src/session/session.ts` に実装する
- [ ] T1022 [US4] ハンドルを閉じ、Global Source とその consent/boundaries/graph/diagnostics/raw values/masks/reveals/comparisons を削除し、保持される Repository `Source.sourceId` を維持し、その世代所有グラフ ID だけを再キー化し、以前の世代所有 ID を古い状態にする N+1 ゼロ I/O コミットを `src/session/session.ts` と `src/session/scan-generation.ts` に実装する
- [ ] T1023 [US4] 空ボディの検証、キャンセル中の進捗、合流した完了、no-op の振る舞い、1 回の削除コミットを備えた厳密な `POST /api/v1/global/disable` 処理を `src/host/api-router.ts` に実装する
- [ ] T1024 [US4] 無効化のロード、合流/no-op 処理、フォーカス復元、Global route/editor/model のクリーンアップを `app/pages/global-consent.vue`、`app/components/consent/GlobalSourceControls.vue`、`app/composables/session.ts` に実装する
- [ ] T1025 [US4] コミット済みバリアの後で Global の filters、selections、reveals、diagnostics、masks、キャッシュ済み detail/comparison 状態を `app/composables/filters.ts`、`app/composables/comparison.ts`、`app/composables/monaco.ts` から削除する
- [ ] T1026 [US4] 意味的に同等な英語/日本語の Global バリア、キャンセル、無効化、no-op、削除、Repository 維持メッセージを `app/locales/en.ts` と `app/locales/ja.ts` に追加する

---

## フェーズ 102: 横断的な検証

**目的**: 最終的な横断ドキュメント、パッケージ、アクセシビリティ、ライフサイクル、Node.js-only の回帰スイートを追加する。

**独立テスト**: 横断スイートを実行し、二言語の契約、クローズドなパッケージ内容、Node.js-only ポリシー、アクセシビリティの振る舞い、ライフサイクルのクリーンアップを検証する。

**目に見えるチェックポイント**: 完成した製品が横断的な自動回帰レイヤーを通過する。

### 横断テストを先に

- [ ] T1027 英語/日本語の相互リンク、意味的な同等性、実行可能なコマンド、安定した ID、Node.js-only 境界、`O_NOFOLLOW`、`safe-fs-boundary-unverifiable`、`platform-unobservable`、残存リスクの文言、公式バックリンク、古いネイティブ実装の主張がないことについて、ドキュメントテストを `tests/contract/documentation.test.ts` に追加する
- [ ] T1028 [P] 正確に 47 個のソースレコードを具体化し、正確に 56 個の inspection-rule ID（35 個の Repository 静的、5 個の有界導出、10 個のベンダー除外、2 個の共有除外、4 個の Global 静的）、39 個の戦略、14 個の relationship-only ルール、内包 Hook/MCP の候補追加がゼロであること、完全な相互性、公式ソースの identity/network 境界、非変更型の失敗、ランタイム import の除外について、最終的な全レジストリテストを `tests/fixtures/conformance/official-sources.json`、`tests/contract/inspection-rules.test.ts`、`tests/contract/runtime-composition.test.ts`、`tests/contract/official-sources.test.ts`、`tests/contract/official-source-drift.test.ts` に追加する
- [ ] T1029 [P] npm メタデータ、`bin.mjs`、両方の README ファイル、`LICENSE`、2 つの manifest、列挙されたすべての `dist/**` ファイルについて、パック済み tarball の正確なクローズドセットテストを `tests/package/package-contents.test.ts` に追加する
- [ ] T1030 [P] 同一 OS 入力と、Rust/Cargo/Node-API/native 依存関係またはペイロード、prebuild、ライフサイクルの build/download hook、非列挙データの拒否について、Node.js-only パッケージテストを `tests/package/node-only-policy.test.ts` で拡張する
- [ ] T1031 [P] ストーリー横断の axe、キーボード、forced-colors、zoom/reflow、reduced-motion、フォーカス維持、安全なエラーについて、回帰テストを `tests/e2e/accessibility.spec.ts` に追加する
- [ ] T1032 [P] 再スキャン時および Global 無効化時の selections、reveals、models、raw records、diagnostics、handles、古い IDs の削除について、ソース横断のライフサイクル回帰テストを `tests/integration/session-lifecycle.test.ts` に追加する

---

## フェーズ 103: ドキュメント、エビデンス、依存関係のレビュー

**目的**: 二言語の運用ガイダンス、公式ソースのエビデンス、適合データ、レビュー済みの依存関係判断を完成させる。

**独立テスト**: 有界な公式ソースワークフローを実行し、すべての drift/dependency 判断をレビューし、同期された英語/日本語ガイダンスと適合レコードを検証する。

**目に見えるチェックポイント**: メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。

### ドキュメント

- [ ] T1033 検証済みの起動コマンド、Repository/Global スコープ、同意ワークフロー、条件付き解釈、除外、保守コマンドを備え、意味的に同等な運用ガイダンスを `README.md` と `README.ja.md` に起草する
- [ ] T1034 マスキングの制限、正確な上限、診断、Node.js ファイルシステム防御と残存リスク、プライバシー、アクセシビリティ、スコープ外のガイダンスを `README.md` と `README.ja.md` に起草する

### 公式エビデンスと依存関係のレビュー

- [ ] T1035 正確なホスト、リダイレクト、有界なコンテンツ、サイズ、タイムアウト、非変更型のドリフト報告を備えた、明示的にネットワークを使う公式ソースチェッカーを `scripts/check-official-sources.ts` に実装する
- [ ] T1036 `pnpm run check:official-sources` を実行し、自動的に振る舞いを変更せず、レビュー済みソースセットと分類済みドリフトを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1037 受け入れられたソースまたはセクションのドリフトを `specs/001-inspect-agent-customizations/contracts/official-sources.md`、`specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.md`、`specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md` で解消する
- [ ] T1038 [P] 自動的にスコープを拡大せず、受け入れられた Copilot エビデンスのドリフトを `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md` と `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md` で解消する
- [ ] T1039 [P] 自動的にスコープを拡大せず、受け入れられた Claude エビデンスのドリフトを `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md` と `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md` で解消する
- [ ] T1040 [P] 自動的にスコープを拡大せず、受け入れられた Codex エビデンスのドリフトを `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md` と `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md` で解消する
- [ ] T1041 明示的にレビューされたエビデンス変更だけを `shared/registries/vendor-behaviors.ts`、`shared/registries/inspection-rules.ts`、`shared/registries/runtime-composition.ts`、`shared/registries/official-sources.ts` に適用する
- [ ] T1042 影響を受けた適合レコードだけを `tests/fixtures/conformance/vendor-behaviors.json`、`tests/fixtures/conformance/inspection-rules.json`、`tests/fixtures/conformance/runtime-composition.json`、`tests/fixtures/conformance/official-sources.json` で再生成する
- [ ] T1043 レビュー済みのエビデンスの結論を同期し、チェッカーを再実行し、最終結果を `specs/001-inspect-agent-customizations/research.md`、`specs/001-inspect-agent-customizations/research.ja.md`、`specs/001-inspect-agent-customizations/validation.md`、`specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1044 `pnpm outdated`、ライセンス、通知、互換バージョンの根拠、公開契約への影響をレビューし、すべての受け入れ/拒否判断を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1045 凍結された Node.js-only パッケージ契約を維持しながら、受け入れられた依存関係の変更を `package.json` と `pnpm-lock.yaml` に適用する
- [ ] T1046 受け入れられたすべてのエビデンスと依存関係の影響を `README.md`、`README.ja.md`、および `specs/001-inspect-agent-customizations/` 配下の影響を受ける英語/日本語の research、plan、quickstart、inspection-path allowlist、runtime-composition、vendor-contract の各ペアへ同期する

---

## フェーズ 104: リリースと成果エビデンス

**目的**: リリースマトリクスを組み立て、測定可能なすべての成功基準と最終ゲートに対する合否エビデンスを記録する。

**独立テスト**: 1 つのクローズドセットでプラットフォーム非依存の tarball をビルドし、サポートされるすべての Node/OS ジョブで同一バイトをインストールし、SC-001～SC-008 のすべての分母としきい値を検証する。

**目に見えるチェックポイント**: 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスクのエビデンスを備え、公開可能な状態になる。

### リリースワークフロー

- [ ] T1047 検証済みの 1 つのプラットフォーム非依存 tarball を使用し、Linux、macOS、Windows 上のサポート対象 Node エンジンで同じバイトをインストールするリリースジョブを `.github/workflows/release.yml` に追加する
- [ ] T1048 公開前の safe-filesystem、2 manifest、production-export、`npx`、Node.js-only、package-content、browser、accessibility の各ゲートによってリリースジョブを `.github/workflows/release.yml` で拡張する

### 成果エビデンスと最終ゲート

- [ ] T1049 frozen install、Chromium install、build、formatting、lint、typecheck、unit、contract、security の各ゲートを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1050 integration、package、performance、browser、coverage、documentation の各ゲートを実行し、すべての結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1051 同一 tarball バイトに対してサポート対象 Node-engine/OS マトリクスを実行し、検出可能な安全でない状態の拒否、`safe-fs-boundary-unverifiable`、有効な `O_NOFOLLOW`、証明にはならない `platform-unobservable` の結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1052 100,000 エントリ/500 ファイルの参照フィクスチャ 1/1 について、最終ゲートから SC-002 の合否を記録する。ステータスは 1 秒以内、完全なインベントリは 10 秒以内とし、`specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1053 サポート、拒否、共有ファイルのすべての適合行について、最終ゲートと分母から SC-003 の合否を記録する。認識率 100%、範囲外の解釈ゼロ、正しい帰属率 100% とし、`specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1054 最終ゲートと安全性スイートの分母から SC-004 の合否を記録する。activation、child process、MCP、network、mutation、rejected-selector reads、changed-file byte publication はゼロとし、`specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1055 すべての既定 view/comparison/diagnostic/log にわたる全シークレット値と、file/source/session の終了時に reveal が 100% クリーンアップされることについて、最終ゲートと分母から SC-005 の合否を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1056 SC-001 の参加者プロトコル、参加者の分母、合否、2 分以内に起動/オープンできる割合が 95% 以上という結果を実行して `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1057 SC-006 の参加者プロトコル、参加者の分母、合否、重大なユーザビリティ問題がゼロで 2 分以内に識別できる割合が 90% 以上という結果を実行して `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1058 すべての読み取り不能、不正、サイズ超過、循環、古い、境界横断のフィクスチャについて、最終ゲートと分母から SC-007 の合否を記録する。影響を受けない部分の利用可能性と対応可能な診断を 100% とし、`specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1059 すべての主要ワークフローと、適用可能なすべての WCAG 2.2 AA 自動/手動チェックについて分母を備えた SC-008 キーボードおよび手動アクセシビリティプロトコルを実行し、合否と重大な欠陥ゼロを `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する
- [ ] T1060 完全な diff とパック済み tarball について、正しさ、未テストの分岐、シークレット/境界の失敗、古い主張、二言語の不一致、無関係な変更を検査し、影響を受けるすべての評価を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` で再実行する
- [ ] T1061 残存課題と具体的な解決経路を完成させ、`pnpm run test:docs` を再実行し、`git diff --check` を実行して、その結果を `specs/001-inspect-agent-customizations/validation.md` と `specs/001-inspect-agent-customizations/validation.ja.md` に記録する

---

## ストーリーカバレッジマトリクス

| フェーズ | 主要ストーリー範囲 | 累積チェックポイント |
|---:|---|---|
| 1 Setup | 共通前提 | コントリビューターがプロジェクトをインストールし、空のビルド・テストツールチェーンを実行できます。 |
| 2 Minimal Secure Foundation | 共通前提 | セキュリティとパッケージの基盤が単独で合格し、中央権限の外にはベンダーマッチャーも調査対象ソースの読み取りも存在しません。 |
| 3 起動可能な認可済み空画面 | US1 | 認可済みブラウザー画面が起動し、製品コンテンツはほぼ何も表示されません。 |
| 4 Codex SKILL 一覧 | US1 | Codex SKILL 一覧を表示できますが、ファイル詳細はまだ開けません。 |
| 5 Codex SKILL 詳細 | US2 | Codex SKILL を選択すると、完全で安全な詳細画面が開きます。 |
| 6 Codex SKILL metadata 一覧 | US1 | 独立して識別された Codex skill-metadata file を、その seed `SKILL.md` file と混同せずに表示できます。 |
| 7 Codex SKILL metadata 詳細 | US2 | `agents/openai.yaml` を選択すると、所有元の SKILL detail とは別の安全な詳細画面が開きます。 |
| 8 Claude SKILL 一覧 | US1 | Claude と Codex の SKILL 一覧が同じ inventory に共存します。 |
| 9 Claude SKILL 詳細 | US2 | Claude SKILL detail が完成し、Codex detail と一貫します。 |
| 10 Copilot SKILL 一覧 | US1 | Copilot skill row に正確な三つの recognition combination が表示され、extra depth、configured root、extra tool recognition は存在しません。 |
| 11 Copilot SKILL 詳細 | US2 | Copilot SKILL detail に、別個の VS Code、CLI、Cloud interpretation が表示されます。 |
| 12 統合 SKILL inventory | US1 | 完全な skill-first inventory を filter して理解できます。 |
| 13 SKILL 比較 | US3 | 読み取り可能な任意の二つの SKILL file を安全に比較できます。 |
| 14 SKILL metadata 比較 | US3 | secret を露出せず、seed skill と混同することなく、二つの Codex skill-metadata file を比較できます。 |
| 15 Codex Instructions inventory | US1 | 静的な Codex instruction をフィルタリングでき、configured fallback の検出が黙って欠落しているのではなく、後続の最小 config carrier を待っていることを確認できます。 |
| 16 Codex Instructions 詳細 | US2 | 静的な Codex instruction を選択すると、明示的な order、byte budget、condition、および carrier 受け入れ前であることを正直に示す fallback 状態を備えた安全な detail が開きます。 |
| 17 Claude Instructions inventory | US1 | 明示的な launch/ancestor/descendant uncertainty を持つ Claude instruction file を filter できます。 |
| 18 Claude Instructions 詳細 | US2 | Claude instruction を選択すると、参照 file を import せず、安全な layered detail が表示されます。 |
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
| 31 Copilot VS Code MCP の詳細 | US2 | VS Code MCP ファイルを選択すると、スキーマ固有の安全な詳細と不確実性が表示される。 |
| 32 Copilot agent-contained MCP contract と Cloud runtime fact | US2 | Origin fileを持たない Cloud MCP fact と unavailable 状態が表示されます。Custom Agents wave が owner を受け入れて事前テスト済み adapter を有効化するまでは、local agent-contained row は現れません。 |
| 33 Priority MCP インベントリ | US1 | Priority MCP inventory を利用し、読み取り可能な physical file/owner と origin fileを持たない runtime fact を区別でき、まだ受け入れられていない owner family の premature row は表示されません。 |
| 34 MCP 比較 | US3 | ユーザーは MCP 宣言に接続せずに比較できる。 |
| 35 Codex Rules inventory | US1 | trust、layer、experimental-status、direct-child provenance を持つ Codex rule を filter できます。 |
| 36 Codex Rules の詳細 | US2 | Codex rule を選択すると、それを実行または適用せずに安全な詳細を開ける。 |
| 37 Claude Rules のインベントリ | US1 | ユーザーは path applicability provenance を備え、未対応の Copilot badge を持たない Claude rule をフィルタリングできる。 |
| 38 Claude Rules の詳細 | US2 | Claude rule を選択すると、任意の filesystem path に対して glob を評価せずに安全な applicability 詳細が表示される。 |
| 39 Rules の比較 | US3 | どちらの rule が正しいか、または強いかを評価せずに rule ファイルを比較できる。 |
| 40 Claude Commands のインベントリ | US1 | ユーザーは再帰的な namespace と layer provenance を備えた Claude command をフィルタリングできる。 |
| 41 Claude Commands の詳細 | US2 | Claude command を選択すると、参照先を実行、import、read せずに安全な詳細を開ける。 |
| 42 Copilot Commands のインベントリ | US1 | ユーザーは対応する root command ファイルの Copilot CLI interpretation を識別できる。 |
| 43 Copilot Commands の詳細 | US2 | Copilot command を選択すると、安全な CLI-qualified 詳細と不確実性が表示される。 |
| 44 統合 Commands インベントリ | US1 | ユーザーは共有 root command と nested Claude-only command を区別できる。 |
| 45 Commands の比較 | US3 | command ファイルを実行せずに比較できる。 |
| 46 Copilot Prompts のインベントリ | US1 | ユーザーは正確な default-location provenance を備えた対応 Copilot prompt をフィルタリングできる。 |
| 47 Copilot Prompts の詳細 | US2 | Copilot prompt を選択すると、参照先へ移動したり読み取ったりせずに安全な詳細を開ける。 |
| 48 Copilot Prompts の比較 | US3 | コンテンツへ移動したり実行したりせずに Copilot prompt を比較できる。 |
| 49 Codex Custom Agents inventory | US1 | 正確な project-layer provenance を持つ Codex custom-agent file を filter できます。 |
| 50 Codex Custom Agents 詳細 | US2 | Codex custom agent を選択すると、agent-owned MCP recognition、connection、configured-path read を伴わず、安全な spawned-session detail と carrier-inheritance relationship が表示されます。 |
| 51 Claude Custom Agents inventory | US1 | layer provenance と duplicate-name uncertainty を持つ Claude custom agent を filter できます。 |
| 52 Claude Custom Agents 詳細 | US2 | Claude custom agent を選択すると、memory を読み取ったり MCP に接続したりせず、安全な context と relationship detail が表示されます。 |
| 53 Copilot Custom Agents inventory | US1 | surface-qualified provenance を持つ Copilot custom agent を filter できます。 |
| 54 Copilot Custom Agents 詳細 | US2 | Copilot custom agent を選択すると、handoff、Hook、tool、MCP を実行せず、別々の surface-aware context が表示されます。 |
| 55 統合 Custom Agents inventory | US1 | 完全な custom-agent inventory、共有 Claude/Copilot interpretation と owner-attached MCP fact、および duplicate file や誤った MCP ownership を伴わない Codex carrier-inheritance relationship を理解できます。 |
| 56 Custom Agents 比較 | US3 | custom-agent definition を実行または ranking せずに比較できます。 |
| 57 Codex Configuration recognition | US1 | MCP と fallback derivation にすでに使われている同じ physical carrier 上の Codex project configuration をフィルタリングでき、configured path に read authority は与えられません。 |
| 58 Codex Configuration 詳細 | US2 | `.codex/config.toml` を選択すると、宣言された target を読み取らず、安全な typed configuration と fallback declaration が表示されます。 |
| 59 Claude Settings inventory | US1 | exact-launch Claude settings file と、その project/local layer を識別できます。 |
| 60 Claude Settings 詳細 | US2 | Claude settings を選択すると、component の activation、server connection、standalone contained-family file の作成を行わず、安全な layer-aware detail と owner-attached MCP が表示されます。 |
| 61 Copilot Settings inventory | US1 | 除外された VS Code または CLI state を表示せず、対応する Copilot settings candidate と surface provenance を識別できます。 |
| 62 Copilot Settings 詳細 | US2 | Copilot settings を選択すると、plugin の有効化や contained Hook の compose を行わず、安全な surface-qualified detail が表示されます。 |
| 63 統合 Settings/Configuration inventory | US1 | 完全な settings/configuration inventory をフィルタリングでき、Claude settings-owned MCP、Copilot non-ownership、既存 Codex carrier を区別できます。 |
| 64 Settings/Configuration 比較 | US3 | value を適用したり declaration を昇格させたりせず、settings/configuration を比較できます。 |
| 65 Claude Output Styles のインベントリ | US1 | ユーザーは layer provenance を備えた対応 Claude output style をフィルタリングできる。 |
| 66 Claude Output Styles の詳細 | US2 | output style を選択すると、その style を適用せずに安全な詳細を開ける。 |
| 67 Claude Output Styles の比較 | US3 | どちらの style も適用せずに Claude output style を比較できる。 |
| 68 Codex Marketplaces のインベントリ | US1 | registration、installation、enablement を示唆せずに authored Codex marketplace catalog をフィルタリングできる。 |
| 69 Codex Marketplaces の詳細 | US2 | Codex marketplace を選択すると、plugin manifest を開かずに authored entry と安全な local-source relationship が表示される。 |
| 70 Claude Marketplaces のインベントリ | US1 | presence を registration と誤認せずに authored Claude marketplace catalog を識別できる。 |
| 71 Claude Marketplaces の詳細 | US2 | Claude marketplace を選択すると、registration、activation、connection を主張せず、安全な authored metadata、source relationship、owner-attached MCP が表示される。 |
| 72 Copilot Marketplaces インベントリ | US1 | ユーザーは、正確なルート形式と surface の来歴を備えた Copilot marketplace カタログをフィルタリングできる。 |
| 73 Copilot Marketplaces の詳細 | US2 | Copilot marketplace を選択すると、plugin manifest を読み取らずに、安全な作成済みエントリと有界なローカルソースプランが表示される。 |
| 74 統合 Marketplaces インベントリ | US1 | 一つの共有 authored catalog 上のすべての marketplace interpretation と Claude owner-attached MCP を理解できる。 |
| 75 Marketplaces 比較 | US3 | ユーザーは何も取得、インストール、アクティベートせずに marketplace カタログを比較できる。 |
| 76 Codex Plugin Manifests インベントリ | US1 | ユーザーは、静的または marketplace 由来の来歴を備えた作成済み Codex plugin manifest をフィルタリングできる。 |
| 77 Codex Plugin Manifests の詳細 | US2 | Codex plugin manifest を選択すると、どのコンポーネントもロードせずに、安全な作成済みメタデータが表示される。 |
| 78 Claude Plugin Manifests インベントリ | US1 | ユーザーは、明示的なルートまたは marketplace 由来の来歴を備えた Claude plugin manifest をフィルタリングできる。 |
| 79 Claude Plugin Manifests の詳細 | US2 | Claude plugin manifest を選択すると、アクティベーションせずに、安全な作成済みメタデータとコンポーネントの関係が表示される。 |
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
| 93 Repository 詳細の受け入れ | US2 | 初期リリースのすべての Repository カスタマイズファミリーについて US2 の安全な詳細が完成する。 |
| 94 Repository 比較の受け入れ | US3 | 初期リリースのすべての Repository カスタマイズファミリーについて US3 の比較が完成する。 |
| 95 Global 同意プレビュー | US4 | ユーザーは検査を有効にする前に、正確な Global ルート、パターン、除外、上限、契約バージョンを確認できる。 |
| 96 Codex Global 境界の受け入れと有効化基盤 | US4 | インベントリに、有効で `scanning` 状態の 1 つの Global Source が Codex の受け入れ進捗とともに表示され、Global ファイル行はまだ存在しない。 |
| 97 Claude Global 境界の受け入れ | US4 | 既存の `scanning` Global Source が Codex と並べて Claude の受け入れを報告し、Global ファイル行はまだ存在しない。 |
| 98 Copilot Global 境界の受け入れ | US4 | 既存の `scanning` Global Source が 3 ベンダーすべての受け入れを報告しながら、Global ファイル行は引き続きゼロのままになる。 |
| 99 1 Source の Global 結果統合 | US4 | すでに表示されている Global Source に、最初の ready/partial ファイル行がアトミックに追加され、詳細/比較ワークフローを再利用できる。 |
| 100 Global の再スキャンと回復 | US4 | ユーザーは再同意せずに Global 結果を再スキャンし、失敗した試行から回復できる。 |
| 101 Global 無効化バリアと解体 | US4 | Global 検査を無効にすると、そのセッション状態が完全に解体され、Repository 検査は引き続き利用できる。 |
| 102 横断的な検証 | 回帰 | 完成した製品が横断的な自動回帰レイヤーを通過する。 |
| 103 ドキュメント、エビデンス、依存関係のレビュー | リリースエビデンス | メンテナーが、リリース候補のレビュー可能なガイダンス、エビデンスの来歴、依存関係の根拠を利用できる。 |
| 104 リリースと成果エビデンス | 測定可能な成果 | 初期リリースが、明示的な自動化、参加者、アクセシビリティ、性能、安全性、残存リスクのエビデンスを備え、公開可能な状態になる。 |

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
  → One-Source Global Result Integration
  → Global Rescan and Recovery
  → Global Disable Barrier and Teardown
  → Cross-Cutting Verification
  → Documentation, Evidence, and Dependency Review
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
- フェーズ 96 はファイル/グラフがゼロの `scanning` 状態で有効な正確に 1 つの Global Source を公開する。フェーズ 97～98 は同じ Source の境界進捗を拡張し、フェーズ 99 が最初の ready/partial グラフコミットを実行する。
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
- Global のベンダー境界テストは分離されたフィクスチャルートを使用するが、フェーズ 96～98 は有効な 1 つの `scanning` Source を拡張するため順次実行する。Source の進捗は更新できるが、フェーズ 99 より前に Global ファイル行をコミットしてはならない。
- Global の再スキャンおよび無効化に関する API、concurrency、boundary、lifecycle、browser の各テストは、正確なファイルが異なる場合、コーディネーター状態のテスト後に並行して進められる。
- 横断的な package、Node.js-only、accessibility、lifecycle、official-source の各テストと、3 ベンダーのエビデンスレビューは、独立したマーク済み作業ストリームである。

### 並行実行例: ベンダー Inventory フェーズ

```text
After the phase fixture and conformance tasks:
  matcher/registry contract
  recognizer unit test
  repository-scan integration test
  inventory UI unit test
  browser acceptance
```

### 並行実行例: 安全な Detail フェーズ

```text
After the phase metadata shape is fixed:
  vendor metadata test
  relationship test
  zero-activation or zero-connection test
  HTTP detail/reveal contract
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
5. 現時点で具体化された MCP ファイル/所有者と runtime fact だけを統合し、マスク済み MCP 比較を提供する。dormant adapter は inventory、detail、件数、接続、選択に表示しない。

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
6. Repository 受け入れ、Global 検査、横断的検証、ドキュメント/エビデンスレビュー、リリースエビデンスを完成させる。

### 各ファミリー内のベンダー優先垂直スライス

1. サポートされる各ベンダーの List/Inventory チェックポイントを完成させる。
2. そのベンダーの安全な Detail または内包メタデータのチェックポイントを完成させる。
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
3. 受け入れられた Codex の有効化中に、有効な 1 つの `scanning` Global Source を公開し、そのファイルグラフを空のまま保ちながら、独立した Claude/Copilot 境界の進捗で拡張する。
4. 最大 3 個の成功した境界を持つ最初の ready/partial Global ファイルグラフを、その既存 Source へアトミックにコミットする。
5. Global の再スキャン/回復と、優先ゼロ I/O 無効化バリアを追加する。
6. 横断的な検証と、ドキュメント/エビデンス/依存関係のレビューを完成させる。
7. SC-001～SC-008 の分母、しきい値、合否結果、リリースマトリクス、残存リスクを記録する。

## 注記

- 有効な検査対象ソースを列挙または読み取れるのは `src/inspection/safe-fs.ts` だけである。呼び出し元のパス、関係の対象、ベンダーロケーター、戦略、エビデンスレコードが読み取り権限を与えることはない。
- すべての候補フェーズでは、最初に候補の `lstat`、次に `realpath` の包含、最後に変更されていないことを確認する `lstat` の再実行を行う。該当するフェーズではさらに、ルート、利用可能な各祖先、同一ハンドルの同一性を比較する。
- 検出されたすべての変更、または利用不能/曖昧と報告された必須チェックでは、すべてのバイトを破棄し、読み取り可能な結果を公開しない。ルート/共有祖先の検証不能はソース試行を拒否し、候補の検証不能はその項目を拒否する。
- Node.js が公開し強制できる箇所では、有効な `O_NOFOLLOW` を多層防御として必須とする。ただし、文書化された active-mutator または platform-unobservable の残存ケースに対し、カーネルが強制する包含を証明したと主張するテストがあってはならない。
- 実行可能なすべての製品、ビルド、テストコードは JavaScript/TypeScript とする。Rust、Cargo、Node-API/native addon、prebuilt binary、ライフサイクルでのコンパイル、ライフサイクル/ランタイムでのアーティファクトダウンロードは引き続き禁止する。
- ベンダーの振る舞い、Inspector matcher、runtime composition、公式エビデンスは別々に所有する。読み取りを許可できるのは、静的および有界導出の Inspector ルールだけである。
- 非読み取りの `excluded` ルール ID は、`shared.excluded.symlink-target`、`shared.excluded.managed-remote-state`、`copilot.excluded.additional-standard-locations`、`copilot.excluded.extra-directories`、`copilot.excluded.vscode-settings`、`copilot.excluded.cli-lsp`、`copilot.excluded.cli-extensions`、`codex.excluded.plugin-files`、`claude.excluded.plugin-files`、`codex.excluded.user-runtime`、`claude.excluded.user-runtime`、`copilot.excluded.user-runtime` だけである。その他の拒否はすべて、パス不一致テストまたは relationship-only の条件である。
- 関係は記述的、直接的、有界、非追跡とする。関係の対象は、それ自身が独立した静的または有界導出の受け入れを受けた場合にだけ読み取り可能になる。
- 1 つの物理ファイルは世代ごとに 1 回だけ読み取られ、複数ツールの認識と複数の有界な来歴を保持できる。
- `agents/openai.yaml` は個別の物理候補および `skill metadata` 認識である。シード `SKILL.md` の同一性へ統合してはならない。
- フェーズ 23 は、設定済み instruction fallback と Codex MCP に必要な最小 carrier として `.codex/config.toml` を一度だけ受け入れる。フェーズ 57～58 は `settings/config` 認識と完全な configuration 詳細を追加するときに、同じ物理 ID と世代読み取りを再利用し、二つ目の configuration 候補を決して作成しない。
- Claude の独立 hook、Codex の独立 MCP、hosted/organization/managed/remote 入力、Claude workflows と agent memory、Codex Repository prompts と plugin components、Copilot LSP/extensions/一般の `.vscode/settings.json`、追加の設定済みルートには、List フェーズも読み取り権限も与えない。
- 内包 Hook と MCP の認識は、すでに受け入れられた所有物理ファイルを再利用する。dormant MCP adapter は、独立して許可された所有者が受け入れられる前には、何も列挙、読み取り、公開できない。有効化では、新しい候補または読み取りなしで、その所有者へ認識を追加する。宣言、plugin コンポーネントパス、Cloud の事実、runtime 参照が合成ローカルファイルを作成することはない。
- Marketplace と plugin manifest は別の kind である。検証済みのローカル marketplace ソースだけが、1 つの有界 plugin-manifest 導出エッジをシードでき、component は再帰しない。
- Global 検査は、独立して受け入れられた最大 3 つのベンダー境界を持つ 1 つの論理ソースである。その `Source.sourceId` はプロセスの存続期間中に安定したまま、file、recognition、provenance、relationship、mask、および関連する世代所有 ID はコミット時に再キー化される。フェーズ 96 はファイル/グラフがゼロの有効な `scanning` Source を公開し、フェーズ 97～98 はその進捗を拡張し、フェーズ 99 は最初の ready/partial グラフコミットを実行する。
- Raw byte とシークレット値は、必要最小限の期間だけサーバーメモリ内に保持する。マスキングのオーバーフローでは、prefix、metadata、relationship、derivation、comparison、reveal を一切公開しない。
- 網羅的でないマスキングに関する警告は最初の Codex 詳細チェックポイントで実装し、後続のすべての inventory、detail、comparison 増分を通じて常に表示する。
- 通常の起動、スキャン、ビルド、テストは公式ドキュメントに関してオフラインである。ネットワークへアクセスできるのは、明示的なメンテナー向けソース確認コマンドだけである。
- 人が作成するリポジトリドキュメントの変更では、英語の正本ファイルと日本語の対応ファイルを必ず同時に更新する。
- 自動テストの成功はエビデンスであり、網羅的な証明ではない。フェーズ 104 では、完全な文脈での diff、package、participant、accessibility、measurable-outcome、residual-risk のレビューを必要とする。
