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
import type { DeclaredMetadataEntryDto } from '../../../src/shared/api-types';

const NAME_FIELD: DeclaredMetadataEntryDto = { fieldId: 'codex.skill.name', value: 'greet' };

describe('recognition extraction', () => {
  it('publishes the fields of an extractor that succeeds', () => {
    // The same list the recognizer reads its declared name from: one parse
    // feeds both, so the identity a row uses and the value a detail view shows
    // cannot come from two readings of the file.
    const extraction = RecognitionExtraction.run('greet', () => [NAME_FIELD]);
    expect(extraction.status).toBe('parsed');
    expect(extraction.declaredMetadata).toEqual([NAME_FIELD]);
  });

  it('reports not-attempted when no allowlisted extractor applies', () => {
    const extraction = RecognitionExtraction.run('anything', () => null);
    expect(extraction).toEqual({ status: 'not-attempted', declaredMetadata: [] });
  });

  it('confines a thrown parser failure to the recognition', () => {
    const extraction = RecognitionExtraction.run('greet', () => {
      throw new SyntaxError('unterminated flow sequence');
    });
    expect(extraction).toEqual({ status: 'failed', declaredMetadata: [] });
  });

  it('imposes no Inspector limit on document size', () => {
    // Capacity is the environment's. A product-defined ceiling would fail a
    // large but perfectly ordinary customization file the vendor would load.
    const large = 'x'.repeat(2_000_000);
    const extraction = RecognitionExtraction.run(large, (sourceText) => [
      { fieldId: 'codex.skill.description', value: sourceText },
    ]);
    expect(extraction.status).toBe('parsed');
    expect(extraction.declaredMetadata[0]?.value).toHaveLength(large.length);
  });
});
