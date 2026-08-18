// Anthropic Claude Code inspection rules — the implementation counterpart of
// contracts/vendors/claude-code.md § Repository Inspector matchers.
//
// These are read-authorizing records: a `static-candidate` here is the only way
// a Claude file becomes a candidate, and a candidate is the only thing a rule
// makes readable (contracts/inspection-path-allowlist.md § "Read authorization
// and applicability"). The one read no rule authorizes is a companion's, which
// a recognized kind's census bounds to an admitted candidate's own directory.
// Vendor behaviors, strategies, evidence, relationships, and authored file
// content never grant that authority. Rules arrive with the inventory phase
// that needs them, so the remaining rows of the vendor contract are
// deliberately absent until their phase ships.
//
// The shipped records carry no non-read exclusion: the vendor contract's
// `claude.excluded.user-runtime` and `claude.excluded.plugin-files` guard
// Sources and components no shipped phase reads yet, an unsupported
// instruction location is simply a path no selector reaches, and a symlinked
// skill needs no exclusion at all because links are read through their targets
// (FR-024; contracts/vendors/claude-code.md § Known ambiguities item 9). The
// registry-wide identifier catalog and its complete gate are owned by T913.
//
// Each rule is its own `export const` so a relation can name it directly.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union, the computed key would stop
// resolving to a property, and the map's completeness check would break;
// `satisfies` keeps the literal, so a key cannot disagree with the record it
// points at.
import {
  ANY_DIRECTORIES,
  ANY_NAME,
  type StructuredInspectorMatcher,
} from '../../../server/inspection/rules/registry';
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { ClaudeRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * The `claude.repo.instructions` matcher, authored in the typed segment form
 * the contract table shows: `[ANY_DIRECTORIES, 'CLAUDE.md']` and
 * `[ANY_DIRECTORIES, 'CLAUDE.local.md']`. Two programs rather than one dynamic
 * step, so each admission carries which authored filename matched.
 *
 * `ANY_DIRECTORIES` includes zero segments, so each program reaches the
 * Repository root and every descendant directory alike — including `.claude`,
 * which is an ordinary directory name to the recursive step. The
 * `./.claude/CLAUDE.md` form the page names as the other project instruction
 * location therefore needs no selector of its own; a third
 * `['.claude', 'CLAUDE.md']` program would only add a second admission of a
 * file the first one already admitted.
 *
 * The descendant reach is what the vendor documents rather than an Inspector
 * widening: Claude loads the launch directory's files at session start, walks
 * its ancestors, and discovers subdirectory files on demand as it reads files
 * under them. Which of those a concrete session loads depends on its working
 * directory and on the files it worked on, neither of which this tool
 * observes, so no admission classifies a file as a launch, ancestor, or
 * descendant one (FR-009; contracts/vendors/claude-code.md § Repository
 * Inspector matchers).
 */
const CLAUDE_REPO_INSTRUCTIONS_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [ANY_DIRECTORIES, { kind: 'literal', value: 'CLAUDE.md' }],
    [ANY_DIRECTORIES, { kind: 'literal', value: 'CLAUDE.local.md' }],
  ],
};

/**
 * Claude Repository instructions: the read-authorizing counterpart of the
 * three documented Repository instruction lookups. Admitting a file is not
 * asserting Claude loads it — an empty file is admitted and published like
 * any other readable candidate — and the User scope the same layering
 * composes lies outside this Source.
 *
 * `AGENTS.md` gets no selector here, and that is the vendor's own statement
 * rather than an omission: Claude Code reads `CLAUDE.md`, not `AGENTS.md`, and
 * a repository already using `AGENTS.md` is told to import it from a
 * `CLAUDE.md`. Recognizing the filename for Claude would report a file Claude
 * does not read.
 */
export const CLAUDE_REPO_INSTRUCTIONS_RULE = {
  ruleId: 'claude.repo.instructions',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_INSTRUCTIONS_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: [
            'Choose where to put CLAUDE.md files',
            'AGENTS.md',
            'How CLAUDE.md files load',
          ],
          reviewedOn: '2026-08-18',
          establishes:
            'Project instructions are ./CLAUDE.md or ./.claude/CLAUDE.md and local instructions ./CLAUDE.local.md; the same two filenames are checked in every directory above the working directory and discovered in subdirectories below it, which is the shape this rule admits at the selected root and every descendant. Claude Code reads CLAUDE.md and not AGENTS.md, which is why no selector here names that filename.',
        },
        {
          sourceId: 'anthropic.claude-code.sdk.setting-sources',
          url: 'https://code.claude.com/docs/en/agent-sdk/claude-code-features',
          officialHost: 'code.claude.com',
          sections: ['CLAUDE.md load locations'],
          reviewedOn: '2026-08-18',
          establishes:
            'The load-location table lists the project root, parent-directory, subdirectory, and local rows separately, and each is gated on a settingSources value — a runtime input this tool never observes, which is why one rule admits every depth and classifies none of them.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.skill` matcher, authored in the typed segment form the
 * contract table shows: `[ANY_DIRECTORIES, '.claude', 'skills', ANY_NAME,
 * 'SKILL.md']`. `ANY_NAME` is the one direct skill-name child and the terminal
 * `SKILL.md` literal keeps the admitted file exact.
 *
 * The leading `ANY_DIRECTORIES` is the difference from the anchored Codex
 * program, and it is deliberate: Claude discovers ancestor skill layers at
 * startup *and* nested descendant skill directories on demand, so a
 * `packages/api/.claude/skills` directory is a layer Claude can genuinely load
 * once a file under it is accessed. Broad descendant inventory shows what
 * could matter under another runtime `cwd` or after lazy discovery; it never
 * claims Claude loaded the file — which layer actually participates stays
 * conditional on `runtime-cwd` and `worked-path`
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
const CLAUDE_REPO_SKILL_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      ANY_DIRECTORIES,
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: 'SKILL.md' },
    ],
  ],
};

/**
 * Claude Repository skills: the read-authorizing counterpart of
 * `claude.behavior.repo.skills`. Admitting a file is not asserting Claude
 * loads it: enterprise, User, and bundled scopes lie outside this Source, and
 * whether a discovered skill actually wins its name remains conditional on
 * the runtime inputs this tool never observes.
 *
 * A skill's resources and assets get no rule of their own: the files beside a
 * `SKILL.md` are found by enumerating its directory rather than by reading a
 * declaration, so they are published as `companionFiles` and are never
 * candidates or edges. A symlinked skill is inspected through its resolved
 * target exactly as Claude would read it, so no symlink rule exists either
 * (FR-024).
 */
export const CLAUDE_REPO_SKILL_RULE = {
  ruleId: 'claude.repo.skill',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_SKILL_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: ['Where skills live'],
          reviewedOn: '2026-08-08',
          establishes:
            'Repository skills live at .claude/skills/<skill-name>/SKILL.md on each layer from the working directory through the repository root, which is why this rule admits that shape at the selected root and every descendant directory.',
        },
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Skills-directory plugins'],
          reviewedOn: '2026-07-25',
          establishes:
            'A skills directory at the exact launch working directory can also be interpreted as a plugin, a separate documented behavior that differs from plain-skill ancestor and lazy-descendant discovery and grants this rule no manifest authority.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Claude's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const CLAUDE_INSPECTION_RULES: Readonly<Record<ClaudeRuleId, InspectionRule>> = {
  [CLAUDE_REPO_INSTRUCTIONS_RULE.ruleId]: CLAUDE_REPO_INSTRUCTIONS_RULE,
  [CLAUDE_REPO_SKILL_RULE.ruleId]: CLAUDE_REPO_SKILL_RULE,
};
