// The read-only Monaco source surface (T099; research.md § 7, FR-027).
//
// Monaco is loaded lazily and only from this module, so a page that never
// opens a file never downloads an editor. Everything it needs is emitted by
// Vite into the packaged SPA and served by the same local host: no CDN, no
// blob worker, no `getWorkerUrl` string assembled at runtime, and nothing
// evaluated from text.
//
// The editor core plus every basic language (monaco-languages.ts) is imported;
// the full `monaco-editor` entry point is not, because it would also pull in
// the JSON, CSS, HTML, and TypeScript *language services* whole, each with its
// own worker. A service's worker-backed features validate and complete, which
// this product must not do: a squiggle under an inspected file would be the
// tool judging a customization it has no standing to judge. A basic language
// only colours text — JSON and TOML included: JSON's colouring is the JSON
// service's own local tokenizer wired directly to a hand-registered `json` id,
// with the service contribution and its worker never imported, and TOML's is a
// Monarch grammar from `@ota-meshi/site-kit-monarch-syntaxes`, which the pinned
// editor ships no grammar of its own for (monaco-languages.ts).
//
// Inertness is the configuration, not a sanitizer. The editor is read-only in
// both the model and the DOM, opens no link, resolves no URI, and loads no
// image; the authored text reaches it as a string and is never interpreted as
// markup. What it adds over a plain text node is what a large authored file
// needs: line numbers, virtualized rendering, find, keyboard navigation, and
// Monaco's own screen-reader support.
import { watch } from 'vue';
import { createOpaqueId, inlinePresentationLabel } from '../../shared/entities';
import { colorScheme } from './color-scheme';

/**
 * One registered language, reduced to what choosing between them needs. Taken
 * as data rather than read from Monaco inside {@link resolveSourceLanguage} so
 * the choice is testable without loading an editor.
 */
export interface RegisteredLanguage {
  /** The language id a model is created with. */
  readonly id: string;
  /** Extensions the language claims, each including its leading dot. */
  readonly extensions?: readonly string[] | undefined;
  /** Exact file names the language claims, such as `Dockerfile`. */
  readonly filenames?: readonly string[] | undefined;
}

/**
 * The spellings no registered language claims, mapped to the language whose
 * grammar they take.
 *
 * JSON's own colouring comes from the JSON service's local tokenizer, wired
 * directly to the `json` id (monaco-languages.ts): that registration claims
 * `.json` itself, so only `.jsonc` is mapped here, to the same tokenizer —
 * its comment support is the tokenizer's own. The mapped id is internal — the
 * model URI is opaque and no surface shows a language name — and colouring is
 * presentation over text that is displayed exactly as authored either way.
 *
 * The entry is an extension that names one format. A suffix several
 * unrelated tools use is not evidence of a syntax and gets no entry: `.rules`
 * is a spelling other products give files of their own, so borrowing a
 * grammar for the suffix would colour those as something they are not. Where
 * a syntax is known it is the surface that knows it — the `.rules` format is
 * Starlark because Codex's own rules page says so, not because of how the
 * file is spelled — and the surface names the language itself
 * (`SourceViewerHandle.showSource` § contentLanguage).
 */
const BORROWED_GRAMMARS: ReadonlyMap<string, string> = new Map([['.jsonc', 'json']]);

/** The language a file with no claim gets: shown exactly as authored, uncoloured. */
const PLAIN_TEXT = 'plaintext';

/**
 * Chooses a language for one Source-relative Path from the registered set.
 *
 * The path decides, never the content: guessing from what a file looks like
 * inside is interpretation, and a mis-guess would colour authored text as
 * something it is not. An exact file name wins over an extension, because a
 * name like `Dockerfile` is more specific than any suffix it happens to have.
 * A path nothing claims is plain text, which is the honest answer and still
 * shows every character.
 */
export function resolveSourceLanguage(
  languages: readonly RegisteredLanguage[],
  sourceRelativePath: string,
): string {
  const name = sourceRelativePath.slice(sourceRelativePath.lastIndexOf('/') + 1);
  const lower = name.toLowerCase();
  for (const language of languages) {
    if (language.filenames?.some((candidate) => candidate.toLowerCase() === lower) === true) {
      return language.id;
    }
  }
  const dot = lower.lastIndexOf('.');
  // A dot at position 0 is a leading dot — `.gitignore` is a name, not an
  // extension — so it names no suffix to match.
  const extension = dot > 0 ? lower.slice(dot) : '';
  if (extension === '') {
    return PLAIN_TEXT;
  }
  for (const language of languages) {
    if (language.extensions?.some((candidate) => candidate.toLowerCase() === extension) === true) {
      return language.id;
    }
  }
  return BORROWED_GRAMMARS.get(extension) ?? PLAIN_TEXT;
}

