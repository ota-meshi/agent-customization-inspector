// T398: browser acceptance for the MCP comparison (Phase 34). Launches the
// packaged CLI against a tree holding the Codex configuration carrier, the
// shared root `.mcp.json`, and a `.github/mcp.json` of its own name, opens
// the comparison from an inventory row's entry link, and verifies the
// declaration comparison: one declared server name compared across the
// carriers of its own row, each side serialized to JSON and diffed in
// Monaco (research.md § 7), credential and environment-reference
// values shown exactly as authored with no masking, reveal control, or
// process-environment substitution, no carrier source anywhere (FR-007),
// other names' declarations kept off the page, and every selection outside
// the named row rejected — only explicit MCP configuration joins the MCP
// surfaces (data-model.md § Inventory unit).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The credential each carrier declares differently, shown whole on both sides. */
const CODEX_SECRET = 'ghp_E2EMCPCOMPARECODEX0000000000000000000000';
const ROOT_SECRET = 'ghp_E2EMCPCOMPAREROOT00000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${MCP_COMPARE_E2E_ENDPOINT}';

/** The process value that must never replace the reference. */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the MCP declaration comparison', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-mcp-compare-'));
    // The Codex carrier and the shared root file declare one name with
    // different fields — the pair the comparison serializes — plus one name
    // of their own each, which must stay off the shared name's comparison.
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        '[mcp_servers.shared]',
        'command = "codex-owned"',
        '',
        '[mcp_servers.shared.env]',
        `API_KEY = "${CODEX_SECRET}"`,
        `ENDPOINT = "${ENVIRONMENT_REFERENCE}"`,
        '',
        '[mcp_servers.codex-only]',
        'command = "npx"',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.mcp.json'),
      JSON.stringify(
        {
          mcpServers: {
            shared: { command: 'npx', env: { API_KEY: ROOT_SECRET } },
            'root-only': { url: 'https://root.example.com/mcp' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    // A third carrier declaring only its own name: readable and current, but
    // not on the shared name's row — the row-owned selection the comparison
    // enforces has no side for it.
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(
      join(fixture, '.github/mcp.json'),
      '{ "gh-only": { "command": "npx" } }\n',
      'utf8',
    );
    process.env['MCP_COMPARE_E2E_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['MCP_COMPARE_E2E_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens from the shared row and diffs the serialized declarations, literal and unmasked', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    // The shared name's row links the comparison of its own declarations.
    await page.getByRole('link', { name: "Compare this name's declarations: shared" }).click();
    await expect(page).toHaveURL(/\/mcp\/compare\?/u);
    await expect(page).toHaveURL(/name=shared/u);
    await expect(
      page.getByRole('heading', { name: 'Compare MCP server declarations' }),
    ).toBeFocused();

    const main = page.locator('main');
    // The comparison's subject is the row's declared name.
    await expect(main.locator('.aci-mcp-compare__name')).toHaveText('shared');
    // Each side keeps its identity: path, Source, kind, read outcome, and
    // the recognizing products the row lists — and no source panel follows
    // either (FR-007).
    await expect(main).toContainText('.codex/config.toml');
    await expect(main).toContainText('.mcp.json');
    await expect(main).toContainText('Repository · MCP');
    await expect(main).toContainText('OpenAI Codex');
    await expect(main).toContainText('Claude Code');
    // The Monaco diff holds both serialized declarations: the fields as
    // JSON, the credentials whole and unmarked, the environment reference as
    // its own characters (FR-025, FR-026).
    const diff = page.locator('.aci-declaration-diff');
    await expect(diff).toBeVisible();
    await expect(diff).toContainText('codex-owned');
    await expect(diff).toContainText(CODEX_SECRET);
    await expect(diff).toContainText(ROOT_SECRET);
    await expect(diff).toContainText(ENVIRONMENT_REFERENCE);
    const text = await main.innerText();
    // Never the process value, and never the carriers' own spellings: the
    // comparison is the serialized declaration, not source (FR-007, FR-026).
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    expect(text).not.toContain('"mcpServers"');
    expect(text).not.toContain('[mcp_servers');
    // One name's comparison shows one name's declarations: the carriers'
    // other names stay on their own rows.
    expect(text).not.toContain('codex-only');
    expect(text).not.toContain('root-only');
    // No masking, reveal, or connection control anywhere on the page.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('rejects a file the named row does not hold', async ({ page }) => {
    // Only explicit MCP configuration joins the MCP surfaces: a deep link
    // naming any file outside the named row — an agent profile, a carrier
    // that does not declare the name, a path the scan does not hold — has no
    // side in this row's comparison.
    await page.goto(
      new URL(
        '/mcp/compare?name=shared&left=.codex%2Fconfig.toml&right=.github%2Fagents%2Fdeploy.md',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A file this link names does not declare this server name in the current scan.',
    );
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(CODEX_SECRET);

    // A readable current carrier is rejected the same way when the named row
    // does not hold it (FR-011).
    await page.goto(
      new URL(
        '/mcp/compare?name=shared&left=.github%2Fmcp.json&right=.mcp.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A file this link names does not declare this server name in the current scan.',
    );
  });

  test('rejects a name no current row is, and a link with no name', async ({ page }) => {
    await page.goto(
      new URL(
        '/mcp/compare?name=no-such-server&left=.codex%2Fconfig.toml&right=.mcp.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'No declared server name in the current scan matches this link’s.',
    );

    await page.goto(
      new URL('/mcp/compare?left=.codex%2Fconfig.toml&right=.mcp.json', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText('This link names no MCP comparison.');
  });

  test('rejects the same carrier on both sides', async ({ page }) => {
    await page.goto(
      new URL('/mcp/compare?name=shared&left=.mcp.json&right=.mcp.json', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      'A comparison needs the declaration from two distinct MCP files, and this link names the same file twice.',
    );
  });

  test('reaches the comparison from the carrier detail and the declaration detail', async ({
    page,
  }) => {
    // The carrier view carries one entry link per declared name whose row
    // holds a counterpart; the shared name's opens its row's comparison.
    await page.goto(new URL('/mcp/.mcp.json', host.origin).toString());
    await expect(page.getByRole('heading', { name: '.mcp.json' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: "Compare this server's declarations: root-only" }),
    ).toHaveCount(0);
    await page.getByRole('link', { name: "Compare this server's declarations: shared" }).click();
    await expect(page).toHaveURL(/\/mcp\/compare\?/u);
    await expect(page).toHaveURL(/name=shared/u);
    await expect(page.locator('main')).toContainText('Repository · MCP');

    // The declaration view links its own name from the overview.
    await page.goto(new URL('/mcp/.mcp.json?server=shared', host.origin).toString());
    await page.getByRole('link', { name: "Compare this server's declarations" }).click();
    await expect(page).toHaveURL(/name=shared/u);
  });
});
