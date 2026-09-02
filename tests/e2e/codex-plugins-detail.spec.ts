// T767: browser acceptance for the Codex plugin carrier detail (Phase 77).
// Launches the packaged CLI against a fixture whose catalog offers plugins from
// a local plugin root, from one whose manifest no reader accepts, and from a
// source outside the repository, opens each row from the offering it lists, and
// verifies what a catalog publishes: the entry the link named, the files below
// the root that entry reached, and never its own bytes. A file the plugin ships
// is served from the tree as the ordinary file it is, with every declared value
// exactly as written and no component ever opened.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The literal credential the fixture writes, which must appear exactly as written (FR-026). */
const FIXTURE_CREDENTIAL = 'sk-live-fixture-not-a-real-secret';

/** The environment reference the fixture writes, which must never be resolved (FR-026). */
const FIXTURE_ENVIRONMENT_REFERENCE = '${CODEX_FIXTURE_TOKEN}';

test.describe('the complete literal Codex plugin carrier detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-plugin-detail-'));
    await mkdir(join(fixture, '.agents/plugins'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/plugins/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-examples',
          interface: { displayName: 'Inspector Examples' },
          plugins: [
            {
              name: 'secret-keeper',
              source: { source: 'local', path: './plugins/secret-keeper' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
            {
              name: 'broken-plugin',
              source: { source: 'local', path: './plugins/broken-plugin' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
            // A plugin root that also holds a file a rule independently
            // admits: `.codex/rules/*.rules` is a declared permission policy,
            // whose own row names a policy rather than a file, so the generic
            // file detail refuses it. It is still one of this plugin's files.
            {
              name: 'config-helper',
              source: { source: 'local', path: './.codex' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Productivity',
            },
            // A source this repository does not hold as a plugin root: the
            // offering is declared and no manifest is reached for it.
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
    await mkdir(join(fixture, 'plugins/secret-keeper/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/secret-keeper/.codex-plugin/plugin.json'),
      `${JSON.stringify(
        {
          name: 'secret-keeper',
          version: '0.1.0',
          description: 'Bundles an MCP server that needs a token.',
          mcpServers: './.mcp.json',
          hooks: './hooks/hooks.json',
          interface: { websiteURL: `https://example.com/?token=${FIXTURE_CREDENTIAL}` },
          env: { API_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The components the manifest points at, which no rule may admit and no
    // surface may open (`codex.excluded.plugin-files`).
    await writeFile(
      join(fixture, 'plugins/secret-keeper/.mcp.json'),
      `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
      'utf8',
    );
    // A manifest whose JSON the vendor's own strict reader rejects: its
    // extraction fails all-or-nothing while the file stays admitted (FR-028).
    await mkdir(join(fixture, 'plugins/broken-plugin/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/broken-plugin/.codex-plugin/plugin.json'),
      '{\n  "name": "broken-plugin",\n  "version": "0.0.1",\n}\n',
      'utf8',
    );
    // The plugin root above, with the policy document inside it.
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/team.rules'), 'allow("read", "src/**")\n', 'utf8');

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
    await row.getByRole('link', { name: /\.agents\/plugins\/marketplace\.json/u }).click();
  }

  test('opens on the plugin itself: the offering and the plugin own manifest', async ({ page }) => {
    await openPlugin(page, 'secret-keeper');

    // The page's own heading is the first: the diagnostics below have one of
    // their own. It carries the name Codex resolves the plugin by.
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@inspector-examples',
    );
    await expect(page.getByText('Catalog entry', { exact: true })).toBeVisible();
    // The surface the recognition rests on is the plugin one, not the product's
    // shared local-host surface: the plugins page attributes marketplace reads
    // to the ChatGPT desktop app and marketplace management to the Codex CLI,
    // and names the IDE extension nowhere
    // (contracts/vendors/openai-codex.md § Surface boundary).
    const attributes = page.locator('.aci-plugin-detail .aci-detail-attributes');
    await expect(attributes).toContainText('OpenAI Codex');
    await expect(attributes).toContainText('Desktop app and plugin CLI');

    // The address alone opens what the plugin declares, exactly as the skill
    // detail opens on what its `SKILL.md` declares — the files it ships are the
    // other tab.
    await expect(page.getByRole('tab', { name: /^plugin/iu })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // The entry the link named, and the catalog's own declarations beside it.
    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('./plugins/secret-keeper');
    // The name of what the viewer holds is the band of the panel holding it,
    // with the format the text is in at the band's end
    // (`SourceViewer.vue` § panelLabel).
    await expect(page.getByRole('heading', { name: 'Catalog JSON', exact: true })).toBeVisible();

    // And the plugin's own declaration of itself, read on this page rather than
    // linked to: it is one of the files the plugin ships, and none of them is a
    // customization with a page of its own.
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('plugins/secret-keeper/.codex-plugin/plugin.json');
    await expect(manifest).toContainText('"name": "secret-keeper"');
    // The credential and the environment reference stay exactly as written —
    // no mask, no reveal control, and no process value substituted
    // (FR-026, FR-027).
    await expect(manifest).toContainText(FIXTURE_CREDENTIAL);
    await expect(manifest).toContainText(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const forbidden of ['Reveal', 'Unmask', 'Resolve', 'Fix', 'Install', 'Enable']) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }

    // A page about one plugin never serves the catalog's own bytes: every other
    // plugin it lists would be on a screen about one of them (FR-007).
    // The page's own content rather than the whole document: the bar's moves
    // name the neighbouring rows, and a catalog's other offerings are exactly
    // what sits beside this one in the list (`DetailNavigation.vue`).
    await expect(page.locator('.aci-plugin-detail')).not.toContainText('broken-plugin');
    await expect(page.locator('.aci-plugin-detail')).not.toContainText('remote-helper');
  });

  test('lists what the plugin ships on the files tab', async ({ page }) => {
    await openPlugin(page, 'secret-keeper');
    await page.getByRole('tab', { name: /^files/iu }).click();

    // The tree is rooted at the plugin root, so the manifest reads as
    // `plugin.json` inside a `.codex-plugin/` node, with the rest of what the
    // plugin ships beside it.
    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await expect(tree).toContainText('.codex-plugin/');
    await expect(tree.getByRole('link', { name: 'plugin.json' })).toBeVisible();
    await expect(tree.getByRole('link', { name: '.mcp.json' })).toBeVisible();
    // A component the manifest points at is a value it wrote, never a file this
    // page opened: the fixture ships no `hooks/hooks.json`, so the scan read
    // none and the tree offers none.
    await expect(tree.getByRole('link', { name: 'hooks.json' })).toHaveCount(0);
  });

  test('shows a manifest no reader accepts as the ordinary file it is', async ({ page }) => {
    await openPlugin(page, 'broken-plugin@inspector-examples');

    // The offering parsed, so its entry shows. The file below the root it named
    // is one of the plugin's own: no rule admitted it and nothing read it out,
    // so its trailing comma is neither a diagnostic nor a missing file — the
    // complete source is the whole answer (FR-007, FR-028).
    const manifest = page.locator('section', { hasText: 'Manifest' }).first();
    await expect(manifest).toContainText('"version": "0.0.1",');
    await expect(page.locator('body')).not.toContainText('could not be');
  });

  test('states that no plugin root was reached for a source outside the repository', async ({
    page,
  }) => {
    await openPlugin(page, 'remote-helper@inspector-examples');

    // The offering is declared and the source it names is not in this
    // repository, so there is no manifest to read and no file to open: the
    // plugin tab says so, and the files tab says the scan found none — both
    // pointing at the declaration rather than at anything fetched (FR-022).
    await expect(page.locator('body')).toContainText(
      'This offering names a subdirectory of a Git repository, so this scan holds none of this plugin',
    );
    const declaration = page.locator('section', { hasText: 'Declaration' }).first();
    await expect(declaration).toContainText('git-subdir');
    await expect(declaration).toContainText('https://github.com/example/codex-plugins.git');

    await page.getByRole('tab', { name: /^files/iu }).click();
    await expect(page.locator('body')).toContainText('This scan found no files for this plugin');
    await expect(page.getByRole('navigation', { name: 'Files in this plugin' })).toHaveCount(0);
  });

  test('opens another of the plugin files from the tree, keeping the plugin as the subject', async ({
    page,
  }) => {
    await openPlugin(page, 'secret-keeper');
    await page.getByRole('tab', { name: /^files/iu }).click();
    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await tree.getByRole('link', { name: '.mcp.json' }).click();

    // The file the plugin ships is served as the ordinary file it is, and the
    // page is still about the plugin: the URL names the carrier and the row,
    // and selecting a file is a query beside them.
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@inspector-examples',
    );
    await expect(page).toHaveURL(/[?&]file=/u);
    await expect(page.locator('body')).toContainText('One of the files the plugin ships');
    await expect(page.locator('.aci-plugin-detail__main .aci-source-viewer')).toContainText(
      'mcpServers',
    );

    // The tree travels with it, so the reader can step back to the manifest —
    // which the files panel serves from the same detail the plugin panel is
    // showing, rather than asking for one file twice.
    const returned = page.getByRole('navigation', { name: 'Files in this plugin' });
    await returned.getByRole('link', { name: 'plugin.json' }).click();
    await expect(page.locator('.aci-plugin-detail__main .aci-source-viewer')).toContainText(
      FIXTURE_CREDENTIAL,
    );
  });

  test('opens a kept link straight onto the file it names', async ({ page }) => {
    // A link kept from an earlier visit, entered cold: the page has no
    // declarations in hand, and which files this plugin ships is exactly what
    // the request it has not made yet answers. Reaching the file therefore has
    // to survive that order, or every deep link into a plugin's files reports
    // itself as no longer in the scan.
    await page.goto(
      new URL(
        '/plugins/detail/repository/.agents/plugins/marketplace.json' +
          '?plugin=secret-keeper%40inspector-examples&file=plugins%2Fsecret-keeper%2F.mcp.json',
        host.origin,
      ).href,
    );

    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'secret-keeper@inspector-examples',
    );
    // The selection opens the file, so the page arrives on the files tab rather
    // than on the offering the reader did not ask for.
    await expect(page.getByRole('tab', { name: /^files/iu })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('body')).toContainText('One of the files the plugin ships');
    await expect(page.locator('.aci-plugin-detail__main .aci-source-viewer')).toContainText(
      'mcpServers',
    );
  });

  test('reports a kept link to a file this plugin does not ship', async ({ page }) => {
    // Another plugin's manifest: a file this scan holds, under a root this
    // offering never named. Every statement on the page is this plugin's, so
    // showing it here would attribute it to this plugin.
    await page.goto(
      new URL(
        '/plugins/detail/repository/.agents/plugins/marketplace.json' +
          '?plugin=secret-keeper%40inspector-examples' +
          '&file=plugins%2Fbroken-plugin%2F.codex-plugin%2Fplugin.json',
        host.origin,
      ).href,
    );

    await expect(page.locator('body')).toContainText(
      'This carrier declares nothing at this link in the current scan.',
    );
    await expect(page.locator('.aci-plugin-detail__main')).toHaveCount(0);
  });

  test('opens a file of the plugin whose own row names a declaration', async ({ page }) => {
    await openPlugin(page, 'config-helper@inspector-examples');
    await page.getByRole('tab', { name: /^files/iu }).click();

    // `.codex/rules/team.rules` is a declared permission policy: its own row
    // names the policy rather than the file, so the generic file detail holds
    // nothing for it. Below this plugin's root it is one of the files the
    // plugin ships, and the plugin's own file function is what reads it
    // (contracts/http-api.md § get-plugin-file-detail).
    const tree = page.getByRole('navigation', { name: 'Files in this plugin' });
    await tree.getByRole('link', { name: 'team.rules' }).click();
    await expect(page.locator('body')).toContainText('allow("read", "src/**")');
    // What the file is comes from the inventory: the page says the plugin
    // ships it and that a row of another kind names it too.
    await expect(page.locator('body')).toContainText('also recognized on its own row as');
    await expect(page.locator('body')).not.toContainText('no rule admitted it');
  });

  test('drops the content when the route leaves the carrier', async ({ page }) => {
    await openPlugin(page, 'secret-keeper');
    await expect(page.locator('body')).toContainText(FIXTURE_CREDENTIAL);

    await page.getByRole('link', { name: /Back to /u }).click();
    // The authored content leaves with the page: the inventory states what was
    // found and where, never what a declaration says (FR-027).
    await expect(page.locator('body')).not.toContainText(FIXTURE_CREDENTIAL);
  });
});
