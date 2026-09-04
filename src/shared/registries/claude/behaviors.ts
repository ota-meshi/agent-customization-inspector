// Anthropic Claude Code behavior statements — the implementation counterpart
// of contracts/vendors/claude-code.md § Repository vendor behavior and § User
// behavior.
//
// A statement says where Claude Code documents looking for a customization. It
// is not a filesystem matcher and can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"); read authority lives only in the inspection-rule
// registry. Statements arrive with the inventory phase that needs them, so
// this catalog is closed but incomplete by design.
//
// Each statement is its own `export const` so a relation can name it directly.
// The keyed map at the end exists for the aggregate and for lookups by ID; it
// restates nothing.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union and the computed key would stop
// resolving to a property, which breaks the map's completeness check;
// `satisfies` keeps the literal, so the key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { ClaudeBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Claude instruction discovery in the exact runtime working directory:
 * `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` there are loaded in
 * full at session start.
 *
 * The `.claude/CLAUDE.md` form is documented for this scope alone — the
 * ancestor walk and the lazy descendant discovery below name the bare
 * filenames only — which is what makes those two statements
 * `partially-documented` rather than this one.
 */
export const CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.instructions.launch',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'CLAUDE.md; .claude/CLAUDE.md; CLAUDE.local.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Choose where to put CLAUDE.md files', 'How CLAUDE.md files load'],
          reviewedOn: '2026-08-27',
          establishes:
            'Project instructions live at ./CLAUDE.md or ./.claude/CLAUDE.md and local instructions at ./CLAUDE.local.md, and CLAUDE.md and CLAUDE.local.md files at and above the working directory are loaded in full at launch.',
        },
        {
          sourceId: 'anthropic.claude-code.sdk.setting-sources',
          url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features',
          officialHost: 'code.claude.com',
          sections: ['CLAUDE.md load locations'],
          reviewedOn: '2026-08-18',
          establishes:
            'The load-location table names <cwd>/CLAUDE.md or <cwd>/.claude/CLAUDE.md as the project root location and <cwd>/CLAUDE.local.md as the local one, both read from the working directory itself.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude instruction discovery above the runtime working directory: each
 * parent directory in turn is checked for `CLAUDE.md` and `CLAUDE.local.md`,
 * continuing toward the filesystem root.
 *
 * `partially-documented` because the walk is stated for the bare filenames
 * only: no cited section establishes a `.claude/CLAUDE.md` variant on an
 * ancestor directory (contracts/vendors/claude-code.md § Canonical
 * evidence-assessment index).
 */
export const CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.instructions.ancestor',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'CLAUDE.md; CLAUDE.local.md',
        // Upward and deliberately not repository-bounded: the page describes
        // walking up the directory tree without naming a repository root as
        // the stop, unlike the skill layers above (see `VendorTraversal`).
        traversal: 'ancestor-chain-to-filesystem-root',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['How CLAUDE.md files load'],
          reviewedOn: '2026-08-27',
          establishes:
            'Claude Code walks up the directory tree from the working directory, checking each directory for CLAUDE.md and CLAUDE.local.md; the walk names no repository root as its stop, and it names no .claude/CLAUDE.md variant on an ancestor directory.',
        },
        {
          sourceId: 'anthropic.claude-code.sdk.setting-sources',
          url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features',
          officialHost: 'code.claude.com',
          sections: ['CLAUDE.md load locations'],
          reviewedOn: '2026-08-18',
          establishes:
            'CLAUDE.md files in directories above cwd are loaded at session start, and CLAUDE.local.md in every parent directory with them; the table names the .claude directory form for the project root row alone.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude instruction discovery below the runtime working directory:
 * `CLAUDE.md` and `CLAUDE.local.md` in a subdirectory join the session when
 * Claude reads a file in that subtree, rather than at launch.
 *
 * This on-demand half is why the Inspector's rule expands to descendant
 * inventory: a file under any subdirectory is one Claude can genuinely load.
 * `partially-documented` for the same reason as the ancestor walk — the
 * descendant form is stated for the bare filenames only.
 */
export const CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.instructions.descendant',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'CLAUDE.md; CLAUDE.local.md',
        traversal: 'lazy-descendant',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Choose where to put CLAUDE.md files', 'How CLAUDE.md files load'],
          reviewedOn: '2026-08-27',
          establishes:
            'Claude Code also discovers CLAUDE.md and CLAUDE.local.md files in subdirectories under the working directory and includes them when it reads files in those subdirectories, and it names no .claude/CLAUDE.md variant for that descendant case.',
        },
        {
          sourceId: 'anthropic.claude-code.sdk.setting-sources',
          url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features',
          officialHost: 'code.claude.com',
          sections: ['CLAUDE.md load locations'],
          reviewedOn: '2026-08-18',
          establishes:
            'CLAUDE.md files in subdirectories of cwd are loaded on demand when the agent reads a file in that subtree.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User commands: the `commands/` directory of the configuration
 * directory, with the same subdirectory namespacing the project scope has.
 *
 * Recorded for maintenance and for the selection strategy that composes it; it
 * expands no Global inspection, and `claude.excluded.user-runtime` keeps the
 * surface out of the read allowlist (contracts/vendors/claude-code.md
 * § Documented User behavior).
 */
export const CLAUDE_USER_COMMANDS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.commands',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
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
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live', 'How a skill gets its command name'],
          reviewedOn: '2026-08-27',
          establishes:
            'The personal scope is the home configuration directory — the page places personal skills at ~/.claude/skills/<skill-name>/SKILL.md and says they apply to all your projects — and the same page says command files in .claude/commands/ work the way skills do and are invoked by their file name. That pairing is what makes <claude-config-dir>/commands/ the personal command directory; the page states no traversal for it, which the changelog entry beside this one supplies.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.legacy-command-nesting',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['1.0.51'],
          reviewedOn: '2026-09-04',
          establishes:
            'Release 1.0.51 fixed user-level commands in subdirectories, which is where the personal directory is confirmed to recurse and to namespace by subdirectory.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User instructions at `<claude-config-dir>/CLAUDE.md`. Recorded for
 * maintenance and for the layering strategy that composes it: it expands no
 * Global inspection, and the only rule that will ever read the surface is the
 * consent-gated `claude.global.instructions`
 * (contracts/vendors/claude-code.md § User behavior).
 */
export const CLAUDE_USER_INSTRUCTIONS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.instructions',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `<claude-config-dir>` is `CLAUDE_CONFIG_DIR` when configured and
        // `~/.claude` otherwise — the product's own home, so the base is
        // `tool-home` rather than the profile data a `$HOME`-anchored lookup
        // would use.
        lookupBase: 'tool-home',
        relativeSelector: 'CLAUDE.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Choose where to put CLAUDE.md files'],
          reviewedOn: '2026-08-27',
          establishes:
            'User instructions live at ~/.claude/CLAUDE.md and hold personal preferences for all projects, one of the scopes the documented broadest-to-most-specific load order spans.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-27',
          establishes:
            'CLAUDE_CONFIG_DIR overrides the configuration directory, ~/.claude by default, with settings, session history, and plugins stored under that path — the relocation the <claude-config-dir> spelling names.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude subagent discovery: each `<agent-layer>` from the launch working
 * directory through the Git repository root carries recursive Markdown agent
 * files under `.claude/agents/`.
 *
 * Recorded now because `claude.mcp.selection` consumes it — a subagent
 * inherits the selected parent MCP tools and can scope servers to itself — so
 * shipping the strategy without this statement would leave the dangling edge
 * the contract gate rejects. It authorizes no read: the agent inventory rule
 * arrives with its own phase (contracts/vendors/claude-code.md § Repository
 * vendor behavior).
 *
 * `partially-documented` per the canonical index: duplicate-name selection
 * inside one directory tree has no documented stable winner.
 */
