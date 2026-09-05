// One instructions row's subject, as every surface that shows it needs it
// (FR-025).
//
// The instructions inventory is keyed by applicability range: the glob a file
// declares, or nothing at all for the one row whose files declare none a row
// can be keyed by. Both are subjects a surface has to name, and both have a
// case the label rules alone do not answer — the row with no range has no glob
// to draw, and a glob differing from another only in whitespace must not read
// as that other one where the surface collapses it.
//
// A unit rather than the same branches in the row, the detail's moves, and the
// comparison. The no-range copy stood in two of those already and the third
// drew nothing at all, which is how a comparison of that row reached its own
// heading with the subject missing.
//
// Separate from {@link AuthoredName}, which every other kind's subject uses: a
// range is a glob, so its backslashes are syntax and stay as written, and only
// the one that would spell this product's own escape introducer is escaped
// ({@link applicabilityRangePresentation}). Running a range through the name
// rule turned `src/\[a\]/**` into `src/\[a\]/**`.
import {
  accessibleApplicabilityRangePresentation,
  applicabilityRangePresentation,
  escapedApplicabilityRange,
  inlineApplicabilityRangePresentation,
} from '../../shared/entities';

/**
 * What a surface calls the row whose files declare no range a row can be keyed
 * by. It says no range is *known* rather than that none is declared, because
 * the row also holds files whose declarations could not be read at all — such
 * a file may well declare one, and its own diagnostic says why nothing could
 * be read (FR-028).
 */
const NO_RANGE_TEXT = 'No known applicability range';

/**
 * One applicability range as the surfaces showing it need it, including the
 * absent one.
 */
export class ApplicabilityRange {
  /**
   * The range exactly as the file declared it, or null for the row that
   * declares none. Every getter derives from this and nothing here alters it:
   * ranges are grouped by exact text equality, so what is stored stays what
   * was declared (`api-types.ts` § InstructionInventoryEntryDto).
   */
  readonly #declared: string | null;

  /**
   * @param declared The declared range as authored, or null for the no-range
   * row — the same value the inventory entry publishes.
   */
  public constructor(declared: string | null) {
    this.#declared = declared;
  }

  /**
   * The text a surface draws: the glob through the range rule, or this
   * product's copy for the row that has none.
   */
  public get text(): string {
    return this.#declared === null ? NO_RANGE_TEXT : applicabilityRangePresentation(this.#declared);
  }

  /**
   * Whether {@link text} is the file's own characters, which is what decides
   * the authored-text styling: that styling renders its own whitespace and
   * isolates its own bidi run, and both are wrong for this product's copy
   * (`main.css` § .aci-authored-text).
   */
  public get isDeclared(): boolean {
    return this.#declared !== null && this.text === escapedApplicabilityRange(this.#declared);
  }

  /**
   * Every spelling of this range a reader can see, for the search that narrows
   * the list by what a row displays (FR-006): the file's own characters and
   * the spelling drawn in their place, or — where no range was declared — this
   * product's statement about the row, which is what the row shows there
   * (`authored-name.ts` § visibleSpellings makes the same answer for a name).
   */
  public get visibleSpellings(): readonly string[] {
    return this.#declared === null ? [this.text] : [this.#declared, this.text];
  }

  /**
   * The name for a surface that collapses whitespace and has no visible label
   * of this range beside it — a heading's accessible name, an `<option>`. Two
   * rows differing only in whitespace must not read as one there, and there
   * is no visible spelling to start from
   * ({@link inlineApplicabilityRangePresentation}).
   */
  public get singleLineText(): string {
    return this.#declared === null
      ? NO_RANGE_TEXT
      : inlineApplicabilityRangePresentation(this.#declared);
  }

  /**
   * The name for a surface that shows {@link text} beside it and collapses
   * whitespace — a detail move's accessible name: it starts with the drawn
   * spelling, which a speech-input user says, and spells the range out after
   * it where two ranges would otherwise collapse into one announcement
   * (WCAG 2.5.3, WCAG 2.4.4; {@link accessibleApplicabilityRangePresentation}).
   */
  public get accessibleText(): string {
    return this.#declared === null
      ? NO_RANGE_TEXT
      : accessibleApplicabilityRangePresentation(this.#declared);
  }
}
