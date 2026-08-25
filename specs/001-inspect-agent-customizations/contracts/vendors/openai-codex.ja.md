# Vendor契約: OpenAI Codex

[English](openai-codex.md)

**契約バージョン**: 2026-07-20
**公式資料のreview日**: 2026-07-15

このcontractは、文書化済みCodex lookup behaviorとInspectorのread allowlistを分離する。共通matcher文法と
source-boundary ruleは[Inspection Path Allowlist Grammar and Index](../inspection-path-allowlist.ja.md)、
compositionとprecedenceは[Runtime Composition](../runtime-composition.ja.md)のID、evidence recordは
[Official Sources](../official-sources.ja.md)で定義する。

`behaviorId`はCodexのbehavior、`ruleId`はInspector policyを表す。Vendor locatorやbehavior recordはread
authorityを与えない。

## Surface boundary

ChatGPT desktop app、Codex CLI、Codex IDE extensionは、以下で**local client**としたbehaviorについて同じlocal
Codex host configurationを使う。ChatGPT Work webはlocal Codex configurationを読まない。

Plugin behaviorはより狭いsurfaceであり、**desktop appとplugin CLI**と記す。pluginsページは、marketplaceの
読み取り、install、cacheからのload、enablement値のすべてをChatGPT desktop appに帰属させ、その傍らでCodex CLIを
marketplace管理 — sourceの追加、一覧、更新、削除 — として文書化し、local pluginのinstallとtestにはdesktop appを
使えという指示で締めくくっている。IDE extensionはどこにも登場しないため、plugin behaviorを**local client**と
記せばページが何も確立していないclientを主張することになる。Marketplace discoveryとplugin installationを
hosted taskへ一般化してはならないのも同じである。

## Canonical evidence-assessment index

このcontractが所有する全`behaviorId`と`ruleId`は、自身の`documentationStatus`と`lifecycleQualifiers`を述べる。下記にないsubjectの
canonical valueは`documentationStatus: documented`、`lifecycleQualifiers: []`とする。これはEvidence cellからの
推論ではなく、未列挙subjectごとのclosed mappingである。Empty qualifierはlifecycle claimを行わず、`stable`を
意味しない。`documentation-conflict`はdocumentation statusではない。この語彙で互換性のない場合の綴りは`conflict`である。既存のStatus、Documentation
status、Inspector status列はrationaleまたはInspector scope stateであり、serializeするstatus scalarではない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `codex.behavior.repo.agents` | `partially-documented` | `[]` | Completeなproject directory searchが未指定 |
| `codex.behavior.repo.rules` | `partially-documented` | `[experimental]` | Nested recursionは未指定でrules featureはexperimental |
| `codex.behavior.user.rules` | `partially-documented` | `[experimental]` | `rules/`のstartup scanをuser layerとproject layerについて1つの文が同じに述べるため、nested recursionはどちらも未指定であり、rules featureはexperimental |
| `codex.behavior.user.prompts` | `documented` | `[deprecated]` | 文書化済みcustom-prompt surfaceはdeprecated |
| `codex.repo.agent` | `partially-documented` | `[]` | Rootの`.codex/agents/`は文書化されているが、完全なproject directory searchは十分に指定されていない |
| `codex.repo.rules` | `documented` | `[experimental]` | Inspector ruleは文書化済みdirect childだけをadmitし、未確立のnestingを除外する |

固定qualifier順は`preview`、`experimental`、`deprecated`とする。ここでは複数qualifierを持つrowはないが、一般の
orderingは必須のままである。Typed registryはdefaultとexceptionをsubjectごとに1 recordへ展開する。これらは
maintenance recordであり、どのresponseも運ばない（QR-005）。Candidate provenanceが公開するのはどのruleが
fileをadmitしたかであって、そのruleがどれだけ文書化されているかではない。

