# Official Source Registry

[日本語](official-sources.ja.md)

**Registry version**: 2026-07-15
**Official-source review**: 2026-07-15
**Normalization version**: `1`

This registry is the single normative owner of every `sourceId` used by the three
vendor contracts and by [Runtime Composition](runtime-composition.md). Vendor and
composition contracts author every normative owner-to-source edge only as a `sourceId`
in an Evidence cell. They may repeat a defined ID as a non-edge prose cross-reference,
but they do not own or override its URL, official host, reviewed sections, or review
date. A duplicate source registry elsewhere is invalid and cannot override this one.

The source registry is evidence metadata, not Inspector read authority. It never adds a
filesystem candidate, expands a boundary, or proves that a customization was active at
runtime.

## Record notation and ownership

Each table row owns one `OfficialSourceRecord` key and the following authored fields:

- `canonicalUrl` is the exact HTTPS URL shown in the row. It has no credentials, query,
  or fragment.
- `officialHost` is an exact host allowlist for that record. Subdomains and sibling hosts
  are not implied.
- Each semicolon-separated entry under `sectionAnchors` is an exact rendered heading-text
  descriptor. It is not a CSS/XPath selector or a URL fragment. The drift checker must
  find exactly one matching heading for every listed entry. Anchor and heading-text
  capacity and completion behavior are inherited from Node.js and the execution environment.
- `reviewedOn` is the date of the last human semantic review. Every record in this
  release was reviewed on `2026-07-15`.
- Every row uses `normalizationVersion: 1`.

The checked-in `tests/fixtures/conformance/official-sources.json` is the machine-readable
materialization of these rows. It additionally contains the three derived affected-ID
arrays, maintained paraphrased assertions, `snapshotFingerprint`, and
`semanticFingerprint` required by the data model. It must not introduce another
`sourceId`, URL, host, anchor, or review date.

The registry contains exactly the rows below. Each fixture record has a non-empty maintained
assertion set. Every assertion has a stable assertion ID, paraphrased expected semantics,
and affected IDs that are subsets of that source's exact
reverse index; copied page text and generic product-area targets are forbidden.
`snapshotFingerprint` is the lowercase SHA-256 of the selected normalized sections.
`semanticFingerprint` is the lowercase SHA-256 of canonical JSON for the assertions after
their stable sort. No field is truncated.

Only these exact official hosts are valid in this release:

| Vendor | Exact official hosts |
|---|---|
| GitHub | `docs.github.com` |
| Microsoft | `code.visualstudio.com` |
| Anthropic | `code.claude.com` |
| OpenAI | `learn.chatgpt.com` |

## Exact affected-record reverse index

The affected-ID arrays are not copied into the tables below because hand-maintaining both
directions would create an unauditable second source of truth. They are generated as an
exact inverse index from the Evidence cells:

1. Parse only the canonical English contracts
   `vendors/github-copilot.md`, `vendors/claude-code.md`,
   `vendors/openai-codex.md`, and `runtime-composition.md`.
2. “Evidence cell” means a final column whose exact English header is `Evidence`,
   `Evidence / basis`, or `Official source refs`. Require the row owner in the first
   column: `Behavior ID` maps to `behaviorId`; `Rule ID` and `Excluded Rule ID` map to
   `ruleId`; `Strategy ID` maps to `strategyId`. An Evidence cell without exactly one
   stable owner or an unrecognized owner/source column is a contract error. A backticked
   `sourceId` in explanatory prose is a non-edge cross-reference: it MUST resolve to this
   registry, but it never contributes an affected ID or an inverse-index edge.
3. Treat the Evidence cell as that record's complete `sourceRefs` set. Extract the
   backticked tokens, then validate the entire trimmed cell against this closed grammar:

   ```text
   evidence  = token *( separator token )
   token     = "`" sourceId "`"
   separator = optional-ASCII-horizontal-space ( "," / ";" / "、" ) optional-ASCII-horizontal-space
   sourceId  = ( "github" / "vscode" / "anthropic" / "openai" )
               1*( "." segment )
   segment   = lowercase-alphanumeric *( lowercase-alphanumeric / "-" )
   ```

   Delimiters are therefore validation syntax, not the extraction algorithm. Text outside
   tokens, links, unbackticked IDs, empty tokens, a trailing delimiter, punctuation other
   than the three closed separators, and inferred product-wide evidence are forbidden.
   The canonical authored separator for new or reformatted content is a comma followed by
   one ASCII space. Semicolon and Japanese comma are contract-valid compatibility
   spellings; canonicalization rewrites every accepted separator to `, ` before comparing
   the English and Japanese edge sets.
4. Invert every `(ownerId, sourceId)` edge. Sort and deduplicate each source's results into
   `affectedBehaviorIds`, `affectedRuleIds`, and `affectedStrategyIds`. At least one of the
   three arrays must be non-empty.
5. Require reciprocal equality with the arrays materialized in
   `official-sources.json`. A missing edge, extra edge, duplicate edge, unknown source,
   unknown owner, orphan source, or differing owner type fails the offline contract test.
6. Parse the Japanese counterparts independently and require the same owner IDs,
   `sourceId` tokens, and edges. Japanese files validate semantic parity but are not a
   second input to the generated arrays.

Consequently, the set of IDs in the registry below must equal—not merely contain—the set
of IDs used by all four canonical Evidence sources. Each `sourceId` is defined exactly
once here.

## GitHub official sources

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

## Microsoft Visual Studio Code official sources

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

## Anthropic official sources

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

## OpenAI official sources

The OpenAI rows use the exact first-party Markdown source URLs emitted by the official
Codex manual. The `.md` response is intentional and is accepted by the drift check's
Markdown content-type branch.

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

## Offline validation and explicit drift review

Normal product startup, Repository inspection, Global inspection, tests, and the packaged
runtime never fetch an official page and never load this development/test fixture. The
offline contract check is:

```sh
pnpm exec vitest run tests/contract/official-sources
```

It validates the exact registry/Evidence set equality, bilingual edge parity, reciprocal
affected IDs, official hosts, record schema, assertion targets, and recomputed
`semanticFingerprint` without network access.

Only a maintainer explicitly runs the networked drift review:

```sh
pnpm run check:official-sources
```

The command sends no credentials, cookies, repository contents, or other local state. It
accepts only UTF-8 HTML or Markdown, and every redirect hop must retain the row's exact
`officialHost`. Request, response, redirect, and decoding capacity comes from Node.js and
the execution environment; a recoverable environment failure fails closed. An HTTPS
downgrade, cross-host redirect, wrong content type, decoding failure, or missing or duplicate
heading is a hard failure. A different
final URL on the same host is reported for review and never silently replaces
`canonicalUrl`.

Normalization version `1` selects every listed heading through the next heading of equal
or higher level, removes document chrome and `script`/`style` nodes, preserves prose and
code text, decodes entities, applies Unicode NFC and LF endings, trims line edges,
collapses horizontal whitespace, and joins sections in listed order before calculating
the lowercase SHA-256 `snapshotFingerprint`. Repeated or overlapping selected sections
are invalid rather than silently deduplicated.

The command reports drift; it never changes a behavior, rule, strategy, assertion, anchor,
fingerprint, URL, or review date. A maintainer must review every reverse-indexed affected
record and both language versions, update paraphrased assertions and fingerprints
explicitly, and only then advance `reviewedOn`. Remote page bodies, snippets, and response
captures are never checked in.
