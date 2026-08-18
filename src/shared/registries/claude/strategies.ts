// Anthropic Claude Code composition strategies — the implementation
// counterpart of the Claude rows in contracts/runtime-composition.md.
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
import type { ClaudeStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Claude instruction layering: the User file, each ancestor directory's
 * files, the launch directory's own, and the lazily discovered descendant
 * ones are all added to context in load order, broadest scope first
 * (`append`).
 *
 * One operation and deliberately no second: every discovered file is added
 * rather than one winning, and the page states that there is no hard
 * precedence between levels — conflicting natural-language instructions are
 * left to the model rather than resolved into a setting-style winner. A
 * `select-first` or `replace` here would record a resolution the vendor does
 * not document (contracts/runtime-composition.md § claude.instructions.layering).
 */
export const CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY = {
  strategyId: 'claude.instructions.layering',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['append'],
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
            'The documented scopes load from broadest to most specific, all discovered files are concatenated into context rather than overriding each other, content is ordered from the filesystem root down to the working directory, and within one directory CLAUDE.local.md is appended after CLAUDE.md.',
        },
        {
          sourceId: 'anthropic.claude-code.sdk.setting-sources',
          url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features',
          officialHost: 'code.claude.com',
          sections: ['CLAUDE.md load locations'],
          reviewedOn: '2026-08-18',
          establishes:
            'All levels are additive — if both project and user files exist the agent sees both — and there is no hard precedence rule between levels, so conflicting instructions have no documented deterministic winner.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude skill selection for same-name skills within one root.
 *
 * The documented outcome for a name clash inside one repository is that every
 * definition stays available — a nested one under a directory-qualified
 * command — and Claude picks the variant matching the files it is working on:
 * `retain-all`, then `select-closest`. The enterprise-over-personal-over-
 * project precedence the same page documents is a rule between levels, which
 * this product lists as separate Sources, so it is not the statement a
 * repository row's collision gets. The Inspector records the documented edge,
 * never a winner.
 */
export const CLAUDE_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'claude.skills.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['retain-all', 'select-closest'],
  // Both operations are version-anchored: nested-clash retention at 2.1.178+
  // (changelog § 2.1.178), and automatic working-context invocation from an
  // unqualified name at 2.1.203+ (skills page § Where skills live). The record
  // stays partial because exact IDE surface availability remains conditional.
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live', 'How a skill gets its command name'],
          reviewedOn: '2026-08-08',
          establishes:
            'Within one root, a nested skill sharing a name with another stays available under a directory-qualified command; when the unqualified name is used, Claude Code 2.1.203+ can invoke the variant matching the files being worked on. The name field of a personal or project skill sets only the display label, and the enterprise-over-personal-over-project precedence is a rule between levels, not within one.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.nested-skill-discovery',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['2.1.178'],
          reviewedOn: '2026-08-06',
          establishes:
            'Release 2.1.178 introduces the nested-clash retention this strategy records — on a name clash the nested skill appears as <dir>:<name> so both stay available — and anchors the retention half of this pipeline at 2.1.178+.',
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

/** Claude's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const CLAUDE_COMPOSITION_STRATEGIES: Readonly<
  Record<ClaudeStrategyId, RuntimeCompositionStrategy>
> = {
  [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  [CLAUDE_SKILLS_SELECTION_STRATEGY.strategyId]: CLAUDE_SKILLS_SELECTION_STRATEGY,
};
