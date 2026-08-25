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
// (FR-024; contracts/vendors/claude-code.md § Known ambiguities and
// version-sensitive facts, item 9). The
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
            'Project instructions are ./CLAUDE.md or ./.claude/CLAUDE.md and local instructions ./CLAUDE.local.md; both filenames are discovered on demand in subdirectories as Claude reads files there — the documented descendant reach that is why this rule admits them at every depth — while the ancestor walk above the working directory contributes only the selected root, the one member every session shares. Claude Code reads CLAUDE.md and not AGENTS.md, which is why no selector here names that filename.',
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
 * The `claude.repo.command` matcher, authored in the typed segment form the
 * contract table shows: `['.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]`.
 *
 * One recursive step and deliberately not two. The trailing `ANY_DIRECTORIES`
 * reaches every depth *inside* the commands directory, because the changelog
 * restored the subdirectory-derived namespace in a command name and shows
 * `.claude/commands/frontend/component.md` invoked as `/frontend:component`.
 * There is no leading one, because a leading recursive step needs a documented
 * worked-file or descendant anchor and the pages supply none for this
 * directory: the skills page says command files work the way skills do but
 * writes its ancestor-walk and lazy-descendant sentences about
 * `.claude/skills/` alone. So the project command scope contributes at the
 * selected root — the one runtime-chain member every session shares — and a
 * `packages/api/.claude/commands/deploy.md` is a near miss rather than a
 * candidate (contracts/vendors/claude-code.md § Repository Inspector
 * matchers).
 */
const CLAUDE_REPO_COMMAND_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'commands' },
      ANY_DIRECTORIES,
      { kind: 'regex', pattern: /\.md$/u },
    ],
  ],
};

/**
 * Claude Repository commands: the read-authorizing counterpart of
 * `claude.behavior.repo.commands`. A command file is Markdown a reader invokes
 * by name, and it carries a skill's frontmatter keys — `name` and `paths`
 * excepted, which Claude Code ignores in one — so admitting it authorizes
 * reading its bytes and nothing else.
 *
 * Admitting a file is not asserting Claude runs it, and nothing here resolves
 * its invocation name: the name a reader would type is derived from the path
 * — the file name without its extension, prefixed by the subdirectories
 * between it and the commands directory — which the compiled unit answers
 * rather than this record (`rules/claude.ts` § invocationNameOf). The
 * inventory row is keyed by that name and the detail and comparison surfaces
 * state it, because it is what a reader looks a command up by; what none of
 * them states is that typing it would reach this file, which turns on a
 * same-name skill outranking it and on which layers a session loads, neither
 * of which this tool observes (FR-009).
 *
 * The standalone `.claude/prompts` directory gets no selector, and that is
 * FR-034 rather than an omission: no official page documents Claude Code
 * reading such a directory, so recognizing it would report a customization
 * type the vendor does not have.
 *
 * The User scope the same statement pairs with — `<claude-config-dir>/commands/`
 * — is a different Source boundary this rule may not read.
 *
 * `partially-documented`, from the behavior statement it rests on: the
 * skill-equivalent ancestor and lazy-descendant traversal is not stated
 * independently for this directory.
 */
