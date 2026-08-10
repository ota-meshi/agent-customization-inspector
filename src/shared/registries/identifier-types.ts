// The closed identifier catalogs of the contract-versioned registries
// (contracts/inspection-path-allowlist.md § Contract map and identifier
// ownership). One union per identifier kind, assembled from one sub-union per
// vendor or publisher.
//
// These unions are what make a cross-reference checkable. The relation edges in
// `relation-types.ts` and a citation's `sourceId` all carry these types, so a
// mistyped or retired identifier is a compile error at the line that authored
// it instead of a contract-test failure somewhere else — or, worse, a reference
// the gate happens not to cover.
//
// They also make each aggregate registry provably complete: an aggregate is
// annotated `Record<BehaviorId, …>`, so adding a vendor's IDs here without
// spreading that vendor's catalog into the aggregate fails to compile.
//
// Deliberately not a union: `policyRefs` names FR/QR clauses owned by spec.md
// rather than by these registries, so a mistyped clause is a documentation
// error rather than a broken cross-reference (see `evidence-types.ts` for the
// citation that does carry one).
//
// Ships zero runtime code — the `-types` name records that.

/**
 * Anthropic Claude Code behavior statements
 * (contracts/vendors/claude-code.md). Statements arrive with the inventory
 * phase that needs them.
 */
export type ClaudeBehaviorId =
  /** Claude Repository skill discovery under `.claude/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.repo.skills'
  /** Claude User skill discovery under `<claude-config-dir>/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.user.skills';

/**
 * OpenAI Codex behavior statements
 * (contracts/vendors/openai-codex.md). Statements arrive with the inventory
 * phase that needs them.
 */
export type CodexBehaviorId =
  /** Codex Repository skill discovery under `.agents/skills/<name>/SKILL.md`. */
  | 'codex.behavior.repo.skills'
  /** Codex User skill discovery under `$HOME/.agents/skills/<name>/SKILL.md`. */
  | 'codex.behavior.user.skills';

/**
 * GitHub Copilot behavior statements
 * (contracts/vendors/github-copilot.md). Statements arrive with the inventory
 * phase that needs them; the skill phase ships the three Repository surfaces,
 * the non-authorizing User scopes their selection strategies compose, the
 * legacy CLI command surface the CLI selection outranks, and the
 * origin-file-less hosted remote-skill fact.
 */
export type CopilotBehaviorId =
  /** Copilot CLI legacy commands at `.claude/commands/*.md`; a same-name skill outranks one. */
  | 'copilot.behavior.cli.commands'
  /** Copilot CLI Repository skill discovery in the three fixed skills directories. */
  | 'copilot.behavior.cli.skills'
  /** Copilot CLI User skill discovery under `~/.copilot/skills` and `~/.agents/skills`. */
  | 'copilot.behavior.cli.user.skills'
  /** Copilot cloud agent's hosted remote-skill relay; no filesystem locator. */
  | 'copilot.behavior.cloud.remote-skills'
  /** Copilot cloud agent Repository skill discovery at the repository root. */
  | 'copilot.behavior.cloud.skills'
  /** Copilot VS Code Repository skill discovery at the workspace root. */
  | 'copilot.behavior.vscode.skills'
  /** Copilot VS Code User skill discovery in home and profile locations. */
  | 'copilot.behavior.vscode.user.skills';

/**
 * Every documented vendor-behavior statement the product maintains. Each
 * vendor's sub-union joins here, and the behavior registry is keyed by it.
 */
export type BehaviorId = ClaudeBehaviorId | CodexBehaviorId | CopilotBehaviorId;

/**
 * Anthropic official documentation pages cited by the shipped records
 * (contracts/official-sources.md). Pages arrive with the records that cite
 * them.
 */
export type AnthropicSourceId =
  /** The Claude Code skills page: where skills live and how they are named. */
  | 'anthropic.claude-code.skills.locations-discovery'
  /** The large-codebases page: the start directory and per-directory skills. */
  | 'anthropic.claude-code.large-codebases.start-directory'
  /** The IDE-integrations page: shared configuration and per-surface differences. */
  | 'anthropic.claude-code.ide.shared-differences'
  /** The plugins reference: component scopes and skills-directory plugins. */
  | 'anthropic.claude-code.plugins.components-scopes'
  /**
   * The changelog releases that version-anchor nested skill behavior: 2.1.6
   * introduced nested `.claude/skills` discovery, and 2.1.178 the
   * directory-qualified retention of a nested name clash (QR-005).
   */
  | 'anthropic.claude-code.changelog.nested-skill-discovery';

