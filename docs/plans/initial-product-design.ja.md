# Agent Customization Inspector — 初期プロダクト設計

[English](initial-product-design.md)

- ステータス: 提案段階。実装承認はまだ得られていない
- 調査日: 2026-07-14
- スコープ: 初期アーキテクチャおよびMVP計画のみ
- 重要: 本文書はプロダクト実装を承認するものではない

## 1. リポジトリの現状

- mainブランチはb93ee32（Initial commit）でorigin/mainと一致している。
- 追跡対象ファイルは.gitignore、LICENSE、README.md、package.jsonである。
- 既存のステージ済み変更:
  - README.md: タイトルの変更と空行
  - package.json: 新規追加
- この計画の作成時点では、ステージされていないファイルや未追跡ファイルは存在しなかった。
- その後のドキュメント作業で、未追跡のAGENTS.md、AGENTS.ja.md、README.ja.md、および英語版・日本語版の計画書を追加した。既存のステージ済みREADME.mdとpackage.jsonはステージ済みのままであり、この作業では変更していない。
- package.jsonには現在、type: module、main: dist/index.mjs、および必ず失敗するプレースホルダーのtestスクリプトがある。
- bin、exports、types、engines、files、dependencies、lockfile、ソース、テスト、ビルド設定、lint設定、formatter設定、CIはまだ存在しない。
- READMEには現在、タイトルとパッケージの説明だけが記載されている。
- 既存のライセンスはMITである。
- 2026-07-14時点で、npm view agent-customization-inspectorはE404を返した。これはパッケージが現在公開されていないことを示唆するが、パッケージ名を予約するものではない。

## 2. プロダクトの理解

Agent Customization Inspectorは、AIコーディングエージェントが使用するカスタマイズ成果物を対象とする読み取り専用ビューアーである。信頼できないファイルを、その指示を実行または評価することなく検出、表示、比較する。

基本原則:

- ユーザーが選択したリポジトリルートを、独立したRepository sourceとして常にスキャンする。
- ローカルのuser-global調査は既定で無効にする。明示的にopt-inされた場合だけ、独立したGlobal sourceとしてスキャンする。
- Globalは、現在のOSユーザーに対して複数リポジトリ横断で適用されるローカルファイルと定義する。Managed、system、organization、remote、hosted構成は別scopeであり、MVPのGlobalスイッチには含めない。
- Globalでは、文書化されallowlistに含まれる候補だけを解決する。ユーザーのホームディレクトリ全体をwalkしてはならない。
- 調査対象のすべてのファイルを信頼できない入力として扱う。
- ファイルを検出し、メタデータ、秘匿化済みの生テキスト、診断情報を表示し、テキストdiffを生成する。
- 見つけやすさと視覚的階層をproduct requirementとして扱う。ユーザーが事前にドキュメントを読まなくても、source overviewから絞り込んだartifact、detail、diagnostic、comparisonへ移動できるようにする。
- validator、linter、semantic analyzer、synchronizer、converter、formatter、auto-fixerとして動作しない。
- skill、command、hook、plugin、workflow、extensionを実行しない。
- MCPサーバーを起動せず、接続もしない。
- 部分的にparseできた成果物や不正な形式の成果物も、スキャンを中断せず保持する。
- 文書化されたスコープと優先順位のヒントは表示するが、必要なランタイムコンテキストなしに候補が実際に有効であるとは主張しない。
- RepositoryとGlobalのartifact、件数、diagnostic、snapshot、limitを分離する。実効設定であると主張する形でflattenしたり暗黙にmergeしたりしない。

Global sourceはRepository境界の拡張ではない。有効化すると個別に上限制約を持つtool-home rootが追加されるが、選択したrepository root、artifact ID、Repository結果は変化しない。

1つの物理ファイルが、複数のツールによって認識される場合がある:

- AGENTS.mdはOpenAI CodexとGitHub Copilotの両方に認識され得る。
- CLAUDE.mdはClaude CodeとGitHub Copilotの両方に認識され得る。
- 一部のSKILL.md配置場所は複数のツールに認識され得る。

したがって、モデルは物理ドキュメントとツール固有の解釈を分離しなければならない。

## 3. 公式仕様の調査

調査は2026-07-14時点で入手可能な公式ドキュメントに基づいている。すべての組み込みadapterには、参照元URLと仕様を確認した日付を記録する必要がある。本文書におけるGlobalはローカルのuser-level構成を意味し、managed、system、remote、organization、hosted sourceはこの呼称に含めない。

### 3.1 GitHub Copilot

代表的なリポジトリローカル形式:

| 機能 | リポジトリローカル形式 | フォーマットとスコープ |
|---|---|---|
| リポジトリ指示 | .github/copilot-instructions.md | プレーンMarkdown、リポジトリ全体 |
| パス固有の指示 | .github/instructions/**/*.instructions.md | YAML frontmatter付きMarkdown、applyToは必須、excludeAgentは任意 |
| エージェント指示 | AGENTS.md、ルートのCLAUDE.md、ルートのGEMINI.md | Markdown、挙動はCopilotのsurfaceに依存 |
| カスタムエージェント | .github/agentsファイル | YAML frontmatterとMarkdown |
| Skill | .github/skills、.agents/skills、.claude/skills配下のSKILL.md | YAML frontmatterとMarkdown、scriptとresourceを含められる |
| Promptとcommand | .github/promptsファイル、Copilot CLIは.claude/commandsも認識 | surfaceに依存 |
| Hook | .github/hooksのJSONとsettingsのhook | commandとHTTP handlerを定義し得る |
| MCP | .mcp.json、.github/mcp.json、またはinline agent設定 | command、environment値、URL、headerを含み得る |
| Settingsとplugin | .github/copilot/settingsファイルとplugin metadata | JSONまたはJSONC |

Copilot CLIのローカルユーザー構成rootは、COPILOT_HOMEが設定されている場合はその値、未設定の場合は$HOME/.copilotである。User-global instructionsには、そのroot配下のcopilot-instructions.mdとinstructions/**/*.instructions.mdが含まれる。同じrootにはagent、skill、hook、settings、MCP定義、credential、log、runtime stateも存在し得るため、Inspectorはディレクトリを再帰scanせず、正確なcandidate allowlistを使用しなければならない。

COPILOT_CUSTOM_INSTRUCTIONS_DIRSとCOPILOT_SKILLS_DIRSは、任意の追加ディレクトリを指し得る。これらには将来、別の同意とboundary設計が必要であり、MVPのGlobalスイッチには含めない。GitHub.comのpersonal instruction、organization構成、remoteのskillやagent、MDM policyは、ローカルuser-global fileではない。

リポジトリ全体の指示と、条件に一致するすべてのパス固有の指示は、どちらも適用され得る。個人、リポジトリ、organizationの指示も重複し得る。正確にサポートされる形式は、GitHub.com、Copilot CLI、VS Code、その他のIDEによって異なる。

重要な不確実性:

- Copilot CLIは、競合する指示に対する一般的な意味上の勝者を定義していない。
- 公式ページ間で、カスタムエージェントにおけるユーザー設定とリポジトリ設定の優先順位について説明が一致していない。
- 一部のprompt metadata、hookの順序、同一レベルのMCPにおけるtie-break動作は文書化されていない。
- Settings、MCP、hook、agent profileにはリテラルのsecretが含まれる可能性がある。

公式リファレンス:

- https://docs.github.com/en/copilot/reference/customization-cheat-sheet
- https://docs.github.com/en/copilot/reference/custom-instructions-support
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills
- https://docs.github.com/en/copilot/reference/custom-agents-configuration
- https://docs.github.com/en/copilot/reference/hooks-reference
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference
- https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference

### 3.2 Claude Code

代表的なリポジトリローカル形式:

| 機能 | リポジトリローカル形式 | フォーマットとスコープ |
|---|---|---|
| 指示 | CLAUDE.md、.claude/CLAUDE.md、CLAUDE.local.md、ネストされたCLAUDE.md | プレーンMarkdown、複数ファイルを連結 |
| Rule | .claude/rules/**/*.md | Markdown、任意のpaths YAML frontmatter |
| Skill | .claude/skills/name/SKILL.md | YAML frontmatterとMarkdown、補助scriptとresourceを許可 |
| Legacy command | .claude/commands/*.md | Skill互換、新規作業にはskillを推奨 |
| Subagent | .claude/agents/**/*.md | YAML frontmatterとMarkdownのsystem prompt |
| Settings | .claude/settings.jsonと.claude/settings.local.json | JSON、permission、hook、plugin、environment設定 |
| Hook | Settings、skillまたはagentのfrontmatter、もしくはplugin | Command、HTTP、MCP、prompt、agent handler |
| MCP | ルートの.mcp.json | mcpServersを含むJSON |
| Output styleとplugin | .claude/output-stylesと.claude-plugin/plugin.json | MarkdownまたはJSON |

Claude Codeは、CLAUDE_CONFIG_DIRが設定されている場合はその配下、未設定の場合は$HOME/.claude配下にuser-global構成を保存する。User-global instruction fileは、そのディレクトリ内のCLAUDE.mdである。同じディレクトリにはrule、settings、skill、command、agent、output style、plugin、history、runtime stateも存在し得る。

別ファイルの$HOME/.claude.jsonには、user MCP定義のほか、OAuth data、trust decision、project別state、cacheが混在し得る。MVPではraw viewの候補にしない。Managed settingsとmanaged CLAUDE.mdは、organizationまたはmachineの別scopeであり、Globalスイッチには含めない。

作業ディレクトリより上にあるCLAUDE.mdファイルは、広いスコープからより限定的なスコープの順に連結される。同じ階層では、CLAUDE.local.mdがCLAUDE.mdに続く。作業ディレクトリより下のファイルは、必要に応じて読み込まれる場合がある。競合する自然言語の指示には、決定論的な意味上の勝者は存在しない。

CLAUDE.mdのimportは相対パスまたは絶対パスを参照でき、最大4 hopまで再帰できる。Inspectorはimport関係を表示するが、自動展開はしない。Artifactの起点となるRepositoryまたはGlobal source boundary外への参照はdiagnosticとなる。

