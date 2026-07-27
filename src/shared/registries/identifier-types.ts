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
 * Every documented vendor-behavior statement the product maintains. Each
 * vendor's sub-union joins here, and the behavior registry is keyed by it.
 */
export type BehaviorId = CodexBehaviorId;

/**
 * OpenAI official documentation pages cited by the shipped records
 * (contracts/official-sources.md).
 */
export type OpenAiSourceId =
  /** The Codex skills page: where Codex loads local skills, and their metadata. */
  'openai.codex.skills';

/**
 * Every official documentation page a shipped record cites. A citation names
 * its page by this ID as well as by URL, because the ID is what stays stable
 * when a vendor moves a page — which has already happened once — and it is what
 * the official-sources contract row is keyed by (QR-005).
 */
export type SourceId = OpenAiSourceId;

/**
 * OpenAI Codex composition strategies
 * (contracts/runtime-composition.md).
 */
export type CodexStrategyId =
  /** Codex skill selection across Repository, User, admin, and system scopes. */
  'codex.skills.discovery';

/**
 * Every documented runtime composition or projection strategy. Each vendor's
 * sub-union joins here, and the strategy registry is keyed by it.
 */
export type StrategyId = CodexStrategyId;

/**
 * OpenAI Codex inspection rules
 * (contracts/vendors/openai-codex.md § Inspector Repository rules). Rules
 * arrive with the inventory phase that needs them.
 */
export type CodexRuleId =
  /** Repository Codex skills; read-authorizing `static-candidate`. */
  'codex.repo.skill';

/**
 * Every Inspector policy rule. Each vendor's sub-union joins here, and the
 * rule registry is keyed by it. This union is therefore the complete list of
 * rules that can authorize a read.
 */
export type RuleId = CodexRuleId;
