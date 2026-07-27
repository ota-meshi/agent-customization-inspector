// Repository scan orchestration and the closed file-confined publication
// matrix for one Source scan attempt (T067; spec.md § Closed Scan Publication
// Outcomes, FR-002/FR-028/FR-030). This module submits the shipped compiled
// allowlist to the traversal module, consumes its typed per-file results,
// resolves each candidate's admitting rules from the selector origins the
// traversal reported, hands them to the owning vendor recognizer, and turns
// the whole thing into the exact publication input of a generation commit.
//
// It performs no filesystem I/O itself: directory enumeration and file
// reading stay in `traversal.ts` (FR-019, QR-003), and this module never
// re-matches a public path against a selector — the admissions come from the
// walk that actually admitted the file.
//
// The publication matrix is closed and total: a file-confined outcome stays
// confined to its file as a diagnostic-only item and makes an otherwise
// publishable generation `partial`; an unreadable root fails the Source
// attempt with the source-scoped Diagnostic and publishes no partial
// inventory; and a failure that is not confined to one file is never
// converted into a Diagnostic — it propagates ordinarily from the traversal
// call, aborts the attempt without a commit, and is reported as the failed
// request's real error (FR-030 retains the last committed snapshot).
import { createOpaqueId } from '../../shared/entities';
import {
  createDiagnostic,
  serializeDiagnostic,
  sortDiagnostics,
  type DiagnosticRecord,
  type LifecycleOwnerKey,
} from '../../shared/diagnostics';
import type {
  CustomizationFileDto,
  ParseSummary,
  SerializedDiagnostic,
  ToolRecognitionDto,
} from '../../shared/api-types';
import type { GenerationOutcome } from '../session/scan-generation';
import { CODEX_REPOSITORY_RULES } from './rules/codex';
import { resolveAdmittingRules, type CompiledInspectionRule } from './rules/registry';
import { recognizeCodexCandidate, type RecognitionInput } from './recognizers/codex';
import { join } from 'node:path';
import { runTraversalScan, type TraversalScanResult } from './traversal';

/**
 * The shipped Repository rule catalog a Repository scan executes (FR-003),
 * in fixed vendor order. Each inventory phase contributes its vendor module
 * here; while only Codex skills ship, a repository with no `SKILL.md`
 * legitimately publishes an empty inventory rather than an error.
 */
export const REPOSITORY_INSPECTION_RULES: readonly CompiledInspectionRule[] = [
  ...CODEX_REPOSITORY_RULES,
];

/**
 * The assembled publication of one completed traversal
 * (spec.md § Closed Scan Publication Outcomes):
 *  - 'publishable'    traversal completed; the commit input carries every
 *                     file (complete or diagnostic-only) plus the attempt's
 *                     recognitions and diagnostics, with `outcome` `partial`
 *                     exactly when a file-confined outcome exists (FR-028)
 *  - 'source-failed'  the root was missing or unreadable: the attempt fails
 *                     with the source-scoped `root-unreadable` Diagnostic
 *                     and no generation (FR-002)
 */
export type ScanPublication =
  /** A complete traversal that may commit one atomic generation. */
  | {
      /** Traversal completed and one atomic generation may commit. */
      readonly kind: 'publishable';
      /** `partial` exactly when any file-confined outcome exists (FR-028). */
      readonly outcome: GenerationOutcome;
      /** Every published file, complete and diagnostic-only alike. */
      readonly files: readonly CustomizationFileDto[];
      /** Every recognition attached to a published readable file. */
      readonly recognitions: readonly ToolRecognitionDto[];
      /** The attempt's serialized diagnostics. */
      readonly diagnostics: readonly SerializedDiagnostic[];
      /**
       * How many directory entries the walk looked at. The committed progress
       * reports it, so a finished scan states what it did rather than the zero
       * its counters were admitted with (contracts/http-api.md § get-session
       * `progress`).
       */
      readonly visitedEntries: number;
      /**
       * Allowlisted candidate files the traversal discovered
       * (data-model.md § ScanProgress). Carried through rather than derived
       * from `files`: a normalization-collision group is discovered and then
       * rejected, so the published count is the smaller number.
       */
      readonly candidateFiles: number;
      /** Bytes the attempt accepted, as counted while reading. */
      readonly readBytes: number;
    }
  /** An unreadable Source root that fails without a generation commit. */
  | {
      /** The Source attempt failed; nothing commits (FR-002). */
      readonly kind: 'source-failed';
      /** The source-scoped `root-unreadable` lifecycle Diagnostic. */
      readonly diagnostic: SerializedDiagnostic;
    };

