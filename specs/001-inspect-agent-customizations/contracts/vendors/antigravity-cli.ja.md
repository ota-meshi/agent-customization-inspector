# Vendor Contract: Antigravity CLI

[English](antigravity-cli.md)

**Contract version**: 2026-09-24
**Official-source review**: 2026-09-24

この contract は、文書化された Antigravity CLI の lookup behavior と、Inspector の read
allowlist を分離する。共通の matcher 文法と source boundary の規則は
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.ja.md) が定義する。
composition と precedence は ID により
[Runtime Composition](../runtime-composition.ja.md) が、evidence record は
[Official Sources](../official-sources.ja.md) が定義する。

`behaviorId` は Antigravity CLI を記述する。`ruleId` は Inspector の方針を記述する。vendor の
locator や behavior record が read authority を与えることはない。

## Surface boundary

Antigravity CLI は vendor の端末 client であり、この contract が覆う唯一の surface である。
よって以下の behavior はすべて **CLI** と記される。vendor は desktop アプリと editor 拡張も
文書化しており、それらは自身のカスタマイズ — workflow や workspace の plugin ディレクトリなど —
を読むが、それらはこのリリースの外にある。ここのどの行もそれらを記述せず、どの rule もそれらだけが
読む location を admit しない。

ページが何についてのページかは、その所在ではなく節で決まる。vendor のカスタマイズのページの
多くは3製品に共通で、製品ごとの節を持ち、2つの共有カスタマイズ root の上に立つ。workspace の
`.agents/` と user tier の `config/` は製品をまたいで同じファイルについて名指され、`~/.gemini`
配下の各製品自身のディレクトリは異なる。アプリは `antigravity`、拡張は `antigravity-ide`、端末は
`antigravity-cli` である。したがって共通ページは、その端末の節と、全製品に等しく述べる内容について
引用する。別の製品についての節はその製品の location だけを確立し、この contract が admit する
location の唯一の引用にはならない。例外は、端末もそれを読むことが観測されており、引用する
record がそう述べる場合である (§ 既知の不確実性 項目 6)。

端末の中で異なるのは surface ではなく tier である。選択された root
配下の workspace tier と、`~/.gemini` 配下の user tier があり、後者は共有の設定ディレクトリ
`config/`、端末自身のディレクトリ `antigravity-cli/`、global の context file 群を持つ。Inspector は
workspace tier を Repository Source として、user tier を Antigravity home の Global member として
読む。user tier の中のインストール済み plugin コピーは記録して除外する。

## Canonical evidence-assessment index

この contract が所有する `behaviorId` と `ruleId` は、それぞれ自身の `documentationStatus` と
`lifecycleQualifiers` を述べる。下に挙げない限り、canonical な値は
`documentationStatus: documented` と `lifecycleQualifiers: []` である。これは挙げられていない
subject すべてに対する閉じた対応であり、Evidence の欄からの推論ではない。空の qualifier は
lifecycle の主張をせず、`stable` を意味しない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `antigravity.behavior.user.skills` | `partially-documented` | `[]` | 端末の `antigravity-cli/skills/` のフォルダは正確。ページは `config/skills/` を他の2製品に与えており、バイナリによれば端末もそこを歩く (§ 既知の不確実性 項目 6) |
| `antigravity.global.skill` | `partially-documented` | `[]` | 端末の root とフォルダ形は厳密。`config/skills/` は他の2製品のものとして文書化され、端末の探索でも観測される (§ 既知の不確実性 項目 6) |
| `antigravity.behavior.repo.mcp` | `partially-documented` | `[]` | 2つの設定パスと server の schema は正確だが、同名の workspace server と global server がどう合成されるかは述べられない (§ 既知の不確実性 項目 3) |
| `antigravity.behavior.user.mcp` | `partially-documented` | `[]` | workspace の行と同じ理由 |
| `antigravity.behavior.user.hooks` | `partially-documented` | `[]` | 共有の Hooks ページは端末が hook を定義するすべての場所を名指し、standalone なファイルの schema を与えるが、settings ファイル側の schema は述べない (§ 既知の不確実性 項目 4) |

