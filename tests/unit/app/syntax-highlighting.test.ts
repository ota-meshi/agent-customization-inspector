// T1206: the read-only source colouring — lines, endings, lazy grammars, and
// the dual-theme variables every run carries (research.md § 7, FR-027).
//
// The real shiki runs here rather than a double. What is under test is what
// this product asks of it — that a file's lines and endings survive
// tokenizing, that plain text needs no grammar, and that every run carries the
// variables the stylesheet selects between — and those are shiki's answers,
// which a stub would only restate.
import { describe, expect, it } from 'vitest';
import { PLAIN_TEXT } from '../../../src/app/composables/source-languages';
import { highlightSource } from '../../../src/app/composables/syntax-highlighting';

/** Each line's text, joined back from its runs. */
function lineTexts(lines: ReadonlyArray<ReadonlyArray<{ readonly content: string }>>): string[] {
  return lines.map((line) => line.map((run) => run.content).join(''));
}

describe('highlightSource', () => {
  it('keeps every line and its content and lets no ending reach a run (FR-027)', async () => {
    // Mixed endings in one document: the split is at either, the count and the
    // contents are the file's, and no `\r` survives into a run.
    const lines = await highlightSource('key: v\r\nother: 1\n\nlast', 'yaml');
    expect(lineTexts(lines)).toEqual(['key: v', 'other: 1', '', 'last']);
    expect(lines.flat().some((run) => run.content.includes('\r'))).toBe(false);
  });

  it('preserves tabs and trailing spaces exactly as authored', async () => {
    expect(lineTexts(await highlightSource('\ta  \n  b\t', PLAIN_TEXT))).toEqual([
      '\ta  ',
      '  b\t',
    ]);
  });

  it('tokenizes an empty file as one empty line', async () => {
    expect(lineTexts(await highlightSource('', PLAIN_TEXT))).toEqual(['']);
  });

  it('colours plain text as uncoloured runs without loading a grammar', async () => {
    const lines = await highlightSource('a\r\nb', PLAIN_TEXT);
    expect(lineTexts(lines)).toEqual(['a', 'b']);
    for (const run of lines.flat()) {
      expect(run.htmlStyle).toEqual({});
    }
  });

  it('carries the dual-theme variables on each run and no resolved colour', async () => {
    // `defaultColor: false`: the scheme is the stylesheet's choice, so a run
    // states both colours as variables and paints neither itself.
    const [line] = await highlightSource('name: greet', 'yaml');
    expect(line).toBeDefined();
    expect(line!.length).toBeGreaterThan(1);
    for (const run of line!) {
      expect(Object.keys(run.htmlStyle ?? {})).toEqual(
        expect.arrayContaining(['--shiki-light', '--shiki-dark']),
      );
      expect(run.htmlStyle).not.toHaveProperty('color');
    }
  });

  it('rejects a language no grammar is bundled for', async () => {
    await expect(highlightSource('x', 'no-such-language')).rejects.toThrow();
  });
});