/**
 * The forced-colours query. A reader in that mode has replaced the platform's
 * colours with their own, and Monaco's ordinary themes do not meet contrast
 * there — its high-contrast themes are the ones built for it (WCAG 1.4.11).
 */
const FORCED_COLORS_QUERY = '(forced-colors: active)';

/**
 * The one element every editor announces through.
 *
 * Shared rather than per-viewer because Monaco's aria module keeps a single
 * module-level container: whichever editor mounted last owns it for all of
 * them. A container owned by one viewer would therefore be removed while
 * another viewer was still open, and that viewer's announcements would go to a
 * node no longer in the document. Monaco's own default lives under
 * `document.body` and outlives every editor, which is what this replaces: this
 * one is emptied by whichever handle disposes, so no announced line of authored
 * source survives a purge (FR-027).
 */
let sharedAriaContainer: HTMLElement | null = null;

/** The shared container, created on the first mount. */
function ariaContainer(): HTMLElement {
  sharedAriaContainer ??= globalThis.document.body.appendChild(
    globalThis.document.createElement('div'),
  );
  return sharedAriaContainer;
}

/**
 * Monaco's built-in theme name for the display the page is on: the
 * high-contrast pair when the reader has forced colours, the ordinary pair
 * otherwise, dark or light either way.
 *
 * The page draws itself in CSS system colours and Monaco picks its theme from a
 * name rather than from CSS, so the two are kept in step through this. Without
 * it the editor is a light panel on a dark page — which is not only jarring but
 * changes the contrast of the authored text this view exists to show.
 */
function themeForDisplay(dark: boolean, forcedColors: boolean): string {
  if (forcedColors) {
    return dark ? 'hc-black' : 'hc-light';
  }
  return dark ? 'vs-dark' : 'vs';
}

/**
 * Binds one theme-follow listener to both of the display's halves and returns
 * the controller that unbinds them on dispose. Monaco's theme is global rather
 * than per-editor, so every handle setting it sets it for all of them — which
 * is what the page wants, because the display scheme is one fact and not one
 * per viewer.
 *
 * The two halves share the listener, because the theme is one value derived
 * from the pair (WCAG 1.4.11), and one signal unbinds them for the same reason:
 * they are one subscription, so a caller cannot end half of it. They are watched
 * differently only because they are answered differently — the scheme is the
 * reader's own choice, taken from the page's one copy of it
 * (`color-scheme.ts`), while forced colours is a display mode nobody chooses
 * here and stays a media query.
 */
function followDisplayTheme(monaco: MonacoApi, forcedColors: MediaQueryList): AbortController {
  const binding = new AbortController();
  const follow = (): void => {
    monaco.editor.setTheme(themeForDisplay(colorScheme.value === 'dark', forcedColors.matches));
  };
  const unwatchScheme = watch(colorScheme, follow);
  binding.signal.addEventListener('abort', unwatchScheme);
  forcedColors.addEventListener('change', follow, { signal: binding.signal });
  return binding;
}

/**
 * Empties every announced message in the shared ARIA container. The last
 * announcement is authored text — a line of a file, a search term — so each
 * handle's dispose clears it (FR-027: the purge clears authored content, it
 * does not merely unmount it). Only the text is cleared: Monaco's aria
 * module holds its live regions in module-level variables, and emptying the
 * wrapper that holds them would take those elements out of the document
 * while the variables still point at them — every later announcement would
 * then be written into a node no reader can hear. Walking the text nodes
 * clears every message without moving a single element, and the container
 * itself stays so whichever viewer is still open can still speak.
 */
function clearAnnouncedText(): void {
  const messages = globalThis.document.createTreeWalker(
    ariaContainer(),
    globalThis.NodeFilter.SHOW_TEXT,
  );
  for (let node = messages.nextNode(); node !== null; node = messages.nextNode()) {
    node.nodeValue = '';
  }
}

