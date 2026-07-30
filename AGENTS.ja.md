# リポジトリ指示

[English](AGENTS.md)

プロジェクトの開発とレビューは、
[プロジェクト憲章](.specify/memory/constitution.ja.md)に従います。

作業方針はこのファイルに置きます。単一の変更が何をするかではなく、作業の進め方が定まったときは、
同じ変更の中で両言語でここに書いてください。会話で合意しただけの方針は、次のセッションには存在しません。

## ドキュメントの内容方針

- 最終状態を書いてください。仕様・契約・コメントは、今何が真であるかを記述するものであり、どう
  してそうなったかを記述するものではありません。「以前は」「改名した」「2026-XX-XX 修正」といった
  記述と旧名そのものを落としてください。読者に必要なのは規則であり、変更履歴はバージョン管理に
  あります。
- 理由は残し、経緯は落としてください。結果だけからは判断しにくい決定については、なぜ代替案を
  却下したのかを述べます。ただし編集の経過としてではなく、設計の性質として現在形で書きます。
- 性質上が変更ログである artifact は4つあり、そこだけが日付付き entry を保持します: `tasks.md`、
  specification が受けた質問とそれを解決した回答を日付付き session として記録する `spec.md` の
  `## Clarifications` section、各 check がどう満たされたかを記録する `checklists/`、そして
  constitution workflow が定める constitution の Sync Impact Report comment（最新の改訂 1 件の
  report だけを保持し、過去 report を積み重ねない）です。それ以外には書かないでください —
  requirement にも、contract clause にも、plan の段落にも、code comment にもです。この4つでも
  旧名・旧要求は書かないでください。本文は task が今何を要求するか、回答が今どうであるかを
  記録し、日付付き修正 note は「いつ・なぜ変わったか」だけを短く記録します。以前どう書かれて
  いたかは記録しません。
- 履歴記述の削除も他の編集と同様です。その括弧が `FR-` 識別子のような規範参照を一緒に持っていな
  いか確認してください。

## ドキュメントの言語方針

- 人が作成するリポジトリ内のすべてのドキュメントについて、英語版と日本語版の両方を作成し、維持してください。
- 同じ変更の中で両言語版を追加または更新してください。いずれかが存在しない、または内容が古い場合、ドキュメント作業は完了していません。
- 英語版には標準の `*.md` ファイル名を使用し、日本語版には対応する `*.ja.md` ファイル名を使用してください。ツールやコミュニティの慣例によりファイル名が決まっている場合は、必須のファイル名（例: `AGENTS.md`）を維持し、同じ場所に日本語の対応ファイル（例: `AGENTS.ja.md`）を追加してください。
- ツール固有のファイル名が標準の英語ドキュメントへのsymbolic linkにすぎず、その標準ドキュメントに日本語の対応ファイルがすでに存在する場合、ツール固有の`*.ja.md` symbolic linkは不要です。標準の英語版と日本語版の組をsource of truthとして維持してください。
- 両言語版の意味を一致させてください。一語一句同じ翻訳である必要はありませんが、要件、警告、例、リンク、ステータス情報に相違があってはいけません。
- コード、コマンド、パス、パッケージ名、API 名、識別子、URL は、例そのもののローカライズに必要な場合を除き、そのまま保持してください。
- 実用的な場合は、各ドキュメントの冒頭付近から他方の言語版へ相互リンクしてください。
- ドキュメント変更を完了する前に、両言語版を比較し、欠落、古い記述、技術的な詳細の不一致がないことを確認してください。
- この方針は新規ドキュメントと、変更する時点での既存ドキュメントに適用します。生成ファイルおよびベンダー提供のサードパーティ製ドキュメントは対象外です。

## Vendorしたagent customization

`.agents/skills/` と `.claude/skills/` には、このリポジトリが作成していない第三者のskillを置いています。
これらはinspectorの検査対象そのものなので、取得元のupstreamとbyte単位で同一に保ち、ここでは一切編集しません。
ローカルで修正すると、そのskillの利用者の誰も持っていないfixtureになり、名乗っているコピーから乖離するためです。

- これらの欠陥はupstreamのものであり、そのまま残します。例: `plugin-creator` の `agents/openai.yaml` は
  `./assets/plugin-creator-small.svg` と `./assets/plugin-creator.png` を名指していますが、このskillは
  `assets/` directoryを同梱していません。自身のmanifestが持っていないものを指しているskillは、
  この製品が見せるために存在する現実であって、ここで直すものではありません。
