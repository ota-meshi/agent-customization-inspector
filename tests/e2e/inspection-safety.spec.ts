// T927: what a browsing session does to the tree it inspects, and what it
// shows when a scan cannot finish (FR-023, FR-028, FR-030).
//
// The integration suite asserts the same invariants against the scan directly;
// this one asserts them through the product a reader actually runs: the
// packaged CLI serving a real tree, browsed the way a reader browses it — the
// inventory, a detail, a comparison, a rescan — with the tree observed before
// and after.
//
// The two failure shapes a reader can reach from here are the deterministic
// first-scan failure, which retains the generation-0 Source with no stale
// overlay, and the partial commit a file-confined outcome produces. A fatal
// rescan's stale overlay is the contract suite's: nothing a browser can do
// makes a scan throw.
import { chmodSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openRepositoryStatus } from './repository-status';

/** What a test can observe about one file before and after a session. */
interface Observation {
  readonly size: number;
  readonly mode: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
  readonly content: string;
}

/**
 * Observes every file under `root`. `atime` is deliberately absent: reading a
 * file is what moves it, so it is the one attribute a read may change and is
 * never a mutation this product made.
 */
async function observe(root: string, relative = ''): Promise<Map<string, Observation>> {
  const observed = new Map<string, Observation>();
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const [nested, value] of await observe(root, path)) {
        observed.set(nested, value);
      }
      continue;
    }
    const stats = await stat(join(root, path));
    observed.set(path, {
      size: stats.size,
      mode: stats.mode,
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
      content: await readFile(join(root, path), 'latin1'),
    });
  }
  return observed;
}

test.describe('a session that browsed the tree', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-safety-'));
    await writeFile(join(fixture, 'AGENTS.md'), '# Repository instructions\n', 'utf8');
    await mkdir(join(fixture, '.claude/skills/deploy'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/deploy/SKILL.md'),
      '---\nname: deploy\ndescription: Ship it.\n---\n\nBody.\n',
      'utf8',
    );
    await mkdir(join(fixture, '.agents/skills/deploy'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/skills/deploy/SKILL.md'),
      '---\nname: deploy\ndescription: Ship it elsewhere.\n---\n\nOther body.\n',
      'utf8',
    );
    // A file whose declarations cannot be read: the one outcome that may make
    // a generation partial while every other file stays complete.
    await mkdir(join(fixture, '.claude/skills/malformed'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/malformed/SKILL.md'),
      '---\nname: [unterminated\n---\n\nBody.\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('leaves every byte, size, mode, and time exactly as it found them', async ({ page }) => {
    const before = await observe(fixture);
    expect(before.size).toBeGreaterThan(3);

    // Everything a reader does: the inventory, a detail, a comparison of the
    // two copies of one skill name, and an explicit rescan.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^Skill/u }).click();
    await page.getByRole('link', { name: /\.claude\/skills\/deploy\/SKILL\.md/u }).click();
    await expect(page.locator('main')).toContainText('Ship it.');
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^Skill/u }).click();
    await page
      .getByRole('link', { name: /^Compare this skill/u })
      .first()
      .click();
    // Waited on the compared content rather than on the heading: the heading
    // is there before either side has been read, so observing the tree then
    // would leave the comparison's own reads outside the window this case
    // watches.
    await expect(page.locator('main')).toContainText('Ship it elsewhere.');
    await expect(page.locator('main')).toContainText('Other body.');

    await page.goto(host.origin);
    // And waited on the generation the rescan commits, for the same reason: a
    // scan is still reading when its admission returns.
    await page.getByRole('button', { name: 'Rescan repository' }).click();
    // The committed generation is the Repository Source's own surface (FR-030).
    // Both commands are in the bar, so the poll refreshes from there and reads
    // the number where it is stated.
    await page.goto(new URL('/repository', host.origin).href);
    await expect
      .poll(
        async () => {
          await page.getByRole('button', { name: 'Refresh status' }).first().click();
          return page.locator('main').innerText();
        },
        { timeout: 60_000, intervals: [300] },
      )
      .toMatch(/Committed generation\s*2/u);

    const after = await observe(fixture);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  test('commits partial for the one file it could not parse, and stays usable', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // A file-confined outcome is the only thing that may make a generation
    // partial: the generation still committed, every other file is complete,
    // and the session's own controls keep working (FR-028). The status and its
    // count are the Repository Source's own facts, so they are stated on that
    // Source's surface (FR-030).
    const status = await openRepositoryStatus(page);
    await expect(status).toContainText('Partial');
    await expect(status).toContainText('1 file kept a diagnostic of its own');
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^Skill/u }).click();
    await expect(
      page.getByRole('link', { name: /\.claude\/skills\/deploy\/SKILL\.md/u }),
    ).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Rescan repository' })).toBeEnabled();
  });
});

test.describe('a first scan that cannot read its root', () => {
  let unreadable: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    unreadable = await mkdtemp(join(tmpdir(), 'aci-safety-unreadable-'));
    await writeFile(join(unreadable, 'AGENTS.md'), '# never read\n', 'utf8');
    // A directory the process cannot enumerate: the deterministic first-scan
    // failure a reader can actually produce.
    chmodSync(unreadable, 0o000);
    host = await launchHost(unreadable);
  });

  test.afterEach(async () => {
    await stopHost(host);
    chmodSync(unreadable, 0o700);
    await rm(unreadable, { recursive: true, force: true });
  });

  test('keeps the generation-0 Source and its own diagnostic, with no stale overlay', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // A root that cannot be read is the Source's own diagnostic rather than
    // any file's, so it is listed under the entry that holds exactly those
    // (FR-002, FR-028).
    await page.getByRole('tab', { name: /^Diagnostics/u }).click();
    await expect(page.getByRole('tabpanel')).toContainText(
      'The selected root does not exist or cannot be read',
    );

    await page.goto(new URL('/repository', host.origin).href);
    const main = page.locator('main');
    // No partial inventory, no stale overlay — there is no prior commit to be
    // stale against — and the session stays operable so a rescan can be
    // dispatched once the root is readable again (FR-002).
    await expect(main).toContainText('Committed generation');
    await expect(main.locator('dd').filter({ hasText: /^0$/u }).first()).toBeVisible();
    // No stale overlay: that state is what the product says after a rescan
    // failed over a generation it had already committed, and there is no such
    // generation here. Its own sentence is absent, and so is the control it
    // renames — the button still offers a rescan rather than a retry.
    await expect(main).not.toContainText('The last rescan failed');
    await expect(page.getByRole('button', { name: 'Retry scan' })).toHaveCount(0);
    // The Repository page's own command, which names no Source because the page
    // is one (`ScanProgress.vue`).
    await expect(page.getByRole('button', { name: 'Rescan', exact: true })).toBeEnabled();
  });
});
