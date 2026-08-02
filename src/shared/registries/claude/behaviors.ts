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
import type { ConditionFactKey } from '../../api-types';
import type { ClaudeBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Runtime inputs the documented Claude skill chain depends on before any
 * projection may claim a skill is selected. Shared by the two skill behaviors
 * and their strategy so the three records cannot drift
 * (contracts/runtime-composition.md § `claude.skills.selection`). `worked-path`
 * is here because nested descendant skill directories are discovered lazily as
 * files under them are accessed, so which paths the session worked on decides
 * which layers exist at all.
 */
export const CLAUDE_SKILL_CONDITION_KEYS: readonly ConditionFactKey[] = [
  'surface',
  'engine-version',
  'runtime-cwd',
  'repository-root',
  'worked-path',
  'scope-availability',
  'feature-state',
  'enablement',
  'selection',
  'plugin-state',
  'managed-policy',
];

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
 * expands to descendant inventory and why `worked-path` is one of the
 * conditions above, so neither half of the documented behavior is lost.
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
  activationConditions: CLAUDE_SKILL_CONDITION_KEYS,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live'],
          reviewedOn: '2026-07-25',
          establishes:
            'Claude Code discovers repository skills at .claude/skills/<skill-name>/SKILL.md, with ancestor skill layers discovered at startup and nested descendant skill directories discovered on demand.',
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
  activationConditions: CLAUDE_SKILL_CONDITION_KEYS,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live'],
          reviewedOn: '2026-07-25',
          establishes:
            'Claude Code additionally discovers user skills at <claude-config-dir>/skills/<skill-name>/SKILL.md, one of the scopes its same-name selection resolves across.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Claude's contribution to the behavior registry, keyed by `behaviorId`. Both
 * skill statements ship together because `claude.skills.selection` composes
 * both; shipping one alone would leave the dangling edge the contract gate
 * rejects.
 */
export const CLAUDE_BEHAVIOR_STATEMENTS: Readonly<
  Record<ClaudeBehaviorId, VendorBehaviorStatement>
> = {
  [CLAUDE_REPO_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_REPO_SKILLS_BEHAVIOR,
  [CLAUDE_USER_SKILLS_BEHAVIOR.behaviorId]: CLAUDE_USER_SKILLS_BEHAVIOR,
};
