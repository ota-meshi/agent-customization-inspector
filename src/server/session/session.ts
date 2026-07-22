// Inspection session state and the serialized scan coordinator. The session
// publishes zero-I/O bootstrap Repository generation 0 synchronously with
// exactly one enabled idle Repository Source; the Repository and Global
// generation sequences are independent because their lifecycles are
// (Repository always exists, Global exists only between enable and
// disable). The coordinator serializes scans, keeps one request ID across a
// scan lifecycle, commits atomic N+1 replacements per sequence, and retains
// explicit-rescan stale state.
import {
  createOpaqueId,
  createSourceBoundaryDto,
  type SourceBoundaryDto,
  type SupportedTool,
} from '../../shared/entities';
import {
  createBootstrapGeneration,
  prepareNextRepositoryGeneration,
  type CustomizationFileDto,
  type GlobalScanGeneration,
  type RepositoryScanGeneration,
} from './scan-generation';
import {
  clearStaleFailures,
  deriveSnapshotState,
  upsertStaleFailure,
  type StaleSourceFailure,
} from './stale-failures';
import type { SerializedDiagnostic } from '../../shared/diagnostics';

/**
 * A Source's operational overlay status (data-model.md § Source):
 *  - 'idle'      bootstrapped, no scan admitted yet
 *  - 'scanning'  an admitted scan is in flight
 *  - 'disabling' the Global disable barrier is draining this Source
 *  - 'ready'     the last commit for this Source was complete
 *  - 'partial'   the last commit carried file-confined diagnostics (FR-028)
 *  - 'failed'    the last attempt failed; an explicit rescan additionally
 *                marks the retained snapshot stale (FR-030)
 */
export type SourceStatus = 'idle' | 'scanning' | 'disabling' | 'ready' | 'partial' | 'failed';

/**
 * Live progress of one scan attempt, updated while the scan runs and
 * projected into the owning {@link SourceDto}.
 */
export interface ScanProgressDto {
  /** The admitted request this progress reports; null only in placeholders. */
  readonly scanRequestId: string | null;
  /**
   * Coarse scan phase for status display: 'waiting' = admitted but not
   * started, 'cancelling' = publication authority revoked and winding down,
   * then the ordinary pipeline order — enumerate the allowlist, read file
   * bytes, expand derived rules, run recognition/parsing — ending 'complete'.
   */
  readonly phase:
    | 'waiting'
    | 'cancelling'
    | 'enumerating'
    | 'reading'
    | 'deriving'
    | 'recognizing'
    | 'complete';
  /** UTC timestamp of queued admission; null until queued. */
  readonly queuedAt: string | null;
  /** UTC timestamp at which scanning started; null until started. */
  readonly startedAt: string | null;
  /** Directory entries visited so far. */
  readonly visitedEntries: number;
  /** Allowlisted candidate files discovered so far. */
  readonly candidateFiles: number;
  /** File bytes read so far. */
  readonly readBytes: number;
  /** Diagnostics produced so far. */
  readonly diagnosticCount: number;
}

/** One Source's public projection (spec.md § Key Entities · Source). */
export interface SourceDto {
  /** Opaque stable Source identity; the Repository's survives every commit. */
  readonly sourceId: string;
  /** Which boundary family the Source belongs to. */
  readonly kind: 'repository' | 'global';
  /** Owning tool of a Global Source; null for the Repository Source. */
  readonly tool: SupportedTool | null;
  /** Whether the Source currently participates in scans. */
  readonly enabled: boolean;
  /** Operational overlay status; see {@link SourceStatus}. */
  readonly status: SourceStatus;
  /** Non-authorizing root presentation (escaped label + origin). */
  readonly boundary: SourceBoundaryDto;
  /** The owning sequence's last committed generation (FR-030). */
  readonly generation: number;
  /** The latest admitted scan request for this Source; null before any. */
  readonly scanRequestId: string | null;
  /** Live scan progress; null while no scan is running. */
  readonly progress: ScanProgressDto | null;
  /** Source Condition Facts (none are implemented yet; FR-039). */
  readonly conditionFacts: readonly never[];
  /** Source-scoped diagnostics, e.g. `root-unreadable` (FR-002). */
  readonly diagnosticIds: readonly string[];
}

/**
 * The complete public session state served over the session API —
 * rebuilt from internal state on every call
 * (data-model.md § InspectionSession).
 */
