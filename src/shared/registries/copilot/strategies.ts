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
          reviewedOn: '2026-08-27',
          establishes:
            'Copilot CLI combines the applicable user-level and repository instruction files, removes duplicate copies of identical user-level copilot-instructions.md, repository-wide, and agent instruction files — path-specific files are not in that deduplication list — defines no general precedence order, includes path-specific files only when their applyTo matches a file it is working with, and skips a file disabled with the /instructions command.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
          establishes:
            'Remote skills are projected alongside local skills via the AHP relay and sit last in the documented source order; that order and its name-based priority are the CLI surface’s, so how the Cloud surface itself resolves a collision stays unestablished.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['How Copilot uses agent skills'],
          reviewedOn: '2026-08-27',
          establishes:
            'The cloud agent decides from the prompt and a skill’s description when to load a repository skill, the progressive-selection step this pipeline records; its reviewed sections say nothing about relayed remote skills.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI MCP selection for same-name server declarations.
 *
 * The documented outcome for a name declared in several sources is that the
 * higher-priority source's server is used — session additional configuration,
 * plugin-provided servers, workspace files, then the User configuration —
 * `select-first` of whole entries, so a closer source `replace`s a broader
 * one's rather than merging fields with it. Among the workspace files the
 * order is documented too: definitions in files closer to the working
 * directory take precedence, and within one directory `.mcp.json` takes
 * precedence over `.github/mcp.json`. The Inspector records the documented
 * edge, never a winner: which source a concrete session selects depends on
 * runtime state — trust, session flags, installed plugins — this tool never
 * observes.
 */
