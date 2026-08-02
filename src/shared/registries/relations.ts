// The shipped reference graph between the contract-versioned registries.
//
// This module is the graph's public surface and the only one outside
// `registries/` should import: the edge shapes live in `relation-types.ts`
// and each product's edges in `<tool>/relations.ts`, so a new vendor is a new
// directory plus three entries below.
//
// Each aggregate is keyed by the closed identifier catalog and complete over
// it, which is what makes a missing vendor a compile error rather than a
// silently unreferenced record: annotating `Record<RuleId, RuleRelations>`
// forces every rule that exists to declare its edges.
//
// The graph is a DAG — behavior <- strategy <- rule — and the contract gate
// asserts it. No edge here grants read authority; only an `InspectionRule`'s
// own discovery class does. Citations are not edges: each record states its own
// in an `evidence` array, and a behavior has no outgoing edge here because a
// citation was its only one.
import { CLAUDE_RULE_RELATIONS, CLAUDE_STRATEGY_RELATIONS } from './claude/relations';
import { CODEX_RULE_RELATIONS, CODEX_STRATEGY_RELATIONS } from './codex/relations';
import type { RuleId, StrategyId } from './identifier-types';
import type { RuleRelations, StrategyRelations } from './relation-types';

export type { RuleRelations, StrategyRelations } from './relation-types';

/** Every strategy's outgoing edges, keyed by `strategyId`. */
export const STRATEGY_RELATIONS: Readonly<Record<StrategyId, StrategyRelations>> = {
  ...CLAUDE_STRATEGY_RELATIONS,
  ...CODEX_STRATEGY_RELATIONS,
};

/** Every inspection rule's outgoing edges, keyed by `ruleId`. */
export const RULE_RELATIONS: Readonly<Record<RuleId, RuleRelations>> = {
  ...CLAUDE_RULE_RELATIONS,
  ...CODEX_RULE_RELATIONS,
};
