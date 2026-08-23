// T605: browser acceptance for the Claude settings inventory (Phase 59).
// Launches the packaged CLI against a fixture whose root `.claude/` holds the
// two documented project settings files, opens the printed loopback URL, and
// verifies the rendered rows — one per recognized file, headed by its
// Source-relative Path with the recognizing product and its surfaces inside
// it — beside the permission-policy rows the same physical files publish, the
// filters, the near misses' absence, and the absence of anything the documents
// declare.
//
// The exact admitted set, recognition shape, and read order are proven closer
// to the code (tests/unit/inspection); what is asserted here is what a user
// can see of them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDESETTINGS00000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_SETTINGS_ENDPOINT}';

test.describe('the Claude settings documents at the launch root', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-settings-'));
    await mkdir(join(fixture, '.claude'), { recursive: true });
    // The shared document: a declared policy beside the general settings that
    // are this row's subject. The credential and the environment reference are
    // authored text this file happens to contain; neither may reach a row, and
    // nothing resolves the reference against the process environment.
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          model: 'opus',
          permissions: { allow: ['Bash(npm run test:*)'], deny: [`Read(./${FIXTURE_SECRET}.env)`] },
          env: { CLAUDE_E2E_SETTINGS_ENDPOINT: ENVIRONMENT_REFERENCE },
          statusLine: { type: 'command', command: './.claude/statusline.sh' },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The personal document: its own row, because the row unit is the file.
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify({ permissions: { allow: ['Bash(git status)'] } }, null, 2)}\n`,
      'utf8',
    );
    // Near miss: the target the shared document names. A declared command
    // gains no read authority and becomes no candidate.
    await writeFile(join(fixture, '.claude/statusline.sh'), 'echo status\n', 'utf8');
    // Near miss: the project scope is the launch directory's own `.claude/`.
    await mkdir(join(fixture, 'packages/api/.claude'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.claude/settings.json'),
      '{ "model": "sonnet" }\n',
      'utf8',
    );
    // Near miss: the container and filename literals are exact.
    await writeFile(join(fixture, '.claude/settings.json.bak'), 'suffix\n', 'utf8');
    await writeFile(join(fixture, 'settings.json'), '{ "model": "sonnet" }\n', 'utf8');
    // The unchanged instruction row beside the new settings rows.
    await writeFile(join(fixture, 'CLAUDE.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per settings document, named by its path, with its product', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Both documented layers, in Source-relative Path order.
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-path')).toHaveText([
      '.claude/settings.json',
      '.claude/settings.local.json',
    ]);
    for (const index of [0, 1]) {
      await expect(items.nth(index).locator('.aci-settings-row__owner')).toContainText(
        'Claude Code',
      );
    }
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 2 of 2',
    );
    // Nothing the documents declare reaches the inventory, and nothing
    // resolves the environment reference. The near misses appear nowhere, and
    // no control offers to apply or enable a value.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('statusLine');
    expect(text).not.toContain('.claude/statusline.sh');
    expect(text).not.toContain('packages/api/.claude/settings.json');
    expect(text).not.toContain('settings.json.bak');
    await expect(page.getByRole('button', { name: /apply|enable|trust|activate/iu })).toHaveCount(
      0,
    );
  });

  test('publishes the permission-policy rows of the same files beside the settings rows', async ({
    page,
  }) => {
    // Two physical files, two subjects each: the `permissions` block inside is
    // the permissions inventory's row and the document is the settings row.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
  });

  test('narrows the settings rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Settings \/ Config/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);

    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);

    await page.getByLabel('Path contains').fill('local');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['.claude/settings.local.json']);

    await page.getByLabel('Path contains').fill('config.toml');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
  });
});
