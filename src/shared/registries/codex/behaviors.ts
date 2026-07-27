// OpenAI Codex behavior statements — the implementation counterpart of
// contracts/vendors/openai-codex.md § Documented Repository behavior and
// § Documented User behavior.
//
// A statement says where Codex documents looking for a customization. It is
// not a filesystem matcher and can never authorize a read
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
import type { CodexBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Runtime inputs the documented Codex skill chain depends on before any
 * projection may claim a skill is selected. Shared by the two skill behaviors
 * and their strategy so the three records cannot drift
 * (contracts/runtime-composition.md § `codex.skills.discovery`).
 */
export const CODEX_SKILL_CONDITION_KEYS: readonly ConditionFactKey[] = [
  'surface',
  'engine-version',
  'runtime-cwd',
  'repository-root',
  'scope-availability',
  'feature-state',
  'enablement',
  'selection',
  'managed-policy',
];

/**
 * Codex Repository skill discovery: local clients scan each directory on the
 * upward chain from the runtime `cwd` to the repository root and do not merge
 * same-name skills.
 *
 * The walk stops at the nearest ancestor holding a project-root marker. The
 * marker list is `project_root_markers` in the user's `config.toml`, defaulting
 * to `.git`; an empty list disables root detection so the chain is the working
 * directory alone. That file lives outside every inspected Source, so the
 * override is an unresolved runtime input (`repository-root`) rather than
 * something the Inspector reads.
 */
export const CODEX_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.skills',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.agents/skills/<name>/SKILL.md',
        // The documented lookup walks the runtime `cwd` up to the repository root.
        // The Inspector's own rule is anchored at the selected root instead, because
        // that root *is* the repository root the walk terminates at (FR-001), so one
        // layer of the chain is in scope. The two still live in separate registries
        // because this field records what the vendor does, never what the Inspector
        // may read (FR-003).
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  activationConditions: CODEX_SKILL_CONDITION_KEYS,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.skills',
          url: 'https://learn.chatgpt.com/docs/build-skills.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex loads local skills'],
          reviewedOn: '2026-07-25',
          establishes:
            'Local Codex clients discover repository skills at .agents/skills/<name>/SKILL.md, scanning each directory on the chain from the runtime working directory to the repository root, and do not merge same-name skills.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User skill discovery. Recorded for maintenance only: it expands no
 * Global inspection, and `codex.excluded.user-runtime` keeps the surface out
 * of the read allowlist (FR-015 through FR-018).
 */
export const CODEX_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.skills',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `$HOME/.agents/skills`, not the Codex home: no cited page documents an
        // override that relocates the separate `$HOME/.agents` directories
        // (contracts/vendors/openai-codex.md § Documented User behavior). That
        // makes the base the user's profile data rather than `tool-home`, the
        // selector relative to it, and the traversal exact — the page names one
        // fixed location, not a chain to search.
        lookupBase: 'profile-data',
        relativeSelector: '.agents/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  activationConditions: CODEX_SKILL_CONDITION_KEYS,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.skills',
          url: 'https://learn.chatgpt.com/docs/build-skills.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex loads local skills'],
          reviewedOn: '2026-07-25',
          establishes:
            'Local Codex clients additionally discover user skills at $HOME/.agents/skills/<name>/SKILL.md, alongside repository, admin, and system scopes.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex's contribution to the behavior registry, keyed by `behaviorId`. Both
 * skill statements ship together because `codex.skills.discovery` composes
 * both; shipping one alone would leave the dangling edge the contract gate
 * rejects.
 */
export const CODEX_BEHAVIOR_STATEMENTS: Readonly<
  Record<CodexBehaviorId, VendorBehaviorStatement>
> = {
  [CODEX_REPO_SKILLS_BEHAVIOR.behaviorId]: CODEX_REPO_SKILLS_BEHAVIOR,
  [CODEX_USER_SKILLS_BEHAVIOR.behaviorId]: CODEX_USER_SKILLS_BEHAVIOR,
};
