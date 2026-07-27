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
Codex host configurationを使う。ChatGPT Work webはlocal Codex configurationを読まない。Repository marketplace
discoveryとplugin installationにもdesktop/CLI固有の管理behaviorがあり、hosted taskへ一般化してはならない。

## Canonical evidence-assessment index

このcontractが所有する全`behaviorId`と`ruleId`は正確に1件の`EvidenceAssessment`を持つ。下記にないsubjectの
canonical valueは`documentationStatus: documented`、`lifecycleQualifiers: []`とする。これはEvidence cellからの
推論ではなく、未列挙subjectごとのclosed mappingである。Empty qualifierはlifecycle claimを行わず、`stable`を
意味しない。`documentation-conflict`はruntimeの`ConditionFact.status`だけに残す。既存のStatus、Documentation
status、Inspector status列はrationaleまたはInspector scope stateであり、serializeするstatus scalarではない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `codex.behavior.repo.agents` | `partially-documented` | `[]` | Completeなproject directory searchが未指定 |
| `codex.behavior.repo.rules` | `partially-documented` | `[experimental]` | Nested recursionは未指定でrules featureはexperimental |
| `codex.behavior.user.rules` | `documented` | `[experimental]` | 文書化済みUser rules surfaceはexperimental |
| `codex.behavior.user.prompts` | `documented` | `[deprecated]` | 文書化済みcustom-prompt surfaceはdeprecated |
| `codex.repo.agent` | `partially-documented` | `[]` | Descendant inventoryは完全に指定されたproject search外のpossible contextを含む |
| `codex.repo.rules` | `documented` | `[experimental]` | Inspector ruleは文書化済みdirect childだけをadmitし、未確立のnestingを除外する |

固定qualifier順は`preview`、`experimental`、`deprecated`とする。ここでは複数qualifierを持つrowはないが、一般の
orderingは必須のままである。Typed registryはdefaultとexceptionをsubjectごとに1 recordへ展開する。Candidate
provenanceとrelationship DTOは、直接参照するrule/behavior/strategyのassessmentをsort/deduplicate済み
`EvidenceAssessment[]`へすべて保持し、scalarまたはqualifier unionへ平坦化しない。

## 文書化済みRepository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversalまたはactivation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local client | Project rootからruntime `cwd` | Directoryごとに`AGENTS.override.md`、次に`AGENTS.md`、次に設定済みfallback basename | Rootから`cwd`へwalkし、documented filename orderで最初のnon-empty fileを選択。Upstreamで設定されたbyte budgetで停止 | `codex.instructions.layering` | Documented | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.behavior.repo.skills` | Local client | Runtime `cwd`からrepository root | `.agents/skills/<name>/SKILL.md` | 上向きchainの各directoryをscan。同名skillはmergeしない | `codex.skills.discovery` | Documented | `openai.codex.skills` |
| `codex.behavior.repo.agents` | Local client | Project scope | `.codex/agents/*.toml` | Standalone TOML fileがspawned-session configuration layerを定義。Project内で探索する全directoryは資料上完全には明記されない | `codex.agents.inheritance` | Partially documented | `openai.codex.subagents` |
| `codex.behavior.repo.config` | Local client | Project rootからruntime `cwd` | `.codex/config.toml` | Trusted project layerをrootから`cwd`へすべてload。同じkeyは最も近い値が勝ち、relative pathは包含する`.codex/` directory基準 | `codex.config.precedence` | Documented | `openai.codex.config-basic` |
| `codex.behavior.repo.hooks` | Local client | Activeなtrusted project config layerすべて | `.codex/hooks.json`と`.codex/config.toml`内inline `[hooks]` | Matching hookはすべてadditive。同じlayerのfileとinline tableはwarning付きで両方load | `codex.hooks.additive` | Documented | `openai.codex.hooks`, `openai.codex.config-basic` |
| `codex.behavior.repo.rules` | Local client | Activeなtrusted project config layerすべて | `.codex/rules/*.rules` | Codexはstartup時にlayerの`rules/` directoryをscan。Official textはnested subdirectory recursionを確立しない | `codex.rules.resolution` | Partially documented、experimental | `openai.codex.rules` |
| `codex.behavior.repo.mcp` | Local client | Active project config layer | `.codex/config.toml`内`[mcp_servers.*]` | MCP declarationはconfig-layer resolutionに従い、project layerはtrust必須 | `codex.mcp.configuration` | Documented | `openai.codex.mcp`, `openai.codex.config-basic` |
| `codex.behavior.repo.marketplace` | ChatGPT desktopとplugin-management CLI | 正確なrepository root | `.agents/plugins/marketplace.json`、legacy-compatibleな`.claude-plugin/marketplace.json` | Catalogはinstallation用pluginを公開するが、installed/enabledの証明ではない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |
| `codex.behavior.plugin.manifest` | Plugin対応local client | Marketplaceまたはinstallationが選択したplugin root | `.codex-plugin/plugin.json` | 必須plugin entry point。任意のmatching fileをenabled pluginとして自動発見しない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |

