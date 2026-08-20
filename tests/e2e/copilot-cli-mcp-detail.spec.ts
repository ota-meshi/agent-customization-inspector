// T348: browser acceptance for the Copilot CLI MCP file detail (Phase 29).
// Launches the packaged CLI against a workspace-carrier fixture holding both
// documented declaration schemas, opens a declaration record from the MCP
// tab, and verifies the complete literal detail: the record's own declaration
// view headed by the server name, the carrier's file-unit view behind the
// owner line, credentials shown exactly as authored with no masking or reveal
// control, a literal environment reference never replaced by the process
// value a same-named variable carries in the host's own environment, no raw
// source display anywhere (FR-007), the failure diagnostic on an unparseable
// carrier, and zero connection behavior.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTMCPDETAIL0000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_MCP_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Copilot CLI MCP file detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-mcp-detail-'));
    // The `.github` spelling in the CLI's bare top-level schema — each key a
    // server name, no `mcpServers` wrapper (T341) — so the detail provably
    // serves the second documented form. This carrier is the CLI's alone.
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(
      join(fixture, '.github/mcp.json'),
      JSON.stringify(
        {
          'gh-actions': {
            type: 'local',
            // A relative command: the page must show the literal, resolved
            // against no base (FR-009).
            command: './scripts/gh-actions.sh',
            env: { API_KEY: FIXTURE_SECRET, ENDPOINT: ENVIRONMENT_REFERENCE },
          },
          'docs-http': { url: 'https://docs.example.com/mcp' },
        },
        null,
        2,
      ),
      'utf8',
    );
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['COPILOT_E2E_MCP_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['COPILOT_E2E_MCP_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens a declaration record as its own detail, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The row is headed by the server name; the declaration line under it —
    // labelled by its owner carrier, with the row's name completing the
    // accessible name — is the link to that declaration's own detail.
    await page.getByRole('link', { name: '.github/mcp.json: gh-actions' }).click();
    await expect(page).toHaveURL(/\/mcp\/.*\?server=gh-actions/u);
    await expect(page.getByRole('heading', { name: 'gh-actions' })).toBeVisible();
    // The record's identity restated: the recognizing product with the
    // surface its admission rests on, and the owner-carrier line, which
    // links to the carrier's file-unit view (T353).
    const main = page.locator('main');
    await expect(main).toContainText('GitHub Copilot (CLI) · MCP');
    await expect(main).toContainText('Declared in');
    await expect(main.getByRole('link', { name: '.github/mcp.json' })).toBeVisible();

    // This declaration's fields alone, by the keys the carrier wrote: the
    // relative command exactly as authored, the credential whole and
    // unmarked, the environment reference as the exact characters that were
    // written (FR-026). The sibling declaration's fields are not here.
    await expect(main).toContainText('command');
    await expect(main).toContainText('./scripts/gh-actions.sh');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain('https://docs.example.com/mcp');
    // Never the process value a same-named variable carries: the reference is
    // authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No raw source display (FR-007): the declaration renders as a
    // declaration, and the carrier's JSON spelling reaches no surface.
    expect(text).not.toContain('"gh-actions"');
    expect(text).not.toContain('"command"');
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
    // deliberately lacks — and every declaration the bare-schema file makes.
    await page.getByRole('link', { name: '.github/mcp.json: gh-actions' }).click();
    await expect(page.getByRole('heading', { name: 'gh-actions' })).toBeVisible();
    await page.getByRole('link', { name: '.github/mcp.json' }).click();
    await expect(page.getByRole('heading', { name: '.github/mcp.json' })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('GitHub Copilot (CLI) · MCP');
    await expect(main).toContainText('Readable text');
    await expect(main).toContainText('bytes');
    await expect(main.getByRole('heading', { name: 'gh-actions' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'docs-http' })).toBeVisible();
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain('"gh-actions"');
  });

  test('reports a declaration name the current scan does not publish', async ({ page }) => {
    // A retained link to a renamed declaration: the carrier resolves, the
    // name does not, and the page states that rather than showing another
    // record's content.
    await page.goto(new URL('/mcp/.github/mcp.json?server=renamed-away', host.origin).toString());
    await expect(page.locator('main')).toContainText(
      'No declaration named this way is published for this file in the current scan.',
    );
  });
});

test.describe('a Copilot CLI carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-mcp-detail-malformed-'));
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(join(fixture, '.github/mcp.json'), '{ "gh-actions": { broken\n', 'utf8');
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
    await page.getByRole('link', { name: '.github/mcp.json' }).first().click();
    await expect(page.getByRole('heading', { name: '.github/mcp.json' })).toBeVisible();
    // The rows are unknown rather than absent, the diagnostic says what
    // happened, and no source panel stands in for the declarations (FR-028,
    // FR-007).
    await expect(page.locator('main')).toContainText('This file could not be parsed');
    await expect(page.locator('main')).toContainText(
      'The declarations in this file could not be read.',
    );
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('"gh-actions"');
  });
});
