// T192/T201: recognition-metadata comparison (FR-011, FR-012;
// research.md § 7).
//
// The assertions run against the comparison-building module rather than a
// mounted component: the unit project has no single-file-component compiler
// (the same reason T083 gives), and the decisions under test — which tools
// recognize which side, which declared keys match, and what "equal" means —
// are data decisions the component only draws. What genuinely needs a
// rendered page is asserted against the real app in
// `tests/e2e/skills-comparison.spec.ts`.
//
// The contract: tool recognition is compared per tool, while the files'
// declared metadata — one parse per kind (FR-028) — is matched by exact
// `(kind, declared key)` and compared once, each declaration's resolved
// value structurally, with no ranking, no winner claim, and no fabricated
// rows for data the wire does not carry (relationships ship with no
// recognition in this release, so none may be invented here).
import { describe, expect, it } from 'vitest';

import { frontmatterValuesEqual } from '../../../src/app/components/inspection/declaration-comparison';
import {
  SkillRecognitionComparison,
  type ComparisonSideInput,
} from '../../../src/app/components/skill-comparison/recognition-comparison';
import type {
  FileDetailDto,
  FrontmatterEntryDto,
  SkillDefinitionDto,
} from '../../../src/shared/api-types';

/** One readable skill detail with the given parsed declarations. */
function entryDetail(
  path: string,
  frontmatter: readonly FrontmatterEntryDto[] | null,
): FileDetailDto {
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
    sourceRelativePath: path,
    tool,
    parseStatus,
    invocationName: parseStatus === 'parsed' ? 'greet' : null,
    diagnosticIds: [],
    companionFiles: [],
  };
}

/** A scalar entry, as the parser resolves one; a string key unless said. */
function scalar(
  key: string,
  text: string,
  keyKind: FrontmatterEntryDto['keyKind'] = 'string',
): FrontmatterEntryDto {
  return { key, keyKind, value: { kind: 'scalar', text } };
}

/** One comparison side. */
function side(
  detail: FileDetailDto,
  definitions: readonly SkillDefinitionDto[],
): ComparisonSideInput {
  return { detail, definitions };
}

describe('resolved-value equality', () => {
  it('compares scalars by the value the parser resolved', () => {
    // The DTO carries the resolved value — an authored `007` already arrived
    // as `7` — so equality here is equality of what the vendors' shared YAML
    // reading produces, while the literal spelling difference stays visible in
    // the source diff beside these rows.
    expect(
      frontmatterValuesEqual({ kind: 'scalar', text: '7' }, { kind: 'scalar', text: '7' }),
    ).toBe(true);
    expect(
      frontmatterValuesEqual({ kind: 'scalar', text: '7' }, { kind: 'scalar', text: '8' }),
    ).toBe(false);
  });

  it('compares structures member by member, in authored order', () => {
    // A mapping's entry order is part of the resolved value the surface shows,
    // so reordered entries are a literal difference rather than "the same
    // mapping" — deciding they mean the same thing would be interpretation.
    const ordered = {
      kind: 'mapping',
      entries: [scalar('a', '1'), scalar('b', '2')],
    } as const;
    const reordered = {
      kind: 'mapping',
      entries: [scalar('b', '2'), scalar('a', '1')],
    } as const;
    expect(frontmatterValuesEqual(ordered, ordered)).toBe(true);
    expect(frontmatterValuesEqual(ordered, reordered)).toBe(false);
    expect(
      frontmatterValuesEqual(
        { kind: 'sequence', items: [{ kind: 'scalar', text: 'x' }, { kind: 'absent' }] },
        { kind: 'sequence', items: [{ kind: 'scalar', text: 'x' }, { kind: 'absent' }] },
      ),
    ).toBe(true);
    expect(
      frontmatterValuesEqual(
        { kind: 'sequence', items: [{ kind: 'scalar', text: 'x' }] },
        {
          kind: 'sequence',
          items: [
            { kind: 'scalar', text: 'x' },
            { kind: 'scalar', text: 'y' },
          ],
        },
      ),
    ).toBe(false);
    expect(frontmatterValuesEqual({ kind: 'absent' }, { kind: 'absent' })).toBe(true);
    expect(frontmatterValuesEqual({ kind: 'absent' }, { kind: 'scalar', text: '' })).toBe(false);
  });
});

