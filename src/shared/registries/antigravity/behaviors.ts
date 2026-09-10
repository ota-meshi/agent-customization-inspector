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
 * Antigravity CLI workspace context: the `GEMINI.md` and `AGENTS.md` of the
 * active directory, parsed and enforced alongside the global context file.
 *
 * `partially-documented`: the page names the two files of the active directory
 * and the global one by its exact path, and states neither a depth below the
 * workspace root nor an order between them
 * (§ Known uncertainties item 1).
 */
export const ANTIGRAVITY_REPO_CONTEXT_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.context',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: 'GEMINI.md; AGENTS.md',
        traversal: 'exact',
      }
    : null,
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
            'Both CLI platforms use identical workspace context rules: the agent parses and enforces the rule constraints defined inside the active directory GEMINI.md and AGENTS.md files, and automatically consults the global constraints at ~/.gemini/GEMINI.md.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace skills below `.agents/skills/`, named by their
 * frontmatter and compiled into slash commands when the CLI runs in that
 * directory. Two shapes are admitted: a skill folder holding a `SKILL.md`,
 * whose row unit is the directory, and a flat Markdown file, whose row unit is
 * the file and which therefore has no companion census (research.md § 2).
 *
 * `conflict`: the vendor's pages make incompatible statements about the shape
 * of a skill in this one directory. The terminal's own plugins and skills page
 * gives a flat `.md` file; the shared Agent Skills page, the editor
 * extensions' page, both plugin pages, and a Google codelab written for this
 * terminal give a folder holding a `SKILL.md`, and the published binary
 * discovers only the folder. Both shapes are admitted anyway, for the reason
 * the flat rule states (`rules.ts`, `ANTIGRAVITY_REPO_SKILL_FILE_RULE`;
 * § Known uncertainties item 6). What happens when a workspace and a global
 * skill declare one name is separately not stated (§ Known uncertainties
 * item 2).
 */
export const ANTIGRAVITY_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.skills',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector:
          '.agents/skills/<name>.md, .agents/skills/<name>/SKILL.md, .agent/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Creating local workspace skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'To deploy workspace-specific skills, create a directory named .agents/skills/ at the project root and draft a markdown file with a .md extension whose frontmatter defines name and description; when you run agy in that directory the skill is compiled and becomes a slash command.',
        },
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
          sections: ['Where skills live', 'Creating a skill', 'Skill folder structure'],
          reviewedOn: '2026-09-10',
          establishes:
            'A skill is a folder containing a SKILL.md file; a workspace-specific one lives at <workspace-root>/.agents/skills/<skill-folder>/, .agents/skills is the current default with backward support for .agent/skills, and SKILL.md is the only required file beside optional scripts, examples, and resources.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI workspace rules: one Markdown file per rule below the
 * workspace's or git root's `.agents/rules/`, with `.agent/rules/` still
 * supported as the earlier spelling.
 *
 * `partially-documented`: the shared Rules page gives the directory, the four
 * activation modes, and the per-file character limit, and the terminal's
 * migration page states that workspace rules keep their support. Neither
 * states the order two rules compose in, nor their precedence against the
 * context files (contracts/vendors/antigravity-cli.md § Known uncertainties
 * item 8).
 */
