// Shared access to the inventory's "Files in no kind" list for the browser
// acceptance suites (T1124, reworked by T1153).
//
// The list is a rail entry rather than a section below the rows: it is a list
// of files, which is the whole test for what the rail selects. Selecting it is
// therefore what a test does before asserting that a row states its path and
// read outcome — asserting against text the reader has not selected would pass
// just as well on an entry that never opens.
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Selects the entry and returns its panel, so a caller scopes its row
 * assertions to the list rather than to the whole page. The entry is always in
 * the rail — its membership rule is absence, so a reader has to be able to ask
 * — and its count says whether this fixture put anything in it, which is what a
 * caller expecting rows is really asserting.
 */
export async function openNoKindDisclosure(page: Page): Promise<Locator> {
  const entry = page.getByRole('tab', { name: /^Files in no kind/u });
  await expect(entry).toHaveCount(1);
  await entry.click();
  const panel = page.locator('#aci-kind-panel-files-in-no-kind');
  await expect(panel).toHaveCount(1);
  return panel;
}
