// specs/003-antigravity-cli-support T034: browser acceptance for the
// Antigravity CLI MCP profile. A standalone `.agents/mcp_config.json` reaches
// the inventory as one row per declared server name, and each server's detail
// shows the fields its carrier wrote — the current `serverUrl` and the legacy
// key the migration page names alike, because whether the vendor still accepts
// one is runtime this product does not observe (spec.md § FR-005, FR-020,
// FR-025, FR-026).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EANTIGRAVITYMCP00000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${ANTIGRAVITY_E2E_MCP_TOKEN}';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-mcp-detail-'));
  await mkdir(join(fixture, '.agents'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/mcp_config.json'),
    JSON.stringify(
      {
        mcpServers: {
          tickets: {
            command: 'npx',
            args: ['-y', '@example/mcp-tickets'],
            env: { TICKETS_TOKEN: ENVIRONMENT_REFERENCE, FALLBACK: FIXTURE_SECRET },
          },
          'internal-docs': { serverUrl: 'https://mcp.internal.example.com/sse' },
          'legacy-indexer': { httpUrl: 'http://localhost:8080/mcp' },
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('publishes one row per declared server name', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^MCP/u }).click();
  const panel = page.getByRole('tabpanel');
  for (const name of ['tickets', 'internal-docs', 'legacy-indexer']) {
    await expect(panel, name).toContainText(name);
  }
  await expect(panel).toContainText('.agents/mcp_config.json');
  await expect(panel).toContainText('Antigravity CLI');
});

test('shows a server’s declared fields as written, connecting to nothing', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^MCP/u }).click();
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'tickets' })
    .getByRole('link', { name: /mcp_config\.json/u })
    .first()
    .click();
  await expect(page).toHaveURL(/\/mcp\/detail\/repository\//u);
  const main = page.locator('main');
  await expect(main).toContainText('"command": "npx"');
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
  await expect(main).toContainText(FIXTURE_SECRET);
  // Nothing offers to reach the server, and no value is masked or resolved.
  await expect(page.getByRole('button', { name: /connect|start|launch|test/iu })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
});

test('shows the remote keys the vendor documents, current and legacy alike', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^MCP/u }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel.locator('.aci-item').filter({ hasText: 'internal-docs' })).toContainText(
    'internal-docs',
  );
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'legacy-indexer' })
    .getByRole('link', { name: /mcp_config\.json/u })
    .first()
    .click();
  // The legacy spelling is shown as the file wrote it: this product states
  // what the file says, not what the vendor would accept today.
  await expect(page.locator('main')).toContainText('httpUrl');
});
