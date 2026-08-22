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
          reviewedOn: '2026-08-18',
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
          reviewedOn: '2026-08-18',
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
          reviewedOn: '2026-08-18',
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
          reviewedOn: '2026-08-18',
          establishes:
            'User instructions live at ~/.claude/CLAUDE.md and hold personal preferences for all projects, one of the scopes the documented broadest-to-most-specific load order spans.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-20',
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
          reviewedOn: '2026-08-20',
          establishes:
            'Project subagents are Markdown files discovered recursively under .claude/agents/ on each layer walked up from the working directory to the repository root, and directories added with --add-dir contribute their agents too; two same-name files under one directory tree load by filesystem read order rather than a documented precedence.',
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
          reviewedOn: '2026-08-20',
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
          reviewedOn: '2026-08-20',
          establishes:
            'A plugin is installed into a settings scope chosen at installation; its manifest is optional, with components — MCP declarations among them — auto-discovered at default locations under the plugin root or redirected by manifest-declared paths.',
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
          sections: ['Where skills live'],
          reviewedOn: '2026-08-08',
          establishes:
            'Claude Code discovers repository skills at .claude/skills/<skill-name>/SKILL.md, with ancestor skill layers discovered at startup and nested descendant skill directories discovered on demand.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.nested-skill-discovery',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['2.1.6'],
          reviewedOn: '2026-08-06',
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
          reviewedOn: '2026-08-20',
          establishes:
            'User-scope MCP servers — and the local scope private to one project — are stored in user-level state rather than in the project file, two scopes of the documented installation-scope order.',
        },
        {
          sourceId: 'anthropic.claude-code.directory.file-reference',
          url: 'https://code.claude.com/docs/en/claude-directory',
          officialHost: 'code.claude.com',
          sections: ['File reference'],
          reviewedOn: '2026-07-25',
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
          reviewedOn: '2026-08-20',
          establishes:
            'Plugin enablement is recorded per installation scope in settings files — the user scope in ~/.claude/settings.json — and marketplace plugins are copied into the local plugin cache at ~/.claude/plugins/cache, which is what makes plugin-provided servers user-side installation state rather than a repository fact.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-20',
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
          reviewedOn: '2026-08-08',
          establishes:
            'Claude Code additionally discovers user skills at ~/.claude/skills/<skill-name>/SKILL.md, one of the scopes its same-name selection resolves across.',
        },
        {
          sourceId: 'anthropic.claude-code.env-vars',
          url: 'https://code.claude.com/docs/en/env-vars',
          officialHost: 'code.claude.com',
          sections: ['Variables'],
          reviewedOn: '2026-08-20',
          establishes:
            'CLAUDE_CONFIG_DIR overrides the configuration directory, ~/.claude by default, with settings, session history, and plugins stored under that path — the relocation the <claude-config-dir> spelling names.',
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
          reviewedOn: '2026-08-18',
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
          reviewedOn: '2026-08-22',
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
          reviewedOn: '2026-08-22',
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
          reviewedOn: '2026-08-22',
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
          reviewedOn: '2026-08-18',
          establishes:
            'Personal rules in ~/.claude/rules/ apply to every project on the machine and are loaded before project rules, which gives project rules the higher priority.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

export const CLAUDE_BEHAVIOR_STATEMENTS: Readonly<
  Record<ClaudeBehaviorId, VendorBehaviorStatement>
> = {
  [CLAUDE_REPO_AGENTS_BEHAVIOR.behaviorId]: CLAUDE_REPO_AGENTS_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR.behaviorId]: CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
  [CLAUDE_REPO_MCP_BEHAVIOR.behaviorId]: CLAUDE_REPO_MCP_BEHAVIOR,
  [CLAUDE_REPO_PLUGIN_BEHAVIOR.behaviorId]: CLAUDE_REPO_PLUGIN_BEHAVIOR,
  [CLAUDE_REPO_RULES_BEHAVIOR.behaviorId]: CLAUDE_REPO_RULES_BEHAVIOR,
  [CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_REPO_LOCAL_SETTINGS_BEHAVIOR,
  [CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SHARED_SETTINGS_BEHAVIOR,
  [CLAUDE_REPO_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SKILLS_BEHAVIOR,
  [CLAUDE_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  [CLAUDE_USER_MCP_STATE_BEHAVIOR.behaviorId]: CLAUDE_USER_MCP_STATE_BEHAVIOR,
  [CLAUDE_USER_PLUGINS_BEHAVIOR.behaviorId]: CLAUDE_USER_PLUGINS_BEHAVIOR,
  [CLAUDE_USER_RULES_BEHAVIOR.behaviorId]: CLAUDE_USER_RULES_BEHAVIOR,
  [CLAUDE_USER_SETTINGS_BEHAVIOR.behaviorId]: CLAUDE_USER_SETTINGS_BEHAVIOR,
  [CLAUDE_USER_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_USER_SKILLS_BEHAVIOR,
};
