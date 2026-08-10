// T059: browser acceptance for the Codex SKILL list (Phase 4 "Codex Skill
// List"). Launches the packaged CLI against a Codex-only fixture, opens the
// printed loopback URL, and verifies the rendered inventory. Since the Copilot
// phase, the root `.agents/skills/` is also a Copilot location, so every
// Codex row carries both products' badges — while the nested spelling stays
// out of the inventory for both vendors' root-anchored programs.
//
// Two claims here can only be made against a rendered page, which is why they
// live in this suite rather than in the unit suites: that the escaped root
// label is presented distinctly from every Source-relative item path, and
// that it is never offered as something to navigate to or open. Everything
// else — the exact admitted set, near misses, provenance — is proven closer to
// the code and is asserted here only as far as a user can see it.
//
// The visible checkpoint of this milestone is deliberately modest: a user can
// see the Codex SKILL list, and cannot open file detail yet.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** A literal credential in authored source, used to prove it never lists. */
const FIXTURE_SECRET = 'ghp_E2EFIXTURE0000000000000000000000000000';

let fixture: string;
let host: LaunchedHost;

test.beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'aci-codex-skills-'));
  await mkdir(join(fixture, '.agents/skills/greet'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/greet/SKILL.md'),
    `---\nname: greet\n---\n\ntoken: ${FIXTURE_SECRET}\n`,
    'utf8',
  );
  // Authored with a name that does not match its directory, which is what makes
  // the rendered name meaningful: it cannot have come from the path.
  await mkdir(join(fixture, '.agents/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/deploy/SKILL.md'),
    '---\nname: ship-it\n---\n\n# Deploy\n',
    'utf8',
  );
  // Near miss for both vendors: Codex scans `.agents/skills` upward from its
  // working directory and never descends, and no Copilot surface documents a
  // downward skill lookup from a root context, so this file belongs to a
  // runtime context this product does not select and is never listed.
  await mkdir(join(fixture, 'packages/api/.agents/skills/deploy'), { recursive: true });
  await writeFile(
    join(fixture, 'packages/api/.agents/skills/deploy/SKILL.md'),
    '# Nested deploy\n',
    'utf8',
  );
  // Near misses one segment away from the selector, plus an unrelated file.
  await mkdir(join(fixture, 'agents/skills/solo'), { recursive: true });
  await writeFile(join(fixture, 'agents/skills/solo/SKILL.md'), 'no leading dot\n', 'utf8');
  await writeFile(join(fixture, '.agents/skills/greet/README.md'), 'sibling\n', 'utf8');
  await writeFile(join(fixture, 'AGENTS.md'), '# instructions\n', 'utf8');

  host = await launchHost(fixture);
});

test.afterEach(async () => {
  await stopHost(host);
  await rm(fixture, { recursive: true, force: true });
});

test('lists exactly the allowlisted skills with their source and path', async ({ page }) => {
  await page.goto(host.origin);
  const items = page.locator('.aci-item');
  await expect(items).toHaveCount(2);

  // Rows are ordered by their own unit — the declared name — so `greet`
  // precedes `ship-it` even though its path sorts the other way. One item per
  // definition: both root skills are Codex+Copilot, so each path appears once
  // under each product.
  const paths = await page.locator('.aci-item .aci-path').allInnerTexts();
  expect(paths).toEqual([
    '.agents/skills/greet/SKILL.md',
    '.agents/skills/greet/SKILL.md',
    '.agents/skills/deploy/SKILL.md',
    '.agents/skills/deploy/SKILL.md',
  ]);

  // Every row states which products recognized it — one file can be recognized
  // by several, and that is visible nowhere else. The kind is not repeated per
  // row: it is the tab the rows are listed under.
  for (const item of await items.all()) {
    await expect(item).toContainText('OpenAI Codex');
    await expect(item).toContainText('GitHub Copilot');
    // A readable row says nothing about its own readability; the label is kept
    // for outcomes that actually explain the row.
    await expect(item).not.toContainText('Readable text');
  }
  await expect(page.getByRole('tab', { selected: true })).toContainText('Skill');
});