export const CLAUDE_REPO_COMMAND_RULE = {
  ruleId: 'claude.repo.command',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'prompt/command',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_COMMAND_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'FR-034', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.skills.locations-discovery',
          url: 'https://code.claude.com/docs/en/skills',
          officialHost: 'code.claude.com',
          sections: [
            'Where skills live',
            'Discovery from parent and nested directories',
            'How a skill gets its command name',
          ],
          reviewedOn: '2026-08-22',
          establishes:
            'Existing .claude/commands/ files keep working and create the same commands skills do, a command file carries the same frontmatter as a skill except name and paths, and it is invoked by its file name without the extension — the exact shape this rule admits. The page states no ancestor or lazy-descendant reach for the command directory, which is why this rule is anchored at the selected root. It documents no .claude/prompts directory at all.',
        },
        {
          sourceId: 'anthropic.claude-code.changelog.legacy-command-nesting',
          url: 'https://code.claude.com/docs/en/changelog',
          officialHost: 'code.claude.com',
          sections: ['1.0.45'],
          reviewedOn: '2026-08-22',
          establishes:
            'Release 1.0.45 restored namespacing in command names based on subdirectories, so a command file lives at any depth inside the commands directory — the recursion this rule admits with its one trailing recursive step.',
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
 * program, and what justifies it is the documented descendant discovery
 * alone: Claude loads nested `.claude/skills` directories on demand when it
 * reads or edits a file in their subtree, so a
 * `packages/api/.claude/skills` directory is a location the vendor documents
 * at that depth. The ancestor startup walk justifies nothing below the root —
 * its one member every session shares is the selected root, which the
 * zero-segment case of `ANY_DIRECTORIES` already covers. Admission never
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
          sections: ['Where skills live', 'Discovery from parent and nested directories'],
          reviewedOn: '2026-08-22',
          establishes:
            'Repository skills live at .claude/skills/<skill-name>/SKILL.md, and skills also load from nested .claude/skills directories on demand when Claude reads or edits a file in their subtree — the documented descendant reach that is why this rule admits that shape at every depth, while the ancestor startup walk that also loads every parent directory up to the repository root contributes only the selected root, the one layer every session shares.',
        },
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Skills-directory plugins'],
          reviewedOn: '2026-08-25',
          establishes:
            'A skills directory at the exact launch working directory can also be interpreted as a plugin, a separate documented behavior that differs from plain-skill ancestor and lazy-descendant discovery and grants this rule no manifest authority.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.mcp` matcher, authored in the typed segment form the
 * contract table shows: the one exact program `['.mcp.json']`. Root-exact and
 * deliberately not recursive: the vendor documents exactly one project MCP
 * file at the project root, so a `packages/api/.mcp.json` is a path Claude
 * does not read and this rule must not admit
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
const CLAUDE_REPO_MCP_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [[{ kind: 'literal', value: '.mcp.json' }]],
};

/**
 * Claude Repository MCP declarations: the read-authorizing counterpart of
 * `claude.behavior.repo.mcp`. Admitting the carrier is not asserting Claude
 * connects anything — whether a declared server is selected stays conditional
 * on the source root being Claude's project root and on trust and approval,
 * runtime inputs this tool never observes — and no declared command, URL, or
 * path gains read or connection authority from the admission.
 *
 * The User and local MCP state at `<home>/.claude.json`, plugin-provided
 * declarations, and managed configuration are different Source boundaries no
 * Repository rule may read; their statements exist as non-authorizing
 * behavior records, and the exclusions that name them ship with the Global
 * phase that owns them (FR-016, FR-018). Only explicit MCP configuration
 * joins the MCP surfaces: a file of another
 * kind that spells MCP-looking configuration — a skill, an agent, a
 * settings file — is that kind's ordinary content, shown in its own detail,
 * and creates no filesystem matcher here.
 */
export const CLAUDE_REPO_MCP_RULE = {
  ruleId: 'claude.repo.mcp',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'MCP',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_MCP_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.mcp.scopes-precedence',
          url: 'https://code.claude.com/docs/en/mcp',
          officialHost: 'code.claude.com',
          sections: ['MCP installation scopes'],
          reviewedOn: '2026-08-20',
          establishes:
            'The project MCP scope is one .mcp.json file at the project root, which is why this rule admits exactly that path at the selected root and nothing below it.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.rules` matcher, authored in the typed segment form the
 * contract table shows: `[ANY_DIRECTORIES, '.claude', 'rules',
 * ANY_DIRECTORIES, /\.md$/u]`.
 *
 * Two recursive steps, and each one is a different documented fact. The
 * leading one reaches every `.claude/rules/` in the tree, because a nested
 * one below the working directory is documented to load on demand — a
 * descendant inventory, not a guess at which directory a session launches
 * from. The trailing one reaches every depth *inside* one rules directory,
 * because the page states that all `.md` files there are discovered
 * recursively and shows `frontend/` and `backend/` subdirectories doing it.
 *
 * `ANY_DIRECTORIES` includes zero segments, so the root's own
 * `.claude/rules/style.md` is reached by the same program as
 * `packages/api/.claude/rules/http/headers.md`, and no second selector is
 * needed for either (contracts/vendors/claude-code.md § Repository Inspector
 * matchers).
 */
const CLAUDE_REPO_RULES_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      ANY_DIRECTORIES,
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'rules' },
      ANY_DIRECTORIES,
      { kind: 'regex', pattern: /\.md$/u },
    ],
  ],
};

