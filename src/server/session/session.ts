// Inspection session state and the serialized scan coordinator. The session
// publishes zero-I/O bootstrap Repository generation 0 synchronously with
// exactly one enabled idle Repository Source; the Repository and Global
// generation sequences are independent because their lifecycles are
// (Repository always exists, Global exists only between enable and
// disable). The coordinator serializes scans, keeps one request ID across a
// scan lifecycle, commits atomic N+1 replacements per sequence, and retains
// explicit-rescan stale state.
import { isAbsolute, resolve } from 'node:path';
import {
  CUSTOMIZATION_KIND_ORDER,
  SUPPORTED_TOOL_ORDER,
  createOpaqueId,
  createSourceBoundaryDto,
} from '../../shared/entities';
import { sameNameSkillResolutionFor } from '../../shared/registries/skill-resolution';
import {
  createBootstrapGeneration,
  prepareNextRepositoryGeneration,
  type GenerationOutcome,
  type GlobalScanGeneration,
  type RepositoryScanGeneration,
} from './scan-generation';
import { clearStaleFailures, deriveSnapshotState, upsertStaleFailure } from './stale-failures';
import type { SourceBoundaryDto, SupportedTool } from '../../shared/entities';
import type {
  CustomizationFileDto,
  CustomizationFileSummaryDto,
  FileDetailDto,
  RecognitionDetails,
  SameNameSkillResolutionDto,
  ScanProgressPhase,
  ScanProgressDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceStatus,
  StaleSourceFailure,
  ToolRecognitionDto,
} from '../../shared/api-types';
import type { SerializedDiagnostic } from '../../shared/diagnostics';

/** The validated CLI selection handed to session bootstrap (FR-001). */
export interface SessionBootstrapInput {
  /** The one captured `process.cwd()` (FR-001). */
  readonly invocationCwd: string;
  /** The validated `--root` value; null when the option was omitted. */
  readonly rootOptionValue: string | null;
}

/**
 * One Source's mutable operational overlay: what the coordinator writes as
 * attempts are admitted, progress is reported, and results commit, distinct
 * from the committed generations themselves. Constructed idle, which is the
 * whole bootstrap overlay — every later value is a coordinator write.
 */
class MutableSourceState {
  /** The Source this operational overlay belongs to. */
  public readonly sourceId: string;

  /** The Source's public status; see {@link SourceStatus}. */
  public status: SourceStatus = 'idle';

  /**
   * The latest admitted scan request for this Source. Null before any
   * admission, and again once every admitted attempt has been revoked
   * (data-model.md § Source).
   */
  public scanRequestId: string | null = null;

  /**
   * This Source's scan progress, which outlives the scan: the completed
   * counters and the `complete` phase stay so a Ready or Partial Source can
   * state what its committed attempt did. Null while the Source is `idle` or
   * `failed` (data-model.md § Source `progress`).
   */
  public progress: ScanProgressDto | null = null;

  /** Diagnostic IDs currently attached to this Source. */
  public diagnosticIds: readonly string[] = [];

  /** Starts the overlay idle for one Source. */
  public constructor(sourceId: string) {
    this.sourceId = sourceId;
  }
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Projects one committed file into its content-free snapshot summary row
 * (contracts/http-api.md § get-session `files[]`). `sourceText` is
 * deliberately never copied: complete authored content is served only by the
 * detail routes, one file at a time (FR-027), so browsing an inventory never
 * fetches file contents at all.
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
      };
    case 'binary':
      return { ...base, encoding: file.encoding, sizeBytes: file.sizeBytes };
    case 'unknown':
      return { ...base, encoding: file.encoding };
  }
}

