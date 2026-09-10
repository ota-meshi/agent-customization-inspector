# Vendor Contract: Gemini CLI

[English](gemini-cli.md)

**Contract version**: 2026-09-09
**Official-source review**: 2026-09-09

この contract は、文書化された Gemini CLI の lookup behavior と Inspector の read allowlist を
分離する。共通の matcher grammar と source-boundary のルールは
[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.ja.md)
で定義される。composition と precedence は
[Runtime Composition](../runtime-composition.ja.md)
で ID により定義され、evidence record は
[Official Sources](../official-sources.ja.md)
で定義される。
`behaviorId` は Gemini CLI を記述する。`ruleId` は Inspector の policy を記述する。vendor の
locator や behavior record が read authority を与えることは決してない。

## Surface boundary

Gemini CLI は1つの surface を持つ1つのプロダクトである: 直接起動されるか、同じ client を
駆動する IDE companion を通じて起動されるかにかかわらず、terminal client である。したがって
以下のすべての behavior は **CLI** と mark され、editor・hosted agent・cloud service を区別
する行はない。vendor はローカルのカスタマイズファイルを異なって読むものを何も文書化して
いないからである。異なるのは surface ではなく tier である: vendor は system tier（管理者が
所有するディレクトリ下の settings・defaults・policies）、user tier（home 下の `.gemini`
ディレクトリ）、project tier（プロジェクトルートの `.gemini` ディレクトリ）、extension tier
（home の `extensions/` ディレクトリ下のインストール済みコピー）を文書化する。Inspector は project tier を Repository Source として、user tier を Gemini CLI Global member として読む。
extension tier は記録され除外される。system tier は Source が届かないため、自身の behavior 行なしに除外される。

## Canonical evidence-assessment index

この contract が所有するすべての `behaviorId` と `ruleId` は自身の `documentationStatus` と
`lifecycleQualifiers` を述べる。下に列挙されない限り、canonical な値は
`documentationStatus: documented` と `lifecycleQualifiers: []` である。これは列挙されない
すべての subject に対する閉じた mapping であり、Evidence cell からの推論ではない。空の
qualifier は lifecycle の主張をせず、決して `stable` を意味しない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `gemini.behavior.repo.context` | `partially-documented` | `[]` | 階層のページは workspace ディレクトリ、その親、アクセスされたディレクトリとその祖先の just-in-time scan を名指しするが、親への walk の境界も、ツールがアクセスする前に descendant が読まれるかも述べない |
| `gemini.behavior.repo.commands` | `partially-documented` | `[]` | ページは命名規則を一般則として述べ、入れ子の例を1つ挙げる。パスが届く深さとセグメントの文字の sanitization は vendor の loader のもので、文書化ではなく計測である (§ 既知の不確実性と必須condition fact 項目 8) |
| `gemini.behavior.user.commands` | `partially-documented` | `[]` | project の行と同様: 同じ命名規則で、ページが loader に委ねる同じ2つの事実 |
| `gemini.behavior.repo.agents` | `documented` | `[experimental]` | ページは project の場所を正確に名指しする。subagent は `experimental` 設定で toggle される |
| `gemini.behavior.repo.policies` | `documented` | `[]` | ページは workspace tier が現在 non-functional だと述べる — 読まれない場所についての文書化された事実 |
| `gemini.behavior.user.agents` | `documented` | `[experimental]` | project の行と同様: user の場所は同じ experimental gate の下で正確に名指しされる |
| `gemini.derived.context-filename` | `partially-documented` | `[]` | ルールは context filename を任意の深さで admit し、just-in-time scan はアクセスされた任意のディレクトリでそれを支持する。ツールが触れていないファイルを vendor が読むかは確立していない。導出そのもの — 既定の代わりの設定名 — は文書化されている |
| `gemini.repo.agent` | `documented` | `[experimental]` | Inspector rule は文書化された experimental gate の下で文書化された直接の子を admit する |
| `gemini.global.agent` | `documented` | `[experimental]` | 同じ。user tier の下で |
| `gemini.agents.selection` | `unknown` | `[experimental]` | ページは両方の場所を名指しし、両方にある同名 agent について何も述べない |

