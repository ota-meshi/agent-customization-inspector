// @vitest-environment happy-dom
// T1123: which application a plain click on the open control uses, and how the
// reader's choice survives a reload (FR-022).
//
// The rule is tested here rather than through the component for the reason the
// inventory suites give: the unit project has no single-file-component
// compiler, and the browser acceptance suite drives the rendered control. What
// the rule owes is that no target the host did not publish can ever be
// selected — a stored spelling is compared against the published list, never
// parsed into it.
import { Storage } from 'happy-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileOpenTarget } from '../../../src/shared/api-types';

/** The key the preference is kept under; asserted so a rename is deliberate. */
const STORAGE_KEY = 'agent-customization-inspector.file-open-target';

const BOTH: readonly FileOpenTarget[] = ['visual-studio-code', 'default-application'];

/**
 * Imports the module fresh, so the ref it initializes from storage reflects
 * whatever this test wrote first. The module reads storage once at import,
 * which is the behavior a page load has.
 */
async function freshModule(): Promise<
  typeof import('../../../src/app/components/inspection/open-target-preference')
> {
  vi.resetModules();
  return import('../../../src/app/components/inspection/open-target-preference');
}

beforeEach(() => {
  // The environment's own storage does not reach `window` on every runtime
  // this package supports: Vitest copies a happy-dom property onto the global
  // only where the Node runtime does not already define that name, and
  // `localStorage` is not among the keys it overrides — so on a runtime that
  // defines `localStorage` itself, which Node.js 26 does, the module under
  // test reads the runtime's own name instead of the page's storage.
  // Installing happy-dom's Storage gives every supported runtime the same
  // one, and a fresh instance per test is what clearing it would achieve.
  // Measured 2026-08-22 against Vitest 4.1.11, where the copy still skips the
  // name; vitest-dev/vitest#10293 changes that, so re-check this when the
  // dependency moves.
  vi.stubGlobal('localStorage', new Storage());
  vi.restoreAllMocks();
});

describe('which application a plain click uses', () => {
  it('uses the first published application when the reader has never chosen', async () => {
    const { selectedOpenTarget } = await freshModule();
    // The host publishes the editor first on a machine that has one, so a
    // reader who never opens the list gets the editor.
    expect(selectedOpenTarget(BOTH, null)).toBe('visual-studio-code');
    expect(selectedOpenTarget(['default-application'], null)).toBe('default-application');
  });

  it('uses the remembered application while the host still offers it', async () => {
    const { selectedOpenTarget } = await freshModule();
    // Remembering is what lets a reader override the published order.
    expect(selectedOpenTarget(BOTH, 'default-application')).toBe('default-application');
  });

  it('falls back when the remembered application is no longer published', async () => {
    const { selectedOpenTarget } = await freshModule();
    // The editor was uninstalled between visits, so the host stopped
    // publishing it: the choice matches nothing and the reader gets the
    // application the host can actually launch.
    expect(selectedOpenTarget(['default-application'], 'visual-studio-code')).toBe(
      'default-application',
    );
  });

  it('falls back for a stored value this product has no target for', async () => {
    const { selectedOpenTarget } = await freshModule();
    // Hand-edited storage, or a spelling a later release dropped. It is
    // compared, never parsed, so it simply matches nothing.
    expect(selectedOpenTarget(BOTH, 'emacs')).toBe('visual-studio-code');
  });

  it('selects nothing when the host published no application', async () => {
    const { selectedOpenTarget } = await freshModule();
    // Before a snapshot is adopted there is nothing to open with, and the
    // control renders nothing.
    expect(selectedOpenTarget([], 'visual-studio-code')).toBeNull();
  });
});

describe('remembering the choice', () => {
  it('reads the stored choice on the next page load', async () => {
    const first = await freshModule();
    first.rememberOpenTarget('visual-studio-code');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('visual-studio-code');
    const reloaded = await freshModule();
    expect(reloaded.rememberedOpenTarget.value).toBe('visual-studio-code');
  });

  it('publishes the choice to every control already on the page', async () => {
    const { rememberOpenTarget, rememberedOpenTarget } = await freshModule();
    // One module-level ref: choosing in one control must not leave another
    // one disagreeing about what a click would do.
    rememberOpenTarget('visual-studio-code');
    expect(rememberedOpenTarget.value).toBe('visual-studio-code');
  });

  it('keeps working when the browser denies site data', async () => {
    // A browser configured to deny storage throws on the property access
    // itself. The reader keeps the default application and loses only the
    // memory of their choice.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage is not available');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage is not available');
    });
    const { rememberOpenTarget, rememberedOpenTarget } = await freshModule();
    expect(rememberedOpenTarget.value).toBeNull();
    rememberOpenTarget('visual-studio-code');
    expect(rememberedOpenTarget.value).toBe('visual-studio-code');
  });
});
