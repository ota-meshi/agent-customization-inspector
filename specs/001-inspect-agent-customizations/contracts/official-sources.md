# Official Source Registry

[日本語](official-sources.ja.md)

**Registry version**: 2026-07-20
**Official-source review**: 2026-07-20
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

Each table row is one official source, identified by a stable key, and owns the following authored fields:

- `canonicalUrl` is the exact HTTPS URL shown in the row. It has no credentials, query,
  or fragment.
- `officialHost` is an exact host allowlist for that record. Subdomains and sibling hosts
  are not implied.
- Each semicolon-separated entry under `sectionAnchors` is an exact rendered heading-text
  descriptor. It is not a CSS/XPath selector or a URL fragment. The drift checker must
  find exactly one matching heading for every listed entry. Anchor and heading-text
  capacity and completion behavior are inherited from Node.js and the execution environment.
- `reviewedOn` is the date those sections were last read and compared against the claims the citing records make, by whoever performed the comparison. Confirming that a cited heading still exists is a narrower check and does not advance the date. It is authored per row;
  records not re-reviewed during the 2026-07-20 reconciliation retain `2026-07-15`.
- Every row uses `normalizationVersion: 1`.

Every maintained behavior, rule, and strategy that cites this registry also states, on the
record itself, how completely its cited sections establish it:

```ts
type DocumentationStatus =
  | 'documented'
  | 'partially-documented'
  | 'unknown'
  | 'conflict';
type LifecycleQualifier = 'preview' | 'experimental' | 'deprecated';
```

The qualifier array contains no duplicates and is always serialized in `preview`,
`experimental`, `deprecated` order. Empty means that the reviewed sources make no
lifecycle claim; it does not mean or imply `stable`. `documented` means the exact reviewed
sections completely establish the maintained atomic assertion, `partially-documented`
means they establish only part of it, `unknown` means they establish no determination for
it, and `conflict` retains incompatible official assertions. `documentation-conflict` is
not one of them: this vocabulary spells its incompatible case `conflict`.

Each status belongs to its own subject; it is not a status attached to a source ID or to a
whole vendor. These are maintenance records and no response carries one (QR-005): a
provenance publishes which rule admitted a file, never how completely that rule is
documented. The assessment is backed by that
subject's complete `sourceRefs` set and does not change the reverse-index ownership below.

The `evidence` array on each maintained behavior, rule, and strategy record is the
machine-readable materialization of these rows: a citation states its reviewed URL,
headings, review date, and maintained paraphrase on the record it supports, so a claim and
its basis cannot drift apart. A citation must not introduce a URL, host, anchor, or review
date this page does not carry.

The registry contains exactly the rows below. A citation of one of them carries its source
ID, its URL and host, the exact reviewed headings, the review date, and one maintained
paraphrase of what those headings establish for the citing record; copied page text and
generic product-area targets are forbidden. No field is truncated.

Two fields belong to the maintainer-only drift command (T1032) and exist nowhere until it
runs. `snapshotFingerprint` is the lowercase SHA-256 of the selected normalized sections,
`null` before a capture: it digests remote page text, which the offline gate never fetches,
so writing a value without an actual capture would record evidence that was never gathered.
`semanticFingerprint` is the lowercase SHA-256 of canonical JSON over the maintained
paraphrases after a stable sort, recomputed offline once the command has something to sort.
A per-source reverse index — which behaviors, rules, and strategies a page affects — is
derived by that same command from the citations; no record publishes one today.

Only these exact official hosts are valid in this release:

| Vendor | Exact official hosts |
|---|---|
| GitHub | `docs.github.com` |
| Microsoft | `code.visualstudio.com` |
| Anthropic | `code.claude.com` |
| OpenAI | `learn.chatgpt.com`; `developers.openai.com` |

