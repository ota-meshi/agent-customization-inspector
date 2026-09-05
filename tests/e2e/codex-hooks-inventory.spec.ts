// T837: browser acceptance for the Codex hook inventory (Phase 84). Launches
// the packaged CLI against a fixture carrying both documented hook forms at the
// one layer this product selects — the standalone `.codex/hooks.json` and the
// inline `[hooks]` table of the same `.codex/config.toml` — opens the printed
// loopback URL, and verifies the rendered rows (one per declared lifecycle
// event, each listing every declaration that declares it), the filters, the
// exclusions, and the absence of anything that would run a declared command.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Codex hooks declared by a repository layer', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-codex-hooks-'));
    await mkdir(join(fixture, '.codex/hooks'), { recursive: true });
    // The standalone carrier: a file whose whole purpose is hooks, with its
    // own top-level `description` beside the event map.
    await writeFile(
      join(fixture, '.codex/hooks.json'),
      `${JSON.stringify(
        {
          description: 'Repository lifecycle hooks.',
          hooks: {
            SessionStart: [
              {
                matcher: 'startup|resume',
                hooks: [
                  {
                    type: 'command',
                    command: 'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/notes.py"',
                    statusMessage: 'Loading session notes',
                  },
                ],
              },
            ],
            PreToolUse: [
              {
                matcher: '^Bash$',
                hooks: [{ type: 'command', command: './.codex/hooks/policy.py', timeout: 30 }],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The same layer's config document, whose inline `[hooks]` table declares
    // one event the standalone file also declares and one of its own: the case
    // the vendor loads from both forms rather than choosing between them.
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        'model = "gpt-5.4-codex"',
        '',
        '[[hooks.SessionStart]]',
        'matcher = "^compact$"',
        '',
        '[[hooks.SessionStart.hooks]]',
        'type = "command"',
        'command = "./.codex/hooks/compacted.py"',
        '',
        '[[hooks.UserPromptSubmit]]',
        '',
        '[[hooks.UserPromptSubmit.hooks]]',
        'type = "command"',
        'command = "./.codex/hooks/prompt.py"',
        '',
      ].join('\n'),
      'utf8',
    );
    // The handler scripts the declarations name, and one no declaration names:
    // a declared path gains no read authority and becomes no candidate, and an
    // unreferenced script is never inferred to be a hook.
    for (const script of ['notes.py', 'policy.py', 'compacted.py', 'prompt.py', 'orphan.py']) {
      await writeFile(join(fixture, '.codex/hooks', script), 'print("fixture")\n', 'utf8');
    }
    // A descendant layer, which belongs to a runtime working directory this
    // product never selects.
    await mkdir(join(fixture, 'packages/api/.codex'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.codex/hooks.json'),
      '{ "hooks": { "Stop": [] } }\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per declared event, each naming its carriers and their form', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    const items = panel.locator('.aci-item');
    // Three events across the two carriers: `SessionStart` from both,
    // `PreToolUse` from the standalone file, `UserPromptSubmit` from the inline
    // table. A second carrier declaring one event joins that event's row.
    await expect(items).toHaveCount(3);
    // The summary counts rows against the kind's own unfiltered inventory: a
    // kind whose total went unanswered would read "3 of 0" here. It is in the
    // rail beside the two filters it summarizes rather than around the panel,
    // so it is addressed on its own section. The unit is the kind's own — a
    // hooks row is one declared event — so the summary says `events` where
    // another kind's says what that kind counts by (`InventoryFilters.vue`).
    await expect(page.locator('.aci-inventory-filters')).toContainText('Showing 3 of 3 events');
    await expect(items.filter({ hasText: 'SessionStart' })).toHaveCount(1);
    await expect(items.filter({ hasText: 'PreToolUse' })).toHaveCount(1);
    await expect(items.filter({ hasText: 'UserPromptSubmit' })).toHaveCount(1);
    // The shared event's row lists both carriers, and each line says which
    // documented form its file is: a hook file of its own, or a table inside a
    // file admitted for other content too.
    const shared = items.filter({ hasText: 'SessionStart' });
    await expect(shared.getByRole('link', { name: /\.codex\/hooks\.json/u })).toHaveCount(1);
    await expect(shared.getByRole('link', { name: /\.codex\/config\.toml/u })).toHaveCount(1);
    await expect(shared).toContainText('hook file');
    await expect(shared).toContainText('declared inside another file');
    await expect(shared).toContainText('OpenAI Codex');
    // No row states a declared command: the values are the declaration's
    // detail, one file at a time (FR-027).
    await expect(panel).not.toContainText('notes.py');
    await expect(panel).not.toContainText('compacted.py');
  });

  test('lists no descendant layer, handler script, or unreferenced script', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // The declared handlers and the script beside them are not hook rows: a
    // declared path is authored text, and read authority comes from a matcher
    // alone (FR-020, FR-024).
    await expect(panel).not.toContainText('orphan.py');
    await expect(panel).not.toContainText('packages/api');
    // The descendant layer is not a candidate at all, so it appears in no
    // inventory and in no unrecognized list either — the walk never read it.
    await expect(page.locator('body')).not.toContainText('packages/api/.codex/hooks.json');
  });

  test('narrows the rows by path and by product, and offers no control that runs one', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // The path filter narrows to the carrier a reader names, which drops the
    // event only the other carrier declares.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('.codex/hooks.json');
    await expect(panel.locator('.aci-item')).toHaveCount(2);
    await expect(panel).not.toContainText('UserPromptSubmit');
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('');
    await expect(panel.locator('.aci-item')).toHaveCount(3);
    // Every declaration here is Codex's, so selecting that product keeps them
    // all and selecting another keeps none.
    await page.getByLabel('Tool', { exact: true }).selectOption('codex');
    await expect(panel.locator('.aci-item')).toHaveCount(3);
    // Nothing on the page runs, enables, or trusts a hook: an admission is not
    // an activation (FR-009, FR-020).
    for (const forbidden of [/^Run/u, /^Enable/u, /^Trust/u, /^Review/u]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });
});