/** Input of {@link assembleScanPublication}: one Source's completed traversal. */
export interface ScanPublicationInput {
  /** The scanned Source every published record belongs to. */
  readonly sourceId: string;
  /**
   * The retained raw selected root the traversal ran from. A candidate's raw
   * segments are relative to it, so it is what turns them back into the
   * filesystem operand a recognizer is given; see
   * {@link RecognitionInput.absolutePath}.
   */
  readonly root: string;
  /**
   * The lifecycle owner a `root-unreadable` failure attaches to: the
   * automatic first Repository scan uses `repository`, an explicit rescan of
   * a published Source uses `published-source:<sourceId>`, and an
   * unpublished Global tool uses `global:<tool>` (data-model.md
   * § Diagnostic). The trigger-owning caller knows which lifecycle applies;
   * this module never guesses it.
   */
  readonly rootFailureOwner: LifecycleOwnerKey;
  /**
   * The exact rule list whose plans produced `result`. Candidate admissions
   * are plan indexes into this list, so passing a different list would
   * misattribute provenance.
   */
  readonly rules: readonly CompiledInspectionRule[];
  /** The traversal module's typed result for this attempt. */
  readonly result: TraversalScanResult;
  /**
   * How one readable candidate's admissions become recognitions. Defaults to
   * {@link recognizeCandidate}, the shipped vendor dispatch. It is a
   * parameter for the same reason `rules` is: the publication matrix owns the
   * closed per-file outcome table and must stay independent of which vendors
   * happen to ship, so the recognizer set is data it is given rather than a
   * dependency it hard-codes.
   */
  readonly recognize?: (input: RecognitionInput) => Promise<ToolRecognitionDto[]>;
}

