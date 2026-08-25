// OpenAI Codex inspection rules — the implementation counterpart of
// contracts/vendors/openai-codex.md § Inspector Repository rules.
//
// These are read-authorizing records: a `static-candidate` here is the only way
// a Codex file becomes a candidate, and a candidate is the only thing a rule
// makes readable (contracts/inspection-path-allowlist.md § "Read authorization
// and applicability"). The one read no rule authorizes is a companion's, which
// a recognized kind's census bounds to an admitted candidate's own directory. Vendor behaviors, strategies, evidence, relationships, and
// authored file content never grant that authority. Rules arrive with the
// inventory phase that needs them, so the remaining rows of the vendor
// contract are deliberately absent until their phase ships.
//
// Each rule is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union, the computed key would stop
// resolving to a property, and the map's completeness check would break;
// `satisfies` keeps the literal, so a key cannot disagree with the record it
// points at.
import {
  ANY_NAME,
  type StructuredInspectorMatcher,
} from '../../../server/inspection/rules/registry';
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { CodexRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * The `codex.repo.instructions` matcher, authored in the typed segment form
 * the contract table shows: the exact `AGENTS.override.md` and `AGENTS.md`
 * pair at the Repository root, override first, matching the vendor's
 * documented filename order. Two selectors rather than one dynamic step, so
 * each admission carries which authored filename matched.
 *
 * Codex walks the project root down to its runtime `cwd` and consults the
 * pair per directory; the chain is built once at session start and stops at
 * the `cwd`, so a nested `AGENTS.md` is read only by sessions whose `cwd`
 * sits at or below it. The selected root is that project root (FR-001), so
 * exactly one directory of the chain is in scope and a nested `AGENTS.md`
 * belongs to a runtime context this product does not select — a near miss,
 * never a candidate, at every later phase too. The per-directory
 * first-non-empty selection is the
 * vendor's own runtime rule (`codex.instructions.layering`): the Inspector
 * admits and publishes both files when both exist, and projects no winner
 * (FR-009).
 */
const CODEX_REPO_INSTRUCTIONS_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [{ kind: 'literal', value: 'AGENTS.override.md' }],
    [{ kind: 'literal', value: 'AGENTS.md' }],
  ],
};

/**
 * Codex Repository instructions: the read-authorizing counterpart of
 * `codex.behavior.repo.instructions`, covering only the static override and
 * regular filenames. Admitting a file is not asserting Codex loads it — an
 * empty file is admitted and published even though the vendor's selection
 * would skip it, because whether a runtime selects a file is conditional on
 * inputs this tool never observes (FR-009).
 *
 * The configured fallback basenames the same behavior documents enter
 * through {@link CODEX_DERIVED_FALLBACK_BASENAME_RULE} instead: their names
 * live in the repository's `.codex/config.toml`, which the configuration-read
 * stage reads without admitting it, and the plan that stage builds in
 * `src/server/inspection/rules/codex.ts` is the only way one becomes a
 * candidate (contracts/vendors/openai-codex.md § Derived Repository rules).
 */
export const CODEX_REPO_INSTRUCTIONS_RULE = {
  ruleId: 'codex.repo.instructions',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_INSTRUCTIONS_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.agents-md',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['How Codex discovers guidance'],
          reviewedOn: '2026-08-17',
          establishes:
            'AGENTS.override.md and AGENTS.md are the static per-directory instruction filenames, consulted in that order, and the chain walks the project root down to the runtime cwd and stops there.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Configured instruction fallback basenames, seeded by the pinned
 * `.codex/config.toml` path (contracts/vendors/openai-codex.md § Derived
 * Repository rules). The seed is a configuration input the
 * configuration-read stage consumes; the same physical file is also admitted
 * as an MCP carrier by `codex.repo.config` and as a settings document by
 * `codex.repo.settings`, whose detail serves it whole — one read, three
 * readers.
 * The configuration-read stage does exactly one thing with it: read the
 * `project_doc_fallback_filenames` array out of the seed it opened, and give
 * the walk one Repository-root selector per declared name, admitting whichever
 * the walk finds as an `instructions` candidate.
 * Runtime selection remains conditional — excluded higher layers may
 * override the declared names — and capacity comes from Node.js and the
 * execution environment, never an Inspector cap.
 */
export const CODEX_DERIVED_FALLBACK_BASENAME_RULE = {
  ruleId: 'codex.derived.fallback-basename',
  tool: 'codex',
  discoveryClass: 'bounded-derived-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.agents-md',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Customize fallback filenames'],
          reviewedOn: '2026-08-17',
          establishes:
            'Codex accepts additional per-directory instruction filenames declared in configuration, which is the documented behavior this closed derivation makes inspectable.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file'],
          reviewedOn: '2026-08-17',
          establishes:
            'Settings are scoped to a project or subfolder by a .codex/config.toml file in that repository.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `codex.repo.config` matcher: the exact `.codex/config.toml` pair of
 * literals at the Repository root. Codex loads project config layers from the
 * project root down to the runtime `cwd`, and the selected root is that
 * project root (FR-001), so exactly one layer of the chain is in scope and a
 * nested carrier stays a near miss at every later phase too.
 */
const CODEX_REPO_CONFIG_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.codex' },
      { kind: 'literal', value: 'config.toml' },
    ],
  ],
};

