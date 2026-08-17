// Recognition-metadata comparison rows (T198; FR-011, FR-012, research.md
// § 7): recognition metadata is matched by exact `(tool, kind, declared
// key)`, and each declaration's resolved value is compared structurally and
// rendered in Vue rows rather than serialized into the source diff. This
// module is the data half — which recognitions pair up, which declared keys
// match, and what "equal" means — kept out of the component so the decisions
// are testable without a single-file-component compiler.
//
// The comparison is literal and descriptive by construction (FR-012): a
// group states which recognitions exist and how their declarations compare,
// and its closed shape carries no rank, no winner, and no fabricated rows —
// relationships in particular, because no shipped recognition publishes an
// edge for the wire to carry (api-types.ts § FileDetailDto).
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type {
  FileDetailDto,
  FrontmatterEntryDto,
  FrontmatterKeyKind,
  FrontmatterValueDto,
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
 * What one side holds of one `(tool, kind)` recognition:
 *  - 'recognized'        the tool recognizes this side's file and its
 *                        declarations are the one scan-time parse's
 *  - 'extraction-failed' the tool recognizes the file but extraction failed
 *                        all-or-nothing, so its declarations are unknown, not
 *                        absent (FR-028)
 *  - 'not-recognized'    the tool attaches no recognition to this side's file
 *  - 'file-absent'       this side of a one-sided comparison has no file at
 *                        the compared path — the stated absence FR-011 makes
 *                        part of the comparison, not a file no tool
 *                        recognizes
 */
export type RecognitionSideState =
  /** The tool recognizes the file and its declarations were parsed. */
  | 'recognized'
  /** The tool recognizes the file; its declarations are unknown (FR-028). */
  | 'extraction-failed'
  /** The tool attaches no recognition to this side's file. */
  | 'not-recognized'
  /** A one-sided comparison's absent side: there is no file here at all. */
  | 'file-absent';

/**
 * What a side's recognition state reads as, beside its union so a new member
 * cannot compile without its sentence (AGENTS.md § User-visible copy
 * policy). 'recognized' yields no sentence of its own — the declaration rows
 * are what a recognized side shows — so only the states that replace those
 * rows have text here.
 */
export const RECOGNITION_SIDE_STATE_TEXT: Readonly<Record<RecognitionSideState, string>> = {
  /** The rows below are this side's statement; no sentence stands in for them. */
  recognized: '',
  /** The declarations are unknown, not absent (FR-028). */
  'extraction-failed':
    'recognizes this file, but its declarations could not be parsed, so they are unknown.',
  /** The tool attaches no recognition to this side's file. */
  'not-recognized': 'does not recognize this file.',
  /** The absence itself; the present side's declarations stand alone. */
  'file-absent': 'has no file to recognize at this path.',
};

/**
 * One declared key matched across the pair by the parser's own identity —
 * the key's parsed type together with its rendered spelling (FR-011).
 * `left`/`right` hold the resolved value the parser produced, or null when
 * that side has no declaration here — a parsed frontmatter without the key,
 * or the absent side of a one-sided pair, whose rows are the present
 * side's declarations standing beside the stated absence (FR-011). Rows
 * exist only where every present side is 'recognized', because the match is
 * by exact `(tool, kind, declared key)` and an unparsed or unrecognized
 * side offers no declarations to match against.
 *
 * The type is part of the identity because one spelling can stand for two
 * keys: the parser keeps a numeric `1` apart from the string `"1"` while
 * both publish the rendered key `1`
 * (api-types.ts § FrontmatterKeyKind), so matching by spelling alone would
 * compare values of two different keys as one. Within one parse each
 * identity is unique — a key declared twice is its later declaration — so
 * every identity is exactly one row (FR-025). What keeps two same-spelled
 * rows distinguishable is the surfaces' shared rendering rule: a key whose
 * parsed type is not the string default is captioned with that type
 * wherever it is drawn.
 *
 * A class rather than an interface because production constructs a row in
 * exactly one place — the group's declaration matching (AGENTS.md § Class
 * and interface policy).
 */
export class DeclarationComparisonRow {
  /** The declared key as the parser resolved it (data-model.md § Field reading). */
  public readonly key: string;

  /** The parsed type completing the key's identity (api-types.ts § FrontmatterKeyKind). */
  public readonly keyKind: FrontmatterKeyKind;

  /** The first side's resolved value, or null when it declares no such key — or has no file. */
  public readonly left: FrontmatterValueDto | null;

  /** The second side's resolved value, or null when it declares no such key — or has no file. */
  public readonly right: FrontmatterValueDto | null;

  /** Pairs one declared key's two resolved values, either side possibly none. */
  public constructor(
    key: string,
    keyKind: FrontmatterKeyKind,
    left: FrontmatterValueDto | null,
    right: FrontmatterValueDto | null,
  ) {
    this.key = key;
    this.keyKind = keyKind;
    this.left = left;
    this.right = right;
  }

  /**
   * Whether the two resolved values are structurally equal
   * ({@link frontmatterValuesEqual}); false whenever either side declares no
   * such key. Derived where it is read rather than stored beside the values
   * it derives from — two states can disagree and one cannot (AGENTS.md
   * § Implementation simplicity policy). Descriptive only: equality of
   * resolved values, never a claim about which declaration a product would
   * use (FR-012).
   */
  public get equal(): boolean {
    return (
      this.left !== null && this.right !== null && frontmatterValuesEqual(this.left, this.right)
    );
  }
}

/**
 * One `(tool, kind)` recognition pair across the two compared files. A group
 * exists for every tool that recognizes either side, so each recognition
 * remains distinguishable from the physical file (US3 scenario 2), and the
 * groups follow the contracted tool order rather than any preference.
 *
 * A class whose constructor derives the pairing from the two sides: the
 * constructor is the one place that says how a group's data came to be
 * (AGENTS.md § Class and interface policy).
 */
export class RecognitionComparisonGroup {
  /** The recognizing tool this group pairs across the two files. */
  public readonly tool: SupportedTool;

  /** The recognized kind; every shipped recognition is a skill so far. */
  public readonly kind: 'skill';

  /** What the first file holds of this recognition. */
  public readonly left: RecognitionSideState;

  /** What the second file holds of this recognition. */
  public readonly right: RecognitionSideState;

  /**
   * The matched declared keys, one row per key identity: the first file's
   * keys in authored order, then keys only the second file declares, in its
   * order. Empty unless every present side is 'recognized' with a parsed
   * presentation — a 'file-absent' side contributes no entries, so the
   * present side's declarations stand alone in the rows (T203) — see
   * {@link DeclarationComparisonRow}.
   */
  public readonly declarations: readonly DeclarationComparisonRow[];

  /** Derives one tool's pairing — side states and matched keys — from the two sides. */
  public constructor(
    tool: SupportedTool,
    left: ComparisonSideInput | null,
    right: ComparisonSideInput | null,
  ) {
    this.tool = tool;
    this.kind = 'skill';
    this.left = sideState(left, tool);
    this.right = sideState(right, tool);
    const leftEntries = this.left === 'recognized' && left !== null ? declaredEntries(left) : null;
    const rightEntries =
      this.right === 'recognized' && right !== null ? declaredEntries(right) : null;
    // An absent side pairs as the empty entry list, so the present side's
    // declarations become one-sided rows rather than vanishing with the
    // pair (T203). A side that is a real file without parsed declarations —
    // unrecognized, or an all-or-nothing extraction failure (FR-028) —
    // still offers nothing to match, and no rows are invented against it.
    const leftMatchable = leftEntries !== null || this.left === 'file-absent';
    const rightMatchable = rightEntries !== null || this.right === 'file-absent';
    this.declarations =
      leftMatchable && rightMatchable && (leftEntries !== null || rightEntries !== null)
        ? matchDeclarations(leftEntries ?? [], rightEntries ?? [])
        : [];
  }
}

/**
 * Structural equality of two resolved frontmatter values (FR-011). The
 * comparison is of what the parser resolved — an authored `007` already
 * arrived as `7` — while the literal spelling difference stays visible in
 * the source diff beside these rows. Order is part of a resolved structure:
 * entries and items are compared in authored order, because deciding that a
 * reordered mapping "means the same thing" would be interpretation (FR-012).
 */
export function frontmatterValuesEqual(
  left: FrontmatterValueDto,
  right: FrontmatterValueDto,
): boolean {
  switch (left.kind) {
    case 'scalar':
      return right.kind === 'scalar' && left.text === right.text;
    case 'absent':
      return right.kind === 'absent';
    case 'sequence':
      return (
        right.kind === 'sequence' &&
        left.items.length === right.items.length &&
        left.items.every((item, index) => frontmatterValuesEqual(item, right.items[index]!))
      );
    case 'mapping':
      return (
        right.kind === 'mapping' &&
        left.entries.length === right.entries.length &&
        left.entries.every(
          (entry, index) =>
            // Both halves of the key's identity: a mapping keyed by a
            // numeric `1` is not the mapping keyed by the string `"1"`
            // (api-types.ts § FrontmatterKeyKind).
            entry.key === right.entries[index]!.key &&
            entry.keyKind === right.entries[index]!.keyKind &&
            frontmatterValuesEqual(entry.value, right.entries[index]!.value),
        )
      );
  }
}

/**
 * One side's parsed declarations, or null when the side publishes no parsed
 * frontmatter to offer — a detail that is not a skill's, or a skill whose
 * presentation the parse did not produce (FR-028).
 */
function declaredEntries(side: ComparisonSideInput): readonly FrontmatterEntryDto[] | null {
  const detail = side.detail;
  return detail.kind === 'skill' && detail.presentation !== null
    ? detail.presentation.frontmatter
    : null;
}

/** What one side holds of one tool's recognition; see {@link RecognitionSideState}. */
function sideState(side: ComparisonSideInput | null, tool: SupportedTool): RecognitionSideState {
  if (side === null) {
    return 'file-absent';
  }
  const definition = side.definitions.find((candidate) => candidate.tool === tool);
  if (definition === undefined) {
    return 'not-recognized';
  }
  return definition.parseStatus === 'failed' ? 'extraction-failed' : 'recognized';
}

/**
 * Builds the recognition-metadata comparison for a pair (FR-011): one group
 * per tool recognizing a present side, in the contracted tool order, each
 * carrying the declared-key rows its sides can actually match — a null side
 * is the stated absence of a one-sided comparison, whose present side's
 * recognitions and declarations stand alone (T203). A pair whose present
 * files no recognition owns builds no group at all — there is no
 * recognition metadata to compare, and none is fabricated.
 */
export function buildRecognitionComparison(
  left: ComparisonSideInput | null,
  right: ComparisonSideInput | null,
): readonly RecognitionComparisonGroup[] {
  // A group exists only where a recognition exists: a side that is absent,
  // or a present file the tool does not recognize, builds none by itself.
  const carriesRecognition = (state: RecognitionSideState): boolean =>
    state === 'recognized' || state === 'extraction-failed';
  const groups: RecognitionComparisonGroup[] = [];
  for (const tool of SUPPORTED_TOOL_ORDER) {
    const group = new RecognitionComparisonGroup(tool, left, right);
    if (carriesRecognition(group.left) || carriesRecognition(group.right)) {
      groups.push(group);
    }
  }
  return groups;
}

/**
 * Matches the two parsed frontmatters by the parser's key identity — parsed
 * type plus rendered spelling: the first file's keys in authored order,
 * then keys only the second file declares, in its order — a union with no
 * ranking, so no declaration of either file is dropped (FR-011). Each
 * identity is unique within one parse, so the match is one row per
 * identity (FR-025).
 */
function matchDeclarations(
  leftEntries: readonly FrontmatterEntryDto[],
  rightEntries: readonly FrontmatterEntryDto[],
): readonly DeclarationComparisonRow[] {
  /** One matched identity while the union is being built. */
  interface MatchedKey {
    readonly key: string;
    readonly keyKind: FrontmatterKeyKind;
    left: FrontmatterValueDto | null;
    right: FrontmatterValueDto | null;
  }
  // The kind tokens are a closed set containing no NUL, so the first NUL
  // always ends the kind and the join cannot collide, whatever characters
  // the authored key holds. The map's insertion order is exactly the
  // documented row order.
  const identityOf = (entry: FrontmatterEntryDto): string => `${entry.keyKind}\u0000${entry.key}`;
  const matched = new Map<string, MatchedKey>();
  for (const entry of leftEntries) {
    matched.set(identityOf(entry), {
      key: entry.key,
      keyKind: entry.keyKind,
      left: entry.value,
      right: null,
    });
  }
  for (const entry of rightEntries) {
    const existing = matched.get(identityOf(entry));
    if (existing === undefined) {
      matched.set(identityOf(entry), {
        key: entry.key,
        keyKind: entry.keyKind,
        left: null,
        right: entry.value,
      });
    } else {
      existing.right = entry.value;
    }
  }
  return [...matched.values()].map(
    (row) => new DeclarationComparisonRow(row.key, row.keyKind, row.left, row.right),
  );
}