export const COPILOT_CLI_MCP_SELECTION_STRATEGY = {
  strategyId: 'copilot.cli.mcp.selection',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['select-first', 'replace'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['MCP server configuration'],
          reviewedOn: '2026-08-27',
          establishes:
            'Servers from different sources merge in priority order — the --additional-mcp-config option, plugin-provided servers, workspace files, then ~/.copilot/mcp-config.json — and when servers share a name the higher-priority source takes precedence as a whole entry.',
        },
        {
          sourceId: 'github.copilot.cli.mcp',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers',
          officialHost: 'docs.github.com',
          sections: ['Adding per-repository MCP servers'],
          reviewedOn: '2026-08-27',
          establishes:
            'Among the project-level files, same-name definitions in files closer to the working directory take precedence, .mcp.json takes precedence over .github/mcp.json in the same directory, and project-level definitions take precedence over ~/.copilot/mcp-config.json.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot VS Code MCP selection across its documented inputs.
 *
 * For `.vscode/mcp.json` the current guide documents the `servers` input the
 * pipeline merges (`merge-map`), with an enabled same-name server replacing
 * a disabled duplicate (`replace`). For VS Code 1.118+ root `.mcp.json` the
 * release note announces most-specific same-name deduplication without
 * defining that file's schema or a total order across the root, `.vscode`,
 * User, and plugin inputs — `unknown-order` — so every unresolved winner
 * stays recorded as the conflict or unknown condition it is rather than
 * composed into an inferred map. An agent profile is deliberately not an
 * input here: the custom-agents reference documents its `mcp-servers` field
 * as not used in VS Code custom agents. The Inspector records the documented
 * edges, never a winner: trust, enablement, and settings inputs are runtime
 * state this tool never observes (FR-009).
 */
export const COPILOT_VSCODE_MCP_SELECTION_STRATEGY = {
  strategyId: 'copilot.vscode.mcp.selection',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['merge-map', 'replace', 'unknown-order'],
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.mcp',
          url: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure the mcp.json file', 'MCP server trust'],
          reviewedOn: '2026-08-20',
          establishes:
            'The guide composes the workspace .vscode/mcp.json and the user-profile configuration as the two mcp.json inputs, each a servers map merged into the available server set, and gates starting any configured server behind trust.',
        },
        {
          sourceId: 'vscode.copilot.mcp.workspace-root-release',
          url: 'https://code.visualstudio.com/updates/v1_118',
          officialHost: 'code.visualstudio.com',
          sections: ['Workspace .mcp.json files and server deduplication'],
          reviewedOn: '2026-08-20',
          establishes:
            'The 1.118 release adds workspace-root .mcp.json input and a most-specific same-name deduplication rule that enables one server and disables its duplicates, without defining a total order across the root, .vscode, User, and plugin inputs - the unknown-order operation this pipeline retains.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot cloud hosted MCP selection: out-of-the-box configurations are
 * processed first, then a selected custom agent's `mcp-servers`, then the
 * repository's MCP settings, each level able to override settings from the
 * previous (`replace`). `partially-documented`, because that is all the page
 * establishes — it fixes the three-level processing order and the
 * later-overrides-earlier direction, but not the override's unit — whether a
 * later level replaces a whole same-name entry or individual settings — nor
 * any merge rule for non-conflicting servers across levels. The inputs are
 * hosted rather than local files, so the pipeline composes registry facts
 * alone and no session surface projects it (FR-009).
 */
export const COPILOT_CLOUD_MCP_SELECTION_STRATEGY = {
  strategyId: 'copilot.cloud.mcp.selection',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['replace'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['MCP server configurations'],
          reviewedOn: '2026-08-20',
          establishes:
            'The cloud agent processes out-of-the-box MCP configurations first, followed by the custom agent MCP configuration, and finally MCP configurations specified through repository settings, each level able to override settings from the previous one; the page does not fix the override unit or any cross-level merge rule.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot VS Code custom-agent selection: keep the profiles this surface can
 * run — a profile scoped by `target` to `vscode`, or one that sets no target
 * and therefore defaults to both environments (`filter`) — pick the one a
 * reader invokes or the model infers (`select-first`), and record that
 * duplicate names across the workspace, User, organization, and plugin scopes
 * have no documented winner (`unknown-order`).
 *
 * `partially-documented`: the cross-scope duplicate precedence is exactly the
 * part no page establishes (contracts/runtime-composition.md § Canonical
 * evidence-assessment index).
 */
export const COPILOT_VSCODE_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'copilot.vscode.agents.selection',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['filter', 'select-first', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['YAML frontmatter properties'],
          reviewedOn: '2026-08-20',
          establishes:
            'A profile’s target property scopes it to vscode or github-copilot and defaults to both when unset, user-invocable controls whether a reader may select it, and disable-model-invocation controls whether the product may choose it on its own.',
        },
        {
          sourceId: 'vscode.copilot.custom-agents',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-agents',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agent file locations', 'Tool list priority'],
          reviewedOn: '2026-07-15',
          establishes:
            'VS Code discovers custom agents in the workspace agents folders and in personal locations, and documents the tool-list priority a selected agent runs under; it establishes no winner for one name declared in two scopes.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agents settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'Which locations contribute custom agents is setting-controlled, so enablement and any additional configured location stay runtime conditions of this selection.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI custom-agent selection: among the project layers the upward
 * walk loaded, the deepest ancestor wins and `.github/agents` outranks
 * `.claude/agents` at the same level (`select-closest`), the first match in
 * the documented source order is taken (`select-first`), and the
 * project-versus-User order stays unresolved (`unknown-order`).
 *
 * `conflict` per the canonical index: the configuration-directory reference
 * states that project agents outrank personal ones of the same name while the
 * how-to states that the home-directory one is used instead, and the registry
 * retains both rather than choosing (contracts/runtime-composition.md
 * § Canonical evidence-assessment index).
 *
 * What the surface identifies an agent by is not in dispute: the plugin
 * reference derives an agent's ID from its file name, which is the rule
 * `copilot.repo.agent` answers with (`rules/copilot.ts` § agentNameOf).
 */
export const COPILOT_CLI_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'copilot.cli.agents.selection',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['select-closest', 'select-first', 'unknown-order'],
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['User-editable files'],
          reviewedOn: '2026-08-27',
          establishes:
            'The personal agents directory is ~/.copilot/agents/, and this page states that project-level agents in .github/agents/ take precedence over personal agents of the same name — one of the two sides of the retained conflict.',
        },
        {
          sourceId: 'github.copilot.cli.custom-agents',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli',
          officialHost: 'docs.github.com',
          sections: ['Creating a custom agent', 'Using a custom agent'],
          reviewedOn: '2026-08-27',
          establishes:
            'A profile is created in the project .github/agents/ or the user ~/.copilot/agents/ location, and this page states that a same-name agent in the home directory is used rather than the repository one — the opposite side of the retained conflict; selection itself is a runtime act, by slash command, explicit instruction, or inference from the description.',
        },
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['Loading order and precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'Agents use first-found-wins precedence and a plugin agent never overrides a project-level or personal one, so plugin agents are the lowest documented source; an agent is deduplicated by an ID derived from its file name, so reviewer.agent.md is the agent reviewer.',
        },
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Custom agent locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'Every .github/agents/ directory on the walk is loaded with the deepest taking highest priority, .github/agents/ takes precedence over .claude/agents/ at the same level, and plugin agents are lowest; this page places user agents below project agents, which the retained conflict records against the opposite assertion elsewhere.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot cloud custom-agent selection: for one name, the repository profile
 * wins over the organization one and the organization one over the enterprise
 * one (`select-first`), and profiles are collapsed by the documented filename
 * identity — the configuration file’s own name minus `.md` or
 * `.agent.md` — so one profile per name survives (`deduplicate`).
 */
export const COPILOT_CLOUD_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'copilot.cloud.agents.selection',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['select-first', 'deduplicate'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['YAML frontmatter properties', 'MCP server configurations'],
          reviewedOn: '2026-08-20',
          establishes:
            'The configuration file’s name minus .md or .agent.md deduplicates a profile between levels so the lowest level takes precedence — repository over organization over enterprise — and a selected profile’s own mcp-servers configuration is applied after the out-of-the-box servers and before the repository settings.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI settings precedence: the documented cascade over the settings
 * documents this release admits, and the per-key merge policy the repository
 * layer applies within it.
 *
 * The operations are the merge behaviors the page's repository-settings table
 * lists per key, as alternatives rather than as sequential steps: `replace`
 * for a key the repository layer replaces outright, `merge-map` for the
 * object-valued keys it merges by key, `append` with `deduplicate` for the
 * list-valued keys documented as a union — the repository layer can add
 * entries and never remove them, which is set union rather than text
 * concatenation — and `tighten-only` for the one key it may move in a single
 * direction, `respectGitignore`, which it may enable and never disable.
 *
 * The cascade carries two documented exceptions the record states rather than
 * smooths over: an MDM value of `disable` for
 * `permissions.disableBypassPermissionsMode` wins over every closer layer,
 * and the repository layer's `model`, `effortLevel`, and `contextTier`
 * overrides apply only in a trusted working directory.
 *
 * Recording it decides nothing a surface shows: which layer wins for a key
 * turns on the managed, User, environment, trust, and flag inputs this
 * product never observes, so no row or detail projects a precedence
 * (FR-009).
 */
export const COPILOT_CLI_SETTINGS_PRECEDENCE_STRATEGY = {
  strategyId: 'copilot.cli.settings.precedence',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['append', 'replace', 'merge-map', 'deduplicate', 'tighten-only'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: [
            'Configuration file settings',
            'Repository settings (.github/copilot/settings.json)',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'Settings are applied in the order built-in defaults, MDM managed settings, user settings, repository settings, local settings, environment variables, then command-line flags, with a later source overriding an earlier one; each key the repository layer supports carries its own merge behavior, listed as replaced by the repository, merged so the repository overrides the user for the same key, a union to which the repository can add entries and never remove them, or tighten-only, which the repository can enable and never disable; an MDM value of disable for permissions.disableBypassPermissionsMode always wins over a closer layer, and the repository model, effortLevel, and contextTier overrides apply only when the working directory is trusted.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot VS Code settings precedence: the editor's own scope order, which
 * resolves the VS Code workspace and User settings documents this release
 * deliberately leaves out — `copilot.excluded.vscode-settings` names the
 * omission, and this record is the documented composition behind the scope it
 * declines. Nothing this release admits rests on it: `copilot.repo.settings`
 * is based on the CLI settings behavior alone.
 *
 * `merge-map` and `replace` alone: the page fixes an order in which a later
 * scope overrides an earlier one for the same key, and states no
 * list-concatenation rule of its own.
 *
 * The policy, remote, language-specific, and profile scopes are inputs of the
 * same order rather than facts a surface projects: which value a session ends
 * up with turns on runtime this tool never observes (FR-009).
 */
export const COPILOT_VSCODE_SETTINGS_PRECEDENCE_STRATEGY = {
  strategyId: 'copilot.vscode.settings.precedence',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['merge-map', 'replace'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.settings',
          url: 'https://code.visualstudio.com/docs/configure/settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Settings precedence'],
          reviewedOn: '2026-08-23',
          establishes:
            'Configurations are overridden across the setting scopes in a documented order where a later scope wins — defaults, user, remote, workspace, workspace folder, and the language-specific variants of each.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot VS Code plugin activation: which plugins the editor can offer, and
 * what each of them still needs before it is live.
 *
 * `select-first` then `filter`: at a root the editor has established, the
 * documented format order decides which manifest is the plugin's — a root
 * `plugin.json` declaring the Agent Plugins schema, then the Copilot,
 * Claude, and legacy OpenPlugin forms — and registration, workspace listing,
 * installation, and enabled state then decide whether it runs.
 *
 * What the strategy deliberately does not compose is a winner. A plugin reaches
 * a session by installation, by a registered marketplace, or by an absolute
 * path in `chat.pluginLocations`, and all of that is runtime state this product
 * never reads: an inventory row states what a catalog offers and what a
 * manifest declares, never that a plugin is available (FR-009,
 * contracts/runtime-composition.md § copilot.vscode.plugins.activation).
 */
export const COPILOT_VSCODE_PLUGINS_ACTIVATION_STRATEGY = {
  strategyId: 'copilot.vscode.plugins.activation',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['select-first', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.plugins',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-plugins',
          officialHost: 'code.visualstudio.com',
          sections: ['Plugin formats', 'Configure plugin marketplaces', 'Use local plugins'],
          reviewedOn: '2026-08-25',
          establishes:
            'VS Code auto-detects a plugin format by checking the root manifest and the format-specific manifest paths, taking the Copilot format when no other marker is found, and a plugin becomes available by being installed, by a marketplace registered in chat.plugins.marketplaces, or by a directory path registered in chat.pluginLocations with an enabled or disabled state.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI plugin activation: the same two steps in the CLI's own spelling.
 *
 * `select-first` then `filter`: the manifest and marketplace locations are
 * checked in the documented order at an established root, and installation and
 * enablement then decide what a session runs. The plugin's components compose
 * with project and personal configuration rather than overriding it — a plugin
 * agent or skill loses to a project one of the same name, while a plugin MCP
 * server wins by loading last — which is why nothing here is projected as a
 * winner (FR-009, contracts/runtime-composition.md
 * § copilot.cli.plugins.activation).
 */
export const COPILOT_CLI_PLUGINS_ACTIVATION_STRATEGY = {
  strategyId: 'copilot.cli.plugins.activation',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['select-first', 'filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations', 'Loading order and precedence', 'CLI commands'],
          reviewedOn: '2026-08-27',
          establishes:
            "A plugin manifest and a marketplace manifest are each checked at four documented locations in a fixed order; a plugin is installed by naming a marketplace plugin, a repository, a subdirectory, a Git URL, or a local path, and its components then compose with the rest — agents and skills are first-found-wins so a plugin's lose to a project's, MCP servers are last-wins so a plugin's takes precedence, and built-ins can be overridden by neither.",
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot cloud agent plugin activation: the hosted side of the same two
 * steps.
 *
 * `filter` then `select-first`: what a repository's settings turn on and which
 * marketplaces they add are filtered against what the hosted environment has
 * installed and made available, and a plugin's own manifest is then read at
 * the root that state established. Nothing is composed into a winner here for
 * the reason the other two are not: installation, availability, and enablement
 * are hosted state this product never reads, so a row states what a repository
 * declares and never that a plugin is live (FR-009,
 * contracts/runtime-composition.md § copilot.cloud.plugins.activation).
 */
export const COPILOT_CLOUD_PLUGINS_ACTIVATION_STRATEGY = {
  strategyId: 'copilot.cloud.plugins.activation',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['filter', 'select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.plugins',
          url: 'https://docs.github.com/en/copilot/concepts/agents/about-plugins',
          officialHost: 'docs.github.com',
          sections: ['Where can I get plugins?', 'How plugin marketplaces work'],
          reviewedOn: '2026-07-15',
          establishes:
            'The cloud agent turns plugins on through the enabledPlugins field of a repository .github/copilot/settings.json and adds a catalog through extraKnownMarketplaces in the same file, while a marketplace.json is what lists the plugins a marketplace makes available.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot VS Code hook composition: for one event, the workspace hooks are
 * resolved against the User ones with the workspace taking precedence
 * (`select-first`), and the applicable agent and plugin hooks then run in
 * addition to whatever that resolution kept (`append`). Which sources
 * participate at all is the `filter`: the feature is preview, agent-scoped
 * hooks need their own setting, parent-repository discovery is opt-in, and a
 * location can be switched off through the locations setting.
 *
 * Matcher values are not part of the composition here, and the page is
 * explicit about why: the editor parses the Claude matcher syntax and ignores
 * the values, so a hook of a Claude-format document runs on every tool
 * invocation. That is a runtime outcome no surface projects (FR-009) — a
 * detail publishes the matcher its author wrote (FR-007).
 */
export const COPILOT_VSCODE_HOOKS_COMPOSITION_STRATEGY = {
  strategyId: 'copilot.vscode.hooks.composition',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  operations: ['filter', 'select-first', 'append'],
  documentationStatus: 'documented',
  lifecycleQualifiers: ['preview'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.hooks',
          url: 'https://code.visualstudio.com/docs/agent-customization/hooks',
          officialHost: 'code.visualstudio.com',
          sections: [
            'Hook file locations',
            'Agent-scoped hooks',
            'How does VS Code handle Claude Code hook configurations?',
          ],
          reviewedOn: '2026-08-26',
          establishes:
            'Workspace hooks take precedence over user hooks for the same event type, agent-scoped hooks run in addition to any workspace or user-level hooks configured for the same event and require the chat.useCustomAgentHooks setting, and a plugin contributes its own hooks.json or hooks/hooks.json. A hook location can be disabled by setting it to false in chat.hookFilesLocations, discovery from a parent repository root is opt-in through chat.useCustomizationsInParentRepositories, and VS Code currently ignores the matcher values of a Claude-format hook configuration so those hooks run on all tool invocations.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot CLI hook composition: every applicable source contributes and every
 * one of its entries for the event runs (`append`), in the documented source
 * order — policy, then user, then project, then plugins — with no source
 * replacing another. The `filter` is which sources exist at all: policy hooks
 * are machine-wide and survive `disableAllHooks`, while the others are turned
 * off by it, and a plugin contributes only while it is installed.
 *
 * No `select-first`: the hooks reference states that when the same event
 * appears in several sources, all hook entries from all sources are run, so a
 * same-event winner would be a resolution that page documents the opposite of.
 *
 * `conflict`, because the two official pages disagree about the two inline
 * blocks. The hooks reference lists the repository settings block and the
 * user-level one as separate sources and runs every source's entries, while
 * the configuration reference gives the repository `hooks` key a merge policy
 * in which the repository overrides the user for the same key. Both citations
 * stay on this record and no winner is manufactured out of them
 * (data-model.md § RuntimeCompositionStrategy).
 */
export const COPILOT_CLI_HOOKS_COMPOSITION_STRATEGY = {
  strategyId: 'copilot.cli.hooks.composition',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  operations: ['filter', 'append'],
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Repository settings (.github/copilot/settings.json)'],
          reviewedOn: '2026-08-27',
          establishes:
            'The repository hooks object is merged with the user one so the repository entry overrides the user entry for the same key, and disableAllHooks is a repository-takes-precedence switch of the same file.',
        },
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations', 'Disable all hooks'],
          reviewedOn: '2026-08-27',
          establishes:
            'Copilot CLI loads hooks from policy, user, project, and plugin sources in that order and combines them — a plugin declaring its own in hooks.json or hooks/hooks.json inside its installation directory — and when the same event appears in multiple sources all hook entries from all sources are run; policy hooks load before all other hooks, cannot be disabled by disableAllHooks, and are available regardless of folder trust state.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Copilot cloud-agent hook composition: the repository hook files present in
 * the ephemeral clone contribute, and every applicable entry runs
 * (`append`). The `filter` is the sandbox itself — only a subset of events
 * fires and only `bash` or `command` entries are honored — and the local User
 * and policy sources of the CLI simply do not exist there.
 */
export const COPILOT_CLOUD_HOOKS_COMPOSITION_STRATEGY = {
  strategyId: 'copilot.cloud.hooks.composition',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  operations: ['filter', 'append'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations', 'Cloud agent execution environment'],
          reviewedOn: '2026-08-27',
          establishes:
            'Under the cloud agent, hook configuration is loaded from the .github/hooks/*.json files of the cloned repository, a subset of events fires, only bash or command entries are honored, and policy hooks are not supported there.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Copilot's contribution to the strategy registry, keyed by `strategyId`. */
export const COPILOT_COMPOSITION_STRATEGIES: Readonly<
  Record<CopilotStrategyId, RuntimeCompositionStrategy>
> = {
  [COPILOT_VSCODE_AGENTS_SELECTION_STRATEGY.strategyId]: COPILOT_VSCODE_AGENTS_SELECTION_STRATEGY,
  [COPILOT_VSCODE_PLUGINS_ACTIVATION_STRATEGY.strategyId]:
    COPILOT_VSCODE_PLUGINS_ACTIVATION_STRATEGY,
  [COPILOT_CLI_PLUGINS_ACTIVATION_STRATEGY.strategyId]: COPILOT_CLI_PLUGINS_ACTIVATION_STRATEGY,
  [COPILOT_CLOUD_PLUGINS_ACTIVATION_STRATEGY.strategyId]: COPILOT_CLOUD_PLUGINS_ACTIVATION_STRATEGY,
  [COPILOT_CLOUD_AGENTS_SELECTION_STRATEGY.strategyId]: COPILOT_CLOUD_AGENTS_SELECTION_STRATEGY,
  [COPILOT_CLI_AGENTS_SELECTION_STRATEGY.strategyId]: COPILOT_CLI_AGENTS_SELECTION_STRATEGY,
  [COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_CLI_MCP_SELECTION_STRATEGY.strategyId]: COPILOT_CLI_MCP_SELECTION_STRATEGY,
  [COPILOT_CLI_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
  [COPILOT_CLOUD_MCP_SELECTION_STRATEGY.strategyId]: COPILOT_CLOUD_MCP_SELECTION_STRATEGY,
  [COPILOT_VSCODE_MCP_SELECTION_STRATEGY.strategyId]: COPILOT_VSCODE_MCP_SELECTION_STRATEGY,
  [COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
  [COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]:
    COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
  [COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY.strategyId]: COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
  [COPILOT_CLI_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: COPILOT_CLI_SETTINGS_PRECEDENCE_STRATEGY,
  [COPILOT_VSCODE_SETTINGS_PRECEDENCE_STRATEGY.strategyId]:
    COPILOT_VSCODE_SETTINGS_PRECEDENCE_STRATEGY,
  [COPILOT_VSCODE_HOOKS_COMPOSITION_STRATEGY.strategyId]: COPILOT_VSCODE_HOOKS_COMPOSITION_STRATEGY,
  [COPILOT_CLI_HOOKS_COMPOSITION_STRATEGY.strategyId]: COPILOT_CLI_HOOKS_COMPOSITION_STRATEGY,
  [COPILOT_CLOUD_HOOKS_COMPOSITION_STRATEGY.strategyId]: COPILOT_CLOUD_HOOKS_COMPOSITION_STRATEGY,
};