/**
 * Claude Repository rules: the read-authorizing counterpart of
 * `claude.behavior.repo.rules`. A rule file is Markdown whose frontmatter may
 * declare `paths` globs scoping it to the files Claude works with; admitting
 * one authorizes reading its bytes and nothing else. Nothing is read out of
 * the file at all — the detail serves the one document its author wrote,
 * frontmatter block included — so a `paths` value is text on that page like
 * every other line, never a value this product republishes and never a
 * selector this scan runs (FR-019).
 *
 * Admitting a file is not asserting Claude loads it: whether a path-scoped
 * rule applies turns on the files a session reads, whether a nested rules
 * directory loads turns on an on-demand trigger the page leaves open, and
 * project rules are skipped entirely when `project` is excluded from the
 * runtime's setting sources — none of which this tool observes (FR-009).
 *
 * `partially-documented` for the two gaps the behavior statement carries: the
 * on-demand load trigger for a nested rules directory, and the base an
 * ancestor layer's `paths` globs resolve against
 * (contracts/vendors/claude-code.md § Documentation status and lifecycle
 * index).
 *
 * The User scope the same page documents — `<claude-config-dir>/rules/` — is a
 * different Source boundary this rule may not read.
 *
 * Copilot reaches these files through no rule of its own: the locations
 * Copilot documents under `.claude` are the ones
 * `copilot.excluded.additional-standard-locations` leaves out of this release.
 * One filename is the exception, and it is not this selector's doing:
 * `copilot.repo.instructions.agents` admits an `AGENTS.md` at every depth, so
 * an `AGENTS.md` written inside a `.claude/rules/` directory is a Copilot
 * instruction file exactly as it would be in any other directory, and the same
 * file is a Claude rule by where it sits. Two products documenting a read of
 * one path is two recognitions of it — what each inventory row states — rather
 * than a collision this rule should resolve away (FR-004).
 */