## 文書化済みRepository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversalまたはactivation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local client | Project rootからruntime `cwd` | Directoryごとに`AGENTS.override.md`、次に`AGENTS.md`、次に設定済みfallback basename | Rootから`cwd`へのwalkをセッション開始時に一度構築し、`cwd`で停止する — nestedなfileが参加するのは`cwd`がその位置以下にあるセッションだけで、project rootを検出できない場合は現在のdirectoryのみを確認する。Documented filename orderで最初のnon-empty fileを選択し、upstreamで設定されたbyte budgetで停止 | `codex.instructions.layering` | Documented | `openai.codex.agents-md` |
| `codex.behavior.repo.skills` | Local client | Runtime `cwd`からrepository root | `.agents/skills/<name>/SKILL.md` | 上向きchainの各directoryをscan。同名skillはmergeしない | `codex.skills.discovery` | Documented | `openai.codex.skills` |
| `codex.behavior.repo.agents` | Local client | Project scope | `.codex/agents/*.toml` | Standalone TOML fileがspawned-session configuration layerを定義。Project内で探索する全directoryは資料上完全には明記されない | `codex.agents.inheritance` | Partially documented | `openai.codex.subagents` |
| `codex.behavior.repo.config` | Local client | Project rootからruntime `cwd` | `.codex/config.toml` | Trusted project layerをrootから`cwd`へすべてload。同じkeyは最も近い値が勝ち、relative pathは包含する`.codex/` directory基準 | `codex.config.precedence` | Documented | `openai.codex.config-basic` |
| `codex.behavior.repo.hooks` | Local client | Activeなtrusted project config layerすべて | `.codex/hooks.json`と`.codex/config.toml`内inline `[hooks]` | Matching hookはすべてadditive。同じlayerのfileとinline tableはwarning付きで両方load | `codex.hooks.additive` | Documented | `openai.codex.hooks`, `openai.codex.config-basic` |
| `codex.behavior.repo.rules` | Local client | Activeなtrusted project config layerすべて | `.codex/rules/*.rules` | Codexはstartup時にlayerの`rules/` directoryをscan。Official textはnested subdirectory recursionを確立しない | `codex.rules.resolution` | Partially documented、experimental | `openai.codex.rules` |
| `codex.behavior.repo.mcp` | Local client | Active project config layer | `.codex/config.toml`内`[mcp_servers.*]` | MCP declarationはconfig-layer resolutionに従い、project layerはtrust必須 | `codex.mcp.configuration` | Documented | `openai.codex.mcp`, `openai.codex.config-basic` |
| `codex.behavior.repo.marketplace` | ChatGPT desktopとplugin-management CLI | 正確なrepository root | `.agents/plugins/marketplace.json`、legacy-compatibleな`.claude-plugin/marketplace.json` | Catalogはinstallation用pluginを公開するが、installed/enabledの証明ではない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |
| `codex.behavior.plugin.manifest` | ChatGPT desktopとplugin-management CLI | Marketplaceまたはinstallationが選択したplugin root | `.codex-plugin/plugin.json` | 必須plugin entry point。任意のmatching fileをenabled pluginとして自動発見しない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |

plugin名がRepository fileに到達するのに設定手順を要さない点が、Claude CodeおよびCopilotとの
差である。desktop clientは正確な`$REPO_ROOT/.agents/plugins/marketplace.json`と、legacy互換の
`$REPO_ROOT/.claude-plugin/marketplace.json`にあるrepo catalogを読むため、commitされたcatalogは
それ自体でvendorが考慮するsourceであり、登録するsettings entryは存在しない。各`plugins[]` entryは
`source.path`をmarketplace rootからの`./`接頭辞付き相対pathでplugin folderに向け、そのfolderが
必須の`.codex-plugin/plugin.json`を持つ。そのfolderを`codex.repo.marketplace`自身のruleが名指し、
scanがそれを列挙して、配下の全fileをそのpluginが同梱するfileとして公開する。`.codex/config.toml`にある別のcatalogを名指す値は、readを与えずcandidateも作らない
記録上のrelationshipに留まる。installationとplugin単位のenablementはUser stateであり — Codexの
plugin cache配下のinstalled copyと、User configuration中のon/off値 — いずれもRepositoryの事実では
ない。

## Inspector Repository rule

