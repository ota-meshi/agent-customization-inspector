// Every edge Gemini CLI records draw to another registry — the Gemini CLI
// slice of the reference graph, in one place (see `codex/relations.ts` for
// why an edge holds the record itself and why citations are not edges).
//
// Ordering is by identifier within each array, so two builds of the same
// contract agree and the materialized fixture is byte-stable.
import {
  GEMINI_REPO_AGENTS_BEHAVIOR,
  GEMINI_REPO_COMMANDS_BEHAVIOR,
  GEMINI_REPO_CONTEXT_BEHAVIOR,
  GEMINI_REPO_ENV_BEHAVIOR,
  GEMINI_REPO_HOOKS_BEHAVIOR,
  GEMINI_REPO_IGNORE_BEHAVIOR,
  GEMINI_REPO_MCP_BEHAVIOR,
  GEMINI_REPO_POLICIES_BEHAVIOR,
  GEMINI_REPO_SETTINGS_BEHAVIOR,
  GEMINI_REPO_SKILLS_BEHAVIOR,
  GEMINI_REPO_TRUST_BEHAVIOR,
  GEMINI_USER_AGENTS_BEHAVIOR,
  GEMINI_USER_COMMANDS_BEHAVIOR,
  GEMINI_USER_CONTEXT_BEHAVIOR,
  GEMINI_USER_ENV_BEHAVIOR,
  GEMINI_USER_EXTENSIONS_BEHAVIOR,
  GEMINI_USER_HOME_BEHAVIOR,
  GEMINI_USER_POLICIES_BEHAVIOR,
  GEMINI_USER_SETTINGS_BEHAVIOR,
  GEMINI_USER_SKILLS_BEHAVIOR,
  GEMINI_USER_TRUST_RECORD_BEHAVIOR,
} from './behaviors';
import {
  GEMINI_AGENTS_HOME_SKILL_RULE,
  GEMINI_DERIVED_CONTEXT_FILENAME_RULE,
  GEMINI_EXCLUDED_EXTENSIONS_RULE,
  GEMINI_EXCLUDED_REPO_NON_CUSTOMIZATIONS_RULE,
  GEMINI_EXCLUDED_USER_RUNTIME_RULE,
  GEMINI_GLOBAL_AGENT_RULE,
  GEMINI_GLOBAL_COMMAND_RULE,
  GEMINI_GLOBAL_HOOKS_RULE,
  GEMINI_GLOBAL_INSTRUCTIONS_RULE,
  GEMINI_GLOBAL_MCP_RULE,
  GEMINI_GLOBAL_POLICIES_RULE,
  GEMINI_GLOBAL_SETTINGS_RULE,
  GEMINI_GLOBAL_SKILL_RULE,
  GEMINI_REPO_AGENT_RULE,
  GEMINI_REPO_COMMAND_RULE,
  GEMINI_REPO_HOOKS_RULE,
  GEMINI_REPO_MCP_RULE,
  GEMINI_REPO_SETTINGS_RULE,
  GEMINI_REPO_SKILL_RULE,
} from './rules';
import {
  GEMINI_AGENTS_SELECTION_STRATEGY,
  GEMINI_COMMANDS_SELECTION_STRATEGY,
  GEMINI_CONTEXT_LAYERING_STRATEGY,
  GEMINI_HOOKS_MERGE_STRATEGY,
  GEMINI_MCP_CONFIGURATION_STRATEGY,
  GEMINI_POLICIES_TIERS_STRATEGY,
  GEMINI_SETTINGS_PRECEDENCE_STRATEGY,
  GEMINI_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { GeminiRuleId, GeminiStrategyId } from '../identifier-types';

/** What each Gemini CLI strategy composes. What documents it is its own `evidence`. */
export const GEMINI_STRATEGY_RELATIONS: Readonly<Record<GeminiStrategyId, StrategyRelations>> = {
  /** Agent selection spans the two documented agent scopes, and the trust that gates the project one. */
  [GEMINI_AGENTS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_AGENTS_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_AGENTS_BEHAVIOR,
    ],
  },
  /** Command selection composes the project and user command directories; trust decides whether the project one loads. */
  [GEMINI_COMMANDS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_COMMANDS_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_COMMANDS_BEHAVIOR,
    ],
  },
  /** Context layering concatenates the global file with the workspace and just-in-time files trust lets load. */
  [GEMINI_CONTEXT_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_CONTEXT_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_CONTEXT_BEHAVIOR,
    ],
  },
  /**
   * Hook merging composes the project hooks, the user settings that carry
   * the user hooks, the extensions whose bundled hooks join the merge, and the
   * trust that gates the project layer.
   */
  [GEMINI_HOOKS_MERGE_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_HOOKS_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_EXTENSIONS_BEHAVIOR,
      GEMINI_USER_SETTINGS_BEHAVIOR,
    ],
  },
  /** MCP configuration merges the project and user server maps and the extensions' own, filtered by trust. */
  [GEMINI_MCP_CONFIGURATION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_MCP_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_EXTENSIONS_BEHAVIOR,
      GEMINI_USER_SETTINGS_BEHAVIOR,
    ],
  },
  /**
   * Policy tiers rank the user policies, the extensions' bundled policies,
   * and — documented as not loaded — the workspace tier: listed because the
   * strategy describes the vendor's tier order, in which that tier has a base
   * even though its files have no effect.
   */
  [GEMINI_POLICIES_TIERS_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_POLICIES_BEHAVIOR,
      GEMINI_USER_EXTENSIONS_BEHAVIOR,
      GEMINI_USER_POLICIES_BEHAVIOR,
    ],
  },
  /** Settings precedence layers the project and user settings files, the project one gated by trust. */
  [GEMINI_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_SETTINGS_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_SETTINGS_BEHAVIOR,
    ],
  },
  /** Skill selection ranks the workspace, user, and extension tiers, the workspace one gated by trust. */
  [GEMINI_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      GEMINI_REPO_SKILLS_BEHAVIOR,
      GEMINI_REPO_TRUST_BEHAVIOR,
      GEMINI_USER_EXTENSIONS_BEHAVIOR,
      GEMINI_USER_SKILLS_BEHAVIOR,
    ],
  },
};

