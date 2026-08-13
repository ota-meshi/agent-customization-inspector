// T184: browser regression for the unified skill inventory (Phase 12
// "Unified Skill Inventory"). Launches the packaged CLI against the all-tool
// fixture and verifies what only a rendered page can prove: the one
// skill-first list carrying every vendor's recognitions, the filters
// narrowing that one population, keyboard operation of the filter controls,
// and no authored content or fixture secret reaching the inventory surface —
// no detail having been requested, which is the only way authored content
// reaches the client (FR-027).
//
// The admitted sets, recognition matrix, and collision statements are proven
// closer to the code (tests/integration/repository-scan.test.ts,
// tests/unit/app/inventory.test.ts); this suite asserts them only as far as a
// user can see them.
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  FIXTURE_SECRET_LITERAL,
  buildAllToolSkillFixture,
  type AllToolSkillFixture,
} from '../fixtures/repositories/build-fixtures';
import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: AllToolSkillFixture;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = buildAllToolSkillFixture('aci-unified-skills');
  host = await launchHost(fixture.root);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** The skill rows inside the kind tab's panel, apart from the unclassified list. */
function skillRows(page: import('@playwright/test').Page) {
  return page.locator('[role="tabpanel"] .aci-item');
}

/** How many rows the fixture's committed inventory has, symlink cases included. */
function expectedRowCount(): number {
  // alpha, dup, empty, orbit, packages/api:deploy, packages/api:dup,
  // secretive, voyage — plus the linked skill when the platform could
  // materialize symbolic links.
  return fixture.capabilities.symlinks ? 9 : 8;
}

test('lists one unified skill inventory with each file’s recognition badges', async ({ page }) => {
  await page.goto(host.origin);
  await expect(skillRows(page)).toHaveCount(expectedRowCount());

  // Multi-recognition, read off the badges a definition renders: the shared
  // spellings carry both products, `.github` and the nested `.claude` layer
  // exactly one.
  const definitionOf = (path: string) =>
    page.locator('.aci-skill-row__definitions > li', { hasText: path });
  const expectTools = async (path: string, tools: readonly string[]) => {
    await expect(definitionOf(path).locator('.aci-skill-row__badges > li')).toHaveText([...tools]);
  };
  await expectTools('.agents/skills/orbit/SKILL.md', ['GitHub Copilot', 'OpenAI Codex']);
  await expectTools('.claude/skills/lander/SKILL.md', ['GitHub Copilot', 'Claude Code']);
  await expectTools('.github/skills/ship/SKILL.md', ['GitHub Copilot']);
  await expectTools('packages/api/.claude/skills/deploy/SKILL.md', ['Claude Code']);

  // The one kind so far renders as the selected tab of the unified list.
  await expect(page.getByRole('tab', { name: /skill/iu })).toHaveAttribute('aria-selected', 'true');
});

test('narrows the one population with the source, tool, and path filters', async ({ page }) => {
  await page.goto(host.origin);
  await expect(skillRows(page)).toHaveCount(expectedRowCount());

  // Tool: Codex keeps exactly the readable root `.agents` rows.
  await page.getByLabel('Tool').selectOption('codex');
  await expect(skillRows(page).locator('.aci-skill-row__name')).toHaveText([
    'alpha',
    'empty',
    'orbit',
    'secretive',
  ]);

  // Path composes with the tool filter over the same population.
  await page.getByLabel('Path contains').fill('alpha-a');
  await expect(skillRows(page)).toHaveCount(1);
  await expect(skillRows(page).first()).toContainText('.agents/skills/alpha-a/SKILL.md');

  // Source: the one Repository Source is offered and keeps the same rows.
  await page.getByLabel('Source', { exact: true }).selectOption({ label: 'Repository' });
  await expect(skillRows(page)).toHaveCount(1);

  // The summary states the narrowed count for the kind in view. The page has
  // a second live region — the session-status announcer — so the summary is
  // addressed by its own text.
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
    'Showing 1 of',
  );
});

test('operates the filters and their clear control from the keyboard', async ({ page }) => {
  await page.goto(host.origin);
  await expect(skillRows(page)).toHaveCount(expectedRowCount());

  // Reach the path filter in the page's real Tab order — arriving there is
  // part of the claim — then type the query with the keyboard alone.
  expect(await tabUntilFocused(page, page.getByLabel('Path contains'))).toBe(true);
  await page.keyboard.type('.github/');
  await expect(skillRows(page)).toHaveCount(1);
  await expect(skillRows(page).first()).toContainText('voyage');

  // "Clear filters" enters the Tab order with its job, one stop past the
  // filter it clears; activating it moves focus to the result summary,
  // because the button removes itself and focus left on a removed element
  // would fall to the document body (WCAG 2.4.3).
  expect(await tabUntilFocused(page, page.getByRole('button', { name: 'Clear filters' }))).toBe(
    true,
  );
  await page.keyboard.press('Enter');
  await expect(skillRows(page)).toHaveCount(expectedRowCount());
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toBeFocused();

  // A row's detail link is reachable in the Tab order — not merely
  // programmatically focusable — from the known position the clear control
  // just left focus on. A link demoted to `tabindex="-1"` would fail this
  // walk where a bare `.focus()` would still land on it.
  const firstLink = page.locator('[role="tabpanel"] .aci-item a').first();
  expect(await tabUntilFocused(page, firstLink)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/skills\//u);
});

test('exposes no authored content or fixture secret from the inventory surface', async ({
  page,
}) => {
  await page.goto(host.origin);
  await expect(skillRows(page)).toHaveCount(expectedRowCount());

  // The whole served document — not just the visible text — carries no
  // authored source, no frontmatter literal beyond the declared names, and
  // never the credential-shaped fixture value: authored content is reachable
  // only through an explicit detail request (FR-027).
  const html = await page.content();
  expect(html).not.toContain(FIXTURE_SECRET_LITERAL);
  expect(html).not.toContain('Shared orbit');
  expect(html).not.toContain('GitHub ship');
  expect(html).not.toContain('Claude lander');

  // The deterministic file-confined outcomes stay visible as source-free
  // facts: the NUL-carrying candidate is listed outside every kind with its
  // read outcome, named by path alone (FR-028).
  const unclassified = page.locator('h3', { hasText: 'Files in no kind' });
  await expect(unclassified).toBeVisible();
  const text = await page.locator('main').innerText();
  expect(text).toContain('.agents/skills/binary/SKILL.md');
  if (fixture.capabilities.symlinks) {
    expect(text).toContain('.agents/skills/broken/SKILL.md');
  }
});
