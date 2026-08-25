// T670: browser acceptance for the Claude output-style detail (Phase 66).
// Launches the packaged CLI against a fixture whose styles carry a literal
// credential and an unresolved environment reference, opens a style from its
// row, and verifies the complete literal detail — the declarations in the
// documented order, the instructions the frontmatter block was removed from,
// the complete authored source on its own tab, no masking or reveal control,
// no process-environment substitution, and no claim that the style is applied.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A credential-shaped literal with no validity anywhere; see the content fixtures. */
const FIXTURE_SECRET = 'ghp_E2E00000000000000000000000000000000';
/** The environment reference the style writes, which nothing may resolve. */
const ENV_REFERENCE = '${ACI_E2E_TOKEN}';
/** What the variable holds in the host's environment, which must reach no response. */
const ENV_SENTINEL = 'aci-e2e-environment-sentinel';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-output-styles-detail-'));
  await mkdir(join(fixture, '.claude/output-styles'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/output-styles/deploy-notes.md'),
    [
      '---',
      'description: Explain a deploy to the on-call engineer',
      'name: Deploy notes',
      'keep-coding-instructions: false',
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# Deploy notes',
      '',
      `- The staging token is ${FIXTURE_SECRET}.`,
      `- The endpoint is ${ENV_REFERENCE}.`,
      '',
    ].join('\n'),
    'utf8',
  );
  // A style whose frontmatter cannot be parsed: extraction fails
  // all-or-nothing while the complete source stays displayed (FR-028).
  await writeFile(
    join(fixture, '.claude/output-styles/broken.md'),
    '---\nname: [unterminated\n---\n\n# Broken\n',
    'utf8',
  );
  process.env['ACI_E2E_TOKEN'] = ENV_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  delete process.env['ACI_E2E_TOKEN'];
  await rm(fixture, { recursive: true, force: true });
});

/** Opens one style's detail route directly by its stable identity. */
async function openStyle(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(new URL(`/output-styles/${path}`, host.origin).href);
}

test('opens a style from its row and heads the page by the file', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /Output style/u }).click();
  await page
    .locator('.aci-output-style-row__owner a')
    .filter({ hasText: 'deploy-notes.md' })
    .click();
  await expect(page).toHaveURL(
    new URL('/output-styles/.claude/output-styles/deploy-notes.md', host.origin).href,
  );
  // The file is the subject, so the path heads the page; the style name the
  // row is listed under is stated beneath it.
  await expect(page.locator('.aci-output-style-detail h2')).toContainText(
    '.claude/output-styles/deploy-notes.md',
  );
  await expect(page.locator('.aci-output-style-detail__style-name')).toContainText(
    'Style name: Deploy notes',
  );
  await expect(page.locator('.aci-output-style-detail__recognition')).toContainText(
    'Claude Code (CLI and IDE clients) · Output style',
  );
});

test('shows the declarations in the documented order and the instructions apart', async ({
  page,
}) => {
  await openStyle(page, '.claude/output-styles/deploy-notes.md');
  const declarations = page.locator('.aci-output-style-detail__declarations');
  // Every key the file declares, as one YAML document, led in the order the
  // vendor's own frontmatter table publishes them — the file wrote
  // `description` first and `name` second, and the page leads `name`.
  await expect(declarations).toContainText('name: Deploy notes');
  await expect(declarations).toContainText('api_key:');
  const text = await declarations.innerText();
  const positions = ['name:', 'description:', 'keep-coding-instructions:', 'api_key:'].map((key) =>
    text.indexOf(key),
  );
  expect(positions).toEqual([...positions].toSorted((left, right) => left - right));
  expect(Math.min(...positions)).toBeGreaterThan(-1);

  // The instructions are the body alone: the declarations are not repeated
  // inside it, and the block's fences are gone with the block.
  const instructions = page.locator('.aci-output-style-detail__instructions .aci-source-viewer');
  await expect(instructions).toContainText('# Deploy notes');
  expect(await instructions.innerText()).not.toContain('name: Deploy notes');
});

test('shows the literal credential and environment reference with no mask or reveal', async ({
  page,
}) => {
  await openStyle(page, '.claude/output-styles/deploy-notes.md');
  for (const label of [/reveal/iu, /unmask/iu, /show secret/iu, /hide value/iu]) {
    await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  }
  // Awaited rather than read once: the declarations and the instructions
  // render in Monaco, which writes only the lines its own box holds, and the
  // box reaches the whole document one layout after the fit height is written
  // to it (`SourceViewerHandle.mount` § fitContent).
  const declarations = page.locator('.aci-output-style-detail__declarations');
  await expect(declarations).toContainText(`api_key: ${FIXTURE_SECRET}`);
  const instructions = page.locator('.aci-output-style-detail__instructions');
  await expect(instructions).toContainText(ENV_REFERENCE);
  const text = (await page.locator('.aci-output-style-detail').textContent()) ?? '';
  expect(text).not.toContain('••••');
  // The variable is set in the host's environment, and its value still
  // reaches no response: the authored `${ACI_E2E_TOKEN}` is the display.
  expect(text).not.toContain(ENV_SENTINEL);
});

test('serves the complete authored file on its own tab', async ({ page }) => {
  await openStyle(page, '.claude/output-styles/deploy-notes.md');
  await page.getByRole('tab', { name: /^file/iu }).click();
  const viewer = page.locator('[role="tabpanel"]:visible .aci-source-viewer');
  await expect(viewer).toBeVisible();
  // The complete document, frontmatter fences included: this tab is where
  // every authored spelling stays readable (FR-025, FR-027).
  await expect(viewer).toContainText('---');
  await expect(viewer).toContainText('name: Deploy notes');
  await expect(viewer).toContainText(FIXTURE_SECRET);
});

test('keeps a malformed style readable while its one parse failure is stated', async ({ page }) => {
  await openStyle(page, '.claude/output-styles/broken.md');
  // A failed extraction leaves the style panel nothing to show, so the page
  // itself selects the file tab; the source and the failure must be where the
  // reader actually is (FR-028).
  await expect(page.getByRole('tab', { name: /^file/iu })).toHaveAttribute('aria-selected', 'true');
  const viewer = page.locator('[role="tabpanel"]:visible .aci-source-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('# Broken');
  // Scoped to the panel the reader is on: both panels carry the file's
  // diagnostics, and the visible one is where the failure has to be.
  const failure = page.locator('[role="tabpanel"]:visible li', {
    hasText: 'This file could not be parsed',
  });
  await expect(failure).toHaveCount(1);
  await expect(failure).toBeVisible();
  // The row's name is the file's own, which a failed parse takes nothing away
  // from (FR-028).
  await expect(page.locator('.aci-output-style-detail__style-name')).toContainText(
    'Style name: broken',
  );
});

test('states nothing about whether the style is applied', async ({ page }) => {
  await openStyle(page, '.claude/output-styles/deploy-notes.md');
  const detail = (await page.locator('.aci-output-style-detail').textContent()) ?? '';
  // Which style a session uses turns on settings, session state, and plugin
  // overrides this tool never observes (FR-009).
  for (const claim of ['is applied', 'in force', 'selected by', 'takes effect', 'overrides']) {
    expect(detail.toLowerCase()).not.toContain(claim);
  }
});
