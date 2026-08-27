// T881: browser acceptance for the Copilot standalone hook inventory
// (Phase 88). Copilot is the one vendor that documents both forms at once, so
// this suite launches the packaged CLI against a fixture holding files of the
// root `.github/hooks/` directory beside settings documents that carry an
// inline block, and verifies the rendered rows, their surfaces and forms, the
// filters, and that nothing on the page runs a declaration.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Copilot hook files and the blocks inside settings', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-hooks-'));
    await mkdir(join(fixture, '.github/hooks/scripts'), { recursive: true });
    await mkdir(join(fixture, '.github/copilot'), { recursive: true });
    await mkdir(join(fixture, '.claude'), { recursive: true });
    // A hook file of the documented format: a version, a description, and the
    // event map the CLI spells in lowerCamelCase.
    await writeFile(
      join(fixture, '.github/hooks/security.json'),
      `${JSON.stringify(
        {
          version: 1,
          description: 'Repository policy hooks.',
          hooks: {
            preToolUse: [
              { type: 'command', bash: './.github/hooks/scripts/check-policy.sh', timeoutSec: 20 },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A second file of the same directory, declaring the same event: the
    // documented lookup loads both rather than choosing between them.
    await writeFile(
      join(fixture, '.github/hooks/format.json'),
      `${JSON.stringify(
        {
          version: 1,
          hooks: {
            preToolUse: [{ type: 'command', command: 'npx prettier --check .' }],
            postToolUse: [{ type: 'command', command: 'npx prettier --write .' }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The CLI's own settings document, whose top-level `hooks` is the inline
    // form, beside keys that belong to the settings row instead.
    await writeFile(
      join(fixture, '.github/copilot/settings.json'),
      `${JSON.stringify(
        {
          companyAnnouncements: ['Run the policy hooks before pushing.'],
          hooks: {
            sessionStart: [{ type: 'command', command: './.github/hooks/scripts/announce.sh' }],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // The cross-tool document, in the Claude format both products read.
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          hooks: {
            PreToolUse: [
              {
                matcher: 'Bash',
                hooks: [{ type: 'command', command: './.claude/hooks/guard.sh' }],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A custom agent whose frontmatter declares hooks of its own, and the
    // handler scripts the declarations name — neither is a hook row.
    await mkdir(join(fixture, '.github/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.github/agents/reviewer.md'),
      [
        '---',
        'name: reviewer',
        'hooks:',
        '  PostToolUse:',
        '    - type: command',
        '      command: ./.github/hooks/scripts/review-edit.sh',
        '---',
        '',
        'Review the diff.',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.github/hooks/scripts/check-policy.sh'),
      'echo policy\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.github/hooks/scripts/unreferenced.sh'),
      'echo unreferenced\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per declared event, each naming its carriers', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    const items = panel.locator('.aci-item');
    // Four events: `preToolUse` from both hook files, `postToolUse` from one of
    // them, `sessionStart` from the settings block, and the Claude-format
    // `PreToolUse`, which is a different key and therefore a different row.
    await expect(items).toHaveCount(4);
    const preToolUse = items.filter({ hasText: /^preToolUse/u });
    await expect(preToolUse.getByRole('link', { name: /security\.json/u })).toHaveCount(1);
    await expect(preToolUse.getByRole('link', { name: /format\.json/u })).toHaveCount(1);
    await expect(preToolUse).toContainText('hook file');
    // The inline block states the other form, and the cross-tool document is
    // one row with a declaration for each product that reads it.
    const sessionStart = items.filter({ hasText: 'sessionStart' });
    await expect(sessionStart).toContainText('declared inside another file');
    const claudeFormat = items.filter({ hasText: /^PreToolUse/u });
    await expect(claudeFormat).toContainText('GitHub Copilot');
    await expect(claudeFormat).toContainText('Claude Code');
  });

  test('leaves an agent’s own hooks off the list and on the agent page', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    // The agent declares hooks and publishes no hook row: the declaration is
    // part of what that agent is.
    await expect(page.getByRole('tabpanel')).not.toContainText('reviewer.md');
    // It is not lost by staying off the list: the agent's own detail publishes
    // every frontmatter key its file wrote (FR-007).
    await page.getByRole('tab', { name: /Agent/u }).click();
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: /reviewer\.md/u })
      .first()
      .click();
    await expect(page.locator('body')).toContainText('hooks');
    await expect(page.locator('body')).toContainText('review-edit.sh');
  });

  test('infers no hook from a script and offers no control that runs one', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // A declared handler gains no read authority, and a script no declaration
    // names is never inferred to be a hook (FR-004, FR-034).
    await expect(panel).not.toContainText('check-policy.sh');
    await expect(panel).not.toContainText('unreferenced.sh');
    // Narrowing by path keeps the rows whose carrier matches and empties the
    // list for a path no carrier has.
    await page.getByLabel('Path contains').fill('.github/hooks');
    await expect(panel.locator('.aci-item')).toHaveCount(2);
    await page.getByLabel('Path contains').fill('does-not-exist');
    await expect(panel.locator('.aci-item')).toHaveCount(0);
    await page.getByLabel('Path contains').fill('');
    // Nothing on the page runs, enables, or trusts a hook (FR-009, FR-020).
    for (const forbidden of [/^Run/u, /^Enable/u, /^Trust/u, /^Review/u]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });
});
