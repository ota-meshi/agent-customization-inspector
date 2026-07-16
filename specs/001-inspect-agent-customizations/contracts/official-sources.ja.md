# 公式ソース台帳

[English](official-sources.md)

**Registry version**: 2026-07-15
**Official-source review**: 2026-07-15
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
  matching headingを見つけなければならない。1 recordは1..16 anchorを持ち、各heading textは最大
  256 UTF-8 byteである。
- `reviewedOn`は、最後にhuman semantic reviewを実施した日である。このreleaseの全recordは
  `2026-07-15`にreview済みである。
- 全rowが`normalizationVersion: 1`を使用する。

Checked-inする`tests/fixtures/conformance/official-sources.json`は、これらrowのmachine-readableな
materializationである。さらにdata modelが要求する3つのderived affected-ID array、maintainedな
paraphrased assertion、`snapshotFingerprint`、`semanticFingerprint`を含む。別の`sourceId`、URL、host、
anchor、review dateを導入してはならない。

Registryはclosed limit 128未満の47 recordを持つ。各fixture recordは1..64 assertionを持つ。各assertionは
stable assertion ID、最大1,024 UTF-8 byteのparaphrase済みexpected semantics、そのsourceのexact reverse
indexのsubsetであるaffected IDを持つ。Page textのcopyとgeneric product-area targetは禁止する。
`snapshotFingerprint`は選択・normalizeしたsectionのlowercase SHA-256、`semanticFingerprint`はstable sort後の
assertionに対するcanonical JSONのlowercase SHA-256である。Bounded fieldはtruncateしない。

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

したがって、下記registryのID setは、4つのcanonical Evidence sourceが使用するID setを単に包含するの
ではなく、完全に一致しなければならない。各`sourceId`はここで正確に1回だけ定義する。

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

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `vscode.copilot.instructions` | <https://code.visualstudio.com/docs/agent-customization/custom-instructions> | `code.visualstudio.com` | `Types of instruction files`; `Use a .github/copilot-instructions.md file`; `Use .instructions.md files`; `Use an AGENTS.md file`; `Use a CLAUDE.md file`; `Instruction priority` | `2026-07-15` |
| `vscode.copilot.customization` | <https://code.visualstudio.com/docs/agent-customization/overview> | `code.visualstudio.com` | `What each customization gives you`; `Use customizations in a monorepo` | `2026-07-15` |
| `vscode.copilot.settings` | <https://code.visualstudio.com/docs/agents/reference/ai-settings> | `code.visualstudio.com` | `Custom instructions settings`; `Reusable prompt files settings`; `Custom agents settings`; `Agent skills settings`; `Agent plugins settings` | `2026-07-15` |
| `vscode.copilot.prompts` | <https://code.visualstudio.com/docs/agent-customization/prompt-files> | `code.visualstudio.com` | `Prompt file locations`; `Create a prompt file`; `Use a prompt file in chat` | `2026-07-15` |
| `vscode.copilot.custom-agents` | <https://code.visualstudio.com/docs/agent-customization/custom-agents> | `code.visualstudio.com` | `Handoffs`; `Custom agent file locations`; `Custom agent file structure`; `Tool list priority`; `Share custom agents across teams` | `2026-07-15` |
| `vscode.copilot.skills` | <https://code.visualstudio.com/docs/agent-customization/agent-skills> | `code.visualstudio.com` | `Create a skill`; `SKILL.md file format`; `How Copilot uses skills`; `Use shared skills` | `2026-07-15` |
| `vscode.copilot.hooks` | <https://code.visualstudio.com/docs/agent-customization/hooks> | `code.visualstudio.com` | `Configure hooks`; `Security considerations` | `2026-07-15` |
| `vscode.copilot.mcp` | <https://code.visualstudio.com/docs/agent-customization/mcp-servers> | `code.visualstudio.com` | `Add an MCP server`; `MCP server trust`; `Synchronize MCP configuration across devices` | `2026-07-15` |
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
official host、record bound、assertion target、再計算した`semanticFingerprint`をvalidateする。

Networkを使用するdrift reviewは、maintainerだけが次を明示実行する。

```sh
pnpm run check:official-sources
```

このcommandはcredential、cookie、Repository contents、その他local stateを送信しない。Recordごとに最大
10秒、decompress後2 MiB、UTF-8 HTMLまたはMarkdown、3回までのHTTPS redirectだけを許可する。全redirect
hopはrowのexact `officialHost`を維持しなければならない。HTTPS downgrade、cross-host redirect、誤った
content type、oversized response、decode failure、headingの欠落または重複はhard failureとする。同一host上の
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
