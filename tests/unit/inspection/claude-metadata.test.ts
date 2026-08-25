// T140, T314, T324, T429, T537: the Claude skill's declared-name reading and
// its admission-level uncertainty, the Claude MCP carrier's whole-entry field
// reading, the skill negative — an `mcpServers`-spelling skill stays a
// skill — and the Claude subagent's own split into metadata and instructions
// (data-model.md § Field reading, FR-007, FR-009, FR-026, FR-028).
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
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { ClaudeCompiledMcpCarrierRule } from '../../../src/server/inspection/rules/mcp/claude';
import { CLAUDE_INSPECTION_RULES } from '../../../src/shared/registries/claude/rules';
import { CLAUDE_MCP_SELECTION_STRATEGY } from '../../../src/shared/registries/claude/strategies';
import {
  CONTENT_FIXTURE_SECRET,
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;
const claudeRulesRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.rules',
);

const claudeOutputStyleRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.output-style',
)!;

const claudeCommandRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.command',
);

const claudeMcpRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.mcp',
)!;

const claudePermissionsRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.permissions',
)!;

const claudeSettingsRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.settings',
);
const claudeAgentRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.agent',
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

/**
 * The `name` a `SKILL.md` declares, read back out of the declarations the
 * recognition publishes — the one place a declared name lives, because Claude
 * Code invokes a skill by its directory and the recognition holds that name
 * alone (FR-007). Null when the file declares no scalar `name`, which is the
 * one case a resolved value must not be invented for: a sequence under that
 * key has a rendering too, and taking its text would name a skill after an
 * item the file never wrote as a name.
 */
function declaredNameOf(recognition: ToolRecognition): string | null {
  if (recognition.details.kind !== 'skill') {
    return null;
  }
  for (const entry of recognition.details.frontmatter) {
    if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
      return entry.value.text;
    }
  }
  return null;
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
      expect(declaredNameOf(recognition)).toBe(testCase.name);
      // What Claude Code invokes is the skill directory whatever that
      // declaration says, so the identity its row is keyed by is the same for
      // every one of these files (FR-007).
      expect(recognition.details.kind === 'skill' && recognition.details.invocationName).toBe(
        'greet',
      );
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
    expect(declaredNameOf(recognition)).toBe('rich');
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
    expect(declaredNameOf(recognition)).toBeNull();
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
    expect(declaredNameOf(recognition)).toBe('ordered');
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
    expect(declaredNameOf(recognition)).toBeNull();
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
      expect(declaredNameOf(recognition)).toBeNull();
      // Claude Code's command name is the path's own fact, so it stands
      // whether or not the frontmatter parsed (FR-028).
      expect(recognition.details.invocationName).toBe('greet');
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
    expect(declaredNameOf(recognition)).toBe('$HOME/${TOKEN}');
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

