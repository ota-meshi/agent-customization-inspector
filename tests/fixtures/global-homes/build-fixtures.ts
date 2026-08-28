// T930: deterministic User-Global home fixtures for the consent and Global
// inspection suites (FR-013 through FR-018, FR-023, FR-028).
//
// A Global home is not a repository. Its root is the product's own
// configuration directory, and consent authorizes exactly the instruction
// files the allowlist names below it — never the settings, credentials,
// sessions, caches, or state that sit beside them
// (contracts/inspection-path-allowlist.md § Global). So every home here holds
// both halves: the small set of admitted candidates, and the neighbouring
// files a scan must leave untouched. A suite that finds a neighbour opened has
// found a defect, not a stale fixture.
//
// Three environment properties name the three roots — `COPILOT_HOME`,
// `CLAUDE_CONFIG_DIR`, `CODEX_HOME` — so a fixture is used by pointing those
// at built homes rather than by passing a path to the product. The consent
// preview reads those properties and nothing else, which is why
// {@link LEXICAL_ROOT_CASES} is a fixture too: the states the preview
// distinguishes are properties of the captured string, and most of them name
// no directory at all.
//
// Nothing here is content the product then re-reads as truth. The literal
// credentials and environment references exist precisely so a suite can prove
// they reach a reader unmasked and unresolved (FR-025, FR-026), and the
// executable-looking payloads exist to prove nothing is ever run: this product
// reads bytes and shows them.
//
// `README.md` and `README.ja.md` beside this module are the guidance for using
// and extending these homes. They are where a reader starts; this file is
// where the bytes are.
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** The three tools a Global preview always names, in the contracted order. */
export const GLOBAL_TOOL_ORDER = ['copilot', 'claude', 'codex'] as const;

/**
 * The four consented members, in the contracted preview order: the three tool
 * homes, then the shared agent home `~/.agents` that Codex and Copilot both
 * read (FR-045). The shared home has no environment property — a launch
 * points `homedir()` at {@link GlobalHomeFixture.home} instead.
 */
export const GLOBAL_MEMBER_ORDER = ['copilot', 'claude', 'codex', 'agents'] as const;

/** One consented member; see {@link GLOBAL_MEMBER_ORDER}. */
export type GlobalMember = (typeof GLOBAL_MEMBER_ORDER)[number];

/** One member of {@link GLOBAL_TOOL_ORDER}. */
export type GlobalTool = (typeof GLOBAL_TOOL_ORDER)[number];

/**
 * The environment property that overrides each tool's home, in the exact order
 * the capture reads them (data-model.md § GlobalRootInputCapture).
 */
export const GLOBAL_HOME_VARIABLES: Readonly<Record<GlobalTool, string>> = {
  /** Copilot's home override. */
  copilot: 'COPILOT_HOME',
  /** Claude's configuration-directory override. */
  claude: 'CLAUDE_CONFIG_DIR',
  /** Codex's home override. */
  codex: 'CODEX_HOME',
};

/** The directory each tool's documented default home is named by. */
export const GLOBAL_HOME_DEFAULT_SUFFIX: Readonly<Record<GlobalTool, string>> = {
  /** `~/.copilot`. */
  copilot: '.copilot',
  /** `~/.claude`. */
  claude: '.claude',
  /** `~/.codex`. */
  codex: '.codex',
};

/**
 * What the current platform could actually materialize in a home. The
 * unreadable-root case is not here: it is one home of its own, and
 * {@link buildUnreadableGlobalHome} reports whether the mode took effect on
 * the home it built.
 */
export interface GlobalHomeCapabilities {
  /** Symbolic-link cases (a linked instruction file and a broken link) exist. */
  readonly symlinks: boolean;
}

/** One built set of three Global homes. */
export interface GlobalHomeFixture {
  /** The absolute directory holding all four homes; remove this to clean up. */
  readonly base: string;
  /**
   * What a launch exports as `HOME` so `node:os.homedir()` lands on this
   * fixture: the shared agent home is always derived from it as `.agents`, and
   * the separate `.claude.json` state file sits at it (FR-045). Equal to
   * {@link base}; named separately because that is what the value is *for*.
   */
  readonly home: string;
  /** Each member's absolute home root. */
  readonly homes: Readonly<Record<GlobalMember, string>>;
  /**
   * The environment values a suite exports to point the capture at these
   * homes, keyed by the property name the capture reads — the three tool
   * overrides, plus `HOME`, which is what `node:os.homedir()` answers from on
   * POSIX. The shared agent home has no override of its own: pinning `HOME` is
   * what keeps its always-derived root inside the fixture instead of at the
   * developer's real `~/.agents` (FR-045).
   */
  readonly environment: Readonly<Record<string, string>>;
  /** Which capability-gated cases exist; see {@link GlobalHomeCapabilities}. */
  readonly capabilities: GlobalHomeCapabilities;
  /**
   * Every home-relative path the Global allowlist must admit for that tool,
   * sorted. Capability-gated members are present only when the corresponding
   * capability is.
   */
  readonly expectedCandidatePaths: Readonly<Record<GlobalMember, readonly string[]>>;
  /**
   * Paths in the same home that no shipped rule may admit, sorted. Every
   * admitted candidate has one a segment away, and the settings, credential,
   * session, and cache neighbours are here too: FR-018 excludes them however
   * ordinary their filenames look.
   */
  readonly nearMissPaths: Readonly<Record<GlobalMember, readonly string[]>>;
}

