<!--
同期影響レポート
- バージョン変更: 5.2.0 → 5.3.0
- 変更した原則: 読みやすく、保守しやすく、意図が伝わるコード — 逸脱の規則を、特定の
  状況を超えて適用できる一般形で述べた: 逸脱は、それがどこにあっても、いまなお成立する
  明示された理由とだけ共存できる。理由を消す変更は同じ変更で逸脱も変換する。この規則は
  patternの導出元にも後続のあらゆる場合と同じく及び、適合は読み手が出会うもので判定し、
  実装が共有されているかでは判定しない。
- 更新したテンプレートとガイダンス:
  - ✅ AGENTS.md/AGENTS.ja.md 実装の単純さの方針 — 一般形の逸脱規則と2つの運用チェック。
    instruction rowの件は一例として保持
  - ✅ plan/spec/tasksテンプレート — code idiomを名指すテンプレートは無く、変更不要
-->
# Agent Customization Inspector 憲章

[English](constitution.md)

## 基本原則

### I. 速さより品質（妥協不可）

すべての変更は、場当たり的な対処ではなく、一貫性があり保守可能な設計によって、要件または根本原因を
解決しなければならない（MUST）。説明のない例外、重複した回避策、失敗の握りつぶし、現時点で必要の
ない抽象化は禁止する。採用する解決策は、正しさ、安全性、読みやすさ、将来の保守性を損なわず、既知の
要件を完全に満たす最も単純なものでなければならない（MUST）。AIが生成した変更にも人間の変更と全く
同じ基準を適用し、リポジトリ全体の文脈でレビューしなければならない（MUST）。品質は後回しにできる
作業ではなく、最優先の提供条件である。

シンプルさは拘束力のある判定基準である。提案する仕組みが既知の要件の達成内容を変えないなら、より
単純な実装を選ばなければならない（MUST）。防御的なcheckは、userを実際に守るfailure modeを持たな
ければならない（MUST）。他のlayer（package manager、runtime/platform、testまたはrelease gate）が
すでに所有しenforceしているpolicyを、製品のruntimeで再実装してはならない（MUST NOT）。重複した
policyは防御にならずdriftを生むだけである。Packaged artifactに対するexact-valueのassertはpackage
testとrelease gateに置き、同時に配布されるartifact同士をuser runtimeで相互検証してはならない
（MUST NOT）。より単純な構文で書ける冗長な等価表現は単純化しなければならない（MUST）。そのような
冗長性をspecificationが要求している場合は、書かれたとおりに実装せず、両言語のspecificationを修正
しなければならない（MUST）。

### II. 読みやすく、保守しやすく、意図が伝わるコード

コードは、明確な名前、凝集したモジュール、明示的な制御フロー、責務が明確な小さな単位、そして一貫し
たidiomを使用しなければならない（MUST）。自明でない判断、不変条件、セキュリティ上の前提、トレードオフ、互換性制約には、
構文の説明ではなく、なぜその設計が必要なのかを説明するコメントを関連コードの近くに残さなければなら
ない（MUST）。Exportされた宣言は宣言の場所で文書化する。Exportされた型、interface、定数には、それが
何を表すかを述べるJSDoc docコメントを付けなければならず（MUST）、閉じたunionの各memberとexportされた
interfaceの各フィールドには、その意味と、存在する場合は統治するcontractを述べるJSDoc docコメントを
付けなければならない（MUST）。Classの全member—フィールドとメソッド、constructorやprivate memberを
含む—にも、それが何を保持するか、または何をするかを述べるJSDoc docコメントを付けなければならない
（MUST）。古い、冗長な、または誤解を招くコメントは、同じ変更で修正または削除しなければならない
（MUST）。複雑さと新しい抽象化には、現在の具体的な必要性がなければならない（MUST）。一貫性はそれ自体が
読みやすさの性質である: 同じに見えるコードは同じでなければならず（MUST）、だから違いは常に意味
を持つ。したがってpatternはfamily全体に適用するか、まったく適用しないかであり、idiomを変える
変更は同じ変更で全memberを変換しなければならない（MUST）。部分的な変換は妥協ではなく、未完の
変更である。逸脱 — コード・テスト・fixture・文書のどこであれ、周囲のpatternから外れるもの — は、
その場合を区別する明示された理由とだけ共存でき、理由は導入時の変更ではなく現在に対して検査
される: 理由を消す変更は、同じ変更で逸脱も変換しなければならない（MUST）。理由が消えた逸脱は、
既得の決定ではなく欠陥である。この規則はpatternの導出元にも、後続のあらゆる場合と同じく及び、
適合は読み手が出会うもの — 名前、形、そして消費するすべての箇所 — で判定しなければならず
（MUST）、実装が共有されているかどうかでは判定しない。Reviewerが
作者の意図を推測し直さなくても、変更とその理由を理解できなければならない（MUST）。

