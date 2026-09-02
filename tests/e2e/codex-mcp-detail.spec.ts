// T297: browser acceptance for the Codex MCP detail (Phase 24). Launches the
// packaged CLI against a carrier-bearing fixture, opens a declaration record
// from the MCP tab, and verifies the complete literal detail: the record's
// own declaration view — headed by the server name, showing that
// declaration's fields by the keys the carrier wrote — the carrier's
// file-unit view behind the record's owner line, credentials shown exactly
// as authored with no masking or reveal control, a literal environment
// reference never replaced by the process value that a same-named variable
// carries in the host's own environment, no raw source display anywhere
// (FR-007), the failure diagnostic on an unparseable carrier, owner
// navigation back to the MCP tab, and zero connection behavior.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EMCPDETAIL000000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_MCP_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal MCP carrier detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-mcp-detail-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
        '',
        '[mcp_servers.context7]',
        'command = "npx"',
        'args = ["-y", "@upstash/context7-mcp"]',
        '',
        '[mcp_servers.context7.env]',
        `API_KEY = "${FIXTURE_SECRET}"`,
        `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
        '',
        '[mcp_servers.docs-http]',
        'url = "https://docs.example.com/mcp"',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');
    await writeFile(join(fixture, 'TEAM_GUIDE.md'), '# configured fallback\n', 'utf8');
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CODEX_E2E_MCP_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CODEX_E2E_MCP_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens a declaration record as its own detail, literal and unmasked', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The row is headed by the server name; the declaration line under it —
    // labelled by its owner carrier, with the row's name completing the
    // accessible name — is the link to that declaration's own detail (T302).
    await page.getByRole('link', { name: '.codex/config.toml: context7' }).click();
    await expect(page).toHaveURL(/\/mcp\/detail\/repository\/.*\?server=context7/u);
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    // The record's identity restated: the recognition line and the
    // owner-carrier line, which links to the carrier's file-unit view.
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('OpenAI Codex');
    await expect(page.locator('.aci-detail-attributes')).toContainText('Local clients');
    await expect(main).toContainText('Declared in');
    await expect(main.getByRole('link', { name: '.codex/config.toml' })).toBeVisible();

    // This declaration's fields alone, by the keys the carrier wrote: the
    // command and its arguments and the environment values — the credential
    // whole and unmarked, the environment reference as the exact characters
    // that were written (FR-026). The sibling declaration's fields are not
    // this record's and are not here.
    await expect(main).toContainText('command');
    await expect(main).toContainText('npx');
    await expect(main).toContainText('@upstash/context7-mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    expect(text).not.toContain('https://docs.example.com/mcp');
    // Never the process value a same-named variable carries: the reference is
    // authored text, resolved against nothing.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No raw source display (FR-007): the declaration renders as a
    // declaration, and the carrier's TOML spelling reaches no surface.
    expect(text).not.toContain('[mcp_servers');
    expect(text).not.toContain('project_doc_fallback_filenames');
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
    await page.getByRole('link', { name: '.codex/config.toml: context7' }).click();
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    await page.getByRole('link', { name: '.codex/config.toml' }).click();
    await expect(page.getByRole('heading', { name: '.codex/config.toml' })).toBeVisible();
    const main = page.locator('main');
    await expect(page.locator('.aci-detail-attributes')).toContainText('OpenAI Codex');
    await expect(page.locator('.aci-detail-attributes')).toContainText('Local clients');
    await expect(main).toContainText('Readable text');
    await expect(main).toContainText('bytes');
    await expect(main.getByRole('heading', { name: 'context7' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'docs-http' })).toBeVisible();
    await expect(main).toContainText('https://docs.example.com/mcp');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain('[mcp_servers');
  });

  test('returns to the MCP tab through the owner navigation', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    await page.getByRole('link', { name: '.codex/config.toml: context7' }).click();
    await expect(page.getByRole('heading', { name: 'context7' })).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    // The back link names the kind, so the reader lands on the MCP tab they
    // came from rather than the kind order's default.
    await expect(page.getByRole('tab', { selected: true })).toContainText('MCP');
  });

  test('reports a declaration name the current scan does not publish', async ({ page }) => {
    // A retained link to a renamed declaration: the carrier resolves, the
    // name does not, and the page states that rather than showing another
    // record's content.
    await page.goto(
      new URL(
        '/mcp/detail/repository/.codex/config.toml?server=renamed-away',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'No declaration named this way is published for this file in the current scan.',
    );
  });
});

test.describe('a carrier a configured fallback also recognizes', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-fallback-carrier-'));
    // A Codex `project_doc_fallback_filenames` entry naming `.mcp.json`
    // makes the root carrier an instructions candidate too. Its `FileDetail`
    // stays withheld (FR-007), so the instructions surface must route the
    // file to the carrier's own MCP view and keep it out of comparisons.
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      'project_doc_fallback_filenames = [".mcp.json"]\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.mcp.json'),
      '{ "mcpServers": { "shared": { "command": "npx" } } }\n',
      'utf8',
    );
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('serves the file under its instruction row and its declarations under the MCP row', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /instructions/iu }).click();
    const panel = page.getByRole('tabpanel');
    // The carrier is a legitimate instructions row member — Codex reads the
    // configured fallback as guidance — listed beside the root AGENTS.md.
    await expect(panel).toContainText('.mcp.json');
    // Which detail a link opens follows from the row it is on (FR-007): the
    // instruction row's subject is the file, so it links to the file's own
    // detail exactly as the sibling AGENTS.md does.
    await expect(
      panel.locator('a[href="/instructions/detail/repository/AGENTS.md"]').first(),
    ).toBeVisible();
    await panel.locator('a[href="/instructions/detail/repository/.mcp.json"]').first().click();
    await expect(page).toHaveURL(/\/instructions\/detail\/repository\//u);
    await expect(page.getByRole('heading', { name: '.mcp.json' })).toBeVisible();
    await expect(page.locator('main')).toContainText('"mcpServers"');

    // The MCP row of the same file leads with one declaration instead, and
    // carries none of the document's bytes.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /^MCP/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('a[href^="/mcp/detail/repository/.mcp.json"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/mcp\/detail\/repository\//u);
    await expect(page.getByRole('heading', { name: 'shared' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Readable text');
  });

  test('offers the range comparison the carrier is a comparable member of', async ({ page }) => {
    // Both files of the range show their complete source, so both are
    // comparison-eligible and the row links a comparison of the pair.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /instructions/iu }).click();
    await expect(
      page.getByRole('tabpanel').getByRole('link', { name: /Compare this range's files/u }),
    ).toHaveCount(1);
  });
});

test.describe('a carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-mcp-detail-malformed-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(join(fixture, '.codex/config.toml'), '[mcp_servers.broken\n', 'utf8');
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
    await page.getByRole('link', { name: '.codex/config.toml' }).first().click();
    await expect(page.getByRole('heading', { name: '.codex/config.toml' })).toBeVisible();
    // The rows are unknown rather than absent, the diagnostic says what
    // happened, and no source panel stands in for the declarations (FR-028,
    // FR-007).
    await expect(page.locator('main')).toContainText('This file could not be parsed');
    await expect(page.locator('main')).toContainText(
      'The declarations in this file could not be read.',
    );
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('[mcp_servers');
  });
});
