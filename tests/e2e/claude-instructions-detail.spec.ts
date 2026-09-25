// T240, T1224: browser acceptance for the Claude instruction detail (Phase
// 18). Launches the packaged CLI against an instruction-bearing fixture, opens
// a Claude instruction file from the inventory, and verifies the complete
// inert detail screen: the file shown once and whole, with no tabs — Claude
// Code documents no frontmatter for a `CLAUDE.md`, so a `---` block opening one
// is a line of its instructions rather than declarations to set beside it —
// no diagnostic for a block that is not YAML, and the cleanup that takes the
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
// character does — through the complete source — and no relationship section
// exists to carry it.
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
  // A second root file opening with a block that is not YAML. Claude Code
  // reads the file whole, so the block is a line of its instructions: nothing
  // parses it, so nothing fails (FR-028).
  await writeFile(
    join(fixture, 'CLAUDE.local.md'),
    '---\nscope: [unterminated\n---\n\n# Local instructions\n',
    'utf8',
  );
  // A file written with a leading byte-order mark, which the one face states
  // on the line under the heading because no file tab exists to state it.
  await mkdir(join(fixture, 'packages/web'), { recursive: true });
  await writeFile(join(fixture, 'packages/web/CLAUDE.md'), '\uFEFF# Web instructions\n', 'utf8');
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
    .locator('.aci-source-family-blocks__members > li', { hasText: path })
    .locator('.aci-row-file a')
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
  // so both stand in the range's box and neither is a claim that a session
  // loaded it.
  const attributes = page.locator('.aci-instruction-detail__ranges');
  await expect(attributes).toContainText('GitHub Copilot');
  await expect(attributes).toContainText('VS Code, CLI, Cloud agent');
  await expect(attributes).toContainText('Claude Code');
  await expect(attributes).toContainText('CLI and IDE clients');
  // The file, once and whole: the block that opens it is a line of the
  // instructions like the rest, with the credential and the environment
  // reference exactly as written, so there is no second subject for a tab to
  // hold and no declaration panel to say it holds none (T1224).
  const viewer = page.locator('.aci-instruction-detail .aci-source-viewer');
  await expect(viewer).toHaveCount(1);
  await expect(viewer).toContainText('scope: project');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText(ENVIRONMENT_REFERENCE);
  await expect(viewer).toContainText('# House rules');
  await expect(viewer).toContainText('See @docs/setup.md before deploying.');
  await expect(page.getByRole('tablist', { name: 'Instruction detail' })).toHaveCount(0);
  await expect(page.locator('.aci-instruction-detail')).not.toContainText('declares none');
});

test('opens a subdirectory instruction file exactly as it opens the root one', async ({ page }) => {
  await openInstruction(page, 'packages/api/CLAUDE.md');
  // The heading is the file's full Source-relative Path, so two files named
  // `CLAUDE.md` are told apart by the only identity either of them has
  // (FR-030). Depth changes nothing else about the page.
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('packages/api/CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail__ranges')).toContainText('Claude Code');
  await expect(page.locator('.aci-instruction-detail .aci-source-viewer')).toContainText(
    '# Nested instructions',
  );
});

test('states a removed byte-order mark on the line under the heading', async ({ page }) => {
  // The one face has no file tab, so the line of the file's own facts is
  // where the decoding is stated in full (`DetailAttributes.vue`
  // § statesByteOrderMark).
  await openInstruction(page, 'packages/web/CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail .aci-detail-attributes')).toContainText(
    'byte-order mark removed before decoding',
  );
  await expect(page.locator('.aci-instruction-detail .aci-source-viewer')).toContainText(
    '# Web instructions',
  );
});

test('masks nothing, offers no reveal control, and resolves no environment reference', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail .aci-source-viewer')).toContainText(
    FIXTURE_SECRET,
  );
  const text = await page.locator('main').innerText();
  // The named variable is set in the host's environment, and its value still
  // appears nowhere: the authored `${...}` spelling is the whole display, and
  // no control offers to uncover anything (FR-025, FR-027).
  expect(text).toContain(ENVIRONMENT_REFERENCE);
  expect(text).not.toContain(ENVIRONMENT_SENTINEL);
  await expect(page.getByRole('button', { name: /reveal|show|unmask/iu })).toHaveCount(0);
  expect(text).not.toMatch(/•{3,}|\*{3,}/u);
});

test('keeps an authored @path token as source text, with no relationship section', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.md');
  // Claude Code documents this syntax, and the product still records no edge:
  // where an authored token ends is fixed by no official page, so extracting
  // one would mean inventing the rule and asserting references the reader did
  // not write. The token stays in the file the reader can read. Asserted
  // through the viewer that renders it, because the file is drawn by the
  // source viewer and appears as it finishes mounting; the negatives below are
  // read from the settled page.
  await expect(page.locator('.aci-instruction-detail .aci-source-viewer')).toContainText(
    'See @docs/setup.md before deploying.',
  );
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/relationship/iu);
  expect(text).not.toMatch(/\bimports?\b/iu);
  // And the file it names is not in this inventory through that token: only a
  // rule admits a file, and no rule admits `docs/setup.md`.
  await page.getByRole('link', { name: /Back to /u }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain('docs/setup.md');
});

test('shows a block that is not YAML as a line of the file, with no diagnostic', async ({
  page,
}) => {
  await openInstruction(page, 'CLAUDE.local.md');
  // Nothing parses the block of a file read whole, so nothing failed: the
  // page is the file, block included, and states no failure (FR-028).
  const viewer = page.locator('.aci-instruction-detail .aci-source-viewer');
  await expect(viewer).toContainText('scope: [unterminated');
  await expect(viewer).toContainText('# Local instructions');
  await expect(page.locator('.aci-instruction-detail')).not.toContainText('could not be parsed');
});

test('drops the content when the route leaves the file', async ({ page }) => {
  await openInstruction(page, 'CLAUDE.md');
  await expect(page.locator('.aci-instruction-detail .aci-source-viewer')).toContainText(
    FIXTURE_SECRET,
  );
  await page.getByRole('link', { name: /Back to /u }).click();
  await expect(page.locator('.aci-instruction-detail')).toHaveCount(0);
  // The detail-state cleanup took the authored content with it: nothing on the
  // inventory carries a value the reader navigated away from (FR-027).
  expect(await page.locator('main').innerText()).not.toContain(FIXTURE_SECRET);
});

test('reports a Claude link whose path the current scan does not hold', async ({ page }) => {
  await page.goto(`${host.origin}instructions/detail/repository/packages/api/CLAUDE.local.md`);
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
