// T129: browser acceptance for the incremental session containing Codex and
// Claude SKILL lists (Phase 8 "Claude Skill List"). Launches the packaged CLI
// against a mixed fixture, opens the printed loopback URL, and verifies the
// two vendors' inventories coexist.
//
// The claims that need a rendered page: that the Claude and Codex rows share
// one inventory grouped by declared name — a name both vendors declare is one
// row listing both products' definitions — that a nested Claude skill (a
// directory the Codex allowlist must never admit for its own spelling) is
// listed as an ordinary row, that a Claude skill without an authored name
// renders by its path rather than by a guessed one, and that the tool filter
// separates the vendors. Everything else — the exact admitted sets, near
// misses, provenance — is proven closer to the code and is asserted here only
// as far as a user can see it.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-claude-skills-'));
  // A root-level Claude skill whose authored name differs from its directory,
  // so the rendered name can only have come from the frontmatter (FR-007).
  await mkdir(join(fixture, '.claude/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, '.claude/skills/greet/SKILL.md'),
    '---\nname: claude-greet\n---\n\nSay hello.\n',
    'utf8',
  );
  // A nested Claude skill: a real lazy-discovery layer for Claude, and the
  // same nesting that stays a near miss for Codex.
  await mkdir(join(fixture, 'packages/api/.claude/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.claude/skills/deploy/SKILL.md'),
    '# Nested deploy\n',
    'utf8',
  );
  // The Codex skill whose behavior the phase must preserve, name and all.
  await mkdir(join(fixture, '.agents/skills/codex-greet'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/codex-greet/SKILL.md'),
    '---\nname: codex-greet\n---\n\n# Codex\n',
    'utf8',
  );
  // The nested Codex spelling stays out of the inventory even though the same
  // directory shape is admitted for Claude.
  await mkdir(join(fixture, 'packages/api/.agents/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.agents/skills/deploy/SKILL.md'),
    '# Codex near miss\n',
    'utf8',
  );
  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists Claude and Codex skills together, grouped by declared name', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(3);

  // Two named rows in name order, then the nameless nested Claude skill by
  // path: one grouping for both vendors, not one list per product.
  await expect(page.locator('.aci-declared-name')).toHaveText(['claude-greet', 'codex-greet']);
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.claude/skills/greet/SKILL.md',
    '.agents/skills/codex-greet/SKILL.md',
    'packages/api/.claude/skills/deploy/SKILL.md',
  ]);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
});

test('badges each row with the product that recognized it', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items.nth(0)).toContainText('Claude Code');
  await expect(items.nth(0)).not.toContainText('OpenAI Codex');
  await expect(items.nth(1)).toContainText('OpenAI Codex');
  await expect(items.nth(1)).not.toContainText('Claude Code');
  await expect(items.nth(2)).toContainText('Claude Code');
});

test('shows a Claude skill by its authored name, and a nameless one by its path', async ({
  page,
}) => {
  await page.goto(host.origin);
  // `claude-greet` lives in `.claude/skills/greet/`, so a row showing it
  // proves the name came from the frontmatter rather than the directory
  // segment (FR-007).
  const named = page.locator('.aci-item', { hasText: '.claude/skills/greet/SKILL.md' });
  await expect(named.locator('.aci-declared-name')).toHaveText('claude-greet');
  // The nested skill authors no name: the path is the row, with no name
  // element at all — not the directory segment, and not a placeholder.
  const nameless = page.locator('.aci-item', {
    hasText: 'packages/api/.claude/skills/deploy/SKILL.md',
  });
  await expect(nameless.locator('.aci-declared-name')).toHaveCount(0);
});

test('groups a name both vendors declare into one row listing both products', async ({ page }) => {
  // A Codex skill declaring the same `claude-greet` name from its own
  // location: the name is the row's unit, so the inventory gains a definition
  // rather than a row, and the one row now shows both vendors' data side by
  // side with each product's documented same-name rule.
  await mkdir(join(fixture, '.agents/skills/salute'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/salute/SKILL.md'),
    '---\nname: claude-greet\n---\n\n# Salute\n',
    'utf8',
  );
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Nothing polls, so the committed result arrives on an explicit refresh
  // rather than on its own; the refresh is retried because the scan need not
  // have committed when the click lands.
  const grouped = page.locator('.aci-item').filter({ hasText: 'claude-greet' }).first();
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(grouped.locator('.aci-path')).toHaveText(
      ['.agents/skills/salute/SKILL.md', '.claude/skills/greet/SKILL.md'],
      { timeout: 1_000 },
    );
  }).toPass();
  await expect(page.locator('.aci-item')).toHaveCount(3);
  // Each definition keeps its own product badge inside the shared row.
  await expect(grouped).toContainText('Claude Code');
  await expect(grouped).toContainText('OpenAI Codex');
  // The row states what each product documents and never orders the two.
  await expect(grouped).toContainText('Claude Code uses the first in its documented source order');
  await expect(grouped).toContainText('OpenAI Codex keeps all of them, in no documented order');
});

test('shows no near-miss path from either vendor', async ({ page }) => {
  await page.goto(host.origin);
  const text = await page.locator('main').innerText();
  // Rendered exactly once, as the admitted Claude row — never a second time
  // for Codex's spelling of the same package directory.
  expect(text).not.toContain('packages/api/.agents/skills/deploy/SKILL.md');
  // Authored content stays out of the list (FR-027).
  expect(text).not.toContain('Say hello');
  expect(text).not.toContain('# Nested deploy');
});

test('filters the two vendors apart with the tool filter', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);

  await page.getByLabel('Tool').selectOption('claude');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await expect(page.locator('.aci-filters')).toContainText('Showing 2 of 3');
  for (const item of await page.locator('.aci-item').all()) {
    await expect(item).toContainText('Claude Code');
  }

  await page.getByLabel('Tool').selectOption('codex');
  await expect(page.locator('.aci-item')).toHaveCount(1);
  await expect(page.locator('.aci-item')).toContainText('OpenAI Codex');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.aci-item')).toHaveCount(3);
});

test('opens a Claude definition by its file identity into the detail route', async ({ page }) => {
  await page.goto(host.origin);
  const link = page
    .locator('.aci-item', { hasText: '.claude/skills/greet/SKILL.md' })
    .locator('.aci-path a');
  await link.click();
  // The detail route is the one surface that serves authored content; the
  // list milestone only proves the row links to a per-file identity.
  await expect(page).toHaveURL(/\/skills\/[A-Za-z0-9_-]{22}$/u);
});
