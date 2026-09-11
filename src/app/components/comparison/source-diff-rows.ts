// The rows of a side-by-side source comparison (T1209; research.md § 7,
// FR-011, FR-025): which line of each side stands opposite which, what kind of
// difference a row is, and which characters of a changed line differ.
//
// The diff is VS Code's own, published apart from the editor as `vscode-diff`
// — the `defaultLinesDiffComputer` its diff editor runs, and nothing else of
// it. What that buys is every judgment a comparison has to make and this
// repository would otherwise be inventing: which line of a replaced run a line
// is read against, where a mark begins and ends, whether a run two values
// happen to spell alike is common text or a coincidence between two changes.
// Those readings are tuned against the diffs people look at all day, and a
// reader arrives here already knowing what they mean.
//
// It is asked twice, because this surface draws two things the editor decides
// under two settings. `ignoreTrimWhitespace: true` reports only the lines that
// differ past their whitespace, which is where a row stands: a line the other
// side kept two spaces further in stays opposite that line rather than
// opposite whatever took its position. `ignoreTrimWhitespace: false` reports
// every character that differs, which is what a mark covers: those two spaces,
// rather than the whole indentation on both sides. The line alignment behind
// the two answers is one — the computer hashes trimmed lines whichever way the
// setting is set — so the rows of the first and the marks of the second
// describe the same comparison.
//
// Nothing is trimmed, folded, or normalized on the way in: each side is the
// exact string the caller committed, and every line of it is shown as authored
// (FR-025).
//
// Lines are split where the tokenizer splits them (`shiki/core` § splitLines),
// so a row's line index is the index of the same line among the runs
// `highlightSource` returns: one splitter, and the two never disagree about
// where a line ends or how many there are.
import { splitLines } from 'shiki/core';
import { linesDiffComputers, type RangeMapping } from 'vscode-diff';

/**
 * What a row of the comparison is.
 *
 * - `same`: both sides show the line, identical.
 * - `added`: only the modified side has the line.
 * - `removed`: only the original side has the line.
 * - `changed`: each side shows a line the other does not have, stood opposite
 *   each other because the diff matched them — the same line at another
 *   indentation, or the line that took its position in a replaced run; their
 *   differing characters are marked ({@link LineComparison.sideLines}).
 */
export type ComparisonRowKind = 'same' | 'added' | 'removed' | 'changed';

/** The two sides of a comparison, named by what each text is to the diff. */
export type SourceDiffSide = 'original' | 'modified';

/**
 * One row: the line each side shows on it, by index into that side's lines,
 * or null where the side shows nothing because the row is the other side's
 * addition or removal. Constructed only by {@link LineComparison}.
 */
export class ComparisonRow {
  /** Which kind of difference the row is. */
  readonly kind: ComparisonRowKind;

  /** The original side's line on this row, or null on an `added` row. */
  readonly original: number | null;

  /** The modified side's line on this row, or null on a `removed` row. */
  readonly modified: number | null;

  /** Binds the row to the lines it aligns. */
  public constructor(kind: ComparisonRowKind, original: number | null, modified: number | null) {
    this.kind = kind;
    this.original = original;
    this.modified = modified;
  }
}

/**
 * A range of characters within one line, `[start, end)` in code units from
 * the line's first character. Constructed only by {@link markLine}.
 */
export class CharacterRange {
  /** The first character in the range. */
  readonly start: number;

  /** One past the last character in the range. */
  readonly end: number;

  /** Binds the range to its bounds. */
  public constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }
}

/**
 * What a run needs to be cut at the changed characters: shiki's `ThemedToken`
 * has these three, and so does the one uncoloured run a line is shown as
 * before its colour arrives.
 */
export interface ColouredRun {
  /** The run's characters. */
  readonly content: string;
  /** The run's first character, as an offset into the whole text. */
  readonly offset: number;
  /** The dual-theme colour variables shiki gave the run, or none for the uncoloured run. */
  readonly htmlStyle?: Readonly<Record<string, string>> | undefined;
}

