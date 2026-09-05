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
  await page
    .locator('[role="tabpanel"] a[href^="/instructions/detail/repository/"]')
    .first()
    .click();
  await expect(page.getByRole('link', { name: /Back to /u })).toBeVisible();

  const toggle = page.getByRole('button', { name: 'Choose how to open this file' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  // The list the toggle names exists while closed, so `aria-controls` points
  // at an element that is really there; a closed popover's own `display: none`
  // is what keeps its buttons out of the tab order meanwhile.
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

test('lays the list out beside the control, on one line per entry', async ({ page }) => {
  // The list draws in the top layer, where shrink-to-fit measures it against
  // the viewport rather than against the control, so `width: max-content` is
  // what makes it the width its captions ask for. Nothing else in this file
  // would notice a caption wrapped to one character per line: the list would
  // still be attached, visible, and operable — and unreadable.
  await page.goto(host.origin);
  await page
    .locator('[role="tabpanel"] a[href^="/instructions/detail/repository/"]')
    .first()
    .click();
  await page.getByRole('button', { name: 'Choose how to open this file' }).click();

  const layout = await page.evaluate(() => {
    const list = document.querySelector('.aci-open-file-button__list')!;
    const control = document.querySelector('.aci-open-file-button')!;
    // One rect per line box the caption occupies, which needs no font metric
    // to interpret: a collapsed list gives one rect per character.
    const lineCounts = [...list.querySelectorAll('.aci-open-file-button__choice')].map((choice) => {
      const text = [...choice.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)!;
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getClientRects().length;
    });
    return {
      listWidth: list.getBoundingClientRect().width,
      controlWidth: control.getBoundingClientRect().width,
      lineCounts,
    };
  });
  expect(layout.lineCounts.length).toBeGreaterThan(1);
  for (const lines of layout.lineCounts) {
    expect(lines).toBe(1);
  }
  expect(layout.listWidth).toBeGreaterThan(layout.controlWidth);
});

test('keeps the open list inside the viewport at the reflow width', async ({ page }) => {
  // At 320 CSS pixels the list is wider than the room left beside the control
  // on either side, so neither the anchor nor its flipped fallback fits and
  // the position that overflows least is what draws. It stays reachable, and
  // opening it adds no horizontal scrolling either (WCAG 1.4.10).
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(host.origin);
  await page
    .locator('[role="tabpanel"] a[href^="/instructions/detail/repository/"]')
    .first()
    .click();
  await page.getByRole('button', { name: 'Choose how to open this file' }).click();

  const box = await page.evaluate(() => {
    const rect = document.querySelector('.aci-open-file-button__list')!.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(box.clientWidth);
  expect(box.scrollWidth).toBe(box.clientWidth);
});
