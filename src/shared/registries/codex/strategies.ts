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
 * Codex config-layer resolution: User/profile/CLI values and every trusted
 * project `.codex/config.toml` layer from the project root down to the
 * runtime `cwd` merge per key (`merge-map`), a closer layer's value replaces
 * a broader one's (`replace`), and the closest applicable value wins
 * (`select-closest`).
 *
 * The configured instruction fallback basenames are configuration values this
 * resolution supplies, which is why the `codex.repo.config` rule and the
 * `codex.derived.fallback-basename` derivation name this strategy as their
 * explanation. A strategy explains a documented runtime edge and never
 * authorizes a read (contracts/runtime-composition.md
 * § codex.config.precedence).
 */
export const CODEX_CONFIG_PRECEDENCE_STRATEGY = {
  strategyId: 'codex.config.precedence',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['merge-map', 'replace', 'select-closest'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-17',
          establishes:
            'Codex resolves CLI overrides, trusted project layers from root to cwd, profile files, User config, and system config in that fixed order, using the closest applicable value for the same key.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Codex instruction layering: select the first non-empty file per documented
 * location — the User fallback first, then each project-root-to-`cwd`
 * directory in the documented filename order (`select-first`) — concatenate
 * the selected files broad to narrow (`concatenate`), and stop at the
 * upstream project-document byte budget (`filter`).
 *
 * `documented` even though excluded higher-scope settings can leave the
 * configured fallback names and the exact budget unknown at inspection time:
 * the pipeline itself is documented, and what a concrete session selects
 * stays conditional on runtime inputs this tool never observes
 * (contracts/runtime-composition.md § codex.instructions.layering).
 */
export const CODEX_INSTRUCTIONS_LAYERING_STRATEGY = {
  strategyId: 'codex.instructions.layering',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['select-first', 'concatenate', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.agents-md',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['How Codex discovers guidance', 'Customize fallback filenames'],
          reviewedOn: '2026-08-17',
          establishes:
            'Codex selects at most one non-empty instruction file per directory in the documented filename order and concatenates the selections broad to narrow, from the global fallback through the project chain toward the runtime cwd, stopping at the project_doc_max_bytes budget; that budget and the fallback filenames are configuration values resolved outside the instruction files themselves.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

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

/** Codex's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const CODEX_COMPOSITION_STRATEGIES: Readonly<
  Record<CodexStrategyId, RuntimeCompositionStrategy>
> = {
  [CODEX_CONFIG_PRECEDENCE_STRATEGY.strategyId]: CODEX_CONFIG_PRECEDENCE_STRATEGY,
  [CODEX_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: CODEX_INSTRUCTIONS_LAYERING_STRATEGY,
  [CODEX_SKILLS_DISCOVERY_STRATEGY.strategyId]: CODEX_SKILLS_DISCOVERY_STRATEGY,
};
