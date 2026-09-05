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
 * Codex custom-agent inheritance: a spawned session selects the agent
 * configuration — a custom agent whose name matches a built-in one takes
 * precedence over it (`select-first`) — overlays the child file's declared
 * settings on the parent session per key (`merge-map`), and a value the child
 * file declares replaces the resolved parent value (`replace`) — with the
 * parent turn's live sandbox and approval overrides reapplied over the file's
 * own defaults, which is the one edge that runs the other way.
 *
 * `select-first` covers exactly the precedence the page states, which is the
 * custom-over-built-in one. No order is recorded between the personal
 * `~/.codex/agents/` and project `.codex/agents/` scopes: the page names both
 * locations and establishes nothing about which wins, and an operation there
 * would be a resolution the vendor does not document.
 *
 * What the child file omits is what it inherits: `sandbox_mode`,
 * `mcp_servers`, and `skills.config` come from the parent session when the
 * file declares none. That inheritance is documented composition and stays
 * here rather than becoming an Inspector reading — an agent file's
 * `mcp_servers` keys are its own declared content, never a second MCP carrier,
 * because an MCP declaration's home is an explicit carrier and nothing else
 * (data-model.md § Inventory unit). No surface projects this pipeline either:
 * what a concrete spawn resolves depends on the parent session, the live
 * overrides, and the scopes outside the inspected Source, all of which are
 * runtime this tool never observes (FR-009).
 *
 * `partially-documented`: the project traversal is unstated — the same gap
 * `codex.behavior.repo.agents` carries — and the page establishes nothing
 * about whether a child session inherits `AGENTS.md`, so no operation here
 * claims it (contracts/runtime-composition.md § codex.agents.inheritance).
 */
