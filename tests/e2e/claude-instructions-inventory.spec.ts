// T230: browser acceptance for the Claude instructions inventory (Phase 17).
// Launches the packaged CLI against an instruction-bearing fixture, opens the
// printed loopback URL, and verifies the rendered rows, the filters, the
// absence of every unsupported location, the file-confined diagnostic, and
// the Codex rows the phase must leave untouched.
//
// The visible checkpoint this carries is the grouping: the root `AGENTS.md`
// and `CLAUDE.md` share one row because they govern the same range, a nested
// `CLAUDE.md` gets a row of its own, and a user can narrow either to Claude
// Code with `AGENTS.md` staying OpenAI Codex's alone. What each admitted file
// means to a running session — when it loads, which one wins — is deliberately
// nowhere on the page (FR-009); the exact admitted set, provenance, and read
// counts are proven closer to the code.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDEINSTRUCTIONS0000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${CLAUDE_E2E_ENDPOINT}';

test.describe('Claude instruction rows at every depth', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-instructions-'));
    await writeFile(
      join(fixture, 'CLAUDE.md'),
      `# Project\n\n@docs/setup.md\ntoken: ${FIXTURE_SECRET}\nendpoint: ${ENVIRONMENT_REFERENCE}\n`,
      'utf8',
    );
    await writeFile(join(fixture, 'CLAUDE.local.md'), '# Local\n', 'utf8');
    // The other project instruction location the page names. It is reached by
    // the same any-depth `CLAUDE.md` program, so it needs no rule of its own.
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(join(fixture, '.claude/CLAUDE.md'), '# Directory form\n', 'utf8');
    // A subdirectory file: Claude includes it once it reads a file in that
    // subtree, so it is authored inventory rather than a near miss.
    await mkdir(join(fixture, 'packages/api'), { recursive: true });
    await writeFile(join(fixture, 'packages/api/CLAUDE.md'), '# Nested\n', 'utf8');
    // Codex preservation: Claude Code reads CLAUDE.md, not AGENTS.md.
    await writeFile(join(fixture, 'AGENTS.md'), '# Codex instructions\n', 'utf8');
    // Unsupported locations: a spelling variant one step from each literal.
    // No shipped selector reaches either, so neither can appear.
    await writeFile(join(fixture, 'CLAUDE.md.bak'), 'backup suffix\n', 'utf8');
    await writeFile(join(fixture, 'CLAUDE-local.md'), 'hyphenated\n', 'utf8');
    // The target of the authored `@path` token. This phase emits no
    // relationship at all, so nothing on the page names it.
    await mkdir(join(fixture, 'docs'), { recursive: true });
    await writeFile(join(fixture, 'docs/setup.md'), '# setup\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('groups the root files into one row and the nested one into its own', async ({ page }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order, so the tab is
    // selected on arrival.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Two ranges: everything at the Repository root — the `.claude` directory
    // form among them, because `.claude` is where Claude keeps the file rather
    // than what it governs — and the `packages/api` subtree.
    await expect(items).toHaveCount(2);
    await expect(page.getByRole('tabpanel').locator('.aci-instruction-row__range')).toHaveText([
      '**',
      'packages/api/**',
    ]);
    // Files are in Source-relative Path order within each range. No row says
    // when a file loads: that is a relation to a working directory this
    // product does not observe (FR-009).
    const paths = await page.getByRole('tabpanel').locator('.aci-item .aci-path').allInnerTexts();
    expect(paths).toEqual([
      '.claude/CLAUDE.md',
      'AGENTS.md',
      'CLAUDE.local.md',
      'CLAUDE.md',
      'packages/api/CLAUDE.md',
    ]);
    // The grouping this phase exists for: `AGENTS.md` sits in the same row as
    // the root `CLAUDE.md` while staying OpenAI Codex's own recognition.
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    const codexEntry = fileEntries.filter({ hasText: 'AGENTS.md' });
    await expect(codexEntry).toContainText('OpenAI Codex');
    await expect(codexEntry).not.toContainText('Claude Code');
    for (const path of ['.claude/CLAUDE.md', 'CLAUDE.local.md', 'packages/api/CLAUDE.md']) {
      await expect(fileEntries.filter({ hasText: path }).first()).toContainText('Claude Code');
    }
  });

  test('shows no unsupported location and no authored source text', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    const text = await page.locator('main').innerText();
    // Unsupported locations are absent rather than reported: no selector
    // reaches them, so there is nothing for the page to state about them.
    expect(text).not.toContain('CLAUDE.md.bak');
    expect(text).not.toContain('CLAUDE-local.md');
    // The relationship target is never read and never named: this phase emits
    // no relationship, and a target confers no read authority wherever one is.
    expect(text).not.toContain('docs/setup.md');
    // The inventory carries no `sourceText`, so a credential or an
    // environment reference in an authored instruction file cannot appear in
    // a list the user never opted into reading (FR-027) — and nothing ever
    // resolves the reference against any environment.
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('# Project');
    expect(text).not.toContain('# Nested');
  });

  test('narrows the rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    const items = page.getByRole('tabpanel').locator('.aci-item');
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    await expect(items).toHaveCount(2);
    await expect(fileEntries).toHaveCount(5);

    // Tool: Claude Code keeps the four files Claude reads and drops the one it
    // does not, leaving both ranges standing.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);
    await expect(fileEntries).toHaveCount(4);
    await expect(page.getByRole('tabpanel')).not.toContainText('AGENTS.md');

    // Path composes over the same population, and a range whose every file the
    // filter drops is not a row.
    await page.getByLabel('Path contains').fill('packages/');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('packages/api/CLAUDE.md');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 2',
    );

    // Clearing restores the committed rows, the Codex file included.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
    await expect(fileEntries).toHaveCount(5);
  });
});

test.describe('a Claude instruction file whose declarations cannot be parsed', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-instructions-malformed-'));
    // A frontmatter block no parser can read: the recognition fails
    // all-or-nothing, and the failure stays confined to this file (FR-028).
    await writeFile(
      join(fixture, 'CLAUDE.md'),
      '---\nscope: [unclosed\n---\n\n# Project\n',
      'utf8',
    );
    await writeFile(join(fixture, 'CLAUDE.local.md'), '# Local\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('keeps both rows and reports the failure on the file it happened to', async ({ page }) => {
    await page.goto(host.origin);
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    // Both files keep their place under the root range: what failed is reading
    // one file's declarations, not recognizing it, and a range comes from
    // where a file sits rather than from what parsed.
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(1);
    await expect(fileEntries).toHaveCount(2);
    // `CLAUDE.local.md` does not contain `CLAUDE.md`, so the filter names the
    // malformed file alone.
    await expect(fileEntries.filter({ hasText: 'CLAUDE.md' })).toContainText(
      'This file could not be parsed',
    );
    // The failure is confined: the file beside it carries none, and the
    // source-level list stays empty because the record belongs to a file.
    await expect(fileEntries.filter({ hasText: 'CLAUDE.local.md' })).not.toContainText(
      'This file could not be parsed',
    );
    await expect(page.getByText('No source-level diagnostics.')).toBeVisible();
  });
});