- 空白もupstreamのものなので、`git diff --check` はこれらを報告します。現在は
  `.claude/skills/skill-creator/scripts/` 配下の2行です。このリポジトリにその check を走らせる gate は無く、
  これによって失敗するものはありません。
- 更新するときは、ここにあるものにパッチを当てるのではなく、新しいupstreamのコピーを丸ごと取り込みます。

## シンプルな実装の方針

シンプルな実装を優先します。これは憲章の原則I（速さより品質）を日々のコーディング判断に適用するものです。

- 既知の要件を完全に満たす最も単純な実装を選んでください。シンプルさは推測的な堅牢性より優先されます。仕組みの追加は実証された要件のためだけに行い、「念のため」で追加してはいけません。
- このリポジトリ自身の仕様の条項は決定であって、必要性の証拠ではありません。実装する前に、それが無ければ誤りになるsurfaceを名指ししてください。そのsurfaceがまだ存在しないなら、仕組みはそのsurfaceと共に到来します。例: どのphaseもまだ作っていないcomparison surfaceのために規定されたexact authored sliceは、frontmatter packageが既にdetail surfaceの表示値へparseし終えていたものを、再度parseするmoduleを必要としました。
- 他のlayer（package manager、runtime/platform、testまたはrelease gate）がすでに所有しenforceしているpolicyを再実装してはいけません。重複したpolicyは防御にならずdriftを生むだけです。例: Node.js互換性は`engines.node`で一度だけ宣言しpackage managerがenforceするため、CLIはruntimeで再検査しません。
- すべての防御的checkは、userを実際に守るfailure modeを持たなければなりません。同時に配布されるartifact同士をuser runtimeで相互検証してはならず、packaged artifactに対するexact-valueのassertはpackage testとrelease gateに置いてください。例: `package.json.bin`はpackaged `dist/cli.mjs`を直接指します。CLI importの前に同梱fileを再検証する別のbootstrap wrapperは撤去しました。
- 不要な間接化や、より単純な構文で書ける冗長な等価表現を避けてください。例: 固定の相対dynamic importは`import(new URL('./module.mjs', import.meta.url).href)`ではなく`import('./module.mjs')`と書きます。
- シンプル化とは複雑さの総量を減らすことであり、移動させることではありません。宣言的な定義を削除して同じ情報をより長いコマンドラインや別のファイルへ書き移すのはシンプル化ではありません。宣言的な設定は、それを所有するconfigファイルに置いてください。例: vitestの`coverage` projectは`test:coverage` scriptの`--project` flagの連鎖にせず、`vitest.config.ts`内の定義のまま維持します。
- `package.json`にすでにある値（name、version、homepage、description）は、文字列literalとして複製せず、標準のJSON import — `import packageJson from '../../package.json' with { type: 'json' }` — で読み取ってください。BundlerがJSON moduleを参照されたフィールドだけにtree-shakeするため、packagedされたCLIはruntimeで`package.json`を読みません。例: `src/server/host/devframe-app.ts`はdevframeのmetadataをこの方法で取得し、contractで固定された製品`id`だけをliteralのまま維持します。
- 一覧のrowの単位は、列挙される対象自身のものであり、それが見つかった入れ物のものではありません。ある領域の2つの要素が異なる数え方をされるとき — fileごとに1 row、file内の宣言ごとに1 row、複数fileが共有する名前ごとに1 row — それらはrow型を共有しません。1つの形をoptional fieldで広げて全部に合わせると、どの要素についても不変条件が成り立たない型ができます。例: inventoryはfile自身の事実を1度だけ公開し、kindごとに別々の一覧を公開します。Skillのrowは宣言名1つ、MCPのrowはcarrier内の宣言1つだからです。
- 公開するのは1つの事実だけにし、事実とそこから導けるものを併せて公開しないでください。2つの状態は食い違いえますが、1つなら食い違えません。導出値は表示する場所で計算し、walkに必要な境界は成り立つことを期待せず境界として表現してください。例: skillのcompanion censusはsort済みのfile listを公開し、rowが`length`を描画します。File件数を独立したfieldにはしません。
- 2つの状態の食い違いを検出するだけのgateは、同じ規則を持つ3つ目の場所です。ある値が別の値からどう導かれるかをcheckが符号化しなければならないなら、その対応こそが導出です。対応をtestに費やして手書きの値を残すのではなく、導出として1度だけ書き、手書きの値を削除してください。規則をtestへ移すことは単純化ではありません。例: 製品の同名skillに関する文は、その製品のskill ruleが名指すstrategyの`operations`から導出します。したがって製品ごとのtableは存在せず、それらから乖離することも、整合gateも不要です。導出が正直であるのは、導出が何も発明しない場合だけです。結果を確立しない形は文を生まず、それが何を意味するかの決定はenumに対する演算ではなくevidence reviewの仕事です。
- 同等のものを手で書く前に、platform自身の語彙に手を伸ばしてください。適用できそうに見えるplatform構成要素が適合しない場合は、その理由をコメントに書き、次の読み手が再提案しなくて済むようにします。例: client-dataのpurgeは、なぜ`DisposableStack`ではないのかを記録しています。あれは逆順に1度だけdisposeしunregisterを持たない一方、このpurgeは出入りするownerに対して登録順で繰り返し実行されるからです。
- 不変性の機構は`readonly`型で全部です。Compile済み・出荷済みのdataをruntimeで再凍結しないでください。このcodebaseが生成し消費するdataに対する`Object.freeze`は、userが経験する何も守りません。そのdataを辿るdeep freezeは、プログラムを自分自身から守るために書かれたtraversalです。例: `TraversalPlan`のconstructorはplanを記述どおりに返します。それが不変の出荷dataであることは型の性質であり、runtimeのpassではありません。
- Iterableが既に持っている挙動に到達するために、それをmaterializeしないでください。配列の分割代入、`for...of`、呼び出しへのspreadは、いずれもiterator protocolを直接消費します。したがってそれらの手前に置く`[...set]`は何も得ないコピーです。`const [first, ...rest] = set`が言語のできることそのものです。コピーするのは、元が本当に持っていないものを得る場合だけにしてください — 元が変化する間も保持したい配列、またはpushするアルゴリズムのための可変配列です。
- 変更を伴うmethodがコピーの理由になっているときは、変更を伴わないmethodを使ってください。`array.toSorted(compare)`が`[...array].sort(compare)`の書き下していた操作です。`toReversed`と`with`も同様です。
- Specificationが冗長な複雑さを要求している場合は、書かれたとおりに実装せず、同じ変更の中で両言語のspecificationを修正してください。

