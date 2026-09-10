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
// Two arrangements are worth meeting before the records. A workspace skill has
// two documented shapes at one location — a flat Markdown file and a skill
// folder's `SKILL.md` — so it has two rules with two row units rather than one
// rule with two selectors, exactly as the two custom-agent shapes do
// (research.md § 2). And the user settings carrier is one candidate recognized
// three times — settings, permissions, hooks — the arrangement
// `.claude/settings.json` and `.codex/config.toml` already have.
//
// Where a record carries a second selector it is the superseded `.agent`
// spelling, admitted only at the two locations whose own page states backward
// support for it and only in the shape that page shows there
// (contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
//
// This vendor ships no derived rule: no cited page documents a terminal setting
// that renames or relocates a workspace customization, so every path below is
// literal (contracts/vendors/antigravity-cli.md § Derived Repository rules).
//
// Each record is declared with `satisfies` so the keyed map's computed keys
// keep resolving (see `codex/rules.ts`).
import { ANY_NAME } from '../../../server/inspection/rules/registry';
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
 * The repository root's `GEMINI.md`, which GitHub Copilot also reads: one file
 * with two recognitions, not two rows. The root alone, because the migration
 * page names the workspace context files as the ones in the active directory
 * and states no depth below it — reaching deeper would rest on an inference
 * (spec.md FR-007; § Known uncertainties item 1).
 */
