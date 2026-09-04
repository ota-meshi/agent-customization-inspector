# 公式ソース台帳

[English](official-sources.md)

**Registry version**: 2026-07-20
**Official-source review**: 2026-07-20

この台帳は、3つのvendor contractと[Runtime Composition](runtime-composition.ja.md)が使用する
全`sourceId`の唯一のnormative ownerである。Vendor contractとcomposition contractは、全normative
owner-to-source edgeをEvidence cell内の`sourceId`としてだけ記述する。定義済みIDを説明文中のnon-edge
cross-referenceとして繰り返すことはできるが、そのURL、official host、review対象section、review dateを
所有も上書きもしない。他の場所に重複source registryを置くことはinvalidで、この台帳を上書きできない。

Source registryはevidence metadataであって、Inspectorのread authorityではない。Filesystem candidateを
追加せず、boundaryを拡張せず、customizationがruntimeでactiveだったことも証明しない。

## Record表記とownership

各table rowは1つのofficial sourceであり、stableなkeyで識別され、次のauthored fieldを所有する。

- `canonicalUrl`はrowに示した正確なHTTPS URLである。Credential、query、fragmentを含まない。
- `officialHost`は、そのrecordだけに対するexact host allowlistである。Subdomainやsibling hostを暗黙に
  許可しない。
- `sectionAnchors`内のsemicolon区切りentryは、それぞれexact rendered heading-text descriptorである。
  CSS/XPath selectorでもURL fragmentでもない。Drift checkerは、列挙した各entryを、配信された正確に
  1つのheadingへ、または配信されたheadingのどれもそれを担わないときは、その本文を持つtable of
  contentsのlinkすべてが指す配信済みの1つのfragmentへ解決しなければならない（§ Offline validationと
  明示drift review）。Anchorとheading-textのcapacityおよびcompletion behaviorは、
  Node.jsと実行環境から継承する。
- `reviewedOn`は、該当sectionを最後に読み、引用元recordの主張と突き合わせた日であり、実施者は問わない。引用した見出しがまだ存在することの確認はより狭い検査であり、この日付を進めない。rowごとに記述する。
  2026-07-20 reconciliationで再reviewしていないrecordは`2026-07-15`を保持する。

このregistryを参照する保守対象behavior、rule、strategyはそれぞれ、citeしたsectionがそれをどこまで
確立しているかを、record自身の上に述べる。

```ts
type DocumentationStatus =
  | 'documented'
  | 'partially-documented'
  | 'unknown'
  | 'conflict';
type LifecycleQualifier = 'preview' | 'experimental' | 'deprecated';
```

Qualifier arrayは重複を持たず、常に`preview`、`experimental`、`deprecated`の順でserializeする。
Emptyはreview済みsourceがlifecycle claimを行わないことを意味するだけで、`stable`を意味も暗示もしない。
`documented`は正確なreview済みsectionが保守対象atomic assertionを完全に確立すること、
`partially-documented`は一部だけを確立すること、`unknown`はそのassertionについて決定を確立しないこと、
`conflict`は互換性のないofficial assertionを保持することを表す。`documentation-conflict`はこの語彙に含まれない。
互換性のない場合の綴りは`conflict`である。

各statusは自身のsubjectに属し、source IDやvendor全体へ付けるものではない。これらはmaintenance recordであり、
どのresponseも運ばない（QR-005）。provenanceが公開するのはどのruleがfileをadmitしたかであって、そのruleが
どれだけ文書化されているかではない。Assessmentは該当subjectのcompleteな`sourceRefs` setに
裏付けられ、後述するreverse-index ownershipを変更しない。

維持対象の各behavior・rule・strategy recordが持つ`evidence`配列が、これらrowのmachine-readableな
materializationである: citationは、review済みURL・見出し・review日・maintainedなparaphraseを、それが支える
record上に書く。したがって主張と根拠は互いに乖離しえない。Citationは、このpageが持たないURL、host、anchor、
review dateを導入してはならない。

Registryは以下のrowだけを持つ。Rowを引用するcitationは、source ID、URLとhost、正確なreview済み見出し、
review日、そしてそれらの見出しが引用元recordに対して確立する内容のmaintainedなparaphrase 1件を持つ。
Page textのcopyとgeneric product-area targetは禁止する。Fieldをtruncateしない。

