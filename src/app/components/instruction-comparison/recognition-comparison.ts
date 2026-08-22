// Instruction recognition-metadata comparison (T278; FR-011, FR-012,
// research.md § 7): the comparison separates its two facts by what each is a
// fact about. Which tools recognize each compared file — and on which
// surfaces — is a recognition fact, compared per tool so each recognition
// stays distinguishable from the physical file (US3 scenario 2). The
// declared metadata is the file's one scan-time parse for the kind (FR-028),
// so it is compared once — a tool is not a coordinate of a declaration, and
// rendering the same file-level fact under each recognizing tool would
// publish one fact as many: each side's frontmatter serializes to one
// canonical YAML document, every key sorted, and the two documents are what
// Monaco diffs (research.md § 7, frontmatter-yaml.ts). This module is the
// data half, kept out of the component so the decisions are testable
// without a single-file-component compiler.
//
// The instruction kind's model differs from the skill one in two typed
// facts, which is why this is its own module rather than a widening
// (spec.md § Clarifications Session 2026-08-14): a recognition carries the
// surfaces its admitting rules rest on — the layering fact the inventory
// publishes (api-types.ts § FileRecognitionDto) — and there is never
// an absent side: an instruction comparison is exactly two committed files.
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist, which surfaces they rest on, and what
// each side's frontmatter serializes to, and its closed shape carries no
// rank, no winner, and no fabricated rows — relationships in particular, because an
// instruction file never publishes an edge for the wire to carry
// (api-types.ts § FileDetailDto, tasks.md T217/T238).
import { canonicalFrontmatterYamlText } from '../inspection/frontmatter-yaml';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type {
  FileDetailDto,
  DeclaredEntryDto,
  FileRecognitionDto,
} from '../../../shared/api-types';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

/**
 * One side of the comparison: the file's detail and the recognitions the
 * committed instructions inventory attaches to that file. The recognitions
 * come from the snapshot the page already holds, because which tools
 * recognize a file — and on which surfaces — is the inventory's fact, not
 * the detail's (api-types.ts § InstructionFileDetailDto).
 */
export interface InstructionComparisonSideInput {
  /** The compared file's detail, exactly as adopted. */
  readonly detail: FileDetailDto;
  /** The inventory's recognitions of this file, one per recognizing tool. */
  readonly recognitions: readonly FileRecognitionDto[];
}

/**
 * What one side holds of one tool's instruction recognition. Recognition is
 * the inventory record's existence and nothing more: whether the file's
 * declarations parsed is the file's own fact (FR-028), stated by the
 * declaration half of the comparison rather than repeated per tool. No
 * absent state exists here: an instruction comparison is exactly two
 * committed files.
 */
export type InstructionRecognitionSideState =
  /** The tool attaches a recognition to this side's file. */
  | 'recognized'
  /** The tool attaches no recognition to this side's file. */
  | 'not-recognized';

/**
 * What a recognition cell reads as, beside its union so a new member cannot
 * compile without its text (AGENTS.md § User-visible copy policy). A
 * recognized cell also lists its surfaces — the typed layering fact — which
 * the component appends from the row's own surface list.
 */
export const INSTRUCTION_RECOGNITION_SIDE_STATE_TEXT: Readonly<
  Record<InstructionRecognitionSideState, string>
> = {
  /** The tool recognizes this side's file. */
  recognized: 'Recognized',
  /** The tool attaches no recognition to this side's file. */
  'not-recognized': 'Not recognized',
};

/**
 * What one side's declared metadata is: the file's one parse for the
 * instructions kind, or the stated reason no parsed declarations exist to
 * compare. No absent or foreign-kind state exists: the compare route accepts
 * only committed instruction files.
 */
export type InstructionDeclarationSideState =
  /** An instruction detail with a parsed presentation: its declarations serialize into the diff. */
  | 'parsed'
  /**
   * A detail without a parsed presentation: the all-or-nothing extraction
   * failed, so the declarations are unknown, not absent (FR-028), and
   * this side serializes nothing.
   */
  | 'extraction-failed';

/**
 * What a side's declaration state reads as after its "First file"/"Second
 * file" label, beside its union so a new member cannot compile without its
 * sentence (AGENTS.md § User-visible copy policy). 'parsed' yields no
 * sentence: the serialized diff is a parsed side's statement.
 */
export const INSTRUCTION_DECLARATION_SIDE_STATE_TEXT: Readonly<
  Record<InstructionDeclarationSideState, string>
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
 * A class whose constructor derives both side states and surface lists: the
 * constructor is the one place that says how the row's data came to be
 * (AGENTS.md § Class and interface policy).
 */
export class InstructionToolRecognitionRow {
  /** The tool whose recognition this row compares. */
  public readonly tool: SupportedTool;

  /** The recognized kind; every recognition this surface compares is instructions. */
  public readonly kind: 'instructions';

