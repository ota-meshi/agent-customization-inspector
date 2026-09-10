// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// settings detail. Opens the root `.gemini/settings.json` from the settings
// tab and verifies the complete literal detail: the document's whole authored
// source with its comments and trailing comma, a credential shown exactly as
// authored with no masking or reveal control, a literal environment reference
// never replaced by the process value a same-named variable carries, the MCP
// declaration detail of the same file, and the dead-link state for a path
// this scan holds no settings row at (FR-007, FR-025 through FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { sourceBoxDecorations } from './source-viewer';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EGEMINISETTINGSDETAIL000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_SETTINGS_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** The complete authored text of the settings document the cases open. */
const SETTINGS_DOCUMENT = [
  '{',
  '  // Project settings; personal overrides live in ~/.gemini/settings.json.',
  '  "ui": { "theme": "GitHub" },',
  '  "mcpServers": {',
  '    "github": {',
  '      "command": "npx",',
  '      "args": ["-y", "@modelcontextprotocol/server-github"],',
  `      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${FIXTURE_SECRET}" },`,
  '    },',
  `    "docs": { "httpUrl": "${ENVIRONMENT_REFERENCE}/mcp" },`,
  '  },',
  '  "hooks": {',
  '    "AfterTool": [{ "hooks": [{ "type": "command", "command": "pnpm run format" }] }],',
  '  },',
  '}',
  '',
].join('\n');

test.describe('the complete literal Gemini CLI settings detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-settings-detail-'));
    await mkdir(join(fixture, '.gemini'), { recursive: true });
    await writeFile(join(fixture, '.gemini/settings.json'), SETTINGS_DOCUMENT, 'utf8');
    process.env['GEMINI_E2E_SETTINGS_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['GEMINI_E2E_SETTINGS_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the document from its row and shows its whole authored source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.gemini/settings.json' })
      .getByRole('link', { name: '.gemini/settings.json' })
      .click();
    await expect(page).toHaveURL(
      /\/settings-and-configuration\/detail\/repository\/\.gemini\/settings\.json$/u,
    );
    await expect(page.getByRole('heading', { name: '.gemini/settings.json' })).toBeVisible();

    const main = page.locator('main');
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('Gemini CLI');
    await expect(main).toContainText('Readable text');

    // The complete authored document: the comment and the trailing commas a
    // parser's resolution would drop, and the declared values with the
    // credential whole and the reference as the exact characters written
    // (FR-025, FR-026).
    await expect(page.locator('.aci-source-viewer').first()).toBeVisible();
    await expect(main).toContainText('// Project settings; personal overrides live in');
    await expect(main).toContainText('"theme": "GitHub"');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /apply|enable|trust|activate|run|connect/iu }),
    ).toHaveCount(0);
    // Tokenizing is all the colouring is: the box holds the text and its
    // coloured runs and nothing that marks the document invalid (FR-033).
    await expect(sourceBoxDecorations(page)).toHaveCount(0);
  });

  test('opens a declared server as its own MCP detail, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^MCP/u }).click();
    await page.getByRole('link', { name: 'github in .gemini/settings.json' }).click();
    await expect(page).toHaveURL(/\/mcp\/detail\/repository\/.*\?server=github/u);
    await expect(page.getByRole('heading', { name: 'github' })).toBeVisible();
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('Gemini CLI');
    await expect(main).toContainText('Declared in');
    // This declaration's fields alone, by the keys the carrier wrote; the
    // sibling declaration's are not here, and no raw source shows (FR-007).
    await expect(main).toContainText('@modelcontextprotocol/server-github');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('// Project settings');
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('opens a contained hook declaration as authored, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'AfterTool' })
      .getByRole('link', { name: /\.gemini\/settings\.json/u })
      .click();
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      'AfterTool',
    );
    // A Gemini CLI hook is declared inside its settings document, which the
    // caption states; the declaration shows as written, and the servers of
    // the same file are that file's other rows (FR-007).
    await expect(page.locator('.aci-detail-attributes')).toContainText('Gemini CLI');
    await expect(page.locator('.aci-detail-attributes')).toContainText(
      'declared inside another file',
    );
    await expect(page.locator('.aci-source-viewer')).toContainText('pnpm run format');
    await expect(page.locator('body')).not.toContainText(FIXTURE_SECRET);
    for (const forbidden of [/mask/iu, /reveal/iu, /^Run/u, /resolve/iu]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });

  test('returns to the settings tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.gemini/settings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.gemini/settings.json' })).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=settings(%2F|\/)config$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Settings / Config');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.gemini/settings.local.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.aci-source-viewer')).toHaveCount(0);
  });
});

test.describe('a settings document the format cannot parse', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-settings-broken-'));
    await mkdir(join(fixture, '.gemini'), { recursive: true });
    await writeFile(join(fixture, '.gemini/settings.json'), '{ "mcpServers": { \n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('still shows the document, because nothing is read out of it', async ({ page }) => {
    // The MCP and hook rows of the same file are the ones that report the
    // failure; this row reads nothing out, so its detail is the bytes their
    // author wrote whether or not a parser accepts them (FR-028).
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.gemini/settings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.gemini/settings.json' })).toBeVisible();
    await expect(page.locator('main')).toContainText('"mcpServers"');
    await expect(page.locator('main')).not.toContainText('could not be read');

    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^MCP/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-row-diagnostics__badge')).toHaveCount(1);
  });
});