## Inspector Repository rule

この表のBaseはすべて正確なInspector Repository boundary — selected Repository root、表記は`Repository` — である。`descendant-inventory` expansionは
boundary配下の可能なruntime contextをinventoryするだけであり、Codexが下向きwalkするとは主張しない。
より狭いexclusionまたはGlobal requirementを後述しない限り、全行のpolicy referenceはFR-003、FR-004、
FR-005、FR-024、QR-001、QR-004、QR-005である。

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.repo.instructions` | Repository | `['AGENTS.override.md']`、`['AGENTS.md']` | Repository rootでの各selectorの`exact`。ページはrepository rootからruntime `cwd`へ下る | `static-candidate` | `codex.behavior.repo.instructions` | Documented。Runtime chainはconditional | `openai.codex.agents-md` |
| `codex.repo.skill` | Repository | `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | Repository rootにanchorした`exact`の後に`direct-child`。Skill nameは1 direct child。Codexのskill scanはworking directoryから*上向き*に走る。Allowlistは選択されたRepository rootにanchorされ、そのrootのcustomizationを報告する（FR-003）ため、1つ下のnested `.agents/skills`はこのproductが選択しないworking directoryに属し、candidateではなくnear missとなる。そのdirectoryへの依存はrecognitionの`runtime-cwd` conditionである | `static-candidate` | `codex.behavior.repo.skills` | Documented。Runtime chainはconditional | `openai.codex.skills` |
| `codex.repo.agent` | Repository | `['.codex', 'agents', /\.toml$/u]` | Repository rootの`.codex/agents/`の`direct-child`。ページはproject scopeとして`.codex/agents/`を挙げ、nested searchは文書化していない | `static-candidate` | `codex.behavior.repo.agents` | Partially documented | `openai.codex.subagents` |
| `codex.repo.config` | Repository | `['.codex', 'config.toml']` | Repository rootでの`exact`。ページはproject config layerをproject rootからruntime `cwd`へ読み込む | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.mcp`, `codex.behavior.repo.hooks` | Documented。Trust/runtime chainはconditional | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.repo.hooks` | Repository | `['.codex', 'hooks.json']` | Repository rootでの`exact`。ページはproject locationとして`<repo>/.codex/hooks.json`を挙げる | `static-candidate` | `codex.behavior.repo.hooks` | Documented。Trust/hook reviewはconditional | `openai.codex.hooks` |
| `codex.repo.rules` | Repository | `['.codex', 'rules', /\.rules$/u]` | Repository rootの`rules/` directoryの`direct-child`。ページは`<repo>/.codex/rules/`を挙げ、nested recursionは文書化していない | `static-candidate` | `codex.behavior.repo.rules` | Experimental。Nested rule directoryはexcluded | `openai.codex.rules` |
| `codex.repo.plugin-manifest` | Repository | `['.codex-plugin', 'plugin.json']` | `exact`。Selected Repository rootをauthored plugin rootとして扱う | `static-candidate` | `codex.behavior.plugin.manifest` | Inspectorのauthored-project policyだけ。Codex plugin discovery/activationではない | `openai.codex.plugins` |
| `codex.repo.marketplace` | Repository | `['.agents', 'plugins', 'marketplace.json']`、`['.claude-plugin', 'marketplace.json']` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | 正確なRepository-root location | `openai.codex.plugins` |

