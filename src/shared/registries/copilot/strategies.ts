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
 * Copilot VS Code instruction layering: filter the enabled and applicable
 * personal, Repository, and organization inputs, then combine all of them in
 * the documented personal-before-Repository-before-organization layer order.
 *
 * `append` with `unknown-order` is the whole point: every applicable file is
 * still given to the model, and the order *within* one layer is not
 * documented, so no file in a layer outranks its neighbours. `[experimental]`
 * records that the nested `AGENTS.md` half of the layer is model-decided
 * (contracts/runtime-composition.md § copilot.vscode.instructions.layering).
 */
export const COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY = {
  strategyId: 'copilot.vscode.instructions.layering',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['filter', 'append', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: [
            'Types of instruction files',
            'Instruction priority',
            'Use multiple AGENTS.md files (experimental)',
          ],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code combines every applicable instruction file into the chat context with no specific order guaranteed; when conflicts occur the documented priority is personal, then repository, then organization instructions, with every applicable set still provided; and nested AGENTS.md selection is an experimental setting that leaves the choice to the model.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom instructions settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'Enablement and location settings decide which instruction inputs participate at all, which is the filtering step ahead of the layer order.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI instruction layering: collect the applicable standard-location
 * and User instructions, filter them by `applyTo` and session disablement,
 * drop documented identical duplicates, and combine the remainder.
 *
 * The deduplication is documented for three categories — identical user-level
 * root, repository-wide, and agent instruction files — and not for
 * path-specific ones; the pipeline's `deduplicate` step records that the
 * documented composition has such a step, and the category scoping stays in
 * the contract's projection prose and this record's own citation, because an
 * operation list cannot carry a per-category qualifier.
 *
 * `partially-documented`: the reference establishes deduplication but no
 * general precedence among the non-identical files that survive it, so
 * `unknown-order` is the honest last step rather than an invented winner.
 */
export const COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY = {
  strategyId: 'copilot.cli.instructions.layering',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['filter', 'deduplicate', 'append', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['How multiple instruction files interact', 'Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI combines the applicable user-level and repository instruction files, removes duplicate copies of identical user-level copilot-instructions.md, repository-wide, and agent instruction files — path-specific files are not in that deduplication list — defines no general precedence order, includes path-specific files only when their applyTo matches a file it is working with, and skips a file disabled with the /instructions command.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix names the repository and personal instruction types this surface draws on, which is the input set the pipeline filters and combines.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot Cloud instruction layering: filter the root, path-specific, nearest
 * `AGENTS.md`, and root-alternative inputs for the worked path, then combine
 * the applicable Repository and organization layers in the documented
 * Repository-before-organization order.
 *
 * `select-closest` is the nearest-`AGENTS.md` step and belongs to this surface
 * alone; hosted personal Chat instructions are deliberately not an input,
 * because the support matrix does not list them as a Cloud-agent layer.
 *
 * `partially-documented`, with `unknown-order` closing the pipeline: the
 * layer order is documented, but the order among the combined files inside
 * the repository layer is not, and neither is the coexistence of the
 * agent-instruction alternatives — an `AGENTS.md` beside a root `CLAUDE.md`,
 * or both alternatives at once (contracts/runtime-composition.md § Canonical
 * evidence-assessment index).
 */
export const COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY = {
  strategyId: 'copilot.cloud.instructions.layering',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['filter', 'select-closest', 'append', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions', 'Custom instructions in use'],
          reviewedOn: '2026-08-19',
          establishes:
            'The repository-wide file and the path-specific files whose pattern matches are used together, the nearest AGENTS.md in the directory tree takes precedence among agent files, and repository instructions are prioritized before organization instructions with all relevant sets still provided; the order among the combined files inside the repository layer and the coexistence of the agent-instruction alternatives are not established.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists personal instructions for Copilot Chat and not for the cloud agent, which is why no hosted personal layer is projected into this pipeline.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

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
          reviewedOn: '2026-08-19',
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
  [COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_CLI_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
  [COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
  [COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
};
