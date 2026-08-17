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
import { ParsedTomlDocument } from '../../../src/server/inspection/parsers/toml';
import { configuredFallbackBasenamesOf } from '../../../src/server/inspection/rules/codex';

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