Registryはpage textのdigestもparaphraseのdigestも持たない。Sectionの本文が引用元recordの保守する内容を
今も確立しているかは読解であり、reviewerがreviewのたびにそれを行う（AGENTS.ja.md「公式出典の検証方針」）。
あるpageがどのbehavior・rule・strategyに影響するかはcitation自身から読む。Offline gateが全citationをその
rowへ解決するので、変更されたpageのreview setは`evidence`にその`sourceId`を持つ全recordであり、
逆引きindexを公開するrecordは無い。

このreleaseでは、次のexact official hostだけを許可する。

| Vendor | Exact official hosts |
|---|---|
| GitHub | `docs.github.com` |
| Microsoft | `code.visualstudio.com` |
| Anthropic | `code.claude.com` |
| OpenAI | `learn.chatgpt.com`; `developers.openai.com` |

受理する第一者evidence classは、全vendor横断で1つのhierarchyを形成する。上記exact host上の
general guide、reference page、version付きrelease noteまたはchangelogだけを受理classとする。
Guideとreference pageは直接述べるclaimだけを確立し、この2 classは同格である。直接的で
version-qualifiedなrelease note/changelog assertionは、guideまたはreference pageの省略に優先する。
一方、直接矛盾するassertion同士はrankせず`conflict`として保持する。公式source repositoryと公式
issue/discussion statementはすべてのdocumentation classより下位であり、上記hostに登録できず、
登録済みdocumentation evidenceの代替にはならない。後述のMicrosoft Visual Studio Code sectionは、
このhierarchyを特定のguide/release-note conflictへ適用したものである。

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
5. Record自身が運ぶcitationとのreciprocal equalityを要求する。Edgeの欠落・余分・
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
admission済みsource form、正確なsource-form extractor applicability、relationship kindを新規作成または
意味変更してはならない。Rowはmetadata fieldを列挙しない: skillの宣言はfileが書いたkeyであり、
authored keyの集合は閉じていない（FR-007）。

次のlowercase SHA-256値を記録済みfreezeとする。指定したUTF-8、BOMなし、LF-onlyの各contractについて、
case-foldしたtextが`presentation allowlist`で終わる一意なlevel-2 headingを特定し、後続のtable以外のlineをskipし、
first byteが`|`である最初の連続line群を各byteそのまま連結し、最終rowを含む全rowの末尾にLFを1つ付けたものを
digest inputとする。Heading、prose、blank line、連続table後のlineはhashへ含めない。

