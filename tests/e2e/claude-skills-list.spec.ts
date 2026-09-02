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

test('lists every vendor\u2019s skills together, grouped by invocation name', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(4);

  // Rows in name order, one per name a tool invokes: the root `.claude` file
  // is `claude-greet` to Copilot, which invokes the authored name, and
  // `greet` to Claude Code, which invokes the skill directory — one grouping
  // for every vendor, not one list per product (FR-007).
  await expect(page.locator('.aci-row-head__name')).toHaveText([
    'claude-greet',
    'codex-greet',
    'greet',
    'packages/api:deploy',
  ]);
  // One path line per file within a row, with a definition link per
  // recognizing product beneath it — each linking to its own
  // `/skills/<source-relative path>` route.
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.claude/skills/greet/SKILL.md',
    '.agents/skills/codex-greet/SKILL.md',
    '.claude/skills/greet/SKILL.md',
    'packages/api/.claude/skills/deploy/SKILL.md',
  ]);
  await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
});

test('badges each row with the exact products that recognized it', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  // The matrix as a user sees it: the root `.claude` file's two rows carry
  // one product each, because the two invoke it by different names; the root
  // `.agents` row is Codex+Copilot, which invoke one authored name; and the
  // nested `.claude` layer is Claude's alone — no Copilot surface documents a
  // downward lookup from a root context, so no Copilot badge reaches it.
  await expect(items.nth(0)).toContainText('GitHub Copilot');
  await expect(items.nth(0)).not.toContainText('Claude Code');
  await expect(items.nth(0)).not.toContainText('OpenAI Codex');
  await expect(items.nth(1)).toContainText('OpenAI Codex');
  await expect(items.nth(1)).toContainText('GitHub Copilot');
  await expect(items.nth(1)).not.toContainText('Claude Code');
  await expect(items.nth(2)).toContainText('Claude Code');
  await expect(items.nth(2)).not.toContainText('GitHub Copilot');
  await expect(items.nth(2)).not.toContainText('OpenAI Codex');
  await expect(items.nth(3)).toContainText('Claude Code');
  await expect(items.nth(3)).not.toContainText('GitHub Copilot');
  await expect(items.nth(3)).not.toContainText('OpenAI Codex');
});

test('lists one file under each name its recognizing products invoke it by', async ({ page }) => {
  await page.goto(host.origin);
  // `.claude/skills/greet/SKILL.md` declares `name: claude-greet`. Copilot
  // invokes what the file declares, Claude Code the skill directory, so the
  // one file is listed under each — a single row would be headed by a name
  // one of them does not answer to (FR-007).
  const shared = page.locator('.aci-item', { hasText: '.claude/skills/greet/SKILL.md' });
  await expect(shared.locator('.aci-row-head__name')).toHaveText(['claude-greet', 'greet']);
  // The nested skill authors no name, and Claude Code would not read one
  // anyway: its skill directory names it, with the root-relative prefix that
  // is the vendor's own command spelling for a nested skill (FR-007, T1081).
  const fallback = page.locator('.aci-item', {
    hasText: 'packages/api/.claude/skills/deploy/SKILL.md',
  });
  await expect(fallback.locator('.aci-row-head__name')).toHaveText('packages/api:deploy');
});

test('groups a name declared from two locations into one row listing every recognizing product', async ({
  page,
}) => {
  // A Codex skill declaring the same `claude-greet` name from its own
  // location: the name is the row's unit, so the inventory gains a definition
  // rather than a row — Copilot on the `.claude` file, Codex and Copilot on
  // the `.agents` one — with the one applicable same-name rule. Claude Code
  // is not in it: it invokes the `.claude` file by its skill directory, so
  // `claude-greet` is not a command it answers to (FR-007).
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
  await expect(page.locator('.aci-item')).toHaveCount(4);
  // Each definition keeps its own product badge inside the shared row.
  await expect(grouped).toContainText('OpenAI Codex');
  await expect(grouped).not.toContainText('Claude Code');
  // Codex has no collision here: it recognizes one of the two files. Copilot
  // recognizes both, so its statement — no single documented rule across its
  // surfaces — is the one the row states.
  await expect(grouped).not.toContainText('keeps all of them');
  await expect(grouped).toContainText(
    'GitHub Copilot depends on the surface; no single documented rule',
  );
});

test('quotes no Claude rule for two commands that only share a label', async ({ page }) => {
  // Two Claude skills in differently named directories declaring one label.
  // The commands come from the directories, so to Claude Code these are two
  // rows with nothing to clash, while Copilot invokes the shared authored
  // label and lists both under it. That row quotes Copilot's rule alone —
  // never a Claude rule for a clash Claude does not have (FR-007).
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
  // depths. Claude Code invokes each by its skill directory, so the nested one
  // is its own row under the root-relative qualified command —
  // `apps/web:wave`, the prefix from the directory holding its `.claude`
  // (FR-007) — and the official rule for a clash within one root, that every
  // definition stays available and Claude picks the variant matching the
  // files being worked on, is stated on both rows of the clash — never a
  // first-in-order winner, which is the rule between levels this product
  // lists as separate Sources.
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
    has: page.locator('.aci-row-head__name', { hasText: /^apps\/web:wave$/u }),
  });
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(nested).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(nested.locator('.aci-path')).toHaveText('apps/web/.claude/skills/wave/SKILL.md');
  const root = page.locator('.aci-item', {
    has: page.locator('.aci-row-head__name', { hasText: /^wave$/u }),
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
  await expect(page.locator('.aci-item')).toHaveCount(4);
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
  await expect(page.locator('.aci-item')).toHaveCount(4);

  // Claude Code's two rows: the root file under its skill directory and the
  // nested layer under its prefixed one.
  await page.getByLabel('Tool').selectOption('claude');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await expect(page.locator('.aci-inventory-filters')).toContainText('Showing 2 of 4');
  for (const item of await page.locator('.aci-item').all()) {
    await expect(item).toContainText('Claude Code');
  }

  await page.getByLabel('Tool').selectOption('codex');
  await expect(page.locator('.aci-item')).toHaveCount(1);
  await expect(page.locator('.aci-item')).toContainText('OpenAI Codex');

  // Copilot shares both root spellings, so it keeps the two rows named by the
  // authored names and drops the nested Claude layer.
  await page.getByLabel('Tool').selectOption('copilot');
  await expect(page.locator('.aci-item')).toHaveCount(2);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.aci-item')).toHaveCount(4);
});

test('opens a listed file by its own identity into the detail route', async ({ page }) => {
  await page.goto(host.origin);
  // Two rows list this file, one per invoking product, and both link to the
  // same page: the products read the same document, so the route is the
  // file's own. They differ only in the row each was followed from, which
  // rides in the query.
  const links = page
    .locator('.aci-source-family-blocks__members > li')
    .locator('a[href*="/.claude/skills/greet/SKILL.md"]');
  await expect(links).toHaveCount(2);
  await links.first().click();
  // The detail route is the one surface that serves authored content; the
  // list milestone proves the row links to the file's stable identity — the
  // Source-relative path — which survives rescans and same-root server
  // launches.
  // The row the link was followed from rides in the query, because one file
  // can be listed under two names and the detail's moves step the row rather
  // than the file (`detail-route.ts` § originRowNameQuery).
  await expect(page).toHaveURL(
    new URL(
      '/skills/detail/repository/.claude/skills/greet/SKILL.md?name=claude-greet',
      host.origin,
    ).href,
  );
});
