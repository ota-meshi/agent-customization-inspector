// specs/002-gemini-cli-support T019: each Gemini CLI compiled unit's answer —
// the context-filename derivation's default plan and path-derived range, the
// skill's declared-name reading, the sub-agent's declared name, the settings
// carrier's three recognitions from one document, the MCP row per `mcpServers`
// name, the hook recognition present whatever `hooks` declares, the command
// name for a direct child and a namespaced file, and the file-confined
// outcomes each kind keeps (spec.md FR-004 through FR-009, FR-028).
//
// The cases pass the authored text straight to the recognizer, as the other
// vendors' metadata suites do: what is under test is the reading each unit
// owns, not the walk that finds the file.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import {
  GEMINI_GLOBAL_RULES,
  GEMINI_REPOSITORY_RULES,
  readGeminiConfiguredContextPlans,
} from '../../../src/server/inspection/rules/gemini';
import { GEMINI_DERIVED_CONTEXT_RULE } from '../../../src/server/inspection/rules/instructions/gemini';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';
import type { CompiledStaticCandidateRule } from '../../../src/server/inspection/rules/registry';

// Selected by identity: the shipped catalog holds every Gemini CLI kind, and
// each case is about one unit's own reading.
function repositoryRule(ruleId: string): CompiledStaticCandidateRule {
  const compiled = GEMINI_REPOSITORY_RULES.find((candidate) => candidate.rule.ruleId === ruleId);
  if (compiled === undefined) {
    throw new Error(`the shipped Gemini CLI catalog carries no ${ruleId}`);
  }
  return compiled;
}

const skillRule = repositoryRule('gemini.repo.skill');
const agentRule = repositoryRule('gemini.repo.agent');
const commandRule = repositoryRule('gemini.repo.command');
const settingsRule = repositoryRule('gemini.repo.settings');
const mcpRule = repositoryRule('gemini.repo.mcp');
const hooksRule = repositoryRule('gemini.repo.hooks');

/**
 * A root the cases enumerate below. The recognizer runs the skill census
 * itself and propagates an enumeration failure rather than reporting an empty
 * directory, so every path a case names has to exist — as it does in a real
 * scan, where the traversal found it.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-gemini-metadata-'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored file at `matchedPath` under the given admissions, for Gemini CLI alone. */
async function recognize(
  matchedPath: string,
  rules: readonly CompiledStaticCandidateRule[],
  sourceText: string,
): Promise<readonly ToolRecognition[]> {
  mkdirSync(join(root, matchedPath, '..'), { recursive: true });
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: rules.map((compiled, index) => ({
        compiled,
        origin: { planIndex: index, selectorIndex: 0 },
      })),
      sourceText,
    },
    ['gemini'],
  );
  return recognitions;
}