/**
 * One run of a shown line: its characters, the colour variables shiki gave
 * them, and whether they are among the line's changed characters. Constructed
 * only by {@link splitRunsAtRanges}.
 */
export class ComparisonRun {
  /** The run's characters, exactly as authored. */
  readonly content: string;

  /** The colour variables of the run this was cut from; see {@link ColouredRun.htmlStyle}. */
  readonly htmlStyle: Readonly<Record<string, string>> | undefined;

  /** Whether every character of the run is one the diff marked as changed. */
  readonly changed: boolean;

  /** Binds the run to the piece of the line it shows. */
  public constructor(
    content: string,
    htmlStyle: Readonly<Record<string, string>> | undefined,
    changed: boolean,
  ) {
    this.content = content;
    this.htmlStyle = htmlStyle;
    this.changed = changed;
  }
}

/**
 * What one side shows on one row, as the side's `pre` renders it.
 *
 * - `same`, `added`, `removed`: the side's line, numbered, with the
 *   difference the row is on this side — a `changed` row is a removed line
 *   on the original side and an added line on the modified side.
 * - `absent`: the side shows nothing on this row; the row is the other
 *   side's addition or removal, and the blank keeps the two sides' rows
 *   opposite each other.
 *
 * Constructed only by {@link LineComparison.sideLines}.
 */
export class SideLine {
  /** What the side shows on the row. */
  readonly kind: 'same' | 'added' | 'removed' | 'absent';

  /** The line's number in the side's own text, or null for an absent row. */
  readonly number: number | null;

  /** The line's runs, cut at its changed characters; empty for an absent row. */
  readonly runs: readonly ComparisonRun[];

  /** Binds the row to what the side shows on it. */
  public constructor(
    kind: 'same' | 'added' | 'removed' | 'absent',
    number: number | null,
    runs: readonly ComparisonRun[],
  ) {
    this.kind = kind;
    this.number = number;
    this.runs = runs;
  }
}

/**
 * Two texts split into lines, aligned into rows, with each line's changed
 * characters named. Constructed once per pair by the comparison surface,
 * synchronously and before any colour arrives: the alignment and the marks
 * need only the lines, so the rows are on screen as marked text at once, and
 * the runs colour them when the grammars land.
 */
export class LineComparison {
  /**
   * The original text's lines, each with its offset into the text, as the
   * tokenizer splits them (see the module comment).
   */
  readonly originalLines: ReadonlyArray<readonly [string, number]>;

  /** The modified text's lines; see {@link originalLines}. */
  readonly modifiedLines: ReadonlyArray<readonly [string, number]>;

  /** The rows, in order, each naming the line every side shows on it. */
  readonly rows: readonly ComparisonRow[];

  /**
   * Each original line's changed characters, by that line's own index, empty
   * for a line the diff marked nothing in. Held rather than recomputed because
   * every later {@link sideLines} — one per side, again when that side's
   * colour lands — shows the same marks.
   */
  readonly #originalRanges: ReadonlyArray<readonly CharacterRange[]>;

  /** Each modified line's changed characters; see `#originalRanges`. */
  readonly #modifiedRanges: ReadonlyArray<readonly CharacterRange[]>;

  /** Splits both texts, aligns their lines, and marks what differs in each. */
  public constructor(originalText: string, modifiedText: string) {
    this.originalLines = splitLines(originalText);
    this.modifiedLines = splitLines(modifiedText);
    const original = this.originalLines.map(([line]) => line);
    const modified = this.modifiedLines.map(([line]) => line);
    this.rows = alignRows(original, modified);
    const [originalRanges, modifiedRanges] = markedCharacters(original, modified);
    this.#originalRanges = originalRanges;
    this.#modifiedRanges = modifiedRanges;
  }