固定の qualifier 順は `preview`、`experimental`、`deprecated` である。ここに2つ以上持つ行は
ない。これらは maintenance record であり、response はどれも運ばない (QR-005)。

## 文書化済みRepository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversal or activation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `gemini.behavior.repo.context` | CLI | 設定された workspace ディレクトリ、その親、ツールがアクセスするすべてのディレクトリ | `GEMINI.md`、または `context.fileName` が宣言する各名前 | 文書化された順 — global file、次に workspace ディレクトリとその親、次にアクセスされたディレクトリと trusted root までのその祖先からの just-in-time file — に読み込まれ、1つの context に concatenate される。`@file.md` import は vendor が解決し、ここでは書かれたテキストのまま | `gemini.context.layering` | Partially documented。親への walk の境界とアクセス前の descendant 読み取りは述べられていない | `google.gemini-cli.gemini-md` |
| `gemini.behavior.repo.settings` | CLI | プロジェクトルート | `.gemini/settings.json` | project settings 層。文書化された precedence で user settings の上、system settings の下。untrusted folder では無視 | `gemini.settings.precedence` | Documented。trust conditional | `google.gemini-cli.configuration`、`google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.mcp` | CLI | プロジェクトルート | `.gemini/settings.json` 内の `mcpServers` | server は `mcpServers` の下に名前で宣言され、必須の transport 1つ (`command`、`url`、または `httpUrl`) と任意の `args`、`env`、`cwd`、`headers`、`timeout`、`trust`、`includeTools`、`excludeTools` を持つ。`env` の `$VAR_NAME` は接続時に vendor が展開する。project の server は untrusted folder では接続しない | `gemini.mcp.configuration` | Documented。trust conditional | `google.gemini-cli.mcp-server`、`google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.hooks` | CLI | プロジェクトルート | `.gemini/settings.json` 内の `hooks` | 文書化された precedence で user・system・extension の層と merge される。各 event は hook definition を持ち、その `hooks[].command` は vendor が実行する shell command である。project の hook は fingerprint され、変わったものは新規として扱われる | `gemini.hooks.merge` | Documented。trust と fingerprint conditional | `google.gemini-cli.hooks`、`google.gemini-cli.hooks-reference` |
| `gemini.behavior.repo.commands` | CLI | プロジェクトルート | `.gemini/commands/**/*.toml` | command 名は `commands/` に対するファイルの相対パスで、区切りを `:` に変換し拡張子を除いたもの。深さは任意。各セグメントの `[A-Za-z0-9_.-]` 以外の UTF-16 code unit は `_` になり、50文字を超えるセグメントは47文字と `...` に切り詰められる — loader はそうし、ページは述べない。user command と同名の project command が常に使われる。untrusted folder では読み込まれない | `gemini.commands.selection` | Partially documented。trust conditional | `google.gemini-cli.custom-commands`、`google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.skills` | CLI | プロジェクトルート | `.gemini/skills/<name>/SKILL.md`。文書化された alias として `.agents/skills/<name>/SKILL.md` | workspace tier、4つの中で最上位。上の tier の同名 skill が勝ち、tier 内では `.agents/skills/` のコピーが `.gemini/skills/` に勝つ。untrusted folder では利用不可 | `gemini.skills.selection` | Documented。trust conditional | `google.gemini-cli.skills`、`google.gemini-cli.creating-skills`、`google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.agents` | CLI | プロジェクトルート | `.gemini/agents/*.md` | 必須の YAML frontmatter 付き Markdown。`name` は agent を呼び出す tool 名。`experimental.enableAgents` が false でなければ有効 | `gemini.agents.selection` | Documented。experimental | `google.gemini-cli.subagents` |
| `gemini.behavior.repo.policies` | CLI | プロジェクトルート | `.gemini/policies/*.toml` | policy engine の workspace tier。現在 non-functional と文書化: そこのファイルは効果を持たない | `gemini.policies.tiers` | 読み込まれないと文書化 | `google.gemini-cli.policy-engine` |
| `gemini.behavior.repo.trust` | CLI | プロジェクトルート | フォルダそのもの | untrusted folder は project settings、`.env`、project の MCP server、custom command、skill を読み込まず、自動 memory 読み込みを無効にする。決定は user tier の `trustedFolders.json` に記録される | すべての Repository strategy の condition | Documented | `google.gemini-cli.trusted-folders` |
| `gemini.behavior.repo.ignore` | CLI | プロジェクトルート | `.geminiignore` | `@` file reference など、これを尊重するツールから一致パスを除外する。model が読むカスタマイズではない | `gemini.excluded.repo-non-customizations` | Documented。excluded | `google.gemini-cli.gemini-ignore` |
| `gemini.behavior.repo.env` | CLI | 現在のディレクトリからプロジェクトルートまたは home へ上方向、次に `~/.env` | `.env`、および `.gemini/.env` | process に読み込まれる環境変数。model が読むカスタマイズでは決してなく、untrusted folder では無視 | `gemini.excluded.repo-non-customizations` | Documented。excluded | `google.gemini-cli.configuration`、`google.gemini-cli.trusted-folders` |