## Formattingの方針

- Code formattingはPrettierが所有し、手で直しません: `pnpm run format`が書き換え、
  `pnpm run format:check`がgateします。`prettier.config.js`はcodebaseが既に定めていた
  もの（幅100、single quote）だけを設定し、それ以外はPrettierの既定のままにして、
  driftする余地を減らします。
- ESLintにはformatting以外のruleだけを残します。`@stylistic/quotes`は、置換のない
  template literalを禁じる — 文字列が何であるかについての決定で、Prettierは行わない —
  ため残し、`vue/html-self-closing`は無効化せずPrettierの出力に合意する設定にします。
- `.prettierignore`はreformatしてはならないものを除外します: vendored skillはupstreamと
  byte単位で同一に保ち、spec-kitのscaffoldingはupstreamから丸ごと取り込み、Markdownは
  2言語のauthored proseであり、vendor contractの表は記録済みSHA-256 digestで凍結されて
  いて、他のtoolが所有し書き戻すfile（lockfile、`.claude/settings.local.json`）はその
  toolのものです。vendored skillは1つずつ名前で除外し、`.agents/`や`.claude/`という
  directory丸ごとでは除外しません: これらのdirectoryにはこのrepositoryで自作したskillも
  置かれ、それらは他のsourceと同じくformatの対象です。新しいvendored skillを取り込む
  作業には、その`.prettierignore`行を同じ変更で追加することが含まれます。

## Classとinterfaceの方針

