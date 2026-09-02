// T1172: browser acceptance for the reworked comparison head (Phase 109
// "Comparison Surfaces and Rework Closure", FR-011, FR-012).
//
// The fixture is the design's own example: one skill name whose two copies are
// read by different products — `.agents/` by GitHub Copilot and OpenAI Codex,
// `.claude/` by GitHub Copilot and Claude Code. That difference is the reason
// this surface exists, so it is what the assertions are about.
//
// Only a rendered page can prove these three. That the recognition table states
// each side's own answer needs the built table on screen, where a cell reading
// `Not recognized` is the thing a side card cannot say. That the way out
// reaches the list the comparison was opened from needs the router. And that
// the diff stays side by side needs Monaco laid out at a real width: it drops
// to one inline column below its own 900px breakpoint, and a comparison
// collapsed to one column has stopped comparing.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The one name's two copies: the same skill authored for two products. */
const AGENTS_PATH = '.agents/skills/greet/SKILL.md';
const CLAUDE_PATH = '.claude/skills/greet/SKILL.md';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-comparison-layout-'));
  await mkdir(join(fixture, '.agents/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, AGENTS_PATH),
    ['---', 'name: greet', '---', '', '# Greet', '', 'The agents-side copy.', ''].join('\n'),
    'utf8',
  );
  await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, CLAUDE_PATH),
    ['---', 'name: greet', '---', '', '# Greet', '', 'The claude-side copy.', ''].join('\n'),
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the one name's comparison from its row's own link. */
async function openComparison(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(host.origin);
  await page
    .locator('.aci-item')
    .filter({ hasText: CLAUDE_PATH })
    .getByRole('link', { name: "Compare this skill's files" })
    .click();
  await page.waitForURL(/\/skills\/compare\/repository\?/u);
}

test("states each side's own recognitions in the table, not on the cards", async ({ page }) => {
  await openComparison(page);
  const sides = page.locator('.aci-compare-sides section');
  await expect(sides).toHaveCount(2);
  // The cards carry the files' own facts. A product is never named there: a
  // card can leave out what is absent but cannot say a product reads neither
  // side, so stating recognitions in both places would say one thing twice and
  // still not say the thing that matters (FR-009, US3 scenario 2).
  await expect(sides.locator('.aci-tool-mark')).toHaveCount(0);

  // The whole point: the two copies are not read by the same products, and the
  // table is where that shows — one row per product, one cell per side.
  const rows = page.locator('.aci-recognition-table tbody tr');
  await expect(rows).toHaveCount(3);
  const stated: { product: string; first: string; second: string }[] = [];
  for (const row of await rows.all()) {
    stated.push({
      product: ((await row.locator('th').textContent()) ?? '').trim(),
      first: ((await row.locator('td').nth(0).textContent()) ?? '').replace(/\s+/gu, ' ').trim(),
      second: ((await row.locator('td').nth(1).textContent()) ?? '').replace(/\s+/gu, ' ').trim(),
    });
  }
  expect(stated.map((row) => row.product)).toEqual([
    'GitHub Copilot',
    'Claude Code',
    'OpenAI Codex',
  ]);
  // The product both copies share recognizes both; each copy's own product
  // recognizes one side and is stated as reading neither of the other.
  expect(stated[0]?.first).toMatch(/^Recognized/u);
  expect(stated[0]?.second).toMatch(/^Recognized/u);
  expect(stated[1]?.first).toBe('Not recognized');
  expect(stated[1]?.second).toMatch(/^Recognized/u);
  expect(stated[2]?.first).toMatch(/^Recognized/u);
  expect(stated[2]?.second).toBe('Not recognized');
  // Every recognized cell carries the surfaces its admission rests on, here as
  // everywhere else the product states one (FR-009).
  for (const row of stated) {
    for (const cell of [row.first, row.second]) {
      if (cell.startsWith('Recognized')) {
        expect(cell, row.product).toMatch(/^Recognized \(.+\)$/u);
      }
    }
  }
});

test('says where the page sits and returns to the list it was opened from', async ({ page }) => {
  await openComparison(page);
  // Location rather than a way out: the kind, the name the two copies share,
  // and this page's own step.
  const crumbs = page.locator('.aci-detail-crumbs');
  await expect(crumbs).toContainText('Skill');
  await expect(crumbs).toContainText('greet');
  await expect(crumbs.locator('.aci-detail-crumbs__subject')).toHaveText('Compare');

  // The heading states the page's purpose, because focus lands on it when the
  // comparison opens and a screen reader hears it alone (WCAG 2.4.6); what is
  // being compared is the line directly below it, so the two are read
  // together.
  await expect(page.locator('.aci-skill-compare h2')).toHaveText('Compare skill files');
  const subject = page.locator('.aci-detail-attributes__subject');
  await expect(subject).toHaveText('greet');
  // The name and nothing else beside it: a count of the compared files would
  // always read "2", a count of the name's copies would re-derive what the
  // inventory row publishes, and which file is on screen is the picker's own
  // value.
  await expect(page.locator('.aci-detail-attributes')).toHaveText('greet');
  // Set above the attribute line it shares a style with, so the subject reads
  // as the subject rather than as one more muted fact.
  expect(
    await subject.evaluate((element) => ({
      subject: Number.parseFloat(globalThis.getComputedStyle(element).fontSize),
      line: Number.parseFloat(globalThis.getComputedStyle(element.parentElement!).fontSize),
    })),
  ).toEqual({ subject: 13, line: 11.5 });

  // The way out is the bar's move, and it lands on the skill list rather than
  // the kind order's default tab.
  await page.getByRole('link', { name: 'Back to Skill' }).click();
  await expect(page).toHaveURL(/\?kind=skill$/u);
});

test('keeps the two files opposite each other rather than collapsing to one column', async ({
  page,
}) => {
  await openComparison(page);
  const diff = page.locator('.aci-skill-compare__source .aci-source-diff');
  await expect(diff).toBeVisible();

  // Monaco renders one editor per side while it is side by side, and a single
  // merged editor once it drops to the inline column.
  const columns = diff.locator('.editor.original, .editor.modified');
  await expect(columns).toHaveCount(2);
  const layout = await diff.evaluate((element) => {
    const editors = [...element.querySelectorAll('.editor.original, .editor.modified')];
    return {
      lefts: new Set(editors.map((editor) => Math.round(editor.getBoundingClientRect().left))).size,
      width: element.getBoundingClientRect().width,
    };
  });
  // Two columns, at two different horizontal positions — side by side rather
  // than stacked — and the box is at least the width that rendering needs.
  expect(layout.lefts).toBe(2);
  expect(layout.width).toBeGreaterThanOrEqual(960);

  // At the reflow width the box keeps that width and the wrapper scrolls it,
  // so the page itself still reflows (WCAG 1.4.10). A side-by-side diff is
  // content that requires a two-dimensional layout for its meaning, which is
  // what that criterion excepts.
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(diff).toBeVisible();
  const narrow = await page.evaluate(() => {
    const box = document.querySelector('.aci-skill-compare__source .aci-source-diff')!;
    const scroller = box.parentElement!;
    return {
      boxWidth: box.getBoundingClientRect().width,
      scrolls: scroller.scrollWidth > scroller.clientWidth,
      pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(narrow.boxWidth).toBeGreaterThanOrEqual(960);
  expect(narrow.scrolls).toBe(true);
  expect(narrow.pageScrolls).toBe(false);
});
