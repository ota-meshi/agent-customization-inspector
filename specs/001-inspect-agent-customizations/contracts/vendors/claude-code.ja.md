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
  Repository matcherはすべて`./`で始まる。Global selectorは別に命名したconsent済みboundary相対であり、
  そのprefixを再利用しない。Matcherは、現在のrunでClaudeがloadする場所ではなく、Inspectorがinventory
  できる場所を記述する。
- Repository matcherの`./**/`は0個以上のdescendant directory segmentを意味する。各表はmatcherが
  inventory root、descendant、または両方のどれに届くかを明記する。
- `documented`、`partially-documented`、`unknown`、`conflict`はclosedなupstream documentation-status valueであり、
  runtimeでのeffectivenessではない。Trust、approval、enablement、target file、runtime `cwd`、CLI flag、
  embedded-engine version、installed-plugin stateは独立conditionのままとする。Runtimeの
  `documentation-conflict`は`ConditionFact.status`であり、documentation-statusのaliasではない。
- **Shared core**は、CLI、VS Code extension、JetBrains integrationが同じsettings scopeとprecedenceを
  使用することを意味する。すべてのsurfaceで全featureが利用可能という意味ではない。VS Code
  extensionは独自のClaude Code engineをbundleするため、別途installしたCLIとversionが異なり得る。

## Canonical evidence-assessment index

このcontractが所有する全`behaviorId`と`ruleId`は正確に1件の`EvidenceAssessment`を持つ。下記にないsubjectの
canonical valueは`documentationStatus: documented`、`lifecycleQualifiers: []`とする。これはevidenceの存在からの
推論ではなく、未列挙subjectごとのclosed mappingである。Empty qualifierはlifecycle claimを行わず、`stable`を
意味しない。この文書の他のstatus/caveat列はrationaleまたはInspector stateであり、serializeするscalar enumではない。

| Subject ID | `documentationStatus` | `lifecycleQualifiers` | Assessment basis |
|---|---|---|---|
| `claude.behavior.repo.instructions.ancestor` | `partially-documented` | `[]` | Ancestor walkは`.claude/CLAUDE.md` variantを確立しない |
| `claude.behavior.repo.instructions.descendant` | `partially-documented` | `[]` | Lazy descendant discoveryは`.claude/CLAUDE.md` variantを確立しない |
| `claude.behavior.repo.rules` | `partially-documented` | `[]` | Descendant rule-layer discoveryとancestor-layer `paths` baseが不完全 |
| `claude.behavior.repo.commands` | `partially-documented` | `[]` | 完全なskill相当ancestor/lazy-descendant traversalは独立に記載されない |
| `claude.behavior.repo.agents` | `partially-documented` | `[]` | 同一directory tree内のduplicate-name selectionに文書化済みstable winnerがない |
| `claude.behavior.repo.mcp` | `partially-documented` | `[]` | 正確なproject-root selectionが完全には記載されない |
| `claude.repo.rules` | `partially-documented` | `[]` | Matcherが完全に文書化されたlayer setを越えるcontextを意図的にinventoryする |
| `claude.repo.command` | `partially-documented` | `[]` | Recursive namespaceは文書化済みだが、完全なruntime-layer traversalは未文書化 |

Typed registryはdefaultとexceptionをsubjectごとに1 recordへ展開する。Candidate provenanceとrelationship DTOは、
直接参照するrule、behavior、strategyのassessmentをすべてsubjectでsort/deduplicateして保持し、その
`EvidenceAssessment[]`を単一scalarまたはqualifier unionへ置換しない。

## Repositoryのvendor動作