  /** What the first file holds of this tool's recognition. */
  public readonly left: InstructionRecognitionSideState;

  /** What the second file holds of this tool's recognition. */
  public readonly right: InstructionRecognitionSideState;

  /**
   * The surfaces the first file's recognition rests on, in the inventory's
   * closed surface order — the typed layering fact of this kind, published
   * beside the tool because the tool alone does not say where the file is
   * read from (api-types.ts § FileRecognitionDto). Empty exactly when
   * the side is 'not-recognized'; never a claim that a surface loaded the
   * file (FR-009).
   */
  public readonly leftSurfaces: readonly VendorSurface[];

  /** The second file's surfaces; see {@link leftSurfaces}. */
  public readonly rightSurfaces: readonly VendorSurface[];

  /** Derives one tool's side states and surface lists from the compared sides. */
  public constructor(
    tool: SupportedTool,
    left: InstructionComparisonSideInput,
    right: InstructionComparisonSideInput,
  ) {
    this.tool = tool;
    this.kind = 'instructions';
    this.leftSurfaces = surfacesOf(left, tool);
    this.rightSurfaces = surfacesOf(right, tool);
    this.left = recognitionState(left, tool);
    this.right = recognitionState(right, tool);
  }
}

/**
 * The recognition-metadata comparison of one instruction pair (FR-011): the
 * per-tool recognition rows, each side's declaration state, and the canonical
 * serialized document each side's parse becomes — built once for the pair,
 * because the declarations are the files' rather than any recognition's.
 *
 * A class whose constructor derives the whole comparison from the two sides
 * (AGENTS.md § Class and interface policy).
 */
export class InstructionRecognitionComparison {
  /**
   * One row per tool recognizing either side, in the contracted tool order
   * rather than any preference (US3 scenario 2). Empty exactly when no
   * compared file carries a recognition — then there is no recognition
   * metadata to compare, and none is fabricated.
   */
  public readonly tools: readonly InstructionToolRecognitionRow[];

  /** What the first file's declared metadata is; see {@link InstructionDeclarationSideState}. */
  public readonly leftDeclarations: InstructionDeclarationSideState;

  /** What the second file's declared metadata is; see {@link InstructionDeclarationSideState}. */
  public readonly rightDeclarations: InstructionDeclarationSideState;

  /**
   * The two canonical YAML documents the frontmatter diff mounts — every
   * key sorted, with no leading identity pair, because an instruction file
   * declares no identity this product reads — or null unless both sides are
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
  public constructor(left: InstructionComparisonSideInput, right: InstructionComparisonSideInput) {
    const tools: InstructionToolRecognitionRow[] = [];
    for (const tool of SUPPORTED_TOOL_ORDER) {
      const row = new InstructionToolRecognitionRow(tool, left, right);
      // A row exists only where a recognition exists: a tool recognizing
      // neither file builds none.
      if (row.left === 'recognized' || row.right === 'recognized') {
        tools.push(row);
      }
    }
    this.tools = tools;
    this.leftDeclarations = declarationState(left);
    this.rightDeclarations = declarationState(right);
    this.frontmatterDiff =
      this.leftDeclarations === 'parsed' && this.rightDeclarations === 'parsed'
        ? {
            originalText: canonicalFrontmatterYamlText(entriesOf(left), []),
            modifiedText: canonicalFrontmatterYamlText(entriesOf(right), []),
          }
        : null;
  }
}

/**
 * One parsed side's declarations. Callers guard on the 'parsed' state, which
 * is derived from the same detail, so the presentation is present here.
 */
function entriesOf(side: InstructionComparisonSideInput): readonly DeclaredEntryDto[] {
  const detail = side.detail;
  return detail.kind === 'instructions' && detail.presentation !== null
    ? detail.presentation.frontmatter
    : [];
}

/**
 * What one side holds of one tool's recognition; see
 * {@link InstructionRecognitionSideState}.
 */
function recognitionState(
  side: InstructionComparisonSideInput,
  tool: SupportedTool,
): InstructionRecognitionSideState {
  return side.recognitions.some((recognition) => recognition.tool === tool)
    ? 'recognized'
    : 'not-recognized';
}

/**
 * What one side's declared metadata is; see
 * {@link InstructionDeclarationSideState}. The parse is the file's, one per
 * kind (FR-028), so it is read off the detail's presentation and is the same
 * fact for every recognizing tool at once.
 */
function declarationState(side: InstructionComparisonSideInput): InstructionDeclarationSideState {
  const detail = side.detail;
  return detail.kind === 'instructions' && detail.presentation !== null
    ? 'parsed'
    : 'extraction-failed';
}

/** The surfaces one tool's recognition of a side rests on; empty when none. */
function surfacesOf(
  side: InstructionComparisonSideInput,
  tool: SupportedTool,
): readonly VendorSurface[] {
  return side.recognitions.find((recognition) => recognition.tool === tool)?.surfaces ?? [];
}