自身のルートに `gemini-extension.json` を持つリポジトリは、client がここで読むカスタマイズを
持っているのではなく、他者がインストールする extension を publish している: vendor は home の
`extensions/` ディレクトリからだけ extension を読み込み、開発中のコピーは `gemini extensions
link` が作る symbolic link を通じてだけそこに届く。したがって manifest とその隣の
`commands/`、`skills/`、`agents/`、`hooks/hooks.json`、`policies/`、context file はその
manifest からルールを得ない (`gemini.excluded.extensions`。spec.md § Clarifications)。

## Inspector Repository rule

この表のすべての base は正確な Inspector Repository boundary — 選択された Repository root で、
`Repository` と綴る。すべての `.gemini/` と `.agents/` の場所は選択された root 自身のディレクトリ
である: vendor はプロジェクトの `.gemini` ディレクトリをプロジェクトルートに文書化し、入れ子の
ものは文書化していないので、`packages/api/.gemini/` はどの深さでも near miss である。context
file はここに静的な行を持たない: それがどの filename を持つかは settings carrier の決定なので、
そのルールは下の派生ルールであり、静的な行の中で唯一の `descendant-inventory` 展開は command
ディレクトリのものである。下により狭い除外や Global の要件が述べられない限り、すべての行は
親仕様の policy reference FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 を持つ。

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `gemini.repo.settings` | Repository | `['.gemini', 'settings.json']` | Repository root での `exact`。settings document 自身の `settings/config` recognition。1回読まれる1つの candidate に対する3つのルールの1つ | `static-candidate` | `gemini.behavior.repo.settings` | Documented。trust conditional | `google.gemini-cli.configuration` |
| `gemini.repo.mcp` | Repository | `['.gemini', 'settings.json']` | `gemini.repo.settings` が書く selector に対する `exact`。carrier の `mcpServers` map がその `MCP` recognition であり、宣言された server 名ごとに1行 publish される | `static-candidate` | `gemini.behavior.repo.settings`、`gemini.behavior.repo.mcp` | Documented。trust conditional | `google.gemini-cli.mcp-server` |
| `gemini.repo.hooks` | Repository | `['.gemini', 'settings.json']` | 同じ selector に対する `exact`。carrier の `hooks` object がその `hook` recognition で、object が何を宣言していても matcher により admit される。`.claude/settings.json` のものとまったく同様 | `static-candidate` | `gemini.behavior.repo.settings`、`gemini.behavior.repo.hooks` | Documented。trust と fingerprint conditional | `google.gemini-cli.hooks` |
| `gemini.repo.command` | Repository | `['.gemini', 'commands', ANY_DIRECTORIES, /\.toml$/u]` | root の `.gemini/commands/` 下の `descendant-inventory`: ページは subdirectory を namespace として名指しするので、ファイルは任意の深さにあり、その行は `:` で結んだパスで名付けられる | `static-candidate` | `gemini.behavior.repo.commands` | Documented。trust conditional | `google.gemini-cli.custom-commands` |
| `gemini.repo.skill` | Repository | `['.gemini', 'skills', ANY_NAME, 'SKILL.md']`。`['.agents', 'skills', ANY_NAME, 'SKILL.md']` | 各 program について `exact` 次に `direct-child`、root に anchor。skill 名は直接の子1つ。2つ目の program は Codex と Copilot が admit する場所と同じなので、そこで admit されたファイルは3ツールの recognition を持つ | `static-candidate` | `gemini.behavior.repo.skills` | Documented。trust conditional | `google.gemini-cli.skills`、`google.gemini-cli.creating-skills` |
| `gemini.repo.agent` | Repository | `['.gemini', 'agents', /\.md$/u]` | root の `.gemini/agents/` の `direct-child`。ページは `.gemini/agents/*.md` を名指しし、入れ子の探索を文書化していない | `static-candidate` | `gemini.behavior.repo.agents` | Documented。experimental | `google.gemini-cli.subagents` |