export const ANTIGRAVITY_REPO_CONTEXT_GEMINI_ROOT_RULE = {
  ruleId: 'antigravity.repo.context.gemini-root',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.context.gemini-root` matcher: one exact `GEMINI.md`
   * literal at the Repository root.
   *
   * No leading `ANY_DIRECTORIES`. The migration page names the context files as
   * the ones in the active directory and states no depth below it, so the root's
   * own file is the whole admission and a nested `GEMINI.md` is a near miss at
   * every depth (contracts/vendors/antigravity-cli.md § Known uncertainties
   * item 1).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [[{ kind: 'literal', value: 'GEMINI.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent parses and enforces the rule constraints defined inside the active directory GEMINI.md and AGENTS.md files.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The repository root's `AGENTS.md`, which Copilot and Codex also read. The
 * root alone, for the reason the `GEMINI.md` rule states.
 */
export const ANTIGRAVITY_REPO_CONTEXT_AGENTS_ROOT_RULE = {
  ruleId: 'antigravity.repo.context.agents-root',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.context.agents-root` matcher: one exact `AGENTS.md`
   * literal at the Repository root, anchored for the same reason as the
   * `GEMINI.md` rule above.
   *
   * Other tools admit this same file, and that is the point: one file stays one
   * row carrying each reader's recognition (spec.md FR-007).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [[{ kind: 'literal', value: 'AGENTS.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent parses and enforces the rule constraints defined inside the active directory GEMINI.md and AGENTS.md files.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A flat workspace skill: one Markdown file directly below `.agents/skills/`.
 *
 * This shape is admitted on the vendor's own documentation and against the
 * observed implementation, which is a deliberate choice rather than an
 * oversight. The terminal's plugins and skills page tells a reader to draft
 * `.agents/skills/format-tests.md`, and it is the only page in the vendor's
 * documentation that says so; the shared Agent Skills page, the editor
 * extensions' page, both plugin pages, and a Google codelab written for this
 * terminal all show a skill folder holding a `SKILL.md` instead. A static
 * analysis of the published `agy` 1.2.0 Linux x64 binary agrees with the
 * majority: the skill customization kind is the subdirectory kind rather than
 * the file kind, so `discoverInSubDirs` filters a plain file out before any
 * name is read, and `GetSkillsCreatePath` builds
 * `{workspace}/.agents/skills/{skill_name}/SKILL.md` (observed against the
 * binary whose SHA-256 is
 * 195bf11b249deebe67028305a9b7b1d19ac38e9ab281b786a163a7d2fc8ff428, not
 * established by any cited page).
 *
 * So this rule most likely admits a file the terminal does not read. It stays
 * because the two errors are not symmetric. A reader who followed the vendor's
 * own instructions has this file, and dropping the rule would show them
 * nothing at all about it — which is the failure this product exists to
 * prevent — while keeping it lists the file with a recognition the vendor's
 * documentation supports. The analysis covers the default directory
 * configuration of one platform's 1.2.0 build; "not auto-discovered there" is
 * not "never read". Delete this rule when a page or a later build settles it
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
 */
export const ANTIGRAVITY_REPO_SKILL_FILE_RULE = {
  ruleId: 'antigravity.repo.skill.file',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.skill.file` matcher, authored in the typed segment
   * form the contract table shows: `['.agents', 'skills', /\.md$/u]`.
   *
   * Three segments, so what it admits is a direct child of the root's
   * `.agents/skills/`. A `deploy/SKILL.md` inside that directory is four
   * segments and belongs to the rule below, which is what keeps the two row
   * units apart rather than letting one rule admit both.
   *
   * The superseded `.agent/` spelling is deliberately absent: the page that
   * states backward support is the one that gives the folder shape, so it
   * reaches that shape alone (§ Known uncertainties item 6).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'skills' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? REPOSITORY_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Creating local workspace skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'Create a directory named .agents/skills/ at the project root and draft a markdown file with a .md extension whose frontmatter defines name and description; the skill is compiled into a slash command when agy runs in that directory.',
        },
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['Where skills live', 'Creating a skill'],
          reviewedOn: '2026-09-10',
          establishes:
            'A skill is a folder containing a SKILL.md file, which is the shape this page gives for the same .agents/skills/ directory and is why this rule is recorded as a conflict rather than as documented.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A directory-shaped workspace skill: a skill folder's `SKILL.md` below
 * `.agents/skills/`, the same shape Codex and Copilot read at the same
 * location, so one such file carries three recognitions. It is a rule of its
 * own rather than a second selector on the flat rule above, because the two
 * row units differ — one names a file, the other a directory whose entry point
 * is `SKILL.md` — exactly as the two custom-agent shapes below are two rules
 * (research.md § 2).
 *
 * This is the shape every source but one agrees on, and the only shape the
 * observed implementation discovers. The flat rule above records why it is
 * nonetheless admitted (contracts/vendors/antigravity-cli.md § Known
 * uncertainties item 6).
 */
export const ANTIGRAVITY_REPO_SKILL_DIRECTORY_RULE = {
  ruleId: 'antigravity.repo.skill.directory',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.skill.directory` matcher, two programs of four
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
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['Where skills live', 'Creating a skill'],
          reviewedOn: '2026-09-10',
          establishes:
            'A workspace-specific skill is a folder at <workspace-root>/.agents/skills/<skill-folder>/ holding a SKILL.md, and .agents/skills is the current default while .agent/skills keeps backward support.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A workspace rule: one Markdown file directly below `.agents/rules/`, with
 * the superseded `.agent/rules/` spelling as the second selector. The rule's
 * declared activation — manual, always on, model decision, or a glob — is
 * shown as written and never evaluated (spec.md FR-016).
 */
export const ANTIGRAVITY_REPO_RULE_RULE = {
  ruleId: 'antigravity.repo.rule',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'rule',
  sourceKinds: ['repository'],
  /**
   * The `antigravity.repo.rule` matcher, two programs of three segments:
   * `['.agents', 'rules', /\.md$/u]` and `['.agent', 'rules', /\.md$/u]`.
   *
   * As with the skill directory above, the two differ in one character and the
   * second is the superseded spelling the Rules page records as still
   * supported.
   *
   * No `ANY_DIRECTORIES` on either end. The leading one is absent because the
   * page names the workspace or git root, which is the selected Repository root
   * this product reasons in; the trailing one is absent because the page shows
   * no depth inside the rules directory. Claude's rules directory is documented
   * as recursive and this one is not, so the difference between the two
   * programs is the difference between the two pages
   * (§ Known uncertainties item 10).
   */
  matcher: {
    base: { kind: 'repository' },
    selectors: [
      [
        { kind: 'literal', value: '.agents' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
      [
        { kind: 'literal', value: '.agent' },
        { kind: 'literal', value: 'rules' },
        { kind: 'regex', pattern: /\.md$/u },
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
          sourceId: 'google.antigravity.rules',
          url: 'https://antigravity.google/docs/rules-workflows/',
          officialHost: 'antigravity.google',
          sections: ['Workspace Rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'Workspace rules live in the .agents/rules folder of the workspace or git root, with backward support for .agent/rules, and each rule declares whether it activates manually, always, by model decision, or by a glob pattern.',
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
   * Root-anchored: the Hooks page names the workspace's `.agents/` as the
   * customization directory, so a nested `.agents/hooks.json` belongs to a
   * working directory this product never selects and stays a near miss.
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
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Configuration', 'Schema and File Format'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks are configured in a hooks.json file located in the customization directory, .agents/ in the workspace being one, and that file maps a hook name to its event configurations, each holding matcher groups of command handlers.',
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-10',
          establishes:
            'Workspace local MCP setups are configured in the active project under .agents/mcp_config.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's global context file.
 */
export const ANTIGRAVITY_GLOBAL_CONTEXT_RULE = {
  ruleId: 'antigravity.global.context',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'instructions',
  sourceKinds: ['global'],
  /**
   * The `antigravity.global.context` matcher: the one `GEMINI.md` directly
   * below the consented Antigravity home.
   *
   * The base is this tool's own Global boundary, never the Repository root: the
   * two are separate Sources whose roots never merge (FR-013 through FR-018).
   * One exact literal, so the plan reads the named file and never enumerates
   * the home — which is what keeps consent to read a context file from becoming
   * permission to list a reader's `~/.gemini`, where their credentials, session
   * history, and the other two products' directories sit.
   */
  matcher: {
    base: { kind: 'global', member: 'antigravity' },
    selectors: [[{ kind: 'literal', value: 'GEMINI.md' }]],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-migration',
          url: 'https://antigravity.google/docs/cli/gcli-migration/',
          officialHost: 'antigravity.google',
          sections: ['Context files and workspace rules'],
          reviewedOn: '2026-09-10',
          establishes:
            'The agent automatically consults and enforces the global constraints located at ~/.gemini/GEMINI.md.',
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
          url: 'https://antigravity.google/docs/cli/mcp/',
          officialHost: 'antigravity.google',
          sections: ['Global and Workspace Server Configs'],
          reviewedOn: '2026-09-10',
          establishes:
            'Global MCP server setups are configured in ~/.gemini/config/mcp_config.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A global custom agent: one Markdown file directly below the consented
 * home's `config/agents/`.
 */
export const ANTIGRAVITY_GLOBAL_AGENT_RULE = {
  ruleId: 'antigravity.global.agent',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['global'],
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
          url: 'https://antigravity.google/docs/cli/subagents/',
          officialHost: 'antigravity.google',
          sections: ['Custom Agents (Markdown Format)'],
          reviewedOn: '2026-09-10',
          establishes: 'Global custom agents are discovered in ~/.gemini/config/agents/.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * A global shared skill below the consented home, in every shape and at every
 * root the vendor's documentation and its published binary between them place
 * one: a skill folder's `SKILL.md` under `antigravity-cli/skills/` or under
 * `config/skills/`, and the flat Markdown file the terminal's own page shows
 * under `antigravity-cli/skills/`.
 *
 * Two roots rather than one, because the pages that name a global skill
 * directory name different ones — the terminal's own page
 * `antigravity-cli/skills/`, the shared Agent Skills page `config/skills/`,
 * and the editor extensions' page a third this release does not admit. That
 * is not a disagreement to settle by choosing: the terminal takes both, having
 * appended its application data directory and, when the configuration
 * directory is available, that one too, then removed duplicate roots before
 * walking them (observed against `agy` 1.2.0; see the flat workspace rule
 * above for what that observation is and is not). The third directory stays
 * out because it belongs to a product this release does not support
 * (§ Surface boundary).
 *
 * The flat selector carries the same conflict, and the same reason for
 * admitting it anyway, as the flat workspace rule
 * (contracts/vendors/antigravity-cli.md § Known uncertainties item 6).
 */
export const ANTIGRAVITY_GLOBAL_SKILL_RULE = {
  ruleId: 'antigravity.global.skill',
  tool: 'antigravity',
  discoveryClass: 'static-candidate',
  kind: 'skill',
  sourceKinds: ['global'],
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
      [
        { kind: 'literal', value: 'antigravity-cli' },
        { kind: 'literal', value: 'skills' },
        { kind: 'regex', pattern: /\.md$/u },
      ],
    ],
  },
  policyRefs: SHIPS_MAINTENANCE_DATA ? GLOBAL_POLICY_REFS : [],
  precedenceGroup: null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Sharing global skills'],
          reviewedOn: '2026-09-10',
          establishes:
            'Any skill placed in ~/.gemini/antigravity-cli/skills/ is automatically imported as a global slash command whenever agy launches in any directory.',
        },
        {
          sourceId: 'google.antigravity.skills',
          url: 'https://antigravity.google/docs/skills/',
          officialHost: 'antigravity.google',
          sections: ['Where skills live'],
          reviewedOn: '2026-09-10',
          establishes:
            'A global skill, available across all workspaces, is a skill folder holding a SKILL.md at ~/.gemini/config/skills/<skill-folder>/.',
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
          url: 'https://antigravity.google/docs/cli/settings/',
          officialHost: 'antigravity.google',
          sections: ['Configuration file location'],
          reviewedOn: '2026-09-10',
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
          url: 'https://antigravity.google/docs/cli/permissions/',
          officialHost: 'antigravity.google',
          sections: ['Fine-grained permissions'],
          reviewedOn: '2026-09-10',
          establishes:
            'Permissions are evaluated across the deny, ask, and allow access lists configured inside the global settings at ~/.gemini/antigravity-cli/settings.json.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The consented home's standalone hook carrier, `config/hooks.json`: the user
 * tier's counterpart of `antigravity.repo.hooks`, at the vendor's shared
 * configuration directory rather than the terminal's own. Both are
 * `partially-documented`, because the page that gives the schema gives the
 * location as an example of a customization directory
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
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'google.antigravity.hooks',
          url: 'https://antigravity.google/docs/hooks/',
          officialHost: 'antigravity.google',
          sections: ['Configuration', 'Schema and File Format'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks are configured in a hooks.json file located in the customization directory, ~/.gemini/config/ being one, and that file maps a hook name to its event configurations, each holding matcher groups of command handlers.',
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
          sourceId: 'google.antigravity.cli-plugins-skills',
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Managing hooks'],
          reviewedOn: '2026-09-10',
          establishes:
            'Hooks are defined inside a plugin hooks.json or configured inside the primary settings.json file.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The workspace plugin directory and everything below it — `.agents/plugins/`
 * and the `_agents/plugins/` spelling beside it — with the skills, rules, MCP
 * definitions, and hooks inside them.
 *
 * The reason is not the installed-copy reason the rule below gives, which does
 * not reach a plugin authored in a repository: it is that no terminal page
 * names a workspace plugin directory at all. The vendor documents it in the
 * desktop application's and the editor extensions' trees, while the terminal's
 * own pages describe a plugin only as a bundle `agy` stages into the user
 * tier, so nothing cited here establishes that the terminal loads one from a
 * workspace (spec.md FR-003; contracts/vendors/antigravity-cli.md
 * § Surface boundary).
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
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Antigravity plugins', 'Plugin filesystem structure'],
          reviewedOn: '2026-09-10',
          establishes:
            'The terminal stages a plugin it installs or imports within ~/.gemini/antigravity-cli/plugins/<plugin_name>/ and documents no workspace location a plugin can be authored at.',
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
          url: 'https://antigravity.google/docs/cli/plugins/',
          officialHost: 'antigravity.google',
          sections: ['Antigravity plugins', 'Plugin filesystem structure'],
          reviewedOn: '2026-09-10',
          establishes:
            'Installing or importing a plugin stages the bundle files within ~/.gemini/antigravity-cli/plugins/<plugin_name>/, whose layout holds plugin.json and optionally mcp_config.json, hooks.json, skills/, agents/, and rules/ — so what the vendor loads there is a copy of a source this rule declines.',
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
  [ANTIGRAVITY_GLOBAL_AGENT_RULE.ruleId]: ANTIGRAVITY_GLOBAL_AGENT_RULE,
  [ANTIGRAVITY_GLOBAL_CONTEXT_RULE.ruleId]: ANTIGRAVITY_GLOBAL_CONTEXT_RULE,
  [ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE.ruleId]: ANTIGRAVITY_GLOBAL_HOOKS_INLINE_RULE,
  [ANTIGRAVITY_GLOBAL_HOOKS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_HOOKS_RULE,
  [ANTIGRAVITY_GLOBAL_MCP_RULE.ruleId]: ANTIGRAVITY_GLOBAL_MCP_RULE,
  [ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_PERMISSIONS_RULE,
  [ANTIGRAVITY_GLOBAL_SETTINGS_RULE.ruleId]: ANTIGRAVITY_GLOBAL_SETTINGS_RULE,
  [ANTIGRAVITY_GLOBAL_SKILL_RULE.ruleId]: ANTIGRAVITY_GLOBAL_SKILL_RULE,
  [ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE.ruleId]: ANTIGRAVITY_REPO_AGENT_DIRECTORY_RULE,
  [ANTIGRAVITY_REPO_AGENT_FILE_RULE.ruleId]: ANTIGRAVITY_REPO_AGENT_FILE_RULE,
  [ANTIGRAVITY_REPO_CONTEXT_AGENTS_ROOT_RULE.ruleId]: ANTIGRAVITY_REPO_CONTEXT_AGENTS_ROOT_RULE,
  [ANTIGRAVITY_REPO_CONTEXT_GEMINI_ROOT_RULE.ruleId]: ANTIGRAVITY_REPO_CONTEXT_GEMINI_ROOT_RULE,
  [ANTIGRAVITY_REPO_HOOKS_RULE.ruleId]: ANTIGRAVITY_REPO_HOOKS_RULE,
  [ANTIGRAVITY_REPO_MCP_RULE.ruleId]: ANTIGRAVITY_REPO_MCP_RULE,
  [ANTIGRAVITY_REPO_RULE_RULE.ruleId]: ANTIGRAVITY_REPO_RULE_RULE,
  [ANTIGRAVITY_REPO_SKILL_DIRECTORY_RULE.ruleId]: ANTIGRAVITY_REPO_SKILL_DIRECTORY_RULE,
  [ANTIGRAVITY_REPO_SKILL_FILE_RULE.ruleId]: ANTIGRAVITY_REPO_SKILL_FILE_RULE,
};
