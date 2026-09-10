// Gemini CLI behavior statements — the implementation counterpart of
// contracts/vendors/gemini-cli.md § Documented Repository behavior and
// § Documented User behavior.
//
// A statement says where Gemini CLI documents looking for a customization. It
// is not a filesystem matcher and can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"); read authority lives only in the inspection-rule
// registry.
//
// Gemini CLI has one surface — the terminal client — and four tiers: system,
// user, project, extension. A tier is a lookup base here, never a surface, so
// every record below names `gemini-cli` and differs in its locator
// (contracts/vendors/gemini-cli.md § Surface boundary).
//
// Each statement is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union and the computed key would stop
// resolving to a property, which breaks the map's completeness check;
// `satisfies` keeps the literal, so the key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { GeminiBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Gemini CLI context files: `GEMINI.md`, or each name `context.fileName`
 * declares, loaded in the documented order — the global file, then the
 * configured workspace directories and their parent directories, then
 * just-in-time from any directory a tool accesses and its ancestors up to a
 * trusted root — and concatenated into one context.
 *
 * `partially-documented`: the page names the parent walk and the
 * just-in-time scan but states neither the boundary of the parent walk in
 * words (the `context.memoryBoundaryMarkers` setting, default `.git`, is a
 * setting the reference lists) nor whether a descendant file is read before a
 * tool touches its directory. The locator names the repository-bounded
 * ancestor chain because the boundary marker defaults to the repository's
 * own `.git`.
 *
 * The configured names come from `.gemini/settings.json`, which the
 * configuration-read stage reads before the walk
 * (`gemini.derived.context-filename`); this statement records only what
 * Gemini CLI documents.
 */
export const GEMINI_REPO_CONTEXT_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.context',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'GEMINI.md, or each name context.fileName declares',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.gemini-md',
          url: 'https://geminicli.com/docs/cli/gemini-md/',
          officialHost: 'geminicli.com',
          sections: ['Understand the context hierarchy', 'Customize the context file name'],
          reviewedOn: '2026-09-09',
          establishes:
            'The CLI loads context files in a fixed order — the global file in the user directory, then the files it finds in the configured workspace directories and their parent directories, then just-in-time files from any directory a tool accesses and its ancestors up to a trusted root — and concatenates them all; GEMINI.md is the default filename, and context.fileName in settings.json names one or several other filenames to load instead.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI project settings: the `.gemini/settings.json` at the project
 * root, the project layer of the documented precedence — above the user
 * settings and below the system settings — and ignored in an untrusted
 * folder.
 *
 * The documented lookup behind the carrier three rules admit:
 * `gemini.repo.settings`, whose row is the file itself; `gemini.repo.mcp`,
 * whose rows are the servers it declares; and `gemini.repo.hooks`, whose
 * recognition is the `hooks` object it can carry. All three share one read of
 * the one physical file. The same file is the seed the context-filename
 * derivation reads before the walk (`gemini.derived.context-filename`).
 */
export const GEMINI_REPO_SETTINGS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.settings',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.gemini/settings.json',
        traversal: 'exact',
      }
    : null,
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
            'The project settings file is .gemini/settings.json in the project root and applies only when the CLI runs from that project; it sits above the user settings file and below the system settings file in the documented precedence, and the project .gemini directory can hold other project-specific files beside it.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes:
            'In an untrusted workspace the CLI does not load the project .gemini/settings.json, so whether the project layer applies at all is a trust decision the file itself cannot show.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI MCP servers declared under `mcpServers` in the project
 * `.gemini/settings.json`: each server by name, with one required transport
 * — `command`, `url`, or `httpUrl` — and the optional `args`, `env`, `cwd`,
 * `headers`, `timeout`, `trust`, `includeTools`, and `excludeTools`
 * properties. A `$VAR_NAME` in `env` is expanded by the vendor at connection
 * time and stays literal text here (FR-026). Project servers do not connect
 * in an untrusted folder.
 *
 * The lookup reads the already-active settings layer rather than walking
 * directories, so the base is the layer and the statement carries no
 * traversal of its own.
 */