この表のBaseはすべて正確なInspector Repository boundary — selected Repository root、表記は`Repository` — である。`descendant-inventory` expansionを
使えるのは、vendorがworked-fileまたはdescendant anchorを通じてあらゆる深さで文書化しているlocationだけである。Codexはそれを文書化していないため、
以下のselectorはすべてrootにanchorされ、どの行もCodexが下向きwalkするとは主張しない。
より狭いexclusionまたはGlobal requirementを後述しない限り、全行のpolicy referenceはFR-003、FR-004、
FR-005、FR-024、QR-001、QR-004、QR-005である。

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.repo.instructions` | Repository | `['AGENTS.override.md']`、`['AGENTS.md']` | Repository rootでの各selectorの`exact`。ページはrepository rootからruntime `cwd`へ下り、そこで停止する。したがってnestedなinstruction fileは`cwd`がその位置以下にあるセッション — この製品が選択しないruntime context — に属し、candidateではなく恒久的にnear missである | `static-candidate` | `codex.behavior.repo.instructions` | Documented。Runtime chainはconditional | `openai.codex.agents-md` |
| `codex.repo.skill` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | Repository rootにanchorした`exact`の後に`direct-child`。Skill nameは1 direct child。Codexのskill scanはworking directoryから*上向き*に走る。Allowlistは選択されたRepository rootにanchorされ、そのrootのcustomizationを報告する（FR-003）ため、1つ下のnested `.agents/skills`はこのproductが選択しないworking directoryに属し、candidateではなくnear missとなる。そのdirectoryへの依存はrecognitionの`runtime-cwd` conditionである | `static-candidate` | `codex.behavior.repo.skills` | Documented。Runtime chainはconditional | `openai.codex.skills` |
| `codex.repo.agent` | Repository | `['.codex', 'agents', /\.toml$/u]` | Repository rootの`.codex/agents/`の`direct-child`。ページはproject scopeとして`.codex/agents/`を挙げ、nested searchは文書化していない | `static-candidate` | `codex.behavior.repo.agents` | Partially documented | `openai.codex.subagents` |
| `codex.repo.config` | Repository | `['.codex', 'config.toml']` | Repository rootでの`exact`。ページはproject config layerをproject rootからruntime `cwd`へ読み込む | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.mcp`, `codex.behavior.repo.hooks` | Documented。Trust/runtime chainはconditional | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.repo.settings` | Repository | `['.codex', 'config.toml']` | `codex.repo.config`がauthorするselectorの上でのRepository rootでの`exact`。2つのruleが1つのfileをadmitし、walkはそれらを1回のreadで1つのcandidateへmergeする。vendor contractがそのcarrierに`MCP`と`settings/config`の別々のrecognitionを与えており、recognitionはruleが生むものだからである | `static-candidate` | `codex.behavior.repo.config` | Documented。Trust/runtime chainはconditional | `openai.codex.config-basic` |
| `codex.repo.hooks` | Repository | `['.codex', 'hooks.json']` | Repository rootでの`exact`。ページはproject locationとして`<repo>/.codex/hooks.json`を挙げる | `static-candidate` | `codex.behavior.repo.hooks` | Documented。Trust/hook reviewはconditional | `openai.codex.hooks` |
| `codex.repo.rules` | Repository | `['.codex', 'rules', /\.rules$/u]` | Repository rootの`rules/` directoryの`direct-child`。ページは`<repo>/.codex/rules/`を挙げ、nested recursionは文書化していない。`permissions`として認識する: このfileはsandbox外でどのcommandを実行してよいかを決めるものであり、Claudeが自身の`rules/`に置くinstruction fileとは主題が異なる | `static-candidate` | `codex.behavior.repo.rules` | Experimental。Nested rule directoryはexcluded | `openai.codex.rules` |
| `codex.repo.marketplace` | Repository | `['.agents', 'plugins', 'marketplace.json']`、`['.claude-plugin', 'marketplace.json']` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | 正確なRepository-root location | `openai.codex.plugins` |

受理済み`config.toml`内のinline MCP serverとinline hookはそのfileのmetadataであり、別candidateを作らない。
Standalone `.mcp.json`はCodex Repository candidateではない。Inspectorは任意の
`.codex-plugin/plugin.json`を再帰探索せず、そもそもどのruleもmanifestをadmitしない: catalogの
local root配下のmanifestは、そのpluginが同梱するfileの1つである（§ Derived Repository rule）。

## Derived Repository rule

`Status`はupstream evidenceに関するhuman-readable rationaleであり、ruleの正確なdocumentation statusは上記canonical
indexが所有する。`documented` assessmentであっても、Inspectorのclosed derivationがCodex product behaviorに
なるわけではない。

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | Walkの前に構成として読み、決してpublishしない、固定されたrepositoryの`.codex/config.toml` | 宣言された各fallback basenameを1つのentry名としてRepository rootで突き合わせる — どのentryも名乗らない名前は何にも一致しない。Excluded higher layerがoverrideし得るためruntime selectionはconditionalで、利用可能なcapacityはNode.jsと実行環境から継承する | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |
`.codex-plugin/plugin.json`をadmitするruleは存在せず、導出するruleも存在しない。ただしcatalog rule
は、各offeringのmanifestがどこにあるかは名指す。surfaceがpluginの同梱fileの中からplugin自身の宣言を
開けるようにするためであり、pathを名指すことはcandidateをadmitすることではない。Plugin rootは
discoverされるものではなくactivateされるものであり、clientがどのrootをloadするかはcatalog entry
またはCodex plugin cacheのinstall済みcopyが決める。自身のrootにmanifestを持つrepositoryは、
ここでclientが読むcustomizationを持っているのではなく、他者がinstallするpluginを公開している
のであり、そのpathはrootを含むどの深さでもnear missである。

代わりに、repository catalogのlocal entryが名指す先を列挙する。`codex.repo.marketplace`が
catalogをadmitし、それをadmitしたruleが各local entryのpluginがどこにあるかに答える —
`<Repository root>/<validated-local-source>/`。sourceは文書化済みlocal formを使い`./`で始まり
root内に留まる。scanはそのdirectoryを列挙し、配下の全regular fileをそのpluginが同梱するfileと
して公開する
（contracts/inspection-path-allowlist.ja.md § Bounded companion census）。pluginのmanifestも
そのうちの1つである。いずれもcandidateにはならない: rule、recognition、kind、自身のinventory
rowのいずれも得ない。

Skillのsibling `agents/openai.yaml`は意図的にderived candidateではない。所有元skillのbounded
companion censusが、skillのdirectoryが持つfileの一つとして既に読み取り・公開しており、detail
surfaceがそこでそれを列挙して開くため、derivationはinventoryが既に持つfileを再admissionする
ことになる。

Repository catalogのmarketplace rootはRepository rootであり、`./`のlocal sourceはこれに対して解決される。
Pageはこれをpersonal scopeで示している: `~/.agents/plugins/marketplace.json`のcatalogのそばに文書化された
パターンは`./.codex/plugins/<plugin-name>`であり、これはcatalog自身のdirectoryではなくhome directoryに対して
解決されるpathである。その規則のrepository側がRepository rootであり、`.agents/plugins/marketplace.json`の
catalogのそばの`./plugins/my-plugin`は`plugins/my-plugin`となる。

Manifestが宣言するcomponent — plugin skill、MCP file、app mapping、hook file、asset、script、
remote source — はrelationship-onlyである。宣言された値はどのreadにも到達せず、local marketplace
entryからこれらcomponentへ再帰展開してはならない。

それでも同じfileは、plugin root内にある限り読まれる。Plugin rootはdirectory形式のcustomizationで
あり、そのbounded companion censusがrootを列挙するからである
（contracts/inspection-path-allowlist.ja.md § Bounded companion census）。両者は別のmechanismで
あり、その違いこそがこのexclusionの述べる内容である: fileはpluginのdirectoryにあるから読まれるので
あって、manifestが指したから読まれるのではない。したがってrootの外へ出る宣言されたpathや、何も
指さないpathは、どこからも開かれない。Census済みのfileはrule、recognition、kind、自身のinventory
rowのいずれも得ず、そのmanifestへ到達したofferingのrowで、pluginのfileの1つとして公開される。

## 文書化済みUser behavior

この表はmaintainer向けにCodexの対応を記録するもので、Global inspectionを拡張しない。引用ページはuser skillの
場所として`$HOME/.agents/skills`を、user configuration directoryとして`~/.codex`を文書化しているが、
`$HOME/.agents`を再配置するoverrideはいずれのページも文書化していない。したがってInspectorは両directoryを
別物として扱い、再配置は記録しない。`CODEX_HOME` overrideが動かすのは下表の`<CODEX_HOME>` locatorだけである。

| Behavior ID | User behavior | User locator | Strategy / composition | Inspector status | Evidence |
|---|---|---|---|---|---|
| `codex.behavior.user.instructions` | Instruction fallback | `<CODEX_HOME>/AGENTS.override.md`、なければ`<CODEX_HOME>/AGENTS.md` | `codex.instructions.layering`。最初のnon-empty global candidateがproject chainより前 | 後述`codex.global.instructions`だけでAccepted | `openai.codex.agents-md` |
| `codex.behavior.user.config` | User configurationとMCP | `<CODEX_HOME>/config.toml`、`<CODEX_HOME>`内profile file | `codex.config.precedence`、`codex.mcp.configuration`。Local clientはhost configurationを共有 | `codex.excluded.user-runtime` | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.behavior.user.agents` | Personal custom agent | `<CODEX_HOME>/agents/*.toml` | `codex.agents.inheritance`。Custom nameはbuilt-in名をoverrideしomitted fieldはparent sessionからinherit | `codex.excluded.user-runtime` | `openai.codex.subagents` |
| `codex.behavior.user.skills` | User skill | `$HOME/.agents/skills/<name>/SKILL.md` | `codex.skills.discovery`。Repository/admin/system skillに加えてavailableで同名skillはmergeしない | `codex.excluded.user-runtime` | `openai.codex.skills` |
| `codex.behavior.user.hooks` | User hook | `<CODEX_HOME>/hooks.json`と`<CODEX_HOME>/config.toml`内inline hook | `codex.hooks.additive`。Project/plugin hookとadditive | `codex.excluded.user-runtime` | `openai.codex.hooks` |
| `codex.behavior.user.rules` | User rule | `<CODEX_HOME>/rules/*.rules` | `codex.rules.resolution`。Active user config layerとしてscan | `codex.excluded.user-runtime` | `openai.codex.rules` |
| `codex.behavior.user.plugins` | Personal marketplaceとplugin | `$HOME/.agents/plugins/marketplace.json`、Codex state配下installed/cache path | `codex.plugins.activation`。Catalog、installation、enablement、cached copyは別state | `codex.excluded.user-runtime` | `openai.codex.plugins` |
| `codex.behavior.user.prompts` | Deprecated custom prompt | `<CODEX_HOME>/prompts/*.md` | Explicit invocationのみ。Skillを推奨しdeprecated | `codex.excluded.user-runtime` | `openai.codex.custom-prompts` |
| `codex.behavior.user.memories` | Local memory | `<CODEX_HOME>/memories/`と関連local state | Local-client memory control。Repository customization fileではない | `codex.excluded.user-runtime` | `openai.codex.memories` |