/**
 * The Codex Repository config carrier — the carrier's first and only
 * candidacy, admitted so the `[mcp_servers.*]` declarations it contains can be
 * published as the MCP inventory's rows, one per declaration (data-model.md
 * § Inventory unit). Inline declarations are metadata on this one candidate
 * and create no second file: a standalone `.mcp.json` is not a Codex
 * Repository candidate (contracts/vendors/openai-codex.md § Inspector
 * Repository rules).
 *
 * This admission does not replace the configuration read: the fallback
 * derivation still reads the same physical file as its seed before the walk
 * (`codex.derived.fallback-basename`), because configuration decides what the
 * walk targets and must be known first. What this rule adds is the candidacy —
 * the file publishes its own facts in `files[]` like every candidate — and its
 * MCP detail publishes the declarations by the keys the file wrote rather than
 * the file's bytes, because that detail's subject is one declaration (FR-007).
 * The document those declarations sit in is {@link CODEX_REPO_SETTINGS_RULE}'s
 * recognition of the same file: two rules over one candidate and one read, the
 * arrangement `.claude/settings.json` already has where one rule admits the
 * permission policy inside it and another the settings around it.
 *
 * Admitting the carrier is not asserting Codex loads it: project layers apply
 * only to trusted projects, and whether a declared server is enabled or
 * connected depends on runtime inputs this tool never observes (FR-009).
 * Inspection never connects to a declared server.
 */
export const CODEX_REPO_CONFIG_RULE = {
  ruleId: 'codex.repo.config',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_CONFIG_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
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
            'Project configuration lives in .codex/config.toml, loaded per trusted layer from the project root down to the runtime cwd — the root layer being the one inside the selected Repository boundary.',
        },
        {
          sourceId: 'openai.codex.mcp',
          url: 'https://learn.chatgpt.com/docs/extend/mcp.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Connect Codex to an MCP server'],
          reviewedOn: '2026-07-25',
          establishes:
            'MCP servers are declared as named [mcp_servers.*] tables inside that configuration file, which is why the carrier is admitted for the MCP inventory rather than any standalone MCP file.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The Codex Repository configuration document — the same root
 * `.codex/config.toml` {@link CODEX_REPO_CONFIG_RULE} admits, recognized here
 * as the settings file it is. The vendor contract is explicit that the single
 * admitted carrier owns separate `MCP` and `settings/config` recognitions
 * (contracts/vendors/openai-codex.md § Normative initial-release presentation
 * allowlist), and a recognition is what a rule produces, so each is a rule.
 * Two rules over one path add no read: the walk merges them into one candidate
 * with both provenances, exactly as any two plans admitting one file do.
 *
 * The matcher is shared with the carrier rule rather than restated, because it
 * is the same location and a second spelling of it could drift.
 *
 * The kind's inventory unit is the file (data-model.md § Inventory unit), so
 * this recognition reads nothing out of the document: its detail is the TOML
 * its author wrote, comments and section order intact. The `[mcp_servers.*]`
 * tables inside it belong to the other recognition's rows and are visible here
 * only as part of the one document (FR-007).
 *
 * Admitting the file is not asserting Codex applied it: project layers apply
 * only to trusted projects, the User and system layers this Source excludes
 * resolve against the same keys, and which value wins is a runtime outcome
 * this tool never observes (FR-009). No configured target the document names
 * gains read authority.
 */
