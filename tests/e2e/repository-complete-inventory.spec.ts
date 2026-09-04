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
import { openRepositoryStatus } from './repository-status';

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

test('keeps the bar and the rail on screen as the document scrolls', async ({ page }) => {
  // The shell's own behaviour, asserted here because it needs a list long
  // enough for the document to scroll — which is this tree (`App.vue`).
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Agent/u }).click();
  await expect(page.getByRole('tabpanel').locator('.aci-item').first()).toBeVisible();

  // The document is the one scroll container, and the bar sticks to its top
  // (`App.vue`). It is drawn the same pinned or not: page padding above it
  // would be the distance it jumped on the first scroll.
  const before = await page.evaluate(() => {
    const bar = document.querySelector('.aci-app__bar')!.getBoundingClientRect();
    return { top: bar.top, height: bar.height };
  });
  expect(before.top).toBe(0);

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => {
    const bar = document.querySelector('.aci-app__bar')!.getBoundingClientRect();
    const rail = document.querySelector('.aci-inventory-page__rail')!.getBoundingClientRect();
    const entries = document.querySelector('.aci-inventory-page__entries')!.getBoundingClientRect();
    const panel = document.querySelector('.aci-inventory-page__panel')!.getBoundingClientRect();
    // The token the rail and the scroll padding are offset by, resolved the way
    // the browser resolves it rather than read from the stylesheet.
    const probe = document.createElement('span');
    probe.style.blockSize = 'var(--aci-sticky-bar)';
    probe.style.display = 'block';
    document.body.append(probe);
    const token = probe.getBoundingClientRect().height;
    probe.remove();
    return {
      scrollY: window.scrollY,
      barTop: bar.top,
      barHeight: bar.height,
      entriesTop: entries.top,
      // The rail's surface and the rows it selects, which the grid stretches to
      // the same height.
      railHeight: rail.height,
      panelHeight: panel.height,
      token,
    };
  });
  expect(after.scrollY).toBeGreaterThan(0);
  expect(after.barTop).toBe(0);
  expect(after.barHeight).toBe(before.height);

  // The entries clear the bar rather than sliding under it. The offset is a
  // token because CSS cannot read the bar's own height, so the two are asserted
  // to agree here: a bar that grew without the token following it would hide
  // the rail's first entries (`main.css` § --aci-sticky-bar).
  //
  // Within a pixel, because the two reach the same box by different routes —
  // a resolved custom property and a measured rectangle — and an engine that
  // rounds them apart by a fraction of one covers nothing a reader could see.
  // What this still catches is a bar that outgrew its token by a visible
  // amount, which is the failure the assertion is for.
  expect(after.token).toBeGreaterThanOrEqual(after.barHeight - 1);
  // To within a pixel, for the same reason as the bound above: what matters
  // is that the entries start where the token says, not that two measurements
  // of one edge agree to the last representable fraction.
  expect(after.entriesTop).toBeCloseTo(after.token, 1);

  // What sticks is the entries, not the surface behind them: the rail's panel
  // is as tall as the rows beside it, so it runs to the foot of the list rather
  // than stopping where the entries happen to end — a surface that stopped
  // there would read as a sidebar cut off half way down.
  expect(after.railHeight).toBe(after.panelHeight);
  expect(after.railHeight).toBeGreaterThan(after.entriesTop + 100);

  // And the document ends where that column does. A sticky box cannot leave
  // its containing block, so any scroll below the rail's column is scroll the
  // page takes while the list is already held at its end: over those pixels it
  // slides up under the bar and its first entries go with it (`App.vue`
  // § .aci-app).
  await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  const bottom = await page.evaluate(() => {
    const rail = document.querySelector('.aci-inventory-page__rail')!.getBoundingClientRect();
    const entries = document.querySelector('.aci-inventory-page__entries')!.getBoundingClientRect();
    return {
      railBottom: Math.round(rail.bottom + globalThis.scrollY),
      documentBottom: document.documentElement.scrollHeight,
      entriesTop: Math.round(entries.top),
      barBottom: Math.round(
        document.querySelector('.aci-app__bar')!.getBoundingClientRect().bottom,
      ),
    };
  });
  expect(bottom.railBottom).toBe(bottom.documentBottom);
  // So at the very bottom the list still starts below the bar rather than
  // under it.
  expect(bottom.entriesTop).toBeGreaterThanOrEqual(bottom.barBottom);
  await expect(page.getByRole('tab', { name: /^Agent/u })).toBeInViewport();
});

