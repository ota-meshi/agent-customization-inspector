// Public session API DTO contracts shared by the host and the client
// (contracts/http-api.md, data-model.md). Type declarations only — this
// module deliberately ships zero runtime code (the `-types` name records
// that): every type here is a closed, strict-JSON-serializable wire shape,
// and internal authority state (raw or canonical roots, coordinator locks,
// lifecycle owner keys) is absent by construction rather than filtered or
// re-verified at serialization time (FR-002, T028). Platform-neutral by
// design — no node: imports — so the client build can import it.
import type { SerializedDiagnostic } from './diagnostics';
import type { EvidenceAssessment, SourceBoundaryDto, SupportedTool } from './entities';

/**
 * Per-file rollup of recognition parsing for inventory display
 * (data-model.md § CustomizationFile) — a denormalized projection of the
 * file's recognitions:
 *  - 'not-applicable'  every recognition is `not-attempted` (nothing to
 *                      extract, so no parse was attempted)
 *  - 'all-parsed'      at least one recognition parsed and none failed
 *  - 'mixed'           parsed and failed recognitions coexist
 *  - 'all-failed'      at least one recognition failed and none parsed;
 *                      the source text stays displayed and
 *                      comparison-eligible while only derived
 *                      metadata/relationships are omitted (FR-028)
 */
export type ParseSummary = 'not-applicable' | 'all-parsed' | 'mixed' | 'all-failed';

/**
 * One recognition's closed extraction state (data-model.md
 * § ToolRecognition):
 *  - 'not-attempted'  no allowlisted extractor applies to this recognition
 *  - 'parsed'         extraction completed for this recognition
 *  - 'failed'         extraction failed all-or-nothing for this recognition
 *                     only (FR-028); the file's complete source stays
 *                     displayed and comparison-eligible
 */
export type RecognitionParseStatus = 'not-attempted' | 'parsed' | 'failed';

/**
 * One tool recognition as summarized on an inventory row
 * (contracts/http-api.md § get-session `files[]` recognition summaries):
 * exactly tool, kind, parse status, provenance count, and the
 * recognition's diagnostic IDs — no recognition ID and never extraction
 * content.
 */
export interface RecognitionSummaryDto {
  /** The recognizing tool. */
  readonly tool: SupportedTool;
  /**
   * The recognized customization kind (data-model.md § ToolRecognition).
   * The closed kind catalog and its wire spellings are owned by the vendor
   * recognizer phases and their contract gate; no recognizer exists yet, so
   * this stays an open string until those phases fix the union.
   */
  readonly kind: string;
  /** Closed extraction state; see {@link RecognitionParseStatus}. */
  readonly parseStatus: RecognitionParseStatus;
  /** How many rule/path admissions back this recognition (data-model.md § ToolRecognition `provenances`). */
  readonly provenanceCount: number;
  /** Recognition-scoped extraction-failure diagnostics (FR-028). */
  readonly diagnosticIds: readonly string[];
}

/** Fields every discovered file carries regardless of its read outcome. */
interface CustomizationFileBase {
  /** Opaque file identity, regenerated on every commit of the owning sequence. */
  readonly fileId: string;
  /** The Source this file was discovered in. */
  readonly sourceId: string;
  /** NFC display path relative to the owning Source's single root (FR-024). */
  readonly sourceRelativePath: string;
  /** File-scoped diagnostics for this file (FR-028); present on every variant. */
  readonly diagnosticIds: readonly string[];
}

/**
 * One discovered customization file as committed into a generation
 * snapshot — the transport shape of spec.md § Key Entities · Customization
 * File, discriminated by `encoding` so an impossible combination is
 * unrepresentable. The read state is derived from the discriminator:
 * readable text (`utf-8` | `utf-8-replaced`), diagnostic-only `binary`,
 * and `unknown` for a read that failed before the bytes could be
 * classified (FR-024/FR-028).
 */
export type CustomizationFileDto =
  | (CustomizationFileBase & {
      /** Readable decode classification; BOM presence is recorded separately. */
      readonly encoding: 'utf-8' | 'utf-8-replaced';
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text as authored; readable text always has it. */
      readonly sourceText: string;
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
      /** Per-file parse rollup for inventory display; see {@link ParseSummary}. */
      readonly parseSummary: ParseSummary;
      /** Tool recognitions attached to this file (FR-005, data-model.md § CustomizationFile). */
      readonly recognitionIds: readonly string[];
      /** Authored references from this file, never expanded (FR-010). */
      readonly relationshipIds: readonly string[];
    })
  | (CustomizationFileBase & {
      /** At least one NUL byte: diagnostic-only, nothing to parse, and no
       * BOM concept — the NUL check precedes BOM handling (FR-028). */
      readonly encoding: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    })
  | (CustomizationFileBase & {
      /** The read failed before the bytes could be classified (FR-024);
       * nothing was accepted, so no other field exists. */
      readonly encoding: 'unknown';
    });