test('shows no near-miss path and no authored source text', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(2);
  const text = await page.locator('main').innerText();
  expect(text).not.toContain('packages/api/.agents/skills/deploy/SKILL.md');
  expect(text).not.toContain('agents/skills/solo/SKILL.md');
  expect(text).not.toContain('README.md');
  expect(text).not.toContain('AGENTS.md');
  // The inventory carries no `sourceText`, so a credential in an authored
  // skill cannot appear in a list the user never opted into reading (FR-027).
  // One sentinel would not show that: an implementation could redact the
  // credential and still render the body around it. Every authored line of the
  // fixture is checked, and the whole `sourceText` field is absent from the
  // wire payload the page received.
  expect(text).not.toContain(FIXTURE_SECRET);
  for (const authored of ['token:', 'Say hello', '# Deploy', 'sibling', '# instructions']) {
    expect(text, `rendered page contains authored source: ${authored}`).not.toContain(authored);
  }
});

test('presents the escaped root label distinctly from every item path', async ({ page }) => {
  await page.goto(host.origin);
  const rootLabel = page.locator('.aci-inventory-page__display-root');
  await expect(rootLabel).toHaveCount(1);

  // The root label lives in its own labelled field, above the list; no
  // inventory row repeats it, so the two cannot be confused.
  const labelText = (await rootLabel.innerText()).replace(/\s*\(.*\)$/u, '');
  for (const path of await page.locator('.aci-item .aci-path').allInnerTexts()) {
    expect(path).not.toContain(labelText);
    // Item paths are Source-relative and never absolute.
    expect(path.startsWith('/')).toBe(false);
  }
  await expect(page.locator('.aci-note').first()).toContainText('grants no read access');
});

test('never offers the root label as something to open or navigate to', async ({ page }) => {
  await page.goto(host.origin);
  const label = page.locator('.aci-inventory-page__display-root');
  // Inert by construction: not a link, not a control, not focusable.
  await expect(label.locator('a, button, input')).toHaveCount(0);
  expect(await label.evaluate((element) => element.closest('a, button') !== null)).toBe(false);
  expect(await label.evaluate((element) => element.getAttribute('tabindex'))).toBeNull();
});

test('states how many supporting files a skill ships', async ({ page }) => {
  await page.goto(host.origin);
  // `greet/` holds a sibling `README.md`; `deploy/` holds only its own
  // `SKILL.md` and reports zero rather than omitting the line — the count is a
  // fact about the skill, and "none" is part of it.
  await expect(page.locator('.aci-item').first()).toContainText(
    '1 supporting file(s) in this skill',
  );
  await expect(page.locator('.aci-item').last()).toContainText(
    '0 supporting file(s) in this skill',
  );
});

test('shows each skill by the name authored in its own file', async ({ page }) => {
  await page.goto(host.origin);
  // `ship-it` lives in `.agents/skills/deploy/`, so a row showing it proves the
  // name came from the frontmatter rather than the directory segment (FR-007).
  await expect(page.locator('.aci-skill-row__name')).toHaveText(['greet', 'ship-it']);
  // Each row names the files declaring it; the name is the row's unit, and the
  // path says which file authored it.
  await expect(page.locator('.aci-item .aci-path')).toHaveText([
    '.agents/skills/greet/SKILL.md',
    '.agents/skills/greet/SKILL.md',
    '.agents/skills/deploy/SKILL.md',
    '.agents/skills/deploy/SKILL.md',
  ]);
});

test('shows one row for a name two files declare, with each product\u2019s rule', async ({
  page,
}) => {
  // A third skill declaring `greet` from a different directory. The name is the
  // row's unit, so the inventory gains a definition rather than a row.
  await mkdir(join(fixture, '.agents/skills/salute'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/salute/SKILL.md'),
    '---\nname: greet\n---\n\n# Salute\n',
    'utf8',
  );
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Nothing polls, so the committed result arrives on an explicit refresh
  // rather than on its own. The refresh is retried rather than clicked once
  // because the scan need not have committed when the click lands, and a
  // single early refresh would leave the page on the previous generation with
  // nothing left to deliver the new one.
  const grouped = page.locator('.aci-item').filter({ hasText: 'greet' }).first();
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(grouped.locator('.aci-path')).toHaveText(
      [
        '.agents/skills/greet/SKILL.md',
        '.agents/skills/greet/SKILL.md',
        '.agents/skills/salute/SKILL.md',
        '.agents/skills/salute/SKILL.md',
      ],
      { timeout: 1_000 },
    );
  }).toPass();
  await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
  // The row states what each product documents and never orders the two:
  // Codex keeps both and documents no precedence among the scopes, while
  // Copilot — which also recognizes both files — has no single documented
  // rule across its surfaces (FR-007).
  await expect(grouped).toContainText('OpenAI Codex keeps all of them, in no documented order');
  await expect(grouped).toContainText(
    'GitHub Copilot depends on the surface; no single documented rule',
  );
  await expect(page.locator('.aci-item')).toHaveCount(2);
});

