# リポジトリ指示

[English](AGENTS.md)

プロジェクトの開発とレビューは、
[プロジェクト憲章](.specify/memory/constitution.ja.md)に従います。

作業方針はこのファイルに置きます。単一の変更が何をするかではなく、作業の進め方が定まったときは、
同じ変更の中で両言語でここに書いてください。会話で合意しただけの方針は、次のセッションには存在しません。

## 結論より先に証拠を確認する方針

- モデルの世代、性能tier、reasoning設定は、結論が信頼できることの証拠ではありません。最高tierかつ
  最大reasoning設定のGPT系モデルでも、もっともらしい結論へ早すぎる段階で到達し得ます。短絡的な判断を
  常に起こり得るriskとして扱い、モデルへの信頼で消えたと見なさず、検証によって抑えてください。
- 欠陥を報告する前に、候補となる指摘を次のすべてに照らして追跡してください: 現在のcodeで再現した
  挙動、根拠となるspecificationとcontract、それを所有する完了済み・現在・将来のtask、明示的な先送りや
  受容済み制約、そして実際にその挙動を生じ得るproduction callerとuser-visible surfaceです。「今は存在
  しない」ことと「今必要なのに欠けている」ことは同じではありません。
- 候補となる指摘を採用する前に、反証を試みてください。現在のcodeが正しいと説明できる最も強い
  repository上の根拠を立て、その説明を裏付けるものをcodebaseとartifactから探し、矛盾する証拠を解消
  してください。証拠が揃わない場合は、推論を事実として報告せず、不確実性を明示してください。
- Reviewは変更行やtestの成功だけで終えてはいけません。周囲のdata flow、comment、test、英日document、
  task ownership、後続の計画済み作業まで読んでください。反対に、testや仕組みが存在しないという理由
  だけで追加を要求してはいけません。現在のscopeがそれを要求し、他のlayerや将来taskが所有していない
  ことを先に立証してください。
- Userが事実誤認を訂正したときは、その誤りを生んだ推論patternを監査し、同じ短絡を使った他の指摘も
  続行前に再確認してください。報告された1件だけを直しても、同じ失敗が再発できる状態は残ります。
- 1つの文への訂正は、その文への訂正です。そこから一般化した規則は自分の推論なので、自分のものとして
  保持し、Userが決めたこととして引用してはいけません。自分の推論を相手の決定として提示すれば、それを
  訂正できたはずの会話が終わり、誰も与えていない権威を根拠に作業を断ることになります。
- 要件が何を求めているかを述べる前に、その節を最後まで読んでください。ここでの要件はしばしば1つの
  長い文の連なりであり、冒頭はその要約ではありません。FR-007を冒頭数行から性格づけた結果、
  「inventory rowの単位を定めていない」という主張が出ましたが、その文の連なりが定めている当のものが
  それでした。最後まで読んだ本文から引用するか、読んでいないと述べてください。
- Userに判断を求める前に、artifactの中に決定が無いか探してください。Specificationがすでに答えて
  いる問いは、userの注意を費やしたうえ、決着済みの問いに2つ目の食い違う答えを招きます。しかも
  決着済みの答えの方が通常は優れています。契約全体を見たうえで下されたものだからです。artifactが
  開いたままにしていることだけを尋ね、どのartifactを確認したかを述べてください。
- Agent駆動のrunは、agent駆動のrunとして記録してください。ここで何かを人の代わりにsubagentで
  測ったとき — first-useの評価、reviewのpanel、walkthrough —
  記録はその方法を名指しし、結果を人のものとして提示してはいけません。Agentが立証するのは、
  productが自ら示すguidanceとsurfaceで足りるかどうかです。同じものを人がどう体験するかはその
  evidenceに含まれず、そこから主張することはできません。「participant」と書かれた基準は、実際に
  走らせるものを述べるよう、それを走らせる変更の中で、両言語とも修正してください。

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
- 決定をユーザーに帰属させないでください。「user decision」「by user decision」やその訳語は何も
  述べていません。code と artifact の所有者はユーザーであり、ここに記録される決定はすべて既に
  ユーザーのものだからです。一部にだけ印を付けると、残りは誰が決めたのかという問いを新たに
  生じさせます。決定とそれが成り立つ理由を記録してください。帰属だけが内容だった note は、
  言い換えるのではなく削除します。

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

## readmeの方針

readmeの本文は1人のために書く。`npx agent-customization-inspector` を実行するか判断している人か、
それが開いたページを読んでいる人である。開発者向けの節は、このリポジトリを変更する人のために書く。
仕様要件も、レビュー指摘も、contract条項も、そのどれもがその人ではない。それらにreadmeの本文で
答えることが、readmeが読まれなくなる経路である。