/**
 * Removes the stale live-region wrappers a fresh mount leaves behind. Monaco
 * builds a new wrapper of live regions on every create when it is given a
 * parent — the guard that would build one once is skipped in that case — and
 * points its module-level variables at the newest. The wrappers before it
 * are unreachable from those variables and would pile up one per mount: a
 * tab switch, a failed-mount retry, a route revisited. Only the one Monaco
 * is now announcing through stays.
 */
function dropStaleAnnouncementWrappers(announcements: HTMLElement): void {
  for (const stale of [...announcements.children].slice(0, -1)) {
    stale.remove();
  }
}

/**
 * The Monaco module surface this composable uses, named so the import's shape
 * is visible here rather than inferred at each call. Declared as the type of
 * the dynamic import so it cannot drift from what is actually loaded.
 */
type MonacoApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');

/**
 * One mounted read-only source surface, owned by the component that made it.
 * Constructed only by its own {@link SourceViewerHandle.mount}, which is what
 * awaits the editor module and creates the editor this class then owns.
 */
export class SourceViewerHandle {
  /** The loaded Monaco module the editor and its models come from. */
  readonly #monaco: MonacoApi;

  /** The one read-only editor this handle owns and disposes. */
  readonly #editor: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneCodeEditor;

  /**
   * The theme-follow subscription on both halves of the display — the reader's
   * colour scheme and forced colours, which the theme is one decision from —
   * held so {@link dispose} can abort it. Left bound, it would keep this
   * handle, and the disposed editor it names, alive for the life of the
   * document.
   */
  readonly #displayThemeFollow: AbortController;

  /**
   * The content-size listener of a fit-content mount, or null for the fixed
   * reading box; kept so {@link dispose} unbinds it with the editor
   * (`SourceViewerHandle.mount` § fitContent).
   */
  readonly #fitContent: import('monaco-editor/esm/vs/editor/editor.api.js').IDisposable | null;

  /** Binds the handle to the editor it owns and starts following the scheme. */
  public constructor(
    monaco: MonacoApi,
    editor: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneCodeEditor,
    forcedColors: MediaQueryList,
    fitContent: import('monaco-editor/esm/vs/editor/editor.api.js').IDisposable | null = null,
  ) {
    this.#monaco = monaco;
    this.#editor = editor;
    this.#displayThemeFollow = followDisplayTheme(monaco, forcedColors);
    this.#fitContent = fitContent;
  }

