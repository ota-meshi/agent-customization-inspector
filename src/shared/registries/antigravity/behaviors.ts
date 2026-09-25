// Antigravity CLI behavior statements — the implementation counterpart of
// contracts/vendors/antigravity-cli.md § Documented Repository behavior and
// § Documented User behavior.
//
// A statement says where Antigravity CLI documents looking for a
// customization. It is not a filesystem matcher and can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"); read authority lives only in the inspection-rule
// registry.
//
// This contract covers the vendor's terminal client and nothing else. The
// vendor also documents a desktop application and editor extensions, which
// read customizations of their own, and no record below describes them: what
// differs here is the tier — a workspace tier under the selected root and a
// user tier below `~/.gemini` — and a tier is a lookup base, never a surface
// (contracts/vendors/antigravity-cli.md § Surface boundary).
//
// Each statement is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union and the computed key would stop
// resolving to a property, which breaks the map's completeness check;
// `satisfies` keeps the literal, so the key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { AntigravityBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Antigravity CLI workspace context: the `GEMINI.md` and `AGENTS.md` of every
 * directory from the folder of a file the terminal reads or edits up to the
 * workspace root, each directory's `.agents/` spelling included, parsed and
 * enforced alongside the global context files.
 */
export const ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.context',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'target-path-chain',
        relativeSelector: 'GEMINI.md; AGENTS.md; .agents/GEMINI.md; .agents/AGENTS.md',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: [
            'Directory-scoped rules',
            'YAML frontmatter and activation modes',
            'Managing rules in Antigravity CLI',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI evaluates AGENTS.md and GEMINI.md at the repository root and in subdirectories: whenever it reads or edits a file it walks up from that file’s folder to the workspace root, loading <dir>/AGENTS.md or <dir>/GEMINI.md and <dir>/.agents/AGENTS.md or <dir>/.agents/GEMINI.md at each level; neither file uses frontmatter — the terminal treats its entire content as plain Markdown — and each is always active for its directory scope.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'Both CLI platforms use identical workspace context rules: the agent parses and enforces the rule constraints defined inside the active directory GEMINI.md and AGENTS.md files, and automatically consults the global constraints at ~/.gemini/GEMINI.md.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace skills: skill folders holding a `SKILL.md` below
 * `.agents/skills/`, with `.agent/skills` still supported, named by their
 * frontmatter and compiled into slash commands when the CLI runs in that
 * directory. What happens when a workspace and a global skill declare one name
 * is not stated (§ Known uncertainties item 2).
 */
export const ANTIGRAVITY_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.skills',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/skills/<name>/SKILL.md, .agent/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Updated skills paths'],
          reviewedOn: '2026-09-10',
          establishes:
            'The workspace project path for skills moved from .gemini/skills/ to .agents/skills/, while the global shared path moved to ~/.gemini/antigravity-cli/skills/.',
        },
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: [
            'What are skills?',
            'Anatomy of a skill',
            'Frontmatter fields',
            'CLI skill locations',
            'Slash command conversion',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'A skill is a folder containing a SKILL.md file, the only required file beside optional scripts, examples, and resources; the terminal’s workspace skills live at <workspace-root>/.agents/skills/<skill-folder>/, .agents/skills is the default with backward compatibility for .agent/skills, the frontmatter requires a description and defaults name to the folder name, and the CLI turns every skill into a slash command.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace rules: one Markdown file per rule directly below
 * the `.agents/rules/` of every directory from the folder of a file the
 * terminal reads or edits up to the workspace root, with `.agent/rules/` still
 * supported as the earlier spelling.
 *
 * The shared Rules page gives the terminal's rule locations, the four
 * triggers, the per-file size limit, and that rules are cumulative with the
 * more specific directory rule taking priority in a conflict; the order the
 * rules of one directory compose in is the composition strategy's to leave
 * open (contracts/vendors/antigravity-cli.md § Known uncertainties item 10).
 */
export const ANTIGRAVITY_REPO_RULES_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.rules',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'target-path-chain',
        relativeSelector: '.agents/rules/<name>.md, .agent/rules/<name>.md',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: [
            'Where rules are stored',
            'Directory-scoped rules',
            'Global rules',
            'Activation modes',
            'Size limits and token budgets',
            'Managing rules in Antigravity CLI',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI evaluates AGENTS.md, GEMINI.md, and .agents/rules/*.md at the repository root and in subdirectories, walking up from the folder of a file it reads or edits to the workspace root, with the legacy .agent/rules/*.md still loaded and only a rules directory’s immediate .md children scanned; its global rules are ~/.gemini/AGENTS.md, ~/.gemini/GEMINI.md, ~/.gemini/config/rules/*.md, and ~/.gemini/antigravity-cli/rules/*.md. Each file in a rules directory declares a trigger — always_on, model_decision, glob, or manual — a rule file over 24,000 bytes is truncated, and rules are cumulative, with the more specific directory rule taking priority when two conflict.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['First-launch onboarding'],
          reviewedOn: '2026-09-10',
          establishes:
            'Support for workspace skills, rules, and MCP servers is preserved across the migration to Antigravity CLI.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace hook declarations: the standalone
 * `.agents/hooks.json`.
 *
 * The shared Hooks page names this file as the terminal's workspace hook
 * location and gives its schema exactly
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 8).
 */
export const ANTIGRAVITY_REPO_HOOKS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.hooks',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/hooks.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: [
            'Managing hooks in Antigravity CLI',
            'Schema and File Format',
            'Hook Definition Fields',
            'Hook Handler Configuration',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI defines workspace hooks in .agents/hooks.json at the project root, and that file maps a hook name to its event configurations — the tool events holding matcher groups, the others a list of handlers directly — whose handlers carry a command and an optional timeout, with an optional per-hook enabled flag.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace custom agents: Markdown with YAML frontmatter, in
 * either of the two documented shapes, discovered automatically. An agent whose
 * frontmatter sets `subagent: true` can be invoked by the primary agent, which
 * is runtime this product records rather than projects.
 */
export const ANTIGRAVITY_REPO_AGENTS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.agents',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/agents/<name>.md; .agents/agents/<name>/agent.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
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
            'The CLI automatically discovers custom agents defined in Markdown format with YAML frontmatter: workspace agents at .agents/agents/<name>.md or .agents/agents/<name>/agent.md, and global agents in ~/.gemini/config/agents/; an agent with subagent: true set in its frontmatter can be invoked by the primary agent.',
        },
        {
          sourceId: 'google.antigravity.subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Agent Location and Discovery', 'Frontmatter Configuration (YAML)'],
          reviewedOn: '2026-09-11',
          establishes:
            'Custom subagents are discovered at .agents/agents/<name>.md or <name>/agent.md in the workspace and at the same two spellings below ~/.gemini/config/agents/, and the frontmatter table marks name — the unique identifier for the custom agent — as required, which is why a file declaring none has no name this vendor resolves rather than one taken from its path.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace MCP servers: a standalone JSON profile whose
 * top-level `mcpServers` object maps a server name to its configuration. A
 * remote server declares `serverUrl`; the legacy `url` and `httpUrl` keys are
 * documented as unsupported, which is a claim about the vendor's reading and
 * not something this product checks.
 *
 * `partially-documented`: how a workspace server and a global server of one
 * name compose is not stated (§ Known uncertainties item 3).
 */
export const ANTIGRAVITY_REPO_MCP_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.mcp',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/mcp_config.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-mcp',
          url: 'https://antigravity.google/docs/mcp/',
          officialHost: 'antigravity.google',
          sections: [
            'Global and Workspace Server Configs',
            'MCP Configuration Structure',
            'MCP Configuration Properties',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'Antigravity CLI separates MCP definitions into dedicated configurations — global setups in ~/.gemini/config/mcp_config.json and workspace local setups in .agents/mcp_config.json — each a single mcpServers object whose entries declare command or serverUrl with optional args, env, cwd, and headers.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Directory mapping', 'Required schema updates'],
          reviewedOn: '2026-09-10',
          establishes:
            'Servers were declared inline within ~/.gemini/settings.json and are now defined in a standalone mcp_config.json profile; when migrating remote definitions the URI key must be updated from the legacy url or httpUrl to serverUrl.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Antigravity CLI user tier: the `~/.gemini` directory, which holds the
 * global context file, the shared `config/` directory, and the terminal's own
 * `antigravity-cli/` directory. Every cited page writes the path literally, and
 * none documents a setting that relocates it, so this product derives none
 * (spec.md FR-008).
 */
export const ANTIGRAVITY_USER_HOME_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.home',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-settings',
          url: 'https://antigravity.google/docs/settings/',
          officialHost: 'antigravity.google',
          sections: ['Configuration file location'],
          reviewedOn: '2026-09-24',
          establishes:
            'Antigravity CLI stores user preferences in a plain JSON configuration profile at ~/.gemini/antigravity-cli/settings.json.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent automatically consults and enforces the global constraints located at ~/.gemini/GEMINI.md.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global developer context: the standalone `GEMINI.md` and
 * `AGENTS.md` of the user tier and of its `config/`, always active and
 * consulted alongside the workspace context files.
 */
export const ANTIGRAVITY_USER_CONTEXT_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.context',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'GEMINI.md; AGENTS.md; config/GEMINI.md; config/AGENTS.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Global rules', 'Managing rules in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'The standalone global files ~/.gemini/AGENTS.md, ~/.gemini/GEMINI.md, ~/.gemini/config/AGENTS.md, and ~/.gemini/config/GEMINI.md apply across all projects, need no frontmatter, and are always active, and the CLI section names the first two among its global rules.',
        },
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent automatically consults and enforces the global developer constraints located at ~/.gemini/GEMINI.md.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global modular rules: one Markdown file per rule directly
 * below the user tier's `config/rules/` or the terminal's own
 * `antigravity-cli/rules/`, each activated as its frontmatter declares.
 */
