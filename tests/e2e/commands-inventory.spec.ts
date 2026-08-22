// T479: browser acceptance for the unified command inventory (Phase 44). One
// tree, both products, one list: a root direct child of `.claude/commands/` is
// one row naming Claude Code and GitHub Copilot, and a command below the root
// is one row naming Claude Code alone.
//
// That difference is the phase's whole subject, and it is a difference in what
// the vendors document rather than one this product decided: Claude documents
// the recursion inside the command directory and Copilot documents neither an
// anchor nor a walk, so below the root only one of them has a read to state.
//
// The names differ there too, which is why the two rows are separate rows and
// not one: Claude prefixes a nested command with the subdirectories between it
// and the command directory, and a root direct child has none to prefix — the
// one place the two derivations agree, and therefore the one place a file
// reaches a single shared row.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('one command inventory for both products', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-commands-'));
    await mkdir(join(fixture, '.claude/commands/team/review'), { recursive: true });
    await writeFile(join(fixture, '.claude/commands/deploy.md'), '# Deploy\n', 'utf8');
    await writeFile(join(fixture, '.claude/commands/release.md'), '# Release\n', 'utf8');
    await mkdir(join(fixture, '.claude/commands/frontend'), { recursive: true });
    // Two files sharing one file name in different namespaces: two names, and
    // the nested one is Claude's alone.
    await writeFile(join(fixture, '.claude/commands/frontend/deploy.md'), '# Deploy web\n', 'utf8');
    await writeFile(
      join(fixture, '.claude/commands/team/review/security.md'),
      '# Security review\n',
      'utf8',
    );
    // Excluded on both sides: a subdirectory command directory and the
    // standalone prompts directory FR-034 names.
    await mkdir(join(fixture, 'packages/api/.claude/commands'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.claude/commands/deploy.md'), '# Nested\n', 'utf8');
    await mkdir(join(fixture, '.claude/prompts'), { recursive: true });
    await writeFile(join(fixture, '.claude/prompts/deploy.md'), '# Prompt\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists shared root commands and nested Claude-only commands in one list', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    await expect(items.locator('.aci-prompt-row__name')).toHaveText([
      'deploy',
      'frontend:deploy',
      'release',
      'team:review:security',
    ]);

    // The root direct children carry a definition from each product.
    for (const name of ['deploy', 'release']) {
      const row = items.filter({ hasText: name }).first();
      await expect(row.locator('.aci-prompt-row__definitions > li')).toHaveCount(2);
      await expect(row.locator('.aci-prompt-row__definitions')).toContainText('Claude Code');
      await expect(row.locator('.aci-prompt-row__definitions')).toContainText('GitHub Copilot');
    }
    // The nested ones carry Claude's alone.
    for (const name of ['frontend:deploy', 'team:review:security']) {
      const row = items.filter({ hasText: name });
      await expect(row.locator('.aci-prompt-row__definitions > li')).toHaveCount(1);
      await expect(row.locator('.aci-prompt-row__definitions')).not.toContainText('GitHub Copilot');
    }

    const text = await page.locator('main').innerText();
    expect(text).not.toContain('packages/api/.claude/commands/deploy.md');
    expect(text).not.toContain('.claude/prompts/deploy.md');
  });

  test('narrows to each product without changing what the other recognized', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // Claude's selection keeps every row, because Claude recognizes every
    // admitted command file in this tree.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(4);
    // Copilot's keeps the root direct children, and narrows the shared rows to
    // its own definition rather than dropping the other product's row.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-prompt-row__name')).toHaveText(['deploy', 'release']);
    for (const row of await items.all()) {
      await expect(row.locator('.aci-prompt-row__definitions > li')).toHaveCount(1);
      await expect(row.locator('.aci-prompt-row__definitions')).toContainText('GitHub Copilot');
    }

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(4);
  });

  test('opens one detail per file, whichever definition is followed', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const shared = page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ hasText: '.claude/commands/deploy.md' })
      .first();

    // The detail is addressed by the path alone: no per-tool fact
    // distinguishes what the page would show, so both definitions of one file
    // link to the same page (FR-030).
    await shared.getByRole('link', { name: 'Claude Code' }).click();
    await expect(page).toHaveURL(/\/prompts-and-commands\/\.claude\/commands\/deploy\.md$/u);
    await page.goBack();
    await shared.getByRole('link', { name: 'GitHub Copilot' }).click();
    await expect(page).toHaveURL(/\/prompts-and-commands\/\.claude\/commands\/deploy\.md$/u);
    // And the page states both products, because both recognize the file.
    await expect(page.locator('main')).toContainText('GitHub Copilot (CLI)');
    await expect(page.locator('main')).toContainText('Claude Code (CLI and IDE clients)');
  });
});