Accepted first-party evidence classes form one hierarchy across all vendors. General
guides, reference pages, and versioned release notes or changelogs on the exact hosts
above are the only accepted classes. A guide or reference page establishes exactly the
claims it states directly, and those two classes rank equally. A direct,
version-qualified release-note or changelog assertion outranks omission in a guide or
reference page, while directly incompatible assertions are retained as `conflict` rather
than ranked. Official source repositories and official issue or discussion statements
rank below every documentation class: they are not registrable on the hosts above and
never substitute for registered documentation evidence. The Microsoft Visual Studio Code
section below applies this hierarchy to a specific guide/release-note conflict.

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
5. Require reciprocal equality with the citations carried by the records themselves. A
   missing edge, extra edge, duplicate edge, unknown source, unknown owner, orphan source,
   or differing owner type fails the offline contract test.
6. Parse the Japanese counterparts independently and require the same owner IDs,
   `sourceId` tokens, and edges. Japanese files validate semantic parity but are not a
   second input to the generated arrays.
7. Validate exactly one assessment for every owner, the closed documentation-status enum,
   duplicate-free fixed qualifier ordering, and English/Japanese equality. Reject
   `documentation-conflict` as a documentation status and reject any assessment-free or
   lossy aggregate provenance/relationship fixture.

Consequently, the set of IDs in the registry below must equal—not merely contain—the set
of IDs used by all four canonical Evidence sources. Each `sourceId` is defined exactly
once here.

## Presentation Allowlist implementation gate

The normative bilingual Presentation Allowlist rows in the three vendor contracts are
already approved design input. The implementation gate verifies only the frozen English
and Japanese rows and their recorded digest; it must not author or semantically edit the
allowlist set, identifiers, admitted source forms, exact source-form extractor
applicability, or relationship kinds. No row enumerates metadata fields: a skill's
declarations are the keys its file wrote, and an authored key set is not closed (FR-007).

The following lowercase SHA-256 values are the recorded freeze. For each named UTF-8,
BOM-free, LF-only contract, the digest input is constructed by locating the unique level-2
heading whose case-folded text ends with `presentation allowlist`, skipping subsequent
non-table lines, and then concatenating the first contiguous run of lines whose first byte
is `|`, preserving every byte and appending one LF after every row including the last.
No heading, prose, blank line, or line after that contiguous table is hashed.

| Vendor | English table SHA-256 | Japanese table SHA-256 |
|---|---|---|
| GitHub Copilot | `3985d4c947f3bd8314e565a9ea28e55ce1df6341a764fa86e384c63907d5e40f` | `0d55ffc042eb6e41f89b4918ce09d30d4ab2e1b885781dcfffb5b7798326e538` |
| Claude Code | `36251f187c6bcd1017331129753247c3cb2dd5c52f5f4fad31bcd4efa798067e` | `c53ae8da79a2fd500400ad07b7272ce43191fc752caed88124f71a19ce118258` |
| OpenAI Codex | `e9f9c260192a00ac1c1d8446546a2290bdc9e1b584b480ca4eb3ca6f26d9dbbc` | `8acd37b9cfc8ee7d532360db07a73151f0e7371849a54f7810a8d48bff565bdb` |

The implementation freeze test must recompute all six inputs exactly, require one and only
one matching heading and contiguous table per file, compare every digest in constant time,
and separately validate row IDs and English/Japanese semantic parity. A missing, duplicate,
empty, malformed, or mismatched table or digest blocks implementation; a digest match alone
does not prove semantic parity.

After implementation starts, any semantic mismatch or requested change to those values
stops dependent work. Before any changed row is consumed, maintainers must synchronize all
applicable English and Japanese specification, research, plan, quickstart, and contract
artifacts, then rerun `/speckit.plan` followed by `/speckit.tasks`. Evidence-location,
section-anchor, review-metadata, and semantically unchanged corrections may proceed under
the current task set, but they must not be used to bypass this stop-and-regenerate rule.

