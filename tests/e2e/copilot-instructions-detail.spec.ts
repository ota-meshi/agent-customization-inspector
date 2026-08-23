// T263: browser acceptance for the Copilot instruction detail (Phase 20).
// Launches the packaged CLI against an instruction-bearing fixture, opens a
// Copilot instruction from the inventory, and verifies the complete inert
// detail screen: the declarations the file wrote in authored order, the
// instructions that follow them, the complete authored source, the
// diagnostics, and the cleanup that takes the content away again.
//
// The claims here can only be made against a rendered page: that a credential
// is shown exactly as written with no masking and no reveal control anywhere,
// that an environment reference stays the characters that were written even
// while the named variable is set in the host's environment, and that leaving
// the route drops the content.
//
// The visible checkpoint of this milestone: selecting a Copilot instruction
// shows the surfaces separately. A root `.github/copilot-instructions.md`
// heads as all three, the same filename in a subdirectory as the CLI's alone,
// and `GEMINI.md` as the two surfaces that document it — the page states which
// surfaces documented reading the file and never that one loaded it (FR-009).
// `applyTo` is on that page as an ordinary declaration and as the range its
// row is keyed by, with no claim about which files a session would match.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2ECOPILOTDETAIL00000000000000000000000';

/** An environment reference the product must never resolve. */
const ENVIRONMENT_REFERENCE = '${ACI_E2E_COPILOT_ENDPOINT}';

/** The value the named variable actually holds while the host runs. */
const ENVIRONMENT_SENTINEL = 'sentinel-value-that-must-not-appear';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-instr-detail-'));
  await mkdir(join(fixture, '.github/instructions'), { recursive: true });
  await writeFile(
    join(fixture, '.github/copilot-instructions.md'),
    [
      '---',
      'scope: repository',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# House rules',
      '',
      'See docs/setup.md before deploying.',
      '',
    ].join('\n'),
    'utf8',
  );
  // A path-specific file: its `applyTo` is both an ordinary declaration and
  // the range its inventory row is keyed by.
  await writeFile(
    join(fixture, '.github/instructions/frontend.instructions.md'),
    [
      '---',
      "applyTo: 'src/frontend/**'",
      'excludeAgent: copilot-swe-agent',
      '---',
      '',
      '# Frontend conventions',
      '',
    ].join('\n'),
    'utf8',
  );
  // A second path-specific file whose frontmatter cannot be parsed:
  // extraction is all-or-nothing, so its declarations and instructions are
  // absent while its complete source stays readable (FR-028) — and, declaring
  // nothing a row can be keyed by, it lists under the no-range row (T265).
  await writeFile(
    join(fixture, '.github/instructions/broken.instructions.md'),
    '---\napplyTo: [unterminated\n---\n\n# Broken path instructions\n',
    'utf8',
  );
  // The same filename in a subdirectory, and the root alternative no editor
  // documents: two files whose surfaces differ from the root file's.
  await mkdir(join(fixture, 'packages/api/.github'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.github/copilot-instructions.md'),
    '# API context\n',
    'utf8',
  );
  await writeFile(join(fixture, 'GEMINI.md'), '# Gemini-compatible\n', 'utf8');

  // The named variable is really set in the host's environment (the spawned
  // CLI inherits it), so "resolves nowhere" is proven against a value that
  // exists to leak, not against an absence.
  process.env['ACI_E2E_COPILOT_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  delete process.env['ACI_E2E_COPILOT_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named instruction file's detail route from the inventory. */
async function openInstruction(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  // Scoped to the file's own entry inside its range row, and matched on the
  // exact rendered path: several of these paths end in another's filename,
  // and every recognizing product's link addresses the same file detail, so
  // the first one opens it (T224).
  await page
    .locator('.aci-instruction-row__files > li')
    .filter({ has: page.getByText(path, { exact: true }) })
    .locator('.aci-instruction-row__owner a')
    .first()
    .click();
}

test('opens complete inert Copilot instruction detail from the inventory', async ({ page }) => {
  await openInstruction(page, '.github/copilot-instructions.md');
  // The page is headed by the file's path — the row's own identity — with the
  // recognizing product, the surfaces it documented reading the file on, and
  // the kind beside it.
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText(
    '.github/copilot-instructions.md',
  );
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent) · Instructions',
  );
  // The declarations lead, in authored order — scope, endpoint, api_key is the
  // file's own order, not a sort — with the credential and the environment
  // reference exactly as written.
  const declarations = page.locator('.aci-instruction-detail__declarations');
  await expect(declarations).toContainText('scope');
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(declarations).toContainText(ENVIRONMENT_REFERENCE);
  // The instructions follow: the body the frontmatter block was removed from,
  // its reference-looking token staying source text.
  const instructions = page.locator('.aci-instruction-detail__instructions');
  await expect(instructions).toContainText('# House rules');
  await expect(instructions).toContainText('See docs/setup.md before deploying.');
});

