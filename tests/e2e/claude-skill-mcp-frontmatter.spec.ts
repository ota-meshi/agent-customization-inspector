// T328 (Phase 27): browser acceptance for the skill-frontmatter `mcpServers`
// spelling. Claude documents no such skill field — the documented inline MCP
// owners are agents, plugin manifests, and settings, none of which any rule
// admits yet — so a skill spelling the key declares nothing any product
// reads: the MCP inventory stays the carrier's
// alone, the skill keeps its own kind's rows and detail — the spelling is
// ordinary frontmatter there, credential included (FR-027) — and unadmitted
// future owner files still contribute nothing.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in the skill's frontmatter, shown only under its own kind. */
const FIXTURE_SECRET = 'ghp_E2ESKILLMCP00000000000000000000000000000';

const SKILL_PATH = '.claude/skills/deploy/SKILL.md';

test.describe('a skill whose frontmatter spells mcpServers', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-skill-mcp-'));
    await writeFile(
      join(fixture, '.mcp.json'),
      '{ "mcpServers": { "context7": { "command": "npx" } } }\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude/skills/deploy'), { recursive: true });
    await writeFile(
      join(fixture, SKILL_PATH),
      [
        '---',
        'name: deploy',
        'description: Deploy helper',
        'mcpServers:',
        // Re-declares the carrier's name and adds one of its own: neither may
        // reach the MCP inventory, because Claude does not read this field.
        '  context7:',
        '    command: npx',
        '  deploy-db:',
        '    url: https://db.example.com/mcp',
        '    headers:',
        `      Authorization: Bearer ${FIXTURE_SECRET}`,
        '---',
        '',
        '# Deploy skill',
        '',
      ].join('\n'),
      'utf8',
    );
    // Unadmitted future owner families carrying declarations: no rule admits
    // these files, so no row of any kind may appear for them.
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/settings.json'),
      '{ "mcpServers": { "settings-server": { "command": "x" } } }\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/agents/reviewer.md'),
      '---\nname: reviewer\nmcpServers:\n  agent-server:\n    command: x\n---\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      '{ "name": "p", "mcpServers": { "plugin-server": { "command": "x" } } }\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('keeps the MCP inventory the carrier’s alone', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /MCP/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One row, the carrier's: the skill's re-declared `context7` joins no
    // row — its one declaration home is the carrier — and `deploy-db` never
    // appears at all.
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-mcp-row__name')).toHaveText(['context7']);
    await expect(items.first().locator('.aci-mcp-row__owner')).toHaveCount(1);
    await expect(items.first().locator('.aci-mcp-row__owner')).toContainText('.mcp.json');
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('deploy-db');
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain('settings-server');
    expect(text).not.toContain('agent-server');
    expect(text).not.toContain('plugin-server');
  });

  test('keeps the skill a skill, its frontmatter served under its own kind', async ({ page }) => {
    await page.goto(host.origin);
    // The skill inventory lists it like any skill.
    await page.getByRole('tab', { name: /skill/iu }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('deploy');
    // Its detail shows the frontmatter as ordinary skill content — the
    // `mcpServers` key and its values, credential included, exactly as
    // authored (FR-026, FR-027) — because the file's bytes are legitimately
    // displayed under the skill's own kind.
    await page
      .locator('.aci-skill-row__file', { hasText: SKILL_PATH })
      .locator('a')
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/skills/${SKILL_PATH}$`, 'u'));
    await expect(
      page.getByRole('heading', { name: '.claude/skills/deploy/', exact: true }),
    ).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('mcpServers');
    await expect(main).toContainText(`Bearer ${FIXTURE_SECRET}`);
    expect(await main.innerText()).not.toMatch(/could not be loaded/iu);
  });
});
