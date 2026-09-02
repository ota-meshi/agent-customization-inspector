// T801: browser acceptance for the Copilot plugin inventory (Phase 80).
// Launches the packaged CLI against a fixture carrying the four catalog
// locations this vendor checks and plugin roots that use three of the four
// manifest forms, opens the printed loopback URL, and verifies the rendered
// rows — one per declared plugin name, each listing every carrier that resolves
// it and the files below the root it named — plus the exclusions.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Copilot plugins declared by the repository own catalogs', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-plugins-'));
    // The catalog at the first documented location.
    await writeFile(
      join(fixture, 'marketplace.json'),
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
            { name: 'shorthand-helper', source: 'octo-org/plugin-repo' },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A second catalog, at one of the other three documented locations.
    await mkdir(join(fixture, '.github/plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.github/plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-github',
          plugins: [{ name: 'release-notes', source: './plugins/release-notes' }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A root using the legacy manifest form, with the skill it bundles.
    await mkdir(join(fixture, 'plugins/quality-review/.plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/quality-review/.plugin/plugin.json'),
      `${JSON.stringify({ name: 'quality-review', version: '1.2.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/quality-review/skills/checklist'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/quality-review/skills/checklist/SKILL.md'),
      '---\nname: checklist\n---\n\nWalk the checklist.\n',
      'utf8',
    );
    // A root using the plain `plugin.json` form.
    await mkdir(join(fixture, 'plugins/release-notes'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/release-notes/plugin.json'),
      `${JSON.stringify({ name: 'release-notes', version: '0.3.1' }, null, 2)}\n`,
      'utf8',
    );

    // The CLI's experimental project extension, and the plugin this repository
    // publishes from its own root: neither is a plugin candidate.
    await mkdir(join(fixture, '.github/extensions/formatter'), { recursive: true });
    await writeFile(
      join(fixture, '.github/extensions/formatter/extension.mjs'),
      'export function activate() {\n  return { name: "formatter" };\n}\n',
      'utf8',
    );
    await writeFile(
      join(fixture, 'plugin.json'),
      `${JSON.stringify({ name: 'inspector-tools' }, null, 2)}\n`,
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists a row per plugin name, from every catalog location it reads', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    await expect(items.locator('.aci-row-head__name')).toContainText([
      'quality-review@inspector-examples',
      'release-notes@inspector-github',
      'shorthand-helper@inspector-examples',
    ]);

    // The offering's root uses the legacy `.plugin/` manifest form, and the
    // files below it — the manifest and the skill it bundles — are the plugin's.
    const review = items.filter({ hasText: 'quality-review@inspector-examples' });
    await expect(review.locator('.aci-path').first()).toHaveText('marketplace.json');
    await expect(review.locator('.aci-carrier-kind').first()).toHaveText('Catalog entry');
    await expect(review).toContainText('Ships 2 files');

    // A catalog at another documented location carries its own rows.
    const notes = items.filter({ hasText: 'release-notes@inspector-github' });
    await expect(notes.locator('.aci-path').first()).toHaveText('.github/plugin/marketplace.json');
    await expect(notes).toContainText('Ships 1 file');

    // A string entry source is a path, so this one names the directory
    // `octo-org/plugin-repo` — which this repository does not carry, so the row
    // ships nothing. The `owner/repo` shorthand belongs to the CLI's
    // marketplace-add command instead.
    const shorthand = items.filter({ hasText: 'shorthand-helper@inspector-examples' });
    await expect(shorthand).not.toContainText('file in this plugin');
  });

  test('lists neither a CLI extension nor the plugin this repository publishes', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const panel = page.getByRole('tabpanel');
    // An extension is executable JavaScript the CLI loads on enablement, and
    // never one of the manifests a plugin is recognized by
    // (`copilot.excluded.cli-extensions`).
    await expect(panel).not.toContainText('extension.mjs');
    // A manifest at the repository's own root is a plugin this repository
    // publishes: no cited page has Copilot discover one at an arbitrary path.
    await expect(panel).not.toContainText('inspector-tools');
    // A bundled skill is a file of its plugin, never a row of its own.
    await expect(panel).not.toContainText('plugins/quality-review/skills/checklist/SKILL.md');
  });
});
