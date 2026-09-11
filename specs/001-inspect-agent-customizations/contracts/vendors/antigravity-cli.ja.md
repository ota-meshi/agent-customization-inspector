# Vendor Contract: Antigravity CLI

[English](antigravity-cli.md)

**Contract version**: 2026-09-10
**Official-source review**: 2026-09-10

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

ページが何についてのページかは、どの製品ツリーに置かれているかでは決まらない。vendor の文書は、
2つの共有カスタマイズ root の上に立つ3つの製品ツリーである。workspace の `.agents/` と user tier
の `config/` は3つのツリーが同じファイルについて名指し、`~/.gemini` 配下の各製品自身の
ディレクトリは異なる。アプリは `antigravity`、拡張は `antigravity-ide`、端末は `antigravity-cli`
である。したがって共有部分のページは共有 root に何があるかを確立し、ここではそのために引用する。
他の製品ツリーのページはその製品の専用ディレクトリだけを確立し、この contract が admit する
location のために引用することはない。共有ページと端末自身のページが1つの location を違う形で
記述する場合 — workspace の skill の2つの形 — は両方を admit する。どちらもそのディレクトリに
ついて文書化されており、どちらのページも precedence を述べないからである (§ 既知の不確実性
項目 6)。

端末の中で異なるのは surface ではなく tier である。選択された root
配下の workspace tier と、`~/.gemini` 配下の user tier があり、後者は共有の設定ディレクトリ
`config/`、端末自身のディレクトリ `antigravity-cli/`、global の context file を持つ。Inspector は
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
| `antigravity.behavior.repo.context` | `partially-documented` | `[]` | migration のページは workspace の context file を作業ディレクトリのものとして、global のものを正確なパスで名指すが、深さも2つの名前の間の precedence も述べない (§ 既知の不確実性 項目 1) |
| `antigravity.behavior.user.context` | `partially-documented` | `[]` | workspace の行と同様。パスは正確だが、workspace のファイルとの layering は述べられない |
| `antigravity.behavior.repo.skills` | `conflict` | `[]` | 1つのディレクトリにある skill の形について、ページ同士が両立しない主張をしている。端末自身のページはフラットな `.md`、他の5つはフォルダ + `SKILL.md` であり、公開バイナリはフォルダしか検出しない (§ 既知の不確実性 項目 6)。workspace と global の skill が1つの名前を宣言したときのことは別途述べられない（項目 2） |
| `antigravity.behavior.user.skills` | `conflict` | `[]` | 同じ形の conflict に加え、1つの scope に対して2つのページが別々の global ディレクトリを与えている。これはバイナリによれば不一致ではない。端末は両方を歩く (§ 既知の不確実性 項目 6) |
| `antigravity.repo.skill.file` | `conflict` | `[]` | `antigravity.behavior.repo.skills` と同じ。この rule は1ページが与え5ページが否定する形を admit する |
| `antigravity.repo.skill.directory` | `partially-documented` | `[]` | 形と `.agent/` の後方互換は正確。同名のフラットファイルとの解決順は述べられない (§ 既知の不確実性 項目 6) |
| `antigravity.global.skill.file` | `conflict` | `[]` | `antigravity.behavior.user.skills` と同じ。この rule は1つのページが与え5つが否定するフラット形を admit する |
| `antigravity.global.skill.directory` | `partially-documented` | `[]` | 2つの global root とフォルダ形は厳密だが、同名のフラットファイルとの解決は述べられていない (§ 既知の不確実性 項目 6) |
| `antigravity.behavior.repo.mcp` | `partially-documented` | `[]` | 2つの設定パスと server の schema は正確だが、同名の workspace server と global server がどう合成されるかは述べられない (§ 既知の不確実性 項目 3) |
| `antigravity.behavior.user.mcp` | `partially-documented` | `[]` | workspace の行と同じ理由 |
| `antigravity.behavior.user.hooks` | `partially-documented` | `[]` | plugins and skills のページは hook が plugin の `hooks.json` か settings ファイルに設定されると述べるが settings ファイル側の schema は述べない。共有の Hooks ページは standalone なファイルの schema を与えるが、その location は端末が述べる lookup ではなく例として与える (§ 既知の不確実性 項目 4、項目 7) |
| `antigravity.behavior.repo.hooks` | `partially-documented` | `[]` | user の行と同様。schema は正確だが、workspace の location はカスタマイズディレクトリの例として与えられている (§ 既知の不確実性 項目 8) |
| `antigravity.behavior.repo.rules` | `partially-documented` | `[]` | 共有の Rules ページはディレクトリ、4つの activation mode、ファイルあたりの文字数上限を与え、端末の migration ページは workspace の rule のサポートが維持されると述べる。2つの rule が合成される順序も、context file に対する precedence も述べるページはない (§ 既知の不確実性 項目 10) |

