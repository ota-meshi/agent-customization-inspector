// T872: browser acceptance for the Claude contained-hook detail (Phase 87).
// Opens the declaration a settings document carries — the one Claude owner
// whose hooks are a row of this kind — and verifies that it is shown exactly as
// authored with nothing masked, resolved, or run, while a catalog entry's hooks
// stay on the plugin row that owns them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A credential shape no environment can resolve; it must reach the page as written. */
const SECRET = 'ghp_FIXTURE000000000000000000000000000000';

/** An environment reference the page must show as characters, never as a value. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_HOOK_ENDPOINT}';

test.describe('Claude hook declarations opened one at a time', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-hook-detail-'));
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          permissions: { allow: ['Bash(git status)'] },
          hooks: {
            SessionStart: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: `curl -H "Authorization: Bearer ${SECRET}" ${ENVIRONMENT_REFERENCE}/session`,
                    statusMessage: 'Announcing the session',
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The personal settings document beside it, declaring no hook at all: the
    // hook inventory leaves such a carrier off its list — every configured
    // repository would otherwise get a row saying its settings declare no
    // hooks — while the carrier itself is a hook candidate this scan holds.
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify({ model: 'opus' }, null, 2)}\n`,
      'utf8',
    );
    // A catalog whose two entries declare one event each, one of them the event
    // the settings document declares too.
    await mkdir(join(fixture, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(fixture, '.claude-plugin/marketplace.json'),
      `${JSON.stringify(
        {
          name: 'inspector-examples',
          owner: { name: 'Inspector Examples' },
          plugins: [
            {
              name: 'formatter',
              source: './plugins/formatter',
              hooks: {
                PostToolUse: [
                  {
                    matcher: 'Write|Edit',
                    hooks: [{ type: 'command', command: './scripts/format.sh' }],
                  },
                ],
              },
            },
            {
              name: 'guard',
              source: './plugins/guard',
              hooks: {
                PostToolUse: [{ hooks: [{ type: 'command', command: './scripts/guard.sh' }] }],
              },
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    for (const plugin of ['formatter', 'guard']) {
      await mkdir(join(fixture, `plugins/${plugin}/.claude-plugin`), { recursive: true });
      await writeFile(
        join(fixture, `plugins/${plugin}/.claude-plugin/plugin.json`),
        `${JSON.stringify({ name: plugin, version: '0.1.0' }, null, 2)}\n`,
        'utf8',
      );
    }
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('shows a settings declaration as authored, credential and reference literal', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'SessionStart' })
      .getByRole('link', { name: /\.claude\/settings\.json/u })
      .click();
    await expect(page.locator('.aci-hook-detail').getByRole('heading', { level: 2 })).toHaveText(
      'SessionStart',
    );
    // Claude declares hooks only inside an accepted artifact, which the caption
    // states; the keys beside the declaration belong to that file's other rows.
    await expect(page.locator('.aci-hook-detail__recognition')).toContainText('Claude Code');
    await expect(page.locator('.aci-hook-detail__recognition')).toContainText(
      'declared inside another file',
    );
    const viewer = page.locator('.aci-source-viewer');
    await expect(viewer).toContainText(SECRET);
    await expect(viewer).toContainText(ENVIRONMENT_REFERENCE);
    await expect(viewer).toContainText('Announcing the session');
    // The permission policy of the same file is not on this page: it is that
    // file's own other row (FR-007).
    await expect(page.locator('body')).not.toContainText('Bash(git status)');
    for (const forbidden of [/mask/iu, /reveal/iu, /^Run/u, /resolve/iu]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });

  test('leaves a catalog entry\u2019s hooks to the plugin row that owns them', async ({ page }) => {
    // A marketplace entry may carry hook configuration for the plugin it
    // offers. That declaration is the plugin's: the plugin row publishes the
    // entry's own fields, so the catalog is no hook carrier and its hook page
    // is a dead coordinate.
    await page.goto(
      new URL('/hooks/detail/repository/.claude-plugin%2Fmarketplace.json', host.origin).href,
    );
    await expect(page.locator('.aci-error')).toContainText('current scan');
    // The declaration itself is a click away, under the plugin it belongs to.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Plugin/u }).click();
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: 'formatter' })
      .getByRole('link', { name: /marketplace\.json/u })
      .first()
      .click();
    await expect(page.locator('body')).toContainText('hooks');
    await expect(page.locator('body')).toContainText('format.sh');
    await expect(page.getByRole('button', { name: /^Run/u })).toHaveCount(0);
  });

  test('answers for a held carrier that declares no hook, and only then reports a dead link', async ({
    page,
  }) => {
    // The carrier view's subject is the file, and this scan holds a hook
    // candidate at it: the page states what the read produced — no
    // declaration — rather than calling the path one this scan does not have
    // (contracts/http-api.md § get-hook-carrier-detail). The inventory lists
    // it nowhere, which is why the page cannot take the answer from there.
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    await expect(page.getByRole('tabpanel')).not.toContainText('settings.local.json');

    await page.goto(
      new URL('/hooks/detail/repository/.claude%2Fsettings.local.json', host.origin).href,
    );
    await expect(page.locator('.aci-hook-detail__recognition')).toContainText(
      'declared inside another file',
    );
    await expect(page.locator('.aci-hook-detail')).toContainText('This file declares no hooks.');
    await expect(page.locator('.aci-error')).toHaveCount(0);

    // A declaration link into that same carrier is the dead link, and it says
    // which of the two it is: the file is held, the name it asks for is not.
    await page.goto(
      new URL(
        '/hooks/detail/repository/.claude%2Fsettings.local.json?event=SessionStart',
        host.origin,
      ).href,
    );
    await expect(page.locator('.aci-error')).toContainText(
      'No hook declaration named this way is published for this file in the current scan.',
    );
  });

  test('reports a link the current scan does not hold, and offers a way back', async ({ page }) => {
    // Claude documents no standalone hook file, so `/hooks/.claude/hooks.json`
    // is a dead coordinate whatever a reader types (FR-030).
    await page.goto(new URL('/hooks/detail/repository/.claude%2Fhooks.json', host.origin).href);
    await expect(page.locator('.aci-error')).toContainText('current scan');
    await page.getByRole('link', { name: /Return to the inventory/u }).click();
    await expect(page.getByRole('tab', { name: /Hook/u })).toHaveAttribute('aria-selected', 'true');
  });
});
