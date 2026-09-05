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
 * Claude subagent selection: for a name several scopes declare, the managed
 * definition wins, then a session `--agents` one, then the closest project
 * layer, then the User scope, then a plugin's (`select-first`,
 * `select-closest`) — while a duplicate inside one `.claude/agents/` tree,
 * subfolders included, loads by filesystem read order rather than a documented
 * precedence (`unknown-order`).
 *
 * The unresolved half is the point: the page states that only one of two
 * same-name files under one tree loads and names no rule for which, so a
 * surface that ordered them would answer a question the vendor leaves open.
 * The agent inventory therefore lists both definitions of such a name side by
 * side and states no winner, exactly as a `prompt/command` row does
 * (data-model.md § Inventory unit, FR-009).
 *
 * `partially-documented`: the same-tree duplicate order is unspecified, which
 * the canonical index records as the assessment basis — `unknown-order` says
 * the pipeline reaches that step, not that the step is established
 * (contracts/runtime-composition.md § Canonical evidence-assessment index).
 */
export const CLAUDE_AGENTS_SELECTION_STRATEGY = {
  strategyId: 'claude.agents.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['select-first', 'select-closest', 'unknown-order'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Choose the subagent scope'],
          reviewedOn: '2026-08-27',
          establishes:
            'When several subagents share one name the higher-priority location wins, in managed, --agents session, project, User, then plugin order; across nested project directories the definition closest to the working directory wins, while two files under one .claude/agents/ tree load by filesystem read order rather than a documented precedence.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude subagent context composition: a non-fork subagent starts with a fresh
 * context assembled from documented inputs — its own system prompt, the
 * delegation message, the CLAUDE.md hierarchy the main conversation loads, a
 * git-status snapshot, and the full content of every skill its `skills` field
 * preloads (`concatenate`) — with the built-in Explore and Plan agents
 * omitting the instruction and git inputs and the current nested-spawn depth
 * limit withholding the `Agent` tool (`filter`), while `context: fork`
 * inherits the parent conversation instead of that fresh context (`replace`).
 *
 * The memory scope is one of those inputs and one of the reasons the strategy
 * names the memory behaviors: `memory: user`, `project`, or `local` selects
 * one directory whose `MEMORY.md` prefix joins the subagent's system prompt,
 * and the main conversation's auto memory is deliberately not among the
 * inputs.
 *
 * No surface projects any of this. What a concrete spawn composes depends on
 * the parent session, the enabled scopes, and runtime this tool never observes
 * (FR-009); what the Inspector publishes is the file's own declarations.
 */
