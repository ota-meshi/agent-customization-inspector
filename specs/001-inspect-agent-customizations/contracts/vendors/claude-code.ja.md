# Claude Codeベンダー動作・検査契約

[English](claude-code.md)

**契約バージョン**: 2026-08-27

**公式ソース再確認日**: 2026-08-27

**ベンダー**: Anthropic Claude Code

この文書は、Claude Codeの文書化された探索動作とInspectorのclosed inventory方針を分離する。
これは[inspection allowlist](../inspection-path-allowlist.ja.md)に対応するClaude固有の
source of truthである。Runtime combinationの詳細は
[runtime composition](../runtime-composition.ja.md)のstrategy IDで定義し、この文書では
そのalgorithmを重複して記載しない。

## 用語と解釈

- **Behavior ID**（`behaviorId`）は、文書化された、または明示的に不確定なClaude Codeの動作を
  識別する。Inspectorにfileを開く権限は与えない。
- **Rule ID**（`ruleId`）はInspector ruleを識別する。Readを許可するclassのruleだけが、
  allowlistとsafe-I/O contractに従ってreadを認可できる。
- **Vendor locator**はbase、relative locator、traversalに分けて表す。特定のruntime contextから
  Claude Codeが探索する場所を記述する。
- **Inspector matcher**は、選択済みRepositoryまたはGlobal inventory root相対である。この文書の
  Repository matcherはすべてそのrootを基点にauthorしたtyped segment programである。Global selectorは
  別に命名したconsent済みboundary相対であり、Repository rootを基点にしない。Matcherは、現在のrunで
  Claudeがloadする場所ではなく、Inspectorがinventory
  できる場所を記述する。
- Repository matcherの先頭`ANY_DIRECTORIES` segmentは0個以上のdescendant directory segmentを意味する。各表はmatcherが
  inventory root、descendant、または両方のどれに届くかを明記する。
- `documented`、`partially-documented`、`unknown`、`conflict`はclosedなupstream documentation-status valueであり、
  runtimeでのeffectivenessではない。Trust、approval、enablement、target file、runtime `cwd`、CLI flag、
  embedded-engine version、installed-plugin stateは独立conditionのままとする。Runtimeの
  `documentation-conflict`はdocumentation statusではない。この語彙で互換性のない場合の綴りは`conflict`である。
- **Shared core**は、CLI、VS Code extension、JetBrains integrationが同じsettings scopeとprecedenceを
  使用することを意味する。すべてのsurfaceで全featureが利用可能という意味ではない。VS Code
  extensionは独自のClaude Code engineをbundleするため、別途installしたCLIとversionが異なり得る。

## Canonical evidence-assessment index

このcontractが所有する全`behaviorId`と`ruleId`は、自身の`documentationStatus`と`lifecycleQualifiers`を述べる。下記にないsubjectの
canonical valueは`documentationStatus: documented`、`lifecycleQualifiers: []`とする。これはevidenceの存在からの
推論ではなく、未列挙subjectごとのclosed mappingである。Empty qualifierはlifecycle claimを行わず、`stable`を
意味しない。この文書の他のstatus/caveat列はrationaleまたはInspector stateであり、serializeするscalar enumではない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `claude.behavior.repo.instructions.ancestor` | `partially-documented` | `[]` | Ancestor walkは`.claude/CLAUDE.md` variantを確立しない |
| `claude.behavior.repo.instructions.descendant` | `partially-documented` | `[]` | Lazy descendant discoveryは`.claude/CLAUDE.md` variantを確立しない |
| `claude.behavior.repo.rules` | `partially-documented` | `[]` | Nested rules directoryのon-demand load triggerとancestor-layer `paths` baseが不完全 |
| `claude.behavior.user.rules` | `partially-documented` | `[]` | 再帰の記述はprojectの`.claude/rules/`について書かれている。User-level節はdirectoryとload順を述べ、平坦な2 fileを例示するだけで、nested subdirectoryの探索は記載されない |
| `claude.global.rules` | `partially-documented` | `[]` | User rule directoryのnested-subdirectory discoveryは記述がないため、ruleは文書化された直下の子だけをadmitする |
| `claude.behavior.repo.commands` | `partially-documented` | `[]` | 完全なskill相当ancestor/lazy-descendant traversalは独立に記載されない |
| `claude.behavior.repo.agents` | `partially-documented` | `[]` | 同一directory tree内のduplicate-name selectionに文書化済みstable winnerがない |
| `claude.behavior.repo.settings.local` | `partially-documented` | `[]` | 個人用fileをどのdirectoryが保持するかは、sessionのrepository・host・fileの所有者に依存し、いずれもこのtoolは観測しない |
| `claude.behavior.repo.mcp` | `partially-documented` | `[]` | 正確なproject-root selectionとrelative `command`/`args`のresolution baseが完全には記載されない |
| `claude.repo.rules` | `partially-documented` | `[]` | Nested rules directoryのon-demand load triggerとancestor-layer `paths` baseが不完全なまま |

Typed registryはdefaultとexceptionをsubjectごとに1 recordへ展開する。これらはmaintenance recordであり、どのresponseも
運ばない（QR-005）。Candidate provenanceが公開するのはどのruleがfileをadmitしたかであって、そのruleが
どれだけ文書化されているかではない。

## Repositoryのvendor動作

