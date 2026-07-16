# Vendor契約: OpenAI Codex

[English](openai-codex.md)

**契約バージョン**: 2026-07-15
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

## 文書化済みRepository behavior

| Behavior ID | Surface | Lookup base | Relative selector | Traversalまたはactivation | Strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.behavior.repo.instructions` | Local client | Project rootからruntime `cwd` | Directoryごとに`AGENTS.override.md`、次に`AGENTS.md`、次に設定済みfallback basename | Rootから`cwd`へwalkし、directoryごとにnon-empty fileを最大1つ選択。設定済みbyte budgetで停止 | `codex.instructions.layering` | Documented | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.behavior.repo.skills` | Local client | Runtime `cwd`からrepository root | `.agents/skills/<name>/SKILL.md` | 上向きchainの各directoryをscan。同名skillはmergeしない | `codex.skills.discovery` | Documented | `openai.codex.skills` |
| `codex.behavior.repo.agents` | Local client | Project scope | `.codex/agents/*.toml` | Standalone TOML fileがspawned-session configuration layerを定義。Project内で探索する全directoryは資料上完全には明記されない | `codex.agents.inheritance` | Partially documented | `openai.codex.subagents` |
| `codex.behavior.repo.config` | Local client | Project rootからruntime `cwd` | `.codex/config.toml` | Trusted project layerをrootから`cwd`へすべてload。同じkeyは最も近い値が勝ち、relative pathは包含する`.codex/` directory基準 | `codex.config.precedence` | Documented | `openai.codex.config-basic` |
| `codex.behavior.repo.hooks` | Local client | Activeなtrusted project config layerすべて | `.codex/hooks.json`と`.codex/config.toml`内inline `[hooks]` | Matching hookはすべてadditive。同じlayerのfileとinline tableはwarning付きで両方load | `codex.hooks.additive` | Documented | `openai.codex.hooks`, `openai.codex.config-basic` |
| `codex.behavior.repo.rules` | Local client | Activeなtrusted project config layerすべて | `.codex/rules/*.rules` | Codexはstartup時にlayerの`rules/` directoryをscan。Official textはnested subdirectory recursionを確立しない | `codex.rules.resolution` | Partially documented、experimental | `openai.codex.rules` |
| `codex.behavior.repo.mcp` | Local client | Active project config layer | `.codex/config.toml`内`[mcp_servers.*]` | MCP declarationはconfig-layer resolutionに従い、project layerはtrust必須 | `codex.mcp.configuration` | Documented | `openai.codex.mcp`, `openai.codex.config-basic` |
| `codex.behavior.repo.marketplace` | ChatGPT desktopとplugin-management CLI | 正確なrepository root | `.agents/plugins/marketplace.json`、legacy-compatibleな`.claude-plugin/marketplace.json` | Catalogはinstallation用pluginを公開するが、installed/enabledの証明ではない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |
| `codex.behavior.plugin.manifest` | Plugin対応local client | Marketplaceまたはinstallationが選択したplugin root | `.codex-plugin/plugin.json` | 必須plugin entry point。任意のmatching fileをenabled pluginとして自動発見しない | `codex.plugins.activation` | Documented | `openai.codex.plugins` |

## Inspector Repository rule

この表のBaseはすべて正確なInspector Repository boundary (`./`)である。`descendant-inventory` expansionは
boundary配下の可能なruntime contextをinventoryするだけであり、Codexが下向きwalkするとは主張しない。
より狭いexclusionまたはGlobal requirementを後述しない限り、全行のpolicy referenceはFR-003、FR-004、
FR-005、FR-024、QR-001、QR-004、QR-005である。

