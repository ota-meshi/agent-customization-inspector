// T044: browser acceptance for the boot shell (Phase 3 "Bootable Authorized
// Empty Screen"). Launches the packaged CLI against a temporary fixture,
// opens the printed loopback URL, and verifies the first rendered screen:
// exactly one enabled Repository Source with its escaped, non-authorizing
// selected-root label, an empty inventory and diagnostics list, keyboard
// focus at the top of the shell, and no Repository picker or ancestor
// discovery anywhere on the page.
//
// It then covers host loss, which ends the session on its own. There is no
// page-lifecycle behavior to cover: the page installs no visibility or
// unload listener.
//
// Scope note: the browser cannot observe bootstrap generation 0 itself. The
// automatic first Repository scan is started by the same launch (FR-002),
// so by the time a page loads the committed generation is already 1.
// Generation 0's synchronous idle/null-`scanRequestId` shape is owned by the
// session and host-startup suites, which observe it before any scan is
// admitted.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-boot-'));
  await writeFile(join(fixture, 'AGENTS.md'), '# fixture instructions\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('shows one enabled Repository Source with an empty inventory', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.getByRole('heading', { name: 'Repository' })).toBeVisible();
  // The launch URL is published only after the automatic first scan commits,
  // so the one-fetch shell cannot become stranded on generation 0.
  await expect(page.locator('.aci-scan-status')).toContainText('Ready');
  // The escaped, non-authorizing root presentation: display-only, and the
  // page states as much beside it. The fixture is selected with --root, so the
  // boundary reports that origin rather than the invocation directory.
  await expect(page.locator('.aci-display-root')).toContainText('--root option');
  await expect(page.locator('.aci-note').first()).toContainText('grants no read access');
  // The fixture holds no Codex skill, so the committed inventory is empty and
  // the shell says so instead of rendering an empty list.
  // Vendor-neutral on purpose: the sentence reports the finding, so it stays
  // correct as the shipped catalog grows past Codex.
  await expect(
    page.getByText('No customization file was recognized in this repository.'),
  ).toBeVisible();
  await expect(page.getByText('No session- or source-level diagnostics.')).toBeVisible();
});

test('never displays an escaped label that could be mistaken for a usable path', async ({
  page,
}) => {
  await page.goto(host.origin);
  const label = await page.locator('.aci-display-root').first().innerText();
  // The presentation encoding copies only ASCII letters, digits, and
  // `.`/`/`/`:`/`_`/`-`; anything else is a `\uXXXX` escape.
  expect(label.replace(/\s*\(.*\)$/u, '')).toMatch(/^(?:[A-Za-z0-9./:_-]|\\u[0-9A-F]{4})+$/u);
});

test('places keyboard focus at the top of the shell', async ({ page }) => {
  await page.goto(host.origin);
  // Keyboard and screen-reader users start at the top of the freshly
  // rendered shell rather than at the document root.
  await expect(page.locator('h1')).toBeFocused();
  // Programmatic focus only: the heading is not a tab stop, so it is not
  // something the user has to tab past on every pass.
  await expect(page.locator('h1')).toHaveAttribute('tabindex', '-1');
  await expect
    .poll(() => page.locator('h1').evaluate((element) => getComputedStyle(element).outlineStyle))
    .not.toBe('none');
});

test('offers no Repository picker or ancestor discovery', async ({ page }) => {
  await page.goto(host.origin);
  // The inventory surface has controls, but none of them chooses a root: the
  // Repository is selected once at launch and never from the browser (FR-001).
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  for (const control of await page.locator('input, select, button').all()) {
    const name = `${await control.getAttribute('id')} ${await control.innerText()}`;
    expect(name).not.toMatch(/root|director|folder|browse|open/iu);
  }
  const text = await page.locator('main').innerText();
  // No affordance for selecting another root or walking up to a parent.
  expect(text).not.toMatch(/(?:choose|select|pick|browse for) a|parent director|ancestor/iu);
});

test('ends the session as soon as the host goes away', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-display-root')).toHaveCount(1);
  // No interaction, no lifecycle event, no probe: the closed loopback socket
  // is pushed to the page and the ended view appears on its own.
  await stopHost(host);
  await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible();
  await expect(page.getByRole('status').first()).toContainText('Session ended');
  await expect(page.locator('.aci-display-root')).toHaveCount(0);
  // Re-launched only so the shared afterEach teardown has a live handle.
  host = await launchHost(fixture);
});

test('surfaces connection construction failures instead of remaining in boot', async ({
  page,
}) => {
  await page.route('**/__connection.json', (route) => route.abort('failed'));
  await page.goto(host.origin);
  await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible();
  await expect(page.getByRole('status').first()).toContainText('Session ended');
  await expect(page.getByRole('alert')).not.toHaveText('');
  await expect(page.getByText('Connecting to the local inspection session…')).toHaveCount(0);
});