## 文書化済み Repository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.behavior.repo.context` | CLI | プロジェクトルート | `GEMINI.md`、`AGENTS.md` | 作業ディレクトリのものが parse され適用される。global の context file が併せて参照される | `antigravity.context.layering` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.behavior.repo.skills` | CLI | プロジェクトルート | `.agents/skills/<name>/SKILL.md`、`.agent/skills/<name>/SKILL.md`、`.agents/skills/<name>.md` | `name` と `description` の frontmatter を持つ Markdown。そのディレクトリで CLI を動かすと slash command に compile される。共有の Agent Skills ページは `SKILL.md` を持つフォルダを与え、`.agent/skills` をそのディレクトリの旧綴りとしてなお支えると記録する。端末自身のページはその代わりにフラットなファイルを与える (§ 既知の不確実性 項目 6) | `antigravity.skills.selection` | Conflict | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-migration`、`google.antigravity.skills` |
| `antigravity.behavior.repo.rules` | CLI | プロジェクトルート | `.agents/rules/<name>.md`、`.agent/rules/<name>.md` | workspace または git root の rules フォルダ配下の Markdown ファイル。manual、always on、model decision、自身が宣言する glob のいずれかで activate され、12,000 文字が上限である | `antigravity.rules.activation` | Partially documented | `google.antigravity.rules`、`google.antigravity.cli-migration` |
| `antigravity.behavior.repo.hooks` | CLI | プロジェクトルート | `.agents/hooks.json` | hook 名から event 設定への map。各 event は command handler の matcher group を持ち、hook ごとに optional な `enabled` フラグを持つ | `antigravity.hooks.merge` | Partially documented | `google.antigravity.hooks` |
| `antigravity.behavior.repo.agents` | CLI | プロジェクトルート | `.agents/agents/<name>.md`、`.agents/agents/<name>/agent.md` | YAML frontmatter を持つ Markdown。自動的に discover される。frontmatter の表は `name` を必須と記し、`subagent: true` を持つものは primary agent から呼べる | `antigravity.agents.selection` | Documented | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.behavior.repo.mcp` | CLI | プロジェクトルート | `.agents/mcp_config.json` | standalone な JSON profile。その `mcpServers` object が名前を configuration へ対応づける。リモート server は `serverUrl` を使う | `antigravity.mcp.configuration` | Partially documented | `google.antigravity.cli-mcp`、`google.antigravity.cli-migration` |

## Inspector Repository rule

この表の base はすべて Inspector の Repository boundary そのもの、すなわち選択された Repository
root であり、`Repository` と綴る。`.agents/` の location はすべて選択された root 自身の
ディレクトリである。vendor は workspace の `.agents` ディレクトリをプロジェクトルートに文書化し、
ネストしたものは文書化しないので、`packages/api/.agents/` はどの深さでも near miss である。

2つの location は旧綴りの `.agent` 用に2本目の selector を持つ。その location を述べるページが
後方互換を述べているからである。互換はディレクトリについて述べられているので、旧綴りが admit
するのはそのページがそこで示す形そのものである。すなわち skill フォルダの中の `SKILL.md` と、
rules フォルダ配下の Markdown ファイルである。フラットな skill の形は端末自身のページのもので、
そのページは `.agents` しか名指さないので、`.agent/skills/<name>.md` は near miss である
(§ 既知の不確実性 項目 6)。

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.repo.context.gemini-root` | Repository | `['GEMINI.md']` | `exact` | `static-candidate` | `antigravity.behavior.repo.context` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.repo.context.agents-root` | Repository | `['AGENTS.md']` | `exact` | `static-candidate` | `antigravity.behavior.repo.context` | Partially documented | `google.antigravity.cli-migration` |
| `antigravity.repo.skill.file` | Repository | `['.agents', 'skills', /\.md$/u]` | root の `.agents/skills/` 直下の `direct-child`。行の単位はファイル | `static-candidate` | `antigravity.behavior.repo.skills` | Conflict | `google.antigravity.cli-plugins-skills`、`google.antigravity.skills` |
| `antigravity.repo.skill.directory` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']`、`['.agent', 'skills', ANY_NAME, 'SKILL.md']` | `exact`。名前 segment は1つ。行の単位はディレクトリ | `static-candidate` | `antigravity.behavior.repo.skills` | Partially documented | `google.antigravity.skills` |
| `antigravity.repo.rule` | Repository | `['.agents', 'rules', /\.md$/u]`、`['.agent', 'rules', /\.md$/u]` | root の rules ディレクトリ直下の `direct-child` | `static-candidate` | `antigravity.behavior.repo.rules` | Partially documented | `google.antigravity.rules` |
| `antigravity.repo.hooks` | Repository | `['.agents', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.repo.hooks` | Partially documented | `google.antigravity.hooks` |
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
| `antigravity.behavior.user.context` | global の developer context | `<user tier>/GEMINI.md` | `antigravity.context.layering` | `antigravity.global.context` が accept | `google.antigravity.cli-migration` |
| `antigravity.behavior.user.mcp` | global の MCP server | `<user tier>/config/mcp_config.json` | `antigravity.mcp.configuration` | `antigravity.global.mcp` が accept | `google.antigravity.cli-mcp` |
| `antigravity.behavior.user.agents` | global の custom agent、文書化された両方の形 | `<user tier>/config/agents/<name>.md`、`<user tier>/config/agents/<name>/agent.md` | `antigravity.agents.selection` | `antigravity.global.agent.file` と `antigravity.global.agent.directory` が accept | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.behavior.user.skills` | global の共有 skill | `<user tier>/antigravity-cli/skills/`、`<user tier>/config/skills/` | `antigravity.skills.selection` | `antigravity.global.skill.directory` と `antigravity.global.skill.file` が accept | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-migration`、`google.antigravity.skills` |
| `antigravity.behavior.user.settings` | user の preference | `<user tier>/antigravity-cli/settings.json` | — | `antigravity.global.settings` が accept | `google.antigravity.cli-settings`、`google.antigravity.cli-features` |
| `antigravity.behavior.user.permissions` | allow・ask・deny の一覧 | `<user tier>/antigravity-cli/settings.json` | `antigravity.permissions.precedence` | `antigravity.global.permissions` が accept | `google.antigravity.cli-permissions` |
| `antigravity.behavior.user.hooks` | hook 宣言 | `<user tier>/config/hooks.json`、`<user tier>/antigravity-cli/settings.json`、および plugin の `hooks.json` | `antigravity.hooks.merge` | standalone なファイルは `antigravity.global.hooks` が、settings の形は `antigravity.global.hooks.inline` が accept。plugin の形はその plugin とともに除外 | `google.antigravity.cli-plugins-skills`、`google.antigravity.hooks` |
| `antigravity.behavior.user.plugins` | インストール済み plugin コピー | `<user tier>/antigravity-cli/plugins/<name>/` と隣の `import_manifest.json` | — | `antigravity.excluded.plugins` が除外 | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |

## Inspector Global rule

base は consent 済みの Antigravity home boundary、すなわち capture された home ディレクトリ配下の
`.gemini` である。それを移動させる環境プロパティはないので、member の root はどの場合もその join
であり、origin は常に default home である。

その boundary の配下で、`config/` は vendor の共有設定ディレクトリ、`antigravity-cli/` は端末
自身のものであり、skill の rule はそれぞれの配下の `skills/` ディレクトリに届く。global の skill
ディレクトリを名指す2つのページは別々のものを名指すが、これは順位づけて解決する不一致ではない。
端末は両方を歩く (§ 既知の不確実性 項目 6)。editor 拡張自身の `antigravity/skills/` は対象外で
ある。これはこのリリースがサポートしない製品のものだからである (§ Surface boundary)。

| Rule ID | Base | Selector | Traversal | Class | Behavior refs | Status | Serves | Evidence |
|---|---|---|---|---|---|---|---|---|
| `antigravity.global.context` | consent 済み Antigravity home | `['GEMINI.md']` | `exact` | `static-candidate` | `antigravity.behavior.user.context` | Partially documented | global の context file | `google.antigravity.cli-migration` |
| `antigravity.global.mcp` | 同じ boundary | `['config', 'mcp_config.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.mcp` | Partially documented | global の MCP server | `google.antigravity.cli-mcp` |
| `antigravity.global.agent.file` | 同じ boundary | `['config', 'agents', /\.md$/u]` | `direct-child` | `static-candidate` | `antigravity.behavior.user.agents` | Documented | ファイル形の global custom agent | `google.antigravity.cli-subagents`、`google.antigravity.subagents` |
| `antigravity.global.agent.directory` | 同じ boundary | `['config', 'agents', ANY_NAME, 'agent.md']` | `exact`、name segment は1つ | `static-candidate` | `antigravity.behavior.user.agents` | Documented | フォルダ形の global custom agent | `google.antigravity.subagents` |
| `antigravity.global.skill.directory` | 同じ boundary | `['antigravity-cli', 'skills', ANY_NAME, 'SKILL.md']`、`['config', 'skills', ANY_NAME, 'SKILL.md']` | `exact`。行の単位はその program が名指す skill フォルダ | `static-candidate` | `antigravity.behavior.user.skills` | Partially documented | 文書化された両方の root にあるフォルダ形の global 共有 skill | `google.antigravity.skills`、`google.antigravity.cli-plugins-skills` |
| `antigravity.global.skill.file` | 同じ boundary | `['antigravity-cli', 'skills', /\.md$/u]` | `direct-child`。行の単位はファイル自身であり、ディレクトリを占めないので companion の census も publish しない | `static-candidate` | `antigravity.behavior.user.skills` | Conflict | 端末自身の root にあるフラット形の global 共有 skill | `google.antigravity.cli-plugins-skills`、`google.antigravity.skills` |
| `antigravity.global.settings` | 同じ boundary | `['antigravity-cli', 'settings.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.settings` | Documented | settings document | `google.antigravity.cli-settings` |
| `antigravity.global.permissions` | 同じ boundary | `['antigravity-cli', 'settings.json']` | 同じ selector に対する `exact`。carrier の permission の一覧がその `permissions` recognition | `static-candidate` | `antigravity.behavior.user.permissions` | Documented | user の permission policy | `google.antigravity.cli-permissions` |
| `antigravity.global.hooks` | 同じ boundary | `['config', 'hooks.json']` | `exact` | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | user tier の standalone な hook carrier | `google.antigravity.hooks` |
| `antigravity.global.hooks.inline` | 同じ boundary | `['antigravity-cli', 'settings.json']` | settings rule の selector に対する `exact`。carrier の hook 宣言がその `hook` recognition | `static-candidate` | `antigravity.behavior.user.hooks` | Partially documented | settings document が宣言する hook | `google.antigravity.cli-plugins-skills` |