describe('the Gemini CLI context-filename derivation (FR-004, FR-005)', () => {
  it('plans one any-depth selector per configured name, the default when none is configured', () => {
    // The default is the derivation's own: one plan whatever the carrier
    // says, so the walk never needs a static `GEMINI.md` rule beside it.
    const defaulted = GEMINI_DERIVED_CONTEXT_RULE.planFor(['GEMINI.md']);
    expect(defaulted.selectors.map((selector) => selector.remainder)).toEqual([
      [{ kind: 'recursive-directories' }, { kind: 'literal', value: 'GEMINI.md' }],
    ]);
    // Configured names replace the default rather than joining it, in
    // authored order, each as the configuration wrote it.
    const configured = GEMINI_DERIVED_CONTEXT_RULE.planFor(['AGENTS.md', 'CONTEXT.md']);
    expect(configured.selectors.map((selector) => selector.remainder)).toEqual([
      [{ kind: 'recursive-directories' }, { kind: 'literal', value: 'AGENTS.md' }],
      [{ kind: 'recursive-directories' }, { kind: 'literal', value: 'CONTEXT.md' }],
    ]);
  });

  it('derives the range from the path with no directory stripped', () => {
    // The root's file governs everything; a nested one governs its own
    // subtree. Nothing is stripped from the tail — Gemini CLI documents no
    // `.gemini/GEMINI.md` alternative to a file beside it — so a context file
    // inside `.gemini/` governs `.gemini/**` like any other directory's would
    // (FR-005), and a glob-significant directory name is escaped so the
    // published range means the directory, not a pattern.
    expect(GEMINI_DERIVED_CONTEXT_RULE.applicabilityRangeOf('GEMINI.md')).toBe('**');
    expect(GEMINI_DERIVED_CONTEXT_RULE.applicabilityRangeOf('packages/api/GEMINI.md')).toBe(
      'packages/api/**',
    );
    expect(GEMINI_DERIVED_CONTEXT_RULE.applicabilityRangeOf('.gemini/GEMINI.md')).toBe(
      '.gemini/**',
    );
    expect(GEMINI_DERIVED_CONTEXT_RULE.applicabilityRangeOf('packages/[api]/CONTEXT.md')).toBe(
      'packages/\\[api\\]/**',
    );
  });

  it('reads the root settings as configuration and yields exactly one plan in every state', async () => {
    const configurationRoot = mkdtempSync(join(tmpdir(), 'inspector-gemini-context-'));
    try {
      const planNames = async () => {
        const result = await readGeminiConfiguredContextPlans(configurationRoot);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]!.rule).toBe(GEMINI_DERIVED_CONTEXT_RULE);
        return {
          names: result.plans[0]!.plan.selectors.map((selector) => {
            const leaf = selector.remainder.at(-1);
            return leaf?.kind === 'literal' ? leaf.value : leaf;
          }),
          seeded: result.seededReads.length,
        };
      };
      // No carrier: the default, and nothing seeded because nothing was read.
      expect(await planNames()).toEqual({ names: ['GEMINI.md'], seeded: 0 });

      // A configured string and a configured array each replace the default
      // wholesale; the one read seeds the carrier's own candidacy (T282).
      mkdirSync(join(configurationRoot, '.gemini'), { recursive: true });
      const carrier = join(configurationRoot, '.gemini/settings.json');
      writeFileSync(carrier, '{ "context": { "fileName": "AGENTS.md" } }\n', 'utf8');
      expect(await planNames()).toEqual({ names: ['AGENTS.md'], seeded: 1 });
      writeFileSync(
        carrier,
        [
          '{',
          '  // comments and a trailing comma, as the vendor’s own loader reads them',
          '  "context": { "fileName": ["AGENTS.md", "CONTEXT.md"], },',
          '}',
          '',
        ].join('\n'),
        'utf8',
      );
      expect(await planNames()).toEqual({ names: ['AGENTS.md', 'CONTEXT.md'], seeded: 1 });

      // Every unusable declaration configures nothing, so the default stands
      // (FR-004): a non-string, an empty array, an empty string, a mixed
      // array, a `context` that is not an object, and a document the format
      // cannot read at all. None is a diagnostic here — the parse failure is
      // the carrier's own settings recognition's to report (FR-028).
      for (const unusable of [
        '{ "context": { "fileName": 42 } }',
        '{ "context": { "fileName": [] } }',
        '{ "context": { "fileName": "" } }',
        '{ "context": { "fileName": ["AGENTS.md", 7] } }',
        '{ "context": "GEMINI.md" }',
        '{ "ui": { "theme": "GitHub" } }',
        '{ "context": { "fileName": ',
      ]) {
        writeFileSync(carrier, `${unusable}\n`, 'utf8');
        expect(await planNames(), unusable).toEqual({ names: ['GEMINI.md'], seeded: 1 });
      }
    } finally {
      rmSync(configurationRoot, { recursive: true, force: true });
    }
  });
});

