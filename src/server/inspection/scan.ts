// Closed file-confined publication matrix for one Source scan attempt
// (spec.md § Closed Scan Publication Outcomes, FR-002/FR-028/FR-030). This
// module converts the traversal module's typed per-file results into the
// exact publication input of a generation commit: a file-confined outcome
// stays confined to its file as a diagnostic-only item and makes an
// otherwise publishable generation `partial`; an unreadable root fails the
// Source attempt with the source-scoped Diagnostic and publishes no partial
// inventory; and a failure that is not confined to one file is never
// converted into a Diagnostic — it propagates ordinarily from the traversal
// call, aborts the attempt without a commit, and is reported as the failed
// request's real error (FR-030 retains the last committed snapshot). It
// performs no filesystem I/O itself.
import { createOpaqueId } from '../../shared/entities';
import {
  createDiagnostic,
  serializeDiagnostic,
  sortDiagnostics,
  type DiagnosticRecord,
  type LifecycleOwnerKey,
} from '../../shared/diagnostics';
import type { CustomizationFileDto, SerializedDiagnostic } from '../../shared/api-types';
import type { GenerationOutcome } from '../session/scan-generation';
import type { TraversalScanResult } from './traversal';

/**
 * The assembled publication of one completed traversal
 * (spec.md § Closed Scan Publication Outcomes):
 *  - 'publishable'    traversal completed; the commit input carries every
 *                     file (complete or diagnostic-only) plus the attempt's
 *                     diagnostics, with `outcome` `partial` exactly when a
 *                     file-confined outcome exists (FR-028)
 *  - 'source-failed'  the root was missing or unreadable: the attempt fails
 *                     with the source-scoped `root-unreadable` Diagnostic
 *                     and no generation (FR-002)
 */
export type ScanPublication =
  | {
      /** Traversal completed and one atomic generation may commit. */
      readonly kind: 'publishable';
      /** `partial` exactly when any file-confined outcome exists (FR-028). */
      readonly outcome: GenerationOutcome;
      /** Every published file, complete and diagnostic-only alike. */
      readonly files: readonly CustomizationFileDto[];
      /** The attempt's serialized diagnostics. */
      readonly diagnostics: readonly SerializedDiagnostic[];
    }
  | {
      /** The Source attempt failed; nothing commits (FR-002). */
      readonly kind: 'source-failed';
      /** The source-scoped `root-unreadable` lifecycle Diagnostic. */
      readonly diagnostic: SerializedDiagnostic;
    };

/**
 * One recognition outcome produced for a readable file by the recognizers
 * (data-model.md § ToolRecognition). The publication matrix consumes only
 * the closed extraction state; extraction content stays recognizer-owned.
 */
export interface CandidateRecognitionOutcome {
  /** Opaque recognition identity within the producing attempt. */
  readonly recognitionId: string;
  /**
   * Closed extraction state: 'not-attempted' means no allowlisted extractor
   * applies, 'failed' is all-or-nothing for this recognition only (FR-028).
   */
  readonly parseStatus: 'not-attempted' | 'parsed' | 'failed';
}

/** Input of {@link assembleScanPublication}: one Source's completed traversal. */
export interface ScanPublicationInput {
  /** The scanned Source every published record belongs to. */
  readonly sourceId: string;
  /**
   * The lifecycle owner a `root-unreadable` failure attaches to: the
   * automatic first Repository scan uses `repository`, an explicit rescan of
   * a published Source uses `published-source:<sourceId>`, and an
   * unpublished Global tool uses `global:<tool>` (data-model.md
   * § Diagnostic). The trigger-owning caller knows which lifecycle applies;
   * this module never guesses it.
   */
  readonly rootFailureOwner: LifecycleOwnerKey;
  /** The traversal module's typed result for this attempt. */
  readonly result: TraversalScanResult;
  /**
   * Recognition outcomes per readable file, keyed by its NFC public path.
   * Absent entries mean nothing recognized the file (`not-applicable`).
   * The vendor recognizer phases populate this; the matrix arm for a
   * `failed` recognition exists independently of them (FR-028).
   */
  readonly recognitions?: ReadonlyMap<string, readonly CandidateRecognitionOutcome[]>;
}

// Projects the closed per-file parse rollup from recognition states
// (data-model.md § CustomizationFile): `not-attempted` records never change
// the last three projections.
function projectParseSummary(
  recognitions: readonly CandidateRecognitionOutcome[],
): 'not-applicable' | 'all-parsed' | 'mixed' | 'all-failed' {
  const parsed = recognitions.some((recognition) => recognition.parseStatus === 'parsed');
  const failed = recognitions.some((recognition) => recognition.parseStatus === 'failed');
  if (parsed && failed) {
    return 'mixed';
  }
  if (failed) {
    return 'all-failed';
  }
  if (parsed) {
    return 'all-parsed';
  }
  return 'not-applicable';
}

