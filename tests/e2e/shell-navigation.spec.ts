// T1149 browser acceptance for the shell: what the bar carries and where, what
// the rail selects and where its Source entries go, and what the inventory no
// longer states (FR-002, FR-006, FR-030).
//
// The claims are about arrangement rather than about any one component, which
// is why they are here and not spread across the kind suites: that the rescan
// command and the search are reachable without leaving the page, that each
// Source family's status is legible from the list, and that the inventory
// itself states no Source root, status, or generation — the last of which no
// component test can establish, because it is an absence across a whole page.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-shell-'));
  // Two skills whose names and paths differ, so a search can be shown to match
  // each independently: `deploy` is spelled by both its name and its path,
  // while `release` lives under a directory that spells neither.
  await mkdir(join(fixture, '.agents', 'skills', 'deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.agents', 'skills', 'deploy', 'SKILL.md'),
    '---\nname: deploy\ndescription: Ship it\n---\n\n# Deploy\n',
    'utf8',
  );
  await mkdir(join(fixture, '.agents', 'skills', 'shipping'), { recursive: true });
  await writeFile(
    join(fixture, '.agents', 'skills', 'shipping', 'SKILL.md'),
    '---\nname: release\ndescription: Cut a release\n---\n\n# Release\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** The bar's search field, addressed the way assistive technology reaches it. */
function search(page: Page) {
  return page.getByRole('searchbox', { name: 'Search names and paths' });
}

/** Opens the inventory and waits for the rail to be rendered. */
async function openInventory(page: Page): Promise<void> {
  await page.goto(host.origin);
  await expect(page.getByRole('tab', { name: /^Skill/u })).toBeVisible();
}

test('the bar carries the search and the scheme control everywhere, and the inventory’s commands with it', async ({
  page,
}) => {
  await openInventory(page);
  await expect(search(page)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Dark theme' })).toBeVisible();
  // The inventory has no panel of its own to carry them, and rescanning is
  // repeated: it must not cost a page (FR-030).
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Refresh status' })).toBeEnabled();

  // A Source's own surface states its scan and commands it there, so the bar
  // stops offering the commands and the page's are the only ones on screen —
  // one control rather than the same one twice (FR-030).
  await page
    .getByRole('navigation', { name: 'Sources' })
    .getByRole('link', { name: 'Repository' })
    .click();
  await expect(page).toHaveURL(/\/repository$/u);
  await expect(search(page)).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Dark theme' })).toBeVisible();
  // The page's command names no Source — its heading already does — so the
  // bar's `Rescan repository` is gone and `Rescan` is what stands here
  // (`ScanProgress.vue`, `App.vue`). Exactly one of each: the same operation
  // offered twice is what this asserts against.
  await expect(page.getByRole('button', { name: 'Rescan repository' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rescan', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Refresh status' })).toHaveCount(1);
});

test('the rail reaches each Source family’s own surface and states its status', async ({
  page,
}) => {
  await openInventory(page);

  const sources = page.getByRole('navigation', { name: 'Sources' });
  const repository = sources.getByRole('link', { name: 'Repository' });
  await expect(repository).toBeVisible();
  // A status the reader can act on without leaving the list, which is what
  // replaces the panel this page used to open with (FR-030).
  await expect(repository).toContainText(/Ready|Partial|Idle|Scanning|Failed/u);

  const personal = sources.getByRole('link', { name: /^Personal setup/u });
  await expect(personal).toContainText('Not inspected');

  await repository.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Repository' })).toBeVisible();
  await expect(page.getByText('This label is an escaped presentation')).toBeVisible();

  await page.getByRole('link', { name: /Back to /u }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/u);

  await personal.click();
  await expect(page).toHaveURL(/\/global-consent$/u);
});

test('the inventory itself states no Source root, status, or generation', async ({ page }) => {
  await openInventory(page);
  // The escaped root label, the scan status panel, and the committed
  // generation are the Repository surface's (FR-002, FR-030). An absence
  // across the whole page, so it is asserted on the page rather than on a
  // component: what this forbids is any of the three coming back as a panel.
  await expect(page.getByText('This label is an escaped presentation')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Scan status' })).toHaveCount(0);
  await expect(page.getByText('Committed generation')).toHaveCount(0);
  // And the two lists that are no kind's inventory are rail entries rather
  // than sections a reader scrolls past the rows to reach.
  await expect(page.getByRole('tab', { name: /^Files in no kind/u })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Diagnostics/u })).toBeVisible();
});

test('one search matches a row by its name and by its path', async ({ page }) => {
  await openInventory(page);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await expect(page.getByRole('link', { name: /deploy\/SKILL\.md/u })).toBeVisible();
  await expect(page.getByRole('link', { name: /shipping\/SKILL\.md/u })).toBeVisible();

  // A name whose own path does not spell it (FR-006).
  await search(page).fill('release');
  await expect(page.getByRole('link', { name: /shipping\/SKILL\.md/u })).toBeVisible();
  await expect(page.getByRole('link', { name: /deploy\/SKILL\.md/u })).toHaveCount(0);

  // A path fragment no name spells, which is what the removed `Path contains`
  // field used to take.
  await search(page).fill('shipping/');
  await expect(page.getByRole('link', { name: /shipping\/SKILL\.md/u })).toBeVisible();
  await expect(page.getByRole('link', { name: /deploy\/SKILL\.md/u })).toHaveCount(0);

  // The narrowing is navigation, so it is in the URL and survives a reload.
  await expect(page).toHaveURL(/[?&]q=shipping/u);
  await page.reload();
  await expect(search(page)).toHaveValue('shipping/');
  await expect(page.getByRole('link', { name: /deploy\/SKILL\.md/u })).toHaveCount(0);

  // And there is exactly one of it: the rail keeps source and tool, and the
  // separate path field is gone (FR-006).
  await expect(page.getByRole('searchbox')).toHaveCount(1);
  await expect(page.getByLabel('Path contains')).toHaveCount(0);
});

test('searching from another route brings the reader to the list', async ({ page }) => {
  await openInventory(page);
  await page
    .getByRole('navigation', { name: 'Sources' })
    .getByRole('link', { name: 'Repository' })
    .click();
  await expect(page).toHaveURL(/\/repository$/u);

  await search(page).fill('release');
  await expect(page).toHaveURL(/\/\?q=release$/u);
  await expect(page.getByRole('link', { name: /shipping\/SKILL\.md/u })).toBeVisible();
});