### III. 完了前の検証

振る舞いを変更する場合は、適切なレベルの自動テストを必ず追加または更新しなければならない（MUST）。
テストは主要な振る舞いに加え、関連するエラー、境界値、回帰、統合、セキュリティ上重要なケースを扱わな
ければならない（MUST）。技術的に可能な場合、バグ修正では修正前に失敗するテストで不具合を再現しなけ
ればならない（MUST）。テストは決定的で読みやすく、本番コードと同じ品質で保守しなければならない
（MUST）。テスト成功とカバレッジは証拠であって完全な保証ではないため、Reviewerは未テストの分岐、
相互作用、失敗モードも確認しなければならない（MUST）。必須チェックが失敗している、または説明のない
テスト不足がある変更は未完了であり、mergeまたはreleaseしてはならない（MUST NOT）。

### IV. ドキュメントはプロダクトの一部

ユーザー向けの振る舞い、Contributorの作業手順、公開interface、setup、architecture上の判断、
セキュリティ制約、運用手順は、安全に利用・保守するために必要な水準で文書化しなければならない
（MUST）。ドキュメントは説明対象のコードと同時に更新し、コマンドと例を検証しなければならない
（MUST）。人が作成するすべてのリポジトリ文書には、生成物とvendor提供物を除き、標準の`*.md`と
対応する`*.ja.md`による意味的に同等な英語版と日本語版が必要である（MUST）。文書の欠落、陳腐化、
不一致がある場合、その変更は完了していない。

### V. 誰もが参加しやすいプロジェクト

このプロジェクトは、Contributorとユーザーにとって不要な障壁を最小化しなければならない（MUST）。
Setup、開発、テスト、Contributionの期待事項は、見つけやすく、再現可能で、明確かつ敬意のある包摂的
な言葉で記述しなければならない（MUST）。エラーとレビューコメントは、解決方法が分かる具体的な内容で
なければならない（MUST）。InterfaceとContributor workflowでは、アクセシビリティとプロジェクトへ
の習熟度の違いを考慮しなければならない（MUST）。参加を実質的に難しくする変更には、その必要性と実用
的な移行または支援方法を記載しなければならない（MUST）。

## 品質と安全性の基準

- Formatting、lint、該当する場合のtype check、自動テスト、ドキュメント検証は、ローカル検証とCIの
  必須品質ゲートとして実行しなければならない（MUST）。Code formattingはrepositoryのformatter
  （Prettier）が所有する: `format`が書き換え、`format:check`がゲートするため、formattingを手で
  直すことはない。Byte-levelの衛生は引き続きrepository設定（`.gitattributes`、`.editorconfig`）が
  宣言的に所有する。
- この製品はユーザーが既に信頼しているworkspaceで実行される。存在意義は「AIエージェントが読み込む
  もの」を見せることであり、調査対象customization fileを敵としてモデル化しない。その信頼と無関係に
  3つの義務は残る: 調査対象contentを実行してはならない（表示にはparseで足りる）（MUST NOT）、
  配信contentにユーザー自身のsecretが含まれ得るためsession hostはloopbackだけにbindし、起動元
  machineの外へ公開してはならない（MUST NOT）、表示contentはbrowserでinertにrenderしなければ
  ならない（MUST）。Session hostはそのloopback bindingの内側で認証なしに動作する。他のlocal
  processおよびDNS rebinding経由の悪意あるweb pageがInspector実行中にsessionへ到達し得る残存
  limitationを、documentationに明記しなければならない（MUST）。Failureは通常のerrorとして
  報告する。Productはtelemetryを持たず、出力を読むのは調査対象fileを所有する本人であるため、
  log内容の規制もsanitizeされたerror envelopeも定義しない。実装は最小権限と
  安全な失敗を使用しなければならない（MUST）。File size、fileまたはitemの件数、parser構造、request
  またはresponse size、work queue容量、時間、concurrency、および同様のresource上限を、製品固有の
  数値validation limitとして定義してはならない（MUST NOT）。容量はNode.js runtime、parser、OS、
  filesystem、browser、deployment環境によって決まる。回復可能な環境またはresourceの失敗は、対象publication
  attemptをabortし、そのattemptからitem、Source、recognitionまたはderived result、result record/response、generationを一切公開せず、
  以前のcommit済みstateだけを利用可能に保たなければならない（MUST）。Lifecycleまたはoperational failureをそのresult外で報告してもよいが
  （MAY）、調査対象artifactをvalidまたはinvalidに分類してはならない（MUST NOT）。この規則は、featureの本質に含まれる機能上のcardinalityを禁止しない。Trust boundary、
  権限、永続化、network、機密データを変更する場合は、securityとprivacyへの影響をレビューしなけれ
  ばならない（MUST）。
