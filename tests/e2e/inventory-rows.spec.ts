// T1157: browser acceptance for the compressed inventory row (Phase 107
// "Inventory Row Compression"). One launch of the packaged CLI against the
// all-supported fixture, which holds every kind this release publishes in one
// tree, so the eleven row shapes can be read off one committed generation.
//
// What only a rendered page can prove is here: that a file takes one line
// however many products recognize it, that each recognition still states the
// documented surfaces its admitting rule rests on beside a mark that names the
// product, that a declaration whose file is not its own says which kind of file
// carries it, that the four vendor marks are four distinct glyphs in four
// distinct colours which forced colours returns to one, and that a diagnostic
// is stated by its kind at all times with the explanation disclosed rather than
// standing.
//
// A skill row holding both kinds of problem a row can carry is read off a
// tree of its own (T1226): the all-supported tree ships no supporting file that
// cannot be read, and adding one there would move the release evidence's
// fixture digests for one assertion.
//
// The grouping underneath is proven closer to the code
// (tests/unit/app/skill-row-files.test.ts); this suite asserts it only as far
// as a reader can see it.
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
      expect(text, kind).toMatch(/^(GitHub Copilot|Claude Code|OpenAI Codex|Antigravity CLI)/u);
    }
  }

  // The legend names each mark once for the list, which is what lets the rows
  // draw the product instead of spelling it — the fourth product included
  // (specs/003-antigravity-cli-support T035). Read on the instructions list,
  // which every product reads: a legend states the products the open list
  // holds, so a kind one of them does not read would not name it.
  await openKind(page, 'Instructions');
  const legend = page.locator('.aci-tool-legend');
  await expect(legend).toBeVisible();
  await expect(legend).toContainText('GitHub Copilot');
  await expect(legend).toContainText('Antigravity CLI');
  // The Tool filter offers every product by name, in the closed tool order.
  await expect(page.getByLabel('Tool', { exact: true }).locator('option')).toContainText([
    /.*/u,
    'GitHub Copilot',
    'Claude Code',
    'OpenAI Codex',
    'Antigravity CLI',
  ]);
});

test('draws two marks on the root GEMINI.md line and three on an .agents skill line', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The root `GEMINI.md` is Copilot's root alternative and Antigravity CLI's
  // own workspace context file: one file line, two marks (spec.md § FR-007,
  // § FR-013).
  const instructions = await openKind(page, 'Instructions');
  const contextLine = instructions
    .locator('.aci-source-family-blocks__members > li')
    .filter({ has: page.getByText('GEMINI.md', { exact: true }) });
  await expect(contextLine.locator('.aci-recognition-marks__one')).toHaveCount(2);
  await expect(contextLine.locator('.aci-tool-mark--copilot')).toHaveCount(1);
  await expect(contextLine.locator('.aci-tool-mark--antigravity')).toHaveCount(1);

  // A skill folder in `.agents/skills/` is Codex's, Copilot's, and Antigravity
  // CLI's at once: one file line, three marks.
  const skills = await openKind(page, 'Skill');
  const sharedLine = skills.locator('.aci-source-family-blocks__members > li').filter({
    has: page.getByText('.agents/skills/changelog/SKILL.md', { exact: true }),
  });
  await expect(sharedLine.locator('.aci-recognition-marks__one')).toHaveCount(3);
  for (const mark of ['copilot', 'codex', 'antigravity']) {
    await expect(sharedLine.locator(`.aci-tool-mark--${mark}`)).toHaveCount(1);
  }
});

test('says which kind of file carries a declaration that is not its own', async ({ page }) => {
  await page.goto(host.origin);

  for (const kind of CARRIER_KIND_KINDS) {
    const panel = await openKind(page, kind);
    expect(await panel.locator('.aci-carrier-kind').count(), kind).toBeGreaterThan(0);
  }
});

