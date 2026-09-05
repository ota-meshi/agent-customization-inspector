// The colour scheme the page is drawn in, and the reader's choice of it.
//
// This application holds no palette of its own: every colour in the shell is a
// CSS system colour (`styles/main.css`), so what light and dark mean is the
// browser's own answer and the entire page changes scheme from the one
// `color-scheme` declaration the document root resolves those colours against.
// The choice therefore has exactly one expression — a class on that root — and
// it reaches every component's scoped stylesheet, and every control the browser
// draws itself, without a single colour being restated anywhere.
//
// Until the reader chooses, the page follows the operating system and keeps
// following it while the page is open. Resolving the system preference into a
// stored value on the first visit instead would pin every later visit to
// whichever scheme that machine happened to be in, for a reader who never asked
// for one.
//
// The stored value is a preference about how this reader wants a page drawn. It
// carries nothing that was inspected — no path, no authored content, no session
// identity — so FR-027's rule that inspected content is never persisted is
// unaffected by it, exactly as the remembered open application is
// (`components/inspection/open-target-preference.ts`).
import { computed, shallowRef, watchEffect } from 'vue';

/**
 * The two schemes a page is drawn in, spelled as the CSS `color-scheme`
 * keywords they become and as the class the document root carries.
 *
 * No surface renders either word, so this union has no label table beside it
 * (AGENTS.md § User-visible copy policy): the control that sets it is a switch
 * whose state is its checkedness rather than its wording.
 */
export type ColorScheme = 'light' | 'dark';

/**
 * Where the choice is kept. Namespaced by the product so a reader with other
 * local tools on `localhost` keeps one key per tool, in the namespace the
 * remembered open application already uses.
 */
const STORAGE_KEY = 'agent-customization-inspector.color-scheme';

/** The operating system's own preference, which the page follows until the reader chooses. */
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * The reader's stored choice, or null when they have never made one — which is
 * also what an unrecognized stored spelling yields.
 *
 * Validated here rather than carried on as written, because this is the only
 * place that can validate it: the remembered open application stays an
 * unvalidated string because it is compared against the list of applications
 * the host published, while this value is written straight onto the document
 * root and read by the editor's theme, neither of which has a list to fall back
 * to.
 *
 * Storage access itself can throw: a browser configured to deny site data
 * rejects the property access rather than returning null. Such a reader follows
 * their system and loses only the memory of a choice.
 */
function storedScheme(): ColorScheme | null {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Reached when the reader's browser denies site data to this origin.
    return null;
  }
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** The reader's own choice, or null while they have made none. */
const chosenScheme = shallowRef<ColorScheme | null>(storedScheme());

/** The operating-system preference, watched so a desktop that changes moves the page with it. */
const systemQuery = window.matchMedia(SYSTEM_DARK_QUERY);

/** What that query currently reports, as the scheme it selects. */
const systemScheme = shallowRef<ColorScheme>(systemQuery.matches ? 'dark' : 'light');

// Never unbound: this subscription is the page's own rather than a component's,
// and it has to outlive every route — a reader who switches their desktop to
// dark while the inspector is open watches the page follow.
systemQuery.addEventListener('change', (event) => {
  systemScheme.value = event.matches ? 'dark' : 'light';
});

/**
 * The scheme the page is drawn in: the reader's choice while they have one, and
 * their system's preference until then. Read by the switch that sets it and by
 * the editor, which picks a theme by name rather than from CSS
 * (`monaco.ts` § themeForDisplay).
 */
export const colorScheme = computed<ColorScheme>(() => chosenScheme.value ?? systemScheme.value);

/**
 * Records the reader's choice, so the page is drawn in it from this moment on
 * and on every later visit.
 */
export function chooseColorScheme(scheme: ColorScheme): void {
  chosenScheme.value = scheme;
  try {
    window.localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    // The same denial as above, and the same outcome: the choice holds for this
    // page load and is forgotten by the next one.
  }
}

// Writes the scheme onto the document root, where both of its readers look: the
// page's own `color-scheme` rule (`styles/main.css`) and the switch stylesheet,
// whose `dark` class name is therefore the one this class list has to spell
// (`shine-and-bright`'s `index.css`).
//
// Here rather than in the shell component, because the class is this value's one
// expression rather than a fact about the page frame — and because a component
// could not write it until it had mounted, which is one render too late for a
// reader whose choice differs from their system.
watchEffect(() => {
  const root = window.document.documentElement;
  root.classList.remove(colorScheme.value === 'dark' ? 'light' : 'dark');
  root.classList.add(colorScheme.value);
});