受理済み`config.toml`内のinline MCP serverとinline hookはそのfileのmetadataであり、別candidateを作らない。
Standalone `.mcp.json`はCodex Repository candidateではない。Inspectorは任意の
`.codex-plugin/plugin.json`を再帰探索しない。Nested manifestは後述のclosed local-marketplace derivationを通じて
のみ受理する。

## Derived Repository rule

`Status`はupstream evidenceに関するhuman-readable rationaleであり、ruleの正確な`EvidenceAssessment`は上記canonical
indexが所有する。`documented` assessmentであっても、Inspectorのclosed derivationがCodex product behaviorに
なるわけではない。

| Rule ID | Class | Accepted seed | Closed derived target | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.local-plugin-manifest` | `bounded-derived-candidate` | Static受理済みCodex marketplace local entry | `<catalog-root>/<validated-local-source>/.codex-plugin/plugin.json`。Sourceは文書化済みlocal formを使い`./`で始まりcatalog root内に留まり、そのexact manifest pathを導出 | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | Static受理済みproject `.codex/config.toml` | Ancestry-comparable directory内の設定済みliteral instruction fallback basename。Excluded higher layerがoverrideし得るためruntime selectionはconditionalで、利用可能なcapacityはNode.jsと実行環境から継承する | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.derived.skill-metadata` | `bounded-derived-candidate` | Static受理済みskill `SKILL.md` | Sibling `agents/openai.yaml`。そのnamed skill-local metadata pathだけを導出し、orphan fileは受理しない | `codex.behavior.repo.skills` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.skills.discovery` | `documented` | `openai.codex.skills` |

Plugin skill、MCP file、app mapping、hook file、asset、script、remote sourceはこのreleaseではrelationship-onlyである。
Local marketplace entryからこれらcomponentへ再帰展開してはならない。

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

Grouped User exclusionは自身のassessmentとしてlifecycle claimなしの`documented`を持つ。Record単位のassessment
arrayは参照先のexperimental ruleとdeprecated promptを別々に保持し、それらbehavior qualifierをexclusion ruleまたは
unionへ平坦化しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | Consent済みinstruction fallback以外の上記User surfaceすべて。Managed/system configurationとlocal state | `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, `codex.behavior.user.skills` | FR-013、FR-014、FR-017、FR-018、QR-001、QR-004、QR-005 | `codex.agents.inheritance`, `codex.config.precedence`, `codex.hooks.additive`, `codex.mcp.configuration`, `codex.plugins.activation`, `codex.rules.resolution`, `codex.skills.discovery` | `documented` | `openai.codex.config-basic`, `openai.codex.custom-prompts`, `openai.codex.hooks`, `openai.codex.mcp`, `openai.codex.memories`, `openai.codex.plugins`, `openai.codex.rules`, `openai.codex.skills`, `openai.codex.subagents` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skill、MCP、app、hook、asset、script、installed/cache copy | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003、FR-004、FR-024、QR-001、QR-004、QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## Initial releaseの規範的presentation allowlist

次の表を、OpenAI Codexに対するclosedなFR-007 presentation allowlistとする。Kindの表記は正確な
`ToolRecognition.kind` valueである。Field IDは、調査対象fileが与える任意のkeyではなく、authored source occurrenceの
一つのclassを表す。Arrayの反復itemまたはdynamic map entryは、同じfield IDのもとでsource順の別occurrenceを生成する。
Server、Hook event、environment、header、tool、named componentの`*.name` IDでは、authored map key自体をoccurrenceとする。
`marketplace.plugin.source`は唯一のcross-vendor derivation fieldであり、plain stringのsource、またはobject sourceの
`path` leafを表す。

最終列はcommentaryではなく、規範的なsource-form applicabilityである。Effective eligibilityは、rowのclosedな
field/relationship setと、candidate provenanceが示す実際のadmission済みsource formについてexact extractorがsupportする
occurrenceのintersectionとする。1つのrowに複数formを記載しても、それらのschemaをunionしたり、1つのformのfieldを
別formでeligibleにしたりしない。Conformance fixture/testは両gateをcoverする。

Implementation開始時点で、この英日tableと[official-source contract](../official-sources.ja.md)に記録した言語別SHA-256
digest 2件をfreeze済みの承認済みdesign inputとする。Implementation gateはそれらを再計算してverifyするだけで、
eligible set、source form、extractor applicability、relationship kindをauthoringまたは
意味変更してはならない。この種の変更が必要ならdependent workを停止し、影響する英日design artifactをすべて同期し、
改訂contractを利用する前に`/speckit.plan`と`/speckit.tasks`を再実行する。

