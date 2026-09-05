// Shared access to each Source family's own state surface for the browser
// acceptance suites (T1153).
//
// The scan status, the committed generation, and the escaped root label are
// that Source's facts rather than an inventory of files, so they live at
// `/repository` and the inventory states none of them (FR-002, FR-030). A
// suite that asserts one of them therefore goes there, and a suite that only
// needed to know a generation had committed waits on the inventory itself —
// which renders nothing until one has.
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Opens the Repository state surface through the rail, the way a reader
 * reaches it, and returns its scan panel. Through the rail rather than by
 * navigating to the URL, so each suite that asserts a status also proves the
 * way there is still on the page it started from.
 */
export async function openRepositoryStatus(page: Page): Promise<Locator> {
  await page.getByRole('link', { name: 'Repository' }).click();
  const panel = page.locator('.aci-scan-progress');
  await expect(panel).toHaveCount(1);
  return panel;
}

/**
 * Opens the personal setup's state surface through the rail, the way a reader
 * reaches it, and returns its main region. That surface is where each
 * consented member's escaped root, status, and own rescan are stated, because
 * they are facts about those Sources rather than an inventory of files
 * (FR-002, FR-030).
 */
export async function openPersonalSetup(page: Page): Promise<Locator> {
  await page
    .getByRole('navigation', { name: 'Sources' })
    .getByRole('link', { name: /^Personal setup/u })
    .click();
  await expect(page).toHaveURL(/\/global-consent$/u);
  return page.locator('main');
}

/**
 * Waits until a generation has committed and the inventory is rendered.
 *
 * The rail is the signal: the page renders nothing at all until a snapshot is
 * adopted, so the rail being present is exactly what the scan panel's
 * "Committed generation" used to stand for on this page — and it is a fact
 * about the page under test rather than about a panel that has moved. The
 * rail rather than the heading, because the heading names whichever entry is
 * in view rather than the page.
 */
export async function waitForInventory(page: Page): Promise<void> {
  await expect(page.getByRole('tablist', { name: 'Customization files' })).toBeVisible();
}
