// T157: browser acceptance for the Copilot SKILL list (Phase 10 "Copilot
// Skill List"). Launches the packaged CLI against a three-vendor fixture,
// opens the printed loopback URL, and verifies the rendered recognition
// matrix.
//
// The claims that need a rendered page: that the exact root matrix is what a
// user sees — the `.github` row is Copilot-only, the `.agents` row is
// Codex+Copilot, the `.claude` row is Claude+Copilot, and a nested `.claude`
// skill is Claude's alone — that every admitted `(file, tool)` recognition
// appears exactly once as a definition (a row is one resolved name and may
// group two files, a shared file defining once per recognizing tool),
// and that no nested-context, extra-depth, configured-root, or
// extra-recognition row exists. The admitted sets, one-read behavior, and
// provenance are proven closer to the code and are asserted here only as far
// as a user can see them.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

/** Writes one authored fixture file, creating parents. */
async function author(relative: string, content: string): Promise<void> {
  await mkdir(join(fixture, relative, '..'), { recursive: true });
  await writeFile(join(fixture, relative), content, 'utf8');
}

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-copilot-skills-'));
  // The positive matrix at the root, one skill per fixed directory spelling.
  // The `.github` and `.claude` root skills declare one shared name so a
  // Copilot-vs-Copilot collision exists.
  await author('.github/skills/ship/SKILL.md', '---\nname: voyage\n---\n\nGitHub ship.\n');
  await author('.agents/skills/orbit/SKILL.md', '---\nname: orbit\n---\n\nShared orbit.\n');
  await author('.claude/skills/lander/SKILL.md', '---\nname: voyage\n---\n\nClaude lander.\n');
  // Nested contexts of the three spellings. No Copilot surface documents a
  // downward skill lookup from a root context, so none may gain a Copilot
  // badge; only the `.claude` one is a row at all, as Claude's own
  // lazy-discovery layer.
  await author('packages/api/.github/skills/nested-ship/SKILL.md', '# Nested ship\n');
  await author('packages/api/.agents/skills/orbit-nested/SKILL.md', '# Nested near miss\n');
  await author('packages/api/.claude/skills/lander-nested/SKILL.md', '# Nested lander\n');
  // The negative matrix: extra depth, a configured-root shape, and a
  // repository `.copilot` directory. None may become a row.
  await author('.github/skills/ship/nested/SKILL.md', 'too deep\n');
  await author('.github/skills/SKILL.md', 'no name segment\n');
  await author('copilot-configured/skills/tool/SKILL.md', 'configured root\n');
  await author('.copilot/skills/tool/SKILL.md', 'repository .copilot\n');
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists each recognition exactly once as a definition with the exact matrix', async ({
  page,
}) => {
  await page.goto(host.origin);
  // Three rows for four admitted files: the two `voyage` files share
  // one grouped row, and the nested `.claude` layer — which declares no
  // name — is its own row named by its prefixed skill directory,
  // `packages/api:lander-nested` (FR-007, T1081).
  await expect(page.locator('.aci-item')).toHaveCount(3);

  // Rows in name order: `orbit`, the directory-named `packages/api:lander-nested`,
  // then the grouped `voyage`.
  // One path line per file; the definitions beneath it link once per
  // recognizing product to their own `/skills/<tool>/<source-relative path>`
  // routes.
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.agents/skills/orbit/SKILL.md',
    'packages/api/.claude/skills/lander-nested/SKILL.md',
    '.claude/skills/lander/SKILL.md',
    '.github/skills/ship/SKILL.md',
  ]);

  // The matrix, read off each file's definition links: a definition is one
  // `(file, tool)` recognition carrying exactly its own tool's link, and a
  // file's definitions follow the fixed tool order, so the links a file's
  // group shows together are that file's recognition matrix. `toHaveText` is
  // exact, so an extra definition would fail rather than pass unnoticed:
  // every root file is Copilot's, the shared spellings add the sharing
  // product, and the nested `.claude` layer is Claude's alone.
  const fileGroupOf = (path: string) => page.locator('.aci-skill-row__file', { hasText: path });
  const expectTools = async (path: string, tools: readonly string[]) => {
    await expect(fileGroupOf(path).locator('.aci-skill-row__definitions a')).toHaveText([...tools]);
  };
  await expectTools('.github/skills/ship/SKILL.md', ['GitHub Copilot']);
  await expectTools('.agents/skills/orbit/SKILL.md', ['GitHub Copilot', 'OpenAI Codex']);
  await expectTools('.claude/skills/lander/SKILL.md', ['GitHub Copilot', 'Claude Code']);
  await expectTools('packages/api/.claude/skills/lander-nested/SKILL.md', ['Claude Code']);
});