export const GEMINI_REPO_MCP_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.mcp',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'active-config-layer',
        relativeSelector: 'mcpServers in .gemini/settings.json',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.mcp-server',
          url: 'https://geminicli.com/docs/tools/mcp-server/',
          officialHost: 'geminicli.com',
          sections: [
            'Configure the MCP server in settings.json',
            'Configuration properties',
            'Environment variable expansion',
          ],
          reviewedOn: '2026-09-09',
          establishes:
            'MCP servers are declared by name in the mcpServers object of settings.json, at user or project scope; each declaration names exactly one transport through command, url, or httpUrl and may add args, env, cwd, headers, timeout, trust, includeTools, and excludeTools; variables written as $VAR_NAME or ${VAR_NAME} in the env block are expanded from the environment when the server is started.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes:
            'Project-specific MCP servers do not connect in an untrusted workspace, so a declaration is not proof of a connection.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI hooks declared under `hooks` in the project `.gemini/settings.json`,
 * merged with the user, system, and extension layers in the documented
 * precedence. Each event holds hook definitions whose `hooks[].command` is a
 * shell command the vendor runs; project hooks are fingerprinted, and one
 * whose name or command changed is treated as new and untrusted until
 * approved.
 *
 * Recording the documented fact grants no execution authority: inspection
 * runs no declared command (FR-020), and whether a hook is approved is
 * runtime this tool never observes.
 */
export const GEMINI_REPO_HOOKS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.hooks',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'active-config-layer',
        relativeSelector: 'hooks in .gemini/settings.json',
        traversal: 'none',
      }
    : null,
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
            'Hooks are configured in settings.json and merged from the project .gemini/settings.json, the user settings, the system settings, and installed extensions in that order of precedence; project hooks are fingerprinted, and a hook whose name or command changed is treated as a new, untrusted hook that warns before it runs.',
        },
        {
          sourceId: 'google.gemini-cli.hooks-reference',
          url: 'https://geminicli.com/docs/hooks/reference/',
          officialHost: 'geminicli.com',
          sections: ['Configuration schema', 'Hook definition', 'Hook configuration'],
          reviewedOn: '2026-09-09',
          establishes:
            'The hooks object is keyed by event name, each holding hook definitions with an optional matcher and a hooks array whose entries carry a type of command, the shell command to execute, and optional name, timeout, and description fields.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI project custom commands: every `.toml` file at any depth below
 * `<project root>/.gemini/commands/`, named by its path relative to that
 * directory with the separator converted to `:`. A project command with a
 * user command's name is always used; none loads in an untrusted folder.
 *
 * `partially-documented`: the page states the naming rule in general terms
 * with one nested example, and says nothing about how deep a path may go or
 * what becomes of a segment character the colon would make ambiguous. The
 * vendor's loader answers both — every `.toml` at any depth, and each segment's characters
 * outside `[A-Za-z0-9_.-]` replaced with `_`, a segment over 50 characters
 * cut to 47 plus `...` — which the command unit matches as a source
 * measurement (`rules/prompts-and-commands/gemini.ts`), not as documentation.
 */
export const GEMINI_REPO_COMMANDS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.commands',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.gemini/commands/',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.custom-commands',
          url: 'https://geminicli.com/docs/cli/custom-commands/',
          officialHost: 'geminicli.com',
          sections: ['File locations and precedence', 'Naming and namespacing', 'Required fields'],
          reviewedOn: '2026-09-09',
          establishes:
            'Project commands live in <project root>/.gemini/commands/ and can be committed; a command is named by its file path relative to the commands directory with the path separator converted to a colon, so a nested file becomes a namespaced command — stated as a general rule with the one example git/commit.toml, with no depth limit and no word on segment characters; a project command with the same name as a user command is always used; the only required TOML field is prompt.',
        },
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes: 'Custom commands from .toml files are not loaded in an untrusted workspace.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI workspace skills: `.gemini/skills/<name>/SKILL.md`, or the same
 * shape under the documented `.agents/skills/` alias — the workspace tier,
 * highest of the four. A same-name skill in a higher tier wins, and within
 * one tier the alias wins over the `.gemini` directory; none is available in
 * an untrusted folder.
 */