/**
 * The literal credential-shaped value each home declares, distinct per tool so
 * a suite can tell which home a leak came from. No value is a real credential;
 * what matters is that the product neither masks nor summarizes it (FR-025).
 */
export const GLOBAL_HOME_SECRETS: Readonly<Record<GlobalTool, string>> = {
  /** Copilot's home credential literal. */
  copilot: 'ghp_GLOBALCOPILOT0000000000000000000000000',
  /** Claude's home credential literal. */
  claude: 'sk-ant-globalclaude000000000000000000000000',
  /** Codex's home credential literal. */
  codex: 'sk-proj-globalcodex00000000000000000000000000',
};

/**
 * The environment reference each home's instruction text spells literally. A
 * detail must show these six characters and never the process value, which is
 * what {@link GLOBAL_HOME_SENTINELS} exists to prove (FR-026).
 */
export const GLOBAL_HOME_ENVIRONMENT_REFERENCES: Readonly<Record<GlobalTool, string>> = {
  /** Referenced in Copilot's instruction text. */
  copilot: '${GLOBAL_COPILOT_ENDPOINT}',
  /** Referenced in Claude's instruction text. */
  claude: '${GLOBAL_CLAUDE_ENDPOINT}',
  /** Referenced in Codex's instruction text. */
  codex: '${GLOBAL_CODEX_ENDPOINT}',
};

/**
 * The value a suite exports for each reference above. A page showing one of
 * these has resolved a reference it was required to show as characters.
 */
export const GLOBAL_HOME_SENTINELS: Readonly<Record<GlobalTool, string>> = {
  /** Sentinel for `GLOBAL_COPILOT_ENDPOINT`. */
  copilot: 'resolved-global-copilot-sentinel',
  /** Sentinel for `GLOBAL_CLAUDE_ENDPOINT`. */
  claude: 'resolved-global-claude-sentinel',
  /** Sentinel for `GLOBAL_CODEX_ENDPOINT`. */
  codex: 'resolved-global-codex-sentinel',
};

/**
 * A shell script each home carries beside its instructions. It is inert here
 * because nothing in this product executes what it reads — the fixture's job
 * is to make that observable rather than assumed (FR-020).
 */
const INERT_EXECUTABLE_PAYLOAD = [
  '#!/bin/sh',
  '# Never executed by this product; it is read as text or not at all.',
  'echo "global fixture hook ran" >&2',
  'exit 3',
  '',
].join('\n');

// Writes one fixture file, creating parents. Every write happens here, before
// the product runs.
function write(root: string, relative: string, content: string): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

// Writes one fixture file from raw bytes, for cases a text encoding cannot
// express: a NUL byte is what the read boundary classifies as binary, and a
// lone 0xFF is what makes a decode produce a replacement character.
function writeBytes(root: string, relative: string, content: Uint8Array): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

// Materializes the link-side cases as one transaction, exactly as the
// repository fixtures do: either every link exists and the caller may describe
// them, or none does and the caller describes none. `prepare` writes the
// ordinary targets, whose failures always propagate; `link` holds only the
// `symlinkSync` calls, where EPERM (Windows without developer mode), EACCES,
// and ENOSYS report the platform's incapacity rather than a broken harness.
function tryMaterializeSymlinks(
  root: string,
  prepare: () => void,
  link: () => void,
  linkSidePaths: readonly string[],
): boolean {
  prepare();
  try {
    link();
    return true;
  } catch (cause) {
    for (const relative of linkSidePaths) {
      rmSync(join(root, relative), { recursive: true, force: true });
    }
    const code = (cause as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS') {
      return false;
    }
    throw cause;
  }
}

/**
 * Builds one realistic set of three Global homes under `base`, or under a
 * fresh OS temp directory when none is given. Deterministic: the same base
 * yields the same bytes, so a suite may assert an exact path list without a
 * golden file.
 *
 * Each home holds what a reader's own home holds — the instruction files the
 * consent flow admits, and the configuration and state it never does. The
 * Codex home additionally carries both ordered instruction targets, because
 * its rule selects the first non-empty of the two and a home with only one of
 * them could not show a fallback happening.
 */
