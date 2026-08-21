// T140, T314, T324: the Claude skill's declared-name reading and its
// admission-level uncertainty, the Claude MCP carrier's whole-entry field
// reading, and the skill negative — an `mcpServers`-spelling skill stays a
// skill (data-model.md § Field reading, FR-007, FR-009, FR-026, FR-028).
//
// Every declared key is read out in the shape the file wrote it — list-valued
// keys, `hooks`-spelling and MCP-spelling frontmatter, and credential-shaped
// keys alike — with nothing captioned, classified, or resolved on the file's
// behalf. The name is only the value the surface leads with, and it is read
// from a scalar or not at all. Reference-looking values are never promoted to
// relationships
// (see `relationships.test.ts`), and every layer's applicability stays
// conditional on the runtime inputs the Inspector never observes.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import {
  CLAUDE_REPOSITORY_RULES,
  ClaudeCompiledMcpCarrierRule,
} from '../../../src/server/inspection/rules/claude';
import { CLAUDE_INSPECTION_RULES } from '../../../src/shared/registries/claude/rules';
import { CLAUDE_MCP_SELECTION_STRATEGY } from '../../../src/shared/registries/claude/strategies';
import {
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;
const claudeMcpRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.mcp',
)!;

/**
 * An empty skill directory these cases enumerate. The recognizer runs the
 * census itself and propagates an enumeration failure rather than reporting an
 * empty directory, so the paths have to exist — as they do in a real scan,
 * where the traversal found them. Nothing is written into them: what these
 * cases are about is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-claude-metadata-'));
  mkdirSync(join(root, '.claude/skills/greet'), { recursive: true });
  mkdirSync(join(root, 'packages/api/.claude/skills/deploy'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored `SKILL.md` at the given admitted path. */
async function recognize(
  sourceText: string,
  matchedPath = '.claude/skills/greet/SKILL.md',
): Promise<ToolRecognition> {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: claudeSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['claude'],
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Claude recognition');
  }
  return recognition;
}