  /**
   * Shows authored text from one file, coloured by whichever language claims
   * its path, and renames the surface after it. `contentLabel` says what of
   * that file is on screen, because a caller may pass a part of it — the skill
   * body is the file with its frontmatter block removed — and a surface that
   * announced every slice as the file would misreport the shorter one as the
   * whole (FR-025). The previous model is disposed first: a model holds the
   * whole text, and keeping the last file's alive would leave authored content
   * in memory after the view moved on (FR-027).
   *
   * A Monaco text model stores one end-of-line sequence per document, so a
   * file whose lines mix endings is rendered — and copied from the editor —
   * with its majority ending (research.md § 7). Line contents and line count
   * are unchanged, and the exact `sourceText` is unaffected: it is what the
   * detail response carries and what comparison consumes.
   */
  public showSource(
    sourceText: string,
    sourceRelativePath: string,
    contentLabel = 'Source of',
    contentLanguage?: string,
  ): void {
    const previous = this.#editor.getModel();
    // An opaque in-memory URI: a model URI is visible to the editor and to
    // anything inspecting it, and a Source-relative Path there would put an
    // inspected file's location into a surface that has no need for it.
    // `contentLanguage` overrides the path's claim when the caller knows the
    // text's syntax and the path does not say it: a canonical serialization
    // rather than the file's own bytes — the MCP detail shows a declaration
    // as JSON whatever the carrier's extension would resolve to — or a file
    // whose vendor fixes a syntax its suffix does not. Mirrors
    // `SourceComparisonInput.contentLanguage`.
    let model: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel | null = null;
    try {
      model = this.#monaco.editor.createModel(
        sourceText,
        contentLanguage ??
          resolveSourceLanguage(this.#monaco.languages.getLanguages(), sourceRelativePath),
        this.#monaco.Uri.parse(`inmemory://source/${createOpaqueId()}`),
      );
      this.#editor.setModel(model);
    } catch (error) {
      // The environment-determined failure research.md § 7 names, mid-swap:
      // nothing may survive it holding authored text past the throw the
      // owning component's fallback handles (FR-027) — not the half-built
      // model, and not the previous file's model either, because the
      // component disposes the editor and shows the fallback next, and the
      // editor disposes only the model it currently holds.
      model?.dispose();
      previous?.dispose();
      throw error;
    }
    // Renamed with the model, so assistive technology announces the file
    // that is showing rather than the one this editor was created for. The
    // label says which part of that file: an editor showing the instructions a
    // frontmatter block was removed from is not showing the file's source, and
    // announcing it as such would name content the reader is not being given.
    // The path rides through the whitespace-safe spelling: an accessible
    // name is a flat string whose consecutive spaces collapse, and two
    // paths differing only in them must not name one editor (FR-025,
    // data-model.md § SourceRelativePath).
    this.#editor.updateOptions({
      ariaLabel: `${contentLabel} ${inlinePresentationLabel(sourceRelativePath)}, read-only`,
    });
    previous?.dispose();
  }

  /**
   * Moves keyboard focus into the editor. Called by the viewer's retry path:
   * the failed state's button unmounts when the retry succeeds, and without a
   * move focus would drop to the document body (WCAG 2.4.3) — the editor the
   * reader was trying to reach is the continuation of that click.
   */
  public focus(): void {
    this.#editor.focus();
  }

  /**
   * Disposes the editor, its current model, and every subscription. Separate
   * disposal is deliberate — Monaco does not dispose a model with its editor,
   * so an editor-only teardown would retain the authored text.
   */
  public dispose(): void {
    this.#displayThemeFollow.abort();
    this.#fitContent?.dispose();
    const model = this.#editor.getModel();
    this.#editor.dispose();
    // After the editor, because disposing a model an attached editor still
    // holds leaves that editor pointing at a disposed document.
    model?.dispose();
    clearAnnouncedText();
  }

  /**
   * Mounts a read-only editor into `container` (research.md § 7).
   *
   * Every option below is part of the inertness or accessibility contract rather
   * than a style choice: `readOnly` and `domReadOnly` make the text
   * uneditable in the model and in the DOM, `links: false` stops Monaco turning
   * an authored URL into something clickable, and `contextmenu: false` removes
   * the menu whose entries act on a document this view does not own.
   * `accessibilitySupport: 'auto'` lets Monaco detect a screen reader — its own
   * documentation says to leave it there rather than force it. The surface is
   * named by {@link SourceViewerHandle.showSource} rather than here, because a
   * label fixed at mount would keep naming the first file after the reader moved
   * to another one. `accessibilityVerbose` is not among them:
   * in Monaco 0.55 it is a diff-editor option, so it belongs to the comparison
   * surface rather than to this single-file view.
   */
  public static async mount(container: HTMLElement): Promise<SourceViewerHandle> {
    const monaco = await loadMonaco();
    const forcedColors = globalThis.matchMedia(FORCED_COLORS_QUERY);
    // ARIA messages go into this module's own element rather than Monaco's
    // default: Monaco's is created once and never emptied, so a line it
    // announced — authored source — would survive route close and the central
    // purge (FR-027). This one is emptied by every dispose.
    const announcements = ariaContainer();
    const editor = monaco.editor.create(container, {
      value: '',
      ariaContainerElement: announcements,
      theme: themeForDisplay(colorScheme.value === 'dark', forcedColors.matches),
      // Monaco's own high-contrast detection is off because this handle owns
      // the theme: it derives one value from the reader's colour scheme and the
      // forced-colours query together, while Monaco's detection reads only
      // forced colours and would be a second owner of the same decision. It
      // also loses to an explicit `theme`, which is passed above — the service
      // auto-detects at construction and `setTheme` then overwrites it, so
      // leaving detection on would have shipped a low-contrast theme under
      // forced colours (WCAG 1.4.11).
      autoDetectHighContrast: false,
      readOnly: true,
      domReadOnly: true,
      links: false,
      contextmenu: false,
      // Suggestions would offer to change a document that cannot be edited, and
      // word-based ones are also what makes Monaco reach for a worker.
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
      accessibilitySupport: 'auto',
      automaticLayout: true,
      minimap: { enabled: false },
      // Nothing marks a current line: the editor takes no cursor a reader put
      // there, so the band Monaco draws across the first line reports a
      // position nobody chose.
      renderLineHighlight: 'none',
      // And no overview ruler: it is the strip that summarizes a document's
      // decorations, and this editor has none to summarize — errors, warnings,
      // and search hits all belong to surfaces this product does not offer
      // (FR-032). Drawn anyway it took fourteen pixels down the right edge and
      // showed, on a two-line file, as a short dash beside nothing. The diff
      // editor keeps its ruler, where the strip carries where the changes are.
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      scrollBeyondLastLine: false,
      // The editor is a bounded box inside a page that scrolls. Monaco's
      // default consumes every wheel event it receives, so a reader scrolling
      // the page gets trapped the moment the pointer crosses the editor —
      // even once the editor itself has nothing left to scroll. With this
      // off, a wheel the editor cannot use any further is left to the page,
      // which is where a reader at the editor's edge is trying to go.
      scrollbar: { alwaysConsumeMouseWheel: false },
      renderWhitespace: 'selection',
      // Authored lines are not reflowed: a wrapped line would show a break the
      // file does not contain, and this view's claim is that it shows the file
      // exactly as written.
      wordWrap: 'off',
      // Monaco's Unicode highlighter is a linter: on by default it decorates
      // invisible and ambiguous characters, hovers them with a warning, and
      // offers to configure the rule. FR-032 forbids this surface from acting
      // as a validator or linter, and the finding would be Monaco's opinion
      // about the reader's own file. Where a character's spelling does matter,
      // the product says so itself — path presentation escapes what would
      // render as nothing or reorder its neighbours (data-model.md
      // § SourceRelativePath).
      unicodeHighlight: {
        nonBasicASCII: false,
        invisibleCharacters: false,
        ambiguousCharacters: false,
      },
    });
    dropStaleAnnouncementWrappers(announcements);
    // The container follows the content: every content-size change — the
    // first model above all — writes the editor's own height back to the
    // element, and `automaticLayout` re-lays the editor out to the box the
    // caller's stylesheet caps. Written as a style, because the cap is the
    // stylesheet's (`max-block-size`) and an inline height alone decides
    // nothing past it. Every single-file surface takes the shown text's own
    // height: a fixed reading box left a two-line file under an empty frame
    // (FR-007).
    const fit = (): void => {
      container.style.blockSize = `${editor.getContentHeight()}px`;
    };
    const fitContent = editor.onDidContentSizeChange(fit);
    fit();
    return new SourceViewerHandle(monaco, editor, forcedColors, fitContent);
  }
}