- Production codeが値をちょうど1箇所で生成するtypeは、object literalで満たすinterfaceではなく
  classにします。constructorがその値のdataがどう出来上がったかを述べる唯一の場所になり、
  classを読むことが伝播を読むことになります。例: `CompiledInspectionRule`はshipped recordの
  compile — guard、plan、narrowされた`kind` — をconstructorで行い、`InventoryFilterView`は
  inventoryの全viewをconstructorで導出します。`InspectionSession`・`SessionViewState`・
  `SessionApiClient`・`ClientDataPurge`は、stateの置き場所が宣言されないfactory closureを
  置き換えたものです。
- 別のobjectのfieldを転記するだけの値は、代わりに元のobjectを保持し、読む場所で導出します —
  出元を名指すgetter、またはguardが元のfieldをnarrowし終えた場所でのconstructor代入です。
  例: `CompanionSourceFile`はcensus entryとcandidateのdirectoryを保持し、公開する2つの
  addressをそこから導出します。
- 全vendorが共有するものはabstract baseに、あるvendor固有のもの — その`tool` literal、
  そのrelations catalog — はそのvendorのsubclassに置きます。例: `CodexCompiledRule`は
  `CompiledInspectionRule`をextendsします。
- Constructor引数でのフィールド宣言（parameter property）は禁止し、ESLintで強制します
  （`@typescript-eslint/parameter-properties`）。parameter propertyは宣言をsignatureの中に
  隠すため、class本体がclassの保持するものを列挙しなくなり、fieldのdoc commentの置き場も
  なくなります。全fieldは本体でJSDoc付きで宣言し、constructorで代入します。
- Getterで`as`によるcastをしません。narrowされたtypeの証明が必要なら、constructorが証明
  します — throwするguardの後、control flowがnarrowした場所で代入し、fieldがnarrowな
  typeを保持します。
- Private stateはTypeScriptの`private`ではなく`#`-privateにします。`private`はruntimeで
  消えるため、そのfieldは`Object.keys`に現れ、runtime surfaceが宣言したAPIより広がります。
- 生成者が複数いる本物の契約はinterfaceのままにします: wire DTO（strict JSONはprototypeを
  運ばないため、serializeされるshapeはplain objectでなければならない）、authorされた
  registry record、複数の呼び出し側が組み立てるoptions bag、testがliteralのdoubleで満たす
  境界（`CandidateRecognition`、`SessionRpcChannel`）。Vue componentのpropsは、frameworkが
  shapeとして消費するためinterfaceのままにします。

## コーディングエージェントが実行するPlaywright検証の方針

- コーディングエージェントがlocal検証のためにPlaywright testを実行する場合、userが追加のbrowserを明示的に求めない限り、`chromium` project（Chrome）だけを実行してください。たとえば`--project=chromium`を明示し、設定済みbrowserをすべて実行するcommandを使わないでください。
- このdefaultはコーディングエージェントが開始するlocal検証だけを対象にします。より広いbrowser coverageをconfigurationで明示的に要求するCI、release、その他project所有のsuiteは変更しません。

## ユーザー可視テキストの方針

- あるコンポーネントだけが描画するテキストは、描画する場所に書いてください。UI 言語は 1 つなので、
  識別子をキーにした message catalog は、キーとその唯一の文字列との間の間接参照にしかなりません。
- 閉じた union が定める text は例外です。ラベル表はコンポーネントではなくその union の隣に置いて
  ください。そうすればラベルなしに新しいメンバーを追加してもコンパイルが通らなくなります。
  `entities.ts` が `CUSTOMIZATION_KIND_TEXT`・`SUPPORTED_TOOL_TEXT`・`FILE_ENCODING_TEXT`・
  `SOURCE_BOUNDARY_ORIGIN_TEXT`・`SOURCE_STATUS_TEXT`・`SAME_NAME_SKILL_RESOLUTION_TEXT`・
  `DOCUMENTATION_STATUS_TEXT`・`LIFECYCLE_QUALIFIER_TEXT` を持ち、diagnostic の text は
  `DIAGNOSTIC_REGISTRY` にあります。
- `-types` module は runtime code を一切出荷せず、表は runtime data です。したがってそれらの
  module が宣言する union の表は、隣に置く `*-text.ts` の companion に置きます。`api-types.ts`
  には `api-text.ts`、`registries/identifier-types.ts` には `registries/identifier-text.ts` です。
  この方針が求めるコンパイラによる検査は、表がどの module にあっても働きます。
