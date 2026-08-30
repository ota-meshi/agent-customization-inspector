// GitHub Copilot inspection rules — the implementation counterpart of
// contracts/vendors/github-copilot.md § Inspector Repository matcher rules.
//
// These are read-authorizing records: a `static-candidate` here is the only
// way a Copilot file becomes a candidate, and a candidate is the only thing a
// rule makes readable (contracts/inspection-path-allowlist.md § "Read
// authorization and applicability"). Vendor behaviors, strategies, evidence,
// relationships, and authored file content never grant that authority. The
// catalog below is complete over this vendor's contract: it is typed
// `Readonly<Record<CopilotRuleId, InspectionRule>>`, so a contract row with
// no record here is a compile error rather than a silent gap.
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
import { ANY_DIRECTORIES, ANY_NAME } from '../../../server/inspection/rules/registry';
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
 * any directory, justified by the worked-file half of the CLI's standard
 * locations alone — the CLI documents this filename in the directories on the
 * path of a file it is working on, and every directory below the selected
 * root lies on the path of the files under it, so the vendor documents the
 * filename at every depth. The chain half — the repository root, the runtime
 * working directory, and the directories between them — justifies nothing
 * below the root: its one member every session shares is the selected root.
 *
 * Never a claim that the CLI walks downward. `ANY_DIRECTORIES` matches
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
          reviewedOn: '2026-08-27',
          establishes:
            'Copilot CLI discovers the repository-wide filename in its standard locations, which include the directories on the path of a file it is working on — the documented worked-file reach that is why this rule admits the filename at every depth, since every directory lies on the path of the files under it — while the chain locations (root, working directory, the directories between them) contribute only the selected root, the one member every session shares.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-27',
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
 * the CLI documents `.github/instructions` in the directories on the path of
 * a file it is working on, which puts the subtree at every depth below the
 * selected root; the chain locations contribute only the root itself.
 *
 * The CLI's documented chain excludes the directories between the repository
 * root and its runtime working directory for this filename. That distinction
 * depends on a runtime working directory this product does not observe, so it
 * stays a condition on the behavior rather than narrowing what is admitted
 * here.
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
          reviewedOn: '2026-08-27',
          establishes:
            'Copilot CLI discovers modular instruction files below .github/instructions in its standard locations — excluding the intermediate directories for this filename — and those locations include the directories on the path of a file it is working on, the documented worked-file reach that is why this rule admits the subtree at every depth; subdirectories inside each instructions directory may organize the files.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-27',
          establishes:
            'The support matrix scopes path-specific instruction files to the Copilot CLI surface separately from the other two, which is the provenance this rule carries alone.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.repo.instructions.agents`: `AGENTS.md` at every depth below the
 * selected root. The one instruction rule the three surfaces share without a
 * CLI-context split, because each documents reading a nested file in its own
 * way: Cloud takes the nearest one on the worked path, VS Code inventories
 * subfolders under an experimental setting, and the CLI documents it in the
 * directories on the path of a file it is working on. Which of those a
 * session performs is runtime this product does not observe, so every depth
 * is authored inventory and no per-file classification is published (FR-009).
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
          reviewedOn: '2026-08-27',
          establishes:
            'Copilot CLI discovers AGENTS.md in its standard locations, which include the directories on the path of a file it is working on — the documented worked-file reach that puts the filename at every depth below the selected root, while the chain locations contribute only the root itself.',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
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
          reviewedOn: '2026-08-27',
          establishes:
            'Directories listed in COPILOT_CUSTOM_INSTRUCTIONS_DIRS supply additional AGENTS.md and *.instructions.md files, which are lookup roots outside the boundary a scan was authorized for.',
        },
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-08-27',
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
 * Copilot CLI commands: the read-authorizing counterpart of
 * `copilot.behavior.cli.commands`. A command file is the alternative skill
 * format the CLI documents — a plain `.md` file whose name is its filename,
 * needing no `name` field — and admitting one authorizes reading its bytes
 * and nothing else.
 *
 * The admitted files are the same physical files Claude's own command rule
 * admits at the root, which is two products documenting a read of one path
 * rather than a collision: each recognizes it, and the inventory row states
 * both (FR-004). Below the root the two part company, because only Claude
 * documents the recursion.
 *
 * Admitting a file is not asserting Copilot runs it: a same-name skill has
 * higher priority, and which sources a session loads is runtime this tool
 * never observes (FR-009).
 *
 * `partially-documented`, from the behavior statement it rests on: the
 * reference implies a project location without anchoring it, and states no
 * ancestor or recursive traversal.
 */