/**
 * Assembles the closed publication matrix from one traversal result
 * (FR-002/FR-024/FR-025/FR-028). Every mapping is per-file and total:
 *  - a readable file publishes its complete decoded text (a replacement
 *    decode is complete, not partial);
 *  - a NUL-containing file publishes a diagnostic-only `binary` item with
 *    its coherent `sourceId`/`fileId`/`sourceRelativePath` tuple;
 *  - an unreadable or disappeared file publishes a diagnostic-only
 *    `unknown` item the same way;
 *  - a `failed` recognition on a readable file publishes its
 *    `recognition-parse-failed` diagnostic on that file while the complete
 *    source stays displayed and comparison-eligible, and the closed
 *    parse-summary projection reflects the recognition states;
 *  - each rejected normalization-collision group publishes one pathless
 *    session-scoped Diagnostic, because no unambiguous public path exists
 *    (spec.md Clarifications § Session 2026-07-20) — this is not a
 *    file-confined outcome, so it does not make the generation partial.
 * Diagnostic construction happens here so a caller cannot fabricate a
 * Source or path the traversal never admitted.
 */
export function assembleScanPublication(input: ScanPublicationInput): ScanPublication {
  if (input.result.kind === 'root-unreadable') {
    // Source-scoped with sourceId only: the failed attempt publishes no
    // partial inventory (FR-002). The lifecycle owner is the published
    // Source that owns this attempt.
    return {
      kind: 'source-failed',
      diagnostic: serializeDiagnostic(
        createDiagnostic({
          code: 'root-unreadable',
          lifecycleOwnerKey: input.rootFailureOwner,
          sourceId: input.sourceId,
        }),
      ),
    };
  }

  const files: CustomizationFileDto[] = [];
  const diagnostics: DiagnosticRecord[] = [];
  let hasFileConfinedOutcome = false;

  for (const candidate of input.result.files) {
    const fileId = createOpaqueId();
    switch (candidate.outcome.kind) {
      case 'readable': {
        const recognitions = input.recognitions?.get(candidate.publicPath) ?? [];
        const fileDiagnosticIds: string[] = [];
        for (const recognition of recognitions) {
          if (recognition.parseStatus !== 'failed') {
            continue;
          }
          // A failed recognition keeps the complete readable source
          // displayed and comparison-eligible; only that recognition's
          // derived metadata/relationships are omitted, and the file-scoped
          // diagnostic makes the generation partial (FR-028).
          hasFileConfinedOutcome = true;
          const diagnostic = createDiagnostic({
            code: 'recognition-parse-failed',
            lifecycleOwnerKey: null,
            sourceId: input.sourceId,
            fileId,
            sourceRelativePath: candidate.publicPath,
          });
          diagnostics.push(diagnostic);
          fileDiagnosticIds.push(diagnostic.diagnosticId);
        }
        files.push({
          fileId,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: candidate.outcome.encoding,
          hadLeadingBom: candidate.outcome.hadLeadingBom,
          sourceText: candidate.outcome.sourceText,
          sizeBytes: candidate.outcome.sizeBytes,
          parseSummary: projectParseSummary(recognitions),
          recognitionIds: recognitions.map((recognition) => recognition.recognitionId),
          relationshipIds: [],
          diagnosticIds: fileDiagnosticIds,
        });
        break;
      }
      case 'binary': {
        hasFileConfinedOutcome = true;
        const diagnostic = createDiagnostic({
          code: 'file-content-binary',
          lifecycleOwnerKey: null,
          sourceId: input.sourceId,
          fileId,
          sourceRelativePath: candidate.publicPath,
        });
        diagnostics.push(diagnostic);
        files.push({
          fileId,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: 'binary',
          sizeBytes: candidate.outcome.sizeBytes,
          diagnosticIds: [diagnostic.diagnosticId],
        });
        break;
      }
      case 'unreadable': {
        hasFileConfinedOutcome = true;
        const diagnostic = createDiagnostic({
          code: 'file-unreadable',
          lifecycleOwnerKey: null,
          sourceId: input.sourceId,
          fileId,
          sourceRelativePath: candidate.publicPath,
        });
        diagnostics.push(diagnostic);
        files.push({
          fileId,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: 'unknown',
          diagnosticIds: [diagnostic.diagnosticId],
        });
        break;
      }
    }
  }

  // One pathless session-scoped record per rejected group; the ambiguous
  // NFC path and raw members never serialize.
  for (let group = 0; group < input.result.collisions.length; group += 1) {
    diagnostics.push(
      createDiagnostic({ code: 'path-normalization-collision', lifecycleOwnerKey: null }),
    );
  }

  return {
    kind: 'publishable',
    outcome: hasFileConfinedOutcome ? 'partial' : 'complete',
    files,
    // The attempt publishes its records in the contracted deterministic
    // order — owner rank, scope, path, code (data-model.md § Diagnostic).
    diagnostics: sortDiagnostics(diagnostics).map(serializeDiagnostic),
  };
}
