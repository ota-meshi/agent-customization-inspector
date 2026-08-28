// T1111: browser acceptance for the Claude permission policy (Phase 39A).
// Launches the packaged CLI against a fixture whose root `.claude/` carries
// two settings files that declare a `permissions` block and one that declares
// none, and verifies what a reader sees: both vendors' policies in one
// permissions tab, a Claude policy opening as the block its carrier declares
// rather than the file that carries it, the settings keys around that block
// absent from the page, a credential and an environment reference shown
// exactly as authored, and a settings file declaring no policy reaching no
// permissions row.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared rule, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2EPERMISSIONS0000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_PERMISSIONS_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-permissions-sentinel-value';

/** A settings key outside the policy block, which no permissions surface may show. */
const UNRELATED_SETTINGS_MARKER = 'fixture-unrelated-announcement';

test.describe('the Claude permission policy a settings carrier declares', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-permissions-'));
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          permissions: {
            allow: ['Bash(npm run test:*)', `Read(./${FIXTURE_SECRET}.env)`],
            deny: [`WebFetch(domain:${ENVIRONMENT_REFERENCE})`],
          },
          companyAnnouncements: [UNRELATED_SETTINGS_MARKER],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // Admitted and readable, and no policy: no row, not an empty one.
    await writeFile(join(fixture, '.claude/settings.local.json'), '{ "model": "opus" }\n', 'utf8');
    // The other vendor's policy, whose whole document is the policy.
    await writeFile(
      join(fixture, '.codex/rules/deploy.rules'),
      'prefix_rule(pattern = ["git", "status"], action = "allow")\n',
      'utf8',
    );
    process.env['CLAUDE_E2E_PERMISSIONS_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_PERMISSIONS_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists both vendors’ policies and omits a carrier that declares none', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await expect(rows.locator('.aci-path')).toHaveText([
      '.claude/settings.json',
      '.codex/rules/deploy.rules',
    ]);
    await expect(
      rows.filter({ hasText: '.claude/settings.json' }).locator('.aci-permissions-row__owner'),
    ).toContainText('Claude Code');
    // The settings file that declares no policy is in no permissions row — the
    // exact row set above is what says so — because a policy nobody wrote is
    // not an empty policy. It is still the settings document it is, so the
    // settings tab lists it: which row a file appears under is decided by what
    // each recognition is about, not by the file.
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item .aci-path')).toHaveText([
      '.claude/settings.json',
      '.claude/settings.local.json',
    ]);
  });

  test('opens the declared block, and not the file that carries it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.claude/settings.json' })
      .getByRole('link', { name: '.claude/settings.json' })
      .click();
    await expect(page).toHaveURL(/\/permissions\/detail\/repository\/\.claude\/settings\.json$/u);
    const main = page.locator('main');
    await expect(main).toContainText('Claude Code (CLI and IDE clients) · Permissions');

    // The block the carrier declares, by the keys the file wrote: every rule
    // string exactly as authored, the credential whole and unmarked, and the
    // environment reference as its own characters.
    await expect(main).toContainText('allow');
    await expect(main).toContainText('Bash(npm run test:*)');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);

    const text = await main.innerText();
    // Never the process value a same-named variable carries.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // Never a settings key outside the block: those are the settings
    // recognition's content and reach no permissions response (FR-007).
    expect(text).not.toContain(UNRELATED_SETTINGS_MARKER);
    // Nothing states a decision, and no control applies or enforces one.
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /apply|enforce|evaluate|run/iu })).toHaveCount(0);
  });

  test('opens the other vendor’s policy as the whole document it is', async ({ page }) => {
    await page.goto(
      new URL('/permissions/detail/repository/.codex/rules/deploy.rules', host.origin).toString(),
    );
    const main = page.locator('main');
    await expect(main).toContainText('OpenAI Codex (Local clients) · Permissions');
    await expect(main).toContainText('prefix_rule');
    await expect(main).toContainText('Readable text');
  });
});