/**
 * Projects the skill inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `skills[]`, data-model.md § Inventory
 * unit): one entry per declared name, each listing every `SKILL.md` that
 * declares it.
 *
 * The name is the grouping key because that is the unit the vendors' own
 * selectors use; the file is not, since two files may declare one name. A
 * definition that declares none gets its own entry keyed by its file: a file
 * with no name has not joined a name, and grouping the nameless together would
 * assert an identity none of them has.
 *
 * `pathByFileId` orders the definitions, so the projection needs no filesystem
 * access and two snapshots of one generation publish the same rows.
 */
function projectSkillInventory(
  recognitions: readonly ToolRecognitionDto[],
  pathByFileId: ReadonlyMap<string, string>,
): SkillInventoryEntryDto[] {
  // Keyed by declared name, or by file ID for the nameless — the `\u0000`
  // prefix cannot collide with an authored name, which is a YAML scalar.
  const byName = new Map<string, { name: string | null; byFile: Map<string, MutableDefinition> }>();
  for (const recognition of recognitions) {
    if (!isSkillRecognition(recognition)) {
      continue;
    }
    const name = recognition.details.declaredName ?? null;
    const key = name ?? `\u0000${recognition.fileId}`;
    let entry = byName.get(key);
    if (entry === undefined) {
      entry = { name, byFile: new Map() };
      byName.set(key, entry);
    }
    // One file recognized by several products is one definition with several
    // tools, never one definition per product: the file is what the row lists.
    const definition = entry.byFile.get(recognition.fileId);
    if (definition === undefined) {
      entry.byFile.set(recognition.fileId, new MutableDefinition(recognition));
    } else {
      definition.tools.push(recognition.tool);
    }
  }

  const entries = [...byName.values()].map((entry): SkillInventoryEntryDto => {
    const definitions = [...entry.byFile.values()]
      .map((definition) => ({
        ...definition,
        tools: definition.tools.toSorted(
          (left, right) => SUPPORTED_TOOL_ORDER.indexOf(left) - SUPPORTED_TOOL_ORDER.indexOf(right),
        ),
      }))
      .sort((left, right) =>
        compareStrings(pathByFileId.get(left.fileId) ?? '', pathByFileId.get(right.fileId) ?? ''),
      );
    return {
      declaredName: entry.name,
      definitions,
      // Nothing to resolve with one definition, so the row states no rule
      // rather than a rule that applies to nothing.
      sameNameResolutions:
        definitions.length > 1 ? resolutionsFor(definitions.flatMap((one) => one.tools)) : [],
    };
  });
  // Named entries in name order, then the nameless in path order: the row's own
  // key sorts it, and a file ID never decides a visible order.
  return entries.sort((left, right) => {
    if (left.declaredName !== null && right.declaredName !== null) {
      return compareStrings(left.declaredName, right.declaredName);
    }
    if (left.declaredName === null && right.declaredName === null) {
      return compareStrings(
        pathByFileId.get(left.definitions[0]!.fileId) ?? '',
        pathByFileId.get(right.definitions[0]!.fileId) ?? '',
      );
    }
    return left.declaredName === null ? 1 : -1;
  });
}

/**
 * One file's definition of a grouped skill entry, accumulated across the
 * recognitions that share the file: constructed from the first recognition,
 * then widened as further products recognize the same file.
 */
class MutableDefinition {
  /** The `SKILL.md` this definition is authored in. */
  public readonly fileId: string;

  /** The tools recognizing it, unsorted until the entry is built. */
  public readonly tools: SupportedTool[];

  /** The census result, identical across recognitions of one file. */
  public readonly companionFiles: readonly string[];

  /** Starts the definition from the first skill recognition of its file. */
  public constructor(recognition: SkillRecognitionDto) {
    this.fileId = recognition.fileId;
    this.tools = [recognition.tool];
    this.companionFiles = recognition.details.companionFiles;
  }
}

/**
 * A recognition narrowed to the skill kind. The alias and its guard exist so
 * {@link MutableDefinition}'s constructor states the input it accepts instead
 * of re-guarding what {@link projectSkillInventory} — its one caller — has
 * already proved.
 */
