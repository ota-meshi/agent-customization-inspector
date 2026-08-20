// T337: browser acceptance for the Copilot CLI MCP file inventory (Phase 28).
// Launches the packaged CLI against a workspace-carrier fixture, opens the
// printed loopback URL, and verifies the rendered MCP records — one record
// per declared server name, each carrier drawn once with the recognizing
// products and the CLI-context surface stated beside it — the duplicate name
// across the two root-level spellings grouped without an order, the shared
// root carrier listing Claude and Copilot together, the filters, the
// exclusions' absence (subdirectory carriers among them), the failed-carrier
// diagnostic, and the absence of any connection control.
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
const FIXTURE_SECRET = 'ghp_E2ECOPILOTMCP000000000000000000000000000';

test.describe('the Copilot CLI workspace MCP inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-cli-mcp-'));
    // The shared root carrier: Claude's project file and a CLI workspace
    // file at once.
    await writeFile(
      join(fixture, '.mcp.json'),
      JSON.stringify(
        {
          mcpServers: {
            'shared-tavily': { command: 'npx', env: { API_KEY: FIXTURE_SECRET } },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    // The `.github` spelling of the CLI carrier re-declares the root file's
    // name — the same-name case whose runtime selection stays the strategy's
    // record — plus one name of its own. Written in the CLI's bare top-level
    // schema, the second documented form the reading accepts (T341).
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(
      join(fixture, '.github/mcp.json'),
      '{ "shared-tavily": { "command": "other" }, "gh-actions": { "command": "npx" } }\n',
      'utf8',
    );
    // Excluded locations, written so their absence is observable: a
    // subdirectory carrier is a runtime-chain member no product's rule reads
    // from the selected root's frame, the VS Code carrier's rule arrives
    // with its own phase, and the COPILOT_HOME filename is a home fact.
    await mkdir(join(fixture, 'packages/api'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.mcp.json'),
      '{ "mcpServers": { "nested-only": { "command": "x" } } }\n',
      'utf8',
    );
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    // The general settings file: a documented VS Code input the read
    // allowlist deliberately does not admit (the dedicated `.vscode/mcp.json`
    // carrier is its own rule's, proven in `copilot-vscode-mcp-inventory`).
    await writeFile(
      join(fixture, '.vscode/settings.json'),
      '{ "mcp": { "servers": { "vscode-server": {} } } }\n',
      'utf8',
    );
    await writeFile(
      join(fixture, 'mcp-config.json'),
      '{ "mcpServers": { "user-server": { "command": "x" } } }\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists root-level records with each carrier stated once and its products beside it', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Name order: gh-actions, then the duplicate declared by both root-level
    // spellings.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['gh-actions', 'shared-tavily']);
    // The duplicate name lists both carriers — one line per physical file —
    // without ordering them: the shared root states Claude and the Copilot
    // CLI together, and the `.github` spelling states the CLI alone with its
    // surface beside it.
    const shared = items.nth(1);
    await expect(shared.locator('.aci-mcp-row__owner')).toHaveCount(2);
    await expect(shared.locator('.aci-mcp-row__owner').first()).toContainText('.github/mcp.json');
    await expect(shared.locator('.aci-mcp-row__owner').first()).toContainText('GitHub Copilot');
    await expect(shared.locator('.aci-mcp-row__owner').first()).toContainText('CLI');
    await expect(shared.locator('.aci-mcp-row__owner').nth(1)).toContainText('.mcp.json');
    await expect(shared.locator('.aci-mcp-row__owner').nth(1)).toContainText('GitHub Copilot');
    await expect(shared.locator('.aci-mcp-row__owner').nth(1)).toContainText('Claude Code');
    await expect(items.nth(0)).toContainText('.github/mcp.json');
    await expect(items.nth(0)).toContainText('GitHub Copilot');
    // No declared value reaches the inventory (FR-027), the excluded
    // locations appear nowhere, and no control offers to connect, start, or
    // test a declared server.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('nested-only');
    expect(text).not.toContain('vscode-server');
    expect(text).not.toContain('user-server');
    expect(text).not.toContain('mcp-config.json');
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('narrows the records with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);

    // Tool: the Copilot selection keeps every record — each has at least one
    // CLI declaration — while the Claude selection keeps only the shared
    // root's name, because Claude reads exactly the root project file.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(2);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['shared-tavily']);
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // Path: the filter applies to the carriers the declarations live in.
    await page.getByLabel('Path contains').fill('.github');
    await expect(items).toHaveCount(2);
    await page.getByLabel('Path contains').fill('no-such-carrier');
    await expect(items).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});

test.describe('a Copilot CLI carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-cli-mcp-malformed-'));
    // A `.github/mcp.json` strict JSON cannot parse: the CLI-only carrier's
    // MCP recognition fails all-or-nothing (FR-028), and the rows are
    // unknown rather than absent.
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(join(fixture, '.github/mcp.json'), '{ "mcpServers": { broken\n', 'utf8');
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
    await expect(items.first()).toContainText('.github/mcp.json');
    await expect(items.first()).toContainText('GitHub Copilot');
    await expect(items.first()).toContainText('The declarations in this file could not be read.');
    await expect(items.first()).toContainText('This file could not be parsed');
    await expect(items.first()).not.toContainText('declares no MCP servers');
  });
});
