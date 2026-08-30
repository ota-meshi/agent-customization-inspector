// T919: the discovery half of US1 in a browser (quickstart.md § User story
// validation · 1. Discover Repository customizations).
//
// One launch of the packaged CLI against a real tree, driven through the page
// a reader actually gets. What it verifies is the numbered claims of that
// section that are observable there: the selected root as an escaped label
// and no picker beside it, the filters under pointer and keyboard, one
// physical file as one row naming every product that reads it, near misses
// absent, the empty repository's own explanation, and the automatic scan's
// committed generation followed by an explicit rescan that replaces it.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/**
 * A near miss one segment from an admitted path: the root `GEMINI.md` is
 * Copilot's, and one directory below it no rule reaches — unlike a nested
 * `CLAUDE.md`, which is Claude Code's own instruction file at any depth.
 */
const NEAR_MISS = 'docs/GEMINI.md';

test.describe('discovering the customizations of one repository', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-discovery-'));
    // One physical file both Codex and Copilot read, one Claude-only file
    // beside it, and a near miss a segment below the admitted spelling.
    await writeFile(join(fixture, 'AGENTS.md'), '# Repository instructions\n', 'utf8');
    await writeFile(join(fixture, 'CLAUDE.md'), '# Claude instructions\n', 'utf8');
    await mkdir(join(fixture, 'docs'), { recursive: true });
    await writeFile(join(fixture, NEAR_MISS), '# not an instruction file here\n', 'utf8');
    await mkdir(join(fixture, '.claude/skills/deploy'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/deploy/SKILL.md'),
      '---\nname: deploy\ndescription: Ship the service.\n---\n\nShip it.\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('names the selected root as a label, with no picker beside it', async ({ page }) => {
    await page.goto(host.origin);
    const main = page.locator('main');
    await expect(main).toContainText('Selected root');
    // The label is a presentation escaping of the root, not a control: there
    // is no picker and no ancestor search, so the option the launch carried is
    // the whole selection (FR-001).
    await expect(
      page.getByRole('button', { name: /browse|choose|select folder|pick/iu }),
    ).toHaveCount(0);
    await expect(main).toContainText('grants no read access');
  });

  test('lists one physical file once, naming every product that reads it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Instructions/u }).click();
    const panel = page.getByRole('tabpanel');
    // This kind's row is an applicability range and the file sits inside it,
    // so what "one file, one entry" means here is one link: two products
    // reading `AGENTS.md` are two recognitions of one file, listed beside it
    // rather than as a second entry (FR-004).
    const agents = panel.getByRole('link', { name: /AGENTS\.md/u });
    await expect(agents).toHaveCount(1);
    const agentsLine = panel
      .locator('p.aci-instruction-row__owner')
      .filter({ hasText: 'AGENTS.md' });
    await expect(agentsLine).toContainText('OpenAI Codex');
    await expect(agentsLine).toContainText('GitHub Copilot');
    // The near miss is listed nowhere: a path one segment from an admitted one
    // is not admitted by being close to it.
    await expect(panel).not.toContainText(NEAR_MISS);
  });

  test('narrows the inventory by pointer and by keyboard alike', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Instructions/u }).click();
    const panel = page.getByRole('tabpanel');
    const files = panel.locator('.aci-path');
    const unfiltered = await files.count();
    expect(unfiltered).toBeGreaterThan(1);

    // Pointer: the tool filter keeps the files the selected product reads and
    // drops the rest, row and all where nothing of it matched.
    await page.getByLabel('Tool', { exact: true }).selectOption('claude');
    await expect(panel).toContainText('CLAUDE.md');
    await expect(panel).not.toContainText('AGENTS.md');

    // Keyboard: the path filter is reachable and operable without a pointer,
    // and a query that matches nothing states that rather than emptying the
    // page silently.
    await page.getByLabel('Tool', { exact: true }).selectOption('');
    const path = page.getByLabel('Path contains');
    await path.focus();
    await page.keyboard.type('no-such-path');
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');
    for (const _character of 'no-such-path') {
      await page.keyboard.press('Backspace');
    }
    await expect(files).toHaveCount(unfiltered);
  });

  test("restores the narrowed list on a history step between this page's own entries", async ({
    page,
  }) => {
    // A history jump between two of the inventory page's own entries changes
    // only the query, with no mount in between: the selections must read the
    // URL back, or the address bar would show the narrowed list while the
    // controls and the rows stayed on the other entry's state.
    await page.goto(new URL('/?kind=instructions', host.origin).href);
    const panel = page.getByRole('tabpanel');
    await page.getByLabel('Path contains').fill('CLAUDE');
    await expect(panel).not.toContainText('AGENTS.md');
    // Navigating to a detail page and back through its own link produces two
    // inventory entries — the narrowed one and the unfiltered one the back
    // link wrote.
    await panel
      .getByRole('link', { name: /CLAUDE\.md/u })
      .first()
      .click();
    await page.getByRole('link', { name: 'Back to the inventory' }).click();
    await expect(panel).toContainText('AGENTS.md');
    // The browser's history menu jumps straight from the unfiltered entry to
    // the narrowed one — one popstate over the detail entry, landing on the
    // page that is already mounted.
    await page.evaluate(() => {
      history.go(-2);
    });
    await expect(page.getByLabel('Path contains')).toHaveValue('CLAUDE');
    await expect(panel).not.toContainText('AGENTS.md');
    await expect(panel).toContainText('CLAUDE.md');
  });

  test('commits the automatic scan and replaces it on an explicit rescan', async ({ page }) => {
    await page.goto(host.origin);
    const main = page.locator('main');
    // The automatic scan committed generation 1; generation 0 is the
    // bootstrap state no scan has replaced yet.
    await expect(main).toContainText('Committed generation');
    await expect(main.locator('dd').filter({ hasText: /^1$/u }).first()).toBeVisible();

    // A file added while the session is up is not in the committed generation
    // until a rescan commits one that holds it: a generation is a whole state
    // as of its commit, not a stream of edits.
    await writeFile(join(fixture, 'GEMINI.md'), '# Gemini instructions\n', 'utf8');
    await page.getByRole('tab', { name: /Instructions/u }).click();
    await expect(page.getByRole('tabpanel')).not.toContainText('GEMINI.md');

    // Nothing on this page updates by itself, which it says of itself: a
    // reader watching for a rescan's result presses "Refresh status", so this
    // is what waiting for the commit looks like.
    await page.getByRole('button', { name: 'Rescan repository' }).click();
    await expect
      .poll(
        async () => {
          await page.getByRole('button', { name: 'Refresh status' }).click();
          return page
            .getByRole('tabpanel')
            .getByRole('link', { name: /^GEMINI\.md/u })
            .count();
        },
        { timeout: 30_000, intervals: [300] },
      )
      .toBe(1);
    await expect(main.locator('dd').filter({ hasText: /^2$/u }).first()).toBeVisible();
  });
});

test.describe('an empty repository', () => {
  let empty: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    empty = await mkdtemp(join(tmpdir(), 'aci-discovery-empty-'));
    host = await launchHost(empty);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(empty, { recursive: true, force: true });
  });

  test('succeeds and explains its own scope', async ({ page }) => {
    await page.goto(host.origin);
    // A successful scan that found nothing: the session is ready, the
    // generation committed, and the page says what it looked for rather than
    // showing a failure.
    await expect(page.locator('main')).toContainText('Inspection session ready.');
    await expect(page.locator('main')).toContainText(
      'No customization files were recognized in this scan.',
    );
    await expect(page.locator('.aci-error')).toHaveCount(0);
  });
});