## GitHub official sources

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `github.copilot.cli.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions> | `docs.github.com` | `Types of custom instructions`; `How multiple instruction files interact`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-08-19` |
| `github.copilot.instructions.support` | <https://docs.github.com/en/copilot/reference/custom-instructions-support> | `docs.github.com` | `GitHub.com`; `Visual Studio Code`; `Copilot CLI` | `2026-08-19` |
| `github.copilot.cloud.instructions` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions> | `docs.github.com` | `Creating custom instructions`; `Creating repository-wide custom instructions`; `Creating path-specific custom instructions`; `Custom instructions in use` | `2026-08-19` |
| `github.copilot.cli.reference` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference> | `docs.github.com` | `MCP server configuration`; `Skill locations`; `Commands (alternative skill format)`; `Custom agent locations`; `Environment variables` | `2026-08-20` |
| `github.copilot.cli.mcp` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers> | `docs.github.com` | `Adding per-repository MCP servers` | `2026-08-20` |
| `github.copilot.cli.configuration` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference> | `docs.github.com` | `Directory overview`; `User-editable files`; `Changing the location of the configuration directory`; `Configuration file settings`; `Repository settings (.github/copilot/settings.json)` | `2026-08-23` |
| `github.copilot.cli.custom-agents` | <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli> | `docs.github.com` | `Creating a custom agent`; `Using a custom agent` | `2026-07-15` |
| `github.copilot.cli.plugins` | <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference> | `docs.github.com` | `CLI commands`; `plugin.json`; `marketplace.json`; `File locations`; `Loading order and precedence` | `2026-07-15` |
| `github.copilot.hooks` | <https://docs.github.com/en/copilot/reference/hooks-reference> | `docs.github.com` | `Hooks locations`; `Cloud agent execution environment`; `Hook configuration format`; `Disable all hooks` | `2026-07-15` |
| `github.copilot.custom-agents` | <https://docs.github.com/en/copilot/reference/custom-agents-configuration> | `docs.github.com` | `YAML frontmatter properties`; `MCP server configuration details`; `Example agent profile configurations`; `MCP server configurations` | `2026-08-20` |
| `github.copilot.skills` | <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills> | `docs.github.com` | `Creating and adding a skill`; `Adding a skill that someone else has created`; `How Copilot uses agent skills`; `Skills versus custom instructions` | `2026-07-15` |
| `github.copilot.plugins` | <https://docs.github.com/en/copilot/concepts/agents/about-plugins> | `docs.github.com` | `What plugins contain`; `How plugins are structured`; `Where can I get plugins?`; `How plugin marketplaces work`; `Plugins compared with manual configuration` | `2026-07-15` |
| `github.copilot.cli.lsp` | <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers> | `docs.github.com` | `How to add an LSP server`; `How LSP servers are loaded` | `2026-08-23` |
| `github.copilot.cli.extensions` | <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-extensions> | `docs.github.com` | `How extensions are discovered`; `Choosing where an extension lives`; `Enabling extensions`; `Changing how the CLI handles extensions`; `Extensions compared with plugins` | `2026-07-15` |

## Microsoft Visual Studio Code official sources

