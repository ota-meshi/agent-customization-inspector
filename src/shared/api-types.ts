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
import type { RuleId } from './registries/identifier-types';

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
   * The Source holding the `SKILL.md`, and the other half of the file's
   * identity (FR-030): a consented Global home and another consented home can
   * hold one `skills/<name>/SKILL.md` path, so the path alone names no file
   * once a member's skill rule exists. Joins to `files[]` and leads the
   * detail route's own Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the `SKILL.md` this definition is authored
   * in — with {@link sourceId} the file's identity (FR-030), which joins to
   * `files[]` and is the path half of its detail route,
   * `/skills/detail/<source>/<source-relative path>`.
   */
  readonly sourceRelativePath: string;
  /**
   * The tool whose recognition this definition is (FR-007). One definition
   * per `(file, tool)` under the entry's name — the same unit as
   * ToolRecognition — so a file two products invoke by one name is two
   * definitions of that entry, and a tool that invokes the file by a
   * different name defines on that name's entry instead.
   */
  readonly tool: SupportedTool;
  /**
   * That tool's surfaces whose documented behavior the admitting rules rest
   * on, deduplicated and in the closed surface order — the same statement
   * {@link FileRecognitionDto} carries, because a definition is a recognition
   * and FR-009 states the surfaces beside every recognition, however many the
   * product has. Non-empty: every rule is based on at least one behavior
   * statement, and a statement names at least one surface.
   *
   * Never a claim that a surface loaded the skill: an admission is not an
   * activation (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * This definition's extraction state — the owning recognition's own
   * `parseStatus`, republished here because the definition is that
   * recognition (FR-028). `failed` is what keeps a surface from reading the
   * skill-directory row name as something the file declared: for a tool that
   * invokes the authored name, that name is unknown rather than absent, so
   * the row the definition landed on is provisional grouping and evidences no
   * collision — Claude Code's path-derived clash stands either way
   * (skill-collision.ts `collisionEvidencePaths`).
   */
  readonly parseStatus: RecognitionParseStatus;
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
 * `skills[]`, data-model.md § Inventory unit): one invocation name as one
 * tool resolves it, and every `SKILL.md` a recognizing tool invokes under it.
 *
 * The invocation name is the unit rather than the file: two files may be
 * invoked by one name — by declaring it, or by sitting in same-named
 * directories while declaring none — and one file's recognizing tools may
 * invoke it by different names, putting the file on each name's row with the
 * tools that reach it there (FR-007).
 */
