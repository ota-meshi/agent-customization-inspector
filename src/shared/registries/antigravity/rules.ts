// Antigravity CLI inspection rules — the implementation counterpart of
// contracts/vendors/antigravity-cli.md § Inspector Repository rules,
// § Inspector Global rule, and § Relationship-only and excluded groups.
//
// A rule is the only thing that can authorize a read
// (contracts/inspection-path-allowlist.md § "Read authorization and
// applicability"), and every static rule below spells its matcher inline — base
// and selectors both — so which location it reaches is the first thing a
// reader meets on the record (AGENTS.md § Implementation simplicity policy).
//
// One arrangement is worth meeting before the records: the user settings
// carrier is one candidate recognized three times — settings, permissions,
// hooks — the arrangement `.claude/settings.json` and `.codex/config.toml`
// already have.
//
// Where a Repository skill or rule record carries a second selector it is the
// superseded `.agent` spelling, admitted only at the two locations whose own
// page states backward support for it and only in the shape that page shows
// there (contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
//
// This vendor ships no derived rule: no cited page documents a terminal setting
// that renames or relocates a workspace customization, so every path below is
// literal (contracts/vendors/antigravity-cli.md § Derived Repository rules).
//
// Each record is declared with `satisfies` so the keyed map's computed keys
// keep resolving (see `codex/rules.ts`).
import { ANY_DIRECTORIES, ANY_NAME } from '../../../server/inspection/rules/registry';
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { AntigravityRuleId } from '../identifier-types';
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
 * The FR/QR clauses every read-authorizing Global rule of this vendor rests
 * on: the consent model and the member boundary, on top of the Repository set.
 */
const GLOBAL_POLICY_REFS = ['FR-013', 'FR-014', 'FR-018', 'QR-001', 'QR-003', 'QR-004', 'QR-005'];

/**
 * The workspace context files: every `GEMINI.md` and `AGENTS.md` in the
 * repository, at the root and in any subdirectory, and the `.agents/` spelling
 * of each directory's pair. Whenever the terminal reads or edits a file it
 * walks up from that file's folder to the workspace root and loads the pair at
 * each level, so a file at any depth is one the terminal can genuinely load.
 * The root `GEMINI.md` is GitHub Copilot's too, and every `AGENTS.md` is read
 * by Copilot, Claude Code, and at the root by Codex: one file with several
 * recognitions, not several rows (spec.md FR-007).
 */
