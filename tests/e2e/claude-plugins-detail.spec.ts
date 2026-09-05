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
              source: './plugins/quality-review',
              description: 'Adds a quality-review skill for quick code reviews.',
            },
            {
              name: 'remote-helper',
              source: { source: 'url', url: 'https://example.com/plugins.git' },
            },
            {
              name: 'bare-helper',
              source: './plugins/bare-helper',
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
    // A local root this repository carries that keeps no plugin manifest: the
    // other absence the detail states, and a different one from a source that
    // names no directory here at all.
    await mkdir(join(fixture, 'plugins/bare-helper/commands'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/bare-helper/commands/summarize.md'),
      '# Summarize\n',
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
    // Waited for, not assumed: a caller's next click must not land on the
    // inventory the navigation is still leaving — the rail's own `Files in no
    // kind` entry answers a `/^files/iu` tab locator, and selecting it would
    // cancel the navigation in flight.
    await expect(page).toHaveURL(/\/plugins\/detail\//u);
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
    // The name of what the viewer holds is the band of the panel holding it,
    // with the format the text is in at the band's end
    // (`SourceViewer.vue` § panelLabel).
    await expect(page.getByRole('heading', { name: 'Catalog JSON', exact: true })).toBeVisible();
    // The offering's own plugin reached a root here, so its optional manifest is
    // one of the files it ships and the page opens on it.
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('plugins/quality-review/.claude-plugin/plugin.json');
    await expect(manifest).toContainText('"version": "1.2.0"');
    // A page about one plugin never serves the catalog's own bytes: every other
    // plugin it lists would be on a screen about one of them (FR-007).
    // The page's own content rather than the whole document: the bar's moves
    // name the neighbouring rows, and a catalog's other offerings are exactly
    // what sits beside this one in the list (`DetailNavigation.vue`).
    await expect(page.locator('.aci-plugin-detail')).not.toContainText('remote-helper');
  });

  test('states that a source outside the repository reached no files', async ({ page }) => {
    await openPlugin(page, 'remote-helper@inspector-examples');

    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('https://example.com/plugins.git');
    // The offering names a Git repository, which is what the page states —
    // never that a directory here ships no manifest, which would report this
    // repository as missing a file the offering never put in it.
    await expect(page.locator('body')).toContainText(
      'This offering names a Git repository, so this scan holds none of this plugin',
    );
    await expect(page.locator('body')).not.toContainText('holds no manifest inside');
    await page.getByRole('tab', { name: /^files/iu }).click();
    await expect(page.locator('body')).toContainText('This scan found no files for this plugin');
  });

  test('names the directory an offering reaches that keeps no manifest', async ({ page }) => {
    await openPlugin(page, 'bare-helper@inspector-examples');

    // The other absence: the offering names a directory this repository does
    // carry, so the statement is about that directory and says which one.
    const body = page.locator('body');
    await expect(body).toContainText('This scan holds no manifest inside');
    await expect(body).toContainText('plugins/bare-helper/');
    await expect(body).not.toContainText('name no directory below this file');
    // The files it does ship are still its own, read through the plugin.
    await page.getByRole('tab', { name: /^files/iu }).click();
    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await expect(tree.getByRole('link', { name: 'summarize.md' })).toBeVisible();
  });

  test('drops the content when the route leaves the carrier', async ({ page }) => {
    await openPlugin(page, 'secret-keeper@skills-dir');
    await expect(page.locator('body')).toContainText(FIXTURE_CREDENTIAL);

    await page.getByRole('link', { name: /Back to /u }).click();
    // The authored content leaves with the page: the inventory states what was
    // found and where, never what a declaration says (FR-027).
    await expect(page.locator('body')).not.toContainText(FIXTURE_CREDENTIAL);
  });
});