describe('Claude skill declared name', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes the name the parser resolved: %s',
    async (_id, testCase) => {
      // The shared authored-content cases pin resolution semantics — quoting,
      // escapes, repeats, aliases, tags, astral characters — and Claude reads
      // them exactly as Codex does, through the one shared extractor.
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes every declared key in the shape the file wrote it', async () => {
    // The detail surface lists the file's own keys, so a key the product has
    // no opinion about is listed like one it does — and a list stays a list
    // and a mapping stays a mapping, because a reader looking at their own
    // frontmatter is looking for what they wrote.
    const recognition = await recognize(
      [
        '---',
        'name: rich',
        'description: says hello',
        'allowed-tools: [Read, Bash]',
        'empty:',
        'hooks:',
        '  PostToolUse:',
        '    - matcher: Write',
        '---',
        '',
        '# Body',
        '',
      ].join('\n'),
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter).toEqual([
      {
        key: 'name',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'rich' },
      },
      {
        key: 'description',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'says hello' },
      },
      {
        key: 'allowed-tools',
        keyKind: 'string',
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', scalarKind: 'string', text: 'Read' },
            { kind: 'scalar', scalarKind: 'string', text: 'Bash' },
          ],
        },
      },
      // An authored null declares the key and no value; the mapping below it
      // keeps its own shape all the way down rather than being summarized.
      { key: 'empty', keyKind: 'string', value: { kind: 'absent' } },
      {
        key: 'hooks',
        keyKind: 'string',
        value: {
          kind: 'mapping',
          entries: [
            {
              key: 'PostToolUse',
              keyKind: 'string',
              value: {
                kind: 'sequence',
                items: [
                  {
                    kind: 'mapping',
                    entries: [
                      {
                        key: 'matcher',
                        keyKind: 'string',
                        value: { kind: 'scalar', scalarKind: 'string', text: 'Write' },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(recognition.details.declaredName).toBe('rich');
    // The description is published once, as one of the declarations. A second
    // copy beside them would be the same fact in two states.
    expect(recognition.details.frontmatter).toContainEqual({
      key: 'description',
      keyKind: 'string',
      value: { kind: 'scalar', scalarKind: 'string', text: 'says hello' },
    });
    // The instructions are the body alone: the declarations above are not
    // repeated inside it, and the block's fences are gone with the block.
    expect(recognition.details.bodyText).toBe('\n# Body\n');
    expect(recognition.details.bodyText).not.toContain('name: rich');
  });

  it('names a skill only from a scalar, never from the first item of a list', async () => {
    // `name: [a, b]` is nothing a selector could match a skill by, so the
    // skill has no declared name — taking `a` would name it after an item the
    // file never wrote as a name.
    const recognition = await recognize('---\nname: [a, b]\n---\n');
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect('declaredName' in recognition.details).toBe(false);
    expect(recognition.details.frontmatter).toEqual([
      {
        key: 'name',
        keyKind: 'string',
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', scalarKind: 'string', text: 'a' },
            { kind: 'scalar', scalarKind: 'string', text: 'b' },
          ],
        },
      },
    ]);
  });

  it('publishes the keys in the order the file wrote them, at every depth', async () => {
    // Read into a plain object, integer-like keys come back first in ascending
    // numeric order — `10` after `2` — which is an order no author wrote, and
    // it happens at every level, so a nested block has to be asserted too.
    const recognition = await recognize(
      [
        '---',
        '"10": ten',
        '"2": two',
        'name: ordered',
        'nested:',
        '  "30": thirty',
        '  "4": four',
        '  z: last',
        '---',
        '',
      ].join('\n'),
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter.map((entry) => entry.key)).toEqual([
      '10',
      '2',
      'name',
      'nested',
    ]);
    const nested = recognition.details.frontmatter.at(-1)?.value;
    if (nested?.kind !== 'mapping') {
      throw new Error('expected a nested mapping');
    }
    expect(nested.entries.map((entry) => entry.key)).toEqual(['30', '4', 'z']);
    // The name is still read from the key it names, not from the first entry.
    expect(recognition.details.declaredName).toBe('ordered');
  });

  it('titles a key with the text a product resolves it to', async () => {
    // Unquoted, `007` is the integer 7 on both sides of the colon: the key a
    // product loading the file gets is `7`, and reporting `007` would be this
    // tool showing a spelling the product does not use (data-model.md § Field
    // reading).
    const recognition = await recognize('---\nname: n\n007: seven\ntrue: yes\n---\n');
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter.map((entry) => entry.key)).toEqual([
      'name',
      '7',
      'true',
    ]);
  });

  it.each([
    ['a timestamp', '---\nname: t\nwhen: !!timestamp 2001-12-14\n---\n'],
    ['binary data', '---\nname: b\nblob: !!binary R0lG\n---\n'],
    ['a set', '---\nname: s\nmembers: !!set { x, y }\n---\n'],
  ])('fails the recognition for a value with no authored rendering: %s', async (_id, source) => {
    // An explicit YAML 1.1 tag resolves to a host object — a `Date`, a
    // `Buffer`, a `Set`. Each has a value the file declared but no spelling
    // this surface can show without inventing one, and reporting it as
    // declared-nothing would hide the declaration outright (FR-025).
    const recognition = await recognize(source);
    expect(recognition.parseStatus).toBe('failed');
  });

  it('fails the recognition for a key that is not a scalar', async () => {
    // `? [a, b]` declares a list as a key. There is no text that names such a
    // row without inventing one, so the recognition fails all-or-nothing and
    // the complete source stays displayed (FR-025, FR-028) — the same outcome
    // as a value that contains itself.
    const recognition = await recognize('---\nname: complex\n? [a, b]\n: paired\n---\n');
    expect(recognition.parseStatus).toBe('failed');
  });

  it('publishes the parsed type beside a key one spelling could conflate', async () => {
    // The core schema keeps an unquoted `1` a number and `"1"` a string —
    // two keys of one mapping — while both render as the key `1`. The
    // parsed type is published beside the rendering so a surface matching
    // declarations across files can match by the parser's identity rather
    // than by the spelling alone (api-types.ts § DeclaredKeyKind,
    // FR-011).
    const recognition = await recognize('---\n1: number\n"1": string\n---\n');
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter).toEqual([
      {
        key: '1',
        keyKind: 'number',
        value: { kind: 'scalar', scalarKind: 'string', text: 'number' },
      },
      {
        key: '1',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'string' },
      },
    ]);
  });

  it.each([
    ['a list', '---\n- a\n- b\n---\nBody\n'],
    ['a bare scalar', '---\nplain\n---\nBody\n'],
  ])('declares no keys for a frontmatter block written as %s', async (_shape, sourceText) => {
    // Only a mapping declares keys. `Object.entries` over a list or a string
    // yields index keys — `0`, `1` — so a block written either way would be
    // shown as declarations whose author cannot find them in the file
    // (FR-025). The block is not a failure and its bytes stay in the source
    // viewer; it simply declares nothing.
    const recognition = await recognize(sourceText);
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.parseStatus).toBe('parsed');
    expect(recognition.details.frontmatter).toEqual([]);
    expect('declaredName' in recognition.details).toBe(false);
  });

  it.each(MALFORMED_SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'fails the whole recognition without guessing a name: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('failed');
      // The file itself is unaffected: it stays an admitted, readable
      // candidate whose complete source the detail route serves (FR-028).
      if (recognition.details.kind !== 'skill') {
        throw new Error('expected a skill recognition');
      }
      expect('declaredName' in recognition.details).toBe(false);
      // All-or-nothing: a failed extraction publishes no partial declarations
      // and no instructions either — not just no name (FR-028).
      expect(recognition.details.frontmatter).toEqual([]);
      expect(recognition.details.bodyText).toBe('');
    },
  );

  it('fails the recognition for a value that contains itself', async () => {
    // A YAML anchor can name a node that contains it. There is no shape to
    // publish and no JSON form to send, so the recognition fails all-or-nothing
    // and the complete source stays displayed (FR-028) — the same outcome as a
    // document that cannot be parsed.
    const recognition = await recognize('---\nname: greet\nloop: &a [*a]\n---\n');
    expect(recognition.parseStatus).toBe('failed');
  });

  it('resolves no environment reference the declared name contains', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response (FR-026).
    const recognition = await recognize('---\nname: "$HOME/${TOKEN}"\n---\n');
    expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
      '$HOME/${TOKEN}',
    );
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('admits a skill on any layer without claiming the product uses it', async () => {
    // Claude discovers ancestor layers at startup and nested descendant skill
    // directories lazily, so both shapes are admitted — and an admission
    // publishes only what it matched, never a claim that the layer is in use.
    for (const matchedPath of [
      '.claude/skills/greet/SKILL.md',
      'packages/api/.claude/skills/deploy/SKILL.md',
    ]) {
      const recognition = await recognize('---\nname: layered\n---\n', matchedPath);
      // Field by field rather than a deep equality: a provenance derives its
      // rule identifiers from the compiled rule it holds, and an equality
      // matcher's clone has no class behind those getters.
      expect(recognition.provenances).toHaveLength(1);
      const [provenance] = recognition.provenances;
      expect(provenance!.ruleId).toBe('claude.repo.skill');
      expect(provenance!.discoveryClass).toBe('static-candidate');
      expect(provenance!.matchedPath).toBe(matchedPath);
    }
  });
});