type SkillRecognitionDto = ToolRecognitionDto & {
  readonly details: Extract<RecognitionDetails, { kind: 'skill' }>;
};

/** Whether one recognition is the skill kind, narrowing it for the grouping. */
function isSkillRecognition(recognition: ToolRecognitionDto): recognition is SkillRecognitionDto {
  return recognition.details.kind === 'skill';
}
/**
 * The same-name resolution of each product behind a grouped entry, deduplicated
 * and in the contracted tool order. It states what each vendor documents so the
 * grouping never implies a winner the Inspector has not recorded (FR-007).
 *
 * Each statement is derived from the product's own shipped strategies, so it
 * cannot disagree with them. A product that establishes none contributes no
 * statement rather than a guessed one; a product with no skill rule also
 * recognizes no skill, so it cannot reach this at all.
 */
function resolutionsFor(tools: readonly SupportedTool[]): SameNameSkillResolutionDto[] {
  return [...new Set(tools)]
    .sort((left, right) => SUPPORTED_TOOL_ORDER.indexOf(left) - SUPPORTED_TOOL_ORDER.indexOf(right))
    .flatMap((tool) => {
      const resolution = sameNameSkillResolutionFor(tool);
      return resolution === null ? [] : [{ tool, resolution }];
    });
}

/** Locale-independent string order, so every host sorts a snapshot alike. */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Orders one file's recognitions by the closed tool order, then the closed
 * kind order (data-model.md § ToolRecognition). An opaque ID never breaks the
 * tie: IDs are regenerated on every commit, so using one would make two
 * snapshots of the same generation disagree. Two recognitions of one file
 * cannot share a `(tool, kind)` pair, so no further key is needed.
 */
function sortRecognitions(recognitions: readonly ToolRecognitionDto[]): ToolRecognitionDto[] {
  return recognitions.toSorted((left, right) => {
    const toolDelta =
      SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
    return toolDelta !== 0
      ? toolDelta
      : CUSTOMIZATION_KIND_ORDER.indexOf(left.details.kind) -
          CUSTOMIZATION_KIND_ORDER.indexOf(right.details.kind);
  });
}

/**
 * Builds the snapshot's deterministic inventory order: Source kind, the
 * Global tool where present, the Source-relative path, then the
 * file ID (contracts/http-api.md § get-session). Only the last key uses an
 * opaque ID, and only as a total-order tie-break between two files that agree
 * on every meaningful key.
 */
function sortInventory(
  rows: readonly CustomizationFileSummaryDto[],
  sourceOrder: ReadonlyMap<string, number>,
): CustomizationFileSummaryDto[] {
  return rows.toSorted((left, right) => {
    const sourceDelta =
      (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }
    if (left.sourceRelativePath !== right.sourceRelativePath) {
      return left.sourceRelativePath < right.sourceRelativePath ? -1 : 1;
    }
    return left.fileId < right.fileId ? -1 : left.fileId > right.fileId ? 1 : 0;
  });
}

/**
 * Creates the bootstrap session synchronously with zero filesystem I/O.
 * The selection (invocation cwd, `--root` value, selected root) is retained
 * internally for later scans and lifecycle correlation; publicly it
 * surfaces only as the non-authorizing boundary presentation. There is no
 * separate admission layer: the first scan simply reads the retained
 * selected root, and a missing or unreadable root fails that scan with the
 * source-scoped `root-unreadable` Diagnostic (FR-002).
 */
export class InspectionSession {
  /** Opaque identity of this process's one session. */
  public readonly sessionId: string;

  /** UTC bootstrap timestamp; also generation 0's start and finish. */
  public readonly createdAt: string;

  /** The bootstrap Repository Source's stable ID. */
  public readonly repositorySourceId: string;

  /** The one captured `process.cwd()` (FR-001); identity, not read authority. */
  public readonly invocationCwd: string;

