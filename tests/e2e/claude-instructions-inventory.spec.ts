// T230, T1223: browser acceptance for the Claude instructions inventory (Phase 17).
// Launches the packaged CLI against an instruction-bearing fixture, opens the
// printed loopback URL, and verifies the rendered rows, the filters, the
// absence of every unsupported location, the file-confined diagnostic, and
// the Codex rows the phase must leave untouched.
//
// The visible checkpoint this carries is the grouping: the root `AGENTS.md`
// and `CLAUDE.md` share one row because they govern the same range, the nested
// `CLAUDE.md` and `AGENTS.md` get a row of their own, every `AGENTS.md` names
// Claude Code beside the other products that read it, and a user can narrow
// either row to Claude Code with `AGENTS.override.md` staying OpenAI Codex's
// alone. What each admitted file means to a running session — when it loads,
// whether `AGENTS.md` is read instead of `CLAUDE.md` or beside it — is
// deliberately nowhere on the page (FR-009); the exact admitted set,
// provenance, and read counts are proven closer to the code.
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
    // Claude Code reads `AGENTS.md` where and how it reads `CLAUDE.md`, at the
    // root beside the other products that read it and in a subdirectory.
    await writeFile(join(fixture, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(fixture, 'packages/api/AGENTS.md'), '# Nested agents\n', 'utf8');
    // Codex preservation: an override only Codex reads, which the memory page
    // lists as not read by Claude Code.
    await writeFile(join(fixture, 'AGENTS.override.md'), '# Codex override\n', 'utf8');
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
    await expect(page.getByRole('tabpanel').locator('.aci-row-head__name')).toHaveText([
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
      'AGENTS.override.md',
      'CLAUDE.local.md',
      'CLAUDE.md',
      'packages/api/AGENTS.md',
      'packages/api/CLAUDE.md',
    ]);
    // The grouping this phase exists for: the root `AGENTS.md` sits in the same
    // row as the root `CLAUDE.md` and names Claude Code beside OpenAI Codex,
    // while the override stays Codex's own recognition.
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    const rootAgents = fileEntries.filter({ hasText: /^AGENTS\.md/u });
    await expect(rootAgents).toContainText('OpenAI Codex');
    await expect(rootAgents).toContainText('Claude Code');
    const override = fileEntries.filter({ hasText: 'AGENTS.override.md' });
    await expect(override).toContainText('OpenAI Codex');
    await expect(override).not.toContainText('Claude Code');
    for (const path of [
      '.claude/CLAUDE.md',
      'CLAUDE.local.md',
      'packages/api/AGENTS.md',
      'packages/api/CLAUDE.md',
    ]) {
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
    await expect(fileEntries).toHaveCount(7);

    // Tool: Claude Code keeps the six files Claude reads and drops the one it
    // does not, leaving both ranges standing.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items).toHaveCount(2);
    await expect(fileEntries).toHaveCount(6);
    await expect(page.getByRole('tabpanel')).not.toContainText('AGENTS.override.md');

    // Path composes over the same population, and a range whose every file the
    // filter drops is not a row.
    await page.getByRole('searchbox', { name: 'Search names and paths' }).fill('packages/');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('packages/api/AGENTS.md');
    await expect(items.first()).toContainText('packages/api/CLAUDE.md');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 2',
    );

    // Clearing restores the committed rows, the Codex file included.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(2);
    await expect(fileEntries).toHaveCount(7);
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
    // The failure is confined: the file beside it carries none.
    await expect(fileEntries.filter({ hasText: 'CLAUDE.local.md' })).not.toContainText(
      'This file could not be parsed',
    );
  });
});

