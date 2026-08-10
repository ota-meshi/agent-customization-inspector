// T140: the Claude skill's declared-name reading and its admission-level
// uncertainty (data-model.md § Field reading, FR-007, FR-009, FR-026,
// FR-028).
//
// Every declared key is read out in the shape the file wrote it — list-valued
// keys, contained `hooks` and MCP declarations, and credential-shaped keys
// alike — with nothing captioned, classified, or resolved on the file's
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
import {
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

const [claudeSkillRule] = CLAUDE_REPOSITORY_RULES;

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
      { key: 'name', value: { kind: 'scalar', text: 'rich' } },
      { key: 'description', value: { kind: 'scalar', text: 'says hello' } },
      {
        key: 'allowed-tools',
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', text: 'Read' },
            { kind: 'scalar', text: 'Bash' },
          ],
        },
      },
      // An authored null declares the key and no value; the mapping below it
      // keeps its own shape all the way down rather than being summarized.
      { key: 'empty', value: { kind: 'absent' } },
      {
        key: 'hooks',
        value: {
          kind: 'mapping',
          entries: [
            {
              key: 'PostToolUse',
              value: {
                kind: 'sequence',
                items: [
                  {
                    kind: 'mapping',
                    entries: [{ key: 'matcher', value: { kind: 'scalar', text: 'Write' } }],
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
      value: { kind: 'scalar', text: 'says hello' },
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
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', text: 'a' },
            { kind: 'scalar', text: 'b' },
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
      expect(recognition.details.kind).toBe('skill');
      expect(recognition.details.kind === 'skill' && 'declaredName' in recognition.details).toBe(
        false,
      );
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