Claude CodeはAGENTS.mdを直接読み取らない。CLAUDE.mdのimportまたはサポートされる関係によって関連性が確立された場合にのみ、Claudeとしての解釈を追加するべきである。

重要な不確実性と境界:

- 実効設定は、作業ディレクトリ、ランタイムバージョン、trust、CLI flag、environmentに依存する。
- .claude/hooksのscriptは、そのパスに存在するだけでは自動的にhookにならず、設定から参照されなければならない。
- 単独の.claude/promptsディレクトリは、Claude Codeの公式形式ではない。
- 第4章に記載したoptional user-global CLAUDE.md candidateだけをMVPのGlobal boundary内に含める。その他のuser-global .claude fileと.claude.jsonは引き続き境界外とする。

公式リファレンス:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/claude-directory
- https://code.claude.com/docs/en/env-vars

### 3.3 OpenAI Codex

代表的なリポジトリローカル形式:

| 機能 | リポジトリローカル形式 | フォーマットとスコープ |
|---|---|---|
| 指示 | AGENTS.mdとAGENTS.override.md | Markdown、プロジェクトルートから作業ディレクトリまで |
| Skill | .agents/skills/name/SKILL.md | YAML frontmatterとMarkdown |
| カスタムエージェント | .codex/agents/*.toml | TOML |
| 設定 | .codex/config.toml | TOML、trusted project layer |
| Hook | .codex/hooks.jsonまたはconfig.toml内のhook | JSONまたはTOML、一致するsourceはmergeされる |
| MCP | .codex/config.toml内のmcp_servers table | TOML、command、environment値、URL、headerを含み得る |
| Rule | .codex/rules/*.rules | Starlark、experimental |
| Plugin | .codex-plugin/plugin.jsonとmarketplace metadata | Skill、MCP、hook、applicationをbundleし得る |
| Custom prompt | Codex home配下のユーザーレベルprompt | 非推奨、リポジトリローカルではない |

Codexは、既定で$HOME/.codexとなるCODEX_HOMEをローカルユーザー構成とstateに使用する。Global instruction levelでは、空でないAGENTS.override.mdがあればそれを読み、なければAGENTS.mdを読む。同じrootにはconfig.toml、hooks.json、rule、authentication、log、session、その他のstateも存在し得る。User skillは別の$HOME/.agents/skills配下にある。

MVPのGlobalスイッチは、文書化されたfallback ruleによって選択されたGlobal AGENTS候補だけを調査する。Codex home全体、user credentialやsession、$HOME/.agents/skills、system構成、managed policy、plugin、memoryはスキャンしない。

AGENTS.mdのdiscoveryはディレクトリに依存する。各階層では、対象となる空でないoverrideが通常ファイルの代わりに選択される。Overrideがなければ通常ファイルと設定済みfallback名を確認し、1ディレクトリにつき最大1ファイルを含める。選択されたファイルはGlobal level、続いてproject rootから現在のworking directoryへ向かう順で結合される。

プロジェクトの.codex設定は、trusted projectの場合にのみ読み込まれる。Inspectorはユーザーの現在のtrust判断や起動ディレクトリを把握できないため、有効状態を断定せず候補スコープとして表示しなければならない。

公式リファレンス:

- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://learn.chatgpt.com/docs/config-file/config-basic
- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://learn.chatgpt.com/docs/hooks
- https://learn.chatgpt.com/docs/extend/mcp
- https://learn.chatgpt.com/docs/agent-configuration/rules
- https://learn.chatgpt.com/docs/build-plugins
- https://learn.chatgpt.com/docs/config-file/environment-variables

## 4. 初期サポート形式

| Source layer | ツール | MVP形式 | 種別とフォーマット | メタデータ |
|---|---|---|---|---|
| Repository | GitHub Copilot | .github/copilot-instructions.md | instruction、Markdown | リポジトリスコープとサポート対象surface |
| Repository | GitHub Copilot | .github/instructions/**/*.instructions.md | instruction、YAML付きMarkdown | applyTo、excludeAgent、未知のfrontmatter key |
| Repository | Claude Code | CLAUDE.md、.claude/CLAUDE.md、ネストされたCLAUDE.md | instruction、Markdown | directory、startupまたはon-demandのヒント、未解決のimport |
| Repository | OpenAI Codex | AGENTS.md、低コストで追加できるAGENTS.override.md | instruction、Markdown | directory scope、variant、precedence hint |
| Global | GitHub Copilot CLI | 解決済みCopilot home配下のcopilot-instructions.mdとinstructions/**/*.instructions.md | instruction、MarkdownまたはYAML付きMarkdown | user scope、origin、applyTo、対応surface |
| Global | Claude Code | 解決済みClaude構成ディレクトリ配下のCLAUDE.md | instruction、Markdown | user scope、load-order hint、未解決のimport |
| Global | OpenAI Codex | 解決済みCodex home配下の空でないAGENTS.override.md、なければAGENTS.md | instruction、Markdown | user scope、選択されたvariant、load-order hint |

Repositoryは常に有効とする。Globalは既定で無効であり、上記のuser-level instruction候補だけを追加する。GlobalスイッチがONの場合でも、Global settings、hook、MCP、skill、agent、plugin、credential、history、managed構成、hosted構成は延期対象のままとする。

M2では、サポート対象となるルートのCLAUDE.mdおよびAGENTS.mdファイルにCopilotとしての解釈も追加する必要がある。これにより、物理ドキュメントと解釈のmany-to-manyモデルを検証できる。

推奨実装順序:

1. RepositoryとGlobalのsource分離、default-off state、test専用locator
2. GitHub CopilotのRepositoryおよびGlobal instruction
3. Claude CodeのRepositoryおよびGlobal instruction
4. OpenAI CodexのRepositoryおよびGlobal instruction
5. Copilotのパス固有指示と不正なfrontmatterの処理

3つすべてのツールが初期instruction形式について両方のsource layerをサポートするまで、プロダクトはリリース可能な状態ではない。

## 5. 推奨デフォルト

### RepositoryとGlobal sourceの方針

- Repositoryは常に有効であり、既定の起動時に読み取る唯一のsourceとする。
- CLI flagの--include-globalは、そのprocessにおけるGlobalの初期stateを設定する。公開Node APIではincludeGlobal: falseを既定値とする。
- Web UIにはInclude user-global configurationスイッチを設ける。この状態は永続化しないため、CLI flagがない限り、新しいprocessでは毎回Globalが無効な状態から始まる。
- Globalが無効な場合、実装はtool homeやuser homeの候補をresolve、stat、list、readしてはならない。
- Globalを有効にすると、組み込みの正確な候補をfreshかつ個別の上限制約付きでscanする。BrowserやHTTP APIから任意のrootを受け取らない。
- RepositoryとGlobalには、別々のtabまたはlane、badge、件数、diagnostic、snapshot revisionを用意する。Globalの変更時もRepositoryの結果と選択状態を維持する。
- RepositoryとGlobalのdiffはGlobalが有効な間だけ許可し、両側にsource-scope labelを付け、秘匿化済みcontentを使用する。Merge済みのeffective textは生成しない。
- Globalを無効にすると、進行中のGlobal scanをcancelし、Global artifact、diagnostic、selection、Global関連のdiff cache entryを削除し、Global display metadataを保持し得るshared search textとfilter valueをclearする。Repository-onlyのselectionとdiffは引き続き有効とする。
- Rescan controlにはscope labelを付ける。Repositoryは常に利用でき、Globalは有効な間だけ利用でき、Allは現在有効なすべてのsourceを意味する。Global OFF時のAllはRepository rescanと完全に同じであり、Global resolverもfilesystem callも実行しない。
- 公開pathにはglobal://openai-codex/AGENTS.mdのようなsymbolic形式を使用する。解決済みhome pathとenvironment variableの値はprivateに保つ。
- UIではGlobalをローカルuser-level構成と説明し、managed、system、organization、remote、hosted構成は評価対象外であることを明記する。

### UIの判断

| 評価基準 | プレーンCLI | TUI | ローカルWeb UI |
|---|---|---|---|
| npxでの起動 | 非常に良い | 良い、TTYが必要 | 良い、ブラウザー起動処理が追加される |
| 長いドキュメントの閲覧 | 弱い | ターミナルの制約内では良い | 非常に良い |
| 横並びdiff | 弱い | 幅の広いターミナルでのみ良い | 非常に良い |
| npm配布 | 最小 | 中程度 | client bundleが必要 |
| セキュリティ | attack surfaceが最小 | HTTP serverなし | loopbackのhardeningが必要 |
| テスト | 単純 | ターミナル幅のテストが必要 | componentおよびbrowser E2Eが必要 |
| 拡張性 | 限定的 | 中程度 | filteringとstructured viewに最適 |
| MVPコスト | 低 | 中 | 高 |

推奨: ローカルWeb UIを備えた薄いCLI launcher。

長いファイルの閲覧、Raw（秘匿化済み）・構造化・診断view間の切り替え、ファイル比較という中核タスクにおいて、UIの価値が最も高い。閲覧品質より実装規模とHTTP attack surfaceの最小化が重要になった場合、Ink TUIが主要な代替案となる。

### Visual productの方針

2026-07-14に確認したvisualおよびinteractionのbenchmarkは次のとおりである:

