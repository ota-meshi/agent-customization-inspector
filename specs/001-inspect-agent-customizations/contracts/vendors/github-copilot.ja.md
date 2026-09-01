# Vendor契約: GitHub Copilot

[English](github-copilot.md)

**契約バージョン**: 2026-08-27

**公式資料のreview日**: 2026-08-27

このcontractは、文書化済みGitHub Copilot behaviorとInspectorのread allowlistを分離する。共通matcher文法と
source-boundary ruleは[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.ja.md)、
compositionとprecedenceは[Runtime Composition](../runtime-composition.ja.md)の`strategyId`、evidence recordは
[Official Sources](../official-sources.ja.md)の`sourceId`を参照する。

`behaviorId`はCopilotのproduct surface、`ruleId`はInspector policyを表す。Vendor locator、behavior record、
relationship、strategyはいずれもread authorityを与えない。

> **重要なsurface差:** VS Codeは既定で正確に
> `<workspace-root>/.github/copilot-instructions.md`を認識する。Copilot cloud agentは正確に
> `<repository-root>/.github/copilot-instructions.md`を認識する。Copilot CLIは
> `.github/copilot-instructions.md`を文書化済みstandard-location chainごとのrelative selectorとして扱う。
> どの記述も、製品が任意の`**/.github/copilot-instructions.md` recursive scanを行うという意味ではない。

## 用語

| 用語 | このcontractでの意味 |
|---|---|
| **Workspace root** | VS Codeでworkspace folderとして開いた1 folder。Single-folder workspaceはworkspace folderを正確に1つ持ち、`.code-workspace`のmulti-root workspaceは構成folderごとに1つ持つ。Git repository rootと異なる場合がある。 |
| **Repository root** | Hosted GitHub surfaceが処理するrepositoryのroot。 |
| **Git root** | Copilot CLIがruntime working directoryから上向きにwalkするときの停止boundary。 |
| **Runtime `cwd`** | 対象Copilot CLI sessionが動作するdirectory。Inspectorのselected Repository rootと同じとは限らない。 |
| **CLI standard locations** | Repository root、runtime `cwd`、両者の中間directory、CLIが作業中のfile path上のdirectory。個別rowがその一部を明示的に除外できる。 |
| **User location** | Projectをまたいで使うlocal home、`COPILOT_HOME`、またはVS Code profile location。Repository sourceではない。 |
| **Hosted location** | Local user homeではなくGitHubが保持するorganization、enterprise、repository settings、その他state。 |
| **Relative selector** | 別に指定したlookup baseからだけ解釈するproduct-relative filenameまたはsubtree。別baseやtraversal方向を暗黙に含まない。 |
| **Descendant inventory** | 保持済みRepository boundary配下だけを下向きにinventoryするInspector専用概念。Copilotがworked-fileまたはdescendant anchorを通じてあらゆる深さで文書化しているlocationだけに使う。Copilot runtime locatorでもloadの証明でもない。 |
| **Candidate** | Inspector ruleにmatchしたauthored file。Copilotでapplicable、trusted、installed、enabled、selected、mergedとは限らない。 |

以下のrecursiveな`ANY_DIRECTORIES` segmentは、別に指定したbaseまたはInspectorの明示的なRepository boundaryで
recursionが固定される場合だけ現れる。全Inspector selectorはboundaryを基点にauthorしたtyped segment programである。

Inspectorのselected Repository rootは単一のfilesystem pathであり、multi-root workspaceをmodel化しない。
Selected root外のworkspace folderはRepository sourceの外にあり、VS Code surfaceが実際に使うworkspace
folderは、推測されたwinnerではなく未解決の`workspace-root` condition factのままとする。

## Canonical evidence-assessment index

このcontractが所有する全`behaviorId`と`ruleId`は、自身の`documentationStatus`と`lifecycleQualifiers`を述べる。下記exception
tableにないsubjectのcanonical valueは`documentationStatus: documented`、`lifecycleQualifiers: []`とする。
このdefaultはEvidence cellがnon-emptyであることからの推論ではなく、未列挙subjectごとのclosed contract mappingである。
Empty qualifierはlifecycle claimなしを表し、`stable`を意味しない。既存tableのStatus、Documentation status、
Runtime/documentation status、Inspector status列はhuman rationaleまたはInspector scope stateであり、serializeする
status scalarではない。Runtimeの`documentation-conflict`はdocumentation statusではない。この語彙で互換性のない場合の綴りは`conflict`である。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `copilot.behavior.vscode.instructions.agents` | `documented` | `[experimental]` | Nested selectionはexperimentalであり、そのlifecycleはdocumentation completenessを変更しない |
| `copilot.behavior.vscode.skills` | `partially-documented` | `[]` | Cross-location duplicate precedenceは未文書化 |
| `copilot.behavior.vscode.agents` | `partially-documented` | `[]` | Cross-scope duplicate precedenceは未文書化 |
| `copilot.behavior.vscode.prompts` | `partially-documented` | `[]` | Default nested-directory behaviorは厳密には記載されない |
| `copilot.behavior.vscode.hooks` | `documented` | `[preview]` | Upstream hook featureはpreviewで、activationはruntime conditionのまま |
| `copilot.behavior.vscode.user.hooks` | `documented` | `[preview]` | 同じpreview featureをUser scopeから見たもの |
| `copilot.behavior.vscode.mcp` | `conflict` | `[]` | VS Code 1.118はworkspace root `.mcp.json`を追加する一方、current MCP guideは`.vscode/mcp.json`とUser configurationを網羅的locationとして提示し続ける。Root file schemaとtotal same-name orderは直接文書化されない |
| `copilot.behavior.vscode.user.skills` | `partially-documented` | `[]` | Duplicate-name precedenceは未文書化 |
| `copilot.behavior.vscode.user.agents` | `partially-documented` | `[]` | Workspace/User/organization/plugin間のduplicate precedenceは未文書化 |
| `copilot.behavior.vscode.user.mcp` | `partially-documented` | `[]` | 同名cross-scope server resolutionが不完全 |
| `copilot.behavior.cli.agents` | `conflict` | `[]` | Project対User precedenceに関するofficial assertionが競合 |
| `copilot.behavior.cli.commands` | `partially-documented` | `[]` | Project anchorとancestor/recursive traversalが不完全 |
| `copilot.behavior.cli.extensions` | `documented` | `[experimental]` | 文書化済みextension surfaceはexperimental |
| `copilot.behavior.cli.user.agents` | `conflict` | `[]` | 同じproject対User conflictを保持 |
| `copilot.behavior.cli.user.extensions` | `documented` | `[experimental]` | 文書化済みUser extension surfaceはexperimental |
| `copilot.behavior.cloud.skills` | `partially-documented` | `[]` | Local-personal projectionが確立されない |
| `copilot.behavior.cloud.remote-skills` | `partially-documented` | `[]` | 正確なCloud collision behaviorが不完全 |
| `copilot.repo.command` | `partially-documented` | `[]` | Conservative matcherはsupportされるがproduct ancestryは未文書化 |
| `copilot.repo.mcp.vscode-root` | `conflict` | `[]` | Exact 1.118+ pathはrelease noteで文書化される一方、current guideの網羅的location listはそれを省略しschemaを確立しない |

Typed registryはdefaultとexceptionをsubjectごとに1 recordへ展開する。Assessmentは採点対象のregistry record上に
生き、scalarまたはqualifier unionへ縮約されない。ProvenanceやrelationshipのDTOがそれを運ぶことはない。Ruleが
どこまで文書化されているかは、どのsurfaceも示さないmaintenance dataだからである。

## Surface boundary

**VS Code**表はlocal Copilot Chatとlocal agent modeを記述する。VS Codeから開始したcloud-agent sessionも
**Cloud**表に従う。**CLI**表はlocal GitHub Copilot CLIを記述する。**Cloud/hosted**表はCopilot cloud agentと
hosted inputを記述し、別surfaceが同名customizationを対応するという理由だけでlocal user-home locatorを継承しては
ならない。

