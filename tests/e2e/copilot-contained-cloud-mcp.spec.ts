// T380: browser acceptance for the contained/Cloud MCP boundary (Phase 32).
// Only explicit MCP configuration joins the MCP surfaces: an agent profile's `mcp-servers` and a plugin manifest's
// inline declarations belong to files no shipped rule admits — and once an
// agents inventory ships, they stay that kind's own detail content — while
// the hosted Cloud sources (out-of-box, custom-agent, repository-settings)
// are registry maintenance facts no session surface displays (spec.md
// § Clarifications: hosted inputs are not represented). What a user can see
// of all of that is absence: no MCP row, no synthetic file, no hosted or
// unavailable-state rendering, and no connection control.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('agent-contained and hosted MCP stay off every session surface', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-contained-cloud-mcp-'));
    // An agent profile declaring servers through the documented `mcp-servers`
    // property: a file no rule admits, whose configuration is the agent's own
    // frontmatter — never an MCP row.
    await mkdir(join(fixture, '.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.github/agents/deploy.md'),
      [
        '---',
        'name: deploy',
        'description: deploy agent',
        'mcp-servers:',
        '  agent-mcp:',
        "    type: 'local'",
        "    command: 'some-command'",
        '---',
        '',
        'Prompt body',
        '',
      ].join('\n'),
      'utf8',
    );
    // A plugin manifest with inline declarations: unadmitted too.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      '{ "name": "p", "mcpServers": { "plugin-mcp": { "command": "x" } } }\n',
      'utf8',
    );
    // One explicit carrier beside them, so the MCP tab has exactly its rows
    // and the absence of the others is observable rather than vacuous.
    await writeFile(
      join(fixture, '.mcp.json'),
      '{ "mcpServers": { "explicit-only": { "command": "npx" } } }\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists only the explicit carrier, with no contained, hosted, or synthetic row', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(1);
    await expect(items.first().locator('.aci-mcp-row__name')).toHaveText(['explicit-only']);
    // Neither the agent's declaration, the plugin's, nor any hosted Cloud
    // fact appears anywhere on the page — no unavailable-state label stands
    // in for them, and no control offers to connect.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('agent-mcp');
    expect(text).not.toContain('plugin-mcp');
    expect(text).not.toContain('deploy.md');
    expect(text).not.toContain('.claude-plugin');
    expect(text).not.toContain('out-of-box');
    expect(text).not.toContain('unavailable');
    await expect(page.getByRole('button', { name: /connect|start|test/iu })).toHaveCount(0);
  });

  test('publishes neither unadmitted file anywhere in the inventory', async ({ page }) => {
    await page.goto(host.origin);
    // The agent and plugin files are not in any kind's inventory and not in
    // the files-in-no-kind list either: no shipped rule admits them, so the
    // scan never read them (FR-003).
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('deploy.md');
    expect(text).not.toContain('plugin.json');
  });
});
