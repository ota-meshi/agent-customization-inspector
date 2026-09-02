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
import { waitForInventory } from './repository-status';

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

/** The accessible name of the focused element, or null when it carries none. */
function focusedAccessibleName(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? null);
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
  const row = page.locator('[role="tabpanel"] .aci-row-file a').last();
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  const href = await row.getAttribute('href');
  const leftAt = await scrollOffset(page);
  expect(leftAt).toBeGreaterThan(0);

  await row.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();

  await page.goBack();
  await waitForInventory(page);
  await expect.poll(() => scrollOffset(page)).toBe(leftAt);
  expect(await focusedHref(page)).toBe(href);

  // The same return through the detail page's own link, which is an ordinary
  // forward navigation to `/` rather than a history entry with a position.
  await row.click();
  await page.getByRole('link', { name: /Back to /u }).click();
  await waitForInventory(page);
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
  const filter = page.getByRole('searchbox', { name: 'Search names and paths' });
  await filter.fill('.claude');
  await expect(page).toHaveURL(/[?&]q=\.claude/u);
  const narrowed = await rows.count();
  expect(narrowed).toBeLessThan(unfiltered);

  const row = page.locator('[role="tabpanel"] .aci-row-file a').last();
  await row.scrollIntoViewIfNeeded();
  const href = await row.getAttribute('href');
  const leftAt = await scrollOffset(page);

  await row.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();
  await page.goBack();
  await waitForInventory(page);
  await expect(page.getByRole('searchbox', { name: 'Search names and paths' })).toHaveValue(
    '.claude',
  );
  await expect(rows).toHaveCount(narrowed);
  await expect.poll(() => scrollOffset(page)).toBe(leftAt);
  expect(await focusedHref(page)).toBe(href);

  // The detail page's own link names its kind's tab rather than the reader's
  // last narrowing, so it lands on the whole list — and the row that was
  // followed is still put back on screen and focused inside it.
  await row.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();
  await page.getByRole('link', { name: /Back to /u }).click();
  await waitForInventory(page);
  await expect(page.getByRole('searchbox', { name: 'Search names and paths' })).toHaveValue('');
  await expect(rows).toHaveCount(unfiltered);
  expect(await focusedHref(page)).toBe(href);
});

test('keeps a row’s comparison link the same under a narrowing, and returns to it', async ({
  page,
}) => {
  // A comparison belongs to the row rather than to the narrowed view of it,
  // so the entry link names the row's own first two files whatever a filter
  // leaves showing (`filters.ts` § NarrowedInventoryRow). Without that the
  // link would carry a different URL under every narrowing, and the return
  // point — which matches the followed link by href — would find nothing to
  // restore when the page's own inventory link lands on the unnarrowed list.
  await page.goto(host.origin);
  const compare = page
    .locator('[role="tabpanel"] .aci-item')
    .filter({ hasText: 'voyage' })
    .getByRole('link', { name: /^Compare this skill/u });
  await expect(compare).toBeVisible();
  const unnarrowedHref = await compare.getAttribute('href');

  // The narrowing leaves one of that name's two copies on screen.
  await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.claude');
  await expect(page).toHaveURL(/[?&]q=\.claude/u);
  await expect(
    page.locator('[role="tabpanel"] .aci-item').filter({ hasText: 'voyage' }),
  ).toHaveCount(1);
  await expect(compare).toBeVisible();
  expect(await compare.getAttribute('href')).toBe(unnarrowedHref);

  await compare.scrollIntoViewIfNeeded();
  await compare.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();
  // The page's own link drops the narrowing by design (T1122), and the row
  // the reader left is still found in the whole list.
  await page.getByRole('link', { name: /Back to /u }).click();
  await waitForInventory(page);
  await expect(page.getByRole('searchbox', { name: 'Search names and paths' })).toHaveValue('');
  expect(await focusedHref(page)).toBe(unnarrowedHref);
});

test('returns to the row the reader left when two rows link one file', async ({ page }) => {
  // `.claude/skills/lander/SKILL.md` sits on two rows: Claude invokes that skill
  // by its directory name and Copilot by the `name` its frontmatter declares, so
  // both rows link the same detail route (T200). The href alone therefore does
  // not say which row was followed — the accessible name does, because each
  // row's link names its own row (WCAG 2.4.6) — and a narrowing that leaves one
  // of the two rows makes the difference visible: the followed link is first
  // among that route's links while the unnarrowed list puts the other row's
  // link first.
  const name = '.claude/skills/lander/SKILL.md: voyage';
  await page.goto(host.origin);
  await page.getByLabel('Tool', { exact: true }).selectOption('copilot');
  // The narrowing leaves the Copilot row alone, so this route has one link in
  // the list the reader follows it from and two in the list they come back to.
  await expect(
    page.getByRole('link', { name: '.claude/skills/lander/SKILL.md: lander' }),
  ).toHaveCount(0);
  const link = page.getByRole('link', { name });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();

  await page.getByRole('link', { name: /Back to /u }).click();
  await waitForInventory(page);
  await expect(
    page.getByRole('link', { name: '.claude/skills/lander/SKILL.md: lander' }),
  ).toHaveCount(1);
  // The row the reader left, not the other row that links the same file.
  expect(await focusedAccessibleName(page)).toBe(name);
});

test('opens a detail page at its top, as any page change does', async ({ page }) => {
  await page.goto(host.origin);
  const row = page.locator('[role="tabpanel"] .aci-row-file a').last();
  await row.scrollIntoViewIfNeeded();
  expect(await scrollOffset(page)).toBeGreaterThan(0);

  await row.click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();
  expect(await scrollOffset(page)).toBe(0);
});