export const CLAUDE_REPO_AGENTS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.agents',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // Documentation prose, not a matcher: the registry never encodes the
        // vendor's recursive discovery as a glob token.
        relativeSelector: 'Markdown files recursively under .claude/agents/',
        // The layer walk stops at the Git repository root, like the skill
        // layers; additional directories supplied with `--add-dir` can also
        // contribute agents, which stays a runtime condition rather than a
        // second traversal value.
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Choose the subagent scope'],
          reviewedOn: '2026-08-27',
          establishes:
            'Project subagents are Markdown files discovered recursively under .claude/agents/ on each layer walked up from the working directory to the repository root, and directories added with --add-dir contribute their agents too; two same-name files under one directory tree load by filesystem read order rather than a documented precedence.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude project commands: the legacy `.claude/commands/` Markdown files a
 * project keeps, discovered inside that directory including its
 * subdirectories, where each subdirectory becomes a segment of the command's
 * namespace.
 *
 * Commands and skills are one feature with two file layouts: a
 * `.claude/commands/deploy.md` and a `.claude/skills/deploy/SKILL.md` both
 * make `/deploy`, a command file supports the same frontmatter except `name`
 * and `paths` — which Claude Code ignores in a command file — and a same-name
 * skill outranks the command.
 *
 * `partially-documented` for the one thing the page leaves open: it says
 * command files work the way skills do, and it documents skill discovery as an
 * ancestor walk to the repository root plus a lazy descendant reach — but it
 * writes the nested-directory sentence about `.claude/skills/` alone and never
 * repeats it for `.claude/commands/`. A complete skill-equivalent ancestor and
 * lazy-descendant command traversal is therefore not stated independently
 * (contracts/vendors/claude-code.md § Documented Repository behavior), which
 * is why the Inspector rule resting on this statement anchors at the selected
 * root — the one layer every session shares.
 */
