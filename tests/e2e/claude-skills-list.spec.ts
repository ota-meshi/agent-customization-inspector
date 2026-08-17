// T129: browser acceptance for the incremental session containing Codex and
// Claude SKILL lists (Phase 8 "Claude Skill List"). Launches the packaged CLI
// against a mixed fixture, opens the printed loopback URL, and verifies the
// two vendors' inventories coexist.
//
// The claims that need a rendered page: that the Claude and Codex rows share
// one inventory grouped by the name each tool resolves — a name two vendors
// resolve for one file is one row listing both products' definitions, and a
// nested Claude skill's name carries the root-relative prefix
// (`apps/web:deploy`, FR-007) — that a nested Claude skill (a
// directory the Codex allowlist must never admit for its own spelling) is
// listed as an ordinary row, that a Claude skill without an authored name
// renders by its path rather than by a guessed one, and that the tool filter
// separates the vendors. Since the Copilot phase, `.agents` and `.claude` are
// Copilot locations too at the repository root, so the root rows here also
// carry a GitHub Copilot badge — while the nested rows stay single-vendor,
// because no Copilot surface documents a downward lookup from a root context.
// Everything else — the exact admitted sets, near misses, provenance — is
// proven closer to the code and is asserted here only as far as a user can
// see it.
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
  // The nested Codex spelling stays out of the inventory entirely even though
  // the same directory shape is admitted for Claude: Codex's and Copilot's
  // `.agents` programs are both anchored at the root.
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

test('lists every vendor\u2019s skills together, grouped by resolved name', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(3);

  // Rows in name order — the nested Claude layer declares no name, so it is
  // named by its prefixed skill directory: one grouping for every vendor, not
  // one list per product.
  await expect(page.locator('.aci-skill-row__name')).toHaveText([
    'claude-greet',
    'codex-greet',
    'packages/api:deploy',
  ]);
  // One path line per file, with a definition link per recognizing product
  // beneath it — each linking to its own `/skills/<tool>/<source-relative
  // path>` route — so the shared root files and the Claude-only nested layer
  // each state their path once.
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.claude/skills/greet/SKILL.md',
    '.agents/skills/codex-greet/SKILL.md',
    'packages/api/.claude/skills/deploy/SKILL.md',
  ]);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
});

test('badges each row with the exact products that recognized it', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  // The matrix as a user sees it: the root `.claude` row is Claude+Copilot,
  // the root `.agents` row is Codex+Copilot, and the nested `.claude` layer
  // is Claude's alone — no Copilot surface documents a downward lookup from
  // a root context, so no Copilot badge reaches it.
  await expect(items.nth(0)).toContainText('Claude Code');
  await expect(items.nth(0)).toContainText('GitHub Copilot');
  await expect(items.nth(0)).not.toContainText('OpenAI Codex');
  await expect(items.nth(1)).toContainText('OpenAI Codex');
  await expect(items.nth(1)).toContainText('GitHub Copilot');
  await expect(items.nth(1)).not.toContainText('Claude Code');
  await expect(items.nth(2)).toContainText('Claude Code');
  await expect(items.nth(2)).not.toContainText('GitHub Copilot');
  await expect(items.nth(2)).not.toContainText('OpenAI Codex');
});

test('shows a Claude skill by its authored name, and a nameless one by its prefixed directory', async ({
  page,
}) => {
  await page.goto(host.origin);
  // `claude-greet` lives in `.claude/skills/greet/`, so a row showing it
  // proves the name came from the frontmatter rather than the directory
  // segment (FR-007).
  const named = page.locator('.aci-item', { hasText: '.claude/skills/greet/SKILL.md' });
  await expect(named.locator('.aci-skill-row__name')).toHaveText('claude-greet');
  // The nested skill authors no name, so its skill directory names it — with
  // the root-relative Claude prefix, which is exactly the vendor's own
  // command spelling for a nested skill (FR-007, T1081).
  const fallback = page.locator('.aci-item', {
    hasText: 'packages/api/.claude/skills/deploy/SKILL.md',
  });
  await expect(fallback.locator('.aci-skill-row__name')).toHaveText('packages/api:deploy');
});

test('groups a name declared from two locations into one row listing every recognizing product', async ({
  page,
}) => {
  // A Codex skill declaring the same `claude-greet` name from its own
  // location: the name is the row's unit, so the inventory gains a definition
  // rather than a row, and the one row now shows all three products' badges
  // side by side — Claude and Copilot on the `.claude` file, Codex and
  // Copilot on the `.agents` one — with the one applicable same-name rule.
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
  // Neither Claude nor Codex has a collision here: each recognizes one of the
  // two files. Copilot recognizes both, so its statement — no single
  // documented rule across its surfaces — is the one the row states.
  await expect(grouped).not.toContainText('keeps all of them');
  await expect(grouped).toContainText(
    'GitHub Copilot depends on the surface; no single documented rule',
  );
});

test('quotes no Claude rule for two commands that only share a label', async ({ page }) => {
  // Two Claude skills in differently named directories declaring one display
  // label. The commands come from the directories, so nothing clashes and the
  // vendor documents no resolution — the row lists both and quotes no rule
  // (FR-007).
  await mkdir(join(fixture, '.claude/skills/foo'), { recursive: true });
  await mkdir(join(fixture, '.claude/skills/bar'), { recursive: true });
  for (const directory of ['foo', 'bar']) {
    await writeFile(
      join(fixture, `.claude/skills/${directory}/SKILL.md`),
      '---\nname: same-label\n---\n\n# Same label\n',
      'utf8',
    );
  }
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  const grouped = page.locator('.aci-item').filter({ hasText: 'same-label' }).first();
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(grouped.locator('.aci-path')).toHaveCount(2, { timeout: 1_000 });
  }).toPass();
  await expect(grouped).not.toContainText('keeps all of them');
  await expect(grouped).not.toContainText('uses the first in its documented source order');
});

