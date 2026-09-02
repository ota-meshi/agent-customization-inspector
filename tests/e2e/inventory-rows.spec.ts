// T1157: browser acceptance for the compressed inventory row (Phase 107
// "Inventory Row Compression"). One launch of the packaged CLI against the
// all-supported fixture, which holds every kind this release publishes in one
// tree, so the eleven row shapes can be read off one committed generation.
//
// What only a rendered page can prove is here: that a file takes one line
// however many products recognize it, that each recognition still states the
// documented surfaces its admitting rule rests on beside a mark that names the
// product, that a declaration whose file is not its own says which kind of file
// carries it, that the three vendor marks are three distinct glyphs in three
// distinct colours which forced colours returns to one, and that a diagnostic
// is stated by its kind at all times with the explanation disclosed rather than
// standing.
//
// The grouping underneath is proven closer to the code
// (tests/unit/app/skill-row-files.test.ts); this suite asserts it only as far
// as a reader can see it.
import { rm } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  buildAllCustomizationKindFixture,
  type AllCustomizationKindFixture,
} from '../fixtures/repositories/build-fixtures';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/**
 * The kinds whose row is one name a reader looks up, with the files or
 * declarations resolving it beneath: the row draws a name line, and each file
 * takes one line under it.
 */
const NAME_HEADED_KINDS = [
  'Instructions',
  'Skill',
  'MCP',
  'Agent',
  'Prompt / Command',
  'Hook',
  'Plugin',
  'Output style',
] as const;

/**
 * The kinds that carry no name, whose row is its file: there is no name line
 * to draw, so the file line starts where one would have been.
 */
const NAMELESS_KINDS = ['Rule', 'Permissions', 'Settings / Config'] as const;

/**
 * The kinds whose declarations live in files that are not theirs alone, so each
 * line says which kind of file carries it. MCP is deliberately absent: its
 * carriers are MCP documents and general configuration alike, and the vendor
 * documents no name for the distinction that this product could state.
 */
const CARRIER_KIND_KINDS = ['Hook', 'Plugin'] as const;

let fixture: AllCustomizationKindFixture;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = buildAllCustomizationKindFixture('aci-inventory-rows');
  host = await launchHost(fixture.root);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** Selects one kind's list and returns its panel. */
async function openKind(page: Page, kind: string): Promise<Locator> {
  await page.getByRole('tab', { name: new RegExp(`^${kind}`, 'u') }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel.locator('.aci-item').first(), kind).toBeVisible();
  return panel;
}

test('puts one file on one line, under a name only where the kind has one', async ({ page }) => {
  await page.goto(host.origin);

  for (const kind of NAME_HEADED_KINDS) {
    const panel = await openKind(page, kind);
    const rows = panel.locator('.aci-item');
    const rowCount = await rows.count();
    // One name line per row, and the count of files it heads on that same
    // line: the count is what replaced the repeated paths.
    await expect(panel.locator('.aci-row-head'), kind).toHaveCount(rowCount);
    await expect(panel.locator('.aci-row-head__count').first(), kind).toHaveText(/^\d+ /u);
    // Every file line sits under a name line, so none of them starts where a
    // name would have been.
    await expect(panel.locator('.aci-row-file--only'), kind).toHaveCount(0);
    // Each row states at least one file, on one line each.
    for (const row of await rows.all()) {
      expect(await row.locator('.aci-row-file').count(), kind).toBeGreaterThan(0);
    }
  }

  for (const kind of NAMELESS_KINDS) {
    const panel = await openKind(page, kind);
    const rowCount = await panel.locator('.aci-item').count();
    // No name line at all, and one file line per row, drawn where a name line
    // would have been.
    await expect(panel.locator('.aci-row-head'), kind).toHaveCount(0);
    await expect(panel.locator('.aci-row-file--only'), kind).toHaveCount(rowCount);
  }
});

test('states the documented surfaces beside a mark that names the product', async ({ page }) => {
  await page.goto(host.origin);

  for (const kind of [...NAME_HEADED_KINDS, ...NAMELESS_KINDS]) {
    const panel = await openKind(page, kind);
    const recognitions = panel.locator('.aci-recognition-marks__one');
    expect(await recognitions.count(), kind).toBeGreaterThan(0);

    // A surface set narrows what reads the file even when it holds one member,
    // so every recognition states its own rather than leaving it to the legend
    // (FR-009).
    for (const surfaces of await panel.locator('.aci-recognition-marks__surfaces').all()) {
      expect((await surfaces.textContent())?.trim(), kind).not.toBe('');
    }

    // The mark is the only thing on the line that says which product, so the
    // product is named — as text that is not drawn where the mark states a
    // recognition, and as the link's own name where the mark opens that
    // product's reading (contracts/accessibility-acceptance.md § 1.1.1,
    // `RecognitionMarks.vue`).
    const named = await recognitions.evaluateAll((elements) =>
      elements.map((element) => {
        // Where the mark opens a product's own reading, the link around it
        // carries the name and the surfaces sit outside the link, so the
        // recognition's own text starts with the surfaces
        // (`RecognitionMarks.vue`).
        const opens = element.querySelector('.aci-recognition-marks__opens');
        return opens === null
          ? (element.textContent ?? '')
          : (opens.getAttribute('aria-label') ?? '');
      }),
    );
    for (const text of named) {
      expect(text, kind).toMatch(/^(GitHub Copilot|Claude Code|OpenAI Codex)/u);
    }
  }

  // The legend names each mark once for the list, which is what lets the rows
  // draw the product instead of spelling it.
  const legend = page.locator('.aci-tool-legend');
  await expect(legend).toBeVisible();
  await expect(legend).toContainText('GitHub Copilot');
});