| Vendor | 英語table SHA-256 | 日本語table SHA-256 |
|---|---|---|
| GitHub Copilot | `a6f35ab28711f719500e2a4121a9aeb9d56f74f5b4accecdcd3e9c4643416525` | `b1ec5038a7c581fea4d4ed9e0f83eb7ca730c18312c65a6689bfcc3a93a3a926` |
| Claude Code | `2aad69c35c2ff0e348b62bd1f8f6007a538337f14d5ddaa08f6f159b3c46f858` | `15862bf76910e507d65ebabe865f61c5652167dcfbaad07600d29a244ac3c73a` |
| OpenAI Codex | `2a598e1bd30690cfe07d64cd6e1a8c5d80512249eacb5e1e59741bd3d9194226` | `e985ad14696d2ef2a47e7fcacbdbb39a83864fdd4d5c62546112f25e62e98301` |

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
| `github.copilot.cli.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions> | `docs.github.com` | `Types of custom instructions`; `How multiple instruction files interact`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-08-27` |
| `github.copilot.instructions.support` | <https://docs.github.com/en/copilot/reference/custom-instructions-support> | `docs.github.com` | `GitHub.com`; `Visual Studio Code`; `Copilot CLI` | `2026-08-27` |
| `github.copilot.cloud.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions> | `docs.github.com` | `Creating custom instructions`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-08-19` |
| `github.copilot.cli.reference` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference> | `docs.github.com` | `MCP server configuration`; `Skill locations`; `Commands (alternative skill format)`; `Custom agent locations`; `Environment variables` | `2026-08-27` |
| `github.copilot.cli.mcp` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers> | `docs.github.com` | `Adding per-repository MCP servers` | `2026-08-27` |
| `github.copilot.cli.configuration` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference> | `docs.github.com` | `Directory overview`; `User-editable files`、`Automatically managed files`; `Changing the location of the configuration directory`; `Configuration file settings`; `Repository settings (.github/copilot/settings.json)` | `2026-08-27` |
| `github.copilot.cli.custom-agents` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli> | `docs.github.com` | `Creating a custom agent`; `Using a custom agent` | `2026-08-27` |
| `github.copilot.cli.plugins` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference> | `docs.github.com` | `CLI commands`; `plugin.json`; `marketplace.json`; `Plugin source types`; `File locations`; `Loading order and precedence` | `2026-08-27` |
| `github.copilot.hooks` | <https://docs.github.com/en/copilot/reference/hooks-reference> | `docs.github.com` | `Hooks locations`; `Cloud agent execution environment`; `Hook configuration format`; `Disable all hooks` | `2026-08-27` |
| `github.copilot.custom-agents` | <https://docs.github.com/en/copilot/reference/custom-agents-configuration> | `docs.github.com` | `YAML frontmatter properties`; `MCP server configuration details`; `Example agent profile configurations`; `MCP server configurations` | `2026-08-20` |
| `github.copilot.skills` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills> | `docs.github.com` | `Creating and adding a skill`; `Adding a skill that someone else has created`; `How Copilot uses agent skills`; `Skills versus custom instructions` | `2026-08-27` |
| `github.copilot.plugins` | <https://docs.github.com/en/copilot/concepts/agents/about-plugins> | `docs.github.com` | `What plugins contain`; `How plugins are structured`; `Where can I get plugins?`; `How plugin marketplaces work`; `Plugins compared with manual configuration` | `2026-07-15` |
| `github.copilot.cli.lsp` | <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers> | `docs.github.com` | `How to add an LSP server`; `How LSP servers are loaded` | `2026-08-23` |
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
| `vscode.copilot.instructions` | <https://code.visualstudio.com/docs/agent-customization/custom-instructions> | `code.visualstudio.com` | `Types of instruction files`; `Use a .github/copilot-instructions.md file`; `Use .instructions.md files`; `Instructions file locations`; `Instructions file format`; `Use an AGENTS.md file`; `Use multiple AGENTS.md files`; `Use a CLAUDE.md file`; `Instruction priority` | `2026-09-04` |
| `vscode.copilot.customization` | <https://code.visualstudio.com/docs/agent-customization/overview> | `code.visualstudio.com` | `Use customizations in a monorepo` | `2026-08-19` |
| `vscode.copilot.settings` | <https://code.visualstudio.com/docs/agents/reference/ai-settings> | `code.visualstudio.com` | `Chat settings`; `Custom instructions settings`; `Reusable prompt files settings`; `Custom agents settings`; `Agent skills settings`; `Agent plugins settings` | `2026-08-19` |
| `vscode.copilot.prompts` | <https://code.visualstudio.com/docs/agent-customization/prompt-files> | `code.visualstudio.com` | `Prompt file locations`; `Prompt file format`; `Create a prompt file`; `Use a prompt file in chat` | `2026-08-22` |
| `vscode.copilot.custom-agents` | <https://code.visualstudio.com/docs/agent-customization/custom-agents> | `code.visualstudio.com` | `Handoffs`; `Custom agent file locations`; `Custom agent file structure`; `Tool list priority`; `Share custom agents across teams` | `2026-07-15` |
| `vscode.copilot.skills` | <https://code.visualstudio.com/docs/agent-customization/agent-skills> | `code.visualstudio.com` | `Create a skill`; `SKILL.md file format`; `How Copilot uses skills`; `Use shared skills` | `2026-07-15` |
| `vscode.copilot.hooks` | <https://code.visualstudio.com/docs/agent-customization/hooks> | `code.visualstudio.com` | `Configure hooks`; `Hook file locations`; `Hook configuration format`; `Agent-scoped hooks`; `How does VS Code handle Claude Code hook configurations?`; `Security considerations` | `2026-08-26` |
| `vscode.copilot.mcp` | <https://code.visualstudio.com/docs/agent-customization/mcp-servers> | `code.visualstudio.com` | `Add an MCP server`; `Configure the mcp.json file`; `MCP server trust`; `Synchronize MCP configuration across devices` | `2026-08-20` |
| `vscode.copilot.mcp.workspace-root-release` | <https://code.visualstudio.com/updates/v1_118> | `code.visualstudio.com` | `Workspace .mcp.json files and server deduplication` | `2026-08-20` |
| `vscode.copilot.plugins` | <https://code.visualstudio.com/docs/agent-customization/agent-plugins> | `code.visualstudio.com` | `What plugins provide`; `Plugin manifest (plugin.json)`; `Plugin formats`; `Configure plugin marketplaces`; `Use local plugins`; `Workspace plugin recommendations` | `2026-08-25` |
| `vscode.settings` | <https://code.visualstudio.com/docs/configure/settings> | `code.visualstudio.com` | `User settings`; `Workspace settings`; `Profile settings`; `Settings precedence` | `2026-08-23` |

