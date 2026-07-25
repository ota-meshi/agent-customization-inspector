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
// unload listener (amended 2026-07-24).
//
// Scope note: the browser cannot observe bootstrap generation 0 itself. The
// automatic first Repository scan is started by the same launch (FR-002),
// so by the time a page loads the committed generation is already 1.
// Generation 0's synchronous idle/null-`scanRequestId` shape is owned by the
// session and host-startup suites, which observe it before any scan is
// admitted.
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CLI_ENTRY = join(REPO_ROOT, 'dist', 'cli.mjs');
const LOOPBACK_LAUNCH_LINE = /^http:\/\/localhost:\d+\/$/u;

/** One launched host process and the loopback origin it printed. */
interface LaunchedHost {
  readonly child: ChildProcessByStdio<null, Readable, Readable>;
  readonly origin: string;
}

/** Launches the packaged CLI and resolves once it prints its launch line. */
async function launchHost(fixture: string): Promise<LaunchedHost> {
  const child = spawn(process.execPath, [CLI_ENTRY, '--no-open', '--cwd', fixture], {
    cwd: tmpdir(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const origin = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`the CLI printed no launch line; stdout=${stdout} stderr=${stderr}`));
    }, 30_000);
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const line = stdout.split('\n').find((candidate) => LOOPBACK_LAUNCH_LINE.test(candidate.trim()));
      if (line !== undefined) {
        clearTimeout(timer);
        resolve(line.trim());
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`the CLI exited with code ${code}; stderr=${stderr}`));
    });
  });
  child.removeAllListeners('exit');
  return { child, origin };
}

/** Stops a launched host and waits for the process to exit. */
async function stopHost(host: LaunchedHost): Promise<void> {
  const exited = new Promise<void>((resolve) => {
    host.child.once('exit', () => resolve());
  });
  host.child.kill('SIGINT');
  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        host.child.kill('SIGKILL');
        resolve();
      }, 10_000);
    }),
  ]);
}

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
  const sources = page.locator('.aci-source');
  await expect(sources).toHaveCount(1);
  await expect(sources.first()).toContainText('Repository');
  // The launch URL is published only after the automatic first scan commits,
  // so the one-fetch shell cannot become stranded on generation 0.
  await expect(sources.first()).toContainText('Ready');
  // The escaped, non-authorizing root presentation: display-only, and the
  // page states as much beside it.
  const displayRoot = sources.first().locator('.aci-display-root');
  // The fixture is selected with --cwd, so the boundary reports that origin
  // rather than the invocation working directory.
  await expect(displayRoot).toContainText('--cwd option');
  await expect(page.locator('.aci-note')).toContainText('grants no read access');
  // No customization rule ships yet, so the committed inventory is empty and
  // the shell says so instead of rendering an empty list.
  await expect(page.getByText('No customization files have been committed yet.')).toBeVisible();
  await expect(page.getByText('No diagnostics.')).toBeVisible();
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
  // something the user has to tab past on every pass. The Phase 3 shell has
  // no interactive element at all, so there is no further tab order to
  // assert here — the browser chrome owns what Tab does next.
  await expect(page.locator('h1')).toHaveAttribute('tabindex', '-1');
  await expect
    .poll(() => page.locator('h1').evaluate((element) => getComputedStyle(element).outlineStyle))
    .not.toBe('none');
});

test('offers no Repository picker or ancestor discovery', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.locator('input, select, [contenteditable="true"]')).toHaveCount(0);
  await expect(page.getByRole('button')).toHaveCount(0);
  const text = await page.locator('main').innerText();
  // No affordance for selecting another root or walking up to a parent.
  expect(text).not.toMatch(/(?:choose|select|pick|browse for) a|parent director|ancestor/iu);
});

test('ends the session as soon as the host goes away', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-source')).toHaveCount(1);
  // No interaction, no lifecycle event, no probe: the closed loopback socket
  // is pushed to the page and the ended view appears on its own.
  await stopHost(host);
  await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Session ended');
  await expect(page.locator('.aci-source')).toHaveCount(0);
  // Re-launched only so the shared afterEach teardown has a live handle.
  host = await launchHost(fixture);
});

test('surfaces connection construction failures instead of remaining in boot', async ({
  page,
}) => {
  await page.route('**/__connection.json', (route) => route.abort('failed'));
  await page.goto(host.origin);
  await expect(page.getByRole('heading', { name: 'Session ended' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Session ended');
  await expect(page.getByRole('alert')).not.toHaveText('');
  await expect(page.getByText('Connecting to the local inspection session…')).toHaveCount(0);
});