test('names a skill that declares no name by its skill directory', async ({ page }) => {
  // T1065/T1081: a row shows the declared name beside the path when there is
  // one, and the skill directory name when there is not (FR-007) — a named
  // directory is what a skill is, so every row has a name to be listed under.
  await mkdir(join(fixture, '.agents/skills/nameless'), { recursive: true });
  await writeFile(join(fixture, '.agents/skills/nameless/SKILL.md'), '# no frontmatter\n', 'utf8');
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // Retried for the same reason as the grouping case above: one refresh that
  // lands before the scan commits is never followed by another.
  const row = page.locator('.aci-item').filter({ hasText: '.agents/skills/nameless/SKILL.md' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(row.locator('.aci-path')).toHaveText(
      ['.agents/skills/nameless/SKILL.md', '.agents/skills/nameless/SKILL.md'],
      { timeout: 1_000 },
    );
  }).toPass();
  await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
  await expect(row.locator('.aci-skill-row__name')).toHaveText('nameless');
});

test('keeps two names that both draw nothing apart', async ({ page }) => {
  // A declared name of nothing but whitespace is a name, and two skills whose
  // names differ only in how much of it they hold are two rows. Rendering the
  // note in place of the name would show them as one row twice (FR-025).
  await mkdir(join(fixture, '.agents/skills/blank-one'), { recursive: true });
  await mkdir(join(fixture, '.agents/skills/blank-two'), { recursive: true });
  await writeFile(
    join(fixture, '.agents/skills/blank-one/SKILL.md'),
    "---\nname: ' '\n---\n",
    'utf8',
  );
  await writeFile(
    join(fixture, '.agents/skills/blank-two/SKILL.md'),
    "---\nname: '  '\n---\n",
    'utf8',
  );
  await page.goto(host.origin);
  await page.getByRole('button', { name: 'Rescan repository' }).click();
  const rows = page.locator('.aci-item').filter({ hasText: '.agents/skills/blank-' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(rows).toHaveCount(2, { timeout: 1_000 });
  }).toPass();
  // `textContent`, not `toHaveText`: the matcher normalizes whitespace, which
  // is exactly the difference under test.
  const names = rows.locator('.aci-skill-row__name .aci-authored-text');
  expect(await names.nth(0).textContent()).toBe(' ');
  expect(await names.nth(1).textContent()).toBe('  ');
  await expect(rows.first()).toContainText('(name with no visible characters)');
});

test('filters the list by tool and Source-relative path', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-item')).toHaveCount(2);

  await page.getByLabel('Path contains').fill('greet');
  await expect(page.locator('.aci-item')).toHaveCount(1);
  await expect(page.locator('.aci-inventory-filters')).toContainText('Showing 1 of 2');

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.aci-item')).toHaveCount(2);

  // Both products recognize both root skills, so either selection keeps the
  // whole list.
  await page.getByLabel('Tool').selectOption('codex');
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await page.getByLabel('Tool').selectOption('copilot');
  await expect(page.locator('.aci-item')).toHaveCount(2);
});

test('navigates kinds by tab rather than filtering them', async ({ page }) => {
  await page.goto(host.origin);
  // Kind is navigation: one kind is always in view, the tab is labelled with
  // what selecting it would show, and there is no "all kinds" state.
  const skillTab = page.getByRole('tab', { name: /Skill/u });
  await expect(skillTab).toHaveAttribute('aria-selected', 'true');
  await expect(skillTab).toContainText('2');
  // The strip is one stop in the page tab order and moves with the arrow keys,
  // as the WAI-ARIA tabs pattern requires (QR-004).
  await skillTab.focus();
  await expect(skillTab).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { selected: true })).toBeFocused();
});

test('shows the filtered empty state without claiming the repository is empty', async ({
  page,
}) => {
  await page.goto(host.origin);
  await page.getByLabel('Path contains').fill('no-such-path');
  await expect(page.locator('.aci-item')).toHaveCount(0);
  // The empty state names the kind in view, because that is what has no rows —
  // and the "nothing was recognized" finding is about the repository, which is
  // a different statement the user can act on differently.
  await expect(page.getByText('No skill matches the current filters.')).toBeVisible();
  await expect(page.getByText('No skill was recognized in this repository.')).toHaveCount(0);
});