## Inspector Global rule

Global inspectionはsession開始時に無効である。FR-013からFR-018の正確なconsent flow後、Codexは次のruleだけを
readできる。

| Rule ID | Boundary base | Selector programとselection | Expansion | Class | Behavior refs | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.global.instructions` | 正確なconsent済みcapture済み`CODEX_HOME`。Absent時だけrequest-wideなimport済み`node:os.homedir()` captureと`.codex`を`node:path.join`した値 | `['AGENTS.override.md']`、次に`['AGENTS.md']` | `exact`、first-non-empty selection | `static-candidate` | `codex.behavior.user.instructions` | FR-013、FR-014、FR-017、FR-018、QR-005 | `openai.codex.agents-md` |

Immutable planは、この2つのexact selectorをその順序で持つclosedな`codex-global-first-non-empty` policyを使う。
安全にnon-emptyと確定したoverrideはshort-circuitし、`absent`または安全にemptyと確定したoverrideだけが
`AGENTS.md`へ進む。

Absentなoverride—fileが存在しない場合—は`AGENTS.md`へのfallbackを進める。Symlinkされたoverrideは
他のfileと同じようにtargetを透過的にreadする。Readできない、またはbinaryなoverrideは、代わりにそのfileの
diagnosticとともにbranchを終了し、fallbackへ進まない（FR-035）。予期しないfailureはfallbackを選択せず、
attemptを通常のerrorとしてfailさせる。

NUL byteを1つでも含むcandidateはbinaryかつdiagnostic-onlyとし、他の点ではpublish可能なgenerationを
partialにしてfallbackへ進まない。NULを含まない全byte streamはUTF-8 replacement semanticsで正確に1回だけ
decodeする。先頭BOMを1つ記録して取り除く。Decodeが`U+FFFD`を挿入した場合、`utf-8-replaced`はその全characterを、parse、
extraction、display、comparisonに使うgarbled source全体へ保持する。Replacementだけでcompleteとし、別charsetを推測もretryも
しない。Emptyはoptionalな先頭BOMを除くdecoded stringの`String.prototype.trim().length === 0`を意味し、whitespace-only
fileはemptyとする。Inspectorは選択したnon-empty fileだけをpublishして両方はpublishしない。

Present emptyまたはrelativeな`CODEX_HOME` override、もしくはmissingまたはreadableなdirectoryではないrootから
暗黙fallbackせず、そのtoolはabsentまたはfailedとして記録する（FR-014）。Root selection/admission中の予期しない
failureはattemptを通常のerrorとしてfailさせる。同じdirectory配下でもuser config、agent、skill、hook、
rule、MCP、plugin、prompt、memory、credential、log、session、cacheはexcludedのままである。

## Relationship-onlyとexcluded group

Relationship-only `ruleId`は[Runtime Composition](../runtime-composition.ja.md)で定義する。次の説明は
non-normative indexにすぎない。Codexではこれらのruleがarbitrary config path、plugin component declaration、hook
command、server-provided MCP instruction、parent/child custom-agent contextを扱い、target readを認可しない。

Grouped User exclusionは自身のassessmentとしてlifecycle claimなしの`documented`を持つ。参照先の
experimental ruleとdeprecated promptはそれぞれ自身のmaintenance recordと自身のqualifierを保持する。それらを
exclusion ruleやunionへ平坦化するものは無く、まとめて運ぶassessment arrayも存在しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | Consent済みinstruction fallback以外の上記User surfaceすべて。Managed/system configurationとlocal state | `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, `codex.behavior.user.skills` | FR-013、FR-014、FR-017、FR-018、QR-001、QR-004、QR-005 | `codex.agents.inheritance`, `codex.config.precedence`, `codex.hooks.additive`, `codex.mcp.configuration`, `codex.plugins.activation`, `codex.rules.resolution`, `codex.skills.discovery` | `documented` | `openai.codex.config-basic`, `openai.codex.custom-prompts`, `openai.codex.hooks`, `openai.codex.mcp`, `openai.codex.memories`, `openai.codex.plugins`, `openai.codex.rules`, `openai.codex.skills`, `openai.codex.subagents` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skill、MCP、app、hook、asset、script、installed/cache copy | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003、FR-004、FR-024、QR-001、QR-004、QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## Initial releaseの規範的presentation allowlist

