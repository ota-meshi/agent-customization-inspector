// T616: browser acceptance for the Claude settings detail (Phase 60). Launches
// the packaged CLI against a fixture whose root `.claude/` holds the two
// documented project settings files, opens one from the settings tab, and
// verifies the complete literal detail: the document's whole authored source
// with its key order intact, a credential shown exactly as authored with no
// masking or reveal control, a literal environment reference never replaced by
// the process value a same-named variable carries in the host's own
// environment, the read-outcome line, navigation back to the settings tab, and
// the dead-link state for a path this scan holds no settings row at.
//
// The permission-policy row of the same physical file is checked here too,
// from the other side: which detail answers for a file follows from the row it
// is reached through, so the policy page publishes the declared block without
// the keys around it while this page publishes the document (FR-007). A
// document strict JSON cannot read keeps its whole source here, with the
// failure its other readings recorded stated once on the page and on the row
// (T1225).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDESETTINGSDETAIL0000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_SETTINGS_DETAIL_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

/** A marker only the general settings carry, so the policy page must not show it. */
const SETTINGS_ONLY_MARKER = 'e2e-settings-only-marker';

test.describe('the complete literal Claude settings detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-settings-detail-'));
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          model: 'opus',
          cleanupPeriodDays: 20,
          permissions: { allow: [`Bash(deploy --token ${FIXTURE_SECRET})`] },
          env: { CLAUDE_E2E_SETTINGS_DETAIL_ENDPOINT: ENVIRONMENT_REFERENCE },
          companyAnnouncements: [SETTINGS_ONLY_MARKER],
          enabledPlugins: { 'formatter@marketplace': true },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify({ permissions: { allow: ['Bash(git status)'] } }, null, 2)}\n`,
      'utf8',
    );
    // The sentinel the product must never substitute for the authored
    // reference: the spawned CLI inherits this process environment.
    process.env['CLAUDE_E2E_SETTINGS_DETAIL_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_SETTINGS_DETAIL_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the document from its row and shows its whole authored source', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await rows
      .filter({ hasText: '.claude/settings.json' })
      .getByRole('link', { name: '.claude/settings.json' })
      .first()
      .click();
    await expect(page).toHaveURL(
      /\/settings-and-configuration\/detail\/repository\/\.claude\/settings\.json$/u,
    );
    await expect(page.getByRole('heading', { name: '.claude/settings.json' })).toBeVisible();

    const main = page.locator('main');
    // The product that recognizes the document and the surfaces its admitting
    // rules rest on, on the customization's own attribute line.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('Claude Code');
    await expect(attributes).toContainText('CLI and IDE clients');
    await expect(main).toContainText('Readable text');

    // The complete authored document, in the author's own key order: the
    // general settings that are this row's subject, the `permissions` block
    // that is the other row's, and the declared values with the credential
    // whole and unmarked and the environment reference as the exact characters
    // that were written (FR-025, FR-026).
    await expect(page.locator('.aci-source-viewer').first()).toBeVisible();
    await expect(main).toContainText('"cleanupPeriodDays": 20');
    await expect(main).toContainText(SETTINGS_ONLY_MARKER);
    await expect(main).toContainText('"enabledPlugins"');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    const text = await main.innerText();
    // Never the process value a same-named variable carries.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // No masking, reveal, or application control anywhere on the page.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /apply|enable|trust|activate|run/iu }),
    ).toHaveCount(0);
    // A declared plugin or command is a value inside the text, never a link.
    await expect(page.getByRole('link', { name: /formatter@marketplace/u })).toHaveCount(0);
  });

  test('publishes the declared block without the keys around it on the policy row', async ({
    page,
  }) => {
    // The other row of the one file: its subject is the declared policy, so
    // its detail publishes that block and never the settings around it.
    await page.goto(
      new URL('/permissions/detail/repository/.claude/settings.json', host.origin).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/settings.json' })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText(FIXTURE_SECRET);
    const text = await main.innerText();
    expect(text).not.toContain(SETTINGS_ONLY_MARKER);
    expect(text).not.toContain('cleanupPeriodDays');
  });

  test('returns to the settings tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.claude/settings.local.json',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/settings.local.json' })).toBeVisible();
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=settings%2Fconfig$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Settings / Config');
  });

  test('reports a link the current scan holds nothing at', async ({ page }) => {
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/packages/api/.claude/settings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "Nothing in the current scan sits at this link's path.",
    );
    await expect(page.locator('.aci-source-viewer')).toHaveCount(0);
  });
});

test.describe('a Claude settings document strict JSON cannot read', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-settings-malformed-'));
    await mkdir(join(fixture, '.claude'), { recursive: true });
    // A comment: Claude Code reads the permission policy and the hooks as
    // strict JSON, so both of its readings fail — two records of one code on
    // one file — while Copilot's JSONC reading of the hooks parses
    // (`parsers/json.ts` § acceptsComments).
    await writeFile(
      join(fixture, '.claude/settings.json'),
      [
        '{',
        '  // the editor host reads this pair as JSONC',
        '  "permissions": { "allow": ["Bash(git status)"] },',
        '  "hooks": {',
        '    "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "./g.sh" }] }]',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('shows the document whole and states the other readings’ failure once', async ({ page }) => {
    // This row reads nothing out, so its detail is the bytes their author
    // wrote whether or not a parser accepts them; the failures are the
    // document's other readings', and they are the file's, so the page states
    // them above the text — once, because both records say the same thing
    // (FR-028, T1225).
    await page.goto(
      new URL(
        '/settings-and-configuration/detail/repository/.claude/settings.json',
        host.origin,
      ).toString(),
    );
    await expect(page.getByRole('heading', { name: '.claude/settings.json' })).toBeVisible();
    const main = page.locator('main');
    await expect(main).toContainText('// the editor host reads this pair as JSONC');
    await expect(main.locator('li', { hasText: 'This file could not be parsed' })).toHaveCount(1);
    // The file itself was read, so nothing says it could not be.
    await expect(main).not.toContainText('could not be read');

    // The policy's own detail states its own reading's failure.
    await page.goto(
      new URL('/permissions/detail/repository/.claude/settings.json', host.origin).toString(),
    );
    await expect(page.locator('main')).toContainText(
      "This carrier's declared permissions could not be read.",
    );
  });

  test('marks its row once for the two records', async ({ page }) => {
    // The row states what the page states: the file's records, one badge for
    // one code (FR-028, T1225).
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const row = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.claude/settings.json' });
    const badges = row.locator('.aci-row-diagnostics__badge');
    await expect(badges).toHaveCount(1);
    await badges.click();
    await expect(row.locator('.aci-row-diagnostics__explanation')).toContainText(
      'This file could not be parsed',
    );
  });
});