test('clears a focused element of the bar at the width the bar wraps at', async ({ page }) => {
  // The scroll padding is what keeps a focused element out from under the
  // opaque bar (WCAG 2.4.11), and the bar wraps: two lines below 32rem, and at
  // any width once the reader's text is large enough. `--aci-sticky-bar` is
  // therefore published from the bar's measured height rather than written as
  // a constant (`App.vue` § barHeightObserver), and this is the assertion that
  // the publication happens: held at the one-line value, `scrollIntoView` put
  // a link 31.79px under the bar, which is a whole row hidden.
  //
  // Asserted here rather than by eye: 50px against an 81.84px bar looks like a
  // page that scrolled slightly short of the target.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(host.origin);
  await page.waitForSelector('.aci-app__bar');
  const wrapped = await page.evaluate(() => ({
    barHeight: document.querySelector('.aci-app__bar')!.getBoundingClientRect().height,
    scrollPadding: Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingBlockStart,
    ),
  }));
  // The bar does wrap at this width — without that this test would pass on a
  // one-line bar and assert nothing.
  expect(wrapped.barHeight).toBeGreaterThan(60);
  // To within a pixel: two measurements of one edge need not agree to the last
  // representable fraction.
  expect(wrapped.scrollPadding).toBeCloseTo(wrapped.barHeight, 1);

  // And a link scrolled to its top lands clear of the bar rather than under it.
  const cleared = await page.evaluate(async () => {
    const bar = document.querySelector('.aci-app__bar')!;
    const links = [...document.querySelectorAll('a[href]')].filter(
      (link) => !bar.contains(link),
    ) as HTMLElement[];
    const target = links[Math.floor(links.length / 2)]!;
    target.scrollIntoView({ block: 'start' });
    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 300);
    });
    return bar.getBoundingClientRect().bottom - target.getBoundingClientRect().top;
  });
  expect(cleared).toBeLessThan(1);
});

test('states a read that failed where the file is listed, and stays partial', async ({ page }) => {
  await page.goto(host.origin);
  // The tree carries files whose extraction cannot succeed, so the scan
  // commits `partial` and each failure is stated where its own file is listed
  // (FR-028). The status is the Source's, not a modal.
  const status = await openRepositoryStatus(page);
  // One word for one status, and the count this panel states itself: what the
  // word cannot say, the sentence beside it does.
  await expect(status).toContainText('Inspected');
  await expect(status).toContainText('kept a diagnostic of their own');
});

test('says which filter emptied the list, and restores it', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  const rows = page.getByRole('tabpanel').locator('.aci-item');
  const populated = await rows.count();
  expect(populated).toBeGreaterThan(0);

  await page
    .getByRole('searchbox', { name: 'Search names and paths' })
    .fill('no-such-path-anywhere');
  // The empty state names the filters rather than the repository: the rows are
  // there and this reader's query is what hid them. Its own way out is inside
  // the box, where the reader's eye already is — the filter row carries the
  // same command, and either restores the list.
  const empty = page.getByRole('tabpanel').locator('.aci-empty-result');
  await expect(empty).toContainText('match the current filters');
  await empty.getByRole('button', { name: 'Clear filters' }).click();
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
  const path = page.getByRole('searchbox', { name: 'Search names and paths' });
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
