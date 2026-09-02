// T017: public entity shapes — readable encodings with preserved U+FFFD,
// textless binary, the non-authorizing SourceBoundary, root
// presentation encoding, evidence vocabulary, and opaque IDs.
import { describe, expect, it } from 'vitest';

import {
  applicabilityRangePresentation,
  CUSTOMIZATION_KIND_ORDER,
  CUSTOMIZATION_KIND_TEXT,
  LIFECYCLE_QUALIFIER_ORDER,
  SUPPORTED_TOOL_ORDER,
  SUPPORTED_TOOL_TEXT,
  createOpaqueId,
  createSourceBoundaryDto,
  decodeSourceBytes,
  encodeRootPresentation,
  escapeControlCharacters,
  isCustomizationKind,
  isSupportedTool,
  accessiblePresentationLabel,
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
    // Raw C0/C1 controls draw nothing: a JSON \"\\u0000\" resolves to a NUL
    // the surfaces would render glyphlessly, so a value made only of them is
    // invisible and gets the spelled-out note beside it.
    expect(rendersNothingVisible('\u0000')).toBe(true);
    expect(rendersNothingVisible('\u0001\u009F')).toBe(true);
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

  it('spells a lone surrogate out while astral characters render as themselves', () => {
    // Strict JSON's "\uD800" escape resolves to a lone surrogate, which a
    // browser draws as the one replacement glyph: two names differing only
    // in which surrogate they carry would render identically, and the
    // carrier's source is never displayed to tell them apart (FR-007).
    expect(escapeControlCharacters('a\uD800b')).toBe('a\\uD800b');
    expect(escapeControlCharacters('a\uDC01b')).toBe('a\\uDC01b');
    // A well-formed pair is one code point outside the class, so an astral
    // character stays as authored.
    expect(escapeControlCharacters('a\u{1F600}b')).toBe('a\u{1F600}b');
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

  it('spells an astral default-ignorable code point out whole, both surrogates', () => {
    // The supplementary-plane variation selectors are default-ignorable, so
    // the class matches the whole code point; spelling only its first code
    // unit would emit the high surrogate alone, and two names differing only
    // in which selector they carry would render as one text — the exact
    // collision the escape exists to prevent.
    expect(escapeControlCharacters('漢\u{E0100}.md')).toBe('漢\\uDB40\\uDD00.md');
    expect(escapeControlCharacters('漢\u{E0101}.md')).toBe('漢\\uDB40\\uDD01.md');
    expect(escapeControlCharacters('漢\u{E0100}.md')).not.toBe(
      escapeControlCharacters('漢\u{E0101}.md'),
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

  it('spells out an invisible segment of a nested path rather than dropping it', () => {
    // `/` draws, so a nested value never reaches the whitespace fallback — but
    // its invisible segment is still a difference a reader has to be able to
    // see: `docs/` and `docs/` + U+200B are two paths one tree can hold, and
    // unescaped they read as one (FR-025).
    expect(pathPresentationLabel('docs/​')).toBe('docs/\\u200B');
    expect(pathPresentationLabel('docs/​')).not.toBe(pathPresentationLabel('docs/'));
  });

  it('keeps a name carrying an invisible character apart from the name without it', () => {
    // The case every name-headed row faces: two rows whose names differ only
    // by a zero-width space must not draw as one row's name twice.
    expect(pathPresentationLabel('deploy​')).toBe('deploy\\u200B');
    expect(pathPresentationLabel('deploy​')).not.toBe(pathPresentationLabel('deploy'));
  });
});

describe('accessiblePresentationLabel', () => {
  it('is the visible spelling for an ordinary value', () => {
    expect(accessiblePresentationLabel('skills/deploy/SKILL.md')).toBe('skills/deploy/SKILL.md');
    expect(accessiblePresentationLabel('a b.md')).toBe('a b.md');
  });

  it('starts with the visible label and appends the spelled-out form for whitespace runs', () => {
    // WCAG 2.5.3 Label in Name: a speech-input user says what they see, so
    // the accessible name must contain the visible text — while the appended
    // spelled-out form keeps `a b.md` and `a  b.md` announced apart
    // (WCAG 2.4.4, FR-025).
    expect(accessiblePresentationLabel('a  b.md')).toBe('a  b.md (a\\u0020\\u0020b.md)');
    expect(
      accessiblePresentationLabel('a  b.md').startsWith(pathPresentationLabel('a  b.md')),
    ).toBe(true);
    expect(accessiblePresentationLabel('a  b.md')).not.toBe(accessiblePresentationLabel('a b.md'));
  });

  it('is the spelled-out form alone where nothing draws, exactly as the visible label is', () => {
    expect(accessiblePresentationLabel(' ')).toBe('\\u0020');
    expect(accessiblePresentationLabel(' ')).toBe(pathPresentationLabel(' '));
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

describe('an applicability range as a row renders it', () => {
  it('escapes an invisible character inside an otherwise visible range', () => {
    // Two rows whose ranges differ only by a default-ignorable code point are
    // two rows: rendering both as `src/**` would show one text for two
    // distinct declared ranges (FR-025). The whole-value fallback cannot
    // cover this — the value draws, and only the character inside it does
    // not.
    expect(applicabilityRangePresentation('src/\u200B**')).toBe('src/\\u200B**');
    expect(applicabilityRangePresentation('src/**')).toBe('src/**');
  });

  it('keeps every other backslash, which is glob syntax', () => {
    expect(applicabilityRangePresentation('src/\\*literal*')).toBe('src/\\*literal*');
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

describe('closed order arrays', () => {
  // T1142: the interface renders these catalogs by walking them — the tool
  // legend, the kind rail, and the two filter selects each iterate one — so a
  // member missing from an array is a product or a kind the reader never sees,
  // and a repeated one is a row drawn twice. The compiler does not catch
  // either: a `Readonly<Record<Union, T>>` is exhaustiveness-checked, and a
  // `readonly Union[]` is not, so the arrays are what needs a gate. The
  // label tables are the union's own membership here, being the values the
  // compiler does check.
  it.each([
    ['SUPPORTED_TOOL_ORDER', SUPPORTED_TOOL_ORDER as readonly string[], SUPPORTED_TOOL_TEXT],
    [
      'CUSTOMIZATION_KIND_ORDER',
      CUSTOMIZATION_KIND_ORDER as readonly string[],
      CUSTOMIZATION_KIND_TEXT,
    ],
  ])('%s covers its union exactly once', (_name, order, text) => {
    expect(order.toSorted()).toEqual(Object.keys(text).toSorted());
    expect(new Set(order).size).toBe(order.length);
  });
});