- 判定基準は再利用ではなく網羅性です。`Readonly<Record<ClosedUnion, string>>` は、今日たまたま 1 つの
  コンポーネントしか読まなくても union の隣に置きます。表の完全性を保つのはコンパイラだからです。
- contract 識別子を描画する surface はありません。`codex.skill.name`・`codex.repo.skill`・
  `runtime-cwd`・`partially-documented` は、registry record の key であり contract gate の
  照合対象であるトークンです。自分のファイルを読んでいる人にとっては、答えがあるべき場所に
  立っているだけです。いずれもその union の表を通して描画します。DTO が持つ ID を `string` では
  なく閉じた union として型付けするのはそのためで、それが表の完全性を保ちます。たまたま
  メンバーと同じ綴りの通常の語はそのままにしてください。`environment` のラベルは
  "environment variable"、`MCP` のラベルは "MCP" です。

## 命名方針

- 短くて周囲の文脈を必要とする名前より、長くても常に意味が分かる名前を選んでください。
  import行、file tree、stack traceなどで初めてその識別子に出会った読み手が、それが何かを
  言える状態にします。
- 似ているものではなく、実体を名前にしてください。`shell`、`manager`、`helper`、`util`のような
  architectural metaphorは中身ではなく形を述べるもので、中身が変わると古くなります。
  例: browserのreactiveなsession stateを持つmoduleは`src/app/session/view-state.ts`です。
  `shell`のような名前が指すpage frameは実際にはcomponent側にあります。
- Directoryが文脈を供給するため、その中の名前で繰り返す必要はありません——
  `session/session-api-client.ts`ではなく`session/api-client.ts`です。ただしdirectoryと
  合わせて読んだときに意味が通る必要があります。`session/state.ts`は`session/view-state.ts`より
  弱く、誰のstateで何のためのものかを述べているのは後者だけです。
- この方針に従う改名もdocumentation changeです。古い識別子を書いている仕様artifactは、
  同じ変更の中で英日両方を更新してください。

## コードコメントの方針

- 憲章の原則IIに従い、自明でない判断、不変条件、セキュリティ上の前提、トレードオフ、互換性の制約を、影響を受けるコードの近くに文書化してください。Reviewerが作者の意図をリバースエンジニアリングせずに、変更とその理由を理解できなければなりません。
- すべてのproductionモジュールは、モジュールの役割と実装するcontractを述べるheaderコメントで始めてください。セキュリティ上重要なモジュールでは、threat modelの境界と残存する制約も記載してください。
- コメントは構文が何をするかではなく、なぜそのコードが存在するかを説明してください。仕様で定められた挙動には、根拠となるアーティファクト（例: `FR-030`、`data-model.md § Diagnostic`、`research.md § 5`）をコメント内で名指しし、reviewerがコードをcontractと照合できるようにしてください。
- Artifactは名指しする前に開き、メカニズムは根拠にする前に実行してください。確かめていない根拠は、確かめた根拠とまったく同じように読めます。artifactに存在しない条項を引用したコメントや、失敗しえないcheckを根拠にしたコメントが、以後のすべてのreviewを通して誤りをそのまま残します。
- 閉じたunion、enumのような型、固定catalogには、宣言に付けたJSDoc docコメント（`/** ... */`）で各memberを文書化し、エディタのhoverで表示されるようにしてください。値が何を意味するか、いつ生成されるか、統治するartifactがあればそれ（例: `spec.md § Closed Scan Publication Outcomes`）を示します。文字列literalの列挙だけでは自己文書化になりません。
- Exportされたinterfaceの各フィールドには、フィールドが何を意味するか、いつ設定されるか、統治するartifactがあればそれを述べるJSDoc docコメントを付けてください。1行で十分です。Mirror DTOは各行を複製する代わりに、「フィールドの意味は元のinterfaceと同じ」と1回述べる形でかまいません。
- 宣言自体も文書化してください。Exportされたinterface、type alias、定数には、その型や値が何を表すか、統治するartifactがあればそれを述べるJSDoc docコメントを付けます。
- Classの全member—フィールドとメソッド、constructorやprivate memberを含む—にJSDoc docコメントを付けてください。メソッドは呼び出しが何をするかとどのcontract挙動を実装するかを、フィールドは何を保持しどのinvariantを維持するかを述べます。
- 仕様化されたcontractを実装するexportされた関数・クラス・定数には、そのcontractの挙動を述べるdocコメントを付けてください。拒否やfail-closedの分岐には、その拒否が何を守るのかを記載してください。
- テストからだけ到達させるために存在するexported memberも、public APIです。そのdoc commentに、テスト専用であることと、なぜそのmoduleの表面からはその挙動を観測できないのかを明記してください。可能なら必要性自体をなくしてください——moduleが保持する値ではなく、renderする内容、返す値、発行するrequestを検証します。例: client-data epochのcounterにaccessorは不要です。それが守る挙動——purge前にcaptureしたresponseがstateを復活させないこと——は、破棄されたそのresponseから観測できるためです。
- テストファイルは、担当タスクIDと検証対象の挙動を述べるコメントで始め、カバレッジを`tasks.md`まで遡れるようにしてください。
- コードコメントは英語で書いてください。日本語で重複させてはいけません。上記の二言語ドキュメント方針はドキュメントに適用されるものであり、ソースコードのコメントには適用されません。
- 防御的な分岐 — guard、catch、fail-closedなearly return — には、そこへ到達する呼び出し元を名指ししてください。そのcaseが起きたらなぜ悪いかではなく、どの呼び出し元がそれを生むかです。名指しできない分岐は、書かずに削除してください。
- コメントを古くする変更では、同じ変更の中でそのコメントを削除または修正してください。誤解を招くコメントは、無いことより有害です。

