# 公式ソース台帳

[English](official-sources.md)

**Registry version**: 2026-07-20
**Official-source review**: 2026-07-20
**Normalization version**: `1`

この台帳は、3つのvendor contractと[Runtime Composition](runtime-composition.ja.md)が使用する
全`sourceId`の唯一のnormative ownerである。Vendor contractとcomposition contractは、全normative
owner-to-source edgeをEvidence cell内の`sourceId`としてだけ記述する。定義済みIDを説明文中のnon-edge
cross-referenceとして繰り返すことはできるが、そのURL、official host、review対象section、review dateを
所有も上書きもしない。他の場所に重複source registryを置くことはinvalidで、この台帳を上書きできない。

Source registryはevidence metadataであって、Inspectorのread authorityではない。Filesystem candidateを
追加せず、boundaryを拡張せず、customizationがruntimeでactiveだったことも証明しない。

## Record表記とownership

各table rowは1つの`OfficialSourceRecord` keyと、次のauthored fieldを所有する。

- `canonicalUrl`はrowに示した正確なHTTPS URLである。Credential、query、fragmentを含まない。
- `officialHost`は、そのrecordだけに対するexact host allowlistである。Subdomainやsibling hostを暗黙に
  許可しない。
- `sectionAnchors`内のsemicolon区切りentryは、それぞれexact rendered heading-text descriptorである。
  CSS/XPath selectorでもURL fragmentでもない。Drift checkerは、列挙した各entryに対して正確に1つの
  matching headingを見つけなければならない。Anchorとheading-textのcapacityおよびcompletion behaviorは、
  Node.jsと実行環境から継承する。
- `reviewedOn`は、最後にhuman semantic reviewを実施した日であり、rowごとに記述する。
  2026-07-20 reconciliationで再reviewしていないrecordは`2026-07-15`を保持する。
- 全rowが`normalizationVersion: 1`を使用する。

このregistryを参照する保守対象behavior、rule、strategyはそれぞれ、次のclosed shapeを持つatomicな
evidence assessmentを正確に1件所有する。

```ts
type DocumentationStatus =
  | 'documented'
  | 'partially-documented'
  | 'unknown'
  | 'conflict';
type LifecycleQualifier = 'preview' | 'experimental' | 'deprecated';
type EvidenceAssessment = {
  subjectKind: 'behavior' | 'rule' | 'strategy';
  subjectId: string;
  documentationStatus: DocumentationStatus;
  lifecycleQualifiers: LifecycleQualifier[];
};
```

Qualifier arrayは重複を持たず、常に`preview`、`experimental`、`deprecated`の順でserializeする。
Emptyはreview済みsourceがlifecycle claimを行わないことを意味するだけで、`stable`を意味も暗示もしない。
`documented`は正確なreview済みsectionが保守対象atomic assertionを完全に確立すること、
`partially-documented`は一部だけを確立すること、`unknown`はそのassertionについて決定を確立しないこと、
`conflict`は互換性のないofficial assertionを保持することを表す。別tokenの`documentation-conflict`はruntimeの
`ConditionFact.status`であり、`DocumentationStatus`の表記またはaliasではない。

各assessmentは自身のsubjectを識別し、source IDやvendor全体へstatusを付けるものではない。複数のbehavior/rule/
strategy subjectを参照するprovenanceまたはrelationshipは、subject単位の決定的な`EvidenceAssessment[]`を持つ。
これらrecordを単一scalar、最も確実/不確実な値、またはqualifier unionへ縮約してはならない。
`subjectKind`を固定順`behavior`、`rule`、`strategy`で、次に`subjectId`でsortし、重複する
`(subjectKind, subjectId)` recordをrejectする。Assessmentは該当subjectのcompleteな`sourceRefs` setに
裏付けられ、後述するreverse-index ownershipを変更しない。

Checked-inする`tests/fixtures/conformance/official-sources.json`は、これらrowのmachine-readableな
materializationである。さらにdata modelが要求する3つのderived affected-ID array、maintainedな
paraphrased assertion、`snapshotFingerprint`、`semanticFingerprint`を含む。別の`sourceId`、URL、host、
anchor、review dateを導入してはならない。

Registryは以下のrowだけを持つ。各fixture recordはnon-emptyなmaintained assertion setを持つ。各assertionは
stable assertion ID、paraphrase済みexpected semantics、そのsourceのexact reverse
indexのsubsetであるaffected IDを持つ。Page textのcopyとgeneric product-area targetは禁止する。
`snapshotFingerprint`は選択・normalizeしたsectionのlowercase SHA-256、`semanticFingerprint`はstable sort後の
assertionに対するcanonical JSONのlowercase SHA-256である。Fieldはtruncateしない。

