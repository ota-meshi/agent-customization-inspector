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
