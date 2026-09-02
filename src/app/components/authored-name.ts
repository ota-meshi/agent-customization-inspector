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
// Both are answered by substitution, for every kind alike. A name with nothing
// to draw is spelled out in full — `\u0020` for one space, `\u0020\u0020`
// for two — so two such names stay two things on the screen, which is what
// keeping the invisible characters and adding one shared note beside them
// could not do: the note read identically under both, and the runs differed by
// the width of a space (FR-025; `entities.ts` § pathPresentationLabel makes
// the same call for a path, because a label has to be unambiguous on its own).
//
// A spelled-out name is this product's characters, so {@link isAuthored} is
// false for it and the surface styles it as the product's own — the same
// distinction every row already draws.
//
// One unit rather than the same ternaries in each row, detail, and comparison.
// Ten surfaces derived them separately and one went stale unnoticed: after the
// MCP comparison's own name element was removed, its crumb kept the raw name,
// so the page announced "(empty name)" and drew nothing where the name went.
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
 * What a surface draws for a name whose every character draws nothing at all.
 * The label rules spell out what they can, and the empty string leaves them
 * nothing to spell, so the name is noted instead — one note, so a reader who
 * met it on a row meets the same words on the detail and the comparison.
 */
const EMPTY_NAME_TEXT = '(empty name)';

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
