// T1166: browser acceptance for the reworked detail surface (Phase 108
// "Detail Surface Rework"). One launch of the packaged CLI against the
// all-supported fixture, so the head every kind draws can be read off one
// committed generation.
//
// What only a rendered page can prove is here: that a detail leads with its
// own customization and states that customization's attributes on one line,
// that the strip of other copies stays one line at nine files and never
// repeats the file on screen, that the body takes the height its content asks
// for instead of a fixed frame, and that the previous and next moves reach the
// neighbouring rows in the list's own order.
//
// Which entries the strip holds is proven closer to the code
// (tests/unit/app/file-strip.test.ts); this suite asserts it only as far as a
// reader can see it.
import { rm } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

import {
  buildAllCustomizationKindFixture,
  type AllCustomizationKindFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: AllCustomizationKindFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-detail-navigation');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** Opens the first row of one kind's list, the way a reader reaches a detail. */
async function openFirstRow(page: Page, kind: string): Promise<void> {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: new RegExp(`^${kind}`, 'u') }).click();
  await page.getByRole('tabpanel').locator('.aci-row-file a').first().click();
  await expect(page).toHaveURL(/\/detail\//u);
}

test('leads with the customization and states its attributes on one line', async ({ page }) => {
  // The subject is the customization rather than the file carrying it
  // (FR-007), and where the page sits is said once above it.
  for (const kind of ['Instructions', 'Skill', 'Rule', 'Hook'] as const) {
    await openFirstRow(page, kind);
    const crumbs = page.locator('.aci-detail-crumbs');
    await expect(crumbs, kind).toHaveCount(1);
    await expect(crumbs, kind).toContainText(kind === 'Skill' ? 'Skill' : kind);
    await expect(page.locator('.aci-detail-title'), kind).toHaveCount(1);
    // One line for the customization's own facts, rather than a paragraph
    // each: what a page states about the customization is taken in at a
    // glance.
    await expect(page.locator('.aci-detail-attributes'), kind).toHaveCount(1);
  }
});

test('keeps the other copies on one line and never repeats the one on screen', async ({ page }) => {
  // The widest row this tree publishes: the root applicability range, whose
  // nine files are what the strip exists for.
  await openFirstRow(page, 'Instructions');
  const strip = page.locator('.aci-file-strip');
  await expect(strip).toHaveCount(1);
  const entries = strip.locator('.aci-file-strip__item');
  expect(await entries.count()).toBeGreaterThan(1);

  const layout = await strip.evaluate((element) => {
    const items = [...element.querySelectorAll('.aci-file-strip__item')];
    return {
      // One line: every entry shares the first one's top edge, however many
      // there are. The strip scrolls sideways instead of stacking.
      tops: new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
      scrolls: element.scrollWidth > element.clientWidth,
      paths: items.map((item) => item.querySelector('a')?.textContent?.trim() ?? ''),
    };
  });
  expect(layout.tops).toBe(1);
  expect(layout.scrolls).toBe(true);

  // The heading already spells the file on screen, so the strip does not
  // (FR-007).
  const subject = await page.locator('.aci-detail-title').innerText();
  expect(layout.paths).not.toContain(subject.trim());

  // Each entry states which products recognize that file, so the strip says
  // what a reader would go there for (FR-009).
  expect(await strip.locator('.aci-recognition-marks__one').count()).toBeGreaterThan(0);

  // And an entry opens that file's own detail.
  await entries.first().locator('a').click();
  await expect(page).toHaveURL(/\/instructions\/detail\//u);
});

test('takes the height its content asks for, under a bound', async ({ page }) => {
  // A short file used to open under a fixed reading box, which spent most of
  // the first screen on an empty frame (FR-007).
  await openFirstRow(page, 'Rule');
  const short = await page
    .locator('.aci-source-viewer')
    .first()
    .evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      cap: Number.parseFloat(globalThis.getComputedStyle(element).maxBlockSize),
    }));
  expect(short.height).toBeLessThan(short.cap);
  expect(short.height).toBeGreaterThan(0);
});

test('reaches the neighbouring rows without returning to the list', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Rule/u }).click();
  const rows = page.getByRole('tabpanel').locator('.aci-item');
  const second = await rows.nth(1).locator('.aci-path').innerText();
  const third = await rows.nth(2).locator('.aci-path').innerText();
  await rows.nth(1).locator('a').first().click();
  await expect(page.locator('.aci-detail-title')).toHaveText(second);

  // The moves are named by the rows they open, and they are the list's own
  // neighbours rather than this page's guess at them.
  const next = page.getByRole('link', { name: /^Next in Rule: /u });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.locator('.aci-detail-title')).toHaveText(third);

  const previous = page.getByRole('link', { name: /^Previous in Rule: /u });
  await previous.click();
  await expect(page.locator('.aci-detail-title')).toHaveText(second);

  // And the way back names the list it returns to.
  await page.getByRole('link', { name: 'Back to Rule' }).click();
  await expect(page).toHaveURL(/\?kind=rule$/u);
});