export const CLAUDE_REPO_COMMANDS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.commands',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // The directory, not a glob: a vendor locator is documentation rather
        // than an Inspector selector, so the recursion is the `traversal`
        // field's to state (contracts/inspection-path-allowlist.md § "Vendor
        // locators are not Inspector matchers").
        relativeSelector: '.claude/commands/',
        // Everything below that directory: the changelog restored the
        // subdirectory-derived namespace in a command name, which is the
        // documented reach inside one commands directory. Which layers hold
        // such a directory is the walk this field cannot also carry, and is
        // what leaves the record `partially-documented`.
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: [
            'Where skills live',
            'Discovery from parent and nested directories',
            'How a skill gets its command name',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'Custom commands are merged into skills: a .claude/commands/deploy.md and a .claude/skills/deploy/SKILL.md both create /deploy, existing .claude/commands/ files keep working, and a skill outranks a command of the same name. A command file supports the same frontmatter as a skill except name and paths, which Claude Code ignores in one, and is invoked by its file name without the extension. The page says command files work the way skills do but writes its nested-directory sentence about .claude/skills/ alone, so no skill-equivalent ancestor or lazy-descendant command traversal is stated independently.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.legacy-command-nesting',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['1.0.45'],
          reviewedOn: '2026-09-04',
          establishes:
            'Release 1.0.45 restored namespacing in command names based on subdirectories, with .claude/commands/frontend/component.md becoming /frontend:component — the documented reach inside one commands directory that makes its discovery recursive.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude contained hooks: the `hooks` declarations an accepted settings file,
 * skill, subagent, plugin manifest, or marketplace entry carries. Claude
 * documents no standalone project hook file, so every declaration this vendor
 * has is contained in an artifact something else already accepted.
 *
 * The lookup base is the accepted artifact rather than a directory: the client
 * reads these declarations out of what it already loaded, so the record carries
 * no traversal of its own — which layers and components are active is the
 * settings precedence's and the plugin activation's own composition.
 *
 * `documented`: the locations page lists all five, and the skills-and-agents
 * section states that frontmatter hooks use the same three-level configuration
 * format as a settings file's. How long a registration lasts, whether a
 * workspace is trusted, and whether a managed policy allows a non-managed hook
 * at all are runtime this tool never observes (FR-009).
 */
export const CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.hooks-contained',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'active-config-layer',
        relativeSelector:
          'hooks in .claude/settings.json; .claude/settings.local.json; SKILL.md frontmatter; .claude/agents frontmatter; plugin.json; marketplace.json entries',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.hooks.locations-resolution',
          url: 'https://code.claude.com/docs/en/hooks',
          officialHost: 'code.claude.com',
          sections: ['Hook locations', 'Hooks in skills and agents', 'The /hooks menu'],
          reviewedOn: '2026-08-25',
          establishes:
            'Where a hook is defined decides its scope, and the listed locations are the user and project settings files, managed policy settings, a plugin\u2019s hooks/hooks.json, skill frontmatter, and subagent frontmatter; frontmatter hooks use the same configuration format as settings-based hooks, a subagent\u2019s are registered only while it runs, and a skill\u2019s from its invocation onward. Hook entries merge across settings levels rather than replacing each other.',
        },
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Plugin manifest schema', 'File locations reference'],
          reviewedOn: '2026-08-27',
          establishes:
            'A plugin declares hooks either as config paths or as inline config in its manifest, and a marketplace entry may carry any manifest field, so a plugin can carry hook configuration in either place — content of the plugin the manifest or the entry declares.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude project MCP declarations: the exact `.mcp.json` at `<project-root>`
 * as Claude Code determines it, whose named `mcpServers` entries are the
 * project-scope server declarations.
 *
 * `partially-documented` per the canonical index: the exact project-root
 * selection algorithm and the resolution base for relative `command` and
 * `args` values are not fully specified — the cited pages establish
 * neither. This product records no base and joins none: a relative value is
 * published as the literal the file wrote, and no declared path is opened
 * (FR-009).
 */
