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
import type { RecognitionParseStatus } from '../../../shared/api-types';

/**
 * The outcome of one `(file, kind)` extraction
 * (data-model.md § ToolRecognition `parseStatus`) — run once and shared by
 * every recognition of the kind — carrying whatever that
 * kind reads out of the authored text: for a skill, the
 * presentation its detail surface is built from.
 *
 * A class with a private constructor, so "nothing extracted unless `parsed`"
 * is a fact of construction rather than a sentence: {@link run} is the only
 * caller, and it passes `undefined` for every outcome that is not `parsed`.
 */
export class RecognitionExtraction<Extracted> {
  /** The closed extraction state; see {@link RecognitionParseStatus}. */
  public readonly status: RecognitionParseStatus;

  /**
   * What the extractor read, or undefined when none ran or the run failed.
   * Only ever set on a `parsed` outcome, which is what keeps a failed
   * recognition from publishing the part that happened to parse (FR-028).
   */
  public readonly extracted: Extracted | undefined;

  /**
   * Reached only through {@link run}, which is what keeps the two non-`parsed`
   * outcomes empty.
   */
  private constructor(status: RecognitionParseStatus, extracted: Extracted | undefined) {
    this.status = status;
    this.extracted = extracted;
  }

  /**
   * Runs one recognition's extractor, confining any failure to that
   * recognition (FR-028).
   *
   * `extract` is called with the file's complete decoded text. A null
   * extractor means none applies to the recognized kind, which is
   * `not-attempted` — the honest state for a recognition with nothing to
   * extract, and not a claim that parsing succeeded.
   *
   * The text is always present: only a readable candidate is recognized at
   * all (`scan.ts`, the `readable` arm of the per-file publication matrix),
   * so a binary or unreadable file reaches no recognizer and needs no
   * absent-source case here.
   */
  public static run<Extracted>(
    sourceText: string,
    extract: ((sourceText: string) => Extracted) | null,
  ): RecognitionExtraction<Extracted> {
    if (extract === null) {
      return new RecognitionExtraction<Extracted>('not-attempted', undefined);
    }
    try {
      return new RecognitionExtraction<Extracted>('parsed', extract(sourceText));
    } catch {
      // Deliberately no cause inspection, classification, or retry. Every
      // throw reaching this line came from an extractor reading one in-memory
      // string, so it is about this file's content and nothing else; the
      // Diagnostic the caller attaches already tells the user which file and
      // what remains available.
      return new RecognitionExtraction<Extracted>('failed', undefined);
    }
  }
}