settings carrier は1回読まれ3回認識される1つの candidate である — settings、MCP、hooks —
`.claude/settings.json` と `.codex/config.toml` が既に持つ配置である。その `mcpServers` と
`hooks` の宣言はそのファイル上の metadata であり、第2の candidate を作らない。server の `env`
や `headers` の `$VAR_NAME` は文字どおりのテキストである (FR-026)。carrier はコメント付き JSON
として読む: vendor 自身の settings loader は `JSON.parse` の前にコメントを剥がす
(google-gemini/gemini-cli の `packages/cli/src/config/settings.ts` で計測、2026-09-09 閲覧。
configuration reference 自体はコメントについて何も述べない)。`parsers/json.ts` の parser 表は
その計測を Copilot の entry の隣に記録する。vendor はコメントだけを剥がし、Inspector の lenient
な読みは trailing comma も blank にする。したがって trailing comma のあるファイルは、プロダクト
なら reject する行にその宣言を示す — より穏当な誤りで、Copilot の entry が既に受け入れている
のと同じ取引である。

## Derived Repository rule

`Status` は upstream の evidence についての人間可読な rationale である。上の canonical index が
ルールの正確な documentation status を所有する。

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `gemini.derived.context-filename` | `bounded-derived-candidate` | pin されたリポジトリの `.gemini/settings.json`。walk の前に configuration として読まれる — carrier 自身の候補性が seed される読み取りと同じもの。absent な carrier は何も設定しない普通の seed | context filename 群。それぞれ root と、その下の任意の深さで一致する1つの entry 名として (`[ANY_DIRECTORIES, <name>]`、文書化された just-in-time reach。root の上への親 walk は選択された root だけを寄与する、FR-001): `context.fileName` が宣言するときはその名前群 — 1つの文字列、または空でない文字列配列のすべての文字列 — 、そうでなければ既定の `GEMINI.md`。設定は読み込むファイル (群) を名指しするので、設定された名前は既定の隣ではなく既定の代わりに立つ。それが context file が自身の静的ルールを持たない理由である: 1つの導出が常に plan を出す。既定か設定か。absent・unreadable・unparsable な carrier、または空でない文字列でも空でない文字列の空でない配列でもない値は何も設定せず既定を出す。parse 失敗は settings recognition を通じた carrier 自身の diagnostic であり、型不正の値は diagnostic を持たない。user tier や system tier の `context.fileName` は Repository Source が読まない settings-inputs condition である | `gemini.behavior.repo.settings`、`gemini.behavior.repo.context` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `gemini.settings.precedence`、`gemini.context.layering` | `documented` | `google.gemini-cli.gemini-md`、`google.gemini-cli.configuration` |

これは `codex.derived.fallback-basename` が既に持つ配置であり、vendor 自身の意味論が課す1つの
違いがある: Codex は静的ルールが admit する固定の組に設定名を足すが、Gemini CLI の設定は
context file そのものを名指しするので、導出が既定も所有し、静的ルールは `GEMINI.md` を admit
しない。導出の隣に静的な `GEMINI.md` ルールがあれば、名前が設定されたときにそれを撤回する
第2の mechanism が要る。常に plan を出す1つの導出はそれを要しない。

## 文書化済みUser behavior

この表は maintainer のために Gemini CLI が何を支持するかを記録する。Global 調査を広げない。
user tier は home 下の `.gemini` ディレクトリである。`GEMINI_CLI_HOME` は `.gemini` が作られる
ディレクトリ — home の代わりであって `.gemini` そのものではない — を指し、それが member root が
どの場合でも join である理由である (specs/002-gemini-cli-support/spec.ja.md FR-011)。`~/.agents/skills/` alias は shared
agent home にあり、それは設定が relocate しない別個に consent されるメンバーである (親 FR-045)。

