// T272: browser acceptance for the unified instructions inventory
// (Phase 21). Launches the packaged CLI against the all-vendor instruction
// fixture and verifies the rendered shared-file matrix — `AGENTS.md`
// Codex+Copilot, root `CLAUDE.md` Claude+Copilot, nested `CLAUDE.md`
// Claude-only, `CLAUDE.local.md` Claude-only — with the configured fallback
// rows Phase 15 activated, the filters, the exclusions' absence, the
// deterministic per-file diagnostics, and keyboard operability.
//
// The exact admitted sets, provenance, and read order are proven closer to
// the code (tests/integration/repository-scan.test.ts, T270); what is
// asserted here is what a user can see of them.
import { rm } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import {
  FIXTURE_ENVIRONMENT_REFERENCE,
  FIXTURE_SECRET_LITERAL,
  buildAllVendorInstructionFixture,
  type AllVendorInstructionFixture,
} from '../fixtures/repositories/build-fixtures';
import { tabUntilFocused } from './keyboard';
import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { openNoKindDisclosure } from './no-kind-disclosure';

let fixture: AllVendorInstructionFixture;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = buildAllVendorInstructionFixture('aci-unified-instructions');
  host = await launchHost(fixture.root);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture.root, { recursive: true, force: true });
});

/** The instruction rows inside the kind tab's panel. */
function instructionRows(page: import('@playwright/test').Page) {
  return page.getByRole('tabpanel').locator('.aci-item');
}

/** The file entries across every rendered range row, in document order. */
function fileEntries(page: import('@playwright/test').Page) {
  return page.getByRole('tabpanel').locator('.aci-source-family-blocks__members > li');
}

test('lists every range with each file’s recognizing products', async ({ page }) => {
  await page.goto(host.origin);
  // Instructions sort first in the closed kind order, so the tab is selected
  // on arrival. One row per applicability range, the no-range row closing the
  // list (data-model.md § Inventory unit).
  await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
  await expect(instructionRows(page)).toHaveCount(5);
  await expect(instructionRows(page).locator('.aci-instruction-row__range')).toHaveText([
    '**',
    'docs/**',
    'packages/api/**',
    'src/frontend/**',
    'No known applicability range',
  ]);

  // Every file under its range in Source-relative Path order — the static
  // pairs, the shared spellings, and the two configured fallbacks beside
  // them. The binary candidate is recognized by nothing and listed here by
  // nothing (FR-025).
  const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
  expect(paths).toEqual([
    '.claude/CLAUDE.md',
    '.github/copilot-instructions.md',
    'AGENTS.md',
    'AGENTS.override.md',
    'CLAUDE.local.md',
    'CLAUDE.md',
    'GEMINI.md',
    'GUIDE.codex.md',
    'TEAM_GUIDE.md',
    'docs/AGENTS.md',
    'docs/CLAUDE.md',
    'packages/api/.claude/CLAUDE.md',
    'packages/api/.github/copilot-instructions.md',
    'packages/api/AGENTS.md',
    'packages/api/CLAUDE.md',
    '.github/instructions/frontend.instructions.md',
    '.github/instructions/nested/backend.instructions.md',
    'packages/api/.github/instructions/api.instructions.md',
  ]);

  // The shared-file matrix, as the products listed beside each path: the
  // root `AGENTS.md` is Codex's and Copilot's, the root `CLAUDE.md` Claude's
  // and Copilot's, and the spellings beside them stay single-product —
  // which is what makes each shared row a statement about the file.
  const entryFor = (path: string) =>
    fileEntries(page).filter({ has: page.getByText(path, { exact: true }) });
  await expect(entryFor('AGENTS.md')).toContainText('OpenAI Codex');
  await expect(entryFor('AGENTS.md')).toContainText('GitHub Copilot');
  await expect(entryFor('AGENTS.override.md')).toContainText('OpenAI Codex');
  await expect(entryFor('AGENTS.override.md')).not.toContainText('GitHub Copilot');
  await expect(entryFor('CLAUDE.md')).toContainText('Claude Code');
  await expect(entryFor('CLAUDE.md')).toContainText('GitHub Copilot');
  await expect(entryFor('CLAUDE.local.md')).toContainText('Claude Code');
  await expect(entryFor('CLAUDE.local.md')).not.toContainText('GitHub Copilot');
  // The configured fallbacks are ordinary Codex rows: activated by the
  // repository's own carrier, distinguished by nothing, pending nothing.
  await expect(entryFor('TEAM_GUIDE.md')).toContainText('OpenAI Codex');
  await expect(entryFor('GUIDE.codex.md')).toContainText('OpenAI Codex');
  // The nested `CLAUDE.md` is Claude's alone: a configured fallback is an
  // entry name matched at the Repository root, and no filename inference
  // promotes a nested file (Phase 21).
  await expect(entryFor('packages/api/CLAUDE.md')).toContainText('Claude Code');
  await expect(entryFor('packages/api/CLAUDE.md')).not.toContainText('OpenAI Codex');

  // What no rule admits is simply absent — the excluded Copilot locations,
  // the nested fallback variant, the absent declared name, and the carrier.
  const text = await page.locator('main').innerText();
  expect(text).not.toContain(fixture.nestedFallbackVariantPath);
  expect(text).not.toContain(fixture.absentFallbackBasename);
  expect(text).not.toContain('config.toml');
  expect(text).not.toContain('.claude/rules/style.md');
  expect(text).not.toContain('.copilot/instructions/personal.instructions.md');
  expect(text).not.toContain('custom-instructions/team.instructions.md');
  expect(text).not.toContain('packages/api/GEMINI.md');
});

