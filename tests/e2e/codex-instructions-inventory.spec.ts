// T209/T1088: browser acceptance for the Codex instructions inventory
// (Phase 15). Launches the packaged CLI against an instruction-bearing
// fixture, opens the printed loopback URL, and verifies the rendered rows,
// filters, exclusions, and the activated configured fallbacks.
//
// The activated fallbacks carry this milestone's visible checkpoint: the
// fixture declares fallback basenames in `.codex/config.toml`, the
// configuration-read stage turns the declared names into scan targets, and
// the page lists the on-disk ones as instruction rows beside the static
// pair. The carrier itself is a configuration input only — this product
// never publishes or raw-displays `.codex/config.toml`, so no row, tab, or
// detail names it anywhere. Everything else — the exact admitted set,
// provenance, the two-stage read order — is proven closer to the code and is
// asserted here only as far as a user can see it.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EINSTRUCTIONS00000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CODEX_E2E_ENDPOINT}';

test.describe('instruction rows with an admitted carrier', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-instructions-'));
    await writeFile(
      join(fixture, 'AGENTS.override.md'),
      `# Override\n\ntoken: ${FIXTURE_SECRET}\nendpoint: ${ENVIRONMENT_REFERENCE}\n`,
      'utf8',
    );
    await writeFile(join(fixture, 'AGENTS.md'), '# Regular instructions\n', 'utf8');
    // A nested `AGENTS.md`: the chain Codex walks at runtime belongs to working
    // directories this product does not select, so Codex's own rule stays
    // anchored at the root and never lists it. Copilot's does list it — all
    // three of its surfaces document reaching a nested file — so the page
    // shows it as a Copilot row of its own range, and the Codex rows below
    // stay exactly what they were (T255).
    await mkdir(join(fixture, 'docs'), { recursive: true });
    await writeFile(join(fixture, 'docs/AGENTS.md'), '# nested instructions\n', 'utf8');
    // The configuration carrier declares one on-disk fallback and one absent
    // name: the on-disk file becomes an instruction row, the absent name
    // derives nothing, and the carrier itself is never published.
    await mkdir(join(fixture, '.codex'), { recursive: true });
    await writeFile(
      join(fixture, '.codex/config.toml'),
      'project_doc_fallback_filenames = ["TEAM_GUIDE.md", "ABSENT_GUIDE.md"]\n',
      'utf8',
    );
    await writeFile(join(fixture, 'TEAM_GUIDE.md'), '# configured fallback\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists the static pair and the configured fallback with their product', async ({ page }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order, so the tab is
    // selected on arrival.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Every Codex file sits at the Repository root, so they share the root's
    // one applicability range — the row's unit (data-model.md § Inventory
    // unit) — and the nested `AGENTS.md` Copilot alone recognizes has a row of
    // its own.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-instruction-row__range')).toHaveText(['**', 'docs/**']);
    // Files are in Source-relative Path order under each range, and each states
    // its recognizing product. The configured fallback the carrier declares
    // lists beside the static pair; the absent declared name derives nothing.
    // Which file a Codex session would select is runtime this product does not
    // project.
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['AGENTS.md', 'AGENTS.override.md', 'TEAM_GUIDE.md', 'docs/AGENTS.md']);
    const fileEntries = page.getByRole('tabpanel').locator('.aci-instruction-row__files > li');
    await expect(fileEntries).toHaveCount(4);
    for (const path of ['AGENTS.md', 'AGENTS.override.md', 'TEAM_GUIDE.md']) {
      await expect(
        fileEntries.filter({ has: page.getByText(path, { exact: true }) }),
      ).toContainText('OpenAI Codex');
    }
    // The shared root filename is Copilot's as well; the two Codex-only
    // spellings beside it are not, which is what keeps the shared row a
    // statement about the file rather than about the directory.
    await expect(
      fileEntries.filter({ has: page.getByText('AGENTS.md', { exact: true }) }),
    ).toContainText('GitHub Copilot');
    await expect(
      fileEntries.filter({ has: page.getByText('AGENTS.override.md', { exact: true }) }),
    ).not.toContainText('GitHub Copilot');
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('ABSENT_GUIDE.md');
  });

  test('never shows the carrier: no row, no tab, no mention', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    // The configuration input is not part of the inventory: the one kind tab
    // is Instructions, and the carrier's path appears nowhere on the page.
    await expect(page.getByRole('tab')).toHaveCount(1);
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('.codex/config.toml');
    expect(text).not.toContain('config.toml');
  });

  test('shows no authored source text', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    const text = await page.locator('main').innerText();
    // The inventory carries no `sourceText`, so a credential or an
    // environment reference in an authored instruction file cannot appear in
    // a list the user never opted into reading (FR-027) — and nothing ever
    // resolves the reference against any environment.
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('# Override');
    expect(text).not.toContain('# Regular instructions');
    expect(text).not.toContain('# configured fallback');
  });

  test('narrows the rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);

    const fileEntries = page.getByRole('tabpanel').locator('.aci-instruction-row__files > li');

    // Tool: OpenAI Codex keeps the three files at the root and drops the
    // nested one only Copilot recognizes, leaving the Codex rows exactly as
    // this phase committed them.
    await page.getByLabel('Tool').selectOption('codex');
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(1);
    await expect(fileEntries).toHaveCount(3);

    // Path composes over the same population, narrowing the files inside the
    // range rather than the range itself.
    await page.getByLabel('Path contains').fill('override');
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(1);
    await expect(fileEntries).toHaveCount(1);
    await expect(page.getByRole('tabpanel').locator('.aci-item').first()).toContainText(
      'AGENTS.override.md',
    );
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 2',
    );

    // Clearing restores every committed range and every file under it.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    await expect(fileEntries).toHaveCount(4);
  });
});

