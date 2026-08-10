// GitHub Copilot composition strategies — the implementation counterpart of
// the Copilot skill rows in contracts/runtime-composition.md.
//
// A strategy explains a documented runtime edge; it never creates one. It
// cannot enumerate a directory, open a relationship target, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging"). It records what a vendor documents about combining its own
// inputs; it states nothing about what a concrete session selected, because
// that depends on runtime this tool never observes.
//
// Copilot's skill selection is three strategies, not one: VS Code, CLI, and
// Cloud document incompatible selection — a documented first-found order on
// the CLI, undocumented duplicate precedence elsewhere — and collapsing them
// would invent a product-wide rule no surface documents (FR-009;
// contracts/runtime-composition.md § Copilot rows).
//
// Each strategy is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union, the computed key would stop
// resolving to a property, and the map's completeness check would break;
// `satisfies` keeps the literal, so a key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { CopilotStrategyId } from '../identifier-types';
import type { RuntimeCompositionStrategy } from '../strategy-types';

/**
 * Copilot VS Code skill selection: discover metadata from enabled locations,
 * then progressively load a relevant skill. `select-first` records the
 * documented progressive selection of a relevant skill; `unknown-order`
 * records that cross-location duplicate-name precedence is not documented, so
 * the pipeline establishes no duplicate-name winner
 * (contracts/runtime-composition.md § copilot.vscode.skills.selection: "do not
 * invent a duplicate-name winner").
 */
export const COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'copilot.vscode.skills.selection',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['filter', 'select-first', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['How Copilot uses agent skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'Copilot loads a skill progressively when it judges the skill relevant to the task, which is the selection step this pipeline records.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Agent skills settings'],
          reviewedOn: '2026-07-15',
          establishes:
            'Which skill locations participate is setting-filtered before any selection happens.',
        },
        {
          sourceId: 'vscode.copilot.skills',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-skills',
          officialHost: 'code.visualstudio.com',
          sections: ['Create a skill', 'How Copilot uses skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'The Create-a-skill location table documents the workspace and personal skill locations this selection reads across, and Copilot loads a relevant skill progressively — without documenting a duplicate-name precedence among the locations.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI skill selection: resolve the first same-name skill in the
 * documented project, inherited, personal, plugin, custom, built-in, and
 * remote source order, and let a same-name skill outrank a legacy command.
 * The one Copilot surface with a documented duplicate-name winner — which is
 * exactly why it is not the product's statement: the other two surfaces
 * document none, and a grouped row therefore reads the three strategies
 * together as surface-dependent (`skill-resolution.ts`).
 */
export const COPILOT_CLI_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'copilot.cli.skills.selection',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['select-first'],
  // Partial despite the documented skill order: the legacy command anchor and
  // ancestry the same pipeline composes are only partially documented
  // (contracts/runtime-composition.md § Canonical evidence-assessment index).
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations', 'Commands (alternative skill format)'],
          reviewedOn: '2026-07-15',
          establishes:
            'The CLI resolves a duplicate skill name to the first found in its documented source order, and a same-name skill has higher priority than a legacy command.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot Cloud skill selection: progressively load relevant Repository and
 * relayed remote skills, retaining collision behavior as unknown where the
 * Cloud sources do not specify it. As in the VS Code pipeline, `select-first`
 * with `unknown-order` records selection whose duplicate order is not
 * established, so no duplicate-name winner is derived from it.
 */
export const COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY = {
  strategyId: 'copilot.cloud.skills.selection',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['filter', 'select-first', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'Remote skills are projected alongside local skills via the AHP relay and sit last in the documented source order; that order and its name-based priority are the CLI surface’s, so how the Cloud surface itself resolves a collision stays unestablished.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['How Copilot uses agent skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'The cloud agent decides from the prompt and a skill’s description when to load a repository skill, the progressive-selection step this pipeline records; its reviewed sections say nothing about relayed remote skills.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Copilot's contribution to the strategy registry, keyed by `strategyId`. */
export const COPILOT_COMPOSITION_STRATEGIES: Readonly<
  Record<CopilotStrategyId, RuntimeCompositionStrategy>
> = {
  [COPILOT_CLI_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
  [COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
  [COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
};