describe('Claude output-style reading (T667)', () => {
  /** Recognizes one authored output style at a `.claude/output-styles/` path. */
  async function recognizeStyle(
    sourceText: string,
    matchedPath = '.claude/output-styles/diagrams.md',
  ): Promise<ToolRecognition> {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [
          { compiled: claudeOutputStyleRule, origin: { planIndex: 0, selectorIndex: 0 } },
        ],
        sourceText,
      },
      ['claude'],
    );
    const [recognition] = recognitions;
    if (recognition === undefined) {
      throw new Error('expected one Claude output-style recognition');
    }
    return recognition;
  }

  it('publishes the declarations and the instructions apart', async () => {
    // The detail surface is built from this: the keys the file declares, in
    // authored order, and the body with its frontmatter block removed. The
    // split is the parser's, so the two never overlap and nothing is invented.
    const recognition = await recognizeStyle(
      [
        '---',
        'name: Diagrams first',
        'description: Lead every explanation with a diagram',
        'keep-coding-instructions: true',
        '---',
        '',
        '# Diagrams',
        '',
      ].join('\n'),
    );
    if (recognition.details.kind !== 'output style') {
      throw new Error('expected an output-style recognition');
    }
    expect(recognition.parseStatus).toBe('parsed');
    expect(recognition.details.frontmatter.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'keep-coding-instructions',
    ]);
    expect(recognition.details.bodyText).toBe('\n# Diagrams\n');
    expect(recognition.details.bodyText).not.toContain('name: Diagrams first');
    // Nothing the file did not write: the recognition carries no copy of the
    // complete source, which the detail response serves once as `sourceText`.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
  });

  it('names the style by its declared name, and by its file name otherwise', async () => {
    const declared = await recognizeStyle(
      ['---', 'name: Diagrams first', '---', '', 'Body.', ''].join('\n'),
    );
    expect(declared.details.kind === 'output style' && declared.details.styleName).toBe(
      'Diagrams first',
    );
    // The vendor's documented fallback: "the file name becomes the style name
    // unless you set `name` in the frontmatter".
    for (const source of ['', '# no frontmatter\n', '---\ndescription: x\n---\n']) {
      const fallback = await recognizeStyle(source, '.claude/output-styles/code-review.md');
      expect(fallback.details.kind === 'output style' && fallback.details.styleName).toBe(
        'code-review',
      );
    }
  });

  it('names a file that is all extension by its own entry name', async () => {
    // `.claude/output-styles/.md` is admitted — the selector's terminal step
    // matches the extension, and this entry name ends with it — and stripping
    // the extension leaves nothing to fall back to. The name is then the entry
    // name as written, because a style name is never empty (api-types.ts
    // § OutputStyleInventoryEntryDto) and the vendor's rule is the file name.
    const recognition = await recognizeStyle('Body.\n', '.claude/output-styles/.md');
    expect(recognition.details.kind === 'output style' && recognition.details.styleName).toBe(
      '.md',
    );
  });

  it('falls back for a declared empty name, which a picker cannot show', async () => {
    const recognition = await recognizeStyle(
      ['---', 'name: ""', '---', '', 'Body.', ''].join('\n'),
      '.claude/output-styles/unnamed.md',
    );
    expect(recognition.details.kind === 'output style' && recognition.details.styleName).toBe(
      'unnamed',
    );
  });

  it('names a style only from a scalar, never from the first item of a list', async () => {
    // `name: [a, b]` is nothing a picker could show a style by, so the file
    // name stands — taking `a` would name it after an item the file never
    // wrote as a name.
    const recognition = await recognizeStyle(
      '---\nname: [a, b]\n---\n',
      '.claude/output-styles/listed.md',
    );
    if (recognition.details.kind !== 'output style') {
      throw new Error('expected an output-style recognition');
    }
    expect(recognition.details.styleName).toBe('listed');
    expect(recognition.details.frontmatter.map((entry) => entry.key)).toEqual(['name']);
  });

  it('fails the whole recognition without guessing a name', async () => {
    const recognition = await recognizeStyle(
      '---\nname: [unterminated\n---\n',
      '.claude/output-styles/broken.md',
    );
    expect(recognition.parseStatus).toBe('failed');
    if (recognition.details.kind !== 'output style') {
      throw new Error('expected an output-style recognition');
    }
    // The name is the path's own fact, so it stands whether or not the
    // frontmatter parsed (FR-028).
    expect(recognition.details.styleName).toBe('broken');
    // All-or-nothing: no partial declarations and no instructions either.
    expect(recognition.details.frontmatter).toEqual([]);
    expect(recognition.details.bodyText).toBe('');
  });

  it('resolves no environment reference the declarations contain', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response (FR-026).
    const recognition = await recognizeStyle(
      '---\nname: "$HOME/${TOKEN}"\n---\n',
      '.claude/output-styles/env.md',
    );
    expect(recognition.details.kind === 'output style' && recognition.details.styleName).toBe(
      '$HOME/${TOKEN}',
    );
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('records the admitting rule and the path it matched on every provenance', async () => {
    const recognition = await recognizeStyle('---\nname: Diagrams first\n---\n');
    expect(recognition.provenances).toHaveLength(1);
    const [provenance] = recognition.provenances;
    expect(provenance!.ruleId).toBe('claude.repo.output-style');
    expect(provenance!.discoveryClass).toBe('static-candidate');
    expect(provenance!.matchedPath).toBe('.claude/output-styles/diagrams.md');
  });
});

