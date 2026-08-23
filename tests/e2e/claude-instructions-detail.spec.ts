// T240: browser acceptance for the Claude instruction detail (Phase 18).
// Launches the packaged CLI against an instruction-bearing fixture, opens a
// Claude instruction file from the inventory, and verifies the complete inert
// detail screen: the declarations the file wrote in authored order, the
// instructions that follow them, the complete authored source, the diagnostic
// of a file whose frontmatter cannot be parsed, and the cleanup that takes the
// content away again.
//
// The claims here can only be made against a rendered page: that a credential
// is shown exactly as written with no masking and no reveal control anywhere,
// that an environment reference stays the characters that were written even
// while the named variable is set in the host's environment, and that leaving
// the route drops the content.
//
// One claim is this vendor's own. Claude Code documents an `@path` import
// syntax, and this product still emits no relationship: what an authored token
// ends at is fixed by no official page, so any extraction rule would be this
// product's invention and a wrong one would assert a reference the reader never
// wrote. The token therefore reaches the screen the way every other authored
// character does — through the instructions and the complete source — and no
// relationship section exists to carry it.
//
// The visible checkpoint of this milestone: selecting a Claude instruction
// shows complete inert detail without opening the files it names, at the
// repository root and in a subdirectory alike.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown exactly as written. */
const FIXTURE_SECRET = 'ghp_E2ECLAUDEDETAIL0000000000000000000000';

/** An environment reference the product must never resolve. */

const ENVIRONMENT_REFERENCE = '${ACI_E2E_CLAUDE_ENDPOINT}';

/** The value the named variable actually holds while the host runs. */
const ENVIRONMENT_SENTINEL = 'claude-sentinel-that-must-not-appear';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-claude-instr-detail-'));
  await writeFile(
    join(fixture, 'CLAUDE.md'),
    [
      '---',
      'scope: project',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# House rules',
      '',
      'See @docs/setup.md before deploying.',
      '',
    ].join('\n'),
    'utf8',
  );
  // The subdirectory file. Claude discovers it once it reads a file in that
  // subtree, so it is an admitted instruction file with a detail of its own —
  // and it governs a different range, which is why the inventory lists it
  // under a second row.
  await mkdir(join(fixture, 'packages/api'), { recursive: true });
  await writeFile(join(fixture, 'packages/api/CLAUDE.md'), '# Nested instructions\n', 'utf8');
  // A second root file whose frontmatter cannot be parsed: extraction is
  // all-or-nothing, so its declarations and instructions are absent while its
  // complete source stays readable (FR-028).
  await writeFile(
    join(fixture, 'CLAUDE.local.md'),
    '---\nscope: [unterminated\n---\n\n# Broken local instructions\n',
    'utf8',
  );
  // The file the authored token names. It exists so "no target is opened" is
  // proven against a real file rather than against an absence.
  await mkdir(join(fixture, 'docs'), { recursive: true });
  await writeFile(join(fixture, 'docs/setup.md'), '# setup\n', 'utf8');

  // The named variable is really set in the host's environment (the spawned
  // CLI inherits it), so "resolves nowhere" is proven against a value that
  // exists to leak, not against an absence.
  process.env['ACI_E2E_CLAUDE_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  delete process.env['ACI_E2E_CLAUDE_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named instruction file's detail route from the inventory. */
async function openInstruction(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  // Scoped to the file's own entry inside its range row: the row's unit is the
  // applicability range, so one row lists several files and only the entry
  // holding this path offers this file's links.
  await page
    .locator('.aci-instruction-row__files > li', { hasText: path })
    .locator('.aci-instruction-row__owner a')
    .first()
    .click();
  // The click resolves when the click lands, not when the route has swapped,
  // and this route's own heading is what says the swap happened. Waiting here
  // rather than in each test is what lets a test read the rendered page
  // directly instead of racing the router.
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText(path);
}

test('opens complete inert instruction detail from the inventory', async ({ page }) => {
  await openInstruction(page, 'CLAUDE.md');
  // The page is headed by the file's path — the row's own identity — with the
  // recognizing product and the kind beside it. Nothing says which documented
  // layer the file belongs to: that is a relation to a working directory this
  // product does not observe (FR-009).
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('CLAUDE.md');
  // Every product that recognizes the file, each with the surfaces its
  // admitting rules rest on: the root `CLAUDE.md` is Claude Code's project
  // instruction file and Copilot's documented agent-instruction alternative,
  // so both stand here and neither is a claim that a session loaded it.
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'GitHub Copilot (VS Code, CLI, Cloud agent), Claude Code (CLI and IDE clients) · Instructions',
  );
  // The declarations lead, in authored order — scope, endpoint, api_key is the
  // file's own order, not a sort — with the credential and the environment
  // reference exactly as written.
  const declarations = page.locator('.aci-instruction-detail__declarations');
  await expect(declarations).toContainText('scope');
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(declarations).toContainText(ENVIRONMENT_REFERENCE);
  // The instructions follow: the body the frontmatter block was removed from.
  const instructions = page.locator('.aci-instruction-detail__instructions');
  await expect(instructions).toContainText('# House rules');
  await expect(instructions).toContainText('See @docs/setup.md before deploying.');
});