describe('the Gemini CLI skill name (FR-007)', () => {
  it('takes the declared name and falls back to the skill directory', async () => {
    const declared = await recognize(
      '.gemini/skills/api-design/SKILL.md',
      [skillRule],
      '---\nname: design-api\ndescription: Shape an endpoint.\n---\n\nBody.\n',
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]!.details).toMatchObject({ kind: 'skill', invocationName: 'design-api' });
    expect(declared[0]!.provenances[0]).toMatchObject({
      ruleId: 'gemini.repo.skill',
      matchedPath: '.gemini/skills/api-design/SKILL.md',
    });

    const nameless = await recognize(
      '.gemini/skills/nameless/SKILL.md',
      [skillRule],
      '---\ndescription: Declares no name.\n---\n\nBody.\n',
    );
    expect(nameless[0]!.details).toMatchObject({ kind: 'skill', invocationName: 'nameless' });
    // Empty is absent for this purpose: the vendor invokes a skill by a name,
    // and an empty one is no name to invoke by.
    const empty = await recognize(
      '.gemini/skills/blank/SKILL.md',
      [skillRule],
      '---\nname: ""\n---\n',
    );
    expect(empty[0]!.details).toMatchObject({ kind: 'skill', invocationName: 'blank' });
  });

  it('keeps the directory name and fails the extraction for unreadable frontmatter', async () => {
    const [broken] = await recognize(
      '.gemini/skills/broken/SKILL.md',
      [skillRule],
      '---\nname: [unterminated\n---\n\nBody.\n',
    );
    expect(broken!.parseStatus).toBe('failed');
    expect(broken!.details).toMatchObject({
      kind: 'skill',
      invocationName: 'broken',
      frontmatter: [],
    });
  });
});

describe('the Gemini CLI sub-agent name (FR-008)', () => {
  /** The one agent recognition's payload, or a failure. */
  function agentDetails(recognitions: readonly ToolRecognition[]) {
    const [recognition] = recognitions;
    if (recognition === undefined || recognition.details.kind !== 'agent') {
      throw new Error('expected one Gemini CLI agent recognition');
    }
    return { status: recognition.parseStatus, ...recognition.details };
  }

  it('identifies the agent by its declared name and splits the instructions out', async () => {
    const details = agentDetails(
      await recognize(
        '.gemini/agents/reviewer.md',
        [agentRule],
        [
          '---',
          'name: reviewer',
          'description: Reviews a diff.',
          'tools: ["read_file"]',
          '---',
          '',
          'Review the change.',
          '',
        ].join('\n'),
      ),
    );
    expect(details.agentName).toBe('reviewer');
    expect(details.metadata.map((entry) => entry.key)).toEqual(['name', 'description', 'tools']);
    expect(details.instructionsText).toBe('\nReview the change.\n');
  });

  it('leaves the name unknown for a file declaring none, a non-scalar, or unreadable frontmatter', async () => {
    const none = agentDetails(
      await recognize('.gemini/agents/nameless.md', [agentRule], '---\ndescription: x\n---\n'),
    );
    expect(none.status).toBe('parsed');
    expect('agentName' in none).toBe(false);
    const list = agentDetails(
      await recognize('.gemini/agents/list.md', [agentRule], '---\nname: [a, b]\n---\n'),
    );
    expect('agentName' in list).toBe(false);
    const broken = agentDetails(
      await recognize('.gemini/agents/broken.md', [agentRule], '---\nname: [unterminated\n---\n'),
    );
    expect(broken.status).toBe('failed');
    expect('agentName' in broken).toBe(false);
    expect(broken.metadata).toEqual([]);
  });

  it('keeps a declared mcpServers block as metadata and yields no MCP recognition', async () => {
    const recognitions = await recognize(
      '.gemini/agents/mcp-user.md',
      [agentRule],
      '---\nname: mcp-user\nmcpServers:\n  docs:\n    httpUrl: http://localhost:8080/mcp\n---\n\nUse it.\n',
    );
    expect(recognitions.map((recognition) => recognition.details.kind)).toEqual(['agent']);
    expect(agentDetails(recognitions).metadata.map((entry) => entry.key)).toEqual([
      'name',
      'mcpServers',
    ]);
  });
});