describe('Claude rule reading (T429)', () => {
  /** Recognizes one authored rule file at a `.claude/rules/` path. */
  async function recognizeRule(sourceText: string): Promise<ToolRecognition> {
    const matchedPath = '.claude/rules/api.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeRulesRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['claude'],
    );
    const [recognition] = recognitions;
    if (recognition === undefined) {
      throw new Error('expected one Claude rule recognition');
    }
    return recognition;
  }

  it('reads nothing out of the file, `paths` frontmatter included', async () => {
    // A rule is published as the one document its author wrote: the
    // frontmatter block stays part of it rather than becoming declarations
    // beside it, so the recognition lifts out no value at all and
    // `not-attempted` is the honest status.
    const recognition = await recognizeRule(
      ['---', 'paths:', '  - "src/api/**/*.ts"', '---', '', '# API', ''].join('\n'),
    );
    expect(recognition.details).toEqual({ kind: 'rule' });
    expect(recognition.parseStatus).toBe('not-attempted');
    expect(JSON.stringify(recognition)).not.toContain('src/api/**/*.ts');
  });

  it('treats a malformed frontmatter block exactly like a well-formed one', async () => {
    // There is no parse to fail, so no extraction diagnostic exists for the
    // kind: the complete document reaches the detail either way, and calling
    // the file invalid would be a verdict this product does not make
    // (FR-032).
    const malformed = await recognizeRule('---\npaths: [src/**\n---\n\n# Broken\n');
    const wellFormed = await recognizeRule('---\npaths: []\n---\n\n# Fine\n');
    expect(malformed.details).toEqual(wellFormed.details);
    expect(malformed.parseStatus).toBe(wellFormed.parseStatus);
    expect(malformed.diagnosticIds).toEqual([]);
  });

  it('carries no part of the rule text, credential-shaped values included', async () => {
    // The reader's own file is served by the detail, one file at a time
    // (FR-027); nothing of it rides the recognition.
    const recognition = await recognizeRule(
      `---\ntoken: ${CONTENT_FIXTURE_SECRET}\nendpoint: \${DEPLOY_ENDPOINT}\n---\n\n# Deploy\n`,
    );
    const serialized = JSON.stringify(recognition);
    expect(serialized).not.toContain(CONTENT_FIXTURE_SECRET);
    expect(serialized).not.toContain('${DEPLOY_ENDPOINT}');
  });
});