test('separates the surfaces one documented filename is read from', async ({ page }) => {
  // The milestone's visible checkpoint. The same filename at the root and in a
  // subdirectory opens two details that differ in exactly one thing: which
  // surfaces documented reading it. Nothing on either page says one is active,
  // enabled, or selected — that turns on runtime this product never observes.
  await openInstruction(page, 'packages/api/.github/copilot-instructions.md');
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'GitHub Copilot (CLI) · Instructions',
  );
  // `GEMINI.md` is the other asymmetry: VS Code documents no such file, so the
  // editor is absent rather than assumed from the alternative beside it.
  await openInstruction(page, 'GEMINI.md');
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'GitHub Copilot (CLI, Cloud agent) · Instructions',
  );
  const text = await page.locator('main').innerText();
  for (const claim of ['enabled', 'disabled', 'selected', 'active', 'wins']) {
    expect(text.toLowerCase(), claim).not.toContain(claim);
  }
});

test('shows applyTo as an authored declaration and as the range its row is keyed by', async ({
  page,
}) => {
  await page.goto(host.origin);
  // The row's identity is the declared value, wherever the file sits: the
  // range reads as the author's pattern rather than as the `.github`
  // directory the file is filed under.
  await expect(page.getByRole('tabpanel').locator('.aci-instruction-row__range')).toHaveText([
    '**',
    'packages/api/**',
    'src/frontend/**',
    'No known applicability range',
  ]);
  await openInstruction(page, '.github/instructions/frontend.instructions.md');
  // And the same value is on the detail as an ordinary declaration, published
  // by the key the file wrote, beside a key this product has no opinion about.
  const declarations = page.locator('.aci-instruction-detail__declarations');
  await expect(declarations).toContainText('applyTo');
  await expect(declarations).toContainText('src/frontend/**');
  await expect(declarations).toContainText('excludeAgent');
  // No repository file is paired with the pattern and no count is drawn from
  // it: whether it matches depends on the path a session is working on.
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/matches?\s+\d+/iu);
});

test('masks nothing, offers no reveal control, and resolves no environment reference', async ({
  page,
}) => {
  await openInstruction(page, '.github/copilot-instructions.md');
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(FIXTURE_SECRET);
  const text = await page.locator('main').innerText();
  // The named variable is set in the host's environment, and its value still
  // appears nowhere: the authored `${...}` spelling is the whole display, and
  // no control offers to uncover anything (FR-025, FR-027).
  expect(text).toContain(ENVIRONMENT_REFERENCE);
  expect(text).not.toContain(ENVIRONMENT_SENTINEL);
  await expect(page.getByRole('button', { name: /reveal|show|unmask/iu })).toHaveCount(0);
  expect(text).not.toMatch(/•{3,}|\*{3,}/u);
});

test('serves the complete authored source on the file tab', async ({ page }) => {
  await openInstruction(page, '.github/copilot-instructions.md');
  await page.getByRole('tab', { name: /^file$/iu }).click();
  // Scoped to the file panel: the instructions panel keeps its own viewer
  // mounted behind the tab strip, and this claim is about the complete file.
  const viewer = page.locator('#aci-instruction-panel-file .aci-source-viewer');
  await expect(viewer).toBeVisible();
  // The frontmatter's authored spelling lives here — the parse's two halves
  // are one tab over — together with the body, byte for byte.
  await expect(viewer).toContainText('scope: repository');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText('# House rules');
});

test('renders no relationship section anywhere on the detail', async ({ page }) => {
  await openInstruction(page, '.github/copilot-instructions.md');
  // No Copilot relationship-only rule originates at an instruction file, so
  // the reference-looking value stays source text and no relationship
  // vocabulary reaches the screen (T261).
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/relationship/iu);
  expect(text).not.toContain('Imports');
});

test('reports an unparseable frontmatter with its diagnostic while the source stays readable', async ({
  page,
}) => {
  await openInstruction(page, '.github/instructions/broken.instructions.md');
  // Extraction failed all-or-nothing: the page lands on the file itself, the
  // failure's diagnostic says why no declarations show, and the complete
  // source stays readable (FR-028).
  await expect(page.locator('.aci-instruction-detail')).toContainText(
    'This file could not be parsed',
  );
  await expect(page.getByRole('tab', { name: /^file$/iu })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const viewer = page.locator('.aci-instruction-detail .aci-source-viewer');
  await expect(viewer).toContainText('# Broken path instructions');
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openInstruction(page, '.github/copilot-instructions.md');
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(FIXTURE_SECRET);
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  // The detail-state cleanup took the authored content with it: nothing on
  // the inventory carries a value the reader navigated away from (FR-027).
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});
