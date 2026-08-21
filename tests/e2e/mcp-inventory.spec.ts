// T393: browser acceptance for the priority cross-vendor MCP inventory
// (Phase 33). Launches the packaged CLI against one tree holding every
// explicit carrier of the priority wave — the shared root `.mcp.json`, the
// `.github` and `.vscode` spellings, and the Codex configuration carrier —
// and verifies the one inventory across them: name rows in name order, the
// name every vendor declares grouped into a single row attributing each
// carrier and tool, the filters and their keyboard operation, and the
// explicit-carrier boundary by absence — no agent, plugin, settings, nested,
// or hosted row, and no connection control.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection, tests/integration/repository-scan);
// what is asserted here is what a user can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';
import { tabUntilFocused } from './keyboard';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EPRIORITYMCP00000000000000000000000000';

/** The name all four carriers declare — the cross-vendor row under test. */
const SHARED_NAME = 'shared-everywhere';

test.describe('the priority cross-vendor MCP inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-priority-mcp-'));
    await writeFile(
      join(fixture, '.mcp.json'),
      JSON.stringify(
        {
          mcpServers: {
            [SHARED_NAME]: { command: 'npx', env: { API_KEY: FIXTURE_SECRET } },
            'root-only': { url: 'https://root.example.com/mcp' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(
      join(fixture, '.github/mcp.json'),
      `{ "gh-actions": { "command": "npx" }, "${SHARED_NAME}": { "command": "gh" } }\n`,
      'utf8',
    );
    await mkdir(join(fixture, '.vscode'), { recursive: true });
    await writeFile(
      join(fixture, '.vscode/mcp.json'),
      `{\n  // Workspace servers.\n  "servers": {\n    "vs-docs": { "type": "http", "url": "https://docs.example.com/mcp" },\n    "${SHARED_NAME}": { "command": "vscode-owned" },\n  }\n}\n`,
      'utf8',
    );
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      `[mcp_servers.codex-db]\ncommand = "npx"\n\n[mcp_servers."${SHARED_NAME}"]\ncommand = "codex-owned"\n`,
      'utf8',
    );
    // The boundary's negatives, written so their absence is observable: an
    // agent profile and a plugin manifest spelling MCP configuration, and a
    // nested carrier.
    await mkdir(join(fixture, '.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.github/agents/deploy.md'),
      '---\nname: deploy\ndescription: d\nmcp-servers:\n  agent-mcp:\n    command: x\n---\n\nBody\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      '{ "name": "p", "mcpServers": { "plugin-mcp": { "command": "x" } } }\n',
      'utf8',
    );
    await mkdir(join(fixture, 'packages/api'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.mcp.json'),
      `{ "mcpServers": { "${SHARED_NAME}": { "command": "nested" } } }\n`,
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('groups the name every vendor declares into one attributed row', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Every explicit carrier's names, in name order, and nothing else.
    await expect(items).toHaveCount(5);
    await expect(items.locator('.aci-mcp-row__name')).toHaveText([
      'codex-db',
      'gh-actions',
      'root-only',
      SHARED_NAME,
      'vs-docs',
    ]);
    // The shared row lists one line per physical carrier — four files, five
    // declarations — attributing every recognizing product without ordering
    // them (FR-009).
    const shared = items.nth(3);
    await expect(shared.locator('.aci-mcp-row__owner')).toHaveCount(4);
    await expect(shared).toContainText('.codex/config.toml');
    await expect(shared).toContainText('.github/mcp.json');
    await expect(shared).toContainText('.vscode/mcp.json');
    await expect(shared).toContainText('OpenAI Codex');
    await expect(shared).toContainText('GitHub Copilot');
    await expect(shared).toContainText('Claude Code');
    // The boundary, by absence: no agent, plugin, nested, or hosted row, no
    // declared value, and no connection control.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('agent-mcp');
    expect(text).not.toContain('plugin-mcp');
    expect(text).not.toContain('packages/api');
    expect(text).not.toContain('deploy.md');
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('narrows the one population with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(5);

    // Tool: each vendor keeps exactly the rows one of its declarations
    // resolves.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['codex-db', SHARED_NAME]);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['root-only', SHARED_NAME]);
    await page.getByRole('button', { name: 'Clear filters' }).click();

    // Path: the filter applies to the carriers the declarations live in.
    await page.getByLabel('Path contains').fill('.codex');
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['codex-db', SHARED_NAME]);
    await page.getByLabel('Path contains').fill('no-such-carrier');
    await expect(items).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(5);
  });

  test('operates the filters and a declaration link from the keyboard', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(5);

    // Reach the path filter in the page's real Tab order, type the query,
    // and clear it — focus lands on the result summary when the clear
    // control removes itself (WCAG 2.4.3).
    expect(await tabUntilFocused(page, page.getByLabel('Path contains'))).toBe(true);
    await page.keyboard.type('.vscode/');
    await expect(items.locator('.aci-mcp-row__name')).toHaveText([SHARED_NAME, 'vs-docs']);
    expect(await tabUntilFocused(page, page.getByRole('button', { name: 'Clear filters' }))).toBe(
      true,
    );
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(5);
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toBeFocused();

    // A declaration link is reachable in the Tab order and opens its record.
    const firstLink = page.locator('[role="tabpanel"] .aci-item a').first();
    expect(await tabUntilFocused(page, firstLink)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mcp\//u);
  });
});