test.describe('the kind tab as URL state', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    // Both kinds present, so the default tab is Instructions and the Skill
    // tab is an explicit selection — the situation in which returning to the
    // inventory used to lose the user's place.
    fixture = await mkdtemp(join(tmpdir(), 'aci-kind-url-'));
    await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');
    await mkdir(join(fixture, '.agents/skills/greet'), { recursive: true });
    await writeFile(
      join(fixture, '.agents/skills/greet/SKILL.md'),
      '---\nname: greet\n---\n\nHi.\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('returns to the skill tab from a detail, by link and by browser Back', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    // Nothing was chosen yet, so the query names no kind: the tab in view is
    // the kind order's default, which is derived and never written here.
    await expect(page).not.toHaveURL(/kind=/u);

    // Selecting the Skill tab writes the choice into the URL, so leaving the
    // page cannot lose it.
    await page.getByRole('tab', { name: /Skill/u }).click();
    await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
    await expect(page).toHaveURL(/kind=skill/u);

    // Into the detail and back with the browser: the tab the user left is
    // the tab they return to.
    await page
      .getByRole('link', { name: /OpenAI Codex/u })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'greet' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');

    // And the detail page's own link names the kind it returns to.
    await page
      .getByRole('link', { name: /OpenAI Codex/u })
      .first()
      .click();
    await page.getByRole('link', { name: 'Back to the inventory' }).click();
    await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
  });
});

test.describe('a binary instruction candidate', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-instructions-binary-'));
    // A NUL byte makes the override binary: an admitted text candidate whose
    // bytes cannot be used is diagnostic-only and excluded from the kind's
    // rows while staying visible under its own facts (FR-025/FR-028).
    await writeFile(join(fixture, 'AGENTS.override.md'), Buffer.from([0x23, 0x00, 0xff]));
    await writeFile(join(fixture, 'AGENTS.md'), '# readable instructions\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('keeps the readable row and reports the binary file apart with its diagnostic', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // The instructions inventory lists the readable file alone.
    const kindRows = page.getByRole('tabpanel').locator('.aci-item');
    await expect(kindRows).toHaveCount(1);
    await expect(kindRows.first()).toContainText('AGENTS.md');
    await expect(kindRows.first()).not.toContainText('AGENTS.override.md');
    // The binary candidate is in no kind's inventory; its own row under
    // "Files in no kind" states its path and read outcome, which is what a
    // `partial` generation naming its cause looks like on this page.
    await expect(page.getByRole('heading', { name: 'Files in no kind' })).toBeVisible();
    const unclassified = page
      .locator('.aci-item')
      .filter({ hasText: 'AGENTS.override.md' })
      .first();
    await expect(unclassified).toContainText('Binary — recorded without source text');
  });
});