export const CLAUDE_REPO_RULES_RULE = {
  ruleId: 'claude.repo.rules',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'rule',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_RULES_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.memory.locations-load',
          url: 'https://code.claude.com/docs/en/memory',
          officialHost: 'code.claude.com',
          sections: ['Organize rules with .claude/rules/'],
          reviewedOn: '2026-08-18',
          establishes:
            "Project rules are the .md files of a project's .claude/rules/ directory, all discovered recursively so they may be organized into subdirectories, and a nested .claude/rules/ directory loads on demand — the exact locations this rule admits. The personal rules the same section places in ~/.claude/rules/ are a different Source boundary this rule may not read.",
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.output-style` matcher, authored in the typed segment form
 * the contract table shows: `['.claude', 'output-styles', /\.md$/u]`
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 *
 * Root-anchored and with no `ANY_DIRECTORIES` between the directory and the
 * file: the page names the direct Markdown children of an
 * `.claude/output-styles/` directory and documents no descent into one, so a
 * `.claude/output-styles/team/reviewer.md` is a near miss rather than a style.
 *
 * The layer chain the page does document — every `.claude/output-styles/`
 * between the working directory and the repository root — is the vendor's
 * walk from a session working directory this product never observes, so the
 * rule admits the selected root's own directory and nothing else: a nested
 * one belongs to a root the reader did not select (FR-001, FR-009).
 */
const CLAUDE_REPO_OUTPUT_STYLE_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'output-styles' },
      { kind: 'regex', pattern: /\.md$/u },
    ],
  ],
};

/**
 * Claude Repository output styles: the read-authorizing counterpart of
 * `claude.behavior.repo.output-style`. Admitting a style is not asserting
 * Claude applies it — which style a session uses turns on the `outputStyle`
 * setting, session state, and plugin overrides this product never observes —
 * and the instructions inside are read as text and never as a prompt
 * (FR-009).
 */
export const CLAUDE_REPO_OUTPUT_STYLE_RULE = {
  ruleId: 'claude.repo.output-style',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'output style',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_OUTPUT_STYLE_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.output-styles.locations',
          url: 'https://code.claude.com/docs/en/output-styles',
          officialHost: 'code.claude.com',
          sections: ['Create a custom output style'],
          reviewedOn: '2026-08-23',
          establishes:
            'A project output style is a Markdown file saved directly in .claude/output-styles, whose file name is the style name unless the frontmatter sets name — the exact location and identity this rule admits. The User-level ~/.claude/output-styles named beside it is a different Source boundary this rule may not read.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.permissions` matcher, authored in the typed segment form
 * the contract table shows: `['.claude', 'settings.json']` and
 * `['.claude', 'settings.local.json']`. Two programs rather than one dynamic
 * step, so each admission carries which authored filename matched.
 *
 * Root-anchored with no `ANY_DIRECTORIES`: the page names these two files as
 * the project scope's own, and a `.claude/settings.json` in a subdirectory is
 * a file the vendor documents no read of.
 */
const CLAUDE_REPO_PERMISSIONS_MATCHER: StructuredInspectorMatcher = {
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
};

/**
 * Claude Repository permission policy: the `permissions` object the project's
 * settings files declare, recognized as the `permissions` kind.
 *
 * The kind is the policy, not the file: the row a reader sees is the declared
 * policy, and the detail publishes that block and never the bytes around it,
 * which are the settings file's other keys (data-model.md § Inventory unit,
 * contracts/http-api.md § get-permission-policy-detail). A settings file that
 * declares no `permissions` object holds no recognition of this kind at all —
 * the extraction is what decides it — so it is no row rather than an empty
 * one.
 *
 * Admitting a file is not asserting Claude enforces what it declares: the
 * decision is combined with the User scope and the managed locations this
 * product never reads, under trust and approval state that turns on runtime
 * this tool does not observe (FR-009). No rule string is resolved to a tool, a
 * command, a path, or a domain, and nothing is evaluated against a filesystem
 * (FR-019).
 *
 * `partially-documented`, from the behavior statement it rests on: which
 * directory the personal file is read from turns on the session's repository
 * and host, which this tool cannot see.
 *
 * The document the policy block sits in is {@link CLAUDE_REPO_SETTINGS_RULE}'s
 * recognition of the same file: two rules over one candidate and one read, so
 * neither has to know the other's shape, and which detail a reader gets
 * follows from the row they arrived through (FR-007).
 */
export const CLAUDE_REPO_PERMISSIONS_RULE = {
  ruleId: 'claude.repo.permissions',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'permissions',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_PERMISSIONS_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-007', 'FR-019', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: [
            'Settings files and who they affect',
            'Compare the scope of each settings file',
          ],
          reviewedOn: '2026-08-22',
          establishes:
            "A project's .claude/settings.json and .claude/settings.local.json — the exact locations this rule admits — are the project scope's own settings files.",
        },
        {
          sourceId: 'anthropic.claude-code.permissions.rule-syntax',
          url: 'https://code.claude.com/docs/en/permissions',
          officialHost: 'code.claude.com',
          sections: ['Permission rule syntax', 'Wildcard patterns'],
          reviewedOn: '2026-08-22',
          establishes:
            'A permissions object in a settings file holds allow and deny arrays of rules written Tool or Tool(specifier), where a specifier may carry glob wildcards; the rules are the policy this kind recognizes.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * Claude Repository settings: the same two root settings files
 * {@link CLAUDE_REPO_PERMISSIONS_RULE} admits, recognized here as the
 * documents they are. The shared `settings.json` and the personal
 * `settings.local.json` are both this kind's rows, because the row unit is the
 * file (data-model.md § Inventory unit) and each is a settings file in its own
 * right rather than two spellings of one.
 *
 * The matcher is shared with the permissions rule rather than restated,
 * because it is the same pair of locations and a second spelling of it could
 * drift. Two rules over one path add no read: the walk merges them into one
 * candidate with both provenances, exactly as any two plans admitting one file
 * do.
 *
 * This recognition reads nothing out of the document: its detail is the JSON
 * its author wrote, comments and key order intact. The `permissions` object
 * inside it belongs to the other recognition's row and is visible here only as
 * part of the one document (FR-007).
 *
 * Admitting a file is not asserting Claude applied it: the value a session
 * uses is combined with the User scope and the managed locations this product
 * never reads, under precedence and trust state that turns on runtime this
 * tool does not observe (FR-009). No path, command, or hook the document names
 * gains read authority.
 *
 * `partially-documented`, from the behavior statements it rests on, for the
 * reason the permissions rule carries the same status: which directory the
 * personal file is read from turns on the session's repository and host.
 */
export const CLAUDE_REPO_SETTINGS_RULE = {
  ruleId: 'claude.repo.settings',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'settings/config',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_PERMISSIONS_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.settings.scopes-precedence',
          url: 'https://code.claude.com/docs/en/settings',
          officialHost: 'code.claude.com',
          sections: [
            'Settings files and who they affect',
            'Compare the scope of each settings file',
          ],
          reviewedOn: '2026-08-22',
          establishes:
            "A project's .claude/settings.json and .claude/settings.local.json — the exact locations this rule admits — are the project scope's own settings files, the first shared with the team and the second personal to one checkout.",
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.agent` matcher, authored in the typed segment form the
 * contract table shows: `['.claude', 'agents', ANY_DIRECTORIES, /\.md$/u]`.
 *
 * One recursive step and deliberately not two, the same shape the command
 * matcher takes and for the same reason. The trailing `ANY_DIRECTORIES`
 * reaches every depth *inside* the agents directory, because the page states
 * that `.claude/agents/` is scanned recursively so definitions can be
 * organized into subfolders — and adds that the subdirectory path does not
 * affect how a subagent is identified, since identity comes only from the
 * `name` frontmatter field. There is no leading one, because a leading
 * recursive step needs a documented worked-file or descendant anchor and this
 * page supplies none: it documents an upward walk from the working directory
 * to the repository root, whose one member every session shares is the
 * selected root (FR-001). So a `packages/api/.claude/agents/reviewer.md` is a
 * near miss rather than a candidate, and the `--add-dir` directories the same
 * paragraph names are a runtime fact this product never turns into a scan root
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
const CLAUDE_REPO_AGENT_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'agents' },
      ANY_DIRECTORIES,
      { kind: 'regex', pattern: /\.md$/u },
    ],
  ],
};

/**
 * Claude Repository subagents: the read-authorizing counterpart of
 * `claude.behavior.repo.agents`. A subagent file is Markdown whose frontmatter
 * configures the agent and whose body is the system prompt it runs with, so
 * admitting it authorizes reading its bytes and nothing else. This product
 * spawns no subagent, preloads no skill, and opens no path the frontmatter
 * names.
 *
 * The sibling `agent-memory` and `agent-memory-local` directories get no
 * selector, and that is what keeps them out: they hold what a running subagent
 * wrote across earlier conversations, which is runtime state rather than an
 * authored customization, and admitting one would publish a session's
 * accumulated notes as if the reader had written them.
 *
 * A declared `mcpServers` block is this file's own frontmatter and joins no
 * MCP row: an MCP declaration's home is an explicit carrier, and a file of
 * another kind spelling MCP-looking configuration is that kind's ordinary
 * content (data-model.md § Inventory unit). A declared `hooks` block is the
 * separate contained recognition's, which arrives with the Hook phase.
 *
 * Admitting a file is not asserting Claude loads the agent: a managed or
 * session-scope definition of the same name outranks it, the User and plugin
 * scopes the same page documents lie outside this Source, and a file the
 * vendor skips — one declaring no `name`, or a `name` it rejects — is admitted
 * and published all the same, because whether a runtime selects a file is
 * conditional on inputs this tool never observes (FR-009).
 *
 * `partially-documented`, from the behavior statement it rests on: duplicate
 * names inside one directory tree load by filesystem read order rather than a
 * documented precedence (contracts/vendors/claude-code.md § Canonical
 * evidence-assessment index).
 */
export const CLAUDE_REPO_AGENT_RULE = {
  ruleId: 'claude.repo.agent',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'agent',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_AGENT_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.subagents.scope-context',
          url: 'https://code.claude.com/docs/en/sub-agents',
          officialHost: 'code.claude.com',
          sections: ['Choose the subagent scope'],
          reviewedOn: '2026-08-20',
          establishes:
            'Project subagents live under .claude/agents/ and that directory is scanned recursively, so a definition may sit in a subfolder — the exact subtree this rule admits — while the User scope at ~/.claude/agents/ the same section documents is a different Source boundary the rule may not read, and the directories added with --add-dir are a runtime input rather than a location.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.skills-directory-plugin` matcher: the manifest that makes a
 * skills-directory folder a plugin.
 *
 * Anchored at the selected root's own `.claude/skills/`, with no leading
 * `ANY_DIRECTORIES` — the difference from the plain-skill program beside it,
 * and what the cited page justifies: a project-scope skills-directory plugin
 * loads from the launch working directory's own skills directory and is
 * documented as not walking ancestors, where a plain skill is discovered in
 * nested directories on demand. Admission never claims the session loaded it:
 * the workspace trust dialog stays a runtime condition
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
const CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.claude' },
      { kind: 'literal', value: 'skills' },
      ANY_NAME,
      { kind: 'literal', value: '.claude-plugin' },
      { kind: 'literal', value: 'plugin.json' },
    ],
  ],
};