describe('Claude MCP-file metadata (T314)', () => {
  /** Recognizes one authored `.mcp.json` at the exact root carrier path. */
  async function recognizeCarrier(sourceText: string): Promise<ToolRecognition> {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        admissions: [{ compiled: claudeMcpRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['claude'],
    );
    const [recognition] = recognitions;
    if (recognition === undefined) {
      throw new Error('expected one Claude recognition');
    }
    return recognition;
  }

  it('publishes each declaration whole, by the keys the file wrote, in authored order', async () => {
    // The declaration is the unit (data-model.md § Inventory unit): every
    // field the entry wrote is published under it as a resolved value, with
    // nothing captioned, validated, or reordered on the file's behalf
    // (FR-007). What a same-name entry in another scope would replace is the
    // selection strategy's record, never a projection here (FR-009).
    const recognition = await recognizeCarrier(
      JSON.stringify({
        mcpServers: {
          ctx: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], disabled: false, retries: 2 },
        },
      }),
    );
    if (recognition.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognition.details.servers).toEqual([
      {
        name: 'ctx',
        fields: [
          {
            key: 'type',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'stdio' },
          },
          {
            key: 'command',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'npx' },
          },
          {
            key: 'args',
            keyKind: 'string',
            value: {
              kind: 'sequence',
              items: [
                { kind: 'scalar', scalarKind: 'string', text: '-y' },
                { kind: 'scalar', scalarKind: 'string', text: 'pkg' },
              ],
            },
          },
          {
            key: 'disabled',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'boolean', text: 'false' },
          },
          {
            key: 'retries',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'number', text: '2' },
          },
        ],
      },
    ]);
  });

  it('keeps a relative command the literal the file wrote, joined to no base', async () => {
    // The resolution base for relative command and args values is not
    // established by current official pages (`claude.behavior.repo.mcp`,
    // canonical index), which is one more reason nothing here may resolve
    // one: no base joins the literal, and no declared path is opened
    // (FR-009).
    const recognition = await recognizeCarrier(
      JSON.stringify({ mcpServers: { ctx: { command: './scripts/run.sh', args: ['../up.sh'] } } }),
    );
    if (recognition.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    const serialized = JSON.stringify(recognition.details.servers);
    expect(serialized).toContain('./scripts/run.sh');
    expect(serialized).toContain('../up.sh');
    expect(serialized).not.toContain(root);
  });

  it('records whole-entry replacement as the strategy, not as a projection', () => {
    // local → project → User → plugin → connector selection of whole entries
    // is `claude.mcp.selection`'s documented pipeline: `select-first` of an
    // entire same-name entry, `replace` rather than field merge, then the
    // subagent tool `filter`. It lives in the maintained registry record —
    // the bilingual contract row is gated reciprocally by
    // tests/contract/runtime-composition.test.ts — and no recognition field
    // projects a winner (FR-009).
    expect(CLAUDE_MCP_SELECTION_STRATEGY.operations).toEqual(['select-first', 'replace', 'filter']);
    expect(CLAUDE_MCP_SELECTION_STRATEGY.tool).toBe('claude');
  });
});