| Behavior ID | User behavior | User locator | Strategy / composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `gemini.behavior.user.home` | user 設定ディレクトリ | `<GEMINI_CLI_HOME または home>/.gemini/` | 下のすべての user tier locator はこれに対して解決する | Gemini CLI Global member root | `google.gemini-cli.configuration` |
| `gemini.behavior.user.context` | global context file | `<user tier>/GEMINI.md` | `gemini.context.layering`。workspace と just-in-time のファイルの前に最初に読み込まれる | 下の `gemini.global.instructions` を通じてだけ accept。user tier 自身の `context.fileName` は settings-inputs condition でここでは何も変えない (specs/002-gemini-cli-support/spec.ja.md § Clarifications) | `google.gemini-cli.gemini-md` |
| `gemini.behavior.user.settings` | user settings、MCP server、hooks | `<user tier>/settings.json` | `gemini.settings.precedence`、`gemini.mcp.configuration`、`gemini.hooks.merge` | 下の `gemini.global.settings`、`gemini.global.mcp`、`gemini.global.hooks` が accept | `google.gemini-cli.configuration`、`google.gemini-cli.mcp-server`、`google.gemini-cli.hooks` |
| `gemini.behavior.user.commands` | user custom command | `<user tier>/commands/**/*.toml` | `gemini.commands.selection`。同名の project command が常に代わりに使われる。project command と同じく sanitization を含めて名付けられる | 下の `gemini.global.command` が accept | `google.gemini-cli.custom-commands` |
| `gemini.behavior.user.skills` | user skill | `<user tier>/skills/<name>/SKILL.md`。文書化された alias として `$HOME/.agents/skills/<name>/SKILL.md` | `gemini.skills.selection`。user tier。workspace の下、extension skill の上。tier 内では alias が勝つ | 下の `gemini.global.skill` と、consent 済み shared agent home で `gemini.global.agents-home.skill` が accept (親 FR-045) | `google.gemini-cli.skills`、`google.gemini-cli.creating-skills` |
| `gemini.behavior.user.agents` | personal custom agent | `<user tier>/agents/*.md` | `gemini.agents.selection` | 下の `gemini.global.agent` が accept | `google.gemini-cli.subagents` |
| `gemini.behavior.user.policies` | user policy | `<user tier>/policies/*.toml` | `gemini.policies.tiers`。user tier。extension と default の policy の上、admin の下 | 下の `gemini.global.policies` が accept、`permissions` として認識 | `google.gemini-cli.policy-engine` |
| `gemini.behavior.user.extensions` | インストール済み extension | `<user tier>/extensions/<name>/`。それぞれ `gemini-extension.json` と同梱 component を持ち、link された開発ディレクトリは symbolic link としてそこに現れる | すべての extension は起動時に読み込まれ、設定が merge される | `gemini.excluded.extensions` | `google.gemini-cli.extensions-reference` |
| `gemini.behavior.user.trust-record` | trusted-folder の決定 | `<user tier>/trustedFolders.json`。`GEMINI_CLI_TRUSTED_FOLDERS_PATH` で relocate 可能 | すべての Repository trust condition が読む記録 | `gemini.excluded.user-runtime` | `google.gemini-cli.trusted-folders` |
| `gemini.behavior.user.env` | user environment file | `<user tier>/.env`、および `~/.env` | process に読み込まれる環境変数 | `gemini.excluded.user-runtime` | `google.gemini-cli.configuration` |


## Inspector Global rule

Global 調査はセッション開始時に無効である。親仕様の FR-013 から FR-018 と FR-045 が要求する
正確な consent flow の後、Gemini CLI はこれらのルールだけを読める — consent 済み Gemini CLI
member root の下の行と、consent 済み shared agent home の下の1行:

