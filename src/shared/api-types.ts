// Public session API DTO contracts shared by the host and the client
// (contracts/http-api.md, data-model.md). Type declarations only — this
// module deliberately ships zero runtime code (the `-types` name records
// that): every type here is a closed, JSON-serializable wire shape,
// and internal authority state (raw or canonical roots, coordinator locks,
// lifecycle owner keys) is absent by construction rather than filtered or
// re-verified at serialization time (FR-002, T028). Platform-neutral by
// design — no node: imports — so the client build can import it.
import type { SerializedDiagnostic } from './diagnostics';
import type {
  CustomizationKind,
  EvidenceAssessment,
  ReadableFileEncoding,
  SameNameSkillResolution,
  SourceBoundaryDto,
  SourceStatus,
  SupportedTool,
} from './entities';
import type { MetadataFieldId, RuleId } from './registries/identifier-types';
import type { RuleDiscoveryClass } from './registries/rule-types';
import type { RejectionCode } from './rejection-codes';

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
 * One rule/path admission behind a recognition
 * (data-model.md § ToolRecognition `provenances`). Admissions are retained
 * separately rather than collapsed into a recognition-level winner, because
 * scope, order, applicability, and evidence differ per admission even when
 * two rules admit the same physical file.
 *
 * The six fields here are the response shape the detail contract promises
 * (contracts/http-api.md § FileDetail), which also records why the fields of
 * later phases — relationships, derivation seeds, ordering, declaration keys,
 * and reference lists — are absent rather than empty.
 */
export interface CandidateProvenanceDto {
  /**
   * The inspection rule that admitted the candidate, from the closed catalog
   * rather than an arbitrary string: the rule is never rendered as its ID, and
   * a `Record<RuleId, string>` is what stops a newly catalogued rule from
   * reaching a screen without a sentence to show (`registries/identifier-text.ts`).
   */
  readonly ruleId: RuleId;
  /** How that rule creates candidates; see {@link RuleDiscoveryClass}. */
  readonly discoveryClass: RuleDiscoveryClass;
  /** The admitted Source-relative Path, spelled with the exact entry names. */
  readonly matchedPath: string;
  /** Where the admitted customization applies; see {@link ScopeDescriptor}. */
  readonly scope: ScopeDescriptor;
  /**
   * Exactly one assessment for the admitting rule and for every behavior and
   * strategy it references, sorted and never reduced to a scalar (QR-005).
   */
  readonly evidenceAssessments: readonly EvidenceAssessment[];
  /** What is known about whether the product applies this admission (FR-009). */
  readonly applicability: ApplicabilityAssessmentDto;
}

/**
 * The convenience projection of an {@link ApplicabilityAssessmentDto}
 * (data-model.md § ApplicabilityAssessment). It is deliberately never called
 * `effective`: each member states what the retained documentation proves, and
 * none of them claims the product loaded anything.
 */
export type ApplicabilitySummary =
  /** A documented control is known to prohibit use. */
  | 'disabled'
  /** A complete precedence chain proves another candidate wins. */
  | 'shadowed'
  /** A complete surface/target/selection/budget rule proves exclusion. */
  | 'omitted'
  /** A documented selection rule proves inclusion and nothing can prevent it. */
  | 'selected'
  /** Documentation is absent or conflicting for a required rule. */
  | 'unknown'
  /** A documented path exists but a required runtime input is unknown. */
  | 'conditional'
  /** Every documented availability requirement is satisfied; no selection is claimed. */
  | 'available'
  /** Only the accepted authored declaration is proven. */
  | 'authored';

/**
 * What is known about whether a product applies one admission or edge
 * (data-model.md § ApplicabilityAssessment). Every field is projected from the
 * retained conditions through the shipped decision table; an emitter never
 * chooses {@link summary} directly, and there is no aggregate that collapses
 * the conditions away.
 *
 * There is deliberately no `evaluatedFromGeneration` field. It would state the
 * generation the assessment was computed from, which is the generation the
 * response carrying it was bound under — already on the envelope as
 * {@link InspectionDataResult.repositoryGeneration}, and already what the
 * client's request token captures. A per-assessment copy could only repeat it,
 * and two copies of one number can disagree.
 *
 * There is deliberately no `strategyRefs` field either, for the same reason at
 * the other end: it would name the strategies behind the admission, and the
 * provenance carrying this assessment already publishes one
 * {@link EvidenceAssessment} per strategy — with each one's documentation
 * status, which a bare list of IDs cannot carry.
 */
