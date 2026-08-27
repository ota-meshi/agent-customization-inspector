// T075, T371 (parsing seam): byte decoding, inert frontmatter reading, and
// the JSON-family document seams (FR-025, FR-028, spec.md § Byte Decode
// Outcomes, data-model.md § Field reading).
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
import { ParsedMarkdownDocument } from '../../../src/server/inspection/parsers/markdown';
import { ParsedJsonDocument } from '../../../src/server/inspection/parsers/json';
import { ParsedTomlDocument } from '../../../src/server/inspection/parsers/toml';
import type { DeclaredEntryDto } from '../../../src/shared/api-types';
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

/**
 * The declarations of one document as the parser publishes them: the rendered
 * entries in the order the file wrote its keys, empty when the document
 * declares no block. Asserting against the entry array is what makes that
 * order part of the claim, and the entry's own `keyKind` is what keeps a
 * numeric key distinct from the string that spells it.
 */
function declarationsOf(sourceText: string): readonly DeclaredEntryDto[] {
  return new ParsedMarkdownDocument(sourceText).frontmatterEntries;
}

/** One entry reduced to the `[key, scalar text]` pair most cases assert. */
function scalarPairsOf(sourceText: string): readonly (readonly [string, string])[] {
  return declarationsOf(sourceText).map((entry) => [
    entry.key,
    entry.value.kind === 'scalar' ? entry.value.text : `<${entry.value.kind}>`,
  ]);
}

describe('frontmatter reading', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'resolves to the value a product loading the file would have: %s',
    (_id, testCase) => {
      const declared = declarationsOf(testCase.sourceText).find(
        (entry) => entry.keyKind === 'string' && entry.key === 'name',
      );
      // Compared as the rendered text, because that is the form the surfaces
      // publish; `007` resolves to the number 7 and reads as `7`, and a
      // non-scalar value is no name at all.
      const read = declared?.value.kind === 'scalar' ? declared.value.text : null;
      expect(read).toBe(testCase.name);
    },
  );

  it.each(MALFORMED_SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'throws for a document it cannot parse: %s',
    (_id, testCase) => {
      // The one refusal, and not an opinion about the content: there is no
      // value to report. It reaches `extraction.ts`, which turns it into that
      // recognition's `failed` state with the source still readable.
      expect(() => new ParsedMarkdownDocument(testCase.sourceText)).toThrow();
    },
  );

  it('resolves a document with no frontmatter block to no fields', () => {
    // Not a failure: a `SKILL.md` that declares nothing is an ordinary file,
    // and failing it would turn "declares no metadata" into a diagnostic.
    expect(declarationsOf('---\nno closing fence\n')).toEqual([]);
    expect(declarationsOf('# Just a heading\n')).toEqual([]);
    expect(declarationsOf('---\n---\n')).toEqual([]);
  });

  it('reads a block whose closing fence is at end of file', () => {
    expect(scalarPairsOf('---\nname: g\n---')).toEqual([['name', 'g']]);
  });

  it('reads a block that uses CRLF line endings', () => {
    expect(scalarPairsOf('---\r\nname: g\r\n---\r\nBody\r\n')).toEqual([['name', 'g']]);
  });

  it('does not mistake a dashed value for the closing fence', () => {
    expect(scalarPairsOf('---\nname: ---\n---\nBody\n')).toEqual([['name', '---']]);
  });

  it.each([
    ['a fence with a trailing space', '--- \nname: g\n---\n'],
    ['a closing fence with a trailing space', '---\nname: g\n--- \n'],
    ['a YAML document-end marker as the closing fence', '---\nname: g\n...\n'],
    ['four dashes', '----\nname: g\n----\n'],
    ['an info string on the opening fence', '---yaml\nname: g\n---\n'],
    ['a leading blank line', '\n---\nname: g\n---\n'],
  ])('recognizes no block in %s', (_shape, source) => {
    expect(declarationsOf(source)).toEqual([]);
  });

  it('reads YAML 1.2 core semantics rather than 1.1', () => {
    // Left to a default, `yes` would be a boolean and `12:30` a sexagesimal
    // number, and a customization's fields would mean something other than what
    // its author's own tools read.
    expect(scalarPairsOf('---\nname: yes\nother: 12:30\n---\n')).toEqual([
      ['name', 'yes'],
      ['other', '12:30'],
    ]);
  });

  it('resolves a key declared twice to its later declaration', () => {
    // Refusing the document instead would be this tool deciding a customization
    // is invalid, which is not its job.
    expect(scalarPairsOf('---\nname: first\nname: second\n---\n')).toEqual([['name', 'second']]);
  });

  it('keeps the keys in the order the file wrote them', () => {
    // A plain object would not: JavaScript lists integer-like keys first, in
    // ascending numeric order, so a file declaring `10` then `2` would be
    // shown `2` first — an order no one wrote.
    expect(
      declarationsOf('---\n"10": ten\n"2": two\na: letter\n---\n').map((entry) => [
        entry.keyKind,
        entry.key,
      ]),
    ).toEqual([
      ['string', '10'],
      ['string', '2'],
      ['string', 'a'],
    ]);
    // Unquoted, the same keys resolve to the integers a product loading the
    // file gets — which `keyKind` keeps distinct from the strings spelling
    // them — and stay in the order they were declared.
    expect(
      declarationsOf('---\n10: ten\n2: two\na: letter\n---\n').map((entry) => [
        entry.keyKind,
        entry.key,
      ]),
    ).toEqual([
      ['number', '10'],
      ['number', '2'],
      ['string', 'a'],
    ]);
  });

  it('resolves an alias and keeps the scalar an unknown tag carried', () => {
    expect(scalarPairsOf('---\na: &x g\nname: *x\n---\n')).toEqual([
      ['a', 'g'],
      ['name', 'g'],
    ]);
    expect(scalarPairsOf('---\nname: !!weird greet\n---\n')).toEqual([['name', 'greet']]);
  });
});

