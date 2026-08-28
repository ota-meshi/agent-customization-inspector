// T249: browser acceptance for the Copilot instructions inventory (Phase 19).
// Launches the packaged CLI against an instruction-bearing fixture, opens the
// printed loopback URL, and verifies the rendered rows, the surface badges,
// the filters, the absence of every excluded location, the file-confined
// diagnostic, and the Codex and Claude rows the phase must leave untouched.
//
// The visible checkpoint this carries is the surface: the tool alone cannot
// say where Copilot reads a file from, because its editor, CLI, and cloud
// surfaces document different lookup bases for the same filenames. A root
// `.github/copilot-instructions.md` therefore reads as all three, the same
// filename under `packages/api/` as the CLI's alone, and `GEMINI.md` as the
// two surfaces that document it. What a running session would actually load is
// deliberately nowhere on the page (FR-009); the exact admitted set,
// provenance, and read counts are proven closer to the code.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTINSTRUCTIONS000000000000000';

/** A literal environment reference that must render nowhere resolved. */
const ENVIRONMENT_REFERENCE = '${COPILOT_E2E_ENDPOINT}';

test.describe('Copilot instruction rows and their surfaces', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-instructions-'));
    // The repository-wide file at the root: two rules admit it, so its one
    // recognition names all three Copilot surfaces.
    await mkdir(join(fixture, '.github/instructions'), { recursive: true });
    await writeFile(
      join(fixture, '.github/copilot-instructions.md'),
      `# Repository\n\ntoken: ${FIXTURE_SECRET}\nendpoint: ${ENVIRONMENT_REFERENCE}\n`,
      'utf8',
    );
    // A path-specific file declaring what it governs: `applyTo` is what such a
    // file governs, so the declared value keys its row wherever the file sits.
    await writeFile(
      join(fixture, '.github/instructions/frontend.instructions.md'),
      "---\napplyTo: 'src/frontend/**'\n---\n\n# Frontend\n",
      'utf8',
    );
    // The same filename in a subdirectory: only Copilot CLI documents reading
    // it, from the context its session runs in.
    await mkdir(join(fixture, 'packages/api/.github'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.github/copilot-instructions.md'),
      '# API context\n',
      'utf8',
    );
    // Shared files: `AGENTS.md` is Codex's and Copilot's, the root
    // `CLAUDE.md` is Claude's and Copilot's, and `GEMINI.md` is Copilot's
    // alone — on the two surfaces that document it.
    await writeFile(join(fixture, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(fixture, 'CLAUDE.md'), '# Claude-compatible\n', 'utf8');
    await writeFile(join(fixture, 'GEMINI.md'), '# Gemini-compatible\n', 'utf8');
    // Excluded by initial scope: the `.claude` spelling and the non-root
    // alternatives Copilot documents but this release does not admit. The
    // first stays a Claude row; the second is nobody's.
    await mkdir(join(fixture, '.claude'), { recursive: true });
    await writeFile(join(fixture, '.claude/CLAUDE.md'), '# Directory form\n', 'utf8');
    await writeFile(join(fixture, 'packages/api/GEMINI.md'), '# Nested Gemini\n', 'utf8');
    // A runtime-supplied lookup root: never a scan root, so no selector
    // reaches it and nothing on the page names it.
    await mkdir(join(fixture, '.copilot/instructions'), { recursive: true });
    await writeFile(
      join(fixture, '.copilot/instructions/personal.instructions.md'),
      '# Configured location\n',
      'utf8',
    );
    // Spelling variants one step from each literal.
    await writeFile(
      join(fixture, '.github/copilot-instructions.markdown'),
      'wrong suffix\n',
      'utf8',
    );
    await writeFile(join(fixture, '.github/instructions/README.md'), 'wrong suffix\n', 'utf8');

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('groups by what each file governs and states the surfaces beside each product', async ({
    page,
  }) => {
    await page.goto(host.origin);
    // Instructions sort first in the closed kind order, so the tab is
    // selected on arrival.
    await expect(page.getByRole('tab', { selected: true })).toContainText('Instructions');
    const items = page.getByRole('tabpanel').locator('.aci-item');
    // Three ranges: the Repository root — where the repository-wide file's
    // `.github` is stripped and the agent-instruction files sit — the
    // `packages/api` subtree, and the range the path-specific file names for
    // itself with `applyTo` (T265). Every path-specific file here declares
    // one, so no no-range row exists; the malformed suite below has that row.
    await expect(items).toHaveCount(3);
    await expect(page.getByRole('tabpanel').locator('.aci-instruction-row__range')).toHaveText([
      '**',
      'packages/api/**',
      'src/frontend/**',
    ]);

    // Selected by the exact rendered path rather than by a substring: several
    // of these paths end in another's filename, and `.claude/CLAUDE.md` would
    // otherwise stand in for the root `CLAUDE.md` this phase is about.
    const entryFor = (path: string) =>
      page
        .getByRole('tabpanel')
        .locator('.aci-source-family-blocks__members > li')
        .filter({ has: page.getByText(path, { exact: true }) });

    // The root repository-wide file: admitted by the root-exact rule and by
    // the CLI-context rule, so its one recognition names all three surfaces.
    const rootRepositoryWide = entryFor('.github/copilot-instructions.md');
    await expect(rootRepositoryWide).toContainText('GitHub Copilot');
    await expect(rootRepositoryWide).toContainText('VS Code, CLI, Cloud agent');
    // The same filename in a subdirectory: the CLI's alone, which is what the
    // split of one documented filename into two rules exists to publish.
    const nestedRepositoryWide = entryFor('packages/api/.github/copilot-instructions.md');
    await expect(nestedRepositoryWide).toContainText('GitHub Copilot');
    await expect(nestedRepositoryWide).toContainText('CLI');
    await expect(nestedRepositoryWide).not.toContainText('VS Code');
    // `GEMINI.md` names the two surfaces that document it and not the editor.
    const gemini = entryFor('GEMINI.md');
    await expect(gemini).toContainText('CLI, Cloud agent');
    await expect(gemini).not.toContainText('VS Code');

    // The shared files keep every product that recognizes them, each with its
    // own surface, and the Claude-only spelling stays Claude's.
    const agents = entryFor('AGENTS.md');
    await expect(agents).toContainText('GitHub Copilot');
    await expect(agents).toContainText('OpenAI Codex');
    const rootClaude = entryFor('CLAUDE.md');
    await expect(rootClaude).toContainText('GitHub Copilot');
    await expect(rootClaude).toContainText('Claude Code');
    const directoryForm = entryFor('.claude/CLAUDE.md');
    await expect(directoryForm).toContainText('Claude Code');
    await expect(directoryForm).not.toContainText('GitHub Copilot');
  });

  test('shows no excluded location, configured root, or authored source text', async ({ page }) => {
    await page.goto(host.origin);
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(3);
    const text = await page.locator('main').innerText();
    // An excluded or runtime-supplied location is absent rather than reported:
    // no selector reaches it, so there is nothing for the page to state about
    // it. The exclusion records say the omission was decided; they are
    // maintenance data no surface renders.
    expect(text).not.toContain('.copilot/instructions');
    expect(text).not.toContain('packages/api/GEMINI.md');
    expect(text).not.toContain('copilot-instructions.markdown');
    expect(text).not.toContain('README.md');
    // No contract identifier reaches a screen: an excluded rule ID stands
    // where an answer should be (FR-007).
    expect(text).not.toContain('copilot.excluded');
    expect(text).not.toContain('copilot.repo.instructions');
    // The inventory carries no `sourceText`, so a credential or an
    // environment reference in an authored instruction file cannot appear in
    // a list the user never opted into reading (FR-027) — and nothing ever
    // resolves the reference against any environment.
    expect(text).not.toContain(FIXTURE_SECRET);
    expect(text).not.toContain(ENVIRONMENT_REFERENCE);
    expect(text).not.toContain('# Repository');
    // A path-specific file's own `applyTo` is what it really governs, so the
    // declared value keys its row (T265) — the declaration's key stays on the
    // detail route, one file at a time, like every other declared value.
    expect(text).not.toContain('applyTo');
    expect(text).toContain('src/frontend/**');
  });

  test('narrows the rows with the tool and path filters', async ({ page }) => {
    await page.goto(host.origin);
    const items = page.getByRole('tabpanel').locator('.aci-item');
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    await expect(items).toHaveCount(3);
    await expect(fileEntries).toHaveCount(7);

    // Tool: GitHub Copilot keeps every file Copilot recognizes and drops the
    // `.claude` spelling it does not, leaving every range standing.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items).toHaveCount(3);
    await expect(fileEntries).toHaveCount(6);
    await expect(page.getByRole('tabpanel')).not.toContainText('.claude/CLAUDE.md');
    // A recognition is kept whole: filtering by product never drops a surface
    // from the product it kept.
    await expect(
      fileEntries.filter({
        has: page.getByText('.github/copilot-instructions.md', { exact: true }),
      }),
    ).toContainText('VS Code, CLI, Cloud agent');

    // Path composes over the same population, and a range whose every file the
    // filter drops is not a row.
    await page.getByLabel('Path contains').fill('packages/');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('packages/api/.github/copilot-instructions.md');
    await expect(page.getByRole('status').filter({ hasText: 'Showing' })).toContainText(
      'Showing 1 of 3',
    );

    // Clearing restores the committed rows, the Claude-only file included.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(items).toHaveCount(3);
    await expect(fileEntries).toHaveCount(7);
  });
});

test.describe('a Copilot instruction file whose declarations cannot be parsed', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-instructions-malformed-'));
    await mkdir(join(fixture, '.github/instructions'), { recursive: true });
    // A frontmatter block no parser can read: the recognition fails
    // all-or-nothing, and the failure stays confined to this file (FR-028).
    await writeFile(
      join(fixture, '.github/instructions/broken.instructions.md'),
      '---\napplyTo: [unclosed\n---\n\n# Broken\n',
      'utf8',
    );
    await writeFile(join(fixture, '.github/copilot-instructions.md'), '# Repository\n', 'utf8');
    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists the unparseable file under the no-range row with its diagnostic', async ({
    page,
  }) => {
    await page.goto(host.origin);
    const fileEntries = page
      .getByRole('tabpanel')
      .locator('.aci-source-family-blocks__members > li');
    // Two rows: the repository-wide file's root range, and the no-range row
    // holding the path-specific file whose declarations could not be read — a
    // path-specific file's range is its own declaration or nothing, so an
    // unreadable one has none known, and its diagnostic says why (FR-028,
    // T265).
    await expect(page.getByRole('tabpanel').locator('.aci-item')).toHaveCount(2);
    await expect(page.getByRole('tabpanel').locator('.aci-instruction-row__range')).toHaveText([
      '**',
      'No known applicability range',
    ]);
    await expect(fileEntries).toHaveCount(2);
    await expect(fileEntries.filter({ hasText: 'broken.instructions.md' })).toContainText(
      'This file could not be parsed',
    );
    // The failure is confined: the file beside it carries none, and the
    // source-level list stays empty because the record belongs to a file.
    await expect(fileEntries.filter({ hasText: 'copilot-instructions.md' })).not.toContainText(
      'This file could not be parsed',
    );
    await expect(page.getByText('No source-level diagnostics.')).toBeVisible();
  });
});
