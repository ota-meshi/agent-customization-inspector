// Anthropic Claude Code composition strategies — the implementation
// counterpart of the Claude rows in contracts/runtime-composition.md.
//
// A strategy explains a documented runtime edge; it never creates one. It
// cannot enumerate a directory, open a relationship target, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging"). Its `requiredConditionKeys` are the inputs that must all
// be known before a projection may state a terminal applicability result — an
// unavailable input keeps the projection non-terminal (`conditional`, per the
// decision table's row 6) and never defaults to satisfied.
//
// Each strategy is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union, the computed key would stop
// resolving to a property, and the map's completeness check would break;
// `satisfies` keeps the literal, so a key cannot disagree with the record it
// points at.
import { CLAUDE_SKILL_CONDITION_KEYS } from './behaviors';
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { ClaudeStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Claude skill selection across enterprise, User, project, and bundled scopes.
 *
 * The documented outcome for a name collision is a winner: same-name skills
 * resolve in enterprise, User, project, then bundled order, which is
 * `select-first`. Plugin skills stay namespaced by their plugin and a skill
 * wins over a legacy command of the same name — refinements of the same
 * documented selection, not further operations. Whether a concrete skill is
 * offered stays conditional on every key below; the Inspector records the
 * documented edge, never a winner.
 */
export const CLAUDE_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'claude.skills.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['select-first'],
  // The same list the two skill behaviors declare: one definition, so the
  // strategy and its inputs cannot disagree about what must be known.
  requiredConditionKeys: CLAUDE_SKILL_CONDITION_KEYS,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live', 'How a skill gets its command name'],
          reviewedOn: '2026-07-25',
          establishes:
            'Same-name skills resolve in enterprise, user, project, then bundled order; plugin skills stay namespaced by their plugin, and a skill wins over a legacy command with the same name.',
        },
        {
          sourceId: 'anthropic.claude-code.ide.shared-differences',
          url: 'https://code.claude.com/docs/en/ide-integrations',
          officialHost: 'code.claude.com',
          sections: ['VS Code extension vs. Claude Code CLI'],
          reviewedOn: '2026-07-25',
          establishes:
            'The CLI and the IDE integrations share the same configuration while feature availability differs by surface, so which surface is running remains a condition of any selection outcome.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Claude's contribution to the strategy registry, keyed by `strategyId`. */
export const CLAUDE_COMPOSITION_STRATEGIES: Readonly<
  Record<ClaudeStrategyId, RuntimeCompositionStrategy>
> = {
  [CLAUDE_SKILLS_SELECTION_STRATEGY.strategyId]: CLAUDE_SKILLS_SELECTION_STRATEGY,
};
