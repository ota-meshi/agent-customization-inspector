// In-process extraction invocation on the scan path (T089; FR-028,
// data-model.md § ToolRecognition).
//
// Parsing runs in the scanning process, in the same event loop, with no worker,
// child process, or sandbox: the parsers read one already-decoded string and
// touch nothing else, so isolating them would buy no boundary that matters.
// Memory and time capacity are the environment's — Node.js and the machine —
// and the Inspector imposes no numeric ceiling of its own on document size,
// nesting depth, or parse duration. A product-defined cap would turn a large
// but perfectly ordinary customization file into a failure the vendor would
// have loaded.
//
// What this module owns is the failure boundary, which is the reason parsing
// is invoked through it rather than called directly. An extractor's throw is
// confined to one file by construction: it is handed a string that was already
// read and it performs no I/O, so nothing it can raise is about another file or
// about the session. That throw becomes the recognition's `failed` state, whose
// caller (`scan.ts`) attaches the `recognition-parse-failed` Diagnostic and
// commits a `partial` generation while the complete readable source stays
// displayed and comparison-eligible.
//
// Failures that are *not* confined to one file never reach here: directory
// enumeration and file reading happen in `traversal.ts`, and a coordinator or
// commit failure happens after this returns. Both propagate unchanged to the
// trigger-owning boundary — the accepted job's catch for a session-API rescan,
// or the process top level for the ownerless startup scan — because converting
// one into a Diagnostic would fabricate a partial result out of an attempt that
// never completed.
import type { DeclaredMetadataEntryDto, RecognitionParseStatus } from '../../../shared/api-types';

/**
 * The outcome of one recognition's extraction
 * (data-model.md § ToolRecognition `parseStatus`). Extraction is
 * all-or-nothing per recognition: a failure publishes no metadata at all
 * rather than the part that happened to succeed, because a partially applied
 * extractor cannot say which authored values it skipped.
 *
 * A class with a private constructor, so "empty unless `parsed`" is a fact of
 * construction rather than a sentence: the two non-`parsed` outcomes exist
 * only as the fixed metadata-less instances below.
 */
export class RecognitionExtraction {
  /** The closed extraction state; see {@link RecognitionParseStatus}. */
  public readonly status: RecognitionParseStatus;

  /**
   * The allowlisted fields the extractor read, in the order it emits them —
   * for the shipped extractor, its allowlist row's. Empty unless `parsed`.
   *
   * A recognizer that needs one of these values — the declared name a skill
   * row groups by, for instance — reads it from here rather than parsing the
   * file a second time, so the identity a row uses and the value a detail
   * view shows always come from one parse.
   */
  public readonly declaredMetadata: readonly DeclaredMetadataEntryDto[];

  /**
   * Reached only through the factories below, which is what fixes the two
   * non-`parsed` outcomes to their metadata-less instances.
   */
  private constructor(
    status: RecognitionParseStatus,
    declaredMetadata: readonly DeclaredMetadataEntryDto[],
  ) {
    this.status = status;
    this.declaredMetadata = declaredMetadata;
  }

  /** The fixed `not-attempted` outcome, for a recognition no extractor applies to. */
  static readonly #NOT_ATTEMPTED = new RecognitionExtraction('not-attempted', []);

  /** The fixed `failed` outcome; the caller attaches the Diagnostic (FR-028). */
  static readonly #FAILED = new RecognitionExtraction('failed', []);

  /**
   * Runs one recognition's extractor, confining any failure to that
   * recognition (FR-028).
   *
   * `extract` is called with the file's complete decoded text and returns the
   * fields its allowlist row defines. Returning null means no allowlisted
   * extractor applies, which is `not-attempted` — the honest state for a
   * recognition with nothing to extract, and not a claim that parsing
   * succeeded.
   *
   * The text is always present: only a readable candidate is recognized at
   * all (`scan.ts`, the `readable` arm of the per-file publication matrix),
   * so a binary or unreadable file reaches no recognizer and needs no
   * absent-source case here.
   */
  public static run(
    sourceText: string,
    extract: (sourceText: string) => readonly DeclaredMetadataEntryDto[] | null,
  ): RecognitionExtraction {
    try {
      const declaredMetadata = extract(sourceText);
      if (declaredMetadata === null) {
        return RecognitionExtraction.#NOT_ATTEMPTED;
      }
      return new RecognitionExtraction('parsed', declaredMetadata);
    } catch {
      // Deliberately no cause inspection, classification, or retry. Every
      // throw reaching this line came from an extractor reading one in-memory
      // string, so it is about this file's content and nothing else; the
      // Diagnostic the caller attaches already tells the user which file and
      // what remains available.
      return RecognitionExtraction.#FAILED;
    }
  }
}