- Credentialその他のsecretを含む記述内容全体は、製品仕様がその内容の調査を明示的に要求する場合に
  限り、意図的にsession APIから返す、または表示してよい（MAY）。API accessはloopback-localかつ
  session内に限定しなければならない（MUST）。ユーザー向け表示は内容を不活性にrenderしなければならない（MUST）。
  その前に確認stepを置いてはならず、内容に何が含まれ得るかについての注意書きを添えてもならない
  （MUST NOT）。閲覧者自身のfileをloopback-localなsession上で表示する場合、どちらも何も守らないためである。内容を永続化し、またはremote serviceへ
  送信してはならない（MUST NOT）。意図した調査を
  認めるこの限定的な例外は、他のsurfaceからの偶発的な露出を許可しない。
- Dependency、公開contract、data formatは明示し、実用上可能な限り小さく保たなければならない
  （MUST）。新しいdependencyと破壊的変更には、理由と移行影響の記録が必要である。
- Coverage目標はrisk発見の参考にしてよい（MAY）が、scenarioに基づくtest設計やcode reviewの代わり
  にしてはならない（MUST NOT）。やむを得ない検証上の制約には、残存riskと具体的な解消方法を承認前に
  記録しなければならない（MUST）。
- Source、test、comment、documentationは相互に整合していなければならない（MUST）。Dead code、
  古い互換path、無関係なcleanupをfeature変更に隠してはならない（MUST NOT）。

## 開発ワークフロー

1. 実装前に、ユーザーから見える振る舞い、受け入れscenario、品質要件、security boundary、
   documentationへの影響を定義する。
2. 自明でない作業では、最も単純で一貫した設計、採用しなかった案、避けられない複雑さを実装計画へ
   記録する。
3. 実装前または実装と同時にtestを追加・更新する。技術的に可能な場合は、新しいtestが意図した理由で
   失敗することを確認してから、そのtestを根拠として使用する。
4. リポジトリの規約を維持し、無関係な変更を避けた、小さくreview可能な単位で実装する。
5. 差分全体について、正しさ、単純さ、保守性、読みやすさ、安全性、境界事例、commentの正確性、
   英語・日本語ドキュメントの同等性を確認する。
6. 適用される品質ゲートをすべて実行し、コマンドと結果を記録する。失敗した必須チェックは、原因を解決
   せずに無視、無効化、分類変更してはならない（MUST NOT）。
7. この憲章への適合を明示的に確認するreviewを受ける。Complexity trackingは必要な設計コストの説明
   であり、いずれの原則に対する免除でもない。

AI agentは、編集前に関連する既存code、test、documentation、repository instructionを確認し、自身の
前提を疑い、根本原因を解決し、結果全体を文脈の中で検証しなければならない（MUST）。生成結果、狭い
happy-path test、または未解決riskを残したchecklistだけを根拠に完了を宣言してはならない（MUST NOT）。

## ガバナンス

この憲章は、すべてのプロジェクト仕様、計画、task、実装、review practiceを統治する。他のリポジトリ
文書と矛盾する場合はこの憲章を優先し、矛盾する文書を修正しなければならない（MUST）。

改訂は、両言語版を更新し、理由と影響を説明し、影響するtemplateとguidanceへ反映するreview済み変更
として提案しなければならない（MUST）。Versioningはsemantic versioningに従う。互換性のない
governanceまたは原則の変更はMAJOR、新しい原則または義務の実質的な拡張はMINOR、意味を変えない明確化
はPATCHとする。Ratification dateは最初の採択日を維持し、normative textを変更するたびに
last-amended dateを更新する。

すべてのplan、pull request、release reviewには、明示的な憲章適合確認が必要である（MUST）。既知の違反
は承認前に解消しなければならない（MUST）。緊急性、生成code、自動検査の成功は免除理由にならない。
Reviewerは変更全体を調べ、追加調査が必要な不確実性を記録する責任を負う。

**Version**: 5.3.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-08-28
