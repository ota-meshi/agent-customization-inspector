# Data Model: Support Gemini CLI

[日本語](data-model.ja.md)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-09

This model extends the parent's
([001 data-model.md](../001-inspect-agent-customizations/data-model.md)). Only what the
fourth tool changes or adds is written here; every entity not named is unchanged.

## SupportedTool

The closed product vocabulary gains one member.

| Member | Label (`SUPPORTED_TOOL_TEXT`) | Position in `SUPPORTED_TOOL_ORDER` |
|---|---|---|
| `copilot` | `GitHub Copilot` | 1 |
| `claude` | `Claude Code` | 2 |
| `codex` | `OpenAI Codex` | 3 |
| `gemini` | `Gemini CLI` | 4 |

Every `Readonly<Record<SupportedTool, …>>` in the codebase — the label table, the mark
glyph table, the brand token per mark, the skill-collision policy table, the same-name
resolution table, the Global member port table, the member label table, the source-selector
label table — gains a `gemini` entry, and the compiler is what finds the ones missed. The
two arrays the compiler does not check, `SUPPORTED_TOOL_ORDER` and `VENDOR_SURFACE_ORDER`,
are covered by their existing gates.

## VendorSurface

Gains `gemini-cli`, labelled `Gemini CLI` in `VENDOR_SURFACE_TEXT` and ordered after the
Codex surfaces in `VENDOR_SURFACE_ORDER`. It is the one surface every Gemini CLI behavior
names, because the vendor documents no second client that reads a local file differently
(contracts/vendors/gemini-cli.md § Surface boundary).

## GlobalMemberId and the member tuple

`GlobalMemberId = SupportedTool | 'agents'` widens by derivation. `GLOBAL_MEMBER_ORDER`
becomes the five-member tuple `[copilot, claude, codex, gemini, agents]`; every place the
parent model says "exactly four" says five:

| Entity | Field | Now |
|---|---|---|
| `GlobalConsentPreview` | `entries` | exactly five member entries, in that order |
| `GlobalConsentPreview` | `entries[].member` | `copilot \| claude \| codex \| gemini \| agents` |
| `GlobalConsent` / `GlobalEnableOperation` | `confirmedTools`, `retryableTools` | derived over five |
| `Inspection Session` | member Global Sources | zero to five |
| `LifecycleOwnerKey` | `global:${GlobalMemberId}` | derives; its rank is read from `GLOBAL_MEMBER_ORDER` rather than a ladder |

`GLOBAL_MEMBER_TEXT` gains `gemini: 'Gemini CLI home'`; `SOURCE_SELECTOR_TEXT` gains
`'global-gemini'`.

## GlobalRootInputCapture

The capture reads four environment properties exactly once, in the fixed order
`COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CLI_HOME`, and calls
`node:os.homedir()` once. The per-tool descriptor gains a closed field:

| Field | Type | Meaning |
|---|---|---|
| `variable` | environment property name | The setting read once |
| `suffix` | fixed directory name | `.copilot`, `.claude`, `.codex`, `.gemini` |
| `settingNames` | `root \| parent` | What an `eligible` setting value names: the member root itself, or the directory the root's `suffix` directory is created in |

Derivation of `lexicalRoot` per tool:

| Setting state | `settingNames: root` (Copilot, Claude, Codex) | `settingNames: parent` (Gemini CLI) |
|---|---|---|
| absent (`undefined`) | `join(capturedHomedir, suffix)` | `join(capturedHomedir, suffix)` |
| present, classified `eligible` | the exact value | `join(value, suffix)` |
| present, `present-empty` / `relative` / `invalid` | that state; no root | that state; no root — classification happens on the setting string, before any join |

`origin` stays `environment` for every present value and `default-home` for an absent one.
The shared agent home is unchanged: always `join(capturedHomedir, '.agents')`, no setting.

## Vendor registry records (Gemini CLI)

One record per row of the vendor contract; IDs are closed unions in
`identifier-types.ts`.