  /**
   * What one side shows on every row, from that side's coloured runs — or
   * from the lines alone while the runs are still arriving, or did not:
   * each line is then one uncoloured run, cut at its changed characters all
   * the same, so what differs is marked before it is coloured.
   */
  public sideLines(
    side: SourceDiffSide,
    runs: ReadonlyArray<ReadonlyArray<ColouredRun>> | null,
  ): SideLine[] {
    const lines = side === 'original' ? this.originalLines : this.modifiedLines;
    const ranges = side === 'original' ? this.#originalRanges : this.#modifiedRanges;
    return this.rows.map((row) => {
      const index = side === 'original' ? row.original : row.modified;
      if (index === null) {
        return new SideLine('absent', null, []);
      }
      const [text, offset] = lines[index]!;
      // A `changed` row is this side's line the other side replaced: removed
      // from the original's point of view, added from the modified's.
      const kind =
        row.kind === 'same'
          ? 'same'
          : row.kind === 'changed' && side === 'original'
            ? 'removed'
            : row.kind === 'changed'
              ? 'added'
              : row.kind;
      const lineRuns = runs?.[index] ?? [{ content: text, offset, htmlStyle: undefined }];
      return new SideLine(kind, index + 1, splitRunsAtRanges(lineRuns, offset, ranges[index]!));
    });
  }
}

/** VS Code's own line diff, the one its diff editor runs. */
const LINES_DIFF = linesDiffComputers.getDefault();

/**
 * One reading of the pair from the editor's computer. `ignoreTrimWhitespace`
 * chooses which of the two this surface is asking for (see the module
 * comment); moves are not asked for, because a moved run is drawn where it
 * was found rather than linked to where it came from, and no ceiling is set,
 * because a product-defined computation-time cutoff is what research.md § 7
 * rules out — `0` is this computer's spelling of no timeout at all.
 */
function readDiff(
  original: string[],
  modified: string[],
  ignoreTrimWhitespace: boolean,
): readonly { original: LineSpan; modified: LineSpan; innerChanges: readonly RangeMapping[] }[] {
  return LINES_DIFF.computeDiff(original, modified, {
    ignoreTrimWhitespace,
    maxComputationTimeMs: 0,
    computeMoves: false,
  }).changes.map((change) => ({
    original: change.original,
    modified: change.modified,
    innerChanges: change.innerChanges ?? [],
  }));
}

/** A run of lines, as the computer names one: 1-based and end-exclusive. */
interface LineSpan {
  /** The run's first line, counting from 1. */
  readonly startLineNumber: number;
  /** One past the run's last line; equal to the start for an empty run. */
  readonly endLineNumberExclusive: number;
}

/**
 * Aligns two sides' lines into rows. A line the other side still holds — the
 * same line, whatever indentation each wrote it at — stands opposite that
 * line, and what neither holds is paired with what replaced it
 * ({@link pairInOrder}). The computer reports only the second kind, and
 * guarantees that the lines between two of its reports pair one for one on
 * both sides, which is what walking them in step relies on.
 */
