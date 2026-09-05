// One authored name as every surface that shows it needs it (FR-025).
//
// A customization's name comes out of the file: an MCP server key, a hook
// event key, a plugin name, a custom agent's declared `name`, a skill's
// directory name. What follows from it is the text to draw, whether that text
// is the file's own characters, and the two accessible spellings — and each
// has a case the label rules alone do not answer. Two cases are sharp: the
// empty string, which strict JSON and TOML both accept as a key, and a name
// whose characters draw nothing at all.
//
// A name whose characters draw nothing is spelled out in full — `\u0020` for
// one space, `\u0020\u0020` for two — so two such names stay two things on
// the screen, which is what keeping the invisible characters and adding one
// shared note beside them could not do: the note read identically under both,
// and the runs differed by the width of a space (FR-025; `entities.ts`
// § pathPresentationLabel makes the same call for a path, because a label has
// to be unambiguous on its own).
//
// A spelled-out name is this product's characters, so {@link isAuthored} is
// false for it and the surface styles it as the product's own — the same
// distinction every row already draws.
//
// The empty string has nothing to spell, so the surface draws this product's
// own words for what the file wrote — and draws them as a badge rather than as
// the name, because a carrier can declare both `""` and a name spelling those
// same words, and a difference carried by colour alone is not a difference
// (WCAG 1.4.1). {@link isEmpty} is what a surface switches on;
// `AuthoredNameText.vue` is where every surface switches.
//
// One unit rather than the same ternaries in each row, detail, and comparison.
// Ten surfaces derived them separately and one went stale unnoticed: after the
// MCP comparison's own name element was removed, its crumb kept the raw name,
// so the page announced this product's words for the absence and drew nothing
// where the name went.
// A surface that reads this class cannot forget the case.
//
// It holds the authored name and derives each spelling where it is read,
// rather than transcribing it into fields (AGENTS.md § Class and interface
// policy). A name this product does not know is not one of these: `null` is
// the caller's own state, and the copy for it is the caller's too, because
// only the caller knows what kind of thing has no name.
import {
  accessiblePresentationLabel,
  escapeControlCharacters,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../shared/entities';

/**
 * What this product says where a file declared the name empty. It names what
 * the file did — it wrote the key, with nothing in it — rather than saying the
 * name is missing, which is a different state and a different row's
 * ({@link AuthoredName} is never constructed for it).
 *
 * This spelling is for the surfaces carrying words alone: an accessible name,
 * a previous/next label, a document title. A surface that can carry a shape
 * draws the badge instead (`AuthoredNameText.vue`), which is where this name
 * is separated from one spelling these same words: no string can do that,
 * because any string is one a file may declare (WCAG 1.4.1, WCAG 2.4.4).
 */
const EMPTY_NAME_TEXT = 'empty name';

/**
 * What the badge reads where a surface can carry a shape
 * (`AuthoredNameText.vue`). It lives beside the name rather than in that
 * component because it is one of the spellings a reader sees, and the search
 * matches a row by what the row displays
 * ({@link AuthoredName.visibleSpellings}).
 */
export const EMPTY_NAME_BADGE_TEXT = 'Empty name';

/**
 * One authored customization name, as the surfaces showing it need it.
 */
export class AuthoredName {
  /**
   * The name exactly as the file wrote it. Every getter derives from this and
   * nothing here alters it: what is stored stays what was authored (FR-025).
   */
  readonly #authored: string;

  /**
   * @param authored The declared name as authored — never a presentation of
   * one. Passing an already-escaped or already-noted spelling would escape it
   * twice and draw this product's own characters as the file's.
   */
  public constructor(authored: string) {
    this.#authored = authored;
  }

  /**
   * The name exactly as the file wrote it, for the two places that need the
   * value rather than a spelling of it: a route parameter, which identifies
   * the row a link opens, and the browser tab, whose subject the shell escapes
   * once at its own rendering boundary — a spelling escaped here would be
   * escaped twice. Every surface inside the page draws {@link text} instead.
   */
  public get authored(): string {
    return this.#authored;
  }

  /**
   * The text a surface draws: the shared label rule, which spells a name out
   * in full when its escaped spelling would still render nothing, and this
   * product's note where there is not even that to spell
   * ({@link pathPresentationLabel}).
   */
  public get text(): string {
    return this.#authored === '' ? EMPTY_NAME_TEXT : pathPresentationLabel(this.#authored);
  }

  /**
   * Whether the file wrote this name with nothing in it. What a surface
   * switches on to draw the badge rather than a name: {@link isAuthored} is
   * false for a spelled-out name too, and that one is a name — it has
   * characters, and two of them stay two things on the screen.
   *
   * Empty is not missing. A name this product does not know reaches no
   * `AuthoredName` at all; the row states that in its own words, and those
   * words are a statement about the row rather than a name in its place.
   */
  public get isEmpty(): boolean {
    return this.#authored === '';
  }

  /**
   * Whether {@link text} is the file's own characters, which is what decides
   * the authored-text styling: that styling renders its own whitespace and
   * isolates its own bidi run, and both are wrong for a spelling this product
   * composed (`main.css` § .aci-authored-text).
   */
  public get isAuthored(): boolean {
    return this.text === escapeControlCharacters(this.#authored);
  }

  /**
   * The accessible name for a control whose visible label is {@link text}: it
   * starts with what is on screen, so a speech-input user activates the
   * control by saying what they see, and appends the spelled-out presentation
   * only where whitespace would collapse two names into one announcement
   * (WCAG 2.5.3, WCAG 2.4.4; {@link accessiblePresentationLabel}).
   */
  public get accessibleText(): string {
    return this.#authored === '' ? EMPTY_NAME_TEXT : accessiblePresentationLabel(this.#authored);
  }

  /**
   * Every spelling of this name a reader can see, for the search that narrows
   * the list by what a row displays (FR-006): the file's own characters and
   * the spelling drawn in their place, or — where no name was declared — the
   * badge and the words that stand in for it. Most names spell both the same,
   * so most rows match exactly as they did.
   */
  public get visibleSpellings(): readonly string[] {
    return this.#authored === ''
      ? [EMPTY_NAME_BADGE_TEXT, EMPTY_NAME_TEXT]
      : [this.#authored, this.text];
  }

  /**
   * The name for a surface that collapses whitespace and has no visible label
   * of this name beside it — a heading's accessible name, an `<option>`, a
   * fragment spliced into a longer accessible name. Two names differing only
   * in whitespace must not read as one there, and there is no visible
   * spelling to start from ({@link inlinePresentationLabel}).
   */
  public get singleLineText(): string {
    return this.#authored === '' ? EMPTY_NAME_TEXT : inlinePresentationLabel(this.#authored);
  }
}
