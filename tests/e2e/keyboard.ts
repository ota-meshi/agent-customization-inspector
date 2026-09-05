// Shared keyboard-walk helper for the browser acceptance suites. A test that
// claims a control is keyboard-operable must prove a keyboard user arrives at
// it: `.focus()` proves only that an element can hold focus, so reachability
// claims walk the page's real Tab order instead — a control demoted to
// `tabindex="-1"` fails the walk where a bare focus call would still land on
// it (contracts/accessibility-acceptance.md § 2.1.1).
import type { Locator, Page } from '@playwright/test';

/**
 * Presses Tab from the current focus position until the target element holds
 * focus, and reports whether it was reached within the given number of
 * presses. The bound exists so an unreachable control fails the assertion the
 * caller makes on the return value rather than hanging the walk.
 */
export async function tabUntilFocused(
  page: Page,
  target: Locator,
  maxPresses = 40,
): Promise<boolean> {
  for (let presses = 0; presses < maxPresses; presses += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) {
      return true;
    }
  }
  return false;
}
