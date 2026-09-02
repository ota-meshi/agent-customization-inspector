// T368: browser acceptance for the Copilot VS Code MCP file detail
// (Phase 31). Launches the packaged CLI against a workspace holding the
// dedicated JSONC `.vscode/mcp.json` carrier and the shared root `.mcp.json`,
// opens declaration records from the MCP tab, and verifies the complete
// literal detail: the `.vscode` record captioned as VS Code's with its
// dedicated fields, the root record served as the CLI reading under both
// Copilot surfaces with no VS Code-owned field, credentials shown exactly as
// authored with no masking or reveal control, a literal reference never
// replaced by a process value, no raw source display anywhere (FR-007), the
// failure diagnostic on an unparseable carrier, and zero connection behavior.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EVSCODEMCPDETAIL0000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${VSCODE_E2E_MCP_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Copilot VS Code MCP file detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-vscode-mcp-detail-'));
    // The dedicated carrier in the documented `servers` schema, JSONC
    // comments included, with an input variable reference and a literal
    // credential among the declared values.
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(
      join(fixture, '.vscode/mcp.json'),
      `{
  // Workspace MCP servers.
  "servers": {
    "vs-local": {
      "command": "./scripts/vs.sh",
      "env": { "API_KEY": "${FIXTURE_SECRET}", "ENDPOINT": "${ENVIRONMENT_REFERENCE}" }
    },
    "vs-docs": { "type": "http", "url": "https://docs.example.com/mcp" },
  }
}
`,
      'utf8',
    );
    // The shared root file in the CLI's bare schema: the VS Code admission
    // is path/surface provenance only, so the record's fields can only be
    // the CLI reading's — which the bare form proves.
    await writeFile(join(fixture, '.mcp.json'), '{ "root-bare": { "command": "npx" } }\n', 'utf8');
    process.env['VSCODE_E2E_MCP_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['VSCODE_E2E_MCP_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens a .vscode declaration as its own detail, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    await page.getByRole('link', { name: '.vscode/mcp.json: vs-local' }).click();
    await expect(page).toHaveURL(/\/mcp\/detail\/repository\/.*\?server=vs-local/u);
    await expect(page.getByRole('heading', { name: 'vs-local' })).toBeVisible();
    // The record's identity: the recognizing product with the VS Code
    // surface its admission rests on, and the owner-carrier line.
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('GitHub Copilot');
    await expect(page.locator('.aci-detail-attributes')).toContainText('VS Code');
    await expect(main).toContainText('Declared in');
    await expect(main.getByRole('link', { name: '.vscode/mcp.json' })).toBeVisible();

    // This declaration's fields alone, by the keys the carrier wrote: the
    // relative command exactly as authored, the credential whole and
    // unmarked, the reference as the exact characters that were written
    // (FR-026). The sibling declaration's fields are not here.
    await expect(main).toContainText('command');
    await expect(main).toContainText('./scripts/vs.sh');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain('https://docs.example.com/mcp');
    // Never the process value a same-named variable carries: the reference
    // is authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No raw source display (FR-007): the declaration renders as a
    // declaration — the carrier's JSONC spelling, comments included, reaches
    // no surface.
    expect(text).not.toContain('"vs-local"');
    expect(text).not.toContain('"servers"');
    expect(text).not.toContain('Workspace MCP servers.');
    // No masking, reveal, or connection control anywhere on the page.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('serves the root record as the CLI reading under both Copilot surfaces', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The bare-schema name exists only under the CLI's documented reading,
    // so its appearance proves no VS Code extractor ran on the root file —
    // the 1.118+ admission stays path and surface only — while the record
    // states both Copilot surfaces its one recognition rests on.
    await page.getByRole('link', { name: '.mcp.json: root-bare' }).click();
    await expect(page.getByRole('heading', { name: 'root-bare' })).toBeVisible();
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('GitHub Copilot');
    await expect(page.locator('.aci-detail-attributes')).toContainText('VS Code, CLI');
    await expect(main).toContainText('command');
    await expect(main).toContainText('npx');
    const text = await main.innerText();
    expect(text).not.toContain('"root-bare"');
  });

  test('shows the carrier view, every declaration included, behind the owner line', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    await page.getByRole('link', { name: '.vscode/mcp.json: vs-local' }).click();
    await expect(page.getByRole('heading', { name: 'vs-local' })).toBeVisible();
    await page.getByRole('link', { name: '.vscode/mcp.json' }).click();
    await expect(page.getByRole('heading', { name: '.vscode/mcp.json' })).toBeVisible();
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('GitHub Copilot');
    await expect(page.locator('.aci-detail-attributes')).toContainText('VS Code');
    await expect(main).toContainText('Readable text');
    await expect(main).toContainText('bytes');
    await expect(main.getByRole('heading', { name: 'vs-local' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'vs-docs' })).toBeVisible();
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain('"servers"');
  });
});

test.describe('a VS Code carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-vscode-mcp-detail-malformed-'));
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(join(fixture, '.vscode/mcp.json'), '{ "servers": { "vs": { broken\n', 'utf8');
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('states the failure with its diagnostic and still shows no source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    await page.getByRole('link', { name: '.vscode/mcp.json' }).first().click();
    await expect(page.getByRole('heading', { name: '.vscode/mcp.json' })).toBeVisible();
    // The rows are unknown rather than absent, the diagnostic says what
    // happened, and no source panel stands in for the declarations (FR-028,
    // FR-007).
    await expect(page.locator('main')).toContainText('This file could not be parsed');
    await expect(page.locator('main')).toContainText(
      'The declarations in this file could not be read.',
    );
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('"servers"');
  });
});
