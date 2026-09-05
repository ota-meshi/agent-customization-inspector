// Skill recognition-metadata comparison (T198; FR-011, FR-012, research.md
// § 7): the comparison separates its two facts by what each is a fact
// about. Which tools recognize each compared file is a recognition fact,
// compared per tool so each recognition stays distinguishable from the
// physical file (US3 scenario 2). The declared metadata is the file's one
// scan-time parse for the kind (FR-028), so it is compared once — a tool is
// not a coordinate of a declaration, and rendering the same file-level fact
// under each recognizing tool would publish one fact as many: each side's
// frontmatter serializes to one canonical YAML document — the documented
// skill keys leading in their reading order, every other key sorted — and the
// two documents are what Monaco diffs (research.md § 7, frontmatter-yaml.ts,
// declaration-order.ts). This module is
// the data half, kept out of the component so the decisions are testable
// without a single-file-component compiler.
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist and how the files' declarations compare,
// and its closed shape carries no rank, no winner, and no fabricated rows —
// relationships in particular, because no shipped recognition publishes an
// edge for the wire to carry (api-types.ts § FileDetailDto).
import { canonicalFrontmatterYamlText } from '../inspection/frontmatter-yaml';
import { LEADING_SKILL_FRONTMATTER_KEYS } from '../inspection/declaration-order';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type { VendorSurface } from '../../../shared/registries/behavior-types';
import type {
  FileDetailDto,
  DeclaredEntryDto,
  SkillDefinitionDto,
} from '../../../shared/api-types';

/**
 * One side of the comparison: the file's detail and the recognitions the
 * committed inventory attaches to that file — one definition per
 * `(file, tool)` (FR-007). The definitions come from the snapshot the page
 * already holds, because which tools recognize a file is the inventory's
 * fact, not the detail's.
 */
export interface ComparisonSideInput {
  /** The compared file's detail, exactly as adopted. */
  readonly detail: FileDetailDto;
  /** The inventory's definitions of this file, one per recognizing tool. */
  readonly definitions: readonly SkillDefinitionDto[];
}

/**
 * What one side holds of one tool's recognition. Recognition is the
 * definition's existence and nothing more: whether the file's declarations
 * parsed is the file's own fact (FR-028), stated by the declaration half of
 * the comparison rather than repeated per tool.
 */
export type RecognitionSideState =
  /** The tool attaches a recognition to this side's file. */
  | 'recognized'
  /** The tool attaches no recognition to this side's file. */
  | 'not-recognized'
  /** A one-sided comparison's absent side: there is no file here at all. */
  | 'file-absent';

/**
 * What a recognition cell reads as, beside its union so a new member cannot
 * compile without its text (AGENTS.md § User-visible copy policy).
 */
export const RECOGNITION_SIDE_STATE_TEXT: Readonly<Record<RecognitionSideState, string>> = {
  /** The tool recognizes this side's file. */
  recognized: 'Recognized',
  /** The tool attaches no recognition to this side's file. */
  'not-recognized': 'Not recognized',
  /** The absence itself: a one-sided comparison's stated absent side (FR-011). */
  'file-absent': 'No file',
};

/**
 * What one side's declared metadata is: the file's one parse for the skill
 * kind, or the stated reason no parsed declarations exist to compare.
 */
export type DeclarationSideState =
  /** A detail with a parsed presentation: its declarations serialize into the diff. */
  | 'parsed'
  /**
   * A detail whose all-or-nothing extraction failed: its declarations are
   * unknown, not absent (FR-028), so this side serializes nothing.
   */
  | 'extraction-failed'
  /** A present file no skill recognition owns: it publishes no declarations. */
  | 'not-a-skill'
  /** A one-sided comparison's absent side (FR-011). */
  | 'file-absent';

/**
 * What a side's declaration state reads as after its "First file"/"Second
 * file" label, beside its union so a new member cannot compile without its
 * sentence (AGENTS.md § User-visible copy policy). 'parsed' and 'file-absent'
 * yield no sentence: the serialized diff is a parsed side's statement, and an
 * absent side is stated by the diff's own absent side and by the recognition
 * rows' "no file" cells.
 */