  /**
   * The sole validated `--root` value, null when omitted; retained for
   * lifecycle correlation (data-model.md § InspectionSession).
   */
  public readonly rootOptionValue: string | null;

  /** The selected Repository root later scans traverse (FR-001); never serialized. */
  public readonly selectedRepositoryRoot: string;

  /** Last committed Repository generation (never null after bootstrap); written by the coordinator's commit. */
  public committedRepositoryGeneration: RepositoryScanGeneration;

  /** Last committed Global generation; null while disabled (FR-042). */
  public committedGlobalGeneration: GlobalScanGeneration | null = null;

  /** Stale overlays from failed explicit rescans, sorted by sourceId; written by the coordinator. */
  public staleFailures: readonly StaleSourceFailure[] = [];

  /**
   * Session-owned lifecycle Diagnostics (at most one per lifecycle owner,
   * data-model.md § Diagnostic), keyed by diagnosticId; every retained
   * record is referenced by exactly one public owner field.
   */
  public readonly sessionDiagnostics = new Map<string, SerializedDiagnostic>();

  /**
   * The current Repository `root-unreadable` lifecycle Diagnostic from the
   * automatic first scan (FR-002); cleared by the affected Source's
   * successful commit or replaced by an explicit-rescan stale owner.
   */
  public repositoryFailureDiagnosticId: string | null = null;

  /** Per-Source mutable operational overlays. */
  public readonly sourceStates: Map<string, MutableSourceState>;

  /** The Repository Source's non-authorizing boundary presentation. */
  public readonly boundary: SourceBoundaryDto;

  /** Bootstraps generation 0 from the launch-time facts (FR-001/FR-002). */
  public constructor(input: SessionBootstrapInput) {
    this.createdAt = nowIso();
    this.sessionId = createOpaqueId();
    this.repositorySourceId = createOpaqueId();
    this.invocationCwd = input.invocationCwd;
    this.rootOptionValue = input.rootOptionValue;
    // Resolved lexically (FR-001): the captured invocation directory when
    // `--root` was omitted, the option value unchanged when it is absolute,
    // and the option resolved against the captured directory when it is
    // relative. `node:path` operations only — no filesystem is touched, so
    // this makes no claim about whether the root exists, and it never probes
    // for a repository marker to find one.
    this.selectedRepositoryRoot =
      input.rootOptionValue === null
        ? input.invocationCwd
        : isAbsolute(input.rootOptionValue)
          ? input.rootOptionValue
          : resolve(input.invocationCwd, input.rootOptionValue);
    this.boundary = createSourceBoundaryDto(
      this.selectedRepositoryRoot,
      input.rootOptionValue === null ? 'process-cwd' : 'root-option',
    );
    this.committedRepositoryGeneration = createBootstrapGeneration(this.createdAt);
    this.sourceStates = new Map([
      [this.repositorySourceId, new MutableSourceState(this.repositorySourceId)],
    ]);
  }