export const CODEX_REPO_SETTINGS_RULE = {
  ruleId: 'codex.repo.settings',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_CONFIG_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
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
            'Project configuration lives in .codex/config.toml, loaded per trusted layer from the project root down to the runtime cwd — the root layer being the one inside the selected Repository boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `codex.repo.rules` matcher, authored in the typed segment form the
 * contract table shows: the `.rules` files that are direct children of the
 * Repository root's own `.codex/rules/` directory. The terminal step is a
 * dynamic single-name regex, because the vendor fixes the extension and
 * leaves the basename to the author.
 *
 * Direct children only. Codex documents scanning the layer's `rules/`
 * directory and establishes no nested-subdirectory recursion, so a
 * `.codex/rules/team/deploy.rules` is a near miss rather than a candidate:
 * admitting it would read a file on the strength of a recursion the page does
 * not state (contracts/vendors/openai-codex.md § Known uncertainties, item 2).
 *
 * Root-anchored for the reason every Codex row is. The scan reads one config
 * layer's `rules/` because the selected root is the project root (FR-001); a
 * `packages/api/.codex/rules/` belongs to a runtime working directory this
 * product never selects, so it stays a near miss at every later phase too —
 * the same decision `AGENTS.md` and `.codex/config.toml` already carry.
 */
const CODEX_REPO_RULES_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.codex' },
      { kind: 'literal', value: 'rules' },
      { kind: 'regex', pattern: /\.rules$/u },
    ],
  ],
};

/**
 * Codex Repository rule files: the read-authorizing counterpart of
 * `codex.behavior.repo.rules`. A rule file declares `prefix_rule()` entries
 * deciding whether a matching command may run outside the sandbox; admitting
 * one authorizes reading its bytes and nothing else. This product evaluates no
 * pattern, applies no decision, and runs no command a rule names.
 *
 * The kind is `permissions`, not `rule`, though the vendor calls the files
 * rules: what one decides is which commands may run, where Claude's own
 * `rules` are guidance a product reads, and grouping by the vendors' shared
 * word would put two unrelated subjects in one list (data-model.md
 * § Inventory unit). Its detail is `get-permission-policy-detail`'s result.
 *
 * Admitting a file is not asserting Codex enforces it: project layers apply
 * only to trusted projects, the User and Team Config layers the same scan
 * reads lie outside this Source, and the most restrictive decision across all
 * of them is a runtime outcome this tool never observes (FR-009).
 *
 * `documented` with an `[experimental]` qualifier: the location this rule
 * admits is exactly the one the page names, so the admission itself rests on
 * documented text, while the feature it belongs to is documented as
 * experimental (contracts/vendors/openai-codex.md § Documentation status and
 * lifecycle index). The nesting the behavior statement leaves
 * `partially-documented` is precisely what this matcher declines to admit.
 */
export const CODEX_REPO_RULES_RULE = {
  ruleId: 'codex.repo.rules',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'permissions',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_RULES_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.rules',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/rules.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Create a rules file'],
          reviewedOn: '2026-08-22',
          establishes:
            'A rule file is a .rules file in a rules/ folder next to an active config layer, the project layer being <repo>/.codex/rules/ — the exact location this rule admits — and the page documents no nested subdirectory below it; the User layer at ~/.codex/rules/ that the same scan reads is a different Source boundary this rule may not read.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `codex.repo.skill` matcher, authored in the typed segment form the
 * contract table shows: `.agents/skills/<name>/SKILL.md` directly below the
 * Repository root. `ANY_NAME` is the one direct skill-name child and the
 * terminal `SKILL.md` literal keeps the admitted file exact.
 *
 * Codex scans `.agents/skills` in each directory from its runtime working
 * directory *upward* to the repository root. The selected root is that
 * repository root (`--root`, FR-001), so exactly one directory of that chain
 * is in scope and the program is plainly anchored: no leading
 * `ANY_DIRECTORIES`, and no upward notation to express.
 *
 * A nested `packages/<name>/.agents/skills` is deliberately not admitted. The
 * allowlist is anchored at the selected Repository root and reports that root's
 * customizations; a nested one belongs to a different runtime working
 * directory, which this product does not select and does not model. Codex's own
 * lookup does depend on that directory, and that dependency is recorded as the
 * `runtime-cwd` condition of the recognition rather than as extra admitted
 * paths (FR-003; contracts/vendors/openai-codex.md § Inspector Repository
 * rules).
 */
const CODEX_REPO_SKILL_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.agents' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: 'SKILL.md' },
    ],
  ],
};

/**
 * Codex Repository skills: the read-authorizing counterpart of
 * `codex.behavior.repo.skills`. Admitting a file is not asserting Codex loads
 * it: the User, admin, and system scopes the same discovery strategy spans lie
 * outside this Source, so whether a discovered skill actually wins remains
 * conditional on the runtime inputs this tool never observes.
 *
 * A skill's resources and assets get no rule of their own. A rule that could
 * not authorize a read would state a policy nothing enforces — read
 * authorization comes from the matcher alone, and a `static-candidate` record
 * carrying none is rejected when the registry compiles rather than shipping as
 * an inert row — and the files beside a `SKILL.md` are found by enumerating its
 * directory rather than by reading a declaration, so they are published as
 * `companionFiles` and are never candidates or edges.
 */