describe('Claude command reading (T449)', () => {
  /** Recognizes one authored command file at a `.claude/commands/` path. */
  async function recognizePrompt(
    sourceText: string,
    matchedPath = '.claude/commands/deploy.md',
  ): Promise<ToolRecognition> {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeCommandRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['claude'],
    );
    const [recognition] = recognitions;
    if (recognition === undefined) {
      throw new Error('expected one Claude command recognition');
    }
    return recognition;
  }

  it('reads every declared key in authored order, and the prompt after the block', async () => {
    // A command file supports a skill's frontmatter keys, so the detail leads
    // with the declarations the file wrote and the prompt that follows them
    // (FR-007). Keys are published in the file's own order, not sorted.
    const recognition = await recognizePrompt(
      [
        '---',
        'description: Deploy the current branch',
        'argument-hint: "[environment]"',
        'allowed-tools:',
        '  - Bash(git status)',
        '  - Read',
        'model: opus',
        '---',
        '',
        '# Deploy',
        '',
        'Deploy $1 after checking the working tree.',
        '',
      ].join('\n'),
    );
    expect(recognition.details).toEqual({
      kind: 'prompt/command',
      invocationName: 'deploy',
      frontmatter: [
        {
          key: 'description',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: 'Deploy the current branch' },
        },
        {
          key: 'argument-hint',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: '[environment]' },
        },
        {
          key: 'allowed-tools',
          keyKind: 'string',
          value: {
            kind: 'sequence',
            items: [
              { kind: 'scalar', scalarKind: 'string', text: 'Bash(git status)' },
              { kind: 'scalar', scalarKind: 'string', text: 'Read' },
            ],
          },
        },
        {
          key: 'model',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: 'opus' },
        },
      ],
      bodyText: '\n# Deploy\n\nDeploy $1 after checking the working tree.\n',
    });
    expect(recognition.parseStatus).toBe('parsed');
  });

  it('publishes the whole file as the prompt when it declares no frontmatter', async () => {
    const recognition = await recognizePrompt('# Release\n\nCut a release.\n');
    expect(recognition.details).toEqual({
      kind: 'prompt/command',
      invocationName: 'deploy',
      frontmatter: [],
      bodyText: '# Release\n\nCut a release.\n',
    });
    expect(recognition.parseStatus).toBe('parsed');
  });

  it('reads no name out of the file, and takes the invocation from the path', async () => {
    // Claude Code ignores `name` in a command file and derives the command
    // from the path instead, so a declared `name` is an ordinary key here and
    // the identity the row is grouped under comes from where the file sits
    // (data-model.md § Inventory unit).
    const recognition = await recognizePrompt(
      '---\nname: something-else\n---\n\n# Component\n',
      '.claude/commands/frontend/component.md',
    );
    expect(recognition.details).toMatchObject({
      kind: 'prompt/command',
      invocationName: 'frontend:component',
      frontmatter: [
        {
          key: 'name',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: 'something-else' },
        },
      ],
    });
  });

  it('fails extraction all-or-nothing on a malformed block', async () => {
    // Extraction is all-or-nothing: nothing parsed is published, and the
    // complete source stays displayed by the detail route (FR-028).
    const recognition = await recognizePrompt('---\nallowed-tools: [Bash\n---\n\n# Broken\n');
    expect(recognition.details).toEqual({
      kind: 'prompt/command',
      // Derived from the path, so the row keeps its identity while the
      // declarations stay unknown.
      invocationName: 'deploy',
      frontmatter: [],
      bodyText: '',
    });
    expect(recognition.parseStatus).toBe('failed');
  });

  it('publishes a credential and an environment reference exactly as authored', async () => {
    // Neither is masked, shortened, or resolved against the process
    // environment: the file is the reader's own (FR-025, FR-026).
    const recognition = await recognizePrompt(
      `---\ndescription: Publish with ${CONTENT_FIXTURE_SECRET}\nendpoint: \${DEPLOY_ENDPOINT}\n---\n\n# Publish\n`,
    );
    expect(recognition.details).toMatchObject({
      frontmatter: [
        {
          key: 'description',
          value: { kind: 'scalar', text: `Publish with ${CONTENT_FIXTURE_SECRET}` },
        },
        { key: 'endpoint', value: { kind: 'scalar', text: '${DEPLOY_ENDPOINT}' } },
      ],
    });
    expect(process.env['DEPLOY_ENDPOINT']).toBeUndefined();
  });

  it('leaves an agent, skill, or file name in the prompt as text', async () => {
    // Nothing is promoted to a reference: no target is resolved, opened, or
    // read, and no edge record exists to carry one (FR-019; see
    // `relationships.test.ts`).
    const recognition = await recognizePrompt(
      [
        '# Audit',
        '',
        '- Hand the diff to the code-reviewer subagent.',
        '- Then run /skill-name and read ./checklist.md.',
        '',
      ].join('\n'),
    );
    expect(recognition.details).toEqual({
      kind: 'prompt/command',
      invocationName: 'deploy',
      frontmatter: [],
      bodyText: [
        '# Audit',
        '',
        '- Hand the diff to the code-reviewer subagent.',
        '- Then run /skill-name and read ./checklist.md.',
        '',
      ].join('\n'),
    });
    expect(Object.keys(recognition)).not.toContain('relationships');
  });
});