/** The complete input one comparison surface shows: both sides, named by path. */
export interface SourceComparisonInput {
  /**
   * The first side's complete `sourceText`, exactly as committed — or, for
   * a stated absent side (`originalAbsent`), the empty diff operand that
   * renders the other side's content as the difference.
   */
  readonly originalText: string;
  /** The first side's Source-relative Path: language choice and label. */
  readonly originalPath: string;
  /** The second side's text; see {@link originalText}. */
  readonly modifiedText: string;
  /** The second side's Source-relative Path: language choice and label. */
  readonly modifiedPath: string;
  /**
   * Whether the first side names a corresponding file its copy does not
   * ship. The side's empty text is then diff arithmetic rather than an
   * authored empty file, and its label states the absence instead of naming
   * a file that does not exist (FR-025).
   */
  readonly originalAbsent?: boolean;
  /** Whether the second side names an absent counterpart; see {@link originalAbsent}. */
  readonly modifiedAbsent?: boolean;
  /**
   * The language id both models are created with, set when the compared
   * texts are one canonical serialization rather than the files' own bytes —
   * the MCP declaration comparison serializes both sides to JSON, so the
   * carriers' paths, a `.toml` beside a `.json`, must not choose the
   * colouring (research.md § 7). Omitted, each side's language is resolved
   * from its own path, which is the file-comparison surfaces' rule.
   */
  readonly contentLanguage?: string;
  /**
   * What of each file the sides show, spliced into each side's accessible
   * name — `frontmatter of`, `declaration <name> of` — because a surface
   * that announced a serialized slice as the whole file would misreport it
   * (FR-025), the same slice-naming contract as
   * `SourceViewerHandle.showSource`'s `contentLabel`. Omitted, the sides
   * are announced as the compared files themselves. An absent side keeps
   * its no-file phrasing either way: the absence is the file's, whatever of
   * it the present side shows.
   */
  readonly contentLabel?: string;
}