export const ANTIGRAVITY_REPO_RULES_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.repo.rules',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/rules/<name>.md, .agent/rules/<name>.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules-workflows/',
          officialHost: 'antigravity.google',
          sections: ['Rules', 'Workspace Rules', 'Global Rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'A rule is a Markdown file limited to 12,000 characters; workspace rules live in the .agents/rules folder of the workspace or git root with backward support for .agent/rules, global rules live in ~/.gemini/GEMINI.md, and each rule declares whether it activates manually, always, by model decision, or by a glob pattern.',
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
 * `partially-documented`: the shared Hooks page gives the file's schema
 * exactly and gives its location as an example of a customization directory
 * rather than as a lookup the terminal states
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
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Configuration', 'Schema and File Format', 'Hook Handler Configuration'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks are configured in a hooks.json file located in the customization directory — .agents/ in the workspace or ~/.gemini/config/ — and that file maps a hook name to its event configurations, each event holding matcher groups whose handlers carry a command and an optional timeout, with an optional per-hook enabled flag.',
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
          establishes:
            'The CLI automatically discovers custom agents defined in Markdown format with YAML frontmatter: workspace agents at .agents/agents/<name>.md or .agents/agents/<name>/agent.md, and global agents in ~/.gemini/config/agents/; an agent with subagent: true set in its frontmatter can be invoked by the primary agent.',
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
          url: 'https://antigravity.google/docs/cli/mcp/',
          officialHost: 'antigravity.google',
          sections: [
            'Global and Workspace Server Configs',
            'MCP Configuration Structure',
            'MCP Configuration Properties',
          ],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/settings/',
          officialHost: 'antigravity.google',
          sections: ['Configuration file location'],
          reviewedOn: '2026-09-10',
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
 * Antigravity CLI global developer context: the `GEMINI.md` of the user tier,
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
        relativeSelector: 'GEMINI.md',
        traversal: 'exact',
      }
    : null,
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
            'The agent automatically consults and enforces the global developer constraints located at ~/.gemini/GEMINI.md.',
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
          url: 'https://antigravity.google/docs/cli/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
          establishes: 'Global custom agents are discovered in ~/.gemini/config/agents/.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI global shared skills, imported as slash commands whenever
 * the CLI launches in any directory. Two roots and two shapes, as the
 * workspace behavior has two shapes: a skill folder's `SKILL.md` below the
 * user tier's `antigravity-cli/skills/` or its `config/skills/`, and the flat
 * Markdown file the terminal's own page places under `antigravity-cli/skills/`.
 *
 * `conflict`: the terminal's own page and the shared Agent Skills page give
 * different directories and different shapes for the same scope. The two
 * directories are not in fact a disagreement — the terminal walks both — but
 * the two shapes are, and the conflict is the same one the workspace behavior
 * carries (§ Known uncertainties item 6).
 */
export const ANTIGRAVITY_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'antigravity.behavior.user.skills',
  tool: 'antigravity',
  surfaces: ['antigravity-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector:
          'antigravity-cli/skills/<name>/SKILL.md, config/skills/<name>/SKILL.md, antigravity-cli/skills/<name>.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Sharing global skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'To share skills across all workspaces, place the target markdown files inside the global configuration path ~/.gemini/antigravity-cli/skills/; any markdown skill there is automatically imported as a global slash command whenever agy launches in any directory.',
        },
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['Where skills live'],
          reviewedOn: '2026-09-10',
          establishes:
            'A global skill, available across all workspaces, is a skill folder holding a SKILL.md at ~/.gemini/config/skills/<skill-folder>/ — a different directory and a different shape from the one the terminal page gives for the same scope.',
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
          url: 'https://antigravity.google/docs/cli/settings/',
          officialHost: 'antigravity.google',
          sections: ['Setting up preferences', 'Configuration file location'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/permissions/',
          officialHost: 'antigravity.google',
          sections: ['Fine-grained permissions', 'Supported actions & matching rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'Every sensitive operation is a permission resource formatted as action(target), evaluated across the deny, ask, and allow lists configured inside the global settings at ~/.gemini/antigravity-cli/settings.json, with conflicting rules resolved in the order deny, then ask, then allow.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Antigravity CLI hook declarations: configured inside a plugin's own
 * `hooks.json` or inside the user settings file. The plugin form leaves with
 * the installed copies it belongs to; the settings form is what this product
 * publishes.
 *
 * `partially-documented`: the page names the two places hooks are configured
 * and gives no schema for the settings-file form
 * (§ Known uncertainties item 4). Recording the fact grants no execution
 * authority: inspection runs no declared command (FR-011).
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
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks intercept agent actions right before or immediately after execution and are defined inside a plugin hooks.json or configured inside the primary settings.json file.',
        },
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Configuration', 'Schema and File Format', 'Common Input Fields'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks are configured in a hooks.json file located in the customization directory — .agents/ in the workspace or ~/.gemini/config/ — and the transcript a hook receives lives under ~/.gemini/antigravity-cli for the CLI, beside ~/.gemini/antigravity for Antigravity 2.0.',
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
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Antigravity plugins', 'Plugin filesystem structure'],
          reviewedOn: '2026-09-10',
          establishes:
            'When you install or import a plugin the CLI stages the bundle files within the global configuration path ~/.gemini/antigravity-cli/plugins/<plugin_name>/, whose documented layout holds plugin.json, and optionally mcp_config.json, hooks.json, skills/, agents/, and rules/.',
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
  [ANTIGRAVITY_USER_SETTINGS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_SETTINGS_BEHAVIOR,
  [ANTIGRAVITY_USER_SKILLS_BEHAVIOR.behaviorId]: ANTIGRAVITY_USER_SKILLS_BEHAVIOR,
};
