// T582: browser acceptance for the Codex settings-and-configuration inventory
// (Phase 57). Launches the packaged CLI against a fixture whose root
// `.codex/config.toml` is Codex's project configuration layer, opens the
// printed loopback URL, and verifies the rendered row — one row per recognized
// file, headed by its Source-relative Path with the recognizing product and
// its surfaces inside it — beside the MCP rows the same physical file
// publishes, the unchanged instruction rows, the filters, the near misses'
// absence, and the absence of anything the document declares.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECONFIG0000000000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_CONFIG_ENDPOINT}';

test.describe('the Codex configuration document at the root layer', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-config-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    // One document carrying both of the file's subjects: general
    // configuration, and the `[mcp_servers.*]` tables whose rows are the MCP
    // inventory's. The credential and the environment reference are authored
    // text this file happens to contain; neither may reach a row, and nothing
    // resolves the reference against the process environment (FR-026, FR-027).
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        '# The comment a parser-resolved declaration list would drop.',
        'model = "gpt-5.4-codex"',
        'project_doc_max_bytes = 32_768',
        '',
        '[experimental]',
        'model_instructions_file = "./.codex/model-instructions.md"',
        '',
        '[mcp_servers.context7]',
        'command = "npx"',
        '',
        '[mcp_servers.context7.env]',
        `API_KEY = "${FIXTURE_SECRET}"`,
        `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
        '',
      ].join('\n'),
      'utf8',
    );
    // Near miss: the target the configuration above names. A configured path
    // gains no read authority and becomes no candidate.
    await writeFile(join(fixture, '.codex/model-instructions.md'), '# configured\n', 'utf8');
    // Near miss: a descendant `.codex` layer belongs to a runtime working
    // directory this product never selects.
    await mkdir(join(fixture, 'packages/api/.codex'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.codex/config.toml'), 'model = "o4"\n', 'utf8');
    // Near miss: the container and filename literals are exact.
    await writeFile(join(fixture, '.codex/config.toml.bak'), 'suffix\n', 'utf8');
    // The unchanged instruction row beside the new settings row.
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row for the configuration file, named by its path, with its product', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order, so the settings tab is
    // the one to select here; its badge counts one row per recognized file.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.codex/config.toml']);
    await expect(items.first().locator('.aci-settings-row__owner')).toContainText('OpenAI Codex');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 1',
    );
    // Nothing the document declares reaches the inventory — a key, a value, a
    // credential inside one — and nothing resolves the environment reference.
    // The near misses appear nowhere, and no control offers to apply a value.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('project_doc_max_bytes');
    expect(text).not.toContain('model_instructions_file');
    expect(text).not.toContain('.codex/model-instructions.md');
    expect(text).not.toContain('packages/api/.codex/config.toml');
    expect(text).not.toContain('config.toml.bak');
    await expect(page.getByRole('button', { name: /apply|enable|trust|activate/iu })).toHaveCount(
      0,
    );
  });

  test('publishes the MCP rows of the same file beside the settings row', async ({ page }) => {
    // One physical file, two subjects: the declarations inside it are the MCP
    // inventory's rows and the document is the settings inventory's row. Both
    // are published, and the file appears once under each.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^MCP/u }).click();
    const mcpItems = page.getByRole('tabpanel').locator('.aci-item');
    await expect(mcpItems).toHaveCount(1);
    await expect(mcpItems.first()).toContainText('context7');
    await expect(mcpItems.first()).toContainText('.codex/config.toml');

    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(1);
  });

  test('keeps the instruction rows exactly as their own phase committed them', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['AGENTS.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('config.toml');
  });

  test('narrows the settings row with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);

    // Tool: the document is Codex's recognition alone.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(1);

    // Path: the filter applies to the row's own path, which is its identity.
    await page.getByLabel('Path contains').fill('config.toml');
    await expect(items).toHaveCount(1);

    await page.getByLabel('Path contains').fill('settings.json');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(1);
  });
});