/**
 * One inventory row of the session snapshot's committed files
 * (contracts/http-api.md § get-session `files[]`): the identity, path,
 * diagnostics, and per-variant summary fields of a committed
 * {@link CustomizationFileDto} — never its `sourceText`. Complete authored
 * content is served only through the detail routes after the in-memory
 * sensitive-value acknowledgement (FR-027), so the snapshot must not carry
 * it.
 */
export type CustomizationFileSummaryDto =
  | (CustomizationFileBase & {
      /** Readable decode classification; BOM presence is recorded separately. */
      readonly encoding: 'utf-8' | 'utf-8-replaced';
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
      /** Per-file parse rollup for inventory display; see {@link ParseSummary}. */
      readonly parseSummary: ParseSummary;
      /**
       * Recognition summaries per the get-session contract row. Projected
       * empty until the vendor recognizer phases store `ToolRecognition`
       * entities — the summary data (tool, kind, provenance count) lives on
       * those entities, and no production recognizer exists yet.
       */
      readonly recognitions: readonly RecognitionSummaryDto[];
    })
  | (CustomizationFileBase & {
      /** At least one NUL byte (FR-028); the summary adds only the size. */
      readonly encoding: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    })
  | (CustomizationFileBase & {
      /** The read failed before classification (FR-024); nothing to add. */
      readonly encoding: 'unknown';
    });

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

/**
 * The closed condition-fact key vocabulary
 * (data-model.md § ApplicabilityAssessment): each key names one documented
 * runtime, environment, or policy input a projection may depend on. A key is
 * never inferred from file existence.
 */
export type ConditionFactKey =
  | 'surface'
  | 'engine-version'
  | 'runtime-cwd'
  | 'workspace-root'
  | 'repository-root'
  | 'project-root'
  | 'worked-path'
  | 'target-match'
  | 'scope-availability'
  | 'feature-state'
  | 'trust'
  | 'approval'
  | 'enablement'
  | 'selection'
  | 'settings-inputs'
  | 'plugin-state'
  | 'agent-context'
  | 'event'
  | 'documentation-variant'
  | 'tool-availability'
  | 'installation'
  | 'managed-policy'
  | 'instruction-byte-budget'
  | 'content-limits'
  | 'external-runtime';

/**
 * The closed condition status vocabulary
 * (data-model.md § ApplicabilityAssessment): 'satisfied'/'unsatisfied'
 * record a documented determination, 'unknown' records a missing input that
 * never defaults to satisfied, and 'documentation-conflict' records
 * incompatible retained official assertions. This is deliberately distinct
 * from `DocumentationStatus`, which grades evidence completeness.
 */
export type ConditionFactStatus =
  | 'satisfied'
  | 'unsatisfied'
  | 'unknown'
  | 'documentation-conflict';

/**
 * Where a condition determination comes from
 * (data-model.md § ApplicabilityAssessment): inspected repository data, an
 * official documented rule, an intentionally excluded input, or a runtime
 * input the Inspector does not read.
 */
export type ConditionFactBasis =
  | 'inspected-data'
  | 'official-rule'
  | 'excluded-input'
  | 'runtime-input';

/**
 * One closed condition record (data-model.md § ApplicabilityAssessment,
 * § SourceConditionFact). A `satisfied` fact records a documented non-file
 * runtime fact but still grants no read authority and never duplicates an
 * authored source value.
 */
export interface ConditionFact {
  /** Which documented input this fact describes; see {@link ConditionFactKey}. */
  readonly key: ConditionFactKey;
  /** The recorded determination; see {@link ConditionFactStatus}. */
  readonly status: ConditionFactStatus;
  /** Fixed registry reason code explaining the determination. */
  readonly reasonCode: string;
  /** Where the determination comes from; see {@link ConditionFactBasis}. */
  readonly basis: ConditionFactBasis;
}

