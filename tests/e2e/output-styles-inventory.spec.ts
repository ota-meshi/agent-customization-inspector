// T661: browser acceptance for the Claude output-style inventory (Phase 65).
// Launches the packaged CLI against a fixture whose `.claude/output-styles/`
// directory carries style files, opens the printed loopback URL, and verifies
// the rendered rows — one per style name a reader selects, each listing the
// file that resolves it with the recognizing product beside it — the filters,
// and the absence of the nested project layer and the spelling variants no
// selector reaches.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('output styles under the project .claude/output-styles directory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-output-styles-'));
    await mkdir(join(fixture, '.claude/output-styles'), { recursive: true });
    // A declared name that differs from the file name: the row is what the
    // settings picker shows, and the file is `diagrams.md`.
    await writeFile(
      join(fixture, '.claude/output-styles/diagrams.md'),
      [
        '---',
        'name: Diagrams first',
        'description: Lead every explanation with a diagram',
        'keep-coding-instructions: true',
        '---',
        '',
        'Start with a Mermaid diagram, then explain in prose.',
        '',
      ].join('\n'),
      'utf8',
    );
    // No `name` key: the vendor's documented fallback is the file name.
    await writeFile(
      join(fixture, '.claude/output-styles/code-review.md'),
      '---\ndescription: Review as a staff engineer would\n---\n\nLead with what matters most.\n',
      'utf8',
    );
    // The nested project layer the page documents and this Source boundary
    // excludes: it declares the same name, and the vendor resolves the
    // duplicate by proximity to a working directory this product never
    // observes.
    await mkdir(join(fixture, 'packages/api/.claude/output-styles'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.claude/output-styles/diagrams.md'),
      '---\nname: Diagrams first\n---\n\nNested layer.\n',
      'utf8',
    );
    // Near misses one segment away from the selector's literals, and a
    // subdirectory inside the styles directory, which the page's direct
    // children do not reach.
    await mkdir(join(fixture, '.claude/output-styles/team'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/output-styles/team/reviewer.md'),
      'nested inside\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude/output-style'), { recursive: true });
    await writeFile(join(fixture, '.claude/output-style/diagrams.md'), 'singular\n', 'utf8');
    await writeFile(join(fixture, '.claude/output-styles/notes.md.bak'), 'suffix\n', 'utf8');
    // A Claude instruction file beside the styles: it is not a style, and it
    // keeps the tree a repository rather than a directory of styles.
    await writeFile(join(fixture, '.claude/CLAUDE.md'), '# Project instructions\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists one row per style name, with the file and product inside it', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Output style/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Rows in name order: the declared name and the file-name fallback.
    await expect(items.locator('.aci-output-style-row__name')).toHaveText([
      'Diagrams first',
      'code-review',
    ]);
    await expect(items.locator('.aci-path')).toHaveText([
      '.claude/output-styles/diagrams.md',
      '.claude/output-styles/code-review.md',
    ]);
    for (let index = 0; index < 2; index += 1) {
      await expect(items.nth(index).locator('.aci-output-style-row__owner')).toContainText(
        'Claude Code',
      );
    }

    const text = await page.locator('main').innerText();
    // The nested layer, the subdirectory, and the spelling variants appear
    // nowhere, and no declared value beyond the row's own name reaches the
    // inventory — the file's content is the detail's, one file at a time.
    expect(text).not.toContain('packages/api/.claude/output-styles/diagrams.md');
    expect(text).not.toContain('team/reviewer.md');
    expect(text).not.toContain('.claude/output-style/diagrams.md');
    expect(text).not.toContain('notes.md.bak');
    expect(text).not.toContain('Lead every explanation with a diagram');
  });

  test('states no winner for the name two layers define', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Output style/u }).click();
    const panel = page.getByRole('tabpanel');
    const text = await panel.innerText();
    // The vendor's rule is the layer closest to the working directory, which
    // this product never observes — so no row states a selection, an order, or
    // a precedence (FR-009).
    for (const claim of ['closest', 'wins', 'takes precedence', 'selected', 'applied']) {
      expect(text.toLowerCase()).not.toContain(claim);
    }
  });

  test('keeps the instruction rows exactly as their own phases committed them', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual(['.claude/CLAUDE.md']);
    const instructionsText = await page.getByRole('tabpanel').innerText();
    expect(instructionsText).not.toContain('/output-styles/detail/repository/');
  });

  test('narrows the output-style rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Output style/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');
    await expect(items).toHaveCount(2);
    // The summary counts this kind's rows against this kind's own inventory:
    // a kind the page cannot count reads "of 0" while listing rows, which is
    // what a missing branch looks like from the reader's side.
    const summary = page.getByRole('status').filter({ hasText: 'Showing' });
    await expect(summary).toContainText('Showing 2 of 2');

    // Tool: one product recognizes this kind, so its own selection keeps both
    // rows and the filter offers no other option — the list is built from the
    // recognitions the snapshot actually holds.
    await expect(page.getByLabel('Tool').locator('option')).toHaveText([
      'All tools',
      'Claude Code',
    ]);
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    // Path: the filter applies to each definition's own file path.
    await page.getByLabel('Path contains').fill('code-review');
    await expect(items).toHaveCount(1);
    await expect(items.locator('.aci-output-style-row__name')).toHaveText(['code-review']);
    await expect(summary).toContainText('Showing 1 of 2');
  });
});
