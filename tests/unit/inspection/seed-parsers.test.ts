// T076: in-process extraction invocation and its failure boundary (FR-028,
// data-model.md § ToolRecognition).
//
// The behaviour under test is where a failure stops. An extractor reads one
// already-decoded string and touches nothing else, so anything it throws is
// about that one file: the runner turns it into the recognition's `failed`
// state, which the scan publishes as a `recognition-parse-failed` Diagnostic
// under a `partial` commit while every other file continues. What the runner
// must never do is classify, retry, or recover — and what reaches it is never a
// failure outside one file, because reading and enumeration happen before it
// and the commit happens after.
import { describe, expect, it } from 'vitest';
import { RecognitionExtraction } from '../../../src/server/inspection/parsers/extraction';
import { ParsedJsonDocument } from '../../../src/server/inspection/parsers/json';
import { ParsedTomlDocument } from '../../../src/server/inspection/parsers/toml';
import { configuredFallbackBasenamesOf } from '../../../src/server/inspection/rules/instructions/codex';
import { configuredContextFilenamesOf } from '../../../src/server/inspection/rules/instructions/gemini';

describe('recognition extraction', () => {
  it('publishes the declared name of an extractor that succeeds', () => {
    // The same value the inventory row groups by and the detail heading
    // shows: one parse feeds both, so the identity a row uses and the name a
    // detail view shows cannot come from two readings of the file.
    const extraction = RecognitionExtraction.run('greet', () => 'greet');
    expect(extraction.status).toBe('parsed');
    expect(extraction.extracted).toBe('greet');
  });

  it('reports not-attempted when no extractor applies to the kind', () => {
    const extraction = RecognitionExtraction.run('anything', null);
    expect(extraction.status).toBe('not-attempted');
    expect(extraction.extracted).toBeUndefined();
  });

  it('confines a thrown parser failure to the recognition', () => {
    const extraction = RecognitionExtraction.run('greet', () => {
      throw new SyntaxError('unterminated flow sequence');
    });
    expect(extraction.status).toBe('failed');
    expect(extraction.extracted).toBeUndefined();
  });

  it('runs the extractor once and inspects nothing about what it threw', () => {
    // No classification, no retry, no recovered value (FR-029): the runner
    // records that this file's extraction failed and stops. A second call
    // would be a retry, and reading the thrown value would be the cause
    // inspection the failure model forbids — which is also what keeps a
    // parser message out of every published record.
    let calls = 0;
    const thrown = Object.assign(new Error('injected parser failure'), {
      code: 'EMFILE',
      cause: new Error('inner'),
    });
    const extraction = RecognitionExtraction.run('greet', () => {
      calls += 1;
      throw thrown;
    });
    expect(calls).toBe(1);
    expect(extraction.status).toBe('failed');
    expect(extraction.extracted).toBeUndefined();
    // The record carries the state and nothing from the failure itself.
    expect(JSON.stringify(extraction)).not.toContain('injected parser failure');
    expect(JSON.stringify(extraction)).not.toContain('EMFILE');
  });

  it('imposes no Inspector limit on document size', () => {
    // Capacity is the environment's. A product-defined ceiling would fail a
    // large but perfectly ordinary customization file the vendor would load.
    const large = 'x'.repeat(2_000_000);
    const extraction = RecognitionExtraction.run(large, (sourceText) => sourceText);
    expect(extraction.status).toBe('parsed');
    expect(extraction.extracted).toHaveLength(large.length);
  });
});