このreleaseでは、次のexact official hostだけを許可する。

| Vendor | Exact official hosts |
|---|---|
| GitHub | `docs.github.com` |
| Microsoft | `code.visualstudio.com` |
| Anthropic | `code.claude.com` |
| OpenAI | `learn.chatgpt.com` |

## Exact affected-record reverse index

両方向を手動保守すると監査できない第二のsource of truthが生じるため、affected-ID arrayは下表に
複製しない。Evidence cellからexact inverse indexとして生成する。

1. Canonical English contractである`vendors/github-copilot.md`、`vendors/claude-code.md`、
   `vendors/openai-codex.md`、`runtime-composition.md`だけをparseする。
2. 「Evidence cell」は、exact English headerが`Evidence`、`Evidence / basis`、`Official source refs`の
   いずれかであるfinal columnを指す。Row ownerをfirst columnに要求する。`Behavior ID`は`behaviorId`、
   `Rule ID`と`Excluded Rule ID`は`ruleId`、`Strategy ID`は`strategyId`へmapする。正確に1つのstable
   ownerがないEvidence cellまたは認識できないowner/source columnはcontract errorである。説明文中の
   backtick付き`sourceId`はnon-edge cross-referenceであり、このregistryへresolveしなければならないが、
   affected IDにもinverse-index edgeにも寄与しない。
3. Evidence cellを、そのrecordのcompleteな`sourceRefs` setとして扱う。Backtickで囲まれたtokenを抽出し、
   trim後のcell全体を次のclosed grammarでvalidateする。

   ```text
   evidence  = token *( separator token )
   token     = "`" sourceId "`"
   separator = optional-ASCII-horizontal-space ( "," / ";" / "、" ) optional-ASCII-horizontal-space
   sourceId  = ( "github" / "vscode" / "anthropic" / "openai" )
               1*( "." segment )
   segment   = lowercase-alphanumeric *( lowercase-alphanumeric / "-" )
   ```

   したがってdelimiterはvalidation syntaxであり、extraction algorithmではない。Token外のtext、link、
   backtickなしID、empty token、trailing delimiter、closedな3 separator以外のpunctuation、product全体から
   推論したevidenceは禁止する。New/reformatted contentのcanonical authored separatorはcommaと1つのASCII
   spaceである。Semicolonと日本語commaはcontract-validなcompatibility spellingであり、英日edge setを
   比較する前にcanonicalizationが全accepted separatorを`, `へrewriteする。
4. 全`(ownerId, sourceId)` edgeを反転する。Sourceごとの結果をsort・deduplicateして
   `affectedBehaviorIds`、`affectedRuleIds`、`affectedStrategyIds`へ格納する。3 arrayのうち少なくとも
   1つはnon-emptyでなければならない。
5. `official-sources.json`にmaterializeしたarrayとのreciprocal equalityを要求する。Edgeの欠落・余分・
   重複、unknown source、unknown owner、orphan source、owner typeの不一致はoffline contract testを
   failさせる。
6. 日本語counterpartを独立にparseし、同じowner ID、`sourceId` token、edgeを要求する。日本語fileは
   semantic parityを検証するが、generated arrayへの第二のinputにはしない。
7. 全ownerについて正確に1件のassessment、closed documentation-status enum、重複なしの固定qualifier順序、
   英日equalityを検証する。`documentation-conflict`をdocumentation statusとしてrejectし、assessmentを欠く、
   またはlossy aggregateへ平坦化したprovenance/relationship fixtureをrejectする。

したがって、下記registryのID setは、4つのcanonical Evidence sourceが使用するID setを単に包含するの
ではなく、完全に一致しなければならない。各`sourceId`はここで正確に1回だけ定義する。

## Presentation Allowlistのimplementation gate

3つのvendor contractにある規範的なbilingual Presentation Allowlist rowは、すでに承認済みのdesign inputで
ある。Implementation gateは、凍結済みの英日rowと記録済みdigestだけをverifyし、allowlist set、identifier、
admission済みsource form、正確なsource-form extractor applicability、eligible metadata field、relationship
kindを新規作成または意味変更してはならない。