## 文書化済み Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.behavior.repo.context` | CLI | 端末が読む・編集する各ファイルのフォルダ | `GEMINI.md`、`AGENTS.md`、`.agents/GEMINI.md`、`.agents/AGENTS.md` | workspace root まで上へたどり、各階層の組を読み込む。すべての階層のファイルが組み合わされ、衝突時はより具体的なディレクトリのものが優先する | `antigravity.context.layering` | Documented | `google.antigravity.rules`、`google.antigravity.cli-migration` |
| `antigravity.behavior.repo.skills` | CLI | プロジェクトルート | `.agents/skills/<name>/SKILL.md`、`.agent/skills/<name>/SKILL.md` | frontmatter に `description` を必須とする `SKILL.md` を持つフォルダで、slash command になる。共有の Agent Skills ページはそれを端末の workspace skill として与え、`.agent/skills` をそのディレクトリの旧綴りとしてなお支えると記録する | `antigravity.skills.selection` | Documented | `google.antigravity.cli-migration`、`google.antigravity.skills` |
| `antigravity.behavior.repo.rules` | CLI | 端末が読む・編集する各ファイルのフォルダ | `.agents/rules/<name>.md`、`.agent/rules/<name>.md` | workspace root まで上へたどる。各階層の rules フォルダ直下の Markdown ファイルで、frontmatter で trigger — `always_on`、`model_decision`、`glob`、`manual` — を宣言し、24,000 バイトを超えると切り詰められる | `antigravity.rules.activation` | Documented | `google.antigravity.rules`、`google.antigravity.cli-migration` |
| `antigravity.behavior.repo.hooks` | CLI | プロジェクトルート | `.agents/hooks.json` | hook 名から event 設定への map。各 event は command handler の matcher group を持ち、hook ごとに optional な `enabled` フラグを持つ | `antigravity.hooks.merge` | Documented | `google.antigravity.hooks` |
| `antigravity.behavior.repo.agents` | CLI | プロジェクトルート | `.agents/agents/<name>.md`、`.agents/agents/<name>/agent.md` | YAML frontmatter を持つ Markdown。自動的に discover される。frontmatter の表は `name` を必須と記し、`subagent: true` を持つものは primary agent から呼べる | `antigravity.agents.selection` | Documented | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.behavior.repo.mcp` | CLI | プロジェクトルート | `.agents/mcp_config.json` | standalone な JSON profile。その `mcpServers` object が名前を configuration へ対応づける。リモート server は `serverUrl` を使う | `antigravity.mcp.configuration` | Partially documented | `google.antigravity.cli-mcp`、`google.antigravity.cli-migration` |

## Inspector Repository rule

この表の base はすべて Inspector の Repository boundary そのもの、すなわち選択された Repository
root であり、`Repository` と綴る。2つの family はどの深さにも届く。端末は読む・編集する各ファイル
から上へたどり、各階層にあるものを読み込むからである。すなわち、ディレクトリとそのディレクトリの
`.agents/` にある context の組と、rules フォルダである。それ以外の `.agents/` の location は
すべて選択された root 自身のディレクトリである。vendor はそれをプロジェクトルートに文書化し、
ネストしたものは文書化しないので、`packages/api/.agents/skills/` は near miss である。

2つの location は旧綴りの `.agent` 用に2本目の selector を持つ。その location を述べるページが
後方互換を述べているからである。互換はディレクトリについて述べられているので、旧綴りが admit
するのはそのページがそこで示す形そのものである。すなわち skill フォルダの中の `SKILL.md` と、
rules フォルダ直下の Markdown ファイルである。フラットな skill はどちらの綴りでも文書化する
ページがないので、`.agents/skills/<name>.md` と `.agent/skills/<name>.md` は near miss である
(§ 既知の不確実性 項目 6)。

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.repo.context` | Repository | `[ANY_DIRECTORIES, 'GEMINI.md']`、`[ANY_DIRECTORIES, 'AGENTS.md']` | `descendant-inventory`（root とすべての子孫を含み、`ANY_DIRECTORIES` は0 segment も含む）。適用範囲はファイルを持つディレクトリ、またはその `.agents/` を持つディレクトリ | `static-candidate` | `antigravity.behavior.repo.context` | Documented | `google.antigravity.rules` |
| `antigravity.repo.skill` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']`、`['.agent', 'skills', ANY_NAME, 'SKILL.md']` | `exact`。名前 segment は1つ。行の単位はディレクトリ | `static-candidate` | `antigravity.behavior.repo.skills` | Documented | `google.antigravity.skills` |
| `antigravity.repo.rule` | Repository | `[ANY_DIRECTORIES, '.agents', 'rules', /\.md$/u]`、`[ANY_DIRECTORIES, '.agent', 'rules', /\.md$/u]` | 各 rules フォルダまでは `descendant-inventory`、その先は `direct-child` | `static-candidate` | `antigravity.behavior.repo.rules` | Documented | `google.antigravity.rules` |
| `antigravity.repo.hooks` | Repository | `['.agents', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.hooks` | Documented | `google.antigravity.hooks` |
| `antigravity.repo.agent.file` | Repository | `['.agents', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.agent.directory` | Repository | `['.agents', 'agents', ANY_NAME, 'agent.md']` | `exact`。名前 segment は1つ | `static-candidate` | `antigravity.behavior.repo.agents` | Documented | `google.antigravity.cli-subagents` |
| `antigravity.repo.mcp` | Repository | `['.agents', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.mcp` | Partially documented | `google.antigravity.cli-mcp` |