- 要件は、その内容を所有するartifactが満たす。readmeの本文が満たすのではない。「documentation」と
  だけ書いてartifactを名指していない要件は、どれが所有するのかを、それを決める同じ変更で両言語に
  書く。例: 正確な調査対象パス一覧と、今回のreleaseが対象外とするsurfaceはvendor contractのもので
  あり、ruleごとに根拠と並べて述べられている。readmeはそのどちらも持たない（QR-004）。
- readmeが答えてはならない問いにも、読者はいる。そしてその読者を仕様artifactへ送ってはならない。
  `specs/`が持つのはcontractであってユーザードキュメントではない。答えが本当に利用者のもので
  あるとき、それは`docs/`配下のページに利用者向けに書き、readmeからリンクし、両言語で用意する。
  語彙は製品が見せるものであって、ruleをオーサリングする際のものではない。例:
  `docs/which-files-are-listed.ja.md`は、読む場所をツールごと・種別ごとに散文で列挙する。
  Selector programも`ANY_DIRECTORIES`も、vendor contractへのリンクも使わず、一覧以外を載せない。
  散文はruleから導出できないため、正しさを保つgateは包含関係とする。出荷されるruleがadmitする
  literal segmentは、すべて両言語のページが名指していなければならない。
- 広すぎる主張は狭める。注記を足さない。文末に足した例外は、届かせるべきだった一文を中断させ、
  しかも誰もしていない誤読に答えている。狭めた主張になお例外が要るなら、主張のほうを落とす。判定は
  「それを知らないことで損をするのは読者か、レビュー担当者か」である。例: 行が見せる宣言はファイル
  自身の並び順としては約束しない（スキルは文書化されたキーが先頭に来るため）。比較のペアはリポジトリ
  側と個人設定側にまたがらないが、その組を持つ読者は差分リンクが出ないだけなので、一節も使わない。
- 正確さは網羅ではない。readmeは偽を書かないが、真をすべて書く義務は負わない。文が誤りなのは、
  それに従って動くと外れるときであって、触れていない場合を挙げられるときではない。

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
- 一覧のrowの単位は、列挙される対象自身のものであり、それが見つかった入れ物のものではありません。ある領域の2つの要素が異なる数え方をされるとき — fileごとに1 row、file内の宣言ごとに1 row、複数fileが共有する名前ごとに1 row — それらはrow型を共有しません。1つの形をoptional fieldで広げて全部に合わせると、どの要素についても不変条件が成り立たない型ができます。例: inventoryはfile自身の事実を1度だけ公開し、kindごとに別々の一覧を公開します。Skillのrowは1つのtoolが解決した名前1つ、MCPのrowは宣言されたserver名1つで、その名前を解決する宣言 — `(carrier, tool)`につき1つ — をrow内に列挙するものだからです。
- 公開するのは1つの事実だけにし、事実とそこから導けるものを併せて公開しないでください。2つの状態は食い違いえますが、1つなら食い違えません。導出値は表示する場所で計算し、walkに必要な境界は成り立つことを期待せず境界として表現してください。例: skillのcompanion censusはsort済みのfile listを公開し、rowが`length`を描画します。File件数を独立したfieldにはしません。
- 2つの状態の食い違いを検出するだけのgateは、同じ規則を持つ3つ目の場所です。ある値が別の値からどう導かれるかをcheckが符号化しなければならないなら、その対応こそが導出です。対応をtestに費やして手書きの値を残すのではなく、導出として1度だけ書き、手書きの値を削除してください。規則をtestへ移すことは単純化ではありません。例: 製品の同名skillに関する文は、その製品のskill ruleが名指すstrategyの`operations`から導出します。したがって製品ごとのtableは存在せず、それらから乖離することも、整合gateも不要です。導出が正直であるのは、導出が何も発明しない場合だけです。結果を確立しない形は文を生まず、それが何を意味するかの決定はenumに対する演算ではなくevidence reviewの仕事です。
- Release gateのtask件数・phase件数・trace row件数は、上の規則に対する意図的な例外です。これらは導出
  ではなくfreezeです。誰も変えるつもりのなかった件数が気づかれずに変わらないようにすることが目的で
  あり、vendor contract表が記録済みdigestを持つのと同じ理由です。両言語の件数を更新せずにphaseやtask
  を追加した変更は未完了であり、件数はそれを追加する変更の一部です。