/** What each Gemini CLI rule is based on and explained by. */
export const GEMINI_RULE_RELATIONS: Readonly<Record<GeminiRuleId, RuleRelations>> = {
  /**
   * The derived context rule is based on the context lookup and on the
   * settings lookup whose carrier seeds it, and is explained by the layering
   * that concatenates what it admits and by the settings precedence that
   * supplies `context.fileName`.
   */
  [GEMINI_DERIVED_CONTEXT_FILENAME_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_CONTEXT_BEHAVIOR, GEMINI_REPO_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_CONTEXT_LAYERING_STRATEGY, GEMINI_SETTINGS_PRECEDENCE_STRATEGY],
  },
  /** The settings recognition rests on the settings lookup and is explained by the layer precedence. */
  [GEMINI_REPO_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_SETTINGS_PRECEDENCE_STRATEGY],
  },
  /** The MCP recognition rests on the carrier lookup and the declarations it ships. */
  [GEMINI_REPO_MCP_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_MCP_BEHAVIOR, GEMINI_REPO_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_MCP_CONFIGURATION_STRATEGY],
  },
  /** The hook recognition rests on the carrier lookup and the hooks it can carry. */
  [GEMINI_REPO_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_HOOKS_BEHAVIOR, GEMINI_REPO_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_HOOKS_MERGE_STRATEGY],
  },
  [GEMINI_REPO_COMMAND_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_COMMANDS_BEHAVIOR],
    explainedByStrategies: [GEMINI_COMMANDS_SELECTION_STRATEGY],
  },
  /**
   * The Repository skill rule is based on the Repository lookup alone — the
   * user tier is a different Source boundary this rule may not read — and is
   * explained by the selection strategy, which is what the row's same-name
   * statement is derived from.
   */
  [GEMINI_REPO_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_SKILLS_BEHAVIOR],
    explainedByStrategies: [GEMINI_SKILLS_SELECTION_STRATEGY],
  },
  [GEMINI_REPO_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_REPO_AGENTS_BEHAVIOR],
    explainedByStrategies: [GEMINI_AGENTS_SELECTION_STRATEGY],
  },
  /**
   * The Repository exclusion is based on every repository surface it declines:
   * the unloaded workspace policies, the ignore file, the environment files,
   * and the hook lookup whose declarations name the scripts it declines. It is
   * explained by the policy tiers alone — the one composition that ranks a
   * surface this rule leaves unread.
   */
  [GEMINI_EXCLUDED_REPO_NON_CUSTOMIZATIONS_RULE.ruleId]: {
    basedOnBehaviors: [
      GEMINI_REPO_ENV_BEHAVIOR,
      GEMINI_REPO_HOOKS_BEHAVIOR,
      GEMINI_REPO_IGNORE_BEHAVIOR,
      GEMINI_REPO_POLICIES_BEHAVIOR,
    ],
    explainedByStrategies: [GEMINI_POLICIES_TIERS_STRATEGY],
  },
  /**
   * Each Global rule mirrors its Repository sibling's relations at the user
   * scope, the home behavior joining every one because each reads below the
   * directory it locates.
   */
  [GEMINI_GLOBAL_INSTRUCTIONS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_CONTEXT_BEHAVIOR, GEMINI_USER_HOME_BEHAVIOR],
    explainedByStrategies: [GEMINI_CONTEXT_LAYERING_STRATEGY],
  },
  [GEMINI_GLOBAL_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_HOME_BEHAVIOR, GEMINI_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_SETTINGS_PRECEDENCE_STRATEGY],
  },
  [GEMINI_GLOBAL_MCP_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_HOME_BEHAVIOR, GEMINI_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_MCP_CONFIGURATION_STRATEGY],
  },
  [GEMINI_GLOBAL_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_HOME_BEHAVIOR, GEMINI_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [GEMINI_HOOKS_MERGE_STRATEGY],
  },
  [GEMINI_GLOBAL_COMMAND_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_COMMANDS_BEHAVIOR, GEMINI_USER_HOME_BEHAVIOR],
    explainedByStrategies: [GEMINI_COMMANDS_SELECTION_STRATEGY],
  },
  [GEMINI_GLOBAL_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_HOME_BEHAVIOR, GEMINI_USER_SKILLS_BEHAVIOR],
    explainedByStrategies: [GEMINI_SKILLS_SELECTION_STRATEGY],
  },
  [GEMINI_GLOBAL_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_AGENTS_BEHAVIOR, GEMINI_USER_HOME_BEHAVIOR],
    explainedByStrategies: [GEMINI_AGENTS_SELECTION_STRATEGY],
  },
  [GEMINI_GLOBAL_POLICIES_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_HOME_BEHAVIOR, GEMINI_USER_POLICIES_BEHAVIOR],
    explainedByStrategies: [GEMINI_POLICIES_TIERS_STRATEGY],
  },
  /**
   * The shared-agent-home skill rule is based on the user skill lookup alone
   * (parent FR-045): the alias is that lookup's second location, and the
   * shared home is its own consented boundary rather than the Gemini CLI home.
   */
  [GEMINI_AGENTS_HOME_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_SKILLS_BEHAVIOR],
    explainedByStrategies: [GEMINI_SKILLS_SELECTION_STRATEGY],
  },
  /**
   * The extension exclusion is based on the installed-extension behavior and
   * is explained by no strategy: the compositions that merge an extension's
   * bundled hooks, servers, skills, and policies name that behavior
   * themselves, while this rule says only that the copies are never read.
   */
  [GEMINI_EXCLUDED_EXTENSIONS_RULE.ruleId]: {
    basedOnBehaviors: [GEMINI_USER_EXTENSIONS_BEHAVIOR],
    explainedByStrategies: [],
  },
  /**
   * The user-runtime exclusion is based on the user surfaces it declines —
   * the environment files and the trust record — and on the home that holds
   * them. The admitted surfaces are deliberately absent, and it is explained
   * by no strategy: an exclusion says this product never looks.
   */
  [GEMINI_EXCLUDED_USER_RUNTIME_RULE.ruleId]: {
    basedOnBehaviors: [
      GEMINI_USER_ENV_BEHAVIOR,
      GEMINI_USER_HOME_BEHAVIOR,
      GEMINI_USER_TRUST_RECORD_BEHAVIOR,
    ],
    explainedByStrategies: [],
  },
};
