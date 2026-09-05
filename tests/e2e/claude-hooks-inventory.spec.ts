// T861: browser acceptance for the Claude contained-hook inventory (Phase 86).
// Claude documents no standalone project hook file, so this suite launches the
// packaged CLI against a fixture whose hooks live only inside accepted owners —
// the two settings documents, a skill, a subagent, a plugin manifest, and the
// repository's own catalog — and verifies the rendered rows, the owner links,
// the filters, and the absence of any invented hook file.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Claude hooks declared inside accepted owners', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-hooks-'));
    await mkdir(join(fixture, '.claude/hooks'), { recursive: true });
    // The shared settings document, with a permission policy beside the hooks
    // so the one file keeps its three recognitions.
    await writeFile(
      join(fixture, '.claude/settings.json'),
      `${JSON.stringify(
        {
          permissions: { allow: ['Bash(git status)'] },
          hooks: {
            PreToolUse: [
              {
                matcher: 'Bash',
                hooks: [{ type: 'command', command: './.claude/hooks/block-rm.sh', timeout: 30 }],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    // A skill whose frontmatter registers a hook of its own.
    await mkdir(join(fixture, '.claude/skills/release-notes'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/skills/release-notes/SKILL.md'),
      [
        '---',
        'name: release-notes',
        'description: Draft release notes.',
        'hooks:',
        '  PreToolUse:',
        '    - matcher: Bash',
        '      hooks:',
        '        - type: command',
        '          command: ./scripts/security-check.sh',
        '---',
        '',
        'Draft the notes.',
        '',
      ].join('\n'),
      'utf8',
    );
    // A subagent whose frontmatter hooks run while it runs.
    await mkdir(join(fixture, '.claude/agents'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/agents/reviewer.md'),
      [
        '---',
        'name: reviewer',
        'description: Review a diff.',
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
    // The handler scripts the declarations name, and one no declaration names.
    for (const script of ['block-rm.sh', 'unreferenced.sh']) {
      await writeFile(join(fixture, '.claude/hooks', script), '#!/bin/sh\necho fixture\n', 'utf8');
    }
    // A fabricated standalone hook file: Claude documents no such location.
    await writeFile(join(fixture, '.claude/hooks.json'), '{ "hooks": { "Stop": [] } }\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists the settings declarations, and none another customization owns', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    const items = panel.locator('.aci-item');
    // One row, from the settings document: the skill and the subagent declare
    // hooks too, and theirs are part of what those customizations are — read on
    // their own pages rather than repeated here.
    await expect(items).toHaveCount(1);
    const preToolUse = items.filter({ hasText: 'PreToolUse' });
    await expect(preToolUse.getByRole('link', { name: /\.claude\/settings\.json/u })).toHaveCount(
      1,
    );
    await expect(preToolUse).toContainText('declared inside another file');
    await expect(preToolUse).toContainText('Claude Code');
    await expect(panel).not.toContainText('SKILL.md');
    await expect(panel).not.toContainText('reviewer.md');
    // No row names a hook file of its own: this vendor has none.
    await expect(panel).not.toContainText('hook file');
  });

  test('shows a skill\u2019s own frontmatter hooks on the skill page instead', async ({ page }) => {
    // The declaration is not lost by staying off the hook list: the skill's own
    // detail publishes the keys its file wrote, `hooks` among them (FR-007).
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Skill/u }).click();
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: /release-notes/u })
      .first()
      .click();
    await expect(page.locator('body')).toContainText('hooks');
    await expect(page.locator('body')).toContainText('security-check.sh');
  });

  test('invents no standalone hook file and infers none from a script', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // The fabricated `.claude/hooks.json` is no candidate at all, and neither
    // the declared handler nor the script beside it is inferred to be a hook
    // (FR-034).
    await expect(panel).not.toContainText('.claude/hooks.json');
    await expect(panel).not.toContainText('unreferenced.sh');
    await expect(panel).not.toContainText('block-rm.sh');
  });

  test('narrows the rows by path and offers no control that runs one', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Hook/u }).click();
    const panel = page.getByRole('tabpanel');
    // Narrowing to a path no hook carrier has empties the list; narrowing to
    // the settings document keeps its row.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('SKILL.md');
    await expect(panel.locator('.aci-item')).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('settings.json');
    await expect(panel.locator('.aci-item')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('');
    // Nothing on the page runs, enables, or trusts a hook (FR-009, FR-020).
    for (const forbidden of [/^Run/u, /^Enable/u, /^Trust/u, /^Review/u]) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
    }
  });
});