## Anthropic公式ソース

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `anthropic.claude-code.directory.file-reference` | <https://code.claude.com/docs/en/claude-directory> | `code.claude.com` | `File reference` | `2026-08-27` |
| `anthropic.claude-code.env-vars` | <https://code.claude.com/docs/en/env-vars> | `code.claude.com` | `Variables` | `2026-08-27` |
| `anthropic.claude-code.memory.locations-load` | <https://code.claude.com/docs/en/memory> | `code.claude.com` | `Choose where to put CLAUDE.md files`; `AGENTS.md`; `How CLAUDE.md files load`; `Organize rules with .claude/rules/`; `Auto memory` | `2026-08-27` |
| `anthropic.claude-code.large-codebases.start-directory` | <https://code.claude.com/docs/en/large-codebases> | `code.claude.com` | `Choose where to start Claude`; `Layer CLAUDE.md files by directory`; `Add per-directory skills` | `2026-07-25` |
| `anthropic.claude-code.sdk.setting-sources` | <https://code.claude.com/docs/en/agent-sdk/claude-code-features> | `code.claude.com` | `Control filesystem settings with settingSources`; `CLAUDE.md load locations` | `2026-08-18` |
| `anthropic.claude-code.settings.scopes-precedence` | <https://code.claude.com/docs/en/settings> | `code.claude.com` | `Settings files and who they affect`、`Compare the scope of each settings file`、`Where Claude Code keeps the local file in a git repository`、`Settings precedence`、`Lists merge instead of overriding` | `2026-08-27` |
| `anthropic.claude-code.permissions.rule-syntax` | <https://code.claude.com/docs/en/permissions> | `code.claude.com` | `Permission rule syntax`、`Wildcard patterns` | `2026-08-22` |
| `anthropic.claude-code.skills.locations-discovery` | <https://code.claude.com/docs/en/skills> | `code.claude.com` | `Where skills live`、`Discovery from parent and nested directories`、`How a skill gets its command name` | `2026-08-27` |
| `anthropic.claude-code.subagents.scope-context` | <https://code.claude.com/docs/en/sub-agents> | `code.claude.com` | `Choose the subagent scope`; `Available tools`; `Scope MCP servers to a subagent`; `Preload skills into subagents`; `Enable persistent memory`; `What loads at startup`; `Let subagents spawn their own subagents` | `2026-08-27` |
| `anthropic.claude-code.hooks.locations-resolution` | <https://code.claude.com/docs/en/hooks> | `code.claude.com` | `Hook locations`; `Hooks in skills and agents`; `The /hooks menu`; `PreToolUse` | `2026-08-25` |
| `anthropic.claude-code.mcp.scopes-precedence` | <https://code.claude.com/docs/en/mcp> | `code.claude.com` | `MCP installation scopes`; `Scope hierarchy and precedence`; `Plugin-provided MCP servers` | `2026-08-27` |
| `anthropic.claude-code.output-styles.locations` | <https://code.claude.com/docs/en/output-styles> | `code.claude.com` | `Create a custom output style`; `How output styles work` | `2026-08-27` |
| `anthropic.claude-code.plugins.components-scopes` | <https://code.claude.com/docs/en/plugins-reference> | `code.claude.com` | `Plugin installation scopes`; `Skills-directory plugins`; `Hooks`; `Plugin manifest schema`; `File locations reference`; `Plugin caching and file resolution` | `2026-08-27` |
| `anthropic.claude-code.marketplaces.catalog-sources` | <https://code.claude.com/docs/en/plugin-marketplaces> | `code.claude.com` | `Create the marketplace file`; `Plugin sources`; `Require marketplaces for your team` | `2026-08-25` |
| `anthropic.claude-code.ide.shared-differences` | <https://code.claude.com/docs/en/ide-integrations> | `code.claude.com` | `Configure settings`; `VS Code extension vs. Claude Code CLI`; `Manage marketplaces` | `2026-07-25` |
| `anthropic.claude-code.changelog.legacy-command-nesting` | <https://code.claude.com/docs/en/changelog> | `code.claude.com` | `1.0.45`、`1.0.51` | `2026-09-04` |
| `anthropic.claude-code.changelog.nested-skill-discovery` | <https://code.claude.com/docs/en/changelog> | `code.claude.com` | `2.1.6`; `2.1.178` | `2026-09-04` |