function alignRows(original: string[], modified: string[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;
  const pairMatchedLinesUpTo = (originalEnd: number): void => {
    while (originalIndex < originalEnd) {
      // Matched, so the two are one line — identical, or the same line the
      // two sides indented differently, which the marks are what shows.
      const kind = original[originalIndex] === modified[modifiedIndex] ? 'same' : 'changed';
      rows.push(new ComparisonRow(kind, originalIndex, modifiedIndex));
      originalIndex += 1;
      modifiedIndex += 1;
    }
  };
  for (const change of readDiff(original, modified, true)) {
    pairMatchedLinesUpTo(change.original.startLineNumber - 1);
    const originalEnd = change.original.endLineNumberExclusive - 1;
    const modifiedEnd = change.modified.endLineNumberExclusive - 1;
    pairInOrder(
      originalIndex,
      originalEnd - originalIndex,
      modifiedIndex,
      modifiedEnd - modifiedIndex,
      rows,
    );
    originalIndex = originalEnd;
    modifiedIndex = modifiedEnd;
  }
  pairMatchedLinesUpTo(original.length);
  return rows;
}

/**
 * Pairs a replaced run of lines with its replacement, line by line for as far
 * as both reach; the rest of the longer one is that side's own addition or
 * removal. This is the side-by-side layout the editor's own diff view has for
 * such a run: the two blocks start together and the shorter one runs out.
 */
function pairInOrder(
  originalStart: number,
  originalCount: number,
  modifiedStart: number,
  modifiedCount: number,
  rows: ComparisonRow[],
): void {
  const paired = Math.min(originalCount, modifiedCount);
  for (let line = 0; line < paired; line += 1) {
    rows.push(new ComparisonRow('changed', originalStart + line, modifiedStart + line));
  }
  for (let line = paired; line < originalCount; line += 1) {
    rows.push(new ComparisonRow('removed', originalStart + line, null));
  }
  for (let line = paired; line < modifiedCount; line += 1) {
    rows.push(new ComparisonRow('added', null, modifiedStart + line));
  }
}

/**
 * Each side's changed characters line by line, in that side's own line order,
 * with the original side's first. The computer answers in ranges that may
 * begin on one line and end on another — a replaced run of lines is compared
 * as one text — so each is cut at the line boundaries it crosses.
 */
function markedCharacters(
  original: string[],
  modified: string[],
): [CharacterRange[][], CharacterRange[][]] {
  const originalRanges: CharacterRange[][] = original.map(() => []);
  const modifiedRanges: CharacterRange[][] = modified.map(() => []);
  for (const change of readDiff(original, modified, false)) {
    for (const inner of change.innerChanges) {
      markLine(inner.originalRange, original, originalRanges);
      markLine(inner.modifiedRange, modified, modifiedRanges);
    }
  }
  return [originalRanges, modifiedRanges];
}

/**
 * Marks one of the computer's ranges on every line it reaches, in that line's
 * own characters: its first line from the range's start column, its last to
 * the range's end column, and everything between whole. A range that starts
 * where it ends — one side of a pure insertion — marks nothing.
 */
function markLine(
  range: RangeMapping['originalRange'],
  lines: string[],
  into: CharacterRange[][],
): void {
  for (let number = range.startLineNumber; number <= range.endLineNumber; number += 1) {
    const from = number === range.startLineNumber ? range.startColumn - 1 : 0;
    const to = number === range.endLineNumber ? range.endColumn - 1 : lines[number - 1]!.length;
    if (to > from) {
      into[number - 1]!.push(new CharacterRange(from, to));
    }
  }
}

/**
 * Cuts one line's runs at the bounds of its changed ranges, so every piece
 * is either wholly changed or wholly unchanged and keeps the colour of the
 * run it came from. `lineOffset` is where the line starts in the whole text,
 * because a run's offset is measured from the text's start while a range is
 * measured from the line's.
 */
export function splitRunsAtRanges(
  runs: readonly ColouredRun[],
  lineOffset: number,
  ranges: readonly CharacterRange[],
): ComparisonRun[] {
  const pieces: ComparisonRun[] = [];
  for (const run of runs) {
    const start = run.offset - lineOffset;
    const end = start + run.content.length;
    const cuts = new Set([start, end]);
    for (const range of ranges) {
      if (range.start > start && range.start < end) {
        cuts.add(range.start);
      }
      if (range.end > start && range.end < end) {
        cuts.add(range.end);
      }
    }
    const bounds = [...cuts].toSorted((left, right) => left - right);
    for (let position = 0; position < bounds.length - 1; position += 1) {
      const from = bounds[position]!;
      const to = bounds[position + 1]!;
      pieces.push(
        new ComparisonRun(
          run.content.slice(from - start, to - start),
          run.htmlStyle,
          ranges.some((range) => from >= range.start && to <= range.end),
        ),
      );
    }
  }
  return pieces;
}
