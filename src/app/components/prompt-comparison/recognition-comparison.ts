// Prompt and command recognition-metadata comparison (T505; FR-011, FR-012,
// research.md § 7): the comparison separates its facts by what each is a
// fact about. Which tools recognize each compared file — on which surfaces,
// and under which name a reader invokes it — is a recognition fact, compared
// per tool so each recognition stays distinguishable from the physical file
// (US3 scenario 2). The declared metadata is the file's one scan-time parse
// for the kind (FR-028), so it is compared once — a tool is not a coordinate
// of a declaration, and rendering the same file-level fact under each
// recognizing tool would publish one fact as many: each side's frontmatter
// serializes to one canonical YAML document, every key sorted, and the two
// documents are what Monaco diffs (research.md § 7, frontmatter-yaml.ts).
// This module is the data half, kept out of the component so the decisions
// are testable without a single-file-component compiler.
//
// The invocation name is what this kind adds to the skill and instruction
// models, and it is per `(file, tool)` rather than per file: the admitting
// rule answers it, and this kind's two locations answer differently — a
// command file's name is derived from the path while a VS Code prompt file
// declares its own (data-model.md § Inventory unit). Two files reach one
// comparison by resolving one name, so a cell restating that name is not the
// row's identity repeated: it is this tool's reading of this file, which is
// the fact a reader opened the pair to see.
//
// No key leads the canonical document, unlike the skill comparison's `name`
// and `description`: the name a row is keyed by is the rule's answer rather
// than one declared key, and a command file's `name` key is ignored by both
// products that read it, so promoting it would give one half of the kind an
// identity it does not have.
//
// A side cell is the definition itself or null. Nothing derived from that
// presence is stored beside it — no recognized flag, no separately held
// surface list — because two states can disagree and one cannot
// (AGENTS.md § Implementation simplicity policy): what a cell holds is one
// tool's definition of one file, and its absence is the whole of "this tool
// does not read this file".
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist, what each rests on, what each is invoked
// by, and what each side's frontmatter serializes to. Its closed shape
// carries no rank, no winner, and no fabricated rows — relationships above
// all, because a prompt or command file publishes no edge for the wire to
// carry, and a name its prompt mentions stays text in the source diff
// (api-types.ts § PromptFileDetailDto, FR-019).
import { canonicalFrontmatterYamlText } from '../inspection/frontmatter-yaml';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type {
  FileDetailDto,
  MarkdownPresentationDto,
  PromptDefinitionDto,
} from '../../../shared/api-types';

/**
 * One definition of a compared file, together with the name of the inventory
 * row it sits under. The pair is what the snapshot holds apart — a row is
 * one name and a definition is one `(file, tool)` — so the page carries them
 * together rather than either alone (api-types.ts § PromptInventoryEntryDto).
 */
export interface PromptSideDefinition {
  /** The name this definition's tool invokes the file by; the owning row's. */
  readonly invocationName: string;
  /** The inventory definition itself: the file, its tool, and its surfaces. */
  readonly definition: PromptDefinitionDto;
}

/**
 * One side of the comparison: the file's detail and every definition the
 * committed prompts-and-commands inventory attaches to that file, each with
 * its own row's name. The definitions come from the snapshot the page
 * already holds, because which tools recognize a file — and what each
 * invokes it by — is the inventory's fact, not the detail's
 * (api-types.ts § PromptFileDetailDto).
 *
 * Gathered across rows rather than taken from the owning one, because a file
 * two products invoke by different names is a definition on each of those
 * names' rows: the pair's own row says why the two files are comparable, and
 * this list says what each tool actually reads the file as.
 */
export interface PromptComparisonSideInput {
  /** The compared file's detail, exactly as adopted. */
  readonly detail: FileDetailDto;
  /** Every definition of this side's file, one per recognizing tool. */
  readonly definitions: readonly PromptSideDefinition[];
}

/**
 * What one side's declared metadata is: the file's one parse for the
 * `prompt/command` kind, or the stated reason no parsed declarations exist
 * to compare. No absent or foreign-kind state exists: the compare route
 * accepts only committed files of this kind.
 */
export type PromptDeclarationSideState =
  /** A detail with a parsed presentation: its declarations serialize into the diff. */
  | 'parsed'
  /**
   * A detail without a parsed presentation: the all-or-nothing extraction
   * failed, so the declarations are unknown, not absent (FR-028), and this
   * side serializes nothing. The row's name survives it, because this kind's
   * name is never read out of the parse (api-types.ts § PromptDefinitionDto).
   */
  | 'extraction-failed';

/**
 * What a side's declaration state reads as after its "First file"/"Second
 * file" label, beside its union so a new member cannot compile without its
 * sentence (AGENTS.md § User-visible copy policy). 'parsed' yields no
 * sentence: the serialized diff is a parsed side's statement.
 */
export const PROMPT_DECLARATION_SIDE_STATE_TEXT: Readonly<
  Record<PromptDeclarationSideState, string>
> = {
  /** The serialized diff is this side's statement; no sentence stands in for it. */
  parsed: '',
  /** The declarations are unknown, not absent (FR-028). */
  'extraction-failed':
    'is recognized, but its declarations could not be parsed, so they are unknown.',
};

/**
 * One tool's recognition compared across the two files: a row of the tool
 * recognition table, in the contracted tool order, so each recognition
 * remains distinguishable from the physical file (US3 scenario 2).
 *
 * A class whose constructor derives both side cells (AGENTS.md § Class and
 * interface policy): the constructor is the one place that says how the
 * row's data came to be.
 */
