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
  CODEX_REPO_CONFIG_BEHAVIOR,
  CODEX_REPO_HOOKS_BEHAVIOR,
  CODEX_REPO_INSTRUCTIONS_BEHAVIOR,
  CODEX_REPO_MCP_BEHAVIOR,
  CODEX_REPO_RULES_BEHAVIOR,
  CODEX_REPO_SKILLS_BEHAVIOR,
  CODEX_USER_CONFIG_BEHAVIOR,
  CODEX_USER_INSTRUCTIONS_BEHAVIOR,
  CODEX_USER_RULES_BEHAVIOR,
  CODEX_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  CODEX_REPO_CONFIG_RULE,
  CODEX_REPO_INSTRUCTIONS_RULE,
  CODEX_REPO_RULES_RULE,
  CODEX_REPO_SKILL_RULE,
} from './rules';
import {
  CODEX_CONFIG_PRECEDENCE_STRATEGY,
  CODEX_INSTRUCTIONS_LAYERING_STRATEGY,
  CODEX_MCP_CONFIGURATION_STRATEGY,
  CODEX_RULES_RESOLUTION_STRATEGY,
  CODEX_SKILLS_DISCOVERY_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { CodexRuleId, CodexStrategyId } from '../identifier-types';

/** What each Codex strategy composes. What documents it is its own `evidence`. */
export const CODEX_STRATEGY_RELATIONS: Readonly<Record<CodexStrategyId, StrategyRelations>> = {
  /**
   * Config precedence composes the project layers and the User host
   * configuration. Only the Repository carrier is readable; the edge records
   * the vendor's documented resolution, and recording it authorizes nothing
   * (contracts/runtime-composition.md § "Runtime composition is not Inspector
   * source merging").
   */
  [CODEX_CONFIG_PRECEDENCE_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_CONFIG_BEHAVIOR, CODEX_USER_CONFIG_BEHAVIOR],
  },
  /**
   * Instruction layering composes the project chain and the User fallback.
   * Both are listed even though only the Repository scope is readable now:
   * the strategy describes Codex's runtime, and omitting the User fallback
   * would misdescribe the chain as starting at the project root.
   */
  [CODEX_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_INSTRUCTIONS_BEHAVIOR, CODEX_USER_INSTRUCTIONS_BEHAVIOR],
  },
  /**
   * MCP configuration composes the Repository declaration behavior and the
   * User host configuration the same layer resolution reads. Only the
   * Repository carrier is readable; the edge records the vendor's documented
   * resolution, and recording it authorizes no read and no connection
   * (contracts/runtime-composition.md § codex.mcp.configuration).
   */
  [CODEX_MCP_CONFIGURATION_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_MCP_BEHAVIOR, CODEX_USER_CONFIG_BEHAVIOR],
  },
  /**
   * Rule resolution composes both documented rule scopes: the project layers
   * this product can read and the User layer it may not. Both are listed
   * because the strategy describes Codex's runtime — the restrictive decision
   * is taken across every active layer at once, so omitting the User layer
   * would describe a combination over the repository alone.
   */
  [CODEX_RULES_RESOLUTION_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_RULES_BEHAVIOR, CODEX_USER_RULES_BEHAVIOR],
  },
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
   * The derivation is based on both behaviors it spans — the config lookup
   * that declares the basenames and the instruction lookup that consumes
   * them — and is explained by both strategies: precedence supplies the
   * declared values, layering the per-directory selection the Inspector does
   * not project (contracts/vendors/openai-codex.md § Derived Repository
   * rules).
   */
  [CODEX_DERIVED_FALLBACK_BASENAME_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_CONFIG_BEHAVIOR, CODEX_REPO_INSTRUCTIONS_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY, CODEX_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * The config carrier's candidacy is based on the three behaviors the
   * carrier's contract row names: the config-layer lookup that locates the
   * file, the MCP declarations it can contain — the recognition this
   * admission ships — and the inline hooks it can also contain, recorded
   * without granting any Hook candidate or recognition. It is explained by
   * the precedence that resolves the layers and by the MCP configuration
   * strategy that resolves the contained declarations
   * (contracts/vendors/openai-codex.md § Inspector Repository rules).
   */
  [CODEX_REPO_CONFIG_RULE.ruleId]: {
    basedOnBehaviors: [
      CODEX_REPO_CONFIG_BEHAVIOR,
      CODEX_REPO_HOOKS_BEHAVIOR,
      CODEX_REPO_MCP_BEHAVIOR,
    ],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY, CODEX_MCP_CONFIGURATION_STRATEGY],
  },
  /**
   * The Repository instruction rule is based on the project instruction
   * lookup alone — the User fallback is a different Source boundary this rule
   * may not read, and the config carrier is not a lookup this rule performs —
   * and is explained by the layering strategy, which owns the per-directory
   * selection order the rule deliberately does not project (FR-009).
   */
  [CODEX_REPO_INSTRUCTIONS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_INSTRUCTIONS_BEHAVIOR],
    explainedByStrategies: [CODEX_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * The Repository rule-file rule is based on the project rule lookup alone —
   * the User layer the same startup scan reads is a different Source boundary
   * this rule may not read — and is explained by the resolution strategy,
   * which owns the restrictive combination across layers the rule itself
   * deliberately does not project (FR-009).
   */
  [CODEX_REPO_RULES_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_RULES_BEHAVIOR],
    explainedByStrategies: [CODEX_RULES_RESOLUTION_STRATEGY],
  },
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
