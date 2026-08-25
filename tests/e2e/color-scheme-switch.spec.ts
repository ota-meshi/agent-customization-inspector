// T1136 browser acceptance for the colour scheme switch: the page opens in the
// reader's system scheme, the control moves it to the other one, and their
// choice survives a reload while the system preference no longer decides.
//
// The switch is the one control this suite could not be replaced by a unit
// test for. What is under test is not the class the module writes — the unit
// suite owns that — but that the class actually repaints the page: the whole
// palette is CSS system colours resolved against the root's `color-scheme`, and
// whether a real engine re-resolves `Canvas` when that declaration changes is a
// fact about the certified browsers rather than about this code (AGENTS.md
// § Platform baseline policy).
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-color-scheme-'));
  // The switch belongs to the shell, so the inventory below it is irrelevant:
  // a file no shipped rule admits keeps the page to the shell itself.
  await writeFile(join(fixture, 'NOTES.md'), '# fixture notes\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** The switch, addressed the way assistive technology reaches it (WCAG 4.1.2). */
function colorSchemeSwitch(page: Page) {
  return page.getByRole('switch', { name: 'Dark theme' });
}

/**
 * The colour the page is actually painted in. Read from `body`, whose
 * background is the `Canvas` system colour every other surface is mixed from,
 * so a change here is the whole palette moving rather than one rule.
 */
async function pageBackground(page: Page): Promise<string> {
  return page.evaluate(() => globalThis.getComputedStyle(document.body).backgroundColor);
}

test.describe('on a dark desktop', () => {
  test.use({ colorScheme: 'dark' });

  test('opens dark, switches to light, and keeps that choice', async ({ page }) => {
    await page.goto(host.origin);
    await expect(colorSchemeSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/u);
    const dark = await pageBackground(page);

    await colorSchemeSwitch(page).click();
    await expect(colorSchemeSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).toHaveClass(/(^|\s)light(\s|$)/u);
    // The proof that the switch chooses a palette and not just a knob position.
    expect(await pageBackground(page)).not.toBe(dark);

    await page.reload();
    await expect(colorSchemeSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).toHaveClass(/(^|\s)light(\s|$)/u);
  });
});

test.describe('on a light desktop', () => {
  test.use({ colorScheme: 'light' });

  test('opens light and switches from the keyboard', async ({ page }) => {
    await page.goto(host.origin);
    await expect(colorSchemeSwitch(page)).toHaveAttribute('aria-checked', 'false');
    const light = await pageBackground(page);

    // The control is reachable and operable without a pointer (WCAG 2.1.1);
    // the shell's heading holds focus after boot, so one Tab reaches it.
    await page.keyboard.press('Tab');
    await expect(colorSchemeSwitch(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(colorSchemeSwitch(page)).toHaveAttribute('aria-checked', 'true');
    expect(await pageBackground(page)).not.toBe(light);
  });
});
