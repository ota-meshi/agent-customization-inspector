// T1153: what the inventory is when a scan recognized no customization file at
// all — a repository the reader points at that holds none, which is also what a
// root the scan could not read leaves behind (FR-002).
//
// Its own spec and its own root, because every other browser spec runs against
// the all-kind fixture: this state cannot be reached from a tree that has rows,
// and it is the one state in which the rail's kind group is empty.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host.ts';

let root: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'aci-empty-inventory-'));
  // A file no inspection rule admits: the tree exists and is readable, and
  // nothing in it is a customization.
  writeFileSync(join(root, 'README.md'), '# Nothing to inspect\n', 'utf8');
  host = await launchHost(root);
});

test.afterAll(async () => {
  await stopHost(host);
  rmSync(root, { recursive: true, force: true });
});

test('selects the first entry and says the kinds are empty on the rail', async ({ page }) => {
  await page.goto(host.origin);
  const tabs = page.getByRole('tab');
  // One tab, because the one entry that belongs to no kind is the only entry a
  // generation that recognized nothing still has.
  await expect(tabs).toHaveCount(1);

  // A tablist has one selected tab, and the page's selection is what decides
  // which: with no kind recognized, that is the entry that belongs to none
  // (`pages/index.vue` § activeSelection, WAI-ARIA tabs pattern).
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Files in no kind' })).toBeVisible();

  // The empty group is the rail's, so the rail says so: in the panel the
  // sentence would sit under the heading of the selected entry, where it reads
  // as a fact about that entry rather than about the group.
  const rail = page.getByRole('navigation', { name: 'Sources' }).locator('..');
  await expect(rail).toContainText('None recognized.');
  await expect(page.getByRole('tabpanel')).not.toContainText('None recognized.');
});

test('gives the selected list an empty state rather than blank space', async ({ page }) => {
  await page.goto(host.origin);
  // The entry is selectable whatever its count, so its panel says what it holds
  // rather than drawing its note over nothing (`UnclassifiedList.vue`).
  await expect(page.getByRole('tabpanel')).toContainText('No files.');
  // The rail's sentence is about the scan, not about the entry in view, so it
  // stands on either.
  await expect(page.getByRole('navigation', { name: 'Sources' }).locator('..')).toContainText(
    'None recognized.',
  );
});