describe('recognition and declared-metadata comparison', () => {
  it('matches the files’ declared keys once, by (kind, declared key)', () => {
    const left = side(
      entryDetail('.agents/skills/alpha/SKILL.md', [
        scalar('name', 'alpha'),
        scalar('retries', '7'),
        scalar('api_key', 'ghp_LEFT'),
        scalar('only_left', 'yes'),
      ]),
      [definition('.agents/skills/alpha/SKILL.md', 'codex')],
    );
    const right = side(
      entryDetail('.agents/skills/beta/SKILL.md', [
        scalar('name', 'beta'),
        // Authored `007`, resolved `7`: equal as resolved values even though
        // the source spellings differ.
        scalar('retries', '7'),
        scalar('api_key', 'ghp_RIGHT'),
      ]),
      [definition('.agents/skills/beta/SKILL.md', 'codex')],
    );

    const comparison = new SkillRecognitionComparison(left, right);
    expect(comparison.tools.map((row) => [row.tool, row.kind, row.left, row.right])).toEqual([
      ['codex', 'skill', 'recognized', 'recognized'],
    ]);
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.rightDeclarations).toBe('parsed');

    // Key union in first-file authored order, then keys only the second file
    // declares, in its order — no ranking reorders them. One list for the
    // pair: the declarations are the files' one parse, not any tool's, so no
    // tool repeats or captions them (research.md § 7).
    expect(comparison.declarations.map((row) => row.key)).toEqual([
      'name',
      'retries',
      'api_key',
      'only_left',
    ]);
    const byKey = new Map(comparison.declarations.map((row) => [row.key, row]));
    expect(byKey.get('retries')).toMatchObject({ equal: true });
    expect(byKey.get('name')).toMatchObject({ equal: false });
    expect(byKey.get('api_key')).toMatchObject({
      equal: false,
      left: { kind: 'scalar', text: 'ghp_LEFT' },
      right: { kind: 'scalar', text: 'ghp_RIGHT' },
    });
    // A key one file declares and the other does not is a difference shown as
    // the declared value against no declaration — never dropped.
    expect(byKey.get('only_left')).toMatchObject({
      equal: false,
      left: { kind: 'scalar', text: 'yes' },
      right: null,
    });
  });

  it('matches same-spelled keys by their parsed type, never by spelling alone', () => {
    // One spelling can stand for two keys: the parser keeps a numeric `1`
    // apart from a string `"1"`, and both publish the rendered key `1` with
    // their parsed type beside it (api-types.ts § FrontmatterKeyKind).
    // Here the two files declare the same two key-value pairs in opposite
    // authored order; matching by spelling and position would pair the
    // number key's value against the string key's and report two false
    // differences, while the identity match reports what the parser
    // resolved: both keys equal (FR-011, FR-025).
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, [scalar('1', 'alpha', 'number'), scalar('1', 'beta', 'string')]), [
        definition(path, 'codex'),
      ]),
      side(
        entryDetail(otherPath, [scalar('1', 'beta', 'string'), scalar('1', 'alpha', 'number')]),
        [definition(otherPath, 'codex')],
      ),
    );
    expect(comparison.declarations).toHaveLength(2);
    expect(comparison.declarations[0]).toMatchObject({
      key: '1',
      keyKind: 'number',
      left: { kind: 'scalar', text: 'alpha' },
      right: { kind: 'scalar', text: 'alpha' },
      equal: true,
    });
    expect(comparison.declarations[1]).toMatchObject({
      key: '1',
      keyKind: 'string',
      left: { kind: 'scalar', text: 'beta' },
      right: { kind: 'scalar', text: 'beta' },
      equal: true,
    });
  });

  it('shows no-declaration for a typed key only one side declares', () => {
    // The left file declares both the number key `1` and the string key
    // `"1"`; the right declares only the string key. The number key's row is
    // a declaration against none — never dropped, and never matched to the
    // right's same-spelled string key (FR-011).
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, [scalar('1', 'first', 'number'), scalar('1', 'second', 'string')]), [
        definition(path, 'codex'),
      ]),
      side(entryDetail(otherPath, [scalar('1', 'second', 'string')]), [
        definition(otherPath, 'codex'),
      ]),
    );
    expect(comparison.declarations).toHaveLength(2);
    expect(comparison.declarations[0]).toMatchObject({
      key: '1',
      keyKind: 'number',
      left: { kind: 'scalar', text: 'first' },
      right: null,
      equal: false,
    });
    expect(comparison.declarations[1]).toMatchObject({
      key: '1',
      keyKind: 'string',
      left: { kind: 'scalar', text: 'second' },
      right: { kind: 'scalar', text: 'second' },
      equal: true,
    });
  });

  it('publishes the parsed type the kind captions read from', () => {
    // The surfaces caption a key whose parsed type is not the string
    // default; the row publishes the type and the caption is the
    // component's (FR-025).
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, [scalar('name', 'alpha')]), [definition(path, 'codex')]),
      side(entryDetail(otherPath, [scalar('name', 'beta')]), [definition(otherPath, 'codex')]),
    );
    expect(comparison.declarations[0]).toMatchObject({
      key: 'name',
      keyKind: 'string',
    });
  });

  it('keeps a mapping keyed by a number distinct from one keyed by its spelling', () => {
    // The key's identity reaches nested values too: a mapping whose entry is
    // the number key `1` is not the mapping whose entry is the string key
    // `"1"`, however alike they render (FR-011).
    expect(
      frontmatterValuesEqual(
        { kind: 'mapping', entries: [scalar('1', 'x', 'number')] },
        { kind: 'mapping', entries: [scalar('1', 'x', 'string')] },
      ),
    ).toBe(false);
    expect(
      frontmatterValuesEqual(
        { kind: 'mapping', entries: [scalar('1', 'x', 'number')] },
        { kind: 'mapping', entries: [scalar('1', 'x', 'number')] },
      ),
    ).toBe(true);
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
    expect(comparison.declarations).toHaveLength(1);
    expect(comparison.declarations[0]).toMatchObject({
      key: 'name',
      left: { kind: 'scalar', text: 'inner' },
      right: null,
      equal: false,
    });
    // A plain companion beside an absence still fabricates nothing.
    const companion = new SkillRecognitionComparison(
      side(companionDetail('.agents/skills/alpha/notes.md'), []),
      null,
    );
    expect(companion.tools).toEqual([]);
    expect(companion.declarations).toEqual([]);
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
    expect(comparison.declarations).toHaveLength(1);
  });

  it('states per-tool recognition apart from the files’ declaration match', () => {
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
    expect(comparison.declarations.map((row) => [row.key, row.equal])).toEqual([['name', false]]);
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
    expect(comparison.declarations).toEqual([]);
  });

  it('builds no recognition row at all for files no recognition owns', () => {
    // Two census companions compared through the generic path publish no
    // recognition rows and no declaration rows, because the files carry
    // none (T201): their literal sources are the whole comparison.
    const comparison = new SkillRecognitionComparison(
      side(companionDetail('.agents/skills/alpha/agents/openai.yaml'), []),
      side(companionDetail('.agents/skills/beta/agents/openai.yaml'), []),
    );
    expect(comparison.tools).toEqual([]);
    expect(comparison.leftDeclarations).toBe('not-a-skill');
    expect(comparison.rightDeclarations).toBe('not-a-skill');
    expect(comparison.declarations).toEqual([]);
  });

  it('fabricates nothing onto a companion compared against a recognized skill (T201)', () => {
    // A skill against one of its census companions: the skill's recognition
    // stays its own row, the companion side is stated as not recognized and
    // not a skill, and no declaration row is invented for a file that
    // parsed nothing.
    const skillPath = '.agents/skills/alpha/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(skillPath, [scalar('name', 'alpha')]), [definition(skillPath, 'codex')]),
      side(companionDetail('.agents/skills/alpha/agents/openai.yaml'), []),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['codex', 'recognized', 'not-recognized'],
    ]);
    expect(comparison.rightDeclarations).toBe('not-a-skill');
    expect(comparison.declarations).toEqual([]);
  });

  it('publishes descriptive rows only — no rank, no winner, no fabricated relationships', () => {
    const path = '.agents/skills/alpha/SKILL.md';
    const otherPath = '.agents/skills/beta/SKILL.md';
    const comparison = new SkillRecognitionComparison(
      side(entryDetail(path, [scalar('name', 'alpha')]), [definition(path, 'codex')]),
      side(entryDetail(otherPath, [scalar('name', 'beta')]), [definition(otherPath, 'codex')]),
    );
    // The closed shape is the claim (FR-012): the comparison states which
    // recognitions exist and how the files' declarations compare, and
    // nothing else — no ordering verdict, no effectiveness claim, and no
    // relationship rows, because no shipped recognition publishes an edge
    // for the wire to carry (api-types.ts § FileDetailDto). A row holds one
    // key identity and its two resolved values; `equal` is not among its
    // fields because it is derived by a getter from the values it compares,
    // never stored beside them.
    expect(Object.keys(comparison).toSorted()).toEqual([
      'declarations',
      'leftDeclarations',
      'rightDeclarations',
      'tools',
    ]);
    for (const row of comparison.tools) {
      expect(Object.keys(row).toSorted()).toEqual(['kind', 'left', 'right', 'tool']);
    }
    for (const row of comparison.declarations) {
      expect(Object.keys(row).toSorted()).toEqual(['key', 'keyKind', 'left', 'right']);
      expect(typeof row.equal).toBe('boolean');
    }
  });
});
