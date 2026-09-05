// T830: browser acceptance for the plugin comparison surface (Phase 83).
// Launches the packaged CLI against a repository that keeps one marketplace in
// two catalogs — the shape a team publishing to two products has — whose
// entries have drifted, and verifies what the comparison publishes: the two
// declarations as one JSON document per side diffed in Monaco, the files the
// two copies ship compared by the name they share, every value exactly as
// written, no runtime claim about either side, and no control that edits,
// merges, or reverts one.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The literal credential both catalogs write, which must appear as authored (FR-026). */
const FIXTURE_CREDENTIAL = 'ghp_review_assistant_fixture_not_a_real_secret';

/** The environment reference both catalogs write, which is never resolved (FR-026). */
const FIXTURE_ENVIRONMENT_REFERENCE = '${REVIEW_ASSISTANT_TOKEN}';

/** The plugin name both catalogs offer; the row that owns the comparison. */
const PLUGIN_NAME = 'review-assistant@acme-tools';

test.describe('the plugin comparison surface', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-plugin-comparison-'));

    // The catalog the editors read: current version, current source.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'acme-tools',
          owner: { name: 'Acme platform team' },
          plugins: [
            {
              name: 'review-assistant',
              description: 'Reviews a diff against the team checklist.',
              version: '2.1.0',
              source: './plugins/review-assistant',
              homepage: `https://acme.example/p?token=${FIXTURE_CREDENTIAL}`,
              env: { REVIEW_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
            },
            // Offered from one directory by both catalogs: one plugin whose
            // two carriers name the same root.
            { name: 'shared-tool', source: './plugins/shared-tool' },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The copy kept where Codex reads, drifted: a version behind, and still
    // pointing at the vendored snapshot.
    await mkdir(join(fixture, '.agents/plugins'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/plugins/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'acme-tools',
          owner: { name: 'Acme platform team' },
          plugins: [
            {
              name: 'review-assistant',
              description: 'Reviews a pull request against the team checklist.',
              version: '2.0.0',
              source: './vendor/review-assistant',
              homepage: `https://acme.example/p?token=${FIXTURE_CREDENTIAL}`,
              env: { REVIEW_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
            },
            { name: 'shared-tool', source: './plugins/shared-tool' },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await mkdir(join(fixture, 'plugins/shared-tool'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/shared-tool/plugin.json'),
      `${JSON.stringify({ name: 'shared-tool', version: '1.0.0' }, null, 2)}\n`,
      'utf8',
    );

    // Each root keeps the plugin's own manifest in the form its catalog's
    // reader looks for, so the comparison has a manifest on both sides.
    await mkdir(join(fixture, 'plugins/review-assistant/.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/review-assistant/.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'review-assistant', version: '2.1.0' }, null, 2)}\n`,
      'utf8',
    );
    await mkdir(join(fixture, 'vendor/review-assistant/.codex-plugin'), { recursive: true });
    await writeFile(
      join(fixture, 'vendor/review-assistant/.codex-plugin/plugin.json'),
      `${JSON.stringify({ name: 'review-assistant', version: '2.0.0' }, null, 2)}\n`,
      'utf8',
    );

    await mkdir(join(fixture, 'plugins/review-assistant/skills/checklist'), { recursive: true });
    await writeFile(
      join(fixture, 'plugins/review-assistant/skills/checklist/SKILL.md'),
      '---\nname: checklist\n---\n\nWalk the checklist.\n',
      'utf8',
    );
    await mkdir(join(fixture, 'vendor/review-assistant/skills/checklist'), { recursive: true });
    await writeFile(
      join(fixture, 'vendor/review-assistant/skills/checklist/SKILL.md'),
      '---\nname: checklist\n---\n\nWalk the checklist, then note the reviewer.\n',
      'utf8',
    );
    await writeFile(
      join(fixture, 'vendor/review-assistant/NOTICE.md'),
      '# Vendored copy\n\nTaken at 2.0.0.\n',
      'utf8',
    );
    // A name only the *second* compared copy ships: the side a one-sided
    // request must read is whichever one has the file, not always the first.
    await writeFile(
      join(fixture, 'plugins/review-assistant/README.md'),
      '# Current copy\n\nMaintained under plugins/.\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  /** Opens the comparison from the plugin row that offers it. */
  async function openComparison(page: import('@playwright/test').Page): Promise<void> {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    // The row's own link: the accessible name carries the plugin it compares,
    // which is what tells two comparable rows apart.
    await page
      .getByRole('link', { name: `Compare this plugin with another copy: ${PLUGIN_NAME}` })
      .click();
    await expect(page.getByRole('heading', { name: 'Compare plugins' })).toBeVisible();
  }

  test('compares the two declarations, each side as its own document', async ({ page }) => {
    await openComparison(page);

    // The row's name is the comparison's subject, and each side keeps its own
    // carrier: the path, what the file is to the plugin, and which products
    // read it.
    await expect(page.locator('body')).toContainText(PLUGIN_NAME);
    await expect(page.locator('body')).toContainText('.agents/plugins/marketplace.json');
    await expect(page.locator('body')).toContainText('.claude-plugin/marketplace.json');
    // Which products read each carrier, in the recognition table's cells: the
    // Codex catalog is the first file's alone, and the shared location the
    // second's is read by all three — so the table is where a product reading
    // one side and not the other can be stated at all.
    const rows = page.locator('.aci-recognition-table tbody tr');
    await expect(rows).toHaveCount(3);
    const copilot = rows.filter({ hasText: 'GitHub Copilot' });
    await expect(copilot.locator('td').nth(0)).toHaveText('Not recognized');
    await expect(copilot.locator('td').nth(1)).toContainText('Recognized');
    const claude = rows.filter({ hasText: 'Claude Code' });
    await expect(claude.locator('td').nth(0)).toHaveText('Not recognized');
    await expect(claude.locator('td').nth(1)).toContainText('Recognized');
    const codex = rows.filter({ hasText: 'OpenAI Codex' });
    await expect(codex.locator('td').nth(0)).toContainText('Recognized');

    // The Monaco diff holds both declarations: the values as JSON, the
    // credential whole and unmarked, the environment reference as its own
    // characters, and the two versions that drifted (FR-025, FR-026).
    const diff = page.locator('.aci-plugin-declaration-diff');
    await expect(diff).toBeVisible();
    await expect(diff).toContainText(FIXTURE_CREDENTIAL);
    await expect(diff).toContainText(FIXTURE_ENVIRONMENT_REFERENCE);
    await expect(diff).toContainText('2.1.0');
    await expect(diff).toContainText('2.0.0');

    // No verdict, no merge, no fix, and nothing that reveals a masked value.
    for (const forbidden of ['Reveal', 'Unmask', 'Merge', 'Apply', 'Fix', 'Accept', 'Revert']) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
    // The plugins' own manifests are compared beside the entries that offer
    // them, each named by the path it sits at — the pairing the detail page
    // shows for one plugin, shown here for two.
    const declarationPanel = page.locator('#aci-plugin-compare-panel-declaration');
    await expect(declarationPanel).toContainText(
      'vendor/review-assistant/.codex-plugin/plugin.json',
    );
    await expect(declarationPanel).toContainText(
      'plugins/review-assistant/.claude-plugin/plugin.json',
    );
    await expect(declarationPanel.locator('.aci-source-diff')).toBeVisible();

    // Runtime is stated as outside this repository, never as a fact about
    // either side (FR-009).
    await expect(page.locator('body')).toContainText(
      'installed, registered with a client, enabled, or trusted is state this product does not read',
    );
  });

  test('compares the files the two copies ship, by the name they share', async ({ page }) => {
    await openComparison(page);

    // The files are their own tab of the comparison, in the strip every other
    // surface uses; the compared file is a switcher inside it, the way the
    // skill comparison steps through one name's files. The options are the
    // names the two copies give their files, and one only a single copy ships
    // says so in its own label.
    await page.getByRole('tab', { name: /^Files/u }).click();
    const switcher = page.getByLabel('Compared file', { exact: true });
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText('skills/checklist/SKILL.md');
    await expect(switcher).toContainText('NOTICE.md (first plugin only)');
    // The panel is about a file, so it opens on one rather than on a state
    // asking the reader to choose — and on one both copies ship, which is a
    // comparison rather than an absence.
    await expect(switcher).toHaveValue('skills/checklist/SKILL.md');
    // Scoped to this panel: the declaration panel beside it diffs the two
    // plugins' own manifests, which is its own subject.
    const panel = page.locator('#aci-plugin-compare-panel-files');
    await expect(panel.locator('.aci-source-diff')).toBeVisible();

    await switcher.selectOption('skills/checklist/SKILL.md');
    // Choosing a file stays on the panel the choice was made in.
    await expect(page.getByRole('tab', { name: /^Files/u })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page).toHaveURL(/[?&]file=/u);
    // Both copies' complete sources, diffed under the declarations rather
    // than on a screen of their own: the vendored copy says one line more
    // than the current one.
    const fileDiff = panel.locator('.aci-source-diff');
    await expect(fileDiff).toBeVisible();
    await expect(fileDiff).toContainText('Walk the checklist');
    await expect(fileDiff).toContainText('then note the reviewer');
    // The declarations keep their own tab, and stepping back to it finds the
    // comparison the page opened on.
    await page.getByRole('tab', { name: /^Declaration/u }).click();
    await expect(page.locator('.aci-plugin-declaration-diff')).toBeVisible();

    // A file only one copy ships is compared against that copy's stated
    // absence: the existence difference is part of the comparison, and the
    // present side's complete content is what the diff holds (FR-011).
    await page.getByRole('tab', { name: /^Files/u }).click();
    await switcher.selectOption('NOTICE.md');
    await expect(panel).toContainText('Only the first plugin ships this file');
    await expect(panel.locator('.aci-source-diff')).toBeVisible();
    await expect(panel.locator('.aci-source-viewer')).toHaveCount(0);
    await expect(panel).toContainText('Vendored copy');

    // The same for a name only the second copy ships, with the absence on the
    // other side: the side that has it is read whichever side that is.
    await switcher.selectOption('README.md');
    await expect(panel).toContainText('Only the second plugin ships this file');
    await expect(panel.locator('.aci-source-diff')).toBeVisible();
    await expect(panel).toContainText('Maintained under plugins/');
    // What the live region announces is what the panel shows. A one-sided name
    // is rendered by the diff, so the sentence for bytes no reader shows must
    // not be announced over it — a reader holding focus on the picker would
    // otherwise hear that a file on screen cannot be displayed (WCAG 4.1.3).
    const liveRegion = page.locator('.aci-plugin-compare > .aci-live-region');
    await expect(liveRegion).toContainText('Comparison ready.');
    await expect(liveRegion).not.toContainText('is not text this product can show');
  });

  test('reads the one file two carriers name a single directory for', async ({ page }) => {
    // Two catalogs offering one plugin from one directory offer one file, not
    // two copies of it. The panel says so and reads the file through the
    // ordinary viewer: a diff of a file with itself shows a reader nothing,
    // and hiding the content would leave the panel with nothing to show.
    await page.goto(
      new URL(
        '/plugins/compare/repository?name=shared-tool%40acme-tools' +
          '&leftSource=repository&left=.agents%2Fplugins%2Fmarketplace.json' +
          '&rightSource=repository&right=.claude-plugin%2Fmarketplace.json',
        host.origin,
      ).href,
    );
    await page.getByRole('tab', { name: /^Files/u }).click();
    // Scoped to the files panel: the declaration panel beside it compares the
    // plugins' own manifests, which is its own subject.
    const panel = page.locator('#aci-plugin-compare-panel-files');
    await expect(panel).toContainText(
      'Both carriers name one directory, so this is one file rather than two copies of it.',
    );
    const viewer = panel.locator('.aci-source-viewer');
    await expect(viewer).toBeVisible();
    await expect(viewer).toContainText('"name": "shared-tool"');
    await expect(panel.locator('.aci-source-diff')).toHaveCount(0);
  });

  test('reports a link the model cannot express, and drops the content on leaving', async ({
    page,
  }) => {
    await openComparison(page);
    await expect(page.locator('body')).toContainText(PLUGIN_NAME);

    // Leaving the route drops what it requested: the inventory states what was
    // found and where, never what a declaration says (FR-027).
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page.locator('body')).not.toContainText(FIXTURE_CREDENTIAL);

    // A link naming one carrier twice is not a comparison, and is reported
    // rather than opened (FR-011).
    await page.goto(
      new URL(
        '/plugins/compare/repository?name=review-assistant%40acme-tools' +
          '&leftSource=repository&left=.claude-plugin%2Fmarketplace.json' +
          '&rightSource=repository&right=.claude-plugin%2Fmarketplace.json',
        host.origin,
      ).href,
    );
    await expect(page.locator('body')).toContainText('names the same file twice');
    await expect(page.locator('.aci-plugin-declaration-diff')).toHaveCount(0);
  });
});
