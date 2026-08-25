// T822: browser acceptance for the unified plugin inventory (Phase 82).
// Launches the packaged CLI against one repository whose plugins reach it every
// way the three products document — the catalog all three read, each product's
// own catalog location, and the one plugin a product loads by placement — and
// verifies the consolidated rows: one per declared plugin name, each listing
// every carrier that resolves it, with the filters and the absence of anything
// a plugin's own files would otherwise be mistaken for.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('the unified plugin inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-unified-plugins-'));

    // The one catalog location all three products read.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'shared-tools',
          owner: { name: 'Platform team' },
          plugins: [
            {
              name: 'formatter',
              source: { source: 'local', path: './plugins/formatter' },
              description: 'Formats a diff the way the team writes it.',
            },
            { name: 'packager', source: './plugins/packager' },
            { name: 'remote-linter', source: { source: 'git', url: 'https://example.com/l.git' } },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The cross-tool plugin root it names: a manifest in each form the
    // products that read this catalog look for, and the components it ships.
    await mkdir(join(fixture, 'plugins/formatter/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/formatter/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'formatter', version: '2.0.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/formatter/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/formatter/.claude-plugin/plugin.json'),
      `${JSON.stringify(
        {
          name: 'formatter',
          version: '2.0.0',
          mcpServers: { formatter: { command: 'formatter-server' } },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/formatter/skills/format'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/formatter/skills/format/SKILL.md'),
      '---\nname: format\n---\n\nFormat the diff.\n',
      'utf8',
    );

    // A root reached through the same shared catalog that keeps its manifest
    // in one product's form only: which file inside a root is the plugin's own
    // declaration is each vendor's contract, so this one is a manifest to the
    // product whose form it is and no file at all to the other two.
    await mkdir(join(fixture, 'plugins/packager/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/packager/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'packager', version: '3.1.0' }, null, 2)}\n`,
      'utf8',
    );

    // Codex's own catalog location, and Copilot's first.
    await mkdir(join(fixture, '.agents/plugins'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/plugins/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'codex-tools',
          plugins: [{ name: 'release-notes', source: './plugins/release-notes' }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/release-notes/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/release-notes/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'release-notes', version: '0.4.0' }, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, 'marketplace.json'),
      `${JSON.stringify(
        {
          name: 'copilot-tools',
          plugins: [{ name: 'pr-summary', source: './plugins/pr-summary' }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/pr-summary'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/pr-summary/plugin.json'),
      `${JSON.stringify({ name: 'pr-summary', version: '1.1.0' }, null, 2)}\n`,
      'utf8',
    );

    // The one plugin a product loads by placement alone, beside a plain skill.
    await mkdir(join(fixture, '.claude/skills/changelog/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/changelog/.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'changelog', version: '0.2.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/greet/SKILL.md'),
      '---\nname: greet\n---\n\nSay hello.\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('consolidates one plugin name into one row, whoever resolves it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // Six names, six rows — the shared catalog's three, each product's own, and
    // the placement-loaded one — in name order.
    await expect(items.locator('.aci-plugin-row__name')).toHaveText([
      'changelog@skills-dir',
      'formatter@shared-tools',
      'packager@shared-tools',
      'pr-summary@copilot-tools',
      'release-notes@codex-tools',
      'remote-linter@shared-tools',
    ]);

    // One catalog file, three products, one row: each recognizing tool is a
    // carrier of the same name, in the closed tool order.
    const shared = items.filter({ hasText: 'formatter@shared-tools' });
    await expect(shared.locator('.aci-plugin-row__tool')).toHaveText([
      /GitHub Copilot/u,
      /Claude Code/u,
      /OpenAI Codex/u,
    ]);
    await expect(shared.locator('.aci-path')).toHaveText([
      '.claude-plugin/marketplace.json',
      '.claude-plugin/marketplace.json',
      '.claude-plugin/marketplace.json',
    ]);
    // The files below the root it names are the plugin's own, both manifest
    // forms and the skill it bundles among them.
    await expect(shared).toContainText('3 file(s) in this plugin');

    // A source outside this repository ships nothing here.
    const remote = items.filter({ hasText: 'remote-linter@shared-tools' });
    await expect(remote).not.toContainText('file(s) in this plugin');
  });

  test('narrows the consolidated rows with the tool filter', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(6);

    // Selecting one product keeps the rows it resolves: the shared catalog's
    // three under any of them, plus that product's own.
    await page.getByLabel('Tool', { exact: true }).selectOption('codex');
    await expect(items.locator('.aci-plugin-row__name')).toHaveText([
      'formatter@shared-tools',
      'packager@shared-tools',
      'release-notes@codex-tools',
      'remote-linter@shared-tools',
    ]);
    await page.getByLabel('Tool', { exact: true }).selectOption('claude');
    await expect(items.locator('.aci-plugin-row__name')).toHaveText([
      'changelog@skills-dir',
      'formatter@shared-tools',
      'packager@shared-tools',
      'remote-linter@shared-tools',
    ]);
    await page.getByLabel('Tool', { exact: true }).selectOption('copilot');
    await expect(items.locator('.aci-plugin-row__name')).toHaveText([
      'formatter@shared-tools',
      'packager@shared-tools',
      'pr-summary@copilot-tools',
      'remote-linter@shared-tools',
    ]);
  });

  test('opens on the manifest the root keeps, in whichever product form', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const row = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'packager@shared-tools' });
    await row.getByRole('link').first().click();

    // One file, three products, three lists of forms to look inside the root
    // for. The plugin's own declaration is the file the root actually keeps,
    // so the page opens on it rather than reporting that this scan holds no
    // manifest for a plugin whose manifest it is listing among its files.
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('plugins/packager/.codex-plugin/plugin.json');
    await expect(manifest).toContainText('"version": "3.1.0"');
    await expect(page.locator('body')).not.toContainText('holds no manifest for this plugin');
  });

  test('keeps a plugin own files out of every other kind', async ({ page }) => {
    await page.goto(host.origin);
    // A plugin's bundled skill has no skill row: it is a file of the plugin
    // whose root holds it, and that plugin already has a row.
    await page.getByRole('tab', { name: /Skill/u }).click();
    const skills = page.getByRole('tabpanel');
    await expect(skills).toContainText('.claude/skills/greet/SKILL.md');
    await expect(skills).not.toContainText('plugins/formatter/skills/format/SKILL.md');
    // The manifest's inline `mcpServers` map is that file's own content, and the
    // `.mcp.json` inside the plugin root is one of the plugin's files: neither
    // is a carrier at a location a product documents. This repository declares
    // MCP nowhere else, so the kind has no rows at all — and a kind with no rows
    // has no tab, which is the absence stated where a reader would look for it.
    await expect(page.getByRole('tab', { name: /MCP/u })).toHaveCount(0);
  });
});