export interface ApplicabilityAssessmentDto {
  /** The projected convenience summary; see {@link ApplicabilitySummary}. */
  readonly summary: ApplicabilitySummary;
  /** The retained closed condition records, sorted and deduplicated. */
  readonly conditions: readonly ConditionFact[];
}

/**
 * One allowlisted field a recognition's extractor read
 * (data-model.md § DeclaredMetadataEntry).
 *
 * One entry per field, not per authored occurrence: a key declared twice
 * resolves to one value for the product reading the file, and that resolution
 * is what this reports.
 */
export interface DeclaredMetadataEntryDto {
  /** The allowlisted field this value belongs to; never an authored key. */
  readonly fieldId: MetadataFieldId;
  /**
   * The value the parser resolved, as the text a product loading this file
   * would have: quoting and escapes resolved, `007` read as `7`. Never masked
   * or redacted — the host resolves no environment reference and offers no
   * reveal step, so a `$VARIABLE` in the value stays the characters that were
   * written. The complete authored bytes are served by the same detail
   * response's `sourceText` (FR-027).
   */
  readonly value: string;
}

/**
 * The per-kind payload of a recognition: the kind itself plus whatever
 * identifies a recognition of that kind (data-model.md § ToolRecognition).
 *
 * It is one field rather than fields spread across the record because what
 * identifies a recognition differs by kind and does not fit a shared optional:
 * a skill declares a single `name`, while an MCP carrier declares one per
 * server. Keeping it in a single union also means a summary is a copy of the
 * record's payload rather than a per-kind reconstruction of it — no projection
 * has to branch just to move a value across.
 *
 * The kind lives here rather than beside this field so there is one discriminant
 * and no second copy that could disagree with it.
 */
export type RecognitionDetails =
  /** A skill, identified by the name authored in its own file. */
  | {
      /** The recognized customization kind. */
      readonly kind: 'skill';
      /**
       * The skill's own declared name as its parser resolved it, or absent when
       * the recognizer extracted none (FR-007). Resolved, not sliced: an
       * authored `name: 007` is the string `7`, because that is the name the
       * product loading this file has.
       *
       * This is the one authored value an inventory row carries (FR-027). It
       * is presentation identity rather than content: it is the identifier
       * the vendor's own selectors and menus use, it is not recoverable from
       * the Source-relative Path — a skill's `name` need not match its
       * directory — and a list that cannot name what it lists is not an
       * inventory.
       *
       * Absent, never empty: an authored empty string is a different fact from
       * no name at all, and collapsing them would report one as the other.
       */
      readonly declaredName?: string;
      /**
       * The Source-relative Paths of the files accompanying the `SKILL.md` in
       * its own directory, sorted — the scripts, references, and assets that
       * make a skill more than a paragraph
       * (contracts/inspection-path-allowlist.md § Bounded companion census).
       *
       * Read and published, never admitted: each listed path is also a file of
       * this generation, because a directory-shaped customization is read whole
       * and a tool that showed the entry point while withholding what ships
       * with it would not be showing the customization. What listing does not
       * do is make a file a candidate — it acquires no rule, recognition, kind,
       * or inventory row of its own, and it is still not evidence that the
       * vendor loads it. The inventory row shows how many there are and the
       * detail view shows which; the count is `length` rather than a second
       * field, because two states can disagree and one cannot.
       *
       * Always present, empty when the `SKILL.md` sits alone: being a directory
       * is what a skill is, so every recognized skill has been enumerated and
       * there is no "nobody looked" state to distinguish.
       */
      readonly companionFiles: readonly string[];
    }
  /** Every other kind, until its recognizer phase gives it its own identity. */
  | {
      /** The recognized customization kind. */
      readonly kind: Exclude<CustomizationKind, 'skill'>;
    };

/**
 * One `SKILL.md` behind an inventory entry
 * (contracts/http-api.md § get-session `skills[]`). It names its file by
 * `fileId` and repeats nothing the file publishes for itself — path, size, read
 * outcome, and file-scoped diagnostics all stay on {@link
 * CustomizationFileSummaryDto}.
 */