test('says which kind of file carries a declaration that is not its own', async ({ page }) => {
  await page.goto(host.origin);

  for (const kind of CARRIER_KIND_KINDS) {
    const panel = await openKind(page, kind);
    expect(await panel.locator('.aci-carrier-kind').count(), kind).toBeGreaterThan(0);
  }
});

test('draws three distinct marks in three distinct colours, and one under forced colours', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The instructions tree is read by all three products, so one list carries
  // all three marks.
  const panel = await openKind(page, 'Instructions');

  const marks = ['copilot', 'claude', 'codex'] as const;
  const read = async (): Promise<readonly { color: string; glyph: string }[]> => {
    const readings: { color: string; glyph: string }[] = [];
    for (const mark of marks) {
      const locator = panel.locator(`.aci-tool-mark--${mark}`).first();
      await expect(locator, mark).toBeAttached();
      readings.push(
        await locator.evaluate((element) => ({
          color: globalThis.getComputedStyle(element).color,
          glyph: element.querySelector('svg')?.innerHTML ?? '',
        })),
      );
    }
    return readings;
  };

  const chosen = await read();
  // Three shapes, so the products stay apart for a reader who cannot see the
  // colours at all — which is the whole of what the row rests on (WCAG 1.4.1).
  expect(new Set(chosen.map((reading) => reading.glyph)).size).toBe(3);
  for (const reading of chosen) {
    expect(reading.glyph).not.toBe('');
  }
  // Three colours, which is the scanning aid the brand marks are drawn in.
  expect(new Set(chosen.map((reading) => reading.color)).size).toBe(3);

  await page.emulateMedia({ forcedColors: 'active' });
  // Emulation that the engine does not apply would leave this asserting the
  // ordinary palette against itself, which is the one outcome it must not
  // report as a pass.
  const active = await page.evaluate(
    () => globalThis.matchMedia('(forced-colors: active)').matches,
  );
  test.skip(!active, 'this revision does not apply the forced-colors emulation');

  const forced = await read();
  // The colours go back to the platform's, so the marks are one colour and the
  // shapes and the surfaces beside them carry everything they carried before
  // (AGENTS.md § Icon policy).
  expect(new Set(forced.map((reading) => reading.color)).size).toBe(1);
  expect(new Set(forced.map((reading) => reading.glyph)).size).toBe(3);

  await page.emulateMedia({ forcedColors: null });
});

test('states a diagnostic by its kind at all times and discloses the explanation', async ({
  page,
}) => {
  await page.goto(host.origin);

  // The all-supported tree carries files whose extraction cannot succeed, so
  // some kind's list states one; which kind is the fixture's business, not this
  // assertion's.
  let badge: Locator | null = null;
  for (const kind of [...NAME_HEADED_KINDS, ...NAMELESS_KINDS]) {
    const panel = await openKind(page, kind);
    const candidate = panel.locator('.aci-row-diagnostics__badge').first();
    if ((await candidate.count()) > 0) {
      badge = candidate;
      break;
    }
  }
  expect(badge, 'the all-supported tree states no row diagnostic').not.toBeNull();

  // The kind of problem is readable without opening anything: that is what
  // lets a reader scan a list for the rows that kept one.
  await expect(badge!).toBeVisible();
  // One word, not a clause. A badge naming the outcome put "could not be
  // parsed" beside every affected path, which is more than a row being scanned
  // for trouble needs: the mark it wants is that this file has some, and which
  // kind is what opens beneath (T1163).
  const label = (await badge!.textContent())?.trim() ?? '';
  expect(label).toBe('diagnostic');

  const explanation = badge!.locator('xpath=..').locator('.aci-row-diagnostics__explanation');
  await expect(explanation).toBeHidden();
  await badge!.click();
  await expect(explanation).toBeVisible();
  // The disclosure is the sentence saying what to do about it, not the badge
  // again (FR-028).
  expect(((await explanation.textContent()) ?? '').length).toBeGreaterThan(label.length);
});

test('offers the two non-kind lists a Source filter and no Tool filter', async ({ page }) => {
  await page.goto(host.origin);
  // A kind's list narrows on both axes.
  await openKind(page, 'Skill');
  await expect(page.getByLabel('Tool', { exact: true })).toHaveCount(1);

  // The two lists that belong to no kind keep the Source control and lose the
  // Tool one: no product recognized a file in no kind, and a Source-level
  // diagnostic is not tied to a product (FR-006).
  for (const entry of ['Files in no kind', 'Diagnostics']) {
    await page.getByRole('tab', { name: new RegExp(`^${entry}`, 'u') }).click();
    await expect(page.getByLabel('Tool', { exact: true }), entry).toHaveCount(0);
    // The all-supported tree carries one Source, where naming the only family
    // would be a question with one answer; the control's own rule is the same
    // on these lists as on a kind's (`InventoryFilters.vue`).
    await expect(page.getByRole('group', { name: 'Filters' }), entry).toBeAttached();
    await expect(page.getByRole('status').filter({ hasText: 'Showing' }), entry).toBeAttached();
  }
});

test('states a file in no kind by its read outcome, on one line', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Files in no kind/u }).click();
  const panel = page.getByRole('tabpanel');
  const rows = panel.locator('.aci-item');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  // No kind lists these files, so there is no name to head them and no product
  // to draw: the row is its file, and what it states is how the file read.
  await expect(panel.locator('.aci-row-head')).toHaveCount(0);
  await expect(panel.locator('.aci-row-file--only')).toHaveCount(rowCount);
  await expect(panel.locator('.aci-recognition-marks__one')).toHaveCount(0);
  for (const row of await rows.all()) {
    await expect(row).toContainText(/Readable text|Binary|Could not be read/u);
  }
});
