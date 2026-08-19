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
// The instruction phase adds seven read-authorizing records and the catalog's
// first two non-read exclusions. The instruction records come in two shapes:
// a root-exact rule for what VS Code and Cloud read from their own roots, and
// a separate CLI-context rule adding a leading recursive step for what the CLI
// reads relative to its standard locations. The split is not redundancy — it
// is how a recognition can say which surfaces admitted a file, since a rule
// carries the surfaces of the behaviors it rests on and a nested file must not
// borrow provenance from a surface that documents no such location.
//
// Rejecting a configured or environment-supplied root is still the matchers'
// own doing — no selector reaches outside the fixed directory spellings, so a
// configured location simply never matches. The two exclusion records exist to
// say that this was decided rather than overlooked: they carry no matcher and
// authorize nothing.
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
import type { CopilotRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * `copilot.repo.instructions.repository`: the one exact
 * `.github/copilot-instructions.md` at the selected root — the VS Code
 * workspace-root file and the Cloud repository-root file, which are the same
 * path from two bases the Inspector's own boundary coincides with (FR-001).
 *
 * Root-exact, with the CLI's additional standard locations left to the
 * separate CLI-context rule below. Splitting them is what keeps a nested file
 * from carrying VS Code or Cloud provenance neither surface documents: a
 * recognition names the surfaces its admitting rules rest on, so one rule per
 * documented base is what makes that name true
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 */
export const COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE = {
  ruleId: 'copilot.repo.instructions.repository',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot-instructions.md' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a .github/copilot-instructions.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code reads exactly one repository-wide instruction file at the workspace root, which is the exact path this rule admits at the selected root.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating repository-wide custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'The cloud agent reads the same file at the repository root, so one root candidate is authored inventory for both surfaces at once.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.repository-cli-context`: the same filename below
 * any directory, because Copilot CLI reads it relative to its standard
 * locations — the repository root, its runtime working directory, the
 * directories between them, and the directories on the path of a file it is
 * working on.
 *
 * An Inspector-only descendant inventory of the contexts a CLI session could
 * have, never a claim that the CLI walks downward. `ANY_DIRECTORIES` matches
 * zero segments, so this program also covers the selected root: the root file
 * is one candidate with two admissions, carrying CLI provenance from here and
 * VS Code/Cloud provenance from the rule above, which is exactly the
 * distinction the split exists to publish rather than a duplicate row.
 */
export const COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE = {
  ruleId: 'copilot.repo.instructions.repository-cli-context',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        ANY_DIRECTORIES,
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot-instructions.md' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers the repository-wide filename in its standard locations — the repository root, the current working directory, the directories between them, and directories on the path of a file it is working on — which is why every context inside the selected root is inventoried instead of the root alone.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix scopes the repository-wide instruction file to the Copilot CLI surface separately from the other two, which is the provenance this rule carries alone.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.path`: the `.instructions.md` files anywhere
 * below the root-exact `.github/instructions/` directory — the VS Code and
 * Cloud subtree, recursive by both surfaces' own documentation.
 *
 * Which files such a file governs is its own `applyTo` declaration, which no
 * matcher reads: admitting it says only that an authored file exists here
 * (FR-009).
 */
export const COPILOT_REPO_INSTRUCTIONS_PATH_RULE = {
  ruleId: 'copilot.repo.instructions.path',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'instructions' },
        ANY_DIRECTORIES,
        { kind: 'regex', pattern: /\.instructions\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use .instructions.md files', 'Instructions file locations'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code searches the workspace .github/instructions folder recursively for files carrying this filename suffix, subdirectories included, which is the subtree this rule admits below the selected root.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating path-specific custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'The cloud agent reads path-specific files within or below the same repository-root subtree, so one candidate there is authored inventory for both surfaces.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.path-cli-context`: the same subtree below any
 * directory, for the same reason as the repository-wide CLI-context rule —
 * the CLI reads `.github/instructions` relative to its standard locations, so
 * the Inspector inventories the contexts inside the selected root.
 *
 * The CLI's documented chain excludes the directories between the repository
 * root and its runtime working directory. That distinction depends on a
 * runtime working directory this product does not observe, so it stays a
 * condition on the behavior rather than narrowing what is admitted here.
 */
export const COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE = {
  ruleId: 'copilot.repo.instructions.path-cli-context',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        ANY_DIRECTORIES,
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'instructions' },
        ANY_DIRECTORIES,
        { kind: 'regex', pattern: /\.instructions\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions', 'Creating path-specific custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers modular instruction files below .github/instructions in its standard locations — excluding the intermediate directories for this filename — and subdirectories may organize them, so which instructions directories exist depends on the context a session runs in rather than on one anchored path.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix scopes path-specific instruction files to the Copilot CLI surface separately from the other two, which is the provenance this rule carries alone.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.agents`: `AGENTS.md` at every depth below the
 * selected root. The one instruction rule the three surfaces share without a
 * CLI-context split, because each documents reaching a nested file in its own
 * way: Cloud takes the nearest one on the worked path, VS Code inventories
 * subfolders under an experimental setting, and the CLI reads it from its
 * standard locations. Which of those a session performs is runtime this
 * product does not observe, so every depth is authored inventory and no
 * per-file classification is published (FR-009).
 *
 * This rule is also where the additional standard locations and the
 * runtime-supplied roots stop being admitted: its terminal literal is exact,
 * so nothing outside the two shipped root alternatives below it and this
 * filename reaches a Copilot instruction candidacy at all
 * ({@link COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE},
 * {@link COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE}).
 */
export const COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE = {
  ruleId: 'copilot.repo.instructions.agents',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [[ANY_DIRECTORIES, { kind: 'literal', value: 'AGENTS.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use an AGENTS.md file', 'Use multiple AGENTS.md files (experimental)'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code applies the workspace-root AGENTS.md always-on and, under an experimental setting, searches every subfolder and leaves the choice among nested files to the model; the settings defaults live on the behavior record this rule rests on.',
        },
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers AGENTS.md in its standard locations, which are directories inside the selected root rather than the root alone.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'The cloud agent accepts AGENTS.md anywhere within the repository and takes the nearest one in the directory tree, so a file at any depth is authored inventory for that surface.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.claude-root`: the root `CLAUDE.md` alone, as the
 * agent-instruction alternative all three surfaces document.
 *
 * Root-exact rather than every-depth, unlike Claude Code's own rule for the
 * same filename: Cloud documents these alternatives at the repository root
 * only, and the additional locations the other two surfaces document —
 * `.claude/CLAUDE.md`, `CLAUDE.local.md`, and non-root files — are outside
 * this release's read allowlist
 * ({@link COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE}). One physical
 * root `CLAUDE.md` is therefore one candidate that both Claude Code and
 * Copilot recognize, while a nested one stays Claude Code's alone.
 */
export const COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE = {
  ruleId: 'copilot.repo.instructions.claude-root',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [[{ kind: 'literal', value: 'CLAUDE.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a CLAUDE.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'With Claude compatibility enabled, VS Code applies CLAUDE.md as always-on instructions; the workspace root is one of its documented locations, and the others are left out of this release rather than denied.',
        },
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers CLAUDE.md in its standard locations as one of its agent-instruction files, so a root file carries CLI provenance beside the other two surfaces.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'A single CLAUDE.md stored in the root of the repository is the cloud agent’s documented alternative to AGENTS.md, which is the exact location this rule admits.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.gemini-root`: the root `GEMINI.md` alone, the
 * other documented agent-instruction alternative. Two surfaces rather than
 * three — VS Code documents no `GEMINI.md` — which is why its recognition
 * names the CLI and Cloud surfaces and not the editor's.
 *
 * No other product in this registry recognizes this filename, so a root
 * `GEMINI.md` is a Copilot-only row.
 */
export const COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE = {
  ruleId: 'copilot.repo.instructions.gemini-root',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [[{ kind: 'literal', value: 'GEMINI.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers GEMINI.md in its standard locations as one of its agent-instruction files; its non-root locations are left out of this release rather than denied.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'A single GEMINI.md stored in the root of the repository is the cloud agent’s documented alternative to AGENTS.md.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Visual Studio Code', 'Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists GEMINI.md among the CLI’s agent-instruction types while the rows for VS Code’s own Copilot Chat list AGENTS.md alone, which is why the editor surface is absent here.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.excluded.additional-standard-locations`: the documented Copilot
 * instruction locations this release does not recognize — VS Code's
 * `.claude/CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules` files, and the
 * CLI's non-root `CLAUDE.md`, `.claude/CLAUDE.md`, and non-root `GEMINI.md`.
 *
 * A record rather than silence, because these are locations a reader can point
 * at: the specification admits only the root `CLAUDE.md` and root `GEMINI.md`
 * for Copilot, and without this row the omission would be indistinguishable
 * from the vendor not documenting them. It authorizes nothing — an `excluded`
 * rule has no matcher, and the shipped selectors already reach none of these
 * paths, so the exclusion is a maintained statement of scope rather than a
 * mechanism (contracts/vendors/github-copilot.md § Documented but excluded by
 * the initial scope).
 *
 * `kind` is null: an excluded rule recognizes nothing, so it has no recognized
 * kind to name even though every location it lists is an instruction file.
 */
export const COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE = {
  ruleId: 'copilot.excluded.additional-standard-locations',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-003', 'FR-004', 'FR-024', 'QR-001', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a CLAUDE.md file', 'Instructions file locations'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code documents the .claude folder spelling of CLAUDE.md, the local CLAUDE.local.md variant, and the Claude-format .claude/rules folder as instruction locations — the locations this release leaves out while keeping the behavior on record.',
        },
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers CLAUDE.md, its .claude spelling, and GEMINI.md in every standard location its session covers, not only at the repository root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.excluded.extra-directories`: the runtime-supplied lookup roots —
 * `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`, `COPILOT_SKILLS_DIRS`, VS Code's
 * custom-location settings, and user-configured skill locations. They are
 * documented behavior and never Repository scan roots or relationships: a
 * scan root is the one selected boundary (FR-001), and a value naming another
 * directory is a condition fact about a session this product does not observe.
 *
 * Rejecting them is the matchers' own doing — no shipped selector reaches
 * outside the fixed directory spellings, so a configured location simply never
 * matches — and this record is what says that omission was decided rather than
 * overlooked.
 *
 * `kind` is null, and here for a second reason as well: the roots it names
 * would supply instruction files and skills alike, so no one recognized kind
 * could stand for it.
 */
export const COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE = {
  ruleId: 'copilot.excluded.extra-directories',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-001', 'FR-003', 'FR-024', 'QR-001', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Directories listed in COPILOT_CUSTOM_INSTRUCTIONS_DIRS supply additional AGENTS.md and *.instructions.md files, which are lookup roots outside the boundary a scan was authorized for.',
        },
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'The CLI reference documents COPILOT_SKILLS_DIRS adding skill lookup roots, which name directories outside the boundary a scan was authorized for.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom instructions settings', 'Agent skills settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code settings can add instruction and skill locations beyond the fixed directories, making participation a runtime input rather than part of the documented default lookup.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

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
  [COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE.ruleId]:
    COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE,
  [COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE.ruleId]: COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE,
  [COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE,
  [COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_PATH_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_PATH_RULE,
  [COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE.ruleId]:
    COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE,
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE.ruleId]:
    COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE,
  [COPILOT_REPO_SKILL_RULE.ruleId]: COPILOT_REPO_SKILL_RULE,
};