| Rule ID | Base | Relative selector | Expansion | Class | Behavior refs | Documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.repo.instructions` | `./` | `./**/AGENTS.override.md`、`./**/AGENTS.md` | Rootと全descendant context directoryの`descendant-inventory` | `static-candidate` | `codex.behavior.repo.instructions` | Documented。Runtime chainはconditional | `openai.codex.agents-md` |
| `codex.repo.skill` | `./` | `./**/.agents/skills/*/SKILL.md` | 可能なcontext layerの`descendant-inventory`。Skill nameは1 direct child | `static-candidate` | `codex.behavior.repo.skills` | Documented。Runtime chainはconditional | `openai.codex.skills` |
| `codex.repo.agent` | `./` | `./**/.codex/agents/*.toml` | `descendant-inventory`。Agent fileはdirect child | `static-candidate` | `codex.behavior.repo.agents` | Partially documented | `openai.codex.subagents` |
| `codex.repo.config` | `./` | `./**/.codex/config.toml` | 可能なproject layerの`descendant-inventory` | `static-candidate` | `codex.behavior.repo.config`, `codex.behavior.repo.mcp`, `codex.behavior.repo.hooks` | Documented。Trust/runtime chainはconditional | `openai.codex.config-basic`, `openai.codex.mcp` |
| `codex.repo.hooks` | `./` | `./**/.codex/hooks.json` | 可能なactive config layerの`descendant-inventory` | `static-candidate` | `codex.behavior.repo.hooks` | Documented。Trust/hook reviewはconditional | `openai.codex.hooks` |
| `codex.repo.rules` | `./` | `./**/.codex/rules/*.rules` | Layer rootの`descendant-inventory`と各`rules/`内`direct-child` | `static-candidate` | `codex.behavior.repo.rules` | Experimental。Nested rule directoryはexcluded | `openai.codex.rules` |
| `codex.repo.plugin-manifest` | `./` | `./.codex-plugin/plugin.json` | `exact`。Launch rootをauthored plugin rootとして扱う | `static-candidate` | `codex.behavior.plugin.manifest` | Inspectorのauthored-project policyだけ。Codex plugin discovery/activationではない | `openai.codex.plugins` |
| `codex.repo.marketplace` | `./` | `./.agents/plugins/marketplace.json`、`./.claude-plugin/marketplace.json` | `exact` | `static-candidate` | `codex.behavior.repo.marketplace` | 正確なRepository-root location | `openai.codex.plugins` |

受理済み`config.toml`内のinline MCP serverとinline hookはそのfileのmetadataであり、別candidateを作らない。
Standalone `.mcp.json`はCodex Repository candidateではない。Inspectorは任意の
`.codex-plugin/plugin.json`を再帰探索しない。Nested manifestは後述のbounded local-marketplace derivationを通じて
のみ受理する。

## Bounded-derived Repository rule

`Status`はrule schemaが要求するupstream documentation statusである。`documented` statusであっても、
Inspectorのderivation boundがCodex product behaviorになるわけではない。

| Rule ID | Class | Accepted seed | 許可する1 targetとbound | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `codex.derived.local-plugin-manifest` | `bounded-derived-candidate` | Static受理済みCodex marketplace local entry | `<catalog-root>/<validated-local-source>/.codex-plugin/plugin.json`。Sourceは文書化済みlocal formを使い`./`で始まりcatalog root内に留まり、この1 manifest candidateだけを生成 | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |
| `codex.derived.fallback-basename` | `bounded-derived-candidate` | Static受理済みproject `.codex/config.toml` | Ancestry-comparable directory内の設定済みinstruction fallback basename。最大16個のdistinct literal basename、各最大128 UTF-8 byte。Excluded higher layerがoverrideし得るためruntime selectionはconditional | `codex.behavior.repo.config`, `codex.behavior.repo.instructions` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.config.precedence`, `codex.instructions.layering` | `documented` | `openai.codex.agents-md`, `openai.codex.config-basic` |
| `codex.derived.skill-metadata` | `bounded-derived-candidate` | Static受理済みskill `SKILL.md` | Sibling `agents/openai.yaml`。正確に1つのskill-local metadata fileだけを許可し、orphan fileは受理しない | `codex.behavior.repo.skills` | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `codex.skills.discovery` | `documented` | `openai.codex.skills` |

Plugin skill、MCP file、app mapping、hook file、asset、script、remote sourceはこのreleaseではrelationship-onlyである。
Local marketplace entryからこれらcomponentへ再帰展開してはならない。

## 文書化済みUser behavior

この表はmaintainer向けにCodexの対応を記録するもので、Global inspectionを拡張しない。`CODEX_HOME`の既定値は
`$HOME/.codex`だが、別の`$HOME/.agents` directoryは移動しない。

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

| Rule ID | Boundary base | Relative selectorとselection | Expansion | Class | Behavior refs | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.global.instructions` | 正確なconsent済み`<CODEX_HOME>`。`CODEX_HOME` absent時だけ既定`$HOME/.codex` | Non-empty `AGENTS.override.md`があれば使用し、なければ`AGENTS.md` | `exact`、最大1 file | `static-candidate` | `codex.behavior.user.instructions` | FR-013、FR-014、FR-017、FR-018、QR-005 | `openai.codex.agents-md` |

Present empty、relative、unreadable、その他invalidな`CODEX_HOME` overrideから暗黙fallbackしない。同じdirectory配下でも
user config、agent、skill、hook、rule、MCP、plugin、prompt、memory、credential、log、session、cacheはexcludedの
ままである。

## Relationship-onlyとexcluded group

Relationship-only `ruleId`は[Runtime Composition](../runtime-composition.ja.md)で定義する。次の説明は
non-normative indexにすぎない。Codexではこれらのruleがarbitrary config path、plugin component declaration、hook
command、server-provided MCP instruction、parent/child custom-agent contextを扱い、target readを認可しない。

Grouped User exclusionの`documented`は、参照先surfaceにofficial documentationがあることを表す。Experimental ruleや
deprecated promptなどbehaviorごとのqualifierはUser behavior tableに残し、このrule statusへ平坦化しない。

| Rule ID | Class | Excluded group | Behavior refs | Policy refs | Strategy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `codex.excluded.user-runtime` | `excluded` | Consent済みinstruction fallback以外の上記User surfaceすべて。Managed/system configurationとlocal state | `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, `codex.behavior.user.skills` | FR-013、FR-014、FR-017、FR-018、QR-001、QR-004、QR-005 | `codex.agents.inheritance`, `codex.config.precedence`, `codex.hooks.additive`, `codex.mcp.configuration`, `codex.plugins.activation`, `codex.rules.resolution`, `codex.skills.discovery` | `documented` | `openai.codex.config-basic`, `openai.codex.custom-prompts`, `openai.codex.hooks`, `openai.codex.mcp`, `openai.codex.memories`, `openai.codex.plugins`, `openai.codex.rules`, `openai.codex.skills`, `openai.codex.subagents` |
| `codex.excluded.plugin-files` | `excluded` | Plugin skill、MCP、app、hook、asset、script、installed/cache copy | `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, `codex.behavior.user.plugins` | FR-003、FR-004、FR-024、QR-001、QR-004、QR-005 | `codex.plugins.activation` | `documented` | `openai.codex.plugins` |

## 既知の不確実性と必須condition fact

1. Custom-agent pageは`.codex/agents/`のproject scopeを確立するが、directory traversalを完全には定義しない。
   Descendant authored fileはconditional inventoryのままとする。
2. Rules pageはactive layerごとの`rules/` scanを示すが、recursive subdirectoryを文書化しない。Read allowlistは
   direct `.rules` childだけを受理する。
3. Repository config、hook、rule、MCPはproject-root detection、runtime `cwd`、project trustに依存する。
   Inventory存在はloadの証明ではない。
4. Instruction fallback nameとbyte limitはexcluded user/profile/CLI inputで変更できる。全必須inputが判明した場合だけ
   Inspectorはfileをselectedまたはomittedと呼べる。
5. Plugin manifestやmarketplaceはauthored metadataだけを証明する。Installed copy、enabled state、component override、
   hosted availabilityは独立factである。
6. Hosted ChatGPT Workはlocal Codex fileを読まない。Local-file recognitionをhosted taskへprojectしてはならない。
