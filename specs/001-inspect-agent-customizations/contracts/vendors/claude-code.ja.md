# Claude Codeベンダー動作・検査契約

[English](claude-code.md)

**契約バージョン**: 2026-07-20

**公式ソース再確認日**: 2026-07-15

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
| `claude.behavior.repo.commands` | `partially-documented` | `[]` | 完全なskill相当ancestor/lazy-descendant traversalは独立に記載されない |
| `claude.behavior.repo.agents` | `partially-documented` | `[]` | 同一directory tree内のduplicate-name selectionに文書化済みstable winnerがない |
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
| `claude.behavior.repo.settings` | Shared core | `<launch-cwd>` | `./.claude/settings.json`、`./.claude/settings.local.json` | 正確なlaunch directoryだけ。Parent directoryからいずれのfileもinheritしない | `claude.settings.precedence` | documented | `anthropic.claude-code.large-codebases.start-directory`、`anthropic.claude-code.sdk.setting-sources`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.hooks-contained` | EventをsupportするShared core | 受理済みsettings、skill、agent、またはplugin declaration | Inline `hooks` field。Plugin activation後に限りpluginの`./hooks/hooks.json` | Hookは受理済みartifactに内包されたdeclaration。Claudeはstandalone project `./.claude/hooks.json`を定義していない | `claude.hooks.additive` | documented | `anthropic.claude-code.hooks.locations-resolution`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.mcp` | CLIはfull、VS Codeはpartial、その他IDEはconditional | Claude Codeが決定する`<project-root>` | `./.mcp.json` | 正確なproject MCP file。Relative `command`と`args`のresolution baseは引用pageでは確立されない | `claude.mcp.selection` | documented。ただし正確なproject-root selection algorithmとrelative `command`/`args`のbaseは完全には明記されていない | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.ide.shared-differences` |
| `claude.behavior.repo.output-style` | CLIはdocumented、IDE availabilityはconditional | `<launch-cwd>`からrepository rootまでの各`<style-layer>` | `./.claude/output-styles/*.md` | 各ancestor layerのdirect Markdown child。Recursive scanやlazy-descendant scanは未文書化 | `claude.output-style.selection` | documented | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.repo.plugin` | CLIで管理。SupportされるIDEはshared configurationを利用 | 明示的に選択された`<plugin-root>` | `./.claude-plugin/plugin.json`とdefaultまたはmanifest-declared component location | Manifestはoptional。任意のRepository pathにあるfileはauto-discoveryされない。Rootはinstallation、marketplace、`--plugin-dir` / `--plugin-url`、またはskills-directory plugin mechanismに由来しなければならない | `claude.plugins.activation` | Path discoveryではなくexplicit activation | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.marketplace` | CLIで管理。IDEは同じconfigured marketplaceを利用 | 明示的に登録された`<marketplace-root>` | `./.claude-plugin/marketplace.json` | Marketplaceがconfigurationまたはcommandで登録された後だけread。任意のRepository pathにあるcatalogはauto-discoveryされない | `claude.plugins.activation` | Path discoveryではなくexplicit registration | `anthropic.claude-code.marketplaces.catalog-sources`、`anthropic.claude-code.ide.shared-differences` |

現在のClaude Codeは、文書化された深さ制限までnested subagent spawnをsupportする。この契約のruleや
relationshipは、「subagentは別のsubagentをspawnできない」という古い前提を保持しない。

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
| `claude.repo.settings` | Repository | `['.claude', 'settings.json']`、`['.claude', 'settings.local.json']` | 各selectorを`exact` | `static-candidate` | `claude.behavior.repo.settings` | Claudeのexact launch-`cwd` ruleと一致。Parent/descendant setting matcherなし | `anthropic.claude-code.large-codebases.start-directory`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.mcp` | Repository | `['.mcp.json']` | `exact` | `static-candidate` | `claude.behavior.repo.mcp` | Source rootがClaudeのproject rootであること、およびtrust/approvalがcondition | `anthropic.claude-code.mcp.scopes-precedence` |
| `claude.repo.output-style` | Repository | `['.claude', 'output-styles', /\.md$/u]` | Repository rootの`.claude/output-styles/`の`direct-child`。ページはworking directoryとrepository rootの間の各directoryからproject styleを読み込む | `static-candidate` | `claude.behavior.repo.output-style` | Active sessionのancestor layerであることとsettings/session stateによるselectionが必要 | `anthropic.claude-code.output-styles.locations` |
| `claude.repo.plugin-manifest` | Repository | `['.claude-plugin', 'plugin.json']` | `exact`。Selected Repository rootをauthored plugin rootとして扱う | `static-candidate` | `claude.behavior.repo.plugin` | Inspectorのauthoring policyだけ。Claudeは任意のRepository rootにあるこのpathをauto-discoveryせず、存在はactivationを証明しない。Nested local manifestへは`claude.derived.local-plugin-manifest`からだけ到達できる | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.marketplaces.catalog-sources` |
| `claude.repo.marketplace` | Repository | `['.claude-plugin', 'marketplace.json']` | `exact`。Selected Repository rootをauthored marketplace rootとして扱う | `static-candidate` | `claude.behavior.repo.marketplace` | Inspectorのauthoring policyだけ。Claudeは任意のRepository rootからこのcatalogをauto-registerしない。Explicit registrationはruntime conditionのまま | `anthropic.claude-code.marketplaces.catalog-sources` |

内包された`hooks` declarationは、それを運ぶ受理済みcandidateのmetadataであり、別のfilesystem matcherは
作らない。そのowner集合は文書化されたもの — 受理済みsettings、skill、agent、plugin、marketplace
file — に従う。MCPにcontained ownerは存在しない: MCP surfaceに合流するのは明示的なcarrierだけで、
他のkindのfileがinline MCP configurationを綴っても — agentのfrontmatter、settings fileのmap —
それはそのkind自身の宣言contentとして自身のdetailに見えるだけである。

## User動作

`<claude-config-dir>`は、設定済みの場合は`CLAUDE_CONFIG_DIR`、それ以外は文書化された既定の
`~/.claude`を意味する。別fileの`~/.claude.json`はこのdirectory内ではない。初期Inspector releaseで
除外される場合も、この表にはvendor動作を記録する。

| Behavior ID | Surface | Base | Relative locator | Traversal / composition reference | Inspector status | Evidence |
|---|---|---|---|---|---|---|
| `claude.behavior.user.instructions` | Shared core | `<claude-config-dir>` | `./CLAUDE.md` | User instruction scope。`claude.instructions.layering` | 下記の`claude.global.instructions`だけでaccepted | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.rules` | Shared core | `<claude-config-dir>` | `./rules/**/*.md` | Recursive user rule directory。`claude.rules.layering` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.skills` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./skills/<skill-name>/SKILL.md` | User skill scope。`claude.skills.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.commands` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./commands/**/*.md` | Recursive legacy command scope。`claude.commands.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.user.agents` | Subagentを利用できるClaude Code runtime | `<claude-config-dir>` | `./agents/**/*.md` | Recursive user agent scope。`claude.agents.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.settings` | Shared core | `<claude-config-dir>` | `./settings.json` | User settings scope。`claude.settings.precedence` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.user.output-style` | CLIはdocumented、IDE availabilityはconditional | `<claude-config-dir>` | `./output-styles/*.md` | Direct style file。`claude.output-style.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.user.mcp-state` | CLIはfull、VS Codeはpartial | `<home>` | `./.claude.json` | User MCPとper-project local MCP state。`claude.mcp.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.plugins` | CLIで管理。SupportされるIDEはshared configurationを利用 | `<claude-config-dir>` | `./plugins/`と`./settings.json`内のplugin enablement | Installed/cache/runtime-managed plugin data。`claude.plugins.activation` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.env-vars` |
| `claude.behavior.user.agent-memory` | Subagent runtime | `<claude-config-dir>` | `./agent-memory/<agent-name>/` | Agent frontmatterがmemory scopeを1つ選択。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.auto-memory` | Auto memory有効時のshared runtime | `<claude-config-dir>` | `./projects/<project-key>/memory/MEMORY.md` | Startup prefixとon-demand topic file。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.workflows` | 現在のClaude Code runtime | `<claude-config-dir>` | `./workflows/*.js` | Dynamic workflow file | FR-016とFR-018による`claude.excluded.user-runtime`。Initial-release candidate ruleなし | `anthropic.claude-code.directory.file-reference` |

## Globalで受理するmatcher

FR-016とFR-018が許可するのは、下記のuser instruction fileだけである。他のUser fileをvendorが
supportしていても、このconsent boundaryは拡張しない。

| Rule ID | Global base | Selector program | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `claude.global.instructions` | 正確なconsent済みcapture済み`CLAUDE_CONFIG_DIR`。Absent時だけrequest-wideなimport済み`node:os.homedir()` captureと`.claude`を`node:path.join`した値 | `['CLAUDE.md']` | `exact`。Global selectorはRepository rootを基点にしない | `static-candidate` | `claude.behavior.user.instructions` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted。隣接する全User configuration/stateはFR-018によりexcluded | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.directory.file-reference` |

Environment validation、consent、canonicalization、およびabsentな`CLAUDE_CONFIG_DIR`とinvalid valueの
扱いは、親allowlistで定義するInspector方針であり、Claude Codeのvendor lookup claimではない。

## Derived／excluded ruleとrelationship index

| Rule ID | Class | Closed derivation meaning | Behavior refs | Strategy refs | Status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.derived.local-plugin-manifest` | `bounded-derived-candidate` | 独立に受理したmarketplace catalogから、`./`で始まるlocal plugin `source`だけを受理し、marketplace rootからescapeなしで解決し、`<resolved-plugin-root>/.claude-plugin/plugin.json`だけを確認する。Manifestはoptionalなので不存在も正当 | `claude.behavior.repo.marketplace`、`claude.behavior.repo.plugin` | `claude.plugins.activation` | Vendorのrelative-source semanticsに整合するInspector derivation。Claudeのauto-scanではない | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `anthropic.claude-code.marketplaces.catalog-sources`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.excluded.user-runtime` | `excluded` | `CLAUDE.md`以外の全User rowを除外する。Settings/state、rule、skill、command、agent、output style、MCP state、plugin/cache、agent memory、auto memory、workflowを含む | `claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` | — | FR-016とFR-018の要件。除外はvendor supportを否定しない | FR-013、FR-014、FR-016、FR-018、QR-001、QR-005 | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting`、`anthropic.claude-code.subagents.scope-context`、`anthropic.claude-code.settings.scopes-precedence`、`anthropic.claude-code.output-styles.locations`、`anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference`、`anthropic.claude-code.plugins.components-scopes` |
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
作らない。MCPにcontained rowは存在しない: MCP surfaceに合流するのは明示的なcarrierだけで、
他のkindのfile内のinline MCP configurationはそのkind自身の宣言contentである。Allowlistが記載しないreferenceは、完全な`sourceText`だけに残す。宣言とその公開の間にallowlistは立たない: skillの宣言はfileが書いたkeyであり、authored keyの集合は閉じていない（FR-007）。Relationshipは、そのkindがこの表にあり、かつoriginが
中央registryの適切なrelationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、connection、execution、
import、installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|
| `instructions` | — | 受理済み`CLAUDE.md`または`CLAUDE.local.md`。Authored `@path` tokenはsource textであり、抽出されるreferenceではない |
| `rule` | — | 受理済み`.claude/rules/**/*.md`のauthored `paths` frontmatter scalar。`paths` omitted時はmetadataをemitしない |
| `skill` | `skill-resource`<br>`agent-reference`<br>`context-inheritance` | 受理済み`SKILL.md`の正確なfrontmatter value/item occurrence。`hooks` declarationは別のcontained recognitionが所有し、skill frontmatterに所有すべきMCP fieldは存在しない |
| `agent` | `agent-reference`<br>`context-inheritance`<br>`runtime-reference` | 受理済み`.claude/agents/**/*.md`の正確なfrontmatter value/item occurrence。`hooks` declarationは別のcontained recognitionが所有し、`mcpServers`はagent自身のfrontmatter宣言であってMCP recognitionを所有しない |
| `prompt/command` | `agent-reference`<br>`context-inheritance` | 受理済みlegacy command Markdown fileの正確なfrontmatter value/item occurrence。Matched pathから導出するnamespaceとinvocation nameはtyped provenanceであり、declared metadataではない |
| `hook` | `runtime-reference` | 受理済みsettings、skill、agent、plugin、marketplace owner上のcontained `hooks` declarationにあるevent map key、matcher value、handler leaf/item value |
| `MCP` | `runtime-reference` | Root `.mcp.json` carrierだけにあるserver-name map keyと正確なserver leaf/item occurrence。他のkindのfileが`mcpServers`を綴っても自身の宣言contentとして見えるだけで、MCP recognitionを所有しない |
| `settings/config` | `agent-reference`<br>`declared-component`<br>`runtime-reference` | Root `.claude/settings.json`または`.claude/settings.local.json`の正確なsupported leaf/item occurrence。Contained Hook valueは`hook` recognitionだけに属し、settingsはMCP recognitionを決して所有しない |
| `output style` | — | 受理済みdirect-child output-style Markdown fileの正確なfrontmatter value |
| `plugin` | `declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済み`.claude-plugin/plugin.json`の正確なmetadata/component/dependency leaf/item occurrence。Inline Hook bodyは別のcontained recognitionだけがprojectし、inline MCP declarationはmanifest自身の宣言contentである |
| `marketplace` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済み`.claude-plugin/marketplace.json`の正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがclosedなlocal-manifest derivationをseedできる |

Initial releaseのClaude recognitionは、sharedな`skill metadata` kindを使用しない。Typed layer、path-derived namespace、
selection、precedence、trust、surface、default、applicability factはauthored metadataではなく、どのsurfaceも公開しない。

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
11. 現在のClaudeはnested subagent spawnをsupportする（文書化された最大深さは5）。古い
    「subagentはsubagentをspawnできない」という記述を復活させてはならない。
12. Upstream pageはversion付きURLなしで変化する。再確認ではURL到達性だけでなく、保存したsemantic
    assertionとsectionを比較しなければならない。

## 公式Evidence

このcontract内の全`anthropic.*` source IDは、canonical URL、review済みsection、review date、
affected-record逆引きindexを所有する単一の
[Official Source Registry](../official-sources.ja.md)で解決する。このvendor contractはregistryを重複定義も
overrideもしない。