- Freezeは、それを検査する場所に値を書き出してください。検査対象のcodeから期待値をimportするcheckは、何もassertしていません。両辺が一緒に動くため失敗しえず、固定された値に見えるものは、sourceがたまたま今持っている値の言い換えにすぎません。Checkにliteralを書き、sourceにも同じliteralを書いてください。同じ文字列を意図的に2度書いているのであり、両者が食い違うのは、一方を変えると決めずにもう一方を変えたときちょうどそのときです。それこそがfreezeの検出するものすべてです。そのcheckを書く前にsourceの値を変えて失敗することを目で確認してください。失敗するところを誰も見ていないfreezeは、誰も持っていないfreezeです。
- 1箇所だけが読む値は、その場所に書いてください。それをexportされた名前付き定数へ持ち上げることは、読み手が1つしかない名前のためにhopと開くべき2つ目のfileを増やすことであり、上のtautologyが書かれる経路でもあります。値に名前がついた途端、checkは値を述べる代わりにその名前をimportします。抽出が引き合うのは、複数の場所がcompile時に一致しなければならない場合だけです — 閉じたunionのlabel table、複数moduleが綴るcontractで固定された識別子など。例: consent previewの`allowlistVersion`と`traversalPlanVersion`は、previewのconstructorで代入される2つのliteralであり、contract suiteが同じliteralで両方を固定します。どちらもrule registryやplan compilerからexportされた定数ではありません。
- 一貫性はそれ自体が価値です（憲章原則II）。同じに見えるコードは同じであり、だから違いは常に意味を持ち、読み手はfamilyの1つのmemberから学んだことを残りへ当てはめられます。したがってpatternはfamily全体に適用するか、まったく適用しないかであり、idiomを変える変更は同じ変更で全memberを変換します。部分的な変換は妥協ではなく、未完の変更です。
- 逸脱は、その理由とだけ共存できます。周囲のpatternから外れるもの — コードでも、テストでも、fixtureでも、文書でも — は、その場合を区別する明示された相違の上に立ちます。そしてこの義務は導入時に1回ではなく、逸脱が生きている間ずっと続きます: その相違を消す変更は、同じ変更で逸脱も変換します。理由が消えた逸脱は、守るべき決定ではなく直すべき欠陥だからです。この規則はpatternの導出元にも、後続のあらゆる場合と同じく及び、適合は読み手が出会うもの — 名前、形、そして消費するすべての箇所 — で判定します。実装が下で共有されているかどうかでは判定しません。運用のためのチェックは2つ: 逸脱を導入するときは、その区別の理由を逸脱が住む場所に書き、探せるようにする。変更が「以前は偽だったこと」を真にしたときは、古い状態の上に立っていたもの — 明示された理由、コメント、免除 — を検索し、見つけたそれぞれを導出し直す。例: instruction rowは「blockがcomparison entryという自前の内容を持つ」という明示された相違を理由に2コンポーネント構造を保持していたが、後の横展開がその内容を全kindのblockへ与えた。理由が消えた時点でその構造は欠陥であり、`InstructionRow`は他のsiblingと同じく`SourceFamilyBlocks`で描画するようになった。
- `src/shared/registries/*/rules.ts`のregistry recordは、`matcher`をinlineに綴ります — baseもselectorも、名前付き定数を介しません。ruleがどの場所へ到達するのかは読み手が最初に問うことであり、その答えはrecordの中にあるべきだからです。意図して同じ場所をadmitするrecordたちは、それぞれがmatcherを完全に書き出し、value-equalityのgateがその一致を凍結します — 上のfreezeの原則を構造化された値へ適用したものです。
- 同等のものを手で書く前に、platform自身の語彙に手を伸ばしてください。適用できそうに見えるplatform構成要素が適合しない場合は、その理由をコメントに書き、次の読み手が再提案しなくて済むようにします。例: client-dataのpurgeは、なぜ`DisposableStack`ではないのかを記録しています。あれは逆順に1度だけdisposeしunregisterを持たない一方、このpurgeは出入りするownerに対して登録順で繰り返し実行されるからです。
- 不変性の機構は`readonly`型で全部です。Compile済み・出荷済みのdataをruntimeで再凍結しないでください。このcodebaseが生成し消費するdataに対する`Object.freeze`は、userが経験する何も守りません。そのdataを辿るdeep freezeは、プログラムを自分自身から守るために書かれたtraversalです。例: `TraversalPlan`のconstructorはplanを記述どおりに返します。それが不変の出荷dataであることは型の性質であり、runtimeのpassではありません。
- Iterableが既に持っている挙動に到達するために、それをmaterializeしないでください。配列の分割代入、`for...of`、呼び出しへのspreadは、いずれもiterator protocolを直接消費します。したがってそれらの手前に置く`[...set]`は何も得ないコピーです。`const [first, ...rest] = set`が言語のできることそのものです。コピーするのは、元が本当に持っていないものを得る場合だけにしてください — 元が変化する間も保持したい配列、またはpushするアルゴリズムのための可変配列です。
- 変更を伴うmethodがコピーの理由になっているときは、変更を伴わないmethodを使ってください。`array.toSorted(compare)`が`[...array].sort(compare)`の書き下していた操作です。`toReversed`と`with`も同様です。
- 上の規則はmechanismについてのものであり、すでに公開している値の正しさには適用しません。出荷済み
  contractの値は、今日それ自体として真でなければなりません。「まだ誰も消費していない」は誰が損害を
  受けるかへの答えであって、その言明が成り立つかへの答えではありません。globとして文書化した適用
  範囲を、宣言側の消費者がいないという理由でescapeせずに公開した結果、`packages/[api]` directoryは
  文字classを意味するpatternを公開しました。誤りだったのは何かが最初に読んだ時点ではなく、公開した
  時点です。
