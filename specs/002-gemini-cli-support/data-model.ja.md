# Data Model: Gemini CLI のサポート

[English](data-model.md)

**Feature**: [spec.ja.md](spec.ja.md) | **Plan**: [plan.ja.md](plan.ja.md) | **Date**: 2026-09-09

このモデルは親のもの ([001 data-model.ja.md](../001-inspect-agent-customizations/data-model.ja.md))
を拡張する。4つ目のツールが変える、または加えるものだけをここに書く。名指ししない entity は
すべて不変である。

## SupportedTool

閉じたプロダクト語彙がメンバーを1つ得る。

| Member | Label (`SUPPORTED_TOOL_TEXT`) | `SUPPORTED_TOOL_ORDER` の位置 |
|---|---|---|
| `copilot` | `GitHub Copilot` | 1 |
| `claude` | `Claude Code` | 2 |
| `codex` | `OpenAI Codex` | 3 |
| `gemini` | `Gemini CLI` | 4 |

codebase のすべての `Readonly<Record<SupportedTool, …>>` — label 表、mark の glyph 表、mark ごと
の brand token、skill-collision policy 表、同名解決の表、Global member port 表、member label
表、source-selector label 表 — が `gemini` entry を得、漏れを見つけるのは compiler である。
compiler が検査しない2つの配列 `SUPPORTED_TOOL_ORDER` と `VENDOR_SURFACE_ORDER` は既存の gate
が cover する。

## VendorSurface

`gemini-cli` を得る。`VENDOR_SURFACE_TEXT` では `Gemini CLI` と label され、
`VENDOR_SURFACE_ORDER` では Codex の surface の後に並ぶ。すべての Gemini CLI behavior が名指し
する唯一の surface である。vendor はローカルファイルを異なって読む第2の client を文書化して
いないからである (contracts/vendors/gemini-cli.md § Surface boundary)。

## GlobalMemberId と member tuple

`GlobalMemberId = SupportedTool | 'agents'` は導出で広がる。`GLOBAL_MEMBER_ORDER` は5メンバーの
tuple `[copilot, claude, codex, gemini, agents]` になる。親モデルが「正確に4」と言う
すべての箇所は5と言う:

| Entity | Field | 現在 |
|---|---|---|
| `GlobalConsentPreview` | `entries` | その順の正確に5つの member entry |
| `GlobalConsentPreview` | `entries[].member` | `copilot \| claude \| codex \| gemini \| agents` |
| `GlobalConsent` / `GlobalEnableOperation` | `confirmedTools`、`retryableTools` | 5つにわたって導出 |
| `Inspection Session` | member Global Source | 0から5 |
| `LifecycleOwnerKey` | `global:${GlobalMemberId}` | 導出。その rank は ladder ではなく `GLOBAL_MEMBER_ORDER` から読む |

`GLOBAL_MEMBER_TEXT` は `gemini: 'Gemini home'` を得る — member の表は `Copilot home`・`Codex home` と同じくベンダー名と接尾辞を落とし、tool の表は `Gemini CLI` のままである。`SOURCE_SELECTOR_TEXT` は
`'global-gemini'` を得る。

## GlobalRootInputCapture

capture は4つの環境 property を固定の順 `COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`、
`GEMINI_CLI_HOME` で正確に1回ずつ読み、`node:os.homedir()` を1回呼ぶ。ツールごとの記述子は
閉じた field を得る:

| Field | Type | 意味 |
|---|---|---|
| `variable` | 環境 property 名 | 1回読まれる設定 |
| `suffix` | 固定ディレクトリ名 | `.copilot`、`.claude`、`.codex`、`.gemini` |
| `settingNames` | `root \| parent` | `eligible` な設定値が指すもの: member root そのものか、root の `suffix` ディレクトリが作られるディレクトリか |

ツールごとの `lexicalRoot` の導出:

| 設定の状態 | `settingNames: root` (Copilot、Claude、Codex) | `settingNames: parent` (Gemini CLI) |
|---|---|---|
| absent (`undefined`) | `join(capturedHomedir, suffix)` | `join(capturedHomedir, suffix)` |
| present、`eligible` と分類 | その値そのまま | `join(value, suffix)` |
| present、`present-empty` / `relative` / `invalid` | その状態。root なし | その状態。root なし — 分類は join の前に設定文字列に対して行う |

`origin` は present な値ではすべて `environment`、absent では `default-home` のまま。shared
agent home は不変: 常に `join(capturedHomedir, '.agents')`、設定なし。

## Vendor registry record (Gemini CLI)

vendor contract の行ごとに1 record。ID は `identifier-types.ts` の閉じた union である。

