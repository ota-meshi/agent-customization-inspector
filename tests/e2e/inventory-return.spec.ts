// T1122: browser regression for returning to the inventory
// (`src/app/router.options.ts`). Only a rendered
// page can prove this one: the claim is about where a real document is
// scrolled and what holds keyboard focus after a real navigation, and both
// ways back are asserted — the browser's own Back, which carries a saved
// position the product ignores, and a detail page's "Back to the inventory"
// link, which pushes a fresh history entry that carries none.
//
// The viewport is deliberately short so the committed inventory scrolls: a
// list that fits on screen would pass this suite without restoring anything.
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  buildAllToolSkillFixture,
  type AllToolSkillFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: AllToolSkillFixture;
let host: LaunchedHost;

test.use({ viewport: { width: 900, height: 420 } });

test.beforeEach(async () => {
  fixture = buildAllToolSkillFixture('aci-inventory-return');
  host = await launchHost(fixture.root);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** Where the one document scroller stands, rounded to whole pixels. */
function scrollOffset(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY));
}

/** The route the focused element links to, or null when nothing focused links anywhere. */
function focusedHref(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute('href') ?? null);
}

test('returns the reader to the row they followed, by Back and by the page’s own link', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The last definition link in the list, which is far enough down this
  // fixture's inventory that reading it requires scrolling.
  const row = page.locator('[role="tabpanel"] .aci-skill-row__definitions a').last();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  const href = await row.getAttribute('href');
  const leftAt = await scrollOffset(page);
  expect(leftAt).toBeGreaterThan(0);

  await row.click();
  await expect(page.getByRole('link', { name: 'Back to the inventory' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect.poll(() => scrollOffset(page)).toBe(leftAt);
  expect(await focusedHref(page)).toBe(href);

  // The same return through the detail page's own link, which is an ordinary
  // forward navigation to `/` rather than a history entry with a position.
  await row.click();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect.poll(() => scrollOffset(page)).toBe(leftAt);
  expect(await focusedHref(page)).toBe(href);
});

test('returns to the narrowed list the reader left, and to the row inside it', async ({ page }) => {
  await page.goto(host.origin);
  const rows = page.locator('[role="tabpanel"] .aci-item');
  await expect(rows.first()).toBeVisible();
  const unfiltered = await rows.count();

  // Narrowing is the reader's own state, and it reaches the URL: without that
  // the list the browser's Back renders is not the list that was left.
  const filter = page.getByLabel('Path contains');
  await filter.fill('.claude');
  await expect(page).toHaveURL(/[?&]path=\.claude/u);
  const narrowed = await rows.count();
  expect(narrowed).toBeLessThan(unfiltered);

  const row = page.locator('[role="tabpanel"] .aci-skill-row__definitions a').last();
  await row.scrollIntoViewIfNeeded();
  const href = await row.getAttribute('href');
  const leftAt = await scrollOffset(page);

  await row.click();
  await expect(page.getByRole('link', { name: 'Back to the inventory' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect(page.getByLabel('Path contains')).toHaveValue('.claude');
  await expect(rows).toHaveCount(narrowed);
  await expect.poll(() => scrollOffset(page)).toBe(leftAt);
  expect(await focusedHref(page)).toBe(href);

  // The detail page's own link names its kind's tab rather than the reader's
  // last narrowing, so it lands on the whole list — and the row that was
  // followed is still put back on screen and focused inside it.
  await row.click();
  await expect(page.getByRole('link', { name: 'Back to the inventory' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Customization files' })).toBeVisible();
  await expect(page.getByLabel('Path contains')).toHaveValue('');
  await expect(rows).toHaveCount(unfiltered);
  expect(await focusedHref(page)).toBe(href);
});

test('opens a detail page at its top, as any page change does', async ({ page }) => {
  await page.goto(host.origin);
  const row = page.locator('[role="tabpanel"] .aci-skill-row__definitions a').last();
  await row.scrollIntoViewIfNeeded();
  expect(await scrollOffset(page)).toBeGreaterThan(0);

  await row.click();
  await expect(page.getByRole('link', { name: 'Back to the inventory' })).toBeVisible();
  expect(await scrollOffset(page)).toBe(0);
});