- [ESLint Config Inspector](https://github.com/eslint/config-inspector)。特に[searchとfacetのworkflow](https://github.com/eslint/config-inspector/blob/c51024c46adc1e023d8db6607bb946eedd5bb8b0/app/pages/rules.vue)と[summary-firstのconfiguration item](https://github.com/eslint/config-inspector/blob/c51024c46adc1e023d8db6607bb946eedd5bb8b0/app/components/ConfigItem.vue)を参考にする。情報密度の高いconfiguration surfaceでも、検索可能で、段階的に開示され、読みやすい状態を保つ方法を示している。
- [Node Modules Inspector](https://github.com/antfu/node-modules-inspector)。特に[contextual detail panel](https://github.com/antfu/node-modules-inspector/blob/370a4787a55d5148383b84a3a12df0635b69fde3/packages/node-modules-inspector/src/app/components/panel/PackageDetails.vue)と[compactなreport row](https://github.com/antfu/node-modules-inspector/blob/370a4787a55d5148383b84a3a12df0635b69fde3/packages/node-modules-inspector/src/app/components/report/TransitiveDeps.vue)を参考にする。明確なselection、常時利用できるnavigation、compactなsummary、集中できるworkspaceを示している。

これらのprojectは体験のbenchmarkであり、templateではない。Agent Customization Inspectorは、独自の名前、iconography、color system、information architecture、React/Vite/プレーンCSS実装を維持する。参照先のsource、visual asset、branding、framework stackはコピーしない。

App shellとcore screenは次の要件に従う:

- 常時表示するtop barに、product name、sanitized Repository label、Repositoryのscan stateおよび件数、scope label付きrescan action、session-only theme control、非永続のInclude user-global configurationスイッチを配置する。Globalには常にOff、Scanning、On、Partial、Errorの明示的statusを置くが、件数は有効な間だけ表示する。OffはNot scannedと説明し、0件も以前の件数も表示しない。スイッチは標準的なonまたはoffのsemanticsを保ち、その横にGlobalの対象範囲および対象外範囲を簡潔に説明するdisclosureを置く。Top barにabsolute home pathとtool-home environment valueは表示しない。
- Primary destinationはOverview、Artifacts、Compare、Diagnosticsとする。Toolとformatの値はこれらのview内のfacetとし、hard-codeされたvendor tabにはしない。
- Overviewでは、Repositoryと、有効な場合だけGlobalについて、compactなsummary blockを分けて表示する。Tool別およびkind別artifact総数、diagnostic severity件数、scan state、limit warningを示すが、merge済みのeffective totalを主結果として提示しない。
- Primary result totalはdistinctなphysical documentを数える。各toolまたはkind facetの件数は、該当するinterpretationを1つ以上持つdistinct document数とする。そのため1つのdocumentが複数のfacet bucketに現れることがあり、facet subtotalが加算可能でないことを明示する。Facetを選択してもcatalog rowを重複させない。
- Artifactsでは、wide screen上で検索およびfilter可能なsummary catalogをcontextual detail workspaceの横に配置する。各rowは選択前に、monospaceのvirtual path、source badge、tool interpretation、kind、format、redaction state、diagnostic件数を示す。Long pathはwrapまたはmiddle ellipsisを使用し、focusまたはselection時には全体を利用可能にし、body-level horizontal scrollを発生させない。
- Search対象は、上限制約付きで、すでに秘匿化されたdisplay metadataだけとする。対象はvirtual path、display name、tool、kind、format、diagnostic codeである。約200 msのdebounce、active filter chip、result件数とtotal件数の可視化、clear-all action、0件の具体的理由により、filter stateを明確にする。Raw artifact textをsearch indexへコピーしない。
- Detail workspaceにはsticky artifact headerと、Summary、Structured、Raw (redacted)、Diagnosticsのtabを設ける。Raw contentはHTMLとしてinjectせず、line numberとwrap controlを備えたpre/code element内のtextとしてrenderする。Structured content内のartifact由来linkはinert textとし、navigationもrequestも開始しない。Contextual Compare actionにより、選択artifactを明示的に左側または右側へ送る。
- Catalog responseにはsummaryだけを含め、document textは含めない。Artifactを選択すると、revision check済みdetailを1つだけon-demandで取得する。Raw（秘匿化済み）はline rowをwindowingし、同時にmountする行を最大400行とする。Line numberはassistive technologyから隠し、label付きrangeおよびjump controlでvisible lineとtotalをannounceする。20,000 UTF-16 code unitを超える行ではsoft wrapを既定で無効にし、surface内部のhorizontal scrollを使用する。
- Structuredには独立した上限制約付きrendererを使用する。Markdown previewの上限は256 KiBおよびrendered node 5,000個とする。すでに上限制約されたpublic metadataをiterativeにtraverseしてlazyにexpandし、visible depth、scalar preview、aggregate display text、mounted rowに上限を設ける。ArtifactDocumentはstructured metadataがcomplete、partial、unavailableのいずれかを報告する。Presentationまたはmodelのcapに達した場合、そのdiagnosticをtabに表示し、残りのtreeを再帰的にmountせずcompleteなwindowed Raw viewへ案内する。
- Compareには、常にlabelが見える2つのselector、両側に常時表示するRepositoryまたはGlobal badge、unifiedとside-by-sideのmode、上限制約付きのunchanged contextを用意する。Narrow screenでは、読めないほど圧縮したside-by-side diffではなくunified modeを使う。
- DiffはUI thread外で実行し、byte、line、line-pair、wall-timeのbudgetを設ける。Limitまたはtimeoutでは設計済みdiagnostic stateを表示し、partial diffをcompleteとして提示しない。
- Diagnosticsはartifact tabとsource-awareなaggregate viewの両方で利用できるようにする。Severity、source、tool、code、artifactのfacetを常に見える状態にし、GlobalのfailureによってRepository workspaceをfull-page failureへ置き換えない。Aggregate rowはwindowingまたはpaginationし、安定したtotalとoverflow summaryを示す。保存可能な最大diagnosticを一度にmountしてはならない。
- Loading、scanning、Global-off、empty、no-match、partial、limit-reached、stale、fatalの各stateに、明示的なtitle、説明、次に取れる安全なactionを用意する。Blank paneやspinnerだけで状態を表現しない。

Visualおよびinteraction systemは次の要件に従う:

- Spacing、typography、surface、border、focus、source identity、tool accent、diagnostic severityにはCSS custom propertyを使用する。Hierarchyの大部分はneutral surfaceで表し、colorはsecondary signalとする。
- Local system UIおよびmonospace font stackと、少数のlocal bundle済みSVG icon setを使用する。Clientはremote font、icon、image、analytics、その他のvisual assetを読み込まない。
- Path、filename、metadata、raw text、diff textをuntrusted bidirectional contentとして扱う。Labelにはbdiまたは同等のisolationとunicode-bidi: plaintextを使用する。Catalogおよびmetadata labelではline break、C0/C1 control、bidirectional formatting controlをvisible escapeし、Rawおよびdiffではtabとline boundaryを維持しつつその他のcontrolをvisible escapeする。このpresentation transformはredacted model valueや比較対象byteを変更しない。
- OSのlightまたはdark preferenceを既定値とし、session-onlyのoverrideを許可する。Theme stateはinspected session stateから独立させ、Global stateを永続化または復元してはならない。
- WCAG 2.2 AAのcontrastとsemanticsをtargetとする。Source、selection、severity、disabled stateは、colorだけでなくtextとshapeまたはiconの変化でも伝える。Focus indicatorは両themeで見える状態を保つ。
- Interactive summary block、facet、filter chipにはclickable div elementではなくnative button、input、fieldset、selected-state semanticsを使用する。Scan-state変更にはpolite live regionを使用し、変更のない件数を繰り返しannounceしない。
- Core flowはkeyboardだけで操作可能にする。Search fieldにはvisible labelと/ shortcutを設け、native controlを優先する。Composite widgetは文書化されたarrow、Enter、Escapeの挙動を持ち、panelを閉じた場合やGlobalを無効にした場合には、安全で見えているcontrolへfocusを戻す。
- prefers-reduced-motionを尊重する。Motionは短いstate transitionに限定し、不可欠な意味を持たせない。Animated chartと装飾的なgraph motionはMVP対象外とする。
- 1280 CSS pixel以上では安定したcatalog-and-detail workspaceを使用する。768から1279 pixelではcatalogをdismiss可能なdrawerにする。768 pixel未満ではbody-levelのhorizontal overflowがないsingle-pane drill-in flowを使用する。
- 768 pixel未満では、full product nameをaccessible nameに持つcompactなproduct markと、Globalスイッチおよびtext statusを直接見える状態に保つ。Repository labelはmiddle ellipsis付きでsource summaryへ移動し、task navigationはhorizontal scrollなしでwrapし、Rescan、theme、scope disclosureはlabel付きMore menuへ移動する。移動したすべてのactionはkeyboardで操作でき、visible text nameを持つ。
- Catalogまたはdiagnosticが最大limitに達しても、すべてのrowを同時にmountしない。Result setをwindowまたはpage単位で表示し、assistive technologyへ総位置と総件数を公開し、keyboard focusを安定させる。
- Selection、filter text、Global artifact ID、diff pairはmemory内だけに保持する。Browser URLにはcoarse route nameだけを置くことができ、inspected path、metadata、content、environment value、Global identifierは置かない。Globalを無効にした後、backまたはforward navigationでGlobal由来stateが復元されてはならない。

このproductと衝突する参照先のfeatureは意図的に除外する。対象はautomatic watch mode、deploy可能またはonlineのsnapshot、dependency graph、merge済みeffective-configuration simulation、external service card、inspected-state settingの永続化、workspace-wide file enumerationである。目標は洗練されたinspector体験であり、参照先product固有のdomain behaviorではない。

### 技術的デフォルト

| 判断項目 | 推奨 |
|---|---|
| Node.js | 22.12.0以上、24 LTSで開発、CIは22.12と24 |
| Package manager | npm、package-lock.jsonをcommit |
| Module format | ESMのみ |
| Primary UI | 薄いCLI launcherを備えたローカルWeb UI |
| Client framework | ReactとVite、プレーンCSS |
| Information architecture | Source-aware app shell内のOverview、Artifacts、Compare、Diagnostics |
| Visual system | 独自のCSS token、system font stack、local bundle済みicon、lightおよびdark theme |
| Accessibility | WCAG 2.2 AA target、semantic native control、keyboard-completeなcore flow |
| Browser state | Coarse routeだけを使用し、inspected selection、filter、diff stateはmemory内に保持 |
| Catalog scale | 上限制約付きwindowingまたはpagination、最大catalogを一度にmountしない |
| Content delivery | Summary catalog、revision check付きredacted detailとdiffをon-demandで提供 |
| Heavy diff work | 決定論的limitとtimeoutを持つabort可能なnode:worker_threads worker |
| HTTP server | Node.js標準のnode:http |
| CLI parser | gunshi |
| Discovery | node:fs/promisesのopendirとlstatを使用する独自の上限制約付きwalker |
| Markdown | react-markdownとremark-gfm、raw HTML、画像、artifact link navigationは無効 |
| YAML | yamlのparseDocument |
| JSON | JSON.parse |
| JSONC | 必要になった時点でjsonc-parser |
| TOML | Codex設定のサポート追加時にsmol-toml |
| Diff | jsdiffとしても知られるdiff |
| Unitおよびintegration test | Vitest |
| Browser E2E | Playwright |
| Lintとformat | ESLint flat config、typescript-eslint、Prettier |
| Build | Node側はtsup、browser assetはVite |
| License | 既存のMIT |
| Node API | 公開されたread-only core API |
| Package layout | CLI、core、組み込みadapterを1つのpackageに収容 |
| Monorepo | 採用しない |
| Global inspection | 明示的opt-in、既定OFF、永続化しない |
| Global CLI option | --include-global |
| Global API option | includeGlobal: falseを既定値とする |

Node 20はEOLであり、Node 22と24はLTSである。現在の[gunshi](https://gunshi.dev/guide/introduction/setup)はNode 22以降とESMを要求し、現在の[Vite](https://vite.dev/guide/)はNode 22系ではNode 22.12.0以降を要求する。提案するNode 22.12.0という下限は両方を満たす。

提案するpackage script:

    {
      "dev": "node scripts/dev.mjs",
      "build": "npm run build:node && npm run build:web",
      "build:node": "tsup",
      "build:web": "vite build",
      "typecheck": "tsc --noEmit",
      "lint": "eslint . --max-warnings=0",
      "format": "prettier --check .",
      "format:write": "prettier --write .",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "test:e2e": "playwright test",
      "check:package": "publint && attw --pack . && npm pack --dry-run",
      "check": "npm run format && npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e && npm run check:package",
      "prepack": "npm run build",
      "prepublishOnly": "npm run check"
    }

提案するpackage distribution:

- binはagent-customization-inspectorをdist/cli.jsに対応させる。
- ルートexportsはread-only core APIと型を公開する。
- adapterのsubpathは、信頼されたcaller向けのadapter contractをexportする。
- mainはdist/index.js、typesはdist/index.d.tsとする。
- 公開対象ファイルはdist、英日両言語のdocs、README.md、README.ja.md、LICENSE、および将来のSECURITY.mdとSECURITY.ja.mdとする。
- ソース、テスト、fixture、開発設定はtarballから除外する。

## 6. 提案するMVP

想定する起動方法:

    npx agent-customization-inspector [path] [--include-global]

フロー:

1. 選択されたrepository pathをcanonicalizeする。省略時はcwdを使用する。
2. User homeやtool homeを解決せず、上限制約付きRepository snapshotを作成する。
3. ランダムなportでloopback専用serverを起動する。
4. ブラウザーを開く。--no-openの場合はURLを出力する。
5. --include-globalが指定されていない限り、Globalを無効な状態で開始する。
6. 空のwelcome screenではなく、Repository summary stripとcatalogを備えたArtifacts workspaceを直接表示する。
7. ユーザーがGlobalを有効にしたときだけ、3つの組み込みtool homeを解決し、正確なinstruction candidateからfreshかつ個別の上限制約付きGlobal snapshotを作成する。
8. Source layer、tool、kind、format、virtual path、diagnostic stateでartifactをgroup化・filterし、active filterとresult件数を表示する。
9. Summary rowを選択し、常時表示するRepositoryまたはGlobal badgeとともに、contextual detail workspaceで構造化metadata、Raw（秘匿化済み）、diagnosticを開く。
10. 現在のcatalog contextを失わずにaggregate Diagnosticsを開く。
11. 利用可能な任意の2つのtext artifactを選択し、swapとreset actionを備えたunifiedまたはside-by-side diffを表示する。Source横断diffはGlobalが有効な間だけ利用できる。
12. Globalを無効にした場合、Global scanをcancelし、shared searchおよびfilter stateをclearし、focusとnavigationをRepository-safeなstateへ戻し、Repository snapshotを変更せずにGlobalのsnapshot、detail-store entry、search index、selection、diagnostic、派生diff dataを破棄する。

必須fixture:

- Copilotのリポジトリ指示
- Copilotのパス固有指示
- Claude Codeの指示
- Codexの指示
- Copilot、Claude Code、Codexのuser-global instruction candidate
- Source分離を検証する同名のRepository artifactとGlobal artifact
- Non-additive interpretation facetを検証する、CopilotとCodexの両方に認識される1つのphysical AGENTS.md document
- 同一toolのdiff用の複数ファイル
- Tool横断比較
- RepositoryとGlobalの比較
- 不正なYAML frontmatter
- Secret sentinel
- Path自体にsecret sentinelを含むfake home
- Global無効時のfilesystem-call sentinel
- 有効、不存在、relative、読み取り不能、重複するtool-home override
- 未知のファイル
- サイズ超過ファイル、不正なUTF-8、symlinkのcase

未サポートファイルのルール:

- 文書化されたadapter patternとparserがある: supported
- 文書化されたpatternがあるがmetadata parserがない: raw-only
- Patternに一致するがparseに失敗: artifactを保持してdiagnosticを追加
- 任意の未知ファイル: 無視
- Binary、skipされたsymlink、読み取り不能ファイル、limit超過: scan diagnostic
- Tool home内で、宣言済みcandidate以外にある未サポートファイル: discoverもreadもしない
- Managed、system、hosted、remote、およびenvironment variableによる任意の追加directory list: MVPでは調査しない

UIのraw viewは、構文を保持したRaw（秘匿化済み）を意味する。MVPでは秘匿化されていないcontentを公開しない。

## 7. アーキテクチャとデータフロー

    CLIのrepository pathとoption
      -> Repository rootのcanonicalization
      -> 上限制約付きread-only Repository discovery
      -> adapter registryとrelative-path matching
      -> 上限制約付きUTF-8 read
      -> pure adapter parsing
      -> Repositoryの物理ドキュメントとtool interpretation
      -> redactionとnormalization
      -> Repository redacted detail storeとsummary catalog snapshot

    明示的なGlobal opt-in
      -> built-in tool-home resolution
      -> exact allowlisted Global candidates
      -> 個別に上限制約を持つUTF-8 read
      -> pure adapter parsing
      -> Globalの物理ドキュメントとtool interpretation
      -> redactionとnormalization
      -> Global redacted detail storeとsummary catalog snapshot

    Repository summary snapshotとoptional Global summary snapshot
      -> source-aware in-memory session
      -> loopback HTTP API
      -> React Inspector UI

    選択されたopaque artifact ID
      -> revisionとsource-stateのcheck
      -> 1つのredacted ArtifactDocument
      -> Inspector UI

    選択された2つのopaque artifact ID
      -> revisionとsource-stateのcheck
      -> redacted contentに対する上限制約付きでabort可能なdiff worker
      -> Inspector UI

    すべてのprocessing stage
      -> recoverable diagnostic collector

アーキテクチャ上の境界:

- Filesystemを読み取るのはdiscoveryとcoreだけとする。
- Globalが無効な間はGlobal source resolverを呼ばない。User homeやtool home配下のstatやexistence checkも行わない。
- Repositoryと解決済みの各tool homeは、独立したcanonical rootとする。Globalを有効にしてもRepository rootを拡張しない。
- Global discoveryが開くのは、組み込みのexact candidateと宣言済みの上限制約付きsubdirectoryだけとする。Homeまたはtool-home rootを再帰的にwalkしない。
- RepositoryとGlobalのcatalog、diagnostic、revision、limit budgetを分離する。Global failureによってRepository snapshotを失敗または置換させない。
- 各source collectorが保存する詳細diagnosticは、設定された最大数までとする。境界を超えた後は、上限制約付きのseverityおよびoverflow totalと1件のDIAGNOSTIC_LIMIT_REACHED summaryだけを保持し、攻撃者が制御する追加messageやpathは保持しない。
- Source-specific rescanはそのsourceとrevisionだけをcommitする。All rescanは現在有効なsourceのcandidateを作成し、すべてがsettleした後、1つのatomic session revisionとしてpublishする。Globalのpartialまたはerror resultは成功したRepository candidateとともにpublishできる。Errorは以前のGlobal catalog、件数、detail valueを含まず、partial catalogにはPartialとlabelする。Repositoryのfatal resultでは以前のpairを維持する。Expected revisionがstaleな場合、partial commitを行わず、すべてのcandidateを破棄する。
- Adapterにはsource descriptor、virtual path、上限内のtextを渡し、environment valueや任意のfilesystem accessは与えない。
- MetadataがArtifactDocumentまたはHTTP responseへ入る前に、coreがnode、depth、scalar byte、serialized byteのbudget内でiterativeにnormalizeする。超過時は上限制約付きpartial objectを返すか、安全に保持できるstructured valueがない場合はempty objectを返し、metadataStatusを設定してdiagnosticを生成する。JSON serializationへunbounded parse treeを渡さず、completeな秘匿化済みRaw textは引き続き利用可能とする。
- Adapterにはenvironment、network、process executionのcapabilityを与えない。
- 調査対象リポジトリから実行可能なadapterやpluginを提供することはできない。
- Adapter failureはartifactごとに捕捉する。
- 秘匿化されていない値がHTTP response、diff、log、通常のserializationに到達してはならない。
- Absolute home path、username、tool-home override valueが、公開artifact、diagnostic、log、HTTP response、IDに到達してはならない。
- UIはadapter metadataによって駆動し、vendorを固定したtabを持たない。
- Catalogとsearch surfaceが受け取るのはArtifactSummary valueだけとする。ArtifactDocument detailとdiff resultは、opaque ID、expected revision、source-enabled checkの後にon-demandで取得する。
- Clientはdocument textをprefetchしない。保持するのはactive ArtifactDocumentとactive DiffResultをそれぞれ最大1つとし、置換されたselectionをreleaseする。Resetでは両方をclearする。それ以外では、参照sourceが無効になった場合、またはそのsource catalogのIDかrevisionが変わった場合にだけdetailまたはdiffをinvalidateする。GlobalのdisableまたはrescanではGlobal依存のdetailおよびdiff stateをclearする一方、Repository catalogが不変ならRepository-onlyのdetailおよびdiff stateを保持する。Repository rescanには逆の規則を適用する。
- Client search indexは、上限制約付きのredacted display metadataだけを対象とし、snapshot単位でscope化する。Global indexはopt-in後だけ作成し、Global snapshotとともに破棄する。
- Artifact selection、filter text、diff pair、Global identifierはvolatile client state内に保持する。URLにはcoarse view nameだけを置き、破棄済みsource stateを再生成できないようにする。
- Raw（秘匿化済み）ではtext nodeまたはpre/code renderingを使用する。Structured Markdownはsanitizedな状態を維持し、どちらのviewもartifact由来HTMLをinjectしてはならない。
- MVPはsnapshot scanを使用し、watch modeは使用しない。
- Global enable時はfresh scanを行う。Global disable時はstaleな作業をabortし、Global由来のすべてのstateをevictする。設定は永続化しない。
- Fatal errorは、無効なrootやlocal serverをbindできない場合などに限定する。

### Session HTTP contract

- POST /api/session/globalはenabledとexpectedRevisionだけを受け取る。POST /api/session/rescanはsource（repository、global、allのいずれか）とexpectedRevisionだけを受け取る。Global disabled時のglobalはresolverを呼ばずGLOBAL_DISABLEDを返し、allはRepository-only semanticsを持つ。
- POST /api/session/artifactはidとexpectedRevisionだけを受け取る。POST /api/session/diffはleftId、rightId、expectedRevision、上限制約付きcontextLines valueだけを受け取る。これらのread-only POST routeはidentifierをbrowser locationとhistory URLへ置かず、redactedかつsource-validなresultだけを返す。
- State-changing requestはfilesystem pathを受け取らない。Session token、有効なHostとOrigin、application/json、上限付きbody、現在のexpected revisionを必須とする。Stale revisionの場合はstateを変更せず失敗させる。
- Detailおよびdiff POST requestはstateを変更しないが、同じsession-token、Host、Origin、content-type、body-size、expected-revision checkを適用する。
- Global無効時のGlobal snapshot requestには、以前の件数、candidate root、path metadataを含めず、genericなGLOBAL_DISABLED resultを返す。
- Artifact、snapshot、diagnostic、diff responseにはCache-Control: no-storeを設定する。UIは調査contentをlocalStorage、IndexedDB、service worker cache、その他のpersistent browser storeに保存しない。
- Global disable時はserverとclientの両方で到達可能なGlobal state、detail-store entry、shared searchおよびfilter value、filter index、navigation selection、cacheをclearする。すでにbrowserへ配信したbyteを遡って回収することはできず、JavaScriptで即時memory zeroizationを保証することもできない。両方の制約を文書化する。

## 8. Artifactとadapterのモデル

公開modelはfile-centricであり、複数のinterpretationを持つ。Catalog responseはsummaryだけを含み、秘匿化済みcontentとinterpretation metadataの全体は、選択artifactについてon-demandで取得する:

    interface ArtifactSummary {
      schemaVersion: 1;
      source: {
        layer: "repository" | "global";
        id: string;
        label: string;
        virtualBase: string;
      };
      id: string;
      path: {
        relative: string;
        basename: string;
        virtual: string;
      };
      format: {
        id: string;
        mediaType: string;
        encoding: "utf-8";
      };
      interpretationSummaries: Array<{
        tool: { id: string; label: string };
        kinds: string[];
        support: "supported" | "partial" | "raw-only";
      }>;
      diagnosticCounts: Record<"info" | "warning" | "error", number>;
      diagnosticCodes: string[];
      redactionApplied: boolean;
      securityFlags: string[];
    }

    interface ArtifactDocument extends ArtifactSummary {
      content: {
        displayText: string;
        byteLength: number;
        newline: "lf" | "crlf" | "mixed" | "none";
        redactions: Redaction[];
      };
      interpretations: ArtifactInterpretation[];
      diagnostics: Diagnostic[];
    }

Source IDとartifact IDはopaqueとする。Global virtual pathにはglobal://github-copilot/copilot-instructions.mdのような形式を使用する。解決済みrootとabsolute source pathはprivate discovery state内だけに存在し、public identifierのhashにも使用しない。

公開session snapshotはsource boundaryを維持する:

    interface InspectorSessionOptions {
      repositoryRoot: string;
      includeGlobal?: boolean;
    }

    interface CatalogSnapshot {
      id: string;
      revision: number;
      source: "repository" | "global";
      artifacts: ArtifactSummary[];
      diagnostics: Diagnostic[];
    }

    type GlobalSnapshotState =
      | { enabled: false; status: "disabled" }
      | { enabled: true; status: "scanning" }
      | { enabled: true; status: "ready"; catalog: CatalogSnapshot }
      | { enabled: true; status: "partial"; catalog: CatalogSnapshot }
      | { enabled: true; status: "error"; diagnostics: Diagnostic[] };

    interface SessionSnapshot {
      schemaVersion: 1;
      revision: number;
      repository: CatalogSnapshot;
      global: GlobalSnapshotState;
    }

includeGlobalの既定値はfalseとする。Globalのdisabled、scanning、error stateでは、以前のcatalog、candidate root、件数、path metadataを公開しない。Error variantが持つのはsanitizedされたsource-level diagnosticだけとする。Readyとpartial stateではGlobal CatalogSnapshotを必須とし、partial catalogには引き続き明示的にPartialとlabelする。

    interface InspectorSession {
      setGlobalEnabled(enabled: boolean, expectedRevision: number): Promise<void>;
      rescan(
        source: "repository" | "global" | "all",
        expectedRevision: number,
      ): Promise<void>;
      getSnapshot(): SessionSnapshot;
      getArtifact(id: string, expectedRevision: number): Promise<ArtifactDocument>;
      getDiff(
        leftId: string,
        rightId: string,
        expectedRevision: number,
        options?: { contextLines?: number },
      ): Promise<DiffResult>;
    }

    interface ArtifactInterpretation {
      adapterId: string;
      tool: { id: string; label: string };
      kind: string;
      facets: string[];
      variant: string;
      support: "supported" | "partial" | "raw-only";
      scope: {
        origin: "repository" | "directory" | "user" | "managed" | "unknown";
        base?: string;
        activation: "startup" | "conditional" | "on-demand" | "unknown";
        appliesTo?: string[];
        precedenceHint?: string;
        resolutionConfidence: "documented" | "partial" | "unknown";
      };
      metadata: Record<string, JsonValue>;
      metadataStatus: "complete" | "partial" | "unavailable";
      documentation: {
        status: "documented" | "assumption" | "undocumented" | "unsupported" | "deferred";
        reviewedAt: string;
        sources: string[];
      };
      diagnostics: Diagnostic[];
    }

完全なoriginal textはparseおよびredaction中の短命な内部SourceDocumentだけに存在する。Catalog snapshot、detail store、default JSONには保持しない。Source-owned detail storeは秘匿化済みArtifactDocument valueだけを保持し、revisionとsource-stateのcheck後、選択された1つのdocumentまたは上限制約付きdiff inputを提供する。Global sourceを無効にすると、以前のGlobal detail IDはすべてgenericに失敗する。Securityまたはscan limitの超過時は、暗黙にtruncateせず、対象contentをskipするか、上限制約付きpublic metadataを明示的なdiagnostic付きでpartialとする。Structured presentation capが影響するのはpresentationだけであり、受け入れたArtifactDocumentはcompleteなredacted displayTextを保持する。

最小限のadapter contract:

    interface ArtifactAdapter {
      readonly manifest: AdapterManifest;
      readonly candidates: readonly CandidateSpec[];

      match(entry: DiscoveryEntry): readonly AdapterMatch[];

      inspect(input: {
        source: { layer: "repository" | "global"; locatorId: string };
        entry: DiscoveryEntry;
        match: AdapterMatch;
        text: string;
        signal: AbortSignal;
      }): Promise<AdapterInspection>;
    }

    interface AdapterManifest {
      id: string;
      tool: { id: string; label: string };
      supportedKinds: readonly string[];
      supportedSources: readonly ("repository" | "global")[];
      specSources: readonly string[];
      documentedAsOf: string;
      capabilities: {
        discovery: "full" | "partial";
        metadata: "full" | "partial" | "none";
        rawView: true;
      };
    }

Tool ID、kind、format、built-in locator IDはopen stringとし、将来の未知の値も表示できるようにする。Adapterは対応sourceごとにcandidateを宣言するが、environment variableやrootを自ら解決しない。

## 9. 提案するディレクトリ構成

    src/
      cli.ts
      index.ts

      core/
        inspector.ts
        session.ts
        snapshot.ts
        model.ts
        registry.ts
        catalog.ts
        detail-store.ts
        diagnostics.ts
        limits.ts

      discovery/
        walk.ts
        root-boundary.ts
        read-text.ts

      sources/
        repository-source.ts
        global-source.ts
        tool-homes.ts
        virtual-path.ts

      adapters/
        index.ts
        github-copilot/
        claude-code/
        openai-codex/

      parsing/
        frontmatter.ts
        markdown.ts

      security/
        redact.ts
        sensitive-keys.ts

      diff/
        text-diff.ts
        worker.ts

      server/
        server.ts
        routes.ts
        headers.ts
        session-token.ts

      web/
        app/
          shell/
          state/
        components/
          catalog/
          detail/
          diagnostics/
          diff/
          shared/
          source/
        views/
          overview/
          artifacts/
          compare/
          diagnostics/
        styles/
          tokens.css
          global.css

    tests/
      unit/
      contract/
      integration/
      security/
      e2e/
      fixtures/
        repository/
        global-home/

    docs/
      architecture.md
      architecture.ja.md
      supported-formats.md
      supported-formats.ja.md
      adding-an-adapter.md
      adding-an-adapter.ja.md
      security.md
      security.ja.md
      ui-design.md
      ui-design.ja.md

    scripts/
      dev.mjs

## 10. 依存関係

Production runtime dependency:

- gunshi: 宣言的かつ型安全なCLI parseと、helpおよびversion outputの生成
- yaml: diagnosticを扱えるYAML frontmatter parser
- diff: 上限制約付きtext diff
- open: 内部で生成したloopback URLだけを開く

Browser clientはViteによって完全にbundleされる。そのbuild inputはdevelopment dependencyのままにできる:

- react
- react-dom
- react-markdown
- remark-gfm
- rehype-sanitize

Raw HTMLのサポートは含めない。画像はrenderせず、artifact由来のすべてのlink targetは、hrefやその他のnavigation actionを持たないinertなredacted textとして表示する。

Development dependency:

- typescriptとtype package
- tsup
- viteとReact Vite plugin
- tsxとconcurrently
- vitestとV8 coverage
- React Testing Library、user-event、jsdom
- Playwright
- @axe-core/playwright
- fast-check
- ESLint、typescript-eslint、React hooks linting
- Prettier
- publintとAre The Types Wrong

対応するartifact formatを実装した時点でのみ追加する:

- Copilot JSONC用のjsonc-parser
- Codex TOML用のsmol-toml

MCP SDK、plugin loader、shell execution library、network clientは追加しない。

Benchmark productのUI stackを、このprojectのdependencyにはしない。Visual similarityだけを理由に、Nuxt、Vue、UnoCSS、Shiki、Fuse.js、D3、remote font package、remote icon serviceを追加しない。MVPのsearchは、上限制約付きのredacted metadataに対するnormalized matchingで実装でき、Raw (redacted) viewerはtext rendererのままにする。

Global source resolutionに新しいruntime dependencyは不要である。node:os、node:path、既存の上限制約付きfilesystem primitiveを使用する。Generic home-directory globber、configuration loader、credential reader、environment placeholderを展開するlibraryは追加しない。

## 11. 実装milestone

### M1: 開発基盤とセキュリティの中核

- 承認された永続的な判断をリポジトリルートのAGENTS.mdに記録する。
- Package、build、test、lint、formatの設定を追加する。
- Source-awareなartifact summary、on-demand detail-store、adapter、catalog、session snapshot contractを追加する。
- Repository sourceとGlobal sourceのcontractを分離し、Globalをdefault-offとする。
- 安全なwalker、limit、diagnostic、virtual-path sanitization、test専用tool-home resolver、およびtest専用adapterを追加する。

### M2: 3ツール対応のheadless vertical slice

- Copilot、Claude Code、Codexのadapterを追加する。
- 3ツールすべてのRepositoryおよびuser-global instruction candidateを追加する。
- Frontmatter parsing、multi-tool interpretation、文書化されたsource横断load-order hintを追加する。
- Redactionとtext diffを追加する。
- 公開read-only Node API、includeGlobal option、分離summary snapshot、revision check付きon-demand redacted detailおよびdiff、秘匿化済みJSON outputを追加する。

### M3: ローカルWeb Inspector

- CLI launcher、--include-global option、Node.js標準のloopback serverを追加する。
- Task-based app shell、source summary、Overview、Artifacts、Compare、Diagnostics viewを追加し、Artifactsを有用なdata-first landing viewとする。
- 非永続Globalスイッチ、およびRepositoryとGlobalを分離したcatalog facet、result件数、detail tab、aggregate diagnosticを追加する。
- Token化されたlightおよびdark visual system、設計済みloadingおよびrecovery state、上限制約付きcatalog rendering、desktop、tablet、narrow layoutを追加する。
- Keyboard-complete navigation、見える状態と復元可能なfocus、semantic status announcement、reduced-motion behavior、automated accessibility smoke testを追加する。
- 対称なselector、swap、reset actionを持ち、Global有効時には明確にlabelされたsource横断diffも扱うunified diffとside-by-side diffを追加する。
- Enable時のfresh scan、disable時のcancelとeviction、stale-request protectionを追加する。
- Loopback security、browser functional E2E、accessibility、決定論的visual-regression testを追加する。

### M4: Hardeningとリリース準備

- Cross-platform、security、package testを追加する。
- COPILOT_HOME、CLAUDE_CONFIG_DIR、CODEX_HOME、home不存在、root重複、platform固有path処理をhardeningする。
- 英日両言語のREADME、support matrix、adapter guide、UI design、security documentationのpairを完成させる。
- Pack済みtarballをテストする。
- MVPのすべての完了要件を、その証拠までtraceする。

明示的な実装承認後、承認されたproduct decisionを既存のroot AGENTS.mdに記録し、M1のみを実装する。現在AGENTS.mdにあるドキュメント言語方針は実装承認を意味しない。自動的にM2へ進めてはならない。

## 12. Milestone完了基準

### M1

- M1で利用可能なすべてのformat、lint、typecheck、unit、contract、Node build commandがNode 22.12と24で成功する。最終aggregateのnpm run checkは、UIとE2E targetが存在するようになった後に必須とする。
- Root外への脱出を防止できる。
- MVPではすべてのsymlinkをskipする。
- Entry数、depth、file size、total read、source単位diagnosticのlimitが機能する。
- Permission errorとadapter exceptionからrecoverable diagnosticが生成される。
- includeGlobalを省略またはfalseにした場合、Global resolverは一度も呼ばれず、fake user homeに対するfilesystem operationも発生しない。
- Repository snapshotとGlobal snapshotが独立したidentity、revision、diagnostic、failure handlingを持つ。
- Absolute home pathとtool-home override valueが公開diagnosticやserializationに現れない。

### M2

- 複合fixtureで3ツールすべての代表的なRepositoryおよびGlobal instruction形式を検出できる。
- すべてのcatalog summaryがsource layer、tool、kind、virtual pathとrelative path、format、support、diagnostic件数、redactionが適用されたかを報告する。On-demand detailはrevision check後に秘匿化済みraw text、完全なinterpretation、metadataを返す。
- 不正なfrontmatterでもartifactを表示したままにし、parse diagnosticを追加する。
- 同一tool間とtool横断のdiffがどちらも機能する。
- Globalを切り替えてもRepository CatalogSnapshotのcanonical serializationがbyte-for-byteで安定し、Global errorがRepository catalogに混入しない。
- Copilot、Claude Code、Codexが、意味上の勝者を断定せず、文書化されたload-orderまたはco-application hintを報告する。
- CopilotとCodexの両方に認識されるdocumentがcatalogに1回、primary result totalに1回、該当する各tool facet件数に1回現れ、facet subtotalを加算可能として表示しない。
- Sentinel secretがJSON、diff、diagnostic、logに存在しない。
- 公開Node APIとpackage exportsが機能し、includeGlobalの既定値がfalseである。

### M3

- Package化されたCLIからUIを起動でき、gunshiが生成するCLI helpが--include-globalをopt-inの初期stateとして説明する。
- Overview、Artifacts、Compare、Diagnosticsが機能し、Artifactsをdata-first landing viewとし、固定vendor navigationを持たない。
- Raw contentをindex化せず、metadata-only search、active facet、result件数、clear-all、catalog selection、Summary、Structured、Raw（秘匿化済み）、artifact Diagnosticsが機能する。
- 1440 x 900ではtop bar、source summary、navigation、catalog、detailの階層を重なりなくrenderする。1024 x 768ではcatalogとfacetに定義済みdrawer layoutを使用する。390 x 844ではGlobalスイッチとstatusを見える状態に保ち、Repository labelを安全にelideし、task navigationをwrapし、label付きMore menuからRescan、theme、disclosureを利用できるようにする。Core flowにbody-level horizontal scrollがなく、detailに明示的back navigationがあり、Compareはunified diffを既定とする。
- --include-globalで初期stateが指定されていない限り、UIはGlobal OFFで起動する。RepositoryとGlobalの件数とviewを分離し、スイッチを永続化しない。Global OffはNot scannedとlabelし、0件も以前の件数も公開しない。Disable成功後、次のrendered stateより前に以前の件数を削除する。
- Enable時にfresh scanを行い、disableでscanを中断でき、shared searchおよびfilter valueをclearし、focusをRepository-safe controlへ戻し、到達可能なGlobal由来のdetail-store entry、search index、selection、navigation state、およびserverまたはclientのcache entryをすべて削除する。
- Repository-onlyの選択detailとdiffはGlobal transitionをまたいで利用可能かつ不変である。Global OFF時はsource横断diffを拒否し、対称なselector、swap、reset、unified、side-by-sideの挙動が機能する。
- Keyboardだけでartifactのfilterとselection、detail tabの切り替え、comparisonの構築、diagnosticの確認、Globalのenableとdisable、drawerのclose、すべてのrecoverable stateからの復帰を行え、focusが見える状態を保つ。
- 4つのprimary viewとGlobal control stateに対するautomated accessibility smoke testで、seriousまたはcritical violationが0件であり、その他のfindingはすべて修正するか、verified false positiveである証拠を記録する。手動のkeyboardおよびscreen-reader reviewでlogical order、focus restoration、announcement、colorだけに依存しないstatus cueを確認する。
- Canonical visual-regression suiteが、固定されたLinux、Chromium、font、locale、clock、color-scheme、reduced-motion environmentで成功する。Baseline変更には人によるreviewを必須とする。
- Repository artifact 5,000件、Global artifact 1,000件、source単位diagnostic最大数のstress fixtureでcatalogまたはdiagnostic list全体を一度にmountせず、search、total件数、selection、keyboard focusを維持する。
- 未知のtool、kind、format値をfallback label付きでrenderできる。
- 外部network requestを一切行わない。
- Browser security testが成功する。

### M4

- 英語版と日本語版のREADMEにinstallation、usage、support、limit、securityを一貫して記載する。
- 英日両言語のsupport matrix、adapter guide、UI design、security documentationのpairが存在する。
- CIがLinux、macOS、Windows上のNode 22.12と24で成功する。
- Package tarballに意図したファイルだけが含まれる。
- 文書化されたすべてのMVP完了要件に、trace可能な検証証拠がある。
- Tool-home overrideと、不存在または読み取り不能なGlobal candidateが、absolute home pathを公開せず、すべての対応platformで安全に失敗する。

## 13. テストと検証

Unit test:

- Path normalization、root boundary、limit
- Adapter matchingとparsing
- Multi-tool interpretationのmerge
- Frontmatter error recovery
- Redaction
- CRLF、末尾改行、Unicode、空ファイルに対するdiff処理
- Mixed-direction text、newlineを含むfilename、C0/C1 control、bidirectional overrideまたはisolate controlのdisplay isolationとvisible escaping
- Partial-result leakageを起こさないdiffのbyte、line、line-pair、abort、worker-timeout limit
- Iterativeなpublic-metadata normalizationと、Structured Markdownまたはmetadata treeのinput、node、depth、scalar、serialized-byte、mounted-row cap

Adapter contract test:

- Exceptionがartifact boundaryから外へ漏れない。
- 上限制約付きmetadataとmetadataStatusがJSON-compatibleな状態を保ち、serializationへunbounded parse treeを渡さない。
- Diagnosticにabsolute path、source snippet、secretを含めない。
- Public-model budget内の未知metadata keyを保持する。Overflow時はpartial statusとdiagnosticを設定する。

Filesystem integration test:

- Root外を指すsymlink
- Symlink loopとWindows junctionの挙動
- RepositoryからGlobal、GlobalからRepository、Globalから外部を指すsymlink
- CatalogをmergeしないRepository rootとtool-home rootの重複
- 読み取り不能ファイル
- 深いtreeとlarge file
- 1 MiBの単一行、数十万の短い行、深くnestしたMarkdown、deepかつwideなmetadata、source単位capを超えるdiagnostic flood、adversarialな交互diff line
- 不正なUTF-8、NUL byte、YAML alias abuse
- 不存在、relative、不正、読み取り不能、customのtool-home environment value

Source isolationとstateのtest:

- includeGlobalを省略またはfalseにした場合、Global resolverとfake-home filesystem callが0回である。
- Global enable時にfresh scanを行い、Repositoryのartifact ID、ordering、revision、selectionを変更しない。
- Global disable時にin-flight workをabortし、shared searchおよびfilter valueをclearし、catalog、detail store、diagnostic、search index、navigation state、stale ID、Global関連diff cacheをevictする。
- 高速なoff-on-offおよびoff-on-off-on transitionでstale Global resultが復活しない。
- Enable、Global selection、disableの後にback、forward、reloadを行っても、Globalの件数、ID、selection、filter term、detail、diffが復元されず、URLはcoarseで安全なrouteのままである。
- RepositoryとGlobalのrescanが自分のrevisionだけを変更し、all-scope rescanが整合したpairをswapする。
- Detailとdiffのinvalidationは参照source catalogのIDとrevisionに従う。Global transitionではGlobal依存valueだけをclearし、Repository catalogが不変ならRepository-only valueを保持する。Repository rescanには逆の規則を適用する。
- Global snapshotのdisabled、scanning、error variantはcatalogも件数も含まず、readyとpartial variantではGlobal CatalogSnapshotを必須とする。Errorが持つのはsanitizedされたsource-level diagnosticだけとする。
- Global OFF時のall-scope rescanはRepository rescanとbyte-equivalentであり、Global resolverとfake-home filesystem callが0回である。
- All-scopeのGlobal partialまたはerror resultは成功したRepository candidateとともにpublishできる。Global Errorは以前のcatalog、件数、detailを公開しない。Repositoryのfatal resultとstaleなexpected revisionでは、以前のpairを変更しない。
- Globalのpermission、parsing、limit failureがRepository snapshotに混入せず、失敗もさせない。

Security test:

- Hook、script、command、MCP設定には、実行された場合にmarkerを作成するsentinelを含める。markerが作成されてはならない。
- Scan前後でfixtureのhashが同一である。
- Secret sentinelがstdout、stderr、snapshot、API response、packaged outputに現れない。
- Usernameまたはsecret sentinelを含むfake absolute homeが、stdout、stderr、log、ID、diagnostic、API response、snapshot、diff、Playwright traceに現れない。
- Mixed-directionのfilename、metadata、Raw text、diff lineによって周囲のUI labelが並べ替えられたりsourceおよびseverity badgeが隠されたりせず、control characterがpresentation時にvisible escapeされる。
- 外部HTTP requestが発生した場合、テストを失敗させる。
- Artifact由来Markdown linkをclickまたはkeyboardでactivateしてもlocationとbrowser stateが変わらず、requestも発生しない。
- Host、Origin、session-token、content type、body size、expected-revision、Cache-Control、path-traversal、CSPの挙動をテストする。
- 悪意あるHTTP inputから任意path付きでGlobalを有効化できず、disable後のstale Global IDからcontentを取得できない。
- Catalog responseにdisplayTextを含めず、stale revision、disabled source、evict済みIDを持つon-demand detailまたはdiff requestから以前のcontentを取得できない。
- Browser URL、history entry、storage、document title、accessible name、screenshot baselineに、調査対象のabsolute path、environment value、秘匿化されていないcontent、実際のuser search text、secret sentinel、Global artifact IDを含めない。

UIおよびpackage test:

- App shell、source summary、search、facet chip、result件数、Global state、catalog selection、detail tab、diagnostic grouping、および設計済みloading、empty、partial、limit、stale、fatal stateに対するReact component test
- Overview、Artifacts、Compare、Diagnostics、Global初期OFF、fresh enable、scan途中のdisable、process restart、disable後のback、forward、reload、scope分離結果、drawerおよびdrill-in navigation、keyboard workflow、両方のdiff modeに対するPlaywright functional test
- 4つのprimary viewとGlobal control stateについてlightおよびdark themeで行う@axe-core/playwright smoke testと、focus order、restoration、announcement、color以外のcueに対する手動keyboardおよびscreen-reader check
- 固定されたLinuxおよびChromium environmentで、local font、locale、clock、color scheme、reduced motionを固定して行う1440 x 900、1024 x 768、390 x 844のscreenshot regression test
- Repository-only Artifactsでdetailを選択した状態、Global scanningおよびenabled state、不正content、side-by-side Compare、partialまたはlimit Diagnostics、narrow detail drill-in、narrow unified Compareを対象とするcanonical screenshot
- Visual baselineにはsynthetic fixtureとvirtual pathだけを使用する。実repositoryまたはhome path、username、random port、token、timestamp、secret sentinelを含めず、baseline更新には毎回人によるreviewを必須とする。
- 最大sizeのcatalog stress testで、上限制約付きmounted row、安定したfocus、visible total件数、metadata-only search、long-pathのwrapまたはtruncation、英日mixed textを検証する。
- RawおよびStructured stress testで、mounted line rowが最大400行であること、decorative line numberがhiddenであること、rangeとtotalのannouncement、keyboard jump control、long-line soft-wrap cutoff、Markdownおよびmetadata cap diagnostic、上限制約付きiterative metadata traversal、worker timeoutからのrecovery、navigationの継続的responsivenessを検証する。
- Aggregate Diagnostics stress testで、source単位storage cap、安全なoverflow total、1件のlimit summary、mounted rowが最大400行であること、安定したfilteringとfocus、capを超える攻撃者制御detailを保持しないことを検証する。
- publintとAre The Types Wrong
- npm pack dry run
- 既存状態のないクリーンな一時ディレクトリにtarballをinstallし、CLIとAPIをsmoke testする

Coverage percentageを完全な保証とはみなさない。Security boundaryには、明示的なbranch、boundary、property testが必要である。

## 14. セキュリティ設計

デフォルトのlimit:

- 最大depth: 64
- 最大Repository directory entry数: 50,000
- 最大Global directory entry数: 5,000
- 最大Repository artifact数: 5,000
- 最大Global artifact数: 1,000
- MVPでの最大Global tool-home root数: 3
- 1ファイルあたりの最大size: 1 MiB
- Repositoryで読み取り可能な最大byte数: 32 MiB
- Globalで読み取り可能な最大byte数: 8 MiB
- 読み取り可能な合計最大byte数: 40 MiB
- 片側あたりの最大diff input: 512 KiBまたは20,000行
- Diff context line: 既定3、最大20
- 最大diff line-pair budget: 4,000,000
- 最大diff worker wall time: 1,000 ms
- 最大Structured Markdown preview input: 256 KiB
- 最大Structured Markdown rendered node数: 5,000
- Interpretationごとの最大public metadata node数: 5,000
- 最大public metadata depth: 32
- 最大public metadata scalar: 8 KiB、interpretationごとのserialized totalは256 KiB
- 同時にmountする最大metadata row数: 400
- Sourceごとに保存する最大詳細diagnostic数: 10,000。超過時の1件のlimit summaryを含む
- 同時にmountする最大aggregate Diagnostic row数: 400
- 同時にmountする最大Raw viewer行数: 400
- 1行あたりのautomatic soft-wrap cutoff: 20,000 UTF-16 code unit
- Read concurrency: 8

Limit超過は、暗黙のtruncationではなく明示的なdiagnosticを生成する。Diagnostic overflowでは上限制約付きのaggregate countと1件のlimit summaryを保持し、超過detailを破棄する。

必須control:

- 選択したrootをrealpathでcanonicalizeする。
- Globalが明示的に有効になるまで、tool-home environment variableを解決せず、user-home pathにも触れない。
- COPILOT_HOME、CLAUDE_CONFIG_DIR、CODEX_HOMEは現在のprocess environmentからだけ解決する。調査対象リポジトリや.env fileから値を読み込まない。
- AbsoluteかつNULを含まないtool-home overrideだけを受け入れる。不正またはrelativeな値はskipし、値を含めずvariable名だけを示すsanitized diagnosticを生成する。
- 受け入れた各tool homeを独立したcanonical rootとして扱う。Repository rootとの共通ancestor boundaryを作らない。
- Exact allowlisted Global candidateと、宣言済みの上限制約付きinstruction subdirectoryだけを開く。Homeまたはtool-home directory全体をwalkしない。
- 任意の--global-root optionを公開せず、HTTP経由でGlobal filesystem pathを受け取らない。
- 各tool-home rootをcanonicalizeする前にlstatし、symlinkまたはreparse-point rootを拒否する。
- 内部を指しているように見える場合でも、MVPではすべてのsymlinkをskipする。
- Platformが対応する場合はdescriptor-based no-follow readを使用し、open handleをfstatしたうえでregular-file identityとsource-boundary containmentを検証する。これらを安全に確立できないplatformでは、lstatからreadまでのraceを受け入れず、diagnostic付きでcandidateをskipする。
- Regular fileだけを読み取る。
- .git、node_modules、一般的なgenerated directoryをskipする。
- 関連するcustomization fileがignoreされている場合があるため、.gitignoreを自動的には適用しない。
- UTF-8 textだけを受け入れ、不正なinputを報告する。
- Parse前にsize limitを適用する。
- Structured Markdownはpreview budget内だけでparseおよびrenderする。Capに達した場合もmetadataとcompleteなwindowed Raw（秘匿化済み）viewを利用可能な状態に保ち、contentを暗黙に省略せずdiagnosticを生成する。
- Diffはabort可能なworkerで実行し、byte、line、line-pair、wall-timeのbudgetを強制する。Timeout時はworkerをterminateし、partial resultを返さずlimit diagnosticを生成する。
- YAML custom tagを無効にし、alias expansionを制限する。
- 対象contentをprompt、command、module、template、または実行対象configurationとして評価しない。
- Environment variableのplaceholderを展開しない。
- 完全なoriginal contentは短命なparseおよびredaction state内だけに保持し、いずれのcatalog snapshotにも残さない。
- Structured metadataとtextの両方を秘匿化する。
- 秘匿化済みcontentだけをdiffする。
- Content、secret、選択したrootのabsolute pathをlogに記録しない。
- Absolute home path、username、tool-home override value、raw filesystem error messageをlogまたはserializeしない。
- すべてのuntrusted text runを周囲のUI directionalityからisolateし、display-control characterをvisible escapeする。Redacted modelとdiff inputはbyte-faithfulな状態を保ち、escapeはpresentation-only transformとする。
- Raw Markdown HTML、画像、artifact由来のすべてのlink navigationを無効化する。Redacted link targetはhrefを持たないinert textとして表示する。
- Raw（秘匿化済み）はtext nodeまたはpre/code elementでrenderする。Artifact由来markupをinnerHTMLまたは同等のHTML injection APIへ渡してはならない。
- Font、icon、visual assetをlocal bundleする。Browserからmetadata、documentation preview、analytics、third-party assetを取得しない。
- 厳格なCSP、X-Content-Type-Options、Referrer-Policy、frame denialを設定する。
- ランダムportと推測不能なsession pathを用い、127.0.0.1だけでlistenする。
- HostとOriginを検証し、CORSを有効にしない。
- APIはopaque artifact IDを受け取り、任意のfilesystem pathは決して受け取らない。
- 機密API responseにはCache-Control: no-storeを設定し、調査contentをpersistent browser storageまたはservice worker cacheへ書き込まない。
- 調査対象のselection、filter term、diff pair、Global identifierをURL path、query、fragment、document title、browser history stateへ置かない。
- 公開Global pathはvirtual pathとする。Artifact IDにabsolute pathを含めず、そのhashも使用しない。
- Global disable時にpending readをabortし、shared searchおよびfilter valueをclearし、到達可能なGlobal source、catalog、detail-store、search-index、navigation、diff stateを削除する。Reference解放後の即時memory zeroizationをJavaScriptでは保証できないことを文書化する。
- RepositoryからGlobal、GlobalからRepository、いずれかのsourceから別の外部rootへのcross-boundary importを展開しない。
- Repository rootとGlobal rootが重なる場合もsource catalogを分離し、sanitized overlap diagnosticだけを生成する。
- 調査対象リポジトリからadapterやpluginを読み込まない。
- Test fixture配下のすべてをinert test dataとして扱い、fixture directoryからagentを起動しない。

Redactionによってすべてのsecretを確実に検出できるとは限らない。この制約を文書化し、MVPでは秘匿化されていない表示を提供しない。

## 15. 将来のツール追加

サポートするAIコーディングエージェントの追加時は、次の手順に従う:

1. 現在の公式仕様を調査する。
2. 参照元URLと確認日をadapter manifestに記録する。
3. 事実をdocumented、assumption、undocumented、unsupported、deferredに分類する。
4. Repository candidateとGlobal candidateを別々に宣言し、一方から他方を推測しない。
5. Globalをサポートする場合、built-in tool-home resolverを追加し、値を公開せずにすべてのenvironment overrideを文書化する。
6. Recursive Global candidateを追加する前に、source-boundaryとsensitive-stateのthreat reviewを実施する。
7. Pure adapterを追加する。
8. Repository、Global-off、Global-on、malformed、overlap、securityのfixtureを追加する。
9. 共通adapter contract suiteとsource-isolation contract suiteに合格する。
10. 組み込みregistry entryを1つ追加する。
11. Support matrixを更新する。
12. Pack済みpackageをsmoke testする。

既存のadapterとUIを変更する必要がない状態にする。未知のtool、kind、format IDを引き続きrenderできなければならない。

将来的には、信頼されたNode API callerがadapterを明示的に提供できるようにしてもよい。調査対象リポジトリにadapterを自動読み込みさせてはならない。

## 16. リスク、前提、未サポート範囲、延期事項

### 前提

- 選択したrootを唯一のRepository filesystem boundaryとする。明示的なGlobal opt-inによって独立したbuilt-in user-level boundaryが追加されるが、Repository boundaryは拡張されない。
- Globalは現在のprocess environmentにおけるローカルuser-level構成を意味し、agentに影響し得るすべての構成sourceを意味しない。
- Globalスイッチはsession-localで、既定OFFであり、永続化しない。
- 初期artifactはUTF-8 textである。
- UIにおけるRawはRaw（秘匿化済み）を意味する。
- 起動時のworking directoryとagent versionは不明なため、scopeはcandidateまたはhintとして表示する。
- 公式ドキュメントは2026-07-14に確認した状態を反映している。

### リスク

- Agent customization仕様は急速に変化する。
- 現在、一部のCopilot公式ページ間で記述が一致していない。
- Redactionにはfalse positiveとfalse negativeが生じ得る。
- Local browser serverにはHost、Origin、DNS rebinding、XSSの懸念が加わる。
- Global調査では、personal instruction、secretを含むpath、credentialやruntime stateも同居するtool homeによるprivacy riskが加わる。
- Source toggleやrescanを高速に行った場合、cancelとrevision checkが正しくなければstale Global dataが現れ得る。
- 大きなdiffはCPUとmemoryを消費し得る。
- 情報密度の高いinspectorは、hierarchy、focus、overflow、上限制約付きrenderingをacceptance criteriaとして扱わなければ、視覚的に魅力的でもscanしにくく、keyboard操作やnarrow screenで使いにくくなり得る。
- Visual benchmarkの使用には、意図しない模倣のriskがある。Release前に独自のtoken、icon、layout decision、brandingをreviewしなければならない。
- Screenshot testはplatform間でnoiseが生じ得る。Visual gateは固定canonical environmentだけとし、functional E2Eはcross-platformのまま維持する。
- 公開するまでnpmのパッケージ名は保証されない。

### MVPで未サポート

- 第4章に記載した初期Copilot、Claude Code、Codex instruction candidate以外のuser-global形式
- Managed、system、organization、remote、hosted構成
- COPILOT_CUSTOM_INSTRUCTIONS_DIRS、COPILOT_SKILLS_DIRS、Claude additional directory、その他の任意の外部root
- Tool home内に保存されたcredential、OAuth state、permission、transcript、history、cache、memory、machine-project state
- Hosted configurationとhosted agent state
- Binaryおよび非UTF-8ファイル
- Symlink target
- Root外へのimportとreference
- 完全なeffective-configuration simulation
- Formal schema validation
- Remote repository scanning

### 延期

- RepositoryおよびGlobalのskill、agent、rule、command、prompt、hook、MCP、settings、pluginの広範なサポート
- 文書化されたhintを超えるstructured source-compositionおよびprecedence relation
- Structured diff
- Full-text content search、query-language syntax、保存済みfilterまたはview、user-configurable layout、command palette
- Relationship graph、treemap、sunburst、clustering、その他のdomain visualization
- Screenshot、report、static-snapshot、inspected-content export
- Watch mode
- TUI
- External adapter package

### 明示的な非目標

- Validationとlinting
- Synchronizationとconversion
- 自動fix、rewrite、formatting
- Semantic equivalence
- AI-generated quality assessment
- Effective-state simulation、dependency analytics、graph view、artifact editingを含む、いずれかのvisual referenceとのfeature parity
- Reference productのname、logo、illustration、branding、exact layout、source、visual assetのコピー
- MCPの起動または接続
- Script、command、hook、plugin、workflow、extensionの実行
- Telemetry、account、authentication、hosting
- Third-party metadataを取得する、またはartifactからeditor、file manager、external serviceを開くbrowser integration
- Whole-homeまたはgeneric configuration-directory scanning
- RepositoryとGlobalをmergeしたeffective configuration textであるとの主張
- Globalスイッチの永続化、environmentまたはrepository contentによる暗黙の有効化
- User-supplied Global rootとcross-boundary import expansion
