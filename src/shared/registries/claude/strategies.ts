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
            'The CLI-versus-extension feature table records commands and skills as all available on the CLI and a subset on the extension, so which surface is running remains a condition of any selection outcome.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude MCP selection for duplicate server declarations.
 *
 * The documented outcome for a duplicate is that one entire entry is
 * selected in local, project, User, plugin, then connector order —
 * `select-first` of whole entries, so a higher source's declaration
 * `replace`s a lower one's rather than merging fields with it. What makes
 * two declarations a duplicate differs by source: the three scopes match by
 * name, while plugins and connectors match by endpoint — one pointing at the
 * same URL or command as a server above it is the duplicate, whatever it is
 * named. A subagent inherits the selected parent tools by default and then
 * applies tool filters, which is the `filter` step; inline agent servers
 * live only for that agent. The Inspector records the documented edge, never
 * a winner: which source a concrete session selects depends on runtime
 * state — trust, approval, enablement, installed plugins — this tool never
 * observes.
 *
 * `partially-documented` per the vendor contract's canonical index: the
 * exact project-root selection the project scope rests on is only partially
 * specified.
 */
export const CLAUDE_MCP_SELECTION_STRATEGY = {
  strategyId: 'claude.mcp.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['select-first', 'replace', 'filter'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.ide.shared-differences',
          url: 'https://code.claude.com/docs/en/ide-integrations',
          officialHost: 'code.claude.com',
          sections: ['VS Code extension vs. Claude Code CLI'],
          reviewedOn: '2026-07-25',
          establishes:
            'The CLI-versus-extension feature table records MCP server configuration as full on the CLI and partial on the VS Code extension, so which surface is running remains a condition of any selection outcome.',
        },
        {
          sourceId: 'anthropic.claude-code.mcp.scopes-precedence',
          url: 'https://code.claude.com/docs/en/mcp',
          officialHost: 'code.claude.com',
          sections: [
            'MCP installation scopes',
            'Scope hierarchy and precedence',
            'Plugin-provided MCP servers',
          ],
          reviewedOn: '2026-08-20',
          establishes:
            'A duplicate is resolved by source order as a whole entry — local, project, user, plugin-provided, then connectors, with no field merging across sources — and what makes a duplicate differs by source: the three scopes match by name, while plugins and connectors match by endpoint, treating one that points at the same URL or command as a server above it as the duplicate.',
        },
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Available tools', 'Scope MCP servers to a subagent'],
          reviewedOn: '2026-08-20',
          establishes:
            'Subagents inherit the built-in and MCP tools available in the main conversation, narrowed by the documented filters, with the tools and disallowedTools fields restricting the set — the inherit-then-filter step this pipeline records; servers declared inline on an agent are connected when the subagent starts and disconnected when it finishes, while string entries reference servers already configured in the session.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Claude's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
/**
 * Claude rule layering: add the applicable User and project rule layers
 * (`append`), and keep a `paths` rule out of context until Claude works with
 * a file its glob matches (`filter`). User rules load before project rules,
 * which is what gives project rules the higher priority.
 *
 * `partially-documented`: the page states neither the trigger that loads a
 * nested `.claude/rules/` directory on demand nor the base an ancestor
 * layer's `paths` globs are resolved against
 * (contracts/runtime-composition.md § claude.rules.layering). Which rules a
 * concrete session holds turns on the working directory and the files it
 * reads — runtime this tool never observes — so the Inspector records the
 * documented edge and evaluates no glob against a filesystem path (FR-009).
 */
export const CLAUDE_RULES_LAYERING_STRATEGY = {
  strategyId: 'claude.rules.layering',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['filter', 'append'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Organize rules with .claude/rules/'],
          reviewedOn: '2026-08-18',
          establishes:
            'Rules without paths frontmatter load at launch with the same priority as .claude/CLAUDE.md, path-scoped rules trigger when Claude reads a file matching one of their patterns rather than on every tool use, and user-level rules load before project rules so project rules take the higher priority.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude settings precedence: what the vendor documents about combining the
 * settings scopes, including the permission policy this product recognizes.
 *
 * `replace` for a scalar key — the higher scope's value stands — and
 * `concatenate` then `deduplicate` for an array-valued key such as
 * `permissions.allow`, which the page states merges across scopes rather than
 * being replaced. `merge-map` because a key omitted at a higher scope keeps
 * the lower scope's value rather than clearing it.
 *
 * `partially-documented`: two array keys are documented as exceptions to the
 * merge, and a tier of security-sensitive keys is documented as not following
 * the order in either direction, so what a concrete key does is not settled by
 * the order alone. Nothing here decides a file this product shows: a
 * composition record explains the vendor's own reading and grants no
 * authority (FR-009).
 */
export const CLAUDE_SETTINGS_PRECEDENCE_STRATEGY = {
  strategyId: 'claude.settings.precedence',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['replace', 'merge-map', 'concatenate', 'deduplicate'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: ['Settings precedence', 'Lists merge instead of overriding'],
          reviewedOn: '2026-08-22',
          establishes:
            'Settings are read highest precedence first as managed settings, command line arguments, local project settings, shared project settings, then user settings; a key set at a higher level overrides the same key, a list key such as permissions.allow is combined across files instead of one replacing another — fallbackModel and availableModels excepted — and for a few security-sensitive keys a stricter lower-level value is honored over a managed one.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

export const CLAUDE_COMPOSITION_STRATEGIES: Readonly<
  Record<ClaudeStrategyId, RuntimeCompositionStrategy>
> = {
  [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  [CLAUDE_MCP_SELECTION_STRATEGY.strategyId]: CLAUDE_MCP_SELECTION_STRATEGY,
  [CLAUDE_RULES_LAYERING_STRATEGY.strategyId]: CLAUDE_RULES_LAYERING_STRATEGY,
  [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: CLAUDE_SETTINGS_PRECEDENCE_STRATEGY,
  [CLAUDE_SKILLS_SELECTION_STRATEGY.strategyId]: CLAUDE_SKILLS_SELECTION_STRATEGY,
};
