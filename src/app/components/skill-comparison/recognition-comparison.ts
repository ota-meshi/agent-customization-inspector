// Skill recognition-metadata comparison (T198; FR-011, FR-012, research.md
// § 7): the comparison separates its two facts by what each is a fact
// about. Which tools recognize each compared file is a recognition fact,
// compared per tool so each recognition stays distinguishable from the
// physical file (US3 scenario 2). The declared metadata is the file's one
// scan-time parse for the kind (FR-028), so it is compared once — a tool is
// not a coordinate of a declaration, and rendering the same file-level fact
// under each recognizing tool would publish one fact as many: each side's
// frontmatter serializes to one canonical YAML document — `name` and
// `description` leading, every other key sorted — and the two documents are
// what Monaco diffs (research.md § 7, frontmatter-yaml.ts). This module is
// the data half, kept out of the component so the decisions are testable
// without a single-file-component compiler.
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist and how the files' declarations compare,
// and its closed shape carries no rank, no winner, and no fabricated rows —
// relationships in particular, because no shipped recognition publishes an
// edge for the wire to carry (api-types.ts § FileDetailDto).
import { canonicalFrontmatterYamlText } from '../inspection/frontmatter-yaml';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
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
  /** A skill detail with a parsed presentation: its declarations serialize into the diff. */
  | 'parsed'
  /**
   * A skill detail whose all-or-nothing extraction failed: its declarations
   * are unknown, not absent (FR-028), so this side serializes nothing.
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

  /** The recognized kind; every shipped recognition of this surface is a skill. */
  public readonly kind: 'skill';

  /** What the first file holds of this tool's recognition. */
  public readonly left: RecognitionSideState;

  /** What the second file holds of this tool's recognition. */
  public readonly right: RecognitionSideState;

  /** Derives one tool's two side states from the compared sides. */
  public constructor(
    tool: SupportedTool,
    left: ComparisonSideInput | null,
    right: ComparisonSideInput | null,
  ) {
    this.tool = tool;
    this.kind = 'skill';
    this.left = recognitionState(left, tool);
    this.right = recognitionState(right, tool);
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
    this.leftDeclarations = declarationState(left);
    this.rightDeclarations = declarationState(right);
    const leftEntries =
      this.leftDeclarations === 'parsed' && left !== null ? entriesOf(left) : null;
    const rightEntries =
      this.rightDeclarations === 'parsed' && right !== null ? entriesOf(right) : null;
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
                : canonicalFrontmatterYamlText(leftEntries, LEADING_FRONTMATTER_KEYS),
            modifiedText:
              rightEntries === null
                ? ''
                : canonicalFrontmatterYamlText(rightEntries, LEADING_FRONTMATTER_KEYS),
            originalAbsent: leftEntries === null,
            modifiedAbsent: rightEntries === null,
          }
        : null;
  }
}

/**
 * The identity keys the canonical documents lead with, the same pair the
 * skill detail leads with (FR-007): which skill this is and what it is for
 * come before whatever else either file declares.
 */
const LEADING_FRONTMATTER_KEYS: readonly string[] = ['name', 'description'];

/**
 * One parsed side's declarations. Callers guard on the 'parsed' state, which
 * is derived from the same detail, so the presentation is present here.
 */
function entriesOf(side: ComparisonSideInput): readonly DeclaredEntryDto[] {
  const detail = side.detail;
  return detail.kind === 'skill' && detail.presentation !== null
    ? detail.presentation.frontmatter
    : [];
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
 * What one side's declared metadata is; see {@link DeclarationSideState}.
 * The parse is the file's, one per kind (FR-028), so it is read off the
 * detail's presentation rather than off any definition's per-tool copy of
 * the same fact.
 */
function declarationState(side: ComparisonSideInput | null): DeclarationSideState {
  if (side === null) {
    return 'file-absent';
  }
  if (side.detail.kind !== 'skill') {
    return 'not-a-skill';
  }
  return side.detail.presentation !== null ? 'parsed' : 'extraction-failed';
}
