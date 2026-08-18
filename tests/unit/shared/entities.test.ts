// T017: public entity shapes — readable encodings with preserved U+FFFD,
// textless binary, the non-authorizing SourceBoundary, root
// presentation encoding, evidence vocabulary, and opaque IDs.
import { describe, expect, it } from 'vitest';

import {
  CUSTOMIZATION_KIND_ORDER,
  LIFECYCLE_QUALIFIER_ORDER,
  SUPPORTED_TOOL_ORDER,
  createOpaqueId,
  createSourceBoundaryDto,
  decodeSourceBytes,
  encodeRootPresentation,
  escapeControlCharacters,
  isCustomizationKind,
  isSupportedTool,
  pathPresentationLabel,
  rendersNothingVisible,
} from '../../../src/shared/entities';

describe('decodeSourceBytes', () => {
  it('classifies valid UTF-8 without BOM as readable utf-8', () => {
    const outcome = decodeSourceBytes(Buffer.from('hello\n', 'utf8'));
    expect(outcome).toEqual({
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: 'hello\n',
    });
  });

  it('records and strips exactly one leading BOM without changing the encoding', () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hello\n', 'utf8')]);
    expect(decodeSourceBytes(bytes)).toEqual({
      encoding: 'utf-8',
      hadLeadingBom: true,
      sourceText: 'hello\n',
    });
  });

  it('keeps a second BOM in the text after removing the leading one', () => {
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('x', 'utf8'),
    ]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      hadLeadingBom: true,
      sourceText: '﻿x',
    });
  });

  it('classifies replacement-decoded text as readable utf-8-replaced with preserved U+FFFD', () => {
    const bytes = Buffer.from([0x68, 0x69, 0xff, 0x0a]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      encoding: 'utf-8-replaced',
      sourceText: 'hi�\n',
    });
  });

  it('uses utf-8-replaced when replacement occurs after a removed BOM', () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from([0xff])]);
    expect(decodeSourceBytes(bytes)).toMatchObject({
      encoding: 'utf-8-replaced',
      hadLeadingBom: true,
    });
  });

  it('keeps a literal authored U+FFFD readable without reclassification', () => {
    const outcome = decodeSourceBytes(Buffer.from('literal � char\n', 'utf8'));
    expect(outcome).toMatchObject({
      encoding: 'utf-8',
      sourceText: 'literal � char\n',
    });
  });

  it('classifies any NUL byte as textless binary with no BOM record', () => {
    const outcome = decodeSourceBytes(Buffer.from([0x68, 0x00, 0x69]));
    expect(outcome).toEqual({ encoding: 'binary' });
  });

  it('preserves environment-variable references as literal authored text', () => {
    const outcome = decodeSourceBytes(Buffer.from('token: $TOKEN and ${TOKEN}\n', 'utf8'));
    expect(outcome).toMatchObject({ sourceText: 'token: $TOKEN and ${TOKEN}\n' });
  });
});

describe('SourceBoundary DTO', () => {
  it('exposes exactly displayRoot and origin', () => {
    const boundary = createSourceBoundaryDto('/repo/root', 'process-cwd');
    expect(Object.keys(boundary).sort()).toEqual(['displayRoot', 'origin']);
    expect(boundary.origin).toBe('process-cwd');
  });

  it('covers the four closed origins', () => {
    for (const origin of ['process-cwd', 'root-option', 'default-home', 'environment'] as const) {
      expect(createSourceBoundaryDto('/r', origin).origin).toBe(origin);
    }
  });

  it('escapes the root label with the shared presentation encoding', () => {
    const boundary = createSourceBoundaryDto('/repo/<script>', 'process-cwd');
    expect(boundary.displayRoot).not.toContain('<');
    expect(boundary.displayRoot).toContain('\\u003C');
  });
});