export interface SkillInventoryEntryDto {
  /**
   * The name one tool's own documentation invokes these files by (FR-007):
   * the authored frontmatter `name` for Codex and Copilot — or the skill
   * directory name when the file declares none or declares it empty — and,
   * for Claude Code, the skill directory whatever the frontmatter declares,
   * prefixed for a nested skill with the root-relative `/`-joined path of the
   * directory holding its `.claude` and a `:` — `apps/web:deploy`. Never null
   * or empty: being a named directory is what a skill is, so every row has a
   * name to be listed under. Resolved by the admitting rule at recognition
   * time (server/inspection/rules/skills/compiled-rule.ts § CompiledStaticSkillRule),
   * which is where a product's own naming lives.
   */
  readonly name: string;
  /**
   * The recognitions invoking these files by this name, one definition per
   * `(file, tool)`, in Source-relative Path order and the contracted tool
   * order within one file.
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
   * The Source whose root this row's range is relative to, and half of every
   * listed file's identity (FR-030).
   *
   * A row is one range *of one Source*, not one range: the selected
   * repository's `**` and a consented Codex home's `**` are different scopes
   * that happen to share a spelling, so one row holding both would say two
   * things at once — and a same-path file in each would collapse into one
   * entry the reader could not tell apart.
   */
  readonly sourceId: string;
  /**
   * The glob the row's files govern, relative to the row's own Source root —
   * `**`
   * at the root, or the range a file declares for itself (Copilot's
   * `applyTo`) — and, with {@link sourceId}, the row's identity. Rows are
   * grouped by exact text equality of this value: nothing parses it,
   * normalizes its spelling, or decides whether two ranges overlap.
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
  readonly recognitions: readonly FileRecognitionDto[];
}

/**
 * One tool's recognition of one file, on the inventory row that lists it —
 * shared by the kinds whose rows name files: a rule row is one file, and an
 * instructions row is one applicability range listing the files it governs
 * (data-model.md § Inventory unit).
 *
 * The tool alone cannot say where the file is read from: GitHub Copilot's
 * editor, CLI, and cloud surfaces document different lookup bases for the same
 * filenames, so a `.github/copilot-instructions.md` at the root is read by all
 * three while one in a subdirectory is a CLI context alone
 * (contracts/vendors/github-copilot.md § Surface boundary). The surfaces are
 * therefore published beside the tool rather than left to a reader to infer
 * from the path.
 *
 * Kind-neutral because the fact is: which product recognized this file, and
 * which documented lookups its admissions rest on. A per-kind copy of the
 * pair would be two spellings of one answer, free to drift.
 *
 * The surfaces are stated beside every recognition, however many a product
 * has (FR-009): a surface set narrows what reads the file even when it holds
 * one member — Codex's local clients exclude the hosted service that reads no
 * local file — so stating it only where it varies would leave a reader unable
 * to tell a one-surface product from a kind that states none. It is never a
 * claim that a surface loaded the file.
 */
export interface FileRecognitionDto {
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
 * One row of the rules inventory (contracts/http-api.md § get-session
 * `rules[]`, data-model.md § Inventory unit): one recognized rule file,
 * listing the products that recognized it.
 *
 * The unit is the file. A rule file is modular instructions a product loads
 * into context: it declares no name a row could be keyed by and governs no
 * range it could be grouped under, so its Source-relative Path is the row's
 * identity, and two products recognizing one file is one row with two
 * recognitions.
 *
 * What the file declares is not here: its content is served by the detail
 * route, one file at a time (FR-027), and the file's own read outcome, size,
 * and diagnostics stay on its `files[]` entry.
 *
 * A row is never a claim that a product loaded the file: whether a rule is in
 * context depends on runtime this tool never observes (FR-009).
 */
export interface RuleInventoryEntryDto {
  /**
   * The Source holding the file, and the other half of the row's identity
   * (FR-030): the row's unit is the file, and a consented home's rule file
   * and a same-path file elsewhere are two rows. Joins to `files[]` and
   * leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the rule file — the row's identity (FR-030),
   * which joins to `files[]`.
   */
  readonly sourceRelativePath: string;
  /**
   * What recognized this file — one entry per recognizing tool, in the closed
   * tool order (FR-004). Non-empty: a file nothing recognizes is no row.
   */
  readonly recognitions: readonly FileRecognitionDto[];
}

/**
 * One prompt or command file behind an inventory entry (contracts/http-api.md
 * § get-session `prompts[]`). It names its file by `sourceRelativePath` and
 * repeats nothing else the file publishes for itself — size, read outcome, and
 * file-scoped diagnostics all stay on {@link CustomizationFileSummaryDto}.
 */
export interface PromptDefinitionDto {
  /**
   * The Source holding the file, and the other half of its identity
   * (FR-030): a member's command or prompt rule makes a Global home's path
   * constructible beside a same-path file elsewhere, so the path alone names
   * no file. Joins to `files[]` and leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the prompt or command file this definition is
   * authored in — the file's identity (FR-030), which joins to `files[]` and
   * is the detail route `/prompts-and-commands/<source-relative path>`.
   */
  readonly sourceRelativePath: string;
  /**
   * The tool whose recognition this definition is (FR-007). One definition per
   * `(file, tool)` under the entry's name — the same unit as ToolRecognition —
   * so a file two products invoke by one name is two definitions of that
   * entry, and a product that derives a different name for the file defines on
   * that name's entry instead.
   */
  readonly tool: SupportedTool;
  /**
   * That tool's surfaces whose documented behavior the admitting rules rest
   * on, deduplicated and in the closed surface order — the same statement
   * {@link FileRecognitionDto} carries, because a definition is a recognition
   * and FR-009 states the surfaces beside every recognition. Non-empty.
   *
   * Never a claim that a surface loaded the command: an admission is not an
   * activation (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per kind
   * means one record, which every failed definition of the file names as its
   * own parse fact and the file's `files[]` entry lists once.
   *
   * No `parseStatus` beside it, unlike a skill definition: a skill's row name
   * comes out of the parse, so a failed one leaves that name unknown and the
   * state has to be published. This kind's row name is never unknown — a
   * command's is derived from the path, and a prompt file whose parse failed
   * takes the file name its vendor documents for a file that declares none —
   * so a failed parse costs the declarations and not the row's identity, which
   * is exactly what this reference names.
   */
  readonly diagnosticIds: readonly string[];
}

/**
 * One row of the prompts-and-commands inventory (contracts/http-api.md
 * § get-session `prompts[]`, data-model.md § Inventory unit): one name a
 * reader invokes, and every prompt or command file a recognizing tool invokes
 * it by.
 *
 * The name is the unit rather than the file, the same way a skill row's is:
 * what a reader looks for is the command they would type, and a file two
 * products recognize may be one command to one of them and another to the
 * other. The admitting rule is what answers it, because the kind's two
 * locations answer differently: a command file's name is never authored —
 * both products ignore a `name` key in one and derive the command from the
 * path — while a VS Code prompt file declares the name a reader types, with
 * its own file name standing in when it declares none.
 */
export interface PromptInventoryEntryDto {
  /**
   * The name one tool invokes this row's files by, as that tool builds it:
   * Claude Code takes the path below its command directory and turns every
   * separator into a `:`, so `deploy`, `frontend:component`, and
   * `team:review:security`; the Copilot CLI takes the file name alone; a VS
   * Code prompt file's declared `name` is taken as authored, falling back to
   * its file name without the `.prompt.md` suffix.
   *
   * Empty exactly where the vendor's own derivation is: a file named `.md` in
   * a command directory has nothing before its extension, and the products
   * that derive the name from the path resolve it to the empty string, so
   * reporting anything else would report a command they do not have. The row
   * renders such a name through the label rule every authored value gets
   * ({@link rendersNothingVisible}), which says the name draws nothing rather
   * than drawing nothing.
   */
  readonly name: string;
  /**
   * The recognitions resolving this name, one definition per `(file, tool)`,
   * in Source-relative Path order and the contracted tool order within one
   * file. Non-empty: a name nothing recognizes is no row.
   */
  readonly definitions: readonly PromptDefinitionDto[];
}

/**
 * One output-style file behind an inventory entry (contracts/http-api.md
 * § get-session `outputStyles[]`). It names its file by `sourceRelativePath`
 * and repeats nothing else the file publishes for itself — size, read
 * outcome, and file-scoped diagnostics all stay on
 * {@link CustomizationFileSummaryDto}.
 */
export interface OutputStyleDefinitionDto {
  /**
   * The Source holding the file, and the other half of its identity
   * (FR-030): a member's output-style rule makes a Global home's path
   * constructible beside a same-path file elsewhere. Joins to `files[]` and
   * leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the output-style file this definition is
   * authored in — the file's identity (FR-030), which joins to `files[]` and
   * is the detail route `/output-styles/<source-relative path>`.
   */
  readonly sourceRelativePath: string;
  /**
   * The tool whose recognition this definition is (FR-007). One definition per
   * `(file, tool)` under the entry's name — the same unit as ToolRecognition.
   * One product ships an output-style rule today, so a row holds one
   * definition per file; the unit is per `(file, tool)` anyway, because that
   * is what a definition is.
   */
  readonly tool: SupportedTool;
  /**
   * That tool's surfaces whose documented behavior the admitting rules rest
   * on, deduplicated and in the closed surface order — the same statement
   * {@link FileRecognitionDto} carries, because a definition is a recognition
   * and FR-009 states the surfaces beside every recognition. Non-empty.
   *
   * Never a claim that a surface applied the style: an admission is not an
   * activation (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per kind
   * means one record, which every failed definition of the file names as its
   * own parse fact and the file's `files[]` entry lists once.
   *
   * No `parseStatus` beside it, for the reason a prompt definition carries
   * none: this kind's row name is never unknown — a file whose parse failed
   * takes the file name its vendor documents for a file that declares none —
   * so a failed parse costs the declarations and not the row's identity.
   */
  readonly diagnosticIds: readonly string[];
}

/**
 * One row of the output-style inventory (contracts/http-api.md § get-session
 * `outputStyles[]`, data-model.md § Inventory unit): one style name as one
 * tool resolves it, and every file that tool selects under it.
 *
 * The name is the unit rather than the file, the same way a prompt row's is:
 * what a reader looks for is the style they would pick in the settings, and
 * the vendor documents that name as the file's own name unless the
 * frontmatter sets one. Two files of one repository can carry one name — the
 * page says the layer closest to the working directory wins — so the row
 * lists both and states no winner: which layer a session reaches is runtime
 * this product never observes (FR-009).
 */
export interface OutputStyleInventoryEntryDto {
  /**
   * The style name one tool selects this row's files by, as that tool builds
   * it: Claude Code takes the frontmatter `name`, falling back to the file
   * name without its `.md` extension. Never empty — a declared empty name
   * falls back like an absent one, because a picker cannot show a style by a
   * name with no characters. Resolved by the admitting rule at recognition
   * time (server/inspection/rules/output-styles/compiled-rule.ts
   * § CompiledStaticOutputStyleRule).
   */
  readonly name: string;
  /**
   * The recognitions selecting this name, one definition per `(file, tool)`,
   * in Source-relative Path order and the contracted tool order within one
   * file. Non-empty: a name nothing recognizes is no row.
   */
  readonly definitions: readonly OutputStyleDefinitionDto[];
}

/**
 * One custom-agent file behind an inventory entry (contracts/http-api.md
 * § get-session `agents[]`). It names its file by `sourceRelativePath` and
 * repeats nothing else the file publishes for itself — size, read outcome, and
 * file-scoped diagnostics all stay on {@link CustomizationFileSummaryDto}.
 */
export interface AgentDefinitionDto {
  /**
   * The Source holding the file, and the other half of its identity
   * (FR-030): a member's agent rule makes a Global home's `agents/…` path
   * constructible beside a same-path file elsewhere, so the path alone names
   * no file. Joins to `files[]` and leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the file this agent is defined in — with
   * {@link sourceId} the file's identity (FR-030), which joins to `files[]`
   * and is the path half of the detail route
   * `/agents/detail/<source>/<source-relative path>`.
   */
  readonly sourceRelativePath: string;
  /**
   * The tool whose recognition this definition is (FR-007). One definition per
   * `(file, tool)` under the entry's name — the same unit as ToolRecognition —
   * so a file two products read as an agent is two definitions of that entry.
   */
  readonly tool: SupportedTool;
  /**
   * That tool's surfaces whose documented behavior the admitting rules rest
   * on, deduplicated and in the closed surface order — the same statement
   * {@link FileRecognitionDto} carries, because a definition is a recognition
   * and FR-009 states the surfaces beside every recognition. Non-empty.
   *
   * Never a claim that a surface spawned the agent: an admission is not an
   * activation (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * The kind's closed extraction state (FR-028), published because a
   * declared-`name` product's row name comes out of the parse: a failed
   * extraction leaves that name unknown rather than absent, which is what the
   * null-named row's members tell apart, exactly as an MCP declaration's does.
   * A file-name product's definition is unaffected — its row keeps the
   * identity the path gives it — and the state is still published for it,
   * because what could not be read is a fact about the file either way.
   */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per kind
   * means one record, which every failed definition of the file names as its
   * own parse fact and the file's `files[]` entry lists once.
   */
  readonly diagnosticIds: readonly string[];
}

/**
 * One row of the custom-agent inventory (contracts/http-api.md § get-session
 * `agents[]`, data-model.md § Inventory unit): one agent name, and every file
 * a recognizing tool defines that agent in.
 *
 * The name is the unit rather than the file, the way an MCP row's declared
 * server name is, so two files resolving one name are two definitions of one
 * row. Which fact resolves it is the admitting rule's, because the products
 * differ: OpenAI Codex and Claude Code identify a custom agent by the `name`
 * its file declares and call a matching filename convention rather than
 * lookup, while GitHub Copilot documents `name` as an optional display name
 * and identifies a profile by its configuration file's own name minus `.md`
 * or `.agent.md`. One file two products name differently therefore defines on
 * two rows.
 */
export interface AgentInventoryEntryDto {
  /**
   * The name the admitting product identifies the agent by (FR-007), or null
   * for the one row that closes the list with the files publishing no name.
   *
   * Which fact answers is the rule's, and so is what an absence means. Under a
   * declared-`name` product the row is the value the parser resolved, and a
   * file declaring none, one declaring anything but a scalar, and one whose
   * declarations could not be read at all share the null row, where the name
   * is unknown rather than absent (FR-028): naming such a row after its
   * filename would report an agent name that product does not have. Under a
   * file-name product the path answers, so its definitions never reach the
   * null row and a failed parse takes nothing from the row's identity.
   */
  readonly name: string | null;
  /**
   * The recognitions defining this name, one definition per `(file, tool)`,
   * in Source-relative Path order and the contracted tool order within one
   * file. Non-empty: a name nothing recognizes is no row.
   */
  readonly definitions: readonly AgentDefinitionDto[];
}

/**
 * One row of the permissions inventory (contracts/http-api.md § get-session
 * `permissions[]`, data-model.md § Inventory unit): one declared permission
 * policy, named by the path of the file that declares it.
 *
 * The unit is the policy, not the file, which is why this is not
 * {@link RuleInventoryEntryDto} under another name. A rule row is a file; a
 * permissions row is a policy that a file declares — a document of its own
 * where one vendor writes it that way, and one block of a settings file whose
 * remaining keys are another recognition's content where another does. A file
 * declaring no policy is no row here whatever else it is recognized as. Two
 * units that coincide in shape are still two: one type standing for both
 * would say two subjects are one (data-model.md § Inventory unit).
 *
 * What the policy declares is not here: it is served by
 * `get-permission-policy-detail`, one at a time (FR-027), and the declaring
 * file's own read outcome, size, and diagnostics stay on its `files[]` entry.
 *
 * A row is never a claim that a product enforced the policy: whether a
 * permission rule is in force depends on runtime this tool never observes
 * (FR-009).
 */
export interface PermissionsInventoryEntryDto {
  /**
   * The Source holding the declaring file, and the other half of the row's
   * identity (FR-030): a member's permissions rule makes a Global home's
   * path constructible beside a same-path declaration elsewhere. Joins to
   * `files[]` and leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the file that declares the policy — the row's
   * identity (FR-030), which joins to `files[]`.
   */
  readonly sourceRelativePath: string;
  /**
   * What recognized this policy — one entry per recognizing tool, in the
   * closed tool order (FR-004). Non-empty: a policy nothing recognizes is no
   * row.
   */
  readonly recognitions: readonly FileRecognitionDto[];
  /**
   * The extraction diagnostics the recognitions of this policy reference —
   * the kind's one shared record per file, since the block is read once
   * (FR-028). A rules row has no counterpart: nothing is read out of a rule
   * file, so nothing can fail to be read, while a declared block is read out
   * of a document a parser can reject.
   */
  readonly diagnosticIds: readonly string[];
}

/**
 * One row of the settings-and-configuration inventory
 * (contracts/http-api.md § get-session `settings[]`, data-model.md
 * § Inventory unit): one recognized settings or configuration file, named by
 * its path, because the kind's unit is the file itself.
 *
 * Not {@link RuleInventoryEntryDto} or {@link PermissionsInventoryEntryDto}
 * under another name, though the three coincide in shape: a rule row is a
 * document a product reads as guidance, a permissions row is a policy a file
 * declares, and this row is the file a product reads its settings from. Two
 * units that coincide in shape are still two (data-model.md § Inventory
 * unit).
 *
 * A file can hold this row and another kind's at once: Codex's
 * `.codex/config.toml` is one admitted candidate whose `[mcp_servers.*]`
 * tables are MCP rows and whose document is this row. What the file declares
 * is not here — it is served by the kind's own detail, one file at a time
 * (FR-027) — and the file's own read outcome, size, and diagnostics stay on
 * its `files[]` entry.
 *
 * There is no extraction diagnostic list, for the reason
 * {@link RuleInventoryEntryDto} has none: nothing is read out of the document
 * this row publishes, so nothing can fail to be read (FR-028). A file whose
 * bytes were never accepted gains no recognition and is no row here at all.
 *
 * A row is never a claim that a product applied the settings: a project layer
 * applies only to a trusted project, the layers outside this Source resolve
 * against the same keys, and which value wins is runtime this tool never
 * observes (FR-009).
 */
export interface SettingsInventoryEntryDto {
  /**
   * The Source holding the file, and the other half of the row's identity
   * (FR-030): the row's unit is the file, and a consented home's
   * `settings.json` and another Source's same-path document are two rows.
   * Joins to `files[]` and leads the detail route's Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the settings or configuration file — with
   * {@link sourceId} the row's identity (FR-030), which joins to `files[]`.
   */
  readonly sourceRelativePath: string;
  /**
   * What recognized this file — one entry per recognizing tool, in the closed
   * tool order (FR-004). Non-empty: a file nothing recognizes is no row.
   */
  readonly recognitions: readonly FileRecognitionDto[];
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
   * The Source holding the carrier, and the other half of the file's
   * identity (FR-030): a member's MCP rule makes a Global home's carrier path
   * constructible beside a same-path carrier elsewhere, so the path alone
   * names no file. Joins to `files[]` and leads the detail route's Source
   * segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the carrier this declaration is authored
   * in — with {@link sourceId} the file's identity (FR-030), which joins to
   * `files[]` and is the path half of the declaration's own detail route,
   * `/mcp/detail/<source>/<source-relative path>?server=<name>`.
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

/**
 * Which of a product's two documented hook forms a declaration is authored in
 * (contracts/vendors/openai-codex.md § Normative initial-release presentation
 * allowlist, the `hook` row).
 *
 * A published fact rather than something a reader derives from the path: one
 * layer can hold both forms, the vendor loads both rather than choosing, and
 * the two are separate recognitions of separate files — so which form a row's
 * declaration came from is what tells them apart on the row.
 */
export type HookCarrierForm =
  /** A file whose whole purpose is hooks, such as a Codex `.codex/hooks.json`. */
  | 'standalone'
  /** A hook table inside a file admitted for other content too, such as an inline Codex `[hooks]`. */
  | 'contained';

/**
 * One row of the hook inventory (contracts/http-api.md § get-session
 * `hooks[]`, data-model.md § Inventory unit): one declared lifecycle event,
 * listing every declaration that declares it — one per `(carrier, tool)`, the
 * same grouping an MCP server name gives its declarations — so a second
 * carrier declaring the same event joins the event's row rather than starting
 * another.
 *
 * The declared matcher groups and handlers are not here: a declaration's
 * content is served by its carrier's detail, one file at a time (FR-027), and
 * the carrier's own read outcome, size, and file diagnostics stay on its
 * `files[]` entry.
 */
export interface HookInventoryEntryDto {
  /**
   * The declared event name this row is — the key inside the carrier's hook
   * map, exactly as it was written (FR-007). Null for the one row that closes
   * the list with the carriers whose emptiness is itself a finding: one whose
   * hook block could not be read, whose events are unknown rather than absent,
   * and one whose whole purpose is hooks and that declares none — which each
   * declaration's own `parseStatus` tells apart (FR-028). A carrier that
   * merely may contain a hook table and does not is on no row: its file is
   * published under the rows its own kinds give it.
   */
  readonly event: string | null;
  /**
   * The declarations of this event, in carrier-path then closed tool order —
   * or, on the null row, the carriers publishing no event, one entry per
   * `(carrier, tool)` either way. Non-empty: an event exists because a
   * declaration made it, and the null row exists only while a carrier belongs
   * on it.
   */
  readonly declarations: readonly HookDeclarationDto[];
}

/**
 * One declaration listed under the event it declares — or, on the null row,
 * one carrier publishing no event (contracts/http-api.md § get-session
 * `hooks[]`).
 */
export interface HookDeclarationDto {
  /**
   * The Source holding the carrier, and the other half of the file's
   * identity (FR-030): a member's hook rule makes a Global home's carrier
   * path constructible beside a same-path carrier elsewhere, so the path
   * alone names no file. Joins to `files[]` and leads the detail route's
   * Source segment.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the carrier this declaration is authored
   * in — with {@link sourceId} the file's identity (FR-030), which joins to
   * `files[]` and is the path half of the declaration's own detail route,
   * `/hooks/detail/<source>/<source-relative path>?event=<name>`.
   */
  readonly sourceRelativePath: string;
  /** The tool whose recognition this declaration is (FR-007). */
  readonly tool: SupportedTool;
  /**
   * Which documented form the declaration is authored in; see
   * {@link HookCarrierForm}. One layer can hold both, so the row states which
   * of them this declaration is rather than leaving a reader to infer it.
   */
  readonly carrier: HookCarrierForm;
  /**
   * The vendor surfaces the declaring recognition rests on — the union over
   * its admissions, exactly as an MCP declaration publishes them
   * (contracts/http-api.md § get-session). Naming a surface never claims that
   * surface ran the hook (FR-009); it says which documented lookup the
   * admission rests on.
   */
  readonly surfaces: readonly VendorSurface[];
  /**
   * The owning carrier recognition's extraction state, republished here
   * because the declaration is that recognition's (FR-028). Always `parsed`
   * under a named row — a failed carrier publishes no event — and on the null
   * row it is what tells "the events are unknown" (`failed`) apart from "the
   * carrier declares none" (`parsed`).
   */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per kind
   * means one record, which the carrier's `files[]` entry lists once and each
   * of its declarations republishes as its own parse fact.
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

/**
 * What one custom-agent file declares, split the way its detail shows it
 * (contracts/http-api.md § get-file-detail): the declarations a product reads
 * as configuration, and the instructions it gives the agent.
 *
 * Its own shape rather than {@link MarkdownPresentationDto} because the split
 * is not a frontmatter block: a Codex agent is TOML whose
 * `developer_instructions` string is the prose and whose remaining top-level
 * keys are the configuration, while the products that write an agent as
 * Markdown split at the frontmatter fence. Naming the halves after what they
 * are lets both spell the same two fields, and lets one detail surface render
 * them the same way — the metadata as YAML, the instructions as Markdown.
 */
export interface AgentPresentationDto {
  /**
   * Every declaration the file makes except the one holding the instructions,
   * in the file's own order — the agent's own `name` among them, because the
   * name is a declaration like any other on this surface and the row it heads
   * is the inventory's fact (FR-007). Empty when the file declares nothing
   * else.
   */
  readonly metadata: readonly DeclaredEntryDto[];
  /**
   * The instructions the file gives the agent, as the parser resolved them:
   * a Codex agent's `developer_instructions` string, a Markdown agent's body
   * once its frontmatter block is removed. Empty when the file declares none —
   * and empty, too, when the declaration holding them is not a string, which
   * leaves it a metadata entry rather than prose.
   */
  readonly instructionsText: string;
}

/** Fields every detail variant carries; see {@link FileDetailDto}. */
interface FileDetailBase {
  /** The committed file, including its complete authored source when readable. */
  readonly file: CustomizationFileDto;
  /** The file-scoped Diagnostic records the file's own `diagnosticIds` name (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
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
   * failed all-or-nothing (FR-028): nothing was parsed, the failure's
   * Diagnostic is in `diagnostics`, and the complete source stays readable.
   * Every variant below that carries a parse follows the same rule.
   */
  readonly presentation: MarkdownPresentationDto | null;
}

/**
 * Detail of a skill entry point: the file plus what the one scan-time parse
 * resolved (contracts/http-api.md § get-file-detail). The parse is a fact of
 * the file, not of a recognizing tool — every vendor reads the same fixed
 * YAML semantics — so it is published once; which tools recognize the file,
 * and the name each invokes it by, are the inventory's facts
 * (`skills[].definitions[]` under the row each name keys), which the detail
 * surface reads off the rows holding the file rather than from this response.
 */
export interface SkillFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized skill entry point. */
  readonly kind: 'skill';
  /**
   * The parsed declarations and instructions, or null exactly when extraction
   * failed all-or-nothing (FR-028), the same rule the instructions variant
   * states: nothing was parsed, the failure's Diagnostic is in `diagnostics`,
   * and the complete source stays readable.
   */
  readonly presentation: MarkdownPresentationDto | null;
}

/**
 * Detail of a recognized custom-agent file: the file plus what the one
 * scan-time parse resolved (contracts/http-api.md § get-file-detail).
 *
 * Both halves, unlike an MCP carrier's: an agent file is admitted as the
 * document its author wrote, so its complete authored source reaches the page
 * (FR-025) and the parse sits beside it as the values a product would actually
 * read — resolved once, quoting and escapes settled, where the source shows
 * the spelling (data-model.md § Field reading).
 *
 * No per-tool identity here, and no agent name: which tools recognize the file
 * is the inventory's fact, and so is the name — the file's own `name`
 * declaration arrives here as one metadata entry like every other key it
 * wrote. A declared `mcp_servers` block is one of those entries too: it is
 * this file's content and joins no MCP row (data-model.md § Inventory unit).
 */
export interface AgentFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized custom-agent definition. */
  readonly kind: 'agent';
  /**
   * The declarations and the instructions the one scan-time parse resolved, or
   * null exactly when extraction failed all-or-nothing (FR-028): nothing was
   * parsed, both halves are unknown rather than absent, the failure's
   * Diagnostic is in `diagnostics`, and the complete source stays readable.
   */
  readonly presentation: AgentPresentationDto | null;
}

/**
 * Detail of a recognized command file: the file plus what the one scan-time
 * parse resolved (contracts/http-api.md § get-file-detail). A command file
 * carries a skill's frontmatter keys, so its detail leads with the
 * declarations the file wrote and the instructions that follow them, from the
 * same one parse the other Markdown kinds publish.
 *
 * No per-tool identity exists here, and no invocation name: which tools
 * recognize the file is the inventory's fact, and so is the name a reader
 * would type — the rule that admitted the file answers it, and a prompt file's
 * own `name` declaration arrives here as a frontmatter entry like every other
 * key it wrote. The detail page states the name by reading the rows this file
 * is listed under, so the one fact is published once.
 */
export interface PromptFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized command file. */
  readonly kind: 'prompt/command';
  /**
   * The parsed declarations and instructions, or null exactly when extraction
   * failed all-or-nothing (FR-028), the same rule the instructions variant
   * states: nothing was parsed, the failure's Diagnostic is in `diagnostics`,
   * and the complete source stays readable.
   */
  readonly presentation: MarkdownPresentationDto | null;
}

/**
 * Detail of a recognized rule file: the file, and nothing derived from it
 * (contracts/http-api.md § get-file-detail).
 *
 * No `presentation`: a rule file is published as the one document its author
 * wrote, so nothing is read out of it to set beside the file. A Claude rule
 * is Markdown and reaches the page whole, frontmatter block included, because
 * splitting a rule into declarations and a body would show the reader two
 * halves of a file they wrote as one — and with nothing read out, nothing can
 * fail to be read either, so the kind produces no extraction diagnostic. The
 * kind is Claude's alone in this release: a Codex `.codex/rules/*.rules` file
 * is a permission policy rather than a rule, and its detail is
 * {@link PermissionPolicyDetailDto}.
 *
 * Its own variant rather than the unrecognized one, because a recognition
 * does own this file: the page it opens is headed as a rule, returns to the
 * rule tab, and states the products that recognized it. Publishing it as
 * "no recognition owns the file" would contradict its own inventory row.
 */
export interface RuleFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized rule file. */
  readonly kind: 'rule';
}

