// T168: the Copilot skill's declared-name reading and its recognition-level
// facts (data-model.md § Field reading, FR-003, FR-007, FR-009, FR-026,
// FR-028).
//
// Copilot reads a skill through the one shared extractor, so these cases pin
// what is Copilot's own: recognitions for exactly the three fixed directory
// spellings, the complete parse published at once — Copilot documents
// metadata-first progressive content loading at runtime, and the recognition
// publishes every declared key and the whole body with no field claiming a
// loading, selection, or surface state — independent same-name recognitions
// with no winner mark (the product-level statement is the registry's derived
// `surface-dependent` rule, `skill-resolution.ts`), no recognition for a
// context Copilot's own rule did not admit, environment-reference
// non-resolution, and the exact admitting evidence on every provenance.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import {
  CONTENT_FIXTURE_SECRET,
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

const [copilotSkillRule] = COPILOT_REPOSITORY_RULES;
const [claudeSkillRule] = CLAUDE_REPOSITORY_RULES;

/**
 * Which authored selector of `copilot.repo.skill` a fixture path matches: the
 * rule ships one program per fixed directory spelling, in registry order.
 */
function copilotSelectorIndexOf(matchedPath: string): number {
  return ['.github/', '.agents/', '.claude/'].findIndex((prefix) => matchedPath.startsWith(prefix));
}

/**
 * Empty skill directories these cases enumerate. The recognizer runs the
 * census itself and propagates an enumeration failure rather than reporting an
 * empty directory, so the paths have to exist — as they do in a real scan,
 * where the traversal found them. Nothing is written into them: what these
 * cases are about is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-copilot-metadata-'));
  mkdirSync(join(root, '.github/skills/greet'), { recursive: true });
  mkdirSync(join(root, '.github/skills/ship'), { recursive: true });
  mkdirSync(join(root, '.agents/skills/orbit'), { recursive: true });
  mkdirSync(join(root, '.claude/skills/lander'), { recursive: true });
  mkdirSync(join(root, 'packages/api/.claude/skills/deploy'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored `SKILL.md` at the given Copilot-admitted path. */
async function recognize(
  sourceText: string,
  matchedPath = '.github/skills/greet/SKILL.md',
): Promise<ToolRecognition> {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [
        {
          compiled: copilotSkillRule!,
          origin: { planIndex: 0, selectorIndex: copilotSelectorIndexOf(matchedPath) },
        },
      ],
      sourceText,
    },
    ['copilot'],
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Copilot recognition');
  }
  return recognition;
}