次のlowercase SHA-256値を記録済みfreezeとする。指定したUTF-8、BOMなし、LF-onlyの各contractについて、
case-foldしたtextが`presentation allowlist`で終わる一意なlevel-2 headingを特定し、後続のtable以外のlineをskipし、
first byteが`|`である最初の連続line群を各byteそのまま連結し、最終rowを含む全rowの末尾にLFを1つ付けたものを
digest inputとする。Heading、prose、blank line、連続table後のlineはhashへ含めない。

| Vendor | 英語table SHA-256 | 日本語table SHA-256 |
|---|---|---|
| GitHub Copilot | `974ac8fdf76d16925ab7bc3505a22863314e2938981e40e09f1d428bb2ef244f` | `92e27ba7f5444f28a8d29087eca52d3bfbac95652e6551405feb9238c3a07a1a` |
| Claude Code | `c41502612324aef171de5ead0ba73dcc9234e378f630e31ff04aa8a4b6f66f9f` | `75f6689a1c04551e3991f27bdf8637516c3959970336d75009eb417ca21dc66b` |
| OpenAI Codex | `c1de96a1764c6ba7355e1784d6bbabb3262ebc7e51ef7cbaa6b64f621aa38b1b` | `d06588c649e9fbd969bc89816d8be3ced41b9b02601a2a6b0fc0e6c08636c248` |

Implementation freeze testは6 inputすべてを正確に再計算し、fileごとにmatching headingと連続tableが正確に1つだけ
存在することを要求し、全digestをconstant timeで比較し、row IDと英日semantic parityを別に検証しなければならない。
Tableまたはdigestのmissing、duplicate、empty、malformed、mismatchはimplementationをblockし、digest一致だけを
semantic parityの証明にしてはならない。

Implementation開始後にこれらの値のsemantic mismatchまたは変更要求が判明した場合、dependent workを停止する。
変更後のrowをconsumeする前に、maintainerは適用対象の英日specification、research、plan、quickstart、contract
artifactをすべて同期し、`/speckit.plan`、続いて`/speckit.tasks`を再実行しなければならない。Evidence location、
section anchor、review metadata、意味を変えないcorrectionはcurrent task setで継続できるが、このstop-and-regenerate
ruleを迂回するために使用してはならない。

## GitHub公式ソース

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `github.copilot.cli.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions> | `docs.github.com` | `Types of custom instructions`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-07-15` |
| `github.copilot.instructions.support` | <https://docs.github.com/en/copilot/reference/custom-instructions-support> | `docs.github.com` | `GitHub.com`; `Visual Studio Code`; `Copilot CLI` | `2026-07-15` |
| `github.copilot.cloud.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions> | `docs.github.com` | `Creating custom instructions`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-07-15` |
| `github.copilot.cli.reference` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference> | `docs.github.com` | `MCP server configuration`; `Skill locations`; `Commands (alternative skill format)`; `Custom agent locations` | `2026-07-15` |
| `github.copilot.cli.configuration` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference> | `docs.github.com` | `Directory overview`; `User-editable files`; `Changing the location of the configuration directory`; `Configuration file settings` | `2026-07-15` |
| `github.copilot.cli.custom-agents` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli> | `docs.github.com` | `Creating a custom agent`; `Using a custom agent` | `2026-07-15` |
| `github.copilot.cli.plugins` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference> | `docs.github.com` | `CLI commands`; `plugin.json`; `marketplace.json`; `File locations`; `Loading order and precedence` | `2026-07-15` |
| `github.copilot.hooks` | <https://docs.github.com/en/copilot/reference/hooks-reference> | `docs.github.com` | `Hooks locations`; `Cloud agent execution environment`; `Hook configuration format`; `Disable all hooks` | `2026-07-15` |
| `github.copilot.custom-agents` | <https://docs.github.com/en/copilot/reference/custom-agents-configuration> | `docs.github.com` | `YAML frontmatter properties`; `MCP server configuration details`; `Example agent profile configurations` | `2026-07-15` |
| `github.copilot.skills` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills> | `docs.github.com` | `Creating and adding a skill`; `Adding a skill that someone else has created`; `How Copilot uses agent skills`; `Skills versus custom instructions` | `2026-07-15` |
| `github.copilot.plugins` | <https://docs.github.com/en/copilot/concepts/agents/about-plugins> | `docs.github.com` | `What plugins contain`; `How plugins are structured`; `Where can I get plugins?`; `How plugin marketplaces work`; `Plugins compared with manual configuration` | `2026-07-15` |
| `github.copilot.cli.lsp` | <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers> | `docs.github.com` | `How to add an LSP server`; `How LSP servers are loaded` | `2026-07-15` |
| `github.copilot.cli.extensions` | <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-extensions> | `docs.github.com` | `How extensions are discovered`; `Choosing where an extension lives`; `Enabling extensions`; `Changing how the CLI handles extensions`; `Extensions compared with plugins` | `2026-07-15` |

