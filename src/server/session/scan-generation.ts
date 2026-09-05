// Deterministic generation construction. Repository and Global inspection
// have independent lifecycles, so each keeps its own atomic generation
// sequence: the Repository sequence starts at the synchronous zero-I/O
// bootstrap generation 0 and advances on Repository scans, while a Global
// sequence exists only from the enable commit that creates it until the
// disable barrier discards it (FR-042 — disable produces no generation).
// A file's identity is its Source and Source-relative Path — stable across
// generations, so a commit publishes the attempt's records as constructed
// (FR-030); no per-generation file ID exists to rekey.
import type { CustomizationFileDto } from '../../shared/api-types';
import type { ToolRecognition } from '../inspection/recognizers/candidate';
import type { SerializedDiagnostic } from '../../shared/diagnostics';

/**
 * Which atomic commit produced a Repository generation, in lifecycle order:
 *  - 'bootstrap'        generation 0 at session start — zero filesystem I/O
 *                       and an empty inventory (FR-002); scanRequestId null
 *  - 'repository-scan'  the automatic initial scan or an explicit rescan of
 *                       the Repository Source (FR-030)
 */
export type RepositoryTransactionKind =
  /** Synchronous generation 0 with no filesystem I/O or request ID. */
  | 'bootstrap'
  /** An automatic initial scan or explicit Repository rescan (FR-030). */
  | 'repository-scan';

/**
 * Which atomic commit produced a Global generation, in lifecycle order:
 *  - 'global-enable'  the one-transaction consent commit that creates the
 *                     sequence and publishes every admitted tool Source
 *                     atomically (FR-014), including an active-consent retry
 *  - 'global-scan'    an explicit rescan of the enabled Global sources
 *                     (FR-030)
 * Global disable is deliberately not a kind: it discards the whole Global
 * sequence instead of committing one (FR-042).
 */
export type GlobalTransactionKind =
  /** The consent commit that creates and atomically publishes the Global sequence. */
  | 'global-enable'
  /** An explicit rescan of enabled Global Sources. */
  | 'global-scan';

/**
 * The committed generation's public status (spec.md § Closed Scan
 * Publication Outcomes):
 *  - 'complete'  traversal finished and every file has a complete result,
 *                including readable `utf-8-replaced` decodes
 *  - 'partial'   one or more files ended file-confined (unreadable, binary,
 *                or parse failure) as diagnostic-only items while every
 *                unaffected file is complete (FR-028)
 * There is deliberately no 'failed' member: a failed attempt commits no
 * generation at all — failure is the absence of a commit plus the retained
 * previous snapshot's stale marking (FR-030).
 */
export type GenerationOutcome =
  /** Every admitted file has a complete result. */
  | 'complete'
  /** At least one file has a file-confined diagnostic-only outcome (FR-028). */
  | 'partial';

/** Fields shared by both sequences' committed generations. */
interface ScanGenerationBase {
  /** Position in the owning sequence; monotonic per sequence. */
  readonly generation: number;
  /** The generation this commit replaced. */
  readonly baseGeneration: number;
  /** The Sources this commit scanned. */
  readonly scannedSourceIds: readonly string[];
  /** UTC timestamp at which the committing scan started. */
  readonly startedAt: string;
  /** UTC timestamp at which the committing scan finished. */
  readonly finishedAt: string;
  /** Public commit status; see {@link GenerationOutcome}. */
  readonly outcome: GenerationOutcome;
  /** The sequence's complete committed inventory. */
  readonly files: readonly CustomizationFileDto[];
  /**
   * Every recognition attached to a file of this generation. A recognition
   * names the file it belongs to by its Source-relative Path; the file carries
   * no list of its recognitions, so there is no second spelling to disagree
   * with that one direction.
   */
  readonly recognitions: readonly ToolRecognition[];
  /** Diagnostics committed with this generation. */
  readonly diagnostics: readonly SerializedDiagnostic[];
  /**
   * Census roots whose real path escaped their Source, one entry per
   * `(sourceId, directory)` in the recognitions' own `pluginRoot` spelling
   * (scan.ts § ScanPublication): what lies beyond the Source belongs to no
   * Source, so the session refuses plugin membership below these spellings
   * instead of rebuilding one from independently admitted files.
   */
  readonly censusEscapedDirectories: readonly { sourceId: string; directory: string }[];
}