/**
 * A reading whose `(tool, path)` the module's tables do not name, which is
 * every Claude and Codex carrier and this vendor's own MCP carriers.
 */
const STRICT_READING = { tool: 'claude', sourceRelativePath: '.mcp.json' } as const;

/** A reading the tables do name: the VS Code carrier of the Copilot surface. */
const JSONC_READING = { tool: 'copilot', sourceRelativePath: '.vscode/mcp.json' } as const;

describe('the JSON-family document seams (T371 parsing seam)', () => {
  it('keeps the strict document strict: a comment or trailing comma fails whole', () => {
    // The format is the caller's contract, fixed by which class it names: the
    // root `.mcp.json` reading must fail exactly where the vendor's own
    // strict reader would, and no option exists to relax it (T371's
    // never-for-root rule, enforced by identifier).
    expect(() => new ParsedJsonDocument('// comment\n{}', STRICT_READING)).toThrow();
    expect(() => new ParsedJsonDocument('{ "a": 1, }', STRICT_READING)).toThrow();
    expect(() => new ParsedJsonDocument('', STRICT_READING)).toThrow();
  });

  it('reads JSONC comments and a trailing comma into the same rendered entries', () => {
    // The leniency VS Code's own config files document, with comments as
    // format syntax, never declarations: the comment syntax is blanked and
    // the remainder resolves through the same JSON.parse as strict JSON.
    const document = new ParsedJsonDocument(
      ['{', '  // stdio server', '  "a": 1,', '  /* block */ "b": [true, null],', '}'].join('\n'),
      JSONC_READING,
    );
    expect(document.entries).toEqual([
      { key: 'a', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '1' } },
      {
        key: 'b',
        keyKind: 'string',
        value: {
          kind: 'sequence',
          items: [{ kind: 'scalar', scalarKind: 'boolean', text: 'true' }, { kind: 'absent' }],
        },
      },
    ]);
  });

  it('fails a malformed JSONC document whole instead of publishing the recovery', () => {
    // Blanking the comment syntax repairs nothing else: any syntax error in
    // the remainder fails the document whole (FR-028), and an empty document
    // is such an error, as it is for JSON.parse('').
    expect(() => new ParsedJsonDocument('{ "a": , }', JSONC_READING)).toThrow(SyntaxError);
    expect(() => new ParsedJsonDocument('{ "a": 1 ', JSONC_READING)).toThrow(SyntaxError);
    expect(() => new ParsedJsonDocument('', JSONC_READING)).toThrow(SyntaxError);
  });

  it("renders entries in the parser's resolved order, the platform enumeration included", () => {
    // A plain parsed object enumerates integer-like keys first in numeric
    // order whatever the file's spelling ordered — a JavaScript property of
    // every parsed object, accepted rather than worked around (contracts/http-api.md § get-mcp-carrier-detail
    // spells the published order as the parser's). Both classes share the
    // one `JSON.parse` resolution — the JSONC class only blanks the comment
    // syntax first — so this case pins the accepted behavior for both.
    const source = '{ "10": { "z": 1, "1": 2 }, "2": true }';
    for (const document of [
      new ParsedJsonDocument(source, STRICT_READING),
      new ParsedJsonDocument(source, JSONC_READING),
    ]) {
      expect(document.entries.map((entry) => entry.key)).toEqual(['2', '10']);
      const nested = document.entries.find((entry) => entry.key === '10');
      if (nested?.value.kind !== 'mapping') {
        throw new Error('expected the "10" entry to be a mapping');
      }
      expect(nested.value.entries.map((entry) => entry.key)).toEqual(['1', 'z']);
    }
  });

  it('keeps an authored __proto__ key a declaration in either format', () => {
    // `JSON.parse` defines `__proto__` as an ordinary own property, and both
    // classes share that one resolution — the pinned regression is a lenient
    // parser whose object construction drops the key, which would make a
    // `.vscode/mcp.json` server of that name vanish with no diagnostic
    // (FR-028).
    const source = '{ "__proto__": { "command": "x" }, "ok": 1 }';
    for (const document of [
      new ParsedJsonDocument(source, STRICT_READING),
      new ParsedJsonDocument(source, JSONC_READING),
    ]) {
      expect(document.entries.map((entry) => entry.key)).toEqual(['__proto__', 'ok']);
      expect(document.entries[0]!.value).toEqual({
        kind: 'mapping',
        entries: [
          {
            key: 'command',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'x' },
          },
        ],
      });
    }
  });

  it("keeps JSONC's duplicate-key semantics: later value, earlier place", () => {
    const document = new ParsedJsonDocument('{ "a": 1, "b": 2, "a": 3 }', JSONC_READING);
    expect(document.entries).toEqual([
      { key: 'a', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '3' } },
      { key: 'b', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '2' } },
    ]);
  });

  it("keeps JSON.parse's duplicate-key semantics: later value, earlier place", () => {
    const document = new ParsedJsonDocument('{ "a": 1, "b": 2, "a": 3 }', STRICT_READING);
    expect(document.entries).toEqual([
      { key: 'a', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '3' } },
      { key: 'b', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '2' } },
    ]);
  });

  it("renders an authored negative zero as String's 0, in every format", () => {
    // `String(-0)` is `"0"`: the renderings publish the platform's own
    // resolution as is, with no signed-zero special case — the same
    // acceptance as the integer-like key enumeration order.
    expect(new ParsedJsonDocument('{ "n": -0 }', STRICT_READING).entries).toEqual([
      { key: 'n', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '0' } },
    ]);
    expect(new ParsedTomlDocument('n = -0.0').entries).toEqual([
      { key: 'n', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '0' } },
    ]);
    expect(declarationsOf('---\nn: -0.0\n---\n')).toEqual([
      { key: 'n', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'number', text: '0' } },
    ]);
  });

  it('renders no entry for a non-object root, in either format', () => {
    // A root array, scalar, or null declares no key — a rendering fact, not a
    // parse failure — so the entries are empty rather than invented.
    expect(new ParsedJsonDocument('[1, 2]', STRICT_READING).entries).toEqual([]);
    expect(new ParsedJsonDocument('null', STRICT_READING).entries).toEqual([]);
    expect(new ParsedJsonDocument('// just a list\n[1, 2]', JSONC_READING).entries).toEqual([]);
  });
});

