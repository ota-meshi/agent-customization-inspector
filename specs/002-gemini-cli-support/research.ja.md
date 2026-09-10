# Research: Gemini CLI のサポート

[English](research.md)

**Feature**: [spec.ja.md](spec.ja.md) | **Plan**: [plan.ja.md](plan.ja.md) | **Date**: 2026-09-09

各 section は計画が依拠する1つの決定、それが成り立つ理由、却下したものを記録する。vendor の
事実は 2026-09-09 に公式ページから読み、vendor contract が記録する section heading で引用する
([contracts/vendors/gemini-cli.ja.md](contracts/vendors/gemini-cli.ja.md))。コードの事実は
commit `f176e7f` のリポジトリから読んだ。

## 1. Gemini CLI がカスタマイズを読む場所

**Decision**: Repository allowlist は選択された root の下に次を admit する: 任意の深さの
context file（既定は `GEMINI.md`、または `context.fileName` が宣言する名前群）。3回認識される
1つの carrier としての `.gemini/settings.json`（settings、MCP、hooks）。
`.gemini/commands/**/*.toml`。`.gemini/skills/<name>/SKILL.md` と
`.agents/skills/<name>/SKILL.md`。`.gemini/agents/*.md`。Gemini CLI home は `GEMINI.md`、
`settings.json`（同じ3つの recognition）、`commands/**/*.toml`、`skills/<name>/SKILL.md`、
`agents/*.md`、`policies/*.toml` を admit する。shared agent home の `skills/<name>/SKILL.md`
は Gemini CLI の recognition を得る。

**Rationale**: すべての場所は、contract が heading を引用するページで vendor が名指しする
ものである: context の階層（`Provide context with GEMINI.md files` § `Understand the context
hierarchy`）、settings ファイル（`Gemini CLI configuration` § `Settings files`）、MCP（`MCP
servers with Gemini CLI` § `Configure the MCP server in settings.json`）、hooks（`Gemini CLI
hooks` § `Configuration`）、command（`Custom commands` § `File locations and precedence`）、
skill（`Agent Skills` § `Discovery tiers`）、agent（`Subagents` § `Agent definition files`）、
policy（`Policy engine` § `Policy locations`）。`.gemini/` ディレクトリはプロジェクトルート
だけに文書化されているので、すべての `.gemini/` selector はそこに anchor する。context file
だけがツールのアクセスする任意のディレクトリから読まれると文書化されており、それが唯一の
descendant reach である。

**Alternatives considered**: リポジトリの `.gemini/policies/*.toml` を admit する — vendor
自身の reference が workspace tier は現在 non-functional だと述べるので、挙げれば読まない
ファイルの読者として Gemini CLI を名指しすることになる。Claude の入れ子 `.claude/` と同様に
入れ子の `.gemini/` を admit する — Claude はその reach を文書化し、Gemini CLI はしていない。
`.geminiignore`、`.gemini/.env`、hook script を admit する — ignore file はカスタマイズでは
なく、environment file は credential であり、script は宣言が名指しする対象である。

## 2. context filename は既定を自ら持つ1本の派生ルール

**Decision**: 静的な `GEMINI.md` ルールは無い。`gemini.derived.context-filename` は
`bounded-derived-candidate` で、seed はリポジトリの `.gemini/settings.json`、plan は常に1つ:
`context.fileName` が名前を宣言するときはその名前群、そうでなければ `GEMINI.md` を、それぞれ
任意の深さで admit する。reader — `readCodexConfiguredFallbackPlans` の Gemini 版 — は scan の
configuration-read stage で走り、同じ読み取りから carrier 自身の候補性を seed する。

**Rationale**: vendor は `context.fileName` を読み込む context file (群) の名前として文書化
しているので、設定された名前は既定を置き換える。名前を足す導出の隣に静的な `GEMINI.md`
ルールがあると、名前が設定されるたびに静的 plan を撤回する第2の mechanism — scan が持たない
抑制の seam — が要る。常に plan を出す1つの導出なら静的ルールも seam も要らず、Codex が既に
持つ stage を再利用する。reader は absent・unreadable・unparsable・型不正の carrier を Codex
のものと同じに扱う: 何も設定しないので既定が立ち、parse 失敗は carrier 自身の settings
recognition を通じて diagnostic に届き、型不正の値は diagnostic を持たない。

