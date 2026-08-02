// Every edge Anthropic Claude Code records draw to another registry — the
// Claude slice of the reference graph, in one place.
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
import { CLAUDE_REPO_SKILLS_BEHAVIOR, CLAUDE_USER_SKILLS_BEHAVIOR } from './behaviors';
import { CLAUDE_REPO_SKILL_RULE } from './rules';
import { CLAUDE_SKILLS_SELECTION_STRATEGY } from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { ClaudeRuleId, ClaudeStrategyId } from '../identifier-types';

/** What each Claude strategy composes. What documents it is its own `evidence`. */
export const CLAUDE_STRATEGY_RELATIONS: Readonly<Record<ClaudeStrategyId, StrategyRelations>> = {
  /**
   * Skill selection composes both documented skill scopes. Both are listed
   * even though only the Repository scope is readable: the strategy describes
   * Claude's runtime, and omitting the User scope would misdescribe the
   * documented enterprise/User/project/bundled order as choosing among
   * repository skills alone.
   */
  [CLAUDE_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [CLAUDE_REPO_SKILLS_BEHAVIOR, CLAUDE_USER_SKILLS_BEHAVIOR],
  },
};

/** What each Claude inspection rule is based on and explained by. What evidences it is its own `evidence`. */
export const CLAUDE_RULE_RELATIONS: Readonly<Record<ClaudeRuleId, RuleRelations>> = {
  /**
   * The Repository skill rule is based on the Repository lookup alone — the
   * User scope is a different Source boundary this rule may not read — and is
   * explained by the selection strategy, which is what keeps every
   * runtime-chain fact conditional rather than resolved.
   */
  [CLAUDE_REPO_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_SKILLS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_SKILLS_SELECTION_STRATEGY],
  },
};