## 公式出典の検証方針

Registry recordは`EvidenceCitation`を通じてvendorの公式ドキュメントを引用し、その`sections`
fieldは実際にレンダリングされた見出しのexact textを保持する。この引用の検証はドキュメント作業で
あり、固有の失敗モードがある。

- ページのraw bytesを読む。`curl`で取得し、`<h1>`–`<h4>`に対する正規表現で見出しを抽出する。
  引用URLが`.md`版なら`^#{1,4} `に対して行う。末尾の空白が要点で、`#####`も`####text`も見出しではない。要約器が出した見出し一覧は根拠にならない。実在する
  本文見出しを「存在しない」と報告することがあり、正しい引用を誤って書き換える原因になる。
- 本文見出しとサイトナビゲーションを区別する。これらのドキュメントサイトはナビゲーションにも同じ
  heading tagを使う。本文見出しは自身のtextに対応する`id` slugを持つ。
- 配信HTMLに見出しが無いことは、それだけではdriftを意味しない。client renderingのページは目次
  だけを配信するため、見出しは存在しても`<h*>` elementは存在しない。目次のanchor slugがその証拠に
  なる。`code.claude.com/docs/en/changelog`のversionごとの見出しがこの挙動である。
- ページはfull URLまたはレンダリングされたtitleで呼ぶ。パスの末尾だけで呼んではならない。
  `https://code.claude.com/docs/en/memory`を「memoryページ」と書くと、実際に取得したページの
  話ではなくassistant自身のmemoryの話に読める。
- `reviewedOn`は、引用sectionとrecordを突き合わせた後にだけ進める。ページが確立する内容は保守
  対象のparaphraseに記述する。ページが述べていない主張は`documented`ではなく
  `partially-documented`である。
- ページの移転はcitationの変更であって、recordの書き換えではない。引用した見出しが消えた場合は、
  recordを弱める前に別の公式URLに内容が移っていないか探す。これらのvendorはページをhost間で移転させ、
  本文はそのまま残すことがある。

## Pull requestの文章スタイル

- Pull requestのタイトルと説明は、人間のreviewerに向けた簡潔で自然な文章にしてください。
- Pull requestの説明は全文を英語で書いてください。日本語訳や、複数言語で重複した説明を含めてはいけません。
- Pull requestの説明で、汎用的な見出しとして`Summary`を使用してはいけません。
- 短いpull requestでは、`Scope`、`Key decisions`、`Verification`などのtemplate的なsectionを並べないでください。少数の直接的な段落を基本とし、内容上本当に必要な場合だけ見出しやlistを使用してください。
- Pull requestが何を提案し、なぜ必要なのかに集中してください。Reviewに必要な場合を除き、実装の履歴、復元手順、commitの順序を説明してはいけません。
- Pull requestを公開または更新する前に、定型文、重複した前置き、作業手順についての自己言及的な説明を削除してください。