test('rescans on demand and keeps the status tied to that request', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('.aci-scan-progress')).toContainText('Ready');

  await page.getByRole('button', { name: 'Rescan repository' }).click();
  // The command's own status is adopted immediately; the committed result
  // arrives on an explicit refresh, because nothing polls. Retried for the
  // same reason as the two cases above: a refresh that lands while the scan is
  // still running shows `scanning`, and nothing would ever fetch again.
  await expect(async () => {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await expect(page.locator('.aci-scan-progress')).toContainText('Ready', { timeout: 1_000 });
  }).toPass();
  await expect(page.locator('.aci-item')).toHaveCount(2);
  await expect(page.locator('.aci-scan-progress')).toContainText('Committed generation');
});

test('links each definition by its stable tool-and-path identity', async ({ page }) => {
  await page.goto(host.origin);
  const links = page.locator('.aci-item .aci-path a');
  await expect(links).toHaveCount(4);

  // The link carries the tool and the Source-relative path — the definition's
  // own identity, stable across rescans and same-root server launches; the
  // path is the file's identity on the wire, so no per-generation file ID
  // exists to leak into a URL.
  const hrefs = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('href') ?? ''),
  );
  expect(hrefs.toSorted()).toEqual(
    [
      '/skills/copilot/.agents/skills/greet/SKILL.md',
      '/skills/codex/.agents/skills/greet/SKILL.md',
      '/skills/copilot/.agents/skills/deploy/SKILL.md',
      '/skills/codex/.agents/skills/deploy/SKILL.md',
    ].toSorted(),
  );
  // The row itself still offers nothing else to act on: opening the file is
  // the one thing a row leads to.
  await expect(page.locator('.aci-item button')).toHaveCount(0);
});

test('operates every inventory control from the keyboard', async ({ page }) => {
  await page.goto(host.origin);
  await expect(page.locator('h1')).toBeFocused();

  // Every control is a native form element, so it is reachable by Tab and
  // has a programmatic name (contracts/accessibility-acceptance.md).
  for (const id of [
    'aci-inventory-filters-source',
    'aci-inventory-filters-tool',
    'aci-inventory-filters-path',
  ]) {
    await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
  }
  // Kind moved out of the filter form into a tab strip, which carries its own
  // accessible name instead of a `<label>`.
  await expect(page.getByRole('tablist', { name: 'Customization kind' })).toHaveCount(1);
  // Tab really walks the page — `.focus()` would prove only that an element can
  // hold focus, not that a keyboard user ever arrives at it. Collect what the
  // walk reaches rather than asserting one fixed order, so the claim survives a
  // layout change without weakening.
  const reached: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Tab');
    reached.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active === null) {
          return '';
        }
        return active.id !== ''
          ? `#${active.id}`
          : `${active.getAttribute('role') ?? active.tagName.toLowerCase()}:${active.textContent?.trim().slice(0, 24) ?? ''}`;
      }),
    );
  }
  expect(reached).toContain('#aci-inventory-filters-source');
  expect(reached).toContain('#aci-inventory-filters-tool');
  expect(reached).toContain('#aci-inventory-filters-path');
  // The rescan control too: `.focus()` below proves Enter activates it, which
  // says nothing about a keyboard user ever arriving there.
  expect(reached.some((stop) => stop.includes('Rescan repository'))).toBe(true);
  // The strip is one stop in that same order — the selected tab, by its own id.
  expect(reached.some((stop) => stop.startsWith('#aci-kind-tab-'))).toBe(true);
  // The tab strip is one stop in the page order, not one per tab. Tab counts
  // cannot show that — the focus order wraps, and browsers differ on where —
  // so the roving tabindex itself is the assertion: exactly one tab is
  // reachable by Tab and the rest are reached with the arrow keys.
  const tabbable = page.locator('[role="tab"][tabindex="0"]');
  await expect(tabbable).toHaveCount(1);
  await expect(tabbable).toHaveAttribute('aria-selected', 'true');

  // Focusing a tab leaves it selected — selection follows focus for this strip.
  // The arrow and Home/End mapping is not asserted here and cannot be: one kind
  // ships an inventory, so the rendered strip has a single tab and every arrow
  // press is a no-op. `tests/unit/app/tab-navigation.test.ts` drives that
  // mapping directly against a multi-kind strip.
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

  // Enter activates the rescan button, reached and pressed by keyboard alone.
  const rescan = page.getByRole('button', { name: 'Rescan repository' });
  await rescan.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Refresh status' })).toBeVisible();
});
