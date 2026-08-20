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
import {
  CLAUDE_REPO_AGENTS_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
  CLAUDE_REPO_MCP_BEHAVIOR,
  CLAUDE_REPO_PLUGIN_BEHAVIOR,
  CLAUDE_REPO_SKILLS_BEHAVIOR,
  CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  CLAUDE_USER_MCP_STATE_BEHAVIOR,
  CLAUDE_USER_PLUGINS_BEHAVIOR,
  CLAUDE_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  CLAUDE_REPO_INSTRUCTIONS_RULE,
  CLAUDE_REPO_MCP_RULE,
  CLAUDE_REPO_SKILL_RULE,
} from './rules';
import {
  CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  CLAUDE_MCP_SELECTION_STRATEGY,
  CLAUDE_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { ClaudeRuleId, ClaudeStrategyId } from '../identifier-types';

/** What each Claude strategy composes. What documents it is its own `evidence`. */
export const CLAUDE_STRATEGY_RELATIONS: Readonly<Record<ClaudeStrategyId, StrategyRelations>> = {
  /**
   * Instruction layering composes all four documented instruction scopes. The
   * User file is listed even though only the Repository ones are readable:
   * the strategy describes Claude's runtime, and omitting it would misdescribe
   * the documented broadest-to-most-specific order as starting at the
   * repository.
   */
  [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
      CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
    ],
  },
  /**
   * MCP selection composes every documented scope its order spans. Only the
   * project carrier is readable; the agent, plugin, User-state, and
   * installed-plugin statements are listed all the same, because the strategy
   * describes Claude's runtime and omitting them would misdescribe the
   * documented local/project/User/plugin/connector order as choosing among
   * project declarations alone (contracts/runtime-composition.md
   * § claude.mcp.selection).
   */
  [CLAUDE_MCP_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_AGENTS_BEHAVIOR,
      CLAUDE_REPO_MCP_BEHAVIOR,
      CLAUDE_REPO_PLUGIN_BEHAVIOR,
      CLAUDE_USER_MCP_STATE_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
    ],
  },
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
   * The Repository instruction rule is based on the three Repository lookups
   * it admits for — the User file is a different Source boundary this rule may
   * not read — and is explained by the layering strategy, which owns the load
   * order the rule deliberately does not project (FR-009).
   */
  [CLAUDE_REPO_INSTRUCTIONS_RULE.ruleId]: {
    basedOnBehaviors: [
      CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
    ],
    explainedByStrategies: [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * The Repository MCP rule is based on the project-carrier lookup alone —
   * the agent, plugin, and User scopes its selection spans are different
   * boundaries this rule may not read — and is explained by the selection
   * strategy, which owns the scope order the rule deliberately does not
   * project (FR-009).
   */
  [CLAUDE_REPO_MCP_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_MCP_BEHAVIOR],
    explainedByStrategies: [CLAUDE_MCP_SELECTION_STRATEGY],
  },
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
