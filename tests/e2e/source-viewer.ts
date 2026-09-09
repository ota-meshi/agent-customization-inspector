// The read-only source box as the browser suites reach it (T1207).
//
// What the box may hold is the file's text and the coloured runs shiki
// tokenized it into, and nothing else: no decoration, no marker, no control.
// The suites that assert FR-033 — colouring is tokenizing rather than
// validating — ask for whatever else is inside the box and expect nothing,
// which is the structural fact a "nothing marks the file invalid" claim rests
// on.
import type { Locator, Page } from '@playwright/test';

/** Every element inside a source box other than a line or one of its runs. */
export function sourceBoxDecorations(page: Page): Locator {
  return page.locator('.aci-source-viewer :not(.aci-source-viewer__line, .aci-source-run)');
}