**Alternatives considered**: 静的ルール＋追加的な導出で、設定名が `GEMINI.md` を含まなくても
`GEMINI.md` を挙げ続ける — 仕様の User Story 3 が描くリポジトリで偽になる。静的ルール＋reader
が返す抑制 flag — 1つの事実に2つの mechanism。Global member の context filename のために user
tier の `settings.json` を読む — ページは global の場所を `~/.gemini/GEMINI.md` と述べ、設定が
それを改名すると確立していない (spec.md § Clarifications)。

## 3. Gemini CLI home は join なので、member 記述子は設定が何を指すかを述べる

**Decision**: `src/server/host/global-consent.ts` のツールごとの記述子に、その環境設定が
member root そのものを指す (Copilot、Claude、Codex) か root が作られるディレクトリを指す
(Gemini CLI) かを述べる閉じた field を加える。capture は今日と同じく設定文字列を分類する。
`eligible` の値は前者ではそのまま root になり、後者では固定 suffix と join される。absent の
場合はすべてのツールで今日と同じく capture した home directory と suffix を join する。

**Rationale**: configuration reference は `GEMINI_CLI_HOME` を user-level の設定と保存の root
directory で、既定は home、その中に `.gemini` が作られると文書化する — home の代わりであって
`.gemini` そのものではない。それを variable と suffix を既に持つ record 上の field として
符号化すれば、導出は読まれる1か所に留まり、違いはそれを持つ行の上で見える。

**Alternatives considered**: `GEMINI_CLI_HOME` を root を指すものとして扱う — reference に
反する。join を comment に書き capture loop で `gemini` を特別扱いする — 明示された置き場の
ない deviation。field がその置き場である。

## 4. 5つ目のメンバーはツール home の後、shared agent home の前

**Decision**: `SUPPORTED_TOOL_ORDER` は `copilot, claude, codex, gemini` になり、それに `agents`
を足して導出される `GLOBAL_MEMBER_ORDER` は5メンバーの tuple `[copilot, claude, codex, gemini,
agents]` になる。`GLOBAL_TOOL_HOME_ORDER` と環境 capture は同じ順に従い、`CODEX_HOME` の後に
`GEMINI_CLI_HOME` を読む。

**Rationale**: shared agent home は今日と同じく最後に留まり、新ツールは test と文書が既に綴る
3つを並べ替えず次の位置を取る。`src/shared/diagnostics.ts` の `lifecycleOwnerRank` ladder は
3つの `global:<tool>` rank を hard-code しているので、同じ変更で `GLOBAL_MEMBER_ORDER` から
rank を導出するように書き直す: さもなければ4つ目のメンバーは黙って fallback rank に落ちる
し、他所にある order を言い直す ladder は Implementation simplicity policy が禁じる「食い違い
うる2つの状態」の形である。

## 5. Gemini CLI が publish する kind と、それに答える compiled unit

**Decision**: Gemini CLI は8つの kind — instructions、skill、MCP、agent、prompt/command、hook、
settings/config、(Global だけ) permissions — を、`gemini/` vendor module と Codex と同じ形の
compiled unit を通じて publish する: `vendor/gemini.ts` の `GeminiCompiledRule` と
`GeminiCompiledDerivedRule`、kind ディレクトリごとに1つの unit、`settings/config` のための
other-kind unit。command unit は Claude の入れ子 command が既にしているように `:` で結んだ
呼び出し名を導出し、`.md` の代わりに `.toml` を落とす。MCP unit は既存の `server-map.ts`
helper で JSON の `mcpServers` map を読む。hook unit は `event-map.ts` で `hooks` object を
読む。agent unit は Claude と Codex のものと同じ declared-name unit。permissions unit は Codex
の `.rules` に対する document rule と同じで、ここでは TOML に対する。

**Rationale**: Gemini CLI が使うすべての format — YAML frontmatter 付き Markdown、コメント付き
JSON、TOML — には既に `parsers/` の parser があり、すべての kind には既に compiled の形がある。
新しいのは vendor の答えであり、Class and interface policy はそれをその vendor の subclass に
置く。kind は追加しない: extension は除外され (spec.md § Clarifications)、vendor はこの
プロダクトが挙げる output style・rule file・plugin manifest を文書化していない。

