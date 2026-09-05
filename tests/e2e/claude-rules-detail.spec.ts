// T432: browser acceptance for the Claude rule detail (Phase 38). Launches the
// packaged CLI against a fixture whose `.claude/rules/` carries rule files,
// opens one from the rule tab, and verifies the complete literal detail: the
// whole authored document — frontmatter block included, because a rule is
// read as one file rather than split into declarations and a body — with its
// `paths` shown as the characters that were written and never evaluated
// against a filesystem path, a credential shown exactly as authored with no
// masking or reveal control, a literal environment reference never replaced
// by the process value a same-named variable carries, and navigation back to
// the rule tab.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in a declared value, shown whole and unmasked. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDERULE000000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_RULE_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

test.describe('the complete literal Claude rule detail', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-rules-detail-'));
    await mkdir(join(fixture, '.claude/rules'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/rules/api.md'),
      [
        '---',
        'paths:',
        '  - "src/api/**/*.ts"',
        '  - "lib/**/*.{ts,tsx}"',
        `token: ${FIXTURE_SECRET}`,
        `endpoint: "${ENVIRONMENT_REFERENCE}"`,
        '---',
        '',
        '# API Development Rules',
        '',
        '- All API endpoints must include input validation',
        '',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(fixture, '.claude/rules/plain.md'),
      '# Plain\n\n- No frontmatter.\n',
      'utf8',
    );
    // A file two kinds recognize: `CLAUDE.md` is a Claude instruction file at
    // every depth and this one sits under `.claude/rules/`, so it is a row in
    // both inventories and each row links to its own kind's detail route.
    await writeFile(
      join(fixture, '.claude/rules/CLAUDE.md'),
      '# Shared\n\n- Recognized as both.\n',
      'utf8',
    );
    // The directories the declared globs name do not exist, and nothing
    // creates or enumerates them: a `paths` value is shown, never run.
    process.env['CLAUDE_E2E_RULE_ENDPOINT'] = ENVIRONMENT_SENTINEL;
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    delete process.env['CLAUDE_E2E_RULE_ENDPOINT'];
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('opens the file from its row and shows the whole document', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Rule/u }).click();
    const rows = page.getByRole('tabpanel').locator('.aci-item');
    await rows
      .filter({ hasText: '.claude/rules/api.md' })
      .getByRole('link', { name: '.claude/rules/api.md' })
      .click();
    await expect(page).toHaveURL(/\/rules\/detail\/repository\/\.claude\/rules\/api\.md$/u);
    await expect(page.getByRole('heading', { name: '.claude/rules/api.md' })).toBeVisible();

    const main = page.locator('main');
    // The product that recognizes the file and the surfaces its admitting rules
    // rest on, on the customization's own attribute line.
    const attributes = page.locator('.aci-detail-attributes');
    await expect(attributes).toContainText('Claude Code');
    await expect(attributes).toContainText('CLI and IDE clients');
    await expect(main).toContainText('Readable text');
    // One document, not two halves: the frontmatter delimiters and the
    // instructions after them are on one screen, in the order the file has
    // them, with no tab strip splitting the file the author wrote as one.
    await expect(page.getByRole('tab', { name: 'File' })).toHaveCount(0);
    await expect(main).toContainText('---');
    await expect(main).toContainText('paths');
    // The globs exactly as authored, brace groups unexpanded, because nothing
    // here expands or matches one; the credential whole and unmarked beside
    // them.
    await expect(main).toContainText('src/api/**/*.ts');
    await expect(main).toContainText('lib/**/*.{ts,tsx}');
    await expect(main).toContainText(FIXTURE_SECRET);
    await expect(main).toContainText(ENVIRONMENT_REFERENCE);
    await expect(main).toContainText('All API endpoints must include input validation');

    const text = await main.innerText();
    // Never the process value a same-named variable carries.
    expect(text).not.toContain(ENVIRONMENT_SENTINEL);
    // Nothing states which files the globs would match, and no control masks,
    // reveals, or applies anything.
    expect(text).not.toContain('matches');
    await expect(page.getByRole('button', { name: /mask|reveal|show|hide/iu })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /apply|enforce|evaluate|run/iu })).toHaveCount(0);
  });

  test('opens the rule detail of a file another kind also recognizes', async ({ page }) => {
    // `.claude/rules/CLAUDE.md` holds two recognitions — a Claude rule by its
    // directory and a Claude instruction file by its name — while a detail is
    // addressed by the path alone, so `get-file-detail` answers with whichever
    // variant its fixed order reaches first. The rule row still links here, so
    // this page shows the document rather than reporting a failed load.
    await page.goto(
      new URL('/rules/detail/repository/.claude/rules/CLAUDE.md', host.origin).toString(),
    );
    const main = page.locator('main');
    await expect(page.getByRole('heading', { name: '.claude/rules/CLAUDE.md' })).toBeVisible();
    await expect(page.locator('.aci-detail-attributes')).toContainText('Claude Code');
    await expect(main).toContainText('Recognized as both.');
    await expect(main).not.toContainText('could not be loaded');
  });

  test('shows a rule with no frontmatter as the document it is', async ({ page }) => {
    await page.goto(
      new URL('/rules/detail/repository/.claude/rules/plain.md', host.origin).toString(),
    );
    const main = page.locator('main');
    await expect(main).toContainText('# Plain');
    await expect(main).toContainText('No frontmatter.');
    // Nothing says the file declares none: there is no declaration surface to
    // report an absence on.
    expect(await main.innerText()).not.toContain('declares none');
  });

  test('returns to the rule tab it was opened from', async ({ page }) => {
    await page.goto(
      new URL('/rules/detail/repository/.claude/rules/plain.md', host.origin).toString(),
    );
    await page.getByRole('link', { name: /Back to /u }).click();
    await expect(page).toHaveURL(/\?kind=rule$/u);
    await expect(page.getByRole('tab', { selected: true })).toContainText('Rule');
  });
});

test.describe('a Claude rule whose frontmatter is malformed', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-rules-detail-broken-'));
    await mkdir(join(fixture, '.claude/rules'), { recursive: true });
    await writeFile(
      join(fixture, '.claude/rules/broken.md'),
      '---\npaths: [src/**\n---\n\n# Broken\n',
      'utf8',
    );
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('shows it like any other rule, with no verdict on its frontmatter', async ({ page }) => {
    await page.goto(
      new URL('/rules/detail/repository/.claude/rules/broken.md', host.origin).toString(),
    );
    const main = page.locator('main');
    // Nothing is read out of a rule file, so nothing can fail to be read:
    // the document reaches the page whole and this product passes no judgment
    // on whether its vendor could load it (FR-032).
    await expect(main).toContainText('paths: [src/**');
    await expect(main).toContainText('# Broken');
    expect(await main.innerText()).not.toContain('could not be parsed');
  });
});
