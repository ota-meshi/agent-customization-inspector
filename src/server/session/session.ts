// Inspection session state and the serialized scan coordinator. The session
// publishes zero-I/O bootstrap Repository generation 0 synchronously with
// exactly one enabled idle Repository Source; the Repository and Global
// generation sequences are independent because their lifecycles are
// (Repository always exists, Global exists only between enable and
// disable). The coordinator serializes scans, keeps one request ID across a
// scan lifecycle, commits atomic N+1 replacements per sequence, and retains
// explicit-rescan stale state.
import { createOpaqueId, createSourceBoundaryDto } from '../../shared/entities';
import {
  createBootstrapGeneration,
  prepareNextRepositoryGeneration,
  type GenerationOutcome,
  type GlobalScanGeneration,
  type RepositoryScanGeneration,
} from './scan-generation';
import { clearStaleFailures, deriveSnapshotState, upsertStaleFailure } from './stale-failures';
import type { SourceBoundaryDto } from '../../shared/entities';
import type {
  CustomizationFileDto,
  CustomizationFileSummaryDto,
  ScanProgressDto,
  SessionSnapshot,
  SourceStatus,
  StaleSourceFailure,
} from '../../shared/api-types';
import type { SerializedDiagnostic } from '../../shared/diagnostics';

/** The validated CLI selection handed to session bootstrap (FR-001). */
export interface SessionBootstrapInput {
  /** The one captured `process.cwd()` (FR-001). */
  readonly invocationCwd: string;
  /** The validated `--cwd` value; null when the option was omitted. */
  readonly cwdOptionValue: string | null;
  /** The resolved selected Repository root (FR-001). */
  readonly selectedRepositoryRoot: string;
}

/**
 * Session-owned operational overlay (data-model.md § Source): status,
 * request ID, and progress may change on a fatal attempt without mutating
 * the committed generation, so they live beside — not inside — the
 * committed graph.
 */
interface MutableSourceState {
  /** The Source this operational overlay belongs to. */
  readonly sourceId: string;
  /** Operational overlay status; see {@link SourceStatus}. */
  status: SourceStatus;
  /** The latest admitted scan request for this Source; null before any. */
  scanRequestId: string | null;
  /** Live scan progress; null while no scan is running. */
  progress: ScanProgressDto | null;
  /** Diagnostic IDs currently attached to this Source. */
  diagnosticIds: readonly string[];
}

/**
 * The in-memory session: the public snapshot projection plus the internal
 * state that only the coordinator mutates.
 */