export const CODEX_REPO_SKILL_RULE = {
  ruleId: 'codex.repo.skill',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_SKILL_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
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
            'Repository skills live at .agents/skills/<name>/SKILL.md, which is the exact location this rule admits; the User scope the same page documents is a different Source boundary the rule may not read.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `codex.repo.agent` matcher, authored in the typed segment form the
 * contract table shows: the TOML files that are direct children of the
 * Repository root's own `.codex/agents/` directory. The terminal step is a
 * dynamic single-name regex, because the vendor fixes the extension and
 * leaves the basename to the author — Codex identifies an agent by the `name`
 * its file declares, and matching the filename to it is convention rather
 * than lookup.
 *
 * Direct children only, and root-anchored. The page names `.codex/agents/`
 * for project scope and documents no nested search, so a
 * `.codex/agents/team/reviewer.toml` and a `packages/api/.codex/agents/` are
 * both near misses: the first would rest on a recursion the page never
 * states, and the second belongs to a runtime chain member this product does
 * not select — the selected root is the project root (FR-001), the same
 * decision `AGENTS.md`, `.codex/config.toml`, and `.codex/rules/` already
 * carry.
 */
const CODEX_REPO_AGENT_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.codex' },
      { kind: 'literal', value: 'agents' },
      { kind: 'regex', pattern: /\.toml$/u },
    ],
  ],
};

/**
 * Codex Repository custom agents: the read-authorizing counterpart of
 * `codex.behavior.repo.agents`. One admitted file defines one custom agent,
 * and admitting it authorizes reading its bytes and nothing else — this
 * product spawns no session, applies no configuration layer, and opens no
 * path the file names.
 *
 * The declared `mcp_servers` an agent file may carry is that file's own
 * content and joins no MCP row: an MCP declaration's home is an explicit
 * carrier, and a file of another kind spelling MCP-looking configuration is
 * that kind's ordinary content, visible in its own detail (data-model.md
 * § Inventory unit). What the vendor documents about a spawned session
 * inheriting the parent's servers is `codex.agents.inheritance`'s, which
 * explains this rule and admits nothing.
 *
 * Admitting a file is not asserting Codex spawns the agent: project layers
 * apply only to trusted projects, the User scope the same page documents lies
 * outside this Source, and whether a spawn selects this agent at all is a
 * runtime outcome this tool never observes (FR-009).
 *
 * `partially-documented`: the location this rule admits is the one the page
 * names, but the page never states which directories of a project are
 * searched, so the complete project search stays unestablished
 * (contracts/vendors/openai-codex.md § Canonical evidence-assessment index).
 * The nesting that gap would cover is precisely what this matcher declines to
 * admit.
 */
export const CODEX_REPO_AGENT_RULE = {
  ruleId: 'codex.repo.agent',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_AGENT_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.subagents',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Custom agents', 'Custom agent file schema'],
          reviewedOn: '2026-08-22',
          establishes:
            'Project-scoped custom agents are standalone TOML files under .codex/agents/ — the exact location this rule admits — each file defining one agent whose identity is its declared name field; the personal ~/.codex/agents/ scope the same section documents is a different Source boundary this rule may not read, and no nested project directory is named.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `codex.repo.marketplace` matcher: the two exact Repository-root catalog
 * locations, the current `.agents/plugins/marketplace.json` and the
 * legacy-compatible `.claude-plugin/marketplace.json`.
 *
 * Two selectors rather than a first-non-empty probe: the vendor reads both
 * locations, so a repository carrying both has two catalogs and each is a
 * carrier of its own. Which one a client prefers is runtime this product does
 * not observe (FR-009).
 */
const CODEX_REPO_MARKETPLACE_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.agents' },
      { kind: 'literal', value: 'plugins' },
      { kind: 'literal', value: 'marketplace.json' },
    ],
    [
      { kind: 'literal', value: '.claude-plugin' },
      { kind: 'literal', value: 'marketplace.json' },
    ],
  ],
};

