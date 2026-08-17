// GitHub Copilot inspection rules — the implementation counterpart of
// contracts/vendors/github-copilot.md § Inspector Repository matcher rules.
//
// These are read-authorizing records: a `static-candidate` here is the only
// way a Copilot file becomes a candidate, and a candidate is the only thing a
// rule makes readable (contracts/inspection-path-allowlist.md § "Read
// authorization and applicability"). Vendor behaviors, strategies, evidence,
// relationships, and authored file content never grant that authority. Rules
// arrive with the inventory phase that needs them, so the remaining rows of
// the vendor contract are deliberately absent until their phase ships.
//
// This phase adds exactly this one read-authorizing record and no non-read
// exclusion: `copilot.excluded.extra-directories` guards runtime-supplied
// skill roots (`COPILOT_SKILLS_DIRS`, configured locations) that no shipped
// phase reads, and it ships with the phase that needs a shipped record for
// it. Rejecting a configured root here is the matcher's own doing — no
// selector reaches outside the three fixed directory spellings, so a
// configured location simply never matches.
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
import type { CopilotRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * The `copilot.repo.skill` matcher, authored in the typed segment form the
 * contract table shows: one root-anchored program per fixed skills directory —
 * `['.github', 'skills', ANY_NAME, 'SKILL.md']`,
 * `['.agents', 'skills', ANY_NAME, 'SKILL.md']`, and
 * `['.claude', 'skills', ANY_NAME, 'SKILL.md']`. `ANY_NAME` is the one direct
 * skill-name child and the terminal `SKILL.md` literal keeps the admitted
 * file exact.
 *
 * Anchored like Codex's program, and for the same reason: no Copilot surface
 * documents a downward skill lookup from a root context — VS Code and Cloud
 * read their exact workspace or repository root, and the CLI reads its
 * runtime project plus the upward parent-`.github/skills` monorepo tier — so
 * a nested skills directory belongs to a runtime context this product does
 * not select, and admitting it would report what a subdirectory launch or a
 * nested workspace folder would read rather than this root's customizations
 * (FR-003). That dependency stays the `runtime-cwd`/`workspace-root`
 * condition on the behavior records, never an admission
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 *
 * The three programs differ only in their fixed directory literal, so nothing
 * matches outside those three spellings — a configured or
 * environment-supplied skills root is rejected by never being matched, not by
 * an exclusion list.
 */
const COPILOT_REPO_SKILL_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.github' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: 'SKILL.md' },
    ],
    [
      { kind: 'literal', value: '.agents' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: 'SKILL.md' },
    ],
    [
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: 'SKILL.md' },
    ],
  ],
};

/**
 * Copilot Repository skills: the read-authorizing counterpart of the three
 * surface behaviors `copilot.behavior.vscode.skills`,
 * `copilot.behavior.cli.skills`, and `copilot.behavior.cloud.skills`.
 * Admitting a file is not asserting Copilot loads it: User, plugin, and
 * hosted scopes lie outside this Source, and whether a discovered skill wins
 * its name remains surface-conditional runtime this tool never observes.
 *
 * Two of the three directories are other products' spellings — `.agents` is
 * Codex's location and `.claude` is Claude's — so one physical root file
 * there is one candidate with several admitting rules, and the recognition
 * matrix (Copilot-only `.github`, Codex+Copilot `.agents`, Claude+Copilot
 * `.claude`, with a nested `.claude` skill Claude's alone through its own
 * documented lazy descendant discovery) falls out of the shipped matchers
 * rather than being tabulated anywhere.
 *
 * A skill's resources and assets get no rule of their own: the files beside a
 * `SKILL.md` are published as `companionFiles` through the bounded census and
 * are never candidates or edges.
 */
export const COPILOT_REPO_SKILL_RULE = {
  ruleId: 'copilot.repo.skill',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  matcher: COPILOT_REPO_SKILL_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.skills',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-skills',
          officialHost: 'code.visualstudio.com',
          sections: ['Create a skill', 'How Copilot uses skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'VS Code reads workspace skills from the three fixed directories this rule admits, each skill one named directory carrying its own SKILL.md.',
        },
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'The Skill locations table loads project skills from .github/skills, .agents/skills, and .claude/skills at the runtime project and inherits parent-directory .github/skills layers for monorepos — no downward tier, which is why this rule stays anchored at the selected root.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['Creating and adding a skill'],
          reviewedOn: '2026-07-15',
          establishes:
            'The cloud agent reads the same three directories at the repository root, so a root candidate is authored inventory for all three surfaces at once.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Copilot's contribution to the inspection-rule registry, keyed by `ruleId`. */
export const COPILOT_INSPECTION_RULES: Readonly<Record<CopilotRuleId, InspectionRule>> = {
  [COPILOT_REPO_SKILL_RULE.ruleId]: COPILOT_REPO_SKILL_RULE,
};