export const DECLARATION_SIDE_STATE_TEXT: Readonly<Record<DeclarationSideState, string>> = {
  /** The serialized diff is this side's statement; no sentence stands in for it. */
  parsed: '',
  /** The declarations are unknown, not absent (FR-028). */
  'extraction-failed':
    'is recognized as a skill, but its declarations could not be parsed, so they are unknown.',
  /** No skill recognition owns the file, so it has nothing declared here. */
  'not-a-skill': 'is not recognized as a skill, so it has no declared metadata to compare.',
  /** The diff's own absent side states the absence. */
  'file-absent': '',
};

/**
 * One tool's recognition compared across the two files: a row of the tool
 * recognition table, in the contracted tool order, so each recognition
 * remains distinguishable from the physical file (US3 scenario 2).
 *
 * A class whose constructor derives both side states: the constructor is the
 * one place that says how the row's data came to be (AGENTS.md § Class and
 * interface policy).
 */
export class ToolRecognitionRow {
  /** The tool whose recognition this row compares. */
  public readonly tool: SupportedTool;

  /** What the first file holds of this tool's recognition. */
  public readonly left: RecognitionSideState;

  /** What the second file holds of this tool's recognition. */
  public readonly right: RecognitionSideState;

  /**
   * The surfaces of the documented behaviors the first side's admitting rules
   * rest on, in the closed surface order, or empty when that side holds no
   * recognition of this tool. Stated beside the recognition because FR-009
   * states them beside every recognition, however many the product has:
   * without them this surface would be the one place a recognition appears
   * without the surfaces that narrow what reads the file.
   */
  public readonly leftSurfaces: readonly VendorSurface[];

  /** The second side's surfaces; see {@link leftSurfaces}. */
  public readonly rightSurfaces: readonly VendorSurface[];

  /** Derives one tool's two side states and their surfaces from the compared sides. */
  public constructor(
    tool: SupportedTool,
    left: ComparisonSideInput | null,
    right: ComparisonSideInput | null,
  ) {
    this.tool = tool;
    this.left = recognitionState(left, tool);
    this.right = recognitionState(right, tool);
    this.leftSurfaces = recognitionSurfaces(left, tool);
    this.rightSurfaces = recognitionSurfaces(right, tool);
  }
}

/**
 * The recognition-metadata comparison of one compared pair (FR-011): the
 * per-tool recognition rows, each side's declaration state, and the canonical
 * serialized document each side's parse becomes — built once for the pair,
 * because the declarations are the files' rather than any recognition's. A null side is
 * the stated absence of a one-sided comparison, whose present side's
 * recognitions and declarations stand alone (T203).
 *
 * A class whose constructor derives the whole comparison from the two sides
 * (AGENTS.md § Class and interface policy).
 */
export class SkillRecognitionComparison {
  /**
   * One row per tool recognizing a present side, in the contracted tool
   * order rather than any preference (US3 scenario 2). Empty exactly when no
   * compared file carries a recognition — then there is no recognition
   * metadata to compare, and none is fabricated.
   */
  public readonly tools: readonly ToolRecognitionRow[];

  /** What the first file's declared metadata is; see {@link DeclarationSideState}. */
  public readonly leftDeclarations: DeclarationSideState;

  /** What the second file's declared metadata is; see {@link DeclarationSideState}. */
  public readonly rightDeclarations: DeclarationSideState;

  /**
   * The two canonical YAML documents the frontmatter diff mounts, or null
   * when no diff exists to mount: every present side must be 'parsed' — an
   * unparsed side's declarations are unknown, and nothing may be diffed
   * against them (FR-028) — and at least one side must be a file. An absent
   * side is the stated absence: its empty text is diff arithmetic that
   * renders the present side's document as the difference (T203, FR-025).
   */
  public readonly frontmatterDiff: {
    /** The first side's canonical document; empty for a stated absence. */
    readonly originalText: string;
    /** The second side's canonical document; empty for a stated absence. */
    readonly modifiedText: string;
    /** Whether the first side is the one-sided comparison's stated absence. */
    readonly originalAbsent: boolean;
    /** Whether the second side is the stated absence. */
    readonly modifiedAbsent: boolean;
  } | null;