任意のVS Code setting `chat.useCustomizationsInParentRepositories`はinstructions、prompts、custom agents、skills、
hooksのdiscoveryを変更する。既定では無効である。有効時は各workspace folderから最初の`.git` directoryまでwalkし、
中間directoryとrepository rootの対応customizationを収集する。Workspaceを任意のdescendant scanに変えるものではない。

## VS Code Repository behavior

| Behavior ID | Lookup base | Relative selector | Traversalまたはactivation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|
| `copilot.behavior.vscode.instructions.repository` | Workspace root | `.github/copilot-instructions.md` | 正確なworkspace-root file。Parent-repository discoveryはopt-in setting有効時だけ | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions`, `vscode.copilot.customization` |
| `copilot.behavior.vscode.instructions.path` | Workspace rootと設定済みinstruction location | `.github/instructions/**/*.instructions.md`、Claude-compatibleな`.claude/rules/**/*.md` | 各instruction locationを再帰探索。`applyTo`はworkspace-root相対、Claude rulesは`paths`を使い、omit時は全fileが既定 | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.instructions.agents` | Workspace root | `AGENTS.md` | Root fileは有効時always-on。Nested fileはexperimentalかつ既定無効。有効時はVS Codeがsubfolderをinventoryし、agentがedited fileから適用instructionsを判断 | `copilot.vscode.instructions.layering` | Documented。Nested selectionはmodel-dependent | `vscode.copilot.instructions`, `vscode.copilot.settings`, `github.copilot.instructions.support` |
| `copilot.behavior.vscode.instructions.claude` | Workspace root | `CLAUDE.md`、`.claude/CLAUDE.md`、local `CLAUDE.local.md` variant | `chat.useClaudeMdFile`有効時always-on。Parent discoveryはsurface setting依存 | `copilot.vscode.instructions.layering` | Documented | `vscode.copilot.instructions` |
| `copilot.behavior.vscode.skills` | Workspace root | `.github/skills/<name>/SKILL.md`、`.agents/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md` | Skill metadataを先にdiscoverし、relevant時にcontentをprogressive load。Parent discoveryはopt-in | `copilot.vscode.skills.selection` | Documented。同名precedenceは未文書化 | `vscode.copilot.skills`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.agents` | Workspace root | `.github/agents/*.md`、`.claude/agents/*.md` | Folder-based discovery。VS Codeは`.github/agents`内の任意`.md` fileを受理。Parent discoveryはopt-in | `copilot.vscode.agents.selection` | Documented。Cross-scope同名precedenceは未文書化 | `vscode.copilot.custom-agents`, `vscode.copilot.settings`, `github.copilot.custom-agents` |
| `copilot.behavior.vscode.prompts` | Workspace root | `.github/prompts/*.prompt.md` | Explicit/manual invocation。Additional locationは`chat.promptFilesLocations`から取得 | —。Explicit prompt invocation | Documented。既定nested-directory behaviorは厳密には明記されない | `vscode.copilot.prompts`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.hooks` | Workspace root | `.github/hooks/*.json`、`.claude/settings.json`、`.claude/settings.local.json`、agent-scoped hook declaration | 同eventではworkspace hookがuser hookより優先。Agent/plugin hookは追加実行可能。Parent discoveryはopt-in | `copilot.vscode.hooks.composition` | Documented。Preview featureはactivation-conditional | `vscode.copilot.hooks`, `vscode.copilot.custom-agents`, `vscode.copilot.customization` |
| `copilot.behavior.vscode.mcp` | Workspace root | VS Code 1.118以降は`.mcp.json`、全review対象versionは`.vscode/mcp.json` | どちらもworkspace rootのexact location。Current guideは`.vscode/mcp.json`の`servers` schemaを直接文書化する一方、それをworkspace locationとして提示し続ける。1.118 release noteは別にroot `.mcp.json`を追加し、同名serverのmost-specific deduplicationを告知するが、そのfile schemaやroot、`.vscode`、User、plugin input間のtotal orderは定義しない。したがってInspectorはroot `.mcp.json`へpath/surface provenanceを付与するが、VS Code所有schema claimを作らない。同じphysical fileに対する独立に文書化されたCLI extractionは、1つのCopilot/MCP recognition内で別provenanceのまま保持する | `copilot.vscode.mcp.selection` | Currentの網羅的guideと新しいrelease noteがconflict。Root schemaとexact selection orderはunknownのまま | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.behavior.vscode.settings` | Workspace root | `.vscode/settings.json` | VS Code setting scopeを適用し、workspace valueがuser valueをoverride。Copilot settings fileはgeneral VS Code settingsの代替ではない | `copilot.vscode.settings.precedence` | Documented | `vscode.settings` |
| `copilot.behavior.vscode.plugins` | Registered/installed pluginまたはmarketplace root | `plugin.json`、`.plugin/plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`と対応marketplace file | Registration、installation、recommendation、enabled stateは別。任意repositoryのmatching fileは自動的にactiveにならない | `copilot.vscode.plugins.activation` | Documented | `vscode.copilot.plugins`, `github.copilot.plugins` |

VS Codeはapplicableなinstruction fileを結合し、同一instruction layer内のorderを保証しない。Instruction layerが
競合する場合、文書化済みの大まかなpriorityはpersonal、repository、organizationの順だが、applicableな全layerは
modelへ渡される。

## VS Code User behavior

以下は文書化済みlocal User surfaceである。後述のGlobal rule群を除き、Inspector Global authorizationを
拡張しない。

| Behavior ID | User base | Relative selectorまたはlocator | Runtime composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `copilot.behavior.vscode.user.instructions` | User homeまたはVS Code profile | `~/.copilot/instructions/**/*.instructions.md`、`~/.claude/rules/**/*.md`、profile instruction file | 文書化済みで最上位のinstruction layer。`chat.instructionsFilesLocations`でlocationをenable/disable可能 | Consent済み`<COPILOT_HOME>/instructions/**/*.instructions.md` subsetだけを`copilot.global.instructions.path`でadmit。VS Codeへのapplicabilityには、そのboundaryがdocumented user locationを表すことも必要 | `vscode.copilot.instructions`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.claude` | User home | `~/.claude/CLAUDE.md` | Claude compatibility有効時のpersonal always-on instructions | `copilot.excluded.user-runtime` | `vscode.copilot.instructions` |
| `copilot.behavior.vscode.user.skills` | User homeまたはVS Code profile | `~/.copilot/skills/<name>/SKILL.md`、`~/.agents/skills/<name>/SKILL.md`、`~/.claude/skills/<name>/SKILL.md`、configured location | Workspaceをまたいでavailable。同名precedenceは未文書化 | Consent済み`<COPILOT_HOME>/skills`と共有agent homeのsubsetだけが`copilot.global.skill`と`copilot.global.agents-home.skill`でadmitされる。`~/.claude/skills`とconfigured locationは`copilot.excluded.user-runtime`のまま | `vscode.copilot.skills`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.agents` | User homeまたはVS Code profile | `~/.copilot/agents/*.md`、profile agent file | Workspaceをまたいでavailable。Workspace、organization、plugin agentとの同名precedenceは未文書化 | Consent済み`<COPILOT_HOME>/agents`のsubsetだけが`copilot.global.agent`でadmitされる。Profile agent fileは`copilot.excluded.user-runtime`のまま | `vscode.copilot.custom-agents`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.prompts` | VS Code profile | Profile `*.prompt.md` file | Explicit/manual invocation | `copilot.excluded.user-runtime` | `vscode.copilot.prompts`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.hooks` | User home | `~/.copilot/hooks/*.json`、`~/.claude/settings.json` | 同eventではuser hookがworkspace hookより下位。Agent/plugin hookも実行され得る | Consent済み`<COPILOT_HOME>/hooks`のsubsetだけが`copilot.global.hooks`でadmitされる。`~/.claude/settings.json`のcompatibility readは`copilot.excluded.user-runtime`のまま | `vscode.copilot.hooks` |
| `copilot.behavior.vscode.user.mcp` | VS Code profile/user data | User `mcp.json` | VS Code MCP configurationとtrustへ参加。同名server resolutionは完全には文書化されない | `copilot.excluded.user-runtime` | `vscode.copilot.mcp` |
| `copilot.behavior.vscode.user.settings` | VS Code profile/user data | User `settings.json` | Workspace settingsより下位で、VS Code policy、remote、language、profile scopeに従う | `copilot.excluded.user-runtime` | `vscode.settings`, `vscode.copilot.settings` |
| `copilot.behavior.vscode.user.plugins` | VS Code profileと互換CLI install state | Profile plugin state、`~/.copilot/installed-plugins`配下で発見したCLI installation | Installed/enabled stateはauthored manifestと別 | `copilot.excluded.user-runtime` | `vscode.copilot.plugins`, `github.copilot.plugins` |

## Copilot CLI Repository behavior

次表ではlookup baseとtraversal列をauthoritativeとする。Creation how-toはrepository-wide fileをrepository rootへ
置くことを推奨する一方、loader referenceは別に、より広いstandard-location discovery chainを文書化する。この2つは
補完関係にあり、recursive scanを意味しない。

| Behavior ID | Lookup base | Relative selector | Traversalまたはactivation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|
| `copilot.behavior.cli.instructions.repository` | CLI standard locations | `.github/copilot-instructions.md` | Repository root、runtime `cwd`、中間directory、worked-file path上のdirectory | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.path` | Repository rootとruntime `cwd`間の中間directoryを除くCLI standard locations | `.github/instructions/**/*.instructions.md` | 受理した各`.github/instructions` directory配下を再帰。Matching `applyTo`だけ含み、`/instructions`でfileをdisable可能 | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.agents` | CLI standard locations | `AGENTS.md` | Context-dependentなstandard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.claude` | CLI standard locations | `CLAUDE.md`、`.claude/CLAUDE.md` | Context-dependentなstandard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.instructions.gemini` | CLI standard locations | `GEMINI.md` | Context-dependentなstandard-location discovery | `copilot.cli.instructions.layering` | Documented | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.skills` | Runtime project。文書化されたinherited tierはparent directoryの`.github/skills`（monorepo support） | `.github/skills/<name>/SKILL.md`、`.agents/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md` | 同名はfirst found wins。文書化済みorderでproject locationがinherited、personal、plugin、custom、built-in、remote sourceより先 | `copilot.cli.skills.selection` | Documented | `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.behavior.cli.agents` | Runtime `cwd`からGit root | 各ancestorの`.github/agents/*.md`、`.claude/agents/*.md` | 全ancestor layerをload。最深project layerが勝ち、同一layerでは`.github/agents`が`.claude/agents`より優先 | `copilot.cli.agents.selection` | Project traversalはdocumented。Project対user precedenceはconflict | `github.copilot.cli.reference`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins` |
| `copilot.behavior.cli.commands` | Project locationが示唆されるがreferenceで完全には固定されない | `.claude/commands/*.md` | Alternative skill format。同名skillが高priority。Ancestor/recursive discoveryは未指定 | `copilot.cli.skills.selection` | Partially documented | `github.copilot.cli.reference` |
| `copilot.behavior.cli.hooks` | Repository root | `.github/hooks/*.json`、`.github/copilot/settings.json`、`.github/copilot/settings.local.json`、`.claude/settings.json`、`.claude/settings.local.json`内inline hook | 同event hookはselectでなくcompose。Repository inline hookはuser hookの後にappend | `copilot.cli.hooks.composition` | Documented | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.behavior.cli.mcp` | Runtime `cwd`からGit root | 各ancestorの`.mcp.json`、`.github/mcp.json` | Workspace trust必須。Fileは文書化された2つのschemaのどちらでもserverを宣言できる — top-levelの`mcpServers` object、またはserver nameをkeyにしたbareなtop-level map。Session additional configとplugin serverがworkspace serverより先で、user configが後。Workspace file間では`cwd`に近い定義が勝ち、同じdirectory内では`.mcp.json`が`.github/mcp.json`より優先する | `copilot.cli.mcp.selection` | Documented | `github.copilot.cli.reference`, `github.copilot.cli.mcp` |
| `copilot.behavior.cli.settings` | Repository root | `.github/copilot/settings.json`、`.github/copilot/settings.local.json`、`.claude/settings.json`と`.claude/settings.local.json`内documented Claude-compatible subset | Repository/local settingsはdocumented defaults/managed/user/repository/local/environment/flag cascadeへ参加。supportされる各keyは、repository layerによるreplace、key単位のmerge、repositoryがentryを追加でき決して削除しないunion、repositoryが有効化でき決して無効化できないtighten-onlyのいずれか | `copilot.cli.settings.precedence` | Documented | `github.copilot.cli.configuration` |
| `copilot.behavior.cli.plugins` | Installed/registered pluginまたはmarketplace root | 文書化済みrecognition orderのplugin/marketplace manifest location | Authored manifest、marketplace catalog、installed copy、enabled state、component selectionは別 | `copilot.cli.plugins.activation` | Documented | `github.copilot.cli.plugins`, `github.copilot.plugins` |
| `copilot.behavior.cli.lsp` | Repository root | `.github/lsp.json` | Project configurationがplugin/user LSP configurationより優先 | —。Initial strategy projectionからexcluded | Documented。Initial Inspector scopeからexcluded | `github.copilot.cli.lsp` |
| `copilot.behavior.cli.extensions` | Current repository | `.github/extensions/<name>/extension.mjs`、`extension.cjs`、`extension.js` | Experimentalかつenablement必須。Project、user、plugin locationは別 | —。Initial strategy projectionからexcluded | Documented。ExperimentalかつInitial Inspector scopeからexcluded | `github.copilot.cli.extensions` |

複数のapplicable CLI instruction fileがある場合、CLIはそれらを結合し、文書化されたidentical duplicateを除去するが、
残るfile間の一般precedenceを定義しない。`applyTo`、`/instructions` disablement、runtime context、surfaceは独立した
condition factである。

plugin名がRepository fileに到達する経路はClaude Codeと同じsettings chainであり、2つのfileで
綴られる。`.github/copilot/settings.json`は`extraKnownMarketplaces`でcatalogを登録し、
`enabledPlugins`で有効化するpluginを指名する。Copilot CLIはこの2つのkeyを、文書化された
cross-toolの共有部分集合として`.claude/settings.json`と`.claude/settings.local.json`からも読む
ため、1つのRepositoryはどちらの綴りでも登録を担える。editorは`chat.plugins.marketplaces`で
独自にcatalogを登録し、`chat.pluginLocations`に絶対pathで登録されたdirectoryは、installなしに
pluginが利用可能になるもう1つの経路である。同じrepository levelの2つのkeyはCopilot cloud agentも
読む。これはこの契約が記録し、どのsurfaceも投影しないhosted stateである。

そのchainがRepository fileに到達する地点がcatalogである。repositoryは文書化された4つの
marketplace locationのうち使うものにcatalogを公開し、それを`copilot.repo.marketplace`がadmitする。
catalogは各plugin名をそのplugin自身のsourceへ対応付ける。文書化された綴りは、marketplace root
配下の相対path文字列 — 当該ページのcatalog例は`./plugins/<name>`と書く — と、自身の`source` keyで
GitHub repositoryまたはGit URLを名指すobject（`github`と`url`）である。このrepositoryが持つ
directoryを名指すのはpathだけであり、`./`接頭辞は任意である: clientは先頭の`./`を1つ剥がし、
宣言された`metadata.pluginRoot`をどちらの綴りの前にも結合し、marketplace directoryの外へ出る
pathを拒否する。したがって`plugins/formatter`と`./plugins/formatter`は同一のdirectoryであり、
文字列のsourceがrepository短縮形になることはない。`owner/repo`短縮形はCLIのmarketplace追加
commandに属し、そこではsourceがcatalogを名指す。このvendorがどこにも文書化していない綴りと、
pathを文書化している位置での非string scalarは、ここでは何も名指さない。

plugin manifestをadmitするruleは存在せず、導出するruleも存在しない。plugin rootはinstall、登録済み
catalog、またはeditor設定の絶対pathによって確立されるものであり、Repository pathにfileが現れること
によってではない。したがって4つのmanifest形式は、rootが自身の宣言を置く場所であって、本製品が
manifestを探す場所ではない。catalogのlocal source配下では、pluginとはそのrootである: root配下の
file — そのrootが使う形式のmanifestを含む — がpluginの同梱fileであり、bounded companion censusが
列挙する（contracts/inspection-path-allowlist.ja.md § Bounded companion census）。repository自身の
rootにあるmanifestは、ここでclientがloadするpluginではなく、そのrepositoryが配布するpluginである。

## Copilot CLI User behavior

| Behavior ID | User base | Relative selectorまたはlocator | Runtime composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `copilot.behavior.cli.user.instructions.root` | `COPILOT_HOME`、既定`$HOME/.copilot` | `copilot-instructions.md` | Applicableなrepository instructionsと結合。文書化済みidentical categoryはdedupe可能で、一般precedenceなし | Consent後の`copilot.global.instructions.root`だけadmit | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.user.instructions.path` | `COPILOT_HOME`、既定`$HOME/.copilot` | `instructions/**/*.instructions.md` | この正確なuser instruction directory配下を再帰discoverし、他のCLI instruction fileと同じapplicability/composition conditionを適用 | Consent後の`copilot.global.instructions.path`だけadmit | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cli.user.skills` | User home | `~/.copilot/skills/<name>/SKILL.md`、`~/.agents/skills/<name>/SKILL.md` | Documented first-found orderでproject/inherited skillより下、後続sourceより上 | 後述の`copilot.global.skill`で`COPILOT_HOME`配下が、`copilot.global.agents-home.skill`で共有agent home配下がaccepted（FR-045） | `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.behavior.cli.user.agents` | User home | `~/.copilot/agents/*.agent.md` | Project対user precedenceは未解決のofficial-documentation conflict。Plugin agentは最下位 | 後述の`copilot.global.agent`でaccepted | `github.copilot.cli.reference`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins` |
| `copilot.behavior.cli.user.hooks` | `COPILOT_HOME` | `hooks/*.json`、`settings.json`内inline hook | Policy、user、project、plugin hookをcomposeし、applicableな同event hookをすべて実行 | 後述の`copilot.global.hooks`と`copilot.global.hooks.inline`でaccepted | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.behavior.cli.user.mcp` | `COPILOT_HOME` | `mcp-config.json` | Session additional config、plugin、workspace sourceより下位 | 後述の`copilot.global.mcp`でaccepted | `github.copilot.cli.reference` |
| `copilot.behavior.cli.user.settings` | `COPILOT_HOME` | `settings.json` | Documented settings cascadeのuser layer | 後述の`copilot.global.settings`と`copilot.global.hooks.inline`でaccepted | `github.copilot.cli.configuration` |
| `copilot.behavior.cli.user.plugins` | Copilot user state | `~/.copilot/installed-plugins/**`とenabled-plugin/marketplace settings | Installed/enabled state。Documented plugin ruleではplugin agent/skillはproject/personal componentをoverride不可 | `copilot.excluded.user-runtime` | `github.copilot.cli.plugins`, `github.copilot.plugins` |
| `copilot.behavior.cli.user.lsp` | User home | `~/.copilot/lsp-config.json` | Project/plugin LSP configurationより下位 | `copilot.excluded.user-runtime` | `github.copilot.cli.lsp` |
| `copilot.behavior.cli.user.extensions` | User home | `~/.copilot/extensions/<name>/extension.{mjs,cjs,js}` | Experimental。Activationは別state | `copilot.excluded.user-runtime` | `github.copilot.cli.extensions` |

`COPILOT_CUSTOM_INSTRUCTIONS_DIRS`と`COPILOT_SKILLS_DIRS`はruntime-supplied lookup rootを追加する。Documented
behaviorだが、このreleaseでInspector scan rootやfile relationshipにはならない。

CLI command referenceは`.claude/commands/*.md`をalternative skill formatとして文書化するが、独立したUser baseは
確立しない。そのため本contractはpartially documentedなcommand behaviorをRepository tableに置き、User behavior rowや
User matcherを創作しない。

## Cloudとhosted behavior

| Behavior ID | Surfaceとscope | Lookup base | Relative selectorまたはhosted locator | Traversalまたはcomposition | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.behavior.cloud.instructions.repository` | Cloud agent、Repository | Repository root | `.github/copilot-instructions.md` | 正確なroot file | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.path` | Cloud agent、Repository | Repository root | `.github/instructions/**/*.instructions.md` | Recursive subtree。Matching `applyTo`だけ使い、`excludeAgent`でcloud agentを除外可能 | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.agents` | Cloud agent、Repository | Repository tree | `AGENTS.md` | Worked-path directory treeでnearest fileが優先 | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.instructions.alternatives` | Cloud agent、Repository | Repository root | `CLAUDE.md`、`GEMINI.md` | Root-only agent-instruction alternative | `copilot.cloud.instructions.layering` | Documented | `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.behavior.cloud.agents` | Cloud agent、Repository | Repository root | `.github/agents/*.agent.md`、`.github/agents/*.md` | Repository agent definition。Filename identityでlevel間deduplicate | `copilot.cloud.agents.selection` | Documented | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.skills` | Cloud agent、Repository | Repository root | `.github/skills/<name>/SKILL.md`、`.agents/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md` | Relevant時にprogressive load | `copilot.cloud.skills.selection` | Documented。Local-personal projectionは未確立 | `github.copilot.skills` |
| `copilot.behavior.cloud.hooks` | Cloud agent、Repository | Cloned repository root | `.github/hooks/*.json` | 既定のephemeral cloud environmentではrepository hook fileだけavailable | `copilot.cloud.hooks.composition` | Documented | `github.copilot.hooks` |
| `copilot.behavior.cloud.mcp` | Cloud agent、hosted Repository/custom-agent state | GitHub repository settingsとagent profile | Repository MCP JSON、custom agent内`mcp-servers` | Out-of-box server、custom-agent server、repository settingsの順に処理し、後段sourceが前段をoverride可能 | `copilot.cloud.mcp.selection` | Documented。Local `.mcp.json`ではない | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.plugins` | Cloud agentとhosted plugin state | Repository settingsとhosted catalog | `.github/copilot/settings.json`内plugin ID/known marketplaceとhosted enablement | Authored manifest、recommendation、install、availability、enablementは別 | `copilot.cloud.plugins.activation` | Documented | `github.copilot.plugins`, `vscode.copilot.plugins` |
| `copilot.behavior.cloud.organization-instructions` | Cloud agent、Organization | GitHub-hosted organization configuration | Local filesystem locatorなし | Repository instructionsとともにapplicable。Documented instruction-layer modelではrepository instructionsがorganizationより先 | `copilot.cloud.instructions.layering` | Documented | `github.copilot.instructions.support`, `github.copilot.cloud.instructions` |
| `copilot.behavior.cloud.organization-agents` | Cloud agent、Organization/enterprise | GitHub-hosted agent profile | Local filesystem locatorなし | 同名selectionはrepository、organization、enterpriseの順 | `copilot.cloud.agents.selection` | Documented | `github.copilot.custom-agents` |
| `copilot.behavior.cloud.remote-skills` | Copilot service、Organization/enterprise | Hosted skill relay | Repository/User filesystem locatorなし | Remote skillをruntime投影。Collision behaviorはsurface-qualifiedのままにする | `copilot.cloud.skills.selection` | Concept levelでDocumented。Cloud exact collision behaviorは不完全 | `github.copilot.cli.reference` |

GitHub.com Copilot Chatはhosted personal instructionsを対応するが、current support matrixはpersonal instructionsを
Cloud-agent layerとして挙げない。したがってhosted personal Chat settingをCloud-agent instruction chainへ投影しては
ならない。

## Inspector Repository matcher rule

この表のBaseはすべて正確なInspector Repository boundary、すなわち取得済み`process.cwd()`または`--root`から得たselected Repository rootであり、表記は`Repository`とする。
Inspectorはその上位からworkspace、project、Git rootを探索しない。`ANY_DIRECTORIES`で始まるselector programは明示的にanchorされた
Inspector inventoryであり、VS Code、CLI、Cloudが下向きにwalkするという主張ではない。より狭いexclusionまたはGlobal requirementを後述しない限り、全行のpolicy referenceは
FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005である。

VS Code/Cloudのrepository-wide/path-instruction ruleはroot-exactな`.github` programを使う。CLIのstandard
locationには作業中fileのpath上のdirectoryが含まれるため、別のCLI-context ruleだけが先頭に`ANY_DIRECTORIES` segmentを
加える。Root配下のすべてのdirectoryはその配下のfileのpath上にあるので、CLIはこれらのfilenameをあらゆる深さで
文書化している。一方、chain側のlocation（root、working directory、その間のdirectory）が寄与するのはselected root
だけである。`ANY_DIRECTORIES`は0 segmentにも
matchするため、CLI ruleはselected Repository rootも対象にする。したがってroot fileはroot-exact ruleからVS Code/Cloud
provenanceを、CLI-context ruleからCLI provenanceを受け取る。同じsurface provenanceを重複させず、runtime behaviorも
mergeしない。

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `copilot.repo.instructions.repository` | Repository | `['.github', 'copilot-instructions.md']` | Inspector rootの`exact` | `static-candidate` | `copilot.behavior.vscode.instructions.repository`, `copilot.behavior.cloud.instructions.repository` | Root-exactなVS Code/Cloud provenanceだけ。CLI provenanceは別のCLI-context ruleから得る | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.repository-cli-context` | Repository | `[ANY_DIRECTORIES, '.github', 'copilot-instructions.md']` | `descendant-inventory`。CLIは作業中fileのpath上のdirectoryにこのfilenameを文書化しており、selected root配下のあらゆる深さに置かれる。VS Code/Cloud traversalへ投影しない | `static-candidate` | `copilot.behavior.cli.instructions.repository` | CLI専用candidate provenance。Runtime `cwd`、worked path、Git rootはconditionのまま | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.path` | Repository | `['.github', 'instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | Root-exactな`.github/instructions/` directory配下の`recursive-subtree` | `static-candidate` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.cloud.instructions.path` | Root-exactなVS Code/Cloud subtree provenanceだけ。Applicabilityはsurface別のまま | `vscode.copilot.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.path-cli-context` | Repository | `[ANY_DIRECTORIES, '.github', 'instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | `descendant-inventory` — CLIは作業中fileのpath上のdirectoryにこのsubtreeを文書化している — と、各fixed instruction directory配下の`recursive-subtree` | `static-candidate` | `copilot.behavior.cli.instructions.path` | CLI専用candidate provenance。CLI runtimeではroot-to-`cwd`のintermediate layerを除外 | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.instructions.agents` | Repository | `[ANY_DIRECTORIES, 'AGENTS.md']` | `descendant-inventory` — CLIは作業中fileのpath上のdirectoryにこのfilenameを文書化し、VS Codeはexperimental設定下で全subfolderを探索し、Cloudはworked path上の最も近いfileを採用する | `static-candidate` | `copilot.behavior.vscode.instructions.agents`, `copilot.behavior.cli.instructions.agents`, `copilot.behavior.cloud.instructions.agents` | Documented。Selectionはsurface/runtime conditional | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.claude-root` | Repository | `['CLAUDE.md']` | `exact` | `static-candidate` | `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate。追加documented pathはinitial scopeでexcluded | `vscode.copilot.instructions`, `github.copilot.cli.instructions`, `github.copilot.cloud.instructions` |
| `copilot.repo.instructions.gemini-root` | Repository | `['GEMINI.md']` | `exact` | `static-candidate` | `copilot.behavior.cli.instructions.gemini`, `copilot.behavior.cloud.instructions.alternatives` | Documented root candidate。Non-root CLI pathはinitial scopeでexcluded | `github.copilot.cli.instructions`, `github.copilot.cloud.instructions`, `github.copilot.instructions.support` |
| `copilot.repo.skill` | Repository | `['.github', 'skills', ANY_NAME, 'SKILL.md']`、`['.agents', 'skills', ANY_NAME, 'SKILL.md']`、`['.claude', 'skills', ANY_NAME, 'SKILL.md']` | Repository rootにanchorされた`exact` then `direct-child`。Skill nameは固定skills directoryの1 direct child。どのCopilot surfaceもroot文脈から下向きのskill lookupを文書化していない — VS CodeとCloudはexactなworkspace/repository rootを読み、CLIはruntime projectを読む — ため、nestedなskills directoryはこのproductが選択しないruntime contextに属し、candidateではなくnear missである（FR-003）。そのcontextへの依存は`runtime-cwd`/`workspace-root` conditionとする | `static-candidate` | `copilot.behavior.vscode.skills`, `copilot.behavior.cli.skills`, `copilot.behavior.cloud.skills` | Documented root inventory。Runtime selectionはconditional | `vscode.copilot.skills`, `github.copilot.cli.reference`, `github.copilot.skills` |
| `copilot.repo.agent` | Repository | `['.github', 'agents', /\.md$/u]` | Rootの`.github/agents/`内の`direct-child` | `static-candidate` | `copilot.behavior.vscode.agents`, `copilot.behavior.cli.agents`, `copilot.behavior.cloud.agents` | すべてのsurfaceがroot-anchoredなlocationを文書化している — VS Codeはworkspace root、Cloudはrepository root、CLIは上方向walkで全sessionが共有する唯一のメンバーがselected root — ため、サブディレクトリのagents directoryはこの製品が選択しないruntime-chainメンバー。Surface/precedenceはconditional/conflictingのまま | `vscode.copilot.custom-agents`, `github.copilot.cli.reference`, `github.copilot.custom-agents` |
| `copilot.repo.agent.claude` | Repository | `['.claude', 'agents', /\.md$/u]` | Rootの`.claude/agents/`内の`direct-child` | `static-candidate` | `copilot.behavior.vscode.agents`, `copilot.behavior.cli.agents` | `copilot.repo.agent`の第2 selectorではなく独立したruleとする。ruleのsurfaceはそれが依拠するbehaviorから導出され、Cloud agentは`.github/agents/`だけを文書化しているため、両directoryにまたがる1つのruleはhosted agentがどのpageも読むと述べていないfileを読むと報告することになる。root-anchoredかつdirect-childである理由は同じ。このfileは`claude.repo.agent`のfileでもあり、両者のために一度だけreadされる | `vscode.copilot.custom-agents`, `github.copilot.cli.reference` |
| `copilot.repo.prompt` | Repository | `['.github', 'prompts', /\.prompt\.md$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.prompts` | Documented VS Code/manual surfaceのみ | `vscode.copilot.prompts` |
| `copilot.repo.command` | Repository | `['.claude', 'commands', /\.md$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.cli.commands` | Conservative initial matcher。Product ancestryは未文書化 | `github.copilot.cli.reference` |
| `copilot.repo.hooks` | Repository | `['.github', 'hooks', /\.json$/u]` | `direct-child` | `static-candidate` | `copilot.behavior.vscode.hooks`, `copilot.behavior.cli.hooks`, `copilot.behavior.cloud.hooks` | 全surfaceが読むdocumented root hook file。Settings documentのinline blockは2つのsettings hook ruleのもの | `vscode.copilot.hooks`, `github.copilot.hooks` |
| `copilot.repo.hooks.settings` | Repository | `['.github', 'copilot', 'settings.json']`、`['.github', 'copilot', 'settings.local.json']` | 各selectorを`exact` | `static-candidate` | `copilot.behavior.cli.hooks` | CLI自身のsettings pairのinline `hooks` block。下のruleの2つ目のselectorではなく独立したruleである。ruleのsurfaceはそれが依拠するbehaviorから決まり、editorのhook-locations tableが名指すのはClaude形式のpairだけだからである | `github.copilot.hooks`, `github.copilot.cli.configuration` |
| `copilot.repo.hooks.settings.claude` | Repository | `['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | 各selectorを`exact` | `static-candidate` | `copilot.behavior.cli.hooks`, `copilot.behavior.vscode.hooks` | 両surfaceが読むcross-tool pairのinline `hooks` block。同じ物理fileはClaude Code自身のhook recognitionも持つ: 1 file、1 read、product毎に1 recognition | `vscode.copilot.hooks`, `github.copilot.hooks` |
| `copilot.repo.mcp` | Repository | `['.mcp.json']`、`['.github', 'mcp.json']` | 各selectorとも`exact` | `static-candidate` | `copilot.behavior.cli.mcp` | Git rootはdocumentedな上向きwalkの全sessionが共有する唯一の終端。Subdirectoryのfileはこのproductが選択しないruntime chainのmemberであり、candidateには決してしない。Trustはconditionalのまま | `github.copilot.cli.reference` |
| `copilot.repo.mcp.vscode-root` | Repository | `['.mcp.json']` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | VS Code 1.118以降のpath/surface provenanceだけ。Current guideはこのlocationを省略し、direct documentationがconflictを解消するまでVS Code schema extractorを認可しない | `vscode.copilot.mcp`, `vscode.copilot.mcp.workspace-root-release` |
| `copilot.repo.mcp.vscode` | Repository | `['.vscode', 'mcp.json']` | `exact` | `static-candidate` | `copilot.behavior.vscode.mcp` | VS Code専用MCP candidate。SchemaはCLIと異なる | `vscode.copilot.mcp`, `github.copilot.cli.reference` |
| `copilot.repo.settings` | Repository | `['.github', 'copilot', 'settings.json']`、`['.github', 'copilot', 'settings.local.json']`、`['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | 各selectorを`exact` | `static-candidate` | `copilot.behavior.cli.settings` | Documented supported subset。General `.vscode/settings.json`はexcluded | `github.copilot.cli.configuration` |
| `copilot.repo.marketplace` | Repository | `['marketplace.json']`、`['.plugin', 'marketplace.json']`、`['.github', 'plugin', 'marketplace.json']`、`['.claude-plugin', 'marketplace.json']` | 各selectorを`exact`とし、文書化された認識順で扱う。catalogを公開するrepositoryは、その`./` entryが解決するmarketplace rootである | `static-candidate` | `copilot.behavior.vscode.plugins`、`copilot.behavior.cli.plugins` | Catalogはこのrepositoryが持つauthored contentである。設定またはcommandによる登録、install、有効化はruntime条件のままであり、rowはcatalogが何をofferするかを述べ、pluginがactiveであるとは決して述べない | `vscode.copilot.plugins`、`github.copilot.cli.plugins` |

Settings ruleのbehavior参照は、それが公開するdocumentを見つける文書化済みlookupである。
同じdocumentが関与するhookおよびpluginのbehaviorは、HookおよびPlugin recognition自身の
基礎であり、それぞれのフェーズとともに到着する: rowはdocumentを公開し、その中に書かれうる
ものは、その宣言を主題とするrowに属する（FR-007）。

重複する`copilot.repo.mcp`と`copilot.repo.mcp.vscode-root` ruleは、同じroot `.mcp.json`に2つの
compatible provenanceを作るが、physical identityまたはreadを重複させない。CLI `mcpServers` extractionはCLI
provenanceが所有し、VS Code provenanceはdirect official documentationがschemaを確立するまでpath/surface-onlyとする。
同名orderingのunknownは推測したwinnerではなくconditionとしてprojectする。

Pluginとmarketplaceのstatic ruleはrepository descendantを探索しない。Copilotは、任意descendantのmanifest/catalogを
filenameが一致するだけでactivateしない。Local sourceがvalidateされたaccepted marketplace entryがpluginのrootを名指し、
censusがそのrootのfile — manifestを含む — をcatalog自身のrowの下に列挙する。Nested manifestをadmitするruleも
deriveするruleも存在せず、このcensusもproduct discovery/activationではなくInspector policyである。

1つの明示的にestablishedなplugin rootで、documented manifest recognition orderは`.plugin/plugin.json`、`plugin.json`、
`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`である。Marketplace orderは`marketplace.json`、
`.plugin/marketplace.json`、`.github/plugin/marketplace.json`、`.claude-plugin/marketplace.json`である。Inspectorは
全authored candidateを保持するが、共通rootと全earlier candidateが判明した場合だけlater provenanceをshadowedと
markできる。

## Inspector Global rule

Global inspectionは全session開始時に無効である。FR-013からFR-018およびFR-045の正確なconsent flow後、Copilotは次のrule群だけを
readできる — consent済み`COPILOT_HOME` boundary配下のrowと、FR-045が名指すconsent済み共有agent home配下のrowである。

| Rule ID | Boundary base | Selector program | Expansion | Class | Behavior refs | Runtime strategy | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|---|
| `copilot.global.instructions.root` | 正確なconsent済みcapture済み`COPILOT_HOME`。Absent時だけrequest-wideなimport済み`node:os.homedir()` captureと`.copilot`を`node:path.join`した値 | `['copilot-instructions.md']` | `exact` | `static-candidate` | `copilot.behavior.cli.user.instructions.root` | `copilot.cli.instructions.layering` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support` |
| `copilot.global.instructions.path` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['instructions', ANY_DIRECTORIES, /\.instructions\.md$/u]` | 固定`instructions/` directory配下の`recursive-subtree` | `static-candidate` | `copilot.behavior.cli.user.instructions.path`, `copilot.behavior.vscode.user.instructions` | `copilot.cli.instructions.layering`, `copilot.vscode.instructions.layering` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.instructions`, `github.copilot.instructions.support`, `vscode.copilot.instructions`, `vscode.copilot.settings` |
| `copilot.global.skill` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child`の後に`exact`。skill名は正確に直下1階層である | `static-candidate` | `copilot.behavior.cli.user.skills`、`copilot.behavior.vscode.user.skills` | `copilot.cli.skills.selection`、`copilot.vscode.skills.selection` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.reference`、`github.copilot.skills`、`github.copilot.cli.configuration` |
| `copilot.global.agent` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['agents', /\.agent\.md$/u]` | boundaryの`agents/`の`direct-child`。Pageは`.agent.md`というfilenameを文書化し、nested searchを文書化しない | `static-candidate` | `copilot.behavior.cli.user.agents`、`copilot.behavior.vscode.user.agents` | `copilot.cli.agents.selection`、`copilot.vscode.agents.selection` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.custom-agents`、`github.copilot.cli.configuration`、`github.copilot.cli.reference` |
| `copilot.global.hooks` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['hooks', /\.json$/u]` | boundaryの`hooks/`の`direct-child` | `static-candidate` | `copilot.behavior.cli.user.hooks`、`copilot.behavior.vscode.user.hooks` | `copilot.cli.hooks.composition`、`copilot.vscode.hooks.composition` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.hooks`、`github.copilot.cli.configuration` |
| `copilot.global.hooks.inline` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['settings.json']` | `exact`。`copilot.global.settings`がauthorするselectorの上にあり、inline `hooks` fieldはその1 fileの`hook` recognitionであるため、1つのpathに対する2つのruleは1回readされる1つのcandidateである | `static-candidate` | `copilot.behavior.cli.user.hooks` | `copilot.cli.hooks.composition` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.hooks`、`github.copilot.cli.configuration` |
| `copilot.global.settings` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['settings.json']` | `exact`。Documented settings cascadeのuser layerであり、JSONCでauthorされる | `static-candidate` | `copilot.behavior.cli.user.settings` | `copilot.cli.settings.precedence` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.configuration` |
| `copilot.global.mcp` | 同じ正確なconsent済み`<COPILOT_HOME>` boundary | `['mcp-config.json']` | `exact`。User-levelのMCP server定義 | `static-candidate` | `copilot.behavior.cli.user.mcp` | `copilot.cli.mcp.selection` | FR-013、FR-014、FR-015、FR-018、QR-005 | `github.copilot.cli.reference`、`github.copilot.cli.configuration` |
| `copilot.global.agents-home.skill` | Consent済み共有agent home: request-wideなimport済み`node:os.homedir()` captureと`.agents`を`node:path.join`した値であり、これを移動させる文書化済み設定は存在しない（FR-045） | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child`の後に`exact` | `static-candidate` | `copilot.behavior.cli.user.skills`、`copilot.behavior.vscode.user.skills` | `copilot.cli.skills.selection`、`copilot.vscode.skills.selection` | FR-013、FR-014、FR-018、FR-045、QR-005 | `github.copilot.cli.reference`、`github.copilot.skills` |

Present emptyまたはrelativeな`COPILOT_HOME`、もしくはmissingまたはreadableなdirectoryではないrootはinvalid
overrideであり、暗黙fallbackせず、そのtoolはabsentまたはfailedとして記録する（FR-014）。Root selection/admission中の
予期しないfailureはattemptを通常のerrorとしてfailさせる。同じboundary配下でも、vendorのautomatically managed file — application state、保存済みpermission、sessionとcommand historyのstate、session store、log、install済みplugin、plugin data、IDE state、MCPのOAuth/secret storage — と、LSP configuration、extensions、credentialはexcludedのままである。

## Derived ruleとrelationship index

| Rule ID | Accepted seed | 許可target | Behavior refs | Strategy refs | Closed derivationとstatus | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|

このvendorが参照するrelationship-only rule、すなわち
`copilot.relationship.prompt-reference`、`copilot.relationship.settings`、
`copilot.relationship.component`、`copilot.relationship.agent-context`は、
[中央relationship-only registry](../runtime-composition.ja.md#normative-relationship-only-registry)だけで一度定義する。
このindexはread authorityを与えず、定義を重複しない。

## Initial releaseの規範的presentation allowlist

次の表を、GitHub Copilotに対するclosedなFR-007 presentation allowlistとする。Kindの表記は正確な
`ToolRecognition.kind`値とする。

本releaseは読み取ったsourceの傍らに宣言済みmetadataを公開しない: detail surfaceは完全な
authored `sourceText`を提供するため、すべてのauthored valueは既に同じ画面に自身の綴りで存在しており、
caption付きの複製は1つの事実の2つ目の綴りになる。Recognitionが読み出すのはfile自身の宣言であり、fileが書いたkeyで公開する
（data-model.ja.md § Skillの表示）。そのうちinventory rowがgroupingに使うのは、そのkindのidentity
— `skill`ならそのfile自身に記述された名前、fileが記述しない場合はそのskill directory名（data-model.ja.md § 一覧の単位）— である。したがって本表が固定するのは、eligibleな
relationship kindとadmit済みsource formだけである。

最終列は規範的なsource-form applicabilityであり、注釈ではない。実効的なeligibilityは、rowのclosedな
relationship setと、candidate provenanceが特定する実際のadmit済みsource formについてsupportされる
exactなextractor occurrenceとの積集合とする。1つのrowに複数formを挙げても、それらのschemaをunionしたり、
一方のformのreferenceを他方でeligibleにしたりしない。Conformance fixtureとtestが両方のgateをcoverする。

Implementation開始時点で、この英日tableと[official-source contract](../official-sources.ja.md)に記録した言語別SHA-256
digest 2件をfreeze済みの承認済みdesign inputとする。Implementation gateはそれらを再計算してverifyするだけで、
eligible set、source form、extractor applicability、relationship kindをauthoringまたは
意味変更してはならない。この種の変更が必要ならdependent workを停止し、影響する英日design artifactをすべて同期し、
改訂contractを利用する前に`/speckit.plan`と`/speckit.tasks`を再実行する。

各rowは網羅的であり、`—`はeligible setが空であることを意味する。Contained Hook declarationは、すでにadmission済みのowner file上で
`hook` rowを使う。Ownerの別recognitionからfieldを取得せず、synthetic fileも作らない。MCPにcontained rowは
存在しない: MCP surfaceに合流するのは明示的なcarrierだけで、他のkindのfile内のinline MCP configurationは
そのkind自身の宣言contentである。Allowlistが記載しないreferenceは、
完全な`sourceText`だけに残す。宣言とその公開の間にallowlistは立たない: skillの宣言はfileが書いた
keyであり、authored keyの集合は閉じていない（FR-007）。Relationshipは、そのkindがこの表にあり、かつoriginが中央registryの適切な
relationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、connection、execution、import、
installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|
| `instructions` | — | 受理済み`*.instructions.md`、Repositoryの`.github/copilot-instructions.md`またはconsent済み`<COPILOT_HOME>/copilot-instructions.md`、`AGENTS.md`、またはCopilot recognition済み`CLAUDE.md`。Authored CLI `@path` targetはsource textであり、抽出されるreferenceではない。`applyTo`のようなsupported frontmatter valueは、targetではなくそのfileが統べる範囲を宣言する。Path-derived scopeとenablementはtyped factのままとする |
| `skill` | `skill-resource`<br>`context-inheritance` | 受理済み`SKILL.md`の正確なsupported frontmatter value/item occurrence。Relative resource referenceはrelationshipにできるがreadをauthorizeしない |
| `MCP` | `runtime-reference` | 受理済みCLI `mcpServers` fileまたはVS Code `.vscode/mcp.json` `servers` fileにあるserver-name map keyと正確なsupported server leaf/item occurrence。VS Code 1.118以降のroot `.mcp.json` provenanceはpath/surface-onlyで、direct documentationがschemaを確立するまでVS Code所有extractor fieldを追加しない。同じfileのCLI extractionは独立のまま。Environment/header valueはそのparserが解決した値とし、展開しない |
| `prompt/command` | `skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済みVS Code promptまたはroot direct-child CLI commandの正確なsupported frontmatter value/item occurrence。Matched pathから導出するprompt/command invocation nameはtyped provenanceのままとし、linkまたは`#file` targetはinertに保つ |
| `agent` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | 受理済みagents Markdown file — Repositoryの`.github/agents/*.md`か`.claude/agents/*.md`、またはconsent済みuserの`agents/*.agent.md` — の正確なsupported frontmatter value/item/map-entry occurrence。Body instructionは`sourceText`のまま保持し、`hooks`と`mcp-servers`はagent自身のfrontmatter宣言であって、hook recognitionもMCP recognitionも所有しない |
| `settings/config` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`runtime-reference` | 正確なsupported Repository/local、consent済みuser、またはcross-tool-compatible settings leaf/item/map-entry occurrence。Contained Hook valueは`hook` recognitionだけに属し、settingsはMCP recognitionを所有しない |
| `plugin` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済みCopilot plugin manifestの正確なmetadata/component-path leaf/item occurrenceと、entryがplugin名を解決する受理済みmarketplace fileの正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがplain-string sourceまたはobjectの`path` leafを表し、closedなlocal-manifest derivationをseedできる。Inline component bodyはactivateせず、inline Hook/MCP bodyと参照先script/assetはplugin metadata IDを取得せず、component pathはcandidateを作らない |
| `hook` | `runtime-reference` | 受理済みstandalone hook file、または受理済みsettings documentのcontained `hooks` blockにあるversion value、event map key、matcher value、正確なhandler leaf/item/map-entry occurrence。このvendorが文書化する他のowner — custom agentのfrontmatterとplugin自身のhook file — はそのcustomizationを構成するものとしてhookを宣言し、それらのoccurrenceは各kind自身の行に属する。Plugin Hook pathはrelationshipだけに保つ |

`plugin` rowのmanifestに関する記述 — 受理済みCopilot plugin manifest内のoccurrence — は、どのruleも
admitしないsource formを述べている: catalogのlocal root配下のmanifestはそのpluginが同梱するfileで
あり、repository自身のrootにあるmanifestはそのrepositoryが配布するpluginである
（§ Repository Inspector matcher rule）。これは消費者を持たないfrozen・digest記録済みのdesign input
であり、その変更はofficial-source contractのstop-and-regenerate ruleに従うdigest記録済みの変更で
ある。この行のderivation節 — `marketplace.plugin.source`単独がclosedなlocal-manifest derivationを
seedするという記述 — も同じ条件でfrozenであり、どのruleも行わないderivationを述べている: local source
がvalidateされる受理済みmarketplace entryはpluginのrootを名指し、censusがそのrootのfileをcatalog自身の
rowの下で列挙する。この行が統べているのはもう一方の半分、すなわち`copilot.repo.marketplace`がadmitする
catalogとplugin entryのoccurrenceである。

Initial releaseのCopilot recognitionは、sharedな`rule`、`output style`、`skill metadata` kindを使用しない。Typed surface、
path-derived scope/invocation、selection、precedence、trust、installation、enablement、default、applicability factはauthored
metadataではなく、どのsurfaceも公開しない。

## Documentedだがinitial scopeでexcluded

| Excluded Rule ID | Behavior refs | Inspector readから除外するdocumented surface | 理由と保持fact | Policy refs | Evidence |
|---|---|---|---|---|---|
| `copilot.excluded.additional-standard-locations` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, `copilot.behavior.cli.instructions.gemini` | Copilot recognitionとしてのVS Code `.claude/CLAUDE.md`、`CLAUDE.local.md`、`.claude/rules/**/*.md`、CLI non-root `CLAUDE.md`、`.claude/CLAUDE.md`、non-root `GEMINI.md` | Initial specificationはCopilotについてroot `CLAUDE.md`とroot `GEMINI.md`だけをadmit。`documented-but-excluded-by-initial-scope`を記録しvendor behaviorを否定しない | FR-003、FR-004、FR-024、QR-001、QR-005 | `vscode.copilot.instructions`, `github.copilot.cli.instructions` |
| `copilot.excluded.extra-directories` | `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.skills`, `copilot.behavior.cli.instructions.agents`, `copilot.behavior.cli.instructions.path`, `copilot.behavior.cli.skills` | `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`、`COPILOT_SKILLS_DIRS`、VS Code custom-location settings、user-configured skill location | Runtime-supplied rootはcondition factであり、Repository scan rootやrelationshipにしない | FR-001、FR-003、FR-024、QR-001、QR-005 | `github.copilot.cli.instructions`, `github.copilot.cli.reference`, `vscode.copilot.settings` |
| `copilot.excluded.vscode-settings` | `copilot.behavior.vscode.settings` | General Repository `.vscode/settings.json` | Documented VS Code setting inputだが、initial read allowlistは専用`.vscode/mcp.json` candidateと対応Copilot/Claude settings fileだけをadmit | FR-003、FR-004、QR-001、QR-005 | `vscode.settings`, `vscode.copilot.mcp` |
| `copilot.excluded.cli-lsp` | `copilot.behavior.cli.lsp` | Repository `.github/lsp.json` | Documented CLI LSP configurationだがSupported Initial Release Customization Fileではない | FR-003、FR-004、FR-020、QR-001、QR-005 | `github.copilot.cli.lsp` |
| `copilot.excluded.cli-extensions` | `copilot.behavior.cli.extensions` | Repository `.github/extensions/<name>/extension.{mjs,cjs,js}` | Documented experimental CLI extension surface。Executable contentはinitial allowlist外 | FR-003、FR-004、FR-020、QR-001、QR-005 | `github.copilot.cli.extensions` |
| `copilot.excluded.user-runtime` | `copilot.behavior.vscode.user.claude`, `copilot.behavior.vscode.user.skills`, `copilot.behavior.vscode.user.agents`, `copilot.behavior.vscode.user.prompts`, `copilot.behavior.vscode.user.hooks`, `copilot.behavior.vscode.user.mcp`, `copilot.behavior.vscode.user.settings`, `copilot.behavior.vscode.user.plugins`, `copilot.behavior.cli.user.plugins`, `copilot.behavior.cli.user.lsp`, `copilot.behavior.cli.user.extensions` | どのGlobal ruleもadmitしないuser surface: 別toolのhomeとVS Code profileのfile（`~/.claude/*`、profileのprompt、profileのMCPとsettings）、configuredな追加location、install済みpluginとplugin data、userのLSP configuration、userのextensions、permissions state、log、cache | 文書化済みUser behaviorは上記の表に残る。home横断またはprofileのreadはInspector recognitionを持たない記録済みbehaviorに留まり、vendorのautomatically managed fileはauthorされたカスタマイズではなくstateである | FR-013、FR-014、FR-015、FR-018、QR-001、QR-005 | `vscode.copilot.instructions`, `vscode.copilot.skills`, `vscode.copilot.settings`, `vscode.copilot.custom-agents`, `vscode.copilot.prompts`, `vscode.copilot.hooks`, `vscode.copilot.mcp`, `vscode.settings`, `vscode.copilot.plugins`, `github.copilot.plugins`, `github.copilot.cli.reference`, `github.copilot.skills`, `github.copilot.cli.custom-agents`, `github.copilot.cli.configuration`, `github.copilot.cli.plugins`, `github.copilot.hooks`, `github.copilot.cli.lsp`, `github.copilot.cli.extensions` |

Hosted Copilot stateを含むcross-vendorの`shared.excluded.managed-remote-state` ruleは、
[Shared non-read exclusions](../runtime-composition.ja.md#shared-non-read-exclusions)だけで定義する。

## 既知のconflictと不確実性

1. **CLI custom-agentのproject対user precedenceには未解決のofficial conflictがある。**
   `github.copilot.cli.reference`と`github.copilot.cli.configuration`はproject agentがuser agentより上位とする。
   `github.copilot.cli.custom-agents`と`github.copilot.cli.plugins`のloading diagramはuser agentがproject agentより
   上位とする。Inspectorは`documentation-conflict`を保持し、winnerを選んではならない。
2. **Nested `AGENTS.md`はsurface-specificである。** VS Codeのexperimental implementationはnested fileをinventoryし、
   modelがedited fileから判断する。Cloud documentationはnearest-file precedenceを定める。Cloud ruleをlocal VS Code
   behaviorへ投影してはならない。
3. **CLI command ancestryは確立されていない。** Command referenceは`.claude/commands/*.md`と同名skillより低いpriorityを
   文書化するが、完全なproject/user baseやancestor traversalを定義しない。Root direct-child Inspector matcherは
   conservative initial policyであり、runtime discoveryの主張ではない。
4. **複数のMCP/duplicate-name edgeが未解決である。** VS Codeはworkspace、user、organization、plugin source間のduplicate
   custom-agent/skill precedenceを完全には文書化しない。MCPでは1.118 release noteがworkspace root `.mcp.json`と
   most-specific ruleを追加する一方、current guideは`.vscode/mcp.json`とUser configurationだけを列挙し続ける。
   Root schemaとlocation間のtotal orderは未指定であり、conflictとunknown conditionを表示したままにする。
5. **Custom-agent context compositionは不完全である。** VS Codeはalways-on instructionsとselected profile bodyのprependを
   文書化する。Current Cloud/CLI sourceは別custom-agent/subagent context内の完全なinstruction orderやagent-profile skill
   preloadを定義しない。これらedgeはunknownのままとする。
6. **Authored plugin metadataはactivation evidenceではない。** Manifest/marketplaceはauthored candidateだけを証明する。
   Registration、installation、enabled state、component override、trust、hosted availabilityは独立factである。
7. **Documentationは急速に変化する。** Official Sources contractのcanonical page、列挙済みsection名、2026-07-20までのrecord別review日、
   semantic fingerprintをmaintenance baselineとし、search-result snippetをevidenceにしない。
