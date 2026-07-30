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
// the JSON, CSS, HTML, and TypeScript *language services*, each with its own
// worker. Those services validate and complete, which this product must not do:
// a squiggle under an inspected file would be the tool judging a customization
// it has no standing to judge. A basic language only colours text.
//
// Inertness is the configuration, not a sanitizer. The editor is read-only in
// both the model and the DOM, opens no link, resolves no URI, and loads no
// image; the authored text reaches it as a string and is never interpreted as
// markup. What it adds over a plain text node is what a large authored file
// needs: line numbers, virtualized rendering, find, keyboard navigation, and
// Monaco's own screen-reader support.
import { createOpaqueId, escapeControlCharacters } from '../../shared/entities';

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
 * The two formats this product recognizes that Monaco ships no grammar for.
 *
 * JSON has only a *service* (`esm/vs/language/json`), which brings a worker and
 * validation — and validating an inspected file is the one thing this product
 * must not do. TOML has nothing at all. Both are core customization formats
 * here: `.mcp.json`, `settings.json`, `hooks.json`, `plugin.json`, and
 * `marketplace.json` on one side, `.codex/config.toml` and `.codex/agents/*`
 * on the other.
 *
 * So each borrows the nearest grammar that is a pure tokenizer. JSON is a
 * syntactic subset of JavaScript object literals, and JSONC's comments are
 * JavaScript's too; TOML's sections, `key = value` lines, quoted strings, and
 * `#` comments are what the ini grammar colours. The borrowed id is internal —
 * the model URI is opaque and no surface shows a language name — and colouring
 * is presentation over text that is displayed exactly as authored either way.
 */
const BORROWED_GRAMMARS: ReadonlyMap<string, string> = new Map([
  ['.json', 'javascript'],
  ['.jsonc', 'javascript'],
  ['.toml', 'ini'],
]);

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
 * shows every byte.
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
 * The page follows the operating system's colour scheme through CSS system
 * colours, and Monaco picks its theme from a name rather than from CSS, so the
 * two are kept in step here. Without this the editor is a light panel on a dark
 * page for anyone whose system is dark — which is not only jarring but changes
 * the contrast of the authored text this view exists to show.
 */
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * The forced-colours query. A reader in that mode has replaced the platform's
 * colours with their own, and Monaco's ordinary themes do not meet contrast
 * there — its high-contrast themes are the ones built for it (WCAG 1.4.11).
 */
const FORCED_COLORS_QUERY = '(forced-colors: active)';

/**
 * Monaco's built-in theme name for the display the page is on: the
 * high-contrast pair when the reader has forced colours, the ordinary pair
 * otherwise, dark or light either way.
 */