Composition列は[runtime composition](../runtime-composition.ja.md#claude-code-strategy)のstrategy IDだけを
参照する。

| Behavior ID | Surface | Base | Relative locator | Traversal / trigger | Composition strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.behavior.repo.instructions.launch` | Shared core | `<launch-cwd>` | `./CLAUDE.md`、`./.claude/CLAUDE.md`、`./CLAUDE.local.md` | 正確なlaunch directory。Session開始時にload | `claude.instructions.layering` | documented | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.ancestor` | Shared core | `<launch-cwd>`より上の各`<ancestor-dir>` | `./CLAUDE.md`、`./CLAUDE.local.md` | Filesystem rootへ向かってparentを探索。Ancestor walkには`./.claude/CLAUDE.md`が記載されていない | `claude.instructions.layering` | documented（記載したnegative boundaryを含む） | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.descendant` | Shared core | `<launch-cwd>`配下の`<descendant-dir>` | `./CLAUDE.md`、`./CLAUDE.local.md` | Lazy。そのdescendant subtreeのfileをClaudeがreadした後にload。Descendantの`./.claude/CLAUDE.md`は未文書化 | `claude.instructions.layering` | documented（記載したnegative boundaryを含む） | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.rules` | Shared core | `<launch-cwd>`からparentまでの、文書化された各rule layer | `./.claude/rules/**/*.md` | 各rule directory内のMarkdown fileを再帰探索。`paths` ruleはmatching fileがreadされたときに適用可能になる | `claude.rules.layering` | partially documented。Descendant rule-directory discoveryとancestor layer由来`paths` globのbaseは明記されていない | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.repo.skills` | CLIはfull、IDEはsubset | `<launch-cwd>`からGit repository rootまでの各`<skill-layer>` | `./.claude/skills/<skill-name>/SKILL.md` | Startupでancestor layerを発見し、fileへのaccessに応じてnested descendant skill directoryをon demandで発見 | `claude.skills.selection` | documented | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.large-codebases.start-directory` |
| `claude.behavior.repo.skills-directory-plugin` | CLI、IDE availabilityはconditional | `<launch-cwd>/.claude/skills/<plugin-name>` | `./.claude-plugin/plugin.json` | 正確なlaunch-`cwd`のskills directoryだけ。Plain skillと異なり、このplugin解釈ではancestor skill directoryを探索しない。Workspace trustが適用される | `claude.plugins.activation` | documented | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.commands` | CLIはfull、IDEはsubset | Sessionが使用するproject command scope | `./.claude/commands/**/*.md` | Command directory内を再帰探索。Subdirectoryはcommand namespaceを構成 | `claude.commands.selection` | partially documented。再帰は文書化されているが、skillと完全に同じancestor/lazy-descendant traversalは独立には記載されていない | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.repo.agents` | Subagentを利用できるClaude Code runtime | `<launch-cwd>`からGit repository rootまでの各`<agent-layer>` | `./.claude/agents/**/*.md` | 各layerを再帰探索。`--add-dir`で追加したdirectoryもagentを提供できる | `claude.agents.selection`、`claude.agent-context.composition` | documented。同一directory tree内の同名定義に文書化された安定winnerはない | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.project` | Subagent runtime | `<project-root>` | `./.claude/agent-memory/<agent-name>/` | Subagent frontmatterの`memory: project`で選択。一般candidate discoveryではなくruntime memory state | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.local` | Subagent runtime | `<project-root>` | `./.claude/agent-memory-local/<agent-name>/` | Subagent frontmatterの`memory: local`で選択。一般candidate discoveryではなくruntime memory state | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.settings` | Shared core | `<launch-cwd>` | `./.claude/settings.json`、`./.claude/settings.local.json` | 正確なlaunch directoryだけ。Parent directoryからいずれのfileもinheritしない | `claude.settings.precedence` | documented | `anthropic.claude-code.large-codebases.start-directory`、`anthropic.claude-code.sdk.setting-sources`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.hooks-contained` | EventをsupportするShared core | 受理済みsettings、skill、agent、またはplugin declaration | Inline `hooks` field。Plugin activation後に限りpluginの`./hooks/hooks.json` | Hookは受理済みartifactに内包されたdeclaration。Claudeはstandalone project `./.claude/hooks.json`を定義していない | `claude.hooks.additive` | documented | `anthropic.claude-code.hooks.locations-resolution`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.mcp` | CLIはfull、VS Codeはpartial、その他IDEはconditional | Claude Codeが決定する`<project-root>` | `./.mcp.json` | 正確なproject MCP file。Relative `command`と`args`はfileのdirectoryではなくlaunch `cwd`から解決 | `claude.mcp.selection` | documented。ただし正確なproject-root selection algorithmは完全には明記されていない | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.ide.shared-differences` |
| `claude.behavior.repo.output-style` | CLIはdocumented、IDE availabilityはconditional | `<launch-cwd>`からrepository rootまでの各`<style-layer>` | `./.claude/output-styles/*.md` | 各ancestor layerのdirect Markdown child。Recursive scanやlazy-descendant scanは未文書化 | `claude.output-style.selection` | documented | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.repo.plugin` | CLIで管理。SupportされるIDEはshared configurationを利用 | 明示的に選択された`<plugin-root>` | `./.claude-plugin/plugin.json`とdefaultまたはmanifest-declared component location | Manifestはoptional。任意のRepository pathにあるfileはauto-discoveryされない。Rootはinstallation、marketplace、`--plugin-dir` / `--plugin-url`、またはskills-directory plugin mechanismに由来しなければならない | `claude.plugins.activation` | Path discoveryではなくexplicit activation | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.marketplace` | CLIで管理。IDEは同じconfigured marketplaceを利用 | 明示的に登録された`<marketplace-root>` | `./.claude-plugin/marketplace.json` | Marketplaceがconfigurationまたはcommandで登録された後だけread。任意のRepository pathにあるcatalogはauto-discoveryされない | `claude.plugins.activation` | Path discoveryではなくexplicit registration | `anthropic.claude-code.marketplaces.catalog-sources`、`anthropic.claude-code.ide.shared-differences` |

現在のClaude Codeは、文書化された深さ制限までnested subagent spawnをsupportする。この契約のruleや
relationshipは、「subagentは別のsubagentをspawnできない」という古い前提を保持しない。

## RepositoryのInspector matcher

これらのmatcherは、正確なInspector selected Repository rootをrootとする。Broad descendant inventoryにより、
別のproduct runtime `cwd`またはlazy discoveryで関係し得るcandidateをUIに表示できるが、Claudeが
fileをloadしたという主張には変換しない。より狭いexclusionまたはGlobal requirementを後述しない限り、
全行のpolicy referenceはFR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005である。

| Rule ID | Base | Relative selector | Expansion | Class | Behavior refs | Runtime/documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.repo.instructions` | `./` | `./**/CLAUDE.md`、`./**/CLAUDE.local.md` | `descendant-inventory`。Rootと全descendantを含み`**`は0 segmentも含む | `static-candidate` | `claude.behavior.repo.instructions.launch`、`claude.behavior.repo.instructions.ancestor`、`claude.behavior.repo.instructions.descendant` | Eligibilityはlaunch `cwd`、ancestry、read対象subtreeに依存。Nested `.claude/CLAUDE.md`はlaunch directory直下の正確な`.claude` fileである場合だけeligibleで、documented lazy-descendant formではない | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.sdk.setting-sources` |
| `claude.repo.rules` | `./` | `./**/.claude/rules/**/*.md` | 可能なrule-layer rootの`descendant-inventory`と各fixed rules directory内`recursive-subtree` | `static-candidate` | `claude.behavior.repo.rules` | 文書化されたruntime layer上のdirectoryだけeligibilityが既知。Nested inventoryはconditional | `anthropic.claude-code.memory.locations-load` |
| `claude.repo.skill` | `./` | `./**/.claude/skills/*/SKILL.md` | `descendant-inventory`。Skill nameは正確に1 direct child | `static-candidate` | `claude.behavior.repo.skills` | Plain-skill ancestor/lazy discoveryと、正確なlaunch-`cwd`だけのskills-directory plugin discoveryは異なる | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.command` | `./` | `./**/.claude/commands/**/*.md` | 可能なcommand rootの`descendant-inventory`と各fixed commands directory内`recursive-subtree` | `static-candidate` | `claude.behavior.repo.commands` | Recursive command namespaceはdocumented。文書化されたproject/user locationを超えるruntime-layer traversalはconditional | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.repo.agent` | `./` | `./**/.claude/agents/**/*.md` | 可能なagent rootの`descendant-inventory`と各fixed agents directory内`recursive-subtree` | `static-candidate` | `claude.behavior.repo.agents` | DirectoryがcwdからGit rootまでのlayer chainまたはallowed additional directoryに参加する場合だけeligible | `anthropic.claude-code.subagents.scope-context` |
| `claude.repo.settings` | `./` | `./.claude/settings.json`、`./.claude/settings.local.json` | 各selectorを`exact` | `static-candidate` | `claude.behavior.repo.settings` | Claudeのexact launch-`cwd` ruleと一致。Parent/descendant setting matcherなし | `anthropic.claude-code.large-codebases.start-directory`、`anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.mcp` | `./` | `./.mcp.json` | `exact` | `static-candidate` | `claude.behavior.repo.mcp` | Source rootがClaudeのproject rootであること、およびtrust/approvalがcondition | `anthropic.claude-code.mcp.scopes-precedence` |
| `claude.repo.output-style` | `./` | `./**/.claude/output-styles/*.md` | `descendant-inventory`。Style fileは各fixed output-styles directoryのdirect child | `static-candidate` | `claude.behavior.repo.output-style` | Active sessionのancestor layerであることとsettings/session stateによるselectionが必要 | `anthropic.claude-code.output-styles.locations` |
| `claude.repo.plugin-manifest` | `./` | `./.claude-plugin/plugin.json` | `exact`。Selected Repository rootをauthored plugin rootとして扱う | `static-candidate` | `claude.behavior.repo.plugin` | Inspectorのauthoring policyだけ。Claudeは任意のRepository rootにあるこのpathをauto-discoveryせず、存在はactivationを証明しない。Nested local manifestへは`claude.derived.local-plugin-manifest`からだけ到達できる | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.marketplaces.catalog-sources` |
| `claude.repo.marketplace` | `./` | `./.claude-plugin/marketplace.json` | `exact`。Selected Repository rootをauthored marketplace rootとして扱う | `static-candidate` | `claude.behavior.repo.marketplace` | Inspectorのauthoring policyだけ。Claudeは任意のRepository rootからこのcatalogをauto-registerしない。Explicit registrationはruntime conditionのまま | `anthropic.claude-code.marketplaces.catalog-sources` |

受理済みsettings、skill、agent、plugin、marketplace fileに内包されたhookとinline MCP declarationは、
そのcandidateのmetadataである。別のfilesystem matcherは作らない。

## User動作

`<claude-config-dir>`は、設定済みの場合は`CLAUDE_CONFIG_DIR`、それ以外は文書化された既定の
`~/.claude`を意味する。別fileの`~/.claude.json`はこのdirectory内ではない。初期Inspector releaseで
除外される場合も、この表にはvendor動作を記録する。

| Behavior ID | Surface | Base | Relative locator | Traversal / composition reference | Inspector status | Evidence |
|---|---|---|---|---|---|---|
| `claude.behavior.user.instructions` | Shared core | `<claude-config-dir>` | `./CLAUDE.md` | User instruction scope。`claude.instructions.layering` | 下記の`claude.global.instructions`だけでaccepted | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.rules` | Shared core | `<claude-config-dir>` | `./rules/**/*.md` | Recursive user rule directory。`claude.rules.layering` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.skills` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./skills/<skill-name>/SKILL.md` | User skill scope。`claude.skills.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.skills.locations-discovery` |
| `claude.behavior.user.commands` | CLIはfull、IDEはsubset | `<claude-config-dir>` | `./commands/**/*.md` | Recursive legacy command scope。`claude.commands.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.user.agents` | Subagentを利用できるClaude Code runtime | `<claude-config-dir>` | `./agents/**/*.md` | Recursive user agent scope。`claude.agents.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.settings` | Shared core | `<claude-config-dir>` | `./settings.json` | User settings scope。`claude.settings.precedence` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.user.output-style` | CLIはdocumented、IDE availabilityはconditional | `<claude-config-dir>` | `./output-styles/*.md` | Direct style file。`claude.output-style.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.user.mcp-state` | CLIはfull、VS Codeはpartial | `<home>` | `./.claude.json` | User MCPとper-project local MCP state。`claude.mcp.selection` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.plugins` | CLIで管理。SupportされるIDEはshared configurationを利用 | `<claude-config-dir>` | `./plugins/`と`./settings.json`内のplugin enablement | Installed/cache/runtime-managed plugin data。`claude.plugins.activation` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.agent-memory` | Subagent runtime | `<claude-config-dir>` | `./agent-memory/<agent-name>/` | Agent frontmatterがmemory scopeを1つ選択。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.auto-memory` | Auto memory有効時のshared runtime | `<claude-config-dir>` | `./projects/<project-key>/memory/MEMORY.md` | Startup prefixとon-demand topic file。`claude.agent-context.composition` | FR-016とFR-018による`claude.excluded.user-runtime` | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.workflows` | 現在のClaude Code runtime | `<claude-config-dir>` | `./workflows/*.js` | Dynamic workflow file | FR-016とFR-018による`claude.excluded.user-runtime`。Initial-release candidate ruleなし | `anthropic.claude-code.directory.file-reference` |

## Globalで受理するmatcher

FR-016とFR-018が許可するのは、下記のuser instruction fileだけである。他のUser fileをvendorが
supportしていても、このconsent boundaryは拡張しない。

| Rule ID | Global base | Relative selector | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `claude.global.instructions` | 正確なconsent済みcapture済み`CLAUDE_CONFIG_DIR`。Absent時だけrequest-wideなimport済み`node:os.homedir()` captureと`.claude`を`node:path.join`した値 | `CLAUDE.md` | `exact`。Global selectorはRepositoryの`./` prefixを再利用しない | `static-candidate` | `claude.behavior.user.instructions` | FR-013、FR-014、FR-016、FR-018、QR-005 | FR-016によりaccepted。隣接する全User configuration/stateはFR-018によりexcluded | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.directory.file-reference` |

Environment validation、consent、canonicalization、およびabsentな`CLAUDE_CONFIG_DIR`とinvalid valueの
扱いは、親allowlistで定義するInspector方針であり、Claude Codeのvendor lookup claimではない。

## Derived／excluded ruleとrelationship index

| Rule ID | Class | Closed derivation meaning | Behavior refs | Strategy refs | Status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.derived.local-plugin-manifest` | `bounded-derived-candidate` | 独立に受理したmarketplace catalogから、`./`で始まるlocal plugin `source`だけを受理し、marketplace rootからescapeなしで解決し、`<resolved-plugin-root>/.claude-plugin/plugin.json`だけを確認する。Manifestはoptionalなので不存在も正当 | `claude.behavior.repo.marketplace`、`claude.behavior.repo.plugin` | `claude.plugins.activation` | Vendorのrelative-source semanticsに整合するInspector derivation。Claudeのauto-scanではない | FR-003、FR-004、FR-005、FR-024、QR-001、QR-004、QR-005 | `anthropic.claude-code.marketplaces.catalog-sources`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.excluded.user-runtime` | `excluded` | `CLAUDE.md`以外の全User rowを除外する。Settings/state、rule、skill、command、agent、output style、MCP state、plugin/cache、agent memory、auto memory、workflowを含む | `claude.behavior.user.rules`、`claude.behavior.user.skills`、`claude.behavior.user.commands`、`claude.behavior.user.agents`、`claude.behavior.user.settings`、`claude.behavior.user.output-style`、`claude.behavior.user.mcp-state`、`claude.behavior.user.plugins`、`claude.behavior.user.agent-memory`、`claude.behavior.user.auto-memory`、`claude.behavior.user.workflows` | — | FR-016とFR-018の要件。除外はvendor supportを否定しない | FR-013、FR-014、FR-016、FR-018、QR-001、QR-005 | `anthropic.claude-code.memory.locations-load`、`anthropic.claude-code.skills.locations-discovery`、`anthropic.claude-code.changelog.legacy-command-nesting`、`anthropic.claude-code.subagents.scope-context`、`anthropic.claude-code.settings.scopes-precedence`、`anthropic.claude-code.output-styles.locations`、`anthropic.claude-code.mcp.scopes-precedence`、`anthropic.claude-code.directory.file-reference`、`anthropic.claude-code.plugins.components-scopes` |
| `claude.excluded.plugin-files` | `excluded` | Skill、command、agent、output style、hook、MCP/LSP declaration、monitor、theme、channel、settings、script、assetなどのplugin component bodyを除外し、declarationはrelationshipとして保持 | `claude.behavior.repo.plugin`、`claude.behavior.repo.marketplace` | `claude.plugins.activation` | Initial-release boundary。Plugin manifest/catalog inventoryはcomponent activationではない | FR-003、FR-004、FR-020、FR-021、FR-022、FR-024、QR-001、QR-005 | `anthropic.claude-code.plugins.components-scopes`、`anthropic.claude-code.directory.file-reference` |

このvendorが参照するrelationship-only rule、すなわち`claude.relationship.import`、
`claude.relationship.component`、`claude.relationship.agent-reference`、
`claude.relationship.agent-context`、`claude.relationship.agent-mcp`は、
[中央relationship-only registry](../runtime-composition.ja.md#normative-relationship-only-registry)だけで一度定義する。
このindexはread authorityを与えず、定義を重複しない。

## Initial releaseの規範的presentation allowlist

次の表を、Claude Codeに対するclosedなFR-007 presentation allowlistとする。Kindの表記は正確な
`ToolRecognition.kind` valueである。Field IDは、調査対象fileが与える任意のkeyではなく、authored source occurrenceの
一つのclassを表す。Arrayの反復itemまたはdynamic map entryは、同じfield IDのもとでsource順の別occurrenceを生成する。
MCP serverとHook eventの`*.name` IDでは、authored map key自体をoccurrenceとする。
`marketplace.plugin.source`はclosed marketplace derivationが使う唯一のcross-vendor field IDであり、plain stringの
source、またはobject sourceの`path` leafを表す。

最終列はcommentaryではなく、規範的なsource-form applicabilityである。Effective eligibilityは、rowのclosedな
field/relationship setと、candidate provenanceが示す実際のadmission済みsource formについてexact extractorがsupportする
occurrenceのintersectionとする。1つのrowに複数formを記載しても、それらのschemaをunionしたり、1つのformのfieldを
別formでeligibleにしたりしない。Conformance fixture/testは両gateをcoverする。

Implementation開始時点で、この英日tableと[official-source contract](../official-sources.ja.md)に記録した言語別SHA-256
digest 2件をfreeze済みの承認済みdesign inputとする。Implementation gateはそれらを再計算してverifyするだけで、
eligible set、source form、extractor applicability、relationship kindをauthoringまたは
意味変更してはならない。この種の変更が必要ならdependent workを停止し、影響する英日design artifactをすべて同期し、
改訂contractを利用する前に`/speckit.plan`と`/speckit.tasks`を再実行する。

各rowは網羅的であり、`—`はeligible setが空であることを意味する。Contained MCPまたはHook declarationは、すでに
admission済みのowner file上で`MCP`または`hook` rowを使う。Ownerの別recognitionからfieldを取得せず、synthetic fileも
作らない。未列挙のkeyとreferenceは、完全な`sourceText`だけに残す。Relationshipは、そのkindがこの表にあり、かつoriginが
中央registryの適切なrelationship-only ruleでcoverされる場合だけemitできる。このallowlistはread、connection、execution、
import、installation、activationのauthorityを一切与えない。

| `ToolRecognition.kind` | Eligibleなdeclared-metadata `fieldId` value | Eligibleな`Relationship.kind` value | Initial-release source form |
|---|---|---|---|
| `instructions` | `claude.instructions.import-target` | `import` | 受理済み`CLAUDE.md`または`CLAUDE.local.md`で、Markdown code span/fenceの外にあるauthored `@path` token |
| `rule` | `claude.rule.paths` | — | 受理済み`.claude/rules/**/*.md`のauthored `paths` frontmatter scalar。`paths` omitted時はmetadataをemitしない |
| `skill` | `claude.skill.name`<br>`claude.skill.description`<br>`claude.skill.when-to-use`<br>`claude.skill.argument-hint`<br>`claude.skill.argument`<br>`claude.skill.disable-model-invocation`<br>`claude.skill.user-invocable`<br>`claude.skill.allowed-tool`<br>`claude.skill.disallowed-tool`<br>`claude.skill.model`<br>`claude.skill.effort`<br>`claude.skill.context`<br>`claude.skill.agent`<br>`claude.skill.paths`<br>`claude.skill.shell` | `skill-resource`<br>`agent-reference`<br>`context-inheritance` | 受理済み`SKILL.md`の正確なfrontmatter value/item occurrence。`hooks`とMCP declarationは別のcontained recognitionが所有する |
| `agent` | `claude.agent.name`<br>`claude.agent.description`<br>`claude.agent.tool`<br>`claude.agent.disallowed-tool`<br>`claude.agent.model`<br>`claude.agent.permission-mode`<br>`claude.agent.max-turns`<br>`claude.agent.skill`<br>`claude.agent.memory`<br>`claude.agent.background`<br>`claude.agent.effort`<br>`claude.agent.isolation`<br>`claude.agent.color`<br>`claude.agent.initial-prompt` | `agent-reference`<br>`context-inheritance`<br>`runtime-reference` | 受理済み`.claude/agents/**/*.md`の正確なfrontmatter value/item occurrence。`hooks`と`mcpServers`は別のcontained recognitionが所有する |
| `prompt/command` | `claude.command.name`<br>`claude.command.description`<br>`claude.command.when-to-use`<br>`claude.command.argument-hint`<br>`claude.command.argument`<br>`claude.command.disable-model-invocation`<br>`claude.command.user-invocable`<br>`claude.command.allowed-tool`<br>`claude.command.disallowed-tool`<br>`claude.command.model`<br>`claude.command.effort`<br>`claude.command.context`<br>`claude.command.agent`<br>`claude.command.paths`<br>`claude.command.shell` | `agent-reference`<br>`context-inheritance` | 受理済みlegacy command Markdown fileの正確なfrontmatter value/item occurrence。Matched pathから導出するnamespaceとinvocation nameはtyped provenanceであり、declared metadataではない |
| `hook` | `claude.hook.event`<br>`claude.hook.matcher`<br>`claude.hook.handler.type`<br>`claude.hook.handler.if`<br>`claude.hook.handler.timeout`<br>`claude.hook.handler.status-message`<br>`claude.hook.handler.once`<br>`claude.hook.handler.command`<br>`claude.hook.handler.arg`<br>`claude.hook.handler.async`<br>`claude.hook.handler.shell`<br>`claude.hook.handler.url`<br>`claude.hook.handler.header.name`<br>`claude.hook.handler.header.value`<br>`claude.hook.handler.allowed-env-var`<br>`claude.hook.handler.server`<br>`claude.hook.handler.tool`<br>`claude.hook.handler.input`<br>`claude.hook.handler.prompt`<br>`claude.hook.handler.model` | `runtime-reference` | 受理済みsettings、skill、agent、plugin、marketplace owner上のcontained `hooks` declarationにあるevent map key、matcher value、handler leaf/item value |
| `MCP` | `claude.mcp.server.name`<br>`claude.mcp.server.type`<br>`claude.mcp.server.command`<br>`claude.mcp.server.arg`<br>`claude.mcp.server.env.name`<br>`claude.mcp.server.env.value`<br>`claude.mcp.server.url`<br>`claude.mcp.server.header.name`<br>`claude.mcp.server.header.value`<br>`claude.mcp.server.headers-helper`<br>`claude.mcp.server.timeout`<br>`claude.mcp.server.always-load`<br>`claude.mcp.server.oauth.client-id`<br>`claude.mcp.server.oauth.callback-port`<br>`claude.mcp.server.oauth.auth-server-metadata-url`<br>`claude.mcp.server.oauth.scopes` | `runtime-reference` | Root `.mcp.json`、またはすでにadmission済みowner上のcontained declarationにあるserver-name map keyと正確なserver leaf/item occurrence |
| `settings/config` | `claude.settings.model`<br>`claude.settings.effort-level`<br>`claude.settings.agent`<br>`claude.settings.output-style`<br>`claude.settings.permission.allow`<br>`claude.settings.permission.ask`<br>`claude.settings.permission.deny`<br>`claude.settings.permission.default-mode`<br>`claude.settings.env.name`<br>`claude.settings.env.value`<br>`claude.settings.enabled-plugin.name`<br>`claude.settings.enabled-plugin.value`<br>`claude.settings.extra-known-marketplace.name`<br>`claude.settings.extra-known-marketplace.source`<br>`claude.settings.extra-known-marketplace.auto-update`<br>`claude.settings.disable-all-hooks` | `agent-reference`<br>`declared-component`<br>`runtime-reference` | Root `.claude/settings.json`または`.claude/settings.local.json`の正確なsupported leaf/item occurrence。Contained Hook/MCP valueはそれぞれのrecognition rowだけに属する |
| `output style` | `claude.output-style.name`<br>`claude.output-style.description`<br>`claude.output-style.keep-coding-instructions`<br>`claude.output-style.force-for-plugin` | — | 受理済みdirect-child output-style Markdown fileの正確なfrontmatter value |
| `plugin` | `claude.plugin.name`<br>`claude.plugin.display-name`<br>`claude.plugin.version`<br>`claude.plugin.description`<br>`claude.plugin.author.name`<br>`claude.plugin.author.email`<br>`claude.plugin.author.url`<br>`claude.plugin.homepage`<br>`claude.plugin.repository`<br>`claude.plugin.license`<br>`claude.plugin.keyword`<br>`claude.plugin.default-enabled`<br>`claude.plugin.skills`<br>`claude.plugin.commands`<br>`claude.plugin.agents`<br>`claude.plugin.hooks`<br>`claude.plugin.mcp-servers`<br>`claude.plugin.output-styles`<br>`claude.plugin.lsp-servers`<br>`claude.plugin.experimental.themes`<br>`claude.plugin.experimental.monitors`<br>`claude.plugin.dependency.name`<br>`claude.plugin.dependency.version` | `declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済み`.claude-plugin/plugin.json`の正確なmetadata/component/dependency leaf/item occurrence。Inline Hook/MCP bodyは別のcontained recognitionだけがprojectする |
| `marketplace` | `marketplace.name`<br>`marketplace.owner.name`<br>`marketplace.owner.email`<br>`marketplace.description`<br>`marketplace.version`<br>`marketplace.metadata.plugin-root`<br>`marketplace.plugin.name`<br>`marketplace.plugin.source`<br>`marketplace.plugin.source.type`<br>`marketplace.plugin.source.url`<br>`marketplace.plugin.source.repo`<br>`marketplace.plugin.source.ref`<br>`marketplace.plugin.source.sha`<br>`marketplace.plugin.display-name`<br>`marketplace.plugin.description`<br>`marketplace.plugin.version`<br>`marketplace.plugin.author.name`<br>`marketplace.plugin.author.email`<br>`marketplace.plugin.homepage`<br>`marketplace.plugin.repository`<br>`marketplace.plugin.license`<br>`marketplace.plugin.keyword`<br>`marketplace.plugin.category`<br>`marketplace.plugin.tag`<br>`marketplace.plugin.strict`<br>`marketplace.plugin.default-enabled`<br>`marketplace.plugin.skills`<br>`marketplace.plugin.commands`<br>`marketplace.plugin.agents`<br>`marketplace.plugin.hooks`<br>`marketplace.plugin.mcp-servers`<br>`marketplace.plugin.lsp-servers` | `plugin-source`<br>`declared-component`<br>`skill-resource`<br>`agent-reference`<br>`runtime-reference` | 受理済み`.claude-plugin/marketplace.json`の正確なcatalog/plugin-entry leaf/item occurrence。`marketplace.plugin.source`だけがclosedなlocal-manifest derivationをseedできる |

Initial releaseのClaude recognitionは、sharedな`skill metadata` kindを使用しない。Typed layer、path-derived namespace、
selection、precedence、trust、surface、default、applicability factはauthored metadataではないため、追加field IDにはしない。

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
   algorithmは定義していない。一方、relative process argumentがlaunch-`cwd`基準であることは明確。
6. 2026-07-15に確認したlive memory pageはimportを4 hopと記載するが、古いsearch excerptには5と
   表示されたものがある。Cached snippetを信用せず、source recordに`reviewedOn`とassertion
   fingerprintを保持すべきである。
7. Source内にplugin manifestやmarketplace catalogが存在しても、Claudeが登録、install、trust、
   enable、select、loadした証拠にはならない。
8. CLIとIDE integrationは同じsettings locationとprecedenceを共有するが、feature subsetとembedded
   engine versionは異なり得る。架空の別file pathを作らず、surfaceとengine versionをapplicability
   factとして保持する。
9. Claudeはsupport対象skill symlinkを追跡する一方、Inspectorはすべてのsymlinkを意図的に追跡しない。
   Vendor fileの欠落ではなくparity limitationとして報告する。
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
