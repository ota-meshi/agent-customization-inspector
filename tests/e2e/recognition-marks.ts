// What a row states about the products that recognized one file (T1157).
//
// The row draws each product as its own mark and spells only the documented
// surfaces beside it, so the product's name is text that is not drawn
// (`ToolMark.vue`). A suite asserting the whole recognition — the product and
// the surfaces its admitting rule rests on — therefore reads the two parts and
// joins them, which is what keeps the assertion about the fact rather than
// about which element each half landed in.
import type { Locator } from '@playwright/test';

/**
 * One string per recognition the scope states, in the row's own order:
 * `"<product> <surfaces>"`, the spelling these suites asserted before the
 * product's name stopped being drawn.
 */
export async function recognitionTexts(scope: Locator): Promise<readonly string[]> {
  return scope.locator('.aci-recognition-marks__one').evaluateAll((elements) =>
    elements.map((element) => {
      const product = element.querySelector('.aci-visually-hidden')?.textContent?.trim() ?? '';
      const surfaces =
        element.querySelector('.aci-recognition-marks__surfaces')?.textContent?.trim() ?? '';
      return `${product} ${surfaces}`.trim();
    }),
  );
}
