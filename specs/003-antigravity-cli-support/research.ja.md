# Research: Antigravity CLI のサポート

[English](research.md)

**対象機能**: [spec.ja.md](spec.ja.md) | **日付**: 2026-09-10

各節は、この機能の設計が立つ決定を1つずつ、その理由と却下した案とともに記録する。以下の vendor
の事実はすべて 2026-09-10 に `https://antigravity.google/docs/` から読んだ。

## 1. Antigravity CLI がカスタマイズを読む場所

**Decision**: リポジトリの location は、ルートの `GEMINI.md` と `AGENTS.md`、
`.agents/skills/<name>.md` と `.agents/skills/<name>/SKILL.md`、`.agents/rules/<name>.md`、
`.agents/hooks.json`、`.agents/agents/<name>.md` と `.agents/agents/<name>/agent.md`、
`.agents/mcp_config.json`、そして旧綴りの `.agent/skills/<name>/SKILL.md` と
`.agent/rules/<name>.md` である。`~/.gemini` 配下の home の location は `GEMINI.md`、
`config/mcp_config.json`、`config/hooks.json`、`config/agents/`、
`antigravity-cli/skills/<name>/SKILL.md`、`config/skills/<name>/SKILL.md`、
`antigravity-cli/skills/<name>.md`、`antigravity-cli/settings.json` である。

**Rationale**: vendor の文書は、2つの共有カスタマイズ root の上に立つ3つの製品ツリー
— Antigravity 2.0、Antigravity CLI、Antigravity for IDEs — である。workspace の `.agents/` と
home の `~/.gemini/config/` は3つのツリーが同じファイルについて名指し、`~/.gemini` 配下の各製品
自身のディレクトリは異なる。アプリは `antigravity`、拡張は `antigravity-ide`、端末は
`antigravity-cli` である。したがって共有部分のページは共有 root に何があるかを確立し、他の製品
ツリーのページはその製品の専用ディレクトリだけを確立する。

その構造に照らすと: migration のページは workspace の context file を作業ディレクトリの
`GEMINI.md` と `AGENTS.md` として、global のそれを `~/.gemini/GEMINI.md` として述べる。その
skills の表は workspace のパスを `.agents/skills/`、global のパスを
`~/.gemini/antigravity-cli/skills/` と述べる。MCP の節は2つの `mcp_config.json` の location を
述べ、workspace の skill・rule・MCP server のサポートは維持されると述べる。CLI 自身のページは
MCP の2つを述べ直し、settings ファイルを `~/.gemini/antigravity-cli/settings.json` として与え、
custom agent を `.agents/agents/<name>.md` または `.agents/agents/<name>/agent.md` として、
global のディレクトリを `~/.gemini/config/agents/` として与える。共有の Agent Skills ページは
`<workspace-root>/.agents/skills/<skill-folder>/` を与え、共有の Rules ページは `.agents/rules`
と、その global の対応物としての `~/.gemini/GEMINI.md` を与え、共有の Hooks ページは
`hooks.json` を「あなたのカスタマイズディレクトリ（例: workspace の `.agents/` または
`~/.gemini/config/`）」に置きつつ、`~/.gemini/antigravity-cli` を端末自身のアプリケーション
データディレクトリとして名指す。それがこのページを端末についてのページにもしている。

**Alternatives considered**: 端末自身のページだけを読む案は、共有ページと突き合わせた時点で
却下した。その読みは `.agents/skills/deploy.md` を admit して `.agents/skills/deploy/SKILL.md`
を却下し、このリポジトリ自身の `.agents/skills/` が満たしているファイルを、2製品には挙げて3つ目
には挙げない状態を残す。`.agents/plugins/` の admit は逆方向の理由で却下した。それはアプリと
拡張のツリーにしか文書化されておらず、どの端末のページも名指さず、端末自身のページは plugin を
`agy` が home へ配置する bundle としてのみ述べる。workspace の settings ファイルの admit は、
どのツリーのページもそれを文書化していないので却下した。

## 2. ここでは skill はディレクトリでもファイルでもあるので、ファイルの形を自身の compiled unit にする