export const ANTIGRAVITY_USER_RULES_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.rules',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'config/rules/<name>.md, antigravity-cli/rules/<name>.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Global rules', 'Activation modes', 'Managing rules in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'Modular global rules live in ~/.gemini/config/rules/*.md and need YAML frontmatter declaring a trigger, the CLI also evaluates ~/.gemini/antigravity-cli/rules/*.md, and only a rules directory’s immediate .md children are scanned.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global MCP servers: the `mcpServers` object of the user
 * tier's shared `config/mcp_config.json`, available in every workspace.
 */
export const ANTIGRAVITY_USER_MCP_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.mcp',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'config/mcp_config.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-mcp',
          url: 'https://antigravity.google/docs/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-24',
          establishes:
            'Global MCP server setups are configured in ~/.gemini/config/mcp_config.json, and workspace local setups in the active project under .agents/mcp_config.json.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global custom agents: Markdown agent definitions below the
 * user tier's shared `config/agents/` directory, discovered in every
 * workspace.
 */
export const ANTIGRAVITY_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.agents',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'config/agents/',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-24',
          establishes: 'Global custom agents are discovered in ~/.gemini/config/agents/.',
        },
        {
          sourceId: 'google.antigravity.subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Agent Location and Discovery', 'Frontmatter Configuration (YAML)'],
          reviewedOn: '2026-09-11',
          establishes:
            'Custom subagents are discovered at .agents/agents/<name>.md or <name>/agent.md in the workspace and at the same two spellings below ~/.gemini/config/agents/, and the frontmatter table marks name — the unique identifier for the custom agent — as required, which is why a file declaring none has no name this vendor resolves rather than one taken from its path.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global shared skills, imported as slash commands whenever
 * the CLI launches in any directory: a skill folder's `SKILL.md` below the
 * user tier's `antigravity-cli/skills/` or its `config/skills/`.
 *
 * `partially-documented`: the shared Agent Skills page gives the terminal's
 * global skills as folders below `antigravity-cli/skills/`, and gives
 * `config/skills/` to the desktop application and the editor extensions
 * rather than to the terminal, which walks it all the same (observed against
 * `agy` 1.2.0; § Known uncertainties item 6).
 */
