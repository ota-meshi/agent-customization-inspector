// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// context-file inventory. Launches the packaged CLI against a tree holding
// `GEMINI.md` at the root and below it, opens the printed loopback URL, and
// verifies the rendered rows — one per applicability range, the root file
// carrying Copilot's mark beside Gemini CLI's — the filters, and the near
// misses' absence, an extension manifest and a nested settings carrier among
// them (spec.md FR-002, FR-004, FR-005, FR-013, FR-016).
//
// The exact admitted set, provenance, and read order are proven closer to the
// code (tests/unit/inspection, tests/integration); what is asserted here is
// what a user can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'AIzaE2EGEMINIINSTRUCTIONS0000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_ENDPOINT}';

test.describe('context files at the root and below it', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-instructions-'));
    await writeFile(
      join(fixture, 'GEMINI.md'),
      `# Project context\n\n@./docs/style.md\n\ntoken: ${FIXTURE_SECRET}\nendpoint: ${ENVIRONMENT_REFERENCE}\n`,
      'utf8',
    );
    // The vendor loads a nested context file as it works below its directory,
    // so each is a row of its own range (FR-005).
    await mkdir(join(fixture, 'packages/api'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/GEMINI.md'), '# API context\n', 'utf8');
    // Near misses: the import target, an extension manifest at the root, the
    // vendor's ignore file, a spelling variant, and a nested settings carrier
    // whose declared name reaches nothing because only the root carrier is
    // configuration (FR-004, FR-016).
    await mkdir(join(fixture, 'docs'), { recursive: true });
    await writeFile(join(fixture, 'docs/style.md'), '# style\n', 'utf8');
    await writeFile(join(fixture, 'gemini-extension.json'), '{ "name": "repo-tools" }\n', 'utf8');
    await writeFile(join(fixture, '.geminiignore'), 'dist/\n', 'utf8');
    await writeFile(join(fixture, 'GEMINI.md.bak'), 'backup\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.gemini'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.gemini/settings.json'),
      '{ "context": { "fileName": "CONTEXT.md" } }\n',
      'utf8',
    );
    await writeFile(join(fixture, 'CONTEXT.md'), '# named only by the nested carrier\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per range, the root file under two products', async ({ page }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order, so the tab is
    // selected on arrival.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['**', 'packages/api/**']);
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['GEMINI.md', 'packages/api/GEMINI.md']);

    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    // The root file is Copilot's root alternative and Gemini CLI's default
    // context file at once: one file, two marks (FR-013). The nested one is
    // Gemini CLI's alone, because Copilot documents the root alternative only.
    const rootEntry = fileEntries.filter({ has: page.getByText('GEMINI.md', { exact: true }) });
    await expect(rootEntry).toContainText('Gemini CLI');
    await expect(rootEntry).toContainText('GitHub Copilot');
    const nestedEntry = fileEntries.filter({
      has: page.getByText('packages/api/GEMINI.md', { exact: true }),
    });
    await expect(nestedEntry).toContainText('Gemini CLI');
    await expect(nestedEntry).not.toContainText('GitHub Copilot');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 2 of 2',
    );
  });

  test('shows no near-miss path and no authored source text', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    // The inventory carries no `sourceText`, so a credential or an
    // environment reference in an authored context file cannot appear in a
    // list the user never opted into reading (FR-027), and nothing resolves
    // the reference against any environment (FR-026).
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('# Project context');
    // The near misses appear nowhere: the nested carrier configures nothing,
    // so the file it names stays unlisted, and the extension manifest is
    // declined whole (FR-004, FR-016).
    for (const nearMiss of [
      'docs/style.md',
      'gemini-extension.json',
      '.geminiignore',
      'GEMINI.md.bak',
      'packages/api/.gemini/settings.json',
      'CONTEXT.md',
    ]) {
      expect(text, nearMiss).not.toContain(nearMiss);
    }
    // The list that belongs to no kind is not where they went either: a path
    // no selector reaches is never a candidate at all.
    await expect(page.getByRole('tab', { name: /^Files in no kind/u })).toContainText('0');
  });

  test('narrows the rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');

    // Tool: Gemini CLI keeps both files; Copilot keeps the root one alone.
    await page.getByLabel('Tool').selectOption('gemini');
    await expect(items).toHaveCount(2);
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(1);
    await expect(fileEntries).toHaveCount(1);
    await expect(items.first()).toContainText('GEMINI.md');

    // Path composes over the same population.
    await page.getByLabel('Tool').selectOption({ label: 'All tools' });
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('packages/api');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('packages/api/GEMINI.md');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 2',
    );

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});