- Specificationが冗長な複雑さを要求している場合は、書かれたとおりに実装せず、同じ変更の中で両言語のspecificationを修正してください。

## Platform baselineの方針

Browserの下限はBaseline Newly available、Nodeの下限は`engines.node`が宣言するものです。どちらも意図的に前線寄りです。この製品のbrowser supportは市場のstatisticsではなくcertification matrixだからです — `playwright.config.ts`はChromium・Firefox・WebKitをそれぞれ1 revisionずつpinしており、3つすべてが出荷している機能は、認定browserすべてが持つ機能です。Baseline Widely availableを待てば、platformがその機能を備えたあとも何年ものあいだ手書きの等価物がtreeに残り、そのひとつひとつをこのrepositoryが正しく保ち続けることになります。

- 認定3engineすべてが出荷した時点で、platform自身の構文を採用してください。これはシンプルな実装の方針の「手書きの等価物を書く前にplatform自身の語彙へ手を伸ばす」に期日を与えたものです。File openのcontrolの一覧はanchor positioningで配置したpopoverなので、light dismiss、Escape、top layer、空きのある側の選択はこのrepositoryではなくplatformのものです。配列の`Map`を組み立てるloopは`Map.groupBy`、後続のeventがsettleさせるpromiseは`Promise.withResolvers`、module自身のdirectoryは`import.meta.dirname`です。
- Supportは思い出すのではなく、pinしたrevisionに対して実測してください。互換性tableはwebを、modelのtraining dataは過去を記述しますが、ここを支配するのはpinされた3 revisionの挙動であり、`CSS.supports()`と`playwright`経由のfeature probeが数秒で答えます。実測が設計を決めた箇所には、何が観測されたかを記録してください。
- 認定engineの1つが欠く機能は、欠けても読み手が依存するものが何も変わらないprogressive enhancementとしてのみ使えます。Surfaceの正しさが乗っている機能は、3つすべてが揃うまで待ちます。
- 機能が使えないと記録したコメントは、恒久的な言明ではなく日付つきの言明です。周辺のコードに触れるときに再実測し、実測が食い違ったら、コメントとそれが説明していた回避策を同じ変更で削除してください。

## 依存versionの方針

- `package.json`の全dependencyはcaret rangeで宣言し、exact pinは使いません。Prerelease（`^2.0.1-rc.22`）も同様です。exactなresolved versionとintegrityはcommit済みlockfileが所有し、manifestにexact specifierを書くと同じpinを2箇所で管理することになります。ある解決が別のpackageの解決と一致しなければならない場合 — `h3`とdevframe自身のh3 — その一致が住む場所はlockfileであり、決定を記録するdocumentはそう書きます。

## リリースの方針

リリースはChangesetsが所有します。userが受け取る変更 — 挙動、surface、publishされるpackageに届くdependency — を運ぶpull requestは`.changeset/`のentryを追加し、それは`pnpm exec changeset`が書きます。userから観測できない変更はentryを持ちません: specificationの編集、test、commentです。この区別をgateする仕組みは無いので、pull requestを書くときに判断します。