export const CLAUDE_REPO_MCP_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.mcp',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        // `<project-root>` as determined by Claude Code; the vendor documents
        // the location as the project root without fully specifying how that
        // root is selected, which is the record's `partially-documented`.
        lookupBase: 'repository-root',
        relativeSelector: '.mcp.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.mcp.scopes-precedence',
          url: 'https://code.claude.com/docs/en/mcp',
          officialHost: 'code.claude.com',
          sections: ['MCP installation scopes'],
          reviewedOn: '2026-08-27',
          establishes:
            'Project-scope MCP servers are declared in a .mcp.json file at the project root, checked into version control as the team-shared scope of the documented installation scopes, while the local and user scopes live in user-level state.',
        },
        {
          sourceId: 'anthropic.claude-code.ide.shared-differences',
          url: 'https://code.claude.com/docs/en/ide-integrations',
          officialHost: 'code.claude.com',
          sections: ['VS Code extension vs. Claude Code CLI'],
          reviewedOn: '2026-07-25',
          establishes:
            'The CLI-versus-extension feature table records MCP server configuration as full on the CLI and partial on the VS Code extension, so which surface is running conditions what the declaration file can do there.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude plugin content at an explicitly selected `<plugin-root>`: the
 * optional `.claude-plugin/plugin.json` manifest plus default or
 * manifest-declared component locations, MCP declarations among them.
 *
 * Recorded now because `claude.mcp.selection` consumes it — plugin-provided
 * servers occupy one scope of the documented selection order. It authorizes
 * no read and establishes no path discovery: a plugin root comes only from
 * installation, a marketplace, `--plugin-dir` / `--plugin-url`, or the
 * skills-directory plugin mechanism, never from a Repository path existing
 * (contracts/vendors/claude-code.md § Repository vendor behavior).
 */
export const CLAUDE_REPO_PLUGIN_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.plugin',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'plugin',
        // The base is an explicitly selected plugin root — a registration,
        // not a filesystem walk — so the lookup base is the catalog member
        // and the traversal is what the registration names.
        lookupBase: 'registered-catalog',
        relativeSelector: '.claude-plugin/plugin.json plus component locations',
        traversal: 'explicit-registration',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: [
            'Plugin installation scopes',
            'Plugin manifest schema',
            'File locations reference',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'A plugin is installed into a settings scope chosen at installation; its manifest is optional, with components — MCP declarations among them — auto-discovered at default locations under the plugin root or redirected by manifest-declared paths.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude plugins loaded by placement: a folder under a skills directory that
 * carries `.claude-plugin/plugin.json` is loaded as `<folder>@skills-dir` on
 * the next session, with no marketplace and no install step.
 *
 * The one plugin interpretation that needs no registration, which is why it is
 * a Repository statement where `claude.behavior.repo.plugin` is a statement
 * about an explicitly selected root. The manifest's presence is what makes the
 * folder a plugin, so the file the rule admits is the carrier and the folder is
 * the plugin root whose files the plugin ships.
 *
 * Project scope is the launch working directory's own `.claude/skills/` and
 * this interpretation does not walk ancestor skill directories, unlike plain
 * skill discovery. Which of those a session actually loads stays conditional on
 * the workspace trust dialog, a runtime input this product never reads
 * (FR-009).
 */
export const CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.skills-directory-plugin',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.claude/skills/<plugin-name>/.claude-plugin/plugin.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Skills-directory plugins', 'File locations reference'],
          reviewedOn: '2026-08-27',
          establishes:
            "Any folder under a skills directory that contains a .claude-plugin/plugin.json manifest is loaded as a plugin named <folder>@skills-dir on the next session, with no marketplace and no install step, and is discovered in place rather than copied into the plugin cache; the project-scope skills directory is the launch working directory's own .claude/skills/, which this interpretation does not walk ancestors of, and it loads only after the workspace trust dialog is accepted.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude marketplace catalogs: a registered `<marketplace-root>` carries
 * `.claude-plugin/marketplace.json`, whose entries name the plugins it offers
 * and the source each comes from.
 *
 * A repository documents its own catalog at that path in its root, so the file
 * is authored content this Source carries. Registration — `/plugin marketplace
 * add`, or `extraKnownMarketplaces` in a settings file — is what makes a
 * session consider it, and that is a runtime input this product never reads:
 * a row states what the catalog offers, never that a plugin is registered,
 * installed, or enabled (FR-009).
 */
export const CLAUDE_REPO_MARKETPLACE_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.marketplace',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'registered-catalog',
        relativeSelector: '.claude-plugin/marketplace.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.marketplaces.catalog-sources',
          url: 'https://code.claude.com/docs/en/plugin-marketplaces',
          officialHost: 'code.claude.com',
          sections: ['Create the marketplace file', 'Plugin sources'],
          reviewedOn: '2026-08-25',
          establishes:
            'A repository publishes its catalog as .claude-plugin/marketplace.json in its root, defining the marketplace name, owner, and a plugins list whose entries each need a name and a source. A source string starting with ./ names a plugin in the same repository, resolved against the marketplace root; a bare name with no / names one the same way once metadata.pluginRoot declares the directory such names resolve under. Every other source is an object naming where the plugin is fetched from through its own source key: github, url, git-subdir, npm, archive, or command. Users reach a catalog by adding it, so registration is separate from the catalog file.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude Repository skill discovery: each `<skill-layer>` from the launch
 * working directory through the Git repository root carries
 * `.claude/skills/<skill-name>/SKILL.md`, with ancestor layers discovered at
 * startup and nested descendant skill directories discovered on demand as
 * files under them are accessed.
 *
 * The locator's one closed traversal field records the startup walk — upward,
 * terminating at the Git repository root. The documented lazy descendant
 * discovery is not a second traversal value: it is why the Inspector's rule
 * expands to descendant inventory, so neither half of the documented behavior
 * is lost.
 */
export const CLAUDE_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.skills',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.claude/skills/<skill-name>/SKILL.md',
        // The upward startup walk stops at the Git repository root — no
        // project-root-marker configuration is documented for Claude, unlike
        // Codex (see `VendorTraversal`).
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live', 'Discovery from parent and nested directories'],
          reviewedOn: '2026-08-27',
          establishes:
            'Claude Code discovers repository skills at .claude/skills/<skill-name>/SKILL.md, loading them from the start directory and every parent up to the repository root, while a nested descendant skill directory loads the first time Claude reads or edits a file inside it.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.nested-skill-discovery',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['2.1.6'],
          reviewedOn: '2026-09-04',
          establishes:
            'Release 2.1.6 introduces automatic discovery of skills from nested .claude/skills directories, the version gate for the on-demand descendant half of this behavior (QR-005).',
        },
        {
          sourceId: 'anthropic.claude-code.large-codebases.start-directory',
          url: 'https://code.claude.com/docs/en/large-codebases',
          officialHost: 'code.claude.com',
          sections: ['Choose where to start Claude', 'Add per-directory skills'],
          reviewedOn: '2026-07-25',
          establishes:
            'The launch directory decides which skill layers load at startup, and nested directories can carry their own .claude/skills directories that join the session as files under them are accessed.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User and per-project local MCP state at `<home>/.claude.json`.
 * Recorded for maintenance and for the selection strategy that composes it:
 * it expands no Global inspection, and the vendor contract's
 * `claude.excluded.user-runtime` keeps the surface out of the read allowlist
 * (FR-016, FR-018). That exclusion rule ships with the Global phase that
 * needs it, not with this statement.
 */
export const CLAUDE_USER_MCP_STATE_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.mcp-state',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `<home>` itself, not `<claude-config-dir>`: the state file sits
        // beside the config directory rather than inside it, so the base is
        // the profile rather than the tool home.
        lookupBase: 'profile-data',
        relativeSelector: '.claude.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.mcp.scopes-precedence',
          url: 'https://code.claude.com/docs/en/mcp',
          officialHost: 'code.claude.com',
          sections: ['MCP installation scopes'],
          reviewedOn: '2026-08-27',
          establishes:
            'User-scope MCP servers — and the local scope private to one project — are stored in user-level state rather than in the project file, two scopes of the documented installation-scope order.',
        },
        {
          sourceId: 'anthropic.claude-code.directory.file-reference',
          url: 'https://code.claude.com/docs/en/claude-directory',
          officialHost: 'code.claude.com',
          sections: ['File reference'],
          reviewedOn: '2026-08-27',
          establishes:
            'The file reference table locates ~/.claude.json global-only at the home directory — beside the ~/.claude configuration directory rather than inside it — holding app state and personal MCP servers.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude installed plugin data under `<claude-config-dir>/plugins/`, with
 * plugin enablement recorded in the User `settings.json`. Recorded for
 * maintenance and for the selection strategy that composes it — plugin-scope
 * servers come from installed plugins — while `claude.excluded.user-runtime`
 * keeps the surface out of the read allowlist (FR-016, FR-018); that
 * exclusion rule ships with the Global phase that needs it.
 */
export const CLAUDE_USER_PLUGINS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.plugins',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'plugins/; plugin enablement in settings.json',
        // Installed, cache, and runtime-managed data: what is under the
        // directory is decided by installation state, not by a documented
        // filesystem walk of authored content.
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Plugin installation scopes', 'Plugin caching and file resolution'],
          reviewedOn: '2026-08-27',
          establishes:
            'Plugin enablement is recorded per installation scope in settings files — the user scope in ~/.claude/settings.json — and marketplace plugins are copied into the local plugin cache at ~/.claude/plugins/cache, which is what makes plugin-provided servers user-side installation state rather than a repository fact.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-27',
          establishes:
            'CLAUDE_CONFIG_DIR overrides the configuration directory, ~/.claude by default, with settings, session history, and plugins stored under that path — the relocation the <claude-config-dir> spelling names.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User skill discovery under `<claude-config-dir>/skills`. Recorded for
 * maintenance only: it expands no Global inspection, and the vendor contract's
 * `claude.excluded.user-runtime` keeps the surface out of the read allowlist
 * (FR-016, FR-018). That exclusion rule ships with the Global phase that needs
 * it, not with this statement.
 */
export const CLAUDE_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.skills',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `<claude-config-dir>` is `CLAUDE_CONFIG_DIR` when configured and
        // `~/.claude` otherwise (contracts/vendors/claude-code.md § User
        // behavior) — the product's own home, so the base is `tool-home`
        // rather than the profile data a `$HOME`-anchored lookup would use.
        lookupBase: 'tool-home',
        relativeSelector: 'skills/<skill-name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live'],
          reviewedOn: '2026-08-27',
          establishes:
            'Claude Code additionally discovers user skills at ~/.claude/skills/<skill-name>/SKILL.md, one of the scopes its same-name selection resolves across.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-27',
          establishes:
            'CLAUDE_CONFIG_DIR overrides the configuration directory, ~/.claude by default, with settings, session history, and plugins stored under that path — the relocation the <claude-config-dir> spelling names.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude project rule discovery: every `.md` file found recursively under a
 * rule layer's `.claude/rules/` directory, one layer per documented rule
 * layer from the launch working directory through its parents.
 *
 * The directory is discovered recursively — the page shows `frontend/` and
 * `backend/` subdirectories under one `rules/` — and a nested
 * `.claude/rules/` below the working directory loads on demand rather than at
 * launch. That on-demand trigger, and the base an ancestor layer's `paths`
 * globs are resolved against, are what the page leaves open, which is why the
 * statement is `partially-documented`
 * (contracts/vendors/claude-code.md § Documented Repository behavior).
 *
 * A rule without `paths` loads at launch with the same priority as
 * `.claude/CLAUDE.md`; one with `paths` applies only while Claude works with
 * a matching file. Recording that grants nothing: this product evaluates no
 * glob against a filesystem path and observes no session (FR-009).
 */