export const GEMINI_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.skills',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.gemini/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
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
            'Skills are discovered from four tiers in ascending precedence — built-in, extension, user, workspace — with workspace skills in .gemini/skills/ or the .agents/skills/ alias; when several skills share a name the higher-precedence tier wins, and within one tier the .agents/skills/ alias takes precedence over the .gemini/skills/ directory.',
        },
        {
          sourceId: 'google.gemini-cli.creating-skills',
          url: 'https://geminicli.com/docs/cli/creating-skills/',
          officialHost: 'geminicli.com',
          sections: ['Skill structure', 'Metadata and triggers', 'Discovery aliases'],
          reviewedOn: '2026-09-09',
          establishes:
            'A skill is a directory whose only required file is SKILL.md, beside optional scripts, references, and assets folders; the frontmatter names the skill and describes when to use it; .agents/skills is an alias of .gemini/skills compatible with other tools following the Agent Skills standard.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI project sub-agents: `.gemini/agents/*.md`, Markdown with
 * required YAML frontmatter whose `name` is the tool name the agent is
 * invoked by. Enabled unless `experimental.enableAgents` is false, which is
 * the `experimental` qualifier this record carries.
 */
export const GEMINI_REPO_AGENTS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.agents',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.gemini/agents/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.subagents',
          url: 'https://geminicli.com/docs/core/subagents/',
          officialHost: 'geminicli.com',
          sections: ['Agent definition files', 'File format', 'Disabling subagents'],
          reviewedOn: '2026-09-09',
          establishes:
            'Custom agents are Markdown files with YAML frontmatter placed at .gemini/agents/*.md for a project or ~/.gemini/agents/*.md for a user; the frontmatter is required and its name is the tool name the agent is invoked by; subagents are enabled by default and turned off by setting enableAgents to false under experimental in settings.json.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI workspace policies: `.gemini/policies/*.toml`, the workspace tier
 * of the policy engine — which the reference documents as currently
 * non-functional, so files there have no effect. A documented fact about a
 * location that is not read, which is why no rule admits it
 * (`gemini.excluded.repo-non-customizations`).
 */
export const GEMINI_REPO_POLICIES_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.policies',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.gemini/policies/*.toml',
        traversal: 'exact',
      }
    : null,
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
            'Policies are TOML files loaded per tier — default, extension, workspace, user, admin — with the workspace tier at $WORKSPACE_ROOT/.gemini/policies/*.toml marked disabled: the page states that the workspace tier is currently non-functional and that policies defined there have no effect.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI folder trust: an untrusted workspace loads no project settings,
 * no `.env`, no project MCP server, no custom command, and no skill, and
 * disables automatic memory loading. The decision is recorded in the user
 * tier's `trustedFolders.json`. A condition every Repository strategy
 * carries, never a recognition (FR-009).
 */
export const GEMINI_REPO_TRUST_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.trust',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Why trust matters: The impact of an untrusted workspace'],
          reviewedOn: '2026-09-09',
          establishes:
            'An untrusted workspace runs in safe mode: workspace settings and .env files are ignored, project MCP servers do not connect, custom commands are not loaded, skills are unavailable, automatic memory loading is disabled, and tool auto-acceptance is off.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI `.geminiignore` at the project root: excludes matching paths
 * from the tools that respect it, such as `@` file references. Not a
 * customization the model reads, and not read to decide what is listed
 * (`gemini.excluded.repo-non-customizations`).
 */
