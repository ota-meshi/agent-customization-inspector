// T075: byte decoding and inert frontmatter reading (FR-025, FR-028,
// spec.md § Byte Decode Outcomes, data-model.md § DeclaredMetadataEntry).
//
// Two contracts meet here. Decoding decides whether a file has readable text at
// all and does it exactly once; reading decides what that text resolves to.
// Both are all-or-nothing in their own way: a NUL byte leaves the whole file
// without source text, and a document that cannot be parsed fails the whole
// recognition rather than yielding the fields that happened to parse.
//
// What is pinned below is the boundary with the two packages that do the work.
// This module chooses the semantics and nothing else, so these cases say what
// `vfile-matter` and `yaml` currently decide — a change in either shows up here
// rather than as files that quietly start or stop declaring fields.
import { describe, expect, it } from 'vitest';
import { decodeSourceBytes } from '../../../src/shared/entities';
import { parseFrontmatter } from '../../../src/server/inspection/parsers/markdown';
import {
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';

const encoder = new TextEncoder();

describe('byte decoding', () => {
  it('leaves any NUL-containing file without text or a BOM record', () => {
    const decoded = decodeSourceBytes(encoder.encode('name: greet\u0000more'));
    // A binary result has no `sourceText` field at all rather than an empty
    // one: the two are different facts and the union keeps them apart.
    expect(decoded).toEqual({ encoding: 'binary' });
  });

  it('decodes valid UTF-8 exactly once without replacement', () => {
    const decoded = decodeSourceBytes(encoder.encode('name: gré\u{1F600}t'));
    expect(decoded).toEqual({
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: 'name: gré\u{1F600}t',
    });
  });

  it('records and removes exactly one leading BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode('\ufeffname: a')]);
    const decoded = decodeSourceBytes(bytes);
    if (decoded.encoding === 'binary') {
      throw new Error('expected a readable decode');
    }
    expect(decoded.hadLeadingBom).toBe(true);
    // Only the first is a BOM; a second U+FEFF is authored content and stays.
    expect(decoded.sourceText).toBe('\ufeffname: a');
  });

  it('keeps inserted replacement characters in complete readable text', () => {
    // 0x80 is a lone continuation byte: invalid UTF-8, replaced rather than
    // retried under another charset.
    const decoded = decodeSourceBytes(new Uint8Array([0x61, 0x80, 0x62]));
    expect(decoded).toEqual({
      encoding: 'utf-8-replaced',
      hadLeadingBom: false,
      sourceText: 'a\ufffdb',
    });
  });

  it('does not reclassify a file that authored U+FFFD itself', () => {
    const decoded = decodeSourceBytes(encoder.encode('a\ufffdb'));
    // The bytes are valid UTF-8, so nothing was replaced; calling this
    // `utf-8-replaced` would report a decode problem the file does not have.
    expect(decoded.encoding).toBe('utf-8');
  });
});

describe('frontmatter reading', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'resolves to the value a product loading the file would have: %s',
    (_id, testCase) => {
      const frontmatter = parseFrontmatter(testCase.sourceText) as Record<string, unknown>;
      // Compared as text, because that is the form the recognizer publishes;
      // `007` resolves to the number 7 and reads as `7`.
      const read = (key: string): string | null =>
        typeof frontmatter[key] === 'string' ||
        typeof frontmatter[key] === 'number' ||
        typeof frontmatter[key] === 'boolean'
          ? String(frontmatter[key])
          : null;
      expect(read('name')).toBe(testCase.name);
      expect(read('description')).toBe(testCase.description);
    },
  );

  it.each(MALFORMED_SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'throws for a document it cannot parse: %s',
    (_id, testCase) => {
      // The one refusal, and not an opinion about the content: there is no
      // value to report. It reaches `extraction.ts`, which turns it into that
      // recognition's `failed` state with the source still readable.
      expect(() => parseFrontmatter(testCase.sourceText)).toThrow();
    },
  );

  it('resolves a document with no frontmatter block to no fields', () => {
    // Not a failure: a `SKILL.md` that declares nothing is an ordinary file,
    // and failing it would turn "declares no metadata" into a diagnostic.
    expect(parseFrontmatter('---\nno closing fence\n')).toEqual({});
    expect(parseFrontmatter('# Just a heading\n')).toEqual({});
    expect(parseFrontmatter('---\n---\n')).toEqual({});
  });

  it('reads a block whose closing fence is at end of file', () => {
    expect(parseFrontmatter('---\nname: g\n---')).toEqual({ name: 'g' });
  });

  it('reads a block that uses CRLF line endings', () => {
    expect(parseFrontmatter('---\r\nname: g\r\n---\r\nBody\r\n')).toEqual({ name: 'g' });
  });

  it('does not mistake a dashed value for the closing fence', () => {
    expect(parseFrontmatter('---\nname: ---\n---\nBody\n')).toEqual({ name: '---' });
  });

  it.each([
    ['a fence with a trailing space', '--- \nname: g\n---\n'],
    ['a closing fence with a trailing space', '---\nname: g\n--- \n'],
    ['a YAML document-end marker as the closing fence', '---\nname: g\n...\n'],
    ['four dashes', '----\nname: g\n----\n'],
    ['an info string on the opening fence', '---yaml\nname: g\n---\n'],
    ['a leading blank line', '\n---\nname: g\n---\n'],
  ])('recognizes no block in %s', (_shape, source) => {
    expect(parseFrontmatter(source)).toEqual({});
  });

  it('reads YAML 1.2 core semantics rather than 1.1', () => {
    // Left to a default, `yes` would be a boolean and `12:30` a sexagesimal
    // number, and a customization's fields would mean something other than what
    // its author's own tools read.
    expect(parseFrontmatter('---\nname: yes\nother: 12:30\n---\n')).toEqual({
      name: 'yes',
      other: '12:30',
    });
  });

  it('resolves a key declared twice to its later declaration', () => {
    // Refusing the document instead would be this tool deciding a customization
    // is invalid, which is not its job.
    expect(parseFrontmatter('---\nname: first\nname: second\n---\n')).toEqual({
      name: 'second',
    });
  });

  it('resolves an alias and keeps the scalar an unknown tag carried', () => {
    expect(parseFrontmatter('---\na: &x g\nname: *x\n---\n')).toEqual({ a: 'g', name: 'g' });
    expect(parseFrontmatter('---\nname: !!weird greet\n---\n')).toEqual({ name: 'greet' });
  });
});