export const ANTIGRAVITY_REPO_CONTEXT_RULE = {
  ruleId: 'antigravity.repo.context',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.context` matcher, two programs:
   * `[ANY_DIRECTORIES, 'GEMINI.md']` and `[ANY_DIRECTORIES, 'AGENTS.md']`.
   *
   * `ANY_DIRECTORIES` includes zero segments and `.agents` like any other
   * directory name, so the two programs reach the root pair, every
   * subdirectory's pair, and the `<dir>/.agents/GEMINI.md` and
   * `<dir>/.agents/AGENTS.md` the page gives beside them; a program of their
   * own would only admit those files a second time. The same reach includes a
   * `.gemini/` directory and a workspace plugin directory, whose
   * customizations this vendor's rules exclude: a context file there is still
   * the directory's own, loaded as the walk passes through, and the grammar has
   * no step that excludes one directory name (spec.md FR-003). Which of them
   * a session loads depends on the files it reads, which this tool does not
   * observe (FR-009).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [ANY_DIRECTORIES, { kind: 'literal', value: 'GEMINI.md' }],
      [ANY_DIRECTORIES, { kind: 'literal', value: 'AGENTS.md' }],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Directory-scoped rules', 'Managing rules in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI evaluates AGENTS.md and GEMINI.md at the repository root and in subdirectories: whenever it reads or edits a file it walks up from that file’s folder to the workspace root, loading <dir>/AGENTS.md or <dir>/GEMINI.md and <dir>/.agents/AGENTS.md or <dir>/.agents/GEMINI.md at each level.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A workspace skill: a skill folder's `SKILL.md` below `.agents/skills/`, the
 * same shape Codex and Copilot read at the same location, so one such file
 * carries three recognitions.
 *
 * This is the shape every page that gives a terminal skill location shows, and
 * the only shape the observed implementation discovers: a flat Markdown file
 * directly below `skills/` is filtered out before any name is read
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 6), so no
 * rule admits one.
 */
export const ANTIGRAVITY_REPO_SKILL_RULE = {
  ruleId: 'antigravity.repo.skill',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.skill` matcher, two programs of four
   * segments:
   * `['.agents', 'skills', ANY_NAME, 'SKILL.md']` and
   * `['.agent', 'skills', ANY_NAME, 'SKILL.md']`.
   *
   * The two differ in one character — the current `.agents` and the superseded
   * `.agent` the vendor still supports — and that difference is the whole of
   * what the second program adds. Read them as one pair, not as a repeat.
   *
   * `ANY_NAME` is the one skill-folder segment and the terminal `SKILL.md`
   * literal keeps the admitted file exact, so nothing else in the folder is a
   * candidate: a skill's companions are found by enumerating its directory
   * rather than by a rule. Root-anchored with no leading `ANY_DIRECTORIES`, as
   * every `.agents/` rule here is.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'skills' },
        ANY_NAME,
        { kind: 'literal', value: 'SKILL.md' },
      ],
      [
        { kind: 'literal', value: '.agent' },
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
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['What are skills?', 'Anatomy of a skill', 'CLI skill locations'],
          reviewedOn: '2026-09-24',
          establishes:
            'A workspace skill is a folder at <workspace-root>/.agents/skills/<skill-folder>/ holding a required SKILL.md — the location the CLI skill locations table gives the terminal — and .agents/skills is the default while .agent/skills keeps backward compatibility.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A workspace rule: one Markdown file directly below a `.agents/rules/`
 * directory at the root or in any subdirectory, with the superseded
 * `.agent/rules/` spelling as the second selector. The rule's declared
 * activation — manual, always on, model decision, or a glob — is shown as
 * written and never evaluated (spec.md FR-016).
 */
export const ANTIGRAVITY_REPO_RULE_RULE = {
  ruleId: 'antigravity.repo.rule',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'rule',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.rule` matcher, two programs:
   * `[ANY_DIRECTORIES, '.agents', 'rules', /\.md$/u]` and
   * `[ANY_DIRECTORIES, '.agent', 'rules', /\.md$/u]`.
   *
   * As with the skill directory above, the two differ in one character and the
   * second is the superseded spelling the Rules page records as still
   * loaded.
   *
   * The leading `ANY_DIRECTORIES` is the page's directory-scoped reach: a rules
   * directory in any subdirectory is loaded while a file below it is read or
   * edited. No trailing one, because the page states that only a rules
   * directory's immediate `.md` children are scanned; Claude's rules directory
   * is documented as recursive and this one is not, so the difference between
   * the two programs is the difference between the two pages. The reach
   * includes a `.gemini/` directory and a workspace plugin directory, whose
   * own customizations this vendor's rules exclude: a rules directory there is
   * still that directory's own (spec.md FR-003). A nested file a
   * `.agents/rules.json` registers is not admitted (§ Known uncertainties item
   * 10).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        ANY_DIRECTORIES,
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
      [
        ANY_DIRECTORIES,
        { kind: 'literal', value: '.agent' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: [
            'Directory-scoped rules',
            'Global rules',
            'Activation modes',
            'Managing rules in Antigravity CLI',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI evaluates .agents/rules/*.md at the repository root and in subdirectories, with the legacy .agent/rules/*.md still loaded; only the immediate .md children of a rules directory are scanned, and each rule declares its trigger — always_on, model_decision, glob, or manual.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The workspace's standalone hook carrier, `.agents/hooks.json`, whose whole
 * purpose is hooks — the arrangement `.codex/hooks.json` already has. The
 * declarations reach the page as written; no command is run and no matcher is
 * evaluated against a tool call (spec.md FR-017).
 */
export const ANTIGRAVITY_REPO_HOOKS_RULE = {
  ruleId: 'antigravity.repo.hooks',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.hooks` matcher: the exact `['.agents', 'hooks.json']`
   * pair of literals at the Repository root — the shape `.codex/hooks.json`
   * already has.
   *
   * Root-anchored: the Hooks page gives the terminal's workspace hooks as
   * `.agents/hooks.json` at the project root, so a nested `.agents/hooks.json`
   * belongs to a working directory this product never selects and stays a near
   * miss.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'hooks.json' },
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
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks in Antigravity CLI', 'Schema and File Format'],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI defines workspace hooks in .agents/hooks.json at the project root, and that file maps a hook name to its event configurations, each holding the handlers that run for it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A workspace custom agent written as one Markdown file directly below
 * `.agents/agents/`.
 */
export const ANTIGRAVITY_REPO_AGENT_FILE_RULE = {
  ruleId: 'antigravity.repo.agent.file',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.agent.file` matcher:
   * `['.agents', 'agents', /\.md$/u]`, a direct child of the root's
   * `.agents/agents/`. Three segments, so an agent two levels deep is a near
   * miss and the directory shape below is the rule that reaches one.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'google.antigravity.cli-subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-24',
          establishes:
            'Workspace agents are discovered at .agents/agents/<name>.md or .agents/agents/<name>/agent.md.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A workspace custom agent written as `agent.md` inside its own directory
 * below `.agents/agents/`.
 */
export const ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE = {
  ruleId: 'antigravity.repo.agent.directory',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.agent.directory` matcher:
   * `['.agents', 'agents', ANY_NAME, 'agent.md']`, one agent-name segment and
   * an exact entry point.
   *
   * The terminal literal keeps the admission to `agent.md` alone: no cited page
   * documents a companion beside a custom agent, so the other files in that
   * directory are not candidates (spec.md § Edge Cases).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'agents' },
        ANY_NAME,
        { kind: 'literal', value: 'agent.md' },
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
          sourceId: 'google.antigravity.cli-subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-24',
          establishes:
            'Workspace agents are discovered at .agents/agents/<name>.md or .agents/agents/<name>/agent.md.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The workspace MCP carrier: a standalone JSON profile at the repository
 * root's `.agents/mcp_config.json`, whose `mcpServers` object is its
 * recognition. Admitted whatever that object declares, exactly as
 * `.mcp.json`'s is.
 */
export const ANTIGRAVITY_REPO_MCP_RULE = {
  ruleId: 'antigravity.repo.mcp',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.mcp` matcher: the exact
   * `['.agents', 'mcp_config.json']` pair at the Repository root, the workspace
   * half of the two locations the MCP page states.
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'mcp_config.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-mcp',
          url: 'https://antigravity.google/docs/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-24',
          establishes:
            'Workspace local MCP setups are configured in the active project under .agents/mcp_config.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's standalone global context files: `GEMINI.md` and
 * `AGENTS.md` directly below the home and below its `config/` directory. Each
 * applies across every project and is always active.
 */
export const ANTIGRAVITY_GLOBAL_CONTEXT_RULE = {
  ruleId: 'antigravity.global.context',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.context` matcher, four exact programs:
   * `['GEMINI.md']`, `['AGENTS.md']`, `['config', 'GEMINI.md']`, and
   * `['config', 'AGENTS.md']`.
   *
   * The base is this tool's own Global boundary, never the Repository root: the
   * two are separate Sources whose roots never merge (FR-013 through FR-018).
   * Exact literals, so the plan reads the named files and never enumerates the
   * home — which is what keeps consent to read a context file from becoming
   * permission to list a reader's `~/.gemini`, where their credentials, session
   * history, and the other two products' directories sit.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [{ kind: 'literal', value: 'GEMINI.md' }],
      [{ kind: 'literal', value: 'AGENTS.md' }],
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'GEMINI.md' },
      ],
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'AGENTS.md' },
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
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Global rules', 'Managing rules in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'The standalone global files ~/.gemini/AGENTS.md, ~/.gemini/GEMINI.md, ~/.gemini/config/AGENTS.md, and ~/.gemini/config/GEMINI.md apply across all projects and are always active, and the CLI section names the first two among its global rules.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's modular global rules: a Markdown file directly below
 * `config/rules/` or the terminal's own `antigravity-cli/rules/`. A rule's
 * declared activation is shown as written and never evaluated (spec.md
 * FR-016), exactly as a workspace rule's is.
 */
