import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  createVirtualPath,
  createVirtualPathFromSegments,
  escapeVirtualPathSegment,
  splitPortableRelativePath,
} from '../../src/sources/virtual-path.js';

describe('portable relative paths', () => {
  it.each([
    '/absolute/file.md',
    '\\absolute\\file.md',
    'C:\\absolute\\file.md',
    'C:drive-relative.md',
    '\\\\server\\share\\file.md',
    'a/../file.md',
    'a\\..\\file.md',
    './file.md',
    'a//file.md',
    'a\\\\file.md',
    'file.md/',
    '',
    'a'.repeat(4_097),
  ])('rejects unsafe portable form %j', (input) => {
    expect(() => splitPortableRelativePath(input)).toThrow(TypeError);
  });

  it('normalizes Windows separators without accepting drive forms', () => {
    expect(splitPortableRelativePath('instructions\\nested\\AGENTS.md')).toEqual([
      'instructions',
      'nested',
      'AGENTS.md',
    ]);
    expect(createVirtualPath('repository://workspace', 'instructions\\nested\\AGENTS.md')).toEqual({
      relativePath: 'instructions/nested/AGENTS.md',
      basename: 'AGENTS.md',
      virtualPath: 'repository://workspace/instructions/nested/AGENTS.md',
    });
  });
});

describe('safe virtual path presentation', () => {
  it('keeps ordinary Unicode but visibly escapes controls and literal separators', () => {
    const result = createVirtualPathFromSegments('repository://workspace', [
      '日本語',
      'line\n\u202Ename\\part.md',
    ]);

    expect(result.relativePath).toBe('日本語/line\\u{000A}\\u{202E}name\\u{005C}part.md');
    expect(result.basename).toBe('line\\u{000A}\\u{202E}name\\u{005C}part.md');
    expect(result.virtualPath).toBe('repository://workspace/日本語/line%0A%E2%80%AEname%5Cpart.md');
    expect(result.virtualPath).not.toMatch(/[\n\u202e\\]/u);
  });

  it('escapes C0, C1, bidirectional, slash, backslash, and lone surrogates', () => {
    expect(escapeVirtualPathSegment('a\0\u0085\u2066/\\\ud800z')).toBe(
      'a\\u{0000}\\u{0085}\\u{2066}\\u{002F}\\u{005C}\\u{D800}z',
    );
    expect(escapeVirtualPathSegment('emoji 😀')).toBe('emoji 😀');
  });

  it('does not collide with a filename containing a literal escape sequence', () => {
    const control = createVirtualPathFromSegments('repository://workspace', ['a\n.md']);
    const literal = createVirtualPathFromSegments('repository://workspace', ['a\\u{000A}.md']);

    expect(control.relativePath).not.toBe(literal.relativePath);
    expect(control.virtualPath).not.toBe(literal.virtualPath);
  });

  it.each([
    'workspace',
    'repository:/workspace',
    'repository://work space',
    'repository://workspace?query',
    'repository://workspace\\part',
    'repository://work\u202Espace',
  ])('rejects an unsafe virtual base %j', (virtualBase) => {
    expect(() => createVirtualPathFromSegments(virtualBase, ['AGENTS.md'])).toThrow(TypeError);
  });

  it('bounds both presentation and percent-encoded virtual paths', () => {
    expect(() =>
      createVirtualPathFromSegments('repository://workspace', ['\n'.repeat(1_000)]),
    ).toThrow(TypeError);
    expect(() =>
      createVirtualPathFromSegments(`repository://${'a'.repeat(512)}`, ['file.md']),
    ).toThrow(TypeError);
    expect(() => createVirtualPathFromSegments('repository://workspace', [])).toThrow(TypeError);
  });

  it('encodes URI query and fragment delimiters', () => {
    expect(createVirtualPathFromSegments('repository://workspace', ['what?#.md'])).toMatchObject({
      relativePath: 'what?#.md',
      virtualPath: 'repository://workspace/what%3F%23.md',
    });
    expect(
      createVirtualPathFromSegments('repository://workspace/', ['emoji😀.md']).virtualPath,
    ).toBe('repository://workspace/emoji😀.md');
  });

  it('keeps arbitrary segments bounded and free of raw display controls', () => {
    const segment = fc
      .string({ minLength: 1, maxLength: 24 })
      .map((value) => (value === '.' || value === '..' ? `safe${value}` : value));

    fc.assert(
      fc.property(fc.array(segment, { minLength: 1, maxLength: 6 }), (segments) => {
        const result = createVirtualPathFromSegments('repository://workspace', segments);
        expect(hasUnsafeDisplayCodePoint(result.relativePath)).toBe(false);
        expect(hasUnsafeDisplayCodePoint(result.virtualPath)).toBe(false);
        expect(result.virtualPath).not.toContain('\\');
        expect(result.virtualPath).not.toContain('?');
        expect(result.virtualPath).not.toContain('#');
        expect(result.relativePath.length).toBeLessThanOrEqual(4_096);
        expect(result.virtualPath.length).toBeLessThanOrEqual(4_096);
      }),
      { numRuns: 500 },
    );
  });
});

function hasUnsafeDisplayCodePoint(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0x061c ||
      codePoint === 0x200e ||
      codePoint === 0x200f ||
      (codePoint >= 0x2028 && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069) ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint === 0xfeff
    ) {
      return true;
    }
  }
  return false;
}
