// T192/T201: recognition-metadata comparison (FR-011, FR-012;
// research.md § 7).
//
// The assertions run against the comparison-building module rather than a
// mounted component: the unit project has no single-file-component compiler
// (the same reason T083 gives), and the decisions under test — which tools
// recognize which side, and what each side's frontmatter serializes to —
// are data decisions the component only draws. What genuinely needs a
// rendered page is asserted against the real app in
// `tests/e2e/skills-comparison.spec.ts`.
//
// The contract: tool recognition is compared per tool, while the files'
// declared metadata — one parse per kind (FR-028) — serializes to one
// canonical YAML document per side, `name` and `description` leading and
// every other key sorted, for Monaco to diff (frontmatter-yaml.ts), with no
// ranking, no winner claim, and nothing fabricated for data the wire does
// not carry (relationships ship with no recognition in this release, so
// none may be invented here).
import { describe, expect, it } from 'vitest';

import {
  SkillRecognitionComparison,
  type ComparisonSideInput,
} from '../../../src/app/components/skill-comparison/recognition-comparison';
import type {
  FileDetailDto,
  DeclaredEntryDto,
  SkillDefinitionDto,
} from '../../../src/shared/api-types';

/** One readable skill detail with the given parsed declarations. */
function entryDetail(path: string, frontmatter: readonly DeclaredEntryDto[] | null): FileDetailDto {
  return {
    kind: 'skill',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath: path,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: 'fixture source',
      sizeBytes: 14,
    },
    diagnostics: [],
    presentation: frontmatter === null ? null : { frontmatter, bodyText: 'body' },
  };
}

/** One census-companion detail: a file no recognition owns. */
function companionDetail(path: string): FileDetailDto {
  return {
    kind: 'file',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath: path,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: 'plain companion',
      sizeBytes: 15,
    },
    diagnostics: [],
  };
}

/** One definition of the file, defaulting to a completed parse. */
function definition(
  path: string,
  tool: SkillDefinitionDto['tool'],
  parseStatus: SkillDefinitionDto['parseStatus'] = 'parsed',
): SkillDefinitionDto {
  return {
    sourceId: 'source-repository',
    sourceRelativePath: path,
    tool,
    surfaces: [],
    parseStatus,
    diagnosticIds: [],
    companionFiles: [],
  };
}

/** A scalar entry, as the parser resolves one; a string key unless said. */
function scalar(
  key: string,
  text: string,
  keyKind: DeclaredEntryDto['keyKind'] = 'string',
): DeclaredEntryDto {
  return { key, keyKind, value: { kind: 'scalar', scalarKind: 'string', text } };
}

/** One comparison side. */
function side(
  detail: FileDetailDto,
  definitions: readonly SkillDefinitionDto[],
): ComparisonSideInput {
  return { detail, definitions };
}