## Relationship-only と excluded group

relationship-only な `ruleId` の定義は
[Runtime Composition](../runtime-composition.ja.md) にある。Antigravity CLI について、それらの
ルールは context file の import、skill が参照する script と resource、hook の command、agent の
`mcpServers` と tool の参照を cover する。それらは決して対象の読み取りを許可しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `antigravity.excluded.plugins` | `excluded` | user tier の `antigravity-cli/plugins/` 配下のインストール済み plugin コピー、それを追跡する `import_manifest.json`、およびその中の skill・agent・rules・MCP 定義・hook。インストール済みコピーは書かれたものではなく source から再現されたものであり、親仕様の FR-018 がどの vendor についても既に除外しているものである | `antigravity.behavior.user.plugins`、`antigravity.behavior.user.hooks` | FR-013、FR-014、FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |
| `antigravity.excluded.workspace-plugins` | `excluded` | workspace の plugin ディレクトリとその配下すべて。`.agents/plugins/` と、その隣の `_agents/plugins/` の綴り、およびその中の skill・rules・MCP 定義・hook。理由は上のインストール済みコピーの理由ではない。それはリポジトリで著述された plugin には届かない。理由は、どの端末のページも workspace の plugin ディレクトリを名指していないことである。vendor はそれをアプリと拡張のツリーに文書化しており、端末自身のページは plugin を `agy` が user tier へ配置する bundle としてのみ述べるので、端末が workspace からそれを読み込むことをここで引用したものは何も確立しない (§ Surface boundary) | `antigravity.behavior.user.plugins` | FR-003、FR-013、FR-018 | — | `documented` | `google.antigravity.cli-plugins-skills`、`google.antigravity.cli-features` |
| `antigravity.excluded.user-runtime` | `excluded` | どの Global rule も admit しない user tier の state。first-launch onboarding が保存する credential と keyring の材料、session と会話の履歴、cache、log。および vendor の desktop アプリと editor 拡張の専用ディレクトリ `antigravity/` と `antigravity-ide/`。このリリースはそれらを認識しない | `antigravity.behavior.user.home` | FR-013、FR-018、QR-003 | — | `documented` | `google.antigravity.cli-migration`、`google.antigravity.cli-settings` |

