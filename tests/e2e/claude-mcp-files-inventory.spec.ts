// T307: browser acceptance for the Claude MCP file inventory (Phase 25).
// Launches the packaged CLI against a root `.mcp.json` fixture, opens the
// printed loopback URL, and verifies the rendered MCP records — one record
// per declared server name, headed by that name with the owner carrier and
// the recognizing product stated inside it — the filters, the exclusions (a
// descendant carrier, the User-state filename, a plugin manifest carrying
// declarations), the failed-carrier diagnostic, and the absence of any
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
const FIXTURE_SECRET = 'ghp_E2ECLAUDEMCP0000000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_MCP_ENDPOINT}';

test.describe('the root Claude MCP file inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-mcp-'));
    await writeFile(
      join(fixture, '.mcp.json'),
      JSON.stringify(
        {
          mcpServers: {
            context7: {
              command: 'npx',
              args: ['-y', '@upstash/context7-mcp'],
              env: { API_KEY: FIXTURE_SECRET, ENDPOINT: ENVIRONMENT_REFERENCE },
            },
            'docs-http': { url: 'https://docs.example.com/mcp' },
            // An entry that is not an object declares no server and is
            // omitted whole.
            broken: 'not an object',
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    // Near miss for every product: a subdirectory carrier is a runtime-chain
    // member no product's rule reads from the selected root's frame.
    await mkdir(join(fixture, 'packages/api'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.mcp.json'),
      '{ "mcpServers": { "nested-server": { "command": "x" } } }\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude.json'),
      '{ "mcpServers": { "user-server": { "command": "x" } } }\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      '{ "name": "p", "mcpServers": { "plugin-server": { "command": "x" } } }\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one record per declared name, with the carrier and product inside it', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One record per declared name in name order; the non-object entry is
    // omitted whole. The root carrier's records state both recognizing
    // products — the file is Claude's project carrier and a Copilot CLI
    // workspace carrier at once — and no excluded location contributes a
    // record: the subdirectory carrier is a near miss for every product.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['context7', 'docs-http']);
    for (const index of [0, 1]) {
      await expect(items.nth(index).locator('.aci-row-file')).toContainText('.mcp.json');
      await expect(items.nth(index).locator('.aci-row-file')).toContainText('Claude Code');
      await expect(items.nth(index).locator('.aci-row-file')).toContainText('GitHub Copilot');
    }
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 2 of 2',
    );
    // No declared value reaches the inventory (FR-027), nothing resolves the
    // environment reference, the excluded locations appear nowhere, and no
    // control offers to connect, start, or test a declared server.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('broken');
    expect(text).not.toContain('nested-server');
    expect(text).not.toContain('user-server');
    expect(text).not.toContain('plugin-server');
    await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('narrows the declaration records with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);

    // Tool: both records carry a Claude and a Copilot declaration of the one
    // root carrier, so either product's selection keeps both; no Codex
    // option is offered for a repository with no Codex recognition.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);
    await expect(page.getByLabel('Tool').locator('option')).not.toContainText(['OpenAI Codex']);
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // Path: the filter applies to the carrier the declarations share.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('no-such-carrier');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});

test.describe('a Claude carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-mcp-malformed-'));
    // A document strict JSON cannot parse: the MCP recognition fails
    // all-or-nothing (FR-028), and the rows are unknown rather than absent.
    await writeFile(join(fixture, '.mcp.json'), '{ "mcpServers": { broken\n', 'utf8');
    await writeFile(join(fixture, 'CLAUDE.md'), '# instructions\n', 'utf8');
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
    await expect(items.first()).toContainText('.mcp.json');
    await expect(items.first()).toContainText('Claude Code');
    // "Could not be read", not "declares none": an unreadable declaration
    // block may well declare servers, and the diagnostic under it says what
    // remains available (FR-028).
    await expect(items.first()).toContainText('The declarations in this file could not be read.');
    await expect(items.first()).toContainText('This file could not be parsed');
    await expect(items.first()).not.toContainText('declares no MCP servers');
  });
});