function themeForDisplay(dark: boolean, forcedColors: boolean): string {
  if (forcedColors) {
    return dark ? 'hc-black' : 'hc-light';
  }
  return dark ? 'vs-dark' : 'vs';
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

  /** The colour-scheme query whose change listener keeps the theme in step. */
  readonly #colorScheme: MediaQueryList;

  /**
   * The forced-colours query, watched together with the colour scheme: the
   * theme is one decision made from both, so both have to reach the same place.
   */
  readonly #forcedColors: MediaQueryList;

  /**
   * The theme-follow listener, bound to both display queries; kept so
   * {@link dispose} can unbind it. Left bound, it would keep this handle — and
   * the disposed editor it names — alive for the life of the document.
   */
  readonly #followDisplay: () => void;

  /**
   * The element Monaco announces through, kept so {@link dispose} can empty
   * the live regions Monaco builds inside it (FR-027).
   */
  readonly #ariaContainer: HTMLElement;

  /** Binds the handle to the editor it owns and starts following the scheme. */
  public constructor(
    monaco: MonacoApi,
    editor: import('monaco-editor/esm/vs/editor/editor.api.js').editor.IStandaloneCodeEditor,
    colorScheme: MediaQueryList,
    forcedColors: MediaQueryList,
    ariaContainer: HTMLElement,
  ) {
    this.#monaco = monaco;
    this.#editor = editor;
    this.#colorScheme = colorScheme;
    this.#forcedColors = forcedColors;
    this.#ariaContainer = ariaContainer;
    // Monaco's theme is global rather than per-editor, so this sets it for
    // the one editor the page has. Both queries call it, because the theme is
    // one value derived from the pair.
    this.#followDisplay = (): void => {
      this.#monaco.editor.setTheme(
        themeForDisplay(this.#colorScheme.matches, this.#forcedColors.matches),
      );
    };
    this.#colorScheme.addEventListener('change', this.#followDisplay);
    this.#forcedColors.addEventListener('change', this.#followDisplay);
  }

  /**
   * Shows one file's complete authored source, coloured by whichever language
   * claims its path, and renames the surface after it. The previous model is
   * disposed first: a model holds the whole text, and keeping the last file's
   * alive would leave authored content in memory after the view moved on
   * (FR-027).
   *
   * A Monaco text model stores one end-of-line sequence per document, so a
   * file whose lines mix endings is rendered — and copied from the editor —
   * with its majority ending (research.md § 7). Line contents and line count
   * are unchanged, and the exact `sourceText` is unaffected: it is what the
   * detail response carries and what comparison consumes.
   */
  public showSource(sourceText: string, sourceRelativePath: string): void {
    const previous = this.#editor.getModel();
    // An opaque in-memory URI: a model URI is visible to the editor and to
    // anything inspecting it, and a Source-relative Path there would put an
    // inspected file's location into a surface that has no need for it.
    const model = this.#monaco.editor.createModel(
      sourceText,
      resolveSourceLanguage(this.#monaco.languages.getLanguages(), sourceRelativePath),
      this.#monaco.Uri.parse(`inmemory://source/${createOpaqueId()}`),
    );
    this.#editor.setModel(model);
    // Renamed with the model, so assistive technology announces the file
    // that is showing rather than the one this editor was created for. The
    // path is presentation text here, so its control characters are escaped
    // (data-model.md § SourceRelativePath).
    this.#editor.updateOptions({
      ariaLabel: `Source of ${escapeControlCharacters(sourceRelativePath)}, read-only`,
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
    this.#colorScheme.removeEventListener('change', this.#followDisplay);
    this.#forcedColors.removeEventListener('change', this.#followDisplay);
    const model = this.#editor.getModel();
    this.#editor.dispose();
    // After the editor, because disposing a model an attached editor still
    // holds leaves that editor pointing at a disposed document.
    model?.dispose();
    // The last announcement is authored text — a line of the file, a search
    // term — and Monaco's aria module holds its alert and status elements in
    // module-level variables. Those elements are Monaco's own container's
    // children rather than this one's, and clearing an ancestor only detaches
    // them: the text stays reachable from those variables until another editor
    // mounts. So every descendant is emptied in place (FR-027: the purge clears
    // authored content, it does not merely unmount it), and then the element
    // this handle added is removed, because the next mount adds its own.
    for (const region of this.#ariaContainer.querySelectorAll('*')) {
      region.textContent = '';
    }
    this.#ariaContainer.remove();
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
    const colorScheme = globalThis.matchMedia(DARK_SCHEME_QUERY);
    const forcedColors = globalThis.matchMedia(FORCED_COLORS_QUERY);
    // ARIA messages go into an element this component owns instead of
    // Monaco's default shared container under `document.body`: the shared
    // one outlives every editor, so a line it announced — authored source —
    // would survive route close and the central purge (FR-027). Inside
    // `container` it is torn down with the component, synchronously.
    const ariaContainerElement = container.ownerDocument.createElement('div');
    container.appendChild(ariaContainerElement);
    const editor = monaco.editor.create(container, {
      value: '',
      ariaContainerElement,
      theme: themeForDisplay(colorScheme.matches, forcedColors.matches),
      // Monaco's own high-contrast detection is off because this handle owns
      // the theme: it derives one value from the colour-scheme and
      // forced-colours queries together, while Monaco's detection reads only
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
      scrollBeyondLastLine: false,
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
    return new SourceViewerHandle(monaco, editor, colorScheme, forcedColors, ariaContainerElement);
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
 * it is fetched only if Monaco actually asks for one. With no language service
 * registered it normally does not, and paying for the asset up front would be
 * paying for a case that does not arise.
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