export const CLAUDE_REPO_RULES_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.rules',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // The directory, not a glob: a vendor locator is documentation rather
        // than an Inspector selector, so the recursion is the `traversal`
        // field's to state (contracts/inspection-path-allowlist.md § "Vendor
        // locators are not Inspector matchers").
        relativeSelector: '.claude/rules/',
        // Everything below that directory, which is the recursion the page
        // states plainly. The layer chain this directory is looked for on,
        // and the on-demand reach into a nested `.claude/rules/`, are the two
        // walks one field cannot also carry; they are what leaves the record
        // `partially-documented`, and what the Inspector's own rule expresses
        // through its two recursive steps (FR-003).
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Organize rules with .claude/rules/'],
          reviewedOn: '2026-08-27',
          establishes:
            "Markdown files placed in a project's .claude/rules/ directory are all discovered recursively, so rules may be organized into subdirectories; a rule without paths frontmatter loads at launch with the same priority as .claude/CLAUDE.md, while a rule with paths applies only when Claude works with a file matching one of its glob patterns. The section states neither the trigger that loads a nested .claude/rules/ directory on demand nor the base an ancestor layer resolves its paths globs against.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude shared project settings: the file a project's own `.claude/` holds
 * and a team checks into source control, whose keys include the permission
 * policy this product recognizes as its own kind.
 *
 * The exact launch directory: the page names `.claude/settings.json` as the
 * project folder's file and documents no ancestor walk for it, so the locator
 * is `exact` like the MCP carrier's and unlike the instruction lookups this
 * vendor also documents.
 *
 * `documented`: where the file lives, and what committing it reaches, are both
 * stated. What a session does with it is runtime this tool never observes
 * (FR-009).
 */