/**
 * Source-level fact for documented non-file behavior or excluded/runtime
 * inputs that have no originating file (data-model.md § SourceConditionFact,
 * FR-039). It has no file ID, path, authored source, relationship origin, or
 * comparison target, and it never initiates local or hosted I/O.
 */
export interface SourceConditionFactDto {
  /** Product whose documented non-file behavior is described. */
  readonly tool: SupportedTool;
  /** Exact maintained product surface; never inferred from the Source kind. */
  readonly surface: string;
  /** The excluded or relationship-only rule that defines this non-file fact. */
  readonly ruleId: string;
  /** Candidate/relationship rules that may project this fact; sorted, non-empty. */
  readonly affectedRuleIds: readonly string[];
  /** Sorted behavior statements that explain the fact; never grants a read. */
  readonly behaviorRefs: readonly string[];
  /** Sorted composition/selection strategies used by the projection. */
  readonly strategyRefs: readonly string[];
  /** Sorted non-empty official evidence records; never grants a read. */
  readonly sourceRefs: readonly string[];
  /**
   * Exactly one assessment for `ruleId` and every referenced behavior and
   * strategy; record-by-record with no aggregate status (QR-005).
   */
  readonly evidenceAssessments: readonly EvidenceAssessment[];
  /** The closed condition record; see {@link ConditionFact}. */
  readonly condition: ConditionFact;
}

/**
 * Closed public scope union (data-model.md § ScopeDescriptor): where an
 * admitted customization applies, rendered without implementation-specific
 * objects. Each variant carries only the fields listed for it.
 */
export type ScopeDescriptor =
  | {
      /** The owning Repository or tool-specific Global Source root. */
      readonly kind: 'source-root';
    }
  | {
      /** One Source-relative directory and its descendants. */
      readonly kind: 'directory-subtree';
      /** The subtree root, relative to the owning admission's Source. */
      readonly path: string;
    }
  | {
      /** The exact admitted path and immutable matcher-selector alternative. */
      readonly kind: 'matching-path';
      /** The admitted Source-relative path. */
      readonly path: string;
      /** Index of the immutable matcher selector that admitted the path. */
      readonly selectorIndex: number;
    }
  | {
      /** References one DeclaredMetadataEntry without duplicating its value. */
      readonly kind: 'declared';
      /** The closed declared-metadata field the scope comes from. */
      readonly fieldId: string;
      /** Which authored occurrence of that field is referenced. */
      readonly occurrence: number;
    };

/**
 * One component of a documented order (data-model.md § OrderDescriptor).
 * Components are already in documented pipeline order; unknown or
 * conflicting order is represented by a null descriptor plus
 * applicability/documentation facts, never a fabricated rank.
 */
export type OrderComponent =
  | {
      /** Documented path-layer order only. */
      readonly kind: 'path-depth';
      /** Which end of the layer chain wins. */
      readonly direction: 'broad-to-narrow' | 'narrow-to-broad';
      /** This component's non-negative layer depth. */
      readonly depth: number;
      /** The Source-relative path of this layer. */
      readonly path: string;
    }
  | {
      /** Fixed documented fallback/precedence rank within one strategy. */
      readonly kind: 'registry-rank';
      /** The strategy that documents the rank. */
      readonly strategyId: string;
      /** The non-negative documented rank. */
      readonly rank: number;
    }
  | {
      /** Authored declaration order without copying its value. */
      readonly kind: 'source-occurrence';
      /** The closed declared-metadata field the order comes from. */
      readonly fieldId: string;
      /** Which authored occurrence of that field is referenced. */
      readonly occurrence: number;
    };

/**
 * Closed public order shape (data-model.md § OrderDescriptor): a non-empty
 * ordered list of documented order components.
 */
export interface OrderDescriptor {
  /** Documented order components in pipeline order; non-empty. */
  readonly components: readonly OrderComponent[];
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
  /** Origin-file-less Source Condition Facts (FR-039). */
  readonly conditionFacts: readonly SourceConditionFactDto[];
  /** Source-scoped diagnostics, e.g. `root-unreadable` (FR-002). */
  readonly diagnosticIds: readonly string[];
}

/**
 * What explains a stale entry: a deterministic Diagnostic or the failed
 * request's error message (FR-030).
 */
export type StaleFailureRef =
  | { readonly kind: 'diagnostic'; readonly diagnosticId: string }
  | { readonly kind: 'error'; readonly message: string };

/**
 * One Source's explicit-rescan stale overlay
 * (data-model.md § StaleSourceFailure); the retained snapshot stays visible
 * while this entry exists.
 */
