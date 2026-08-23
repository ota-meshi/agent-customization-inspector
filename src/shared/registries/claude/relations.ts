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
  CLAUDE_REPO_AGENT_MEMORY_LOCAL_BEHAVIOR,
  CLAUDE_REPO_AGENT_MEMORY_PROJECT_BEHAVIOR,
  CLAUDE_REPO_COMMANDS_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
  CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
  CLAUDE_REPO_MCP_BEHAVIOR,
  CLAUDE_REPO_PLUGIN_BEHAVIOR,
  CLAUDE_REPO_RULES_BEHAVIOR,
  CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
  CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
  CLAUDE_REPO_SKILLS_BEHAVIOR,
  CLAUDE_USER_AGENTS_BEHAVIOR,
  CLAUDE_USER_AGENT_MEMORY_BEHAVIOR,
  CLAUDE_USER_AUTO_MEMORY_BEHAVIOR,
  CLAUDE_USER_COMMANDS_BEHAVIOR,
  CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  CLAUDE_USER_MCP_STATE_BEHAVIOR,
  CLAUDE_USER_PLUGINS_BEHAVIOR,
  CLAUDE_USER_RULES_BEHAVIOR,
  CLAUDE_USER_SETTINGS_BEHAVIOR,
  CLAUDE_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  CLAUDE_REPO_AGENT_RULE,
  CLAUDE_REPO_COMMAND_RULE,
  CLAUDE_REPO_INSTRUCTIONS_RULE,
  CLAUDE_REPO_MCP_RULE,
  CLAUDE_REPO_PERMISSIONS_RULE,
  CLAUDE_REPO_RULES_RULE,
  CLAUDE_REPO_SKILL_RULE,
} from './rules';
import {
  CLAUDE_AGENTS_SELECTION_STRATEGY,
  CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY,
  CLAUDE_COMMANDS_SELECTION_STRATEGY,
  CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  CLAUDE_MCP_SELECTION_STRATEGY,
  CLAUDE_RULES_LAYERING_STRATEGY,
  CLAUDE_SETTINGS_PRECEDENCE_STRATEGY,
  CLAUDE_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { ClaudeRuleId, ClaudeStrategyId } from '../identifier-types';

/** What each Claude strategy composes. What documents it is its own `evidence`. */
export const CLAUDE_STRATEGY_RELATIONS: Readonly<Record<ClaudeStrategyId, StrategyRelations>> = {
  /**
   * Agent-context composition composes every documented input a spawned
   * subagent's fresh context is assembled from: the agent files themselves,
   * the instruction chain it inherits, the rule layers, the skills its
   * `skills` field can preload, the three memory scopes its `memory` field
   * selects between, and the auto memory the page states is deliberately not
   * loaded. A statement the strategy consumes so it can record that boundary
   * is still one it consumes (contracts/runtime-composition.md
   * § claude.agent-context.composition).
   */
  [CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_AGENT_MEMORY_LOCAL_BEHAVIOR,
      CLAUDE_REPO_AGENT_MEMORY_PROJECT_BEHAVIOR,
      CLAUDE_REPO_AGENTS_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
      CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
      CLAUDE_REPO_RULES_BEHAVIOR,
      CLAUDE_REPO_SKILLS_BEHAVIOR,
      CLAUDE_USER_AGENT_MEMORY_BEHAVIOR,
      CLAUDE_USER_AGENTS_BEHAVIOR,
      CLAUDE_USER_AUTO_MEMORY_BEHAVIOR,
    ],
  },
  /**
   * Agent selection composes both documented subagent scopes: the project
   * files this product can read and the personal ones it may not. Both are
   * listed because the strategy describes Claude's runtime — the User scope is
   * one of the priorities it orders — while the managed, session `--agents`,
   * and plugin scopes it also orders have no behavior statement of their own,
   * so they stay condition facts rather than edges (data-model.md
   * § RegistryRelations).
   */
  [CLAUDE_AGENTS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [CLAUDE_REPO_AGENTS_BEHAVIOR, CLAUDE_USER_AGENTS_BEHAVIOR],
  },
  /**
   * Command selection composes both documented command scopes and both skill
   * scopes. The command scopes are listed even though only the project one is
   * readable: the strategy describes Claude's runtime, and omitting the User
   * scope would describe the selection as choosing among project command files
   * alone. The skill scopes are listed because they are the other side of the
   * one selection this strategy records — the documented outcome is that a
   * same-name skill wins over a command, so a graph naming only the command
   * lookups would describe a choice with one candidate.
   */
  [CLAUDE_COMMANDS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_COMMANDS_BEHAVIOR,
      CLAUDE_REPO_SKILLS_BEHAVIOR,
      CLAUDE_USER_COMMANDS_BEHAVIOR,
      CLAUDE_USER_SKILLS_BEHAVIOR,
    ],
  },
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
   * Rule layering composes both documented rule scopes. Both are listed even
   * though only the project layers are readable: user rules load before
   * project rules, and omitting them would describe the layering as starting
   * at the repository.
   */
  [CLAUDE_RULES_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [CLAUDE_REPO_RULES_BEHAVIOR, CLAUDE_USER_RULES_BEHAVIOR],
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
  /**
   * Settings precedence composes the project scope this product reads and the
   * User scope it does not: the order the page documents starts above the
   * project files, and leaving the User scope out would describe a precedence
   * that begins where this product's read authority happens to begin.
   */
  [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
      CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
      CLAUDE_USER_SETTINGS_BEHAVIOR,
    ],
  },
};

/** What each Claude inspection rule is based on and explained by. What evidences it is its own `evidence`. */
export const CLAUDE_RULE_RELATIONS: Readonly<Record<ClaudeRuleId, RuleRelations>> = {
  /**
   * The subagent rule is based on the project agent lookup alone — the User
   * scope the same page documents is a different Source boundary it may not
   * open — and is explained by both agent strategies: the selection that
   * orders same-name definitions across scopes and leaves a same-tree
   * duplicate unresolved, and the composition that assembles a spawned
   * subagent's context. Neither is projected by any surface (FR-009). No MCP
   * edge: an agent's `mcpServers` frontmatter is its own declared content and
   * makes it no carrier (data-model.md § Inventory unit).
   */
  [CLAUDE_REPO_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_AGENTS_BEHAVIOR],
    explainedByStrategies: [
      CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY,
      CLAUDE_AGENTS_SELECTION_STRATEGY,
    ],
  },
  /**
   * The Repository command rule is based on the project command lookup alone —
   * the User `commands/` directory the same statement pairs with is a
   * different Source boundary this rule may not read — and is explained by the
   * selection strategy, which owns the same-name skill precedence the rule
   * deliberately does not project (FR-009).
   */
  [CLAUDE_REPO_COMMAND_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_COMMANDS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_COMMANDS_SELECTION_STRATEGY],
  },
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
   * The permission-policy rule is based on the project settings lookup alone —
   * the User scope its precedence spans is a different boundary this rule may
   * not read — and is explained by the precedence strategy, which owns the
   * scope order and the array merge the rule deliberately does not project
   * (FR-009).
   */
  [CLAUDE_REPO_PERMISSIONS_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR, CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY],
  },
  /**
   * The Repository rule-file rule is based on the project rule lookup alone —
   * the User `rules/` directory the same section documents is a different
   * Source boundary this rule may not read — and is explained by the layering
   * strategy, which owns the User-before-project order and the `paths`
   * activation the rule deliberately does not project (FR-009).
   */
  [CLAUDE_REPO_RULES_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_RULES_BEHAVIOR],
    explainedByStrategies: [CLAUDE_RULES_LAYERING_STRATEGY],
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