/**
 * What a carrier is to the plugin it declares
 * (contracts/vendors/openai-codex.md § Documented Repository behavior): a
 * plugin's own manifest, or a catalog that lists it.
 *
 * The two are equal carriers of one row and differ in what they establish: a
 * manifest is the plugin's own declaration of itself, while a catalog entry is
 * a table saying which plugin comes from which source. Neither says a plugin
 * is installed, enabled, or loaded (FR-009).
 *
 * Every shipped carrier is a `catalog`: Codex activates a plugin through a
 * catalog entry, so a manifest below the root that entry names is one of the
 * plugin's own files. `manifest` is what a vendor whose client reads one at a
 * fixed path will publish.
 */
export type PluginCarrierKind =
  /** The plugin's own `.codex-plugin/plugin.json`. */
  | 'manifest'
  /** A marketplace catalog whose entries name the plugins it exposes. */
  | 'catalog';

/**
 * Where one plugin's files come from, as the closed set every product's
 * documented plugin source forms map onto
 * (contracts/vendors/*.md § Repository vendor behavior).
 *
 * Each vendor writes its own spelling for the same kinds of place — Claude's
 * and Codex's `url` is a Git repository, Claude's `git-subdir` and Codex's
 * `git-subdir` a directory inside one — so what a declaration publishes is the
 * kind rather than the token, and the rule that admitted the carrier maps only
 * the forms its own documentation lists. A form its documentation does not
 * list resolves to `unrecognized`, which is an answer a surface states rather
 * than an absent directory a reader has to interpret.
 */