/**
 * Claude skills-directory plugins: the read-authorizing counterpart of
 * `claude.behavior.repo.skills-directory-plugin`.
 *
 * Recognized as `plugin`, and its carrier is the manifest itself rather than a
 * catalog entry: nothing else declares this plugin, so the file's presence in
 * the folder is the declaration (data-model.md § Inventory unit). The folder
 * holding `.claude-plugin/` is the plugin root, and the files below it are the
 * plugin's own — enumerated as a directory-shaped customization's rather than
 * admitted, so a bundled skill, hook file, or asset gets no rule and no row of
 * its own (contracts/inspection-path-allowlist.md § Bounded companion census).
 */
export const CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_RULE = {
  ruleId: 'claude.repo.skills-directory-plugin',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'plugin',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['Skills-directory plugins', 'File locations reference'],
          reviewedOn: '2026-08-25',
          establishes:
            'A folder under a skills directory that contains .claude-plugin/plugin.json — the exact path this rule admits — is loaded as a plugin named <folder>@skills-dir with no marketplace and no install step, discovered in place; the manifest is the plugin metadata and the components it bundles sit at default locations under that same folder.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The `claude.repo.marketplace` matcher: the catalog a repository publishes at
 * its own root, which is also the marketplace root its `./` entries resolve
 * against.
 */
const CLAUDE_REPO_MARKETPLACE_MATCHER: StructuredInspectorMatcher = {
  base: { kind: 'repository' },
  selectors: [
    [
      { kind: 'literal', value: '.claude-plugin' },
      { kind: 'literal', value: 'marketplace.json' },
    ],
  ],
};

/**
 * Claude Repository plugin catalogs: the read-authorizing counterpart of
 * `claude.behavior.repo.marketplace`.
 *
 * Recognized as `plugin` rather than as a kind of its own, for the reason the
 * Codex catalog is: a catalog is the table that resolves a plugin name to the
 * source that plugin comes from, so the names its `plugins[]` entries declare
 * are the inventory's rows and this file is a carrier of them
 * (data-model.md § Inventory unit).
 *
 * Admitting it claims no registration. `/plugin marketplace add` and
 * `extraKnownMarketplaces` are what make a session consider a catalog, and both
 * are runtime inputs this product never reads; what the row states is what the
 * catalog offers (FR-009).
 */
export const CLAUDE_REPO_MARKETPLACE_RULE = {
  ruleId: 'claude.repo.marketplace',
  tool: 'claude',
  discoveryClass: 'static-candidate',
  kind: 'plugin',
  sourceKinds: ['repository'],
  matcher: CLAUDE_REPO_MARKETPLACE_MATCHER,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-003', 'FR-004', 'FR-005', 'FR-024', 'QR-001', 'QR-004', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.marketplaces.catalog-sources',
          url: 'https://code.claude.com/docs/en/plugin-marketplaces',
          officialHost: 'code.claude.com',
          sections: ['Create the marketplace file', 'Plugin sources'],
          reviewedOn: '2026-08-25',
          establishes:
            'A repository defines its marketplace in .claude-plugin/marketplace.json in its root — the exact location this rule admits — listing a name, owner information, and plugin entries that each carry a name and the source the plugin is fetched from, where a ./ source names a plugin in the same repository resolved against the marketplace root, and a bare name does the same under a declared metadata.pluginRoot.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * `claude.excluded.plugin-files`: the plugin content a manifest or a catalog
 * entry points at — bundled skills, commands, agents, output styles, hook
 * files, MCP configuration, scripts, and assets.
 *
 * A record rather than silence, because these are files a reader can point at
 * and the vendor documents a plugin shipping them. The exclusion states that
 * the omission is this product's scope rather than the vendor's silence: a
 * component reaches a candidate only through a value another file wrote, and
 * following one would read a file on the strength of a declaration rather than
 * of a documented location (FR-004, FR-024).
 *
 * What it excludes is candidacy, not reading, exactly as its Codex counterpart
 * does: a plugin root is a directory-shaped customization, so the files inside
 * it are read and published as the plugin's own, and the difference is that a
 * file is read because it sits in the plugin's directory and never because a
 * declaration named it (contracts/inspection-path-allowlist.md § Bounded
 * companion census).
 *
 * `kind` is null: an excluded rule recognizes nothing, so it names no
 * recognized kind even though the files it lists are skills, commands, and MCP
 * carriers in their own right.
 */
export const CLAUDE_EXCLUDED_PLUGIN_FILES_RULE = {
  ruleId: 'claude.excluded.plugin-files',
  tool: 'claude',
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
          sourceId: 'anthropic.claude-code.plugins.components-scopes',
          url: 'https://code.claude.com/docs/en/plugins-reference',
          officialHost: 'code.claude.com',
          sections: ['File locations reference', 'Plugin manifest schema'],
          reviewedOn: '2026-08-25',
          establishes:
            "A plugin's components sit at default locations under its root — skills/, commands/, agents/, workflows/, output-styles/, hooks/hooks.json, .mcp.json, .lsp.json, bin/, settings.json — and the manifest's component path fields may redirect any of them, so every component this rule excludes is reached through a declaration or a default rather than through a documented Repository location of its own.",
        },
      ]
    : [],
} as const satisfies InspectionRule;

