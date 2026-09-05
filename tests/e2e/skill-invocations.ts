// What a skill detail states about the names it answers to (T1183).
//
// The page groups by invocation name: the name heads a box, the products that
// resolve it are the rows inside, and the comparison belongs to the box because
// its route is keyed by the name. A suite asserting what the page says
// therefore reads the same shape — the name, whether it offers a comparison,
// and the recognitions under it — rather than the string a row's columns
// happen to concatenate to.
import { expect, type Page } from '@playwright/test';

/** One recognition inside a name's box: the product and its documented surfaces. */
export interface StatedRecognition {
  /** The recognizing product, as the page draws its name. */
  readonly product: string;
  /** The surfaces that recognition's admitting rules rest on (FR-009). */
  readonly surfaces: string;
}

/** One invocation name, with what the page says under and beside it. */
export interface StatedInvocation {
  /** The name this box's recognitions invoke the skill by. */
  readonly name: string;
  /** Whether the box offers this name's comparison (FR-011). */
  readonly comparable: boolean;
  /** The recognitions resolving it, in the page's own order. */
  readonly recognitions: readonly StatedRecognition[];
}

/**
 * What the open skill detail states about its invocation names, in the page's
 * order. `expected` is the number of names, waited for before the read: an
 * `evaluateAll` snapshots whatever is there now, where a locator assertion
 * waits for the page to settle.
 */
export async function statedInvocations(
  page: Page,
  expected: number,
): Promise<readonly StatedInvocation[]> {
  const groups = page.locator('.aci-skill-detail__invocations > li');
  await expect(groups).toHaveCount(expected);
  return groups.evaluateAll((boxes) =>
    boxes.map((box) => {
      const text = (element: Element | null): string =>
        (element?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
      const head = text(box.querySelector('.aci-skill-detail__invocation-head'));
      return {
        name: (head.split('Invocation name:').at(-1) ?? '')
          .replace("Compare this skill's files", '')
          .replace('This name has one copy here, so there is nothing to compare', '')
          .trim(),
        comparable: box.querySelector('a.aci-skill-detail__invocation-compare') !== null,
        recognitions: [...box.querySelectorAll('.aci-skill-detail__recognitions li')].map(
          (row) => ({
            product: text(row.querySelector('.aci-skill-detail__invocation-product')),
            surfaces: text(row.querySelector('.aci-skill-detail__invocation-surfaces')),
          }),
        ),
      };
    }),
  );
}