describe('the inert TOML seam a Codex custom agent reads through (T517)', () => {
  it('resolves the agent schema keys into the shared declaration shape', () => {
    // The parse decides nothing about the format and extracts nothing from
    // the result: `name`, `description`, and `developer_instructions` are
    // entries like any other, and a multi-line basic string resolves to the
    // text between its delimiters, its leading newline dropped by TOML's own
    // rule (data-model.md § Field reading).
    const document = new ParsedTomlDocument(
      [
        'name = "reviewer"',
        'model_reasoning_effort = "high"',
        'developer_instructions = """',
        'Review code like an owner.',
        '"""',
        '',
      ].join('\n'),
    );
    expect(document.entries).toEqual([
      {
        key: 'name',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'reviewer' },
      },
      {
        key: 'model_reasoning_effort',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'high' },
      },
      {
        key: 'developer_instructions',
        keyKind: 'string',
        value: {
          kind: 'scalar',
          scalarKind: 'string',
          text: 'Review code like an owner.\n',
        },
      },
    ]);
  });

  it('keeps a nested table and an array of tables in the shape the file wrote', () => {
    // Nothing is summarized away: a table stays a mapping and an array of
    // tables a sequence of mappings, which is what lets a detail publish an
    // agent's `skills.config` and `mcp_servers` by the keys the file wrote.
    const document = new ParsedTomlDocument(
      [
        '[[skills.config]]',
        'path = "./.agents/skills/deploy"',
        '',
        '[mcp_servers.docs]',
        'url = "https://docs.example.com/mcp"',
        '',
      ].join('\n'),
    );
    expect(document.entries).toEqual([
      {
        key: 'skills',
        keyKind: 'string',
        value: {
          kind: 'mapping',
          entries: [
            {
              key: 'config',
              keyKind: 'string',
              value: {
                kind: 'sequence',
                items: [
                  {
                    kind: 'mapping',
                    entries: [
                      {
                        key: 'path',
                        keyKind: 'string',
                        value: {
                          kind: 'scalar',
                          scalarKind: 'string',
                          text: './.agents/skills/deploy',
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      {
        key: 'mcp_servers',
        keyKind: 'string',
        value: {
          kind: 'mapping',
          entries: [
            {
              key: 'docs',
              keyKind: 'string',
              value: {
                kind: 'mapping',
                entries: [
                  {
                    key: 'url',
                    keyKind: 'string',
                    value: {
                      kind: 'scalar',
                      scalarKind: 'string',
                      text: 'https://docs.example.com/mcp',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });

  it('fails a malformed document whole rather than publishing what parsed', () => {
    // Extraction is all-or-nothing (FR-028): the throw is what the
    // recognition's `failed` state is made of, and the file's complete
    // readable source stays displayed under its own tab.
    expect(() => new ParsedTomlDocument('name = "unterminated\n')).toThrow();
    expect(() => new ParsedTomlDocument('[mcp_servers.dup]\n\n[mcp_servers.dup]\n')).toThrow();
  });

  it('resolves an empty document to no declarations rather than a failure', () => {
    // An agent file that declares nothing is a file that declares nothing —
    // a rendering fact, not a parse error, so it publishes an empty
    // declaration set and keeps its recognition.
    expect(new ParsedTomlDocument('').entries).toEqual([]);
    expect(new ParsedTomlDocument('# only a comment\n').entries).toEqual([]);
  });

  it('imposes no Inspector cap on document size, nesting, or integer width', () => {
    // Capacity is Node.js's and the machine's; a product-defined ceiling would
    // turn a large but perfectly ordinary customization file into a failure
    // the vendor would have loaded (FR-029, parsers/extraction.ts).
    const wide = Array.from({ length: 5_000 }, (_, index) => `k${index} = ${index}`).join('\n');
    expect(new ParsedTomlDocument(wide).entries).toHaveLength(5_000);
    // 200 nested tables: the depth is the file's, and the rendering recurses
    // as far as the document goes.
    const deepKey = Array.from({ length: 200 }, (_, index) => `n${index}`).join('.');
    expect(() => new ParsedTomlDocument(`[${deepKey}]\nleaf = 1\n`)).not.toThrow();
    // A 64-bit integer past `Number.MAX_SAFE_INTEGER` keeps its exact digits
    // instead of failing the whole document over a value no reader looks at.
    expect(new ParsedTomlDocument('big = 9223372036854775807').entries).toEqual([
      {
        key: 'big',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'number', text: '9223372036854775807' },
      },
    ]);
  });
});