export type PluginSourceForm =
  /**
   * A local directory: a `./` path relative to the catalog's documented
   * base — the Repository root for a repository catalog, the home directory
   * for the personal Codex catalog — or a bare name resolved under the
   * catalog's own declared root where a vendor documents that spelling.
   * {@link PluginDeclarationDto.pluginRoot} carries the directory, and is
   * null when the declared path does not stay inside the Source.
   */
  | 'repository-directory'
  /** A GitHub repository the client clones. */
  | 'github-repository'
  /** A Git repository named by its URL. */
  | 'git-repository'
  /** A subdirectory inside a Git repository. */
  | 'git-subdirectory'
  /** A package the client installs from an npm registry. */
  | 'npm-package'
  /** A zip archive the client downloads over HTTPS. */
  | 'zip-archive'
  /** A directory produced by running a command on the reader's own machine. */
  | 'command-output'
  /**
   * A source in no form the admitting vendor documents: an object whose
   * discriminant that vendor does not define, a string that is not one of its
   * documented path spellings, or an entry writing no source at all. Nothing
   * is derived from it — no directory, no manifest, no file — and the surfaces
   * say that rather than reporting a directory as missing.
   */
  | 'unrecognized';

/**
 * One plugin a carrier declares — a manifest's own plugin, or one entry of a
 * catalog — carrying the name it resolves and the fields the file wrote for it
 * (FR-007).
 */
export interface PluginDeclarationDto {
  /**
   * The plugin name this declaration resolves, exactly as the file wrote it,
   * or null when the declaration names none — a manifest with no `name` key,
   * or a catalog entry that omits it. Never empty: an authored empty name is
   * a name the row shows as written, and a missing one is the null row's
   * (data-model.md § Inventory unit).
   */
  readonly name: string | null;
  /**
   * Every field this declaration writes, as the parser resolved it, in the
   * shared declaration-entry shape the detail surfaces render. For a manifest
   * that is the file's own top-level keys; for a catalog entry, that entry's
   * own keys — its `source`, `policy`, and `category` among them. The values
   * are the file's literals: an environment reference stays the characters
   * that were written, never a process value (FR-026).
   */
  readonly fields: readonly DeclaredEntryDto[];
  /**
   * What kind of place this plugin's files come from
   * ({@link PluginSourceForm}), as the rule that admitted the carrier read the
   * declared source.
   *
   * Published beside {@link pluginRoot} rather than derived from it, because
   * the two answer different questions and disagree in both directions: a
   * `./` path leaving the Source is a form this product read and a directory
   * it does not hold, while an npm package is a form it read that names no
   * directory anywhere here. A surface with only the root would have to
   * present both as the same absence.
   *
   * A manifest's own plugin is `repository-directory`: the plugin is the
   * directory holding the manifest, and nothing offers it from elsewhere.
   */
  readonly sourceForm: PluginSourceForm;
  /**
   * The Source-relative directory this plugin's files sit in, trailing slash
   * kept — the plugin root the declaration's local source names — or null when
   * the source names no directory here at all: a Git, npm, absolute, home, or
   * root-escaping source is not a plugin root, whatever it points at.
   *
   * The declared root, answered from the entry's own text and never probed on
   * disk: whether this repository carries it is what the row's `files[]` shows,
   * which is empty for a root that is not there. Publishing a path only when
   * something exists at it would make one fact two — the declaration's, and the
   * filesystem's — where the row already states the second.
   *
   * The directory rather than the files under it, because the files are the
   * generation's own `files[]` and a second list of them could disagree: which
   * directory a plugin occupies is the fact only the admitting vendor knows,
   * and the row derives its contents from it.
   */
  readonly pluginRoot: string | null;
  /**
   * The Source-relative Paths this plugin's own manifest may sit at inside that
   * root, in the order the vendor's client checks them — one form for Codex
   * (`<root>/.codex-plugin/plugin.json`) and Claude, four for Copilot, and none
   * at all when the declaration names no root here.
   *
   * Where the detail opens, the way a skill's detail opens on its `SKILL.md`: a
   * catalog entry is one file's statement about the plugin, while the manifest
   * is the plugin's own. Which files those are inside a root, and in which
   * order, is the admitting vendor's contract, so it is answered there and not
   * derived from `pluginRoot` by a surface that would have to know the vendor.
   *
   * A list rather than one path because a vendor may document several forms and
   * an order over them, and nothing here probes the filesystem: the surface
   * that opens a manifest takes the first of these the commit actually carries,
   * exactly as the file tree keeps only committed entries.
   */
  readonly manifestPaths: readonly string[];
}

