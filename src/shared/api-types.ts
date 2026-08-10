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
  ReadableFileEncoding,
  SameNameSkillResolution,
  SourceBoundaryDto,
  SourceStatus,
  SupportedTool,
} from './entities';
import type { RejectionCode } from './rejection-codes';

/**
 * One recognition's closed extraction state (data-model.md
 * § ToolRecognition):
 *  - 'not-attempted'  no extractor applies to this recognition's kind
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
 * One authored frontmatter value, as the skill detail surface shows it
 * (data-model.md § Skill presentation). The shape mirrors what the parser
 * resolved, so a mapping is shown as a mapping and a list as a list rather
 * than as a summary of one.
 */
export type FrontmatterValueDto =
  /** A string, number, or boolean the syntax resolved to one value. */
  | {
      /** Selects the scalar variant. */
      readonly kind: 'scalar';
      /**
       * The value the parser resolved under YAML 1.2's core schema: quoting
       * and escapes resolved, `007` read as `7`. It is the Inspector's one
       * documented reading, not a claim about a vendor's own per-field
       * coercions (data-model.md § Field reading). Never masked or shortened;
       * the authored spelling stays in the complete `sourceText`.
       */
      readonly text: string;
    }
  /** An authored null: the key is declared, and declares no value. */
  | {
      /** Selects the absent variant. */
      readonly kind: 'absent';
    }
  /** An ordered list, each item a value of its own. */
  | {
      /** Selects the sequence variant. */
      readonly kind: 'sequence';
      /** The items in authored order; empty for an authored empty list. */
      readonly items: readonly FrontmatterValueDto[];
    }
  /** A nested mapping, each entry a key of its own. */
  | {
      /** Selects the mapping variant. */
      readonly kind: 'mapping';
      /** The entries in authored order; empty for an authored empty mapping. */
      readonly entries: readonly FrontmatterEntryDto[];
    };

/**
 * One authored frontmatter declaration, as the skill detail surface shows it
 * (data-model.md § Skill presentation).
 *
 * The key is the file's own, never a vendor catalog's: this is the reader's
 * frontmatter shown back to them, so a key the product has no opinion about is
 * listed exactly like one it does.
 */
export interface FrontmatterEntryDto {
  /**
   * The declared key as the parser resolved it under YAML 1.2's core schema
   * (data-model.md § Field reading). An unquoted `007` is therefore `7`, the
   * same rule the value on the other side of the colon follows; the authored
   * spelling stays in the complete `sourceText` the detail surface serves
   * beside these.
   */
  readonly key: string;
  /** What the key declares; see {@link FrontmatterValueDto}. */
  readonly value: FrontmatterValueDto;
}

/**
 * One `SKILL.md` behind an inventory entry
 * (contracts/http-api.md § get-session `skills[]`). It names its file by
 * `sourceRelativePath` and repeats nothing else the file publishes for
 * itself — size, read outcome, and file-scoped diagnostics all stay on
 * {@link CustomizationFileSummaryDto}.
 */