/** Claude's contribution to the inspection-rule registry, keyed by `ruleId` in identifier order. */
export const CLAUDE_INSPECTION_RULES: Readonly<Record<ClaudeRuleId, InspectionRule>> = {
  [CLAUDE_REPO_AGENT_RULE.ruleId]: CLAUDE_REPO_AGENT_RULE,
  [CLAUDE_REPO_COMMAND_RULE.ruleId]: CLAUDE_REPO_COMMAND_RULE,
  [CLAUDE_REPO_INSTRUCTIONS_RULE.ruleId]: CLAUDE_REPO_INSTRUCTIONS_RULE,
  [CLAUDE_REPO_MARKETPLACE_RULE.ruleId]: CLAUDE_REPO_MARKETPLACE_RULE,
  [CLAUDE_REPO_MCP_RULE.ruleId]: CLAUDE_REPO_MCP_RULE,
  [CLAUDE_REPO_OUTPUT_STYLE_RULE.ruleId]: CLAUDE_REPO_OUTPUT_STYLE_RULE,
  [CLAUDE_REPO_PERMISSIONS_RULE.ruleId]: CLAUDE_REPO_PERMISSIONS_RULE,
  [CLAUDE_REPO_RULES_RULE.ruleId]: CLAUDE_REPO_RULES_RULE,
  [CLAUDE_REPO_SETTINGS_RULE.ruleId]: CLAUDE_REPO_SETTINGS_RULE,
  [CLAUDE_REPO_SKILL_RULE.ruleId]: CLAUDE_REPO_SKILL_RULE,
  [CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_RULE.ruleId]: CLAUDE_REPO_SKILLS_DIRECTORY_PLUGIN_RULE,
  [CLAUDE_EXCLUDED_PLUGIN_FILES_RULE.ruleId]: CLAUDE_EXCLUDED_PLUGIN_FILES_RULE,
};