/**
 * Codex Repository plugin catalogs: the read-authorizing counterpart of
 * `codex.behavior.repo.marketplace`.
 *
 * Recognized as `plugin` rather than as a kind of its own, because a catalog
 * is the table that resolves a plugin name to the source that plugin comes
 * from: the names its `plugins[]` entries declare are the inventory's rows,
 * and this file is a carrier of them the way `.mcp.json` carries server
 * declarations without being a row itself (data-model.md § Inventory unit).
 *
 * Admitting the catalog also seeds the one closed derivation below: an entry
 * whose source is a validated `./` local path names a plugin root inside this
 * repository, and that root's own manifest is the second carrier of the same
 * row.
 */
export const CODEX_REPO_MARKETPLACE_RULE = {
  ruleId: 'codex.repo.marketplace',
  tool: 'codex',
  discoveryClass: 'static-candidate',
  kind: 'plugin',
  sourceKinds: ['repository'],
  matcher: CODEX_REPO_MARKETPLACE_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: ['How local marketplaces work', 'Marketplace metadata'],
          reviewedOn: '2026-08-25',
          establishes:
            'The desktop app reads a repo marketplace at $REPO_ROOT/.agents/plugins/marketplace.json and a legacy-compatible catalog at $REPO_ROOT/.claude-plugin/marketplace.json — the two exact locations this rule admits — and each is a JSON catalog whose plugins[] entries carry the plugin names and the sources they resolve to.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `codex.excluded.plugin-files`: the plugin content a manifest or a catalog
 * points at — bundled skills, `.mcp.json`, `.app.json`, hook files, assets and
 * scripts — and the installed copies under the Codex plugin cache.
 *
 * A record rather than silence, because these are files a reader can point at
 * and the vendor documents a plugin shipping them. The exclusion is what says
 * the omission is this product's scope rather than the vendor's silence: a
 * component reaches a candidate only through a value another file wrote, and
 * following one would read a file on the strength of a declaration rather than
 * of a documented location (FR-004, FR-024). The installed copies are User
 * state outside this Source entirely.
 *
 * What it excludes is candidacy, not reading. A plugin root is a
 * directory-shaped customization, so its bounded companion census enumerates it
 * and the files inside it are read and published as the plugin's own
 * (contracts/inspection-path-allowlist.md § Bounded companion census). The
 * difference is the whole point: a file is read because it sits in the plugin's
 * directory, never because the manifest named it, so a declared path that
 * escapes the root or names nothing at all is opened by nothing.
 *
 * It authorizes nothing — an `excluded` rule has no matcher, and the shipped
 * selectors reach none of these paths — so it is a maintained statement of
 * scope rather than a mechanism. What a manifest wrote about its components
 * stays visible as the declaration it is, on that manifest's own detail.
 *
 * `kind` is null: an excluded rule recognizes nothing, so it names no
 * recognized kind even though the files it lists are skills, MCP carriers, and
 * hooks in their own right. A census-listed file acquires none either: it has
 * no rule, no recognition, and no inventory row of its own.
 */
export const CODEX_EXCLUDED_PLUGIN_FILES_RULE = {
  ruleId: 'codex.excluded.plugin-files',
  tool: 'codex',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: ['Plugin structure', 'Manifest fields', 'How local marketplaces work'],
          reviewedOn: '2026-08-25',
          establishes:
            'A plugin ships its skills, hooks, .mcp.json, .app.json, and assets beside the manifest that points at them, and an installed plugin is a copy under ~/.codex/plugins/cache that the ChatGPT desktop app loads instead of the marketplace entry — the content this rule keeps on record while admitting none of it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Codex's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const CODEX_INSPECTION_RULES: Readonly<Record<CodexRuleId, InspectionRule>> = {
  [CODEX_DERIVED_FALLBACK_BASENAME_RULE.ruleId]: CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  [CODEX_EXCLUDED_PLUGIN_FILES_RULE.ruleId]: CODEX_EXCLUDED_PLUGIN_FILES_RULE,
  [CODEX_REPO_AGENT_RULE.ruleId]: CODEX_REPO_AGENT_RULE,
  [CODEX_REPO_CONFIG_RULE.ruleId]: CODEX_REPO_CONFIG_RULE,
  [CODEX_REPO_INSTRUCTIONS_RULE.ruleId]: CODEX_REPO_INSTRUCTIONS_RULE,
  [CODEX_REPO_MARKETPLACE_RULE.ruleId]: CODEX_REPO_MARKETPLACE_RULE,
  [CODEX_REPO_RULES_RULE.ruleId]: CODEX_REPO_RULES_RULE,
  [CODEX_REPO_SETTINGS_RULE.ruleId]: CODEX_REPO_SETTINGS_RULE,
  [CODEX_REPO_SKILL_RULE.ruleId]: CODEX_REPO_SKILL_RULE,
};