describe('Claude settings metadata (T613)', () => {
  /** Recognizes one authored settings document at the given admitted layer. */
  async function recognizeSettings(
    matchedPath: '.claude/settings.json' | '.claude/settings.local.json',
    sourceText: string,
  ): Promise<ToolRecognition> {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeSettingsRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
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

  const DOCUMENT = JSON.stringify({
    model: 'opus',
    enabledPlugins: { 'formatter@marketplace': true },
    hooks: { PostToolUse: [{ matcher: 'Edit' }] },
    additionalDirectories: ['../docs/'],
  });

  it('names the recognizing surfaces and reads nothing out of either layer', async () => {
    for (const layer of ['.claude/settings.json', '.claude/settings.local.json'] as const) {
      const recognition = await recognizeSettings(layer, DOCUMENT);
      expect(recognition.details.kind, layer).toBe('settings/config');
      // The surfaces the admitting rule's behaviors are scoped to: naming one
      // is never a claim that the surface applied the settings (FR-009).
      expect(recognition.provenances[0]!.recognizingSurfaces, layer).toEqual([
        'claude-cli-and-ide-clients',
      ]);
      // Nothing is extracted, so the record carries no reading of any declared
      // component: what a reader sees is the document, through its detail.
      expect(recognition.parseStatus, layer).toBe('not-attempted');
      expect(JSON.stringify(recognition.details), layer).toBe('{"kind":"settings/config"}');
    }
  });

  it('projects no scope, precedence, or layer onto either recognition', async () => {
    // Which of the two layers wins for a key, and how the User and managed
    // scopes outside this Source resolve against them, is the vendor's own
    // documented composition and reaches no surface (FR-009; T091). The
    // record carries the path and the kind, and nothing that ranks them.
    const shared = await recognizeSettings('.claude/settings.json', DOCUMENT);
    const local = await recognizeSettings('.claude/settings.local.json', DOCUMENT);
    for (const recognition of [shared, local]) {
      const serialized = JSON.stringify(recognition);
      for (const token of ['precedence', 'scope', 'layer', 'local', 'shared', 'wins']) {
        expect(serialized.toLowerCase(), recognition.sourceRelativePath).not.toContain(
          `"${token}"`,
        );
      }
    }
    // The two are told apart by their paths alone, which is the row identity
    // this kind uses (data-model.md § Inventory unit).
    expect(shared.sourceRelativePath).toBe('.claude/settings.json');
    expect(local.sourceRelativePath).toBe('.claude/settings.local.json');
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

describe('the Claude permission-policy carrier reading (T1108)', () => {
  /** Recognizes one settings carrier's text through the shipped permissions rule. */
  async function recognizeSettings(sourceText: string): Promise<readonly ToolRecognition[]> {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.claude/settings.json',
        absolutePath: join(root, '.claude/settings.json'),
        sourceRoot: root,
        admissions: [
          { compiled: claudePermissionsRule, origin: { planIndex: 0, selectorIndex: 0 } },
        ],
        sourceText,
      },
      ['claude'],
    );
    return recognitions;
  }

  it('publishes every entry of the declared block, in the parser resolved order', async () => {
    // The whole object, not an allowlist of its keys: dropping some of them
    // would drop authored policy without being able to say which
    // (contracts/vendors/claude-code.md § Normative initial-release
    // presentation allowlist).
    const recognitions = await recognizeSettings(
      `${JSON.stringify({
        model: 'opus',
        permissions: {
          allow: ['Bash(npm run test:*)', 'Read(~/.zshrc)'],
          deny: ['WebFetch(domain:example.com)'],
          defaultMode: 'acceptEdits',
          additionalDirectories: ['../docs/'],
        },
      })}\n`,
    );
    expect(recognitions).toHaveLength(1);
    const [policy] = recognitions;
    expect(policy!.parseStatus).toBe('parsed');
    const details = policy!.details;
    if (details.kind !== 'permissions' || !('declaredPolicy' in details)) {
      throw new Error('the carrier published no declared policy');
    }
    expect(details.declaredPolicy.map((entry) => entry.key)).toEqual([
      'allow',
      'deny',
      'defaultMode',
      'additionalDirectories',
    ]);
    // Nested values recursively, in the shape the file wrote them: a rule
    // string is a scalar item of a sequence and stays the characters the
    // author typed (FR-019, FR-025).
    const [allow] = details.declaredPolicy;
    if (allow?.value.kind !== 'sequence') {
      throw new Error('the allow entry is not a sequence');
    }
    expect(allow.value.items.map((item) => (item.kind === 'scalar' ? item.text : null))).toEqual([
      'Bash(npm run test:*)',
      'Read(~/.zshrc)',
    ]);
    // No settings key outside the block reaches the recognition.
    expect(JSON.stringify(policy)).not.toContain('opus');
  });

  it('publishes no recognition for a settings file that declares no policy', async () => {
    // No policy is not an empty policy: a row would state one its author never
    // wrote, so the carrier stays an admitted, readable candidate with nothing
    // recognized on it.
    expect(await recognizeSettings('{ "model": "opus" }\n')).toEqual([]);
    // A `permissions` key that is not an object declares no block either.
    expect(await recognizeSettings('{ "permissions": "deny-all" }\n')).toEqual([]);
  });

  it('fails the extraction all-or-nothing on text strict JSON rejects', async () => {
    // The block is unknown rather than absent, so the recognition exists and
    // says so; the file stays admitted and readable (FR-028).
    const recognitions = await recognizeSettings('{ "permissions": { "allow": [ }\n');
    expect(recognitions).toHaveLength(1);
    const [policy] = recognitions;
    expect(policy!.parseStatus).toBe('failed');
    const details = policy!.details;
    if (details.kind !== 'permissions' || !('declaredPolicy' in details)) {
      throw new Error('the carrier published no declared-policy record');
    }
    expect(details.declaredPolicy).toEqual([]);
  });

  it('resolves a key declared twice to its later declaration', async () => {
    // Strict JSON's own resolution, accepted as the one documented reading
    // (data-model.md § Field reading).
    const recognitions = await recognizeSettings(
      '{ "permissions": { "allow": ["first"] }, "permissions": { "allow": ["second"] } }\n',
    );
    const details = recognitions[0]!.details;
    if (details.kind !== 'permissions' || !('declaredPolicy' in details)) {
      throw new Error('the carrier published no declared policy');
    }
    const [allow] = details.declaredPolicy;
    expect(allow?.value.kind === 'sequence' && allow.value.items[0]).toMatchObject({
      kind: 'scalar',
      text: 'second',
    });
  });
});

describe('Claude subagent reading (T537)', () => {
  /** Recognizes one authored subagent at the root\u2019s own agents directory. */
  async function recognizeAgent(sourceText: string): Promise<readonly ToolRecognition[]> {
    const matchedPath = '.claude/agents/code-reviewer.md';
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeAgentRule, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['claude'],
    );
    return recognitions;
  }

  /** The one agent recognition's payload, or a failure. */
  function agentDetailsOf(recognitions: readonly ToolRecognition[]) {
    const [recognition] = recognitions;
    if (recognition === undefined || recognition.details.kind !== 'agent') {
      throw new Error('expected one Claude agent recognition');
    }
    return recognition.details;
  }

  it('publishes the context, tool, skill, and memory keys as the file wrote them', async () => {
    // The vendor's own frontmatter fields are declarations like any other:
    // this product resolves their values and captions none of them, because
    // what a key means is the vendor's documentation rather than this
    // product's. `context: fork`, `tools`, `skills`, and `memory` all arrive
    // as metadata entries, in the file's own order.
    const details = agentDetailsOf(
      await recognizeAgent(
        [
          '---',
          'name: code-reviewer',
          'description: Reviews code',
          'context: fork',
          'tools: Read, Glob, Grep',
          'disallowedTools:',
          '  - Bash',
          'model: sonnet',
          'skills:',
          '  - api-conventions',
          'memory: project',
          'maxTurns: 12',
          '---',
          '',
          'Review like an owner. Hand findings to @debugger.',
          '',
        ].join('\n'),
      ),
    );
    expect(details.metadata.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'context',
      'tools',
      'disallowedTools',
      'model',
      'skills',
      'memory',
      'maxTurns',
    ]);
    // A list-valued key keeps its authored shape rather than being flattened.
    expect(details.metadata[4]!.value).toEqual({
      kind: 'sequence',
      items: [{ kind: 'scalar', scalarKind: 'string', text: 'Bash' }],
    });
    // A numeric key resolves as a number, so a surface spelling it back can
    // spell it bare (api-types.ts § DeclaredScalarKind).
    expect(details.metadata[8]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'number',
      text: '12',
    });
    // The body is the system prompt half; the agent reference inside it stays
    // text, resolved to nothing (FR-019).
    expect(details.instructionsText).toContain('Hand findings to @debugger.');
  });

  it('publishes a declared mcpServers block without an MCP recognition of any kind', async () => {
    // The inheritance the vendor documents — a subagent taking the selected
    // parent tools by default, then applying its own filters — is
    // `claude.mcp.selection`'s to record and no surface's to project (FR-009).
    // What the file itself declares is its own content and joins no MCP row
    // (data-model.md § Inventory unit).
    const recognitions = await recognizeAgent(
      [
        '---',
        'name: browser-tester',
        'mcpServers:',
        '  - playwright:',
        '      type: stdio',
        '      command: npx',
        '  - github',
        '---',
        '',
        'Drive the browser.',
        '',
      ].join('\n'),
    );
    expect(recognitions.map((recognition) => recognition.details.kind)).toEqual(['agent']);
    const declared = agentDetailsOf(recognitions).metadata.find(
      (entry) => entry.key === 'mcpServers',
    );
    expect(declared?.value).toEqual({
      kind: 'sequence',
      items: [
        {
          kind: 'mapping',
          entries: [
            {
              key: 'playwright',
              keyKind: 'string',
              value: {
                kind: 'mapping',
                entries: [
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
                ],
              },
            },
          ],
        },
        { kind: 'scalar', scalarKind: 'string', text: 'github' },
      ],
    });
  });

  it('publishes a declared hooks block as the agent\u2019s own metadata for now', async () => {
    // The contained Hook recognition arrives with the Hook phase; until it
    // does, a `hooks` block is one of this file's declarations and nothing
    // else — no hook row, and certainly no command run (FR-019).
    const recognitions = await recognizeAgent(
      [
        '---',
        'name: guarded',
        'hooks:',
        '  PreToolUse:',
        '    - command: ./scripts/validate.sh',
        '---',
        '',
        'x',
        '',
      ].join('\n'),
    );
    expect(recognitions.map((recognition) => recognition.details.kind)).toEqual(['agent']);
    expect(agentDetailsOf(recognitions).metadata.map((entry) => entry.key)).toEqual([
      'name',
      'hooks',
    ]);
  });

  it('publishes a credential and an environment reference exactly as written', async () => {
    const details = agentDetailsOf(
      await recognizeAgent(
        [
          '---',
          'name: secretive',
          `token: ${CONTENT_FIXTURE_SECRET}`,
          'endpoint: ${CLAUDE_AGENT_ENDPOINT}',
          '---',
          '',
          'x',
          '',
        ].join('\n'),
      ),
    );
    expect(details.metadata[1]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: CONTENT_FIXTURE_SECRET,
    });
    expect(details.metadata[2]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: '${CLAUDE_AGENT_ENDPOINT}',
    });
  });

  it('resolves the declared name rather than slicing the authored spelling', async () => {
    // The same rule a skill's name follows: quoting is resolved once under
    // YAML 1.2's core schema, so the identity is the value a product loading
    // the file has (data-model.md § Field reading).
    const details = agentDetailsOf(await recognizeAgent('---\nname: "code-reviewer"\n---\n\nx\n'));
    expect(details.agentName).toBe('code-reviewer');
  });

  it('publishes no name for a non-scalar declaration and keeps it in the metadata', async () => {
    const details = agentDetailsOf(
      await recognizeAgent('---\nname:\n  - one\n  - two\n---\n\nx\n'),
    );
    expect(details.agentName).toBeUndefined();
    expect(details.metadata[0]!.value.kind).toBe('sequence');
  });

  it('fails all-or-nothing and keeps nothing that happened to parse', async () => {
    const recognitions = await recognizeAgent('---\nname: [unterminated\n---\n\n# Broken\n');
    expect(recognitions[0]!.parseStatus).toBe('failed');
    expect(recognitions[0]!.details).toEqual({
      kind: 'agent',
      metadata: [],
      instructionsText: '',
    });
  });

  it('states the duplicate-name uncertainty by listing both files and no winner', async () => {
    // Two files under one tree declaring one name are two recognitions, each
    // naming its own file; nothing here orders them, because the page states
    // that only one loads and names no rule for which
    // (contracts/runtime-composition.md § claude.agents.selection, FR-009).
    const first = agentDetailsOf(await recognizeAgent('---\nname: debugger\n---\n\nA\n'));
    const second = agentDetailsOf(await recognizeAgent('---\nname: debugger\n---\n\nB\n'));
    expect(first.agentName).toBe('debugger');
    expect(second.agentName).toBe('debugger');
    for (const details of [first, second]) {
      const serialized = JSON.stringify(details);
      for (const field of ['precedence', 'winner', 'selected', 'active']) {
        expect(serialized).not.toContain(field);
      }
    }
  });
});