## Initial release の規範的 presentation allowlist

| Kind | Presentation source | Admitted occurrences |
|---|---|---|
| `instructions` | `frontmatter`<br>`body` | context file が frontmatter block を持つ場合はそれと、その body |
| `skill` | `frontmatter`<br>`body` | skill の frontmatter block とその指示。フラットなファイルでも skill フォルダの `SKILL.md` でも同じ。フラットなファイルの行の単位はファイルなので companion の census は publish せず、フォルダのものは他のディレクトリ形の skill と同じく publish する。`name` を宣言しない skill の行は、そのファイルを読むどの製品も使う同じ fallback であるフォルダ名で名付け、フォルダを持たないフラットなファイルは拡張子を除いた自身の名前で名付ける (§ 既知の不確実性 項目 7) |
| `rule` | `frontmatter`<br>`body` | workspace の rule の frontmatter block（宣言された activation を含む）とその下の制約。それぞれ書かれたとおりに示し、評価はしない |
| `agent` | `metadata`<br>`instructions` | custom agent の frontmatter block とその下の body |
| `MCP` | `runtime-reference` | carrier の `mcpServers` object の下で宣言された server 名と、各 server が宣言するすべての field。`serverUrl` と legacy の `url`・`httpUrl` を含む |
| `hook` | `runtime-reference` | standalone な `hooks.json` の下でも settings carrier の hook 宣言の下でも同じく、event map の key、matcher の値、handler の葉。この vendor の carrier は各 hook に名前を付け、その中に event を入れ子にするので、宣言は carrier が書いた名前と、carrier が書いていればその hook 自身の `enabled` キーも publish する。どちらもファイル自身のキーとしてであり、解釈はしない。hook が走るかどうかはこの製品が観測しない実行時の事柄なので、どの行も「無効」「停止中」とは述べず、読み手にはファイルが `enabled: false` と書いていることを示す |
| `permissions` | `runtime-reference` | settings carrier が宣言する `allow`・`ask`・`deny` の entry。書かれたとおり |
| `settings/config` | `runtime-reference`<br>`fallback` | admit された settings carrier 上の、サポートされる JSON の値・item・key の正確な出現。MCP 宣言は自身の carrier のものであり、permission と hook の宣言はそれぞれの recognition 行だけのものである |

## 既知の不確実性と必須 condition fact

1. migration のページは workspace の context file を作業ディレクトリの `GEMINI.md` と
   `AGENTS.md` として、global のものを `~/.gemini/GEMINI.md` として述べる。workspace root より
   下の深さも、2つの workspace の名前の間の precedence も、それらと global のファイルとの間の
   precedence も述べない。Inspector はリポジトリルートの2つだけを admit する。それより深くへ
   届かせるのは推論に立つからである。vendor が階層を文書化した時点で rule を広げる。
2. skill のページは両方のパスを述べ、global の skill がどの workspace でも使えると述べるが、
   workspace の skill と global の skill が1つの名前を宣言したときのことは述べない。Inspector は
   引用できない解決を述べない。
3. MCP のページは両方の設定パスを述べるが、同名の workspace server と global server がどう
   合成されるかは述べない。Inspector は各宣言をそれを宣言した carrier の下に挙げ、precedence を
   述べない。
4. plugins and skills のページは hook が plugin の `hooks.json` か settings ファイルに設定されると
   述べるが、settings ファイル側の schema は与えない。Inspector はそのファイルが hook object の
   下に宣言するものを、ファイル自身の順で publish し、何も分類しない。
5. user tier を移動させる環境プロパティを文書化するページは引用先にない。どのページもそれを
   文字どおり `~/.gemini` と書く。よって member の root はどの場合も home ディレクトリとの join で
   あり、capture はそのためのプロパティを読まない。
