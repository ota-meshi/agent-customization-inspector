// T284: browser acceptance for the Codex contained MCP inventory (Phase 23).
// Launches the packaged CLI against a carrier-bearing fixture, opens the
// printed loopback URL, and verifies the rendered MCP records — one record
// per `[mcp_servers.*]` declaration, headed by its authored key with the
// owner carrier stated inside it — beside unchanged instruction and fallback
// rows, the filters, the standalone/nested near misses' absence, the
// failed-carrier diagnostic, and the absence of any connection control. Each
// record's owner carrier links to the carrier's detail (Phase 24,
// T301/T302), whose own acceptance is codex-mcp-detail.spec.ts.
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
const FIXTURE_SECRET = 'ghp_E2EMCP000000000000000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_MCP_ENDPOINT}';

test.describe('contained MCP declarations on the admitted carrier', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-mcp-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
        '',
        '[mcp_servers]',
        // A `mcp_servers` entry that is not a table declares no server and is
        // omitted whole.
        'broken = "not a table"',
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
    // The standalone `.mcp.json` is not a Codex candidate — it is Claude's
    // own carrier (T309), here declaring no server, so the no-name record
    // closes the list under Claude's recognition — and the nested carrier
    // chain belongs to runtime working directories this product does not
    // select.
    await writeFile(join(fixture, '.mcp.json'), '{ "mcpServers": {} }\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.codex'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.codex/config.toml'),
      '[mcp_servers.context7]\ncommand = "other"\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one record per declaration, named by its key, with its owner carrier', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order; the MCP tab sits
    // beside it with one badge count per declaration record.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One record per declaration in name order, each headed by the authored
    // key with the owner-carrier identity inside it; the malformed non-table
    // entry is omitted whole. The no-name record closes the list with the
    // declarationless Claude carrier — Claude's recognition, not Codex's.
    await expect(items).toHaveCount(3);
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'context7',
      'docs-http',
      'No known server declarations',
    ]);
    for (const index of [0, 1]) {
      await expect(items.nth(index).locator('.aci-row-file')).toContainText('.codex/config.toml');
      await expect(items.nth(index).locator('.aci-row-file')).toContainText('OpenAI Codex');
    }
    await expect(items.nth(2).locator('.aci-row-file')).toContainText('.mcp.json');
    await expect(items.nth(2).locator('.aci-row-file')).toContainText('Claude Code');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 3 of 3',
    );
    // No declared value reaches the inventory — the values are the detail's,
    // one file at a time (FR-027) — and nothing resolves the environment
    // reference. The near misses appear nowhere on the page, and no control
    // offers to connect, start, or test a declared server.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('broken');
    expect(text).not.toContain('packages/api/.codex/config.toml');
    await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('keeps the instruction and fallback rows exactly as Phase 15 committed them', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    // The static file and the activated configured fallback share the root's
    // one range; the carrier's candidacy adds no instruction row and removes
    // none.
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['AGENTS.md', 'TEAM_GUIDE.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('config.toml');
  });

  test('narrows the declaration records with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(3);

    // Tool: the named declarations are Codex's recognition and the no-name
    // record is Claude's, so the Codex selection keeps exactly the named two
    // — the standalone `.mcp.json` is provably not a Codex candidate.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['context7', 'docs-http']);

    // Path: the filter applies to the carrier the declarations share, so a
    // query matching no carrier empties the panel into the filtered empty
    // state rather than the repository-has-nothing finding.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('no-such-carrier');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(3);
  });
});

test.describe('a carrier whose declarations cannot be read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-mcp-malformed-'));
    await mkdir(join(fixture, '.codex'), { recursive: true });
    // A document TOML cannot parse: the MCP recognition fails all-or-nothing
    // (FR-028), and the rows are unknown rather than absent.
    await writeFile(join(fixture, '.codex/config.toml'), '[mcp_servers.broken\n', 'utf8');
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
    await expect(items.first()).toContainText('.codex/config.toml');
    // "Could not be read", not "declares none": an unreadable declaration
    // block may well declare servers, and the diagnostic under it says what
    // remains available (FR-028).
    await expect(items.first()).toContainText('The declarations in this file could not be read.');
    await expect(items.first()).toContainText('This file could not be parsed');
    await expect(items.first()).not.toContainText('declares no MCP servers');
  });
});