Composition列は[runtime composition](../runtime-composition.ja.md#claude-code-strategy)のstrategy IDだけを
参照する。

| Behavior ID | Surface | Base | Relative locator | Traversal / trigger | Composition strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.behavior.repo.instructions.launch` | Shared core | `<launch-cwd>` | `./CLAUDE.md`、`./.claude/CLAUDE.md`、`./CLAUDE.local.md` | 正確なlaunch directory。Session開始時にload | `claude.instructions.layering` | documented | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.ancestor` | Shared core | `<launch-cwd>`より上の各`<ancestor-dir>` | `./CLAUDE.md`、`./CLAUDE.local.md` | Filesystem rootへ向かってparentを探索。Ancestor walkには`./.claude/CLAUDE.md`が記載されていない | `claude.instructions.layering` | documented（記載したnegative boundaryを含む） | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.descendant` | Shared core | `<launch-cwd>`配下の`<descendant-dir>` | `./CLAUDE.md`、`./CLAUDE.local.md` | Lazy。そのdescendant subtreeのfileをClaudeがreadした後にload。Descendantの`./.claude/CLAUDE.md`は未文書化 | `claude.instructions.layering` | documented（記載したnegative boundaryを含む） | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.rules` | Shared core | `<launch-cwd>`からparentまでの、文書化された各rule layer | `./.claude/rules/**/*.md` | 各rule directory内のMarkdown fileを再帰探索。`paths` ruleはmatching fileがreadされたときに適用可能になる。Working directory配下のnestedな`.claude/rules/` directoryはon demandでloadされる | `claude.rules.layering` | partially documented。Nested rules directoryのon-demand load triggerとancestor layer由来`paths` globのbaseは明記されていない | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.repo.skills` | CLIはfull、IDEはsubset | `<launch-cwd>`からGit repository rootまでの各`<skill-layer>` | `./.claude/skills/<skill-name>/SKILL.md` | Startupでancestor layerを発見し、fileへのaccessに応じてnested descendant skill directoryをon demandで発見（nested discoveryはClaude Code 2.1.6+、changelog § 2.1.6） | `claude.skills.selection` | documented | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.nested-skill-discovery`、`anthropic.claude-code.large-codebases.start-directory` |
| `claude.behavior.repo.skills-directory-plugin` | CLI、IDE availabilityはconditional | `<launch-cwd>/.claude/skills/<plugin-name>` | `./.claude-plugin/plugin.json` | 正確なlaunch-`cwd`のskills directoryだけ。Plain skillと異なり、このplugin解釈ではancestor skill directoryを探索しない。Workspace trustが適用される | `claude.plugins.activation` | documented | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.commands` | CLIはfull、IDEはsubset | Sessionが使用するproject command scope | `./.claude/commands/**/*.md` | Command directory内を再帰探索。Subdirectoryはcommand namespaceを構成 | `claude.commands.selection` | partially documented。再帰は文書化されているが、skillと完全に同じancestor/lazy-descendant traversalは独立には記載されていない | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.repo.agents` | Subagentを利用できるClaude Code runtime | `<launch-cwd>`からGit repository rootまでの各`<agent-layer>` | `./.claude/agents/**/*.md` | 各layerを再帰探索。`--add-dir`で追加したdirectoryもagentを提供できる | `claude.agents.selection`、`claude.agent-context.composition` | documented。同一directory tree内の同名定義に文書化された安定winnerはない | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.project` | Subagent runtime | `<project-root>` | `./.claude/agent-memory/<agent-name>/` | Subagent frontmatterの`memory: project`で選択。一般candidate discoveryではなくruntime memory state | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.local` | Subagent runtime | `<project-root>` | `./.claude/agent-memory-local/<agent-name>/` | Subagent frontmatterの`memory: local`で選択。一般candidate discoveryではなくruntime memory state | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.settings.shared` | Shared core | `<launch-cwd>` | `./.claude/settings.json` | 正確なlaunch directoryだけ。Parent directoryから継承しない。Commitして初めてteammateのcloneとcloud sessionに届く | `claude.settings.precedence` | `documented` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.settings.local` | Shared core | `<repository-root>` | `./.claude/settings.local.json` | 正確なlaunch directoryだけ。Claude Codeはこのfileをworktree越しに解決したgit repository rootに置く。Repository外、repository rootがhome directoryのとき、Windows、rootまたはその`.git`/`.claude` entryが別userの所有であるときは開始directoryに留まる。File内のpermission ruleは開始directoryから解決され続ける | `claude.settings.precedence` | `partially-documented` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.hooks-contained` | EventをsupportするShared core | 受理済みsettings、skill、agent、またはplugin declaration | Inline `hooks` field。Plugin activation後に限りpluginの`./hooks/hooks.json` | Hookは受理済みartifactに内包されたdeclaration。Claudeはstandalone project `./.claude/hooks.json`を定義していない | `claude.hooks.additive` | documented | `anthropic.claude-code.hooks.locations-resolution`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.mcp` | CLIはfull、VS Codeはpartial、その他IDEはconditional | Claude Codeが決定する`<project-root>` | `./.mcp.json` | 正確なproject MCP file。Relative `command`と`args`のresolution baseは引用pageでは確立されない | `claude.mcp.selection` | documented。ただし正確なproject-root selection algorithmとrelative `command`/`args`のbaseは完全には明記されていない | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.ide.shared-differences` |
| `claude.behavior.repo.output-style` | CLIはdocumented、IDE availabilityはconditional | `<launch-cwd>`からrepository rootまでの各`<style-layer>` | `./.claude/output-styles/*.md` | 各ancestor layerのdirect Markdown child。Recursive scanやlazy-descendant scanは未文書化 | `claude.output-style.selection` | documented | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.repo.plugin` | CLIで管理。SupportされるIDEはshared configurationを利用 | 明示的に選択された`<plugin-root>` | `./.claude-plugin/plugin.json`とdefaultまたはmanifest-declared component location | Manifestはoptional。任意のRepository pathにあるfileはauto-discoveryされない。Rootはinstallation、marketplace、`--plugin-dir` / `--plugin-url`、またはskills-directory plugin mechanismに由来しなければならない | `claude.plugins.activation` | Path discoveryではなくexplicit activation | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.marketplace` | CLIで管理。IDEは同じconfigured marketplaceを利用 | 明示的に登録された`<marketplace-root>` | `./.claude-plugin/marketplace.json` | Marketplaceがconfigurationまたはcommandで登録された後だけread。任意のRepository pathにあるcatalogはauto-discoveryされない | `claude.plugins.activation` | Path discoveryではなくexplicit registration | `anthropic.claude-code.marketplaces.catalog-sources`、`anthropic.claude-code.ide.shared-differences` |

現在のClaude Codeは、文書化された深さ制限までnested subagent spawnをsupportする。この契約のruleや
relationshipは、「subagentは別のsubagentをspawnできない」という古い前提を保持しない。

pluginがこのrepositoryに到達する経路は2つあり、catalogを要するのは一方だけである。

Skills directory配下のfolderが`.claude-plugin/plugin.json`を持つ場合、それは次のsessionで
`<folder>@skills-dir`という名前のpluginとしてloadされる。marketplaceもinstall手順も要さず、
plugin cacheへcopyされるのではなくその場でdiscoverされる。manifestがそこに在ること自体がその
folderをpluginにするため、manifestは`claude.repo.skills-directory-plugin`がadmitするcarrierで
あり、それを持つfolderがpluginの同梱fileを持つplugin rootである。project scopeは起動`cwd`自身の
`.claude/skills/`であり、この解釈でancestor skill directoryを遡ることはない。plain skillのruleの
ようにlayerさせず固定するのはそのためである。workspace trust dialogは本製品が読まないruntime条件で
あり続ける。

もう一方はcatalogである。`.claude/settings.json`は`extraKnownMarketplaces`でcatalogを名前ごとに
登録し — そのfolderに対するworkspace trust dialogを受け入れた後にのみ有効となる — `enabledPlugins`で
有効化するpluginを`<plugin-name>@<marketplace-name>`のkeyで指名する。repository自身のcatalogは
rootの`.claude-plugin/marketplace.json`として文書化されており、`claude.repo.marketplace`がこれを
admitする。catalogは各plugin名をそのplugin自身のsourceへ対応付ける。このrepositoryが持つdirectoryを
名指す綴りは2つある: marketplace rootからの`./`相対pathと、`/`を含まないdirectory名1つだけの
bare name — これはcatalogがそのために宣言する`metadata.pluginRoot`配下として解決される。
それ以外のsourceは自身の`source` keyで取得元を名指すobjectであり — `github`・`url`・
`git-subdir`・`npm`・`archive`・`command` — その名前に対応するRepository directoryは存在しない。
marketplace rootの外へ出るpathと、このvendorがどこにも文書化していない綴りも同様である。
project settings fileで有効化してもそれが他者にinstallされることはない。marketplace sourceとplugin sourceは別の設定で
あり、catalogは各pluginの取得元を述べるだけで、installされていることは述べない。

Catalogのlocal source配下の`.claude-plugin/plugin.json`をadmitするruleは存在せず、導出するruleも
存在しない。そこではmanifestは任意であり、pluginとはそのrootである: root配下のfile — manifestを
含む — がそのpluginの同梱fileであり、bounded companion censusが列挙する
（contracts/inspection-path-allowlist.ja.md § Bounded companion census）。repository自身のrootを
plugin rootとして扱うこともしない。任意のpathでClaudeがpluginをdiscoverするとどの引用ページも
述べておらず、repositoryが自身のrootに置くmanifestは、ここでclientがloadするpluginではなく、
そのrepositoryが配布するpluginだからである。

## RepositoryのInspector matcher

これらのmatcherは、正確なInspector selected Repository rootをrootとする。Descendant-inventory expansionを
使えるのは、Claudeがworked-fileまたはdescendant anchorを通じてあらゆる深さで文書化しているlocation — Claudeが
配下のfileをreadするのに応じたsubdirectory instruction file、nestedなrules directory、nestedなskill directoryの
on-demand load — だけである。Runtime cwd chain上でしか文書化されていないlocationは、chainの唯一の共有メンバーで
あるselected rootでadmitする。AdmissionはClaudeがfileをloadしたという主張には変換しない。より狭いexclusionまたはGlobal requirementを後述しない限り、
全行のpolicy referenceはFR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005である。

| Rule ID | Base | Selector program | Expansion | Class | Behavior refs | Runtime/documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.repo.instructions` | Repository | `[ANY_DIRECTORIES, 'CLAUDE.md']`、`[ANY_DIRECTORIES, 'CLAUDE.local.md']` | どちらも`descendant-inventory`（rootと全descendantを含み`ANY_DIRECTORIES`は0 segmentも含む）。ページはproject instructionの場所として`./CLAUDE.md`**または**`./.claude/CLAUDE.md`を挙げるが、任意深さの`CLAUDE.md` programがrootでも各深さでも`./.claude/CLAUDE.md`をすでにadmitするため、`.claude`専用のselectorは最初のprogramが到達済みのfileに2つ目のadmissionを足すだけになる | `static-candidate` | `claude.behavior.repo.instructions.launch`、`claude.behavior.repo.instructions.ancestor`、`claude.behavior.repo.instructions.descendant` | Eligibilityはlaunch `cwd`、ancestry、read対象subtreeに依存。Nested `.claude/CLAUDE.md`はlaunch directory直下の正確な`.claude` fileである場合だけeligibleで、documented lazy-descendant formではない | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.repo.rules` | Repository | `[ANY_DIRECTORIES, '.claude', 'rules', ANY_DIRECTORIES, /\.md$/u]` | `descendant-inventory` — nestedな`.claude/rules/` directoryのon-demand loadが文書化されている — と各fixed rules directory内`recursive-subtree` | `static-candidate` | `claude.behavior.repo.rules` | Nested rules directoryのon-demand load triggerとancestor-layer `paths` baseはpartially documentedのまま | `anthropic.claude-code.memory.locations-load` |
| `claude.repo.skill` | Repository | `[ANY_DIRECTORIES, '.claude', 'skills', ANY_NAME, 'SKILL.md']` | `descendant-inventory` — nestedな`.claude/skills/` directoryのon-demand loadが文書化されている — plus `direct-child`。Skill nameは正確に1 direct child | `static-candidate` | `claude.behavior.repo.skills` | Plain-skill ancestor/lazy discoveryと、正確なlaunch-`cwd`だけのskills-directory plugin discoveryは異なる | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.command` | Repository | `['.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]` | Rootの固定commands directory内の`recursive-subtree` | `static-candidate` | `claude.behavior.repo.commands` | Skill同等のancestor/lazy-descendant command traversalは未文書化のため、project command scopeが寄与するのは全sessionが共有する唯一のruntime-chainメンバーであるselected rootだけであり、サブディレクトリの`.claude/commands`はcandidateにならない | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.repo.agent` | Repository | `['.claude', 'agents', ANY_DIRECTORIES, /\.md$/u]` | Rootの固定agents directory内の`recursive-subtree` | `static-candidate` | `claude.behavior.repo.agents` | 文書化されたwalkはworking directoryからGit repository rootへの上方向で、全sessionが共有する唯一のメンバーがselected root。サブディレクトリの`.claude/agents`はこの製品が選択しないruntime-chainメンバーであり、`--add-dir` directoryは別のruntime fact | `anthropic.claude-code.subagents.scope-context` |
| `claude.repo.settings` | Repository | `['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | 各selectorを`exact` | `static-candidate` | `claude.behavior.repo.settings.shared`、`claude.behavior.repo.settings.local` | Claudeのexact launch-`cwd` ruleと一致。Parent/descendant setting matcherなし | `anthropic.claude-code.large-codebases.start-directory`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.permissions` | Repository | `['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | 各selectorを`exact`。構成上`claude.repo.settings`と一致する | `static-candidate` | `claude.behavior.repo.settings.shared`、`claude.behavior.repo.settings.local` | 同じ2 fileのpermission policyとしてのcandidacy。`claude.repo.settings`が`settings/config`として認識するのに対し、こちらは`permissions`として認識する: 双方に宣言があるfileは2つのrecognitionを持ち、これはadmit済みのCodex config carrierと同じである。`permissions` objectを宣言しないfileはpermissions rowにならない | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.hooks.settings` | Repository | `['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | `claude.repo.permissions`が著すselectorと同じ、各selectorでの`exact`。これらのdocumentが含む`hooks` objectはその1 fileのrecognitionであり、各pathに対する3つのruleは1 candidateを1度読むことになる | `static-candidate` | `claude.behavior.repo.hooks-contained`、`claude.behavior.repo.settings.shared`、`claude.behavior.repo.settings.local` | このreleaseが公開する唯一のClaude hook row。skill・subagent・plugin manifest・catalog entryに含まれる宣言は、そのcustomizationが何であるかの一部であり、そのcustomization自身のrowが公開する | `anthropic.claude-code.hooks.locations-resolution` |
| `claude.repo.mcp` | Repository | `['.mcp.json']` | `exact` | `static-candidate` | `claude.behavior.repo.mcp` | Source rootがClaudeのproject rootであること、およびtrust/approvalがcondition | `anthropic.claude-code.mcp.scopes-precedence` |
| `claude.repo.output-style` | Repository | `['.claude', 'output-styles', /\.md$/u]` | Repository rootの`.claude/output-styles/`の`direct-child`。ページはworking directoryとrepository rootの間の各directoryからproject styleを読み込む | `static-candidate` | `claude.behavior.repo.output-style` | Active sessionのancestor layerであることとsettings/session stateによるselectionが必要 | `anthropic.claude-code.output-styles.locations` |
| `claude.repo.skills-directory-plugin` | Repository | `['.claude', 'skills', ANY_NAME, '.claude-plugin', 'plugin.json']` | Repository rootの`.claude/skills/`の各直下childの下で`exact`。manifestを持つfolderがplugin rootである | `static-candidate` | `claude.behavior.repo.skills-directory-plugin` | Skills directory配下でこのmanifestを持つfolderは、marketplaceもinstall手順もなしに`<folder>@skills-dir`としてloadされる。したがってmanifestがそこに在ること自体がそのfolderをpluginにする。Project scopeは起動`cwd`自身の`.claude/skills/`であり、この解釈でancestor skill directoryは遡らない。workspace trustはruntime条件のままである | `anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.marketplace` | Repository | `['.claude-plugin', 'marketplace.json']` | `exact`。repository自身のcatalogとして文書化された場所であり、その`./` entryが解決するmarketplace rootでもある | `static-candidate` | `claude.behavior.repo.marketplace` | Catalogはこのrepositoryが持つauthored contentである。configurationまたはcommandによる明示的な登録はruntime条件のままであるため、rowはcatalogが何をofferするかを述べ、pluginが登録・install・有効化されているとは決して述べない | `anthropic.claude-code.marketplaces.catalog-sources` |

内包された`hooks` declarationは、それを運ぶ受理済みcandidateのmetadataであり、別のfilesystem matcherは
作らない。文書化されたowner集合は受理済みsettings、skill、agent、plugin、marketplace fileである。
そのうち`hook` rowになるのは2つのsettings documentの宣言だけである。skill・subagent・plugin
manifest・catalog entryの`hooks`は、そのcustomizationが何であるかの一部であり、そのcustomization
自身のrowが既にfileの書いたkeyを公開しているため、`hook` rowを作れば1つの事実を、そのcustomizationを
主題としないページで二度公開することになる。Settings fileのhooksは他のどのcustomizationにも属さない: そのfile自身のrowが公開するのは
そのfileであるdocumentであり、documentはconfigurationであって、hooksがその定義の一部である
ようなcustomizationではない。だからこそその hooks は Codex の inline `[hooks]` table と同じく
hook inventory に載り、同じfileの`settings/config` rowはdocument全体を提供し続ける。MCPにcontained ownerは存在しない: MCP surfaceに合流するのは明示的なcarrierだけで、
他のkindのfileがinline MCP configurationを綴っても — agentのfrontmatter、settings fileのmap —
それはそのkind自身の宣言contentとして自身のdetailに見えるだけである。

## User動作

`<claude-config-dir>`は、設定済みの場合は`CLAUDE_CONFIG_DIR`、それ以外は文書化された既定の
`~/.claude`を意味する。別fileの`~/.claude.json`はこのdirectory内ではない。初期Inspector releaseで
除外される場合も、この表にはvendor動作を記録する。

| Behavior ID | Surface | Base | Relative locator | Traversal / composition reference | Inspector status | Evidence |
|---|---|---|---|---|---|---|
| `claude.behavior.user.instructions` | Shared core | `<claude-config-dir>` | `./CLAUDE.md` | User instruction scope。`claude.instructions.layering` | 下記の`claude.global.instructions`だけでaccepted | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.rules` | Shared core | `<claude-config-dir>` | `./rules/*.md` | User rule directoryの直下の子。自身の節が示す深さである。`claude.rules.layering` | 下記の`claude.global.rules`でaccepted | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.skills` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./skills/<skill-name>/SKILL.md` | User skill scope。`claude.skills.selection` | 下記の`claude.global.skill`でaccepted。予約された`skills/synced/` download treeはそのselectorの外に留まる | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.commands` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./commands/**/*.md` | Recursive legacy command scope。`claude.commands.selection` | 下記の`claude.global.command`でaccepted | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.user.agents` | Subagentを利用できるClaude Code runtime | `<claude-config-dir>` | `./agents/**/*.md` | Recursive user agent scope。`claude.agents.selection` | 下記の`claude.global.agent`でaccepted | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.settings` | Shared core | `<claude-config-dir>` | `./settings.json` | User settings scope。`claude.settings.precedence` | 下記の`claude.global.settings`、`claude.global.permissions`、`claude.global.hooks.settings`でaccepted | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.user.output-style` | CLIはdocumented、IDE availabilityはconditional | `<claude-config-dir>` | `./output-styles/*.md` | Direct style file。`claude.output-style.selection` | 下記の`claude.global.output-style`でaccepted | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.user.mcp-state` | CLIはfull、VS Codeはpartial | `<home>` | `./.claude.json` | User MCPとper-project local MCP state。`claude.mcp.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.plugins` | CLIで管理。SupportされるIDEはshared configurationを利用 | `<claude-config-dir>` | `./plugins/`と`./settings.json`内のplugin enablement | Installed/cache/runtime-managed plugin data。`claude.plugins.activation` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.agent-memory` | Subagent runtime | `<claude-config-dir>` | `./agent-memory/<agent-name>/` | Agent frontmatterがmemory scopeを1つ選択。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.auto-memory` | Auto memory有効時のshared runtime | `<claude-config-dir>` | `./projects/<project-key>/memory/MEMORY.md` | Startup prefixとon-demand topic file。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.workflows` | 現在のClaude Code runtime | `<claude-config-dir>` | `./workflows/*.js` | Dynamic workflow file | FR-016とFR-018による`claude.excluded.user-runtime`。Initial-release candidate ruleなし | `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.keybindings` | Shared core | `<claude-config-dir>` | `./keybindings.json` | Customキーボードショートカット。Terminal user interfaceについてのpreferenceであり、agentが読む入力ではない | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.themes` | Shared core | `<claude-config-dir>` | `./themes/*.json` | Custom color theme。Terminal user interfaceについてのpreferenceであり、agentが読む入力ではない | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.directory.file-reference` |

## Globalで受理するmatcher

FR-016とFR-018は、下記の文書化済みuserカスタマイズfileをadmitし、それ以外を一切admitしない。
これらのrowがadmitしないsurfaceをvendorがsupportしていても、このconsent boundaryは拡張されず、
すべてのselectorは唯一のconsent済みClaude boundary相対である。

| Rule ID | Global base | Selector program | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `claude.global.instructions` | 正確なconsent済みcapture済み`CLAUDE_CONFIG_DIR`。Absent時だけrequest-wideなimport済み`node:os.homedir()` captureと`.claude`を`node:path.join`した値 | `['CLAUDE.md']` | `exact`。Global selectorはRepository rootを基点にしない | `static-candidate` | `claude.behavior.user.instructions` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted。隣接する全User configuration/stateはFR-018によりexcluded | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.directory.file-reference` |
| `claude.global.rules` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['rules', /\.md$/u]` | boundaryの`rules/`の`direct-child` — user節自身の例が示す深さ。User layerのnested-subdirectory discoveryは記述がないため、recursive stepを持たない | `static-candidate` | `claude.behavior.user.rules` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted | `anthropic.claude-code.memory.locations-load` |
| `claude.global.skill` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['skills', ANY_NAME, 'SKILL.md']` | `direct-child`の後に`exact`。skill名は正確に直下1階層である。予約された`skills/synced/<name>/SKILL.md` download treeはこのprogramが届く深さより1階層深く、それがFR-018の求める境界である: synced skillはauthorしたものではなくdownloadされたcopyであり、予約名でauthorしたskillはClaude自身がskipする | `static-candidate` | `claude.behavior.user.skills` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.env-vars` |
| `claude.global.command` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['commands', ANY_DIRECTORIES, /\.md$/u]` | boundaryの`commands/`内の`recursive-subtree`。SubdirectoryはCommand namespaceを形成する | `static-candidate` | `claude.behavior.user.commands` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.global.agent` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['agents', ANY_DIRECTORIES, /\.md$/u]` | boundaryの`agents/`内の`recursive-subtree` | `static-candidate` | `claude.behavior.user.agents` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted。重複名のselectionはRepository scopeと同じく文書化されていないまま | `anthropic.claude-code.subagents.scope-context` |
| `claude.global.settings` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`。Userの`settings.local.json`は文書化されていない | `static-candidate` | `claude.behavior.user.settings` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.permissions` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`。構成上`claude.global.settings`と一致する — Repositoryのpairが一致するのと同じである | `static-candidate` | `claude.behavior.user.settings` | FR-013、FR-014、FR-016、FR-018、QR-005 | `permissions` objectを宣言しないuser settings documentはpermissions rowを持たない | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.hooks.settings` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['settings.json']` | `exact`。`claude.global.settings`がauthorするselectorの上にあり、1つのpathに対する3つのruleは1回readされる1つのcandidateである | `static-candidate` | `claude.behavior.user.settings` | FR-013、FR-014、FR-016、FR-018、QR-005 | User settings documentのcontained `hooks`宣言であり、Repositoryのsettings pairとまったく同じようにrecognizeされる | `anthropic.claude-code.hooks.locations-resolution`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.global.output-style` | 同じ正確なconsent済み`CLAUDE_CONFIG_DIR` boundary | `['output-styles', /\.md$/u]` | boundaryの`output-styles/`の`direct-child` | `static-candidate` | `claude.behavior.user.output-style` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted | `anthropic.claude-code.output-styles.locations` |

Environment validation、consent、canonicalization、およびabsentな`CLAUDE_CONFIG_DIR`とinvalid valueの
扱いは、親allowlistで定義するInspector方針であり、Claude Codeのvendor lookup claimではない。

## Derived／excluded ruleとrelationship index

| Rule ID | Class | Closed derivation meaning | Behavior refs | Strategy refs | Status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.excluded.user-runtime` | `excluded` | どのGlobal ruleもadmitしない上記User rowを除外する: 別fileである`~/.claude.json`のMCP/state file、install済みpluginとそのcache、agent memory、auto memory、dynamic workflow script、keybindingsとthemeのfile | `claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows`、`claude.behavior.user.keybindings`、`claude.behavior.user.themes` | — | FR-016とFR-018が要求する。除外はvendor supportの否定ではない | FR-013、FR-014、FR-016、FR-018、QR-001、QR-005 | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference`、`anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.subagents.scope-context`、`anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.env-vars` |
| `claude.excluded.plugin-files` | `excluded` | Skill、command、agent、output style、hook、MCP/LSP declaration、monitor、theme、channel、settings、script、assetなどのplugin component bodyを除外し、declarationはrelationshipとして保持 | `claude.behavior.repo.plugin`、`claude.behavior.repo.marketplace` | `claude.plugins.activation` | Initial-release boundary。Plugin manifest/catalog inventoryはcomponent activationではない | FR-003、FR-004、FR-020、FR-021、FR-022、FR-024、QR-001、QR-005 | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.directory.file-reference` |

このvendorが参照するrelationship-only rule、すなわち`claude.relationship.component`、
`claude.relationship.agent-reference`、`claude.relationship.agent-context`、
`claude.relationship.agent-mcp`は、
[中央relationship-only registry](../runtime-composition.ja.md#normative-relationship-only-registry)だけで一度定義する。
このindexはread authorityを与えず、定義を重複しない。

## Initial releaseの規範的presentation allowlist

次の表を、Claude Codeに対するclosedなFR-007 presentation allowlistとする。Kindの表記は正確な
`ToolRecognition.kind`値とする。

本releaseは読み取ったsourceの傍らに宣言済みmetadataを公開しない: detail surfaceは完全な
authored `sourceText`を提供するため、すべてのauthored valueは既に同じ画面に自身の綴りで存在しており、
caption付きの複製は1つの事実の2つ目の綴りになる。Recognitionが読み出すのはfile自身の宣言であり、fileが書いたkeyで公開する
（data-model.ja.md § Skillの表示）。そのうちinventory rowがgroupingに使うのは、そのkindのidentity
— `skill`ならそのfile自身に記述された名前 — fileが記述しない場合はそのskill directory名 —
であり、nestedなskillのClaude Code recognitionは
これに`.claude`を保持するdirectoryのroot相対pathを前置する（data-model.ja.md § 一覧の単位）。
Rowの最終セグメントは、vendorのdirectory由来command segmentではなく意図的にauthoredな名前で
あり、これにより1つのskillは3つのtoolを横断して1つのidentityの下で比較できる — である。
したがって本表が固定するのは、eligibleな
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

各rowは網羅的であり、`—`はeligible setが空であることを意味する。Contained Hook declarationは、すでに
admission済みのowner file上で`hook` rowを使う。Ownerの別recognitionからfieldを取得せず、synthetic fileも
作らない。そのrowが存在するのはsettings document — Repositoryのroot pairとconsent済みuser `settings.json` — に対してだけであり、他のownerの`hooks`は、その
fileにそのkindが与えるrow自身のcontentである。MCPにcontained rowは存在しない: MCP surfaceに合流するのは明示的なcarrierだけで、
他のkindのfile内のinline MCP configurationはそのkind自身の宣言contentである。Allowlistが記載しないreferenceは、完全な`sourceText`だけに残す。宣言とその公開の間にallowlistは立たない: skillの宣言はfileが書いたkeyであり、authored keyの集合は閉じていない（FR-007）。Relationshipは、そのkindがこの表にあり、かつoriginが
中央registryの適切なrelationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、connection、execution、
import、installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|
| `instructions` | — | 受理済み`CLAUDE.md`または`CLAUDE.local.md`。Authored `@path` tokenはsource textであり、抽出されるreferenceではない |
| `rule` | — | 何も読み出さない: 受理済みのrules Markdown file — Repositoryの`.claude/rules/**/*.md`またはconsent済みuserの`rules/*.md` — はauthorが書いた1つのdocumentとして、frontmatter blockごと公開される。したがってそこから値は読み出さず、宣言された`paths` globも他の行と同じsource textである |
| `skill` | `skill-resource`<br>`agent-reference`<br>`context-inheritance` | 受理済み`SKILL.md`の正確なfrontmatter value/item occurrence。`hooks`はskill自身のfrontmatter宣言であってhook recognitionを所有せず、skill frontmatterに所有すべきMCP fieldは存在しない |
| `agent` | `agent-reference`<br>`context-inheritance`<br>`runtime-reference` | 受理済みagents Markdown file — Repositoryの`.claude/agents/**/*.md`またはconsent済みuserの`agents/**/*.md` — の正確なfrontmatter value/item occurrence。`hooks`と`mcpServers`はsubagent自身のfrontmatter宣言であり、hook recognitionもMCP recognitionも所有しない |
| `prompt/command` | `agent-reference`<br>`context-inheritance` | 受理済みlegacy command Markdown fileの正確なfrontmatter value/item occurrence。Matched pathから導出するnamespaceとinvocation nameはtyped provenanceであり、declared metadataではない |
| `hook` | `runtime-reference` | 受理済みsettings document — Repositoryの2つのroot documentまたはconsent済みuserの`settings.json` — のcontained `hooks` declarationにあるevent map key、matcher value、handler leaf/item value。vendorが文書化する他のowner — skill、subagent、plugin manifest、catalog entry — はそれ自身が何であるかの一部としてhooksを宣言しており、それらのoccurrenceはそのkind自身のrowに属する |
| `MCP` | `runtime-reference` | Root `.mcp.json` carrierだけにあるserver-name map keyと正確なserver leaf/item occurrence。他のkindのfileが`mcpServers`を綴っても自身の宣言contentとして見えるだけで、MCP recognitionを所有しない |
| `settings/config` | `agent-reference`<br>`declared-component`<br>`runtime-reference` | Root `.claude/settings.json`、root `.claude/settings.local.json`、またはconsent済みuserの`settings.json`の正確なsupported leaf/item occurrence。Contained Hook valueは`hook` recognitionだけに属し、settingsはMCP recognitionを決して所有しない |
| `permissions` | — | Root `.claude/settings.json`、root `.claude/settings.local.json`、またはconsent済みuserの`settings.json`のtop-level `permissions` objectが持つすべてのleaf/item occurrenceを、authoredなまま。一部のkeyだけをallowlistすると、どのauthored policyを落としたか言えないまま落とすことになるため、object全体を対象とする。`permissions` objectを宣言しないsettings fileはpermission policy recognitionを持たず、それ以外のsettings keyは`settings/config` recognitionに属する。rule文字列はtoolと任意のspecifierを名指すものであり、file・command・domainへ解決することは決してない |
| `output style` | — | 受理済みdirect-child output-style Markdown fileの正確なfrontmatter value |
| `plugin` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済み`.claude-plugin/plugin.json`の正確なmetadata/component/dependency leaf/item occurrenceと、entryがplugin名を解決する受理済み`.claude-plugin/marketplace.json`の正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがclosedなlocal-manifest derivationをseedできる。Inline Hook bodyもinline MCP declarationも、そのcarrier自身の宣言contentである |

`plugin` rowのderivation記述 — `marketplace.plugin.source`だけがclosed local-manifest derivationを
seedしうる — は、どのruleも行わないderivationを述べている: catalogのlocal root配下のmanifestは
candidateではなく、そのpluginが同梱するfileである（§ Repository vendor behavior）。これは消費者を
持たないfrozen・digest記録済みのdesign inputであり、その変更はofficial-source contractの
stop-and-regenerate ruleに従うdigest記録済みの変更である。この行が統べているのは残り2つの半分、
すなわち`claude.repo.skills-directory-plugin`がadmitするmanifestと、`claude.repo.marketplace`が
admitするcatalog entryである。

Initial releaseのClaude recognitionは、sharedな`skill metadata` kindを使用しない。Typed layer、path-derived namespace、
selection、precedence、trust、surface、default、applicability factはauthored metadataではない: いずれもfileから読み出さず、
relationshipが運ぶこともない。Path由来の同一性は、それがinventory unitである場所でのみ公開する — `prompt/command` rowが
group化される名前、`instructions` rowがgroup化される範囲 — のであって、runtimeについての主張として公開することは決してない:
どのlayerがfileを読み込むか、productが何をselect・trust・defaultするかは、どのsurfaceも述べない（FR-009）。

## 既知の曖昧さとversion-sensitive fact

1. 文書化されたupward instruction walkが挙げるのは`CLAUDE.md`と`CLAUDE.local.md`であり、ancestor
   `.claude/CLAUDE.md`は確立していない。Lazy descendantの説明もdescendant
   `.claude/CLAUDE.md`を確立していない。
2. Ancestor layerのrule directoryは文書化されているが、ancestor rule内の`paths` globを評価する
   baseは明記されていない。Descendant `.claude/rules` directoryのlazy discoveryも確立していない。
3. Legacy commandの再帰とnamespaceは文書化されているが、plain skillの全ancestor/lazy-descendant
   behaviorを継承するという完全な記載はない。
4. 1つの`.claude/agents` directory tree内に同名subagentが複数ある場合、upstream docsは
   filesystem非依存の安定winnerを定義していない。
5. MCP documentationは`.mcp.json`について「project root」を使うが、完全なproject-root selection
   algorithmは定義しておらず、relative `command`/`args`値の解決baseを確立するcited pageも無い。
   Inspectorはauthoredなliteralを公開し、baseをjoinしない。
6. 2026-07-15に確認したlive memory pageはimportを4 hopと記載するが、古いsearch excerptには5と
   表示されたものがある。Cached snippetを信用せず、source recordに`reviewedOn`とassertion
   fingerprintを保持すべきである。
7. Source内にplugin manifestやmarketplace catalogが存在しても、Claudeが登録、install、trust、
   enable、select、loadした証拠にはならない。
8. CLIとIDE integrationは同じsettings locationとprecedenceを共有するが、feature subsetとembedded
   engine versionは異なり得る。架空の別file pathを作らず、surfaceとengine versionをapplicability
   factとして保持する。
9. Claudeはsupport対象skill symlinkを追跡し、Inspectorも同じようにsymbolic linkをtarget先まで
   透過的にreadする。したがってsymlinkされたskillはClaudeがloadする内容として調査される。
   壊れたlinkはそのfileの`file-unreadable` diagnosticになる。
10. 現在の公式docsには`.claude/workflows/*.js`、`.worktreeinclude`、keybinding、theme、plugin monitor、
    channel、LSP settingsなどの新しいsurfaceがある。実装前に明示的なexcludedまたはcandidate ruleが
    必要であり、記載がないことはClaudeが無視する証拠ではない。
11. 現在のClaudeはnested subagent spawnをsupportする: subagentは既定でmain conversationの
    3層下まで自身のsubagentをspawnでき、その上限は固定値ではなくenvironment variableで
    設定される。古い「subagentはsubagentをspawnできない」という記述を復活させてはならず、
    どのrecordも固定の深さを述べない。
12. Upstream pageはversion付きURLなしで変化する。再確認ではURL到達性だけでなく、保存したsemantic
    assertionとsectionを比較しなければならない。

## 公式Evidence

このcontract内の全`anthropic.*` source IDは、canonical URL、review済みsection、review date、
affected-record逆引きindexを所有する単一の
[Official Source Registry](../official-sources.ja.md)で解決する。このvendor contractはregistryを重複定義も
overrideもしない。
