// Gemini CLI inspection rules — the implementation counterpart of
// contracts/vendors/gemini-cli.md § Inspector Repository rules, § Derived
// Repository rules, § Inspector Global rule, and § Relationship-only and
// excluded groups.
//
// A rule is the only thing that can authorize a read
// (contracts/inspection-path-allowlist.md § "Read authorization and
// applicability"), and every static rule below spells its matcher inline — base
// and selectors both — so which location it reaches is the first thing a
// reader meets on the record (AGENTS.md § Implementation simplicity policy).
//
// Two shapes are Gemini CLI's own. The context file has no static rule: which
// filename it bears is the settings carrier's decision, so
// `gemini.derived.context-filename` — a derived rule that owns the default —
// yields the one plan, `GEMINI.md` or the configured names, and no second
// mechanism withdraws a static plan when names are configured
// (specs/002-gemini-cli-support/research.md § 2). And the settings carrier is
// one candidate recognized three times — settings, MCP, hooks — the
// arrangement `.claude/settings.json` and `.codex/config.toml` already have.
//
// Each record is declared with `satisfies` so the keyed map's computed keys
// keep resolving (see `codex/rules.ts`).
import { ANY_DIRECTORIES, ANY_NAME } from '../../../server/inspection/rules/registry';
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { GeminiRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * The FR/QR clauses every read-authorizing Repository rule of this vendor
 * rests on: the parent specification's allowlist discipline, the tool set,
 * the file/recognition separation, symlink transparency, and the three
 * quality requirements the contract tables name.
 */
const REPOSITORY_POLICY_REFS = [
  'FR-003',
  'FR-004',
  'FR-005',
  'FR-024',
  'QR-001',
  'QR-004',
  'QR-005',
];

/**
 * The FR/QR clauses every read-authorizing rule below the consented Gemini
 * CLI boundary rests on (parent FR-013, FR-014, FR-018, QR-005).
 */
const GLOBAL_POLICY_REFS = ['FR-013', 'FR-014', 'FR-018', 'QR-005'];

/**
 * The context filenames — `GEMINI.md`, or each name the repository
 * `.gemini/settings.json` declares under `context.fileName` — admitted at the
 * root and at every depth below it, the documented just-in-time reach. The
 * seed is that settings carrier, read as configuration before the walk by
 * `readGeminiConfiguredContextPlans`
 * (`src/server/inspection/rules/instructions/gemini.ts`), which yields the
 * default plan when the carrier is absent, unreadable, unparsable, or declares
 * an unusable value, and the configured names' plans otherwise. The
 * configured names stand in for the default rather than beside it: the
 * setting names the file or files to load.
 *
 * `matcher: null` because the plan is built per scan from the seed: the
 * filenames are not known until the carrier is read. `partially-documented`
 * because the vendor documents reading the file from any accessed directory
 * without stating whether one no tool has touched is read; the derivation
 * itself — configured names in place of the default — is documented.
 */
export const GEMINI_DERIVED_CONTEXT_FILENAME_RULE = {
  ruleId: 'gemini.derived.context-filename',
  tool: 'gemini',
  discoveryClass: 'bounded-derived-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.gemini-md',
          url: 'https://geminicli.com/docs/cli/gemini-md/',
          officialHost: 'geminicli.com',
          sections: ['Understand the context hierarchy', 'Customize the context file name'],
          reviewedOn: '2026-09-09',
          establishes:
            'GEMINI.md is the default context filename, found in the workspace directories and their parents and just-in-time in any directory a tool accesses; context.fileName in settings.json names the file or files to load instead, as one name or a list.',
        },
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Available settings in settings.json'],
          reviewedOn: '2026-09-09',
          establishes:
            'context.fileName accepts either a single string or an array of strings naming the context file or files to load into memory.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The project settings document at the root's `.gemini/settings.json`: the
 * `settings/config` recognition of the one carrier three rules admit. The
 * matcher is the carrier's own, shared verbatim with `gemini.repo.mcp` and
 * `gemini.repo.hooks`, so the walk merges the three into one candidate read
 * once, each answering for the row that reaches it (FR-007). The same read
 * seeds the context-filename derivation.
 */
export const GEMINI_REPO_SETTINGS_RULE = {
  ruleId: 'gemini.repo.settings',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
        { kind: 'literal', value: 'settings.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Settings files'],
          reviewedOn: '2026-09-09',
          establishes:
            'The project settings file is .gemini/settings.json within the project root, which is the exact location this rule admits.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The same carrier's `mcpServers` map: the `MCP` recognition of
 * `.gemini/settings.json`, published one row per declared server name
 * (data-model.md § Inventory unit). Over the selector `gemini.repo.settings`
 * authors, never a second spelling of that location. Admitting the carrier
 * asserts nothing about connection: a project server connects only in a
 * trusted folder, and inspection never connects (FR-021).
 */
export const GEMINI_REPO_MCP_RULE = {
  ruleId: 'gemini.repo.mcp',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
        { kind: 'literal', value: 'settings.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.mcp-server',
          url: 'https://geminicli.com/docs/tools/mcp-server/',
          officialHost: 'geminicli.com',
          sections: ['Configure the MCP server in settings.json', 'Configuration structure'],
          reviewedOn: '2026-09-09',
          establishes:
            'MCP servers are declared in the mcpServers object of settings.json, and the project scope of that file is .gemini/settings.json — the carrier this rule reads the declarations from.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The same carrier's `hooks` object: the `hook` recognition of
 * `.gemini/settings.json`, admitted by the matcher whatever the object
 * declares — exactly as `.claude/settings.json`'s hook recognition is — so a
 * settings file with no hooks still reaches the hook inventory as a carrier
 * declaring none. Admitting the carrier runs nothing (FR-020).
 */
export const GEMINI_REPO_HOOKS_RULE = {
  ruleId: 'gemini.repo.hooks',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
        { kind: 'literal', value: 'settings.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.hooks',
          url: 'https://geminicli.com/docs/hooks/',
          officialHost: 'geminicli.com',
          sections: ['Configuration'],
          reviewedOn: '2026-09-09',
          establishes:
            'Hooks are configured in the hooks object of settings.json, whose project layer is .gemini/settings.json in the current directory.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Repository custom commands: every `.toml` file at any depth below the
 * root's `.gemini/commands/`. `ANY_DIRECTORIES` because the page names
 * subdirectories as namespaces, so a file sits at any depth and its row is
 * named by the `:`-joined path below the commands directory
 * (`src/server/inspection/rules/prompts-and-commands/gemini.ts`).
 */
export const GEMINI_REPO_COMMAND_RULE = {
  ruleId: 'gemini.repo.command',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'prompt/command',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
        { kind: 'literal', value: 'commands' },
        ANY_DIRECTORIES,
        { kind: 'regex', pattern: /\.toml$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.custom-commands',
          url: 'https://geminicli.com/docs/cli/custom-commands/',
          officialHost: 'geminicli.com',
          sections: ['File locations and precedence', 'Naming and namespacing'],
          reviewedOn: '2026-09-09',
          establishes:
            'Project commands are .toml files in <project root>/.gemini/commands/, with subdirectories forming namespaces joined by a colon — the recursion this rule admits with its one trailing recursive step.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Repository skills: `SKILL.md` one directory below `.gemini/skills/` and one
 * directory below the documented `.agents/skills/` alias, both anchored at
 * the root. Two programs because the vendor names two locations; the second
 * is the same location Codex and Copilot admit, so an admitted file there
 * carries three tools' recognitions.
 */
export const GEMINI_REPO_SKILL_RULE = {
  ruleId: 'gemini.repo.skill',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
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
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.skills',
          url: 'https://geminicli.com/docs/cli/skills/',
          officialHost: 'geminicli.com',
          sections: ['Discovery tiers'],
          reviewedOn: '2026-09-09',
          establishes:
            'Workspace skills are located in .gemini/skills/ or the .agents/skills/ alias, the two locations this rule admits a SKILL.md one directory below.',
        },
        {
          sourceId: 'google.gemini-cli.creating-skills',
          url: 'https://geminicli.com/docs/cli/creating-skills/',
          officialHost: 'geminicli.com',
          sections: ['Skill structure', 'Discovery aliases'],
          reviewedOn: '2026-09-09',
          establishes:
            'A skill is a directory holding a required SKILL.md beside optional scripts, references, and assets, and .agents/skills is an alias of .gemini/skills.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Repository sub-agents: direct children of the root's `.gemini/agents/`
 * named `*.md`. Direct children only — the page names `.gemini/agents/*.md`
 * and documents no nested search. `experimental` because the feature is
 * toggled by an experimental setting.
 */
export const GEMINI_REPO_AGENT_RULE = {
  ruleId: 'gemini.repo.agent',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.gemini' },
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.subagents',
          url: 'https://geminicli.com/docs/core/subagents/',
          officialHost: 'geminicli.com',
          sections: ['Agent definition files', 'Disabling subagents'],
          reviewedOn: '2026-09-09',
          establishes:
            'Project-level custom agents are Markdown files at .gemini/agents/*.md, the exact shape this rule admits, under an experimental setting that is on by default.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The repository surfaces no rule admits, on record as excluded
 * (contracts/vendors/gemini-cli.md § Relationship-only and excluded groups):
 * `.gemini/policies/*.toml`, a tier the vendor documents as not loaded;
 * `.geminiignore`, an ignore file that is not a customization and is not read
 * to decide what is listed; `.env` and `.gemini/.env`, credentials; and
 * scripts under `.gemini/hooks/`, targets a hook declaration names rather
 * than declarations. `kind` and `matcher` are null because an exclusion
 * spans kinds and admits nothing.
 */
export const GEMINI_EXCLUDED_REPO_NON_CUSTOMIZATIONS_RULE = {
  ruleId: 'gemini.excluded.repo-non-customizations',
  tool: 'gemini',
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
          sourceId: 'google.gemini-cli.policy-engine',
          url: 'https://geminicli.com/docs/reference/policy-engine/',
          officialHost: 'geminicli.com',
          sections: ['Policy locations'],
          reviewedOn: '2026-09-09',
          establishes:
            'The workspace policy tier at .gemini/policies is currently non-functional and its files have no effect, so listing them as read would name a reader of a file the product does not read.',
        },
        {
          sourceId: 'google.gemini-cli.gemini-ignore',
          url: 'https://geminicli.com/docs/cli/gemini-ignore/',
          officialHost: 'geminicli.com',
          sections: ['How it works'],
          reviewedOn: '2026-09-09',
          establishes:
            'A .geminiignore file tells the tools that respect it which paths to exclude; it is an exclusion list, not a customization the model reads.',
        },
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Environment variables and .env files'],
          reviewedOn: '2026-09-09',
          establishes:
            '.env files hold environment variables the CLI loads into its process — credentials rather than a customization — so this rule declines them.',
        },
        {
          sourceId: 'google.gemini-cli.hooks',
          url: 'https://geminicli.com/docs/hooks/',
          officialHost: 'geminicli.com',
          sections: ['Configuration'],
          reviewedOn: '2026-09-09',
          establishes:
            'A hook is declared in settings.json and its command names a script such as one under .gemini/hooks/; the script is the declaration’s target, not a declaration, so this rule declines it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The extension surfaces, on record as excluded: installed copies under the
 * user tier's `extensions/`, and a repository-root `gemini-extension.json`
 * with the component directories beside it. An installed copy is reproduced
 * from its source rather than authored — the reason the parent's FR-018
 * excludes every vendor's installed plugin copies — and the vendor reads a
 * repository-root manifest only through such a copy, linked into that
 * directory (specs/002-gemini-cli-support/spec.md FR-016, § Clarifications).
 */
export const GEMINI_EXCLUDED_EXTENSIONS_RULE = {
  ruleId: 'gemini.excluded.extensions',
  tool: 'gemini',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['global'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-013', 'FR-014', 'FR-018', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.extensions-reference',
          url: 'https://geminicli.com/docs/extensions/reference/',
          officialHost: 'geminicli.com',
          sections: ['Extension format', 'Link a local extension'],
          reviewedOn: '2026-09-09',
          establishes:
            'Extensions are loaded from <home>/.gemini/extensions, each a directory of gemini-extension.json and bundled components, and a local development directory reaches the CLI only through the symbolic link gemini extensions link creates there — so the installed copy is the only thing the vendor reads, and it is a copy this rule declines.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The Gemini CLI user surfaces no Global rule admits, on record as excluded:
 * the trusted-folder record, environment files, OAuth and account
 * credentials, session and history state, temporary files — and the system
 * settings, defaults, and admin policies under administrator-owned
 * directories no Source reaches. What it names, it names through the
 * behaviors it is based on (`gemini/relations.ts`); the admitted surfaces are
 * deliberately absent, because an exclusion naming what a Global rule accepts
 * would contradict the rule beside it.
 */
export const GEMINI_EXCLUDED_USER_RUNTIME_RULE = {
  ruleId: 'gemini.excluded.user-runtime',
  tool: 'gemini',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['global'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-013', 'FR-014', 'FR-018', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.trusted-folders',
          url: 'https://geminicli.com/docs/cli/trusted-folders/',
          officialHost: 'geminicli.com',
          sections: ['Overriding the trust file location'],
          reviewedOn: '2026-09-09',
          establishes:
            'trustedFolders.json in the user directory records trust decisions — runtime state the CLI writes, not a customization the reader authored — so this rule declines it.',
        },
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Configuration layers', 'Environment variables and .env files'],
          reviewedOn: '2026-09-09',
          establishes:
            'The user .env file holds environment variables, and the system defaults and system settings files live in administrator-owned directories outside the home; neither is a customization below a consented root, so this rule declines both.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The global context file: `GEMINI.md` directly below the consented Gemini
 * CLI boundary. The default name alone — whether the user tier's own
 * `context.fileName` renames it is not established, so no derivation runs
 * here (specs/002-gemini-cli-support/spec.md § Clarifications).
 */
export const GEMINI_GLOBAL_INSTRUCTIONS_RULE = {
  ruleId: 'gemini.global.instructions',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [[{ kind: 'literal', value: 'GEMINI.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.gemini-md',
          url: 'https://geminicli.com/docs/cli/gemini-md/',
          officialHost: 'geminicli.com',
          sections: ['Understand the context hierarchy'],
          reviewedOn: '2026-09-09',
          establishes:
            'The global context file is ~/.gemini/GEMINI.md, the exact location this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The user settings document at the consented boundary's `settings.json`:
 * the `settings/config` recognition of the one carrier three Global rules
 * admit, exactly as the Repository trio does.
 */
export const GEMINI_GLOBAL_SETTINGS_RULE = {
  ruleId: 'gemini.global.settings',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [[{ kind: 'literal', value: 'settings.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.configuration',
          url: 'https://geminicli.com/docs/reference/configuration/',
          officialHost: 'geminicli.com',
          sections: ['Settings files'],
          reviewedOn: '2026-09-09',
          establishes:
            'The user settings file is ~/.gemini/settings.json, the exact location this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** The same user carrier's `mcpServers` map: its `MCP` recognition, one row per server name. */
export const GEMINI_GLOBAL_MCP_RULE = {
  ruleId: 'gemini.global.mcp',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [[{ kind: 'literal', value: 'settings.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.mcp-server',
          url: 'https://geminicli.com/docs/tools/mcp-server/',
          officialHost: 'geminicli.com',
          sections: ['Configure the MCP server in settings.json'],
          reviewedOn: '2026-09-09',
          establishes:
            'The mcpServers object may be declared in the user config ~/.gemini/settings.json, the carrier this rule reads the declarations from.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** The same user carrier's `hooks` object: its `hook` recognition, admitted whatever the object declares. */
export const GEMINI_GLOBAL_HOOKS_RULE = {
  ruleId: 'gemini.global.hooks',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [[{ kind: 'literal', value: 'settings.json' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.hooks',
          url: 'https://geminicli.com/docs/hooks/',
          officialHost: 'geminicli.com',
          sections: ['Configuration'],
          reviewedOn: '2026-09-09',
          establishes:
            'The user settings at ~/.gemini/settings.json are one of the layers hooks are configured in.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Personal custom commands: every `.toml` at any depth below the consented
 * boundary's `commands/`, named by the `:`-joined path as the Repository rule
 * is. A same-name project command displaces one at runtime, which is the
 * selection strategy's statement rather than this rule's.
 */
export const GEMINI_GLOBAL_COMMAND_RULE = {
  ruleId: 'gemini.global.command',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'prompt/command',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [
      [
        { kind: 'literal', value: 'commands' },
        ANY_DIRECTORIES,
        { kind: 'regex', pattern: /\.toml$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.custom-commands',
          url: 'https://geminicli.com/docs/cli/custom-commands/',
          officialHost: 'geminicli.com',
          sections: ['File locations and precedence', 'Naming and namespacing'],
          reviewedOn: '2026-09-09',
          establishes:
            'User commands are .toml files in ~/.gemini/commands/, namespaced by subdirectory — the recursion this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Personal skills in the user tier's own directory: `skills/<name>/SKILL.md`
 * below the consented Gemini CLI boundary. The documented alias lives in the
 * shared agent home and is `gemini.global.agents-home.skill`'s.
 */
export const GEMINI_GLOBAL_SKILL_RULE = {
  ruleId: 'gemini.global.skill',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [
      [{ kind: 'literal', value: 'skills' }, ANY_NAME, { kind: 'literal', value: 'SKILL.md' }],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.skills',
          url: 'https://geminicli.com/docs/cli/skills/',
          officialHost: 'geminicli.com',
          sections: ['Discovery tiers'],
          reviewedOn: '2026-09-09',
          establishes:
            'User skills are located in ~/.gemini/skills/, the directory this rule admits a SKILL.md one level below.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Personal sub-agents: direct children of the consented boundary's `agents/` named `*.md`, under the experimental gate. */
export const GEMINI_GLOBAL_AGENT_RULE = {
  ruleId: 'gemini.global.agent',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [
      [
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.subagents',
          url: 'https://geminicli.com/docs/core/subagents/',
          officialHost: 'geminicli.com',
          sections: ['Agent definition files'],
          reviewedOn: '2026-09-09',
          establishes:
            'User-level custom agents are Markdown files at ~/.gemini/agents/*.md, the exact shape this rule admits below the consented boundary.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Personal policies: direct children of the consented boundary's `policies/`
 * named `*.toml`, recognized as `permissions` because a policy decides which
 * tool calls are allowed, denied, or confirmed — the subject Codex's
 * `rules/*.rules` files share. The user tier is documented as loaded, unlike
 * the workspace tier the Repository exclusion declines.
 */
export const GEMINI_GLOBAL_POLICIES_RULE = {
  ruleId: 'gemini.global.policies',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'permissions',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'gemini' },
    selectors: [
      [
        { kind: 'literal', value: 'policies' },
        { kind: 'regex', pattern: /\.toml$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.gemini-cli.policy-engine',
          url: 'https://geminicli.com/docs/reference/policy-engine/',
          officialHost: 'geminicli.com',
          sections: ['Policy locations', 'TOML rule schema'],
          reviewedOn: '2026-09-09',
          establishes:
            'User policies are the custom ~/.gemini/policies/*.toml files, each holding [[rule]] entries that decide whether a tool call is allowed, denied, or confirmed — the exact shape this rule admits as a permissions document.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Personal skills below the consented shared agent home: the documented
 * `~/.agents/skills/` alias of the user skill directory (parent FR-045).
 * Codex and Copilot document the same path, so an admitted file here carries
 * three tools' recognitions once each vendor's rule is in the member's
 * catalog — exactly as one Repository `.agents/skills` file does.
 */
export const GEMINI_AGENTS_HOME_SKILL_RULE = {
  ruleId: 'gemini.global.agents-home.skill',
  tool: 'gemini',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
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
          sourceId: 'google.gemini-cli.skills',
          url: 'https://geminicli.com/docs/cli/skills/',
          officialHost: 'geminicli.com',
          sections: ['Discovery tiers', 'Precedence and aliases'],
          reviewedOn: '2026-09-09',
          establishes:
            'User skills may live in the ~/.agents/skills/ alias, the interoperable path shared with other tools — the exact location this rule admits below the consented shared agent home.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Gemini CLI's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const GEMINI_INSPECTION_RULES: Readonly<Record<GeminiRuleId, InspectionRule>> = {
  [GEMINI_DERIVED_CONTEXT_FILENAME_RULE.ruleId]: GEMINI_DERIVED_CONTEXT_FILENAME_RULE,
  [GEMINI_EXCLUDED_EXTENSIONS_RULE.ruleId]: GEMINI_EXCLUDED_EXTENSIONS_RULE,
  [GEMINI_EXCLUDED_REPO_NON_CUSTOMIZATIONS_RULE.ruleId]:
    GEMINI_EXCLUDED_REPO_NON_CUSTOMIZATIONS_RULE,
  [GEMINI_EXCLUDED_USER_RUNTIME_RULE.ruleId]: GEMINI_EXCLUDED_USER_RUNTIME_RULE,
  [GEMINI_GLOBAL_AGENT_RULE.ruleId]: GEMINI_GLOBAL_AGENT_RULE,
  [GEMINI_AGENTS_HOME_SKILL_RULE.ruleId]: GEMINI_AGENTS_HOME_SKILL_RULE,
  [GEMINI_GLOBAL_COMMAND_RULE.ruleId]: GEMINI_GLOBAL_COMMAND_RULE,
  [GEMINI_GLOBAL_HOOKS_RULE.ruleId]: GEMINI_GLOBAL_HOOKS_RULE,
  [GEMINI_GLOBAL_INSTRUCTIONS_RULE.ruleId]: GEMINI_GLOBAL_INSTRUCTIONS_RULE,
  [GEMINI_GLOBAL_MCP_RULE.ruleId]: GEMINI_GLOBAL_MCP_RULE,
  [GEMINI_GLOBAL_POLICIES_RULE.ruleId]: GEMINI_GLOBAL_POLICIES_RULE,
  [GEMINI_GLOBAL_SETTINGS_RULE.ruleId]: GEMINI_GLOBAL_SETTINGS_RULE,
  [GEMINI_GLOBAL_SKILL_RULE.ruleId]: GEMINI_GLOBAL_SKILL_RULE,
  [GEMINI_REPO_AGENT_RULE.ruleId]: GEMINI_REPO_AGENT_RULE,
  [GEMINI_REPO_COMMAND_RULE.ruleId]: GEMINI_REPO_COMMAND_RULE,
  [GEMINI_REPO_HOOKS_RULE.ruleId]: GEMINI_REPO_HOOKS_RULE,
  [GEMINI_REPO_MCP_RULE.ruleId]: GEMINI_REPO_MCP_RULE,
  [GEMINI_REPO_SETTINGS_RULE.ruleId]: GEMINI_REPO_SETTINGS_RULE,
  [GEMINI_REPO_SKILL_RULE.ruleId]: GEMINI_REPO_SKILL_RULE,
};