- Publishはnpmのtrusted publishingなので、npm tokenはこのrepositoryにもそのsecretにも存在しません。npmは`.github/workflows/Release.yml`をその名前で信頼するため、そのfileのrenameはnpmjs.com側のtrusted publisherの変更でもあります。両者が再び一致するまで、何もpublishされません。
- workflowは4つのjobで、その形を決めるのはcredentialです。`select-mode`がmainへのpushが何であるかを言い、`version`がrelease pull requestを開くか更新し、`pack`がbuildしてtarballへpackし、`publish`がそれをuploadします。そして`id-token: write` — npmがpublish tokenと交換するcredential — は`publish`だけに与えられます。`changesets/action`のsub-actionはそのために存在し、combined actionにはできないことです: 単一のjobがreleaseに必要なすべての権限を同時に持ち、buildとbuildが到達するdependencyのcodeを走らせる間も持ち続けます。他のjobが持つのは、それぞれが行うことだけです: `version`はversion commitとpull requestを書き、`select-mode`と`pack`はcheckout以外に何も与えられません。
- Renovateは2つを除くすべての更新を自動mergeします。除くのは、runtime dependencyのmajorと、1.0.0未満のpackageのminorです。それ以外は、すべての依存の`minor`・`patch`・`pin`・`digest`も、devDependency・workflow action・devcontainerのmajorを含むすべての更新typeも、ci.ymlがsuite全体を走らせたうえでmergeされます。pre-1.0の除外はRenovate自身の文書が求めているものです。SemVerは`0.x`のどのreleaseでも破壊的変更を許すため、そこでのminorはcaret rangeが止まる境界であり、それを動かすことはrange内のbumpではなく受け入れversionの変更にあたります。このruleは`packageRules`の最後に置きます。後のruleが勝つためです。そうしたpull request自身は`.changeset/`のentryを持ちません。bumpは、次のversion pull requestが開くreleaseに乗ってuserへ届きます。
- release runはqueueせず上書きします（`cancel-in-progress: true`）。mainへの最新のpushだけがpublishするため、mainが先へ進んだcommitのrunが、置き換えたrunの後からnpmへ届いて同じ内容を別versionでpublishすることは起きません。この中断はpublishするjobの内部、npm publishとtag pushの間にも起こり得ますが、それは受け入れる側のtrade-offです。欠けたtagとreleaseはversion commitに対して人が後から作れますが、二重publishは取り消せません。この行は見た瞬間に逆の提案を招くため、workflowの`concurrency`blockにその理由を書いてあります。
- どのworkflowもactionをcommit SHAではなくtagで参照します。pinしたSHAは、それを上げる仕組みと同じ鮮度にしかなりません。botで自動更新すれば、tagが既に置いているのと同じ信頼をaction所有者へ置き直すだけであり、放置すれば修正の届かないversionにworkflowを固定し続けます。
- release pathはci.ymlが所有するgateを再実行しません。同じcommitに対しpull requestが既に実行したsuiteをここでもう一度走らせても得るものはないため、releaseが足すのはartifact自体についての2つだけです: tarballを生成するbuildと、packされる直前のtreeに対するpackaged-tree verificationです。
- `pack`はpack前に`pnpm run build`と`pnpm run verify:package`を実行するので、publish credentialを持つjobはこのrepositoryのbuildを一切走らせず、別のjobが既にgateしたbyteをuploadします。
- `.changeset/config.json`には、`@changesets/config`が出荷するdefaultと異なる値だけを書きます: changelog generatorと`access`です。default値のcopyは、copy元のdefaultを追跡しなくなった値です。
- `changeset init`が書く`.changeset/README.md`は置きません。Changesets自身のdocumentationへのlinkであり、このrepositoryのdocumentは2言語のdocumentです。リリースについてこのrepositoryが決めたことは、代わりにここに書きます。
- `CHANGELOG.md`はChangesetsの出力であり、ドキュメントの言語方針が生成fileを除外する対象です。日本語版を書く必要はありません。`package.json.files`には入れないので、npmが配るのはreadme、historyを配るのはGitHubです。

## Iconの方針

- IconはIconifyのcollectionから取り、`unplugin-icons`がbuild時にbundleへcompileする:
  `import ExternalLinkIcon from '~icons/lucide/external-link'`は、そのicon自身のSVGを持つ
  componentになる。Icon runtimeもiconのfetchも同梱されない。これはoutbound requestを一切
  発行しないproductにFR-022が要求する形であり、IconifyのAPI前提のruntimeを — APIを無効に
  してもなお — 使わない理由でもある。
- Bundleがまだ運んでいないcollectionからiconを取ることは、1つの変更の中の3つの編集である:
  `@iconify-json/*`のdevDependency、`scripts/third-party-notices-plugin.mjs`における
  そのcollectionの`~icons/<collection>/`行、そして — これらの生成packageはicon dataを配布
  しながら自身のlicense fileを持たないため — そのcollectionのupstream license textを
  `licenses/<package name>.txt`へ置くこと。Notice buildは、公開すべきtextの無いbundled
  packageで大きな音を立てて失敗するため、抜けが黙って通ることはない。