/**
 * One carrier resolving a plugin name, in the shape the inventory row lists
 * (contracts/http-api.md § get-session `plugins[]`). It names its file by
 * `sourceRelativePath` and never repeats that file's own published facts.
 */
export interface PluginCarrierDto {
  /**
   * The Source holding the file, and the other half of its identity
   * (FR-030): the shared agent home's `plugins/marketplace.json` makes a
   * Global carrier path constructible beside a same-path carrier elsewhere,
   * so the path alone names no file. Joins to `files[]` and leads the detail
   * route's Source segment; the carrier's `files` are paths of this same
   * Source.
   */
  readonly sourceId: string;
  /**
   * The Source-relative Path of the file this declaration is authored in —
   * with {@link sourceId} the file's identity (FR-030), which joins to
   * `files[]` and is the path half of the carrier's own detail route.
   */
  readonly sourceRelativePath: string;
  /** The tool whose recognition this carrier is (FR-007). */
  readonly tool: SupportedTool;
  /**
   * The vendor surfaces the recognition rests on — the union over its
   * admissions. Naming a surface never claims that surface loaded the file
   * (FR-009).
   */
  readonly surfaces: readonly VendorSurface[];
  /** Which kind of carrier this file is for the plugin; see {@link PluginCarrierKind}. */
  readonly carrier: PluginCarrierKind;
  /**
   * The owning recognition's extraction state, republished here because the
   * declaration is that recognition's (FR-028). Always `parsed` under a named
   * row — a failed carrier publishes no name — and on the null row it is what
   * tells "the plugin is unnamed" (`parsed`) apart from "the names are
   * unknown" (`failed`).
   */
  readonly parseStatus: RecognitionParseStatus;
  /**
   * The kind's extraction-failure reference (FR-028): one extraction per
   * `(file, kind)` means one record, which the carrier's `files[]` entry lists
   * once and each of its declarations republishes as its own parse fact.
   */
  readonly diagnosticIds: readonly string[];
  /**
   * The Source-relative Paths of the files this carrier's offering of this
   * row's name reaches, sorted: the directory that offering named, as the
   * census enumerated it (contracts/inspection-path-allowlist.md § Bounded
   * companion census).
   *
   * Per carrier rather than per row, because that is what the census
   * established: two carriers of one name can name two directories, one of
   * them inside the other, and which files each reached is not the paths that
   * begin with its own. A row's whole file list is these lists together,
   * derived where it is shown.
   */
  readonly files: readonly string[];
}

/**
 * The result of `get-plugin-carrier-detail`: one plugin carrier's detail
 * (contracts/http-api.md § get-plugin-carrier-detail), discriminated by what
 * the file is to the plugins it declares.
 *
 * The two carriers differ in what their own file is, so their details do. A
 * manifest is itself the customization — one plugin, declared by the whole
 * file — so its detail serves the complete authored source beside the parse
 * (FR-007). A catalog is not: it is the table resolving many plugin names to
 * their sources, so a page whose subject is one of them publishes that
 * declaration and the catalog's own fields, and carries no `sourceText` field
 * at all — showing the file would put every other plugin it lists on a screen
 * about one, exactly as an MCP carrier's detail withholds its bytes.
 */
export type PluginCarrierDetailDto = PluginManifestDetailDto | PluginCatalogDetailDto;

/**
 * What one `get-plugin-carrier-detail` request names: the carrier file, and
 * the plugin row the page is about (contracts/http-api.md
 * § get-plugin-carrier-detail).
 *
 * The name is a parameter rather than a client-side filter because the answer
 * is one row's: a catalog offering many plugins would otherwise ship every
 * other plugin's declaration to a page about one of them.
 */
export interface PluginCarrierDetailParams {
  /** Which Source holds the carrier — with the path its identity (FR-030). */
  readonly source: SourceSelector;
  /** The Source-relative Path of the carrier file; the file's identity (FR-030). */
  readonly sourceRelativePath: string;
  /**
   * The product whose reading the detail answers with — the other half of a
   * carrier's identity, because an inventory row lists one carrier per
   * `(file, tool)` (data-model.md § Inventory unit).
   *
   * A parameter rather than a choice the projection makes: one catalog can be
   * admitted by every product, and which directory an entry's source names is
   * each vendor's own contract, so the same file read as Codex reads it and as
   * Claude reads it are two answers. Serving whichever recognition came first
   * would state one product's root, source form, and manifest under another
   * product's name.
   */
  readonly tool: SupportedTool;
  /**
   * The plugin name the row is headed by, or null for the row that closes the
   * list with the declarations resolving no name at all.
   */
  readonly pluginName: string | null;
}

/**
 * What one `get-plugin-file-detail` request names: a file of one plugin, and
 * the carrier whose offering reached it (contracts/http-api.md
 * § get-plugin-file-detail).
 *
 * Four coordinates rather than the file's path alone, because the subject is
 * the file *as one plugin's*: which files a plugin ships is what the census
 * enumerated below the directory one carrier's offering named, so the carrier,
 * the product reading it, and the row's name are what make the path a member
 * of anything (contracts/inspection-path-allowlist.md § Bounded companion
 * census).
 */
export interface PluginFileDetailParams {
  /** Which Source holds the carrier — with the path its identity (FR-030). */
  readonly source: SourceSelector;
  /** The Source-relative Path of the carrier that declares the plugin (FR-030). */
  readonly sourceRelativePath: string;
  /** The product whose reading of that carrier reached the file; see {@link PluginCarrierDetailParams.tool}. */
  readonly tool: SupportedTool;
  /**
   * The plugin name the row is headed by, or null for the row that closes the
   * list with the declarations resolving no name at all.
   */
  readonly pluginName: string | null;
  /** The Source-relative Path of the file to read, which must be one that plugin ships. */
  readonly filePath: string;
}

/**
 * The result of `get-plugin-file-detail`: one file a plugin ships, with its
 * complete authored source and its own diagnostics (FR-007, FR-025).
 *
 * The file and nothing read out of it. A plugin's own files acquire no rule, no
 * recognition, and no kind by being below its root
 * (contracts/inspection-path-allowlist.md § Bounded companion census), so there
 * is no parse to publish beside the bytes — and a file that a rule *does*
 * independently admit keeps its own rows, which is why this result carries the
 * file rather than a kind: it answers for the plugin's page, where the subject
 * is the plugin, while that file's own row answers for its own kind.
 */