次の表を、OpenAI Codexに対するclosedなFR-007 presentation allowlistとする。Kindの表記は正確な
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

各rowは網羅的であり、`—`はeligible setが空であることを意味する。単一のadmission済み`.codex/config.toml` carrierは、
別々の`MCP`、`settings/config`、contained `hook` recognitionを所有できる。各occurrenceはそのdeclaration familyを所有する
rowだけに属する。Allowlistが記載しないreferenceは、完全な`sourceText`だけに残す。宣言とその公開の間にallowlistは立たない: skillの宣言はfileが書いたkeyであり、authored keyの集合は閉じていない（FR-007）。Relationshipは、そのkindがこの表にあり、
かつoriginが中央registryの適切なrelationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、
connection、execution、import、installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|
| `instructions` | — | 受理済みstatic、configured-fallback、またはGlobal instruction file。Authored reference状のtokenはsource textであり、抽出されるreferenceではない。Path-derived scope/orderとbyte-budget factはtyped stateでありmetadataではない |
| `permissions` | `runtime-reference` | 受理済みdirect-child `.rules` fileの正確なargument/value/item occurrence。Commentと未列挙Starlark expressionはsource textだけに残す |
| `skill` | `skill-resource`<br>`runtime-reference` | 受理済み`SKILL.md`の正確な`name`と`description` frontmatter value。Resource/script/reference targetはrelationshipになり得るが、そのedgeを通じてreadしない |
| `agent` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | 受理済み`.codex/agents/*.toml`の正確なsupported TOML value/item/map-key occurrence。MCPはinherited/carrier relationshipのままで、agent所有のMCP recognitionにはならない |
| `hook` | `runtime-reference` | 受理済みstandalone `hooks.json`またはinline `[hooks]`のevent map key、matcher value、handler leaf。同じlayerのstandalone occurrenceとinline occurrenceは別provenanceのままとする |
| `MCP` | `runtime-reference` | Admission済みconfig carrierの`[mcp_servers.*]`配下にあるserver/table nameと正確なsupported leaf/item occurrence。Process environment valueは置換しない |
| `settings/config` | `agent-reference`<br>`skill-resource`<br>`runtime-reference`<br>`fallback` | Admission済みconfig carrierの正確なsupported TOML value/item/map-key occurrence。MCP/Hook declarationは別のrecognition rowだけに属し、configured target pathはread authorityを得ない |
| `plugin` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`runtime-reference` | 受理済み`.codex-plugin/plugin.json`の正確なmetadata/component/presentation leaf/item occurrenceと、entryがplugin名を解決する受理済みRepository-root marketplace fileの正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがclosedなlocal-manifest derivationをseedできる。`hooks` field omitted時はregistry定義済みdocumented-default component relationshipだけをemitできる |
| `skill metadata` | `skill-resource`<br>`runtime-reference` | Derived `agents/openai.yaml`の正確なsupported YAML leaf/item occurrence。Seed provenanceはtyped stateであり、このfileはowner `SKILL.md`のmetadata identityを継承しない |

