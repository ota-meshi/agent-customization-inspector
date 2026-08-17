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
 * configuration-read stage consumes; this product never publishes or
 * raw-displays the file itself, and its candidacy as an MCP carrier is its
 * own later phase's decision.
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

/** Codex's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const CODEX_INSPECTION_RULES: Readonly<Record<CodexRuleId, InspectionRule>> = {
  [CODEX_DERIVED_FALLBACK_BASENAME_RULE.ruleId]: CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  [CODEX_REPO_INSTRUCTIONS_RULE.ruleId]: CODEX_REPO_INSTRUCTIONS_RULE,
  [CODEX_REPO_SKILL_RULE.ruleId]: CODEX_REPO_SKILL_RULE,
};