export const CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.settings.shared',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: './.claude/settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: [
            'Settings files and who they affect',
            'Compare the scope of each settings file',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            "A project's shared settings are .claude/settings.json in the project folder, which a team checks into source control; a teammate's clone and a cloud session have the file only once it is committed, as that checkout's own copy rather than as this machine's file being read from elsewhere.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude personal project settings: the file that stays out of the
 * repository's commits, and which carries the permission rules a reader
 * approved permanently.
 *
 * Its own statement rather than the shared file's second selector, because
 * the two differ in the one thing a locator says: where the file is. Claude
 * Code keeps this one at the git repository root resolved through worktrees,
 * so a session started in a subdirectory writes and reads it above the
 * launch directory.
 *
 * `partially-documented`: the exceptions that keep the file in the starting
 * directory — outside a repository, a repository root that is the home
 * directory, Windows, and a root whose `.git` or `.claude` entry another user
 * owns — turn on runtime and host facts this tool never observes (FR-009).
 * The Inspector reads the launch directory's copy, which is the one it can
 * name from a path.
 */
export const CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.settings.local',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        // The repository root, because that is where the vendor keeps this
        // file — a locator states the vendor's own lookup, not where this
        // product reads (contracts/inspection-path-allowlist.md § "Vendor
        // locators are not Inspector matchers"). The documented exceptions
        // that put it in the starting directory instead are what keeps the
        // record `partially-documented`; the Inspector's own matcher admits
        // the launch directory's copy, which is the one it can name.
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: './.claude/settings.local.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: [
            'Compare the scope of each settings file',
            'Where Claude Code keeps the local file in a git repository',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            "A project's personal settings are .claude/settings.local.json, which is that project's alone and which Claude Code keeps at the git repository root resolved through worktrees — staying in the starting directory outside a repository, when the repository root is the home directory, on Windows, and when the root or its .git or .claude entry is not owned by the user — while a permission rule in it keeps resolving from the directory Claude Code was started in.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User settings: the configuration directory's own `settings.json`,
 * which applies to every project.
 *
 * Recorded for maintenance and for the precedence strategy that composes it;
 * it expands no Global inspection, and `claude.excluded.user-runtime` keeps
 * the surface out of the read allowlist (contracts/vendors/claude-code.md
 * § Documented User behavior).
 */
export const CLAUDE_USER_SETTINGS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.settings',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: './settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: ['Compare the scope of each settings file'],
          reviewedOn: '2026-08-27',
          establishes:
            'User settings live at ~/.claude/settings.json and apply to every project on the machine, and to nothing on a teammate machine or in a cloud session.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User rules: the `rules/` directory of the Claude configuration
 * directory, loaded before the project layers.
 *
 * `partially-documented`, and the direct children alone: the page's recursion
 * sentence — "All `.md` files are discovered recursively" — is written about a
 * project's `.claude/rules/`, while the User-level section names the directory,
 * states that its rules apply to every project and load before project rules,
 * and shows a flat pair of files. Whether a nested subdirectory of the user
 * directory is discovered is left unstated, so this record claims the depth the
 * page shows rather than carrying the project statement's recursion across
 * scopes — the same reading `codex.behavior.user.rules` takes of its own
 * vendor's one-sentence user statement.
 *
 * Recorded for maintenance and for the layering strategy that composes it; it
 * expands no Global inspection, and `claude.excluded.user-runtime` keeps the
 * surface out of the read allowlist (contracts/vendors/claude-code.md
 * § Documented User behavior).
 */
export const CLAUDE_USER_RULES_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.rules',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        // The direct children the User-level section's own example shows; the
        // project statement's recursion is not written about this scope.
        relativeSelector: 'rules/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Organize rules with .claude/rules/'],
          reviewedOn: '2026-08-27',
          establishes:
            'Personal rules in ~/.claude/rules/ apply to every project on the machine and are loaded before project rules, which gives project rules the higher priority.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude subagent project memory: the directory a subagent whose frontmatter
 * declares `memory: project` reads and writes across conversations, at
 * `<project-root>/.claude/agent-memory/<agent-name>/`.
 *
 * Runtime state rather than candidate discovery, which is why no rule admits
 * it: the directory is written by a running subagent, its content is that
 * session's accumulated notes, and the Inspector reports authored
 * customizations. Recorded because `claude.agent-context.composition`
 * composes it — the memory scope decides part of a spawned subagent's initial
 * context — so shipping the strategy without this statement would leave the
 * dangling edge the contract gate rejects.
 */
export const CLAUDE_REPO_AGENT_MEMORY_PROJECT_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.agent-memory.project',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.claude/agent-memory/<agent-name>/',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Enable persistent memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'A subagent whose frontmatter declares memory: project keeps its persistent directory at .claude/agent-memory/<name-of-agent>/, whose MEMORY.md prefix is injected into that subagent’s system prompt when auto memory is enabled.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude subagent local memory: the same directory one scope narrower, at
 * `<project-root>/.claude/agent-memory-local/<agent-name>/`, selected by
 * `memory: local`. Its own statement rather than a variant of the project
 * scope because the two are different locations a subagent's frontmatter
 * chooses between, and a strategy naming one must not be read as naming the
 * other (data-model.md § VendorBehaviorStatement).
 */
export const CLAUDE_REPO_AGENT_MEMORY_LOCAL_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.agent-memory.local',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.claude/agent-memory-local/<agent-name>/',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Enable persistent memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'A subagent whose frontmatter declares memory: local keeps its persistent directory at .claude/agent-memory-local/<name-of-agent>/, the project-specific scope documented as the one not checked into version control.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User subagents. Recorded for maintenance only: it expands no Global
 * inspection, and `claude.excluded.user-runtime` keeps the surface out of the
 * read allowlist (FR-016, FR-018). It is shipped here because
 * `claude.agents.selection` and `claude.agent-context.composition` both
 * compose it, and a strategy naming a statement no catalog holds is the
 * dangling edge the contract gate rejects.
 */
