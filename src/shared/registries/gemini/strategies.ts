// Gemini CLI composition strategies — the implementation counterpart of the
// Gemini CLI rows in contracts/runtime-composition.md.
//
// A strategy explains a documented runtime edge; it never creates one. It
// cannot enumerate a directory, open a relationship target, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging"). It records what a vendor documents about combining its own
// inputs; it states nothing about what a concrete session selected, because
// that depends on runtime this tool never observes — for Gemini CLI, above all
// on whether the folder is trusted.
//
// Each strategy is its own `export const` so a relation can name it directly,
// declared with `satisfies` so the keyed map's computed keys keep resolving
// (see `codex/strategies.ts` for why an annotation would break that).
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { GeminiStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Gemini CLI context layering: folder trust decides whether the workspace
 * files load at all (`filter`), and the files that do load are concatenated
 * in the documented order — the global file, then the workspace directories
 * and their parents, then the just-in-time files — into one context
 * (`concatenate`).
 *
 * `partially-documented` for the reason `gemini.behavior.repo.context` is:
 * the parent-walk boundary and pre-access descendant reads are not stated.
 * The configured filename is not an operation here: `context.fileName`
 * decides which files are candidates, which the derivation reads, and the
 * concatenation is the same whatever they are named.
 */
export const GEMINI_CONTEXT_LAYERING_STRATEGY = {
  strategyId: 'gemini.context.layering',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['filter', 'concatenate'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.gemini-md',
          url: 'https://geminicli.com/docs/cli/gemini-md/',
          officialHost: 'geminicli.com',
          sections: ['Understand the context hierarchy'],
          reviewedOn: '2026-09-09',
          establishes:
            'The CLI concatenates the contents of every context file it finds — global, workspace and parent, and just-in-time — and sends them with every prompt, loading them in that order.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes:
            'Automatic memory loading is disabled in an untrusted workspace, so trust filters which context files a session loads.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI settings precedence: the layers — defaults, system defaults,
 * user, project, system, environment, command line — merge by key
 * (`merge-map`), and a higher layer's value replaces a lower one's
 * (`replace`). The project layer applies only in a trusted folder, which
 * stays a condition rather than an operation here because trust removes a
 * layer rather than reordering the rest.
 */
export const GEMINI_SETTINGS_PRECEDENCE_STRATEGY = {
  strategyId: 'gemini.settings.precedence',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['merge-map', 'replace'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Configuration layers', 'Settings files'],
          reviewedOn: '2026-09-09',
          establishes:
            'Configuration is applied in layers from lowest to highest precedence — default values, the system defaults file, the user settings file, the project settings file, the system settings file, environment variables, and command-line arguments — with workspace settings overriding user settings for the same key.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI MCP configuration: the `mcpServers` maps of the settings layers
 * and installed extensions merge by server name (`merge-map`), and
 * `mcp.allowed`, `mcp.excluded`, and folder trust decide which of the merged
 * servers connect (`filter`). No order among same-name declarations is
 * recorded beyond the settings precedence, which the settings strategy owns.
 */
export const GEMINI_MCP_CONFIGURATION_STRATEGY = {
  strategyId: 'gemini.mcp.configuration',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['merge-map', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.mcp-server',
          url: 'https://geminicli.com/docs/tools/mcp-server/',
          officialHost: 'geminicli.com',
          sections: ['Configuration structure', 'Server-specific configuration (mcpServers)'],
          reviewedOn: '2026-09-09',
          establishes:
            'Servers are declared by name in the mcpServers object, at user or project scope, and the global mcp settings allow or exclude servers by name; an extension may declare servers of its own, which a user configuration can override.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes: 'Project-specific MCP servers do not connect in an untrusted workspace.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI hook merging: every layer's hooks run — a closer layer adds to
 * the broader ones (`append`) — while trust and the project-hook fingerprint
 * decide which run at all (`filter`).
 */
export const GEMINI_HOOKS_MERGE_STRATEGY = {
  strategyId: 'gemini.hooks.merge',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['append', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.hooks',
          url: 'https://geminicli.com/docs/hooks/',
          officialHost: 'geminicli.com',
          sections: ['Configuration', 'Security and risks'],
          reviewedOn: '2026-09-09',
          establishes:
            'Hooks are merged from the project, user, system, and extension layers in that precedence, and a project hook whose fingerprint changed is treated as new and untrusted and warns before it runs.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI custom-command selection: when a project command and a user
 * command share a name, the project command is always used (`select-first`
 * in the documented project-then-user order).
 */
export const GEMINI_COMMANDS_SELECTION_STRATEGY = {
  strategyId: 'gemini.commands.selection',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.custom-commands',
          url: 'https://geminicli.com/docs/cli/custom-commands/',
          officialHost: 'geminicli.com',
          sections: ['File locations and precedence'],
          reviewedOn: '2026-09-09',
          establishes:
            'Commands are discovered from the user directory and then the project directory, and a project command with the same name as a user command is always used.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI skill selection: the same-name skill from the higher-precedence
 * tier is used, and within one tier the `.agents/skills/` alias wins over
 * the `.gemini/skills/` directory (`select-first` in that documented order);
 * folder trust decides whether the workspace tier is available at all
 * (`filter`).
 *
 * This is the pipeline the same-name statement on a Gemini CLI skill row is
 * derived from (`skill-resolution.ts`): a documented first-in-order winner.
 */
export const GEMINI_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'gemini.skills.selection',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['select-first', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.skills',
          url: 'https://geminicli.com/docs/cli/skills/',
          officialHost: 'geminicli.com',
          sections: ['Discovery tiers', 'Precedence and aliases'],
          reviewedOn: '2026-09-09',
          establishes:
            'When multiple skills share a name the version from the higher-precedence location is used, the tiers ranking built-in, extension, user, workspace from lowest to highest; within the user or workspace tier the .agents/skills/ alias takes precedence over the .gemini/skills/ directory.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes: 'Local agent skills are unavailable in an untrusted workspace.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI sub-agent selection: the page names the project and user
 * locations and says nothing about a same-name agent at both, so the only
 * operation recorded is that the order is unestablished (`unknown-order`).
 * `unknown` because the cited sections establish no determination for a
 * clash; `experimental` because the whole feature sits under that setting.
 */
export const GEMINI_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'gemini.agents.selection',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['unknown-order'],
  documentationStatus: 'unknown',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.subagents',
          url: 'https://geminicli.com/docs/core/subagents/',
          officialHost: 'geminicli.com',
          sections: ['Agent definition files', 'Disabling subagents'],
          reviewedOn: '2026-09-09',
          establishes:
            'Agents may be placed at the project level and at the user level; the page names both locations and establishes nothing about which wins when both declare one name, and the feature is toggled by an experimental setting.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Gemini CLI policy tiers: a rule from a higher tier base always wins, and
 * within a tier the higher `priority` wins (`select-first` in that documented
 * order). The workspace tier is documented as not loaded, which is a fact
 * about a location rather than an operation of this pipeline.
 */
export const GEMINI_POLICIES_TIERS_STRATEGY = {
  strategyId: 'gemini.policies.tiers',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  operations: ['select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.policy-engine',
          url: 'https://geminicli.com/docs/reference/policy-engine/',
          officialHost: 'geminicli.com',
          sections: ['Priority system and tiers', 'Policy locations'],
          reviewedOn: '2026-09-09',
          establishes:
            'A rule’s final priority is its tier base plus its own priority scaled below one, so a higher tier always wins and, within a tier, a higher priority value wins; the tiers rank default, extension, workspace, user, admin, with the workspace tier currently non-functional.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Gemini CLI's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const GEMINI_COMPOSITION_STRATEGIES: Readonly<
  Record<GeminiStrategyId, RuntimeCompositionStrategy>
> = {
  [GEMINI_AGENTS_SELECTION_STRATEGY.strategyId]: GEMINI_AGENTS_SELECTION_STRATEGY,
  [GEMINI_COMMANDS_SELECTION_STRATEGY.strategyId]: GEMINI_COMMANDS_SELECTION_STRATEGY,
  [GEMINI_CONTEXT_LAYERING_STRATEGY.strategyId]: GEMINI_CONTEXT_LAYERING_STRATEGY,
  [GEMINI_HOOKS_MERGE_STRATEGY.strategyId]: GEMINI_HOOKS_MERGE_STRATEGY,
  [GEMINI_MCP_CONFIGURATION_STRATEGY.strategyId]: GEMINI_MCP_CONFIGURATION_STRATEGY,
  [GEMINI_POLICIES_TIERS_STRATEGY.strategyId]: GEMINI_POLICIES_TIERS_STRATEGY,
  [GEMINI_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: GEMINI_SETTINGS_PRECEDENCE_STRATEGY,
  [GEMINI_SKILLS_SELECTION_STRATEGY.strategyId]: GEMINI_SKILLS_SELECTION_STRATEGY,
};