## OpenAI公式ソース

OpenAI rowは、official Codex manualが出力したexact first-party Markdown source URLを使用する。
`.md` responseは意図したものであり、drift checkのMarkdown content-type branchで受理する。

2026-07-20のInspector runtime reconciliationはproduct policyであり、upstream Codex behaviorに関するassertion
ではない。調査対象Codex candidateでは、absentなtargetは文書化されたfallbackを選択し、readできないfileは
FR-028の下でそのfileのdiagnosticとなり、予期しないfailureはattemptを通常のerrorとしてfailさせる。NUL byteはbinaryかつ
diagnostic-only outcomeとする。
NULを含まない全byte streamはUTF-8 replacement semanticsで正確に1回decodeし、invalid sequenceは
`utf-8-replaced`となり、生成された`U+FFFD`を含む文字化けtextをparsing、extraction、display、comparisonに使用する
完全なsourceに保持する。Maintained OpenAI assertionは選択した公式sectionだけをparaphraseし、これらInspector所有の
filesystemまたはdecode方針をencodeしてはならない。このreconciliationはpageを読んでいないので、
`reviewedOn`を進めなかった。この日付は引用sectionを読んだときに進み、その読解がassertionを変えたかどうかに
かかわらず進む。

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `openai.codex.agents-md` | <https://learn.chatgpt.com/docs/agent-configuration/agents-md.md> | `learn.chatgpt.com` | `How Codex discovers guidance`; `Customize fallback filenames` | `2026-08-27` |
| `openai.codex.config-basic` | <https://learn.chatgpt.com/docs/config-file/config-basic.md> | `learn.chatgpt.com` | `Codex configuration file`; `Configuration precedence`; `Feature flags` | `2026-08-27` |
| `openai.codex.custom-prompts` | <https://learn.chatgpt.com/docs/custom-prompts.md> | `learn.chatgpt.com` | `Custom Prompts` | `2026-08-27` |
| `openai.codex.hooks` | <https://learn.chatgpt.com/docs/hooks.md> | `learn.chatgpt.com` | `Where Codex looks for hooks`; `Review and trust hooks`; `Config shape`; `Plugin-bundled hooks` | `2026-08-27` |
| `openai.codex.mcp` | <https://learn.chatgpt.com/docs/extend/mcp.md> | `learn.chatgpt.com` | `Connect Codex to an MCP server` | `2026-08-27` |
| `openai.codex.memories` | <https://learn.chatgpt.com/docs/customization/memories.md> | `learn.chatgpt.com` | `How local Codex memories work`; `Local memory storage`; `Configure local memories` | `2026-08-27` |
| `openai.codex.plugins` | <https://developers.openai.com/plugins/build/plugins.md> | `developers.openai.com` | `Build your own curated plugin list`; `Add a marketplace from the CLI`; `Create a plugin manually`; `Marketplace metadata`; `How local marketplaces work`; `Plugin structure`; `Manifest fields` | `2026-08-27` |
| `openai.codex.rules` | <https://learn.chatgpt.com/docs/agent-configuration/rules.md> | `learn.chatgpt.com` | `Rules`; `Create a rules file`; `Understand rule fields`; `Understand the rules language` | `2026-08-27` |
| `openai.codex.skills` | <https://learn.chatgpt.com/docs/build-skills.md> | `learn.chatgpt.com` | `How ChatGPT and Codex use skills`; `Where Codex loads local skills`; `Distribute skills with plugins`; `Optional metadata` | `2026-08-27` |
| `openai.codex.subagents` | <https://learn.chatgpt.com/docs/agent-configuration/subagents.md> | `learn.chatgpt.com` | `Orchestration and thread controls`; `Approvals and sandbox controls`; `Custom agents`; `Custom agent file schema` | `2026-08-27` |

