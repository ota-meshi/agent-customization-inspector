// T778: browser acceptance for the Claude plugin inventory (Phase 78).
// Launches the packaged CLI against a fixture carrying both carriers this
// vendor admits — a skills-directory folder made a plugin by its manifest, and
// the repository's own catalog — opens the printed loopback URL, and verifies
// the rendered rows: one per declared plugin name, each listing every carrier
// that resolves it and the files below the root it named, with the filters and
// the absence of the components a manifest points at.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Claude plugins declared by placement and by a repository catalog', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-plugins-'));
    // The plugin Claude loads by placement: a folder under the skills directory
    // carrying the manifest, with no marketplace and no install step.
    await mkdir(join(fixture, '.claude/skills/release-notes/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/release-notes/.claude-plugin/plugin.json'),
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
    await mkdir(join(fixture, '.claude/skills/release-notes/skills/draft'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/release-notes/skills/draft/SKILL.md'),
      '---\nname: draft\n---\n\nDraft the notes.\n',
      'utf8',
    );
    // A plain skill beside it: same tree, no manifest, so it stays a skill.
    await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/greet/SKILL.md'),
      '---\nname: greet\n---\n\nSay hello.\n',
      'utf8',
    );

    // The repository's own catalog, at the documented location.
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
            { name: 'remote-helper', source: 'owner/repo' },
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

    // Near misses: the plugin this repository publishes from its own root, and
    // a manifest one directory deeper than the anchored selector reaches.
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'inspector-tools', version: '1.4.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, '.claude/skills/release-notes/nested/.claude-plugin'), {
      recursive: true,
    });
    await writeFile(
      join(fixture, '.claude/skills/release-notes/nested/.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'nested-plugin' }, null, 2)}\n`,
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists a row per plugin name, however the plugin reached the repository', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // A placement-loaded plugin is addressed `<folder>@skills-dir` — the
    // vendor's own spelling — and a catalog offering `<plugin>@<marketplace>`.
    await expect(items.locator('.aci-plugin-row__name')).toContainText([
      'quality-review@inspector-examples',
      'release-notes@skills-dir',
      'remote-helper@inspector-examples',
    ]);

    // The manifest is the carrier of the plugin its folder is: nothing else
    // declares it, so its presence in the folder is the declaration.
    const placed = items.filter({ hasText: 'release-notes@skills-dir' });
    await expect(placed.locator('.aci-path')).toHaveText([
      '.claude/skills/release-notes/.claude-plugin/plugin.json',
    ]);
    await expect(placed.locator('.aci-plugin-row__carrier')).toHaveText(['Manifest']);
    await expect(placed.locator('.aci-plugin-row__tool').first()).toContainText('Claude Code');
    // The plugin is its root, so the count is that whole directory: the
    // manifest that made the folder a plugin, the skill it bundles, and the
    // nested manifest no rule admits — the same files its own page lists.
    await expect(placed).toContainText('3 file(s) in this plugin');

    // The catalog's own offering, carried by the catalog.
    const offered = items.filter({ hasText: 'quality-review@inspector-examples' });
    await expect(offered.locator('.aci-plugin-row__carrier').first()).toHaveText('Catalog entry');
    await expect(offered).toContainText('2 file(s) in this plugin');

    // A source outside the repository: the offering stands and ships nothing
    // here, which the absence of the count states.
    const remote = items.filter({ hasText: 'remote-helper@inspector-examples' });
    await expect(remote).not.toContainText('file(s) in this plugin');
  });

  test('lists no plugin the vendor does not load by placement', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    const panel = page.getByRole('tabpanel');
    // The repository's own published plugin: a manifest at the root is a plugin
    // this repository distributes, and no cited page has Claude discover one at
    // an arbitrary path.
    await expect(panel).not.toContainText('inspector-tools');
    // One directory below the skills folder is a path the anchored selector
    // does not reach.
    await expect(panel).not.toContainText('nested-plugin');
    // A folder with a `SKILL.md` and no manifest is a skill, never a plugin.
    await expect(panel).not.toContainText('greet@skills-dir');
    // A bundled skill is a file of its plugin, never a row of its own.
    await expect(panel).not.toContainText('.claude/skills/release-notes/skills/draft/SKILL.md');
  });

  test('keeps the plain skill a skill on the skills tab', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Skill/u }).click();
    const panel = page.getByRole('tabpanel');
    // The plain folder is the skill inventory's; the plugin's own folder is not
    // a skill, because what the rule admits there is its manifest.
    await expect(panel).toContainText('.claude/skills/greet/SKILL.md');
    await expect(panel).not.toContainText(
      '.claude/skills/release-notes/.claude-plugin/plugin.json',
    );
  });
});