- `currentColor`を継承する単色のmarkを優先する。周囲のtextとともに暗くも明るくもなるためで
  ある。色が固定されたbrand logoは、muteされたcontrolの中で明るいままになる。Editorを
  full-colorのlogoではなく単色のbrand glyphで示しているのはそのためである。
- Vendorのmarkはその例外であり、色こそがそれらの存在理由である。認識したproductは、この
  productが示す何よりも多くの行の傍らで述べられる。そしてそのうち1つを探して一覧を走査する
  読み手は、15pxのsilhouetteを3つ見分けるよりも、色を追うほうがはるかに速い。`currentColor`
  の下では3つのmarkが同じ色になるため、1つを見つける作業は、形がもっとも判別しにくい大きさ
  での形状弁別になってしまう。したがって、各vendor自身の単色glyphを、そのvendor自身の色で
  描く。値はvendorが公開しているbrand colorそのままではなく、明暗どちらの地の上でも読める
  ところまで彩度を落としたものである。markがmuteされた行の中に収まり、そこから叫ばないため
  であり、これは`currentColor`の既定が守っていたものを、継承ではなく値によって守り続けると
  いうことである。色だけに意味を持たせてはいない(WCAG 1.4.1): 各markは自身の形を保ち、
  productは凡例で名指され、各markの傍らのsurfaceはtextである。よって、forced-colorsや単色
  のrenderingが失うのは走査の助けだけで、情報は失われない。
- 何かを識別するmarkは、その名前を描画しないtextとして持つ。rowの上でどのproductかを言うのは
  markだけなので、装飾ではなく情報を運ぶ非textコンテンツであり、等価なaccessible nameを負う
  (contracts/accessibility-acceptance.md § 1.1.1)。凡例は鍵であってtextの代替ではない。自分の
  語ですでにproductを名指す呼び出し元は、代わりにmark全体を隠す — それが凡例そのものであり、
  そこではglyphが意味する名前の傍らに立っている。

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
- Memberの置き場所は、それが何についての事実かで決めます。到達しやすさで決めてはいけません。
  一部のmemberだけが持つcapabilityは、その族全体を表すtypeには属しません: 複数のkindにまたがる
  typeが、そのうち1つにしか意味を持たないmemberを宣言すると、他のすべてのkindが答えを持たない
  問いに答えさせられます。呼び出し側ではなくcompilerを満たすために書いた実装は、そのmemberの
  置き場所が誤っている証拠です。出荷する実装のコメント自身に「まだ誰も呼ばない」と書く必要が
  生じたら、それが合図です。狭い族には専用の単位を与え、呼び出し側には
  それらが構成するclosedなunionを、もともと両者を区別しているfieldでdiscriminateさせて
  持たせます。そうすればcompilerが答えられる単位へnarrowし、呼び出し側はcapabilityを
  主張しません: 1つの広いclassに対する型述語 — fieldの比較から`x is Narrow`を返すもの — は、
  主張したmemberについて何も証明せず、guardの服を着たcastでしかありません。各単位は自身の
  半分をconstructorで証明し、class本体が約束するnarrowなdiscriminantを宣言します。例: instruction fileの適用範囲は`instructions` ruleについての事実なので、全kindが
  共有するrule単位ではなくinstructionのcompiled単位に置きます — skill ruleはそれについて
  何も答えません。
- 同じ判定は1つ上の層にも当てはまります: 出荷するrecordのfieldが1行を除いて空であるなら、
  それは1つのvendorの事実を、全vendorが運ぶshapeで記述しています。事実は属する場所 — その
  vendor自身のmodule、記述対象のrecordの隣 — に置きます。各vendorのconfiguration readerが
  自身のruleの隣にあり、scanがvendorを知らずにそれを合成するのと同じ形です。

## コーディングエージェントが実行するPlaywright検証の方針

