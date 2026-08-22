// T1123: browser regression for the open control a detail surface offers
// (`src/app/components/inspection/OpenFileButton.vue`, FR-022).
//
// Only a rendered page can prove this one: the claim is about what a real
// disclosure does to a real document — that the list it controls exists while
// collapsed so the toggle names something, that it can be opened and read from
// the keyboard alone, and that Escape closes it and puts focus back where it
// started (WCAG 2.1.1, 2.4.3).
//
// Nothing here activates a launch. Choosing from the list opens the file in an
// application on the machine running the suite, which no suite may do, so the
// assertions stop at the list — what a launch then carries is the contract
// suite's (`tests/contract/http-api-open-file.test.ts`) and the opener's
// (`tests/unit/host/file-opener.test.ts`).
//
// The two entries asserted are the ones every machine offers: the reader's own
// handler for the file type, and that handler applied to the file's directory.
// Which editors appear beside them is a fact about the machine running the
// suite, so no editor is asserted.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-open-file-control-'));
  await writeFile(join(fixture, 'AGENTS.md'), '# Shared agent instructions\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('offers the applications the host can launch, and closes on Escape', async ({ page }) => {
  await page.goto(host.origin);
  // Reached through the inventory row, the way a reader reaches it.
  await page.locator('[role="tabpanel"] a[href^="/instructions/"]').first().click();
  await expect(page.getByRole('link', { name: 'Back to the inventory' })).toBeVisible();

  const toggle = page.getByRole('button', { name: 'Choose how to open this file' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // The list the toggle names exists while collapsed, so `aria-controls`
  // points at an element that is really there; `display: none` is what keeps
  // its buttons out of the tab order meanwhile.
  const listId = await toggle.getAttribute('aria-controls');
  expect(listId).not.toBeNull();
  const list = page.locator(`#${listId ?? ''}`);
  await expect(list).toBeAttached();
  await expect(list).not.toBeVisible();

  // Opened from the keyboard alone.
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(list).toBeVisible();
  await expect(
    list.getByRole('button', { name: 'Open with the default application' }),
  ).toBeVisible();
  await expect(list.getByRole('button', { name: 'Open the folder this file is in' })).toBeVisible();

  // Exactly one entry is marked as the one a plain click would use, and the
  // button beside the path carries that same application's name — which is
  // what makes the icon a statement about where a plain click goes rather
  // than a guess the reader has to open the list to check.
  const current = list.locator('[aria-current="true"]');
  await expect(current).toHaveCount(1);
  await expect(page.locator('.aci-open-file-button__action')).toHaveAttribute(
    'aria-label',
    (await current.innerText()).trim(),
  );

  // Dismissible, and focus goes back to what opened it rather than to the body.
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(list).not.toBeVisible();
  await expect(toggle).toBeFocused();
});