describe('the Gemini CLI settings carrier (FR-002, FR-009)', () => {
  /** The three-rule admission of the one settings document, as the walk merges it. */
  const carrierRules = [settingsRule, mcpRule, hooksRule];

  it('publishes the document, one MCP row per server, and the hooks from one text', async () => {
    const recognitions = await recognize(
      '.gemini/settings.json',
      carrierRules,
      [
        '{',
        '  // the vendor strips comments before parsing',
        '  "ui": { "theme": "GitHub" },',
        '  "mcpServers": {',
        '    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },',
        '    "docs": { "httpUrl": "http://localhost:8080/mcp", },',
        '  },',
        '  "hooks": { "BeforeTool": [{ "hooks": [{ "type": "command", "command": "./guard.sh" }] }] },',
        '}',
        '',
      ].join('\n'),
    );
    expect(
      recognitions.map((recognition) => [recognition.details.kind, recognition.parseStatus]),
    ).toEqual([
      ['settings/config', 'not-attempted'],
      ['MCP', 'parsed'],
      ['hook', 'parsed'],
    ]);
    const mcp = recognitions[1]!.details;
    if (mcp.kind !== 'MCP') {
      throw new Error('expected the MCP recognition second');
    }
    expect(mcp.servers.map((server) => server.name)).toEqual(['github', 'docs']);
    // The declared values reach the record as written: nothing is connected
    // to, and the URL is a string like any other (FR-019).
    expect(JSON.stringify(mcp.servers[1])).toContain('http://localhost:8080/mcp');
    const hooks = recognitions[2]!.details;
    if (hooks.kind !== 'hook') {
      throw new Error('expected the hook recognition third');
    }
    expect(hooks.carrier).toBe('contained');
    expect(hooks.events.map((event) => event.event)).toEqual(['BeforeTool']);
  });

  it('declares no server and no event for an absent, empty, or non-object map, without failing', async () => {
    for (const source of [
      '{ "ui": { "theme": "GitHub" } }',
      '{ "mcpServers": {}, "hooks": {} }',
      '{ "mcpServers": "none", "hooks": ["BeforeTool"] }',
    ]) {
      const recognitions = await recognize('.gemini/settings.json', carrierRules, source);
      const [, mcp, hooks] = recognitions;
      expect(mcp!.parseStatus, source).toBe('parsed');
      expect(mcp!.details, source).toEqual({ kind: 'MCP', servers: [] });
      expect(hooks!.parseStatus, source).toBe('parsed');
      expect(hooks!.details, source).toEqual({ kind: 'hook', carrier: 'contained', events: [] });
    }
  });

  it('publishes the settings keys of the hooks object as the file wrote them', async () => {
    // The vendor's registry skips `enabled`, `disabled`, and `notifications`
    // before it reads event names, and no cited page states them. The reading
    // here copies no such key list: a `disabled` list of hook names is a row
    // by the shared structural rule, because the product shows the file's own
    // declarations rather than the vendor's classification of them
    // (contracts/vendors/gemini-cli.md § Known uncertainties item 9). The
    // scalar and the mapping are omitted by the same structural rule.
    const recognitions = await recognize(
      '.gemini/settings.json',
      carrierRules,
      [
        '{ "hooks": {',
        '  "enabled": true,',
        '  "disabled": ["my-hook-name"],',
        '  "notifications": { "ToolPermission": true },',
        '  "AfterTool": [{ "hooks": [{ "type": "command", "command": "./audit.sh" }] }]',
        '} }',
      ].join('\n'),
    );
    const hooks = recognitions[2]!.details;
    if (hooks.kind !== 'hook') {
      throw new Error('expected the hook recognition third');
    }
    expect(hooks.events.map((event) => event.event)).toEqual(['disabled', 'AfterTool']);
    expect(hooks.events[0]!.groups).toEqual([
      { kind: 'scalar', scalarKind: 'string', text: 'my-hook-name' },
    ]);
  });

  it('fails the MCP and hook readings of a document the format cannot parse, whole', async () => {
    const recognitions = await recognize(
      '.gemini/settings.json',
      carrierRules,
      '{ "mcpServers": { "github": { "command": "npx" }, "hooks": {',
    );
    expect(
      recognitions.map((recognition) => [recognition.details.kind, recognition.parseStatus]),
    ).toEqual([
      ['settings/config', 'not-attempted'],
      ['MCP', 'failed'],
      ['hook', 'failed'],
    ]);
    // Nothing that happened to parse is kept (FR-028).
    expect(recognitions[1]!.details).toEqual({ kind: 'MCP', servers: [] });
  });
});