test('shows no nested-context, extra-depth, configured-root, or authored-content row', async ({
  page,
}) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);
  const text = await page.locator('main').innerText();
  // The nested `.github` and `.agents` contexts belong to runtime contexts
  // this product does not select, so neither is listed at all.
  expect(text).not.toContain('packages/api/.github/skills/nested-ship/SKILL.md');
  expect(text).not.toContain('packages/api/.agents/skills/orbit-nested/SKILL.md');
  // Extra depth and the missing name segment are near misses; the too-deep
  // file is also `ship/`'s companion, so it may appear inside that row's
  // supporting-file diagnostics but never as a definition of its own — the
  // matrix test's exact path assertions already pin each admitted file's
  // single appearance. The configured-root shapes must not appear at all: a
  // `COPILOT_SKILLS_DIRS`-style directory never becomes a scan root.
  expect(text).not.toContain('.github/skills/SKILL.md');
  expect(text).not.toContain('copilot-configured/skills/tool/SKILL.md');
  expect(text).not.toContain('.copilot/skills/tool/SKILL.md');
  // Authored content stays out of the list (FR-027).
  expect(text).not.toContain('GitHub ship');
  expect(text).not.toContain('Shared orbit');
  expect(text).not.toContain('# Nested ship');
});

test('groups the shared declared name and states the surface-dependent Copilot rule', async ({
  page,
}) => {
  await page.goto(host.origin);
  // `.github/skills/ship` and `.claude/skills/lander` both declare `voyage`:
  // one row, three definitions — `lander` one per recognizing product — and
  // only Copilot faces the collision — its statement is that no single rule
  // is documented across its surfaces, never the CLI's first-found winner as
  // a product-wide claim (FR-007).
  const grouped = page.locator('.aci-item').filter({ hasText: 'voyage' }).first();
  await expect(grouped.locator('.aci-path')).toHaveText([
    '.claude/skills/lander/SKILL.md',
    '.github/skills/ship/SKILL.md',
  ]);
  await expect(grouped).toContainText(
    'GitHub Copilot depends on the surface; no single documented rule',
  );
  await expect(grouped).not.toContainText('uses the first in its documented source order');
  await expect(grouped).not.toContainText('keeps all of them');
});

test('filters the matrix apart with the tool filter', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);

  // Copilot recognizes every root file; the sharing vendors keep exactly
  // their own — Claude both `.claude` depths, Codex the root `.agents` one.
  await page.getByLabel('Tool').selectOption('copilot');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await page.getByLabel('Tool').selectOption('codex');
  await expect(page.locator('.aci-item')).toHaveCount(1);
  await expect(page.locator('.aci-item')).toContainText('.agents/skills/orbit/SKILL.md');
  await page.getByLabel('Tool').selectOption('claude');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    'packages/api/.claude/skills/lander-nested/SKILL.md',
    '.claude/skills/lander/SKILL.md',
  ]);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.aci-item')).toHaveCount(3);
});

test('opens a Copilot definition by its stable identity into the detail route', async ({
  page,
}) => {
  await page.goto(host.origin);
  const link = page
    .locator('.aci-skill-row__file', { hasText: '.github/skills/ship/SKILL.md' })
    .locator('.aci-skill-row__definitions a');
  await link.click();
  // The detail route is the one surface that serves authored content; the
  // list milestone only proves the row links to the definition's own identity
  // — `/skills/<tool>/<source-relative path>` — and the `.github` root file is
  // Copilot's alone, so the tool segment is exact.
  await expect(page).toHaveURL(
    new URL('/skills/copilot/.github/skills/ship/SKILL.md', host.origin).href,
  );
});