**Alternatives considered**: インストール済み extension やリポジトリルートの
`gemini-extension.json` のための `plugin` kind — 決定により除外。新しい manifest reader を
要する唯一の kind だったはずである。

## 6. `settings.json` はコメント付き JSON。文書ではなく計測で

**Decision**: `parsers/json.ts` の `acceptsComments` に、リポジトリの `.gemini/settings.json` と
Global の `settings.json` で true を返す Gemini 分岐を加える。comment は計測を記録する: vendor
の loader は `JSON.parse(stripJsonComments(content))` を呼ぶ (google-gemini/gemini-cli の
`packages/cli/src/config/settings.ts`、2026-09-09 閲覧) 一方、configuration reference はコメント
について何も述べない。

**Rationale**: 表のルールは reader が受け付ける場所ではコメントを受け付け、evidence を entry
に置く、である。vendor はコメントを剥がすが trailing comma は剥がさない。Inspector の lenient
な読みは両方を blank にするので、trailing comma のあるファイルは、プロダクトが reject する
行に宣言を示す — Copilot entry が受け入れているのと同じ、より穏当な誤りで、entry に記録する。

**Alternatives considered**: trailing comma なしのコメントのための第3の format — 唯一の効果が
不正なファイルが2つの誤りのどちらを示すかである差異のために、seam に新しい軸を足すこと。

## 7. skill の同名 statement は `select-first`

**Decision**: `gemini.skills.selection` は operation `select-first` と `filter` (trust) を持つ。
skills ページが、より高い優先 tier の同名 skill が使われること、tier 内では `.agents/skills/`
のコピーが `.gemini/skills/` に優先することを文書化しているからである。
`SAME_NAME_SKILL_RESOLUTIONS` はそこから導出される `gemini` entry を得、
`GeminiSkillCollisionPolicy` は1つの Source 内の1名前の2定義を、clash ではなく文書化された
alias 優先の選択として扱う。

**Rationale**: statement はすべてのプロダクトと同様に strategy の operation から導出される
ので、Gemini の行の同名テキストは記録された evidence から従い、プロダクトごとの表は増えない。

## 8. evidence record とその host

**Decision**: `GoogleSourceId` union が `SourceId` に加わり、引用するページごとに1つの ID を
持つ: `google.gemini-cli.configuration`、`gemini-md`、`custom-commands`、`skills`、
`creating-skills`、`subagents`、`hooks`、`hooks-reference`、`mcp-server`、`policy-engine`、
`extensions-reference`、`trusted-folders`、`gemini-ignore`。公式 host は `geminicli.com` で、
official-sources contract の host 表に新しい `## Google official sources` section の下で加える。
heading は既存 record の綴り (`Configure the mcp.json file`) と同様に backtick なしの rendered
text で記録する。

**Rationale**: すべての URL は 2026-09-09 にその host で直接 fetch した。2つのパス
(`/docs/core/policy-engine/`、`/docs/cli/configuration/`) は redirect または 404 で、引用しない
— 引用する形は `/docs/reference/policy-engine/` と `/docs/reference/configuration/` である。

## 9. count と byte を凍結する gate と、この機能が動かすもの

**Decision**: 変更はコードと1つの commit で次を更新する: `tests/contract/inspection-rules.test.ts`
と `vendor-behaviors.test.ts` の rule/behavior/strategy の count と Global rule-ID 一覧。
`allowlistVersion`/`traversalPlanVersion` の literal (source と `http-api-global.test.ts`) を
変更の日付へ。contract・integration・security・unit test の4メンバー tuple を5へ。
`presentation-allowlist-freeze.test.ts` の digest 表と official-sources contract の digest 表に
Gemini CLI の行。conformance JSON fixture。release-evidence の `manifest.json`/`manifest.sha256`
(`manifestVersion` 3 → 4、新しい measurement set)。そして cross-artifact の containment gate:
catalog 配列は `GEMINI_INSPECTION_RULES` を得、派生ルールの freeze は
`gemini.derived.context-filename` を得、両方の `docs/which-files-are-listed*.md` ページに
`GEMINI.md` と `context.fileName` の記載を要求する。

