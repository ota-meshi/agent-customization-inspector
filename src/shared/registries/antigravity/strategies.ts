// Antigravity CLI composition strategies — the implementation counterpart of
// the Antigravity CLI rows in contracts/runtime-composition.md.
//
// A strategy explains a documented runtime edge; it never creates one. It
// cannot enumerate a directory, open a relationship target, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging"). It records what a vendor documents about combining its own
// inputs; it states nothing about what a concrete session selected, because
// that depends on runtime this tool never observes.
//
// Each strategy is its own `export const` so a relation can name it directly,
// declared with `satisfies` so the keyed map's computed keys keep resolving
// (see `codex/strategies.ts` for why an annotation would break that).
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { AntigravityStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Antigravity CLI context layering: the context files of every level — the
 * global ones, and each workspace directory's from the root down to the folder
 * of the file being worked on — are combined into one context rather than
 * replacing each other (`concatenate`), and where two conflict the more
 * specific directory's takes priority (`select-closest`).
 */
export const ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY = {
  strategyId: 'antigravity.context.layering',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['concatenate', 'select-closest'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Where rules are stored', 'Directory-scoped rules', 'Global rules'],
          reviewedOn: '2026-09-24',
          establishes:
            'Rules are cumulative rather than replacement-based: the global, workspace, and directory-scoped files — AGENTS.md and GEMINI.md among them — are combined into the prompt, and when instructions conflict the more specific directory’s take priority.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent parses and enforces the rule constraints defined in the active directory’s GEMINI.md and AGENTS.md files, and automatically consults the global constraints at ~/.gemini/GEMINI.md.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI skill selection: a workspace skill and a global skill are
 * both available in a workspace, and the first match answers a slash command
 * (`select-first`).
 *
 * `unknown` resolution: the pages state both locations and that a global skill
 * is available in every workspace, without stating what happens when a
 * workspace skill and a global skill declare one name
 * (§ Known uncertainties item 2). The Inspector states no resolution it
 * cannot cite.
 */
export const ANTIGRAVITY_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'antigravity.skills.selection',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['unknown-order'],
  documentationStatus: 'unknown',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: [
            'How the agent uses skills',
            'CLI skill locations',
            'Slash command conversion',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The terminal loads workspace skill folders below .agents/skills/, global ones below ~/.gemini/antigravity-cli/skills/, and the skills an installed plugin provides, and turns every skill into a slash command; the agent is shown every available skill with its name and description and reads the full instructions of whichever looks relevant, and no order between the scopes is stated.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI custom-agent selection: workspace and global agents are both
 * discovered automatically, and which one answers a name the pages do not say
 * (`unknown-order`).
 */
export const ANTIGRAVITY_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'antigravity.agents.selection',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['unknown-order'],
  documentationStatus: 'unknown',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI automatically discovers custom agents defined in Markdown with YAML frontmatter at .agents/agents/<name>.md or .agents/agents/<name>/agent.md in the workspace and in ~/.gemini/config/agents/ globally.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI MCP configuration: the workspace and global profiles each
 * hold a `mcpServers` map, and the servers a session reaches come from both
 * (`merge-map`).
 *
 * `partially-documented`: both paths and the server schema are exact, and how
 * a workspace server and a global server of one name compose is not stated
 * (§ Known uncertainties item 3).
 */
export const ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY = {
  strategyId: 'antigravity.mcp.configuration',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['merge-map'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-mcp',
          url: 'https://antigravity.google/docs/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs', 'MCP Configuration Structure'],
          reviewedOn: '2026-09-24',
          establishes:
            'Antigravity CLI separates MCP definitions into a global ~/.gemini/config/mcp_config.json and a workspace .agents/mcp_config.json, each a single mcpServers object mapping a server name to its configuration.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI hook merging: hooks reach a session from the workspace and
 * global `hooks.json` files, the user settings file, and a plugin's own
 * `hooks.json`, so the loaded set is those appended (`append`).
 *
 * `partially-documented`: the Hooks page states every place the terminal
 * defines hooks, gives no schema for the settings-file form, and states no
 * order among them (§ Known uncertainties items 4 and 8).
 */
export const ANTIGRAVITY_HOOKS_MERGE_STRATEGY = {
  strategyId: 'antigravity.hooks.merge',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['append'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'Hooks intercept agent actions before or after execution and can be defined in any of the workspace .agents/hooks.json, the global ~/.gemini/config/hooks.json or the primary ~/.gemini/antigravity-cli/settings.json file, and an installed plugin’s hooks.json.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI permission precedence: the three lists are evaluated in a
 * documented order, and the first list to match decides (`select-first`).
 * Conflicting rules resolve deny, then ask, then allow.
 */
export const ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY = {
  strategyId: 'antigravity.permissions.precedence',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-permissions',
          url: 'https://antigravity.google/docs/permissions/',
          officialHost: 'antigravity.google',
          sections: ['CLI fine-grained permissions'],
          reviewedOn: '2026-09-24',
          establishes:
            'Permissions are evaluated across the deny, ask, and allow lists configured in ~/.gemini/antigravity-cli/settings.json, and conflicting rules are strictly evaluated in the priority order deny, then ask, then allow.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI rule activation: a rule's declared trigger narrows the set
 * of files or turns it reaches (`filter`), the rules of every level that pass
 * are combined rather than replacing each other (`concatenate`), and where two
 * conflict the more specific directory's takes priority (`select-closest`).
 *
 * `partially-documented`: the Rules page states the four triggers, the
 * cumulation, and the directory priority, and states no order among the rules
 * of one directory (contracts/vendors/antigravity-cli.md § Known uncertainties
 * item 10).
 */
export const ANTIGRAVITY_RULES_ACTIVATION_STRATEGY = {
  strategyId: 'antigravity.rules.activation',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['filter', 'concatenate', 'select-closest'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: [
            'Where rules are stored',
            'YAML frontmatter and activation modes',
            'Activation modes',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'Every Markdown file in a rules directory declares a trigger: manual for an explicit at-mention, always_on for every turn, model_decision for the agent to read the rule when the task matches its description, or glob to activate when the agent works on a file matching the declared patterns, and a missing or unrecognized trigger discards the rule. Rules are cumulative, and the more specific directory rule takes priority when two conflict.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Antigravity CLI's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const ANTIGRAVITY_COMPOSITION_STRATEGIES: Readonly<
  Record<AntigravityStrategyId, RuntimeCompositionStrategy>
> = {
  [ANTIGRAVITY_AGENTS_SELECTION_STRATEGY.strategyId]: ANTIGRAVITY_AGENTS_SELECTION_STRATEGY,
  [ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY.strategyId]: ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY,
  [ANTIGRAVITY_HOOKS_MERGE_STRATEGY.strategyId]: ANTIGRAVITY_HOOKS_MERGE_STRATEGY,
  [ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY.strategyId]: ANTIGRAVITY_MCP_CONFIGURATION_STRATEGY,
  [ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY.strategyId]:
    ANTIGRAVITY_PERMISSIONS_PRECEDENCE_STRATEGY,
  [ANTIGRAVITY_RULES_ACTIVATION_STRATEGY.strategyId]: ANTIGRAVITY_RULES_ACTIVATION_STRATEGY,
  [ANTIGRAVITY_SKILLS_SELECTION_STRATEGY.strategyId]: ANTIGRAVITY_SKILLS_SELECTION_STRATEGY,
};