各rowは網羅的であり、`—`はeligible setが空であることを意味する。単一のadmission済み`.codex/config.toml` carrierは、
別々の`MCP`、`settings/config`、contained `hook` recognitionを所有できる。各occurrenceはそのdeclaration familyを所有する
rowだけに属する。未列挙のkeyとreferenceは、完全な`sourceText`だけに残す。Relationshipは、そのkindがこの表にあり、
かつoriginが中央registryの適切なrelationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、
connection、execution、import、installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleなdeclared-metadata `fieldId` value | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|---|
| `instructions` | `codex.instructions.reference-target` | `runtime-reference` | 受理済みstatic、configured-fallback、またはGlobal instruction file内の正確なauthored import/reference target token。Path-derived scope/orderとbyte-budget factはtyped stateでありmetadataではない |
| `rule` | `codex.rule.pattern`<br>`codex.rule.decision`<br>`codex.rule.justification`<br>`codex.rule.match`<br>`codex.rule.not-match` | `runtime-reference` | 受理済みdirect-child `.rules` fileの正確なargument/value/item occurrence。Commentと未列挙Starlark expressionはsource textだけに残す |
| `skill` | `codex.skill.name`<br>`codex.skill.description` | `skill-resource`<br>`runtime-reference` | 受理済み`SKILL.md`の正確な`name`と`description` frontmatter value。Resource/script/reference targetはrelationshipになり得るが、そのedgeを通じてreadしない |
| `agent` | `codex.agent.name`<br>`codex.agent.description`<br>`codex.agent.developer-instructions`<br>`codex.agent.nickname-candidate`<br>`codex.agent.model`<br>`codex.agent.model-reasoning-effort`<br>`codex.agent.sandbox-mode`<br>`codex.agent.mcp-server.name`<br>`codex.agent.skill.path`<br>`codex.agent.skill.enabled` | `agent-reference`<br>`skill-resource`<br>`context-inheritance`<br>`runtime-reference` | 受理済み`.codex/agents/*.toml`の正確なsupported TOML value/item/map-key occurrence。MCPはinherited/carrier relationshipのままで、agent所有のMCP recognitionにはならない |
| `hook` | `codex.hook.description`<br>`codex.hook.event`<br>`codex.hook.matcher`<br>`codex.hook.handler.type`<br>`codex.hook.handler.command`<br>`codex.hook.handler.command-windows`<br>`codex.hook.handler.timeout`<br>`codex.hook.handler.status-message`<br>`codex.hook.handler.async` | `runtime-reference` | 受理済みstandalone `hooks.json`またはinline `[hooks]`のevent map key、matcher value、handler leaf。同じlayerのstandalone occurrenceとinline occurrenceは別provenanceのままとする |
| `MCP` | `codex.mcp.server.name`<br>`codex.mcp.server.command`<br>`codex.mcp.server.arg`<br>`codex.mcp.server.env.name`<br>`codex.mcp.server.env.value`<br>`codex.mcp.server.env-var`<br>`codex.mcp.server.cwd`<br>`codex.mcp.server.experimental-environment`<br>`codex.mcp.server.url`<br>`codex.mcp.server.auth`<br>`codex.mcp.server.bearer-token-env-var`<br>`codex.mcp.server.http-header.name`<br>`codex.mcp.server.http-header.value`<br>`codex.mcp.server.env-http-header.name`<br>`codex.mcp.server.env-http-header.value`<br>`codex.mcp.server.startup-timeout-sec`<br>`codex.mcp.server.tool-timeout-sec`<br>`codex.mcp.server.enabled`<br>`codex.mcp.server.required`<br>`codex.mcp.server.enabled-tool`<br>`codex.mcp.server.disabled-tool`<br>`codex.mcp.server.default-tools-approval-mode`<br>`codex.mcp.server.tool.name`<br>`codex.mcp.server.tool.approval-mode` | `runtime-reference` | Admission済みconfig carrierの`[mcp_servers.*]`配下にあるserver/table nameと正確なsupported leaf/item occurrence。Process environment valueは置換しない |
| `settings/config` | `codex.config.model`<br>`codex.config.model-provider`<br>`codex.config.model-reasoning-effort`<br>`codex.config.approval-policy`<br>`codex.config.sandbox-mode`<br>`codex.config.web-search`<br>`codex.config.personality`<br>`codex.config.service-tier`<br>`codex.config.project-doc-max-bytes`<br>`codex.config.project-doc-fallback-filename`<br>`codex.config.model-instructions-file`<br>`codex.config.experimental-compact-prompt-file`<br>`codex.config.agent.name`<br>`codex.config.agent.config-file`<br>`codex.config.skill.path`<br>`codex.config.skill.enabled` | `agent-reference`<br>`skill-resource`<br>`runtime-reference`<br>`fallback` | Admission済みconfig carrierの正確なsupported TOML value/item/map-key occurrence。MCP/Hook declarationは別のrecognition rowだけに属し、configured target pathはread authorityを得ない |
| `plugin` | `codex.plugin.name`<br>`codex.plugin.version`<br>`codex.plugin.description`<br>`codex.plugin.author.name`<br>`codex.plugin.author.email`<br>`codex.plugin.author.url`<br>`codex.plugin.homepage`<br>`codex.plugin.repository`<br>`codex.plugin.license`<br>`codex.plugin.keyword`<br>`codex.plugin.skills`<br>`codex.plugin.mcp-servers`<br>`codex.plugin.apps`<br>`codex.plugin.hooks`<br>`codex.plugin.interface.display-name`<br>`codex.plugin.interface.short-description`<br>`codex.plugin.interface.long-description`<br>`codex.plugin.interface.developer-name`<br>`codex.plugin.interface.category`<br>`codex.plugin.interface.capability`<br>`codex.plugin.interface.website-url`<br>`codex.plugin.interface.privacy-policy-url`<br>`codex.plugin.interface.terms-of-service-url`<br>`codex.plugin.interface.default-prompt`<br>`codex.plugin.interface.brand-color`<br>`codex.plugin.interface.composer-icon`<br>`codex.plugin.interface.logo`<br>`codex.plugin.interface.screenshot` | `declared-component`<br>`skill-resource`<br>`runtime-reference` | 受理済み`.codex-plugin/plugin.json`の正確なmetadata/component/presentation leaf/item occurrence。`hooks` field omitted時はregistry定義済みdocumented-default component relationshipだけをemitできる |
| `marketplace` | `marketplace.name`<br>`marketplace.interface.display-name`<br>`marketplace.plugin.name`<br>`marketplace.plugin.source`<br>`marketplace.plugin.source.type`<br>`marketplace.plugin.source.url`<br>`marketplace.plugin.source.ref`<br>`marketplace.plugin.source.sha`<br>`marketplace.plugin.source.package`<br>`marketplace.plugin.source.version`<br>`marketplace.plugin.source.registry`<br>`marketplace.plugin.policy.installation`<br>`marketplace.plugin.policy.authentication`<br>`marketplace.plugin.category` | `plugin-source`<br>`runtime-reference` | 受理済みRepository-root marketplace fileの正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがclosedなlocal-manifest derivationをseedできる |
| `skill metadata` | `codex.skill-metadata.interface.display-name`<br>`codex.skill-metadata.interface.short-description`<br>`codex.skill-metadata.interface.icon-small`<br>`codex.skill-metadata.interface.icon-large`<br>`codex.skill-metadata.interface.brand-color`<br>`codex.skill-metadata.interface.default-prompt`<br>`codex.skill-metadata.policy.allow-implicit-invocation`<br>`codex.skill-metadata.dependency.tool.type`<br>`codex.skill-metadata.dependency.tool.value`<br>`codex.skill-metadata.dependency.tool.description`<br>`codex.skill-metadata.dependency.tool.transport`<br>`codex.skill-metadata.dependency.tool.url` | `skill-resource`<br>`runtime-reference` | Derived `agents/openai.yaml`の正確なsupported YAML leaf/item occurrence。Seed provenanceはtyped stateであり、このfileはowner `SKILL.md`のmetadata identityを継承しない |

Initial releaseのCodex recognitionは、sharedな`prompt/command`または`output style` kindを使用しない。Typed layer、
path-derived scope、selection、precedence、trust、default、applicability factはauthored metadataではないため、追加field IDにはしない。

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