export interface PluginFileDetailDto {
  /** The committed file with its complete authored source (FR-025). */
  readonly file: CustomizationFileDto;
  /** The file's own diagnostics, in the commit's deterministic order (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/** What both plugin carrier details carry. */
interface PluginCarrierDetailBase {
  /** The carrier file's own diagnostics, in the commit's deterministic order (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/**
 * A plugin's own manifest: the complete authored file.
 *
 * The file and nothing read out of it. A manifest declares one plugin with its
 * whole content, and it is strict JSON, so a parsed key list re-serialized
 * beside it would be the same document one round trip further from what the
 * author wrote — two renderings of one fact, which can disagree where one
 * cannot. A parse that failed is stated by {@link diagnostics} (FR-028), and
 * the name the row is headed by is the inventory's.
 */
export interface PluginManifestDetailDto extends PluginCarrierDetailBase {
  /** Discriminant: the file is a plugin's own manifest. */
  readonly carrier: 'manifest';
  /**
   * The committed file with its complete authored source, because a manifest
   * is itself the customization (FR-007, FR-025).
   */
  readonly file: CustomizationFileDto;
  /**
   * The Source-relative directory this plugin's files occupy, trailing slash
   * kept — the folder the manifest's presence made a plugin.
   *
   * The one fact the file does not carry: which directory is the plugin root is
   * the admitting vendor's contract, and a surface that derived it from the
   * carrier's path would have to know where inside a root that vendor keeps its
   * manifest. The manifest's own path needs no field, being the file's.
   */
  readonly pluginRoot: string;
}

/**
 * A catalog listing plugins: the file's own facts without its bytes, what the
 * catalog declares about itself, and the plugins its entries resolve.
 */
export interface PluginCatalogDetailDto extends PluginCarrierDetailBase {
  /** Discriminant: the file is a catalog listing plugins. */
  readonly carrier: 'catalog';
  /** The carrier's own facts — path, read outcome, size, diagnostics — without its source text. */
  readonly file: CustomizationFileSummaryDto;
  /**
   * The entries of this catalog that resolve the requested plugin name, in the
   * parser's resolved order, or null exactly for a failed extraction — the
   * declarations are unknown rather than absent, and the diagnostics below are
   * the failure's record (FR-028). Usually one; several only on the null row,
   * where one catalog can hold more than one entry naming nothing.
   */
  readonly plugins: readonly PluginDeclarationDto[] | null;
  /**
   * What the catalog declares about itself — its `name` and `interface` — never
   * the `plugins` array, whose entries are the declarations above. Empty for a
   * failed extraction.
   */
  readonly catalogFields: readonly DeclaredEntryDto[];
}

/**
 * One plugin inventory row: one resolved plugin name and every carrier that
 * resolves it (contracts/http-api.md § get-session `plugins[]`, data-model.md
 * § Inventory unit). Codex resolves a name through catalogs alone — the entry
 * declares the offering, and the files below the root it names are the
 * plugin's own rather than carriers of it — so a row lists one carrier per
 * catalog that offers the name. A vendor whose client reads a manifest at a
 * fixed path adds `manifest` carriers to the same row.
 */
export interface PluginInventoryEntryDto {
  /**
   * The name this plugin is resolved by, or null for the one row that closes
   * the list with the carriers resolving no name at all.
   *
   * The admitting rule answers it, because how a name follows from a
   * declaration is that vendor's own contract — the same rule a skill row's
   * name follows (FR-007). Codex addresses a catalog's offering as
   * `plugin@marketplace`, so the same plugin offered by two catalogs is two
   * rows.
   */
  readonly name: string | null;
  /**
   * The carriers resolving this name, in Source-relative Path then tool
   * order. Never empty: a row exists because a carrier declared it.
   *
   * Each carries the files its own offering reaches, so the plugin's whole
   * file list is theirs together: the plugin's own manifest is among them
   * rather than a row of its own — a plugin is its root — including the one
   * manifest that is itself a carrier, which the row names as a carrier and
   * lists among its files too.
   */
  readonly carriers: readonly PluginCarrierDto[];
}

/**
 * Detail of an output style: the file plus what the one scan-time parse
 * resolved (contracts/http-api.md § get-file-detail). The parse is a fact of
 * the file rather than of a recognizing tool, so it is published once; which
 * tools recognize the file, and the name each selects it by, are the
 * inventory's facts (`outputStyles[].definitions[]` under the row each name
 * keys).
 */
export interface OutputStyleFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized output style. */
  readonly kind: 'output style';
  /**
   * The parsed declarations and instructions, or null exactly when extraction
   * failed all-or-nothing (FR-028): nothing was parsed, the failure's
   * Diagnostic is in `diagnostics`, and the complete source stays served.
   */
  readonly presentation: MarkdownPresentationDto | null;
}

/**
 * Detail of a recognized settings or configuration file: the file, and
 * nothing read out of it (contracts/http-api.md § get-file-detail).
 *
 * No `presentation`, for the reason {@link RuleFileDetailDto} has none and
 * one more of its own: the kind's inventory row is the file itself
 * (data-model.md § Inventory unit), so the document its author wrote is the
 * whole answer, and a parser-resolved declaration list would drop the
 * comments, authored spellings, and section order a reader compares against
 * their own file. With nothing read out, nothing can fail to be read, so the
 * kind produces no extraction diagnostic.
 *
 * A Codex `.codex/config.toml` reaches this variant whole, its
 * `[mcp_servers.*]` tables included. Those tables are a different row's
 * subject and are served declaration-first by `get-mcp-carrier-detail`; that
 * they are visible here too is the one document seen under its own row rather
 * than a second publication of one fact (FR-007). No declared path is read,
 * resolved, or followed, and no environment reference is substituted
 * (FR-019, FR-026).
 */
export interface SettingsFileDetailDto extends FileDetailBase {
  /** Discriminant: the file is a recognized settings or configuration file. */
  readonly kind: 'settings/config';
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
 * One event declaration of a hook carrier, as its detail shows it
 * (contracts/http-api.md § get-hook-carrier-detail, data-model.md § Inventory
 * unit): the declared event — the key its inventory row is named by — and the
 * matcher groups it declares, in the parser's resolved order (FR-007). The
 * same shape the recognition extracts, so the wire carries what the one
 * scan-time parse resolved rather than a second reading.
 */
export interface HookEventDeclarationDto {
  /** The event name exactly as the carrier's key declares it (FR-007). */
  readonly event: string;
  /**
   * The matcher groups this event declares, in authored order, each as the
   * parser resolved it: a group is one item of the event's declared list, and
   * what it holds — a matcher, the handlers under it, a timeout, a status
   * message — is the carrier's own literal text, never a resolved environment
   * value and never a command this product runs (FR-020, FR-026).
   *
   * A value, not an entry list, because a group has no key: the event's own
   * list is what orders them, and an item can be anything the author wrote —
   * including a scalar a reader needs to see stated as the malformed group it
   * is rather than silently dropped.
   */
  readonly groups: readonly DeclaredValueDto[];
}

/**
 * The result of `get-hook-carrier-detail`: one hook carrier's declarations
 * (contracts/http-api.md § get-hook-carrier-detail) — the file's own facts and
 * the events it declares, and deliberately no `sourceText` field at all: a
 * file admitted so its declarations can be published shows those declarations
 * and never its own bytes (FR-007), which is why this is its own function's
 * result rather than a {@link FileDetailDto} variant.
 *
 * A union rather than one shape with an optional field, because the two
 * documented forms differ in what the carrier itself declares
 * ({@link HookCarrierForm}): a standalone file's remaining top-level keys are
 * this recognition's to publish, while a contained table's neighbours belong to
 * the settings recognition of the same file, which serves that document whole.
 */
export type HookCarrierDetailDto = StandaloneHookCarrierDetailDto | ContainedHookCarrierDetailDto;

/** What a hook carrier's detail carries whichever form it takes. */
interface HookCarrierDetailBase {
  /**
   * The committed carrier's own facts — path, read outcome, size,
   * diagnostics — without its source text (FR-007).
   */
  readonly file: CustomizationFileSummaryDto;
  /**
   * The events the carrier declares, one per declared event in the parser's
   * resolved order — empty when it declares none — or null exactly when
   * extraction failed all-or-nothing (FR-028): nothing was parsed, the rows
   * are unknown rather than absent, and the failure's Diagnostic is in
   * `diagnostics`.
   */
  readonly events: readonly HookEventDeclarationDto[] | null;
  /** The file-scoped Diagnostic records the file's own `diagnosticIds` name (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/**
 * A file whose whole purpose is hooks: a Codex `.codex/hooks.json` and the
 * standalone carriers the other vendors document.
 */
export interface StandaloneHookCarrierDetailDto extends HookCarrierDetailBase {
  /** Discriminant: the carrier is a file of its own; see {@link HookCarrierForm}. */
  readonly carrier: 'standalone';
  /**
   * What the carrier declares about itself — every top-level key beside the
   * hook map, such as a Codex `hooks.json`'s optional `description` — by the
   * keys the file wrote and in the parser's resolved order (FR-007). Empty
   * when it declares none, and empty for a failed extraction.
   *
   * Published because nothing else publishes it: this file has one
   * recognition, so a key this response omits is a key no surface shows.
   */
  readonly carrierFields: readonly DeclaredEntryDto[];
}

/**
 * A hook table inside a file admitted for other content too: an inline Codex
 * `[hooks]` table in a `.codex/config.toml`, whose other keys are the settings
 * recognition's own content.
 */
export interface ContainedHookCarrierDetailDto extends HookCarrierDetailBase {
  /** Discriminant: the carrier contains the hook table among other content. */
  readonly carrier: 'contained';
}

/**
 * The result of `get-permission-policy-detail`: one declared permission
 * policy, in the form the declaring product spells it
 * (contracts/http-api.md § get-permission-policy-detail).
 *
 * Its own function's result rather than a {@link FileDetailDto} variant
 * because a permissions row names a policy, not a file (data-model.md
 * § Inventory unit): one vendor writes the policy as a document of its own,
 * and another declares it inside a settings file whose remaining keys are a
 * different recognition's content, so a file-shaped result would have to
 * answer for a file it is not about. The declaring file's path is how the
 * policy is addressed, exactly as the row names it.
 */
export type PermissionPolicyDetailDto =
  PermissionPolicyDocumentDetailDto | PermissionPolicyBlockDetailDto;

/** What a permission-policy detail carries whichever form its policy takes. */
interface PermissionPolicyDetailBase {
  /** The file-scoped Diagnostic records the declaring file's `diagnosticIds` name (FR-028). */
  readonly diagnostics: readonly SerializedDiagnostic[];
}

/**
 * A policy whose declaring file is the policy: a Codex
 * `.codex/rules/*.rules` file is the whole document its author wrote, and
 * nothing is read out of it — enumerating its `prefix_rule()` entries would
 * need a Starlark parser this product does not carry, and the document shows
 * every entry anyway — so there is no extraction and no extraction diagnostic.
 */
export interface PermissionPolicyDocumentDetailDto extends PermissionPolicyDetailBase {
  /** Discriminant: the declaring file's whole content is the policy. */
  readonly form: 'whole-document';
  /**
   * The committed file that is the policy, with its complete authored source.
   */
  readonly file: CustomizationFileDto;
}

/**
 * A policy one block of a larger document declares: a Claude settings file's
 * `permissions` object, whose remaining keys are the `settings/config`
 * recognition's content and reach no permissions response.
 *
 * The file's own bytes are absent from the shape rather than withheld at
 * render time (FR-007), which is why the file arrives as the content-free
 * summary an MCP carrier's detail also carries.
 */
export interface PermissionPolicyBlockDetailDto extends PermissionPolicyDetailBase {
  /** Discriminant: the policy is one block of a carrier. */
  readonly form: 'declared-block';
  /**
   * The committed carrier's own facts — path, read outcome, size,
   * diagnostics — without its source text (FR-007).
   */
  readonly file: CustomizationFileSummaryDto;
  /**
   * The declared block's own entries, in the parser's resolved order — every
   * key the authored object holds, because an allowlist of some of them would
   * drop authored policy without being able to say which — or null exactly
   * when extraction failed all-or-nothing (FR-028): nothing was parsed, the
   * block is unknown rather than absent, and the failure's Diagnostic is in
   * `diagnostics`. A carrier declaring no block is no row and no detail at
   * all, so null never means "declares none".
   */
  readonly declaredPolicy: readonly DeclaredEntryDto[] | null;
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
  | InstructionFileDetailDto
  | SkillFileDetailDto
  | AgentFileDetailDto
  | PromptFileDetailDto
  | RuleFileDetailDto
  | OutputStyleFileDetailDto
  | SettingsFileDetailDto
  | UnrecognizedFileDetailDto;

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
  /** One consent-gated member Global Source. */
  | 'global';

/**
 * One Global member: the three tool homes and the shared agent home
 * (spec.md § FR-013, FR-045). A member is what one preview entry, one control,
 * and at most one Global Source are about; `agents` is `~/.agents`, the
 * directory Codex and Copilot document for personal skills and the personal
 * plugin marketplace, which no setting relocates. Every `…Tools`-spelled
 * control and batch field carries these member ids
 * (contracts/http-api.md § create-global-consent-preview).
 */
export type GlobalMemberId = SupportedTool | 'agents';

/**
 * What every Source's projection carries, whatever its family. The `kind`
 * and `member` discriminants live on the two variants, because they move
 * together: a Repository Source has no member and a Global Source always has
 * one, so declaring them independently would let the combinations that are
 * not constructible type-check ({@link SourceDto}).
 */
export interface SourceDtoBase {
  /** Opaque stable Source identity; the Repository's survives every commit. */
  readonly sourceId: string;
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
 * One Source's public projection (spec.md § Key Entities · Source), as the
 * discriminated union of its two families: the discriminant is `kind`, and
 * `member` narrows with it, so a Repository Source carrying a member — or a
 * Global Source carrying none — does not type-check (tasks.md T1001). The
 * union exists because a second Source kind is constructible: the type is
 * where the impossible combinations have to stop.
 */
export type SourceDto =
  /** The one Source selected from the invocation Repository boundary. */
  | (SourceDtoBase & {
      /** Selects the Repository family. */
      readonly kind: 'repository';
      /** A Repository Source is no member's; the field stays for one-shape reads. */
      readonly member: null;
    })
  /** One consent-gated member Global Source (FR-013, FR-045). */
  | (SourceDtoBase & {
      /** Selects the Global family. */
      readonly kind: 'global';
      /** The member whose consented root this Source is. */
      readonly member: GlobalMemberId;
    });

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
 * An application a detail surface can hand its file to
 * (contracts/http-api.md § open-file). The host performs the launch, so the
 * member names what the reader chose rather than how it is carried out.
 */
export type FileOpenTarget =
  /** The Visual Studio Code installation the host resolved on this machine. */
  | 'visual-studio-code'
  /** The Sublime Text installation the host resolved on this machine. */
  | 'sublime-text'
  /**
   * The editor `$EDITOR` or `$VISUAL` names, in a terminal window the host
   * opens for it. Offered only where the host can open that window and the
   * named editor is one that needs it.
   */
  | 'terminal-editor'
  /** Whatever the reader's machine has registered for that kind of file. */
  | 'default-application'
  /**
   * The directory the file is in, in the machine's own file manager. The one
   * target that opens something other than the file, which is why it is a
   * target rather than a second command: a reader choosing where to open the
   * file they are looking at is choosing between applications, and this is one
   * of them.
   */
  | 'containing-folder';

/**
 * The parameter of `open-file`: which committed file to hand over, and to
 * which application (contracts/http-api.md § open-file).
 *
 * The file is named by its whole identity, exactly as `get-file-detail` names
 * one ({@link FileDetailParams}): a consented Global home and the selected
 * repository can hold the same Source-relative Path, and each Source has its
 * own root, so a path alone would hand the reader a different file than the
 * page they clicked on is showing (FR-030).
 */
export interface FileOpenParams {
  /** The file's Source-relative Path, exactly as the inventory published it. */
  readonly sourceRelativePath: string;
  /** Which Source holds it; see {@link SourceSelector}. */
  readonly source: SourceSelector;
  /** The application to hand it to; see {@link FileOpenTarget}. */
  readonly target: FileOpenTarget;
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
  /**
   * The applications this host can hand a committed file to, in the order a
   * detail surface offers them, the one a plain click uses first
   * (contracts/http-api.md § open-file). A target the host could not launch
   * is absent rather than offered and left to fail, which is why the list is
   * the host's to publish: the page holds no absolute path and cannot probe
   * the machine for itself.
   */
  readonly fileOpenTargets: readonly FileOpenTarget[];
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
   * The custom-agent inventory: one entry per agent name the admitting rules
   * resolve, in name order, each listing the files that define it; the one
   * null-named entry closes the list with the files publishing no name
   * (data-model.md § Inventory unit).
   */
  readonly agents: readonly AgentInventoryEntryDto[];
  /**
   * The prompts-and-commands inventory: one entry per name a reader invokes,
   * in name order, each listing the prompt or command files that resolve it
   * (data-model.md § Inventory unit). Named for the kind rather than for the
   * command half of it, so the field stays right as the kind's other
   * locations ship.
   */
  readonly prompts: readonly PromptInventoryEntryDto[];
  /**
   * The rules inventory: one entry per recognized rule file — modular
   * instructions a product loads into context — in Source-relative Path
   * order (data-model.md § Inventory unit).
   */
  readonly rules: readonly RuleInventoryEntryDto[];
  /**
   * The permissions inventory: one entry per declared permission policy — a
   * policy deciding which commands or tools a product may run — named by the
   * path of the file that declares it, in Source-relative Path order
   * (data-model.md § Inventory unit).
   */
  readonly permissions: readonly PermissionsInventoryEntryDto[];
  /**
   * The hook inventory: one entry per declared lifecycle event, in event
   * order, each listing the declarations that declare it; the one null-named
   * entry closes the list with the carriers publishing no event
   * (data-model.md § Inventory unit).
   */
  readonly hooks: readonly HookInventoryEntryDto[];
  /**
   * The plugin inventory: one entry per declared plugin name, in name order,
   * each listing every carrier that resolves it; the one null-named entry
   * closes the list with the carriers declaring no name
   * (contracts/http-api.md § get-session `plugins[]`).
   */
  readonly plugins: readonly PluginInventoryEntryDto[];
  /**
   * The output-style inventory, one row per style name a tool selects
   * (contracts/http-api.md § get-session `outputStyles[]`), sorted by name.
   */
  readonly outputStyles: readonly OutputStyleInventoryEntryDto[];
  /**
   * The settings-and-configuration inventory: one entry per recognized
   * settings or configuration file — the file a product reads its settings
   * from — in Source-relative Path order, because the kind's unit is the file
   * (data-model.md § Inventory unit). Named for the leading half of the kind
   * the way `prompts` is, so the field reads as a plain plural beside the
   * others; the detail route spells the kind out in full, as
   * `/prompts-and-commands/` does.
   */
  readonly settings: readonly SettingsInventoryEntryDto[];
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
  /** Global consent/control projection; null while no consent or control state exists. */
  readonly globalControl: GlobalControlViewDto | null;
  /** The registered enable operation, or null; see {@link GlobalEnableInProgressDto}. */
  readonly globalEnableInProgress: GlobalEnableInProgressDto | null;
  /** Global disable-barrier projection (null scaffold until the disable phase). */
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
 * What the ordered Global lexical-state algorithm assigned to one captured
 * root string, before any filesystem operation
 * (data-model.md § RootPresentationEncoding and Global lexical state). Only
 * `eligible` may become a boundary after consent; the other three are
 * rejections the preview states up front, and each one's control is a
 * path-free rejected control after confirmation.
 */
export type GlobalRootInputState =
  /**
   * The captured string is absolute and well formed. Its exact spelling is
   * frozen into the preview and still carries no read authority: whether the
   * root is usable is decided only by post-consent readable-directory
   * admission.
   */
  | 'eligible'
  /**
   * The tool's environment property is set to the empty string. Only a present
   * override can be empty — an absent property selects the documented default
   * — so this state never applies to a default home.
   */
  | 'present-empty'
  /** Active-platform `node:path.isAbsolute` returned false for the string. */
  | 'relative'
  /**
   * The string holds U+0000, or its UTF-16 is not well formed: a high
   * surrogate not followed by a low one, or a low surrogate not preceded by a
   * high one. Such a value is escaped and displayed, never normalized into an
   * authorized path.
   */
  | 'invalid';

/**
 * Where one preview entry's root came from
 * (data-model.md § GlobalConsentPreview `entries[].origin`). An environment
 * entry is used even when its state rejects it: an empty, relative, or invalid
 * override never falls back to the documented default.
 */
export type GlobalRootOrigin =
  /** `node:path.join` of the captured home directory and the tool's fixed suffix. */
  | 'default-home'
  /** The tool's own environment property, which was present. */
  | 'environment';

/**
 * One member's row of the consent preview
 * (data-model.md § GlobalConsentPreview). It carries no `lexicalRoot`: the
 * exact captured string stays in the server-retained record, and what crosses
 * the channel is the one-way escaped presentation of it.
 */
export interface GlobalPreviewEntryDto {
  /** The member this row is about; the four rows are in the contracted order. */
  readonly member: GlobalMemberId;
  /** Where the root came from; see {@link GlobalRootOrigin}. */
  readonly origin: GlobalRootOrigin;
  /**
   * `RootPresentationEncoding` of the captured root: display-only, never
   * decoded, and never a `SourceRelativePath`, inventory-item locator,
   * canonicalization claim, or read authority.
   */
  readonly displayRoot: string;
  /** The state the ordered algorithm assigned; see {@link GlobalRootInputState}. */
  readonly inputState: GlobalRootInputState;
}

/**
 * How a request and a detail route name the Source half of a file's identity
 * (FR-030): the repository's own token, or `global-` and the member whose
 * consented home it is.
 *
 * Never the opaque Source ID, which is minted per launch — a link or a stored
 * request carrying one would stop resolving the moment the inspector
 * restarted. These survive a restart and a reader can read them. At most one
 * Global Source exists per member (contracts/http-api.md § enable-global), so
 * the member identifies one Source unambiguously.
 */
export type SourceSelector = 'repository' | `global-${GlobalMemberId}`;

/**
 * What one `get-file-detail` request names: both halves of the file's identity
 * (contracts/http-api.md § get-file-detail).
 *
 * Both, because both are needed: a consented Global home and the selected
 * repository can hold the same Source-relative Path, and a request naming the
 * path alone is answered by whichever the session lists first — one file's
 * contents under the other's row.
 */
export interface FileDetailParams {
  /** The file's Source-relative Path, exactly as the inventory published it. */
  readonly sourceRelativePath: string;
  /** Which Source holds it; see {@link SourceSelector}. */
  readonly source: SourceSelector;
}

/**
 * How far one Global member has got under the active consent
 * (data-model.md § GlobalToolControl `state`).
 *
 * `unvalidated` is deliberately absent: it exists only inside an
 * operation-local transaction, and the invariant forbids it in any serialized
 * view — a control a client can see has already reached an outcome.
 */
export type GlobalToolState =
  /** Deterministically refused; {@link GlobalToolControlDto.failureCode} says why. */
  | 'rejected'
  /** The root passed admission but no Source has been published for it yet. */
  | 'admitted'
  /** Exactly one Source exists for this member. */
  | 'published';

/**
 * Why one Global member has no published Source
 * (data-model.md § GlobalToolControl `failureCode`). None of these carries a
 * path or an environment value: the code is the failure, and the client
 * renders the sentence it names.
 */
export type GlobalToolFailureCode =
  /** The member's environment property was set to the empty string. */
  | 'present-empty'
  /** The captured root is not absolute on this platform. */
  | 'relative'
  /** The captured root holds U+0000 or ill-formed UTF-16. */
  | 'invalid'
  /** The consented root is missing or is not a readable directory. */
  | 'root-unreadable'
  /** The member's own scan of an admitted root failed deterministically. */
  | 'scan-failed';

/**
 * Whether the same consent can be retried for one rejected member
 * (data-model.md § GlobalToolControl `retryDisposition`).
 */
export type GlobalRetryDisposition =
  /** The frozen preview still applies; retry may re-admit this tool. */
  | 'same-preview'
  /** The rejection is lexical, so a different root — and a new preview — is required. */
  | 'new-preview-required';

/** One Global member's public control projection (data-model.md § GlobalToolControl). */
export interface GlobalToolControlDto {
  /** The member this control is about; one exists per evaluated member while consent is active. */
  readonly member: GlobalMemberId;
  /** How far this tool has got; see {@link GlobalToolState}. */
  readonly state: GlobalToolState;
  /** Non-null exactly while this tool has failed and has no published Source. */
  readonly failureCode: GlobalToolFailureCode | null;
  /** Null unless `rejected`; see {@link GlobalRetryDisposition}. */
  readonly retryDisposition: GlobalRetryDisposition | null;
}

/**
 * The coarse phase of one accepted Global batch
 * (data-model.md § GlobalControlView `GlobalBatchStatus`).
 */
export type GlobalBatchPhase =
  /** Queued and not yet started. */
  | 'waiting'
  /** Reading each vendor's configuration before enumerating. */
  | 'deriving'
  /** Walking the admitted roots' named targets. */
  | 'enumerating'
  /** Reading admitted candidate files. */
  | 'reading'
  /** Attaching each tool's recognition to what was read. */
  | 'recognizing'
  /** Terminal failure; `failureRef` says what happened. */
  | 'failed';

/**
 * Why one accepted Global batch failed
 * (data-model.md § GlobalControlView). A deterministic failure is always
 * attributed to at least one exact tool, whose own control carries the reason;
 * anything else is the failed request's error, recorded once for the batch.
 */
export type GlobalBatchFailureRef =
  | {
      /** One or more members failed deterministically. */
      readonly kind: 'tool-failures';
      /** The non-empty fixed-order members this batch failed; reasons live on their controls. */
      readonly failedTools: readonly GlobalMemberId[];
    }
  | {
      /** The batch ended with a failure not confined to one tool's files. */
      readonly kind: 'error';
      /** The failed request's own error message, as it arrived. */
      readonly message: string;
    };

/** One accepted Global batch's status (data-model.md § GlobalControlView). */
export interface GlobalBatchStatusDto {
  /** The one request ID this batch and its committed generation share. */
  readonly scanRequestId: string;
  /** The non-empty fixed-order admitted member subset this batch scans. */
  readonly tools: readonly GlobalMemberId[];
  /** Coarse phase; see {@link GlobalBatchPhase}. */
  readonly phase: GlobalBatchPhase;
  /** Null except in `failed`; see {@link GlobalBatchFailureRef}. */
  readonly failureRef: GlobalBatchFailureRef | null;
}

/**
 * The Global consent and control projection, returned in every snapshot while
 * consent or retained control state is active (data-model.md
 * § GlobalControlView). It carries no admitted root and no source content: the
 * separately fetched frozen preview supplies the exact displayed roots.
 */
export interface GlobalControlViewDto {
  /** `disabling` from barrier acceptance until the field becomes null. */
  readonly state: 'active' | 'disabling';
  /** The active frozen preview's opaque ID; neither a path nor an authority. */
  readonly previewId: string;
  /** The fixed all-members consent set; never client-selected. */
  readonly confirmedTools: readonly GlobalMemberId[];
  /** One control per evaluated member, in the fixed member order. */
  readonly controls: readonly GlobalToolControlDto[];
  /** Admitted members owned by one accepted batch, sorted; empty otherwise. */
  readonly pendingTools: readonly GlobalMemberId[];
  /** Non-null from accepted queueing through terminal success or failure. */
  readonly batchStatus: GlobalBatchStatusDto | null;
  /** The exact server-derived retryable member subset, sorted; empty while `disabling`. */
  readonly retryableTools: readonly GlobalMemberId[];
}

/**
 * The authority-free projection of a registered enable operation
 * (data-model.md § GlobalEnableOperation). It exposes no tool outcome, root,
 * context, Source, job, or authority — only that one is running, which is what
 * makes a duplicate enable a conflict rather than a second transaction.
 */
export interface GlobalEnableInProgressDto {
  /** Which lifecycle is registered. */
  readonly kind: 'initial-enable' | 'retry';
  /** The coordinator's opaque command ID. */
  readonly operationId: string;
  /** The frozen preview the whole operation is bound to. */
  readonly previewId: string;
}

/**
 * What one accepted `enable-global` invocation returns
 * (contracts/http-api.md § enable-global).
 */
export interface GlobalEnableResultDto {
  /** `queued` when at least one root was admitted; otherwise `active-no-job`. */
  readonly state: 'queued' | 'active-no-job';
  /** The one shared batch request ID, or null for `active-no-job`. */
  readonly scanRequestId: string | null;
  /** The members this transaction admitted, in fixed member order. */
  readonly acceptedTools: readonly GlobalMemberId[];
  /** The members this transaction refused, in fixed member order; disjoint from accepted. */
  readonly rejectedTools: readonly GlobalMemberId[];
}

/**
 * The no-I/O preview a reader confirms before any User-Global path is
 * authorized (contracts/http-api.md § create-global-consent-preview). Creating
 * or returning it performs no filesystem operation under any proposed Global
 * root.
 *
 * It carries no per-pattern path display: what is read below an admitted root
 * is fixed by the shipped traversal plan the
 * `allowlistVersion`/`traversalPlanVersion` pair identifies, and the consent
 * copy explains that scope in plain language.
 */
export interface GlobalConsentPreviewDto {
  /**
   * Opaque lookup reference for the server-retained record: the canonical
   * unpadded base64url encoding of an independent 32-byte CSPRNG draw. It is
   * neither a filesystem path nor any grant of authority, and the later enable
   * request names it so the server acts on its own stored record.
   */
  readonly previewId: string;
  /** The shipped presentation-allowlist contract version this preview binds. */
  readonly allowlistVersion: string;
  /** The shipped compiled traversal-plan set version this preview binds. */
  readonly traversalPlanVersion: string;
  /** Exactly four rows: Copilot, Claude, Codex, then the shared agent home. */
  readonly entries: readonly GlobalPreviewEntryDto[];
  /**
   * The excluded rules' IDs, sorted, which drive the displayed exclusions. A
   * surface renders each through its registry record rather than the ID, and
   * the field is typed as the closed union rather than as `string` so the
   * lookup that finds that record cannot miss (AGENTS.md § User-visible copy
   * policy).
   */
  readonly excludedRuleIds: readonly RuleId[];
}

/**
 * Re-exported so API consumers resolve every wire type from one module.
 * `SourceStatus` is declared in `entities.ts` beside its display text, the
 * same split `FileEncoding` already uses: the closed vocabulary lives with
 * the entities, the DTO that carries it lives here.
 */
export type { RejectionCode, RuleId, SerializedDiagnostic, SourceStatus };