For a versioned behavior that a newer release note adds while the current general guide
still presents an exhaustive older location list, the release note establishes the new
behavior for that version and later, while the guide continues to establish only the
claims it states directly. The omission does not erase the release-note behavior; the
incompatible exhaustive location statements produce `documentationStatus: conflict` for
the affected behavior, rule, and strategy. Neither source establishes an unmentioned schema or a
total precedence order. Those facts remain unknown instead of being inferred from a
similar filename or another surface. This rule prefers a direct, version-qualified
first-party assertion over omission, retains incompatible direct assertions as conflict,
and does not admit an unregistered source repository or issue as substitute evidence.

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `vscode.copilot.instructions` | <https://code.visualstudio.com/docs/agent-customization/custom-instructions> | `code.visualstudio.com` | `Types of instruction files`; `Use a .github/copilot-instructions.md file`; `Use .instructions.md files`; `Instructions file locations`; `Instructions file format`; `Use an AGENTS.md file`; `Use multiple AGENTS.md files (experimental)`; `Use a CLAUDE.md file`; `Instruction priority` | `2026-08-19` |
| `vscode.copilot.customization` | <https://code.visualstudio.com/docs/agent-customization/overview> | `code.visualstudio.com` | `Use customizations in a monorepo` | `2026-08-19` |
| `vscode.copilot.settings` | <https://code.visualstudio.com/docs/agents/reference/ai-settings> | `code.visualstudio.com` | `Chat settings`; `Custom instructions settings`; `Reusable prompt files settings`; `Custom agents settings`; `Agent skills settings`; `Agent plugins settings` | `2026-08-19` |
| `vscode.copilot.prompts` | <https://code.visualstudio.com/docs/agent-customization/prompt-files> | `code.visualstudio.com` | `Prompt file locations`; `Prompt file format`; `Create a prompt file`; `Use a prompt file in chat` | `2026-08-22` |
| `vscode.copilot.custom-agents` | <https://code.visualstudio.com/docs/agent-customization/custom-agents> | `code.visualstudio.com` | `Handoffs`; `Custom agent file locations`; `Custom agent file structure`; `Tool list priority`; `Share custom agents across teams` | `2026-07-15` |
| `vscode.copilot.skills` | <https://code.visualstudio.com/docs/agent-customization/agent-skills> | `code.visualstudio.com` | `Create a skill`; `SKILL.md file format`; `How Copilot uses skills`; `Use shared skills` | `2026-07-15` |
| `vscode.copilot.hooks` | <https://code.visualstudio.com/docs/agent-customization/hooks> | `code.visualstudio.com` | `Configure hooks`; `Security considerations` | `2026-07-15` |
| `vscode.copilot.mcp` | <https://code.visualstudio.com/docs/agent-customization/mcp-servers> | `code.visualstudio.com` | `Add an MCP server`; `Configure the mcp.json file`; `MCP server trust`; `Synchronize MCP configuration across devices` | `2026-08-20` |
| `vscode.copilot.mcp.workspace-root-release` | <https://code.visualstudio.com/updates/v1_118> | `code.visualstudio.com` | `Workspace .mcp.json files and server deduplication` | `2026-08-20` |
| `vscode.copilot.plugins` | <https://code.visualstudio.com/docs/agent-customization/agent-plugins> | `code.visualstudio.com` | `What plugins provide`; `Plugin manifest (plugin.json)`; `Plugin formats`; `Configure plugin marketplaces`; `Use local plugins`; `Workspace plugin recommendations` | `2026-08-23` |
| `vscode.settings` | <https://code.visualstudio.com/docs/configure/settings> | `code.visualstudio.com` | `User settings`; `Workspace settings`; `Profile settings`; `Settings precedence` | `2026-08-23` |