export const GEMINI_REPO_IGNORE_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.ignore',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.geminiignore',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.gemini-ignore',
          url: 'https://geminicli.com/docs/cli/gemini-ignore/',
          officialHost: 'geminicli.com',
          sections: ['How it works', 'How to use .geminiignore'],
          reviewedOn: '2026-09-09',
          establishes:
            'A .geminiignore file in the project root lists paths that tools respecting the file exclude from their operations, such as files shared with the @ command; the paths stay visible to other services such as Git.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI `.env` files: loaded into the process from the current
 * directory upward to the project root or the home, then from `~/.env`, with
 * `.gemini/.env` never excluded. Environment variables, never a customization
 * the model reads, and ignored in an untrusted folder
 * (`gemini.excluded.repo-non-customizations`).
 */
export const GEMINI_REPO_ENV_BEHAVIOR = {
  behaviorId: 'gemini.behavior.repo.env',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.env; .gemini/.env',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Environment variables and .env files'],
          reviewedOn: '2026-09-09',
          establishes:
            'The CLI loads environment variables from an .env file, searching the current directory and its parents up to the project root or the home directory and then ~/.env; variables from .gemini/.env files are never excluded.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Gemini CLI user configuration directory: `.gemini` below
 * `GEMINI_CLI_HOME`, or below the home when the setting is absent. The
 * setting names the directory the `.gemini` folder is created in — the home's
 * stand-in, not `.gemini` itself — which is why the member root is a join in
 * every case (specs/002-gemini-cli-support/spec.md FR-011).
 */
export const GEMINI_USER_HOME_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.home',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
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
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Settings files', 'Environment variables and .env files'],
          reviewedOn: '2026-09-09',
          establishes:
            'The user settings file is ~/.gemini/settings.json; GEMINI_CLI_HOME specifies the root directory for user-level configuration and storage, defaulting to the system home directory, inside which the CLI creates its .gemini folder.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI global context file: `GEMINI.md` in the user directory, loaded
 * first, before the workspace and just-in-time files. Whether the user tier's
 * own `context.fileName` renames it is not stated, so the Global rule admits
 * the default name alone (specs/002-gemini-cli-support/spec.md
 * § Clarifications).
 */
export const GEMINI_USER_CONTEXT_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.context',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'GEMINI.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
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
            'The global context file at ~/.gemini/GEMINI.md provides default instructions for all projects and is the first file loaded in the context hierarchy.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI user settings: `settings.json` in the user directory, the user
 * layer of the documented precedence, carrying `mcpServers` and `hooks`
 * beside the other settings. The one carrier three Global rules admit —
 * settings, MCP, hooks — exactly as the project file is.
 */