**Rationale**: それぞれリポジトリが意図して保つ freeze である (AGENTS.md § Implementation
simplicity policy)。1つを動かすのは、凍結したものを変える変更の一部であり、決して後追いでは
ない。cross-artifact test は `specs/001-…/` の task と quickstart artifact だけを読むので、この
機能の `tasks.md` は `/speckit-tasks` がそれを書くときに、両言語で、その test に自身の task 数と
phase 数の freeze を加える。

## 10. 親仕様の artifact が変わるもの

**Decision**: 実装する変更は両言語で次を改訂する: spec.md の FR-004 (4ツール)、Supported
Initial Release Customization Files の表 (Gemini CLI の行)、FR-013/FR-014 (5メンバー、capture
順の `GEMINI_CLI_HOME`)、FR-018 (Gemini CLI の除外される state)、User Story 4、Inspection
Session と Source の entity、Global scope の Assumption。data-model の `GlobalRootInputCapture`、
`GlobalConsentPreview` (`entries` は正確に5、member enum に `gemini`)、`Global lexical state`。
http-api.md の consent preview。readme のツール数とディレクトリ数。
`docs/which-files-are-listed*.md`。`SC-001`/`SC-006` の study input は4ツールを名指しするように
更新し、`validation.md` は指定された SC-006 ファイルの ground truth が変わったか、したがって
再実施が要ったかを記録する (spec.md § Clarifications)。

**Rationale**: Documentation content policy: artifact は今真であることを述べる。親 spec の
日付付き Clarifications entry が5つ目のメンバーが加わったこととその理由を記録し、他の
artifact は変更を語らない。

## 11. file detail は path と求める route の kind で address される

**Decision**: `get-file-detail` は file の identity と `kind` — 7つの file 主題の kind のいずれかで、
求める route が綴る (`src/shared/api-types.ts` の `FileDetailRequestParams`、`FileDetailKind`) —
を受け取り、その kind の variant を返す。その kind の recognition が path を持たないときは plain
file を返す。すべての detail page と comparison composable は自身の kind を渡し、自身の variant
だけを読む。他の kind の variant を自身の形に写し取る surface はない。

**Rationale**: 1つの file が2つの kind を持ちうるが、この機能は読みが syntax で異なる組を加える:
`.gemini/commands/build.toml` は Gemini CLI の command であり、`context.fileName` が `build.toml`
を名指せば Gemini CLI の context file でもある。command の読みは TOML の parse — metadata と
prompt — であり、同じ byte の instruction の読みは frontmatter のない Markdown の body として
の全文である。path だけで address される detail は両 route のために1つの variant を選ばねば
ならず、どちらを選んでももう一方の route にはその kind のものではない読みを見せる: command
page が TOML を prompt body として示すか、instruction page が command の metadata を
frontmatter として示すかである。親機能が既に抱えていた Markdown の重なり —
`.claude/agents/CLAUDE.md`、`.claude/commands/CLAUDE.md` — はこの選択を隠していた。両方の読みが
同じ document を生むからである。TOML の組で選択が見えるようになったので、host が選ぶのではなく
request が kind を名指す。route は既に最初の URL segment に kind を持つので、読み手が保存する
link に新しく求めるものはない (contracts/http-api.md § get-file-detail)。

**Alternatives considered**: 固定の variant 順と、各 surface が他 kind の variant を自身の形に
写し取る配置 — 親機能の配置 — は path ごとに1つの答えを保つが、読みが異なるときは一方の route
に他方の kind の読みを見せ、写し取りをすべての detail page と comparison module に広げる。
tool ごとの address は親機能が却下しており、その理由は今も成り立つ: 2つの product は同じ byte
を読むので、tool ごとの address は1つの document に2つの URL を与える。

## 移行影響

公開 package のユーザーには無し: 永続 state、profile、公開 contract の形は変わらない。session
API の preview DTO は閉じた順で entry が1つ増え、member enum の値が1つ増える。同梱ブラウザが
唯一の client である。`allowlistVersion` と `traversalPlanVersion` は進むが、それがそれらの
存在理由である。dependency は追加しない: Gemini の mark は bundle が既に持つ collection の
`~icons/simple-icons/googlegemini` なので、`@iconify-json/*` package、notice の行、license
text は追加しない。changeset entry は `minor`。
