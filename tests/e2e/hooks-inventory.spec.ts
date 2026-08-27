// T904: browser acceptance for the unified hook inventory (Phase 90). Launches
// the packaged CLI against one repository whose hooks reach it every way the
// three products document — a file whose whole purpose is hooks, the inline
// table of a config layer, and the settings documents two products read — and
// verifies the consolidated rows: one per declared event, each listing every
// carrier that declares it with the form and the surfaces of each declaration,
// beside the filters, the exclusions, and the absence of any control that would
// run one.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('the unified hook inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-unified-hooks-'));
    await mkdir(join(fixture, '.codex/hooks'), { recursive: true });
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await mkdir(join(fixture, '.github/hooks'), { recursive: true });
    // Codex's standalone form, declaring the event every other carrier declares
    // too.
    await writeFile(
      join(fixture, '.codex/hooks.json'),
      `${JSON.stringify(
        {
          description: 'Repository lifecycle hooks.',
          hooks: {
            SessionStart: [
              {
                matcher: 'startup',
                hooks: [{ type: 'command', command: './.codex/hooks/session_start.py' }],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The inline table of the same layer, which Codex loads beside the file
    // rather than instead of it.
    await writeFile(
      join(fixture, '.codex/config.toml'),
      [
        'model = "gpt-5.4-codex"',
        '',
        '[[hooks.SessionStart]]',
        'matcher = "^resume$"',
        '',
        '[[hooks.SessionStart.hooks]]',
        'type = "command"',
        'command = "./.codex/hooks/session_start.py"',
        '',
      ].join('\n'),
      'utf8',
    );
    // The shared settings document: one physical file, one read, and a hook
    // declaration for each product that documents reading it.
    await writeFile(
      join(fixture, '.claude/settings.local.json'),
      `${JSON.stringify(
        {
          hooks: {
            SessionStart: [
              { hooks: [{ type: 'command', command: './.claude/hooks/announce.sh' }] },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A Copilot hook file, in that product's own event spelling.
    await writeFile(
      join(fixture, '.github/hooks/security.json'),
      `${JSON.stringify(
        {
          version: 1,
          hooks: {
            preToolUse: [{ type: 'command', bash: './.github/hooks/scripts/check-policy.sh' }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A subagent whose frontmatter hooks are part of what that agent is, and
    // the handler scripts the declarations name.
    await writeFile(
      join(fixture, '.claude/agents/reviewer.md'),
      [
        '---',
        'name: reviewer',
        'hooks:',
        '  PostToolUse:',
        '    - matcher: Edit',
        '      hooks:',
        '        - type: command',
        '          command: ./scripts/review-edit.sh',
        '---',
        '',
        'Review the diff.',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(join(fixture, '.codex/hooks/session_start.py'), 'print("hook")\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('makes one row of an event every product declares, listing each carrier', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    const items = panel.locator('.aci-item');
    // Two events: `SessionStart`, declared by four carriers across three
    // products, and Copilot's `preToolUse`, which is its own row because a row
    // is the key its carrier wrote.
    await expect(items).toHaveCount(2);
    const sessionStart = items.filter({ hasText: /^SessionStart/u });
    for (const carrier of [
      '.codex/hooks.json',
      '.codex/config.toml',
      '.claude/settings.local.json',
    ]) {
      await expect(sessionStart.getByRole('link', { name: carrier })).toHaveCount(1);
    }
    // The shared document is one file with a declaration per product, and the
    // Codex layer contributes both of its documented forms.
    await expect(sessionStart).toContainText('OpenAI Codex');
    await expect(sessionStart).toContainText('Claude Code');
    await expect(sessionStart).toContainText('GitHub Copilot');
    await expect(sessionStart).toContainText('hook file');
    await expect(sessionStart).toContainText('declared inside another file');
    // The subagent's own declarations stay on its own row, and no script is
    // inferred to be a hook (FR-034).
    await expect(panel).not.toContainText('reviewer.md');
    await expect(panel).not.toContainText('session_start.py');
  });

  test('narrows the rows by tool and by path, and clears back', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // The tool filter keeps the rows a product declares: Copilot declares both
    // events here — the shared settings document is its carrier too.
    await page.getByLabel('Tool', { exact: true }).selectOption('codex');
    await expect(panel.locator('.aci-item')).toHaveCount(1);
    await page.getByLabel('Tool', { exact: true }).selectOption('');
    await expect(panel.locator('.aci-item')).toHaveCount(2);
    // The path box is a substring match over the carriers' own paths.
    await page.getByLabel('Path contains').fill('.github/hooks');
    await expect(panel.locator('.aci-item')).toHaveCount(1);
    await page.getByRole('button', { name: /Clear filters/u }).click();
    await expect(panel.locator('.aci-item')).toHaveCount(2);
  });

  test('is operable from the keyboard and offers no control that runs a hook', async ({ page }) => {
    await page.goto(host.origin);
    // The tab strip and the filters are native controls, so the keyboard
    // reaches them without custom ARIA
    // (contracts/accessibility-acceptance.md).
    const hookTab = page.getByRole('tab', { name: /Hook/u });
    await hookTab.press('Enter');
    await expect(hookTab).toHaveAttribute('aria-selected', 'true');
    const pathBox = page.getByLabel('Path contains');
    await pathBox.press('.');
    await expect(pathBox).toBeFocused();
    await page.getByRole('button', { name: /Clear filters/u }).press('Enter');
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    // Nothing on the page runs, enables, or trusts a hook (FR-009, FR-020).
    for (const forbidden of [/^Run/u, /^Enable/u, /^Trust/u, /^Review/u]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });
});