  /**
   * The two instruction texts the body diff mounts — each file with its
   * frontmatter block removed, exactly as the one parse left it (FR-007) — or
   * null under the same conditions {@link frontmatterDiff} is.
   *
   * Its own diff beside the declarations, rather than left to the source
   * comparison, because the two halves are one split and showing only one of
   * them normalized would privilege it: the declarations align key by key
   * whatever order each file wrote them in, and the instructions align line by
   * line without the frontmatter block above them moving the lines. The
   * complete authored source stays below both, which is where every authored
   * spelling is readable (FR-011).
   */
  public readonly bodyDiff: {
    /** The first side's instructions; empty for a stated absence. */
    readonly originalText: string;
    /** The second side's instructions; empty for a stated absence. */
    readonly modifiedText: string;
    /** Whether the first side is the one-sided comparison's stated absence. */
    readonly originalAbsent: boolean;
    /** Whether the second side is the stated absence. */
    readonly modifiedAbsent: boolean;
  } | null;

  /** Derives the pair's recognition rows, declaration states, and diff documents. */
  public constructor(left: ComparisonSideInput | null, right: ComparisonSideInput | null) {
    const tools: ToolRecognitionRow[] = [];
    for (const tool of SUPPORTED_TOOL_ORDER) {
      const row = new ToolRecognitionRow(tool, left, right);
      // A row exists only where a recognition exists: a side that is absent,
      // or a present file the tool does not recognize, builds none by itself.
      if (row.left === 'recognized' || row.right === 'recognized') {
        tools.push(row);
      }
    }
    this.tools = tools;
    // Read once per side, so the stated state and the diffed document cannot
    // disagree about whether the file parsed.
    const leftDeclarations = new SideDeclarations(left);
    const rightDeclarations = new SideDeclarations(right);
    this.leftDeclarations = leftDeclarations.state;
    this.rightDeclarations = rightDeclarations.state;
    const leftEntries = leftDeclarations.entries;
    const rightEntries = rightDeclarations.entries;
    // An absent side pairs as the empty diff operand, so the present side's
    // document renders as the difference rather than vanishing with the pair
    // (T203). A present side without parsed declarations offers nothing to
    // diff, and no document is invented against it (FR-028).
    const leftDiffable = leftEntries !== null || this.leftDeclarations === 'file-absent';
    const rightDiffable = rightEntries !== null || this.rightDeclarations === 'file-absent';
    this.frontmatterDiff =
      leftDiffable && rightDiffable && (leftEntries !== null || rightEntries !== null)
        ? {
            originalText:
              leftEntries === null
                ? ''
                : canonicalFrontmatterYamlText(leftEntries, LEADING_SKILL_FRONTMATTER_KEYS),
            modifiedText:
              rightEntries === null
                ? ''
                : canonicalFrontmatterYamlText(rightEntries, LEADING_SKILL_FRONTMATTER_KEYS),
            originalAbsent: leftEntries === null,
            modifiedAbsent: rightEntries === null,
          }
        : null;
    // The other half of the same one parse, under the same guard: a side that
    // offers no declarations offers no instructions either, because both come
    // from the presentation that failed or was never this kind's.
    this.bodyDiff =
      leftDiffable && rightDiffable && (leftEntries !== null || rightEntries !== null)
        ? {
            originalText: leftDeclarations.bodyText ?? '',
            modifiedText: rightDeclarations.bodyText ?? '',
            originalAbsent: leftEntries === null,
            modifiedAbsent: rightEntries === null,
          }
        : null;
  }
}

/**
 * One side's declared metadata, derived in a single read of its detail: the
 * state the surface states, and the entries a parsed side serializes into the
 * diff. Both from one read, because two values derived separately from one
 * fact can disagree and one cannot (AGENTS.md § Implementation simplicity
 * policy) — a side stated as unparsed whose document is diffed anyway is the
 * disagreement this shape rules out.
 *
 * A class whose constructor derives both members: the constructor is the one
 * place that says how the value's data came to be (AGENTS.md § Class and
 * interface policy).
 */