export interface SkillDefinitionDto {
  /** The `SKILL.md` this definition is authored in; joins to `files[]`. */
  readonly fileId: string;
  /**
   * The tools that recognized this file as a skill, in the contracted tool
   * order. Several products read one location — `.agents/skills/<name>/` is
   * both a Codex and a Copilot skill location — so one file may be several.
   */
  readonly tools: readonly SupportedTool[];
  /**
   * The Source-relative Paths of the files accompanying this `SKILL.md` in its
   * own directory, sorted — the scripts, references, and assets that make a
   * skill more than a paragraph
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   *
   * Read and published, never admitted: each listed path is also a file of this
   * generation (see {@link RecognitionDetails}), and it is how a detail surface
   * offers the customization's own directory. The row shows how many there are
   * and the detail view shows which; the count is `length` rather than a second
   * field, because two states can disagree and one cannot. Empty when the
   * `SKILL.md` sits alone — being a directory is what a skill is, so every
   * recognized skill has been enumerated.
   */
  readonly companionFiles: readonly string[];
}

/**
 * One row of the skill inventory (contracts/http-api.md § get-session
 * `skills[]`, data-model.md § Inventory unit): one declared name and every
 * `SKILL.md` that declares it.
 *
 * The name is the unit rather than the file because that is what the vendors'
 * own selectors use, and it need not match the directory holding the file. A
 * file-shaped row could not express it: two files may declare one name.
 */
export interface SkillInventoryEntryDto {
  /**
   * The declared name, or null for the definitions that declare none. Null is
   * its own entry rather than a member of any named one: a file that declares
   * no name has not joined a name, and folding it in would report a name it
   * does not have.
   */
  readonly declaredName: string | null;
  /** The `SKILL.md` files declaring this name, in Source-relative Path order. */
  readonly definitions: readonly SkillDefinitionDto[];
  /**
   * How each recognizing tool resolves this name, sorted by tool. Empty for a
   * single definition, because there is nothing to resolve.
   *
   * A grouped row publishes this instead of ordering its definitions: the
   * shipped statements differ per tool and two of the three are incomplete, so
   * an order would be a winner the Inspector has not recorded (FR-007).
   */
  readonly sameNameResolutions: readonly SameNameSkillResolutionDto[];
}

/** One tool's same-name resolution on a {@link SkillInventoryEntryDto}. */
export interface SameNameSkillResolutionDto {
  /** The tool the statement belongs to. */
  readonly tool: SupportedTool;
  /** What that tool documents; see {@link SameNameSkillResolution}. */
  readonly resolution: SameNameSkillResolution;
}

/**
 * One recognition entity: what one rule recognized in one file, carrying the
 * kind-discriminated {@link RecognitionDetails} that identify it. Each kind's
 * inventory row is projected from these, so a row copies the payload rather
 * than reconstructing it per kind.
 */
export interface ToolRecognitionDto {
  /** Opaque identity, unique within the owning generation. */
  readonly recognitionId: string;
  /** The file this recognition is attached to. */
  readonly fileId: string;
  /** The recognizing tool. */
  readonly tool: SupportedTool;
  /** The kind and its per-kind identity; see {@link RecognitionDetails}. */
  readonly details: RecognitionDetails;
  /** Closed extraction state; see {@link RecognitionParseStatus}. */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The allowlisted fields this recognition's extractor read, one entry per
   * field in the allowlist row's order. Empty for `not-attempted` and for
   * `failed`, which is all-or-nothing: a failed recognition publishes no
   * metadata at all while its file's complete source stays displayed (FR-028).
   */
  readonly declaredMetadata: readonly DeclaredMetadataEntryDto[];
  /** Sorted non-empty rule/path admissions behind this recognition. */
  readonly provenances: readonly CandidateProvenanceDto[];
  /** Recognition-scoped extraction-failure diagnostics (FR-028). */
  readonly diagnosticIds: readonly string[];
}

/**
 * One file's complete detail result
 * (contracts/http-api.md § get-file-detail): the committed file with its
 * complete authored source, the recognitions attached to it, and the
 * diagnostics that explain them. It is the one result that carries authored
 * content, which is why FR-027 keeps it behind an explicit request for one
 * file: no inventory or session response may carry it.
 *
 * There is deliberately no `relationships` array yet. A relationship may be
 * emitted only when its kind is listed for the recognized kind *and* its origin
 * is covered by a relationship-only rule in the central registry
 * (contracts/vendors/openai-codex.md § Normative initial-release presentation
 * allowlist). The Codex `skill` row does list two eligible kinds, but no
 * relationship-only rule ships — `registries/codex/rules.ts` says why a skill's
 * resources get no rule of their own — so no shipped recognition can produce an
 * edge, and the array would be empty in every response this release returns. A skill's resources are
 * published as `RecognitionDetails.companionFiles`, which the census
 * enumerates and never admits.
 */