test('names no Source and offers no Source filter with one Source carried', async ({ page }) => {
  // The ordinary session: nothing outside the selected repository is inspected
  // until a reader confirms it (FR-013), so every row is the repository's and
  // saying so on each of them would repeat the page's only answer. The filter
  // goes with it — one family is a question with one answer.
  await page.goto(host.origin);
  await expect(page.locator('.aci-family-heading')).toHaveCount(0);
  await expect(page.locator('label[for="aci-inventory-filters-source"]')).toHaveCount(0);
  // And the comparison link announces the range alone, because no second link
  // under that range needs telling from it (WCAG 2.4.6).
  await expect(
    instructionRows(page)
      .first()
      .getByRole('link', { name: /^Compare this range's files/u }),
  ).toHaveAttribute('aria-label', "Compare this range's files: **");
});

test('reports the deterministic failures on the files they happened to', async ({ page }) => {
  await page.goto(host.origin);
  await expect(instructionRows(page)).toHaveCount(5);
  // The malformed frontmatter is confined to its file: the row keeps its
  // place under `docs/**` with its own diagnostic, and no other file carries
  // one (FR-028).
  await expect(fileEntries(page).filter({ hasText: 'docs/CLAUDE.md' })).toContainText(
    'This file could not be parsed',
  );
  await expect(fileEntries(page).filter({ hasText: 'AGENTS.md' }).first()).not.toContainText(
    'This file could not be parsed',
  );
  // The binary candidate is in no kind's inventory; its own row under
  // "Files in no kind" states its path and read outcome, which is how the
  // `partial` generation names its other cause on this page.
  await expect(page.getByRole('heading', { name: 'Files in no kind' })).toBeVisible();
  const unclassified = (await openNoKindDisclosure(page))
    .locator('.aci-item')
    .filter({ hasText: fixture.diagnosticOnlyPaths[0]! })
    .first();
  await expect(unclassified).toContainText('Binary — recorded without source text');
});

test('narrows the matrix with the tool and path filters, keyboard-operably', async ({ page }) => {
  await page.goto(host.origin);
  await expect(instructionRows(page)).toHaveCount(5);

  // Tool: OpenAI Codex keeps the root range alone — the static pair and the
  // two configured fallbacks — because every Codex candidate sits at the
  // Repository root.
  await page.getByLabel('Tool').selectOption('codex');
  await expect(instructionRows(page)).toHaveCount(1);
  await expect(fileEntries(page)).toHaveCount(4);
  await expect(fileEntries(page).filter({ hasText: 'TEAM_GUIDE.md' })).toBeVisible();

  // Claude Code keeps its files at every depth while the shared root files
  // drop their Copilot half rather than their row.
  await page.getByLabel('Tool').selectOption('claude');
  await expect(instructionRows(page)).toHaveCount(3);
  await expect(fileEntries(page)).toHaveCount(6);

  // Reach the path filter in the page's real Tab order — arriving there is
  // part of the claim — then type the query with the keyboard alone. The
  // path composes over the tool selection.
  expect(await tabUntilFocused(page, page.getByLabel('Path contains'))).toBe(true);
  await page.keyboard.type('packages/api/');
  await expect(instructionRows(page)).toHaveCount(1);
  await expect(fileEntries(page)).toHaveCount(2);
  // The summary counts against everything the generation committed, not
  // against the tool-narrowed population.
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
    'Showing 1 of 5',
  );

  // "Clear filters" enters the Tab order with its job; activating it moves
  // focus to the result summary, because the button removes itself and focus
  // left on a removed element would fall to the document body (WCAG 2.4.3).
  expect(await tabUntilFocused(page, page.getByRole('button', { name: 'Clear filters' }))).toBe(
    true,
  );
  await page.keyboard.press('Enter');
  await expect(instructionRows(page)).toHaveCount(5);
  await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toBeFocused();

  // A row's detail link is reachable in the Tab order from the position the
  // clear control just left focus on — not merely programmatically
  // focusable.
  const firstLink = page.getByRole('tabpanel').locator('.aci-item a').first();
  expect(await tabUntilFocused(page, firstLink)).toBe(true);
});

test('shows no authored source text', async ({ page }) => {
  await page.goto(host.origin);
  await expect(instructionRows(page)).toHaveCount(5);
  const text = await page.locator('main').innerText();
  // The inventory carries no `sourceText`, so a credential or an environment
  // reference in an authored instruction file cannot appear in a list the
  // user never opted into reading (FR-027) — and nothing ever resolves the
  // reference against any environment.
  expect(text).not.toContain(FIXTURE_SECRET_LITERAL);
  expect(text).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
  expect(text).not.toContain('# Shared agent instructions');
  expect(text).not.toContain('# Root Claude instructions');
  expect(text).not.toContain('# configured fallback');
  // The one declared value a row may carry is its own identity — the
  // `applyTo` range — published as the resolved pattern, never as the key
  // that declared it (FR-027).
  expect(text).toContain('src/frontend/**');
  expect(text).not.toContain('applyTo');
});
