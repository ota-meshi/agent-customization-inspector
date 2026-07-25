// Public session API DTO contracts shared by the host and the client
// (contracts/http-api.md, data-model.md). Type declarations only — this
// module deliberately ships zero runtime code (the `-types` name records
// that): every type here is a closed, strict-JSON-serializable wire shape,
// and internal authority state (raw or canonical roots, coordinator locks,
// lifecycle owner keys) is absent by construction rather than filtered or
// re-verified at serialization time (FR-002, T028). Platform-neutral by
// design — no node: imports — so the client build can import it.
import type { SerializedDiagnostic } from './diagnostics';
import type {
  EvidenceAssessment,
  ReadableFileEncoding,
  SourceBoundaryDto,
  SourceStatus,
  SupportedTool,
} from './entities';
import type { RejectionCode } from './rejection-codes';

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
export type ParseSummary =
  /** No recognition attempted extraction, so no parse result applies. */
  | 'not-applicable'
  /** At least one recognition parsed and none failed. */
  | 'all-parsed'
  /** Parsed and failed recognitions coexist on the file. */
  | 'mixed'
  /** At least one recognition failed and none parsed; authored source remains available. */
  | 'all-failed';

/**
 * One recognition's closed extraction state (data-model.md
 * § ToolRecognition):
 *  - 'not-attempted'  no allowlisted extractor applies to this recognition
 *  - 'parsed'         extraction completed for this recognition
 *  - 'failed'         extraction failed all-or-nothing for this recognition
 *                     only (FR-028); the file's complete source stays
 *                     displayed and comparison-eligible
 */
