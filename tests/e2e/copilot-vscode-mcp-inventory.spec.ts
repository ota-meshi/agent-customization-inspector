// T357: browser acceptance for the Copilot VS Code MCP file inventory
// (Phase 30). Launches the packaged CLI against a fixture holding the
// dedicated JSONC `.vscode/mcp.json` carrier and the shared root `.mcp.json`,
// and verifies the rendered records: the `.vscode` rows stated as VS Code's,
// the root carrier's one Copilot recognition naming both surfaces beside
// Claude's, the duplicate name grouped without an order, the filters, the
// excluded locations' absence, the failed-carrier diagnostic, and no
// connection control.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection, tests/integration/repository-scan);
// what is asserted here is what a user can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EVSCODEMCP0000000000000000000000000000';

test.describe('the Copilot VS Code workspace MCP inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-vscode-mcp-'));
    // The dedicated carrier in the guide's documented schema: a top-level
    // `servers` map in the editor's JSONC configuration format — comments
    // and a trailing comma are the format's own syntax — with the `inputs`
    // section beside it that declares no server.
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(
      join(fixture, '.vscode/mcp.json'),
      `{
  // Workspace MCP servers, shared through source control.
  "servers": {
    "vs-docs": { "type": "http", "url": "https://docs.example.com/mcp" },
    "shared-tavily": { "command": "vscode-owned", "env": { "KEY": "${FIXTURE_SECRET}" } },
  },
  "inputs": [{ "id": "api-key" }]
}
`,
      'utf8',
    );
    // The shared root carrier: the CLI reading's declarations, with the
    // VS Code 1.118+ path/surface provenance beside the CLI admission and
    // Claude's own recognition of the same physical file.
    await writeFile(
      join(fixture, '.mcp.json'),
      '{ "mcpServers": { "shared-tavily": { "command": "npx" } } }\n',
      'utf8',
    );
    // Excluded locations, written so their absence is observable: a nested
    // workspace, the general settings file, and the user-profile filename.
    await mkdir(join(fixture, 'packages/api/.vscode'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.vscode/mcp.json'),
      '{ "servers": { "nested-only": {} } }\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.vscode/settings.json'),
      '{ "mcp": { "servers": { "settings-server": {} } } }\n',
      'utf8',
    );
    await writeFile(join(fixture, 'mcp.json'), '{ "servers": { "profile-server": {} } }\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists both carriers with each surface stated where it recognizes', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Name order: the duplicate declared by both carriers, then the
    // `.vscode` carrier's own name.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['shared-tavily', 'vs-docs']);
    // The duplicate name lists both carriers — one line per physical file —
    // without ordering them: the shared root names both Copilot surfaces
    // beside Claude, and the `.vscode` carrier names VS Code alone.
    const shared = items.nth(0);
    await expect(shared.locator('.aci-row-file')).toHaveCount(2);
    await expect(shared.locator('.aci-row-file').first()).toContainText('.mcp.json');
    await expect(shared.locator('.aci-row-file').first()).toContainText('GitHub Copilot');
    await expect(shared.locator('.aci-row-file').first()).toContainText('VS Code');
    await expect(shared.locator('.aci-row-file').first()).toContainText('CLI');
    await expect(shared.locator('.aci-row-file').first()).toContainText('Claude Code');
    await expect(shared.locator('.aci-row-file').nth(1)).toContainText('.vscode/mcp.json');
    await expect(shared.locator('.aci-row-file').nth(1)).toContainText('VS Code');
    await expect(items.nth(1)).toContainText('.vscode/mcp.json');
    await expect(items.nth(1)).toContainText('GitHub Copilot');
    // No declared value reaches the inventory (FR-027), the excluded
    // locations appear nowhere, and no control offers to connect, start, or
    // test a declared server.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('nested-only');
    expect(text).not.toContain('settings-server');
    expect(text).not.toContain('profile-server');
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('narrows the records with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);

    // Tool: the Copilot selection keeps every record, while the Claude
    // selection keeps only the shared root's name.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(2);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['shared-tavily']);
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // Path: the filter applies to the carriers the declarations live in.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.vscode');
    await expect(items).toHaveCount(2);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('no-such-carrier');
    await expect(items).toHaveCount(0);
    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});

test.describe('a VS Code carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-vscode-mcp-malformed-'));
    // A `.vscode/mcp.json` even JSONC cannot parse: the carrier's MCP
    // recognition fails all-or-nothing (FR-028), and the rows are unknown
    // rather than absent.
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(join(fixture, '.vscode/mcp.json'), '{ "servers": { broken\n', 'utf8');
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('states the failure on the carrier group with its diagnostic', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('.vscode/mcp.json');
    await expect(items.first()).toContainText('GitHub Copilot');
    await expect(items.first()).toContainText('The declarations in this file could not be read.');
    await expect(items.first()).toContainText('This file could not be parsed');
    await expect(items.first()).not.toContainText('declares no MCP servers');
  });
});
