// specs/003-antigravity-cli-support T034: browser acceptance for the
// Antigravity CLI context files. The repository root's `GEMINI.md` and
// `AGENTS.md` are the pair this vendor documents, each listed once with every
// product that reads it beside it, and a copy below the root is not this
// vendor's — the migration page states the pair at the active directory and no
// depth under it (spec.md § FR-002; contracts/vendors/antigravity-cli.md
// § Known uncertainties item 1).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal environment reference that must render as its own characters. */
const ENVIRONMENT_REFERENCE = '${ANTIGRAVITY_E2E_CONTEXT_ROOT}';

let fixture: string;
let host: LaunchedHost;

test.beforeAll(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-antigravity-instructions-'));
  await mkdir(join(fixture, 'packages/api'), { recursive: true });
  await writeFile(
    join(fixture, 'GEMINI.md'),
    `# Project context\n\nArtifacts land under ${ENVIRONMENT_REFERENCE}.\n`,
    'utf8',
  );
  await writeFile(
    join(fixture, 'AGENTS.md'),
    '# Agent instructions\n\nRun the linter before proposing a change.\n',
    'utf8',
  );
  await writeFile(join(fixture, 'packages/api/GEMINI.md'), '# a nested copy\n', 'utf8');
  await writeFile(join(fixture, 'packages/api/AGENTS.md'), '# read below the root\n', 'utf8');
  host = await launchHost(fixture);
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists the root pair once each, with every product that reads it', async ({ page }) => {
  await page.goto(host.origin);
  await page.getByRole('tab', { name: /^Instructions/u }).click();
  const panel = page.getByRole('tabpanel');
  const addresses = await panel
    .locator('.aci-row-file a')
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
  expect(addresses.filter((address) => address.endsWith('/repository/GEMINI.md'))).toHaveLength(1);
  expect(addresses.filter((address) => address.endsWith('/repository/AGENTS.md'))).toHaveLength(1);
  // The root `GEMINI.md` is this vendor's and Copilot's; the root `AGENTS.md`
  // adds Codex. A nested `GEMINI.md` is nobody's, so it reaches no row.
  await expect(panel).toContainText('Antigravity CLI');
  expect(addresses.some((address) => address.includes('packages/api/GEMINI.md'))).toBe(false);
});

test('shows a context file whole, resolving no reference it spells', async ({ page }) => {
  await page.goto(new URL('/instructions/detail/repository/GEMINI.md', host.origin).toString());
  const main = page.locator('main');
  await expect(page.locator('.aci-detail-attributes')).toContainText('Antigravity CLI');
  await expect(main).toContainText('Artifacts land under');
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
});

test('does not make a nested context file this vendor’s', async ({ page }) => {
  await page.goto(
    new URL('/instructions/detail/repository/packages/api/AGENTS.md', host.origin).toString(),
  );
  // Copilot reads a nested `AGENTS.md` and this vendor does not, so the file
  // is listed with Copilot's mark alone.
  await expect(page.locator('.aci-detail-attributes')).toContainText('GitHub Copilot');
  await expect(page.locator('.aci-detail-attributes')).not.toContainText('Antigravity CLI');
});