test('opens a subdirectory instruction file exactly as it opens the root one', async ({ page }) => {
  await openInstruction(page, 'packages/api/CLAUDE.md');
  // The heading is the file's full Source-relative Path, so two files named
  // `CLAUDE.md` are told apart by the only identity either of them has
  // (FR-030). Depth changes nothing else about the page.
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('packages/api/CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail__recognition')).toHaveText(
    'Claude Code (CLI and IDE clients) · Instructions',
  );
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(
    'This file declares none.',
  );
  await expect(page.locator('.aci-instruction-detail__instructions')).toContainText(
    '# Nested instructions',
  );
});

test('masks nothing, offers no reveal control, and resolves no environment reference', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.md');
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
  await openInstruction(page, 'CLAUDE.md');
  await page.getByRole('tab', { name: /^file$/iu }).click();
  // Scoped to the file panel: the instructions panel keeps its own viewer
  // mounted behind the tab strip, and this claim is about the complete file.
  const viewer = page.locator('#aci-instruction-panel-file .aci-source-viewer');
  await expect(viewer).toBeVisible();
  // The frontmatter's authored spelling lives here — the parse's two halves
  // are one tab over — together with the body, byte for byte.
  await expect(viewer).toContainText('scope: project');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText('# House rules');
});

test('keeps an authored @path token as source text, with no relationship section', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.md');
  // Claude Code documents this syntax, and the product still records no edge:
  // where an authored token ends is fixed by no official page, so extracting
  // one would mean inventing the rule and asserting references the reader did
  // not write. The token stays in the instructions the reader can read.
  // Asserted through the panel that renders it, because the instructions are
  // drawn by the source viewer and appear as it finishes mounting; the
  // negatives below are read from the settled page.
  await expect(page.locator('.aci-instruction-detail__instructions')).toContainText(
    'See @docs/setup.md before deploying.',
  );
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/relationship/iu);
  expect(text).not.toMatch(/\bimports?\b/iu);
  // And the file it names is not in this inventory through that token: only a
  // rule admits a file, and no rule admits `docs/setup.md`.
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain('docs/setup.md');
});

test('reports an unparseable frontmatter with its diagnostic while the source stays readable', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.local.md');
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
  await expect(viewer).toContainText('# Broken local instructions');
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openInstruction(page, 'CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(FIXTURE_SECRET);
  await page.getByRole('link', { name: 'Back to the inventory' }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  // The detail-state cleanup took the authored content with it: nothing on the
  // inventory carries a value the reader navigated away from (FR-027).
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('reports a Claude link whose path the current scan does not hold', async ({ page }) => {
  await page.goto(`${host.origin}instructions/packages/api/CLAUDE.local.md`);
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