class SideDeclarations {
  /** What this side's declared metadata is; see {@link DeclarationSideState}. */
  public readonly state: DeclarationSideState;

  /**
   * The declarations a parsed side serializes into the diff, or null when
   * this side has none to serialize: an absence, a file no parse belongs to,
   * or an extraction that failed all-or-nothing (FR-028). Never an empty list
   * standing in for unknown declarations, which would diff as "nothing
   * declared" against the other side's values.
   */
  public readonly entries: readonly DeclaredEntryDto[] | null;

  /**
   * The instructions a parsed side serializes into the body diff — the file
   * with its frontmatter block removed — or null in exactly the cases
   * {@link entries} is null. Read from the same presentation, so the two
   * halves and the stated state cannot disagree about whether the file
   * parsed.
   */
  public readonly bodyText: string | null;

  /** Derives one side's declaration state, entries, and body from its detail. */
  public constructor(side: ComparisonSideInput | null) {
    if (side === null) {
      this.state = 'file-absent';
      this.entries = null;
      this.bodyText = null;
      return;
    }
    // Whether a skill recognition owns this file, which is what
    // {@link DeclarationSideState} 'not-a-skill' means — asked of the
    // inventory's definitions rather than of the adopted variant, because the
    // two disagree exactly where it matters: a census companion that is also
    // its own recognition of another kind — an `AGENTS.md` inside a skill
    // directory, which Copilot reads as an instruction file — arrives as that
    // kind's variant carrying that kind's parse, and taking it would publish
    // an instruction file's declarations as the skill's declared metadata.
    // A file no definition owns declares nothing *here* whatever it declares
    // for itself; its own detail is where its declarations are read.
    if (side.definitions.length === 0) {
      this.state = 'not-a-skill';
      this.entries = null;
      this.bodyText = null;
      return;
    }
    const detail = side.detail;
    // The parse is the file's, one per kind (FR-028), and every Markdown
    // kind's variant carries the same one for the same bytes
    // (candidate.ts § recognizeSkill), so this asks what the adopted variant
    // carries rather than requiring it to be this kind's: `get-file-detail`
    // is addressed by the path alone and answers with the first variant its
    // fixed order reaches (session.ts § fileDetail), which is that function's
    // business rather than this surface's. What the page renders is the
    // document, and every parse-carrying variant holds it the same way. The
    // excluded variants are the ones that carry no Markdown parse at all: a
    // rule file is published whole, a custom agent publishes its declarations
    // without a body, and an unrecognized file has nothing read out of it, so
    // a definition-owning file that somehow arrives as one declares nothing to
    // compare.
    if (
      detail.kind === 'rule' ||
      detail.kind === 'agent' ||
      detail.kind === 'settings/config' ||
      detail.kind === 'file'
    ) {
      this.state = 'not-a-skill';
      this.entries = null;
      this.bodyText = null;
      return;
    }
    const presentation = detail.presentation;
    this.state = presentation === null ? 'extraction-failed' : 'parsed';
    this.entries = presentation === null ? null : presentation.frontmatter;
    this.bodyText = presentation === null ? null : presentation.bodyText;
  }
}

/** What one side holds of one tool's recognition; see {@link RecognitionSideState}. */
function recognitionState(
  side: ComparisonSideInput | null,
  tool: SupportedTool,
): RecognitionSideState {
  if (side === null) {
    return 'file-absent';
  }
  return side.definitions.some((definition) => definition.tool === tool)
    ? 'recognized'
    : 'not-recognized';
}

/**
 * The surfaces one side's definition of this tool carries, in the closed
 * surface order, or empty when the side holds no such definition. Read off
 * the definition rather than recomputed: a definition is one recognition, and
 * the surfaces it publishes are the ones its own admissions rest on (FR-009).
 */
function recognitionSurfaces(
  side: ComparisonSideInput | null,
  tool: SupportedTool,
): readonly VendorSurface[] {
  const definition = side?.definitions.find((candidate) => candidate.tool === tool);
  return definition?.surfaces ?? [];
}