export const CLAUDE_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.agents',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'Markdown files recursively under agents/',
        // The page names one fixed directory and says it is scanned
        // recursively; there is no chain to walk, so the traversal is the
        // subtree of that exact location rather than an ancestor walk.
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Choose the subagent scope'],
          reviewedOn: '2026-08-27',
          establishes:
            'User subagents live at ~/.claude/agents/, are available in every project, are scanned recursively so definitions can be organized into subfolders, and rank below the current project scope when two scopes declare one name.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude User subagent memory. Recorded for maintenance only, on the same
 * terms as the User subagents above: it is runtime state under the Claude
 * configuration directory, excluded by `claude.excluded.user-runtime`, and
 * shipped because `claude.agent-context.composition` composes it.
 */
export const CLAUDE_USER_AGENT_MEMORY_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.agent-memory',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'agent-memory/<agent-name>/',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Enable persistent memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'A subagent whose frontmatter declares memory: user keeps its persistent directory at ~/.claude/agent-memory/<name-of-agent>/, the scope documented for learnings that should apply across all projects.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude auto memory: the per-project memory the main conversation maintains
 * under the Claude configuration directory. Recorded for maintenance only and
 * excluded by `claude.excluded.user-runtime`.
 *
 * It is composed by `claude.agent-context.composition` as an absence: the
 * page states that the main conversation's auto memory is *not* loaded into a
 * non-fork subagent, and that a subagent's own `memory` field is what gives it
 * persistent memory instead. A statement the strategy consumes so it can
 * record that boundary is still a statement it consumes
 * (contracts/runtime-composition.md § claude.agent-context.composition).
 */