describe('encodeRootPresentation', () => {
  it('copies ASCII letters, digits, and the five safe punctuation code units', () => {
    expect(encodeRootPresentation('/home/user_1/repo-2.x:tag')).toBe('/home/user_1/repo-2.x:tag');
  });

  it('escapes every other code unit as uppercase \\uXXXX', () => {
    expect(encodeRootPresentation('a b')).toBe('a\\u0020b');
    expect(encodeRootPresentation('C:\\repo')).toBe('C:\\u005Crepo');
    expect(encodeRootPresentation('日')).toBe('\\u65E5');
  });

  it('escapes each half of a surrogate pair separately', () => {
    expect(encodeRootPresentation('\u{1F600}')).toBe('\\uD83D\\uDE00');
  });

  it('is injective on backslash-bearing input and empty only for empty input', () => {
    expect(encodeRootPresentation('\\u0020')).toBe('\\u005Cu0020');
    expect(encodeRootPresentation('')).toBe('');
  });
});

describe('rendersNothingVisible', () => {
  it('reports a label that draws nothing, whitespace or not', () => {
    // A zero-width space is not whitespace, so `String.trim` keeps it: a name
    // made of one would pass a trim test and still render as an empty link
    // (data-model.md § SourceRelativePath).
    expect(rendersNothingVisible('\u200B')).toBe(true);
    expect(rendersNothingVisible('   ')).toBe(true);
    expect(rendersNothingVisible('\uFEFF\u00AD')).toBe(true);
    expect(rendersNothingVisible('')).toBe(true);
  });

  it('reports a label with anything that draws', () => {
    expect(rendersNothingVisible('SKILL.md')).toBe(false);
    // A zero-width space beside a real character still leaves the character.
    expect(rendersNothingVisible('\u200Ba')).toBe(false);
  });
});

describe('escapeControlCharacters', () => {
  it('gives every Cc code point a visible uppercase \\uXXXX spelling', () => {
    // A newline in an authored file name would otherwise split a rendered
    // path across lines (data-model.md § SourceRelativePath: presentation
    // escapes control characters without changing the stored value).
    expect(escapeControlCharacters('a\nb')).toBe('a\\u000Ab');
    expect(escapeControlCharacters('tab\tseparated')).toBe('tab\\u0009separated');
    expect(escapeControlCharacters('\u0000\u007F\u0085')).toBe('\\u0000\\u007F\\u0085');
  });

  it('escapes the backslash so the mapping is injective', () => {
    // `a` + U+000A + `b` and the eight literal characters `a\u000Ab` are two
    // different names one directory can hold; without the backslash escape
    // both would render as `a\u000Ab`.
    expect(escapeControlCharacters('a\\u000Ab')).toBe('a\\u005Cu000Ab');
    expect(escapeControlCharacters('a\nb')).not.toBe(escapeControlCharacters('a\\u000Ab'));
  });

  it('spells out the bidirectional formatting characters', () => {
    // A right-to-left override reorders what follows it, so the path would
    // render as a different path than the one it identifies (data-model.md
    // § SourceRelativePath).
    expect(escapeControlCharacters('report\u202Egnp.md')).toBe('report\\u202Egnp.md');
    expect(escapeControlCharacters('\u061C\u200E\u200F\u202A\u2066\u2069')).toBe(
      '\\u061C\\u200E\\u200F\\u202A\\u2066\\u2069',
    );
    // U+2028/U+2029 split the surrounding text into new lines or bidi
    // paragraphs while drawing nothing, so they are spelled out too — a title
    // isolating this function's output must not find its isolate pair split
    // across two paragraphs.
    expect(escapeControlCharacters('a\u2028b\u2029c')).toBe('a\\u2028b\\u2029c');
  });

  it('leaves everything outside those sets as itself, spaces and non-ASCII included', () => {
    // The authored spelling is the path's presentation identity, so unlike the
    // root label encoding this stays readable: only the characters that render
    // as nothing, break a line, or move their neighbours need a spelling.
    expect(escapeControlCharacters('.agents/skills/café name/SKILL.md')).toBe(
      '.agents/skills/café name/SKILL.md',
    );
  });
});