export type RecognitionParseStatus =
  /** No allowlisted extractor applies to this recognition. */
  | 'not-attempted'
  /** Extraction completed for this recognition. */
  | 'parsed'
  /** Extraction failed for this recognition while authored source remains available. */
  | 'failed';

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
  /** A readable file with complete authored source and derived graph references. */
  | (CustomizationFileBase & {
      /** Readable decode classification; BOM presence is recorded separately. */
      readonly encoding: ReadableFileEncoding;
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
  /** A NUL-containing diagnostic-only file with no source text. */
  | (CustomizationFileBase & {
      /** At least one NUL byte: diagnostic-only, nothing to parse, and no
       * BOM concept — the NUL check precedes BOM handling (FR-028). */
      readonly encoding: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    })
  /** A file whose bytes could not be read or classified. */
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
  /** Inventory projection of a readable file, excluding complete source text. */
  | (CustomizationFileBase & {
      /** Readable decode classification; BOM presence is recorded separately. */
      readonly encoding: ReadableFileEncoding;
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
  /** Inventory projection of a NUL-containing diagnostic-only file. */
  | (CustomizationFileBase & {
      /** At least one NUL byte (FR-028); the summary adds only the size. */
      readonly encoding: 'binary';
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    })
  /** Inventory projection of a file that could not be read or classified. */
  | (CustomizationFileBase & {
      /** The read failed before classification (FR-024); nothing to add. */
      readonly encoding: 'unknown';
    });

/** The coarse scan phase shown in live progress (data-model.md § ScanProgress). */
export type ScanProgressPhase =
  /** Admitted but not yet started. */
  | 'waiting'
  /** Publication authority was revoked and work is winding down. */
  | 'cancelling'
  /** The allowlisted traversal program is enumerating candidates. */
  | 'enumerating'
  /** Candidate file bytes are being read. */
  | 'reading'
  /** Derived traversal rules are being expanded. */
  | 'deriving'
  /** Recognizers and parsers are processing readable candidates. */
  | 'recognizing'
  /** The attempt reached its terminal progress state. */
  | 'complete';

/**
 * Live progress of one scan attempt, updated while the scan runs and
 * projected into the owning {@link SourceDto}.
 */
export interface ScanProgressDto {
  /** The admitted request this progress reports; null only in placeholders. */
  readonly scanRequestId: string | null;
  /** Coarse status-display phase in documented pipeline order. */
  readonly phase: ScanProgressPhase;
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
  /** Which documented product or agent surface applies. */
  | 'surface'
  /** Which documented engine version applies. */
  | 'engine-version'
  /** The runtime working-directory input, without treating it as a Source. */
  | 'runtime-cwd'
  /** A documented workspace-root condition. */
  | 'workspace-root'
  /** A documented repository-root condition. */
  | 'repository-root'
  /** A documented project-root condition. */
  | 'project-root'
  /** A documented worked-path condition. */
  | 'worked-path'
  /** Whether a documented target matcher applies. */
  | 'target-match'
  /** Whether a documented scope is available. */
  | 'scope-availability'
  /** A documented feature-state condition. */
  | 'feature-state'
  /** A documented workspace or runtime trust condition. */
  | 'trust'
  /** A documented approval condition. */
  | 'approval'
  /** A documented enablement condition. */
  | 'enablement'
  /** A documented selection condition. */
  | 'selection'
  /** The documented settings inputs relevant to the subject. */
  | 'settings-inputs'
  /** A documented plugin-state condition. */
  | 'plugin-state'
  /** A documented agent-context condition. */
  | 'agent-context'
  /** A documented event condition. */
  | 'event'
  /** Which documented behavior variant applies. */
  | 'documentation-variant'
  /** Whether the relevant tool is available. */
  | 'tool-availability'
  /** A documented installation condition. */
  | 'installation'
  /** A documented managed-policy condition. */
  | 'managed-policy'
  /** A documented instruction-byte-budget condition. */
  | 'instruction-byte-budget'
  /** A documented content-limit condition. */
  | 'content-limits'
  /** A required external runtime input that the Inspector does not infer. */
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
  /** The retained evidence establishes that the condition holds. */
  | 'satisfied'
  /** The retained evidence establishes that the condition does not hold. */
  | 'unsatisfied'
  /** A required input is absent, so no determination is made. */
  | 'unknown'
  /** Retained official assertions about the condition are incompatible. */
  | 'documentation-conflict';

/**
 * Where a condition determination comes from
 * (data-model.md § ApplicabilityAssessment): inspected repository data, an
 * official documented rule, an intentionally excluded input, or a runtime
 * input the Inspector does not read.
 */
export type ConditionFactBasis =
  /** The determination comes from inspected repository data. */
  | 'inspected-data'
  /** The determination comes from a retained official rule. */
  | 'official-rule'
  /** The required input is intentionally outside the Inspector's read boundary. */
  | 'excluded-input'
  /** The required runtime input is not read by the Inspector. */
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
  /** Scope covering the owning Source's single root. */
  | {
      /** The owning Repository or tool-specific Global Source root. */
      readonly kind: 'source-root';
    }
  /** Scope covering one Source-relative directory subtree. */
  | {
      /** One Source-relative directory and its descendants. */
      readonly kind: 'directory-subtree';
      /** The subtree root, relative to the owning admission's Source. */
      readonly path: string;
    }
  /** Scope covering one exact matcher-selected path. */
  | {
      /** The exact admitted path and immutable matcher-selector alternative. */
      readonly kind: 'matching-path';
      /** The admitted Source-relative path. */
      readonly path: string;
      /** Index of the immutable matcher selector that admitted the path. */
      readonly selectorIndex: number;
    }
  /** Scope derived from one authored metadata occurrence. */
  | {
      /** References one DeclaredMetadataEntry without duplicating its value. */
      readonly kind: 'declared';
      /** The closed declared-metadata field the scope comes from. */
      readonly fieldId: string;
      /** Which authored occurrence of that field is referenced. */
      readonly occurrence: number;
    };

/** Which end of a documented path-layer chain takes precedence. */
export type OrderDirection =
  /** Broader path layers precede narrower descendants. */
  | 'broad-to-narrow'
  /** Narrower path layers precede broader ancestors. */
  | 'narrow-to-broad';

/**
 * One component of a documented order (data-model.md § OrderDescriptor).
 * Components are already in documented pipeline order; unknown or
 * conflicting order is represented by a null descriptor plus
 * applicability/documentation facts, never a fabricated rank.
 */
export type OrderComponent =
  /** One documented path-depth ordering component. */
  | {
      /** Documented path-layer order only. */
      readonly kind: 'path-depth';
      /** Which end of the layer chain wins. */
      readonly direction: OrderDirection;
      /** This component's non-negative layer depth. */
      readonly depth: number;
      /** The Source-relative path of this layer. */
      readonly path: string;
    }
  /** One fixed registry-rank ordering component. */
  | {
      /** Fixed documented fallback/precedence rank within one strategy. */
      readonly kind: 'registry-rank';
      /** The strategy that documents the rank. */
      readonly strategyId: string;
      /** The non-negative documented rank. */
      readonly rank: number;
    }
  /** One authored source-occurrence ordering component. */
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

/** Which independent Source family a public Source belongs to. */
export type SourceKind =
  /** The one Source selected from the invocation Repository boundary. */
  | 'repository'
  /** One consent-gated tool-specific Global Source. */
  | 'global';

/** One Source's public projection (spec.md § Key Entities · Source). */
export interface SourceDto {
  /** Opaque stable Source identity; the Repository's survives every commit. */
  readonly sourceId: string;
  /** Which boundary family the Source belongs to. */
  readonly kind: SourceKind;
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
  /** A deterministic lifecycle Diagnostic explains the failed attempt. */
  | {
      /** Selects the Diagnostic-reference variant. */
      readonly kind: 'diagnostic';
      /** Opaque ID of the retained Diagnostic. */
      readonly diagnosticId: string;
    }
  /** The accepted request's ordinary thrown or rejected error explains the failure. */
  | {
      /** Selects the ordinary-error variant. */
      readonly kind: 'error';
      /** The failed accepted request's real error message. */
      readonly message: string;
    };

/** Whether a session snapshot has an unresolved explicit-rescan failure. */
export type SnapshotState =
  /** No explicit-rescan stale overlay remains. */
  | 'current'
  /** At least one fatal explicit-rescan overlay retains a prior commit. */
  | 'stale-after-fatal-rescan';

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
  readonly snapshotState: SnapshotState;
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
 * The inspection-data success envelope
 * (contracts/http-api.md § Common results and errors): every normal
 * inspection-data success carries the Global content epoch and both
 * sequence generations beside its payload, so the client can apply the
 * epoch/generation adoption guards without inspecting the payload. Shared
 * by the host handlers and the browser client so the wire shape has exactly
 * one definition.
 */
export interface InspectionDataResult<Data> {
  /** Current Global content epoch at final publication. */
  readonly globalContentEpoch: number;
  /** The Repository sequence's committed generation. */
  readonly repositoryGeneration: number;
  /** The Global sequence's committed generation; null while disabled. */
  readonly globalGeneration: number | null;
  /** The complete immutable payload bound under the coordinator lock. */
  readonly data: Data;
}

/**
 * A command or preview success that returns no inspection graph
 * (contracts/http-api.md § Common results and errors):
 * `{ globalContentEpoch, data }` without the result-level generation
 * fields, so a control result stays epoch-aware without presenting itself
 * as a generation snapshot.
 */
export interface CommandResult<Data> {
  /** Current Global content epoch at final publication. */
  readonly globalContentEpoch: number;
  /** The command's documented result payload. */
  readonly data: Data;
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

/**
 * Re-exported so API consumers resolve every wire type from one module.
 * `SourceStatus` is declared in `entities.ts` beside its display text, the
 * same split `FileEncoding` already uses: the closed vocabulary lives with
 * the entities, the DTO that carries it lives here.
 */
export type { RejectionCode, SerializedDiagnostic, SourceStatus };
