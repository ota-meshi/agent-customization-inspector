// @vitest-environment happy-dom
// T1136: the colour scheme the page is drawn in — what the reader chose, what their
// system says while they have chosen nothing, and the one class on the document
// root that both of those reach the page through.
//
// The rule is tested here rather than through the switch component for the
// reason the other app suites give: the unit project has no single-file-
// component compiler, and the browser acceptance suite drives the rendered
// control. What the rule owes is that the page is never drawn in a scheme
// nobody selected — an unrecognized stored value follows the system rather than
// being written onto the root as written.
import { Storage } from 'happy-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

/** The key the preference is kept under; asserted so a rename is deliberate. */
const STORAGE_KEY = 'agent-customization-inspector.color-scheme';

/** The stubbed system preference, so a case can start dark or light and then change. */
let systemQuery: EventTarget & { matches: boolean };

/** Every media query the module opened, so the one it watches is observable. */
let queries: string[];

/**
 * Puts the operating system in one scheme for the cases that follow, replacing
 * the environment's own query. Called before the module is imported, because
 * the module opens its query once — which is what a page load does.
 */
function systemPrefers(dark: boolean): void {
  systemQuery = Object.assign(new EventTarget(), { matches: dark });
  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query);
    return systemQuery;
  });
}

/** Moves the operating system to the other scheme, as a desktop setting change does. */
async function systemChangesTo(dark: boolean): Promise<void> {
  systemQuery.matches = dark;
  systemQuery.dispatchEvent(Object.assign(new Event('change'), { matches: dark }));
  await nextTick();
}

/**
 * Imports the module fresh, so the choice it resolves reflects whatever this
 * test wrote first. The module reads storage and opens its query once at
 * import, which is the behavior a page load has.
 */
async function freshModule(): Promise<typeof import('../../../src/app/composables/color-scheme')> {
  vi.resetModules();
  return import('../../../src/app/composables/color-scheme');
}

/** The classes the module has written onto the document root. */
function rootClasses(): string[] {
  return [...window.document.documentElement.classList];
}

beforeEach(() => {
  // happy-dom's own storage does not reach `window` on every runtime this
  // package supports; see `open-target-preference.test.ts` for the measurement.
  vi.stubGlobal('localStorage', new Storage());
  vi.restoreAllMocks();
  queries = [];
  systemPrefers(false);
  // A previous case's module instance left its class here. Each import writes
  // the class again, so clearing first is what makes the assertion below about
  // this case's module rather than the last one's.
  window.document.documentElement.className = '';
});

describe('the scheme the page is drawn in', () => {
  it('follows the operating system until the reader chooses', async () => {
    systemPrefers(true);
    const { colorScheme } = await freshModule();
    expect(queries).toEqual(['(prefers-color-scheme: dark)']);
    expect(colorScheme.value).toBe('dark');
    // A desktop that changes moves the page with it, which is the whole reason
    // nothing is stored until the reader asks for a scheme of their own.
    await systemChangesTo(false);
    expect(colorScheme.value).toBe('light');
  });

  it("prefers the reader's stored choice to their system", async () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    systemPrefers(true);
    const { colorScheme } = await freshModule();
    expect(colorScheme.value).toBe('light');
    // Their choice is theirs: the desktop moving does not take it back.
    await systemChangesTo(false);
    await systemChangesTo(true);
    expect(colorScheme.value).toBe('light');
  });

  it('follows the system for a stored value that is not a scheme', async () => {
    // Hand-edited storage, or a spelling a later release dropped. It is
    // validated here because there is nothing further down to compare it
    // against: the value is written onto the document root and read by the
    // editor's theme.
    window.localStorage.setItem(STORAGE_KEY, 'twilight');
    systemPrefers(true);
    const { colorScheme } = await freshModule();
    expect(colorScheme.value).toBe('dark');
  });
});

describe('the class the scheme reaches the page through', () => {
  it('writes exactly the scheme in force', async () => {
    systemPrefers(true);
    const { chooseColorScheme } = await freshModule();
    // `dark` is the name the switch stylesheet selects on, so the page's own
    // `color-scheme` rule and the control read one class rather than two states
    // that could disagree.
    expect(rootClasses()).toEqual(['dark']);
    chooseColorScheme('light');
    await nextTick();
    expect(rootClasses()).toEqual(['light']);
  });

  it('leaves a class the page put there alone', async () => {
    // The root is not this module's element. Only the two scheme names are its
    // to write, and only the one not in force is its to remove.
    window.document.documentElement.classList.add('probe');
    const { chooseColorScheme } = await freshModule();
    chooseColorScheme('dark');
    await nextTick();
    expect(rootClasses()).toEqual(['probe', 'dark']);
  });
});

describe('recording the choice', () => {
  it('opens the next visit in the scheme the reader chose', async () => {
    const first = await freshModule();
    first.chooseColorScheme('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    const reloaded = await freshModule();
    expect(reloaded.colorScheme.value).toBe('dark');
  });

  it('keeps working when the browser denies site data', async () => {
    // A browser configured to deny storage throws on the property access
    // itself. The reader follows their system and loses only the memory of a
    // choice.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage is not available');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage is not available');
    });
    systemPrefers(true);
    const { chooseColorScheme, colorScheme } = await freshModule();
    expect(colorScheme.value).toBe('dark');
    chooseColorScheme('light');
    await nextTick();
    expect(colorScheme.value).toBe('light');
    expect(rootClasses()).toEqual(['light']);
  });
});