**Decision**: skill kind は、行の単位が1つの Markdown ファイルである2つ目の compiled な形を得る。
それはディレクトリの形を広げたものではなく自身の unit であり、2つは recognizer が判別する閉じた
union をなす。ファイルの形の skill は companion の census を publish しない。companion を抱える
ディレクトリを持たないからである。この vendor は workspace と global の双方の skill location で
両方の形を admit する。これは2つの rule が2つの unit を名指す形であって、1つの rule が広げた
unit を名指す形ではない。2つの custom-agent の形が既にその配置である。

**Rationale**: このリポジトリ自身の規則は、一覧の行の単位は挙げられる対象のものであり、片方の形を
optional な field で広げてもう片方に合わせると、どちらの不変条件も成り立たない型ができる、と
いうものである。ディレクトリの形の skill の record はディレクトリについてのものである。entry
point、その隣の companion ファイル、detail が見出しにする escape 済みのディレクトリパスである。
ファイルの形の skill はそのどれも持たず、パスと parse を持つ。2つの unit と1つの union が、その
方針が求める形である。

**Alternatives considered**: ディレクトリの record に optional な `companionFiles` と optional
なディレクトリパスを持たせる案は、上の方針により却下した。ファイルの形の skill を instruction
file として扱う案は却下した。vendor はそれを slash command になる skill として文書化しており、
行が属する kind は形ではなく vendor の主張だからである。2つの形を selector 2本の1つの rule に
畳む案も却下した。rule の selector は1つの行の単位についてパスを admit するものであり、この2つの
unit は異なる。片方はファイルを名指し、もう片方は entry point が `SKILL.md` であるディレクトリを
名指す。

## 2a. 出荷バイナリはフォルダ形しか検出しないが、フラットな rule は残す

**Decision**: フラットな rule は残す。それが立つ文書の conflict は、計測対象のビルドとともに
vendor contract に記録し、ページか後のビルドが決着させた時点で落とす。ページではなく計測に従う
ものが2つある。名前無しの skill を `SKILL` と名付けること、そして文書化された2つの global skill
root を順位づけずに両方 admit することである。

