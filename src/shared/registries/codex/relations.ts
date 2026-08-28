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
  CODEX_REPO_AGENTS_BEHAVIOR,
  CODEX_REPO_CONFIG_BEHAVIOR,
  CODEX_REPO_HOOKS_BEHAVIOR,
  CODEX_REPO_INSTRUCTIONS_BEHAVIOR,
  CODEX_PLUGIN_MANIFEST_BEHAVIOR,
  CODEX_REPO_MARKETPLACE_BEHAVIOR,
  CODEX_REPO_MCP_BEHAVIOR,
  CODEX_REPO_RULES_BEHAVIOR,
  CODEX_REPO_SKILLS_BEHAVIOR,
  CODEX_USER_AGENTS_BEHAVIOR,
  CODEX_USER_CONFIG_BEHAVIOR,
  CODEX_USER_HOOKS_BEHAVIOR,
  CODEX_USER_INSTRUCTIONS_BEHAVIOR,
  CODEX_USER_MEMORIES_BEHAVIOR,
  CODEX_USER_PLUGINS_BEHAVIOR,
  CODEX_USER_PROMPTS_BEHAVIOR,
  CODEX_USER_RULES_BEHAVIOR,
  CODEX_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  CODEX_AGENTS_HOME_MARKETPLACE_RULE,
  CODEX_AGENTS_HOME_SKILL_RULE,
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  CODEX_EXCLUDED_PLUGIN_FILES_RULE,
  CODEX_EXCLUDED_USER_RUNTIME_RULE,
  CODEX_GLOBAL_AGENT_RULE,
  CODEX_GLOBAL_CONFIG_RULE,
  CODEX_GLOBAL_HOOKS_RULE,
  CODEX_GLOBAL_INLINE_HOOKS_RULE,
  CODEX_GLOBAL_INSTRUCTIONS_RULE,
  CODEX_GLOBAL_PROMPTS_RULE,
  CODEX_GLOBAL_RULES_RULE,
  CODEX_GLOBAL_SETTINGS_RULE,
  CODEX_REPO_AGENT_RULE,
  CODEX_REPO_CONFIG_RULE,
  CODEX_REPO_HOOKS_RULE,
  CODEX_REPO_INLINE_HOOKS_RULE,
  CODEX_REPO_INSTRUCTIONS_RULE,
  CODEX_REPO_MARKETPLACE_RULE,
  CODEX_REPO_RULES_RULE,
  CODEX_REPO_SETTINGS_RULE,
  CODEX_REPO_SKILL_RULE,
} from './rules';
import {
  CODEX_AGENTS_INHERITANCE_STRATEGY,
  CODEX_CONFIG_PRECEDENCE_STRATEGY,
  CODEX_HOOKS_ADDITIVE_STRATEGY,
  CODEX_INSTRUCTIONS_LAYERING_STRATEGY,
  CODEX_MCP_CONFIGURATION_STRATEGY,
  CODEX_PLUGINS_ACTIVATION_STRATEGY,
  CODEX_RULES_RESOLUTION_STRATEGY,
  CODEX_SKILLS_DISCOVERY_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { CodexRuleId, CodexStrategyId } from '../identifier-types';

/** What each Codex strategy composes. What documents it is its own `evidence`. */
export const CODEX_STRATEGY_RELATIONS: Readonly<Record<CodexStrategyId, StrategyRelations>> = {
  /**
   * Agent inheritance composes both documented custom-agent scopes: the
   * project files this product can read and the personal ones it may not.
   * Both are listed because the strategy describes Codex's runtime — a
   * personal agent whose name matches takes precedence over a built-in, so
   * omitting the User scope would describe a selection over project files
   * alone. The config and MCP behaviors are deliberately not edges here: what
   * a spawned session inherits from its parent is the parent session's
   * resolved state rather than a lookup this strategy performs, and the
   * layer resolution that produced it is `codex.config.precedence`'s own
   * (contracts/runtime-composition.md § codex.agents.inheritance).
   */
  [CODEX_AGENTS_INHERITANCE_STRATEGY.strategyId]: {
    consumesBehaviors: [CODEX_REPO_AGENTS_BEHAVIOR, CODEX_USER_AGENTS_BEHAVIOR],
  },
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
   * Additive hook composition composes every documented hook scope: the
   * project layers this product can read, the User layer it may not, and the
   * plugin root whose manifest points at the hooks an enabled plugin bundles.
   * All three are listed because the strategy describes Codex's runtime —
   * every active source contributes at once, and the User layer keeps
   * contributing where an untrusted project layer does not, so a composition
   * over the repository alone would describe a different product.
   */
  [CODEX_HOOKS_ADDITIVE_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CODEX_PLUGIN_MANIFEST_BEHAVIOR,
      CODEX_REPO_HOOKS_BEHAVIOR,
      CODEX_USER_HOOKS_BEHAVIOR,
    ],
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
   * Plugin activation composes all three plugin scopes: the two repository
   * catalog locations, the plugin root's own manifest, and the user's personal
   * marketplace with the installed copies beside it. The User scope is listed
   * though it is never read, for the reason the skill and rule strategies list
   * theirs — the strategy describes Codex's runtime, and a composition over the
   * repository catalog alone would describe a different product.
   */
  [CODEX_PLUGINS_ACTIVATION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CODEX_PLUGIN_MANIFEST_BEHAVIOR,
      CODEX_REPO_MARKETPLACE_BEHAVIOR,
      CODEX_USER_PLUGINS_BEHAVIOR,
    ],
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
   * The exclusion cites all three plugin behaviors: it is the scope statement
   * for what a manifest and a catalog point at, and for the installed copies
   * the User scope holds. Citing behavior it deliberately does not authorize
   * is what an exclusion is for. The activation strategy explains it, because
   * what those components are to a running client is that strategy's.
   */
  [CODEX_EXCLUDED_PLUGIN_FILES_RULE.ruleId]: {
    basedOnBehaviors: [
      CODEX_PLUGIN_MANIFEST_BEHAVIOR,
      CODEX_REPO_MARKETPLACE_BEHAVIOR,
      CODEX_USER_PLUGINS_BEHAVIOR,
    ],
    explainedByStrategies: [CODEX_PLUGINS_ACTIVATION_STRATEGY],
  },
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
   * The custom-agent rule is based on the project agent lookup alone — the
   * personal `<CODEX_HOME>/agents/` scope the same page documents is a
   * different Source boundary this rule may not read — and is explained by
   * the inheritance strategy, which owns the spawned-session overlay,
   * selection, and live sandbox/approval reapplication the rule itself
   * deliberately does not project (FR-009). No MCP edge: an agent file's
   * `mcp_servers` keys are its own declared content and make it no carrier,
   * so the rule rests on no MCP behavior and explains itself through no MCP
   * strategy (data-model.md § Inventory unit).
   */
  [CODEX_REPO_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_AGENTS_BEHAVIOR],
    explainedByStrategies: [CODEX_AGENTS_INHERITANCE_STRATEGY],
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
   * The standalone hook carrier rests on the project hook lookup alone — the
   * User layer's own `hooks.json` is a different Source boundary this rule may
   * not read — and is explained by the additive strategy, which owns
   * everything the row does not state: that a declared hook is trusted,
   * reviewed, enabled, or reached at all (FR-009).
   */
  [CODEX_REPO_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_HOOKS_BEHAVIOR],
    explainedByStrategies: [CODEX_HOOKS_ADDITIVE_STRATEGY],
  },
  /**
   * The inline hook recognition of the config carrier rests on both lookups it
   * spans: the config-layer lookup that locates the file, and the hook lookup
   * that reads an inline `[hooks]` table out of it. It is explained by the
   * additive strategy, which owns the same-layer retention that keeps this
   * recognition and the standalone file's distinct, and by the precedence that
   * decides which layers are active at all.
   */
  [CODEX_REPO_INLINE_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_CONFIG_BEHAVIOR, CODEX_REPO_HOOKS_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY, CODEX_HOOKS_ADDITIVE_STRATEGY],
  },
  /**
   * The settings recognition of the same file rests on the config-layer
   * lookup alone: what it publishes is the document that lookup locates, and
   * the declarations inside it that another recognition owns — the MCP tables
   * — are that recognition's basis rather than this one's. It is explained by
   * the precedence that resolves the layers, which is the only composition a
   * document-shaped recognition can be explained by
   * (contracts/vendors/openai-codex.md § Inspector Repository rules).
   */
  [CODEX_REPO_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_CONFIG_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY],
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
   * The catalog rule is based on the catalog lookup alone: the manifest
   * behavior belongs to the plugin roots its entries name, which the
   * derivation reaches, not to the file this rule admits. The activation
   * strategy explains it, and owns everything the row does not state — that a
   * listed plugin is installed, enabled, trusted, or loaded from its cache.
   */
  [CODEX_REPO_MARKETPLACE_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_REPO_MARKETPLACE_BEHAVIOR],
    explainedByStrategies: [CODEX_PLUGINS_ACTIVATION_STRATEGY],
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
  /**
   * The Global instruction rule is based on the User instruction fallback
   * alone — the Repository chain is a different Source boundary this rule may
   * not read — and is explained by the layering strategy, which is where the
   * global-precedes-project order lives.
   */
  [CODEX_GLOBAL_INSTRUCTIONS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_INSTRUCTIONS_BEHAVIOR],
    explainedByStrategies: [CODEX_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * Each widened Global rule mirrors its Repository sibling's relations at
   * the user scope: the config carrier rests on the config lookup and the
   * MCP declarations it ships, the settings recognition on the config lookup
   * alone, the inline hooks on the config and hook lookups it spans, and the
   * rest each on the one User behavior they accept — explained by the same
   * strategies, because the vendor composes the user and project layers by
   * one documented rule (contracts/vendors/openai-codex.md § Inspector
   * Global rule).
   */
  [CODEX_GLOBAL_CONFIG_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_CONFIG_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY, CODEX_MCP_CONFIGURATION_STRATEGY],
  },
  [CODEX_GLOBAL_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_CONFIG_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY],
  },
  [CODEX_GLOBAL_INLINE_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_CONFIG_BEHAVIOR, CODEX_USER_HOOKS_BEHAVIOR],
    explainedByStrategies: [CODEX_CONFIG_PRECEDENCE_STRATEGY, CODEX_HOOKS_ADDITIVE_STRATEGY],
  },
  [CODEX_GLOBAL_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_HOOKS_BEHAVIOR],
    explainedByStrategies: [CODEX_HOOKS_ADDITIVE_STRATEGY],
  },
  [CODEX_GLOBAL_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_AGENTS_BEHAVIOR],
    explainedByStrategies: [CODEX_AGENTS_INHERITANCE_STRATEGY],
  },
  [CODEX_GLOBAL_RULES_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_RULES_BEHAVIOR],
    explainedByStrategies: [CODEX_RULES_RESOLUTION_STRATEGY],
  },
  [CODEX_GLOBAL_PROMPTS_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_PROMPTS_BEHAVIOR],
    explainedByStrategies: [],
  },
  /**
   * The shared-agent-home skill rule is based on the User skill lookup alone
   * (FR-045) and is explained by the discovery strategy, exactly as the
   * Repository skill rule is: the scopes the strategy spans stay conditional
   * on runtime inputs this tool never observes.
   */
  [CODEX_AGENTS_HOME_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_SKILLS_BEHAVIOR],
    explainedByStrategies: [CODEX_SKILLS_DISCOVERY_STRATEGY],
  },
  /**
   * The personal marketplace rule is based on the User plugin behavior's
   * catalog half; the same behavior's installed copies stay named by the User
   * exclusion below, because a catalog names where a plugin comes from while
   * an installed copy is state nothing here may read.
   */
  [CODEX_AGENTS_HOME_MARKETPLACE_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_PLUGINS_BEHAVIOR],
    explainedByStrategies: [CODEX_PLUGINS_ACTIVATION_STRATEGY],
  },
  /**
   * The User exclusion is based on every Codex User surface it declines to
   * authorize. The instruction fallback and the personal skills are
   * deliberately absent: `codex.global.instructions` and
   * `codex.global.agents-home.skill` admit those surfaces, and an exclusion
   * naming one would contradict the rule beside it. The plugin behavior stays,
   * because only its catalog half is admitted: the installed copies it also
   * documents remain excluded state.
   *
   * It is explained by no strategy. A strategy says how a runtime composes
   * what it found; an exclusion says this product never looks, so there is no
   * composition for one to describe.
   */
  [CODEX_EXCLUDED_USER_RUNTIME_RULE.ruleId]: {
    basedOnBehaviors: [CODEX_USER_MEMORIES_BEHAVIOR, CODEX_USER_PLUGINS_BEHAVIOR],
    explainedByStrategies: [],
  },
};