## Derived Repository rule

この vendor は1つも出荷しない。derived rule は、文書化された設定がどのパスを admit するかを決める
ところに存在するが、workspace のカスタマイズの名前を変えたり場所を移したりする端末の設定を文書化
するページは引用先にない。settings ファイルは user tier のものであり、上のカスタマイズのパスは、
それを述べるどのページでも literal である。

## 文書化済み User behavior

| Behavior ID | Subject | Location | Strategy | Inspector treatment | Evidence |
|---|---|---|---|---|---|
| `antigravity.behavior.user.home` | user tier | `~/.gemini` | — | Antigravity home の Global member | `google.antigravity.cli-migration`、`google.antigravity.cli-settings` |
| `antigravity.behavior.user.context` | global の developer context | `<user tier>/GEMINI.md`、`<user tier>/AGENTS.md`、`<user tier>/config/GEMINI.md`、`<user tier>/config/AGENTS.md` | `antigravity.context.layering` | `antigravity.global.context` が accept | `google.antigravity.rules`、`google.antigravity.cli-migration` |
| `antigravity.behavior.user.rules` | モジュール化された global の rule | `<user tier>/config/rules/<name>.md`、`<user tier>/antigravity-cli/rules/<name>.md` | `antigravity.rules.activation` | `antigravity.global.rule` が accept | `google.antigravity.rules` |
| `antigravity.behavior.user.mcp` | global の MCP server | `<user tier>/config/mcp_config.json` | `antigravity.mcp.configuration` | `antigravity.global.mcp` が accept | `google.antigravity.cli-mcp` |
| `antigravity.behavior.user.agents` | global の custom agent、文書化された両方の形 | `<user tier>/config/agents/<name>.md`、`<user tier>/config/agents/<name>/agent.md` | `antigravity.agents.selection` | `antigravity.global.agent.file` と `antigravity.global.agent.directory` が accept | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.behavior.user.skills` | global の共有 skill | `<user tier>/antigravity-cli/skills/`、`<user tier>/config/skills/` | `antigravity.skills.selection` | `antigravity.global.skill` が accept | `google.antigravity.cli-migration`、`google.antigravity.skills` |
| `antigravity.behavior.user.settings` | user の preference | `<user tier>/antigravity-cli/settings.json` | — | `antigravity.global.settings` が accept | `google.antigravity.cli-settings`、`google.antigravity.cli-features` |
| `antigravity.behavior.user.permissions` | allow・ask・deny の一覧 | `<user tier>/antigravity-cli/settings.json` | `antigravity.permissions.precedence` | `antigravity.global.permissions` が accept | `google.antigravity.cli-permissions` |
| `antigravity.behavior.user.hooks` | hook 宣言 | `<user tier>/config/hooks.json`、`<user tier>/antigravity-cli/settings.json`、および plugin の `hooks.json` | `antigravity.hooks.merge` | standalone なファイルは `antigravity.global.hooks` が、settings の形は `antigravity.global.hooks.inline` が accept。plugin の形はその plugin とともに除外 | `google.antigravity.hooks` |
| `antigravity.behavior.user.plugins` | インストール済み plugin コピー | `<user tier>/antigravity-cli/plugins/<name>/` と隣の `import_manifest.json` | — | `antigravity.excluded.plugins` が除外 | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |

## Inspector Global rule

base は consent 済みの Antigravity home boundary、すなわち capture された home ディレクトリ配下の
`.gemini` である。それを移動させる環境プロパティはないので、member の root はどの場合もその join
であり、origin は常に default home である。

その boundary の配下で、`config/` は vendor の共有設定ディレクトリ、`antigravity-cli/` は端末
自身のものであり、skill と rule の各 rule は、両方の配下にあるディレクトリにそれぞれ届く。共有の Agent
Skills ページは端末の global skill を `antigravity-cli/skills/` に与え、`config/skills/` をアプリと
拡張に与える。端末は両方を歩く (§ 既知の不確実性 項目 6)。拡張の旧来の `antigravity/skills/` は
対象外である。これはこのリリースがサポートしない製品のものだからである (§ Surface boundary)。

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Serves | Evidence |
|---|---|---|---|---|---|---|---|---|
| `antigravity.global.context` | consent 済み Antigravity home | `['GEMINI.md']`、`['AGENTS.md']`、`['config', 'GEMINI.md']`、`['config', 'AGENTS.md']` | `exact`。適用範囲は boundary 全体 | `static-candidate` | `antigravity.behavior.user.context` | Documented | global の context file 群 | `google.antigravity.rules` |
| `antigravity.global.rule` | 同じ boundary | `['config', 'rules', /\.md$/u]`、`['antigravity-cli', 'rules', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.rules` | Documented | モジュール化された global の rule | `google.antigravity.rules` |
| `antigravity.global.mcp` | 同じ boundary | `['config', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.mcp` | Partially documented | global の MCP server | `google.antigravity.cli-mcp` |
| `antigravity.global.agent.file` | 同じ boundary | `['config', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.agents` | Documented | ファイル形の global custom agent | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.global.agent.directory` | 同じ boundary | `['config', 'agents', ANY_NAME, 'agent.md']` | `exact`、name segment は1つ | `static-candidate` | `antigravity.behavior.user.agents` | Documented | フォルダ形の global custom agent | `google.antigravity.subagents` |
| `antigravity.global.skill` | 同じ boundary | `['antigravity-cli', 'skills', ANY_NAME, 'SKILL.md']`、`['config', 'skills', ANY_NAME, 'SKILL.md']` | `exact`。行の単位はその program が名指す skill フォルダ | `static-candidate` | `antigravity.behavior.user.skills` | Partially documented | 端末が歩く両方の root にある global 共有 skill | `google.antigravity.skills` |
| `antigravity.global.settings` | 同じ boundary | `['antigravity-cli', 'settings.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.settings` | Documented | settings document | `google.antigravity.cli-settings` |
| `antigravity.global.permissions` | 同じ boundary | `['antigravity-cli', 'settings.json']` | 同じ selector に対する `exact`。carrier の permission の一覧がその `permissions` recognition | `static-candidate` | `antigravity.behavior.user.permissions` | Documented | user の permission policy | `google.antigravity.cli-permissions` |
| `antigravity.global.hooks` | 同じ boundary | `['config', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.hooks` | Documented | user tier の standalone な hook carrier | `google.antigravity.hooks` |
| `antigravity.global.hooks.inline` | 同じ boundary | `['antigravity-cli', 'settings.json']` | settings rule の selector に対する `exact`。carrier の hook 宣言がその `hook` recognition | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | settings document が宣言する hook | `google.antigravity.hooks` |

## Relationship-only と excluded group

relationship-only な `ruleId` の定義は
[Runtime Composition](../runtime-composition.ja.md) にある。Antigravity CLI について、それらの
ルールは context file の import、skill が参照する script と resource、hook の command、agent の
`mcpServers` と tool の参照を cover する。それらは決して対象の読み取りを許可しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.excluded.plugins` | `excluded` | user tier の `antigravity-cli/plugins/` 配下のインストール済み plugin コピー、それを追跡する `import_manifest.json`、およびその中の skill・agent・rules・MCP 定義・hook。インストール済みコピーは書かれたものではなく source から再現されたものであり、親仕様の FR-018 がどの vendor についても既に除外しているものである | `antigravity.behavior.user.plugins`、`antigravity.behavior.user.hooks` | FR-013、FR-014、FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |
| `antigravity.excluded.workspace-plugins` | `excluded` | workspace の plugin ディレクトリとその配下すべて。`.agents/plugins/` と、その隣の `_agents/plugins/` の綴り、およびその中の skill・rules・MCP 定義・hook。理由は上のインストール済みコピーの理由ではない。それはリポジトリで著述された plugin には届かない。理由は、端末について workspace の plugin ディレクトリを名指すページがないことである。Plugins ページは `.agents/plugins/` をアプリと拡張の節で与え、その端末の節と端末自身のページは plugin を `agy` が user tier へ配置する bundle としてのみ述べるので、端末が workspace からそれを読み込むことをここで引用したものは何も確立しない (§ Surface boundary) | `antigravity.behavior.user.plugins` | FR-003、FR-013、FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |
| `antigravity.excluded.user-runtime` | `excluded` | どの Global rule も admit しない user tier の state。first-launch onboarding が保存する credential と keyring の材料、session と会話の履歴、cache、log。および vendor の desktop アプリと editor 拡張の専用ディレクトリ `antigravity/` と `antigravity-ide/`。このリリースはそれらを認識しない | `antigravity.behavior.user.home` | FR-013、FR-018、QR-003 | — | `documented` | `google.antigravity.cli-migration`、`google.antigravity.cli-settings` |

## Initial release の規範的 presentation allowlist

| Kind | Presentation source | Admitted occurrences |
|---|---|---|
| `instructions` | `frontmatter`<br>`body` | context file が frontmatter block を持つ場合はそれと、その body |
| `skill` | `frontmatter`<br>`body` | skill フォルダの `SKILL.md` の frontmatter block とその指示。companion の census は他のディレクトリ形の skill と同じく publish する。`name` を宣言しない skill の行は、そのファイルを読むどの製品も使う同じ fallback であるフォルダ名で名付ける (§ 既知の不確実性 項目 7) |
| `rule` | `frontmatter`<br>`body` | rule の frontmatter block（宣言された activation を含む）とその下の制約。それぞれ書かれたとおりに示し、評価はしない |
| `agent` | `metadata`<br>`instructions` | custom agent の frontmatter block とその下の body |
| `MCP` | `runtime-reference` | carrier の `mcpServers` object の下で宣言された server 名と、各 server が宣言するすべての field。`serverUrl` と legacy の `url`・`httpUrl` を含む |
| `hook` | `runtime-reference` | standalone な `hooks.json` の下でも settings carrier の hook 宣言の下でも同じく、event map の key、matcher の値、handler の葉。この vendor の carrier は各 hook に名前を付け、その中に event を入れ子にするので、宣言は carrier が書いた名前と、carrier が書いていればその hook 自身の `enabled` キーも publish する。どちらもファイル自身のキーとしてであり、解釈はしない。hook が走るかどうかはこの製品が観測しない実行時の事柄なので、どの行も「無効」「停止中」とは述べず、読み手にはファイルが `enabled: false` と書いていることを示す |
| `permissions` | `runtime-reference` | settings carrier が宣言する `allow`・`ask`・`deny` の entry。書かれたとおり |
| `settings/config` | `runtime-reference`<br>`fallback` | admit された settings carrier 上の、サポートされる JSON の値・item・key の正確な出現。MCP 宣言は自身の carrier のものであり、permission と hook の宣言はそれぞれの recognition 行だけのものである |

## 既知の不確実性と必須 condition fact

1. Rules ページは、上へたどる各階層で端末が `<dir>/AGENTS.md` または `<dir>/GEMINI.md` と、
   `<dir>/.agents/AGENTS.md` または `<dir>/.agents/GEMINI.md` を読み込むと述べる。この「または」が、
   両方の名前を持つディレクトリ — あるいは組とその `.agents/` の組の両方を持つディレクトリ — では
   一方が読み込まれ他方が無視されることを意味するのか、そうだとすればどちらなのかは述べない。
   Inspector はそうしたファイルをすべて admit し、1つのディレクトリのファイルの間の precedence は
   述べない。Inspector が述べる順序は階層の間のものであり、それはページ自身の順序である。
2. skill のページは両方のパスを述べ、global の skill がどの workspace でも使えると述べるが、
   workspace の skill と global の skill が1つの名前を宣言したときのことは述べない。Inspector は
   引用できない解決を述べない。
3. MCP のページは両方の設定パスを述べるが、同名の workspace server と global server がどう
   合成されるかは述べない。Inspector は各宣言をそれを宣言した carrier の下に挙げ、precedence を
   述べない。
4. Hooks のページは端末が settings ファイルの中でも hook を定義すると述べるが、settings ファイル
   側の schema は与えない。Inspector はそのファイルが hook object の
   下に宣言するものを、ファイル自身の順で publish し、何も分類しない。
5. user tier を移動させる環境プロパティを文書化するページは引用先にない。どのページもそれを
   文字どおり `~/.gemini` と書く。よって member の root はどの場合も home ディレクトリとの join で
   あり、capture はそのためのプロパティを読まない。
6. 端末の skill の location を与えるページはどれも、`SKILL.md` を持つ skill フォルダを与える。
   共有の Agent Skills ページの端末の節は `<workspace-root>/.agents/skills/<skill-folder>/` と
   `~/.gemini/antigravity-cli/skills/<skill-folder>/` を与え、Plugins ページは plugin の中に同じ
   フォルダを示す。`skills/` ディレクトリ直下のフラットな Markdown ファイルを文書化するページは
   ないので、どちらの綴りでも、どちらの global root でも、それを admit する rule はない。同じ
   ページは `~/.gemini/config/skills/<skill-folder>/` を、端末ではなくアプリと拡張の global の
   location として与える。

   実装はページと一致する。公式インストーラの `linux_amd64` manifest が名指す `agy` 1.2.0 の
   Linux x64 バイナリ（展開した実行ファイルの SHA-256 は
   `195bf11b249deebe67028305a9b7b1d19ac38e9ab281b786a163a7d2fc8ff428`）を静的解析したところ、
   端末自身の `GetSkills` から customization manager を経て共通の探索処理へ至る経路をたどれ、
   skill の customization 種別が file 種別ではなく subdirectory 種別だった。すなわち `skills/`
   直下の通常ファイルは名前を読む前に除外され、`GetSkillsCreatePath` は
   `{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。同じ解析で、global の探索は
   端末のアプリケーションデータディレクトリと設定ディレクトリの両方をルートに加えたうえで重複を
   除去することも分かった。ページが他の2製品に与える `config/skills/` を端末自身の root と並べて
   admit しているのはそのためである（当該バイナリに対する観測であり、引用したどのページも確立
   していない。Codex contract の `plugin@marketplace` の綴りと同じ位置づけ）。

   `.agent/` の後方互換は形ではなくディレクトリについて述べられているので、旧綴りが admit する
   のはそのページがそこで示すものだけである。すなわち `.agent/skills/<name>/SKILL.md` と
   `<dir>/.agent/rules/<name>.md` である。
7. 共有の Agent Skills ページは skill の `name` を任意とし、省略時はフォルダ名が既定だと述べる。
   上記のバイナリはそうしない。静的に読むと、`name` が無いか空の場合はファイル自身の名前から
   末尾の `.md` を除いたもので補われ、skill フォルダの `SKILL.md` では `SKILL` になる。
   Inspector はその行をフォルダ名で名付ける。

   この観測には従わない。理由は同じバイナリの中にある。`GetSkillsCreatePath` は
   `{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。つまり端末自身が
   フォルダを skill の名前の持ち手として扱っている。`SKILL` の fallback は、端末が作った
   名前無し skill をすべて互いに衝突させることになる。ページと、同じファイルを読む2製品と、
   その path builder はフォルダで一致しており、静的に読んだ fallback 1つだけが食い違う。
   これは文書化された規則ではなく1つのビルドの1つの関数の読み取りであり、著者が書いておらず
   そのファイルの他のどの読み手も使わない名前を publish する根拠としては足りない。publish
   すれば1つのファイルが2つの名前で2行に乗ることにもなり、vendor 側の事実ではなくこの製品の
   欠陥として読まれる。
8. 共有の Hooks ページは `hooks.json` の schema を正確に与え、その端末の節は端末が hook を定義
   する場所を名指す。プロジェクトルートの `.agents/hooks.json`、`~/.gemini/config/hooks.json` または
   主となる `~/.gemini/antigravity-cli/settings.json`、そしてインストール済み plugin の
   `hooks.json` である。よって standalone な2つの carrier を admit し、どちらも documented である。
   2つの standalone ファイルと settings ファイルの inline 宣言がどう合成されるかを述べるページは
   ないので、Inspector は各宣言をそれを宣言した carrier の下に挙げ、precedence を述べない。
9. この vendor の hook 宣言は名前を持つが、他3 vendor の宣言は持たず、inventory はその名前を必要と
   する。hook の行の単位は宣言された event 1つであり、その中の1本は `(carrier, tool)` 単位である。
   これは carrier が1つの event を高々1回しか宣言しない形式では成り立つ。この vendor の carrier は
   *名前付き* hook の map で、各 hook が自身の event を抱えるので、1つの carrier が `PostToolUse` を
   2回 — `my-linter-hook` の下と `safety-gate` の下で — 宣言でき、2本が同じパスに、見分ける手がかり
   なく並ぶ。よって行の中の1本は `(carrier, 宣言された名前)` で識別し、hook に名前を付けない形式では
   その名前を持たない。これはこの vendor についての事実ではなく hook 宣言一般についての事実である。
   宣言は名前を持ちうるのであり、4つの形式のうち3つはそれを付けない。

   行の単位は変えず、detail の形も変えない。この vendor の event は、ファイル自身のキーをファイル
   自身の順で示すものとしてページに届くので、hook 名も `enabled` のキーも読み手が見る JSON の中に
   既にある。1つの event の section が2つの宣言を抱えるなら、同じ見出しの下に宣言1つにつき1
   ブロックを描く。他3 vendor の行も detail も動かない。
10. 共有の Rules ページは端末の rule の location — リポジトリルートまたはサブディレクトリの
   `.agents/rules/*.md`（agent が読む・編集するファイルのフォルダから上へたどる）と、user tier の
   `~/.gemini/config/rules/*.md` および `~/.gemini/antigravity-cli/rules/*.md` — 4つの trigger、
   ファイルあたり 24,000 バイトの上限、rule が累積的であること、衝突時はより具体的なディレクトリの
   ものが優先することを与える。端末の migration ページは workspace の rule のサポートが維持されると
   述べる。1つのディレクトリの rule の間の順序は述べず、`antigravity.rules.activation` が
   `partially-documented` であるのはそのためである。ページは rules ディレクトリの直下の `.md`
   だけが走査されると述べるので、各 rule は rules フォルダの直下の子を admit し、その下のものは
   admit しない。