  /**
   * Resolves one committed file's complete detail, including the authored
   * source the snapshot deliberately withholds (FR-027).
   *
   * The lookup spans both sequences' current generations, because a file ID
   * names a file rather than a sequence, and the two are independent: a
   * Repository rescan invalidates Repository IDs while a Global file keeps
   * its own.
   */
  public fileDetail(fileId: string): FileDetailDto | null {
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      const file = generation.files.find((candidate) => candidate.fileId === fileId);
      if (file === undefined) {
        continue;
      }
      const recognitions = sortRecognitions(
        generation.recognitions.filter((recognition) => recognition.fileId === fileId),
      );
      // One Diagnostic record can be referenced by both the file and the
      // recognition it failed on, so the referenced IDs are collected into a
      // set before they are resolved: the detail states each observation
      // once, and two identical rows would be two a reader cannot tell apart.
      const referenced = new Set([
        ...file.diagnosticIds,
        ...recognitions.flatMap((recognition) => recognition.diagnosticIds),
      ]);
      return {
        file,
        recognitions,
        // Filtered from the generation's own ordered records rather than
        // built from the ID set, so the detail keeps the deterministic
        // emission order the commit published (data-model.md § Diagnostic).
        diagnostics: generation.diagnostics.filter((diagnostic) =>
          referenced.has(diagnostic.diagnosticId),
        ),
      };
    }
    return null;
  }

  /**
   * Rebuilds the public projection from this session's state on every call.
   * Internal authority fields (the selected root and coordinator state) are
   * simply absent from the projection rather than filtered afterwards, and
   * immutability is owned by the readonly types, not re-enforced at runtime.
   */
  public snapshot(): SessionSnapshot {
    const repository = this.sourceStates.get(this.repositorySourceId);
    if (repository === undefined) {
      throw new Error('the repository source state is missing');
    }
    const committedFiles = [
      ...this.committedRepositoryGeneration.files,
      ...(this.committedGlobalGeneration?.files ?? []),
    ];
    // The path a definition sorts by is the file's own fact, so the skill
    // projection reads it here instead of restating it per definition.
    const pathByFileId = new Map(
      committedFiles.map((file) => [file.fileId, file.sourceRelativePath]),
    );
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      sources: [
        {
          sourceId: this.repositorySourceId,
          kind: 'repository',
          tool: null,
          enabled: true,
          status: repository.status,
          boundary: this.boundary,
          generation: this.committedRepositoryGeneration.generation,
          scanRequestId: repository.scanRequestId,
          progress: repository.progress,
          conditionFacts: [],
          diagnosticIds: [...repository.diagnosticIds],
        },
      ],
      files: sortInventory(
        committedFiles.map((file) => summarizeFile(file)),
        // Only the Repository Source exists at this milestone, so the
        // Source-kind key is constant; the Global tasks extend this map
        // with the fixed Global tool order.
        new Map([[this.repositorySourceId, 0]]),
      ),
      skills: projectSkillInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        pathByFileId,
      ),
      // Semantic emission order (data-model.md § Diagnostic): session-owned
      // lifecycle records (repository, Global tools, published Sources)
      // precede the generations' candidate-owned records.
      diagnostics: [
        ...this.sessionDiagnostics.values(),
        ...this.committedRepositoryGeneration.diagnostics,
        ...(this.committedGlobalGeneration?.diagnostics ?? []),
      ],
      repositoryGeneration: this.committedRepositoryGeneration.generation,
      globalGeneration: this.committedGlobalGeneration?.generation ?? null,
      snapshotState: deriveSnapshotState(this.staleFailures),
      staleFailures: this.staleFailures,
      globalControl: null,
      globalEnableInProgress: null,
      globalDisableInProgress: null,
      globalContentEpoch: 0,
      sessionDiagnosticIds: [...this.sessionDiagnostics.keys()],
      repositoryFailureDiagnosticId: this.repositoryFailureDiagnosticId,
    };
  }
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

/**
 * One admitted scan attempt's coordinator-side lifecycle state, constructed
 * at admission and mutated only by revocation.
 */
class AttemptState {
  /** The request ID issued at admission and kept across the scan lifecycle. */
  public readonly scanRequestId: string;

  /** The one Source this attempt scans. */
  public readonly sourceId: string;

  /** Who initiated the attempt; see {@link TriggerOwner}. */
  public readonly triggerOwner: TriggerOwner;

  /** True for a user-requested rescan; its failure leaves a stale overlay (FR-030). */
  public readonly explicit: boolean;

  /** Whether the attempt may still publish; a revoked attempt commits nothing. */
  public publicationAuthority:
    /** The admitted attempt may publish its terminal result. */
    | 'active'
    /** A disable barrier revoked publication authority. */
    | 'revoked' = 'active';