/**
 * OpenAI official documentation pages cited by the shipped records
 * (contracts/official-sources.md).
 */
export type OpenAiSourceId =
  /** The Codex skills page: where Codex loads local skills, and their metadata. */
  'openai.codex.skills';

/**
 * GitHub official documentation pages cited by the shipped records
 * (contracts/official-sources.md § GitHub official sources).
 */
export type GitHubSourceId =
  /** The Copilot CLI command reference: skill locations, legacy commands, and their order. */
  | 'github.copilot.cli.reference'
  /** The Copilot agent-skills page: cloud skill discovery, usage, and shared skills. */
  | 'github.copilot.skills';

/**
 * Microsoft Visual Studio Code official documentation pages cited by the
 * shipped records (contracts/official-sources.md § Microsoft Visual Studio
 * Code official sources).
 */
export type VsCodeSourceId =
  /** The VS Code AI-settings reference: the per-customization location settings. */
  | 'vscode.copilot.settings'
  /** The VS Code agent-skills page: workspace skill locations and progressive loading. */
  | 'vscode.copilot.skills';

/**
 * Every official documentation page a shipped record cites. A citation names
 * its page by this ID as well as by URL, because the ID is what stays stable
 * when a vendor moves a page — which has already happened once — and it is what
 * the official-sources contract row is keyed by (QR-005).
 */
export type SourceId = AnthropicSourceId | OpenAiSourceId | GitHubSourceId | VsCodeSourceId;

/**
 * Anthropic Claude Code composition strategies
 * (contracts/runtime-composition.md).
 */
export type ClaudeStrategyId =
  /** Claude skill selection across enterprise, User, project, and bundled scopes. */
  'claude.skills.selection';

/**
 * OpenAI Codex composition strategies
 * (contracts/runtime-composition.md).
 */
export type CodexStrategyId =
  /** Codex skill selection across Repository, User, admin, and system scopes. */
  'codex.skills.discovery';

/**
 * GitHub Copilot composition strategies
 * (contracts/runtime-composition.md). One per skill surface, because the three
 * surfaces document incompatible selection and must not collapse into one
 * statement (FR-009).
 */
export type CopilotStrategyId =
  /** Copilot CLI first-found skill selection across its documented source order. */
  | 'copilot.cli.skills.selection'
  /** Copilot cloud progressive skill loading with unresolved collision behavior. */
  | 'copilot.cloud.skills.selection'
  /** Copilot VS Code progressive skill loading with undocumented duplicate precedence. */
  | 'copilot.vscode.skills.selection';

/**
 * Every documented runtime composition or projection strategy. Each vendor's
 * sub-union joins here, and the strategy registry is keyed by it.
 */
export type StrategyId = ClaudeStrategyId | CodexStrategyId | CopilotStrategyId;

/**
 * Anthropic Claude Code inspection rules
 * (contracts/vendors/claude-code.md § Repository Inspector matchers). Rules
 * arrive with the inventory phase that needs them.
 */
export type ClaudeRuleId =
  /** Repository Claude skills; read-authorizing `static-candidate`. */
  'claude.repo.skill';

/**
 * OpenAI Codex inspection rules
 * (contracts/vendors/openai-codex.md § Inspector Repository rules). Rules
 * arrive with the inventory phase that needs them.
 */
export type CodexRuleId =
  /** Repository Codex skills; read-authorizing `static-candidate`. */
  'codex.repo.skill';

/**
 * GitHub Copilot inspection rules
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 * Rules arrive with the inventory phase that needs them.
 */
export type CopilotRuleId =
  /** Repository Copilot skills in the three fixed directories; read-authorizing `static-candidate`. */
  'copilot.repo.skill';

/**
 * Every Inspector policy rule. Each vendor's sub-union joins here, and the
 * rule registry is keyed by it. This union is therefore the complete list of
 * rules that can authorize a read.
 */
export type RuleId = ClaudeRuleId | CodexRuleId | CopilotRuleId;