## Offline validationと明示drift review

通常のproduct startup、Repository inspection、Global inspection、test、packaged runtimeはofficial pageを
fetchしない。Citationは支えるrecord上にあるため、offline contract checkはそれらrecordを既に対象とする
suiteである。

```sh
pnpm exec vitest run tests/contract
```

Network accessなしで次をvalidateする。各citationがsource ID、credential/query/fragmentを含まず自身が
述べたhost上にあるHTTPS URL、non-emptyなreview済みsection、review日、maintainedなparaphraseを持つこと。
各citationが上記の規範的rowへ解決すること — 同一のURL、同一のhost、そのrowが挙げるsectionから取られた
section — およびそのrowが両言語で同一であること。そして1つのsource IDが正確に1 pageへ解決すること
— pageが移動した後に2つのrecordが所在で食い違えないこと。

Reverse indexを公開するrecordは無く、fingerprintも存在しない。変更されたpageのreview setは`evidence`に
その`sourceId`を持つ全recordであり、上記のcitation解決がそれを見つける。

Networkを使用するdrift reviewはmaintainerだけが明示実行し、少なくともすべてのfrozen release candidate前と、
supported surfaceへのmaterialなupstream変更を認知した時点で実行する。

```sh
pnpm run check:official-sources -- --network
```

このcommandはcredential、cookie、Repository contents、その他local stateを送信しない。UTF-8 HTMLまたはMarkdownだけを
受理し、redirectは追跡しない。Rowが記録するのは応答するURLであるため、`3xx`は追跡せずreview対象として
報告する。追跡すれば記録済みURLはcitationが名指すaddressではなく起点になってしまい、移転はreviewerが
行うcitationの変更である。Request、response、redirect、decodeの
capacityはNode.jsと実行環境から継承し、recoverableなenvironment failureはfail closedする。HTTPS downgrade、
cross-host redirect、誤ったcontent type、decode failure、2つ以上の配信headingが担うsection、そして最終的な解決がmissingまたはambiguousであるsectionをhard failureとする。配信されたheadingのどれも担わないsectionは、heading checkに限り、ページ自身のtable of contentsから探す。Siteはその一覧を同じcontentから導出するので、引用したsectionを本文に持つfragment linkは、そのページが持つsectionを名指している — client-renderedなページがheadingを配信しなかったsectionも、Claude Code changelogが各releaseをlabel付きentryとして描くように、heading以外の形で描かれるsectionも同じである。Commandは、そうしたlinkがすべて1つのfragment spellingを名指し、ページがそのfragmentを配信するときにsectionを受理する。ページが配信しないtargetが1つだけならmissingとし、live/dead targetの混在を含め、異なるtarget spellingが2つ以上ならlinkは1つのsectionを引用していないためambiguousとする。Accepted fallbackで確認したsectionは報告する。このfallbackがないと、そうしたページ上の全citationに対してdriftを報告することになる。Maintainerが却下する以外にないhard failureは、gateが読まれなくなる原因そのものである。同一host上の
Redirectを黙って追跡して新しい`canonicalUrl`にすることはない。

このcommandはdriftを報告するだけで、behavior、rule、strategy、assertion、anchor、URL、review dateを
変更しない。Maintainerは`evidence`にそのsourceを持つ全recordと両言語版をreviewし、paraphrased assertionを
明示更新した後にだけ`reviewedOn`を進める。Remote page body、snippet、
response captureはcheck inしない。
