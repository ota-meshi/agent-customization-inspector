// T277: browser acceptance for the instruction comparison (Phase 22).
// Launches the packaged CLI against an instruction-bearing fixture, enters
// the comparison from an inventory row and from a detail page, and verifies
// what can only be claimed against a rendered page: the complete literal
// diff — credential and environment-reference differences included, with no
// masking, reveal, or environment substitution — the exact metadata rows,
// the typed layering and fallback differences stated per side, the
// row-owned pair (a comparison never leaves the applicability-range row
// that owns both files, exactly as a skill comparison never leaves its
// name's row), and the reported (never compared) dead pairs.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** Two literal credentials, one per side, so each side's display is proven. */
const AGENTS_SECRET = 'ghp_E2ECOMPAREAGENTS000000000000000000000';
const CLAUDE_SECRET = 'ghp_E2ECOMPARECLAUDE000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${ACI_E2E_COMPARE_ENDPOINT}';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-instructions-comparison-'));
  // The shared root pair: `AGENTS.md` (Codex+Copilot) and `CLAUDE.md`
  // (Claude+Copilot). Their declarations overlap on `scope` (different
  // values), agree on `retries` — authored `7` versus `007`, one resolved
  // value with the literal difference kept for the source diff — and each
  // declares one key the other does not.
  await writeFile(
    join(fixture, 'AGENTS.md'),
    [
      '---',
      'scope: project',
      'retries: 7',
      `token: ${AGENTS_SECRET}`,
      '---',
      '',
      '# Shared agent instructions',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, 'CLAUDE.md'),
    [
      '---',
      'scope: workspace',
      'retries: 007',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      '# Root Claude instructions',
      '',
      `token: ${CLAUDE_SECRET}`,
      '',
    ].join('\n'),
    'utf8',
  );
  // A configured fallback only Codex recognizes: the fallback difference is
  // a recognition one side has and the other does not.
  await mkdir(join(fixture, '.codex'), { recursive: true });
  await writeFile(
    join(fixture, '.codex/config.toml'),
    'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]\n',
    'utf8',
  );
  await writeFile(join(fixture, 'TEAM_GUIDE.md'), '# configured fallback\n', 'utf8');
  // The typed layering pair, inside one range row: the nested `AGENTS.md`
  // all three Copilot surfaces read, and the repository-wide filename beside
  // it the CLI alone does — both governing `packages/api/**`, so their row
  // owns the pair.
  await mkdir(join(fixture, '.github'), { recursive: true });
  await writeFile(
    join(fixture, '.github/copilot-instructions.md'),
    '# Repository-wide instructions\n',
    'utf8',
  );
  await mkdir(join(fixture, 'packages/api/.github'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.github/copilot-instructions.md'),
    '# API context instructions\n',
    'utf8',
  );
  await writeFile(join(fixture, 'packages/api/AGENTS.md'), '# Nested agent instructions\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** The comparison URL for a hand-written pair, encoded per query value. */
function compareUrl(left: string, right: string): string {
  return new URL(
    `/instructions/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`,
    host.origin,
  ).toString();
}

test('opens from an instruction row and shows the complete literal diff', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
  // The root range's row offers the comparison of its files; selecting it
  // lands on the compare route with the row's first two readable files.
  await page
    .getByRole('link', { name: "Compare this range's files", exact: false })
    .first()
    .click();
  await page.waitForURL(/\/instructions\/compare\?/u);
  await expect(page.getByRole('heading', { name: 'Compare instruction files' })).toBeVisible();
  // The row's link lands on its first two readable files in path order —
  // the repository-wide Copilot file beside `AGENTS.md` — and the pickers
  // step from there to the pair under test, within the row: the second side
  // first, because `AGENTS.md` is unselectable on the first while the
  // second still holds it (FR-011).
  await page.getByLabel('Second instruction file').selectOption('CLAUDE.md');
  await page.getByLabel('First instruction file').selectOption('AGENTS.md');

  // Both sides' complete literal sources are in the diff — the credentials
  // and the environment reference exactly as authored, unmasked and
  // unresolved (FR-027, FR-025). `.first()`, because the declared-metadata
  // section below mounts its own diff of the serialized frontmatter.
  const diff = page.locator('.aci-instruction-compare__source .aci-instruction-source-diff');
  await expect(diff).toContainText(AGENTS_SECRET);
  await expect(diff).toContainText(CLAUDE_SECRET);
  await expect(diff).toContainText(ENVIRONMENT_REFERENCE);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
  expect(text).not.toContain('Reveal');
  // Descriptive only: no verdict, no winner, no fix (FR-012).
  expect(text).not.toContain('wins');
  expect(text).not.toContain('takes precedence');
  expect(text).not.toContain('recommended');
});

test('renders exact metadata rows and matches declarations by key', async ({ page }) => {
  await page.goto(compareUrl('AGENTS.md', 'CLAUDE.md'));
  await expect(page.getByRole('heading', { name: 'Compare instruction files' })).toBeVisible();

  // Each side's identity: path, Source family, recognized kind, read
  // outcome (US3 scenario 1).
  const files = page.locator('.aci-instruction-compare__files');
  await expect(files).toContainText('AGENTS.md');
  await expect(files).toContainText('CLAUDE.md');
  await expect(files.locator('.aci-instruction-compare__file-facts').first()).toContainText(
    'Repository · Instructions',
  );

  // The two facts have two homes (research.md § 7): one recognition row per
  // recognizing tool, in the contracted tool order, each recognition
  // distinguishable from the physical file (US3 scenario 2) — and the files'
  // declared metadata compared once, under no tool caption.
  const metadata = page.locator('.aci-instruction-recognition-comparison');
  // The sections stand in the order a reader needs them: what each file
  // declares, what each file says, then the complete files, and last the
  // recognitions.
  await expect(metadata.locator('h3')).toHaveText([
    'Declared metadata',
    'Instructions',
    'Source comparison',
    'Tool recognition',
  ]);
  const toolTable = metadata.locator('table').first();
  await expect(toolTable.locator('tbody th')).toHaveText([
    'GitHub Copilot · Instructions',
    'Claude Code · Instructions',
    'OpenAI Codex · Instructions',
  ]);
  // The single-product sides are stated, not fabricated into rows: Claude
  // does not recognize `AGENTS.md`, Codex does not recognize `CLAUDE.md`.
  await expect(
    toolTable.locator('tr', { hasText: 'Claude Code' }).locator('td').first(),
  ).toHaveText('Not recognized');
  await expect(
    toolTable.locator('tr', { hasText: 'OpenAI Codex' }).locator('td').nth(1),
  ).toHaveText('Not recognized');

  // The declared metadata is one canonical YAML document per side, every
  // key sorted, diffed in Monaco under no tool caption
  // (frontmatter-yaml.ts): the shared key shows both resolved values, the
  // authored `7`/`007` spellings resolve to the one value both sides spell,
  // and a side-only key stands on its side alone (FR-011).
  const metadataDiff = metadata.locator('.aci-instruction-source-diff').first();
  // Two diffs in the sections: the declarations and the body, each the file's
  // own half of one parse. Scoped to `section`, because the page's complete
  // source comparison passes through this component's slot and sits beside
  // them rather than inside one.
  await expect(metadata.locator('section .aci-instruction-source-diff')).toHaveCount(2);
  await expect(metadataDiff).toContainText('scope: project');
  await expect(metadataDiff).toContainText('scope: workspace');
  await expect(metadataDiff).toContainText('retries: 7');
  await expect(metadataDiff).toContainText('token');
  await expect(metadataDiff).toContainText('endpoint');
});

test('states the typed layering and fallback differences per side', async ({ page }) => {
  // Layering, inside the `packages/api/**` row: the nested `AGENTS.md` names
  // all three Copilot surfaces while the repository-wide filename beside it
  // names the CLI alone — a typed difference, not a source one (T278),
  // stated in that recognition's own cells so each side's surfaces stay
  // attributable to their file.
  await page.goto(
    compareUrl('packages/api/.github/copilot-instructions.md', 'packages/api/AGENTS.md'),
  );
  const metadata = page.locator('.aci-instruction-recognition-comparison');
  const copilotRow = metadata.locator('tr', { hasText: 'GitHub Copilot' });
  await expect(copilotRow.locator('td').first()).toHaveText('Recognized — surfaces: CLI');
  await expect(copilotRow.locator('td').nth(1)).toHaveText(
    'Recognized — surfaces: VS Code, CLI, Cloud agent',
  );
  // A two-file row offers no pick: both files already stand on the two
  // sides, so a selector would be a dead control — the same rule the skill
  // surface applies to a two-copy name.
  await expect(page.getByLabel('First instruction file')).toHaveCount(0);

  // Fallback: the configured fallback is Codex's recognition and nothing
  // else's, so against a Claude file the difference is each tool row's
  // unrecognized side — no provenance is shown, and no fallback is promoted
  // or demoted (FR-009). The column carries the side, so an unrecognized
  // cell stays attributable to its file.
  await page.goto(compareUrl('TEAM_GUIDE.md', 'CLAUDE.md'));
  await expect(metadata.locator('table').first().locator('tbody th')).toHaveText([
    'GitHub Copilot · Instructions',
    'Claude Code · Instructions',
    'OpenAI Codex · Instructions',
  ]);
  const codexRow = metadata.locator('tr', { hasText: 'OpenAI Codex' });
  await expect(codexRow.locator('td').first()).toHaveText('Recognized — surfaces: Local clients');
  await expect(codexRow.locator('td').nth(1)).toHaveText('Not recognized');
  await expect(metadata.locator('tr', { hasText: 'Claude Code' }).locator('td').first()).toHaveText(
    'Not recognized',
  );
});

test('moves the pair with the pickers among the owning row’s files', async ({ page }) => {
  await page.goto(compareUrl('AGENTS.md', 'CLAUDE.md'));
  await expect(page.getByLabel('First instruction file')).toHaveValue('AGENTS.md');

  // The pickers offer the owning `**` row's readable files alone: a file of
  // another range row is outside the pair the row owns, so stepping to
  // another range goes through that row's own entry link.
  const offered = await page
    .getByLabel('Second instruction file')
    .locator('option')
    .allInnerTexts();
  expect(offered).toEqual([
    '.github/copilot-instructions.md',
    'AGENTS.md',
    'CLAUDE.md',
    'TEAM_GUIDE.md',
  ]);

  // A pick replaces the coordinate; vue-router keeps `/` unencoded in query
  // values.
  await page.getByLabel('Second instruction file').selectOption('TEAM_GUIDE.md');
  await expect(page).toHaveURL(/right=TEAM_GUIDE\.md/u);
  await expect(page.locator('.aci-instruction-compare__files')).toContainText('TEAM_GUIDE.md');

  // The other side's current file is unselectable: the two sides must stay
  // two distinct files (FR-011).
  const disabled = await page
    .getByLabel('First instruction file')
    .locator('option[disabled]')
    .allInnerTexts();
  expect(disabled).toEqual(['TEAM_GUIDE.md']);
});

test('reports a pair the model does not express instead of comparing it', async ({ page }) => {
  // The same file twice.
  await page.goto(compareUrl('AGENTS.md', 'AGENTS.md'));
  await expect(page.locator('main')).toContainText(
    'A comparison needs two distinct instruction files',
  );
  // A pair spanning two range rows: both files are real instruction files,
  // but no single row holds both, so the pair is reported exactly as the
  // skill route reports a pair no name's row owns.
  await page.goto(compareUrl('AGENTS.md', 'packages/api/AGENTS.md'));
  await expect(page.locator('main')).toContainText(
    'No applicability range in the current scan holds both of this link’s files.',
  );
  // A path the current scan holds no instruction file at — the carrier is a
  // configuration input, never an instruction candidate — is a pair no row
  // holds either.
  await page.goto(compareUrl('AGENTS.md', '.codex/config.toml'));
  await expect(page.locator('main')).toContainText(
    'No applicability range in the current scan holds both of this link’s files.',
  );
  // No pair at all.
  await page.goto(new URL('/instructions/compare', host.origin).toString());
  await expect(page.locator('main')).toContainText('This link names no pair of instruction files.');
});

test('enters from the detail page and returns to the instructions tab', async ({ page }) => {
  await page.goto(host.origin);
  // Into a detail through its row's path link, then into the comparison from
  // there: an instruction detail is addressed by the path alone, so the path
  // is what the row links.
  await page.getByRole('tabpanel').locator('.aci-item a.aci-path').first().click();
  await expect(page).toHaveURL(/\/instructions\//u);
  await page.getByRole('link', { name: 'Compare this instruction file' }).click();
  await page.waitForURL(/\/instructions\/compare\?/u);
  await expect(page.getByRole('heading', { name: 'Compare instruction files' })).toBeVisible();
  // Back to the inventory's instructions tab, not the kind order's default.
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
});