**Rationale**: 公開されている `agy` 1.2.0 の Linux x64 バイナリの静的解析 — 文字列からではなく、
端末自身の `GetSkills` から共通の探索処理までたどったもの — は、skill の customization 種別が
file 種別ではなく subdirectory 種別であることを示した。したがって `skills/` 直下の通常ファイルは
名前を読む前に除外され、`GetSkillsCreatePath` は
`{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。そうでないと述べる出典は端末
自身の plugins and skills ページだけであり、他の5つと、この端末向けに書かれた Google の codelab は
バイナリと一致する。

フラットな rule を残すのは、2つの誤りが対称でないからである。vendor 自身の指示に従った読み手は
そのファイルを持っている。admit しなければその存在について何も示せず、それはこの製品が防ぐために
ある失敗である。admit する費用は、vendor 自身のページが支える行1つである。解析の範囲は1つの
プラットフォームの 1.2.0 ビルドの標準ディレクトリ設定なので、「そこで自動検出されない」は
「決して読まれない」ではない。

名付けと global root は逆方向に決める。どちらもどのページが正しいかの問題ではないからである。
行の名前は認識する製品が解決する名前であり、それがどの名前かを述べるのはバイナリである。`name`
が無い場合はファイル自身の名前から `.md` を除いて補われ、`SKILL.md` では `SKILL` になる。そして
2つのページの異なる global ディレクトリは、そもそも不一致ではない。端末はアプリケーションデータ
ディレクトリと設定ディレクトリの両方を加えたうえで重複ルートを除去する。

**Alternatives considered**: フラットな rule を落とす案は上記の非対称性により却下した。ページと
隣の製品に合わせて名前無しの skill をフォルダ名で名付ける案は却下した。この vendor が解決しない
名前を publish することになるからである。名前無し skill が集まる `SKILL` 行は、表示上の作為では
なく読み手が見る価値のある実在の同名衝突である。観測を `EvidenceCitation` として記録する案も
却下した。evidence の record は文書のものであり、Codex contract の `plugin@marketplace` の綴りが、
観測された挙動をバージョンとともに contract の散文へ置く先例である。

## 3. 名前が同じなら2つの形は1行を共有する

**Decision**: `.agents/skills/deploy.md` と `.agents/skills/deploy/SKILL.md` は1つの inventory
行である。行の定義はファイルごと・認識する製品ごとに1 entry を持ち、形の間の優先順位は述べない。

**Rationale**: skill の行は既に「1つの名前を各製品がどう解決するか」であり、それが今日
`.agents/skills/x/SKILL.md` と `.claude/skills/x/SKILL.md` を1行に置いている。既存の grouping が
新しい仕組みなしにこれに答える。優先順位は述べられない。この製品は runtime を観測しないからで
あり、ここでは vendor も述べていない。端末のページはファイルの形を、共有のページはディレクトリの
形を文書化し、名前が両方の形で綴られたときに端末がどちらを採るかはどちらも述べない。その沈黙は
rule で解決せず、既知の不確実性として記録する。

**Alternatives considered**: 行に形ごとの badge を足す案は却下した。パスが既に目に見えて異なり、
badge は読み手が何の行動も取らない区別に印を付けることになる。

## 4. member の root は home ディレクトリから導出するので、記述子の表は field を1つ失う

**Decision**: `~/.gemini` member の root は、どの場合も capture された home ディレクトリ配下の
`.gemini` である。それを位置づける環境プロパティはない。したがってツールと環境プロパティを
対応づける表は、環境プロパティが位置づける member だけを key とし、`settingNames:
'root' | 'parent'` の field は持たない。`parent` を必要とする member がないからである。

**Rationale**: 引用したどのページも home を文字どおり `~/.gemini` と書き、それを移動させる設定を
文書化するページはないので、導出は推論に立つことになる。root が home ディレクトリだけから来る
member は既に存在する。共有 agent home であり、それはその表に載っていない。よってこの決定が必要と
する形は、コードが既に持つ形である。`parent` の member がなければ field の値は1つになり、
値が1つの field は union として保つのではなく削除するものである。

**Alternatives considered**: この member に専用のプロパティを与える案は却下した。それを文書化する
ページが引用可能な範囲に無く、vendor が名指さない入力を製品が読むことになるからである。値が1つの
まま field を残す案は simplicity の方針により却下した。

## 5. home の1ファイルが3つの recognition を担う

**Decision**: `antigravity-cli/settings.json` は3つの rule により admit される。主題をその
ファイルとする settings/config の行、その `allow`・`ask`・`deny` の一覧が宣言する permissions の
行、そしてその hook 宣言が担う hook の行である。

**Rationale**: これは `.claude/settings.json` と `.codex/config.toml` が既に持つ配置である。1つの
carrier に複数の recognition があり、それぞれが同じ selector に対する自身の rule で admit される。
よって構造的に足すものはない。permissions のページは3つの一覧とその優先順位を述べ、plugins and
skills のページは hook が plugin の `hooks.json` か settings ファイルに設定されると述べる。その
`hooks.json` の standalone の形をどこで admit するかは § 5a に記録する。

**Alternatives considered**: permission の一覧を settings document の中だけで publish する案は
却下した。permissions の行の主題は policy であり、親仕様が既に自身の detail function でそれを
serve しているからである。

## 5a. hook は3つの carrier に届き、うち2つは standalone の `hooks.json` である

**Decision**: hook 宣言は3つの carrier から admit する。リポジトリの `.agents/hooks.json`、
home の `config/hooks.json`、home の `antigravity-cli/settings.json` の inline である。
standalone の2つは inline のものとは別の rule とし、Codex が既にそうしている名付けに従う。
ファイルは `antigravity.repo.hooks` と `antigravity.global.hooks`、まず settings 文書である
carrier は `antigravity.global.hooks.inline` である。

**Rationale**: 共有の Hooks ページは `hooks.json` を「あなたのカスタマイズディレクトリ（例:
workspace の `.agents/` または `~/.gemini/config/`）」に置き、そのファイル自身の形も与える。
hook 名から event の設定への map であり、各 event は handler の matcher group を持ち、hook ごと
に optional な `enabled` フラグを持つ。それは共有の hook unit が既に行う event-map の読みである。
このページはアプリだけでなく端末についてのページでもある。その transcript の field が、アプリの
`~/.gemini/antigravity` と並べて `~/.gemini/antigravity-cli` を端末のアプリケーションデータ
ディレクトリとして名指している。

名付けと分割の手本は Codex である。目的そのものが hook であるファイルは自身の rule とし、hook も
宣言する設定文書は settings rule と同じ selector の上の2つ目の rule とする。その family に従うと
いうことは、1つの vendor の hook rule を読んだ人がこの vendor のものも読めるということである。

**Alternatives considered**: standalone の selector 2本を1つの rule にまとめる案は却下した。2つは
異なる境界にあり — 片方は Repository、もう片方は Global — rule の `sourceKinds` はそれを曖昧に
する場所ではない。共有ページの `hooks.json` を `documented` として publish する案も却下した。
ページはその location を端末が述べる lookup ではなく例として与えているので、standalone の2つの
rule はどちらも `partially-documented` である。

## 6. MCP は strict JSON の standalone carrier である

**Decision**: `.agents/mcp_config.json` と `config/mcp_config.json` は strict JSON として読み、
その top-level の `mcpServers` object が宣言の map である。リモート server の `serverUrl` は
書かれたとおりに示し、ファイルがまだ綴る legacy の `url` や `httpUrl` も同様である。

**Rationale**: 形は Claude の `.mcp.json` が既に持つもの — top-level の `mcpServers` が名前を
configuration へ対応づける standalone carrier — なので、共有の server-map の読みがこれに答える。
MCP のページは `serverUrl` をリモートの key として述べ、legacy の key を非対応と述べる。vendor が
それを受け付けるかは、この製品が観測しない runtime である。よって読みは何も分類せず、宣言された
field をすべて示す。

**Alternatives considered**: コメント付き JSON として読む案は却下した。そこでのコメントを文書化
するページはなく、vendor 自身の例も strict JSON である。

## 7. custom agent は Markdown の agent の読みを再利用する

**Decision**: admit する両方の形が YAML frontmatter を持つ Markdown なので、既存の Markdown
custom-agent unit がそれらを読む。異なるのは selector だけである。

**Rationale**: subagents のページは frontmatter の形を与え、その key の中に `subagent: true` を
名指す。Markdown の agent の2つの半分は frontmatter block と body であり、それは agent の
presentation が既に運ぶものである。

**Alternatives considered**: なし。vendor は1つの形式を文書化している。

## 7a. workspace の rule は rule kind であり、その activation は評価せず示す

**Decision**: `.agents/rules/<name>.md` と `.agent/rules/<name>.md` を `rule` kind の下で
admit する。rules ディレクトリの直下の Markdown ファイルごとに1行である。ファイルが宣言する
activation — manual、always on、model decision、glob — は書かれたとおりに示す。composition は
1つの strategy `antigravity.rules.activation` として記録し、その operation は `filter` 1つで
ある。

**Rationale**: 共有の Rules ページは、workspace の rule が workspace または git root の
`.agents/rules` フォルダにあると述べ、global の対応物として `~/.gemini/GEMINI.md` を述べ — これ
はこのリリースが2つ目の rule ではなく home の context file として既に admit している — 4つの
activation mode とファイルあたり 12,000 文字の上限を述べる。端末自身の migration ページは、
workspace の skill・rule・MCP server のサポートが維持されると述べることで location を裏づける。
これがこれをアプリだけのものではなく端末の behavior にしている。

`filter` はページが確立する唯一の operation である。glob が rule の適用先ファイルを決め、
description がモデルの適用可否を決める。どちらも集合を絞る。ページは2つの rule の間の順序も
context file に対する優先も述べないので、strategy は `partially-documented` とし、順序は
`append` を捏造せず既知の不確実性とする。

**Alternatives considered**: rules ファイルを `instructions` として publish する案は却下した。
行が属する kind は vendor の主張であり、vendor はこれを rule と呼び、context file が持たない
activation モデルを与えている。リポジトリルートより下の `.agents/rules/` の admit も却下した。
ページは workspace または git root を名指しており、それはこの製品が推論の基準にする選択済み
root である。深さを admit するのは推論に立つ。これは § 1 の context file がルートで止まる理由と
同じである。rules ディレクトリの中の `rules/` サブディレクトリの admit も同じ理由で却下した。
ページは深さを示しておらず、Claude の再帰的な rules ディレクトリは再帰的だと文書化されているが、
こちらはされていない。

## 8. mark は bundle 済みの collection から取り、どの glyph かは計測で決める

**Decision**: vendor の mark は `thesvg:antigravity-google` とする。`currentColor` を継承する
1パスの製品自身のロゴで、`@iconify-json/thesvg` (MIT) から取る。bundle はその collection を
持たないので、icon の方針の3点セット — devDependency、third-party-notices plugin のその
collection の行、collection の upstream の license text — は glyph を最初に import する変更で
揃う。import と同時であり、それより前ではない。何も bundle しない collection の notices の行は
何も述べないからである。

2つ目の collection が習慣にならないよう、規則を1つ添える。まず `simple-icons` を見て、そこに
無い glyph のときだけ別の collection を取る。mark がどの collection から来たかは
`~icons/<collection>/…` の import 行が既に述べているので、二重に記録しない。

**Rationale**: icon の方針は mark を build 時に Iconify collection から compile し、vendor 自身の
色を当てられるよう `currentColor` を継承する単色 glyph を求め、collection の追加は3点セットの
規則を通してのみ行う。`simple-icons` は最新の公開版でもこの glyph を持たないので、製品自身の
ロゴを描くには2つ目の collection しかない。そして legend を走査する読み手が認識するのは製品
自身のロゴである。

持っている collection の中での選択は、legend に既にある3つの mark と並べたときの視覚的な重さで
決まる。出荷済みの mark は24の枠を埋めており、計測した ink の幅は枠の 100%・92%・100% である。
`thesvg` も同様に埋めるが、`bxl` は枠の4分の1ほどを空け、mark が実際に置かれる 15px では一段
軽く見える。`material-symbols:antigravity` はロゴ自身の比率ではなく UI シンボルのグリッドに
描かれており、Google 自身の描き起こしであることはその大きさの読み手を何も助けない。3つの候補を
出荷済みの mark と並べて 15・24・48px で描画し、計測を裏づけた。

**Alternatives considered**: 会社自身の glyph である `simple-icons/google` は、製品の glyph が
見つかった時点で却下した。製品ではなく会社を名指すからである。フルカラーの `logos:antigravity`
は却下した。6色・11パスであり、icon の方針がまさにその理由で除外している — 固定色のロゴは
muted な行の中で明るいまま残る。mark を手で描く案は icon の方針により却下した。

## 8a. mark の色は accent が既に決めていたパレット値

**Decision**: `--aci-brand-antigravity: light-dark(#7a3fa8, #bfa0e8)`。token、import、class 名を
同じ変更で揃える。

**Rationale**: この値を決めた制約は動いていない。vendor のパレットはリンクが描かれる色相から3°の
青が支配的であり、そこから取った mark はリンクだらけの一覧の中でリンクに見える。紫はその答えで
あり、パレットが塗るどの地に対してもライト 6.03・ダーク 7.18 を確保し、隣の黒・オレンジ・
ティールと弁別できる。画面上でこれと競合するものはない。

## 9. gate と件数と評価

**Decision**: rule・behavior・strategy・relationship の件数、Global rule-ID の一覧、presentation
allowlist の digest、outcome manifest、リリース gate の task と phase の件数を、すべて出荷される
ものに対して記録し直す。親仕様の初回利用評価はやり直す。指定ファイルの読み手が2つから3つへ動く
からである。

**Rationale**: これらの凍結は、誰も変えるつもりのなかった件数が気づかれずに変わらないために
存在する。つまり、変えるつもりの変更が同じ commit でそれを記録し直す。評価の条件は親が定めた
ものであり、この変更はそれを満たす。指定ファイルはリポジトリルートの `AGENTS.md` であり、
このツールはそれを読む。

**Alternatives considered**: 実施不要になるよう評価の条件を狭める案は却下した。測るのを避ける
ために criterion が測るものを変えることになる。

## 10. 親仕様の artifact が変わるもの

**Decision**: 親の tool 一覧、supported-file の表、FR-018 の除外、FR-045 の共有 home の読み手、
member の label、vendor contract の索引が、このリリースがサポートする4つのツールを名指すように
変わる。member の数と capture の順は5つのまま変わらず、取り除かれる環境プロパティ以外は触れない。

**Rationale**: それらの記述は製品を名指しており、製品が1つ変わる。member 集合は変わらない。
member はディレクトリであり、そのディレクトリは同じだからである。

## 移行影響

公開 package のユーザーには、このリリースが加えるツール以外の影響は無い。session API の preview
DTO は entry を5つ持ち、その1つがこの member の id と label である。同梱ブラウザが唯一の client
である。`allowlistVersion` と
`traversalPlanVersion` は進むが、それがそれらの存在理由である。changeset entry は `minor`。