`plugin` rowのmanifestに関する記述 — 受理済み`.codex-plugin/plugin.json`内のoccurrenceと、
`marketplace.plugin.source`がseedするlocal-manifest derivation — は、どのruleもadmitしないsource form
と、どのruleも行わないderivationを述べている（§ Derived Repository rule）。これらは下の
`skill metadata` rowと同じく、消費者を持たないfrozen・digest記録済みのdesign inputであり、いずれの
変更もofficial-source contractのstop-and-regenerate ruleに従うdigest記録済みの変更である。この行が
今統べているのはもう一方の半分、すなわちcatalog entry自身のoccurrenceである。

Initial releaseのCodex recognitionは、sharedな`prompt/command`または`output style` kindを使用しない。
Initial releaseのrecognitionは`skill metadata` kindも使用しない: sibling `agents/openai.yaml`は
candidateとしてadmissionされず、所有元skillのcensus companionとして公開されるため
（§ Derived Repository rule）、上の`skill metadata` rowは消費者を持たないfrozen・digest記録済みの
design inputである。そのrowの消費または削除は、official-source contractの
stop-and-regenerate ruleに従うdigest記録済みの変更である。Typed layer、
path-derived scope、selection、precedence、trust、default、applicability factはauthored metadataではなく、どのsurfaceも公開しない。

