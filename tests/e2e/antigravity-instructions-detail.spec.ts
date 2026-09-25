// specs/003-antigravity-cli-support T034, T085, and spec 001's T1224: browser
// acceptance for the Antigravity CLI context files. `GEMINI.md` and
// `AGENTS.md` are this vendor's in any directory, each listed once with every
// product that reads it beside it and governing the directory holding it — the
// directory holding its `.agents/` when it sits in one — because the terminal
// loads the pair of every level it walks up through from a file it reads or
// edits (spec.md § FR-002, § FR-007). Each is shown whole: the Rules page says
// neither uses frontmatter and the terminal reads its entire content as plain
// Markdown.
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
  await mkdir(join(fixture, 'docs/.agents'), { recursive: true });
  // Opened by a block that is not YAML, which the terminal reads as the
  // Markdown it is (google.antigravity.rules § YAML frontmatter and activation
  // modes).
  await writeFile(
    join(fixture, 'GEMINI.md'),
    `---\ntrigger: [always_on\n---\n\n# Project context\n\nArtifacts land under ${ENVIRONMENT_REFERENCE}.\n`,
    'utf8',
  );
  await writeFile(
    join(fixture, 'AGENTS.md'),
    '# Agent instructions\n\nRun the linter before proposing a change.\n',
    'utf8',
  );
  await writeFile(join(fixture, 'packages/api/GEMINI.md'), '# a nested copy\n', 'utf8');
  await writeFile(join(fixture, 'packages/api/AGENTS.md'), '# read below the root\n', 'utf8');
  await writeFile(join(fixture, 'docs/.agents/GEMINI.md'), '# the docs directory\n', 'utf8');
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
  // adds Codex. A nested `GEMINI.md` is this vendor's alone, and reaches a row.
  await expect(panel).toContainText('Antigravity CLI');
  expect(addresses.some((address) => address.includes('packages/api/GEMINI.md'))).toBe(true);
});

test('shows a context file whole, resolving no reference it spells', async ({ page }) => {
  await page.goto(new URL('/instructions/detail/repository/GEMINI.md', host.origin).toString());
  const main = page.locator('main');
  await expect(page.locator('.aci-instruction-detail__ranges')).toContainText('Antigravity CLI');
  await expect(main).toContainText('Artifacts land under');
  await expect(main).toContainText(ENVIRONMENT_REFERENCE);
  // The opening block is a line of the file like the rest: nothing parses it,
  // so no tab sets declarations apart and no failure is stated (T1224).
  await expect(main).toContainText('trigger: [always_on');
  await expect(page.getByRole('tablist', { name: 'Instruction detail' })).toHaveCount(0);
  await expect(main).not.toContainText('could not be parsed');
});

test('makes a nested context file this vendor’s, governing its directory', async ({ page }) => {
  await page.goto(
    new URL('/instructions/detail/repository/packages/api/AGENTS.md', host.origin).toString(),
  );
  // Copilot and Claude Code read a nested `AGENTS.md` too, so the file is
  // listed with their marks beside this one.
  const ranges = page.locator('.aci-instruction-detail__ranges');
  await expect(ranges).toContainText('GitHub Copilot');
  await expect(ranges).toContainText('Antigravity CLI');
  await expect(ranges).toContainText('packages/api/**');
});

test('gives a directory’s `.agents/` pair that directory’s range', async ({ page }) => {
  await page.goto(
    new URL('/instructions/detail/repository/docs/.agents/GEMINI.md', host.origin).toString(),
  );
  // The `.agents/` spelling is where the terminal keeps a directory's pair,
  // not what the pair governs.
  const ranges = page.locator('.aci-instruction-detail__ranges');
  await expect(ranges).toContainText('Antigravity CLI');
  await expect(ranges).toContainText('docs/**');
  await expect(ranges).not.toContainText('docs/.agents/**');
});