describe('the Codex carrier seed extraction (T1086)', () => {
  it('resolves every declared fallback basename in authored order', () => {
    const extraction = configuredFallbackBasenamesOf(
      'project_doc_fallback_filenames = ["TEAM_GUIDE.md", "GUIDE.codex.md", "TEAM_GUIDE.md"]\n',
    );
    // Complete retention, duplicates included: the seed parser reports what
    // the carrier declares, and no Inspector cap or dedup edits it.
    expect(extraction).toEqual(['TEAM_GUIDE.md', 'GUIDE.codex.md', 'TEAM_GUIDE.md']);
  });

  it('declares nothing for an absent or differently-typed field', () => {
    // An absent field, or one that is not a string array, is the carrier
    // declaring no fallback names: it configures nothing, atomically.
    expect(configuredFallbackBasenamesOf('other = 1\n')).toBeNull();
    expect(
      configuredFallbackBasenamesOf('project_doc_fallback_filenames = "TEAM_GUIDE.md"\n'),
    ).toBeNull();
    expect(configuredFallbackBasenamesOf('project_doc_fallback_filenames = [1, 2]\n')).toBeNull();
  });

  it('reports an authored empty list as exactly the empty list (T216)', () => {
    // An authored `[]` is a declaration of zero names — a different fact from
    // an absent field, which declares nothing at all. The extraction reports
    // it as declared; the configuration reader derives no plan from a list
    // with nothing in it, so the two stay one behavior with two spellings.
    expect(configuredFallbackBasenamesOf('project_doc_fallback_filenames = []\n')).toEqual([]);
  });

  it('keeps every declared name in whole characters (T216)', () => {
    // Values are read in whole characters (data-model.md § Value fidelity):
    // an astral character is two UTF-16 code units and a combining mark two
    // code points, and both must survive extraction unaltered — a name the
    // walk compares to directory entries cannot be compared through a
    // truncated spelling.
    expect(
      configuredFallbackBasenamesOf(
        'project_doc_fallback_filenames = ["\u{1F680}GUIDE.md", "équipe.md"]\n',
      ),
    ).toEqual(['\u{1F680}GUIDE.md', 'équipe.md']);
  });

  it('declares nothing when any member is not a string (T216)', () => {
    // The field is a string array or it configures nothing, atomically: a
    // mixed array is not partially read, because keeping the strings would
    // publish a list the carrier did not declare.
    expect(
      configuredFallbackBasenamesOf('project_doc_fallback_filenames = ["GUIDE.md", 1]\n'),
    ).toBeNull();
  });

  it('keeps a declared name whatever it spells', () => {
    // The declared value is a name the walk compares to the entries it
    // enumerated, so a name a repository can actually carry is kept, and one
    // no entry could bear — a separator, a dot segment — simply matches
    // nothing. Neither takes the ordinary names declared beside it down
    // (contracts/inspection-path-allowlist.md § "Authored local paths").
    expect(
      configuredFallbackBasenamesOf(
        'project_doc_fallback_filenames = ["VALID.md", "~TEAM.md", "docs/AGENTS.md"]\n',
      ),
    ).toEqual(['VALID.md', '~TEAM.md', 'docs/AGENTS.md']);
    const run = RecognitionExtraction.run(
      'project_doc_fallback_filenames = ["../escape.md"]\n',
      configuredFallbackBasenamesOf,
    );
    expect(run.status).toBe('parsed');
    expect(run.extracted).toEqual(['../escape.md']);
  });

  it('fails the whole extraction only for a document TOML cannot parse', () => {
    expect(() => configuredFallbackBasenamesOf('project_doc_fallback = [unclosed\n')).toThrow();
    const failed = RecognitionExtraction.run(
      'project_doc_fallback = [unclosed\n',
      configuredFallbackBasenamesOf,
    );
    expect(failed.status).toBe('failed');
    expect(failed.extracted).toBeUndefined();
  });
});