export interface SkillDefinitionDto {
  /**
   * The Source-relative Path of the `SKILL.md` this definition is authored
   * in — the file's identity (FR-030), which joins to `files[]` and is the
   * path half of the definition's own detail route,
   * `/skills/<tool>/<source-relative path>`.
   */
  readonly sourceRelativePath: string;
  /**
   * The tool whose recognition this definition is (FR-007). One definition
   * per `(file, tool)` under the entry's name — the same unit as
   * ToolRecognition — so a file two products resolve to one name is two
   * definitions of that entry, and a tool that resolves a different name for
   * the file — Claude Code prefixing a nested skill — defines on that name's
   * entry instead.
   */
  readonly tool: SupportedTool;
  /**
   * This definition's extraction state — the owning recognition's own
   * `parseStatus`, republished here because the definition is that
   * recognition (FR-028). `failed` is what keeps a surface from reading the
   * skill-directory row name as something the file declared: the authored
   * name is unknown, not absent, so a failed definition claims no authored
   * invocation name and evidences no authored-name collision — Claude Code's
   * path-derived clash stands either way (skill-naming.ts
   * `collisionEvidencePaths`).
   */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The invocation name this definition's tool documents for the file:
   * Claude Code's command name is derived from the path — the skill directory,
   * root-relative-prefixed when nested — whatever the frontmatter declares,
   * while Codex and Copilot invoke the authored `name`, with the same skill
   * directory fallback the rows use when the file declares none. Null exactly
   * when the tool invokes the authored name and this definition's extraction
   * failed: that name is unknown, and publishing the directory instead would
   * read a value out of a failed parse (FR-028). The detail shows it beside
   * the row's own name when present (data-model.md § Skill presentation);
   * computed by the projection that keys the rows, so vendor naming cannot
   * drift between server and client.
   */
  readonly invocationName: string | null;
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per
   * kind means one record, which every failed definition of the file names
   * as its own parse fact and the file's `files[]` entry lists once.
   */
  readonly diagnosticIds: readonly string[];
  /**
   * The Source-relative Paths of the files accompanying this `SKILL.md` in its
   * own directory, sorted — the scripts, references, and assets that make a
   * skill more than a paragraph
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   *
   * Read and published, never admitted: each listed path is also a file of this
   * generation (a {@link CustomizationFileSummaryDto} row of `files[]`), and it is how a detail surface
   * offers the customization's own directory. The row shows how many there are
   * and the detail view shows which; the count is `length` rather than a second
   * field, because two states can disagree and one cannot. Empty when the
   * `SKILL.md` sits alone — being a directory is what a skill is, so every
   * recognized skill has been enumerated. The census is the file's, so every
   * definition of one file — across tools and across entries — carries the
   * same list.
   */
  readonly companionFiles: readonly string[];
}

/**
 * One row of the skill inventory (contracts/http-api.md § get-session
 * `skills[]`, data-model.md § Inventory unit): one name as one tool resolves
 * it, and every `SKILL.md` a recognizing tool resolves it for.
 *
 * The name is the unit rather than the file: two files may resolve to one
 * name — by declaring it, or by sitting in same-named directories while
 * declaring none — and one file's recognizing tools may resolve different
 * names — Claude Code prefixes a nested skill's name root-relative — putting
 * the file on each name's row with the tools that resolve it there (FR-007).
 */
