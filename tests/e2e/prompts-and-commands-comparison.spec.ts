// T504: browser acceptance for the prompt-and-command comparison (Phase 48).
// Launches the packaged CLI against a fixture whose commands and VS Code
// prompt files resolve shared invocation names, enters the comparison from an
// inventory row and from a detail page, and verifies what can only be claimed
// against a rendered page: the complete literal diff — credential and
// environment-reference differences included, with no masking, reveal, or
// environment substitution — the exact metadata rows with the name each tool
// invokes each side by, the canonical serialized declaration documents, the
// row-owned pair (a comparison never leaves the invocation-name row that owns
// both files), and the reported (never compared) dead pairs.
//
// One kind is one comparison surface, so the pairs here span the kind's
// locations: a Claude command file beside the VS Code prompt file that
// declares its name, and two command files one product invokes by one name.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** Two literal credentials, one per side, so each side's display is proven. */
const COMMAND_SECRET = 'ghp_E2ECOMPARECOMMAND00000000000000000000';
const PROMPT_SECRET = 'ghp_E2ECOMPAREPROMPT000000000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${ACI_E2E_PROMPT_COMPARE_ENDPOINT}';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-prompts-comparison-'));
  await mkdir(join(fixture, '.claude/commands'), { recursive: true });
  await mkdir(join(fixture, '.github/prompts'), { recursive: true });
  // The cross-location pair: a root command file both products read, and the
  // prompt file that declares the same name. Their declarations overlap on
  // `description` with different values, and each declares one key the other
  // does not.
  await writeFile(
    join(fixture, '.claude/commands/deploy.md'),
    [
      '---',
      'description: Deploy the current branch',
      'argument-hint: "[environment]"',
      `token: ${COMMAND_SECRET}`,
      '---',
      '',
      '# Deploy',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(fixture, '.github/prompts/deploy.prompt.md'),
    [
      '---',
      'name: deploy',
      'description: Deploy from the editor',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      '# Deploy from the editor',
      '',
      `token: ${PROMPT_SECRET}`,
      '',
    ].join('\n'),
    'utf8',
  );
  // The one-product pair: a directory whose leaf is `SKILL.md` takes the
  // directory's name, so these two files reach one Claude name and no
  // Copilot recognition at all — two commands under one name.
  await mkdir(join(fixture, '.claude/commands/team/review'), { recursive: true });
  await writeFile(join(fixture, '.claude/commands/team/review.md'), '# Review\n', 'utf8');
  await writeFile(
    join(fixture, '.claude/commands/team/review/SKILL.md'),
    '# Review, from the directory\n',
    'utf8',
  );
  // A name only one file resolves, so its row offers no comparison at all.
  await writeFile(join(fixture, '.claude/commands/release.md'), '# Release\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** The comparison URL for a hand-written pair, encoded per query value. */
function compareUrl(left: string, right: string): string {
  return new URL(
    `/prompts-and-commands/compare/repository?leftSource=repository&left=${encodeURIComponent(left)}&rightSource=repository&right=${encodeURIComponent(right)}`,
    host.origin,
  ).toString();
}

test('opens from a row and shows the complete literal diff', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
  // The name's own row offers the comparison of its files; selecting it
  // lands on the compare route with the row's first two readable files.
  await page
    .getByRole('tabpanel')
    .locator('.aci-item')
    .filter({ hasText: 'deploy' })
    .getByRole('link', { name: /Compare this name's files: deploy/u })
    .click();
  await page.waitForURL(/\/prompts-and-commands\/compare\/repository\?/u);
  await expect(
    page.getByRole('heading', { name: 'Compare prompt and command files' }),
  ).toBeVisible();

  // Both sides' complete literal sources are in the diff — the credentials
  // and the environment reference exactly as authored, unmasked and
  // unresolved (FR-027, FR-025). `.first()`, because the declared-metadata
  // section below mounts its own diff of the serialized frontmatter.
  const diff = page.locator('.aci-prompt-compare__source .aci-prompt-source-diff');
  await expect(diff).toContainText(COMMAND_SECRET);
  await expect(diff).toContainText(PROMPT_SECRET);
  await expect(diff).toContainText(ENVIRONMENT_REFERENCE);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('••••');
  expect(text).not.toContain('ghp_****');
  expect(text).not.toContain('Reveal');
  // Descriptive only: no verdict, no winner, no fix (FR-012). Which of two
  // files typing the name reaches is never stated (FR-009).
  expect(text).not.toContain('wins');
  expect(text).not.toContain('takes precedence');
  expect(text).not.toContain('recommended');
  // Nothing runs, merges, or edits either side.
  await expect(page.getByRole('button', { name: /run|invoke|merge|fix|apply/iu })).toHaveCount(0);
});

test('renders the per-tool invocation names and the serialized declarations', async ({ page }) => {
  await page.goto(compareUrl('.claude/commands/deploy.md', '.github/prompts/deploy.prompt.md'));
  await expect(
    page.getByRole('heading', { name: 'Compare prompt and command files' }),
  ).toBeVisible();

  // Each side's identity: path, Source family, recognized kind, read
  // outcome (US3 scenario 1).
  const files = page.locator('.aci-compare-sides');
  await expect(files).toContainText('.claude/commands/deploy.md');
  await expect(files).toContainText('.github/prompts/deploy.prompt.md');
  await expect(files.locator('.aci-prompt-compare__file-facts').first()).toContainText(
    'Repository · Prompt / Command',
  );

  // The two facts have two homes (research.md § 7): one recognition row per
  // recognizing tool, in the contracted tool order, each recognition
  // distinguishable from the physical file (US3 scenario 2) — and the files'
  // declared metadata compared once, under no tool caption.
  const metadata = page.locator('.aci-prompt-recognition-comparison');
  // The sections stand in the order a reader needs them: what each file
  // declares, what each file says, then the complete files, and last the
  // recognitions.
  await expect(metadata.locator('h3')).toHaveText([
    'Tool recognition',
    'Declared metadata',
    'Prompt or command content',
    'Source comparison',
  ]);
  const toolTable = metadata.locator('table').first();
  await expect(toolTable.locator('tbody th')).toHaveText(['GitHub Copilot', 'Claude Code']);
  // Copilot reaches the one name two ways and the cells say which; Claude
  // reads the command file and nothing in the editor's prompts directory.
  const copilotRow = toolTable.locator('tr', { hasText: 'GitHub Copilot' });
  await expect(copilotRow.locator('td').first()).toHaveText('Invoked as deploy (CLI)');
  await expect(copilotRow.locator('td').nth(1)).toHaveText('Invoked as deploy (VS Code)');
  const claudeRow = toolTable.locator('tr', { hasText: 'Claude Code' });
  await expect(claudeRow.locator('td').first()).toHaveText(
    'Invoked as deploy (CLI and IDE clients)',
  );
  await expect(claudeRow.locator('td').nth(1)).toHaveText('Not recognized');

  // The declared metadata is one canonical YAML document per side, every key
  // sorted and none promoted, diffed in Monaco under no tool caption
  // (frontmatter-yaml.ts): the shared key shows both values, and a side-only
  // key stands on its side alone (FR-011).
  const metadataDiff = metadata.locator('.aci-prompt-source-diff').first();
  // Two diffs in the sections: the declarations and the body, each the file's
  // own half of one parse. Scoped to `section`, because the page's complete
  // source comparison passes through this component's slot and sits beside
  // them rather than inside one.
  await expect(metadata.locator('section .aci-prompt-source-diff')).toHaveCount(2);
  await expect(metadataDiff).toContainText('description: Deploy the current branch');
  await expect(metadataDiff).toContainText('description: Deploy from the editor');
  await expect(metadataDiff).toContainText('argument-hint');
  await expect(metadataDiff).toContainText('name: deploy');
});

test('compares two command files one product invokes by one name', async ({ page }) => {
  // A directory whose leaf is `SKILL.md` takes the directory's name, so
  // these two files resolve one Claude name — a pair of commands, with no
  // Copilot row at all because neither file is a root direct child.
  await page.goto(
    compareUrl('.claude/commands/team/review.md', '.claude/commands/team/review/SKILL.md'),
  );
  const toolTable = page.locator('.aci-prompt-recognition-comparison table').first();
  await expect(toolTable.locator('tbody th')).toHaveText(['Claude Code']);
  await expect(toolTable.locator('td').first()).toHaveText(
    'Invoked as team:review (CLI and IDE clients)',
  );
  await expect(toolTable.locator('td').nth(1)).toHaveText(
    'Invoked as team:review (CLI and IDE clients)',
  );
  // Both files declare nothing, so the serialized documents are two empty
  // parses rather than a stated failure.
  const metadata = page.locator('.aci-prompt-recognition-comparison');
  await expect(metadata).not.toContainText('could not be parsed');
  // A two-file row offers no pick: both files already stand on the two
  // sides, so a selector would be a dead control.
  await expect(page.getByLabel('First prompt or command file')).toHaveCount(0);
});

test('reports a pair the model does not express instead of comparing it', async ({ page }) => {
  // The same file twice.
  await page.goto(compareUrl('.claude/commands/deploy.md', '.claude/commands/deploy.md'));
  await expect(page.locator('main')).toContainText(
    'A comparison needs two distinct prompt or command files',
  );
  // A pair spanning two name rows: both files are real files of this kind,
  // but no single row holds both.
  await page.goto(compareUrl('.claude/commands/deploy.md', '.claude/commands/release.md'));
  await expect(page.locator('main')).toContainText(
    'No invocation name in the current scan holds both of this link’s files.',
  );
  // A path the current scan holds no file of this kind at.
  await page.goto(compareUrl('.claude/commands/deploy.md', '.github/prompts/nothing.prompt.md'));
  await expect(page.locator('main')).toContainText(
    'No invocation name in the current scan holds both of this link’s files.',
  );
  // No pair at all.
  await page.goto(new URL('/prompts-and-commands/compare/repository', host.origin).toString());
  await expect(page.locator('main')).toContainText(
    'This link names no pair of prompt or command files.',
  );
});

test('offers no comparison for a name only one file resolves', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
  const single = page.getByRole('tabpanel').locator('.aci-item').filter({ hasText: 'release' });
  await expect(single).toHaveCount(1);
  await expect(single.getByRole('link', { name: /Compare/u })).toHaveCount(0);
});

test('enters from the detail page and returns to the kind’s own tab', async ({ page }) => {
  await page.goto(
    new URL(
      '/prompts-and-commands/detail/repository/.github/prompts/deploy.prompt.md',
      host.origin,
    ).toString(),
  );
  await page.getByRole('link', { name: 'Compare this file' }).click();
  await page.waitForURL(/\/prompts-and-commands\/compare\/repository\?/u);
  await expect(
    page.getByRole('heading', { name: 'Compare prompt and command files' }),
  ).toBeVisible();
  // Back to the inventory's own tab, not the kind order's default.
  await page.getByRole('link', { name: /Back to /u }).click();
  await expect(page.getByRole('tab', { selected: true })).toContainText('Prompt / Command');
});