test('draws four distinct marks in four distinct colours, and one under forced colours', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The instructions tree is read by all four products, so one list carries
  // all four marks.
  const panel = await openKind(page, 'Instructions');

  const marks = ['copilot', 'claude', 'codex', 'antigravity'] as const;
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
  // Four shapes, so the products stay apart for a reader who cannot see the
  // colours at all — which is the whole of what the row rests on (WCAG 1.4.1).
  expect(new Set(chosen.map((reading) => reading.glyph)).size).toBe(4);
  for (const reading of chosen) {
    expect(reading.glyph).not.toBe('');
  }
  // Four colours, which is the scanning aid the brand marks are drawn in.
  expect(new Set(chosen.map((reading) => reading.color)).size).toBe(4);

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
  expect(new Set(forced.map((reading) => reading.glyph)).size).toBe(4);

  await page.emulateMedia({ forcedColors: null });
});

test('states a diagnostic by its kind at all times and discloses the explanation', async ({
  page,
}) => {
  await page.goto(host.origin);

  // A command whose frontmatter does not parse keeps its line, and a failed
  // parse is the one kind a row's own file carries: a file that could not be
  // read, or holds binary content, is recognized as nothing and listed in no
  // kind.
  const panel = await openKind(page, 'Prompt / Command');
  const line = panel
    .locator('.aci-row-file')
    .filter({ hasText: fixture.commandFixture.malformedCommandPath });
  const badge = line.locator('.aci-row-diagnostics__badge');
  // The kind is readable without opening anything, which is what lets a reader
  // scan a list for the rows that kept one and see what each asks of them
  // (FR-028, T1226).
  await expect(badge).toHaveText('Could not be parsed');

  const explanation = line.locator('.aci-row-diagnostics__explanation');
  await expect(explanation).toBeHidden();
  await badge.click();
  await expect(explanation).toBeVisible();
  // The disclosure is the sentence saying what to do about it, not the badge
  // again (FR-028).
  await expect(explanation).toContainText('This file could not be parsed');
});

test.describe('a skill row that kept two kinds of problem', () => {
  let tree: string;
  let treeHost: LaunchedHost;

  test.beforeAll(async () => {
    tree = await mkdtemp(join(tmpdir(), 'aci-row-diagnostic-kinds-'));
    // A `SKILL.md` whose frontmatter does not parse, beside a supporting file
    // that cannot be read: a link whose target is not there, which the census
    // lists and whose read is that file's own failure (FR-024).
    await mkdir(join(tree, '.claude/skills/deploy/scripts'), { recursive: true });
    await writeFile(
      join(tree, '.claude/skills/deploy/SKILL.md'),
      '---\nname: [deploy\n---\n\nDeploy the site.\n',
      'utf8',
    );
    await symlink(
      join(tree, 'no-such-script.sh'),
      join(tree, '.claude/skills/deploy/scripts/run.sh'),
    );
    treeHost = await launchHost(tree);
  });

  test.afterAll(async () => {
    await stopHost(treeHost);
    await rm(tree, { recursive: true, force: true });
  });

  test('names each kind beside the path it belongs to', async ({ page }) => {
    await page.goto(treeHost.origin);
    const panel = await openKind(page, 'Skill');
    // The two ask for different fixes — the file's own text, or whether the
    // file is there and can be read — so each names its kind beside its own
    // path, on the one row (FR-028).
    await expect(panel.locator('.aci-item')).toHaveCount(1);
    await expect(panel.locator('.aci-row-diagnostics__badge')).toHaveText([
      'Could not be parsed',
      'Could not be read',
    ]);
  });
});

test('offers the non-kind list a Source filter and no Tool filter', async ({ page }) => {
  await page.goto(host.origin);
  // A kind's list narrows on both axes.
  await openKind(page, 'Skill');
  await expect(page.getByLabel('Tool', { exact: true })).toHaveCount(1);

  // The list that belongs to no kind keeps the Source control and loses the
  // Tool one: no product recognized a file in no kind (FR-006).
  await page.getByRole('tab', { name: /^Files in no kind/u }).click();
  await expect(page.getByLabel('Tool', { exact: true })).toHaveCount(0);
  // The all-supported tree carries one Source, where naming the only family
  // would be a question with one answer; the control's own rule is the same on
  // this list as on a kind's (`InventoryFilters.vue`).
  await expect(page.getByRole('group', { name: 'Filters' })).toBeAttached();
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toBeAttached();
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
