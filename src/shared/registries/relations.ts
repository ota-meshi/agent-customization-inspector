// The shipped reference graph between the contract-versioned registries.
//
// This module is the graph's public surface: a generic graph consumer outside
// `registries/` imports these aggregates, never a vendor's catalog. The one
// exception is each vendor's own rule compiler
// (`src/server/inspection/rules/<tool>.ts`), which reads its own vendor's
// `<tool>/relations.ts` directly so a rule can only be compiled with its own
// vendor's edges. The edge shapes live in `relation-types.ts` and each
// product's edges in `<tool>/relations.ts`, so a new vendor is a new
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
import { COPILOT_RULE_RELATIONS, COPILOT_STRATEGY_RELATIONS } from './copilot/relations';
import type { RuleId, StrategyId } from './identifier-types';
import type { RuleRelations, StrategyRelations } from './relation-types';

export type { RuleRelations, StrategyRelations } from './relation-types';

/** Every strategy's outgoing edges, keyed by `strategyId`. */
export const STRATEGY_RELATIONS: Readonly<Record<StrategyId, StrategyRelations>> = {
  ...COPILOT_STRATEGY_RELATIONS,
  ...CLAUDE_STRATEGY_RELATIONS,
  ...CODEX_STRATEGY_RELATIONS,
};

/** Every inspection rule's outgoing edges, keyed by `ruleId`. */
export const RULE_RELATIONS: Readonly<Record<RuleId, RuleRelations>> = {
  ...COPILOT_RULE_RELATIONS,
  ...CLAUDE_RULE_RELATIONS,
  ...CODEX_RULE_RELATIONS,
};