export class PromptToolRecognitionRow {
  /** The tool whose recognition this row compares. */
  public readonly tool: SupportedTool;

  /** The recognized kind; every recognition this surface compares is this kind's. */
  public readonly kind: 'prompt/command';

  /**
   * This tool's definition of the first file, or null when the tool attaches
   * none. The definition carries both typed facts the cell states — the
   * surfaces the admissions rest on, and the name this tool invokes the file
   * by — and its absence is the whole of "not recognized", so no state flag
   * stands beside it. Naming a surface is never a claim that the surface
   * loaded the file, and stating a name is never a claim that typing it
   * would reach it (FR-009).
   */
  public readonly left: PromptSideDefinition | null;

  /** This tool's definition of the second file; see {@link left}. */
  public readonly right: PromptSideDefinition | null;

  /** Derives one tool's two side cells from the compared sides. */
  public constructor(
    tool: SupportedTool,
    left: PromptComparisonSideInput,
    right: PromptComparisonSideInput,
  ) {
    this.tool = tool;
    this.kind = 'prompt/command';
    this.left = definitionOf(left, tool);
    this.right = definitionOf(right, tool);
  }
}

/**
 * The recognition-metadata comparison of one prompt-and-command pair
 * (FR-011): the per-tool recognition rows, each side's declaration state,
 * and the canonical serialized document each side's parse becomes — built
 * once for the pair, because the declarations are the files' rather than any
 * recognition's.
 *
 * A class whose constructor derives the whole comparison from the two sides
 * (AGENTS.md § Class and interface policy).
 */
export class PromptRecognitionComparison {
  /**
   * One row per tool recognizing either side, in the contracted tool order
   * rather than any preference (US3 scenario 2). Empty exactly when no
   * compared file carries a definition — then there is no recognition
   * metadata to compare, and none is fabricated.
   */
  public readonly tools: readonly PromptToolRecognitionRow[];

  /** What the first file's declared metadata is; see {@link PromptDeclarationSideState}. */
  public readonly leftDeclarations: PromptDeclarationSideState;

  /** What the second file's declared metadata is; see {@link PromptDeclarationSideState}. */
  public readonly rightDeclarations: PromptDeclarationSideState;

  /**
   * The two canonical YAML documents the frontmatter diff mounts — every key
   * sorted, with no leading identity pair — or null unless both sides are
   * 'parsed': an unparsed side's declarations are unknown, and nothing may
   * be diffed against them (FR-028).
   */
  public readonly frontmatterDiff: {
    /** The first side's canonical document (frontmatter-yaml.ts). */
    readonly originalText: string;
    /** The second side's canonical document. */
    readonly modifiedText: string;
  } | null;

  /** Derives the pair's recognition rows, declaration states, and diff documents. */
  public constructor(left: PromptComparisonSideInput, right: PromptComparisonSideInput) {
    const tools: PromptToolRecognitionRow[] = [];
    for (const tool of SUPPORTED_TOOL_ORDER) {
      const row = new PromptToolRecognitionRow(tool, left, right);
      // A row exists only where a recognition exists: a tool recognizing
      // neither file builds none.
      if (row.left !== null || row.right !== null) {
        tools.push(row);
      }
    }
    this.tools = tools;
    // Read once per side, so the stated state and the diffed document cannot
    // disagree about whether the file parsed.
    const leftPresentation = presentationOf(left);
    const rightPresentation = presentationOf(right);
    this.leftDeclarations = leftPresentation === null ? 'extraction-failed' : 'parsed';
    this.rightDeclarations = rightPresentation === null ? 'extraction-failed' : 'parsed';
    this.frontmatterDiff =
      leftPresentation !== null && rightPresentation !== null
        ? {
            originalText: canonicalFrontmatterYamlText(leftPresentation.frontmatter, []),
            modifiedText: canonicalFrontmatterYamlText(rightPresentation.frontmatter, []),
          }
        : null;
  }
}

/**
 * One side's parse, or null when there is none. The parse is the file's, one
 * per kind (FR-028), and every Markdown kind's variant carries the same one
 * for the same bytes (candidate.ts § recognizePrompt), so this asks what the
 * adopted variant carries rather than requiring it to be this kind's: one
 * file can hold two Markdown kinds — a `.claude/commands/CLAUDE.md` is a
 * Claude command by its directory and a Claude instruction file by its name —
 * while `get-file-detail` is addressed by the path alone and answers with the
 * first variant its fixed order reaches, so a surface that required its own
 * kind would report a parsed file as unparsed (session.ts § fileDetail). The
 * two excluded variants are the ones that carry no parse at all: a rule file
 * is published whole, and an unrecognized file has nothing read out of it.
 */
function presentationOf(side: PromptComparisonSideInput): MarkdownPresentationDto | null {
  const detail = side.detail;
  if (detail.kind === 'rule' || detail.kind === 'file') {
    return null;
  }
  return detail.presentation;
}

/**
 * One tool's definition of a side's file, or null when it attaches none. A
 * loop rather than `find`, so the returned value is narrowed by the
 * comparison the control flow already made rather than by a callback whose
 * narrowing does not reach here (AGENTS.md § Class and interface policy).
 */
function definitionOf(
  side: PromptComparisonSideInput,
  tool: SupportedTool,
): PromptSideDefinition | null {
  for (const entry of side.definitions) {
    if (entry.definition.tool === tool) {
      return entry;
    }
  }
  return null;
}
