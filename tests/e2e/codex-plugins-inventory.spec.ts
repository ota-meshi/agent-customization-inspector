// T755: browser acceptance for the Codex plugin inventory (Phase 76).
// Launches the packaged CLI against a fixture carrying a repository catalog,
// the plugin roots its local entries name, and the sources no derivation may
// follow, opens the printed loopback URL, and verifies the rendered rows — one
// per declared plugin name, each listing every carrier that resolves it — the
// filters, and the absence of the components a manifest points at.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Codex plugins declared by a repository catalog and its manifests', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-plugins-'));
    // The catalog at the exact repository location, with one local entry whose
    // plugin root this repository holds and one Git-backed entry whose source
    // it does not.
    await mkdir(join(fixture, '.agents/plugins'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/plugins/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-examples',
          interface: { displayName: 'Inspector Examples' },
          plugins: [
            {
              name: 'release-notes',
              source: { source: 'local', path: './plugins/release-notes' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
            {
              name: 'remote-helper',
              source: {
                source: 'git-subdir',
                url: 'https://github.com/example/codex-plugins.git',
                path: './plugins/remote-helper',
                ref: 'main',
              },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The plugin root the local entry names, with the manifest the derivation
    // reaches and a bundled skill the manifest points at.
    await mkdir(join(fixture, 'plugins/release-notes/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/release-notes/.codex-plugin/plugin.json'),
      `${JSON.stringify(
        {
          name: 'release-notes',
          version: '0.3.1',
          description: 'Draft release notes from merged pull requests.',
          skills: './skills/',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/release-notes/skills/draft'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/release-notes/skills/draft/SKILL.md'),
      '---\nname: draft\n---\n\nDraft the notes.\n',
      'utf8',
    );
    // The legacy-compatible catalog, offering a plugin by the same name from a
    // plugin root of its own: the vendor installs each under its own catalog,
    // so these are two plugins rather than one.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-legacy',
          plugins: [
            {
              name: 'release-notes',
              source: { source: 'local', path: './plugins/legacy-release-notes' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'plugins/legacy-release-notes/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/legacy-release-notes/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'release-notes', version: '0.9.0' }, null, 2)}\n`,
      'utf8',
    );
    // The repository publishes a plugin of its own. No rule reaches it: a
    // plugin root is activated rather than discovered, and the manifest of a
    // plugin this repository distributes is not a customization a client here
    // loads.
    await mkdir(join(fixture, '.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'inspector-tools', version: '1.4.0' }, null, 2)}\n`,
      'utf8',
    );
    // Near misses: a manifest one directory below the root, and a catalog the
    // root's own selectors do not reach.
    await mkdir(join(fixture, 'packages/api/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'nested-plugin' }, null, 2)}\n`,
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per plugin as one catalog offers it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // A row is one plugin as one catalog offers it, and the heading is the
    // selector the tool itself takes: `plugin@marketplace`. The name
    // `release-notes` is therefore two rows, because two catalogs offer it from
    // plugin roots of their own — this is exactly what a row keyed by the name
    // alone would have merged into one.
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'release-notes@inspector-examples',
      'release-notes@inspector-legacy',
      'remote-helper@inspector-examples',
    ]);

    // A row lists the offering rather than its content: the catalog entry that
    // offers the plugin, and the files below the root it names stated as a
    // count. Their own paths belong to the offering's detail, not to a list
    // where one plugin's files would sit under every catalog's row.
    const legacyRow = items.filter({ hasText: 'release-notes@inspector-legacy' });
    // One file, three products, one line: this catalog is the legacy-compatible
    // location Codex reads, the location Claude documents for a repository's
    // own catalog, and one of the four Copilot checks — so the file's line
    // carries a mark per recognizing tool, in the closed tool order (FR-007).
    await expect(legacyRow.locator('.aci-path')).toHaveText(['.claude-plugin/marketplace.json']);
    // The path is the link, and it names the file and the plugin rather than a
    // product: this list shows no per-product difference, so one link answers
    // for the file and the marks beside it state what recognized it
    // (`PluginRow.vue`).
    await expect(legacyRow.locator('a.aci-path')).toHaveAttribute(
      'aria-label',
      '.claude-plugin/marketplace.json: release-notes@inspector-legacy',
    );
    await expect(legacyRow.locator('.aci-recognition-marks__opens')).toHaveCount(0);
    await expect(legacyRow).toContainText('Ships 1 file');

    // The offered plugin's row is headed by the pair and lists the catalog that
    // offers it.
    const localRow = items.filter({ hasText: 'release-notes@inspector-examples' });
    await expect(localRow.locator('.aci-path')).toHaveText(['.agents/plugins/marketplace.json']);
    await expect(localRow.locator('.aci-carrier-kind')).toHaveText(['Catalog entry']);
    await expect(localRow.locator('a.aci-path')).toHaveAttribute(
      'aria-label',
      '.agents/plugins/marketplace.json: release-notes@inspector-examples',
    );
    // Its root holds the plugin's own manifest and the skill it bundles.
    await expect(localRow).toContainText('Ships 2 files');

    // A row whose only carrier is a non-local entry: the plugin is declared,
    // and the source it comes from is not in this repository.
    const remoteRow = items.filter({ hasText: 'remote-helper@inspector-examples' });
    await expect(remoteRow.locator('.aci-path')).toHaveText(['.agents/plugins/marketplace.json']);
    await expect(remoteRow.locator('.aci-carrier-kind')).toHaveText(['Catalog entry']);
    // A `git-subdir` source names no directory this repository holds, so the
    // offering stands with nothing of its own here — stated by the absence of
    // the count rather than by a zero, which would read as a plugin that ships
    // no files.
    await expect(remoteRow).not.toContainText('file in this plugin');
  });

  test('opens each carrier line on that product own reading of the catalog', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const legacyRow = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'release-notes@inspector-legacy' });

    // One catalog, three readings on one line. The list opens the reading of
    // the first product in the closed order that recognizes the file, and the
    // other two are reached from the detail's own attributes line, where the
    // product marks link (`plugins/detail`). The entry writes the object
    // spelling only Codex documents, so Codex resolves a directory from it and
    // the other two resolve none.
    await legacyRow.locator('a.aci-path').click();
    await expect(page.locator('body')).toContainText('Read as GitHub Copilot reads this carrier');
    await page.getByRole('link', { name: /^OpenAI Codex reading of/u }).click();
    await expect(page.locator('body')).toContainText('Read as OpenAI Codex reads this carrier');
    await expect(page.locator('body')).toContainText('plugins/legacy-release-notes/');

    // And back the other way: the readings reach each other from the detail,
    // so no return to the list is needed to change which one is open.
    await page.getByRole('link', { name: /^Claude Code reading of/u }).click();
    await expect(page.locator('body')).toContainText('Read as Claude Code reads this carrier');
    // Claude documents the plain `./` string and no `local` object, so this
    // entry names it no directory: the page says what the offering is rather
    // than showing another product's root.
    await expect(page.locator('body')).toContainText('a source in no form this product recognizes');
    await expect(page.locator('body')).not.toContainText('plugins/legacy-release-notes/');
  });

  test('lists no component a manifest points at and no nested near miss', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const panel = page.getByRole('tabpanel');
    // A bundled skill is a relationship, never a candidate of the plugin kind:
    // admitting it would read a file on the strength of a value the manifest
    // wrote.
    await expect(panel).not.toContainText('plugins/release-notes/skills/draft/SKILL.md');
    // A manifest one directory below the root is a path no selector reaches.
    await expect(panel).not.toContainText('packages/api/.codex-plugin/plugin.json');
    // Nor is the repository's own published plugin: its manifest sits at the
    // one depth a root-anchored rule would have matched, and no rule searches
    // a repository for a plugin root.
    await expect(panel).not.toContainText('inspector-tools');
  });

  test('narrows the plugin rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(3);
    const summary = page.getByRole('status').filter({ hasText: 'Showing' });
    await expect(summary).toContainText('Showing 3 of 3');

    // Two products recognize a plugin here, because the legacy-compatible
    // catalog is one file both read. Selecting Codex keeps every row — it
    // recognizes both catalogs — while selecting Claude keeps only the row that
    // catalog carries. `exact`: a carrier link's accessible name also contains
    // the word, which a substring match would reach.
    await expect(page.getByLabel('Tool', { exact: true }).locator('option')).toHaveText([
      'All tools',
      'GitHub Copilot',
      'Claude Code',
      'OpenAI Codex',
    ]);
    await page.getByLabel('Tool', { exact: true }).selectOption('codex');
    await expect(items).toHaveCount(3);
    await page.getByLabel('Tool', { exact: true }).selectOption('claude');
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'release-notes@inspector-legacy',
    ]);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    // Path: the filter asks each carrier the same question a skill definition
    // is asked — does this file's own path match — so a catalog that matches
    // keeps the rows it carries.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.claude-plugin');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'release-notes@inspector-legacy',
    ]);
    await expect(items.locator('.aci-path')).toHaveText(['.claude-plugin/marketplace.json']);
    await expect(summary).toContainText('Showing 1 of 3');

    // A file the plugin ships is not the carrier's path, so it narrows nothing
    // here: the row is the offering, and its files are read on the offering's
    // own page.
    await page
      .getByRole('searchbox', { name: 'Search names and paths' })
      .fill('plugins/release-notes');
    await expect(items).toHaveCount(0);
  });
});