export const ANTIGRAVITY_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.skills',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'antigravity-cli/skills/<name>/SKILL.md, config/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: [
            'CLI skill locations',
            'Slash command conversion',
            'Antigravity 2.0 skill locations',
            'Antigravity IDE skill locations',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI skill locations table gives the terminal’s global skills, available in all workspaces, as skill folders at ~/.gemini/antigravity-cli/skills/<skill-folder>/ beside plugin-provided skills, and the CLI turns every skill into a slash command; ~/.gemini/config/skills/<skill-folder>/ is the global location the page gives Antigravity 2.0 and the standalone IDE.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI user preferences: a sparse JSON profile that persists only
 * the values differing from the defaults. It is the one carrier three Global
 * rules admit — settings, permissions, hooks — the arrangement
 * `.claude/settings.json` and `.codex/config.toml` already have.
 */
export const ANTIGRAVITY_USER_SETTINGS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.settings',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'antigravity-cli/settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-settings',
          url: 'https://antigravity.google/docs/settings/',
          officialHost: 'antigravity.google',
          sections: ['Setting up preferences', 'Configuration file location'],
          reviewedOn: '2026-09-24',
          establishes:
            'The persistent settings are saved in plain JSON at ~/.gemini/antigravity-cli/settings.json, written sparsely so that only values differing from their defaults reach disk.',
        },
        {
          sourceId: 'google.antigravity.cli-features',
          url: 'https://antigravity.google/docs/cli/features/',
          officialHost: 'antigravity.google',
          sections: ['Advanced Customization via settings.json'],
          reviewedOn: '2026-09-10',
          establishes:
            'The settings.json file at ~/.gemini/antigravity-cli/settings.json carries the CLI customizations, including the terminal sandbox toggle.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI permission lists: the `allow`, `ask`, and `deny` entries the
 * user settings file declares, each an `action(target)` resource. Conflicting
 * rules resolve deny, then ask, then allow.
 *
 * Recording the documented precedence grants no authority: this product
 * evaluates no rule against a path or a command (FR-011).
 */
export const ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.permissions',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'allow, ask, and deny in antigravity-cli/settings.json',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-permissions',
          url: 'https://antigravity.google/docs/permissions/',
          officialHost: 'antigravity.google',
          sections: ['CLI fine-grained permissions', 'Supported CLI actions and matching rules'],
          reviewedOn: '2026-09-24',
          establishes:
            'Every sensitive operation is a permission resource formatted as action(target), evaluated across the deny, ask, and allow lists configured inside the global settings at ~/.gemini/antigravity-cli/settings.json, with conflicting rules resolved in the order deny, then ask, then allow.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI user-tier hook declarations: the standalone
 * `config/hooks.json`, the user settings file, and a plugin's own
 * `hooks.json`. The plugin form leaves with the installed copies it belongs
 * to; the other two are what this product publishes.
 *
 * `partially-documented`: the Hooks page names every place the terminal
 * defines hooks and gives the standalone file's schema, but none for the
 * settings-file form (§ Known uncertainties item 4). Recording the fact grants
 * no execution authority: inspection runs no declared command (FR-011).
 */
export const ANTIGRAVITY_USER_HOOKS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.hooks',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'config/hooks.json, hooks in antigravity-cli/settings.json',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: [
            'Managing hooks in Antigravity CLI',
            'Schema and File Format',
            'Common Input Fields',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI defines hooks in the workspace .agents/hooks.json, globally in ~/.gemini/config/hooks.json or inside the primary ~/.gemini/antigravity-cli/settings.json file, and inside an installed plugin’s hooks.json; the page gives the standalone file’s schema and none for the settings-file form, and the transcript a hook receives lives under ~/.gemini/antigravity-cli for the CLI.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI installed plugin copies: namespaced bundles the CLI stages
 * below the user tier's `antigravity-cli/plugins/`, each with a `plugin.json`
 * marker and optionally its own MCP servers, hooks, skills, agents, and rules,
 * beside the `import_manifest.json` that tracks them.
 *
 * Excluded rather than inspected: an installed copy is reproduced from its
 * source rather than authored, which is what the parent specification's FR-018
 * already excludes for every vendor (FR-010).
 */
export const ANTIGRAVITY_USER_PLUGINS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.plugins',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector:
          'antigravity-cli/plugins/<name>/ and antigravity-cli/import_manifest.json',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Directory structure', 'CLI filesystem location'],
          reviewedOn: '2026-09-24',
          establishes:
            'When you install a plugin the CLI stages its assets within the global configuration directory at ~/.gemini/antigravity-cli/plugins/<plugin_name>/, and a plugin directory holds a required plugin.json and optionally mcp_config.json, hooks.json, skills/, agents/, and rules/.',
        },
        {
          sourceId: 'google.antigravity.cli-features',
          url: 'https://antigravity.google/docs/cli/features/',
          officialHost: 'antigravity.google',
          sections: ['Plugins'],
          reviewedOn: '2026-09-10',
          establishes:
            'Plugins are namespaced bundles containing skills, agents, rules, MCP servers, and hooks; installing one stages the files under ~/.gemini/antigravity-cli/plugins/<plugin_name>/ beside an import_manifest.json tracking manifest.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/** Antigravity CLI's contribution to the behavior registry, keyed by `behaviorId` in identifier order. */
export const ANTIGRAVITY_BEHAVIOR_STATEMENTS: Readonly<
  Record<AntigravityBehaviorId, VendorBehaviorStatement>
> = {
  [ANTIGRAVITY_REPO_AGENTS_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_AGENTS_BEHAVIOR,
  [ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR,
  [ANTIGRAVITY_REPO_HOOKS_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_HOOKS_BEHAVIOR,
  [ANTIGRAVITY_REPO_MCP_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_MCP_BEHAVIOR,
  [ANTIGRAVITY_REPO_RULES_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_RULES_BEHAVIOR,
  [ANTIGRAVITY_REPO_SKILLS_BEHAVIOR.behaviorId]: ANTIGRAVITY_REPO_SKILLS_BEHAVIOR,
  [ANTIGRAVITY_USER_AGENTS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_AGENTS_BEHAVIOR,
  [ANTIGRAVITY_USER_CONTEXT_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_CONTEXT_BEHAVIOR,
  [ANTIGRAVITY_USER_HOME_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_HOME_BEHAVIOR,
  [ANTIGRAVITY_USER_HOOKS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_HOOKS_BEHAVIOR,
  [ANTIGRAVITY_USER_MCP_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_MCP_BEHAVIOR,
  [ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_PERMISSIONS_BEHAVIOR,
  [ANTIGRAVITY_USER_PLUGINS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_PLUGINS_BEHAVIOR,
  [ANTIGRAVITY_USER_RULES_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_RULES_BEHAVIOR,
  [ANTIGRAVITY_USER_SETTINGS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_SETTINGS_BEHAVIOR,
  [ANTIGRAVITY_USER_SKILLS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_SKILLS_BEHAVIOR,
};