/**
 * One mounted read-only source-comparison surface (research.md § 7, FR-011),
 * owned by the component that made it. A handle is bound to the one pair of
 * files it was mounted with: its models are created in
 * {@link SourceDiffHandle.mount} and live exactly as long as the handle, so
 * a different pair is a new mount — there is no model-swap path whose labels
 * could drift from what is on screen. Constructed only by its own `mount`.
 */
export class SourceDiffHandle {
  /** The one read-only diff editor this handle owns and disposes. */
  readonly #editor: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneDiffEditor;

  /** The theme-follow subscription on both halves of the display; see the viewer handle. */
  readonly #displayThemeFollow: AbortController;

  /**
   * The per-inner-editor subscriptions — the two side-label restorers, plus
   * a fit-content mount's content-size listeners — unbound by
   * {@link dispose}; see {@link mount}.
   */
  readonly #relabel: readonly import('monaco-editor/esm/vs/editor/editor.api.js').IDisposable[];

  /** Binds the handle to the diff editor it owns and starts following the scheme. */
  public constructor(
    monaco: MonacoApi,
    editor: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneDiffEditor,
    forcedColors: MediaQueryList,
    relabel: readonly import('monaco-editor/esm/vs/editor/editor.api.js').IDisposable[],
  ) {
    this.#editor = editor;
    this.#displayThemeFollow = followDisplayTheme(monaco, forcedColors);
    this.#relabel = relabel;
  }

  /**
   * Moves keyboard focus into the diff editor. Called by the comparison
   * surface's retry path for the same reason as the viewer's: the failed
   * state's button unmounts when the retry succeeds, and the editor the
   * reader was trying to reach is the continuation of that click
   * (WCAG 2.4.3).
   */
  public focus(): void {
    this.#editor.focus();
  }

  /**
   * Disposes the diff editor, both of its models, and every subscription.
   * Separate disposal is deliberate — Monaco does not dispose models with
   * their editor, so an editor-only teardown would retain both files'
   * complete authored text (FR-027).
   */
  public dispose(): void {
    this.#displayThemeFollow.abort();
    for (const subscription of this.#relabel) {
      subscription.dispose();
    }
    const model = this.#editor.getModel();
    this.#editor.dispose();
    // After the editor, because disposing a model an attached editor still
    // holds leaves that editor pointing at a disposed document.
    model?.original.dispose();
    model?.modified.dispose();
    clearAnnouncedText();
  }

