// T422: browser acceptance for the Claude rule inventory (Phase 37). Launches
// the packaged CLI against a fixture whose `.claude/rules/` subtrees carry
// rule files, opens the printed loopback URL, and verifies the rendered rows —
// one per recognized rule file, at both documented recursions, headed by its
// Source-relative Path with the recognizing product inside it — beside the
// Codex permission policies the previous phases committed — which sit in
// their own tab, because a file deciding which commands may run is not the
// same thing as modular instructions — the filters, the near misses'
// absence, and the absence of any Copilot
// recognition at the `.claude` locations this release leaves out.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('rule files under the .claude/rules subtrees', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-rules-'));
    await mkdir(join(fixture, '.claude/rules/frontend'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/rules/api.md'),
      '---\npaths:\n  - "src/api/**/*.ts"\n---\n\n# API Development Rules\n',
      'utf8',
    );
    await writeFile(join(fixture, '.claude/rules/code-style.md'), '# Code style\n', 'utf8');
    // All `.md` files in a rules directory are discovered recursively.
    await writeFile(
      join(fixture, '.claude/rules/frontend/components.md'),
      '# Components\n',
      'utf8',
    );
    // A nested `.claude/rules/` loads on demand, which is a descendant
    // inventory rather than a guess at a session's working directory.
    await mkdir(join(fixture, 'packages/api/.claude/rules'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/.claude/rules/http.md'), '# HTTP\n', 'utf8');
    // Near misses one segment away from the selector's literals.
    await mkdir(join(fixture, '.claude/rule'), { recursive: true });
    await writeFile(join(fixture, '.claude/rule/style.md'), 'singular\n', 'utf8');
    await writeFile(join(fixture, '.claude/rules/notes.md.bak'), 'suffix\n', 'utf8');
    // The Codex rules the earlier phases committed, so one page shows both
    // vendors' rule files in one list.
    await mkdir(join(fixture, '.codex/rules'), { recursive: true });
    await writeFile(join(fixture, '.codex/rules/deploy.rules'), 'prefix_rule()\n', 'utf8');
    // A Claude instruction file beside the rules, and Copilot's own: neither
    // is a rule, and no `.claude` location this release leaves out gains a
    // Copilot recognition.
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

  test('lists the Claude rule files, at both documented recursions', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Rule/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // One row per recognized rule file, in Source-relative Path order. The
    // Codex file in this tree is a permission policy and is in its own tab:
    // deciding which commands may run is a different subject from modular
    // instructions, however alike the two vendors spell their directories.
    await expect(items.locator('.aci-path')).toHaveText([
      '.claude/rules/api.md',
      '.claude/rules/code-style.md',
      '.claude/rules/frontend/components.md',
      'packages/api/.claude/rules/http.md',
    ]);
    for (let index = 0; index < 4; index += 1) {
      await expect(items.nth(index).locator('.aci-rule-row__owner')).toContainText('Claude Code');
    }

    const text = await page.locator('main').innerText();
    // No `.claude` location this release leaves out becomes a Copilot
    // recognition: the rule rows name Claude Code alone.
    const toolsText = await page
      .getByRole('tabpanel')
      .locator('.aci-rule-row__owner')
      .allInnerTexts();
    expect(toolsText.join(' ')).not.toContain('GitHub Copilot');
    expect(toolsText.join(' ')).not.toContain('OpenAI Codex');
    // The near misses appear nowhere, and no declared value reaches the
    // inventory — the file's content is the detail's, one file at a time.
    expect(text).not.toContain('.claude/rule/style.md');
    expect(text).not.toContain('notes.md.bak');
    expect(text).not.toContain('src/api/**/*.ts');
  });

  test('lists the Codex permission policy in its own tab', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Permissions/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items.locator('.aci-path')).toHaveText(['.codex/rules/deploy.rules']);
    await expect(items.first().locator('.aci-permissions-row__owner')).toContainText(
      'OpenAI Codex',
    );
  });

  test('keeps the instruction rows exactly as their own phases committed them', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    // The Claude instruction file and Copilot's own, and no rule file.
    expect(paths).toEqual(['.claude/CLAUDE.md', '.github/copilot-instructions.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('/rules/detail/repository/');
  });

  test('narrows the rule rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Rule/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(4);

    // Tool: every rule row here is Claude's, so its own selection keeps them
    // all and another product's empties the tab.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(4);
    await page.getByLabel('Tool').selectOption('codex');
    await expect(items).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    // Path: the filter applies to the row's own path, which is its identity.
    await page.getByLabel('Path contains').fill('packages/api');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-path')).toHaveText(['packages/api/.claude/rules/http.md']);
  });
});