describe('recognition and declared-metadata comparison', () => {
  it('serializes both parsed sides to canonical YAML documents for the diff', () => {
    // The frontmatter diff mounts one canonical document per side: `name`
    // and `description` lead, every other key — and every nested mapping's
    // keys — sorts, and sequence items keep their order, so the two sides
    // align line by line whatever order each file authored (FR-011).
    const leftPath = '.agents/skills/alpha/SKILL.md';
    const rightPath = '.claude/skills/alpha/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(
        entryDetail(leftPath, [
          scalar('zeta', 'left-extra'),
          scalar('description', 'first copy'),
          scalar('name', 'alpha'),
        ]),
        [definition(leftPath, 'codex')],
      ),
      side(
        entryDetail(rightPath, [
          scalar('name', 'alpha'),
          scalar('description', 'second copy'),
          scalar('agent', 'reviewer'),
        ]),
        [definition(rightPath, 'claude')],
      ),
    );
    expect(comparison.frontmatterDiff).toEqual({
      originalText: ['name: alpha', 'description: first copy', 'zeta: left-extra', ''].join('\n'),
      modifiedText: ['name: alpha', 'description: second copy', 'agent: reviewer', ''].join('\n'),
      originalAbsent: false,
      modifiedAbsent: false,
    });
  });

  it('keeps the present side’s recognitions beside a stated absent counterpart (T203)', () => {
    // A one-sided pair passes its absent side as null: an independently
    // admitted companion — a nested `SKILL.md` above all — keeps its own
    // recognitions’ rows, with the absence as its own side state rather
    // than a fabricated file that declares nothing (FR-025).
    const path = '.agents/skills/alpha/.claude/skills/inner/SKILL.md';
    const present = side(entryDetail(path, [scalar('name', 'inner')]), [
      definition(path, 'claude'),
    ]);
    const comparison = new SkillRecognitionComparison(present, null);
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['claude', 'recognized', 'file-absent'],
    ]);
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.rightDeclarations).toBe('file-absent');
    // The absent side is the empty diff operand: the present document
    // renders as the difference, and the labels state the absence (FR-025).
    expect(comparison.frontmatterDiff).toEqual({
      originalText: 'name: inner\n',
      modifiedText: '',
      originalAbsent: false,
      modifiedAbsent: true,
    });
    // A plain companion beside an absence still fabricates nothing.
    const companion = new SkillRecognitionComparison(
      side(companionDetail('.agents/skills/alpha/notes.md'), []),
      null,
    );
    expect(companion.tools).toEqual([]);
    expect(companion.frontmatterDiff).toBeNull();
  });

  it('declares nothing for a companion that is its own recognition of another kind', () => {
    // An `AGENTS.md` inside a skill directory is a census companion here and a
    // Copilot instruction file in its own right, so `get-file-detail` answers
    // with the instructions variant and its parse (session.ts § fileDetail).
    // No skill definition owns it, so it declares nothing on this surface —
    // taking the parse would publish an instruction file's declarations as the
    // skill's declared metadata.
    const path = '.agents/skills/alpha/AGENTS.md';
    const asInstructions: FileDetailDto = {
      kind: 'instructions',
      file: {
        sourceId: 'source-repository',
        sourceRelativePath: path,
        diagnosticIds: [],
        encoding: 'utf-8',
        hadLeadingBom: false,
        sourceText: 'fixture source',
        sizeBytes: 14,
      },
      diagnostics: [],
      presentation: { frontmatter: [scalar('applyTo', '**')], bodyText: 'body' },
    };
    const comparison = new SkillRecognitionComparison(
      side(asInstructions, []),
      side(companionDetail('.claude/skills/alpha/AGENTS.md'), []),
    );
    expect(comparison.leftDeclarations).toBe('not-a-skill');
    expect(comparison.rightDeclarations).toBe('not-a-skill');
    expect(comparison.frontmatterDiff).toBeNull();
  });

  it('publishes one recognition row per recognizing tool, in the contracted tool order', () => {
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const frontmatter = [scalar('name', 'alpha')];
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, frontmatter), [
        definition(path, 'copilot'),
        definition(path, 'codex'),
      ]),
      side(entryDetail(otherPath, frontmatter), [
        definition(otherPath, 'copilot'),
        definition(otherPath, 'codex'),
      ]),
    );
    // The contracted tool order, not a preference: each recognition remains
    // distinguishable from the physical file (US3 scenario 2). The declared
    // keys stay one list however many tools recognize both sides — they are
    // the files' one parse, published once (research.md § 7).
    expect(comparison.tools.map((row) => row.tool)).toEqual(['copilot', 'codex']);
    expect(comparison.frontmatterDiff).not.toBeNull();
  });

  it('states per-tool recognition apart from the files’ frontmatter diff', () => {
    // Disjoint recognitions — a `.claude` copy Claude alone recognizes
    // against an `.agents` copy Codex alone does: each tool's row states
    // its unrecognized side, while the declared metadata still compares,
    // because the declarations are the files' parses and both parsed
    // (research.md § 7).
    const comparison = new SkillRecognitionComparison(
      side(entryDetail('.claude/skills/alpha/SKILL.md', [scalar('name', 'alpha')]), [
        definition('.claude/skills/alpha/SKILL.md', 'claude'),
      ]),
      side(entryDetail('.agents/skills/beta/SKILL.md', [scalar('name', 'beta')]), [
        definition('.agents/skills/beta/SKILL.md', 'codex'),
      ]),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['claude', 'recognized', 'not-recognized'],
      ['codex', 'not-recognized', 'recognized'],
    ]);
    expect(comparison.frontmatterDiff).toEqual({
      originalText: 'name: alpha\n',
      modifiedText: 'name: beta\n',
      originalAbsent: false,
      modifiedAbsent: false,
    });
  });

  it('states a failed extraction as unknown declarations, not as empty ones', () => {
    const comparison = new SkillRecognitionComparison(
      side(entryDetail('.agents/skills/alpha/SKILL.md', [scalar('name', 'alpha')]), [
        definition('.agents/skills/alpha/SKILL.md', 'codex'),
      ]),
      side(entryDetail('.agents/skills/broken/SKILL.md', null), [
        definition('.agents/skills/broken/SKILL.md', 'codex', 'failed'),
      ]),
    );
    // Recognition is the definition's existence; the parse is the file's own
    // fact, so the failed side stays a recognized side whose declarations
    // are unknown (FR-028): comparing the parsed side's values against
    // "nothing declared" would state a difference no parse established.
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['codex', 'recognized', 'recognized'],
    ]);
    expect(comparison.rightDeclarations).toBe('extraction-failed');
    expect(comparison.frontmatterDiff).toBeNull();
  });

  it('reads the parse off whatever Markdown variant the path answered with', () => {
    // `get-file-detail` is addressed by the path alone and answers with the
    // first variant its fixed order reaches (session.ts § fileDetail), which
    // is that function's business rather than this surface's. Every
    // parse-carrying variant holds the same parse for the same bytes, so
    // requiring this kind's own variant here would state a parsed file's
    // declarations as unknown and suppress the frontmatter diff.
    const leftPath = '.agents/skills/alpha/SKILL.md';
    const rightPath = '.claude/skills/alpha/SKILL.md';
    const asSkill = entryDetail(leftPath, [scalar('name', 'alpha'), scalar('zeta', 'left')]);
    if (asSkill.kind !== 'skill') {
      throw new Error('expected this kind’s variant from the helper');
    }
    const otherVariant: FileDetailDto = {
      kind: 'instructions',
      file: asSkill.file,
      presentation: asSkill.presentation,
      diagnostics: asSkill.diagnostics,
    };
    const comparison = new SkillRecognitionComparison(
      side(otherVariant, [definition(leftPath, 'claude')]),
      side(entryDetail(rightPath, [scalar('name', 'alpha')]), [definition(rightPath, 'claude')]),
    );
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.rightDeclarations).toBe('parsed');
    expect(comparison.frontmatterDiff).toEqual({
      originalText: ['name: alpha', 'zeta: left', ''].join('\n'),
      modifiedText: 'name: alpha\n',
      originalAbsent: false,
      modifiedAbsent: false,
    });
  });

  it('builds no recognition row at all for files no recognition owns', () => {
    // Two census companions compared through the generic path publish no
    // recognition rows and no serialized declaration document, because the
    // files carry none (T201): their literal sources are the whole comparison.
    const comparison = new SkillRecognitionComparison(
      side(companionDetail('.agents/skills/alpha/agents/openai.yaml'), []),
      side(companionDetail('.agents/skills/beta/agents/openai.yaml'), []),
    );
    expect(comparison.tools).toEqual([]);
    expect(comparison.leftDeclarations).toBe('not-a-skill');
    expect(comparison.rightDeclarations).toBe('not-a-skill');
    expect(comparison.frontmatterDiff).toBeNull();
  });

  it('fabricates nothing onto a companion compared against a recognized skill (T201)', () => {
    // A skill against one of its census companions: the skill's recognition
    // stays its own row, the companion side is stated as not recognized and
    // not a skill, and no serialized declaration document is invented for a
    // file that parsed nothing.
    const skillPath = '.agents/skills/alpha/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(skillPath, [scalar('name', 'alpha')]), [definition(skillPath, 'codex')]),
      side(companionDetail('.agents/skills/alpha/agents/openai.yaml'), []),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['codex', 'recognized', 'not-recognized'],
    ]);
    expect(comparison.rightDeclarations).toBe('not-a-skill');
    expect(comparison.frontmatterDiff).toBeNull();
  });

  it('publishes descriptive rows only — no rank, no winner, no fabricated relationships', () => {
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, [scalar('name', 'alpha')]), [definition(path, 'codex')]),
      side(entryDetail(otherPath, [scalar('name', 'beta')]), [definition(otherPath, 'codex')]),
    );
    // The closed shape is the claim (FR-012): the comparison states which
    // recognitions exist and what each side's frontmatter serializes to,
    // and nothing else — no ordering verdict, no effectiveness claim, and
    // no relationship rows, because no shipped recognition publishes an
    // edge for the wire to carry (api-types.ts § FileDetailDto).
    expect(Object.keys(comparison).toSorted()).toEqual([
      'bodyDiff',
      'frontmatterDiff',
      'leftDeclarations',
      'rightDeclarations',
      'tools',
    ]);
    for (const row of comparison.tools) {
      // The surfaces each recognizing side states beside its recognition
      // (FR-009); nothing else joins the row.
      expect(Object.keys(row).toSorted()).toEqual([
        'left',
        'leftSurfaces',
        'right',
        'rightSurfaces',
        'tool',
      ]);
    }
    expect(Object.keys(comparison.frontmatterDiff ?? {}).toSorted()).toEqual([
      'modifiedAbsent',
      'modifiedText',
      'originalAbsent',
      'originalText',
    ]);
  });
});