- コーディングエージェントがlocal検証のためにPlaywright testを実行する場合、userが追加のbrowserを明示的に求めない限り、`chromium` project（Chrome）だけを実行してください。たとえば`--project=chromium`を明示し、設定済みbrowserをすべて実行するcommandを使わないでください。
- このdefaultはコーディングエージェントが開始するlocal検証だけを対象にします。より広いbrowser coverageをconfigurationで明示的に要求するCI、release、その他project所有のsuiteは変更しません。
- 変更が実際に影響しうるspec fileだけを実行し、それ以外は実行しないでください。全件実行には数分かかるため、1つのpageの挙動を知るために回せば、誰も尋ねていない300件の答えにその時間を使うことになります。spec名を指定してください: `npx playwright test --project=chromium tests/e2e/<spec>`。1件のcaseが問題なら`-g`でさらに絞ってください。
- 最終確認も含め、全件実行はできる限り避けてください。作業を終えること自体は300件のbrowser testを回し直す理由になりません。その作業の変更が到達しうるspecを — 最後の変更だけでなく、その作業で行った全変更について — 名指しして実行してください。全件実行に手を伸ばすのは、shell、router、全pageが描画する共有componentのように変更が本当にsuite全体へ及ぶ場合だけとし、その場合は報告でそう述べてください。
- どのbrowser testからも観測できない変更 — registryのコメント、仕様文書、taskのcheckbox、unit testやcontract test — の後にはend-to-end実行を行わず、それを所有するgateだけを実行してください。

## エージェントが起動したプロセスの方針

- コーディングエージェントが起動したプロセスは、コーディングエージェントが終了させます。dev server、fixtureの起動（`pnpm run start:fixture`）、watcher、その他検証のためにbackgroundへ回したものは、turnが終わる前に終了してください。userが、すでに離れたbuildにportを握られたまま、あるいはtreeを配信されたまま取り残されることがないようにするためです。
- 起動時に得たhandleで終了してください: 記録したprocess ID、あるいはpreview toolingで起動したserverなら`preview_stop`です。終了したと仮定せず検証してください — launcher scriptはそれがspawnしたserverが動いたまま終了することがあり、親が`init`のorphanが残ります。killの後の`ps`こそがportの解放を示します。
- このsessionが起動していないプロセスを終了させてはいけません。名前による`ps`の一括処理はuser自身のserverやeditorにも届くため、対象はこのturnのtranscriptが起動を説明できるプロセスに限ります。
- 例外は、userが動かし続けるよう求めたプロセスです。残す場合はそのportまたはURLとともに明示してください。turnを終えることが、その所在を見失うことと同じにならないようにするためです。
- Port 9999はマシンの持ち主のものであり、コーディングエージェントが起動したどのプロセスもこれをbindしてはいけません。これはdevframeのdefault portであるため、このプロダクトのhostはどの起動でも求められないままそこへ手を伸ばします — `pnpm start`、`pnpm run start:fixture`、そして`tests/e2e/launch-host.ts`と`tests/package/npx-launch.test.ts`を通るsuiteです。代わりに`--port 0`を渡してください。devframeが空きportを選び、launch lineに表示します。どちらの場合もbindされたportはlaunch lineから読むので、事前に知らないことで失うものはありません。エージェントが空いている間だけportを空けておくのは、確保したことになりません: devframeは塞がったportからは移りますが、空いているportは取るため、`--port 0`を省いたエージェントは、持ち主がまだ握っていない瞬間にちょうど9999を取ります。

## ユーザー可視テキストの方針

- あるコンポーネントだけが描画するテキストは、描画する場所に書いてください。UI 言語は 1 つなので、
  識別子をキーにした message catalog は、キーとその唯一の文字列との間の間接参照にしかなりません。
- 閉じた union が定める text は例外です。ラベル表はコンポーネントではなくその union の隣に置いて
  ください。そうすればラベルなしに新しいメンバーを追加してもコンパイルが通らなくなります。
  `entities.ts` が `CUSTOMIZATION_KIND_TEXT`・`SUPPORTED_TOOL_TEXT`・`FILE_ENCODING_TEXT`・
  `SOURCE_BOUNDARY_ORIGIN_TEXT`・`SOURCE_STATUS_TEXT`・`SAME_NAME_SKILL_RESOLUTION_TEXT` を
  持ち、diagnostic の text は `DIAGNOSTIC_REGISTRY` にあります。どの surface も描画しない
  閉じた union には表が要りません。`DocumentationStatus` と `LifecycleQualifier` は registry 上の
  maintenance record であり、ラベルを付ける場所がありません。
- `-types` module は runtime code を一切出荷せず、表は runtime data です。したがってそれらの
  module が宣言する union の表は、隣に置く `*-text.ts` の companion に置きます。`api-types.ts`
  には `api-text.ts` です。
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

## Stylesheetのscopeの方針

配置:

- componentが自分のために持つstyleは、そのcomponentの `<style scoped>` に書きます。global
  stylesheetには書きません。ruleとそれが選択するmarkupが一緒に移動し、一緒に読まれ、一緒に
  削除されるようになり、class名がそれを使う唯一のtemplateより長生きすることがなくなります。