| Rule ID | Boundary base | Selector program and selection | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `gemini.global.instructions` | 正確な consent 済み capture 済み `GEMINI_CLI_HOME` と `.gemini` の `node:path.join`。設定が absent のときだけ、session-start の import 済み `node:os.homedir()` capture と `.gemini` の join | `['GEMINI.md']` | boundary での `exact` | `static-candidate` | `gemini.behavior.user.context` | FR-013、FR-014、FR-018、QR-005 (親)。FR-010、FR-011 (この機能) | 文書化された global context file。既定名だけ | `google.gemini-cli.gemini-md` |
| `gemini.global.settings` | 同じ consent 済み Gemini CLI boundary | `['settings.json']` | boundary での `exact`。user settings document 自身の recognition。1回読まれる1ファイルに対する3ルールの1つ | `static-candidate` | `gemini.behavior.user.settings` | 上と同じ | user settings 層 | `google.gemini-cli.configuration` |
| `gemini.global.mcp` | 同じ consent 済み Gemini CLI boundary | `['settings.json']` | `gemini.global.settings` が書く selector に対する `exact`。carrier の `mcpServers` recognition | `static-candidate` | `gemini.behavior.user.settings` | 上と同じ | 宣言された server 名ごとに1つの MCP 行 | `google.gemini-cli.mcp-server` |
| `gemini.global.hooks` | 同じ consent 済み Gemini CLI boundary | `['settings.json']` | 同じ selector に対する `exact`。carrier の `hooks` recognition | `static-candidate` | `gemini.behavior.user.settings` | 上と同じ | user hooks 層 | `google.gemini-cli.hooks` |
| `gemini.global.command` | 同じ consent 済み Gemini CLI boundary | `['commands', ANY_DIRECTORIES, /\.toml$/u]` | boundary の `commands/` 下の `descendant-inventory`。行は `:` で結んだパスで名付けられる | `static-candidate` | `gemini.behavior.user.commands` | 上と同じ | user command。同名の project command が runtime で置き換える | `google.gemini-cli.custom-commands` |
| `gemini.global.skill` | 同じ consent 済み Gemini CLI boundary | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` 次に `exact`。skill 名は正確に直接の子1つ | `static-candidate` | `gemini.behavior.user.skills` | 上と同じ | user skill tier 自身のディレクトリ | `google.gemini-cli.skills` |
| `gemini.global.agent` | 同じ consent 済み Gemini CLI boundary | `['agents', /\.md$/u]` | boundary の `agents/` の `direct-child`。ページは `~/.gemini/agents/*.md` を名指しし、入れ子の探索を文書化していない | `static-candidate` | `gemini.behavior.user.agents` | 上と同じ | personal agent。experimental gate の下 | `google.gemini-cli.subagents` |
| `gemini.global.policies` | 同じ consent 済み Gemini CLI boundary | `['policies', /\.toml$/u]` | boundary の `policies/` の `direct-child`。`permissions` として認識。policy はどの tool call を allow・deny・確認するかを決めるからで、Codex の `rules/*.rules` ファイルが共有する subject である | `static-candidate` | `gemini.behavior.user.policies` | 上と同じ | user policy tier。vendor は読み込まれると文書化 — workspace tier とは異なる | `google.gemini-cli.policy-engine` |
| `gemini.global.agents-home.skill` | consent 済み shared agent home: session-start の import 済み `node:os.homedir()` capture と `.agents` の `node:path.join`。文書化された設定はそれを relocate しない (親 FR-045) | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child` 次に `exact`。skill 名は正確に直接の子1つ | `static-candidate` | `gemini.behavior.user.skills` | FR-013、FR-014、FR-018、FR-045、QR-005 (親)。FR-012 (この機能) | 文書化された `~/.agents/skills/` alias。Codex と Copilot が同じパスを文書化するので、admit されたファイルは3ツールの recognition を持つ | `google.gemini-cli.skills` |

present で空か相対の `GEMINI_CLI_HOME`、または存在しないか読める directory でない root は
黙って fallback しない。メンバーは absent か failed として記録される (親 FR-014)。設定文字列は
join の前に閉じた lexical-state アルゴリズムで分類されるので、`eligible` な値だけが `.gemini`
と join される。インストール済み extension のコピー、trusted-folder の記録、environment file、
OAuth と account の credential、session と history の state、一時ファイルは同じディレクトリの
下にあっても除外されたままである。

## Relationship-onlyとexcluded group

relationship-only な `ruleId` の定義は
[Runtime Composition](../runtime-composition.ja.md)
にある。Gemini CLI について、それらのルールは context file の `@file.md` import、custom
command の `!{...}` shell block と `@{...}` file injection、skill の resource path、hook の
`command`、agent の `mcpServers` と `tools` 参照を cover する。それらは決して対象の読み取りを
許可しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `gemini.excluded.repo-non-customizations` | `excluded` | `.gemini/policies/*.toml` (workspace policy tier。読み込まれないと文書化)、`.geminiignore` (ignore file。カスタマイズではなく、何を挙げるかを決めるために読まれない)、`.env` と `.gemini/.env` (credential)、`.gemini/hooks/` 下のスクリプト (hook 宣言が名指しする対象であって宣言ではない) | `gemini.behavior.repo.policies`、`gemini.behavior.repo.ignore`、`gemini.behavior.repo.env`、`gemini.behavior.repo.hooks` | FR-003、FR-004、FR-024、QR-001、QR-004、QR-005 (親)。FR-003 (この機能) | `gemini.policies.tiers` | `documented` | `google.gemini-cli.policy-engine`、`google.gemini-cli.gemini-ignore`、`google.gemini-cli.configuration`、`google.gemini-cli.hooks` |
| `gemini.excluded.extensions` | `excluded` | user tier の `extensions/` 下のインストール済み extension コピー、およびリポジトリルートの `gemini-extension.json` とその隣の component ディレクトリ: インストール済みコピーは書かれたものではなく配布元から再現され、リポジトリルートの manifest を vendor が読むのはそのようなコピーを通じてだけである | `gemini.behavior.user.extensions` | FR-013、FR-014、FR-018、QR-001、QR-004、QR-005 (親)。FR-016 (この機能) | — | `documented` | `google.gemini-cli.extensions-reference` |
| `gemini.excluded.user-runtime` | `excluded` | どの Global rule も admit しない上の user surface: trusted-folder の記録、environment file、OAuth と account の credential、session と history の state、一時ファイル。およびすべての Source の外の管理者所有ディレクトリ下の system settings・system defaults・admin policies。これらは Source が届かないので behavior 行を持たない — Codex の user-runtime 除外が managed・system 設定について持つ配置と同じ | `gemini.behavior.user.trust-record`、`gemini.behavior.user.env` | FR-013、FR-014、FR-018、QR-001、QR-004、QR-005 (親)。FR-010 (この機能) | — | `documented` | `google.gemini-cli.trusted-folders`、`google.gemini-cli.configuration` |


## Initial releaseの規範的presentation allowlist

この表は Gemini CLI についての閉じた FR-007 presentation allowlist である。kind の綴りは正確な
`ToolRecognition.kind` の値である。既存の3 vendor と同様に、release は読んだ source の隣に
宣言された metadata を publish しない。表は eligible な relationship kind と admit される source
form だけを固定し、実装開始後は official-source contract に記録された2つの digest で凍結される。

| `ToolRecognition.kind` | Eligible `Relationship.kind` values | Initial-release source forms |
|---|---|---|
| `instructions` | `import` | accept された `GEMINI.md`、設定された context filename、または Global context file。`@file.md` import は記録される relationship で対象は決して開かれず、他のすべての reference 風 token は source text である |
| `skill` | `skill-resource`<br>`runtime-reference` | accept された `SKILL.md` の正確な `name` と `description` の frontmatter 値。resource/script/reference の対象は relationship になりうるが、その edge を通じて読まれることはない |
| `agent` | `agent-reference`<br>`runtime-reference` | accept された `.gemini/agents/*.md` または consent 済み user の `agents/*.md` の正確な supported YAML frontmatter value/item occurrence。`mcpServers` と `tools` は reference のままで、agent 所有の MCP recognition には決してならない |
| `prompt/command` | `runtime-reference` | accept された `commands/**/*.toml` の正確な `prompt` と `description` の TOML 値。prompt 内の `!{...}` と `@{...}` の occurrence は reference で、決して実行も開かれもしない。`:` で結んだ呼び出し名は typed provenance であり宣言された metadata ではない |
| `hook` | `runtime-reference` | admit された settings carrier の `hooks` object 下の event map key、matcher 値、`hooks[]` leaf |
| `MCP` | `runtime-reference` | admit された settings carrier の `mcpServers` 下の server 名と正確な supported leaf/item occurrence。process environment の値は代入されない |
| `settings/config` | `runtime-reference`<br>`fallback` | admit された settings carrier 上の正確な supported JSON value/item/key occurrence。MCP と hook の宣言はそれぞれ別の recognition 行だけに属し、`context.fileName` は閉じた context-filename 導出だけを seed する |
| `permissions` | `runtime-reference` | accept された consent 済み user の `policies/*.toml` の正確な `[[rule]]` value/item occurrence。`commandPrefix`、`commandRegex`、`argsPattern` は書かれたテキストで、決して評価されない |

Gemini CLI の recognition は共有の `output style`、`rule`、`plugin`、`skill metadata` の kind を
使わない: vendor は output style や rule file を文書化していない。extension は plugin として
publish するのではなく除外する (§ Relationship-only and excluded groups)。skill の companion は
すべてのプロダクトと同様にその census である。

## 既知の不確実性と必須condition fact

1. context 階層のページは workspace ディレクトリ、その親、アクセスされたディレクトリとその
   祖先の just-in-time scan を名指しするが、親への walk の境界を言葉で述べず
   (`context.memoryBoundaryMarkers` 設定の既定は `.git`)、ツールがそのディレクトリに触れる前に
   descendant の `GEMINI.md` が読まれるかも述べない。派生ルールは context filename を任意の
   深さで admit する。セッションが特定のファイルを読み込んだかは runtime の事実のまま。
2. `context.fileName` は読み込む context file (群) の名前として文書化されている。それが global の
   `~/.gemini/GEMINI.md` も改名するかは述べられていない。Global rule は既定名だけを admit する
   (specs/002-gemini-cli-support/spec.ja.md § Clarifications)。
3. project settings、MCP server、hooks、command、skill は trusted folder でだけ読み込まれる。
   inventory に存在することは読み込みの証明ではない。
4. workspace policy tier は現在 non-functional と文書化されている。除外はその一文に依り、
   ページが変われば再導出する。
5. project level と user level の同名 agent には文書化された解決がない。`gemini.agents.selection`
   は `unknown` であり、どの行も勝者を述べない (親 FR-009)。
6. settings reference は `settings.json` がコメントを受け付けるか述べない。vendor の loader は
   受け付けるが、それは文書ではなく source の計測である。parser 表はそれをそのように記録する。
7. subagent は既定で on の `experimental` 設定で gate される。行は `experimental` qualifier を
   持ち、それ以外は何も従わない。
8. custom-commands のページは命名規則を一般則として述べ — commands ディレクトリに対する相対
   パス、subdirectory は namespace、区切りは colon — 入れ子の例を1つ挙げる。深さの上限は述べず、
   colon が曖昧にするセグメントの文字がどうなるかも述べない。vendor の loader
   (`packages/cli/src/services/FileCommandLoader.ts`、2026-09-10 に計測) は `**/*.toml` を列挙し、
   各セグメントの `[A-Za-z0-9_.-]` 以外の UTF-16 code unit を `_` に置き換え — その regex は `u`
   flag を持たないので、基本多言語面の外の文字は `__` になる — 50文字を超えるセグメントを先頭
   47文字と `...` に切り詰める。command unit は行がプロダクトの呼び出す名前を持つよう3つとも合わせる。
   深さは文書化された規則の延長であり、他の2つは文書化ではなく source の計測である。それが2つの
   command behavior を `partially-documented` とする理由である。
9. hooks の reference ページは `hooks` object を event 名をキーとするものとして述べる。vendor の
   hook registry (`packages/core/src/hooks/types.ts` の `HOOKS_CONFIG_FIELDS`、2026-09-10 に計測)
   は event 名を読む前にその object の3つのキー — `enabled`、`disabled`、`notifications`。うち
   `disabled` は hook 名の list — を skip し、引用したどの節もこれを述べない。hook unit はそのような
   キーの list を写さない。`disabled` の list は、どちらの carrier でも共有の構造的な読みにより行に
   なる。このプロダクトが示すのはファイル自身の宣言であり (FR-025、FR-026)、disabled の list を
   書いた reader にはそれが黙って落とされるのではなく述べられる必要があるから、そして vendor から
   取った key list は、どのページも文書化しない source に合わせて保ち続ける分類になるからである。
   record は `documented` のままである。unit はページが述べないものに依存しない。
