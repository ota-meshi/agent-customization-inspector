// T1209: the rows of a side-by-side source comparison — alignment, the
// pairing of a replaced run of lines with its replacement, the characters a
// changed line marks, and the cut of shiki's runs at those characters
// (research.md § 7, FR-011, FR-025).
//
// The real `diff` and the real shiki run here rather than doubles: what is
// under test is what this product asks of them — that the comparison is
// literal, whitespace included, and that a line's runs come out cut exactly at
// its changed characters with their colour kept — and those are their
// answers, which a stub would only restate.
import { describe, expect, it } from 'vitest';
import { highlightSource } from '../../../src/app/composables/syntax-highlighting';
import {
  LineComparison,
  changedCharacters,
  splitRunsAtRanges,
} from '../../../src/app/components/comparison/source-diff-rows';

/** Each row as `kind:original/modified`, with `-` for a side that shows nothing. */
function rowSummary(comparison: LineComparison): string[] {
  return comparison.rows.map((row) => `${row.kind}:${row.original ?? '-'}/${row.modified ?? '-'}`);
}

describe('LineComparison', () => {
  it('stands unchanged lines opposite each other and marks what each side alone has', () => {
    const comparison = new LineComparison('a\nb\nc\n', 'a\nc\nd\n');
    expect(rowSummary(comparison)).toEqual([
      'same:0/0',
      'removed:1/-',
      'same:2/1',
      'added:-/2',
      // The trailing newline ends an empty last line on both sides, as the
      // tokenizer counts it.
      'same:3/3',
    ]);
  });

  it('pairs a replaced run with its replacement line by line, and the rest as one side’s own', () => {
    // Two lines replaced by three: the first two stand opposite their
    // replacements as changed rows, and the third replacement is an addition.
    const comparison = new LineComparison('x\ny\n', 'X\nY\nZ\n');
    expect(rowSummary(comparison)).toEqual(['changed:0/0', 'changed:1/1', 'added:-/2', 'same:2/3']);
  });

  it('compares lines literally, whitespace and endings included (FR-011)', () => {
    // A trailing space and a Windows ending are differences a reader can
    // act on, so neither is folded away.
    expect(rowSummary(new LineComparison('a \n', 'a\n'))).toEqual(['changed:0/0', 'same:1/1']);
    expect(rowSummary(new LineComparison('a\r\nb', 'a\nb'))).toEqual(['same:0/0', 'same:1/1']);
    // The lines themselves are split where the tokenizer splits them: at
    // either ending, with the ending dropped from the line.
    expect(new LineComparison('a\r\nb', '').originalLines).toEqual([
      ['a', 0],
      ['b', 3],
    ]);
  });

  it('renders an absent side as blank rows opposite the present side’s every line', () => {
    // A one-sided comparison: the present side is the whole difference.
    const comparison = new LineComparison('', 'only\nhere');
    expect(comparison.sideLines('original', null).map((line) => line.kind)).toEqual([
      'removed',
      'absent',
    ]);
    expect(comparison.sideLines('modified', null).map((line) => line.kind)).toEqual([
      'added',
      'added',
    ]);
  });

  it('shows each side’s lines numbered from its own text, blanks unnumbered', () => {
    const comparison = new LineComparison('a\nb', 'a\nx\nb');
    expect(comparison.sideLines('original', null).map((line) => line.number)).toEqual([1, null, 2]);
    expect(comparison.sideLines('modified', null).map((line) => line.number)).toEqual([1, 2, 3]);
  });

  it('marks a changed row as removed on the original side and added on the modified', () => {
    const comparison = new LineComparison('old', 'new');
    expect(comparison.sideLines('original', null)[0]?.kind).toBe('removed');
    expect(comparison.sideLines('modified', null)[0]?.kind).toBe('added');
  });

  it('shows a line as one uncoloured run, its changed words cut out, before its colour arrives', () => {
    const comparison = new LineComparison('name: greet', 'name: greet loudly');
    const [line] = comparison.sideLines('modified', null);
    expect(line?.runs.map((run) => [run.content, run.changed, run.htmlStyle])).toEqual([
      ['name: greet', false, undefined],
      [' loudly', true, undefined],
    ]);
  });

  it('keeps each run’s colour across the cut once the runs arrive', async () => {
    const original = 'description: Reviews code\n';
    const modified = 'description: Reviews code carefully\n';
    const comparison = new LineComparison(original, modified);
    const runs = await highlightSource(modified, 'yaml');
    const [line] = comparison.sideLines('modified', runs);
    const pieces = line!.runs.map(
      (run) => `${run.changed ? '[' : ''}${run.content}${run.changed ? ']' : ''}`,
    );
    expect(pieces.join('|')).toBe('description|: |Reviews code|[ carefully]');
    // The changed piece was cut out of the string run and keeps that run's
    // colour variables rather than losing them at the cut.
    const changed = line!.runs.find((run) => run.changed)!;
    const unchanged = line!.runs.find((run) => run.content === 'Reviews code')!;
    expect(changed.htmlStyle).toEqual(unchanged.htmlStyle);
    expect(Object.keys(changed.htmlStyle ?? {})).toEqual(
      expect.arrayContaining(['--shiki-light', '--shiki-dark']),
    );
  });
});

describe('changedCharacters', () => {
  it('names the words of a line its opposite lacks, the whitespace between words compared too', () => {
    expect(changedCharacters('a  b', 'a b').map((range) => [range.start, range.end])).toEqual([
      [1, 3],
    ]);
    expect(changedCharacters('same', 'same')).toEqual([]);
  });
});

describe('splitRunsAtRanges', () => {
  it('cuts a run at a range boundary inside it and leaves runs outside every range whole', () => {
    const runs = [
      { content: 'ab', offset: 10, htmlStyle: { '--shiki-light': '#1' } },
      { content: 'cdef', offset: 12, htmlStyle: { '--shiki-light': '#2' } },
    ];
    const pieces = splitRunsAtRanges(runs, 10, [{ start: 3, end: 5 }]);
    expect(
      pieces.map((piece) => [piece.content, piece.changed, piece.htmlStyle?.['--shiki-light']]),
    ).toEqual([
      ['ab', false, '#1'],
      ['c', false, '#2'],
      ['de', true, '#2'],
      ['f', false, '#2'],
    ]);
  });
});