## Microsoft Visual Studio Code公式ソース

新しいrelease noteがversion付きbehaviorを追加した一方、current general guideが網羅的な古いlocation
listを提示し続ける場合、release noteはそのversion以降の新behaviorを確立し、guideは直接記述するclaimだけを
引き続き確立する。Guideのomissionでrelease-note behaviorを消さず、互換性のない網羅的location assertionは、
影響するbehavior、rule、strategyの`documentationStatus: conflict`として保持する。どちらのsourceも、記載していない
schemaまたはtotal precedence orderを確立しない。同じfilenameや別surfaceから推測せずunknownのままにする。
このruleはomissionよりdirectでversion-qualifiedなfirst-party assertionを優先し、互換性のないdirect assertionを
conflictとして保持し、未登録のsource repositoryやissueを代替evidenceとして受理しない。

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `vscode.copilot.instructions` | <https://code.visualstudio.com/docs/agent-customization/custom-instructions> | `code.visualstudio.com` | `Types of instruction files`; `Use a .github/copilot-instructions.md file`; `Use .instructions.md files`; `Use an AGENTS.md file`; `Use a CLAUDE.md file`; `Instruction priority` | `2026-07-15` |
| `vscode.copilot.customization` | <https://code.visualstudio.com/docs/agent-customization/overview> | `code.visualstudio.com` | `What each customization gives you`; `Use customizations in a monorepo` | `2026-07-15` |
| `vscode.copilot.settings` | <https://code.visualstudio.com/docs/agents/reference/ai-settings> | `code.visualstudio.com` | `Custom instructions settings`; `Reusable prompt files settings`; `Custom agents settings`; `Agent skills settings`; `Agent plugins settings` | `2026-07-15` |
| `vscode.copilot.prompts` | <https://code.visualstudio.com/docs/agent-customization/prompt-files> | `code.visualstudio.com` | `Prompt file locations`; `Create a prompt file`; `Use a prompt file in chat` | `2026-07-15` |
| `vscode.copilot.custom-agents` | <https://code.visualstudio.com/docs/agent-customization/custom-agents> | `code.visualstudio.com` | `Handoffs`; `Custom agent file locations`; `Custom agent file structure`; `Tool list priority`; `Share custom agents across teams` | `2026-07-15` |
| `vscode.copilot.skills` | <https://code.visualstudio.com/docs/agent-customization/agent-skills> | `code.visualstudio.com` | `Create a skill`; `SKILL.md file format`; `How Copilot uses skills`; `Use shared skills` | `2026-07-15` |
| `vscode.copilot.hooks` | <https://code.visualstudio.com/docs/agent-customization/hooks> | `code.visualstudio.com` | `Configure hooks`; `Security considerations` | `2026-07-15` |
| `vscode.copilot.mcp` | <https://code.visualstudio.com/docs/agent-customization/mcp-servers> | `code.visualstudio.com` | `Add an MCP server`; `MCP server trust`; `Synchronize MCP configuration across devices` | `2026-07-20` |
| `vscode.copilot.mcp.workspace-root-release` | <https://code.visualstudio.com/updates/v1_118> | `code.visualstudio.com` | `Workspace .mcp.json files and server deduplication` | `2026-07-20` |
| `vscode.copilot.plugins` | <https://code.visualstudio.com/docs/agent-customization/agent-plugins> | `code.visualstudio.com` | `What plugins provide`; `Plugin metadata (plugin.json)`; `Plugin formats`; `Configure plugin marketplaces`; `Use local plugins`; `Workspace plugin recommendations` | `2026-07-15` |
| `vscode.settings` | <https://code.visualstudio.com/docs/configure/settings> | `code.visualstudio.com` | `User settings`; `Workspace settings`; `Profile settings`; `Settings precedence` | `2026-07-15` |