export const ANTIGRAVITY_GLOBAL_RULE_RULE = {
  ruleId: 'antigravity.global.rule',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'rule',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.rule` matcher, two programs of three segments:
   * `['config', 'rules', /\.md$/u]` and `['antigravity-cli', 'rules', /\.md$/u]`.
   *
   * The two differ in their root alone: the page's general section gives
   * `config/rules/` and its CLI section adds the terminal's own directory. No
   * recursive step, because the page states that only a rules directory's
   * immediate `.md` children are scanned.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules/',
          officialHost: 'antigravity.google',
          sections: ['Global rules', 'Managing rules in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'Modular global rules live in ~/.gemini/config/rules/*.md, and the CLI also evaluates ~/.gemini/antigravity-cli/rules/*.md; only a rules directory’s immediate .md children are scanned.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's global MCP carrier, below the shared `config/`
 * directory the vendor's other surfaces read too.
 */
export const ANTIGRAVITY_GLOBAL_MCP_RULE = {
  ruleId: 'antigravity.global.mcp',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'mcp_config.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-mcp',
          url: 'https://antigravity.google/docs/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-24',
          establishes:
            'Global MCP server setups are configured in ~/.gemini/config/mcp_config.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A global custom agent written as one Markdown file directly below the
 * consented home's `config/agents/`.
 *
 * Two shapes, two rules, exactly as the workspace pair above: the user tier's
 * `config/agents/` is documented with the same two spellings the workspace
 * directory has, so admitting only this one would leave a reader's folder-
 * shaped global agent off every list while its workspace twin was listed.
 */
export const ANTIGRAVITY_GLOBAL_AGENT_FILE_RULE = {
  ruleId: 'antigravity.global.agent.file',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.agent.file` matcher:
   * `['config', 'agents', /\.md$/u]`, a direct child of the consented home's
   * `config/agents/`. Three segments, so an agent one level deeper is a near
   * miss and the directory shape below is the rule that reaches one.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'agents' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'google.antigravity.cli-subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-24',
          establishes: 'Global custom agents are discovered in ~/.gemini/config/agents/.',
        },
        {
          sourceId: 'google.antigravity.subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Agent Location and Discovery'],
          reviewedOn: '2026-09-11',
          establishes:
            'Custom subagents are discovered at ~/.gemini/config/agents/<name>.md or at <name>/agent.md inside that same directory, the two spellings this page gives for the user tier as it gives them for the workspace.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A global custom agent written as `agent.md` inside its own directory below
 * the consented home's `config/agents/`.
 *
 * The terminal literal keeps the admission to `agent.md` alone, as the
 * workspace directory rule's does: no cited page documents a companion beside
 * a custom agent, so the other files in that directory are not candidates
 * (spec.md § Edge Cases).
 */