  /**
   * Mounts a read-only diff editor into `container` showing `comparison`
   * (research.md § 7).
   *
   * The single-file surface's inertness and accessibility contract carries
   * over — `readOnly`, `domReadOnly`, `links: false`, `contextmenu: false`,
   * no suggestions, no Unicode lint, own ARIA container — and the diff
   * surface adds its own three: `originalEditable: false`, because
   * `readOnly` governs only the modified editor and the original must be as
   * uneditable; `renderMarginRevertIcon: false`, because the margin's revert
   * arrow is an edit affordance on a surface that must propose no change
   * (FR-012); and `accessibilityVerbose: true`, which is a diff-editor
   * option in Monaco 0.55 and turns on the verbose diff messages of the
   * accessible diff viewer. Monaco's side-by-side layout and its
   * narrow-container inline switch are left at their defaults, which is the
   * narrow-screen inline mode the accessibility contract exercises.
   *
   * A construction failure propagates to the caller: the comparison
   * component owns the fallback — the complete side-by-side sources as inert
   * text — and a handle that half-mounted would have nothing to fall back
   * from. The models are created only after the editor, so a failed
   * construction leaves no model holding authored text.
   */
  public static async mount(
    container: HTMLElement,
    comparison: SourceComparisonInput,
    mountOptions?: {
      /**
       * Sizes `container` to the taller of the two shown documents instead
       * of leaving its CSS height alone, the caller's stylesheet capping it
       * (`max-block-size`) — the same contract as the single-file viewer's
       * fit (`SourceViewerHandle.mount` § fitContent). Set by the
       * serialized-declaration diffs, whose documents are usually short.
       */
      readonly fitContent?: boolean;
    },
  ): Promise<SourceDiffHandle> {
    const monaco = await loadMonaco();
    const forcedColors = globalThis.matchMedia(FORCED_COLORS_QUERY);
    // ARIA messages go into this module's own element rather than Monaco's
    // default under `document.body`, which outlives every editor (FR-027).
    // `ariaContainerElement` is typed on the standalone editor's construction
    // options but not on the diff editor's; the diff editor hands its raw
    // options to the two standalone editors it constructs, which is where the
    // element takes effect, so the option is carried by an intersection type
    // rather than a cast.
    const announcements = ariaContainer();
    const options: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneDiffEditorConstructionOptions &
      Pick<
        import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneEditorConstructionOptions,
        // `wordBasedSuggestions` is a global editor option the standalone
        // diff editor applies through its configuration service, so it is
        // carried the same way as the ARIA container.
        'ariaContainerElement' | 'wordBasedSuggestions'
      > = {
      ariaContainerElement: announcements,
      theme: themeForDisplay(colorScheme.value === 'dark', forcedColors.matches),
      // This handle owns the theme; see the viewer handle's mount for why
      // Monaco's own high-contrast detection stays off (WCAG 1.4.11).
      autoDetectHighContrast: false,
      readOnly: true,
      domReadOnly: true,
      originalEditable: false,
      links: false,
      contextmenu: false,
      renderMarginRevertIcon: false,
      // The comparison is literal (FR-011): Monaco's default computes the
      // diff ignoring leading and trailing whitespace, which would render two
      // lines differing only in that whitespace as unchanged — exactly the
      // kind of difference FR-025 keeps distinguishable.
      ignoreTrimWhitespace: false,
      // Diff computation runs on Monaco and browser capacity alone: the
      // default is a five-second cutoff that silently settles for a partial
      // diff, which would be a product-defined computation-time ceiling
      // research.md § 7 rules out. Zero disables the cutoff.
      maxComputationTime: 0,
      accessibilityVerbose: true,
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
      accessibilitySupport: 'auto',
      automaticLayout: true,
      minimap: { enabled: false },
      // Nothing marks a current line here either; see the viewer handle's
      // mount. The overview ruler stays, because in a diff the strip is where
      // the changes are.
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      // A wheel the diff cannot scroll any further is left to the page; see
      // the viewer handle's mount.
      scrollbar: { alwaysConsumeMouseWheel: false },
      renderWhitespace: 'selection',
      wordWrap: 'off',
      // Monaco's Unicode highlighter is a linter; see the viewer handle's
      // mount (FR-032).
      unicodeHighlight: {
        nonBasicASCII: false,
        invisibleCharacters: false,
        ambiguousCharacters: false,
      },
    };
    const editor = monaco.editor.createDiffEditor(container, options);
    // Everything after the editor's construction runs under a rollback: a
    // failure anywhere in it — the environment-determined construction
    // failure research.md § 7 names — must not strand the editor, a model
    // holding authored text, or a listener past the throw the caller's
    // fallback handles, because nothing would ever dispose them and the
    // purge could not reach the retained text (FR-027).
    const relabel: import('monaco-editor/esm/vs/editor/editor.api.js').IDisposable[] = [];
    let original: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel | null =
      null;
    let modified: import('monaco-editor/esm/vs/editor/editor.api.js').editor.ITextModel | null =
      null;
    try {
      // The diff editor constructs two standalone editors, so two fresh
      // live-region wrappers were appended; only the one Monaco is announcing
      // through stays.
      dropStaleAnnouncementWrappers(announcements);
      // The two sides are named after construction, on the inner editors —
      // the same post-construction `updateOptions` path the single-file
      // viewer's label takes — because construction-time `originalAriaLabel`/
      // `modifiedAriaLabel` do not survive Monaco's initial option
      // synchronization: verified against the packaged editor, both textboxes
      // end up carrying only the default accessibility-help hint. Each side is
      // spelled like every path label (data-model.md § SourceRelativePath),
      // and an absent side is named as the stated absence it is rather than as
      // a file that does not exist (FR-025).
      // The paths ride through the whitespace-safe spelling: an accessible
      // name is a flat string whose consecutive spaces collapse, and two
      // paths differing only in them must not name one editor (FR-025).
      const contentNoun = comparison.contentLabel ?? 'file';
      const originalLabel =
        comparison.originalAbsent === true
          ? `First side: no file at ${inlinePresentationLabel(comparison.originalPath)}`
          : `First compared ${contentNoun} ${inlinePresentationLabel(comparison.originalPath)}, read-only`;
      const modifiedLabel =
        comparison.modifiedAbsent === true
          ? `Second side: no file at ${inlinePresentationLabel(comparison.modifiedPath)}`
          : `Second compared ${contentNoun} ${inlinePresentationLabel(comparison.modifiedPath)}, read-only`;
      const applySideLabels = (): void => {
        editor.getOriginalEditor().updateOptions({ ariaLabel: originalLabel });
        editor.getModifiedEditor().updateOptions({ ariaLabel: modifiedLabel });
      };
      applySideLabels();
      // Nor do the labels survive the editor's own later option
      // re-synchronizations: the responsive switch between the side-by-side
      // and inline layouts reapplies the diff options to the inner editors and
      // wipes both labels again — verified against the packaged editor by
      // resizing across the breakpoint. Each inner editor therefore restores
      // the labels whenever a configuration change touches `ariaLabel`;
      // restoring an already-correct label is not a change, so the listener
      // settles instead of looping.
      relabel.push(
        editor.getOriginalEditor().onDidChangeConfiguration((event) => {
          if (event.hasChanged(monaco.editor.EditorOption.ariaLabel)) {
            applySideLabels();
          }
        }),
        editor.getModifiedEditor().onDidChangeConfiguration((event) => {
          if (event.hasChanged(monaco.editor.EditorOption.ariaLabel)) {
            applySideLabels();
          }
        }),
      );
      if (mountOptions?.fitContent === true) {
        // The container follows the taller side, and `automaticLayout` re-lays
        // the diff out to the box the caller's stylesheet caps — the diff
        // twin of the single-file fit (`SourceViewerHandle.mount`
        // § fitContent). Both inner editors report, because either side can
        // be the taller one.
        const fit = (): void => {
          container.style.blockSize = `${Math.max(
            editor.getOriginalEditor().getContentHeight(),
            editor.getModifiedEditor().getContentHeight(),
          )}px`;
        };
        relabel.push(
          editor.getOriginalEditor().onDidContentSizeChange(fit),
          editor.getModifiedEditor().onDidContentSizeChange(fit),
        );
        fit();
      }
      const languages = monaco.languages.getLanguages();
      // Both sides hold the complete literal `sourceText` (FR-011), each in an
      // opaque in-memory model: a Source-relative Path in a model URI would put
      // an inspected file's location into a surface that has no need for it.
      original = monaco.editor.createModel(
        comparison.originalText,
        comparison.contentLanguage ?? resolveSourceLanguage(languages, comparison.originalPath),
        monaco.Uri.parse(`inmemory://source/${createOpaqueId()}`),
      );
      modified = monaco.editor.createModel(
        comparison.modifiedText,
        comparison.contentLanguage ?? resolveSourceLanguage(languages, comparison.modifiedPath),
        monaco.Uri.parse(`inmemory://source/${createOpaqueId()}`),
      );
      editor.setModel({ original, modified });
      return new SourceDiffHandle(monaco, editor, forcedColors, relabel);
    } catch (error) {
      for (const subscription of relabel) {
        subscription.dispose();
      }
      modified?.dispose();
      original?.dispose();
      editor.dispose();
      clearAnnouncedText();
      throw error;
    }
  }
}