## Anthropic official sources

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `anthropic.claude-code.directory.file-reference` | <https://code.claude.com/docs/en/claude-directory> | `code.claude.com` | `File reference` | `2026-07-25` |
| `anthropic.claude-code.env-vars` | <https://code.claude.com/docs/en/env-vars> | `code.claude.com` | `Variables` | `2026-08-20` |
| `anthropic.claude-code.memory.locations-load` | <https://code.claude.com/docs/en/memory> | `code.claude.com` | `Choose where to put CLAUDE.md files`; `AGENTS.md`; `How CLAUDE.md files load`; `Organize rules with .claude/rules/`; `Auto memory` | `2026-08-18` |
| `anthropic.claude-code.large-codebases.start-directory` | <https://code.claude.com/docs/en/large-codebases> | `code.claude.com` | `Choose where to start Claude`; `Layer CLAUDE.md files by directory`; `Add per-directory skills` | `2026-07-25` |
| `anthropic.claude-code.sdk.setting-sources` | <https://code.claude.com/docs/en/agent-sdk/claude-code-features> | `code.claude.com` | `Control filesystem settings with settingSources`; `CLAUDE.md load locations` | `2026-08-18` |
| `anthropic.claude-code.settings.scopes-precedence` | <https://code.claude.com/docs/en/settings> | `code.claude.com` | `Settings files and who they affect`; `Compare the scope of each settings file`; `Where Claude Code keeps the local file in a git repository`; `Settings precedence`; `Lists merge instead of overriding` | `2026-08-22` |
| `anthropic.claude-code.permissions.rule-syntax` | <https://code.claude.com/docs/en/permissions> | `code.claude.com` | `Permission rule syntax`; `Wildcard patterns` | `2026-08-22` |
| `anthropic.claude-code.skills.locations-discovery` | <https://code.claude.com/docs/en/skills> | `code.claude.com` | `Where skills live`; `Discovery from parent and nested directories`; `How a skill gets its command name` | `2026-08-22` |
| `anthropic.claude-code.subagents.scope-context` | <https://code.claude.com/docs/en/sub-agents> | `code.claude.com` | `Choose the subagent scope`; `Available tools`; `Scope MCP servers to a subagent`; `Preload skills into subagents`; `Enable persistent memory`; `What loads at startup`; `Let subagents spawn their own subagents` | `2026-08-20` |
| `anthropic.claude-code.hooks.locations-resolution` | <https://code.claude.com/docs/en/hooks> | `code.claude.com` | `Hook locations`; `The /hooks menu` | `2026-07-25` |
| `anthropic.claude-code.mcp.scopes-precedence` | <https://code.claude.com/docs/en/mcp> | `code.claude.com` | `MCP installation scopes`; `Scope hierarchy and precedence`; `Plugin-provided MCP servers` | `2026-08-20` |
| `anthropic.claude-code.output-styles.locations` | <https://code.claude.com/docs/en/output-styles> | `code.claude.com` | `Create a custom output style`; `How output styles work` | `2026-07-25` |
| `anthropic.claude-code.plugins.components-scopes` | <https://code.claude.com/docs/en/plugins-reference> | `code.claude.com` | `Plugin installation scopes`; `Skills-directory plugins`; `Plugin manifest schema`; `File locations reference`; `Plugin caching and file resolution` | `2026-08-20` |
| `anthropic.claude-code.marketplaces.catalog-sources` | <https://code.claude.com/docs/en/plugin-marketplaces> | `code.claude.com` | `Create the marketplace file`; `Plugin sources` | `2026-07-25` |
| `anthropic.claude-code.ide.shared-differences` | <https://code.claude.com/docs/en/ide-integrations> | `code.claude.com` | `Configure settings`; `VS Code extension vs. Claude Code CLI`; `Manage marketplaces` | `2026-07-25` |
| `anthropic.claude-code.changelog.legacy-command-nesting` | <https://code.claude.com/docs/en/changelog> | `code.claude.com` | `1.0.45`; `1.0.51` | `2026-08-22` |
| `anthropic.claude-code.changelog.nested-skill-discovery` | <https://code.claude.com/docs/en/changelog> | `code.claude.com` | `2.1.6`; `2.1.178` | `2026-08-06` |

## OpenAI official sources

The OpenAI rows use the exact first-party Markdown source URLs emitted by the official
Codex manual. The `.md` response is intentional and is accepted by the drift check's
Markdown content-type branch.

The 2026-07-20 Inspector runtime reconciliation is product policy, not an assertion about
upstream Codex behavior. For inspected Codex candidates, an absent target selects the documented
fallback, a file that cannot be read yields that file's diagnostic under FR-028,
and an unexpected failure fails the attempt as an ordinary error. A NUL byte produces the
binary, diagnostic-only outcome.
Every non-NUL byte stream is decoded once with UTF-8 replacement semantics; invalid
sequences produce `utf-8-replaced`, and the resulting garbled text containing `U+FFFD` remains in the
complete source used for parsing, extraction, display, and comparison. Maintained OpenAI
assertions must paraphrase only the selected official sections and must not encode these
Inspector-owned filesystem or decoding choices. A reconciliation that changes no selected
official text and no maintained assertion advances no `reviewedOn`, and leaves the two
fingerprints as they were — which, until the maintainer-only drift command has run, is
absent.

| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |
|---|---|---|---|---|
| `openai.codex.agents-md` | <https://learn.chatgpt.com/docs/agent-configuration/agents-md.md> | `learn.chatgpt.com` | `How Codex discovers guidance`; `Customize fallback filenames` | `2026-08-17` |
| `openai.codex.config-basic` | <https://learn.chatgpt.com/docs/config-file/config-basic.md> | `learn.chatgpt.com` | `Codex configuration file`; `Configuration precedence`; `Feature flags` | `2026-08-17` |
| `openai.codex.custom-prompts` | <https://learn.chatgpt.com/docs/custom-prompts.md> | `learn.chatgpt.com` | `Custom Prompts` | `2026-07-25` |
| `openai.codex.hooks` | <https://learn.chatgpt.com/docs/hooks.md> | `learn.chatgpt.com` | `Where Codex looks for hooks`; `Review and trust hooks`; `Config shape`; `Plugin-bundled hooks` | `2026-07-25` |
| `openai.codex.mcp` | <https://learn.chatgpt.com/docs/extend/mcp.md> | `learn.chatgpt.com` | `Connect Codex to an MCP server` | `2026-07-25` |
| `openai.codex.memories` | <https://learn.chatgpt.com/docs/customization/memories.md> | `learn.chatgpt.com` | `How local Codex memories work`; `Local memory storage`; `Configure local memories` | `2026-07-25` |
| `openai.codex.plugins` | <https://developers.openai.com/plugins/build/plugins.md> | `developers.openai.com` | `Build your own curated plugin list`; `Add a marketplace from the CLI`; `Create a plugin manually`; `Marketplace metadata`; `How local marketplaces work`; `Plugin structure` | `2026-07-25` |
| `openai.codex.rules` | <https://learn.chatgpt.com/docs/agent-configuration/rules.md> | `learn.chatgpt.com` | `Rules`; `Create a rules file`; `Understand rule fields`; `Understand the rules language` | `2026-08-22` |
| `openai.codex.skills` | <https://learn.chatgpt.com/docs/build-skills.md> | `learn.chatgpt.com` | `How ChatGPT and Codex use skills`; `Where Codex loads local skills`; `Distribute skills with plugins`; `Optional metadata` | `2026-07-25` |
| `openai.codex.subagents` | <https://learn.chatgpt.com/docs/agent-configuration/subagents.md> | `learn.chatgpt.com` | `Orchestration and thread controls`; `Approvals and sandbox controls`; `Custom agents`; `Custom agent file schema` | `2026-08-22` |

## Offline validation and explicit drift review

Normal product startup, Repository inspection, Global inspection, tests, and the packaged
runtime never fetch an official page. Citations live on the records they support, so the
offline contract check is the suite that already covers those records:

```sh
pnpm exec vitest run tests/contract
```

It validates without network access that every citation names a source ID, an HTTPS URL on
its own stated host with no credentials, query, or fragment, non-empty reviewed sections, a
review date, and a maintained paraphrase; that each citation resolves to its normative row
above — same URL, same host, and sections drawn from the ones that row lists — and that the
row reads identically in both languages; and that one source ID resolves to exactly one
page, so two records cannot disagree about where a page is after it moves.

Reciprocal affected IDs and `semanticFingerprint` recomputation are not covered yet: no
record publishes a reverse index, and no fingerprint is captured until the maintainer-only
drift command runs. The tasks that ship them are named in tasks.md.

Only a maintainer explicitly runs the networked drift review, at minimum before every
frozen release candidate and whenever a material upstream change to a supported surface
becomes known:

```sh
pnpm run check:official-sources
```

The command sends no credentials, cookies, repository contents, or other local state. It
accepts only UTF-8 HTML or Markdown, and every redirect hop must retain the row's exact
`officialHost`. Request, response, redirect, and decoding capacity comes from Node.js and
the execution environment; a recoverable environment failure fails closed. An HTTPS
downgrade, cross-host redirect, wrong content type, decoding failure, or missing or duplicate
heading is a hard failure. A client-rendered page is the one exception, and only for the
heading check: such a page serves its table of contents and no `<h*>` element at all, so the
heading exists while no element carrying it does. The command accepts a cited heading whose
anchor slug appears exactly once in the served table of contents, and reports which headings
were established that way. Without that carve-out the check would report drift for every
citation on a client-rendered page — a hard failure the maintainer can only ever dismiss,
which is how a gate stops being read. A different
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
