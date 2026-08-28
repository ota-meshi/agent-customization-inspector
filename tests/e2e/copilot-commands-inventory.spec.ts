// T460: browser acceptance for the Copilot CLI command inventory (Phase 42).
// Launches the packaged CLI against a fixture whose `.claude/commands/` holds
// both root direct children and nested files, opens the printed loopback URL,
// and verifies what Copilot's own reach adds: a recognition on each root direct
// child beside Claude's, and none at all below the root.
//
// The narrowness is the claim. The CLI reference documents the location and
// neither a project anchor nor an ancestor or recursive walk, so anything past
// a root direct child would be this product's invention
// (contracts/vendors/github-copilot.md § Known conflicts and uncertainties
// item 3) — and the same files keep their Claude recognitions throughout.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('the Copilot CLI reading of root command files', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-commands-'));
    await mkdir(join(fixture, '.claude/commands/frontend'), { recursive: true });
    // Root direct children: the location Copilot documents, and the one place
    // the two products' derived names agree.
    await writeFile(
      join(fixture, '.claude/commands/deploy.md'),
      '---\ndescription: Deploy the current branch\n---\n\n# Deploy\n',
      'utf8',
    );
    await writeFile(join(fixture, '.claude/commands/release.md'), '# Release\n', 'utf8');
    // A malformed root child: its extraction fails once for the file, and both
    // products' definitions reference that one record (FR-028).
    await writeFile(
      join(fixture, '.claude/commands/broken.md'),
      '---\nallowed-tools: [Bash\n---\n\n# Broken\n',
      'utf8',
    );
    // Below the root: Claude's recursion reaches it and Copilot's rule does
    // not.
    await writeFile(
      join(fixture, '.claude/commands/frontend/component.md'),
      '# Component\n',
      'utf8',
    );
    // A subdirectory command directory: neither product documents a read of
    // one, so it reaches no row at all.
    await mkdir(join(fixture, 'packages/api/.claude/commands'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.claude/commands/deploy.md'), '# Nested\n', 'utf8');
    // Copilot names no product-home command directory, so nothing may reach
    // one.
    await mkdir(join(fixture, '.copilot/commands'), { recursive: true });
    await writeFile(join(fixture, '.copilot/commands/deploy.md'), '# Elsewhere\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('recognizes the root direct children and nothing below them', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // Narrowing to Copilot leaves exactly the root direct children — named by
    // their file names, because Copilot derives the command from the filename
    // and documents no namespace.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-prompt-row__name')).toHaveText([
      'broken',
      'deploy',
      'release',
    ]);
    for (const path of await items.locator('.aci-path').allInnerTexts()) {
      expect(path.split('/')).toHaveLength(3);
    }

    const text = await page.locator('main').innerText();
    expect(text).not.toContain('frontend:component');
    expect(text).not.toContain('packages/api/.claude/commands/deploy.md');
    expect(text).not.toContain('.copilot/commands/deploy.md');
  });

  test('leaves the Claude recognitions of the same files in place', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // A root direct child is one row naming both products: two documented
    // reads of one path are two recognitions of it, not a collision (FR-004).
    const shared = items.filter({ hasText: 'deploy' }).first();
    await expect(shared.locator('.aci-source-family-blocks__members > li')).toHaveCount(1);
    await expect(shared.locator('.aci-prompt-row__tool')).toHaveCount(2);
    await expect(shared.locator('.aci-source-family-blocks__members')).toContainText('Claude Code');
    await expect(shared.locator('.aci-source-family-blocks__members')).toContainText(
      'GitHub Copilot',
    );
    // Each definition states the surfaces its own admissions rest on, and
    // Copilot's command surface is the CLI alone.
    await expect(shared.locator('.aci-source-family-blocks__members')).toContainText('CLI');
    // The nested command keeps Claude's recognition and gains no Copilot one.
    const nested = items.filter({ hasText: 'frontend:component' });
    await expect(nested.locator('.aci-source-family-blocks__members > li')).toHaveCount(1);
    await expect(nested.locator('.aci-prompt-row__tool')).toHaveCount(1);
    await expect(nested.locator('.aci-source-family-blocks__members')).toContainText('Claude Code');
  });

  test('states the one extraction failure once per product on the shared file', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const broken = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: 'broken' });
    // One extraction per `(file, kind)` means one record, which every failed
    // definition of the file references (FR-028) — so the row's one item for
    // the file states it once, beside both products.
    await expect(broken.locator('.aci-source-family-blocks__members > li')).toHaveCount(1);
    await expect(broken.locator('.aci-prompt-row__tool')).toHaveCount(2);
    await expect(broken).toContainText('This file could not be parsed');
  });
});