6. vendor 自身のページは workspace の skill の形について食い違っており、その食い違いは1対多で
   ある。端末の plugins and skills のページは `.agents/skills/` 直下のフラットな Markdown
   ファイルを示す。共有の Agent Skills ページは同じディレクトリが `SKILL.md` を持つ skill
   フォルダを抱えると示し、editor 拡張の skills ページ、2つの plugin ページ、この端末向けに
   書かれた Google の codelab も同じである。よって skill の2つの subject は
   `partially-documented` ではなく `conflict` とする。1つのディレクトリについて両立しない公式の
   主張であり、それがこの status の retain する対象である。

   実装は多数派と一致する。公式インストーラの `linux_amd64` manifest が名指す `agy` 1.2.0 の
   Linux x64 バイナリ（展開した実行ファイルの SHA-256 は
   `195bf11b249deebe67028305a9b7b1d19ac38e9ab281b786a163a7d2fc8ff428`）を静的解析したところ、
   端末自身の `GetSkills` から customization manager を経て共通の探索処理へ至る経路をたどれ、
   skill の customization 種別が file 種別ではなく subdirectory 種別だった。すなわち `skills/`
   直下の通常ファイルは名前を読む前に除外され、`GetSkillsCreatePath` は
   `{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。同じ解析で、global の探索は
   端末のアプリケーションデータディレクトリと設定ディレクトリの両方をルートに加えたうえで重複を
   除去することも分かった。2つのページの異なる global ディレクトリを順位づけずに両方 admit して
   いるのはそのためである（当該バイナリに対する観測であり、引用したどのページも確立していない。
   Codex contract の `plugin@marketplace` の綴りと同じ位置づけ）。

   それでもフラットな形は admit する。2つの誤りは対称でない。vendor 自身の指示に従った読み手は
   そのファイルを持っており、admit しなければその存在について何も示せない。admit すれば、vendor
   自身のページが支える recognition とともにそのファイルを挙げられる。解析の範囲は1つのプラット
   フォームの 1.2.0 ビルドの標準ディレクトリ設定なので、「そこで自動検出されない」は「決して
   読まれない」ではない。ページか後のビルドが決着させた時点でフラットな rule を落とす。

   1つの名前が両方の形で綴られたときに端末がどちらを採るかを述べるページはないので、precedence
   は publish せず、そうした名前は両方の定義を抱える1行になる。`.agent/` の後方互換は形ではなく
   ディレクトリについて述べられているので、旧綴りが admit するのはそのページがそこで示すものだけ
   である。すなわち `.agent/skills/<name>/SKILL.md` と `.agent/rules/<name>.md` である。
   `.agent/skills/<name>.md` は admit しない。その綴りでフラットな形を文書化するページが現れた
   時点で admit する。
7. 共有の Agent Skills ページは skill の `name` を任意とし、省略時はフォルダ名が既定だと述べる。
   上記のバイナリはそうしない。静的に読むと、`name` が無いか空の場合はファイル自身の名前から
   末尾の `.md` を除いたもので補われ、skill フォルダの `SKILL.md` では `SKILL` になる。
   Inspector はその行をフォルダ名で名付け、フォルダを持たないフラットな形はそのファイル名で
   名付ける。

   この観測には従わない。理由は同じバイナリの中にある。`GetSkillsCreatePath` は
   `{workspace}/.agents/skills/{skill_name}/SKILL.md` を組み立てる。つまり端末自身が
   フォルダを skill の名前の持ち手として扱っている。`SKILL` の fallback は、端末が作った
   名前無し skill をすべて互いに衝突させることになる。ページと、同じファイルを読む2製品と、
   その path builder はフォルダで一致しており、静的に読んだ fallback 1つだけが食い違う。
   これは文書化された規則ではなく1つのビルドの1つの関数の読み取りであり、著者が書いておらず
   そのファイルの他のどの読み手も使わない名前を publish する根拠としては足りない。publish
   すれば1つのファイルが2つの名前で2行に乗ることにもなり、vendor 側の事実ではなくこの製品の
   欠陥として読まれる。
8. 共有の Hooks ページは `hooks.json` の schema を正確に与えるが、その location は端末が述べる
   lookup ではなく例として —「あなたのカスタマイズディレクトリ（例: workspace の `.agents/` または
   `~/.gemini/config/`）」— 与える。このページはアプリだけでなく端末についてのページでもある。
   その transcript の field が、アプリの `~/.gemini/antigravity` と並べて
   `~/.gemini/antigravity-cli` を端末のアプリケーションデータディレクトリとして名指すからである。
   よって standalone な2つの carrier を admit し、どちらも partially documented として記録する。
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
10. 共有の Rules ページは rules ディレクトリ、4つの activation mode、12,000 文字の上限を与え、
   端末の migration ページは workspace の rule のサポートが維持されると述べる。どちらも2つの
   rule が合成される順序も、context file に対する precedence も述べないので、
   `antigravity.rules.activation` は `filter` だけを記録する。ページは workspace または git root
   を名指しており、それはこの製品が推論の基準にする選択済み root である。rules ディレクトリの中の
   深さも示していないので、rule はその直下の子だけを admit する。
