// T078: Codex `skill` metadata recognition against its presentation allowlist
// (contracts/vendors/openai-codex.md § Normative initial-release presentation
// allowlist, FR-007, FR-028).
//
// The allowlist is a closed membership test, not a starting point. The Codex
// `skill` row names exactly `codex.skill.name` and `codex.skill.description`,
// so an authored key outside it produces no entry however meaningful it looks —
// and no field is inferred from a key's shape or name. These tests are what
// keeps that from drifting into "extract whatever the frontmatter has".
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCodexCandidate } from '../../../src/server/inspection/recognizers/codex';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import {
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
  const { recognitions } = await recognizeCodexCandidate({
    fileId: 'file-1',
    matchedPath,
    absolutePath: join(root, matchedPath),
    sourceRoot: root,
    admissions: [{ compiled: codexSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
    sourceText,
  });
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Codex recognition');
  }
  return recognition;
}

describe('Codex skill metadata', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes exactly the allowlisted fields: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const byField = new Map(
        recognition.declaredMetadata.map((entry) => [entry.fieldId, entry.value]),
      );
      expect(byField.get('codex.skill.name') ?? null).toBe(testCase.name);
      expect(byField.get('codex.skill.description') ?? null).toBe(testCase.description);
      // Nothing outside the two allowlisted field IDs is ever published, and one
      // entry per field: the map above would have collapsed a repeat.
      expect(byField.size).toBe(recognition.declaredMetadata.length);
      expect(
        recognition.declaredMetadata.every(
          (entry) =>
            entry.fieldId === 'codex.skill.name' || entry.fieldId === 'codex.skill.description',
        ),
      ).toBe(true);
    },
  );

  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'declares the identity its name field resolved to: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      // The same value the field publishes, because there is one: a row and a
      // detail view that disagreed about a skill's name would be two readings
      // of one file.
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes the fields in the allowlist row\u2019s order, not the file\u2019s', async () => {
    // The row is the presentation order, so two skills read the same way
    // whichever order their authors happened to write the keys in.
    const recognition = await recognize('---\ndescription: d\nname: n\n---\n');
    expect(recognition.declaredMetadata).toEqual([
      { fieldId: 'codex.skill.name', value: 'n' },
      { fieldId: 'codex.skill.description', value: 'd' },
    ]);
  });

  it.each(MALFORMED_SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'fails the whole recognition without publishing partial metadata: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('failed');
      expect(recognition.declaredMetadata).toEqual([]);
      // The file itself is unaffected: it stays an admitted, readable
      // candidate whose complete source the detail route serves (FR-028).
      expect(recognition.details.kind).toBe('skill');
    },
  );

  it('records the admitting rule and its documentation state on every provenance', async () => {
    const recognition = await recognize('---\nname: greet\n---\n');
    const [provenance] = recognition.provenances;
    expect(provenance?.ruleId).toBe('codex.repo.skill');
    expect(provenance?.discoveryClass).toBe('static-candidate');
    // Record by record, never a scalar: a reduction would hide that the
    // strategy is only partially documented while the rule is documented.
    expect(provenance?.evidenceAssessments).toEqual([
      {
        subjectKind: 'behavior',
        subjectId: 'codex.behavior.repo.skills',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'rule',
        subjectId: 'codex.repo.skill',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'strategy',
        subjectId: 'codex.skills.discovery',
        documentationStatus: 'partially-documented',
        lifecycleQualifiers: [],
      },
    ]);
  });

  it('resolves no environment reference an authored value contains', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response.
    const recognition = await recognize('---\ndescription: "$HOME/${TOKEN}"\n---\n');
    expect(recognition.declaredMetadata[0]?.value).toBe('$HOME/${TOKEN}');
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });
});