/**
 * The one loaded Monaco module, shared by every mount in the page. The import
 * is started once and awaited by later callers, so two quick file opens do not
 * fetch the editor twice. Only a fulfilled load stays cached: see
 * {@link loadMonaco}.
 */
let monacoModule: Promise<MonacoApi> | null = null;

/**
 * Loads the editor core and the tokenizers, and registers the worker factory.
 *
 * The worker is imported inside `getWorker` rather than beside the editor, so
 * it is fetched only if Monaco actually asks for one. With no worker-backed
 * provider registered — JSON is wired to its local tokenizer alone
 * (monaco-languages.ts) — it normally does not, and paying for the asset up
 * front would be paying for a case that does not arise.
 *
 * A failed load is uncached before it is reported: the viewer's failure state
 * offers a retry, and a retry that re-awaited the same cached rejection could
 * never succeed even after whatever interrupted the chunk — most plausibly a
 * dropped local host — came back.
 */
async function loadMonaco(): Promise<MonacoApi> {
  monacoModule ??= (async () => {
    const monaco = await import('monaco-editor/esm/vs/editor/editor.api.js');
    await import('./monaco-languages');
    self.MonacoEnvironment = {
      getWorker: async () => {
        const { default: EditorWorker } =
          await import('monaco-editor/esm/vs/editor/editor.worker.js?worker');
        return new EditorWorker();
      },
    };
    return monaco;
  })().catch((error: unknown) => {
    monacoModule = null;
    throw error;
  });
  return monacoModule;
}