export interface FileDetailDto {
  /** The committed file, including its complete authored source when readable. */
  readonly file: CustomizationFileDto;
  /** Every recognition attached to the file, in the contracted tool/kind order. */
  readonly recognitions: readonly ToolRecognitionDto[];
  /** The file-scoped and recognition-scoped Diagnostic records (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/** Fields every discovered file carries regardless of its read outcome. */
interface CustomizationFileBase {
  /** Opaque file identity, regenerated on every commit of the owning sequence. */
  readonly fileId: string;
  /** The Source this file was discovered in. */
  readonly sourceId: string;
  /** The exact raw entry names joined with `/`, relative to the owning Source's single root (FR-024). */
  readonly sourceRelativePath: string;
  /** File-scoped diagnostics for this file (FR-028); present on every variant. */
  readonly diagnosticIds: readonly string[];
}

/**
 * One discovered customization file as committed into a generation
 * snapshot — the transport shape of spec.md § Key Entities · Customization
 * File, discriminated by `encoding` so an impossible combination is
 * unrepresentable. The read state is derived from the discriminator:
 * readable text (`utf-8` | `utf-8-replaced`), textless `binary`,
 * and `unknown` for a read that failed before the bytes could be
 * classified (FR-024/FR-028).
 */
export type CustomizationFileDto =
  /** A readable file with complete authored source. */
  | (CustomizationFileBase & {
      /** Readable decode classification; BOM presence is recorded separately. */
      readonly encoding: ReadableFileEncoding;
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text as authored; readable text always has it. */
      readonly sourceText: string;
      /** Exact byte count of the one completed read. */
      readonly sizeBytes: number;
    })
  /** A NUL-containing file with no source text; see FR-025 for when it also carries a Diagnostic. */
  | (CustomizationFileBase & {
      /** At least one NUL byte: nothing to parse, and no BOM concept — the
       * NUL check precedes BOM handling (FR-028). */
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
 * content is served only through the detail routes, one file at a time
 * (FR-027), so the snapshot must not carry it.
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
    })
  /** Inventory projection of a NUL-containing file with no source text. */
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
  /**
   * The admitted request this progress reports, equal to `Source.scanRequestId`
   * for any waiting, active, or finished source scan. Null for barrier-owned
   * disable progress, which belongs to a Global operation rather than to one
   * scanned Source (data-model.md § ScanProgress).
   */
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
  /**
   * Sorted non-empty keys of the official-sources contract rows behind the
   * fact (contracts/official-sources.md); never grants a read. Evidence lives
   * on the registry records themselves, so these name the cited rows rather
   * than entries in a registry of their own.
   */
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
      /**
       * Which authored occurrence of that field in the source is referenced.
       * Not an index into `declaredMetadata`, which publishes one entry per
       * field: a key declared twice resolves to the one value a product
       * loading the file has, and this names which declaration the scope was
       * taken from.
       */
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
      /**
       * Which authored occurrence of that field in the source is referenced;
       * see the identically named field of {@link ScopeDescriptor}'s `declared`
       * variant. Ordering is what makes it a component: the entry list holds
       * one resolved value per field and states no order among declarations.
       */
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
  /**
   * The latest admitted scan request for this Source. Null before any
   * admission, and again once every admitted attempt has had its publication
   * authority revoked: a revoked attempt's overlay reverts to the exact
   * pre-admission state, so the Source states no request rather than one whose
   * result was discarded (data-model.md § Source).
   */
  readonly scanRequestId: string | null;
  /**
   * This Source's scan progress, which outlives the scan: the completed
   * counters and the `complete` phase stay so a Ready or Partial Source can
   * state what its committed attempt did. Null while the Source is `idle` or
   * `failed` — a Source that has never been scanned, and one whose attempt
   * failed, both state no progress (data-model.md § Source `progress`).
   */
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
   * Every discovered file of both sequences' current generations, with its own
   * facts only — path, read outcome, size, diagnostics (contracts/http-api.md
   * § get-session `files[]`). What a file was recognized as belongs to the
   * per-kind inventories, which refer to it by `fileId`. `sourceText` is served
   * only by the detail routes, one file at a time (FR-027).
   */
  readonly files: readonly CustomizationFileSummaryDto[];
  /**
   * The skill inventory: one entry per declared name
   * (data-model.md § Inventory unit). A row's unit is decided by the kind, not
   * by the file, so each kind publishes its own inventory as its recognizer
   * phase ships rather than widening one shared row shape.
   */
  readonly skills: readonly SkillInventoryEntryDto[];
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
