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
 * Antigravity CLI context layering: the workspace context files and the global
 * one are parsed together and reach the agent as one context
 * (`concatenate`).
 *
 * `partially-documented`: the migration page names the workspace files as the
 * ones in the active directory and the global one by its exact path, and says
 * nothing about the order they compose in or about a depth below the
 * workspace root (contracts/vendors/antigravity-cli.md § Known uncertainties
 * item 1). What is not stated is not invented here.
 */
export const ANTIGRAVITY_CONTEXT_LAYERING_STRATEGY = {
  strategyId: 'antigravity.context.layering',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['concatenate'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
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
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Creating local workspace skills', 'Sharing global skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'A workspace skill placed in .agents/skills/ is compiled into a slash command when the CLI runs in that directory, and any markdown skill in ~/.gemini/antigravity-cli/skills/ is imported as a global slash command in any directory.',
        },
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['Where skills live', 'How the agent uses skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'Workspace-specific and global skills are both available, the agent is shown every available skill with its name and description and reads the full instructions of whichever looks relevant, and no order between the two scopes is stated.',
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs', 'MCP Configuration Structure'],
          reviewedOn: '2026-09-10',
          establishes:
            'Antigravity CLI separates MCP definitions into a global ~/.gemini/config/mcp_config.json and a workspace .agents/mcp_config.json, each a single mcpServers object mapping a server name to its configuration.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI hook merging: hooks reach a session from a plugin's own
 * `hooks.json` and from the user settings file, so the loaded set is the two
 * appended (`append`).
 *
 * `partially-documented`: the page states the two places hooks are configured
 * and gives no schema for the settings-file form
 * (§ Known uncertainties item 4).
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
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks intercept agent actions before or after execution and are defined inside a plugin’s hooks.json or configured inside the primary settings.json file.',
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
          url: 'https://antigravity.google/docs/cli/permissions/',
          officialHost: 'antigravity.google',
          sections: ['Fine-grained permissions'],
          reviewedOn: '2026-09-10',
          establishes:
            'Permissions are evaluated across the deny, ask, and allow lists configured in ~/.gemini/antigravity-cli/settings.json, and conflicting rules are strictly evaluated in the priority order deny, then ask, then allow.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Antigravity CLI rule activation: a workspace rule narrows the set of files
 * or turns it reaches (`filter`).
 *
 * `partially-documented`: the Rules page states the four activation modes —
 * manual, always on, model decision, and a glob the rule declares — each of
 * which decides *whether* a rule applies rather than *when* it composes with
 * another. No page states the order two rules compose in, nor their precedence
 * against the context files, so no ordering operation is recorded
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 10).
 */
export const ANTIGRAVITY_RULES_ACTIVATION_STRATEGY = {
  strategyId: 'antigravity.rules.activation',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  operations: ['filter'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules-workflows/',
          officialHost: 'antigravity.google',
          sections: ['Rules', 'Workspace Rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'A rule declares how it is activated: manually by an at-mention, always on, by the model deciding from a natural-language description, or by a glob pattern that applies the rule to every file the pattern matches.',
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
