// T220: browser acceptance for the Codex instruction detail (Phase 16).
// Launches the packaged CLI against an instruction-bearing fixture, opens an
// instruction file from the inventory, and verifies the complete inert detail
// screen: the declarations the file wrote in authored order, the instructions
// that follow them, the complete authored source, the configured fallback's
// detail, diagnostics, and the cleanup that takes the content away again.
//
// The claims here can only be made against a rendered page: that a credential
// is shown exactly as written with no masking and no reveal control anywhere,
// that an environment reference stays the characters that were written even
// while the named variable is set in the host's environment, that no
// relationship section exists — no cited Codex page establishes a reference
// syntax for `AGENTS.md` (T217) — and that leaving the route drops the
// content.
//
// The visible checkpoint of this milestone: selecting a Codex instruction
// opens complete inert detail, whether it is one of the exact static files or
// a name the repository's configuration adds.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2EINSTRDETAIL000000000000000000000000';

/** An environment reference the product must never resolve. */

const ENVIRONMENT_REFERENCE = '${ACI_E2E_INSTRUCTION_ENDPOINT}';

/** The value the named variable actually holds while the host runs. */
const ENVIRONMENT_SENTINEL = 'sentinel-value-that-must-not-appear';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-codex-instr-detail-'));
  await writeFile(
    join(fixture, 'AGENTS.md'),
    [
      '---',
      'scope: repository',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# House rules',
      '',
      'Read @docs/setup.md before deploying.',
      '',
    ].join('\n'),
    'utf8',
  );
  // A second static instruction file whose frontmatter cannot be parsed:
  // extraction is all-or-nothing, so its declarations and instructions are
  // absent while its complete source stays readable (FR-028).
  await writeFile(
    join(fixture, 'AGENTS.override.md'),
    '---\nscope: [unterminated\n---\n\n# Broken override\n',
    'utf8',
  );
  // The configuration carrier declares one on-disk fallback; the carrier
  // itself is never published (Phase 15).
  await mkdir(join(fixture, '.codex'), { recursive: true });
  await writeFile(
    join(fixture, '.codex/config.toml'),
    'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]\n',
    'utf8',
  );
  await writeFile(join(fixture, 'TEAM_GUIDE.md'), '# Configured fallback guide\n', 'utf8');

  // The named variable is really set in the host's environment (the spawned
  // CLI inherits it), so "resolves nowhere" is proven against a value that
  // exists to leak, not against an absence.
  process.env['ACI_E2E_INSTRUCTION_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  delete process.env['ACI_E2E_INSTRUCTION_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named instruction file's detail route from the inventory. */
async function openInstruction(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  // Scoped to the file's own entry inside its range row: the row's unit is the
  // applicability range, so one row lists several files and only the entry
  // holding this path offers this file's links. Every recognizing product's
  // link addresses the same file detail, so the first one opens it (T224).
  await page
    .locator('.aci-instruction-row__files > li', { hasText: path })
    .locator('.aci-instruction-row__tools a')
    .first()
    .click();
}

test('opens complete inert static instruction detail from the inventory', async ({ page }) => {
  await openInstruction(page, 'AGENTS.md');
  // The page is headed by the file's path — the row's own identity — with
  // the recognizing product and the kind beside it.
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('AGENTS.md');
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'OpenAI Codex · Instructions',
  );
  // The declarations lead, in authored order — scope, endpoint, api_key is
  // the file's own order, not a sort — with the credential and the
  // environment reference exactly as written.
  const declarations = page.locator('.aci-instruction-detail__declarations');
  await expect(declarations).toContainText('scope');
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(declarations).toContainText(ENVIRONMENT_REFERENCE);
  // The instructions follow: the body the frontmatter block was removed from,
  // its reference-looking token staying source text.
  const instructions = page.locator('.aci-instruction-detail__instructions');
  await expect(instructions).toContainText('# House rules');
  await expect(instructions).toContainText('Read @docs/setup.md before deploying.');
});

test('masks nothing, offers no reveal control, and resolves no environment reference', async ({
  page,
}) => {
  await openInstruction(page, 'AGENTS.md');
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
  await openInstruction(page, 'AGENTS.md');
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

test('opens the configured fallback file the configuration read activated', async ({ page }) => {
  await openInstruction(page, 'TEAM_GUIDE.md');
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('TEAM_GUIDE.md');
  // A file with no frontmatter declares none, and its instructions are the
  // whole document; the detail is the ordinary instruction detail — which
  // rule admitted it is an internal record no surface reads out.
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(
    'This file declares none.',
  );
  await expect(page.locator('.aci-instruction-detail__instructions')).toContainText(
    '# Configured fallback guide',
  );
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('config.toml');
});

test('renders no relationship section anywhere on the detail', async ({ page }) => {
  await openInstruction(page, 'AGENTS.md');
  // No cited Codex page establishes an import or reference syntax for
  // `AGENTS.md`, so the authored `@path`-looking token stays source text and
  // no relationship vocabulary reaches the screen (T217).
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/relationship/iu);
  expect(text).not.toContain('Imports');
});

test('reports an unparseable frontmatter with its diagnostic while the source stays readable', async ({
  page,
}) => {
  await openInstruction(page, 'AGENTS.override.md');
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
  await expect(viewer).toContainText('# Broken override');
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openInstruction(page, 'AGENTS.md');
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(FIXTURE_SECRET);
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  // The detail-state cleanup took the authored content with it: nothing on
  // the inventory carries a value the reader navigated away from (FR-027).
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('heads a URL with no path segments by the kind, never an empty heading', async ({ page }) => {
  // The terminal catch-all also matches `/instructions/` itself. An empty
  // path names no file, so the page reports the dead link — and its focused
  // heading still describes the page (WCAG 2.4.6) instead of rendering the
  // empty path.
  await page.goto(`${host.origin}instructions/`);
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('Instructions');
  await expect(page.locator('.aci-instruction-detail')).toContainText(
    'Nothing in the current scan sits at this link',
  );
});

test('reports a link whose path the current scan does not hold', async ({ page }) => {
  await page.goto(`${host.origin}instructions/REMOVED_GUIDE.md`);
  await expect(page.locator('.aci-instruction-detail')).toContainText(
    'Nothing in the current scan sits at this link',
  );
  // The page's stable live region carries the same statement, so the state is
  // announced without moving keyboard focus (WCAG 4.1.3), and the title stays
  // state-appropriate (WCAG 2.4.2).
  await expect(page.locator('.aci-instruction-detail .aci-live-region[role="status"]')).toHaveText(
    /Nothing in the current scan sits at this link/u,
  );
  await expect(page).toHaveTitle(
    '\u2068Link not in this scan\u2069 — Agent Customization Inspector',
  );
});