describe('pathPresentationLabel', () => {
  it('renders an ordinary path as its escaped spelling', () => {
    // The authored spelling is the path's presentation identity, so a value
    // with anything that draws is exactly what `escapeControlCharacters`
    // produces — the fallback is for the case that has nothing.
    expect(pathPresentationLabel('.agents/skills/café name/SKILL.md')).toBe(
      '.agents/skills/café name/SKILL.md',
    );
    expect(pathPresentationLabel('a\nb.md')).toBe('a\\u000Ab.md');
  });

  it('spells out a value that would draw nothing at all', () => {
    // Escaping leaves a space a space and a zero-width space a zero-width
    // space, so a name built only from those renders as an empty label — and
    // a row or link carrying it would have neither visible text nor an
    // accessible name (data-model.md § SourceRelativePath).
    expect(pathPresentationLabel(' ')).toBe('\\u0020');
    expect(pathPresentationLabel('​​')).toBe('\\u200B\\u200B');
    expect(pathPresentationLabel('﻿­')).toBe('\\uFEFF\\u00AD');
  });

  it('keeps two invisible values apart, which the escaped spelling cannot', () => {
    // One space and two spaces are two entry names one directory can hold.
    // Escaping renders both as blank, so the spelled-out form is what keeps
    // their rows distinguishable (FR-025).
    expect(pathPresentationLabel(' ')).not.toBe(pathPresentationLabel('  '));
  });

  it('leaves a nested path alone however invisible its segments are', () => {
    // `/` draws, so only a single-segment value can reach the fallback — the
    // case a Codex configured fallback basename produces, since no character
    // grammar constrains a declared entry name.
    expect(pathPresentationLabel('docs/​')).toBe('docs/​');
  });
});

describe('evidence vocabulary', () => {
  it('fixes the lifecycle qualifier order', () => {
    // The order is contract data the registry gate checks each record's
    // qualifiers against; there is deliberately no `stable` member, because
    // the absence of a qualifier makes no claim (QR-005).
    expect(LIFECYCLE_QUALIFIER_ORDER).toEqual(['preview', 'experimental', 'deprecated']);
    expect(LIFECYCLE_QUALIFIER_ORDER).not.toContain('stable');
  });
});

describe('opaque IDs', () => {
  it('creates unique 22-character base64url 128-bit IDs by default', () => {
    const id = createOpaqueId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(createOpaqueId()).not.toBe(id);
  });
});

describe('closed-catalog predicates', () => {
  // The catalogs are what turn text from outside the product — a `?kind=`
  // query the reader typed, the raw value a `<select>` hands back — into a
  // member of a closed union. A predicate rather than a membership test
  // followed by an assertion, so the comparison is what proves the type.
  it('recognizes every catalogued kind and tool', () => {
    for (const kind of CUSTOMIZATION_KIND_ORDER) {
      expect(isCustomizationKind(kind), kind).toBe(true);
    }
    for (const tool of SUPPORTED_TOOL_ORDER) {
      expect(isSupportedTool(tool), tool).toBe(true);
    }
  });

  it('rejects text the catalogue does not name, and every non-string', () => {
    // A near miss in spelling or case is not a member: the wire values are
    // exact, and a tab that opened on a guessed kind would show rows the URL
    // did not ask for.
    for (const value of ['', 'Skill', 'skills', 'instruction', 'CLAUDE', 'gemini']) {
      expect(isCustomizationKind(value), value).toBe(false);
      expect(isSupportedTool(value), value).toBe(false);
    }
    for (const value of [null, undefined, 0, {}, ['skill'], new String('skill')]) {
      expect(isCustomizationKind(value)).toBe(false);
      expect(isSupportedTool(value)).toBe(false);
    }
  });
});