export const ANTIGRAVITY_GLOBAL_AGENT_DIRECTORY_RULE = {
  ruleId: 'antigravity.global.agent.directory',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.agent.directory` matcher:
   * `['config', 'agents', ANY_NAME, 'agent.md']`, one agent-name segment and
   * an exact entry point.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'agents' },
        ANY_NAME,
        { kind: 'literal', value: 'agent.md' },
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
          sourceId: 'google.antigravity.subagents',
          url: 'https://antigravity.google/docs/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Agent Location and Discovery'],
          reviewedOn: '2026-09-11',
          establishes:
            'Custom subagents are discovered at ~/.gemini/config/agents/<name>.md or at <name>/agent.md inside that same directory, the two spellings this page gives for the user tier as it gives them for the workspace.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A global skill below the consented home: a skill folder's `SKILL.md` under
 * `antigravity-cli/skills/` or under `config/skills/`.
 *
 * Two roots rather than one. The shared Agent Skills page gives the terminal's
 * global skills at `antigravity-cli/skills/`, and gives `config/skills/` as
 * the global location of the desktop application and the editor extensions
 * rather than of the terminal. The terminal takes both nonetheless, having
 * appended its application data directory and, when the configuration
 * directory is available, that one too, then removed duplicate roots before
 * walking them (observed against `agy` 1.2.0; contracts/vendors/antigravity-cli.md
 * § Known uncertainties item 6 records what that observation is and is not).
 * The extensions' legacy `antigravity/skills/` stays out because it belongs to
 * a product this release does not support (§ Surface boundary).
 */
export const ANTIGRAVITY_GLOBAL_SKILL_RULE = {
  ruleId: 'antigravity.global.skill',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.skill` matcher, two programs of four
   * segments:
   * `['antigravity-cli', 'skills', ANY_NAME, 'SKILL.md']` and
   * `['config', 'skills', ANY_NAME, 'SKILL.md']`.
   *
   * The two differ in their root alone, which is the whole of what the second
   * program adds. The terminal `SKILL.md` literal keeps the admitted file
   * exact, so nothing else in a skill folder is a candidate: a skill's
   * companions are found by enumerating its directory rather than by a rule.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'skills' },
        ANY_NAME,
        { kind: 'literal', value: 'SKILL.md' },
      ],
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'skills' },
        ANY_NAME,
        { kind: 'literal', value: 'SKILL.md' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: [
            'CLI skill locations',
            'Antigravity 2.0 skill locations',
            'Antigravity IDE skill locations',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI skill locations table gives a global skill, available in all workspaces, as a skill folder at ~/.gemini/antigravity-cli/skills/<skill-folder>/ — the first root this rule admits — while ~/.gemini/config/skills/<skill-folder>/, the second, is the global location the page gives Antigravity 2.0 and the standalone IDE rather than the terminal.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's settings document, whose subject is the file: the
 * whole JSON reaches the page as written, and its permission and hook
 * declarations belong to the two rules below rather than to a second row here.
 */
export const ANTIGRAVITY_GLOBAL_SETTINGS_RULE = {
  ruleId: 'antigravity.global.settings',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'settings.json' },
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
          sourceId: 'google.antigravity.cli-settings',
          url: 'https://antigravity.google/docs/settings/',
          officialHost: 'antigravity.google',
          sections: ['Configuration file location'],
          reviewedOn: '2026-09-24',
          establishes:
            'The persistent settings are saved in plain JSON at ~/.gemini/antigravity-cli/settings.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The permission lists the same settings carrier declares, admitted over the
 * same selector: `allow`, `ask`, and `deny`, each entry shown as written. No
 * rule is evaluated against a path or a command (spec.md FR-011).
 */
export const ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE = {
  ruleId: 'antigravity.global.permissions',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'permissions',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'settings.json' },
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
          sourceId: 'google.antigravity.cli-permissions',
          url: 'https://antigravity.google/docs/permissions/',
          officialHost: 'antigravity.google',
          sections: ['CLI fine-grained permissions'],
          reviewedOn: '2026-09-24',
          establishes:
            'Permissions are evaluated across the deny, ask, and allow access lists configured inside the global settings at ~/.gemini/antigravity-cli/settings.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's standalone hook carrier, `config/hooks.json`: the user
 * tier's counterpart of `antigravity.repo.hooks`, at the vendor's shared
 * configuration directory rather than the terminal's own. The Hooks page names
 * both as locations the terminal defines hooks at and gives the file's schema
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 8).
 */
export const ANTIGRAVITY_GLOBAL_HOOKS_RULE = {
  ruleId: 'antigravity.global.hooks',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'config' },
        { kind: 'literal', value: 'hooks.json' },
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
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks in Antigravity CLI', 'Schema and File Format'],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI defines global hooks in ~/.gemini/config/hooks.json, and that file maps a hook name to its event configurations, each holding the handlers that run for it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The hook declarations the settings carrier declares inline, admitted over
 * the settings rule's own selector and whatever the object holds. The plugin
 * form of a hook leaves with the installed copies it belongs to
 * (`antigravity.excluded.plugins`). No declared command is run (spec.md
 * FR-011).
 */
export const ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE = {
  ruleId: 'antigravity.global.hooks.inline',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'hook',
  sourceKinds: ['global'],
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'settings.json' },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks in Antigravity CLI'],
          reviewedOn: '2026-09-24',
          establishes:
            'The CLI defines global hooks inside the primary ~/.gemini/antigravity-cli/settings.json file as well as in a standalone hooks.json, and gives no schema for the settings-file form.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The workspace plugin directory as a plugin — `.agents/plugins/` and the
 * `_agents/plugins/` spelling beside it — with the skills, rules, MCP
 * definitions, and hooks inside them. A `GEMINI.md` or `AGENTS.md` inside one
 * is not excluded, and neither is a `.agents/rules/` there: they are the
 * context files and the rules directory of the directory holding them, which
 * `antigravity.repo.context` and `antigravity.repo.rule` admit as at any other
 * depth, because the terminal loads them while walking up through that
 * directory.
 *
 * The reason is not the installed-copy reason the rule below gives, which does
 * not reach a plugin authored in a repository: it is that no page names a
 * workspace plugin directory for the terminal. The Plugins page gives
 * `.agents/plugins/` in its desktop-application and editor-extension sections,
 * while its terminal section and the terminal's own pages describe a plugin
 * only as a bundle `agy` stages into the user tier, so nothing cited here
 * establishes that the terminal loads one from a workspace (spec.md FR-003;
 * contracts/vendors/antigravity-cli.md § Surface boundary).
 */
export const ANTIGRAVITY_EXCLUDED_WORKSPACE_PLUGINS_RULE = {
  ruleId: 'antigravity.excluded.workspace-plugins',
  tool: 'antigravity',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['repository'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-013', 'FR-018', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/plugins/',
          officialHost: 'antigravity.google',
          sections: [
            'Manual plugin installation',
            'CLI plugin management',
            'CLI filesystem location',
            'Standalone IDE plugin installation',
          ],
          reviewedOn: '2026-09-24',
          establishes:
            'The page gives the workspace plugin folder .agents/plugins/ for Antigravity 2.0 and the standalone IDE, while its CLI section installs a plugin with agy plugin install, stages it within ~/.gemini/antigravity-cli/plugins/<plugin_name>/, and names no workspace location a plugin can be authored at for the terminal.',
        },
        {
          sourceId: 'google.antigravity.cli-features',
          url: 'https://antigravity.google/docs/cli/features/',
          officialHost: 'antigravity.google',
          sections: ['Plugins'],
          reviewedOn: '2026-09-10',
          establishes:
            'Installing a plugin has the CLI stage its files in the home directory under ~/.gemini/antigravity-cli/plugins/<plugin_name>/, which is the only plugin location the terminal pages give.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Installed plugin copies below the user tier's `antigravity-cli/plugins/`,
 * the `import_manifest.json` that tracks them, and the skills, agents, rules,
 * MCP definitions, and hooks inside them: an installed copy is reproduced from
 * its source rather than authored, which is what the parent specification's
 * FR-018 already excludes for every vendor (spec.md FR-010).
 */
export const ANTIGRAVITY_EXCLUDED_PLUGINS_RULE = {
  ruleId: 'antigravity.excluded.plugins',
  tool: 'antigravity',
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
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Directory structure', 'CLI filesystem location'],
          reviewedOn: '2026-09-24',
          establishes:
            'Installing a plugin has the CLI stage its assets within ~/.gemini/antigravity-cli/plugins/<plugin_name>/, and a plugin directory holds plugin.json and optionally mcp_config.json, hooks.json, skills/, agents/, and rules/ — so what the vendor loads there is a copy of a source this rule declines.',
        },
        {
          sourceId: 'google.antigravity.cli-features',
          url: 'https://antigravity.google/docs/cli/features/',
          officialHost: 'antigravity.google',
          sections: ['Plugins'],
          reviewedOn: '2026-09-10',
          establishes:
            'The CLI stages plugin files in the home directory under ~/.gemini/antigravity-cli/plugins/<plugin_name>/ beside an import_manifest.json tracking manifest.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The user-tier state no Global rule admits, on record as excluded: the
 * credentials and keyring material the first-launch onboarding stores, session
 * and conversation history, caches, and logs; and the vendor's desktop and
 * editor customizations, which this release does not recognize (spec.md
 * FR-010, QR-005).
 */
export const ANTIGRAVITY_EXCLUDED_USER_RUNTIME_RULE = {
  ruleId: 'antigravity.excluded.user-runtime',
  tool: 'antigravity',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['global'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA ? ['FR-013', 'FR-018', 'QR-003', 'QR-005'] : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['First-launch onboarding'],
          reviewedOn: '2026-09-10',
          establishes:
            'On first launch the CLI detects existing profiles and migrates active session tokens into the operating system native keyring storage, which is credential material rather than an authored customization.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Antigravity CLI's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const ANTIGRAVITY_INSPECTION_RULES: Readonly<Record<AntigravityRuleId, InspectionRule>> = {
  [ANTIGRAVITY_EXCLUDED_PLUGINS_RULE.ruleId]: ANTIGRAVITY_EXCLUDED_PLUGINS_RULE,
  [ANTIGRAVITY_EXCLUDED_USER_RUNTIME_RULE.ruleId]: ANTIGRAVITY_EXCLUDED_USER_RUNTIME_RULE,
  [ANTIGRAVITY_EXCLUDED_WORKSPACE_PLUGINS_RULE.ruleId]: ANTIGRAVITY_EXCLUDED_WORKSPACE_PLUGINS_RULE,
  [ANTIGRAVITY_GLOBAL_AGENT_DIRECTORY_RULE.ruleId]: ANTIGRAVITY_GLOBAL_AGENT_DIRECTORY_RULE,
  [ANTIGRAVITY_GLOBAL_AGENT_FILE_RULE.ruleId]: ANTIGRAVITY_GLOBAL_AGENT_FILE_RULE,
  [ANTIGRAVITY_GLOBAL_CONTEXT_RULE.ruleId]: ANTIGRAVITY_GLOBAL_CONTEXT_RULE,
  [ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE.ruleId]: ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE,
  [ANTIGRAVITY_GLOBAL_HOOKS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_HOOKS_RULE,
  [ANTIGRAVITY_GLOBAL_MCP_RULE.ruleId]: ANTIGRAVITY_GLOBAL_MCP_RULE,
  [ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE,
  [ANTIGRAVITY_GLOBAL_RULE_RULE.ruleId]: ANTIGRAVITY_GLOBAL_RULE_RULE,
  [ANTIGRAVITY_GLOBAL_SETTINGS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_SETTINGS_RULE,
  [ANTIGRAVITY_GLOBAL_SKILL_RULE.ruleId]: ANTIGRAVITY_GLOBAL_SKILL_RULE,
  [ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE.ruleId]: ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE,
  [ANTIGRAVITY_REPO_AGENT_FILE_RULE.ruleId]: ANTIGRAVITY_REPO_AGENT_FILE_RULE,
  [ANTIGRAVITY_REPO_CONTEXT_RULE.ruleId]: ANTIGRAVITY_REPO_CONTEXT_RULE,
  [ANTIGRAVITY_REPO_HOOKS_RULE.ruleId]: ANTIGRAVITY_REPO_HOOKS_RULE,
  [ANTIGRAVITY_REPO_MCP_RULE.ruleId]: ANTIGRAVITY_REPO_MCP_RULE,
  [ANTIGRAVITY_REPO_RULE_RULE.ruleId]: ANTIGRAVITY_REPO_RULE_RULE,
  [ANTIGRAVITY_REPO_SKILL_RULE.ruleId]: ANTIGRAVITY_REPO_SKILL_RULE,
};
