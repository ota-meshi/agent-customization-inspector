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
import type { VendorSurface } from './registries/behavior-types';
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
 * One declared value as a detail surface shows it — a frontmatter value of a
 * skill or an instruction file, or a field value of an MCP server declaration
 * (data-model.md § Skill presentation). One shape for every producing format,
 * because each parser resolves into the same structure: the shape mirrors
 * what the parser resolved, so a mapping is shown as a mapping and a list as
 * a list rather than as a summary of one.
 */
export type DeclaredValueDto =
  /** A string, number, or boolean the syntax resolved to one value. */
  | {
      /** Selects the scalar variant. */
      readonly kind: 'scalar';
      /**
       * The parsed type of the resolved value ({@link DeclaredScalarKind}):
       * what lets a surface spelling the value back — the serialized YAML
       * and JSON documents above all — spell it as what it was, an authored
       * `'7'` string keeping its quotes while a numeric `7` stays bare,
       * without re-parsing the rendering to guess (data-model.md § Field
       * reading).
       */
      readonly scalarKind: DeclaredScalarKind;
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
      readonly items: readonly DeclaredValueDto[];
    }
  /** A nested mapping, each entry a key of its own. */
  | {
      /** Selects the mapping variant. */
      readonly kind: 'mapping';
      /** The entries in authored order; empty for an authored empty mapping. */
      readonly entries: readonly DeclaredEntryDto[];
    };

/**
 * The parsed type of a resolved scalar value under the producing format's
 * own schema (data-model.md § Field reading), published beside its rendered
 * text: the text alone cannot say whether `7` was a number or a quoted
 * string, and a serialization that guessed by re-parsing the rendering
 * would misspell the authored string as the number it happens to render
 * like. A scalar with no primitive type of its own — a TOML datetime — is
 * published as `string`, because its ISO rendering is its spelling.
 */
export type DeclaredScalarKind =
  /** A string value, quoted or plain. */
  | 'string'
  /** A value the format's schema resolves to a number; a TOML 64-bit integer included. */
  | 'number'
  /** A value the format's schema resolves to a boolean. */
  | 'boolean';

/**
 * The parsed type of a declared key under the producing format's own schema
 * (data-model.md § Field reading). YAML's core schema is what makes it a
 * question at all: an unquoted `1` is a number and `"1"` a string, both
 * rendering as `1`, so a surface matching declarations across files needs the
 * parser's identity beside the spelling (FR-011). TOML keys are always
 * strings, so every entry a TOML declaration produces carries `'string'`.
 */
export type DeclaredKeyKind =
  /** A string key, quoted or plain. */
  | 'string'
  /** A key the core schema resolves to a number. */
  | 'number'
  /** A key the core schema resolves to a boolean. */
  | 'boolean'
  /** A key resolving to null: `~`, `null`, or an empty key. */
  | 'null';

/**
 * One parsed declaration entry, as the detail surfaces show it — a
 * frontmatter entry of a skill or an instruction file, or a field of an MCP
 * server declaration (data-model.md § Skill presentation): the key and value
 * carry what the parser resolved, while a file's authored spelling stays in
 * the complete `sourceText` where one is served.
 *
 * The key is the file's own, never a vendor catalog's: this is the reader's
 * declaration shown back to them, so a key the product has no opinion about is
 * listed exactly like one it does.
 */
