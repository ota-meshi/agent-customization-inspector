// Every edge Antigravity CLI records draw to another registry — the Antigravity
// CLI slice of the reference graph, in one place (see `codex/relations.ts` for
// why an edge holds the record itself and why citations are not edges).
//
// Ordering is by identifier within each array, so two builds of the same
// contract agree and the materialized fixture is byte-stable.
import {
  ANTIGRAVITY_REPO_AGENTS_BEHAVIOR,
  ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR,
  ANTIGRAVITY_REPO_HOOKS_BEHAVIOR,
  ANTIGRAVITY_REPO_MCP_BEHAVIOR,
  ANTIGRAVITY_REPO_RULES_BEHAVIOR,
  ANTIGRAVITY_REPO_SKILLS_BEHAVIOR,
  ANTIGRAVITY_USER_AGENTS_BEHAVIOR,
  ANTIGRAVITY_USER_CONTEXT_BEHAVIOR,
  ANTIGRAVITY_USER_HOME_BEHAVIOR,
  ANTIGRAVITY_USER_HOOKS_BEHAVIOR,
  ANTIGRAVITY_USER_MCP_BEHAVIOR,
  ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR,
  ANTIGRAVITY_USER_PLUGINS_BEHAVIOR,
  ANTIGRAVITY_USER_SETTINGS_BEHAVIOR,
  ANTIGRAVITY_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  ANTIGRAVITY_EXCLUDED_PLUGINS_RULE,
  ANTIGRAVITY_EXCLUDED_USER_RUNTIME_RULE,
  ANTIGRAVITY_EXCLUDED_WORKSPACE_PLUGINS_RULE,
  ANTIGRAVITY_GLOBAL_AGENT_RULE,
  ANTIGRAVITY_GLOBAL_CONTEXT_RULE,
  ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE,
  ANTIGRAVITY_GLOBAL_HOOKS_RULE,
  ANTIGRAVITY_GLOBAL_MCP_RULE,
  ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE,
  ANTIGRAVITY_GLOBAL_SETTINGS_RULE,
  ANTIGRAVITY_GLOBAL_SKILL_RULE,
  ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE,
  ANTIGRAVITY_REPO_AGENT_FILE_RULE,
  ANTIGRAVITY_REPO_CONTEXT_AGENTS_ROOT_RULE,
  ANTIGRAVITY_REPO_CONTEXT_GEMINI_ROOT_RULE,
  ANTIGRAVITY_REPO_HOOKS_RULE,
  ANTIGRAVITY_REPO_MCP_RULE,
  ANTIGRAVITY_REPO_RULE_RULE,
  ANTIGRAVITY_REPO_SKILL_DIRECTORY_RULE,
  ANTIGRAVITY_REPO_SKILL_FILE_RULE,
} from './rules';
import {
  ANTIGRAVITY_AGENTS_SELECTION_STRATEGY,
  ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY,
  ANTIGRAVITY_HOOKS_MERGE_STRATEGY,
  ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY,
  ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY,
  ANTIGRAVITY_RULES_ACTIVATION_STRATEGY,
  ANTIGRAVITY_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { AntigravityRuleId, AntigravityStrategyId } from '../identifier-types';

/** What each Antigravity CLI strategy composes. What documents it is its own `evidence`. */
export const ANTIGRAVITY_STRATEGY_RELATIONS: Readonly<
  Record<AntigravityStrategyId, StrategyRelations>
> = {
  /** Agent selection spans the two documented agent scopes. */
  [ANTIGRAVITY_AGENTS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_REPO_AGENTS_BEHAVIOR, ANTIGRAVITY_USER_AGENTS_BEHAVIOR],
  },
  /** Context layering composes the workspace context files with the global one. */
  [ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR, ANTIGRAVITY_USER_CONTEXT_BEHAVIOR],
  },
  /**
   * Hook merging composes the hooks the user settings file declares with those
   * an installed plugin bundles: the plugin copies are excluded from reading,
   * and the composition still names the behavior that describes them.
   */
  [ANTIGRAVITY_HOOKS_MERGE_STRATEGY.strategyId]: {
    consumesBehaviors: [
      ANTIGRAVITY_REPO_HOOKS_BEHAVIOR,
      ANTIGRAVITY_USER_HOOKS_BEHAVIOR,
      ANTIGRAVITY_USER_PLUGINS_BEHAVIOR,
    ],
  },
  /** MCP configuration composes the workspace and global server maps. */
  [ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_REPO_MCP_BEHAVIOR, ANTIGRAVITY_USER_MCP_BEHAVIOR],
  },
  /** Permission precedence ranks the three lists of the one settings carrier. */
  [ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR],
  },
  /**
   * Rule activation composes the workspace rules alone. The global counterpart
   * the Rules page names is `~/.gemini/GEMINI.md`, which this vendor already
   * publishes as its global context file rather than as a second rules
   * location, so the context behavior is not consumed here.
   */
  [ANTIGRAVITY_RULES_ACTIVATION_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_REPO_RULES_BEHAVIOR],
  },
  /** Skill selection spans the workspace and global skill locations. */
  [ANTIGRAVITY_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [ANTIGRAVITY_REPO_SKILLS_BEHAVIOR, ANTIGRAVITY_USER_SKILLS_BEHAVIOR],
  },
};

