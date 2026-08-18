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
            'Claude Code additionally discovers user skills at <claude-config-dir>/skills/<skill-name>/SKILL.md, one of the scopes its same-name selection resolves across.',
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
  [CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_ANCESTOR_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR.behaviorId]:
    CLAUDE_REPO_INSTRUCTIONS_DESCENDANT_BEHAVIOR,
  [CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR.behaviorId]: CLAUDE_REPO_INSTRUCTIONS_LAUNCH_BEHAVIOR,
  [CLAUDE_REPO_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SKILLS_BEHAVIOR,
  [CLAUDE_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: CLAUDE_USER_INSTRUCTIONS_BEHAVIOR,
  [CLAUDE_USER_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_USER_SKILLS_BEHAVIOR,
};