export const CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY = {
  strategyId: 'claude.agent-context.composition',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['concatenate', 'filter', 'replace'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['How CLAUDE.md files load', 'Auto memory'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLAUDE.md hierarchy a subagent inherits is the one the main conversation loads, and auto memory is the separate per-project store a session maintains under the Claude configuration directory.',
        },
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: [
            'What loads at startup',
            'Available tools',
            'Preload skills into subagents',
            'Scope MCP servers to a subagent',
            'Enable persistent memory',
            'Let subagents spawn their own subagents',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'A non-fork subagent starts with a fresh isolated context holding its own system prompt, the delegation message, every level of the CLAUDE.md hierarchy, a git-status snapshot, and the full content of each preloaded skill, with Explore and Plan omitting the instruction and git inputs and the main conversation’s auto memory never loaded; a fork inherits the parent conversation instead; the tools field decides the inherited tool set, an mcpServers entry is either an inline definition scoped to that subagent or a name referencing the parent session’s connection, the memory field selects one persistent directory whose MEMORY.md prefix joins the system prompt, and at the nested-spawn depth limit the Agent tool is withheld.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude command selection: a legacy command file and a skill compete for one
 * command name, and the skill wins.
 *
 * `select-first` and deliberately nothing else. The documented outcome for a
 * `.claude/commands/deploy.md` beside a `.claude/skills/deploy/SKILL.md` is
 * that `/deploy` runs the skill, so one input is selected rather than both
 * retained; and the subdirectory namespacing keeps two commands in different
 * subdirectories from being that clash at all, because they are two names.
 * A `replace` or `merge-map` here would record a combination the vendor
 * documents for neither (contracts/runtime-composition.md
 * § claude.commands.selection).
 *
 * `partially-documented` for what the pages leave open: command files are said
 * to work the way skills do, but the ancestor and lazy-descendant traversal
 * documented for skills is never restated for the command directory, so which
 * layers contribute the commands being selected among is not established.
 */
export const CLAUDE_COMMANDS_SELECTION_STRATEGY = {
  strategyId: 'claude.commands.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['select-first'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.changelog.legacy-command-nesting',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['1.0.45', '1.0.51'],
          reviewedOn: '2026-09-04',
          establishes:
            'Release 1.0.45 restored subdirectory-derived namespacing in command names, so .claude/commands/frontend/component.md is /frontend:component rather than /component, and release 1.0.51 fixed the same nesting for user-level commands — the two scopes this strategy composes.',
        },
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: [
            'Where skills live',
            'Discovery from parent and nested directories',
            'How a skill gets its command name',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'Command files in .claude/commands/ share the skill command namespace and work the same way, and when a skill and a command share a name the skill takes precedence — with both .claude/commands/deploy.md and .claude/skills/deploy/SKILL.md present, /deploy runs the skill. A command is invoked by its file name without the extension. The nested-directory discovery sentence is written about .claude/skills/ alone, so which layers contribute commands is not stated independently.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude hook composition: every hook source that is active contributes, and
 * every applicable matching hook runs — a closer settings level adds to the
 * broader ones rather than replacing them (`append`), while which sources are
 * active at all is the documented filter (`filter`): workspace trust, a
 * managed-hooks-only policy, and the `disableAllHooks` setting each remove
 * sources, and a plugin's hooks arrive only while that plugin is enabled.
 *
 * `select-first` is the one composition the page states over a set of results
 * rather than over sources: an explicit deny returned by a hook takes
 * precedence over another hook's outcome, so the restrictive answer is the one
 * that stands.
 *
 * Registration lifetime is retained as a condition rather than composed: a
 * subagent's frontmatter hooks are registered only while it runs, and a
 * skill's from its invocation onward — both runtime facts this tool never
 * observes (FR-009). The Inspector runs no declared handler
 * (contracts/runtime-composition.md § claude.hooks.additive).
 */
export const CLAUDE_HOOKS_ADDITIVE_STRATEGY = {
  strategyId: 'claude.hooks.additive',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['filter', 'append', 'select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.hooks.locations-resolution',
          url: 'https://code.claude.com/docs/en/hooks',
          officialHost: 'code.claude.com',
          sections: ['Hook locations', 'Hooks in skills and agents', 'PreToolUse'],
          reviewedOn: '2026-08-25',
          establishes:
            'Hook entries merge across settings levels rather than replacing each other, and hooks from settings, managed policy, and plugins also run inside subagents; an enterprise allowManagedHooksOnly setting blocks user, project, local, and plugin hooks, and disableAllHooks turns them off outside managed settings. A subagent registers its frontmatter hooks only while it runs and a skill from its invocation onward. An explicit deny returned by another hook takes precedence over a hook outcome that would let a tool call proceed.',
        },
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: ['Settings precedence', 'Lists merge instead of overriding'],
          reviewedOn: '2026-08-27',
          establishes:
            'A list-valued settings key is combined across the settings files rather than one file replacing another, which is the merge the hook entries of several levels follow.',
        },
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Hooks', 'Plugin manifest schema'],
          reviewedOn: '2026-08-27',
          establishes:
            'Plugin hooks respond to the same lifecycle events as user-defined hooks and are one of the component types with their own merge rules, contributed while the plugin is enabled.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

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
          reviewedOn: '2026-08-27',
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
  // The retention half is version-anchored at 2.1.178+ (changelog § 2.1.178);
  // the working-context selection the skills page documents beside it carries
  // no version of its own. The record stays partial because exact IDE surface
  // availability remains conditional.
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live', 'How a skill gets its command name'],
          reviewedOn: '2026-08-27',
          establishes:
            'Within one root, a nested skill sharing a name with another stays available under a directory-qualified command and Claude picks the variant matching the files it is working on; invoking the unqualified name loads the project-root skill and appends the directory-qualified variants with an instruction to also invoke any whose directory holds those files. The name field of a personal or project skill sets only the display label, and the enterprise-over-personal-over-project precedence is a rule between levels, not within one.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.nested-skill-discovery',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['2.1.178'],
          reviewedOn: '2026-09-04',
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
          reviewedOn: '2026-08-27',
          establishes:
            'A duplicate is resolved by source order as a whole entry — local, project, user, plugin-provided, then connectors, with no field merging across sources — and what makes a duplicate differs by source: the three scopes match by name, while plugins and connectors match by endpoint, treating one that points at the same URL or command as a server above it as the duplicate.',
        },
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Available tools', 'Scope MCP servers to a subagent'],
          reviewedOn: '2026-08-27',
          establishes:
            'Subagents inherit the built-in and MCP tools available in the main conversation, narrowed by the documented filters, with the tools and disallowedTools fields restricting the set — the inherit-then-filter step this pipeline records; servers declared inline on an agent are connected when the subagent starts and disconnected when it finishes, while string entries reference servers already configured in the session.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude plugin activation: which plugins a session can offer, and what each of
 * the two documented paths requires before one is live.
 *
 * `filter` alone, because neither path composes a winner. A folder under the
 * skills directory that carries `.claude-plugin/plugin.json` is loaded as
 * `<folder>@skills-dir` on the next session with no marketplace and no install
 * step, subject to the workspace trust dialog for a project-scope one; a
 * catalog's plugins reach a session only once the catalog is registered — by
 * `/plugin marketplace add` or `extraKnownMarketplaces` — and the plugin is
 * enabled under `enabledPlugins`, keyed `<plugin-name>@<marketplace-name>`.
 *
 * Registration, enablement, trust, and installation are separate runtime states
 * this product never reads, so an inventory row states the authored manifest and
 * catalog facts and never that a plugin is active (FR-009,
 * contracts/runtime-composition.md § claude.plugins.activation).
 */
export const CLAUDE_PLUGINS_ACTIVATION_STRATEGY = {
  strategyId: 'claude.plugins.activation',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['filter'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Skills-directory plugins', 'Plugin installation scopes'],
          reviewedOn: '2026-08-27',
          establishes:
            "A skills-directory folder carrying .claude-plugin/plugin.json loads as <folder>@skills-dir on the next session with no marketplace and no install step, and a project-scope one — from the launch working directory's own .claude/skills/, without walking ancestors — loads only after the workspace trust dialog is accepted, with its MCP servers still going through per-server approval and its monitors not loading at all; an installed plugin instead belongs to the settings scope chosen at installation.",
        },
        {
          sourceId: 'anthropic.claude-code.marketplaces.catalog-sources',
          url: 'https://code.claude.com/docs/en/plugin-marketplaces',
          officialHost: 'code.claude.com',
          sections: ['Create the marketplace file', 'Require marketplaces for your team'],
          reviewedOn: '2026-08-25',
          establishes:
            'A catalog reaches a session only once it is added — users run /plugin marketplace add, or a settings file names it — so the catalog file states which plugins it offers and where each comes from, never that one is registered, installed, or enabled.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
          establishes:
            'Settings are read highest precedence first as managed settings, command line arguments, local project settings, shared project settings, then user settings; a key set at a higher level overrides the same key, a list key such as permissions.allow is combined across files instead of one replacing another — fallbackModel and availableModels excepted — and for a few security-sensitive keys a stricter lower-level value is honored over a managed one.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Claude Code output-style selection: which of several styles a session
 * applies, and which file a name resolves to when more than one layer defines
 * it.
 *
 * `select-closest` for the name, and only within the project chain: the page
 * states that when more than one of the nested `.claude/output-styles/`
 * directories between the working directory and the repository root defines a
 * style with the same name, Claude Code uses the one closest to the working
 * directory. It says nothing about how a project style and a same-named User or
 * managed-policy style resolve against each other, so no order between those
 * three levels is recorded — an order stated here would be this product's guess
 * rather than the vendor's rule.
 *
 * `replace` for the application: one style is applied at a time — the
 * `outputStyle` setting or the session's own choice picks it, and a plugin style
 * marked `force-for-plugin` applies whenever its plugin is enabled and overrides
 * that setting, with the first such plugin loaded winning.
 *
 * Recording it decides nothing a surface shows: the working directory, the
 * settings and session state that select a style, and which plugins are
 * enabled are all runtime this product never observes, so no row or detail
 * projects a selection (FR-009).
 */
export const CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY = {
  strategyId: 'claude.output-style.selection',
  tool: 'claude',
  surfaces: ['claude-cli-and-ide-clients'],
  operations: ['select-closest', 'replace'],
  // The locations, the same-name outcome, and the selection inputs are all on
  // one page, so the composition itself is documented; the contract's own
  // status column carries the surface qualifier beside it, because which IDE
  // surfaces expose the picker is availability rather than a gap in what the
  // page establishes (contracts/runtime-composition.md § Claude Code).
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.output-styles.locations',
          url: 'https://code.claude.com/docs/en/output-styles',
          officialHost: 'code.claude.com',
          sections: ['Create a custom output style', 'How output styles work'],
          reviewedOn: '2026-08-27',
          establishes:
            'A custom style is saved at one of three levels — User, project, and the managed settings directory — and project output styles load from every .claude/output-styles/ between the working directory and the repository root, where a style name more than one of those nested directories defines resolves to the directory closest to the working directory; no order between the three levels is stated. A style is applied by the outputStyle setting or the session picker, taking effect after /clear or the next session, plugins can ship styles in an output-styles/ directory, and a plugin style with force-for-plugin applies whenever the plugin is enabled and overrides the user setting, with the first such plugin loaded winning.',
        },
        {
          sourceId: 'anthropic.claude-code.ide.shared-differences',
          url: 'https://code.claude.com/docs/en/ide-integrations',
          officialHost: 'code.claude.com',
          sections: ['Configure settings', 'VS Code extension vs. Claude Code CLI'],
          reviewedOn: '2026-07-25',
          establishes:
            'The IDE integrations share the CLI configuration while differing per surface in what they expose, which is why the availability of the style picker is stated per surface rather than as one fact.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Claude's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const CLAUDE_COMPOSITION_STRATEGIES: Readonly<
  Record<ClaudeStrategyId, RuntimeCompositionStrategy>
> = {
  [CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY.strategyId]: CLAUDE_AGENT_CONTEXT_COMPOSITION_STRATEGY,
  [CLAUDE_AGENTS_SELECTION_STRATEGY.strategyId]: CLAUDE_AGENTS_SELECTION_STRATEGY,
  [CLAUDE_COMMANDS_SELECTION_STRATEGY.strategyId]: CLAUDE_COMMANDS_SELECTION_STRATEGY,
  [CLAUDE_HOOKS_ADDITIVE_STRATEGY.strategyId]: CLAUDE_HOOKS_ADDITIVE_STRATEGY,
  [CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: CLAUDE_INSTRUCTIONS_LAYERING_STRATEGY,
  [CLAUDE_MCP_SELECTION_STRATEGY.strategyId]: CLAUDE_MCP_SELECTION_STRATEGY,
  [CLAUDE_RULES_LAYERING_STRATEGY.strategyId]: CLAUDE_RULES_LAYERING_STRATEGY,
  [CLAUDE_SETTINGS_PRECEDENCE_STRATEGY.strategyId]: CLAUDE_SETTINGS_PRECEDENCE_STRATEGY,
  [CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY.strategyId]: CLAUDE_OUTPUT_STYLE_SELECTION_STRATEGY,
  [CLAUDE_PLUGINS_ACTIVATION_STRATEGY.strategyId]: CLAUDE_PLUGINS_ACTIVATION_STRATEGY,
  [CLAUDE_SKILLS_SELECTION_STRATEGY.strategyId]: CLAUDE_SKILLS_SELECTION_STRATEGY,
};
