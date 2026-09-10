// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// custom-command inventory. Launches the packaged CLI against a tree whose
// `.gemini/commands/` holds TOML command files at several depths, opens the
// printed loopback URL, and verifies the rendered rows — one per name a
// reader types after the `/`, the subdirectories joined with `:` — beside the
// filters, the malformed file's diagnostic, and the near misses' absence
// (spec.md FR-002, FR-006, FR-028).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Gemini CLI commands at every depth of the commands directory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-commands-'));
    await mkdir(join(fixture, '.gemini/commands/git'), { recursive: true });
    await mkdir(join(fixture, '.gemini/commands/review/security'), { recursive: true });
    await writeFile(
      join(fixture, '.gemini/commands/refactor.toml'),
      'description = "Refactor without changing behavior."\nprompt = "Refactor this. {{args}}"\n',
      'utf8',
    );
    // A namespaced command whose prompt embeds a shell block: source text a
    // scan reads and never runs (FR-019).
    await writeFile(
      join(fixture, '.gemini/commands/git/commit.toml'),
      'description = "Write a commit message."\nprompt = """\nStaged diff:\n!{git diff --cached}\n"""\n',
      'utf8',
    );
    await writeFile(
      join(fixture, '.gemini/commands/review/security/deps.toml'),
      'prompt = "Audit the dependency changes."\n',
      'utf8',
    );
    // Malformed TOML: the row keeps its path-derived name and carries the
    // parse diagnostic (FR-006, FR-028).
    await writeFile(
      join(fixture, '.gemini/commands/broken.toml'),
      'description = "unterminated\n',
      'utf8',
    );
    // Near misses: a Markdown sibling, the singular directory, a nested
    // commands directory, and a Claude command directory this vendor never
    // reads.
    await writeFile(join(fixture, '.gemini/commands/README.md'), '# commands\n', 'utf8');
    await mkdir(join(fixture, '.gemini/command'), { recursive: true });
    await writeFile(join(fixture, '.gemini/command/solo.toml'), 'prompt = "solo"\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.gemini/commands'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.gemini/commands/deploy.toml'),
      'prompt = "x"\n',
      'utf8',
    );
    // The unchanged instruction row beside the command rows.
    await writeFile(join(fixture, 'GEMINI.md'), '# instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per command name, the subdirectories joined with colons', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One row per name a reader invokes, in name order: a direct child is its
    // file name and a nested one carries its directories as the namespace,
    // with `.toml` dropped (FR-006).
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'broken',
      'git:commit',
      'refactor',
      'review:security:deps',
    ]);
    for (let index = 0; index < 4; index += 1) {
      await expect(items.nth(index).locator('.aci-source-family-blocks__members')).toContainText(
        'Gemini CLI',
      );
    }
    // Gemini CLI's alone: no other product reads `.gemini/commands/`.
    const definitionsText = (
      await page.getByRole('tabpanel').locator('.aci-source-family-blocks__members').allInnerTexts()
    ).join(' ');
    expect(definitionsText).not.toContain('Claude Code');
    expect(definitionsText).not.toContain('GitHub Copilot');
    expect(definitionsText).not.toContain('OpenAI Codex');

    // The malformed file keeps its row and states its diagnostic by kind.
    const broken = items.filter({ hasText: '.gemini/commands/broken.toml' });
    await expect(broken.locator('.aci-row-diagnostics__badge')).toHaveText('diagnostic');

    const text = await page.locator('main').innerText();
    for (const nearMiss of [
      '.gemini/commands/README.md',
      '.gemini/command/solo.toml',
      'packages/api/.gemini/commands/deploy.toml',
    ]) {
      expect(text, nearMiss).not.toContain(nearMiss);
    }
    // The file's content is the detail's, one file at a time: neither the
    // description nor the shell block reaches the list (FR-027).
    expect(text).not.toContain('Refactor without changing behavior.');
    expect(text).not.toContain('git diff --cached');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 4 of 4',
    );
  });

  test('keeps the instruction row exactly as its own phase committed it', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['GEMINI.md']);
    expect(await page.getByRole('tabpanel').innerText()).not.toContain('.gemini/commands/');
  });

  test('narrows the command rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(4);

    // Tool: the control offers the products that recognize something in
    // this tree — every command file is Gemini CLI's alone.
    await expect(page.getByLabel('Tool').locator('option')).toHaveText([
      'All tools',
      'GitHub Copilot',
      'Gemini CLI',
    ]);
    await page.getByLabel('Tool').selectOption('gemini');
    await expect(items).toHaveCount(4);
    // Copilot is offered for the root `GEMINI.md` it also reads, and
    // recognizes none of these files.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(0);
    await page.getByLabel('Tool').selectOption({ label: 'All tools' });

    // Path: the filter applies to each definition's own file path and to the
    // name, so the namespace is searchable as typed.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('git:commit');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-row-head__name')).toHaveText(['git:commit']);
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('no-such-command');
    await expect(items).toHaveCount(0);
    await expect(page.getByRole('tabpanel')).toContainText('match the current filters');

    await page.locator('.aci-empty-result').getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(4);
  });
});