  /**
   * The Source overlay exactly as admission found it, captured here at
   * construction. A revoked attempt's discarded late result restores it
   * wholesale, so the committed status with its final complete progress, or a
   * retained failure presentation, survives the discard and the revoked
   * request never surfaces as a terminal outcome (spec.md § publication
   * matrix "No later success status"; data-model.md § ScanProgress
   * null/retention rules).
   */
  public readonly priorOverlay: Pick<MutableSourceState, 'status' | 'scanRequestId' | 'progress'>;

  /**
   * Admits one attempt with its publication authority active, capturing the
   * Source overlay as it stands — the admission is the moment "prior" means.
   */
  public constructor(
    scanRequestId: string,
    sourceId: string,
    triggerOwner: TriggerOwner,
    explicit: boolean,
    sourceState: MutableSourceState,
  ) {
    this.scanRequestId = scanRequestId;
    this.sourceId = sourceId;
    this.triggerOwner = triggerOwner;
    this.explicit = explicit;
    this.priorOverlay = {
      status: sourceState.status,
      scanRequestId: sourceState.scanRequestId,
      progress: sourceState.progress,
    };
  }
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
  readonly #session: InspectionSession;

  /**
   * The attempts still running, by scanRequestId. An entry is removed the
   * moment its attempt reaches a terminal outcome, so presence in this map is
   * the single record of "still running": a late result for a removed ID finds
   * nothing and is discarded instead of committed (FR-029). A commit that
   * throws removes nothing, which is what lets the failure the caller reports
   * still be recorded against the same attempt.
   */
  readonly #attempts = new Map<string, AttemptState>();

  /**
   * Sources that have committed at least once — the discriminator that
   * makes a later request-owned scan an "explicit rescan" whose failure
   * creates the stale overlay (FR-030).
   */
  #hasCommittedBefore = new Set<string>();

  /** Binds the coordinator to the one session whose state it serializes. */
  public constructor(session: InspectionSession) {
    this.#session = session;
  }

  /**
   * Admits one scan command for a Source and issues its opaque
   * `scanRequestId` (FR-030). While a scan for the same Source is running
   * or queued, returns the fixed `conflict` instead of stacking attempts.
   */
  public admitScan(sourceId: string, triggerOwner: TriggerOwner): AdmitScanResult {
    const sourceState = this.#session.sourceStates.get(sourceId);
    if (sourceState === undefined) {
      throw new TypeError('unknown sourceId');
    }
    // At most one scan command per source is running or queued; a duplicate
    // returns the documented conflict instead of stacking attempts.
    for (const attempt of this.#attempts.values()) {
      if (attempt.sourceId === sourceId) {
        return { kind: 'conflict' };
      }
    }
    const scanRequestId = createOpaqueId();
    // Only a session-API-triggered rescan of a Source with a committed
    // snapshot counts as "explicit": automatic first scans and initial
    // commits never create stale-failure overlays (data-model.md
    // § StaleSourceFailure). The Repository Source always has one — the
    // bootstrap committed generation 0 — so its very first user-requested
    // rescan after a failed automatic scan already leaves the stale overlay
    // on terminal failure instead of silently discarding it.
    const explicit =
      triggerOwner.kind === 'request' &&
      (sourceId === this.#session.repositorySourceId || this.#hasCommittedBefore.has(sourceId));
    this.#attempts.set(
      scanRequestId,
      new AttemptState(scanRequestId, sourceId, triggerOwner, explicit, sourceState),
    );
    sourceState.status = 'scanning';
    sourceState.scanRequestId = scanRequestId;
    sourceState.progress = {
      scanRequestId,
      phase: 'enumerating',
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
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt !== undefined) {
      attempt.publicationAuthority = 'revoked';
    }
  }