## Anthropic公式ソース

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `anthropic.claude-code.directory.file-reference` | <https://code.claude.com/docs/en/claude-directory> | `code.claude.com` | `File reference` | `2026-07-15` |
| `anthropic.claude-code.memory.locations-load` | <https://code.claude.com/docs/en/memory> | `code.claude.com` | `Choose where to put CLAUDE.md files`; `How CLAUDE.md files load`; `Organize rules with .claude/rules/`; `Auto memory` | `2026-07-15` |
| `anthropic.claude-code.large-codebases.start-directory` | <https://code.claude.com/docs/en/large-codebases> | `code.claude.com` | `Choose where to start Claude`; `Layer CLAUDE.md files by directory`; `Add per-directory skills` | `2026-07-15` |
| `anthropic.claude-code.sdk.setting-sources` | <https://code.claude.com/docs/en/agent-sdk/claude-code-features> | `code.claude.com` | `Control filesystem settings with settingSources`; `CLAUDE.md load locations` | `2026-07-15` |
| `anthropic.claude-code.settings.scopes-precedence` | <https://code.claude.com/docs/en/settings> | `code.claude.com` | `Configuration scopes`; `Settings precedence`; `Plugin configuration` | `2026-07-15` |
| `anthropic.claude-code.skills.locations-discovery` | <https://code.claude.com/docs/en/skills> | `code.claude.com` | `Where skills live`; `How a skill gets its command name` | `2026-07-15` |
| `anthropic.claude-code.subagents.scope-context` | <https://code.claude.com/docs/en/sub-agents> | `code.claude.com` | `Choose the subagent scope`; `Scope MCP servers to a subagent`; `Preload skills into subagents`; `Enable persistent memory`; `What loads at startup`; `Spawn nested subagents` | `2026-07-15` |
| `anthropic.claude-code.hooks.locations-resolution` | <https://code.claude.com/docs/en/hooks> | `code.claude.com` | `Hook locations`; `The /hooks menu` | `2026-07-15` |
| `anthropic.claude-code.mcp.scopes-precedence` | <https://code.claude.com/docs/en/mcp> | `code.claude.com` | `MCP installation scopes`; `Plugin-provided MCP servers` | `2026-07-15` |
| `anthropic.claude-code.output-styles.locations` | <https://code.claude.com/docs/en/output-styles> | `code.claude.com` | `Create a custom output style`; `How output styles work` | `2026-07-15` |
| `anthropic.claude-code.plugins.components-scopes` | <https://code.claude.com/docs/en/plugins-reference> | `code.claude.com` | `Plugin installation scopes`; `Skills-directory plugins`; `Plugin manifest schema`; `File locations reference` | `2026-07-15` |
| `anthropic.claude-code.marketplaces.catalog-sources` | <https://code.claude.com/docs/en/plugin-marketplaces> | `code.claude.com` | `Create the marketplace file`; `Plugin sources` | `2026-07-15` |
| `anthropic.claude-code.ide.shared-differences` | <https://code.claude.com/docs/en/ide-integrations> | `code.claude.com` | `Configure settings`; `VS Code extension vs. Claude Code CLI`; `Manage marketplaces` | `2026-07-15` |
| `anthropic.claude-code.changelog.legacy-command-nesting` | <https://code.claude.com/docs/en/changelog> | `code.claude.com` | `1.0.45`; `1.0.51` | `2026-07-15` |

## OpenAI公式ソース

OpenAI rowは、official Codex manualが出力したexact first-party Markdown source URLを使用する。
`.md` responseは意図したものであり、drift checkのMarkdown content-type branchで受理する。