describe('the Gemini CLI context-filename seed extraction (specs/002 T020)', () => {
  /** A settings document as the vendor's own loader accepts it: comments and a trailing comma. */
  const COMMENTED_SETTINGS = [
    '{',
    '  // Project settings.',
    '  "context": { "fileName": ["AGENTS.md", "CONTEXT.md"], },',
    '  /* the map below is the MCP row’s */ "mcpServers": {},',
    '}',
    '',
  ].join('\n');

  it('reads a commented settings document with a trailing comma, as the vendor does', () => {
    // `settings.ts` of google-gemini/gemini-cli parses
    // `JSON.parse(stripJsonComments(content))`, so a comment is format syntax
    // and never a declaration (research.md § 6). The trailing comma is blanked
    // by the same seam (`parsers/json.ts` § acceptsComments).
    expect(configuredContextFilenamesOf(COMMENTED_SETTINGS)).toEqual(['AGENTS.md', 'CONTEXT.md']);
    expect(configuredContextFilenamesOf('{ "context": { "fileName": "TEAM.md" } }')).toEqual([
      'TEAM.md',
    ]);
  });

  it('fails the same bytes read as Claude’s strict carrier', () => {
    // One physical spelling, two products, two answers: Claude’s `.mcp.json`
    // is read strictly, so the comment that Gemini CLI’s loader strips is a
    // syntax error there. The seam is asked for a `(tool, path)`, not a path.
    expect(
      () =>
        new ParsedJsonDocument(COMMENTED_SETTINGS, {
          tool: 'claude',
          sourceRelativePath: '.mcp.json',
        }),
    ).toThrow(SyntaxError);
    expect(
      new ParsedJsonDocument(COMMENTED_SETTINGS, {
        tool: 'gemini',
        sourceRelativePath: '.gemini/settings.json',
      }).entries.map((entry) => entry.key),
    ).toEqual(['context', 'mcpServers']);
  });

  it('configures nothing for every unusable declaration, and only that', () => {
    // Absent, wrong type, empty, mixed, or a `context` that is no object: each
    // is one answer, "the default stands", and none is a failure (spec.md
    // FR-004).
    for (const source of [
      '{ "ui": { "theme": "GitHub" } }',
      '{ "context": { "fileName": 42 } }',
      '{ "context": { "fileName": [] } }',
      '{ "context": { "fileName": "" } }',
      '{ "context": { "fileName": ["A.md", ""] } }',
      '{ "context": { "fileName": ["A.md", 7] } }',
      '{ "context": "GEMINI.md" }',
    ]) {
      expect(configuredContextFilenamesOf(source), source).toBeNull();
    }
  });

  it('keeps every declared name in whole characters, whatever it spells', () => {
    // No validation: a name with a slash, a dot-prefix, or non-ASCII is the
    // author’s declaration, compared as written to what the walk enumerated.
    expect(
      configuredContextFilenamesOf(
        '{ "context": { "fileName": ["docs/CONTEXT.md", ".context.md", "\u00e9t\u00e9.md", "GEMINI.md"] } }',
      ),
    ).toEqual(['docs/CONTEXT.md', '.context.md', '\u00e9t\u00e9.md', 'GEMINI.md']);
  });

  it('throws only for a document the format cannot parse', () => {
    // The throw is the caller’s extraction boundary’s: a failed read
    // configures nothing, and the carrier’s own settings recognition is
    // where the parse failure gets its diagnostic (FR-028).
    expect(() => configuredContextFilenamesOf('{ "context": { "fileName": ')).toThrow(SyntaxError);
    expect(() => configuredContextFilenamesOf('')).toThrow(SyntaxError);
  });
});

describe('the TOML parsing seam (T1090)', () => {
  it('hands back the parser resolution and extracts nothing', () => {
    // The parser module mirrors markdown.ts: one parse, the parser's own
    // answer, and no vendor reading — those live beside the rules that own
    // them.
    const document = new ParsedTomlDocument('a = 1\n[table]\nb = "x"\n');
    expect(document.table['a']).toBe(1);
    expect(document.table['table']).toEqual({ b: 'x' });
    expect(new ParsedTomlDocument('').table).toEqual({});
    expect(() => new ParsedTomlDocument('= broken')).toThrow();
  });
});