export const COPILOT_REPO_COMMAND_RULE = {
  ruleId: 'copilot.repo.command',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'prompt/command',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.command` matcher, authored in the typed segment form the
   * contract table shows: the one program
   * `['.claude', 'commands', /\.md$/u]`.
   *
   * Root-exact and direct-child, and deliberately narrower than Claude's rule
   * over the same directory. The CLI reference documents the location as
   * `.claude/commands/*.md` and establishes neither a project anchor nor an
   * ancestor or recursive walk, so anything past a root direct child would be
   * this product's invention: `packages/api/.claude/commands/deploy.md` and
   * `.claude/commands/frontend/component.md` are both paths Copilot documents
   * no read of, and both stay near misses here while the second remains a
   * Claude candidate (contracts/vendors/github-copilot.md § Inspector
   * Repository matcher rules; § Known conflicts and uncertainties item 3).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'commands' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Commands (alternative skill format)'],
          reviewedOn: '2026-08-27',
          establishes:
            'Commands are an alternative to skills stored as individual .md files in .claude/commands/, the command name is derived from the filename, the format needs no name field, and a same-name skill has higher priority. The section establishes no project anchor and no ancestor or recursive discovery, which is why this rule admits root direct children alone.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot VS Code prompt files: the read-authorizing counterpart of
 * `copilot.behavior.vscode.prompts`. A prompt file is Markdown a reader
 * invokes manually with a `/`, and admitting one authorizes reading its bytes
 * and nothing else.
 *
 * It is the `prompt/command` kind, the same kind the legacy command files
 * carry, which is what puts a prompt and a command of one name on one
 * inventory row (data-model.md § Inventory unit). What differs is where the
 * name comes from: a prompt file declares its own `name` and falls back to its
 * file name, while a command file declares none at all.
 *
 * Admitting a file is not asserting VS Code offers it: a prompt is invoked
 * manually, and which locations a workspace actually searches turns on a
 * setting this tool never reads (FR-009).
 *
 * `partially-documented`, from the behavior statement it rests on: what the
 * default folder does with a nested directory is not stated.
 */
export const COPILOT_REPO_PROMPT_RULE = {
  ruleId: 'copilot.repo.prompt',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'prompt/command',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.prompt` matcher, authored in the typed segment form the
   * contract table shows: the one program
   * `['.github', 'prompts', /\.prompt\.md$/u]`.
   *
   * Root-exact and direct-child. The page gives one default folder for the
   * workspace scope and puts every further location behind a setting this tool
   * never reads, so a nested `.github/prompts/team/deploy.prompt.md` is a path
   * whose treatment the page does not state and this rule does not guess
   * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'prompts' },
        { kind: 'regex', pattern: /\.prompt\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.prompts',
          url: 'https://code.visualstudio.com/docs/agent-customization/prompt-files',
          officialHost: 'code.visualstudio.com',
          sections: ['Prompt file locations', 'Prompt file format', 'Create a prompt file'],
          reviewedOn: '2026-08-22',
          establishes:
            'A workspace keeps its prompt files in the .github/prompts folder and they carry the .prompt.md extension — the exact shape this rule admits — while further locations come from a setting and the default folder is stated without saying what it does with a nested directory.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
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
   * documents a downward or worked-file skill lookup — VS Code and Cloud
   * read their exact workspace or repository root, and the CLI reads its
   * runtime project plus the upward parent-`.github/skills` monorepo tier — so
   * a nested skills directory is a runtime-chain member this product does not
   * select and is never a candidate (FR-003). The chain's one member every
   * session shares is the selected root, which these anchored programs admit;
   * the runtime dependency stays the `runtime-cwd`/`workspace-root` condition
   * on the behavior records, never an admission
   * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
   *
   * The three programs differ only in their fixed directory literal, so nothing
   * matches outside those three spellings — a configured or
   * environment-supplied skills root is rejected by never being matched, not by
   * an exclusion list.
   */
  matcher: {
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
          reviewedOn: '2026-08-27',
          establishes:
            'The Skill locations table loads project skills from .github/skills, .agents/skills, and .claude/skills at the runtime project and inherits parent-directory .github/skills layers for monorepos — no downward tier, which is why this rule stays anchored at the selected root.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['Creating and adding a skill'],
          reviewedOn: '2026-08-27',
          establishes:
            'The cloud agent reads the same three directories at the repository root, so a root candidate is authored inventory for all three surfaces at once.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot CLI workspace MCP declarations: the read-authorizing counterpart of
 * `copilot.behavior.cli.mcp`, at the one chain point this product's frame
 * contains — the selected root. Admitting a carrier is not asserting the CLI
 * connects anything — workspace trust stays a condition this tool never
 * observes — and no declared command, URL, or path gains read or connection
 * authority from the admission.
 *
 * The root `.mcp.json` this rule admits is the same physical file
 * `claude.repo.mcp` admits: one candidate, one read, two tools' recognitions
 * (data-model.md § ToolRecognition). The User configuration at
 * `<COPILOT_HOME>/mcp-config.json`, session additional configuration, plugin
 * servers, and hosted state are different boundaries no Repository rule may
 * read; their statements exist as non-authorizing behavior records, and the
 * exclusions that name them ship with the Global phase that owns them
 * (FR-015, FR-018).
 */
export const COPILOT_REPO_MCP_RULE = {
  ruleId: 'copilot.repo.mcp',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.mcp` matcher, authored in the typed segment form the
   * contract table shows: the two root-exact programs `['.mcp.json']` and
   * `['.github', 'mcp.json']`. Two programs rather than one dynamic step, so
   * each admission carries which authored spelling matched.
   *
   * Root-exact and deliberately not recursive: the vendor documents these
   * files on an upward walk whose one terminal every session shares is the Git
   * root — the selected root is the only point of that chain this product's
   * frame contains, so a subdirectory file is a runtime-chain member this
   * product does not select and is never a candidate
   * (contracts/vendors/github-copilot.md § Inspector Repository matcher
   * rules), exactly as a nested `AGENTS.md` is never a Codex candidate. This
   * differs from the CLI instruction rules' descendant inventory, whose
   * documented locations include the directories on the path of a file being
   * worked on — an anchor the whole tree carries; the MCP walk documents no
   * worked-file anchor.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [{ kind: 'literal', value: '.mcp.json' }],
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'mcp.json' },
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
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['MCP server configuration'],
          reviewedOn: '2026-08-27',
          establishes:
            'Workspace MCP servers are .mcp.json and .github/mcp.json files on an upward walk that terminates at the Git root, which is why this rule admits both spellings at the selected root — the one walk member every session shares — and nothing below it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot VS Code workspace MCP declarations: the read-authorizing
 * counterpart of `copilot.behavior.vscode.mcp` for the dedicated
 * `.vscode/mcp.json` carrier the current guide documents. Its schema is the
 * guide's own — a top-level `servers` map read as JSONC, the editor's
 * configuration format — and differs from the CLI carriers' strict-JSON
 * schemas, which is why the rule compiles into its own reading unit.
 * Admitting the carrier asserts nothing about trust or enablement, and no
 * declared command, URL, or path gains read or connection authority
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 */
export const COPILOT_REPO_MCP_VSCODE_RULE = {
  ruleId: 'copilot.repo.mcp.vscode',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.mcp.vscode` matcher: the one exact workspace program
   * `['.vscode', 'mcp.json']`. Root-exact by the guide's own words — the
   * workspace location is the workspace root's `.vscode` directory — so a
   * subdirectory `.vscode/mcp.json` belongs to a workspace this product does
   * not select and is a near miss.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.vscode' },
        { kind: 'literal', value: 'mcp.json' },
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
          sourceId: 'vscode.copilot.mcp',
          url: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure the mcp.json file'],
          reviewedOn: '2026-08-20',
          establishes:
            'The workspace location for the mcp.json configuration is .vscode/mcp.json in the project, declared with the top-level servers map, which is the exact path and schema this rule admits and reads.',
        },
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['MCP server configuration'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLI documents its own workspace carriers and schemas apart from this file, which is why the VS Code carrier compiles into its own reading unit instead of sharing the CLI extraction.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * VS Code 1.118+ path/surface provenance for the workspace-root `.mcp.json`:
 * the release note documents the location, while the current guide's
 * exhaustive location list omits it and neither page establishes the root
 * file's VS Code schema — the conflict the based-on behavior records. The
 * rule therefore compiles into the provenance-only MCP unit: its admission
 * puts the VS Code surface on the root carrier's one Copilot recognition,
 * and the declarations of that recognition stay the co-admitting CLI rule's
 * independently documented extraction. No VS Code-owned extractor exists
 * until direct documentation resolves the conflict
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 */
export const COPILOT_REPO_MCP_VSCODE_ROOT_RULE = {
  ruleId: 'copilot.repo.mcp.vscode-root',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.mcp.vscode-root` matcher: the one exact root program
   * `['.mcp.json']` — the same physical path one of `copilot.repo.mcp`'s
   * selectors admits, on purpose: the two admissions are two provenances of
   * one candidate, never two files or two reads.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [[{ kind: 'literal', value: '.mcp.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.mcp.workspace-root-release',
          url: 'https://code.visualstudio.com/updates/v1_118',
          officialHost: 'code.visualstudio.com',
          sections: ['Workspace .mcp.json files and server deduplication'],
          reviewedOn: '2026-08-20',
          establishes:
            'VS Code 1.118 reads workspace-level .mcp.json files as MCP server declarations, which is the exact root path this provenance admits; the note defines no schema for the file, which is why the admission stays path and surface only.',
        },
        {
          sourceId: 'vscode.copilot.mcp',
          url: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure the mcp.json file'],
          reviewedOn: '2026-08-20',
          establishes:
            'The current guide names exactly two locations for the mcp.json file and the workspace root is not one of them, which is the conflict with the release note this rule retains rather than resolves.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot Repository custom agents: the read-authorizing counterpart of the
 * three surface behaviors that document the same two directories. One
 * admission covers all three, which is what puts every recognizing surface on
 * the file's one recognition (`CandidateProvenance.recognizingSurfaces`).
 *
 * The `.claude/agents/` directory the CLI and VS Code also read belongs to
 * `copilot.repo.agent.claude`, whose surfaces are those two alone.
 *
 * A declared `mcp-servers` block is this file's own frontmatter and joins no
 * MCP row: an MCP declaration's home is an explicit carrier (data-model.md
 * § Inventory unit). The shared profile format documents that field as not
 * used in VS Code and other IDE custom agents at all, which is a runtime fact
 * this product does not project either (FR-009).
 *
 * Admitting a file is not asserting any surface loads the agent: which
 * locations a session searches, whether a profile's `target` includes the
 * running surface, and whether an organization profile of the same name
 * outranks it are runtime inputs this tool never observes.
 */
export const COPILOT_REPO_AGENT_RULE = {
  ruleId: 'copilot.repo.agent',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.agent` matcher, authored in the typed segment form the
   * contract table shows: the Markdown direct children of the Repository root's
   * own `.github/agents/` directory.
   *
   * The `.claude/agents/` directory two of the three surfaces also read has a
   * rule of its own rather than a second selector here, for the reason the
   * repository instruction filename has a CLI-context rule of its own: a rule's
   * surfaces are derived from the behaviors it rests on, so one rule spanning
   * both directories would tag a `.claude/agents/*.md` with the Cloud agent
   * surface, which documents `.github/agents/` alone
   * (`rules/registry.ts` § recognizingSurfaces,
   * contracts/vendors/github-copilot.md § Documented Cloud agent behavior).
   *
   * Direct children, and root-anchored. Every surface documents a root-anchored
   * location — VS Code the workspace root, the cloud agent the repository root,
   * and the CLI an upward walk from its working directory whose one member every
   * session shares is the selected root (FR-001) — so a
   * `packages/api/.github/agents/reviewer.md` belongs to a runtime chain member
   * this product does not select and is a near miss rather than a candidate. No
   * recursive step either: none of the three pages documents a subfolder inside
   * an agents directory, unlike Claude's own subagent page, so admitting one
   * would rest on a search no official text establishes
   * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
   *
   * The `*.agent.md` spelling the cloud agent also documents needs no selector
   * of its own: it ends in `.md`, so the one dynamic step already admits it.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Custom agent locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLI loads project agents from .github/agents/ — the directory this rule admits — walking upward from the working directory to the Git root, whose one member every session shares is the selected root; the ~/.copilot/agents/ user scope named beside it is a different Source boundary this rule may not read.',
        },
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['YAML frontmatter properties'],
          reviewedOn: '2026-08-20',
          establishes:
            'A repository agent profile is one Markdown file with YAML frontmatter, named for deduplication by its own file name minus .md or .agent.md, so both spellings this rule admits are the same documented file kind.',
        },
        {
          sourceId: 'vscode.copilot.custom-agents',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-agents',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agent file locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'VS Code reads the same workspace directory, accepting any .md file in it, and treats parent-folder discovery as an opt-in setting rather than part of the default lookup — which is why the rule stays anchored at the selected root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Copilot Repository custom agents in `.claude/agents/`: the read-authorizing
 * counterpart of the two surface behaviors that document that directory. The
 * Cloud agent is deliberately absent — its own behavior names
 * `.github/agents/` alone — which is the whole reason this is a rule rather
 * than a second selector of {@link COPILOT_REPO_AGENT_RULE}: a rule's
 * surfaces are derived from the behaviors it rests on, so one rule spanning
 * both directories would report the hosted agent as reading a file no page
 * says it reads (`rules/registry.ts` § recognizingSurfaces).
 *
 * A file here is admitted by this rule and by `claude.repo.agent` alike: one
 * physical file, two products' recognitions, read once (`scan.ts`). Their
 * answers differ where the vendors differ — Claude names the agent by its
 * declared `name`, Copilot by the configuration file's own name — which is
 * why the naming question belongs to the admitting rule
 * (`registry.ts` § CompiledStaticAgentRule).
 *
 * Everything else it shares with its sibling: a declared `mcp-servers` block
 * is this file's own frontmatter and joins no MCP row (data-model.md
 * § Inventory unit), and admitting a file asserts no surface loads the agent
 * (FR-009).
 */
export const COPILOT_REPO_AGENT_CLAUDE_RULE = {
  ruleId: 'copilot.repo.agent.claude',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.agent.claude` matcher: the same direct-child shape one
   * directory over. Its own program because its rule is its own; the
   * `copilot.repo.agent` matcher above states why the two directories are not
   * one rule.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Custom agent locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLI loads project agents from .claude/agents/ as well as .github/agents/, walking upward from the working directory to the Git root, whose one member every session shares is the selected root.',
        },
        {
          sourceId: 'vscode.copilot.custom-agents',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-agents',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agent file locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'VS Code reads .claude/agents/ in the workspace beside .github/agents/, accepting any .md file in it, and treats parent-folder discovery as an opt-in setting rather than part of the default lookup — which is why the rule stays anchored at the selected root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot Repository settings: the supported settings documents, recognized
 * as the `settings/config` kind whose row unit is the file.
 *
 * Two of the four are shared physical files with Claude Code, which admits
 * them under its own rules: one file, one read, and one recognition per
 * product — which is what the surfaces on each recognition are for (FR-004).
 *
 * This recognition reads nothing out of a document: its detail is the JSON its
 * author wrote (FR-007). What may be written inside — an inline `hooks` block,
 * an `enabledPlugins` map, a `permissions` object — belongs to the Hook,
 * Plugin, and permissions recognitions of the same files, each arriving with
 * its own phase; a settings file is never an MCP owner, because an MCP
 * declaration's home is an explicit carrier and nothing else (data-model.md
 * § Inventory unit).
 *
 * Admitting a file is not asserting Copilot applied it: the value a session
 * uses comes out of the documented defaults/managed/User/repository/local/
 * environment/flag cascade, and which surface is running at all is runtime
 * this tool never observes (FR-009).
 */
export const COPILOT_REPO_SETTINGS_RULE = {
  ruleId: 'copilot.repo.settings',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.settings` matcher: the two GitHub Copilot settings
   * documents and the two cross-tool Claude-format ones the CLI reads for the
   * documented shared subset, each an exact Repository-root location. Four
   * programs rather than one dynamic step, so each admission carries which
   * authored filename matched.
   *
   * Every location is spelled out here rather than assembled from the two pair
   * matchers above: which files a matcher selects has to be readable from the
   * matcher itself. The CLI reads all four as settings documents, while each
   * hook rule takes the pair its own surfaces document.
   *
   * Root-anchored with no recursive step: the pages name these locations as the
   * repository's own, and a settings file in a subdirectory is a path the vendor
   * documents no read of. A configured location is not here either — a
   * runtime-supplied root is `copilot.excluded.extra-directories`' fact and
   * never a scan root (FR-001).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot' },
        { kind: 'literal', value: 'settings.json' },
      ],
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot' },
        { kind: 'literal', value: 'settings.local.json' },
      ],
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'settings.json' },
      ],
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'settings.local.json' },
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
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Configuration file settings'],
          reviewedOn: '2026-08-27',
          establishes:
            'The repository settings file is .github/copilot/settings.json and the local one .github/copilot/settings.local.json — the exact locations this rule admits — and the CLI also reads .claude/settings.json and .claude/settings.local.json for the shared cross-tool subset, which is the other pair.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.excluded.vscode-settings`: VS Code's general workspace
 * `.vscode/settings.json`. It is a documented setting input, and it is left
 * out of this release's read allowlist: it is the editor's own settings
 * document rather than a Copilot customization, and what this product admits
 * under `.vscode/` is the dedicated `.vscode/mcp.json` carrier alone.
 *
 * Rejecting it is the matchers' own doing — no shipped selector names that
 * path — and this record is what says the omission was decided rather than
 * overlooked.
 */
export const COPILOT_EXCLUDED_VSCODE_SETTINGS_RULE = {
  ruleId: 'copilot.excluded.vscode-settings',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-003', 'FR-004', 'QR-001', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.settings',
          url: 'https://code.visualstudio.com/docs/configure/settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Workspace settings'],
          reviewedOn: '2026-08-23',
          establishes:
            'Workspace settings are stored in a .vscode/settings.json inside the workspace, which is the general editor settings document this release does not admit.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.excluded.cli-lsp`: the CLI's `.github/lsp.json`. It is documented
 * project configuration and is left out of this release's read allowlist
 * because it configures language servers rather than the agent's
 * customization — it is not a Supported Initial Release Customization File.
 *
 * Rejecting it is the matchers' own doing, exactly as for the VS Code settings
 * exclusion above.
 */
export const COPILOT_EXCLUDED_CLI_LSP_RULE = {
  ruleId: 'copilot.excluded.cli-lsp',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-003', 'FR-004', 'FR-020', 'QR-001', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.lsp',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers',
          officialHost: 'docs.github.com',
          sections: ['How LSP servers are loaded'],
          reviewedOn: '2026-08-23',
          establishes:
            'The project LSP configuration is .github/lsp.json in the current repository, the highest of three language-server configuration priorities — configuration for language servers rather than for the agent customization this product inventories.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot Repository plugin catalogs: the read-authorizing counterpart of the
 * two plugin behaviors, one per surface.
 *
 * Recognized as `plugin` rather than as a kind of its own, for the reason the
 * other vendors' catalogs are: a catalog is the table that resolves a plugin
 * name to the source that plugin comes from, so the names its `plugins[]`
 * entries declare are the inventory's rows and this file is a carrier of them
 * (data-model.md § Inventory unit).
 *
 * No rule admits a plugin manifest. A manifest is what a plugin root carries,
 * and a root is established by installation, by a registered marketplace, or by
 * an absolute path in a user setting — never by a file appearing at a
 * repository path — so a manifest below a catalog's local source is one of the
 * files that plugin ships, and a manifest at a repository's own root is a
 * plugin that repository publishes
 * (contracts/vendors/github-copilot.md § Repository Inspector matcher rules).
 */
export const COPILOT_REPO_MARKETPLACE_RULE = {
  ruleId: 'copilot.repo.marketplace',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'plugin',
  sourceKinds: ['repository'],
  /**
   * The `copilot.repo.marketplace` matcher: the four documented locations a
   * marketplace root keeps its catalog at, checked in that order.
   *
   * Anchored at the selected root, because a repository that publishes a catalog
   * *is* the marketplace root its `./` entries resolve against. Which of the four
   * a given root uses is the vendor's own order, and admitting all four claims no
   * registration: `chat.plugins.marketplaces` and the workspace settings'
   * `extraKnownMarketplaces` are what make a session consider a catalog, and both
   * are runtime inputs this product never reads.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [{ kind: 'literal', value: 'marketplace.json' }],
      [
        { kind: 'literal', value: '.plugin' },
        { kind: 'literal', value: 'marketplace.json' },
      ],
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'plugin' },
        { kind: 'literal', value: 'marketplace.json' },
      ],
      [
        { kind: 'literal', value: '.claude-plugin' },
        { kind: 'literal', value: 'marketplace.json' },
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
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations', 'marketplace.json'],
          reviewedOn: '2026-08-27',
          establishes:
            'A marketplace manifest is marketplace.json, .plugin/marketplace.json, .github/plugin/marketplace.json, or .claude-plugin/marketplace.json — the four exact locations this rule admits — checked in that order, and its plugins array carries one entry per plugin with the name and the source that plugin comes from.',
        },
        {
          sourceId: 'vscode.copilot.plugins',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-plugins',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure plugin marketplaces'],
          reviewedOn: '2026-08-25',
          establishes:
            'A marketplace is a Git repository containing plugin definitions, added to a session through the chat.plugins.marketplaces setting, so a catalog a repository carries is authored content and registration is a separate runtime fact.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `copilot.excluded.cli-extensions`: the CLI's experimental project extensions
 * under `.github/extensions/`, which are never plugin candidates.
 *
 * A record rather than silence, because the path sits beside the customization
 * locations this product does admit and a reader can point at it. An extension
 * is executable JavaScript the CLI loads on enablement, not an authored
 * customization document, and reading one would be reading a program rather
 * than a declaration (FR-003, FR-024).
 *
 * `kind` is null: an excluded rule recognizes nothing, and an extension is not
 * a plugin under another name — the two are distinct locations in the vendor's
 * own file table.
 */
export const COPILOT_EXCLUDED_CLI_EXTENSIONS_RULE = {
  ruleId: 'copilot.excluded.cli-extensions',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations', 'Loading order and precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            "The plugin reference's own file table separates a plugin's manifest and components from the CLI's project extensions, and its loading order composes plugin components with project and personal configurations, so an extension file is never one of the manifests a plugin is recognized by.",
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot standalone hook files: the root `.github/hooks/*.json` documents
 * whose whole purpose is hooks, recognized as the `hook` kind whose row unit
 * is one declared lifecycle event.
 *
 * All three surfaces read this location — the editor as a workspace hook
 * source, the CLI as the repository-level one, and the cloud agent as the only
 * hook source its ephemeral clone has — so one rule carries all three
 * provenances.
 *
 * The keys beside the event map are this recognition's to publish, the
 * documented `version` among them: such a file has one recognition, so a key
 * this reading drops is a key no surface shows (FR-007).
 *
 * Admitting a file asserts nothing about execution: folder trust, the
 * `disableAllHooks` switch, a machine-wide policy, and which surface is
 * running at all are runtime state this tool never observes (FR-009), and no
 * declared command is run, opened, or resolved (FR-020).
 */
export const COPILOT_REPO_HOOKS_RULE = {
  ruleId: 'copilot.repo.hooks',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['repository'],
  /**
   * The `.github/hooks/` directory of the Repository root, whose `*.json` direct
   * children are hook files. One dynamic step for the filename, because the
   * documented location is a directory whose JSON files are all loaded rather
   * than a fixed set of names.
   *
   * Root-anchored and direct-child: all three surfaces name the repository or
   * workspace root's own directory, and a `.github/hooks/` in a subdirectory is
   * a location no page documents a read of. A nested file below that directory
   * is a near miss for the same reason — the pages load the directory's `*.json`
   * files, not a subtree.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'hooks' },
        { kind: 'regex', pattern: /\.json$/u },
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
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations', 'Hook configuration format'],
          reviewedOn: '2026-08-27',
          establishes:
            'Repository-level hook files are .github/hooks/*.json in the repository root — the exact location this rule admits — and the cloud agent loads hook configuration from the same files in the cloned repository; such a file is JSON carrying a version and a hooks object.',
        },
        {
          sourceId: 'vscode.copilot.hooks',
          url: 'https://code.visualstudio.com/docs/agent-customization/hooks',
          officialHost: 'code.visualstudio.com',
          sections: ['Hook file locations'],
          reviewedOn: '2026-08-26',
          establishes:
            'The workspace scope of the hook-locations table is .github/hooks/*.json, and the default chat.hookFilesLocations value loads every *.json file of that folder.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `hooks` an accepted Copilot settings document declares: the CLI's own
 * repository pair, whose top-level `hooks` object holds the hook definitions
 * scoped to that repository.
 *
 * Its own rule over the settings pair's authored matcher, never a second
 * spelling of that location: a contained declaration is a recognition of the
 * file that carries it, and a recognition is what a rule produces, so the two
 * rules over these paths are one candidate read once.
 *
 * The CLI alone, because the editor documents no read of this file for hooks:
 * its hook-locations table names `.github/hooks/*.json` and the Claude-format
 * settings documents for the workspace scope and stops there. A rule spanning
 * both settings pairs would report the editor as reading a file no page says
 * it reads — the same reason `copilot.repo.agent.claude` is its own rule.
 *
 * A settings file's hooks belong to no other customization: its own row
 * publishes the document it is, and that document is configuration rather than
 * a customization whose definition the hooks are part of. An agent's
 * frontmatter `hooks` is the other case, and it publishes no hook row: those
 * declarations are part of what that agent is, and the agent's own row already
 * publishes the keys its file wrote.
 */
export const COPILOT_REPO_SETTINGS_HOOKS_RULE = {
  ruleId: 'copilot.repo.hooks.settings',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['repository'],
  /**
   * The two GitHub Copilot settings documents of the Repository root, whose
   * inline `hooks` block the CLI reads. Two programs rather than one dynamic
   * step, so each admission carries which authored filename matched.
   *
   * Its own pair rather than the settings rule's four locations, because the
   * editor's hook-locations table names the Claude-format pair for the workspace
   * scope and not this one: a hook rule over all four would claim a read no page
   * documents.
   *
   * Root-anchored with no recursive step: the pages name these locations as the
   * repository's own, and a settings file in a subdirectory is a path the vendor
   * documents no read of.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot' },
        { kind: 'literal', value: 'settings.json' },
      ],
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'copilot' },
        { kind: 'literal', value: 'settings.local.json' },
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
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'An inline hooks block sits at the top level of .github/copilot/settings.json or .github/copilot/settings.local.json — the exact locations this rule admits — and a malformed item there rejects the whole hooks field.',
        },
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Repository settings (.github/copilot/settings.json)', 'User-editable files'],
          reviewedOn: '2026-08-27',
          establishes:
            "hooks is one of the keys the repository configuration file supports, holding the hook definitions scoped to that repository; the page's JSON-with-comments statement is written of the configuration directory's own settings.json rather than of this repository pair, whose sections fix its keys and not its syntax.",
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `hooks` an accepted Claude-format settings document declares, which both
 * the CLI and the editor read: the cross-tool pair at the Repository root.
 *
 * Its own rule beside `copilot.repo.hooks.settings` because a rule's surfaces
 * are the behaviors it rests on, and these two files are the only settings
 * documents the editor's hook-locations table names. The same physical files
 * carry Claude Code's own hook recognition, and each product's declaration is
 * its own row of the event it declares (FR-007): one file, one read, one
 * recognition per product.
 */
export const COPILOT_REPO_CLAUDE_SETTINGS_HOOKS_RULE = {
  ruleId: 'copilot.repo.hooks.settings.claude',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['repository'],
  /**
   * The two cross-tool Claude-format settings documents of the Repository root,
   * whose hooks both the CLI and the editor read — the same physical files
   * Claude Code admits under its own rules.
   *
   * Its own pair for the reason the pair above is one: which surfaces document
   * reading a location is what a rule's provenance rests on, and these two are
   * the only settings documents the editor's hook-locations table names.
   *
   * Root-anchored for the same reason as the pair above: the pages name the
   * repository's own `.claude/` files.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'settings.json' },
      ],
      [
        { kind: 'literal', value: '.claude' },
        { kind: 'literal', value: 'settings.local.json' },
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
          sourceId: 'vscode.copilot.hooks',
          url: 'https://code.visualstudio.com/docs/agent-customization/hooks',
          officialHost: 'code.visualstudio.com',
          sections: [
            'Hook file locations',
            'How does VS Code handle Claude Code hook configurations?',
          ],
          reviewedOn: '2026-08-26',
          establishes:
            'The workspace scope of the hook-locations table names .claude/settings.json and .claude/settings.local.json in the Claude format — the exact locations this rule admits — and VS Code parses the Claude Code hook configuration format found there.',
        },
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLI also reads the cross-tool .claude/settings.json and .claude/settings.local.json files of the repository for their inline hooks block.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Copilot Global personal instructions: the read-authorizing counterpart of
 * `copilot.behavior.cli.user.instructions.root` (FR-015). An exact target, so
 * the plan reads the one named file and never enumerates the home.
 */
export const COPILOT_GLOBAL_INSTRUCTIONS_ROOT_RULE = {
  ruleId: 'copilot.global.instructions.root',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['global'],
  /**
   * The exact `copilot-instructions.md` at the consented boundary root: the
   * personal always-on instruction file (FR-015).
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [[{ kind: 'literal', value: 'copilot-instructions.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-27',
          establishes:
            'The CLI reads personal instructions from ~/.copilot/copilot-instructions.md, applied to every session regardless of project, which is the exact file this rule admits at the consented boundary root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot Global path instructions: the read-authorizing counterpart of
 * `copilot.behavior.cli.user.instructions.path`, and of the `~/.copilot`
 * subset of `copilot.behavior.vscode.user.instructions` (FR-015).
 */
export const COPILOT_GLOBAL_INSTRUCTIONS_PATH_RULE = {
  ruleId: 'copilot.global.instructions.path',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['global'],
  /**
   * Every `*.instructions.md` at any depth below the boundary's `instructions/`
   * directory (FR-015): a fixed subtree, so the plan enumerates that subtree and
   * nothing beside it.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [
      [
        { kind: 'literal', value: 'instructions' },
        ANY_DIRECTORIES,
        { kind: 'regex', pattern: /\.instructions\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-27',
          establishes:
            'Personal instructions also load from ~/.copilot/instructions/**/*.instructions.md, the recursive personal instruction directory this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot personal skills below `COPILOT_HOME`: the read-authorizing
 * counterpart of the `~/.copilot/skills` half of
 * `copilot.behavior.cli.user.skills` (FR-015). The `~/.agents/skills` half is
 * the shared agent home's own rule below.
 */
export const COPILOT_GLOBAL_SKILL_RULE = {
  ruleId: 'copilot.global.skill',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
  /**
   * `skills/<name>/SKILL.md` directly below the consented boundary (FR-015):
   * `ANY_NAME` is the one direct skill-name child and the terminal literal keeps
   * the admitted file exact.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [
      [{ kind: 'literal', value: 'skills' }, ANY_NAME, { kind: 'literal', value: 'SKILL.md' }],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
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
            'Personal skill definitions live in ~/.copilot/skills, each skill a subdirectory containing a SKILL.md, available in all sessions — the exact layout this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot personal skills below the shared agent home: the read-authorizing
 * counterpart of the `~/.agents/skills` half of
 * `copilot.behavior.cli.user.skills` (FR-045). Codex documents the same
 * location, so one admitted file there carries both vendors' recognitions —
 * exactly as one Repository `.agents/skills` file does.
 */
export const COPILOT_AGENTS_HOME_SKILL_RULE = {
  ruleId: 'copilot.global.agents-home.skill',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
  /**
   * `skills/<name>/SKILL.md` directly below the consented shared agent home
   * (FR-045): the same program as the boundary's own skill rule, based at the
   * shared boundary Codex also reads.
   */
  matcher: {
    base: { kind: 'global', member: 'agents' },
    selectors: [
      [{ kind: 'literal', value: 'skills' }, ANY_NAME, { kind: 'literal', value: 'SKILL.md' }],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-018', 'FR-045', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
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
            'The documented skill locations include the personal ~/.agents/skills/ directory — agent skills shared across all projects — which is the exact location this rule admits below the consented shared agent home.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot personal custom agents: the read-authorizing counterpart of
 * `copilot.behavior.cli.user.agents`, and of the `~/.copilot/agents` half of
 * `copilot.behavior.vscode.user.agents` (FR-015).
 */
export const COPILOT_GLOBAL_AGENT_RULE = {
  ruleId: 'copilot.global.agent',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['global'],
  /**
   * `agents/*.agent.md` directly below the consented boundary (FR-015): the
   * documented `.agent.md` filename, direct children only — the pages document
   * no nested search for the personal directory.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [
      [
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.agent\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.custom-agents',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli',
          officialHost: 'docs.github.com',
          sections: ['Creating a custom agent'],
          reviewedOn: '2026-08-27',
          establishes:
            'Each custom agent is a Markdown file with an .agent.md extension, and the user location is ~/.copilot/agents/ — the exact filename pattern and directory this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * Copilot user-level standalone hook files: the read-authorizing counterpart
 * of the `hooks/*.json` half of `copilot.behavior.cli.user.hooks`, and of the
 * `~/.copilot/hooks` half of `copilot.behavior.vscode.user.hooks` (FR-015).
 */
export const COPILOT_GLOBAL_HOOKS_RULE = {
  ruleId: 'copilot.global.hooks',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['global'],
  /**
   * `hooks/*.json` directly below the consented boundary (FR-015): the
   * documented user-level hook files.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [
      [
        { kind: 'literal', value: 'hooks' },
        { kind: 'regex', pattern: /\.json$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'User-level hook files are *.json files in the user-level hooks directory — ~/.copilot/hooks/ by default, $COPILOT_HOME/hooks/ when COPILOT_HOME is set — the exact directory and filename pattern this rule admits.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * The Copilot user settings document: the read-authorizing counterpart of
 * `copilot.behavior.cli.user.settings` (FR-015). The user layer of the
 * documented settings cascade, authored as JSONC, and served complete under
 * its own `settings/config` row exactly as the Repository settings documents
 * are.
 */
export const COPILOT_GLOBAL_SETTINGS_RULE = {
  ruleId: 'copilot.global.settings',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['global'],
  /**
   * The one exact user `settings.json` at the consented boundary root
   * (FR-015), shared with the inline-hooks rule: two rules over one
   * candidate, read once.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [[{ kind: 'literal', value: 'settings.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
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
            'settings.json in the user-level configuration directory is the primary CLI configuration file, edited directly or through /settings, supports JSONC, and holds global user-level defaults — the exact file this rule admits at the consented boundary root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The inline `hooks` field of the user settings document: a `hook` recognition
 * of the same one candidate `copilot.global.settings` admits (FR-015), exactly
 * as the Repository settings documents' inline hooks are.
 */
export const COPILOT_GLOBAL_SETTINGS_HOOKS_RULE = {
  ruleId: 'copilot.global.hooks.inline',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['global'],
  /**
   * The one exact user `settings.json` at the consented boundary root
   * (FR-015), shared with the settings rule: two rules over one candidate,
   * read once.
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [[{ kind: 'literal', value: 'settings.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations'],
          reviewedOn: '2026-08-27',
          establishes:
            'Hooks can also be defined inline in the user configuration file ~/.copilot/settings.json under the hooks key, which is the contained declaration this rule recognizes on the settings candidate.',
        },
      ]
    : [],
} as const satisfies InspectionRule;
/**
 * The Copilot user-level MCP carrier: the read-authorizing counterpart of
 * `copilot.behavior.cli.user.mcp` (FR-015). One row per declared server name,
 * exactly as the Repository carriers publish.
 */
export const COPILOT_GLOBAL_MCP_RULE = {
  ruleId: 'copilot.global.mcp',
  tool: 'copilot',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['global'],
  /**
   * The one exact user MCP carrier `mcp-config.json` at the consented boundary
   * root (FR-015).
   */
  matcher: {
    base: { kind: 'global', member: 'copilot' },
    selectors: [[{ kind: 'literal', value: 'mcp-config.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
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
            'mcp-config.json in the user-level configuration directory defines MCP servers available at the user level in all sessions, which is the exact carrier this rule admits at the consented boundary root.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The Copilot user surfaces no Global rule admits, on record as excluded
 * (contracts/vendors/github-copilot.md § Inspector Global rule): another
 * tool's home and the VS Code profile files (`~/.claude/*`, profile prompts,
 * profile MCP and settings), configured extra locations, installed plugins and
 * plugin data, the user LSP configuration, user extensions, and the
 * automatically managed state beside the admitted files. It authorizes
 * nothing and exists so the consent flow can state what it leaves out.
 *
 * `kind` is null because an exclusion spans kinds, and `matcher` is null
 * because a rule that admits nothing needs no selector.
 */
export const COPILOT_EXCLUDED_USER_RUNTIME_RULE = {
  ruleId: 'copilot.excluded.user-runtime',
  tool: 'copilot',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['global'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-013', 'FR-014', 'FR-015', 'FR-018', 'QR-001', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Automatically managed files'],
          reviewedOn: '2026-08-27',
          establishes:
            'The vendor itself separates the user-editable files from the automatically managed ones — application state, saved permissions, session and command-history state, the session store, logs, installed plugins, plugin data, IDE state, and MCP OAuth and secret storage — which is the line this exclusion holds.',
        },
        {
          sourceId: 'github.copilot.cli.lsp',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers',
          officialHost: 'docs.github.com',
          sections: ['How LSP servers are loaded'],
          reviewedOn: '2026-08-23',
          establishes:
            'The user-level ~/.copilot/lsp-config.json defines LSP servers, a documented surface the closed kind set does not publish, so it stays excluded.',
        },
        {
          sourceId: 'github.copilot.cli.extensions',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-extensions',
          officialHost: 'docs.github.com',
          sections: ['Choosing where an extension lives'],
          reviewedOn: '2026-07-15',
          establishes:
            'User extensions under ~/.copilot/extensions/ are an experimental executable surface outside the initial allowlist, so they stay excluded.',
        },
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a CLAUDE.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code also reads Claude-compatible user paths such as ~/.claude/CLAUDE.md; a cross-home or profile read stays a recorded behavior with no Inspector recognition, and those paths stay excluded here.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Copilot's contribution to the inspection-rule registry, keyed by `ruleId`. */
export const COPILOT_INSPECTION_RULES: Readonly<Record<CopilotRuleId, InspectionRule>> = {
  [COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE.ruleId]:
    COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE,
  [COPILOT_EXCLUDED_CLI_EXTENSIONS_RULE.ruleId]: COPILOT_EXCLUDED_CLI_EXTENSIONS_RULE,
  [COPILOT_EXCLUDED_CLI_LSP_RULE.ruleId]: COPILOT_EXCLUDED_CLI_LSP_RULE,
  [COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE.ruleId]: COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE,
  [COPILOT_EXCLUDED_USER_RUNTIME_RULE.ruleId]: COPILOT_EXCLUDED_USER_RUNTIME_RULE,
  [COPILOT_EXCLUDED_VSCODE_SETTINGS_RULE.ruleId]: COPILOT_EXCLUDED_VSCODE_SETTINGS_RULE,
  [COPILOT_GLOBAL_AGENT_RULE.ruleId]: COPILOT_GLOBAL_AGENT_RULE,
  [COPILOT_AGENTS_HOME_SKILL_RULE.ruleId]: COPILOT_AGENTS_HOME_SKILL_RULE,
  [COPILOT_GLOBAL_HOOKS_RULE.ruleId]: COPILOT_GLOBAL_HOOKS_RULE,
  [COPILOT_GLOBAL_SETTINGS_HOOKS_RULE.ruleId]: COPILOT_GLOBAL_SETTINGS_HOOKS_RULE,
  [COPILOT_GLOBAL_INSTRUCTIONS_PATH_RULE.ruleId]: COPILOT_GLOBAL_INSTRUCTIONS_PATH_RULE,
  [COPILOT_GLOBAL_INSTRUCTIONS_ROOT_RULE.ruleId]: COPILOT_GLOBAL_INSTRUCTIONS_ROOT_RULE,
  [COPILOT_GLOBAL_MCP_RULE.ruleId]: COPILOT_GLOBAL_MCP_RULE,
  [COPILOT_GLOBAL_SETTINGS_RULE.ruleId]: COPILOT_GLOBAL_SETTINGS_RULE,
  [COPILOT_GLOBAL_SKILL_RULE.ruleId]: COPILOT_GLOBAL_SKILL_RULE,
  [COPILOT_REPO_AGENT_RULE.ruleId]: COPILOT_REPO_AGENT_RULE,
  [COPILOT_REPO_AGENT_CLAUDE_RULE.ruleId]: COPILOT_REPO_AGENT_CLAUDE_RULE,
  [COPILOT_REPO_COMMAND_RULE.ruleId]: COPILOT_REPO_COMMAND_RULE,
  [COPILOT_REPO_HOOKS_RULE.ruleId]: COPILOT_REPO_HOOKS_RULE,
  [COPILOT_REPO_SETTINGS_HOOKS_RULE.ruleId]: COPILOT_REPO_SETTINGS_HOOKS_RULE,
  [COPILOT_REPO_CLAUDE_SETTINGS_HOOKS_RULE.ruleId]: COPILOT_REPO_CLAUDE_SETTINGS_HOOKS_RULE,
  [COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE,
  [COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_PATH_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_PATH_RULE,
  [COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE.ruleId]:
    COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE,
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE.ruleId]: COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE,
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE.ruleId]:
    COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE,
  [COPILOT_REPO_MARKETPLACE_RULE.ruleId]: COPILOT_REPO_MARKETPLACE_RULE,
  [COPILOT_REPO_MCP_RULE.ruleId]: COPILOT_REPO_MCP_RULE,
  [COPILOT_REPO_MCP_VSCODE_RULE.ruleId]: COPILOT_REPO_MCP_VSCODE_RULE,
  [COPILOT_REPO_MCP_VSCODE_ROOT_RULE.ruleId]: COPILOT_REPO_MCP_VSCODE_ROOT_RULE,
  [COPILOT_REPO_PROMPT_RULE.ruleId]: COPILOT_REPO_PROMPT_RULE,
  [COPILOT_REPO_SETTINGS_RULE.ruleId]: COPILOT_REPO_SETTINGS_RULE,
  [COPILOT_REPO_SKILL_RULE.ruleId]: COPILOT_REPO_SKILL_RULE,
};