- `src/app/styles/main.css` が持つのは、本当に共有されるものだけです。design token、要素level
  の基準値、複数のcomponentが適用するutility classです。ちょうど1つのcomponentしか描画しない
  classを名指しするruleは、そのfileの現在の中身がどうであれ、そこには属しません。
- Class名の持ち主はちょうど1つです。global sheetとcomponentが同じclassを宣言してはいけません。
  持ち主が2つあると、片方でruleを移動・改名・削除しても、もう片方はそのclassを選び続けます。
  どちらのruleが要素に効くかは、所有関係ではなく読み込み順の問題になります。

命名:

- ComponentのclassはBEMとし、blockはそのcomponent自身の名前にします。名前がruleの在処を示す
  ようにするためです。`DeclarationBlock.vue` なら `aci-declaration-block`・
  `aci-declaration-block__key`・`aci-declaration-block__nested--list-item`、
  `SkillFileTreeBranch.vue` なら `aci-skill-file-tree-branch__file`、`ScanProgress.vue` なら
  `aci-scan-progress__actions` です。blockをcomponent名にすることで、global sheetとの衝突は
  「避けるもの」ではなく「起こり得ないもの」になり、browserのinspectorで見たclassから、それを
  styleしているfileへ辿れます。
- Global側のclass名は素のままにします。どのcomponentにも属さないからです。複数のcomponentが
  適用するutility (`.aci-note`・`.aci-muted`・`.aci-authored-text`・`.aci-panel`・
  `.aci-definition-grid`) と、共有widgetのclassがこれにあたります。global ruleがcomponentの
  classを名指すことはないので、utilityではなくmarkupへ届く必要があるときは要素を選びます。
  見出しの基準値はshellのclassを通した書き方ではなく `h2` です。

移動時に確認すること:

- そもそもruleを移動できるかを決めるのは、selectorのsubject — `scoped` がcomponentのdata属性を
  付ける、最も右のcompound — です。そのsubjectを1つ以外のcomponentも描画しているときに限り、
  ruleはglobal sheetに属します。scopedにすると一致しなくなり、その失敗は例外ではなく沈黙として
  現れるからです。`h2` の基準値がその例で、多くのcomponentが `h2` を描画するため、どれか1つの
  中では `h2[data-v-…]` となって残りに届かなくなります。
- `:deep()` を使えばcomponentの中からでもそうしたselectorは再び一致しますが、この用途の答えでは
  ありません。すべてのpageが依存する基準値を、escape hatchの裏で1つのcomponentへ移すことになり、
  それはこの方針が防ごうとしている配置そのものです。componentが子へ渡すmarkupを本当にstyleする
  場面で使ってください。
- 2つのcomponentのclassにまたがるgrouped selectorは、移すのではなく判断が要ります。分割すれば
  宣言が重複するので、その見た目を両方が適用するutility classにするか、それが書かれるまでruleを
  そこに残すかのどちらかです。
- Scopeは入れ子や再帰で破られません。`.parent > .child` のようなselectorは、両方の要素をその
  styleを所有するcomponentが描画している限り一致し、自分自身を描画するcomponentでも同じです。
  scopeを回避するためにglobal sheetへ手を伸ばしたくなったら、誤った場所にあるのはstylesheetでは
  なくmarkupです。
- Global sheetからruleを移すのも、他と同じrefactorです。コメントも一緒に移し、先に他のtemplate
  がそのclassを選択していないことを確認してください。

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

- `pnpm run check:official-sources -- --network`が、scriptに判定できる検査をregistry全体に対して
  行う。記録URLが自身のofficial host上でredirectせず`200`を返すこと、引用sectionが解決すること —
  配信された`<h1>`–`<h4>`のちょうど1件として、あるいはそのelementを配信しないclient renderingの
  ページでは目次のanchor slugがちょうど1回現れることとして。報告するだけで何も変更せず、build/
  start/test/CIのどのchainにも入らない。このrepositoryで唯一outbound requestを行うcommandなので、
  実行するのは人が求めたときだけである。これらを手作業でやり直さないこと。要約器が出した見出し
  一覧はどちらの向きにも根拠にならない。
- 2つの判断はcommandのものではなく、あなたのものとして残る。見出しが消えたことが何を意味するか —
  ページが移転したのか、sectionが改名されたのか、内容が失われたのか — はcommandには決められない
  ので、sectionをmissingと報告して結論は開いたままにする。引用sectionが保守対象のparaphraseを今も
  確立しているかは参照ではなく読解である。見出しが残ったまま本文だけ書き換わった場合が、digestも
  anchorも見逃すdriftそのものである。
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