export const CODEX_AGENTS_INHERITANCE_STRATEGY = {
  strategyId: 'codex.agents.inheritance',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['select-first', 'merge-map', 'replace'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'The settings a custom agent file may override are the same configuration keys the layer precedence resolves, which is what makes an agent file a configuration layer rather than a manifest of its own.',
        },
        {
          sourceId: 'openai.codex.subagents',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Custom agents', 'Approvals and sandbox controls'],
          reviewedOn: '2026-08-27',
          establishes:
            'A custom agent whose name matches a built-in agent such as explorer takes precedence over it, and Codex loads the selected agent file as a configuration layer for the spawned session: a model or reasoning effort the file sets takes precedence over the value resolved from an explicit spawn request, the [agents] defaults, and the parent, while sandbox_mode, mcp_servers, and skills.config inherit from the parent when the file omits them; the parent turn’s live sandbox and approval overrides are reapplied over the file’s own defaults. The page names the personal and project locations without establishing an order between them.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

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
          reviewedOn: '2026-08-27',
          establishes:
            'Codex resolves CLI overrides, trusted project layers from root to cwd, profile files, User config, and system config in that fixed order, using the closest applicable value for the same key.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Codex hook composition: every hook source that is active contributes, and
 * every matching hook runs — a closer layer adds to the broader ones rather
 * than replacing them (`append`), while which sources are active at all is
 * the documented filter (`filter`): project hooks require the project
 * `.codex/` layer to be trusted, the User layer contributes either way, an
 * enabled plugin's own bundled hooks load beside them under the same trust
 * review, and a managed-only policy can exclude every non-managed source.
 *
 * The one same-layer fact this records is retention, not selection: a layer
 * holding both a `hooks.json` and an inline `[hooks]` table has both loaded,
 * with a startup warning, so neither representation is a winner over the
 * other. That is why the inspector keeps the standalone and the inline
 * recognitions of one layer distinct rather than merging them into one
 * reading (contracts/vendors/openai-codex.md § Normative initial-release
 * presentation allowlist, the `hook` row).
 *
 * Trust, review, enablement, and managed policy stay separate condition facts
 * rather than being composed into a verdict, and inspection never runs a
 * declared handler: the strategy explains a documented runtime edge and never
 * creates one (contracts/runtime-composition.md § codex.hooks.additive). Codex
 * requires a reader to review and trust a hook definition before it can run at
 * all, which is runtime state this tool never observes (FR-009).
 */
export const CODEX_HOOKS_ADDITIVE_STRATEGY = {
  strategyId: 'codex.hooks.additive',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['filter', 'append'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.hooks',
          url: 'https://learn.chatgpt.com/docs/hooks.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex looks for hooks', 'Review and trust hooks'],
          reviewedOn: '2026-08-27',
          establishes:
            'If more than one hook source exists Codex loads all matching hooks and higher-precedence layers do not replace lower-precedence hooks; a layer holding both hooks.json and inline [hooks] has both merged with a startup warning; hooks bundled with an enabled plugin load alongside the other sources under the same trust review; project-local hooks load only when the project .codex/ layer is trusted, while user hooks keep loading in an untrusted project; and a non-managed hook must be reviewed and trusted before it can run.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'The active config layers a hook source belongs to are the User layer and the trusted project .codex/config.toml layers from the project root down to the runtime cwd.',
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
          reviewedOn: '2026-08-27',
          establishes:
            'Codex selects at most one non-empty instruction file per directory in the documented filename order and concatenates the selections broad to narrow, from the global fallback through the project chain toward the runtime cwd, stopping at the project_doc_max_bytes budget; that budget and the fallback filenames are configuration values resolved outside the instruction files themselves.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Codex MCP configuration: `[mcp_servers.*]` declarations resolve through the
 * ordinary per-value config precedence — layers merge by key (`merge-map`),
 * and the closest applicable layer's value wins for each key it writes
 * (`replace`) — the same resolution every other configuration value follows.
 * The documented unit is the value, not the server entry: a closer layer
 * writing one field of a server overlays that field, and the broader layer's
 * other fields stand, so no whole-entry replacement is asserted here.
 *
 * Trust, enablement, and server availability are retained as separate
 * condition facts rather than composed into a winner, and inspection never
 * connects to a declared server: the strategy explains a documented runtime
 * edge and never creates one (contracts/runtime-composition.md
 * § codex.mcp.configuration).
 *
 * The agent-inheritance edge — a Codex custom agent inheriting its parent's
 * MCP configuration — is deliberately dormant here: no Codex agent behavior
 * or strategy identifier ships yet, so this record consumes none and nothing
 * links back to it. The edge arrives whole with the phase that ships Codex
 * agents, rather than as a premature reference the contract gate could not
 * resolve (T298).
 */
export const CODEX_MCP_CONFIGURATION_STRATEGY = {
  strategyId: 'codex.mcp.configuration',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['merge-map', 'replace'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'MCP declarations resolve through the ordinary config-layer precedence: the active layers merge per key and the closest applicable declaration wins, with project layers applying only when the project is trusted.',
        },
        {
          sourceId: 'openai.codex.mcp',
          url: 'https://learn.chatgpt.com/docs/extend/mcp.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Connect Codex to an MCP server'],
          reviewedOn: '2026-08-27',
          establishes:
            'Servers are declared as named [mcp_servers.*] tables in the configuration file — the map whose keys the per-value layer resolution operates over.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Codex rule resolution: keep the `.rules` files of the layers actually in
 * play — the active User and Team Config layers and the project layers whose
 * `.codex/` is trusted (`filter`) — and, when several rules match one
 * command, take the most restrictive decision the documented severity order
 * gives, `forbidden` over `prompt` over `allow` (`select-first`).
 *
 * `select-first` over a fixed severity order rather than over a layer order:
 * the page establishes no precedence between layers at all, and what it does
 * establish is that the strongest matching decision is the one applied. A
 * layer-ordered reading would invent the very thing the page leaves open.
 *
 * `partially-documented`: the page documents no nested-subdirectory
 * recursion under a layer’s `rules/`. The `[experimental]` qualifier is the
 * contract's canonical assessment rather than a claim of the citation below:
 * the page states it in its preamble, under no heading a citation can name.
 * Whether a rule is in force at all depends on trust, approval mode, and
 * feature state — runtime this tool never observes, so the Inspector records
 * the documented edge and never a decision
 * (contracts/runtime-composition.md § codex.rules.resolution).
 */
export const CODEX_RULES_RESOLUTION_STRATEGY = {
  strategyId: 'codex.rules.resolution',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['filter', 'select-first'],
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.rules',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/rules.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Create a rules file', 'Understand rule fields'],
          reviewedOn: '2026-08-27',
          establishes:
            'Rule files are read from every active config layer at startup — the user layer, Team Config locations, and project layers whose .codex/ is trusted — and when more than one rule matches a command Codex applies the most restrictive decision, forbidden over prompt over allow; no precedence among the layers themselves is established.',
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
          reviewedOn: '2026-08-27',
          establishes:
            'Skills that share a name across discovery scopes are not merged and both remain available in skill selectors; the section lists the repository, user, admin, and system locations without establishing any precedence or ordering among them.',
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/**
 * Codex plugin activation: which plugins a client can offer, and which of them
 * is actually live.
 *
 * `filter` then `select-first`, because the documented path has two steps of
 * that shape. A client discovers the catalogs it reads — the two exact
 * repository locations and the user's personal one — and keeps the entries
 * they expose; then a plugin root is established through the entry or the
 * installed copy, and the required `.codex-plugin/plugin.json` at that root is
 * the manifest the client takes. Codex skips an entry whose source it cannot
 * resolve rather than failing the whole catalog, which is the filter's other
 * half.
 *
 * What the strategy deliberately does not compose is a winner. Installation,
 * enablement, trust, and the cached copy are four separate states — a plugin is
 * installed into the Codex plugin cache and loaded from there, and its on/off
 * value lives in the User configuration — so an inventory row states the
 * authored catalog and manifest facts and never that a plugin is available
 * (FR-009). Local activation is also never projected onto hosted ChatGPT Work,
 * which reads no local file (contracts/runtime-composition.md
 * § codex.plugins.activation).
 */
export const CODEX_PLUGINS_ACTIVATION_STRATEGY = {
  strategyId: 'codex.plugins.activation',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  operations: ['filter', 'select-first'],
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: ['How local marketplaces work', 'Marketplace metadata', 'Plugin structure'],
          reviewedOn: '2026-08-27',
          establishes:
            "The ChatGPT desktop app reads the repo, legacy-compatible, and personal catalogs, Codex skips an entry whose source it cannot resolve instead of failing the catalog, ChatGPT installs a plugin into ~/.codex/plugins/cache and loads the installed copy from there rather than from the entry, ChatGPT stores each plugin's on or off state in ~/.codex/config.toml, and every plugin requires the .codex-plugin/plugin.json manifest at the plugin root it establishes.",
        },
      ]
    : [],
} as const satisfies RuntimeCompositionStrategy;

/** Codex's contribution to the strategy registry, keyed by `strategyId` in identifier order. */
export const CODEX_COMPOSITION_STRATEGIES: Readonly<
  Record<CodexStrategyId, RuntimeCompositionStrategy>
> = {
  [CODEX_AGENTS_INHERITANCE_STRATEGY.strategyId]: CODEX_AGENTS_INHERITANCE_STRATEGY,
  [CODEX_CONFIG_PRECEDENCE_STRATEGY.strategyId]: CODEX_CONFIG_PRECEDENCE_STRATEGY,
  [CODEX_HOOKS_ADDITIVE_STRATEGY.strategyId]: CODEX_HOOKS_ADDITIVE_STRATEGY,
  [CODEX_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: CODEX_INSTRUCTIONS_LAYERING_STRATEGY,
  [CODEX_MCP_CONFIGURATION_STRATEGY.strategyId]: CODEX_MCP_CONFIGURATION_STRATEGY,
  [CODEX_PLUGINS_ACTIVATION_STRATEGY.strategyId]: CODEX_PLUGINS_ACTIVATION_STRATEGY,
  [CODEX_RULES_RESOLUTION_STRATEGY.strategyId]: CODEX_RULES_RESOLUTION_STRATEGY,
  [CODEX_SKILLS_DISCOVERY_STRATEGY.strategyId]: CODEX_SKILLS_DISCOVERY_STRATEGY,
};
