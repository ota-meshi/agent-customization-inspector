// The rows of a side-by-side source comparison (T1209; research.md § 7,
// FR-011, FR-025): which line of each side stands opposite which, what kind
// of difference a row is, and — for a line that changed rather than appeared
// or vanished — which of its characters differ.
//
// The comparison is literal. Lines are compared whole and exactly as
// authored, whitespace included, because two lines differing only in that
// whitespace are a difference FR-025 keeps distinguishable; nothing is
// trimmed, folded, or normalized on the way in. The line diff is Myers' over
// the lines (`diff` § diffArrays), with no cutoff and on the browser's own
// capacity alone: a product-defined line or time ceiling is what research.md
// § 7 rules out.
//
// Lines are split where the tokenizer splits them (`shiki/core` § splitLines),
// so a row's line index is the index of the same line among the runs
// `highlightSource` returns: one splitter, and the two never disagree about
// where a line ends or how many there are.
import { diffArrays, diffWordsWithSpace } from 'diff';
import { splitLines } from 'shiki/core';

/**
 * What a row of the comparison is.
 *
 * - `same`: both sides show the line, identical.
 * - `added`: only the modified side has the line.
 * - `removed`: only the original side has the line.
 * - `changed`: each side shows a line the other does not have, stood opposite
 *   each other because they replaced one another in place; their differing
 *   characters are marked ({@link changedCharacters}).
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
 * the line's first character. Constructed only by {@link changedCharacters}.
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

  /** Whether every character of the run is one the opposite line lacks. */
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
 * Two texts split into lines and aligned into rows. Constructed once per pair
 * by the comparison surface, synchronously and before any colour arrives: the
 * alignment needs only the lines, so the rows are on screen as text at once,
 * and the runs colour them when the grammars land.
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

  /** Splits both texts and aligns their lines. */
  public constructor(originalText: string, modifiedText: string) {
    this.originalLines = splitLines(originalText);
    this.modifiedLines = splitLines(modifiedText);
    this.rows = alignLines(
      this.originalLines.map(([line]) => line),
      this.modifiedLines.map(([line]) => line),
    );
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
    const oppositeLines = side === 'original' ? this.modifiedLines : this.originalLines;
    return this.rows.map((row) => {
      const index = side === 'original' ? row.original : row.modified;
      if (index === null) {
        return new SideLine('absent', null, []);
      }
      const [text, offset] = lines[index]!;
      const oppositeIndex = side === 'original' ? row.modified : row.original;
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
      const ranges =
        row.kind === 'changed' && oppositeIndex !== null
          ? changedCharacters(text, oppositeLines[oppositeIndex]![0])
          : [];
      const lineRuns = runs?.[index] ?? [{ content: text, offset, htmlStyle: undefined }];
      return new SideLine(kind, index + 1, splitRunsAtRanges(lineRuns, offset, ranges));
    });
  }
}

/**
 * Aligns two sides' lines into rows: unchanged lines stand opposite each
 * other, a replaced run of lines stands opposite its replacement line by line
 * for as far as both runs reach, and what is left of the longer run is the
 * one side's addition or removal. The diff reports a replacement as the
 * removed lines followed by the added ones, which is what the pairing reads.
 */
function alignLines(original: string[], modified: string[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;
  const changes = diffArrays(original, modified);
  for (let position = 0; position < changes.length; position += 1) {
    const change = changes[position]!;
    if (change.removed) {
      const next = changes[position + 1];
      const added = next !== undefined && next.added ? next : null;
      const paired = added === null ? 0 : Math.min(change.count, added.count);
      for (let line = 0; line < paired; line += 1) {
        rows.push(new ComparisonRow('changed', originalIndex, modifiedIndex));
        originalIndex += 1;
        modifiedIndex += 1;
      }
      for (let line = paired; line < change.count; line += 1) {
        rows.push(new ComparisonRow('removed', originalIndex, null));
        originalIndex += 1;
      }
      if (added !== null) {
        for (let line = paired; line < added.count; line += 1) {
          rows.push(new ComparisonRow('added', null, modifiedIndex));
          modifiedIndex += 1;
        }
        position += 1;
      }
    } else if (change.added) {
      for (let line = 0; line < change.count; line += 1) {
        rows.push(new ComparisonRow('added', null, modifiedIndex));
        modifiedIndex += 1;
      }
    } else {
      for (let line = 0; line < change.count; line += 1) {
        rows.push(new ComparisonRow('same', originalIndex, modifiedIndex));
        originalIndex += 1;
        modifiedIndex += 1;
      }
    }
  }
  return rows;
}

/**
 * The characters of `line` that `opposite` does not have, as ranges within
 * `line`, at word granularity with the whitespace between words compared
 * too (`diff` § diffWordsWithSpace): a line differing from its opposite only
 * in a run of spaces marks those spaces, which is the literal comparison
 * FR-011 asks for.
 */
export function changedCharacters(line: string, opposite: string): CharacterRange[] {
  const ranges: CharacterRange[] = [];
  let at = 0;
  for (const part of diffWordsWithSpace(line, opposite)) {
    if (part.added) {
      continue;
    }
    if (part.removed) {
      ranges.push(new CharacterRange(at, at + part.value.length));
    }
    at += part.value.length;
  }
  return ranges;
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
