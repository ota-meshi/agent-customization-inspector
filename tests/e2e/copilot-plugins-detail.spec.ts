// T812: browser acceptance for the Copilot plugin carrier detail (Phase 81).
// Launches the packaged CLI against a fixture whose catalog offers plugins from
// roots using different documented manifest forms, and one from a source this
// repository does not carry, and verifies what the detail publishes: the entry
// the link named without the catalog's own bytes, the manifest the root
// actually uses opened as one of the plugin's files, every declared value
// exactly as written, and no component opened through its declaration.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The literal credential the fixture writes, which must appear exactly as written (FR-026). */
const FIXTURE_CREDENTIAL = 'ghp_copilot_fixture_not_a_real_secret';

/** The environment reference the fixture writes, which must never be resolved (FR-026). */
const FIXTURE_ENVIRONMENT_REFERENCE = '${COPILOT_FIXTURE_TOKEN}';

test.describe('the complete literal Copilot plugin carrier detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-plugin-detail-'));
    await writeFile(
      join(fixture, 'marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-examples',
          owner: { name: 'Platform team' },
          plugins: [
            {
              name: 'secret-keeper',
              source: './plugins/secret-keeper',
              description: 'Bundles an MCP server that needs a token.',
            },
            // The GitHub object form this vendor documents, and an npm package,
            // which it documents nowhere: two different absences.
            {
              name: 'github-helper',
              source: { source: 'github', repo: 'octo-org/plugin-repo', ref: 'v1.0.0' },
            },
            { name: 'npm-helper', source: { source: 'npm', package: '@example/plugin' } },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The root uses the legacy `.plugin/` form — the first the CLI checks — so
    // the detail must open on that one rather than on a form the root lacks.
    await mkdir(join(fixture, 'plugins/secret-keeper/.plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/secret-keeper/.plugin/plugin.json'),
      `${JSON.stringify(
        {
          name: 'secret-keeper',
          version: '0.1.0',
          mcpServers: './.mcp.json',
          env: { API_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
          homepage: `https://example.com/?token=${FIXTURE_CREDENTIAL}`,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, 'plugins/secret-keeper/.mcp.json'),
      `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
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
    // Waited for, not assumed (`claude-plugins-detail.spec.ts` records the case).
    await expect(page).toHaveURL(/\/plugins\/detail\//u);
  }

  test('opens on the manifest form the plugin root actually uses', async ({ page }) => {
    await openPlugin(page, 'secret-keeper@inspector-examples');

    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@inspector-examples',
    );
    // Four forms are documented and this root uses the first: the page keeps
    // the ones the commit carries, so the manifest shown is the file that is
    // actually there rather than a form the root lacks.
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('plugins/secret-keeper/.plugin/plugin.json');
    await expect(manifest).toContainText('"name": "secret-keeper"');
    // The credential and the environment reference stay exactly as written — no
    // mask, no reveal control, and no process value substituted (FR-026, FR-027).
    await expect(manifest).toContainText(FIXTURE_CREDENTIAL);
    await expect(manifest).toContainText(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const forbidden of ['Reveal', 'Unmask', 'Resolve', 'Fix', 'Install', 'Enable']) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }

    // The entry the link named, and never the catalog's own bytes: the other
    // plugin it lists would be on a screen about one of them (FR-007).
    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('./plugins/secret-keeper');
    await expect(page.locator('.aci-plugin-detail')).not.toContainText('npm-helper');
  });

  test('opens a component from the tree as one of the plugin own files', async ({ page }) => {
    await openPlugin(page, 'secret-keeper@inspector-examples');
    await page.getByRole('tab', { name: /^files/iu }).click();

    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await tree.getByRole('link', { name: '.mcp.json' }).click();
    // Read because it sits in the plugin's root, never on the strength of the
    // `mcpServers` value the manifest wrote.
    await expect(page.locator('body')).toContainText('One of the files the plugin ships');
    await expect(page.locator('.aci-plugin-detail__main .aci-source-viewer')).toContainText(
      'mcpServers',
    );
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@inspector-examples',
    );
  });

  test('names the kind of place a source outside the repository is', async ({ page }) => {
    await openPlugin(page, 'github-helper@inspector-examples');

    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('octo-org/plugin-repo');
    // The offering names a GitHub repository, which the page states as what it
    // is rather than as a directory this repository is missing.
    await expect(page.locator('body')).toContainText(
      'This offering names a GitHub repository, so this scan holds none of this plugin',
    );
  });

  test('states that a source in no documented form was not recognized', async ({ page }) => {
    await openPlugin(page, 'npm-helper@inspector-examples');

    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('@example/plugin');
    // An npm package is a form Claude Code and Codex document and this vendor
    // does not, so nothing is derived from it and the page says so.
    await expect(page.locator('body')).toContainText(
      'This offering names a source in no form this product recognizes',
    );
  });

  test('drops the content when the route leaves the carrier', async ({ page }) => {
    await openPlugin(page, 'secret-keeper@inspector-examples');
    await expect(page.locator('body')).toContainText(FIXTURE_CREDENTIAL);

    await page.getByRole('link', { name: /Back to /u }).click();
    // The authored content leaves with the page: the inventory states what was
    // found and where, never what a declaration says (FR-027).
    await expect(page.locator('body')).not.toContainText(FIXTURE_CREDENTIAL);
  });
});