export interface StaleSourceFailure {
  /** The Source whose explicit rescan failed. */
  readonly sourceId: string;
  /** What explains the failure: a Diagnostic or the failed request's error. */
  readonly failureRef: StaleFailureRef;
  /** UTC timestamp of the terminal failure. */
  readonly failedAt: string;
  /** The owning sequence's generation that stays visible as stale (FR-030). */
  readonly baseGeneration: number;
}

/**
 * The complete public session state served over the session API —
 * rebuilt from internal state on every call
 * (data-model.md § InspectionSession, contracts/http-api.md § get-session).
 */
export interface SessionSnapshot {
  /** Opaque session identity; carries no authority (the host is unauthenticated). */
  readonly sessionId: string;
  /** UTC timestamp of session bootstrap. */
  readonly createdAt: string;
  /** Every Source's public projection. */
  readonly sources: readonly SourceDto[];
  /**
   * The committed inventory of both sequences' current generations as
   * content-free summary rows (contracts/http-api.md § get-session
   * `files[]`); `sourceText` is served only by the acknowledgement-gated
   * detail routes (FR-027).
   */
  readonly files: readonly CustomizationFileSummaryDto[];
  /**
   * Active-generation Diagnostic records plus session-owned lifecycle
   * records (contracts/http-api.md § get-session `diagnostics[]`).
   */
  readonly diagnostics: readonly SerializedDiagnostic[];
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

/**
 * The exact control-only liveness projection
 * (contracts/http-api.md § get-liveness): obtained from one current
 * coordinator-lock snapshot, may carry a non-null disable projection so
 * another tab can observe disable, and never contains a generation or
 * inspection graph.
 */
export interface LivenessProjection {
  /** Opaque session identity for baseline confirmation. */
  readonly sessionId: string;
  /** Current Global content epoch; a greater value forces a client purge. */
  readonly globalContentEpoch: number;
  /** Current disable-barrier projection (null scaffold until the Global tasks). */
  readonly globalDisableInProgress: null;
}

/**
 * The rescan acceptance result
 * (contracts/http-api.md § rescan-repository): the admitted request ID plus
 * the updated Source summary carrying that same ID.
 */
export interface ScanAdmission {
  /** The opaque request ID issued at admission (FR-030 correlation). */
  readonly scanRequestId: string;
  /** The updated Source projection at admission time. */
  readonly source: SourceDto;
}

/**
 * The closed catalog of deterministic rejection codes
 * (contracts/http-api.md § Common results and errors). Each 4xx-class conflict
 * or validation failure is a declared functional outcome carrying exactly one
 * of these fixed codes; the union keeps a producer from emitting, and a
 * consumer from matching, a code outside the contract.
 */
export type RejectionCode =
  /** A referenced resource (e.g. a `FileDetail` file ID) belongs to a superseded generation. */
  | 'stale-resource'
  /** A duplicate explicit rescan was requested while a Repository scan is already running or queued. */
  | 'scan-in-progress'
  /** A Global enable commit was requested while one is already in progress. */
  | 'global-enable-in-progress'
  /** An operation was requested while a Global disable is still pending. */
  | 'global-disable-pending'
  /** A preview mutation was attempted while active consent has frozen the preview. */
  | 'consent-preview-frozen'
  /** An operation referenced a consent preview that does not exist. */
  | 'consent-preview-missing'
  /** A Global enable commit was attempted without the required consent. */
  | 'consent-required'
  /** The submitted `allowlistVersion` no longer matches the server's current allowlist. */
  | 'allowlist-version-mismatch'
  /** The confirmed preview does not match the server's frozen preview. */
  | 'consent-preview-mismatch'
  /** A Global retry found no retryable tool (an empty tool projection). */
  | 'no-retryable-global-tool';

/**
 * The deterministic rejection envelope
 * (contracts/http-api.md § Common results and errors): each 4xx-class
 * conflict or validation failure is a named closed variant with a fixed
 * code — a declared functional outcome, not sanitization. An unexpected
 * failure is never wrapped here; it crosses the channel as an ordinary
 * serialized RPC error.
 */
export interface DeterministicRejection {
  /** The closed rejection payload. */
  readonly error: {
    /** One code from the closed {@link RejectionCode} catalog (contracts/http-api.md). */
    readonly code: RejectionCode;
  };
}

/** Re-exported so API consumers resolve every wire type from one module. */
export type { SerializedDiagnostic };
