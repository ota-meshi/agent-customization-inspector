// T893: browser acceptance for the Copilot hook detail (Phase 89). The page a
// hook row leads to shows the declarations their author wrote — the handler
// commands, the OS-specific spellings, the literal credential and environment
// reference — for both documented forms, and offers nothing that runs, masks,
// or resolves any of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A credential-shaped literal a declaration carries, published as written. */
const SECRET = 'ghp_fixtureCopilotHookSecretValue0123';
/** An environment reference a declaration carries, never resolved (FR-026). */
const ENVIRONMENT_REFERENCE = '${COPILOT_FIXTURE_ENDPOINT}';

test.describe('Copilot hook detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-hook-detail-'));
    await mkdir(join(fixture, '.github/hooks'), { recursive: true });
    await mkdir(join(fixture, '.github/copilot'), { recursive: true });
    await writeFile(
      join(fixture, '.github/hooks/security.json'),
      `${JSON.stringify(
        {
          version: 1,
          description: 'Repository policy hooks.',
          hooks: {
            sessionStart: [
              {
                type: 'command',
                command: `curl -H "Authorization: Bearer ${SECRET}" ${ENVIRONMENT_REFERENCE}/session`,
                timeoutSec: 20,
              },
            ],
            preToolUse: [
              {
                type: 'command',
                bash: './scripts/check-policy.sh',
                powershell: 'pwsh -File scripts/check-policy.ps1',
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      join(fixture, '.github/copilot/settings.json'),
      `${JSON.stringify(
        {
          companyAnnouncements: ['Announcement the settings row publishes.'],
          hooks: {
            postToolUse: [{ type: 'command', command: 'npx prettier --write .' }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('shows a hook file’s declaration as authored, credential and reference literal', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'sessionStart' })
      .getByRole('link', { name: /security\.json/u })
      .click();
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      'sessionStart',
    );
    // A file whose whole purpose is hooks states that form, and its remaining
    // top-level keys are on this page because no other row publishes them.
    await expect(page.locator('.aci-detail-attributes')).toContainText('GitHub Copilot');
    await expect(page.locator('.aci-detail-attributes')).toContainText('hook file');
    const viewer = page.locator('.aci-source-viewer');
    await expect(viewer).toContainText(SECRET);
    await expect(viewer).toContainText(ENVIRONMENT_REFERENCE);
    // The other event of the same file is its own row and its own page, so this
    // one shows the declaration it names and not the neighbour's.
    await expect(page.locator('.aci-hook-detail')).not.toContainText('check-policy.ps1');
    for (const forbidden of [/mask/iu, /reveal/iu, /^Run/u, /resolve/iu]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
    // The carrier's own page — the same coordinate without an event — is where
    // the keys beside the event map are, because no other row publishes them
    // (FR-007).
    await page.goto(
      new URL('/hooks/detail/repository/.github%2Fhooks%2Fsecurity.json', host.origin).href,
    );
    await expect(page.locator('.aci-hook-detail')).toContainText('version');
    await expect(page.locator('.aci-hook-detail')).toContainText('Repository policy hooks.');
  });

  test('shows a settings block without the document around it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'postToolUse' })
      .getByRole('link', { name: /settings\.json/u })
      .click();
    await expect(page.locator('.aci-detail-attributes')).toContainText(
      'declared inside another file',
    );
    await expect(page.locator('.aci-source-viewer')).toContainText('npx prettier --write .');
    // The keys beside the block belong to the settings row of the same file
    // (FR-007), so they are not on this page.
    await expect(page.locator('.aci-hook-detail')).not.toContainText('companyAnnouncements');
    // They are a click away, on the row whose subject that document is.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: /settings\.json/u })
      .first()
      .click();
    await expect(page.locator('body')).toContainText('companyAnnouncements');
  });

  test('reports a hook coordinate the current scan does not hold', async ({ page }) => {
    // A nested file under the hook directory is admitted by nothing, so its
    // hook page is a dead coordinate whatever a reader types (FR-030).
    await page.goto(
      new URL('/hooks/detail/repository/.github%2Fhooks%2Fnested%2Fdeep.json', host.origin).href,
    );
    await expect(page.locator('.aci-subject-unavailable')).toContainText('current scan');
    await page.getByRole('link', { name: /Return to the inventory/u }).click();
    await expect(page.getByRole('tab', { name: /Hook/u })).toHaveAttribute('aria-selected', 'true');
  });
});