describe('Copilot skill declared name', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes the name the parser resolved: %s',
    async (_id, testCase) => {
      // The shared authored-content cases pin resolution semantics — quoting,
      // escapes, repeats, aliases, tags, astral characters — and Copilot reads
      // them exactly as Codex and Claude do, through the one shared extractor.
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes the complete parse at once, with no loading or selection field', async () => {
    // Copilot's surfaces discover metadata first and load a relevant skill's
    // content progressively — a runtime fact of the vendor's, recorded in its
    // maintained behavior statements (FR-009). The recognition is not that
    // runtime: it publishes every declared key and the complete instructions
    // in one record, and the exact key sets — the whole record's and its
    // details' — prove no field claims a loading, selection, or surface state
    // on the vendor's behalf (data-model.md § ToolRecognition).
    const recognition = await recognize(
      `---\nname: greet\ndescription: says hello\napi_key: ${CONTENT_FIXTURE_SECRET}\n---\n\n# Greet\n\nSay hello.\n`,
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    // Sorted before comparing: the record is internal and never serialized,
    // so what is closed is the field set, not a property enumeration order.
    expect(Object.keys(recognition).toSorted()).toEqual([
      'details',
      'diagnosticIds',
      'parseStatus',
      'provenances',
      'sourceRelativePath',
      'tool',
    ]);
    expect(Object.keys(recognition.details).toSorted()).toEqual([
      'bodyText',
      'declaredName',
      'frontmatter',
      'kind',
    ]);
    expect(recognition.details.frontmatter).toEqual([
      { key: 'name', keyKind: 'string', value: { kind: 'scalar', text: 'greet' } },
      { key: 'description', keyKind: 'string', value: { kind: 'scalar', text: 'says hello' } },
      {
        key: 'api_key',
        keyKind: 'string',
        value: { kind: 'scalar', text: CONTENT_FIXTURE_SECRET },
      },
    ]);
    expect(recognition.details.bodyText).toBe('\n# Greet\n\nSay hello.\n');
    // Nothing the file did not write: the recognition carries no copy of the
    // complete source, which the detail response serves once as `sourceText`.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
  });

  it('recognizes two same-name files independently, with no winner mark', async () => {
    // `.github/skills/ship` and `.claude/skills/lander` both declare `voyage`.
    // Which one a Copilot surface would select depends on runtime this tool
    // never observes, and the CLI's documented first-found winner is not the
    // product's statement — the grouped row derives `surface-dependent` from
    // the three shipped selection strategies (`skill-resolution.ts`, FR-007).
    // Each recognition therefore publishes only its own file's facts.
    const [ship, lander] = await Promise.all([
      recognize('---\nname: voyage\n---\n\nGitHub ship.\n', '.github/skills/ship/SKILL.md'),
      recognize('---\nname: voyage\n---\n\nClaude lander.\n', '.claude/skills/lander/SKILL.md'),
    ]);
    for (const recognition of [ship, lander]) {
      expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
        'voyage',
      );
      // The closed record and details key sets, sorted before comparing —
      // enumeration order is not a contract of an internal record: a winner
      // or order mark on either level would widen one of them (data-model.md
      // § ToolRecognition).
      expect(Object.keys(recognition).toSorted()).toEqual([
        'details',
        'diagnosticIds',
        'parseStatus',
        'provenances',
        'sourceRelativePath',
        'tool',
      ]);
      expect(Object.keys(recognition.details).toSorted()).toEqual([
        'bodyText',
        'declaredName',
        'frontmatter',
        'kind',
      ]);
    }
    expect(ship.provenances.map((provenance) => provenance.matchedPath)).toEqual([
      '.github/skills/ship/SKILL.md',
    ]);
    expect(lander.provenances.map((provenance) => provenance.matchedPath)).toEqual([
      '.claude/skills/lander/SKILL.md',
    ]);
    // Each recognition carries its own file's instructions: a shared name is
    // not a shared identity, and reusing another file's details by name would
    // keep every assertion above passing.
    expect(ship.details.kind === 'skill' && ship.details.bodyText).toBe('\nGitHub ship.\n');
    expect(lander.details.kind === 'skill' && lander.details.bodyText).toBe('\nClaude lander.\n');
  });

  it('shares one parse across the tools recognizing one physical file', async () => {
    // A root `.claude` skill is one candidate two products admit. What the
    // file declares does not depend on which product reads it, so both
    // recognitions publish the one extraction — the same declarations and the
    // same instructions — rather than two parses that could disagree
    // (data-model.md § ToolRecognition).
    const matchedPath = '.claude/skills/lander/SKILL.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [
          {
            compiled: copilotSkillRule!,
            origin: { planIndex: 0, selectorIndex: copilotSelectorIndexOf(matchedPath) },
          },
          { compiled: claudeSkillRule!, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
        sourceText: '---\nname: lander-skill\ndescription: shared\n---\n\n# Lander\n',
      },
      ['copilot', 'claude'],
    );
    expect(recognitions.map((recognition) => recognition.tool)).toEqual(['copilot', 'claude']);
    const [copilot, claude] = recognitions;
    expect(copilot!.details).toEqual(claude!.details);
    if (copilot!.details.kind !== 'skill' || claude!.details.kind !== 'skill') {
      throw new Error('expected skill recognitions');
    }
    // Identity, not equality: two parses of the same text would produce equal
    // but distinct values, so the shared array is what proves the extraction
    // ran once and both recognitions publish it.
    expect(copilot!.details.frontmatter).toBe(claude!.details.frontmatter);
    expect(copilot!.details.declaredName).toBe('lander-skill');
  });

  it('recognizes nothing for a context Copilot’s own rule did not admit', async () => {
    // A nested `.claude` skill is Claude's alone: Claude documents lazy
    // descendant discovery and Copilot documents no downward lookup from a
    // root context, so the candidate arrives with Claude's admission only
    // (FR-003). Asked for Copilot, the engine invents no recognition — the
    // same silence a configured or environment-supplied skills root gets by
    // never being admitted at all.
    const matchedPath = 'packages/api/.claude/skills/deploy/SKILL.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeSkillRule!, origin: { planIndex: 1, selectorIndex: 0 } }],
        sourceText: '---\nname: nested\n---\n',
      },
      ['copilot'],
    );
    expect(recognitions).toEqual([]);
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

  it('resolves no environment reference the declared name contains', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response (FR-026).
    const recognition = await recognize('---\nname: "$HOME/${TOKEN}"\n---\n');
    expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
      '$HOME/${TOKEN}',
    );
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('records the admitting rule and matched path on each fixed spelling’s provenance', async () => {
    // One admission per fixed directory spelling, each read-authorized by the
    // one `copilot.repo.skill` record (contracts/inspection-path-allowlist.md
    // § Read authorization). Field by field rather than a deep equality: a
    // provenance derives its rule identifiers from the compiled rule it
    // holds, and an equality matcher's clone has no class behind those
    // getters.
    for (const matchedPath of [
      '.github/skills/greet/SKILL.md',
      '.agents/skills/orbit/SKILL.md',
      '.claude/skills/lander/SKILL.md',
    ]) {
      const recognition = await recognize('---\nname: placed\n---\n', matchedPath);
      expect(recognition.provenances).toHaveLength(1);
      const [provenance] = recognition.provenances;
      expect(provenance!.ruleId).toBe('copilot.repo.skill');
      expect(provenance!.discoveryClass).toBe('static-candidate');
      expect(provenance!.matchedPath).toBe(matchedPath);
    }
  });
});