export const GEMINI_USER_SETTINGS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.settings',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'settings.json',
        traversal: 'exact',
      }
    : null,
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
            'The user settings file is ~/.gemini/settings.json and applies to every session of that user; it sits above the system defaults and below the project settings file in the documented precedence.',
        },
        {
          sourceId: 'google.gemini-cli.mcp-server',
          url: 'https://geminicli.com/docs/tools/mcp-server/',
          officialHost: 'geminicli.com',
          sections: ['Configure the MCP server in settings.json'],
          reviewedOn: '2026-09-09',
          establishes:
            'The mcpServers object may be added to the user settings.json as well as the project one; the gemini mcp commands write to either scope.',
        },
        {
          sourceId: 'google.gemini-cli.hooks',
          url: 'https://geminicli.com/docs/hooks/',
          officialHost: 'geminicli.com',
          sections: ['Configuration'],
          reviewedOn: '2026-09-09',
          establishes:
            'The user settings at ~/.gemini/settings.json are one of the layers hooks are configured in and merged from.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI personal custom commands: every `.toml` file at any depth below
 * the user directory's `commands/`, available in every project and displaced
 * by a project command of the same name. `partially-documented` for the
 * reason the project record is: the naming rule's depth and its segment
 * sanitization are the loader's, not the page's.
 */
export const GEMINI_USER_COMMANDS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.commands',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'commands/',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.custom-commands',
          url: 'https://geminicli.com/docs/cli/custom-commands/',
          officialHost: 'geminicli.com',
          sections: ['File locations and precedence', 'Naming and namespacing'],
          reviewedOn: '2026-09-09',
          establishes:
            'User commands live in ~/.gemini/commands/ and are available in every project; a project command with the same name is always used instead; the name derives from the path below the commands directory with the separator converted to a colon.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI user skills: `skills/<name>/SKILL.md` in the user directory, or
 * the same shape under the documented `~/.agents/skills/` alias — the user
 * tier, below workspace and above extension skills, with the alias winning
 * within the tier. The alias lives in the shared agent home, a separately
 * consented member (parent FR-045).
 */
export const GEMINI_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.skills',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'skills/<name>/SKILL.md; $HOME/.agents/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
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
            'User skills are located in ~/.gemini/skills/ or the ~/.agents/skills/ alias, the third of four tiers in ascending precedence; a higher tier wins a same-name clash, and within the user tier the alias takes precedence over the .gemini directory.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI personal sub-agents: `agents/*.md` in the user directory, the
 * same format as the project files, under the same experimental gate.
 */
export const GEMINI_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.agents',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'agents/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
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
            'Personal agents are Markdown files with YAML frontmatter at ~/.gemini/agents/*.md, under the same experimental enableAgents setting as project agents; the page names both locations without establishing an order between them.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI user policies: `policies/*.toml` in the user directory, the user
 * tier of the policy engine — loaded, unlike the workspace tier — above the
 * extension and default policies and below the admin ones.
 */
export const GEMINI_USER_POLICIES_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.policies',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'policies/*.toml',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.policy-engine',
          url: 'https://geminicli.com/docs/reference/policy-engine/',
          officialHost: 'geminicli.com',
          sections: ['Priority system and tiers', 'Policy locations', 'TOML rule schema'],
          reviewedOn: '2026-09-09',
          establishes:
            'User policies are the custom ~/.gemini/policies/*.toml files, the user tier whose base outranks the extension and default tiers and is outranked by the admin tier; each [[rule]] combines conditions such as toolName with a decision of allow, deny, or ask_user and a priority within the tier.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI installed extensions: every directory under the user
 * directory's `extensions/`, each with `gemini-extension.json` and the
 * `commands/`, `skills/`, `agents/`, `hooks/hooks.json`, `policies/`, and
 * context file it bundles; a linked development directory appears there as a
 * symbolic link. Loaded and merged at startup. Recorded for maintenance only:
 * installed copies are reproduced from their source rather than authored, so
 * `gemini.excluded.extensions` keeps them out of the read allowlist, and a
 * repository-root manifest is read by the vendor only through such a copy
 * (specs/002-gemini-cli-support/spec.md FR-016).
 */
export const GEMINI_USER_EXTENSIONS_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.extensions',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'plugin',
        lookupBase: 'tool-home',
        relativeSelector: 'extensions/<name>/gemini-extension.json and the components beside it',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.extensions-reference',
          url: 'https://geminicli.com/docs/extensions/reference/',
          officialHost: 'geminicli.com',
          sections: ['Extension format', 'gemini-extension.json', 'Link a local extension'],
          reviewedOn: '2026-09-09',
          establishes:
            'The CLI loads extensions from <home>/.gemini/extensions and merges their configurations at startup; an extension directory holds gemini-extension.json beside its commands, skills, agents, hooks/hooks.json, policies, and context file; gemini extensions link creates a symbolic link from that directory to a local development directory.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI trusted-folder decisions: `trustedFolders.json` in the user
 * directory, relocatable by `GEMINI_CLI_TRUSTED_FOLDERS_PATH` — the record
 * every Repository trust condition reads. Runtime state, not a customization,
 * so `gemini.excluded.user-runtime` keeps it out of the read allowlist.
 */
export const GEMINI_USER_TRUST_RECORD_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.trust-record',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'runtime-only',
        lookupBase: 'tool-home',
        relativeSelector: 'trustedFolders.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Overriding the trust file location'],
          reviewedOn: '2026-09-09',
          establishes:
            'Trust decisions are saved to ~/.gemini/trustedFolders.json by default, and GEMINI_CLI_TRUSTED_FOLDERS_PATH overrides that location.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Gemini CLI user environment files: `.env` in the user directory and
 * `~/.env`, loaded into the process. Credentials rather than a customization,
 * so `gemini.excluded.user-runtime` keeps them out of the read allowlist.
 */