  /**
   * Revokes every running attempt at once, for a shutdown that cannot name
   * them: closing the host stops new requests but not a scan already reading,
   * and a result arriving afterwards must commit nothing.
   */
  public revokeAllPublicationAuthority(): void {
    for (const attempt of this.#attempts.values()) {
      attempt.publicationAuthority = 'revoked';
    }
  }

  /**
   * Advances a running scan's progress (contracts/http-api.md § get-session
   * `progress`). The attempt reports what it has done so far, so a refresh
   * mid-scan shows the phase it is in rather than the zeros an admission
   * starts at. A revoked or unknown request writes nothing: progress
   * is presentation, and a superseded attempt must not speak for the Source.
   */
  public reportProgress(
    scanRequestId: string,
    update: {
      readonly phase: ScanProgressPhase;
      readonly visitedEntries: number;
      readonly candidateFiles: number;
      readonly readBytes: number;
      /** Attempt-local diagnostics accumulated so far (data-model.md § ScanProgress). */
      readonly diagnosticCount: number;
    },
  ): void {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined || attempt.publicationAuthority !== 'active') {
      return;
    }
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (sourceState?.progress?.scanRequestId !== scanRequestId) {
      return;
    }
    sourceState.progress = {
      ...sourceState.progress,
      phase: update.phase,
      visitedEntries: update.visitedEntries,
      candidateFiles: update.candidateFiles,
      readBytes: update.readBytes,
      diagnosticCount: update.diagnosticCount,
    };
  }

  /**
   * Commits an attempt's result as its sequence's exact N+1 generation and
   * clears stale state only for the Sources it refreshed (FR-030). A
   * revoked or already terminal attempt commits nothing.
   */
  public async completeScan(
    scanRequestId: string,
    result: {
      readonly files: readonly CustomizationFileDto[];
      /** The attempt's recognitions; rekeyed with their files by the commit. */
      readonly recognitions: readonly ToolRecognitionDto[];
      readonly diagnostics: readonly SerializedDiagnostic[];
      /**
       * The attempt's closed publication outcome (FR-028): 'partial' exactly
       * when a file-confined outcome exists. The producer decides it; the
       * coordinator only records it, so a partial result can never be
       * silently relabeled complete.
       */
      readonly outcome: GenerationOutcome;
      /**
       * How many directory entries the attempt's walk looked at. The committed
       * progress reports it, so a finished scan states its own work rather than
       * the zero an admission starts the counters at.
       */
      readonly visitedEntries: number;
      /** Allowlisted candidate files the walk discovered (data-model.md § ScanProgress). */
      readonly candidateFiles: number;
      /** Bytes the attempt accepted, as counted while reading. */
      readonly readBytes: number;
    },
  ): Promise<void> {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined) {
      return;
    }
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (sourceState === undefined) {
      return;
    }
    if (attempt.publicationAuthority === 'revoked') {
      // Cleanup-only: the late result is discarded, public generation state
      // is untouched, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}). That
      // includes `scanRequestId`, which becomes null again when the revoked
      // attempt was the Source's first: a Source whose every admission was
      // revoked states no request rather than one whose result was thrown
      // away (data-model.md § Source `scanRequestId`).
      this.#attempts.delete(scanRequestId);
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      return;
    }
    // The entry is removed only after the fallible commit below succeeds.
    // Generation preparation regenerates opaque IDs and can throw; removing it
    // first would leave the rejecting promise reaching the caller's catch while
    // `failScan` found no attempt and silently dropped it, leaving the Source
    // stuck 'scanning' with no stale/failed record. Keeping it lets that
    // `failScan` record the terminal failure (FR-030).
    const now = new Date().toISOString();
    const next = prepareNextRepositoryGeneration(this.#session.committedRepositoryGeneration, {
      scannedSourceIds: [attempt.sourceId],
      scanRequestId,
      startedAt: sourceState.progress?.startedAt ?? now,
      finishedAt: now,
      outcome: result.outcome,
      files: result.files,
      recognitions: result.recognitions,
      diagnostics: result.diagnostics,
    });
    // Atomic replacement: commit the generation, then update overlays. The
    // stale entry — and any lifecycle Diagnostic it references — is cleared
    // only for the Source this commit refreshed; failures for other Sources
    // are carried forward untouched (data-model.md § StaleSourceFailure).
    this.#session.committedRepositoryGeneration = next;
    this.#dropLifecycleDiagnosticsFor(attempt.sourceId);
    this.#session.staleFailures = clearStaleFailures(this.#session.staleFailures, [
      attempt.sourceId,
    ]);
    sourceState.status = result.outcome === 'partial' ? 'partial' : 'ready';
    // The completed counters are what the attempt actually did. Leaving them at
    // the zero an admission starts them with would report "0 files" beside a
    // published inventory (contracts/http-api.md § get-session `progress`).
    sourceState.progress = {
      scanRequestId,
      queuedAt: sourceState.progress?.queuedAt ?? null,
      startedAt: sourceState.progress?.startedAt ?? now,
      phase: 'complete',
      visitedEntries: result.visitedEntries,
      candidateFiles: result.candidateFiles,
      // The attempt's own tally, not a sum over the publication: an empty
      // override is read but not published, so deriving it here would
      // understate the work.
      readBytes: result.readBytes,
      diagnosticCount: result.diagnostics.length,
    };
    this.#hasCommittedBefore.add(attempt.sourceId);
    // Terminal: the entry is removed, which is the whole record that this
    // attempt is over. A late duplicate result for the same request finds no
    // entry and is ignored (FR-029), and the map stays bounded by the number of
    // *running* attempts rather than by session lifetime.
    this.#attempts.delete(scanRequestId);
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
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined) {
      return;
    }
    // A terminal attempt leaves the map whatever its outcome. Every admission
    // walks the retained entries, so a failure that stayed would slow each
    // later admission and keep the map growing for the life of the session.
    this.#attempts.delete(scanRequestId);
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
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
    this.#dropLifecycleDiagnosticsFor(attempt.sourceId);
    if (failure.kind === 'diagnostic') {
      this.#session.sessionDiagnostics.set(failure.diagnostic.diagnosticId, failure.diagnostic);
    }
    // Only an explicit rescan creates the stale overlay — the one case where
    // a previously committed snapshot exists and stays visible
    // (data-model.md § StaleSourceFailure). The coordinator enforces this
    // itself instead of trusting callers to pick the right method.
    if (attempt.explicit) {
      this.#session.staleFailures = upsertStaleFailure(this.#session.staleFailures, {
        sourceId: attempt.sourceId,
        failureRef:
          failure.kind === 'diagnostic'
            ? { kind: 'diagnostic', diagnosticId: failure.diagnostic.diagnosticId }
            : { kind: 'error', message: failure.message },
        failedAt: new Date().toISOString(),
        baseGeneration: this.#session.committedRepositoryGeneration.generation,
      });
    } else if (
      failure.kind === 'diagnostic' &&
      attempt.sourceId === this.#session.repositorySourceId
    ) {
      // Automatic/initial Repository failure: the actionable Diagnostic is
      // referenced through the session's repository owner field (FR-002).
      this.#session.repositoryFailureDiagnosticId = failure.diagnostic.diagnosticId;
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
  #dropLifecycleDiagnosticsFor(sourceId: string): void {
    if (sourceId === this.#session.repositorySourceId) {
      const previous = this.#session.repositoryFailureDiagnosticId;
      if (previous !== null) {
        this.#session.sessionDiagnostics.delete(previous);
        this.#session.repositoryFailureDiagnosticId = null;
      }
    }
    for (const entry of this.#session.staleFailures) {
      if (entry.sourceId === sourceId && entry.failureRef.kind === 'diagnostic') {
        this.#session.sessionDiagnostics.delete(entry.failureRef.diagnosticId);
      }
    }
  }
}