// Projects the closed per-file parse rollup from recognition states
// (data-model.md § CustomizationFile): `not-attempted` records never change
// the last three projections.
function projectParseSummary(recognitions: readonly ToolRecognitionDto[]): ParseSummary {
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

// Dispatches one readable candidate's admissions to the owning vendor
// recognizers. Only tools with a shipped recognizer contribute; an admission
// whose tool has no recognizer yet simply produces no recognition, which is
// what "the rule is not shipped for this milestone" must look like — never a
// fabricated recognition of an unknown kind.
function recognizeCandidate(input: RecognitionInput): Promise<ToolRecognitionDto[]> {
  return recognizeCodexCandidate(input);
}

/**
 * Assembles the closed publication matrix from one traversal result
 * (FR-002/FR-024/FR-025/FR-028). Every mapping is per-file and total:
 *  - a readable file publishes its complete decoded text (a replacement
 *    decode is complete, not partial) plus the recognitions its admissions
 *    produced;
 *  - a NUL-containing file publishes a diagnostic-only `binary` item with
 *    its coherent `sourceId`/`fileId`/`sourceRelativePath` tuple and is never
 *    recognized, because recognition would need content it has none of;
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
 *
 * The assembly awaits the recognizers it is given rather than performing any
 * filesystem operation itself: what a recognition needs from disk — the census
 * a rule declares — is a per-kind detail that the recognizer owns, so this
 * module stays the closed per-file outcome table and nothing more.
 */
export async function assembleScanPublication(
  input: ScanPublicationInput,
): Promise<ScanPublication> {
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
  const recognitions: ToolRecognitionDto[] = [];
  const diagnostics: DiagnosticRecord[] = [];
  let hasFileConfinedOutcome = false;

  for (const candidate of input.result.files) {
    const fileId = createOpaqueId();
    switch (candidate.outcome.kind) {
      case 'readable': {
        const admissions = resolveAdmittingRules(input.rules, candidate.admissions).map(
          (compiled, index) => ({ compiled, origin: candidate.admissions[index]! }),
        );
        const fileRecognitions = await (input.recognize ?? recognizeCandidate)({
          fileId,
          matchedPath: candidate.publicPath,
          absolutePath: join(input.root, ...candidate.rawSegments),
          sourceRoot: input.root,
          admissions,
          sourceText: candidate.outcome.sourceText,
        });
        const fileDiagnosticIds: string[] = [];
        // A failed recognition keeps the complete readable source displayed and
        // comparison-eligible; only that recognition's derived
        // metadata/relationships are omitted, and the diagnostic makes the
        // generation partial (FR-028).
        //
        // The record is one diagnostic that both its owners reference: the
        // recognition, because the failure is recognition-scoped and a row that
        // lists recognitions has no other way to reach it, and the file,
        // because the outcome is file-confined and the file is what a reader
        // asks about first. A recognizer never sees the diagnostic ID it will
        // be given, so the ID is attached here rather than inside it.
        const published = fileRecognitions.map((recognition) => {
          if (recognition.parseStatus !== 'failed') {
            return recognition;
          }
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
          return {
            ...recognition,
            diagnosticIds: [...recognition.diagnosticIds, diagnostic.diagnosticId],
          };
        });
        recognitions.push(...published);
        files.push({
          fileId,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: candidate.outcome.encoding,
          hadLeadingBom: candidate.outcome.hadLeadingBom,
          sourceText: candidate.outcome.sourceText,
          sizeBytes: candidate.outcome.sizeBytes,
          parseSummary: projectParseSummary(published),
          recognitionIds: published.map((recognition) => recognition.recognitionId),
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
    recognitions,
    visitedEntries: input.result.visitedEntries,
    candidateFiles: input.result.candidateFiles,
    readBytes: input.result.readBytes,
    // The attempt publishes its records in the contracted deterministic
    // order — owner rank, scope, path, code (data-model.md § Diagnostic).
    diagnostics: sortDiagnostics(diagnostics).map(serializeDiagnostic),
  };
}

/** Input of {@link runSourceScan}: one Source attempt over the shipped catalog. */
export interface SourceScanInput {
  /** The scanned Source every published record belongs to. */
  readonly sourceId: string;
  /**
   * The retained raw selected root, never the escaped display boundary
   * (FR-001/FR-002). The boundary grants no read authority and cannot be
   * decoded back into a path.
   */
  readonly root: string;
  /** The lifecycle owner of a `root-unreadable` failure; see {@link ScanPublicationInput}. */
  readonly rootFailureOwner: LifecycleOwnerKey;
  /** The compiled rule catalog to execute; defaults to the shipped Repository set. */
  readonly rules?: readonly CompiledInspectionRule[];
  /** The vendor recognizer dispatch; see {@link ScanPublicationInput.recognize}. */
  readonly recognize?: (input: RecognitionInput) => Promise<ToolRecognitionDto[]>;
  /**
   * Called as the attempt moves through its phases, so a refresh mid-scan shows
   * where it is. The attempt ignores what it returns.
   */
  readonly onProgress?: (update: {
    readonly phase: 'enumerating' | 'reading' | 'recognizing';
    readonly visitedEntries: number;
    readonly candidateFiles: number;
    readonly readBytes: number;
    /** Attempt-local diagnostics accumulated so far (data-model.md § ScanProgress). */
    readonly diagnosticCount: number;
  }) => void;
}

/**
 * Runs one Source scan attempt end to end: traverse the compiled allowlist
 * from the retained raw root, then assemble the closed publication matrix.
 * A failure that is not confined to one file propagates unchanged to the
 * trigger-owning boundary — the accepted-job catch for a session-API rescan
 * (FR-030) or the process top level for the ownerless startup scan — because
 * converting it here would fabricate a partial result out of an attempt that
 * never completed.
 */
export async function runSourceScan(input: SourceScanInput): Promise<ScanPublication> {
  const rules = input.rules ?? REPOSITORY_INSPECTION_RULES;
  const result = await runTraversalScan({
    root: input.root,
    plans: rules.map((rule) => rule.plan),
    ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
  });
  if (result.kind === 'scanned') {
    // Reading is done; what follows is recognizing what was read, which is the
    // phase a mid-scan refresh should now see.
    input.onProgress?.({
      phase: 'recognizing',
      visitedEntries: result.visitedEntries,
      candidateFiles: result.candidateFiles,
      readBytes: result.readBytes,
      // What the attempt has accumulated at this point: one per rejected
      // normalization-collision group. The per-file outcomes assembly turns
      // into diagnostics are not counted yet, because assembly has not run —
      // reporting the terminal total here would state a number the attempt
      // has not reached (data-model.md § ScanProgress).
      diagnosticCount: result.collisions.length,
    });
  }
  return assembleScanPublication({
    sourceId: input.sourceId,
    root: input.root,
    rootFailureOwner: input.rootFailureOwner,
    rules,
    result,
    ...(input.recognize === undefined ? {} : { recognize: input.recognize }),
  });
}