export interface InspectionSessionState {
  /** Rebuilds the public projection from internal state. */
  snapshot(): SessionSnapshot;
  /** Internal accessors used only by the coordinator; never serialized. */
  readonly internal: {
    /** Opaque identity of this process's one session. */
    readonly sessionId: string;
    /** UTC bootstrap timestamp; also generation 0's start and finish. */
    readonly createdAt: string;
    /** The bootstrap Repository Source's stable ID. */
    readonly repositorySourceId: string;
    /** The one captured `process.cwd()` (FR-001); identity, not read authority. */
    readonly invocationCwd: string;
    /** The sole validated `--cwd` value, null when omitted; retained for lifecycle correlation (data-model.md § InspectionSession). */
    readonly cwdOptionValue: string | null;
    /** The selected Repository root later scans traverse (FR-001); never serialized. */
    readonly selectedRepositoryRoot: string;
    /** Last committed Repository generation (never null after bootstrap). */
    committedRepositoryGeneration: RepositoryScanGeneration;
    /** Last committed Global generation; null while disabled (FR-042). */
    committedGlobalGeneration: GlobalScanGeneration | null;
    /** Stale overlays from failed explicit rescans, sorted by sourceId. */
    staleFailures: StaleSourceFailure[];
    /**
     * Session-owned lifecycle Diagnostics (at most one per lifecycle owner,
     * data-model.md § Diagnostic), keyed by diagnosticId; every retained
     * record is referenced by exactly one public owner field.
     */
    readonly sessionDiagnostics: Map<string, SerializedDiagnostic>;
    /**
     * The current Repository `root-unreadable` lifecycle Diagnostic from the
     * automatic first scan (FR-002); cleared by the affected Source's
     * successful commit or replaced by an explicit-rescan stale owner.
     */
    repositoryFailureDiagnosticId: string | null;
    /** Per-Source mutable operational overlays. */
    readonly sourceStates: Map<string, MutableSourceState>;
    /** The Repository Source's non-authorizing boundary presentation. */
    readonly boundary: SourceBoundaryDto;
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Projects one committed file into its content-free snapshot summary row
 * (contracts/http-api.md § get-session `files[]`). `sourceText` is
 * deliberately never copied: complete authored content is served only by
 * the acknowledgement-gated detail routes (FR-027), so the session
 * snapshot cannot leak it to a client that has not acknowledged the
 * sensitive-value warning.
 */
function summarizeFile(file: CustomizationFileDto): CustomizationFileSummaryDto {
  const base = {
    fileId: file.fileId,
    sourceId: file.sourceId,
    sourceRelativePath: file.sourceRelativePath,
    diagnosticIds: file.diagnosticIds,
  };
  switch (file.encoding) {
    case 'utf-8':
    case 'utf-8-replaced':
      return {
        ...base,
        encoding: file.encoding,
        hadLeadingBom: file.hadLeadingBom,
        sizeBytes: file.sizeBytes,
        parseSummary: file.parseSummary,
        // Scaffold until the vendor recognizer phases store ToolRecognition
        // entities: no production recognizer exists yet, so every committed
        // file has zero summaries (see api-types.ts § CustomizationFileSummaryDto).
        recognitions: [],
      };
    case 'binary':
      return { ...base, encoding: file.encoding, sizeBytes: file.sizeBytes };
    case 'unknown':
      return { ...base, encoding: file.encoding };
  }
}

/**
 * Creates the bootstrap session synchronously with zero filesystem I/O.
 * The selection (invocation cwd, `--cwd` value, selected root) is retained
 * internally for later scans and lifecycle correlation; publicly it
 * surfaces only as the non-authorizing boundary presentation. There is no
 * separate admission layer: the first scan simply reads the retained
 * selected root, and a missing or unreadable root fails that scan with the
 * source-scoped `root-unreadable` Diagnostic (FR-002).
 */
export function createInspectionSession(input: SessionBootstrapInput): InspectionSessionState {
  const createdAt = nowIso();
  const sessionId = createOpaqueId();
  const repositorySourceId = createOpaqueId();
  const boundary = createSourceBoundaryDto(
    input.selectedRepositoryRoot,
    input.cwdOptionValue === null ? 'process-cwd' : 'cwd-option',
  );
  const internal: InspectionSessionState['internal'] = {
    sessionId,
    createdAt,
    repositorySourceId,
    invocationCwd: input.invocationCwd,
    cwdOptionValue: input.cwdOptionValue,
    selectedRepositoryRoot: input.selectedRepositoryRoot,
    committedRepositoryGeneration: createBootstrapGeneration(createdAt),
    committedGlobalGeneration: null,
    staleFailures: [],
    sessionDiagnostics: new Map(),
    repositoryFailureDiagnosticId: null,
    sourceStates: new Map([
      [
        repositorySourceId,
        {
          sourceId: repositorySourceId,
          status: 'idle' as SourceStatus,
          scanRequestId: null,
          progress: null,
          diagnosticIds: [] as readonly string[],
        },
      ],
    ]),
    boundary,
  };
  return {
    internal,
    // The snapshot is rebuilt from internal state on every call, and
    // internal authority fields (the selected root and coordinator state)
    // are simply absent from the projection rather than filtered afterwards.
    // Immutability is owned by the readonly types, not re-enforced at
    // runtime.
    snapshot(): SessionSnapshot {
      const repository = internal.sourceStates.get(repositorySourceId);
      if (repository === undefined) {
        throw new Error('the repository source state is missing');
      }
      return {
        sessionId,
        createdAt,
        sources: [
          {
            sourceId: repositorySourceId,
            kind: 'repository' as const,
            tool: null,
            enabled: true,
            status: repository.status,
            boundary,
            generation: internal.committedRepositoryGeneration.generation,
            scanRequestId: repository.scanRequestId,
            progress: repository.progress,
            conditionFacts: [],
            diagnosticIds: [...repository.diagnosticIds],
          },
        ],
        files: [
          ...internal.committedRepositoryGeneration.files,
          ...(internal.committedGlobalGeneration?.files ?? []),
        ].map(summarizeFile),
        // Semantic emission order (data-model.md § Diagnostic): session-owned
        // lifecycle records (repository, Global tools, published Sources)
        // precede the generations' candidate-owned records.
        diagnostics: [
          ...internal.sessionDiagnostics.values(),
          ...internal.committedRepositoryGeneration.diagnostics,
          ...(internal.committedGlobalGeneration?.diagnostics ?? []),
        ],
        repositoryGeneration: internal.committedRepositoryGeneration.generation,
        globalGeneration: internal.committedGlobalGeneration?.generation ?? null,
        snapshotState: deriveSnapshotState(internal.staleFailures),
        staleFailures: [...internal.staleFailures],
        globalControl: null,
        globalEnableInProgress: null,
        globalDisableInProgress: null,
        globalContentEpoch: 0,
        sessionDiagnosticIds: [...internal.sessionDiagnostics.keys()],
        repositoryFailureDiagnosticId: internal.repositoryFailureDiagnosticId,
      };
    },
  };
}

/**
 * Who initiated a scan attempt: the automatic startup scan owns no session
 * API request, while an explicit command arrives as a session-API request
 * with its operation ID (FR-030 request correlation).
 */
export type TriggerOwner =
  /** The ownerless automatic startup scan, which has no operation ID. */
  | { readonly kind: 'startup'; readonly operationId: null }
  /** An explicit session-API request with its operation ID. */
  | { readonly kind: 'request'; readonly operationId: string };

/**
 * How a terminal scan failure is represented (data-model.md
 * § StaleSourceFailure): a deterministic returned fatal outcome carries its
 * closed lifecycle Diagnostic, while a thrown/rejected accepted job carries
 * the failed request's error message.
 */
export type ScanFailure =
  /** A thrown or rejected accepted job, preserving its real error message. */
  | { readonly kind: 'error'; readonly message: string }
  /** A deterministic returned fatal outcome with its lifecycle Diagnostic. */
  | { readonly kind: 'diagnostic'; readonly diagnostic: SerializedDiagnostic };

/**
 * Coordinator admission outcome: 'admitted' issues the request-correlated
 * scanRequestId; 'conflict' is the fixed scan-in-progress rejection while a
 * scan for the same Source is already active (FR-030).
 */
export type AdmitScanResult =
  /** The scan was admitted and received its request-correlated ID. */
  | { readonly kind: 'admitted'; readonly scanRequestId: string }
  /** The Source already has a running or queued scan (FR-030). */
  | { readonly kind: 'conflict' };

/** Coordinator-internal state of one admitted scan attempt. */
interface AttemptState {
  /** The request ID issued at admission and kept across the scan lifecycle. */
  readonly scanRequestId: string;
  /** The one Source this attempt scans. */
  readonly sourceId: string;
  /** Who initiated the attempt; see {@link TriggerOwner}. */
  readonly triggerOwner: TriggerOwner;
  /** True for a user-requested rescan; its failure leaves a stale overlay (FR-030). */
  readonly explicit: boolean;
  /** Whether the attempt may still publish; a revoked attempt commits nothing. */
  publicationAuthority:
    /** The admitted attempt may publish its terminal result. */
    | 'active'
    /** A disable barrier revoked publication authority. */
    | 'revoked';
  /** True once the attempt terminally completed or failed; settled attempts are inert. */
  settled: boolean;
  /**
   * The Source overlay exactly as admission found it. A revoked attempt's
   * discarded late result restores it wholesale, so the committed status
   * with its final complete progress, or a retained failure presentation,
   * survives the discard and the revoked request never surfaces as a
   * settled outcome (spec.md § publication matrix "No later success
   * status"; data-model.md § ScanProgress null/retention rules).
   */
  readonly priorOverlay: {
    readonly status: SourceStatus;
    readonly scanRequestId: string | null;
    readonly progress: ScanProgressDto | null;
  };
}

/**
 * Serializes scan admission and commit for one session. At most one scan per
 * source is running or queued; a commit atomically replaces its own
 * sequence's committed generation with exactly N+1 and clears stale state
 * only for the sources it refreshed. Only the Repository path exists yet;
 * Global commits arrive with the Global tasks.
 */
export class SessionCoordinator {
  /** The one session whose internal state this coordinator serializes. */
  private readonly session: InspectionSessionState;

  /**
   * Every admitted attempt by its scanRequestId, including settled ones: a
   * settled attempt keeps its entry so a late result is recognized and
   * discarded instead of committed (FR-029).
   */
  private readonly attempts = new Map<string, AttemptState>();

  /**
   * Sources that have committed at least once — the discriminator that
   * makes a later request-owned scan an "explicit rescan" whose failure
   * creates the stale overlay (FR-030).
   */
  private hasCommittedBefore = new Set<string>();

  /** Binds the coordinator to the one session whose state it serializes. */
  public constructor(session: InspectionSessionState) {
    this.session = session;
  }

  /**
   * Admits one scan command for a Source and issues its opaque
   * `scanRequestId` (FR-030). While a scan for the same Source is running
   * or queued, returns the fixed `conflict` instead of stacking attempts.
   */
  public admitScan(sourceId: string, triggerOwner: TriggerOwner): AdmitScanResult {
    const sourceState = this.session.internal.sourceStates.get(sourceId);
    if (sourceState === undefined) {
      throw new TypeError('unknown sourceId');
    }
    // At most one scan command per source is running or queued; a duplicate
    // returns the documented conflict instead of stacking attempts.
    for (const attempt of this.attempts.values()) {
      if (attempt.sourceId === sourceId && !attempt.settled) {
        return { kind: 'conflict' };
      }
    }
    const scanRequestId = createOpaqueId();
    // Captured before the overlay is overwritten below; a revoked attempt's
    // discarded late result restores exactly this state.
    const priorOverlay = {
      status: sourceState.status,
      scanRequestId: sourceState.scanRequestId,
      progress: sourceState.progress,
    };
    // Only a session-API-triggered rescan of a Source with a committed
    // snapshot counts as "explicit": automatic first scans and initial
    // commits never create stale-failure overlays (data-model.md
    // § StaleSourceFailure). The Repository Source always has one — the
    // bootstrap committed generation 0 — so its very first user-requested
    // rescan after a failed automatic scan already leaves the stale overlay
    // on terminal failure instead of silently discarding it.
    const explicit =
      triggerOwner.kind === 'request' &&
      (sourceId === this.session.internal.repositorySourceId ||
        this.hasCommittedBefore.has(sourceId));
    this.attempts.set(scanRequestId, {
      scanRequestId,
      sourceId,
      triggerOwner,
      explicit,
      publicationAuthority: 'active',
      settled: false,
      priorOverlay,
    });
    sourceState.status = 'scanning';
    sourceState.scanRequestId = scanRequestId;
    sourceState.progress = {
      scanRequestId,
      phase: 'enumerating' as const,
      queuedAt: null,
      startedAt: new Date().toISOString(),
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      diagnosticCount: 0,
    };
    return { kind: 'admitted', scanRequestId };
  }

  /**
   * Revokes an attempt's right to commit (disable, shutdown, supersession):
   * a result that completes afterwards is discarded instead of committed
   * (FR-029 late-result discard).
   */
  public revokePublicationAuthority(scanRequestId: string): void {
    const attempt = this.attempts.get(scanRequestId);
    if (attempt !== undefined) {
      attempt.publicationAuthority = 'revoked';
    }
  }

  /**
   * Commits an attempt's result as its sequence's exact N+1 generation and
   * clears stale state only for the Sources it refreshed (FR-030). A
   * revoked or already settled attempt commits nothing.
   */
  public async completeScan(
    scanRequestId: string,
    result: {
      readonly files: readonly CustomizationFileDto[];
      readonly diagnostics: readonly SerializedDiagnostic[];
      /**
       * The attempt's closed publication outcome (FR-028): 'partial' exactly
       * when a file-confined outcome exists. The producer decides it; the
       * coordinator only records it, so a partial result can never be
       * silently relabeled complete.
       */
      readonly outcome: GenerationOutcome;
    },
  ): Promise<void> {
    const attempt = this.attempts.get(scanRequestId);
    if (attempt === undefined || attempt.settled) {
      return;
    }
    const sourceState = this.session.internal.sourceStates.get(attempt.sourceId);
    if (sourceState === undefined) {
      return;
    }
    if (attempt.publicationAuthority === 'revoked') {
      // Cleanup-only: the late result is discarded, public generation state
      // is untouched, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}).
      attempt.settled = true;
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      return;
    }
    // The attempt is marked settled only after the fallible commit below
    // succeeds. Generation preparation regenerates opaque IDs and can throw;
    // if it did after an early `settled = true`, the rejecting promise would
    // reach the caller's catch but `failScan` would find the attempt already
    // settled and silently drop it, leaving the Source stuck 'scanning' with
    // no stale/failed record. Leaving it unsettled lets that `failScan`
    // record the terminal failure (FR-030).
    const now = new Date().toISOString();
    const next = prepareNextRepositoryGeneration(this.session.internal.committedRepositoryGeneration, {
      scannedSourceIds: [attempt.sourceId],
      scanRequestId,
      startedAt: sourceState.progress?.startedAt ?? now,
      finishedAt: now,
      outcome: result.outcome,
      files: result.files,
      diagnostics: result.diagnostics,
    });
    // Atomic replacement: commit the generation, then update overlays. The
    // stale entry — and any lifecycle Diagnostic it references — is cleared
    // only for the Source this commit refreshed; failures for other Sources
    // are carried forward untouched (data-model.md § StaleSourceFailure).
    this.session.internal.committedRepositoryGeneration = next;
    this.dropLifecycleDiagnosticsFor(attempt.sourceId);
    this.session.internal.staleFailures = clearStaleFailures(
      this.session.internal.staleFailures,
      [attempt.sourceId],
    );
    sourceState.status = result.outcome === 'partial' ? 'partial' : 'ready';
    sourceState.progress = {
      ...(sourceState.progress ?? {
        scanRequestId,
        queuedAt: null,
        startedAt: now,
        visitedEntries: 0,
        candidateFiles: 0,
        readBytes: 0,
        diagnosticCount: 0,
      }),
      phase: 'complete' as const,
    };
    this.hasCommittedBefore.add(attempt.sourceId);
    // Terminal: the commit succeeded, so the attempt is now settled and a
    // late duplicate result for the same request is ignored (FR-029).
    attempt.settled = true;
  }

  /**
   * Records the terminal failure of an accepted scan (FR-030,
   * data-model.md § Diagnostic lifecycle owners). An explicit rescan — a
   * session-API request for an already committed Source — keeps the last
   * committed snapshot and marks it stale with the failure representation:
   * the failed request's error message, or the deterministic outcome's
   * lifecycle Diagnostic (retained in the session and referenced by the
   * stale entry). Any other failed scan (the automatic initial scan, or a
   * first scan of a never-committed Source) has no snapshot to mark stale:
   * the Source is marked failed, and a deterministic Repository outcome
   * retains its Diagnostic through `repositoryFailureDiagnosticId`. The
   * session keeps at most one current failure record per lifecycle owner.
   * A revoked attempt's failure is discarded like a revoked success
   * (FR-029): it publishes neither 'failed' nor a stale overlay.
   */
  public failScan(scanRequestId: string, failure: ScanFailure): void {
    const attempt = this.attempts.get(scanRequestId);
    if (attempt === undefined || attempt.settled) {
      return;
    }
    attempt.settled = true;
    const sourceState = this.session.internal.sourceStates.get(attempt.sourceId);
    if (sourceState === undefined) {
      return;
    }
    if (attempt.publicationAuthority === 'revoked') {
      // Late-result discard: a failure that lands after revocation
      // publishes nothing, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}).
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      return;
    }
    // At most one current failure record per lifecycle owner: replacing a
    // failure drops the record the previous one referenced.
    this.dropLifecycleDiagnosticsFor(attempt.sourceId);
    if (failure.kind === 'diagnostic') {
      this.session.internal.sessionDiagnostics.set(
        failure.diagnostic.diagnosticId,
        failure.diagnostic,
      );
    }
    // Only an explicit rescan creates the stale overlay — the one case where
    // a previously committed snapshot exists and stays visible
    // (data-model.md § StaleSourceFailure). The coordinator enforces this
    // itself instead of trusting callers to pick the right method.
    if (attempt.explicit) {
      this.session.internal.staleFailures = upsertStaleFailure(
        this.session.internal.staleFailures,
        {
          sourceId: attempt.sourceId,
          failureRef:
            failure.kind === 'diagnostic'
              ? { kind: 'diagnostic', diagnosticId: failure.diagnostic.diagnosticId }
              : { kind: 'error', message: failure.message },
          failedAt: new Date().toISOString(),
          baseGeneration: this.session.internal.committedRepositoryGeneration.generation,
        },
      );
    } else if (
      failure.kind === 'diagnostic' &&
      attempt.sourceId === this.session.internal.repositorySourceId
    ) {
      // Automatic/initial Repository failure: the actionable Diagnostic is
      // referenced through the session's repository owner field (FR-002).
      this.session.internal.repositoryFailureDiagnosticId = failure.diagnostic.diagnosticId;
    }
    sourceState.status = 'failed';
    sourceState.progress = null;
  }

  /**
   * Drops the lifecycle Diagnostic records currently owned by one Source —
   * the repository owner reference and any stale-entry reference — so a
   * successful refresh or a replacing failure never leaves an orphaned
   * record (data-model.md § Diagnostic: every retained record has exactly
   * one public owner reference).
   */
  private dropLifecycleDiagnosticsFor(sourceId: string): void {
    if (sourceId === this.session.internal.repositorySourceId) {
      const previous = this.session.internal.repositoryFailureDiagnosticId;
      if (previous !== null) {
        this.session.internal.sessionDiagnostics.delete(previous);
        this.session.internal.repositoryFailureDiagnosticId = null;
      }
    }
    for (const entry of this.session.internal.staleFailures) {
      if (entry.sourceId === sourceId && entry.failureRef.kind === 'diagnostic') {
        this.session.internal.sessionDiagnostics.delete(entry.failureRef.diagnosticId);
      }
    }
  }
}
