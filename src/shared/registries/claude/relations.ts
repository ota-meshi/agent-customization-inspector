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
  CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR,
  CLAUDE_REPO_MARKETPLACE_BEHAVIOR,
  CLAUDE_REPO_MCP_BEHAVIOR,
  CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR,
  CLAUDE_REPO_PLUGIN_BEHAVIOR,
  CLAUDE_REPO_RULES_BEHAVIOR,
  CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
  CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
  CLAUDE_REPO_SKILLS_BEHAVIOR,
  CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR,
  CLAUDE_USER_AGENTS_BEHAVIOR,
  CLAUDE_USER_AGENT_MEMORY_BEHAVIOR,
  CLAUDE_USER_AUTO_MEMORY_BEHAVIOR,
  CLAUDE_USER_COMMANDS_BEHAVIOR,
  CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  CLAUDE_USER_KEYBINDINGS_BEHAVIOR,
  CLAUDE_USER_MCP_STATE_BEHAVIOR,
  CLAUDE_USER_PLUGINS_BEHAVIOR,
  CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR,
  CLAUDE_USER_RULES_BEHAVIOR,
  CLAUDE_USER_SETTINGS_BEHAVIOR,
  CLAUDE_USER_SKILLS_BEHAVIOR,
  CLAUDE_USER_THEMES_BEHAVIOR,
  CLAUDE_USER_WORKFLOWS_BEHAVIOR,
} from './behaviors';
import {
  CLAUDE_EXCLUDED_PLUGIN_FILES_RULE,
  CLAUDE_EXCLUDED_USER_RUNTIME_RULE,
  CLAUDE_GLOBAL_AGENT_RULE,
  CLAUDE_GLOBAL_COMMAND_RULE,
  CLAUDE_GLOBAL_INSTRUCTIONS_RULE,
  CLAUDE_GLOBAL_OUTPUT_STYLE_RULE,
  CLAUDE_GLOBAL_PERMISSIONS_RULE,
  CLAUDE_GLOBAL_RULES_RULE,
  CLAUDE_GLOBAL_SETTINGS_HOOKS_RULE,
  CLAUDE_GLOBAL_SETTINGS_RULE,
  CLAUDE_GLOBAL_SKILL_RULE,
  CLAUDE_REPO_AGENT_RULE,
  CLAUDE_REPO_COMMAND_RULE,
  CLAUDE_REPO_INSTRUCTIONS_RULE,
  CLAUDE_REPO_MARKETPLACE_RULE,
  CLAUDE_REPO_MCP_RULE,
  CLAUDE_REPO_SETTINGS_HOOKS_RULE,
  CLAUDE_REPO_PERMISSIONS_RULE,
  CLAUDE_REPO_OUTPUT_STYLE_RULE,
  CLAUDE_REPO_RULES_RULE,
  CLAUDE_REPO_SETTINGS_RULE,
  CLAUDE_REPO_SKILL_RULE,
  CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_RULE,
} from './rules';
import {
  CLAUDE_AGENTS_SELECTION_STRATEGY,
  CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY,
  CLAUDE_COMMANDS_SELECTION_STRATEGY,
  CLAUDE_HOOKS_ADDITIVE_STRATEGY,
  CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  CLAUDE_MCP_SELECTION_STRATEGY,
  CLAUDE_PLUGINS_ACTIVATION_STRATEGY,
  CLAUDE_RULES_LAYERING_STRATEGY,
  CLAUDE_SETTINGS_PRECEDENCE_STRATEGY,
  CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY,
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
  /**
   * Additive hook composition consumes every documented source of a hook this
   * vendor has: the contained-declaration statement that locates them, the two
   * project settings files and the User settings file whose levels merge, the
   * skill and subagent lookups whose frontmatter can declare them, and both
   * plugin scopes, because a plugin contributes its hooks while it is enabled.
   * The User scopes are listed though this product never reads them: the
   * strategy describes Claude's runtime, and a composition over the repository
   * alone would describe a different product.
   */
  [CLAUDE_HOOKS_ADDITIVE_STRATEGY.strategyId]: {
    // Ordered by behavior identifier, as every edge array in this file is.
    consumesBehaviors: [
      CLAUDE_REPO_AGENTS_BEHAVIOR,
      CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR,
      CLAUDE_REPO_PLUGIN_BEHAVIOR,
      CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
      CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
      CLAUDE_REPO_SKILLS_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
      CLAUDE_USER_SETTINGS_BEHAVIOR,
    ],
  },
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
   * Output-style selection composes every documented source of a style: the
   * project layers this product reads, the User layer it does not, and the
   * plugin scopes a plugin ships its `output-styles/` directory through. The
   * plugin scopes are inputs rather than context, because the page gives a
   * plugin style a decision of its own — `force-for-plugin` applies it whenever
   * the plugin is enabled and overrides the user's `outputStyle` setting — so a
   * composition without them would describe a selection the vendor does not
   * make. The managed-policy level the same page names is a condition rather
   * than a behavior, and stays in the contract's condition column.
   */
  [CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR,
      CLAUDE_REPO_PLUGIN_BEHAVIOR,
      CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
    ],
  },
  /**
   * Plugin activation composes the two paths a plugin reaches a session by: the
   * placement-loaded skills-directory plugin, the catalog whose entries a
   * session registers, and the plugin content either one establishes. The User
   * scope is named too, because installed plugins live there and leaving it out
   * would describe activation as if a repository were the only place a plugin
   * comes from. None of it is projected: registration, enablement, and trust
   * are runtime inputs this product never reads (FR-009).
   */
  [CLAUDE_PLUGINS_ACTIVATION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      CLAUDE_REPO_MARKETPLACE_BEHAVIOR,
      CLAUDE_REPO_PLUGIN_BEHAVIOR,
      CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
    ],
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
   * The contained-hook rule rests on the hook lookup that reads the declaration
   * and on the two settings lookups that located its owner: the declaration is
   * the hook behavior's, and that the file is accepted at all is the settings
   * lookups'. It is explained by the additive composition, which owns
   * everything a row does not state — whether a workspace is trusted, whether a
   * managed policy allows a non-managed hook, and how long a registration lasts
   * (FR-009).
   */
  [CLAUDE_REPO_SETTINGS_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [
      CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR,
      CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
      CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
    ],
    explainedByStrategies: [CLAUDE_HOOKS_ADDITIVE_STRATEGY],
  },
  /**
   * The settings recognition of the same two files rests on the same two
   * project settings lookups — what it publishes is the documents those
   * lookups locate — and is explained by the same precedence strategy, which
   * owns the scope order and the array merge the rule deliberately does not
   * project (FR-009). The edges match the permission rule's because both
   * recognitions come from one pair of documented locations; what differs is
   * the subject each row names, which is not an edge.
   */
  [CLAUDE_REPO_SETTINGS_RULE.ruleId]: {
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
  /**
   * The Repository output-style rule is based on the Repository lookup alone —
   * the User layer is a different Source boundary this rule may not read — and
   * is explained by the selection strategy that composes both.
   */
  [CLAUDE_REPO_OUTPUT_STYLE_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR],
    explainedByStrategies: [CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY],
  },
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
  /**
   * The skills-directory plugin rule is based on the placement behavior alone —
   * the explicitly selected plugin root beside it is what installation and
   * registration establish, which this path deliberately needs none of — and is
   * explained by the activation strategy, which is where the trust dialog and
   * the per-component restrictions live.
   */
  [CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR],
    explainedByStrategies: [CLAUDE_PLUGINS_ACTIVATION_STRATEGY],
  },
  /**
   * The catalog rule is based on the marketplace lookup, and on the plugin
   * behavior its entries reach: an entry names a plugin root, and what a root
   * carries is that behavior's. The activation strategy explains what a session
   * still needs before either is live.
   */
  [CLAUDE_REPO_MARKETPLACE_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_MARKETPLACE_BEHAVIOR, CLAUDE_REPO_PLUGIN_BEHAVIOR],
    explainedByStrategies: [CLAUDE_PLUGINS_ACTIVATION_STRATEGY],
  },
  /**
   * The exclusion cites the two behaviors whose files it is the scope statement
   * for — what a manifest declares and what a catalog entry reaches — and citing
   * behavior it deliberately does not authorize is what an exclusion is for. The
   * activation strategy explains it, because what those components are to a
   * running session is that strategy's.
   */
  [CLAUDE_EXCLUDED_PLUGIN_FILES_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_REPO_MARKETPLACE_BEHAVIOR, CLAUDE_REPO_PLUGIN_BEHAVIOR],
    explainedByStrategies: [CLAUDE_PLUGINS_ACTIVATION_STRATEGY],
  },
  /**
   * The Global instruction rule is based on the User instruction file alone —
   * the Repository chain is a different Source boundary this rule may not
   * read — and is explained by the layering strategy, which is where the
   * additive load order of the documented scopes lives.
   */
  [CLAUDE_GLOBAL_INSTRUCTIONS_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_INSTRUCTIONS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * Each widened Global rule is based on the one User behavior it accepts and
   * explained by the same strategy its Repository sibling is: the vendor
   * composes the user layer and the project layers by one documented rule,
   * so the strategy that explains one scope explains the other
   * (contracts/vendors/claude-code.md § Global accepted matcher).
   */
  [CLAUDE_GLOBAL_RULES_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_RULES_BEHAVIOR],
    explainedByStrategies: [CLAUDE_RULES_LAYERING_STRATEGY],
  },
  [CLAUDE_GLOBAL_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_SKILLS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_SKILLS_SELECTION_STRATEGY],
  },
  [CLAUDE_GLOBAL_COMMAND_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_COMMANDS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_COMMANDS_SELECTION_STRATEGY],
  },
  [CLAUDE_GLOBAL_AGENT_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_AGENTS_BEHAVIOR],
    explainedByStrategies: [
      CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY,
      CLAUDE_AGENTS_SELECTION_STRATEGY,
    ],
  },
  [CLAUDE_GLOBAL_SETTINGS_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY],
  },
  [CLAUDE_GLOBAL_PERMISSIONS_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY],
  },
  /**
   * The contained-hooks rule rests on the settings behavior alone, because
   * that is the behavior whose file carries the declaration
   * (contracts/vendors/claude-code.md § Global accepted matcher); the additive
   * strategy explains how the user layer's hooks compose with the others.
   */
  [CLAUDE_GLOBAL_SETTINGS_HOOKS_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_SETTINGS_BEHAVIOR],
    explainedByStrategies: [CLAUDE_HOOKS_ADDITIVE_STRATEGY],
  },
  [CLAUDE_GLOBAL_OUTPUT_STYLE_RULE.ruleId]: {
    basedOnBehaviors: [CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR],
    explainedByStrategies: [CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY],
  },
  /**
   * The User exclusion is based on every Claude User surface it declines to
   * authorize. The instruction file is deliberately absent: that one surface is
   * what `claude.global.instructions` admits, and an exclusion naming it would
   * contradict the rule beside it.
   *
   * It is explained by no strategy. A strategy says how a runtime composes what
   * it found; an exclusion says this product never looks, so there is no
   * composition for one to describe.
   */
  [CLAUDE_EXCLUDED_USER_RUNTIME_RULE.ruleId]: {
    basedOnBehaviors: [
      CLAUDE_USER_AGENT_MEMORY_BEHAVIOR,
      CLAUDE_USER_AUTO_MEMORY_BEHAVIOR,
      CLAUDE_USER_KEYBINDINGS_BEHAVIOR,
      CLAUDE_USER_MCP_STATE_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
      CLAUDE_USER_THEMES_BEHAVIOR,
      CLAUDE_USER_WORKFLOWS_BEHAVIOR,
    ],
    explainedByStrategies: [],
  },
};
