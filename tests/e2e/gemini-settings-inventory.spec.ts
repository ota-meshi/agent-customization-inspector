// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// settings inventory. Launches the packaged CLI against a tree whose root
// `.gemini/settings.json` is the project layer, opens the printed loopback
// URL, and verifies the rendered rows — the one settings row named by its
// path, the MCP rows the same document declares, and the hook rows it
// contains — beside the filters and the near misses' absence (spec.md FR-002,
// FR-009).
//
// The exact admitted set, the JSONC reading, and the read order are proven
// closer to the code (tests/unit/inspection, tests/integration); what is
// asserted here is what a user can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EGEMINISETTINGS00000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_SETTINGS_ENDPOINT}';

test.describe('the Gemini CLI settings document at the root', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-settings-'));
    await mkdir(join(fixture, '.gemini/hooks'), { recursive: true });
    // JSON with comments and a trailing comma, as the vendor's own loader
    // reads it: one document, three subjects — the settings, the servers, and
    // the hooks. The credential and the reference are authored text; neither
    // may reach a row, and nothing resolves the reference (FR-026, FR-027).
    await writeFile(
      join(fixture, '.gemini/settings.json'),
      [
        '{',
        '  // Project settings.',
        '  "ui": { "theme": "GitHub" },',
        '  "mcpServers": {',
        `    "github": { "command": "npx", "env": { "GITHUB_TOKEN": "${FIXTURE_SECRET}" } },`,
        `    "docs": { "httpUrl": "${ENVIRONMENT_REFERENCE}/mcp", },`,
        '  },',
        '  "hooks": {',
        '    "BeforeTool": [{ "hooks": [{ "type": "command", "command": "./.gemini/hooks/guard.sh" }] }],',
        '  },',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    // Near misses: the named hook script, the nested layer, the environment
    // file, and the workspace policy tier the vendor documents as not loaded.
    await writeFile(join(fixture, '.gemini/hooks/guard.sh'), '#!/bin/sh\nexit 0\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.gemini'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.gemini/settings.json'), '{}\n', 'utf8');
    await writeFile(join(fixture, '.gemini/.env'), `GEMINI_API_KEY=${FIXTURE_SECRET}\n`, 'utf8');
    await mkdir(join(fixture, '.gemini/policies'), { recursive: true });
    await writeFile(join(fixture, '.gemini/policies/deny.toml'), '[[rule]]\n', 'utf8');
    // The unchanged instruction row beside the new rows.
    await writeFile(join(fixture, 'GEMINI.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one settings row named by its path, with its product', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.gemini/settings.json']);
    await expect(items.first().locator('.aci-row-file')).toContainText('Gemini CLI');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 1',
    );
    // Nothing the document declares reaches the inventory, and nothing
    // resolves the reference. The near misses appear nowhere, and no control
    // offers to apply, trust, or run anything (FR-019, FR-027).
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('"theme"');
    expect(text).not.toContain('guard.sh');
    expect(text).not.toContain('packages/api/.gemini/settings.json');
    expect(text).not.toContain('.gemini/.env');
    expect(text).not.toContain('policies/deny.toml');
    await expect(
      page.getByRole('button', { name: /apply|enable|trust|activate|run/iu }),
    ).toHaveCount(0);
  });

  test('publishes the MCP and hook rows of the same file beside the settings row', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // One physical file, three subjects: one MCP row per declared server
    // name, one hook row per declared event, and the document as the settings
    // row — each stating the same path.
    await page.getByRole('tab', { name: /^MCP/u }).click();
    const mcpItems = page.getByRole('tabpanel').locator('.aci-item');
    await expect(mcpItems).toHaveCount(2);
    await expect(mcpItems.locator('.aci-row-head__name')).toHaveText(['docs', 'github']);
    await expect(mcpItems.first()).toContainText('.gemini/settings.json');
    await expect(mcpItems.first()).toContainText('Gemini CLI');

    await page.getByRole('tab', { name: /^Hook/u }).click();
    const hookItems = page.getByRole('tabpanel').locator('.aci-item');
    await expect(hookItems).toHaveCount(1);
    await expect(hookItems.first()).toContainText('BeforeTool');
    await expect(hookItems.first()).toContainText('.gemini/settings.json');
    // A Gemini CLI hook is always declared inside its settings document, and
    // the row says so.
    await expect(hookItems.first()).toContainText('declared inside another file');

    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(1);
  });

  test('keeps the instruction row exactly as its own phase committed it', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['GEMINI.md']);
    expect(await page.getByRole('tabpanel').innerText()).not.toContain('settings.json');
  });

  test('narrows the settings row with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);

    // Tool: the control offers the products that recognize something in
    // this tree — the document is Gemini CLI's alone.
    await expect(page.getByLabel('Tool').locator('option')).toHaveText([
      'All tools',
      'GitHub Copilot',
      'Gemini CLI',
    ]);
    await page.getByLabel('Tool').selectOption('gemini');
    await expect(items).toHaveCount(1);
    // Copilot is offered for the root `GEMINI.md` it also reads, and
    // recognizes none of these files.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(0);
    await page.getByLabel('Tool').selectOption({ label: 'All tools' });

    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('settings.json');
    await expect(items).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('config.toml');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(1);
  });
});