## 既知の不確実性と必須condition fact

1. Custom-agent pageは`.codex/agents/`のproject scopeを確立するが、directory traversalを完全には定義しない。
   Descendant authored fileはconditional inventoryのままとする。
2. Rules pageはactive layerごとの`rules/` scanを示すが、recursive subdirectoryを文書化しない。Read allowlistは
   direct `.rules` childだけを受理する。
3. Repository config、hook、rule、MCPはproject-root detection、runtime `cwd`、project trustに依存する。
   Inventory存在はloadの証明ではない。
4. Instruction fallback nameとupstream byte budgetはexcluded user/profile/CLI inputで変更できる。全必須inputが
   判明した場合だけInspectorはfileをselectedまたはomittedと呼べる。このvendor runtime budgetをInspectorのvalidity ruleにはしない。
5. Plugin manifestやmarketplaceはauthored metadataだけを証明する。Installed copy、enabled state、component override、
   hosted availabilityは独立factである。
6. Hosted ChatGPT Workはlocal Codex fileを読まない。Local-file recognitionをhosted taskへprojectしてはならない。
7. Pluginは、それを提供するcatalogによって限定される。Pageはmanifestの`name`をpluginのidentifierかつ
   component namespaceと呼び、pluginを`<cache>/<marketplace>/<plugin>/<version>`へinstallするため、
   2つのcatalogが提供する同じ名前は2つのinstallである。したがってinventoryはcatalog自身の`name`と
   pluginの名前の組でrowをkeyし、manifestは、そのentryが到達したcatalogに属する。Pageが述べていないのは、その組の綴りと、
   1つのcatalogのentryと、それが指すmanifestとが異なる名前を宣言したときclientがどうするかである。
   Inventoryが描く綴り`plugin@marketplace`はCLI自身のものである: `codex plugin add`と
   `codex plugin remove`は`PLUGIN[@MARKETPLACE]` selectorを取り、`codex plugin list`は限定された形を
   表示し、`~/.codex/config.toml`はplugin単位のstateをそれでkeyする（codex-cli 0.144.6に対する観測で
   あり、引用したpageが確立したものではない）。食い違いについてrowはresolutionを述べない（FR-009）。