/** What each Antigravity CLI rule rests on and what explains it. */
export const ANTIGRAVITY_RULE_RELATIONS: Readonly<Record<AntigravityRuleId, RuleRelations>> = {
  /**
   * The plugin exclusion is based on the installed-copy behavior and is
   * explained by no strategy: the composition that merges a plugin's bundled
   * hooks names that behavior itself, while this rule says only that the
   * copies are never read.
   */
  [ANTIGRAVITY_EXCLUDED_PLUGINS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_PLUGINS_BEHAVIOR],
    explainedByStrategies: [],
  },
  /**
   * The workspace plugin exclusion is based on the installed-copy behavior,
   * which is the only plugin behavior the terminal's pages establish; the rule
   * says that a workspace plugin directory is never read, and no strategy
   * explains it because no composition reaches a location nothing admits.
   */
  [ANTIGRAVITY_EXCLUDED_WORKSPACE_PLUGINS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_PLUGINS_BEHAVIOR],
    explainedByStrategies: [],
  },
  /**
   * The user-runtime exclusion is based on the home that holds the state it
   * declines. The admitted surfaces are deliberately absent, and it is
   * explained by no strategy: an exclusion says this product never looks.
   */
  [ANTIGRAVITY_EXCLUDED_USER_RUNTIME_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_HOME_BEHAVIOR],
    explainedByStrategies: [],
  },
  /** The global agent rule rests on the global agent behavior, explained by agent selection. */
  [ANTIGRAVITY_GLOBAL_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_AGENTS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_AGENTS_SELECTION_STRATEGY],
  },
  /** The global context rule rests on the global context behavior, explained by context layering. */
  [ANTIGRAVITY_GLOBAL_CONTEXT_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_CONTEXT_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY],
  },
  /** The standalone global hook rule rests on the user hook behavior alone: its carrier is a hooks file. */
  [ANTIGRAVITY_GLOBAL_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_HOOKS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_HOOKS_MERGE_STRATEGY],
  },
  /** The inline global hook rule rests on the hook behavior and the settings carrier that holds it. */
  [ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_HOOKS_BEHAVIOR, ANTIGRAVITY_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_HOOKS_MERGE_STRATEGY],
  },
  /** The global MCP rule rests on the global MCP behavior, explained by MCP configuration. */
  [ANTIGRAVITY_GLOBAL_MCP_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_MCP_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY],
  },
  /** The permissions rule rests on the permission behavior and the carrier that holds it. */
  [ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR, ANTIGRAVITY_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY],
  },
  /** The settings rule rests on the user settings behavior and is explained by no strategy: the document is the row. */
  [ANTIGRAVITY_GLOBAL_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [],
  },
  /** The global skill rule rests on the global skill behavior, explained by skill selection. */
  [ANTIGRAVITY_GLOBAL_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_USER_SKILLS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_SKILLS_SELECTION_STRATEGY],
  },
  /** The directory-shaped workspace agent rule rests on the workspace agent behavior. */
  [ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_AGENTS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_AGENTS_SELECTION_STRATEGY],
  },
  /** The file-shaped workspace agent rule rests on the same behavior. */
  [ANTIGRAVITY_REPO_AGENT_FILE_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_AGENTS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_AGENTS_SELECTION_STRATEGY],
  },
  /** The root `AGENTS.md` rule rests on the workspace context behavior. */
  [ANTIGRAVITY_REPO_CONTEXT_AGENTS_ROOT_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY],
  },
  /** The root `GEMINI.md` rule rests on the same behavior. */
  [ANTIGRAVITY_REPO_CONTEXT_GEMINI_ROOT_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY],
  },
  /** The workspace MCP rule rests on the workspace MCP behavior. */
  [ANTIGRAVITY_REPO_MCP_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_MCP_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY],
  },
  /** The workspace hook rule rests on the workspace hook behavior. */
  [ANTIGRAVITY_REPO_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_HOOKS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_HOOKS_MERGE_STRATEGY],
  },
  /** The workspace rules rule rests on the workspace rules behavior, explained by rule activation. */
  [ANTIGRAVITY_REPO_RULE_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_RULES_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_RULES_ACTIVATION_STRATEGY],
  },
  /** The directory-shaped workspace skill rule rests on the workspace skill behavior. */
  [ANTIGRAVITY_REPO_SKILL_DIRECTORY_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_SKILLS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_SKILLS_SELECTION_STRATEGY],
  },
  /** The file-shaped workspace skill rule rests on the same behavior. */
  [ANTIGRAVITY_REPO_SKILL_FILE_RULE.ruleId]: {
    basedOnBehaviors: [ANTIGRAVITY_REPO_SKILLS_BEHAVIOR],
    explainedByStrategies: [ANTIGRAVITY_SKILLS_SELECTION_STRATEGY],
  },
};