export const CLAUDE_USER_AUTO_MEMORY_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.auto-memory',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'projects/<project-key>/memory/MEMORY.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Auto memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'Auto memory keeps its files under the Claude configuration directory per project and loads a startup prefix with topic files fetched on demand.',
        },
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['What loads at startup', 'Enable persistent memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'The main conversation’s auto memory is not loaded into a non-fork subagent — a subagent’s own memory field is what gives it persistent memory instead — and turning auto memory off makes that field have no effect at all.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude Code Repository output styles: the direct Markdown children of every
 * `.claude/output-styles/` between the launch working directory and the
 * repository root (output-styles page § Create a custom output style).
 *
 * The layer chain is the traversal — the same upward walk the skills lookup
 * documents — and within a layer the page names direct files rather than a
 * subtree: it says project styles load from every such directory between the
 * working directory and the repository root, and nothing about descending
 * into one. `documented` because the page states the locations, the file
 * shape, and the same-name outcome together; which layer a session actually
 * reaches is runtime this product never observes (FR-009).
 */
export const CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR = {
  behaviorId: 'claude.behavior.repo.output-style',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // The vendor's own spelling: the directory and the files it names
        // directly, which is documentation rather than an Inspector selector
        // (contracts/inspection-path-allowlist.md § "Vendor locators are not
        // Inspector matchers").
        relativeSelector: '.claude/output-styles/*.md',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.output-styles.locations',
          url: 'https://code.claude.com/docs/en/output-styles',
          officialHost: 'code.claude.com',
          sections: ['Create a custom output style', 'How output styles work'],
          reviewedOn: '2026-08-27',
          establishes:
            'A custom output style is a Markdown file of frontmatter and instructions saved at the User, project, or managed-policy level; project styles load from every .claude/output-styles/ between the working directory and the repository root, the file name becomes the style name unless the frontmatter sets name, and the instructions are added to the end of the system prompt.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude Code User output styles under the Claude configuration directory,
 * recorded so `claude.output-style.selection` can name the layer below the
 * project ones and `claude.excluded.user-runtime` can name what it leaves out
 * (contracts/vendors/claude-code.md § Documented User behavior). A
 * non-authorizing statement: which files of that layer are read is
 * `claude.global.output-style`'s to say, and a statement grants no read.
 */
export const CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.output-style',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'output-styles/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.output-styles.locations',
          url: 'https://code.claude.com/docs/en/output-styles',
          officialHost: 'code.claude.com',
          sections: ['Create a custom output style'],
          reviewedOn: '2026-08-27',
          establishes:
            'A custom output style can be saved at the User level in ~/.claude/output-styles, beside the project and managed-policy levels.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude custom keyboard shortcuts: the one `keybindings.json` in the
 * configuration directory.
 *
 * Non-authorizing, and excluded (`claude.excluded.user-runtime`): the file is
 * a preference about the terminal user interface, not an input the agent
 * reads, so it is not a customization this product inspects — the exclusion
 * names it so the consent flow can say what the home holds beside the
 * admitted files.
 */
export const CLAUDE_USER_KEYBINDINGS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.keybindings',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'keybindings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.directory.file-reference',
          url: 'https://code.claude.com/docs/en/claude-directory',
          officialHost: 'code.claude.com',
          sections: ['File reference'],
          reviewedOn: '2026-08-27',
          establishes:
            'The directory reference lists keybindings.json at the global scope as custom keyboard shortcuts — a terminal-UI preference the reader edits, not guidance the agent loads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude custom color themes: `.json` files under the configuration
 * directory's `themes/`.
 *
 * Non-authorizing, and excluded (`claude.excluded.user-runtime`) for the
 * reason the keybindings file is: a color theme styles the terminal user
 * interface and is never an input the agent reads.
 */
export const CLAUDE_USER_THEMES_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.themes',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'themes/*.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.directory.file-reference',
          url: 'https://code.claude.com/docs/en/claude-directory',
          officialHost: 'code.claude.com',
          sections: ['File reference'],
          reviewedOn: '2026-08-27',
          establishes:
            'The directory reference lists themes/*.json at the global scope as custom color themes — a terminal-UI preference the reader edits, not guidance the agent loads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude dynamic workflows: `.js` files under a `workflows/` directory at both
 * the project and the User scope, each becoming a slash command named after
 * its own filename.
 *
 * Non-authorizing at either scope. A workflow file is a script Claude wrote
 * and the reader saved from the `/workflows` command rather than a
 * customization the reader authored, and it is executable code — so it is User
 * runtime state outside this Source (`claude.excluded.user-runtime`) and no
 * initial-release rule admits it. Only the User scope has a statement of its
 * own because that is the scope the Global consent exclusions have to name;
 * the project scope's exclusion needs no locator, since no Repository rule
 * reaches `.claude/workflows/` in the first place.
 */
export const CLAUDE_USER_WORKFLOWS_BEHAVIOR = {
  behaviorId: 'claude.behavior.user.workflows',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'workflows/*.js',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.directory.file-reference',
          url: 'https://code.claude.com/docs/en/claude-directory',
          officialHost: 'code.claude.com',
          sections: ['File reference'],
          reviewedOn: '2026-08-27',
          establishes:
            'The directory reference lists workflows/*.js at both the project and global scopes, holding dynamic workflow scripts written by Claude and saved from the /workflows command, with each file becoming a /<name> command.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude's contribution to the behavior registry, keyed by `behaviorId` in
 * identifier order. A scope's statements ship together with the strategy that
 * composes them — `claude.skills.selection` spans both skill scopes and
 * `claude.instructions.layering` all four instruction ones — because shipping
 * one alone would leave the dangling edge the contract gate rejects.
 */
export const CLAUDE_BEHAVIOR_STATEMENTS: Readonly<
  Record<ClaudeBehaviorId, VendorBehaviorStatement>
> = {
  [CLAUDE_REPO_AGENT_MEMORY_LOCAL_BEHAVIOR.behaviorId]: CLAUDE_REPO_AGENT_MEMORY_LOCAL_BEHAVIOR,
  [CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR.behaviorId]: CLAUDE_REPO_OUTPUT_STYLE_BEHAVIOR,
  [CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR.behaviorId]: CLAUDE_USER_OUTPUT_STYLE_BEHAVIOR,
  [CLAUDE_REPO_AGENT_MEMORY_PROJECT_BEHAVIOR.behaviorId]: CLAUDE_REPO_AGENT_MEMORY_PROJECT_BEHAVIOR,
  [CLAUDE_REPO_AGENTS_BEHAVIOR.behaviorId]: CLAUDE_REPO_AGENTS_BEHAVIOR,
  [CLAUDE_REPO_COMMANDS_BEHAVIOR.behaviorId]: CLAUDE_REPO_COMMANDS_BEHAVIOR,
  [CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR.behaviorId]: CLAUDE_REPO_CONTAINED_HOOKS_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR.behaviorId]: CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
  [CLAUDE_REPO_MCP_BEHAVIOR.behaviorId]: CLAUDE_REPO_MCP_BEHAVIOR,
  [CLAUDE_REPO_MARKETPLACE_BEHAVIOR.behaviorId]: CLAUDE_REPO_MARKETPLACE_BEHAVIOR,
  [CLAUDE_REPO_PLUGIN_BEHAVIOR.behaviorId]: CLAUDE_REPO_PLUGIN_BEHAVIOR,
  [CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_BEHAVIOR,
  [CLAUDE_REPO_RULES_BEHAVIOR.behaviorId]: CLAUDE_REPO_RULES_BEHAVIOR,
  [CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
  [CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
  [CLAUDE_REPO_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SKILLS_BEHAVIOR,
  [CLAUDE_USER_AGENT_MEMORY_BEHAVIOR.behaviorId]: CLAUDE_USER_AGENT_MEMORY_BEHAVIOR,
  [CLAUDE_USER_AGENTS_BEHAVIOR.behaviorId]: CLAUDE_USER_AGENTS_BEHAVIOR,
  [CLAUDE_USER_AUTO_MEMORY_BEHAVIOR.behaviorId]: CLAUDE_USER_AUTO_MEMORY_BEHAVIOR,
  [CLAUDE_USER_COMMANDS_BEHAVIOR.behaviorId]: CLAUDE_USER_COMMANDS_BEHAVIOR,
  [CLAUDE_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  [CLAUDE_USER_MCP_STATE_BEHAVIOR.behaviorId]: CLAUDE_USER_MCP_STATE_BEHAVIOR,
  [CLAUDE_USER_PLUGINS_BEHAVIOR.behaviorId]: CLAUDE_USER_PLUGINS_BEHAVIOR,
  [CLAUDE_USER_RULES_BEHAVIOR.behaviorId]: CLAUDE_USER_RULES_BEHAVIOR,
  [CLAUDE_USER_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_USER_SETTINGS_BEHAVIOR,
  [CLAUDE_USER_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_USER_SKILLS_BEHAVIOR,
  [CLAUDE_USER_KEYBINDINGS_BEHAVIOR.behaviorId]: CLAUDE_USER_KEYBINDINGS_BEHAVIOR,
  [CLAUDE_USER_THEMES_BEHAVIOR.behaviorId]: CLAUDE_USER_THEMES_BEHAVIOR,
  [CLAUDE_USER_WORKFLOWS_BEHAVIOR.behaviorId]: CLAUDE_USER_WORKFLOWS_BEHAVIOR,
};
