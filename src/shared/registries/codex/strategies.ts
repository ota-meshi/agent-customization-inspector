// OpenAI Codex composition strategies — the implementation counterpart of the
// Codex rows in contracts/runtime-composition.md.
//
// A strategy explains a documented runtime edge; it never creates one. It
// cannot enumerate a directory, open a relationship target, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging"). It records what a vendor documents about combining its own
// inputs; it states nothing about what a concrete session selected, because
// that depends on runtime this tool never observes.
//
// Each strategy is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union, the computed key would stop
// resolving to a property, and the map's completeness check would break;
// `satisfies` keeps the literal, so a key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { CodexStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Codex skill discovery across Repository, User, admin, and system scopes.
 *
 * The documented outcome for a name collision is that nothing is resolved:
 * Codex does not merge same-name skills and both remain offered, which is
 * `retain-all`. The page defines no precedence or ordering among the four
 * scopes at all, so the second operation is `unknown-order` rather than a
 * selection rule, and the status is `partially-documented`. Whether a concrete skill is offered stays
 * conditional on every key below; the Inspector records the documented edge,
 * never a winner.
 */
export const CODEX_SKILLS_DISCOVERY_STRATEGY = {
  strategyId: 'codex.skills.discovery',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['retain-all', 'unknown-order'],
  documentationStatus: 'partially-documented',
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
            'Skills that share a name across discovery scopes are not merged and both remain available in skill selectors; the section lists the repository, user, admin, and system locations without establishing any precedence or ordering among them.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Codex's contribution to the strategy registry, keyed by `strategyId`. */
export const CODEX_COMPOSITION_STRATEGIES: Readonly<
  Record<CodexStrategyId, RuntimeCompositionStrategy>
> = {
  [CODEX_SKILLS_DISCOVERY_STRATEGY.strategyId]: CODEX_SKILLS_DISCOVERY_STRATEGY,
};