export interface SessionSnapshot {
  /** Opaque session identity; carries no authority (the host is unauthenticated). */
  readonly sessionId: string;
  /** UTC timestamp of session bootstrap. */
  readonly createdAt: string;
  /** Every Source's public projection. */
  readonly sources: readonly SourceDto[];
  /** Last committed Repository generation (bootstrap generation 0 onward). */
  readonly repositoryGeneration: number;
  /** Null while Global inspection is disabled (no Global sequence exists). */
  readonly globalGeneration: number | null;
  /** Derived from staleFailures: stale exactly while any entry remains. */
  readonly snapshotState: 'current' | 'stale-after-fatal-rescan';
  /** Per-Source stale overlays from failed explicit rescans (FR-030). */
  readonly staleFailures: readonly StaleSourceFailure[];
  /** Global consent/control projection (null scaffold until the Global tasks). */
  readonly globalControl: null;
  /** Global enable-operation projection (null scaffold until the Global tasks). */
  readonly globalEnableInProgress: null;
  /** Global disable-barrier projection (null scaffold until the Global tasks). */
  readonly globalDisableInProgress: null;
  /** Increments on the disable purge so clients purge before rendering (FR-042). */
  readonly globalContentEpoch: number;
  /** Session-scoped diagnostics. */
  readonly sessionDiagnosticIds: readonly string[];
  /** The current Repository `root-unreadable` diagnostic, if any (FR-002). */
  readonly repositoryFailureDiagnosticId: string | null;
}

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
 * Creates the bootstrap session synchronously with zero filesystem I/O.
 * The selection (invocation cwd, `--cwd` value, selected root) is retained
 * internally for later scans and lifecycle correlation; publicly it
 * surfaces only as the non-authorizing boundary presentation, and read
 * authority requires later central boundary admission.
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
        repositoryGeneration: internal.committedRepositoryGeneration.generation,
        globalGeneration: internal.committedGlobalGeneration?.generation ?? null,
        snapshotState: deriveSnapshotState(internal.staleFailures),
        staleFailures: [...internal.staleFailures],
        globalControl: null,
        globalEnableInProgress: null,
        globalDisableInProgress: null,
        globalContentEpoch: 0,
        sessionDiagnosticIds: [],
        repositoryFailureDiagnosticId: null,
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
  | { readonly kind: 'startup'; readonly operationId: null }
  | { readonly kind: 'request'; readonly operationId: string };

/**
 * Coordinator admission outcome: 'admitted' issues the request-correlated
 * scanRequestId; 'conflict' is the fixed scan-in-progress rejection while a
 * scan for the same Source is already active (FR-030).
 */
export type AdmitScanResult =
  | { readonly kind: 'admitted'; readonly scanRequestId: string }
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
  /** Set to 'revoked' by a disable barrier; a revoked attempt commits nothing. */
  publicationAuthority: 'active' | 'revoked';
  /** True once the attempt terminally completed or failed; settled attempts are inert. */
  settled: boolean;
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
   * The status a Source rests at when no scan is running and no result was
   * published: 'idle' before its first commit, otherwise the last committed
   * outcome's status ('partial' for a partial commit, 'ready' otherwise).
   * Used by the FR-029 late-result discard branches so a discarded result
   * never misrepresents a committed Source as never-scanned.
   */
  private restingStatus(sourceId: string): SourceStatus {
    if (!this.hasCommittedBefore.has(sourceId)) {
      return 'idle';
    }
    return this.session.internal.committedRepositoryGeneration.outcome === 'partial'
      ? 'partial'
      : 'ready';
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
    // Only a session-API-triggered rescan of an already committed Source counts as
    // "explicit": automatic first scans and initial commits never create
    // stale-failure overlays (data-model.md § StaleSourceFailure).
    const explicit = triggerOwner.kind === 'request' && this.hasCommittedBefore.has(sourceId);
    this.attempts.set(scanRequestId, {
      scanRequestId,
      sourceId,
      triggerOwner,
      explicit,
      publicationAuthority: 'active',
      settled: false,
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
    },
  ): Promise<void> {
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
      // Cleanup-only (FR-029): the late result is discarded, public
      // generation state is untouched, and the Source rests at the status
      // its committed history implies.
      sourceState.status = this.restingStatus(attempt.sourceId);
      sourceState.progress = null;
      return;
    }
    const now = new Date().toISOString();
    const next = prepareNextRepositoryGeneration(this.session.internal.committedRepositoryGeneration, {
      scannedSourceIds: [attempt.sourceId],
      scanRequestId,
      startedAt: sourceState.progress?.startedAt ?? now,
      finishedAt: now,
      outcome: 'complete',
      files: result.files,
      diagnostics: result.diagnostics,
    });
    // Atomic replacement: commit the generation, then update overlays. The
    // stale entry is cleared only for the Source this commit refreshed;
    // failures for other Sources are carried forward untouched.
    this.session.internal.committedRepositoryGeneration = next;
    this.session.internal.staleFailures = clearStaleFailures(
      this.session.internal.staleFailures,
      [attempt.sourceId],
    );
    sourceState.status = 'ready';
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
  }

  /**
   * Records the terminal failure of an accepted scan. An explicit rescan —
   * a session-API request for an already committed Source — keeps the last
   * committed snapshot, marks it stale for this Source, and retains the
   * failed request's error message as the stale entry's reference (FR-030).
   * Any other failed scan (the automatic initial scan, or a first scan of a
   * never-committed Source) has no snapshot to mark stale: the Source is
   * only marked failed, and its failure surfaces through the source-scoped
   * diagnostic or the failed request's own error instead of session state.
   * A revoked attempt's failure is discarded like a revoked success
   * (FR-029): it publishes neither 'failed' nor a stale overlay.
   */
  public failScan(scanRequestId: string, message: string): void {
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
      // FR-029 late-result discard: a failure that lands after revocation
      // publishes nothing.
      sourceState.status = this.restingStatus(attempt.sourceId);
      sourceState.progress = null;
      return;
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
          failureRef: { kind: 'error', message },
          failedAt: new Date().toISOString(),
          baseGeneration: this.session.internal.committedRepositoryGeneration.generation,
        },
      );
    }
    sourceState.status = 'failed';
    sourceState.progress = null;
  }
}
