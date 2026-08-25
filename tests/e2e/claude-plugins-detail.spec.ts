// T790: browser acceptance for the Claude plugin carrier detail (Phase 79).
// Launches the packaged CLI against a fixture carrying both carriers — a
// skills-directory folder made a plugin by its manifest, and the repository's
// own catalog with a local offering and one whose source it does not carry —
// and verifies what each publishes: the manifest served complete as the file it
// is, the catalog entry served as its declaration without the catalog's bytes,
// the files below each plugin root read as the plugin's own, every declared
// value exactly as written, and no component opened through a declaration.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The literal credential the fixture writes, which must appear exactly as written (FR-026). */
const FIXTURE_CREDENTIAL = 'sk-live-claude-fixture-not-a-real-secret';

/** The environment reference the fixture writes, which must never be resolved (FR-026). */
const FIXTURE_ENVIRONMENT_REFERENCE = '${CLAUDE_FIXTURE_TOKEN}';

test.describe('the complete literal Claude plugin carrier detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-plugin-detail-'));

    // The placement-loaded plugin, with the credential and the environment
    // reference in its own manifest.
    await mkdir(join(fixture, '.claude/skills/secret-keeper/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/secret-keeper/.claude-plugin/plugin.json'),
      `${JSON.stringify(
        {
          name: 'secret-keeper',
          version: '0.1.0',
          description: 'Bundles an MCP server that needs a token.',
          mcpServers: './.mcp.json',
          hooks: './hooks/hooks.json',
          env: { API_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
          interface: { websiteURL: `https://example.com/?token=${FIXTURE_CREDENTIAL}` },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A component the manifest points at, which no rule may admit and which is
    // read only because it sits in the plugin's own root.
    await writeFile(
      join(fixture, '.claude/skills/secret-keeper/.mcp.json'),
      `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
      'utf8',
    );

    // The repository's own catalog: one local offering, and one whose source
    // this repository does not carry.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-examples',
          owner: { name: 'Platform team' },
          plugins: [
            {
              name: 'quality-review',
              source: { source: 'local', path: './plugins/quality-review' },
              description: 'Adds a quality-review skill for quick code reviews.',
            },
            {
              name: 'remote-helper',
              source: { source: 'git', url: 'https://example.com/plugins.git' },
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/quality-review/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/quality-review/.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'quality-review', version: '1.2.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/quality-review/skills/checklist'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/quality-review/skills/checklist/SKILL.md'),
      '---\nname: checklist\n---\n\nWalk the checklist.\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  /** Opens one plugin row from the inventory, by the plugin the row is headed by. */
  async function openPlugin(page: import('@playwright/test').Page, name: string): Promise<void> {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const row = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: name });
    await row.getByRole('link').first().click();
  }

  test('serves a placement-loaded plugin manifest complete, exactly as written', async ({
    page,
  }) => {
    await openPlugin(page, 'secret-keeper@skills-dir');

    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@skills-dir',
    );
    // The manifest is the carrier here: nothing else declares this plugin, so
    // the page serves the file complete rather than a parse of it.
    await expect(page.getByText('Manifest', { exact: true }).first()).toBeVisible();
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('"name": "secret-keeper"');
    // The credential and the environment reference stay exactly as written — no
    // mask, no reveal control, and no process value substituted (FR-026, FR-027).
    await expect(manifest).toContainText(FIXTURE_CREDENTIAL);
    await expect(manifest).toContainText(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const forbidden of ['Reveal', 'Unmask', 'Resolve', 'Fix', 'Install', 'Enable']) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
    // A catalog declaration is not what this carrier makes, so no entry is shown.
    await expect(page.getByRole('heading', { name: 'Declaration', exact: true })).toHaveCount(0);
  });

  test('lists the files a placement-loaded plugin ships, its own manifest among them', async ({
    page,
  }) => {
    await openPlugin(page, 'secret-keeper@skills-dir');
    await page.getByRole('tab', { name: /^files/iu }).click();

    // A plugin is its root, so the tree is that folder: the manifest that made
    // it a plugin, and the component the manifest points at — read because it
    // sits in the plugin's directory, never on the strength of the declaration.
    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await expect(tree.getByRole('link', { name: 'plugin.json' })).toBeVisible();
    await tree.getByRole('link', { name: '.mcp.json' }).click();
    await expect(page.locator('body')).toContainText('One of the files the plugin ships');
    await expect(page.locator('.aci-plugin-detail__main .aci-source-viewer')).toContainText(
      'mcpServers',
    );
    // The page is still about the plugin: the carrier and the row are the
    // address, and the file is a query beside them.
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@skills-dir',
    );
    await expect(page).toHaveURL(/[?&]file=/u);
  });

  test('serves a catalog offering as its entry, never the catalog bytes', async ({ page }) => {
    await openPlugin(page, 'quality-review@inspector-examples');

    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('./plugins/quality-review');
    await expect(page.getByRole('heading', { name: 'Catalog', exact: true })).toBeVisible();
    // The offering's own plugin reached a root here, so its optional manifest is
    // one of the files it ships and the page opens on it.
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('plugins/quality-review/.claude-plugin/plugin.json');
    await expect(manifest).toContainText('"version": "1.2.0"');
    // A page about one plugin never serves the catalog's own bytes: every other
    // plugin it lists would be on a screen about one of them (FR-007).
    await expect(page.locator('body')).not.toContainText('remote-helper');
  });

  test('states that a source outside the repository reached no files', async ({ page }) => {
    await openPlugin(page, 'remote-helper@inspector-examples');

    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('https://example.com/plugins.git');
    await expect(page.locator('body')).toContainText('This scan holds no manifest for this plugin');
    await page.getByRole('tab', { name: /^files/iu }).click();
    await expect(page.locator('body')).toContainText('This scan found no files for this plugin');
  });

  test('drops the content when the route leaves the carrier', async ({ page }) => {
    await openPlugin(page, 'secret-keeper@skills-dir');
    await expect(page.locator('body')).toContainText(FIXTURE_CREDENTIAL);

    await page.getByRole('link', { name: 'Back to the inventory' }).click();
    // The authored content leaves with the page: the inventory states what was
    // found and where, never what a declaration says (FR-027).
    await expect(page.locator('body')).not.toContainText(FIXTURE_CREDENTIAL);
  });
});
