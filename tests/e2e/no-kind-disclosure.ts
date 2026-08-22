// Shared access to the inventory's "Files in no kind" disclosure for the
// browser acceptance suites (T1124). The section is closed on every load — its
// membership rule is absence, so any repository holding one unreadable, binary,
// or nothing-declaring candidate has it, and standing open it sat under
// whatever kind tab was being read. A test that claims a row states its path
// and read outcome therefore opens it first: asserting against text the reader
// cannot see would pass just as well on a section that never opens.
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Opens the disclosure and returns it, so a caller scopes its row assertions to
 * the section rather than to the whole page. The count assertion in front of
 * the click is what fails a fixture whose candidates all landed in a kind:
 * without it, the absent section would be a click that times out rather than a
 * stated expectation.
 */
export async function openNoKindDisclosure(page: Page): Promise<Locator> {
  const disclosure = page.locator('.aci-inventory-page__no-kind');
  await expect(disclosure).toHaveCount(1);
  await disclosure.locator('summary').click();
  return disclosure;
}
