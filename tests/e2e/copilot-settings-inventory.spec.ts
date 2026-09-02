// T626: browser acceptance for the Copilot settings inventory (Phase 61).
// Launches the packaged CLI against a fixture holding the four supported
// Copilot settings documents — two GitHub Copilot files and the two
// Claude-format ones the CLI reads for the shared cross-tool subset — and
// verifies the rendered rows, the shared-file recognitions, the two documented
// exclusions' absence, the filters, and the retained Codex and Claude rows.
//
// The exact admitted set and recognition shape are proven closer to the code
// (tests/unit/inspection); what is asserted here is what a user can see.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTSETTINGS0000000000000000000000';

test.describe('the supported Copilot settings documents', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-settings-'));
    await mkdir(join(fixture, '.github/copilot'), { recursive: true });
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(
      join(fixture, '.github/copilot/settings.json'),
      `${JSON.stringify({ enabledPlugins: { 'formatter@tools': true } }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.github/copilot/settings.local.json'),
      `${JSON.stringify({ token: FIXTURE_SECRET }, null, 2)}\n`,
      'utf8',
    );
    // The two cross-tool documents: one physical file each, recognized by both
    // Claude Code and the Copilot CLI.
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify({ model: 'opus' }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify({ disableAllHooks: true }, null, 2)}\n`,
      'utf8',
    );
    // The two documented exclusions: present on disk so their absence from
    // every row is a decision this page can be checked against.
    await writeFile(
      join(fixture, '.vscode/settings.json'),
      `${JSON.stringify({ 'editor.tabSize': 2 }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(join(fixture, '.github/lsp.json'), '{ "servers": {} }\n', 'utf8');
    // A Codex configuration layer beside them, so the page shows the whole
    // settings family at once.
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(join(fixture, '.codex/config.toml'), 'model = "gpt-5.4-codex"\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per document, with the products that recognize each', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Five rows for five physical files, in Source-relative Path order: a
    // shared document is one row naming two products, never two rows.
    await expect(items).toHaveCount(5);
    await expect(items.locator('.aci-path')).toHaveText([
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.codex/config.toml',
      '.github/copilot/settings.json',
      '.github/copilot/settings.local.json',
    ]);
    const shared = items.filter({ hasText: '.claude/settings.json' }).first();
    await expect(shared.locator('.aci-row-file')).toContainText('GitHub Copilot');
    await expect(shared.locator('.aci-row-file')).toContainText('Claude Code');
    await expect(
      items.filter({ hasText: '.github/copilot/settings.local.json' }).locator('.aci-row-file'),
    ).toContainText('GitHub Copilot');

    // The two documented exclusions appear nowhere, and no declared value
    // reaches the inventory.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('.vscode/settings.json');
    expect(text).not.toContain('.github/lsp.json');
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('enabledPlugins');
  });

  test('shows no MCP row for any settings document', async ({ page }) => {
    // Every settings file is a permanent MCP non-owner; the Codex layer here
    // declares no server either, so the kind has no rows at all.
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { name: /^MCP/u })).toHaveCount(0);
  });

  test('narrows the settings rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(5);

    // A tool filter narrows a shared row to the recognitions that match, and
    // drops a row only when none is left.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(4);
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.codex/config.toml']);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.github/copilot');
    await expect(items).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(5);
  });
});