export const GEMINI_USER_ENV_BEHAVIOR = {
  behaviorId: 'gemini.behavior.user.env',
  tool: 'gemini',
  surfaces: ['gemini-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: '.env; ~/.env',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Environment variables and .env files'],
          reviewedOn: '2026-09-09',
          establishes:
            'When no project .env is found the CLI falls back to ~/.env, and .gemini/.env files are never excluded from loading.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/** Gemini CLI's contribution to the behavior registry, keyed by `behaviorId` in identifier order. */
export const GEMINI_BEHAVIOR_STATEMENTS: Readonly<
  Record<GeminiBehaviorId, VendorBehaviorStatement>
> = {
  [GEMINI_REPO_CONTEXT_BEHAVIOR.behaviorId]: GEMINI_REPO_CONTEXT_BEHAVIOR,
  [GEMINI_REPO_ENV_BEHAVIOR.behaviorId]: GEMINI_REPO_ENV_BEHAVIOR,
  [GEMINI_REPO_HOOKS_BEHAVIOR.behaviorId]: GEMINI_REPO_HOOKS_BEHAVIOR,
  [GEMINI_REPO_IGNORE_BEHAVIOR.behaviorId]: GEMINI_REPO_IGNORE_BEHAVIOR,
  [GEMINI_REPO_MCP_BEHAVIOR.behaviorId]: GEMINI_REPO_MCP_BEHAVIOR,
  [GEMINI_REPO_COMMANDS_BEHAVIOR.behaviorId]: GEMINI_REPO_COMMANDS_BEHAVIOR,
  [GEMINI_REPO_AGENTS_BEHAVIOR.behaviorId]: GEMINI_REPO_AGENTS_BEHAVIOR,
  [GEMINI_REPO_POLICIES_BEHAVIOR.behaviorId]: GEMINI_REPO_POLICIES_BEHAVIOR,
  [GEMINI_REPO_SETTINGS_BEHAVIOR.behaviorId]: GEMINI_REPO_SETTINGS_BEHAVIOR,
  [GEMINI_REPO_SKILLS_BEHAVIOR.behaviorId]: GEMINI_REPO_SKILLS_BEHAVIOR,
  [GEMINI_REPO_TRUST_BEHAVIOR.behaviorId]: GEMINI_REPO_TRUST_BEHAVIOR,
  [GEMINI_USER_AGENTS_BEHAVIOR.behaviorId]: GEMINI_USER_AGENTS_BEHAVIOR,
  [GEMINI_USER_COMMANDS_BEHAVIOR.behaviorId]: GEMINI_USER_COMMANDS_BEHAVIOR,
  [GEMINI_USER_CONTEXT_BEHAVIOR.behaviorId]: GEMINI_USER_CONTEXT_BEHAVIOR,
  [GEMINI_USER_ENV_BEHAVIOR.behaviorId]: GEMINI_USER_ENV_BEHAVIOR,
  [GEMINI_USER_EXTENSIONS_BEHAVIOR.behaviorId]: GEMINI_USER_EXTENSIONS_BEHAVIOR,
  [GEMINI_USER_HOME_BEHAVIOR.behaviorId]: GEMINI_USER_HOME_BEHAVIOR,
  [GEMINI_USER_POLICIES_BEHAVIOR.behaviorId]: GEMINI_USER_POLICIES_BEHAVIOR,
  [GEMINI_USER_SETTINGS_BEHAVIOR.behaviorId]: GEMINI_USER_SETTINGS_BEHAVIOR,
  [GEMINI_USER_SKILLS_BEHAVIOR.behaviorId]: GEMINI_USER_SKILLS_BEHAVIOR,
  [GEMINI_USER_TRUST_RECORD_BEHAVIOR.behaviorId]: GEMINI_USER_TRUST_RECORD_BEHAVIOR,
};
