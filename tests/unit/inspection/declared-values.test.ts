// T077: what a declared value is and is not (data-model.md § Field reading,
// contracts/http-api.md § get-file-detail).
//
// The claim these tests defend is narrow and absolute: what the product reads
// out of a field is the value a product loading that file would have — never a
// shortened one, never a masked one, and never one with an environment
// reference resolved on the file's behalf.
//
// A credential is the case that makes it concrete. It appears whole, in the
// field it was declared in, with no covered form anywhere and no second call
// that would uncover one.
import { describe, expect, it } from 'vitest';
import { ParsedMarkdownDocument } from '../../../src/server/inspection/parsers/markdown';
import {
  ASTRAL_AND_COMBINING,
  CONTENT_FIXTURE_SECRET,
} from '../../fixtures/content/build-fixtures';

/** The frontmatter of one authored document, read as the recognizer reads it. */
function frontmatterOf(sourceText: string): ReadonlyMap<unknown, unknown> {
  const { frontmatter } = new ParsedMarkdownDocument(sourceText);
  return frontmatter instanceof Map ? frontmatter : new Map();
}

describe('declared values', () => {
  it('reports a literal credential whole, with no masking or reveal step', () => {
    const fields = frontmatterOf(`---\ndescription: "token ${CONTENT_FIXTURE_SECRET}"\n---\n`);
    expect(fields.get('description')).toBe(`token ${CONTENT_FIXTURE_SECRET}`);
  });

  it('leaves environment-reference syntax as the characters that were written', () => {
    const fields = frontmatterOf('---\ndescription: "$HOME/${TOKEN}"\n---\n');
    // The host reads no process environment on an inspected file's behalf, and
    // YAML resolves no such reference either, so it is text and stays text.
    expect(fields.get('description')).toBe('$HOME/${TOKEN}');
  });

  it('cuts no surrogate pair or combining sequence in half', () => {
    const fields = frontmatterOf(`---\nname: ${ASTRAL_AND_COMBINING}\n---\n`);
    // Every layer works in whole characters: an astral character is two UTF-16
    // code units and a combining mark is two code points, and a value that
    // survived a count in either would be truncated here.
    expect(fields.get('name')).toBe(ASTRAL_AND_COMBINING);
  });

  it('survives a JSON transport round trip unchanged', () => {
    const fields = frontmatterOf(`---\nname: "${ASTRAL_AND_COMBINING}"\n---\n`);
    const transported: { value?: string } = JSON.parse(
      JSON.stringify({ value: fields.get('name') }),
    );
    expect(transported.value).toBe(ASTRAL_AND_COMBINING);
  });
});
