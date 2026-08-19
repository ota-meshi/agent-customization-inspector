// Skill recognition-metadata comparison (T198; FR-011, FR-012, research.md
// § 7): the comparison separates its two facts by what each is a fact
// about. Which tools recognize each compared file is a recognition fact,
// compared per tool so each recognition stays distinguishable from the
// physical file (US3 scenario 2). The declared metadata is the file's one
// scan-time parse for the kind (FR-028), so its declarations are matched by
// `(kind, declared key)` across the pair and compared once — a tool is not a
// coordinate of a declaration, and rendering the same file-level rows under
// each recognizing tool would publish one fact as many. This module is the
// data half, kept out of the component so the decisions are testable without
// a single-file-component compiler. What a declared key is and when two
// resolved values are equal lives in the shared declaration semantics
// (`../inspection/declaration-comparison.ts`), because that answer is a
// property of the parsed value, not of this kind's comparison model.
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist and how the files' declarations compare,
// and its closed shape carries no rank, no winner, and no fabricated rows —
// relationships in particular, because no shipped recognition publishes an
// edge for the wire to carry (api-types.ts § FileDetailDto).
import {
  matchDeclarations,
  type DeclarationComparisonRow,
} from '../inspection/declaration-comparison';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type {
  FileDetailDto,
  FrontmatterEntryDto,
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
  /** A skill detail with a parsed presentation: its declarations are the rows'. */
  | 'parsed'
  /**
   * A skill detail whose all-or-nothing extraction failed: its declarations
   * are unknown, not absent (FR-028), so nothing is matched against them.
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
 * yield no sentence: the rows are a parsed side's statement, and an absent
 * side is stated by the page and by the rows' own "no file" cells.
 */
export const DECLARATION_SIDE_STATE_TEXT: Readonly<Record<DeclarationSideState, string>> = {
  /** The rows are this side's statement; no sentence stands in for them. */
  parsed: '',
  /** The declarations are unknown, not absent (FR-028). */
  'extraction-failed':
    'is recognized as a skill, but its declarations could not be parsed, so they are unknown.',
  /** No skill recognition owns the file, so it has nothing declared here. */
  'not-a-skill': 'is not recognized as a skill, so it has no declared metadata to compare.',
  /** The one-sided rows' "no file" cells state the absence. */
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
 * per-tool recognition rows, each side's declaration state, and the matched
 * declared keys of the files' parses — built once for the pair, because the
 * declarations are the files' rather than any recognition's. A null side is
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
   * The matched declared keys, one row per key identity: the first file's
   * keys in authored order, then keys only the second file declares, in its
   * order — see {@link DeclarationComparisonRow}. Empty unless every present
   * side is 'parsed' — an absent side contributes no entries, so the present
   * side's declarations stand alone in the rows (T203), while a present side
   * without parsed declarations offers nothing to match, and no rows are
   * invented against it (FR-028).
   */
  public readonly declarations: readonly DeclarationComparisonRow[];

  /** Derives the pair's recognition rows, declaration states, and matched keys. */
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
    // An absent side pairs as the empty entry list, so the present side's
    // declarations become one-sided rows rather than vanishing with the pair
    // (T203). A present side without parsed declarations still offers
    // nothing to match, and no rows are invented against it (FR-028).
    const leftMatchable = leftEntries !== null || this.leftDeclarations === 'file-absent';
    const rightMatchable = rightEntries !== null || this.rightDeclarations === 'file-absent';
    this.declarations =
      leftMatchable && rightMatchable && (leftEntries !== null || rightEntries !== null)
        ? matchDeclarations(leftEntries ?? [], rightEntries ?? [])
        : [];
  }
}

/**
 * One parsed side's declarations. Callers guard on the 'parsed' state, which
 * is derived from the same detail, so the presentation is present here.
 */
function entriesOf(side: ComparisonSideInput): readonly FrontmatterEntryDto[] {
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
