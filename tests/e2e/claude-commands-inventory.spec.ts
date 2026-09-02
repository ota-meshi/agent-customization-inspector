// T443: browser acceptance for the Claude command inventory (Phase 40).
// Launches the packaged CLI against a fixture whose `.claude/commands/` carries
// command files at several depths, opens the printed loopback URL, and verifies
// the rendered rows — one per recognized command file, headed by its
// Source-relative Path with the recognizing product inside it — beside the
// filters, the near misses' absence, and the two exclusions this kind is
// defined by: a subdirectory `.claude/commands`, which no cited page documents
// a read of, and a standalone `.claude/prompts` directory, which FR-034 names.
//
// A row is one name a reader invokes, with the files that resolve it beneath
// it. Claude Code derives that name from the path — the file name without its
// extension, namespaced by the subdirectories between it and the command
// directory — because it ignores a `name` key in a command file, so two files
// sharing a file name in different namespaces are two rows rather than one.
//
// The root direct children of this tree also carry a Copilot recognition,
// because Copilot documents a read of the same location; what this suite owns
// is Claude's own reach, and the unified view is
// `commands-inventory.spec.ts`.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('command files under the root .claude/commands directory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-commands-'));
    await mkdir(join(fixture, '.claude/commands/frontend'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/commands/deploy.md'),
      '---\ndescription: Deploy the current branch\n---\n\n# Deploy\n',
      'utf8',
    );
    await writeFile(join(fixture, '.claude/commands/release.md'), '# Release\n', 'utf8');
    // A subdirectory is a command namespace, which is why the directory is
    // discovered recursively.
    await writeFile(
      join(fixture, '.claude/commands/frontend/component.md'),
      '# Component\n',
      'utf8',
    );
    // Two files sharing one name in different namespaces: two commands to the
    // vendor, two rows here, and neither row is named by a command name.
    await writeFile(join(fixture, '.claude/commands/frontend/deploy.md'), '# Deploy web\n', 'utf8');
    await mkdir(join(fixture, '.claude/commands/team/review'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/commands/team/review/security.md'),
      '# Security review\n',
      'utf8',
    );
    // The project command scope contributes at the selected root: no cited
    // page states an ancestor or lazy-descendant reach for this directory.
    await mkdir(join(fixture, 'packages/api/.claude/commands'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.claude/commands/deploy.md'), '# Nested\n', 'utf8');
    // FR-034: a standalone `.claude/prompts` directory is not a supported
    // Claude customization file type.
    await mkdir(join(fixture, '.claude/prompts'), { recursive: true });
    await writeFile(join(fixture, '.claude/prompts/deploy.md'), '# Prompt\n', 'utf8');
    // Near misses one segment away from the selector's literals.
    await mkdir(join(fixture, '.claude/command'), { recursive: true });
    await writeFile(join(fixture, '.claude/command/deploy.md'), 'singular\n', 'utf8');
    await writeFile(join(fixture, '.claude/commands/notes.md.bak'), 'suffix\n', 'utf8');
    // A Claude instruction file and Copilot's own: neither is a command, and
    // no `.claude` location this release leaves out gains a Copilot
    // recognition.
    await writeFile(join(fixture, '.claude/CLAUDE.md'), '# Project instructions\n', 'utf8');
    await mkdir(join(fixture, '.github'), { recursive: true });
    await writeFile(
      join(fixture, '.github/copilot-instructions.md'),
      '# Repository-wide instructions\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per command name, at every depth of the commands directory', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One row per name a reader invokes, in name order. A direct child is its
    // file name; a nested one carries the subdirectories as its namespace, so
    // the two `deploy.md` files are two rows.
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'deploy',
      'frontend:component',
      'frontend:deploy',
      'release',
      'team:review:security',
    ]);
    // Every row names Claude Code, at every depth: the recursion inside the
    // command directory is Claude's own.
    for (let index = 0; index < 5; index += 1) {
      await expect(items.nth(index).locator('.aci-source-family-blocks__members')).toContainText(
        'Claude Code',
      );
    }
    // A nested command is Claude's alone — Copilot documents no recursion —
    // so its row carries one definition naming one product.
    const nested = items.filter({ hasText: 'frontend:component' });
    await expect(nested.locator('.aci-source-family-blocks__members > li')).toHaveCount(1);
    await expect(nested.locator('.aci-source-family-blocks__members')).not.toContainText(
      'GitHub Copilot',
    );

    const definitionsText = await page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members')
      .allInnerTexts();
    expect(definitionsText.join(' ')).not.toContain('OpenAI Codex');

    const text = await page.locator('main').innerText();
    // The exclusions that define this kind's reach, and the ordinary near
    // misses beside them.
    expect(text).not.toContain('packages/api/.claude/commands/deploy.md');
    expect(text).not.toContain('.claude/prompts/deploy.md');
    expect(text).not.toContain('.claude/command/deploy.md');
    expect(text).not.toContain('notes.md.bak');
    // The file's content is the detail's, one file at a time.
    expect(text).not.toContain('Deploy the current branch');
  });

  test('keeps the instruction rows exactly as their own phases committed them', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['.claude/CLAUDE.md', '.github/copilot-instructions.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('/prompts-and-commands/detail/repository/');
  });

  test('narrows the command rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(5);

    // Tool: every command row here holds a Claude definition, so its own
    // selection keeps them all; Copilot's keeps only the root direct children
    // it recognizes. Codex is not offered at all — the option list holds the
    // products this inventory actually recognizes, and Codex documents no
    // command surface.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(5);
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-row-head__name')).toHaveText(['deploy', 'release']);
    await expect(page.getByLabel('Tool').locator('option')).not.toContainText(['OpenAI Codex']);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    // Path: a namespace is a directory in the row's own path, so filtering by
    // it is how a reader narrows to one namespace.
    await page
      .getByRole('searchbox', { name: 'Search names and paths' })
      .fill('commands/frontend/');
    await expect(items).toHaveCount(2);
    await expect(items.locator('.aci-row-head__name')).toHaveText([
      'frontend:component',
      'frontend:deploy',
    ]);
  });

  test('reports no file in no kind, because every near miss is a path no selector reaches', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // The excluded locations are not admitted bytes the scan could not use:
    // nothing reads them at all, so the entry that lists the files a `partial`
    // generation is missing has nothing in it (FR-028). The entry itself is
    // always in the rail — its membership rule is absence, so a reader has to
    // be able to ask — and its count is what says this fixture put nothing
    // there (`no-kind-disclosure.ts`).
    await expect(page.getByRole('tab', { name: 'Files in no kind 0' })).toBeVisible();
  });
});