/**
 * One committed snapshot of the Repository sequence (FR-030); the sequence
 * starts at the bootstrap generation 0 and always exists.
 */
export interface RepositoryScanGeneration extends ScanGenerationBase {
  /** Which Repository commit produced it; see {@link RepositoryTransactionKind}. */
  readonly transactionKind: RepositoryTransactionKind;
  /** Null exactly for the bootstrap generation 0 (FR-030 correlation). */
  readonly scanRequestId: string | null;
}

/**
 * One committed snapshot of the Global sequence, which exists only from the
 * enable commit until disable discards it (FR-014, FR-042).
 */
export interface GlobalScanGeneration extends ScanGenerationBase {
  /** Which Global commit produced it; see {@link GlobalTransactionKind}. */
  readonly transactionKind: GlobalTransactionKind;
  /** The admitted enable-batch or rescan request; never null (FR-030). */
  readonly scanRequestId: string;
}

/**
 * The shared payload of every scan commit; the kind is fixed per prepare
 * function.
 */
export interface ScanCommitInput {
  /** Every Source this commit refreshed; clears exactly their stale state (FR-030). */
  readonly scannedSourceIds: readonly string[];
  /** The admitting request, kept across the whole scan lifecycle. */
  readonly scanRequestId: string;
  /** UTC start of the producing scan attempt. */
  readonly startedAt: string;
  /** UTC end of the producing scan attempt. */
  readonly finishedAt: string;
  /** Whether every admitted Source was scanned; see {@link GenerationOutcome}. */
  readonly outcome: GenerationOutcome;
  /** Files to publish, as the attempt constructed them. */
  readonly files: readonly CustomizationFileDto[];
  /** Recognitions to publish, as the attempt constructed them. */
  readonly recognitions: readonly ToolRecognition[];
  /** The attempt's diagnostics, already serialized for the DTO. */
  readonly diagnostics: readonly SerializedDiagnostic[];
  /** The scanned Source's escaped census roots (§ ScanGenerationBase). */
  readonly censusEscapedDirectories: readonly { sourceId: string; directory: string }[];
}

/** Builds the empty zero-I/O Repository generation 0 (FR-002). */
export function createBootstrapGeneration(now: string): RepositoryScanGeneration {
  return {
    generation: 0,
    baseGeneration: 0,
    transactionKind: 'bootstrap',
    scannedSourceIds: [],
    scanRequestId: null,
    startedAt: now,
    finishedAt: now,
    outcome: 'complete',
    files: [],
    recognitions: [],
    diagnostics: [],
    censusEscapedDirectories: [],
  };
}

/** Builds the exact N+1 Repository replacement generation (FR-030). */
export function prepareNextRepositoryGeneration(
  current: RepositoryScanGeneration,
  input: ScanCommitInput,
): RepositoryScanGeneration {
  return {
    generation: current.generation + 1,
    baseGeneration: current.generation,
    transactionKind: 'repository-scan',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files: input.files,
    recognitions: input.recognitions,
    diagnostics: input.diagnostics,
    censusEscapedDirectories: input.censusEscapedDirectories,
  };
}

/**
 * Builds Global generation 1 — the enable commit that creates the sequence
 * and publishes every admitted tool Source in one transaction (FR-014).
 * There is no empty Global generation 0: before enable, no Global state
 * exists at all.
 */
export function createGlobalEnableGeneration(input: ScanCommitInput): GlobalScanGeneration {
  return {
    generation: 1,
    baseGeneration: 0,
    transactionKind: 'global-enable',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files: input.files,
    recognitions: input.recognitions,
    diagnostics: input.diagnostics,
    censusEscapedDirectories: input.censusEscapedDirectories,
  };
}

/** Builds the exact N+1 Global rescan replacement generation (FR-030). */
export function prepareNextGlobalGeneration(
  current: GlobalScanGeneration,
  input: ScanCommitInput,
): GlobalScanGeneration {
  return {
    generation: current.generation + 1,
    baseGeneration: current.generation,
    transactionKind: 'global-scan',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files: input.files,
    recognitions: input.recognitions,
    diagnostics: input.diagnostics,
    censusEscapedDirectories: input.censusEscapedDirectories,
  };
}