| Union | Members |
|---|---|
| `GeminiBehaviorId` | `gemini.behavior.repo.context`, `.repo.settings`, `.repo.mcp`, `.repo.hooks`, `.repo.commands`, `.repo.skills`, `.repo.agents`, `.repo.policies`, `.repo.trust`, `.repo.ignore`, `.repo.env`, `gemini.behavior.user.home`, `.user.context`, `.user.settings`, `.user.commands`, `.user.skills`, `.user.agents`, `.user.policies`, `.user.extensions`, `.user.trust-record`, `.user.env`, `gemini.behavior.system.settings` |
| `GeminiRuleId` | `gemini.derived.context-filename`, `gemini.repo.settings`, `.repo.mcp`, `.repo.hooks`, `.repo.command`, `.repo.skill`, `.repo.agent`, `gemini.global.instructions`, `.global.settings`, `.global.mcp`, `.global.hooks`, `.global.command`, `.global.skill`, `.global.agent`, `.global.policies`, `.global.agents-home.skill`, `gemini.excluded.repo-non-customizations`, `.excluded.extensions`, `.excluded.user-runtime`, `.excluded.system` |
| `GeminiStrategyId` | `gemini.context.layering`, `gemini.settings.precedence`, `gemini.mcp.configuration`, `gemini.hooks.merge`, `gemini.commands.selection`, `gemini.skills.selection`, `gemini.agents.selection`, `gemini.policies.tiers` |
| `GoogleSourceId` | `google.gemini-cli.configuration`, `.gemini-md`, `.custom-commands`, `.skills`, `.creating-skills`, `.subagents`, `.hooks`, `.hooks-reference`, `.mcp-server`, `.policy-engine`, `.extensions-reference`, `.trusted-folders`, `.gemini-ignore` |

Strategy operations, in documented pipeline order:

| Strategy | Operations | Basis |
|---|---|---|
| `gemini.context.layering` | `filter`, `concatenate` | Trust filters the workspace files; the three tiers are concatenated in the documented order |
| `gemini.settings.precedence` | `merge-map`, `replace` | Layers merge by key; a higher layer's value replaces a lower one's |
| `gemini.mcp.configuration` | `merge-map`, `filter` | Servers merge by name across layers; `mcp.allowed`/`mcp.excluded` and trust filter them |
| `gemini.hooks.merge` | `append`, `filter` | Hooks from every layer run; trust and fingerprinting filter them |
| `gemini.commands.selection` | `select-first` | A project command with a user command's name is always used |
| `gemini.skills.selection` | `select-first`, `filter` | The higher tier's same-name skill is used; within a tier the alias wins; trust filters |
| `gemini.agents.selection` | `unknown-order` | Same-name agents at two levels have no documented resolution |
| `gemini.policies.tiers` | `select-first` | Higher tier base wins; within a tier higher `priority` wins |

Every static Gemini rule carries `tool: 'gemini'`; the shared agent home rule carries
`matcher.base: { kind: 'global', member: 'agents' }` like its Codex and Copilot siblings,
and the Gemini home rules carry `member: 'gemini'`.

## Compiled units

| Directory | Unit | Answers |
|---|---|---|
| `vendor/gemini.ts` | `GeminiCompiledRule`, `GeminiCompiledDerivedRule` | `tool` literal, relations, the derived plan builder |
| `instructions/gemini.ts` | `GeminiCompiledDerivedInstructionRule`, `readGeminiConfiguredContextPlans` | The one derived plan (default or configured names at every depth), the applicability range from the path; the Global unit shares the static instruction shape |
| `skills/gemini.ts` | `GeminiCompiledSkillRule` | Declared `name` or directory |
| `agents/gemini.ts` | `GeminiCompiledAgentRule` | Declared `name` (declared-name product) |
| `mcp/gemini.ts` | `GeminiCompiledMcpCarrierRule` | The `mcpServers` map, one row per name |
| `hooks/gemini.ts` | `GeminiCompiledSettingsHookRule` | The `hooks` object of the carrier |
| `prompts-and-commands/gemini.ts` | `GeminiCompiledCommandRule` | The `:`-joined path below `commands/`, extension dropped |
| `permissions/gemini.ts` | `GeminiCompiledPolicyDocumentRule` | The policy file as a permissions document |
| `gemini.ts` | `GEMINI_REPOSITORY_RULES`, `GEMINI_GLOBAL_RULES`, `GEMINI_AGENTS_HOME_RULES`, other-kind unit | The catalogs the scan and the host compose |

## Customization File and Tool Recognition

Unchanged in shape. What changes is which recognitions a file can carry:

| File | Recognitions after this feature |
|---|---|
| root `GEMINI.md` | GitHub Copilot (`copilot.repo.instructions.gemini-root`), Gemini CLI (`gemini.derived.context-filename`) |
| `.agents/skills/<name>/SKILL.md` | OpenAI Codex, GitHub Copilot, Gemini CLI |
| `~/.agents/skills/<name>/SKILL.md` | the same three |
| `AGENTS.md` when `context.fileName` names it | its existing readers plus Gemini CLI |

## Parser format table

`acceptsComments(context)` answers true for `(gemini, '.gemini/settings.json')` and
`(gemini, 'settings.json')`, with the measurement recorded on the entry (research.md § 6).

## Version literals

`allowlistVersion` and `traversalPlanVersion` advance to the date of the implementing change,
spelled in the constructor and in `tests/contract/http-api-global.test.ts`, as today.