export function buildGlobalHomeFixture(
  prefix = 'aci-global-homes',
  base?: string,
): GlobalHomeFixture {
  const root = base ?? mkdtempSync(join(tmpdir(), `${prefix}-`));
  const homes = {
    copilot: join(root, GLOBAL_HOME_DEFAULT_SUFFIX.copilot),
    claude: join(root, GLOBAL_HOME_DEFAULT_SUFFIX.claude),
    codex: join(root, GLOBAL_HOME_DEFAULT_SUFFIX.codex),
    // Always the derived `.agents` below the home a launch exports (FR-045).
    agents: join(root, '.agents'),
  } as const;
  for (const home of Object.values(homes)) {
    mkdirSync(home, { recursive: true });
  }

  // ---- Copilot: the root instruction file, the recursive `instructions/`
  // subtree, and the CLI state that sits beside both.
  write(
    homes.copilot,
    'copilot-instructions.md',
    [
      '# Personal Copilot instructions',
      '',
      'Prefer the repository conventions over these when the two disagree.',
      `Deployments post to ${GLOBAL_HOME_ENVIRONMENT_REFERENCES.copilot}.`,
      '',
    ].join('\n'),
  );
  write(
    homes.copilot,
    'instructions/typescript.instructions.md',
    [
      '---',
      "applyTo: '**/*.ts'",
      '---',
      '',
      'Write narrow types and no non-null assertions.',
      '',
    ].join('\n'),
  );
  write(
    homes.copilot,
    'instructions/reviews/security.instructions.md',
    [
      '---',
      "applyTo: '**'",
      '---',
      '',
      'Flag every credential-shaped literal in a diff.',
      `Escalation token: ${GLOBAL_HOME_SECRETS.copilot}`,
      '',
    ].join('\n'),
  );
  // Neighbours the consent copy promises are never read: the CLI's own
  // configuration and its session state.
  write(
    homes.copilot,
    'config.json',
    `${JSON.stringify({ theme: 'dark', token: GLOBAL_HOME_SECRETS.copilot }, null, 2)}\n`,
  );
  write(homes.copilot, 'sessions/last-session.json', '{"messages":[]}\n');
  write(homes.copilot, 'instructions/notes.md', '# not an instruction file suffix\n');
  write(homes.copilot, 'copilot-instructions.md.bak', '# a backup suffix admits nothing\n');
  write(homes.copilot, 'hooks/pre-commit.sh', INERT_EXECUTABLE_PAYLOAD);
  chmodSync(join(homes.copilot, 'hooks/pre-commit.sh'), 0o755);
  // The widened member surfaces (FR-015): a personal skill, a `.agent.md`
  // custom agent, a standalone hook file, the JSONC settings document with an
  // inline hook, and the user MCP carrier — each realistic, each with the
  // neighbour that proves its selector's edge.
  write(
    homes.copilot,
    'skills/changelog/SKILL.md',
    [
      '---',
      'name: changelog',
      'description: Draft a changelog entry from the staged diff.',
      '---',
      '',
      'Summarize the staged changes as one changelog entry.',
      '',
    ].join('\n'),
  );
  write(
    homes.copilot,
    'agents/security-auditor.agent.md',
    [
      '---',
      'name: security-auditor',
      'description: Audits changes for credential leaks.',
      'tools: ["read", "grep"]',
      '---',
      '',
      'Audit every diff for credential-shaped literals before approving.',
      '',
    ].join('\n'),
  );
  // A plain `.md` beside the profile: the documented filename ends
  // `.agent.md`, so this neighbour is admitted by nothing.
  write(homes.copilot, 'agents/README.md', '# how these agents are organized\n');
  write(
    homes.copilot,
    'hooks/format-on-save.json',
    `${JSON.stringify(
      {
        version: 1,
        description: 'Personal formatting hook.',
        hooks: {
          postToolUse: [{ type: 'command', command: 'npx prettier --write .' }],
        },
      },
      null,
      2,
    )}\n`,
  );
  // A second personal hook file declaring the same event: the `postToolUse`
  // row then holds two declarations inside one consented home, so the
  // personal-setup block of that row can offer a comparison pair of its own —
  // and the cross-source fixture's repository hook files declare the same
  // event, giving the row a pair on each side (T1127, FR-030).
  write(
    homes.copilot,
    'hooks/notify-team.json',
    `${JSON.stringify(
      {
        version: 1,
        description: 'Personal notification hook.',
        hooks: {
          postToolUse: [{ type: 'command', command: './scripts/notify-team.sh' }],
        },
      },
      null,
      2,
    )}\n`,
  );
  // JSONC on purpose: the vendor documents the settings file as JSON with
  // comments, and a detail shows the document its author wrote (FR-007).
  write(
    homes.copilot,
    'settings.json',
    [
      '{',
      '  // Personal defaults for every repository.',
      '  "banner": "never",',
      '  "theme": "dark",',
      '  "hooks": {',
      '    "sessionStart": [{ "type": "command", "command": "echo session" }]',
      '  }',
      '}',
      '',
    ].join('\n'),
  );
  write(
    homes.copilot,
    'mcp-config.json',
    `${JSON.stringify(
      {
        mcpServers: {
          tickets: { command: 'npx', args: ['-y', 'mcp-tickets'], tools: ['*'] },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The automatically managed state the vendor itself separates from the
  // user-editable files, so the exclusion is measured against a realistic
  // home (contracts/vendors/github-copilot.md § Inspector Global rule).
  write(homes.copilot, 'installed-plugins/marketplace-cache.json', '{"plugins":[]}\n');
  write(homes.copilot, 'mcp-secrets/index.json', '{"tickets":{"token":"stored"}}\n');
  write(homes.copilot, 'permissions-config.json', '{"allowed":{}}\n');
  write(homes.copilot, 'lsp-config.json', '{"servers":{}}\n');
  write(homes.copilot, 'extensions/uptime/extension.mjs', 'export default {};\n');

  // ---- The shared agent home (FR-045): the personal skills Codex and
  // Copilot both read, the personal plugin marketplace, and the installed
  // copy the catalog points at, which stays excluded.
  write(
    homes.agents,
    'skills/pathfinder/SKILL.md',
    [
      '---',
      'name: pathfinder',
      'description: Find the owning module for a symbol before editing it.',
      '---',
      '',
      'Locate the definition and its tests before proposing a change.',
      '',
    ].join('\n'),
  );
  // Beside the skill directories, matched by no selector: the skill program
  // admits `skills/<name>/SKILL.md` and nothing shallower.
  write(homes.agents, 'skills/README.md', '# personal skills live here\n');
  write(
    homes.agents,
    'plugins/marketplace.json',
    `${JSON.stringify(
      {
        name: 'personal',
        plugins: [
          {
            name: 'team-tools',
            source: { source: 'local', path: './team-tools' },
            category: 'Productivity',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The installed copy the catalog's local entry names: plugin bodies below a
  // consented member stay excluded exactly as Repository plugin bodies are.
  write(homes.agents, 'plugins/team-tools/plugin.json', '{"name":"team-tools"}\n');

  // ---- Claude: the widened member set (FR-016) — the instruction file, the
  // flat rules, a personal skill, a namespaced command, a flat and a nested
  // agent, the settings document carrying permissions and hooks, and an
  // output style — beside the state and generated data FR-018 excludes.
  write(
    homes.claude,
    'CLAUDE.md',
    [
      '# Personal instructions',
      '',
      'Answer in the language the question was asked in.',
      `The staging endpoint is ${GLOBAL_HOME_ENVIRONMENT_REFERENCES.claude}.`,
      '',
    ].join('\n'),
  );
  write(
    homes.claude,
    'settings.json',
    `${JSON.stringify(
      {
        permissions: { allow: ['Bash(git status)'], deny: ['Bash(rm -rf *)'] },
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo pre' }] }],
        },
        apiKeyHelper: `echo ${GLOBAL_HOME_SECRETS.claude}`,
      },
      null,
      2,
    )}\n`,
  );
  write(
    homes.claude,
    'skills/deploy/SKILL.md',
    '---\nname: deploy\ndescription: User skill.\n---\n',
  );
  // The same skill name — and the same path spelling — the Copilot home
  // writes above: one name row then spans two members at one Source-relative
  // Path, which is the cross-Source pair the comparison surfaces express by
  // naming each side's own Source (T1127, FR-030).
  write(
    homes.claude,
    'skills/changelog/SKILL.md',
    '---\nname: changelog\ndescription: Draft a changelog entry from recent commits.\n---\n\nSummarize the latest commits as one changelog entry.\n',
  );
  write(homes.claude, 'agents/reviewer.md', '---\nname: reviewer\n---\n\nReview carefully.\n');
  // A nested agent: the user agents selector is recursive, exactly as the
  // Repository one is.
  write(
    homes.claude,
    'agents/research/helper.md',
    '---\nname: research-helper\n---\n\nGather sources first.\n',
  );
  // The same agent name the Codex home declares in `agents/deploy-bot.toml`
  // below: the `deploy-bot` row then holds two personal declarations, so its
  // personal-setup block can offer a comparison pair — the agent half of the
  // cross-source groups the fixture publishes (T1127, FR-030).
  write(
    homes.claude,
    'agents/deploy-bot.md',
    '---\nname: deploy-bot\ndescription: Runs the deploy checklist.\n---\n\nWork through the deploy checklist before shipping.\n',
  );
  // The reserved download tree sits one level deeper than the skill program
  // reaches: a synced skill is a downloaded copy, not an authored one.
  write(
    homes.claude,
    'skills/synced/vendor-skill/SKILL.md',
    '---\nname: vendor-skill\ndescription: A downloaded copy.\n---\n',
  );
  // Nested rule files stay near misses: the user rule directory's documented
  // depth is its direct children.
  write(homes.claude, 'rules/nested/deep.md', '# nested user rules are undocumented\n');
  // Terminal-UI preferences the exclusion names (FR-018).
  write(homes.claude, 'keybindings.json', '{"submit":"ctrl+enter"}\n');
  write(homes.claude, 'themes/dark.json', '{"name":"dark"}\n');
  write(homes.claude, 'workflows/release.js', 'export const meta = { name: "release" };\n');
  write(homes.claude, 'projects/-home-user-app/memory/MEMORY.md', '# auto memory\n');
  write(homes.claude, 'CLAUDE.local.md', '# a sibling filename admits nothing\n');
  write(homes.claude, 'rules/style.md', '# Prefer guard clauses over nesting.\n');
  // The rest of what a configuration directory ordinarily holds, so the
  // exclusion is measured against a realistic home rather than a sparse one:
  // the personal commands and output style, an installed plugin's own tree, a
  // subagent's memory scope, and the state file the file reference locates
  // beside the directory rather than inside it.
  write(
    homes.claude,
    'commands/review/security.md',
    '---\ndescription: Personal security review\n---\n\nCheck the diff for credentials.\n',
  );
  // The same invocation name the Codex home's `prompts/draftpr.md` resolves
  // to: the `draftpr` row then holds two personal files, so its
  // personal-setup block can offer a comparison pair — the prompt half of the
  // cross-source groups (T1127, FR-030).
  write(
    homes.claude,
    'commands/draftpr.md',
    '---\ndescription: Draft a pull request from the branch\n---\n\nDraft the pull request description from the staged commits.\n',
  );
  write(
    homes.claude,
    'output-styles/terse.md',
    '---\nname: Terse\ndescription: Short answers only.\n---\n\nAnswer in one paragraph.\n',
  );
  write(
    homes.claude,
    'plugins/repos/acme/toolkit/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'toolkit', version: '1.4.0' }, null, 2)}\n`,
  );
  write(
    homes.claude,
    'plugins/repos/acme/toolkit/skills/lint/SKILL.md',
    '---\nname: lint\ndescription: Installed plugin skill.\n---\n',
  );
  write(homes.claude, 'agent-memory/reviewer/NOTES.md', '# what the reviewer remembered\n');
  write(homes.claude, 'history.jsonl', '{"display":"resume"}\n');
  // Beside the configuration directory, never inside it: the file reference
  // locates `~/.claude.json` at the home itself, holding app state and the
  // reader's personal MCP servers (anthropic.claude-code.directory.file-reference
  // § File reference).
  write(
    root,
    '.claude.json',
    `${JSON.stringify(
      {
        numStartups: 42,
        mcpServers: { notes: { command: 'npx', args: ['-y', 'mcp-notes'] } },
        oauthAccount: { accessToken: GLOBAL_HOME_SECRETS.claude },
      },
      null,
      2,
    )}\n`,
  );

  // ---- Codex: both ordered instruction targets, so the first-non-empty
  // selection is observable, plus the config and state beside them.
  write(
    homes.codex,
    'AGENTS.override.md',
    [
      '# Override instructions',
      '',
      'This file wins over AGENTS.md while it is non-empty.',
      `Report failures to ${GLOBAL_HOME_ENVIRONMENT_REFERENCES.codex}.`,
      '',
    ].join('\n'),
  );
  write(
    homes.codex,
    'AGENTS.md',
    ['# Fallback instructions', '', 'Read only when the override is absent or empty.', ''].join(
      '\n',
    ),
  );
  write(
    homes.codex,
    'config.toml',
    [
      'model = "gpt-5-codex"',
      'approval_policy = "on-request"',
      '',
      '[mcp_servers.docs]',
      'command = "npx"',
      'args = ["-y", "mcp-docs"]',
      '',
      // The same server name the Copilot home's mcp-config.json declares: the
      // `tickets` row then holds two personal declarations, so its
      // personal-setup block can offer a comparison pair — the MCP half of
      // the cross-source groups (T1127, FR-030).
      '[mcp_servers.tickets]',
      'command = "npx"',
      'args = ["-y", "mcp-tickets"]',
      '',
      '[hooks]',
      'post_tool_use = [{ command = "./notify.sh" }]',
      '',
      '[features]',
      'memories = true',
      '',
    ].join('\n'),
  );
  // The user layer's standalone hook file, beside the inline [hooks] table.
  write(
    homes.codex,
    'hooks.json',
    `${JSON.stringify({ hooks: { preToolUse: [{ command: './guard.sh' }] } }, null, 2)}\n`,
  );
  // A personal custom agent; the selector reaches direct children alone.
  write(
    homes.codex,
    'agents/deploy-bot.toml',
    ['name = "deploy-bot"', 'description = "Runs the deploy checklist."', ''].join('\n'),
  );
  write(homes.codex, 'agents/archive/old-bot.toml', 'name = "old-bot"\n');
  // A personal rules file: a permissions policy, exactly as the Repository
  // rule reads its own.
  write(
    homes.codex,
    'rules/safety.rules',
    ['prefix_rule(', '  pattern = ["git", "status"],', '  decision = "allow",', ')', ''].join('\n'),
  );
  write(homes.codex, 'rules/archive/old.rules', 'prefix_rule()\n');
  write(homes.codex, 'auth.json', `{"OPENAI_API_KEY":"${GLOBAL_HOME_SECRETS.codex}"}\n`);
  // An installed plugin copy under the home stays excluded (FR-018).
  write(homes.codex, 'plugins/team-tools/0.1.0/plugin.json', '{"name":"team-tools"}\n');
  write(homes.codex, 'memories/summary.md', '# generated state, never a candidate\n');
  write(homes.codex, 'prompts/draftpr.md', '---\ndescription: deprecated prompt\n---\n');
  write(homes.codex, 'sessions/rollout.jsonl', '{"kind":"session"}\n');
  write(homes.codex, 'docs/AGENTS.md', '# a nested copy the rule is anchored above\n');

  const expectedCandidatePaths: Record<GlobalMember, string[]> = {
    copilot: [
      'agents/security-auditor.agent.md',
      'copilot-instructions.md',
      'hooks/format-on-save.json',
      'hooks/notify-team.json',
      'instructions/reviews/security.instructions.md',
      'instructions/typescript.instructions.md',
      'mcp-config.json',
      'settings.json',
      'skills/changelog/SKILL.md',
    ],
    claude: [
      'CLAUDE.md',
      'agents/deploy-bot.md',
      'agents/research/helper.md',
      'agents/reviewer.md',
      'commands/draftpr.md',
      'commands/review/security.md',
      'output-styles/terse.md',
      'rules/style.md',
      'settings.json',
      'skills/changelog/SKILL.md',
      'skills/deploy/SKILL.md',
    ],
    // Only the override: its rule publishes the first non-empty of the two and
    // never both, so `AGENTS.md` is present in the tree and absent from this
    // list while the override is non-empty.
    codex: [
      'AGENTS.override.md',
      'agents/deploy-bot.toml',
      'config.toml',
      'hooks.json',
      'prompts/draftpr.md',
      'rules/safety.rules',
    ],
    agents: ['plugins/marketplace.json', 'skills/pathfinder/SKILL.md'],
  };
  const nearMissPaths: Record<GlobalMember, string[]> = {
    copilot: [
      'agents/README.md',
      'config.json',
      'copilot-instructions.md.bak',
      'extensions/uptime/extension.mjs',
      'hooks/pre-commit.sh',
      'installed-plugins/marketplace-cache.json',
      'instructions/notes.md',
      'lsp-config.json',
      'mcp-secrets/index.json',
      'permissions-config.json',
      'sessions/last-session.json',
    ],
    claude: [
      'CLAUDE.local.md',
      'agent-memory/reviewer/NOTES.md',
      'history.jsonl',
      'keybindings.json',
      'plugins/repos/acme/toolkit/.claude-plugin/plugin.json',
      'plugins/repos/acme/toolkit/skills/lint/SKILL.md',
      'projects/-home-user-app/memory/MEMORY.md',
      'rules/nested/deep.md',
      'skills/synced/vendor-skill/SKILL.md',
      'themes/dark.json',
      'workflows/release.js',
    ],
    codex: [
      // Present in the tree and admitted by nothing while the override is
      // non-empty; the fallback cases below are where it is the selection.
      'AGENTS.md',
      'agents/archive/old-bot.toml',
      'auth.json',
      'docs/AGENTS.md',
      'memories/summary.md',
      'plugins/team-tools/0.1.0/plugin.json',
      'rules/archive/old.rules',
      'sessions/rollout.jsonl',
    ],
    agents: ['plugins/team-tools/plugin.json', 'skills/README.md'],
  };

  // Linked cases are capability-gated: symlink creation can be unavailable on
  // Windows without developer mode, and a suite must skip exactly the
  // unprovable case rather than fake it.
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'linked-target/shared.instructions.md', '---\napplyTo: "**"\n---\n\nShared.\n');
      mkdirSync(join(homes.copilot, 'instructions/linked'), { recursive: true });
    },
    () => {
      // A linked instruction file is read transparently through its target,
      // because the product loading the same path would resolve it too
      // (FR-024).
      symlinkSync(
        join(root, 'linked-target/shared.instructions.md'),
        join(homes.copilot, 'instructions/linked/shared.instructions.md'),
      );
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(
        join(root, 'no-such-target.md'),
        join(homes.copilot, 'instructions/linked/broken.instructions.md'),
      );
    },
    [join(GLOBAL_HOME_DEFAULT_SUFFIX.copilot, 'instructions/linked')],
  );
  if (symlinks) {
    expectedCandidatePaths.copilot.push(
      'instructions/linked/broken.instructions.md',
      'instructions/linked/shared.instructions.md',
    );
  }

  for (const member of GLOBAL_MEMBER_ORDER) {
    expectedCandidatePaths[member].sort();
    nearMissPaths[member].sort();
  }

  return {
    base: root,
    home: root,
    homes,
    environment: {
      [GLOBAL_HOME_VARIABLES.copilot]: homes.copilot,
      [GLOBAL_HOME_VARIABLES.claude]: homes.claude,
      [GLOBAL_HOME_VARIABLES.codex]: homes.codex,
      HOME: root,
    },
    capabilities: { symlinks },
    expectedCandidatePaths,
    nearMissPaths,
  };
}

/**
 * How one of {@link CODEX_INSTRUCTION_CASES} materializes on disk. The kind is
 * the discriminant the builder switches on, so a new case cannot be added
 * without saying how it is written.
 */
type CodexInstructionWrite =
  /** The file does not exist. */
  | { readonly kind: 'none' }
  /** Exact bytes, for content no text encoding expresses. */
  | { readonly kind: 'bytes'; readonly bytes: Uint8Array }
  /** UTF-8 text. */
  | { readonly kind: 'text'; readonly text: string }
  /** A symbolic link with no target, which is what makes a read fail. */
  | { readonly kind: 'broken-link' };

/**
 * The eight read outcomes the Codex first-non-empty branch distinguishes,
 * applied to whichever of its two ordered targets a suite is exercising
 * (contracts/inspection-path-allowlist.md § Common conformance requirements 4).
 * `advances` is whether the branch moves on to the next target after this
 * outcome; `endsBranch` is whether it stops with a Diagnostic and no fallback.
 */
export const CODEX_INSTRUCTION_CASES = {
  /** No file at all: the branch advances to the next target. */
  absent: { write: { kind: 'none' }, advances: true, endsBranch: false },
  /** Zero bytes: read successfully, empty, so the branch advances. */
  empty: { write: { kind: 'bytes', bytes: new Uint8Array() }, advances: true, endsBranch: false },
  /** A UTF-8 BOM and nothing else: empty after the BOM, so the branch advances. */
  'bom-only': {
    write: { kind: 'bytes', bytes: new Uint8Array([0xef, 0xbb, 0xbf]) },
    advances: true,
    endsBranch: false,
  },
  /** Whitespace only: `trim().length === 0`, so the branch advances. */
  'whitespace-only': {
    write: { kind: 'text', text: ' \t\n\r\n' },
    advances: true,
    endsBranch: false,
  },
  /** Ordinary text: non-empty, so this target is the selection. */
  'non-empty': {
    write: { kind: 'text', text: '# instructions\n\nDo the thing.\n' },
    advances: false,
    endsBranch: false,
  },
  /**
   * Text one byte of which no UTF-8 decoding accepts: the replacement
   * character is content, so the file is non-empty and is the selection.
   */
  'replacement-decoded': {
    write: { kind: 'bytes', bytes: new Uint8Array([0x23, 0x20, 0xff, 0x0a]) },
    advances: false,
    endsBranch: false,
  },
  /** NUL bytes: binary, so the branch ends with `file-content-binary`. */
  binary: {
    write: { kind: 'bytes', bytes: new Uint8Array([0x23, 0x00, 0x61]) },
    advances: false,
    endsBranch: true,
  },
  /** A broken link: unreadable, so the branch ends with `file-unreadable`. */
  unreadable: { write: { kind: 'broken-link' }, advances: false, endsBranch: true },
} as const satisfies Readonly<
  Record<
    string,
    {
      readonly write: CodexInstructionWrite;
      readonly advances: boolean;
      readonly endsBranch: boolean;
    }
  >
>;

/** One member of {@link CODEX_INSTRUCTION_CASES}, by its own name. */
export type CodexInstructionCaseName = keyof typeof CODEX_INSTRUCTION_CASES;

/**
 * Builds one Codex home in which `AGENTS.override.md` and `AGENTS.md` each
 * take an independent {@link CODEX_INSTRUCTION_CASES} outcome, so a suite can
 * assert the selection for any pair of the two. Returns the home root and
 * whether the requested cases could be materialized — the `unreadable` case
 * needs a symbolic link, which not every platform grants.
 */
export function buildCodexInstructionHome(options: {
  /** Where to build; a fresh OS temp directory when omitted. */
  readonly base?: string;
  /** The outcome `AGENTS.override.md` takes. */
  readonly override: CodexInstructionCaseName;
  /** The outcome `AGENTS.md` takes. */
  readonly fallback: CodexInstructionCaseName;
}): { readonly home: string; readonly materialized: boolean } {
  const home = options.base ?? mkdtempSync(join(tmpdir(), 'aci-codex-global-'));
  mkdirSync(home, { recursive: true });
  let materialized = true;
  for (const [relative, name] of [
    ['AGENTS.override.md', options.override],
    ['AGENTS.md', options.fallback],
  ] as const) {
    const write_: CodexInstructionWrite = CODEX_INSTRUCTION_CASES[name].write;
    switch (write_.kind) {
      case 'none': {
        break;
      }
      case 'bytes': {
        writeBytes(home, relative, write_.bytes);
        break;
      }
      case 'text': {
        write(home, relative, write_.text);
        break;
      }
      case 'broken-link': {
        materialized =
          tryMaterializeSymlinks(
            home,
            () => undefined,
            () => {
              symlinkSync(join(home, 'no-such-target.md'), join(home, relative));
            },
            [relative],
          ) && materialized;
        break;
      }
    }
  }
  return { home, materialized };
}

/**
 * Builds a home the process cannot enumerate, for the deterministic
 * root-admission failure: `root-unreadable` is a rejected control with no
 * Source, never a partial inventory (FR-002). Returns null capability when the
 * platform ignores the mode change, which is how a suite skips rather than
 * asserts a case it could not create.
 *
 * The caller restores the mode before removing the tree; `chmodSync(0o700)` is
 * the counterpart, and leaving a `0o000` directory behind would make the
 * cleanup fail rather than the test.
 */
export function buildUnreadableGlobalHome(base?: string): {
  readonly home: string;
  readonly unreadable: boolean;
} {
  const home = base ?? mkdtempSync(join(tmpdir(), 'aci-global-unreadable-'));
  mkdirSync(home, { recursive: true });
  write(home, 'CLAUDE.md', '# never read\n');
  chmodSync(home, 0o000);
  let unreadable = false;
  try {
    readdirSync(home);
  } catch {
    unreadable = true;
  }
  if (!unreadable) {
    // Running as a user the mode does not restrain (root, or a platform that
    // ignores it): the case does not exist here, so the mode goes back and the
    // caller is told.
    chmodSync(home, 0o700);
  }
  return { home, unreadable };
}

/**
 * The environment values that exercise the ordered Global lexical-state
 * algorithm (data-model.md § RootPresentationEncoding and Global lexical
 * state). Each case is an exact captured string and the state it must receive;
 * most of them name no directory, which is the point — the algorithm decides
 * before any filesystem operation.
 */
export const LEXICAL_ROOT_CASES = [
  /** A present empty override: the one case `present-empty` is assigned for. */
  { value: '', state: 'present-empty' },
  /** A NUL code unit anywhere makes the value `invalid`. */
  { value: '/tmp/global\u0000home', state: 'invalid' },
  /** A lone high surrogate: UTF-16 that is not well formed, so `invalid`. */
  { value: '/tmp/global\uD800home', state: 'invalid' },
  /** A lone low surrogate, the other half of the same rule. */
  { value: '/tmp/global\uDC00home', state: 'invalid' },
  /**
   * A well-formed surrogate pair is ordinary text: it is neither empty nor
   * relative, so it is `eligible` and its exact string is frozen.
   */
  { value: '/tmp/global\u{1F4C1}home', state: 'eligible' },
  /** A relative spelling: `path.isAbsolute` is false, so `relative`. */
  { value: 'relative/global/home', state: 'relative' },
  /** A bare `.` is relative too. */
  { value: '.', state: 'relative' },
  /**
   * Absolute and outside the ordinary home: location alone neither rejects a
   * root nor grants any pre-consent read.
   */
  { value: '/var/tmp/elsewhere', state: 'eligible' },
  /** A trailing separator is not normalized away; the string stays exact. */
  { value: '/tmp/global-home/', state: 'eligible' },
  /** Spaces and quotes survive as characters; only the display is escaped. */
  { value: '/tmp/global home "quoted"', state: 'eligible' },
] as const;

/** What a suite can observe about one file before and after a session. */
export interface FileObservation {
  /** Byte length as `stat` reports it. */
  readonly size: number;
  /** Permission and type bits. */
  readonly mode: number;
  /** Modification time in milliseconds. */
  readonly mtimeMs: number;
  /**
   * Inode-change time in milliseconds. Node.js exposes no birthtime-stable
   * xattr or ACL API, so this is the indirect signal that metadata beside the
   * content changed.
   */
  readonly ctimeMs: number;
  /** Device and inode, so a replaced file is not mistaken for an edited one. */
  readonly identity: string;
  /** The link target when the entry is a symbolic link, else null. */
  readonly linkTarget: string | null;
  /** The exact bytes, read as latin1 so every byte round-trips. */
  readonly content: string;
}

/**
 * Observes every file under `root`, following no symbolic link.
 *
 * `atime` is deliberately absent: reading a file is what moves it, so it is
 * the one attribute a read may legitimately change and is never a mutation
 * this product made. {@link observeAccessTimes} records it separately for a
 * suite that wants to state which files were opened at all.
 */
export function observeTree(root: string, relative = ''): Map<string, FileObservation> {
  const observed = new Map<string, FileObservation>();
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const [nested, value] of observeTree(root, path)) {
        observed.set(nested, value);
      }
      continue;
    }
    // `lstat`, so a symbolic link is observed as itself: following it would
    // report the target's identity and mode for the link, and a broken link
    // would have no observation at all.
    const stats = lstatSync(join(root, path));
    observed.set(path, {
      size: stats.size,
      mode: stats.mode,
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
      identity: `${stats.dev}:${stats.ino}`,
      linkTarget: stats.isSymbolicLink() ? readlinkSync(join(root, path)) : null,
      content: safeRead(join(root, path)),
    });
  }
  return observed;
}

// A broken link has no content to read, and that is a fact about the fixture
// rather than a failure: the observation records the empty string so the
// before/after comparison still covers the entry.
function safeRead(absolute: string): string {
  try {
    return readFileSync(absolute, 'latin1');
  } catch {
    return '';
  }
}

/**
 * Records each file's access time separately from {@link observeTree}, for the
 * one assertion that needs it: which files a session opened. A suite compares
 * these only against the paths the allowlist admits — an unchanged `atime`
 * elsewhere is what "neighbouring paths receive zero opens" means
 * (contracts/inspection-path-allowlist.md § Common conformance requirements 4).
 */
export function observeAccessTimes(root: string, relative = ''): Map<string, number> {
  const observed = new Map<string, number>();
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const [nested, value] of observeAccessTimes(root, path)) {
        observed.set(nested, value);
      }
      continue;
    }
    // A broken link has no target to stat, and its own `atime` is what the
    // observation is about, so `lstat` answers for every entry alike.
    observed.set(path, lstatSync(join(root, path)).atimeMs);
  }
  return observed;
}