describe('the Gemini CLI command name and prompt (FR-006)', () => {
  it('joins the path below the commands directory with colons and drops .toml', async () => {
    for (const [path, name] of [
      ['.gemini/commands/refactor.toml', 'refactor'],
      ['.gemini/commands/git/commit.toml', 'git:commit'],
      ['.gemini/commands/review/security/deps.toml', 'review:security:deps'],
      ['.gemini/commands/release.v2.toml', 'release.v2'],
    ] as const) {
      const [recognition] = await recognize(
        path,
        [commandRule],
        'description = "d"\nprompt = "Do it. {{args}}"\n',
      );
      expect(recognition!.details, path).toMatchObject({
        kind: 'prompt/command',
        invocationName: name,
        promptText: 'Do it. {{args}}',
      });
      expect(recognition!.parseStatus, path).toBe('parsed');
    }
    // The consented home's rule names below its own `commands/` directory.
    const home = GEMINI_GLOBAL_RULES.find(
      (candidate) => candidate.rule.ruleId === 'gemini.global.command',
    );
    if (home?.kind !== 'prompt/command') {
      throw new Error('the Gemini CLI home command rule compiles into a command unit');
    }
    expect(home.invocationNameOf('commands/git/commit.toml', [])).toBe('git:commit');
  });

  it('spells a segment as the vendor’s loader does: sanitized, and cut past fifty characters', () => {
    // Undocumented and measured in `FileCommandLoader.ts` (spec.md FR-006;
    // contracts/vendors/gemini-cli.md § Known uncertainties item 8): a
    // UTF-16 code unit outside `[A-Za-z0-9_.-]` becomes `_` — a space, a colon
    // that would collide with the namespace separator, a non-ASCII letter — and a
    // segment over fifty characters keeps its first forty-seven plus `...`.
    // The row is named what the product invokes, not what the path spells.
    if (commandRule.kind !== 'prompt/command') {
      throw new Error('the command rule compiles into a command unit');
    }
    expect(commandRule.invocationNameOf('.gemini/commands/my command.toml', [])).toBe('my_command');
    expect(commandRule.invocationNameOf('.gemini/commands/git/a:b.toml', [])).toBe('git:a_b');
    expect(commandRule.invocationNameOf('.gemini/commands/déploy/ship it.toml', [])).toBe(
      'd_ploy:ship_it',
    );
    // The loader's regex has no `u` flag, so it replaces UTF-16 code units: a
    // character beyond the Basic Multilingual Plane is two of them and becomes
    // `__`, and a row named `_` would merge it with `_.toml`.
    expect(commandRule.invocationNameOf('.gemini/commands/😀.toml', [])).toBe('__');
    const long = 'a'.repeat(60);
    expect(commandRule.invocationNameOf(`.gemini/commands/${long}.toml`, [])).toBe(
      `${'a'.repeat(47)}...`,
    );
    // Exactly fifty is kept whole: the cut applies past the limit, not at it.
    expect(commandRule.invocationNameOf(`.gemini/commands/${'b'.repeat(50)}.toml`, [])).toBe(
      'b'.repeat(50),
    );
  });

  it('splits the prompt from the other declarations and evaluates nothing in it', async () => {
    const [recognition] = await recognize(
      '.gemini/commands/git/commit.toml',
      [commandRule],
      [
        'description = "Write a commit message."',
        'prompt = """',
        'Staged diff:',
        '!{git diff --cached}',
        'Context: @{docs/style.md}',
        '"""',
        '',
      ].join('\n'),
    );
    const details = recognition!.details;
    if (details.kind !== 'prompt/command') {
      throw new Error('expected a command recognition');
    }
    expect(details.metadata.map((entry) => entry.key)).toEqual(['description']);
    // The shell block and the file reference are characters of the prompt,
    // run and opened by nothing (FR-019, FR-026).
    expect(details.promptText).toBe(
      'Staged diff:\n!{git diff --cached}\nContext: @{docs/style.md}\n',
    );
  });

  it('keeps the path-derived name and fails the extraction for unreadable TOML or no prompt', async () => {
    for (const source of ['description = "unterminated\n', 'description = "no prompt here"\n']) {
      const [recognition] = await recognize('.gemini/commands/broken.toml', [commandRule], source);
      expect(recognition!.parseStatus, source).toBe('failed');
      expect(recognition!.details, source).toEqual({
        kind: 'prompt/command',
        invocationName: 'broken',
        metadata: [],
        promptText: '',
      });
    }
  });
});
