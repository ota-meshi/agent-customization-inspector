// T078: the Codex skill's declared-name reading (data-model.md § Field
// reading, FR-007, FR-028).
//
// The name is the one authored value recognition uses as identity: the key of
// a grouped inventory row and the heading a detail page shows. These cases pin
// its resolution semantics — the value a product loading the file has — while
// the detail-specific case proves every authored frontmatter entry,
// credential-shaped keys included, reaches the recognition in authored order.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendor } from '../../../src/server/inspection/recognizers/candidate';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import {
  CONTENT_FIXTURE_SECRET,
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognitionDto } from '../../../src/shared/api-types';

const [codexSkillRule] = CODEX_REPOSITORY_RULES;

/**
 * An empty skill directory these cases enumerate. The recognizer runs the
 * census itself and propagates an enumeration failure rather than reporting an
 * empty directory, so the path has to exist — as it does in a real scan, where
 * the traversal found it. Nothing is written into it: what these cases are
 * about is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-codex-metadata-'));
  mkdirSync(join(root, '.agents/skills/greet'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored `SKILL.md` at the fixture path. */
async function recognize(sourceText: string): Promise<ToolRecognitionDto> {
  const matchedPath = '.agents/skills/greet/SKILL.md';
  const { recognitions } = await recognizeCandidateForVendor(
    {
      fileId: 'file-1',
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: codexSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    'codex',
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Codex recognition');
  }
  return recognition;
}

describe('Codex skill declared name', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes the name the parser resolved: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes the declarations and the instructions apart', async () => {
    // The detail surface is built from this: the keys the file declares, in
    // authored order, and the body with its frontmatter block removed. The
    // split is the parser's, so the two never overlap and nothing is invented.
    const recognition = await recognize(
      `---\nname: greet\ndescription: says hello\napi_key: ${CONTENT_FIXTURE_SECRET}\n---\n\n# Greet\n`,
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter).toEqual([
      { key: 'name', value: { kind: 'scalar', text: 'greet' } },
      { key: 'description', value: { kind: 'scalar', text: 'says hello' } },
      { key: 'api_key', value: { kind: 'scalar', text: CONTENT_FIXTURE_SECRET } },
    ]);
    expect(recognition.details.bodyText).toBe('\n# Greet\n');
    // Nothing the file did not write: the recognition carries no copy of the
    // complete source, which the detail response serves once as `sourceText`.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
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

  it('records the admitting rule and the path it matched on every provenance', async () => {
    const recognition = await recognize('---\nname: greet\n---\n');
    expect(recognition.provenances).toEqual([
      {
        ruleId: 'codex.repo.skill',
        discoveryClass: 'static-candidate',
        matchedPath: '.agents/skills/greet/SKILL.md',
      },
    ]);
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
});
