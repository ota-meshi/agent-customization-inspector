// Every edge OpenAI Codex records draw to another registry — the Codex slice
// of the reference graph, in one place.
//
// A behavior and a strategy edge holds the referenced record itself, so
// reading a relation (and go-to-definition) lands on the thing being named.
// The graph being acyclic is what makes that possible at all: `const` object
// references across a cycle would fail at module evaluation.
//
// Citations are not edges and are not here: each record states its own in an
// `evidence` array, where the basis sits beside the claim. They are maintenance
// data the shipped CLI must not carry, which `tsdown.config.ts` enforces
// through the `__ACI_SHIP_MAINTENANCE_DATA__` define. A behavior has no edge in
// this file at all — its only outgoing reference was a citation.
//
// Ordering is by identifier within each array, so two builds of the same
// contract agree and the materialized fixture is byte-stable.
import {
  CODEX_REPO_SKILLS_BEHAVIOR,
  CODEX_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import { CODEX_REPO_SKILL_RULE } from './rules';
import { CODEX_SKILLS_DISCOVERY_STRATEGY } from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { CodexRuleId, CodexStrategyId } from '../identifier-types';

/** What each Codex strategy composes. What documents it is its own `evidence`. */
export const CODEX_STRATEGY_RELATIONS: Readonly<Record<CodexStrategyId, StrategyRelations>> = {
  /**
   * Skill discovery composes both documented skill scopes. Both are listed
   * even though only the Repository scope is readable: the strategy describes
   * Codex's runtime, and omitting the User scope would misdescribe it as
   * choosing among repository skills alone.
   */
  [CODEX_SKILLS_DISCOVERY_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_SKILLS_BEHAVIOR, CODEX_USER_SKILLS_BEHAVIOR],
  },
};

/** What each Codex inspection rule is based on and explained by. What evidences it is its own `evidence`. */
export const CODEX_RULE_RELATIONS: Readonly<Record<CodexRuleId, RuleRelations>> = {
  /**
   * The Repository skill rule is based on the Repository lookup alone — the
   * User scope is a different Source boundary this rule may not read — and is
   * explained by the discovery strategy, which is what keeps every
   * runtime-chain fact conditional rather than resolved.
   */
  [CODEX_REPO_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_SKILLS_BEHAVIOR],
    explainedByStrategies: [CODEX_SKILLS_DISCOVERY_STRATEGY],
  },
};
