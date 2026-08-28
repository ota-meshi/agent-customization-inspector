// T318: browser acceptance for the Claude MCP file detail (Phase 26).
// Launches the packaged CLI against a root `.mcp.json` fixture, opens a
// declaration record from the MCP tab, and verifies the complete literal
// detail: the record's own declaration view headed by the server name, the
// carrier's file-unit view behind the owner line, credentials shown exactly
// as authored with no masking or reveal control, a literal environment
// reference never replaced by the process value a same-named variable
// carries in the host's own environment, no raw source display anywhere
// (FR-007), the failure diagnostic on an unparseable carrier, and zero
// connection behavior.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDEMCPDETAIL00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_MCP_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Claude MCP file detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-mcp-detail-'));
    await writeFile(
      join(fixture, '.mcp.json'),
      JSON.stringify(
        {
          mcpServers: {
            context7: {
              // A relative command: the page must show the literal,
              // resolved against no base (FR-009).
              command: './scripts/context7.sh',
              args: ['-y', '@upstash/context7-mcp'],
              env: { API_KEY: FIXTURE_SECRET, ENDPOINT: ENVIRONMENT_REFERENCE },
            },
            'docs-http': { url: 'https://docs.example.com/mcp' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CLAUDE_E2E_MCP_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_MCP_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens a declaration record as its own detail, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The row is headed by the server name; the declaration line under it —
    // labelled by its owner carrier, with the row's name completing the
    // accessible name — is the link to that declaration's own detail.
    await page.getByRole('link', { name: '.mcp.json: context7' }).click();
    await expect(page).toHaveURL(/\/mcp\/detail\/repository\/.*\?server=context7/u);
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    // The record's identity restated: the recognition line and the
    // owner-carrier line, which links to the carrier's file-unit view.
    const main = page.locator('main');
    // The shared root carrier names both recognizing products with the
    // surfaces their admissions rest on — the VS Code 1.118+ provenance
    // beside the CLI's on the root spelling — in the closed tool order
    // (T343, T362).
    await expect(main).toContainText(
      'GitHub Copilot (VS Code, CLI), Claude Code (CLI and IDE clients) · MCP',
    );
    await expect(main).toContainText('Declared in');
    await expect(main.getByRole('link', { name: '.mcp.json' })).toBeVisible();

    // This declaration's fields alone, by the keys the carrier wrote: the
    // relative command exactly as authored, the credential whole and
    // unmarked, the environment reference as the exact characters that were
    // written (FR-026). The sibling declaration's fields are not here.
    await expect(main).toContainText('command');
    await expect(main).toContainText('./scripts/context7.sh');
    await expect(main).toContainText('@upstash/context7-mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain('https://docs.example.com/mcp');
    // Never the process value a same-named variable carries: the reference is
    // authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No raw source display (FR-007): what renders is the declaration's
    // own serialized JSON document, never the carrier's source — so the
    // wrapper level is absent: no `"mcpServers"` key, no key spelling the
    // declared name, and no sibling declaration rides along.
    expect(text).not.toContain('"mcpServers"');
    expect(text).not.toContain('"context7"');
    // No masking, reveal, or connection control anywhere on the page.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('shows the carrier view, every declaration included, behind the owner line', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The declaration detail's own owner line opens the carrier's file-unit
    // view: the file facts — standing in for the source panel this page
    // deliberately lacks — and every declaration the file makes.
    await page.getByRole('link', { name: '.mcp.json: context7' }).click();
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    await page.getByRole('link', { name: '.mcp.json' }).click();
    await expect(page.getByRole('heading', { name: '.mcp.json' })).toBeVisible();
    const main = page.locator('main');
    // The shared root carrier names both recognizing products with the
    // surfaces their admissions rest on — the VS Code 1.118+ provenance
    // beside the CLI's on the root spelling — in the closed tool order
    // (T343, T362).
    await expect(main).toContainText(
      'GitHub Copilot (VS Code, CLI), Claude Code (CLI and IDE clients) · MCP',
    );
    await expect(main).toContainText('Readable text');
    await expect(main).toContainText('bytes');
    await expect(main.getByRole('heading', { name: 'context7' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'docs-http' })).toBeVisible();
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain('"mcpServers"');
  });

  test('reports a declaration name the current scan does not publish', async ({ page }) => {
    // A retained link to a renamed declaration: the carrier resolves, the
    // name does not, and the page states that rather than showing another
    // record's content.
    await page.goto(
      new URL('/mcp/detail/repository/.mcp.json?server=renamed-away', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'No declaration named this way is published for this file in the current scan.',
    );
  });
});

test.describe('a Claude carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-mcp-detail-malformed-'));
    await writeFile(join(fixture, '.mcp.json'), '{ "mcpServers": { broken\n', 'utf8');
    await writeFile(join(fixture, 'CLAUDE.md'), '# instructions\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('states the failure with its diagnostic and still shows no source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    await page.getByRole('link', { name: '.mcp.json' }).first().click();
    await expect(page.getByRole('heading', { name: '.mcp.json' })).toBeVisible();
    // The rows are unknown rather than absent, the diagnostic says what
    // happened, and no source panel stands in for the declarations (FR-028,
    // FR-007).
    await expect(page.locator('main')).toContainText('This file could not be parsed');
    await expect(page.locator('main')).toContainText(
      'The declarations in this file could not be read.',
    );
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('"mcpServers"');
  });
});
