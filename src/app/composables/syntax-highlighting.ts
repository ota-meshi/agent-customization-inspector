// The read-only source colouring every source surface draws with (T1206;
// research.md § 7, FR-027, FR-032).
//
// shiki tokenizes text and nothing more: it returns, per line, the runs of
// characters a TextMate grammar recognized and the colour a theme gives each
// run. It has no editor, no worker, no document model, and no feature that
// validates, completes, or hovers — colouring is tokenizing rather than
// judging, so nothing here can mark an inspected customization as invalid
// (FR-032). A surface renders the runs it is given as text nodes inside
// `<span>`s it styles from each run's own colour variables; no HTML is
// generated or parsed on the way (FR-027).
//
// The highlighter ships in a chunk of its own that every route showing a file
// depends on, so the browser fetches it with the first such route — or ahead
// of it, when the inventory's links to detail routes are prefetched — and
// constructs it on the first file shown; nothing runs until then. Grammars are
// lazier: shiki's
// registration table (`shiki/langs`) holds one dynamic import per bundled
// language, and the chunk it names is fetched the first time a file of that
// language is shown — so a repository whose skills ship only Markdown pays for
// no other grammar. Every bundled grammar ships in the package all the same,
// each as its own chunk — 243 of them, 8.2 MB unpacked and 1.4 MB compressed
// on 2026-09-09 — because which languages a reader meets is decided by
// whatever a customization's directory contains, and a list authored here
// would leave every language outside it plain text: the package pays disk
// for that, and a page pays only for the grammars it opens. The
// regular-expression engine is shiki's JavaScript one
// rather than the Oniguruma WebAssembly build: it needs no `.wasm` asset,
// evaluates nothing from text, and every bundled grammar runs on it (measured
// against shiki 4.4.3 on 2026-09-09, where it was also the faster of the two
// over this product's own documents).
//
// The themes are VS Code's Default Light+ and Dark+, one per colour scheme —
// the themes a reader's own editor most plausibly shows their file in, so it
// is coloured as they know it — applied as dual-theme CSS variables
// (`--shiki-light`, `--shiki-dark`) rather than as one resolved colour: the
// stylesheet composes them into a `light-dark()` resolved against the root's
// `color-scheme`, as every other colour on the page is (`main.css`
// § .aci-source-run), and no theme is set from script when the scheme
// changes. Under forced colours the platform overrides every text colour
// (WCAG 1.4.11), so the runs stand there as uncoloured text.
//
// The pair leaves two of TOML's scopes in the surrounding colour — a table
// header (`entity.name.section`) and a date (`constant.other.date`) — exactly
// as VS Code's Default themes do over the same grammar; measured across every
// bundled theme on 2026-09-09, 28 colour both, and staying with the pair the
// reader's editor shows was preferred to changing hue for two scopes. The
// grammar classifies them correctly, so neither a theme rule nor a grammar of
// this product's own is the fix for what is a theme's choice.
import {
  createHighlighterCore,
  normalizeTheme,
  type HighlighterCore,
  type ThemedToken,
} from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import darkPlus from '@shikijs/themes/dark-plus';
import lightPlus from '@shikijs/themes/light-plus';
import { bundledLanguage } from './source-languages';

/**
 * The theme each scheme colours with, keyed by the scheme name that becomes
 * the variable suffix each run carries (`--shiki-light`, `--shiki-dark`).
 */
const THEMES = { light: 'light-plus', dark: 'dark-plus' } as const;

/**
 * The one loaded highlighter, shared by every surface in the page. The load is
 * started once and awaited by later callers, so two quick file opens do not
 * construct it twice. Only a fulfilled load stays cached: see
 * {@link loadHighlighter}.
 */
let highlighter: Promise<HighlighterCore> | null = null;

/**
 * Loads the highlighter with both themes and no grammar; grammars arrive one
 * at a time through {@link highlightSource}.
 *
 * A failed load is uncached before it is reported: the next file shown tries
 * again, where re-awaiting the same cached rejection could never succeed even
 * after whatever interrupted the chunk — most plausibly a dropped local host —
 * came back.
 */
function loadHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [lightPlus, darkPlus],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  }).catch((error: unknown) => {
    highlighter = null;
    throw error;
  });
  return highlighter;
}

/**
 * The colour each theme gives text it colours no further — its
 * `editor.foreground` — as the pair the comparison draws a changed line's
 * words in: inside a word band the token colours yield to this one colour, so
 * the band has one contrast ratio to keep rather than one per token
 * (`SourceDiff.vue` § .aci-source-diff__run--changed). Read through the same
 * normalization the highlighter applies to the themes it loads, so it is the
 * value `getTheme().fg` reports and cannot drift from what the runs beside the
 * band are coloured by — but without the highlighter, which a band's colour
 * has no reason to wait for.
 */
export const SOURCE_THEME_FOREGROUND: { readonly light: string; readonly dark: string } = {
  light: normalizeTheme(lightPlus).fg,
  dark: normalizeTheme(darkPlus).fg,
};

/**
 * Tokenizes `sourceText` in the language `languageId` names — a bundled
 * language's id, or `PLAIN_TEXT` — fetching that language's grammar on first
 * use, and returns one array of coloured runs per line.
 *
 * The lines are shiki's own split, at `\n` or `\r\n`: a file whose lines mix
 * endings keeps every line's content and its line count, and no ending reaches
 * a run — the exact `sourceText` is what the detail response carries, and this
 * is a rendering of it (FR-027). Each run's `htmlStyle` carries the dual-theme
 * variables and nothing else (`defaultColor: false`), so a surface applies
 * exactly those and leaves the choice between them to its stylesheet. shiki's
 * own `defaultColor: 'light-dark()'` writes the resolved colour inline beside
 * them, where a stylesheet rule could replace it only with `!important` — and
 * the comparison replaces it, on the words of a changed line
 * (`SourceDiff.vue` § .aci-source-diff__run--changed).
 *
 * A rejection — the highlighter or the grammar chunk did not arrive, or shiki
 * knows no language by that name — is the caller's to render: the text is
 * already in its hands, so the honest rendering is the same lines uncoloured,
 * not a failure standing where the file should be.
 */
export async function highlightSource(
  sourceText: string,
  languageId: string,
): Promise<ReadonlyArray<ReadonlyArray<ThemedToken>>> {
  const shiki = await loadHighlighter();
  const language = bundledLanguage(languageId);
  // Loaded by id, asked by id: `getLoadedLanguages` lists a grammar under its
  // id and every alias, and `languageId` is an id (`resolveSourceLanguage`,
  // `SOURCE_VIEWER_LANGUAGE_GRAMMAR`). Plain text has no registration and
  // needs no load.
  if (language !== undefined && !shiki.getLoadedLanguages().includes(language.id)) {
    await shiki.loadLanguage(language.import);
  }
  return shiki.codeToTokens(sourceText, { lang: languageId, themes: THEMES, defaultColor: false })
    .tokens;
}
