# Data Model: Antigravity CLI のサポート

[English](data-model.md)

**対象機能**: [spec.ja.md](spec.ja.md) | **Research**: [research.ja.md](research.ja.md) | **日付**: 2026-09-10

この機能が親のモデルで変えるもの。ここに挙がらないものは変わらない。

## SupportedTool

閉じた union の4つ目の member は `antigravity` になり、`SUPPORTED_TOOL_ORDER` は `copilot`、
`claude`、`codex`、`antigravity` と読める。`SUPPORTED_TOOL_TEXT` はそれを `Antigravity CLI` と
label する。vendor 自身の文書が使う名前であり、`Claude Code` が会社名を持たないのと同様、会社名の
接頭辞は付けない。union の member は4つのままなので、それを網羅するどの表も4行のままであり、
どの surface も列を得も失いもしない。

## VendorSurface

union の最後の member は `antigravity-cli` になり、`VENDOR_SURFACE_TEXT` では `CLI` と label
され、そのツールが最後に並ぶのと同じく最後に並ぶ。この表は product 内での surface を名付け、
product 名は `SUPPORTED_TOOL_TEXT` が担うので、行は「Antigravity CLI · CLI」と読める。これは
すべての Antigravity CLI behavior が名指す唯一の surface である。vendor の editor と desktop の
surface はこのリリースの外にある (spec.ja.md § Clarifications)。

## GlobalMemberId と member の tuple

`GlobalMemberId = SupportedTool | 'agents'` は導出により広がるので、id は `antigravity` になる。
`GLOBAL_MEMBER_ORDER` は5 member のままで `[copilot, claude, codex, antigravity, agents]` と
読める。`GLOBAL_MEMBER_TEXT` は4つ目を `Antigravity home` と label する。この表は member を
ディレクトリ自身の名前ではなく「誰のディレクトリか」で名付けており、それは
`~/.config/github-copilot` を `Copilot home` と label することで既に行っている。親モデルの
「正確に5つ」という記述はすべて5つのままである。

## GlobalRootInputCapture

capture は3つの環境プロパティを固定順 `COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME` で読み、
`node:os.homedir()` を1回呼ぶ。4つ目の member の root は、どの場合も
`node:path.join(capturedHomedir, '.gemini')` で origin は `default-home` であり、共有 agent home
の root が `join(capturedHomedir, '.agents')` であるのとまったく同じである。

そこから2つの形が従う。ツールを環境プロパティに対応づける表は、環境プロパティが位置づける member
だけを key とするので、ツールごとに1行ではなく3行になる。そしてその `settingNames:
'root' | 'parent'` の field は、`parent` を必要とした member とともに消える。残る行はすべて root
自身を名指し、値が1つの field は保つのではなく削除する (research.ja.md § 4)。

親が固定する閉じた Global Root Admission Outcomes の表は変わらない。4つ目の member が環境由来の
結果を取らなくなるだけであり、それは共有 agent home が既にある状態である。

## Vendor registry record (Antigravity CLI)

1つの vendor module ディレクトリが、既存3つと同じ形で、このツールの rule・behavior・strategy・
relation を持つ。Repository の rule はルートの context の2つ、skill の2つの形、workspace の
rules ディレクトリ、standalone の hooks carrier、custom agent の2つの形、MCP carrier を admit
する。旧綴りの `.agent/` の後方互換をページが述べている2つは、それ用の selector を2本目に持つ。
Global の rule は home の context file、その MCP carrier、standalone の hooks carrier、agents
ディレクトリ、文書化された2つの global root にある両方の形の skill、settings carrier を admit し、
最後のものは3つの rule の下に入る。
excluded group は、インストール済み plugin コピーとそれを追跡する manifest、どの端末のページも
文書化しない workspace の plugin ディレクトリ、および親が既に除外する credential・session と
history の state・cache・log を名指す。

## Compiled unit

skill kind は、ディレクトリの形の compiled unit の隣にファイルの形の compiled unit を得て、2つは
recognizer が判別する閉じた union をなす。ファイルの形の unit はそのファイル自身の parse を
publish し、companion の census は publish しない。ディレクトリの形の unit は変わらない。他の
kind は既に持つ compiled な形を再利用する。Markdown の instruction unit、Markdown の custom-agent
unit、strict JSON の standalone carrier に対する共有の MCP server-map の読み、standalone の
`hooks.json` と settings carrier の inline 宣言の双方に対する共有の hook event-map の読み、
permissions の読み、settings carrier である。workspace の rule には専用の unit は要らない。
`rule` は vendor unit が答えるべき kind に含まれないので、名指すファイルを publish する他の
kind と同じく、その vendor 自身の catalog entry を通して compile される。

## skill の行と detail

skill の行は1つの invocation 名のままで、ファイルごと・認識する製品ごとに1つの定義を持つ。よって
名前を共有するファイルの形とディレクトリの形は行を共有する。ファイルの形の定義は companion
ファイルを持たず、行は companion を持つ skill にだけそれを描く仕組みを既に備えている。

ファイルの形の skill の detail は skill の panel だけを示す。file panel は出さない。その panel の
主題はその skill が持たないディレクトリだからである。tab strip も出さない。tab が1つの strip は
選択肢ではないからである。見出しは skill 自身のパスのままとする。それを読むすべての製品が共有する
唯一の identity であり、各製品が呼び出す名前はそれぞれ異なるからである。

## Customization File と Tool Recognition

形は変わらない。1つのファイルが他の製品の recognition の隣に Antigravity CLI の recognition を
持ちうる。ルートの `GEMINI.md` とルートの `AGENTS.md` がどちらもそうである。

## Parser format の表

この vendor が必要とする形式は既に読まれており、parser は追加しない。共有の JSON reader が MCP
carrier と settings carrier を、共有の frontmatter の読みが context file・skill・custom agent を
取る。その JSON reader はどの vendor のものでもあり、変わらない。動くのはこの vendor 自身の表の
行であり、引用したページが strict JSON を文書化していること、そして vendor の読みと製品の読みの
差異は他と同じくそこに記録することを述べる。

## Version literal

`allowlistVersion` と `traversalPlanVersion` は進む。presentation allowlist と compiled な
traversal-plan の集合がどちらも変わるからである。