test.describe('a `.claude/AGENTS.md` two products give two ranges', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-claude-instructions-two-ranges-'));
    // Claude Code reads `.claude/AGENTS.md` as its directory's own file, so it
    // governs `**`; GitHub Copilot reads any `AGENTS.md` where it sits, so the
    // same file governs `.claude/**` there, beside a `.claude/CLAUDE.local.md`
    // Claude keeps its directory for. One file, two rows.
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(join(fixture, '.claude/AGENTS.md'), '# Agents\n', 'utf8');
    await writeFile(join(fixture, '.claude/CLAUDE.local.md'), '# Local\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('compares the `.claude/**` row whose file also sits in `**`', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-row-head__name')).toHaveText([
      '**',
      '.claude/**',
    ]);
    // The comparison is found by the range holding both sides, not by the
    // first row holding either — which is `**`, where the local file is not.
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: "Compare this range's files: .claude/**" })
      .click();
    await expect(page.getByRole('heading', { name: 'Compare instruction files' })).toBeVisible();
    const sides = page.locator('.aci-compare-sides');
    await expect(sides).toContainText('.claude/AGENTS.md');
    await expect(sides).toContainText('.claude/CLAUDE.local.md');
  });

  test('shows one box per range, each with the product that gives it', async ({ page }) => {
    await page.goto(
      new URL('/instructions/detail/repository/.claude/AGENTS.md', host.origin).toString(),
    );
    // One box per range, in the rows' order: the range heads it and the
    // product that derived that range is the row inside it, so neither
    // product is lost to the other's range and neither range is claimed by
    // both.
    const boxes = page.locator('.aci-instruction-detail__ranges > li');
    await expect(boxes).toHaveCount(2);
    const productsOf = (box: number) =>
      boxes.nth(box).locator('.aci-instruction-detail__recognitions');
    await expect(boxes.nth(0)).toContainText('Applies to **');
    await expect(productsOf(0)).toContainText('Claude Code');
    await expect(productsOf(0)).not.toContainText('GitHub Copilot');
    await expect(boxes.nth(1)).toContainText('Applies to .claude/**');
    await expect(productsOf(1)).toContainText('GitHub Copilot');
    await expect(productsOf(1)).not.toContainText('Claude Code');
    // Each range compares inside its own block: `**` holds no other file,
    // `.claude/**` holds the local file.
    await expect(
      boxes.nth(0).getByRole('link', { name: /^Compare this instruction file/u }),
    ).toHaveCount(0);
    await expect(boxes.nth(1)).toContainText('.claude/CLAUDE.local.md');
    await boxes
      .nth(1)
      .getByRole('link', { name: /^Compare this instruction file/u })
      .click();
    await expect(page.getByRole('heading', { name: 'Compare instruction files' })).toBeVisible();
  });

  test('steps from the row the reader followed', async ({ page }) => {
    await page.goto(host.origin);
    // Followed from the `.claude/**` row, the previous range is `**` and there
    // is no next one; the page itself is the same whichever row it came from.
    await page
      .getByRole('tabpanel')
      .locator('.aci-item')
      .filter({ has: page.locator('.aci-row-head__name', { hasText: /^\.claude\/\*\*$/u }) })
      .getByRole('link', { name: '.claude/AGENTS.md' })
      .click();
    await expect(page.locator('.aci-instruction-detail__ranges > li')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /^Previous .*, in Instructions$/u })).toHaveCount(
      1,
    );
    await expect(page.getByRole('link', { name: /^Next .*, in Instructions$/u })).toHaveCount(0);
  });

  test('keeps focus on the page when a move steps between the file’s two ranges', async ({
    page,
  }) => {
    // Both moves stay on one path and change only the range, and each removes
    // the link that made it: from `**` there is no next range after
    // `.claude/**`, and from `.claude/**` no previous one before `**`. The
    // step is a move to another place on the page, so focus goes to the
    // heading as for any other step, rather than to the document body with the
    // link that held it (T1223).
    await page.goto(
      new URL('/instructions/detail/repository/.claude/AGENTS.md', host.origin).toString(),
    );
    const next = page.getByRole('link', { name: /^Next .*, in Instructions$/u });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]range=/u);
    await expect(next).toHaveCount(0);
    await expect(page.locator(':focus')).toHaveRole('heading');

    const previous = page.getByRole('link', { name: /^Previous .*, in Instructions$/u });
    await previous.focus();
    await page.keyboard.press('Enter');
    await expect(previous).toHaveCount(0);
    await expect(page.locator(':focus')).toHaveRole('heading');
  });
});
