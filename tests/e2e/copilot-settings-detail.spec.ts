// T637: browser acceptance for the Copilot settings detail (Phase 62).
// Launches the packaged CLI against a fixture holding the supported Copilot
// settings documents, opens one from the settings tab, and verifies the
// complete literal detail: the document's whole authored source, a credential
// shown exactly as authored with no masking or reveal control, a literal
// environment reference never replaced by the process value a same-named
// variable carries in the host's own environment, and the absence of any
// control that would enable a plugin, invoke a hook, or connect anywhere.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTSETTINGSDETAIL00000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_SETTINGS_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Copilot settings detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-settings-detail-'));
    await mkdir(join(fixture, '.github/copilot'), { recursive: true });
    await writeFile(
      join(fixture, '.github/copilot/settings.json'),
      `${JSON.stringify(
        {
          enabledPlugins: { 'code-formatter@company-tools': true },
          extraKnownMarketplaces: {
            'company-tools': { source: { source: 'github', repo: 'your-org/marketplace' } },
          },
          statusLine: { type: 'command', command: './.github/copilot/statusline.sh' },
          env: { COPILOT_E2E_SETTINGS_DETAIL_ENDPOINT: ENVIRONMENT_REFERENCE },
          token: FIXTURE_SECRET,
          mcpServers: { db: { command: 'npx' } },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The configured target is never opened on the document's account.
    await writeFile(join(fixture, '.github/copilot/statusline.sh'), 'echo status\n', 'utf8');
    process.env['COPILOT_E2E_SETTINGS_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['COPILOT_E2E_SETTINGS_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the document from its row and shows its whole authored source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.github/copilot/settings.json' })
      .getByRole('link', { name: '.github/copilot/settings.json' })
      .first()
      .click();
    await expect(page).toHaveURL(
      /\/settings-and-configuration\/detail\/repository\/\.github\/copilot\/settings\.json$/u,
    );
    await expect(
      page.getByRole('heading', { name: '.github/copilot/settings.json' }),
    ).toBeVisible();

    const main = page.locator('main');
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('GitHub Copilot');
    await expect(attributes).toContainText('CLI');
    await expect(main).toContainText('Readable text');

    // The complete authored document, in the author's own key order, with the
    // credential whole and unmarked and the environment reference as the exact
    // characters that were written (FR-025, FR-026).
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(main).toContainText('"enabledPlugins"');
    await expect(main).toContainText('"extraKnownMarketplaces"');
    await expect(main).toContainText('./.github/copilot/statusline.sh');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    const text = await main.innerText();
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /apply|enable|install|activate|run|connect/iu }),
    ).toHaveCount(0);
    // A declared plugin, marketplace, or command is a value inside the text,
    // never a link.
    await expect(page.getByRole('link', { name: /company-tools|statusline/u })).toHaveCount(0);
  });

  test('gives the document no MCP row, whatever it spells', async ({ page }) => {
    // A settings file is a permanent MCP non-owner: an inline `mcpServers` map
    // is its own declared content, visible on this page and nowhere else.
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { name: /^MCP/u })).toHaveCount(0);
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.github/copilot/settings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText('"mcpServers"');
  });

  test('returns to the settings tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.github/copilot/settings.json',
        host.origin,
      ).toString(),
    );
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=settings%2Fconfig$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Settings / Config');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    // The general `.vscode/settings.json` and the CLI's `.github/lsp.json` are
    // documented exclusions: no row, so no detail.
    for (const path of [
      '/settings-and-configuration/detail/repository/.vscode/settings.json',
      '/settings-and-configuration/detail/repository/.github/lsp.json',
    ]) {
      await page.goto(new URL(path, host.origin).toString());
      await expect(page.locator('main')).toContainText(
        "Nothing in the current scan sits at this link's path.",
      );
      await expect(page.locator('.monaco-editor')).toHaveCount(0);
    }
  });
});
