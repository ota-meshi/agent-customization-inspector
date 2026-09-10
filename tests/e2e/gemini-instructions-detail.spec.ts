// specs/002-gemini-cli-support T034: browser acceptance for the Gemini CLI
// context-file detail. Opens a `GEMINI.md` from its inventory row and verifies
// the complete literal detail: the declarations and the instructions, a
// credential shown exactly as authored with no masking or reveal control, a
// literal environment reference never replaced by the process value a
// same-named variable carries, the vendor's `@file` import left as text, and
// the complete authored source on the file tab (FR-007, FR-025 through FR-027).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, shown whole and unmasked. */
const FIXTURE_SECRET = 'AIzaE2EGEMINIDETAIL000000000000000000000000';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${GEMINI_E2E_INSTRUCTION_ENDPOINT}';

/**
 * The value the host process's own environment carries under the referenced
 * name. If the product ever resolved a reference, this is the string that
 * would leak into the page — so the test plants it and asserts its absence.
 */
const ENVIRONMENT_SENTINEL = 'resolved-environment-sentinel-value';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-gemini-instr-detail-'));
  await writeFile(
    join(fixture, 'GEMINI.md'),
    [
      '---',
      'scope: repository',
      `endpoint: ${ENVIRONMENT_REFERENCE}`,
      `api_key: ${FIXTURE_SECRET}`,
      '---',
      '',
      '# House rules',
      '',
      'Read @./docs/setup.md before deploying.',
      '',
    ].join('\n'),
    'utf8',
  );
  await mkdir(join(fixture, 'docs'), { recursive: true });
  await writeFile(join(fixture, 'docs/setup.md'), '# setup\n', 'utf8');
  await writeFile(join(fixture, 'docs/GEMINI.md'), '# Documentation context\n', 'utf8');
  process.env['GEMINI_E2E_INSTRUCTION_ENDPOINT'] = ENVIRONMENT_SENTINEL;
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  delete process.env['GEMINI_E2E_INSTRUCTION_ENDPOINT'];
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

/** Opens the named context file's detail route from the inventory. */
async function openInstruction(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(host.origin);
  // Scoped to the file's own entry inside its range row: every recognizing
  // product's link addresses the same file detail, so the first one opens it.
  await page
    .locator('.aci-source-family-blocks__members > li', { hasText: path })
    .locator('.aci-row-file a')
    .first()
    .click();
}

test('opens the complete inert context-file detail from the inventory', async ({ page }) => {
  await openInstruction(page, 'GEMINI.md');
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('GEMINI.md');
  // Both recognizing products, each with the surfaces its rules rest on.
  const attributes = page.locator('.aci-detail-attributes');
  await expect(attributes).toContainText('Gemini CLI');
  await expect(attributes).toContainText('GitHub Copilot');
  // The declarations lead, in authored order, with the credential and the
  // environment reference exactly as written.
  const declarations = page.locator('.aci-instruction-detail__declarations');
  await expect(declarations).toContainText('scope');
  await expect(declarations).toContainText(FIXTURE_SECRET);
  await expect(declarations).toContainText(ENVIRONMENT_REFERENCE);
  // The instructions follow; the vendor's import syntax stays source text and
  // opens nothing (FR-019).
  const instructions = page.locator('.aci-instruction-detail__instructions');
  await expect(instructions).toContainText('# House rules');
  await expect(instructions).toContainText('Read @./docs/setup.md before deploying.');
  await expect(page.getByRole('link', { name: /setup\.md/u })).toHaveCount(0);
});

test('masks nothing, offers no reveal control, and resolves no environment reference', async ({
  page,
}) => {
  await openInstruction(page, 'GEMINI.md');
  await expect(page.locator('.aci-instruction-detail__declarations')).toContainText(FIXTURE_SECRET);
  const text = await page.locator('main').innerText();
  expect(text).toContain(ENVIRONMENT_REFERENCE);
  expect(text).not.toContain(ENVIRONMENT_SENTINEL);
  await expect(page.getByRole('button', { name: /reveal|show|unmask/iu })).toHaveCount(0);
  expect(text).not.toMatch(/•{3,}|\*{3,}/u);
});

test('serves the complete authored source on the file tab', async ({ page }) => {
  await openInstruction(page, 'GEMINI.md');
  await page.getByRole('tab', { name: /^file$/iu }).click();
  const viewer = page.locator('#aci-instruction-panel-file .aci-source-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('scope: repository');
  await expect(viewer).toContainText(FIXTURE_SECRET);
  await expect(viewer).toContainText('# House rules');
});

test('opens a nested context file as Gemini CLI’s own row', async ({ page }) => {
  await openInstruction(page, 'docs/GEMINI.md');
  await expect(page.locator('.aci-instruction-detail h2')).toHaveText('docs/GEMINI.md');
  const attributes = page.locator('.aci-detail-attributes');
  await expect(attributes).toContainText('Gemini CLI');
  await expect(attributes).not.toContainText('GitHub Copilot');
  await expect(page.locator('.aci-instruction-detail__instructions')).toContainText(
    '# Documentation context',
  );
});

test('reports a link whose path the current scan does not hold', async ({ page }) => {
  await page.goto(new URL('/instructions/detail/repository/removed/GEMINI.md', host.origin).href);
  await expect(page.locator('main')).toContainText(
    "Nothing in the current scan sits at this link's path.",
  );
});
