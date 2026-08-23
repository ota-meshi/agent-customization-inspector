// T648: browser acceptance for the unified settings-and-configuration
// inventory (Phase 63). Launches the packaged CLI against a tree holding all
// three products' settings documents — including two physical files two
// products recognize — and verifies one row per file with its recognitions,
// the filters, the exclusions' absence, the preserved Codex carrier facts, and
// keyboard operation of the whole surface.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { tabUntilFocused } from './keyboard';

test.describe('the unified settings and configuration inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-settings-unified-'));
    await mkdir(join(fixture, '.github/copilot'), { recursive: true });
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(
      join(fixture, '.github/copilot/settings.json'),
      '{ "enabledPlugins": {} }\n',
      'utf8',
    );
    // Shared physical files: Claude Code's own settings documents, which the
    // Copilot CLI also reads for the shared cross-tool subset.
    await writeFile(
      join(fixture, '.claude/settings.json'),
      '{ "permissions": { "allow": ["Bash(git status)"] } }\n',
      'utf8',
    );
    await writeFile(join(fixture, '.claude/settings.local.json'), '{ "model": "opus" }\n', 'utf8');
    // The Codex layer, which is the settings family's only MCP-row source.
    await writeFile(
      join(fixture, '.codex/config.toml'),
      ['model = "gpt-5.4-codex"', '', '[mcp_servers.codex-db]', 'command = "npx"', ''].join('\n'),
      'utf8',
    );
    // A documented exclusion, present so its absence is checkable.
    await writeFile(join(fixture, '.vscode/settings.json'), '{ "editor.tabSize": 2 }\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists every product’s settings documents as one row per file', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(4);
    await expect(items.locator('.aci-path')).toHaveText([
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.codex/config.toml',
      '.github/copilot/settings.json',
    ]);
    // A shared physical file is one row naming both products that recognize
    // it, in the closed tool order.
    const shared = items.filter({ hasText: '.claude/settings.local.json' }).first();
    await expect(shared.locator('.aci-settings-row__tool')).toHaveCount(2);
    await expect(shared.locator('.aci-settings-row__owner')).toContainText('GitHub Copilot');
    await expect(shared.locator('.aci-settings-row__owner')).toContainText('Claude Code');
    // The documented exclusion is on no row of any kind.
    expect(await page.locator('main').innerText()).not.toContain('.vscode/settings.json');
  });

  test('keeps the Codex carrier’s own MCP rows beside its settings row', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^MCP/u }).click();
    const mcpItems = page.getByRole('tabpanel').locator('.aci-item');
    await expect(mcpItems).toHaveCount(1);
    await expect(mcpItems.first()).toContainText('codex-db');
    await expect(mcpItems.first()).toContainText('.codex/config.toml');
    // No settings file of any other product contributes an MCP row.
    expect(await page.getByRole('tabpanel').innerText()).not.toContain('settings.json');
  });

  test('keeps the permission-policy row of a shared document its own', async ({ page }) => {
    // `.claude/settings.json` declares a policy, so it is a permissions row as
    // well: which row a reader arrives through decides what its detail shows.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.claude/settings.json']);
  });

  test('operates the kind tabs and the filters from the keyboard alone', async ({ page }) => {
    await page.goto(host.origin);
    // The reachability claim walks the real Tab order rather than calling
    // `.focus()`, which would pass for a control a keyboard user cannot reach
    // (contracts/accessibility-acceptance.md § 2.1.1).
    expect(await tabUntilFocused(page, page.getByRole('tab', { selected: true }))).toBe(true);
    // Arrow keys step the tab strip, and Enter or Space selects; the WAI-ARIA
    // tabs pattern this app shares (QR-004).
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Settings \/ Config/u })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { selected: true })).toContainText('Settings / Config');
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(4);
  });
});