| Union | Members |
|---|---|
| `GeminiBehaviorId` | `gemini.behavior.repo.context`、`.repo.settings`、`.repo.mcp`、`.repo.hooks`、`.repo.commands`、`.repo.skills`、`.repo.agents`、`.repo.policies`、`.repo.trust`、`.repo.ignore`、`.repo.env`、`gemini.behavior.user.home`、`.user.context`、`.user.settings`、`.user.commands`、`.user.skills`、`.user.agents`、`.user.policies`、`.user.extensions`、`.user.trust-record`、`.user.env` |
| `GeminiRuleId` | `gemini.derived.context-filename`、`gemini.repo.settings`、`.repo.mcp`、`.repo.hooks`、`.repo.command`、`.repo.skill`、`.repo.agent`、`gemini.global.instructions`、`.global.settings`、`.global.mcp`、`.global.hooks`、`.global.command`、`.global.skill`、`.global.agent`、`.global.policies`、`.global.agents-home.skill`、`gemini.excluded.repo-non-customizations`、`.excluded.extensions`、`.excluded.user-runtime` |
| `GeminiStrategyId` | `gemini.context.layering`、`gemini.settings.precedence`、`gemini.mcp.configuration`、`gemini.hooks.merge`、`gemini.commands.selection`、`gemini.skills.selection`、`gemini.agents.selection`、`gemini.policies.tiers` |
| `GoogleSourceId` | `google.gemini-cli.configuration`、`.gemini-md`、`.custom-commands`、`.skills`、`.creating-skills`、`.subagents`、`.hooks`、`.hooks-reference`、`.mcp-server`、`.policy-engine`、`.extensions-reference`、`.trusted-folders`、`.gemini-ignore` |

strategy の operation、文書化された pipeline 順:

| Strategy | Operations | 根拠 |
|---|---|---|
| `gemini.context.layering` | `filter`、`concatenate` | trust が workspace のファイルを filter する。3つの tier は文書化された順に concatenate される |
| `gemini.settings.precedence` | `merge-map`、`replace` | 層は key ごとに merge され、上の層の値が下の層の値を置き換える |
| `gemini.mcp.configuration` | `merge-map`、`filter` | server は層をまたいで名前で merge され、`mcp.allowed`/`mcp.excluded` と trust が filter する |
| `gemini.hooks.merge` | `append`、`filter` | すべての層の hook が走り、trust と fingerprint が filter する |
| `gemini.commands.selection` | `select-first` | user command と同名の project command が常に使われる |
| `gemini.skills.selection` | `select-first`、`filter` | 上の tier の同名 skill が使われ、tier 内では alias が勝ち、trust が filter する |
| `gemini.agents.selection` | `unknown-order` | 2つの level の同名 agent には文書化された解決がない |
| `gemini.policies.tiers` | `select-first` | 上の tier base が勝ち、tier 内では高い `priority` が勝つ |

すべての静的 Gemini rule は `tool: 'gemini'` を持つ。shared agent home の rule は Codex と
Copilot の兄弟と同様に `matcher.base: { kind: 'global', member: 'agents' }` を持ち、Gemini home
の rule は `member: 'gemini'` を持つ。

## Compiled unit

| ディレクトリ | Unit | 答えるもの |
|---|---|---|
| `vendor/gemini.ts` | `GeminiCompiledRule`、`GeminiCompiledDerivedRule` | `tool` literal、relation、派生 plan の builder |
| `instructions/gemini.ts` | `GeminiCompiledDerivedInstructionRule`、`readGeminiConfiguredContextPlans` | 1つの派生 plan（既定または設定名を任意の深さで）、パスからの applicability range。Global unit は静的 instruction の形を共有 |
| `skills/gemini.ts` | `GeminiCompiledSkillRule` | 宣言された `name` またはディレクトリ |
| `agents/gemini.ts` | `GeminiCompiledAgentRule` | 宣言された `name`（declared-name プロダクト） |
| `mcp/gemini.ts` | `GeminiCompiledMcpCarrierRule` | `mcpServers` map、名前ごとに1行 |
| `hooks/gemini.ts` | `GeminiCompiledSettingsHookRule` | carrier の `hooks` object |
| `prompts-and-commands/gemini.ts` | `GeminiCompiledCommandRule` | `commands/` 下のパスを `:` で結び、拡張子を落としたもの |
| `permissions/gemini.ts` | `GeminiCompiledPolicyDocumentRule` | permissions document としての policy ファイル |
| `gemini.ts` | `GEMINI_REPOSITORY_RULES`、`GEMINI_GLOBAL_RULES`、`GEMINI_AGENTS_HOME_RULES`、other-kind unit | scan と host が compose する catalog |

## Customization File と Tool Recognition

形は不変。変わるのはファイルが持ちうる recognition である:

| File | この機能の後の recognition |
|---|---|
| ルートの `GEMINI.md` | GitHub Copilot (`copilot.repo.instructions.gemini-root`)、Gemini CLI (`gemini.derived.context-filename`) |
| `.agents/skills/<name>/SKILL.md` | OpenAI Codex、GitHub Copilot、Gemini CLI |
| `~/.agents/skills/<name>/SKILL.md` | 同じ3つ |
| `context.fileName` が名指しするときの `AGENTS.md` | 既存の読者に加えて Gemini CLI |

## Parser の format 表

`acceptsComments(context)` は `(gemini, '.gemini/settings.json')` と `(gemini, 'settings.json')`
で true を答え、計測は entry に記録する (research.md § 6)。

## Version literal

`allowlistVersion` と `traversalPlanVersion` は実装する変更の日付へ進み、今日と同様に
constructor と `tests/contract/http-api-global.test.ts` に綴る。