test('names a nested skill with the root-relative prefix and states the Claude rule on both rows', async ({
  page,
}) => {
  // Two Claude skills declaring one name in same-named directories at two
  // depths. The nested one is its own row under the root-relative qualified
  // name — `apps/web:claude-twice`, the prefix from the directory holding its
  // `.claude` and the last segment from the authored name (FR-007) — and the
  // official rule for a clash within one root, that every definition stays
  // available and Claude picks the variant matching the files being worked
  // on, is stated on both rows of the clash — never a first-in-order winner,
  // which is the rule between levels this product lists as separate Sources.
  await mkdir(join(fixture, '.claude/skills/wave'), { recursive: true });
  await mkdir(join(fixture, 'apps/web/.claude/skills/wave'), { recursive: true });
  for (const directory of ['.claude/skills/wave', 'apps/web/.claude/skills/wave']) {
    await writeFile(
      join(fixture, `${directory}/SKILL.md`),
      '---\nname: claude-twice\n---\n\n# Twice\n',
      'utf8',
    );
  }
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  const nested = page.locator('.aci-item', {
    has: page.locator('.aci-skill-row__name', { hasText: /^apps\/web:claude-twice$/u }),
  });
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(nested).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(nested.locator('.aci-path')).toHaveText('apps/web/.claude/skills/wave/SKILL.md');
  const root = page.locator('.aci-item', {
    has: page.locator('.aci-skill-row__name', { hasText: /^claude-twice$/u }),
  });
  await expect(root.locator('.aci-path')).toHaveText(['.claude/skills/wave/SKILL.md']);
  for (const row of [root, nested]) {
    await expect(row).toContainText('keeps all of them; a nested one is invoked');
    await expect(row).not.toContainText('uses the first in its documented source order');
  }
});

test('states a resolution for each product that recognizes the name twice', async ({ page }) => {
  // Two Codex skills declaring one name: Codex has two files to choose
  // between, so the row carries its documented rule — and so does Copilot,
  // which recognizes both files through the shared `.agents` spelling and has
  // no single documented rule across its surfaces.
  await mkdir(join(fixture, '.agents/skills/salute'), { recursive: true });
  await mkdir(join(fixture, '.agents/skills/hail'), { recursive: true });
  for (const directory of ['salute', 'hail']) {
    await writeFile(
      join(fixture, `.agents/skills/${directory}/SKILL.md`),
      '---\nname: codex-twice\n---\n\n# Twice\n',
      'utf8',
    );
  }
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  const grouped = page.locator('.aci-item').filter({ hasText: 'codex-twice' }).first();
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(grouped.locator('.aci-path')).toHaveCount(2, { timeout: 1_000 });
  }).toPass();
  await expect(grouped).toContainText('keeps all of them, in no documented order');
  await expect(grouped).toContainText(
    'GitHub Copilot depends on the surface; no single documented rule',
  );
  await expect(grouped).not.toContainText('uses the first in its documented source order');
});

test('lists each file once per recognition and no authored content', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);
  const text = await page.locator('main').innerText();
  // The nested `.agents` file is no row at all — its spelling's programs are
  // root-anchored for both vendors — and the nested `.claude` layer is one
  // Claude recognition, so its path appears exactly once.
  expect(text).not.toContain('packages/api/.agents/skills/deploy/SKILL.md');
  expect(text.split('packages/api/.claude/skills/deploy/SKILL.md')).toHaveLength(2);
  // Authored content stays out of the list (FR-027).
  expect(text).not.toContain('Say hello');
  expect(text).not.toContain('# Nested deploy');
});

test('filters the vendors apart with the tool filter', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(3);

  await page.getByLabel('Tool').selectOption('claude');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await expect(page.locator('.aci-inventory-filters')).toContainText('Showing 2 of 3');
  for (const item of await page.locator('.aci-item').all()) {
    await expect(item).toContainText('Claude Code');
  }

  await page.getByLabel('Tool').selectOption('codex');
  await expect(page.locator('.aci-item')).toHaveCount(1);
  await expect(page.locator('.aci-item')).toContainText('OpenAI Codex');

  // Copilot shares both root spellings, so it keeps the two root rows and
  // drops the nested Claude layer.
  await page.getByLabel('Tool').selectOption('copilot');
  await expect(page.locator('.aci-item')).toHaveCount(2);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.aci-item')).toHaveCount(3);
});

test('opens a Claude definition by its file identity into the detail route', async ({ page }) => {
  await page.goto(host.origin);
  // Two definitions share the file, so its group offers two links; each is
  // named by its own tool and addresses its own definition route.
  const link = page
    .locator('.aci-skill-row__file', { hasText: '.claude/skills/greet/SKILL.md' })
    .locator('.aci-skill-row__definitions a')
    .first();
  await link.click();
  // The detail route is the one surface that serves authored content; the
  // list milestone proves the row links to the definition's stable identity —
  // the tool, then the Source-relative path — which survives rescans and
  // same-root server launches. The first link is the Copilot definition's,
  // in the contracted tool order.
  await expect(page).toHaveURL(
    new URL('/skills/copilot/.claude/skills/greet/SKILL.md', host.origin).href,
  );
});
