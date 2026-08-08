// Deterministic generation construction. Repository and Global inspection
// have independent lifecycles, so each keeps its own atomic generation
// sequence: the Repository sequence starts at the synchronous zero-I/O
// bootstrap generation 0 and advances on Repository scans, while a Global
// sequence exists only from the enable commit that creates it until the
// disable barrier discards it (FR-042 — disable produces no generation).
// Every commit rekeys all of its own file IDs.
import { createOpaqueId } from '../../shared/entities';
import type { CustomizationFileDto, ToolRecognitionDto } from '../../shared/api-types';
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
   * Every recognition attached to a file of this generation. A recognition names
   * the file it belongs to; the file carries no list of its recognitions, so the
   * commit rekeys both sets of identities and rewrites that one direction.
   */
  readonly recognitions: readonly ToolRecognitionDto[];
  /**
   * Each recognized skill entry point's census result, keyed by the entry
   * point's Source-relative Path — stable across the commit's ID rekeying,
   * which is why the key is the path rather than the file ID. Internal: the
   * inventory's `SkillDefinitionDto.companionFiles` is its one publication
   * (contracts/inspection-path-allowlist.md § Bounded companion census), so no
   * wire recognition repeats it.
   */
  readonly skillCompanionsByPath: ReadonlyMap<string, readonly string[]>;
  /** Diagnostics committed with this generation. */
  readonly diagnostics: readonly SerializedDiagnostic[];
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
  /** Files to publish; their IDs are rekeyed by the commit, not taken from here. */
  readonly files: readonly CustomizationFileDto[];
  /** Recognitions to publish; their IDs are rekeyed by the commit as well. */
  readonly recognitions: readonly ToolRecognitionDto[];
  /** Each recognized skill entry point's census, keyed by its path (stable across rekeying). */
  readonly skillCompanionsByPath: ReadonlyMap<string, readonly string[]>;
  /** The attempt's diagnostics, already serialized for the DTO. */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

// Every generation-owned ID — file and recognition alike, including IDs for
// an unchanged file — is regenerated on commit so no stale client reference
// can survive: a client holding generation-N IDs must refetch rather than
// silently read N+1 data through an old handle. File-scoped diagnostics and
// each recognition's `fileId` are rewritten through the one old-to-new file map,
// so every coherent tuple keeps pointing at the records this commit publishes. A
// file carries no list of its recognitions: which recognitions are attached to
// it is what their own `fileId` says, so there is no second spelling to rewrite
// and none to disagree with.
function rekeyCommit(input: ScanCommitInput): {
  files: readonly CustomizationFileDto[];
  recognitions: readonly ToolRecognitionDto[];
  diagnostics: readonly SerializedDiagnostic[];
} {
  // Each file's committed identity and the pairing that resolves references to
  // it are produced together, in one pass, because they are one fact: the
  // identity drawn for this record.
  //
  // A repeated provisional ID is rejected rather than resolved. This map is the
  // only thing that answers "which committed record does this reference name",
  // and a duplicate key makes that question unanswerable: keeping the last pair
  // would commit a diagnostic attached to the first file against the second
  // file's new identity while its own path still named the first. Producers draw
  // these from `createOpaqueId`, whose 16 crypto-random bytes make a collision an
  // authoring bug — so it fails here, beside the dangling-reference check below,
  // instead of being carried into a committed generation.
  const rekeyedFileIds = new Map<string, string>();
  const files = input.files.map((file) => {
    if (rekeyedFileIds.has(file.fileId)) {
      throw new TypeError(`a commit reused a provisional generation-owned ID: ${file.fileId}`);
    }
    const fileId = createOpaqueId();
    rekeyedFileIds.set(file.fileId, fileId);
    return { ...file, fileId };
  });
  // A missing entry means the producer emitted a reference to a record it
  // never published, which is an authoring bug rather than a runtime state:
  // failing here is better than committing a generation whose IDs dangle. Only
  // file IDs are referenced, so this is the only direction needed.
  const remapFileId = (id: string): string => {
    const next = rekeyedFileIds.get(id);
    if (next === undefined) {
      throw new TypeError(`a commit referenced an unpublished generation-owned ID: ${id}`);
    }
    return next;
  };
  // A recognition's own identity is assigned where it is written: nothing else
  // resolves a recognition by its provisional ID, so the assignment needs no
  // list of its own.
  const recognitions = input.recognitions.map((recognition) => ({
    ...recognition,
    recognitionId: createOpaqueId(),
    fileId: remapFileId(recognition.fileId),
  }));
  const diagnostics = input.diagnostics.map((diagnostic) => {
    const fileId = diagnostic.fileId === null ? null : remapFileId(diagnostic.fileId);
    return fileId === diagnostic.fileId ? diagnostic : { ...diagnostic, fileId };
  });
  return { files, recognitions, diagnostics };
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
    skillCompanionsByPath: new Map(),
    diagnostics: [],
  };
}

/** Builds the exact N+1 Repository replacement generation (FR-030). */
export function prepareNextRepositoryGeneration(
  current: RepositoryScanGeneration,
  input: ScanCommitInput,
): RepositoryScanGeneration {
  const { files, recognitions, diagnostics } = rekeyCommit(input);
  return {
    generation: current.generation + 1,
    baseGeneration: current.generation,
    transactionKind: 'repository-scan',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files,
    recognitions,
    skillCompanionsByPath: input.skillCompanionsByPath,
    diagnostics,
  };
}

/**
 * Builds Global generation 1 — the enable commit that creates the sequence
 * and publishes every admitted tool Source in one transaction (FR-014).
 * There is no empty Global generation 0: before enable, no Global state
 * exists at all.
 */
export function createGlobalEnableGeneration(input: ScanCommitInput): GlobalScanGeneration {
  const { files, recognitions, diagnostics } = rekeyCommit(input);
  return {
    generation: 1,
    baseGeneration: 0,
    transactionKind: 'global-enable',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files,
    recognitions,
    skillCompanionsByPath: input.skillCompanionsByPath,
    diagnostics,
  };
}

/** Builds the exact N+1 Global rescan replacement generation (FR-030). */
export function prepareNextGlobalGeneration(
  current: GlobalScanGeneration,
  input: ScanCommitInput,
): GlobalScanGeneration {
  const { files, recognitions, diagnostics } = rekeyCommit(input);
  return {
    generation: current.generation + 1,
    baseGeneration: current.generation,
    transactionKind: 'global-scan',
    scannedSourceIds: [...input.scannedSourceIds],
    scanRequestId: input.scanRequestId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    outcome: input.outcome,
    files,
    recognitions,
    skillCompanionsByPath: input.skillCompanionsByPath,
    diagnostics,
  };
}
