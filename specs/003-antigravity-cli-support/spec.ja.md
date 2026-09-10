# 機能仕様: Antigravity CLI のサポート

[English](spec.md)

**Feature Branch**: `003-antigravity-cli-support`

**作成日**: 2026-09-10

**ステータス**: Draft

**入力**: ユーザーの記述: 「Antigravity CLI を4つ目のツールとしてサポートする。`.agents/` 配下でそれが読むリポジトリのカスタマイズと、ルートの context file、そして `~/.gemini` 配下の個人 home を認識し、inventory が Antigravity CLI を、それが読むファイルの読み手として名指すようにする。」

この仕様は [Inspect Agent Customizations](../001-inspect-agent-customizations/spec.ja.md) を
拡張する。サポート対象ツールに対してその仕様が求めるもの — allowlist の規律、非実行の保証、
consent モデル、閉じた kind 集合、evidence と文書化の義務 — は Antigravity CLI にもそのまま
適用される。ここに書くのは Antigravity CLI が加えるもの、すなわちどのファイルを読むか、個人の
home がどこか、そして親仕様の「3つのツール」「4つの member」という固定の記述のどれが4つと5つに
なるかである。

## Clarifications

### Session 2026-09-10

- Q: Antigravity CLI は `~/.gemini/GEMINI.md`、`~/.gemini/config/`、`~/.gemini/antigravity-cli/` を読む。personal setup の member はどうそこへ届くのか？ → A: 5つ目の member として届く。member は製品ではなくディレクトリであり、その member が提示するのが `~/.gemini` で、その配下で admit するパスがこの vendor のものである。
- Q: vendor は端末、editor 拡張、desktop アプリを文書化しており、editor と desktop は端末が読まない場所も読む。このリリースはどれを認識するのか？ → A: 端末だけである。対象の読み手は自分が動かす端末について判断している。editor と desktop の surface を取り込むと、どの端末のページも文書化しない workspace の plugin ディレクトリのような場所まで admit することになり、その読み手が動かすものを超えて inventory が挙げるものを広げてしまう。共有された `.agents/` のページが文書化し、端末のページが裏づける location はこの拡大には当たらない。端末はそのディレクトリを読んでおり、その中の何を読むかを決めるのはページの内容であって、ページがどの製品ツリーに置かれているかではない。他の surface は後続の機能に残す。その場合は別のツールではなく、同じツールの surface として加える。
- Q: `.agents/skills/` は2つの形を抱える。`deploy.md` と `deploy/SKILL.md` が並んだとき、inventory は1行か2行か？ → A: 1行である。skill の行の単位は「1つの名前を各製品がどう解決するか」であり、それが既に `.agents/skills/x/SKILL.md` と `.claude/skills/x/SKILL.md` を1行に置いている。行は両方の定義を抱え、どの製品がどちらを読むかを述べる。新しい仕組みは要らず、2つの形の間に優先順位を捏造もしない。
- Q: 端末自身のページは workspace の skill をフラットな `.md` ファイルとして示し、vendor の Agent Skills ページは同じディレクトリが `SKILL.md` を持つフォルダを抱えると示す。このリリースはどちらの形を admit するのか？ → A: このツールについては両方である。`.agents/` は vendor の3製品が読む1つのディレクトリであり、それぞれの形はそのディレクトリについて vendor の公式ページが文書化している。一方だけを admit すれば、読み手自身の `.agents/skills/deploy/SKILL.md` が他の2製品には挙がるのに端末には挙がらない状態が残る。ファイル形は端末のページのもの、ディレクトリ形は Agent Skills ページのものであり、どちらのページも優先順位を述べないので、優先順位は捏造しない。端末自身のグローバルディレクトリが admit するものは変わらない。`antigravity-cli/skills/` は端末だけのものであり、そこで文書化されている形はフラットな1つだけである。
- Q: `.agents/` は rules ディレクトリと hooks ファイルも抱える。このツールについて admit するのか？ → A: 両方 admit する。vendor の Rules ページは workspace の rule を `.agents/rules/` に置き、Hooks ページは `hooks.json` を workspace の `.agents/` と home の `config/` に置き、端末自身の移行ページは workspace の skill、rule、MCP server のサポートを維持すると述べている。これは端末のページが rules ディレクトリを端末の読む場所として名指したものである。どちらも既存の kind の下で、書かれたとおりに publish する。activation mode はファイルに対して評価せず、hook の command は決して実行しない。
- Q: skills と rules のページはどちらも、現行の `.agents/` の隣に旧綴りの `.agent/` を記録している。これは admit するのか？ → A: admit する。ただし、そのページがその location について文書化している形に限る。すなわち `.agent/skills/<name>/SKILL.md` と `.agent/rules/<name>.md` であり、それ以外はない。後方互換は location を述べるページが述べているので、旧綴りが届くのはそのページがそこで示す形までである。フラットな skill 形は端末のページのものであり、そのページは `.agents/` しか名指さないので、`.agent/skills/<name>.md` は対象外とし、既知の不確実性として記録する。
- Q: 公開されている `agy` 1.2.0 バイナリの静的解析は、端末がフォルダ形しか検出しないこと、および `name` 無しの skill がフォルダ名ではなく `SKILL` に解決されることを示している。このリリースはバイナリとページのどちらに従うのか？ → A: 両方に、それぞれがより良い証拠である場所で従う。フラット形は admit したままにする。端末自身のページに従った読み手はそのファイルを持っており、admit しなければその存在について何も示せない。admit する費用は、vendor 自身の文書が支える行1つである。観測は vendor contract に記録し、ページか後のビルドが決着させた時点でその rule を落とす。名付けはバイナリに従わない。行の名前は認識する製品が解決する名前であり、同じバイナリの `GetSkillsCreatePath` は `{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。つまり端末自身がフォルダを名前の持ち手として扱っている。よって名前無しのフォルダはそのフォルダ名で名付ける。これは同じファイルを読む他の2製品が与える答えでもある。名前無しのフラットファイルは、名前を取るフォルダが無いので、そのファイル自身の名前で名付ける。global の allowlist はバイナリに従い、文書化された2つの global root を順位づけずに両方 admit する。端末が両方を歩くからである。（2026-09-11 修正: この答えの名付けの側を、FR-004 と出荷される unit が述べる fallback に合わせた。バイナリ内の2つの読み取りを互いに突き合わせた結果である。）
- Q: vendor は `.agents/plugins/` に workspace の plugin ディレクトリを文書化している。admit するのか？ → A: しない。どの端末のページもそれを名指していない。端末自身のページは plugin を `agy` が home へインストールする bundle としてのみ文書化しており、それがインストール済みコピーを除外している理由である。その除外の理由 —インストール済みコピーは原本の複製である— はリポジトリで著述された plugin には当てはまらないので、vendor contract は workspace ディレクトリ自身の理由を別に述べる。すなわち、端末がそれを読み込むという端末側の evidence がこのリリースにはない。
- Q: Antigravity CLI の recognition はリポジトリルート配下の `GEMINI.md` と `AGENTS.md` に届くのか？ → A: 届かない。リポジトリルートの2つだけである。移行ガイドは workspace の context file を作業ディレクトリのものとして述べ、深さには何も述べないので、それより深くへ届かせるのは推論に立つ。これは前の vendor の home instruction rule を広げなかった理由と同じである。深さは vendor contract の既知の不確実性として記録し、vendor が階層を文書化した時点で rule を広げる。
- Q: 5つ目の member のディレクトリは `~/.gemini` のままだが、それが名を取った製品はサポート対象でなくなる。ラベルは何と述べるのか？ → A: `Antigravity home` である。member の表は、ディレクトリ自身の名前ではなく「誰のディレクトリか」で member を名付けており、ラベルがパスと異なる例はその表に既にある。`~/.config/github-copilot` は `Copilot home` と呼ばれている。短い語の取り方も同じ family に従う。`OpenAI Codex` が `Codex` になるように `Antigravity CLI` は `Antigravity` になる。member の root パスはラベルの隣に表示されるので、ラベルは誰のディレクトリかを、パスはどこかを述べる。
- Q: 1つのファイルである skill — 端末自身のページがリポジトリと home の双方について文書化している形 — にはディレクトリがなく、detail の file panel は「skill のディレクトリと開いているファイル」を持つ panel である。そのページは何を示すのか？ → A: skill の panel だけを示し、file panel も tab strip も出さない。panel の主題はその skill が持たないディレクトリであり、tab が1つの tab strip は選択肢ではない。見出しは skill 自身のパスのままとする。そこに書かれた理由 — それを読むすべての製品が共有する唯一の identity であり、各製品が呼び出す名前はそれぞれ異なる — はディレクトリと同じくファイルにも当てはまるからである。行の companion の数は新しい判断を要さない。companion を持つ skill にだけ描かれる仕組みが既にある。
- Q: 親仕様は、指定ファイルの ground truth が動いたときにだけ初回利用評価をやり直す。そのファイルはリポジトリルートの `AGENTS.md` であり、このツールはそれを読むので、読み手が2つから3つに変わる。実施は必要か？ → A: 必要である。親が定めた条件を満たすので、study input を更新し、リリース前に20セッションのエージェント駆動実行を行い、結果を記録する。指定ファイルの読み手が増えたことで読み手が述べるべき答えは難しくなっており、一致しなくなったページに対して測る criterion は何も測っていないことになる。
- Q: このリリースはこのツールに prompt/command kind の行を publish するのか？ → A: しない。Antigravity CLI の移行ガイドは legacy command を skill へ変換し、リポジトリの command ディレクトリを文書化するページもない。よってこのツールはこの kind の行を持たない。kind 自体は、それを publish する3つのツールのために閉じた集合に残る。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Antigravity CLI をリポジトリのファイルの読み手として見る (Priority: P1)

開発者が `.agents/` ディレクトリを持つリポジトリを開く。そこには両方の形の skill、rules
ディレクトリ、hooks ファイル、MCP 設定、custom agent があり、ルートには `GEMINI.md` と
`AGENTS.md` がある。現状の
inventory はそれらを既に読む製品の下に挙げるだけで、開発者が実際に動かしている端末については
何も述べない。この機能の後、同じ行が Antigravity CLI を読み手の1つとして名指し、Antigravity CLI
だけが読むファイルもそもそも現れるようになる。

**優先度の理由**: リポジトリ source は読み手がこの製品を開く目的そのものであり、consent を
必要としない。自分の端末について何も分からない読み手には、personal setup へ進む理由がない。

**独立テスト**: admit される全リポジトリ location に1ファイルずつ置いた fixture を調べ、各
ファイルが Antigravity CLI を読み手に含めて挙がること、ルートの `GEMINI.md` が Copilot と
Antigravity CLI の両方の recognition を持つ1行として挙がること、除外される隣接パスが挙がりも
読まれもしないことを確認する。

**受け入れシナリオ**:

1. **前提** `.agents/skills/format-tests.md` があるリポジトリ、**操作** skill inventory を
   開く、**結果** その skill の行が Antigravity CLI を読み手として名指し、detail がファイルの
   宣言と指示を示す。
2. **前提** ローカルとリモートの server を宣言する `.agents/mcp_config.json` があるリポジトリ、
   **操作** MCP inventory を開く、**結果** 宣言された server 名ごとに1行が挙がり、それぞれが
   Antigravity CLI を名指し、どの server も起動も接続もされない。
3. **前提** ルートに `GEMINI.md` を持つリポジトリ、**操作** そのファイルの行を開く、**結果**
   行はそれを読む両方の製品を述べ、ファイルは1度だけ挙がる。
4. **前提** `.agents/agents/reviewer.md` と `.agents/agents/release/agent.md` があるリポジトリ、
   **操作** agent inventory を開く、**結果** 両方が Antigravity CLI の custom agent として挙がる。
5. **前提** glob による activation を宣言する `.agents/rules/style.md` があるリポジトリ、
   **操作** rules inventory を開く、**結果** そのファイルが Antigravity CLI の rule として挙がり、
   activation が書かれたとおりに示され、どのパスにも pattern は照合されない。
6. **前提** `.agents/hooks.json` があるリポジトリ、**操作** hooks inventory を開く、**結果**
   その宣言が書かれたとおりに挙がり、どの command も実行されない。

### User Story 2 - Consent の後に Antigravity CLI home を調べる (Priority: P2)

同じ開発者が、自分のマシンが何を持ち込んでいるかを知りたい。personal setup は既に5つの
ディレクトリを提示しており、5つ目は Antigravity CLI が読む `~/.gemini` である。1度の明示的な
consent の後、そこで Antigravity CLI が読むファイルが挙がり、その隣にある state は挙がらない。

**優先度の理由**: personal setup は読み手が2番目に問う疑問に答えるものであり、consent を要する
ので、リポジトリの story の後に来る。

**独立テスト**: admit される各 location に1ファイル、除外される隣接パスにも1ファイルずつ置いた
home を作り、1度 consent し、admit されたファイルが挙がること、除外パスが enumerate も open も
read もされないことを確認する。

**受け入れシナリオ**:

1. **前提** `GEMINI.md`、`config/mcp_config.json`、`config/agents/reviewer.md`、
   `antigravity-cli/skills/refactor/SKILL.md`、`config/skills/triage/SKILL.md`、
   `antigravity-cli/skills/legacy.md`、`antigravity-cli/settings.json` を持つ consent 済みの
   home、**操作** scan が完了する、**結果** それぞれが personal setup の下に Antigravity CLI を
   読み手として挙がり、2つの global skill root がどちらも含まれる。
2. **前提** その home にインストール済み plugin のコピーとそれを追跡する manifest もある、
   **操作** scan が完了する、**結果** どちらも挙がらず、どちらも読まれない。
3. **前提** home の settings ファイルが permission の一覧と hook を宣言する、**操作**
   permissions と hooks の inventory を開く、**結果** 宣言が書かれたとおりに示され、評価も解決も
   実行もされない。

### User Story 3 - 2つの skill の形を見分ける (Priority: P3)

`.agents/skills/` は2つの形を同時に抱える。OpenAI Codex、GitHub Copilot、Antigravity CLI が
そろって読む `SKILL.md` を持つディレクトリと、Antigravity CLI だけが読む Markdown ファイルで
ある。そのディレクトリを見る読み手は、自分の skill のどれをどの製品が実際に拾うのかを見る必要が
あり、その答えは名前ではなく形で分かれる。

**優先度の理由**: 最初の2つの story が既に届ける範囲の中の理解の問題であり、価値はあるが、この
機能を出荷する理由そのものではない。

**独立テスト**: `.agents/skills/` に両方の形を、両方で綴られた同名も含めて置いたリポジトリを
調べ、各行がそれを解決する製品を述べることを確認する。

**受け入れシナリオ**:

1. **前提** `.agents/skills/deploy.md` と `.agents/skills/release/SKILL.md`、**操作** skill
   inventory を開く、**結果** 両方が挙がり、ファイルは Antigravity CLI だけを、ディレクトリは
   その形を読む3製品すべてを名指す。
2. **前提** `.agents/skills/deploy.md` と `.agents/skills/deploy/SKILL.md` が並ぶ、**操作**
   skill inventory を開く、**結果** 製品は各名前が各製品にとって何に解決するかを述べ、両者の間に
   優先順位を捏造しない。

### Edge Cases

- frontmatter を parse できない skill ファイルは、そのパスが名指す行を保ち、file-confined な
  diagnostic を1つ持つ。完全な source は読める状態で残る。
- 形式が parse できない MCP 設定ファイルは、その読みを丸ごと失敗させ、carrier は挙がったまま、
  diagnostic を1つ持つ。
- legacy の `url` や `httpUrl` キーで宣言されたリモート MCP server は書かれたとおりに示される。
  製品は vendor がそれを受け付けるかについて何も述べない。
- `SKILL.md` を持たないディレクトリを抱える `.agents/skills/` は skill の行を生まず、その
  ディレクトリ内の他の名前の Markdown ファイルも行を生まない。
- Markdown でないファイルを抱える `.agents/rules/` は rule の行を生まない。frontmatter を
  parse できない rules ファイルは行を保ち、file-confined な diagnostic を1つ持つ。
- `.agent/skills/deploy/SKILL.md` や `.agent/rules/style.md` を持つリポジトリは、vendor が
  なお支える旧綴りとして両方を挙げる。`.agent/skills/deploy.md` を持つリポジトリは何も挙げない。
  その綴りでフラットな形を文書化するページがないからである。
- `antigravity-cli` ディレクトリを一切持たない home も admit され、admit される他のパスのうち
  持っているものを挙げる。
- `.gemini/commands/`、`.gemini/agents/`、`.gemini/skills/` を持つリポジトリは、それらを1つも
  挙げない。このリリースではどのサポート対象ツールもそれらを読まない。
- `.agents/plugins/` や `_agents/plugins/` を持つリポジトリは、その配下を1つも挙げない。端末が
  workspace の plugin ディレクトリを読み込むと述べる端末のページがない。
- `agent.md` の隣にファイルを持つ custom agent のディレクトリは、`agent.md` だけを挙げる。custom
  agent の隣の companion を文書化するページは引用先にないので、そのディレクトリの他のものは
  admit されない。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Antigravity CLI はサポート対象ツールでなければならず (MUST)、GitHub Copilot、
  Claude Code、OpenAI Codex に並ぶ4つ目として、どの surface でも `Antigravity CLI` と名指され
  なければならない (MUST)。サポート対象ツールを名指すすべての surface — tool filter、legend、
  empty-state の scope、consent surface、起動オプションの説明、ユーザー文書 — はこの4つを名指し、
  他の製品を名指してはならない (MUST NOT)。親仕様の3ツール・4 member 向けの記述は、両言語で
  4ツール・5 member と読めるようにしなければならない (MUST)。サポート対象ツールは vendor の端末
  client だけである。その editor 拡張と desktop アプリは別の surface であり、このリリースは認識
  しない。それらだけが読む location は allowlist に入れない (§ Clarifications)。
- **FR-002**: Antigravity CLI の Repository inspection path allowlist は次を正確に admit し
  なければならない (MUST): ルートの context file `GEMINI.md` と `AGENTS.md`、
  `.agents/skills/<name>.md` または `.agents/skills/<name>/SKILL.md` の skill、
  `.agents/rules/<name>.md` の rule、hooks carrier の `.agents/hooks.json`、
  `.agents/agents/<name>.md` または `.agents/agents/<name>/agent.md` の custom agent、MCP
  carrier の `.agents/mcp_config.json`。旧綴りの `.agent/` は、後方互換をページが述べている2つの
  location について、そのページがそこで文書化する形で admit しなければならない (MUST)。すなわち
  `.agent/skills/<name>/SKILL.md` と `.agent/rules/<name>.md` であり、それ以外はない。このツール
  について他のリポジトリ location を admit してはならない (MUST NOT)。
- **FR-003**: Repository inspection は、このツールについて、`.gemini/` 配下のパス、workspace の
  settings ファイル、`.agents/plugins/` と `_agents/plugins/` を含む workspace の plugin
  ディレクトリを admit してはならない (MUST NOT)。引用した端末のページで端末がそれらを読むと
  文書化するものはなく、ページが確立しない location に対する rule はこの製品自身の創作になる。
  vendor contract は workspace の plugin ディレクトリについて、FR-010 が述べるインストール済み
  コピーの理由とは別にその理由を述べなければならない (MUST)。リポジトリで著述された plugin は
  何かのコピーではないからである (§ Clarifications)。
- **FR-004**: Antigravity CLI の skill は admit される両方の形で publish されなければならず
  (MUST)、frontmatter が宣言する `name`、宣言がなければその形自身の fallback で名付けられなければ
  ならない (MUST)。fallback はフォルダ形なら skill フォルダ、フラット形なら拡張子を除いたファイル
  自身の名前である。フラット形には名前を取るフォルダが無いからである。フォルダの fallback は同じ
  ファイルを解決する他のすべての製品が使うものなので、1つの `SKILL.md` は2つの名前で2行に分かれる
  ことなく、3つの読み手を持つ1行であり続ける。ファイル形の skill は companion ディレクトリを
  持たないので、行はそれを述べず、detail は skill だけを示し、持たないディレクトリを主題とする
  file panel を出さない (§ Clarifications)。
  1つの `.agents/skills/` にある skill ファイルと同名の skill ディレクトリは1つの inventory 行で
  なければならず (MUST)、両方の定義を抱え、どの製品がその名前をどちらのファイルに解決するかを
  述べる。今日2つのディレクトリで綴られた名前が1行になるのとまったく同じである。2つの形の間の
  優先順位を述べてはならない (MUST NOT) (§ Clarifications)。
- **FR-005**: MCP carrier は宣言された server 名ごとに1行を publish しなければならず (MUST)、
  宣言されたフィールドはリモート server の `serverUrl` も、ファイルがまだ綴る legacy の `url` や
  `httpUrl` も含め、書かれたとおりに示さなければならない (MUST)。server を起動・接続・probe せず、
  宣言中の environment 参照を解決しない。
- **FR-006**: custom agent は admit される両方の形で custom-agent kind の下に publish されな
  ければならず (MUST)、frontmatter が宣言する `name` で名付けられなければならない (MUST)。
  宣言しないファイルは、ファイル名やディレクトリ名で名付けるのではなく、inventory の名前無しの行
  に届かなければならない (MUST)。この vendor は他の2つの宣言名製品と同じく `name` を agent の
  identity として文書化しており、パスによる fallback は製品が持たない agent 名を報告することに
  なるからである。
- **FR-007**: リポジトリルートの `GEMINI.md` と `AGENTS.md` は、既に持つ recognition に加えて
  Antigravity CLI の recognition を持たなければならない (MUST)。1つのファイルは複数の読み手を
  持つ1行のままである。ルートより下の `GEMINI.md` と `AGENTS.md` はそれを持ってはならない
  (MUST NOT)。引用したどのページも深さを述べないので、recognition は文書が止まるところで止まる。
  vendor contract はその深さを既知の不確実性として記録しなければならない (MUST)
  (§ Clarifications)。
- **FR-008**: 5つ目の Global member は `~/.gemini` ディレクトリのままでなければならず (MUST)、
  他の3つの tool home の後、共有 agent home の前という現在の位置で、今日とまったく同じように
  admit・consent されなければならない (MUST)。それを移動させる環境プロパティはない。Antigravity
  CLI についてそれを文書化するページが引用先にないので、member の root は capture された home
  ディレクトリ配下の `.gemini` であり、それ以外ではない。member は `Antigravity home` と label
  されなければならず (MUST)、誰のディレクトリかを述べ、root パスをその隣に表示する
  (§ Clarifications)。
- **FR-009**: その member の Global inspection path allowlist は次を正確に admit しなければ
  ならない (MUST): `GEMINI.md`、`config/mcp_config.json`、`config/hooks.json`、
  `config/agents/<name>.md` または `config/agents/<name>/agent.md` の custom agent、
  `antigravity-cli/skills/<name>/SKILL.md`・`config/skills/<name>/SKILL.md`
  ・`antigravity-cli/skills/<name>.md` のいずれかの skill、`antigravity-cli/settings.json`。
  文書化された2つの global skill root は順位づけずに両方 admit する。端末が両方を歩くからである。
  custom agent の2つの形も user tier で両方 admit する。理由は workspace で両方を admit するのと
  同じで、subagents のページはそのディレクトリについて、workspace のものと同じ2つの綴りを与えて
  いるからである。ファイル形だけを admit すれば、workspace の対応物は載るのにフォルダ形の global
  agent はどの一覧にも載らないことになる。
  editor 拡張自身の global skill ディレクトリは admit してはならない (MUST NOT)。それはこの
  リリースが認識しない surface のものである。
- **FR-010**: Global inspection はその member 配下の他の何も admit してはならず (MUST NOT)、
  除外を理由とともに vendor contract に記録しなければならない (MUST): `antigravity-cli/plugins/`
  配下のインストール済み plugin コピーとそれを追跡する manifest（インストール済みコピーは
  authored ではなく source から再現されたものだから）、および credential、session と history の
  state、cache、log（親仕様の FR-018 がどの vendor についても既に除外している）。
- **FR-011**: home の settings ファイルは、主題をそのファイルとする settings/config の行として
  publish されなければならず (MUST)、その permission の一覧と hook 宣言は、既存の kind の
  permissions と hook の行として、書かれたとおりに publish されなければならない (MUST)。
  permission rule をパスやコマンドに対して評価せず、hook を実行しない。
- **FR-012**: このリリースは Antigravity CLI について prompt/command の行と output style の行を
  publish してはならず (MUST NOT)、plugin の行も publish してはならない (MUST NOT)。
  引用したページが文書化するもののうち、このツールが読む場所にそれらの kind の authored ファイル
  を置くものはない (§ Clarifications)。
- **FR-013**: GitHub Copilot によるルート `GEMINI.md` の recognition は現状のままでなければ
  ならない (MUST)。それは Copilot 自身の文書に基づいており、この機能はそれに触れない。
- **FR-014**: このリリースがサポートしない製品の vendor module、vendor contract、registry
  record、fixture、文書の節、label、mark、evidence record は tree に残ってはならず (MUST NOT)、
  どの gate もそれを数えてはならない (MUST NOT)。tree が持たない artifact を指す参照もその
  record の1つなので、そうした引用を残す artifact があってはならない (MUST NOT)。
- **FR-015**: 記録される Antigravity CLI の behavior は、それを確立する公式文書を引用しなければ
  ならず (MUST)、引用したページが述べない主張は documented ではなく partially documented として
  記録しなければならない (MUST)。端末自身のツリーではなく vendor の共有文書のページが確立する
  behavior は、そのページを引用しなければならず (MUST)、端末側の権威だけで documented と記録して
  はならない (MUST NOT)。引用したページが1つの location について両立しない主張をしている場合は、
  順位づけずに conflict として記録しなければならない (MUST)。vendor の出荷実装の観測は evidence
  の引用にしてはならず (MUST NOT) — evidence の record は文書のものである — vendor contract の
  散文に、観測対象の正確なビルドと、引用したどのページもそれを確立していないという記述とともに
  記録しなければならない (MUST)。
- **FR-016**: workspace の rule は rule kind の下に publish されなければならず (MUST)、rules
  ディレクトリ配下の Markdown ファイルごとに1行とし、frontmatter が宣言する activation — manual、
  always on、model decision、glob — を書かれたとおりに示さなければならない (MUST)。activation は
  評価しない。glob をパスに照合せず、description の関連性も判定しない。
- **FR-017**: 2つの独立した hook carrier — リポジトリの `.agents/hooks.json` と home の
  `config/hooks.json` — は、home の settings ファイルの inline 宣言と同じ読みを通して hook kind
  の下に publish されなければならず (MUST)、それぞれ書かれたとおりに示さなければならない (MUST)。
  hook は実行せず、matcher を tool call に対して評価しない。

### Key Entities

- **Antigravity CLI サポート対象ツール**: 閉じたサポート対象ツール集合の4つ目の member。自身の
  label、mark、vendor module、vendor contract を持つ。
- **Antigravity CLI surface**: すべての Antigravity CLI behavior が名指す唯一の surface。vendor
  はこれらのファイルを読む端末 client を1つ文書化している。その editor と desktop の surface は
  このリリースの外にある。
- **`~/.gemini` Global member**: 5つ目の consent member。この機能が admit するパスを定める。
- **Antigravity CLI skill**: 1つの skill 名。リポジトリでは Markdown ファイルまたは `SKILL.md`
  を持つディレクトリとして、home では Markdown ファイルとして綴られる。ファイル形の行の単位は
  ファイル自身であり、companion ディレクトリを持たないのはこの形である。
- **Antigravity CLI workspace rule**: workspace の rules ディレクトリ配下の1つの Markdown
  ファイル。frontmatter が宣言する activation mode を持つ。

## Quality Requirements _(mandatory)_

### Maintainability and Code Clarity

- **QR-001**: Antigravity CLI の rule、behavior、strategy、relation は、既存の3つと同じ形の
  自身の vendor module と vendor contract に置かれなければならない (MUST)。維持者が他の vendor に
  触れずに Antigravity CLI を更新できるようにするためである。4つ目の vendor が属するすべての
  family — tool label の表、vendor mark、compiled-rule の subclass、同名 statement の導出、
  which-files の散文、fixture launcher の行 — は同じ4つのツールを名指さなければならない (MUST)。
  このリリースがサポートしない製品を名指す surface は未完了の変更である。
- **QR-002**: skill kind は2つの行の形を、片方の record を広げてどちらの不変条件も成り立たない
  型にすることなく受け入れなければならない (MUST)。ファイルの形の skill は自身が持つ事実を述べる。
  持っていない companion の census を持っているかのように運ばない。1つの vendor が1つの location
  で両方の形を読むことは、両者を1つの record の形にする理由にならない。2つの rule は別々の record
  のままとする。2つの custom-agent の形が既にそうであるのと同じである。

### Testing and Verification

- **QR-003**: 自動検証は Antigravity CLI について次を覆わなければならない (MUST): admit される
  全 Repository・Global location の positive fixture と、selector family ごとの rejected な
  near-miss。2つの recognition を持つ1ファイルとしてのルート `GEMINI.md`。1つの
  `.agents/skills/` ディレクトリ内の両方の skill の形（両方で綴られた同名を含む）と、旧綴りの
  `.agent/` 配下の同じ2つの形（そこではフラットな形が reject されること）。文書化された
  activation mode ごとの rules ファイル。2つの独立した hook carrier。両方の
  custom-agent の形。リモートの `serverUrl` を持つ MCP 宣言と legacy キーを持つもの。5 member の
  preview。FR-003 と FR-010 が名指す除外。そして hook コマンド、permission rule、MCP 宣言を持つ
  fixture 全体で実行・MCP 接続・外向き要求・被検査 source の変更がゼロであること。親仕様の測定
  対象 criteria の release-evidence manifest は、このツールが加える `(tool, customization file
  type, admitted source form)` ごとに1 case を持たなければならず (MUST)、それは manifest version
  を増やし新しい測定集合を開始する。End-to-end のブラウザ検証は legend、tool filter、Antigravity
  CLI の detail に届かなければならない (MUST)。親仕様の初回利用評価はこの変更に対してやり直さ
  なければならない (MUST)。このツールがリポジトリルートの `AGENTS.md` を読むことで指定ファイルの
  読み手が2つから3つに変わるためである。study input はこのリリースがサポートするツールを名指し、
  FR-008 が取り除く環境プロパティを落とさなければならず (MUST)、20セッションのエージェント駆動
  実行を行わなければならず (MUST)、`validation.md` は両言語でその実行を記録しなければならない
  (MUST) (§ Clarifications)。
- **QR-004**: どの gate も、このリリースがサポートしない製品の凍結された件数、fixture、digest を
  保持してはならない (MUST NOT)。それぞれ出荷されるものに対して記録し直す。

### Security and Privacy

- **QR-005**: Antigravity CLI home は同じ session 全体の consent の後にのみ、かつ FR-009 が
  名指すパスでのみ調べられる。credential、session と history の state、root 配下のインストール
  済み plugin コピーは決して読まれない。示されるものはすべて read-only、inert、session 限り、
  loopback 内であり、親仕様の QR-003 がどの source にも求めるとおりである。

### Documentation and Participation

- **QR-006**: readme は両言語でこのリリースがサポートする4つのツールを名指さなければならず
  (MUST)、`docs/which-files-are-listed.md` とその日本語版は、リポジトリ配下と personal setup
  配下に Antigravity CLI の節を持たなければならない (MUST)。出荷される rule が admit する
  literal segment を、旧綴りの `.agent` も含めてすべて名指す散文とし、そのページを正直に保つ
  containment gate が通るようにする。vendor contract は既存3つと同じ節を持って両言語で存在しなければならず (MUST)、
  official-sources contract は引用する Antigravity CLI の source ID を列挙しなければならない
  (MUST)。Antigravity CLI の mark は製品名を accessible name として持たなければならず (MUST)、
  legend はそれを名指さなければならない (MUST)。level `minor` の changeset entry を伴わなければ
  ならない (MUST)。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: FR-002 が admit する全 location に1ファイルずつ置いた fixture リポジトリに対し、
  それらのファイルの100%が Antigravity CLI を読み手として挙がり、ルートの `GEMINI.md` は正確に
  2つの recognition を持つ1行として挙がる。
- **SC-002**: FR-003 と FR-010 が除外する全 location に1ファイルずつ、および selector family
  ごとに near-miss を1つ置いた fixture に対し、それらのファイルは1つも挙がらず、read 要求も1つも
  発行されない。
- **SC-003**: home が存在する・存在しない・存在するが空・読めない状態で開始した session 全体で、
  consent preview の100%が5つの member を挙げ、Antigravity CLI の entry の root と分類が、その
  入力に対して親仕様が固定する閉じた結果と一致する。
- **SC-004**: hook 宣言、permission rule、MCP 宣言を持つ fixture 全体で、検査はコマンド実行、
  子プロセス、MCP 接続、外向き要求、被検査 source の変更をゼロ件しか起こさない。
- **SC-005**: `docs/which-files-are-listed.md` の両言語が、出荷される Antigravity CLI の rule が
  admit する literal path segment をすべて名指し、readme、legend、filter、consent surface が
  両言語で同じ4つのツールを名指す。
- **SC-006**: 出荷される tree、その文書、その gate を検索して、このリリースがサポートしない製品の
  サポート対象ツール識別子、label、mark、contract、凍結件数が0件である。
- **SC-007**: official-source の確認が、引用したすべての Antigravity CLI の URL が公式ホスト上で
  直接応答し、引用したすべての節が解決することを、Antigravity CLI の record の100%について報告する。

## Assumptions

- 上記の Antigravity CLI の surface は 2026-09-10 に `https://antigravity.google/docs/` の公式
  文書から読んだ — CLI の overview、features、migration、MCP、plugins and skills、subagents、
  settings、permissions の各ページと、共有の Agent Skills、Rules、Hooks、Plugins の各ページ。Planning は各パスをそれらのページに対して再検証し、正確な節
  見出しを記録し、pattern を狭めることはあるが、仕様変更なしに surface を追加しない。