export interface DeclaredEntryDto {
  /**
   * The declared key as the parser resolved it under the producing format's
   * own schema (data-model.md § Field reading). YAML's unquoted `007` is
   * therefore `7`, the same rule the value on the other side of the colon
   * follows; a file's authored spelling stays in the complete `sourceText`
   * where the detail serves one.
   */
  readonly key: string;
  /**
   * The parsed type of the declared key ({@link DeclaredKeyKind}): what
   * tells apart the two keys one spelling can stand for, since `key` renders
   * YAML's numeric `1` and string `"1"` identically.
   */
  readonly keyKind: DeclaredKeyKind;
  /** What the key declares; see {@link DeclaredValueDto}. */
  readonly value: DeclaredValueDto;
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

/**
 * One row of the instructions inventory (contracts/http-api.md § get-session,
 * data-model.md § Inventory unit): one applicability range and the files that
 * govern it. A file is identified by its Source-relative Path and grouped by
 * the range it governs — path-derived for most files, which is why the root
 * `AGENTS.md` and `CLAUDE.md` share one row, and declared by the file itself
 * where its product reads one. The file's own read outcome, size, and
 * diagnostics stay on its `files[]` entry.
 */
export interface InstructionInventoryEntryDto {
  /**
   * The glob the row's files govern, relative to the Repository root — `**`
   * at the root, or the range a file declares for itself (Copilot's
   * `applyTo`) — and the row's identity. Rows are grouped by exact text
   * equality of this value: nothing parses it, normalizes its spelling, or
   * decides whether two ranges overlap.
   *
   * Null for the one row of files whose range is not known: a file whose
   * product reads this filename's range from its declaration alone, and whose
   * declarations supply none a row can be keyed by — or could not be read at
   * all (FR-028). Sorted after every ranged row.
   */
  readonly applicabilityRange: string | null;
  /**
   * The files this range governs, in Source-relative Path order. Non-empty: a
   * range exists because a file derived it.
   */
  readonly files: readonly InstructionInventoryFileDto[];
}

/** One instruction file listed under the range it governs. */
export interface InstructionInventoryFileDto {
  /**
   * The Source-relative Path of the instruction file — the file's identity
   * (FR-030), which joins to `files[]`.
   */
  readonly sourceRelativePath: string;
  /**
   * What recognized this file as instructions — one entry per recognizing
   * tool, in the closed tool order (FR-004). Non-empty: a file nothing
   * recognizes is listed under no range.
   */
  readonly recognitions: readonly InstructionRecognitionDto[];
}

/**
 * One tool's recognition of an instruction file, on the row that lists it.
 *
 * The tool alone cannot say where the file is read from: GitHub Copilot's
 * editor, CLI, and cloud surfaces document different lookup bases for the same
 * filenames, so a `.github/copilot-instructions.md` at the root is read by all
 * three while one in a subdirectory is a CLI context alone
 * (contracts/vendors/github-copilot.md § Surface boundary). The surfaces are
 * therefore published beside the tool rather than left to a reader to infer
 * from the path.
 */
export interface InstructionRecognitionDto {
  /** The tool that recognized the file. */
  readonly tool: SupportedTool;
  /**
   * That tool's surfaces whose documented behavior the admitting rules rest
   * on, deduplicated and in the closed surface order. Non-empty: every rule is
   * based on at least one behavior statement, and a statement names at least
   * one surface.
   *
   * Never a claim that a surface loaded the file: an admission is not an
   * activation (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
}

/**
 * One row of the MCP inventory (contracts/http-api.md § get-session `mcp[]`,
 * data-model.md § Inventory unit): one declared server name, listing every
 * declaration that resolves it — one per `(carrier, tool)`, the same grouping
 * a skill row gives its definitions — so a second carrier declaring the same
 * name joins the name's row rather than starting another.
 *
 * The declared values — commands, URLs, headers, environment — are not here:
 * a declaration's content is served by its carrier's detail, one file at a
 * time (FR-027), and the carrier's own read outcome, size, and file
 * diagnostics stay on its `files[]` entry.
 */
export interface McpInventoryEntryDto {
  /**
   * The declared server name this row is — the `[mcp_servers.*]`-style key,
   * exactly as the carrier wrote it (FR-007). Null for the one row that
   * closes the list with the carriers currently publishing no named
   * declaration: a carrier whose declaration block could not be read, whose
   * rows are unknown rather than absent, or one that declares none — which
   * each declaration's own `parseStatus` tells apart (FR-028).
   */
  readonly name: string | null;
  /**
   * The declarations resolving this name, in carrier-path then closed tool
   * order — or, on the null row, the carriers publishing no named
   * declaration, one entry per `(carrier, tool)` either way. Non-empty: a
   * name exists because a declaration resolved it, and the null row exists
   * only while a carrier belongs on it.
   */
  readonly declarations: readonly McpDeclarationDto[];
}

/**
 * One declaration listed under the server name it resolves — or, on the null
 * row, one carrier publishing no named declaration (contracts/http-api.md
 * § get-session `mcp[]`).
 */
export interface McpDeclarationDto {
  /**
   * The Source-relative Path of the carrier this declaration is authored
   * in — the file's identity (FR-030), which joins to `files[]` and is the
   * path half of the declaration's own detail route,
   * `/mcp/<source-relative path>?server=<name>`.
   */
  readonly sourceRelativePath: string;
  /** The tool whose recognition this declaration is (FR-007). */
  readonly tool: SupportedTool;
  /**
   * The vendor surfaces the declaring recognition rests on — the union over
   * its admissions, exactly as an instruction file's recognitions publish
   * them (contracts/http-api.md § get-session). Naming a surface never claims
   * that surface loaded the file (FR-009); it says which documented lookup
   * the admission rests on — the CLI context for a Copilot workspace carrier,
   * Claude's shared client surface for its project file.
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * The owning carrier recognition's extraction state, republished here
   * because the declaration is that recognition's (FR-028). Always `parsed`
   * under a named row — a failed carrier publishes no name — and on the null
   * row it is what tells "the rows are unknown" (`failed`) apart from "the
   * carrier declares none" (`parsed`).
   */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per
   * kind means one record, which the carrier's `files[]` entry lists once and
   * each of its declarations republishes as its own parse fact.
   */
  readonly diagnosticIds: readonly string[];
}

/** One tool's same-name resolution on a {@link SkillInventoryEntryDto}. */
export interface SameNameSkillResolutionDto {
  /** The tool the statement belongs to. */
  readonly tool: SupportedTool;
  /** What that tool documents; see {@link SameNameSkillResolution}. */
  readonly resolution: SameNameSkillResolution;
}

/**
 * What the one scan-time parse resolved out of a frontmatter-led Markdown
 * customization file — a skill entry point or an instruction file — as its
 * detail surface shows it (data-model.md § Skill presentation): every
 * declaration by the key the file wrote, and the instructions the frontmatter
 * block was removed from. Published rather than re-parsed in the browser,
 * because the inventory row's name comes from the same parse — a second
 * parser would be a second opinion that could disagree with it (FR-007).
 */
export interface MarkdownPresentationDto {
  /**
   * Every key the file's frontmatter declares, in authored order — the
   * file's own declarations, shown as declarations rather than buried in the
   * source (FR-007). Empty when the file declares no frontmatter.
   */
  readonly frontmatter: readonly DeclaredEntryDto[];
  /**
   * The file with its frontmatter block removed: the instructions the
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
  readonly presentation: MarkdownPresentationDto | null;
}

/**
 * Detail of a recognized instruction file: the file plus what the one
 * scan-time parse resolved (contracts/http-api.md § get-file-detail). A
 * detail is addressed by the file even though the inventory groups rows by
 * applicability range (data-model.md § Inventory unit), and no per-tool
 * identity exists here: which tools recognize the file is the instructions
 * inventory's fact, and the parse — the same fixed YAML semantics every
 * vendor reads — is published once as the file's.
 */
export interface InstructionFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized instruction file. */
  readonly kind: 'instructions';
  /**
   * The parsed declarations and instructions, or null exactly when extraction
   * failed all-or-nothing (FR-028), the same rule the skill variant follows:
   * nothing was parsed, the failure's Diagnostic is in `diagnostics`, and the
   * complete source stays readable.
   */
  readonly presentation: MarkdownPresentationDto | null;
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
 * One server declaration of an MCP carrier,
 * as its detail shows it (contracts/http-api.md
 * § get-mcp-carrier-detail, data-model.md
 * § Inventory unit): the declared name — the key its inventory row is named
 * by — and every field the declaration writes, by the keys the file wrote
 * and in the parser's resolved order (FR-007). The same shape the recognition
 * extracts, so the wire carries what the one scan-time parse resolved rather
 * than a second reading.
 */
export interface McpServerDeclarationDto {
  /** The server name exactly as the carrier's key declares it (FR-007). */
  readonly name: string;
  /**
   * Every field the declaration writes — commands, arguments, URLs, headers,
   * environment values — each as the parser resolved it, in the shared
   * declaration-entry shape the detail surfaces render. The values are the
   * carrier's own literals: an environment reference stays the characters
   * that were written, never a process value (FR-026). TOML and JSON keys are
   * always strings, so a carrier's entries all have `keyKind: 'string'`; the
   * field stays the shared entry shape's, exactly as
   * `presentation.frontmatter` publishes it.
   */
  readonly fields: readonly DeclaredEntryDto[];
}

/**
 * The result of `get-mcp-carrier-detail`: one MCP carrier's detail
 * (contracts/http-api.md § get-mcp-carrier-detail) — the file's own facts and
 * the declarations it makes, and deliberately no `sourceText` field at all:
 * a file admitted so its declarations can be published
 * shows those declarations and never its own bytes (FR-007), which is why
 * this is its own function's result rather than a {@link FileDetailDto}
 * variant. Only the explicit carriers resolve here: a file of any other kind that spells MCP-looking
 * configuration shows it as that kind's own detail content instead.
 */
export interface McpCarrierDetailDto {
  /**
   * The committed carrier's own facts — path, read outcome, size,
   * diagnostics — without its source text (FR-007).
   */
  readonly file: CustomizationFileSummaryDto;
  /**
   * The declarations the carrier makes, one per server in the parser's
   * resolved order — empty when it declares none — or null exactly when
   * extraction failed all-or-nothing (FR-028): nothing was parsed, the rows
   * are unknown rather than absent, and the failure's Diagnostic is in
   * `diagnostics`.
   */
  readonly servers: readonly McpServerDeclarationDto[] | null;
  /** The file-scoped Diagnostic records the file's own `diagnosticIds` name (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
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
 * every response this release returns.
 *
 * An instruction file never will, whichever product recognizes it. This
 * product does not read references out of prose: no vendor page fixes where an
 * authored `@path`-shaped token ends, so every boundary rule would be this
 * product's own invention and a wrong one asserts a reference the reader never
 * wrote. Such a token is source text like any other, and the registry
 * accordingly carries no relationship-only rule an instruction origin could be
 * covered by, so the second gate is closed as well (tasks.md T217, T238). The
 * edges that do arrive with later phases come from declarations a format
 * delimits — a frontmatter value, a JSON or TOML field, a map key — where the
 * boundary is the format's rather than this product's.
 * There is no per-tool recognition list
 * either: the parse the detail shows is the file's, and the recognizing tools
 * with their invocation names are published by the inventory the page already
 * holds. A skill's resources are published as
 * `SkillDefinitionDto.companionFiles`, which the census enumerates and never
 * admits; the vendor rule modules say why they get no rule of their own.
 */
export type FileDetailDto =
  SkillFileDetailDto | InstructionFileDetailDto | UnrecognizedFileDetailDto;

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
  /**
   * A vendor's reader expanding what a seed declares into further targets. The
   * shipped stage is the configuration read that precedes the walk, which is
   * why an admitted scan starts here rather than at `enumerating`; a reader
   * whose seed is a file the walk admitted reports the same phase from after
   * that walk when its rule ships.
   */
  | 'deriving'
  /** The allowlisted traversal program is enumerating candidates. */
  | 'enumerating'
  /** Candidate file bytes are being read. */
  | 'reading'
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
   * The instructions inventory: one entry per applicability range
   * (data-model.md § Inventory unit), in range order, each listing the files
   * it governs in Source-relative Path order.
   */
  readonly instructions: readonly InstructionInventoryEntryDto[];
  /**
   * The skill inventory: one entry per name as one tool resolves it
   * (data-model.md § Inventory unit). A row's unit is decided by the kind, not
   * by the file, so each kind publishes its own inventory as its recognizer
   * phase ships rather than widening one shared row shape.
   */
  readonly skills: readonly SkillInventoryEntryDto[];
  /**
   * The MCP inventory: one entry per declared server name, in name order,
   * each listing the declarations that resolve it; the one null-named entry
   * closes the list with the carriers publishing no named declaration
   * (data-model.md § Inventory unit).
   */
  readonly mcp: readonly McpInventoryEntryDto[];
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