test('states each recognition’s own invocation name, one row per product', async ({ page }) => {
  // T1182. `.claude/skills/lander/SKILL.md` declares `name: voyage`, and the
  // two products that read it resolve different names from it: Claude Code
  // invokes a skill by its directory, Copilot by the authored name (FR-007).
  // One file therefore answers to two names, which is why the name is stated
  // per recognition rather than once for the page.
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Skill/u }).click();
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: '.claude/skills/lander/SKILL.md' })
    .locator('.aci-row-file a')
    .first()
    .click();
  await expect(page).toHaveURL(/\/skills\/detail\//u);

  // Two names, because the two products resolve different ones, and one
  // recognition inside each: the name is the box and the products that resolve
  // it are its rows.
  const groups = page.locator('.aci-skill-detail__invocations > li');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toContainText('Invocation name: voyage');
  await expect(groups.nth(1)).toContainText('Invocation name: lander');
  // Each name says whether it can be compared, and the two differ here:
  // `voyage` names a second readable copy in this family, `lander` names none.
  // The one that cannot states why rather than leaving a missing control a
  // reader cannot tell from a forgotten one (FR-011).
  await expect(
    groups.nth(0).getByRole('link', { name: /^Compare this skill's files/u }),
  ).toBeVisible();
  await expect(groups.nth(1)).toContainText(
    'This name has one copy here, so there is nothing to compare',
  );
  await expect(groups.nth(1).getByRole('link', { name: /^Compare/u })).toHaveCount(0);
  const rows = page.locator('.aci-skill-detail__recognitions li');
  await expect(rows).toHaveCount(2);
  const stated = await rows.evaluateAll((items) =>
    items.map((item) => ({
      product: (item.querySelector('.aci-skill-detail__invocation-product')?.textContent ?? '')
        .replaceAll(/\s+/gu, ' ')
        .trim(),
      surfaces: (
        item.querySelector('.aci-skill-detail__invocation-surfaces')?.textContent ?? ''
      ).trim(),
      text: (item.textContent ?? '').replaceAll(/\s+/gu, ' ').trim(),
    })),
  );
  // Each row carries its own product, its own surfaces, and its own name —
  // never one name standing for both.
  expect(stated.map((row) => row.product)).toEqual(['GitHub Copilot', 'Claude Code']);
  for (const row of stated) {
    expect(row.surfaces, row.product).not.toBe('');
  }

  // The head's line is the entry file's own facts, and states no product: a
  // product's name is that recognition's row above.
  const head = page.locator('.aci-detail-attributes');
  await expect(head).toContainText('SKILL.md');
  await expect(head).toContainText('bytes');
  await expect(head).not.toContainText('Copilot');
  await expect(head).not.toContainText('Claude Code');
  // The directory is the heading's; the line names the file inside it.
  await expect(head).not.toContainText('.claude/skills/lander/SKILL.md');
});

test('moves to the neighbouring row a declaration kind lists, not its carrier', async ({
  page,
}) => {
  // A declaration kind's row is one name inside a carrier, and one carrier
  // carries several: a move that addressed the carrier alone would open a
  // different page from the one its own label names, and a page that found its
  // own row by carrier alone would offer the first of those rows' neighbours
  // rather than its own.
  for (const [kind, root] of [
    ['Hook', '.aci-hook-detail'],
    ['MCP', '.aci-mcp-detail'],
  ] as const) {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: new RegExp(`^${kind}`, 'u') }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    const second = await rows.nth(1).locator('.aci-row-head__name').innerText();
    const third = await rows.nth(2).locator('.aci-row-head__name').innerText();
    await rows.nth(1).locator('.aci-row-file a').first().click();
    await expect(page.locator(root), kind).toBeVisible();

    // Both moves exist, which they do not when the page matched the wrong row.
    const next = page.getByRole('link', { name: new RegExp(`^Next in ${kind}: `, 'u') });
    const previous = page.getByRole('link', { name: new RegExp(`^Previous in ${kind}: `, 'u') });
    await expect(next, kind).toBeVisible();
    await expect(previous, kind).toBeVisible();
    // And the next move opens the declaration its label names rather than the
    // carrier that holds it.
    expect(await next.getAttribute('aria-label'), kind).toBe(`Next in ${kind}: ${third}`);
    await next.click();
    await expect(page.locator(`${root} .aci-detail-title`), kind).toHaveText(third);
    await page.getByRole('link', { name: new RegExp(`^Previous in ${kind}: `, 'u') }).click();
    await expect(page.locator(`${root} .aci-detail-title`), kind).toHaveText(second);
  }
});