- 文書化された home は引用したどのページでも文字どおり `~/.gemini` と書かれている。それを移動
  させる環境プロパティを文書化するページはないので、導出もしない。そこでの導出は推論に立つことに
  なり、それは vendor が文書化していない home rule を広げなかった親機能の理由と同じである。
- vendor の文書は、2つの共有カスタマイズ root の上に立つ3つの製品ツリーである。workspace の
  `.agents/` と home の `~/.gemini/config/` は端末・desktop アプリ・editor 拡張が等しく読み、
  `~/.gemini/antigravity-cli/` は端末自身のものである。したがって共有部分のページは共有 root で
  端末が何を読むかを確立し、他の製品ツリーのページはその製品自身のディレクトリだけを確立する。
  3製品のグローバル skill ディレクトリが異なり、このリリースが端末のものだけを admit するのは
  そのためである。
- vendor 自身のページは workspace の skill の形について食い違っており、その食い違いはここでは
  解消しない。どちらの形もそのディレクトリについて文書化されているので両方を admit し、名前が
  両方の形で綴られたときに端末がどちらを採るかを述べるページはない。その問いは答えずに既知の
  不確実性として記録する。
- vendor の settings ファイルは、planning が別途計測しない限り通常の JSON として読む。vendor
  自身の読みと製品の読みの差異は、parser entry が他の差異を記録している場所に記録する。
- Antigravity CLI のすべての surface は既存の11 kind に収まるので、kind は追加しない。
- 固定 tuple の member 順は現在の形を保つ。4つの tool home の後に共有 agent home が続く。