2026-07-20のInspector runtime reconciliationはproduct policyであり、upstream Codex behaviorに関するassertion
ではない。調査対象Codex candidateでは、contract-declaredなstructural `lstat` checkpointからの正確な
`ENOENT`だけを`absent`または`entry-disappeared`へ変換する。それ以外のthrowまたはrejectionは、`open`や
`read`からの`ENOENT`を含め、変更せずpropagateする。NUL byteはbinaryかつdiagnostic-only outcomeとする。
NULを含まない全byte streamはUTF-8 replacement semanticsで正確に1回decodeし、invalid sequenceは
`utf-8-replaced`となり、生成された`U+FFFD`を含む文字化けtextをparsing、extraction、display、comparisonに使用する
完全なsourceに保持する。Maintained OpenAI assertionは選択した公式sectionだけをparaphraseし、これらInspector所有の
filesystemまたはdecode方針をencodeしてはならない。このreconciliationでは選択した公式textもmaintained OpenAI
assertionも変わらないため、`snapshotFingerprint`、`semanticFingerprint`、`reviewedOn`は変更しない。

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `openai.codex.agents-md` | <https://learn.chatgpt.com/docs/agent-configuration/agents-md.md> | `learn.chatgpt.com` | `How Codex discovers guidance`; `Customize fallback filenames` | `2026-07-15` |
| `openai.codex.config-basic` | <https://learn.chatgpt.com/docs/config-file/config-basic.md> | `learn.chatgpt.com` | `Codex configuration file`; `Configuration precedence`; `Feature flags` | `2026-07-15` |
| `openai.codex.custom-prompts` | <https://learn.chatgpt.com/docs/custom-prompts.md> | `learn.chatgpt.com` | `Custom Prompts` | `2026-07-15` |
| `openai.codex.hooks` | <https://learn.chatgpt.com/docs/hooks.md> | `learn.chatgpt.com` | `Where Codex looks for hooks`; `Review and trust hooks`; `Config shape`; `Plugin-bundled hooks` | `2026-07-15` |
| `openai.codex.mcp` | <https://learn.chatgpt.com/docs/extend/mcp.md> | `learn.chatgpt.com` | `Connect Codex to an MCP server` | `2026-07-15` |
| `openai.codex.memories` | <https://learn.chatgpt.com/docs/customization/memories.md> | `learn.chatgpt.com` | `How local Codex memories work`; `Local memory storage`; `Configure local memories` | `2026-07-15` |
| `openai.codex.plugins` | <https://learn.chatgpt.com/docs/build-plugins.md> | `learn.chatgpt.com` | `Build your own curated plugin list`; `Add a marketplace from the CLI`; `Create a plugin manually`; `Marketplace metadata`; `How the ChatGPT desktop app uses marketplaces`; `Plugin structure` | `2026-07-15` |
| `openai.codex.rules` | <https://learn.chatgpt.com/docs/agent-configuration/rules.md> | `learn.chatgpt.com` | `Create a rules file` | `2026-07-15` |
| `openai.codex.skills` | <https://learn.chatgpt.com/docs/build-skills.md> | `learn.chatgpt.com` | `How Codex uses skills`; `Where to save skills`; `Distribute skills with plugins`; `Optional metadata` | `2026-07-15` |
| `openai.codex.subagents` | <https://learn.chatgpt.com/docs/agent-configuration/subagents.md> | `learn.chatgpt.com` | `Orchestration and thread controls`; `Custom agents` | `2026-07-15` |

## Offline validationと明示drift review

通常のproduct startup、Repository inspection、Global inspection、test、packaged runtimeはofficial pageをfetchせず、
このdevelopment/test fixtureもloadしない。Offline contract checkは次のcommandである。

```sh
pnpm exec vitest run tests/contract/official-sources
```

Network accessなしで、exact registry/Evidence set equality、bilingual edge parity、reciprocal affected ID、
official host、record schema、assertion target、再計算した`semanticFingerprint`をvalidateする。

Networkを使用するdrift reviewは、maintainerだけが次を明示実行する。

```sh
pnpm run check:official-sources
```

このcommandはcredential、cookie、Repository contents、その他local stateを送信しない。UTF-8 HTMLまたはMarkdownだけを
受理し、全redirect hopはrowのexact `officialHost`を維持しなければならない。Request、response、redirect、decodeの
capacityはNode.jsと実行環境から継承し、recoverableなenvironment failureはfail closedする。HTTPS downgrade、
cross-host redirect、誤ったcontent type、decode failure、headingの欠落または重複はhard failureとする。同一host上の
異なるfinal URLはreview対象として報告し、`canonicalUrl`を黙って置き換えない。

Normalization version `1`は、列挙した各headingから同level以上の次heading直前までを選択し、document
chromeと`script`/`style` nodeを除去し、prose/code textを保持し、entity decode、Unicode NFC、LF ending、
line-edge trim、horizontal-whitespace collapseを適用し、列挙順にsectionをjoinしてlowercase SHA-256の
`snapshotFingerprint`を計算する。重複またはoverlapするselected sectionは黙ってdeduplicateせずinvalidと
する。

このcommandはdriftを報告するだけで、behavior、rule、strategy、assertion、anchor、fingerprint、URL、
review dateを変更しない。Maintainerはreverse indexに含まれる全affected recordと両言語版をreviewし、
paraphrased assertionとfingerprintを明示更新した後にだけ`reviewedOn`を進める。Remote page body、snippet、
response captureはcheck inしない。