describe('the Claude MCP declaration reading and the skill negative (T324)', () => {
  /** The one compiled carrier unit whose reading is under test. */
  const carrier = new ClaudeCompiledMcpCarrierRule(CLAUDE_INSPECTION_RULES['claude.repo.mcp']);

  it('derives declared servers from the carrier source exactly', () => {
    // The compiled rule's own reading over the authored carrier text — the
    // one production path a declaration takes: named servers with inline
    // fields stay the values the file wrote, as relationship-shaped text
    // rather than anything resolved or opened, and a non-mapping entry is
    // omitted whole rather than published partially.
    expect(
      carrier.serverDeclarationsOf(
        JSON.stringify({
          unrelated: 'kept out',
          mcpServers: { ctx: { command: 'npx' }, 'named-ref': {}, malformed: 'nope' },
        }),
      ),
    ).toEqual([
      {
        name: 'ctx',
        fields: [
          {
            key: 'command',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'npx' },
          },
        ],
      },
      { name: 'named-ref', fields: [] },
    ]);
  });

  it('reads nothing from an absent or non-mapping container', () => {
    // A `mcpServers` list, scalar, or absent key contains no declaration:
    // the classification is structural and total over what strict JSON can
    // author — every key a string, a duplicate key resolved to its later
    // declaration by the parser, so the later container is the one read.
    expect(carrier.serverDeclarationsOf('{}')).toEqual([]);
    expect(carrier.serverDeclarationsOf('{ "mcpServers": "enabled" }')).toEqual([]);
    expect(carrier.serverDeclarationsOf('{ "mcpServers": [] }')).toEqual([]);
    expect(
      carrier.serverDeclarationsOf('{ "mcpServers": "first", "mcpServers": { "late": {} } }'),
    ).toEqual([{ name: 'late', fields: [] }]);
  });

  it('keeps a skill spelling mcpServers a skill, its frontmatter literal and unresolved', async () => {
    // Claude documents no `mcpServers` skill-frontmatter field, so the
    // spelling produces no MCP recognition; the
    // values stay the skill's own frontmatter — literal, with nothing looking
    // up the process environment on the way (FR-026).
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.claude/skills/greet/SKILL.md',
        absolutePath: join(root, '.claude/skills/greet/SKILL.md'),
        sourceRoot: root,
        admissions: [{ compiled: claudeSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText: [
          '---',
          'name: greet',
          'mcpServers:',
          '  ctx:',
          '    env:',
          '      API_KEY: $HOME/${TOKEN}',
          '---',
          '',
        ].join('\n'),
      },
      ['claude'],
    );
    expect(recognitions.map((recognition) => recognition.details.kind)).toEqual(['skill']);
    const [skill] = recognitions;
    expect(JSON.stringify(skill)).toContain('$HOME/${TOKEN}');
    expect(JSON.stringify(skill)).not.toContain(process.env['HOME'] ?? '\0unset');
  });
});
