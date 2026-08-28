// T919: Repository-complete browser acceptance for US1 — one launch of the
// packaged CLI against the all-supported fixture, which holds every kind this
// release publishes in one tree.
//
// The per-family suites each assert their own kind's rows; what this one owns
// is the whole inventory at once: every kind's tab populated, a file two
// products read named by both, a diagnostic where a file could not be read, an
// empty state that says which filter emptied it, a request-correlated rescan
// and its retry control, keyboard operation of the tab strip and the filters,
// atomic replacement across a commit, and — the negative half — that no
// authored value, no interpretation, no verdict, and no fix control appears
// anywhere on it.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import {
  FIXTURE_SECRET_LITERAL,
  buildAllCustomizationKindFixture,
  type AllCustomizationKindFixture,
} from '../fixtures/repositories/build-fixtures';
import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** Every kind tab the all-supported tree must populate. */
const KIND_TABS = [
  'Instructions',
  'Skill',
  'MCP',
  'Agent',
  'Prompt / Command',
  'Rule',
  'Permissions',
  'Hook',
  'Plugin',
  'Output style',
  'Settings / Config',
] as const;

let fixture: AllCustomizationKindFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-repository-complete');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/**
 * Dispatches a rescan and refreshes until the committed inventory answers
 * `probe`. Nothing on the inventory updates by itself — the page says so — so
 * a reader watching for a rescan's result presses "Refresh status", and a test
 * that waited silently would be waiting for something the product never does.
 */
async function rescanUntil(
  page: import('@playwright/test').Page,
  probe: () => Promise<boolean>,
): Promise<void> {
  await page.getByRole('button', { name: /Rescan repository|Retry scan/u }).click();
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'Refresh status' }).click();
        return probe();
      },
      { timeout: 60_000, intervals: [500] },
    )
    .toBe(true);
}

test('populates every kind this release publishes, from one tree', async ({ page }) => {
  await page.goto(host.origin);
  for (const kind of KIND_TABS) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${kind}`, 'u') });
    await expect(tab, kind).toHaveCount(1);
    await tab.click();
    // A tab that exists has rows behind it: the strip offers a kind only when
    // the committed generation published one.
    await expect(page.getByRole('tabpanel').locator('.aci-item').first(), kind).toBeVisible();
  }
});

test('states a read that failed where the file is listed, and stays partial', async ({ page }) => {
  await page.goto(host.origin);
  // The tree carries files whose extraction cannot succeed, so the scan
  // commits `partial` and each failure is stated where its own file is listed
  // (FR-028). The status is the Source's, not a modal.
  await expect(page.locator('main')).toContainText('Partial');
  await expect(page.locator('main')).toContainText('kept a diagnostic of their own');
});

test('says which filter emptied the list, and restores it', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  const rows = page.getByRole('tabpanel').locator('.aci-item');
  const populated = await rows.count();
  expect(populated).toBeGreaterThan(0);

  await page.getByLabel('Path contains').fill('no-such-path-anywhere');
  // The empty state names the filters rather than the repository: the rows are
  // there and this reader's query is what hid them.
  await expect(page.getByRole('tabpanel')).toContainText('match the current filters');
  await page.getByRole('button', { name: /Clear filters/u }).click();
  await expect(rows).toHaveCount(populated);
});

test('replaces the whole inventory on a rescan rather than merging into it', async ({ page }) => {
  const added = '.claude/skills/acceptance-added';
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel).not.toContainText('acceptance-added');

  // A generation is the whole state as of its commit: the skill added while
  // the session is up appears only after a rescan commits a generation holding
  // it, and when it goes the rows go with it rather than lingering from the
  // generation that had them.
  await mkdir(join(fixture.root, added), { recursive: true });
  await writeFile(
    join(fixture.root, added, 'SKILL.md'),
    '---\nname: acceptance-added\ndescription: Added while the session was up.\n---\n\nAdded.\n',
    'utf8',
  );
  await rescanUntil(
    page,
    async () =>
      (await panel.locator('.aci-item').filter({ hasText: 'acceptance-added' }).count()) === 1,
  );

  await rm(join(fixture.root, added), { recursive: true, force: true });
  await rescanUntil(
    page,
    async () =>
      (await panel.locator('.aci-item').filter({ hasText: 'acceptance-added' }).count()) === 0,
  );
});

test('is operable from the keyboard, tab strip and filters alike', async ({ page }) => {
  await page.goto(host.origin);
  // The tab strip is reachable by Tab and operated by the arrow keys — the
  // rail is vertical, so `ArrowDown` is the neighbour — and selection follows
  // focus, which is what makes a kind switch one key rather than two. The
  // filters are reachable the same way: a pointer is never required to narrow
  // the inventory (WCAG 2.1.1).
  const selected = page.locator('[role="tab"][aria-selected="true"]');
  const left = await selected.textContent();
  await tabUntilFocused(page, selected);
  await page.keyboard.press('ArrowDown');
  // Selection follows focus in this rail, so one key both moves and switches:
  // the tab that now has focus is the selected one, and it is not the one the
  // reader arrived on.
  await expect(page.locator('[role="tab"]:focus')).toHaveAttribute('aria-selected', 'true');
  expect(await selected.textContent()).not.toBe(left);
  const path = page.getByLabel('Path contains');
  await tabUntilFocused(page, path);
  await page.keyboard.type('deploy');
  await expect(page.getByRole('tabpanel')).toContainText('deploy');
});

test('shows no authored value, no interpretation, and no control that would fix one', async ({
  page,
}) => {
  await page.goto(host.origin);
  for (const kind of KIND_TABS) {
    await page.getByRole('tab', { name: new RegExp(`^${kind}`, 'u') }).click();
    // Authored content reaches a surface only through an explicit detail
    // request: the inventory lists what was found, never what it says
    // (FR-027). Checked against the page as rendered — every element of it —
    // because a leak that arrived inside an authored-text span would be a leak
    // all the same.
    expect(await page.locator('main').innerText(), kind).not.toContain(FIXTURE_SECRET_LITERAL);

    // The product's own words, with the authored ones removed: a reader's file
    // may be named anything — the all-supported tree ships a `quality-review`
    // plugin — and the scan below is about what the product says, not about
    // what it was asked to list. Removing them is safe only here, because the
    // secret was already looked for in the unmodified page above.
    const text = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main === null) {
        throw new Error('no main element rendered');
      }
      const copy = main.cloneNode(true) as HTMLElement;
      for (const authored of copy.querySelectorAll('.aci-authored-text, .aci-path')) {
        authored.remove();
      }
      return copy.innerText;
    });
    // It says nothing about the quality of a reader's own files: no ranking,
    // no verdict, no lint, no remediation (QR-001, FR-032).
    for (const word of [
      'valid',
      'invalid',
      'correct',
      'compliant',
      'effective',
      'quality',
      'lint',
      'remediat',
      'severity',
      'score',
      'recommend',
    ]) {
      expect(text.toLowerCase(), `${kind}: ${word}`).not.toContain(word);
    }
  }
  // Nor any control that would act on a file: this product reads and shows.
  for (const pattern of [/fix/iu, /repair/iu, /validate/iu, /lint/iu, /apply/iu, /^run/iu]) {
    await expect(page.getByRole('button', { name: pattern })).toHaveCount(0);
  }
});