export interface SkillInventoryEntryDto {
  /**
   * The name one tool resolves (FR-007): the authored frontmatter `name` — or
   * the skill directory name when the file declares none or declares it
   * empty — which a nested Claude Code recognition prefixes with the
   * root-relative `/`-joined path of the directory holding its `.claude` and
   * a `:` — `apps/web:deploy`. Never null or empty: being a named directory
   * is what a skill is, so every row has a name to be listed under.
   */
  readonly name: string;
  /**
   * The recognitions resolving this name, one definition per `(file, tool)`,
   * in Source-relative Path order and the contracted tool order within one
   * file.
   */
  readonly definitions: readonly SkillDefinitionDto[];
  /**
   * How each tool facing a collision on this name resolves it, sorted by tool.
   * A tool contributes a statement only when it recognizes two or more of these
   * definitions — one definition is not a collision, and a tool that recognizes
   * only one of several has nothing to choose between — and only when the
   * collision is one its quoted rule answers. Claude Code's rule answers the
   * clash of unqualified commands, which come from skill directories, and
   * nested prefixing separates same-name rows, so its statement instead
   * attaches to every entry holding a Claude definition whose skill directory
   * name is shared with another Claude-recognized skill of the same
   * generation (FR-007).
   *
   * A row publishes this instead of ordering its definitions: the three
   * shipped products' statements differ — Copilot's is that no single rule is
   * documented across its surfaces — and none is completely documented, so an
   * order would be a winner the Inspector has not recorded (FR-007).
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
 * What the one scan-time parse resolved out of a skill entry point, as its
 * detail surface shows it (data-model.md § Skill presentation): every
 * declaration by the key the file wrote, and the instructions the frontmatter
 * block was removed from. Published rather than re-parsed in the browser,
 * because the inventory row's name comes from the same parse — a second
 * parser would be a second opinion that could disagree with it (FR-007).
 */
export interface SkillPresentationDto {
  /**
   * Every key the `SKILL.md` frontmatter declares, in authored order — the
   * file's own declarations, shown as declarations rather than buried in the
   * source (FR-007). Empty when the file declares no frontmatter.
   */
  readonly frontmatter: readonly FrontmatterEntryDto[];
  /**
   * The `SKILL.md` with its frontmatter block removed: the instructions the
   * product would read. Separated from the declarations above because they
   * answer different questions, and the split is the parser's own — see
   * `parsers/markdown.ts`.
   */
  readonly bodyText: string;
}

/** Fields both detail variants carry; see {@link FileDetailDto}. */
interface FileDetailBase {
  /** The committed file, including its complete authored source when readable. */
  readonly file: CustomizationFileDto;
  /** The file-scoped Diagnostic records the file's own `diagnosticIds` name (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/**
 * Detail of a skill entry point: the file plus what the one scan-time parse
 * resolved (contracts/http-api.md § get-file-detail). The parse is a fact of
 * the file, not of a recognizing tool — every vendor reads the same fixed
 * YAML semantics — so it is published once; which tools recognize the file,
 * and each tool's invocation name, are the inventory's facts
 * (`skills[].definitions[]`), and the route's tool segment says which
 * definition a page is about.
 */
export interface SkillFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized skill entry point. */
  readonly kind: 'skill';
  /**
   * The parsed declarations and instructions, or null exactly when extraction
   * failed all-or-nothing (FR-028): nothing was parsed, the failure's
   * Diagnostic is in `diagnostics`, and the complete source stays readable.
   */
  readonly presentation: SkillPresentationDto | null;
}

/**
 * Detail of a file no recognition owns: a census-listed companion, or a
 * diagnostic-only candidate whose bytes never parsed. At this level nothing
 * says the file is Markdown, so no parsed structure exists to publish — what
 * there is to show is the file itself: its complete source when its read
 * yielded text, its read outcome alone otherwise (FR-025).
 */
export interface UnrecognizedFileDetailDto extends FileDetailBase {
  /** Discriminant: no recognition is attached to the file. */
  readonly kind: 'file';
}

/**
 * One file's complete detail result
 * (contracts/http-api.md § get-file-detail), discriminated by whether a
 * recognition owns the file. It is the one result that carries authored
 * content, which is why FR-027 keeps it behind an explicit request for one
 * file: no inventory or session response may carry it.
 *
 * There is deliberately no `relationships` array yet. A relationship may be
 * emitted only when its kind is listed for the recognized kind *and* its origin
 * is covered by a relationship-only rule in the central registry
 * (contracts/runtime-composition.md § Normative relationship-only registry);
 * no shipped recognition can produce an edge, so the array would be empty in
 * every response this release returns. There is no per-tool recognition list
 * either: the parse the detail shows is the file's, and the recognizing tools
 * with their invocation names are published by the inventory the page already
 * holds. A skill's resources are published as
 * `SkillDefinitionDto.companionFiles`, which the census enumerates and never
 * admits; the vendor rule modules say why they get no rule of their own.
 */
export type FileDetailDto = SkillFileDetailDto | UnrecognizedFileDetailDto;

/** Fields every discovered file carries regardless of its read outcome. */
interface CustomizationFileBase {
  /** The Source this file was discovered in. */
  readonly sourceId: string;
  /**
   * The exact raw entry names joined with `/`, relative to the owning Source's
   * single root (FR-024). With `sourceId` it is the file's identity — stable
   * across generations, so no per-generation file ID exists (FR-030).
   */
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
   * per-kind inventories, which refer to it by `sourceRelativePath`.
   * `sourceText` is served only by the detail routes, one file at a time
   * (FR-027).
   */
  readonly files: readonly CustomizationFileSummaryDto[];
  /**
   * The skill inventory: one entry per name as one tool resolves it
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
  /** Session-lifecycle diagnostics — out-of-generation records; each is still
   * file- or source-scoped (data-model.md § Diagnostic). */
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
